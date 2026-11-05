// Be the sort: the player carries out a sorting algorithm by hand, one decision at a time, and every move is checked
// against the algorithm's own next move. Bubble sort: tap the gap between the next two neighbours the pass swaps (the
// compares that swap nothing play themselves, and a pass with no swap ends the sort). Insertion sort: tap the gap the
// key drops into. Selection sort: tap the smallest of the unsorted part. Merge: tap the head of the run that goes out
// next (a tie goes to the left run, so equal values keep their order). Partition (Lomuto, the last item the pivot): tap
// the next item smaller than the pivot, and it swaps behind the wall; the pivot lands at the end by itself. Quicksort:
// the same partition on each part in turn, the left part before the right, and once nothing smaller is left the player
// taps the pivot to land it at the wall; parts of one item are in place by themselves. A wrong tap
// is not made, and says the rule it broke. Kept free of React: the run of an algorithm is worked out once, as the
// pictures before each move and the moves themselves, and the board only counts how far along it the player is.
import { cell, txt } from "./algoArrays";
import { highlight, rename, tspans, varColor, type Names } from "./codeStyle";
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type SortAlgo = "bubble" | "insertion" | "selection" | "merge" | "partition" | "quick";
export const SORT_ALGOS: readonly SortAlgo[] = ["bubble", "insertion", "selection", "merge", "partition", "quick"];
export type SortLevel = 1 | 2 | 3;
/** The items to sort; for a merge, two sorted runs, the second starting at `mid` (elsewhere `mid` is the length). */
export type SortTask = { algo: SortAlgo; a: number[]; mid: number };

/**
 * What the board shows before a move: bubble sort's pass scanning on from `at` with everything from `end` settled;
 * insertion sort's key a[i] with a[0..i) sorted; selection sort's a[0..i) in place; a merge's two runs taken up to p
 * and q; a partition's wall (a[0..wall) smaller than the pivot, the last item) with the scan at `at`; quicksort's
 * part a[lo..hi] being partitioned around a[hi], the same way from lo, with `fixed` the places already final. `done`
 * is the last picture, after the last move.
 */
export type Look =
  | { algo: "bubble"; a: number[]; at: number; end: number }
  | { algo: "insertion" | "selection"; a: number[]; i: number }
  | { algo: "merge"; left: number[]; right: number[]; p: number; q: number; out: number[] }
  | { algo: "partition"; a: number[]; wall: number; at: number }
  | { algo: "quick"; a: number[]; lo: number; hi: number; wall: number; at: number; fixed: boolean[] };
export type Done = { algo: SortAlgo; a: number[]; done: true; pivotAt: number };

