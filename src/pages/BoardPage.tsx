import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  DefaultSidebar,
  Excalidraw,
  getSceneVersion,
  MainMenu,
  Sidebar,
  useHandleLibrary,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, ExcalidrawImageElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { api, ApiError, type Board } from "../api";
import { LangSelect, useI18n } from "../i18n";
import { ToolMenu } from "../components/ToolMenu";
import { CommandPalette } from "../components/CommandPalette";
import { ShapesPanel, SHAPES_TAB, shapesIcon } from "../components/ShapesPanel";
import type { RenderedSvg } from "../math/latex";
import { dataUrlToSvg, svgToDataUrl, themedSvg } from "../math/svg";
import { isToolKind, MENUS, TOOLS, type ToolKind } from "../tools";

/** Stored on the image element so a formula/graph can be re-opened and edited. */
type MathData = { kind: ToolKind; data: unknown; w: number; h: number };

/** The open tool dialog: a new picture (optionally on a given topic), or the picture being edited. */
type Dialog = { kind: ToolKind; editing?: ExcalidrawImageElement; start?: string };

// "conflict": someone saved this board elsewhere since we loaded it; autosave pauses until the user picks.
type SaveState = "saved" | "saving" | "error" | "conflict";

type PlacedImage = { dataURL: string; mimeType: "image/svg+xml" | "image/png"; width: number; height: number };

const svgImage = (r: RenderedSvg): PlacedImage => ({
  dataURL: svgToDataUrl(r.svg),
  mimeType: "image/svg+xml",
  width: r.width,
  height: r.height,
});

// The personal library (Excalidraw's Library tab) is kept in this browser, for every board.
const LIBRARY_KEY = "zeno.library";
const libraryStore = {
  load: () => {
    try {
      const saved = localStorage.getItem(LIBRARY_KEY);
      return saved ? { libraryItems: JSON.parse(saved) } : null;
    } catch {
      return null;
    }
  },
  save: ({ libraryItems }: { libraryItems: unknown }) => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(libraryItems));
    } catch {
      /* storage full or unavailable: the library lasts until the page closes */
    }
  },
};

