// Practice: Fractions, decimals and percentages, each written as another and typed (the Equal fractions skill picks
// one of four). Halves, quarters, fifths, tenths and hundredths as decimals and back; then percentages as decimals
// and fractions and back; then eighths, twentieths, mixed numbers and percentages over 100 or under 1. The fraction's
// digits read as a decimal, the wrong power of ten on the bottom and the digits moved one place are the slips.
// #704: at P4 a decimal or fraction read off a hundredths grid (past 1 too) or a number line in tenths or hundredths
// (from 0 or from a whole or a tenth), and two numbers compared, as decimals (on grids, now and then) or a decimal
// against a fraction. Hundredths read as tenths, a whole grid left out, a hundredths step read as a tenth, the
// line's start left out, more digits taken for bigger and the same digits taken for the same value are named.
import { compareSign } from "../live";
import { hundredthsGrids } from "../decimalGrids";
import { fracLine } from "../fracLinePics";
import { fracTex, gcd, mixedTex, num, signExercise, tidy } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

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
    const kind = r.int(0, 5);
    if (kind >= 2) return pictured(kind);
    const d = r.pick([2, 4, 5, 10, 100]);
    if (kind === 0) return fracToDecimal(topFor(r, d), d);
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

  /** P4's pictured kinds (#704): 2 a grid, 3 a number line, 4 two numbers compared. */
  function pictured(kind: number): Part {
    const D = w.decPics;
    if (kind === 2) {
      // A hundredths grid, after one or two grids all shaded now and then: the decimal or the fraction it shows.
      const wholes = r.next() < 0.35 ? r.int(1, 2) : 0;
      let m = r.next() < 0.2 ? 10 * r.int(1, 9) : r.int(3, 97);
      while (m % 10 === 0 && m > 0 && r.next() < 0.6) m = r.int(3, 97);
      const v = wholes + m / 100;
      const pic = hundredthsGrids([...Array(wholes).fill({ a: 100 }), { a: m }]);
      const left: Trap[] = wholes ? [{ id: "wholeGridLeftOut", a: num(m / 100), vars: { x: tidy(m / 100), w: wholes, f: tidy(m / 100), v: tidy(v) } }] : [];
      if (r.next() < 0.5) {
        const tenths: Trap[] = m >= 10 && m % 10 ? [{ id: "gridAsTenths", a: num(wholes + m / 10), vars: { x: tidy(wholes + m / 10), m, v: tidy(m / 100) } }] : [];
        return { ...decimal("", v, [`${wholes ? `${wholes} + ` : ""}\\frac{${m}}{100} = ${tidy(v)}`], [...tenths, ...left]), prompt: D.gridDecimal, pic };
      }
      return { ...fraction("", 100 * wholes + m, 100, tidy(v), left), prompt: D.gridFraction, pic };
    }
    if (kind === 3) {
      // A point on a line in tenths or hundredths: 0 to 1, a whole to the next, 0 to 0.1, a tenth to the next.
      const t = r.int(0, 3);
      const k = r.int(1, 9);
      const [start, step] = t === 0 ? [0, 0.1] : t === 1 ? [r.int(1, 5), 0.1] : t === 2 ? [0, 0.01] : [r.int(1, 8) / 10, 0.01];
      const v = Number(tidy(start + k * step));
      const end = Number(tidy(start + 10 * step));
      const pic = fracLine({ wholes: 1, d: 10, labels: [[0, tidy(start)], [10, tidy(end)]], dot: k });
      const traps: Trap[] = [];
      if (t === 1) traps.push({ id: "lineStartLeftOut", a: num(k / 10), vars: { x: tidy(k / 10), s: start, k, v: tidy(v) } });
      if (t >= 2) traps.push({ id: "stepAsTenth", a: num(start + k / 10), vars: { x: tidy(start + k / 10), s: tidy(start), e: tidy(end), step: "0.01", v: tidy(v) } });
      if ((t === 0 || t === 2) && r.next() < 0.5) return { ...fraction("", k, t === 0 ? 10 : 100, tidy(v), traps), prompt: D.lineFraction, pic };
      return { ...decimal("", v, [`${tidy(start)} + ${k} \\times ${step} = ${tidy(v)}`], traps), prompt: D.lineDecimal, pic };
    }
    // Two numbers compared: decimals with different numbers of places (on grids now and then), or a decimal against a
    // fraction with the same digit in another place, or against a half, a quarter or a fifth.
    const swap = r.next() < 0.5;
    const t = r.int(0, 2);
    if (t === 0) {
      const tn = r.int(2, 9);
      let h = r.next() < 0.6 ? r.int(11, 10 * tn - 1) : r.int(10 * tn + 1, Math.min(99, 10 * tn + 9));
      if (h % 10 === 0) h += 1;
      const [x, y] = [tidy(tn / 10), tidy(h / 100)];
      const [a, b] = swap ? [y, x] : [x, y];
      const [va, vb] = swap ? [h, 10 * tn] : [10 * tn, h];
      const sign = compareSign(va, vb);
      const naive: Trap = { id: "longerDecimal", a: { k: "sign", v: compareSign(swap ? h : tn, swap ? tn : h) }, vars: { a: Number(a).toFixed(2), b: Number(b).toFixed(2) } };
      const pic = r.next() < 0.5 ? hundredthsGrids([{ a: va }, { a: vb }]) : undefined;
      return signExercise(w, a, b, sign, { steps: [`${Number(a).toFixed(2)} ${sign} ${Number(b).toFixed(2)}`], ...(pic ? { pic } : {}) }, [naive]);
    }
    if (t === 1) {
      const g = r.int(1, 9);
      const way = r.int(0, 4);
      // 0.g against g/100 (>), 0.0g against g/10 (<), or 0.g against g/10 (=).
      const [dec, n, den] = way <= 1 ? [g / 10, g, 100] : way <= 3 ? [g / 100, g, 10] : [g / 10, g, 10];
      const fv = n / den;
      const [d, f] = [tidy(dec), fracTex(n, den)];
      const [a, b] = swap ? [f, d] : [d, f];
      const sign = swap ? compareSign(fv, dec) : compareSign(dec, fv);
      const naive: Trap = { id: "sameDigitsSameValue", a: { k: "sign", v: "=" }, vars: { f: `${n}/${den}`, fv: tidy(fv), d } };
      return signExercise(w, a, b, sign, { steps: [`${f} = ${tidy(fv)}`, swap ? `${tidy(fv)} ${sign} ${d}` : `${d} ${sign} ${tidy(fv)}`] }, sign === "=" ? [] : [naive]);
    }
    const [n, den] = r.pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5]] as const);
    const fv = n / den;
    const dec = Number(tidy(fv + r.pick([-0.1, -0.05, 0.05, 0.1, 0]) ));
    const [a, b] = swap ? [fracTex(n, den), tidy(dec)] : [tidy(dec), fracTex(n, den)];
    const sign = swap ? compareSign(fv, dec) : compareSign(dec, fv);
    return signExercise(w, a, b, sign, { steps: [`${fracTex(n, den)} = ${tidy(fv)}`, swap ? `${tidy(fv)} ${sign} ${tidy(dec)}` : `${tidy(dec)} ${sign} ${tidy(fv)}`] });
  }
};

export default gen;
