// A concept's inside as a graph (fractions, and the arithmetic it is built on): the graphs are whole and their needs
// acyclic, a question is read for the ideas it needs, the generators show every idea and connection and more of them
// at once as the level rises, each mistake names a gap the question it happens on uses, progress takes every idea and
// most of the connections, and an arithmetic idea known counts in fractions too. The atom tests: which ideas the
// operations and the forms test alone, and, on simulated learners whose atoms are
// known, a smooth curve and transfer for one atom, a broken curve for a harder atom arriving later, and no transfer
// between two atoms asked in turn (whose curve is smooth: only the transfer test sees them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise, LEVELS, type Exercise } from "../src/math/practice.ts";
import {
  ARITHMETIC, arithmeticUses, complexity, edgeId, FRACTIONS, FRACTIONS_GAPS, fractionsUses, learningCurve, needsOf, progressOf, sharedIdeas, testedAlone, transfers,
  type Attempt, type ConceptGraph, type EdgeId,
} from "../src/model/conceptGraph.ts";
import { rng } from "../src/model/random.ts";

const w = en.pracWords;
const asked = (op: string, a: string, b: string) => fractionsUses({ solution: { kind: "model", spec: { type: "fracop", op, a, b } } } as Exercise);
const exercises = LEVELS.map((L) => Array.from({ length: 400 }, (_, i) => exercise("fractions", L, i + 1, w)));
const generated = exercises.map((qs) => qs.map(fractionsUses));
/** The operations alone, without the questions that ask for one idea by itself. */
const operations = exercises.flat().filter((ex) => !(ex.solution?.spec as { form?: string }).form).map(fractionsUses);
const arithmetic = (["times", "hcf"] as const).flatMap((k) => LEVELS.flatMap((L) => Array.from({ length: 200 }, (_, i) => arithmeticUses(exercise(k, L, i + 1, w)))));
const OWN = Object.keys(FRACTIONS.nodes).filter((n) => !(n in ARITHMETIC.nodes));

test("the graphs are whole: every edge joins known ideas, needs have no cycle, every fractions idea of its own needs part", () => {
  assert.deepEqual(complexity(ARITHMETIC), { nodes: 6, edges: 7, total: 13 });
  assert.deepEqual(complexity(FRACTIONS), { nodes: 16, edges: 29, total: 45 });
  for (const g of [ARITHMETIC, FRACTIONS] as ConceptGraph[]) {
    const nodes = Object.keys(g.nodes);
    for (const [a, b] of g.edges) assert.ok(nodes.includes(a) && nodes.includes(b), `${a}→${b}`);
    for (const n of nodes) assert.ok(!needsOf(g, n as never).has(n as never), `${n} needs itself`);
  }
  for (const n of Object.keys(FRACTIONS.nodes)) assert.equal(needsOf(FRACTIONS, n as never).has("part"), OWN.includes(n) && n !== "part", n);
  assert.deepEqual([...needsOf(FRACTIONS, "divide")].sort(), ["multiply", "multiplyFacts", "part", "reciprocal"]);
  assert.deepEqual([...needsOf(ARITHMETIC, "lcm")].sort(), ["divideExact", "hcf", "multiplyFacts"]);
});

test("fractions is built on arithmetic: every arithmetic idea and edge is in it, and knowing them counts in both", () => {
  assert.deepEqual(sharedIdeas(ARITHMETIC, FRACTIONS), Object.keys(ARITHMETIC.nodes));
  const fractionsEdges = FRACTIONS.edges.map(edgeId);
  assert.ok(ARITHMETIC.edges.map(edgeId).every((e) => fractionsEdges.includes(e)));
  // A student who has every idea and connection the arithmetic questions ask for has mastered arithmetic, and is six
  // ideas of sixteen and seven connections of twenty-nine into fractions without a fractions question.
  const known = { nodes: new Set<string>(arithmetic.flatMap((u) => u.nodes)), edges: new Set(arithmetic.flatMap((u) => u.edges)) };
  assert.deepEqual(progressOf(ARITHMETIC, known), { nodes: 1, edges: 1, mastered: true });
  assert.deepEqual(progressOf(FRACTIONS, known), { nodes: 6 / 16, edges: 7 / 29, mastered: false });
  // The other way: every fractions operation needs some arithmetic, so every such answer is evidence about it.
  assert.ok(operations.length > 500 && operations.every((u) => u.nodes.some((n) => n in ARITHMETIC.nodes)));
});

