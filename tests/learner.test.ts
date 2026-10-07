// The student's side of the study: verdicts map onto what the server stores, a question nobody tried isn't recorded,
// and the outbox keeps attempts until the server has them, in order, without losing any added while it sends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import { finish, logAnswer, Outbox, startLog, toAttempt, verdictOf, type Attempt, type SendResult, type Slot } from "../src/learner.ts";

const w = en.pracWords;
const student = { code: "ABCD-EFGH", class: "7BXYZ2", condition: "fixed" as const };

const memory = (): Slot & { value: string | null } => {
  const slot = { value: null as string | null, get: () => slot.value, set: (v: string | null) => void (slot.value = v) };
  return slot;
};
const fake = (id: string) => ({ clientId: id }) as Attempt;

test("verdicts", () => {
  assert.equal(verdictOf({ ok: true }), "correct");
  assert.equal(verdictOf({ ok: false, close: true }), "close");
  assert.equal(verdictOf({ ok: false, why: "lowest terms" }), "form");
  assert.equal(verdictOf({ ok: false }), "wrong");
});

test("a question becomes an attempt only once it was tried or revealed", () => {
  const ex = exercise("linear", 1, 7, w);
  const log = startLog(1_000_000, 0);
  assert.equal(toAttempt(log, ex, false, student, 5000), null);

  logAnswer(log, ` ${ex.plain}9 `, check(ex, `${ex.plain}9`, w), 2000);
  const left = toAttempt(log, ex, true, student, 5000, "id-left-1")!;
  assert.equal(left.outcome, "skipped");
  assert.equal(left.msTotal, 5000);
  assert.equal(left.answers[0].input, `${ex.plain}9`);
  assert.equal(left.answers[0].verdict, "wrong");

  logAnswer(log, ex.plain, check(ex, ex.plain, w), 3000);
  finish(log, "solved", 3000);
  finish(log, "revealed", 4000); // the first outcome stands
  log.solutionViewed = true;
  const done = toAttempt(log, ex, false, student, 9000, "id-done-1")!;
  assert.deepEqual(
    { ...done, answers: done.answers.map((a) => a.verdict) },
    { clientId: "id-done-1", student: student.code, skill: "linear", level: 1, seed: 7, review: false, outcome: "solved", solutionViewed: true, msTotal: 3000, answers: ["wrong", "correct"], shownAt: 1_000_000 },
  );

  const revealed = startLog(0, 0);
  finish(revealed, "revealed", 800);
  assert.equal(toAttempt(revealed, ex, false, student, 900)!.outcome, "revealed");
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
