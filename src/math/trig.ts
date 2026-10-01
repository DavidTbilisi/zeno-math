// Trigonometry: the unit circle traced into the sine and cosine waves (exact values for multiples
// of 15°), right triangles (SOH CAH TOA), solving any triangle with the laws of sines and cosines
// (including the ambiguous SSA case), transformed graphs y = A·f(B(x − C)) + D, and trig equations
// with all solutions in one turn plus the general solution.
import { compile, parse } from "mathjs";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";
import { axes, C, compose, curve, dot, esc, fill, FONT, hline, lbl, makeFrame, nt, r2, tn, vline, W, type Caption } from "./chart";

export type AngleUnit = "deg" | "rad";
export type TrigFn = "sin" | "cos" | "tan";
export type RightGiven = "oppAdj" | "oppHyp" | "adjHyp" | "angOpp" | "angAdj" | "angHyp";
export type TriCase = "SSS" | "SAS" | "ASA" | "AAS" | "SSA";
export const RIGHT_GIVENS: RightGiven[] = ["oppAdj", "oppHyp", "adjHyp", "angOpp", "angAdj", "angHyp"];
export const TRI_CASES: TriCase[] = ["SSS", "SAS", "ASA", "AAS", "SSA"];
export const TRIG_FNS: TrigFn[] = ["sin", "cos", "tan"];

export type CircleSpec = { topic: "circle"; angle: number; unit: AngleUnit };
/**
 * n, e, s, w: the user's own cue words for the four directions (blank = the language's default).
 * quads: how the quadrants are labelled — by their two neighbouring cues, or by an image of their own
 * (ne, nw, sw, se), each carrying a feeling for its sign pattern.
 */
export type CompassQuads = "neighbours" | "images";
export const COMPASS_QUADS: CompassQuads[] = ["neighbours", "images"];
export type CompassSpec = {
  topic: "compass";
  angle: number;
  unit: AngleUnit;
  n: string;
  e: string;
  s: string;
  w: string;
  quads?: CompassQuads;
  ne?: string;
  nw?: string;
  sw?: string;
  se?: string;
};
export type RightSpec = { topic: "right"; given: RightGiven; opp: string; adj: string; hyp: string; ang: string };
/** Sides a, b, c are opposite angles A, B, C (degrees). Which ones are used depends on the case. */
export type TriangleSpec = { topic: "triangle"; kase: TriCase; a: string; b: string; c: string; A: string; B: string; C: string };
export type GraphSpec = { topic: "graph"; fn: TrigFn; A: string; B: string; C: string; D: string; unit: AngleUnit };
export type EquationSpec = { topic: "equation"; fn: TrigFn; k: string; unit: AngleUnit };
export type TrigSpec = CircleSpec | CompassSpec | RightSpec | TriangleSpec | GraphSpec | EquationSpec;
export type TrigTopic = TrigSpec["topic"];
export type TrigSpecOf<K extends TrigTopic> = Extract<TrigSpec, { topic: K }>;
export const TRIG_TOPICS: TrigTopic[] = ["circle", "compass", "right", "triangle", "graph", "equation"];

export type TrigWords = {
  quadrant: string;
  quadrantRules: string[];
  onAxis: string;
  refAngle: string;
  soh: string;
  opp: string;
  adj: string;
  hyp: string;
  given: string;
  noTriangle: string;
  reasons: { inequality: string; angles: string; tooShort: string; hypShort: string };
  ambiguous: string;
  oneTriangle: string;
  amplitude: string;
  period: string;
  phase: string;
  midline: string;
  solutions: string;
  noSolution: string;
  badNumber: string;
  compass: {
    dirs: Record<"n" | "e" | "s" | "w" | "ne" | "nw" | "sw" | "se", string>;
    names: Record<"n" | "e" | "s" | "w" | "ne" | "nw" | "sw" | "se", string>;
    cues: Record<"n" | "e" | "s" | "w", string>;
    images: Record<"ne" | "nw" | "sw" | "se", string>;
    feels: Record<"ne" | "nw" | "sw" | "se", string>;
    quads: Record<CompassQuads, string>;
    gaze: string;
    diagonal: string;
    legendDirs: string;
    legendQuads: string;
    pos: string;
    neg: string;
    says: string;
    axis: string;
    bearing: string;
  };
};

export const TRIG_PRESETS: { [K in TrigTopic]: { label: string; spec: TrigSpecOf<K> }[] } = {
  circle: [
    { label: "30°", spec: { topic: "circle", angle: 30, unit: "deg" } },
    { label: "135°", spec: { topic: "circle", angle: 135, unit: "deg" } },
    { label: "210°", spec: { topic: "circle", angle: 210, unit: "deg" } },
    { label: "300°", spec: { topic: "circle", angle: 300, unit: "deg" } },
    { label: "5π/6", spec: { topic: "circle", angle: 150, unit: "rad" } },
    { label: "−45°", spec: { topic: "circle", angle: -45, unit: "deg" } },
  ],
  compass: [
    { label: "30°", spec: { topic: "compass", angle: 30, unit: "deg", n: "", e: "", s: "", w: "" } },
    { label: "135°", spec: { topic: "compass", angle: 135, unit: "deg", n: "", e: "", s: "", w: "" } },
    { label: "4π/3", spec: { topic: "compass", angle: 240, unit: "rad", n: "", e: "", s: "", w: "" } },
    { label: "300°", spec: { topic: "compass", angle: 300, unit: "deg", n: "", e: "", s: "", w: "" } },
    { label: "90°", spec: { topic: "compass", angle: 90, unit: "deg", n: "", e: "", s: "", w: "" } },
    { label: "225° · images", spec: { topic: "compass", angle: 225, unit: "deg", n: "", e: "", s: "", w: "", quads: "images" } },
    { label: "120° · images", spec: { topic: "compass", angle: 120, unit: "deg", n: "", e: "", s: "", w: "", quads: "images" } },
  ],
  right: [
    { label: "3, 4 → ?", spec: { topic: "right", given: "oppAdj", opp: "3", adj: "4", hyp: "5", ang: "30" } },
    { label: "θ = 35°, hyp 10", spec: { topic: "right", given: "angHyp", opp: "3", adj: "4", hyp: "10", ang: "35" } },
    { label: "θ = 60°, adj 5", spec: { topic: "right", given: "angAdj", opp: "3", adj: "5", hyp: "5", ang: "60" } },
    { label: "opp 7, hyp 25", spec: { topic: "right", given: "oppHyp", opp: "7", adj: "4", hyp: "25", ang: "30" } },
  ],
  triangle: [
    { label: "SSS 7, 8, 9", spec: { topic: "triangle", kase: "SSS", a: "7", b: "8", c: "9", A: "40", B: "60", C: "80" } },
    { label: "SAS b = 5, c = 7, A = 49°", spec: { topic: "triangle", kase: "SAS", a: "7", b: "5", c: "7", A: "49", B: "60", C: "80" } },
    { label: "ASA A = 40°, B = 65°, c = 10", spec: { topic: "triangle", kase: "ASA", a: "7", b: "8", c: "10", A: "40", B: "65", C: "80" } },
    { label: "SSA: two triangles", spec: { topic: "triangle", kase: "SSA", a: "6", b: "8", c: "9", A: "40", B: "60", C: "80" } },
    { label: "SSA: no triangle", spec: { topic: "triangle", kase: "SSA", a: "3", b: "8", c: "9", A: "40", B: "60", C: "80" } },
  ],
  graph: [
    { label: "y = sin x", spec: { topic: "graph", fn: "sin", A: "1", B: "1", C: "0", D: "0", unit: "rad" } },
    { label: "y = 2 sin 2x", spec: { topic: "graph", fn: "sin", A: "2", B: "2", C: "0", D: "0", unit: "rad" } },
    { label: "y = 3 cos(x − π/4) + 1", spec: { topic: "graph", fn: "cos", A: "3", B: "1", C: "pi/4", D: "1", unit: "rad" } },
    { label: "y = −sin(x/2)", spec: { topic: "graph", fn: "sin", A: "-1", B: "1/2", C: "0", D: "0", unit: "rad" } },
    { label: "y = tan x", spec: { topic: "graph", fn: "tan", A: "1", B: "1", C: "0", D: "0", unit: "rad" } },
    { label: "y = 2 sin(3(x − 30°))", spec: { topic: "graph", fn: "sin", A: "2", B: "3", C: "30", D: "0", unit: "deg" } },
  ],
  equation: [
    { label: "sin x = 1/2", spec: { topic: "equation", fn: "sin", k: "1/2", unit: "deg" } },
    { label: "cos x = −√3/2", spec: { topic: "equation", fn: "cos", k: "-sqrt(3)/2", unit: "deg" } },
    { label: "tan x = 1", spec: { topic: "equation", fn: "tan", k: "1", unit: "rad" } },
    { label: "sin x = 0.3", spec: { topic: "equation", fn: "sin", k: "0.3", unit: "deg" } },
    { label: "cos x = 2", spec: { topic: "equation", fn: "cos", k: "2", unit: "deg" } },
  ],
};

