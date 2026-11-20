// Fourier series and partial differential equations as a degree teaches them (Strauss, Partial Differential
// Equations: An Introduction; Haberman, Applied Partial Differential Equations; Lebl, Notes on Diffy Qs, chapters 4–5):
// Fourier coefficients, parity and convergence at a jump, the order, linearity and type of a PDE, and separation of
// variables for the heat, wave and Laplace equations. The words, and the small helpers the answers are made of; the
// questions are in src/math/skills/{fourier,pdeClassify,separation}.ts.
import type { NumSlip } from "./calculusTwo";
import { numTraps } from "./calculusTwo";
import { Frac } from "./fraction";
import { num } from "./practiceKit";
import type { Answer, Format } from "./practiceTypes";

/** The words of these questions (the locale's `pde` block). */
export type PdeWords = {
  parity: { cosOnly: string; sinOnly: string; both: string };
  kind: { linHom: string; linInhom: string; nonlinear: string };
  type: { elliptic: string; parabolic: string; hyperbolic: string };
  prompt: {
    coefficient: string;
    parity: string;
    sineCoefficient: string;
    jump: string;
    parseval: string;
    order: string;
    linearity: string;
    classify: string;
    classifyAt: string;
    characteristic: string;
    heatRate: string;
    waveFrequency: string;
    waveValue: string;
    steadyState: string;
    disc: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);

/** The type of a u_xx + b u_xy + c u_yy from its discriminant b² − 4ac: 0 elliptic, 1 parabolic, 2 hyperbolic. */
export const typeOf = (d: number): 0 | 1 | 2 => (d < 0 ? 0 : d === 0 ? 1 : 2);
export const discriminant = (a: number, b: number, c: number) => b * b - 4 * a * c;

/** A sum of TeX terms with the signs tidied: ["3", "-2x", "x^{2}"] → 3 - 2x + x^{2}; empty terms dropped. */
export function sumTex(terms: string[]): string {
  const t = terms.filter((s) => s !== "");
  if (t.length === 0) return "0";
  return t.map((s, i) => (i === 0 ? s : s.startsWith("-") ? `- ${s.slice(1)}` : `+ ${s}`)).join(" ");
}
/** A coefficient times a body: 1·body → body, −1·body → −body, 0 → nothing. */
export const coefTex = (c: number, body: string) => (c === 0 ? "" : c === 1 ? body : c === -1 ? `-${body}` : `${c}${body}`);

/** A rational multiple of πᵏ (k = −1, 1 or 2) as an exact answer, typed as 4/(3pi), 2pi/3 or 9pi^2/4. */
export function piPow(q: Frac, k: -1 | 1 | 2, slips: NumSlip[] = []): { answer: Answer; show: string; plain: string; format: Format } {
  const v = q.toNumber() * Math.PI ** k;
  const traps = numTraps(v, slips);
  const sign = q.n < 0 ? "-" : "";
  const n = Math.abs(q.n);
  const pk = k === 2 ? "\\pi^{2}" : "\\pi";
  const pkPlain = k === 2 ? "pi^2" : "pi";
  let show: string;
  let plain: string;
  if (k === -1) {
    show = `${sign}\\frac{${n}}{${q.d === 1 ? "" : q.d}\\pi}`;
    plain = `${sign}${n}/${q.d === 1 ? "pi" : `(${q.d}pi)`}`;
  } else {
    const top = n === 1 ? pk : `${n}${pk}`;
    const topPlain = n === 1 ? pkPlain : `${n}${pkPlain}`;
    show = q.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${q.d}}`;
    plain = q.d === 1 ? `${sign}${topPlain}` : `${sign}${topPlain}/${q.d}`;
  }
  return { answer: { ...num(v), ...(traps.length ? { traps } : {}) }, show, plain, format: "exact" };
}

/** sin(nπ/2) and the like: sine and cosine of a rational multiple of π whose value is 0, ±1/2 or ±1 (null otherwise). */
export function trig(f: "sin" | "cos", p: Frac): Frac | null {
  // Reduce p (in units of π) to [0, 2) and look up the multiples of 1/6 and 1/2.
  const twelfths = (((p.n * 12) / p.d) % 24 + 24) % 24;
  if (!Number.isInteger(twelfths)) return null;
  const SIN: Record<number, Frac> = { 0: F(0), 2: F(1, 2), 6: F(1), 10: F(1, 2), 12: F(0), 14: F(-1, 2), 18: F(-1), 22: F(-1, 2) };
  const at = f === "sin" ? twelfths : (twelfths + 6) % 24;
  return SIN[at] ?? null;
}

/** u(x, t) = Σ aₙ sin(nx) cos(nt) on 0 < x < π (the wave equation with c = 1 and zero initial velocity). */
export function waveAt(modes: [number, number][], x: Frac, t: Frac, sameFrequency = false): Frac {
  return modes.reduce((s, [n, a]) => s.add(F(a).mul(trig("sin", x.mul(F(n)))!).mul(trig("cos", sameFrequency ? t : t.mul(F(n)))!)), F(0));
}
