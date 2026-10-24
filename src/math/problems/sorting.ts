// Interview problems on sorting: each solver sorts the way its algorithm does (neighbour swaps, a pivot, a heap, digit
// by digit, halves merged) and leaves a frame at every comparison or move, with the part already in place in green.
import { cells, done, fill, grid2, listText, nums, row, show, type Frame, type ProblemSet, type Role, type TreeNode } from "./core";

/** At most this many numbers, so a row of cells fits. */
const MOST = 12;

const sortedText = (answer: string, xs: readonly number[]) => fill(answer, { list: listText(xs) });

/** The heap's part of the array as a binary tree: node i's children are 2i + 1 and 2i + 2. */
const heapTree = (xs: readonly number[], size: number): TreeNode[] =>
  xs.slice(0, size).map((val, i) => ({ val, left: 2 * i + 1 < size ? 2 * i + 1 : -1, right: 2 * i + 2 < size ? 2 * i + 2 : -1 }));

type MergeWords = { split: string; left: string; right: string; merged: string; result: string };

/**
 * Merge sort, top-down, with a frame at each split, each number taken while merging and each merge written back; with
 * `countLabel` it also counts the pairs out of order (the right half's note then says how many it jumps) in a row of its own.
 */
function mergeFrames(xs: number[], w: MergeWords, countLabel?: string): { frames: Frame[]; count: number } {
  const frames: Frame[] = [];
  let count = 0;
  const countRow = () => (countLabel ? [row(countLabel, [count], () => "key")] : []);
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    frames.push({
      note: fill(w.split, { a: lo, b: hi, l: listText(xs.slice(lo, mid + 1)), r: listText(xs.slice(mid + 1, hi + 1)) }),
      cells: cells(xs, (k) => (k < lo || k > hi ? "idle" : k <= mid ? "compare" : "pivot"), undefined, [lo, hi]),
      rows: [row(w.result, []), ...countRow()],
    });
    sort(lo, mid);
    sort(mid + 1, hi);
    const out: number[] = [];
    let [i, j] = [lo, mid + 1];
    while (i <= mid && j <= hi) {
      const [x, y] = [xs[i], xs[j]];
      const left = x <= y;
      const k = mid - i + 1;
      if (!left) count += k;
      out.push(left ? x : y);
      frames.push({
        note: fill(left ? w.left : w.right, { x: show(x), y: show(y), k, t: count }),
        cells: cells(xs, (c) => (c === (left ? i : j) ? "key" : c === i || c === j ? "compare" : c < i || c > hi || (c > mid && c < j) ? "idle" : "plain"), { i, j }, [lo, hi]),
        rows: [row(w.result, out, (c) => (c === out.length - 1 ? "key" : "sorted")), ...countRow()],
      });
      if (left) i++;
      else j++;
    }
    out.push(...xs.slice(i, mid + 1), ...xs.slice(j, hi + 1));
    xs.splice(lo, out.length, ...out);
    frames.push({
      note: fill(w.merged, { a: lo, b: hi, list: listText(out) }),
      cells: cells(xs, (c) => (c >= lo && c <= hi ? "sorted" : "plain"), undefined, [lo, hi]),
      rows: [row(w.result, out, () => "sorted"), ...countRow()],
    });
  };
  sort(0, xs.length - 1);
  if (!frames.length) frames.push({ note: fill(w.merged, { a: 0, b: 0, list: listText(xs) }), cells: cells(xs, () => "sorted"), rows: [row(w.result, xs, () => "sorted"), ...countRow()] });
  return { frames, count };
}

