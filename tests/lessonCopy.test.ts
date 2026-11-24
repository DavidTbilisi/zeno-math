// Handing a board out: the copy has ids of its own, keeps its inner links, and never covers what is on the board.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boundsOf, copyElements, type SceneElement } from "../src/model/lessonCopy.ts";

const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const box: SceneElement = { id: "box", type: "rectangle", x: 100, y: 50, width: 200, height: 80, index: "a1", groupIds: ["g1"], boundElements: [{ id: "label", type: "text" }, { id: "arrow", type: "arrow" }, { id: "gone", type: "arrow" }], frameId: "frame" };
const label: SceneElement = { id: "label", type: "text", x: 150, y: 70, width: 100, height: 20, index: "a2", groupIds: ["g1"], containerId: "box" };
const arrow: SceneElement = { id: "arrow", type: "arrow", x: 300, y: 90, width: 120, height: 0, index: "a3", groupIds: [], startBinding: { elementId: "box", focus: 0.2 }, endBinding: { elementId: "elsewhere", focus: 0 } };
const frame: SceneElement = { id: "frame", type: "frame", x: 80, y: 30, width: 400, height: 160, frameId: null };
const erased: SceneElement = { id: "old", type: "ellipse", x: -900, y: -900, width: 10, height: 10, isDeleted: true };
const scene = [box, label, arrow, frame, erased];

test("the box round a drawing leaves deleted elements out", () => {
  assert.deepEqual(boundsOf(scene), { left: 80, top: 30, right: 480, bottom: 190 });
  assert.equal(boundsOf([erased]), null);
  assert.equal(boundsOf([]), null);
  assert.deepEqual(boundsOf([{ id: "line", x: 5, y: 5, width: -3 }]), { left: 5, top: 5, right: 5, bottom: 5 }, "odd sizes count as none");
});

test("onto an empty board the copy lies where the drawing was, with ids of its own", () => {
  const copy = copyElements(scene, [], ids());
  assert.deepEqual(copy.map((e) => [e.id, e.x, e.y]), [["n1", 100, 50], ["n2", 150, 70], ["n3", 300, 90], ["n4", 80, 30]]);
  assert.ok(copy.every((e) => !("index" in e)), "the board it lands on orders it");
  assert.equal(scene[0].id, "box", "the source is left as it was");
  assert.equal(box.index, "a1");
});

test("links between the copied elements point to the copies; links out of the drawing are dropped", () => {
  const [b, l, a, f] = copyElements(scene, [], ids());
  assert.equal(l.containerId, b.id);
  assert.deepEqual(b.boundElements, [{ id: l.id, type: "text" }, { id: a.id, type: "arrow" }]);
  assert.deepEqual(a.startBinding, { elementId: b.id, focus: 0.2 });
  assert.equal(a.endBinding, null, "what it pointed at was not copied");
  assert.equal(b.frameId, f.id);
  assert.equal(f.frameId, null);
  assert.deepEqual(b.groupIds, l.groupIds, "one group stays one group");
  assert.notDeepEqual(b.groupIds, ["g1"], "under a new id, so a second copy is a group of its own");
  assert.deepEqual(a.groupIds, []);
  assert.equal("containerId" in b, false, "a field the element did not have is not added");
});

test("onto a board with work on it the copy lies to its right, level with its top", () => {
  const own: SceneElement[] = [{ id: "mine", x: -40, y: 300, width: 140, height: 60 }, { id: "rubbed", x: 5000, y: 0, width: 10, height: 10, isDeleted: true }];
  const copy = copyElements(scene, own, ids(), 50);
  const box2 = boundsOf(copy)!;
  assert.equal(box2.left, 100 + 50, "50 right of the board's own work");
  assert.equal(box2.top, 300);
  assert.equal(box2.right - box2.left, 400);
  // Handed out twice: the second copy is beside the first, not on it, and shares no id with it.
  const twice = copyElements(scene, [...own, ...copy], ids());
  assert.equal(boundsOf(twice)!.left, box2.right + 80);
});

test("nothing to copy is nothing copied", () => {
  assert.deepEqual(copyElements([erased], [box], ids()), []);
  assert.deepEqual(copyElements([], [], ids()), []);
});
