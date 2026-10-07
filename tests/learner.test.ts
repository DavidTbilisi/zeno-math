// The student's side of the study: verdicts map onto what the server stores, a question nobody tried isn't recorded,
// the outbox keeps attempts until the server has them, in order, without losing any added while it sends, and leaving
// a question moves the class plan on (model, fixed-sequence position, recent skills) just as the server will.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import {
  applyAttempt, attemptEvidence, finish, logAnswer, ME, Outbox, startLog, toAttempt, toClassPlan, verdictOf, type Attempt, type Origin, type SendResult,
  type Slot,
} from "../src/learner.ts";
import { EloModel } from "../src/model/elo.ts";

const w = en.pracWords;
const student = { code: "ABCD-EFGH", class: "7BXYZ2", condition: "fixed" as const };

const memory = (): Slot & { value: string | null } => {
  const slot = { value: null as string | null, get: () => slot.value, set: (v: string | null) => void (slot.value = v) };
  return slot;
};
const fake = (id: string) => ({ clientId: id }) as Attempt;
const free: Origin = { policy: "free", review: false, predicted: null };

test("verdicts", () => {
  assert.equal(verdictOf({ ok: true }), "correct");
  assert.equal(verdictOf({ ok: false, close: true }), "close");
  assert.equal(verdictOf({ ok: false, why: "lowest terms" }), "form");
  assert.equal(verdictOf({ ok: false }), "wrong");
});

test("a question becomes an attempt only once it was tried or revealed", () => {
  const ex = exercise("linear", 1, 7, w);
  const log = startLog(1_000_000, 0);
  assert.equal(toAttempt(log, ex, free, student, 5000), null);

  logAnswer(log, ` ${ex.plain}9 `, check(ex, `${ex.plain}9`, w), 2000);
  const left = toAttempt(log, ex, { policy: "review", review: true, predicted: 0.4 }, student, 5000, "id-left-1")!;
  assert.equal(left.outcome, "skipped");
  assert.deepEqual([left.policy, left.review, left.predicted], ["review", true, 0.4]);
  assert.equal(left.msTotal, 5000);
  assert.equal(left.answers[0].input, `${ex.plain}9`);
  assert.equal(left.answers[0].verdict, "wrong");

  logAnswer(log, ex.plain, check(ex, ex.plain, w), 3000);
  finish(log, "solved", 3000);
  finish(log, "revealed", 4000); // the first outcome stands
  log.solutionViewed = true;
  const done = toAttempt(log, ex, { policy: "fixed", review: false, predicted: 0.62 }, student, 9000, "id-done-1")!;
  assert.deepEqual(
    { ...done, answers: done.answers.map((a) => a.verdict) },
    { clientId: "id-done-1", student: student.code, skill: "linear", level: 1, seed: 7, review: false, outcome: "solved", policy: "fixed", predicted: 0.62, solutionViewed: true, msTotal: 3000, answers: ["wrong", "correct"], shownAt: 1_000_000 },
  );

  const revealed = startLog(0, 0);
  finish(revealed, "revealed", 800);
  assert.equal(toAttempt(revealed, ex, free, student, 900)!.outcome, "revealed");
});

test("the outbox sends in order and keeps what the server didn't take", async () => {
  const slot = memory();
  const results: Record<string, SendResult> = { a: "stored", b: "retry", c: "stored" };
  const sent: string[] = [];
  const box = new Outbox(slot, async (x) => (sent.push(x.clientId), results[x.clientId]));
  box.add(fake("a"));
  box.add(fake("b"));
  box.add(fake("c"));
  assert.equal(await box.flush(), 2);
  assert.deepEqual(sent, ["a", "b"]); // stops at the one that has to wait, so the order holds
  results.b = "drop";
  assert.equal(await box.flush(), 0);
  assert.equal(slot.value, null);
});

test("the outbox survives a failing network and keeps attempts added mid-send", async () => {
  const slot = memory();
  let release!: () => void;
  const gate = new Promise<void>((ok) => (release = ok));
  const box = new Outbox(slot, async (x) => {
    if (x.clientId === "slow") await gate;
    if (x.clientId === "boom") throw new TypeError("Failed to fetch");
    return "stored";
  });
  box.add(fake("slow"));
  const first = box.flush();
  box.add(fake("late"));
  const second = box.flush(); // waits for the first instead of sending "slow" twice
  release();
  await first;
  assert.equal(await second, 0);

  box.add(fake("boom"));
  assert.equal(await box.flush(), 1);
  assert.deepEqual(box.items().map((x) => x.clientId), ["boom"]);
  box.discard("nobody");
  assert.equal(box.items().length, 1);
});

test("leaving a question moves the class plan on the way the server will", () => {
  const plan = toClassPlan({ condition: "fixed", skills: ["linear", "expand"], position: 4, recent: ["linear", "linear", "expand"], state: new EloModel().state() });
  const base = { clientId: "x", student: student.code, level: 2 as const, seed: 1, review: false, solutionViewed: false, msTotal: 1, shownAt: 0, predicted: 0.5 };
  const right: Attempt = { ...base, skill: "linear", outcome: "solved", policy: "fixed", answers: [{ input: "3", verdict: "correct", ms: 1 }] };
  const before = plan.model.predict({ student: ME, skill: "linear", level: 2 });
  applyAttempt(plan, right);
  assert.equal(plan.position, 5);
  assert.deepEqual(plan.recent, ["linear", "expand", "linear"]);
  assert.ok(plan.model.predict({ student: ME, skill: "linear", level: 2 }) > before);
  // A free question teaches the model but doesn't move the fixed sequence; form messages alone teach nothing.
  const formOnly: Attempt = { ...base, skill: "expand", outcome: "skipped", policy: "free", answers: [{ input: "6/2", verdict: "form", ms: 1 }] };
  const state = JSON.stringify(plan.model.state());
  applyAttempt(plan, formOnly);
  assert.equal(plan.position, 5);
  assert.equal(JSON.stringify(plan.model.state()), state);
  assert.equal(attemptEvidence(formOnly), null);
  assert.equal(attemptEvidence({ ...formOnly, outcome: "revealed", answers: [] }), false);
  assert.equal(attemptEvidence({ ...right, answers: [{ input: "6/2", verdict: "form", ms: 1 }, ...right.answers] }), true);
});
