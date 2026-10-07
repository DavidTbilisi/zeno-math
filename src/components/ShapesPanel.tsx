// The "Maths shapes" tab of the board's side panel: every ready-made piece from math/shapes.ts, by group, each shown
// as a thumbnail in the board's theme. A click adds the piece in the middle of the view; dragging drops it where the
// pointer is (handed over as a library item, which Excalidraw places itself). What lands on the board is ordinary
// elements in one group, so every line and label can still be moved, recoloured or retyped.
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
import { SHAPE_GROUPS, SHAPES, type Piece, type ShapeDef } from "../math/shapes";

export const SHAPES_TAB = "maths";
const INK = "#1e1e1e";
// Thumbnails by theme, kept while the page is open: the panel unmounts each time it closes.
const thumbCache = new Map<string, Record<string, string>>();

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

function Tile({ shape, name, thumb, onInsert }: { shape: ShapeDef; name: string; thumb?: string; onInsert: (s: ShapeDef) => void }) {
  return (
    <button
      className="shape-tile"
      title={name}
      draggable
      onClick={() => onInsert(shape)}
      onDragStart={(e) => {
        const item = { id: crypto.randomUUID(), status: "unpublished" as const, created: Date.now(), elements: toElements(shape.build()) };
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
  const { t } = useI18n();
  const w = t.shapes;
  const [thumbs, setThumbs] = useState<{ theme: string; svg: Record<string, string> }>(() => ({ theme, svg: thumbCache.get(theme) ?? {} }));

  useEffect(() => {
    let live = true;
    const cached = thumbCache.get(theme);
    if (cached) {
      setThumbs({ theme, svg: cached });
      return;
    }
    (async () => {
      // Labels are measured when the elements are made, so wait for the font they use.
      await document.fonts.load('16px "Nunito"').catch(() => undefined);
      const svg: Record<string, string> = {};
      for (const shape of SHAPES) {
        try {
          const el = await exportToSvg({
            elements: toElements(shape.build()),
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
      thumbCache.set(theme, svg);
      setThumbs({ theme, svg });
    })();
    return () => {
      live = false;
    };
  }, [theme]);

  const insert = (shape: ShapeDef) => {
    const ex = api();
    if (!ex) return;
    const els = toElements(shape.build());
    const [x0, y0, x1, y1] = getCommonBounds(els);
    const [w, h] = [x1 - x0, y1 - y0];
    const { scrollX, scrollY, zoom, width, height, defaultSidebarDockedPreference } = ex.getAppState();
    // Start in the middle of the view, then slide down past anything it would cover, as formulas and graphs do.
    const x = width / 2 / zoom.value - scrollX - w / 2;
    let y = height / 2 / zoom.value - scrollY - h / 2;
    const scene = ex.getSceneElementsIncludingDeleted();
    const live = scene.filter((e) => !e.isDeleted);
    for (let moved = true; moved; ) {
      moved = false;
      for (const e of live) {
        if (x < e.x + e.width && x + w > e.x && y < e.y + e.height && y + h > e.y) {
          y = e.y + e.height + 24;
          moved = true;
        }
      }
    }
    const placed = els.map((el) => ({ ...el, x: el.x + x - x0, y: el.y + y - y0 }));
    ex.updateScene({
      elements: [...scene, ...placed],
      appState: {
        selectedElementIds: Object.fromEntries(placed.map((el) => [el.id, true])),
        selectedGroupIds: { [placed[0].groupIds[0]]: true },
        // Like Excalidraw's own library: the panel closes unless it's docked beside the board (1229 px is
        // Excalidraw's breakpoint for docking), so on a phone the new shape isn't hidden under it.
        openSidebar: defaultSidebarDockedPreference && width > 1229 ? ex.getAppState().openSidebar : null,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    ex.scrollToContent(placed, { animate: true });
  };

  const svg = thumbs.theme === theme ? thumbs.svg : {};
  return (
    <div className="shapes-panel">
      <p className="hint">{w.hint}</p>
      {SHAPE_GROUPS.map((g) => (
        <section key={g}>
          <h3>{w.groups[g]}</h3>
          <div className="shape-grid">
            {SHAPES.filter((s) => s.group === g).map((s) => (
              <Tile key={s.id} shape={s} name={w.names[s.id as keyof typeof w.names]} thumb={svg[s.id]} onInsert={insert} />
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
