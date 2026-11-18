// Trigonometry beyond the right angle (Think Mathematics 3B ch. 6–7): the sine and cosine of an obtuse angle, the
// sine rule, the cosine rule, the area ½ab sin C, the ambiguous case, bearings, and angles of elevation and depression.
// Each question comes with its figure, drawn to scale, the working as formulas, and the answers the usual slips give:
// the obtuse angle taken as 90° + t, the cosine's minus sign dropped, the sine rule upside down, angles taken in the
// ratio of the sides, the square root forgotten, the wrong angle found, the area without its sine or its half, the acute
// angle of the ambiguous case, a back bearing taken from 360°, the turn taken for the angle inside the triangle, and an
// angle of elevation or depression measured from the vertical.
import { C, esc, FONT, r2 } from "./chart";
import { withSteps } from "./angleGuess";

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const RAD = Math.PI / 180;
const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
const asin = (x: number) => Math.asin(x) / RAD;
const acos = (x: number) => Math.acos(Math.max(-1, Math.min(1, x))) / RAD;
const atan = (x: number) => Math.atan(x) / RAD;
/** A number as the working shows it: to 2 decimal places (4 for a sine or cosine), trailing zeros dropped. */
export const dp = (v: number, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);
/** A bearing in three figures: 65 → "065". */
export const three = (b: number) => String(Math.round(((b % 360) + 360) % 360)).padStart(3, "0");

export type Pic = { body: string; w: number; h: number };
export type RuleMistake =
  | "notSupplement" | "cosSignLost" | "sineRuleFlipped" | "anglesAsSides" | "noSquareRoot" | "wrongAngleFound"
  | "areaNoSine" | "areaNotHalved" | "ambiguousAcute" | "backBearingMirror" | "bearingTurnInside" | "fromVertical";
export type Trap = { id: RuleMistake; v: number; vars: Record<string, string | number> };

// ---------- figures ----------

type Corner = "A" | "B" | "C";
type Side = "a" | "b" | "c";
/** A triangle ABC (angles in degrees, side a opposite A), with what each side and angle shows ("x" and "θ" the unknown). */
export type TriFig = { kind: "tri"; A: number; B: number; C: number; a: number; b: number; c: number; side: Partial<Record<Side, string>>; angle: Partial<Record<Corner, string>>; unit: string };
/** The top half of the unit circle with the angle t; worked, its mirror 180° − t beside it. */
export type CircleFig = { kind: "circle"; t: number };
/** A walk on bearings: the legs from the start, each with its length (or none) and three-figure bearing. */
export type BearingFig = { kind: "bearing"; legs: { d: number | null; brg: number }[]; names: string[]; unit: string; back: boolean };
/** A cliff or a tower h high, a point d away on level ground and the angle the line of sight makes with the horizontal. */
export type ElevFig = { kind: "elev"; h: number; d: number; ang: number; depression: boolean; ask: "d" | "ang"; unit: string };
export type Figure = TriFig | CircleFig | BearingFig | ElevFig;

function text(x: number, y: number, s: string | number, color: string = C.ink, size = 15, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y + size * 0.35)}" ${FONT} font-size="${size}" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(String(s))}</text>`;
}
const colour = (s: string) => (s === "x" || s === "θ" ? C.red : C.ink);
type P = [number, number];
const unit = ([x, y]: P): P => {
  const n = Math.hypot(x, y) || 1;
  return [x / n, y / n];
};
/** An arc of radius r at o from the direction of p to the direction of q, the short way round (screen coordinates). */
function arc(o: P, p: P, q: P, r: number, color = C.orange) {
  const [u, v] = [unit([p[0] - o[0], p[1] - o[1]]), unit([q[0] - o[0], q[1] - o[1]])];
  const sweep = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : 0;
  return `<path d="M${r2(o[0] + r * u[0])},${r2(o[1] + r * u[1])} A${r},${r} 0 0 ${sweep} ${r2(o[0] + r * v[0])},${r2(o[1] + r * v[1])}" fill="none" stroke="${color}" stroke-width="2"/>`;
}

