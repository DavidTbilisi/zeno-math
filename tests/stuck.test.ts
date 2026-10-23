// Stuck practice on real answers (src/model/stuck.ts) and the raw ASSISTments attempts it reads (src/model/datasets.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { assistmentsAttempts, csvRecords, type Attempt } from "../src/model/datasets.ts";
import { answerParts, before, curve, curves, earlyWarning, facts, firstStreak, isStuck, nextAnswers, stuckSkills, usualShare, visitsOf } from "../src/model/stuck.ts";

let order = 0;
const attempt = (student: string, skill: string, assignment: string, correct: boolean, more: Partial<Attempt> = {}): Attempt => ({
  order: ++order, student, skill, correct, group: "", assignment, problem: `p${order}`, hints: 0, firstAction: "0", ms: 10000, ...more,
});
/** A visit from a string of 1s (right) and 0s (wrong). */
const visit = (answers: string, student = "s1", skill = "X", assignment = "a1") => [...answers].map((c) => attempt(student, skill, assignment, c === "1"));
const half = () => 0.5;

test("the raw attempts keep the assignment, problem, hints, first action and response time, in the order given", async () => {
  const { read, attempts } = await assistmentsAttempts(csvRecords([[
    "order_id,assignment_id,user_id,problem_id,original,correct,skill_name,hint_count,first_action,ms_first_response",
    "2,7,u1,p9,1,0,Area Rectangle,2,1,4100",
    "1,7,u1,p8,1,1,Area Rectangle,0,0,NA",
    "3,7,u1,p8,0,1,Area Rectangle,0,0,10", // scaffolding: left out
  ].join("\n")]));
  assert.equal(read, 3);
  assert.deepEqual(attempts, [
    { order: 1, student: "u1", skill: "Area Rectangle", correct: true, group: "", assignment: "7", problem: "p8", hints: 0, firstAction: "0", ms: NaN },
    { order: 2, student: "u1", skill: "Area Rectangle", correct: false, group: "", assignment: "7", problem: "p9", hints: 2, firstAction: "1", ms: 4100 },
  ]);
});

test("visits are a student's answers on a skill in one assignment; a visit is stuck after ten answers with no three in a row", () => {
  const a = visit("01"), b = visit("1", "s1", "X", "a2"), c = visit("1", "s2");
  const vs = visitsOf([a[0], b[0], c[0], a[1]]);
  assert.deepEqual(vs.map((v) => v.map((x) => x.order)), [[a[0].order, a[1].order], [b[0].order], [c[0].order]]);
  assert.equal(firstStreak(visit("1101110")), 6);
  assert.equal(firstStreak(visit("110110")), null);
  assert.equal(firstStreak(visit("11"), 2), 2);
  assert.equal(isStuck(visit("000000000")), false, "under ten answers");
  assert.equal(isStuck(visit("0000000000")), true);
  assert.equal(isStuck(visit("00000000000111")), true, "a streak after the tenth answer");
  assert.equal(isStuck(visit("0000000111")), false, "a streak at the tenth");
});

test("a problem's usual share right leaves the answer itself out, and is unknown with too few other answers", () => {
  const p = (correct: boolean) => attempt("s", "X", "a", correct, { problem: "q" });
  const answers = [p(true), p(true), p(false), attempt("s", "X", "a", true, { problem: "rare" })];
  const usual = usualShare(answers, 2);
  assert.equal(usual(answers[0]), 0.5);
  assert.equal(usual(answers[2]), 1);
  assert.ok(Number.isNaN(usual(answers[3])));
  assert.ok(Number.isNaN(usual(attempt("s", "X", "a", true, { problem: "never seen" }))));
});

test("every answer is in the final run, before it, or in a visit with no three in a row", () => {
  const parts = answerParts([visit("0111"), visit("10"), visit("0110111")]);
  assert.deepEqual(parts.map((p) => [p.part, p.answers]), [["final run of right answers", 6], ["before the final run", 5], ["visits with no three in a row", 2]]);
  assert.equal(parts.reduce((s, p) => s + p.share, 0), 1);
});

test("a curve follows a fixed set of visits and leaves out answers whose problem has no usual share", () => {
  const skip = visit("00");
  skip[1].problem = "skip";
  const usual = (a: Attempt) => (a.problem === "skip" ? NaN : 0.5);
  const points = curve("g", [visit("10"), skip, visit("1")], usual, 2);
  assert.deepEqual(points, [
    { group: "g", answer: 1, visits: 2, answers: 2, right: 0.5, usual: 0.5 },
    { group: "g", answer: 2, visits: 2, answers: 1, right: 0, usual: 0.5 },
  ]);
  assert.ok(Number.isNaN(curve("g", [skip], usual, 2)[1].right));
  assert.deepEqual([...new Set(curves([visit("0".repeat(20))], half).map((p) => p.group))], [
    "visits of 10 or more answers", "visits of 20 or more answers", "stuck visits", "stuck visits of 20 or more", "not stuck, 10 or more",
  ]);
});

