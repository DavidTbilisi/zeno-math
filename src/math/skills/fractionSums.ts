// Practice: Fractions before grade 6, the staged way in to `fractions`. Fractions with the same bottom added and taken
// away on bars, and a division written as a fraction (3 ÷ 4 = 3/4, three wholes shared among four); then different
// bottoms, mixed numbers and a fraction of a whole number (2/3 of 12 on rows of counters); then a unit fraction
// divided by a whole number (shared) and a whole number by a unit fraction (how many fit), each also as a story. Tops
// and bottoms added or taken away, the division read the wrong way round, the wholes left out, one part of the number
// taken for all of them, and dividing done as multiplying are the slips. At P4 a fraction is also broken into parts
// (5/8 = 2/8 + □/8 on a bar, or which sum makes it); the parts added, and the bottom split too, are named (#702).
// #703: stories that add or take away (the same bottom at P4, mixed numbers at P5); at P5 a fraction times a whole
// number on bars or on a number line in jumps (a unit fraction, any fraction, a mixed number), which expression is the
// same, stories, and whether a product is more or less than the number (scaling); at the hard level a division turned
// into a multiplication, what a division asks, the area of a rectangle with fraction sides on a square metre, and a
// fraction of a fraction in a story. The bottom multiplied too, only the wholes multiplied, the numbers added, "times
// always makes bigger", the divisor kept, the division read as "of", the sides added and the second fraction left
// out are named.
import { fill } from "../chart";
import { fracArea, fracLine, groupBars, wholeBars } from "../fracLinePics";
import { pickPart, pickText } from "../mulDivKit";
import { fr, num, plainFrac } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";

type F = { n: number; d: number };
/** A fraction as typed, 3/4, or a whole number, 3. */
const txt = (f: F) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const ftex = (f: F) => (f.d === 1 ? String(f.n) : `\\frac{${f.n}}{${f.d}}`);
/** A mixed number as typed (2 1/3) and in TeX. */
const mixTxt = (w: number, f: F) => `${w} ${f.n}/${f.d}`;
const mixTex = (w: number, f: F) => `${w}\\frac{${f.n}}{${f.d}}`;

