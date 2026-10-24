// Interview problems on arrays: each solver reads its inputs, works the problem out the way it is meant to be worked
// out (a set, two pointers, a running sum…), and leaves a frame at every step with a note on what happened.
import { cells, done, fill, grid2, int, intervals, listText, matrix, nums, points, rolesOf, row, show, words, type Errors, type Frame, type ProblemSet, type Role } from "./core";

type Pt = [number, number];
type Mat = NonNullable<Frame["mat"]>;

const ascending = (a: number, b: number) => a - b;
const sum = (a: readonly number[]) => a.reduce((s, x) => s + x, 0);
/** Products without a −0 in them. */
const times = (a: number, b: number) => a * b + 0;
/** Lists one after another: "[1, 2], [3, 4]". */
const lists = (xs: readonly (readonly number[])[]) => xs.map((x) => listText(x)).join(", ");
/** Lists of numbers in dictionary order. */
const byList = (a: readonly number[], b: readonly number[]) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
};
const at = ([x, y]: readonly [number, number]) => `(${show(x)}, ${show(y)})`;
const ptKey = (x: number, y: number) => `${x + 0},${y + 0}`;
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

function distinct(xs: readonly number[], message: string) {
  if (new Set(xs).size !== xs.length) throw new Error(message);
}

/** Distinct points with whole coordinates. */
function pointSet(s: string, e: Errors, w: { distinct: string }, max = 8): Pt[] {
  // A lone point written "3, 4" would read as two halves of points, so it is read on its own.
  const pts = !s.includes(";") && (s.match(/-?\d+/g) ?? []).length === 2 ? [square(s, e)] : points(s, e, max);
  if (new Set(pts.map(([x, y]) => ptKey(x, y))).size !== pts.length) throw new Error(w.distinct);
  return pts;
}

/** A piece of the plane as a table, y going up, with a dot on every point; `role` colours the squares it names. */
function plane(pts: readonly Pt[], tooWide: string) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (x1 - x0 > 11 || y1 - y0 > 8) throw new Error(tooWide);
  const has = new Set(pts.map(([x, y]) => ptKey(x, y)));
  const [R, C] = [y1 - y0 + 1, x1 - x0 + 1];
  return (role: (x: number, y: number) => Role | undefined = () => undefined): Mat => ({
    vals: grid2(R, C, (r, c) => (has.has(ptKey(x0 + c, y1 - r)) ? "●" : "")),
    roles: grid2(R, C, (r, c) => role(x0 + c, y1 - r) ?? (has.has(ptKey(x0 + c, y1 - r)) ? "plain" : "idle")),
    rowHeads: Array.from({ length: R }, (_, r) => show(y1 - r)),
    colHeads: Array.from({ length: C }, (_, c) => show(x0 + c)),
  });
}

/** The slope from p to q as a fraction in its lowest terms, "∞" when the line is upright. */
function slope(p: Pt, q: Pt): string {
  let [dx, dy] = [q[0] - p[0], q[1] - p[1]];
  if (dx === 0) return "∞";
  if (dx < 0) [dx, dy] = [-dx, -dy];
  const g = gcd(dx, Math.abs(dy));
  [dx, dy] = [dx / g, dy / g];
  return dy === 0 ? "0" : dx === 1 ? show(dy) : `${show(dy)}/${dx}`;
}

/** One square of the board, "x, y" or "(x, y)". */
function square(s: string, e: Errors): Pt {
  const p = s.replace(/[−–—]/g, "-").replace(/[()[\]]/g, " ").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (p.length !== 2 || !p.every((v) => Number.isInteger(v) && Math.abs(v) <= 99)) throw new Error(fill(e.point, { s: s.trim() || "…" }));
  return [p[0], p[1]];
}

