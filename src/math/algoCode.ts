// The code view of the Algorithms tool's sorts and searches: the algorithm as a short Python-like program, run one line
// at a time like a debugger. Nothing is told by colour: the array is plain cells under their indices, the variables
// that hold an index point at their cell (↑ i, ↑ j, ↑ lo …), the line about to run is marked ▶, every variable is listed
// with its value, and a test is written out with the numbers put in (a[j] > a[j + 1]  →  7 > 1  →  True).
import type { AlgoWords, SearchSpec, SortSpec, Steps } from "./algo";
import { parseNum, parseNums } from "./algoArrays";
import { C, compose, esc, fill, nt, r2, tn, W, type Caption } from "./chart";
import { highlight, NAME_MAX, parseNames, rename, tspans, varColor, type Names } from "./codeStyle";
import type { RenderedSvg } from "./latex";

/** One step: the line about to run, the array, the index variables (pointers) and the others, and what the line does. */
export type CodeFrame = {
  line: number;
  a: number[];
  ptr: [string, number][];
  vars: [string, string][];
  /** A test: the code, the same with the numbers put in, and its result. */
  test?: { code: string; math: string; ok: boolean };
  /** What an assignment did, with the numbers. */
  act?: string;
  /** A second list the program builds (merge's out, counting's c), shown as code. */
  aux?: string;
};
export type CodeRun = { lines: string[]; frames: CodeFrame[]; compares: number; writes: number; result?: string };

const MONO = `font-family="Consolas, 'DejaVu Sans Mono', 'Courier New', monospace"`;
const v = (x: number) => nt(x);
const list = (xs: number[]) => `[${xs.map(v).join(", ")}]`;

