// The right-click panel's hit test and placement: the topmost wanted item wins, turned items are hit where they are
// drawn, deleted and locked ones never; the panel sits beside the item and inside the window.
import { test } from "node:test";
import assert from "node:assert/strict";
import { contains, itemAt, panelPlace, type HitElement } from "../src/live/hit.ts";

const box = (id: string, x: number, y: number, width: number, height: number, more: Partial<HitElement> = {}): HitElement & { ours: boolean } =>
  ({ id, x, y, width, height, angle: 0, ours: true, ...more });

test("the topmost wanted item under the point", () => {
  const els = [box("under", 0, 0, 100, 100), box("over", 50, 50, 100, 100), { ...box("arrow", 0, 0, 200, 200), ours: false }];
  const ours = (e: { ours: boolean }) => e.ours;
  assert.equal(itemAt(els, 75, 75, ours)?.id, "over");
  assert.equal(itemAt(els, 25, 25, ours)?.id, "under");
  assert.equal(itemAt(els, 180, 180, ours), undefined); // only the arrow is there
  assert.equal(itemAt(els, 75, 75, () => true)?.id, "arrow");
  assert.equal(itemAt([box("gone", 0, 0, 10, 10, { isDeleted: true })], 5, 5, ours), undefined);
  assert.equal(itemAt([box("locked", 0, 0, 10, 10, { locked: true })], 5, 5, ours), undefined);
});

test("a turned item is hit where it is drawn", () => {
  // A 200 × 20 bar turned a quarter: it now stands upright about its centre (100, 10).
  const bar = box("bar", 0, 0, 200, 20, { angle: Math.PI / 2 });
  assert.ok(contains(bar, 100, 90));
  assert.ok(!contains(bar, 180, 10));
  assert.ok(contains(box("flat", 0, 0, 200, 20), 180, 10));
});

test("the panel goes beside the item, inside the window", () => {
  const view = { w: 1200, h: 800 };
  const panel = { w: 300, h: 400 };
  assert.deepEqual(panelPlace({ left: 100, top: 100, right: 400, bottom: 300 }, panel, view), { left: 412, top: 100 });
  // No room on the right: on the left.
  assert.deepEqual(panelPlace({ left: 700, top: 100, right: 1000, bottom: 300 }, panel, view), { left: 388, top: 100 });
  // No room either side: against the window's right edge; low items move up so the panel fits.
  assert.deepEqual(panelPlace({ left: 50, top: 600, right: 1150, bottom: 790 }, panel, view), { left: 892, top: 392 });
  assert.deepEqual(panelPlace({ left: 100, top: -50, right: 400, bottom: 300 }, panel, view).top, 8);
});
