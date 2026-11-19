// Practice: Comparing fractions.
import { r2 } from "../chart";
import { type FractionBarsSpec, fractionBarsSvg } from "../compare";
import { type CompareSign, compareSign, type Frac as Fraction, fracSign, samePieces } from "../live";
import { FLIP_SIGN, fracTex, signExercise } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const swap = r.next() < 0.5;
  const tex = (f: Fraction) => fracTex(f.n, f.d);
  const plain = (f: Fraction) => `${f.n}/${f.d}`;
  /** The pair in a random order, with the bars as the worked solution (and under the question when easy). */
  const ask = (x: Fraction, y: Fraction, steps: (a: Fraction, b: Fraction, sign: CompareSign) => string[], extra: { cut?: number; half?: boolean } = {}) => {
    const [a, b] = swap ? [y, x] : [x, y];
    const sign = fracSign(a, b);
    const spec: FractionBarsSpec = { a, b, ...extra, steps: steps(a, b, sign) };
    const [big, small] = sign === "<" ? [b, a] : [a, b];
    const same = samePieces(a, b);
    // The known mistakes, each with the sign it gives: a bigger bottom read as bigger, two fractions the same
    // number of pieces short of a whole read as equal, and the tops compared without the bottoms.
    const naive: Trap[] = [];
    if (a.n === b.n && a.d !== b.d) naive.push({ id: "biggerBottom", a: { k: "sign", v: compareSign(a.d, b.d) }, vars: { n: a.n, d: Math.max(a.d, b.d), e: Math.min(a.d, b.d) } });
    if (a.d - a.n === b.d - b.n && a.d !== b.d) naive.push({ id: "sameGap", a: { k: "sign", v: "=" }, vars: { big: plain(big), small: plain(small), g: big.d - big.n, d: big.d, e: small.d } });
    if (a.d !== b.d && a.n !== b.n) naive.push({ id: "biggerTop", a: { k: "sign", v: compareSign(a.n, b.n) }, vars: { a: plain(a), b: plain(b), x: same.a, y: same.b, d: same.d } });
    const pic = L === 1 ? fractionBarsSvg(spec, false) : null;
    return signExercise(w, tex(a), tex(b), sign, {
      ...(pic ? { pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w } } : {}),
      solution: { kind: "fractionBars", spec },
    }, naive);
  };
  const final = (a: Fraction, b: Fraction, sign: CompareSign) => `${tex(a)} ${sign} ${tex(b)}`;
  /** Over the lowest common bottom: 2/3 and 3/4 as 8/12 and 9/12. */
  const common = (a: Fraction, b: Fraction, sign: CompareSign) => {
    const s = samePieces(a, b);
    const [x, y] = [{ n: s.a, d: s.d }, { n: s.b, d: s.d }];
    return [
      [a, x], [b, y],
    ].filter(([f, g]) => f.d !== g.d).map(([f, g]) => `${tex(f)} = ${tex(g)}`).concat(`${tex(x)} ${sign} ${tex(y)} \\;\\Rightarrow\\; ${final(a, b, sign)}`);
  };
  // The bars cut into the same pieces while the pieces are big enough to see in the picture.
  const cutFor = (a: Fraction, b: Fraction) => {
    const d = samePieces(a, b).d;
    return d <= 24 ? { cut: d } : {};
  };
  const distinct = (lo: number, hi: number, not: number) => {
    let v: number;
    do v = r.int(lo, hi);
    while (v === not);
    return v;
  };
  if (L === 1) {
    if (r.next() < 0.7) {
      // The same bottom: the one with more pieces is bigger.
      const d = r.int(3, 10);
      const n = r.int(1, d - 1);
      const x = { n, d };
      const y = { n: distinct(1, d - 1, n), d };
      return ask(x, y, (a, b, sign) => [`${a.n} ${sign} ${b.n} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
    }
    // One piece each: the more pieces the whole is cut into, the smaller each one.
    const d = r.int(2, 8);
    return ask({ n: 1, d }, { n: 1, d: distinct(2, 8, d) }, (a, b, sign) => [`${a.d} ${FLIP_SIGN[sign]} ${b.d} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
  }
  if (L === 2) {
    const kind = r.next();
    if (kind < 0.35) {
      // The same top: the smaller pieces make the smaller fraction.
      const n = r.int(2, 5);
      const d = r.int(n + 1, 12);
      return ask({ n, d }, { n, d: distinct(n + 1, 12, d) }, (a, b, sign) => [`${a.d} ${FLIP_SIGN[sign]} ${b.d} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
    }
    if (kind < 0.7) {
      // One below a half and one above.
      const d = r.int(3, 12);
      const e = r.int(3, 12);
      const lo = { n: r.int(1, Math.ceil(d / 2) - 1), d };
      const hi = { n: r.int(Math.floor(e / 2) + 1, e - 1), d: e };
      const halfStep = (f: Fraction) => `2 \\times ${f.n} ${compareSign(2 * f.n, f.d)} ${f.d} \\;\\Rightarrow\\; ${tex(f)} ${compareSign(2 * f.n, f.d)} \\frac{1}{2}`;
      return ask(lo, hi, (a, b, sign) => [halfStep(a), halfStep(b), `${tex(a)} ${sign} \\frac{1}{2} ${sign} ${tex(b)}`], { half: true });
    }
    // Both short of a whole by the same number of pieces: the smaller pieces leave less missing.
    const g = r.int(1, 2);
    const d = r.int(g + 2, 10);
    const e = distinct(g + 2, 10, d);
    return ask({ n: d - g, d }, { n: e - g, d: e }, (a, b, sign) => [
      `1 - ${tex(a)} = ${fracTex(a.d - a.n, a.d)}, \\quad 1 - ${tex(b)} = ${fracTex(b.d - b.n, b.d)}`,
      `${fracTex(a.d - a.n, a.d)} ${FLIP_SIGN[sign]} ${fracTex(b.d - b.n, b.d)} \\;\\Rightarrow\\; ${final(a, b, sign)}`,
    ]);
  }
  if (r.next() < 0.2) {
    // The same amount cut two ways.
    const d = r.int(2, 4);
    const n = r.int(1, d - 1);
    const k = r.int(1, Math.floor(12 / d));
    const m = distinct(1, Math.floor(12 / d), k);
    const x = { n: n * k, d: d * k };
    const y = { n: n * m, d: d * m };
    return ask(x, y, common, cutFor(x, y));
  }
  // Different bottoms: over the lowest common bottom.
  let x: Fraction;
  let y: Fraction;
  do {
    const d = r.int(3, 12);
    const e = distinct(3, 12, d);
    x = { n: r.int(1, d - 1), d };
    y = { n: r.int(1, e - 1), d: e };
  } while (x.n * y.d === y.n * x.d);
  return ask(x, y, common, cutFor(x, y));
};

export default gen;
