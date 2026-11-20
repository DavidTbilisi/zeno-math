// Mathematical statistics (degree level) in practice: a maximum-likelihood rate inverted to the sample mean (named),
// then n / Σxᵢ; a beta–binomial posterior with the successes and failures swapped (named), then the right mean.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("maximum likelihood: the inverted rate is named, then n over the sum is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("mle", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "mleRateInverted")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.mle, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the parameter is one over the mean")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("Bayesian inference: the swapped posterior is named, then the beta posterior mean is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("bayes", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "posteriorFailuresSwapped")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.bayes, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The successes add to a and the failures to b")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
