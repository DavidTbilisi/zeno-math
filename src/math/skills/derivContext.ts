// Practice: derivatives in context (#667). Easy: what f′(a) says in words, a velocity, speeding up or slowing down.
// Medium: a tangent-line estimate, a local maximum or minimum read from f′. Hard: the largest open box from a sheet,
// the largest pen against a wall, and the greatest value on a closed interval. The rate taken for the value or for a
// change over the interval, the position for the velocity, the acceleration's sign alone, the step not scaled or x
// used for the step, maximum and minimum swapped, the root that leaves no box, four sides of fence, and the ends of
// the interval forgotten are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const m = (v: number) => String(v).replace("-", "−");
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const term = (c: number, v: string, first = false) => (c === 0 ? "" : `${first ? (c < 0 ? "−" : "") : c < 0 ? " − " : " + "}${Math.abs(c) === 1 && v ? "" : Math.abs(c)}${v}`);

const gen: Gen = (r, L, w) => {
  const W = w.qdc;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const t = r.pick(["meaning", "velocity", "speeding"] as const);
    if (t === "meaning") {
      const [a, v] = [r.int(2, 9), r.int(2, 6)];
      const tea = r.next() < 0.5;
      const [q, right, value, total] = tea ? [W.teaQ, W.teaRight, W.teaValue, W.teaTotal] : [W.tankQ, W.tankRight, W.tankValue, W.tankTotal];
      return pickPart(r, [right, value, total].map((s) => fill(s, { a, v })), 0, [{ id: "rateAsValue", at: 1 }, { id: "rateOverInterval", at: 2, vars: { a } }], fill(q, { a, v }),
        [tea ? `T'(${a}) = -${v}\\ \\text{°C/min}` : `W'(${a}) = ${v}\\ \\text{L/min}`]);
    }
    if (t === "velocity") {
      // s = t³ − pt² + qt, so v = 3t² − 2pt + q.
      const [p, q, k] = [r.int(1, 6), r.int(-5, 9), r.int(1, 4)];
      const s = `${term(1, "t³", true)}${term(-p, "t²")}${term(q, "t")}`;
      const v = 3 * k * k - 2 * p * k + q;
      return numQ(fill(W.velocityQ, { s, k }), v, [slip("positionForVelocity", k ** 3 - p * k * k + q * k, { s: m(k ** 3 - p * k * k + q * k), k })],
        [`v(t) = s'(t) = 3t^2 ${-2 * p < 0 ? "-" : "+"} ${2 * p}t ${q < 0 ? "-" : "+"} ${Math.abs(q)}`, `v(${k}) = ${v}`]);
    }
    const [v, a] = [r.pick([-1, 1]) * r.int(1, 8), r.pick([-1, 1]) * r.int(1, 6)];
    const up = v * a > 0;
    return pickPart(r, [W.up, W.down], up ? 0 : 1, v < 0 ? [{ id: "accelSignOnly", at: up ? 1 : 0, vars: { v: m(v), ac: m(a) } }] : [], fill(W.speedingQ, { k: r.int(1, 9), v: m(v), ac: m(a) }),
      [`v = ${v},\\ a = ${a}`, up ? "\\text{same sign}" : "\\text{opposite signs}"]);
  }

  if (L === 2) {
    if (r.next() < 0.5) {
      const [a, b, c] = [r.int(1, 9), r.int(-5, 12), r.pick([-3, -2, -1, 0.5, 1, 2, 3, 4])];
      const h = r.pick([-0.2, -0.1, 0.1, 0.2, 0.3]);
      const x = r4(a + h);
      const est = r4(b + c * h);
      return numQ(fill(W.linearQ, { a, b: m(b), c: m(c), x: m(x) }), est,
        [slip("stepNotScaled", r4(b + c), { a, h: m(h), x: m(x), b: m(b), c: m(c) }), slip("xForStep", r4(b + c * x), { a, h: m(h) })],
        [`f(${x}) \\approx f(${a}) + f'(${a})(${x} - ${a})`, `${b} + ${c} \\times ${h} = ${est}`]);
    }
    const p = r.int(-5, 3);
    const q = p + r.int(1, 5);
    const max = r.next() < 0.5;
    const f = `(x${term(-p, "")})(x${term(-q, "")})`;
    return numQ(fill(max ? W.maxQ : W.minQ, { f }), max ? p : q, [slip("maxMinSwapped", max ? q : p, { p: m(p), q: m(q) })],
      [`x < ${p}:\\ f' > 0;\\ ${p} < x < ${q}:\\ f' < 0;\\ x > ${q}:\\ f' > 0`, max ? `\\text{max at } x = ${p}` : `\\text{min at } x = ${q}`]);
  }

  const t = r.pick(["box", "fence", "closed"] as const);
  if (t === "box") {
    // V = x(s − 2x)², V′ = (s − 2x)(s − 6x): zero at x = s/6 (the largest box) and x = s/2 (no box).
    const s = 6 * r.int(1, 5);
    return numQ(fill(W.boxQ, { s }), s / 6, [slip("endpointRootKept", s / 2, { e: s / 2, x: s / 6 })], [`V = x(${s} - 2x)^2`, `V' = (${s} - 2x)(${s} - 6x) = 0`, `x = ${s / 6}`]);
  }
  if (t === "fence") {
    // A new setting: A = x(F − 2x) is largest at x = F/4, A = F²/8.
    const F = r.pick([40, 80, 120, 160, 200]);
    return numQ(fill(W.fenceQ, { f: F }), (F * F) / 8, [slip("fourSidesAssumed", (F * F) / 16, { f: F })], [`A = x(${F} - 2x)`, `A' = ${F} - 4x = 0 \\Rightarrow x = ${F / 4}`, `A = ${F / 4} \\times ${F / 2} = ${(F * F) / 8}`]);
  }
  // x³ − 3k²x has its local maximum 2k³ at x = −k; the right end beats it.
  const k = r.int(1, 2);
  const b = k === 1 ? r.pick([3, 4]) : r.pick([5, 6]);
  const fb = b ** 3 - 3 * k * k * b;
  return numQ(fill(W.closedQ, { f: `x³ − ${3 * k * k}x`, a: m(-2 * k), b }), fb, [slip("endpointsIgnored", 2 * k ** 3, { l: 2 * k ** 3, b, v: fb })],
    [`f'(x) = 3x^2 - ${3 * k * k} = 0 \\Rightarrow x = \\pm ${k}`, `f(${-2 * k}) = ${-2 * k ** 3},\\ f(${-k}) = ${2 * k ** 3},\\ f(${k}) = ${-2 * k ** 3},\\ f(${b}) = ${fb}`]);
};

export default gen;
