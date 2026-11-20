// Game theory (a degree elective) in practice: the helpers behind the answers (best responses and pure equilibria,
// iterated dominance, saddle points, mixed equilibria by indifference, backward induction) checked on the textbook
// games and by brute force, and every question checked against its own answer (right as shown, the named slips wrong
// and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { F, iterated, maximin, minimax, mixCol, mixRow, pureNash, selfish, solve, zeroSumValue, type Game, type Tree } from "../src/math/gameTheory.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["normalForm", "mixedNash", "backwardInduction"];

test("pure equilibria: the prisoner's dilemma, battle of the sexes, matching pennies", () => {
  const pd: Game = { a: [[3, 0], [5, 1]], b: [[3, 5], [0, 1]] };
  assert.deepEqual(pureNash(pd), [[1, 1]], "both defect");
  const bos: Game = { a: [[2, 0], [0, 1]], b: [[1, 0], [0, 2]] };
  assert.deepEqual(pureNash(bos), [[0, 0], [1, 1]]);
  const pennies: Game = { a: [[1, -1], [-1, 1]], b: [[-1, 1], [1, -1]] };
  assert.deepEqual(pureNash(pennies), []);
  assert.equal(mixRow(pennies.b).tex(), "\\frac{1}{2}");
  assert.equal(mixCol(pennies.a).tex(), "\\frac{1}{2}");
});

test("iterated dominance removes the dominated strategies down to one cell", () => {
  // Gibbons' example: R is dominated by M for Column, then D by U for Row, then L by M
  const g: Game = { a: [[1, 1, 0], [0, 0, 2]], b: [[0, 2, 1], [3, 1, 0]] };
  const it = iterated(g);
  assert.deepEqual([it.rows, it.cols], [[0], [1]]);
  assert.deepEqual(it.removed.map((x) => [x.who, x.out, x.by]), [[1, 2, 1], [0, 1, 0], [1, 0, 1]]);
});

test("a zero-sum game: the saddle point, and the mixed value by indifference", () => {
  const m = [[4, 2, 5], [6, 3, 7], [1, 0, 2]];
  assert.equal(maximin(m), 3);
  assert.equal(minimax(m), 3);
  for (let s = 0; s < 500; s++) {
    const z = [[(s * 7) % 13 - 4, (s * 5) % 11 - 4], [(s * 3) % 9 - 4, (s * 11) % 12 - 4]];
    const d = z[0][0] - z[0][1] - z[1][0] + z[1][1];
    if (d === 0 || maximin(z) === minimax(z)) continue;
    // Row's p makes both columns pay the same, and that is the value
    const p = mixRow(z.map((row) => row.map((x) => -x)));
    const q = F(1).sub(p);
    const col = (j: number) => p.mul(F(z[0][j])).add(q.mul(F(z[1][j])));
    assert.equal(col(0).tex(), col(1).tex(), JSON.stringify(z));
    assert.equal(col(0).tex(), zeroSumValue(z).tex(), JSON.stringify(z));
    assert.ok(zeroSumValue(z).toNumber() > maximin(z) - 1e-9 && zeroSumValue(z).toNumber() < minimax(z) + 1e-9);
  }
});

test("backward induction: a two-move tree, and the Stackelberg leader by brute force", () => {
  const t: Tree = { who: 0, moves: [["L", { who: 1, moves: [["a", { pay: [3, 1] }], ["b", { pay: [0, 2] }]] }], ["R", { who: 1, moves: [["c", { pay: [2, 2] }], ["d", { pay: [1, 0] }]] }]] };
  assert.deepEqual(solve(t, selfish), [2, 2], "player 2 would answer L with b, so player 1 goes R");
  for (const k of [12, 24, 36]) {
    // the follower replies (k − q₁)/2; the leader's profit (k − q₁ − q₂)q₁ is largest at k/2 on a fine grid
    let best = 0;
    let at = 0;
    for (let i = 0; i <= 1000 * k; i++) {
      const q1 = i / 1000;
      const profit = (k - q1 - (k - q1) / 2) * q1;
      if (profit > best) [best, at] = [profit, q1];
    }
    assert.equal(at, k / 2);
  }
});

test("every game-theory question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity|null/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{/.test((e.steps ?? []).join(" ")), `${where}: words in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
