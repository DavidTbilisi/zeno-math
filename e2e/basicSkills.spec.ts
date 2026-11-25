// The first skills in practice: a times-table fact answered with the sum (named), then the product; a decimal asked
// for as a fraction and typed back (sent back, not marked), then the fraction; a rectangle's area with its unit; a
// stacked fraction divided at the short bar (named), then at the long one; a count in steps carried on by one (named),
// then by its step; a written difference across zeros with the zero left at ten (named), then the answer typed in
// threes; a long division with the remainder written after the point (named), then the decimal.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs, type Exercise, type Level, type SkillId } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
/** The first r (hundredths) whose question passes the test, with that question. */
function find(skill: SkillId, level: Level, ok: (ex: Exercise) => boolean): { r: number; ex: Exercise } {
  for (let k = 1; k < 100; k++) {
    const ex = exercise(skill, level, seedOf(k / 100), w);
    if (ok(ex)) return { r: k / 100, ex };
  }
  throw new Error(`no ${skill} question at level ${level}`);
}

test("times tables: the two numbers added is named, then the product is correct", async ({ page, request }) => {
  const { r, ex } = find("tables", 2, (e) => trapInputs(e).some((t) => t.id === "addedNotTimes"));
  await practise(page, request, { tab: "Number", skill: w.skills.tables, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(trapInputs(ex)[0].input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("is the sum.")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("a decimal as a fraction: the decimal typed back is sent back, then the fraction is correct", async ({ page, request }) => {
  const { r, ex } = find("convert", 1, (e) => e.prompt === w.basics.toFraction);
  await practise(page, request, { tab: "Number", skill: w.skills.convert, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(ex.q);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(w.reasons.notFraction)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("area and perimeter: the drawn rectangle's area is taken with its unit", async ({ page, request }) => {
  const { r, ex } = find("areaPerimeter", 1, (e) => e.prompt === w.basics.area);
  const unit = ex.show.match(/\\text\{(\w+)\}/)![1];
  await practise(page, request, { tab: "Geometry", skill: w.skills.areaPerimeter, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(`${ex.plain} ${unit}2`);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("a stacked fraction: dividing at the short bar is named, then the long bar's answer is correct", async ({ page, request }) => {
  const { r, ex } = find("stackedFractions", 1, (e) => trapInputs(e).some((t) => t.id === "stackWrongBar"));
  await practise(page, request, { tab: "Number", skill: w.skills.stackedFractions, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(trapInputs(ex).find((t) => t.id === "stackWrongBar")!.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("divides at a short bar first")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("counting in steps: one on from the last number is named, then the step's answer is correct", async ({ page, request }) => {
  const { r, ex } = find("skipCount", 2, (e) => trapInputs(e).some((t) => t.id === "stepOfOne"));
  await practise(page, request, { tab: "Number", skill: w.skills.skipCount, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(trapInputs(ex).find((t) => t.id === "stepOfOne")!.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("This count moves")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("written subtraction across zeros: the zero left at ten is named, then the answer typed in threes is correct", async ({ page, request }) => {
  const { r, ex } = find("columnSums", 2, (e) => trapInputs(e).some((t) => t.id === "zeroTradeTen") && Number(e.plain) >= 10_000);
  await practise(page, request, { tab: "Number", skill: w.skills.columnSums, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(trapInputs(ex).find((t) => t.id === "zeroTradeTen")!.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("leaves a crossed-out zero at 10")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain.replace(/\B(?=(\d{3})+$)/g, " "));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("long division: the remainder written after the point is named, then the decimal is correct", async ({ page, request }) => {
  const { r, ex } = find("longDivide", 3, (e) => e.prompt === w.written.asDecimal);
  await practise(page, request, { tab: "Number", skill: w.skills.longDivide, level: "hard", r, prompt: ex.prompt });
  // The whole quotient, a point, and the remainder: 97.9 for 97 remainder 9.
  const slip = ex.answer.traps!.find((t) => t.id === "remainderAfterPoint")!.a as { v: number };
  await page.getByLabel("Your answer").fill(String(slip.v));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("writes the remainder after the point")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("decimals: tenths for the hundredths of a grid product is named, then the hundredths are correct", async ({ page, request }) => {
  const { r, ex } = find("decimalTimes", 1, (e) => trapInputs(e).some((t) => t.id === "placesNotAdded"));
  await practise(page, request, { tab: "Number", skill: w.skills.decimalTimes, level: "easy", r, prompt: ex.prompt });
  // 0.3 × 0.4 answered 1.2: the point placed for one factor's tenths only.
  const slip = ex.answer.traps!.find((t) => t.id === "placesNotAdded")!.a as { v: number };
  await page.getByLabel("Your answer").fill(String(slip.v));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Count the digits after the point in both")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
