// The labels beside a long division name the step just done: what each group gets, what was taken away, and what is
// left of that place. They are drawn only when asked for, only for the latest step, and never for short division.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderDivision, type DivisionLabels, type DivisionStyle } from "../src/math/division.ts";

const labels: DivisionLabels = { each: "Each group", taken: "Taken away", left: ["Ones left", "Tens left", "Hundreds left", "Thousands left"], leftAny: "Left" };
const draw = (a: number, b: number, step: number, style: DivisionStyle = "bracket", decimals = 0, l: DivisionLabels | null = labels) =>
  renderDivision({ type: "division", style, a, b, decimals, step, labels: l ?? undefined });
const words = (svg: string) => [...svg.matchAll(/>([A-Z][a-z]+(?: [a-z]+)?)<\/text>/g)].map((m) => m[1]);

test("405 ÷ 3: each step names its own place, and only the latest step is named", () => {
  assert.deepEqual(words(draw(405, 3, 0).svg), [], "nothing done yet");
  assert.deepEqual(words(draw(405, 3, 1).svg).sort(), ["Each group", "Hundreds left", "Taken away"]);
  assert.deepEqual(words(draw(405, 3, 2).svg).sort(), ["Each group", "Taken away", "Tens left"]);
  assert.deepEqual(words(draw(405, 3, 3).svg).sort(), ["Each group", "Ones left", "Taken away"]);
  assert.equal(draw(405, 3, 2).svg.match(/<rect[^>]*rx="6"/g)?.length, 1, "one quotient digit ringed");
});

test("no labels unless asked for, and none for short division", () => {
  assert.deepEqual(words(draw(405, 3, 1, "bracket", 0, null).svg), []);
  assert.deepEqual(words(draw(405, 3, 1, "short").svg), []);
  assert.equal(draw(405, 3, 1, "short").width, draw(405, 3, 1, "short", 0, null).width);
  assert.ok(draw(405, 3, 0).width > draw(405, 3, 0, "bracket", 0, null).width, "the margin makes room");
});

test("a remainder that is not written is not named; a nought in the quotient has nothing taken away", () => {
  // 363 ÷ 3: 3 hundreds shared with none left, and the 6 brought down in their place.
  assert.deepEqual(words(draw(363, 3, 1).svg).sort(), ["Each group", "Taken away"]);
  // 612 ÷ 6: 1 ten can't go round 6 groups, so the quotient gets a 0 and no row is written.
  assert.deepEqual(words(draw(612, 6, 2).svg), ["Each group"]);
  // The last step always writes what is left, even nothing.
  assert.deepEqual(words(draw(363, 3, 3).svg).sort(), ["Each group", "Ones left", "Taken away"]);
});

test('places beyond the thousands, and decimal places, are just "left"', () => {
  assert.ok(words(draw(98765, 4, 1).svg).includes("Left"));
  assert.ok(words(draw(9765, 4, 1).svg).includes("Thousands left"));
  assert.ok(words(draw(7, 8, 2, "bracket", 2).svg).includes("Left"));
});

test("the corner layout names the quotient on its right, the rows on the left", () => {
  const plain = draw(405, 3, 1, "corner", 0, null);
  const named = draw(405, 3, 1, "corner");
  assert.deepEqual(words(named.svg).sort(), ["Each group", "Hundreds left", "Taken away"]);
  assert.ok(named.width > plain.width);
  assert.equal(draw(405, 3, 0, "corner").svg.includes("Each group"), false);
});

test("labels are written safely and every division still draws", () => {
  const odd = { ...labels, taken: "Taken & <gone>" };
  assert.ok(draw(405, 3, 1, "bracket", 0, odd).svg.includes("Taken &amp; &lt;gone>"));
  for (const style of ["bracket", "corner"] as const)
    for (let a = 0; a <= 9999; a += 173)
      for (const b of [1, 3, 7, 12, 250])
        for (const step of [0, 1, 2, 999]) assert.doesNotMatch(draw(a, b, step, style, a % 3).svg, /NaN|undefined|Infinity/);
});
