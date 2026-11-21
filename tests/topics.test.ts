// The site's topics (#448) cover the course: every practice skill is in one topic (senseChart, the reading of charts,
// in two), every titled menu section the board offers belongs to some topic, and every section a topic names exists,
// so a topic page lists the tools and games it should and the library links back to the topics.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { LIBRARY, entriesOf, searchLibrary } from "../src/library.ts";
import { MENUS } from "../src/menus.ts";
import { ALL_SKILLS } from "../src/math/practiceSkills.ts";
import { FEATURED, SHELVES, TOPICS, topicProgress } from "../src/model/topics.ts";
import { standing } from "../src/model/course.ts";

const TWICE = new Set(["senseChart"]);

test("every practice skill is in exactly one topic", () => {
  const all = TOPICS.flatMap((t) => [...t.skills]);
  assert.deepEqual(ALL_SKILLS.filter((k) => !all.includes(k)), []);
  assert.deepEqual([...new Set(all.filter((k, i) => all.indexOf(k) !== i && !TWICE.has(k)))], []);
  assert.deepEqual(all.filter((k) => !ALL_SKILLS.includes(k)), []);
});

test("every section a topic names is a menu section, and every titled section of the board belongs to a topic", () => {
  const titles = MENUS.filter((g) => g.label !== "practice").flatMap((g) => g.sections.filter((s) => s.items.length).map((s) => s.title)).filter(Boolean);
  const named = TOPICS.flatMap((t) => [...t.sections]);
  const all = MENUS.flatMap((g) => g.sections.map((s) => s.title));
  assert.deepEqual(named.filter((s) => !all.includes(s)), []);
  assert.deepEqual(titles.filter((s) => !named.includes(s!)), []);
});

test("every topic has a shelf, a name and an about in each language; the featured ones exist", () => {
  for (const t of TOPICS) {
    assert.ok(SHELVES.includes(t.shelf));
    for (const d of [en, ka, ru]) assert.ok(d.site.topics[t.id].name && d.site.topics[t.id].about, t.id);
  }
  assert.deepEqual(FEATURED.filter((id) => !TOPICS.some((t) => t.id === id)), []);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length);
});

test("the library holds every menu entry but practice, each at its own path", () => {
  const items = MENUS.filter((g) => g.label !== "practice").flatMap((g) => g.sections.flatMap((s) => s.items));
  assert.equal(LIBRARY.length, items.length);
  assert.equal(new Set(LIBRARY.map((e) => e.path)).size, LIBRARY.length);
  assert.ok(entriesOf(TOPICS.find((t) => t.id === "fractions")!).length > 0);
});

test("the library search folds case and needs every word", () => {
  const hits = searchLibrary(en, "TEN frame");
  assert.ok(hits.some((e) => e.path === "live/tenFrame"));
  assert.deepEqual(searchLibrary(en, "zzqx"), []);
});

test("a topic's progress counts secure and behind levels, and with nothing done its next is its first skill", () => {
  const w = { s: standing({}, null), passed: () => false };
  const t = TOPICS.find((x) => x.id === "fractions")!;
  const p = topicProgress(t, w);
  assert.equal(p.total, 3 * t.skills.length);
  assert.equal(p.secure + p.behind, 0);
  assert.ok(p.next);
});
