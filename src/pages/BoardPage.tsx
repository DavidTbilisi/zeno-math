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
import { ToolMenu } from "../components/ToolMenu";
import type { ModelSpec, ModelType } from "../math/models";
import type { RenderedSvg } from "../math/latex";
import type { PlotSpec } from "../math/plot";
import { svgToDataUrl } from "../math/svg";
import type { Spec3D } from "../three/spec";
import { MatrixDialog, type MatrixSpec } from "../components/MatrixDialog";
import { GeometryDialog } from "../components/GeometryDialog";
import type { GeometrySpec } from "../math/geometry";
import { AnalysisDialog } from "../components/AnalysisDialog";
import type { AnalysisSpec } from "../math/analysis";
import { StatsDialog } from "../components/StatsDialog";
import type { StatSpec } from "../math/statistics";
import { IntegralDialog } from "../components/IntegralDialog";
import type { IntegralSpec } from "../math/integration";
import { OdeDialog } from "../components/OdeDialog";
import type { OdeSpec } from "../math/ode";
import { TrigDialog } from "../components/TrigDialog";
import type { TrigSpec } from "../math/trig";
import { AlgoDialog } from "../components/AlgoDialog";
import type { AlgoSpec } from "../math/algo";
import { NtDialog } from "../components/NtDialog";
import type { NtSpec } from "../math/numtheory";
import { CombDialog } from "../components/CombDialog";
import type { CombSpec } from "../math/combinatorics";
import { GtDialog } from "../components/GtDialog";
import type { GtSpec } from "../math/graphtheory";
import { LogicDialog } from "../components/LogicDialog";
import type { LogicSpec } from "../math/logic";

/** Stored on the image element so a formula/graph can be re-opened and edited. */
type MathData =
  | { kind: "formula"; data: FormulaData; w: number; h: number }
  | { kind: "graph"; data: PlotSpec; w: number; h: number }
  | { kind: "model"; data: ModelSpec; w: number; h: number }
  | { kind: "3d"; data: Spec3D; w: number; h: number }
  | { kind: "matrix"; data: MatrixSpec; w: number; h: number }
  | { kind: "geometry"; data: GeometrySpec; w: number; h: number }
  | { kind: "analysis"; data: AnalysisSpec; w: number; h: number }
  | { kind: "statistics"; data: StatSpec; w: number; h: number }
  | { kind: "integral"; data: IntegralSpec; w: number; h: number }
  | { kind: "ode"; data: OdeSpec; w: number; h: number }
  | { kind: "trig"; data: TrigSpec; w: number; h: number }
  | { kind: "algo"; data: AlgoSpec; w: number; h: number }
  | { kind: "nt"; data: NtSpec; w: number; h: number }
  | { kind: "comb"; data: CombSpec; w: number; h: number }
  | { kind: "gt"; data: GtSpec; w: number; h: number }
  | { kind: "logic"; data: LogicSpec; w: number; h: number };

