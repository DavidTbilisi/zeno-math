// Interview problems on dynamic programming: each answer is built from the answers to smaller versions of the same
// question, kept in a table (or a row) that the frames fill in one entry at a time, and read back at the end to say
// which choices made the best answer.
import { cells, done, fill, grid2, int, listText, matrix, nums, row, show, text, words, type Errors, type Frame, type ProblemSet, type Role } from "./core";

const INF = "∞";
/** A number, or ∞ for "can't be done". */
const val = (v: number) => (Number.isFinite(v) ? v : INF);
const valText = (v: number) => (Number.isFinite(v) ? show(v) : INF);
/** A number after a plus or minus sign: negatives in brackets. */
const term = (v: number) => (v < 0 ? `(${show(v)})` : show(v));

/** Groups of `size` whole numbers: "[5, 2], [6, 3]" or "5 2; 6 3". */
function tuples(s: string, e: Errors, size: number, max: number, min = 0): number[][] {
  const t = s.replace(/[−–—]/g, "-");
  const groups = /[[(]/.test(t) ? [...t.matchAll(/[[(]([^\])]*)[\])]/g)].map((m) => m[1]) : t.split(/[;\n]/);
  const out = groups.map((g) => g.trim()).filter(Boolean).map((g) => {
    const p = g.split(/[,\s]+/).filter(Boolean);
    const v = p.map(Number);
    if (p.length !== size || !v.every(Number.isInteger)) throw new Error(fill(e.bad, { s: g }));
    const small = v.find((x) => x < min);
    if (small !== undefined) throw new Error(fill(e.atLeast, { s: show(small), n: min }));
    return v;
  });
  if (!out.length) throw new Error(e.empty);
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return out;
}

/** A DP table as a picture: `vals` may hold ∞ (as Infinity) and blanks (as null). */
const table = (vals: (number | null)[][], role: (r: number, c: number) => Role, rowHeads?: string[], colHeads?: string[]): NonNullable<Frame["mat"]> => ({
  vals: vals.map((r) => r.map((v) => (v === null ? "" : val(v)))),
  roles: vals.map((r, i) => r.map((_, j) => role(i, j))),
  ...(rowHeads ? { rowHeads } : {}),
  ...(colHeads ? { colHeads } : {}),
});

const blank = (r: number, c: number) => grid2<number | null>(r, c, () => null);

