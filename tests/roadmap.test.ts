// Roadmaps by goal (#449): every item is a real skill, game or "What is…?" read (#450), nothing comes before what it builds on, the ML roadmap
// is the course map, items tick themselves from practice and passed games, and Next walks a roadmap to the end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { ALL_SKILLS, type SkillId } from "../src/math/practiceSkills.ts";
import { nextStep, STAGES, standing } from "../src/model/course.ts";
import { gradeOf, PREREQUISITES } from "../src/model/curriculum.ts";
import { cellKey, type Cells } from "../src/model/placement.ts";
import { achievedAt, GAME_KEYS, GOALS, isRead, isSkill, itemId, itemsOf, itemState, progressOf, roadNext, type GameId, type Item, type Work } from "../src/model/roadmap.ts";
import { ROADMAPS } from "../src/model/roadmaps/index.ts";
import type { TopicId } from "../src/model/topics.ts";

const secure = { seen: 3, right: 3, run: 3 };
const work = (cells: Cells, placed: Parameters<typeof standing>[1] = null, won: GameId[] = [], read: TopicId[] = []): Work => ({
  s: standing(cells, placed),
  passed: (g) => won.includes(g),
  read: (topic) => read.includes(topic),
});

test("every goal has a roadmap of real skills and games, each item once", () => {
  assert.deepEqual(Object.keys(ROADMAPS), [...GOALS]);
  for (const r of Object.values(ROADMAPS)) {
    assert.equal(r.id, ROADMAPS[r.id].id);
    const ids = itemsOf(r).map(itemId);
    assert.equal(new Set(ids).size, ids.length, `${r.id} lists an item twice`);
    assert.equal(new Set(r.stages.map((s) => s.id)).size, r.stages.length);
    for (const s of r.stages) assert.ok(s.items.length > 0, `${r.id}/${s.id} is empty`);
    for (const i of itemsOf(r)) if (isSkill(i)) assert.ok(ALL_SKILLS.includes(i.skill), `${r.id}: no skill ${i.skill}`);
  }
  // The hand-made roadmaps are a checklist of about 30 to 70 items.
  for (const id of ["software", "algorithms", "finance", "banking"] as const) {
    const n = itemsOf(ROADMAPS[id]).length;
    assert.ok(n >= 25 && n <= 70, `${id} has ${n} items`);
  }
});

test("a game's ladder is read from the key the game itself keeps it under", () => {
  const src = readdirSync("src/live").filter((f) => f.endsWith(".tsx")).map((f) => readFileSync(`src/live/${f}`, "utf8"));
  for (const [game, key] of Object.entries(GAME_KEYS)) {
    const file = src.find((s) => s.includes(`PieceProps<"${game}">`));
    assert.ok(file, `no piece ${game}`);
    assert.ok(file.includes(`key: "${key}"`), `${game} keeps its ladder elsewhere than ${key}`);
  }
});

test("on every roadmap, a level comes after the levels it builds on that the roadmap also has", () => {
  // A level builds on the levels of its prerequisites taught by its grade or earlier (course.ts, `ready`); a level no
  // syllabus grades, and every level on a hand-made roadmap, builds on all of them.
  const rank = (g: number | null) => g ?? Infinity;
  for (const r of Object.values(ROADMAPS)) {
    const at = new Map<string, number>();
    r.stages.forEach((s, n) => s.items.forEach((i) => isSkill(i) && i.levels.forEach((L) => at.set(cellKey({ skill: i.skill, level: L }), n))));
    for (const [key, n] of at) {
      const [k, L] = [key.split(".")[0] as SkillId, Number(key.split(".")[1]) as 1 | 2 | 3];
      const by = r.order === "list" ? Infinity : rank(gradeOf(k, L));
      for (const pre of PREREQUISITES[k] ?? [])
        for (const M of [1, 2, 3] as const) {
          const m = at.get(cellKey({ skill: pre, level: M }));
          if (m !== undefined && rank(gradeOf(pre, M)) <= by) assert.ok(m <= n, `${r.id}: ${pre} ${M} is after ${key}`);
        }
    }
  }
});

test("the ML roadmap is the course map, and school is grades 1 to 12 level by level", () => {
  assert.deepEqual(ROADMAPS.ml.stages.map((s) => [s.id, s.items.map((i) => isSkill(i) && i.skill)]), STAGES.map((s) => [s.id, [...s.skills]]));
  const school = ROADMAPS.school;
  assert.deepEqual(school.stages.map((s) => s.id), ["1", "2", "3", "4", "5", "6", "7", "8", "10", "12"]);
  for (const s of school.stages) for (const i of s.items) if (isSkill(i)) for (const L of i.levels) assert.equal(String(gradeOf(i.skill, L)), s.id);
  // Comparing numbers: levels 1, 2 and 3 in grades 1, 2 and 7.
  const compare = school.stages.flatMap((s) => s.items.filter((i) => isSkill(i) && i.skill === "compare").map((i) => [s.id, [...(i as { levels: readonly number[] }).levels]]));
  assert.deepEqual(compare, [["1", [1]], ["2", [2]], ["7", [3]]]);
});

