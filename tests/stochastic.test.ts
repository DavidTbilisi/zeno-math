// Stochastic processes (a degree elective) in practice: the helpers behind the answers (the random walk's
// distribution, the gambler's ruin and its length, the Poisson probabilities) checked by hand and by first-step
// analysis, and every question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { F, poissonPmf, ruinDuration, ruinWin, seen, upper, walkProb } from "../src/math/stochastic.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["randomWalks", "poissonProcess", "brownian"];
const PS = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(2, 5), F(3, 5)];

test("the random walk's distribution: by hand, parity, and summing to 1", () => {
  assert.equal(walkProb(4, 2, F(3, 4)).tex(), "\\frac{27}{64}");
  assert.equal(walkProb(6, 0, F(1, 2)).tex(), "\\frac{5}{16}");
  assert.equal(walkProb(5, 2, F(1, 2)).tex(), "0", "an odd number of steps never ends at an even point");
  assert.equal(walkProb(3, 5, F(1, 2)).tex(), "0");
  for (const p of PS)
    for (let n = 1; n <= 8; n++) {
      const all = Array.from({ length: 2 * n + 1 }, (_, i) => walkProb(n, i - n, p)).reduce((s, x) => s.add(x), F(0));
      assert.equal(all.tex(), "1", `n = ${n}`);
    }
});

test("the gambler's ruin: by hand, and by first-step analysis for every p, N and start", () => {
  assert.equal(ruinWin(3, 10, F(1, 2)).tex(), "\\frac{3}{10}");
  assert.equal(ruinWin(2, 5, F(2, 3)).tex(), "\\frac{24}{31}");
  assert.equal(ruinDuration(3, 10, F(1, 2)).tex(), "21");
  assert.equal(ruinDuration(1, 5, F(3, 4)).tex(), "\\frac{568}{121}");
  for (const p of PS)
    for (let N = 2; N <= 8; N++) {
      const q = F(1).sub(p);
      const W = (i: number) => (i === 0 ? F(0) : i === N ? F(1) : ruinWin(i, N, p));
      const D = (i: number) => (i === 0 || i === N ? F(0) : ruinDuration(i, N, p));
      for (let i = 1; i < N; i++) {
        // P_i = p P_{i+1} + q P_{i-1}, D_i = 1 + p D_{i+1} + q D_{i-1}
        assert.equal(W(i).tex(), p.mul(W(i + 1)).add(q.mul(W(i - 1))).tex(), `win ${p.tex()} ${i}/${N}`);
        assert.equal(D(i).tex(), F(1).add(p.mul(D(i + 1))).add(q.mul(D(i - 1))).tex(), `length ${p.tex()} ${i}/${N}`);
      }
    }
});

test("Poisson probabilities, the normal tail, and the slips worth naming", () => {
  assert.ok(Math.abs(poissonPmf(3, 1.5) - 0.12551) < 1e-5);
  assert.ok(Math.abs(poissonPmf(0, 2) - Math.exp(-2)) < 1e-12);
  const total = Array.from({ length: 40 }, (_, k) => poissonPmf(k, 4)).reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(Math.abs(upper(0) - 0.5) < 1e-9 && Math.abs(upper(1.96) - 0.025) < 1e-3);
  // a slip that rounds to 0.000, or that sits within rounding of the answer, is not named
  assert.deepEqual(seen(0.3, [["expCdfForTail", 0.7], ["memorylessIgnored", 3e-7], ["expRateAsMean", 0.31]]).map(([id]) => id), ["expCdfForTail"]);
});

test("every stochastic-processes question accepts its own answer and names its slips", () => {
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
