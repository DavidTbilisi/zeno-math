// Be the sort: the player carries out a sorting algorithm by hand, one decision at a time, and every move is checked
// against the algorithm's own next move. Bubble sort: tap the gap between the next two neighbours the pass swaps (the
// compares that swap nothing play themselves, and a pass with no swap ends the sort). Insertion sort: tap the gap the
// key drops into. Selection sort: tap the smallest of the unsorted part. Merge: tap the head of the run that goes out
// next (a tie goes to the left run, so equal values keep their order). Partition (Lomuto, the last item the pivot): tap
// the next item smaller than the pivot, and it swaps behind the wall; the pivot lands at the end by itself. A wrong tap
// is not made, and says the rule it broke. Kept free of React: the run of an algorithm is worked out once, as the
// pictures before each move and the moves themselves, and the board only counts how far along it the player is.
import { cell, txt } from "./algoArrays";
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type SortAlgo = "bubble" | "insertion" | "selection" | "merge" | "partition";
export const SORT_ALGOS: readonly SortAlgo[] = ["bubble", "insertion", "selection", "merge", "partition"];
export type SortLevel = 1 | 2 | 3;
/** The items to sort; for a merge, two sorted runs, the second starting at `mid` (elsewhere `mid` is the length). */
export type SortTask = { algo: SortAlgo; a: number[]; mid: number };

/**
 * What the board shows before a move: bubble sort's pass scanning on from `at` with everything from `end` settled;
 * insertion sort's key a[i] with a[0..i) sorted; selection sort's a[0..i) in place; a merge's two runs taken up to p
 * and q; a partition's wall (a[0..wall) smaller than the pivot, the last item) with the scan at `at`. `done` is the
 * last picture, after the last move.
 */
export type Look =
  | { algo: "bubble"; a: number[]; at: number; end: number }
  | { algo: "insertion" | "selection"; a: number[]; i: number }
  | { algo: "merge"; left: number[]; right: number[]; p: number; q: number; out: number[] }
  | { algo: "partition"; a: number[]; wall: number; at: number };
export type Done = { algo: SortAlgo; a: number[]; done: true; pivotAt: number };

export type SortNotice = "earlyStop" | "inPlace" | "selfSwap" | "runEmpty" | "landed" | "streak10";
export const SORT_NOTICES: SortNotice[] = ["earlyStop", "inPlace", "selfSwap", "runEmpty", "landed", "streak10"];

/** The algorithm's run: the picture before each move, the moves, the last picture, and what the run showed on the way. */
export type SortRun = { task: SortTask; looks: Look[]; moves: number[]; end: Done; seen: SortNotice[] };

function bubbleRun(a: number[], looks: Look[], moves: number[], seen: Set<SortNotice>) {
  for (let end = a.length; end > 1; end--) {
    let swapped = false;
    let at = 0;
    for (let j = 0; j + 1 < end; j++)
      if (a[j] > a[j + 1]) {
        looks.push({ algo: "bubble", a: [...a], at, end });
        moves.push(j);
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        at = j + 1;
      }
    if (!swapped) {
      // A pass with no swap: sorted, with passes still to go that plain bubble sort would have made.
      if (end > 2) seen.add("earlyStop");
      return;
    }
  }
}
function insertionRun(a: number[], looks: Look[], moves: number[], seen: Set<SortNotice>) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let pos = i;
    while (pos > 0 && a[pos - 1] > key) pos--;
    looks.push({ algo: "insertion", a: [...a], i });
    moves.push(pos);
    if (pos === i) seen.add("inPlace");
    a.splice(i, 1);
    a.splice(pos, 0, key);
  }
}
function selectionRun(a: number[], looks: Look[], moves: number[], seen: Set<SortNotice>) {
  for (let i = 0; i + 1 < a.length; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
    looks.push({ algo: "selection", a: [...a], i });
    moves.push(m);
    if (m === i) seen.add("selfSwap");
    [a[i], a[m]] = [a[m], a[i]];
  }
}
function mergeRun(t: SortTask, looks: Look[], moves: number[], seen: Set<SortNotice>): number[] {
  const [left, right] = [t.a.slice(0, t.mid), t.a.slice(t.mid)];
  const out: number[] = [];
  let [p, q] = [0, 0];
  while (p < left.length && q < right.length) {
    looks.push({ algo: "merge", left, right, p, q, out: [...out] });
    const fromLeft = left[p] <= right[q];
    moves.push(fromLeft ? 0 : 1);
    out.push(fromLeft ? left[p++] : right[q++]);
  }
  if (left.length - p + right.length - q >= 2) seen.add("runEmpty");
  return [...out, ...left.slice(p), ...right.slice(q)];
}
function partitionRun(a: number[], looks: Look[], moves: number[], seen: Set<SortNotice>): number {
  const n = a.length;
  const pivot = a[n - 1];
  let wall = 0;
  let at = 0;
  for (let j = 0; j + 1 < n; j++)
    if (a[j] < pivot) {
      looks.push({ algo: "partition", a: [...a], wall, at });
      moves.push(j);
      [a[wall], a[j]] = [a[j], a[wall]];
      wall++;
      at = j + 1;
    }
  [a[wall], a[n - 1]] = [a[n - 1], a[wall]];
  seen.add("landed");
  return wall;
}

