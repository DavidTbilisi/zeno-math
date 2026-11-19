// The geometry lab: shapes of any kind and any size on a coordinate plane, and everything about them worked out.
// A shape is a polygon (any number of corners, drawn point by point or built from its measurements: three sides, two
// sides and the angle between, a rectangle w × h, a regular n-gon …) or a circle. For the chosen shape the lab gives
// its name (a right isosceles triangle, a kite, a concave hexagon), every side and angle, the perimeter and the area
// with the formula that fits the shape, the diagonals, the symmetry, and for a triangle its heights, medians,
// bisectors and four centres with the circles through and inside it. Lengths are exact (2√5) while the corners sit
// on half squares. Everything here is plain data with no words: the piece (src/live/GeoLab.tsx) draws and names it.
import { symmetryOf } from "./geometry";

export type Pt = [number, number];
export type GeoFig =
  | { kind: "poly"; pts: Pt[] }
  | { kind: "circle"; c: Pt; r: number }
  /** Semi-axis a along the direction rot (degrees anticlockwise from +x), b across it. */
  | { kind: "ellipse"; c: Pt; a: number; b: number; rot: number }
  /** The arc from the angle `from` anticlockwise through `sweep` degrees (0 < sweep ≤ 360). */
  | { kind: "sector"; c: Pt; r: number; from: number; sweep: number };
/** Any shape but a polygon: what has a centre. */
export type RoundFig = Exclude<GeoFig, { kind: "poly" }>;

export const SHOWS = ["lengths", "angles", "diagonals", "heights", "medians", "bisectors", "circum", "incircle", "symmetry", "coords", "grid"] as const;
export type GeoShow = (typeof SHOWS)[number];
export const UNITS = ["", "mm", "cm", "m", "km"] as const;
export type GeoUnit = (typeof UNITS)[number];
export type GeoTool = "move" | "poly" | "circle" | "ellipse" | "sector";
/** The plane's view: the point at the centre of the picture and how many pixels one unit is. */
export type GeoView = { cx: number; cy: number; s: number };

export type LiveGeoLab = {
  figs: GeoFig[];
  /** The chosen shape (its index in figs), or −1. */
  sel: number;
  tool: GeoTool;
  snap: boolean;
  unit: GeoUnit;
  show: GeoShow[];
  view: GeoView;
};

export const CANVAS = { w: 600, h: 540 };
export const MAX_FIGS = 12;
export const MAX_PTS = 20;
const VIEW_S: [number, number] = [1e-6, 1e7];

// ---------- vectors ----------

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
export const dist = (a: Pt, b: Pt) => len(sub(a, b));
const mid = (a: Pt, b: Pt): Pt => mul(add(a, b), 0.5);
const RAD = Math.PI / 180;
/** The angle at v between v→p and v→q, 0…180°. */
const angleAt = (p: Pt, v: Pt, q: Pt) => Math.atan2(Math.abs(cross(sub(p, v), sub(q, v))), dot(sub(p, v), sub(q, v))) / RAD;
/** The foot of the perpendicular from p to the line ab. */
export const footOn = (p: Pt, a: Pt, b: Pt): Pt => {
  const ab = sub(b, a);
  const l2 = dot(ab, ab) || 1;
  return add(a, mul(ab, dot(sub(p, a), ab) / l2));
};
/** Where the lines ab and cd cross (null when parallel). */
function meet(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12 * len(r) * len(s)) return null;
  return add(a, mul(r, cross(sub(c, a), s) / den));
}
/** Twice the signed area (the shoelace sum); positive when the corners go anticlockwise. */
export const area2 = (pts: Pt[]) => pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0);

// ---------- numbers ----------

/** A number as the lab writes it: two decimals, more for small numbers, a true minus sign. */
export function num(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a < 1e-12) return "0";
  const digits = a >= 1 ? 2 : Math.min(12, 2 - Math.floor(Math.log10(a)));
  const r = Number(v.toFixed(digits));
  return (Object.is(r, -0) ? "0" : String(r)).replace("-", "−");
}
/** Did writing it lose something (so it is "≈")? */
export const rounded = (v: number) => Number.isFinite(v) && Math.abs(Number(num(v).replace("−", "-")) - v) > 1e-9 * Math.max(1, Math.abs(v));

