// Speed in the rate skill: the road pictures of the hard questions, and the speed questions' answers with their units.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";
import { roadSvg } from "../src/math/speedPics.ts";

const w = en.pracWords;
const u = { kmh: w.speed.kmh, km: w.units.km, h: w.time.h };

test("the road shows each leg's distance and speed, the distance apart, or a gap left to find", () => {
  const legs = roadSvg({ kind: "legs", d1: 120, v1: 40, d2: 100, v2: 50 }, u).body;
  for (const s of ["120 km", "100 km", "40 km/h", "50 km/h"]) assert.ok(legs.includes(s), s);
  const meet = roadSvg({ kind: "meet", d: 360, v1: 40, v2: 80 }, u).body;
  for (const s of ["360 km", "40 km/h", "80 km/h"]) assert.ok(meet.includes(s), s);
  const chase = roadSvg({ kind: "catch", d: 15, v1: 15, v2: 25, h: 1 }, u).body;
  assert.ok(chase.includes("? km") && !chase.includes("15 km<"), "the head start's distance is the first step, so it isn't given");
  assert.ok(chase.includes("25 km/h") && chase.includes("1 h"));
});

test("speed questions come in the medium and hard rate questions, take their units, and the hard ones have a road", () => {
  const seen = new Set<string>();
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("rate", level, seed, w);
      if (!/km|m\/s/.test(ex.prompt)) continue;
      seen.add(`${level}`);
      const where = `${level} #${seed}: ${ex.prompt}`;
      if (ex.answer.k !== "num") throw new Error(where);
      // The unit the question asks in, or hours when it asks how many.
      const unit = ex.prompt.match(/in (km\/h|km|m\/s)\?$/)?.[1] ?? "h";
      assert.equal(check(ex, `${ex.plain} ${unit}`, w).ok, true, `${where} → ${ex.plain} ${unit}`);
      if (level === 3) assert.ok(ex.pic, where);
    }
  assert.deepEqual([...seen].sort(), ["2", "3"], "no speed in the easy questions");
});