/** "9:30" as minutes after midnight. */
function clock(s: string, bad: string): number {
  const m = s.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(fill(bad, { s: s.trim() }));
  return Number(m[1]) * 60 + Number(m[2]);
}
const hhmm = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
/** Meetings "9:00-10:30, 12:00-13:00", sorted by start. */
function meetings(s: string, bad: string, e: Errors, max: number): Pt[] {
  const out = s.replace(/[–—−]/g, "-").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x): Pt => {
    const p = x.split("-");
    if (p.length !== 2) throw new Error(fill(bad, { s: x }));
    const [a, b] = [clock(p[0], bad), clock(p[1], bad)];
    if (a >= b) throw new Error(fill(bad, { s: x }));
    return [a, b];
  });
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return out.sort((p, q) => p[0] - q[0]);
}

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

  threeNumberSum: {
    level: 2,
    example: ["3, -4, 8, 1, -1, 6, 2", "5"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e, { max: 12, whole: true, least: 3 }).sort(ascending);
      distinct(xs, w.distinct);
      const T = int(t, e, -999, 999);
      const found: number[][] = [];
      const foundRow = (fresh: boolean) => row(w.triplets, found.map((f) => listText(f)), (k) => (fresh && k === found.length - 1 ? "key" : "sorted"));
      const frames: Frame[] = [{ note: fill(w.sorted, { list: listText(xs) }), cells: cells(xs), rows: [foundRow(false)] }];
      for (let i = 0; i < xs.length - 2; i++) {
        let [l, r] = [i + 1, xs.length - 1];
        while (l < r) {
          const s = xs[i] + xs[l] + xs[r];
          const hit = s === T;
          if (hit) found.push([xs[i], xs[l], xs[r]]);
          frames.push({
            note: fill(hit ? w.hit : s < T ? w.less : w.more, { a: show(xs[i]), b: show(xs[l]), c: show(xs[r]), s: show(s), t: show(T) }),
            cells: cells(xs, (k) => (k === i ? "pivot" : k === l || k === r ? (hit ? "sorted" : "compare") : k < l || k > r ? "idle" : "plain"), { i, L: l, R: r }),
            rows: [foundRow(hit)],
          });
          if (hit) [l, r] = [l + 1, r - 1];
          else if (s < T) l++;
          else r--;
        }
      }
      return done(frames, found.length ? fill(w.answer, { list: lists(found) }) : fill(w.none, { t: show(T) }));
    },
  },

  smallestDifference: {
    level: 2,
    example: ["14, -3, 9, 27", "20, 5, -10, 31, 16"],
    solve: ([a, b], w, e) => {
      const xs = nums(a, e, { max: 10, whole: true }).sort(ascending);
      const ys = nums(b, e, { max: 10, whole: true }).sort(ascending);
      let [i, j] = [0, 0];
      let best: Pt = [xs[0], ys[0]];
      let gap = Infinity;
      const frames: Frame[] = [];
      const along = (n: number, at: number) => rolesOf(n, (k) => (k === at ? "compare" : k < at ? "idle" : "plain"));
      while (i < xs.length && j < ys.length) {
        const [x, y] = [xs[i], ys[j]];
        const d = Math.abs(x - y);
        const better = d < gap;
        if (better) [gap, best] = [d, [x, y]];
        frames.push({
          note: fill(x === y ? w.same : x < y ? w.first : w.second, { x: show(x), y: show(y), d }),
          mat: { vals: [xs, ys], roles: [along(xs.length, i), along(ys.length, j)], rowHeads: [w.a, w.b] },
          rows: [row(w.best, [listText(best)], () => (better ? "key" : "sorted"))],
        });
        if (x === y) break;
        if (x < y) i++;
        else j++;
      }
      return done(frames, fill(w.answer, { x: show(best[0]), y: show(best[1]), d: gap }));
    },
  },

  moveElementToEnd: {
    level: 2,
    example: ["4, 1, 4, 3, 4, 2, 5, 4", "4"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true });
      const V = int(t, e, -999, 999);
      const v = show(V);
      let [i, j] = [0, xs.length - 1];
      const pic = (role: (k: number) => Role | undefined = () => undefined) => cells(xs, (k) => role(k) ?? (k > j ? "sorted" : k < i ? "idle" : "plain"), { i, j });
      const frames: Frame[] = [{ note: fill(w.start, { v }), cells: pic() }];
      while (i < j) {
        if (xs[j] === V) {
          frames.push({ note: fill(w.back, { j, v }), cells: pic((k) => (k === j ? "key" : undefined)) });
          j--;
          continue;
        }
        if (xs[i] === V) {
          [xs[i], xs[j]] = [xs[j], xs[i]];
          frames.push({ note: fill(w.swap, { i, j, v, x: show(xs[i]) }), cells: pic((k) => (k === i || k === j ? "key" : undefined)) });
        } else frames.push({ note: fill(w.keep, { i, x: show(xs[i]), v }), cells: pic((k) => (k === i ? "compare" : undefined)) });
        i++;
      }
      return done(frames, fill(w.answer, { v, list: listText(xs) }));
    },
  },

  monotonicArray: {
    level: 2,
    example: ["12, 9, 9, 4, 1, 1, -3"],
    solve: ([a], w, e) => {
      if (!a.trim()) return done([{ note: w.empty, cells: cells([]) }], w.isFlat);
      const xs = nums(a, e, { max: 14 });
      let [up, down] = [true, true];
      const state = () =>
        row(w.state, [fill(w.nonDec, { v: up ? w.yes : w.no }), fill(w.nonInc, { v: down ? w.yes : w.no })], (k) => ((k === 0 ? up : down) ? "sorted" : "min"));
      const frames: Frame[] = [{ note: w.start, cells: cells(xs), rows: [state()] }];
      for (let i = 1; i < xs.length && (up || down); i++) {
        const [p, q] = [xs[i - 1], xs[i]];
        if (q > p) down = false;
        if (q < p) up = false;
        frames.push({
          note: fill(q > p ? w.rise : q < p ? w.fall : w.level, { a: show(p), b: show(q) }),
          cells: cells(xs, (k) => (k === i || k === i - 1 ? "compare" : k < i ? "idle" : "plain"), { i }),
          rows: [state()],
        });
      }
      return done(frames, up && down ? w.isFlat : up ? w.isUp : down ? w.isDown : w.isNot);
    },
  },

  spiralTraverse: {
    level: 2,
    example: ["7, 2, 9, 4; 1, 8, 3, 6; 5, 0, 2, 7"],
    solve: ([a], w, e) => {
      const m = matrix(a, e, { rows: 6, cols: 6 });
      const [R, C] = [m.length, m[0].length];
      const seen = grid2(R, C, () => false);
      const out: number[] = [];
      const frames: Frame[] = [];
      const side = (spots: Pt[], note: string, k: number) => {
        if (!spots.length) return;
        const vals = spots.map(([r, c]) => m[r][c]);
        const now = new Set(spots.map(([r, c]) => r * C + c));
        out.push(...vals);
        frames.push({
          note: fill(note, { k, list: listText(vals) }),
          mat: { vals: m, roles: grid2(R, C, (r, c) => (now.has(r * C + c) ? "key" : seen[r][c] ? "sorted" : "plain")) },
          rows: [row(w.order, out, (i) => (i >= out.length - spots.length ? "key" : "sorted"))],
        });
        for (const [r, c] of spots) seen[r][c] = true;
      };
      for (let k = 0, sr = 0, er = R - 1, sc = 0, ec = C - 1; sr <= er && sc <= ec; k++, sr++, er--, sc++, ec--) {
        const [top, right, bottom, left]: Pt[][] = [[], [], [], []];
        for (let c = sc; c <= ec; c++) top.push([sr, c]);
        for (let r = sr + 1; r <= er; r++) right.push([r, ec]);
        if (sr < er) for (let c = ec - 1; c >= sc; c--) bottom.push([er, c]);
        if (sc < ec) for (let r = er - 1; r > sr; r--) left.push([r, sc]);
        side(top, w.top, k);
        side(right, w.right, k);
        side(bottom, w.bottom, k);
        side(left, w.left, k);
      }
      return done(frames, fill(w.answer, { list: listText(out) }));
    },
  },

  longestPeak: {
    level: 2,
    example: ["1, 4, 2, 3, 5, 9, 6, 2, 2, 7, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14 });
      const n = xs.length;
      let best: Pt | null = null;
      const inBest = (k: number) => best !== null && k >= best[0] && k <= best[1];
      const frames: Frame[] = [{ note: w.start, cells: cells(xs) }];
      for (let i = 1; i < n - 1; ) {
        if (!(xs[i - 1] < xs[i] && xs[i] > xs[i + 1])) {
          frames.push({ note: fill(w.flat, { i, v: show(xs[i]) }), cells: cells(xs, (k) => (k === i ? "compare" : inBest(k) ? "sorted" : k < i ? "idle" : "plain"), { i }) });
          i++;
          continue;
        }
        let l = i - 1;
        while (l > 0 && xs[l - 1] < xs[l]) l--;
        let r = i + 1;
        while (r < n - 1 && xs[r + 1] < xs[r]) r++;
        const len = r - l + 1;
        const better = best === null || len > best[1] - best[0] + 1;
        if (better) best = [l, r];
        frames.push({
          note: fill(better ? w.tipBest : w.tip, { i, v: show(xs[i]), s: l, e: r, n: len }),
          cells: cells(xs, (k) => (k === i ? "key" : k >= l && k <= r ? (better ? "sorted" : "compare") : inBest(k) ? "sorted" : k < i ? "idle" : "plain"), { i }, [l, r]),
        });
        // Nothing inside this peak can be a tip of another, so the search goes on after it.
        i = r + 1;
      }
      const peak = best as Pt | null;
      return done(frames, peak ? fill(w.answer, { n: peak[1] - peak[0] + 1, list: listText(xs.slice(peak[0], peak[1] + 1)) }) : w.none);
    },
  },

  arrayOfProducts: {
    level: 2,
    example: ["3, -2, 5, 1, 4"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 10, whole: true, min: -50 });
      const big = xs.find((x) => x > 50);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: show(big), n: 50 }));
      const n = xs.length;
      const out: (number | string)[] = xs.map(() => "");
      const frames: Frame[] = [];
      let p = 1;
      for (let i = 0; i < n; i++) {
        out[i] = p;
        const q = times(p, xs[i]);
        frames.push({
          note: fill(w.left, { i, p: show(p), v: show(xs[i]), q: show(q) }),
          cells: cells(xs, (k) => (k === i ? "key" : k < i ? "compare" : "plain"), { i }),
          rows: [row(w.output, out, (k) => (k === i ? "key" : k < i ? "plain" : "idle")), row(w.running, [q])],
        });
        p = q;
      }
      p = 1;
      for (let i = n - 1; i >= 0; i--) {
        const o = out[i] as number;
        out[i] = times(o, p);
        const q = times(p, xs[i]);
        frames.push({
          note: fill(w.right, { i, o: show(o), p: show(p), r: show(out[i] as number), v: show(xs[i]), q: show(q) }),
          cells: cells(xs, (k) => (k === i ? "key" : k > i ? "compare" : "plain"), { i }),
          rows: [row(w.output, out, (k) => (k === i ? "key" : k > i ? "sorted" : "plain")), row(w.running, [q])],
        });
        p = q;
      }
      return done(frames, fill(w.answer, { list: listText(out) }));
    },
  },

  firstDuplicateValue: {
    level: 2,
    example: ["2, 5, 3, 5, 2, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true, min: 1 });
      const big = xs.find((x) => x > xs.length);
      if (big !== undefined) throw new Error(fill(w.range, { s: big, n: xs.length }));
      const ys = [...xs];
      const frames: Frame[] = [];
      for (let i = 0; i < ys.length; i++) {
        const v = Math.abs(ys[i]);
        const j = v - 1;
        const seen = ys[j] < 0;
        if (!seen) ys[j] = -ys[j];
        frames.push({
          note: fill(seen ? w.hit : w.mark, { i, v, j, x: -ys[j] }),
          cells: cells(ys, (k) => (k === j ? (seen ? "sorted" : "key") : k === i ? "compare" : ys[k] < 0 ? "pivot" : "plain"), { i, j }),
        });
        if (seen) return done(frames, fill(w.answer, { v }));
      }
      return done(frames, w.none);
    },
  },

  mergeOverlappingIntervals: {
    level: 2,
    example: ["[6, 9], [1, 3], [2, 4], [10, 12], [9, 10], [15, 16]"],
    solve: ([a], w, e) => {
      const iv = intervals(a, e, 8).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const merged: Pt[] = [[iv[0][0], iv[0][1]]];
      const pic = (k: number) => [
        { label: w.sorted, items: iv, roles: rolesOf(iv.length, (i) => (i === k ? "key" : i < k ? "idle" : "plain")) },
        { label: w.merged, items: merged.map(([s, t]): Pt => [s, t]), roles: rolesOf(merged.length, (i) => (i === merged.length - 1 ? "key" : "sorted")) },
      ];
      const frames: Frame[] = [{ note: fill(w.start, { list: lists(iv), a: show(iv[0][0]), b: show(iv[0][1]) }), spans: pic(0) }];
      for (let k = 1; k < iv.length; k++) {
        const [s, t] = iv[k];
        const last = merged[merged.length - 1];
        const v = { a: show(s), b: show(t), e: show(last[1]) };
        if (s <= last[1]) {
          last[1] = Math.max(last[1], t);
          frames.push({ note: fill(w.join, { ...v, s: show(last[0]), n: show(last[1]) }), spans: pic(k) });
        } else {
          merged.push([s, t]);
          frames.push({ note: fill(w.apart, v), spans: pic(k) });
        }
      }
      return done(frames, fill(w.answer, { list: lists(merged) }));
    },
  },

  bestSeat: {
    level: 2,
    example: ["1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true, least: 2 });
      const odd = xs.find((x) => x !== 0 && x !== 1);
      if (odd !== undefined) throw new Error(fill(e.bad, { s: show(odd) }));
      if (xs[0] !== 1 || xs[xs.length - 1] !== 1) throw new Error(w.ends);
      let [best, most] = [-1, 0];
      const frames: Frame[] = [];
      for (let l = 0; l < xs.length - 1; ) {
        let r = l + 1;
        while (xs[r] === 0) r++;
        const free = r - l - 1;
        if (free > 0) {
          const m = Math.floor((l + r) / 2);
          const better = free > most;
          if (better) [best, most] = [m, free];
          frames.push({
            note: fill(better ? w.runBest : w.run, { l, r, n: free, m, b: best }),
            cells: cells(xs, (k) => (k === m ? (better ? "sorted" : "key") : k > l && k < r ? "compare" : k === best ? "sorted" : xs[k] ? "idle" : "plain"), { L: l, R: r }, [l + 1, r - 1]),
          });
        }
        l = r;
      }
      if (!frames.length) frames.push({ note: w.full, cells: cells(xs, () => "idle") });
      return done(frames, best < 0 ? w.none : fill(w.answer, { m: best }));
    },
  },

  zeroSumSubarray: {
    level: 2,
    example: ["3, 4, -2, 5, -3, 1"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true });
      const seen = new Map<number, number>([[0, -1]]);
      const sums = (hit?: number) => {
        const vals = [...seen.keys()];
        return row(w.sums, vals, (k) => (vals[k] === hit ? "sorted" : hit === undefined && k === vals.length - 1 ? "key" : "plain"));
      };
      const frames: Frame[] = [{ note: w.start, cells: cells(xs), rows: [sums()] }];
      let s = 0;
      for (let i = 0; i < xs.length; i++) {
        s += xs[i];
        const j = seen.get(s);
        if (j !== undefined) {
          frames.push({
            note: fill(w.hit, { i, s: show(s), where: j < 0 ? w.atStart : fill(w.after, { j }), a: j + 1, b: i }),
            cells: cells(xs, (k) => (k > j && k <= i ? "sorted" : "idle"), { i }, [j + 1, i]),
            rows: [sums(s)],
          });
          return done(frames, fill(w.yes, { list: listText(xs.slice(j + 1, i + 1)) }));
        }
        seen.set(s, i);
        frames.push({ note: fill(w.fresh, { i, s: show(s) }), cells: cells(xs, (k) => (k === i ? "key" : k < i ? "compare" : "plain"), { i }), rows: [sums()] });
      }
      return done(frames, w.no);
    },
  },

  missingNumbers: {
    level: 2,
    example: ["4, 7, 1, 2, 6"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 12, whole: true, min: 1 });
      distinct(xs, w.distinct);
      const N = xs.length + 2;
      const big = xs.find((x) => x > N);
      if (big !== undefined) throw new Error(fill(w.range, { s: big, n: N }));
      const all = Array.from({ length: N }, (_, i) => i + 1);
      const total = (N * (N + 1)) / 2;
      const have = sum(xs);
      const both = total - have;
      const mid = Math.floor(both / 2);
      const low = (mid * (mid + 1)) / 2;
      const got = sum(xs.filter((x) => x <= mid));
      const p = low - got;
      const q = both - p;
      const allRow = (role: (v: number) => Role) => row(w.all, all, (i) => role(all[i]));
      const frames: Frame[] = [
        { note: fill(w.total, { n: N, total, have, both }), cells: cells(xs), rows: [allRow(() => "plain")] },
        { note: fill(w.split, { both, mid }), cells: cells(xs, (k) => (xs[k] <= mid ? "compare" : "plain")), rows: [allRow((v) => (v <= mid ? "compare" : "plain"))] },
        { note: fill(w.low, { mid, low, got, p }), cells: cells(xs, (k) => (xs[k] <= mid ? "compare" : "idle")), rows: [allRow((v) => (v === p ? "sorted" : v <= mid ? "compare" : "idle"))] },
        { note: fill(w.high, { both, p, q }), cells: cells(xs, (k) => (xs[k] > mid ? "compare" : "idle")), rows: [allRow((v) => (v === p || v === q ? "sorted" : "idle"))] },
      ];
      return done(frames, fill(w.answer, { p, q }));
    },
  },

  majorityElement: {
    level: 2,
    example: ["4, 2, 4, 3, 4, 4, 1, 4, 2"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true });
      const most = Math.max(...xs.map((x) => xs.filter((y) => y === x).length));
      if (most * 2 <= xs.length) throw new Error(w.noMajority);
      let [cand, count] = [xs[0], 0];
      const frames: Frame[] = [];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
        let note: string;
        if (count === 0) {
          [cand, count] = [x, 1];
          note = fill(w.pick, { x: show(x) });
        } else if (x === cand) note = fill(w.same, { x: show(x), c: ++count });
        else note = fill(w.other, { x: show(x), cand: show(cand), c: --count });
        frames.push({
          note,
          cells: cells(xs, (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }),
          rows: [row(w.candidate, [cand], () => "sorted"), row(w.count, [count])],
        });
      }
      return done(frames, fill(w.answer, { v: show(cand) }));
    },
  },

  sweetAndSavory: {
    level: 2,
    example: ["-3, 5, -7, 2, 8, -1, 4", "6"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true });
      if (xs.includes(0)) throw new Error(w.zero);
      const T = int(t, e, -999, 999);
      const sweet = xs.filter((x) => x < 0).sort((p, q) => q - p);
      const salty = xs.filter((x) => x > 0).sort(ascending);
      let [i, j] = [0, 0];
      let best: Pt = [0, 0];
      let gap = Infinity;
      const along = (n: number, at: number) => rolesOf(n, (k) => (k === at ? "compare" : k < at ? "idle" : "plain"));
      const mat = (): Mat => ({ vals: [sweet, salty], roles: [along(sweet.length, i), along(salty.length, j)], rowHeads: [w.sweet, w.savory] });
      const bestRow = (fresh: boolean) => row(w.best, [listText(best)], () => (fresh ? "key" : gap < Infinity ? "sorted" : "plain"));
      const frames: Frame[] = [{ note: fill(w.start, { a: listText(sweet), b: listText(salty) }), mat: mat(), rows: [bestRow(false)] }];
      while (i < sweet.length && j < salty.length) {
        const [s, v] = [sweet[i], salty[j]];
        const total = s + v;
        const vars = { s: show(s), v: show(v), sum: show(total), t: show(T), d: show(T - total) };
        if (total <= T) {
          const better = T - total < gap;
          if (better) [gap, best] = [T - total, [s, v]];
          frames.push({ note: fill(better ? w.closer : w.under, vars), mat: mat(), rows: [bestRow(better)] });
          j++;
        } else {
          frames.push({ note: fill(w.over, vars), mat: mat(), rows: [bestRow(false)] });
          i++;
        }
      }
      return done(frames, gap < Infinity ? fill(w.answer, { s: show(best[0]), v: show(best[1]) }) : fill(w.none, { t: show(T) }));
    },
  },

  fourNumberSum: {
    level: 3,
    example: ["5, -2, 7, 1, -4, 3, 0", "6"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e, { max: 8, whole: true, least: 4 });
      distinct(xs, w.distinct);
      const T = int(t, e, -999, 999);
      const n = xs.length;
      const pairs = new Map<number, Pt[]>();
      const quads: number[][] = [];
      const plus = ([p, q]: Pt) => `${show(p)} + ${show(q)}`;
      const mapRow = (role: (s: number, p: Pt) => Role) => {
        const all = [...pairs.entries()].flatMap(([s, ps]) => ps.map((p) => ({ s, p })));
        return row(w.map, all.map(({ s, p }) => `${show(s)}: ${plus(p)}`), (k) => role(all[k].s, all[k].p));
      };
      const quadRow = (fresh: number) => row(w.quads, quads.map((q) => listText(q)), (k) => (k >= quads.length - fresh ? "key" : "sorted"));
      const frames: Frame[] = [];
      for (let i = 1; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const s = xs[i] + xs[j];
          const d = T - s;
          const ps = pairs.get(d) ?? [];
          for (const p of ps) quads.push([...p, xs[i], xs[j]].sort(ascending));
          const v = { x: show(xs[i]), y: show(xs[j]), s: show(s), d: show(d) };
          frames.push({
            note: ps.length ? fill(w.hit, { ...v, list: ps.map(plus).join(", ") }) : fill(w.miss, v),
            cells: cells(xs, (k) => (k === i ? "pivot" : k === j ? "compare" : k < i ? "sorted" : "plain"), { i, j }),
            rows: [mapRow((x) => (ps.length && x === d ? "sorted" : "plain")), quadRow(ps.length)],
          });
        }
        const added: Pt[] = [];
        for (let k = 0; k < i; k++) {
          const s = xs[k] + xs[i];
          const p: Pt = [xs[k], xs[i]];
          pairs.set(s, [...(pairs.get(s) ?? []), p]);
          added.push(p);
        }
        frames.push({
          note: fill(w.add, { x: show(xs[i]), list: added.map(plus).join(", ") }),
          cells: cells(xs, (k) => (k === i ? "key" : k < i ? "sorted" : "plain"), { i }),
          rows: [mapRow((_, p) => (p[1] === xs[i] ? "key" : "plain")), quadRow(0)],
        });
      }
      quads.sort(byList);
      return done(frames, quads.length ? fill(w.answer, { list: lists(quads) }) : fill(w.none, { t: show(T) }));
    },
  },

  subarraySort: {
    level: 3,
    example: ["1, 3, 2, 5, 4, 7, 9, 6, 10, 12"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14 });
      const n = xs.length;
      const out = xs.map((x, i) => (i > 0 && x < xs[i - 1]) || (i < n - 1 && x > xs[i + 1]));
      let [lo, hi] = [Infinity, -Infinity];
      const ends = () => (lo === Infinity ? [] : [row(w.smallest, [lo]), row(w.largest, [hi])]);
      const frames: Frame[] = [];
      for (let i = 0; i < n; i++) {
        if (out[i]) [lo, hi] = [Math.min(lo, xs[i]), Math.max(hi, xs[i])];
        frames.push({
          note: out[i] ? fill(w.out, { i, v: show(xs[i]), lo: show(lo), hi: show(hi) }) : fill(w.fine, { i, v: show(xs[i]) }),
          cells: cells(xs, (k) => (k <= i && out[k] ? "min" : k === i ? "compare" : k < i ? "idle" : "plain"), { i }),
          rows: ends(),
        });
      }
      if (lo === Infinity) return done(frames, w.sorted);
      let l = 0;
      while (xs[l] <= lo) l++;
      frames.push({ note: fill(w.left, { lo: show(lo), i: l, v: show(xs[l]) }), cells: cells(xs, (k) => (k === l ? "key" : out[k] ? "min" : "plain"), { l }), rows: ends() });
      let r = n - 1;
      while (xs[r] >= hi) r--;
      frames.push({ note: fill(w.right, { hi: show(hi), i: r, v: show(xs[r]) }), cells: cells(xs, (k) => (k === l || k === r ? "key" : k > l && k < r ? "compare" : "plain"), { l, r }, [l, r]), rows: ends() });
      return done(frames, fill(w.answer, { s: l, e: r }));
    },
  },

  largestRange: {
    level: 3,
    example: ["8, 3, 12, 5, 1, 4, 11, 2, 10, 6"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true });
      const have = new Set(xs);
      const used = new Set<number>();
      let best: Pt = [xs[0], xs[0]];
      let most = 0;
      const bestRow = (fresh: boolean) => row(w.best, [listText(best)], () => (fresh ? "key" : "sorted"));
      const frames: Frame[] = [];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i];
        if (used.has(x)) {
          frames.push({ note: fill(w.skip, { v: show(x) }), cells: cells(xs, (k) => (k === i ? "compare" : used.has(xs[k]) ? "idle" : "plain"), { i }), rows: [row(w.range, []), bestRow(false)] });
          continue;
        }
        let [lo, hi] = [x, x];
        used.add(x);
        while (have.has(lo - 1)) used.add(--lo);
        while (have.has(hi + 1)) used.add(++hi);
        const len = hi - lo + 1;
        const better = len > most;
        if (better) [most, best] = [len, [lo, hi]];
        frames.push({
          note: fill(better ? w.growBest : w.grow, { v: show(x), lo: show(lo), hi: show(hi), n: len }),
          cells: cells(xs, (k) => (k === i ? "key" : xs[k] >= lo && xs[k] <= hi ? "compare" : used.has(xs[k]) ? "idle" : "plain"), { i }),
          rows: [row(w.range, Array.from({ length: len }, (_, k) => lo + k), () => "compare"), bestRow(better)],
        });
      }
      return done(frames, fill(w.answer, { lo: show(best[0]), hi: show(best[1]), n: most }));
    },
  },

  minRewards: {
    level: 3,
    example: ["6, 2, 9, 11, 4, 1, 7, 3"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14 });
      distinct(xs, w.distinct);
      const n = xs.length;
      const r = xs.map(() => 1);
      const pic = (i: number, j: number) => ({
        cells: cells(xs, (k) => (k === i ? "key" : k === j ? "compare" : "plain"), { i }),
        rows: [row(w.rewards, [...r], (k) => (k === i ? "key" : "plain"))],
      });
      const frames: Frame[] = [{ note: w.start, cells: cells(xs), rows: [row(w.rewards, [...r])] }];
      for (let i = 1; i < n; i++) {
        const up = xs[i] > xs[i - 1];
        if (up) r[i] = r[i - 1] + 1;
        frames.push({ note: fill(up ? w.upLeft : w.downLeft, { v: show(xs[i]), p: show(xs[i - 1]), q: r[i - 1], r: r[i] }), ...pic(i, i - 1) });
      }
      for (let i = n - 2; i >= 0; i--) {
        const up = xs[i] > xs[i + 1];
        const o = r[i];
        if (up) r[i] = Math.max(o, r[i + 1] + 1);
        frames.push({ note: fill(up ? w.upRight : w.downRight, { v: show(xs[i]), p: show(xs[i + 1]), q: r[i + 1], o, r: r[i] }), ...pic(i, i + 1) });
      }
      return done(frames, fill(w.answer, { n: sum(r), list: listText(r) }));
    },
  },

  zigzagTraverse: {
    level: 3,
    example: ["1, 3, 4; 2, 5, 9; 6, 8, 10; 7, 11, 12"],
    solve: ([a], w, e) => {
      const m = matrix(a, e, { rows: 6, cols: 6 });
      const [R, C] = [m.length, m[0].length];
      // The walk itself: down the left edge or along the bottom, then up and to the right until an edge, and so on.
      const order: Pt[] = [];
      let [r, c] = [0, 0];
      let down = true;
      while (r >= 0 && r < R && c >= 0 && c < C) {
        order.push([r, c]);
        if (down) {
          if (c === 0 || r === R - 1) {
            down = false;
            if (r === R - 1) c++;
            else r++;
          } else [r, c] = [r + 1, c - 1];
        } else if (r === 0 || c === C - 1) {
          down = true;
          if (c === C - 1) r++;
          else c++;
        } else [r, c] = [r - 1, c + 1];
      }
      // A frame per diagonal of the walk.
      const groups: Pt[][] = [];
      for (const p of order) {
        const g = groups[groups.length - 1];
        if (g && g[0][0] + g[0][1] === p[0] + p[1]) g.push(p);
        else groups.push([p]);
      }
      const out: number[] = [];
      const seen = new Set<number>();
      const frames = groups.map((g, d): Frame => {
        const vals = g.map(([i, j]) => m[i][j]);
        out.push(...vals);
        const now = new Set(g.map(([i, j]) => i * C + j));
        const f: Frame = {
          note: fill(g.length === 1 ? w.corner : g[1][0] > g[0][0] ? w.down : w.up, { d, list: listText(vals) }),
          mat: { vals: m, roles: grid2(R, C, (i, j) => (now.has(i * C + j) ? "key" : seen.has(i * C + j) ? "sorted" : "plain")) },
          rows: [row(w.order, [...out], (k) => (k >= out.length - g.length ? "key" : "sorted"))],
        };
        for (const k of now) seen.add(k);
        return f;
      });
      return done(frames, fill(w.answer, { list: listText(out) }));
    },
  },

  longestSubarrayWithSum: {
    level: 3,
    example: ["1, 2, 1, 0, 3, 2, 0, 0, 1, 4", "3"],
    solve: ([a, t], w, e) => {
      const xs = nums(a, e, { max: 14, whole: true, min: 0 });
      const T = int(t, e, 0, 999);
      let [s, st] = [0, 0];
      let best: Pt | null = null;
      const inBest = (k: number) => best !== null && k >= best[0] && k <= best[1];
      const frames: Frame[] = [];
      const push = (note: string, en: number, role: (k: number) => Role | undefined = () => undefined) =>
        frames.push({
          note,
          cells: cells(xs, (k) => role(k) ?? (k >= st && k <= en ? "compare" : inBest(k) ? "sorted" : k < st ? "idle" : "plain"), { L: st, R: en }, [st, en]),
          rows: [row(w.best, best ? [listText(best)] : [], () => "sorted")],
        });
      for (let en = 0; en < xs.length; en++) {
        s += xs[en];
        let shrunk = false;
        if (s > T) {
          push(fill(w.over, { e: en, v: xs[en], s, t: T }), en, (k) => (k === en ? "key" : undefined));
          while (st < en && s > T) {
            s -= xs[st++];
            shrunk = true;
            push(fill(w.shrink, { i: st - 1, v: xs[st - 1], s }), en);
          }
        }
        if (s === T) {
          const better = best === null || best[1] - best[0] < en - st;
          if (better) best = [st, en];
          push(fill(better ? w.hitBest : w.hit, { s: st, e: en, t: T, n: en - st + 1 }), en, (k) => (k >= st && k <= en ? "sorted" : undefined));
        } else if (s < T && !shrunk) push(fill(w.under, { e: en, v: xs[en], s, t: T }), en, (k) => (k === en ? "key" : undefined));
      }
      const run = best as Pt | null;
      return done(frames, run ? fill(w.answer, { t: T, list: listText(xs.slice(run[0], run[1] + 1)), s: run[0], e: run[1] }) : fill(w.none, { t: T }));
    },
  },

  knightConnection: {
    level: 3,
    example: ["0, 0", "5, 3"],
    solve: ([a, b], w, e) => {
      const [A, B] = [square(a, e), square(b, e)];
      if (Math.abs(B[0] - A[0]) > 7 || Math.abs(B[1] - A[1]) > 4) throw new Error(w.far);
      // The squares around the two knights, two to spare on every side: enough room for the shortest way.
      const [x0, x1, y0, y1] = [Math.min(A[0], B[0]) - 2, Math.max(A[0], B[0]) + 2, Math.min(A[1], B[1]) - 2, Math.max(A[1], B[1]) + 2];
      const [R, C] = [y1 - y0 + 1, x1 - x0 + 1];
      const dist = grid2(R, C, () => -1);
      const [ar, ac] = [y1 - A[1], A[0] - x0];
      const [br, bc] = [y1 - B[1], B[0] - x0];
      dist[ar][ac] = 0;
      const pic = (k: number): Mat => ({
        vals: grid2(R, C, (r, c) => (r === ar && c === ac ? "A" : r === br && c === bc ? "B" : dist[r][c] < 0 ? "" : dist[r][c])),
        roles: grid2(R, C, (r, c): Role => (r === ar && c === ac ? "pivot" : r === br && c === bc ? (dist[r][c] >= 0 ? "sorted" : "compare") : dist[r][c] === k ? "key" : dist[r][c] < 0 ? "idle" : "plain")),
        rowHeads: Array.from({ length: R }, (_, r) => show(y1 - r)),
        colHeads: Array.from({ length: C }, (_, c) => show(x0 + c)),
      });
      const MOVES = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
      const frames: Frame[] = [{ note: fill(w.start, { a: at(A), b: at(B) }), mat: pic(0) }];
      let ring: Pt[] = [[ar, ac]];
      for (let k = 1; dist[br][bc] < 0; k++) {
        const next: Pt[] = [];
        for (const [r, c] of ring)
          for (const [mx, my] of MOVES) {
            const [nr, nc] = [r - my, c + mx];
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && dist[nr][nc] < 0) {
              dist[nr][nc] = k;
              next.push([nr, nc]);
            }
          }
        ring = next;
        frames.push({ note: dist[br][bc] === k ? fill(w.reach, { k, b: at(B) }) : fill(w.ring, { k, n: ring.length }), mat: pic(k) });
      }
      const m = dist[br][bc];
      const turns = Math.ceil(m / 2);
      frames.push({ note: fill(w.half, { m, t: turns }), mat: pic(-1) });
      return done(frames, fill(w.answer, { t: turns }));
    },
  },

  countSquares: {
    level: 3,
    example: ["0, 0; 2, 1; 1, 3; -1, 2; 1, 1; 2, 0; 1, 0"],
    solve: ([a], w, e) => {
      const pts = pointSet(a, e, w);
      const view = plane(pts, w.fit);
      const has = new Set(pts.map(([x, y]) => ptKey(x, y)));
      let found = 0;
      const frames: Frame[] = [];
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const [p, q] = [pts[i], pts[j]];
          const [sx, sy, dx, dy] = [p[0] + q[0], p[1] + q[1], q[0] - p[0], q[1] - p[1]];
          const marks = new Map<string, Role>([[ptKey(...p), "key"], [ptKey(...q), "key"]]);
          let note: string;
          // The other diagonal: as long, through the same middle, turned a quarter.
          if ((sx - dy) % 2 !== 0 || (sy + dx) % 2 !== 0) note = fill(w.between, { p: at(p), q: at(q) });
          else {
            const c: Pt = [(sx - dy) / 2, (sy + dx) / 2];
            const d: Pt = [(sx + dy) / 2, (sy - dx) / 2];
            const ok = has.has(ptKey(...c)) && has.has(ptKey(...d));
            if (ok) found++;
            for (const z of [c, d]) marks.set(ptKey(...z), has.has(ptKey(...z)) ? (ok ? "sorted" : "compare") : "min");
            if (ok) for (const z of [p, q]) marks.set(ptKey(...z), "sorted");
            note = fill(ok ? w.square : w.miss, { p: at(p), q: at(q), c: at(c), d: at(d) });
          }
          frames.push({ note, mat: view((x, y) => marks.get(ptKey(x, y))), rows: [row(w.found, [found], () => "key")] });
        }
      frames.push({ note: fill(w.halve, { n: found, s: found / 2 }), mat: view(), rows: [row(w.found, [found])] });
      return done(frames, fill(w.answer, { s: found / 2 }));
    },
  },

  rectangleMania: {
    level: 4,
    example: ["0, 0; 0, 2; 3, 0; 3, 2; 1, 2; 1, 0; 3, 3; 1, 3"],
    solve: ([a], w, e) => {
      const pts = pointSet(a, e, w);
      const view = plane(pts, w.fit);
      const has = new Set(pts.map(([x, y]) => ptKey(x, y)));
      let found = 0;
      const frames: Frame[] = [];
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const [p, q] = [pts[i], pts[j]];
          const marks = new Map<string, Role>([[ptKey(...p), "key"], [ptKey(...q), "key"]]);
          let note: string;
          if (p[0] === q[0] || p[1] === q[1]) note = fill(w.line, { p: at(p), q: at(q) });
          else {
            const [c, d]: Pt[] = [[p[0], q[1]], [q[0], p[1]]];
            const ok = has.has(ptKey(...c)) && has.has(ptKey(...d));
            if (ok) found++;
            for (const z of [c, d]) marks.set(ptKey(...z), has.has(ptKey(...z)) ? (ok ? "sorted" : "compare") : "min");
            if (ok) for (const z of [p, q]) marks.set(ptKey(...z), "sorted");
            note = fill(ok ? w.rect : w.miss, { p: at(p), q: at(q), c: at(c), d: at(d) });
          }
          frames.push({ note, mat: view((x, y) => marks.get(ptKey(x, y))), rows: [row(w.found, [found], () => "key")] });
        }
      frames.push({ note: fill(w.halve, { n: found, s: found / 2 }), mat: view(), rows: [row(w.found, [found])] });
      return done(frames, fill(w.answer, { s: found / 2 }));
    },
  },

  apartmentHunting: {
    level: 4,
    example: ["school; gym; ; school store; gym; store", "gym, school, store"],
    solve: ([a, b], w, e) => {
      const blocks = a.trim().split(/[;\n]/).map((k) => k.trim().split(/[\s,]+/).filter(Boolean));
      if (!a.trim()) throw new Error(e.empty);
      if (blocks.length > 10) throw new Error(fill(e.tooMany, { n: 10 }));
      if (blocks.some((k) => k.some((x) => [...x].length > 10))) throw new Error(fill(e.tooLong, { n: 10 }));
      const reqs = [...new Set(words(b, e, 4, 10))];
      for (const r of reqs) if (!blocks.some((k) => k.includes(r))) throw new Error(fill(w.missing, { b: r }));
      const n = blocks.length;
      const dist = reqs.map(() => blocks.map(() => Infinity));
      const table: (number | string)[][] = reqs.map(() => blocks.map(() => ""));
      const far: (number | string)[] = blocks.map(() => "");
      const shown = (d: number) => (d === Infinity ? "∞" : d);
      const pic = (role: (r: number, c: number) => Role): Mat => ({ vals: [...table, far].map((r) => [...r]), roles: grid2(reqs.length + 1, n, role), rowHeads: [...reqs, w.farthest] });
      const blockRow = (role: (c: number) => Role = () => "plain") => row(w.blocks, blocks.map((k) => k.join(" ") || "—"), role);
      const frames: Frame[] = [];
      for (const [k, name] of reqs.entries()) {
        const here = (c: number) => blocks[c].includes(name);
        const role = (r: number, c: number): Role => (r === k ? (here(c) ? "sorted" : "key") : r < k ? "plain" : "idle");
        let last = -Infinity;
        for (let i = 0; i < n; i++) {
          if (here(i)) last = i;
          dist[k][i] = i - last;
          table[k][i] = shown(dist[k][i]);
        }
        frames.push({ note: fill(w.left, { b: name, list: listText(table[k]) }), mat: pic(role), rows: [blockRow((c) => (here(c) ? "sorted" : "plain"))] });
        let next = Infinity;
        for (let i = n - 1; i >= 0; i--) {
          if (here(i)) next = i;
          dist[k][i] = Math.min(dist[k][i], next - i);
          table[k][i] = dist[k][i];
        }
        frames.push({ note: fill(w.right, { b: name, list: listText(table[k]) }), mat: pic(role), rows: [blockRow((c) => (here(c) ? "sorted" : "plain"))] });
      }
      const worst = blocks.map((_, i) => Math.max(...dist.map((d) => d[i])));
      worst.forEach((v, i) => (far[i] = v));
      frames.push({ note: fill(w.far, { list: listText(worst) }), mat: pic((r) => (r === reqs.length ? "key" : "plain")), rows: [blockRow()] });
      const best = worst.indexOf(Math.min(...worst));
      frames.push({
        note: fill(w.pick, { i: best, d: worst[best] }),
        mat: pic((r, c) => (c === best ? "sorted" : r === reqs.length ? "plain" : "idle")),
        rows: [blockRow((c) => (c === best ? "sorted" : "plain"))],
      });
      return done(frames, fill(w.answer, { i: best, d: worst[best] }));
    },
  },

  calendarMatching: {
    level: 4,
    example: ["8:30-9:15, 11:00-12:30, 15:00-16:00", "8:00-17:00", "9:00-10:00, 13:00-14:00, 14:15-15:30", "8:30-18:00", "45"],
    solve: ([c1, d1, c2, d2, len], w, e) => {
      const day = (s: string) => {
        const out = meetings(s, w.time, e, 1);
        if (out.length !== 1) throw new Error(fill(w.time, { s: s.trim() || "…" }));
        return out[0];
      };
      const [m1, b1, m2, b2] = [meetings(c1, w.time, e, 5), day(d1), meetings(c2, w.time, e, 5), day(d2)];
      const D = int(len, e, 1, 1440);
      const END = 23 * 60 + 59;
      // Outside each person's day counts as a meeting too (kept in order of start, in case a meeting lies outside it).
      const byStart = (p: Pt, q: Pt) => p[0] - q[0];
      const cal1: Pt[] = [[0, b1[0]] as Pt, ...m1, [b1[1], END] as Pt].sort(byStart);
      const cal2: Pt[] = [[0, b2[0]] as Pt, ...m2, [b2[1], END] as Pt].sort(byStart);
      const all: Pt[] = [];
      let [i, j] = [0, 0];
      while (i < cal1.length && j < cal2.length) all.push(cal1[i][0] <= cal2[j][0] ? cal1[i++] : cal2[j++]);
      all.push(...cal1.slice(i), ...cal2.slice(j));
      // The picture shows the hours from just before the earlier day starts to just after the later one ends.
      const lo = Math.max(0, Math.floor(Math.min(b1[0], b2[0], ...[...m1, ...m2].map((m) => m[0])) / 60) - 1);
      const hi = Math.min(24, Math.ceil(Math.max(b1[1], b2[1], ...[...m1, ...m2].map((m) => m[1])) / 60) + 1);
      const hours = ([a, b]: Pt): Pt => [Math.max(lo, Math.round((a / 60) * 100) / 100), Math.min(hi, Math.round((b / 60) * 100) / 100)];
      const busy: Pt[] = [];
      const free: Pt[] = [];
      const pic = (k: number, gap?: [Pt, Role]) => [
        { label: w.both, items: all.map(hours), roles: rolesOf(all.length, (x) => (x === k ? "key" : x < k ? "idle" : "plain")) },
        { label: w.busy, items: busy.map(hours), roles: rolesOf(busy.length, (x) => (x === busy.length - 1 && k < all.length ? "key" : "plain")) },
        { label: w.free, items: [...free, ...(gap ? [gap[0]] : [])].map(hours), roles: rolesOf(free.length + (gap ? 1 : 0), (x) => (x === free.length && gap ? gap[1] : "sorted")) },
      ];
      const span = ([a, b]: Pt) => `${hhmm(a)}–${hhmm(b)}`;
      const frames: Frame[] = [{ note: fill(w.bounds, { a: hhmm(b1[0]), b: hhmm(b1[1]), c: hhmm(b2[0]), d: hhmm(b2[1]), n: all.length }), spans: pic(-1) }];
      for (const [k, m] of all.entries()) {
        const last = busy[busy.length - 1];
        if (!last) {
          busy.push([m[0], m[1]]);
          frames.push({ note: fill(w.first, { m: span(m) }), spans: pic(k) });
        } else if (m[0] <= last[1]) {
          const e0 = last[1];
          last[1] = Math.max(last[1], m[1]);
          frames.push({ note: fill(w.overlap, { m: span(m), e: hhmm(e0), n: span(last) }), spans: pic(k) });
        } else {
          busy.push([m[0], m[1]]);
          frames.push({ note: fill(w.apart, { m: span(m), e: hhmm(last[1]) }), spans: pic(k) });
        }
      }
      for (let k = 1; k < busy.length; k++) {
        const gap: Pt = [busy[k - 1][1], busy[k][0]];
        const long = gap[1] - gap[0] >= D;
        frames.push({ note: fill(long ? w.gapOk : w.gapShort, { m: span(gap), n: gap[1] - gap[0], d: D }), spans: pic(all.length, [gap, long ? "key" : "min"]) });
        if (long) free.push(gap);
      }
      return done(frames, free.length ? fill(w.answer, { d: D, list: free.map(span).join(", ") }) : fill(w.none, { d: D }), { spans: pic(all.length) });
    },
  },

  waterfallStreams: {
    level: 4,
    example: ["0 0 0 0 0 0 0; 0 0 0 1 1 0 0; 0 0 0 0 0 0 0; 0 1 1 1 0 0 0; 1 0 0 0 0 1 0; 0 0 0 0 0 0 0", "3"],
    solve: ([a, s], w, e) => {
      const g = matrix(a, e, { rows: 8, cols: 8, whole: true, min: 0, max: 1 });
      const [R, C] = [g.length, g[0].length];
      const src = int(s, e, 0, C - 1);
      const water = grid2(R, C, () => 0);
      water[0][src] = 1;
      const pct = (v: number) => Math.round(v * 1e6) / 1e4;
      const pic = (r: number, role: (i: number, j: number) => Role | undefined = () => undefined): Mat => ({
        vals: grid2(R, C, (i, j) => (water[i][j] ? pct(water[i][j]) : g[i][j] ? "■" : "")),
        roles: grid2(R, C, (i, j) => role(i, j) ?? (water[i][j] ? (i === r ? "key" : "sorted") : g[i][j] ? "idle" : "plain")),
      });
      const frames: Frame[] = [{ note: fill(w.start, { c: src }), mat: pic(0) }];
      for (let r = 1; r < R; r++) {
        // Straight falls first, then the streams that land on a block: the water adds up the same either way.
        for (let c = 0; c < C; c++) if (water[r - 1][c] && !g[r][c]) water[r][c] += water[r - 1][c];
        let splits = 0;
        for (let c = 0; c < C; c++) {
          const v = water[r - 1][c];
          if (!v || !g[r][c]) continue;
          splits++;
          const half = v / 2;
          const go = (dir: number): string => {
            for (let x = c + dir; x >= 0 && x < C; x += dir) {
              if (g[r - 1][x]) break;
              if (!g[r][x]) {
                water[r][x] += half;
                return fill(w.falls, { h: pct(half), x });
              }
            }
            return fill(w.lost, { h: pct(half) });
          };
          const [left, right] = [go(-1), go(1)];
          frames.push({ note: fill(w.split, { r, c, p: pct(v), left, right }), mat: pic(r, (i, j) => (i === r && j === c ? "min" : undefined)) });
        }
        const wet = water[r].some((v) => v > 0);
        if (!splits) frames.push({ note: fill(wet ? w.fall : w.dry, { r }), mat: pic(r) });
        if (!wet) break;
      }
      return done(frames, fill(w.answer, { list: listText(water[R - 1].map(pct)) }));
    },
  },

  minimumAreaRectangle: {
    level: 4,
    example: ["0, 0; 4, 0; 4, 3; 0, 3; 1, 1; 1, 3; 4, 1; 2, 2"],
    solve: ([a], w, e) => {
      const pts = pointSet(a, e, w);
      const view = plane(pts, w.fit);
      const has = new Set(pts.map(([x, y]) => ptKey(x, y)));
      let best = Infinity;
      const frames: Frame[] = [];
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const [p, q] = [pts[i], pts[j]];
          const marks = new Map<string, Role>([[ptKey(...p), "key"], [ptKey(...q), "key"]]);
          let note: string;
          let fresh = false;
          if (p[0] === q[0] || p[1] === q[1]) note = fill(w.line, { p: at(p), q: at(q) });
          else {
            const [c, d]: Pt[] = [[p[0], q[1]], [q[0], p[1]]];
            const ok = has.has(ptKey(...c)) && has.has(ptKey(...d));
            const area = Math.abs((q[0] - p[0]) * (q[1] - p[1]));
            fresh = ok && area < best;
            if (fresh) best = area;
            for (const z of [c, d]) marks.set(ptKey(...z), has.has(ptKey(...z)) ? (ok ? "sorted" : "compare") : "min");
            if (ok) for (const z of [p, q]) marks.set(ptKey(...z), "sorted");
            note = fill(!ok ? w.miss : fresh ? w.rectBest : w.rect, { p: at(p), q: at(q), c: at(c), d: at(d), a: area });
          }
          frames.push({ note, mat: view((x, y) => marks.get(ptKey(x, y))), rows: [row(w.smallest, best < Infinity ? [best] : [], () => (fresh ? "key" : "sorted"))] });
        }
      if (!frames.length) frames.push({ note: w.one, mat: view() });
      return done(frames, best < Infinity ? fill(w.answer, { a: best }) : w.none);
    },
  },

  lineThroughPoints: {
    level: 4,
    example: ["0, 0; 1, 1; 2, 2; 3, 1; 1, 3; 4, 0; 2, 4"],
    solve: ([a], w, e) => {
      const pts = pointSet(a, e, w, 10);
      const view = plane(pts, w.fit);
      let best = 1;
      const frames: Frame[] = [{ note: w.start, mat: view(), rows: [row(w.slopes, []), row(w.most, [best])] }];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const groups = new Map<string, number[]>();
        for (let j = i + 1; j < pts.length; j++) {
          const s = slope(p, pts[j]);
          groups.set(s, [...(groups.get(s) ?? []), j]);
        }
        let [top, on] = ["", [] as number[]];
        for (const [s, js] of groups) if (js.length > on.length) [top, on] = [s, js];
        const n = on.length + 1;
        const better = n > best;
        if (better) best = n;
        const onLine = new Set(on.map((j) => ptKey(...pts[j])));
        const entries = [...groups];
        frames.push({
          note: fill(better ? w.fromBest : w.from, { p: at(p), s: top, k: on.length, n }),
          mat: view((x, y) => (x === p[0] && y === p[1] ? "key" : onLine.has(ptKey(x, y)) ? "sorted" : undefined)),
          rows: [row(w.slopes, entries.map(([s, js]) => `${s}: ${js.length}`), (k) => (entries[k][0] === top ? "sorted" : "plain")), row(w.most, [best], () => (better ? "key" : "plain"))],
        });
      }
      return done(frames, fill(w.answer, { n: best }));
    },
  },

  largestPark: {
    level: 4,
    example: ["0 0 1 0 0 0; 0 0 0 0 1 0; 1 0 0 0 0 0; 0 0 0 1 0 0; 0 1 0 0 0 0"],
    solve: ([a], w, e) => {
      const land = matrix(a.replace(/true/gi, "1").replace(/false/gi, "0"), e, { rows: 8, cols: 8, whole: true, min: 0, max: 1 });
      const [R, C] = [land.length, land[0].length];
      const h: number[] = Array.from({ length: C }, () => 0);
      let best = 0;
      let bestBox: [number, number, number, number] | null = null;
      const inBox = (b: readonly number[] | null, r: number, c: number) => b !== null && r >= b[0] && r <= b[1] && c >= b[2] && c <= b[3];
      const pic = (box: readonly number[] | null): Mat => ({
        vals: land.map((row) => row.map((v) => (v ? "▲" : ""))),
        roles: grid2(R, C, (i, j) => (inBox(box, i, j) ? "compare" : inBox(bestBox, i, j) ? "sorted" : land[i][j] ? "idle" : "plain")),
      });
      const frames: Frame[] = [];
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) h[c] = land[r][c] ? 0 : h[c] + 1;
        frames.push({ note: fill(w.heights, { r, list: listText(h) }), cells: cells(h, (c) => (h[c] ? "key" : "idle")), mat: pic(null), rows: [row(w.stack, [])] });
        // The largest rectangle under the heights: a stack of columns, each taller than the one under it.
        const stack: number[] = [];
        for (let i = 0; i <= C; i++) {
          const x = i < C ? h[i] : 0;
          while (stack.length && h[stack[stack.length - 1]] >= x) {
            const top = stack.pop()!;
            const tall = h[top];
            const wide = stack.length ? i - stack[stack.length - 1] - 1 : i;
            const area = tall * wide;
            if (!area) continue;
            const box: [number, number, number, number] = [r - tall + 1, r, i - wide, i - 1];
            const better = area > best;
            if (better) [best, bestBox] = [area, box];
            const v = { x, i, h: tall, c: top, w: wide, a: area };
            frames.push({
              note: fill(i < C ? w.pop : w.popEnd, v) + (better ? ` ${w.best}` : ""),
              cells: cells(h, (k) => (k === top ? "key" : k >= box[2] && k <= box[3] ? "compare" : k === i ? "pivot" : "plain"), i < C ? { i } : undefined),
              mat: pic(box),
              rows: [row(w.stack, [...stack])],
            });
          }
          stack.push(i);
        }
      }
      return done(frames, fill(w.answer, { a: best }), { mat: pic(null) });
    },
  },
};
