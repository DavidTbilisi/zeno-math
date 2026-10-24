// Interview problems where the greedy choice is the right one: run the shortest query first, pair the fastest with the
// slowest, take the best-paid job first. Each solver makes that choice step by step and says why at every frame.
import { cells, done, fill, int, listText, nums, row, show, type Errors, type Frame, type ProblemSet, type Role } from "./core";

/** Sorted copies, smallest or largest first. */
const up = (a: readonly number[]) => [...a].sort((x, y) => x - y);
const downward = (a: readonly number[]) => [...a].sort((x, y) => y - x);

/** Two lists of the same length. */
function pair(a: string, b: string, e: Errors, opts: Parameters<typeof nums>[2]): [number[], number[]] {
  const xs = nums(a, e, opts);
  const ys = nums(b, e, opts);
  if (xs.length !== ys.length) throw new Error(e.sameLength);
  return [xs, ys];
}

/** "1"/"0", or yes/no in any of the three languages. */
function yesNo(s: string, bad: string): boolean {
  const t = s.trim().toLowerCase();
  if (/^(1|yes|y|true|კი|დიახ|да|д)$/.test(t)) return true;
  if (/^(0|no|n|false|არა|нет|н)$/.test(t)) return false;
  throw new Error(fill(bad, { s: s.trim() || "…" }));
}

