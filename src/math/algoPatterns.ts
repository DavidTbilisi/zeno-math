// Patterns for the Algorithms tool: ways to walk an array once instead of trying every pair or every
// subarray. Two pointers (a pair with a given sum, the container that holds the most water, removing
// duplicates in place, a three-way partition), fast and slow pointers (Floyd's cycle finding), sliding
// windows (a fixed size, the longest run without a repeat, the shortest with a big enough sum), prefix
// sums with a map, a monotonic stack (the next greater value) and Kadane's maximum subarray.
import type { AlgoWords, PatternSpec, Steps } from "./algo";
import { drawRows, legendRow, parseNum, parseNums, renderScan, type Role, type Row } from "./algoArrays";
import { C, compose, fill, nt, tn, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

type PW = AlgoWords["pattern"];
type Legend = { role: Role; text: string }[];
type Trace = { tex: string; rows: Row[]; caps: Caption[]; legend: Legend; bars?: boolean };

const rolesOf = (n: number, f: (i: number) => Role): Role[] => Array.from({ length: n }, (_, i) => f(i));
/** Pointer names under their cells; two pointers on one cell share it ("LM"). */
function marksOf(n: number, ptrs: [string, number][]): string[] {
  const m: string[] = Array(n).fill("");
  for (const [name, i] of ptrs) if (i >= 0 && i < n) m[i] += name;
  return m;
}
const span = (i: number, j: number) => (i === j ? `[${i}]` : `[${i}–${j}]`);
const plus = (x: number, y: number) => (y < 0 ? `${nt(x)} − ${nt(-y)}` : `${nt(x)} + ${nt(y)}`);

export function renderPattern(spec: PatternSpec, w: AlgoWords, st: Steps): RenderedSvg {
  if (spec.algo === "twoptr" || spec.algo === "window") return renderScan({ topic: "search", algo: spec.algo, data: spec.data, target: spec.target }, w, st);
  const p = w.pattern;
  const t = trace(spec, w, p);
  const n = t.rows[0].vals.length;
  const body = drawRows(st.cut(t.rows), n, 0, 380, t.bars);
  const leg = legendRow(t.legend, body.h + 8);
  // The answers wait for the last step; the explanation is always there.
  const caps = [...st.final(...t.caps), { text: p.info[spec.algo], color: "#495057" }];
  return compose(t.tex, body.svg + leg.svg, body.h + 8 + leg.h, caps);
}

function trace(spec: PatternSpec, w: AlgoWords, p: PW): Trace {
  switch (spec.algo) {
    case "water":
      return water(parseNums(spec.data, w, 16), spec, w, p);
    case "dedupe":
      return dedupe(parseNums(spec.data, w, 16), p);
    case "partition":
      return partition(parseNums(spec.data, w, 16), parseNum(spec.target, w), p);
    case "cycle":
      return cycle(parseNums(spec.data, w, 16, true), p);
    case "distinct":
      return distinct(spec.data, w, p);
    case "minsum":
      return minsum(parseNums(spec.data, w, 16), parseNum(spec.target, w, (v) => v > 0), p);
    case "prefix":
      return prefix(parseNums(spec.data, w, 16), parseNum(spec.target, w), p);
    case "mono":
      return mono(parseNums(spec.data, w, 16), p);
    case "kadane":
      return kadane(parseNums(spec.data, w, 16), p);
    default:
      throw new Error(fill(w.badList, { s: spec.data }));
  }
}

/** Two pointers from the ends: the area is limited by the shorter line, so the shorter one moves in. */
function water(a: number[], spec: PatternSpec, w: AlgoWords, p: PW): Trace {
  const n = a.length;
  if (n < 2) throw new Error(fill(w.badList, { s: spec.data }));
  if (a.some((v) => v < 0)) throw new Error(p.nonNegative);
  const rows: Row[] = [];
  let [l, r] = [0, n - 1];
  let best = { l, r, area: -1 };
  while (l < r) {
    const area = Math.min(a[l], a[r]) * (r - l);
    const better = area > best.area;
    if (better) best = { l, r, area };
    const [cl, cr] = [l, r];
    rows.push({
      vals: a,
      roles: rolesOf(n, (i) => (i === cl || i === cr ? "compare" : i < cl || i > cr ? "idle" : "plain")),
      marks: marksOf(n, [["L", l], ["R", r]]),
      note: `min(${nt(a[l])}, ${nt(a[r])}) × ${r - l} = ${nt(area)}${better ? `  ★` : ""}  →  ${a[l] <= a[r] ? "L + 1" : "R − 1"}`,
      noteColor: better ? C.green : undefined,
    });
    if (a[l] <= a[r]) l++;
    else r--;
  }
  rows.push({ vals: a, roles: rolesOf(n, (i) => (i === best.l || i === best.r ? "sorted" : i > best.l && i < best.r ? "plain" : "idle")), note: `max = ${nt(best.area)}`, noteColor: C.green });
  return {
    tex: `\\text{area} = \\min(a_L,\\ a_R)\\cdot(R - L)`,
    rows,
    bars: true,
    caps: [{ text: fill(p.waterBest, { i: best.l, j: best.r, h: nt(Math.min(a[best.l], a[best.r])), w: best.r - best.l, s: nt(best.area) }), color: C.green }],
    legend: [{ role: "compare", text: p.legend.lines }, { role: "idle", text: p.legend.ruledOut }, { role: "sorted", text: p.legend.best }],
  };
}

/** Slow and fast pointers in one direction: W ends the kept part, R reads ahead. */
function dedupe(input: number[], p: PW): Trace {
  const a = input.slice().sort((x, y) => x - y);
  const n = a.length;
  const caps: Caption[] = [];
  if (!a.every((v, i) => v === input[i])) caps.push({ text: p.sortedFirst, color: C.orange });
  const rows: Row[] = [{ vals: a.slice(), roles: rolesOf(n, (i) => (i === 0 ? "sorted" : "plain")), marks: marksOf(n, [["W", 1], ["R", 1]]), note: p.dedupeStart }];
  let k = 1;
  for (let r = 1; r < n; r++) {
    const marks = marksOf(n, [["W", k], ["R", r]]);
    const [v, prev] = [a[r], a[k - 1]];
    if (v !== prev) {
      const to = k;
      a[k++] = v;
      rows.push({
        vals: a.slice(),
        roles: rolesOf(n, (i) => (i === to ? "key" : i < k ? "sorted" : i === r ? "compare" : i < r ? "idle" : "plain")),
        marks,
        moves: to !== r ? [[r, to]] : undefined,
        note: fill(p.dedupeKeep, { v: nt(v), p: nt(prev), w: to }),
      });
    } else
      rows.push({ vals: a.slice(), roles: rolesOf(n, (i) => (i < k ? "sorted" : i === r ? "compare" : i < r ? "idle" : "plain")), marks, note: fill(p.dedupeSkip, { v: nt(v), p: nt(prev) }) });
  }
  rows.push({ vals: a.slice(), roles: rolesOf(n, (i) => (i < k ? "sorted" : "idle")), note: fill(p.distinctCount, { k }), noteColor: C.green });
  caps.push({ text: fill(p.dedupeDone, { k, j: k - 1, list: a.slice(0, k).map(nt).join(", ") }), color: C.green });
  return {
    tex: `a_R \\ne a_{W-1} \\,\\Rightarrow\\, a_W \\leftarrow a_R,\\ W \\leftarrow W + 1`,
    rows,
    caps,
    legend: [{ role: "sorted", text: p.legend.kept }, { role: "compare", text: p.legend.read }, { role: "idle", text: p.legend.free }],
  };
}

/** The Dutch national flag: [0, L) smaller than the pivot, [L, M) equal, (H, n) larger, [M, H] not seen yet. */
function partition(input: number[], pv: number, p: PW): Trace {
  const a = input.slice();
  const n = a.length;
  let [lo, mid, hi] = [0, 0, n - 1];
  let swaps = 0;
  const region = (i: number): Role => (i < lo ? "key" : i < mid ? "pivot" : i > hi ? "min" : "plain");
  const state = () => ({ vals: a.slice(), roles: rolesOf(n, region), marks: marksOf(n, [["L", lo], ["M", mid], ["H", hi]]) });
  const rows: Row[] = [{ ...state(), note: fill(p.partStart, { p: nt(pv) }) }];
  while (mid <= hi) {
    const v = a[mid];
    let moves: [number, number][] | undefined;
    let note: string;
    if (v < pv) {
      if (lo !== mid) ([a[lo], a[mid]] = [a[mid], a[lo]]), (moves = [[mid, lo], [lo, mid]]), swaps++;
      note = fill(lo !== mid ? p.partLess : p.partLessHere, { v: nt(v), p: nt(pv) });
      lo++;
      mid++;
    } else if (v === pv) {
      note = fill(p.partEqual, { v: nt(v), p: nt(pv) });
      mid++;
    } else {
      if (mid !== hi) ([a[mid], a[hi]] = [a[hi], a[mid]]), (moves = [[mid, hi], [hi, mid]]), swaps++;
      note = fill(p.partMore, { v: nt(v), p: nt(pv) });
      hi--;
    }
    rows.push({ ...state(), moves, note });
  }
  const eq = a.filter((v) => v === pv).length;
  return {
    tex: `p = ${tn(pv)}:\\quad a_{[0,\\,L)} < p,\\quad a_{[L,\\,M)} = p,\\quad a_{(H,\\,n)} > p`,
    rows,
    caps: [{ text: fill(p.partDone, { lt: lo, eq, gt: n - lo - eq, p: nt(pv), k: rows.length - 1, s: swaps }), color: C.green }],
    legend: [{ role: "key", text: p.legend.less }, { role: "pivot", text: p.legend.equal }, { role: "min", text: p.legend.greater }, { role: "plain", text: p.legend.unknown }],
  };
}

/** Floyd: every value is the index of the next cell. H gains a cell a step on T inside the loop, so they meet. */
function cycle(a: number[], p: PW): Trace {
  const n = a.length;
  if (a.some((v) => v < 0 || v >= n)) throw new Error(fill(p.badNext, { n: n - 1 }));
  const path: number[] = [];
  const seen = new Set<number>();
  for (let x = 0; !seen.has(x); x = a[x]) seen.add(x), path.push(x);
  const roles = (pairs: [number, Role][]) => rolesOf(n, (i) => pairs.find(([j]) => j === i)?.[1] ?? (seen.has(i) ? "plain" : "idle"));
  const rows: Row[] = [{ vals: a, roles: roles([[0, "sorted"]]), marks: marksOf(n, [["T", 0], ["H", 0]]), note: p.cycleStart }];
  let [s, h, k] = [0, 0, 0];
  do {
    const h1 = a[h];
    s = a[s];
    h = a[h1];
    k++;
    rows.push({
      vals: a,
      roles: roles(s === h ? [[s, "sorted"]] : [[s, "key"], [h, "compare"]]),
      marks: marksOf(n, [["T", s], ["H", h]]),
      note: fill(p.cycleStep, { t: s, h1, h }) + (s === h ? `  ${p.meet}` : ""),
      noteColor: s === h ? C.green : undefined,
    });
  } while (s !== h);
  s = 0;
  if (s !== h) {
    rows.push({ vals: a, roles: roles([[0, "key"], [h, "compare"]]), marks: marksOf(n, [["S", 0], ["H", h]]), note: fill(p.phase2, { m: h }) });
    while (s !== h) {
      s = a[s];
      h = a[h];
      rows.push({
        vals: a,
        roles: roles(s === h ? [[s, "sorted"]] : [[s, "key"], [h, "compare"]]),
        marks: marksOf(n, [["S", s], ["H", h]]),
        note: fill(p.phase2Step, { s, h }) + (s === h ? `  ${p.entrance}` : ""),
        noteColor: s === h ? C.green : undefined,
      });
    }
  }
  const e = s;
  const loop = [e];
  for (let x = a[e]; x !== e; x = a[x]) loop.push(x);
  const inLoop = new Set(loop);
  rows.push({ vals: a, roles: rolesOf(n, (i) => (i === e ? "sorted" : inLoop.has(i) ? "pivot" : seen.has(i) ? "plain" : "idle")), note: fill(p.loop, { list: [...loop, e].join(" → ") }), noteColor: C.green });
  const caps: Caption[] = [{ text: fill(p.cycleFound, { e, len: loop.length, k }), color: C.green }];
  // Unless the walk starts inside the loop, two cells point at the entrance: one from the tail, one from the loop.
  if (e !== 0) caps.push({ text: fill(p.cycleDup, { i: path[path.indexOf(e) - 1], j: loop[loop.length - 1], e }), color: C.blue });
  return {
    tex: [...path, a[path[path.length - 1]]].join(" \\to ") + " \\to \\cdots",
    rows,
    caps,
    legend: [{ role: "key", text: p.legend.slow }, { role: "compare", text: p.legend.fast }, { role: "sorted", text: p.legend.meet }, { role: "pivot", text: p.legend.loop }, { role: "idle", text: p.legend.offPath }],
  };
}

/** A window that grows on the right and, when a character repeats, jumps its left end past the earlier copy. */
function distinct(data: string, w: AlgoWords, p: PW): Trace {
  const s = [...data.replace(/\s+/g, " ").trim()];
  if (!s.length) throw new Error(p.emptyText);
  if (s.length > 16) throw new Error(fill(w.tooMany, { n: 16 }));
  const n = s.length;
  const vals = s.map((c) => (c === " " ? "␣" : c));
  const last = new Map<string, number>();
  const rows: Row[] = [];
  let l = 0;
  let best = { l: 0, r: 0 };
  for (let r = 0; r < n; r++) {
    const j = last.get(s[r]);
    let note = "";
    if (j !== undefined && j >= l) (note = fill(p.repeat, { c: vals[r], j, l: j + 1 })), (l = j + 1);
    else note = fill(p.add, { c: vals[r] });
    last.set(s[r], r);
    const better = r - l > best.r - best.l;
    if (better) best = { l, r };
    const cl = l;
    rows.push({
      vals,
      roles: rolesOf(n, (i) => (i === r ? "compare" : i >= cl && i < r ? "key" : i === j && j < cl ? "min" : i < cl ? "idle" : "plain")),
      marks: marksOf(n, [["L", l], ["R", r]]),
      note: `${note}“${vals.slice(l, r + 1).join("")}” = ${r - l + 1}${better || r === 0 ? "  ★" : ""}`,
      noteColor: better || r === 0 ? C.green : undefined,
    });
  }
  rows.push({ vals, roles: rolesOf(n, (i) => (i >= best.l && i <= best.r ? "sorted" : "idle")), note: `max = ${best.r - best.l + 1}`, noteColor: C.green });
  return {
    tex: `L \\leftarrow \\max\\bigl(L,\\ \\text{last}[c] + 1\\bigr)`,
    rows,
    caps: [{ text: fill(p.distinctBest, { s: vals.slice(best.l, best.r + 1).join(""), i: best.l, j: best.r, k: best.r - best.l + 1 }), color: C.green }],
    legend: [{ role: "key", text: p.legend.window }, { role: "compare", text: p.legend.entering }, { role: "min", text: p.legend.repeat }, { role: "idle", text: p.legend.left }],
  };
}

/** A window that grows until its sum reaches the target, then shrinks from the left while it still does. */
function minsum(a: number[], t: number, p: PW): Trace {
  const n = a.length;
  if (a.some((v) => v <= 0)) throw new Error(p.positive);
  const rows: Row[] = [];
  let [l, sum] = [0, 0];
  let best: { l: number; r: number; s: number } | null = null;
  for (let r = 0; r < n; r++) {
    sum += a[r];
    const [cl, cs] = [l, sum];
    rows.push({
      vals: a,
      roles: rolesOf(n, (i) => (i === r ? "compare" : i >= cl && i < r ? "key" : i < cl ? "idle" : "plain")),
      marks: marksOf(n, [["L", l], ["R", r]]),
      note: `${fill(p.minAdd, { v: nt(a[r]), s: nt(sum) })} ${cs >= t ? "≥" : "<"} ${nt(t)}`,
    });
    while (sum >= t) {
      const better = !best || r - l < best.r - best.l;
      if (better) best = { l, r, s: sum };
      const ll = l;
      rows.push({
        vals: a,
        roles: rolesOf(n, (i) => (i >= ll && i <= r ? "sorted" : i < ll ? "idle" : "plain")),
        marks: marksOf(n, [["L", l], ["R", r]]),
        note: fill(p.minHit, { s: nt(sum), t: nt(t), k: r - l + 1, star: better ? "  ★" : "", v: nt(a[l]) }),
        noteColor: better ? C.green : undefined,
      });
      sum -= a[l++];
    }
  }
  const b = best;
  rows.push({ vals: a, roles: rolesOf(n, (i) => (b && i >= b.l && i <= b.r ? "sorted" : "idle")), note: b ? `min = ${b.r - b.l + 1}` : "—", noteColor: b ? C.green : C.red });
  return {
    tex: `a_L + \\cdots + a_R \\ge ${tn(t)}`,
    rows,
    caps: [b ? { text: fill(p.minBest, { t: nt(t), i: b.l, j: b.r, k: b.r - b.l + 1, s: nt(b.s) }), color: C.green } : { text: fill(p.minNone, { t: nt(t) }), color: C.red }],
    legend: [{ role: "key", text: p.legend.window }, { role: "compare", text: p.legend.entering }, { role: "sorted", text: p.legend.enough }, { role: "idle", text: p.legend.left }],
  };
}

/** a[j..i] adds up to k exactly when P_j = P_{i+1} − k: a map counts the prefix sums seen so far. */
function prefix(a: number[], k: number, p: PW): Trace {
  const n = a.length;
  const seen = new Map<number, number[]>([[0, [0]]]);
  const P = [0];
  const found: [number, number][] = [];
  const rows: Row[] = [{ vals: a, roles: rolesOf(n, () => "plain"), note: p.prefixStart }];
  for (let i = 0; i < n; i++) {
    P.push(P[i] + a[i]);
    const need = P[i + 1] - k;
    const js = seen.get(need) ?? [];
    for (const j of js) found.push([j, i]);
    // The shortest of the subarrays that end here is marked; the note counts them all.
    const j = js.length ? js[js.length - 1] : -1;
    rows.push({
      vals: a,
      roles: rolesOf(n, (x) => (j >= 0 && x >= j && x <= i ? "sorted" : x === i ? "compare" : x < i ? "plain" : "idle")),
      marks: rolesOf(n, () => "plain").map((_, x) => (x <= i ? nt(P[x + 1]) : "")),
      range: j >= 0 ? [j, i] : undefined,
      note: fill(js.length ? p.prefixHit : p.prefixMiss, { P: nt(P[i + 1]), pk: k < 0 ? `P + ${nt(-k)}` : `P − ${nt(k)}`, need: nt(need), c: js.length }),
      noteColor: js.length ? C.green : undefined,
    });
    seen.set(P[i + 1], [...(seen.get(P[i + 1]) ?? []), i + 1]);
  }
  const list = found.slice(0, 8).map(([j, i]) => span(j, i)).join(", ") + (found.length > 8 ? ", …" : "");
  const kTex = k < 0 ? `(${tn(k)})` : tn(k);
  return {
    tex: `a_j + \\cdots + a_i = P_{i+1} - P_j = ${tn(k)} \\iff P_j = P_{i+1} - ${kTex}`,
    rows,
    caps: [found.length ? { text: fill(p.prefixFound, { c: found.length, k: nt(k), list }), color: C.green } : { text: fill(p.prefixNone, { k: nt(k) }), color: C.red }],
    legend: [{ role: "compare", text: p.legend.read }, { role: "sorted", text: p.legend.hit }, { role: "idle", text: p.legend.unknown }],
  };
}

/** The next greater value: the stack keeps the indices still waiting, their values falling from bottom to top. */
function mono(a: number[], p: PW): Trace {
  const n = a.length;
  const ans: (number | null)[] = Array(n).fill(null);
  const stack: number[] = [];
  const rows: Row[] = [];
  let pops = 0;
  const marks = () => ans.map((v) => (v === null ? "" : nt(v)));
  for (let i = 0; i < n; i++) {
    const popped: number[] = [];
    while (stack.length && a[stack[stack.length - 1]] < a[i]) {
      const j = stack.pop()!;
      ans[j] = a[i];
      popped.push(j);
      pops++;
    }
    stack.push(i);
    const on = new Set(stack);
    const done = new Set(popped);
    rows.push({
      vals: a,
      roles: rolesOf(n, (x) => (x === i ? "compare" : done.has(x) ? "sorted" : on.has(x) ? "key" : x < i ? "idle" : "plain")),
      marks: marks(),
      note: (popped.length ? fill(p.monoPop, { v: nt(a[i]), list: popped.map((j) => nt(a[j])).join(", ") }) : "") + fill(p.monoPush, { v: nt(a[i]), stack: stack.map((j) => nt(a[j])).join(", ") }),
    });
  }
  const left = new Set(stack);
  rows.push({ vals: a, roles: rolesOf(n, (x) => (left.has(x) ? "min" : "idle")), marks: ans.map((v) => (v === null ? "—" : nt(v))), note: fill(p.monoLeft, { list: stack.map((j) => nt(a[j])).join(", ") }) });
  return {
    tex: `\\text{next}(i) = a_j,\\quad j = \\min\\{\\, j > i : a_j > a_i \\,\\}`,
    rows,
    caps: [{ text: fill(p.monoResult, { list: ans.map((v) => (v === null ? "—" : nt(v))).join(", "), pushes: n, pops }), color: C.green }],
    legend: [{ role: "compare", text: p.legend.read }, { role: "key", text: p.legend.stack }, { role: "sorted", text: p.legend.answered }, { role: "min", text: p.legend.none }],
  };
}

/** Kadane: a run whose sum has gone negative only hurts what follows, so start again. */
function kadane(a: number[], p: PW): Trace {
  const n = a.length;
  const rows: Row[] = [];
  let [cur, s] = [0, 0];
  let best = { s: 0, e: 0, v: -Infinity };
  for (let i = 0; i < n; i++) {
    const ext = cur + a[i];
    let note: string;
    if (i === 0 || a[i] > ext) {
      note = i === 0 ? fill(p.kadaneStart, { v: nt(a[i]) }) : fill(p.kadaneRestart, { e: plus(cur, a[i]), v: nt(a[i]), s: nt(ext) });
      cur = a[i];
      s = i;
    } else {
      note = fill(p.kadaneExtend, { e: plus(cur, a[i]), s: nt(ext) });
      cur = ext;
    }
    const better = cur > best.v;
    if (better) best = { s, e: i, v: cur };
    const cs = s;
    rows.push({
      vals: a,
      roles: rolesOf(n, (x) => (x === i ? "compare" : x >= cs && x < i ? "key" : x < cs ? "idle" : "plain")),
      range: [best.s, best.e],
      note: `${note}${better ? `  ★ ${nt(cur)}` : ""}`,
      noteColor: better ? C.green : undefined,
    });
  }
  rows.push({ vals: a, roles: rolesOf(n, (x) => (x >= best.s && x <= best.e ? "sorted" : "idle")), note: `max = ${nt(best.v)}`, noteColor: C.green });
  return {
    tex: `c_i = \\max(a_i,\\ c_{i-1} + a_i),\\qquad \\text{best} = \\max_i c_i`,
    rows,
    caps: [{ text: fill(p.kadaneBest, { s: nt(best.v), i: best.s, j: best.e }), color: C.green }],
    legend: [{ role: "key", text: p.legend.run }, { role: "compare", text: p.legend.read }, { role: "sorted", text: p.legend.best }],
  };
}
