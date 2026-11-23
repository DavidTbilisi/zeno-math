// Idea cards (issue #579): every idea of the concept graphs has a card with all four corners in every language; its
// glyph is its own across Zeno and is kept; the failure corner names the trap ideaState.ts blames on the idea; every
// card is on a topic page; and a review's covered corner offers three different choices, the right one among them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { MENUS } from "../src/menus.ts";
import { FEATURES, hasFeature, ON_TRIAL } from "../src/model/arms.ts";
import { MISTAKES } from "../src/math/mistakes.ts";
import { SYMBOLS } from "../src/math/symbols.ts";
import { IDEAS, type IdeaNode } from "../src/model/conceptGraph.ts";
import { EXPLAINERS } from "../src/model/explainers.ts";
import { CARD_IDEAS, cardsOf, CHOICES, CORNERS, coveredCard, IDEA_CARDS, type Corner } from "../src/model/ideaCards.ts";
import { gapIdea, IDEA_SKILLS, SKILL_IDEAS } from "../src/model/ideaState.ts";
import { rng } from "../src/model/random.ts";
import { TOPICS } from "../src/model/topics.ts";

const LANGS = { en, ka, ru };
const ideas = Object.keys(IDEAS) as IdeaNode[];

test("every idea has a card, with all four corners in every language", () => {
  assert.deepEqual(Object.keys(IDEA_CARDS).sort(), [...ideas].sort(), "cards without an idea, or ideas without a card");
  assert.deepEqual(CARD_IDEAS, ideas);
  for (const [lang, t] of Object.entries(LANGS)) {
    assert.deepEqual(Object.keys(t.cards.ideas).sort(), [...ideas].sort(), `${lang}: words without a card, or a card without words`);
    for (const id of ideas) {
      const w = t.cards.ideas[id];
      for (const k of ["essence", "like", "test", "failure"] as const) assert.ok(w[k].trim().length > 0, `${lang} ${id}: ${k} empty`);
      assert.ok(IDEA_CARDS[id].glyph.trim().length > 0, `${id} has no glyph`);
    }
    for (const k of CORNERS) assert.ok(t.cards.corners[k].trim(), `${lang}: corner ${k} unnamed`);
  }
  // A translation is not the English left in place.
  for (const id of ideas) for (const t of [ka, ru]) assert.notEqual(t.cards.ideas[id].essence, en.cards.ideas[id].essence, id);
  assert.doesNotMatch(JSON.stringify(ka.cards), /[Ა-Ჿ]/, "Georgian without capitals");
});

/**
 * The glyphs as given. A glyph once given is kept: a student may have learnt the idea by it. A new idea adds its line;
 * none here changes.
 */
const GIVEN: Readonly<Record<IdeaNode, string>> = {
  addWhole: "+−", multiplyFacts: "7×8", multiplyLong: "23×4", divideExact: "56÷8", hcf: "∩↑", lcm: "∩↓",
  part: "▮▯▯", equivalent: "½=²⁄₄", lowest: "↓¾", commonDenom: "□⁄₁₂", addSub: "⅕+⅖", multiply: "½×⅓", reciprocal: "⅔↕",
  divide: "÷⅔", toImproper: "2¾→", toMixed: "→2¾",
  negLine: "←0→", addNeg: "+(−)", minusNeg: "−(−)", signTimes: "−×−",
  powValue: "2⁵", powLaws: "aᵐ⁺ⁿ", negIndex: "2⁻³", fracIndex: "x^½",
  distribute: "a(b+c)", twoBrackets: "()()", squareBracket: "()²",
  bracketsFirst: "(…)", powFirst: "3×2²", mulFirst: "2+3×4", chainLeft: "9−4−2",
  roundPlace: "5↑4↓", placeHolders: "…00", sigFigs: "0.0①②", stdForm: "×10ⁿ", bounds: "±½",
};

