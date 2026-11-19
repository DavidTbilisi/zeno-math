// Practice: Comparing numbers.
import { r2 } from "../chart";
import { towersSvg } from "../compare";
import { type CompareSign, compareSign } from "../live";
import { FLIP_SIGN, fracTex, gcd, minusSign, signExercise } from "../practiceKit";
import type { Exercise, Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const out = (a: string, b: string, sign: CompareSign, more: Partial<Omit<Exercise, "skill" | "level" | "seed">>, naive?: Trap) => signExercise(w, a, b, sign, more, naive ? [naive] : []);
  const swap = r.next() < 0.5;
  /** The pair in a random order: [first, second] and whether they were swapped. */
  const order = <T>(x: T, y: T): [T, T] => (swap ? [y, x] : [x, y]);
  if (L === 1) {
    const a = r.int(0, 10);
    const b = r.next() < 0.2 ? a : r.int(0, 10);
    const t = towersSvg({ a, b }, false);
    return out(String(a), String(b), compareSign(a, b), {
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${t.body}</g>`, h: t.h, w: t.w },
      solution: { kind: "compare", spec: { a, b } },
    });
  }
  if (L === 2) {
    const kind = r.next() < 0.125 ? 3 : r.int(0, 2);
    if (kind === 3) {
      const a = r.int(10, 999);
      return out(String(a), String(a), "=", { steps: [`${a} = ${a}`] });
    }
    if (kind === 2) {
      // Fewer digits but a bigger first digit: 98 and 102.
      const n = r.int(1, 2);
      const short = r.int(6, 9) * 10 ** n + r.int(0, 10 ** n - 1);
      const long = r.int(1, 3) * 10 ** (n + 1) + r.int(0, 10 ** (n + 1) - 1);
      const [a, b] = order(short, long);
      const sign = compareSign(a, b);
      const steps = [`${short} < ${10 ** (n + 1)} \\le ${long}`, `${a} ${sign} ${b}`];
      return out(String(a), String(b), sign, { steps }, { id: "firstDigit", a: { k: "sign", v: FLIP_SIGN[sign] }, vars: { big: long, k: n + 2, small: short, j: n + 1 } });
    }
    // The same number of digits, differing in one place (or two digits swapped round).
    const n = r.int(2, 3);
    const digits = [r.int(1, 9), ...Array.from({ length: n - 1 }, () => r.int(0, 9))];
    const other = [...digits];
    if (kind === 1 && digits[1] !== 0 && digits[1] !== digits[0]) [other[0], other[1]] = [digits[1], digits[0]];
    else {
      const p = r.int(0, n - 1);
      do other[p] = r.int(p === 0 ? 1 : 0, 9);
      while (other[p] === digits[p]);
    }
    const [x, y] = [Number(digits.join("")), Number(other.join(""))];
    const [a, b] = order(x, y);
    const sign = compareSign(a, b);
    const parts = (v: number) => String(v).split("").map((d, i) => Number(d) * 10 ** (n - 1 - i));
    const at = parts(a).findIndex((v, i) => v !== parts(b)[i]);
    const steps = [`${a} = ${parts(a).join(" + ")}`, `${b} = ${parts(b).join(" + ")}`, `${parts(a)[at]} ${sign} ${parts(b)[at]} \\;\\Rightarrow\\; ${a} ${sign} ${b}`];
    return out(String(a), String(b), sign, { steps });
  }
  const kind = r.int(0, 2);
  if (kind === 0) {
    // Decimals: 0.5 and 0.45, where more digits after the point look bigger.
    const whole = r.int(0, 3);
    const t = r.int(2, 9);
    const pick = r.next();
    const h = pick < 0.5 ? r.int(Math.max(t + 1, 10), 10 * t - 1) : pick < 0.7 ? 10 * t : r.int(10 * t + 1, 10 * t + 9);
    const [x, y] = [`${whole}.${t}`, `${whole}.${String(h).padStart(2, "0")}`];
    const [a, b] = order(x, y);
    const [va, vb] = order(10 * t, h);
    const sign = compareSign(va, vb);
    const [na, nb] = order(t, h);
    const two = (v: string) => Number(v).toFixed(2);
    const steps = [...(a !== two(a) ? [`${a} = ${two(a)}`] : []), ...(b !== two(b) ? [`${b} = ${two(b)}`] : []), `${two(a)} ${sign} ${two(b)}`];
    return out(a, b, sign, { steps }, { id: "longerDecimal", a: { k: "sign", v: compareSign(na, nb) }, vars: { a: two(a), b: two(b) } });
  }
  if (kind === 1) {
    // Negative numbers: further from zero is smaller.
    let x: number;
    let y: number;
    if (r.next() < 0.7) {
      x = -r.int(1, 15);
      do y = -r.int(1, 15);
      while (y === x);
    } else {
      x = -r.int(3, 15);
      y = r.int(1, -x - 1);
    }
    const [a, b] = order(x, y);
    const sign = compareSign(a, b);
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    const steps = [hi < 0 ? `${lo} = ${hi} - ${hi - lo}` : `${lo} < 0 < ${hi}`, `${a} ${sign} ${b}`];
    return out(String(a), String(b), sign, { steps }, { id: "negativeSize", a: { k: "sign", v: compareSign(Math.abs(a), Math.abs(b)) }, vars: { small: minusSign(String(lo)), big: minusSign(String(hi)) } });
  }
  // Fractions: the same top, the same bottom, or neither (then over a common bottom).
  const pick = r.next();
  let [n1, d1, n2, d2] = [0, 0, 0, 0];
  if (pick < 0.4) {
    n1 = n2 = r.int(1, 4);
    d1 = r.int(n1 + 1, 12);
    do d2 = r.int(n1 + 1, 12);
    while (d2 === d1);
  } else if (pick < 0.6) {
    d1 = d2 = r.int(5, 12);
    n1 = r.int(1, d1 - 1);
    do n2 = r.int(1, d1 - 1);
    while (n2 === n1);
  } else {
    d1 = r.int(2, 9);
    do d2 = r.int(2, 9);
    while (d2 === d1);
    [n1, n2] = [r.int(1, d1 - 1), r.int(1, d2 - 1)];
  }
  const [[an, ad], [bn, bd]] = order([n1, d1], [n2, d2]);
  const sign = compareSign(an * bd, bn * ad);
  const lcd = (ad * bd) / gcd(ad, bd);
  const [ka, kb] = [lcd / ad, lcd / bd];
  const steps =
    ad === bd
      ? [`${an} ${sign} ${bn} \\;\\Rightarrow\\; ${fracTex(an, ad)} ${sign} ${fracTex(bn, bd)}`]
      : [`${fracTex(an, ad)} = ${fracTex(an * ka, lcd)}, \\quad ${fracTex(bn, bd)} = ${fracTex(bn * kb, lcd)}`, `${fracTex(an * ka, lcd)} ${sign} ${fracTex(bn * kb, lcd)}`];
  const naive: Trap | undefined =
    an === bn ? { id: "biggerBottom", a: { k: "sign", v: compareSign(ad, bd) }, vars: { n: an, d: Math.max(ad, bd), e: Math.min(ad, bd) } } : undefined;
  return out(fracTex(an, ad), fracTex(bn, bd), sign, { steps }, naive);
};

export default gen;
