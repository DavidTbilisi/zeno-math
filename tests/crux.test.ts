// Find the crux (#583): every bar-model question records the step it hinges on, and on the hard forms (and k times
// with a total) that step is the insight the rest follows from by routine; every equation's steps hold at its x, and
// its crux is the step that leaves x in one place only; the puzzles in order can be worked in the order they stand
// and the scrambled ones cannot; a tap is taken only on the crux and then on a step whose needs are done; the ladders,
// the stars, the notices, the words in three languages, and where each set's ladder is kept.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { BAR_CRUX, BAR_FORMS, barQuestion } from "../src/math/barProblems.ts";
import {
  bestOps,
  checkTap,
  CRUX_FORMS,
  CRUX_GROUPS,
  CRUX_KINDS,
  CRUX_LADDERS,
  CRUX_PIECES,
  cruxEq,
  cruxNotice,
  cruxNow,
  cruxStars,
  cruxTask,
  cruxWord,
  EQ_KINDS,
  eqText,
  isBarStep,
  levelSpec,
  replay,
  sideAt,
  validOrder,
  xTerms,
  type BarCruxStep,
  type EqCruxStep,
} from "../src/math/crux.ts";
import { initialLive } from "../src/math/live.ts";
import { rngOf } from "../src/math/practiceKit.ts";
import { rng } from "../src/math/random.ts";
import { barPart } from "../src/math/skills/barModels.ts";
import { fill } from "../src/math/text.ts";
import { GAME_KEYS } from "../src/model/gameKeys.ts";

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);

test("every bar-model question records its crux: a step, or the answer itself", () => {
  for (const form of Object.values(BAR_FORMS).flat())
    for (const seed of SEEDS.slice(0, 100)) {
      const q = barQuestion(form, rng(seed));
      assert.equal(q.crux, BAR_CRUX[form], `${form} ${seed}`);
      assert.ok(q.crux >= 0 && q.crux <= q.steps.length, `${form} ${seed}`);
    }
  // Posts and trees: the gaps are routine, one post more on a line (none more round a loop) is the crux.
  assert.equal(BAR_CRUX.posts, 1);
  assert.equal(BAR_CRUX.loop, 1);
});

test("on every hard form, and k times with a total, the crux is the insight and the rest is routine from it", () => {
  for (const seed of SEEDS) {
    for (const form of BAR_FORMS[3]) assert.ok((CRUX_FORMS as readonly string[]).includes(form), form);
    // A gift that makes two amounts equal: the gap before it was two gifts; then (k − 1) units are that gap, and Ann k of them.
    const g = barQuestion("give", rng(seed));
    const gc = g.steps[g.crux];
    assert.equal(gc.ask, "difference");
    assert.equal(gc.v, 2 * g.vars.g);
    assert.equal(g.vars.k * g.vars.u - g.vars.g, g.vars.u + g.vars.g, "equal after the gift");
    assert.equal((gc.v / (g.vars.k - 1)) * g.vars.k, g.v);
    // Leftover and shortage: the bigger share uses up both; then one division by the change for each.
    const l = barQuestion("leftShort", rng(seed));
    const lc = l.steps[l.crux];
    assert.equal(lc.ask, "needed");
    assert.equal(lc.v, l.vars.l + l.vars.s);
    assert.equal(lc.v / (l.vars.q - l.vars.p), l.v);
    // Three amounts: the extra taken away leaves equal units only, four of them; then a share and an add.
    const t = barQuestion("three", rng(seed));
    const tc = t.steps[t.crux];
    assert.equal(tc.ask, "equalUnits");
    assert.equal(tc.v, t.vars.t - t.vars.d);
    assert.equal(tc.v % 4, 0);
    assert.equal(tc.v / 4 + t.vars.d, t.v);
    // k times with a total: k + 1 units make the total; then one unit and k of them.
    const k = barQuestion("times", rng(seed));
    const kc = k.steps[k.crux];
    assert.equal(kc.ask, "units");
    assert.equal(kc.v, k.vars.k + 1);
    assert.equal((k.vars.t / kc.v) * k.vars.k, k.v);
    // The slip each invites is the crux missed: the gap read as one gift, the leftover less the shortage, three units or k.
    assert.ok(!g.trap || g.trap.v === (g.vars.k * g.vars.g) / (g.vars.k - 1));
    assert.ok(!l.trap || l.trap.v === Math.round((Math.abs(l.vars.l - l.vars.s) / l.vars.e) * 100) / 100);
  }
});

