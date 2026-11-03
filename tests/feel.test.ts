// Calm and arcade (issue #283): arcade is the default and anything stored but "calm" reads as arcade; choosing calm is
// kept in this browser and tells every switch showing it; choosing arcade again forgets it; and in calm no sound plays,
// whatever the sound switch says.
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as { localStorage?: Partial<Storage> }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
let made = 0;
(globalThis as { AudioContext?: unknown }).AudioContext = class {
  constructor() {
    made++;
    throw new Error("no audio in a test");
  }
};

const { feel, isCalm, readFeel, setFeel } = await import("../src/live/feel.ts");
const { play } = await import("../src/live/juice.ts");

test("only a stored 'calm' is calm; nothing stored, or anything else, is arcade", () => {
  assert.equal(readFeel(null), "arcade");
  assert.equal(readFeel(undefined), "arcade");
  assert.equal(readFeel("arcade"), "arcade");
  assert.equal(readFeel("CALM"), "arcade");
  assert.equal(readFeel("calm"), "calm");
});

test("arcade is the default; calm is kept in this browser, and arcade again forgets it", () => {
  assert.equal(feel(), "arcade");
  setFeel("calm");
  assert.equal(feel(), "calm");
  assert.equal(isCalm(), true);
  assert.equal(store.get("zeno.feel.v1"), "calm");
  setFeel("arcade");
  assert.equal(feel(), "arcade");
  assert.equal(store.has("zeno.feel.v1"), false);
});

test("in calm no sound is even started, with the sound switch on", () => {
  store.delete("zeno.sound.v1");
  setFeel("calm");
  made = 0;
  play("good");
  play("miss");
  play("levelup");
  assert.equal(made, 0);
  setFeel("arcade");
  play("good");
  assert.equal(made, 1, "in arcade the sound is tried (and fails quietly here)");
});
