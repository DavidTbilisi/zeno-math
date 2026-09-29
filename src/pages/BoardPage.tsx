import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  getSceneVersion,
  MainMenu,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, ExcalidrawImageElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { api, type Board } from "../api";
import { LangSelect, useI18n } from "../i18n";
import { FormulaDialog, type FormulaData } from "../components/FormulaDialog";
import { GraphDialog } from "../components/GraphDialog";
import { ModelDialog } from "../components/ModelDialog";
import type { ModelSpec, ModelType } from "../math/models";
import type { RenderedSvg } from "../math/latex";
import type { PlotSpec } from "../math/plot";
import { svgToDataUrl } from "../math/svg";
import type { Spec3D } from "../three/spec";
import { MatrixDialog, type MatrixSpec } from "../components/MatrixDialog";

/** Stored on the image element so a formula/graph can be re-opened and edited. */
type MathData =
  | { kind: "formula"; data: FormulaData; w: number; h: number }
  | { kind: "graph"; data: PlotSpec; w: number; h: number }
  | { kind: "model"; data: ModelSpec; w: number; h: number }
  | { kind: "3d"; data: Spec3D; w: number; h: number }
  | { kind: "matrix"; data: MatrixSpec; w: number; h: number };

type Dialog =
  | { kind: "formula"; editing?: ExcalidrawImageElement }
  | { kind: "graph"; editing?: ExcalidrawImageElement }
  | { kind: "model"; editing?: ExcalidrawImageElement; start?: ModelType }
  | { kind: "3d"; editing?: ExcalidrawImageElement }
  | { kind: "matrix"; editing?: ExcalidrawImageElement };

type SaveState = "saved" | "saving" | "error";

type PlacedImage = { dataURL: string; mimeType: "image/svg+xml" | "image/png"; width: number; height: number };

const svgImage = (r: RenderedSvg): PlacedImage => ({
  dataURL: svgToDataUrl(r.svg),
  mimeType: "image/svg+xml",
  width: r.width,
  height: r.height,
});

// three.js is large; load the 3D dialog only when it's opened.
const ThreeDialog = lazy(() => import("../components/ThreeDialog"));

const mathOf = (el: ExcalidrawElement | undefined): MathData | undefined =>
  el?.type === "image" && ["formula", "graph", "model", "3d", "matrix"].includes(el.customData?.kind)
    ? (el.customData as MathData)
    : undefined;

function selectedMathElement(api: ExcalidrawImperativeAPI): ExcalidrawImageElement | undefined {
  const ids = Object.keys(api.getAppState().selectedElementIds);
  if (ids.length !== 1) return undefined;
  const el = api.getSceneElements().find((e) => e.id === ids[0]);
  return mathOf(el) ? (el as ExcalidrawImageElement) : undefined;
}