/** √k as a·√b with b square-free (for whole k). */
function simplifyRoot(k: number): [number, number] {
  let a = 1;
  let b = k;
  for (let f = 2; f * f <= b; f++) while (b % (f * f) === 0) [a, b] = [a * f, b / (f * f)];
  return [a, b];
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const onHalf = (v: number) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;

/** A length whose square is d2 written exactly (5, 2√5, 3√2/2, 1.5) when d2 is a whole number of quarters; else null. */
export function surd(d2: number): string | null {
  const q = Math.round(d2 * 4);
  if (Math.abs(d2 * 4 - q) > 1e-7 || q > 1e12) return null;
  const [a, b] = simplifyRoot(q); // √d2 = √q / 2 = a√b / 2
  if (b === 1) return num(a / 2);
  const g = gcd(a, 2);
  const [top, bottom] = [a / g, 2 / g];
  return `${top === 1 ? "" : top}√${b}${bottom === 1 ? "" : `/${bottom}`}`;
}

/** Exact length of the segment pq when both ends sit on half squares. */
const exactLen = (p: Pt, q: Pt) => (onHalf(p[0]) && onHalf(p[1]) && onHalf(q[0]) && onHalf(q[1]) ? surd((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2) : null);
/** A multiple of π written exactly (6π, 2.25π) for a whole number of sixteenths; else null. */
const piText = (k: number) => {
  if (Math.abs(k * 16 - Math.round(k * 16)) > 1e-9 || Math.abs(k) > 1e9) return null;
  return k === 1 ? "π" : `${num(k)}π`;
};

// ---------- names of points ----------

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O: they name the incentre and the circumcentre
/** The corners' names, lettered on from one shape to the next (A B C, then D E F G …), circles' centres O, O₂ … */
export function pointNames(figs: GeoFig[]): string[][] {
  let k = 0;
  let circles = 0;
  const sub = "₀₁₂₃₄₅₆₇₈₉";
  return figs.map((f) => {
    if (f.kind !== "poly") {
      circles++;
      return [circles === 1 ? "O" : `O${String(circles).split("").map((d) => sub[+d]).join("")}`];
    }
    return f.pts.map(() => {
      const i = k++;
      const round = Math.floor(i / LETTERS.length);
      return LETTERS[i % LETTERS.length] + (round ? String(round).split("").map((d) => sub[+d]).join("") : "");
    });
  });
}

// ---------- building shapes from their measurements ----------

export const MAKES = ["sss", "sas", "asa", "right", "equilateral", "isosceles", "square", "rectangle", "parallelogram", "rhombus", "trapezoid", "kite", "regular", "circle", "ellipse", "sector"] as const;
export type MakeKind = (typeof MAKES)[number];
export type ParamKey = "AB" | "BC" | "CA" | "angleA" | "angleB" | "leg1" | "leg2" | "side" | "legs" | "base" | "w" | "h" | "angle" | "bottom" | "top" | "height" | "d1" | "d2" | "topPart" | "n" | "r" | "a" | "b" | "sweep";
export const MAKE_PARAMS: Record<MakeKind, { keys: ParamKey[]; start: number[] }> = {
  sss: { keys: ["AB", "BC", "CA"], start: [7, 5, 6] },
  sas: { keys: ["AB", "CA", "angleA"], start: [6, 5, 50] },
  asa: { keys: ["angleA", "AB", "angleB"], start: [50, 7, 60] },
  right: { keys: ["leg1", "leg2"], start: [4, 3] },
  equilateral: { keys: ["side"], start: [6] },
  isosceles: { keys: ["legs", "base"], start: [6, 4] },
  square: { keys: ["side"], start: [5] },
  rectangle: { keys: ["w", "h"], start: [6, 4] },
  parallelogram: { keys: ["bottom", "side", "angle"], start: [6, 4, 60] },
  rhombus: { keys: ["side", "angle"], start: [5, 60] },
  trapezoid: { keys: ["bottom", "top", "height"], start: [8, 4, 3] },
  kite: { keys: ["d1", "d2", "topPart"], start: [8, 6, 2] },
  regular: { keys: ["n", "side"], start: [6, 4] },
  circle: { keys: ["r"], start: [3] },
  ellipse: { keys: ["a", "b"], start: [5, 3] },
  sector: { keys: ["r", "sweep"], start: [4, 60] },
};
export type MakeProblem = "positive" | "triangle" | "angles" | "n" | "kite" | "angle" | "sweep";

const at = (deg: number, l: number, from: Pt = [0, 0]): Pt => add(from, [l * Math.cos(deg * RAD), l * Math.sin(deg * RAD)]);
/** Cleans away the float dust (1e-16) the sines leave, so a built square has whole corners. */
const clean = (p: Pt): Pt => p.map((v) => (Math.abs(v - Math.round(v * 1e9) / 1e9) < 1e-11 ? Math.round(v * 1e9) / 1e9 : v)) as Pt;
const poly = (pts: Pt[]): GeoFig => ({ kind: "poly", pts: pts.map(clean) });

/**
 * Three lengths that make no triangle, as the lab shows them: the longest c as a base and the other two, a ≤ b, laid
 * flat from its ends, falling `gap` = c − (a + b) short of meeting (0: they meet only lying flat). Null when they close.
 */
export function wontClose(sides: number[]): { a: number; b: number; c: number; gap: number } | null {
  const [a, b, c] = sides.slice().sort((x, y) => x - y);
  return a + b <= c + 1e-12 ? { a, b, c, gap: Math.max(0, c - a - b) } : null;
}

/** The shape the measurements describe, its first corner at the origin (the centre for a circle), or what is wrong. */
export function make(kind: MakeKind, v: number[]): { fig: GeoFig } | { problem: MakeProblem } {
  if (v.length !== MAKE_PARAMS[kind].keys.length || v.some((x) => !Number.isFinite(x) || x <= 0)) return { problem: "positive" };
  const tri = (b: number, c: number, A: number): GeoFig => poly([[0, 0], [c, 0], at(A, b)]); // AB = c on the x axis, AC = b at angle A
  switch (kind) {
    case "sss": {
      const [c, a, b] = v; // AB, BC, CA
      if (a + b <= c + 1e-12 || a + c <= b + 1e-12 || b + c <= a + 1e-12) return { problem: "triangle" };
      const cosA = (b * b + c * c - a * a) / (2 * b * c);
      return { fig: tri(b, c, Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD) };
    }
    case "sas": {
      const [c, b, A] = v;
      if (A >= 180) return { problem: "angle" };
      return { fig: tri(b, c, A) };
    }
    case "asa": {
      const [A, c, B] = v;
      if (A + B >= 180) return { problem: "angles" };
      const C = 180 - A - B;
      const b = (c * Math.sin(B * RAD)) / Math.sin(C * RAD);
      return { fig: tri(b, c, A) };
    }
    case "right": return { fig: poly([[0, 0], [v[0], 0], [0, v[1]]]) };
    case "equilateral": return { fig: tri(v[0], v[0], 60) };
    case "isosceles": {
      const [l, b] = v;
      if (2 * l <= b) return { problem: "triangle" };
      return { fig: poly([[0, 0], [b, 0], [b / 2, Math.sqrt(l * l - (b * b) / 4)]]) };
    }
    case "square": return { fig: poly([[0, 0], [v[0], 0], [v[0], v[0]], [0, v[0]]]) };
    case "rectangle": return { fig: poly([[0, 0], [v[0], 0], [v[0], v[1]], [0, v[1]]]) };
    case "parallelogram":
    case "rhombus": {
      const [a, b, A] = kind === "rhombus" ? [v[0], v[0], v[1]] : v;
      if (A >= 180) return { problem: "angle" };
      const d = at(A, b);
      return { fig: poly([[0, 0], [a, 0], add([a, 0], d), d]) };
    }
    case "trapezoid": {
      const [a, b, h] = v;
      const x = (a - b) / 2;
      return { fig: poly([[0, 0], [a, 0], [x + b, h], [x, h]]) };
    }
    case "kite": {
      const [d1, d2, t] = v; // the axis, the cross diagonal, how far down the axis it crosses
      if (t >= d1) return { problem: "kite" };
      return { fig: poly([[0, d1 - t], [-d2 / 2, 0], [0, -t], [d2 / 2, 0]].map(([x, y]) => [x + d2 / 2, y + t] as Pt)) };
    }
    case "regular": {
      const [n, s] = v;
      if (!Number.isInteger(n) || n < 3 || n > MAX_PTS) return { problem: "n" };
      const pts: Pt[] = [[0, 0]];
      for (let i = 1; i < n; i++) pts.push(at((360 / n) * (i - 1), s, pts[i - 1]));
      return { fig: poly(pts) };
    }
    case "circle": return { fig: { kind: "circle", c: [0, 0], r: v[0] } };
    case "ellipse": return { fig: { kind: "ellipse", c: [0, 0], a: v[0], b: v[1], rot: 0 } };
    case "sector": return v[1] > 360 ? { problem: "sweep" } : { fig: { kind: "sector", c: [0, 0], r: v[0], from: 0, sweep: v[1] } };
  }
}

// ---------- the plane ----------

/** The box around shapes: [minX, minY, maxX, maxY], or null for none. */
export function bounds(figs: GeoFig[]): [number, number, number, number] | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const f of figs) {
    if (f.kind === "circle") xs.push(f.c[0] - f.r, f.c[0] + f.r), ys.push(f.c[1] - f.r, f.c[1] + f.r);
    else if (f.kind === "ellipse") {
      const [co, si] = [Math.cos(f.rot * RAD), Math.sin(f.rot * RAD)];
      const [wx, wy] = [Math.hypot(f.a * co, f.b * si), Math.hypot(f.a * si, f.b * co)];
      xs.push(f.c[0] - wx, f.c[0] + wx), ys.push(f.c[1] - wy, f.c[1] + wy);
    } else if (f.kind === "sector") {
      // The centre, the arc's two ends, and the arc's furthest points left, right, up and down when it passes them.
      const ends = [f.from, f.from + f.sweep, ...[0, 90, 180, 270, 360, 450, 540, 630].filter((d) => d > f.from && d < f.from + f.sweep)];
      for (const d of ends) {
        const [x, y] = at(d, f.r, f.c);
        xs.push(x), ys.push(y);
      }
      xs.push(f.c[0]), ys.push(f.c[1]);
    }    else for (const [x, y] of f.pts) xs.push(x), ys.push(y);
  }
  return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null;
}

