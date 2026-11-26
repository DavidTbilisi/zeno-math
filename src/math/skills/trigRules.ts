// Practice: Sine and cosine rules, bearings. #716 added whole triangles and word problems. Medium: a side from two
// angles and the side between them (the third angle first), and a side from two sides and the angle between them.
// Hard: how far apart two ships are after sailing from one port on two bearings, and how far a boat is from a
// lighthouse seen from two lighthouses. The side paired with the wrong angle, the cosine rule used without its
// −2bc cos A and the square root left out are slips.
import { fill, r2 } from "../chart";
import { appliedQuestion, figureSvg, obtuseQuestion, PROMPT_OF, sineCosineQuestion, three } from "../trigRules";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { figurePic, type Figure, type P2 } from "../simPics";

const rad = (d: number) => (d * Math.PI) / 180;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
/** A triangle from the side AB = c and the angles at A and B, A at the origin and AB along the ground. */
const tri = (c: number, A: number, B: number): Record<string, P2> => {
  const b = (c * sin(B)) / sin(180 - A - B);
  return { A: [0, 0], B: [c, 0], C: [b * cos(A), b * sin(A)] };
};
function dpPart(prompt: string, v: number, unit: string, traps: Trap[], steps: string[], f: Figure, size: [number, number] = [240, 150]): Part {
  const kept = traps.filter((t) => t.a.k === "num" && Number.isFinite(t.a.v) && Math.abs(t.a.v - v) > 0.05 * v);
  return {
    prompt, q: "", pic: figurePic(f, ...size), answer: { k: "num", v, tol: 0.0051, units: [unit], traps: kept },
    show: `\\approx ${dp(v, 2)}\\,\\mathrm{${unit}}`, plain: dp(v, 2), format: "dp2", steps,
  };
}
const slip = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v, 0.0051), vars: { x: dp(v, 2), ...vars } });

/** The kinds #716 added. */
function more(r: Rng, L: 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.trgP;
  const cm = w.units.cm;
  const km = w.units.km;
  if (L === 2 && kind <= 7) {
    // Two angles and the side between them: C = 180° − A − B first, then a / sin A = c / sin C.
    let A: number, B: number;
    do [A, B] = [r.int(30, 95), r.int(25, 80)];
    while (A + B > 150 || Math.abs(A - B) < 8);
    const c = r.int(6, 20);
    const Cc = 180 - A - B;
    const v = (c * sin(A)) / sin(Cc);
    const f: Figure = { pts: tri(c, A, B), polys: [["A", "B", "C"]], sides: [{ a: "A", b: "B", text: `${c} ${cm}` }, { a: "B", b: "C", text: "?" }], angles: [{ at: "A", from: "B", to: "C", text: `${A}°` }, { at: "B", from: "C", to: "A", text: `${B}°` }] };
    return dpPart(fill(W.asa, { A, B, c, u: cm }), v, cm, [slip("sineRuleFlipped", (c * sin(A)) / sin(B), { v: dp(v, 2) })],
      [`C = 180^\\circ - ${A}^\\circ - ${B}^\\circ = ${Cc}^\\circ`, `\\frac{BC}{\\sin ${A}^\\circ} = \\frac{${c}}{\\sin ${Cc}^\\circ}`, `BC = \\frac{${c}\\,\\sin ${A}^\\circ}{\\sin ${Cc}^\\circ} \\approx ${dp(v, 2)}`], f);
  }
  if (L === 2) {
    // Two sides and the angle between them: a² = b² + c² − 2bc cos A.
    const [b, c] = [r.int(4, 15), r.int(4, 15)];
    let A = r.int(35, 140);
    while (Math.abs(A - 90) < 8) A = r.int(35, 140);
    const a2 = b * b + c * c - 2 * b * c * cos(A);
    const v = Math.sqrt(a2);
    const pts: Record<string, P2> = { A: [0, 0], B: [c, 0], C: [b * cos(A), b * sin(A)] };
    const f: Figure = { pts, polys: [["A", "B", "C"]], sides: [{ a: "A", b: "B", text: `${c} ${cm}` }, { a: "A", b: "C", text: `${b} ${cm}` }, { a: "B", b: "C", text: "?" }], angles: [{ at: "A", from: "B", to: "C", text: `${A}°` }] };
    return dpPart(fill(W.sas, { b, c, A, u: cm }), v, cm, [slip("cosineRuleNoCorrection", Math.hypot(b, c), { b, c, A, v: dp(v, 2) }), slip("noSquareRoot", a2, { v: dp(v, 2) })],
      [`BC^2 = ${b}^2 + ${c}^2 - 2 \\times ${b} \\times ${c} \\cos ${A}^\\circ \\approx ${dp(a2, 2)}`, `BC \\approx ${dp(v, 2)}`], f);
  }
  if (kind <= 7) {
    // Two ships from one port: the angle between their courses is the difference of the bearings.
    const [d1, d2] = [r.int(8, 40), r.int(8, 40)];
    const b1 = 5 * r.int(2, 30);
    let gap = 5 * r.int(8, 26);
    while (Math.abs(gap - 90) < 10) gap = 5 * r.int(8, 26);
    const b2 = b1 + gap;
    const v = Math.sqrt(d1 * d1 + d2 * d2 - 2 * d1 * d2 * cos(gap));
    const at = (b: number, d: number): P2 => [d * sin(b), d * cos(b)];
    const three_ = (n: number) => String(n).padStart(3, "0");
    const f: Figure = {
      pts: { P: [0, 0], A: at(b1, d1), B: at(b2, d2), N: [0, Math.max(d1, d2) * 0.45] }, hide: ["N"], polys: [["P", "A", "B"]], segs: [{ a: "P", b: "N", color: "#868e96" }],
      sides: [{ a: "P", b: "A", text: `${d1} ${km}` }, { a: "P", b: "B", text: `${d2} ${km}` }, { a: "A", b: "B", text: "?" }], notes: [{ at: "N", text: "N", dy: -6 }],
    };
    return dpPart(fill(W.ships, { a: d1, b: d2, p: three_(b1), q: three_(b2), u: km }), v, km, [slip("cosineRuleNoCorrection", Math.hypot(d1, d2), { b: d1, c: d2, A: gap, v: dp(v, 2) })],
      [`\\angle APB = ${three_(b2)}^\\circ - ${three_(b1)}^\\circ = ${gap}^\\circ`, `AB^2 = ${d1}^2 + ${d2}^2 - 2 \\times ${d1} \\times ${d2} \\cos ${gap}^\\circ`, `AB \\approx ${dp(v, 2)}`], f, [230, 200]);
  }
  // Two lighthouses d km apart see a boat: the distance from the first is opposite the angle at the second.
  let a: number, b: number;
  do [a, b] = [r.int(30, 80), r.int(30, 80)];
  while (Math.abs(a - b) < 8 || a + b > 150);
  const d = r.int(4, 15);
  const g = 180 - a - b;
  const v = (d * sin(b)) / sin(g);
  const f: Figure = { pts: { L: [0, 0], M: [d, 0], B: tri(d, a, b).C }, polys: [["L", "M", "B"]], sides: [{ a: "L", b: "M", text: `${d} ${km}` }, { a: "L", b: "B", text: "?" }], angles: [{ at: "L", from: "M", to: "B", text: `${a}°` }, { at: "M", from: "B", to: "L", text: `${b}°` }] };
  return dpPart(fill(W.lighthouses, { d, a, b, u: km }), v, km, [slip("sineRuleFlipped", (d * sin(a)) / sin(g), { v: dp(v, 2) })],
    [`\\angle LBM = 180^\\circ - ${a}^\\circ - ${b}^\\circ = ${g}^\\circ`, `LB = \\frac{${d}\\,\\sin ${b}^\\circ}{\\sin ${g}^\\circ} \\approx ${dp(v, 2)}`], f);
}

