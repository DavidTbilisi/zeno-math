// The arithmetic behind the live pieces on the board (the ones that respond to clicks and drags): a geared clock,
// chance devices and the tallies of an experiment, dot multiplication, and the counts shown under a ten frame or a
// hundred square. Kept free of React and Excalidraw so it can be tested on its own.

// ——— Clock ———

/** Minutes past midnight, 0 to 1439. */
export const wrapDay = (m: number) => ((Math.round(m) % 1440) + 1440) % 1440;

/** Hand angles in degrees, clockwise from twelve. The hour hand moves on between the hours, as on a real clock. */
export function handAngles(minutes: number): { hour: number; minute: number } {
  const m = ((minutes % 720) + 720) % 720;
  return { hour: m / 2, minute: (m % 60) * 6 };
}

/** The smallest turn from one angle to another, in degrees, from −180 to 180. */
export function turn(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/**
 * The time after dragging a hand to `angle` (degrees clockwise from twelve). The hands are geared: taking the minute
 * hand once round moves the hour hand on an hour, and turning the hour hand drags the minute hand along.
 */
export function dragHand(minutes: number, hand: "hour" | "minute", angle: number): number {
  const now = handAngles(minutes)[hand];
  return minutes + turn(now, angle) * (hand === "minute" ? 1 / 6 : 2);
}

export const snapTo = (minutes: number, step: number) => Math.round(minutes / step) * step;

/** 12-hour time, as the clock face shows it: 0:05 is 12:05. */
export function clockTime(minutes: number): string {
  const m = wrapDay(minutes);
  const h = Math.floor(m / 60) % 12 || 12;
  return `${h}:${String(m % 60).padStart(2, "0")}`;
}

// ——— Chance ———

export const BAG_COLORS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00"] as const;

export type Device =
  | { kind: "coin" }
  | { kind: "die"; sides: number }
  | { kind: "twoDice" }
  | { kind: "spinner"; sections: number }
  | { kind: "bag"; counts: number[] };

export const DIE_SIDES = [4, 6, 8, 10, 12, 20];

/** Outcome i has probability p[i]; `labels` are what the chart writes under each bar (words come from the caller). */
export function outcomes(d: Device, words: { heads: string; tails: string }): { labels: string[]; p: number[] } {
  switch (d.kind) {
    case "coin":
      return { labels: [words.heads, words.tails], p: [0.5, 0.5] };
    case "die":
      return { labels: Array.from({ length: d.sides }, (_, i) => String(i + 1)), p: Array(d.sides).fill(1 / d.sides) };
    case "twoDice":
      return { labels: Array.from({ length: 11 }, (_, i) => String(i + 2)), p: Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i - 5)) / 36) };
    case "spinner":
      return { labels: Array.from({ length: d.sections }, (_, i) => String(i + 1)), p: Array(d.sections).fill(1 / d.sections) };
    case "bag": {
      const total = d.counts.reduce((a, b) => a + b, 0);
      return { labels: d.counts.map(String), p: d.counts.map((c) => (total ? c / total : 0)) };
    }
  }
}

/** One trial: the index of the outcome that came up. */
export function draw(d: Device, r: () => number): number {
  switch (d.kind) {
    case "coin":
      return r() < 0.5 ? 0 : 1;
    case "die":
      return Math.floor(r() * d.sides);
    case "twoDice":
      return Math.floor(r() * 6) + Math.floor(r() * 6);
    case "spinner":
      return Math.floor(r() * d.sections);
    case "bag": {
      const total = d.counts.reduce((a, b) => a + b, 0);
      let pick = r() * total;
      for (let i = 0; i < d.counts.length; i++) {
        pick -= d.counts[i];
        if (pick < 0) return i;
      }
      return d.counts.length - 1;
    }
  }
}

/**
 * Counts so far, with snapshots for the "over time" chart: after every trial at first, then each time the number of
 * trials has grown by a twentieth, so a million trials keep only a few hundred snapshots.
 */
export type Tally = { n: number; counts: number[]; history: { n: number; counts: number[] }[] };

export const emptyTally = (k: number): Tally => ({ n: 0, counts: Array(k).fill(0), history: [] });

export const MAX_TRIALS = 1_000_000;

export function runTrials(t: Tally, d: Device, trials: number, r: () => number): { tally: Tally; last: number } {
  const counts = [...t.counts];
  const history = [...t.history];
  let n = t.n;
  let last = -1;
  const room = Math.max(0, Math.min(trials, MAX_TRIALS - n));
  for (let i = 0; i < room; i++) {
    last = draw(d, r);
    counts[last]++;
    n++;
    const prev = history.length ? history[history.length - 1].n : 0;
    if (n <= 30 || n >= prev * 1.05) history.push({ n, counts: [...counts] });
  }
  return { tally: { n, counts, history }, last };
}

