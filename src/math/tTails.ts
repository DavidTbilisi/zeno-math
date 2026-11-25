// Inference past the z test (#654). When σ is unknown it is estimated by s, and the statistic (x̄ − μ)/(s/√n) follows
// t with n − 1 degrees of freedom: its tails are fatter than the normal's, more so the smaller the sample, so its 95 %
// cut t* lies beyond 1.96. An interval built with 1.96 on a small sample catches the true mean less often than 95 %.
// The piece `tTails` draws t against the normal curve as the learner drags the sample size; the helpers below are
// shared by the skills `tTests` and `twoSample`.
import { lnGamma, tSf, tUpper } from "./distributions";
import type { Part, Rng, Trap } from "./practiceTypes";

/** The mean of a list. */
export const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
/** The sample standard deviation (dividing by n − 1). */
export const sd = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
/** The two-sided 95 % cut of t with df degrees of freedom, to three places as in a table. */
export const tStar = (df: number) => Math.round(tUpper(0.025, df) * 1000) / 1000;
/** The t density. */
export const tPdf = (x: number, df: number) => Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - ((df + 1) / 2) * Math.log(1 + (x * x) / df)) / Math.sqrt(df * Math.PI);
/** The normal density. */
export const zPdf = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
/** How often x̄ ± 1.96·s/√n catches the mean when the statistic follows t with df degrees of freedom. */
export const zCover = (df: number) => 1 - 2 * tSf(1.96, df);

/** The piece: the sample size. */
export type LiveTTails = { n: number };
export const TTAILS_START: LiveTTails = { n: 4 };
export const TTAILS_MIN = 2;
export const TTAILS_MAX = 60;
/** From here on t and z nearly agree. */
export const TTAILS_NEAR = 30;

/**
 * A pick question with its options shuffled: `right` and each slip's `at` index `options` as given. Slips that point
 * at the right option are dropped.
 */
export function pickPart(r: Rng, options: string[], right: number, traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[], prompt: string, steps: string[]): Part {
  const order = options.map((_, i) => i).sort(() => r.next() - 0.5);
  const opts = order.map((i) => ({ text: options[i], plain: options[i], tex: `\\text{${options[i]}}` }));
  const at = (i: number) => order.indexOf(i);
  return {
    prompt, q: "",
    answer: { k: "pick", options: opts, right: at(right), traps: traps.filter((t) => t.at !== right).map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: at(t.at) }, vars: t.vars })) },
    show: opts[at(right)].tex, plain: options[right], format: "pick", steps,
  };
}