// ---------- exact values ----------

const SIN_T = ["0", "\\frac{\\sqrt{6}-\\sqrt{2}}{4}", "\\frac{1}{2}", "\\frac{\\sqrt{2}}{2}", "\\frac{\\sqrt{3}}{2}", "\\frac{\\sqrt{6}+\\sqrt{2}}{4}", "1"];
const TAN_T = ["0", "2-\\sqrt{3}", "\\frac{\\sqrt{3}}{3}", "1", "\\sqrt{3}", "2+\\sqrt{3}"];
const NEG: Record<string, string> = { "2-\\sqrt{3}": "\\sqrt{3}-2", "2+\\sqrt{3}": "-2-\\sqrt{3}" };
const neg = (t: string) => (t === "0" ? "0" : NEG[t] ?? `-${t}`);
const mod = (x: number, m: number) => ((x % m) + m) % m;
const near = (x: number, y: number) => Math.abs(x - y) < 1e-9;

/** Exact sin, cos, tan for multiples of 15° (null otherwise); tan is null where undefined. */
function exact(deg: number): { sin: string; cos: string; tan: string | null } | null {
  if (!near(deg / 15, Math.round(deg / 15))) return null;
  const d = mod(Math.round(deg), 360);
  const q = Math.floor(d / 90);
  const ref = [d, 180 - d, d - 180, 360 - d][q];
  const i = ref / 15;
  const [sS, sC] = [[1, 1], [1, -1], [-1, -1], [-1, 1]][q];
  const s = sS > 0 ? SIN_T[i] : neg(SIN_T[i]);
  const c = sC > 0 ? SIN_T[6 - i] : neg(SIN_T[6 - i]);
  const tan = i === 6 ? null : sS * sC > 0 ? TAN_T[i] : neg(TAN_T[i]);
  // On the axes (0°, 90°, …) keep signs tidy.
  return { sin: s === "-0" ? "0" : s, cos: c === "-0" ? "0" : c, tan: tan === "-0" ? "0" : tan };
}

/** Degrees as a multiple of π (150 → 5π/6); decimals when not a nice fraction. */
function radTex(deg: number): string {
  if (!near(deg, Math.round(deg * 1e6) / 1e6) || !Number.isInteger(Math.round(deg * 4) / 4)) return tn((deg * Math.PI) / 180);
  const f = new Frac(Math.round(deg * 4), 720);
  if (f.isZero()) return "0";
  const n = Math.abs(f.n);
  const body = f.d === 1 ? `${n === 1 ? "" : n}\\pi` : `\\frac{${n === 1 ? "" : n}\\pi}{${f.d}}`;
  return (f.isNeg() ? "-" : "") + body;
}
const radText = (deg: number) =>
  radTex(deg)
    .replace(/\\frac\{(\d*)\\pi\}\{(\d+)\}/, "$1π/$2")
    .replace("\\pi", "π")
    .replace(/^-/, "−");
const angleTex = (deg: number, unit: AngleUnit) => (unit === "deg" ? `${nt(deg, 2).replace("−", "-")}^\\circ` : radTex(deg));
const angleText = (deg: number, unit: AngleUnit) => (unit === "deg" ? `${nt(deg, 2)}°` : radText(deg));

type Val = { v: number; tex: string };
function val(s: string, w: TrigWords): Val {
  let v: unknown;
  try {
    v = compile(s).evaluate({});
  } catch {
    v = NaN;
  }
  if (!s.trim() || typeof v !== "number" || !Number.isFinite(v)) throw new Error(fill(w.badNumber, { s }));
  const f = Frac.parse(s);
  return { v, tex: f ? f.tex() : parse(s).toTex({ parenthesis: "auto", implicit: "hide" }) };
}
const RAD = Math.PI / 180;

// ---------- drawing helpers ----------

