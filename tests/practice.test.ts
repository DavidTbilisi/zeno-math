// Practice: every generated question accepts its own answer and rejects a wrong one, answers in other forms are
// judged fairly (equivalent expressions, any order of roots, decimal commas) and wrong forms are named; every worked
// solution renders; worksheets are the same for the same seed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ALL_SKILLS, check, exercise, LEVELS, renderPractice, renderSteps, type Exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { parseE, tex } from "../src/math/expr.ts";

const w = en.pracWords;

/** A typed answer that must be marked wrong. */
function wrong(ex: Exercise): string {
  const a = ex.answer;
  switch (a.k) {
    case "num":
      return String(a.v + 1);
    case "set":
      return [a.vs[0] + 1, ...a.vs.slice(1)].join("; ");
    case "tuple":
      return [a.vs[0] + 1, a.vs[1]].join("; ");
    case "expr":
      return `${ex.plain.replace(/\+\s*C$/, "")} + x`;
    case "primes":
      return `${ex.plain} * 2`;
  }
}

test("every question accepts its answer and rejects a wrong one", () => {
  for (const skill of ALL_SKILLS)
    for (const level of LEVELS)
      for (let seed = 1; seed <= 60; seed++) {
        const ex = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${ex.q || ex.prompt} → ${ex.plain}`;
        assert.ok(ex.prompt && ex.show && ex.plain, where);
        assert.deepEqual(check(ex, ex.plain, w), { ok: true }, where);
        assert.equal(check(ex, wrong(ex), w).ok, false, `${where} accepted ${wrong(ex)}`);
        // The same seed gives the same question.
        assert.equal(exercise(skill, level, seed, w).q, ex.q, where);
      }
});

/** The first question of a skill and level that matches. */
function find(skill: (typeof ALL_SKILLS)[number], level: 1 | 2 | 3, ok: (ex: Exercise) => boolean): Exercise {
  for (let seed = 1; seed < 5000; seed++) {
    const ex = exercise(skill, level, seed, w);
    if (ok(ex)) return ex;
  }
  throw new Error(`no ${skill} question found`);
}

test("answers in other forms", () => {
  const frac = find("fractions", 1, (ex) => ex.answer.k === "num" && !Number.isInteger(ex.answer.v * 2) && ex.answer.v < 1);
  const [n, d] = frac.plain.split("/").map(Number);
  assert.equal(check(frac, `${2 * n}/${2 * d}`, w).why, w.reasons.notLowest, "not in lowest terms");
  assert.equal(check(frac, `${n} / ${d}`, w).ok, true, "spaces");

  const half = find("fractions", 1, (ex) => ex.plain === "1/2");
  assert.equal(check(half, "0.5", w).ok, true, "decimal");
  assert.equal(check(half, "0,5", w).ok, true, "decimal comma");

  const quad = find("quadratic", 1, (ex) => ex.answer.k === "set" && ex.answer.vs[0] < 0 && ex.answer.vs[1] > 0);
  if (quad.answer.k !== "set") throw new Error();
  const [r1, r2] = quad.answer.vs;
  for (const s of [`${r2}; ${r1}`, `x = ${r1}, x = ${r2}`, `x=${r2}; x=${r1}`, `${r1} and ${r2}`, `x = ${r1} or x = ${r2}`, `${r1} или ${r2}`])
    assert.equal(check(quad, s, w).ok, true, s);
  // Exact roots: the bracket closing sqrt(3) belongs to the root, not to the list; ± gives both.
  const surdRoots = find("quadratic", 3, (ex) => ex.plain === "-7.464; -0.536");
  for (const s of ["-4 - 2sqrt(3); -4 + 2sqrt(3)", "(-4 + 2sqrt(3); -4 - 2sqrt(3))", "-4 ± 2sqrt(3)", "x = -4 +- 2sqrt(3)", "[-7.464, -0.536]"])
    assert.equal(check(surdRoots, s, w).ok, true, s);
  assert.equal(check(surdRoots, "-4 ± 3sqrt(2)", w).ok, false);
  assert.equal(check(quad, String(r1), w).why, w.reasons.count.replace("{n}", "2"), "one root missing");

  const fac = find("factor", 1, (ex) => /^\(x [+-] \d\)\(x [+-] \d\)$/.test(ex.plain));
  const [f1, f2] = fac.plain.match(/\([^)]*\)/g)!;
  assert.equal(check(fac, `${f2}${f1}`, w).ok, true, "factors in the other order");
  assert.equal(check(fac, `${f2} * ${f1}`, w).ok, true, "with ×");
  const expanded = exercise("factor", 1, fac.seed, w).q.replace(/\s/g, "").replace(/\^\{?2\}?/, "^2");
  assert.equal(check(fac, expanded, w).why, w.reasons.notFactored, "the expanded form is not factorised");

  const fac3 = find("factor", 3, (ex) => /^\d\(/.test(ex.plain));
  const k = Number(fac3.plain[0]);
  const [g1, g2] = fac3.plain.slice(1).match(/\([^)]*\)/g)!;
  const inner = g1.match(/\(x ([+-]) (\d+)\)/)!;
  const scaled = `(${k}x ${inner[1]} ${k * Number(inner[2])})${g2}`;
  assert.equal(check(fac3, scaled, w).why, w.reasons.notFactored, `${scaled}: a common factor left in a bracket`);

  const exp = find("expand", 1, () => true);
  assert.equal(check(exp, exp.q.replace(/\\left|\\right/g, "").replace(/\s/g, ""), w).why, w.reasons.notExpanded, "still in brackets");

  const integ = find("integrate", 1, () => true);
  assert.equal(check(integ, integ.plain.replace(/\+ C$/, ""), w).ok, true, "without + C");
  assert.equal(check(integ, `${integ.plain.replace(/\+ C$/, "")} + 7`, w).ok, true, "any constant");

  const line = find("line", 1, () => true);
  assert.equal(check(line, line.plain.replace(/^y = /, ""), w).ok, true, "without y =");

  const surd = find("surds", 1, () => true);
  const [, kk, m] = surd.plain.match(/^(\d+)sqrt\((\d+)\)$/)!;
  assert.equal(check(surd, `${kk}√${m}`, w).ok, true, "√ sign");
  assert.equal(check(surd, `sqrt(${Number(kk) ** 2 * Number(m)})`, w).why, w.reasons.notSimplified, "not simplified");
  const rat = find("surds", 3, (ex) => ex.q.startsWith("\\frac{") && !ex.q.includes("-"));
  const [, a, b] = rat.q.match(/\\frac\{(\d+)\}\{\\sqrt\{(\d+)\}\}/)!;
  assert.equal(check(rat, `${a}/sqrt(${b})`, w).why, w.reasons.notSimplified, "root left in the denominator");

  const primes = find("primes", 2, (ex) => ex.plain.includes("^"));
  const flat = primes.plain.replace(/(\d+)\^(\d+)/g, (_, p, e) => Array(Number(e)).fill(p).join(" * "));
  assert.equal(check(primes, flat, w).ok, true, "repeated primes");
  assert.equal(check(primes, flat.replace(/ \* /g, "·"), w).ok, true, "with ·");

  const sim = find("simultaneous", 1, (ex) => ex.answer.k === "tuple" && ex.answer.vs[0] !== ex.answer.vs[1]);
  if (sim.answer.k !== "tuple") throw new Error();
  const [x, y] = sim.answer.vs;
  assert.equal(check(sim, `y = ${y}; x = ${x}`, w).ok, true, "named, other order");
  assert.equal(check(sim, `(${x}; ${y})`, w).ok, true, "as a point");
  assert.equal(check(sim, `(${y}; ${x})`, w).ok, false, "swapped");

  const tri = find("righttri", 1, () => true);
  assert.equal(check(tri, String(Math.round(Number(tri.plain))), w).ok, Math.abs(Math.round(Number(tri.plain)) - Number(tri.plain)) < 0.0051, "rounding");
  assert.equal(check(tri, (Number(tri.plain) + 0.03).toFixed(2), w).why, w.reasons.rounding, "nearly");

  const pct = find("percent", 2, () => true);
  assert.equal(check(pct, pct.plain.replace("%", ""), w).ok, true, "without %");

  assert.equal(check(half, "", w).why, w.reasons.empty);
  assert.match(check(half, "1/2 +", w).why ?? "", /1\/2 \+/);
});

test("every worked solution renders", async () => {
  for (const skill of ALL_SKILLS)
    for (const level of LEVELS) {
      const ex = exercise(skill, level, 11, w);
      assert.ok(ex.solution || ex.steps, `${skill} ${level}: no solution`);
      const r = ex.solution ? await renderSolution(ex.solution, en) : renderSteps(ex.steps!);
      assert.ok(r.width > 0 && !r.svg.includes("NaN"), `${skill} ${level}`);
    }
});

test("worksheets: same seed, same sheet; any language", () => {
  const spec = { area: "algebra" as const, skill: "mixed" as const, level: 2 as const, seed: 42, count: 10, answers: true };
  const a = renderPractice(spec, w);
  assert.equal(renderPractice(spec, w).svg, a.svg);
  assert.notEqual(renderPractice({ ...spec, seed: 43 }, w).svg, a.svg);
  assert.ok(renderPractice({ ...spec, answers: false }, w).height < a.height, "the answer key takes room");
  const r = renderPractice(spec, ru.pracWords);
  assert.ok(r.svg.includes("Ответы"));
});

test("vector answers match the vectors in the question", () => {
  const vecs = (s: string) => [...s.matchAll(/\(([^()]*)\)/g)].map((m) => m[1].split(", ").map(Number));
  const dot = (a: number[], b: number[]) => a.reduce((t, x, i) => t + x * b[i], 0);
  for (let seed = 1; seed <= 80; seed++) {
    for (const level of LEVELS) {
      const ex = exercise("dotangle", level, seed, w);
      const [a, b] = vecs(ex.prompt);
      const want = level === 1 ? dot(a, b) : (Math.acos(dot(a, b) / Math.hypot(...a) / Math.hypot(...b)) * 180) / Math.PI;
      assert.equal(check(ex, String(level === 1 ? want : Math.round(want * 100) / 100), w).ok, true, `${ex.prompt} → ${want}`);
    }
    const len = exercise("vectors", 2, seed, w);
    const [A, B] = vecs(len.prompt);
    assert.equal(check(len, String(Math.hypot(...A.map((x, i) => B[i] - x))), w).ok, true, len.prompt);
    // Perpendicular: put k into both vectors and the dot product is 0.
    const perp = exercise("vectors", 3, seed, w);
    const k = Number(perp.plain.split("/")[0]) / Number(perp.plain.split("/")[1] ?? 1);
    const [p, q] = [...perp.prompt.matchAll(/\(([^()]*)\)/g)].map((m) => m[1].split(", ").map((x) => (x === "k" ? k : Number(x))));
    assert.ok(Math.abs(dot(p, q)) < 1e-9, `${perp.prompt}: k = ${perp.plain}`);
  }
});

test("a negative leading coefficient is written in front of its term, in every question that has one", () => {
  // "-3x^3" parses as (−1·3)·x³; it used to come out as "x^{3} -3", in about one question in forty.
  assert.equal(tex(parseE("-3x^3 - 2x^2 + 9")), "-3 x^{3} - 2 x^{2} + 9");
  assert.equal(tex(parseE("-5x - 6")), "-5 x - 6");
  for (const [skill, level] of [["differentiate", 1], ["functions", 1], ["functions", 2], ["stationary", 1], ["tangent", 1], ["integrate", 1], ["expand", 3]] as const)
    for (let seed = 1; seed <= 100; seed++) {
      const ex = exercise(skill, level, seed, w);
      for (const s of [ex.q, ex.show]) assert.doesNotMatch(s, /(?:\^\{\d+\}|(?<![\\a-z])x) -\d/, `${skill} ${level} seed ${seed}: ${s}`);
    }
});
