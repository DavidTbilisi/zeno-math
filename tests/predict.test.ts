// Predict, then reveal (#578): each piece's change, played, does what the server marks as right.
import { test } from "node:test";
import assert from "node:assert/strict";
import { site as en } from "../src/locales/site/en.ts";
import { site as ka } from "../src/locales/site/ka.ts";
import { site as ru } from "../src/locales/site/ru.ts";
import { CHANGES, isPredictKind, OUTCOMES, outcomeOf, PREDICTIONS, type Prediction, type PredictKind } from "../src/model/predict.ts";
import { area2 } from "../src/math/geoLab.ts";
import { sumOf } from "../src/math/fractionWall.ts";
import { walkParts } from "../src/math/slopeWalk.ts";

const KINDS = Object.keys(PREDICTIONS) as PredictKind[];

test("the three pieces, each on its topic", () => {
  assert.deepEqual(KINDS.sort(), ["fractionWall", "geoLab", "slopeWalk"]);
  assert.deepEqual(Object.keys(OUTCOMES).sort(), KINDS);
  assert.deepEqual(KINDS.map((k) => PREDICTIONS[k].topic), ["fractions", "geometry", "trigonometry"]);
  assert.ok(isPredictKind("geoLab") && !isPredictKind("toString") && !isPredictKind("balance"));
});

test("the revealed state matches the right option, as the server marks it", () => {
  for (const k of KINDS) assert.equal(outcomeOf(PREDICTIONS[k] as Prediction<unknown>), OUTCOMES[k], k);
  // And by the pieces' own measures, not the prediction's:
  const g = PREDICTIONS.geoLab;
  const area = (s: typeof g.after) => Math.abs(area2((s.figs[0] as { pts: [number, number][] }).pts)) / 2;
  assert.equal(area(g.before), 6);
  assert.equal(area(g.after), 6);
  assert.notDeepEqual(g.before.figs, g.after.figs, "the corner really moves");
  const w = PREDICTIONS.fractionWall;
  assert.ok(sumOf(w.after.placed).toNumber() < sumOf(w.before.placed).toNumber());
  const s = PREDICTIONS.slopeWalk;
  assert.ok(walkParts(s.after).far < walkParts(s.before).far);
  assert.ok(s.after.theta > s.before.theta, "steeper");
});

test("the change plays from before to after, and every frame on the way keeps the triangle's height", () => {
  for (const k of KINDS) {
    const p = PREDICTIONS[k] as Prediction<unknown>;
    assert.deepEqual(p.frame(0, 10), p.before, k);
    assert.deepEqual(p.frame(10, 10), p.after, k);
  }
  for (let i = 0; i <= 10; i++) {
    const f = PREDICTIONS.geoLab.frame(i, 10).figs[0] as { pts: [number, number][] };
    assert.equal(f.pts[2][1], 3);
    assert.ok(Math.abs(Math.abs(area2(f.pts)) / 2 - 6) < 1e-9);
  }
});

test("every piece's words in en, ka and ru, an option for each change", () => {
  for (const [lang, site] of Object.entries({ en, ka, ru })) {
    for (const k of KINDS) {
      const words = site.predict.pieces[k];
      for (const c of CHANGES) assert.ok(words.options[c], `${lang} ${k} ${c}`);
      assert.ok(words.change && words.ask && words.why, `${lang} ${k}`);
    }
  }
});
