// Practice: spread (#650). Easy: read a dot plot (how many above a value, the most common value) and a histogram (how
// many across two bars). Medium: the lower or upper quartile and the IQR of a list, the IQR read off a box plot, and the
// mean absolute deviation. Hard (new settings): the upper fence for outliers, what one changed value does to the mean
// and to the median, and which of two box plots is more spread out. Counting the value itself as "more than", the
// stack's height for the most common value, one bar of two, the middle of the unsorted list, the range for the IQR, the
// median kept in the halves, signed distances, the total distance not shared out, the fence from the median, the whole
// change for the mean, a median that moves, and the range for the spread are slips. Since #736 half the easy and hard
// questions are new kinds: the shape of a dot plot and where its gap is (easy); which centre and spread suit a plot,
// and how much higher one class's median is than another's, on two dot plots (hard). The peak's side named for the
// skew, a short stack taken for a gap, the mean for a skewed plot, the median for a symmetric one, and the largest
// values compared are the slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { boxPlotSvg, dotPlotSvg, fiveNumbers, histSvg, mean, meanAbsDev, median, short } from "../spread";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
const list = (vs: readonly number[]) => vs.join(", ");
/** A number answer with its slips; a slip equal to the answer is dropped. */
const numWith = (v: number, traps: Trap[]): Pick<Part, "answer" | "show" | "plain" | "format"> => ({
  answer: { ...num(v, 1e-6), traps: traps.filter((t) => t.a.k !== "num" || Math.abs(t.a.v - v) > 1e-6) },
  show: short(v), plain: short(v), format: "number",
});
const trap = (id: Trap["id"], v: number, vars: Record<string, string | number> = {}): Trap => ({ id, a: num(v, 1e-6), vars });

