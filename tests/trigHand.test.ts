// Hand trick: every hand angle folds the finger whose neighbours count out √n/2 for sin and cos, the reflection
// gives every multiple of 30° and 45° its signs from the quadrant, the radian is a count of slices of 180°/d, and
// the picture refuses angles that are not on the hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { HAND_ANGLES, handReading, renderTrig } from "../src/math/trig.ts";

const RAD = Math.PI / 180;

test("the folded finger's neighbours give sin = √below/2 and cos = √above/2, with the quadrant's signs", () => {
  for (let deg = -360; deg <= 720; deg += 15) {
    const h = handReading(deg);
    if (deg % 30 !== 0 && deg % 45 !== 0) {
      assert.equal(h, null, `${deg}° is not on the hand`);
      continue;
    }
    assert.ok(h);
    assert.equal(h.below + h.above, 4);
    assert.equal(HAND_ANGLES[h.finger], h.ref);
    assert.ok(Math.abs(h.sinSign * Math.sqrt(h.below) / 2 - Math.sin(deg * RAD)) < 1e-9, `sin ${deg}°`);
    assert.ok(Math.abs(h.cosSign * Math.sqrt(h.above) / 2 - Math.cos(deg * RAD)) < 1e-9, `cos ${deg}°`);
  }
});

test("the radian counts slices: θ = kπ/d with d one of the five pegs", () => {
  assert.deepEqual(handReading(210)?.slices, { k: 7, d: 6 });
  assert.deepEqual(handReading(300)?.slices, { k: 5, d: 3 });
  assert.deepEqual(handReading(135)?.slices, { k: 3, d: 4 });
  assert.deepEqual(handReading(270)?.slices, { k: 3, d: 2 });
  assert.deepEqual(handReading(180)?.slices, { k: 1, d: 1 });
  assert.equal(handReading(0)?.slices, null);
  for (let deg = -360; deg <= 720; deg += 15) {
    const sl = handReading(deg)?.slices;
    if (!sl) continue;
    assert.ok([1, 2, 3, 4, 6].includes(sl.d), `${deg}°`);
    assert.equal((sl.k * 180) / sl.d, deg);
  }
});

test("the 210° picture folds the ring finger, counts 7 thirty-degree slices and uses the user's peg", () => {
  const svg = renderTrig({ topic: "hand", angle: 210, unit: "rad", d6: "my clock" }, en.trigWords).svg;
  assert.match(svg, /7 × 30° = 210°/);
  assert.match(svg, /my clock/);
  assert.match(svg, /ring finger/);
  assert.match(svg, /sin θ = −1\/2, cos θ = −√3\/2/);
});

test("every language draws every hand angle, and an angle off the hand is an error", () => {
  for (const t of [en, ru, ka]) {
    for (let deg = 0; deg < 360; deg += 15) {
      if (deg % 30 !== 0 && deg % 45 !== 0) {
        assert.throws(() => renderTrig({ topic: "hand", angle: deg, unit: "deg" }, t.trigWords), /15|75|105|165|195|255|285|345/);
        continue;
      }
      assert.ok(renderTrig({ topic: "hand", angle: deg, unit: "rad" }, t.trigWords).svg.includes("<svg"));
    }
  }
});