function arrow(x0: number, y0: number, x1: number, y1: number, color: string, width = 2): string {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const L = Math.hypot(dx, dy);
  if (L < 1) return "";
  const [ux, uy] = [dx / L, dy / L];
  const h = Math.min(9, L / 2);
  return (
    `<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(x1 - ux * h * 0.6)}" y2="${r2(y1 - uy * h * 0.6)}" stroke="${color}" stroke-width="${width}"/>` +
    `<path d="M${r2(x1)},${r2(y1)}L${r2(x1 - ux * h - uy * h * 0.45)},${r2(y1 - uy * h + ux * h * 0.45)}L${r2(x1 - ux * h + uy * h * 0.45)},${r2(y1 - uy * h - ux * h * 0.45)}z" fill="${color}"/>`
  );
}
/** Arc of an angle at (cx, cy), from angle a0 to a1 (radians, maths orientation). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.05));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return `${r2(cx + r * Math.cos(a))},${r2(cy - r * Math.sin(a))}`;
  });
  return `M${pts.join("L")}`;
}
const txt = (x: number, y: number, s: string, color: string, anchor = "middle", size = 13) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${size}" font-weight="600" fill="${color}" text-anchor="${anchor}" paint-order="stroke" stroke="#ffffff" stroke-width="3.5">${esc(s)}</text>`;

// ---------- unit circle ----------

function renderCircle(s: CircleSpec, w: TrigWords): RenderedSvg {
  const deg = s.angle;
  const t = deg * RAD;
  const [c, sn] = [Math.cos(t), Math.sin(t)];
  const ex = exact(deg);
  const R = 118;
  const [cx, cy] = [150, 190];
  const P = [cx + R * c, cy - R * sn];
  const parts: string[] = [];
  // Grid axes and circle.
  parts.push(
    `<line x1="${cx - R - 22}" y1="${cy}" x2="${cx + R + 22}" y2="${cy}" stroke="#495057" stroke-width="1.2"/>`,
    `<line x1="${cx}" y1="${cy - R - 22}" x2="${cx}" y2="${cy + R + 22}" stroke="#495057" stroke-width="1.2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#adb5bd" stroke-width="1.6"/>`,
    txt(cx + R + 6, cy + 16, "1", C.grey, "start", 11),
    txt(cx - 4, cy - R - 6, "1", C.grey, "end", 11),
  );
  // Quadrant letters (All Students Take Calculus).
  const q = mod(deg, 360);
  const quad = near(q % 90, 0) ? 0 : Math.floor(q / 90) + 1;
  (["A", "S", "T", "C"] as const).forEach((L, i) => {
    const a = (45 + 90 * i) * RAD;
    parts.push(txt(cx + R * 0.72 * Math.cos(a), cy - R * 0.72 * Math.sin(a) + 5, L, quad === i + 1 ? C.orange : "#ced4da", "middle", 16));
  });
  // Angle arc (all turns), radius, cos (green) and sin (red) legs, tan on the tangent line x = 1.
  parts.push(`<path d="${arcPath(cx, cy, 26, 0, t)}" fill="none" stroke="${C.orange}" stroke-width="2"/>`);
  parts.push(`<line x1="${cx}" y1="${cy}" x2="${r2(P[0])}" y2="${r2(P[1])}" stroke="${C.ink}" stroke-width="2.2"/>`);
  parts.push(
    `<line x1="${cx}" y1="${cy}" x2="${r2(P[0])}" y2="${cy}" stroke="${C.green}" stroke-width="4"/>`,
    `<line x1="${r2(P[0])}" y1="${cy}" x2="${r2(P[0])}" y2="${r2(P[1])}" stroke="${C.red}" stroke-width="4"/>`,
  );
  if (Math.abs(c) > 1e-9 && Math.abs(sn / c) < 1.6) {
    const ty = cy - R * (sn / c);
    parts.push(
      `<line x1="${cx + R}" y1="${cy - R * 1.7}" x2="${cx + R}" y2="${cy + R * 1.7}" stroke="#ffd8a8" stroke-width="1.2"/>`,
      `<line x1="${cx + R}" y1="${cy}" x2="${cx + R}" y2="${r2(ty)}" stroke="${C.orange}" stroke-width="4"/>`,
      `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${r2(ty)}" stroke="${C.orange}" stroke-width="1" stroke-dasharray="4 3"/>`,
    );
  }
  // Label next to P, kept inside the picture on the left.
  const lx = c >= 0 ? P[0] + 10 : Math.max(P[0] - 10, 100);
  parts.push(dot(P[0], P[1], C.ink, 5), txt(lx, P[1] + (sn >= 0 ? -10 : 20), "P(cos θ, sin θ)", C.ink, c >= 0 ? "start" : "end", 12));

  // The waves: x from 0 to 360°, sharing the circle's vertical scale.
  const gx0 = 312;
  const gw = 310;
  const gxs = (d: number) => gx0 + (gw * d) / 360;
  const wave = (f: (a: number) => number) => {
    const pts = Array.from({ length: 181 }, (_, i) => `${r2(gxs(i * 2))},${r2(cy - R * f(i * 2 * RAD))}`);
    return `M${pts.join("L")}`;
  };
  const ticks = [0, 90, 180, 270, 360];
  parts.push(
    `<line x1="${gx0}" y1="${cy}" x2="${gx0 + gw + 10}" y2="${cy}" stroke="#495057" stroke-width="1.2"/>`,
    `<line x1="${gx0}" y1="${cy - R - 10}" x2="${gx0}" y2="${cy + R + 10}" stroke="#495057" stroke-width="1.2"/>`,
    ...ticks.map((d) => `<line x1="${r2(gxs(d))}" y1="${cy - 4}" x2="${r2(gxs(d))}" y2="${cy + 4}" stroke="#495057"/>` + txt(gxs(d), cy + 18, s.unit === "deg" ? `${d}°` : radText(d), C.grey, "middle", 11)),
    `<path d="${wave(Math.cos)}" fill="none" stroke="${C.green}" stroke-width="1.6" opacity="0.55"/>`,
    `<path d="${wave(Math.sin)}" fill="none" stroke="${C.red}" stroke-width="2.4"/>`,
    txt(gx0 + gw + 4, cy - R * Math.sin(360 * RAD) - 8, "sin", C.red, "end", 12),
    txt(gx0 + gw + 4, cy - R + 14, "cos", C.green, "end", 12),
  );
  const qx = gxs(q);
  parts.push(
    `<line x1="${r2(P[0])}" y1="${r2(P[1])}" x2="${r2(qx)}" y2="${r2(P[1])}" stroke="${C.red}" stroke-width="1.2" stroke-dasharray="5 4"/>`,
    `<line x1="${r2(qx)}" y1="${cy}" x2="${r2(qx)}" y2="${r2(P[1])}" stroke="${C.red}" stroke-width="3"/>`,
    dot(qx, P[1], C.red, 5),
    dot(qx, cy - R * c, C.green, 4),
  );

  const f = (v: string | null, num: number) => (v ?? tn(num));
  const tanTex = Math.abs(c) < 1e-12 ? "\\text{—}" : ex ? f(ex.tan, sn / c) : tn(sn / c);
  const tex =
    `\\theta = ${angleTex(deg, "deg")} = ${radTex(deg)} \\qquad ` +
    `{\\color{#2f9e44}\\cos\\theta = ${ex ? ex.cos : tn(c)}} \\quad {\\color{#e03131}\\sin\\theta = ${ex ? ex.sin : tn(sn)}} \\quad {\\color{#e8590c}\\tan\\theta = ${tanTex}}`;
  const ref = [q, 180 - q, q - 180, 360 - q][Math.min(3, Math.floor(q / 90))];
  const captions: Caption[] = [
    quad ? { text: fill(w.quadrant, { q: ["I", "II", "III", "IV"][quad - 1], rule: w.quadrantRules[quad - 1] }) } : { text: w.onAxis },
  ];
  if (quad) captions.push({ text: fill(w.refAngle, { r: angleText(ref, s.unit) }), color: C.orange });
  return compose(tex, parts.join(""), 380, captions);
}

// ---------- compass ----------

type Dir8 = "n" | "e" | "s" | "w" | "ne" | "nw" | "sw" | "se";
// Quadrant tints (I to IV) and their stronger outline colours.
const QUAD_FILL = ["#d3f9d8", "#f3d9fa", "#fff3bf", "#c5f6fa"];
const QUAD_INK = [C.green, C.purple, "#f08c00", "#1098ad"];
const QUAD_DIR: Dir8[] = ["ne", "nw", "sw", "se"];

/** The unit circle as a compass: up/down (N/S) is the sign of sin, right/left (E/W) the sign of cos,
 *  and every quadrant is named and remembered by its two neighbouring directions. */
