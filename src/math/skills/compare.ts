// Practice: Comparing numbers. The hard level's new kinds (#706): negative fractions and decimals compared, as numbers
// or as points on a line; four rationals put in order (decimals, small negatives, a mix); a dot read off a line below
// zero; an inequality written from words; the smallest of three expressions.
import { fill, r2 } from "../chart";
import { towersSvg } from "../compare";
import type { OrderItem } from "../fracOrder";
import { type CompareSign, compareSign } from "../live";
import { FLIP_SIGN, fracTex, gcd, minusSign, num, signExercise } from "../practiceKit";
import type { Exercise, Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { mi, opt, pickOf, q, qAbs, qNeg, qPlain, qTex, qText, qv, type Q } from "../signedKit";
import { signedLine } from "../signedPics";

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
  const kind = r.int(0, 6);
  if (kind >= 3) return rationals(r, kind, w);
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

/** A bottom that gives a decimal. */
const ends = (x: Q) => 1000 % x.d === 0;
/** A negative rational down to −3: a fraction, shown as a decimal when it is one and dec. */
function negQ(r: Rng, bottoms = [2, 3, 4, 5, 8, 10]): Q {
  const d = r.pick(bottoms);
  let n: number;
  do n = r.int(1, 3 * d - 1);
  while (q(n, d).d === 1);
  return qNeg(q(n, d));
}
/** Its decimal, to three places, with ≈ when it is not exact. */
const approx = (x: Q) => (ends(x) ? `= ${qTex(x, true)}` : `\\approx ${Number(qv(x).toFixed(3))}`);

/** The hard level's new kinds (#706). */
function rationals(r: Rng, kind: number, w: PracticeWords): Part {
  const S = w.signed;
  if (kind === 3) {
    if (r.next() < 0.4) {
      // Two points on a line below zero, lettered: which is bigger?
      const d = r.pick([2, 4, 5]);
      let [i, j] = [r.int(1, 3 * d - 1), r.int(1, 3 * d - 1)];
      while (i === j) j = r.int(1, 3 * d - 1);
      const [a, b] = [q(-i, d), q(-j, d)];
      const sign = compareSign(qv(a), qv(b));
      return signExercise(w, "A", "B", sign, {
        pic: signedLine({ lo: -3, hi: 1, d, letters: [[qv(a), "A"], [qv(b), "B"]] }),
        steps: [`A = ${qTex(a, d !== 3)}, \\quad B = ${qTex(b, d !== 3)}`, `A ${sign} B`],
      });
    }
    // Two negative rationals, each a fraction or a decimal: further from zero is smaller.
    let a: Q, b: Q;
    do [a, b] = [negQ(r), negQ(r)];
    while (qv(a) === qv(b));
    const [da, db] = [ends(a) && r.next() < 0.5, ends(b) && r.next() < 0.5];
    const [ta, tb] = [qTex(a, da), qTex(b, db)];
    const sign = compareSign(qv(a), qv(b));
    const [lo, hi] = qv(a) < qv(b) ? [qText(a, da), qText(b, db)] : [qText(b, db), qText(a, da)];
    return signExercise(w, ta, tb, sign, { steps: [`${ta} ${approx(a)}, \\quad ${tb} ${approx(b)}`, `${ta} ${sign} ${tb}`] }, [
      { id: "negativeSize", a: { k: "sign", v: compareSign(qv(qAbs(a)), qv(qAbs(b))) }, vars: { small: lo, big: hi } },
    ]);
  }
  if (kind === 4) {
    // Four in order, smallest first: decimals with a different number of places, small negatives, or a mix.
    const t = r.int(0, 2);
    let xs: { x: Q; dec: boolean }[] = [];
    if (t === 0) {
      const tenth = r.int(2, 8);
      const set = new Set([tenth * 100, tenth * 100 - r.int(1, 9) * 10 + r.int(0, 9), tenth * 100 + r.int(1, 9) * 10, tenth * 100 - r.int(1, 99)]);
      while (set.size < 4) set.add(tenth * 100 + r.int(1, 99));
      xs = [...set].slice(0, 4).map((n) => ({ x: q(n, 1000), dec: true }));
    } else {
      const seen = new Set<number>();
      while (xs.length < 4) {
        // The last above zero: with all four below it, ordering by size would be the right order reversed.
        const x = xs.length === 3 ? q(r.int(1, 9), r.pick(t === 1 ? [10, 20] : [2, 4, 5, 10])) : t === 1 ? qNeg(q(r.int(1, 9), r.pick([3, 4, 5, 10, 20]))) : negQ(r);
        if (t === 1 && qv(x) <= -1) continue;
        if (seen.has(qv(x))) continue;
        seen.add(qv(x));
        xs.push({ x, dec: ends(x) && r.next() < 0.5 });
      }
    }
    const items: OrderItem[] = xs.map(({ x, dec }) => ({ n: x.n, d: x.d, text: qText(x, dec), tex: qTex(x, dec), v: qv(x) }));
    const by = (f: (i: number) => number) => items.map((_, i) => i).sort((i, j) => f(i) - f(j));
    const seq = by((i) => items[i].v);
    // The slip: decimals with more places taken as bigger, or negatives ordered by their size.
    const places = (i: number) => Number(items[i].text.split(".")[1] ?? 0);
    const slip = t === 0 ? by(places) : by((i) => (items[i].v < 0 ? -items[i].v : 100 + items[i].v));
    const traps: Trap[] = [];
    if (slip.some((i, k) => i !== seq[k])) {
      const k = slip.findIndex((i, j) => i !== seq[j]);
      const [x, y] = [items[slip[k]], items[seq[k]]];
      if (t === 0) traps.push({ id: "longerDecimal", a: { k: "order", items, seq: slip }, vars: { a: x.v.toFixed(3), b: y.v.toFixed(3) } });
      else {
        const neg = items.filter((i) => i.v < 0).sort((i, j) => i.v - j.v);
        traps.push({ id: "negativeSize", a: { k: "order", items, seq: slip }, vars: { small: neg[0].text, big: neg[neg.length - 1].text } });
      }
    }
    return {
      prompt: fill(S.orderList, { list: items.map((i) => i.text).join(", ") }), q: items.map((i) => i.tex).join(", \\quad "),
      answer: { k: "order", items, seq, traps }, show: seq.map((i) => items[i].tex).join(" < "), plain: seq.map((i) => items[i].text).join(", "), format: "order",
      // The fractions as decimals (or the decimals to three places), then the order.
      steps: [
        ...[xs.filter(({ x, dec }) => t === 0 || (!dec && x.d > 1)).map(({ x, dec }) => `${qTex(x, dec)} ${t === 0 ? `= ${qv(x).toFixed(3)}` : approx(x)}`).join(", \\quad ")].filter(Boolean),
        seq.map((i) => items[i].tex).join(" < "),
      ],
    };
  }
  if (kind === 5) {
    // A dot read off a line below zero: quarters, fifths or tenths, never a half.
    const d = r.pick([4, 5, 10]);
    const dec = d !== 4;
    const k = -r.int(1, 3);
    let j: number;
    do j = r.int(1, d - 1);
    while (2 * j === d);
    const v = q(k * d + j, d);
    const f = q(j, d);
    const slip = q((k + 1) * d - j, d);
    return {
      prompt: S.lineRead, q: "", pic: signedLine({ lo: k - 1, hi: 1, d, dot: qv(v) }),
      answer: { ...num(qv(v)), traps: [{ id: "negLineWrongEnd", a: num(qv(slip)), vars: { f: qText(f, dec), lo: mi(k), v: qText(v, dec) } }] },
      show: qTex(v, dec), plain: qPlain(v, dec), format: "number", steps: [`${k} + ${qTex(f, dec)} = ${qTex(v, dec)}`],
    };
  }
  if (r.next() < 0.6) {
    // An inequality written from words.
    const temp = r.next() < 0.4;
    const pickX = (): Q => (temp ? q(r.int(-15, 10)) : r.next() < 0.5 ? q(r.int(-12, 12)) : negQ(r, [2, 4, 5, 10]));
    let a: Q, b: Q;
    do [a, b] = [pickX(), pickX()];
    while (qv(a) === qv(b));
    const less = qv(a) < qv(b);
    const [ta, tb] = [qTex(a, ends(a)), qTex(b, ends(b))];
    const right = opt(`${ta} ${less ? "<" : ">"} ${tb}`);
    const slip = opt(`${ta} ${less ? ">" : "<"} ${tb}`);
    const other = opt(`${tb} ${less ? "<" : ">"} ${ta}`);
    const say = temp ? (less ? S.colder : S.warmer) : less ? S.less : S.greater;
    return pickOf(r, fill(say, { a: qText(a, ends(a)), b: qText(b, ends(b)) }), right, [{ o: slip, id: "ineqFacing", vars: { right: right.text } }], [other], { steps: [right.tex] });
  }
  // The smallest of three expressions, two of them below zero.
  const exprs: { tex: string; v: number }[] = [];
  const [x, y] = [r.int(2, 6), r.int(2, 6)];
  exprs.push({ tex: `-${x} \\times ${y}`, v: -x * y });
  const [c, e] = [r.int(5, 20), r.int(1, 4)];
  exprs.push({ tex: `${e} - ${c}`, v: e - c });
  const [g, h] = [r.int(2, 9), r.int(2, 9)];
  exprs.push(r.next() < 0.5 ? { tex: `-${g} + ${g + h}`, v: h } : { tex: `${g} - (-${h})`, v: g + h });
  if (exprs[0].v === exprs[1].v) exprs[1] = { tex: `${e} - ${c + 1}`, v: e - c - 1 };
  const opts = exprs.map((x) => opt(x.tex));
  const lo = exprs.reduce((m, x, i) => (x.v < exprs[m].v ? i : m), 0);
  const negs = exprs.map((x, i) => i).filter((i) => exprs[i].v < 0 && i !== lo);
  const near = negs.reduce((m, i) => (Math.abs(exprs[i].v) < Math.abs(exprs[m].v) ? i : m), negs[0]);
  return pickOf(r, S.smallest, opts[lo], [{ o: opts[near], id: "negativeSize", vars: { small: mi(exprs[lo].v), big: mi(exprs[near].v) } }], opts.filter((_, i) => i !== lo && i !== near), {
    steps: [exprs.map((x) => `${x.tex} = ${x.v}`).join(", \\quad "), `${exprs[lo].v} < ${exprs[near].v}`],
  });
}

export default gen;
