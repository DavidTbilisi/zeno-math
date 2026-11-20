// Ordinary differential equations as a degree's second year teaches them (Boyce and DiPrima, Elementary Differential
// Equations; Lebl, Notes on Diffy Qs; Trench, Elementary Differential Equations; Strogatz, Nonlinear Dynamics and
// Chaos): first-order equations (separable, linear by an integrating factor, exact), second-order equations with
// constant coefficients and undetermined coefficients, linear systems by eigenvalues and their phase portraits, the
// Laplace transform, and equilibria and their stability. The words, and the functions the answers are made of; the
// questions are in src/math/skills/{odeFirst,odeSecond,odeSystems,laplace,stability}.ts.
import { evalE, parseE, simp, tex, type E } from "./expr";
import { Frac } from "./fraction";
import type { MistakeId } from "./mistakes";
import type { Answer, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `ode` block). */
export type OdeWords = {
  stable: string;
  unstable: string;
  semiStable: string;
  kinds: { stableNode: string; unstableNode: string; saddle: string; stableSpiral: string; unstableSpiral: string; centre: string };
  prompt: {
    separable: string;
    linearFirst: string;
    exact: string;
    secondIvp: string;
    particular: string;
    eigenvalues: string;
    classify: string;
    systemIvp: string;
    transform: string;
    inverse: string;
    laplaceIvp: string;
    equilibria: string;
    stability: string;
    jacobian: string;
  };
};

// ---------- functions as typed ----------

const fracOf = (c: Frac | number) => (typeof c === "number" ? new Frac(c, 1) : c);

/** c·body as typed, with its sign: "3e^(2x)", "-e^(-x)", "(1/2)e^(x)", "-5", "4/3". */
export function coef(c: Frac | number, body: string): string {
  const f = fracOf(c);
  const sign = f.isNeg() ? "-" : "";
  const [n, d] = [Math.abs(f.n), f.d];
  if (!body) return `${sign}${d === 1 ? n : `${n}/${d}`}`;
  if (d === 1) return `${sign}${n === 1 ? "" : n}${body}`;
  return `${sign}(${n}/${d})${body}`;
}

/** A sum of c·body terms as typed, the zero ones left out: "3e^(2x) - (1/2)e^(-x) + 4". */
export function sumOf(terms: [Frac | number, string][]): string {
  let s = "";
  for (const [c, body] of terms) {
    const f = fracOf(c);
    if (f.isZero()) continue;
    const t = coef(f.abs(), body);
    s += s ? (f.isNeg() ? ` - ${t}` : ` + ${t}`) : f.isNeg() ? `-${t}` : t;
  }
  return s || "0";
}

/** e^(kv) as typed, or "" for k = 0 (the term is then a constant). */
export const ex = (k: Frac | number, v = "x") => (fracOf(k).isZero() ? "" : `e^(${coef(k, v)})`);

/** e^{kv} as LaTeX, "" for k = 0. */
export const eTex = (k: number, v = "x") => (k === 0 ? "" : `e^{${k === 1 ? "" : k === -1 ? "-" : k}${v}}`);

/** A typed function as LaTeX. */
export const T = (src: string, vars: readonly string[] = []) => tex(simp(parseE(src, vars)));

/** c₁v₁ + c₂v₂ + … as LaTeX with whole coefficients: "y'' - 4y' + 13y", "r^{2} + 2r - 3". */
export function linTex(terms: [number, string][]): string {
  let s = "";
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const m = Math.abs(c) === 1 && v ? "" : String(Math.abs(c));
    s += (s ? (c < 0 ? " - " : " + ") : c < 0 ? "-" : "") + m + v;
  }
  return s || "0";
}

// ---------- answers ----------

/** A function's values at a few points: x alone, or every letter positive and different. */
function valuesAt(e: E, vars: readonly string[]): number[] {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const env = Object.fromEntries(vars.map((v, j) => [v, 0.7 + 0.37 * i + 0.53 * j]));
    return evalE(e, vars.length ? 0.6 + 0.29 * i : -1.3 + 0.61 * i, env);
  });
}
/** Two functions equal (up to a constant when `plusC`). */
export function sameFn(a: E, b: E, vars: readonly string[] = [], plusC = false): boolean {
  const [u, v] = [valuesAt(a, vars), valuesAt(b, vars)];
  const off = plusC ? u[0] - v[0] : 0;
  return u.every((x, i) => Math.abs(x - v[i] - off) <= 1e-9 * Math.max(1, Math.abs(x)));
}

type Shown = { answer: Answer; show: string; plain: string; format: Format };
/** A function answer typed in x (or the letters `vars`), with named slips (dropped when they give the answer or an
 *  earlier slip). `plusC`: any constant may be added, as for an antiderivative or a potential. */
export function fnOf(src: string, slips: [MistakeId, string][] = [], vars: readonly string[] = [], format: Format = "expr", plusC = false): Shown {
  const e = parseE(src, vars);
  const seen: E[] = [e];
  const traps: Trap[] = [];
  for (const [id, s] of slips) {
    const t = parseE(s, vars);
    if (seen.some((u) => sameFn(u, t, vars, plusC))) continue;
    seen.push(t);
    traps.push({ id, a: { k: "expr", e: t, ...(vars.length ? { vars } : {}), ...(plusC ? { mode: "plusC" as const } : {}) } });
  }
  return {
    answer: { k: "expr", e, ...(vars.length ? { vars } : {}), ...(plusC ? { mode: "plusC" as const } : {}), ...(traps.length ? { traps } : {}) },
    show: tex(simp(e)) + (plusC ? " + C" : ""),
    plain: src + (plusC ? " + C" : ""),
    format,
  };
}
