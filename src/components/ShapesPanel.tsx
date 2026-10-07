// The "Maths shapes" tab of the board's side panel: every ready-made piece from math/shapes.ts, by group, each shown
// as a thumbnail in the board's theme. A click adds the piece in the middle of the view; dragging drops it where the
// pointer is (handed over as a library item, which Excalidraw places itself). What lands on the board is ordinary
// elements in one group, so every line and label can still be moved, recoloured or retyped; a live piece lands as
// one element that answers clicks (see live/).
import { useEffect, useState } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToSvg,
  FONT_FAMILY,
  getCommonBounds,
  MIME_TYPES,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useI18n } from "../i18n";
import { SHAPE_GROUPS, SHAPES, type Piece, type ShapeDef, type ShapeWords } from "../math/shapes";
import { liveElement } from "../live/element";

export const SHAPES_TAB = "maths";
const INK = "#1e1e1e";
// Thumbnails by theme and language (a few pieces carry words), kept while the page is open: the panel unmounts each
// time it closes.
const thumbCache = new Map<string, Record<string, string>>();

/**
 * Where something w × h wide can go at x without covering anything: from y, slid down below whatever it would
 * overlap. Boxes come from Excalidraw, since a line's x and y are its first point, not its top-left corner.
 */
export function freeY(elements: readonly ExcalidrawElement[], x: number, y: number, w: number, h: number): number {
  const boxes = elements.filter((e) => !e.isDeleted).map((e) => getCommonBounds([e]));
  for (let moved = true; moved; ) {
    moved = false;
    for (const [x0, y0, x1, y1] of boxes) {
      if (x < x1 && x + w > x0 && y < y1 && y + h > y0) {
        y = y1 + 24;
        moved = true;
      }
    }
  }
  return y;
}

/** A piece's parts as Excalidraw elements, in one new group, with text placed by its anchor. */
export function toElements(pieces: Piece[]): NonDeleted<ExcalidrawElement>[] {
  const group = crypto.randomUUID();
  const anchors = new Map<string, Extract<Piece, { kind: "text" }>>();
  const common = (id: string) => ({ id, groupIds: [group], roughness: 0, opacity: 100 });
  const skeletons = pieces.map((p): ExcalidrawElementSkeleton => {
    const id = crypto.randomUUID();
    if (p.kind === "text") {
      anchors.set(id, p);
      return { ...common(id), type: "text", x: p.x, y: p.y, text: p.text, fontSize: p.size, fontFamily: FONT_FAMILY.Nunito, textAlign: p.align, strokeColor: p.color ?? INK };
    }
    const style = {
      strokeColor: p.color ?? INK,
      strokeWidth: p.width ?? 2,
      strokeStyle: p.dashed ? ("dashed" as const) : ("solid" as const),
      backgroundColor: p.fill ?? "transparent",
      fillStyle: "solid" as const,
    };
    if (p.kind === "ellipse") return { ...common(id), ...style, type: "ellipse", x: p.cx - p.rx, y: p.cy - p.ry, width: 2 * p.rx, height: 2 * p.ry };
    if (p.kind === "rect")
      return { ...common(id), ...style, type: "rectangle", x: p.x, y: p.y, width: p.w, height: p.h, roundness: p.round ? { type: 3 } : null };
    const [x, y] = p.points[0];
    const points = (p.closed ? [...p.points, p.points[0]] : p.points).map(([px, py]) => [px - x, py - y] as [number, number]);
    if (p.arrows)
      return { ...common(id), ...style, type: "arrow", x, y, points, startArrowhead: p.arrows === "both" ? "arrow" : null, endArrowhead: "arrow", roundness: null };
    return { ...common(id), ...style, type: "line", x, y, points, roundness: null };
  });
  const elements = convertToExcalidrawElements(skeletons, { regenerateIds: false });
  // Text is measured on the way in; move each label so its anchor sits where the piece asked.
  return elements.map((el) => {
    const a = anchors.get(el.id);
    if (!a) return el;
    const dx = a.align === "center" ? el.width / 2 : a.align === "right" ? el.width : 0;
    return { ...el, x: a.x - dx, y: a.y - el.height / 2 };
  });
}

/**
 * Adds new elements in the middle of the view, slid down past anything they would cover (as formulas and graphs
 * are), selects them and brings them into view.
 */
