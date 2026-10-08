// Mistakes the checker names: each one is recognised in the questions that can produce it, still counts as wrong, and
// never shadows a right answer or a form message; the inequality reader and standard form are read as people type them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { verdictOf } from "../src/learner.ts";
import { MISTAKES, type MistakeId } from "../src/math/mistakes.ts";
import { check, exercise, LEVELS, preview, readIneq, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;

/** Where each mistake can happen. */
const WHERE: Record<Exclude<MistakeId, "sign">, [SkillId, (1 | 2 | 3)[]]> = {
  addAcross: ["fractions", [1, 2]],
  flipFirst: ["fractions", [2, 3]],
  squareTerms: ["expand", [3]],
  noMiddle: ["expand", [1]],
  negPower: ["indices", [1, 3]],
  powTimes: ["indices", [2]],
  subNeg: ["integers", [2, 3]],
  leftToRight: ["order", [1, 2, 3]],
  mulBeforePow: ["order", [2, 3]],
  grouped: ["order", [1]],
  truncated: ["rounding", [1, 2]],
  placeLost: ["rounding", [1, 2]],
  doubleRound: ["rounding", [1, 2]],
  fullUnit: ["rounding", [3]],
  noFlip: ["inequalities", [2, 3]],
  boundary: ["inequalities", [1, 2, 3]],
};

test("every mistake is named in a question that can produce it, and still counts as wrong", () => {
  for (const id of MISTAKES) {
    if (id === "sign") continue;
    const [skill, levels] = WHERE[id];
    let found = false;
    for (const level of levels)
      for (let seed = 1; seed <= 400 && !found; seed++) {
        const ex = exercise(skill, level, seed, w);
        const trap: { id: MistakeId; input: string } | undefined = trapInputs(ex).find((t) => t.id === id);
        if (!trap) continue;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id, `${skill} ${level} #${seed}: ${ex.q || ex.prompt} typed ${trap.input}`);
        assert.equal(v.ok, false);
        assert.equal(v.why, undefined, "a mistake isn't sent back like a form slip");
        assert.equal(verdictOf(v), "wrong", "it counts as a miss");
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${id}: every number in the hint is filled in: ${v.hint}`);
        found = true;
      }
    assert.ok(found, `no question has a ${id} trap`);
  }
});

test("right size, wrong sign: for numbers, roots and expressions", () => {
  const times = exercise("times", 1, 5, w);
  assert.equal(check(times, `-${times.plain}`, w).mistake, "sign");
  const quad = (() => {
    for (let seed = 1; ; seed++) {
      const ex = exercise("quadratic", 1, seed, w);
      if (ex.answer.k === "set" && ex.answer.vs.some((v) => v !== 0) && ex.answer.vs.reduce((s, v) => s + v, 0) !== 0) return ex;
    }
  })();
  if (quad.answer.k !== "set") throw new Error("unreachable");
  assert.equal(check(quad, quad.answer.vs.map((v) => -v).join("; "), w).mistake, "sign", "roots all negated: (x − 3)(x + 2) read as 3 and −2 swapped round");
  const diff = exercise("differentiate", 1, 4, w);
  assert.equal(check(diff, `-(${diff.plain})`, w).mistake, "sign");
  // Zero has no wrong sign.
  const zero = { ...times, answer: { k: "num" as const, v: 0, tol: 1e-9 } };
  assert.equal(check(zero, "-0", w).ok, true);
});

test("no trap is the right answer, and every trap is named, in every question that has one", () => {
  const skills: SkillId[] = ["fractions", "expand", "indices", "integers", "order", "rounding", "inequalities"];
  for (const skill of skills)
    for (const level of LEVELS)
      for (let seed = 1; seed <= 150; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, "every trap can be typed");
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          const where = `${skill} ${level} #${seed}: ${ex.q || ex.prompt} → ${ex.plain}; ${t.id} ${t.input}`;
          assert.equal(v.ok, false, where);
          assert.ok(v.mistake, where);
        }
      }
});

test("a form message or a plain miss is not dressed up as a mistake", () => {
  const frac = exercise("fractions", 1, 3, w);
  const [n, d] = frac.plain.split("/").map(Number);
  if (d) assert.deepEqual(check(frac, `${2 * n}/${2 * d}`, w), { ok: false, close: true, why: w.reasons.notLowest });
  const times = exercise("times", 2, 9, w);
  assert.deepEqual(check(times, String(Number(times.plain) + 1), w), { ok: false });
});