/** 1, 2 or 5 times a power of ten: the smallest at least `v`. */
export function niceStep(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v * (1 - 1e-9)) return m * p;
  return 10 * p;
}
/** The grid's step for a view: squares of about 40 pixels or more. */
export const gridStep = (view: GeoView) => niceStep(36 / view.s);

export const START_VIEW: GeoView = { cx: 4, cy: 3, s: 48 };

/** A view that shows every shape with room around it (the start view for none). */
export function fitView(figs: GeoFig[]): GeoView {
  const b = bounds(figs);
  if (!b) return START_VIEW;
  const [w, h] = [Math.max(b[2] - b[0], 1e-6), Math.max(b[3] - b[1], 1e-6)];
  const s = Math.min((CANVAS.w * 0.78) / w, (CANVAS.h * 0.72) / h);
  return { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, s: Math.min(VIEW_S[1], Math.max(VIEW_S[0], s)) };
}
export const zoomView = (v: GeoView, k: number): GeoView => ({ ...v, s: Math.min(VIEW_S[1], Math.max(VIEW_S[0], v.s * k)) });

export const toPx = (v: GeoView, [x, y]: Pt): Pt => [CANVAS.w / 2 + (x - v.cx) * v.s, CANVAS.h / 2 - (y - v.cy) * v.s];
export const fromPx = (v: GeoView, [px, py]: Pt): Pt => [v.cx + (px - CANVAS.w / 2) / v.s, v.cy - (py - CANVAS.h / 2) / v.s];
export const snapTo = (p: Pt, step: number): Pt => p.map((c) => Math.round(c / step) * step + 0) as Pt;

export function moveFig(f: GeoFig, d: Pt): GeoFig {
  return f.kind === "poly" ? { ...f, pts: f.pts.map((p) => add(p, d)) } : { ...f, c: add(f.c, d) };
}

/** A new shape put to the right of the others (whole steps away, so its corners stay where they were on the grid). */
export function placeBeside(figs: GeoFig[], f: GeoFig): GeoFig {
  const b = bounds(figs);
  const nb = bounds([f]);
  if (!b || !nb) return f;
  const size = Math.max(b[2] - b[0], b[3] - b[1], nb[2] - nb[0], nb[3] - nb[1]);
  const step = niceStep(size / 10);
  const dx = Math.ceil((b[2] + step - nb[0]) / step) * step;
  const dy = Math.round((b[1] - nb[1]) / step) * step;
  return moveFig(f, [dx, dy]);
}

/** The shape enlarged by k about its centre. */
export function enlarge(f: GeoFig, k: number): GeoFig {
  if (!(k > 0)) return f;
  if (f.kind === "circle" || f.kind === "sector") return { ...f, r: f.r * k };
  if (f.kind === "ellipse") return { ...f, a: f.a * k, b: f.b * k };
  const c = mul(f.pts.reduce((s, p) => add(s, p), [0, 0] as Pt), 1 / f.pts.length);
  return { ...f, pts: f.pts.map((p) => add(c, mul(sub(p, c), k))) };
}

/** Side i (corner i to corner i + 1) given length l: corner i + 1 moves along the side. */
export function setSide(pts: Pt[], i: number, l: number): Pt[] {
  const [p, q] = [pts[i], pts[(i + 1) % pts.length]];
  const d = dist(p, q);
  if (!(l > 0) || d === 0) return pts;
  return pts.map((r, j) => (j === (i + 1) % pts.length ? add(p, mul(sub(q, p), l / d)) : r));
}

export const insertPoint = (pts: Pt[], i: number): Pt[] => (pts.length >= MAX_PTS ? pts : [...pts.slice(0, i + 1), mid(pts[i], pts[(i + 1) % pts.length]), ...pts.slice(i + 1)]);
export const removePoint = (pts: Pt[], i: number): Pt[] => (pts.length <= 3 ? pts : pts.filter((_, j) => j !== i));

export const GEO_START: LiveGeoLab = {
  figs: [{ kind: "poly", pts: [[0, 0], [4, 0], [0, 3]] }, { kind: "poly", pts: [[6, 0], [10, 0], [9, 3], [7, 3]] }],
  sel: 0,
  tool: "move",
  snap: true,
  unit: "cm",
  show: ["lengths", "angles", "grid"],
  view: { cx: 5, cy: 1.5, s: 48 },
};

// ---------- what a shape is ----------

export type BaseName =
  | "triangle" | "quadrilateral" | "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezoid" | "kite"
  | "pentagon" | "hexagon" | "heptagon" | "octagon" | "nonagon" | "decagon" | "polygon" | "circle" | "ellipse" | "sector";
export type Tag = "regular" | "equilateral" | "isosceles" | "scalene" | "right" | "acute" | "obtuse" | "concave" | "crossed" | "flat"
  | "isCircle" | "semicircle" | "quadrant" | "minorSector" | "majorSector";
export type Dim = 0 | 1 | 2 | "deg" | "pt";
/** A value: a number of a kind (a length, an area, an angle, a count) or a point; exact is its exact form (2√5, 9π). */
export type Val = { n: number; dim: Dim; exact?: string; p?: Pt };
/** What a fact shows on the picture while the pointer is on it. */
export type Mark = { seg: [Pt, Pt] } | { pt: Pt } | { ring: [Pt, number] } | { corner: [Pt, Pt, Pt] } | { path: Pt[] };
export type FactKey =
  | "point" | "centre" | "side" | "angle" | "angleSum" | "exteriorSum" | "perimeter" | "area" | "heron"
  | "diagCount" | "diag" | "diagAngle" | "diagBisect" | "diagPerp" | "diagEqual" | "parallel" | "cyclic"
  | "height" | "median" | "bisector" | "centroid" | "circumcentre" | "circumradius" | "incentre" | "inradius"
  | "orthocentre" | "euler" | "sines" | "cosines" | "pythagoras"
  | "interior" | "exterior" | "central" | "apothem"
  | "symLines" | "symOrder"
  | "radius" | "diameter" | "circumference" | "circleArea" | "equation"
  | "focus" | "semiMajor" | "semiMinor" | "majorAxis" | "minorAxis" | "focalDist" | "eccentricity" | "focalSum"
  | "arcEnd" | "centralAngle" | "arcLength" | "chord" | "segmentArea" | "circleShare";