export const DP: ProblemSet<"dp"> = {
  maxSubsetSumNoAdjacent: {
    level: 2,
    example: ["4, 9, 6, 2, 8, 7, 3"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, min: 1, max: 14 });
      const n = xs.length;
      const best: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number) => ({
        cells: cells(xs, (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }),
        rows: [row(w.best, xs.map((_, k) => (k < best.length ? best[k] : "")), (k) => (k === i ? "key" : k === i - 1 || k === i - 2 ? "compare" : "plain"))],
      });
      for (let i = 0; i < n; i++) {
        const x = xs[i];
        if (i === 0) {
          best.push(x);
          frames.push({ note: fill(w.first, { x }), ...pic(i) });
        } else if (i === 1) {
          best.push(Math.max(xs[0], x));
          frames.push({ note: fill(w.second, { a: xs[0], b: x, v: best[1] }), ...pic(i) });
        } else {
          const take = best[i - 2] + x;
          const skip = best[i - 1];
          best.push(Math.max(take, skip));
          frames.push({ note: fill(take > skip ? w.take : w.skip, { i, x, j: i - 2, k: i - 1, with: take, without: skip }), ...pic(i) });
        }
      }
      // Read the choices back from the end: an entry was taken where the best sum went up because of it.
      const picks: number[] = [];
      for (let i = n - 1; i >= 0; ) {
        if (i === 0) (picks.push(0), (i = -1));
        else if (i === 1) (picks.push(xs[1] > xs[0] ? 1 : 0), (i = -1));
        else if (best[i] === best[i - 1]) i--;
        else (picks.push(i), (i -= 2));
      }
      picks.reverse();
      const answer = fill(w.answer, { v: best[n - 1], sum: picks.map((k) => xs[k]).join(" + ") });
      return done(frames, answer, { cells: cells(xs, (k) => (picks.includes(k) ? "sorted" : "idle")), rows: [row(w.best, best, (k) => (k === n - 1 ? "sorted" : "plain"))] });
    },
  },

  numberOfWaysToMakeChange: {
    level: 2,
    example: ["10", "2, 3, 5"],
    solve: ([t, c], w, e) => {
      const n = int(t, e, 0, 11);
      const coins = [...new Set(nums(c, e, { whole: true, min: 1, max: 5 }))];
      const m = coins.length;
      const T = blank(m + 1, n + 1);
      T[0] = Array.from({ length: n + 1 }, (_, x) => (x === 0 ? 1 : 0));
      const heads = ["∅", ...coins.map((_, k) => coins.slice(0, k + 1).join(","))];
      const cols = Array.from({ length: n + 1 }, (_, x) => String(x));
      const pic = (role: (r: number, x: number) => Role) => table(T, role, heads, cols);
      const frames: Frame[] = [{ note: w.start, mat: pic((r) => (r === 0 ? "key" : "plain")) }];
      for (let k = 1; k <= m; k++) {
        const cv = coins[k - 1];
        for (let x = 0; x < Math.min(cv, n + 1); x++) T[k][x] = T[k - 1][x];
        frames.push({ note: fill(w.coin, { c: cv }), mat: pic((r, x) => (r === k && x < cv ? "key" : r === k - 1 && x < cv ? "compare" : r > k ? "idle" : "plain")) });
        for (let x = cv; x <= n; x++) {
          const old = T[k - 1][x]!;
          const more = T[k][x - cv]!;
          T[k][x] = old + more;
          frames.push({
            note: fill(w.cell, { x, c: cv, old, more, r: x - cv, v: old + more }),
            mat: pic((r, y) => (r === k && y === x ? "key" : (r === k - 1 && y === x) || (r === k && y === x - cv) ? "compare" : r > k ? "idle" : "plain")),
          });
        }
      }
      const v = T[m][n]!;
      return done(frames, fill(w.answer, { n, v }), { mat: pic((r, x) => (r === m && x === n ? "sorted" : "plain")) });
    },
  },

  minNumberOfCoinsForChange: {
    level: 2,
    example: ["11", "1, 5, 7"],
    solve: ([t, c], w, e) => {
      const n = int(t, e, 0, 11);
      const coins = [...new Set(nums(c, e, { whole: true, min: 1, max: 5 }))];
      const m = coins.length;
      const T = blank(m + 1, n + 1);
      T[0] = Array.from({ length: n + 1 }, (_, x) => (x === 0 ? 0 : Infinity));
      const heads = ["∅", ...coins.map((_, k) => coins.slice(0, k + 1).join(","))];
      const cols = Array.from({ length: n + 1 }, (_, x) => String(x));
      const pic = (role: (r: number, x: number) => Role) => table(T, role, heads, cols);
      const frames: Frame[] = [{ note: w.start, mat: pic((r) => (r === 0 ? "key" : "plain")) }];
      for (let k = 1; k <= m; k++) {
        const cv = coins[k - 1];
        for (let x = 0; x < Math.min(cv, n + 1); x++) T[k][x] = T[k - 1][x];
        frames.push({ note: fill(w.coin, { c: cv }), mat: pic((r, x) => (r === k && x < cv ? "key" : r === k - 1 && x < cv ? "compare" : r > k ? "idle" : "plain")) });
        for (let x = cv; x <= n; x++) {
          const old = T[k - 1][x]!;
          const f = T[k][x - cv]!;
          const cand = f + 1;
          T[k][x] = Math.min(old, cand);
          const note = !Number.isFinite(f) ? w.cant : cand < old ? w.better : w.keep;
          frames.push({
            note: fill(note, { x, c: cv, r: x - cv, f: valText(f), t: valText(cand), old: valText(old) }),
            mat: pic((r, y) => (r === k && y === x ? "key" : (r === k - 1 && y === x) || (r === k && y === x - cv) ? "compare" : r > k ? "idle" : "plain")),
          });
        }
      }
      const v = T[m][n]!;
      const answer = Number.isFinite(v) ? fill(w.answer, { n, v }) : fill(w.none, { n });
      return done(frames, answer, { mat: pic((r, x) => (r === m && x === n ? (Number.isFinite(v) ? "sorted" : "min") : "plain")) });
    },
  },

  levenshteinDistance: {
    level: 2,
    example: ["stone", "tones"],
    solve: ([s1, s2], w, e) => {
      const a = [...text(s1, e, 8, 0)];
      const b = [...text(s2, e, 8, 0)];
      const T = blank(a.length + 1, b.length + 1);
      for (let i = 0; i <= a.length; i++) T[i][0] = i;
      for (let j = 0; j <= b.length; j++) T[0][j] = j;
      const pic = (role: (i: number, j: number) => Role) => table(T, role, ["", ...a], ["", ...b]);
      const frames: Frame[] = [{ note: w.start, mat: pic((i, j) => (i === 0 || j === 0 ? "key" : "plain")) }];
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) {
          const [d, u, l] = [T[i - 1][j - 1]!, T[i - 1][j]!, T[i][j - 1]!];
          const same = a[i - 1] === b[j - 1];
          T[i][j] = same ? d : 1 + Math.min(d, u, l);
          frames.push({
            note: fill(same ? w.same : w.differ, { x: a[i - 1], y: b[j - 1], d, u, l, v: T[i][j]! }),
            mat: pic((r, c) => (r === i && c === j ? "key" : (r === i - 1 && c === j - 1) || (!same && ((r === i - 1 && c === j) || (r === i && c === j - 1))) ? "compare" : "plain")),
          });
        }
      // The path back from the corner: one of the moves that gave each entry its value.
      const path = new Set<string>();
      for (let i = a.length, j = b.length; ; ) {
        path.add(`${i}:${j}`);
        if (i === 0 && j === 0) break;
        const v = T[i][j]!;
        if (i > 0 && j > 0 && ((a[i - 1] === b[j - 1] && v === T[i - 1][j - 1]) || v === T[i - 1][j - 1]! + 1)) (i--, j--);
        else if (i > 0 && v === T[i - 1][j]! + 1) i--;
        else j--;
      }
      const v = T[a.length][b.length]!;
      return done(frames, fill(w.answer, { a: a.join(""), b: b.join(""), v }), { mat: pic((i, j) => (path.has(`${i}:${j}`) ? "sorted" : "plain")) });
    },
  },

  numberOfWaysToTraverseGraph: {
    level: 2,
    example: ["5", "4"],
    solve: ([wd, ht], w, e) => {
      const W = int(wd, e, 1, 10);
      const H = int(ht, e, 1, 8);
      const T = blank(H, W);
      for (let r = 0; r < H; r++) T[r][0] = 1;
      for (let c = 0; c < W; c++) T[0][c] = 1;
      const frames: Frame[] = [{ note: w.start, mat: table(T, (r, c) => (r === 0 || c === 0 ? "key" : "plain")) }];
      for (let r = 1; r < H; r++)
        for (let c = 1; c < W; c++) {
          const [u, l] = [T[r - 1][c]!, T[r][c - 1]!];
          T[r][c] = u + l;
          frames.push({ note: fill(w.cell, { r, c, u, l, v: u + l }), mat: table(T, (i, j) => (i === r && j === c ? "key" : (i === r - 1 && j === c) || (i === r && j === c - 1) ? "compare" : "plain")) });
        }
      const v = T[H - 1][W - 1]!;
      return done(frames, fill(w.answer, { v }), { mat: table(T, (i, j) => (i === H - 1 && j === W - 1 ? "sorted" : "plain")) });
    },
  },

  maxSumIncreasingSubsequence: {
    level: 3,
    example: ["4, 9, -2, 5, 6, 3, 8, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 12 });
      const n = xs.length;
      const sums: number[] = [];
      const prev: number[] = [];
      const frames: Frame[] = [];
      for (let i = 0; i < n; i++) {
        let j = -1;
        for (let k = 0; k < i; k++) if (xs[k] < xs[i] && sums[k] > 0 && (j < 0 || sums[k] > sums[j])) j = k;
        sums.push(j < 0 ? xs[i] : sums[j] + xs[i]);
        prev.push(j);
        frames.push({
          note: j < 0 ? fill(w.alone, { x: show(xs[i]) }) : fill(w.extend, { x: show(xs[i]), y: show(xs[j]), s: show(sums[j]), v: show(sums[i]) }),
          cells: cells(xs, (k) => (k === i ? "key" : k === j ? "pivot" : k < i && xs[k] < xs[i] ? "compare" : k < i ? "idle" : "plain"), { i }),
          rows: [
            row(w.sums, xs.map((_, k) => (k <= i ? sums[k] : "")), (k) => (k === i ? "key" : k === j ? "pivot" : "plain")),
            row(w.from, xs.map((_, k) => (k <= i ? (prev[k] < 0 ? "–" : prev[k]) : "")), (k) => (k === i ? "key" : "plain")),
          ],
        });
      }
      let end = 0;
      for (let k = 1; k < n; k++) if (sums[k] > sums[end]) end = k;
      const seq: number[] = [];
      for (let k = end; k >= 0; k = prev[k]) seq.unshift(k);
      const answer = fill(w.answer, { v: show(sums[end]), list: listText(seq.map((k) => xs[k])) });
      return done(frames, answer, { cells: cells(xs, (k) => (seq.includes(k) ? "sorted" : "idle")) });
    },
  },

  longestCommonSubsequence: {
    level: 3,
    example: ["canoe", "ocean"],
    solve: ([s1, s2], w, e) => {
      const a = [...text(s1, e, 8, 0)];
      const b = [...text(s2, e, 8, 0)];
      const T = blank(a.length + 1, b.length + 1);
      for (let i = 0; i <= a.length; i++) T[i][0] = 0;
      for (let j = 0; j <= b.length; j++) T[0][j] = 0;
      const pic = (role: (i: number, j: number) => Role) => table(T, role, ["", ...a], ["", ...b]);
      const frames: Frame[] = [{ note: w.start, mat: pic((i, j) => (i === 0 || j === 0 ? "key" : "plain")) }];
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) {
          const same = a[i - 1] === b[j - 1];
          const [d, u, l] = [T[i - 1][j - 1]!, T[i - 1][j]!, T[i][j - 1]!];
          T[i][j] = same ? d + 1 : Math.max(u, l);
          frames.push({
            note: fill(same ? w.same : w.differ, { x: a[i - 1], y: b[j - 1], d, u, l, v: T[i][j]! }),
            mat: pic((r, c) => (r === i && c === j ? "key" : same ? (r === i - 1 && c === j - 1 ? "compare" : "plain") : (r === i - 1 && c === j) || (r === i && c === j - 1) ? "compare" : "plain")),
          });
        }
      // Back from the corner: a match goes diagonally and is a letter of the answer; otherwise follow the bigger side.
      const path = new Set<string>();
      const out: string[] = [];
      for (let i = a.length, j = b.length; i > 0 && j > 0; ) {
        path.add(`${i}:${j}`);
        const same = a[i - 1] === b[j - 1];
        const up = T[i - 1][j]! >= T[i][j - 1]!;
        if (same) out.unshift(a[i - 1]);
        frames.push({
          note: fill(same ? w.take : up ? w.up : w.left, { x: a[i - 1], y: b[j - 1], v: T[i][j]! }),
          mat: pic((r, c) => (r === i && c === j ? "key" : path.has(`${r}:${c}`) ? "sorted" : "plain")),
          rows: [row(w.found, out, () => "sorted")],
        });
        if (same) (i--, j--);
        else if (up) i--;
        else j--;
      }
      const answer = out.length ? fill(w.answer, { list: listText(out), n: out.length }) : w.none;
      return done(frames, answer, { rows: [row(w.found, out, () => "sorted")] });
    },
  },

  minNumberOfJumps: {
    level: 3,
    example: ["2, 3, 1, 1, 2, 4, 1, 1, 1, 2"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, min: 1, max: 14 });
      const n = xs.length;
      const frames: Frame[] = [];
      const pic = (i: number, reach: number, steps: number, jumps: number) => ({
        cells: cells(xs, (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }, [i, Math.min(n - 1, i + steps)]),
        rows: [row(w.jumps, [jumps]), row(w.steps, [steps]), row(w.reach, [reach])],
      });
      if (n === 1) {
        frames.push({ note: w.one, ...pic(0, 0, 0, 0) });
        return done(frames, fill(w.answer, { v: 0 }));
      }
      let [reach, steps, jumps] = [xs[0], xs[0], 0];
      frames.push({ note: fill(w.start, { m: reach, s: steps }), ...pic(0, reach, steps, jumps) });
      for (let i = 1; i < n - 1; i++) {
        reach = Math.max(reach, i + xs[i]);
        steps--;
        if (steps === 0) {
          jumps++;
          steps = reach - i;
          frames.push({ note: fill(w.jump, { i, m: reach, j: jumps }), ...pic(i, reach, steps, jumps) });
        } else frames.push({ note: fill(w.walk, { i, r: i + xs[i], m: reach, s: steps }), ...pic(i, reach, steps, jumps) });
      }
      return done(frames, fill(w.answer, { v: jumps + 1 }), { cells: cells(xs, (k) => (k === n - 1 ? "sorted" : "idle")), rows: [row(w.jumps, [jumps + 1], () => "sorted")] });
    },
  },

  waterArea: {
    level: 3,
    example: ["0, 4, 0, 2, 1, 5, 0, 1, 3, 0, 2"],
    solve: ([a], w, e) => {
      const hs = nums(a, e, { whole: true, min: 0, max: 12 });
      const tall = hs.find((h) => h > 8);
      if (tall !== undefined) throw new Error(fill(e.atMost, { s: tall, n: 8 }));
      const n = hs.length;
      const H = Math.max(1, ...hs);
      const left: (number | string)[] = hs.map(() => "");
      const right: (number | string)[] = hs.map(() => "");
      const water: (number | string)[] = hs.map(() => "");
      // The picture: pillars in grey, water in blue, a row per level from the top down.
      const pic = (i: number) => ({
        mat: {
          vals: grid2(H, n, () => ""),
          roles: grid2<Role>(H, n, (r, c) => {
            const lvl = H - r;
            if (lvl <= hs[c]) return "idle";
            if (typeof water[c] === "number" && lvl <= hs[c] + (water[c] as number)) return c === i ? "sorted" : "key";
            return c === i ? "compare" : "plain";
          }),
          rowHeads: Array.from({ length: H }, (_, r) => String(H - r)),
          colHeads: hs.map(String),
        },
        rows: [row(w.left, left, (k) => (k === i ? "key" : "plain")), row(w.right, right, (k) => (k === i ? "key" : "plain")), row(w.water, water, (k) => (k === i ? "key" : "plain"))],
      });
      const frames: Frame[] = [];
      let m = 0;
      for (let i = 0; i < n; i++) {
        left[i] = m;
        frames.push({ note: fill(w.leftNote, { i, m }), ...pic(i) });
        m = Math.max(m, hs[i]);
      }
      m = 0;
      for (let i = n - 1; i >= 0; i--) {
        right[i] = m;
        frames.push({ note: fill(w.rightNote, { i, m }), ...pic(i) });
        m = Math.max(m, hs[i]);
      }
      let total = 0;
      for (let i = 0; i < n; i++) {
        const low = Math.min(left[i] as number, right[i] as number);
        const wv = Math.max(0, low - hs[i]);
        water[i] = wv;
        total += wv;
        frames.push({ note: fill(wv > 0 ? w.fill : w.dry, { i, l: left[i], r: right[i], m: low, h: hs[i], v: wv }), ...pic(i) });
      }
      return done(frames, fill(w.answer, { v: total }), pic(-1));
    },
  },

  knapsackProblem: {
    level: 3,
    example: ["[5, 2], [6, 3], [9, 4], [4, 1]", "6"],
    solve: ([it, cap], w, e) => {
      const items = tuples(it, e, 2, 6).map(([v, wt]) => {
        if (wt < 1) throw new Error(fill(e.atLeast, { s: wt, n: 1 }));
        return [v, wt] as const;
      });
      const C = int(cap, e, 0, 10);
      const m = items.length;
      const T = blank(m + 1, C + 1);
      T[0] = Array.from({ length: C + 1 }, () => 0);
      const heads = ["—", ...items.map(([v, wt]) => `[${v}, ${wt}]`)];
      const cols = Array.from({ length: C + 1 }, (_, c) => String(c));
      const pic = (role: (r: number, c: number) => Role) => table(T, role, heads, cols);
      const frames: Frame[] = [{ note: w.start, mat: pic((r) => (r === 0 ? "key" : "plain")) }];
      for (let k = 1; k <= m; k++) {
        const [v, wt] = items[k - 1];
        for (let c = 0; c < Math.min(wt, C + 1); c++) T[k][c] = T[k - 1][c];
        frames.push({ note: fill(w.item, { k: k - 1, v, wt }), mat: pic((r, c) => (r === k && c < wt ? "key" : r === k - 1 && c < wt ? "compare" : "plain")) });
        for (let c = wt; c <= C; c++) {
          const skip = T[k - 1][c]!;
          const rest = T[k - 1][c - wt]!;
          T[k][c] = Math.max(skip, v + rest);
          frames.push({
            note: fill(w.cell, { c, k: k - 1, skip, v, r: rest, rc: c - wt, take: v + rest, best: T[k][c]! }),
            mat: pic((r, y) => (r === k && y === c ? "key" : r === k - 1 && (y === c || y === c - wt) ? "compare" : "plain")),
          });
        }
      }
      // Back up the rows: where the value changed from the row above, that row's item is in.
      const chosen: number[] = [];
      const path = new Set<string>();
      for (let k = m, c = C; k >= 1; k--) {
        path.add(`${k}:${c}`);
        const now = T[k][c]!;
        const above = T[k - 1][c]!;
        const inIt = now !== above;
        if (inIt) chosen.unshift(k - 1);
        frames.push({ note: fill(inIt ? w.in : w.out, { k: k - 1, v: now, a: above, c: inIt ? c - items[k - 1][1] : c }), mat: pic((r, y) => (r === k && y === c ? "key" : path.has(`${r}:${y}`) ? "sorted" : "plain")) });
        if (inIt) c -= items[k - 1][1];
      }
      const best = T[m][C]!;
      const answer = chosen.length ? fill(w.answer, { v: best, list: listText(chosen) }) : w.nothing;
      return done(frames, answer, { mat: pic((r, y) => (r === m && y === C ? "sorted" : r >= 1 && chosen.includes(r - 1) ? "pivot" : "plain")) });
    },
  },

  diskStacking: {
    level: 3,
    example: ["[3, 3, 2], [1, 2, 1], [4, 5, 3], [2, 2, 6], [5, 6, 4], [3, 4, 7]"],
    solve: ([d], w, e) => {
      const disks = tuples(d, e, 3, 8, 1).map((x, k) => ({ x, k })).sort((p, q) => p.x[2] - q.x[2]).map((p) => p.x);
      const n = disks.length;
      const heights: number[] = [];
      const on: number[] = [];
      const frames: Frame[] = [];
      const fits = (top: number[], bottom: number[]) => top.every((v, t) => v < bottom[t]);
      const pic = (role: (r: number) => Role) => ({
        mat: {
          vals: disks.map((x, r) => [...x, r < heights.length ? heights[r] : "", r < on.length ? (on[r] < 0 ? "–" : on[r]) : ""]),
          roles: disks.map((_, r) => Array.from({ length: 5 }, () => role(r))),
          colHeads: [...w.heads],
        },
      });
      for (let i = 0; i < n; i++) {
        let j = -1;
        for (let k = 0; k < i; k++) if (fits(disks[k], disks[i]) && (j < 0 || heights[k] > heights[j])) j = k;
        heights.push(disks[i][2] + (j < 0 ? 0 : heights[j]));
        on.push(j);
        const v = { d: listText(disks[i]), h: disks[i][2], s: j < 0 ? 0 : heights[j], t: j < 0 ? "" : listText(disks[j]), v: heights[i] };
        frames.push({ note: fill(j < 0 ? w.alone : w.stack, v), ...pic((r) => (r === i ? "key" : r === j ? "pivot" : r < i && fits(disks[r], disks[i]) ? "compare" : r < i ? "idle" : "plain")) });
      }
      let bottom = 0;
      for (let k = 1; k < n; k++) if (heights[k] > heights[bottom]) bottom = k;
      const stack: number[] = [];
      for (let k = bottom; k >= 0; k = on[k]) stack.unshift(k);
      const answer = fill(w.answer, { v: heights[bottom], list: stack.map((k) => listText(disks[k])).join(", ") });
      return done(frames, answer, pic((r) => (stack.includes(r) ? "sorted" : "idle")));
    },
  },

  numbersInPi: {
    level: 3,
    example: ["2718281828", "27, 2718, 18, 28, 1828, 8, 182"],
    solve: ([p, f], w, e) => {
      const s = text(p, e, 14);
      if (!/^\d+$/.test(s)) throw new Error(fill(e.bad, { s }));
      const favs = new Set(words(f, e, 10, 14));
      const odd = [...favs].find((x) => !/^\d+$/.test(x));
      if (odd) throw new Error(fill(e.bad, { s: odd }));
      const n = s.length;
      const digits = [...s];
      const best: number[] = [0, ...digits.map(() => Infinity)];
      const from: number[] = [0, ...digits.map(() => -1)];
      const frames: Frame[] = [];
      const bestRow = (j: number) => row(w.pieces, best.map((v, k) => (k <= j ? val(v) : "")), (k) => (k === j ? "key" : k === from[j] && j > 0 && from[j] >= 0 ? "compare" : "plain"));
      for (let j = 1; j <= n; j++) {
        for (let i = 0; i < j; i++) if (Number.isFinite(best[i]) && favs.has(s.slice(i, j)) && best[i] + 1 < best[j]) (best[j] = best[i] + 1), (from[j] = i);
        const i = from[j];
        frames.push({
          note: i < 0 ? fill(w.none, { j }) : fill(w.found, { j, i, p: s.slice(i, j), b: best[i], v: best[j] }),
          cells: cells(digits, (k) => (i >= 0 && k >= i && k < j ? "key" : k < j ? "idle" : "plain"), undefined, i >= 0 ? [i, j - 1] : undefined),
          rows: [bestRow(j)],
        });
      }
      if (!Number.isFinite(best[n])) return done(frames, w.never);
      const pieces: string[] = [];
      for (let j = n; j > 0; j = from[j]) pieces.unshift(s.slice(from[j], j));
      const cuts = new Set<number>();
      let at = 0;
      for (const q of pieces) cuts.add((at += q.length));
      return done(frames, fill(w.answer, { v: best[n] - 1, split: pieces.join(" ") }), {
        cells: cells(digits, (k) => ([...cuts].filter((c) => c <= k).length % 2 ? "pivot" : "sorted")),
        rows: [row(w.split, pieces, () => "sorted")],
      });
    },
  },

  maximumSumSubmatrix: {
    level: 3,
    example: ["2, -1, 3, 0; -4, 5, 1, -2; 3, 2, -6, 4; 1, 0, 2, 3", "2"],
    solve: ([a, k], w, e) => {
      const m = matrix(a, e, { rows: 6, cols: 6, whole: true });
      const [R, C] = [m.length, m[0].length];
      const s = int(k, e, 1, Math.min(R, C));
      const S = blank(R, C);
      const at = (r: number, c: number) => (r < 0 || c < 0 ? 0 : S[r][c]!);
      const frames: Frame[] = [];
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          S[r][c] = m[r][c] + at(r - 1, c) + at(r, c - 1) - at(r - 1, c - 1);
          frames.push({
            note: fill(w.prefix, { r, c, x: show(m[r][c]), u: term(at(r - 1, c)), l: term(at(r, c - 1)), d: term(at(r - 1, c - 1)), v: show(S[r][c]!) }),
            mat: table(S, (i, j) => (i === r && j === c ? "key" : (i === r - 1 && j === c) || (i === r && j === c - 1) || (i === r - 1 && j === c - 1) ? "compare" : "plain")),
            rows: [row(fill(w.rowOf, { r }), m[r], (j) => (j === c ? "key" : "plain"))],
          });
        }
      let best = -Infinity;
      let corner = [s - 1, s - 1];
      const inSq = (i: number, j: number, r: number, c: number) => i > r - s && i <= r && j > c - s && j <= c;
      for (let r = s - 1; r < R; r++)
        for (let c = s - 1; c < C; c++) {
          const [A, B, D, E] = [at(r, c), at(r - s, c), at(r, c - s), at(r - s, c - s)];
          const sum = A - B - D + E;
          const better = sum > best;
          frames.push({
            note: fill(better ? w.better : w.worse, { r, c, a: show(A), b: term(B), d: term(D), e: term(E), v: show(sum), best: Number.isFinite(best) ? show(best) : "" }),
            mat: { vals: m, roles: grid2(R, C, (i, j) => (inSq(i, j, r, c) ? (better ? "key" : "compare") : inSq(i, j, corner[0], corner[1]) && Number.isFinite(best) ? "sorted" : "plain")) },
          });
          if (better) (best = sum), (corner = [r, c]);
        }
      return done(frames, fill(w.answer, { s, v: show(best) }), { mat: { vals: m, roles: grid2(R, C, (i, j) => (inSq(i, j, corner[0], corner[1]) ? "sorted" : "plain")) }, rows: [] });
    },
  },

  maximizeExpression: {
    level: 3,
    example: ["3, 6, 1, -3, 2, 7"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 12 });
      const n = xs.length;
      const frames: Frame[] = [];
      if (n < 4) {
        frames.push({ note: w.few, cells: cells(xs) });
        return done(frames, w.answerFew);
      }
      const M = blank(4, n);
      const pic = (role: (r: number, c: number) => Role) => table(M, role, [...w.heads], xs.map(show));
      const ops = ["", "−", "+", "−"];
      for (let r = 0; r < 4; r++)
        for (let i = r; i < n; i++) {
          const x = xs[i];
          if (r === 0) {
            const old = i === 0 ? -Infinity : M[0][i - 1]!;
            M[0][i] = Math.max(old, x);
            frames.push({ note: i === 0 ? fill(w.firstA, { x: show(x) }) : fill(w.a, { i, old: show(old), x: show(x), v: show(M[0][i]!) }), mat: pic((p, q) => (p === 0 && q === i ? "key" : p === 0 && q === i - 1 ? "compare" : "plain")) });
            continue;
          }
          const p = M[r - 1][i - 1]!;
          const cand = r === 2 ? p + x : p - x;
          const v = { h: w.heads[r], i, p: show(p), op: ops[r], x: show(Math.abs(x)), c: show(cand), old: "", v: "" };
          if (r === 2 && x < 0) v.op = "−";
          if (r !== 2 && x < 0) v.op = "+";
          if (i === r) {
            M[r][i] = cand;
            frames.push({ note: fill(w.first, { ...v, v: show(cand) }), mat: pic((q, y) => (q === r && y === i ? "key" : q === r - 1 && y === i - 1 ? "compare" : "plain")) });
          } else {
            const old = M[r][i - 1]!;
            M[r][i] = Math.max(old, cand);
            frames.push({ note: fill(w.next, { ...v, old: show(old), v: show(M[r][i]!) }), mat: pic((q, y) => (q === r && y === i ? "key" : (q === r - 1 && y === i - 1) || (q === r && y === i - 1) ? "compare" : "plain")) });
          }
        }
      const best = M[3][n - 1]!;
      return done(frames, fill(w.answer, { v: show(best) }), { mat: pic((q, y) => (q === 3 && y === n - 1 ? "sorted" : "plain")) });
    },
  },

  diceThrows: {
    level: 3,
    example: ["3", "4", "8"],
    solve: ([nd, ns, nt], w, e) => {
      const D = int(nd, e, 1, 6);
      const S = int(ns, e, 1, 9);
      const T = int(nt, e, 1, 12);
      const W = blank(D, T);
      for (let t = 1; t <= T; t++) W[0][t - 1] = t <= S ? 1 : 0;
      const heads = Array.from({ length: D }, (_, d) => String(d + 1));
      const cols = Array.from({ length: T }, (_, t) => String(t + 1));
      const pic = (role: (r: number, c: number) => Role) => table(W, role, heads, cols);
      const frames: Frame[] = [{ note: fill(w.one, { s: S }), mat: pic((r) => (r === 0 ? "key" : "plain")) }];
      for (let d = 2; d <= D; d++) {
        for (let t = 1; t < d && t <= T; t++) W[d - 1][t - 1] = 0;
        if (d > T) continue;
        for (let t = d; t <= T; t++) {
          const from: number[] = [];
          for (let f = 1; f <= S && t - f >= 1; f++) from.push(t - f);
          const terms = from.map((u) => W[d - 2][u - 1]!);
          const v = terms.reduce((x, y) => x + y, 0);
          W[d - 1][t - 1] = v;
          frames.push({
            note: fill(w.cell, { d, t, f: Math.min(S, t - 1), terms: terms.length ? terms.join(" + ") : "0", v }),
            mat: pic((r, c) => (r === d - 1 && c === t - 1 ? "key" : r === d - 2 && from.includes(c + 1) ? "compare" : "plain")),
          });
        }
      }
      const v = W[D - 1][T - 1]!;
      return done(frames, fill(w.answer, { t: T, n: D, s: S, v }), { mat: pic((r, c) => (r === D - 1 && c === T - 1 ? "sorted" : "plain")) });
    },
  },

  juiceBottling: {
    level: 3,
    example: ["0, 1, 3, 2, 6, 7, 8"],
    solve: ([a], w, e) => {
      const prices = nums(a, e, { whole: true, min: 0, max: 12, least: 2 });
      if (prices[0] !== 0) throw new Error(w.zero);
      const n = prices.length - 1;
      const best: number[] = [0];
      const last: number[] = [0];
      const frames: Frame[] = [];
      for (let u = 1; u <= n; u++) {
        const tries = Array.from({ length: u }, (_, k) => prices[k + 1] + best[u - k - 1]);
        let s = 1;
        for (let k = 2; k <= u; k++) if (tries[k - 1] > tries[s - 1]) s = k;
        best.push(tries[s - 1]);
        last.push(s);
        frames.push({
          note: fill(w.units, { n: u, s, p: prices[s], r: u - s, b: best[u - s], v: best[u] }),
          cells: cells(prices, (k) => (k === s ? "key" : k >= 1 && k <= u ? "compare" : "plain")),
          rows: [
            row(w.tries, tries, (k) => (k === s - 1 ? "key" : "plain")),
            row(w.best, prices.map((_, k) => (k <= u ? best[k] : "")), (k) => (k === u ? "key" : k === u - s ? "compare" : "plain")),
          ],
        });
      }
      const sizes: number[] = [];
      for (let u = n; u > 0; u -= last[u]) sizes.push(last[u]);
      sizes.sort((x, y) => x - y);
      return done(frames, fill(w.answer, { list: listText(sizes), v: best[n] }), {
        cells: cells(prices, (k) => (sizes.includes(k) ? "sorted" : "plain")),
        rows: [row(w.bottles, sizes, () => "sorted"), row(w.best, best, (k) => (k === n ? "sorted" : "plain"))],
      });
    },
  },

  maxProfitWithKTransactions: {
    level: 4,
    example: ["6, 2, 9, 4, 3, 8, 1, 5", "2"],
    solve: ([a, kk], w, e) => {
      const prices = nums(a, e, { whole: true, min: 0, max: 10 });
      const K = int(kk, e, 1, 5);
      const n = prices.length;
      const P = blank(K + 1, n);
      P[0] = prices.map(() => 0);
      for (let t = 1; t <= K; t++) P[t][0] = 0;
      const heads = Array.from({ length: K + 1 }, (_, t) => String(t));
      const pic = (role: (r: number, c: number) => Role) => table(P, role, heads, prices.map(String));
      const frames: Frame[] = [{ note: w.start, mat: pic((r, c) => (r === 0 || c === 0 ? "key" : "plain")) }];
      for (let t = 1; t <= K; t++) {
        let buy = -Infinity;
        let at = 0;
        for (let d = 1; d < n; d++) {
          const here = P[t - 1][d - 1]! - prices[d - 1];
          if (here > buy) (buy = here), (at = d - 1);
          const rest = P[t][d - 1]!;
          const sell = buy + prices[d];
          P[t][d] = Math.max(rest, sell);
          frames.push({
            note: fill(w.cell, { d, t, r: rest, p: prices[d], b: prices[at], m: show(buy), s: show(sell), v: P[t][d]! }),
            mat: pic((r, c) => (r === t && c === d ? "key" : (r === t && c === d - 1) || (r === t - 1 && c === at) ? "compare" : "plain")),
          });
        }
      }
      const v = P[K][n - 1]!;
      return done(frames, fill(w.answer, { k: K, v }), { mat: pic((r, c) => (r === K && c === n - 1 ? "sorted" : "plain")) });
    },
  },

  palindromePartitioningMinCuts: {
    level: 4,
    example: ["noonabbad"],
    solve: ([t], w, e) => {
      const s = [...text(t, e, 9)];
      const n = s.length;
      const pal = grid2<boolean | null>(n, n, () => null);
      const q = (i: number, j: number) => fill(w.q, { s: s.slice(i, j + 1).join("") });
      const palPic = (role: (i: number, j: number) => Role) => ({
        vals: pal.map((r) => r.map((v) => (v === null ? "" : v ? "✓" : "✗"))),
        roles: grid2<Role>(n, n, role),
        rowHeads: [...s],
        colHeads: [...s],
      });
      const frames: Frame[] = [];
      for (let len = 1; len <= n; len++) {
        const found: string[] = [];
        for (let i = 0; i + len - 1 < n; i++) {
          const j = i + len - 1;
          pal[i][j] = s[i] === s[j] && (len <= 2 || pal[i + 1][j - 1] === true);
          if (pal[i][j]) found.push(q(i, j));
        }
        frames.push({
          note: len === 1 ? w.single : found.length ? fill(w.length, { l: len, list: found.join(", ") }) : fill(w.noPal, { l: len }),
          mat: palPic((i, j) => (j - i === len - 1 ? (pal[i][j] ? "key" : "compare") : pal[i][j] === null ? "idle" : pal[i][j] ? "sorted" : "plain")),
        });
      }
      const cuts: number[] = [];
      const start: number[] = [];
      for (let j = 0; j < n; j++) {
        if (pal[0][j]) (cuts[j] = 0), (start[j] = 0);
        else {
          cuts[j] = Infinity;
          for (let i = 1; i <= j; i++) if (pal[i][j] && cuts[i - 1] + 1 < cuts[j]) (cuts[j] = cuts[i - 1] + 1), (start[j] = i);
        }
        const i = start[j];
        frames.push({
          note: i === 0 ? fill(w.whole, { p: q(0, j) }) : fill(w.cut, { p: q(0, j), last: q(i, j), c: cuts[i - 1], v: cuts[j] }),
          mat: palPic((r, c) => (c === j && r === i ? "key" : c === j && pal[r][c] ? "compare" : "idle")),
          rows: [row(w.cuts, s.map((_, k) => (k <= j ? cuts[k] : "")), (k) => (k === j ? "key" : k === i - 1 ? "compare" : "plain"))],
        });
      }
      const pieces: string[] = [];
      for (let j = n - 1; j >= 0; j = start[j] - 1) pieces.unshift(s.slice(start[j], j + 1).join(""));
      return done(frames, fill(w.answer, { v: cuts[n - 1], pieces: pieces.join(" | ") }), { rows: [row(w.cuts, cuts, (k) => (k === n - 1 ? "sorted" : "plain")), row(w.split, pieces, () => "sorted")] });
    },
  },

  longestIncreasingSubsequence: {
    level: 4,
    example: ["5, 2, 8, 6, 3, 6, 9, 5"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 14 });
      const n = xs.length;
      const tails: number[] = []; // tails[L] = index of the smallest last number of an increasing run of length L + 1
      const prev: number[] = [];
      const frames: Frame[] = [];
      for (let i = 0; i < n; i++) {
        // Binary search: the first tail that is not smaller than xs[i].
        let [lo, hi] = [0, tails.length];
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (xs[tails[mid]] < xs[i]) lo = mid + 1;
          else hi = mid;
        }
        const grow = lo === tails.length;
        const old = grow ? 0 : xs[tails[lo]];
        prev.push(lo > 0 ? tails[lo - 1] : -1);
        tails[lo] = i;
        frames.push({
          note: grow ? fill(w.grow, { x: show(xs[i]), l: lo + 1 }) : fill(w.replace, { x: show(xs[i]), old: show(old), l: lo + 1 }),
          cells: cells(xs, (k) => (k === i ? "key" : tails.includes(k) ? "pivot" : k < i ? "idle" : "plain"), { i }),
          rows: [
            row(w.tails, tails.map((k) => xs[k]), (k) => (k === lo ? "key" : "plain")),
            row(w.before, xs.map((_, k) => (k <= i ? (prev[k] < 0 ? "–" : prev[k]) : "")), (k) => (k === i ? "key" : "plain")),
          ],
        });
      }
      const seq: number[] = [];
      for (let k = tails[tails.length - 1]; k >= 0; k = prev[k]) seq.unshift(k);
      return done(frames, fill(w.answer, { list: listText(seq.map((k) => xs[k])) }), { cells: cells(xs, (k) => (seq.includes(k) ? "sorted" : "idle")) });
    },
  },

  longestStringChain: {
    level: 4,
    example: ["strap, a, tap, at, trap, ta, pat, tra"],
    solve: ([s], w, e) => {
      const list = [...new Set(words(s, e, 10, 8))].map((x, k) => ({ x, k })).sort((p, q) => p.x.length - q.x.length || p.k - q.k).map((p) => p.x);
      const n = list.length;
      const lens = [...new Set(list.map((x) => x.length))];
      const layer = list.map((x) => lens.indexOf(x.length));
      const idx = new Map(list.map((x, k) => [x, k]));
      const chain: number[] = [];
      const down: number[] = [];
      const links: { a: number; b: number }[] = [];
      const q = (x: string) => fill(w.q, { s: x });
      const frames: Frame[] = [];
      const pic = (role: (k: number) => Role, edge: (a: number, b: number) => Role) => ({
        graph: {
          nodes: list,
          edges: links.map((l) => ({ ...l, role: edge(l.a, l.b) })),
          roles: list.map((_, k) => role(k)),
          directed: true,
          layer,
          tags: list.map((_, k) => (k < chain.length ? String(chain[k]) : "")),
        },
      });
      for (let i = 0; i < n; i++) {
        const x = [...list[i]];
        const found = [...new Set(x.map((_, k) => [...x.slice(0, k), ...x.slice(k + 1)].join("")))].filter((y) => idx.has(y)).map((y) => idx.get(y)!);
        let best = -1;
        for (const j of found) {
          links.push({ a: i, b: j });
          if (best < 0 || chain[j] > chain[best]) best = j;
        }
        chain.push(best < 0 ? 1 : chain[best] + 1);
        down.push(best);
        frames.push({
          note: best < 0 ? fill(w.alone, { w: q(list[i]) }) : fill(w.link, { w: q(list[i]), list: found.map((j) => q(list[j])).join(", "), b: q(list[best]), c: chain[best], v: chain[i] }),
          ...pic((k) => (k === i ? "key" : k === best ? "pivot" : found.includes(k) ? "compare" : k < i ? "plain" : "idle"), (a, b) => (a === i ? (b === best ? "key" : "compare") : "plain")),
        });
      }
      let top = 0;
      for (let k = 1; k < n; k++) if (chain[k] > chain[top]) top = k;
      if (chain[top] < 2) return done(frames, w.none);
      const path: number[] = [];
      for (let k = top; k >= 0; k = down[k]) path.push(k);
      const onPath = (a: number, b: number) => path.indexOf(b) === path.indexOf(a) + 1 && path.includes(a);
      return done(frames, fill(w.answer, { list: path.map((k) => q(list[k])).join(" → ") }), pic((k) => (path.includes(k) ? "sorted" : "idle"), (a, b) => (onPath(a, b) ? "sorted" : "idle")));
    },
  },

  squareOfZeroes: {
    level: 4,
    example: ["1, 1, 1, 0, 1; 0, 0, 0, 0, 1; 0, 1, 0, 0, 1; 0, 0, 0, 1, 1; 1, 0, 1, 1, 0"],
    solve: ([a], w, e) => {
      const m = matrix(a, e, { rows: 6, cols: 6, whole: true, min: 0, max: 1 });
      const n = m.length;
      if (m[0].length !== n) throw new Error(w.square);
      // How many zeros run right from each cell, and down from it.
      const right = grid2(n, n, () => 0);
      const below = grid2(n, n, () => 0);
      const counts = (from: number) => ({
        vals: grid2(n, n, (r, c) => (r < from ? "" : m[r][c] ? "" : `${right[r][c]},${below[r][c]}`)),
        roles: grid2<Role>(n, n, (r, c) => (r < from ? "plain" : m[r][c] ? "idle" : r === from ? "key" : "plain")),
      });
      const frames: Frame[] = [];
      for (let r = n - 1; r >= 0; r--) {
        for (let c = n - 1; c >= 0; c--) {
          if (m[r][c]) continue;
          right[r][c] = 1 + (c + 1 < n ? right[r][c + 1] : 0);
          below[r][c] = 1 + (r + 1 < n ? below[r + 1][c] : 0);
        }
        frames.push({ note: fill(w.counts, { r }), mat: counts(r) });
      }
      const border = (r: number, c: number, s: number) => (i: number, j: number) =>
        i >= r && i < r + s && j >= c && j < c + s && (i === r || i === r + s - 1 || j === c || j === c + s - 1);
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (m[r][c]) continue;
          for (let s = 2; r + s <= n && c + s <= n; s++) {
            const [t, l, b, rt] = [right[r][c], below[r][c], right[r + s - 1][c], below[r][c + s - 1]];
            const ok = t >= s && l >= s && b >= s && rt >= s;
            const on = border(r, c, s);
            const v = { r, c, s, t, l, b, rt, r2: r + s - 1, c2: c + s - 1 };
            frames.push({ note: fill(ok ? w.yes : w.no, v), mat: { vals: m, roles: grid2(n, n, (i, j) => (on(i, j) ? (ok ? "sorted" : m[i][j] ? "min" : "compare") : "plain")) } });
            if (ok) return done(frames, fill(w.answer, v));
          }
        }
      if (!frames.some((f) => f.mat?.vals === m)) frames.push({ note: w.small, mat: { vals: m, roles: grid2(n, n, () => "plain") } });
      return done(frames, w.answerNo);
    },
  },

  burstBalloons: {
    level: 4,
    example: ["2, 4, 1, 3, 5"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 6, whole: true, min: 0 });
      const big = xs.find((x) => x > 9);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: show(big), n: 9 }));
      const n = xs.length;
      /** A balloon's number, with a 1 past either end. */
      const v = (i: number) => (i < 0 || i >= n ? 1 : xs[i]);
      // best[i][j]: the most coins for balloons i..j alone; last[i][j]: the one to burst last for it.
      const best = grid2<number | null>(n, n, () => null);
      const last = grid2(n, n, () => -1);
      const get = (i: number, j: number) => (i > j ? 0 : best[i][j]!);
      const pic = (role: (r: number, c: number) => Role) => ({
        vals: best.map((r) => r.map((x) => (x === null ? "" : x))),
        roles: grid2<Role>(n, n, role),
        rowHeads: xs.map(show),
        colHeads: xs.map(show),
      });
      const frames: Frame[] = [{ note: w.start, mat: pic(() => "idle") }];
      for (let len = 1; len <= n; len++)
        for (let i = 0; i + len - 1 < n; i++) {
          const j = i + len - 1;
          for (let k = i; k <= j; k++) {
            const c = get(i, k - 1) + v(i - 1) * v(k) * v(j + 1) + get(k + 1, j);
            if (best[i][j] === null || c > best[i][j]!) (best[i][j] = c), (last[i][j] = k);
          }
          const k = last[i][j];
          frames.push({
            note: fill(w.cell, { list: listText(xs.slice(i, j + 1)), b: show(xs[k]), l: show(v(i - 1)), r: show(v(j + 1)), left: get(i, k - 1), right: get(k + 1, j), c: best[i][j]! }),
            mat: pic((r, c) => (r === i && c === j ? "key" : (r === i && c === k - 1) || (r === k + 1 && c === j) ? "compare" : best[r][c] === null ? "idle" : "plain")),
          });
        }
      // The two sides are burst before the one that goes last, each on its own.
      const order = (i: number, j: number): number[] => (i > j ? [] : [...order(i, last[i][j] - 1), ...order(last[i][j] + 1, j), last[i][j]]);
      return done(frames, fill(w.answer, { c: best[0][n - 1]!, order: order(0, n - 1).map((k) => show(xs[k])).join(" → ") }), {
        mat: pic((r, c) => (r === 0 && c === n - 1 ? "sorted" : "plain")),
      });
    },
  },
};
