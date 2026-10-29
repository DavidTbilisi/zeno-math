// Choosing questions: the curriculum covers every skill once with prerequisites first; the fixed sequence walks the
// class's skills level by level and comes round again; the adaptive choice opens everything to a new student, closes
// what builds on a weak prerequisite, aims at about three in four right, moves on once a skill is mastered, goes up
// and down a level, and interleaves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS, type SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM, gradeOf, GRADES, inCurriculumOrder, LATER, PREREQUISITES, skillsOfGrade, skillsOfYear, SYLLABUS, YEARS } from "../src/model/curriculum.ts";
import { EloModel, type Level } from "../src/model/elo.ts";
import { SKILL_IDEAS } from "../src/model/ideaState.ts";
import {
  adaptiveChoice, choose, EMA, EMA_MASTERED_AT, fixedChoice, IDEAS_MASTERED_AT, isMastered, learnEma, MASTERED_AT, openSkills, PER_LEVEL, TARGET, type ChanceModel, type EmaState,
} from "../src/model/policy.ts";

test("the curriculum has every skill once, each after what it builds on", () => {
  assert.deepEqual([...CURRICULUM].sort(), [...ALL_SKILLS].sort());
  for (const [skill, pres] of Object.entries(PREREQUISITES))
    for (const pre of pres!) {
      assert.ok(ALL_SKILLS.includes(pre), `${skill} needs unknown ${pre}`);
      assert.ok(CURRICULUM.indexOf(pre) < CURRICULUM.indexOf(skill as SkillId), `${pre} must come before ${skill}`);
    }
  assert.deepEqual(inCurriculumOrder(["factor", "times", "nonsense", "times"]), ["times", "factor"]);
});

test("the adaptive choice reaches every skill, each once what it builds on is mastered", () => {
  // A learner who masters whatever is open: each round opens the skills whose prerequisites are all mastered.
  const known = new Set<SkillId>();
  const model: ChanceModel = { predictAt: (_student, skill) => (known.has(skill as SkillId) ? 0.99 : 0.1) };
  const rounds: SkillId[][] = [];
  while (known.size < CURRICULUM.length) {
    const open = openSkills(model, "s", CURRICULUM);
    for (const k of open) assert.ok((PREREQUISITES[k] ?? []).every((pre) => known.has(pre)), `${k} opened before what it builds on`);
    open.forEach((k) => known.add(k));
    rounds.push(open);
  }
  // The longest chain runs from comparing numbers to eigenvalues, through vectors, matrices and elimination;
  // backpropagation, on descent, is one round before.
  assert.equal(rounds.length, 11);
  assert.deepEqual(rounds.at(-1), ["eigen"]);
  assert.ok(rounds.at(-2)!.includes("backprop"));
});

test("skills are tagged with the years of the primary syllabus their levels belong to", () => {
  for (const [skill, years] of Object.entries(SYLLABUS)) {
    assert.ok(ALL_SKILLS.includes(skill as SkillId), skill);
    assert.ok(years!.some((y) => y !== null), `${skill} has no level in the syllabus`);
  }
  for (const y of YEARS) assert.ok(skillsOfYear(y).length >= 3, `P${y}`);
  assert.deepEqual(skillsOfYear(1), ["quickLook", "compare", "estimateLine", "closerTo", "makeTarget", "kakooma"]);
  assert.deepEqual(skillsOfYear(6).filter((k) => ["ratio", "percent", "balance", "average", "rate"].includes(k)), ["percent", "ratio", "average", "balance"]);
  // The secondary topics and graph theory are not on it.
  for (const k of ["integers", "primes", "linear", "oneStroke", "probability"] as const) assert.equal(SYLLABUS[k], undefined);
});