export function placeOnBoard(ex: ExcalidrawImperativeAPI, els: ExcalidrawElement[]) {
  const [x0, y0, x1, y1] = getCommonBounds(els);
  const [w, h] = [x1 - x0, y1 - y0];
  const { scrollX, scrollY, zoom, width, height, defaultSidebarDockedPreference } = ex.getAppState();
  const x = width / 2 / zoom.value - scrollX - w / 2;
  const scene = ex.getSceneElementsIncludingDeleted();
  const y = freeY(scene, x, height / 2 / zoom.value - scrollY - h / 2, w, h);
  const placed = els.map((el) => ({ ...el, x: el.x + x - x0, y: el.y + y - y0 }));
  const group = placed[0].groupIds[0];
  ex.updateScene({
    elements: [...scene, ...placed],
    appState: {
      selectedElementIds: Object.fromEntries(placed.map((el) => [el.id, true])),
      selectedGroupIds: group ? { [group]: true } : {},
      // Like Excalidraw's own library: the panel closes unless it's docked beside the board (1229 px is
      // Excalidraw's breakpoint for docking), so on a phone the new shape isn't hidden under it.
      openSidebar: defaultSidebarDockedPreference && width > 1229 ? ex.getAppState().openSidebar : null,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  ex.scrollToContent(placed, { animate: true });
}

function Tile({ shape, words, name, thumb, onInsert }: { shape: ShapeDef; words: ShapeWords; name: string; thumb?: string; onInsert: (s: ShapeDef) => void }) {
  return (
    <button
      className="shape-tile"
      title={name}
      draggable
      onClick={() => onInsert(shape)}
      onDragStart={(e) => {
        const item = { id: crypto.randomUUID(), status: "unpublished" as const, created: Date.now(), elements: shape.live ? [liveElement(shape.live)] : toElements(shape.build(words)) };
        e.dataTransfer.setData(MIME_TYPES.excalidrawlib, serializeLibraryAsJSON([item]));
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span className="shape-thumb" aria-hidden="true" dangerouslySetInnerHTML={thumb ? { __html: thumb } : undefined} />
      <span className="shape-name">{name}</span>
    </button>
  );
}

export function ShapesPanel({ api, theme }: { api: () => ExcalidrawImperativeAPI | null; theme: string }) {
  const { t, lang } = useI18n();
  const w = t.shapes;
  const words = w.words;
  const key = `${theme}:${lang}`;
  const [thumbs, setThumbs] = useState<{ key: string; svg: Record<string, string> }>(() => ({ key, svg: thumbCache.get(key) ?? {} }));

  useEffect(() => {
    let live = true;
    const cached = thumbCache.get(key);
    if (cached) {
      setThumbs({ key, svg: cached });
      return;
    }
    (async () => {
      // Labels are measured when the elements are made, so wait for the font they use.
      await document.fonts.load('16px "Nunito"').catch(() => undefined);
      const svg: Record<string, string> = {};
      for (const shape of SHAPES) {
        try {
          const el = await exportToSvg({
            elements: toElements(shape.build(words)),
            appState: { exportBackground: false, exportWithDarkMode: theme === "dark" },
            files: null,
            exportPadding: 4,
            skipInliningFonts: true,
          });
          svg[shape.id] = el.outerHTML;
        } catch {
          /* no thumbnail: the name still shows */
        }
        if (!live) return;
      }
      thumbCache.set(key, svg);
      setThumbs({ key, svg });
    })();
    return () => {
      live = false;
    };
    // The words and theme change only with the language and theme, which are part of the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const insert = (shape: ShapeDef) => {
    const ex = api();
    if (ex) placeOnBoard(ex, shape.live ? [liveElement(shape.live)] : toElements(shape.build(words)));
  };

  const svg = thumbs.key === key ? thumbs.svg : {};
  return (
    <div className="shapes-panel">
      <p className="hint">{w.hint}</p>
      {SHAPE_GROUPS.map((g) => (
        <section key={g}>
          <h3>{w.groups[g]}</h3>
          {g === "live" && <p className="hint">{w.liveHint}</p>}
          <div className="shape-grid">
            {SHAPES.filter((s) => s.group === g).map((s) => (
              <Tile key={s.id} shape={s} words={words} name={w.names[s.id as keyof typeof w.names]} thumb={svg[s.id]} onInsert={insert} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** The panel's tab icon: a set square and a circle. */
export const shapesIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21V5l14 16z" />
    <circle cx="17" cy="7" r="4" />
  </svg>
);
