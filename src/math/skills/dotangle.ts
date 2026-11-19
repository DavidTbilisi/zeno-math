// Practice: Angles between vectors.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const vs = (v: number[]) => `(${v.join(", ")})`;
  const sol = (a: number[], b: number[]) => ({ kind: "vectors" as const, spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } });
  const nonzero = (n: number) => {
    for (;;) {
      const v = Array.from({ length: n }, () => r.int(-5, 5));
      if (v.filter(Boolean).length >= 2) return v;
    }
  };
  const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
  if (L === 1) {
    const [a, b] = [nonzero(3), nonzero(3)];
    const v = dot(a, b);
    return { prompt: fill(w.prompts.vecDot, { a: vs(a), b: vs(b) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol(a, b) };
  }
  if (L === 2) {
    const n = r.pick([2, 3] as const);
    let a: number[], b: number[], c: number;
    do [a, b] = [nonzero(n), nonzero(n)], (c = dot(a, b) / Math.hypot(...a) / Math.hypot(...b));
    while (Math.abs(c) > 0.98 || Math.abs(c) < 1e-9);
    const v = (Math.acos(c) * 180) / Math.PI;
    return { prompt: fill(w.prompts.vecAngle, { a: vs(a), b: vs(b) }), q: "", answer: num(v, 0.0051), show: `${dp(v, 2)}^\\circ`, plain: dp(v, 2), format: "dp2", solution: sol(a, b) };
  }
  // Pairs with a whole-number angle, scaled and turned so they look different every time.
  const [a0, b0, deg] = r.pick([
    [[1, 1, 0], [0, 1, 1], 60],
    [[1, 0, 1], [0, 1, 1], 60],
    [[1, 0, 0], [1, 1, 0], 45],
    [[1, 1, 0], [-1, 0, 1], 120],
    [[1, 0, 0], [-1, 1, 0], 135],
    [[2, 1, 1], [1, 1, 0], 30],
    [[2, 1, 1], [-1, -1, 0], 150],
    [[1, 2, 2], [2, -2, 1], 90],
    [[1, 1, 1], [1, 1, -2], 90],
  ] as const);
  const perm = r.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const);
  const signs = [r.sign(), r.sign(), r.sign()];
  const turn = (v: readonly number[], k: number) => perm.map((j, i) => signs[i] * k * v[j] || 0);
  const [a, b] = [turn(a0, r.int(1, 3)), turn(b0, r.int(1, 2))];
  return { prompt: fill(w.prompts.vecAngleExact, { a: vs(a), b: vs(b) }), q: "", answer: num(deg), show: `${deg}^\\circ`, plain: String(deg), format: "number", solution: sol(a, b) };
};

export default gen;