const mathOf = (el: ExcalidrawElement | undefined): MathData | undefined =>
  el?.type === "image" && isToolKind(el.customData?.kind) ? (el.customData as MathData) : undefined;

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
  const [palette, setPalette] = useState(false);
  // The board's theme as last seen; "" until Excalidraw reports it.
  const theme = useRef("");
  const paletteOpener = useRef<HTMLElement | null>(null);
  const [selectedMath, setSelectedMath] = useState<ExcalidrawImageElement | undefined>();
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  // The same API as state, for the library hook, which waits for it.
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  // The theme for the shape thumbnails.
  const [boardTheme, setBoardTheme] = useState("light");
  useHandleLibrary({ excalidrawAPI: excalidrawApi, adapter: libraryStore });
  useEffect(() => {
    // "Browse libraries" sends the chosen library back to the window named here, so it lands on this board.
    if (!window.name) window.name = "zeno";
    // Another tab changed the library: take its version, or our next save would drop what it added.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LIBRARY_KEY || !excalidrawApi) return;
      try {
        void excalidrawApi.updateLibrary({ libraryItems: e.newValue ? JSON.parse(e.newValue) : [], merge: false });
      } catch {
        /* unreadable: keep ours */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [excalidrawApi]);

  const lastSaved = useRef({ version: -1, files: 0 });
  const saveTimer = useRef<number | undefined>(undefined);
  // The server's updatedAt as of our last load or save.
  const base = useRef(0);
  const conflict = useRef(false);
  // One save at a time: another one sent meanwhile would carry the same base and be refused as a conflict.
  const saving = useRef(false);
  const again = useRef<"" | "save" | "overwrite">("");
  // After a failed save (server down, offline), try again later.
  const retryTimer = useRef<number | undefined>(undefined);
  const retries = useRef(0);
  const stateRef = useRef<SaveState>("saved");
  stateRef.current = saveState;

  useEffect(() => {
    api.get(id).then(
      (b) => {
        base.current = b.updatedAt;
        setBoard(b);
        setTitle(b.title);
      },
      () => setMissing(true),
    );
  }, [id]);

  const saveOnce = useCallback(async (overwrite: boolean, keepalive: boolean) => {
    const ex = excalidraw.current;
    if (!ex || (conflict.current && !overwrite)) return;
    const elements = ex.getSceneElements();
    const allFiles = ex.getFiles();
    const used = new Set(elements.flatMap((e) => (e.type === "image" && e.fileId ? [e.fileId] : [])));
    const files: BinaryFiles = {};
    for (const [fid, file] of Object.entries(allFiles)) if (used.has(fid as FileId)) files[fid] = file;
    const { viewBackgroundColor, gridModeEnabled, theme } = ex.getAppState();

    setSaveState("saving");
    try {
      const scene = { elements, files, appState: { viewBackgroundColor, gridModeEnabled, theme } };
      const version = getSceneVersion(ex.getSceneElementsIncludingDeleted());
      const saved = await api.save(id, { scene, baseUpdatedAt: overwrite ? undefined : base.current }, keepalive);
      base.current = saved.updatedAt;
      conflict.current = false;
      retries.current = 0;
      // onChange sees deleted elements too, so compare against the same list (or every deletion re-saves forever).
      lastSaved.current = { version, files: Object.keys(allFiles).length };
      setSaveState("saved");
    } catch (e) {
      conflict.current = e instanceof ApiError && e.status === 409;
      setSaveState(conflict.current ? "conflict" : "error");
      if (!conflict.current && !keepalive) {
        const delay = [2000, 5000, 15000, 30000][Math.min(retries.current++, 3)];
        window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => void saveNowRef.current(), delay);
      }
    }
  }, [id]);

  const saveNow = useCallback(async (overwrite = false, keepalive = false) => {
    window.clearTimeout(retryTimer.current);
    if (saving.current) {
      // Save again (with the new base) once the current one is back.
      again.current = overwrite || again.current === "overwrite" ? "overwrite" : "save";
      return;
    }
    saving.current = true;
    try {
      await saveOnce(overwrite, keepalive);
      while (again.current && (!conflict.current || again.current === "overwrite")) {
        const next = again.current;
        again.current = "";
        await saveOnce(next === "overwrite", false);
      }
    } finally {
      saving.current = false;
      again.current = "";
    }
  }, [saveOnce]);
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  useEffect(() => {
    // Flush pending changes when leaving the board (keepalive lets the request outlive the page).
    const flush = (keepalive: boolean) => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = undefined;
        void saveNow(false, keepalive);
      }
    };
    // Ask before closing the tab while something is unsaved.
    const onUnload = (e: BeforeUnloadEvent) => {
      const unsaved = saveTimer.current !== undefined || saving.current || stateRef.current !== "saved";
      flush(true);
      if (unsaved) e.preventDefault();
    };
    const onOnline = () => stateRef.current === "error" && void saveNow();
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("online", onOnline);
      window.clearTimeout(retryTimer.current);
      flush(false);
    };
  }, [saveNow]);

  /** Re-colours every math picture for the board's theme (light pictures on a dark board would glare). */
  const retheme = (theme: string) => {
    const ex = excalidraw.current;
    if (!ex) return;
    const files = ex.getFiles();
    const added: BinaryFileData[] = [];
    const swap = new Map<string, FileId>();
    for (const el of ex.getSceneElements()) {
      if (!mathOf(el) || el.type !== "image" || !el.fileId) continue;
      const file = files[el.fileId];
      const svg = file?.mimeType === "image/svg+xml" ? dataUrlToSvg(file.dataURL) : null;
      if (!svg) continue;
      const next = themedSvg(svg, theme);
      if (next === svg) continue;
      const fileId = crypto.randomUUID() as FileId;
      added.push({ id: fileId, dataURL: svgToDataUrl(next) as DataURL, mimeType: "image/svg+xml", created: Date.now() });
      swap.set(el.id, fileId);
    }
    if (!swap.size) return;
    ex.addFiles(added);
    ex.updateScene({
      elements: ex.getSceneElementsIncludingDeleted().map((el) =>
        swap.has(el.id)
          ? { ...el, fileId: swap.get(el.id)!, version: el.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() }
          : el,
      ),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  };

  const onChange = (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    // The theme changed (or the board just opened): bring the pictures along, outside Excalidraw's own update.
    if (appState.theme !== theme.current) {
      theme.current = appState.theme;
      setBoardTheme(appState.theme);
      window.setTimeout(() => retheme(appState.theme), 0);
    }
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
    if (conflict.current) return;
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
      try {
        const saved = await api.save(id, { title: next });
        // Move our base forward only if nothing else was saved in between; otherwise the next drawing save reports the conflict.
        if (saved.previous === base.current) base.current = saved.updatedAt;
        setBoard({ ...board, title: next });
      } catch {
        setSaveState("error");
      }
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

  const openPalette = () => {
    paletteOpener.current = document.activeElement as HTMLElement | null;
    setPalette(true);
  };
  // Ctrl+K (when nothing is selected — with a selection it's Excalidraw's "add link") or "/" outside a text field.
  const shortcutState = useRef({ open: false });
  shortcutState.current.open = palette || !!dialog;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shortcutState.current.open) return;
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      const selected = Object.keys(excalidraw.current?.getAppState().selectedElementIds ?? {}).length > 0;
      const ctrlK = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k" && !selected;
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !typing;
      if (!ctrlK && !slash) return;
      e.preventDefault();
      e.stopPropagation();
      openPalette();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

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
  const openTool = dialog && TOOLS[dialog.kind];
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
          {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : saveState === "conflict" ? t.saveConflict : t.saveError}
        </span>
        <div className="spacer" />
        {selectedMath && (
          <button className="btn" onClick={() => openEditor(selectedMath)}>
            ✎ <span className="btn-label">{t[TOOLS[mathOf(selectedMath)!.kind].edit]}</span>
          </button>
        )}
        <button className="btn" onClick={openPalette} title={t.searchButton} aria-label={t.searchButton}>🔍</button>
        <button className="btn" onClick={() => excalidraw.current?.toggleSidebar({ name: "default", tab: SHAPES_TAB })} title={t.shapes.title}>
          📐 <span className="btn-label">{t.shapes.button}</span>
        </button>
        {MENUS.map((m) => (
          <ToolMenu key={m.label} icon={m.icon} label={t[m.label]} title={m.title && t[m.title]} items={m.items.map((it) => ({
            icon: it.icon,
            label: t[it.label],
            onPick: () => setDialog({ kind: it.kind, start: it.start }),
          }))} />
        ))}
        <LangSelect />
      </header>
      {saveState === "conflict" && (
        <div className="conflict-bar" role="alert">
          <span>{t.conflictText}</span>
          <button className="btn" onClick={() => location.reload()}>{t.conflictReload}</button>
          <button className="btn" onClick={() => void saveNow(true)}>{t.conflictKeep}</button>
        </div>
      )}

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
          excalidrawAPI={(a) => {
            excalidraw.current = a;
            setExcalidrawApi(a);
          }}
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
          <DefaultSidebar>
            <DefaultSidebar.TabTriggers>
              <Sidebar.TabTrigger tab={SHAPES_TAB} title={t.shapes.title} aria-label={t.shapes.title}>{shapesIcon}</Sidebar.TabTrigger>
            </DefaultSidebar.TabTriggers>
            <Sidebar.Tab tab={SHAPES_TAB}>
              <ShapesPanel api={() => excalidraw.current} theme={boardTheme} />
            </Sidebar.Tab>
          </DefaultSidebar>
        </Excalidraw>
      </div>

      <Suspense fallback={null}>
        {openTool && dialog && (
          <openTool.Dialog
            key={dialog.editing?.id ?? dialog.kind}
            initial={dialog.editing && mathOf(dialog.editing)!.data}
            start={dialog.start}
            onClose={() => setDialog(null)}
            onSubmit={(data, image) => {
              const placed: PlacedImage = openTool.png
                ? { dataURL: image.dataURL!, mimeType: "image/png", width: image.width, height: image.height }
                : svgImage({ svg: themedSvg(image.svg!, theme.current), width: image.width, height: image.height });
              placeImage(placed, { kind: dialog.kind, data, w: image.width, h: image.height }, dialog.editing);
              setDialog(null);
            }}
          />
        )}
      </Suspense>
      {palette && (
        <CommandPalette
          onClose={() => {
            setPalette(false);
            paletteOpener.current?.focus();
          }}
          onPick={(kind, start) => {
            setPalette(false);
            // The tool dialog hands focus back to whatever had it before the search.
            paletteOpener.current?.focus();
            setDialog({ kind, start });
          }}
        />
      )}
    </div>
  );
}