export type Fact = { key: FactKey; name?: string; v?: Val; how?: string; mark?: Mark[] };
export type SectionKey = "points" | "sides" | "angles" | "size" | "diagonals" | "triangle" | "regular" | "symmetry" | "circle" | "ellipse" | "sector";
export type Section = { key: SectionKey; facts: Fact[] };

/** Lines and points that the "show" switches draw. */
export type Overlay = {
  diagonals: [Pt, Pt][];
  heights: { from: Pt; foot: Pt; base: [Pt, Pt] }[];
  medians: [Pt, Pt][];
  bisectors: [Pt, Pt][];
  circum?: { c: Pt; r: number };
  incircle?: { c: Pt; r: number };
  centres: { name: "G" | "O" | "I" | "H"; p: Pt }[];
  axes: { c: Pt; d: Pt }[];
  /** An ellipse's foci. */
  foci?: Pt[];
};

export type Measured = { base: BaseName; n: number; tags: Tag[]; sections: Section[]; overlay: Overlay; angles: number[]; orient: number };

const BASE_BY_N: Record<number, BaseName> = { 3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon" };

/** Do any two sides that don't share a corner cross? */
function crossed(pts: Pt[]): boolean {
  const n = pts.length;
  const side = (a: Pt, b: Pt, c: Pt) => Math.sign(cross(sub(b, a), sub(c, a)));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return true;
    }
  return false;
}

/** Interior angles in degrees (a reflex corner over 180°), given the turning direction. */
function interior(pts: Pt[], orient: number): number[] {
  const n = pts.length;
  return pts.map((v, i) => {
    const [p, q] = [pts[(i + n - 1) % n], pts[(i + 1) % n]];
    const a = angleAt(p, v, q);
    const turn = Math.sign(cross(sub(v, p), sub(q, v)));
    return turn === 0 || turn === orient ? a : 360 - a;
  });
}

const len1 = (n: number, exact?: string | null): Val => ({ n, dim: 1, ...(exact ? { exact } : {}) });
const sq = (n: number): Val => ({ n, dim: 2 });
const degV = (n: number): Val => ({ n, dim: "deg" });
const ptV = (p: Pt): Val => ({ n: 0, dim: "pt", p });
const sumText = (xs: number[], u = "") => (xs.length <= 8 ? xs.map((x) => num(x) + u).join(" + ") : `${num(xs[0])}${u} + … + ${num(xs[xs.length - 1])}${u}`);
const sup2 = (v: number) => (v < 0 ? `(${num(v)})²` : `${num(v)}²`);

