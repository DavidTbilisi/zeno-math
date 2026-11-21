// The board's paper (#453): squares, graph paper, dots, isometric dots and lines (for drawing solids), a coordinate
// plane, polar paper and ruled lines, drawn where Excalidraw would draw its grid, and the snapping that goes with them.
// Excalidraw asks `globalThis.__zenoPaper` (scripts/patch-excalidraw.mjs adds the questions): installPaper sets it.
//
// Everything is in scene units: one paper square is Excalidraw's grid size (20 by default), and on the coordinate plane
// and polar paper one square is one unit, with the origin at the scene's (0, 0). The paper is drawn in light colours;
// in dark mode Excalidraw inverts the whole canvas, the paper with it, as it does its own grid.

export const PAPERS = ["plain", "squares", "graph", "dots", "isoDots", "isoLines", "axes", "polar", "lined"] as const;
export type Paper = (typeof PAPERS)[number];
export const isPaper = (x: unknown): x is Paper => PAPERS.includes(x as Paper);
/** Papers with an origin worth seeing: picking one brings (0, 0) into view. */
export const hasOrigin = (p: Paper) => p === "axes" || p === "polar";

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type Tone = "minor" | "major" | "axis";
export type Line = { x1: number; y1: number; x2: number; y2: number; tone: Tone };
/** A dot, its radius in screen pixels. */
export type Dot = { x: number; y: number; r: number };
/** A circle around the origin. */
export type Ring = { r: number; tone: Tone };
/** A number or angle; dx, dy (screen pixels) move it off its point, and align/base say which side of it the text is. */
export type Label = { x: number; y: number; text: string; dx: number; dy: number; align: "left" | "center" | "right"; base: "top" | "middle" | "bottom" };
export type Marks = { lines: Line[]; dots: Dot[]; rings: Ring[]; labels: Label[] };

/** Lines or dots closer than this on screen are too dense: the next coarser step is drawn instead. */
const MIN_GAP = 8;
/** No paper draws more than about this many marks, whatever the zoom. */
const MAX_MARKS = 20000;
const ROOT3 = Math.sqrt(3);

const COLOURS: Record<Tone, string> = { minor: "#dfe4ee", major: "#bcc5d8", axis: "#56627f" };
const DOT = "#8f9bb8";
const TEXT = "#56627f";
const FONT = "system-ui, sans-serif";

/** The multiples of step from a to b. */
const multiples = (a: number, b: number, step: number) => {
  const out: number[] = [];
  for (let k = Math.ceil(a / step); k <= Math.floor(b / step); k++) out.push(k);
  return out;
};

/** The step a family of lines is drawn at: `size`, or 5, 25… times it until the lines are far enough apart. */
const stepFor = (size: number, zoom: number) => {
  let step = size;
  while (step * zoom < MIN_GAP) step *= 5;
  return step;
};

/** Square grid lines: minor every `size` (when far enough apart), major every `every` squares (0 = none). */
const squareLines = (box: Box, size: number, zoom: number, every: number, tone: Tone = "minor"): Line[] => {
  const lines: Line[] = [];
  const minor = size * zoom >= MIN_GAP;
  const major = every ? stepFor(size * every, zoom) : 0;
  const step = minor ? size : stepFor(size, zoom);
  for (const k of multiples(box.x0, box.x1, step)) {
    const x = k * step;
    const isMajor = major > 0 && Math.abs(x / major - Math.round(x / major)) < 1e-9;
    if (!isMajor && every && !minor) continue;
    lines.push({ x1: x, y1: box.y0, x2: x, y2: box.y1, tone: isMajor ? "major" : tone });
  }
  for (const k of multiples(box.y0, box.y1, step)) {
    const y = k * step;
    const isMajor = major > 0 && Math.abs(y / major - Math.round(y / major)) < 1e-9;
    if (!isMajor && every && !minor) continue;
    lines.push({ x1: box.x0, y1: y, x2: box.x1, y2: y, tone: isMajor ? "major" : tone });
  }
  return lines;
};

/** The points of the isometric (triangle) lattice with spacing `size` inside the box: columns √3/2·size apart, every
 *  other column half a square lower. */
const isoPoints = (box: Box, size: number) => {
  const h = (size * ROOT3) / 2;
  const out: [number, number][] = [];
  for (const i of multiples(box.x0, box.x1, h)) {
    for (let j = Math.ceil(box.y0 / size - i / 2); j <= Math.floor(box.y1 / size - i / 2); j++) out.push([i * h, (j + i / 2) * size]);
  }
  return out;
};