// ——— Dot multiplication ———

/**
 * Multiplying two numbers from k to 2k with k squares a row: each number is k plus its dots. Add the dots and count
 * each as 2k, then add the empty squares of one row times the empty squares of the other. It works because
 * (k + a)(k + b) = 2k(a + b) + (k − a)(k − b).
 */
export function dotProduct(k: number, top: number, bottom: number) {
  const dots = top + bottom;
  const value = 2 * k;
  const empty: [number, number] = [k - top, k - bottom];
  const parts = { dots, dotValue: dots * value, emptyProduct: empty[0] * empty[1] };
  return { a: k + top, b: k + bottom, value, empty, ...parts, product: parts.dotValue + parts.emptyProduct };
}

/** Tapping square i (0-based) fills through it; tapping the last dot again takes it away. */
export const tapSquare = (dots: number, i: number) => (i + 1 === dots ? i : i + 1);

// ——— Ten frame and hundred square ———

/** The two colours of counters in a ten frame (0 empty, 1 and 2 the colours), counted for "a + b = n". */
export function counters(cells: number[]): { a: number; b: number; n: number } {
  const a = cells.filter((c) => c === 1).length;
  const b = cells.filter((c) => c === 2).length;
  return { a, b, n: a + b };
}

export const multiplesOf = (n: number, upTo = 100) => Array.from({ length: Math.floor(upTo / n) }, (_, i) => n * (i + 1));

// ——— The kinds of live piece, their sizes and where each starts ———

export type LiveParam = { v: number; min: number; max: number };
export type LiveGraphState = {
  fns: { expr: string; color: string }[];
  params: Record<string, LiveParam>;
  view: { xMin: number; xMax: number; yMin: number; yMax: number };
  trace: boolean;
  tangent: boolean;
  traceX: number;
};

export const DEFAULT_LIVE_GRAPH: LiveGraphState = {
  fns: [{ expr: "a*x^2 + b*x + c", color: "#1971c2" }],
  params: { a: { v: 1, min: -5, max: 5 }, b: { v: 0, min: -5, max: 5 }, c: { v: 0, min: -5, max: 5 } },
  view: { xMin: -10, xMax: 10, yMin: -5.5, yMax: 5.5 },
  trace: false,
  tangent: false,
  traceX: 1,
};

export type ChanceView = "bars" | "time";

export type LiveStates = {
  clock: { minutes: number; showTime: boolean; snap: boolean };
  dice: { count: number; faces: number[]; history: number[] };
  spinner: { sections: number; angle: number; result: number; counts: number[] };
  coin: { side: number; counts: [number, number] };
  fractions: { shape: "circle" | "bar"; parts: number; shaded: boolean[] };
  tenFrame: { double: boolean; cells: number[] };
  hundred: { marked: number[]; n: number };
  dots: { k: number; top: number; bottom: number };
  graph: LiveGraphState;
  chance: { device: Device; tally: Tally; view: ChanceView; relative: boolean; theory: boolean; focus: number; last: number };
};
export type LiveKind = keyof LiveStates;

/** Design size of each piece in board pixels; a piece that is resized is scaled to fit. */
export const LIVE_SIZES: Record<LiveKind, [number, number]> = {
  clock: [300, 432],
  dice: [360, 236],
  spinner: [300, 372],
  coin: [260, 300],
  fractions: [320, 372],
  tenFrame: [340, 300],
  hundred: [400, 486],
  dots: [520, 600],
  graph: [640, 560],
  chance: [680, 500],
};

export const LIVE_KINDS = Object.keys(LIVE_SIZES) as LiveKind[];
export const isLiveKind = (k: unknown): k is LiveKind => typeof k === "string" && Object.hasOwn(LIVE_SIZES, k);

export function initialLive<K extends LiveKind>(kind: K): LiveStates[K] {
  const start: LiveStates = {
    clock: { minutes: 10 * 60 + 10, showTime: true, snap: true },
    dice: { count: 2, faces: [3, 5], history: [] },
    spinner: { sections: 4, angle: 30, result: -1, counts: [0, 0, 0, 0] },
    coin: { side: 0, counts: [0, 0] },
    fractions: { shape: "circle", parts: 4, shaded: [true, false, false, false] },
    tenFrame: { double: false, cells: Array(20).fill(0) },
    hundred: { marked: [], n: 3 },
    dots: { k: 5, top: 3, bottom: 1 },
    graph: DEFAULT_LIVE_GRAPH,
    chance: { device: { kind: "die", sides: 6 }, tally: emptyTally(6), view: "bars", relative: true, theory: true, focus: 5, last: -1 },
  };
  return structuredClone(start[kind]);
}