test("a question is read for the ideas it needs, the arithmetic inside it, and the connections between them", () => {
  // 1/4 + 1/4 = 2/4: same bottoms, tops added as whole numbers, and the result divided by its highest common factor.
  assert.deepEqual(asked("+", "1/4", "1/4").nodes, ["part", "equivalent", "lowest", "addSub", "addWhole", "divideExact", "hcf"]);
  // 1/3 + 1/4 = 4/12 + 3/12 = 7/12: a common denominator from the lowest common multiple, each top scaled, nothing to simplify.
  assert.deepEqual(asked("+", "1/3", "1/4"), {
    nodes: ["part", "equivalent", "commonDenom", "addSub", "addWhole", "multiplyFacts", "lcm"],
    edges: [
      "part→equivalent", "equivalent→commonDenom", "part→addSub", "commonDenom→addSub", "multiplyFacts→lcm",
      "addWhole→addSub", "multiplyFacts→equivalent", "lcm→commonDenom",
    ],
  });
  // 2/3 × 4/5 = 8/15: one step, two times-table facts.
  assert.deepEqual(asked("×", "2/3", "4/5").nodes, ["part", "multiply", "multiplyFacts"]);
  // 2 7/12 × 11/12 = 31/12 × 11/12: 31 × 11 is long multiplication.
  const long = asked("×", "2 7/12", "11/12");
  assert.ok(long.nodes.includes("multiplyLong") && long.edges.includes("multiplyLong→multiply"));
  // 1 1/2 ÷ 3/4 = 3/2 × 4/3 = 12/6: everything but adding fractions, and never back to a mixed number.
  const div = asked("÷", "1 1/2", "3/4");
  assert.deepEqual(div.nodes, ["part", "equivalent", "lowest", "multiply", "reciprocal", "divide", "toImproper", "addWhole", "multiplyFacts", "divideExact", "hcf"]);
  assert.ok(div.edges.includes("toImproper→multiply") && div.edges.includes("reciprocal→divide") && !div.edges.includes("toImproper→addSub"));
  // 3/4 − 3/4 = 0 has nothing to simplify.
  assert.ok(!asked("-", "3/4", "3/4").nodes.includes("lowest"));
});

test("an arithmetic question is read for what it needs: a product, a highest common factor, a lowest common multiple", () => {
  const read = (skill: "times" | "hcf", seed: number) => arithmeticUses(exercise(skill, 2, seed, w)).nodes;
  // Level 2 multiplies two numbers from 12 to 99: long multiplication, but for 12 × 12.
  assert.deepEqual(read("times", 1), ["addWhole", "multiplyFacts", "multiplyLong"]);
  // Level 2 of hcf asks for the lowest common multiple, by way of the highest common factor.
  assert.ok(read("hcf", 1).includes("lcm") && read("hcf", 1).includes("hcf"));
  assert.deepEqual(arithmeticUses(exercise("hcf", 1, 1, w)).nodes, ["multiplyFacts", "divideExact", "hcf"]);
  assert.throws(() => arithmeticUses(exercise("primes", 1, 1, w)), /not an arithmetic question/);
});

test("the generators show every idea and connection, and fractions asks for more of them at once as the level rises", () => {
  const all = generated.flat();
  const nodes = new Set(all.flatMap((u) => u.nodes)), edges = new Set(all.flatMap((u) => u.edges));
  assert.deepEqual([...nodes].sort(), Object.keys(FRACTIONS.nodes).sort());
  assert.deepEqual([...edges].sort(), FRACTIONS.edges.map(edgeId).sort());
  // Only the question asking for a mixed number back needs toMixed.
  assert.ok(!operations.some((u) => u.nodes.includes("toMixed")));
  assert.deepEqual(new Set(arithmetic.flatMap((u) => u.nodes)), new Set(Object.keys(ARITHMETIC.nodes)));
  assert.deepEqual(new Set(arithmetic.flatMap((u) => u.edges)), new Set(ARITHMETIC.edges.map(edgeId)));
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
  // Four connections short (25 of 29, 0.86) is enough at the default 0.8, not at 0.9.
  const short = { nodes: all.nodes, edges: new Set([...all.edges].slice(4)) };
  assert.equal(progressOf(FRACTIONS, short).mastered, true);
  assert.equal(progressOf(FRACTIONS, short, 0.9).mastered, false);
  // One idea short is never enough, whatever the connections.
  const noMixed = { nodes: new Set([...all.nodes].filter((n) => n !== "toMixed")), edges: all.edges };
  assert.deepEqual(progressOf(FRACTIONS, noMixed), { nodes: 15 / 16, edges: 1, mastered: false });
});

test("test 1: the operations test only the three operations alone; the forms test six more ideas alone; four arithmetic ideas are", () => {
  const ops = testedAlone(FRACTIONS, operations);
  assert.deepEqual(Object.keys(ops).filter((n) => ops[n as keyof typeof ops]).sort(), ["addSub", "divide", "multiply"]);
  const alone = testedAlone(FRACTIONS, generated.flat());
  assert.deepEqual(Object.keys(alone).filter((n) => alone[n as keyof typeof alone]).sort(), ["addSub", "commonDenom", "divide", "equivalent", "lowest", "multiply", "reciprocal", "toImproper", "toMixed"]);
  // In arithmetic, adding whole numbers comes only inside long multiplication, and dividing exactly only inside a common factor.
  const arith = testedAlone(ARITHMETIC, arithmetic);
  assert.deepEqual(Object.keys(arith).filter((n) => arith[n as keyof typeof arith]).sort(), ["hcf", "lcm", "multiplyFacts", "multiplyLong"]);
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