/** A step for labels: 1, 2, 5, 10, 20, 50… units, the first that leaves `gap` pixels between them. */
const labelStep = (size: number, zoom: number, gap = 36) => {
  for (let n = 1; ; n *= 10) for (const m of [1, 2, 5]) if (n * m * size * zoom >= gap) return n * m;
};

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Everything a paper draws inside a box of the scene, at a zoom (screen pixels per scene unit). */
export function paperMarks(paper: Paper, box: Box, size: number, zoom: number): Marks {
  const marks: Marks = { lines: [], dots: [], rings: [], labels: [] };
  const w = box.x1 - box.x0;
  const hgt = box.y1 - box.y0;
  switch (paper) {
    case "plain":
      break;
    case "squares":
      marks.lines = squareLines(box, size, zoom, 0);
      break;
    case "graph":
      marks.lines = squareLines(box, size, zoom, 5);
      break;
    case "lined": {
      const step = stepFor(size * 2, zoom);
      marks.lines = multiples(box.y0, box.y1, step).map((k) => ({ x1: box.x0, y1: k * step, x2: box.x1, y2: k * step, tone: "major" }));
      break;
    }
    case "dots": {
      let step = stepFor(size, zoom);
      while ((w / step) * (hgt / step) > MAX_MARKS) step *= 5;
      for (const i of multiples(box.x0, box.x1, step)) for (const j of multiples(box.y0, box.y1, step)) marks.dots.push({ x: i * step, y: j * step, r: 1.5 });
      break;
    }
    case "isoDots": {
      // 5 times the lattice is still on it, so a coarser zoom keeps every dot it shows in place.
      let step = stepFor(size, zoom);
      while ((w / step) * (hgt / step) * 1.2 > MAX_MARKS) step *= 5;
      marks.dots = isoPoints(box, step).map(([x, y]) => ({ x, y, r: 1.8 }));
      break;
    }
    case "isoLines": {
      const step = stepFor(size, zoom);
      const h = (step * ROOT3) / 2;
      for (const i of multiples(box.x0, box.x1, h)) marks.lines.push({ x1: i * h, y1: box.y0, x2: i * h, y2: box.y1, tone: "minor" });
      // Lines at +30° (y = x/√3 + k·step) and -30° (y = -x/√3 + k·step) through every lattice point.
      for (const k of multiples(box.y0 - box.x1 / ROOT3, box.y1 - box.x0 / ROOT3, step)) {
        marks.lines.push({ x1: box.x0, y1: box.x0 / ROOT3 + k * step, x2: box.x1, y2: box.x1 / ROOT3 + k * step, tone: "minor" });
      }
      for (const k of multiples(box.y0 + box.x0 / ROOT3, box.y1 + box.x1 / ROOT3, step)) {
        marks.lines.push({ x1: box.x0, y1: -box.x0 / ROOT3 + k * step, x2: box.x1, y2: -box.x1 / ROOT3 + k * step, tone: "minor" });
      }
      break;
    }
    case "axes": {
      marks.lines = squareLines(box, size, zoom, 5);
      if (box.x0 <= 0 && 0 <= box.x1) marks.lines.push({ x1: 0, y1: box.y0, x2: 0, y2: box.y1, tone: "axis" });
      if (box.y0 <= 0 && 0 <= box.y1) marks.lines.push({ x1: box.x0, y1: 0, x2: box.x1, y2: 0, tone: "axis" });
      // The numbers stay on screen when an axis is off it, along the nearest edge.
      const edge = 18 / zoom;
      const ay = clamp(0, box.y0 + edge * 0.2, box.y1 - edge);
      const ax = clamp(0, box.x0 + edge * 1.6, box.x1);
      const n = labelStep(size, zoom);
      for (const k of multiples(box.x0 / size, box.x1 / size, n)) {
        if (k !== 0) marks.labels.push({ x: k * n * size, y: ay, text: String(k * n), dx: 0, dy: 4, align: "center", base: "top" });
      }
      for (const k of multiples(box.y0 / size, box.y1 / size, n)) {
        if (k !== 0) marks.labels.push({ x: ax, y: k * n * size, text: String(-k * n), dx: -4, dy: 0, align: "right", base: "middle" });
      }
      if (ax === 0 && ay === 0) marks.labels.push({ x: 0, y: 0, text: "0", dx: -4, dy: 4, align: "right", base: "top" });
      break;
    }
    case "polar": {
      const far = Math.max(...[[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]].map(([x, y]) => Math.hypot(x, y)));
      const near = Math.hypot(clamp(0, box.x0, box.x1), clamp(0, box.y0, box.y1));
      const minor = size * zoom >= MIN_GAP;
      let step = minor ? size : stepFor(size, zoom);
      while ((far - near) / step > MAX_MARKS / 10) step *= 5;
      for (let k = Math.max(1, Math.ceil(near / step)); k * step <= far; k++) {
        const r = k * step;
        const major = Math.abs(r / (size * 5) - Math.round(r / (size * 5))) < 1e-9;
        marks.rings.push({ r, tone: major ? "major" : "minor" });
      }
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180;
        marks.lines.push({ x1: 0, y1: 0, x2: far * Math.cos(a), y2: -far * Math.sin(a), tone: deg % 90 === 0 ? "axis" : deg % 30 === 0 ? "major" : "minor" });
        const R = size * 10;
        const [lx, ly] = [R * Math.cos(a), -R * Math.sin(a)];
        if (deg % 30 === 0 && lx >= box.x0 && lx <= box.x1 && ly >= box.y0 && ly <= box.y1) {
          marks.labels.push({ x: lx, y: ly, text: `${deg}°`, dx: 4 * Math.cos(a), dy: -4 * Math.sin(a), align: "center", base: "middle" });
        }
      }
      break;
    }
  }
  return marks;
}

