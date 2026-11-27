// Talking to devices (#856): what the CPU does tick by tick under polling, interrupts and DMA, the time each leaves
// for the program, and a keyboard polled too slowly losing a key.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DISK, IO_T, KEYS, bestInterval, plan, pollKeys, workOf } from "../src/math/ioLab";

const acts = (m: Parameters<typeof plan>[0]) => plan(m, DISK, IO_T).map((x) => x.act[0]).join("");

test("polling waits, interrupts cost three ticks a byte, DMA one setup and one ring", () => {
  assert.equal(acts("polling"), "ppppt" + "ppppt" + "ppppt" + "wwwww");
  assert.equal(acts("interrupts"), "wwwwstr" + "wwstr" + "wwstr" + "www");
  assert.equal(acts("dma"), "s" + "w".repeat(13) + "scr" + "www");
  assert.deepEqual(["polling", "interrupts", "dma"].map((m) => workOf(plan(m as "dma", DISK, IO_T))), [5, 11, 16]);
});

test("the learner's decisions fall on the arrivals, and DMA stores each byte as it comes", () => {
  const at = (m: Parameters<typeof plan>[0]) => plan(m, DISK, IO_T).flatMap((x, t) => (x.decide ? [`${t}${x.decide[0]}`] : []));
  assert.deepEqual(at("polling"), ["4t", "9t", "14t"]);
  assert.deepEqual(at("interrupts"), ["4r", "9r", "14r"]);
  assert.deepEqual(at("dma"), ["0s", "14r"]);
  assert.deepEqual(plan("dma", DISK, IO_T).flatMap((x, t) => (x.stored ? [t] : [])), DISK);
});

test("a keyboard polled every 4 ticks loses a key; every 3 is the slowest that loses none", () => {
  assert.deepEqual(pollKeys(KEYS, 4, IO_T).lost, [13]);
  assert.deepEqual(pollKeys(KEYS, 3, IO_T).lost, []);
  assert.equal(bestInterval(KEYS, IO_T), 3);
  assert.equal(pollKeys(KEYS, 3, IO_T).ticks.filter((a) => a === "work").length, 13);
});
