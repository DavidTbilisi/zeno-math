// Multivariable and vector calculus in practice: a directional derivative not divided by |v| (named), then right; a
// polar integral with the r of dA left out (named), then right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("directional derivative: ∇f · v not divided by |v| is named, then the right rate is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("partials", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "directionNotUnit")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.partials, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/not 1: divide ∇f · v by/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("polar coordinates: dA without its r is named, then the right integral is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("changeVariables", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "forgotJacobianR")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.changeVariables, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/dA = r dr dθ in polar coordinates/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
