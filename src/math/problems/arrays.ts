// Interview problems on arrays: each solver reads its inputs, works the problem out the way it is meant to be worked
// out (a set, two pointers, a running sum…), and leaves a frame at every step with a note on what happened.
import { cells, done, fill, grid2, int, listText, matrix, nums, row, show, type Frame, type ProblemSet } from "./core";

export const ARRAYS: ProblemSet<"arrays"> = {
  twoNumberSum: {
    level: 1,
    example: ["4, 7, -2, 9, 1, 5, 12", "10"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e);
      const T = int(t, e, -999, 999);
      const seen: number[] = [];
      const frames: Frame[] = [];
      for (const [i, x] of xs.entries()) {
        const need = T - x;
        const j = seen.indexOf(need);
        const v = { x: show(x), t: show(T), need: show(need) };
        if (j >= 0) {
          const at = xs.indexOf(need);
          frames.push({ note: fill(w.hit, v), cells: cells(xs, (k) => (k === i || k === at ? "sorted" : k < i ? "idle" : "plain"), { i }), rows: [row(w.seen, seen, (k) => (k === j ? "sorted" : "plain"))] });
          return done(frames, fill(w.answer, { a: show(need), b: show(x), t: show(T) }));
        }
        seen.push(x);
        frames.push({ note: fill(w.look, v), cells: cells(xs, (k) => (k === i ? "compare" : k < i ? "idle" : "plain"), { i }), rows: [row(w.seen, seen, (k) => (k === seen.length - 1 ? "key" : "plain"))] });
      }
      return done(frames, fill(w.none, { t: show(T) }));
    },
  },

  validateSubsequence: {
    level: 1,
    example: ["5, 1, 22, 25, 6, -1, 8, 10", "1, 6, -1, 10"],
    solve: ([a, b], w, e) => {
      const xs = nums(a, e);
      const seq = nums(b, e);
      const frames: Frame[] = [];
      let j = 0;
      const seqRow = () => row(w.sequence, seq, (k) => (k < j ? "sorted" : k === j ? "key" : "plain"));
      for (let i = 0; i < xs.length && j < seq.length; i++) {
        const hit = xs[i] === seq[j];
        if (hit) j++;
        frames.push({
          note: fill(hit ? w.match : w.skip, { i, v: show(xs[i]), j, want: show(seq[j - (hit ? 1 : 0)]) }),
          cells: cells(xs, (k) => (k === i ? (hit ? "sorted" : "compare") : k < i ? "idle" : "plain"), { i }),
          rows: [seqRow()],
        });
      }
      return done(frames, j === seq.length ? w.yes : fill(w.no, { want: show(seq[j]) }));
    },
  },

  sortedSquaredArray: {
    level: 1,
    example: ["-7, -3, -1, 2, 4, 9"],
    solve: ([a], w, e) => {
      const xs = nums(a, e);
      if (xs.some((x, i) => i > 0 && x < xs[i - 1])) throw new Error(w.notSorted);
      const out: (number | string)[] = xs.map(() => "");
      const frames: Frame[] = [];
      let [l, r] = [0, xs.length - 1];
      for (let k = xs.length - 1; k >= 0; k--) {
        const [sl, sr] = [xs[l] ** 2, xs[r] ** 2];
        const left = sl >= sr;
        out[k] = left ? sl : sr;
        const v = { l: show(xs[l]), r: show(xs[r]), sl, sr, k };
        frames.push({
          note: fill(left ? w.left : w.right, v),
          cells: cells(xs, (i) => (i === (left ? l : r) ? "key" : i === l || i === r ? "compare" : i < l || i > r ? "idle" : "plain"), { L: l, R: r }),
          rows: [row(w.result, out, (i) => (i === k ? "key" : i > k ? "sorted" : "idle"))],
        });
        if (left) l++;
        else r--;
      }
      return done(frames, fill(w.answer, { list: listText(out) }));
    },
  },

  tournamentWinner: {
    level: 1,
    example: ["Lions-Bears, Bears-Hawks, Hawks-Lions, Lions-Hawks", "0, 1, 1, 1"],
    solve: ([m, r], w, e) => {
      const matches = m.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
        const p = x.split(/\s*[-–]\s*/);
        if (p.length !== 2 || !p[0] || !p[1] || p[0] === p[1]) throw new Error(fill(e.bad, { s: x }));
        return p as [string, string];
      });
      if (!matches.length) throw new Error(e.empty);
      if (matches.length > 10) throw new Error(fill(e.tooMany, { n: 10 }));
      const res = nums(r, e, { whole: true, max: 10 });
      if (res.length !== matches.length) throw new Error(fill(w.count, { m: matches.length, r: res.length }));
      if (res.some((x) => x !== 0 && x !== 1)) throw new Error(fill(e.bad, { s: res.find((x) => x !== 0 && x !== 1)! }));
      const teams = [...new Set(matches.flat())];
      const pts = teams.map(() => 0);
      let best = -1;
      const frames: Frame[] = [];
      for (const [k, [h, a]] of matches.entries()) {
        const win = res[k] === 1 ? h : a;
        const i = teams.indexOf(win);
        pts[i] += 3;
        const lead = best < 0 || pts[i] > pts[best];
        if (lead) best = i;
        frames.push({
          note: fill(lead ? w.lead : w.match, { h, a, w: win, p: pts[i] }),
          rows: [row(w.points, teams.map((t, j) => `${t}: ${pts[j]}`), (j) => (j === i ? "key" : j === best ? "sorted" : "plain"))],
        });
      }
      return done(frames, fill(w.answer, { w: teams[best], p: pts[best] }));
    },
  },

  nonConstructibleChange: {
    level: 1,
    example: ["5, 7, 1, 1, 2, 3, 22"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, min: 1 }).sort((x, y) => x - y);
      const frames: Frame[] = [];
      let c = 0;
      for (const [i, x] of xs.entries()) {
        if (x > c + 1) {
          frames.push({ note: fill(w.gap, { x, c, g: c + 1 }), cells: cells(xs, (k) => (k === i ? "min" : k < i ? "sorted" : "plain"), { i }), rows: [row(w.made, [c])] });
          return done(frames, fill(w.answer, { g: c + 1 }));
        }
        c += x;
        frames.push({ note: fill(w.take, { x, c: c - x, n: c }), cells: cells(xs, (k) => (k === i ? "key" : k < i ? "sorted" : "plain"), { i }), rows: [row(w.made, [c], () => "key")] });
      }
      return done(frames, fill(w.answer, { g: c + 1 }));
    },
  },

  transposeMatrix: {
    level: 1,
    example: ["1, 2, 3; 4, 5, 6"],
    solve: ([a], w, e) => {
      const m = matrix(a, e, { rows: 6, cols: 6 });
      const [R, C] = [m.length, m[0].length];
      const out: number[][] = [];
      const frames: Frame[] = [];
      for (let j = 0; j < C; j++) {
        out.push(m.map((r) => r[j]));
        frames.push({
          note: fill(w.column, { j, list: listText(out[j]) }),
          mat: { vals: m, roles: grid2(R, C, (_, c) => (c === j ? "key" : c < j ? "sorted" : "plain")) },
          rows: out.map((r, k) => row(fill(w.resultRow, { j: k }), r, () => (k === j ? "key" : "sorted"))),
        });
      }
      return done(frames, fill(w.answer, { rows: out.map((r) => listText(r)).join(", ") }));
    },
  },
};