const gen: Gen = (r, L, w) => {
  const W = w.spr;
  const pick = (options: string[], right: number, traps: Trap[], prompt: string, steps: string[], pic?: Part["pic"]): Part => {
    const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    return {
      prompt, q: "", ...(pic ? { pic } : {}),
      answer: { k: "pick", options: opts, right, traps: traps.map((t) => (t.a.k === "pick" ? { ...t, a: { ...t.a, options: opts } } : t)) },
      show: opts[right].tex, plain: options[right], format: "pick", steps,
    };
  };
  /** n whole numbers from lo to hi, sorted, with no two the same when `distinct`. */
  const values = (n: number, lo: number, hi: number, distinct = false) => {
    const out: number[] = [];
    while (out.length < n) {
      const v = r.int(lo, hi);
      if (!distinct || !out.includes(v)) out.push(v);
    }
    return out.sort((a, b) => a - b);
  };
  const shuffled = (vs: readonly number[]) => {
    const a = [...vs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const more = (): Part => {
    const K = w.spK;
    /** Dots from counts at lo, lo + 1, …. */
    const dots = (lo: number, counts: readonly number[]) => counts.flatMap((c, i) => Array.from({ length: c }, () => lo + i));
    const SKEW = [[2, 5, 4, 3, 2, 1, 1], [3, 6, 4, 2, 1, 1, 1], [1, 4, 5, 3, 2, 2, 1]];
    const SYM = [[1, 2, 4, 6, 4, 2, 1], [1, 3, 5, 5, 3, 1], [2, 3, 4, 3, 2]];
    if (L === 1) {
      if (r.next() < 0.5) {
        const kind = r.int(0, 2);
        const base = kind === 2 ? r.pick(SYM) : r.pick(SKEW);
        const counts = kind === 1 ? [...base].reverse() : base;
        const lo = r.int(0, 10 - counts.length);
        const traps: Trap[] = kind === 2 ? [] : [{ id: "skewSideSwapped", a: { k: "pick", options: [], right: 1 - kind }, vars: { s: [K.right, K.left][kind] } }];
        return pick([K.skewRight, K.skewLeft, K.symmetric], kind, traps, K.shapeQ, [`\\text{${[K.whyRight, K.whyLeft, K.whySym][kind]}}`], picOf(dotPlotSvg(dots(lo, counts), 0, 10, K.score)));
      }
      // Two clusters with a gap between them, and a short stack inside the first.
      const p = r.int(0, 2);
      const gap = r.int(2, 3);
      const q = p + 4 + gap;
      const second = [r.int(2, 4), r.int(2, 4), r.int(2, 4)];
      const vs = [...dots(p, [r.int(2, 3), r.int(3, 4), 1, r.int(2, 4)]), ...dots(q, second)];
      // The three answers in a random order: o[i] is where answer i goes.
      const o = shuffled([0, 1, 2]);
      const opts = [fill(K.gapBetween, { a: p + 3, b: q }), fill(K.gapAt, { d: p + 2 }), K.noGap];
      return pick(o.map((_, i) => opts[o.indexOf(i)]), o[0], [{ id: "lowStackAsGap", a: { k: "pick", options: [], right: o[1] }, vars: { d: p + 2 } }],
        K.gapQ, [`\\text{${fill(K.gapWhy, { a: p + 3, b: q })}}`], picOf(dotPlotSvg(vs, 0, Math.max(12, q + 3), K.score)));
    }
    if (r.next() < 0.5) {
      // Skewed (with a far value) or symmetric: which pair of centre and spread suits it.
      const skew = r.next() < 0.5;
      const base = skew ? r.pick(SKEW) : r.pick(SYM);
      const vs = [...dots(1, base), ...(skew ? [r.int(10, 12)] : [])];
      return pick([K.medIqr, K.meanSd], skew ? 0 : 1, [skew ? { id: "meanForSkewed", a: { k: "pick", options: [], right: 1 }, vars: {} } : { id: "medianForSymmetric", a: { k: "pick", options: [], right: 0 }, vars: {} }],
        K.centreQ, [`\\text{${skew ? K.whyMedian : K.whyMean}}`], picOf(dotPlotSvg(vs, 0, 12, K.score)));
    }
    // Two classes' scores: how much higher A's median is than B's; the largest values differ by another amount.
    for (;;) {
      const a = values(9, 3, 12);
      const b = values(9, 0, 9);
      const [ma, mb] = [a[4], b[4]];
      const top = a[8] - b[8];
      if (ma <= mb || top === ma - mb) continue;
      const pa = dotPlotSvg(a, 0, 12, K.classA);
      const pb = dotPlotSvg(b, 0, 12, K.classB);
      return {
        prompt: K.compareQ, q: "", pic: picOf({ body: `${pa.body}<g transform="translate(0 ${pa.h + 10})">${pb.body}</g>`, w: Math.max(pa.w, pb.w), h: pa.h + pb.h + 10 }),
        ...numWith(ma - mb, [trap("comparedLargest", top, { a: a[8], b: b[8], ma, mb, v: ma - mb })]),
        steps: [`\\text{${fill(K.medians, { ma, mb })}}`, `${ma} - ${mb} = ${ma - mb}`],
      };
    }
  };
  if (L !== 2 && r.int(0, 9) >= 5) return more();

  if (L === 1) {
    const t = r.pick(["more", "mode", "hist"] as const);
    if (t === "hist") {
      const from = r.pick([0, 10, 20]);
      const step = r.pick([5, 10]);
      const counts = Array.from({ length: 5 }, () => r.int(1, 12));
      const i = r.int(0, 3);
      const v = counts[i] + counts[i + 1];
      const [a, m, b] = [from + i * step, from + (i + 1) * step, from + (i + 2) * step];
      return {
        prompt: fill(W.hist, { a, b }), q: "", pic: picOf(histSvg(from, step, counts, W.histAxis)),
        ...numWith(v, [trap("histOneBar", counts[i], { a, m, b, c1: counts[i], c2: counts[i + 1], v }), trap("histOneBar", counts[i + 1], { a, m, b, c1: counts[i], c2: counts[i + 1], v })]),
        steps: [`${a}\\text{–}${m}: ${counts[i]}`, `${m}\\text{–}${b}: ${counts[i + 1]}`, `${counts[i]} + ${counts[i + 1]} = ${v}`],
      };
    }
    // Goals in each of 12 to 16 matches, 0 to 6, with one most common value.
    for (;;) {
      const vs = values(r.int(12, 16), 0, 6);
      const counts = [0, 1, 2, 3, 4, 5, 6].map((g) => vs.filter((x) => x === g).length);
      const tall = Math.max(...counts);
      if (counts.filter((c) => c === tall).length > 1) continue;
      const pic = picOf(dotPlotSvg(vs, 0, 6, W.dotAxis));
      if (t === "mode") {
        const m = counts.indexOf(tall);
        if (m === tall) continue;
        return { prompt: W.dotMode, q: "", pic, ...numWith(m, [trap("modeAsCount", tall, { c: tall, m })]), steps: [`\\text{${fill(W.tallest, { m, c: tall })}}`] };
      }
      const k = r.int(1, 4);
      const e = counts[k];
      if (e === 0) continue;
      const v = vs.filter((x) => x > k).length;
      return {
        prompt: fill(W.dotMore, { k }), q: "", pic, ...numWith(v, [trap("dotIncludesEqual", v + e, { k, e })]),
        steps: [counts.slice(k + 1).join(" + ") + ` = ${v}`],
      };
    }
  }

  if (L === 2) {
    const t = r.pick(["q1", "q3", "iqr", "box", "mad"] as const);
    if (t === "mad") {
      // A whole mean and whole distances, so the working is in whole numbers.
      for (;;) {
        const n = r.pick([4, 5, 6]);
        const vs = values(n, 2, 20);
        const m = mean(vs);
        if (!Number.isInteger(m)) continue;
        const ds = vs.map((x) => Math.abs(x - m));
        const s = ds.reduce((a, b) => a + b, 0);
        const v = meanAbsDev(vs);
        if (v === 0 || !Number.isInteger(v * 10)) continue;
        const sh = shuffled(vs);
        return {
          prompt: fill(W.mad, { list: list(sh) }), q: "",
          ...numWith(v, [trap("madSigned", 0), trap("madNotDivided", s, { s, n, v: short(v) })]),
          steps: [`\\bar x = ${m}`, `${ds.join(" + ")} = ${s}`, `${s} \\div ${n} = ${short(v)}`],
        };
      }
    }
    const n = r.pick([7, 9, 10, 11, 12]);
    const vs = values(n, 1, 40, true);
    const f = fiveNumbers(vs);
    if (t === "box") {
      // Read off the picture: whole-number quartiles, on a line labelled every 2.
      let f2 = f;
      while (!Number.isInteger(f2.q1) || !Number.isInteger(f2.q3) || f2.q3 === f2.q1) f2 = fiveNumbers(values(n, 1, 40, true));
      const lo = Math.floor(f2.min / 2) * 2;
      const hi = Math.ceil(f2.max / 2) * 2;
      return {
        prompt: W.boxIqr, q: "", pic: picOf(boxPlotSvg([{ name: "", f: f2 }], lo, hi, 2)),
        ...numWith(f2.q3 - f2.q1, [trap("iqrAsRange", f2.max - f2.min, { r: f2.max - f2.min, q1: short(f2.q1), q3: short(f2.q3), v: short(f2.q3 - f2.q1) })]),
        steps: [`Q_1 = ${short(f2.q1)},\\ Q_3 = ${short(f2.q3)}`, `${short(f2.q3)} - ${short(f2.q1)} = ${short(f2.q3 - f2.q1)}`],
      };
    }
    const sh = shuffled(vs);
    const h = Math.floor(n / 2);
    const steps = [`${list(vs)}`, `\\text{${fill(W.halves, { h })}}`, `Q_1 = ${short(f.q1)},\\ Q_3 = ${short(f.q3)}`];
    // The slips: the halves taken with the median in them (an odd count only), and the list's middle as written.
    const withMed = n % 2 ? fiveNumbersWith(vs) : null;
    if (t === "iqr")
      return {
        prompt: fill(W.iqrList, { list: list(sh) }), q: "",
        ...numWith(f.q3 - f.q1, [trap("iqrAsRange", f.max - f.min, { r: f.max - f.min, q1: short(f.q1), q3: short(f.q3), v: short(f.q3 - f.q1) })]),
        steps: [...steps, `${short(f.q3)} - ${short(f.q1)} = ${short(f.q3 - f.q1)}`],
      };
    const v = t === "q1" ? f.q1 : f.q3;
    const half = t === "q1" ? sh.slice(0, h) : sh.slice(n - h);
    const traps: Trap[] = [trap("medianUnsorted", median(half), {})];
    if (withMed) traps.push(trap("quartileWithMedian", t === "q1" ? withMed.q1 : withMed.q3, { h, v: short(v) }));
    return { prompt: fill(t === "q1" ? W.q1 : W.q3, { list: list(sh) }), q: "", ...numWith(v, traps), steps };
  }

  const t = r.pick(["fence", "change", "median", "compare"] as const);
  if (t === "fence") {
    const q1 = r.int(4, 30);
    const iqr = r.pick([4, 6, 8, 10, 12, 14, 16, 20]);
    const q3 = q1 + iqr;
    const m = q1 + r.int(1, iqr - 1);
    const v = q3 + 1.5 * iqr;
    return {
      prompt: fill(W.fence, { q1, m, q3 }), q: "",
      ...numWith(v, [trap("fenceFromMedian", m + 1.5 * iqr, { q3, iqr, v: short(v) })]),
      steps: [`IQR = ${q3} - ${q1} = ${iqr}`, `${q3} + 1.5 \\times ${iqr} = ${short(v)}`],
    };
  }
  const n = r.pick([5, 6, 8, 10]);
  if (t === "change" || t === "median") {
    const vs = values(n, 2, 30, true);
    const a = vs[n - 1];
    const d = n * r.int(2, 8);
    const b = a + d;
    const sh = shuffled(vs);
    if (t === "change")
      return {
        prompt: fill(W.meanChange, { n, list: list(sh), a, b }), q: "",
        ...numWith(d / n, [trap("meanChangeWhole", d, { d, n, v: short(d / n) })]),
        steps: [`${b} - ${a} = ${d}`, `${d} \\div ${n} = ${short(d / n)}`],
      };
    const m = median(vs);
    return pick([W.stays, W.goesUp], 0, [{ id: "medianMoves", a: { k: "pick", options: [], right: 1 }, vars: { m: short(m) } }],
      fill(W.medianChange, { list: list(sh), a, b }), [`\\text{${fill(W.middleStays, { m: short(m) })}}`]);
  }
  // Two classes: one with the larger IQR, the other with the larger range (a far value).
  for (;;) {
    const a = values(11, 30, 70, true);
    const b = values(11, 40, 60, true);
    b[10] = r.int(88, 99);
    b[0] = r.int(5, 15);
    const [fa, fb] = [fiveNumbers(a), fiveNumbers(b)];
    const [ia, ib] = [fa.q3 - fa.q1, fb.q3 - fb.q1];
    if (ia - ib < 6 || fb.max - fb.min <= fa.max - fa.min) continue;
    const pic = picOf(boxPlotSvg([{ name: W.classA, f: fa }, { name: W.classB, f: fb }], 0, 100, 10));
    return pick([W.classA, W.classB], 0, [{ id: "spreadByRange", a: { k: "pick", options: [], right: 1 }, vars: { a: short(ia), b: short(ib) } }], W.compare, [
      `IQR_A = ${short(fa.q3)} - ${short(fa.q1)} = ${short(ia)}`,
      `IQR_B = ${short(fb.q3)} - ${short(fb.q1)} = ${short(ib)}`,
    ], pic);
  }
};

/** The quartiles as a common slip takes them: with an odd count, the median kept in both halves. */
function fiveNumbersWith(sorted: readonly number[]) {
  const h = Math.ceil(sorted.length / 2);
  return { q1: median(sorted.slice(0, h)), q3: median(sorted.slice(sorted.length - h)) };
}

export default gen;
