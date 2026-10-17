// Bar charts: how many of each fruit, a bar for each, against a scale up the side. Easy: a scale in ones up to 10;
// medium: in twos up to 20 (an odd number ends half-way between two lines) or in fives up to 50; hard: in tens up to
// 100 or in twenties up to 200, half-way between lines too. The board's game gives the numbers and has the bars raised
// to them; the practice question draws the chart and asks how many, how many more, or how many altogether. Counting
// the lines instead of reading the scale, and the bigger number given for "how many more", are the slips named.
import { withSteps } from "./angleGuess";
import { rng } from "./random";

export type ChartLevel = 1 | 2 | 3;
export const FRUIT = ["🍎", "🍌", "🍇", "🍊", "🍓", "🍐"];
/** A chart: what one line of the scale is worth, the step a bar moves by, and each fruit with how many there are. */
export type ChartTask = { level: ChartLevel; step: number; grain: number; items: { icon: string; v: number }[] };
/** The scale has ten lines above 0. */
export const LINES = 10;
export const chartTop = (t: Pick<ChartTask, "step">) => LINES * t.step;

export function chartTask(level: ChartLevel, next: () => number): ChartTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const [step, grain] = level === 1 ? [1, 1] : level === 2 ? ([[2, 1], [5, 5]] as const)[int(0, 1)] : ([[10, 5], [20, 10]] as const)[int(0, 1)];
  const n = level === 1 ? 4 : 5;
  const icons = [...FRUIT];
  for (let i = icons.length - 1; i > 0; i--) {
    const j = int(0, i);
    [icons[i], icons[j]] = [icons[j], icons[i]];
  }
  for (;;) {
    const vs = Array.from({ length: n }, () => grain * int(1, (LINES * step) / grain));
    // Sometimes a fruit there is none of, past the easy level: a bar of 0.
    if (level > 1 && next() < 0.25) vs[int(0, n - 1)] = 0;
    if (new Set(vs).size < n) continue;
    // Past the easy level a scale in twos, tens or twenties has a bar ending between two lines.
    if (grain < step && vs.every((v) => v % step === 0)) continue;
    return { level, step, grain, items: vs.map((v, i) => ({ icon: icons[i], v })) };
  }
}

// ---------- pictures ----------

const INK = "#1e1e1e";
const LEFT = 46;
const TOP = 14;
const BOTTOM = 44;
const COL = 72;
const BAR = 46;
/** Where things go on a chart drawn with lines `gap` apart: the columns' middles, the foot of the bars and the height of a value. */
export function chartGeom(t: ChartTask, gap: number) {
  const foot = TOP + LINES * gap;
  return {
    w: LEFT + t.items.length * COL + 10,
    h: foot + BOTTOM,
    foot,
    mid: (k: number) => LEFT + COL * k + COL / 2,
    y: (v: number) => foot - (v / t.step) * gap,
    /** The value at a height of the picture, to the bar's step, within the scale. */
    valueAt: (py: number) => Math.max(0, Math.min(chartTop(t), Math.round(((foot - py) / gap) * (t.step / t.grain)) * t.grain)),
    /** The column under an x of the picture, or −1. */
    colAt: (px: number) => {
      const k = Math.floor((px - LEFT) / COL);
      return k >= 0 && k < t.items.length ? k : -1;
    },
  };
}

/**
 * A chart: the lines of the scale numbered up the side, a bar for each fruit with the fruit beneath. `bars` are the
 * heights drawn (the chart's own when not given), `wrong` the bars drawn orange with a dashed mark where they should
 * reach, `done` all green, `marked` bars outlined with their value above them (the worked solution).
 */
export function chartSvg(t: ChartTask, o: { bars?: number[]; wrong?: number[]; done?: boolean; marked?: number[]; gap?: number } = {}): { body: string; w: number; h: number } {
  const gap = o.gap ?? 28;
  const G = chartGeom(t, gap);
  let body = "";
  for (let k = 0; k <= LINES; k++) {
    const y = G.foot - k * gap;
    body += `<line x1="${LEFT}" y1="${y}" x2="${G.w - 10}" y2="${y}" stroke="${k ? "#dee2e6" : INK}" stroke-width="${k ? 1 : 2}"/>`;
    body += `<text x="${LEFT - 8}" y="${y + 4}" font-size="13" text-anchor="end" fill="#495057">${k * t.step}</text>`;
  }
  body += `<line x1="${LEFT}" y1="${TOP - 6}" x2="${LEFT}" y2="${G.foot}" stroke="${INK}" stroke-width="2"/>`;
  t.items.forEach((it, k) => {
    const v = o.bars?.[k] ?? it.v;
    const x = G.mid(k) - BAR / 2;
    const wrong = o.wrong?.includes(k);
    const [fill, stroke] = o.done ? ["#b2f2bb", "#2f9e44"] : wrong ? ["#ffd8a8", "#e8590c"] : ["#a5d8ff", "#1971c2"];
    const marked = o.marked?.includes(k);
    if (v > 0) body += `<rect x="${x}" y="${G.y(v)}" width="${BAR}" height="${G.foot - G.y(v)}" fill="${fill}" stroke="${stroke}" stroke-width="${marked ? 3.5 : 2}"/>`;
    if (wrong) body += `<line x1="${x - 6}" y1="${G.y(it.v)}" x2="${x + BAR + 6}" y2="${G.y(it.v)}" stroke="#2f9e44" stroke-width="3" stroke-dasharray="6 4"/>`;
    if (marked) body += `<text x="${G.mid(k)}" y="${G.y(v) - 7}" font-size="15" font-weight="700" text-anchor="middle" fill="${stroke}">${v}</text>`;
    body += `<text x="${G.mid(k)}" y="${G.foot + 30}" font-size="24" text-anchor="middle">${it.icon}</text>`;
  });
  return { body, w: G.w, h: G.h };
}

