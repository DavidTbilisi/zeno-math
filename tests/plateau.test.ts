// A plateau (#580): a kept skill whose last days on its top level are no faster than the days before by more than noise.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPlateau, lastGain, notePlateau, PLATEAU_BAND, PLATEAU_CHECK, PLATEAU_RULE, PLATEAU_SESSIONS, plateauOf, sessionValues, type Plateaus,
} from "../src/model/plateau.ts";

/** A seeded stream of numbers in [0, 1). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test("the band is the one npm run plateau set on ASSISTments, from the rule fixed before", () => {
  assert.equal(PLATEAU_BAND, Math.round(PLATEAU_CHECK.band * 100) / 100);
  assert.ok(Math.abs(PLATEAU_RULE.z * PLATEAU_CHECK.sigma * Math.sqrt(2 / PLATEAU_RULE.sessions) - PLATEAU_CHECK.band) < 1e-3);
});

test("too few sessions say nothing", () => {
  assert.equal(isPlateau([1, 1, 1, 1, 1]), null);
  assert.equal(lastGain([1, 1, 1, 1, 1]), null);
});

test("improving: each day clearly faster is no plateau", () => {
  // log seconds falling by 0.4 a day: the last three are 1.2 faster than the three before.
  const values = [3, 2.6, 2.2, 1.8, 1.4, 1.0];
  assert.ok(Math.abs(lastGain(values)! - 1.2) < 1e-12);
  assert.equal(isPlateau(values), false);
});

test("flat: no faster is a plateau, and so is getting slower", () => {
  assert.equal(isPlateau([2, 2, 2, 2, 2, 2]), true);
  assert.equal(isPlateau([2, 2, 2, 2.3, 2.3, 2.3]), true);
});

test("noisy but flat: a plateau nearly always; noisy but improving fast: nearly never", () => {
  const r = rng(7);
  const noise = () => (r() + r() + r() - 1.5) * 0.4;
  let flat = 0, fast = 0;
  for (let k = 0; k < 500; k++) {
    if (isPlateau(Array.from({ length: 6 }, () => 2 + noise()))) flat++;
    if (isPlateau(Array.from({ length: 6 }, (_, i) => 3 - 0.45 * i + noise()))) fast++;
  }
  assert.ok(flat > 480, String(flat));
  assert.ok(fast < 20, String(fast));
});

test("a session is a day; only right top-level first answers on a kept skill count; only the last 2N + 1 days are kept", () => {
  const p: Plateaus = {};
  const at = (day: string, ms: number, o: Partial<{ correct: boolean; top: boolean; stage: number }> = {}) =>
    notePlateau(p, "fractions", { day, ms, correct: true, top: true, stage: 2, ...o });
  at("2026-11-01", 4000, { stage: 1 }); // not kept yet
  at("2026-11-01", 4000, { top: false });
  at("2026-11-01", 4000, { correct: false });
  at("2026-11-01", 50); // too fast to be a real time
  assert.equal(p.fractions, undefined);
  at("2026-11-01", 4000);
  const days = () => (p as Plateaus).fractions.sessions;
  at("2026-11-01", 6000);
  assert.equal(days().length, 1);
  assert.equal(days()[0].times.length, 2);
  for (let d = 2; d <= 12; d++) at(`2026-11-${String(d).padStart(2, "0")}`, 4000);
  assert.equal(days().length, 2 * PLATEAU_SESSIONS + 1);
  assert.equal(days()[0].day, "2026-11-06");
});

test("a day needs two timed right answers to count, and the best day is the target", () => {
  assert.deepEqual(sessionValues([{ times: [1] }, { times: [1, 3] }]), [2]);
  const p: Plateaus = {};
  const days = [8, 6, 7, 6, 7, 6]; // seconds a question, about the same each day: a plateau
  days.forEach((s, i) => {
    for (let k = 0; k < 2; k++) notePlateau(p, "fractions", { day: `2026-11-0${i + 1}`, correct: true, top: true, stage: 3, ms: s * 1000 });
  });
  const hit = plateauOf(p, "fractions");
  assert.ok(hit && Math.abs(hit.best - 6) < 1e-9);
  assert.equal(plateauOf(p, "decimals"), null);
  // Halving the time each day is no plateau.
  const q: Plateaus = {};
  [32, 16, 8, 4, 2, 1].forEach((s, i) => {
    for (let k = 0; k < 2; k++) notePlateau(q, "fractions", { day: `2026-11-0${i + 1}`, correct: true, top: true, stage: 2, ms: s * 1000 });
  });
  assert.equal(plateauOf(q, "fractions"), null);
});
