// Practice: slope fields, exponential and logistic models (#669). Easy: the slope at a point, and which equation a
// field's pattern fits. Medium: y(t) for dy/dt = ky, a constant solution, and checking a solution. Hard: a logistic
// model's carrying capacity and where it grows fastest, and, in a new setting, how fast the fish in a lake multiply.
// x and y swapped, horizontal and vertical swapped, growth taken as linear, the starting value not fitted, the
// equilibrium's sign kept, a constant added freely, the capacity upside down, the fastest growth at the capacity, and
// the logistic brake left out are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const m = (v: number) => String(v).replace("-", "−");
const r2 = (v: number) => Math.round(v * 100) / 100;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const minus = (c: number) => (c === 0 ? "" : ` ${c < 0 ? "+" : "−"} ${Math.abs(c)}`);

const gen: Gen = (r, L, w) => {
  const W = w.qsf;
  // A slip inside the answer's "close" window would be read as close, not as the slip, so it is left out.
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], tol?: number): Part => ({
    prompt, q: "", answer: { ...num(v, tol), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > Math.max(1e-6, 25 * (tol ?? 0))) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    if (r.next() < 0.5) {
      const [p, a, b] = [r.int(2, 4), r.int(-3, 4), r.int(-3, 4)];
      const sq = r.next() < 0.5;
      const f = sq ? `x² − ${p}y` : `${p}x − y`;
      const at = (x: number, y: number) => (sq ? x * x - p * y : p * x - y);
      return numQ(fill(W.slopeQ, { f, a: m(a), b: m(b) }), at(a, b), [slip("xySwapped", at(b, a), { a: m(a), b: m(b) })], [`y' = ${sq ? `(${a})^2 - ${p}(${b})` : `${p}(${a}) - (${b})`} = ${at(a, b)}`]);
    }
    const c = r.int(-3, 4);
    const rows = r.next() < 0.5;
    return pickPart(r, [`y′ = y${minus(c)}`, `y′ = x${minus(c)}`, `y′ = xy${minus(c)}`], rows ? 0 : 1, [{ id: "fieldAxisSwapped", at: rows ? 1 : 0 }],
      fill(rows ? W.rowsQ : W.colsQ, { c: m(c) }), [rows ? `y' \\text{ depends on } y \\text{ only}` : `y' \\text{ depends on } x \\text{ only}`]);
  }

  if (L === 2) {
    const t = r.pick(["grow", "equil", "check"] as const);
    if (t === "grow") {
      const [k, tt, A] = [r.pick([0.1, 0.2, 0.3, 0.5]), r.int(2, 5), 10 * r.int(1, 10)];
      const v = r2(A * Math.exp(k * tt));
      return numQ(fill(W.growQ, { k, A, t: tt }), v, [slip("linearForExponential", r2(A * (1 + k * tt)), { A, k }), slip("constantNotFitted", r2(Math.exp(k * tt)), { A, k })],
        [`y = ${A}e^{${k}t}`, `y(${tt}) = ${A}e^{${r2(k * tt)}} = ${v}`], 0.005);
    }
    if (t === "equil") {
      const [k, a] = [r.pick([-3, -2, -1, 2, 3, 4]), r.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6])];
      return numQ(fill(W.equilQ, { k: m(k), f: `y${minus(a)}` }), a, [slip("equilibriumSign", -a, { a: m(a) })], [`${k}(y ${a < 0 ? "+" : "-"} ${Math.abs(a)}) = 0`, `y = ${a}`]);
    }
    const [k, C, c] = [r.int(2, 4), r.int(2, 5), r.int(1, 5)];
    const yes = r.next() < 0.5;
    return pickPart(r, [W.yes, W.no], yes ? 0 : 1, yes ? [] : [{ id: "constantAddedFreely", at: 0, vars: { k } }], fill(W.checkQ, { f: yes ? `${C}e^(${k}x)` : `${C}e^(${k}x) + ${c}`, k }),
      [`y' = ${k * C}e^{${k}x}`, yes ? `${k}y = ${k * C}e^{${k}x}` : `${k}y = ${k * C}e^{${k}x} + ${k * c}`]);
  }

  const t = r.pick(["capacity", "fastest", "lake"] as const);
  const K = r.pick([100, 200, 400, 500, 1000]);
  const a = r.pick([0.2, 0.4, 0.5]);
  if (t === "capacity") {
    const b = r6(a / K);
    return numQ(fill(W.capacityQ, { a, b }), K, [slip("capacityInverted", r6(b / a), { a, b })], [`${a}P - ${b}P^2 = ${a}P(1 - P/${K})`, `K = ${a} \\div ${b} = ${K}`]);
  }
  if (t === "fastest") return numQ(fill(W.fastestQ, { a, K }), K / 2, [slip("fastestAtCapacity", K)], [`\\frac{d}{dP}\\,${a}P(1 - P/${K}) = 0`, `P = ${K / 2}`]);
  // A new setting: fish in a lake grow logistically.
  const p = K * r.pick([0.1, 0.2, 0.25, 0.5, 0.75]);
  const v = r2(a * p * (1 - p / K));
  return numQ(fill(W.lakeQ, { K, a, p }), v, [slip("logisticAsExponential", r2(a * p), { K, p })], [`${a} \\times ${p} \\times (1 - ${p}/${K}) = ${v}`]);
};

export default gen;
