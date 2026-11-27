// Practice: Percentages.
// Easy (P5): a percent of a number; also (#707) the percent a hundred grid or a bar cut into parts has shaded, the
// benchmark percents 1 % and over 100 %, and which calculation gives a percent of a number. Medium (P6): a percentage
// change; also what percent one number is of another and the whole from a part, bare or in a story. Hard (P6): the
// price before an increase; also before a discount, and (the new setting) progress bars: a download, a battery, a
// phone's memory. The shaded parts counted as the percent, the white part, 1 % taken as a tenth, only the part over
// 100 %, the percent used as a whole number, the count taken as a percent, the two numbers the wrong way round, the
// percent taken of the part, and the discount taken of the sale price are named.
import { fill } from "../chart";
import { hundredGrid, partsBar, type PercentSolution, percentSteps, progressBar } from "../percentPics";
import { gcd, num, withIdeas } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { opt, pickOf } from "../signedKit";

/** A number without floating dust. */
const n6 = (v: number) => Number(v.toFixed(6));
/** A percent answer: typed as 25 or 25%. */
const pct = (prompt: string, v: number, traps: Trap[], steps: string[], more: Partial<Part> = {}): Part => ({
  prompt, q: "", answer: { ...num(v), traps }, show: `${v}\\%`, plain: `${v}%`, format: "number", steps, ...more,
});
/** A plain number answer. */
const plainNum = (prompt: string, v: number, traps: Trap[], steps: string[], more: Partial<Part> = {}): Part => ({
  prompt, q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps, ...more,
});
/** The slips that differ from the answer and from each other. */
function slips(v: number, list: [Trap["id"], number, Record<string, string | number>][]): Trap[] {
  const out: Trap[] = [];
  for (const [id, x, vars] of list) {
    const t = n6(x);
    if (Number.isFinite(t) && Math.abs(t - v) > 1e-9 && !out.some((o) => o.a.k === "num" && Math.abs(o.a.v - t) < 1e-9)) out.push({ id, a: num(t), vars: { x: t, ...vars } });
  }
  return out;
}
/** A whole and a percent of it that comes out whole: the whole a multiple of 100 ÷ gcd(p, 100). */
function wholeFor(r: Rng, p: number, lo: number, hi: number): number {
  const m = 100 / gcd(p, 100);
  const ks = [];
  for (let k = Math.ceil(lo / m); k * m <= hi; k++) ks.push(k * m);
  return r.pick(ks.length ? ks : [m]);
}

function easy(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.pct;
  if (kind === 1) {
    if (r.next() < 0.5) {
      // A hundred grid: each square is 1 %.
      const n = r.int(3, 97);
      return withIdeas(["perHundred"], pct(W.grid, n, slips(n, [["percentUnshaded", 100 - n, { v: n }]]), [`${n} \\text{ of } 100 = ${n}\\%`], { pic: hundredGrid(n) }));
    }
    // A bar of d equal parts: each part is 100 ÷ d %.
    const d = r.pick([2, 4, 5, 10, 20, 25]);
    const k = r.int(1, d - 1);
    const each = 100 / d;
    const v = k * each;
    const traps = slips(v, [["partsAsPercent", k, { k, d, each, v }], ["percentUnshaded", 100 - v, { v }]]);
    return withIdeas(["perHundred"], pct(W.bar, v, traps, [`100\\% \\div ${d} = ${each}\\%`, `${k} \\times ${each}\\% = ${v}\\%`], { pic: partsBar(d, k) }));
  }
  if (kind === 2) {
    // Benchmarks: 1 % is a hundredth; over 100 % is the whole and some more.
    const p = r.pick([1, 1, 125, 150, 200]);
    if (p === 1) {
      const a = 100 * r.int(2, 15);
      const v = a / 100;
      return withIdeas(["percentOf"], plainNum(fill(w.prompts.percentOf, { p, a }), v, slips(v, [["onePercentTenth", a / 10, { a, v }]]), [`1\\% = ${a} \\div 100 = ${v}`]));
    }
    const a = p === 125 ? 4 * r.int(3, 30) : p === 150 ? 2 * r.int(5, 45) : r.int(6, 90);
    const e = p - 100;
    const extra = (a * e) / 100;
    const v = a + extra;
    return withIdeas(["percentOf"], plainNum(fill(w.prompts.percentOf, { p, a }), v, slips(v, [["overHundredExtra", extra, { e, p, a, v }]]), [`${p}\\% = 100\\% + ${e}\\%`, `= ${a} + ${extra} = ${v}`]));
  }
  // Which calculation gives p % of a: p hundredths of it.
  const p = r.pick([10, 20, 30, 40, 60, 70, 80, 90, 25, 75]);
  const a = 10 * r.int(2, 15);
  const d = String(p / 100);
  const right = opt(r.next() < 0.5 ? `${d} \\times ${a}` : `\\frac{${p}}{100} \\times ${a}`);
  const times = opt(`${p} \\times ${a}`);
  const divide = opt(`${a} \\div ${p}`);
  const other = opt(`${p / 1000} \\times ${a}`);
  return withIdeas(["percentOf"], pickOf(r, fill(w.pct.whichWay, { p, a }), right, [
    { o: times, id: "percentTimesWhole", vars: { p, a, d } },
    { o: divide, id: "divideByPercent", vars: { p, a, d } },
  ], [other], { steps: [`${p}\\% = \\frac{${p}}{100} = ${d}`, `${d} \\times ${a} = ${n6((p * a) / 100)}`] }));
}