const TW = 320;
const TH = 230;
/** The triangle, A at the left of the base AB, C above it, scaled to fit. */
export function triSvg(f: TriFig): Pic {
  const raw: Record<Corner, P> = { A: [0, 0], B: [f.c, 0], C: [f.b * cos(f.A), f.b * sin(f.A)] };
  const xs = Object.values(raw).map((p) => p[0]);
  const [lo, hi, top] = [Math.min(...xs), Math.max(...xs), raw.C[1]];
  const m = 42;
  const s = Math.min((TW - 2 * m) / (hi - lo), (TH - 2 * m) / top);
  const w = r2((hi - lo) * s + 2 * m);
  const h = r2(top * s + 2 * m);
  const at: Record<Corner, P> = { A: [0, 0], B: [0, 0], C: [0, 0] };
  for (const k of ["A", "B", "C"] as const) at[k] = [m + (raw[k][0] - lo) * s, h - m - raw[k][1] * s];
  const g: P = [(at.A[0] + at.B[0] + at.C[0]) / 3, (at.A[1] + at.B[1] + at.C[1]) / 3];
  const parts = [`<polygon points="${["A", "B", "C"].map((k) => at[k as Corner].map(r2).join(",")).join(" ")}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`];
  const other: Record<Corner, [Corner, Corner]> = { A: ["B", "C"], B: ["C", "A"], C: ["A", "B"] };
  for (const k of ["A", "B", "C"] as const) {
    const out = unit([at[k][0] - g[0], at[k][1] - g[1]]);
    parts.push(text(at[k][0] + out[0] * 16, at[k][1] + out[1] * 16, k, C.blue, 16));
    const lab = f.angle[k];
    if (!lab) continue;
    const [p, q] = other[k].map((o) => at[o]);
    const [u, v] = [unit([p[0] - at[k][0], p[1] - at[k][1]]), unit([q[0] - at[k][0], q[1] - at[k][1]])];
    const half = (f[k] * RAD) / 2;
    const bis = unit([u[0] + v[0], u[1] + v[1]]);
    const d = Math.min(70, Math.max(30, 15 / Math.tan(half)));
    parts.push(arc(at[k], p, q, Math.min(20, d - 14)));
    parts.push(text(at[k][0] + bis[0] * d, at[k][1] + bis[1] * d, lab, lab === "θ" ? C.red : C.orange, 14));
  }
  const ends: Record<Side, [Corner, Corner]> = { a: ["B", "C"], b: ["C", "A"], c: ["A", "B"] };
  for (const k of ["a", "b", "c"] as const) {
    const lab = f.side[k];
    if (!lab) continue;
    const [p, q] = ends[k].map((e) => at[e]);
    const mid: P = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let n = unit([q[1] - p[1], p[0] - q[0]]);
    if (n[0] * (mid[0] - g[0]) + n[1] * (mid[1] - g[1]) < 0) n = [-n[0], -n[1]];
    const s = lab === "x" ? "x" : `${lab} ${f.unit}`;
    parts.push(text(mid[0] + n[0] * (14 + s.length * 2.6), mid[1] + n[1] * 14, s, colour(lab), 14));
  }
  return { body: parts.join(""), w, h };
}

/** The unit circle's top half with the angle t marked; worked, also 180° − t, the same height and the other way across. */
export function circleSvg(t: number, worked: boolean): Pic {
  const [w, h, R] = [320, 160, 100];
  const [cx, cy] = [w / 2, h - 24];
  const pt = (d: number): P => [cx + R * cos(d), cy - R * sin(d)];
  const parts = [
    `<path d="M${cx - R - 14},${cy} H${cx + R + 14} M${cx},${cy + 10} V${cy - R - 12}" stroke="${C.grey}" stroke-width="1.4"/>`,
    `<path d="M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`,
  ];
  const ray = (d: number, color: string, label: string, r: number) => {
    const p = pt(d);
    parts.push(
      `<path d="M${cx},${cy} L${r2(p[0])},${r2(p[1])}" stroke="${color}" stroke-width="2.4"/>`,
      `<path d="M${r2(p[0])},${r2(p[1])} V${cy}" stroke="${color}" stroke-width="1.6" stroke-dasharray="5 4"/>`,
      `<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r="4.5" fill="${color}"/>`,
      arc([cx, cy], [cx + 1, cy], p, r, color),
      text(cx + (R + 20) * cos(d), cy - (R + 14) * sin(d), label, color, 13),
    );
  };
  ray(t, t > 90 ? C.orange : C.blue, `${t}°`, t > 90 ? 18 : 30);
  if (worked) ray(180 - t, t > 90 ? C.blue : C.orange, `${180 - t}°`, t > 90 ? 30 : 18);
  return { body: parts.join(""), w, h };
}