type Dialog =
  | { kind: "formula"; editing?: ExcalidrawImageElement }
  | { kind: "graph"; editing?: ExcalidrawImageElement }
  | { kind: "model"; editing?: ExcalidrawImageElement; start?: ModelType }
  | { kind: "3d"; editing?: ExcalidrawImageElement }
  | { kind: "matrix"; editing?: ExcalidrawImageElement }
  | { kind: "geometry"; editing?: ExcalidrawImageElement }
  | { kind: "analysis"; editing?: ExcalidrawImageElement }
  | { kind: "statistics"; editing?: ExcalidrawImageElement }
  | { kind: "integral"; editing?: ExcalidrawImageElement }
  | { kind: "ode"; editing?: ExcalidrawImageElement }
  | { kind: "trig"; editing?: ExcalidrawImageElement }
  | { kind: "algo"; editing?: ExcalidrawImageElement }
  | { kind: "nt"; editing?: ExcalidrawImageElement }
  | { kind: "comb"; editing?: ExcalidrawImageElement }
  | { kind: "gt"; editing?: ExcalidrawImageElement }
  | { kind: "logic"; editing?: ExcalidrawImageElement };

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
  el?.type === "image" && ["formula", "graph", "model", "3d", "matrix", "geometry", "analysis", "statistics", "integral", "ode", "trig", "algo", "nt", "comb", "gt", "logic"].includes(el.customData?.kind)
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
            ✎ <span className="btn-label">{{ formula: t.editFormula, graph: t.editGraph, model: t.editModel, "3d": t.edit3d, matrix: t.editMatrix, geometry: t.editGeometry, analysis: t.editAnalysis, statistics: t.editStatistics, integral: t.editIntegral, ode: t.editOde, trig: t.editTrig, algo: t.editAlgo, nt: t.editNt, comb: t.editComb, gt: t.editGt, logic: t.editLogic }[mathOf(selectedMath)!.kind]}</span>
          </button>
        )}
        <ToolMenu icon="🧮" label={t.groupArithmetic} items={[
          { icon: "🧮", label: t.counting, onPick: () => setDialog({ kind: "model", start: "placeValue" }) },
          { icon: "▦", label: t.models, onPick: () => setDialog({ kind: "model" }) },
        ]} />
        <ToolMenu icon="📐" label={t.groupGeometryShort} title={t.groupGeometry} items={[
          { icon: "📐", label: t.geometry, onPick: () => setDialog({ kind: "geometry" }) },
          { icon: "θ", label: t.trig, onPick: () => setDialog({ kind: "trig" }) },
          { icon: "🧊", label: t.threeD, onPick: () => setDialog({ kind: "3d" }) },
        ]} />
        <ToolMenu icon="∑" label={t.groupAlgebraShort} title={t.groupAlgebra} items={[
          { icon: "∑", label: t.formula, onPick: () => setDialog({ kind: "formula" }) },
          { icon: "📈", label: t.graph, onPick: () => setDialog({ kind: "graph" }) },
          { icon: "[ ]", label: t.matrices, onPick: () => setDialog({ kind: "matrix" }) },
          { icon: "ε", label: t.analysis, onPick: () => setDialog({ kind: "analysis" }) },
          { icon: "∫", label: t.integrals, onPick: () => setDialog({ kind: "integral" }) },
          { icon: "y′", label: t.odes, onPick: () => setDialog({ kind: "ode" }) },
        ]} />
        <ToolMenu icon="ℤ" label={t.groupDiscreteShort} title={t.groupDiscrete} items={[
          { icon: "ℤ", label: t.nt, onPick: () => setDialog({ kind: "nt" }) },
          { icon: "ⁿCₖ", label: t.comb, onPick: () => setDialog({ kind: "comb" }) },
          { icon: "⬡", label: t.gt, onPick: () => setDialog({ kind: "gt" }) },
          { icon: "∧", label: t.logic, onPick: () => setDialog({ kind: "logic" }) },
          { icon: "⇅", label: t.algo, onPick: () => setDialog({ kind: "algo" }) },
          { icon: "📊", label: t.statistics, onPick: () => setDialog({ kind: "statistics" }) },
        ]} />
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
      {dialog?.kind === "geometry" && (
        <GeometryDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as GeometrySpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "geometry", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "analysis" && (
        <AnalysisDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as AnalysisSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "analysis", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "statistics" && (
        <StatsDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as StatSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "statistics", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "integral" && (
        <IntegralDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as IntegralSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "integral", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "ode" && (
        <OdeDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as OdeSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "ode", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "logic" && (
        <LogicDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as LogicSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "logic", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "gt" && (
        <GtDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as GtSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "gt", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "comb" && (
        <CombDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as CombSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "comb", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "nt" && (
        <NtDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as NtSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "nt", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "algo" && (
        <AlgoDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as AlgoSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "algo", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "trig" && (
        <TrigDialog
          initial={dialog.editing ? (mathOf(dialog.editing)!.data as TrigSpec) : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(data, rendered) => {
            placeImage(svgImage(rendered), { kind: "trig", data, w: rendered.width, h: rendered.height }, dialog.editing);
            setDialog(null);
          }}
        />
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