/** What percent a is of b: the count, and the two the wrong way round, are slips. */
function whatPercent(prompt: string, a: number, b: number, more: Partial<Part> = {}): Part {
  const v = n6((a / b) * 100);
  const flipped = (b / a) * 100;
  const traps = slips(v, [["countAsPercent", a, { a, b, v }], ...(Number.isInteger(n6(flipped)) ? [["percentFlipped", flipped, { a, b, v }] as [Trap["id"], number, Record<string, number>]] : [])]);
  return withIdeas(["asPercent"], pct(prompt, v, traps, [`${a} \\div ${b} = ${n6(a / b)}`, `${n6(a / b)} \\times 100\\% = ${v}\\%`], more));
}
/** The whole when p % of it is a: the percent taken of the part is the slip. */
function wholeFrom(prompt: string, p: number, a: number, more: Partial<Part> = {}): Part {
  const v = n6((a * 100) / p);
  const step = gcd(p, 100);
  const lines = [`${p}\\% = ${a}`, ...(p === step ? [] : [`${step}\\% = ${a} \\div ${p / step} = ${n6((a * step) / p)}`]), `100\\% = ${100 / step} \\times ${n6((a * step) / p)} = ${v}`];
  return withIdeas(["reversePercent"], plainNum(prompt, v, slips(v, [["percentOfPart", (a * p) / 100, { p, a, v }]]), lines, more));
}

function medium(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.pct;
  const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
  if (kind === 1) {
    const b = wholeFor(r, p, 8, 200);
    const a = (b * p) / 100;
    const story = r.pick([W.whatPercent, W.walk, W.seeds]);
    return whatPercent(fill(story, { a, b }), a, b);
  }
  const whole = wholeFor(r, p, 20, 300);
  const a = (whole * p) / 100;
  return wholeFrom(fill(r.next() < 0.5 ? W.wholeOf : W.team, { p, a }), p, a);
}

function hard(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.pct;
  if (kind === 1) {
    // The price before a discount: the sale price is (100 − p) % of it.
    const p = r.pick([10, 20, 25, 30, 40, 50]);
    const k = 100 - p;
    const before = wholeFor(r, k, 20, 400);
    const a = (before * k) / 100;
    const spec: PercentSolution = { pic: "reverse", p, now: a, up: false };
    const { steps: _, ...part } = plainNum(fill(W.before, { p, a }), before, slips(before, [["percentOfAfter", a + (a * p) / 100, { p, a, k, v: before }]]), []);
    return withIdeas(["reversePercent"], { ...part, solution: { kind: "percent", spec: { ...spec, steps: percentSteps(spec) } } });
  }
  // Progress bars: a download, a battery, a memory filled to p %.
  const t = r.pick(["download", "battery", "storage", "downloadPct"] as const);
  if (t === "downloadPct") {
    const p = r.pick([20, 25, 40, 60, 75, 80, 35, 45, 65]);
    const b = wholeFor(r, p, 100, 2000);
    const a = (b * p) / 100;
    return whatPercent(fill(W.downloadPct, { a, b }), a, b, { pic: progressBar(p, `${a} / ${b} MB`) });
  }
  const p = r.pick([20, 25, 40, 60, 75, 80, 30, 35, 45]);
  const [lo, hi, unit] = t === "download" ? [200, 4000, "MB"] : t === "battery" ? [12, 40, "h"] : [16, 256, "GB"];
  const whole = wholeFor(r, p, lo, hi);
  const a = (whole * p) / 100;
  return wholeFrom(fill(W[t], { p, a }), p, a, { pic: progressBar(p, `${p}% · ${a} ${unit}`) });
}

const gen: Gen = (r, L, w) => {
  // The picture: bars cut into chunks of 10 % (or 5 %, 20 %, 25 %) with each chunk's amount in it, and the working through one chunk.
  const P = (spec: PercentSolution) => ({ kind: "percent" as const, spec: { ...spec, steps: percentSteps(spec) } });
  const kind = r.int(0, L === 1 ? 3 : 2);
  if (kind > 0) return L === 1 ? easy(r, kind, w) : L === 2 ? medium(r, kind, w) : hard(r, kind, w);
  if (L === 1) {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]);
    const a = 20 * r.int(2, 30);
    const v = (p * a) / 100;
    return withIdeas(["percentOf"], { prompt: fill(w.prompts.percentOf, { p, a }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: P({ pic: "of", p, a }) });
  }
  const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
  const a = 20 * r.int(2, 30);
  if (L === 2) {
    const up = r.next() < 0.5;
    const b = (a * (100 + (up ? p : -p))) / 100;
    const v = up ? p : -p;
    return withIdeas(["percentChange"], { prompt: fill(w.prompts.percentChange, { a, b }), q: "", answer: num(v), show: `${v}\\%`, plain: `${v}%`, format: "number", solution: P({ pic: "change", a, b }) });
  }
  const now = (a * (100 + p)) / 100;
  return withIdeas(["reversePercent"], { prompt: fill(w.prompts.percentReverse, { p, a: now }), q: "", answer: num(a), show: String(a), plain: String(a), format: "number", solution: P({ pic: "reverse", p, now, up: true }) });
};

export default gen;
