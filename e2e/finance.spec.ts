// Financial mathematics (a degree elective) in practice: a one-period option priced with the real-world p (named),
// then with p̃; a two-period American put priced as the European one (named), then with early exercise.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("binomial pricing: the real-world p is named, then the risk-neutral price is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("binomialPricing", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "realWorldProbability")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.binomialPricing, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The real-world p plays no part in the price")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("option pricing: the European price for an American put is named, then early exercise is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("optionPricing", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "americanAsEuropean")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.optionPricing, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The American one may be exercised early")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
