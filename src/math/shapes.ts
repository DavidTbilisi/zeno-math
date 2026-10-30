// Ready-made maths pieces for the board's side panel: instruments (ruler, protractors, set squares, a clock), axes,
// number lines and grid paper, labelled figures, 3D solids with their hidden edges dashed and their nets, fraction and
// place-value pieces, algebra tiles, Venn diagrams and other templates for data and chance. A piece is a list of plain parts (paths, ellipses,
// rectangles, text) that the board turns into ordinary Excalidraw elements, grouped: what lands on the board is
// editable line by line, not a picture. Coordinates are in pixels with y pointing down; angles are in degrees,
// anticlockwise from the positive x-axis, as in maths. Labels are symbols and numbers, apart from the few words a
// piece can't do without (the probability scale's, the sides of a trigonometry triangle), which it is handed from
// the locales along with the names in the panel.

import type { LiveKind } from "./live";

export type Pt = readonly [number, number];
type Style = { color?: string; width?: number; dashed?: boolean; fill?: string };
export type Piece =
  | ({ kind: "path"; points: Pt[]; closed?: boolean; arrows?: "end" | "both" } & Style)
  | ({ kind: "ellipse"; cx: number; cy: number; rx: number; ry: number } & Style)
  | ({ kind: "rect"; x: number; y: number; w: number; h: number; round?: boolean } & Style)
  | { kind: "text"; x: number; y: number; text: string; size: number; align: "left" | "center" | "right"; color?: string };

export const SHAPE_GROUPS = ["games", "live", "measure", "graphs", "geometry", "solids", "number", "algebra", "stats"] as const;
export type ShapeGroup = (typeof SHAPE_GROUPS)[number];
/** The words some pieces write on themselves, in the board's language. */
export type ShapeWords = {
  impossible: string;
  unlikely: string;
  evens: string;
  likely: string;
  certain: string;
  opposite: string;
  adjacent: string;
  hypotenuse: string;
};
/** A piece; a live one (`live` set) goes on the board as a piece that responds to clicks, and `build` is its preview. */
export type ShapeDef = { id: string; group: ShapeGroup; build: (words: ShapeWords) => Piece[]; live?: LiveKind };

// Excalidraw's own palette, so the pieces match what the toolbar offers (and its dark mode turns them round).
const GRID = "#ced4da";
const MUTED = "#868e96";
const BLUE = "#1971c2";
const RED = "#e03131";
const FILL = { blue: "#a5d8ff", green: "#b2f2bb", yellow: "#ffec99", red: "#ffc9c9", violet: "#d0bfff", pink: "#eebefa", gray: "#e9ecef" };
const THIN = { width: 1 };
const HIDDEN = { width: 1, dashed: true };

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, deg: number): Pt => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
/** Points along an ellipse arc (a circle when rx = ry), from one angle to another, at most `step` degrees apart. */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, step = 5): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = rad(from + ((to - from) * i) / n);
    return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)] as Pt;
  });
}
const path = (points: Pt[], s: Style = {}): Piece => ({ kind: "path", points, ...s });
const seg = (a: Pt, b: Pt, s: Style = {}) => path([a, b], s);
const poly = (points: Pt[], s: Style = {}): Piece => ({ kind: "path", points, closed: true, ...s });
const arrow = (a: Pt, b: Pt, both = false, s: Style = {}): Piece => ({ kind: "path", points: [a, b], arrows: both ? "both" : "end", ...s });
const ellipse = (cx: number, cy: number, rx: number, ry = rx, s: Style = {}): Piece => ({ kind: "ellipse", cx, cy, rx, ry, ...s });
const rect = (x: number, y: number, w: number, h: number, s: Style = {}, round = false): Piece => ({ kind: "rect", x, y, w, h, round, ...s });
const dot = (p: Pt, r = 4) => ellipse(p[0], p[1], r, r, { fill: "#1e1e1e", width: 1 });
/** Text centred on (x, y), or with its left / right edge there; always centred vertically. */
const text = (x: number, y: number, t: string, size = 16, align: "left" | "center" | "right" = "center", color?: string): Piece =>
  ({ kind: "text", x, y, text: t, size, align, ...(color ? { color } : {}) });
const num = (n: number) => (n < 0 ? `−${-n}` : String(n));

type Vec = [number, number];
const sub = (a: Pt, b: Pt): Vec => [a[0] - b[0], a[1] - b[1]];
const unit = (v: Vec): Vec => {
  const l = Math.hypot(v[0], v[1]);
  return [v[0] / l, v[1] / l];
};
const along = (p: Pt, v: Vec, d: number): Pt => [p[0] + v[0] * d, p[1] + v[1] * d];
const midpoint = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** Equal-length marks: n short strokes across the middle of a side. */
function ticks(a: Pt, b: Pt, n: number): Piece[] {
  const u = unit(sub(b, a));
  const nrm: Vec = [-u[1], u[0]];
  return Array.from({ length: n }, (_, i) => {
    const c = along(midpoint(a, b), u, (i - (n - 1) / 2) * 6);
    return seg(along(c, nrm, -7), along(c, nrm, 7), THIN);
  });
}
/** Parallel marks: n arrowheads in the middle of a side, pointing from a to b. */
function chevrons(a: Pt, b: Pt, n: number): Piece[] {
  const u = unit(sub(b, a));
  const nrm: Vec = [-u[1], u[0]];
  return Array.from({ length: n }, (_, i) => {
    const tip = along(midpoint(a, b), u, (i - (n - 1) / 2) * 8 + 4);
    const back = along(tip, u, -8);
    return path([along(back, nrm, 6), tip, along(back, nrm, -6)], THIN);
  });
}
/** The little square of a right angle at `corner`, between the directions towards p and q. */
function rightAngle(corner: Pt, p: Pt, q: Pt, size = 14): Piece {
  const u = unit(sub(p, corner));
  const v = unit(sub(q, corner));
  return path([along(corner, u, size), along(along(corner, u, size), v, size), along(corner, v, size)], THIN);
}
/**
 * Many short strokes as one path: each tick goes out from its base point and back, and the path moves on along the
 * base line (which is drawn anyway), so a ruler's hundred ticks are one element, not a hundred.
 */
function comb(ticks: [Pt, Pt][], s: Style = THIN): Piece {
  return path(ticks.flatMap(([base, end]) => [base, end, base]), s);
}
/** A tick across a horizontal line at (x, y), reaching h either side, as two strokes out from the line for comb. */
const across = (x: number, y: number, h: number): [Pt, Pt][] => [[[x, y], [x, y - h]], [[x, y], [x, y + h]]];
/** Grid lines as two paths that snake back and forth; the turns run along the outer lines. */
function grid(x0: number, y0: number, cols: number, rows: number, cell: number, s: Style = { color: GRID, width: 1 }): Piece[] {
  const x1 = x0 + cols * cell;
  const y1 = y0 + rows * cell;
  const across = Array.from({ length: rows + 1 }, (_, j) => {
    const y = y0 + j * cell;
    return (j % 2 ? [[x1, y], [x0, y]] : [[x0, y], [x1, y]]) as Pt[];
  }).flat();
  const down = Array.from({ length: cols + 1 }, (_, i) => {
    const x = x0 + i * cell;
    return (i % 2 ? [[x, y1], [x, y0]] : [[x, y0], [x, y1]]) as Pt[];
  }).flat();
  return [path(across, s), path(down, s)];
}
/** The sector of a circle between two angles, as a closed shape that can be coloured in. */
const wedge = (cx: number, cy: number, r: number, from: number, to: number, fill?: string) =>
  poly([[cx, cy], ...arc(cx, cy, r, r, from, to, 3)], fill ? { fill } : {});

// ——— Measuring ———

function ruler(): Piece[] {
  const cm = 40;
  const len = 10;
  const marks: [Pt, Pt][] = Array.from({ length: len * 10 + 1 }, (_, mm) => {
    const x = 10 + (mm * cm) / 10;
    return [[x, 0], [x, mm % 10 === 0 ? 20 : mm % 5 === 0 ? 14 : 8]];
  });
  return [
    rect(0, 0, len * cm + 20, 64),
    comb(marks),
    ...Array.from({ length: len + 1 }, (_, c) => text(10 + c * cm, 32, String(c), 14)),
    text(len * cm + 10, 52, "cm", 12, "right"),
  ];
}

function protractor(): Piece[] {
  const [cx, cy, r] = [190, 190, 180];
  const marks: [Pt, Pt][] = Array.from({ length: 37 }, (_, i) => {
    const d = i * 5;
    return [polar(cx, cy, r, d), polar(cx, cy, r - (d % 10 ? 9 : 16), d)];
  });
  const label = (at: number, d: number, t: string, size: number, color?: string) => {
    const [x, y] = polar(cx, cy, at, d);
    return text(x, Math.min(y, cy - 9), t, size, "center", color);
  };
  return [
    poly(arc(cx, cy, r, r, 0, 180, 2)),
    comb(marks),
    path(arc(cx, cy, 60, 60, 0, 180, 4), THIN),
    // Outer scale from the right, inner scale from the left, as on a real protractor; 0 and 180 sit above the base.
    ...Array.from({ length: 19 }, (_, i) => label(r - 30, i * 10, String(i * 10), 11)),
    ...Array.from({ length: 19 }, (_, i) => label(r - 54, i * 10, String(180 - i * 10), 10, MUTED)),
    seg([cx, cy], [cx, cy - 14], THIN),
    dot([cx, cy], 3),
  ];
}

function setSquare45(): Piece[] {
  const a: Pt = [0, 0];
  const b: Pt = [0, 220];
  const c: Pt = [220, 220];
  return [poly([a, b, c]), rightAngle(b, a, c), text(20, 50, "45°", 14), text(165, 199, "45°", 14)];
}

function setSquare30(): Piece[] {
  const h = 300 * Math.tan(rad(30));
  const a: Pt = [0, 0];
  const b: Pt = [0, h];
  const c: Pt = [300, h];
  return [poly([a, b, c]), rightAngle(b, a, c), text(22, 42, "60°", 14), text(230, h - 18, "30°", 14)];
}

function protractor360(): Piece[] {
  const [c, r] = [190, 180];
  const marks: [Pt, Pt][] = Array.from({ length: 72 }, (_, i) => {
    const d = i * 5;
    return [polar(c, c, r, d), polar(c, c, r - (d % 10 ? 9 : 16), d)];
  });
  return [
    ellipse(c, c, r),
    comb(marks),
    ellipse(c, c, 60, 60, THIN),
    seg([c - 60, c], [c + 60, c], THIN),
    seg([c, c - 60], [c, c + 60], THIN),
    // Anticlockwise outside, clockwise inside, both from the right, like the half protractor.
    ...Array.from({ length: 36 }, (_, i) => text(...polar(c, c, r - 30, i * 10), String(i * 10), 11)),
    ...Array.from({ length: 36 }, (_, i) => text(...polar(c, c, r - 52, i * 10), String((360 - i * 10) % 360), 10, "center", MUTED)),
    dot([c, c], 3),
  ];
}

function clock(): Piece[] {
  const [c, r] = [130, 120];
  // Clockwise from twelve: minute m sits at 90 − 6m degrees.
  const marks: [Pt, Pt][] = Array.from({ length: 60 }, (_, m) => [polar(c, c, r, 90 - 6 * m), polar(c, c, r - (m % 5 ? 6 : 14), 90 - 6 * m)]);
  return [
    ellipse(c, c, r),
    comb(marks),
    ...Array.from({ length: 12 }, (_, i) => text(...polar(c, c, r - 32, 90 - 30 * (i + 1)), String(i + 1), 20)),
    // Ten past ten: the hands apart and both easy to take hold of.
    seg([c, c], polar(c, c, 60, 90 - 30 * (10 + 10 / 60)), { width: 5 }),
    seg([c, c], polar(c, c, 92, 90 - 6 * 10), { width: 3 }),
    dot([c, c], 5),
  ];
}

// ——— Axes and number lines ———

function axes(): Piece[] {
  const [u, n] = [30, 5];
  const o: Pt = [u * (n + 1), u * (n + 1)];
  const end = (n + 0.8) * u;
  const out: Piece[] = [...grid(o[0] - n * u, o[1] - n * u, 2 * n, 2 * n, u)];
  out.push(arrow([o[0] - end, o[1]], [o[0] + end, o[1]]), arrow([o[0], o[1] + end], [o[0], o[1] - end]));
  for (let i = -n; i <= n; i++) {
    if (!i) continue;
    out.push(text(o[0] + i * u, o[1] + 13, num(i), 12), text(o[0] - 7, o[1] - i * u, num(i), 12, "right"));
  }
  out.push(text(o[0] - 7, o[1] + 13, "0", 12, "right"), text(o[0] + end + 6, o[1], "x", 18, "left"), text(o[0] + 9, o[1] - end, "y", 18, "left"));
  return out;
}

function axesQ1(): Piece[] {
  const [u, n] = [24, 10];
  const o: Pt = [36, 24 + n * u];
  const end = (n + 0.8) * u;
  const out: Piece[] = [...grid(o[0], o[1] - n * u, n, n, u)];
  out.push(arrow(o, [o[0] + end, o[1]]), arrow(o, [o[0], o[1] - end]));
  for (let i = 1; i <= n; i++) out.push(text(o[0] + i * u, o[1] + 13, String(i), 12), text(o[0] - 7, o[1] - i * u, String(i), 12, "right"));
  out.push(text(o[0] - 7, o[1] + 13, "0", 12, "right"), text(o[0] + end + 6, o[1], "x", 18, "left"), text(o[0] + 9, o[1] - end, "y", 18, "left"));
  return out;
}

function axesSketch(): Piece[] {
  const o: Pt = [160, 150];
  return [
    arrow([0, o[1]], [320, o[1]]),
    arrow([o[0], 290], [o[0], 0]),
    text(326, o[1], "x", 18, "left"),
    text(o[0] + 9, 6, "y", 18, "left"),
    text(o[0] - 8, o[1] + 14, "O", 14, "right"),
  ];
}

