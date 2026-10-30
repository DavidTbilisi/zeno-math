// The pictures for the decimal questions: the columns' working, the number line's jumps, the digits moving past the point.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { columnWork, lineStops, renderDecimal, shiftWork, type ColumnsSolution, type ShiftSolution } from "../src/math/decimalPics.ts";
import { check, exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";

const w = en.pracWords;

test("36.5 − 35.66: the zero added, borrows from the tenths and the ones, and the count up 35.66 → 36 → 36.5", () => {
  const s: ColumnsSolution = { op: "-", a: 3650, b: 3566, pa: 1, pb: 2, P: 2 };
  const work = columnWork(s);
  assert.equal(work.result, 84);
  assert.deepEqual(work.places, [1, 0, -1, -2]);
  assert.deepEqual([...work.marks].sort((x, y) => x[0] - y[0]), [[-2, 10], [-1, 14], [0, 5]]);
  assert.deepEqual(lineStops(s), [3566, 3600, 3650]);
  const svg = renderDecimal({ pic: "columns", ...s }, null).svg;
  assert.ok(svg.includes(">0.84<") && svg.includes(">+0.34<") && svg.includes(">+0.5<"));
});

test("9.8 + 4.7: carries into the ones and the tens, and jumps of 4 then 0.7", () => {
  const s: ColumnsSolution = { op: "+", a: 98, b: 47, pa: 1, pb: 1, P: 1 };
  const work = columnWork(s);
  assert.equal(work.result, 145);
  assert.deepEqual([...work.marks].sort((x, y) => x[0] - y[0]), [[0, 1], [1, 1]]);
  assert.deepEqual(lineStops(s), [98, 138, 145]);
});

test("every decimal sum on easy draws the columns and a line whose jumps add up to the answer", async () => {
  for (let seed = 1; seed <= 200; seed++) {
    const ex = exercise("decimals", 1, seed, w);
    assert.equal(ex.solution?.kind, "decimal");
    const s = ex.solution!.spec as ColumnsSolution & { steps: string[] };
    const { result } = columnWork(s);
    assert.equal(result / 10 ** s.P, Number(ex.plain), `seed ${seed}`);
    const stops = lineStops(s);
    assert.ok(stops.every((v, i) => i === 0 || v > stops[i - 1]), `seed ${seed}`);
    assert.equal(s.op === "+" ? stops.at(-1) : stops.at(-1)! - stops[0], result, `seed ${seed}`);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    if (seed <= 20) assert.ok(!(await renderSolution(ex.solution!, en)).svg.includes("NaN"));
  }
});

/** The answer a shift picture writes: its digits that are not dropped, place by place. */
const shiftValue = (s: ShiftSolution) => [...shiftWork(s).answer].filter(([, v]) => v.how !== "dropped").reduce((t, [k, v]) => t + v.d * 10 ** k, 0);

test("3.4 × 100: both digits two places left, a zero holding the ones; 0.5 ÷ 100: zeros before the 5", () => {
  const up = shiftWork({ m: 34, p: 1, e: 2, times: true });
  assert.deepEqual(up.to, [1, 2]);
  assert.deepEqual(up.answer.get(0), { d: 0, how: "held" });
  assert.deepEqual(up.places, [2, 1, 0, -1]);
  const down = shiftWork({ m: 5, p: 1, e: 2, times: false });
  assert.deepEqual(down.to, [-3]);
  assert.deepEqual([0, -1, -2].map((k) => down.answer.get(k)?.how), ["held", "held", "held"]);
  // 1200 m in km: the two zeros land after the point and can go.
  const km = shiftWork({ m: 1200, p: 0, e: 3, times: false, units: ["m", "km"] });
  assert.deepEqual([-2, -3].map((k) => km.answer.get(k)?.how), ["dropped", "dropped"]);
  assert.ok(renderDecimal({ pic: "shift", m: 1200, p: 0, e: 3, times: false, units: ["m", "km"] }, null).svg.includes(">km<"));
});

test("every other decimal question on medium and hard draws its picture, and the picture's answer is the answer", async () => {
  const seen = new Set<string>();
  for (const level of [2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("decimals", level, seed, w);
      assert.ok(ex.solution, `level ${level} seed ${seed}`);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      if (ex.solution.kind !== "decimal") continue;
      const s = ex.solution.spec as { pic: string } & ShiftSolution & { d: number };
      seen.add(s.pic);
      if (s.pic === "shift") assert.ok(Math.abs(shiftValue(s) - Number(ex.plain)) < 1e-9, `level ${level} seed ${seed}`);
      else assert.equal(s.times ? (s.m * s.d) / 10 ** s.p : s.m / 10 ** s.p, Number(ex.plain));
      if (seed <= 10) assert.ok(!(await renderSolution(ex.solution, en)).svg.includes("NaN"));
    }
  assert.deepEqual([...seen].sort(), ["jumps", "shift"]);
});
