// The place-value mat: trading between neighbouring columns keeps the total, thousands trade like the other places,
// mats saved before the thousands column still read and draw, rows of ten-rods split into fives, and adding or
// subtracting with blocks the way a pupil would (put b in or take it away, trading as needed) ends on the answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyDrop,
  blockPositions,
  BLOCK,
  breakDown,
  type BlockSum,
  COL_PAD,
  COL_W,
  expanded,
  matCounts,
  type MatCounts,
  type MatKind,
  placeDigits,
  PV_CAP,
  PV_KINDS,
  pvTotal,
  randomSum,
  regroup,
  renderPlaceValue,
  startSum,
  sumAnswer,
  sumMove,
  sumVerdict,
  tenDividers,
  validSum,
} from "../src/math/placeValue.ts";

test("regrouping and breaking down between every pair of neighbours keeps the total", () => {
  const start = { th: 1, h: 10, t: 10, o: 10 };
  for (const k of PV_KINDS) {
    const up = regroup(start, k);
    const down = breakDown(start, k);
    if (!up.message) assert.equal(pvTotal(up.counts), pvTotal(start), `regroup ${k}`);
    if (!down.message) assert.equal(pvTotal(down.counts), pvTotal(start), `break ${k}`);
  }
  assert.deepEqual(regroup(start, "h").counts, { th: 2, h: 0, t: 10, o: 10 });
  assert.deepEqual(breakDown({ th: 1, h: 0, t: 0, o: 0 }, "th").counts, { th: 0, h: 10, t: 0, o: 0 });
  assert.deepEqual(applyDrop({ th: 0, h: 10, t: 0, o: 0 }, "h", "mat", "th").counts, { th: 1, h: 0, t: 0, o: 0 });
});

test("thousands have no bigger place and stop at nine", () => {
  const full = { th: PV_CAP.th, h: 10, t: 0, o: 0 };
  assert.equal(regroup(full, "h").message, "full");
  assert.equal(applyDrop(full, "th", "tray", "th").message, "full");
  assert.deepEqual(regroup({ th: 10, h: 0, t: 0, o: 0 }, "th").counts, { th: 10, h: 0, t: 0, o: 0 });
  assert.equal(applyDrop({ th: 1, h: 0, t: 0, o: 0 }, "th", "mat", "t").message, "wrong");
});

test("a mat saved before the thousands column reads as zero thousands and gains the column when drawn", () => {
  const old = { type: "placeValue" as const, h: 2, t: 3, o: 4, showTotal: true, labels: ["ასეულები", "ათეულები", "ერთეულები"] };
  assert.deepEqual(matCounts(old), { th: 0, h: 2, t: 3, o: 4 });
  assert.equal(pvTotal(old), 234);
  assert.equal(expanded({ th: 1, h: 0, t: 3, o: 0 }), "1030 = 1000 + 30");
  const svg = renderPlaceValue(old).svg;
  assert.ok(svg.includes(">Thousands<") && svg.includes(">ასეულები<"));
  assert.equal(renderPlaceValue(old).width, 4 * COL_W + 24);
});

test("every block of a full column stays inside it", () => {
  const inner = COL_W - 2 * COL_PAD;
  for (const k of PV_KINDS)
    for (const p of blockPositions(k, PV_CAP[k])) {
      assert.ok(p.x >= 0 && p.x + BLOCK[k].w <= inner, `${k} block at x=${p.x} leaves the column`);
      assert.ok(p.y + BLOCK[k].h <= 290 - 2 * COL_PAD, `${k} block at y=${p.y} falls below the mat`);
    }
});

test("ten-rods split into fives, with a divider only in rows that reach a sixth rod", () => {
  assert.equal(tenDividers(5).length, 0);
  assert.equal(tenDividers(6).length, 1);
  assert.equal(tenDividers(15).length, 1);
  assert.equal(tenDividers(16).length, 2);
  const pos = blockPositions("t", 10);
  const [d] = tenDividers(10);
  assert.ok(pos[5].x - pos[4].x > pos[1].x - pos[0].x, "no gap between the fives");
  assert.ok(d.x > pos[4].x + BLOCK.t.w && d.x < pos[5].x, "divider is not in the gap");
});

/** A pupil working from the ones up: puts b's blocks in (or takes them away, breaking from the left when short) and
 * trades 10 for 1 whenever a column reaches ten. Returns the mat and the exercise when they press Check. */
