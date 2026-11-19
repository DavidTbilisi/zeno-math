// Practice: Expected value and variance.
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { fr, num, plainFrac } from "../practiceKit";
import type { Exercise, Gen, Rng } from "../practiceTypes";

/** Three or four values from −3 to 8, their probabilities a random split of 5, 8, 10 or 12. */
function smallDist(r: Rng): { xs: number[]; ps: Frac[] } {
  const k = r.pick([3, 4] as const);
  const xs: number[] = [];
  while (xs.length < k) {
    const x = r.int(-3, 8);
    if (!xs.includes(x)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  const d = r.pick([5, 8, 10, 12] as const);
  const cuts = new Set<number>();
  while (cuts.size < k - 1) cuts.add(r.int(1, d - 1));
  const cs = [0, ...[...cuts].sort((a, b) => a - b), d];
  return { xs, ps: cs.slice(1).map((c, i) => fr(c - cs[i], d)) };
}

/** A distribution as a table: x on top, P(X = x) beneath. */
const distTable = (xs: number[], ps: Frac[]) =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.join(" & ")} \\\\ \\hline P(X = x) & ${ps.map((p) => p.tex()).join(" & ")} \\end{array}`;

const gen: Gen = (r, L, w) => {
  // Three or four values, their probabilities a split of a small denominator.
  const { xs, ps } = smallDist(r);
  const E = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x))), fr(0));
  const V = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x * x))), fr(0)).sub(E.mul(E));
  const src = [xs.join(", "), ps.map(plainFrac).join(", ")];
  const out = (prompt: string, v: Frac, solution: Exercise["solution"]) => ({
    prompt, q: distTable(xs, ps), answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v), format: "fraction" as const, solution,
  });
  if (L === 1) return out(w.prompts.expMean, E, { kind: "randvar", spec: { topic: "discrete", src } });
  if (L === 2) return out(w.prompts.expVar, V, { kind: "randvar", spec: { topic: "discrete", src } });
  // Var(aX + b) = a² Var(X): b moves the values, a stretches them.
  const [a, b] = [r.pick([-3, -2, 2, 3, 4] as const), r.nz(-6, 6)];
  return out(fill(w.prompts.expRule, { e: `Var(${a < 0 ? `−${-a}` : a}X ${b < 0 ? "−" : "+"} ${Math.abs(b)})` }), V.mul(fr(a * a)), { kind: "randvar", spec: { topic: "rules", src: [...src, String(a), String(b)] } });
};

export default gen;