export const GREEDY: ProblemSet<"greedy"> = {
  minimumWaitingTime: {
    level: 1,
    example: ["6, 2, 9, 1, 4"],
    solve: ([a], w, e) => {
      const xs = up(nums(a, e, { whole: true, min: 0, max: 12 }));
      const waits: number[] = [];
      let [before, total] = [0, 0];
      const frames: Frame[] = [{ note: fill(w.sorted, { list: listText(xs) }), cells: cells(xs), rows: [row(w.waits, []), row(w.total, [0])] }];
      for (const [i, d] of xs.entries()) {
        waits.push(before);
        total += before;
        frames.push({
          note: fill(w.wait, { d, w: before, t: total }),
          cells: cells(xs, (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }),
          rows: [row(w.waits, waits, (k) => (k === i ? "key" : "plain")), row(w.total, [total], () => "sorted")],
        });
        before += d;
      }
      return done(frames, fill(w.answer, { t: total }));
    },
  },

  classPhotos: {
    level: 1,
    example: ["5, 9, 7, 4, 8", "6, 8, 4, 3, 6"],
    solve: ([a, b], w, e) => {
      const [red0, blue0] = pair(a, b, e, { min: 1, max: 10 });
      const [red, blue] = [downward(red0), downward(blue0)];
      const n = red.length;
      const heads = [w.red, w.blue];
      const mat = (role: (c: number) => Role) => ({ vals: [red, blue], roles: [red.map((_, c) => role(c)), blue.map((_, c) => role(c))], rowHeads: heads });
      const frames: Frame[] = [{ note: w.sorted, mat: mat(() => "plain") }];
      if (red[0] === blue[0]) {
        frames.push({ note: fill(w.tie, { r: show(red[0]) }), mat: mat((c) => (c === 0 ? "min" : "plain")) });
        return done(frames, w.no);
      }
      const redBack = red[0] > blue[0];
      const [back, front] = redBack ? [red, blue] : [blue, red];
      frames.push({ note: fill(redBack ? w.redBack : w.blueBack, { r: show(red[0]), b: show(blue[0]) }), mat: mat((c) => (c === 0 ? "compare" : "plain")) });
      for (let i = 0; i < n; i++) {
        const ok = back[i] > front[i];
        frames.push({
          note: fill(ok ? w.pair : w.clash, { i, a: show(back[i]), b: show(front[i]) }),
          mat: mat((c) => (c === i ? (ok ? "key" : "min") : c < i ? "sorted" : "plain")),
        });
        if (!ok) return done(frames, w.no);
      }
      return done(frames, redBack ? w.yesRed : w.yesBlue, { mat: mat(() => "sorted") });
    },
  },

  tandemBicycle: {
    level: 1,
    example: ["5, 3, 9, 2", "4, 8, 1, 6", "1"],
    solve: ([a, b, f], w, e) => {
      const [red0, blue0] = pair(a, b, e, { min: 0, max: 10 });
      const fastest = yesNo(f, w.yesNo);
      const red = up(red0);
      const blue = fastest ? downward(blue0) : up(blue0);
      let total = 0;
      const heads = [w.red, w.blue];
      const mat = (i: number) => ({
        vals: [red, blue],
        roles: [red, blue].map((r, k) => r.map((v, c): Role => (c === i ? (v >= [blue, red][k][c] ? "key" : "compare") : c < i ? "idle" : "plain"))),
        rowHeads: heads,
      });
      const frames: Frame[] = [{ note: fastest ? w.sortedMax : w.sortedMin, mat: mat(-1), rows: [row(w.total, [0])] }];
      for (let i = 0; i < red.length; i++) {
        const m = Math.max(red[i], blue[i]);
        total += m;
        frames.push({ note: fill(w.pair, { r: show(red[i]), b: show(blue[i]), m: show(m), t: show(total) }), mat: mat(i), rows: [row(w.total, [total], () => "sorted")] });
      }
      return done(frames, fill(fastest ? w.answerMax : w.answerMin, { t: show(total) }));
    },
  },

  optimalFreelancing: {
    level: 1,
    example: ["2, 1, 3, 2, 7, 1", "40, 25, 30, 60, 10, 50"],
    solve: ([d, p], w, e) => {
      const dues = nums(d, e, { whole: true, min: 1, max: 9 });
      const pays = nums(p, e, { min: 0, max: 9 });
      if (dues.length !== pays.length) throw new Error(e.sameLength);
      const DAYS = 7;
      const order = pays.map((_, i) => i).sort((x, y) => pays[y] - pays[x]);
      const jobs = order.map((i) => `${show(pays[i])} (${dues[i]})`);
      const days: (number | string)[] = Array(DAYS).fill("·");
      const dayRow = (at: number, role: Role) => ({
        vals: [[...days]],
        roles: [days.map((v, k): Role => (k === at ? role : v === "·" ? "idle" : "sorted"))],
        rowHeads: [w.days],
        colHeads: days.map((_, k) => String(k + 1)),
      });
      const jobRow = (at: number, role: Role, taken: boolean[]) => row(w.jobs, jobs, (k) => (k === at ? role : k < at ? (taken[k] ? "sorted" : "idle") : "plain"));
      const taken: boolean[] = [];
      let total = 0;
      const frames: Frame[] = [{ note: fill(w.sorted, { list: listText(order.map((i) => pays[i])) }), mat: dayRow(-1, "plain"), rows: [jobRow(-1, "plain", taken)] }];
      for (const [k, i] of order.entries()) {
        let day = Math.min(dues[i], DAYS) - 1;
        while (day >= 0 && days[day] !== "·") day--;
        const v = { p: show(pays[i]), d: dues[i], day: day + 1 };
        taken.push(day >= 0);
        if (day >= 0) {
          days[day] = pays[i];
          total += pays[i];
          frames.push({ note: fill(w.take, v), mat: dayRow(day, "key"), rows: [jobRow(k, "key", taken)] });
        } else frames.push({ note: fill(w.skip, v), mat: dayRow(-1, "plain"), rows: [jobRow(k, "min", taken)] });
      }
      return done(frames, fill(w.answer, { t: show(total) }));
    },
  },

  taskAssignment: {
    level: 2,
    example: ["3", "5, 2, 8, 1, 6, 4"],
    solve: ([kk, t], w, e) => {
      const k = int(kk, e, 1, 6);
      const tasks = nums(t, e, { whole: true, min: 0, max: 12 });
      if (tasks.length !== 2 * k) throw new Error(fill(w.count, { k, n: 2 * k, m: tasks.length }));
      const idx = tasks.map((_, i) => i).sort((x, y) => tasks[x] - tasks[y]);
      const sorted = idx.map((i) => tasks[i]);
      const n = 2 * k;
      const mat = (role: (c: number) => Role) => ({ vals: [sorted], roles: [sorted.map((_, c) => role(c))], colHeads: idx.map(String) });
      const sums: string[] = [];
      const pairs: string[] = [];
      let longest = -1;
      const frames: Frame[] = [{ note: w.sorted, mat: mat(() => "plain"), rows: [row(w.workers, [])] }];
      for (let l = 0; l < k; l++) {
        const r = n - 1 - l;
        const s = sorted[l] + sorted[r];
        if (s > longest) longest = s;
        sums.push(`${sorted[l]} + ${sorted[r]} = ${s}`);
        pairs.push(listText([idx[l], idx[r]]));
        frames.push({
          note: fill(w.pair, { a: sorted[l], i: idx[l], b: sorted[r], j: idx[r], s: `${sorted[l]} + ${sorted[r]} = ${s}` }),
          mat: mat((c) => (c === l || c === r ? "key" : c < l || c > r ? "sorted" : "plain")),
          rows: [row(w.workers, sums, (q) => (q === l ? "key" : "plain"))],
        });
      }
      const best = sums.map((_, q) => sorted[q] + sorted[n - 1 - q]);
      return done(frames, fill(w.answer, { pairs: pairs.join(", "), m: longest }), {
        rows: [row(w.workers, sums, (q) => (best[q] === longest ? "min" : "sorted"))],
      });
    },
  },

  validStartingCity: {
    level: 2,
    example: ["20, 10, 30, 15, 25", "0, 4, 1, 3, 2", "10"],
    solve: ([d, f, m], w, e) => {
      const [dist, fuel] = pair(d, f, e, { whole: true, min: 0, max: 10 });
      const mpg = int(m, e, 1, 100);
      const n = dist.length;
      const range = fuel.reduce((s, g) => s + g * mpg, 0);
      const road = dist.reduce((s, x) => s + x, 0);
      if (range < road) throw new Error(fill(w.short, { g: range, d: road }));
      const arrive: (number | string)[] = dist.map((_, i) => (i === 0 ? 0 : ""));
      const info = (i: number) => [row(w.fuel, fuel, (k) => (k === i ? "key" : "plain")), row(w.distance, dist, (k) => (k === i ? "key" : "plain"))];
      let [miles, start, least] = [0, 0, 0];
      const frames: Frame[] = [{ note: w.start, cells: cells(arrive, (k) => (k === 0 ? "sorted" : "idle"), { i: 0 }), rows: info(-1) }];
      for (let j = 1; j < n; j++) {
        const i = j - 1;
        miles += fuel[i] * mpg - dist[i];
        arrive[j] = miles;
        const low = miles < least;
        if (low) [start, least] = [j, miles];
        frames.push({
          note: fill(low ? w.lowest : w.drive, { f: fuel[i] * mpg, i, d: dist[i], m: show(miles), j }),
          cells: cells(arrive, (k) => (k === start ? "sorted" : k === j ? "key" : k > j ? "idle" : "plain"), { i: j }),
          rows: info(i),
        });
      }
      return done(frames, fill(w.answer, { i: start }));
    },
  },
};