export const SORTING: ProblemSet<"sorting"> = {
  bubbleSort: {
    level: 1,
    example: ["6, 2, -3, 8, 4, 9, 11"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const frames: Frame[] = [];
      let end = xs.length;
      for (let pass = 1; ; pass++) {
        let swaps = 0;
        for (let i = 0; i + 1 < end; i++) {
          const [p, q] = [xs[i], xs[i + 1]];
          const swap = p > q;
          if (swap) {
            [xs[i], xs[i + 1]] = [q, p];
            swaps++;
          }
          frames.push({
            note: fill(swap ? w.swap : w.keep, { a: show(p), b: show(q) }),
            cells: cells(xs, (k) => (k === i || k === i + 1 ? (swap ? "key" : "compare") : k >= end ? "sorted" : "plain"), { i }),
          });
        }
        if (!swaps) {
          frames.push({ note: fill(w.clean, { p: pass }), cells: cells(xs, () => "sorted") });
          break;
        }
        end--;
        frames.push({ note: fill(w.pass, { p: pass, s: swaps, v: show(xs[end]), k: end }), cells: cells(xs, (k) => (k === end ? "key" : k > end ? "sorted" : "plain")) });
      }
      return done(frames, sortedText(w.answer, xs));
    },
  },

  insertionSort: {
    level: 1,
    example: ["4, -1, 7, 3, 9, 0"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const frames: Frame[] = [{ note: w.start, cells: cells(xs, (k) => (k === 0 ? "sorted" : "plain")) }];
      for (let i = 1; i < xs.length; i++) {
        let j = i;
        const v = xs[i];
        const part = (k: number): Role => (k === j ? "key" : k <= i ? "sorted" : "plain");
        while (j > 0 && xs[j] < xs[j - 1]) {
          const u = xs[j - 1];
          [xs[j], xs[j - 1]] = [u, v];
          j--;
          frames.push({ note: fill(w.swap, { v: show(v), u: show(u) }), cells: cells(xs, (k) => (k === j + 1 ? "compare" : part(k)), { j }) });
        }
        frames.push({
          note: j === 0 ? fill(w.front, { v: show(v), k: i + 1 }) : fill(w.stop, { v: show(v), u: show(xs[j - 1]), j, k: i + 1 }),
          cells: cells(xs, (k) => (k === j - 1 ? "compare" : part(k)), { j }),
        });
      }
      return done(frames, sortedText(w.answer, xs), { cells: cells(xs, () => "sorted") });
    },
  },

  selectionSort: {
    level: 1,
    example: ["8, 3, 5, -1, 9, 2"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const n = xs.length;
      const frames: Frame[] = [{ note: w.start, cells: cells(xs) }];
      for (let i = 0; i < n - 1; i++) {
        let m = i;
        for (let j = i + 1; j < n; j++) {
          const less = xs[j] < xs[m];
          const v = { v: show(xs[j]), m: show(xs[m]) };
          if (less) m = j;
          frames.push({ note: fill(less ? w.less : w.look, v), cells: cells(xs, (k) => (k === m ? "key" : k === j ? "compare" : k < i ? "sorted" : "plain"), { i, j }) });
        }
        const [mv, u] = [xs[m], xs[i]];
        [xs[i], xs[m]] = [mv, u];
        frames.push({ note: fill(m === i ? w.stay : w.swap, { m: show(mv), u: show(u), i }), cells: cells(xs, (k) => (k === i ? "key" : k < i ? "sorted" : k === m ? "compare" : "plain"), { i }) });
      }
      return done(frames, sortedText(w.answer, xs), { cells: cells(xs, () => "sorted") });
    },
  },

  threeNumberSort: {
    level: 2,
    example: ["3, 1, -2, 1, 3, -2, 1, 3, -2", "1, -2, 3"],
    solve: ([a, o], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const order = nums(o, e, { least: 3, max: 3 });
      if (new Set(order).size !== 3) throw new Error(w.order);
      const odd = xs.find((x) => !order.includes(x));
      if (odd !== undefined) throw new Error(fill(w.notIn, { v: show(odd) }));
      let [L, M, R] = [0, 0, xs.length - 1];
      const roles = (k: number, now: number): Role => (k === now ? "key" : k < L || k > R ? "sorted" : k < M ? "pivot" : "plain");
      const frames: Frame[] = [{ note: w.start, cells: cells(xs, (k) => roles(k, -1), { L, M, R }), rows: [row(w.orderRow, order, (k) => (k === 1 ? "pivot" : "sorted"))] }];
      const orderRow = (which: number) => row(w.orderRow, order, (k) => (k === which ? "key" : "plain"));
      while (M <= R) {
        const v = xs[M];
        const which = order.indexOf(v);
        let now = M;
        if (which === 0) {
          [xs[L], xs[M]] = [xs[M], xs[L]];
          now = L;
          L++;
          M++;
        } else if (which === 1) M++;
        else {
          [xs[M], xs[R]] = [xs[R], xs[M]];
          now = R;
          R--;
        }
        frames.push({ note: fill([w.first, w.second, w.third][which], { v: show(v) }), cells: cells(xs, (k) => roles(k, now), { L, M, R }), rows: [orderRow(which)] });
      }
      return done(frames, sortedText(w.answer, xs), { cells: cells(xs, () => "sorted"), rows: [row(w.orderRow, order, () => "sorted")] });
    },
  },

  quickSort: {
    level: 3,
    example: ["5, 2, 8, -1, 9, 3, 6, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const n = xs.length;
      const fixed = xs.map(() => false);
      const frames: Frame[] = [];
      const sort = (start: number, end: number) => {
        if (start > end) return;
        if (start === end) {
          fixed[start] = true;
          return;
        }
        const P = start;
        let [L, R] = [start + 1, end];
        const pic = (hot: (k: number) => Role | null) =>
          cells(xs, (k) => hot(k) ?? (fixed[k] ? "sorted" : k === P ? "pivot" : k < start || k > end ? "idle" : "plain"), { P, L, R }, [start, end]);
        frames.push({ note: fill(w.range, { a: start, b: end, p: show(xs[P]) }), cells: pic((k) => (k === L || k === R ? "compare" : null)) });
        while (R >= L) {
          const [l, r, p] = [xs[L], xs[R], xs[P]];
          const swap = l > p && r < p;
          if (swap) [xs[L], xs[R]] = [r, l];
          const [l0, r0] = [L, R];
          const moveL = xs[L] <= p;
          const moveR = xs[R] >= p;
          if (moveL) L++;
          if (moveR) R--;
          const note = swap ? w.swap : moveL && moveR ? w.both : moveL ? w.left : w.right;
          frames.push({ note: fill(note, { l: show(l), r: show(r), p: show(p) }), cells: pic((k) => (swap && (k === l0 || k === r0) ? "key" : k === L || k === R ? "compare" : null)) });
        }
        [xs[P], xs[R]] = [xs[R], xs[P]];
        fixed[R] = true;
        frames.push({ note: fill(w.place, { p: show(xs[R]), k: R }), cells: pic((k) => (k === R ? "key" : k === P ? "compare" : null)) });
        const mid = R;
        if (mid - 1 - start < end - (mid + 1)) {
          sort(start, mid - 1);
          sort(mid + 1, end);
        } else {
          sort(mid + 1, end);
          sort(start, mid - 1);
        }
      };
      sort(0, n - 1);
      if (!frames.length) frames.push({ note: sortedText(w.answer, xs), cells: cells(xs, () => "sorted") });
      return done(frames, sortedText(w.answer, xs), { cells: cells(xs, () => "sorted") });
    },
  },

  heapSort: {
    level: 3,
    example: ["4, 10, -2, 7, 1, 9, 3"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const n = xs.length;
      let size = n;
      const frames: Frame[] = [];
      const push = (note: string, role: (k: number) => Role | null) => {
        const roles = xs.map((_, k) => role(k) ?? (k >= size ? "sorted" : "plain"));
        frames.push({ note, cells: cells(xs, (k) => roles[k]), tree: { roles: roles.slice(0, size), nodes: heapTree(xs, size) } });
      };
      const siftDown = (at: number) => {
        let cur = at;
        while (2 * cur + 1 < size) {
          const [c1, c2] = [2 * cur + 1, 2 * cur + 2];
          const big = c2 < size && xs[c2] > xs[c1] ? c2 : c1;
          const [p, c] = [xs[cur], xs[big]];
          if (c > p) {
            [xs[cur], xs[big]] = [c, p];
            push(fill(w.down, { p: show(p), c: show(c) }), (k) => (k === big ? "key" : k === cur ? "compare" : null));
            cur = big;
          } else {
            push(fill(w.stay, { p: show(p), c: show(c) }), (k) => (k === cur ? "sorted" : k === big ? "compare" : null));
            return;
          }
        }
      };
      push(w.start, () => null);
      for (let i = Math.floor((n - 2) / 2); i >= 0; i--) siftDown(i);
      push(fill(w.built, { v: show(xs[0]) }), (k) => (k === 0 ? "key" : null));
      for (let end = n - 1; end > 0; end--) {
        const [v, u] = [xs[0], xs[end]];
        [xs[0], xs[end]] = [u, v];
        size = end;
        push(fill(w.toEnd, { v: show(v), u: show(u), k: end }), (k) => (k === end ? "key" : k === 0 ? "compare" : null));
        siftDown(0);
      }
      return done(frames, sortedText(w.answer, xs), { cells: cells(xs, () => "sorted") });
    },
  },

  radixSort: {
    level: 3,
    example: ["412, 38, 905, 7, 263, 81, 350"],
    solve: ([a], w, e) => {
      let xs = nums(a, e, { max: 10, whole: true, min: 0 });
      const big = xs.find((x) => x > 999);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: show(big), n: 999 }));
      const passes = String(Math.max(...xs)).length;
      const frames: Frame[] = [];
      const heads = Array.from({ length: 10 }, (_, d) => String(d));
      for (let p = 0; p < passes; p++) {
        const place = w.places[p];
        const unit = 10 ** p;
        const digits = xs.map((x) => Math.floor(x / unit) % 10);
        const count = Array(10).fill(0);
        for (const d of digits) count[d]++;
        const ends = [...count];
        const out: (number | string)[] = xs.map(() => "");
        const pic = (note: string, at: number, endsRow: (number | string)[], hot: number, role: (k: number) => Role = () => "plain"): Frame => ({
          note,
          cells: cells(xs, (k) => (k === at ? "key" : "plain"), at >= 0 ? { i: at } : undefined),
          mat: { vals: [count, endsRow], roles: grid2(2, 10, (r, c) => (c === hot ? (r === 1 ? "key" : "compare") : "plain")), rowHeads: [w.counts, w.ends], colHeads: heads },
          rows: [row(w.digit, digits, (k) => (k === at ? "key" : "plain")), row(w.out, out, role)],
        });
        frames.push(pic(fill(w.count, { place }), -1, heads.map(() => ""), -1));
        for (let d = 1; d < 10; d++) ends[d] += ends[d - 1];
        frames.push(pic(w.totals, -1, ends, -1));
        for (let i = xs.length - 1; i >= 0; i--) {
          const d = digits[i];
          const k = --ends[d];
          out[k] = xs[i];
          frames.push(pic(fill(w.put, { v: xs[i], d, k }), i, ends, d, (c) => (c === k ? "key" : out[c] === "" ? "plain" : "sorted")));
        }
        xs = out as number[];
        frames.push({ ...pic(fill(w.pass, { place, list: listText(xs) }), -1, ends, -1, () => "sorted"), cells: cells(xs, () => (p === passes - 1 ? "sorted" : "plain")) });
      }
      return done(frames, sortedText(w.answer, xs));
    },
  },

  mergeSort: {
    level: 4,
    example: ["7, -3, 5, 1, 9, 0, 4"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const { frames } = mergeFrames(xs, w);
      return done(frames, sortedText(w.answer, xs));
    },
  },

  countInversions: {
    level: 4,
    example: ["3, 8, 1, 5, -2, 6"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: MOST });
      const { frames, count } = mergeFrames(xs, w, w.count);
      return done(frames, fill(w.answer, { n: count }));
    },
  },
};
