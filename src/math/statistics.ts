// Probability and statistics pictures: data summaries with box plots, scatter plots with the line
// of best fit, simulated experiments (law of large numbers), probability trees with Bayes,
// binomial / Poisson / normal distributions, and the central limit theorem.
// Simulations use a seeded generator so a picture on the board re-renders identically.
import { Frac } from "./fraction";
import { latexToSvg, type RenderedSvg } from "./latex";
import { niceStep } from "./plot";
import {
  axes,
  BODY_H,
  C,
  clampInt,
  compose,
  curve,
  dot,
  esc,
  fill,
  FONT,
  hline,
  lbl,
  legend,
  makeFrame,
  nt,
  PLOT,
  r2,
  tn,
  vline,
  type Caption,
  type Frame,
} from "./chart";

export type Experiment = "coin" | "die" | "twoDice";
export type DistKind = "binomial" | "poisson" | "normal";
export type CltSource = "die" | "coin" | "skewed";
export const EXPERIMENTS: Experiment[] = ["coin", "die", "twoDice"];
export const DIST_KINDS: DistKind[] = ["binomial", "poisson", "normal"];
export const CLT_SOURCES: CltSource[] = ["die", "coin", "skewed"];

export type DataSpec = { topic: "data"; values: string; chart: "dot" | "hist"; bins: number };
export type ScatterSpec = { topic: "scatter"; points: string; line: boolean; residuals: boolean };
export type ChanceSpec = { topic: "chance"; experiment: Experiment; trials: number; seed: number };
export type TreeSpec = { topic: "tree"; pA: string; pBA: string; pBnotA: string; nameA: string; nameB: string };
export type DistSpec = { topic: "dist"; kind: DistKind; n: number; p: string; lambda: string; mu: string; sigma: string; lo: string; hi: string };
export type CltSpec = { topic: "clt"; source: CltSource; n: number; samples: number; seed: number };
export type StatSpec = DataSpec | ScatterSpec | ChanceSpec | TreeSpec | DistSpec | CltSpec;
export type StatTopic = StatSpec["topic"];
export type StatSpecOf<K extends StatTopic> = Extract<StatSpec, { topic: K }>;

export const STAT_TOPICS: StatTopic[] = ["data", "scatter", "chance", "tree", "dist", "clt"];

/** Sentences for the pictures in the UI language; {name} placeholders are filled in here. */
export type StatWords = {
  mean: string;
  median: string;
  mode: string;
  noMode: string;
  range: string;
  iqr: string;
  sd: string;
  outliers: string;
  none: string;
  badData: string;
  badPoints: string;
  badProb: string;
  badNumber: string;
  strong: string;
  moderate: string;
  weak: string;
  positive: string;
  negative: string;
  corr: string;
  noCorr: string;
  fitHint: string;
  coinHeads: string;
  coinTails: string;
  events: Record<Experiment, string>;
  chanceResult: string;
  lln: string;
  observed: string;
  theory: string;
  treeHint: string;
  not: string;
  shaded: string;
  zScores: string;
  clt: string;
  population: string;
  sampleMeans: string;
};

/** Presets. Tree presets carry a `names` key; the dialog fills in names in the UI language. */
export const STAT_PRESETS: { [K in StatTopic]: (StatSpecOf<K> & { names?: string })[] } = {
  data: [
    { topic: "data", values: "12 15 15 16 18 19 19 19 21 22 24 38", chart: "dot", bins: 0 },
    { topic: "data", values: "36 37 37 38 38 38 39 39 39 39 40 40 41 42 42 44", chart: "dot", bins: 0 },
    {
      topic: "data",
      values: "152 158 161 163 164 165 166 167 168 168 169 170 171 171 172 173 174 175 176 178 179 181 184 189",
      chart: "hist",
      bins: 0,
    },
    { topic: "data", values: "1 1 1 2 2 2 2 3 3 3 4 4 5 6 7 9 12 15", chart: "hist", bins: 0 },
  ],
  scatter: [
    { topic: "scatter", points: "1, 52; 2, 55; 3, 61; 4, 60; 5, 68; 6, 72; 7, 75; 8, 83", line: true, residuals: false },
    { topic: "scatter", points: "0, 95; 5, 84; 10, 70; 15, 58; 20, 41; 25, 33; 30, 18", line: true, residuals: true },
    { topic: "scatter", points: "150, 38; 155, 36; 160, 41; 165, 37; 170, 43; 175, 40; 180, 44; 185, 42", line: true, residuals: false },
    { topic: "scatter", points: "1, 7; 2, 3; 3, 8; 4, 5; 5, 2; 6, 9; 7, 4; 8, 6", line: true, residuals: false },
  ],
  chance: [
    { topic: "chance", experiment: "coin", trials: 100, seed: 1 },
    { topic: "chance", experiment: "die", trials: 600, seed: 7 },
    { topic: "chance", experiment: "twoDice", trials: 3600, seed: 3 },
  ],
  tree: [
    { topic: "tree", pA: "3/10", pBA: "2/9", pBnotA: "3/9", nameA: "", nameB: "", names: "marbles" },
    { topic: "tree", pA: "0.01", pBA: "0.95", pBnotA: "0.05", nameA: "", nameB: "", names: "test" },
    { topic: "tree", pA: "1/4", pBA: "3/5", pBnotA: "1/5", nameA: "", nameB: "", names: "rain" },
  ],
  dist: [
    { topic: "dist", kind: "binomial", n: 10, p: "0.5", lambda: "3", mu: "0", sigma: "1", lo: "3", hi: "6" },
    { topic: "dist", kind: "binomial", n: 20, p: "0.3", lambda: "3", mu: "0", sigma: "1", lo: "", hi: "4" },
    { topic: "dist", kind: "poisson", n: 10, p: "0.5", lambda: "3", mu: "0", sigma: "1", lo: "2", hi: "2" },
    { topic: "dist", kind: "normal", n: 10, p: "0.5", lambda: "3", mu: "0", sigma: "1", lo: "-1", hi: "1" },
    { topic: "dist", kind: "normal", n: 10, p: "0.5", lambda: "3", mu: "100", sigma: "15", lo: "130", hi: "" },
    { topic: "dist", kind: "normal", n: 10, p: "0.5", lambda: "3", mu: "170", sigma: "8", lo: "160", hi: "180" },
  ],
  clt: [
    { topic: "clt", source: "die", n: 1, samples: 2000, seed: 5 },
    { topic: "clt", source: "die", n: 2, samples: 2000, seed: 5 },
    { topic: "clt", source: "die", n: 10, samples: 2000, seed: 5 },
    { topic: "clt", source: "skewed", n: 30, samples: 2000, seed: 5 },
    { topic: "clt", source: "coin", n: 20, samples: 2000, seed: 5 },
  ],
};

