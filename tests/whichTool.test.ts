// Which tool?: every set's problems really need the tool they name (a factor quadratic has rational roots, a square
// roots one no x term, a formula one doesn't factor and no quicker tool fits; a common-denominator fraction sum adds or
// takes away; an undo-in-order equation has x on one side only…), and the two lines that solve one by its tool come
// to the right answer, from many seeds; the rounds and the ladders follow the rules; a tile is taken only when its
// tool fits, the slower of two costs the third star; and each set's ladder is kept where the teacher's games look.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { Frac } from "../src/math/fraction.ts";
import { initialLive } from "../src/math/live.ts";
import { rngOf } from "../src/math/practiceKit.ts";
import { fill } from "../src/math/text.ts";
import { GAME_KEYS } from "../src/model/gameKeys.ts";
import {
  bestOps,
  checkTile,
  GROUPS,
  levelSpec,
  plainOf,
  polyText,
  problemOf,
  replay,
  slowPicks,
  TOOLS,
  WHICH_KINDS,
  WHICH_LADDERS,
  whichNotice,
  whichNow,
  whichStars,
  whichTask,
  type Group,
  type Problem,
  type Tool,
} from "../src/math/whichTool.ts";

const KINDS: Record<Group, string[]> = {
  frac: ["add", "times", "divide", "addMixed", "timesMixed", "divideMixed", "divSame"],
  word: [...TOOLS.word],
  eq: ["undo", "collect", "brackets", "cross", "crossBoth", "undoFrac"],
  quad: ["factor", "factorA", "roots", "rootsSq", "complete", "formula", "formulaA"],
};
const SEEDS = Array.from({ length: 150 }, (_, i) => 1000 + 37 * i);
const each = (group: Group, fn: (p: Problem, where: string) => void) => {
  for (const kind of KINDS[group]) for (const seed of SEEDS) fn(problemOf(group, kind, rngOf(seed)), `${group} ${kind} seed ${seed}`);
};
const isSquare = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));
/** The number a line ends on: "= 7 3/22", "x = −27/4", "x = 5". */
function lastValue(line: string): Frac {
  const s = line.replace(/−/g, "-").trim();
  const mixed = /(-?\d+) (\d+)\/(\d+)$/.exec(s);
  if (mixed) return new Frac(Number(mixed[1]) * Number(mixed[3]) + Number(mixed[2]), Number(mixed[3]));
  const frac = /(-?\d+)\/(\d+)$/.exec(s);
  if (frac) return new Frac(Number(frac[1]), Number(frac[2]));
  return new Frac(Number(/(-?\d+)$/.exec(s)![1]));
}
const eq = (x: Frac, y: Frac, where: string) => assert.ok(x.sub(y).isZero(), `${where}: ${x.n}/${x.d} ≠ ${y.n}/${y.d}`);

test("quadratics: factor has rational roots and an x term, roots no x term, complete an even b that doesn't factor, the formula what nothing quicker fits", () => {
  each("quad", (p, where) => {
    const { a, b, c } = p.vars;
    const D = b * b - 4 * a * c;
    assert.ok(a >= 1 && D > 0, where);
    if (p.tool === "factor") {
      assert.ok(isSquare(D) && b !== 0 && p.also === null, where);
      if (p.kind === "factor") assert.ok(a === 1 && Number.isInteger((-b + Math.sqrt(D)) / 2), where);
    }
    if (p.tool === "roots") {
      assert.ok(b === 0 && -c / a > 0, where);
      assert.equal(p.also, isSquare(-c / a) ? "factor" : null, where);
    }
    if (p.tool === "complete") assert.ok(a === 1 && b !== 0 && b % 2 === 0 && !isSquare(D) && p.also === "formula", where);
    if (p.tool === "formula") assert.ok(b !== 0 && !isSquare(D) && (b % 2 !== 0 || a !== 1) && p.also === null, where);
    assert.equal(p.tool, { factor: "factor", factorA: "factor", roots: "roots", rootsSq: "roots", complete: "complete", formula: "formula", formulaA: "formula" }[p.kind], where);
    // The written equation is the one in vars, and the roots worked out are its roots.
    if (p.tool !== "roots") assert.equal(plainOf(p.show), `${polyText(c, b, a)} = 0`, where);
    assert.equal(p.lines.length, 2, where);
    const last = plainOf(p.lines[1]);
    const roots = [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)];
    if (p.tool === "factor") {
      const xs = last.split(",").map((s) => lastValue(s).toNumber());
      assert.deepEqual(xs.map((x) => Math.round(x * 1e9)), roots.map((x) => Math.round(x * 1e9)), where);
    } else if (p.tool === "roots") assert.match(last, new RegExp(`±(√)?${isSquare(-c / a) ? Math.sqrt(-c / a) : -c / a}`), where);
    else if (p.tool === "complete") assert.equal(last, `x = ${b / 2 > 0 ? "−" : ""}${Math.abs(b / 2)} ± √${D / 4}`, where);
    else assert.equal(last, `x = (${-b < 0 ? "−" : ""}${Math.abs(b)} ± √${D})/${2 * a}`, where);
  });
});

