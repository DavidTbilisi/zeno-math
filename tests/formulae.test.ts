// Algebraic fractions and formulae: every answer equals the question at many values of x (or of the formula's
// letters), the form is checked (one fraction, cut down), every slip gives another answer, and the questions read in
// all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { evalE, parseE } from "../src/math/expr.ts";
import { formulaQuestion, fractionQuestion } from "../src/math/formulae.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const XS = [-3.7, -1.3, 0.4, 1.9, 2.6, 5.3, 8.1];
const w = en.pracWords;
/** A TeX question as plain text: \frac{a}{b} → (a)/(b), × and ÷ as * and /. */
const plainOf = (q: string) => q.replace(/x\^\{(\d)\}/g, "x^$1").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "(($1)/($2))").replace(/\\times/g, "*").replace(/\\div/g, "/");

test("algebraic fractions: the answer equals the question wherever both are defined", () => {
  for (const level of LEVELS) {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const q = fractionQuestion(rng(seed), level);
      kinds.add(q.kind);
      const [given, ans] = [parseE(plainOf(q.q)), parseE(q.ans)];
      let compared = 0;
      for (const x of XS) {
        const [u, v] = [evalE(given, x), evalE(ans, x)];
        if (!Number.isFinite(u) || !Number.isFinite(v) || Math.abs(u) > 1e6) continue;
        compared++;
        assert.ok(Math.abs(u - v) < 1e-7 * Math.max(1, Math.abs(u)), `${q.q} ≠ ${q.ans} at x = ${x}`);
      }
      assert.ok(compared >= 4, q.q);
      for (const t of q.traps) assert.ok(XS.some((x) => Math.abs(evalE(parseE(t.e), x) - evalE(ans, x)) > 1e-6), `${q.kind}: ${t.id} gives the answer`);
      assert.ok(q.steps.length > 0 && q.steps.every((s) => !/NaN|undefined/.test(s)));
    }
    assert.equal(kinds.size, level === 2 ? 5 : 4, `level ${level}: ${[...kinds]}`);
  }
});

test("algebraic fractions: the question typed back, or not cut down, is sent back, not marked wrong", () => {
  for (const level of LEVELS)
    for (const seed of SEEDS.slice(0, 80)) {
      const ex = exercise("algFractions", level, seed, w);
      const v = check(ex, plainOf(ex.q), w);
      assert.equal(v.ok, false, ex.q);
      // Two fractions joined by + or −, or one not cut down, is the right value in the wrong form.
      if (!/\\times|\\div/.test(ex.q)) assert.ok(v.close && v.why, `${ex.q}: ${JSON.stringify(v)}`);
    }
  const mono = SEEDS.map((s) => exercise("algFractions", 1, s, w)).find((ex) => /x\^\{\d\}\}\{/.test(ex.q))!;
  const [top, bottom] = mono.plain.split("/");
  assert.equal(check(mono, `3*${top}/(3*${bottom})`, w).why, w.reasons.notLowest);
  assert.equal(check(mono, `(1/${bottom})*${top}`, w).ok, true, "a fraction in front is cut down too");
});

test("formulae: the subject satisfies the formula, and the substitution is worked out", () => {
  for (const level of LEVELS) {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const q = formulaQuestion(rng(seed), level);
      seen.add(q.q);
      if (q.kind === "substitute") {
        const env = Object.fromEntries(q.vars.given.split(", ").map((kv) => kv.split(" = ")).map(([k, v]) => [k, Number(v)]));
        const [lhs, rhs] = plainOf(q.q).replace(/\\pi/g, "pi").split(" = ");
        assert.equal(lhs, q.vars.s);
        assert.ok(Math.abs(evalE(parseE(rhs, Object.keys(env)), 0, env) - q.v!) < 1e-9, `${q.q} with ${q.vars.given}`);
        assert.ok(Number.isInteger(q.v));
        continue;
      }
      // Put the answer back in for the subject: the two sides agree.
      const others = q.letters.filter((l) => l !== q.vars.s);
      const sides = plainOf(q.q).replace(/\\pi/g, "pi").replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)").replace(/\\sqrt\(/g, "sqrt(").split(" = ");
      for (const [i, base] of [[0, 1.3], [1, 2.2], [2, 0.7]] as const) {
        const env: Record<string, number> = Object.fromEntries(others.map((l, j) => [l, base + 0.9 * j + (q.vars.s === "a" && l === "c" ? 9 : 0)]));
        env[q.vars.s] = evalE(parseE(q.ans, others), env.x ?? 0, env);
        const at = (side: string) => evalE(parseE(side, q.letters), env.x ?? 0, env);
        assert.ok(Number.isFinite(env[q.vars.s]), `${q.q}: ${q.ans} (${i})`);
        assert.ok(Math.abs(at(sides[0]) - at(sides[1])) < 1e-9 * Math.max(1, Math.abs(at(sides[0]))), `${q.q}: ${q.vars.s} = ${q.ans}`);
      }
    }
    assert.ok(seen.size >= (level === 1 ? 9 : level === 2 ? 6 : 7), `level ${level}: ${seen.size} formulae`);
  }
});

test("practice: every level reads in every language, takes its own answer and names its slips", () => {
  for (const words of [en, ka, ru])
    for (const skill of ["algFractions", "formulae"] as const)
      for (const level of LEVELS)
        for (let seed = 1; seed <= 60; seed++) {
          const ex = exercise(skill, level, seed, words.pracWords);
          assert.ok(ex.prompt && !/\{\w+\}/.test(ex.prompt), ex.prompt);
          assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${skill} ${level} #${seed}: ${ex.q} ${ex.plain}`);
          for (const t of trapInputs(ex)) {
            const v = check(ex, t.input, words.pracWords);
            assert.equal(v.mistake, t.id, `${skill} ${level} #${seed}: ${t.input}`);
            assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
          }
        }
});
