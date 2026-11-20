// Real analysis in practice: the numbers the answers are made of, checked against brute force, and every question
// checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { darboux, epsTex, F, fact, firstN, setTex, termTex, wholeOf } from "../src/math/realAnalysis.ts";

const w = en.pracWords;

test("sets, terms and ε are written as LaTeX", () => {
  assert.equal(epsTex(10), "\\varepsilon = 0.1");
  assert.equal(epsTex(100), "\\varepsilon = 0.01");
  assert.equal(epsTex(20), "\\varepsilon = \\frac{1}{20}");
  assert.equal(termTex(3, F(2)), "3 + \\frac{2}{n}");
  assert.equal(termTex(0, F(-5), 2), "-\\frac{5}{n^{2}}");
  assert.equal(termTex(-1, F(4), 1, true), "-1 + (-1)^{n}\\frac{4}{n}");
  assert.equal(setTex("x"), "\\left\\{ x : n \\in \\mathbb{N} \\right\\}");
  assert.deepEqual([fact(0), fact(1), fact(5)], [1, 1, 120]);
  assert.equal(firstN((n) => n * n > 50), 8);
  assert.ok(Number.isNaN(firstN(() => false, 10)));
});

test("whole-number answers keep only the slips that differ", () => {
  const s = wholeOf(31, [["epsilonBoundaryN", 30], ["forgotShiftN", 31], ["forgotSquareRootN", 0], ["sumWithoutWidth", 30]]);
  assert.deepEqual(s.answer.k === "num" && s.answer.traps?.map((t) => t.id), ["epsilonBoundaryN"]);
});

test("Darboux sums of a monotone function match the sums taken over a fine grid of each piece", () => {
  const fs = [(x: number) => x * x + 1, (x: number) => -2 * x + 3];
  for (const [i, f] of fs.entries())
    for (const [a, b, n] of [[0, 1, 2], [1, 4, 3], [0, 3, 5]]) {
      const ff = (x: ReturnType<typeof F>) => (i === 0 ? x.mul(x).add(F(1)) : x.mul(F(-2)).add(F(3)));
      const h = (b - a) / n;
      let [U, L] = [0, 0];
      for (let j = 0; j < n; j++) {
        const ys = Array.from({ length: 101 }, (_, t) => f(a + j * h + (t * h) / 100));
        U += Math.max(...ys) * h;
        L += Math.min(...ys) * h;
      }
      assert.ok(Math.abs(darboux(ff, F(a), F(b), n, true).toNumber() - U) < 1e-9, `U ${i} ${a} ${b} ${n}`);
      assert.ok(Math.abs(darboux(ff, F(a), F(b), n, false).toNumber() - L) < 1e-9, `L ${i} ${a} ${b} ${n}`);
    }
});

test("the N of every ε question is the first one that works", () => {
  // (pn + q)/(n + c) with |q − pc| = d: |aₙ − p| = d/(n + c).
  for (const c of [1, 2, 3, 4]) for (const d of [1, 3, 5]) for (const k of [10, 20, 100]) assert.equal(firstN((n) => d * k < n + c), d * k - c + 1);
  // c − b/n² within 1/(b j²) of c.
  for (const b of [1, 2, 3]) for (const j of [2, 3, 5]) assert.equal(firstN((n) => b * b * j * j < n * n), b * j + 1);
  // U − L = D/n < 1/k.
  for (const D of [1, 6, 9]) for (const k of [10, 20]) assert.equal(firstN((n) => D * k < n), D * k + 1);
});

test("the δ for x² works and the textbook bound is what the proof gives", () => {
  for (const a of [-4, -1, 1, 3])
    for (const eps of [0.1, 0.5, 1, 2, 5, 20]) {
      const d = Math.min(1, eps / (2 * Math.abs(a) + 1));
      for (let t = -0.999; t < 1; t += 0.037) assert.ok(Math.abs((a + t * d) ** 2 - a * a) < eps, `${a} ${eps}`);
    }
});

test("the mean value point, Lagrange's bound and the sup norms are right", () => {
  // x³ on [0, b]: 3c² = b².
  for (const b of [2, 3, 6]) assert.ok(Math.abs(3 * (b / Math.sqrt(3)) ** 2 - b * b) < 1e-9);
  // |sin x − (x − x³/6)| ≤ x⁴/4! at x = 1/2 (n = 3), and e^(−x) with n = 2 at x = 1/3.
  assert.ok(Math.abs(Math.sin(0.5) - (0.5 - 0.5 ** 3 / 6)) <= 0.5 ** 4 / 24);
  const x = 1 / 3;
  assert.ok(Math.abs(Math.exp(-x) - (1 - x + (x * x) / 2)) <= x ** 3 / 6);
  const sup = (f: (x: number) => number) => Math.max(...Array.from({ length: 100001 }, (_, i) => Math.abs(f(i / 100000))));
  for (const m of [2, 5]) assert.ok(Math.abs(sup((x) => x / (1 + m * m * x * x)) - 1 / (2 * m)) < 1e-6);
  for (const n of [3, 8]) {
    assert.ok(Math.abs(sup((x) => (n * x) / (1 + n * n * x * x)) - 0.5) < 1e-6);
    assert.ok(Math.abs(sup((x) => x ** n - x ** (2 * n)) - 0.25) < 1e-6);
  }
});

const SKILLS: SkillId[] = ["supInf", "seqLimits", "epsilonDelta", "mvt", "riemann", "uniform"];

test("every real-analysis question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
