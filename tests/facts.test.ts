// The number facts: every family's facts are right and each has its own key; the book moves a fact from new to weak,
// known and fast by its answers; a kept book is read back carefully; and a draw takes no fact twice while others are
// left, and with a book brings the weak ones up most.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import { drawFacts, factsOf, learn, poolOf, QUICK_MS, readBook, stateOf, TABLES, tally, type Fact, type FactBook, type FactFamily } from "../src/math/facts.ts";

const FAMILIES: FactFamily[] = ["add10", "sub10", "bond10", "add20", "sub20", "bond20", "bond100", "squares", ...TABLES.flatMap((t) => [`times${t}`, `div${t}`] as FactFamily[])];

/** The answer worked out from the text alone. */
function solve(text: string): number {
  const n = (text.match(/\d+/g) ?? []).map(Number);
  if (text.includes("□")) return n[1] - n[0];
  if (text.includes("²")) return n[0] * n[0];
  return text.includes("+") ? n[0] + n[1] : text.includes("−") ? n[0] - n[1] : text.includes("×") ? n[0] * n[1] : n[0] / n[1];
}

test("every fact of every family is right, whole and positive, and no family holds a fact twice", () => {
  for (const family of FAMILIES) {
    const facts = factsOf(family);
    assert.ok(facts.length >= 9, family);
    assert.equal(new Set(facts.map((f) => f.key)).size, facts.length, family);
    for (const f of facts) {
      assert.equal(f.answer, solve(f.text), `${family}: ${f.text}`);
      assert.ok(Number.isInteger(f.answer) && f.answer > 0, f.text);
      assert.equal(f.key, f.text.replace(/\s/g, ""));
    }
  }
});

test("the families are what their names say", () => {
  assert.equal(factsOf("add10").length, 45);
  assert.ok(factsOf("add10").every((f) => f.answer <= 10));
  assert.ok(factsOf("add20").every((f) => f.answer > 10 && f.answer <= 18));
  assert.ok(factsOf("sub20").every((f) => f.answer >= 2 && f.answer <= 9));
  assert.deepEqual(factsOf("bond10").map((f) => f.answer), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
  // The table of 7 both ways round, 7 × 7 once.
  const seven = factsOf("times7").map((f) => f.text);
  assert.equal(seven.length, 17);
  assert.ok(seven.includes("7 × 8") && seven.includes("8 × 7"));
  assert.equal(seven.filter((t) => t === "7 × 7").length, 1);
  assert.deepEqual(factsOf("div7").map((f) => f.text).slice(0, 2), ["14 ÷ 7", "21 ÷ 7"]);
  assert.equal(factsOf("squares").at(-1)!.answer, 225);
  // A fact two tables share is in a pool once.
  const pool = poolOf(["times6", "times7"]);
  assert.equal(pool.filter((f) => f.text === "6 × 7").length, 1);
  assert.equal(pool.length, 17 + 17 - 2);
});

test("the book: wrong makes a fact weak, right known, and three quick ones in a row fast", () => {
  let book: FactBook = {};
  assert.equal(stateOf(book["6×7"]), "new");
  book = learn(book, "6×7", false);
  assert.equal(stateOf(book["6×7"]), "weak");
  book = learn(book, "6×7", true, 5000);
  assert.equal(stateOf(book["6×7"]), "known");
  book = learn(learn(book, "6×7", true, 2000), "6×7", true, QUICK_MS);
  assert.equal(stateOf(book["6×7"]), "known");
  book = learn(book, "6×7", true, 1500);
  assert.equal(stateOf(book["6×7"]), "fast");
  assert.deepEqual({ n: book["6×7"].n, run: book["6×7"].run, quick: book["6×7"].quick }, { n: 5, run: 4, quick: 3 });
  // A slow right answer keeps it known and starts the quick run again; a wrong one makes it weak.
  assert.equal(stateOf(learn(book, "6×7", true, 4000)["6×7"]), "known");
  assert.equal(stateOf(learn(book, "6×7", false)["6×7"]), "weak");
  // The usual time leans toward the latest right answers, and a wrong one leaves it.
  assert.ok(book["6×7"].ms < 5000 && book["6×7"].ms > 1500);
  assert.equal(learn(book, "6×7", false)["6×7"].ms, book["6×7"].ms);
  const pool = poolOf(["times6"]);
  assert.deepEqual(tally(pool, book), { new: pool.length - 1, weak: 0, known: 0, fast: 1 });
});

test("a kept book is read back, and what is not a book is dropped", () => {
  const book = learn(learn({}, "6×7", true, 1200), "9+□=10", false);
  assert.deepEqual(readBook(JSON.stringify(book)), book);
  assert.deepEqual(readBook(null), {});
  assert.deepEqual(readBook("not json"), {});
  assert.deepEqual(readBook("[1,2]"), {});
  const odd = { "6×7": { n: 3, run: 9, quick: 12, ms: -4 }, "<script>": { n: 1, run: 1, quick: 0, ms: 5 }, "8+5": { n: "many" }, "7²": null };
  assert.deepEqual(readBook(JSON.stringify(odd)), { "6×7": { n: 3, run: 3, quick: 3, ms: 0 } });
});

test("a draw takes no fact twice while others are left, comes out the same from the same seed, and with a book favours the weak", () => {
  const pool = poolOf(["times6", "times7"]);
  const drawn = drawFacts(pool, 12, rng(5));
  assert.equal(new Set(drawn.map((f) => f.key)).size, 12);
  assert.deepEqual(drawFacts(pool, 12, rng(5)), drawn);
  // More asked for than there are: every fact once before any comes again.
  const nine = factsOf("bond10");
  const many = drawFacts(nine, 20, rng(2));
  assert.equal(many.length, 20);
  assert.equal(new Set(many.slice(0, 9).map((f) => f.key)).size, 9);
  assert.equal(new Set(many.slice(9, 18).map((f) => f.key)).size, 9);
  assert.deepEqual(drawFacts([], 5, rng(1)), []);
  // One weak fact among fast ones is drawn first far more often than one in the pool's size.
  const weak: Fact = pool[7];
  let book: FactBook = learn({}, weak.key, false);
  for (const f of pool) if (f !== weak) for (let i = 0; i < 3; i++) book = learn(book, f.key, true, 1000);
  const next = rng(11);
  const first = Array.from({ length: 400 }, () => drawFacts(pool, 1, next, book)[0]).filter((f) => f === weak).length;
  assert.ok(first > 400 * (2.5 / pool.length), `weak first ${first} times`);
});