function numberLine(): Piece[] {
  const [u, n, y] = [40, 5, 20];
  const xs = Array.from({ length: 2 * n + 1 }, (_, i) => 20 + i * u);
  return [
    arrow([0, y], [40 + 2 * n * u, y], true),
    comb(xs.flatMap((x) => across(x, y, 8)), { width: 2 }),
    ...xs.map((x, i) => text(x, y + 24, num(i - n), 16)),
  ];
}

function numberLine01(): Piece[] {
  const [x0, len, y] = [20, 400, 24];
  const labels = ["0", "1/4", "1/2", "3/4", "1"];
  return [
    seg([x0, y], [x0 + len, y]),
    comb(labels.flatMap((_, i) => across(x0 + (i * len) / 4, y, i % 4 ? 8 : 14)), { width: 2 }),
    ...labels.map((l, i) => text(x0 + (i * len) / 4, y + 30, l, 16)),
  ];
}

function unitCircle(): Piece[] {
  const [c, r, theta] = [170, 130, 40];
  const p = polar(c, c, r, theta);
  return [
    arrow([10, c], [330, c]),
    arrow([c, 330], [c, 10]),
    ellipse(c, c, r),
    seg([c, c], p, { color: BLUE, width: 2 }),
    seg(p, [p[0], c], { ...HIDDEN, color: BLUE }),
    path(arc(c, c, 30, 30, 0, theta, 4), { color: RED, width: 2 }),
    text(...polar(c, c, 46, theta / 2), "θ", 16, "center", RED),
    dot(p),
    text(p[0] + 8, p[1] - 14, "(cos θ, sin θ)", 14, "left"),
    text(c + r + 8, c + 13, "1", 13),
    text(c - r - 10, c + 13, "−1", 13),
    text(c - 8, c - r - 10, "1", 13, "right"),
    text(c - 8, c + r + 12, "−1", 13, "right"),
    text(336, c, "x", 18, "left"),
    text(c + 9, 6, "y", 18, "left"),
  ];
}

const gridPaper = (): Piece[] => grid(0, 0, 16, 12, 25);

function isometricDots(): Piece[] {
  // Columns of dots with every other one shifted half a step, so the dots make triangles with vertical sides.
  const s = 28;
  const dx = s * Math.cos(rad(30));
  const ink = { fill: MUTED, color: MUTED, width: 1 };
  const out: Piece[] = [];
  for (let i = 0; i < 16; i++) for (let j = 0; j < 11 - (i % 2); j++) out.push(ellipse(i * dx, j * s + ((i % 2) * s) / 2, 2.5, 2.5, ink));
  return out;
}

function axes3d(): Piece[] {
  const o: Pt = [150, 190];
  const x = polar(o[0], o[1], 170, 220);
  return [
    arrow(o, x),
    arrow(o, [380, o[1]]),
    arrow(o, [o[0], 10]),
    seg(o, polar(o[0], o[1], 60, 40), HIDDEN),
    seg(o, [o[0] - 60, o[1]], HIDDEN),
    seg(o, [o[0], o[1] + 60], HIDDEN),
    text(x[0] - 8, x[1] + 4, "x", 18, "right"),
    text(386, o[1], "y", 18, "left"),
    text(o[0] + 9, 10, "z", 18, "left"),
    text(o[0] + 8, o[1] + 14, "O", 14, "left"),
  ];
}

// ——— Plane figures ———

function angle(): Piece[] {
  const v: Pt = [20, 200];
  const theta = 50;
  return [
    path([[300, 200], v, polar(v[0], v[1], 260, theta)]),
    path(arc(v[0], v[1], 48, 48, 0, theta, 4), { color: RED, width: 2 }),
    text(...polar(v[0], v[1], 68, theta / 2), "θ", 18, "center", RED),
  ];
}

function rightTriangle(): Piece[] {
  const a: Pt = [20, 20];
  const b: Pt = [20, 200];
  const c: Pt = [260, 200];
  return [poly([a, b, c]), rightAngle(b, a, c, 16), text(6, 110, "a", 18, "right"), text(140, 218, "b", 18), text(152, 96, "c", 18)];
}

function triangle(): Piece[] {
  const A: Pt = [20, 200];
  const B: Pt = [300, 200];
  const C: Pt = [110, 30];
  return [
    poly([A, B, C]),
    text(10, 208, "A", 18, "right"),
    text(310, 208, "B", 18, "left"),
    text(110, 14, "C", 18),
    text(217, 102, "a", 18),
    text(50, 106, "b", 18),
    text(160, 218, "c", 18),
  ];
}

function parallel(): Piece[] {
  const t = (y: number): Pt => [80 + (200 * (280 - y)) / 280, y];
  const lean = (Math.atan2(280, 200) * 180) / Math.PI;
  const out: Piece[] = [seg([0, 80], [360, 80]), seg([0, 200], [360, 200]), seg([80, 280], [280, 0])];
  out.push(...chevrons([20, 80], [100, 80], 1), ...chevrons([20, 200], [100, 200], 1));
  for (const y of [80, 200]) out.push(path(arc(t(y)[0], y, 24, 24, 0, lean, 4), { color: RED, width: 2 }));
  return out;
}

function trigTriangle(w: ShapeWords): Piece[] {
  const A: Pt = [20, 220];
  const B: Pt = [320, 220];
  const C: Pt = [320, 40];
  const theta = (Math.atan2(A[1] - C[1], C[0] - A[0]) * 180) / Math.PI;
  return [
    poly([A, B, C]),
    rightAngle(B, A, C, 16),
    path(arc(A[0], A[1], 50, 50, 0, theta, 3), { color: RED, width: 2 }),
    text(...polar(A[0], A[1], 70, theta / 2), "θ", 18, "center", RED),
    text(170, 242, w.adjacent, 16),
    text(334, 130, w.opposite, 16, "left"),
    // Ending near C, so the label runs up-left, away from the slope.
    text(208, 88, w.hypotenuse, 16, "right"),
  ];
}

function transversalAngles(): Piece[] {
  const phi = 60;
  const [y1, y2] = [100, 240];
  const xAt = (y: number) => 200 + (y1 - y) / Math.tan(rad(phi));
  const out: Piece[] = [seg([0, y1], [380, y1]), seg([0, y2], [380, y2]), seg([xAt(340), 340], [xAt(0), 0])];
  out.push(...chevrons([20, y1], [100, y1], 1), ...chevrons([20, y2], [100, y2], 1));
  // a b / c d round the top crossing and e f / g h round the bottom one, each in the middle of its angle.
  const middles = [(phi + 180) / 2, phi / 2, 180 + phi / 2, (540 + phi) / 2];
  [y1, y2].forEach((y, k) => middles.forEach((m, i) => out.push(text(...polar(xAt(y), y, 30, m), "abcdefgh"[4 * k + i], 16, "center", RED))));
  return out;
}

function circleParts(): Piece[] {
  const [c, r] = [150, 120];
  const p = polar(c, c, r, 40);
  return [
    ellipse(c, c, r),
    seg([c - r, c], [c + r, c], { color: BLUE, width: 2 }),
    seg([c, c], p, { color: RED, width: 2 }),
    dot([c, c]),
    text(c - 8, c + 14, "O", 16, "right"),
    text(c - 60, c + 14, "d", 18, "center", BLUE),
    text(187, 100, "r", 18, "center", RED),
  ];
}

const regular = (n: number, start: number) => (): Piece[] => [poly(Array.from({ length: n }, (_, i) => polar(110, 110, 100, start + (360 * i) / n)))];

function parallelogram(): Piece[] {
  const p: Pt[] = [[60, 0], [300, 0], [240, 140], [0, 140]];
  return [poly(p), ...chevrons(p[0], p[1], 1), ...chevrons(p[3], p[2], 1), ...chevrons(p[3], p[0], 2), ...chevrons(p[2], p[1], 2)];
}

function trapezium(): Piece[] {
  const p: Pt[] = [[70, 0], [230, 0], [300, 140], [0, 140]];
  return [poly(p), ...chevrons(p[0], p[1], 1), ...chevrons(p[3], p[2], 1)];
}

function kite(): Piece[] {
  const p: Pt[] = [[120, 0], [200, 80], [120, 260], [40, 80]];
  return [poly(p), ...ticks(p[0], p[1], 1), ...ticks(p[3], p[0], 1), ...ticks(p[1], p[2], 2), ...ticks(p[2], p[3], 2)];
}

function rhombus(): Piece[] {
  const p: Pt[] = [[120, 0], [220, 90], [120, 180], [20, 90]];
  return [poly(p), ...p.flatMap((q, i) => ticks(q, p[(i + 1) % 4], 1))];
}

// ——— 3D solids (oblique views, hidden edges dashed) ———

function box(w: number, h: number, dx: number, dy: number): Piece[] {
  // Front face at the bottom left, the back face shifted by (dx, -dy).
  const f = (x: number, y: number): Pt => [x, dy + y];
  const b = (x: number, y: number): Pt => [dx + x, y];
  return [
    poly([f(0, 0), f(w, 0), f(w, h), f(0, h)]),
    path([f(0, 0), b(0, 0), b(w, 0), b(w, h), f(w, h)]),
    seg(f(w, 0), b(w, 0)),
    path([f(0, h), b(0, h), b(w, h)], HIDDEN),
    seg(b(0, 0), b(0, h), HIDDEN),
  ];
}

function cylinder(): Piece[] {
  const [cx, rx, ry, top, h] = [100, 80, 24, 24, 200];
  return [
    ellipse(cx, top, rx, ry),
    seg([cx - rx, top], [cx - rx, top + h]),
    seg([cx + rx, top], [cx + rx, top + h]),
    path(arc(cx, top + h, rx, ry, 180, 360)),
    path(arc(cx, top + h, rx, ry, 0, 180), HIDDEN),
    seg([cx, top], [cx + rx, top], HIDDEN),
    dot([cx, top], 3),
    text(cx + rx / 2, top - 11, "r", 16),
    text(cx + rx + 12, top + h / 2, "h", 16, "left"),
  ];
}

function cone(): Piece[] {
  const [cx, rx, ry, base] = [100, 90, 26, 220];
  return [
    path([[cx - rx, base], [cx, 0], [cx + rx, base]]),
    path(arc(cx, base, rx, ry, 180, 360)),
    path(arc(cx, base, rx, ry, 0, 180), HIDDEN),
    seg([cx, 0], [cx, base], HIDDEN),
    seg([cx, base], [cx + rx, base], HIDDEN),
    rightAngle([cx, base], [cx, 0], [cx + rx, base], 10),
    text(cx - 8, base / 2 + 10, "h", 16, "right"),
    text(cx + rx / 2, base + 12, "r", 16),
  ];
}

function sphere(): Piece[] {
  const [c, r] = [110, 100];
  return [
    ellipse(c, c, r),
    path(arc(c, c, r, 26, 180, 360)),
    path(arc(c, c, r, 26, 0, 180), HIDDEN),
    seg([c, c], [c + r, c], HIDDEN),
    dot([c, c], 3),
    text(c + r / 2, c - 12, "r", 16),
  ];
}

function pyramid(): Piece[] {
  const fl: Pt = [0, 200];
  const fr: Pt = [180, 200];
  const br: Pt = [240, 150];
  const bl: Pt = [60, 150];
  const apex: Pt = [120, 0];
  const foot = midpoint(fl, br);
  return [
    path([fl, fr, br]),
    path([fl, apex, br]),
    seg(apex, fr),
    path([fl, bl, br], HIDDEN),
    seg(apex, bl, HIDDEN),
    seg(apex, foot, HIDDEN),
    text(foot[0] + 8, 95, "h", 16, "left"),
  ];
}

function prism(): Piece[] {
  const f: Pt[] = [[0, 180], [160, 180], [80, 40]];
  const b = f.map(([x, y]) => [x + 150, y - 40] as Pt);
  return [
    poly(f),
    path([f[2], b[2], b[1], f[1]]),
    path([f[0], b[0], b[1]], HIDDEN),
    seg(b[0], b[2], HIDDEN),
  ];
}

// Nets: every face its own outline, so each can be coloured, labelled or moved away on its own.
const FACE = { fill: FILL.blue };

function netCube(): Piece[] {
  const s = 60;
  const at: Pt[] = [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]];
  return at.map(([i, j]) => rect(i * s, j * s, s, s, FACE));
}

function netCuboid(): Piece[] {
  const [l, w, h] = [120, 60, 80];
  return [
    rect(0, w, w, h, FACE),
    rect(w, w, l, h, FACE),
    rect(w + l, w, w, h, FACE),
    rect(2 * w + l, w, l, h, FACE),
    rect(w, 0, l, w, FACE),
    rect(w, w + h, l, w, FACE),
  ];
}

function netPrism(): Piece[] {
  const [a, len] = [90, 160];
  const t = a * Math.sin(rad(60));
  return [
    ...[0, 1, 2].map((i) => rect(i * a, t, a, len, FACE)),
    poly([[a, t], [2 * a, t], [1.5 * a, 0]], FACE),
    poly([[a, t + len], [2 * a, t + len], [1.5 * a, 2 * t + len]], FACE),
  ];
}

function netPyramid(): Piece[] {
  const [s, t] = [110, 95];
  const [x0, x1] = [t, t + s];
  return [
    rect(x0, x0, s, s, FACE),
    poly([[x0, x0], [x1, x0], [x0 + s / 2, 0]], FACE),
    poly([[x1, x0], [x1, x1], [x1 + t, x0 + s / 2]], FACE),
    poly([[x0, x1], [x1, x1], [x0 + s / 2, x1 + t]], FACE),
    poly([[x0, x0], [x0, x1], [0, x0 + s / 2]], FACE),
  ];
}

