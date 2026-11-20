// Numerical analysis (degree level) in practice: an improved-Euler step stopped at Euler's predictor (named), then the
// averaged slopes; a second divided difference left undivided (named), then divided by x₂ − x₀.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("Heun's method: Euler's predictor alone is named, then the averaged step is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("numericalOde", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "heunEulerOnly")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.numericalOde, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That is Euler's predictor")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("divided differences: the undivided difference is named, then f[x₀, x₁, x₂] is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("interpolation", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "differenceNotDivided")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.interpolation, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Divide the difference f[x₁, x₂] − f[x₀, x₁]")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