test("glyphs are unique across Zeno, and a glyph once given is kept", () => {
  for (const id of ideas) assert.equal(IDEA_CARDS[id].glyph, GIVEN[id], `${id}'s glyph changed`);
  const glyphs = ideas.map((id) => IDEA_CARDS[id].glyph);
  assert.equal(new Set(glyphs).size, glyphs.length, "two ideas share a glyph");
  // Nothing else in Zeno is drawn with one: no symbol, topic, menu entry or intro's everyday use.
  const elsewhere = new Map<string, string>();
  for (const s of SYMBOLS) elsewhere.set(s.glyph, `symbol ${s.id}`);
  for (const t of TOPICS) elsewhere.set(t.icon, `topic ${t.id}`);
  for (const g of MENUS) for (const s of g.sections) for (const e of s.items) elsewhere.set(e.icon, "a menu entry");
  for (const [id, x] of Object.entries(EXPLAINERS)) for (const u of x.uses) elsewhere.set(u, `${id}'s intro`);
  for (const id of ideas) assert.ok(!elsewhere.has(IDEA_CARDS[id].glyph), `${id}'s glyph is ${elsewhere.get(IDEA_CARDS[id].glyph)}'s`);
});

test("the failure corner names the trap blamed on the idea, wherever one is", () => {
  const blamed = new Map<IdeaNode, string[]>();
  for (const m of MISTAKES) {
    const idea = gapIdea(m);
    if (idea) blamed.set(idea, [...(blamed.get(idea) ?? []), m]);
  }
  for (const id of ideas) {
    const { trap } = IDEA_CARDS[id];
    if (blamed.has(id)) assert.ok(trap && blamed.get(id)!.includes(trap), `${id}: its trap is one of ${blamed.get(id)!.join(", ")}`);
    else assert.equal(trap, undefined, `${trap} isn't blamed on ${id}`);
  }
});

test("every card is on its home topic's page, and its look-alike is another idea", () => {
  for (const id of ideas) {
    const { home, like } = IDEA_CARDS[id];
    assert.ok(SKILL_IDEAS[home].includes(id), `${id} isn't one of ${home}'s ideas`);
    if (like) assert.ok(like !== id && like in IDEAS, `${id}'s look-alike`);
  }
  const shown = TOPICS.flatMap((t) => cardsOf(t.skills));
  assert.deepEqual([...shown].sort(), [...ideas].sort(), "each card on exactly one topic page");
  assert.ok(cardsOf(TOPICS.find((t) => t.id === "fractions")!.skills).includes("divide"));
  assert.deepEqual(cardsOf(TOPICS.find((t) => t.id === "geometry")!.skills), []);
});

test("a covered corner's choices are different in every language, and the right one is among them", () => {
  const text = (t: typeof en, id: IdeaNode, k: Corner) => (k === "glyph" ? IDEA_CARDS[id].glyph : t.cards.ideas[id][k]);
  for (const skill of IDEA_SKILLS)
    for (const [lang, t] of Object.entries(LANGS))
      for (const k of CORNERS) {
        const all = SKILL_IDEAS[skill].map((id) => text(t, id, k));
        assert.equal(new Set(all).size, all.length, `${lang} ${skill}: two ideas share a ${k}`);
      }
  const r = rng(579);
  const seen = new Set<Corner>();
  for (let i = 0; i < 400; i++) {
    const skill = IDEA_SKILLS[i % IDEA_SKILLS.length];
    const idea = SKILL_IDEAS[skill][i % SKILL_IDEAS[skill].length];
    const c = coveredCard(skill, idea, r.next);
    seen.add(c.corner);
    assert.equal(c.idea, idea);
    assert.equal(c.choices.length, CHOICES);
    assert.equal(new Set(c.choices).size, CHOICES, "a choice twice");
    assert.ok(c.choices.includes(idea), "the right one is offered");
    assert.ok(c.choices.every((x) => SKILL_IDEAS[skill].includes(x)), "choices from the skill's ideas");
  }
  assert.deepEqual([...seen].sort(), [...CORNERS].sort(), "any corner may be covered");
  // The same draws, the same card: nothing here is learner state, but a fixed random gives a fixed card (the e2e test).
  assert.deepEqual(coveredCard("fractions", "divide", () => 0.5), coveredCard("fractions", "divide", () => 0.5));
});

test("the card before a review is on trial: in a study, only the arm with it in a class testing it has it", () => {
  assert.ok(ON_TRIAL.includes("cards"));
  assert.equal(FEATURES.at(-1), "cards", "a new feature joins at the end");
  assert.equal(hasFeature({ feature: "cards", arm: "on" }, "cards"), true);
  assert.equal(hasFeature({ feature: "cards", arm: "off" }, "cards"), false);
  assert.equal(hasFeature({ feature: "spaced", arm: "on" }, "cards"), false, "not in a class testing something else");
});
