// The pipeline (#858): hazards and the bubbles that clear them, forwarding, the load-use stall reordered away, and the
// jump's wrong path.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PIPE_LADDER, bestTicks, hazards, leastBubbles, legal, ticksOf, wrongPath } from "../src/math/pipelineLab";

const ids = (n: number) => [...Array(n).keys()];

test("without forwarding a read waits for the write-back: two bubbles, nine ticks", () => {
  const p = PIPE_LADDER[0];
  assert.equal(hazards(p.prog, ids(3), [0, 0, 0], "none", []).length, 1);
  assert.deepEqual(leastBubbles(p.prog, ids(3), "none", []), [0, 2, 0]);
  assert.equal(bestTicks(p), 9);
  assert.equal(hazards(p.prog, ids(3), [0, 2, 0], "none", []).length, 0);
});

test("forwarding wires let back-to-back ALU work run with no bubble", () => {
  const p = PIPE_LADDER[1];
  assert.equal(ticksOf(ids(3), p.bubbles), 11);
  assert.equal(hazards(p.prog, ids(3), [0, 0, 0], "wires", [[0, 1]]).length, 1);
  assert.equal(hazards(p.prog, ids(3), [0, 0, 0], "wires", [[0, 1], [1, 2]]).length, 0);
  assert.equal(bestTicks(p), 7);
});

test("a load's result comes a tick later: one bubble, removed by moving an independent instruction between", () => {
  const p = PIPE_LADDER[2];
  assert.deepEqual(leastBubbles(p.prog, ids(3), "all", []), [0, 1, 0]);
  assert.equal(bestTicks(p), 7);
  assert.equal(legal(p.prog, [0, 2, 1]), null);
  assert.deepEqual(legal(p.prog, [1, 0, 2]), { a: 0, b: 1 });
  assert.deepEqual(leastBubbles(p.prog, [0, 2, 1], "all", []), [0, 0, 0]);
});

test("the jump's wrong path is the two instructions fetched behind it", () => {
  assert.deepEqual(wrongPath(PIPE_LADDER[3]), [2, 3]);
});
