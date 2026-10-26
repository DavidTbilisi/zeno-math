// Categorical syllogisms: the Venn model and the rules agree on all 256 forms, and give the classic counts —
// 15 valid forms read the modern way, 24 when no term may be empty, exactly the ones with medieval names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { renderLogic, type LogicSpec } from "../src/math/logic.ts";
import { brokenRules, claimsOf, follows, NAMES, parseStatement, readSyllogism, type Form } from "../src/math/logicSyllogism.ts";

const w = en.logicWords.syl;
const FORMS: Form[] = ["A", "E", "I", "O"];
const CODES = FORMS.flatMap((a) => FORMS.flatMap((b) => FORMS.flatMap((c) => [1, 2, 3, 4].map((f) => `${a}${b}${c}-${f}`))));

test("15 forms are valid read the modern way and 24 when no term is empty — exactly the named ones", () => {
  const valid = (exist: number) => CODES.filter((code) => {
    const [maj, min, concl] = claimsOf(code);
    return follows([maj, min], concl, exist);
  });
  const modern = valid(0);
  const aristotle = valid(7);
  assert.equal(CODES.length, 256);
  assert.equal(modern.length, 15);
  assert.equal(aristotle.length, 24);
  assert.deepEqual(new Set(aristotle), new Set(Object.keys(NAMES)));
  assert.deepEqual(new Set(modern), new Set(Object.keys(NAMES).slice(0, 15)));
});

test("the rules of the syllogism agree with the Venn model on every form, in both readings", () => {
  for (const code of CODES) {
    const [maj, min, concl] = claimsOf(code);
    for (const aristotle of [false, true]) {
      const byModel = follows([maj, min], concl, aristotle ? 7 : 0);
      const byRules = brokenRules(maj, min, concl, aristotle).length === 0;
      assert.equal(byRules, byModel, `${code} ${aristotle ? "aristotle" : "modern"}`);
    }
  }
});

test("every language's statement forms read back as themselves, with 'so', numbers and full stops around them", () => {
  for (const t of [en, ru, ka]) {
    const sw = t.logicWords.syl;
    for (const f of FORMS) {
      const line = sw.forms[f].replace("{s}", "big dogs").replace("{p}", "loud animals");
      const st = parseStatement(line, sw);
      assert.deepEqual([st.form, st.s, st.p], [f, "big dogs", "loud animals"], line);
      assert.equal(st.raw.slice(st.sAt, st.sAt + st.s.length), "big dogs");
      assert.equal(st.raw.slice(st.pAt, st.pAt + st.p.length), "loud animals");
    }
  }
  assert.equal(parseStatement("So, some pets are not dogs.", w).form, "O");
  assert.equal(parseStatement("2) Every square is a rectangle", w).p, "a rectangle");
  assert.equal(parseStatement("Следовательно, некоторые сплавы — не металлы", w).form, "O");
  assert.throws(() => parseStatement("Dogs bark", w), /Could not read “Dogs bark”/);
});

test("terms, figure, and the major premise moved to the front", () => {
  const syl = readSyllogism("All cats are mammals\nAll dogs are mammals", "All cats are dogs", w);
  assert.equal(syl.swapped, true);
  assert.deepEqual(syl.names, { S: "cats", P: "dogs", M: "mammals" });
  assert.equal(syl.code, "AAA-2");
  assert.equal(readSyllogism("All Humans are mortal\nAll Greeks are humans", "All greeks are Mortal", w).code, "AAA-1");
  assert.equal(readSyllogism("Festino", "", w).code, "EIO-2");
  assert.equal(readSyllogism("eio4", "", w).code, "EIO-4");
  const open = readSyllogism("No fish are mammals\nAll whales are mammals", "", w);
  assert.deepEqual([open.names, open.mood, open.figure], [{ S: "whales", P: "fish", M: "mammals" }, "EA", 2]);
});

test("what is not a syllogism says why", () => {
  assert.throws(() => readSyllogism("All cats are mammals", "All cats are pets", w), /two premises/);
  assert.throws(() => readSyllogism("All cats are mammals\nAll dogs are pets", "All cats are pets", w), /no term/);
  assert.throws(() => readSyllogism("All cats are mammals\nAll mammals are animals", "All dogs are animals", w), /exactly three terms/);
  assert.throws(() => readSyllogism("All cats are mammals\nAll mammals are cats", "", w), /exactly three terms/);
  assert.throws(() => readSyllogism("All cats are cats\nAll cats are pets", "All pets are cats", w), /both sides/);
});

const run = (f: string, g = "", exist = false) => {
  const spec: LogicSpec = { topic: "syllogism", f, g, vals: "", tf: true, exist };
  return renderLogic(spec, en.logicWords).svg;
};

test("the captions: verdict, name, broken rules, what follows", () => {
  const barbara = run("All humans are mortal\nAll Greeks are humans", "All Greeks are mortal");
  assert.match(barbara, /Valid: everything the conclusion needs/);
  assert.match(barbara, /called Barbara/);
  assert.match(barbara, /AAA-1 · Barbara/);

  const middle = run("All cats are mammals\nAll dogs are mammals", "All cats are dogs");
  assert.match(middle, /Invalid/);
  assert.match(middle, /Undistributed middle: no premise covers all of mammals/);
  assert.match(middle, /premises were swapped/);

  const unicorn = ["All unicorns are horses\nAll unicorns are white things", "Some white things are horses"] as const;
  assert.match(run(...unicorn), /Valid only if “unicorns” is not empty/);
  assert.match(run(...unicorn), /Existential fallacy/);
  assert.match(run(...unicorn, true), /Valid, because no term is empty/);
  assert.doesNotMatch(run(...unicorn, true), /Existential fallacy/);

  assert.match(run("No fish are mammals\nAll whales are mammals"), /What follows: No whales are fish\./);
  assert.match(run("Some cats are pets\nSome pets are dogs"), /Nothing follows about dogs and cats/);
});