test("fractions: adding and taking away want a common denominator, times multiplies across, dividing flips, and one denominator under a division divides the tops", () => {
  each("frac", (p, where) => {
    const { aw, an, ad, bw, bn, bd } = p.vars;
    const shown = plainOf(p.show);
    const op = ["+", "−", "×", "÷"].find((o) => shown.includes(` ${o} `))!;
    assert.ok(op, where);
    assert.ok(an >= 1 && an < ad && bn >= 1 && bn < bd, where);
    assert.equal(aw > 0 || bw > 0, p.kind.endsWith("Mixed"), where);
    const want: Tool = op === "×" ? "across" : op === "÷" ? (ad === bd && !aw && !bw ? "common" : "flip") : "common";
    assert.equal(p.tool, want, where);
    assert.equal(p.also, p.kind === "divSame" ? "flip" : null, where);
    if (p.kind === "divSame") assert.ok(ad === bd && op === "÷", where);
    const [A, B] = [new Frac(aw * ad + an, ad), new Frac(bw * bd + bn, bd)];
    const value = op === "+" ? A.add(B) : op === "−" ? A.sub(B) : op === "×" ? A.mul(B) : A.div(B);
    eq(lastValue(plainOf(p.lines[1])), value, where);
  });
});

test("equations: undo in order has x on one side only, collect has x on both, cross-multiply a fraction each side; the two lines find x", () => {
  each("eq", (p, where) => {
    const v = p.vars;
    const shown = plainOf(p.show);
    const xs = shown.split("=").map((side) => side.includes("x"));
    const fracs = p.show.filter((t) => typeof t !== "string").length;
    if (p.tool === "undo") assert.deepEqual(xs, [true, false], where);
    if (p.tool === "collect") assert.ok(xs[0] && xs[1] && fracs === 0 && v.a !== v.c, where);
    if (p.tool === "cross") assert.ok(fracs === 2, where);
    assert.equal(p.also, p.kind === "undoFrac" ? "cross" : null, where);
    const x = lastValue(plainOf(p.lines[1]));
    const f = (n: number) => new Frac(n);
    if (p.kind === "undo" || p.kind === "collect" || p.kind === "brackets") eq(f(v.a).mul(x).add(f(v.b)), f(v.c).mul(x).add(f(v.d)), where);
    if (p.kind === "undo") assert.ok(v.c === 0 && v.b !== 0 && fracs === 0, where);
    if (p.kind === "brackets") assert.match(shown, /^\d+\(x [+−] \d+\) = /, where);
    if (p.kind === "cross") eq(f(v.k * v.d), f(v.c).mul(x.add(f(v.b))), where);
    if (p.kind === "crossBoth") eq(f(v.d).mul(x.add(f(v.a))), f(v.b).mul(x.add(f(v.c))), where);
    if (p.kind === "undoFrac") eq(x.add(f(v.a)), f(v.b * v.c), where);
  });
});

test("word problems: each is its bar-model form, and its two lines in every language use only numbers it has and end on its answer", () => {
  each("word", (p, where) => {
    assert.ok(p.bar, where);
    assert.equal(p.tool, p.bar!.form, where);
    assert.equal(p.vars.v, p.bar!.v, where);
    for (const words of [en, ka, ru]) {
      const lines: string[] = (words.live.whichTool.barLines[p.bar!.form] as string[]).map((l) => fill(l, Object.fromEntries(Object.entries(p.vars).map(([k, x]) => [k, String(x)]))));
      assert.equal(lines.length, 2, where);
      assert.ok(lines.every((l) => !/[{}]/.test(l)), `${where}: ${lines.join(" / ")}`);
      assert.ok(lines[1].includes(String(p.vars.v)), `${where}: ${lines[1]}`);
    }
  });
});