test("a number asked for, an expression given: sent back, not marked", () => {
  const lin = exercise("linear", 1, 2, w);
  const v = check(lin, "x + 3", w);
  assert.equal(v.why, w.reasons.notNumber.replace("{s}", "x + 3"));
  assert.equal(verdictOf(v), "form");
  assert.match(check(lin, "x +", w).why ?? "", /Couldn't read/);
});

test("inequalities are read however they are written", () => {
  const ends = (s: string) => readIneq(s);
  assert.deepEqual(ends("x >= 4"), { lo: { v: 4, closed: true }, hi: null });
  assert.deepEqual(ends("x ≥ 4"), ends("x >= 4"));
  assert.deepEqual(ends("4 <= x"), ends("x >= 4"));
  assert.deepEqual(ends("4 ≤ x"), ends("x >= 4"));
  assert.deepEqual(ends("x < -2"), { lo: null, hi: { v: -2, closed: false } });
  assert.deepEqual(ends("x < −2"), ends("x < -2"));
  assert.deepEqual(ends("-1 < x <= 3"), { lo: { v: -1, closed: false }, hi: { v: 3, closed: true } });
  assert.deepEqual(ends("3 >= x > -1"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("(-1, 3]"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("(-1; 3]"), ends("-1 < x <= 3"));
  assert.deepEqual(ends("[4, ∞)"), ends("x >= 4"));
  assert.deepEqual(ends("(-inf, -2)"), ends("x < -2"));
  assert.deepEqual(ends("x > 2,5"), { lo: { v: 2.5, closed: false }, hi: null }, "a decimal comma");
  assert.deepEqual(ends("x > 1/2"), { lo: { v: 0.5, closed: false }, hi: null });
  for (const bad of ["x = 4", "4", "x", "1 < x > 3", "(1, 2, 3)", "(-∞, ∞)", "x > y"]) assert.equal(ends(bad), null, bad);

  const ex = exercise("inequalities", 1, 1, w);
  assert.equal(check(ex, ex.plain.replace(">=", "≥").replace("<=", "≤"), w).ok, true);
  assert.equal(check(ex, ex.plain.replace(/^x (\S+) (\S+)$/, (_, r, v) => `${v} ${{ "<": ">", "<=": ">=", ">": "<", ">=": "<=" }[r as "<"]} x`), w).ok, true, "the number first");
  assert.equal(check(ex, "4", w).why, w.reasons.notIneq);
});

test("standard form: e-notation and × read where it is asked for, and the form is checked", () => {
  const find = () => {
    for (let seed = 1; ; seed++) {
      const ex = exercise("rounding", 2, seed, w);
      if (ex.format === "standard") return ex;
    }
  };
  const ex = find();
  const [m, e] = ex.plain.split("*10^");
  assert.equal(check(ex, ex.plain, w).ok, true);
  assert.equal(check(ex, `${m}e${e}`, w).ok, true);
  assert.equal(check(ex, `${m} × 10^(${e})`, w).ok, true);
  assert.equal(check(ex, `${m}x10^${e}`, w).ok, true);
  const value = Number(m) * 10 ** Number(e);
  assert.deepEqual(check(ex, String(value), w), { ok: false, close: true, why: w.reasons.notStandard }, "the right value, not in standard form");
  assert.equal(check(ex, `${Number(m) * 10}*10^${Number(e) - 1}`, w).why, w.reasons.notStandard, "a number of 10 or more in front");
  assert.equal(check(ex, `-${m}e${e}`, w).mistake, "sign", "the wrong sign, in e-notation");
  // Tiny answers are compared relatively: within 10⁻⁹ of 7.31 × 10⁻¹² is not close enough.
  for (let seed = 1; seed <= 400; seed++) {
    const q = exercise("rounding", 2, seed, w);
    if (q.format !== "standard" || q.answer.k !== "num" || q.answer.v > 1e-6) continue;
    const [qm, qe] = q.plain.split("*10^");
    assert.equal(check(q, `9*10^${Number(qe) + 2}`, w).ok, false, `${q.plain}: 9*10^${Number(qe) + 2}`);
    assert.equal(check(q, `-${qm}*10^${qe}`, w).ok, false);
    assert.equal(check(q, q.plain, w).ok, true);
  }
});

test("the preview reads ∞ and inf as infinity, not as the variable", () => {
  const ex = exercise("inequalities", 1, 1, w);
  assert.equal(preview(ex, "[4, inf)"), preview(ex, "x >= 4"));
  assert.equal(preview(ex, "(-infinity, 3]"), preview(ex, "x <= 3"));
  assert.equal(preview(ex, "y > 2"), "y > 2");
});

test("order of operations: never a ÷ b(c + d), and rounding lands on the unit and within half of it", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) assert.doesNotMatch(exercise("order", level, seed, w).q, /\\div \d+\s*\(/);
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("rounding", 1, seed, w);
    const m = ex.prompt.match(/^Round (\S+) to the nearest (\d+)\.$/);
    if (!m || ex.answer.k !== "num") continue;
    const [n, unit] = [Number(m[1]), Number(m[2])];
    assert.equal(ex.answer.v % unit, 0, ex.prompt);
    assert.ok(Math.abs(ex.answer.v - n) < unit / 2, ex.prompt);
  }
});

test("every mistake is explained in every language", () => {
  for (const words of [en, ru, ka].map((l) => l.pracWords))
    for (const id of MISTAKES) assert.ok(words.mistakes[id].length > 20, `${id}`);
});
