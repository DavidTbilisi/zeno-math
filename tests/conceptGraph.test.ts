// A concept's inside as a graph (fractions): the graph is whole and its needs acyclic, a question is read for the ideas
// it needs, the generator shows every idea and connection a question can ask for and more of them at once as the level
// rises, each mistake names a gap the question it happens on uses, and progress takes every idea and most of the
// connections. The atom tests: which ideas the generator tests alone, and, on simulated learners whose atoms are
// known, a smooth curve and transfer for one atom, a broken curve for a harder atom arriving later, and no transfer
// between two atoms asked in turn (whose curve is smooth: only the transfer test sees them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise, LEVELS, type Exercise } from "../src/math/practice.ts";
import {
  complexity, edgeId, FRACTIONS, FRACTIONS_GAPS, fractionsUses, learningCurve, needsOf, progressOf, testedAlone, transfers, type Attempt, type EdgeId,
} from "../src/model/conceptGraph.ts";
import { rng } from "../src/model/random.ts";

const w = en.pracWords;
const asked = (op: string, a: string, b: string) => fractionsUses({ solution: { kind: "model", spec: { type: "fracop", op, a, b } } } as Exercise);
const generated = LEVELS.map((L) => Array.from({ length: 400 }, (_, i) => fractionsUses(exercise("fractions", L, i + 1, w))));

test("the fractions graph is whole: every edge joins known ideas, needs have no cycle, everything needs part", () => {
  const nodes = Object.keys(FRACTIONS.nodes);
  assert.deepEqual(complexity(FRACTIONS), { nodes: 10, edges: 13, total: 23 });
  for (const [a, b] of FRACTIONS.edges) assert.ok(nodes.includes(a) && nodes.includes(b), `${a}→${b}`);
  for (const n of nodes) {
    assert.ok(!needsOf(FRACTIONS, n as never).has(n as never), `${n} needs itself`);
    assert.equal(needsOf(FRACTIONS, n as never).has("part"), n !== "part", n);
  }
  assert.deepEqual([...needsOf(FRACTIONS, "divide")].sort(), ["multiply", "part", "reciprocal"]);
});

test("a question is read for the ideas it needs and exercises the connections between them", () => {
  // 1/4 + 1/4 = 2/4: same bottoms, but the result needs simplifying.
  assert.deepEqual(asked("+", "1/4", "1/4").nodes, ["part", "equivalent", "lowest", "addSub"]);
  // 1/3 + 1/4 = 7/12: a common denominator, nothing to simplify.
  assert.deepEqual(asked("+", "1/3", "1/4"), {
    nodes: ["part", "equivalent", "commonDenom", "addSub"],
    edges: ["part→equivalent", "equivalent→commonDenom", "part→addSub", "commonDenom→addSub"],
  });
  // 2/3 × 4/5 = 8/15: one step.
  assert.deepEqual(asked("×", "2/3", "4/5").nodes, ["part", "multiply"]);
  // 1 1/2 ÷ 3/4 = 3/2 × 4/3 = 12/6: everything but adding, and never back to a mixed number.
  const div = asked("÷", "1 1/2", "3/4");
  assert.deepEqual(div.nodes, ["part", "equivalent", "lowest", "multiply", "reciprocal", "divide", "toImproper"]);
  assert.ok(div.edges.includes("toImproper→multiply") && div.edges.includes("reciprocal→divide") && !div.edges.includes("toImproper→addSub"));
  // 3/4 − 3/4 = 0 has nothing to simplify.
  assert.ok(!asked("-", "3/4", "3/4").nodes.includes("lowest"));
});

test("the generator shows every idea and connection but toMixed, and asks for more of them at once as the level rises", () => {
  const all = generated.flat();
  const nodes = new Set(all.flatMap((u) => u.nodes)), edges = new Set(all.flatMap((u) => u.edges));
  assert.deepEqual([...nodes].sort(), Object.keys(FRACTIONS.nodes).filter((n) => n !== "toMixed").sort());
  assert.deepEqual([...edges].sort(), FRACTIONS.edges.map(edgeId).filter((e) => e !== "part→toMixed").sort());
  const mean = generated.map((qs) => qs.reduce((s, u) => s + u.nodes.length, 0) / qs.length);
  assert.ok(mean[0] < mean[1] && mean[1] < mean[2], `mean ideas per question ${mean}`);
});

