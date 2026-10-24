// Interview problems on heaps: a min-heap built and changed in front of you (as a tree and as the array it lives in),
// and the problems a heap makes quick — the running median, sorting a nearly sorted array, counting laptops, merging
// sorted arrays. Each frame shows the heap as it stands and says what just went in or out, and why.
import { cells, done, fill, int, intervals, listText, nums, row, show, type Frame, type ProblemSet, type Role, type TreeNode } from "./core";

/** A binary heap in an array: `before(x, y)` says x belongs nearer the top than y. */
class Heap<T> {
  a: T[] = [];
  before: (x: T, y: T) => boolean;
  constructor(before: (x: T, y: T) => boolean) {
    this.before = before;
  }
  get size() {
    return this.a.length;
  }
  top(): T {
    return this.a[0];
  }
  push(x: T) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T {
    const a = this.a;
    const out = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let c = i;
        if (l < a.length && this.before(a[l], a[c])) c = l;
        if (r < a.length && this.before(a[r], a[c])) c = r;
        if (c === i) break;
        [a[i], a[c]] = [a[c], a[i]];
        i = c;
      }
    }
    return out;
  }
}

/** The tree a heap's array stands for: the children of place i are at 2i + 1 and 2i + 2. */
const heapTree = (h: readonly number[]): TreeNode[] =>
  h.map((val, i) => ({ val, left: 2 * i + 1 < h.length ? 2 * i + 1 : -1, right: 2 * i + 2 < h.length ? 2 * i + 2 : -1 }));

type Op = { kind: "insert" | "remove" | "peek"; v: number; text: string };

