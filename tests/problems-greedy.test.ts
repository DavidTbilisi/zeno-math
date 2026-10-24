// The greedy problems give the right answers: on their examples, on cases picked to catch a slip (ties, one item, the
// "no" answer), and on random inputs checked against trying every order, pairing or choice; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const g = w.greedy;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

function* perms<T>(a: T[]): Generator<T[]> {
  if (a.length <= 1) {
    yield [...a];
    return;
  }
  for (let i = 0; i < a.length; i++) for (const p of perms([...a.slice(0, i), ...a.slice(i + 1)])) yield [a[i], ...p];
}

test("minimum waiting time", () => {
  assert.equal(answer("minimumWaitingTime", "6, 2, 9, 1, 4"), "The smallest total waiting time is 24.");
  assert.equal(answer("minimumWaitingTime", "7"), "The smallest total waiting time is 0.");
  assert.equal(answer("minimumWaitingTime", "3, 3, 3"), "The smallest total waiting time is 9.");
  const r = rng(11);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 6), 0, 12);
    let best = Infinity;
    for (const p of perms(xs)) {
      let [t, before] = [0, 0];
      for (const d of p) (t += before), (before += d);
      best = Math.min(best, t);
    }
    assert.equal(answer("minimumWaitingTime", xs.join(", ")), fill(g.minimumWaitingTime.answer, { t: best }), `${xs}`);
  }
  assert.throws(() => answer("minimumWaitingTime", "2, -1"), /too small/);
});

test("class photos", () => {
  assert.equal(answer("classPhotos", "5, 9, 7, 4, 8", "6, 8, 4, 3, 6"), g.classPhotos.yesRed);
  assert.equal(answer("classPhotos", "2, 4", "5, 3"), g.classPhotos.yesBlue);
  assert.equal(answer("classPhotos", "6, 3", "6, 2"), g.classPhotos.no);
  assert.equal(answer("classPhotos", "6, 3", "5, 3"), g.classPhotos.no);
  assert.throws(() => answer("classPhotos", "1, 2", "3"), /same number/);
  const r = rng(12);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 5);
    const red = randInts(r, n, 1, 8);
    const blue = randInts(r, n, 1, 8);
    // The slow way: every order of the front row against the back row, with either colour at the back.
    const can = (back: number[], front: number[]) => [...perms(front)].some((p) => p.every((f, i) => back[i] > f));
    const yes = can(red, blue) || can(blue, red);
    assert.equal(answer("classPhotos", red.join(", "), blue.join(", ")) !== g.classPhotos.no, yes, `${red} / ${blue}`);
  }
});

test("tandem bicycle", () => {
  assert.equal(answer("tandemBicycle", "5, 3, 9, 2", "4, 8, 1, 6", "1"), "The largest total speed is 28.");
  assert.equal(answer("tandemBicycle", "5, 3, 9, 2", "4, 8, 1, 6", "0"), "The smallest total speed is 21.");
  assert.equal(answer("tandemBicycle", "4", "7", "no"), "The smallest total speed is 7.");
  assert.throws(() => answer("tandemBicycle", "1", "2", "maybe"), /Write 1/);
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 5);
    const red = randInts(r, n, 1, 12);
    const blue = randInts(r, n, 1, 12);
    const totals = [...perms(blue)].map((p) => p.reduce((s, b, i) => s + Math.max(b, red[i]), 0));
    const fast = k % 2 === 0;
    const want = fast ? Math.max(...totals) : Math.min(...totals);
    assert.equal(answer("tandemBicycle", red.join(", "), blue.join(", "), fast ? "1" : "0"), fill(fast ? g.tandemBicycle.answerMax : g.tandemBicycle.answerMin, { t: want }), `${red} / ${blue}`);
  }
});