const gen: Gen = (r, L, w) => {
  const W = w.fracSums;
  /** A number from lo to hi that shares no factor with b, so a/b is already in lowest terms. */
  /** A proper fraction over d already in lowest terms (2/3, never 3/9). */
  const part = (d: number): F => ({ n: coprime(d, 1, d - 1), d });
  const coprime = (b: number, lo: number, hi: number) => r.pick(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((a) => a !== b && gcd(a, b) === 1));
  /** The answer v as a fraction in lowest terms (6/8 is sent back for 3/4), or a whole number. */
  const out = (q: string, v: F, more: { traps?: Trap[]; prompt?: string; solution?: Part["solution"]; steps?: string[]; pic?: Part["pic"] }): Part => {
    const f = fr(v.n, v.d);
    const { traps = [], prompt = w.prompts.fractions, ...rest } = more;
    return { prompt, q, answer: { ...num(v.n / v.d, 1e-9, { lowest: true }), traps }, show: f.tex(), plain: plainFrac(f), format: "fraction", ...rest };
  };
  /** A fraction as text in lowest terms, or a whole number. */
  const low = (n: number, d: number) => plainFrac(fr(n, d));
  /** "= 2" or "= \\frac{1}{8}" closing a worked line when n/d is not yet in lowest terms. */
  const lowest = (n: number, d: number) => (gcd(n, d) > 1 ? ` = ${fr(n, d).tex()}` : "");
  /** The slips whose answers differ from the right one and from each other. */
  const slips = (v: number, list: [MistakeId, number | null, Record<string, string | number>][]): Trap[] => {
    const seen = new Set([v]);
    return list.flatMap(([id, x, vars]) => {
      if (x === null || !Number.isFinite(x) || x <= 0 || [...seen].some((s) => Math.abs(s - x) < 1e-9)) return [];
      seen.add(x);
      return [{ id, a: num(x), vars }];
    });
  };
  const model = (op: "+" | "-" | "×" | "÷", a: string, b: string, pic?: "share" | "of") => ({ kind: "model" as const, spec: { type: "fracop", op, a, b, step: 99, ...(pic ? { pic } : {}) } });

  /** a ± b, worked on bars cut into the common pieces. Tops and bottoms added, or taken away, are the slips. */
  const sum = (a: F, b: F, plus: boolean, prompt?: string) => {
    const v = plus ? { n: a.n * b.d + b.n * a.d, d: a.d * b.d } : { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
    const L = (a.d * b.d) / gcd(a.d, b.d);
    const work = `${(a.n * L) / a.d}/${L} ${plus ? "+" : "−"} ${(b.n * L) / b.d}/${L}`;
    const big = a.n / a.d > b.n / b.d ? a : b;
    const traps = slips(v.n / v.d, [
      ["addAcross", plus ? (a.n + b.n) / (a.d + b.d) : null, { r: `${a.n + b.n}/${a.d + b.d}`, big: txt(big) }],
      ["subtractedAcross", !plus && a.d > b.d && a.n > b.n ? (a.n - b.n) / (a.d - b.d) : null, { x: `${a.n - b.n}/${a.d - b.d}`, work, v: plainFrac(fr(v.n, v.d)) }],
    ]);
    return out(prompt ? "" : `${ftex(a)} ${plus ? "+" : "-"} ${ftex(b)}`, v, { prompt, traps, solution: model(plus ? "+" : "-", txt(a), txt(b)) });
  };
  /** k × n/d (#703), the top multiplied: the bottom multiplied too is the slip. */
  const timesSlips = (k: number, f: F) => {
    const v = (k * f.n) / f.d;
    return slips(v, [["bottomTimesToo", f.n / f.d, { x: `${k * f.n}/${k * f.d}`, k, f: txt(f), n: f.n, kn: k * f.n, v: low(k * f.n, f.d) }]]);
  };
  /** a ÷ b written as a fraction: a shared among b. b/a is the slip. */
  const asDivision = (a: number, b: number, prompt = W.asFraction, q = `${a} \\div ${b}`) => {
    const traps = slips(a / b, [["quotientFlipped", b / a, { a, b, v: `${a}/${b}`, x: plainFrac(fr(b, a)) }]]);
    return out(q, { n: a, d: b }, { prompt, traps, solution: model("÷", String(a), String(b), "share") });
  };
  /** a ÷ b with one of them a unit fraction. a × b is the slip. */
  const divide = (a: F, b: F, prompt?: string, q?: string) => {
    const v = { n: a.n * b.d, d: a.d * b.n };
    const x = (a.n * b.n) / (a.d * b.d);
    const vars = { a: txt(a), b: txt(b), v: plainFrac(fr(v.n, v.d)), x: plainFrac(fr(a.n * b.n, a.d * b.d)) };
    const traps = slips(v.n / v.d, [["dividedAsTimes", x, vars]]);
    return out(q ?? `${ftex(a)} \\div ${ftex(b)}`, v, { prompt, traps, solution: model("÷", txt(a), txt(b), b.d === 1 ? "share" : undefined) });
  };

  if (L === 1) {
    const kind = r.int(0, 5);
    if (kind === 5) {
      // A story with the same bottom (#703): eaten at lunch and at dinner, or a piece cut off a ribbon.
      const d = r.pick([5, 6, 8, 10, 12]);
      const x = part(d);
      let y = part(d);
      for (let i = 0; i < 9 && y.n === x.n; i++) y = part(d);
      if (y.n === x.n) y = { n: 1, d };
      const plus = r.next() < 0.5 && x.n + y.n <= d;
      const [a, b] = plus || x.n > y.n ? [x, y] : [y, x];
      return sum(a, b, plus, fill(plus ? W.lunch : W.ribbon, { a: txt(a), b: txt(b) }));
    }
    if (kind >= 3) {
      // A fraction broken into parts (#702): a/d = b/d + □/d on a bar, or which sum makes it. The parts added instead
      // of the part left, and the bottom split as well as the top, are the slips.
      const d = r.pick([4, 5, 6, 8, 10]);
      const a = r.int(3, d - 1);
      const b = r.int(1, a - 1);
      const right = `${b}/${d} + ${a - b}/${d} = ${a}/${d}`;
      if (kind === 3) {
        return {
          prompt: w.basics.missing, q: `\\frac{${a}}{${d}} = \\frac{${b}}{${d}} + \\frac{\\square}{${d}}`,
          answer: { ...num(a - b), traps: slips(a - b, [["partsAdded", a + b, { x: a + b, a, b, d, v: a - b }]]) },
          show: String(a - b), plain: String(a - b), format: "number",
          pic: wholeBars(1, d, a), steps: [`${a} - ${b} = ${a - b}`, `\\frac{${a}}{${d}} = \\frac{${b}}{${d}} + \\frac{${a - b}}{${d}}`],
        };
      }
      const sumTex = (x: number, y: number, e: number) => `\\frac{${x}}{${e}} + \\frac{${y}}{${e}}`;
      const split = d % 2 === 0 ? [{ tex: sumTex(b, a - b, d / 2), id: "bottomSplit" as const, vars: { d, right } }] : [];
      const other = sumTex(b, a - b + 1, d);
      return pickPart(r, fill(W.whichSum, { f: `${a}/${d}` }), sumTex(b, a - b, d), split, [other, ...(split.length ? [] : [sumTex(b + 1, a - b + 1, d)])], {
        steps: [`${sumTex(b, a - b, d)} = \\frac{${b} + ${a - b}}{${d}} = \\frac{${a}}{${d}}`],
      });
    }
    if (kind === 2) {
      // 3 ÷ 4, and now and then more than one each: 5 ÷ 3.
      const b = r.int(2, 9);
      // Less than one each (3 ÷ 4), now and then more (5 ÷ 3); one whole shared only when the bottom is 2.
      const less = r.next() < 0.75;
      return asDivision(less ? coprime(b, b > 2 ? 2 : 1, b - 1) : coprime(b, b + 1, 2 * b - 1), b);
    }
    const d = r.int(3, 12);
    const plus = kind === 0;
    // Two different tops over the same bottom, each fraction in lowest terms; the larger first when taking away.
    const x = part(d);
    let y = part(d);
    for (let i = 0; i < 9 && y.n === x.n; i++) y = part(d);
    if (y.n === x.n) return sum(x, x, true);
    return plus ? sum(x, y, true) : sum(x.n > y.n ? x : y, x.n > y.n ? y : x, false);
  }
  if (L === 2) {
    const kind = r.int(0, 6);
    if (kind >= 3) return timesWhole(kind);
    if (kind === 0) {
      // Different bottoms: one a multiple of the other (1/2 and 3/8), or two that share nothing (2/3 and 1/4).
      const [d1, d2] = r.next() < 0.5 ? (() => { const d = r.int(2, 5); return [d * r.int(2, 3), d]; })() : r.pick([[3, 2], [4, 3], [5, 2], [5, 3], [5, 4], [6, 5]]);
      const [a, b] = [part(d1), part(d2)];
      const plus = r.next() < 0.5 || a.n / a.d === b.n / b.d;
      if (plus) return sum(a, b, true);
      return a.n / a.d > b.n / b.d ? sum(a, b, false) : sum(b, a, false);
    }
    if (kind === 1) {
      // Mixed numbers with the same or a related bottom, added or taken away (the larger first).
      const d = r.int(2, 6);
      const d2 = r.next() < 0.5 ? d : d * 2;
      const [fa, fb] = [part(d2), part(d)];
      const [wa, wb] = [r.int(2, 5), r.int(1, 3)];
      const plus = r.next() < 0.5 || wa <= wb;
      const A = { n: wa * fa.d + fa.n, d: fa.d };
      const B = { n: wb * fb.d + fb.n, d: fb.d };
      const v = plus ? A.n / A.d + B.n / B.d : A.n / A.d - B.n / B.d;
      const wholes = plus ? wa + wb : wa - wb;
      const vf = fr(plus ? A.n * B.d + B.n * A.d : A.n * B.d - B.n * A.d, A.d * B.d);
      const traps = slips(v, [["wholesLeftOut", v - wholes, { wa, wb, op: plus ? "+" : "−", w: wholes, v: plainFrac(vf), x: plainFrac(fr(Math.round((v - wholes) * A.d * B.d), A.d * B.d)) }]]);
      // Now and then as a story (#703): a walk in two parts, or a piece cut off a plank.
      const story = d === d2 && r.next() < 0.4 ? fill(plus ? W.walk : W.plank, { a: mixTxt(wa, fa), b: mixTxt(wb, fb) }) : undefined;
      return out(story ? "" : `${mixTex(wa, fa)} ${plus ? "+" : "-"} ${mixTex(wb, fb)}`, { n: vf.n, d: vf.d }, { prompt: story, traps, solution: model(plus ? "+" : "-", mixTxt(wa, fa), mixTxt(wb, fb)) });
    }
    // A fraction of a whole number: 2/3 of 12, worked on rows of counters.
    const d = r.int(2, 6);
    // Mostly more than one part (2/3 of 12), where taking one part for all of them can happen.
    const n = d > 2 && r.next() < 0.7 ? coprime(d, 2, d - 1) : 1;
    const N = d * r.int(2, 8);
    const traps = slips((n * N) / d, [["onlyOnePart", n > 1 ? N / d : null, { n: N, d, k: n, x: N / d, v: (n * N) / d }]]);
    return out("", { n: n * N, d }, { prompt: fill(W.of, { f: `${n}/${d}`, n: N }), traps, solution: model("×", `${n}/${d}`, String(N), "of") });
  }
  const kind = r.int(0, 6);
  if (kind >= 3) return hard(kind);
  const d = r.int(2, 6);
  if (kind === 0) return divide({ n: 1, d }, { n: r.int(2, 6), d: 1 });
  if (kind === 1) return divide({ n: r.int(2, 9), d: 1 }, { n: 1, d });
  // Stories: a piece of cake shared, servings of rice, pizzas shared.
  const story = r.int(0, 2);
  if (story === 0) {
    const n = r.int(2, 5);
    return divide({ n: 1, d }, { n, d: 1 }, fill(W.cake, { f: `1/${d}`, n }), "");
  }
  if (story === 1) {
    const N = r.int(2, 6);
    return divide({ n: N, d: 1 }, { n: 1, d }, fill(W.servings, { f: `1/${d}`, n: N }), "");
  }
  const b = r.int(3, 8);
  const a = coprime(b, 2, b + 3);
  return asDivision(a, b, fill(W.pizzas, { a, b }), "");

  /** A fraction times a whole number (#703), P5. */
  function timesWhole(kind: number): Part {
    const k = r.int(2, 5);
    const d = r.int(2, 8);
    const f: F = r.next() < 0.3 ? { n: 1, d } : part(d);
    const v = { n: k * f.n, d: f.d };
    const steps = [`${k} \\times ${ftex(f)} = \\frac{${k} \\times ${f.n}}{${f.d}} = \\frac{${k * f.n}}{${f.d}}${lowest(k * f.n, f.d)}`];
    if (kind === 3) {
      // Bare, over k bars of n/d each or k jumps of n/d on a line; now and then a mixed number.
      if (r.next() < 0.25) {
        const wh = r.int(1, 3);
        const g = part(r.int(2, 6));
        const V = fr(k * (wh * g.d + g.n), g.d);
        const x = k * wh + g.n / g.d;
        const traps = slips(V.n / V.d, [["mixedPartNotTimes", x, { x: plainFrac(fr(k * wh * g.d + g.n, g.d)), k, w: wh, kw: k * wh, f: txt(g), kf: low(k * g.n, g.d), v: plainFrac(V) }]]);
        return out(`${k} \\times ${mixTex(wh, g)}`, { n: V.n, d: V.d }, { traps, steps: [`${k} \\times ${mixTex(wh, g)} = ${k} \\times ${wh} + ${k} \\times ${ftex(g)}`, `= ${k * wh} + \\frac{${k * g.n}}{${g.d}} = ${ftex({ n: V.n, d: V.d })}`] });
      }
      const line = f.d <= 6 && v.n / v.d <= 4 && r.next() < 0.5;
      const pic = line ? fracLine({ wholes: Math.max(1, Math.ceil(v.n / v.d)), d: f.d, labels: Array.from({ length: Math.ceil(v.n / v.d) + 1 }, (_, i) => [i * f.d, String(i)] as [number, string]), jumps: [k, f.n] }) : groupBars(k, f.d, f.n);
      return out(`${k} \\times ${ftex(f)}`, v, { traps: timesSlips(k, f), steps, pic });
    }
    if (kind === 4) {
      // Which is the same as k × n/d: the fraction added k times.
      const kk = Math.min(k, 4);
      const g = f.n === f.d ? { n: 1, d } : f;
      const added = Array(kk).fill(ftex(g)).join(" + ");
      return pickPart(r, fill(W.sameAs, { e: `${kk} × ${txt(g)}` }), added, [{ tex: `\\frac{${kk * g.n}}{${kk * g.d}}`, id: "bottomTimesToo", vars: { x: `${kk * g.n}/${kk * g.d}`, k: kk, f: txt(g), n: g.n, kn: kk * g.n, v: low(kk * g.n, g.d) } }], [`${ftex(g)} + ${kk}`, `\\frac{${g.n}}{${kk * g.d}}`], {
        steps: [`${added} = \\frac{${kk} \\times ${g.n}}{${g.d}} = \\frac{${kk * g.n}}{${g.d}}${lowest(kk * g.n, g.d)}`],
      });
    }
    if (kind === 5) {
      // A story: laps of a track, sugar for cakes. The two numbers added is the slip.
      const traps = [...timesSlips(k, f), ...slips(v.n / v.d, [["addedForTimes", k + f.n / f.d, { x: plainFrac(fr(k * f.d + f.n, f.d)), k, f: txt(f), v: low(v.n, v.d) }]])];
      return out("", v, { prompt: fill(r.next() < 0.5 ? W.laps : W.sugar, { f: txt(f), k }), traps, steps });
    }
    // Scaling: is f × n more than, less than or equal to n, without working it out.
    const n = r.pick([12, 18, 24, 30, 36, 40]);
    const t = r.int(0, 4);
    const g: F = t <= 2 ? part(r.int(3, 9)) : t === 3 ? (() => { const e = r.int(2, 6); return { n: e + coprime(e, 1, e - 1), d: e }; })() : (() => { const e = r.int(2, 6); return { n: e, d: e }; })();
    const [more, less, same] = [fill(W.more, { n }), fill(W.less, { n }), fill(W.equal, { n })];
    const right = g.n < g.d ? less : g.n > g.d ? more : same;
    const rel = g.n < g.d ? "<" : g.n > g.d ? ">" : "=";
    return pickText(r, fill(W.scale, { f: txt(g), n }), right, g.n < g.d ? [{ text: more, id: "timesAlwaysBigger", vars: { a: n, b: txt(g), v: low(g.n * n, g.d) } }] : [], [more, less, same].filter((o) => o !== right && !(g.n < g.d && o === more)), {
      steps: [`${ftex(g)} ${rel} 1`, `${ftex(g)} \\times ${n} ${rel} ${n}`],
    });
  }

  /** The hard level's new kinds (#703), P5. */
  function hard(kind: number): Part {
    const d = r.int(2, 6);
    const k = r.int(2, 6);
    if (kind === 3) {
      // A division turned into a multiplication: 1/d ÷ k = 1/d × □, or k ÷ 1/d = k × □. Keeping the divisor is the slip.
      if (r.next() < 0.5) {
        const v = low(1, d * k);
        const traps = slips(1 / k, [["divisorNotFlipped", k, { b: k, r: `1/${k}`, q: `1/${d} ÷ ${k} = 1/${d} × 1/${k}`, v }]]);
        return out(`\\frac{1}{${d}} \\div ${k} = \\frac{1}{${d}} \\times \\square`, { n: 1, d: k }, { prompt: w.basics.missing, traps, steps: [`\\frac{1}{${d}} \\div ${k} = \\frac{1}{${d}} \\times \\frac{1}{${k}} = \\frac{1}{${d * k}}`] });
      }
      const traps = slips(d, [["divisorNotFlipped", 1 / d, { b: `1/${d}`, r: d, q: `${k} ÷ 1/${d} = ${k} × ${d}`, v: k * d }]]);
      return out(`${k} \\div \\frac{1}{${d}} = ${k} \\times \\square`, { n: d, d: 1 }, { prompt: w.basics.missing, traps, steps: [`${k} \\div \\frac{1}{${d}} = ${k} \\times ${d} = ${k * d}`] });
    }
    if (kind === 4) {
      // What k ÷ 1/d asks: how many 1/d fit in k. Reading it as 1/d of k is the slip.
      const f = `1/${d}`;
      return pickText(r, fill(W.asks, { k, f }), fill(W.howMany, { f, k }), [{ text: fill(W.partOf, { f, k }), id: "divisionReadAsOf", vars: { f, k, v: k * d } }], [fill(W.howManyBig, { f, k })], {
        steps: [`${k} \\div \\frac{1}{${d}} = ${k * d}`],
      });
    }
    // Two fractions multiplied: the area of a rectangle with fraction sides, or a fraction of what was left.
    const d1 = r.int(2, 6);
    const d2 = r.int(2, 6);
    const [a, b] = [part(d1), part(d2)];
    const v = { n: a.n * b.n, d: a.d * b.d };
    const prod = `${ftex(a)} \\times ${ftex(b)} = \\frac{${a.n} \\times ${b.n}}{${a.d} \\times ${b.d}} = \\frac{${v.n}}{${v.d}}${lowest(v.n, v.d)}`;
    if (kind === 5) {
      const x = a.n / a.d + b.n / b.d;
      const traps = slips(v.n / v.d, [["areaSidesAdded", x, { x: low(a.n * b.d + b.n * a.d, a.d * b.d), a: txt(a), b: txt(b), v: low(v.n, v.d) }]]);
      return out("", v, { prompt: fill(W.area, { a: txt(a), b: txt(b) }), traps, pic: fracArea(a.n, a.d, b.n, b.d), steps: [prod] });
    }
    const traps = slips(v.n / v.d, [["fractionOfLeftOut", a.n / a.d, { a: txt(a), b: txt(b), v: low(v.n, v.d) }]]);
    return out("", v, { prompt: fill(W.ateOf, { a: txt(a), b: txt(b) }), traps, steps: [prod] });
  }
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export default gen;