function netCylinder(): Piece[] {
  const [r, h] = [40, 120];
  const w = 2 * Math.PI * r;
  return [
    rect(0, 2 * r, w, h, FACE),
    ellipse(w / 2, r, r, r, FACE),
    ellipse(w / 2, 3 * r + h, r, r, FACE),
    seg([w / 2, r], [w / 2 + r, r], THIN),
    dot([w / 2, r], 3),
    text(w / 2 + r / 2, r - 11, "r", 16),
    text(w / 2, 2 * r + h - 16, "2πr", 16),
    text(-8, 2 * r + h / 2, "h", 16, "right"),
  ];
}

// ——— Number ———

function fractionWall(): Piece[] {
  const [w, h] = [420, 40];
  const fills = [FILL.red, FILL.yellow, FILL.green, FILL.blue, FILL.violet, FILL.pink];
  return fills.flatMap((fill, row) => {
    const n = row + 1;
    return Array.from({ length: n }, (_, i): Piece[] => [
      rect((i * w) / n, row * h, w / n, h, { fill, width: 1 }),
      text(((i + 0.5) * w) / n, row * h + h / 2, n === 1 ? "1" : `1/${n}`, 16),
    ]).flat();
  });
}

const fractionCircle = (n: number) => (): Piece[] => Array.from({ length: n }, (_, i) => wedge(110, 110, 100, 90 - (360 * i) / n, 90 - (360 * (i + 1)) / n));

function tenFrame(): Piece[] {
  return Array.from({ length: 10 }, (_, i) => rect((i % 5) * 56, Math.floor(i / 5) * 56, 56, 56));
}

function hundredSquare(): Piece[] {
  const s = 36;
  return Array.from({ length: 100 }, (_, i): Piece[] => {
    const [x, y] = [(i % 10) * s, Math.floor(i / 10) * s];
    return [rect(x, y, s, s, THIN), text(x + s / 2, y + s / 2, String(i + 1), 14)];
  }).flat();
}

const BLOCK = 20;
function hundredFlat(): Piece[] {
  return [rect(0, 0, 10 * BLOCK, 10 * BLOCK, { fill: FILL.blue }), ...grid(0, 0, 10, 10, BLOCK, { color: BLUE, width: 1 })];
}
function tenRod(): Piece[] {
  return [rect(0, 0, BLOCK, 10 * BLOCK, { fill: FILL.green }), ...grid(0, 0, 1, 10, BLOCK, { color: "#2f9e44", width: 1 })];
}
const oneCube = (): Piece[] => [rect(0, 0, BLOCK, BLOCK, { fill: FILL.yellow })];

function placeValue(): Piece[] {
  // Headed by the place values themselves, so the chart reads the same in every language; the heavy line is the
  // decimal point (a point or a comma, as the class writes it).
  const [w, top, h] = [62, 40, 56];
  const heads = ["1000", "100", "10", "1", "1/10", "1/100"];
  return [
    ...heads.flatMap((t, i) => [rect(i * w, 0, w, top, { fill: FILL.gray, width: 1 }), text(i * w + w / 2, top / 2, t, 16), rect(i * w, top, w, h, THIN), rect(i * w, top + h, w, h, THIN)]),
    seg([4 * w, 0], [4 * w, top + 2 * h], { width: 4 }),
  ];
}

function barModel(): Piece[] {
  const [w, h] = [360, 48];
  return [rect(0, 0, w, h, { fill: FILL.blue }), text(w / 2, h / 2, "?", 20), ...[0, 1, 2].map((i) => rect((i * w) / 3, h + 16, w / 3, h, { fill: FILL.yellow }))];
}

function partWhole(): Piece[] {
  const r = 44;
  const whole: Pt = [150, r];
  const parts: Pt[] = [[60, 190], [240, 190]];
  return [
    ...parts.map((p) => {
      const u = unit(sub(p, whole));
      return seg(along(whole, u, r), along(p, u, -r));
    }),
    ellipse(whole[0], whole[1], r, r, { fill: FILL.blue }),
    ...parts.map(([x, y]) => ellipse(x, y, r, r, { fill: FILL.yellow })),
  ];
}

/** A table with a shaded heading row and column numbered 1 to n, the corner marked, and the cells filled or left blank. */
function headedTable(n: number, s: number, corner: string, cell?: (i: number, j: number) => string): Piece[] {
  const out: Piece[] = [
    rect(0, 0, (n + 1) * s, s, { fill: FILL.gray, width: 1 }),
    rect(0, s, s, n * s, { fill: FILL.gray, width: 1 }),
    ...grid(0, 0, n + 1, n + 1, s, THIN),
    text(s / 2, s / 2, corner, 18),
  ];
  for (let i = 1; i <= n; i++) {
    out.push(text(i * s + s / 2, s / 2, String(i), 15), text(s / 2, i * s + s / 2, String(i), 15));
    if (cell) for (let j = 1; j <= n; j++) out.push(text(j * s + s / 2, i * s + s / 2, cell(i, j), 13));
  }
  return out;
}

const multiplicationSquare = () => headedTable(10, 34, "×", (i, j) => String(i * j));

// ——— Algebra ———

// x and y are deliberately not whole numbers of units, nor of each other, so the tiles can't be measured against
// each other. A negative tile is its positive's size in red, so the two make a zero pair.
const X = 90;
const Y = 65;
const ONE = 25;
const tile = (w: number, h: number, fill: string, label: string, size: number) => (): Piece[] => [rect(0, 0, w, h, { fill }), text(w / 2, h / 2, label, size)];

function balance(): Piece[] {
  const pan = (cx: number): Piece[] => [
    path([[cx, 40], [cx - 40, 140]], THIN),
    path([[cx, 40], [cx + 40, 140]], THIN),
    path([[cx - 50, 140], [cx - 38, 156], [cx + 38, 156], [cx + 50, 140]], { fill: FILL.gray }),
  ];
  return [
    seg([40, 40], [360, 40], { width: 4 }),
    poly([[200, 28], [188, 46], [212, 46]], { fill: "#1e1e1e" }),
    seg([200, 46], [200, 250], { width: 4 }),
    poly([[150, 270], [250, 270], [200, 250]], { fill: FILL.gray }),
    ...pan(60),
    ...pan(340),
  ];
}

function functionMachine(): Piece[] {
  return [
    arrow([0, 60], [86, 60]),
    rect(96, 20, 140, 80, { width: 2 }, true),
    text(166, 60, "f", 24),
    arrow([246, 60], [332, 60]),
    text(43, 42, "x", 18),
    text(289, 42, "f(x)", 18),
  ];
}

// ——— Data and chance ———

function venn2(): Piece[] {
  return [
    rect(0, 0, 380, 230),
    ellipse(130, 120, 90),
    ellipse(250, 120, 90),
    text(12, 16, "U", 16, "left"),
    text(52, 38, "A", 18),
    text(328, 38, "B", 18),
  ];
}

function venn3(): Piece[] {
  return [
    rect(0, 0, 370, 300),
    ellipse(150, 115, 82),
    ellipse(220, 115, 82),
    ellipse(185, 175, 82),
    text(12, 16, "U", 16, "left"),
    text(52, 40, "A", 18),
    text(318, 40, "B", 18),
    text(185, 280, "C", 18),
  ];
}

function tree(): Piece[] {
  const root: Pt = [0, 130];
  const first: [Pt, string][] = [[[150, 60], "A"], [[150, 200], "A′"]];
  return first.flatMap(([end, label]): Piece[] => {
    const start: Pt = [end[0] + 36, end[1]];
    return [
      seg(root, end),
      text(end[0] + 18, end[1], label, 16),
      seg(start, [330, end[1] - 40]),
      seg(start, [330, end[1] + 40]),
      text(348, end[1] - 40, "B", 16),
      text(348, end[1] + 40, "B′", 16),
    ];
  });
}

function twoWay(): Piece[] {
  const [w, h] = [96, 42];
  return Array.from({ length: 16 }, (_, i) => {
    const [r, c] = [Math.floor(i / 4), i % 4];
    return rect(c * w, r * h, w, h, r === 0 || c === 0 ? { fill: FILL.gray, width: 1 } : THIN);
  });
}

function boxPlot(): Piece[] {
  const [u, x0, y] = [30, 20, 140];
  const x = (v: number) => x0 + v * u;
  return [
    seg([x(0), y], [x(10), y], THIN),
    comb(Array.from({ length: 11 }, (_, v) => [[x(v), y], [x(v), y + 6]] as [Pt, Pt])),
    ...Array.from({ length: 11 }, (_, v) => text(x(v), y + 18, String(v), 12)),
    rect(x(3), 40, x(7) - x(3), 60, { fill: FILL.blue }),
    seg([x(5), 40], [x(5), 100], { width: 3 }),
    seg([x(1), 70], [x(3), 70]),
    seg([x(7), 70], [x(9), 70]),
    seg([x(1), 58], [x(1), 82]),
    seg([x(9), 58], [x(9), 82]),
  ];
}

function spinner(): Piece[] {
  const [c, r] = [110, 100];
  const fills = [FILL.red, FILL.yellow, FILL.green, FILL.blue];
  return [
    ...fills.map((f, i) => wedge(c, c, r, 90 * i, 90 * (i + 1), f)),
    arrow([c, c], polar(c, c, 72, 60), false, { width: 3 }),
    dot([c, c], 6),
  ];
}

function dice(): Piece[] {
  const [s, gap] = [64, 14];
  const at: Record<string, Pt> = { tl: [0.25, 0.25], tr: [0.75, 0.25], ml: [0.25, 0.5], c: [0.5, 0.5], mr: [0.75, 0.5], bl: [0.25, 0.75], br: [0.75, 0.75] };
  const faces = [["c"], ["tl", "br"], ["tl", "c", "br"], ["tl", "tr", "bl", "br"], ["tl", "tr", "c", "bl", "br"], ["tl", "tr", "ml", "mr", "bl", "br"]];
  return faces.flatMap((pips, i): Piece[] => {
    const [x, y] = [(i % 3) * (s + gap), Math.floor(i / 3) * (s + gap)];
    return [rect(x, y, s, s, {}, true), ...pips.map((p) => dot([x + at[p][0] * s, y + at[p][1] * s], 6))];
  });
}

function probabilityScale(w: ShapeWords): Piece[] {
  const [x0, len, y] = [40, 440, 60];
  const x = (p: number) => x0 + p * len;
  return [
    seg([x(0), y], [x(1), y], { width: 3 }),
    comb([0, 0.25, 0.5, 0.75, 1].flatMap((p, i) => across(x(p), y, i % 2 ? 8 : 14)), { width: 2 }),
    // Numbers below at 0, ½ and 1, words above them; the in-between words go below, clear of the numbers.
    text(x(0), y + 30, "0", 16),
    text(x(0.5), y + 30, "1/2", 16),
    text(x(1), y + 30, "1", 16),
    text(x(0), y - 32, w.impossible, 14),
    text(x(0.5), y - 32, w.evens, 14),
    text(x(1), y - 32, w.certain, 14),
    text(x(0.25), y + 30, w.unlikely, 14),
    text(x(0.75), y + 30, w.likely, 14),
  ];
}

const sampleSpace = () => headedTable(6, 44, "+");

// ——— Previews of the live pieces ———

function diePreview(): Piece[] {
  const s = 80;
  const face = (x: number, pips: Pt[]): Piece[] => [rect(x, 0, s, s, {}, true), ...pips.map(([px, py]) => dot([x + px * s, py * s], 7))];
  return [...face(0, [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]]), ...face(110, [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]])];
}

const coinPreview = (): Piece[] => [ellipse(70, 70, 66, 66, { fill: FILL.yellow }), ellipse(70, 70, 54, 54, THIN), text(70, 70, "1", 44)];

const fractionsPreview = (): Piece[] => fractionCircle(4)().map((p, i) => (i === 0 && p.kind === "path" ? { ...p, fill: FILL.blue } : p));

function tenFramePreview(): Piece[] {
  const cells = [1, 1, 1, 2, 2, 0, 0, 0, 0, 0];
  return [...tenFrame(), ...cells.flatMap((c, i) => (c ? [ellipse((i % 5) * 56 + 28, Math.floor(i / 5) * 56 + 28, 20, 20, { fill: c === 1 ? FILL.red : FILL.yellow })] : []))];
}

function hundredPreview(): Piece[] {
  const s = 24;
  const marked = Array.from({ length: 33 }, (_, i) => 3 * (i + 1) - 1);
  return [...marked.map((i) => rect((i % 10) * s, Math.floor(i / 10) * s, s, s, { fill: FILL.yellow, width: 1, color: "transparent" })), ...grid(0, 0, 10, 10, s, THIN)];
}

function dotsPreview(): Piece[] {
  const s = 56;
  return [0, 1].flatMap((row) => Array.from({ length: 5 }, (_, i): Piece[] => {
    const filled = i < (row ? 1 : 3);
    return [rect(i * (s + 4), row * (s + 16), s, s, THIN), ...(filled ? [ellipse(i * (s + 4) + s / 2, row * (s + 16) + s / 2, 18, 18, { fill: "#40c057", color: "#2f9e44" })] : [])];
  }).flat());
}

function graphPreview(): Piece[] {
  const o: Pt = [150, 150];
  const parabola = Array.from({ length: 41 }, (_, i): Pt => {
    const x = -2 + i / 10;
    return [o[0] + x * 50, o[1] - (x * x - 1) * 40];
  }).filter(([, y]) => y >= 0);
  return [
    arrow([10, o[1]], [290, o[1]]),
    arrow([o[0], 200], [o[0], 0]),
    path(parabola, { color: BLUE, width: 3 }),
    seg([20, 230], [280, 230], { width: 3, color: MUTED }),
    ellipse(190, 230, 10, 10, { fill: BLUE, color: BLUE }),
    text(6, 230, "a", 18, "right"),
  ];
}

function chancePreview(): Piece[] {
  const heights = [52, 66, 58, 70, 49, 61];
  return [
    seg([0, 120], [300, 120], THIN),
    ...heights.map((h, i) => rect(14 + i * 48, 120 - h, 34, h, { fill: FILL.blue, width: 1 })),
    seg([0, 60], [300, 60], { color: RED, dashed: true, width: 2 }),
    ...heights.map((_, i) => text(31 + i * 48, 136, String(i + 1), 14)),
  ];
}

