// Distribution functions, computed (incomplete gamma and beta functions), not looked up in tables: the normal,
// Student's t and χ² tails and their inverses. No imports, so the server and the plain-Node scripts can use them too.

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];
/** ln Γ(x) (Lanczos, g = 7). */
export function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const TINY = 1e-300;

/** Regularised incomplete gamma: [P(a, x), Q(a, x)] (series below a + 1, continued fraction above). */
function gammaPQ(a: number, x: number): [number, number] {
  if (x <= 0) return [0, 1];
  const lead = a * Math.log(x) - x - lnGamma(a);
  if (x < a + 1) {
    let ap = a;
    let term = 1 / a;
    let sum = term;
    for (let i = 0; i < 10000; i++) {
      ap++;
      term *= x / ap;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    const p = Math.min(1, sum * Math.exp(lead));
    return [p, 1 - p];
  }
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  const q = Math.min(1, Math.exp(lead) * h);
  return [1 - q, q];
}

function betaCf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 10000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}
/** Regularised incomplete beta I_x(a, b). */
function betaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaCf(a, b, x)) / a : 1 - (bt * betaCf(b, a, 1 - x)) / b;
}

/** P(Z ≥ z), accurate far into the tail. */
export const normSf = (z: number) => (z >= 0 ? 0.5 * gammaPQ(0.5, (z * z) / 2)[1] : 1 - 0.5 * gammaPQ(0.5, (z * z) / 2)[1]);
export const normCdf = (z: number) => normSf(-z);
/** P(T ≥ t) for Student's t with df degrees of freedom (any df > 0, not only whole numbers). */
export function tSf(t: number, df: number): number {
  if (df > 1e7) return normSf(t);
  const tail = 0.5 * betaI(df / 2, 0.5, df / (df + t * t));
  return t >= 0 ? tail : 1 - tail;
}
/** P(χ² ≥ x) with k degrees of freedom. */
export const chiSf = (x: number, k: number) => (x <= 0 ? 1 : gammaPQ(k / 2, x / 2)[1]);

/** x with sf(x) = p, by bisection on [lo, hi] (sf decreasing). */
export function invertSf(sf: (x: number) => number, p: number, lo: number, hi: number): number {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (sf(mid) > p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}
/** The z with P(Z ≥ z) = p. */
export const zUpper = (p: number) => invertSf(normSf, p, -40, 40);
/** The t with P(T ≥ t) = p. */
export const tUpper = (p: number, df: number) => invertSf((x) => tSf(x, df), p, -1e6, 1e6);
/** The x with P(χ² ≥ x) = p. */
export const chiUpper = (p: number, k: number) => invertSf((x) => chiSf(x, k), p, 0, k + 200 * Math.sqrt(2 * k) + 200);
