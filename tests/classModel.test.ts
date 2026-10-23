// The learner model as the app runs it (src/model/classModel.ts): weights from a simulated class to start, the
// student's records moving with every answer, the weights fitted again as answers come, and the state the browser
// carries on from (src/model/logistic.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ClassModel, FIRST_FIT, priorState, REFIT_GROWTH } from "../src/model/classModel.ts";
import type { Observation } from "../src/model/elo.ts";
import { LogisticModel, newcomerChance } from "../src/model/logistic.ts";

const answer = (student: string, skill: string, correct: boolean, level: 1 | 2 | 3 = 2): Observation => ({ student, skill, level, correct });

test("the starting weights come from a simulated class, once, and keep a new skill's levels in order", () => {
  const prior = priorState();
  assert.equal(priorState(), prior, "fitted once");
  assert.deepEqual(prior.students, {});
  assert.ok(typeof prior.weights["e:linear:2"] === "number" && prior.weights.lv < 0, "a higher level is harder");
  const m = LogisticModel.fromState(prior);
  // "inequalities" came after the simulated skills, so only the shared weights speak for it.
  for (const skill of ["linear", "inequalities"]) {
    const p = m.mastery("new", skill).p;
    assert.ok(p[1] > p[2] && p[2] > p[3], `${skill}: ${p[1]} ${p[2]} ${p[3]}`);
  }
  assert.equal(newcomerChance(m)("linear"), m.predictAt("anyone new", "linear", 2));
});

test("every answer moves the student's records at once; the weights are fitted again at FIRST_FIT answers and by REFIT_GROWTH after", () => {
  const m = new ClassModel();
  const before = m.predictAt("a", "linear", 2);
  m.update(answer("a", "linear", true));
  m.update(answer("a", "linear", true));
  assert.ok(m.predictAt("a", "linear", 2) > before, "right answers raise the chance at once");
  assert.equal(m.fittedOn, 0);
  assert.deepEqual(m.state([]).weights, priorState().weights, "no fit before FIRST_FIT answers");
  const records = JSON.stringify(m.state(["a"]).students);
  // A class that gets everything on "linear" wrong, until the first fit.
  for (let i = 2; i < FIRST_FIT; i++) m.update(answer(`s${i % 20}`, "linear", false));
  assert.equal(m.fittedOn, FIRST_FIT);
  assert.ok(m.state([]).weights["e:linear:2"] < priorState().weights["e:linear:2"], "linear is harder than the simulated class said");
  assert.equal(JSON.parse(JSON.stringify(m.state(["a"]).students)).a.answers, JSON.parse(records).a.answers, "the records survive the fit");
  for (let i = FIRST_FIT; i < Math.ceil(FIRST_FIT * REFIT_GROWTH) - 1; i++) m.update(answer("b", "expand", true));
  assert.equal(m.fittedOn, FIRST_FIT);
  m.update(answer("b", "expand", true));
  assert.equal(m.fittedOn, Math.ceil(FIRST_FIT * REFIT_GROWTH));
  assert.equal(m.state([]).answers.linear, FIRST_FIT);
  const mastery = m.mastery("b", "expand");
  assert.equal(mastery.n, Math.ceil(FIRST_FIT * REFIT_GROWTH) - FIRST_FIT);
  assert.ok(mastery.p[2] > 0.5 && m.predict(answer("b", "expand", false)) === mastery.p[2]);
});

test("the state is plain JSON the browser carries on from, with only the students asked for", () => {
  const m = new ClassModel();
  for (const [s, k, c, l] of [["a", "linear", true, 1], ["a", "expand", false, 3], ["b", "linear", true, 2], ["a", "linear", true, 2]] as const) m.update(answer(s, k, c, l));
  const state = JSON.parse(JSON.stringify(m.state(["a"])));
  assert.deepEqual(Object.keys(state.students), ["a"]);
  assert.equal(state.students.a.answers, 3);
  assert.deepEqual(state.students.a.skills.linear.slice(0, 2), [2, 0]);
  assert.equal(state.students.a.skills.linear[3], 2, "linear was last practised at a's third answer");
  assert.deepEqual(state.answers, { linear: 3, expand: 1 });
  const browser = LogisticModel.fromState(state);
  for (const [k, l] of [["linear", 2], ["expand", 3], ["factor", 1]] as const) assert.equal(browser.predictAt("a", k, l), m.predictAt("a", k, l), `${k} ${l}`);
  // The browser goes on learning from the student's answers as the server will.
  browser.update(answer("a", "expand", true, 3));
  m.update(answer("a", "expand", true, 3));
  assert.equal(browser.predictAt("a", "expand", 2), m.predictAt("a", "expand", 2));
  assert.deepEqual(new ClassModel({ start: state, name: "from a state" }).state(["a"]).students, {}, "a start's students are not carried");
});
