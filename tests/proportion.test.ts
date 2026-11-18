// Direct and inverse proportion: the answers agree with y = kx and y = k/x (and the powers), every slip gives another
// answer, the graph draws, and the practice questions read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { algebraQuestion, graphSvg, powerQuestion, wordQuestion, type ProportionQuestion } from "../src/math/proportion.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

function sane(q: ProportionQuestion) {
  assert.ok(Number.isFinite(q.v) && q.v > 0, `${q.kind}: ${q.v}`);
  if (!q.frac) assert.ok(Number.isInteger(q.v), `${q.kind}: a whole answer, not ${q.v}`);
  else near(q.frac[0] / q.frac[1], q.v);
  assert.ok(q.traps.length > 0, `${q.kind} has a slip`);
  for (const t of q.traps) assert.ok(Math.abs(t.v - q.v) > 0.02, `${q.kind}: ${t.id} gives the answer`);
  assert.ok(q.steps.length > 0 && q.steps.every((s) => !/NaN|undefined/.test(s)));
}

test("in words: the amount for one (direct) or the product that stays the same (inverse)", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = wordQuestion(rng(seed));
    kinds.add(q.kind);
    sane(q);
    const { n, t, m } = q.vars as Record<string, number>;
    assert.notEqual(n, m);
    if (["books", "dumplings", "fuel"].includes(q.kind)) near(q.v, (t / n) * m);
    else near(q.v, (n * t) / m);
  }
  assert.equal(kinds.size, 6);
});

test("y = kx and y = k/x: from a pair, a table and a graph", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = algebraQuestion(rng(seed));
    kinds.add(q.kind);
    sane(q);
    const { a, b, c } = q.vars as Record<string, number>;
    if (q.kind === "kDirect") near(q.v, a / b);
    if (q.kind === "kInverse") near(q.v, a * b);
    if (q.kind === "direct") near(q.v, (a / b) * c);
    if (q.kind === "inverse") near(q.v, (a * b) / c);
    if (q.kind === "graph") {
      const g = q.graph!;
      near(q.v, g.inverse ? (g.a * g.b) / c : (g.a / g.b) * c);
      assert.ok(!/NaN|undefined/.test(graphSvg(g).body));
    }
    if (q.kind === "table") {
      // The two full columns agree on one kind only, and the missing y follows it.
      const rows = q.q.match(/x & (.*?) \\\\ \\hline y & (.*?) \\end/)!;
      const xs = rows[1].split(" & ").map(Number);
      const ys = rows[2].split(" & ");
      const full = xs.map((x, i) => [x, Number(ys[i])]).filter((_, i) => ys[i] !== "?");
      const at = xs[ys.indexOf("?")];
      assert.equal(full.length, 2);
      const direct = full[0][1] / full[0][0] === full[1][1] / full[1][0];
      const inverse = full[0][1] * full[0][0] === full[1][1] * full[1][0];
      assert.ok(direct !== inverse, q.q);
      near(q.v, direct ? (full[0][1] / full[0][0]) * at : (full[0][1] * full[0][0]) / at);
    }
  }
  assert.deepEqual([...kinds].sort(), ["direct", "graph", "inverse", "kDirect", "kInverse", "table"]);
});

test("other forms: x², x³, √x and 1/x², x back from y, y's factor when x is scaled", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = powerQuestion(rng(seed));
    kinds.add(q.kind);
    sane(q);
    const { a, b, c, d, s } = q.vars as Record<string, number>;
    const f = { "x²": (x: number) => x * x, "x³": (x: number) => x ** 3, "√x": Math.sqrt }[q.vars.f as string]!;
    if (q.kind === "power") near(q.v, (a / f(b)) * f(c));
    if (q.kind === "inversePower") near(q.v, (a * b * b) / (c * c));
    if (q.kind === "findX") near(a / (b * b), d / (q.v * q.v));
    if (q.kind === "scaleDirect") near(q.v, f(s));
    if (q.kind === "scaleInverse") near(q.v, 1 / f(s));
  }
  assert.deepEqual([...kinds].sort(), ["findX", "inversePower", "power", "scaleDirect", "scaleInverse"]);
});

test("practice: every level reads in every language and takes its own answer", () => {
  for (const words of [en, ka, ru])
    for (const level of LEVELS)
      for (let seed = 1; seed <= 60; seed++) {
        const ex = exercise("proportion", level, seed, words.pracWords);
        assert.ok(ex.prompt && !/\{\w+\}/.test(ex.prompt), ex.prompt);
        assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${level} #${seed}: ${ex.prompt} ${ex.plain}`);
      }
});
