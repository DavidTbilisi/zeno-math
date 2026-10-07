// Choosing questions: the curriculum covers every skill once with prerequisites first; the fixed sequence walks the
// class's skills level by level and comes round again; the adaptive choice opens everything to a new student, closes
// what builds on a weak prerequisite, aims at about three in four right, moves on once a skill is mastered, goes up
// and down a level, and interleaves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS, type SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM, inCurriculumOrder, PREREQUISITES } from "../src/model/curriculum.ts";
import { EloModel, type Level } from "../src/model/elo.ts";
import { adaptiveChoice, fixedChoice, MASTERED_AT, openSkills, PER_LEVEL, TARGET } from "../src/model/policy.ts";

test("the curriculum has every skill once, each after what it builds on", () => {
  assert.deepEqual([...CURRICULUM].sort(), [...ALL_SKILLS].sort());
  for (const [skill, pres] of Object.entries(PREREQUISITES))
    for (const pre of pres!) {
      assert.ok(ALL_SKILLS.includes(pre), `${skill} needs unknown ${pre}`);
      assert.ok(CURRICULUM.indexOf(pre) < CURRICULUM.indexOf(skill as SkillId), `${pre} must come before ${skill}`);
    }
  assert.deepEqual(inCurriculumOrder(["factor", "times", "nonsense", "times"]), ["times", "factor"]);
});

test("the fixed sequence walks each skill level by level, then comes round again", () => {
  const skills: SkillId[] = ["linear", "expand"];
  const seq = Array.from({ length: 14 }, (_, i) => fixedChoice(skills, i)).map((c) => `${c.skill}${c.level}`);
  assert.equal(PER_LEVEL, 2);
  assert.deepEqual(seq, ["linear1", "linear1", "linear2", "linear2", "linear3", "linear3", "expand1", "expand1", "expand2", "expand2", "expand3", "expand3", "linear1", "linear1"]);
});

const skills: SkillId[] = ["linear", "expand", "factor", "average"];
const answer = (m: EloModel, skill: SkillId, level: Level, correct: boolean, student = "s") => m.update({ student, skill, level, correct });

test("a new student has every skill open; weakness in a prerequisite closes what builds on it", () => {
  const m = new EloModel();
  assert.deepEqual(openSkills(m, "s", skills), skills);
  assert.equal(adaptiveChoice(m, "s", skills, { random: () => 0 }).level, 1); // σ(0.8) ≈ 0.69 is nearest 0.75
  // Misses on linear equations close expanding, which builds on them; averages need nothing in this class and stay open.
  for (let i = 0; i < 4; i++) answer(m, "linear", 2, false);
  const open = openSkills(m, "s", skills);
  assert.ok(open.includes("linear") && open.includes("average"));
  assert.ok(!open.includes("expand"), "expand waits for linear");
  assert.ok(["linear", "average"].includes(adaptiveChoice(m, "s", skills, { random: () => 0 }).skill));
});

test("the adaptive choice aims at the target, moves on after mastery and goes down after misses", () => {
  const m = new EloModel();
  for (let i = 0; i < 30; i++) answer(m, "linear", 3, true);
  assert.ok(m.predict({ student: "s", skill: "linear", level: 3 }) >= MASTERED_AT);
  const open = openSkills(m, "s", skills);
  assert.ok(!open.includes("linear"), "mastered skills are left alone");
  assert.ok(open.includes("expand"), "and what builds on them opens");

  // Of everything open, the choice is the closest to the target.
  const c = adaptiveChoice(m, "s", skills, { random: () => 0 });
  const gap = (skill: SkillId, level: Level) => Math.abs(m.predict({ student: "s", skill, level }) - TARGET);
  for (const k of open) for (const L of [1, 2, 3] as const) assert.ok(gap(c.skill, c.level) <= gap(k, L) + 1e-12);

  // Right answers take a student up a level; misses bring them back down.
  const w = new EloModel();
  const level = () => adaptiveChoice(w, "w", ["average"], { random: () => 0 }).level;
  assert.equal(level(), 1);
  for (let i = 0; i < 4; i++) answer(w, "average", 1, true, "w");
  assert.ok(level() >= 2, "up after right answers");
  for (let i = 0; i < 6; i++) answer(w, "average", 2, false, "w");
  assert.equal(level(), 1, "down after misses");
});

test("recent skills count against a choice, so practice interleaves", () => {
  const m = new EloModel();
  const pick = (recent: SkillId[]) => adaptiveChoice(m, "s", ["linear", "average"], { recent, random: () => 0.5 }).skill;
  assert.equal(pick(["linear", "linear"]), "average");
  assert.equal(pick(["average", "average"]), "linear");
  // Once everything is mastered the choice still comes from the class's skills.
  for (let i = 0; i < 40; i++) answer(m, "linear", 3, true), answer(m, "average", 3, true);
  assert.ok(["linear", "average"].includes(pick([])));
});
