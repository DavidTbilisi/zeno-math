// The front page (components/Landing.tsx) says only what is true: its counts are floors under the real ones, its path
// is the Learn page's shelves and topics in every language, and its fraction question gives the verdicts the
// practice's own checker gives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY } from "../src/library.ts";
import { COUNTS } from "../src/locales/about/counts.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { across, DEMO_SUMS, judge, plain, readFrac } from "../src/math/fracDemo.ts";
import { MISTAKES } from "../src/math/mistakes.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { fill } from "../src/math/text.ts";
import { SHELVES, TOPICS } from "../src/model/topics.ts";

test("each count on the front page is a floor under the real one, and not far under", () => {
  const real = { skills: TOPICS.flatMap((t) => t.skills).length, topics: TOPICS.length, pieces: LIBRARY.length, mistakes: MISTAKES.length };
  assert.equal(COUNTS.topics, real.topics);
  for (const k of ["skills", "pieces", "mistakes"] as const) {
    assert.ok(COUNTS[k] <= real[k], `${k}: the page says more than ${COUNTS[k]}, there are ${real[k]}`);
    assert.ok(real[k] < COUNTS[k] * 1.25, `${k}: ${real[k]} now, the page still says more than ${COUNTS[k]}`);
  }
});

test("no number is left as a placeholder, and none is written into the words", () => {
  for (const dict of [en, ka, ru]) {
    const a = dict.about;
    for (const s of [a.mistakeLede, a.pathLede, ...a.facts.map(([, v]) => v)]) {
      assert.doesNotMatch(fill(s, COUNTS), /\{\w+\}/, s);
      for (const n of Object.values(COUNTS)) assert.ok(!s.includes(String(n)), `${n} is written into: ${s}`);
    }
  }
});

test("the path is the Learn page's shelves and topics, in every language", () => {
  for (const dict of [en, ka, ru]) {
    const want = SHELVES.map((s) => [dict.site.shelves[s], TOPICS.filter((t) => t.shelf === s).map((t) => dict.site.topics[t.id].name)]);
    assert.deepEqual(dict.about.path, want);
  }
});

test("the fraction question reads what is typed", () => {
  assert.deepEqual(readFrac(" 5 / 6 "), { n: 5, d: 6 });
  assert.deepEqual(readFrac("2"), { n: 2, d: 1 });
  for (const bad of ["", "5/", "/6", "5/0", "a", "1/2/3", "-1/2"]) assert.equal(readFrac(bad), null, bad);
});

test("each sum on show is named when added across, right in any form, and worked when wrong", () => {
  for (const [a, b] of DEMO_SUMS) {
    const got = judge(a, b, plain(across(a, b)));
    assert.equal(got.kind, "across");
    // the reason the message gives: the answer is below the larger fraction
    if (got.kind === "across") {
      const [r, big] = [readFrac(got.r)!, readFrac(got.big)!];
      assert.ok(r.n * big.d < big.n * r.d, `${got.r} < ${got.big}`);
    }
    const top = a.n * b.d + b.n * a.d;
    assert.equal(judge(a, b, `${top}/${a.d * b.d}`).kind, "right");
    assert.equal(judge(a, b, `${top * 2}/${a.d * b.d * 2}`).kind, "right");
    const wrong = judge(a, b, "7/1");
    assert.equal(wrong.kind, "wrong");
    if (wrong.kind === "wrong") assert.match(wrong.steps, /^\d+\/(\d+) \+ \d+\/\1 = \d+\/\1( = \d+(\/\d+)?)?$/);
    assert.equal(judge(a, b, "x").kind, "unread");
  }
});

test("the practice's checker names the same mistake on its own fraction sums", () => {
  const w = en.pracWords;
  let seen = 0;
  for (let seed = 1; seed < 400 && seen < 40; seed++) {
    const ex = exercise("fractions", 1, seed, w);
    const m = /^\\frac\{(\d+)\}\{(\d+)\} \+ \\frac\{(\d+)\}\{(\d+)\}$/.exec(ex.q);
    const trap = trapInputs(ex).find((t) => t.id === "addAcross");
    if (!m || !trap) continue;
    seen++;
    const [a, b] = [{ n: +m[1], d: +m[2] }, { n: +m[3], d: +m[4] }];
    assert.equal(check(ex, trap.input, w).mistake, "addAcross", ex.q);
    assert.equal(judge(a, b, trap.input).kind, "across", `${ex.q} answered ${trap.input}`);
    assert.equal(judge(a, b, ex.plain).kind, "right", `${ex.q} answered ${ex.plain}`);
  }
  assert.ok(seen >= 20, `only ${seen} sums with the trap`);
});