export const HEAPS: ProblemSet<"heaps"> = {
  minHeapConstruction: {
    level: 2,
    example: ["9, 4, 7, 1, 8, 2, 6", "insert 3, remove, peek, insert 0"],
    solve: ([a, b], w, e) => {
      const MAX = 15;
      const h = nums(a, e, { max: 10 });
      const [ins, rem, peek] = w.opWords.split(/\s+/);
      const ops: Op[] = b.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((text) => {
        const [word, arg, ...rest] = text.replace(/[−–—]/g, "-").split(/\s+/);
        const kind = word.toLowerCase();
        const v = Number(arg);
        if (["insert", "add", "push", ins].includes(kind) && arg !== undefined && Number.isFinite(v) && !rest.length) return { kind: "insert", v, text };
        if (["remove", "pop", rem].includes(kind) && arg === undefined) return { kind: "remove", v: 0, text };
        if (["peek", "top", peek].includes(kind) && arg === undefined) return { kind: "peek", v: 0, text };
        throw new Error(fill(e.bad, { s: text }));
      });
      if (ops.length > 8) throw new Error(fill(e.tooMany, { n: 8 }));
      const frames: Frame[] = [];
      const pic = (note: string, roles: Record<number, Role> = {}) => {
        const role = (i: number) => roles[i] ?? "plain";
        frames.push({ note, tree: { roles: h.map((_, i) => role(i)), nodes: heapTree(h) }, cells: cells(h, role) });
      };
      const siftDown = (i: number) => {
        for (;;) {
          const [l, r] = [2 * i + 1, 2 * i + 2];
          if (l >= h.length) return;
          const c = r < h.length && h[r] < h[l] ? r : l;
          if (h[c] >= h[i]) {
            pic(fill(w.stays, { v: show(h[i]), c: show(h[c]) }), { [i]: "sorted", [c]: "compare" });
            return;
          }
          const v = { v: show(h[i]), c: show(h[c]) };
          [h[i], h[c]] = [h[c], h[i]];
          pic(fill(w.swapDown, v), { [i]: "key", [c]: "key" });
          i = c;
        }
      };
      const last = (h.length - 2) >> 1;
      pic(fill(w.start, { list: listText(h), i: Math.max(0, last) }), last >= 0 ? { [last]: "pivot" } : {});
      for (let i = last; i >= 0; i--) siftDown(i);
      pic(fill(w.built, { v: show(h[0]) }), { 0: "sorted" });
      const out: number[] = [];
      for (const op of ops) {
        if (op.kind === "insert") {
          if (h.length >= MAX) throw new Error(fill(w.full, { n: MAX }));
          h.push(op.v);
          let i = h.length - 1;
          pic(fill(w.insert, { v: show(op.v), i }), { [i]: "key" });
          while (i > 0) {
            const p = (i - 1) >> 1;
            const v = { v: show(h[i]), p: show(h[p]) };
            if (h[i] >= h[p]) {
              pic(fill(w.staysUp, v), { [i]: "sorted", [p]: "compare" });
              break;
            }
            [h[i], h[p]] = [h[p], h[i]];
            pic(fill(w.swapUp, v), { [i]: "key", [p]: "key" });
            i = p;
            if (i === 0) pic(fill(w.root, { v: show(h[0]) }), { 0: "sorted" });
          }
        } else if (!h.length) throw new Error(fill(w.emptyHeap, { s: op.text }));
        else if (op.kind === "peek") {
          out.push(h[0]);
          pic(fill(w.peek, { v: show(h[0]) }), { 0: "sorted" });
        } else {
          const v = h[0];
          out.push(v);
          const l = h.pop()!;
          if (!h.length) pic(fill(w.removeOnly, { v: show(v) }));
          else {
            h[0] = l;
            pic(fill(w.remove, { v: show(v), l: show(l) }), { 0: "key" });
            siftDown(0);
          }
        }
      }
      const list = listText(h);
      return done(frames, out.length ? fill(w.answerOut, { list, out: listText(out) }) : fill(w.answer, { list }));
    },
  },

  continuousMedian: {
    level: 3,
    example: ["5, 15, 1, 3, 8, 7, 9, 10"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 12 });
      const lower = new Heap<number>((x, y) => x > y);
      const upper = new Heap<number>((x, y) => x < y);
      const medians: number[] = [];
      const frames: Frame[] = [];
      const pic = (note: string, i: number, moved: "lower" | "upper" | "") => {
        const top = (h: "lower" | "upper") => (k: number): Role => (k === 0 ? (moved === h ? "key" : "compare") : "plain");
        frames.push({
          note,
          cells: cells(xs, (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }),
          rows: [row(w.lower, lower.a, top("lower")), row(w.upper, upper.a, top("upper")), row(w.medians, medians, (k) => (k === medians.length - 1 ? "sorted" : "plain"))],
        });
      };
      for (const [i, x] of xs.entries()) {
        let note: string;
        let side: "lower" | "upper";
        if (!lower.size) [note, side] = [fill(w.first, { x: show(x) }), "lower"];
        else if (x < lower.top()) [note, side] = [fill(w.toLower, { x: show(x), t: show(lower.top()) }), "lower"];
        else [note, side] = [fill(w.toUpper, { x: show(x), t: show(lower.top()) }), "upper"];
        (side === "lower" ? lower : upper).push(x);
        pic(note, i, "");
        if (lower.size - upper.size === 2) {
          const v = lower.pop();
          upper.push(v);
          pic(fill(w.moveUp, { v: show(v) }), i, "upper");
        } else if (upper.size - lower.size === 2) {
          const v = upper.pop();
          lower.push(v);
          pic(fill(w.moveDown, { v: show(v) }), i, "lower");
        }
        if (lower.size === upper.size) {
          const m = (lower.top() + upper.top()) / 2;
          medians.push(m);
          pic(fill(w.two, { a: show(lower.top()), b: show(upper.top()), m: show(m) }), i, "");
        } else {
          const m = (lower.size > upper.size ? lower : upper).top();
          medians.push(m);
          pic(fill(w.one, { m: show(m) }), i, "");
        }
      }
      return done(frames, fill(w.answer, { list: listText(medians) }));
    },
  },

  sortKSortedArray: {
    level: 3,
    example: ["3, 1, 2, 6, 4, 5, 9, 7, 8", "2"],
    solve: ([a, kk], w, e) => {
      const xs = nums(a, e, { max: 14 });
      const kRaw = int(kk, e, 0, 13);
      const k = Math.min(kRaw, xs.length - 1);
      const n = xs.length;
      // Where each value belongs (equal values keep their order, which moves them least): none may be more than k away.
      const where = xs.map((_, i) => i).sort((x, y) => xs[x] - xs[y] || x - y);
      if (where.some((from, to) => Math.abs(from - to) > kRaw)) throw new Error(fill(w.notK, { k: kRaw }));
      const heap = new Heap<number>((x, y) => x < y);
      const out: number[] = [];
      let next = 0;
      while (next < Math.min(k + 1, n)) heap.push(xs[next++]);
      const vals = () => xs.map((x, j) => (j < out.length ? out[j] : x));
      const ptrs = (i: number) => ({ ...(i >= 0 ? { i } : {}), ...(next < n ? { next } : {}) });
      const frames: Frame[] = [
        { note: fill(w.start, { n: next }), cells: cells(xs, (j) => (j < next ? "compare" : "plain"), ptrs(-1)), rows: [row(w.heap, heap.a, (j) => (j === 0 ? "key" : "plain"))] },
      ];
      for (let i = 0; i < n; i++) {
        const v = heap.pop();
        out.push(v);
        const came = next < n ? xs[next] : undefined;
        if (came !== undefined) heap.push(xs[next++]);
        frames.push({
          note: came === undefined ? fill(w.placeLast, { v: show(v), i }) : fill(w.place, { v: show(v), i, x: show(came) }),
          cells: cells(vals(), (j) => (j === i ? "key" : j < i ? "sorted" : j < next ? "compare" : "plain"), ptrs(i)),
          rows: [row(w.heap, heap.a, (j) => (j === 0 ? "key" : "plain"))],
        });
      }
      return done(frames, fill(w.answer, { list: listText(out) }), { cells: cells(out, () => "sorted") });
    },
  },

  laptopRentals: {
    level: 3,
    example: ["[0, 4], [2, 5], [4, 7], [1, 3], [6, 9], [5, 6]"],
    solve: ([a], w, e) => {
      const raw = intervals(a, e, 8);
      const flat = raw.find(([s, t]) => s === t);
      if (flat) throw new Error(fill(w.zero, { s: `${show(flat[0])}, ${show(flat[1])}` }));
      const rs = [...raw].sort((x, y) => x[0] - y[0]);
      const ends = new Heap<number>((x, y) => x < y);
      const span = (i: number, role: Role) => [{ label: w.rentals, items: rs, roles: rs.map((_, k): Role => (k === i ? role : k < i ? "idle" : "plain")) }];
      const frames: Frame[] = [{ note: w.sorted, spans: span(-1, "plain"), rows: [row(w.ends, [])] }];
      for (const [i, [s, t]] of rs.entries()) {
        const v = { s: show(s), e: show(t) };
        let note: string;
        if (!ends.size) note = fill(w.first, v);
        else if (ends.top() <= s) {
          note = fill(w.reuse, { ...v, t: show(ends.top()) });
          ends.pop();
        } else note = fill(w.fresh, { ...v, t: show(ends.top()), n: ends.size + 1 });
        ends.push(t);
        frames.push({ note, spans: span(i, "key"), rows: [row(w.ends, ends.a, (k) => (k === 0 ? "compare" : "plain"))] });
      }
      return done(frames, fill(w.answer, { n: ends.size }));
    },
  },

  mergeSortedArrays: {
    level: 4,
    example: ["2, 9, 14; 1, 5, 8, 20; 3, 4, 12"],
    solve: ([a], w, e) => {
      const arrs = a.split(/[;\n]/).map((r) => r.trim()).filter(Boolean).map((r) => nums(r, e, { max: 8 }));
      if (!arrs.length) throw new Error(e.empty);
      if (arrs.length > 5) throw new Error(fill(e.tooMany, { n: 5 }));
      if (arrs.flat().length > 20) throw new Error(fill(e.tooMany, { n: 20 }));
      const bad = arrs.findIndex((r) => r.some((x, i) => i > 0 && x < r[i - 1]));
      if (bad >= 0) throw new Error(fill(w.notSorted, { a: bad }));
      type Item = { v: number; a: number; k: number };
      const heap = new Heap<Item>((x, y) => x.v < y.v || (x.v === y.v && x.a < y.a));
      const taken = arrs.map((r) => r.map(() => false));
      const result: number[] = [];
      for (const [j, r] of arrs.entries()) heap.push({ v: r[0], a: j, k: 0 });
      const pic = (note: string, just?: Item): Frame => {
        const inHeap = new Set(heap.a.map((it) => `${it.a}:${it.k}`));
        return {
          note,
          mat: { vals: arrs, roles: arrs.map((r, j) => r.map((_, k): Role => (just && just.a === j && just.k === k ? "key" : taken[j][k] ? "idle" : inHeap.has(`${j}:${k}`) ? "compare" : "plain"))) },
          rows: [row(w.heap, heap.a.map((it) => it.v), (k) => (k === 0 ? "compare" : "plain")), row(w.result, result, (k) => (k === result.length - 1 ? "key" : "sorted"))],
        };
      };
      const frames: Frame[] = [pic(fill(w.start, { list: listText(arrs.map((r) => r[0])) }))];
      while (heap.size) {
        const it = heap.pop();
        taken[it.a][it.k] = true;
        result.push(it.v);
        const more = it.k + 1 < arrs[it.a].length;
        if (more) heap.push({ v: arrs[it.a][it.k + 1], a: it.a, k: it.k + 1 });
        const v = { v: show(it.v), a: it.a, x: more ? show(arrs[it.a][it.k + 1]) : "" };
        frames.push(pic(fill(more ? w.take : w.takeLast, v), it));
      }
      return done(frames, fill(w.answer, { list: listText(result) }));
    },
  },
};