function shadeFracPreview(): Piece[] {
  // A 3 × 4 grid with nine squares shaded: 3/4 of 12.
  const out: Piece[] = [];
  for (let k = 0; k < 12; k++) out.push(rect((k % 4) * 30, Math.floor(k / 4) * 30, 30, 30, { fill: k < 9 ? FILL.blue : "#ffffff", width: 1.5 }));
  return [...out, text(160, 50, "3/4", 22)];
}

function balancePreview(): Piece[] {
  // A level beam on a stand, three squares and a 2 on one pan, 14 on the other.
  const pan = (x: number) => [seg([x, 20], [x - 36, 90], THIN), seg([x, 20], [x + 36, 90], THIN), seg([x - 42, 90], [x + 42, 90], { width: 3 })];
  return [
    poly([[130, 130], [170, 130], [153, 20], [147, 20]], { fill: FILL.gray, width: 1 }),
    seg([60, 20], [240, 20], { width: 4 }),
    ...pan(60),
    ...pan(240),
    ...[0, 1, 2].map((i) => rect(30 + i * 22, 70, 18, 18, { fill: FILL.blue, width: 1.5 })),
    rect(36, 50, 22, 18, { fill: FILL.gray, width: 1.5 }),
    text(47, 59, "2", 13),
    rect(224, 70, 32, 18, { fill: FILL.gray, width: 1.5 }),
    text(240, 79, "14", 13),
  ];
}

function machinePreview(): Piece[] {
  // 3 going into a machine with a hidden rule, and 11 coming out.
  return [
    rect(0, 30, 50, 36, { fill: FILL.yellow, width: 1.5 }, true),
    text(25, 48, "3", 20),
    arrow([56, 48], [86, 48]),
    rect(92, 14, 90, 68, { fill: FILL.blue, width: 2 }, true),
    text(137, 48, "⚙ ?", 24),
    arrow([188, 48], [218, 48]),
    rect(224, 30, 50, 36, { fill: FILL.blue, width: 1.5 }, true),
    text(249, 48, "11", 20),
  ];
}

function growingPreview(): Piece[] {
  // Figures 1, 2 and 3 of an L that grows by two squares each time.
  const out: Piece[] = [];
  let x = 0;
  for (const n of [1, 2, 3]) {
    const cells: Pt[] = [[0, 0], ...Array.from({ length: n }, (_, i): Pt => [0, i + 1]), ...Array.from({ length: n }, (_, i): Pt => [i + 1, 0])];
    for (const [cx, cy] of cells) out.push(rect(x + cx * 18, 80 - cy * 18, 18, 18, { fill: cx === 0 && cy === 0 ? FILL.yellow : FILL.blue, width: 1.5 }));
    x += (n + 1) * 18 + 30;
  }
  return out;
}

function exprMatchPreview(): Piece[] {
  // Two cards that say the same: 2(x + 3) and 2x + 6.
  const card = (x: number, t: string, fill: string) => [rect(x, 0, 110, 56, { fill, width: 1.5 }, true), text(x + 55, 28, t, 20)];
  return [...card(0, "2(x + 3)", FILL.green), ...card(126, "2x + 6", FILL.green)];
}

function angleGuessPreview(): Piece[] {
  // An angle of about 55° with its arc, and a guess beside it dashed.
  const o: Pt = [20, 130];
  return [
    path(arc(o[0], o[1], 40, 40, 0, 55), { color: "#2f9e44", width: 2.5 }),
    seg(o, polar(o[0], o[1], 190, 65), { color: BLUE, width: 2, dashed: true }),
    seg(o, [210, 130], { width: 4 }),
    seg(o, polar(o[0], o[1], 190, 55), { width: 4 }),
    text(110, 112, "?°", 22, "center", "#2f9e44"),
  ];
}

function angleHuntPreview(): Piece[] {
  // A straight line with an arm from its middle: 130° given, the angle beside it marked ?.
  const o: Pt = [130, 110];
  return [
    path(arc(o[0], o[1], 30, 30, 0, 50), { color: "#e8590c", width: 2.5 }),
    path(arc(o[0], o[1], 40, 40, 50, 180), { width: 2 }),
    seg([0, 110], [260, 110], { width: 4 }),
    seg(o, polar(o[0], o[1], 120, 50), { width: 4 }),
    text(196, 86, "?", 22, "center", "#e8590c"),
    text(110, 66, "130°", 18),
  ];
}

function mirrorPreview(): Piece[] {
  // A kite with its one mirror line dashed down the middle, and a diagonal that only halves it.
  return [
    poly([[100, 0], [160, 60], [100, 170], [40, 60]], { fill: FILL.blue, color: BLUE, width: 3 }),
    seg([100, -15], [100, 185], { color: RED, width: 2.5, dashed: true }),
    seg([20, 60], [180, 60], { color: MUTED, width: 1.5, dashed: true }),
  ];
}

function cubeNetPreview(): Piece[] {
  // A cross of six squares, its opposite faces coloured alike.
  const s = 40;
  const cells: [number, number, string][] = [[1, 0, FILL.red], [0, 1, FILL.green], [1, 1, FILL.blue], [2, 1, FILL.green], [1, 2, FILL.red], [1, 3, FILL.blue]];
  return cells.map(([x, y, fill]) => rect(x * s, y * s, s, s, { fill, width: 2 }));
}

function plotPointPreview(): Piece[] {
  // Axes on a grid, and a point with dashed lines leading to it from them.
  const s = 22;
  const lines: Piece[] = [];
  for (let k = 0; k <= 7; k++) lines.push(seg([k * s, 0], [k * s, 7 * s], { color: "#dee2e6", width: 1 }), seg([0, k * s], [7 * s, k * s], { color: "#dee2e6", width: 1 }));
  const p: Pt = [5 * s, 2 * s];
  return [
    ...lines,
    seg([0, 7 * s], [7 * s + 10, 7 * s], { width: 2 }),
    seg([0, 7 * s], [0, -10], { width: 2 }),
    seg([p[0], 7 * s], p, { color: "#2f9e44", width: 2, dashed: true }),
    seg([0, p[1]], p, { color: "#2f9e44", width: 2, dashed: true }),
    ellipse(p[0], p[1], 6, 6, { fill: "#2f9e44", color: "#2f9e44", width: 1 }),
    text(p[0] + 30, p[1] - 22, "(5, 5)", 15, "center", "#2f9e44"),
  ];
}

function barChartPreview(): Piece[] {
  // Four bars against a scale, the last one still being raised to its dashed mark.
  const hs = [5, 8, 3, 6];
  const out: Piece[] = [seg([0, 0], [0, 150], { width: 2 }), seg([0, 150], [190, 150], { width: 2 })];
  hs.forEach((h, k) => out.push(rect(14 + k * 44, 150 - h * 15, 30, h * 15, { fill: k === 3 ? FILL.yellow : FILL.blue, color: k === 3 ? "#e8590c" : BLUE, width: 2 })));
  out.push(seg([8 + 3 * 44, 150 - 8 * 15], [50 + 3 * 44, 150 - 8 * 15], { color: "#2f9e44", width: 2.5, dashed: true }));
  return out;
}

function graphStoryPreview(): Piece[] {
  // Distance from home against time: away, a stop, then back home.
  return [
    seg([0, 0], [0, 120], { width: 2 }),
    seg([0, 120], [220, 120], { width: 2 }),
    path([[0, 120], [70, 40], [130, 40], [200, 120]], { color: BLUE, width: 4 }),
    text(-12, 10, "d", 16, "center"),
    text(214, 140, "t", 16, "center"),
  ];
}

function slopeLinePreview(): Piece[] {
  // A line through two points, with the step between them: 2 along, 2 up.
  const s = 24;
  return [
    seg([0, 150], [150, 0], { color: BLUE, width: 3 }),
    path([[2 * s, 150 - 2 * s], [4 * s, 150 - 2 * s], [4 * s, 150 - 4 * s]], { color: "#2f9e44", width: 2, dashed: true }),
    dot([2 * s, 150 - 2 * s], 5),
    dot([4 * s, 150 - 4 * s], 5),
    text(3 * s, 150 - 2 * s + 18, "2", 15, "center", "#2f9e44"),
    text(4 * s + 14, 150 - 3 * s + 5, "2", 15, "center", "#2f9e44"),
  ];
}

function descentLabPreview(): Piece[] {
  // A valley, the ball's hops down one side of it, and a flag at the bottom.
  const at = (x: number): Pt => [x, 140 - 130 * ((x - 100) / 100) ** 2];
  const hop = (a: number, b: number): Piece => path([at(a), [(a + b) / 2, Math.min(at(a)[1], at(b)[1]) - 22], at(b)], { color: "#e8590c", width: 2, dashed: true });
  return [
    path(Array.from({ length: 21 }, (_, i) => at(i * 10)), { color: BLUE, width: 3 }),
    hop(8, 50),
    hop(50, 80),
    seg(at(100), [100, 108], { color: "#2f9e44", width: 2 }),
    path([[100, 108], [114, 113], [100, 118]], { color: "#2f9e44", width: 2 }),
    dot(at(8), 4),
    dot(at(50), 4),
    dot(at(80), 7),
  ];
}

function pcaLabPreview(): Piece[] {
  // A cloud stretched along a line, the line through it, and each point's distance from the line.
  const along: [number, number][] = [[-80, 12], [-55, -16], [-30, 8], [-8, 18], [12, -12], [35, 14], [58, -10], [82, 6]];
  const [c, s] = [Math.cos(-0.5), Math.sin(-0.5)];
  const at = (a: number, b: number): Pt => [100 + a * c - b * s, 80 + a * s + b * c];
  return [
    seg(at(-100, 0), at(100, 0), { color: BLUE, width: 3 }),
    ...along.map(([a, b]) => seg(at(a, b), at(a, 0), { color: "#e03131", width: 2 })),
    ...along.map(([a, b]) => dot(at(a, b), 4)),
  ];
}

function fitLabPreview(): Piece[] {
  // Points along a wave, and a wiggly curve forced through every one of them.
  const pts: Pt[] = [[0, 98], [22, 52], [44, 30], [66, 44], [88, 86], [110, 118], [132, 136], [154, 112], [176, 80], [198, 62]];
  const wiggle: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [[x0, y0], [x1, y1]] = [pts[i], pts[i + 1]];
    wiggle.push([x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + (i % 2 ? -22 : 22)]);
  }
  wiggle.push(pts[pts.length - 1]);
  return [path(wiggle, { color: BLUE, width: 3 }), ...pts.map((p) => dot(p, 4))];
}

function batchLabPreview(): Piece[] {
  // Nested loss contours, and a path that zigzags in towards their middle as batches pull it this way and that.
  const rings: Piece[] = [80, 56, 32].map((r, i) => path(Array.from({ length: 41 }, (_, k): Pt => [110 + r * 1.3 * Math.cos((k / 40) * 2 * Math.PI), 70 + r * 0.7 * Math.sin((k / 40) * 2 * Math.PI)]), { color: i === 2 ? "#adb5bd" : "#ced4da", width: 2 }));
  const zig: Pt[] = [[8, 130], [40, 96], [36, 118], [70, 84], [62, 98], [92, 76], [100, 86], [112, 70]];
  return [...rings, path(zig, { color: "#e8590c", width: 3 }), dot([112, 70], 6)];
}

function rocLabPreview(): Piece[] {
  // A ROC curve bowing up towards the top left over the dashed diagonal, with the threshold's point on it.
  const roc: Pt[] = [[0, 140], [6, 80], [20, 46], [46, 24], [90, 10], [140, 0]];
  return [path([[0, 140], [140, 0]], { color: "#adb5bd", width: 2, dashed: true }), path(roc, { color: "#1971c2", width: 3 }), ellipse(20, 46, 6, 6, { fill: "#e03131", color: "#e03131", width: 1 })];
}

function knnLabPreview(): Piece[] {
  // Orange and blue points, and a new point with a line to each of its three nearest inside a dashed circle.
  const orange: Pt[] = [[118, 44], [128, 92], [150, 60], [176, 30], [170, 100]];
  const blue: Pt[] = [[30, 110], [56, 132], [40, 70], [74, 120], [20, 30]];
  const q: Pt = [100, 76];
  const near: Pt[] = [[118, 44], [128, 92], [74, 120]];
  return [
    ellipse(q[0], q[1], 52, 52, { color: "#e8590c", width: 2, dashed: true }),
    ...near.map((p) => seg(q, p, { color: "#868e96", width: 2 })),
    ...orange.map(([x, y]) => ellipse(x, y, 7, 7, { fill: "#e8590c", color: "#e8590c", width: 1 })),
    ...blue.map(([x, y]) => ellipse(x, y, 7, 7, { color: "#1971c2", width: 2.5 })),
    ellipse(q[0], q[1], 10, 10, { fill: "#e8590c", color: "#1e1e1e", width: 3 }),
  ];
}

function treeLabPreview(): Piece[] {
  // A square cut into boxes by a vertical cut and one horizontal cut on its right, the top right box orange.
  return [
    rect(126, 20, 74, 60, { fill: "#ffd8a8", color: "#ffd8a8", width: 1 }),
    rect(20, 20, 180, 120, { color: "#1e1e1e", width: 2 }),
    seg([126, 20], [126, 140], { color: "#1e1e1e", width: 3 }),
    seg([126, 80], [200, 80], { color: "#1e1e1e", width: 3 }),
    ...([[150, 40], [180, 60], [170, 34]] as Pt[]).map(([x, y]) => ellipse(x, y, 6, 6, { fill: "#e8590c", color: "#e8590c", width: 1 })),
    ...([[50, 50], [80, 110], [100, 40], [160, 110], [184, 124], [60, 90]] as Pt[]).map(([x, y]) => ellipse(x, y, 6, 6, { color: "#1971c2", width: 2.5 })),
  ];
}

