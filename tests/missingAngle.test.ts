// Missing angles: every figure's angles add up to its total and are drawn to size, the slips (the wrong total, an
// isosceles triangle's base not halved) are named, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { anglesOf, HUNT_LADDER, huntNotice, huntNow, huntStars, huntSteps, huntSvg, huntTask, huntTraps, totalOf } from "../src/math/missingAngle.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every figure's angles add up to its total, and the polygons are drawn with those angles", () => {
  const kinds = new Set<string>();
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = huntTask(level, rng(seed));
      const f = t.fig;
      kinds.add(`${level}:${f.kind}`);
      const where = `level ${level} seed ${seed}: ${JSON.stringify(f)}`;
      const as = anglesOf(f);
      assert.equal(as.reduce((s, a) => s + a, 0), totalOf(f.kind), where);
      assert.ok(as.every((a) => Number.isInteger(a) && a >= 10), where);
      assert.equal(t.v, as[f.ask], where);
      if ("pts" in f) {
        // The angle at each corner, measured from the corners themselves.
        f.pts.forEach((p, i) => {
          const [a, b] = [f.pts[(i + 1) % f.pts.length], f.pts[(i + f.pts.length - 1) % f.pts.length]];
          const u = [a[0] - p[0], a[1] - p[1]];
          const v = [b[0] - p[0], b[1] - p[1]];
          const deg = (Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180) / Math.PI;
          assert.ok(Math.abs(deg - f.angles[i]) < 1e-6, `${where}: corner ${i} is ${deg}`);
        });
      }
      const pic = huntSvg(f);
      assert.ok(!pic.body.includes("NaN") && pic.body.includes(">?<"), where);
      assert.match(huntSteps(t).join(" "), new RegExp(`= ${t.v}\\^\\\\circ$`), where);
    }
  assert.deepEqual([...kinds].sort(), ["1:line", "1:right", "2:point", "2:triangle", "3:iso", "3:quad"]);
});

test("the slips: the wrong total, and an isosceles triangle's base angles not shared", () => {
  const line = { level: 1 as const, fig: { kind: "line" as const, turn: 0, parts: [126, 54], ask: 1 }, v: 54 };
  assert.deepEqual(huntTraps(line), [{ id: "wrongTotal", v: 234, vars: { t: 180, u: 360, k: 126, v: 54 } }]);
  const right = { level: 1 as const, fig: { kind: "right" as const, turn: 0, parts: [30, 60], ask: 0 }, v: 30 };
  assert.equal(huntTraps(right)[0].v, 120);
  const point = { level: 2 as const, fig: { kind: "point" as const, turn: 0, parts: [100, 120, 140], ask: 0 }, v: 100 };
  assert.deepEqual(huntTraps(point), [], "180° − 260° is no answer anyone gives");
  const iso = huntTask(3, rng(7));
  if (iso.fig.kind === "iso") assert.deepEqual(huntTraps(iso).map((x) => [x.id, x.v]), [["notHalved", 2 * iso.v]]);
  // A wrong answer drawn as an arm, at the size it says.
  assert.match(huntSvg(line.fig, { ghost: 70 }).body, />70°</);
  assert.match(huntSvg(line.fig, { answer: 54 }).body, />54°</);
});

test("in practice: the angle typed, the slips named, the figure drawn with the answer; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("missingAngle", level, 7, w);
    assert.ok(ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.deepEqual(check(ex, `${ex.plain}°`, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN") && r.svg.includes(`>${ex.plain}°<`));
  }
  for (const [level, id] of [[1, "wrongTotal"], [2, "wrongTotal"], [3, "notHalved"]] as const) {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const ex = exercise("missingAngle", level, seed, w);
      const trap = trapInputs(ex).find((x) => x.id === id);
      if (!trap) continue;
      found++;
      const v = check(ex, trap.input, w);
      assert.equal(v.mistake, id);
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
    assert.ok(found > 10, `${found} questions at level ${level} name ${id}`);
  }
  const q = { skill: "missingAngle" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "54"), mark(q, "126"), mark(q, "angle")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([huntStars(0), huntStars(1), huntStars(2)], [3, 2, 1]);
  const point = { level: 2 as const, fig: { kind: "point" as const, turn: 0, parts: [100, 120, 140], ask: 0 }, v: 100 };
  const tiny = { level: 1 as const, fig: { kind: "right" as const, turn: 0, parts: [20, 70], ask: 0 }, v: 20 };
  assert.equal(huntNotice(point, 0, 1), "wholeTurn");
  assert.equal(huntNotice(tiny, 0, 1), "tiny");
  assert.equal(huntNotice(tiny, 1, 0), null);
  assert.equal(huntNotice(tiny, 1, 10), "streak10");
  const iso = HUNT_LADDER.map(({ level, seed }) => huntTask(level, rng(seed))).find((t) => t.fig.kind === "iso");
  assert.ok(iso, "an isosceles triangle among the puzzles");
  assert.equal(huntNotice(iso!, 0, 1), "isosceles");
  HUNT_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(huntNow({ mode: "puzzle", stage, level: 1, seed: 0 }), huntTask(level, rng(seed))));
  assert.deepEqual(huntNow({ mode: "endless", stage: 0, level: 2, seed: 8 }), huntTask(2, rng(8)));
});