export function BoardPage({ id }: { id: string }) {
  const { t, excalidrawLang } = useI18n();
  const [board, setBoard] = useState<Board | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [selectedMath, setSelectedMath] = useState<ExcalidrawImageElement | undefined>();
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);

  const lastSaved = useRef({ version: -1, files: 0 });
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.get(id).then(
      (b) => {
        setBoard(b);
        setTitle(b.title);
      },
      () => setMissing(true),
    );
  }, [id]);

  const saveNow = useCallback(async () => {
    const ex = excalidraw.current;
    if (!ex) return;
    const elements = ex.getSceneElements();
    const allFiles = ex.getFiles();
    const used = new Set(elements.flatMap((e) => (e.type === "image" && e.fileId ? [e.fileId] : [])));
    const files: BinaryFiles = {};
    for (const [fid, file] of Object.entries(allFiles)) if (used.has(fid as FileId)) files[fid] = file;
    const { viewBackgroundColor, gridModeEnabled, theme } = ex.getAppState();

    setSaveState("saving");
    try {
      await api.save(id, { scene: { elements, files, appState: { viewBackgroundColor, gridModeEnabled, theme } } });
      lastSaved.current = { version: getSceneVersion(elements), files: Object.keys(allFiles).length };
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [id]);

  // Flush pending changes when leaving the page.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = undefined;
        void saveNow();
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [saveNow]);

  const onChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    // Track whether the current selection is an editable formula/graph.
    const ids = Object.keys(appState.selectedElementIds);
    const sel = ids.length === 1 ? elements.find((e) => e.id === ids[0]) : undefined;
    const math = mathOf(sel) ? (sel as ExcalidrawImageElement) : undefined;
    setSelectedMath((prev) => (prev?.id === math?.id && prev?.version === math?.version ? prev : math));

    // Debounced autosave, only when the drawing actually changed.
    const version = getSceneVersion(elements);
    if (version === lastSaved.current.version && Object.keys(files).length === lastSaved.current.files) return;
    if (lastSaved.current.version === -1) {
      lastSaved.current = { version, files: Object.keys(files).length }; // initial load
      return;
    }
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = undefined;
      void saveNow();
    }, 800);
  };

  const saveTitle = async () => {
    const next = title.trim() || t.untitled;
    setTitle(next);
    if (board && next !== board.title) {
      await api.save(id, { title: next });
      setBoard({ ...board, title: next });
    }
  };

  /** Adds a rendered image to the canvas, or swaps the image of an existing formula/graph/model. */
  const placeImage = (rendered: PlacedImage, math: MathData, editing?: ExcalidrawImageElement) => {
    const ex = excalidraw.current!;
    const fileId = crypto.randomUUID() as FileId;
    const file: BinaryFileData = {
      id: fileId,
      dataURL: rendered.dataURL as DataURL,
      mimeType: rendered.mimeType,
      created: Date.now(),
    };
    ex.addFiles([file]);

    const elements = ex.getSceneElementsIncludingDeleted();
    if (editing) {
      // Keep the user's scaling: new size = new natural size × old scale factor.
      const old = mathOf(editing)!;
      const scale = editing.width / old.w;
      const updated = elements.map((el) =>
        el.id === editing.id
          ? {
              ...el,
              fileId,
              width: rendered.width * scale,
              height: rendered.height * scale,
              customData: math,
              version: el.version + 1,
              versionNonce: Math.floor(Math.random() * 2 ** 31),
              updated: Date.now(),
            }
          : el,
      );
      ex.updateScene({ elements: updated, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      return;
    }

    // Start at the viewport center, then slide down past anything it would cover.
    const { scrollX, scrollY, zoom, width, height } = ex.getAppState();
    const x = width / 2 / zoom.value - scrollX - rendered.width / 2;
    let y = height / 2 / zoom.value - scrollY - rendered.height / 2;
    const live = elements.filter((e) => !e.isDeleted);
    for (let moved = true; moved; ) {
      moved = false;
      for (const e of live) {
        const overlaps = x < e.x + e.width && x + rendered.width > e.x && y < e.y + e.height && y + rendered.height > e.y;
        if (overlaps) {
          y = e.y + e.height + 24;
          moved = true;
        }
      }
    }
    const [el] = convertToExcalidrawElements([
      {
        type: "image",
        fileId,
        x,
        y,
        width: rendered.width,
        height: rendered.height,
      },
    ]);
    const withData = { ...el, customData: math } as ExcalidrawElement;
    ex.updateScene({
      elements: [...elements, withData],
      appState: { selectedElementIds: { [withData.id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    ex.scrollToContent(withData, { animate: true });
  };

  const openEditor = (el: ExcalidrawImageElement) => {
    const math = mathOf(el)!;
    setDialog({ kind: math.kind, editing: el });
  };

  if (missing) {
    return (
      <div className="center-msg">
        <p>{t.notFound}</p>
        <a className="btn" href="#/">← {t.back}</a>
      </div>
    );
  }
  if (!board) return <div className="center-msg">{t.loading}</div>;

  const scene = board.scene;
  return (
    <div className="board-page">
      <header className="board-bar">
        <a className="btn ghost" href="#/" title={t.back}>← <span className="btn-label">{t.back}</span></a>
        <input
          className="title-input"
          value={title}
          aria-label={t.rename}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <span className={`save-state ${saveState}`}>
          {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : t.saveError}
        </span>
        <div className="spacer" />
        {selectedMath && (
          <button className="btn" onClick={() => openEditor(selectedMath)}>
            ✎ <span className="btn-label">{{ formula: t.editFormula, graph: t.editGraph, model: t.editModel, "3d": t.edit3d, matrix: t.editMatrix }[mathOf(selectedMath)!.kind]}</span>
          </button>
        )}
        <button className="btn primary" onClick={() => setDialog({ kind: "model", start: "placeValue" })} title={t.counting}>🧮 <span className="btn-label">{t.counting}</span></button>
        <button className="btn primary" onClick={() => setDialog({ kind: "model" })} title={t.models}>▦ <span className="btn-label">{t.models}</span></button>
        <button className="btn primary" onClick={() => setDialog({ kind: "formula" })} title={t.formula}>∑ <span className="btn-label">{t.formula}</span></button>
        <button className="btn primary" onClick={() => setDialog({ kind: "graph" })} title={t.graph}>📈 <span className="btn-label">{t.graph}</span></button>
        <button className="btn primary" onClick={() => setDialog({ kind: "matrix" })} title={t.matrices}>[ ] <span className="btn-label">{t.matrices}</span></button>
        <button className="btn primary" onClick={() => setDialog({ kind: "3d" })} title={t.threeD}>🧊 <span className="btn-label">{t.threeD}</span></button>
        <LangSelect />
      </header>

      <div
        className="canvas-wrap"
        // Double-clicking a formula/graph opens its editor (instead of Excalidraw's image crop mode).
        onDoubleClickCapture={(e) => {
          const el = excalidraw.current && selectedMathElement(excalidraw.current);
          if (el) {
            e.stopPropagation();
            e.preventDefault();
            openEditor(el);
          }
        }}
      >
        <Excalidraw
          excalidrawAPI={(a) => (excalidraw.current = a)}
          langCode={excalidrawLang}
          initialData={{
            elements: (scene.elements ?? []) as ExcalidrawElement[],
            files: (scene.files ?? {}) as BinaryFiles,
            appState: scene.appState as Partial<AppState>,
            scrollToContent: true,
          }}
          onChange={onChange}
          UIOptions={{ canvasActions: { loadScene: true, saveToActiveFile: false } }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      </div>

      {dialog?.kind === "formula" && (
        <FormulaDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as FormulaData) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "formula", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "graph" && (
        <GraphDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as PlotSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "graph", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "3d" && (
        <Suspense fallback={null}>
          <ThreeDialog
            initial={dialog.editing ? (mathOf(dialog.editing)!.data as Spec3D) : undefined}
            onClose={() => setDialog(null)}
            onSubmit={(data, image) => {
              placeImage({ ...image, mimeType: "image/png" }, { kind: "3d", data, w: image.width, h: image.height }, dialog.editing);
              setDialog(null);
            }}
          />
        </Suspense>
      )}
      {dialog?.kind === "matrix" && (
        <MatrixDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as MatrixSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "matrix", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "model" && (
        <ModelDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as ModelSpec) : undefined}
          start={dialog.start}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "model", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