/** A tracer: frames are pushed as the program runs, each with a copy of the array. */
class Run {
  frames: CodeFrame[] = [];
  compares = 0;
  writes = 0;
  a: number[];
  lines: string[];
  constructor(a: number[], lines: string[]) {
    this.a = a;
    this.lines = lines;
  }
  at(line: number, ptr: [string, number][], vars: [string, string | number][], more: Partial<CodeFrame> = {}) {
    this.frames.push({ line, a: this.a.slice(), ptr, vars: vars.map(([k, x]) => [k, typeof x === "number" ? v(x) : x]), ...more });
  }
  /** a[x] < a[y] and the like, counted as a comparison. */
  test(code: string, l: number, op: string, r: number, ok: boolean): CodeFrame["test"] {
    this.compares++;
    return { code, math: `${v(l)} ${op} ${v(r)}`, ok };
  }
  swap(i: number, j: number) {
    [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
    if (i !== j) this.writes += 2;
  }
}

// ---------- sorts ----------

export const SORT_CODE: Record<SortSpec["algo"], string[]> = {
  bubble: [
    "for k in range(1, n):",
    "    swapped = False",
    "    for j in range(n - k):",
    "        if a[j] > a[j + 1]:",
    "            a[j], a[j + 1] = a[j + 1], a[j]",
    "            swapped = True",
    "    if not swapped: break",
    "return a",
  ],
  insertion: [
    "for i in range(1, n):",
    "    key = a[i]",
    "    j = i - 1",
    "    while j >= 0 and a[j] > key:",
    "        a[j + 1] = a[j]",
    "        j -= 1",
    "    a[j + 1] = key",
    "return a",
  ],
  shell: [
    "gap = n // 2",
    "while gap > 0:",
    "    for i in range(gap, n):",
    "        key = a[i]",
    "        j = i",
    "        while j >= gap and a[j - gap] > key:",
    "            a[j] = a[j - gap]",
    "            j -= gap",
    "        a[j] = key",
    "    gap //= 2",
    "return a",
  ],
  selection: [
    "for i in range(n - 1):",
    "    m = i",
    "    for j in range(i + 1, n):",
    "        if a[j] < a[m]:",
    "            m = j",
    "    a[i], a[m] = a[m], a[i]",
    "return a",
  ],
  quick: [
    "def quick(lo, hi):",
    "    if lo >= hi: return",
    "    p = a[hi]; i = lo",
    "    for j in range(lo, hi):",
    "        if a[j] < p:",
    "            a[i], a[j] = a[j], a[i]; i += 1",
    "    a[i], a[hi] = a[hi], a[i]",
    "    quick(lo, i - 1); quick(i + 1, hi)",
    "quick(0, n - 1)",
  ],
  merge: [
    "def sort(lo, hi):",
    "    if hi - lo < 2: return",
    "    mid = (lo + hi) // 2",
    "    sort(lo, mid); sort(mid, hi)",
    "    i, j, out = lo, mid, []",
    "    while i < mid and j < hi:",
    "        if a[i] <= a[j]: out.append(a[i]); i += 1",
    "        else: out.append(a[j]); j += 1",
    "    out += a[i:mid] + a[j:hi]",
    "    a[lo:hi] = out",
    "sort(0, n)",
  ],
  heap: [
    "def sift(i, end):",
    "    while True:",
    "        l, r, big = 2 * i + 1, 2 * i + 2, i",
    "        if l < end and a[l] > a[big]: big = l",
    "        if r < end and a[r] > a[big]: big = r",
    "        if big == i: return",
    "        a[i], a[big] = a[big], a[i]; i = big",
    "for i in range(n // 2 - 1, -1, -1): sift(i, n)",
    "for end in range(n - 1, 0, -1):",
    "    a[0], a[end] = a[end], a[0]; sift(0, end)",
  ],
  counting: [
    "c = [0] * (max(a) + 1)",
    "for x in a: c[x] += 1",
    "k = 0",
    "for x in range(len(c)):",
    "    for _ in range(c[x]):",
    "        a[k] = x; k += 1",
    "return a",
  ],
};

export function sortCode(algo: SortSpec["algo"], a0: number[]): CodeRun {
  const R = new Run(a0.slice(), SORT_CODE[algo]);
  const { a } = R;
  const n = a.length;
  const N: [string, number] = ["n", n];
  if (algo === "bubble") {
    for (let k = 1; k < n; k++) {
      let swapped = false;
      R.at(1, [], [N, ["k", k], ["swapped", "False"]]);
      for (let j = 0; j < n - k; j++) {
        const t = R.test("a[j] > a[j + 1]", a[j], ">", a[j + 1], a[j] > a[j + 1]);
        R.at(3, [["j", j], ["j+1", j + 1]], [N, ["k", k], ["j", j], ["swapped", swapped ? "True" : "False"]], { test: t });
        if (t!.ok) {
          R.swap(j, j + 1);
          swapped = true;
          R.at(4, [["j", j], ["j+1", j + 1]], [N, ["k", k], ["j", j], ["swapped", "True"]], { act: `a[${j}], a[${j + 1}] = ${v(a[j])}, ${v(a[j + 1])}` });
        }
      }
      if (!swapped) {
        R.at(6, [], [N, ["k", k], ["swapped", "False"]], { act: "break" });
        break;
      }
    }
  } else if (algo === "insertion" || algo === "shell") {
    const shell = algo === "shell";
    const L = shell ? { key: 3, test: 5, shift: 6, place: 8 } : { key: 1, test: 3, shift: 4, place: 6 };
    const gaps: number[] = [];
    if (shell) for (let g = n >> 1; g >= 1; g >>= 1) gaps.push(g);
    else gaps.push(1);
    for (const g of gaps) {
      const G: [string, number][] = shell ? [["gap", g]] : [];
      if (shell) R.at(1, [], [N, ...G], { test: { code: "gap > 0", math: `${g} > 0`, ok: true } });
      for (let i = g; i < n; i++) {
        const key = a[i];
        let j = shell ? i : i - 1;
        R.at(L.key, [["i", i]], [N, ...G, ["i", i], ["key", key]], { act: `key = a[${i}] = ${v(key)}` });
        // shell: j is where the key may go, a[j − gap] the one compared; insertion: j is the one compared.
        const cmp = () => (shell ? j - g : j);
        for (;;) {
          const k = cmp();
          const ptr: [string, number][] = [["i", i], ...(k >= 0 ? [[shell ? "j-gap" : "j", k] as [string, number]] : []), ...(shell ? [["j", j] as [string, number]] : [])];
          const vars: [string, string | number][] = [N, ...G, ["i", i], ["j", j], ["key", key]];
          if (k < 0) {
            R.at(L.test, ptr, vars, { test: { code: shell ? "j >= gap" : "j >= 0", math: shell ? `${j} >= ${g}` : `${j} >= 0`, ok: false } });
            break;
          }
          const t = R.test(shell ? "a[j - gap] > key" : "a[j] > key", a[k], ">", key, a[k] > key);
          R.at(L.test, ptr, vars, { test: t });
          if (!t!.ok) break;
          a[k + g] = a[k];
          R.writes++;
          R.at(L.shift, ptr, vars, { act: shell ? `a[${j}] = a[${k}] = ${v(a[k])}` : `a[${k + 1}] = a[${k}] = ${v(a[k])}` });
          j -= g;
        }
        const to = shell ? j : j + 1;
        a[to] = key;
        R.writes++;
        R.at(L.place, [["i", i], [shell ? "j" : "j+1", to]], [N, ...G, ["i", i], ["j", j], ["key", key]], { act: `a[${to}] = key = ${v(key)}` });
      }
    }
  } else if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      R.at(1, [["i", i], ["m", m]], [N, ["i", i], ["m", m]], { act: `m = ${i}` });
      for (let j = i + 1; j < n; j++) {
        const t = R.test("a[j] < a[m]", a[j], "<", a[m], a[j] < a[m]);
        R.at(3, [["i", i], ["m", m], ["j", j]], [N, ["i", i], ["m", m], ["j", j]], { test: t });
        if (t!.ok) {
          m = j;
          R.at(4, [["i", i], ["m", m], ["j", j]], [N, ["i", i], ["m", m], ["j", j]], { act: `m = ${j}` });
        }
      }
      R.swap(i, m);
      R.at(5, [["i", i], ["m", m]], [N, ["i", i], ["m", m]], { act: `a[${i}], a[${m}] = ${v(a[i])}, ${v(a[m])}` });
    }
  } else if (algo === "quick") {
    const calls: string[] = [];
    const qs = (lo: number, hi: number) => {
      calls.push(`quick(${lo}, ${hi})`);
      const stack = calls.join(" → ");
      const base: [string, string | number][] = [["calls", stack], ["lo", lo], ["hi", hi]];
      if (lo >= hi) {
        R.at(1, lo === hi ? [["lo", lo], ["hi", hi]] : [], base, { test: { code: "lo >= hi", math: `${lo} >= ${hi}`, ok: true }, act: "return" });
        calls.pop();
        return;
      }
      const p = a[hi];
      let i = lo;
      R.at(2, [["lo", lo], ["hi", hi], ["i", i]], [...base, ["p", p], ["i", i]], { act: `p = a[${hi}] = ${v(p)}; i = ${lo}` });
      for (let j = lo; j < hi; j++) {
        const t = R.test("a[j] < p", a[j], "<", p, a[j] < p);
        const ptr = (): [string, number][] => [["lo", lo], ["hi", hi], ["i", i], ["j", j]];
        R.at(4, ptr(), [...base, ["p", p], ["i", i], ["j", j]], { test: t });
        if (t!.ok) {
          R.swap(i, j);
          i++;
          R.at(5, ptr(), [...base, ["p", p], ["i", i], ["j", j]], { act: `a[${i - 1}], a[${j}] = ${v(a[i - 1])}, ${v(a[j])}; i = ${i}` });
        }
      }
      R.swap(i, hi);
      R.at(6, [["lo", lo], ["hi", hi], ["i", i]], [...base, ["p", p], ["i", i]], { act: `a[${i}], a[${hi}] = ${v(a[i])}, ${v(a[hi])}` });
      qs(lo, i - 1);
      qs(i + 1, hi);
      calls.pop();
    };
    qs(0, n - 1);
  } else if (algo === "merge") {
    const calls: string[] = [];
    const sort = (lo: number, hi: number) => {
      calls.push(`sort(${lo}, ${hi})`);
      const base: [string, string | number][] = [["calls", calls.join(" → ")], ["lo", lo], ["hi", hi]];
      if (hi - lo < 2) {
        calls.pop();
        return;
      }
      const mid = (lo + hi) >> 1;
      sort(lo, mid);
      sort(mid, hi);
      let i = lo;
      let j = mid;
      const out: number[] = [];
      const ptr = (): [string, number][] => [["lo", lo], ["mid", mid], ["i", i], ...(j < hi ? [["j", j] as [string, number]] : []), ...(hi < n ? [["hi", hi] as [string, number]] : [])];
      R.at(4, ptr(), [...base, ["mid", mid], ["i", i], ["j", j]], { aux: "out = []" });
      while (i < mid && j < hi) {
        const t = R.test("a[i] <= a[j]", a[i], "<=", a[j], a[i] <= a[j]);
        const took = t!.ok ? i : j;
        out.push(a[took]);
        if (t!.ok) i++;
        else j++;
        R.at(t!.ok ? 6 : 7, ptr(), [...base, ["mid", mid], ["i", i], ["j", j]], { test: t, act: `out.append(a[${took}]) → ${v(a[took])}`, aux: `out = ${list(out)}` });
      }
      out.push(...a.slice(i, mid), ...a.slice(j, hi));
      R.at(8, ptr(), [...base, ["mid", mid], ["i", i], ["j", j]], { aux: `out = ${list(out)}` });
      out.forEach((x, k) => (a[lo + k] = x));
      R.writes += out.length;
      R.at(9, [["lo", lo], ...(hi < n ? [["hi", hi] as [string, number]] : [])], [...base, ["mid", mid]], { act: `a[${lo}:${hi}] = ${list(out)}`, aux: `out = ${list(out)}` });
      calls.pop();
    };
    sort(0, n);
  } else if (algo === "heap") {
    const sift = (i0: number, end: number) => {
      let i = i0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let big = i;
        const inside = (k: number): [string, number][] => (k < n ? [[k === l ? "l" : "r", k]] : []);
        const ptr = (): [string, number][] => [["i", i], ...inside(l), ...inside(r), ...(end < n ? [["end", end] as [string, number]] : [])];
        const vars = (): [string, string | number][] => [N, ["end", end], ["i", i], ["l", l], ["r", r], ["big", big]];
        R.at(2, ptr(), vars());
        if (l < end) {
          const t = R.test("a[l] > a[big]", a[l], ">", a[big], a[l] > a[big]);
          if (t!.ok) big = l;
          R.at(3, ptr(), vars(), { test: t });
        } else R.at(3, ptr(), vars(), { test: { code: "l < end", math: `${l} < ${end}`, ok: false } });
        if (r < end) {
          const t = R.test("a[r] > a[big]", a[r], ">", a[big], a[r] > a[big]);
          if (t!.ok) big = r;
          R.at(4, ptr(), vars(), { test: t });
        } else R.at(4, ptr(), vars(), { test: { code: "r < end", math: `${r} < ${end}`, ok: false } });
        if (big === i) {
          R.at(5, ptr(), vars(), { test: { code: "big == i", math: `${big} == ${i}`, ok: true }, act: "return" });
          return;
        }
        R.swap(i, big);
        R.at(6, ptr(), vars(), { act: `a[${i}], a[${big}] = ${v(a[i])}, ${v(a[big])}; i = ${big}` });
        i = big;
      }
    };
    for (let i = (n >> 1) - 1; i >= 0; i--) {
      R.at(7, [["i", i]], [N, ["i", i]], { act: `sift(${i}, ${n})` });
      sift(i, n);
    }
    for (let end = n - 1; end >= 1; end--) {
      R.swap(0, end);
      R.at(9, [["end", end]], [N, ["end", end]], { act: `a[0], a[${end}] = ${v(a[0])}, ${v(a[end])}; sift(0, ${end})` });
      sift(0, end);
    }
  } else {
    const c = Array(Math.max(...a) + 1).fill(0);
    R.at(0, [], [N], { aux: `c = ${list(c)}` });
    a.forEach((x, k) => {
      c[x]++;
      R.at(1, [["x", k]], [N, ["x", x]], { act: `c[${v(x)}] += 1 → ${c[x]}`, aux: `c = ${list(c)}` });
    });
    let k = 0;
    for (let x = 0; x < c.length; x++)
      for (let t = 0; t < c[x]; t++) {
        a[k] = x;
        R.writes++;
        R.at(5, [["k", k]], [N, ["x", x], ["k", k + 1]], { act: `a[${k}] = ${v(x)}; k = ${k + 1}`, aux: `c = ${list(c)}` });
        k++;
      }
  }
  R.at(R.lines.length - 1, [], [N], { act: algo === "quick" || algo === "merge" || algo === "heap" ? undefined : `return ${list(a)}` });
  return { lines: R.lines, frames: R.frames, compares: R.compares, writes: R.writes, result: list(a) };
}