function solve(op: "add" | "sub", a: number, b: number): { counts: MatCounts; sum: BlockSum } {
  let { counts, sum } = startSum(op, a, b);
  const step = (kind: MatKind, toZone: boolean) => {
    const r = sumMove(counts, sum, kind, toZone);
    assert.equal(r.message, undefined, `${a} ${op} ${b}: ${r.message} moving ${kind}`);
    counts = r.counts;
    sum = { ...sum, zone: r.zone };
  };
  const breakFrom = (i: number): void => {
    const higher = PV_KINDS[i - 1];
    if (counts[higher] === 0) breakFrom(i - 1);
    counts = breakDown(counts, higher).counts;
  };
  const target = placeDigits(b);
  for (let i = PV_KINDS.length - 1; i >= 0; i--) {
    const k = PV_KINDS[i];
    if (op === "add") {
      while (sum.zone[k] > 0) {
        if (counts[k] >= PV_CAP[k]) counts = regroup(counts, k).counts;
        step(k, false);
      }
      while (counts[k] >= 10) counts = regroup(counts, k).counts;
    } else
      while (sum.zone[k] < target[k]) {
        if (counts[k] === 0) breakFrom(i);
        step(k, true);
      }
  }
  return { counts, sum };
}

test("adding and subtracting with blocks ends on the answer, with every column under ten", () => {
  for (let a = 0; a <= 999; a += 7)
    for (let b = 0; b <= 999; b += 13) {
      const add = solve("add", a, b);
      assert.equal(sumVerdict(add.counts, add.sum), "correct", `${a} + ${b}`);
      assert.deepEqual(add.counts, placeDigits(a + b));
      if (b > a) continue;
      const sub = solve("sub", a, b);
      assert.equal(sumVerdict(sub.counts, sub.sum), "correct", `${a} − ${b}`);
      assert.deepEqual(sub.counts, placeDigits(a - b));
    }
  assert.equal(sumAnswer({ op: "add", a: 999, b: 999 }), 1998);
  assert.deepEqual(solve("add", 999, 999).counts, { th: 1, h: 9, t: 9, o: 8 });
});

test("Check says what is still missing", () => {
  const add = startSum("add", 234, 158);
  assert.equal(sumVerdict(add.counts, add.sum), "placeAll");
  let r = sumMove(add.counts, add.sum, "o", false);
  for (let i = 0; i < 7; i++) r = sumMove(r.counts, { ...add.sum, zone: r.zone }, "o", false);
  for (let i = 0; i < 5; i++) r = sumMove(r.counts, { ...add.sum, zone: r.zone }, "t", false);
  r = sumMove(r.counts, { ...add.sum, zone: r.zone }, "h", false);
  assert.equal(sumVerdict(r.counts, { ...add.sum, zone: r.zone }), "regroup"); // 3 h, 8 t, 12 o
  assert.equal(sumVerdict(regroup(r.counts, "o").counts, { ...add.sum, zone: r.zone }), "correct");

  const sub = startSum("sub", 52, 17);
  assert.equal(sumVerdict(sub.counts, sub.sum), "takeExact");
  assert.equal(sumVerdict({ th: 0, h: 0, t: 3, o: 0 }, { ...sub.sum, zone: placeDigits(17) }), "restart");
});

test("taking away stops at b's digit in each place, and adding never takes blocks back off the mat", () => {
  const { counts, sum } = startSum("sub", 85, 31);
  const r = sumMove(counts, { ...sum, zone: { th: 0, h: 0, t: 0, o: 1 } }, "o", true);
  assert.equal(r.message, "enough");
  const back = sumMove({ th: 0, h: 0, t: 8, o: 4 }, { ...sum, zone: { th: 0, h: 0, t: 0, o: 1 } }, "o", false);
  assert.deepEqual([back.counts.o, back.zone.o], [5, 0]);
  const add = startSum("add", 12, 30);
  assert.deepEqual(sumMove(add.counts, add.sum, "o", true), { counts: add.counts, zone: add.sum.zone });
  assert.equal(sumMove({ th: 0, h: 0, t: 0, o: PV_CAP.o }, { ...add.sum, zone: { th: 0, h: 0, t: 0, o: 1 } }, "o", false).message, "full");
});

test("random exercises are valid two- and three-digit sums", () => {
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++)
    for (const op of ["add", "sub"] as const) {
      const { a, b } = randomSum(op, rnd);
      assert.ok(validSum(op, a, b) && a >= 10 && b >= 1, `${a} ${op} ${b}`);
    }
  assert.equal(validSum("sub", 5, 6), false);
  assert.equal(validSum("add", 1000, 1), false);
  assert.equal(validSum("add", 2.5, 1), false);
});