/** The run of the task's algorithm, worked out once. */
export function sortRun(task: SortTask): SortRun {
  const looks: Look[] = [];
  const moves: number[] = [];
  const seen = new Set<SortNotice>();
  let a = [...task.a];
  let pivotAt = -1;
  if (task.algo === "bubble") bubbleRun(a, looks, moves, seen);
  else if (task.algo === "insertion") insertionRun(a, looks, moves, seen);
  else if (task.algo === "selection") selectionRun(a, looks, moves, seen);
  else if (task.algo === "merge") a = mergeRun(task, looks, moves, seen);
  else pivotAt = partitionRun(a, looks, moves, seen);
  return { task, looks, moves, end: { algo: task.algo, a, done: true, pivotAt }, seen: SORT_NOTICES.filter((k) => seen.has(k)) };
}

// ---------- checking a move ----------

/** Why a tap is not the algorithm's next move; the words name the items in `vars`. */
export type SortWhy =
  | "settled" | "inOrder" | "first"
  | "stopsAfter" | "slidesPast"
  | "sortedPart" | "notMin" | "firstMin"
  | "smaller" | "tie"
  | "behind" | "notSmaller" | "scanFirst";
export type SortCheck = { ok: true } | { ok: false; why: SortWhy; vars: Record<string, number> };

/** Whether `tap` is the move the algorithm makes at step k, and if not, the rule it broke. */
export function checkTap(run: SortRun, k: number, tap: number): SortCheck {
  const want = run.moves[k];
  if (tap === want) return { ok: true };
  const look = run.looks[k];
  const no = (why: SortWhy, vars: Record<string, number> = {}): SortCheck => ({ ok: false, why, vars });
  switch (look.algo) {
    case "bubble": {
      const a = look.a;
      if (tap + 1 >= look.end) return no("settled");
      if (a[tap] <= a[tap + 1]) return no("inOrder", { x: a[tap], y: a[tap + 1] });
      return no("first", { x: a[want], y: a[want + 1] });
    }
    case "insertion": {
      const key = look.a[look.i];
      return tap < want ? no("stopsAfter", { x: look.a[want - 1], k: key }) : no("slidesPast", { x: look.a[tap - 1], k: key });
    }
    case "selection": {
      const a = look.a;
      if (tap < look.i) return no("sortedPart");
      return a[tap] === a[want] ? no("firstMin", { m: a[want] }) : no("notMin", { m: a[want], x: a[tap] });
    }
    case "merge": {
      const [l, r] = [look.left[look.p], look.right[look.q]];
      return l === r ? no("tie", { x: l }) : no("smaller", { x: Math.min(l, r), y: Math.max(l, r) });
    }
    case "partition": {
      const a = look.a;
      const p = a[a.length - 1];
      if (tap < look.wall) return no("behind", { x: a[tap] });
      if (a[tap] >= p) return no("notSmaller", { x: a[tap], p });
      return no("scanFirst", { x: a[want], p });
    }
  }
}

// ---------- the tasks ----------