test("rounds: every tool of the round when there is room, no problem twice, a two-tool problem in a hard round that can have one", () => {
  for (const group of GROUPS) {
    const ladder = WHICH_LADDERS[group];
    assert.equal(ladder.length, 6, group);
    const rounds = [
      ...ladder.map((s, stage) => ({ spec: { ...s, group }, t: whichNow({ group, mode: "puzzle", stage, level: 1, seed: 1 }), where: `${group} puzzle ${stage + 1}` })),
      ...([1, 2, 3] as const).flatMap((level) => SEEDS.slice(0, 30).map((seed) => ({ spec: levelSpec(group, level), t: whichNow({ group, mode: "endless", stage: 0, level, seed }), where: `${group} level ${level} seed ${seed}` }))),
    ];
    for (const { spec, t, where } of rounds) {
      assert.equal(t.items.length, spec.size, where);
      assert.deepEqual(t.tools, TOOLS[group].filter((x) => spec.tools.includes(x)), where);
      const tools = new Set(t.items.map((p) => p.tool));
      for (const p of t.items) assert.ok(t.tools.includes(p.tool), where);
      assert.equal(tools.size, Math.min(spec.size, t.tools.length), where);
      assert.equal(new Set(t.items.map((p) => (p.bar ? JSON.stringify(p.vars) : plainOf(p.show)))).size, t.items.length, where);
      if (spec.hard && group !== "word" && t.tools.length === TOOLS[group].length) assert.ok(t.items.some((p) => p.also && t.tools.includes(p.also)), where);
      if (!spec.hard) assert.ok(t.items.every((p) => !["addMixed", "timesMixed", "divideMixed", "divSame", "undoFrac", "brackets", "crossBoth", "factorA", "rootsSq", "formulaA"].includes(p.kind)), where);
    }
    // The same puzzle every time.
    assert.deepEqual(whichNow({ group, mode: "puzzle", stage: 3, level: 1, seed: 1 }), whichNow({ group, mode: "puzzle", stage: 3, level: 1, seed: 1 }));
  }
});

test("a tile is taken only when its tool fits; the slower of two counts without the third star", () => {
  for (const group of GROUPS) {
    for (const seed of SEEDS.slice(0, 20)) {
      const t = whichTask(levelSpec(group, 3), rngOf(seed));
      let m = replay(t, []);
      const all = TOOLS[group] as readonly Tool[];
      t.items.forEach((p, k) => {
        all.forEach((tool, tile) => {
          const c = checkTile(m, tile);
          assert.equal(c.ok, tool === p.tool || tool === p.also, `${group} ${seed} ${k} ${tool}`);
          if (c.ok) assert.equal(c.slow, tool !== p.tool);
        });
        m = replay(t, bestOps(t).slice(0, k + 1));
      });
      assert.equal(checkTile(m, 0).ok, false, "nothing left to ask");
      assert.equal(slowPicks(m), 0);
    }
  }
  assert.deepEqual([[0, 0], [0, 1], [1, 0], [1, 2], [2, 0], [5, 0]].map(([miss, slow]) => whichStars(miss, slow)), [3, 2, 2, 2, 1, 1]);
});

test("notices: the quicker of two every time, every tool of the set, ten clean rounds", () => {
  const two = whichTask({ group: "frac", tools: TOOLS.frac, size: 6, hard: true }, rngOf(7));
  const k = two.items.findIndex((p) => p.also);
  assert.ok(k >= 0);
  const best = replay(two, bestOps(two));
  assert.equal(whichNotice(best, 0, 1), "quicker");
  assert.equal(whichNotice(best, 1, 0), null);
  assert.equal(whichNotice(best, 1, 10), "streak10");
  const slow = bestOps(two).map((op, i) => (i === k ? (TOOLS.frac as readonly string[]).indexOf(two.items[k].also!) : op));
  const slowRound = replay(two, slow);
  assert.equal(slowPicks(slowRound), 1);
  assert.notEqual(whichNotice(slowRound, 0, 1), "quicker");
  const plain = whichTask({ group: "eq", tools: TOOLS.eq, size: 6 }, rngOf(3));
  assert.equal(whichNotice(replay(plain, bestOps(plain)), 0, 1), "allTools");
});

test("each set is a game of its own, its ladder kept where the teacher's assigned games read it", () => {
  for (const group of GROUPS) {
    const kind = WHICH_KINDS[group];
    assert.equal(GAME_KEYS[kind], `zeno.which${group}.v1`);
    assert.equal(initialLive(kind).group, group);
    for (const t of TOOLS[group]) for (const words of [en, ka, ru]) assert.ok(words.live.whichTool.tools[t] && words.live.whichTool.needs[t], t);
  }
});
