// Ready-made maths pieces for the board's side panel: instruments (ruler, protractors, set squares, a clock), axes,
// number lines and grid paper, labelled figures, 3D solids with their hidden edges dashed and their nets, fraction and
// place-value pieces, algebra tiles, Venn diagrams and other templates for data and chance. A piece is a list of plain parts (paths, ellipses,
// rectangles, text) that the board turns into ordinary Excalidraw elements, grouped: what lands on the board is
// editable line by line, not a picture. Coordinates are in pixels with y pointing down; angles are in degrees,
// anticlockwise from the positive x-axis, as in maths. Labels are symbols and numbers, apart from the few words a
// piece can't do without (the probability scale's, the sides of a trigonometry triangle), which it is handed from
// the locales along with the names in the panel.

export type Pt = readonly [number, number];
type Style = { color?: string; width?: number; dashed?: boolean; fill?: string };
export type Piece =
  | ({ kind: "path"; points: Pt[]; closed?: boolean; arrows?: "end" | "both" } & Style)
  | ({ kind: "ellipse"; cx: number; cy: number; rx: number; ry: number } & Style)
  | ({ kind: "rect"; x: number; y: number; w: number; h: number; round?: boolean } & Style)
  | { kind: "text"; x: number; y: number; text: string; size: number; align: "left" | "center" | "right"; color?: string };

export const SHAPE_GROUPS = ["measure", "graphs", "geometry", "solids", "number", "algebra", "stats"] as const;
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
export type ShapeDef = { id: string; group: ShapeGroup; build: (words: ShapeWords) => Piece[] };

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

export const SHAPES: readonly ShapeDef[] = [
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
