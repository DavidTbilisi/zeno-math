// Rings and fields as a degree's algebra course teaches them after groups (Pinter, A Book of Abstract Algebra; Judson,
// Abstract Algebra: Theory and Applications; Gallian, Contemporary Abstract Algebra; Stewart, Galois Theory): units,
// zero divisors, integral domains and fields, ideals and quotient rings; polynomial rings, the remainder theorem mod p,
// Eisenstein's criterion and irreducibility mod p; field extensions, their degrees and minimal polynomials; finite
// fields GF(pⁿ); and a first look at Galois groups. The words, and the polynomial arithmetic the answers are made of;
// the questions are in src/math/skills/{rings,polyRings,fieldExt,finiteFields,galois}.ts.
import { gcd, mod } from "./groups";

/** The words of these questions (the locale's `rf` block). */
export type RingsFieldsWords = {
  kind: { field: string; domain: string; neither: string };
  irreducible: string;
  reducible: string;
  prompt: {
    units: string;
    zeroDivisors: string;
    ringKind: string;
    idealSum: string;
    idealMeet: string;
    idealProduct: string;
    quotientSize: string;
    remainder: string;
    eisenstein: string;
    irreducibleModP: string;
    degree: string;
    minimal: string;
    inverse: string;
    inverseModP: string;
    powerModP: string;
    groupOrder: string;
    primitive: string;
    subfields: string;
    product: string;
    galoisOrder: string;
    galoisGroupOf: string;
    galoisGroup: string;
    discriminant: string;
    cubicGroup: string;
  };
};

/** The units of ℤₙ: the a with gcd(a, n) = 1. */
export const unitsOf = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 1).filter((a) => gcd(a, n) === 1);
/** The zero divisors of ℤₙ: the non-zero a with gcd(a, n) > 1 (each times n / gcd(a, n) is 0). */
export const zeroDivisorsOf = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 1).filter((a) => gcd(a, n) > 1);

// ---------- polynomials, by their coefficients from the constant up: [c₀, c₁, …] ----------

export type Poly = number[];

/** Drop the zero coefficients at the top (the zero polynomial is []). */
export const trim = (f: Poly): Poly => {
  const g = [...f];
  while (g.length && g[g.length - 1] === 0) g.pop();
  return g;
};
/** f(x) over ℤ. */
export const evalPoly = (f: Poly, x: number) => f.reduceRight((s, c) => s * x + c, 0);
/** f(x) mod p, in {0, …, p − 1}. */
export const evalMod = (f: Poly, x: number, p: number) => f.reduceRight((s, c) => mod(s * x + c, p), 0);
/** The coefficients mod p. */
export const reduceMod = (f: Poly, p: number): Poly => trim(f.map((c) => mod(c, p)));
/** f · g over ℤ. */
export function mulPoly(f: Poly, g: Poly): Poly {
  if (!f.length || !g.length) return [];
  const out: Poly = Array(f.length + g.length - 1).fill(0);
  f.forEach((a, i) => g.forEach((b, j) => (out[i + j] += a * b)));
  return trim(out);
}
/** The remainder of f on division by the monic m, over ℤ (and so over ℤₚ after reducing). */
export function remPoly(f: Poly, m: Poly): Poly {
  const r = trim(f);
  const d = m.length - 1;
  for (let k = r.length - 1; k >= d; k--) {
    const c = r[k];
    if (c === 0) continue;
    for (let i = 0; i <= d; i++) r[k - d + i] -= c * m[i];
  }
  return trim(r.slice(0, d));
}
/** f · g in ℤₚ[x]/(m): multiply, reduce the coefficients mod p, take the remainder mod m, reduce again. */
export const mulIn = (f: Poly, g: Poly, m: Poly, p: number): Poly => reduceMod(remPoly(reduceMod(mulPoly(f, g), p), m), p);
/** The roots of f in ℤₚ. */
export const rootsMod = (f: Poly, p: number) => Array.from({ length: p }, (_, x) => x).filter((x) => evalMod(f, x, p) === 0);

const power = (k: number, x: string, tex: boolean) => (k === 0 ? "" : k === 1 ? x : tex ? `${x}^{${k}}` : `${x}^${k}`);
/** f written out from the top power down: LaTeX (x^{3} + 2x - 1) or as typed (x^3 + 2x - 1). */
function written(f: Poly, tex: boolean, x = "x"): string {
  const g = trim(f);
  if (!g.length) return "0";
  let s = "";
  for (let k = g.length - 1; k >= 0; k--) {
    const c = g[k];
    if (c === 0) continue;
    const a = Math.abs(c);
    const body = k === 0 ? String(a) : `${a === 1 ? "" : a}${power(k, x, tex)}`;
    s += s ? ` ${c < 0 ? "-" : "+"} ${body}` : `${c < 0 ? "-" : ""}${body}`;
  }
  return s;
}
export const polyTex = (f: Poly, x = "x") => written(f, true, x);
export const polyPlain = (f: Poly, x = "x") => written(f, false, x);

/** Whether n is a perfect square (n ≥ 0). */
export const isSquare = (n: number) => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n;
/** The discriminant of x³ + px + q: −4p³ − 27q². */
export const cubicDiscriminant = (p: number, q: number) => -4 * p ** 3 - 27 * q ** 2;
/** Euler's φ for any n ≥ 1, by its prime factors. */
export function totient(n: number): number {
  let [m, out] = [n, n];
  for (let d = 2; d * d <= m; d++)
    if (m % d === 0) {
      while (m % d === 0) m /= d;
      out -= out / d;
    }
  return m > 1 ? out - out / m : out;
}

/** a + b√d as LaTeX (b ≠ 0 shown, 1 and −1 left out). */
export function surdTex(a: number, b: number, d: number): string {
  const root = `${Math.abs(b) === 1 ? "" : Math.abs(b)}\\sqrt{${d}}`;
  if (a === 0) return `${b < 0 ? "-" : ""}${root}`;
  return `${a} ${b < 0 ? "-" : "+"} ${root}`;
}
/** The same, as typed: 3 - 2sqrt(2). */
export function surdPlain(a: number, b: number, d: number): string {
  const root = `${Math.abs(b) === 1 ? "" : Math.abs(b)}sqrt(${d})`;
  if (a === 0) return `${b < 0 ? "-" : ""}${root}`;
  return `${a} ${b < 0 ? "-" : "+"} ${root}`;
}