test("each fractions mistake names a gap that every question it can happen on uses", () => {
  for (const [id, gap] of Object.entries(FRACTIONS_GAPS)) {
    let seen = 0;
    for (const L of LEVELS)
      for (let seed = 1; seed <= 200; seed++) {
        const ex = exercise("fractions", L, seed, w);
        if (!ex.answer.traps?.some((t) => t.id === id)) continue;
        const u = fractionsUses(ex);
        assert.ok((u.nodes as string[]).includes(gap!) || u.edges.includes(gap as EdgeId), `${id} on ${ex.q}`);
        seen++;
      }
    assert.ok(seen > 0, id);
  }
});

test("a concept is mastered with every idea and at least the given share of the connections", () => {
  const all = { nodes: new Set(Object.keys(FRACTIONS.nodes)), edges: new Set(FRACTIONS.edges.map(edgeId)) };
  assert.deepEqual(progressOf(FRACTIONS, all), { nodes: 1, edges: 1, mastered: true });
  // Two connections short (11 of 13, 0.85) is enough at the default 0.8, not at 0.9.
  const short = { nodes: all.nodes, edges: new Set([...all.edges].slice(2)) };
  assert.equal(progressOf(FRACTIONS, short).mastered, true);
  assert.equal(progressOf(FRACTIONS, short, 0.9).mastered, false);
  // One idea short is never enough, whatever the connections.
  const noMixed = { nodes: new Set([...all.nodes].filter((n) => n !== "toMixed")), edges: all.edges };
  assert.deepEqual(progressOf(FRACTIONS, noMixed), { nodes: 9 / 10, edges: 1, mastered: false });
});

test("test 1: the generator tests only the three operations alone; every step inside them comes with another idea", () => {
  const alone = testedAlone(FRACTIONS, generated.flat());
  assert.deepEqual(Object.keys(alone).filter((n) => alone[n as keyof typeof alone]).sort(), ["addSub", "divide", "multiply"]);
  // A question asking for a lowest-terms fraction by itself would test lowest alone.
  assert.equal(testedAlone(FRACTIONS, [{ nodes: ["part", "equivalent", "lowest"], edges: [] }]).lowest, true);
});

/**
 * Simulated learners on one idea x asked in two forms, A and B. Each atom is known or not, learnt with chance 0.25
 * after a question that needs it; a question is right with chance 0.9 when its atom is known and 0.2 when not. With
 * one atom both forms need it; with two, form A needs one and B the other.
 */
function learners(seed: number, atoms: 1 | 2, formAt: (i: number, next: () => number) => "A" | "B"): Attempt[] {
  const r = rng(seed);
  const out: Attempt[] = [];
  for (let s = 0; s < 300; s++) {
    const known = { A: r.next() < 0.1, B: r.next() < 0.1 };
    for (let i = 0; i < 12; i++) {
      const form = formAt(i, r.next), atom = atoms === 1 ? "A" : form;
      out.push({ student: `s${s}`, nodes: ["x"], right: r.next() < (known[atom] ? 0.9 : 0.2), form });
      if (!known[atom] && r.next() < 0.25) known[atom] = true;
    }
  }
  return out;
}
const inTurn = (_i: number, next: () => number) => (next() < 0.5 ? "A" : "B");
const laterHarder = (i: number) => (i < 6 ? "A" : "B");

test("tests 2 and 3 on learners whose atoms are known: one atom passes both, two atoms fail one each", () => {
  for (const seed of [1, 2, 3]) {
    const one = learners(seed, 1, inTurn), two = learners(seed, 2, inTurn), later = learners(seed, 2, laterHarder);
    assert.ok(learningCurve(one, "x").smooth && transfers(one, "x").transfers, `one atom, seed ${seed}`);
    // Two atoms asked in turn: each curve falls, so their sum does too; only the transfer test tells them apart.
    assert.ok(learningCurve(two, "x").smooth && !transfers(two, "x").transfers, `two atoms in turn, seed ${seed}`);
    // The harder atom first asked at the seventh question breaks the curve.
    assert.ok(!learningCurve(later, "x").smooth, `harder atom later, seed ${seed}`);
  }
  // A curve no opportunity of which twenty students reached says nothing.
  const few = learners(1, 1, inTurn).filter((a) => Number(a.student.slice(1)) < 10);
  assert.deepEqual(learningCurve(few, "x").errors, []);
  assert.equal(learningCurve(few, "x").smooth, false);
});
