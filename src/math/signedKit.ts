// What the signed-number questions of #706 share (integers, compare, absoluteValue, order): rational numbers kept as
// a top and a bottom in lowest terms, written as a fraction, a decimal or a whole number, in TeX, as text with a real
// minus and as typed; and a pick among options written in TeX, each slip that is a usual one named.
import type { MistakeId } from "./mistakes";
import { shuffled } from "./mulDivKit";
import { gcd } from "./practiceKit";
import type { Exercise, Part, Rng, Trap } from "./practiceTypes";

/** A rational number in lowest terms, the bottom positive. */
export type Q = { n: number; d: number };
export function q(n: number, d = 1): Q {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(Math.abs(n), d) || 1;
  return { n: n / g, d: d / g };
}
export const qv = (x: Q) => x.n / x.d;
export const qAdd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const qSub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const qDiv = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const qNeg = (a: Q) => q(-a.n, a.d);
export const qAbs = (a: Q) => q(Math.abs(a.n), a.d);
export const qPow = (a: Q, k: number) => q(a.n ** k, a.d ** k);

/** A rational written as a decimal: only for bottoms that give one (2, 4, 5, 8, 10, …). */
const decimal = (x: Q) => String(Number((x.n / x.d).toFixed(6)));
/** In TeX: a whole number, a decimal (dec) or a fraction with the minus in front. */
export const qTex = (x: Q, dec = false) => (x.d === 1 || dec ? decimal(x) : x.n < 0 ? `-\\frac{${-x.n}}{${x.d}}` : `\\frac{${x.n}}{${x.d}}`);
/** As typed: "-3/4", "-0.75", "5". */
export const qPlain = (x: Q, dec = false) => (x.d === 1 || dec ? decimal(x) : `${x.n}/${x.d}`);
/** As read: with a real minus. */
export const qText = (x: Q, dec = false) => qPlain(x, dec).replace("-", "−");
/** In TeX, in brackets when negative: what follows a sign or a × must not start with a minus. */
export const qPar = (x: Q, dec = false) => (x.n < 0 ? `\\left(${qTex(x, dec)}\\right)` : qTex(x, dec));
/** As typed, in brackets when negative: the working conceptGraph.ts reads (src). */
export const qSrc = (x: Q, dec = false) => (x.n < 0 ? `(${qPlain(x, dec)})` : qPlain(x, dec));
/** A whole number with a real minus. */
export const mi = (v: number) => String(v).replace("-", "−");
/** A whole number in brackets when negative, with a real minus (for text) or in TeX. */
export const parText = (v: number) => (v < 0 ? `(${mi(v)})` : String(v));
export const parTex = (v: number) => (v < 0 ? `(${v})` : String(v));

export type Opt = { text: string; plain: string; tex: string };
/** An option written in TeX; its text is the TeX read with ×, ÷, a real minus and fractions as a/b. */
export function opt(tex: string): Opt {
  const text = tex
    .replace(/\\left\(|\\right\)/g, (m) => (m === "\\left(" ? "(" : ")"))
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${/^[-\w]+$/.test(a) ? a : `(${a})`}/${/^[\w]+$/.test(b) ? b : `(${b})`}`)
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\[,;]/g, " ")
    .replace(/-/g, "−");
  return { text, plain: text, tex };
}
/** An option that is a word or a phrase. */
export const word = (s: string): Opt => ({ text: s, plain: s, tex: `\\text{${s}}` });

/** A pick: the right option, the slips (each named, {x} the option's text unless the vars give it) and options only wrong. */
export function pickOf(
  r: Rng,
  prompt: string,
  right: Opt,
  slips: { o: Opt; id: MistakeId; vars: Record<string, string | number> }[],
  others: Opt[],
  more: Pick<Part, "steps" | "src" | "solution"> & { pic?: Exercise["pic"]; q?: string },
): Part {
  const options = shuffled(r, [right, ...slips.map((s) => s.o), ...others]);
  const at = (o: Opt) => options.indexOf(o);
  const traps: Trap[] = slips.map((s) => ({ id: s.id, a: { k: "pick", options, right: at(s.o) }, vars: { x: s.o.text, ...s.vars } }));
  const { q: qq = "", ...rest } = more;
  return { prompt, q: qq, answer: { k: "pick", options, right: at(right), traps }, show: right.tex, plain: right.plain, format: "pick", ...rest };
}
