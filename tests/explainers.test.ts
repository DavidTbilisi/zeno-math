// Topic intros (#450): every topic has one, in every language, with four uses and a real live piece to try; Georgian
// is never capitalised; every "What is…?" read on a roadmap is a real topic and ticks once read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { site as en } from "../src/locales/site/en.ts";
import { site as ka } from "../src/locales/site/ka.ts";
import { site as ru } from "../src/locales/site/ru.ts";
import { libEntry } from "../src/library.ts";
import { EXPLAINERS } from "../src/model/explainers.ts";
import { isRead, itemsOf, itemState, type Work } from "../src/model/roadmap.ts";
import { ROADMAPS } from "../src/model/roadmaps/index.ts";
import { standing } from "../src/model/course.ts";
import { TOPIC_IDS, isTopic } from "../src/model/topics.ts";

test("every topic has an intro in en, ka and ru, with four uses and a live piece from the library", () => {
  assert.deepEqual(Object.keys(EXPLAINERS).sort(), [...TOPIC_IDS].sort());
  for (const id of TOPIC_IDS) {
    assert.equal(EXPLAINERS[id].uses.length, 4);
    assert.ok(libEntry(`live/${EXPLAINERS[id].try}`), `${id}: ${EXPLAINERS[id].try} is not in the library`);
    for (const [lang, s] of [["en", en], ["ka", ka], ["ru", ru]] as const) {
      const w = s.explain.topics[id];
      assert.ok(w.q.endsWith("?"), `${lang}/${id}: the question has no question mark`);
      assert.ok(w.what.length > 40, `${lang}/${id}: "what it is" is too short`);
      assert.equal(w.uses.length, 4, `${lang}/${id}`);
      for (const u of w.uses) assert.ok(u.length > 3, `${lang}/${id}: an empty use`);
    }
  }
});

test("Georgian intros are never capitalised (Mtavruli)", () => {
  const all = JSON.stringify(ka.explain);
  assert.doesNotMatch(all, /[Ა-Ჿ]/);
});

test("the roadmaps' \"What is…?\" items are real topics, open until read and done after", () => {
  const read = (ids: string[]): Work => ({ s: standing({}, null), passed: () => false, read: (t) => ids.includes(t), tried: () => false });
  let n = 0;
  for (const r of Object.values(ROADMAPS))
    for (const i of itemsOf(r))
      if (isRead(i)) {
        n++;
        assert.ok(isTopic(i.read), `${r.id}: no topic ${i.read}`);
        assert.equal(itemState(i, read([])), "open");
        assert.equal(itemState(i, read([i.read])), "done");
      }
  assert.ok(n >= 15, `only ${n} reads on the roadmaps`);
});
