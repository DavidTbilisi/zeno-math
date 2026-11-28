// First-time help (#872): a dismissed welcome card stays dismissed in this browser, the ? brings it back, and
// "show them all again" forgets every one; a broken stored value reads as nothing seen.
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as { localStorage?: Partial<Storage> }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { isSeen, setSeen, forgetSeen } = await import("../src/seen.ts");

test("seen cards are kept, brought back, and all forgotten", () => {
  assert.equal(isSeen("teacher"), false);
  setSeen("teacher", true);
  setSeen("practice", true);
  assert.equal(isSeen("teacher"), true);
  assert.deepEqual(JSON.parse(store.get("zeno.seen.v1")!), ["teacher", "practice"]);
  setSeen("teacher", false);
  assert.equal(isSeen("teacher"), false);
  assert.equal(isSeen("practice"), true);
  forgetSeen();
  assert.equal(isSeen("practice"), false);
  assert.equal(store.has("zeno.seen.v1"), false);
});

test("a broken stored value reads as nothing seen", () => {
  store.set("zeno.seen.v1", "{oops");
  assert.equal(isSeen("teacher"), false);
  store.set("zeno.seen.v1", JSON.stringify(["board", 3]));
  assert.equal(isSeen("board"), true);
});