function kmeansLabPreview(): Piece[] {
  // Three groups of dots in three colours, each around its centre drawn as a ringed cross.
  const groups: [Pt, string][] = [[[50, 44], "#1971c2"], [[150, 40], "#e8590c"], [[100, 116], "#2f9e44"]];
  const around: Pt[] = [[-20, -8], [14, -16], [18, 12], [-12, 18], [-24, 10], [4, 22]];
  return groups.flatMap(([[cx, cy], c]): Piece[] => [
    ...around.map(([dx, dy]) => ellipse(cx + dx, cy + dy, 5, 5, { fill: c, color: c, width: 1 })),
    ellipse(cx, cy, 11, 11, { color: c, width: 3 }),
    seg([cx - 6, cy - 6], [cx + 6, cy + 6], { color: "#1e1e1e", width: 3 }),
    seg([cx - 6, cy + 6], [cx + 6, cy - 6], { color: "#1e1e1e", width: 3 }),
  ]);
}

function nnLabPreview(): Piece[] {
  // A small network: two inputs, three hidden units and one output, every layer joined to the next.
  const ins: Pt[] = [[30, 50], [30, 110]];
  const hid: Pt[] = [[100, 30], [100, 80], [100, 130]];
  const out: Pt = [170, 80];
  return [
    ...ins.flatMap((a) => hid.map((b) => seg(a, b, { color: "#adb5bd", width: 2 }))),
    ...hid.map((b) => seg(b, out, { color: "#adb5bd", width: 2 })),
    ...ins.map(([x, y]) => ellipse(x, y, 12, 12, { fill: "#ffffff", color: "#1e1e1e", width: 2.5 })),
    ...hid.map(([x, y]) => ellipse(x, y, 12, 12, { fill: "#d0ebff", color: "#1971c2", width: 2.5 })),
    ellipse(out[0], out[1], 13, 13, { fill: "#ffe8cc", color: "#e8590c", width: 2.5 }),
  ];
}

function convLabPreview(): Piece[] {
  // A grid of pixels with a 3 × 3 window framed on it, and an arrow to one cell of a smaller output grid.
  return [
    ...grid(0, 20, 5, 5, 24, { color: "#adb5bd", width: 1 }),
    rect(24, 44, 72, 72, { color: "#e03131", width: 3 }),
    rect(48, 68, 24, 24, { fill: "#1e1e1e", color: "#1e1e1e", width: 1 }),
    arrow([130, 80], [150, 80], false, { color: "#868e96", width: 2.5 }),
    ...grid(156, 44, 3, 3, 16, { color: "#adb5bd", width: 1 }),
    rect(156, 44, 16, 16, { fill: "#ffc078", color: "#e03131", width: 2.5 }),
  ];
}

function attnLabPreview(): Piece[] {
  // A query arrow among three key arrows, the nearest drawn thick, and three weight bars beside them.
  const o: Pt = [70, 100];
  return [
    arrow(o, [130, 40], false, { color: "#1e1e1e", width: 5 }),
    arrow(o, [20, 50], false, { color: "#adb5bd", width: 2 }),
    arrow(o, [40, 150], false, { color: "#adb5bd", width: 2 }),
    arrow(o, [140, 60], false, { color: "#e03131", width: 3 }),
    ...[60, 14, 8].map((h, i): Piece => path([[156 + i * 16, 140], [156 + i * 16, 140 - h]], { color: "#1971c2", width: 10 })),
  ];
}

function rnnLabPreview(): Piece[] {
  // A chain of four state circles, each passing an arrow to the next, with an input arrow into each from below.
  return [0, 1, 2, 3].flatMap((i): Piece[] => {
    const x = 26 + i * 50;
    return [
      ellipse(x, 70, 15, 15, { fill: ["#e8590c", "#f08c4b", "#f5ad7f", "#fad1b5"][i], color: "#1e1e1e", width: 2 }),
      arrow([x, 130], [x, 90], false, { color: "#868e96", width: 2 }),
      ...(i < 3 ? [arrow([x + 17, 70], [x + 33, 70], false, { color: "#868e96", width: 2.5 })] : []),
    ];
  });
}

function rlLabPreview(): Piece[] {
  // A 4 × 3 grid world: a goal in the corner, a wall, and arrows leading from the start to the goal.
  return [
    ...grid(0, 10, 4, 3, 46, { color: "#adb5bd", width: 1 }),
    rect(138, 10, 46, 46, { fill: "#b2f2bb", color: "#2f9e44", width: 2 }),
    rect(46, 56, 46, 46, { fill: "#495057", color: "#495057", width: 1 }),
    ellipse(23, 125, 8, 8, { fill: "#1971c2", color: "#1971c2", width: 1 }),
    arrow([23, 112], [23, 44], false, { color: "#1971c2", width: 3 }),
    arrow([30, 33], [128, 33], false, { color: "#1971c2", width: 3 }),
  ];
}

function softmaxLabPreview(): Piece[] {
  // Three score bars, an arrow, and the three probabilities they make.
  const colours = ["#1971c2", "#e8590c", "#2f9e44"];
  const bar = (x: number, h: number, c: string): Piece => path([[x, 140], [x, 140 - h]], { color: c, width: 14 });
  return [
    seg([0, 140], [76, 140], { color: "#868e96", width: 1 }),
    ...[60, 30, -20].map((h, i) => bar(14 + i * 24, h, colours[i])),
    path([[86, 100], [110, 100]], { color: "#868e96", width: 2 }),
    path([[104, 94], [110, 100], [104, 106]], { color: "#868e96", width: 2 }),
    seg([120, 140], [196, 140], { color: "#868e96", width: 1 }),
    ...[100, 36, 14].map((h, i) => bar(134 + i * 24, h, colours[i])),
  ];
}

function embedLabPreview(): Piece[] {
  // Word arrows from one origin, two close together with the angle between them, one far off.
  const o: Pt = [40, 140];
  const tip = (x: number, y: number, c: string): Piece[] => {
    const d = Math.hypot(x - o[0], y - o[1]);
    const [ux, uy] = [(x - o[0]) / d, (y - o[1]) / d];
    return [seg(o, [x, y], { color: c, width: 3 }), path([[x - 10 * ux - 5 * uy, y - 10 * uy + 5 * ux], [x, y], [x - 10 * ux + 5 * uy, y - 10 * uy - 5 * ux]], { color: c, width: 3 })];
  };
  return [
    ...tip(190, 70, BLUE),
    ...tip(170, 30, "#e8590c"),
    ...tip(30, 10, "#495057"),
    path([[80, 121], [84, 113], [86, 104]], { color: "#9c36b5", width: 2 }),
    dot(o, 3),
  ];
}

function backpropLabPreview(): Piece[] {
  // Two inputs into a gate, the gate into the output, and a gradient arrow coming back under them.
  const PURPLE = "#9c36b5";
  return [
    seg([22, 50], [86, 76], { color: MUTED, width: 2 }),
    seg([22, 110], [86, 84], { color: MUTED, width: 2 }),
    seg([114, 80], [168, 80], { color: MUTED, width: 2 }),
    ellipse(14, 50, 10, 10, { fill: "#ffffff", width: 2 }),
    ellipse(14, 110, 10, 10, { fill: "#ffffff", width: 2 }),
    ellipse(100, 80, 15, 15, { fill: "#ffffff", width: 2 }),
    ellipse(180, 80, 12, 12, { fill: "#ffffff", width: 2 }),
    text(100, 85, "×", 18, "center"),
    path([[180, 120], [100, 140], [20, 140]], { color: PURPLE, width: 3 }),
    path([[32, 132], [20, 140], [32, 148]], { color: PURPLE, width: 3 }),
  ];
}

function tensorLabPreview(): Piece[] {
  // Two slices of a tensor, one entry picked out, and under them its place in the strip of memory.
  const cells: Piece[] = [];
  for (const [x0, fill] of [[0, FILL.blue], [100, FILL.green]] as const)
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) cells.push(rect(x0 + c * 26, r * 26, 26, 26, { fill: x0 + c * 26 === 126 && r === 1 ? "#ff922b" : fill, width: 1.5 }));
  for (let p = 0; p < 12; p++) cells.push(rect(p * 15, 110, 15, 15, { fill: p === 10 ? "#ff922b" : p < 6 ? FILL.blue : FILL.green, width: 1 }));
  return [...cells, path([[139, 52], [157, 108]], { color: "#d9480f", width: 2 })];
}

/** A small graph for the graph games' previews: five vertices of a house shape, and its edges. */
const HOUSE: Pt[] = [[90, 0], [10, 60], [170, 60], [10, 150], [170, 150]];
const HOUSE_EDGES: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [1, 4], [2, 3]];

function oneStrokePreview(): Piece[] {
  // The house drawn in one stroke: most of its edges done in blue, the rest still grey.
  return [
    ...HOUSE_EDGES.map(([a, b], i) => seg(HOUSE[a], HOUSE[b], i < 5 ? { color: BLUE, width: 5 } : { color: MUTED, width: 2 })),
    ...HOUSE.map((p) => ellipse(p[0], p[1], 9, 9, { fill: "#ffffff", width: 2 })),
  ];
}

function colourMapPreview(): Piece[] {
  // The house's vertices in three colours, no edge joining two alike.
  const fills = [FILL.yellow, FILL.red, FILL.blue, FILL.blue, FILL.red];
  return [...HOUSE_EDGES.slice(0, 6).map(([a, b]) => seg(HOUSE[a], HOUSE[b], { color: MUTED, width: 2.5 })), ...HOUSE.map((p, i) => ellipse(p[0], p[1], 12, 12, { fill: fills[i], width: 2 }))];
}

function shortestPathPreview(): Piece[] {
  // Roads with their lengths, and the shortest route from the green place to the orange one in blue.
  const pts: Pt[] = [[0, 70], [80, 0], [80, 140], [170, 70]];
  const roads: [number, number, string, boolean][] = [[0, 1, "2", true], [1, 3, "3", true], [0, 2, "1", false], [2, 3, "6", false], [1, 2, "4", false]];
  return [
    ...roads.map(([a, b, , on]) => seg(pts[a], pts[b], on ? { color: BLUE, width: 5 } : { color: MUTED, width: 2 })),
    ...roads.map(([a, b, t]) => text((pts[a][0] + pts[b][0]) / 2 + 10, (pts[a][1] + pts[b][1]) / 2 - 4, t, 15)),
    ellipse(0, 70, 10, 10, { fill: FILL.green, width: 2 }),
    ellipse(80, 0, 10, 10, { fill: "#ffffff", width: 2 }),
    ellipse(80, 140, 10, 10, { fill: "#ffffff", width: 2 }),
    ellipse(170, 70, 10, 10, { fill: "#ffd8a8", width: 2 }),
  ];
}

function connectTownsPreview(): Piece[] {
  // Towns joined by the cheapest roads, thick, with the roads left out dashed.
  return [
    ...HOUSE_EDGES.map(([a, b], i) => seg(HOUSE[a], HOUSE[b], [0, 2, 3, 5].includes(i) ? { color: BLUE, width: 5 } : { color: MUTED, width: 1.5, dashed: true })),
    ...HOUSE.map((p) => ellipse(p[0], p[1], 10, 10, { fill: FILL.yellow, width: 2 })),
  ];
}

function beSortPreview(): Piece[] {
  // A row of cells mid-way through bubble sort: 5 and 2 about to swap (orange, ⇄ beneath), 8 and 9 settled in green.
  const vals = ["3", "5", "2", "8", "9"];
  const fills = ["#ffffff", "#ffe8cc", "#ffe8cc", FILL.green, FILL.green];
  return [
    ...vals.flatMap((v, i) => [rect(i * 44, 0, 38, 38, { fill: fills[i], width: 2 }), text(i * 44 + 19, 19, v, 20)]),
    ellipse(85, 66, 15, 12, { fill: "#e7f5ff", color: BLUE, width: 2 }),
    text(85, 66, "⇄", 16),
  ];
}

function beSearchPreview(): Piece[] {
  // Six places mid-way through a breadth-first search: the start and the next visited blue with their turns, the
  // roads they were reached by thick, and the places found waiting ringed orange.
  const P: Pt[] = [[0, 0], [90, 6], [180, 0], [4, 76], [92, 80], [176, 72]];
  const E: [number, number][] = [[0, 1], [1, 2], [0, 3], [1, 4], [3, 4], [4, 5], [2, 5]];
  const tree = [0, 2, 3];
  return [
    ...E.map(([a, b], i) => seg(P[a], P[b], tree.includes(i) ? { color: BLUE, width: 5 } : { color: MUTED, width: 2 })),
    ...P.map((p, v) => ellipse(p[0], p[1], 13, 13, v === 0 ? { fill: FILL.green, width: 2 } : v === 1 || v === 3 ? { fill: FILL.blue, width: 2 } : v === 2 || v === 4 ? { fill: "#ffffff", color: "#f08c00", width: 3 } : { fill: "#ffffff", width: 2 })),
    ...P.map((p, v) => text(p[0], p[1], "ABCDEF"[v], 14)),
  ];
}

function beDpPreview(): Piece[] {
  // A dp row filled from the left, its indexes beneath: the two cells the formula reads blue, the cell being filled
  // orange with their sum, and i pointing at it.
  const vals = ["1", "1", "2", "3", "5"];
  const fills = ["#ffffff", "#ffffff", FILL.blue, FILL.blue, "#ffe8cc"];
  return [
    ...vals.flatMap((v, i) => [rect(i * 44, 0, 38, 38, i === 4 ? { fill: fills[i], color: "#f08c00", width: 2 } : { fill: fills[i], width: 2 }), text(i * 44 + 19, 19, v, 20), text(i * 44 + 19, 50, String(i), 11)]),
    text(195, 72, "▲ i", 14),
  ];
}