// ---------- helpers ----------

/** Deterministic PRNG (mulberry32): the same seed always draws the same numbers. */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All numbers in a string, separated by spaces, commas, semicolons or new lines. */
function numbers(s: string): number[] | null {
  const parts = s.replace(/[()]/g, " ").split(/[\s,;]+/).filter(Boolean);
  const v = parts.map(Number);
  return v.every(Number.isFinite) ? v : null;
}

const median = (a: number[]) => {
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/** A LaTeX snippet placed inside the picture (centred vertically on y). */
function texAt(tex: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle", scale = 1, color?: string) {
  const r = latexToSvg(tex, color);
  const w = r.width * scale;
  const h = r.height * scale;
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
  const svg = r.svg
    .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
    .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
    .replace(/^<svg/, `<svg x="${r2(x0)}" y="${r2(y - h / 2)}"`);
  return { svg: `<rect x="${r2(x0 - 2)}" y="${r2(y - h / 2 - 1)}" width="${r2(w + 4)}" height="${r2(h + 2)}" fill="#ffffff" opacity="0.85"/>${svg}`, w };
}

const bar = (f: Frame, x0: number, x1: number, y: number, fillColor: string, stroke: string, strokeWidth = 1) => {
  const [a, b, yt, yb] = [f.sx(x0), f.sx(x1), f.sy(Math.max(y, 0)), f.sy(Math.min(y, 0))];
  return `<rect x="${r2(a)}" y="${r2(yt)}" width="${r2(b - a)}" height="${r2(Math.max(0, yb - yt))}" fill="${fillColor}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
};

// ---------- data: dot plot / histogram + box plot ----------

function renderData(s: DataSpec, w: StatWords): RenderedSvg {
  const v = numbers(s.values);
  if (!v || v.length < 2) throw new Error(w.badData);
  const xs = [...v].sort((a, b) => a - b);
  const n = xs.length;
  const sum = xs.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const med = median(xs);
  const q1 = median(xs.slice(0, n >> 1));
  const q3 = median(xs.slice((n + 1) >> 1));
  const iqr = q3 - q1;
  const ss = xs.reduce((a, x) => a + (x - mean) ** 2, 0);
  const sigma = Math.sqrt(ss / n);
  const sd = Math.sqrt(ss / (n - 1));
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const top = Math.max(...counts.values());
  const modes = top > 1 ? [...counts].filter(([, c]) => c === top).map(([x]) => x) : [];
  const [lf, uf] = [q1 - 1.5 * iqr, q3 + 1.5 * iqr];
  const outliers = xs.filter((x) => x < lf || x > uf);
  const inner = xs.filter((x) => x >= lf && x <= uf);

  const span = xs[n - 1] - xs[0] || 1;
  let x0 = xs[0] - span * 0.06;
  let x1 = xs[n - 1] + span * 0.06;

  // Histogram bins: a nice width, [a, b) intervals.
  const k = s.bins > 0 ? clampInt(s.bins, 2, 30) : Math.min(15, Math.max(4, Math.ceil(Math.sqrt(n))));
  const bw = s.bins > 0 ? span / k : niceStep(span, k);
  const start = s.bins > 0 ? xs[0] : Math.floor(xs[0] / bw) * bw;
  const nb = s.bins > 0 ? k : Math.floor((xs[n - 1] - start) / bw + 1e-9) + 1;
  const hist = Array<number>(nb).fill(0);
  for (const x of xs) hist[Math.min(nb - 1, Math.floor((x - start) / bw + 1e-9))]++;
  if (s.chart === "hist") {
    x0 = Math.min(x0, start - bw * 0.2);
    x1 = Math.max(x1, start + nb * bw + bw * 0.2);
  }

  const parts: string[] = [];
  const ft = makeFrame("dt", PLOT.left, PLOT.top, PLOT.w, 246, [x0, x1], s.chart === "hist" ? [0, Math.max(...hist) * 1.45] : [0, Math.max(top, 5) + 2.4]);
  if (s.chart === "hist") {
    const edges = Array.from({ length: nb + 1 }, (_, i) => start + i * bw);
    parts.push(axes(ft, { xAtBottom: true, xTicks: nb <= 16 ? edges.map((e) => ({ v: e, label: nt(e, 2) })) : undefined }));
    hist.forEach((c, i) => {
      parts.push(bar(ft, edges[i], edges[i + 1], c, "#a5d8ff", C.blue));
      if (c) parts.push(lbl(ft.sx(edges[i] + bw / 2), ft.sy(c) - 5, String(c), C.ink, "middle", 12, false));
    });
  } else {
    parts.push(axes(ft, { xAtBottom: true, yAxis: false }));
    const step = ft.sy(0) - ft.sy(1);
    const rad = Math.max(2.5, Math.min(8, step * 0.42, (ft.sx(x0 + span / 40) - ft.sx(x0)) * 1.2 + 2));
    for (const [x, c] of counts) for (let j = 0; j < c; j++) parts.push(dot(ft.sx(x), ft.sy(j + 0.5), outliers.includes(x) ? C.red : C.blue, r2(rad)));
  }
  parts.push(
    vline(ft, mean, C.red, `stroke-width="2" stroke-dasharray="7 4"`),
    vline(ft, med, C.green, `stroke-width="2" stroke-dasharray="3 3"`),
    legend(ft, [
      { text: `${w.mean} x̄ = ${nt(mean, 2)}`, color: C.red, dash: true },
      { text: `${w.median} = ${nt(med, 2)}`, color: C.green, dash: true },
    ]),
  );

  // Box plot on the same scale.
  const fb = makeFrame("db", PLOT.left, PLOT.top + 272, PLOT.w, 106, [x0, x1], [0, 1]);
  const [yc, hh] = [fb.sy(0.5), 26];
  const X = (x: number) => r2(fb.sx(x));
  parts.push(
    axes(fb, { xAtBottom: true, yAxis: false }),
    `<g stroke="${C.ink}" stroke-width="1.8">` +
      `<line x1="${X(inner[0])}" y1="${yc}" x2="${X(q1)}" y2="${yc}"/><line x1="${X(q3)}" y1="${yc}" x2="${X(inner[inner.length - 1])}" y2="${yc}"/>` +
      `<line x1="${X(inner[0])}" y1="${yc - 12}" x2="${X(inner[0])}" y2="${yc + 12}"/><line x1="${X(inner[inner.length - 1])}" y1="${yc - 12}" x2="${X(inner[inner.length - 1])}" y2="${yc + 12}"/>` +
      `<rect x="${X(q1)}" y="${yc - hh}" width="${r2(fb.sx(q3) - fb.sx(q1))}" height="${hh * 2}" fill="#d0ebff"/>` +
      `</g>`,
    `<line x1="${X(med)}" y1="${yc - hh}" x2="${X(med)}" y2="${yc + hh}" stroke="${C.green}" stroke-width="3"/>`,
    `<path d="M${X(mean)},${r2(yc - 7)} l7,7 l-7,7 l-7,-7z" fill="${C.red}"/>`,
    ...outliers.map((x) => dot(fb.sx(x), yc, C.red, 4.5, true)),
    lbl(fb.sx(q1), yc - hh - 6, "Q₁", C.ink, "middle", 12),
    lbl(fb.sx(q3), yc - hh - 6, "Q₃", C.ink, "middle", 12),
  );

  const fmt = (x: number) => nt(x, 2);
  const tex =
    `n = ${n} \\qquad \\bar{x} = \\frac{\\sum x}{n} = \\frac{${tn(sum, 2)}}{${n}} = ${tn(mean, 2)}` +
    ` \\qquad \\sigma = \\sqrt{\\frac{\\sum (x - \\bar{x})^2}{n}} = ${tn(sigma, 2)}`;
  const captions: Caption[] = [
    {
      text: `${w.mean} ${fmt(mean)} · ${w.median} ${fmt(med)} · ${w.mode} ${modes.length ? modes.map(fmt).join(", ") : w.noMode} · ${w.range} ${fmt(xs[n - 1] - xs[0])}`,
    },
    { text: `Q₁ = ${fmt(q1)} · Q₃ = ${fmt(q3)} · ${w.iqr} ${fmt(iqr)} · ${w.sd}: σ = ${fmt(sigma)}, s = ${fmt(sd)}` },
    { text: `${w.outliers}: ${outliers.length ? outliers.map(fmt).join(", ") : w.none}`, color: outliers.length ? C.red : C.grey },
  ];
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- scatter plot + least squares ----------

function renderScatter(s: ScatterSpec, w: StatWords): RenderedSvg {
  const v = numbers(s.points);
  if (!v || v.length < 6 || v.length % 2) throw new Error(w.badPoints);
  const pts = Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]] as [number, number]);
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[1], 0) / n;
  let [sxx, syy, sxy] = [0, 0, 0];
  for (const [x, y] of pts) (sxx += (x - mx) ** 2), (syy += (y - my) ** 2), (sxy += (x - mx) * (y - my));
  if (sxx === 0) throw new Error(w.badPoints);
  const b = sxy / sxx;
  const a = my - b * mx;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);

  const xsAll = pts.map((p) => p[0]);
  const ysAll = pts.map((p) => p[1]);
  const pad = (lo: number, hi: number): [number, number] => {
    const d = hi - lo || 1;
    return [lo - d * 0.1, hi + d * 0.1];
  };
  const f = makeFrame("sc", PLOT.left, PLOT.top, PLOT.w, PLOT.h, pad(Math.min(...xsAll), Math.max(...xsAll)), pad(Math.min(...ysAll), Math.max(...ysAll)));
  const parts = [axes(f, { xAtBottom: true })];
  const yhat = (x: number) => a + b * x;
  if (s.residuals)
    for (const [x, y] of pts)
      parts.push(`<line x1="${r2(f.sx(x))}" y1="${r2(f.sy(y))}" x2="${r2(f.sx(x))}" y2="${r2(f.sy(yhat(x)))}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
  if (s.line) {
    parts.push(curve(f, yhat, C.orange, 2.4, "", f.x0, f.x1, 2));
    const [px, py] = [f.sx(mx), f.sy(my)];
    parts.push(`<path d="M${r2(px - 7)},${r2(py - 7)}L${r2(px + 7)},${r2(py + 7)}M${r2(px - 7)},${r2(py + 7)}L${r2(px + 7)},${r2(py - 7)}" stroke="${C.ink}" stroke-width="2.4"/>`, lbl(px + 10, py + 18, "(x̄, ȳ)", C.ink));
  }
  for (const [x, y] of pts) parts.push(dot(f.sx(x), f.sy(y), C.blue, 5));

  const abs = Math.abs(r);
  const strength = abs >= 0.7 ? w.strong : abs >= 0.4 ? w.moderate : w.weak;
  const corrText = abs < 0.2 ? fill(w.noCorr, { r: nt(r, 3) }) : fill(w.corr, { strength, direction: r > 0 ? w.positive : w.negative, r: nt(r, 3) });
  const tex =
    `\\hat{y} = ${tn(a, 3)} ${b < 0 ? "-" : "+"} ${tn(Math.abs(b), 3)}\\,x \\qquad r = \\frac{S_{xy}}{\\sqrt{S_{xx} S_{yy}}} = ${tn(r, 3)} \\qquad r^2 = ${tn(r * r, 3)}`;
  const captions: Caption[] = [{ text: corrText, color: abs < 0.2 ? C.grey : r > 0 ? C.green : C.red }];
  if (s.line) captions.push({ text: w.fitHint });
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- chance: simulate an experiment ----------

type Outcome = { label: string; p: Frac };

function outcomesOf(e: Experiment, w: StatWords): { outcomes: Outcome[]; event: number; draw: (r: () => number) => number } {
  if (e === "coin")
    return { outcomes: [{ label: w.coinHeads, p: new Frac(1, 2) }, { label: w.coinTails, p: new Frac(1, 2) }], event: 0, draw: (r) => (r() < 0.5 ? 0 : 1) };
  if (e === "die")
    return {
      outcomes: Array.from({ length: 6 }, (_, i) => ({ label: String(i + 1), p: new Frac(1, 6) })),
      event: 5,
      draw: (r) => Math.floor(r() * 6),
    };
  return {
    outcomes: Array.from({ length: 11 }, (_, i) => ({ label: String(i + 2), p: new Frac(6 - Math.abs(i + 2 - 7), 36) })),
    event: 5, // sum 7
    draw: (r) => Math.floor(r() * 6) + Math.floor(r() * 6),
  };
}

function renderChance(s: ChanceSpec, w: StatWords): RenderedSvg {
  const { outcomes, event, draw } = outcomesOf(s.experiment, w);
  const trials = clampInt(s.trials, 1, 100000);
  const r = rng(s.seed);
  const counts = Array<number>(outcomes.length).fill(0);
  const running: number[] = [];
  let hits = 0;
  for (let t = 1; t <= trials; t++) {
    const o = draw(r);
    counts[o]++;
    if (o === event) hits++;
    running.push(hits / t);
  }
  const p = outcomes[event].p.toNumber();

  // Top: observed relative frequency of every outcome against the theory.
  const k = outcomes.length;
  const maxP = Math.max(...counts.map((c) => c / trials), ...outcomes.map((o) => o.p.toNumber()));
  const ft = makeFrame("ct", PLOT.left, PLOT.top, PLOT.w, 168, [-0.6, k - 0.4], [0, maxP * 1.5]);
  const parts = [axes(ft, { xAtBottom: true, xTicks: outcomes.map((o, i) => ({ v: i, label: o.label })) })];
  outcomes.forEach((o, i) => {
    const hit = i === event;
    parts.push(bar(ft, i - 0.35, i + 0.35, counts[i] / trials, hit ? "#ffd8a8" : "#a5d8ff", hit ? C.orange : C.blue));
    const y = r2(ft.sy(o.p.toNumber()));
    parts.push(`<line x1="${r2(ft.sx(i - 0.45))}" y1="${y}" x2="${r2(ft.sx(i + 0.45))}" y2="${y}" stroke="${C.ink}" stroke-width="2.4"/>`);
  });
  parts.push(
    legend({ ...ft, left: ft.right - 150 }, [
      { text: w.observed, color: C.blue },
      { text: w.theory, color: C.ink },
    ]),
  );

  // Bottom: running relative frequency of the event on a log scale of trials.
  const L = Math.max(1, Math.log10(trials));
  const fr = makeFrame("cr", PLOT.left, PLOT.top + 196, PLOT.w, PLOT.h - 196, [0, L], [0, Math.min(1, Math.max(p * 2.2, ...running.slice(Math.min(9, trials - 1))) + 0.05)]);
  const ticks = Array.from({ length: Math.floor(L) + 1 }, (_, i) => ({ v: i, label: String(10 ** i) }));
  parts.push(axes(fr, { xTicks: ticks, xAtBottom: true }), hline(fr, p, C.green, `stroke-width="2" stroke-dasharray="7 4"`), lbl(fr.right - 6, fr.sy(p) - 6, `p = ${nt(p)}`, C.green, "end"));
  const pts: string[] = [];
  let last = 0;
  for (let i = 0; i <= 800; i++) {
    const t = Math.max(1, Math.round(10 ** ((L * i) / 800)));
    if (t === last || t > trials) continue;
    last = t;
    pts.push(`${r2(fr.sx(Math.log10(t)))},${r2(fr.sy(running[t - 1]))}`);
  }
  parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${C.orange}" stroke-width="2.2" stroke-linejoin="round"/>`);

  const tex = `p = ${outcomes[event].p.tex()} \\approx ${tn(p)} \\qquad \\frac{k}{n} = \\frac{${hits}}{${trials}} = ${tn(hits / trials)}`;
  const captions: Caption[] = [
    { text: fill(w.chanceResult, { event: w.events[s.experiment], k: hits, n: trials, f: nt(hits / trials) }), color: C.orange },
    { text: w.lln },
  ];
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- probability tree ----------

function prob(s: string, w: StatWords): { f: Frac; dec: boolean } {
  const f = Frac.parse(s);
  if (!f || f.isNeg() || f.toNumber() > 1) throw new Error(w.badProb);
  return { f, dec: s.includes(".") || s.includes(",") };
}

const clip = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function renderTree(s: TreeSpec, w: StatWords): RenderedSvg {
  const A = prob(s.pA, w);
  const BA = prob(s.pBA, w);
  const BnA = prob(s.pBnotA, w);
  const dec = A.dec || BA.dec || BnA.dec;
  const pt = (f: Frac) => (dec ? tn(f.toNumber()) : f.tex());
  const one = Frac.ONE;
  const pA = A.f;
  const pnA = one.sub(pA);
  const pBA = BA.f;
  const pnBA = one.sub(pBA);
  const pBnA = BnA.f;
  const pnBnA = one.sub(pBnA);

  const nameA = clip(s.nameA.trim() || "A");
  const nameB = clip(s.nameB.trim() || "B");
  const not = (x: string) => (x.length === 1 ? x + "′" : clip(fill(w.not, { x })));

  const H = 330;
  const parts: string[] = [];
  const box = (x: number, y: number, text: string, color: string, fillColor: string) => {
    const bw = Math.max(34, text.length * 7.8 + 18);
    parts.push(
      `<rect x="${r2(x - bw / 2)}" y="${y - 15}" width="${r2(bw)}" height="30" rx="8" fill="${fillColor}" stroke="${color}" stroke-width="1.6"/>`,
      `<text x="${x}" y="${y + 5}" text-anchor="middle" ${FONT} font-size="14" font-weight="600" fill="${C.ink}">${esc(text)}</text>`,
    );
    return bw;
  };
  const branch = (x0: number, y0: number, x1: number, y1: number, p: Frac, above: boolean) => {
    parts.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${C.grey}" stroke-width="2"/>`);
    const t = texAt(pt(p), (x0 + x1) / 2, (y0 + y1) / 2 + (above ? -16 : 16), "middle", 0.9, C.blue);
    parts.push(t.svg);
  };

  const root = { x: 24, y: H / 2 };
  const l1 = [
    { y: 88, name: nameA, p: pA },
    { y: 242, name: not(nameA), p: pnA },
  ];
  const leafX = 372;
  const l1x = 196;
  parts.push(`<circle cx="${root.x}" cy="${root.y}" r="5" fill="${C.ink}"/>`);
  const leaves = [
    { y: 40, parent: 0, name: nameB, p: pBA, isB: true },
    { y: 136, parent: 0, name: not(nameB), p: pnBA, isB: false },
    { y: 194, parent: 1, name: nameB, p: pBnA, isB: true },
    { y: 290, parent: 1, name: not(nameB), p: pnBnA, isB: false },
  ];
  // Branch lines first (under the boxes), then boxes and products.
  const l1w = l1.map((n) => Math.max(34, n.name.length * 7.8 + 18));
  l1.forEach((n, i) => branch(root.x + 5, root.y, l1x - l1w[i] / 2, n.y, n.p, i === 0));
  leaves.forEach((lf) => {
    const lw = Math.max(34, lf.name.length * 7.8 + 18);
    branch(l1x + l1w[lf.parent] / 2, l1[lf.parent].y, leafX - lw / 2, lf.y, lf.p, lf.y < l1[lf.parent].y);
  });
  l1.forEach((n) => box(l1x, n.y, n.name, C.ink, "#f1f3f5"));
  let pB = Frac.ZERO;
  const products: Frac[] = [];
  leaves.forEach((lf) => {
    const bw = box(leafX, lf.y, lf.name, lf.isB ? C.orange : C.ink, lf.isB ? "#fff4e6" : "#f1f3f5");
    const prod = l1[lf.parent].p.mul(lf.p);
    products.push(prod);
    if (lf.isB) pB = pB.add(prod);
    const t = texAt(`${pt(l1[lf.parent].p)} \\cdot ${pt(lf.p)} = ${pt(prod)}`, leafX + Math.max(bw / 2, 60) + 14, lf.y, "start", 0.9, lf.isB ? C.orange : C.ink);
    parts.push(t.svg);
  });

  const pAB = products[0];
  let tex =
    `\\begin{gathered} P(B) = P(A)\\,P(B \\mid A) + P(A')\\,P(B \\mid A') = ${pt(pA)} \\cdot ${pt(pBA)} + ${pt(pnA)} \\cdot ${pt(pBnA)} = ${pt(pB)}`;
  if (!pB.isZero()) {
    const bayes = pAB.div(pB);
    tex += ` \\\\ P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{${pt(pAB)}}{${pt(pB)}} = ${pt(bayes)}` + (dec ? "" : ` \\approx ${tn(bayes.toNumber())}`);
  }
  tex += ` \\end{gathered}`;
  const captions: Caption[] = [];
  if (nameA !== "A" || nameB !== "B") captions.push({ text: `A = ${nameA} · B = ${nameB}` });
  captions.push({ text: w.treeHint, color: C.orange });
  return compose(tex, parts.join(""), H + 8, captions);
}

// ---------- distributions ----------

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, error < 1.5e-7). */
function phi(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

const logFact = (() => {
  const t = [0];
  for (let i = 1; i <= 1000; i++) t.push(t[i - 1] + Math.log(i));
  return (k: number) => t[k];
})();

function num(s: string, w: StatWords): number {
  const v = Number(s.trim().replace(",", "."));
  if (s.trim() === "" || !Number.isFinite(v)) throw new Error(fill(w.badNumber, { s }));
  return v;
}
const bound = (s: string, w: StatWords) => (s.trim() === "" ? null : num(s, w));

function renderDist(s: DistSpec, w: StatWords): RenderedSvg {
  const lo = bound(s.lo, w);
  const hi = bound(s.hi, w);
  const parts: string[] = [];
  let tex: string;
  let P: number;
  const captions: Caption[] = [];

  if (s.kind === "normal") {
    const mu = num(s.mu, w);
    const sigma = num(s.sigma, w);
    if (!(sigma > 0)) throw new Error(fill(w.badNumber, { s: s.sigma }));
    const pdf = (x: number) => Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));
    const [x0, x1] = [mu - 4 * sigma, mu + 4 * sigma];
    const f = makeFrame("dn", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [x0, x1], [0, pdf(mu) * 1.15]);
    const ticks = [-3, -2, -1, 0, 1, 2, 3].map((k) => ({ v: mu + k * sigma, label: nt(mu + k * sigma, 3) }));
    parts.push(axes(f, { xAtBottom: true, xTicks: ticks }));
    const a = Math.max(lo ?? x0, x0);
    const b = Math.min(hi ?? x1, x1);
    if (b > a) {
      const pts: string[] = [`${r2(f.sx(a))},${r2(f.sy(0))}`];
      for (let i = 0; i <= 300; i++) {
        const x = a + ((b - a) * i) / 300;
        pts.push(`${r2(f.sx(x))},${r2(f.sy(pdf(x)))}`);
      }
      pts.push(`${r2(f.sx(b))},${r2(f.sy(0))}`);
      parts.push(`<polygon points="${pts.join(" ")}" fill="#ffd8a8" stroke="${C.orange}" stroke-width="1.2"/>`);
    }
    parts.push(vline(f, mu, C.grey, `stroke-dasharray="5 4"`), curve(f, pdf, C.blue, 2.8));
    P = (hi === null ? 1 : phi((hi - mu) / sigma)) - (lo === null ? 0 : phi((lo - mu) / sigma));
    P = Math.max(0, P);
    const cond = lo !== null && hi !== null ? `${tn(lo)} < X < ${tn(hi)}` : lo !== null ? `X > ${tn(lo)}` : hi !== null ? `X < ${tn(hi)}` : `-\\infty < X < \\infty`;
    tex = `X \\sim N(${tn(mu)},\\ ${tn(sigma)}^2) \\qquad P(${cond}) = ${tn(P)}`;
    const z = (x: number | null, inf: string) => (x === null ? inf : nt((x - mu) / sigma, 2));
    captions.push({ text: fill(w.zScores, { z1: z(lo, "−∞"), z2: z(hi, "∞") }) });
  } else {
    let pmf: (k: number) => number;
    let kMax: number;
    let head: string;
    let mean: number;
    let sd: number;
    if (s.kind === "binomial") {
      const n = clampInt(s.n, 1, 200);
      const pp = num(s.p, w);
      if (!(pp >= 0 && pp <= 1)) throw new Error(w.badProb);
      pmf = (k) =>
        pp === 0 ? (k === 0 ? 1 : 0) : pp === 1 ? (k === n ? 1 : 0) : Math.exp(logFact(n) - logFact(k) - logFact(n - k) + k * Math.log(pp) + (n - k) * Math.log(1 - pp));
      kMax = n;
      mean = n * pp;
      sd = Math.sqrt(n * pp * (1 - pp));
      head = `X \\sim B(${n},\\ ${tn(pp)}) \\qquad E(X) = np = ${tn(mean)} \\qquad \\sigma = \\sqrt{np(1-p)} = ${tn(sd, 3)}`;
    } else {
      const lam = num(s.lambda, w);
      if (!(lam > 0) || lam > 200) throw new Error(fill(w.badNumber, { s: s.lambda }));
      pmf = (k) => Math.exp(-lam + k * Math.log(lam) - logFact(k));
      kMax = Math.ceil(lam + 5 * Math.sqrt(lam) + 3);
      mean = lam;
      sd = Math.sqrt(lam);
      head = `X \\sim Po(${tn(lam)}) \\qquad E(X) = \\lambda = ${tn(lam)} \\qquad \\sigma = \\sqrt{\\lambda} = ${tn(sd, 3)}`;
    }
    const ks = Array.from({ length: kMax + 1 }, (_, k) => k);
    const ps = ks.map(pmf);
    const inRange = (k: number) => (lo === null || k >= lo - 1e-9) && (hi === null || k <= hi + 1e-9);
    P = ks.reduce((acc, k) => acc + (inRange(k) ? ps[k] : 0), 0);
    const f = makeFrame("dd", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [-0.7, kMax + 0.7], [0, Math.max(...ps) * 1.15]);
    parts.push(axes(f, { xAtBottom: true, integerX: true }));
    ks.forEach((k) => parts.push(bar(f, k - 0.4, k + 0.4, ps[k], inRange(k) ? "#ffd8a8" : "#d0ebff", inRange(k) ? C.orange : C.blue)));
    if (kMax <= 20) ks.forEach((k) => ps[k] > 0.004 && parts.push(lbl(f.sx(k), f.sy(ps[k]) - 5, nt(ps[k], 3), C.ink, "middle", 10, false)));
    parts.push(vline(f, mean, C.red, `stroke-width="2" stroke-dasharray="7 4"`), lbl(f.sx(mean) + 5, f.top + 16, `E(X) = ${nt(mean, 3)}`, C.red));
    const cond =
      lo !== null && hi !== null ? (lo === hi ? `X = ${tn(lo)}` : `${tn(lo)} \\le X \\le ${tn(hi)}`) : lo !== null ? `X \\ge ${tn(lo)}` : hi !== null ? `X \\le ${tn(hi)}` : `X \\in \\mathbb{N}`;
    tex = `\\begin{gathered} ${head} \\\\ P(${cond}) = ${tn(P)} \\end{gathered}`;
  }
  captions.unshift({ text: fill(w.shaded, { p: nt(P), pct: nt(P * 100, 1) }), color: C.orange });
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- central limit theorem ----------

function population(src: CltSource): { values: number[]; weights: number[] } {
  if (src === "coin") return { values: [0, 1], weights: [1, 1] };
  if (src === "die") return { values: [1, 2, 3, 4, 5, 6], weights: [1, 1, 1, 1, 1, 1] };
  return { values: [0, 1, 2, 3, 4, 5, 6, 7, 8], weights: [30, 22, 15, 10, 8, 6, 4, 3, 2] };
}

function renderClt(s: CltSpec, w: StatWords): RenderedSvg {
  const { values, weights } = population(s.source);
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map((x) => x / total);
  const mu = values.reduce((a, v, i) => a + v * probs[i], 0);
  const sigma = Math.sqrt(values.reduce((a, v, i) => a + (v - mu) ** 2 * probs[i], 0));
  const n = clampInt(s.n, 1, 100);
  const m = clampInt(s.samples, 10, 20000);
  const cum = probs.map((_, i) => probs.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const r = rng(s.seed);
  const draw = () => {
    const u = r();
    const i = cum.findIndex((c) => u < c);
    return values[i < 0 ? values.length - 1 : i];
  };
  // Means of integer data lie on a lattice of step 1/n; bins are whole lattice cells so bars don't alias.
  const vmin = values[0];
  const vmax = values[values.length - 1];
  const cells = Math.max(1, Math.ceil(((vmax - vmin) * n) / 45));
  const bw = cells / n;
  const nb = Math.floor(((vmax - vmin) * n) / cells) + 1;
  const hist = Array<number>(nb).fill(0);
  let sumM = 0;
  let sumM2 = 0;
  for (let j = 0; j < m; j++) {
    let t = 0;
    for (let i = 0; i < n; i++) t += draw();
    const mean = t / n;
    sumM += mean;
    sumM2 += mean * mean;
    hist[Math.min(nb - 1, Math.floor(Math.round((mean - vmin) * n) / cells))]++;
  }
  const obsMean = sumM / m;
  const obsSd = Math.sqrt(Math.max(0, sumM2 / m - obsMean ** 2));
  const se = sigma / Math.sqrt(n);

  const half = 0.5 / n;
  const xr = [vmin - 0.6, vmax + 0.6];
  const fp = makeFrame("cp", PLOT.left, PLOT.top, PLOT.w, 104, xr, [0, Math.max(...probs) * 1.25]);
  const parts = [axes(fp, { xAtBottom: true, integerX: true, yAxis: false })];
  values.forEach((v, i) => parts.push(bar(fp, v - 0.3, v + 0.3, probs[i], "#e9ecef", C.grey)));
  parts.push(lbl(fp.right - 8, fp.top + 18, w.population, C.grey, "end", 13, false), vline(fp, mu, C.red, `stroke-width="1.6" stroke-dasharray="5 4"`));

  const dens = hist.map((c) => c / (m * bw));
  const pdf = (x: number) => Math.exp(-(((x - mu) / se) ** 2) / 2) / (se * Math.sqrt(2 * Math.PI));
  const yTop = Math.max(...dens, pdf(mu)) * 1.12;
  const fm = makeFrame("cm", PLOT.left, PLOT.top + 132, PLOT.w, PLOT.h - 132, xr, [0, yTop]);
  parts.push(axes(fm, { xAtBottom: true, integerX: true, yAxis: false }));
  hist.forEach((c, j) => {
    if (!c) return;
    const left = vmin + j * bw - half;
    parts.push(bar(fm, left, left + bw, dens[j], "#a5d8ff", C.blue, nb > 60 ? 0.4 : 1));
  });
  parts.push(
    curve(fm, pdf, C.orange, 2.6, "", xr[0], xr[1], 600),
    vline(fm, mu, C.red, `stroke-width="1.6" stroke-dasharray="5 4"`),
    lbl(fm.right - 8, fm.top + 18, `${w.sampleMeans} (n = ${n})`, C.blue, "end", 13, false),
    lbl(fm.right - 8, fm.top + 38, `N(μ, σ²/n)`, C.orange, "end", 13, false),
  );

  const tex =
    `\\mu = ${tn(mu, 3)},\\ \\ \\sigma = ${tn(sigma, 3)} \\qquad \\bar{X} \\approx N\\!\\left(\\mu,\\ \\frac{\\sigma^2}{n}\\right), \\quad \\frac{\\sigma}{\\sqrt{n}} = \\frac{${tn(sigma, 3)}}{\\sqrt{${n}}} = ${tn(se, 3)}`;
  const captions: Caption[] = [{ text: fill(w.clt, { m, n, mu: nt(obsMean, 3), se: nt(obsSd, 3), theory: nt(se, 3) }) }];
  return compose(tex, parts.join(""), BODY_H, captions);
}

export function renderStatistics(spec: StatSpec, words: StatWords): RenderedSvg {
  switch (spec.topic) {
    case "data":
      return renderData(spec, words);
    case "scatter":
      return renderScatter(spec, words);
    case "chance":
      return renderChance(spec, words);
    case "tree":
      return renderTree(spec, words);
    case "dist":
      return renderDist(spec, words);
    case "clt":
      return renderClt(spec, words);
  }
}

