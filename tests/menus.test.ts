// Every live piece has one place in the toolbar menus (and so in the Shapes panel, which follows them): none left out
// in an unsorted heap, none offered twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLiveEntry, MENUS } from "../src/menus.ts";
import { LIVE_SIZES } from "../src/math/live.ts";
import { SHAPES } from "../src/math/shapes.ts";

const placed = MENUS.flatMap((m) => m.sections.flatMap((s) => s.items.filter(isLiveEntry).map((e) => e.live)));

test("every live piece is in exactly one menu section", () => {
  const twice = placed.filter((k, i) => placed.indexOf(k) !== i);
  assert.deepEqual(twice, []);
  const missing = Object.keys(LIVE_SIZES).filter((k) => !placed.includes(k as never));
  assert.deepEqual(missing, []);
});

test("every piece in a menu has a Shapes panel tile, which gives it its name", () => {
  const tiles = new Set(SHAPES.map((s) => s.live).filter(Boolean));
  assert.deepEqual(placed.filter((k) => !tiles.has(k)), []);
});

test("a menu with more than one section names each of them", () => {
  for (const m of MENUS) if (m.sections.length > 1) assert.ok(m.sections.every((s) => s.title), m.label);
});