/** Everything about a polygon. `names` are its corners' names. */
export function measurePoly(pts: Pt[], names: string[]): Measured {
  const n = pts.length;
  const scale = Math.max(...pts.map((p) => dist(p, pts[0])), 1e-12);
  const tol = 1e-7 * scale;
  const same = (a: number, b: number) => Math.abs(a - b) <= tol;
  const sameDeg = (a: number, b: number) => Math.abs(a - b) <= 1e-6;
  const nm = (i: number) => names[((i % n) + n) % n];
  const P = (i: number) => pts[((i % n) + n) % n];
  const sides = pts.map((p, i) => dist(p, P(i + 1)));
  const signed = area2(pts);
  const orient = Math.sign(signed) || 1;
  const area = Math.abs(signed) / 2;
  const isCrossed = n > 3 && crossed(pts);
  const flat = Math.abs(signed) <= tol * scale;
  const angles = isCrossed || flat ? pts.map(() => NaN) : interior(pts, orient);
  const concave = !isCrossed && !flat && angles.some((a) => a > 180 + 1e-9);
  const perimeter = sides.reduce((s, x) => s + x, 0);
  const tags: Tag[] = [];
  const sections: Section[] = [];
  const overlay: Overlay = { diagonals: [], heights: [], medians: [], bisectors: [], centres: [], axes: [] };
  const sideName = (i: number) => nm(i) + nm(i + 1);
  const seg = (i: number): Mark => ({ seg: [P(i), P(i + 1)] });

  sections.push({ key: "points", facts: pts.map((p, i) => ({ key: "point", name: nm(i), v: ptV(p), mark: [{ pt: p }] })) });
  sections.push({
    key: "sides",
    facts: pts.map((p, i) => {
      const q = P(i + 1);
      const [dx, dy] = sub(q, p);
      const exact = exactLen(p, q);
      const d2 = dx * dx + dy * dy;
      const how = `√(${sup2(Math.abs(dx))} + ${sup2(Math.abs(dy))})${exact && !exact.includes("√") ? ` = √${num(d2)}` : ""}`;
      return { key: "side", name: sideName(i), v: len1(sides[i], exact), how, mark: [seg(i)] };
    }),
  });

  // The name: a polygon by its corners, a quadrilateral and a triangle by their sides and angles.
  let base: BaseName = BASE_BY_N[n] ?? "polygon";
  const equalSides = sides.every((s) => same(s, sides[0]));
  const equalAngles = !isCrossed && !flat && angles.every((a) => sameDeg(a, angles[0]));
  const regular = equalSides && equalAngles;
  if (flat) tags.push("flat");
  if (isCrossed) tags.push("crossed");
  if (concave) tags.push("concave");
  const right = (a: number) => sameDeg(a, 90);
  const par = (i: number, j: number) => {
    const [u, v] = [sub(P(i + 1), P(i)), sub(P(j + 1), P(j))];
    return Math.abs(cross(u, v)) <= 1e-9 * len(u) * len(v);
  };
  let tri: ReturnType<typeof triangleFacts> | null = null;

  if (n === 3 && !flat) {
    const [a, b, c] = [sides[1], sides[2], sides[0]]; // a = BC, b = CA, c = AB
    tags.push(equalSides ? "equilateral" : same(a, b) || same(b, c) || same(a, c) ? "isosceles" : "scalene");
    const big = Math.max(...angles);
    tags.push(right(big) ? "right" : big > 90 ? "obtuse" : "acute");
    tri = triangleFacts(pts, names, [a, b, c], angles, area, overlay);
  } else if (n === 4 && !flat && !isCrossed && !concave) {
    const p02 = par(0, 2);
    const p13 = par(1, 3);
    const allRight = angles.every(right);
    if (equalSides && allRight) base = "square";
    else if (allRight) base = "rectangle";
    else if (equalSides) base = "rhombus";
    else if (p02 && p13) base = "parallelogram";
    else if (p02 || p13) {
      base = "trapezoid";
      const legs = p02 ? [sides[1], sides[3]] : [sides[0], sides[2]];
      if (same(legs[0], legs[1])) tags.push("isosceles");
      if (angles.some(right)) tags.push("right");
    } else if ((same(sides[0], sides[1]) && same(sides[2], sides[3])) || (same(sides[1], sides[2]) && same(sides[3], sides[0]))) base = "kite";
  } else if (n === 4 && concave && ((same(sides[0], sides[1]) && same(sides[2], sides[3])) || (same(sides[1], sides[2]) && same(sides[3], sides[0])))) {
    base = "kite"; // a dart: a concave kite
  }
  if (regular && n > 4) tags.unshift("regular");
  if (equalSides && !regular && n > 4 && !isCrossed) tags.push("equilateral");

  // Angles.
  if (!isCrossed && !flat) {
    const angleFacts: Fact[] = pts.map((v, i) => ({ key: "angle", name: nm(i), v: degV(angles[i]), mark: [{ corner: [P(i - 1), v, P(i + 1)] }] }));
    angleFacts.push({ key: "angleSum", v: degV((n - 2) * 180), how: `(${n} − 2) · 180° = ${(n - 2) * 180}°` });
    if (!concave) angleFacts.push({ key: "exteriorSum", v: degV(360), how: `${sumText(angles.map((a) => 180 - a), "°")} = 360°` });
    sections.push({ key: "angles", facts: angleFacts });
  }

  // Perimeter and area, with the formula of the shape.
  const size: Fact[] = [{ key: "perimeter", v: len1(perimeter), how: `${sumText(sides)} = ${num(perimeter)}`, mark: pts.map((_, i) => seg(i)) }];
  if (!isCrossed) {
    let how = "";
    const allMarks: Mark[] = [];
    if (tri) {
      how = tri.areaHow;
      allMarks.push(...tri.areaMarks);
    } else if (base === "square") how = `a² = ${num(sides[0])}² = ${num(area)}`;
    else if (base === "rectangle") how = `a · b = ${num(sides[0])} · ${num(sides[1])} = ${num(area)}`;
    else if (base === "parallelogram" || base === "rhombus") {
      const h = dist(P(2), footOn(P(2), P(0), P(1)));
      if (base === "rhombus") {
        const [d1, d2] = [dist(P(0), P(2)), dist(P(1), P(3))];
        how = `½ · d₁ · d₂ = ½ · ${num(d1)} · ${num(d2)} = ${num(area)}`;
        allMarks.push({ seg: [P(0), P(2)] }, { seg: [P(1), P(3)] });
      } else {
        how = `b · h = ${num(sides[0])} · ${num(h)} = ${num(area)}`;
        allMarks.push(seg(0), { seg: [P(2), footOn(P(2), P(0), P(1))] });
      }
    } else if (base === "trapezoid") {
      const i = par(0, 2) ? 0 : 1;
      const h = dist(P(i + 2), footOn(P(i + 2), P(i), P(i + 1)));
      how = `½ · (a + b) · h = ½ · (${num(sides[i])} + ${num(sides[i + 2])}) · ${num(h)} = ${num(area)}`;
      allMarks.push(seg(i), seg(i + 2), { seg: [P(i + 2), footOn(P(i + 2), P(i), P(i + 1))] });
    } else if (base === "kite" && !concave) {
      const [d1, d2] = [dist(P(0), P(2)), dist(P(1), P(3))];
      how = `½ · d₁ · d₂ = ½ · ${num(d1)} · ${num(d2)} = ${num(area)}`;
      allMarks.push({ seg: [P(0), P(2)] }, { seg: [P(1), P(3)] });
    } else if (regular) {
      const ap = sides[0] / (2 * Math.tan(Math.PI / n));
      how = `½ · P · a = ½ · ${num(perimeter)} · ${num(ap)} = ${num(area)}`;
    } else how = `½ · |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| = ½ · ${num(Math.abs(signed))} = ${num(area)}`;
    size.push({ key: "area", v: sq(area), how, mark: allMarks.length ? allMarks : undefined });
    if (tri) size.push(tri.heron);
  }
  sections.push({ key: "size", facts: size });

  // Diagonals.
  if (n > 3) {
    const count = (n * (n - 3)) / 2;
    const facts: Fact[] = [{ key: "diagCount", v: { n: count, dim: 0 }, how: `${n} · (${n} − 3) / 2 = ${count}` }];
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        overlay.diagonals.push([pts[i], pts[j]]);
        if (n <= 8) facts.push({ key: "diag", name: nm(i) + nm(j), v: len1(dist(pts[i], pts[j]), exactLen(pts[i], pts[j])), mark: [{ seg: [pts[i], pts[j]] }] });
      }
    if (n === 4 && !isCrossed) {
      const x = meet(P(0), P(2), P(1), P(3));
      if (x) {
        const ang = angleAt(P(0), x, P(1));
        const acute = Math.min(ang, 180 - ang);
        facts.push({ key: "diagAngle", v: degV(acute), mark: [{ seg: [P(0), P(2)] }, { seg: [P(1), P(3)] }, { pt: x }] });
        if (dist(x, mid(P(0), P(2))) <= tol && dist(x, mid(P(1), P(3))) <= tol) facts.push({ key: "diagBisect", mark: [{ pt: x }] });
        if (sameDeg(acute, 90)) facts.push({ key: "diagPerp", mark: [{ pt: x }] });
        if (same(dist(P(0), P(2)), dist(P(1), P(3)))) facts.push({ key: "diagEqual" });
      }
      const pairs: [number, number][] = [[0, 2], [1, 3]];
      for (const [i, j] of pairs) if (par(i, j)) facts.push({ key: "parallel", name: `${sideName(i)} ∥ ${sideName(j)}`, mark: [seg(i), seg(j)] });
      if (!concave && sameDeg(angles[0] + angles[2], 180)) {
        const c = circumcentre(P(0), P(1), P(2));
        if (c) {
          overlay.circum = { c, r: dist(c, P(0)) };
          facts.push({ key: "cyclic", how: `∠${nm(0)} + ∠${nm(2)} = ${num(angles[0])}° + ${num(angles[2])}° = 180°`, mark: [{ ring: [c, dist(c, P(0))] }] });
        }
      }
    }
    sections.push({ key: "diagonals", facts });
  }

  if (tri) sections.push({ key: "triangle", facts: tri.facts });

  // A regular polygon: its angles, apothem and the circles through and inside it.
  if (regular && n >= 3) {
    const s = sides[0];
    const R = s / (2 * Math.sin(Math.PI / n));
    const ap = s / (2 * Math.tan(Math.PI / n));
    const c = mul(pts.reduce((t, p) => add(t, p), [0, 0] as Pt), 1 / n);
    overlay.circum = { c, r: R };
    overlay.incircle = { c, r: ap };
    sections.push({
      key: "regular",
      facts: [
        { key: "interior", v: degV(((n - 2) * 180) / n), how: `(${n} − 2) · 180° / ${n}` },
        { key: "exterior", v: degV(360 / n), how: `360° / ${n}` },
        { key: "central", v: degV(360 / n), how: `360° / ${n}`, mark: [{ corner: [P(0), c, P(1)] }] },
        { key: "apothem", v: len1(ap), how: `a / (2 · tan(180° / ${n})) = ${num(s)} / (2 · tan ${num(180 / n)}°)`, mark: [{ seg: [c, mid(P(0), P(1))] }] },
        { key: "circumradius", v: len1(R), how: `a / (2 · sin(180° / ${n})) = ${num(s)} / (2 · sin ${num(180 / n)}°)`, mark: [{ ring: [c, R] }] },
      ],
    });
  }

  // Symmetry, worked out on the shape shrunk to a unit size (so the tolerance doesn't depend on how big it is).
  if (!isCrossed && !flat) {
    const o = pts[0];
    const unitPts = pts.map((p) => mul(sub(p, o), 1 / scale));
    const s = symmetryOf(unitPts);
    const c = add(o, mul(s.centre, scale));
    overlay.axes = s.axes.map((d) => ({ c, d }));
    sections.push({ key: "symmetry", facts: [{ key: "symLines", v: { n: s.axes.length, dim: 0 } }, { key: "symOrder", v: { n: s.order, dim: 0 } }] });
  }

  return { base, n, tags, sections, overlay, angles, orient };
}

