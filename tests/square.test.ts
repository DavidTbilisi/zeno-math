// The square of opposition: from the Venn regions of two terms, the classic table of what each statement's truth or
// falsity settles (Aristotle's reading) and what is left of it when a term may be empty (only the contradictories);
// the immediate inferences with conversion and contraposition by limitation; and every example in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderLogic, type LogicSpec } from "../src/math/logic.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { inferencesOf, SQUARE_PRESETS, squareOf } from "../src/math/logicSquare.ts";

const sw = en.logicWords.syl;
const w = en.logicWords.square;
const spec = (f: string, given = true, aristotle = true): LogicSpec => ({ topic: "square", f, g: "", vals: "", tf: true, given, exist: aristotle });
/** The four corners' values in order A E I O, as T, F or ?. */
const row = (f: string, given: boolean, aristotle: boolean) =>
  squareOf(spec(f, given, aristotle), sw, w).corners.map((c) => ({ true: "T", false: "F", open: "?" })[c.value]).join("");

test("Aristotle's square: what each statement's truth or falsity settles", () => {
  const table: Record<string, string> = {
    "A true": "TFTF", "A false": "F??T",
    "E true": "FTFT", "E false": "?FT?",
    "I true": "?FT?", "I false": "FTFT",
    "O true": "F??T", "O false": "TFTF",
  };
  for (const [k, want] of Object.entries(table)) {
    const [f, v] = k.split(" ");
    assert.equal(row(f, v === "true", true), want, k);
  }
});

test("read the modern way, only the contradictories settle anything", () => {
  const table: Record<string, string> = {
    "A true": "T??F", "A false": "F??T", "E true": "?TF?", "E false": "?FT?",
    "I true": "?FT?", "I false": "?TF?", "O true": "F??T", "O false": "T??F",
  };
  for (const [k, want] of Object.entries(table)) {
    const [f, v] = k.split(" ");
    assert.equal(row(f, v === "true", false), want, k);
  }
});

/** Each inference's verdict, with "+lim" when only the weaker statement follows. */
const infer = (f: string, aristotle: boolean) =>
  inferencesOf(spec(f, true, aristotle), sw, w).map((i) => i.value + (i.limited ? "+lim" : ""));

test("conversion, obversion and contraposition, and what follows by limitation", () => {
  // Converse, obverse, contrapositive.
  assert.deepEqual(infer("A", true), ["open+lim", "true", "true"]);
  assert.deepEqual(infer("E", true), ["true", "true", "open+lim"]);
  assert.deepEqual(infer("I", true), ["true", "true", "open"]);
  assert.deepEqual(infer("O", true), ["open", "true", "true"]);
  // With empty terms allowed, limitation is lost: All S are P says nothing of whether there are any S.
  assert.deepEqual(infer("A", false), ["open", "true", "true"]);
  assert.deepEqual(infer("E", false), ["true", "true", "open"]);
  const dogs = inferencesOf(spec("All dogs are mammals"), sw, w);
  assert.deepEqual(dogs.map((i) => i.text), ["All mammals are dogs", "No dogs are non-mammals", "All non-mammals are non-dogs"]);
  assert.equal(dogs[0].limited, "Some mammals are dogs");
  assert.equal(inferencesOf(spec("No fish are birds"), sw, w)[2].limited, "Some non-birds are not non-fish");
  // From a falsehood: the obverse is equivalent, so it is false too.
  assert.deepEqual(inferencesOf(spec("All swans are white", false), sw, w).map((i) => i.value), ["open", "false", "false"]);
});

test("the statement: in any of three languages, or just a letter on S and P", () => {
  const sq = squareOf(spec("E"), sw, w);
  assert.deepEqual([sq.given, sq.s, sq.p, sq.corners[0].text], ["E", "S", "P", "All S are P"]);
  assert.equal(squareOf(spec("o"), sw, w).given, "O");
  const r = squareOf(spec("Все кошки есть млекопитающие"), ru.logicWords.syl, ru.logicWords.square);
  assert.deepEqual([r.given, r.corners[3].text], ["A", "Некоторые кошки не есть млекопитающие"]);
  const g = squareOf(spec("ზოგიერთი ძაღლი არ არის ძუძუმწოვარი"), ka.logicWords.syl, ka.logicWords.square);
  assert.equal(g.given, "O");
  assert.equal(inferencesOf(spec("Все кошки есть млекопитающие"), ru.logicWords.syl, ru.logicWords.square)[2].text, "Все не-млекопитающие есть не-кошки");
  assert.throws(() => squareOf(spec(""), sw, w), /Type a statement/);
  assert.throws(() => squareOf(spec("Dogs bark"), sw, w), /Could not read “Dogs bark”/);
  // A spec without `given` is given true.
  assert.equal(squareOf({ ...spec("A"), given: undefined }, sw, w).corners[0].value, "true");
});

const caps = (s: LogicSpec, words = en.logicWords) =>
  [...renderLogic(s, words).svg.matchAll(/font-size="14.5"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ").replace(/&#39;/g, "'");

test("the captions say which link settles each corner", () => {
  const a = caps(spec("All dogs are mammals"));
  assert.match(a, /E and A are contraries, which can't both be true, so E is false\./);
  assert.match(a, /I is the subaltern of A: what holds of every one of the dogs holds of some, so I is true\./);
  assert.match(a, /O is the contradictory of A: one of them is true and the other false, so O is false\./);
  assert.match(a, /Aristotle's reading: no term is empty/);
  const o = caps(spec("Some cats are not black", false));
  assert.match(o, /A is the contradictory of O: .* so A is true\./);
  assert.match(o, /E says more than O: if O is false, so is E\./);
  assert.match(caps(spec("Some cats are black", false)), /A says more than I: if I is false, so is A\./);
  assert.match(caps(spec("Some cats are black")), /A says more than I: I being true doesn't settle it, so A is open\./);
  assert.match(caps(spec("Some cats are black", false)), /O and I are subcontraries, which can't both be false, so O is true\./);
  assert.match(caps(spec("Some cats are black")), /O and I are subcontraries: they can both be true, so O is open\./);
  assert.match(caps(spec("All swans are white", false)), /E and A are contraries: they can both be false, so E is open\..*I is the subaltern of A: A being false doesn't settle it/);
  const modern = caps(spec("All unicorns are horses", true, false));
  assert.match(modern, /E is open in the modern reading: there may be no unicorns at all, and then E and A are no longer contraries\./);
  assert.match(modern, /with no unicorns at all, every A and E is true and every I and O false/);
  assert.doesNotMatch(renderLogic(spec("All dogs are mammals"), en.logicWords).svg, /only by limitation/);
  assert.match(renderLogic(spec("All dogs are mammals"), en.logicWords).svg, /fill="#9c36b5" text-anchor="start">but “Some mammals are dogs” follows, by limitation</);
});

test("every example renders in every language", () => {
  for (const words of [en.logicWords, ru.logicWords, ka.logicWords])
    for (const p of SQUARE_PRESETS) {
      // The Russian and Georgian examples are written in their own language, so they read only with its words.
      const own = /[а-я]/i.test(p.spec.f) ? ru.logicWords : /[ა-ჰ]/.test(p.spec.f) ? ka.logicWords : words;
      assert.doesNotMatch(renderLogic(p.spec, own).svg, /NaN|undefined|\{\w+\}/, p.label);
    }
});
