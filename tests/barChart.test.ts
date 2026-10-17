// Bar charts: every chart fits its level's scale, a tap reads the height it lands at to the bar's step, the answers
// are read off the chart, the lines counted and the bigger number are named, and the board's stars and notices follow
// the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { CHART_LADDER, chartGeom, chartNotice, chartNow, chartQuestion, chartStars, chartSteps, chartSvg, chartTask, chartTop, chartTraps, linesCounted, wrongBars } from "../src/math/barChart.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every chart fits its level: its scale, its step, different numbers, and a bar between two lines past the easy level", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = chartTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(t)}`;
      const steps = level === 1 ? [1] : level === 2 ? [2, 5] : [10, 20];
      assert.ok(steps.includes(t.step), where);
      assert.equal(t.items.length, level === 1 ? 4 : 5, where);
      const vs = t.items.map((it) => it.v);
      assert.equal(new Set(vs).size, vs.length, where);
      assert.equal(new Set(t.items.map((it) => it.icon)).size, vs.length, where);
      assert.ok(vs.every((v) => v % t.grain === 0 && v >= 0 && v <= chartTop(t)), where);
      if (level === 1) assert.ok(vs.every((v) => v > 0), where);
      if (t.grain < t.step) assert.ok(vs.some((v) => v % t.step !== 0), where);
    }
});

test("a tap reads the height it lands at, to the bar's step, within the scale; and the column under it", () => {
  for (const level of LEVELS) {
    const t = chartTask(level, rng(3));
    const G = chartGeom(t, 28);
    for (let v = 0; v <= chartTop(t); v += t.grain) assert.equal(G.valueAt(G.y(v) + 3), v);
    assert.equal(G.valueAt(G.foot + 50), 0);
    assert.equal(G.valueAt(-50), chartTop(t));
    t.items.forEach((_, k) => assert.equal(G.colAt(G.mid(k)), k));
    assert.equal(G.colAt(2), -1);
  }
});

test("the picture: a bar for each fruit, the wrong ones orange with their mark, the solution's numbers above the bars", () => {
  const t = chartTask(2, rng(4));
  const pic = chartSvg(t, { bars: [t.items[0].v + t.grain, ...t.items.slice(1).map((it) => it.v)], wrong: [0] });
  assert.ok(!pic.body.includes("NaN"));
  for (const it of t.items) assert.ok(pic.body.includes(it.icon));
  assert.match(pic.body, /#e8590c/);
  assert.equal((pic.body.match(/<rect/g) ?? []).length, 1 + t.items.filter((it, k) => k > 0 && it.v > 0).length, "no bar is drawn for 0");
  const marked = chartSvg(t, { marked: [1] });
  assert.match(marked.body, new RegExp(`>${t.items[1].v}<`));
});

test("the questions: read off the chart, never of a fruit there is none of; the slips give other answers", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const q = chartQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(q)}`;
      const vs = q.at.map((k) => q.task.items[k].v);
      assert.ok(vs.every((v) => v > 0), where);
      assert.ok((level === 3 ? ["more", "total"] : ["one", "more"]).includes(q.ask), where);
      assert.equal(q.v, q.ask === "one" ? vs[0] : q.ask === "more" ? vs[0] - vs[1] : vs[0] + vs[1], where);
      if (q.ask !== "one") assert.ok(vs[0] > vs[1], where);
      const traps = chartTraps(q);
      assert.ok(traps.every((x) => x.v !== q.v), where);
      assert.equal(traps.some((x) => x.id === "countedLines"), q.task.step > 1, where);
      assert.equal(traps.some((x) => x.id === "notDifference"), q.ask === "more", where);
    }
  const q = { task: { level: 2 as const, step: 2, grain: 1, items: [{ icon: "🍎", v: 13 }, { icon: "🍌", v: 6 }] }, ask: "more" as const, at: [0, 1], v: 7 };
  assert.deepEqual(chartSteps(q), ["6.5 \\times 2 = 13", "3 \\times 2 = 6", "13 - 6 = 7"]);
});

test("in practice: the number typed, the slips named, the bars marked; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("readChart", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const [id, levels] of [["countedLines", [2, 3]], ["notDifference", [1, 2, 3]]] as const)
    for (const level of levels) {
      let found = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const ex = exercise("readChart", level, seed, w);
        const trap = trapInputs(ex).find((x) => x.id === id);
        if (!trap) continue;
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
      assert.ok(found > 10, `${found} questions at level ${level} name ${id}`);
    }
  const q = { skill: "readChart" as const, level: 1, seed: 7 };
  const ex = exercise("readChart", 1, 7, w);
  assert.deepEqual([mark(q, ex.plain), mark(q, String(Number(ex.plain) + 1)), mark(q, "lots")], ["correct", "wrong", "form"]);
});

test("the board: the bars still wrong, a scale not read, stars from misses, the notices, the ladder", () => {
  const t = { level: 2 as const, step: 2, grain: 1, items: [{ icon: "🍎", v: 7 }, { icon: "🍌", v: 0 }, { icon: "🍇", v: 12 }] };
  assert.deepEqual(wrongBars(t, [7]), [2]);
  assert.deepEqual(wrongBars(t, [7, 0, 12]), []);
  assert.equal(linesCounted(t, [14, 0, 3]), 0);
  assert.equal(linesCounted(t, [3, 0, 24]), 2);
  assert.equal(linesCounted(t, [3, 0, 3]), -1);
  assert.equal(linesCounted({ ...t, step: 1 }, [7, 0, 12]), -1);
  assert.deepEqual([chartStars(0), chartStars(1), chartStars(4)], [3, 2, 1]);
  assert.equal(chartNotice(t, 0, 1), "zero");
  assert.equal(chartNotice({ ...t, step: 10, grain: 5, items: [{ icon: "🍎", v: 30 }] }, 0, 1), "bigScale");
  assert.equal(chartNotice({ ...t, items: [{ icon: "🍎", v: 7 }] }, 0, 1), "halfway");
  assert.equal(chartNotice({ ...t, items: [{ icon: "🍎", v: 8 }] }, 0, 1), null);
  assert.equal(chartNotice(t, 1, 0), null);
  assert.equal(chartNotice(t, 0, 10), "streak10");
  assert.deepEqual(chartNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), chartTask(CHART_LADDER[4].level, rng(CHART_LADDER[4].seed)));
  assert.deepEqual(chartNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), chartTask(3, rng(8)));
});