function renderCompass(s: CompassSpec, w: TrigWords): RenderedSvg {
  const cw = w.compass;
  const cue = { n: s.n.trim() || cw.cues.n, e: s.e.trim() || cw.cues.e, s: s.s.trim() || cw.cues.s, w: s.w.trim() || cw.cues.w };
  const images = s.quads === "images";
  const image = { ne: s.ne?.trim() || cw.images.ne, nw: s.nw?.trim() || cw.images.nw, sw: s.sw?.trim() || cw.images.sw, se: s.se?.trim() || cw.images.se };
  const deg = s.angle;
  const t = deg * RAD;
  const [c, sn] = [Math.cos(t), Math.sin(t)];
  const ex = exact(deg);
  const q = mod(deg, 360);
  const quad = near(q % 90, 0) || near(q % 90, 90) ? 0 : Math.floor(q / 90) + 1;
  const R = 150;
  const [cx, cy] = [190, 196];
  const at = (a: number, r: number): [number, number] => [cx + r * Math.cos(a * RAD), cy - r * Math.sin(a * RAD)];
  const parts: string[] = [];

  // Quadrant wedges; the one θ lands in is solid and outlined.
  QUAD_FILL.forEach((fillColor, i) => {
    const [x0, y0] = at(90 * i, R);
    const [x1, y1] = at(90 * (i + 1), R);
    const on = quad === i + 1;
    parts.push(
      `<path d="M${cx},${cy}L${r2(x0)},${r2(y0)}A${R},${R} 0 0 0 ${r2(x1)},${r2(y1)}z" fill="${fillColor}" opacity="${on ? 1 : 0.4}"` +
        (on ? ` stroke="${QUAD_INK[i]}" stroke-width="2.5"` : "") + `/>`,
    );
  });
  // Rim with ticks every 15°, axes, and the cardinal letters (N/S red like sin, E/W green like cos).
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#868e96" stroke-width="1.6"/>`);
  for (let a = 0; a < 360; a += 15) {
    const [x0, y0] = at(a, R);
    const [x1, y1] = at(a, R - (a % 45 === 0 ? 10 : 5));
    parts.push(`<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(x1)}" y2="${r2(y1)}" stroke="#868e96" stroke-width="1.2"/>`);
  }
  parts.push(
    `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#495057" stroke-width="1.2"/>`,
    `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#495057" stroke-width="1.2"/>`,
  );
  const axisOn: Dir8 | null = quad ? null : (["e", "n", "w", "s"] as const)[Math.round(q / 90) % 4];
  const cards: [Dir8, number, string, string][] = [
    ["n", 90, C.red, "sin +"],
    ["e", 0, C.green, "cos +"],
    ["s", 270, C.red, "sin −"],
    ["w", 180, C.green, "cos −"],
  ];
  for (const [d, a, color, rule] of cards) {
    const [lx, ly] = at(a, R + 16);
    const big = axisOn === d ? 24 : 20;
    parts.push(txt(lx, ly + 7, cw.dirs[d], color, "middle", big));
    // Cue word and its rule just inside the rim.
    const inside: Record<string, [number, number, string]> = {
      n: [cx, cy - R + 26, "middle"],
      s: [cx, cy + R - 26, "middle"],
      e: [cx + R - 14, cy - 8, "end"],
      w: [cx - R + 14, cy - 8, "start"],
    };
    const [ix, iy, anchor] = inside[d];
    const dy = d === "s" ? -16 : 16;
    parts.push(txt(ix, d === "s" ? iy + 4 : iy, cue[d as "n"], color, anchor, 12), txt(ix, (d === "s" ? iy + 4 : iy) + (d === "s" ? dy : 22), rule, color, anchor, 12));
  }
  // Each quadrant: its name and the two cues it is made of.
  QUAD_DIR.forEach((d, i) => {
    // Step the label aside when the needle runs through the middle of its quadrant.
    const mid = 45 + 90 * i;
    const off = mod(deg - mid + 180, 360) - 180;
    const aside = Math.abs(off) < 22;
    const [x, y] = at(aside ? mid + (off >= 0 ? -21 : 21) : mid, R * (aside ? 0.52 : 0.6));
    const v = i < 2 ? "n" : "s";
    const h = i === 0 || i === 3 ? "e" : "w";
    const on = quad === i + 1;
    parts.push(txt(x, y - 14, cw.dirs[d], QUAD_INK[i], "middle", on ? 17 : 15));
    if (images)
      // The diagonal's own image, and the feeling that carries its sign pattern.
      parts.push(txt(x, y + 2, image[d as "ne"], QUAD_INK[i], "middle", 11), txt(x, y + 16, cw.feels[d as "ne"], C.grey, "middle", 10));
    else parts.push(txt(x, y + 2, cue[v], C.red, "middle", 11), txt(x, y + 16, cue[h], C.green, "middle", 11));
  });

  // θ from East anticlockwise (orange) and the compass bearing from North clockwise (blue, dashed).
  const bearing = mod(90 - deg, 360);
  const [px, py] = at(deg, R);
  parts.push(
    `<path d="${arcPath(cx, cy, 24, 0, t)}" fill="none" stroke="${C.orange}" stroke-width="2.2"/>`,
    `<path d="${arcPath(cx, cy, 40, Math.PI / 2, Math.PI / 2 - bearing * RAD)}" fill="none" stroke="${C.blue}" stroke-width="1.8" stroke-dasharray="5 3"/>`,
    arrow(cx, cy, px, py, C.ink, 2.6),
    dot(cx, cy, C.ink, 3.5),
    dot(px, py, C.ink, 5),
  );
  const [tx, ty] = at(deg / 2, 33);
  parts.push(txt(tx, ty + 4, "θ", C.orange, "middle", 13));

  // Legend: the four rules and the four quadrants, the current one highlighted.
  const lx = 372;
  const card = (y: number, h: number, title: string) =>
    `<rect x="${lx}" y="${y}" width="${W - lx - 12}" height="${h}" rx="8" fill="#f8f9fa" stroke="#dee2e6"/>` + txt(lx + 12, y + 20, title, C.ink, "start", 13);
  parts.push(card(40, 128, cw.legendDirs));
  cards.forEach(([d, , color, rule], i) => {
    const y = 40 + 44 + 22 * i;
    if (axisOn === d) parts.push(`<rect x="${lx + 6}" y="${y - 15}" width="${W - lx - 24}" height="21" rx="4" fill="${color}" opacity="0.12"/>`);
    parts.push(txt(lx + 14, y, cw.dirs[d], color, "start", 13), txt(lx + 46, y, `${cue[d as "n"]} → ${rule}`, color, "start", 12));
  });
  // Quadrants as a 2×2 grid laid out like the compass: sin is a red ↑/↓ (North/South), cos a green →/← (East/West),
  // and tan = sin / cos is + exactly when the two arrows agree.
  parts.push(card(184, 178, cw.legendQuads));
  const cellW = (W - lx - 12 - 22) / 2;
  const cellH = 64;
  QUAD_DIR.forEach((d, i) => {
    const up = i < 2;
    const right = i === 0 || i === 3;
    const x = lx + 8 + (right ? cellW + 6 : 0);
    const y = 184 + 32 + (up ? 0 : cellH + 6);
    const on = quad === i + 1;
    parts.push(
      `<rect x="${r2(x)}" y="${y}" width="${r2(cellW)}" height="${cellH}" rx="6" fill="${QUAD_FILL[i]}" opacity="${on ? 1 : 0.55}"` +
        (on ? ` stroke="${QUAD_INK[i]}" stroke-width="2.5"` : "") + `/>`,
      txt(x + 8, y + 16, `${cw.dirs[d]} (${["I", "II", "III", "IV"][i]})`, QUAD_INK[i], "start", 12),
      txt(x + 8, y + 35, "sin", C.red, "start", 12),
      arrow(x + 44, up ? y + 39 : y + 23, x + 44, up ? y + 23 : y + 39, C.red, 2),
      txt(x + 56, y + 35, up ? "+" : "−", C.red, "start", 13),
      txt(x + 8, y + 54, "cos", C.green, "start", 12),
      arrow(right ? x + 36 : x + 52, y + 50, right ? x + 52 : x + 36, y + 50, C.green, 2),
      txt(x + 56, y + 54, right ? "+" : "−", C.green, "start", 13),
      txt(x + cellW - 8, y + 46, `tan ${up === right ? "+" : "−"}`, C.orange, "end", 13),
    );
  });

  // Header: the values with their signs.
  const cmp = (v: number) => (Math.abs(v) < 1e-12 ? "= 0" : v > 0 ? "> 0" : "< 0");
  const valTex = (e: string | undefined, v: number) => (e ?? tn(v));
  const tanTex = Math.abs(c) < 1e-12 ? "\\text{—}" : `${ex ? valTex(ex.tan ?? undefined, sn / c) : tn(sn / c)} ${cmp(sn / c)}`;
  const tex =
    `\\theta = ${angleTex(deg, "deg")} = ${radTex(deg)} \\qquad ` +
    `{\\color{#e03131}\\sin\\theta = ${ex ? ex.sin : tn(sn)} ${Math.abs(sn) < 1e-12 ? "" : cmp(sn)}} \\quad ` +
    `{\\color{#2f9e44}\\cos\\theta = ${ex ? ex.cos : tn(c)} ${Math.abs(c) < 1e-12 ? "" : cmp(c)}} \\quad ` +
    `{\\color{#e8590c}\\tan\\theta = ${tanTex}}`;

  const a = angleText(deg, s.unit);
  const captions: Caption[] = [];
  if (quad) {
    const v = quad <= 2 ? "n" : "s";
    const h = quad === 1 || quad === 4 ? "e" : "w";
    captions.push({
      text: fill(cw.says, {
        a,
        dir: cw.names[QUAD_DIR[quad - 1]],
        v: cw.names[v],
        h: cw.names[h],
        vcue: cue[v],
        hcue: cue[h],
        vs: v === "n" ? "> 0" : "< 0",
        hs: h === "e" ? "> 0" : "< 0",
        ts: (v === "n") === (h === "e") ? cw.pos : cw.neg,
      }),
      color: QUAD_INK[quad - 1],
    });
  } else {
    const d = axisOn!;
    const fn = d === "n" || d === "s" ? "sin" : "cos";
    captions.push({ text: fill(cw.axis, { a, dir: cw.names[d], cue: cue[d as "n"], fn, val: d === "n" || d === "e" ? "1" : "−1", other: fn === "sin" ? "cos" : "sin" }) });
  }
  const b = Math.round(bearing * 100) / 100;
  const bText = Number.isInteger(b) ? `${String(b).padStart(3, "0")}°` : `${nt(b, 2)}°`;
  captions.push({ text: fill(cw.bearing, { b: bText }), color: C.blue });
  // Exactly on a diagonal (45°, 135°, …): sin and cos have the same size.
  if (near(mod(deg - 45, 90), 0)) captions.push({ text: cw.diagonal, color: QUAD_INK[quad - 1] });
  captions.push({ text: cw.gaze, color: "#495057" });
  return compose(tex, parts.join(""), 372, captions);
}

