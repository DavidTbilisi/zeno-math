// Dynamical systems as a degree's elective teaches them (Strogatz, Nonlinear Dynamics and Chaos): bifurcations of
// x′ = f(x, r), fixed points, cycles and their stability for iterated maps, Lyapunov exponents and period doubling.
// The words, the data and the rules; the questions are in src/math/skills/{bifurcations,iteratedMaps,lyapunov}.ts.
import { Frac } from "./fraction";
import { numTraps, type NumSlip } from "./calculusTwo";
import { dp } from "./practiceKit";
import type { Answer, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `dyn` block). */
export type DynamicsWords = {
  prompt: {
    critical: string;
    kind: string;
    stableAt: string;
    fixedPoint: string;
    iterate: string;
    multiplier: string;
    fixedStability: string;
    cycle: string;
    shift: string;
    exponent: string;
    nextDoubling: string;
    delta: string;
  };
  kinds: { saddleNode: string; transcritical: string; supercritical: string; subcritical: string };
  stable: string;
  unstable: string;
};

/** Feigenbaum's constant, to the places the questions give it. */
export const DELTA = 4.669;

// ---------- the logistic map r x (1 − x) ----------

export const logistic = (r: Frac, x: Frac) => r.mul(x).mul(new Frac(1).sub(x));
/** Its nonzero fixed point 1 − 1/r. */
export const logisticFixed = (r: Frac) => new Frac(1).sub(new Frac(1).div(r));
/** f′(x*) = r(1 − 2x*) = 2 − r at the nonzero fixed point. */
export const logisticMultiplier = (r: Frac) => r.mul(new Frac(1).sub(logisticFixed(r).mul(new Frac(2))));

/** The 2-cycle of the logistic map for an r whose (r + 1)(r − 3) = (r − 1)² − 4 is a square s²: with t > 0,
 *  r − 1 = (t + 4/t)/2 and s = (4/t − t)/2, and the cycle is ((r + 1) ± s)/(2r). */
export function cycleOf(t: Frac): { r: Frac; s: Frac; cycle: [Frac, Frac] } {
  const four = new Frac(4).div(t);
  const r = new Frac(1).add(t.add(four).div(new Frac(2)));
  const s = four.sub(t).div(new Frac(2));
  const top = r.add(new Frac(1));
  const twoR = r.mul(new Frac(2));
  return { r, s, cycle: [top.sub(s).div(twoR), top.add(s).div(twoR)] };
}
/** t values whose r lies in (3, 4], past the first period doubling at r = 3. */
export const CYCLE_T: readonly Frac[] = [new Frac(3, 2), new Frac(4, 3), new Frac(6, 5), new Frac(1), new Frac(4, 5)];

// ---------- piecewise-linear maps ----------

/** m x mod 1, exactly. */
export const shiftMap = (m: number, x: Frac) => {
  const y = x.mul(new Frac(m));
  return new Frac(y.n - Math.floor(y.n / y.d) * y.d, y.d);
};
/** The Lyapunov exponent of the skew tent map with its peak at c: slope 1/c on a share c of [0, 1], 1/(1 − c) on
 *  the rest, and the uniform measure is invariant, so λ = c ln(1/c) + (1 − c) ln(1/(1 − c)). */
export const skewTentExponent = (c: number) => c * Math.log(1 / c) + (1 - c) * Math.log(1 / (1 - c));

// ---------- answers ----------

/** A decimal answer to 3 places, with slips judged at the same tolerance. */
export function dec3(v: number, slips: NumSlip[] = []): { answer: Answer; show: string; plain: string; format: Format } {
  const traps: Trap[] = numTraps(v, slips)
    .filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 0.002)
    .map((t) => (t.a.k === "num" ? { ...t, a: { ...t.a, tol: 0.0006 } } : t));
  return { answer: { k: "num", v, tol: 0.0006, ...(traps.length ? { traps } : {}) }, show: dp(v, 3), plain: dp(v, 3), format: "dp3" };
}

/** A listed set of numbers, shown as x = a, b. */
export function listed(vs: Frac[], traps: { id: Trap["id"]; vs: Frac[] }[]): { answer: Answer; show: string; plain: string; format: Format } {
  const sort = (xs: Frac[]) => [...xs].sort((a, b) => a.toNumber() - b.toNumber());
  const as = sort(vs);
  const key = (xs: Frac[]) => sort(xs).map((x) => x.toNumber().toFixed(9)).join();
  const seen = new Set([key(as)]);
  const ts: Trap[] = [];
  for (const t of traps) {
    if (seen.has(key(t.vs))) continue;
    seen.add(key(t.vs));
    ts.push({ id: t.id, a: { k: "set", vs: sort(t.vs).map((x) => x.toNumber()), tol: 1e-9, listed: true } });
  }
  return {
    answer: { k: "set", vs: as.map((x) => x.toNumber()), tol: 1e-9, listed: true, ...(ts.length ? { traps: ts } : {}) },
    show: `x = ${as.map((x) => x.tex()).join(", \\; ")}`,
    plain: as.map((x) => (x.d === 1 ? String(x.n) : `${x.n}/${x.d}`)).join("; "),
    format: "roots",
  };
}
