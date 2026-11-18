// Arcs, sectors and radians (Think Mathematics 3B ch. 8; AoPS Introduction to Geometry ch. 11): the arc length, area
// and perimeter of a sector with its angle in degrees (easy); degrees to radians and back, and s = rθ, A = ½r²θ (medium);
// the angle from an arc, the radius from a sector's area, and the area of a segment (hard). Each question comes with its
// figure, the angle drawn to scale, the working as formulas, and the answers the usual slips give: the whole circle
// instead of the fraction θ/360, the area formula for the arc (or the other way), the perimeter without its radii, the
// conversion the wrong way up, radians taken for degrees, the half left out, s ÷ r upside down, the square root
// forgotten, the triangle not taken away, and sin θ taken in degree mode.
import { C, esc, FONT, r2 } from "./chart";
import { withSteps } from "./angleGuess";

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const RAD = Math.PI / 180;
/** A number as the working shows it: to 2 decimal places, trailing zeros dropped. */
export const dp = (v: number, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);

export type Pic = { body: string; w: number; h: number };
export type ArcMistake =
  | "wholeCircle" | "arcAsArea" | "areaAsArc" | "perimeterNoRadii" | "radianFlipped" | "radiansAsDegrees"
  | "sectorNotHalved" | "arcRatioFlipped" | "noSquareRoot" | "segmentNoTriangle" | "degreeMode";
export type Trap = { id: ArcMistake; v: number; vars: Record<string, string | number> };

// ---------- the figure ----------

/**
 * A circle with a sector of angle t degrees (drawn to scale), what its radius, arc and angle show ("r", "s" and "θ" the
 * unknowns, in red), and what is marked: the arc (orange), the sector (shaded), the arc and both radii (the perimeter)
 * or the segment between the chord and the arc. The worked figure of a segment adds the triangle taken away.
 */
export type SectorFig = { t: number; r: string; s?: string; angle: string; mark: "arc" | "sector" | "perim" | "segment" | "angle" };

function text(x: number, y: number, s: string, color: string = C.ink, size = 14, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y + size * 0.35)}" ${FONT} font-size="${size}" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
}
const colour = (s: string) => (s === "r" || s === "s" || s === "θ" ? C.red : C.ink);

