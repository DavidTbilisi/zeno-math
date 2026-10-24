// Interview problems on searching: binary search and its turns (a shifted array, the ends of a run, a place where the
// index is the value, the cut between two arrays, the answer itself), a walk through a sorted matrix, a one-pass top
// three and quickselect. The frames show the range still in play shrinking, and every note says why a part is dropped.
import { cells, done, fill, grid2, int, listText, matrix, nums, row, show, type Errors, type Frame, type ProblemSet, type Role } from "./core";

/** One number. */
const one = (s: string, e: Errors) => nums(s, e, { max: 1 })[0];
const ascending = (a: readonly number[], strict = false) => a.every((x, i) => i === 0 || (strict ? x > a[i - 1] : x >= a[i - 1]));
/** A value, or an end beyond the array. */
const edge = (v: number) => (v === -Infinity ? "−∞" : v === Infinity ? "∞" : show(v));

/** The cells of a binary search: the middle being looked at, and what is outside L..R greyed out. */
const searchCells = (xs: readonly number[], l: number, m: number, r: number, mid: Role, range?: [number, number]) =>
  cells(xs, (k) => (k === m ? mid : k < l || k > r ? "idle" : "plain"), { L: l, M: m, R: r }, range);

export const SEARCHING: ProblemSet<"searching"> = {
  binarySearch: {
    level: 1,
    example: ["-4, 1, 3, 7, 9, 12, 15, 20, 26", "12"],
    solve: ([a, tt], w, e) => {
      const xs = nums(a, e);
      if (!ascending(xs)) throw new Error(w.notSorted);
      const t = one(tt, e);
      const frames: Frame[] = [];
      let [l, r] = [0, xs.length - 1];
      while (l <= r) {
        const m = (l + r) >> 1;
        const v = { m, v: show(xs[m]), t: show(t) };
        if (xs[m] === t) {
          frames.push({ note: fill(w.hit, v), cells: searchCells(xs, l, m, r, "sorted") });
          return done(frames, fill(w.answer, { t: show(t), i: m }));
        }
        const right = xs[m] < t;
        const cs = searchCells(xs, l, m, r, "compare");
        if (right) l = m + 1;
        else r = m - 1;
        frames.push({ note: fill(right ? w.less : w.more, { ...v, l, r }), cells: cs });
      }
      return done(frames, fill(w.none, { t: show(t) }));
    },
  },

  findThreeLargestNumbers: {
    level: 1,
    example: ["12, 4, 19, 7, 19, 3, 15, -2, 10"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { least: 3, max: 14 });
      const top: (number | null)[] = [null, null, null];
      const frames: Frame[] = [];
      const shift = (at: number, x: number) => {
        for (let i = 0; i < at; i++) top[i] = top[i + 1];
        top[at] = x;
      };
      const slot = (v: number | null) => (v === null ? "–" : show(v));
      for (const [i, x] of xs.entries()) {
        const v = { x: show(x), a: slot(top[0]), b: slot(top[1]), c: slot(top[2]) };
        let at = 2;
        while (at >= 0 && top[at] !== null && x <= top[at]!) at--;
        const note = at < 0 ? w.skip : top[at] === null ? w.room : [w.third, w.second, w.first][at];
        if (at >= 0) shift(at, x);
        frames.push({
          note: fill(note, v),
          cells: cells(xs, (k) => (k === i ? (at < 0 ? "idle" : "key") : k < i ? "idle" : "plain"), { i }),
          rows: [row(w.top, top.map(slot), (k) => (k === at ? "key" : k < at ? "compare" : "plain"))],
        });
      }
      return done(frames, fill(w.answer, { list: listText(top as number[]) }), { rows: [row(w.top, top as number[], () => "sorted")] });
    },
  },

  searchInSortedMatrix: {
    level: 2,
    example: ["1, 4, 7, 12; 2, 5, 9, 15; 6, 8, 13, 20; 10, 14, 18, 25", "13"],
    solve: ([a, tt], w, e) => {
      const m = matrix(a, e, { rows: 8, cols: 8 });
      const [R, C] = [m.length, m[0].length];
      if (!m.every((r) => ascending(r)) || !m[0].every((_, j) => ascending(m.map((r) => r[j])))) throw new Error(w.notSorted);
      const t = one(tt, e);
      let [r, c] = [0, C - 1];
      const pic = (drop: "row" | "col" | "", hit = false) => ({
        vals: m,
        roles: grid2(R, C, (i, j): Role =>
          i === r && j === c ? (hit ? "sorted" : "compare") : i < r || j > c ? "idle" : (drop === "row" && i === r) || (drop === "col" && j === c) ? "min" : "plain"),
      });
      const frames: Frame[] = [{ note: fill(w.start, { v: show(m[r][c]) }), mat: pic("") }];
      while (r < R && c >= 0) {
        const v = { v: show(m[r][c]), t: show(t) };
        if (m[r][c] === t) {
          frames.push({ note: fill(w.hit, v), mat: pic("", true) });
          return done(frames, fill(w.answer, { t: show(t), r, c }));
        }
        const left = m[r][c] > t;
        frames.push({ note: fill(left ? w.left : w.down, v), mat: pic(left ? "col" : "row") });
        if (left) c--;
        else r++;
      }
      return done(frames, fill(w.none, { t: show(t) }), { mat: { vals: m, roles: grid2(R, C, () => "idle") } });
    },
  },

  shiftedBinarySearch: {
    level: 3,
    example: ["15, 18, 22, 30, 2, 5, 9, 11", "11"],
    solve: ([a, tt], w, e) => {
      const xs = nums(a, e);
      const n = xs.length;
      const drops = xs.filter((x, i) => i > 0 && x <= xs[i - 1]).length;
      if (new Set(xs).size < n || drops > 1 || (drops === 1 && xs[n - 1] >= xs[0])) throw new Error(w.notShifted);
      const t = one(tt, e);
      const frames: Frame[] = [];
      let [l, r] = [0, n - 1];
      while (l <= r) {
        const m = (l + r) >> 1;
        if (xs[m] === t) {
          frames.push({ note: fill(w.hit, { m, t: show(t) }), cells: searchCells(xs, l, m, r, "sorted") });
          return done(frames, fill(w.answer, { t: show(t), i: m }));
        }
        const leftSorted = xs[l] <= xs[m];
        const v = { m, v: show(xs[m]), t: show(t), lv: show(xs[l]), rv: show(xs[r]) };
        const cs = searchCells(xs, l, m, r, "compare", leftSorted ? [l, m] : [m, r]);
        let note: string;
        if (leftSorted) {
          const inside = xs[l] <= t && t < xs[m];
          note = inside ? w.leftIn : w.leftOut;
          if (inside) r = m - 1;
          else l = m + 1;
        } else {
          const inside = xs[m] < t && t <= xs[r];
          note = inside ? w.rightIn : w.rightOut;
          if (inside) l = m + 1;
          else r = m - 1;
        }
        frames.push({ note: fill(note, { ...v, l, r }), cells: cs });
      }
      return done(frames, fill(w.none, { t: show(t) }));
    },
  },

  searchForRange: {
    level: 3,
    example: ["1, 3, 4, 4, 4, 4, 4, 6, 8, 9", "4"],
    solve: ([a, tt], w, e) => {
      const xs = nums(a, e);
      if (!ascending(xs)) throw new Error(w.notSorted);
      const t = one(tt, e);
      const n = xs.length;
      const found = [-1, -1];
      const frames: Frame[] = [];
      const rangeRow = () => row(w.range, found.map((f) => (f < 0 ? "?" : f)), (k) => (found[k] < 0 ? "plain" : "sorted"));
      for (const side of [0, 1]) {
        let [l, r] = side === 0 ? [0, n - 1] : [found[0], n - 1];
        while (l <= r) {
          const m = (l + r) >> 1;
          const v = { m, v: show(xs[m]), t: show(t) };
          if (xs[m] !== t) {
            const right = xs[m] < t;
            const cs = searchCells(xs, l, m, r, "compare");
            if (right) l = m + 1;
            else r = m - 1;
            frames.push({ note: fill(right ? w.less : w.more, { ...v, l, r }), cells: cs, rows: [rangeRow()] });
            continue;
          }
          const end = side === 0 ? m === 0 || xs[m - 1] !== t : m === n - 1 || xs[m + 1] !== t;
          const cs = searchCells(xs, l, m, r, end ? "sorted" : "key");
          if (end) {
            found[side] = m;
            frames.push({ note: fill(side === 0 ? w.firstHit : w.lastHit, v), cells: cs, rows: [rangeRow()] });
            break;
          }
          if (side === 0) r = m - 1;
          else l = m + 1;
          frames.push({ note: fill(side === 0 ? w.firstMore : w.lastMore, { ...v, l, r }), cells: cs, rows: [rangeRow()] });
        }
        if (found[0] < 0) return done(frames, fill(w.none, { t: show(t) }));
      }
      const [s, f] = found;
      return done(frames, fill(w.answer, { t: show(t), a: s, b: f }), { cells: cells(xs, (k) => (k >= s && k <= f ? "sorted" : "idle")) });
    },
  },

  quickselect: {
    level: 3,
    example: ["8, 3, 12, 5, 1, 9, 6, 14, 2", "4"],
    solve: ([a, kk], w, e) => {
      const xs = nums(a, e, { whole: true, max: 12 });
      if (new Set(xs).size < xs.length) throw new Error(w.notDistinct);
      const n = xs.length;
      const k = int(kk, e, 1, n);
      const frames: Frame[] = [];
      const pic = (note: string, s: number, f: number, roles: Record<number, Role>, ptrs: Record<string, number>) =>
        frames.push({ note, cells: cells(xs, (j) => roles[j] ?? (j < s || j > f ? "idle" : "plain"), Object.fromEntries(Object.entries(ptrs).filter(([, i]) => i >= 0 && i < n)), [s, f]) });
      let [s, f] = [0, n - 1];
      for (;;) {
        const p = s;
        let [l, r] = [s + 1, f];
        pic(fill(w.pivot, { p: show(xs[p]), s, e: f }), s, f, { [p]: "pivot" }, { L: l, R: r });
        while (l <= r) {
          if (xs[l] > xs[p] && xs[r] < xs[p]) {
            const v = { x: show(xs[l]), y: show(xs[r]), p: show(xs[p]) };
            [xs[l], xs[r]] = [xs[r], xs[l]];
            pic(fill(w.swap, v), s, f, { [p]: "pivot", [l]: "key", [r]: "key" }, { L: l, R: r });
          }
          if (xs[l] <= xs[p]) l++;
          if (xs[r] >= xs[p]) r--;
        }
        const pv = xs[p];
        [xs[p], xs[r]] = [xs[r], xs[p]];
        pic(fill(w.place, { p: show(pv), r }), s, f, { [r]: "pivot" }, { L: l, R: r });
        if (r === k - 1) {
          pic(fill(w.found, { r, k1: k - 1 }), s, f, { [r]: "sorted" }, {});
          return done(frames, fill(w.answer, { k, v: show(pv) }));
        }
        if (r < k - 1) s = r + 1;
        else f = r - 1;
        pic(fill(r < k - 1 ? w.goRight : w.goLeft, { r, k1: k - 1, s, e: f }), s, f, { [r]: "idle" }, {});
      }
    },
  },

  indexEqualsValue: {
    level: 3,
    example: ["-5, -2, 0, 3, 4, 7, 9, 10, 13"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true });
      if (!ascending(xs, true)) throw new Error(w.notSorted);
      const frames: Frame[] = [];
      let [l, r] = [0, xs.length - 1];
      while (l <= r) {
        const m = (l + r) >> 1;
        const v = { m, v: show(xs[m]) };
        if (xs[m] === m) {
          const first = m === 0 || xs[m - 1] < m - 1;
          const cs = searchCells(xs, l, m, r, first ? "sorted" : "key");
          if (first) {
            frames.push({ note: fill(w.hitFirst, v), cells: cs });
            return done(frames, fill(w.answer, { i: m }));
          }
          r = m - 1;
          frames.push({ note: fill(w.hitMore, { ...v, r }), cells: cs });
          continue;
        }
        const right = xs[m] < m;
        const cs = searchCells(xs, l, m, r, "compare");
        if (right) l = m + 1;
        else r = m - 1;
        frames.push({ note: fill(right ? w.less : w.more, { ...v, l, r }), cells: cs });
      }
      return done(frames, w.none);
    },
  },

  medianOfTwoSortedArrays: {
    level: 4,
    example: ["2, 6, 9", "1, 3, 4, 7, 10, 12"],
    solve: ([a, b], w, e) => {
      const read = (s: string) => (/^\s*(-|−|\[\s*\])?\s*$/.test(s) ? [] : nums(s, e, { max: 10 }));
      const [xs, ys] = [read(a), read(b)];
      if (!xs.length && !ys.length) throw new Error(e.empty);
      if (!ascending(xs) || !ascending(ys)) throw new Error(w.notSorted);
      const [S, L] = xs.length <= ys.length ? [xs, ys] : [ys, xs];
      const [m, n] = [S.length, L.length];
      const half = (m + n + 1) >> 1;
      const heads = [w.shorter, w.longer];
      const pic = (i: number, j: number, ok: boolean) => ({
        vals: [S, L],
        roles: [S.map((_, c): Role => (c === i - 1 || c === i ? "compare" : c < i ? (ok ? "sorted" : "key") : "plain")),
          L.map((_, c): Role => (c === j - 1 || c === j ? "compare" : c < j ? (ok ? "sorted" : "key") : "plain"))],
        rowHeads: heads,
      });
      const frames: Frame[] = [{ note: fill(w.start, { lo: 0, hi: m, h: half, n: m + n }), mat: { vals: [S, L], roles: [S.map((): Role => "plain"), L.map((): Role => "plain")], rowHeads: heads } }];
      let [lo, hi] = [0, m];
      for (;;) {
        const i = (lo + hi) >> 1;
        const j = half - i;
        const ls = i > 0 ? S[i - 1] : -Infinity;
        const rs = i < m ? S[i] : Infinity;
        const lb = j > 0 ? L[j - 1] : -Infinity;
        const rb = j < n ? L[j] : Infinity;
        const v = { i, j, ls: edge(ls), rs: edge(rs), lb: edge(lb), rb: edge(rb) };
        if (ls <= rb && lb <= rs) {
          frames.push({ note: fill(w.good, v), mat: pic(i, j, true) });
          const left = Math.max(ls, lb);
          if ((m + n) % 2) return done(frames, fill(w.odd, { m: show(left) }));
          const right = Math.min(rs, rb);
          return done(frames, fill(w.even, { a: show(left), b: show(right), m: show((left + right) / 2) }));
        }
        frames.push({ note: fill(ls > rb ? w.tooFar : w.tooNear, v), mat: pic(i, j, false) });
        if (ls > rb) hi = i - 1;
        else lo = i + 1;
      }
    },
  },

  optimalAssemblyLine: {
    level: 4,
    example: ["4, 7, 2, 6, 3, 8, 5, 1", "3"],
    solve: ([a, kk], w, e) => {
      const steps = nums(a, e, { whole: true, min: 1, max: 12 });
      const k = int(kk, e, 1, steps.length);
      /** Fill each station with steps in order, as long as it stays within t: the stations' totals and each step's station. */
      const fillUp = (t: number) => {
        const sums: number[] = [];
        const at: number[] = [];
        for (const s of steps) {
          if (!sums.length || sums[sums.length - 1] + s > t) sums.push(0);
          sums[sums.length - 1] += s;
          at.push(sums.length - 1);
        }
        return { sums, at };
      };
      const pic = (t: number, lo: number, hi: number): Pick<Frame, "cells" | "rows"> => {
        const { sums, at } = fillUp(t);
        return {
          cells: cells(steps, (i) => (at[i] >= k ? "min" : at[i] % 2 ? "pivot" : "key")),
          rows: [row(w.stations, sums, (q) => (q >= k ? "min" : q % 2 ? "pivot" : "key")), row(w.range, [`${lo} – ${hi}`])],
        };
      };
      let lo = Math.max(...steps);
      let hi = steps.reduce((x, y) => x + y, 0);
      const frames: Frame[] = [{ note: fill(w.start, { lo, hi }), cells: cells(steps), rows: [row(w.stations, []), row(w.range, [`${lo} – ${hi}`])] }];
      while (lo < hi) {
        const t = (lo + hi) >> 1;
        const g = fillUp(t).sums.length;
        const ok = g <= k;
        frames.push({ note: fill(ok ? w.fits : w.fails, { t, g, k }), ...pic(t, lo, hi) });
        if (ok) hi = t;
        else lo = t + 1;
      }
      return done(frames, fill(w.answer, { t: lo }), pic(lo, lo, hi));
    },
  },
};