test("an item ticks when all its levels are secure or its game is passed; below the learner's grade it is behind", () => {
  const percent = { skill: "percent", levels: [1, 2, 3] } as const;
  const cells: Cells = { [cellKey({ skill: "percent", level: 1 })]: secure };
  assert.equal(itemState(percent, work({})), "open");
  assert.equal(itemState(percent, work(cells)), "part");
  assert.equal(itemState(percent, work({ ...cells, "percent.2": secure, "percent.3": secure })), "done");
  // Placed in grade 8: percentages (grades 5 and 6) are behind.
  assert.equal(itemState(percent, work({}, 8)), "behind");
  assert.equal(itemState({ game: "beSort" }, work({}, null, ["beSort"])), "done");
  assert.equal(itemState({ game: "beSort" }, work({})), "open");
  const f = ROADMAPS.finance;
  assert.deepEqual(progressOf(f.stages[0].items, work({ ...cells, "percent.2": secure, "percent.3": secure })), { done: 1, behind: 0, total: 10 });
});

test("Next on a hand-made roadmap is its first item not done, opened by the practice it waits for", () => {
  const f = ROADMAPS.finance;
  // A newcomer starts finance with its first stage's "What is…?" (#450), then decimals, by the first practice they wait for.
  assert.deepEqual(roadNext(f, work({})), { item: { read: "fractions" } });
  const n = roadNext(f, work({}, null, [], ["fractions"]))!;
  assert.deepEqual([(n.item as { skill: string }).skill, n.level], ["decimals", 1]);
  assert.ok(n.via && work({}).s.ready(n.via.skill, n.via.level), "the step offered can be done now");
  // Placed in grade 12, the school maths is behind: Next is a level of grade 12 or later, or one no syllabus grades.
  const late = roadNext(f, work({}, 12))!;
  const g = isSkill(late.item) ? gradeOf(late.item.skill, late.level!) : null;
  assert.ok(g === null || g >= 12, `${itemId(late.item)} ${late.level} is grade ${g}`);
  // A games-only roadmap stage: the first game not passed.
  const a = ROADMAPS.algorithms;
  const all: Cells = {};
  for (const i of itemsOf(a)) if (isSkill(i)) for (const L of i.levels) all[cellKey({ skill: i.skill, level: L })] = secure;
  assert.deepEqual(roadNext(a, work(all, 13, ["connectTowns", "shortestPath", "beSearch"], ["logic", "discrete", "algorithms"])), { item: { game: "beBinary" } });
});

test("following Next walks every roadmap to the end", () => {
  for (const r of Object.values(ROADMAPS))
    for (const placed of [null, 8] as const) {
      const cells: Cells = {};
      const won: GameId[] = [];
      const read: TopicId[] = [];
      const w0 = () => work(cells, placed, won, read);
      for (let steps = 0, n = roadNext(r, w0()); n; n = roadNext(r, w0()), steps++) {
        assert.ok(steps < 2000, `${r.id} goes round in circles`);
        if (n.via) {
          assert.equal(cells[cellKey(n.via)], undefined, `${r.id}: ${cellKey(n.via)} came twice`);
          cells[cellKey(n.via)] = secure;
        } else if (isRead(n.item)) read.push(n.item.read);
        else won.push((n.item as { game: GameId }).game);
      }
      const w = w0();
      for (const i of itemsOf(r)) {
        // The grade roadmaps leave a level no syllabus grades (the puzzles) to the learner, as the course does.
        if (r.order === "grade" && isSkill(i) && i.levels.some((L) => gradeOf(i.skill, L) === null)) continue;
        assert.ok(["done", "behind"].includes(itemState(i, w)), `${r.id}: ${itemId(i)} left ${itemState(i, w)}`);
      }
    }
});

test("on the ML roadmap Next is the course map's next step", () => {
  for (const placed of [null, 8, 13] as const) {
    const n = roadNext(ROADMAPS.ml, work({}, placed));
    assert.deepEqual(n?.via, nextStep(standing({}, placed)) ?? undefined);
  }
});

test("an item's achieved date is the day its last level was secured, or its game passed", () => {
  const item: Item = { skill: "ratio", levels: [1, 2] };
  assert.equal(achievedAt(item, { "cell:ratio.1": 5 }), undefined);
  assert.equal(achievedAt(item, { "cell:ratio.1": 5, "cell:ratio.2": 9 }), 9);
  assert.equal(achievedAt({ game: "beDp" }, { "ladder:zeno.bedp.v1": 3 }), 3);
  assert.equal(itemId(item), "skill:ratio.12");
  assert.equal(itemId({ skill: "ratio", levels: [1, 2, 3] }), "skill:ratio");
});