function circumcentre(a: Pt, b: Pt, c: Pt): Pt | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-15) return null;
  const [a2, b2, c2] = [dot(a, a), dot(b, b), dot(c, c)];
  return [(a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d, (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d];
}

/** A triangle's heights, medians, bisectors, centres and laws. Sides a = BC, b = CA, c = AB. */
function triangleFacts(pts: Pt[], names: string[], [a, b, c]: number[], angles: number[], S: number, overlay: Overlay) {
  const [A, B, C] = pts;
  const [nA, nB, nC] = names;
  const facts: Fact[] = [];
  const opp: [Pt, Pt, Pt, number, string][] = [[A, B, C, a, nB + nC], [B, C, A, b, nC + nA], [C, A, B, c, nA + nB]];
  // Heights: from each corner square onto the opposite side (the side's line, when the foot falls outside it).
  opp.forEach(([v, p, q, side, sideName], i) => {
    const foot = footOn(v, p, q);
    overlay.heights.push({ from: v, foot, base: [p, q] });
    facts.push({ key: "height", name: names[i], v: len1((2 * S) / side), how: `2 · S / ${sideName} = 2 · ${num(S)} / ${num(side)}`, mark: [{ seg: [v, foot] }, { corner: [v, foot, p] }] });
  });
  // Medians: from each corner to the middle of the opposite side.
  opp.forEach(([v, p, q], i) => {
    const m = mid(p, q);
    const [x, y, z] = i === 0 ? [b, c, a] : i === 1 ? [c, a, b] : [a, b, c];
    overlay.medians.push([v, m]);
    facts.push({ key: "median", name: names[i], v: len1(dist(v, m)), how: `½ · √(2·${num(x)}² + 2·${num(y)}² − ${num(z)}²)`, mark: [{ seg: [v, m] }] });
  });
  // Angle bisectors: the foot splits the opposite side in the ratio of the other two.
  opp.forEach(([v, p, q], i) => {
    const [lp, lq] = [dist(v, p), dist(v, q)];
    const foot = add(mul(p, lq / (lp + lq)), mul(q, lp / (lp + lq)));
    overlay.bisectors.push([v, foot]);
    facts.push({ key: "bisector", name: names[i], v: len1(dist(v, foot)), how: `2 · ${num(lp)} · ${num(lq)} · cos(${num(angles[i] / 2)}°) / (${num(lp)} + ${num(lq)})`, mark: [{ seg: [v, foot] }] });
  });
  const G = mul(add(add(A, B), C), 1 / 3);
  const O = circumcentre(A, B, C)!;
  const R = (a * b * c) / (4 * S);
  const s = (a + b + c) / 2;
  const r = S / s;
  const I = mul(add(add(mul(A, a), mul(B, b)), mul(C, c)), 1 / (a + b + c));
  const H = sub(add(add(A, B), C), mul(O, 2));
  overlay.circum = { c: O, r: R };
  overlay.incircle = { c: I, r };
  overlay.centres.push({ name: "G", p: G }, { name: "O", p: O }, { name: "I", p: I }, { name: "H", p: H });
  facts.push(
    { key: "centroid", name: "G", v: ptV(G), how: `((${num(A[0])} + ${num(B[0])} + ${num(C[0])}) / 3, (${num(A[1])} + ${num(B[1])} + ${num(C[1])}) / 3)`, mark: [{ pt: G }] },
    { key: "circumcentre", name: "O", v: ptV(O), mark: [{ pt: O }, { ring: [O, R] }] },
    { key: "circumradius", name: "R", v: len1(R), how: `a·b·c / (4·S) = ${num(a)} · ${num(b)} · ${num(c)} / (4 · ${num(S)})`, mark: [{ ring: [O, R] }, { seg: [O, A] }] },
    { key: "incentre", name: "I", v: ptV(I), mark: [{ pt: I }, { ring: [I, r] }] },
    { key: "inradius", name: "r", v: len1(r), how: `S / s = ${num(S)} / ${num(s)}`, mark: [{ ring: [I, r] }] },
    { key: "orthocentre", name: "H", v: ptV(H), mark: [{ pt: H }] },
  );
  const OG = dist(O, G);
  if (OG > 1e-9 * Math.max(a, b, c)) facts.push({ key: "euler", how: `OG = ${num(OG)}, GH = ${num(dist(G, H))} = 2 · OG`, mark: [{ seg: [O, H] }, { pt: G }] });
  facts.push({ key: "sines", how: `${nB}${nC} / sin ${nA} = ${num(a)} / sin ${num(angles[0])}° = ${num(2 * R)} = 2R` });
  // The cosine rule for the biggest angle, and Pythagoras when it is right.
  const k = angles.indexOf(Math.max(...angles));
  const [x, y, z] = k === 0 ? [b, c, a] : k === 1 ? [c, a, b] : [a, b, c];
  const nk = names[k];
  if (Math.abs(angles[k] - 90) <= 1e-6) {
    facts.push({ key: "pythagoras", how: `${num(x)}² + ${num(y)}² = ${num(x * x)} + ${num(y * y)} = ${num(z * z)} = ${rounded(z) ? `(√${num(z * z)})` : num(z)}²`, mark: [{ corner: [pts[(k + 2) % 3], pts[k], pts[(k + 1) % 3]] }] });
  } else {
    facts.push({ key: "cosines", how: `${num(z)}² = ${num(x)}² + ${num(y)}² − 2 · ${num(x)} · ${num(y)} · cos ${nk}` });
  }
  // Area: half the base AB times the height onto it, and Heron's formula from the sides alone.
  const hC = (2 * S) / c;
  const footC = footOn(C, A, B);
  const areaHow = `½ · ${nA}${nB} · h = ½ · ${num(c)} · ${num(hC)} = ${num(S)}`;
  const heron: Fact = { key: "heron", v: sq(S), how: `√(s(s − a)(s − b)(s − c)), s = ${num(s)}` };
  return { facts, areaHow, areaMarks: [{ seg: [A, B] }, { seg: [C, footC] }] as Mark[], heron };
}

/** Everything about a circle. */
export function measureCircle(c: Pt, r: number, name: string): Measured {
  const rx = onHalf(r) ? num(r) : null;
  const exact = (k: number) => (rx ? piText(k) ?? undefined : undefined);
  const eq = `(x ${c[0] < 0 ? "+" : "−"} ${num(Math.abs(c[0]))})² + (y ${c[1] < 0 ? "+" : "−"} ${num(Math.abs(c[1]))})² = ${num(r * r)}`
    .replace("(x − 0)²", "x²")
    .replace("(y − 0)²", "y²");
  const rim: Pt = [c[0] + r, c[1]];
  return {
    base: "circle",
    n: 0,
    tags: [],
    angles: [],
    orient: 1,
    overlay: { diagonals: [], heights: [], medians: [], bisectors: [], centres: [], axes: [] },
    sections: [
      { key: "points", facts: [{ key: "centre", name, v: ptV(c), mark: [{ pt: c }] }] },
      {
        key: "circle",
        facts: [
          { key: "radius", name: "r", v: len1(r), mark: [{ seg: [c, rim] }] },
          { key: "diameter", name: "d", v: len1(2 * r), how: `2r = 2 · ${num(r)}`, mark: [{ seg: [[c[0] - r, c[1]], rim] }] },
          { key: "circumference", name: "C", v: { ...len1(2 * Math.PI * r), exact: exact(2 * r) }, how: `2πr = 2 · π · ${num(r)}`, mark: [{ ring: [c, r] }] },
          { key: "circleArea", name: "S", v: { ...sq(Math.PI * r * r), exact: exact(r * r) }, how: `πr² = π · ${num(r)}²` },
          { key: "equation", how: eq },
        ],
      },
      { key: "symmetry", facts: [{ key: "symLines", v: { n: Infinity, dim: 0 } }, { key: "symOrder", v: { n: Infinity, dim: 0 } }] },
    ],
  };
}

const EMPTY_OVERLAY = (): Overlay => ({ diagonals: [], heights: [], medians: [], bisectors: [], centres: [], axes: [] });
const dirOf = (deg: number): Pt => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
/** Points along an ellipse (a circle when a = b) from one angle to another, for marking it on the picture. */
export function arcPoints(c: Pt, a: number, b: number, rot: number, from: number, to: number): Pt[] {
  const n = Math.max(8, Math.ceil(Math.abs(to - from) / 4));
  const [co, si] = [Math.cos(rot * RAD), Math.sin(rot * RAD)];
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (from + ((to - from) * i) / n) * RAD;
    const [x, y] = [a * Math.cos(t), b * Math.sin(t)];
    return [c[0] + x * co - y * si, c[1] + x * si + y * co] as Pt;
  });
}
/** "(x − 2)²" or "x²" (or "(y + 1)²"). */
const shifted = (v: string, h: number) => (Math.abs(h) < 1e-12 ? `${v}²` : `(${v} ${h < 0 ? "+" : "−"} ${num(Math.abs(h))})²`);

