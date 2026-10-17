// Graph stories: every walk fits its level and never passes home, a part back home is told as such, the four graphs
// offered are different with the story's among them, the slips' graphs are what they say, and the board's checks,
// stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { flatSwapped, heights, isFast, isMoving, partSlip, SLOW_PARTS, speedSwapped, STORY_LADDER, storyChoicesSvg, storyNotice, storyNow, storyQuestion, storyStars, storySvg, storyTask, storyWords, wrongParts, type Part } from "../src/math/graphStory.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every walk fits its level: it starts by going away, never passes home, walks and runs past the easy level", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const { parts } = storyTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${parts.join(" ")}`;
      assert.equal(parts.length, level === 3 ? 4 : 3, where);
      assert.ok(parts[0].startsWith("away"), where);
      assert.ok(heights(parts), where);
      assert.ok(!parts.some((p, k) => p === "stop" && parts[k + 1] === "stop"), where);
      if (level === 1) assert.ok(parts.every((p) => SLOW_PARTS.includes(p)), where);
      else assert.ok(parts.some(isFast) && parts.some((p) => isMoving(p) && !isFast(p)), where);
    }
  assert.deepEqual(heights(["awayFast", "stop", "backSlow", "backSlow"]), [0, 2, 2, 1, 0]);
  assert.equal(heights(["awaySlow", "backFast"]), null);
});

test("a part that ends at home is told as going back home", () => {
  assert.deepEqual(storyWords(["awayFast", "backSlow", "backSlow"]), ["awayFast", "backSlow", "backSlowHome"]);
  assert.deepEqual(storyWords(["awaySlow", "backFast"]), ["awaySlow", "backFast"]);
  assert.deepEqual(storyWords(["awayFast", "backFast", "stop"]), ["awayFast", "backFastHome", "stop"]);
});

test("the questions: four different graphs, the story's among them; the slips' graphs are what they say", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const q = storyQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(q)}`;
      assert.equal(q.options.length, 4, where);
      assert.equal(new Set(q.options.map((o) => o.join(" "))).size, 4, where);
      assert.deepEqual(q.options[q.right], q.task.parts, where);
      assert.ok(q.options.every((o) => heights(o) && o.length === q.task.parts.length), where);
      // Walking only on the easy level: a steep graph would be another speed of walking, not a wrong one.
      if (level === 1) assert.ok(q.options.every((o) => o.every((p) => SLOW_PARTS.includes(p))), where);
      for (const { id, at } of q.traps) {
        assert.notEqual(at, q.right, where);
        const o = q.options[at];
        if (id === "flatMoving") {
          const changed = o.flatMap((p, k) => (p !== q.task.parts[k] ? [k] : []));
          assert.equal(changed.length, 1, where);
          assert.notEqual(isMoving(o[changed[0]]), isMoving(q.task.parts[changed[0]]), where);
        } else assert.deepEqual(o, speedSwapped(q.task.parts), where);
      }
      assert.ok(q.traps.some((x) => x.id === "flatMoving"), where);
    }
  assert.deepEqual(flatSwapped(["awaySlow", "stop", "backSlow"]), ["awaySlow", "awaySlow", "backSlow"]);
  // No stop: the first walk that can be drawn as one without passing home.
  assert.deepEqual(flatSwapped(["awaySlow", "backSlow", "awaySlow"]), ["awaySlow", "stop", "awaySlow"]);
  assert.deepEqual(speedSwapped(["awaySlow", "awayFast", "backFast"]), ["awayFast", "awaySlow", "backSlow"]);
  assert.equal(speedSwapped(["awayFast", "backSlow", "stop"]), null, "walking away, then running back, would pass home");
});

test("the pictures: a line for each part, the wrong ones red, the four choices lettered", () => {
  const parts: Part[] = ["awaySlow", "awayFast", "stop", "backFast"];
  const pic = storySvg(parts, { wrong: [1], numbered: true });
  assert.ok(!pic.body.includes("NaN"));
  assert.equal((pic.body.match(/stroke-linecap="round"/g) ?? []).length, 4);
  assert.equal((pic.body.match(/#e03131/g) ?? []).length, 2, "the line and its number");
  const q = storyQuestion(3, rng(2));
  const all = storyChoicesSvg(q);
  for (const l of ["A", "B", "C", "D"]) assert.match(all.body, new RegExp(`>${l}<`));
  assert.ok(!all.body.includes("NaN"));
});

test("in practice: the letter typed or picked, the slips named, the graph numbered; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("graphStory", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.deepEqual(check(ex, ex.plain.toLowerCase(), w), { ok: true });
    assert.match(check(ex, "E", w).why ?? "", /Pick one of the options offered/);
    assert.doesNotMatch(ex.prompt, /\{\w+\}/);
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const [id, levels] of [["flatMoving", [1, 2, 3]], ["steepSlow", [2, 3]]] as const)
    for (const level of levels) {
      let found = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const ex = exercise("graphStory", level, seed, w);
        const trap = trapInputs(ex).find((x) => x.id === id);
        if (!trap) continue;
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
      assert.ok(found > 10, `${found} questions at level ${level} name ${id}`);
    }
  const q = { skill: "graphStory" as const, level: 2, seed: 7 };
  const ex = exercise("graphStory", 2, 7, w);
  const other = ["A", "B", "C", "D"].find((l) => l !== ex.plain)!;
  assert.deepEqual([mark(q, ex.plain), mark(q, other), mark(q, "the second")], ["correct", "wrong", "form"]);
});

test("the board: the parts drawn wrong and why, stars from misses, the notices, the ladder", () => {
  const t = { level: 2 as const, parts: ["awayFast", "stop", "backSlow"] as Part[] };
  assert.deepEqual(wrongParts(t, ["awayFast", "stop", "backSlow"]), []);
  assert.deepEqual(wrongParts(t, ["awaySlow", "awaySlow", "backSlow"]), [0, 1]);
  assert.equal(partSlip("stop", "awaySlow"), "flat");
  assert.equal(partSlip("backSlow", "stop"), "flat");
  assert.equal(partSlip("awayFast", "awaySlow"), "speed");
  assert.equal(partSlip("backSlow", "awaySlow"), "way");
  assert.deepEqual([storyStars(0), storyStars(1), storyStars(3)], [3, 2, 1]);
  assert.equal(storyNotice(t, 0, 1), "speeds");
  assert.equal(storyNotice({ level: 1, parts: ["awaySlow", "stop", "backSlow"] }, 0, 1), "home");
  assert.equal(storyNotice({ level: 1, parts: ["awaySlow", "stop", "awaySlow"] }, 0, 1), "still");
  assert.equal(storyNotice({ level: 1, parts: ["awaySlow", "awaySlow", "awaySlow"] }, 0, 1), null);
  assert.equal(storyNotice(t, 1, 0), null);
  assert.equal(storyNotice(t, 0, 10), "streak10");
  assert.deepEqual(storyNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), storyTask(STORY_LADDER[4].level, rng(STORY_LADDER[4].seed)));
  assert.deepEqual(storyNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), storyTask(3, rng(8)));
});
