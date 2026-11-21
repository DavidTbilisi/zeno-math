// Maths symbols (#451): every symbol has its words in all three languages, links only to topics and symbols that
// exist, a question's symbols are found in its LaTeX and words, and the search finds a symbol by the sign or its name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { exercise } from "../src/math/practice.ts";
import { searchSymbols, SYM_GROUPS, SYMBOLS, symbolOf, symbolsIn, type Sym } from "../src/math/symbols.ts";
import { TOPICS } from "../src/model/topics.ts";

const ids = SYMBOLS.map((s) => s.id);

test("every symbol has a name, a reading, a meaning and its example read aloud, in every language", () => {
  assert.equal(new Set(ids).size, ids.length, "a symbol id twice");
  for (const [lang, t] of Object.entries({ en, ka, ru })) {
    assert.deepEqual(Object.keys(t.symbols.items).sort(), [...ids].sort(), `${lang}: symbols without words, or words without a symbol`);
    assert.deepEqual(Object.keys(t.symbols.groups), [...SYM_GROUPS]);
    for (const [id, w] of Object.entries(t.symbols.items)) {
      assert.equal(w.length, 4, `${lang} ${id}`);
      for (const x of w) assert.ok(x.trim().length > 0, `${lang} ${id} has an empty field`);
    }
  }
});

test("Georgian is written without capitals (no Mtavruli)", () => {
  assert.doesNotMatch(JSON.stringify(ka.symbols), /[Ა-Ჿ]/);
});

test("a symbol's topics and look-alikes all exist, and every group has symbols", () => {
  const topics = new Set(TOPICS.map((x) => x.id));
  for (const s of SYMBOLS) {
    assert.ok(s.topics.length > 0, `${s.id} is in no topic`);
    for (const t of s.topics) assert.ok(topics.has(t), `${s.id}: no topic ${t}`);
    for (const c of s.confused ?? []) assert.ok(symbolOf(c) && c !== s.id, `${s.id}: no symbol ${c}`);
  }
  for (const g of SYM_GROUPS) assert.ok(SYMBOLS.some((s) => s.group === g), `group ${g} is empty`);
});

const found = (words: string, tex: string) => symbolsIn(words, tex).map((s) => s.id);

test("a question's symbols are found in its LaTeX and its words, the everyday ones left out", () => {
  assert.deepEqual(found("", "\\forall x \\in \\mathbb{R}: x^2 \\geq 0").sort(), ["forall", "ge", "in", "power", "reals"]);
  // \int is not \in; a box to fill in is not the end of a proof.
  assert.deepEqual(found("", "\\int_0^1 x\\,dx"), ["integral"]);
  assert.deepEqual(found("Which sign goes in the box?", "0 \\;\\square\\; 10"), ["blank"]);
  assert.deepEqual(found("", "x + 3 = 5"), []);
  assert.deepEqual(found("Find |φ(G)|.", "|\\ker \\varphi| = 4"), ["phi"]);
  // X ~ N(0, 1) is a distribution, not two similar triangles.
  assert.ok(found("", "X \\sim N(0, 1)").includes("distributed") && !found("", "X \\sim N(0, 1)").includes("similar"));
  assert.ok(found("", "\\triangle ABC \\sim \\triangle DEF").includes("similar"));
});

test("a learner who meets ∀ in a quantifier question has its card a tap away", () => {
  const ex = exercise("quantifiers", 1, 1, en.pracWords);
  const hits = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => exercise("quantifiers", 1, seed, en.pracWords)).filter((q) => /∀|\\forall/.test(q.prompt + q.q));
  assert.ok(hits.length > 0, `no ∀ in ${ex.prompt} ${ex.q}`);
  for (const q of hits) assert.ok(found(q.prompt, q.q).includes("forall"));
});

test("the search finds a symbol by the sign pasted in or by its name, in the learner's language", () => {
  const words = (t: typeof en) => (s: Sym) => (t.symbols.items as Record<string, readonly string[]>)[s.id].slice(0, 3);
  assert.deepEqual(searchSymbols("∀", words(en)).map((s) => s.id), ["forall"]);
  assert.deepEqual(searchSymbols("  ∑ ", words(en)).map((s) => s.id), ["sum"]);
  assert.ok(searchSymbols("square root", words(en)).some((s) => s.id === "sqrt"));
  assert.ok(searchSymbols("квадратный корень", words(ru)).some((s) => s.id === "sqrt"));
  assert.ok(searchSymbols("ჯამი", words(ka)).some((s) => s.id === "sum"));
  assert.ok(searchSymbols("σ", words(en)).some((s) => s.id === "sigma"));
  assert.equal(searchSymbols("", words(en)).length, SYMBOLS.length);
  assert.deepEqual(searchSymbols("zzzz", words(en)), []);
});