/** Everything about an ellipse: its axes, foci, eccentricity, area, perimeter and equation. */
export function measureEllipse(f: Extract<GeoFig, { kind: "ellipse" }>, name: string): Measured {
  const { c } = f;
  const [A, B] = f.a >= f.b ? [f.a, f.b] : [f.b, f.a];
  const major = f.a >= f.b ? f.rot : f.rot + 90;
  const round = Math.abs(A - B) <= 1e-9 * A;
  const fc = round ? 0 : Math.sqrt(A * A - B * B);
  const [F1, F2] = [add(c, mul(dirOf(major), fc)), add(c, mul(dirOf(major), -fc))];
  const exact = onHalf(A) && onHalf(B) ? piText(A * B) ?? undefined : undefined;
  // Ramanujan's second approximation: within a few parts in a million even for a thin ellipse.
  const h = ((A - B) / (A + B)) ** 2;
  const perimeter = Math.PI * (A + B) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  const turn = ((f.rot % 180) + 180) % 180;
  const eq = turn < 1e-9 || Math.abs(turn - 90) < 1e-9
    ? `${shifted("x", c[0])} / ${num((turn < 1e-9 ? f.a : f.b) ** 2)} + ${shifted("y", c[1])} / ${num((turn < 1e-9 ? f.b : f.a) ** 2)} = 1`
    : `x′² / ${num(f.a ** 2)} + y′² / ${num(f.b ** 2)} = 1, x′ ∠ ${num(f.rot)}°`;
  const [vA, vB] = [add(c, mul(dirOf(major), A)), add(c, mul(dirOf(major + 90), B))];
  const ring: Mark = { path: arcPoints(c, f.a, f.b, f.rot, 0, 360) };
  const overlay = EMPTY_OVERLAY();
  overlay.axes = round ? [] : [{ c, d: dirOf(major) }, { c, d: dirOf(major + 90) }];
  overlay.foci = round ? [c] : [F1, F2];
  const near = (x: number) => onHalf(x) && Math.abs(x) < 1e6;
  return {
    base: "ellipse",
    n: 0,
    tags: round ? ["isCircle"] : [],
    angles: [],
    orient: 1,
    overlay,
    sections: [
      {
        key: "size",
        facts: [
          { key: "perimeter", v: len1(perimeter), how: `≈ π(a + b)(1 + 3h / (10 + √(4 − 3h))), h = ((a − b) / (a + b))² = ${num(h)}`, mark: [ring] },
          { key: "area", v: { ...sq(Math.PI * A * B), exact }, how: `πab = π · ${num(A)} · ${num(B)}` },
        ],
      },
      {
        key: "ellipse",
        facts: [
          { key: "semiMajor", name: "a", v: len1(A), mark: [{ seg: [c, vA] }] },
          { key: "semiMinor", name: "b", v: len1(B), mark: [{ seg: [c, vB] }] },
          { key: "majorAxis", v: len1(2 * A), how: `2a = 2 · ${num(A)}`, mark: [{ seg: [add(c, mul(dirOf(major), -A)), vA] }] },
          { key: "minorAxis", v: len1(2 * B), how: `2b = 2 · ${num(B)}`, mark: [{ seg: [add(c, mul(dirOf(major + 90), -B)), vB] }] },
          { key: "focalDist", name: "c", v: len1(fc, near(A) && near(B) ? surd(A * A - B * B) : null), how: `√(a² − b²) = √(${num(A * A)} − ${num(B * B)})`, mark: [{ seg: [c, F1] }] },
          { key: "eccentricity", name: "e", v: { n: fc / A, dim: 0 }, how: `c / a = ${num(fc)} / ${num(A)}` },
          { key: "focalSum", v: len1(2 * A), how: `PF₁ + PF₂ = 2a`, mark: [{ seg: [F1, vB] }, { seg: [vB, F2] }] },
          { key: "equation", how: eq },
        ],
      },
      { key: "symmetry", facts: [{ key: "symLines", v: { n: round ? Infinity : 2, dim: 0 } }, { key: "symOrder", v: { n: round ? Infinity : 2, dim: 0 } }] },
      {
        key: "points",
        facts: [
          { key: "centre", name, v: ptV(c), mark: [{ pt: c }] },
          ...(round ? [] : [{ key: "focus" as const, name: "F₁", v: ptV(F1), mark: [{ pt: F1 }] }, { key: "focus" as const, name: "F₂", v: ptV(F2), mark: [{ pt: F2 }] }]),
        ],
      },
    ],
  };
}

