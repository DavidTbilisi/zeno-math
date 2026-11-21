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

test("loan amortisation: the payments subtracted without interest are named, then the balance is correct (#455)", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("amortisation", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "balanceNoInterest")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.amortisation, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Interest is added every month too")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("NPV: the flows added undiscounted are named, then the net present value is correct (#456)", async ({ page, request }) => {
  // Medium is a project's NPV or whether to take it on: an r whose question is the NPV.
  const r = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08].find((x) => exercise("npv", 2, seedOf(x), w).format === "dp2")!;
  const ex = exercise("npv", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "npvUndiscounted")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.npv, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Adding the flows as they are")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("bonds: the face value left undiscounted is named, then the price is correct (#457)", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("bonds", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "faceUndiscounted")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.bonds, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("F comes back only after n years")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("inflation: the rough real rate i − π is named, then the exact rate is correct (#458)", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("inflation", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "realRateApprox")!;
  await practise(page, request, { tab: "Number", skill: w.skills.inflation, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("i − π is the rough real rate")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("currency: the bank's other rate is named, then the change is correct (#459)", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("currency", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "spreadWrongSide")!;
  await practise(page, request, { tab: "Number", skill: w.skills.currency, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That is the bank's other rate")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