// ---------- right triangles ----------

function renderRight(s: RightSpec, w: TrigWords): RenderedSvg {
  const need = { oppAdj: ["opp", "adj"], oppHyp: ["opp", "hyp"], adjHyp: ["adj", "hyp"], angOpp: ["ang", "opp"], angAdj: ["ang", "adj"], angHyp: ["ang", "hyp"] }[s.given];
  const g = Object.fromEntries(need.map((k) => [k, val(s[k as "opp"], w)])) as Record<string, Val>;
  let opp: number, adj: number, hyp: number, th: number;
  const rows: string[] = [];
  const reason = (r: string) => {
    throw new Error(fill(w.noTriangle, { reason: r }));
  };
  for (const k of need) if (!(g[k].v > 0)) reason(w.reasons.inequality);
  switch (s.given) {
    case "oppAdj":
      [opp, adj] = [g.opp.v, g.adj.v];
      th = Math.atan2(opp, adj) / RAD;
      hyp = Math.hypot(opp, adj);
      rows.push(`\\tan\\theta = \\frac{a}{b} = \\frac{${g.opp.tex}}{${g.adj.tex}} \\;\\Rightarrow\\; \\theta = \\tan^{-1}\\frac{${g.opp.tex}}{${g.adj.tex}} \\approx ${tn(th, 2)}^\\circ`, `c = \\sqrt{${g.opp.tex}^2 + ${g.adj.tex}^2} = ${tn(hyp, 3)}`);
      break;
    case "oppHyp":
      [opp, hyp] = [g.opp.v, g.hyp.v];
      if (opp >= hyp) reason(w.reasons.hypShort);
      th = Math.asin(opp / hyp) / RAD;
      adj = Math.sqrt(hyp * hyp - opp * opp);
      rows.push(`\\sin\\theta = \\frac{a}{c} = \\frac{${g.opp.tex}}{${g.hyp.tex}} \\;\\Rightarrow\\; \\theta \\approx ${tn(th, 2)}^\\circ`, `b = \\sqrt{${g.hyp.tex}^2 - ${g.opp.tex}^2} = ${tn(adj, 3)}`);
      break;
    case "adjHyp":
      [adj, hyp] = [g.adj.v, g.hyp.v];
      if (adj >= hyp) reason(w.reasons.hypShort);
      th = Math.acos(adj / hyp) / RAD;
      opp = Math.sqrt(hyp * hyp - adj * adj);
      rows.push(`\\cos\\theta = \\frac{b}{c} = \\frac{${g.adj.tex}}{${g.hyp.tex}} \\;\\Rightarrow\\; \\theta \\approx ${tn(th, 2)}^\\circ`, `a = \\sqrt{${g.hyp.tex}^2 - ${g.adj.tex}^2} = ${tn(opp, 3)}`);
      break;
    default: {
      th = g.ang.v;
      if (!(th > 0 && th < 90)) reason(w.reasons.angles);
      const [sn, cs, tg] = [Math.sin(th * RAD), Math.cos(th * RAD), Math.tan(th * RAD)];
      const A = `${g.ang.tex}^\\circ`;
      if (s.given === "angOpp") {
        opp = g.opp.v;
        hyp = opp / sn;
        adj = opp / tg;
        rows.push(`c = \\frac{a}{\\sin\\theta} = \\frac{${g.opp.tex}}{\\sin ${A}} = ${tn(hyp, 3)}`, `b = \\frac{a}{\\tan\\theta} = \\frac{${g.opp.tex}}{\\tan ${A}} = ${tn(adj, 3)}`);
      } else if (s.given === "angAdj") {
        adj = g.adj.v;
        hyp = adj / cs;
        opp = adj * tg;
        rows.push(`a = b\\cdot\\tan\\theta = ${g.adj.tex}\\tan ${A} = ${tn(opp, 3)}`, `c = \\frac{b}{\\cos\\theta} = \\frac{${g.adj.tex}}{\\cos ${A}} = ${tn(hyp, 3)}`);
      } else {
        hyp = g.hyp.v;
        opp = hyp * sn;
        adj = hyp * cs;
        rows.push(`a = c\\cdot\\sin\\theta = ${g.hyp.tex}\\sin ${A} = ${tn(opp, 3)}`, `b = c\\cdot\\cos\\theta = ${g.hyp.tex}\\cos ${A} = ${tn(adj, 3)}`);
      }
    }
  }
  rows.push(`90^\\circ - \\theta \\approx ${tn(90 - th, 2)}^\\circ`);

  // Triangle: θ at the left, right angle at the bottom right.
  const k = Math.min(420 / adj, 240 / opp);
  const [x0, y0] = [110, 270];
  const [x1, y1] = [x0 + adj * k, y0 - opp * k];
  const isGiven = (key: string) => need.includes(key);
  const col = (key: string) => (isGiven(key) ? C.blue : C.orange);
  const parts = [
    `<polygon points="${x0},${y0} ${r2(x1)},${y0} ${r2(x1)},${r2(y1)}" fill="#e7f5ff" stroke="${C.ink}" stroke-width="2"/>`,
    `<path d="M${r2(x1 - 14)},${y0} v-14 h14" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`,
    `<path d="${arcPath(x0, y0, 34, 0, th * RAD)}" fill="none" stroke="${col("ang")}" stroke-width="2"/>`,
    txt(x0 + 44, y0 - 8, `θ ≈ ${nt(th, 2)}°`, col("ang"), "start", 13),
    txt((x0 + x1) / 2, y0 + 22, `${w.adj} b = ${nt(adj, 3)}`, col("adj"), "middle", 14),
    txt(x1 + 10, (y0 + y1) / 2 + 5, `${w.opp} a = ${nt(opp, 3)}`, col("opp"), "start", 14),
    txt((x0 + x1) / 2 - 14, (y0 + y1) / 2 - 10, `${w.hyp} c = ${nt(hyp, 3)}`, col("hyp"), "end", 14),
  ];
  const tex = `\\begin{gathered} ${rows.join(" \\\\[3pt] ")} \\end{gathered}`;
  return compose(tex, parts.join(""), 296, [{ text: w.soh }, { text: w.given, color: C.blue }]);
}

