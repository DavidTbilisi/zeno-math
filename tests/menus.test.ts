// Every live piece has one place in the toolbar menus, and every ready-made picture one heading in the Shapes panel,
// which follows the menus: none left out in an unsorted heap, none offered twice.
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

test("every ready-made picture is under exactly one heading, and every heading's picture exists", () => {
  const pictures = MENUS.flatMap((m) => m.sections.flatMap((s) => s.shapes ?? []));
  assert.deepEqual(pictures.filter((id, i) => pictures.indexOf(id) !== i), []);
  assert.deepEqual(SHAPES.filter((s) => !s.live && !pictures.includes(s.id)).map((s) => s.id), []);
  const ids = new Set(SHAPES.map((s) => s.id));
  assert.deepEqual(pictures.filter((id) => !ids.has(id) || SHAPES.find((s) => s.id === id)!.live), []);
});

test("a menu with more than one section names each of them", () => {
  for (const m of MENUS) if (m.sections.length > 1) assert.ok(m.sections.every((s) => s.title), m.label);
});