test("every level has a grade, from grade 1 to university, agreeing with the primary syllabus", () => {
  const levels = [1, 2, 3] as const;
  // The primary years are the first six grades, unchanged.
  for (const y of YEARS) assert.deepEqual(skillsOfGrade(y), skillsOfYear(y), `grade ${y}`);
  for (const [skill, grades] of Object.entries(LATER)) {
    const k = skill as SkillId;
    assert.ok(ALL_SKILLS.includes(k), skill);
    // A later grade only where the primary syllabus has none.
    levels.forEach((L, i) => grades![i] !== null && assert.equal(SYLLABUS[k]?.[i] ?? null, null, `${skill} level ${L}`));
  }
  for (const k of CURRICULUM) {
    const gs = levels.map((L) => gradeOf(k, L));
    // A harder level never belongs to an earlier grade, except where the syllabus orders its topics otherwise: the
    // area of a triangle (P5) before that of a rectilinear figure (P4), the LCM (grade 7) before common factors (P4).
    const ordered = gs.filter((g) => g !== null).every((g, i, a) => i === 0 || a[i - 1]! <= g!);
    assert.equal(ordered, !["shapeArea", "hcf"].includes(k), `${k}: ${gs.join(", ")}`);
  }
  // Only the puzzles no syllabus here teaches have no grade at all; bounds is the one level left out.
  assert.deepEqual(CURRICULUM.filter((k) => levels.every((L) => gradeOf(k, L) === null)), ["oneStroke", "colouring", "shortestPath", "spanningTree", "parity", "inversions"]);
  assert.deepEqual(CURRICULUM.flatMap((k) => levels.filter((L) => gradeOf(k, L) === null && levels.some((M) => gradeOf(k, M) !== null)).map((L) => `${k}${L}`)), ["rounding3"]);
  for (const g of GRADES) assert.ok(skillsOfGrade(g).length >= 3, `grade ${g}`);
  assert.deepEqual(skillsOfGrade(13), ["numroots", "numint", "ci", "correlation", "matrices", "determinant", "elimination", "eigen", "descent", "backprop", "softmax", "overfitting", "precision", "clustering"]);
  assert.deepEqual([gradeOf("quadratic", 1), gradeOf("quadratic", 3), gradeOf("vectors", 1), gradeOf("vectors", 2)], [8, 10, 10, 12]);
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

test("with an unlock floor, a prerequisite holds a skill back only once the student is below a newcomer there", () => {
  // A model whose students start below an even chance: 0.4 on everything, and lower where a student has shown weakness.
  const chance = (weak: SkillId | null) => ({ predictAt: (_student: string, skill: string) => (skill === weak ? 0.3 : 0.4) });
  const newcomer = () => 0.4;
  const skills: SkillId[] = ["fractions", "linear", "expand"];
  assert.deepEqual(openSkills(chance(null), "s", skills), ["fractions"], "without a floor, 0.4 is below the bar of 0.5");
  assert.deepEqual(openSkills(chance(null), "s", skills, { unlockFloor: newcomer }), skills, "a newcomer's chance is no weakness");
  assert.deepEqual(openSkills(chance("linear"), "s", skills, { unlockFloor: newcomer }), ["fractions", "linear"], "below the newcomer on linear closes expand");
  // A floor above UNLOCK_AT changes nothing: the bar is never higher than 0.5.
  assert.deepEqual(openSkills({ predictAt: () => 0.55 }, "s", skills, { unlockFloor: () => 0.9 }), skills);
  assert.equal(adaptiveChoice(chance("linear"), "s", skills, { unlockFloor: newcomer, random: () => 0.5 }).skill !== "expand", true);
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

test("given the student's evidence on a skill, mastery also needs its moving average and, on a skill of ideas, every idea", () => {
  // Without that evidence (the simulations) the model's chance on a hard question decides alone, as before.
  assert.equal(isMastered("linear", MASTERED_AT), true);
  assert.equal(isMastered("linear", MASTERED_AT - 0.01, { ema: { linear: 1 } }), false, "the gates never close a skill sooner");
  // The moving average starts below its threshold: no skill is mastered without answers on it, however strong the
  // student is elsewhere. On ASSISTments' fit two right in a row reach it, and a miss drops it back.
  const ema: EmaState = {};
  assert.ok(EMA.start < EMA_MASTERED_AT);
  assert.equal(isMastered("linear", 0.99, { ema }), false);
  learnEma(ema, "linear", true);
  assert.equal(isMastered("linear", 0.99, { ema }), false);
  learnEma(ema, "linear", true);
  assert.equal(isMastered("linear", 0.99, { ema }), true);
  learnEma(ema, "linear", false);
  assert.equal(isMastered("linear", 0.99, { ema }), false);

  // On a skill made of ideas every idea must be likely known together: sixteen at 0.9 each are not (0.9^16 ≈ 0.19).
  const sure = { fractions: 1, linear: 1 };
  const all = (p: number) => Object.fromEntries(SKILL_IDEAS.fractions.map((id) => [id, p]));
  assert.equal(isMastered("fractions", 0.99, { ema: sure }), true, "without the ideas, no idea gate");
  assert.equal(isMastered("fractions", 0.99, { ema: sure, ideas: {} }), false);
  assert.equal(isMastered("fractions", 0.99, { ema: sure, ideas: all(0.9) }), false);
  assert.ok(0.999 ** SKILL_IDEAS.fractions.length >= IDEAS_MASTERED_AT);
  assert.equal(isMastered("fractions", 0.99, { ema: sure, ideas: all(0.999) }), true);
  assert.equal(isMastered("fractions", 0.99, { ema: sure, ideas: { ...all(0.999), equivalent: 0.5 } }), false, "one weak idea holds it open");
  assert.equal(isMastered("linear", 0.99, { ema: sure, ideas: {} }), true, "a skill without ideas has no idea gate");

  // The policy leaves behind only what passes every gate.
  const strong: ChanceModel = { predictAt: () => 0.99 };
  assert.deepEqual(openSkills(strong, "s", ["linear", "fractions"], { ema: sure, ideas: {} }), ["fractions"]);
  assert.equal(adaptiveChoice(strong, "s", ["linear", "fractions"], { ema: sure, ideas: {}, random: () => 0 }).skill, "fractions");
});

test("given the student's ideas, a skill made of ideas is aimed at the one they are least likely to know", () => {
  const m = new EloModel();
  const ideas = { equivalent: 0.1, part: 0.9 };
  assert.deepEqual(adaptiveChoice(m, "s", ["fractions"], { random: () => 0, ideas }), { skill: "fractions", level: 1, idea: "equivalent" });
  assert.deepEqual(choose("adaptive", m, "s", ["fractions"], 0, { random: () => 0, ideas }), { skill: "fractions", level: 1, idea: "equivalent" });
  // Without the ideas, or on a skill without a graph, or in the fixed sequence, no idea is named.
  assert.deepEqual(adaptiveChoice(m, "s", ["fractions"], { random: () => 0 }), { skill: "fractions", level: 1 });
  assert.deepEqual(adaptiveChoice(m, "s", ["linear"], { random: () => 0, ideas }), { skill: "linear", level: 1 });
  assert.deepEqual(choose("fixed", m, "s", ["fractions"], 0, { ideas }), { skill: "fractions", level: 1 });
  // A new student's ideas are all level: the idea is one of the skill's, at random.
  assert.equal(adaptiveChoice(m, "s", ["times"], { random: () => 0.99, ideas: {} }).idea, "multiplyLong");
});