export function sectorSvg(f: SectorFig, worked = false): Pic {
  const R = 82;
  const [w, h] = [300, 270];
  const [cx, cy] = [w / 2, h / 2 + 4];
  // The sector is symmetric about the upward vertical: from 90° + t/2 round to 90° − t/2, clockwise on screen.
  const pt = (d: number, rr = R): [number, number] => [cx + rr * Math.cos(d * RAD), cy - rr * Math.sin(d * RAD)];
  const [a0, a1] = [90 + f.t / 2, 90 - f.t / 2];
  const [p, q] = [pt(a0), pt(a1)];
  const large = f.t > 180 ? 1 : 0;
  const arcPath = `M${r2(p[0])},${r2(p[1])} A${R},${R} 0 ${large} 1 ${r2(q[0])},${r2(q[1])}`;
  const fill = `rgba(25,113,194,0.16)`;
  const parts = [`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.grey}" stroke-width="1.4" stroke-dasharray="4 4"/>`];
  if (f.mark === "sector") parts.push(`<path d="M${cx},${cy} L${r2(p[0])},${r2(p[1])} A${R},${R} 0 ${large} 1 ${r2(q[0])},${r2(q[1])} Z" fill="${fill}"/>`);
  if (f.mark === "segment") parts.push(`<path d="${arcPath} Z" fill="${fill}"/>`);
  const thick = f.mark === "arc" || f.mark === "perim" || f.mark === "angle";
  parts.push(`<path d="${arcPath}" fill="none" stroke="${thick ? C.orange : C.ink}" stroke-width="${thick ? 3.4 : 1.8}"/>`);
  const radius = f.mark === "perim" ? C.orange : C.ink;
  parts.push(`<path d="M${r2(p[0])},${r2(p[1])} L${cx},${cy} L${r2(q[0])},${r2(q[1])}" fill="none" stroke="${radius}" stroke-width="${f.mark === "perim" ? 3.4 : 2}" stroke-linejoin="round"/>`);
  if (f.mark === "segment") {
    parts.push(`<path d="M${r2(p[0])},${r2(p[1])} L${r2(q[0])},${r2(q[1])}" stroke="${C.ink}" stroke-width="2"/>`);
    if (worked) parts.push(`<path d="M${cx},${cy} L${r2(p[0])},${r2(p[1])} L${r2(q[0])},${r2(q[1])} Z" fill="rgba(47,158,68,0.18)" stroke="${C.green}" stroke-width="2" stroke-dasharray="6 4"/>`);
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="3.5" fill="${C.ink}"/>`);
  // The angle at the centre: a small arc, its label on the bisector (inside the sector).
  const ar = f.t > 150 ? 18 : 24;
  const [u, v] = [pt(a0, ar), pt(a1, ar)];
  parts.push(`<path d="M${r2(u[0])},${r2(u[1])} A${ar},${ar} 0 ${large} 1 ${r2(v[0])},${r2(v[1])}" fill="none" stroke="${C.blue}" stroke-width="2"/>`);
  const [lx, ly] = pt(90, ar + 16);
  parts.push(text(lx, ly, f.angle, f.angle === "θ" ? C.red : C.blue));
  // The radius: beside the right-hand one, outside the sector (inside it when the sector is reflex and the gap narrow),
  // the label starting at the line and running away from it.
  const mid = pt(a1, R / 2);
  const side = f.t > 180 ? -1 : 1;
  const nx = side * Math.cos((a1 - 90) * RAD);
  const ny = -side * Math.sin((a1 - 90) * RAD);
  parts.push(text(mid[0] + 9 * nx, mid[1] + 9 * ny, f.r, colour(f.r), 14, nx >= 0 ? "start" : "end"));
  if (f.s) {
    const [sx, sy] = pt(90, R + 18);
    parts.push(text(sx, sy, f.s, colour(f.s)));
  }
  return { body: parts.join(""), w, h };
}

// ---------- questions ----------

export type ArcKind = "arc" | "sector" | "perim" | "toRad" | "toDeg" | "toDegPi" | "arcRad" | "sectorRad" | "angle" | "radius" | "segment";
export type ArcQuestion = {
  kind: ArcKind;
  /** The formula above the figure (TeX), if any. */
  q: string;
  vars: Record<string, string | number>;
  fig: SectorFig | null;
  v: number;
  /** The unit the answer is in, as written after it: in the question's language, and in Latin letters. */
  unit?: [string, string];
  /** Whole degrees (from a fraction of π) or 2 decimal places. */
  exact: boolean;
  measure: "deg" | "rad" | "len" | "area";
  traps: Trap[];
  steps: string[];
};
export type Units = { cm: string; rad: string };

const keep = (v: number, traps: Trap[]) => traps.filter((t) => Number.isFinite(t.v) && t.v > 0 && Math.abs(t.v - v) > 0.02);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** θ in radians as a decimal with one place, between lo and hi. */
const tenths = (int: (lo: number, hi: number) => number, lo: number, hi: number) => int(lo * 10, hi * 10) / 10;

/** Level 1: the arc length, the area and the perimeter of a sector, its angle in degrees. */
export function degreeQuestion(next: Next, u: Units): ArcQuestion {
  const int = intOf(next);
  const kind = (["arc", "sector", "perim"] as const)[int(0, 2)];
  const r = int(3, 15);
  let t: number;
  do t = 5 * int(6, 64);
  while (t % 90 === 0 && next() < 0.7);
  const frac = `\\frac{${t}}{360}`;
  const arc = (t / 360) * 2 * Math.PI * r;
  const area = (t / 360) * Math.PI * r * r;
  const len: [string, string] = [u.cm, "cm"];
  const fig: SectorFig = { t, r: `${r} ${u.cm}`, angle: `${t}°`, mark: kind };
  if (kind === "arc") {
    const traps = keep(arc, [
      { id: "wholeCircle", v: 2 * Math.PI * r, vars: { x: dp(2 * Math.PI * r), t, v: dp(arc) } },
      { id: "arcAsArea", v: area, vars: { x: dp(area), v: dp(arc) } },
    ]);
    return { kind, q: "", vars: {}, fig, v: arc, unit: len, exact: false, measure: "len", traps, steps: [`s = ${frac}\\times 2\\pi r`, `s = ${frac}\\times 2\\pi \\times ${r} \\approx ${dp(arc)}`] };
  }
  if (kind === "sector") {
    const traps = keep(area, [
      { id: "wholeCircle", v: Math.PI * r * r, vars: { x: dp(Math.PI * r * r), t, v: dp(area) } },
      { id: "areaAsArc", v: arc, vars: { x: dp(arc), v: dp(area) } },
    ]);
    return { kind, q: "", vars: {}, fig, v: area, unit: [`${u.cm}²`, "cm²"], exact: false, measure: "area", traps, steps: [`A = ${frac}\\times \\pi r^2`, `A = ${frac}\\times \\pi \\times ${r}^2 \\approx ${dp(area)}`] };
  }
  const v = arc + 2 * r;
  const traps = keep(v, [
    { id: "perimeterNoRadii", v: arc, vars: { x: dp(arc), s: dp(arc), r, v: dp(v) } },
    { id: "perimeterNoRadii", v: arc + r, vars: { x: dp(arc + r), s: dp(arc), r, v: dp(v) } },
    { id: "wholeCircle", v: 2 * Math.PI * r + 2 * r, vars: { x: dp(2 * Math.PI * r + 2 * r), t, v: dp(v) } },
  ]);
  return { kind, q: "", vars: {}, fig, v, unit: len, exact: false, measure: "len", traps, steps: [`s = ${frac}\\times 2\\pi \\times ${r} \\approx ${dp(arc)}`, `P = s + 2r \\approx ${dp(arc)} + ${2 * r} = ${dp(v)}`] };
}

/** Level 2: degrees to radians and back, the arc s = rθ and the sector A = ½r²θ. */
export function radianQuestion(next: Next, u: Units): ArcQuestion {
  const int = intOf(next);
  const kind = (["toRad", "toDeg", "arcRad", "sectorRad"] as const)[int(0, 3)];
  if (kind === "toRad") {
    let t: number;
    do t = 5 * int(3, 70);
    while (t % 45 === 0);
    const v = t * RAD;
    const traps = keep(v, [{ id: "radianFlipped", v: t / RAD, vars: { x: dp(t / RAD), v: dp(v) } }]);
    return { kind, q: `\\theta = ${t}^\\circ`, vars: {}, fig: null, v, unit: [u.rad, "rad"], exact: false, measure: "rad", traps, steps: [`\\theta = ${t}\\times\\frac{\\pi}{180} \\approx ${dp(v)}`] };
  }
  if (kind === "toDeg") {
    if (next() < 0.5) {
      // A fraction of π: a whole number of degrees.
      const n = [2, 3, 4, 5, 6, 9, 10, 12, 15, 18][int(0, 9)];
      let k: number;
      do k = int(1, 2 * n - 1);
      while (gcd(k, n) !== 1);
      const v = (180 * k) / n;
      const pi = `${k === 1 ? "" : k}\\pi`;
      const traps = keep(v, [{ id: "radianFlipped", v: ((k / n) * Math.PI) * RAD, vars: { x: dp(((k / n) * Math.PI) * RAD), v } }]);
      return { kind: "toDegPi", q: `\\theta = \\frac{${pi}}{${n}}`, vars: {}, fig: null, v, exact: true, measure: "deg", traps, steps: [`\\theta = \\frac{${pi}}{${n}}\\times\\frac{180^\\circ}{\\pi} = \\frac{${k}\\times 180^\\circ}{${n}} = ${v}^\\circ`] };
    }
    const th = tenths(int, 0.3, 6);
    const v = th / RAD;
    const traps = keep(v, [{ id: "radianFlipped", v: th * RAD, vars: { x: dp(th * RAD, 4), v: dp(v) } }]);
    return { kind, q: `\\theta = ${th}\\,\\mathrm{rad}`, vars: {}, fig: null, v, exact: false, measure: "deg", traps, steps: [`\\theta = ${th}\\times\\frac{180^\\circ}{\\pi} \\approx ${dp(v)}^\\circ`] };
  }
  const r = int(3, 14);
  const th = tenths(int, 0.5, 5.5);
  const fig: SectorFig = { t: th / RAD, r: `${r} ${u.cm}`, angle: `${th} ${u.rad}`, mark: kind === "arcRad" ? "arc" : "sector" };
  if (kind === "arcRad") {
    const v = r * th;
    const asDeg = (th / 360) * 2 * Math.PI * r;
    const traps = keep(v, [
      { id: "radiansAsDegrees", v: asDeg, vars: { x: dp(asDeg), t: th, v: dp(v) } },
      { id: "arcAsArea", v: 0.5 * r * r * th, vars: { x: dp(0.5 * r * r * th), v: dp(v) } },
    ]);
    return { kind, q: "", vars: {}, fig, v, unit: [u.cm, "cm"], exact: false, measure: "len", traps, steps: [`s = r\\theta = ${r}\\times ${th} = ${dp(v)}`] };
  }
  const v = 0.5 * r * r * th;
  const traps = keep(v, [
    { id: "sectorNotHalved", v: r * r * th, vars: { x: dp(r * r * th), v: dp(v) } },
    { id: "radiansAsDegrees", v: (th / 360) * Math.PI * r * r, vars: { x: dp((th / 360) * Math.PI * r * r), t: th, v: dp(v) } },
    { id: "areaAsArc", v: r * th, vars: { x: dp(r * th), v: dp(v) } },
  ]);
  return { kind, q: "", vars: {}, fig, v, unit: [`${u.cm}²`, "cm²"], exact: false, measure: "area", traps, steps: [`A = \\tfrac{1}{2}r^2\\theta = \\tfrac{1}{2}\\times ${r}^2\\times ${th} = ${dp(v)}`] };
}

/** Level 3: the angle from an arc, the radius from a sector's area, and the area of a segment. */
export function sectorQuestion(next: Next, u: Units): ArcQuestion {
  const int = intOf(next);
  const kind = (["angle", "radius", "segment"] as const)[int(0, 2)];
  if (kind === "angle") {
    let r: number, s: number;
    do [r, s] = [int(4, 15), int(3, 60)];
    while (s / r < 0.5 || s / r > 5.5 || s === r);
    const v = s / r;
    const traps = keep(v, [{ id: "arcRatioFlipped", v: r / s, vars: { x: dp(r / s), v: dp(v) } }]);
    return {
      kind, q: "", vars: {}, v, unit: [u.rad, "rad"], exact: false, measure: "rad", traps,
      fig: { t: v / RAD, r: `${r} ${u.cm}`, s: `${s} ${u.cm}`, angle: "θ", mark: "angle" },
      steps: [`s = r\\theta`, `\\theta = \\frac{s}{r} = \\frac{${s}}{${r}} \\approx ${dp(v)}`],
    };
  }
  if (kind === "radius") {
    // The area is ½r²θ for a whole r, so the radius comes out whole.
    const r = int(3, 12);
    const th = tenths(int, 0.5, 4);
    const A = Math.round(0.5 * r * r * th * 100) / 100;
    const traps = keep(r, [
      { id: "noSquareRoot", v: (2 * A) / th, vars: { x: dp((2 * A) / th), v: r } },
      { id: "sectorNotHalved", v: Math.sqrt(A / th), vars: { x: dp(Math.sqrt(A / th)), v: r } },
    ]);
    return {
      kind, q: "", vars: { a: A, au: `${u.cm}²` }, v: r, unit: [u.cm, "cm"], exact: false, measure: "len", traps,
      fig: { t: th / RAD, r: "r", angle: `${th} ${u.rad}`, mark: "sector" },
      steps: [`\\tfrac{1}{2}r^2\\times ${th} = ${A}`, `r^2 = \\frac{2\\times ${A}}{${th}} = ${dp((2 * A) / th)}`, `r = \\sqrt{${dp((2 * A) / th)}} = ${r}`],
    };
  }
  const r = int(4, 12);
  const th = tenths(int, 0.6, 3);
  const v = 0.5 * r * r * (th - Math.sin(th));
  const traps = keep(v, [
    { id: "segmentNoTriangle", v: 0.5 * r * r * th, vars: { x: dp(0.5 * r * r * th), v: dp(v) } },
    { id: "degreeMode", v: 0.5 * r * r * (th - Math.sin(th * RAD)), vars: { x: dp(0.5 * r * r * (th - Math.sin(th * RAD))), v: dp(v) } },
  ]);
  return {
    kind, q: "", vars: {}, v, unit: [`${u.cm}²`, "cm²"], exact: false, measure: "area", traps,
    fig: { t: th / RAD, r: `${r} ${u.cm}`, angle: `${th} ${u.rad}`, mark: "segment" },
    steps: [
      `\\text{sector} = \\tfrac{1}{2}\\times ${r}^2\\times ${th} = ${dp(0.5 * r * r * th)}`,
      `\\text{triangle} = \\tfrac{1}{2}\\times ${r}^2\\,\\sin ${th} \\approx ${dp(0.5 * r * r * Math.sin(th))}`,
      `A = \\tfrac{1}{2}r^2(\\theta - \\sin\\theta) \\approx ${dp(v)}`,
    ],
  };
}

/** The worked solution: the figure (a segment with its triangle marked) and the working. */
export type ArcSolution = { fig: SectorFig | null; steps: string[] };
export function renderArc(spec: ArcSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(spec.fig ? sectorSvg(spec.fig, true) : { body: "", w: 0, h: 0 }, steps);
}

/** The prompts, in the question's language: what each kind of question asks ({u} the answer's unit). */
export type ArcWords = Record<"rad" | "arc" | "sector" | "perim" | "toRad" | "toDeg" | "toDegPi" | "angle" | "radius" | "segment", string>;
export const PROMPT_OF: Record<ArcKind, keyof ArcWords> = {
  arc: "arc", sector: "sector", perim: "perim", toRad: "toRad", toDeg: "toDeg", toDegPi: "toDegPi", arcRad: "arc", sectorRad: "sector",
  angle: "angle", radius: "radius", segment: "segment",
};