export type SortNotice = "earlyStop" | "inPlace" | "selfSwap" | "runEmpty" | "lopsided" | "landed" | "streak10";
export const SORT_NOTICES: SortNotice[] = ["earlyStop", "inPlace", "selfSwap", "runEmpty", "lopsided", "landed", "streak10"];

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
/** Quicksort, Lomuto: partition a[lo..hi] around a[hi], land it, then the left part, then the right. */
function quickRun(a: number[], looks: Look[], moves: number[], seen: Set<SortNotice>) {
  const fixed = a.map(() => false);
  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) return void (fixed[lo] = true);
    const pivot = a[hi];
    let wall = lo;
    let at = lo;
    const look = () => looks.push({ algo: "quick", a: [...a], lo, hi, wall, at, fixed: [...fixed] });
    for (let j = lo; j < hi; j++)
      if (a[j] < pivot) {
        look();
        moves.push(j);
        [a[wall], a[j]] = [a[j], a[wall]];
        wall++;
        at = j + 1;
      }
    at = hi;
    look();
    moves.push(hi);
    [a[wall], a[hi]] = [a[hi], a[wall]];
    fixed[wall] = true;
    seen.add("landed");
    // A pivot at an end of a part of three or more leaves one side empty: the bad case, O(n²) on sorted input.
    if (hi - lo >= 2 && (wall === lo || wall === hi)) seen.add("lopsided");
    sort(lo, wall - 1);
    sort(wall + 1, hi);
  };
  sort(0, a.length - 1);
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
  else if (task.algo === "quick") quickRun(a, looks, moves, seen);
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
  | "behind" | "notSmaller" | "scanFirst"
  | "fixed" | "otherPart" | "pivotEarly" | "landNow";
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
    case "quick": {
      const a = look.a;
      const p = a[look.hi];
      if (look.fixed[tap]) return no("fixed", { x: a[tap] });
      if (tap < look.lo || tap > look.hi) return no("otherPart", { x: a[tap] });
      if (tap < look.wall) return no("behind", { x: a[tap] });
      if (want === look.hi) return no("landNow", { p });
      if (tap === look.hi) return no("pivotEarly", { x: a[want], p });
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
    // Quicksort: at least one item really jumps the wall, and the first pivot splits the row into two real parts.
    if (algo === "quick") {
      const first = run.looks.filter((l) => l.algo === "quick" && l.lo === 0 && l.hi === a.length - 1).length - 1;
      const jumps = run.looks.some((l, k) => l.algo === "quick" && run.moves[k] !== l.hi && run.moves[k] !== l.wall);
      if (!jumps || first < 2 || first > a.length - 3) continue;
    }
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
  // Added after the rest, so the stars a saved ladder keeps by place stay on their puzzles.
  { algo: "quick", n: 6, seed: 2109 },
  { algo: "quick", n: 8, seed: 2110 },
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

// ---------- the code view ----------

/** Each algorithm as the code the player is running, for the code view's panel. */
export const SORT_PLAY_CODE: Record<SortAlgo, string[]> = {
  bubble: [
    "for end in range(n, 1, -1):",
    "    swapped = False",
    "    for j in range(end - 1):",
    "        if a[j] > a[j + 1]:",
    "            a[j], a[j + 1] = a[j + 1], a[j]",
    "            swapped = True",
    "    if not swapped: break",
  ],
  insertion: ["for i in range(1, n):", "    key = a.pop(i)", "    j = i", "    while j > 0 and a[j - 1] > key: j -= 1", "    a.insert(j, key)"],
  selection: ["for i in range(n - 1):", "    m = min(range(i, n), key=lambda k: a[k])", "    a[i], a[m] = a[m], a[i]"],
  merge: ["i, j, out = 0, 0, []", "while i < len(L) and j < len(R):", "    if L[i] <= R[j]: out.append(L[i]); i += 1", "    else: out.append(R[j]); j += 1", "out += L[i:] + R[j:]"],
  partition: ["p = a[hi]; i = 0", "for j in range(hi):", "    if a[j] < p:", "        a[i], a[j] = a[j], a[i]; i += 1", "a[i], a[hi] = a[hi], a[i]"],
  quick: [
    "def quick(lo, hi):",
    "    if lo >= hi: return",
    "    p = a[hi]; i = lo",
    "    for j in range(lo, hi):",
    "        if a[j] < p:",
    "            a[i], a[j] = a[j], a[i]; i += 1",
    "    a[i], a[hi] = a[hi], a[i]",
    "    quick(lo, i - 1); quick(i + 1, hi)",
  ],
};

/** The line of the code the move made at step m ran (the swap, the insert, the append …); -1 before any move. */
export function moveLine(run: SortRun, m: number): number {
  if (m < 0) return -1;
  switch (run.task.algo) {
    case "bubble":
      return 4;
    case "insertion":
      return 4;
    case "selection":
      return 2;
    case "merge":
      return run.moves[m] === 0 ? 2 : 3;
    case "partition":
      return 3;
    case "quick": {
      const look = run.looks[m] as Extract<Look, { algo: "quick" }>;
      return run.moves[m] === look.hi ? 6 : 5;
    }
  }
}

const MONO = `font-family="Consolas, 'DejaVu Sans Mono', 'Courier New', monospace"`;
const monoTxt = (x: number, y: number, s: string, size = 13, anchor = "middle", bold = true, color = "#1e1e1e") =>
  `<text x="${x}" y="${y}" ${MONO} font-size="${size}" fill="${color}" text-anchor="${anchor}"${bold ? ` font-weight="700"` : ""} xml:space="preserve">${s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`;
/** A plain cell, the same for every item: what an item is, the pointers say. */
const plain = (x: number, y: number, v: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="7" fill="#ffffff" stroke="#ced4da" stroke-width="1.3"/>` + txt(x + CELL / 2, y + CELL / 2 + 6.5, String(v), { size: 18, anchor: "middle", bold: true });

/**
 * Pointers under a row of cells (y is the row's bottom edge): ↑ and the names of the variables that hold that index,
 * stacked, each in its own colour, and the cell pointed at edged in the first one's; an index at n (one past the end)
 * points just past the last cell. Returns the drawing and how tall it is.
 */
function pointers(ptrs: [string, number][], y: number, n: number, names: Names = {}): { svg: string; h: number } {
  const at = new Map<number, string[]>();
  for (const [name, i] of ptrs) if (i >= 0 && i <= n) at.set(i, [...(at.get(i) ?? []), name]);
  const parts: string[] = [];
  let deep = 0;
  for (const [i, here] of at) {
    const cx = i < n ? rowX(i) + CELL / 2 : rowX(n - 1) + CELL + (STEP - CELL) / 2;
    if (i < n) parts.push(`<rect x="${rowX(i)}" y="${y - CELL}" width="${CELL}" height="${CELL}" rx="7" fill="none" stroke="${varColor(here[0])}" stroke-width="2.6"/>`);
    parts.push(monoTxt(cx, y + 14, "↑", 15, "middle", true, varColor(here[0])));
    // Under its alias, if it has one, in its own colour; a long alias gets smaller rather than run into the next.
    here.forEach((nm, k) => {
      const s = rename(nm, names);
      parts.push(monoTxt(cx, y + 30 + k * 15, s, Math.min(13, (STEP + 4) / (0.6 * s.length)), "middle", true, varColor(nm)));
    });
    deep = Math.max(deep, here.length);
  }
  return { svg: parts.join(""), h: deep ? 22 + deep * 15 : 0 };
}

/**
 * The code view's picture at step k: the same places to tap as sortSvg, told by the code instead of by roles. The cells
 * are alike; where things are is said by the code's own variables pointing at their cells (j, end, i, key, lo, hi …),
 * and the values that matter are written out as highlighted code underneath. Colour only repeats a variable's name.
 */
export function sortCodeSvg(run: SortRun, k: number, names: Names = {}): SortPic {
  const look: Look | Done = k < run.moves.length ? run.looks[k] : run.end;
  const n = run.task.a.length;
  const w = Math.max(widthFor(n), 320);
  const parts: string[] = [];
  const targets: Target[] = [];
  // The values as code, under the aliases; squeezed to the picture's width if the aliases make it longer than that.
  const varsLine = (y: number, s: string) => {
    const room = w - 2 * PAD;
    const fit = rename(s, names).length * 8.1 > room ? ` textLength="${room}" lengthAdjust="spacingAndGlyphs"` : "";
    parts.push(`<text x="${PAD}" y="${y}" ${MONO} font-size="13.5" fill="#1e1e1e"${fit} xml:space="preserve">${tspans(highlight(s, names))}</text>`);
  };
  const ptrs = (ps: [string, number][], y: number, len = n) => pointers(ps, y, len, names);
  if ("done" in look) {
    const y = 24;
    look.a.forEach((v, i) => parts.push(plain(rowX(i), y, v)));
    const p = look.algo === "partition" ? ptrs([["i", look.pivotAt]], y + CELL, n) : { svg: "", h: 0 };
    parts.push(p.svg);
    const yv = y + CELL + p.h + 26;
    varsLine(yv, look.algo === "partition" ? `a[:${look.pivotAt}] < p = a[${look.pivotAt}] <= a[${look.pivotAt + 1}:]` : `a = [${look.a.join(", ")}]`);
    return { w, h: yv + 16, body: parts.join(""), targets };
  }
  switch (look.algo) {
    case "bubble": {
      const y = 24;
      look.a.forEach((v, i) => parts.push(plain(rowX(i), y, v)));
      const p = ptrs([["j", look.at], ...(look.end < n ? [["end", look.end] as [string, number]] : [])], y + CELL, n);
      parts.push(p.svg);
      const yc = y + CELL + p.h + 26;
      for (let g = 0; g + 1 < n; g++) {
        const cx = rowX(g) + CELL + (STEP - CELL) / 2;
        parts.push(chip(cx, yc, "⇄", g + 1 < look.end));
        targets.push({ x: cx - 16, y: yc - 14, w: 32, h: 28, move: g, kind: "gap" });
      }
      varsLine(yc + 36, `end = ${look.end}   j = ${look.at}`);
      return { w, h: yc + 50, body: parts.join(""), targets };
    }
    case "insertion": {
      const [yKey, y] = [10, 104];
      parts.push(plain(rowX(look.i), yKey, look.a[look.i]));
      parts.push(monoTxt(rowX(look.i) + CELL + 8, yKey + CELL / 2 + 5, `← ${rename("key", names)}`, 13, "start"));
      look.a.forEach((v, i) => parts.push(i === look.i ? slot(rowX(i), y) : plain(rowX(i), y, v)));
      for (let g = 0; g <= look.i; g++) {
        const cx = rowX(g) - (STEP - CELL) / 2;
        parts.push(chip(cx, y - 24, "▼", true));
        targets.push({ x: cx - 16, y: y - 38, w: 32, h: 28, move: g, kind: "gap" });
      }
      const p = ptrs([["i", look.i]], y + CELL, n);
      parts.push(p.svg);
      const yv = y + CELL + p.h + 22;
      varsLine(yv, `i = ${look.i}   key = ${look.a[look.i]}   a[:${look.i}] = [${look.a.slice(0, look.i).join(", ")}]`);
      return { w, h: yv + 16, body: parts.join(""), targets };
    }
    case "selection": {
      const y = 24;
      look.a.forEach((v, i) => {
        parts.push(plain(rowX(i), y, v));
        targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      const p = ptrs([["i", look.i]], y + CELL, n);
      parts.push(p.svg);
      const yv = y + CELL + p.h + 22;
      varsLine(yv, `i = ${look.i}   m = ?   a[m] == min(a[${look.i}:])`);
      return { w, h: yv + 16, body: parts.join(""), targets };
    }
    case "merge": {
      const runs = [look.left, look.right];
      const at = [look.p, look.q];
      const runName = ["L", "R"];
      const ptrName = ["i", "j"];
      let y = 14;
      runs.forEach((r, s) => {
        parts.push(monoTxt(PAD - 6, y + CELL / 2 + 5, rename(runName[s], names), 14, "end"));
        r.forEach((v, i) => {
          parts.push(plain(rowX(i), y, v));
          if (i === at[s]) targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: s, kind: "head", v });
        });
        const p = ptrs([[ptrName[s], at[s]]], y + CELL, r.length);
        parts.push(p.svg);
        y += CELL + Math.max(p.h, 10) + 12;
      });
      parts.push(monoTxt(PAD - 6, y + CELL / 2 + 5, rename("out", names), 13, "end"));
      for (let i = 0; i < n; i++) parts.push(i < look.out.length ? plain(rowX(i), y, look.out[i]) : slot(rowX(i), y));
      const yv = y + CELL + 24;
      varsLine(yv, `i = ${look.p}   j = ${look.q}   L[i] = ${look.left[look.p]}   R[j] = ${look.right[look.q]}`);
      return { w: w + 10, h: yv + 16, body: parts.join(""), targets };
    }
    case "partition": {
      const y = 24;
      look.a.forEach((v, i) => {
        parts.push(plain(rowX(i), y, v));
        if (i < n - 1) targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      const p = ptrs([["i", look.wall], ...(look.at < n - 1 ? [["j", look.at] as [string, number]] : []), ["hi", n - 1]], y + CELL, n);
      parts.push(p.svg);
      const yv = y + CELL + p.h + 22;
      varsLine(yv, `p = a[hi] = ${look.a[n - 1]}   i = ${look.wall}   j = ${look.at}`);
      return { w, h: yv + 16, body: parts.join(""), targets };
    }
    case "quick": {
      const y = 24;
      look.a.forEach((v, i) => {
        parts.push(plain(rowX(i), y, v));
        targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      const p = ptrs([["lo", look.lo], ["hi", look.hi], ["i", look.wall], ...(look.at < look.hi ? [["j", look.at] as [string, number]] : [])], y + CELL, n);
      parts.push(p.svg);
      const yv = y + CELL + p.h + 22;
      // The places already final, as code rather than a colour.
      const done = look.fixed.flatMap((f, i) => (f ? [i] : []));
      varsLine(yv, `quick(${look.lo}, ${look.hi})   p = a[hi] = ${look.a[look.hi]}   i = ${look.wall}   j = ${look.at}`);
      varsLine(yv + 20, `final: ${done.length ? `a[${done.join("], a[")}]` : "—"}`);
      return { w, h: yv + 36, body: parts.join(""), targets };
    }
  }
}

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
    case "quick": {
      const y = 24;
      look.a.forEach((v, i) => {
        const inPart = i >= look.lo && i <= look.hi;
        const role = look.fixed[i] ? "sorted" : !inPart ? "idle" : i === look.hi ? "pivot" : i < look.wall ? "key" : i < look.at ? "compare" : "plain";
        parts.push(cell(rowX(i), y, CELL, CELL, String(v), role, 18, true));
        targets.push({ x: rowX(i), y, w: CELL, h: CELL, move: i, kind: "cell", v });
      });
      // The part being sorted, bracketed underneath.
      const [x0, x1, yb] = [rowX(look.lo) - 4, rowX(look.hi) + CELL + 4, y + CELL + 26];
      parts.push(`<path d="M ${x0} ${yb - 6} V ${yb} H ${x1} V ${yb - 6}" fill="none" stroke="${BLUE}" stroke-width="2"/>`);
      parts.push(wallLine(rowX(look.wall) - (STEP - CELL) / 2, y, CELL));
      if (look.at < look.hi) parts.push(marker(rowX(look.at) + CELL / 2, y + CELL + 4));
      return { w, h: yb + 14, body: parts.join(""), targets };
    }
  }
}
