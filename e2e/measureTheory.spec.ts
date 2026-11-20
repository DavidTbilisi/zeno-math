// Measure theory (a degree elective) in practice: the rationals given their interval's length (named), then the
// measure without them; lim ∫ swapped for ∫ lim on a sequence whose mass escapes (named), then the right one.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("Lebesgue measure: counting the rationals is named, then measure 0 for them is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("lebesgueMeasure", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "countableCounted")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.lebesgueMeasure, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("so their measure is 0")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("convergence theorems: swapping the limit and the integral is named, then the right one is correct", async ({ page, request }) => {
  const r = 0.02;
  const ex = exercise("convergenceTheorems", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "limitSwapped")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.convergenceTheorems, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the limit and the integral don't commute")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
