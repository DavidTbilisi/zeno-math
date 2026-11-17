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
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement, ExcalidrawEmbeddableElement, ExcalidrawImageElement, FileId, NonDeleted, NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";

import { api, ApiError, type Board } from "../api";
import { LangSelect, useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { ToolMenu } from "../components/ToolMenu";
import { useCompact } from "../components/useCompact";
import { ShareBox } from "../components/ShareBox";
import { ReadOnlyBoard } from "./SharedBoardPage";
import { CommandPalette } from "../components/CommandPalette";
import { ItemPanel, PanelSlot, type ScreenBox } from "../components/ItemPanel";
import { SHAPES } from "../math/shapes";
import { itemAt } from "../live/hit";
import { freeY, placeOnBoard, ShapesPanel, SHAPES_TAB, shapesIcon } from "../components/ShapesPanel";
import { isLiveLink, liveDataOf, liveElement } from "../live/element";
import { LiveView, type LiveHost } from "../live/LiveView";
import { isLiveKind, LIVE_SIZES, type LiveKind } from "../math/live";
import type { RenderedSvg } from "../math/latex";
import { dataUrlToSvg, svgToDataUrl, themedSvg } from "../math/svg";
import { BarIcon } from "../components/BarIcon";
import { ZenoMark } from "../components/ZenoMark";
import { isToolKind, MENUS, TOOLS, type Tool, type ToolDialogProps, type ToolKind } from "../tools";

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

/** The right-click panel: the item it changes, the item as it was when it opened, and where it was on screen; for a
 *  tool's picture, the tool and what it held, for a live piece its kind. */
type Panel = { id: string; anchor: ScreenBox; orig: ExcalidrawElement } & ({ tool: ToolKind; initial: unknown; piece?: undefined } | { piece: LiveKind; tool?: undefined });

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

type LiveEntry = { kind: LiveKind; icon: string; name: keyof Dict["shapes"]["names"] };

// Live pieces offered in the tool menus too (all of them are in the Shapes panel), by menu.
const LIVE_IN_MENUS: Record<string, LiveEntry[]> = {
  groupArithmetic: [
    { kind: "division", icon: "÷", name: "liveDivision" },
    { kind: "soroban", icon: "🧮", name: "liveSoroban" },
    { kind: "numberLine", icon: "↔", name: "liveNumberLine" },
  ],
  groupAlgebraShort: [{ kind: "graph", icon: "🎚", name: "liveGraph" }],
  groupAi: [
    { kind: "descentLab", icon: "⛳", name: "liveDescentLab" },
    { kind: "pcaLab", icon: "📏", name: "livePcaLab" },
    { kind: "softmaxLab", icon: "📊", name: "liveSoftmaxLab" },
    { kind: "embedLab", icon: "🧭", name: "liveEmbedLab" },
    { kind: "backpropLab", icon: "🔙", name: "liveBackpropLab" },
    { kind: "tensorLab", icon: "🧊", name: "liveTensorLab" },
    { kind: "fitLab", icon: "〰", name: "liveFitLab" },
    { kind: "batchLab", icon: "🎯", name: "liveBatchLab" },
    { kind: "rocLab", icon: "⚖", name: "liveRocLab" },
    { kind: "knnLab", icon: "📍", name: "liveKnnLab" },
    { kind: "treeLab", icon: "🌳", name: "liveTreeLab" },
    { kind: "kmeansLab", icon: "✳", name: "liveKmeansLab" },
    { kind: "nnLab", icon: "🕸", name: "liveNnLab" },
    { kind: "convLab", icon: "▩", name: "liveConvLab" },
    { kind: "attnLab", icon: "👁", name: "liveAttnLab" },
    { kind: "rnnLab", icon: "🔁", name: "liveRnnLab" },
    { kind: "rlLab", icon: "🎲", name: "liveRlLab" },
  ],
  groupDiscreteShort: [
    { kind: "chance", icon: "🎲", name: "liveChance" },
    { kind: "rubik", icon: "🧩", name: "liveRubik" },
    { kind: "patterns", icon: "👆", name: "livePatterns" },
    { kind: "problems", icon: "🧑‍💻", name: "liveProblems" },
    { kind: "solver", icon: "🧮", name: "liveSolver" },
  ],
};

// The games, apart from the tools in a menu of their own, by the sense each one builds.
const GAME_MENU: { sense: "senseNumber" | "senseNumberPatterns" | "senseFraction" | "senseAlgebra" | "senseShape" | "senseChart" | "senseGraph" | "senseAlgo" | "senseData" | "senseSystem"; games: LiveEntry[] }[] = [
  {
    sense: "senseNumber", games: [
      { kind: "estimate", icon: "📍", name: "liveEstimate" },
      { kind: "quickLook", icon: "👀", name: "liveQuickLook" },
      { kind: "target", icon: "🎯", name: "liveTarget" },
      { kind: "closerTo", icon: "≈", name: "liveCloserTo" },
      { kind: "kakooma", icon: "🔢", name: "liveKakooma" },
    ],
  },
  {
    sense: "senseNumberPatterns", games: [
      { kind: "numberShapes", icon: "⠿", name: "liveNumberShapes" },
      { kind: "primeSlice", icon: "✂️", name: "livePrimeSlice" },
      { kind: "divisible", icon: "➗", name: "liveDivisible" },
      { kind: "growing", icon: "🧱", name: "liveGrowing" },
      { kind: "machine", icon: "⚙️", name: "liveMachine" },
    ],
  },
  {
    sense: "senseFraction", games: [
      { kind: "fractionWall", icon: "▤", name: "liveFractionWall" },
      { kind: "equivMatch", icon: "🃏", name: "liveEquivMatch" },
      { kind: "fracOrder", icon: "⇢", name: "liveFracOrder" },
      { kind: "shadeFrac", icon: "◔", name: "liveShadeFrac" },
    ],
  },
  {
    sense: "senseAlgebra", games: [
      { kind: "balance", icon: "⚖️", name: "liveBalance" },
      { kind: "exprMatch", icon: "x=", name: "liveExprMatch" },
    ],
  },
  {
    sense: "senseShape", games: [
      { kind: "geoboard", icon: "⬠", name: "liveGeoboard" },
      { kind: "angleGuess", icon: "∠", name: "liveAngleGuess" },
      { kind: "angleHunt", icon: "📐", name: "liveAngleHunt" },
      { kind: "mirror", icon: "🦋", name: "liveMirror" },
      { kind: "views3d", icon: "🧊", name: "liveViews3d" },
      { kind: "cubeNet", icon: "🎲", name: "liveCubeNet" },
    ],
  },
  {
    sense: "senseChart", games: [
      { kind: "plotPoint", icon: "⌖", name: "livePlotPoint" },
      { kind: "barChart", icon: "📊", name: "liveBarChart" },
      { kind: "graphStory", icon: "🚶", name: "liveGraphStory" },
      { kind: "slopeLine", icon: "📈", name: "liveSlopeLine" },
    ],
  },
  {
    sense: "senseGraph", games: [
      { kind: "oneStroke", icon: "✍️", name: "liveOneStroke" },
      { kind: "colourMap", icon: "🎨", name: "liveColourMap" },
      { kind: "shortestPath", icon: "🧭", name: "liveShortestPath" },
      { kind: "connectTowns", icon: "🛤️", name: "liveConnectTowns" },
    ],
  },
  {
    sense: "senseAlgo", games: [
      { kind: "beSort", icon: "🔀", name: "liveBeSort" },
      { kind: "beSearch", icon: "🔦", name: "liveBeSearch" },
      { kind: "beDp", icon: "▦", name: "liveBeDp" },
      { kind: "beBinary", icon: "🔍", name: "liveBeBinary" },
      { kind: "bePointers", icon: "👉", name: "liveBePointers" },
      { kind: "beWindow", icon: "🪟", name: "liveBeWindow" },
      { kind: "beBacktrack", icon: "♛", name: "liveBeBacktrack" },
      { kind: "beTopo", icon: "➡️", name: "liveBeTopo" },
      { kind: "beName", icon: "🏷️", name: "liveBeName" },
    ],
  },
  {
    sense: "senseData", games: [
      { kind: "beHeap", icon: "⛰️", name: "liveBeHeap" },
      { kind: "beTree", icon: "🌳", name: "liveBeTree" },
      { kind: "beStack", icon: "📚", name: "liveBeStack" },
      { kind: "beUnion", icon: "🔗", name: "liveBeUnion" },
    ],
  },
  {
    sense: "senseSystem", games: [
      { kind: "beCache", icon: "🗄️", name: "liveBeCache" },
      { kind: "beBalance", icon: "⚖️", name: "liveBeBalance" },
      { kind: "beRing", icon: "⭕", name: "liveBeRing" },
      { kind: "beLimit", icon: "🚦", name: "liveBeLimit" },
      { kind: "beQuorum", icon: "🗃️", name: "liveBeQuorum" },
      { kind: "beQueue", icon: "📨", name: "liveBeQueue" },
      { kind: "beComp", icon: "🧱", name: "liveBeComp" },
    ],
  },
];

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
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  // The panel's node that a live piece puts its settings in.
  const [slotNode, setSlotNode] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<Panel | null>(null);
  /** Where and when the last press on the board began, to tell a click on a live piece from a drag of it. */
  const press = useRef<{ x: number; y: number; t: number } | null>(null);
  panelRef.current = panel;
  // Whether the panel has changed its item since it opened: closing it then makes all of it one step to undo.
  const panelChanged = useRef(false);
  // A docked tool (practice) has its own place beside the board, so a dialog can open while it stays.
  const [dock, setDock] = useState<Dialog | null>(null);
  const open = (d: Dialog) => (TOOLS[d.kind].docked ? setDock(d) : setDialog(d));
  const [palette, setPalette] = useState(false);
  // The board's theme as last seen; "" until Excalidraw reports it.
  const theme = useRef("");
  const paletteOpener = useRef<HTMLElement | null>(null);
  const [selectedMath, setSelectedMath] = useState<ExcalidrawImageElement | undefined>();
  const excalidraw = useRef<ExcalidrawImperativeAPI | null>(null);
  // When the bar doesn't fit it drops the labels its icons already say (1), then every label (2), then tightens its
  // spacing and the title (3), then wraps onto a second row (4) rather than hide buttons past the edge.
  const [barRef, fit] = useCompact<HTMLElement>(4);
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
    // The panel goes when its item is no longer selected (a click elsewhere) or is gone.
    const open = panelRef.current;
    // Looked at again a moment later: a change that moves the selection and puts it back (duplicating) keeps it.
    const gone = (sel: AppState["selectedElementIds"], els: readonly ExcalidrawElement[]) => !sel[open!.id] || !els.some((e) => e.id === open!.id && !e.isDeleted);
    if (open && gone(appState.selectedElementIds, elements))
      window.setTimeout(() => {
        const ex = excalidraw.current;
        if (ex && panelRef.current?.id === open.id && gone(ex.getAppState().selectedElementIds, ex.getSceneElements())) closePanel();
      }, 0);
    // Track whether the current selection is an editable formula/graph.
    const ids = Object.keys(appState.selectedElementIds);
    const sel = ids.length === 1 ? elements.find((e) => e.id === ids[0]) : undefined;
    const math = mathOf(sel) ? (sel as ExcalidrawImageElement) : undefined;
    setSelectedMath((prev) => (prev?.id === math?.id && prev?.version === math?.version ? prev : math));

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
  const placeImage = (rendered: PlacedImage, math: MathData | undefined, editing?: ExcalidrawImageElement, at?: { x: number; y: number }, capture: CaptureUpdateActionType = CaptureUpdateAction.IMMEDIATELY) => {
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
      return;
    }

    // Start at the viewport center (or where asked), then slide down past anything it would cover.
    const { scrollX, scrollY, zoom, width, height } = ex.getAppState();
    const x = at?.x ?? width / 2 / zoom.value - scrollX - rendered.width / 2;
    const y = freeY(elements, x, at?.y ?? height / 2 / zoom.value - scrollY - rendered.height / 2, rendered.width, rendered.height);
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
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    ex.scrollToContent(withData, { animate: true });
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
      ex.scrollToContent(el, { animate: true });
    },
  };
  const addLive = (kind: LiveKind) => excalidraw.current && placeOnBoard(excalidraw.current, [liveElement(kind)]);

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
    const at = { id: el.id, anchor: screenBox(el), orig: el };
    const next: Panel | null = math ? { ...at, tool: math.kind, initial: math.data } : live ? { ...at, piece: live.live } : null;
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
    const open = panelRef.current;
    panelRef.current = null;
    setPanel(null);
    const ex = excalidraw.current;
    if (!open || !ex || !panelChanged.current) return;
    panelChanged.current = false;
    const now = ex.getSceneElementsIncludingDeleted();
    const last = now.find((e) => e.id === open.id);
    if (!last || last.isDeleted) return;
    const o = open.orig as ExcalidrawImageElement;
    const swap = (el: ExcalidrawElement, n: number) => now.map((e) => (e.id === open.id ? { ...el, version: last.version + n, versionNonce: Math.floor(Math.random() * 2 ** 31) } : e));
    ex.updateScene({ elements: swap({ ...last, fileId: o.fileId, customData: o.customData, width: o.width, height: o.height } as ExcalidrawElement, 1), captureUpdate: CaptureUpdateAction.NEVER });
    ex.updateScene({ elements: swap(last, 2), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }

  const openEditor = (el: ExcalidrawImageElement) => {
    const math = mathOf(el)!;
    open({ kind: math.kind, editing: el });
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
  // The course map opens a tool or a lab on a board: #/b/<id>/tool/<kind>[/<topic>] or #/b/<id>/live/<kind>. Once the
  // board has loaded it is opened, and the address goes back to the board's own (so a reload doesn't add another).
  useEffect(() => {
    const m = location.hash.match(/^#\/b\/[\w-]+\/(tool|live)\/(\w+)(?:\/(\w+))?$/);
    if (!excalidrawApi || !m) return;
    const [, what, kind, start] = m;
    const done = () => history.replaceState(null, "", `#/b/${id}`);
    if (what === "tool" && isToolKind(kind)) (open({ kind, start }), done());
    if (what !== "live" || !isLiveKind(kind)) return done();
    // The scene arrives a moment after the API: a piece placed before would be lost under it.
    let frame = 0;
    const place = () => (excalidrawApi.getAppState().isLoading ? (frame = requestAnimationFrame(place)) : (addLive(kind), done()));
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

  const openTool = dialog && TOOLS[dialog.kind];
  const dockTool = dock && TOOLS[dock.kind];
  /** Puts what a tool made on the board, or in place of the picture it was editing. */
  const insert = (d: Dialog, tool: Tool, data: unknown, image: Parameters<ToolDialogProps["onSubmit"]>[1], capture?: CaptureUpdateActionType) => {
    const placed: PlacedImage = tool.png
      ? { dataURL: image.dataURL!, mimeType: "image/png", width: image.width, height: image.height }
      : svgImage({ svg: themedSvg(image.svg!, theme.current), width: image.width, height: image.height });
    placeImage(placed, { kind: d.kind, data, w: image.width, h: image.height }, d.editing, undefined, capture);
  };
  const panelTool = panel?.tool ? TOOLS[panel.tool] : null;
  // Three's picture is a WebGL snapshot and practice is not a picture to change: they keep to their full editors.
  const panelLive = !!panelTool && !panelTool.png && panel?.tool !== "practice";
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
        {selectedMath && (
          <button className="btn" onClick={() => openEditor(selectedMath)}>
            <BarIcon name="edit" /> <span className="btn-label">{t[TOOLS[mathOf(selectedMath)!.kind].edit]}</span>
          </button>
        )}
        <button className="btn" onClick={openPalette} title={t.searchButton} aria-label={t.searchButton}><BarIcon name="search" /></button>
        <button className="btn" onClick={() => excalidraw.current?.toggleSidebar({ name: "default", tab: SHAPES_TAB })} title={t.shapes.title}>
          <BarIcon name="shapes" /> <span className="btn-label minor">{t.shapes.button}</span>
        </button>
        {MENUS.map((m) => (
          <ToolMenu key={m.label} icon={<BarIcon name={m.icon} />} label={t[m.label]} title={m.title && t[m.title]} items={[
            ...m.items.map((it) => ({
              icon: it.icon,
              label: t[it.label],
              onPick: () => open({ kind: it.kind, start: it.start }),
            })),
            ...(LIVE_IN_MENUS[m.label] ?? []).map((it) => ({ icon: it.icon, label: t.shapes.names[it.name], onPick: () => addLive(it.kind) })),
          ]} />
        ))}
        <ToolMenu icon={<BarIcon name="games" />} label={t.gamesMenu} items={GAME_MENU.flatMap((s) =>
          s.games.map((it) => ({ icon: it.icon, label: t.shapes.names[it.name], section: t[s.sense], onPick: () => addLive(it.kind) })),
        )} />
        <ShareBox id={id} token={board.shareToken ?? null} onChange={(shareToken) => setBoard({ ...board, shareToken })} />
        <LangSelect />
      </header>
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
          const el = itemAt(ex.getSceneElements(), (e.clientX - st.offsetLeft) / z - st.scrollX, (e.clientY - st.offsetTop) / z - st.scrollY, (x) => !!liveDataOf(x));
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
            // Once the piece takes pointer events, the click goes to the control under it.
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const target = document.elementFromPoint(cx, cy);
              if (target?.closest(".live")) target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window }));
            }));
          }, 0);
        }}
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
      </div>

      <Suspense fallback={null}>
        {openTool && dialog && (
          <openTool.Dialog
            key={dialog.editing?.id ?? dialog.kind}
            initial={dialog.editing && mathOf(dialog.editing)!.data}
            start={dialog.start}
            onClose={() => setDialog(null)}
            onSubmit={(data, image) => {
              insert(dialog, openTool, data, image);
              setDialog(null);
            }}
          />
        )}
      </Suspense>
      {panel?.piece && (
        <ItemPanel
          key={panel.id}
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
          key={panel.id}
          title={t[panelTool.edit]}
          anchor={panel.anchor}
          onClose={closePanel}
          actions={
            <button className="btn" onClick={() => {
              const el = elementById(panel.id);
              closePanel();
              if (el && mathOf(el)) openEditor(el as ExcalidrawImageElement);
            }}>{t.fullEditor}</button>
          }
        >
          {panelLive ? (
            <Suspense fallback={null}>
              <panelTool.Dialog
                initial={panel.initial}
                onClose={closePanel}
                onSubmit={(data, image) => {
                  const el = elementById(panel.id);
                  if (!el || !mathOf(el)) return;
                  panelChanged.current = true;
                  insert({ kind: panel.tool, editing: el as ExcalidrawImageElement }, panelTool, data, image, CaptureUpdateAction.NEVER);
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
