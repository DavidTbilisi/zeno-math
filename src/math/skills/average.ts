// Practice: Averages and spread. Since #736 half the questions are new kinds. Easy (grade 6): which question is
// statistical, the mean of a dot plot, the mean of a frequency table, and the missing value given the mean. Medium:
// the median of a frequency table, which histogram bar holds the median, a median-and-range puzzle, every value shifted,
// and a value added to a list of known mean. Hard: the standard deviation of a population and of a sample, the
// variance, and, in a new setting, which of two dot plots has the larger standard deviation by eye. A question with
// one answer, the distinct values averaged, the rows counted for the total, the mean given for the missing value, one
// value too many, the middle of the values or of the counts, the tallest bar, the range for the largest, a shift that
// is ignored or that moves the range, the new value averaged with the mean, n and n − 1 swapped, the standard
// deviation for the variance, and the range for the spread are the slips.
import { fill } from "../chart";
import { countTableSvg } from "../displays";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { dotPlotSvg, histSvg, mean as meanOf, median } from "../spread";
import { pickPart } from "../tTails";

const place = (p: { body: string; w: number; h: number }): Part["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${p.body}</g>`, h: p.h, w: p.w });
const short = (v: number) => String(Number(v.toFixed(2)));
const trap = (id: Trap["id"], v: number, vars: Record<string, string | number>, tol = 1e-6): Trap => ({ id, a: num(v, tol), vars });
/** A number answer with its slips; a slip equal to the answer, or to one before it, is dropped. */
const numWith = (v: number, traps: Trap[], tol = 1e-6): Pick<Part, "answer" | "show" | "plain" | "format"> => {
  const far = (a: number, b: number) => Math.abs(a - b) > Math.max(tol, 1e-6) * 2;
  const val = (t: Trap) => (t.a.k === "num" ? t.a.v : NaN);
  return {
    answer: { ...num(v, tol), traps: traps.filter((t, i) => far(val(t), v) && traps.findIndex((u) => !far(val(u), val(t))) === i) },
    show: tol > 1e-6 ? dp(v, 2) : short(v), plain: tol > 1e-6 ? dp(v, 2) : short(v), format: tol > 1e-6 ? "dp2" : "number",
  };
};
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
/** Two dot plots, A above B, on the same line. */
function twoPlots(a: readonly number[], b: readonly number[], lo: number, hi: number, names: [string, string]) {
  const [pa, pb] = [dotPlotSvg(a, lo, hi, names[0]), dotPlotSvg(b, lo, hi, names[1])];
  return { body: `${pa.body}<g transform="translate(0 ${pa.h + 10})">${pb.body}</g>`, w: Math.max(pa.w, pb.w), h: pa.h + pb.h + 10 };
}

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const W = w.avK;
  const shuffled = <T>(xs: readonly T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  if (L === 1) {
    const t = r.pick(["stat", "dot", "table", "missing"] as const);
    if (t === "stat") {
      const k = r.int(0, 3);
      const [a, b] = shuffled([0, 1, 2, 3]).filter((x) => x !== k);
      const one = [W[`one${a}` as "one0"], W[`one${b}` as "one0"]];
      return pickPart(r, [W[`many${k}` as "many0"], ...one], 0, one.map((_, i) => ({ id: "oneAnswerAsStatistical" as const, at: i + 1, vars: { q: one[i] } })), W.statQ, [`\\text{${W.statWhy}}`]);
    }
    if (t === "dot") {
      // A whole mean, and the distinct values' mean a different number.
      const n = r.int(6, 10);
      const vs = Array.from({ length: n }, () => r.int(1, 8)).sort((x, y) => x - y);
      const m = meanOf(vs);
      const distinct = [...new Set(vs)];
      const md = meanOf(distinct);
      if (!Number.isInteger(m) || Math.abs(md - m) < 0.01) return more(r, L, w);
      return {
        prompt: W.dotMeanQ, q: "", pic: place(dotPlotSvg(vs, 0, 9, W.pets)),
        ...numWith(m, [trap("meanOfDistinct", md, { d: distinct.length, n })]),
        steps: [`${vs.join(" + ")} = ${sum(vs)}`, `${sum(vs)} \\div ${n} = ${m}`],
      };
    }
    if (t === "table") {
      // How many pets: each value times how many have it, over everyone.
      const fs = [0, 1, 2, 3, 4].map(() => r.int(1, 8));
      const n = sum(fs);
      const fx = sum(fs.map((f, x) => f * x));
      if (!Number.isInteger((fx / n) * 10)) return more(r, L, w);
      return {
        prompt: W.tableMeanQ, q: "", pic: place(countTableSvg([W.petsHead, W.pupils], fs.map((f, x) => ({ name: String(x), n: f })))),
        ...numWith(fx / n, [trap("meanByRows", fx / 5, { t: fx, n, v: short(fx / n) }), trap("meanOfDistinct", 2, { d: 5, n })]),
        steps: [`${fs.map((f, x) => `${x} \\times ${f}`).join(" + ")} = ${fx}`, `${fs.join(" + ")} = ${n}`, `${fx} \\div ${n} = ${short(fx / n)}`],
      };
    }
    const n = r.int(4, 6);
    const m = r.int(5, 15);
    const known = Array.from({ length: n - 1 }, () => r.int(1, 25));
    const x = n * m - sum(known);
    if (x < 1 || x > 30 || x === m) return more(r, L, w);
    return {
      prompt: fill(W.missingQ, { n, m, list: known.join(", ") }), q: "",
      ...numWith(x, [trap("missingAsMean", m, { n, m, s: sum(known), v: x }), trap("missingWrongCount", (n - 1) * m - sum(known), { n, m, s: sum(known), v: x })]),
      steps: [`${n} \\times ${m} = ${n * m}`, `${n * m} - ${sum(known)} = ${x}`],
    };
  }
  if (L === 2) {
    const t = r.pick(["table", "hist", "puzzle", "shift", "add"] as const);
    if (t === "table") {
      // An odd count, so the median is one value; the values' middle and the counts' middle are other numbers.
      const xs = [r.int(0, 2)].map((x0) => [0, 1, 2, 3, 4].map((k) => x0 + k))[0];
      const fs = xs.map(() => r.int(1, 7));
      const n = sum(fs);
      if (n % 2 === 0) return more(r, L, w);
      const all = xs.flatMap((x, i) => Array.from({ length: fs[i] }, () => x));
      const v = all[(n - 1) / 2];
      return {
        prompt: W.tableMedianQ, q: "", pic: place(countTableSvg([W.goals, W.matches], xs.map((x, i) => ({ name: String(x), n: fs[i] })))),
        ...numWith(v, [trap("medianOfValues", xs[2], { n, k: (n + 1) / 2, v }), trap("medianOfCounts", median([...fs].sort((a, b) => a - b)), { n, k: (n + 1) / 2, v })]),
        steps: [`\\text{${fill(W.medianWhy, { n, k: (n + 1) / 2, v })}}`],
      };
    }
    if (t === "hist") {
      // The bar that holds the middle value is not the tallest.
      const counts = Array.from({ length: 5 }, () => r.int(1, 12));
      const n = sum(counts);
      if (n % 2 === 0) return more(r, L, w);
      const k = (n + 1) / 2;
      let run = 0;
      const bar = counts.findIndex((c) => (run += c) >= k);
      const tall = counts.indexOf(Math.max(...counts));
      if (bar === tall || counts.filter((c) => c === counts[tall]).length > 1) return more(r, L, w);
      const from = r.pick([0, 10, 20]);
      const names = counts.map((_, i) => `${from + i * 10}–${from + i * 10 + 10}`);
      // The bars in their order on the line, not shuffled.
      const opts = names.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
      return {
        prompt: fill(W.histMedianQ, { n }), q: "", pic: place(histSvg(from, 10, counts, W.minutes)),
        answer: { k: "pick", options: opts, right: bar, traps: [{ id: "modalBinAsMedian", a: { k: "pick", options: opts, right: tall }, vars: { k, n } }] },
        show: opts[bar].tex, plain: names[bar], format: "pick",
        steps: [`\\text{${fill(W.histWhy, { k, n })}}`, `${counts.slice(0, bar + 1).join(" + ")} = ${sum(counts.slice(0, bar + 1))}`],
      };
    }
    if (t === "puzzle") {
      const m = r.int(6, 15);
      const lo = r.int(1, m - 2);
      const R = r.int(m - lo + 2, m - lo + 14);
      return {
        prompt: fill(W.puzzleQ, { m, r: R, s: lo }), q: "",
        ...numWith(lo + R, [trap("rangeAsLargest", R, { r: R, s: lo, v: lo + R })]),
        steps: [`${lo} + ${R} = ${lo + R}`],
      };
    }
    if (t === "shift") {
      const n = r.int(5, 7);
      const vs = Array.from({ length: n }, () => r.int(2, 20)).sort((a, b) => a - b);
      const k = r.int(2, 9);
      const m = meanOf(vs);
      if (!Number.isInteger(m)) return more(r, L, w);
      const R = vs[n - 1] - vs[0];
      if (r.next() < 0.5)
        return {
          prompt: fill(W.shiftMeanQ, { list: shuffled(vs).join(", "), m, k }), q: "",
          ...numWith(m + k, [trap("shiftIgnored", m, { k, m, v: m + k }), trap("shiftTimesCount", m + n * k, { k, n, m, v: m + k })]),
          steps: [`${m} + ${k} = ${m + k}`],
        };
      return {
        prompt: fill(W.shiftRangeQ, { list: shuffled(vs).join(", "), k }), q: "",
        ...numWith(R, [trap("rangeShifted", R + k, { k, a: vs[n - 1] + k, b: vs[0] + k, v: R })]),
        steps: [`(${vs[n - 1]} + ${k}) - (${vs[0]} + ${k}) = ${vs[n - 1]} - ${vs[0]} = ${R}`],
      };
    }
    // A value added to n values of mean m: the total grows, then is shared among n + 1.
    const n = r.int(4, 9);
    const m = r.int(5, 15);
    const v = m + r.int(1, 4);
    const x = (n + 1) * v - n * m;
    if (x > 60 || ((m + x) / 2) === v) return more(r, L, w);
    return {
      prompt: fill(W.addQ, { n, m, x }), q: "",
      ...numWith(v, [trap("newValueAveraged", (m + x) / 2, { m, x, n, t: n * m + x, v })]),
      steps: [`${n} \\times ${m} = ${n * m}`, `${n * m} + ${x} = ${n * m + x}`, `${n * m + x} \\div ${n + 1} = ${v}`],
    };
  }
  const t = r.pick(["pop", "sample", "variance", "visual"] as const);
  if (t === "visual") {
    // A spread to the ends against a tight cluster with one far value: the far value gives the larger range only.
    for (;;) {
      const a = shuffled([3, 3, 4, 4, 8, 8, 9, 9].map((x) => x + r.int(-1, 0)));
      const b = [5, 5, 6, 6, 6, 7, 7].map((x) => x + r.int(-1, 1));
      b.push(r.pick([0, 12]));
      const sdOf = (xs: number[]) => Math.sqrt(sum(xs.map((x) => (x - meanOf(xs)) ** 2)) / xs.length);
      const rng = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
      if (sdOf(a) <= sdOf(b) + 0.3 || rng(b) <= rng(a)) continue;
      const swap = r.next() < 0.5;
      const [top, bottom] = swap ? [b, a] : [a, b];
      return {
        ...pickPart(r, [W.plotA, W.plotB], swap ? 1 : 0, [{ id: "sdByRange", at: swap ? 0 : 1, vars: { a: short(sdOf(a)), b: short(sdOf(b)) } }], W.visualQ,
          [`\\sigma_A \\approx ${dp(sdOf(top), 2)},\\ \\sigma_B \\approx ${dp(sdOf(bottom), 2)}`]),
        pic: place(twoPlots(top, bottom, 0, 12, [W.plotA, W.plotB])),
      };
    }
  }
  // Whole mean, so the working is short.
  const n = r.int(4, 6);
  const vs = Array.from({ length: n }, () => r.int(2, 20));
  const m = meanOf(vs);
  if (!Number.isInteger(m) || new Set(vs).size < 2) return more(r, L, w);
  const ss = sum(vs.map((x) => (x - m) ** 2));
  const [pop, smp] = [Math.sqrt(ss / n), Math.sqrt(ss / (n - 1))];
  const steps = [`\\mu = ${m}`, `\\sum (x - \\mu)^2 = ${vs.map((x) => `${x - m < 0 ? `(${x - m})` : x - m}^2`).join(" + ")} = ${ss}`];
  if (t === "variance")
    return {
      prompt: fill(W.varianceQ, { n, list: vs.join(", ") }), q: "",
      ...numWith(ss / n, [trap("sdForVariance", pop, { s: dp(pop, 2), v: dp(ss / n, 2) }, 0.0051), trap("squaresNotDivided", ss, { t: ss, n, v: dp(ss / n, 2) }, 0.0051)], 0.0051),
      steps: [...steps, `\\sigma^2 = ${ss} \\div ${n} = ${dp(ss / n, 2)}`],
    };
  if (t === "pop")
    return {
      prompt: fill(W.popQ, { n, list: vs.join(", ") }), q: "",
      ...numWith(pop, [trap("sampleForPopulation", smp, { n, m: n - 1 }, 0.0051)], 0.0051),
      steps: [...steps, `\\sigma = \\sqrt{${ss} \\div ${n}} \\approx ${dp(pop, 2)}`],
    };
  return {
    prompt: fill(W.sampleQ, { n, list: vs.join(", ") }), q: "",
    ...numWith(smp, [trap("populationForSample", pop, { n, m: n - 1 }, 0.0051)], 0.0051),
    steps: [...steps, `s = \\sqrt{${ss} \\div ${n - 1}} \\approx ${dp(smp, 2)}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const n = r.int(5, 9);
  let xs: number[];
  let stat: "mean" | "median" | "mode" | "range" | "sd";
  let v: number;
  if (L === 1) {
    stat = r.pick(["mean", "range"] as const);
    for (;;) {
      xs = Array.from({ length: n - 1 }, () => r.int(1, 20));
      const mean = r.int(5, 15);
      const last = mean * n - xs.reduce((s, x) => s + x, 0);
      if (last >= 1 && last <= 25) {
        xs.push(last);
        break;
      }
    }
  } else if (L === 2) {
    stat = r.pick(["median", "mode"] as const);
    xs = Array.from({ length: n }, () => r.int(1, 30));
    if (stat === "mode") {
      const m = xs[0];
      xs[1] = m;
      xs[2] = m;
      const counts = new Map<number, number>();
      xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
      if ([...counts.entries()].filter(([, c]) => c >= 3).length > 1) return gen(r, L, w);
    }
  } else {
    stat = "sd";
    xs = Array.from({ length: n }, () => r.int(1, 20));
    if (new Set(xs).size === 1) xs[0]++;
  }
  // Shuffle (Fisher–Yates), so a mode or the last value doesn't sit at a fixed place.
  for (let i = xs.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  if (stat === "mean") v = mean;
  else if (stat === "range") v = sorted[n - 1] - sorted[0];
  else if (stat === "median") v = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  else if (stat === "mode") v = [...new Set(sorted)].reduce((best, x) => (sorted.filter((y) => y === x).length > sorted.filter((y) => y === best).length ? x : best), sorted[0]);
  else v = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  return {
    prompt: w.prompts[stat],
    q: xs.join(",\\ "),
    answer: num(v, stat === "sd" ? 0.0051 : 1e-9),
    show: stat === "sd" ? `s \\approx ${dp(v, 2)}` : String(v),
    plain: stat === "sd" ? dp(v, 2) : String(v),
    format: stat === "sd" ? "dp2" : "number",
    solution: { kind: "statistics", spec: { topic: "data", values: xs.join(" "), chart: "dot", bins: 0 } },
  };
};

export default gen;