test("early warning: by the right answers among the first three, a streak by the tenth, stuck, or ended without one", () => {
  const rows = earlyWarning([visit("000111"), visit("0000000000"), visit("00000000000111"), visit("001"), visit("110"), visit("11"), visit("1110")]);
  assert.deepEqual(rows, [
    { firstRight: 0, visits: 3, reached: 1 / 3, stuck: 2 / 3, ended: 0 },
    { firstRight: 1, visits: 1, reached: 0, stuck: 0, ended: 1 },
    { firstRight: 2, visits: 1, reached: 0, stuck: 0, ended: 1 },
  ]);
});

test("the next answer, by what the one before was, in stuck visits and the rest", () => {
  const kinds: Partial<Attempt>[] = [{ correct: true }, { firstAction: "1" }, { firstAction: "2" }, { hints: 1 }, {}];
  assert.deepEqual(kinds.map((k) => before(attempt("s", "X", "a", false, k))), ["right", "hint first", "scaffolding first", "wrong try then hints", "wrong try, no hint"]);
  const stuck = visit("0000000000");
  stuck[1].hints = 2;
  const rest = visit("011");
  rest[2].problem = "skip";
  const rows = nextAnswers([stuck, rest], (a) => (a.problem === "skip" ? NaN : 0.5));
  assert.deepEqual(rows, [
    { visits: "stuck", after: "wrong try, no hint", answers: 8, right: 0, usual: 0.5 },
    { visits: "stuck", after: "wrong try then hints", answers: 1, right: 0, usual: 0.5 },
    { visits: "not stuck", after: "wrong try, no hint", answers: 1, right: 1, usual: 0.5 },
  ]);
});

test("skills by their stuck answers, with each skill's share of visits stuck", () => {
  const rows = stuckSkills([visit("1", "s1", "Area Rectangle"), visit("0000000000", "s2", "Proportion"), visit("1", "s3", "Proportion"), visit("1", "s4", "Circle Graph"), visit("1", "s5", "Circle Graph")]);
  assert.deepEqual(rows.map((r) => [r.skill, r.topic, r.visits, r.stuck, r.answers, r.stuckAnswers, r.shareStuck, r.shareOfStuckAnswers]), [
    ["Proportion", "algebra", 2, 1, 11, 10, 0.5, 1],
    ["Circle Graph", "data", 2, 0, 2, 0, 0, 0],
    ["Area Rectangle", "geometry", 1, 0, 1, 0, 0, 0],
  ]);
  assert.equal(stuckSkills([visit("1")])[0].shareOfStuckAnswers, 0);
});

test("the single figures: the oracle's saving, a streak carried over, stuck visits and students, hints and fast tries", () => {
  const a = visit("0111"), b = visit("10", "s1", "X", "a2"), c = visit("0000000000", "s2"), d = visit("1", "s2", "X", "a3");
  a[0].ms = 1000;
  c[0].firstAction = "1";
  const f = Object.fromEntries(facts([a, b, c, d], half).map((x) => [x.key, x]));
  const value = (key: string) => f[key].value;
  assert.equal(value("oracle"), 3 / 17);
  assert.equal(value("oracle_one_right"), 2 / 17);
  assert.equal(value("after_streak"), 0);
  assert.ok(Number.isNaN(value("after_streak_right")) && f.after_streak_right.n === 0);
  assert.deepEqual([f.carry_yes.value, f.carry_yes.usual, f.carry_yes.n], [1, 0.5, 1]);
  assert.deepEqual([f.carry_no.value, f.carry_no.n], [1, 1]);
  assert.equal(value("stuck_visits"), 1 / 4);
  assert.equal(value("stuck_answers"), 10 / 17);
  assert.deepEqual([f.stuck_right.value, f.stuck_right.n], [0, 10]);
  assert.equal(value("students_stuck"), 1 / 2);
  assert.equal(value("elsewhere_stuck"), 1);
  assert.equal(value("elsewhere_never"), 4 / 6);
  assert.equal(value("hint_first_stuck"), 1 / 10);
  assert.equal(value("hint_first_rest"), 0);
  assert.equal(value("fast_stuck"), 0);
  assert.equal(value("fast_rest"), 1 / 7);
  assert.ok(Object.values(f).every((x) => x.label.length > 0));
});
