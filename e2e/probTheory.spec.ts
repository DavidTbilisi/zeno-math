// Probability theory (degree level) in practice: a conditional probability left undivided (named), then the
// quotient; the spread of a sample mean left at one value's (named), then σ²/n or σ/√n.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("joint distributions: the joint probability left undivided is named, then the conditional is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("jointDist", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "conditionalNotDivided")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.jointDist, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Divide the joint probability by the probability of what is given")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("limit theorems: one value's spread for the mean's is named, then the mean's is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("limitTheorems", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "varianceNotDivided")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.limitTheorems, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The mean of n values varies less than one value")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