function beBinaryPreview(): Piece[] {
  // A sorted row mid-way through a binary search: the left half ruled out grey, mid's cell orange, and the lo, mid and
  // hi chips under their cells.
  const vals = ["2", "5", "8", "12", "15", "19", "23"];
  const chip = (i: number, y: number, s: string, color: string) => [rect(i * 44 + 2, y, 34, 22, { fill: "#ffffff", color, width: 2 }, true), text(i * 44 + 19, y + 11, s, 13)];
  return [
    ...vals.flatMap((v, i) => [rect(i * 44, 0, 38, 38, { fill: i < 4 ? FILL.gray : i === 5 ? "#ffe8cc" : "#ffffff", width: 2 }), text(i * 44 + 19, 19, v, 18)]),
    ...chip(4, 48, "lo", BLUE),
    ...chip(5, 76, "mid", "#f08c00"),
    ...chip(6, 104, "hi", BLUE),
  ];
}

function bePointersPreview(): Piece[] {
  // A sorted row with i and j coming in from its two ends: the cells they passed grey, the two they hold blue.
  const vals = ["2", "4", "7", "9", "12", "15"];
  const chip = (i: number, s: string) => [rect(i * 44 + 4, 48, 30, 22, { fill: "#ffffff", color: BLUE, width: 2 }, true), text(i * 44 + 19, 59, s, 13)];
  return [
    ...vals.flatMap((v, i) => [rect(i * 44, 0, 38, 38, { fill: i === 0 || i === 5 ? FILL.gray : i === 1 || i === 4 ? FILL.blue : "#ffffff", width: 2 }), text(i * 44 + 19, 19, v, 18)]),
    ...chip(1, "i"),
    ...chip(4, "j"),
    text(110, 90, "→   ←", 16),
  ];
}

function beWindowPreview(): Piece[] {
  // A row with a window framed over three of its cells, the cells it has passed grey, and l and r under its ends.
  const vals = ["4", "9", "7", "6", "5", "8"];
  const chip = (i: number, s: string) => [rect(i * 44 + 4, 52, 30, 22, { fill: "#ffffff", color: BLUE, width: 2 }, true), text(i * 44 + 19, 63, s, 13)];
  return [
    ...vals.flatMap((v, i) => [rect(i * 44, 0, 38, 38, { fill: i < 2 ? FILL.gray : i < 5 ? "#e7f5ff" : "#ffffff", width: 2 }), text(i * 44 + 19, 19, v, 18)]),
    rect(83, -5, 130, 48, { color: BLUE, width: 3 }, true),
    ...chip(2, "l"),
    ...chip(4, "r"),
  ];
}

function beBacktrackPreview(): Piece[] {
  // A 4 × 4 board with a queen in each row, none attacking another, and path[] under it with each queen's column.
  const cols = [1, 3, 0, 2];
  return [
    ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => rect(c * 26, r * 26, 26, 26, { fill: (r + c) % 2 ? FILL.gray : "#ffffff", width: 1 }))),
    ...cols.map((c, r) => text(c * 26 + 13, r * 26 + 14, "♛", 18)),
    ...cols.flatMap((c, r) => [rect(r * 30 + 120, 30, 26, 26, { fill: "#e7f5ff", color: BLUE, width: 2 }), text(r * 30 + 133, 43, String(c), 14)]),
    text(160, 14, "path[]", 13),
  ];
}

function beHeapPreview(): Piece[] {
  // A small min-heap as a tree over heap[], each parent smaller than its children.
  const vals = ["2", "5", "3", "9", "7"];
  const at: [number, number][] = [[110, 14], [60, 54], [160, 54], [30, 94], [90, 94]];
  return [
    ...[1, 2, 3, 4].map((i) => seg(at[(i - 1) >> 1], at[i], { width: 1.5 })),
    ...vals.flatMap((v, i) => [ellipse(at[i][0], at[i][1], 14, 14, { fill: "#e7f5ff", color: BLUE, width: 2 }), text(at[i][0], at[i][1], v, 15)]),
  ];
}

function beTreePreview(): Piece[] {
  // A small search tree, smaller values to the left of each node and bigger to the right, with x on its way down.
  const vals = ["8", "3", "12", "1", "5"];
  const at: [number, number][] = [[110, 14], [60, 54], [160, 54], [30, 94], [90, 94]];
  return [
    ...[1, 2, 3, 4].map((i) => seg(at[i < 3 ? 0 : 1], at[i], { width: 1.5 })),
    ...vals.flatMap((v, i) => [ellipse(at[i][0], at[i][1], 14, 14, { fill: i === 1 ? "#fff4e6" : "#e7f5ff", color: i === 1 ? "#f08c00" : BLUE, width: 2 }), text(at[i][0], at[i][1], v, 15)]),
    rect(180, 80, 34, 26, { fill: "#fff4e6", color: "#f08c00", width: 2 }, true),
    text(197, 93, "x=4", 12),
  ];
}

function beStackPreview(): Piece[] {
  // An array with a stack under it whose values fall from bottom to top, and the next greater written into ans.
  const vals = ["2", "7", "4", "3", "5"];
  const cell = (i: number, y: number, v: string, fill: string, color = BLUE) => [rect(i * 44, y, 38, 34, { fill, color, width: 2 }), ...(v ? [text(i * 44 + 19, y + 17, v, 16)] : [])];
  return [
    ...vals.flatMap((v, i) => cell(i, 0, v, i === 4 ? "#fff4e6" : "#ffffff", i === 4 ? "#f08c00" : "#868e96")),
    ...["7", "4", "3"].flatMap((v, i) => cell(i, 48, v, "#f3f0ff", "#7048e8")),
    ...["7", "", "5", "5", ""].flatMap((v, i) => cell(i, 96, v, v ? "#d3f9d8" : "#ffffff", v ? "#2f9e44" : "#ced4da")),
  ];
}

function beUnionPreview(): Piece[] {
  // Two small trees of sets, each node pointing at its parent, and parent[] under them.
  const at: [number, number][] = [[40, 14], [10, 64], [70, 64], [160, 14], [160, 64]];
  return [
    ...[[1, 0], [2, 0], [4, 3]].map(([a, b]) => seg(at[a], at[b], { color: "#7048e8", width: 2 })),
    ...at.flatMap(([x, y], i) => [ellipse(x, y, 14, 14, { fill: i === 0 || i === 3 ? "#e7f5ff" : "#f8f9fa", color: i === 0 || i === 3 ? BLUE : "#868e96", width: 2 }), text(x, y, String(i), 15)]),
    ...["0", "0", "0", "3", "3"].flatMap((v, i) => [rect(i * 34, 96, 30, 28, { fill: "#ffffff", color: "#7048e8", width: 2 }), text(i * 34 + 15, 110, v, 14)]),
  ];
}

function beTopoPreview(): Piece[] {
  // A small graph whose arrows all point forward, and order[] taking the nodes in turn.
  const at: [number, number][] = [[20, 20], [90, 10], [90, 60], [160, 35]];
  return [
    ...[[0, 1], [0, 2], [1, 3], [2, 3]].map(([a, b]) => arrow(at[a], at[b], false, { width: 1.5 })),
    ...at.flatMap(([x, y], i) => [ellipse(x, y, 13, 13, { fill: "#e7f5ff", color: BLUE, width: 2 }), text(x, y, String(i), 14)]),
    ...["0", "1", "2", "3"].flatMap((v, i) => [rect(i * 34, 90, 30, 28, { fill: "#d3f9d8", color: "#2f9e44", width: 2 }), text(i * 34 + 15, 104, v, 14)]),
  ];
}

function beNamePreview(): Piece[] {
  // A problem card over a grid of pattern tiles, one lit as the answer.
  return [
    rect(0, 0, 200, 34, { fill: "#fff4e6", color: "#f08c00", width: 2 }, true),
    text(100, 17, "climb n stairs: how many ways?", 12),
    ...[0, 1, 2, 3, 4, 5].map((i) => rect((i % 3) * 68, 46 + Math.floor(i / 3) * 34, 62, 28, { fill: i === 2 ? "#ebfbee" : "#f8f9fa", color: i === 2 ? "#2f9e44" : "#ced4da", width: 1.5 }, true)),
    text(170, 60, "DP", 13),
  ];
}

function beCachePreview(): Piece[] {
  // A request over a cache list from the head to the tail, the tail on its way to the evict bin.
  const node = (i: number, k: string, v: string, color: string) => [rect(i * 70, 52, 58, 44, { fill: "#f3f0ff", color, width: 2 }), text(i * 70 + 29, 66, k, 16), text(i * 70 + 29, 86, v, 13)];
  return [
    rect(0, 0, 90, 32, { fill: "#fff4e6", color: "#f08c00", width: 2 }),
    text(45, 16, "put(4, d)", 13),
    ...node(0, "3", "= c", "#7048e8"),
    ...node(1, "1", "= a", "#7048e8"),
    ...node(2, "2", "= b", "#e03131"),
    rect(140, 112, 80, 32, { fill: "#ffffff", color: "#adb5bd", width: 2 }),
    text(180, 128, "evict ✕", 13),
  ];
}

function beBalancePreview(): Piece[] {
  // A request on its way to one of three servers, the pointer under the next in turn.
  const server = (i: number, name: string, sent: string) => [rect(i * 74, 52, 62, 50, { fill: "#f3f0ff", color: "#7048e8", width: 2 }), text(i * 74 + 31, 68, name, 18), text(i * 74 + 31, 90, sent, 12)];
  return [
    rect(66, 0, 90, 32, { fill: "#fff4e6", color: "#f08c00", width: 2 }),
    text(111, 16, "client 7", 13),
    ...server(0, "A", "sent 2"),
    ...server(1, "B", "sent 2"),
    ...server(2, "C", "sent 1"),
    rect(158, 112, 30, 24, { fill: "#ffffff", color: "#1971c2", width: 2 }),
    text(173, 124, "i", 14),
  ];
}

function beRingPreview(): Piece[] {
  // A ring with three servers on it and a key inside it, on its way clockwise to the first of them.
  const server = (x: number, y: number, name: string, color: string) => [ellipse(x, y, 15, 15, { fill: "#ffffff", color, width: 3 }), text(x, y, name, 15)];
  return [
    ellipse(80, 80, 75, 75, { color: "#ced4da", width: 3 }),
    ...server(80, 5, "A", "#1971c2"),
    ...server(145, 118, "B", "#2f9e44"),
    ...server(15, 118, "C", "#7048e8"),
    rect(84, 50, 52, 22, { fill: "#fff4e6", color: "#f08c00", width: 2 }),
    text(110, 61, "dog 31", 11),
  ];
}

function beLimitPreview(): Piece[] {
  // A timeline of requests, some let through and some rejected, over a bucket of tokens.
  const req = (x: number, y: number, color: string) => ellipse(x, y, 6, 6, { fill: color, color, width: 1 });
  return [
    seg([0, 30], [200, 30], { color: "#adb5bd", width: 2 }),
    req(20, 20, "#2f9e44"),
    req(60, 20, "#2f9e44"),
    req(60, 8, "#e03131"),
    req(110, 20, "#2f9e44"),
    req(160, 20, "#f08c00"),
    rect(40, 50, 120, 40, { fill: "#ffffff", color: "#7048e8", width: 2 }),
    ellipse(66, 70, 11, 11, { fill: "#f59f00", color: "#f59f00", width: 2 }),
    ellipse(100, 70, 11, 11, { fill: "#f59f00", color: "#f59f00", width: 2 }),
    ellipse(134, 70, 11, 11, { color: "#f59f00", width: 2 }),
  ];
}

function beQuorumPreview(): Piece[] {
  // Three replicas, two holding the newest version and one behind, and a read returning the newest.
  const replica = (i: number, v: string, color: string) => [rect(i * 70, 40, 60, 48, { fill: "#f3f0ff", color: "#7048e8", width: 2 }), text(i * 70 + 30, 54, `r${i}`, 13), text(i * 70 + 30, 74, v, 14, "center", color)];
  return [
    rect(65, 0, 70, 28, { fill: "#fff4e6", color: "#f08c00", width: 2 }),
    text(100, 14, "read", 13),
    ...replica(0, "c v2", "#2f9e44"),
    ...replica(1, "c v2", "#2f9e44"),
    ...replica(2, "a v1", "#e03131"),
    rect(40, 100, 120, 30, { fill: "#ebfbee", color: "#2f9e44", width: 2 }),
    text(100, 115, "return c v2", 13),
  ];
}

function beQueuePreview(): Piece[] {
  // Two partitions as rows of messages by offset, the committed offset marked, and a consumer reading from one.
  const msg = (i: number, y: number, k: string, read: boolean) => [rect(i * 44, y, 40, 30, { fill: read ? "#f1f3f5" : "#ffffff", color: read ? "#ced4da" : "#7048e8", width: 2 }), text(i * 44 + 20, y + 15, k, 12)];
  return [
    ...["ann", "bob", "ann"].flatMap((k, i) => msg(i, 0, k, i < 2)),
    ...["cat", "dan"].flatMap((k, i) => msg(i, 40, k, i < 1)),
    seg([86, -4], [86, 34], { color: "#2f9e44", width: 3 }),
    seg([42, 36], [42, 74], { color: "#2f9e44", width: 3 }),
    rect(40, 90, 110, 34, { fill: "#ffffff", color: "#1971c2", width: 2 }),
    text(95, 107, "c1 ← ann#3", 12),
  ];
}

function beCompPreview(): Piece[] {
  // A requirement's card over four of the component tiles, one of them lit.
  const tile = (i: number, j: number, name: string, lit = false) => [rect(i * 104, 56 + j * 42, 96, 34, { fill: lit ? "#ebfbee" : "#f8f9fa", color: lit ? "#2f9e44" : "#ced4da", width: 2 }), text(i * 104 + 48, 73 + j * 42, name, 12)];
  return [
    rect(0, 0, 200, 40, { fill: "#fff4e6", color: "#f08c00", width: 2 }),
    text(100, 20, "the same price, again and again", 11),
    ...tile(0, 0, "Cache", true),
    ...tile(1, 0, "CDN"),
    ...tile(0, 1, "Load balancer"),
    ...tile(1, 1, "Message queue"),
  ];
}

