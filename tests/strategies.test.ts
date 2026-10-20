// Problem-solving strategies: Pólya's card shows your notes or his questions, and every start-up sample states the
// right answer for every n it takes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { openLockers, renderStrategies, stoneWins, type StrategySpec } from "../src/math/strategies.ts";

const w = en.strategiesWords;
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ");
const S = (o: Partial<StrategySpec>): StrategySpec => ({ topic: "startup", problem: "", u: "", p: "", c: "", l: "", sample: "odds", n: "10", ...o });
const say = (o: Partial<StrategySpec>) => textOf(renderStrategies(S(o), w).svg);

test("Pólya: an empty phase shows Pólya's questions, a filled one shows your notes", () => {
  const empty = say({ topic: "polya" });
  assert.ok(empty.includes("Type your problem above"));
  assert.ok(empty.includes("What is the unknown?") && empty.includes("Check each step.") && empty.includes("Can you check the result?"));
  const mine = say({ topic: "polya", problem: "Find x.", u: "x is a length\nwe know 3 sides", l: "check with a ruler" });
  assert.ok(mine.includes("Find x.") && mine.includes("x is a length") && mine.includes("we know 3 sides") && mine.includes("check with a ruler"));
  assert.ok(!mine.includes("What is the unknown?") && mine.includes("Have you seen it before?"), "only the empty phases fall back");
  // Your text is text, not markup.
  assert.ok(renderStrategies(S({ topic: "polya", problem: "a < b & c" }), w).svg.includes("a &lt; b &amp; c"));
});

test("lockers: exactly the squares stay open", () => {
  for (let n = 1; n <= 200; n++) {
    const squares = Array.from({ length: Math.floor(Math.sqrt(n)) }, (_, i) => (i + 1) ** 2);
    assert.deepEqual(openLockers(n), squares, String(n));
  }
});

test("stones: the player to move loses exactly on a multiple of 4", () => {
  stoneWins(200).forEach((win, p) => assert.equal(win, p % 4 !== 0, String(p)));
});

test("start-up strategies: every sample states the right answer for every n", () => {
  for (let n = 1; n <= 30; n++) assert.ok(say({ sample: "odds", n: String(n) }).includes(`= ${n}² = ${n * n}.`), `odds ${n}`);
  for (let n = 2; n <= 30; n++) assert.ok(say({ sample: "handshakes", n: String(n) }).includes(`= ${(n * (n - 1)) / 2} handshakes.`), `handshakes ${n}`);
  for (let n = 1; n <= 100; n++) assert.ok(say({ sample: "lockers", n: String(n) }).includes(`${Math.floor(Math.sqrt(n))} in all`), `lockers ${n}`);
  for (let n = 1; n <= 60; n++) {
    const text = say({ sample: "stones", n: String(n) });
    assert.ok(n % 4 ? text.includes(`go first, take ${n % 4},`) : text.includes("is a multiple of 4: let the other player go first"), `stones ${n}`);
  }
  // The worked steps agree with the answer.
  const odd = say({ sample: "odds", n: "10" });
  assert.ok(odd.includes("81 + 19 = 100") && odd.includes("1 + 19 = 20"), odd);
  const hs = say({ sample: "handshakes", n: "10" });
  assert.ok(hs.includes("36 + 9 = 45") && hs.includes("90 / 2 = 45") && hs.includes("15 lines"), hs);
  assert.ok(say({ sample: "lockers", n: "10" }).includes("1, 2, 2, 3, 2, 4, 2, 4, 3, 4"));
});

test("start-up strategies: n outside its range is refused", () => {
  assert.throws(() => renderStrategies(S({ sample: "handshakes", n: "1" }), w), /from 2 to 30/);
  assert.throws(() => renderStrategies(S({ sample: "lockers", n: "101" }), w), /from 1 to 100/);
  assert.throws(() => renderStrategies(S({ sample: "stones", n: "x" }), w), /whole number/);
});
