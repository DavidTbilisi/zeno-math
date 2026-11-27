// Disks and RAID (#854): the three layouts, parity as XOR, what a lost drive costs at each level, rebuilding a cell,
// and the fewest drives that keep a file through any one loss.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fewest, fits, layout, lostBlocks, okDrive, sourceOf, survives, valueOf, type DriveState } from "../src/math/raidLab";

const out: DriveState = { state: "out", done: [] };
const V = [0x5, 0x9, 0xc, 0x6, 0x3, 0xa];

test("RAID 0 stripes, RAID 1 mirrors, RAID 5 rotates its parity", () => {
  assert.deepEqual(layout(0, 3, 6).cells[1].map((c) => c && c.kind === "data" && c.block), [1, 4]);
  assert.equal(layout(1, 2, 3).rows, 3);
  const L = layout(5, 3, 4);
  assert.deepEqual(L.cells.map((col) => col[0]?.kind), ["data", "data", "parity"]);
  assert.deepEqual(L.cells.map((col) => col[1]?.kind), ["data", "parity", "data"]);
  // The parity is the XOR of its stripe: 5 ⊕ 9 = 12, and any one cell is the XOR of the rest.
  assert.equal(valueOf(L, V, 2, 0), 0x5 ^ 0x9);
  assert.equal(valueOf(L, V, 0, 0), valueOf(L, V, 1, 0) ^ valueOf(L, V, 2, 0));
});

test("a lost drive: RAID 0 loses blocks, RAID 1 and 5 keep the file, two lost in RAID 5 lose it", () => {
  const L0 = layout(0, 3, 6);
  assert.deepEqual(lostBlocks(0, L0, [okDrive(), out, okDrive()], 6), [1, 4]);
  assert.deepEqual(lostBlocks(1, layout(1, 2, 3), [out, okDrive()], 3), []);
  const L5 = layout(5, 4, 6);
  assert.deepEqual(lostBlocks(5, L5, [okDrive(), out, okDrive(), okDrive()], 6), []);
  assert.ok(lostBlocks(5, L5, [out, out, okDrive(), okDrive()], 6).length > 0);
});

test("rebuilding: a copy in RAID 1, the XOR of the row in RAID 5, and a fresh cell counts once done", () => {
  assert.deepEqual(sourceOf(1, layout(1, 2, 3), [okDrive(), { state: "fresh", done: [] }], 1, 0), { how: "copy", from: [0] });
  const L5 = layout(5, 3, 4);
  assert.deepEqual(sourceOf(5, L5, [okDrive(), { state: "fresh", done: [] }, okDrive()], 1, 1), { how: "xor", from: [0, 2] });
  // With drive 2 gone too, drive 1's cells can't be worked out until drive 2's are back.
  assert.equal(sourceOf(5, L5, [okDrive(), { state: "fresh", done: [] }, { state: "fresh", done: [true] }], 1, 1), null);
  assert.ok(sourceOf(5, L5, [okDrive(), { state: "fresh", done: [] }, { state: "fresh", done: [true] }], 1, 0));
});

test("the fewest drives that keep a file through any one loss", () => {
  assert.deepEqual(survives(0, 3, 6), [false, false, false]);
  assert.ok(survives(5, 3, 6).every(Boolean));
  assert.equal(fits(1, 2, 6, 3), false);
  assert.equal(fewest(6, 3), 3);
  assert.equal(fewest(6, 6), 2);
});
