// The triangle inequality and power of a point: the right set, range, count, perimeter and angle agree with the
// inequality; chords, secants and tangents agree with the products and with the circle theorems tool's own working;
// every slip gives another answer, and the questions read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { renderEuclid } from "../src/math/euclid.ts";
import { chordsQuestion, hardSidesQuestion, pickQuestion, rangeQuestion, secantsQuestion, tangentQuestion, type SecantQuestion } from "../src/math/sidesAndSecants.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const closes = ([a, b, c]: number[]) => a + b > c && b + c > a && a + c > b;

test("which lengths make a triangle: exactly one set, and one lies flat", () => {
  for (const seed of SEEDS) {
    const q = pickQuestion(rng(seed));
    if (q.kind !== "pick") throw new Error(q.kind);
    assert.deepEqual(q.sets.map((s, i) => (closes(s) ? i : -1)).filter((i) => i >= 0), [q.right]);
    const [a, b, c] = q.sets[q.flat];
    assert.equal(a + b, c);
    assert.notEqual(q.flat, q.right);
  }
});

test("the third side: its range, its whole lengths, an isosceles perimeter and the largest angle", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const m = rangeQuestion(rng(seed));
    kinds.add(m.kind);
    if (m.kind === "range") {
      assert.ok(closes([m.a, m.b, (m.range.lo + m.range.hi) / 2]));
      assert.ok(!closes([m.a, m.b, m.range.lo]) && !closes([m.a, m.b, m.range.hi]));
    } else if (m.kind === "count") {
      const { a, b } = m.vars;
      const whole = Array.from({ length: a + b }, (_, x) => x).filter((x) => x > 0 && closes([a, b, x]));
      assert.equal(m.v, whole.length);
      assert.notEqual(m.trap.v, m.v);
    } else throw new Error(m.kind);

    const h = hardSidesQuestion(rng(seed));
    kinds.add(h.kind);
    if (h.kind === "isosceles") {
      const { a, b } = h.vars;
      assert.ok(!closes([a, a, b]) && closes([b, b, a]));
      assert.equal(h.v, 2 * b + a);
      assert.equal(h.trap.v, 2 * a + b);
    } else if (h.kind === "largest") {
      const { a, b, c } = h.vars;
      assert.ok(closes([a, b, c]));
      // The largest angle by the cosine rule.
      const cos = [(b * b + c * c - a * a) / (2 * b * c), (a * a + c * c - b * b) / (2 * a * c), (a * a + b * b - c * c) / (2 * a * b)];
      assert.equal(h.right, cos.indexOf(Math.min(...cos)));
      assert.deepEqual(h.beside.length, 2);
      assert.ok(!h.beside.includes(h.right));
    } else throw new Error(h.kind);
  }
  assert.deepEqual([...kinds].sort(), ["count", "isosceles", "largest", "range"]);
});

test("power of a point: the products hold, and the circle theorems tool finds the same length", () => {
  const sane = (q: SecantQuestion, holds: (g: Record<string, number>) => boolean) => {
    const g = Object.fromEntries([...q.src.matchAll(/(\w+) = (\d+)/g)].map((m) => [m[1], Number(m[2])]));
    g[q.ask] = q.v;
    assert.ok(holds(g), `${q.src}; ${q.ask} = ${q.v}`);
    assert.ok(Number.isInteger(q.v) && q.v > 0);
    for (const t of q.traps) assert.ok(Math.abs(t.v - q.v) > 0.01, t.id);
    const svg = renderEuclid({ topic: "circle", src: `${q.src}; find ${q.ask}` }, en.euclidWords).svg;
    assert.ok(!/NaN|undefined/.test(svg));
  };
  for (const seed of SEEDS.slice(0, 120)) {
    sane(chordsQuestion(rng(seed)), (g) => g.AE * g.EB === g.CE * g.ED);
    sane(secantsQuestion(rng(seed)), (g) => g.PA * (g.PA + g.AB) === g.PC * (g.PC + g.CD));
    sane(tangentQuestion(rng(seed)), (g) => g.PT * g.PT === g.PA * (g.PA + g.AB));
  }
});

test("practice: every level reads in every language and takes its own answer", () => {
  for (const words of [en, ka, ru])
    for (const skill of ["triangleInequality", "powerPoint"] as const)
      for (const level of LEVELS)
        for (let seed = 1; seed <= 60; seed++) {
          const ex = exercise(skill, level, seed, words.pracWords);
          assert.ok(ex.prompt && !/\{\w+\}/.test(ex.prompt), ex.prompt);
          assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${skill} ${level} #${seed}: ${ex.prompt} ${ex.plain}`);
          if (skill === "powerPoint") assert.ok(ex.pic, "the figure is drawn");
        }
});

test("the geometry lab shows why three lengths make no triangle", async () => {
  const { make, wontClose } = await import("../src/math/geoLab.ts");
  assert.deepEqual(wontClose([3, 9, 5]), { a: 3, b: 5, c: 9, gap: 1 });
  assert.deepEqual(wontClose([4, 3, 7]), { a: 3, b: 4, c: 7, gap: 0 }, "flat: they meet lying down");
  assert.equal(wontClose([4, 5, 6]), null);
  // Exactly when the lab refuses to build it.
  for (const s of [[3, 9, 5], [4, 3, 7], [4, 5, 6], [10, 1, 10]]) assert.equal("problem" in make("sss", s), wontClose(s) !== null, s.join(", "));
});