test("optimal freelancing", () => {
  assert.equal(answer("optimalFreelancing", "2, 1, 3, 2, 7, 1", "40, 25, 30, 60, 10, 50"), "The most money is 150.");
  assert.equal(answer("optimalFreelancing", "1, 1, 1", "5, 9, 2"), "The most money is 9.");
  assert.equal(answer("optimalFreelancing", "9", "4"), "The most money is 4.");
  assert.throws(() => answer("optimalFreelancing", "1, 2", "3"), /same number/);
  assert.throws(() => answer("optimalFreelancing", "0", "3"), /too small/);
  const r = rng(14);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 9);
    const dues = randInts(r, n, 1, 9);
    const pays = randInts(r, n, 0, 50);
    // The slow way: every set of jobs that can be fitted in (sorted by deadline, the i-th done by day i + 1).
    let best = 0;
    for (let m = 0; m < 1 << n; m++) {
      const pick = dues.map((_, i) => i).filter((i) => m & (1 << i));
      const ds = pick.map((i) => Math.min(dues[i], 7)).sort((a, b) => a - b);
      if (ds.every((d, i) => d >= i + 1)) best = Math.max(best, pick.reduce((s, i) => s + pays[i], 0));
    }
    assert.equal(answer("optimalFreelancing", dues.join(", "), pays.join(", ")), `The most money is ${best}.`, `${dues} / ${pays}`);
  }
});

test("task assignment", () => {
  assert.equal(answer("taskAssignment", "3", "5, 2, 8, 1, 6, 4"), "Pairs of task indices: [3, 2], [1, 4], [5, 0]; the longest worker takes 9.");
  assert.equal(answer("taskAssignment", "1", "7, 3"), "Pairs of task indices: [1, 0]; the longest worker takes 10.");
  assert.throws(() => answer("taskAssignment", "2", "1, 2, 3"), /exactly 4 tasks/);
  const r = rng(15);
  for (let k = 0; k < 100; k++) {
    const workers = 1 + (k % 4);
    const tasks = randInts(r, 2 * workers, 1, 20);
    const got = answer("taskAssignment", String(workers), tasks.join(", "));
    const pairs = [...got.matchAll(/\[(\d+), (\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.deepEqual(pairs.flat().sort((a, b) => a - b), tasks.map((_, i) => i), got);
    const longest = Math.max(...pairs.map(([a, b]) => tasks[a] + tasks[b]));
    // The slow way: every way to pair the tasks up.
    const best = (left: number[]): number => {
      if (!left.length) return 0;
      const [a, ...rest] = left;
      return Math.min(...rest.map((b, i) => Math.max(tasks[a] + tasks[b], best(rest.filter((_, j) => j !== i)))));
    };
    assert.equal(longest, best(tasks.map((_, i) => i)), `${tasks}`);
    assert.ok(got.endsWith(`takes ${longest}.`), got);
  }
});

test("valid starting city", () => {
  assert.equal(answer("validStartingCity", "20, 10, 30, 15, 25", "0, 4, 1, 3, 2", "10"), "Start from city 1.");
  assert.equal(answer("validStartingCity", "5", "1", "5"), "Start from city 0.");
  assert.throws(() => answer("validStartingCity", "10, 10", "1, 0", "5"), /isn't enough fuel/);
  assert.throws(() => answer("validStartingCity", "10, 10", "1", "5"), /same number/);
  const r = rng(16);
  for (let k = 0; k < 200; k++) {
    const n = 1 + (k % 7);
    const mpg = 1 + Math.floor(r() * 5);
    const fuel = randInts(r, n, 0, 6);
    const range = fuel.reduce((s, x) => s + x * mpg, 0);
    // Spread the fuel's range over the roads at random, so a lap uses it exactly (or leaves a little over).
    const dist = Array(n).fill(0);
    for (let m = range - (k % 3 === 0 ? Math.floor(r() * 3) : 0); m > 0; m--) dist[Math.floor(r() * n)]++;
    const got = answer("validStartingCity", dist.join(", "), fuel.join(", "), String(mpg));
    const s = Number(got.match(/city (\d+)/)![1]);
    let tank = 0;
    for (let i = 0; i < n; i++) {
      const c = (s + i) % n;
      tank += fuel[c] * mpg - dist[c];
      assert.ok(tank >= 0, `${dist} / ${fuel} / ${mpg}: ${got}`);
    }
  }
});
