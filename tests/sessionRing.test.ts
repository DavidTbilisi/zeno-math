// The practice page's session (issue #284): five or ten questions, as the student chose, kept in this browser; and the
// stretch of answering that brings the break prompt after about 25 minutes, where a gap of five minutes was a break.
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as { localStorage?: Partial<Storage> }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { AWAY, BREAK_AFTER, breakDue, keepLength, readLength, sessionLength, stretchAfter } = await import("../src/math/sessionPace.ts");

const min = 60_000;

test("only a stored '5' is five; nothing stored, or anything else, is ten", () => {
  assert.equal(readLength(null), 10);
  assert.equal(readLength("10"), 10);
  assert.equal(readLength("7"), 10);
  assert.equal(readLength("5"), 5);
});

test("five is kept in this browser, and ten again forgets it", () => {
  assert.equal(sessionLength(), 10);
  keepLength(5);
  assert.equal(sessionLength(), 5);
  keepLength(10);
  assert.equal(sessionLength(), 10);
  assert.equal(store.size, 0);
});

test("answers close together make one stretch; the prompt comes at 25 minutes, not before", () => {
  let s = stretchAfter(null, 0);
  for (let t = 4 * min; t < BREAK_AFTER; t += 4 * min) s = stretchAfter(s, t);
  assert.equal(breakDue(s), false);
  s = stretchAfter(s, BREAK_AFTER);
  assert.equal(breakDue(s), true);
  assert.equal(breakDue(null), false);
});

test("a gap of more than five minutes was a break: the next answer starts a new stretch", () => {
  let s = stretchAfter(null, 0);
  for (let t = 4 * min; t <= 24 * min; t += 4 * min) s = stretchAfter(s, t);
  s = stretchAfter(s, 24 * min + AWAY + 1);
  assert.deepEqual(s, { since: 24 * min + AWAY + 1, last: 24 * min + AWAY + 1 });
  assert.equal(breakDue(stretchAfter(s, s.last + 4 * min)), false);
});