test("a word problem's steps in the game: its own and the answer, each after the ones it needs", () => {
  for (const form of CRUX_FORMS)
    for (const seed of SEEDS.slice(0, 100)) {
      const p = cruxWord(form, rngOf(seed));
      const q = p.bar!;
      assert.equal(p.steps.length, q.steps.length + 1);
      assert.equal(p.crux, q.crux);
      const last = p.steps[p.steps.length - 1] as BarCruxStep;
      assert.equal(last.ask, "answer");
      assert.equal(last.v, q.v);
      assert.ok(validOrder(p, p.steps.map((_, i) => i)), `${form} ${seed}`);
      assert.equal(p.steps[p.crux].needs.length, 0, "nothing comes before the crux");
      if (form === "leftShort") assert.ok(q.vars.e >= 2 && validOrder(p, [1, 0, 2]));
      if (cruxWord(form, rngOf(seed), true).bar!.noise === undefined) assert.fail(`${form} ${seed}: noise`);
    }
});

test("every equation's steps hold at its x, and the crux is the step that leaves x in one place only", () => {
  const seen = new Set<string>();
  for (const kind of EQ_KINDS)
    for (const seed of SEEDS) {
      const p = cruxEq(kind, rngOf(seed));
      const { a, b, c, d, x } = p.vars;
      assert.ok(Number.isInteger(x) && x !== 0, `${kind} ${seed}`);
      // The equation as written holds at x.
      const [l, r] = kind === "both" ? [a * x + b, c * x + d] : kind === "brackets" ? [a * (x + b), c * x + d] : [a * (x + b) + c * x, d];
      assert.equal(l, r, `${kind} ${seed} ${p.show}`);
      const steps = p.steps as EqCruxStep[];
      assert.ok(steps.length >= 3);
      for (const s of steps) assert.equal(sideAt(s.eq[0], x), sideAt(s.eq[1], x), `${kind} ${seed} ${eqText(s.eq)}`);
      assert.equal(eqText(steps[steps.length - 1].eq), `x = ${x < 0 ? `−${-x}` : x}`);
      // Before the crux x is in two places; from it on, in one.
      steps.forEach((s, i) => assert.equal(xTerms(s.eq) === 1, i >= p.crux, `${kind} ${seed} ${i}: ${eqText(s.eq)}`));
      assert.equal(p.crux, kind === "both" ? 0 : 1);
      assert.ok(validOrder(p, steps.map((_, i) => i)));
      for (const s of steps) seen.add(s.act);
    }
  assert.deepEqual([...seen].sort(), ["add", "collectBoth", "collectSide", "divide", "expand", "take"]);
});

test("in order the steps stand as they are worked; scrambled they cannot be; the ladders", () => {
  for (const group of CRUX_GROUPS) {
    assert.equal(CRUX_LADDERS[group].length, 6);
    for (const level of [1, 2, 3] as const)
      for (const seed of SEEDS.slice(0, 60)) {
        const spec = levelSpec(group, level);
        const t = cruxTask(group, spec, rngOf(seed));
        assert.ok(spec.kinds.includes(t.problem.kind));
        assert.equal(t.scrambled, level > 1);
        assert.deepEqual([...t.order].sort(), t.problem.steps.map((_, i) => i));
        assert.equal(validOrder(t.problem, t.order), !t.scrambled, `${group} ${level} ${seed}`);
        if (group === "word" && level === 3) assert.ok(t.problem.bar!.noise);
      }
    CRUX_LADDERS[group].forEach((s, stage) => {
      const t = cruxNow({ group, mode: "puzzle", stage, level: 1, seed: 1 });
      assert.ok(s.kinds.includes(t.problem.kind), `${group} ${stage}`);
      assert.equal(t.scrambled, s.scrambled);
    });
    // The first puzzles in order, the later scrambled.
    assert.deepEqual(CRUX_LADDERS[group].map((s) => s.scrambled), [false, false, false, true, true, true]);
    assert.deepEqual(cruxNow({ group, mode: "puzzle", stage: 4, level: 1, seed: 1 }), cruxNow({ group, mode: "puzzle", stage: 4, level: 1, seed: 1 }));
  }
  // Leftover and shortage stands with the share first, so its crux is not the first step.
  const ls = cruxNow({ group: "word", mode: "puzzle", stage: 2, level: 1, seed: 1 });
  assert.equal(ls.problem.kind, "leftShort");
  assert.notEqual(ls.order.indexOf(ls.problem.crux), 0);
});

