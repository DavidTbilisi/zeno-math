// Complex numbers as H2 Mathematics 9758 and a degree's first year take them (OpenStax, Precalculus; Needham, Visual
// Complex Analysis, ch. 1–2; Stroud, Engineering Mathematics): arithmetic and the conjugate, the modulus–argument form
// and e^{iθ}, De Moivre, n-th roots and loci in the Argand diagram. The words, exact values written as a + bi or
// re^{iθ}, the reader of a typed complex number (the Complex tool's parseCx), and the answers; the questions are in
// src/math/skills/{complex,polarForm,deMoivre}.ts.
import { type CxWords, nice, parseCx } from "./complex";
import type { MistakeId } from "./mistakes";
import type { Answer, CxVal, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `cxq` block). */
export type ComplexWords = {
  prompt: {
    product: string;
    quotient: string;
    modulus: string;
    quadratic: string;
    toCartesian: string;
    polarProduct: string;
    polarQuotient: string;
    toPolar: string;
    power: string;
    roots: string;
    locus: string;
  };
  /** The options of a locus question: {c} a centre or a start, {r} a radius, {t} an angle. */
  locus: { circle: string; halfLine: string; line: string };
};

const EPS = 1e-9;
export const cx = (re: number, im = 0): CxVal => ({ re, im });
export const cadd = (a: CxVal, b: CxVal) => cx(a.re + b.re, a.im + b.im);
export const cmul = (a: CxVal, b: CxVal) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const conj = (a: CxVal) => cx(a.re, -a.im);
export const neg = (a: CxVal) => cx(-a.re, -a.im);
export const cabs = (a: CxVal) => Math.hypot(a.re, a.im);
export const fromPolar = (r: number, t: number) => cx(r * Math.cos(t), r * Math.sin(t));
export const sameCx = (a: CxVal, b: CxVal, tol = 1e-9) => Math.abs(a.re - b.re) <= tol && Math.abs(a.im - b.im) <= tol;
/** The same numbers, each as often, in any order. */
export function sameList(a: CxVal[], b: CxVal[], tol = 1e-9): boolean {
  if (a.length !== b.length) return false;
  const left = [...b];
  for (const z of a) {
    const i = left.findIndex((y) => sameCx(z, y, tol));
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

// ---------- angles kπ/d ----------

/** An angle kπ/d in its lowest terms, in (−π, π]. */
export type Angle = { k: number; d: number };
export function angle(k: number, d: number): Angle {
  let n = (((k % (2 * d)) + 2 * d) % (2 * d));
  if (n > d) n -= 2 * d;
  const g = gcd(n, d) || d;
  return { k: n / g, d: d / g };
}
export const rad = (a: Angle) => (a.k * Math.PI) / a.d;
export const addAngles = (a: Angle, b: Angle, sign = 1) => angle(a.k * b.d + sign * b.k * a.d, a.d * b.d);
/** kπ/d as LaTeX: \frac{2\pi}{3}, -\frac{\pi}{4}, \pi, 0. */
export function angleTex(a: Angle): string {
  if (a.k === 0) return "0";
  const top = Math.abs(a.k) === 1 ? "\\pi" : `${Math.abs(a.k)}\\pi`;
  return `${a.k < 0 ? "-" : ""}${a.d === 1 ? top : `\\frac{${top}}{${a.d}}`}`;
}
/** kπ/d as typed: 2pi/3, -pi/4, pi. */
export function anglePlain(a: Angle): string {
  if (a.k === 0) return "0";
  const top = Math.abs(a.k) === 1 ? "pi" : `${Math.abs(a.k)}pi`;
  return `${a.k < 0 ? "-" : ""}${top}${a.d === 1 ? "" : `/${a.d}`}`;
}
/** kπ/d for words: 2π/3, −π/4. */
export const angleText = (a: Angle) => anglePlain(a).replace(/pi/g, "π").replace(/^-/, "−");

// ---------- written out ----------

const ascii = (s: string) => s.replace(/−/g, "-");
/** a + bi as LaTeX, exact where it is simple: 1 + \sqrt{3}i, -\frac{1}{2} - \frac{\sqrt{3}}{2}i, 4i. */
export function cxTex(z: CxVal): string {
  const re = Math.abs(z.re) < EPS ? "" : nice(z.re).tex;
  if (Math.abs(z.im) < EPS) return re || "0";
  const m = nice(Math.abs(z.im)).tex;
  const im = `${m === "1" ? "" : m}i`;
  return re ? `${re} ${z.im < 0 ? "-" : "+"} ${im}` : `${z.im < 0 ? "-" : ""}${im}`;
}
/** a + bi as typed: 1 + √3i, -1/2 - (√3/2)i, 4i. */
export function cxPlain(z: CxVal): string {
  const re = Math.abs(z.re) < EPS ? "" : ascii(nice(z.re).text);
  if (Math.abs(z.im) < EPS) return re || "0";
  const m = ascii(nice(Math.abs(z.im)).text);
  const im = `${m === "1" ? "" : m.includes("/") ? `(${m})` : m}i`;
  return re ? `${re} ${z.im < 0 ? "-" : "+"} ${im}` : `${z.im < 0 ? "-" : ""}${im}`;
}
/** z − c as LaTeX, for a locus: z - 2 + 3i for c = 2 − 3i. */
export const zMinusTex = (c: CxVal) => `z ${cxTex(neg(c)).replace(/^(?!-)/, "+ ").replace(/^-/, "- ")}`;

/** A number in the form re^{iθ}, r > 0. */
export type Polar = { r: number; t: Angle };
export const polarValue = (p: Polar) => fromPolar(p.r, rad(p.t));
/** re^{iθ} as LaTeX: 2e^{i\frac{\pi}{3}}, \sqrt{2}e^{-i\frac{3\pi}{4}}. */
export const polarTex = (p: Polar) =>
  `${p.r === 1 ? "" : nice(p.r).tex}${p.t.k === 0 ? "" : `e^{${p.t.k < 0 ? "-" : ""}i${angleTex({ k: Math.abs(p.t.k), d: p.t.d })}}`}` || "1";
/** re^{iθ} as typed: 2e^(2pi i/3), √2e^(-pi i/4). */
export function polarPlain(p: Polar): string {
  const r = p.r === 1 ? "" : ascii(nice(p.r).text);
  if (p.t.k === 0) return r || "1";
  const t = anglePlain(p.t).replace("pi", "pi i");
  return `${r}e^(${t})`;
}

// ---------- reading ----------

const QUIET = { badNumber: "" } as CxWords;
/** A typed complex number (3 - 4i, 2e^(i pi/3), √2∠45°), or null. "√3/2 i" is (√3/2)i, as it is read aloud. */
export function readCx(s: string): CxVal | null {
  const t = s
    .trim()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\/\s*(\d+(?:\.\d+)?)\s*i(?![a-z])/g, "/$1*i");
  if (!t || /[a-hj-z]/i.test(t.replace(/sqrt|pi|cis|cos|sin|e/g, ""))) return null;
  try {
    const z = parseCx(t, QUIET);
    return Number.isFinite(z.re) && Number.isFinite(z.im) ? z : null;
  } catch {
    return null;
  }
}
/** Typed as re^{iθ} (or r∠θ, r cis θ, r(cos θ + i sin θ)), not as a + bi. */
export const looksPolar = (s: string) => /e\s*\^|∠|cis|cos/i.test(s);

// ---------- answers ----------

type Shown = { answer: Answer; show: string; plain: string; format: Format };
/** Named slips, each a list of numbers; dropped when they give the answer or an earlier slip. */
function trapsOf(zs: CxVal[], slips: [MistakeId, CxVal[]][], polar: boolean): Trap[] {
  const out: Trap[] = [];
  for (const [id, s] of slips) {
    if (s.some((z) => !Number.isFinite(z.re) || !Number.isFinite(z.im)) || sameList(s, zs)) continue;
    if (out.some((o) => o.a.k === "complex" && sameList(o.a.vs, s))) continue;
    out.push({ id, a: { k: "complex", vs: s, tol: 1e-6, ...(polar ? { polar } : {}) } });
  }
  return out;
}
/** One or several numbers in any form, shown as a + bi. */
export function cartesian(zs: CxVal[], slips: [MistakeId, CxVal[]][] = []): Shown {
  const traps = trapsOf(zs, slips, false);
  return {
    answer: { k: "complex", vs: zs, tol: 1e-6, ...(traps.length ? { traps } : {}) },
    show: zs.map(cxTex).join(", \\; "),
    plain: zs.map(cxPlain).join("; "),
    format: zs.length > 1 ? "complexList" : "complex",
  };
}
/** Several numbers in any form, shown as re^{iθ} (the roots of an equation). */
export function polarList(ps: Polar[], slips: [MistakeId, Polar[]][] = []): Shown {
  const zs = ps.map(polarValue);
  const traps = trapsOf(zs, slips.map(([id, s]) => [id, s.map(polarValue)]), false);
  return {
    answer: { k: "complex", vs: zs, tol: 1e-6, ...(traps.length ? { traps } : {}) },
    show: ps.map(polarTex).join(", \\; "),
    plain: ps.map(polarPlain).join("; "),
    format: "complexList",
  };
}
/** One number asked for in the form re^{iθ}; any argument of it is right. */
export function polarOf(p: Polar, slips: [MistakeId, CxVal][] = []): Shown {
  const z = polarValue(p);
  const traps = trapsOf([z], slips.map(([id, s]) => [id, [s]]), true);
  return {
    answer: { k: "complex", vs: [z], tol: 1e-6, polar: true, ...(traps.length ? { traps } : {}) },
    show: polarTex(p),
    plain: polarPlain(p),
    format: "complexPolar",
  };
}

/** The keys under a complex answer: i, π, √ and e^(i…). */
export const CX_KEYS = [
  { label: "i", value: "i" },
  { label: "π", value: "π" },
  { label: "√", value: "√" },
  { label: "e^(i…)", value: "e^(i" },
];
