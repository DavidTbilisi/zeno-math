// Practice: Fractions, decimals and percentages, each written as another and typed (the Equal fractions skill picks
// one of four). Halves, quarters, fifths, tenths and hundredths as decimals and back; then percentages as decimals
// and fractions and back; then eighths, twentieths, mixed numbers and percentages over 100 or under 1. The fraction's
// digits read as a decimal, the wrong power of ten on the bottom and the digits moved one place are the slips.
import { fracTex, gcd, mixedTex, num, tidy } from "../practiceKit";
import type { Gen, Rng, Trap } from "../practiceTypes";

/** A top for the bottom d with no factor in common: the fraction is in lowest terms. */
function topFor(r: Rng, d: number): number {
  for (;;) {
    const n = r.int(1, d - 1);
    if (gcd(n, d) === 1) return n;
  }
}

const gen: Gen = (r, L, w) => {
  const W = w.basics;
  /** Typed as a decimal: the fraction typed back is sent back. */
  const decimal = (q: string, v: number, steps: string[], traps: Trap[] = []): ReturnType<Gen> => ({
    prompt: W.toDecimal, q, answer: { ...num(v, 1e-9, { form: "decimal" }), traps }, show: tidy(v), plain: tidy(v), format: "number", steps,
  });
  /** Typed as a percentage, with or without its sign. */
  const percent = (q: string, p: number, steps: string[], traps: Trap[] = []): ReturnType<Gen> => ({
    prompt: W.toPercent, q, answer: { ...num(p), traps }, show: `${tidy(p)}\\%`, plain: `${tidy(p)}%`, format: "number", steps,
  });
  /** m/den typed as a fraction in lowest terms: a decimal or a percentage typed back is sent back, not marked right. */
  const fraction = (q: string, m: number, den: number, lead: string, traps: Trap[] = []): ReturnType<Gen> => {
    const g = gcd(m, den);
    const [n, d] = [m / g, den / g];
    return {
      prompt: W.toFraction, q, answer: { ...num(n / d, 1e-9, { lowest: true, form: "fraction" }), traps }, show: fracTex(n, d), plain: `${n}/${d}`, format: "fraction",
      steps: [`${lead} = ${fracTex(m, den)}${g > 1 ? ` = ${fracTex(n, d)}` : ""}`],
    };
  };
  /** n/d as a decimal, over 10, 100 or 1000 first; a one-digit fraction's own digits after a point are the slip (1/4 → 0.14). */
  const fracToDecimal = (n: number, d: number) => {
    const v = n / d;
    const den = [10, 100, 1000].find((x) => x % d === 0)!;
    const digits = Number(`0.${n}${d}`);
    const traps: Trap[] = d < 10 && Math.abs(digits - v) > 1e-9 ? [{ id: "fractionDigits", a: num(digits), vars: { f: `${n}/${d}`, v: tidy(v), n, d } }] : [];
    return decimal(fracTex(n, d), v, [den === d ? `${fracTex(n, d)} = ${tidy(v)}` : `${fracTex(n, d)} = ${fracTex((n * den) / d, den)} = ${tidy(v)}`], traps);
  };
  /** A decimal of p places as a fraction: m over 10ᵖ, cut down. One zero too many or too few on the bottom is the slip. */
  const decimalToFrac = (m: number, p: number) => {
    const den = 10 ** p;
    const dec = (m / den).toFixed(p);
    const g = gcd(m, den);
    const wrong = p === 1 ? den * 10 : den / 10;
    const work = g > 1 ? `${m}/${den} = ${m / g}/${den / g}` : `${m}/${den}`;
    return fraction(dec, m, den, dec, [{ id: "wrongPlaceBottom", a: num(m / wrong), vars: { x: `${m}/${wrong}`, d: dec, work } }]);
  };
  /** A percentage and the decimal it is, either way: the digits move two places, and one place is the slip. */
  const percentToDecimal = (p: number) => {
    const v = p / 100;
    return decimal(`${tidy(p)}\\%`, v, [`${tidy(p)}\\% = ${tidy(p)} \\div 100 = ${tidy(v)}`], [{ id: "percentPointOnce", a: num(p / 10), vars: { x: tidy(p / 10), from: `${tidy(p)}%`, v: tidy(v) } }]);
  };
  const decimalToPercent = (p: number) => {
    const v = tidy(p / 100);
    return percent(v, p, [`${v} \\times 100\\% = ${tidy(p)}\\%`], [{ id: "percentPointOnce", a: num(p / 10), vars: { x: `${tidy(p / 10)}%`, from: v, v: `${tidy(p)}%` } }]);
  };
  const fracToPercent = (n: number, d: number) => {
    const p = (100 * n) / d;
    return percent(fracTex(n, d), p, [Number.isInteger(100 / d) ? `${fracTex(n, d)} = ${fracTex((n * 100) / d, 100)} = ${tidy(p)}\\%` : `${fracTex(n, d)} = ${n} \\div ${d} = ${tidy(n / d)} = ${tidy(p)}\\%`]);
  };
  if (L === 1) {
    const d = r.pick([2, 4, 5, 10, 100]);
    if (r.next() < 0.5) return fracToDecimal(topFor(r, d), d);
    // Tenths or hundredths, never ending in 0.
    const p = r.int(1, 2);
    let m = r.int(1, 10 ** p - 1);
    while (m % 10 === 0) m = r.int(1, 10 ** p - 1);
    return decimalToFrac(m, p);
  }
  if (L === 2) {
    const kind = r.int(0, 3);
    const p = r.next() < 0.3 ? r.int(1, 9) : 5 * r.int(2, 19);
    if (kind === 0) return percentToDecimal(p);
    if (kind === 1) return decimalToPercent(p);
    if (kind === 2) {
      const q = 5 * r.int(1, 19);
      return fraction(`${q}\\%`, q, 100, `${q}\\%`);
    }
    const d = r.pick([2, 4, 5, 10, 20, 25, 50]);
    return fracToPercent(topFor(r, d), d);
  }
  const kind = r.int(0, 4);
  if (kind === 0) {
    const d = r.pick([8, 8, 20, 25, 40]);
    const n = topFor(r, d);
    return r.next() < 0.5 ? fracToDecimal(n, d) : fracToPercent(n, d);
  }
  if (kind === 1) {
    // A mixed number: the whole stays, the fraction turns into the decimal part.
    const [whole, d] = [r.int(1, 4), r.pick([2, 4, 5, 8, 10])];
    const n = topFor(r, d);
    const v = whole + n / d;
    const q = mixedTex(whole, n, d);
    if (r.next() < 0.5) return decimal(q, v, [`${q} = ${whole} + ${tidy(n / d)} = ${tidy(v)}`]);
    return percent(q, 100 * v, [`${q} = ${tidy(v)} = ${tidy(100 * v)}\\%`]);
  }
  // Over 100 %, or under 1 %.
  const p = r.pick([125, 150, 175, 240, 320, 0.5, 0.8, 2.5, 7.5, 12.5, 37.5]);
  if (kind === 2) return percentToDecimal(p);
  if (kind === 3) return decimalToPercent(p);
  // Thousandths: 0.375 = 375/1000 = 3/8.
  const d = r.pick([8, 8, 40, 200]);
  return decimalToFrac((topFor(r, d) * 1000) / d, 3);
};

export default gen;