// ---------- searches ----------

export const SEARCH_CODE: Record<"binary" | "linear", string[]> = {
  binary: [
    "lo, hi = 0, n - 1",
    "while lo <= hi:",
    "    mid = (lo + hi) // 2",
    "    if a[mid] == x: return mid",
    "    if a[mid] < x: lo = mid + 1",
    "    else: hi = mid - 1",
    "return -1",
  ],
  linear: ["for i in range(n):", "    if a[i] == x: return i", "return -1"],
};

export function searchCode(algo: "binary" | "linear", a: number[], x: number): CodeRun & { found: number } {
  const R = new Run(a.slice(), SEARCH_CODE[algo]);
  const n = a.length;
  const N: [string, number] = ["n", n];
  const X: [string, number] = ["x", x];
  let found = -1;
  if (algo === "binary") {
    let lo = 0;
    let hi = n - 1;
    const ptr = (mid?: number): [string, number][] => [...(lo < n ? [["lo", lo] as [string, number]] : []), ...(mid === undefined ? [] : [["mid", mid] as [string, number]]), ...(hi >= 0 ? [["hi", hi] as [string, number]] : [])];
    R.at(0, ptr(), [N, X, ["lo", lo], ["hi", hi]], { act: `lo, hi = 0, ${n - 1}` });
    for (;;) {
      if (lo > hi) {
        R.at(1, ptr(), [N, X, ["lo", lo], ["hi", hi]], { test: { code: "lo <= hi", math: `${lo} <= ${hi}`, ok: false } });
        R.at(6, ptr(), [N, X, ["lo", lo], ["hi", hi]], { act: "return -1" });
        break;
      }
      R.at(1, ptr(), [N, X, ["lo", lo], ["hi", hi]], { test: { code: "lo <= hi", math: `${lo} <= ${hi}`, ok: true } });
      const mid = (lo + hi) >> 1;
      R.at(2, ptr(mid), [N, X, ["lo", lo], ["hi", hi], ["mid", mid]], { act: `mid = (${lo} + ${hi}) // 2 = ${mid}` });
      const eq = R.test("a[mid] == x", a[mid], "==", x, a[mid] === x);
      R.at(3, ptr(mid), [N, X, ["lo", lo], ["hi", hi], ["mid", mid]], { test: eq, act: eq!.ok ? `return ${mid}` : undefined });
      if (eq!.ok) {
        found = mid;
        break;
      }
      const lt = R.test("a[mid] < x", a[mid], "<", x, a[mid] < x);
      if (lt!.ok) lo = mid + 1;
      else hi = mid - 1;
      R.at(lt!.ok ? 4 : 5, ptr(mid), [N, X, ["lo", lo], ["hi", hi], ["mid", mid]], { test: lt, act: lt!.ok ? `lo = ${mid} + 1 = ${lo}` : `hi = ${mid} - 1 = ${hi}` });
    }
  } else {
    for (let i = 0; i < n; i++) {
      const t = R.test("a[i] == x", a[i], "==", x, a[i] === x);
      R.at(1, [["i", i]], [N, X, ["i", i]], { test: t, act: t!.ok ? `return ${i}` : undefined });
      if (t!.ok) {
        found = i;
        break;
      }
    }
    if (found < 0) R.at(2, [], [N, X], { act: "return -1" });
  }
  return { lines: R.lines, frames: R.frames, compares: R.compares, writes: 0, found };
}