/** The nearest point of the isometric lattice (spacing `size`, a point at the origin). */
export function snapIso(x: number, y: number, size: number): [number, number] {
  const h = (size * ROOT3) / 2;
  const i0 = Math.round(x / h);
  let best: [number, number] = [0, 0];
  let d = Infinity;
  for (const i of [i0 - 1, i0, i0 + 1]) {
    const j = Math.round(y / size - i / 2);
    const p: [number, number] = [i * h, (j + i / 2) * size];
    const e = Math.hypot(p[0] - x, p[1] - y);
    if (e < d) [best, d] = [p, e];
  }
  return best;
}

/** The nearest point on a ring (a whole number of squares from the origin) and a ray (a multiple of 15°). */
export function snapPolar(x: number, y: number, size: number): [number, number] {
  const r = Math.round(Math.hypot(x, y) / size) * size;
  if (r === 0) return [0, 0];
  const step = Math.PI / 12;
  const a = Math.round(Math.atan2(-y, x) / step) * step;
  return [r * Math.cos(a), -r * Math.sin(a)];
}

/** Where Excalidraw should put a point with snapping on, or undefined for its own square grid. */
export const paperSnap = (paper: Paper): ((x: number, y: number, size: number) => [number, number]) | undefined =>
  paper === "isoDots" || paper === "isoLines" ? snapIso : paper === "polar" ? snapPolar : undefined;

/** Where a drawing dragged from (x, y) by (dx, dy) lands: on isometric paper it moves by whole lattice steps, so a
 *  solid drawn on the dots stays on them. Undefined: Excalidraw's own rule. */
export const paperMove = (paper: Paper) =>
  paper === "isoDots" || paper === "isoLines"
    ? (x: number, y: number, dx: number, dy: number, size: number): [number, number] => {
        const [sx, sy] = snapIso(dx, dy, size);
        return [x + sx, y + sy];
      }
    : undefined;

/** Draws the marks on a canvas whose context is already scaled by the zoom; (scrollX, scrollY) is where the scene's
 *  origin is, in the scaled units (as Excalidraw's own grid has it). */
export function paintMarks(ctx: CanvasRenderingContext2D, m: Marks, zoom: number, scrollX: number, scrollY: number) {
  ctx.save();
  ctx.translate(scrollX, scrollY);
  ctx.setLineDash([]);
  for (const tone of ["minor", "major", "axis"] as const) {
    const lines = m.lines.filter((l) => l.tone === tone);
    const rings = m.rings.filter((r) => r.tone === tone);
    if (!lines.length && !rings.length) continue;
    ctx.beginPath();
    for (const l of lines) {
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
    }
    for (const r of rings) {
      ctx.moveTo(r.r, 0);
      ctx.arc(0, 0, r.r, 0, 2 * Math.PI);
    }
    ctx.lineWidth = (tone === "axis" ? 1.5 : 1) / zoom;
    ctx.strokeStyle = COLOURS[tone];
    ctx.stroke();
  }
  if (m.dots.length) {
    ctx.beginPath();
    for (const d of m.dots) {
      ctx.moveTo(d.x + d.r / zoom, d.y);
      ctx.arc(d.x, d.y, d.r / zoom, 0, 2 * Math.PI);
    }
    ctx.fillStyle = DOT;
    ctx.fill();
  }
  if (m.labels.length) {
    ctx.font = `${11 / zoom}px ${FONT}`;
    ctx.fillStyle = TEXT;
    for (const l of m.labels) {
      ctx.textAlign = l.align;
      ctx.textBaseline = l.base;
      ctx.fillText(l.text, l.x + l.dx / zoom, l.y + l.dy / zoom);
    }
  }
  ctx.restore();
}

