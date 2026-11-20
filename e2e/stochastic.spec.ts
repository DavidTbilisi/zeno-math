// Stochastic processes (a degree elective) in practice: a biased gambler's ruin answered with r = p/q (named), then
// with r = q/p; the chance a Brownian motion reaches a level answered without doubling (named), then doubled.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("gambler's ruin: the ratio turned over is named, then the chance is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("randomWalks", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "ruinRatioInverted")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.randomWalks, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Use r = q/p")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("reflection principle: the chance not doubled is named, then the doubled chance is correct", async ({ page, request }) => {
  const r = 0.05;
  const ex = exercise("brownian", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "reflectionNotDoubled")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.brownian, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Reflecting a path")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