function fracOrderPreview(): Piece[] {
  // A line from 0 to 1 with three fraction cards standing on it.
  const at = (v: number) => v * 220;
  const card = (v: number, label: string, up: number) => [seg([at(v), 60], [at(v), 60 - up], { width: 1.5 }), rect(at(v) - 20, 60 - up - 28, 40, 28, { fill: FILL.yellow, width: 1.5 }, true), text(at(v), 60 - up - 9, label, 14)];
  return [
    seg([0, 60], [220, 60], { width: 2 }),
    seg([0, 52], [0, 68], { width: 2 }),
    seg([220, 52], [220, 68], { width: 2 }),
    text(0, 86, "0", 14),
    text(220, 86, "1", 14),
    ...card(0.2, "1/5", 14),
    ...card(0.5, "1/2", 40),
    ...card(0.8, "4/5", 14),
  ];
}

function equivMatchPreview(): Piece[] {
  // Four cards: 3/4, 0.75, 75 % and a bar three quarters shaded.
  const card = (x: number, y: number) => rect(x, y, 90, 56, { fill: FILL.gray, width: 1.5 }, true);
  return [
    card(0, 0), text(45, 34, "3/4", 20),
    card(104, 0), text(149, 34, "0.75", 20),
    card(0, 70), text(45, 104, "75%", 20),
    card(104, 70),
    ...[0, 1, 2, 3].map((i) => rect(112 + i * 18.5, 86, 18.5, 24, { fill: i < 3 ? FILL.blue : "#ffffff", width: 1.5 })),
  ];
}

function fractionWallPreview(): Piece[] {
  // A bar of ½ and ¼ tiles with a quarter left to fill.
  const h = 40;
  return [
    rect(0, 0, 120, h, { fill: FILL.yellow, width: 1.5 }),
    text(60, 26, "1/2", 16),
    rect(120, 0, 60, h, { fill: FILL.green, width: 1.5 }),
    text(150, 26, "1/4", 16),
    rect(180, 0, 60, h, { width: 1.5, dashed: true }),
    text(210, 26, "?", 20),
    seg([240, -8], [240, h + 8], { width: 3 }),
    text(240, -16, "1", 16),
  ];
}

function closerToPreview(): Piece[] {
  // 37, and the two tens it lies between, the nearer one ringed.
  return [
    text(100, 18, "37", 30),
    rect(10, 56, 70, 44, { fill: FILL.gray, width: 1.5 }, true),
    text(45, 86, "30", 22),
    rect(120, 56, 70, 44, { fill: FILL.green, color: "#2f9e44", width: 2.5 }, true),
    text(155, 86, "40", 22),
  ];
}

function divisiblePreview(): Piece[] {
  // 534, and four divisors beneath it: 2, 3 and 6 divide it (green), 4 doesn't.
  return [
    text(100, 18, "534", 30),
    ...[2, 3, 4, 6].flatMap((d, i) => [
      rect(i * 52, 56, 44, 44, d === 4 ? { fill: FILL.gray, width: 1.5 } : { fill: FILL.green, color: "#2f9e44", width: 2.5 }, true),
      text(i * 52 + 22, 86, String(d), 22),
    ]),
  ];
}

function primeSlicePreview(): Piece[] {
  // 21 with a stroke across it and its pieces 3 and 7 in green beside it; 13, a prime, left whole.
  return [
    ellipse(40, 70, 30, 30, { fill: FILL.blue, width: 2 }),
    text(40, 70, "21", 22),
    seg([4, 112], [80, 26], { color: "#1971c2", width: 3 }),
    ellipse(116, 40, 20, 20, { fill: FILL.green, color: "#2f9e44", width: 2.5 }),
    text(116, 40, "3", 20),
    ellipse(116, 100, 20, 20, { fill: FILL.green, color: "#2f9e44", width: 2.5 }),
    text(116, 100, "7", 20),
    ellipse(200, 70, 30, 30, { fill: FILL.blue, width: 2 }),
    text(200, 70, "13", 22),
  ];
}

function kakoomaPreview(): Piece[] {
  // Four numbers in a square, two by two; 7 = 3 + 4 is green, with its two parts outlined.
  return [
    rect(0, 0, 160, 160, { fill: FILL.gray, width: 1.5 }, true),
    ...([[3, 44, 44], [7, 116, 44], [4, 44, 116], [5, 116, 116]] as const).flatMap(([n, x, y]) => [
      rect(x - 28, y - 28, 56, 56, n === 7 ? { fill: FILL.green, color: "#2f9e44", width: 2.5 } : n === 5 ? { fill: "#ffffff", width: 1.5 } : { fill: "#ffffff", color: "#2f9e44", width: 2.5 }, true),
      text(x, y, String(n), 22),
    ]),
  ];
}

function targetPreview(): Piece[] {
  // The target, and four cards beneath it.
  return [
    text(110, 20, "🎯 24", 28),
    ...[3, 8, 2, 6].flatMap((n, i) => [rect(i * 56, 52, 44, 52, { fill: FILL.yellow, width: 1.5 }, true), text(i * 56 + 22, 86, String(n), 22)]),
  ];
}

function quickLookPreview(): Piece[] {
  // A ten frame with seven counters, a 👀 beside it.
  const out: Piece[] = [];
  for (let k = 0; k < 10; k++) {
    const [x, y] = [(k % 5) * 30, Math.floor(k / 5) * 30];
    out.push(rect(x, y, 30, 30, { color: MUTED, width: 1.5 }));
    if (k < 7) out.push(ellipse(x + 15, y + 15, 10, 10, { fill: "#1e1e1e", color: "#1e1e1e", width: 1 }));
  }
  return [...out, text(190, 38, "👀", 30)];
}

function estimatePreview(): Piece[] {
  // A line from 0 to 100 with only its ends, a pin dropped on it and the number's real place just beside.
  const [x0, x1, y] = [0, 240, 60];
  const at = (v: number) => x0 + (v / 100) * (x1 - x0);
  return [
    seg([x0, y], [x1, y], { width: 2 }),
    seg([x0, y - 8], [x0, y + 8], { width: 2 }),
    seg([x1, y - 8], [x1, y + 8], { width: 2 }),
    text(x0, y + 26, "0", 16),
    text(x1, y + 26, "100", 16),
    text(120, 10, "37", 22),
    seg([at(40), y - 22], [at(40), y + 4], { color: "#1971c2", width: 3 }),
    ellipse(at(40), y - 26, 6, 6, { fill: "#1971c2", color: "#1971c2", width: 1 }),
    poly([[at(37), y - 3], [at(37) - 7, y - 16], [at(37) + 7, y - 16]], { fill: "#2f9e44", color: "#2f9e44", width: 1 }),
  ];
}

function geoboardPreview(): Piece[] {
  // A dot grid with an L-shaped shape on it, its corners on the dots.
  const s = 24;
  const ink = { fill: MUTED, color: MUTED, width: 1 };
  const dots: Piece[] = [];
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 5; j++) dots.push(ellipse(i * s, j * s, 2.5, 2.5, ink));
  const corners: Pt[] = [[1, 1], [5, 1], [5, 3], [3, 3], [3, 4], [1, 4]];
  return [...dots, poly(corners.map(([x, y]): Pt => [x * s, y * s]), { fill: FILL.blue, color: "#1971c2", width: 2 })];
}

function comparePreview(): Piece[] {
  const [w, h, mid, gap] = [40, 16, 40, 60];
  const colors = [FILL.red, FILL.yellow, FILL.green, FILL.violet, FILL.blue];
  const tower = (x: number, n: number) => Array.from({ length: n }, (_, i) => rect(x, mid + (n / 2 - 1 - i) * h, w, h, { fill: colors[i], width: 1 }));
  const right = w + gap;
  return [
    ...tower(0, 5),
    ...tower(right, 2),
    seg([w, mid - 2.5 * h], [right, mid - h], { color: "#8d5a3b", width: 4 }),
    seg([w, mid + 2.5 * h], [right, mid + h], { color: "#5f3dc4", width: 4 }),
    text(w / 2, 104, "5", 24),
    text(w + gap / 2, 104, ">", 24),
    text(right + w / 2, 104, "2", 24),
  ];
}

function compareFractionsPreview(): Piece[] {
  const [w, whole, mid, gap] = [40, 72, 40, 60];
  // The shaded parts of 2/3 and 3/4, centred on the middle line, with the pencils joining them.
  const bar = (x: number, n: number, d: number, fill: string) => Array.from({ length: n }, (_, i) => rect(x, mid + (n / 2 - 1 - i) * (whole / d), w, whole / d, { fill, width: 1 }));
  const right = w + gap;
  const [ha, hb] = [(2 / 3) * whole, (3 / 4) * whole];
  return [
    ...bar(0, 2, 3, FILL.blue),
    ...bar(right, 3, 4, FILL.red),
    seg([w, mid - ha / 2], [right, mid - hb / 2], { color: "#8d5a3b", width: 4 }),
    seg([w, mid + ha / 2], [right, mid + hb / 2], { color: "#5f3dc4", width: 4 }),
    text(w / 2, 104, "2/3", 20),
    text(w + gap / 2, 104, "<", 24),
    text(right + w / 2, 104, "3/4", 20),
  ];
}

function rubikPreview(): Piece[] {
  // The cube seen from above, the front and the right: three faces of nine stickers on a dark body.
  const k = 20;
  const at = (x: number, y: number, z: number): Pt => [54 + (x - z) * k * 0.87, 62 + (x + z) * k * 0.5 - y * k];
  const faces: { fill: string; corner: (a: number, b: number) => Pt }[] = [
    { fill: "#ffffff", corner: (a, b) => at(a, 3, b) },
    { fill: "#2f9e44", corner: (a, b) => at(a, 3 - b, 3) },
    { fill: "#e03131", corner: (a, b) => at(3, 3 - b, 3 - a) },
  ];
  const square = (corner: (a: number, b: number) => Pt, a: number, b: number, d: number, inset: number): Pt[] =>
    [[inset, inset], [d - inset, inset], [d - inset, d - inset], [inset, d - inset]].map(([u, v]) => corner(a + u, b + v));
  return faces.flatMap(({ fill, corner }) => [
    poly(square(corner, 0, 0, 3, 0), { fill: "#212529", color: "#212529", width: 1 }),
    ...Array.from({ length: 9 }, (_, i) => poly(square(corner, i % 3, Math.floor(i / 3), 1, 0.1), { fill, color: "#212529", width: 1 })),
  ]);
}

function sorobanPreview(): Piece[] {
  // Five rods showing 2026 (with a nought on the left rod): the five beads above the beam, the one beads below it.
  const [sp, top, beam, bh, bw] = [22, 8, 34, 9, 18];
  const wood = { fill: "#6b4226", color: "#6b4226", width: 1 };
  const bead = (x: number, y: number) =>
    poly([[x - bw / 2, y + bh / 2], [x - bw / 2 + 5, y], [x + bw / 2 - 5, y], [x + bw / 2, y + bh / 2], [x + bw / 2 - 5, y + bh], [x - bw / 2 + 5, y + bh]], { fill: "#e8913a", color: "#7a4513", width: 1 });
  const bottom = beam + 6 + 5 * bh;
  return [
    rect(0, 0, 5 * sp + 16, bottom + top, wood),
    rect(5, top, 5 * sp + 6, bottom - top, { fill: "#f8f1e7", color: "#f8f1e7", width: 1 }),
    ...[0, 2, 0, 2, 6].flatMap((digit, i) => {
      const x = 8 + sp / 2 + i * sp;
      const ones = digit % 5;
      return [
        seg([x, top], [x, bottom], { color: "#868e96", width: 2 }),
        bead(x, digit >= 5 ? beam - bh : top),
        ...[0, 1, 2, 3].map((b) => bead(x, beam + 6 + (b < ones ? b : b + 1) * bh)),
      ];
    }),
    rect(5, beam, 5 * sp + 6, 6, wood),
  ];
}

function patternsPreview(): Piece[] {
  // Two pointers on 1 2 3 4 6: the ends compared, L and R under them.
  const BLUE = "#1971c2";
  const cell = (i: number, v: string, hot: boolean) => [
    rect(i * 34, 0, 30, 30, hot ? { fill: "#ffe8cc", color: "#e8590c", width: 2 } : { color: "#868e96", width: 1 }, true),
    text(i * 34 + 15, 4, v, 18),
  ];
  return [
    ...["1", "2", "3", "4", "6"].flatMap((v, i) => cell(i, v, i === 0 || i === 4)),
    text(15, 38, "↑L", 15, "center", BLUE),
    text(4 * 34 + 15, 38, "↑R", 15, "center", BLUE),
  ];
}

function problemsPreview(): Piece[] {
  // Two Number Sum part-way: the number being read, the set of numbers seen under it.
  const cell = (x: number, y: number, v: string, hot: boolean) => [
    rect(x, y, 30, 30, hot ? { fill: "#ffe8cc", color: "#e8590c", width: 2 } : { color: "#868e96", width: 1 }, true),
    text(x + 15, y + 4, v, 18),
  ];
  return [
    ...["4", "7", "−2", "9", "1"].flatMap((v, i) => cell(i * 34, 0, v, i === 2)),
    text(-6, 46, "{ }", 16, "right", "#868e96"),
    ...["4", "7"].flatMap((v, i) => cell(4 + i * 34, 40, v, false)),
  ];
}

function solverPreview(): Piece[] {
  // A sliding window part-way along 2 1 5 1 3: the window's cells in blue with its bracket, the rule under it.
  const cell = (i: number, v: string, hot: boolean) => [
    rect(i * 34, 0, 30, 30, hot ? { fill: "#d0ebff", color: "#1971c2", width: 2 } : { color: "#868e96", width: 1 }, true),
    text(i * 34 + 15, 4, v, 18),
  ];
  return [
    ...["2", "1", "5", "1", "3"].flatMap((v, i) => cell(i, v, i >= 1 && i <= 3)),
    rect(34, 34, 3 * 34 - 4, 4, { color: "#9c36b5", width: 2 }),
    text(2 * 34 + 15, 42, "sum ≤ 7", 14, "center", "#495057"),
  ];
}