/** A walk on bearings: each point's north line, its bearing measured clockwise from north, and the legs between. */
export function bearingSvg(f: BearingFig, worked: boolean): Pic {
  const pts: P[] = [[0, 0]];
  for (const l of f.legs) {
    const [x, y] = pts[pts.length - 1];
    const d = l.d ?? 10;
    pts.push([x + d * sin(l.brg), y + d * cos(l.brg)]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const m = 56;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  const s = 200 / span;
  const w = r2((Math.max(...xs) - Math.min(...xs)) * s + 2 * m);
  const h = r2((Math.max(...ys) - Math.min(...ys)) * s + 2 * m);
  const at = pts.map(([x, y]): P => [m + (x - Math.min(...xs)) * s, m + (Math.max(...ys) - y) * s]);
  const parts: string[] = [];
  const north = (p: P) =>
    parts.push(`<path d="M${r2(p[0])},${r2(p[1] + 8)} V${r2(p[1] - 44)}" stroke="${C.grey}" stroke-width="1.4"/><path d="M${r2(p[0] - 4)},${r2(p[1] - 37)} L${r2(p[0])},${r2(p[1] - 45)} L${r2(p[0] + 4)},${r2(p[1] - 37)}" fill="none" stroke="${C.grey}" stroke-width="1.4"/>`, text(p[0], p[1] - 52, "N", C.grey, 12));
  /** The bearing brg at p: an arc clockwise from north, its three figures beside it. */
  const turn = (p: P, brg: number, r: number, color: string, label: string) => {
    const end: P = [p[0] + r * sin(brg), p[1] - r * cos(brg)];
    parts.push(`<path d="M${r2(p[0])},${r2(p[1] - r)} A${r},${r} 0 ${brg > 180 ? 1 : 0} 1 ${r2(end[0])},${r2(end[1])}" fill="none" stroke="${color}" stroke-width="2"/>`);
    const mid = brg / 2;
    parts.push(text(p[0] + (r + 18) * sin(mid), p[1] - (r + 14) * cos(mid), label, color, 13));
  };
  if (f.back) {
    north(at[0]);
    north(at[1]);
    turn(at[0], f.legs[0].brg, 22, C.orange, `${three(f.legs[0].brg)}°`);
    if (worked) turn(at[1], (f.legs[0].brg + 180) % 360, 22, C.blue, `${three(f.legs[0].brg + 180)}°`);
    parts.push(`<path d="M${r2(at[0][0])},${r2(at[0][1])} L${r2(at[1][0])},${r2(at[1][1])}" stroke="${C.blue}" stroke-width="2.4"/>`);
  } else {
    parts.push(`<path d="M${r2(at[0][0])},${r2(at[0][1])} L${r2(at[at.length - 1][0])},${r2(at[at.length - 1][1])}" stroke="${C.red}" stroke-width="2" stroke-dasharray="6 5"/>`);
    f.legs.forEach((l, i) => {
      north(at[i]);
      turn(at[i], l.brg, 20 + 6 * i, C.orange, `${three(l.brg)}°`);
      const [p, q] = [at[i], at[i + 1]];
      parts.push(`<path d="M${r2(p[0])},${r2(p[1])} L${r2(q[0])},${r2(q[1])}" stroke="${C.blue}" stroke-width="2.4"/>`);
      let n = unit([q[1] - p[1], p[0] - q[0]]);
      const g: P = [(at[0][0] + at[1][0] + at[2][0]) / 3, (at[0][1] + at[1][1] + at[2][1]) / 3];
      const mid: P = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (n[0] * (mid[0] - g[0]) + n[1] * (mid[1] - g[1]) < 0) n = [-n[0], -n[1]];
      parts.push(text(mid[0] + n[0] * 26, mid[1] + n[1] * 16, `${l.d} ${f.unit}`, C.ink, 13));
    });
    const [s0, e] = [at[0], at[at.length - 1]];
    parts.push(text((s0[0] + e[0]) / 2 + 8, (s0[1] + e[1]) / 2 - 10, "x", C.red, 15));
    if (worked) {
      const inside = 180 - (((f.legs[1].brg - f.legs[0].brg) % 360) + 360) % 360;
      parts.push(arc(at[1], at[0], at[2], 18, C.green));
      const [u, v] = [at[0], at[2]].map((p) => unit([p[0] - at[1][0], p[1] - at[1][1]]));
      const bis = unit([u[0] + v[0], u[1] + v[1]]);
      parts.push(text(at[1][0] + bis[0] * 36, at[1][1] + bis[1] * 36, `${inside}°`, C.green, 13));
    }
  }
  at.forEach((p, i) => parts.push(`<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r="4" fill="${C.ink}"/>`, text(p[0] - 14, p[1] + 12, f.names[i], C.ink, 14)));
  return { body: parts.join(""), w, h };
}

/** A cliff (depression, seen from its top) or a tower (elevation, seen from the ground), drawn to scale. */
export function elevSvg(f: ElevFig, worked: boolean): Pic {
  const s = Math.min(200 / f.d, 130 / f.h);
  const [W0, H0] = [f.d * s, f.h * s];
  const [m, w, h] = [f.depression ? 96 : 44, r2(f.d * s + (f.depression ? 140 : 100)), r2(f.h * s + 64)];
  const foot: P = [m + (f.depression ? 0 : W0), h - 26];
  const top: P = [foot[0], foot[1] - H0];
  const far: P = [f.depression ? foot[0] + W0 : m, foot[1]];
  const parts = [
    `<path d="M${r2(Math.min(foot[0], far[0]) - (f.depression ? 44 : 16))},${r2(foot[1])} H${r2(Math.max(foot[0], far[0]) + 24)}" stroke="${C.ink}" stroke-width="2"/>`,
    f.depression
      ? `<rect x="${r2(foot[0] - 40)}" y="${r2(top[1])}" width="40" height="${r2(H0)}" fill="#e9ecef" stroke="${C.ink}" stroke-width="2"/>`
      : `<rect x="${r2(top[0] - 4)}" y="${r2(top[1])}" width="8" height="${r2(H0)}" fill="#e9ecef" stroke="${C.ink}" stroke-width="2"/>`,
    `<path d="M${r2(far[0])},${r2(far[1])} L${r2(top[0])},${r2(top[1])}" stroke="${C.blue}" stroke-width="2.2"/>`,
    `<circle cx="${r2(far[0])}" cy="${r2(far[1])}" r="4.5" fill="${C.blue}"/>`,
  ];
  const angLab = f.ask === "ang" ? "θ" : `${f.ang}°`;
  const angColour = f.ask === "ang" ? C.red : C.orange;
  if (f.depression) {
    const flat: P = [top[0] + W0 + 10, top[1]];
    parts.push(`<path d="M${r2(top[0])},${r2(top[1])} H${r2(flat[0])}" stroke="${C.grey}" stroke-width="1.6" stroke-dasharray="6 4"/>`);
    parts.push(arc(top, flat, far, 34, angColour), text(top[0] + 50 * cos(f.ang / 2), top[1] + 50 * sin(f.ang / 2), angLab, angColour, 14));
    if (worked) parts.push(arc(far, [far[0] - 10, far[1]], top, 34, C.green), text(far[0] - 50 * cos(f.ang / 2), far[1] - 50 * sin(f.ang / 2), `${f.ang}°`, C.green, 13));
  } else {
    parts.push(arc(far, [far[0] + 10, far[1]], top, 34, angColour), text(far[0] + 50 * cos(f.ang / 2), far[1] - 50 * sin(f.ang / 2), angLab, angColour, 14));
  }
  parts.push(text(top[0] + (f.depression ? -46 : 10), (top[1] + foot[1]) / 2, `${f.h} ${f.unit}`, C.ink, 14, f.depression ? "end" : "start"));
  parts.push(text((foot[0] + far[0]) / 2, foot[1] + 16, f.ask === "d" ? "x" : `${f.d} ${f.unit}`, f.ask === "d" ? C.red : C.ink, 14));
  return { body: parts.join(""), w, h };
}

export function figureSvg(f: Figure, worked = false): Pic {
  if (f.kind === "tri") return triSvg(f);
  if (f.kind === "circle") return circleSvg(f.t, worked);
  if (f.kind === "bearing") return bearingSvg(f, worked);
  return elevSvg(f, worked);
}

// ---------- questions ----------

/** What the question asks, the words it is asked in (a key of TrigRuleWords and its values), and its answer. */
export type RuleKind =
  | "sinSame" | "cosNeg" | "value" | "sineSide" | "sineAngle" | "cosSide" | "cosAngle" | "area"
  | "ambiguous" | "back" | "trip" | "depression" | "elevation";
export type RuleQuestion = {
  kind: RuleKind;
  /** The formula above the figure (TeX), if any. */
  q: string;
  vars: Record<string, string | number>;
  fig: Figure;
  v: number;
  /** The unit a length or an area is in, as written after it: in the question's language, and in Latin letters. */
  unit?: [string, string];
  /** Whole degrees (an angle from 180° or a bearing) or 2 decimal places. */
  exact: boolean;
  /** What the answer is in: degrees, a length or an area. */
  measure: "deg" | "len" | "area" | "none";
  traps: Trap[];
  steps: string[];
};

const tex = (d: number) => `${d}^\\circ`;
/** A triangle from two of its angles and the side between them, c. */
function triangle(A: number, B: number, c: number) {
  const Cc = 180 - A - B;
  return { A, B, C: Cc, a: (c * sin(A)) / sin(Cc), b: (c * sin(B)) / sin(Cc), c };
}
const keep = (v: number, traps: Trap[]) => traps.filter((t) => Number.isFinite(t.v) && t.v > 0 && Math.abs(t.v - v) > 0.02);

/** Level 1: the sine and cosine of an obtuse angle, from the unit circle. */
export function obtuseQuestion(next: Next): RuleQuestion {
  const int = intOf(next);
  const kind = (["sinSame", "cosNeg", "value"] as const)[int(0, 2)];
  if (kind === "value") {
    let t = int(95, 175);
    if (t % 5 !== 0 && next() < 0.5) t = 5 * Math.round(t / 5);
    const fn = next() < 0.5 ? "sin" : "cos";
    const v = fn === "sin" ? sin(t) : cos(t);
    // The minus sign dropped is the "sign" slip every number is checked for.
    return { kind, q: `\\${fn}\\,${tex(t)}`, vars: {}, fig: { kind: "circle", t }, v, exact: false, measure: "none", traps: [], steps: [`\\${fn}\\,${tex(t)} = ${fn === "sin" ? "" : "-"}\\${fn}(180^\\circ - ${tex(t)}) = ${fn === "sin" ? "" : "-"}\\${fn}\\,${tex(180 - t)} \\approx ${dp(v, 4)}`] };
  }
  const t = int(15, 80);
  const v = 180 - t;
  if (kind === "sinSame") {
    const traps = keep(v, [{ id: "notSupplement", v: 90 + t, vars: { x: 90 + t, t, v } }, { id: "notSupplement", v: 360 - t, vars: { x: 360 - t, t, v } }]);
    return { kind, q: `\\sin\\theta = \\sin\\,${tex(t)}`, vars: {}, fig: { kind: "circle", t }, v, exact: true, measure: "deg", traps, steps: [`\\sin(180^\\circ - \\theta) = \\sin\\theta`, `\\theta = 180^\\circ - ${tex(t)} = ${tex(v)}`] };
  }
  const traps = keep(v, [{ id: "cosSignLost", v: t, vars: { x: t, v } }, { id: "notSupplement", v: 90 + t, vars: { x: 90 + t, t, v } }]);
  return { kind, q: `\\cos\\theta = -\\cos\\,${tex(t)}`, vars: {}, fig: { kind: "circle", t }, v, exact: true, measure: "deg", traps, steps: [`\\cos(180^\\circ - \\theta) = -\\cos\\theta`, `\\theta = 180^\\circ - ${tex(t)} = ${tex(v)}`] };
}

/** Level 2: the sine rule (a side or an angle), the cosine rule (a side or an angle) and the area ½bc sin A. */
export function sineCosineQuestion(next: Next, cm: string): RuleQuestion {
  const int = intOf(next);
  const kind = (["sineSide", "sineAngle", "cosSide", "cosAngle", "area"] as const)[int(0, 4)];
  if (kind === "sineSide") {
    // Two angles and the side opposite one of them: the side opposite the other.
    let A: number, B: number;
    do [A, B] = [int(30, 110), int(25, 80)];
    while (A + B > 150 || Math.abs(A - B) < 8);
    const a = int(6, 20);
    const t = triangle(A, B, (a * sin(180 - A - B)) / sin(A));
    const v = (a * sin(B)) / sin(A);
    const traps = keep(v, [{ id: "sineRuleFlipped", v: (a * sin(A)) / sin(B), vars: { x: dp((a * sin(A)) / sin(B)), v: dp(v) } }]);
    return {
      kind, q: "", vars: {}, v, exact: false, measure: "len", unit: [cm, "cm"], traps,
      fig: { kind: "tri", ...t, side: { a: String(a), b: "x" }, angle: { A: `${A}°`, B: `${B}°` }, unit: cm },
      steps: [`\\frac{x}{\\sin\\,${tex(B)}} = \\frac{${a}}{\\sin\\,${tex(A)}}`, `x = \\frac{${a}\\,\\sin\\,${tex(B)}}{\\sin\\,${tex(A)}} \\approx ${dp(v)}`],
    };
  }
  if (kind === "sineAngle") {
    // A, its side a and a shorter side b: B is acute, so there is one answer.
    let A: number, a: number, b: number, B: number;
    do {
      [A, a] = [int(35, 110), int(8, 20)];
      b = int(4, a - 2);
      B = asin((b * sin(A)) / a);
    } while (B < 15 || A + B > 155 || Math.abs((A * b) / a - B) < 0.5);
    const t = triangle(A, B, (a * sin(180 - A - B)) / sin(A));
    const traps = keep(B, [{ id: "anglesAsSides", v: (A * b) / a, vars: { x: dp((A * b) / a), v: dp(B) } }]);
    return {
      kind, q: "", vars: {}, v: B, exact: false, measure: "deg", traps,
      fig: { kind: "tri", ...t, side: { a: String(a), b: String(b) }, angle: { A: `${A}°`, B: "θ" }, unit: cm },
      steps: [`\\frac{\\sin\\theta}{${b}} = \\frac{\\sin\\,${tex(A)}}{${a}}`, `\\sin\\theta = \\frac{${b}\\,\\sin\\,${tex(A)}}{${a}} \\approx ${dp((b * sin(A)) / a, 4)}`, `\\theta \\approx ${dp(B)}^\\circ`],
    };
  }
  if (kind === "cosSide" || kind === "area") {
    // Two sides and the angle between them; the angle obtuse half the time.
    const [b, c] = [int(4, 15), int(4, 15)];
    const A = next() < 0.5 ? int(30, 85) : int(95, 150);
    const a2 = b * b + c * c - 2 * b * c * cos(A);
    const a = Math.sqrt(a2);
    const B = asin((b * sin(A)) / a);
    const t = { A, B: b * b > a2 + c * c ? 180 - B : B, C: 0, a, b, c };
    t.C = 180 - t.A - t.B;
    const fig: TriFig = { kind: "tri", ...t, side: { b: String(b), c: String(c), ...(kind === "cosSide" ? { a: "x" } : {}) }, angle: { A: `${A}°` }, unit: cm };
    if (kind === "area") {
      const v = 0.5 * b * c * sin(A);
      const traps = keep(v, [{ id: "areaNoSine", v: 0.5 * b * c, vars: { x: 0.5 * b * c, v: dp(v), a: A } }, { id: "areaNotHalved", v: b * c * sin(A), vars: { x: dp(b * c * sin(A)), v: dp(v) } }]);
      return { kind, q: "", vars: {}, v, exact: false, measure: "area", unit: [`${cm}²`, "cm²"], traps, fig, steps: [`S = \\tfrac{1}{2}\\cdot ${b}\\cdot ${c}\\,\\sin\\,${tex(A)} \\approx ${dp(v)}`] };
    }
    const traps: Trap[] = [{ id: "noSquareRoot", v: a2, vars: { x: dp(a2), v: dp(a) } }];
    if (A > 90) traps.push({ id: "cosSignLost", v: Math.sqrt(b * b + c * c + 2 * b * c * cos(A)), vars: { x: dp(Math.sqrt(b * b + c * c + 2 * b * c * cos(A))), v: dp(a) } });
    return {
      kind, q: "", vars: {}, v: a, exact: false, measure: "len", unit: [cm, "cm"], traps: keep(a, traps), fig,
      steps: [`x^2 = ${b}^2 + ${c}^2 - 2\\cdot ${b}\\cdot ${c}\\,\\cos\\,${tex(A)} \\approx ${dp(a2)}`, `x \\approx ${dp(a)}`],
    };
  }
  // Three sides: an angle; the one opposite the longest side, obtuse half the time.
  let a: number, b: number, c: number, A: number;
  const wantObtuse = next() < 0.5;
  do {
    [b, c] = [int(4, 14), int(4, 14)];
    a = int(Math.abs(b - c) + 2, b + c - 2);
    A = acos((b * b + c * c - a * a) / (2 * b * c));
  } while (A < 25 || A > 150 || A === 90 || wantObtuse !== A > 90 || a === b || a === c);
  const Cc = acos((a * a + b * b - c * c) / (2 * a * b));
  const t = { A, B: 180 - A - Cc, C: Cc, a, b, c };
  const traps: Trap[] = [{ id: "wrongAngleFound", v: Cc, vars: { x: dp(Cc), v: dp(A), s: a } }];
  if (A > 90) traps.push({ id: "cosSignLost", v: 180 - A, vars: { x: dp(180 - A), v: dp(A) } });
  return {
    kind, q: "", vars: {}, v: A, exact: false, measure: "deg", traps: keep(A, traps),
    fig: { kind: "tri", ...t, side: { a: String(a), b: String(b), c: String(c) }, angle: { A: "θ" }, unit: cm },
    steps: [`\\cos\\theta = \\frac{${b}^2 + ${c}^2 - ${a}^2}{2\\cdot ${b}\\cdot ${c}} = \\frac{${b * b + c * c - a * a}}{${2 * b * c}}`, `\\theta \\approx ${dp(A)}^\\circ`],
  };
}

/** Level 3: the ambiguous case of the sine rule, bearings (a back bearing, a two-leg journey) and elevation/depression. */
export type Units = { cm: string; km: string; m: string };
const NAMES = ["A", "B", "C"];
export function appliedQuestion(next: Next, units: Units): RuleQuestion {
  const int = intOf(next);
  const kind = (["ambiguous", "back", "trip", "depression", "elevation"] as const)[int(0, 4)];
  if (kind === "ambiguous") {
    // A acute, a shorter than b but longer than b sin A: two triangles, and B is the obtuse one.
    let A: number, a: number, b: number, acute: number;
    do {
      [A, b] = [int(25, 55), int(8, 18)];
      a = int(Math.ceil(b * sin(A)) + 1, b - 1);
      acute = asin((b * sin(A)) / a);
    } while (acute > 78 || A + 180 - acute > 155 || a <= b * sin(A));
    const B = 180 - acute;
    const t = triangle(A, B, (a * sin(180 - A - B)) / sin(A));
    const traps = keep(B, [{ id: "ambiguousAcute", v: acute, vars: { x: dp(acute), v: dp(B) } }]);
    return {
      kind, q: "", vars: {}, v: B, exact: false, measure: "deg", traps,
      fig: { kind: "tri", ...t, side: { a: String(a), b: String(b) }, angle: { A: `${A}°`, B: "θ" }, unit: units.cm },
      steps: [`\\sin\\theta = \\frac{${b}\\,\\sin\\,${tex(A)}}{${a}} \\approx ${dp((b * sin(A)) / a, 4)}`, `\\theta \\approx ${dp(acute)}^\\circ \\;\\text{or}\\; \\theta \\approx 180^\\circ - ${dp(acute)}^\\circ = ${dp(B)}^\\circ`],
    };
  }
  if (kind === "back") {
    let b = int(10, 350);
    if (b % 90 === 0 || b === 180) b += 7;
    const v = (b + 180) % 360;
    const traps = keep(v, [{ id: "backBearingMirror", v: 360 - b, vars: { x: three(360 - b), b: three(b), v: three(v) } }]);
    return {
      kind, q: "", vars: { b: `${three(b)}°` }, v, exact: true, measure: "deg", traps,
      fig: { kind: "bearing", legs: [{ d: null, brg: b }], names: NAMES.slice(0, 2), unit: units.km, back: true },
      steps: [`${tex(b)} ${b < 180 ? "+" : "-"} 180^\\circ = ${tex(v)}`],
    };
  }
  if (kind === "trip") {
    const d1 = int(3, 12);
    const d2 = int(Math.max(3, Math.ceil(d1 / 2)), Math.min(12, 2 * d1));
    const b1 = int(0, 71) * 5;
    let turn = int(12, 28) * 5;
    if (turn === 90) turn = 85;
    const b2 = (b1 + turn) % 360;
    const inside = 180 - turn;
    const x2 = d1 * d1 + d2 * d2 - 2 * d1 * d2 * cos(inside);
    const v = Math.sqrt(x2);
    const wrong = Math.sqrt(d1 * d1 + d2 * d2 - 2 * d1 * d2 * cos(turn));
    const traps = keep(v, [{ id: "bearingTurnInside", v: wrong, vars: { x: dp(wrong), t: turn, i: inside, v: dp(v) } }, { id: "noSquareRoot", v: x2, vars: { x: dp(x2), v: dp(v) } }]);
    return {
      kind, q: "", vars: { d1, d2, b1: `${three(b1)}°`, b2: `${three(b2)}°`, u: units.km }, v, exact: false, measure: "len", unit: [units.km, "km"], traps,
      fig: { kind: "bearing", legs: [{ d: d1, brg: b1 }, { d: d2, brg: b2 }], names: NAMES.slice(0, 3), unit: units.km, back: false },
      steps: [`180^\\circ - (${tex(b2 < b1 ? b2 + 360 : b2)} - ${tex(b1)}) = ${tex(inside)}`, `x^2 = ${d1}^2 + ${d2}^2 - 2\\cdot ${d1}\\cdot ${d2}\\,\\cos\\,${tex(inside)} \\approx ${dp(x2)}`, `x \\approx ${dp(v)}`],
    };
  }
  const ang = int(20, 65);
  if (kind === "depression") {
    const h = int(3, 12) * 10;
    const v = h / Math.tan(ang * RAD);
    const traps = keep(v, [{ id: "fromVertical", v: h * Math.tan(ang * RAD), vars: { x: dp(h * Math.tan(ang * RAD)), v: dp(v) } }]);
    return {
      kind, q: "", vars: { h, a: ang, u: units.m }, v, exact: false, measure: "len", unit: [units.m, "m"], traps,
      fig: { kind: "elev", h, d: v, ang, depression: true, ask: "d", unit: units.m },
      steps: [`\\tan\\,${tex(ang)} = \\frac{${h}}{x}`, `x = \\frac{${h}}{\\tan\\,${tex(ang)}} \\approx ${dp(v)}`],
    };
  }
  const [h, d] = [int(2, 9) * 10, int(2, 12) * 10];
  const v = atan(h / d);
  const traps = keep(v, [{ id: "fromVertical", v: 90 - v, vars: { x: dp(90 - v), v: dp(v) } }]);
  return {
    kind, q: "", vars: { h, d, u: units.m }, v, exact: false, measure: "deg", traps,
    fig: { kind: "elev", h, d, ang: Math.round(v), depression: false, ask: "ang", unit: units.m },
    steps: [`\\tan\\theta = \\frac{${h}}{${d}}`, `\\theta \\approx ${dp(v)}^\\circ`],
  };
}

/** The worked solution: the figure (with the mirror angle, the back bearing or the angle inside marked) and the working. */
export type RuleSolution = { fig: Figure; steps: string[] };
export function renderRule(spec: RuleSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(figureSvg(spec.fig, true), steps);
}

/** The prompts, in the question's language: what each kind of question asks ({u} its unit). */
export type TrigRuleWords = Record<"obtuse" | "between" | "value" | "side" | "angle" | "area" | "ambiguous" | "back" | "trip" | "depression" | "elevation", string>;
/** The prompt for each kind of question. */
export const PROMPT_OF: Record<RuleKind, keyof TrigRuleWords> = {
  sinSame: "obtuse", cosNeg: "between", value: "value", sineSide: "side", sineAngle: "angle", cosSide: "side", cosAngle: "angle", area: "area",
  ambiguous: "ambiguous", back: "back", trip: "trip", depression: "depression", elevation: "elevation",
};