// ---------- any triangle ----------

type Tri = { a: number; b: number; c: number; A: number; B: number; C: number };

function drawTriangle(t: Tri, ox: number, width: number, labelGiven: Set<string>, tag = ""): string {
  // A at the origin, B on the x-axis, C above.
  const pts = [
    [0, 0],
    [t.c, 0],
    [t.b * Math.cos(t.A * RAD), t.b * Math.sin(t.A * RAD)],
  ];
  const xs = pts.map((p) => p[0]);
  const [minx, maxx] = [Math.min(...xs), Math.max(...xs)];
  const maxy = Math.max(...pts.map((p) => p[1]));
  const k = Math.min((width - 90) / (maxx - minx), 210 / maxy);
  const P = pts.map(([x, y]) => [ox + 45 + (x - minx) * k + ((width - 90) - (maxx - minx) * k) / 2, 260 - y * k]);
  const col = (key: string) => (labelGiven.has(key) ? C.blue : C.orange);
  const out = [`<polygon points="${P.map((p) => `${r2(p[0])},${r2(p[1])}`).join(" ")}" fill="#e7f5ff" stroke="${C.ink}" stroke-width="2"/>`];
  const names = ["A", "B", "C"];
  const angs = [t.A, t.B, t.C];
  const cen = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  P.forEach((p, i) => {
    const [dx, dy] = [p[0] - cen[0], p[1] - cen[1]];
    const L = Math.hypot(dx, dy) || 1;
    out.push(txt(p[0] + (dx / L) * 16, p[1] + (dy / L) * 16 + 5, names[i], C.ink, "middle", 15));
    out.push(txt(p[0] - (dx / L) * 30, p[1] - (dy / L) * 30 + 5, `${nt(angs[i], 1)}°`, col(names[i]), "middle", 12));
  });
  // Side a is opposite A: between B and C, etc.
  const sides: [number, number, string, number][] = [
    [1, 2, "a", t.a],
    [0, 2, "b", t.b],
    [0, 1, "c", t.c],
  ];
  for (const [i, j, nm, v] of sides) {
    const [mx, my] = [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2];
    const [dx, dy] = [mx - cen[0], my - cen[1]];
    const L = Math.hypot(dx, dy) || 1;
    out.push(txt(mx + (dx / L) * 16, my + (dy / L) * 16 + 5, `${nm} = ${nt(v, 2)}`, col(nm), "middle", 13));
  }
  if (tag) out.push(txt(ox + width / 2, 292, tag, C.purple, "middle", 14));
  return out.join("");
}

