// Logic and set theory (a degree elective) in practice: a ∃ read as ∀ in a finite structure (named), then the right
// count; the clauses of a full CNF counted as the terms of the DNF (named), then the right count.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("structures: ∃ read as ∀ is named, then the right count is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("structures", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "forallForExists")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.structures, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("check which quantifier the formula has")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("normal forms: DNF and CNF swapped is named, then the right count is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("normalForms", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "dnfCnfSwapped")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.normalForms, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("one clause for each row that makes it false")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