type Spec = { algo: SortAlgo | null; n: number; kind?: "nearly" | "dups" };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
function shuffled(xs: number[], next: () => number): number[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** n different numbers from 1 to 20, or with `dups` n numbers from 1 to 5 with some alike. */
function numbers(n: number, next: () => number, dups = false): number[] {
  if (dups) return Array.from({ length: n }, () => 1 + Math.floor(next() * 5));
  return shuffled(Array.from({ length: 20 }, (_, i) => i + 1), next).slice(0, n);
}
const sortedCopy = (a: number[]) => [...a].sort((x, y) => x - y);
const isSorted = (a: number[]) => a.every((x, i) => i === 0 || a[i - 1] <= x);

/**
 * A task that is worth playing: never sorted already; nearly sorted is two swaps of neighbours away from sorted; repeated
 * values put two smallest alike in the unsorted part at least once; two merge runs that interleave; a pivot with two
 * items or more on each side of it, and at least one item that really moves behind the wall.
 */
export function sortTask(spec: Spec, next: () => number): SortTask {
  const algo = spec.algo ?? pick(SORT_ALGOS, next);
  for (;;) {
    let a = numbers(spec.n, next, spec.kind === "dups");
    if (spec.kind === "nearly") {
      a = sortedCopy(a);
      for (let s = 0; s < 2; s++) {
        const j = Math.floor(next() * (a.length - 1));
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
    if (algo === "merge") {
      const mid = Math.floor(spec.n / 2);
      const [l, r] = [sortedCopy(a.slice(0, mid)), sortedCopy(a.slice(mid))];
      if (l[l.length - 1] <= r[0] || r[r.length - 1] <= l[0]) continue;
      return { algo, a: [...l, ...r], mid };
    }
    if (isSorted(a)) continue;
    const t: SortTask = { algo, a, mid: a.length };
    const run = sortRun(t);
    if (algo === "partition" && (run.moves.length < 2 || run.moves.length > a.length - 3 || run.moves.every((j, m) => j === m))) continue;
    if (spec.kind === "dups" && algo === "selection" && !run.looks.some((l, k) => l.algo === "selection" && l.a.slice(l.i).filter((x) => x === l.a[run.moves[k]]).length > 1)) continue;
    return t;
  }
}

export const SORT_LADDER: (Spec & { seed: number })[] = [
  { algo: "bubble", n: 5, seed: 2101 },
  { algo: "bubble", n: 6, kind: "nearly", seed: 2102 },
  { algo: "insertion", n: 5, seed: 2103 },
  { algo: "insertion", n: 7, seed: 2104 },
  { algo: "selection", n: 6, seed: 2105 },
  { algo: "selection", n: 6, kind: "dups", seed: 2106 },
  { algo: "merge", n: 6, seed: 2107 },
  { algo: "partition", n: 7, seed: 2108 },
  { algo: null, n: 8, seed: 2116 },
];
/** The endless run: easy, the three simple sorts on 5 or 6 items; medium, merge and partition too on 7; hard, any on 8 or 9, some alike. */
export function levelSpec(level: SortLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["bubble", "insertion", "selection"] as const, next), n: 5 + Math.floor(next() * 2) };
  if (level === 2) return { algo: null, n: 7 };
  return { algo: null, n: 8 + Math.floor(next() * 2), kind: next() < 0.3 ? "dups" : undefined };
}

/** Stars: no miss three, one two, else one. */
export const sortStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function sortNotice(run: SortRun, misses: number, streak: number): SortNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (run.seen[0] ?? null) : null;
}

export type LiveBeSort = EndlessGame<SortNotice, SortLevel, { kind: "wrong"; why: SortWhy; vars: Record<string, number> }> &
  TryGame & {
    /** How many of the algorithm's moves have been made. */
    step: number;
  };
