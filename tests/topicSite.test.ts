// The published site's pages (src/topicSite.ts, src/sitePaths.ts): every page in three languages at an address of its
// own, all of them in the sitemap with their other languages, and the front page's path linking to real topics.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PATH_TOPICS } from "../src/locales/about/counts.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { ALL_SKILLS } from "../src/math/practiceSkills.ts";
import { EXPLAINERS } from "../src/model/explainers.ts";
import { SHELVES, TOPICS } from "../src/model/topics.ts";
import { frontPath, learnPath, practicePath, SITE_URL } from "../src/sitePaths.ts";
import { pageSets, sitemap, SITE_LANGS, TOPIC_IDS } from "../src/topicSite.ts";

test("English is at the root, the other languages under their code or behind ?lang=", () => {
  assert.equal(frontPath("en"), "");
  assert.equal(frontPath("ka"), "?lang=ka");
  assert.equal(practicePath("en"), "practice/");
  assert.equal(practicePath("ru", "fractions"), "practice/?lang=ru#/practice/fractions.1");
  assert.equal(learnPath("en"), "learn/");
  assert.equal(learnPath("en", "fractions"), "learn/fractions/");
  assert.equal(learnPath("ka", "fractions"), "ka/learn/fractions/");
});

test("every page has an address of its own in every language", () => {
  const sets = pageSets();
  assert.equal(sets.length, 3 + TOPICS.length);
  const all = sets.flatMap((s) => SITE_LANGS.map((l) => s[l]));
  assert.equal(new Set(all).size, all.length);
});

test("the sitemap lists every page once, each with its three languages and a default", () => {
  const xml = sitemap();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, pageSets().length * SITE_LANGS.length);
  assert.equal(new Set(locs).size, locs.length);
  for (const loc of locs) assert.ok(loc.startsWith(SITE_URL), loc);
  assert.ok(locs.includes(`${SITE_URL}ka/learn/trigonometry/`));
  assert.equal(xml.match(/<url>/g)!.length, xml.match(/<\/url>/g)!.length);
  assert.equal(xml.match(/hreflang="x-default"/g)!.length, locs.length);
  for (const l of SITE_LANGS) assert.equal(xml.match(new RegExp(`hreflang="${l}"`, "g"))!.length, locs.length);
  assert.doesNotMatch(xml, /&(?!amp;|lt;|quot;)/);
});

test("the front page's path links to the Learn page's topics, shelf by shelf", () => {
  assert.deepEqual(PATH_TOPICS, SHELVES.map((s) => TOPICS.filter((t) => t.shelf === s).map((t) => t.id)));
});

test("a topic page has its words in every language, and its skills are ones the practice opens on", () => {
  for (const dict of [en, ka, ru]) {
    assert.ok(dict.about.topicsLede.length > 40);
    for (const id of TOPIC_IDS) {
      const w = dict.site.explain.topics[id];
      assert.ok(w.q && w.what.length > 40, `${id}: what it is`);
      // the page's description for a search result
      assert.ok(w.what.length <= 320, `${id}: ${w.what.length} characters`);
      assert.equal(w.uses.length, EXPLAINERS[id].uses.length);
    }
  }
  for (const t of TOPICS) for (const k of t.skills) assert.ok(ALL_SKILLS.includes(k), `${t.id}: ${k}`);
});