function renderTriangle(s: TriangleSpec, w: TrigWords): RenderedSvg {
  const need = { SSS: ["a", "b", "c"], SAS: ["b", "c", "A"], ASA: ["A", "B", "c"], AAS: ["A", "B", "a"], SSA: ["a", "b", "A"] }[s.kase];
  const g = Object.fromEntries(need.map((k) => [k, val(s[k as "a"], w)])) as Record<string, Val>;
  const no = (r: string) => {
    throw new Error(fill(w.noTriangle, { reason: r }));
  };
  for (const k of need) if (!(g[k].v > 0)) no(w.reasons.inequality);
  const T = (k: string) => g[k].tex;
  const deg = (x: number) => `${tn(x, 2)}^\\circ`;
  const rows: string[] = [];
  const sols: Tri[] = [];
  const cosLawAngle = (x: number, y: number, z: number) => Math.acos(Math.max(-1, Math.min(1, (y * y + z * z - x * x) / (2 * y * z)))) / RAD;

  switch (s.kase) {
    case "SSS": {
      const [a, b, c] = [g.a.v, g.b.v, g.c.v];
      if (a + b <= c || a + c <= b || b + c <= a) no(w.reasons.inequality);
      const A = cosLawAngle(a, b, c);
      const B = cosLawAngle(b, a, c);
      rows.push(
        `\\cos A = \\frac{b^2 + c^2 - a^2}{2bc} = \\frac{${T("b")}^2 + ${T("c")}^2 - ${T("a")}^2}{2\\cdot ${T("b")}\\cdot ${T("c")}} \\Rightarrow A \\approx ${deg(A)}`,
        `\\cos B = \\frac{a^2 + c^2 - b^2}{2ac} \\Rightarrow B \\approx ${deg(B)}, \\qquad C = 180^\\circ - A - B \\approx ${deg(180 - A - B)}`,
      );
      sols.push({ a, b, c, A, B, C: 180 - A - B });
      break;
    }
    case "SAS": {
      const [b, c, A] = [g.b.v, g.c.v, g.A.v];
      if (A >= 180) no(w.reasons.angles);
      const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A * RAD));
      const B = cosLawAngle(b, a, c);
      rows.push(
        `a^2 = b^2 + c^2 - 2bc\\cos A = ${T("b")}^2 + ${T("c")}^2 - 2\\cdot ${T("b")}\\cdot ${T("c")}\\cos ${T("A")}^\\circ \\Rightarrow a \\approx ${tn(a, 3)}`,
        `\\cos B = \\frac{a^2 + c^2 - b^2}{2ac} \\Rightarrow B \\approx ${deg(B)}, \\qquad C = 180^\\circ - A - B \\approx ${deg(180 - A - B)}`,
      );
      sols.push({ a, b, c, A, B, C: 180 - A - B });
      break;
    }
    case "ASA":
    case "AAS": {
      const [A, B] = [g.A.v, g.B.v];
      if (A + B >= 180) no(w.reasons.angles);
      const Cang = 180 - A - B;
      const [sA, sB, sC] = [A, B, Cang].map((x) => Math.sin(x * RAD));
      let a: number, b: number, c: number;
      rows.push(`C = 180^\\circ - ${T("A")}^\\circ - ${T("B")}^\\circ = ${deg(Cang)}`);
      if (s.kase === "ASA") {
        c = g.c.v;
        a = (c * sA) / sC;
        b = (c * sB) / sC;
        rows.push(`\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = \\frac{${T("c")}}{\\sin ${tn(Cang, 2)}^\\circ} \\approx ${tn(c / sC, 3)} \\Rightarrow a \\approx ${tn(a, 3)},\\ b \\approx ${tn(b, 3)}`);
      } else {
        a = g.a.v;
        b = (a * sB) / sA;
        c = (a * sC) / sA;
        rows.push(`\\frac{a}{\\sin A} = \\frac{${T("a")}}{\\sin ${T("A")}^\\circ} \\approx ${tn(a / sA, 3)} \\Rightarrow b \\approx ${tn(b, 3)},\\ c \\approx ${tn(c, 3)}`);
      }
      sols.push({ a, b, c, A, B, C: Cang });
      break;
    }
    case "SSA": {
      const [a, b, A] = [g.a.v, g.b.v, g.A.v];
      if (A >= 180) no(w.reasons.angles);
      const sinB = (b * Math.sin(A * RAD)) / a;
      rows.push(`\\sin B = \\frac{b\\sin A}{a} = \\frac{${T("b")}\\sin ${T("A")}^\\circ}{${T("a")}} \\approx ${tn(sinB, 4)}`);
      if (sinB > 1 + 1e-12) {
        rows.push(`\\sin B > 1 \\;\\Rightarrow\\; \\varnothing`);
        const tex = `\\begin{gathered} ${rows.join(" \\\\[3pt] ")} \\end{gathered}`;
        return compose(tex, "", 0, [{ text: fill(w.noTriangle, { reason: w.reasons.tooShort }), color: C.red }]);
      }
      const B1 = Math.asin(Math.min(1, sinB)) / RAD;
      for (const B of [B1, 180 - B1]) {
        if (A + B >= 180 - 1e-9 || (sols.length && near(B, sols[0].B))) continue;
        const Cang = 180 - A - B;
        sols.push({ a, b, A, B, C: Cang, c: (a * Math.sin(Cang * RAD)) / Math.sin(A * RAD) });
      }
      if (!sols.length) no(w.reasons.angles);
      rows.push(
        sols
          .map((t, i) => `B_{${i + 1}} \\approx ${deg(t.B)},\\ C_{${i + 1}} \\approx ${deg(t.C)},\\ c_{${i + 1}} = \\frac{a\\sin C_{${i + 1}}}{\\sin A} \\approx ${tn(t.c, 3)}`)
          .join(" \\\\[3pt] "),
      );
      break;
    }
  }
  sols.forEach((t, i) => rows.push(`S${sols.length > 1 ? `_{${i + 1}}` : ""} = \\tfrac12\\,ab\\sin C \\approx ${tn(0.5 * t.a * t.b * Math.sin(t.C * RAD), 3)}`));
  const given = new Set(need);
  const body = sols.length === 2 ? drawTriangle(sols[0], 0, 320, given, "1") + drawTriangle(sols[1], 320, 320, given, "2") : drawTriangle(sols[0], 60, 520, given);
  const captions: Caption[] = [];
  if (s.kase === "SSA") captions.push(sols.length === 2 ? { text: w.ambiguous, color: C.purple } : { text: w.oneTriangle });
  captions.push({ text: w.given, color: C.blue });
  const tex = `\\begin{gathered} ${rows.join(" \\\\[3pt] ")} \\end{gathered}`;
  return compose(tex, body, 300, captions);
}

// ---------- graphs ----------

