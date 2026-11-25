// Payments for lessons (#757): the sums (lessons attended × price, payments, balance per student and per class, a
// month and all months) and the routes that keep the register, with who may read and change it.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isAmount, isDay, money, monthOf, parseMoney, payLine, paySummary, type Payment, type RegisterLesson } from "../src/model/payments.ts";
import { startServer } from "../scripts/dry-run-study.ts";

const lessons: RegisterLesson[] = [
  { id: 1, day: "2026-10-28", price: 2000, present: ["s1", "s2"] },
  { id: 2, day: "2026-11-04", price: 2500, present: ["s1", "s2"] },
  { id: 3, day: "2026-11-11", price: 2500, present: ["s1"] },
];
const payments: Payment[] = [
  { id: 1, student: "s1", amount: 2000, day: "2026-10-30", note: "" },
  { id: 2, student: "s1", amount: 5000, day: "2026-11-11", note: "cash" },
  { id: 3, student: "s2", amount: 1000, day: "2026-11-05", note: "" },
  { id: 4, student: "s9", amount: 9999, day: "2026-11-05", note: "not in the class" },
];

test("a student owes the price of each lesson they came to, at that lesson's price", () => {
  assert.deepEqual(payLine("s1", lessons, payments), { attended: 3, due: 7000, paid: 7000, owed: 0 });
  assert.deepEqual(payLine("s2", lessons, payments), { attended: 2, due: 4500, paid: 1000, owed: 3500 });
  assert.deepEqual(payLine("s3", lessons, payments), { attended: 0, due: 0, paid: 0, owed: 0 });
  // Paid ahead: the balance goes below 0.
  assert.equal(payLine("s1", lessons.slice(0, 1), payments).owed, -5000);
});

test("the month's view and all months, per student and for the class", () => {
  const sum = paySummary(["s1", "s2", "s3"], lessons, payments, "2026-11");
  assert.deepEqual(sum.students.s1.month, { attended: 2, due: 5000, paid: 5000, owed: 0 });
  assert.deepEqual(sum.students.s2.month, { attended: 1, due: 2500, paid: 1000, owed: 1500 });
  assert.deepEqual(sum.students.s2.all, { attended: 2, due: 4500, paid: 1000, owed: 3500 });
  // The class is the sum of its own students: s9's payment is not the class's.
  assert.deepEqual(sum.class.month, { attended: 3, due: 7500, paid: 6000, owed: 1500, lessons: 2 });
  assert.deepEqual(sum.class.all, { attended: 5, due: 11500, paid: 8000, owed: 3500, lessons: 3 });
  assert.equal(paySummary([], lessons, payments, "2025-01").class.month.lessons, 0);
});

test("dates, amounts and money as typed and shown", () => {
  assert.ok(isDay("2026-02-28") && !isDay("2026-02-30") && !isDay("2026-13-01") && !isDay("26-1-1") && !isDay(20260101));
  assert.ok(isAmount(0) && isAmount(2500) && !isAmount(-1) && !isAmount(2.5) && !isAmount(1e9) && !isAmount("25"));
  assert.equal(monthOf("2026-11-25"), "2026-11");
  assert.equal(parseMoney("25"), 2500);
  assert.equal(parseMoney(" 12,5 "), 1250);
  assert.equal(parseMoney("12.05"), 1205);
  for (const bad of ["", "abc", "-5", "1.234", "12345678"]) assert.equal(parseMoney(bad), null, bad);
  assert.match(money(2500, "USD", "en"), /^\$25$/);
  assert.match(money(1250, "USD", "en"), /^\$12\.50$/);
  // A code the browser does not know as a currency still shows the number.
  assert.equal(money(1250, "??", "en"), "12.50 ??");
  assert.equal(money(2500, "??", "en"), "25 ??");
});

