// The home page's board orders: newest first under age headings, or by name with untitled boards last.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ageOf, sortBoards } from "../src/boardSort.ts";

const DAY = 24 * 60 * 60 * 1000;
// Noon, so "today" reaches back twelve hours and no further.
const now = new Date(2026, 10, 17, 12, 0).getTime();
const board = (id: string, title: string, updatedAgo: number, createdAgo: number) => ({ id, title, updatedAt: now - updatedAgo, createdAt: now - createdAgo });
const o = { now, locale: "en", untitled: "Untitled board" };

test("ages follow the calendar: today until midnight, then the past 7 and 30 days", () => {
  assert.equal(ageOf(now - 11 * 60 * 60 * 1000, now), "today");
  assert.equal(ageOf(now - 13 * 60 * 60 * 1000, now), "week");
  assert.equal(ageOf(now - 6 * DAY, now), "week");
  assert.equal(ageOf(now - 8 * DAY, now), "month");
  assert.equal(ageOf(now - 29 * DAY, now), "month");
  assert.equal(ageOf(now - 31 * DAY, now), "older");
});

const boards = [
  board("a", "Algorithms", 19 * DAY, 20 * DAY),
  board("u", "Untitled board", 60 * 1000, 40 * DAY),
  board("e", "experiments", 10 * DAY, 2 * DAY),
  board("c", "Course: Number", 3 * DAY, 3 * DAY),
  board("b", "", 90 * DAY, 90 * DAY),
];

test("last changed: newest first, one run per age, no empty runs", () => {
  const runs = sortBoards(boards, "recent", o);
  assert.deepEqual(runs.map((r) => [r.age, r.boards.map((b) => b.id).join("")]), [["today", "u"], ["week", "c"], ["month", "ea"], ["older", "b"]]);
});

test("created: the same, by when each board was made", () => {
  const runs = sortBoards(boards, "created", o);
  assert.deepEqual(runs.map((r) => [r.age, r.boards.map((b) => b.id).join("")]), [["week", "ec"], ["month", "a"], ["older", "ub"]]);
});

test("name: A to Z ignoring case, untitled and blank boards last, one run without a heading", () => {
  const runs = sortBoards(boards, "name", o);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].age, undefined);
  assert.deepEqual(runs[0].boards.map((b) => b.id), ["a", "c", "e", "u", "b"]);
});

test("no boards, no runs", () => {
  for (const s of ["recent", "created", "name"] as const) assert.deepEqual(sortBoards([], s, o), []);
});