function renderGraph(s: GraphSpec, w: TrigWords): RenderedSvg {
  const [A, B, Cs, D] = [s.A, s.B, s.C, s.D].map((x) => val(x, w));
  if (B.v === 0) throw new Error(fill(w.badNumber, { s: s.B }));
  const deg = s.unit === "deg";
  const full = deg ? 360 : 2 * Math.PI;
  const period = (s.fn === "tan" ? full / 2 : full) / Math.abs(B.v);
  const base = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[s.fn];
  const toRad = deg ? RAD : 1;
  const f = (x: number) => A.v * base(B.v * (x - Cs.v) * toRad) + D.v;
  const x0 = Math.min(0, Cs.v) - period * 0.25;
  const x1 = Math.max(0, Cs.v) + period * 2.1;
  const amp = Math.abs(A.v);
  const yr: [number, number] = s.fn === "tan" ? [D.v - 4 * Math.max(1, amp), D.v + 4 * Math.max(1, amp)] : [Math.min(-1.2, D.v - amp * 1.35), Math.max(1.2, D.v + amp * 1.35)];
  const fr = makeFrame("tg", 48, 6, 574, 330, [x0, x1], yr);
  // Ticks at quarter periods of the base function (multiples of 90° or π/2).
  const step = (deg ? 90 : Math.PI / 2) * Math.max(1, Math.round(period / (full * 2)));
  const ticks: { v: number; label: string }[] = [];
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) ticks.push({ v, label: deg ? `${nt(v, 1)}°` : radText(v / RAD) });
  const parts = [axes(fr, { xTicks: ticks })];
  parts.push(curve(fr, (x) => base(x * toRad), "#ced4da", 1.6));
  if (s.fn === "tan") {
    // Vertical asymptotes where B(x − C) = 90° + k·180°.
    for (let k = -10; k <= 30; k++) {
      const xa = Cs.v + ((deg ? 90 : Math.PI / 2) + k * (deg ? 180 : Math.PI)) / B.v;
      if (xa > x0 && xa < x1) parts.push(vline(fr, xa, C.red, `stroke-dasharray="4 4" stroke-width="1"`));
    }
  }
  parts.push(hline(fr, D.v, C.purple, `stroke-dasharray="7 4" stroke-width="1.4"`), curve(fr, f, C.blue, 2.8, "", x0, x1, 2400));
  if (s.fn !== "tan" && amp > 0) {
    // Amplitude arrow at the first maximum after C; period bracket below.
    const xPeak = Cs.v + (s.fn === "sin" ? period / 4 : 0) * (A.v >= 0 ? 1 : 3) * (B.v > 0 ? 1 : -1);
    const xp = fr.sx(xPeak > x1 ? xPeak - period : xPeak);
    parts.push(arrow(xp, fr.sy(D.v), xp, fr.sy(D.v + amp), C.orange, 2), txt(xp + 6, (fr.sy(D.v) + fr.sy(D.v + amp)) / 2 + 4, `|A| = ${nt(amp, 3)}`, C.orange, "start", 12));
    const yb = fr.sy(D.v - amp) + 16;
    const [pa, pb] = [fr.sx(Cs.v), fr.sx(Cs.v + period)];
    parts.push(
      `<path d="M${r2(pa)},${r2(yb - 6)}v6H${r2(pb)}v-6" fill="none" stroke="${C.green}" stroke-width="1.8"/>`,
      txt((pa + pb) / 2, yb + 15, `${w.period} ${deg ? `${nt(period, 2)}°` : radText(period / RAD)}`, C.green, "middle", 12),
    );
  }
  if (Math.abs(Cs.v) > 1e-12) parts.push(arrow(fr.sx(0), fr.sy(D.v) - 10, fr.sx(Cs.v), fr.sy(D.v) - 10, C.red, 1.8));

  const fnT = `\\${s.fn}`;
  const shift = `x ${Cs.v > 0 ? "-" : "+"} ${Cs.tex.replace(/^-/, "")}${deg ? "^\\circ" : ""}`;
  const inner = Math.abs(Cs.v) < 1e-12 ? `${B.v === 1 ? "" : B.tex}x` : B.v === 1 ? shift : `${B.tex}\\left(${shift}\\right)`;
  const Atex = A.v === 1 ? "" : A.v === -1 ? "-" : A.tex;
  const Dtex = Math.abs(D.v) < 1e-12 ? "" : D.v > 0 ? ` + ${D.tex}` : ` - ${D.tex.replace(/^-/, "")}`;
  const periodTex = deg ? `${tn(period, 2)}^\\circ` : radTex(period / RAD);
  const tex =
    `y = ${Atex}${fnT}\\left(${inner}\\right)${Dtex} \\qquad ` +
    (s.fn === "tan" ? "" : `|A| = ${tn(amp, 3)},\\ `) +
    `T = \\frac{${s.fn === "tan" ? (deg ? "180^\\circ" : "\\pi") : deg ? "360^\\circ" : "2\\pi"}}{|B|} = ${periodTex}`;
  const captions: Caption[] = [
    {
      text: [
        s.fn === "tan" ? "" : `${w.amplitude} ${nt(amp, 3)}`,
        `${w.period} ${deg ? `${nt(period, 2)}°` : radText(period / RAD)}`,
        `${w.phase} ${deg ? `${nt(Cs.v, 2)}°` : radText(Cs.v / RAD)}`,
        `${w.midline} y = ${nt(D.v, 3)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    },
  ];
  return compose(tex, parts.join(""), 350, captions);
}

// ---------- equations ----------

function renderEquation(s: EquationSpec, w: TrigWords): RenderedSvg {
  const k = val(s.k, w);
  const deg = s.unit === "deg";
  const fnT = `\\${s.fn}`;
  const head = `${fnT} x = ${k.tex}`;
  if (s.fn !== "tan" && Math.abs(k.v) > 1 + 1e-12) {
    return compose(`${head} \\qquad |${k.tex}| > 1 \\;\\Rightarrow\\; \\varnothing`, "", 0, [{ text: w.noSolution, color: C.red }]);
  }
  const alpha = (s.fn === "sin" ? Math.asin(Math.max(-1, Math.min(1, k.v))) : s.fn === "cos" ? Math.acos(Math.max(-1, Math.min(1, k.v))) : Math.atan(k.v)) / RAD;
  const a = near(alpha, Math.round(alpha)) ? Math.round(alpha) : alpha;
  const raw = s.fn === "sin" ? [a, 180 - a] : s.fn === "cos" ? [a, 360 - a] : [a, a + 180];
  const sols = [...new Set(raw.map((x) => Math.round(mod(x, 360) * 1e9) / 1e9))].sort((p, q) => p - q);
  const inv = { sin: "\\sin^{-1}", cos: "\\cos^{-1}", tan: "\\tan^{-1}" }[s.fn];
  const A = angleTex(a, s.unit);
  const turn = deg ? "360^\\circ" : "2\\pi";
  const half = deg ? "180^\\circ" : "\\pi";
  const general =
    s.fn === "sin"
      ? `x = ${A} + ${turn}\\,n,\\quad x =${half} - ${A.startsWith("-") ? `(${A})` : A} + ${turn}\\,n`
      : s.fn === "cos"
        ? `x = \\pm ${A} + ${turn}\\,n`
        : `x = ${A} + ${half}\\,n`;
  const tex =
    `\\begin{gathered} ${head} \\qquad \\alpha = ${inv}\\left(${k.tex}\\right) = ${A} \\\\[3pt] ` +
    `x \\in \\left[0, ${turn}\\right):\\ \\ x = ${sols.map((x) => angleTex(x, s.unit)).join(",\\ ")} \\\\[3pt] ${general},\\ n \\in \\mathbb{Z} \\end{gathered}`;

  // Left: the unit circle with the line y = k (sin), x = k (cos) or the ray (tan). Right: the graph.
  const R = 110;
  const [cx, cy] = [140, 170];
  const parts = [
    `<line x1="${cx - R - 20}" y1="${cy}" x2="${cx + R + 20}" y2="${cy}" stroke="#495057" stroke-width="1.2"/>`,
    `<line x1="${cx}" y1="${cy - R - 20}" x2="${cx}" y2="${cy + R + 20}" stroke="#495057" stroke-width="1.2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#adb5bd" stroke-width="1.6"/>`,
  ];
  if (s.fn === "sin") parts.push(`<line x1="${cx - R - 20}" y1="${r2(cy - R * k.v)}" x2="${cx + R + 20}" y2="${r2(cy - R * k.v)}" stroke="${C.orange}" stroke-width="1.8" stroke-dasharray="6 4"/>`);
  if (s.fn === "cos") parts.push(`<line x1="${r2(cx + R * k.v)}" y1="${cy - R - 20}" x2="${r2(cx + R * k.v)}" y2="${cy + R + 20}" stroke="${C.orange}" stroke-width="1.8" stroke-dasharray="6 4"/>`);
  const palette = [C.blue, C.red];
  sols.forEach((x, i) => {
    const [px, py] = [cx + R * Math.cos(x * RAD), cy - R * Math.sin(x * RAD)];
    if (s.fn === "tan") parts.push(`<line x1="${r2(cx - (px - cx) * 1.2)}" y1="${r2(cy - (py - cy) * 1.2)}" x2="${r2(cx + (px - cx) * 1.2)}" y2="${r2(cy + (py - cy) * 1.2)}" stroke="${C.orange}" stroke-width="1.8" stroke-dasharray="6 4"/>`);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${r2(px)}" y2="${r2(py)}" stroke="${palette[i]}" stroke-width="2.2"/>`, dot(px, py, palette[i], 5), txt(px + (px >= cx ? 10 : -10), py + (py <= cy ? -8 : 18), angleText(x, s.unit), palette[i], px >= cx ? "start" : "end", 12));
  });
  const full = deg ? 360 : 2 * Math.PI;
  const toRad = deg ? RAD : 1;
  const base = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[s.fn];
  const fr = makeFrame("te", 300, 6, 322, 330, [0, full], s.fn === "tan" ? [-4, 4] : [-1.3, 1.3]);
  const ticks = [0, 90, 180, 270, 360].map((d) => ({ v: deg ? d : d * RAD, label: deg ? `${d}°` : radText(d) }));
  parts.push(axes(fr, { xTicks: ticks }), hline(fr, k.v, C.orange, `stroke-dasharray="6 4" stroke-width="1.8"`), curve(fr, (x) => base(x * toRad), C.purple, 2.4, "", 0, full, 1500));
  sols.forEach((x, i) => {
    const xv = deg ? x : x * RAD;
    parts.push(vline(fr, xv, palette[i], `stroke-dasharray="3 3"`), dot(fr.sx(xv), fr.sy(k.v), palette[i], 5));
  });
  return compose(tex, parts.join(""), 346, [{ text: fill(w.solutions, { n: sols.length, range: deg ? "[0°, 360°)" : "[0, 2π)" }) }]);
}

export function renderTrig(spec: TrigSpec, words: TrigWords): RenderedSvg {
  switch (spec.topic) {
    case "circle":
      return renderCircle(spec, words);
    case "compass":
      return renderCompass(spec, words);
    case "right":
      return renderRight(spec, words);
    case "triangle":
      return renderTriangle(spec, words);
    case "graph":
      return renderGraph(spec, words);
    case "equation":
      return renderEquation(spec, words);
  }
}