// ---------- drawing ----------

const mono = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${MONO} font-size="${o.size ?? 12.5}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""} xml:space="preserve">${esc(s)}</text>`;

/**
 * One frame: the array with its pointers, the program with ▶ at the line, the variables, and the test or assignment.
 * Colour only repeats the names: each variable has its own (codeStyle), on its ↑, its cell's edge, and in the code.
 */
export function drawFrame(run: CodeRun, f: CodeFrame, words: AlgoWords["code"], names: Names = {}): { svg: string; h: number } {
  const hl = (s: string) => tspans(highlight(s, names));
  const nm = (s: string) => rename(s, names);
  const n = f.a.length;
  const cw = Math.min(40, Math.floor((W - 32) / n));
  const x0 = 16 + (W - 32 - cw * n) / 2;
  const parts: string[] = [];
  const at = new Map<number, string[]>();
  for (const [name, i] of f.ptr) if (i >= 0 && i < n) at.set(i, [...(at.get(i) ?? []), name]);
  // The array: a = [ … ], the index over each cell; a cell something points at is edged in that pointer's colour.
  parts.push(mono(x0 - 8, 37, "a =", { anchor: "end", size: 13, color: "#495057", bold: true }));
  parts.push(`<rect x="${r2(x0 - 3)}" y="15" width="${cw * n + 6}" height="34" rx="7" fill="#f1f3f5"/>`);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * cw;
    const ptr = at.get(i)?.[0];
    parts.push(mono(x + cw / 2, 10, String(i), { size: 10.5, color: "#adb5bd", anchor: "middle" }));
    parts.push(`<rect x="${r2(x + 1.5)}" y="18" width="${cw - 3}" height="28" rx="5" fill="#ffffff" stroke="${ptr ? varColor(ptr) : "#ced4da"}" stroke-width="${ptr ? 2.2 : 1.1}"/>`);
    parts.push(mono(x + cw / 2, 37, v(f.a[i]), { size: cw < 30 ? 11.5 : 13.5, anchor: "middle", bold: true }));
  }
  // The pointers: ↑ and the names of the variables holding that index, stacked, each in its colour.
  let deepest = 0;
  for (const [i, ptrNames] of at) {
    const cx = x0 + i * cw + cw / 2;
    parts.push(mono(cx, 62, "↑", { size: 14, anchor: "middle", bold: true, color: varColor(ptrNames[0]) }));
    // An alias wider than the cell gets smaller, so neighbours' names don't run into each other.
    ptrNames.forEach((p, k) => {
      const s = nm(p);
      parts.push(mono(cx, 76 + k * 13, s, { size: Math.min(11.5, (cw + 10) / (0.6 * s.length)), anchor: "middle", bold: true, color: varColor(p) }));
    });
    deepest = Math.max(deepest, ptrNames.length);
  }
  let y = 62 + (deepest ? 12 + deepest * 13 : 0) + 6;
  if (f.aux) {
    parts.push(`<text x="${r2(x0 - 8 - 3 * 7.5)}" y="${r2(y + 12)}" ${MONO} font-size="13" xml:space="preserve">${hl(f.aux)}</text>`);
    y += 24;
  }
  // The program like an editor: line numbers, highlighting, the line about to run on a band with ▶. Long aliases make
  // a line longer, so the font comes down until the longest fits the box.
  const top = y + 8;
  const lh = 18;
  const codeW = 392;
  const longest = Math.max(...run.lines.map((ln) => nm(ln).length));
  const fs = Math.min(12, r2((codeW - 56) / (0.6 * longest)));
  const boxH = run.lines.length * lh + 14;
  parts.push(`<rect x="16" y="${top}" width="${codeW}" height="${boxH}" rx="8" fill="#f8f9fa" stroke="#e9ecef"/>`);
  parts.push(`<rect x="16" y="${top}" width="30" height="${boxH}" rx="8" fill="#f1f3f5"/>`);
  run.lines.forEach((ln, k) => {
    const yy = top + 20 + k * lh;
    const here = k === f.line;
    if (here) parts.push(`<rect x="46" y="${yy - 13}" width="${codeW - 30}" height="${lh}" fill="#e7f5ff"/><rect x="46" y="${yy - 13}" width="3" height="${lh}" fill="${C.blue}"/>`);
    parts.push(mono(40, yy, String(k + 1), { size: 10.5, color: here ? C.blue : "#adb5bd", anchor: "end", bold: here }));
    if (here) parts.push(mono(52, yy, "▶", { size: 11, color: C.blue }));
    parts.push(`<text x="64" y="${yy}" ${MONO} font-size="${fs}"${here ? ` font-weight="700"` : ""} xml:space="preserve">${hl(ln)}</text>`);
  });
  // The variables: each name in its colour, its value beside it.
  const vx = 16 + codeW + 14;
  parts.push(`<rect x="${vx - 6}" y="${top}" width="${W - 16 - vx + 6}" height="${boxH}" rx="8" fill="#fff9db" stroke="#ffec99"/>`);
  parts.push(mono(vx + 2, top + 16, words.vars, { size: 10.5, color: "#ae8c00", bold: true }));
  let vy = top + 34;
  const max = Math.floor((W - 22 - vx) / 7.2);
  for (const [k0, val0] of f.vars) {
    const k = nm(k0);
    const val = nm(val0);
    // The call stack can be long: it wraps between calls, the later lines indented.
    const lines: string[] = [];
    const bits = val.split(" → ");
    let ln = bits[0];
    for (const b of bits.slice(1)) {
      if ((`${k} = ${ln} → ${b}`).length > max) lines.push(ln), (ln = `→ ${b}`);
      else ln += ` → ${b}`;
    }
    lines.push(ln);
    lines.forEach((s, i) => {
      const lead = i === 0 ? `<tspan fill="${varColor(k0)}" font-weight="700">${esc(k)}</tspan><tspan fill="#868e96"> = </tspan>` : `<tspan>${" ".repeat(k.length + 3)}</tspan>`;
      parts.push(`<text x="${vx + 2}" y="${vy}" ${MONO} font-size="12" fill="${C.ink}" xml:space="preserve">${lead}<tspan font-weight="700">${esc(s)}</tspan></text>`);
      vy += 16;
    });
  }
  y = Math.max(top + boxH, vy - 4) + 14;
  // The test with the numbers in (True green, False red), and what the line did.
  const said: string[] = [];
  if (f.test) {
    const ok = f.test.ok;
    said.push(
      `<tspan fill="#868e96">test  </tspan>${hl(f.test.code)}<tspan fill="#868e96">  →  </tspan><tspan font-weight="700">${esc(f.test.math)}</tspan><tspan fill="#868e96">  →  </tspan><tspan fill="${ok ? C.green : C.red}" font-weight="700">${ok ? "True" : "False"}</tspan>`,
    );
  }
  if (f.act) said.push(`<tspan fill="#868e96">do    </tspan>${hl(f.act)}`);
  if (said.length) {
    parts.push(`<rect x="16" y="${y}" width="${W - 32}" height="${said.length * 20 + 10}" rx="8" fill="#ffffff" stroke="#dee2e6"/>`);
    said.forEach((s, k) => parts.push(`<text x="28" y="${y + 20 + k * 20}" ${MONO} font-size="13" fill="${C.ink}" xml:space="preserve">${s}</text>`));
    y += said.length * 20 + 10 + 6;
  }
  return { svg: parts.join(""), h: y };
}

