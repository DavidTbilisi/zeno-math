// Group theory in practice: the size of ℤₙ given as an element's order (named), then the order; στ composed σ first
// (named), then τ first.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("order of an element: the size of the group is named, then the order is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("elementOrder", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "orderIsGroupSize")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.elementOrder, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That is the size of the group")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("permutations: στ worked σ first is named, then τ first is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("permutations", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "composedLeftToRight")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.permutations, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("στ means τ first, then σ")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