const gen: Gen = (r, L, w) => {
  if (L > 1) {
    const extra = r.int(0, 9);
    if (extra >= 5) return more(r, L as 2 | 3, extra, w);
  }
  return old(r, L, w);
};

/** The kinds the skill had before #716. */
const old: Gen = (r, L, w) => {
  // Trigonometry beyond the right angle (src/math/trigRules.ts): the sine and cosine of an obtuse angle (easy), the
  // sine rule, the cosine rule and the area ½bc sin A (medium), the ambiguous case, bearings and angles of elevation
  // and depression (hard). The figure is drawn to scale; the worked solution marks the mirror angle, the back bearing
  // or the angle inside the triangle.
  const u = { cm: w.units.cm, km: w.units.km, m: w.units.m };
  const q = L === 1 ? obtuseQuestion(r.next) : L === 2 ? sineCosineQuestion(r.next, u.cm) : appliedQuestion(r.next, u);
  const pic = figureSvg(q.fig);
  const tol = q.exact ? 1e-9 : 0.0051;
  const shown = q.exact ? (q.kind === "back" ? three(q.v) : String(q.v)) : dp(q.v, 2);
  const deg = q.measure === "deg" ? "^\\circ" : "";
  return {
    prompt: fill(w.trigRules[PROMPT_OF[q.kind]], { u: q.unit?.[0] ?? "", ...q.vars }),
    q: q.q,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: {
      ...num(q.v, tol),
      units: q.measure === "deg" ? ["°"] : q.unit ? [...new Set(q.unit)] : undefined,
      traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, tol), vars: t.vars })),
    },
    show: `${q.exact ? "" : "\\approx "}${shown}${deg}${q.unit ? `\\,\\mathrm{${q.unit[1].replace("²", "}^2{")}}` : ""}`,
    plain: shown,
    format: q.exact ? "number" : "dp2",
    solution: { kind: "trigRule", spec: { fig: q.fig, steps: q.steps } },
  };
};

export default gen;