// ---------- the practice question ----------

export type ChartAsk = "one" | "more" | "total";
/** A question about a chart: the fruit asked about (the bigger one first), and the answer. */
export type ChartQuestion = { task: ChartTask; ask: ChartAsk; at: number[]; v: number };

/** How many (easy, medium), how many more (every level) or how many altogether (hard), never of a fruit there is none of. */
export function chartQuestion(level: ChartLevel, next: () => number): ChartQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const task = chartTask(level, next);
  const asks: ChartAsk[] = level === 3 ? ["more", "total"] : ["one", "more"];
  const ask = asks[int(0, 1)];
  const some = task.items.flatMap((it, k) => (it.v > 0 ? [k] : []));
  const a = some[int(0, some.length - 1)];
  if (ask === "one") return { task, ask, at: [a], v: task.items[a].v };
  const rest = some.filter((k) => k !== a);
  const b = rest[int(0, rest.length - 1)];
  const [hi, lo] = task.items[a].v > task.items[b].v ? [a, b] : [b, a];
  const [x, y] = [task.items[hi].v, task.items[lo].v];
  return { task, ask, at: [hi, lo], v: ask === "more" ? x - y : x + y };
}
export type ChartMistake = "countedLines" | "notDifference";
/** The answers the slips give: the lines counted instead of the scale read, and the bigger number for "how many more". */
export function chartTraps(q: ChartQuestion): { id: ChartMistake; v: number; vars: Record<string, string | number> }[] {
  const out: { id: ChartMistake; v: number; vars: Record<string, string | number> }[] = [];
  const [a, b] = q.at.map((k) => q.task.items[k].v);
  if (q.task.step > 1) out.push({ id: "countedLines", v: q.v / q.task.step, vars: { s: q.task.step, v: q.v } });
  if (q.ask === "more") out.push({ id: "notDifference", v: a, vars: { a, b, v: q.v } });
  return out.filter((x) => x.v !== q.v);
}
const dec = (v: number) => String(Math.round(v * 10) / 10);
/** The working: the lines the bar reaches times what each is worth, then the difference or the sum. */
export function chartSteps(q: ChartQuestion): string[] {
  const { step } = q.task;
  const vs = q.at.map((k) => q.task.items[k].v);
  const read = step === 1 ? [] : vs.map((v) => `${dec(v / step)} \\times ${step} = ${v}`);
  if (q.ask === "one") return read.length ? read : [String(q.v)];
  return [...read, `${vs[0]} ${q.ask === "more" ? "-" : "+"} ${vs[1]} = ${q.v}`];
}

// ---------- the board's game ----------

export const CHART_LADDER: { level: ChartLevel; seed: number }[] = [
  { level: 1, seed: 931 },
  { level: 1, seed: 932 },
  { level: 1, seed: 933 },
  { level: 2, seed: 941 },
  { level: 2, seed: 942 },
  { level: 2, seed: 943 },
  { level: 3, seed: 951 },
  { level: 3, seed: 952 },
  { level: 3, seed: 953 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const chartStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** The bars that aren't at their number yet. */
export const wrongBars = (t: ChartTask, bars: number[]) => t.items.flatMap((it, k) => ((bars[k] ?? 0) !== it.v ? [k] : []));
/** A bar raised to its number of lines, as if each line were worth 1: the slip of a scale not read. */
export const linesCounted = (t: ChartTask, bars: number[]) => (t.step > 1 ? t.items.findIndex((it, k) => it.v > 0 && bars[k] === it.v * t.step) : -1);
export type ChartNotice = "zero" | "bigScale" | "halfway" | "streak10";
export const CHART_NOTICES: ChartNotice[] = ["zero", "bigScale", "halfway", "streak10"];
/** What a chart made right first time shows: a bar of 0, a scale in tens or more, a bar between two lines; ten in a row. */
export function chartNotice(t: ChartTask, misses: number, streak: number): ChartNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.items.some((it) => it.v === 0)) return "zero";
  if (t.step >= 10) return "bigScale";
  if (t.items.some((it) => it.v % t.step !== 0)) return "halfway";
  return null;
}
export type LiveBarChart = {
  mode: "puzzle" | "endless";
  stage: number;
  level: ChartLevel;
  seed: number;
  /** The heights the bars are at, the ones found wrong at the last check, and whether the chart is right. */
  bars: number[];
  wrong: number[];
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: ChartNotice } | { kind: "wrong"; lines: number } | null;
};
export const chartNow = (d: Pick<LiveBarChart, "mode" | "stage" | "level" | "seed">): ChartTask =>
  d.mode === "puzzle" ? chartTask(CHART_LADDER[d.stage].level, rng(CHART_LADDER[d.stage].seed)) : chartTask(d.level, rng(d.seed));

/** The worked solution: the chart with the bars asked about outlined and their numbers above them, and the working beneath. */
export type ChartSolution = { q: ChartQuestion };
export function renderChart(spec: ChartSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(chartSvg(spec.q.task, { marked: spec.q.at, gap: 22 }), steps);
}
