import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  DefaultSidebar,
  Excalidraw,
  getSceneVersion,
  MainMenu,
  Sidebar,
  useHandleLibrary,
  viewportCoordsToSceneCoords,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement, ExcalidrawEmbeddableElement, ExcalidrawImageElement, FileId, NonDeleted, NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { api, ApiError, type Board } from "../api";
import { LangSelect, useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { fromInsertDrag, INSERT_MIME, InsertPanel } from "../components/InsertPanel";
import { useCompact } from "../components/useCompact";
import { ShareBox } from "../components/ShareBox";
import { ReadOnlyBoard } from "./SharedBoardPage";
import { CommandPalette } from "../components/CommandPalette";
import { ItemPanel, PanelSlot, type Flushes, type ScreenBox } from "../components/ItemPanel";
import { SHAPES } from "../math/shapes";
import { itemAt } from "../live/hit";
import { freeY, midX, placeOnBoard, showClear, ShapesPanel, SHAPES_TAB, shapesIcon } from "../components/ShapesPanel";
import { isLiveLink, liveDataOf, liveElement } from "../live/element";
import { LiveView, type LiveHost } from "../live/LiveView";
import { isLiveKind, LIVE_SIZES, type LiveKind } from "../math/live";
import type { RenderedSvg } from "../math/latex";
import { dataUrlToSvg, svgToDataUrl, themedSvg } from "../math/svg";
import { BarIcon } from "../components/BarIcon";
import { ZenoMark } from "../components/ZenoMark";
import { BoardHelp } from "../components/BoardHelp";
import { Tour } from "../components/Help";
import { isSeen, setSeen } from "../seen";
import { isLiveEntry, toolLabel, type LiveEntry, type MenuEntry } from "../menus";
import { isToolKind, TOOLS, type Tool, type ToolDialogProps, type ToolKind } from "../tools";
import { hasOrigin, installPaper, isPaper, PAPERS, type Paper } from "../paper";
import { seen } from "../usage";
import { copyElements, type SceneElement } from "../model/lessonCopy";
import type { LessonCopied, LessonCopy } from "./LessonPage";

/** When a change to the scene is recorded for undo (now, with the next recorded change, or never). */
type CaptureUpdateActionType = (typeof CaptureUpdateAction)[keyof typeof CaptureUpdateAction];

/** Stored on the image element so a formula/graph can be re-opened and edited. */
type MathData = { kind: ToolKind; data: unknown; w: number; h: number };

// Excalidraw's props are made once: a new object on every render would have it re-render the canvas each time the
// save state changes.
const UI_OPTIONS = { canvasActions: { loadScene: true, saveToActiveFile: false } };
// Live pieces are embeddables with an address of ours; anything else is checked as Excalidraw always does.
const validateEmbeddable = (link: string) => (isLiveLink(link) ? true : undefined);
// A live piece's address leads nowhere: its link button does nothing.
const onLinkOpen = (el: { link: string | null }, e: { preventDefault: () => void }) => isLiveLink(el.link) && e.preventDefault();

/** The open tool dialog: a new picture (optionally on a given topic), or the picture being edited. */
type Dialog = { kind: ToolKind; editing?: ExcalidrawImageElement; start?: string };

/** The item panel: the item it changes (no id and no `orig` yet for a new picture, until its first render is placed),
 *  the item as it was when it opened, and where it was on screen; for a tool's picture, the tool, what it held and the
 *  topic it opens on, for a live piece its kind. `key` stays the same for the whole session of one panel. */
type Panel = { key: string; id: string; anchor: ScreenBox; orig?: ExcalidrawElement } & (
  /** `drop`: a new tool's picture dragged in from Insert goes there (its middle, in scene units). */
  | { tool: ToolKind; initial: unknown; start?: string; drop?: { x: number; y: number }; piece?: undefined }
  | { piece: LiveKind; tool?: undefined }
);

/** A tool whose picture is changed in the panel beside it. Three's picture is a WebGL snapshot and practice is not a
 *  picture to change: they keep their own editors. */
const inPanel = (kind: ToolKind) => !TOOLS[kind].docked;

// "conflict": someone saved this board elsewhere since we loaded it; autosave pauses until the user picks.
type SaveState = "saved" | "saving" | "error" | "conflict";

/** Where a new picture goes (its top-left corner): slid down past what it would cover, or `exact`ly there. */
type Spot = { x: number; y: number; exact?: boolean };

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
  // 403: this browser is neither a teacher's nor a student's (boards need one or the other).
  const [refused, setRefused] = useState(false);
  // The board's tour (#875): once, on the first board this browser opens; the ? starts it again.
  const [touring, setTouring] = useState(() => !isSeen("boardTour"));
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  // Insert: the library over the board (#448), in place of the old row of tool menus.
  const [inserting, setInserting] = useState(false);
  const insertBtn = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  // The panel's node that a live piece puts its settings in.
  const [slotNode, setSlotNode] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<Panel | null>(null);
  /** Where and when the last press on the board began, to tell a click on a live piece from a drag of it. */
  const press = useRef<{ x: number; y: number; t: number } | null>(null);
  panelRef.current = panel;
  // Whether the panel has changed its item since it opened: closing it then makes all of it one step to undo.
  const panelChanged = useRef(false);
  // The panel's changes still waiting to go in (ItemPanel's flushes): sent before it closes.
  const panelFlushes = useRef<Flushes>(new Set());
  // The panel just closed: a picture still rendering when it closed (a formula's typesetting) goes in after it, as a
  // step of its own.
  const closedPanel = useRef<Panel | null>(null);
  // A docked tool (practice) has its own place beside the board, so a tool's panel can open while it stays.
  const [dock, setDock] = useState<Dialog | null>(null);
  // A tool opens its panel with its first example already on the board (#558): no tool opens a dialog over it (#567).
  const open = (d: Dialog) => {
    if (!TOOLS[d.kind].docked) return openNew(d.kind, d.start);
    seen("tool", d.kind);
    setDock(d);
  };
  const [palette, setPalette] = useState(false);
  // The board's theme as last seen; "" until Excalidraw reports it.
  const theme = useRef("");
  const paletteOpener = useRef<HTMLElement | null>(null);
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  // When the bar doesn't fit it drops the labels its icons already say (1), then every label (2), then tightens its
  // spacing and the title (3), then wraps onto a second row (4) rather than hide buttons past the edge.
  const [barRef, fit] = useCompact<HTMLElement>(4);
  // The same API as state, for the library hook, which waits for it.
  const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  // The theme for the shape thumbnails.
  const [boardTheme, setBoardTheme] = useState("light");
  // The board's paper (#453), and whether points snap to it (Excalidraw's grid mode).
  const [paper, setPaper] = useState<Paper>("plain");
  const paperRef = useRef<Paper>("plain");
  paperRef.current = paper;
  const [snap, setSnap] = useState(false);
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
  // The paper is drawn by Excalidraw itself, through the hooks scripts/patch-excalidraw.mjs adds. Put in place while
  // rendering, so it is there for Excalidraw's first picture, and taken away with the page.
  useMemo(() => installPaper(paper), [paper]);
  useEffect(() => {
    installPaper(paperRef.current);
    return () => installPaper("plain");
  }, []);

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
        const p = (b.scene?.appState as { paper?: unknown } | undefined)?.paper;
        if (isPaper(p)) setPaper(p);
        setBoard(b);
        setTitle(b.title);
      },
      (e) => (e instanceof ApiError && e.status === 403 ? setRefused(true) : setMissing(true)),
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
      const scene = { elements, files, appState: { viewBackgroundColor, gridModeEnabled, theme, paper: paperRef.current } };
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
      // 403: this browser may not change the board (the student was deleted, the teacher password changed). Trying
      // again won't help, and a teacher password sent again would count as another wrong one.
      if (!conflict.current && !keepalive && !(e instanceof ApiError && e.status === 403)) {
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
      if (el.type !== "image" || !el.fileId || !(mathOf(el) || el.customData?.snapshot)) continue;
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
    // Grid mode also has Excalidraw's own shortcut (Ctrl+'), so the menu's tick follows it.
    setSnap(appState.gridModeEnabled);
    // The panel goes when its item is no longer selected (a click elsewhere) or is gone.
    const open = panelRef.current;
    // Looked at again a moment later: a change that moves the selection and puts it back (duplicating) keeps it.
    const gone = (sel: AppState["selectedElementIds"], els: readonly ExcalidrawElement[]) => !sel[open!.id] || !els.some((e) => e.id === open!.id && !e.isDeleted);
    if (open?.id && gone(appState.selectedElementIds, elements))
      window.setTimeout(() => {
        const ex = excalidraw.current;
        if (ex && panelRef.current?.id === open.id && gone(ex.getAppState().selectedElementIds, ex.getSceneElements())) closePanel();
      }, 0);

    // Excalidraw makes a piece active 100 ms after the click in its middle, with the element as it was at the click.
    // A piece changed in between is a new element by then, so Excalidraw would keep it behind the canvas: point it at
    // the element as it is now (as liveHost.update does for changes made while active).
    const active = appState.activeEmbeddable;
    const current = active && elements.find((e) => e.id === active.element.id);
    if (current && current !== active.element && !current.isDeleted)
      window.setTimeout(() => {
        const ex = excalidraw.current;
        const now = ex?.getAppState().activeEmbeddable;
        const el = now && ex.getSceneElements().find((e) => e.id === now.element.id);
        if (el && el !== now.element) ex.updateScene({ appState: { activeEmbeddable: { element: el, state: now.state } }, captureUpdate: CaptureUpdateAction.NEVER });
      }, 0);

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

  const choosePaper = (p: Paper) => {
    const ex = excalidraw.current;
    paperRef.current = p;
    setPaper(p);
    installPaper(p);
    if (!ex) return;
    // Excalidraw draws its background again only when the scene changes: hand it the same elements.
    ex.updateScene({ elements: ex.getSceneElementsIncludingDeleted(), captureUpdate: CaptureUpdateAction.NEVER });
    // The coordinate plane and polar paper are about their origin: bring it to the middle unless it is well in sight
    // (a new board has it in its very corner).
    const st = ex.getAppState();
    const [x, y] = [st.scrollX * st.zoom.value, st.scrollY * st.zoom.value];
    const m = Math.min(st.width, st.height) * 0.15;
    if (hasOrigin(p) && (x < m || y < m || x > st.width - m || y > st.height - m))
      ex.updateScene({ appState: { scrollX: st.width / 2 / st.zoom.value, scrollY: st.height / 2 / st.zoom.value }, captureUpdate: CaptureUpdateAction.NEVER });
    void saveNow();
  };
  const toggleSnap = () => {
    const ex = excalidraw.current;
    if (!ex) return;
    ex.updateScene({ appState: { gridModeEnabled: !ex.getAppState().gridModeEnabled }, captureUpdate: CaptureUpdateAction.NEVER });
    void saveNow();
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

  /**
   * Adds a rendered image to the canvas (at `at`, or in the middle of the view), or swaps the image of an existing
   * formula/graph/model. Without `math` it's a plain picture, such as a copy of a live piece.
   */
  const placeImage = (rendered: PlacedImage, math: MathData | undefined, editing?: ExcalidrawImageElement, at?: Spot, capture: CaptureUpdateActionType = CaptureUpdateAction.IMMEDIATELY): ExcalidrawElement | undefined => {
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
      ex.updateScene({ elements: updated, captureUpdate: capture });
      return updated.find((el) => el.id === editing.id);
    }

    // Start in the middle of the view clear of Excalidraw's panel (or where asked), then slide down past anything it would cover.
    const { scrollX, scrollY, zoom, width, height } = ex.getAppState();
    const x = at?.x ?? midX(width, zoom.value, rendered.width) / zoom.value - scrollX - rendered.width / 2;
    const y = at?.exact ? at.y : freeY(elements, x, at?.y ?? height / 2 / zoom.value - scrollY - rendered.height / 2, rendered.width, rendered.height);
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
    const withData = { ...el, customData: math ?? { snapshot: true } } as ExcalidrawElement;
    ex.updateScene({
      elements: [...elements, withData],
      appState: { selectedElementIds: { [withData.id]: true } },
      captureUpdate: capture,
    });
    // A picture placed from the panel stays still, so the panel can be put beside it at once; one dropped where it
    // was wanted is in view already.
    if (!at?.exact) showClear(ex, [withData]);
    return withData;
  };

  // What a live piece on the board can ask of it: write its new state into its element, put a copy beside it, or
  // open another piece beside it.
  const besides = (id: string) => {
    const el = excalidraw.current?.getSceneElements().find((e) => e.id === id);
    return el ? { x: el.x + el.width + 32, y: el.y } : undefined;
  };
  const liveHost = useRef<LiveHost>(null as unknown as LiveHost);
  liveHost.current = {
    update: (id, data) => {
      const ex = excalidraw.current;
      if (!ex) return;
      let next: ExcalidrawElement | undefined;
      const elements = ex.getSceneElementsIncludingDeleted().map((el) =>
        el.id === id
          ? (next = { ...el, customData: data, version: el.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31), updated: Date.now() })
          : el,
      );
      // Excalidraw knows the piece being used by the element object itself, so point it at the new one, or each
      // change would need another click to carry on.
      const { activeEmbeddable } = ex.getAppState();
      ex.updateScene({
        elements,
        ...(next && activeEmbeddable?.element.id === id
          ? { appState: { activeEmbeddable: { element: next as NonDeletedExcalidrawElement, state: activeEmbeddable.state } } }
          : {}),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    snapshot: (id, svgEl) => {
      const svg = new XMLSerializer().serializeToString(svgEl);
      const width = Number(svgEl.getAttribute("width"));
      const height = Number(svgEl.getAttribute("height"));
      placeImage(svgImage({ svg: themedSvg(svg, theme.current), width, height }), undefined, undefined, besides(id));
    },
    freezeGraph: async (id, state) => {
      const [{ substitute }, { plotToSvg }] = await Promise.all([import("../math/liveGraph"), import("../math/plot")]);
      const values = Object.fromEntries(Object.entries(state.params).map(([k, p]) => [k, p.v]));
      const spec = {
        functions: state.fns.filter((f) => f.expr.trim()).map((f) => ({ ...f, expr: substitute(f.expr, values) })),
        ...state.view,
        grid: true,
      };
      try {
        const r = plotToSvg(spec);
        placeImage(svgImage({ ...r, svg: themedSvg(r.svg, theme.current) }), { kind: "graph", data: spec, w: r.width, h: r.height }, undefined, besides(id));
      } catch {
        /* a function that doesn't draw: nothing to copy */
      }
    },
    open: (id, kind, patch) => {
      const ex = excalidraw.current;
      const at = besides(id);
      if (!ex || !at) return;
      const [w, h] = LIVE_SIZES[kind];
      const scene = ex.getSceneElementsIncludingDeleted();
      const el = liveElement(kind, at.x, freeY(scene, at.x, at.y, w, h), patch);
      ex.updateScene({ elements: [...scene, el], appState: { selectedElementIds: { [el.id]: true } }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      showClear(ex, [el]);
    },
  };
  /** A live piece in the free spot in the middle of the view, or with its middle where it was dropped. */
  const addLive = (kind: LiveKind, drop?: { x: number; y: number }) => {
    const ex = excalidraw.current;
    if (!ex) return;
    seen("tool", kind);
    if (!drop) return placeOnBoard(ex, [liveElement(kind)]);
    const [w, h] = LIVE_SIZES[kind];
    const el = liveElement(kind, drop.x - w / 2, drop.y - h / 2);
    ex.updateScene({ elements: [...ex.getSceneElementsIncludingDeleted(), el], appState: { selectedElementIds: { [el.id]: true } }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };
  /** What Insert hands over, by a click (the middle of the view) or dropped on the board (`drop`: client and scene points). */
  const pickInsert = (it: MenuEntry | LiveEntry, drop?: { client: [number, number]; scene: { x: number; y: number } }) => {
    if (isLiveEntry(it)) {
      addLive(it.live, drop?.scene);
      // Insert stays open; the keyboard goes to the board, where the new piece is selected (Delete, Escape, arrows).
      return document.querySelector<HTMLElement>(".excalidraw-container")?.focus({ preventScroll: true });
    }
    if (drop && inPanel(it.kind)) return openNew(it.kind, it.start, drop);
    open({ kind: it.kind, start: it.start });
  };

  const elementById = (id: string) => excalidraw.current?.getSceneElements().find((e) => e.id === id);
  /** The item's rectangle on screen (unturned), for placing the panel beside it. */
  const screenBox = (el: ExcalidrawElement): ScreenBox => {
    const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = excalidraw.current!.getAppState();
    const z = zoom.value;
    const left = (el.x + scrollX) * z + offsetLeft;
    const top = (el.y + scrollY) * z + offsetTop;
    return { left, top, right: left + el.width * z, bottom: top + el.height * z };
  };
  const openPanel = (el: ExcalidrawElement) => {
    const ex = excalidraw.current!;
    if (panelRef.current) closePanel();
    const math = mathOf(el);
    const live = liveDataOf(el);
    // A live piece is made active as well, so its own controls answer the next click without one to step into it.
    const selectedElementIds: AppState["selectedElementIds"] = { [el.id]: true };
    if (live) ex.updateScene({ appState: { selectedElementIds, activeEmbeddable: { element: el as NonDeletedExcalidrawElement, state: "active" } }, captureUpdate: CaptureUpdateAction.NEVER });
    else ex.updateScene({ appState: { selectedElementIds }, captureUpdate: CaptureUpdateAction.NEVER });
    const at = { key: el.id, id: el.id, anchor: screenBox(el), orig: el };
    const next: Panel | null = math ? { ...at, tool: math.kind, initial: math.data } : live ? { ...at, piece: live.live } : null;
    panelRef.current = next;
    setPanel(next);
  };
  /** A new picture: the panel opens in the middle of the view, and the tool's first render is placed there (see
   *  PanelFresh), with the panel then moving beside it. */
  const openNew = (kind: ToolKind, start?: string, drop?: { client: [number, number]; scene: { x: number; y: number } }) => {
    const ex = excalidraw.current;
    if (!ex) return;
    seen("tool", kind);
    if (panelRef.current) closePanel();
    const { width, height, offsetLeft, offsetTop } = ex.getAppState();
    const [x, y] = drop?.client ?? [offsetLeft + width / 2, offsetTop + height / 2];
    const next: Panel = { key: crypto.randomUUID(), id: "", anchor: { left: x, top: y, right: x, bottom: y }, tool: kind, initial: undefined, start, drop: drop?.scene };
    panelRef.current = next;
    setPanel(next);
  };
  const deletePanelItem = (id: string) => {
    const ex = excalidraw.current;
    closePanel();
    if (!ex) return;
    ex.updateScene({
      elements: ex.getSceneElementsIncludingDeleted().map((e) => (e.id === id ? { ...e, isDeleted: true, version: e.version + 1, versionNonce: Math.floor(Math.random() * 2 ** 31) } : e)),
      appState: { selectedElementIds: {} },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };
  // Closing settles what the panel did as one step to undo. Its changes went in unrecorded (NEVER: EVENTUALLY would
  // leave the item "uncommitted", and updateScene leaves such items out of the step), so the picture it opened with
  // goes back quietly, and the last one is then put in as the step: undo goes straight back to before the panel.
  function closePanel() {
    for (const flush of panelFlushes.current) flush();
    // The keyboard was in the panel: it goes back to the board (Excalidraw hears keys only on its own element), so
    // Enter opens the picture again, Ctrl+Z undoes and Delete deletes.
    if (document.activeElement?.closest(".item-panel"))
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) document.querySelector<HTMLElement>(".excalidraw-container")?.focus({ preventScroll: true });
      });
    const open = panelRef.current;
    closedPanel.current = open;
    panelRef.current = null;
    setPanel(null);
    const ex = excalidraw.current;
    if (!open || !ex || !panelChanged.current) return;
    panelChanged.current = false;
    const now = ex.getSceneElementsIncludingDeleted();
    const last = now.find((e) => e.id === open.id);
    if (!last || last.isDeleted) return;
    const swap = (el: ExcalidrawElement, n: number) => now.map((e) => (e.id === open.id ? { ...el, version: last.version + n, versionNonce: Math.floor(Math.random() * 2 ** 31) } : e));
    // A new picture went in unrecorded too: it is taken away quietly and put back as the step, so one undo removes it.
    if (!open.orig) {
      ex.updateScene({ elements: swap({ ...last, isDeleted: true } as ExcalidrawElement, 1), captureUpdate: CaptureUpdateAction.NEVER });
      ex.updateScene({ elements: swap(last, 2), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      return;
    }
    const o = open.orig as ExcalidrawImageElement;
    ex.updateScene({ elements: swap({ ...last, fileId: o.fileId, customData: o.customData, width: o.width, height: o.height } as ExcalidrawElement, 1), captureUpdate: CaptureUpdateAction.NEVER });
    ex.updateScene({ elements: swap(last, 2), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }

  const openPalette = () => {
    paletteOpener.current = document.activeElement as HTMLElement | null;
    setPalette(true);
  };
  // Ctrl+K (when nothing is selected — with a selection it's Excalidraw's "add link") or "/" outside a text field.
  const shortcutState = useRef({ open: false });
  shortcutState.current.open = palette;
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

  // Enter on a selected tool's picture opens its panel, the keyboard's way to the click (Excalidraw would crop it). In a
  // field or on a button, Enter stays theirs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || panelRef.current) return;
      const at = e.target as HTMLElement | null;
      if (at && at !== document.body && (!at.closest(".excalidraw") || at.closest("input, textarea, select, button, a, [contenteditable]"))) return;
      const pic = excalidraw.current && selectedMathElement(excalidraw.current);
      if (!pic) return;
      e.preventDefault();
      e.stopPropagation();
      openPanel(pic);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scene = board?.scene;
  const initialData = useMemo(
    () => scene && {
      elements: (scene.elements ?? []) as ExcalidrawElement[],
      files: (scene.files ?? {}) as BinaryFiles,
      appState: scene.appState as Partial<AppState>,
      scrollToContent: true,
    },
    [scene],
  );
  const setApi = useCallback((a: ExcalidrawImperativeAPI) => {
    excalidraw.current = a;
    setExcalidrawApi(a);
  }, []);
  // In a lesson this board is in a frame beside the host's, and the lesson's page around it hands the host's drawing
  // in: it is copied onto the board here, by the board's own writer, beside what is on it, and saved like any change.
  // A copy is taken once, however often it is offered (the page asks until it is answered).
  const copiesTaken = useRef(new Set<string>());
  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as LessonCopy | undefined;
      const ex = excalidraw.current;
      if (e.origin !== location.origin || e.source !== window.parent || d?.type !== "zeno:lesson-copy" || !ex) return;
      if (!copiesTaken.current.has(d.id)) {
        copiesTaken.current.add(d.id);
        const copied = copyElements(d.elements as SceneElement[], ex.getSceneElements() as unknown as SceneElement[], () => crypto.randomUUID()) as unknown as ExcalidrawElement[];
        if (copied.length) {
          ex.addFiles(Object.values(d.files) as BinaryFileData[]);
          ex.updateScene({ elements: [...ex.getSceneElementsIncludingDeleted(), ...copied], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
          // Everything in view, the board's own work and the copy beside it.
          ex.scrollToContent(ex.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.9, maxZoom: 1, animate: true });
        }
      }
      const answer: LessonCopied = { type: "zeno:lesson-copied", id: d.id };
      window.parent.postMessage(answer, location.origin);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  // The course map opens a tool or a lab on a board: #/b/<id>/tool/<kind>[/<topic>] or #/b/<id>/live/<kind>. Once the
  // board has loaded it is opened, and the address goes back to the board's own (so a reload doesn't add another).
  useEffect(() => {
    const m = location.hash.match(/^#\/b\/[\w-]+\/(tool|live)\/(\w+)(?:\/(\w+))?$/);
    if (!excalidrawApi || !m) return;
    const [, what, kind, start] = m;
    const done = () => history.replaceState(null, "", `#/b/${id}`);
    const tool = what === "tool" && isToolKind(kind);
    if (!tool && (what !== "live" || !isLiveKind(kind))) return done();
    // The scene arrives a moment after the API: a piece or picture placed before would be lost under it.
    let frame = 0;
    const go = () => (tool ? open({ kind, start }) : addLive(kind as LiveKind));
    const place = () => (excalidrawApi.getAppState().isLoading ? (frame = requestAnimationFrame(place)) : (go(), done()));
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
    // Only when the board is first ready: the address is the board's own afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawApi]);
  // (One whose data is missing or damaged shows nothing, rather than Excalidraw trying to load its address.)
  const renderEmbeddable = useCallback(
    (el: NonDeleted<ExcalidrawEmbeddableElement>) => (isLiveLink(el.link) ? liveDataOf(el) ? <LiveView element={el} host={liveHost.current} /> : <div /> : null),
    [],
  );

  if (missing) {
    return (
      <div className="z center-msg">
        <p>{t.notFound}</p>
        <a className="btn" href="#/">← {t.back}</a>
      </div>
    );
  }
  if (refused) return <div className="z center-msg"><p>{t.boardsNeedOwner}</p><a className="btn" href="#/">← {t.back}</a></div>;
  if (!board || !initialData) return <div className="z center-msg">{t.loading}</div>;
  // A teacher opening a student's board: to look at, not to change (the server refuses any save).
  if (board.readOnly) return <ReadOnlyBoard board={board} back="#/teacher" />;

  const dockTool = dock && TOOLS[dock.kind];
  /** Puts what a tool made on the board, or in place of the picture it was editing. */
  const insert = (d: Dialog, tool: Tool, data: unknown, image: Parameters<ToolDialogProps["onSubmit"]>[1], capture?: CaptureUpdateActionType, at?: Spot) => {
    const placed = svgImage({ svg: themedSvg(image.svg!, theme.current), width: image.width, height: image.height });
    return placeImage(placed, { kind: d.kind, data, w: image.width, h: image.height }, d.editing, at, capture);
  };
  const panelTool = panel?.tool ? TOOLS[panel.tool] : null;
  const panelLive = !!panel?.tool && inPanel(panel.tool);
  const pieceName = (kind: LiveKind) => {
    const id = SHAPES.find((s) => s.live === kind)?.id as keyof Dict["shapes"]["names"] | undefined;
    return id ? t.shapes.names[id] : kind;
  };
  return (
    <div className="z board-page">
      <header ref={barRef} data-fit={fit} className="board-bar">
        <a className="board-home" href="#/" title={t.back} aria-label={t.back}><ZenoMark size={14} /></a>
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
        <button className="btn search-btn" onClick={openPalette} title={t.searchButton} aria-label={t.searchButton}><BarIcon name="search" /></button>
        <button className="btn shapes-btn" onClick={() => excalidraw.current?.toggleSidebar({ name: "default", tab: SHAPES_TAB })} title={t.shapes.title}>
          <BarIcon name="shapes" /> <span className="btn-label minor">{t.shapes.button}</span>
        </button>
        <button ref={insertBtn} className="btn primary insert-btn" onClick={() => setInserting(!inserting)} title={t.site.insert.title} aria-expanded={inserting}>
          <BarIcon name="insert" /> <span className="btn-label">{t.site.insert.button}</span>
        </button>
        <ShareBox id={id} token={board.shareToken ?? null} onChange={(shareToken) => setBoard({ ...board, shareToken })}
          lesson={board.lessonToken ?? null} onLesson={(lessonToken) => setBoard({ ...board, lessonToken })} />
        <BoardHelp onTour={() => setTouring(true)} />
        <LangSelect />
      </header>
      {touring && (
        <Tour
          steps={[
            { sel: ".board-bar .insert-btn", text: t.help.board.steps.insert },
            { sel: ".board-bar .shapes-btn", text: t.help.board.steps.shapes },
            { sel: ".board-bar .search-btn", text: t.help.board.steps.search },
            { sel: ".board-bar .share", text: t.help.board.steps.share },
            { sel: ".App-toolbar", text: t.help.board.steps.draw },
          ]}
          onDone={() => {
            setSeen("boardTour", true);
            setTouring(false);
          }}
        />
      )}
      {saveState === "conflict" && (
        <div className="conflict-bar" role="alert">
          <span>{t.conflictText}</span>
          <button className="btn" onClick={() => location.reload()}>{t.conflictReload}</button>
          <button className="btn" onClick={() => void saveNow(true)}>{t.conflictKeep}</button>
        </div>
      )}

      <div className="board-body">
      <div
        className="canvas-wrap"
        // Something dragged in from Insert lands where it is dropped (Excalidraw never sees the drop).
        onDragOverCapture={(e) => {
          if (!e.dataTransfer.types.includes(INSERT_MIME)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDropCapture={(e) => {
          const ex = excalidraw.current;
          const it = fromInsertDrag(e.dataTransfer);
          if (!ex || !it) return;
          e.preventDefault();
          e.stopPropagation();
          pickInsert(it, { client: [e.clientX, e.clientY], scene: viewportCoordsToSceneCoords({ clientX: e.clientX, clientY: e.clientY }, ex.getAppState()) });
        }}
        // A right-click on a tool's picture or a live piece opens its panel beside it instead of Excalidraw's menu
        // (Shift keeps the menu).
        onContextMenuCapture={(e) => {
          const ex = excalidraw.current;
          if (!ex || e.shiftKey) return;
          const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = ex.getAppState();
          const z = zoom.value;
          const el = itemAt(ex.getSceneElements(), (e.clientX - offsetLeft) / z - scrollX, (e.clientY - offsetTop) / z - scrollY, (x) => !!mathOf(x) || !!liveDataOf(x));
          if (!el) return;
          e.preventDefault();
          e.stopPropagation();
          openPanel(el);
        }}
        // One click on a live piece that isn't in use puts it in use and passes the click on to what is under it, so its
        // buttons answer the first click (Excalidraw wants a click in its middle third, or a double-click). Dragging it
        // still moves it.
        onPointerDownCapture={(e) => {
          press.current = e.button === 0 ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
        }}
        onPointerUpCapture={(e) => {
          const p = press.current;
          press.current = null;
          const ex = excalidraw.current;
          if (!ex || !p || e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
          if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4 || e.timeStamp - p.t > 400) return;
          const st = ex.getAppState();
          if (st.activeTool.type !== "selection") return;
          const z = st.zoom.value;
          const [sx, sy] = [(e.clientX - st.offsetLeft) / z - st.scrollX, (e.clientY - st.offsetTop) / z - st.scrollY];
          // A tool's picture: one click opens its panel beside it, once Excalidraw has selected it. Not when the click
          // leaves it among others (a group, or a selection of several), and not again when its panel is open.
          const pic = itemAt(ex.getSceneElements(), sx, sy, (x) => !!mathOf(x));
          if (pic) {
            if (pic.groupIds.length > 0 || panelRef.current?.id === pic.id) return;
            window.setTimeout(() => {
              const sel = Object.keys(ex.getAppState().selectedElementIds);
              const now = ex.getSceneElements().find((x) => x.id === pic.id);
              if (now && sel.length === 1 && sel[0] === pic.id && panelRef.current?.id !== pic.id) openPanel(now);
            }, 0);
            return;
          }
          const el = itemAt(ex.getSceneElements(), sx, sy, (x) => !!liveDataOf(x));
          if (!el || (st.activeEmbeddable?.element.id === el.id && st.activeEmbeddable.state === "active")) return;
          const [cx, cy] = [e.clientX, e.clientY];
          // After Excalidraw's own handling of the press, which selects the piece.
          window.setTimeout(() => {
            const now = ex.getSceneElements().find((x) => x.id === el.id);
            if (!now) return;
            ex.updateScene({
              appState: { selectedElementIds: { [el.id]: true }, activeEmbeddable: { element: now as NonDeletedExcalidrawElement, state: "active" } },
              captureUpdate: CaptureUpdateAction.NEVER,
            });
            // Once the piece takes pointer events, the press goes to the control under it: down, up and click, since
            // pieces worked by hand act on the press and the let-go, buttons on the click.
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const target = document.elementFromPoint(cx, cy);
              if (!target?.closest(".live")) return;
              const at = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, view: window, button: 0 };
              const pointer = { ...at, pointerId: 1, pointerType: "mouse", isPrimary: true };
              target.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, buttons: 1 }));
              target.dispatchEvent(new PointerEvent("pointerup", { ...pointer, buttons: 0 }));
              target.dispatchEvent(new MouseEvent("click", at));
            }));
          }, 0);
        }}
        // A double-click on a tool's picture does nothing more than its first click (instead of Excalidraw's crop mode).
        onDoubleClickCapture={(e) => {
          if (excalidraw.current && selectedMathElement(excalidraw.current)) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <PanelSlot.Provider value={panel?.piece && slotNode ? { id: panel.id, node: slotNode } : null}>
        <Excalidraw
          excalidrawAPI={setApi}
          langCode={excalidrawLang}
          initialData={initialData}
          onChange={onChange}
          validateEmbeddable={validateEmbeddable}
          renderEmbeddable={renderEmbeddable}
          onLinkOpen={onLinkOpen}
          UIOptions={UI_OPTIONS}
        >
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.ItemCustom>
              <div className="paper-pick">
                <label>
                  <span>{t.paper.title}</span>
                  <select value={paper} onChange={(e) => isPaper(e.target.value) && choosePaper(e.target.value)}>
                    {PAPERS.map((p) => <option key={p} value={p}>{t.paper.names[p]}</option>)}
                  </select>
                </label>
                <label className="paper-snap">
                  <input type="checkbox" checked={snap} onChange={toggleSnap} />
                  <span>{t.paper.snap}</span>
                </label>
              </div>
            </MainMenu.ItemCustom>
          </MainMenu>
          <DefaultSidebar>
            <DefaultSidebar.TabTriggers>
              <Sidebar.TabTrigger tab={SHAPES_TAB} title={t.shapes.title} aria-label={t.shapes.title}>{shapesIcon}</Sidebar.TabTrigger>
            </DefaultSidebar.TabTriggers>
            <Sidebar.Tab tab={SHAPES_TAB}>
              <ShapesPanel api={() => excalidraw.current} theme={boardTheme} />
            </Sidebar.Tab>
          </DefaultSidebar>
          <WelcomeScreen>
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Heading>{t.help.board.empty}</WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItem onSelect={() => setInserting(true)} icon={<BarIcon name="insert" />}>{t.site.insert.title}</WelcomeScreen.Center.MenuItem>
                <WelcomeScreen.Center.MenuItem onSelect={openPalette} icon={<BarIcon name="search" />} shortcut="Ctrl+K">{t.searchTools}</WelcomeScreen.Center.MenuItem>
                <WelcomeScreen.Center.MenuItem onSelect={() => setTouring(true)} icon={<BarIcon name="games" />}>{t.help.board.tour}</WelcomeScreen.Center.MenuItem>
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </Excalidraw>
        </PanelSlot.Provider>
      </div>
      {dockTool && dock && (
        <Suspense fallback={null}>
          <dockTool.Dialog
            key={dock.editing?.id ?? `${dock.kind}:${dock.start ?? ""}`}
            docked
            initial={dock.editing && mathOf(dock.editing)!.data}
            start={dock.start}
            onClose={() => setDock(null)}
            onSubmit={(data, image) => {
              insert(dock, dockTool, data, image);
              // Practice goes on beside the board; an edit is finished.
              if (dock.editing) setDock(null);
            }}
          />
        </Suspense>
      )}
      {inserting && (
        <InsertPanel
          onClose={() => {
            setInserting(false);
            insertBtn.current?.focus();
          }}
          onPick={(it) => pickInsert(it)}
        />
      )}
      </div>

      {panel?.piece && (
        <ItemPanel
          key={panel.key}
          title={pieceName(panel.piece)}
          anchor={panel.anchor}
          onClose={closePanel}
          slotRef={setSlotNode}
          actions={
            <>
              <button className="btn" onClick={() => {
                liveHost.current.open?.(panel.id, panel.piece, liveDataOf(elementById(panel.id) ?? {})?.state);
                // The copy goes beside it; the panel stays on the piece it was opened for.
                excalidraw.current?.updateScene({ appState: { selectedElementIds: { [panel.id]: true } }, captureUpdate: CaptureUpdateAction.NEVER });
              }}>{t.duplicate}</button>
              <button className="btn" onClick={() => deletePanelItem(panel.id)}>{t.delete}</button>
            </>
          }
        />
      )}
      {panel?.tool && panelTool && (
        <ItemPanel
          key={panel.key}
          title={t[(!panel.orig && toolLabel(panel.tool, panel.start)) || panelTool.edit]}
          anchor={panel.anchor}
          onClose={closePanel}
          fresh={!panel.orig}
          flushes={panelFlushes.current}
          actions={
            !panelLive && (
              <button className="btn" onClick={() => {
                const el = elementById(panel.id);
                closePanel();
                if (el && mathOf(el)) open({ kind: mathOf(el)!.kind, editing: el as ExcalidrawImageElement });
              }}>{t.fullEditor}</button>
            )
          }
        >
          {panelLive ? (
            <Suspense fallback={null}>
              <panelTool.Dialog
                initial={panel.initial}
                start={panel.start}
                onClose={closePanel}
                onSubmit={(data, image) => {
                  const open = panelRef.current;
                  const late = open?.key !== panel.key;
                  const p = late ? (closedPanel.current?.key === panel.key ? closedPanel.current : null) : open;
                  if (!p?.tool) return;
                  // A new picture's first render puts it on the board; every later one changes it.
                  const el = p.id ? elementById(p.id) : undefined;
                  if (p.id && (!el || !mathOf(el))) return;
                  if (!late) panelChanged.current = true;
                  const capture = late ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER;
                  const at = !p.id && p.drop ? { x: p.drop.x - image.width / 2, y: p.drop.y - image.height / 2, exact: true } : undefined;
                  const placed = insert({ kind: p.tool, editing: el as ExcalidrawImageElement | undefined }, panelTool, data, image, capture, at);
                  if (!p.id && placed) {
                    const next: Panel = { ...p, id: placed.id, anchor: screenBox(placed) };
                    if (late) closedPanel.current = next;
                    else {
                      panelRef.current = next;
                      setPanel(next);
                    }
                  }
                }}
              />
            </Suspense>
          ) : (
            <p className="hint">{t.panelFullOnly}</p>
          )}
        </ItemPanel>
      )}
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
            open({ kind, start });
          }}
        />
      )}
    </div>
  );
}