export function sortNow(d: Pick<LiveBeSort, "mode" | "stage" | "level" | "seed">): SortTask {
  if (d.mode === "puzzle") {
    const s = SORT_LADDER[d.stage];
    return sortTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return sortTask(levelSpec(d.level, next), next);
}

// ---------- the picture ----------

/** A place to tap: a cell (its index and value), a gap before index i, or the head of a merge run (0 left, 1 right) and its value. */
export type Target = { x: number; y: number; w: number; h: number; move: number; kind: "cell" | "gap" | "head"; v?: number };
export type SortPic = { w: number; h: number; body: string; targets: Target[] };

const CELL = 46;
const STEP = 60;
const PAD = 26;
const BLUE = "#1971c2";
const rowX = (i: number) => PAD + i * STEP;
const widthFor = (n: number) => PAD * 2 + (n - 1) * STEP + CELL;

function chip(x: number, y: number, label: string, on: boolean): string {
  const [fill, stroke, ink] = on ? ["#e7f5ff", BLUE, BLUE] : ["#f8f9fa", "#dee2e6", "#adb5bd"];
  return `<rect x="${x - 15}" y="${y - 12}" width="30" height="24" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>` + txt(x, y + 5, label, { size: 14, color: ink, anchor: "middle", bold: true });
}
const marker = (x: number, y: number) => `<path d="M ${x} ${y} l -7 12 h 14 z" fill="${BLUE}"/>`;
const wallLine = (x: number, y: number, h: number) => `<line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y + h + 8}" stroke="#e03131" stroke-width="4" stroke-linecap="round"/>`;
const slot = (x: number, y: number) => `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="none" stroke="#adb5bd" stroke-width="1.3" stroke-dasharray="5 4"/>`;

/** The picture at step k of the run (the last picture once every move is made), and the places to tap on it. */
export function sortSvg(run: SortRun, k: number): SortPic {
  const look: Look | Done = k < run.moves.length ? run.looks[k] : run.end;
  const n = run.task.a.length;
  const w = widthFor(n);
  const parts: string[] = [];
  const targets: Target[] = [];
  if ("done" in look) {
    const y = 40;
    look.a.forEach((v, i) => {
      const role = look.algo !== "partition" ? "sorted" : i === look.pivotAt ? "pivot" : i < look.pivotAt ? "key" : "plain";
      parts.push(cell(rowX(i), y, CELL, CELL, String(v), role, 18, true));
    });
    if (look.algo === "partition") parts.push(wallLine(rowX(look.pivotAt) - (STEP - CELL) / 2, y, CELL));
    return { w, h: y + CELL + 40, body: parts.join(""), targets };
  }
  switch (look.algo) {
    case "bubble": {
      const y = 24;
      look.a.forEach((v, i) => parts.push(cell(rowX(i), y, CELL, CELL, String(v), i >= look.end ? "sorted" : "plain", 18, true)));
      parts.push(marker(rowX(look.at) + CELL / 2, y + CELL + 6));
      for (let g = 0; g + 1 < n; g++) {
        const cx = rowX(g) + CELL + (STEP - CELL) / 2;
        parts.push(chip(cx, y + CELL + 36, "⇄", g + 1 < look.end));
        targets.push({ x: cx - 16, y: y + CELL + 22, w: 32, h: 28, move: g, kind: "gap" });
      }
      return { w, h: y + CELL + 66, body: parts.join(""), targets };
    }
    case "insertion": {
      const [yKey, y] = [10, 104];
      parts.push(cell(rowX(look.i), yKey, CELL, CELL, String(look.a[look.i]), "key", 18, true));
      look.a.forEach((v, i) => parts.push(i === look.i ? slot(rowX(i), y) : cell(rowX(i), y, CELL, CELL, String(v), i < look.i ? "plain" : "idle", 18, true)));
      for (let g = 0; g <= look.i; g++) {
        const cx = rowX(g) - (STEP - CELL) / 2;
        parts.push(chip(cx, y - 24, "▼", true));
        targets.push({ x: cx - 16, y: y - 38, w: 32, h: 28, move: g, kind: "gap" });
      }
      return { w, h: y + CELL + 20, body: parts.join(""), targets };
    }
    case "selection": {
      const y = 24;
      look.a.forEach((v, i) => {
        parts.push(cell(rowX(i), y, CELL, CELL, String(v), i < look.i ? "sorted" : "plain", 18, true));
        targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      if (look.i > 0) parts.push(wallLine(rowX(look.i) - (STEP - CELL) / 2, y, CELL).replace("#e03131", "#2f9e44"));
      return { w, h: y + CELL + 30, body: parts.join(""), targets };
    }
    case "merge": {
      const ys = [14, 80, 160];
      const runs = [look.left, look.right];
      const at = [look.p, look.q];
      runs.forEach((r, s) =>
        r.forEach((v, i) => {
          const x = rowX(i);
          parts.push(cell(x, ys[s], CELL, CELL, String(v), i < at[s] ? "idle" : i === at[s] ? "key" : "plain", 18, true));
          if (i === at[s]) targets.push({ x, y: ys[s], w: CELL, h: CELL, move: s, kind: "head", v });
        }),
      );
      for (let i = 0; i < n; i++) parts.push(i < look.out.length ? cell(rowX(i), ys[2], CELL, CELL, String(look.out[i]), "sorted", 18, true) : slot(rowX(i), ys[2]));
      parts.push(`<line x1="${PAD}" y1="${ys[2] - 14}" x2="${w - PAD}" y2="${ys[2] - 14}" stroke="#dee2e6" stroke-width="1.5"/>`);
      return { w, h: ys[2] + CELL + 16, body: parts.join(""), targets };
    }
    case "partition": {
      const y = 24;
      look.a.forEach((v, i) => {
        const role = i === n - 1 ? "pivot" : i < look.wall ? "key" : i < look.at ? "compare" : "plain";
        parts.push(cell(rowX(i), y, CELL, CELL, String(v), role, 18, true));
        if (i < n - 1) targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      parts.push(wallLine(rowX(look.wall) - (STEP - CELL) / 2, y, CELL));
      if (look.at < n - 1) parts.push(marker(rowX(look.at) + CELL / 2, y + CELL + 6));
      return { w, h: y + CELL + 30, body: parts.join(""), targets };
    }
  }
}
