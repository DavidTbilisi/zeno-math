// Virtual memory (#859): address translation, FIFO against LRU on one string, and Belady's anomaly.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BELADY_SEQ, HAND_SEQ, PAGING_LADDER, bitsOf, faults, framesOfTable, runPages, split, tableOf } from "../src/math/pagingLab";

test("an address splits into page and offset; the table names the frame", () => {
  assert.deepEqual(split(43), { page: 2, offset: 11 });
  assert.deepEqual(bitsOf(43), { page: "010", offset: "1011" });
  const p = PAGING_LADDER[0];
  if (p.goal !== "translate") throw new Error("translate first");
  assert.deepEqual(tableOf(framesOfTable(p.table, 3)), p.table);
});

test("FIFO and LRU on the hand string", () => {
  const hits = (pol: "fifo" | "lru") => runPages(pol, 3, HAND_SEQ).hits.map((h) => (h ? "h" : "f")).join("");
  assert.equal(hits("fifo"), "ffffhfff");
  assert.equal(hits("lru"), "ffffhfhf");
});

test("Belady: FIFO faults more with four frames than with three", () => {
  assert.equal(faults("fifo", 3, BELADY_SEQ), 9);
  assert.equal(faults("fifo", 4, BELADY_SEQ), 10);
  assert.equal(faults("lru", 4, BELADY_SEQ), 8);
});