test("a tap is taken only on the crux, then on a step whose needs are done; the stars and the notices", () => {
  for (const group of CRUX_GROUPS)
    for (const level of [1, 2] as const)
      for (const seed of SEEDS.slice(0, 40)) {
        const t = cruxTask(group, levelSpec(group, level), rngOf(seed));
        const best = bestOps(t);
        let m = replay(t, []);
        t.order.forEach((s, at) => assert.deepEqual(checkTap(m, at), s === t.problem.crux ? { ok: true } : { ok: false, why: "notCrux" }));
        for (let k = 1; k <= best.length; k++) {
          const placed = new Set(m.placed);
          if (m.found)
            t.order.forEach((s, at) => {
              const c = checkTap(m, at);
              if (placed.has(s)) assert.equal(c, null);
              else assert.equal(c?.ok, t.problem.steps[s].needs.every((n) => placed.has(n)), `${group} ${seed} ${k} ${at}`);
            });
          assert.equal(checkTap(m, best[k - 1])?.ok, true);
          m = replay(t, best.slice(0, k));
        }
        assert.ok(m.done);
        assert.equal(checkTap(m, 0), null, "done");
        assert.equal(cruxNotice(m, 0, 1), t.scrambled ? "clean" : t.order.indexOf(t.problem.crux) > 0 ? "hidden" : null);
        assert.equal(cruxNotice(m, 1, 10), "streak10");
        assert.equal(cruxNotice(m, 1, 2), null);
      }
  // Leftover and shortage: its two steps can go in either order.
  for (const seed of SEEDS.slice(0, 40)) {
    const t = cruxTask("word", { kinds: ["leftShort"], scrambled: true }, rngOf(seed));
    for (const first of [0, 1]) {
      const m = replay(t, [t.order.indexOf(0), t.order.indexOf(first)]);
      assert.equal(checkTap(m, t.order.indexOf(1 - first))?.ok, true);
      assert.equal(replay(t, [t.order.indexOf(0), t.order.indexOf(first), t.order.indexOf(1 - first), t.order.indexOf(2)]).done, true);
    }
  }
  assert.deepEqual([0, 1, 2, 5].map(cruxStars), [3, 2, 1, 1]);
});

test("the words: every step, act and why in three languages, filled with nothing left over", () => {
  for (const words of [en, ka, ru]) {
    const w = words.live.crux;
    for (const kind of [...CRUX_FORMS, ...EQ_KINDS]) assert.ok(w.why[kind], kind);
    for (const group of CRUX_GROUPS) {
      assert.ok(w.sets[group] && words.shapes.names[`live${group === "word" ? "CruxWord" : "CruxEq"}`]);
      for (const kind of CRUX_KINDS[group])
        for (const seed of SEEDS.slice(0, 20)) {
          const p = group === "word" ? cruxWord(kind as (typeof CRUX_FORMS)[number], rngOf(seed)) : cruxEq(kind as (typeof EQ_KINDS)[number], rngOf(seed));
          const vars = Object.fromEntries(Object.entries(p.vars).map(([k, v]) => [k, String(v)]));
          const c = p.steps[p.crux];
          const why = fill(w.why[p.kind], isBarStep(c) ? vars : { ...vars, n: c.n, eq: eqText(c.eq) });
          assert.ok(!/[{}]/.test(why), `${kind}: ${why}`);
          if (p.bar) {
            const part = barPart(p.bar, words.pracWords);
            for (const s of part.worked) assert.ok(s.prompt && !/[{}]/.test(s.prompt));
          } else for (const s of p.steps as EqCruxStep[]) assert.ok(!/[{}]/.test(fill(w.acts[s.act], { n: s.n })));
        }
    }
  }
});

test("each set is a game of its own, its ladder kept where the teacher's assigned games read it", () => {
  for (const group of CRUX_GROUPS) {
    const kind = CRUX_PIECES[group];
    assert.equal(GAME_KEYS[kind], `zeno.crux${group}.v1`);
    assert.equal(initialLive(kind).group, group);
  }
});