/** Everything about a sector: its arc, area, perimeter, chord and the segment the chord cuts off. */
export function measureSector(f: Extract<GeoFig, { kind: "sector" }>, name: string): Measured {
  const { c, r, sweep: th } = f;
  const full = th >= 360 - 1e-9;
  const rad = th * RAD;
  const arc = r * rad;
  const area = (r * r * rad) / 2;
  const nice = onHalf(r) && Number.isInteger(Math.round(th * 1e6) / 1e6);
  const exArc = nice ? piText((r * th) / 180) ?? undefined : undefined;
  const exArea = nice ? piText((r * r * th) / 360) ?? undefined : undefined;
  const [P, Q] = [at(f.from, r, c), at(f.from + th, r, c)];
  const arcMark: Mark = { path: arcPoints(c, r, r, 0, f.from, f.from + th) };
  const g = Number.isInteger(th) ? gcd(th, 360) : 0;
  const tags: Tag[] = full ? [] : Math.abs(th - 180) < 1e-9 ? ["semicircle"] : Math.abs(th - 90) < 1e-9 ? ["quadrant"] : [th < 180 ? "minorSector" : "majorSector"];
  const overlay = EMPTY_OVERLAY();
  overlay.axes = full ? [] : [{ c, d: dirOf(f.from + th / 2) }];
  const chord = 2 * r * Math.sin(rad / 2);
  const sizeFacts: Fact[] = [
    { key: "perimeter", v: { ...len1(full ? arc : 2 * r + arc), ...(exArc ? { exact: full ? exArc : `${num(2 * r)} + ${exArc}` } : {}) }, how: full ? "l" : `2r + l = 2 · ${num(r)} + ${num(arc)}`, mark: [arcMark, { seg: [c, P] }, { seg: [c, Q] }] },
    { key: "area", v: { ...sq(area), exact: exArea }, how: `πr² · θ / 360° = π · ${num(r)}² · ${num(th)} / 360` },
  ];
  const sectorFacts: Fact[] = [
    { key: "radius", name: "r", v: len1(r), mark: [{ seg: [c, P] }] },
    { key: "centralAngle", name: "θ", v: degV(th), how: `${num(th)}° = ${num(rad)} rad`, mark: full ? undefined : [{ corner: [P, c, Q] }] },
    { key: "circleShare", v: { n: th / 360, dim: 0, ...(g ? { exact: `${th / g}/${360 / g}` } : {}) }, how: `θ / 360° = ${num(th)} / 360` },
    { key: "arcLength", name: "l", v: { ...len1(arc), exact: exArc }, how: `2πr · θ / 360° = 2 · π · ${num(r)} · ${num(th)} / 360`, mark: [arcMark] },
  ];
  if (!full) {
    sectorFacts.push(
      { key: "chord", name: "PQ", v: len1(chord), how: `2r · sin(θ / 2) = 2 · ${num(r)} · sin ${num(th / 2)}°`, mark: [{ seg: [P, Q] }] },
      { key: "segmentArea", v: sq((r * r * (rad - Math.sin(rad))) / 2), how: `½r²(θ − sin θ) = ½ · ${num(r)}² · (${num(rad)} − ${num(Math.sin(rad))})`, mark: [arcMark, { seg: [P, Q] }] },
    );
  }
  return {
    base: "sector",
    n: 0,
    tags,
    angles: [],
    orient: 1,
    overlay,
    sections: [
      { key: "size", facts: sizeFacts },
      { key: "sector", facts: sectorFacts },
      { key: "symmetry", facts: [{ key: "symLines", v: { n: full ? Infinity : 1, dim: 0 } }, { key: "symOrder", v: { n: full ? Infinity : 1, dim: 0 } }] },
      {
        key: "points",
        facts: [
          { key: "centre", name, v: ptV(c), mark: [{ pt: c }] },
          { key: "arcEnd", name: "P", v: ptV(P), mark: [{ pt: P }] },
          ...(full ? [] : [{ key: "arcEnd" as const, name: "Q", v: ptV(Q), mark: [{ pt: Q }] }]),
        ],
      },
    ],
  };
}

export function measureFig(f: GeoFig, names: string[]): Measured {
  switch (f.kind) {
    case "circle": return measureCircle(f.c, f.r, names[0]);
    case "ellipse": return measureEllipse(f, names[0]);
    case "sector": return measureSector(f, names[0]);
    case "poly": return measurePoly(f.pts, names);
  }
}

/** Angle of p seen from c, in degrees 0…360. */
export const angleOf = (c: Pt, p: Pt) => ((Math.atan2(p[1] - c[1], p[0] - c[0]) / RAD) % 360 + 360) % 360;
/** The angle swept anticlockwise from `from` to `to`, in (0, 360]. */
export const sweepBetween = (from: number, to: number) => {
  const s = (((to - from) % 360) + 360) % 360;
  return s < 1e-9 ? 360 : s;
};
/** Distance from p to the line through c in the direction rot. */
export const offAxis = (c: Pt, rot: number, p: Pt) => Math.abs(cross(dirOf(rot), sub(p, c)));