const dir = mkdtempSync(join(tmpdir(), "zeno-payments-"));
let server: Awaited<ReturnType<typeof startServer>>;
before(async () => (server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), "chalk")));
after(async () => {
  await server.stop();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const call = async (method: string, path: string, body?: unknown, teacher = true) => {
  const res = await fetch(server.base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(teacher ? { "X-Teacher-Password": "chalk" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
};

test("the teacher keeps the register and the payments, and each student sees only their own", async () => {
  const klass = (await call("POST", "/api/classes", { name: "Evening group" })).body.code as string;
  const join = async () => (await call("POST", "/api/students", { class: klass }, false)).body.code as string;
  const [ana, beka] = [await join(), await join()];
  const dash = (await call("GET", `/api/research/dashboard?class=${klass}`)).body as { students: { id: string; code: string }[] };
  const id = (code: string) => dash.students.find((s) => s.code === code)!.id;
  const [a, b] = [id(ana), id(beka)];
  const enc = encodeURIComponent(klass);

  // Nothing kept yet: the student's site shows nothing.
  assert.equal((await call("GET", `/api/students/${ana}`, undefined, false)).body.pay, null);
  // No price, no lesson.
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { day: "2026-11-04", present: [a] })).status, 409);
  assert.equal((await call("POST", `/api/classes/${enc}/price`, { price: 25.5 })).status, 400);
  assert.equal((await call("POST", `/api/classes/${enc}/price`, { price: 2000, currency: "gel" })).status, 400);
  assert.deepEqual((await call("POST", `/api/classes/${enc}/price`, { price: 2000 })).body, { price: 2000, currency: "GEL" });

  const first = await call("POST", `/api/classes/${enc}/register`, { day: "2026-11-04", present: [a, b] });
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, { id: first.body.id, day: "2026-11-04", price: 2000, present: [a, b] });
  // A new price counts from the next lesson; the first keeps its own.
  await call("POST", `/api/classes/${enc}/price`, { price: 2500, currency: "USD" });
  const second = (await call("POST", `/api/classes/${enc}/register`, { day: "2026-11-11", present: [a] })).body;
  assert.equal(second.price, 2500);
  // Bad dates and strangers are refused.
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { day: "2026-11-31", present: [] })).status, 400);
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { day: "2026-11-12", present: ["s999"] })).status, 400);
  // Beka came to the second lesson after all; then Ana's ticks are fixed back.
  const fixed = await call("POST", `/api/classes/${enc}/register`, { id: second.id, day: "2026-11-11", present: [a, b, b] });
  assert.equal(fixed.status, 200);
  assert.deepEqual([...fixed.body.present].sort(), [a, b].sort());

  const paid = await call("POST", `/api/classes/${enc}/payments`, { student: a, amount: 4500, day: "2026-11-11", note: " cash " });
  assert.equal(paid.status, 201);
  assert.equal(paid.body.note, "cash");
  assert.equal((await call("POST", `/api/classes/${enc}/payments`, { student: a, amount: 0, day: "2026-11-11" })).status, 400);
  assert.equal((await call("POST", `/api/classes/${enc}/payments`, { student: "s999", amount: 100, day: "2026-11-11" })).status, 400);
  const mistake = (await call("POST", `/api/classes/${enc}/payments`, { student: b, amount: 100, day: "2026-11-12" })).body;
  assert.equal((await call("POST", `/api/classes/${enc}/payments`, { id: mistake.id, remove: true })).status, 204);
  assert.equal((await call("POST", `/api/classes/${enc}/payments`, { id: mistake.id, remove: true })).status, 404);

  const all = (await call("GET", `/api/classes/${enc}/payments`)).body;
  assert.equal(all.price, 2500);
  assert.equal(all.currency, "USD");
  assert.equal(all.lessons.length, 2);
  assert.equal(all.payments.length, 1);
  const sum = paySummary([a, b], all.lessons, all.payments, "2026-11");
  assert.deepEqual(sum.class.all, { attended: 4, due: 9000, paid: 4500, owed: 4500, lessons: 2 });

  // Each student sees their own line: Ana has paid, Beka has not.
  assert.deepEqual((await call("GET", `/api/students/${ana}`, undefined, false)).body.pay,
    { attended: 2, due: 4500, paid: 4500, owed: 0, currency: "USD", lastPaid: "2026-11-11" });
  assert.deepEqual((await call("GET", `/api/students/${beka}`, undefined, false)).body.pay,
    { attended: 2, due: 4500, paid: 0, owed: 4500, currency: "USD", lastPaid: null });

  // Without the teacher's word, nobody reads or changes a class's payments.
  assert.equal((await call("GET", `/api/classes/${enc}/payments`, undefined, false)).status, 403);
  assert.equal((await call("POST", `/api/classes/${enc}/payments`, { student: b, amount: 100, day: "2026-11-12" }, false)).status, 403);
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { id: second.id, remove: true }, false)).status, 403);

  // A lesson taken out of the register no longer counts.
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { id: second.id, remove: true })).status, 204);
  assert.equal((await call("GET", `/api/students/${beka}`, undefined, false)).body.pay.due, 2000);
  assert.equal((await call("POST", `/api/classes/${enc}/register`, { id: second.id, remove: true })).status, 404);
});

test("a class nobody joined can still be deleted with lessons in its register", async () => {
  const klass = (await call("POST", "/api/classes", { name: "Empty" })).body.code as string;
  await call("POST", `/api/classes/${klass}/price`, { price: 1000 });
  assert.equal((await call("POST", `/api/classes/${klass}/register`, { day: "2026-11-04", present: [] })).status, 201);
  assert.equal((await call("DELETE", `/api/classes/${klass}`)).status, 204);
});
