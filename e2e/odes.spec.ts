// Differential equations in practice: an integrating factor with the wrong sign (named), then right; a Laplace
// transform of e^(bt) with the shift the wrong way (named), then right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("linear first order: the integrating factor e^(−ax) is named, then the right solution is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("odeFirst", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "integratingFactorSign")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.odeFirst, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The integrating factor of y′ + ay is e^(ax)")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("Laplace transform: 1/(s + b) for e^(bt) is named, then the right transform is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("laplace", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "laplaceShiftSign")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.laplace, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("ℒ{e^(at)} = 1/(s − a)")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