export function renderSortCode(spec: SortSpec, a0: number[], w: AlgoWords, st: Steps): RenderedSvg {
  if (spec.algo === "counting" && a0.some((x) => !Number.isInteger(x) || x < 0 || x > 40)) throw new Error(fill(w.code.countingRange, {}));
  const names = namesOf(spec.names, w);
  const run = sortCode(spec.algo, a0);
  const k = 1 + st.count(run.frames.length - 1);
  const f = run.frames[k - 1];
  const d = drawFrame(run, f, w.code, names);
  const caps: Caption[] = [
    { text: fill(w.code.step, { k: k - 1, n: run.frames.length - 1 }), color: "#495057" },
    ...st.final({ text: fill(w.code.sortStats, { c: run.compares, s: run.writes, a: run.result ?? "" }), color: C.blue }),
  ];
  const sorted = a0.slice().sort((x, y) => x - y);
  return compose(`${tnList(a0)} \\;\\longrightarrow\\; ${tnList(sorted)}`, d.svg, d.h, caps);
}

export function renderSearchCode(spec: SearchSpec, w: AlgoWords, st: Steps): RenderedSvg {
  const input = parseNums(spec.data, w, 16);
  const x = parseNum(spec.target, w);
  const names = namesOf(spec.names, w);
  const binary = spec.algo === "binary";
  const a = binary ? input.slice().sort((p, q) => p - q) : input;
  const run = searchCode(binary ? "binary" : "linear", a, x);
  const k = 1 + st.count(run.frames.length - 1);
  const d = drawFrame(run, run.frames[k - 1], w.code, names);
  const caps: Caption[] = [];
  if (binary && a.some((y, i) => y !== input[i])) caps.push({ text: w.sortedFirst, color: C.orange });
  caps.push({ text: fill(w.code.step, { k: k - 1, n: run.frames.length - 1 }), color: "#495057" });
  // Counted as the cells view counts them: one per look at a[mid] (or a[i]).
  const looks = run.frames.filter((fr) => fr.test?.code.endsWith("== x")).length;
  caps.push(...st.final(run.found >= 0 ? { text: fill(w.found, { t: nt(x), i: run.found, k: looks }), color: C.green } : { text: fill(w.notFound, { t: nt(x), k: looks }), color: C.red }));
  return compose(`x = ${tn(x)}`, d.svg, d.h, caps);
}

/** The spec's aliases, or the part that is not one named in the error. */
function namesOf(text: string | undefined, w: AlgoWords): Names {
  const { names, bad } = parseNames(text);
  if (bad !== undefined) throw new Error(fill(w.code.badName, { s: bad, n: NAME_MAX }));
  return names;
}

const tnList = (a: number[]) => `\\left[\\,${a.map((x) => tn(x)).join(",\\ ")}\\,\\right]`;