function divisionPreview(): Piece[] {
  // 624 ÷ 12 under the long-division bracket, 52 on top and the first step's working.
  const col = (c: number) => 60 + c * 22;
  const two = (c: number) => (col(c - 1) + col(c)) / 2;
  const GREEN = "#2f9e44";
  return [
    text(22, 40, "12", 22),
    path([[38, 18], [44, 32], [38, 50]], { width: 2 }),
    seg([38, 18], [col(2) + 14, 18], { width: 2 }),
    ...["6", "2", "4"].map((d, c) => text(col(c), 40, d, 22)),
    text(col(1), 2, "5", 22, "center", GREEN),
    text(col(2), 2, "2", 22, "center", GREEN),
    text(two(1), 70, "60", 22),
    seg([col(0) - 12, 84], [col(1) + 12, 84], { width: 1.5 }),
    text(two(2), 104, "24", 22),
  ];
}

export const SHAPES: readonly ShapeDef[] = [
  { id: "liveEstimate", group: "games", build: estimatePreview, live: "estimate" },
  { id: "liveQuickLook", group: "games", build: quickLookPreview, live: "quickLook" },
  { id: "liveTarget", group: "games", build: targetPreview, live: "target" },
  { id: "liveCloserTo", group: "games", build: closerToPreview, live: "closerTo" },
  { id: "liveDivisible", group: "games", build: divisiblePreview, live: "divisible" },
  { id: "livePrimeSlice", group: "games", build: primeSlicePreview, live: "primeSlice" },
  { id: "liveKakooma", group: "games", build: kakoomaPreview, live: "kakooma" },
  { id: "liveFractionWall", group: "games", build: fractionWallPreview, live: "fractionWall" },
  { id: "liveEquivMatch", group: "games", build: equivMatchPreview, live: "equivMatch" },
  { id: "liveFracOrder", group: "games", build: fracOrderPreview, live: "fracOrder" },
  { id: "liveShadeFrac", group: "games", build: shadeFracPreview, live: "shadeFrac" },
  { id: "liveBalance", group: "games", build: balancePreview, live: "balance" },
  { id: "liveMachine", group: "games", build: machinePreview, live: "machine" },
  { id: "liveGrowing", group: "games", build: growingPreview, live: "growing" },
  { id: "liveExprMatch", group: "games", build: exprMatchPreview, live: "exprMatch" },
  { id: "liveGeoboard", group: "games", build: geoboardPreview, live: "geoboard" },
  { id: "liveAngleGuess", group: "games", build: angleGuessPreview, live: "angleGuess" },
  { id: "liveAngleHunt", group: "games", build: angleHuntPreview, live: "angleHunt" },
  { id: "liveMirror", group: "games", build: mirrorPreview, live: "mirror" },
  { id: "liveCubeNet", group: "games", build: cubeNetPreview, live: "cubeNet" },
  { id: "livePlotPoint", group: "games", build: plotPointPreview, live: "plotPoint" },
  { id: "liveBarChart", group: "games", build: barChartPreview, live: "barChart" },
  { id: "liveGraphStory", group: "games", build: graphStoryPreview, live: "graphStory" },
  { id: "liveSlopeLine", group: "games", build: slopeLinePreview, live: "slopeLine" },
  { id: "liveOneStroke", group: "games", build: oneStrokePreview, live: "oneStroke" },
  { id: "liveColourMap", group: "games", build: colourMapPreview, live: "colourMap" },
  { id: "liveShortestPath", group: "games", build: shortestPathPreview, live: "shortestPath" },
  { id: "liveConnectTowns", group: "games", build: connectTownsPreview, live: "connectTowns" },
  { id: "liveBeSort", group: "games", build: beSortPreview, live: "beSort" },
  { id: "liveBeSearch", group: "games", build: beSearchPreview, live: "beSearch" },
  { id: "liveBeDp", group: "games", build: beDpPreview, live: "beDp" },
  { id: "liveBeBinary", group: "games", build: beBinaryPreview, live: "beBinary" },
  { id: "liveBePointers", group: "games", build: bePointersPreview, live: "bePointers" },
  { id: "liveBeWindow", group: "games", build: beWindowPreview, live: "beWindow" },
  { id: "liveBeBacktrack", group: "games", build: beBacktrackPreview, live: "beBacktrack" },
  { id: "liveBeHeap", group: "games", build: beHeapPreview, live: "beHeap" },
  { id: "liveBeTree", group: "games", build: beTreePreview, live: "beTree" },
  { id: "liveBeStack", group: "games", build: beStackPreview, live: "beStack" },
  { id: "liveBeUnion", group: "games", build: beUnionPreview, live: "beUnion" },
  { id: "liveBeCache", group: "games", build: beCachePreview, live: "beCache" },
  { id: "liveBeBalance", group: "games", build: beBalancePreview, live: "beBalance" },
  { id: "liveBeRing", group: "games", build: beRingPreview, live: "beRing" },
  { id: "liveBeLimit", group: "games", build: beLimitPreview, live: "beLimit" },
  { id: "liveBeQuorum", group: "games", build: beQuorumPreview, live: "beQuorum" },
  { id: "liveBeQueue", group: "games", build: beQueuePreview, live: "beQueue" },
  { id: "liveBeComp", group: "games", build: beCompPreview, live: "beComp" },
  { id: "liveBeTopo", group: "games", build: beTopoPreview, live: "beTopo" },
  { id: "liveBeName", group: "games", build: beNamePreview, live: "beName" },
  { id: "liveDescentLab", group: "games", build: descentLabPreview, live: "descentLab" },
  { id: "livePcaLab", group: "games", build: pcaLabPreview, live: "pcaLab" },
  { id: "liveSoftmaxLab", group: "games", build: softmaxLabPreview, live: "softmaxLab" },
  { id: "liveEmbedLab", group: "games", build: embedLabPreview, live: "embedLab" },
  { id: "liveBackpropLab", group: "games", build: backpropLabPreview, live: "backpropLab" },
  { id: "liveTensorLab", group: "games", build: tensorLabPreview, live: "tensorLab" },
  { id: "liveFitLab", group: "games", build: fitLabPreview, live: "fitLab" },
  { id: "liveBatchLab", group: "games", build: batchLabPreview, live: "batchLab" },
  { id: "liveRocLab", group: "games", build: rocLabPreview, live: "rocLab" },
  { id: "liveKnnLab", group: "games", build: knnLabPreview, live: "knnLab" },
  { id: "liveTreeLab", group: "games", build: treeLabPreview, live: "treeLab" },
  { id: "liveKmeansLab", group: "games", build: kmeansLabPreview, live: "kmeansLab" },
  { id: "liveNnLab", group: "games", build: nnLabPreview, live: "nnLab" },
  { id: "liveConvLab", group: "games", build: convLabPreview, live: "convLab" },
  { id: "liveAttnLab", group: "games", build: attnLabPreview, live: "attnLab" },
  { id: "liveRnnLab", group: "games", build: rnnLabPreview, live: "rnnLab" },
  { id: "liveRlLab", group: "games", build: rlLabPreview, live: "rlLab" },
  { id: "liveClock", group: "live", build: clock, live: "clock" },
  { id: "liveDice", group: "live", build: diePreview, live: "dice" },
  { id: "liveSpinner", group: "live", build: spinner, live: "spinner" },
  { id: "liveCoin", group: "live", build: coinPreview, live: "coin" },
  { id: "liveFractions", group: "live", build: fractionsPreview, live: "fractions" },
  { id: "liveTenFrame", group: "live", build: tenFramePreview, live: "tenFrame" },
  { id: "liveHundred", group: "live", build: hundredPreview, live: "hundred" },
  { id: "liveDots", group: "live", build: dotsPreview, live: "dots" },
  { id: "liveGraph", group: "live", build: graphPreview, live: "graph" },
  { id: "liveChance", group: "live", build: chancePreview, live: "chance" },
  { id: "liveCompare", group: "live", build: comparePreview, live: "compare" },
  { id: "liveCompareFractions", group: "live", build: compareFractionsPreview, live: "compareFractions" },
  { id: "liveDivision", group: "live", build: divisionPreview, live: "division" },
  { id: "liveRubik", group: "live", build: rubikPreview, live: "rubik" },
  { id: "liveSoroban", group: "live", build: sorobanPreview, live: "soroban" },
  { id: "livePatterns", group: "live", build: patternsPreview, live: "patterns" },
  { id: "liveProblems", group: "live", build: problemsPreview, live: "problems" },
  { id: "liveSolver", group: "live", build: solverPreview, live: "solver" },
  { id: "liveNumberLine", group: "live", build: numberLine, live: "numberLine" },
  { id: "ruler", group: "measure", build: ruler },
  { id: "protractor", group: "measure", build: protractor },
  { id: "setSquare45", group: "measure", build: setSquare45 },
  { id: "setSquare30", group: "measure", build: setSquare30 },
  { id: "protractor360", group: "measure", build: protractor360 },
  { id: "clock", group: "measure", build: clock },
  { id: "axes", group: "graphs", build: axes },
  { id: "axesQ1", group: "graphs", build: axesQ1 },
  { id: "axesSketch", group: "graphs", build: axesSketch },
  { id: "numberLine", group: "graphs", build: numberLine },
  { id: "numberLine01", group: "graphs", build: numberLine01 },
  { id: "unitCircle", group: "graphs", build: unitCircle },
  { id: "gridPaper", group: "graphs", build: gridPaper },
  { id: "isometricDots", group: "graphs", build: isometricDots },
  { id: "axes3d", group: "graphs", build: axes3d },
  { id: "angle", group: "geometry", build: angle },
  { id: "rightTriangle", group: "geometry", build: rightTriangle },
  { id: "trigTriangle", group: "geometry", build: trigTriangle },
  { id: "triangle", group: "geometry", build: triangle },
  { id: "parallel", group: "geometry", build: parallel },
  { id: "transversalAngles", group: "geometry", build: transversalAngles },
  { id: "circleParts", group: "geometry", build: circleParts },
  { id: "pentagon", group: "geometry", build: regular(5, 90) },
  { id: "hexagon", group: "geometry", build: regular(6, 0) },
  { id: "octagon", group: "geometry", build: regular(8, 22.5) },
  { id: "parallelogram", group: "geometry", build: parallelogram },
  { id: "trapezium", group: "geometry", build: trapezium },
  { id: "kite", group: "geometry", build: kite },
  { id: "rhombus", group: "geometry", build: rhombus },
  { id: "cube", group: "solids", build: () => box(160, 160, 60, 60) },
  { id: "cuboid", group: "solids", build: () => box(240, 120, 80, 50) },
  { id: "cylinder", group: "solids", build: cylinder },
  { id: "cone", group: "solids", build: cone },
  { id: "sphere", group: "solids", build: sphere },
  { id: "pyramid", group: "solids", build: pyramid },
  { id: "prism", group: "solids", build: prism },
  { id: "netCube", group: "solids", build: netCube },
  { id: "netCuboid", group: "solids", build: netCuboid },
  { id: "netPrism", group: "solids", build: netPrism },
  { id: "netPyramid", group: "solids", build: netPyramid },
  { id: "netCylinder", group: "solids", build: netCylinder },
  { id: "fractionWall", group: "number", build: fractionWall },
  { id: "quarters", group: "number", build: fractionCircle(4) },
  { id: "eighths", group: "number", build: fractionCircle(8) },
  { id: "tenFrame", group: "number", build: tenFrame },
  { id: "hundredSquare", group: "number", build: hundredSquare },
  { id: "hundredFlat", group: "number", build: hundredFlat },
  { id: "tenRod", group: "number", build: tenRod },
  { id: "oneCube", group: "number", build: oneCube },
  { id: "placeValue", group: "number", build: placeValue },
  { id: "barModel", group: "number", build: barModel },
  { id: "partWhole", group: "number", build: partWhole },
  { id: "multiplicationSquare", group: "number", build: multiplicationSquare },
  { id: "tileX2", group: "algebra", build: tile(X, X, FILL.blue, "x²", 20) },
  { id: "tileX", group: "algebra", build: tile(X, ONE, FILL.green, "x", 16) },
  { id: "tile1", group: "algebra", build: tile(ONE, ONE, FILL.yellow, "1", 14) },
  { id: "tileY", group: "algebra", build: tile(Y, ONE, FILL.violet, "y", 16) },
  { id: "tileXY", group: "algebra", build: tile(X, Y, FILL.pink, "xy", 18) },
  { id: "tileNegX2", group: "algebra", build: tile(X, X, FILL.red, "−x²", 20) },
  { id: "tileNegX", group: "algebra", build: tile(X, ONE, FILL.red, "−x", 16) },
  { id: "tileNeg1", group: "algebra", build: tile(ONE, ONE, FILL.red, "−1", 12) },
  { id: "balance", group: "algebra", build: balance },
  { id: "functionMachine", group: "algebra", build: functionMachine },
  { id: "venn2", group: "stats", build: venn2 },
  { id: "venn3", group: "stats", build: venn3 },
  { id: "tree", group: "stats", build: tree },
  { id: "twoWay", group: "stats", build: twoWay },
  { id: "boxPlot", group: "stats", build: boxPlot },
  { id: "spinner", group: "stats", build: spinner },
  { id: "dice", group: "stats", build: dice },
  { id: "probabilityScale", group: "stats", build: probabilityScale },
  { id: "sampleSpace", group: "stats", build: sampleSpace },
];

/** The box around a piece's points (text counts as its anchor point). */
export function bounds(pieces: Piece[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of pieces) {
    if (p.kind === "path") for (const [x, y] of p.points) xs.push(x), ys.push(y);
    else if (p.kind === "ellipse") xs.push(p.cx - p.rx, p.cx + p.rx), ys.push(p.cy - p.ry, p.cy + p.ry);
    else if (p.kind === "rect") xs.push(p.x, p.x + p.w), ys.push(p.y, p.y + p.h);
    else xs.push(p.x), ys.push(p.y);
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