const SVG_NS = "http://www.w3.org/2000/svg";
const num = (v: number) => String(Math.round(v * 100) / 100);

/** Adds the marks to an SVG (an export at zoom 1), the scene's origin at (ox, oy). */
export function svgMarks(root: SVGSVGElement, m: Marks, ox: number, oy: number) {
  const doc = root.ownerDocument;
  const g = doc.createElementNS(SVG_NS, "g");
  g.setAttribute("transform", `translate(${num(ox)} ${num(oy)})`);
  g.setAttribute("fill", "none");
  for (const tone of ["minor", "major", "axis"] as const) {
    const d = m.lines.filter((l) => l.tone === tone).map((l) => `M${num(l.x1)} ${num(l.y1)}L${num(l.x2)} ${num(l.y2)}`).join("");
    if (d) {
      const p = doc.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("stroke", COLOURS[tone]);
      p.setAttribute("stroke-width", tone === "axis" ? "1.5" : "1");
      g.appendChild(p);
    }
    for (const r of m.rings.filter((x) => x.tone === tone)) {
      const c = doc.createElementNS(SVG_NS, "circle");
      c.setAttribute("r", num(r.r));
      c.setAttribute("stroke", COLOURS[tone]);
      g.appendChild(c);
    }
  }
  if (m.dots.length) {
    const p = doc.createElementNS(SVG_NS, "path");
    p.setAttribute("d", m.dots.map((d) => `M${num(d.x - d.r)} ${num(d.y)}a${d.r} ${d.r} 0 1 0 ${2 * d.r} 0a${d.r} ${d.r} 0 1 0 ${-2 * d.r} 0`).join(""));
    p.setAttribute("fill", DOT);
    g.appendChild(p);
  }
  for (const l of m.labels) {
    const t = doc.createElementNS(SVG_NS, "text");
    t.textContent = l.text;
    t.setAttribute("x", num(l.x + l.dx));
    t.setAttribute("y", num(l.y + l.dy));
    t.setAttribute("fill", TEXT);
    t.setAttribute("font-family", FONT);
    t.setAttribute("font-size", "11");
    t.setAttribute("text-anchor", l.align === "left" ? "start" : l.align === "right" ? "end" : "middle");
    t.setAttribute("dominant-baseline", l.base === "top" ? "hanging" : l.base === "bottom" ? "auto" : "central");
    g.appendChild(t);
  }
  root.appendChild(g);
}

/** The part of Excalidraw's app state the paper reads. */
type View = { scrollX: number; scrollY: number; zoom: { value: number }; gridSize?: number | null; viewBackgroundColor?: string | null };

type Hooks = {
  draw: (ctx: CanvasRenderingContext2D, st: View, renderGrid: boolean, isExporting: boolean, width: number, height: number) => boolean;
  svg: (root: SVGSVGElement, st: View, ox: number, oy: number, width: number, height: number) => void;
  snap?: (x: number, y: number, size: number) => [number, number];
  move?: (x: number, y: number, dx: number, dy: number, size: number) => [number, number];
};

declare global {
  var __zenoPaper: Hooks | undefined;
}

const sizeOf = (st: View) => st.gridSize || 20;

/** Puts a paper on the board (plain takes Excalidraw's own grid back). */
export function installPaper(paper: Paper) {
  if (paper === "plain") {
    globalThis.__zenoPaper = undefined;
    return;
  }
  globalThis.__zenoPaper = {
    draw: (ctx, st, _grid, isExporting, width, height) => {
      // An export without its background has no paper either.
      if (isExporting && !st.viewBackgroundColor) return false;
      const z = st.zoom.value;
      const box = { x0: -st.scrollX, y0: -st.scrollY, x1: -st.scrollX + width, y1: -st.scrollY + height };
      paintMarks(ctx, paperMarks(paper, box, sizeOf(st), z), z, st.scrollX, st.scrollY);
      return true;
    },
    svg: (root, st, ox, oy, width, height) => {
      svgMarks(root, paperMarks(paper, { x0: -ox, y0: -oy, x1: -ox + width, y1: -oy + height }, sizeOf(st), 1), ox, oy);
    },
    snap: paperSnap(paper),
    move: paperMove(paper),
  };
}
