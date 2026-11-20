// Cryptography as a degree's elective teaches it (Hoffstein, Pipher & Silverman, An Introduction to Mathematical
// Cryptography; Washington, Elliptic Curves: Number Theory and Cryptography), past the RSA of
// src/math/skills/rsa.ts: orders, primitive roots and discrete logarithms mod a prime, Diffie–Hellman, ElGamal
// encryption and signatures, and elliptic curves over ℤₚ with their group law. The words, and the whole-number maths
// the answers are made of; the questions are in src/math/skills/{discreteLog,elGamal,ellipticCurves}.ts.
import { mod } from "./groups";
import type { MistakeId } from "./mistakes";
import { powMod } from "./numberTheoryTwo";
import type { Answer, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `cr` block). */
export type CryptoWords = {
  prompt: {
    order: string;
    dlog: string;
    dhKey: string;
    elgPublic: string;
    elgEncrypt: string;
    elgDecrypt: string;
    elgSign: string;
    ecCount: string;
    ecAdd: string;
    ecDouble: string;
    ecdh: string;
  };
};

/** The order of g mod the prime p: the least k ≥ 1 with gᵏ ≡ 1. */
export function orderMod(g: number, p: number): number {
  let [x, k] = [mod(g, p), 1];
  while (x !== 1) [x, k] = [(x * g) % p, k + 1];
  return k;
}

/** The primitive roots mod the prime p, smallest first. */
export const primitiveRoots = (p: number) => Array.from({ length: p - 2 }, (_, i) => i + 2).filter((g) => orderMod(g, p) === p - 1);

/** The least x ≥ 0 with gˣ ≡ h (mod p), or null when there is none. */
export function dlog(g: number, h: number, p: number): number | null {
  let x = 1;
  for (let k = 0; k < p - 1; k++, x = (x * g) % p) if (x === mod(h, p)) return k;
  return null;
}

// ---------- elliptic curves ----------

/** y² = x³ + ax + b over ℤₚ. */
export type Curve = { a: number; b: number; p: number };
/** An affine point, or null for the point at infinity O. */
export type EcPt = [number, number] | null;

export const rhs = (E: Curve, x: number) => mod(x * x * x + E.a * x + E.b, E.p);
/** 4a³ + 27b² ≢ 0: the cubic has no repeated root, so the points form a group. */
export const smooth = (E: Curve) => mod(4 * E.a ** 3 + 27 * E.b ** 2, E.p) !== 0;
/** The y with y² ≡ v (mod p), smallest first. */
export const rootsOf = (v: number, p: number) => Array.from({ length: p }, (_, y) => y).filter((y) => (y * y) % p === mod(v, p));
/** Every affine point, by x then y. */
export const points = (E: Curve): [number, number][] =>
  Array.from({ length: E.p }, (_, x) => x).flatMap((x) => rootsOf(rhs(E, x), E.p).map((y): [number, number] => [x, y]));

/** The slope of the chord PQ (or the tangent at P = Q), as a number mod p; noA drops the a of the tangent. */
export function slope(E: Curve, P: [number, number], Q: [number, number], noA = false): number | null {
  const { p } = E;
  const [[x1, y1], [x2, y2]] = [P, Q];
  if (x1 !== x2) return mod((y2 - y1) * inv(x2 - x1, p), p);
  if (y1 !== y2 || y1 === 0) return null;
  return mod((3 * x1 * x1 + (noA ? 0 : E.a)) * inv(2 * y1, p), p);
}

/** P + Q on E; with lambda given, that slope instead of the true one (for the traps). */
export function ecAdd(E: Curve, P: EcPt, Q: EcPt, lambda?: number): EcPt {
  if (P === null) return Q;
  if (Q === null) return P;
  const l = lambda ?? slope(E, P, Q);
  if (l === null) return null;
  const x3 = mod(l * l - P[0] - Q[0], E.p);
  return [x3, mod(l * (P[0] - x3) - P[1], E.p)];
}

/** kP by repeated adding. */
export const ecMul = (E: Curve, k: number, P: EcPt): EcPt => Array.from({ length: k }, () => P).reduce<EcPt>((s, X) => ecAdd(E, s, X), null);

/** a⁻¹ mod the prime p. */
export const inv = (a: number, p: number) => powMod(mod(a, p), p - 2, p);

// ---------- answers ----------

type Shown = { answer: Answer; show: string; plain: string; format: Format };

/** A point answer (x, y) with named slips, kept only when they differ from it and from each other. */
export function pointOf(v: [number, number], slips: [MistakeId, EcPt][]): Shown {
  const same = (a: EcPt, b: EcPt) => a !== null && b !== null && a[0] === b[0] && a[1] === b[1];
  const kept: [MistakeId, [number, number]][] = [];
  for (const [id, s] of slips) if (s !== null && !same(s, v) && !kept.some(([, k]) => same(k, s))) kept.push([id, s]);
  const traps: Trap[] = kept.map(([id, s]) => ({ id, a: { k: "tuple", vs: s, tol: 1e-9 } }));
  return { answer: { k: "tuple", vs: v, tol: 1e-9, ...(traps.length ? { traps } : {}) }, show: `(${v[0]}, ${v[1]})`, plain: `(${v[0]}, ${v[1]})`, format: "point" };
}

/** y² = x³ + ax + b (mod p) as TeX. */
export const curveTex = (E: Curve) => {
  const a = E.a === 0 ? "" : E.a === 1 ? " + x" : ` + ${E.a}x`;
  const b = E.b === 0 ? "" : ` + ${E.b}`;
  return `E: \\ y^{2} \\equiv x^{3}${a}${b} \\pmod{${E.p}}`;
};
