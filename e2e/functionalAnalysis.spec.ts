// Functional analysis (a degree elective) in practice: row sums given for the 1-norm of a matrix (named), then the
// column sums; a projection coefficient not divided by ⟨u, u⟩ (named), then the right one.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("operator norms: rows for columns is named, then the right norm is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("operatorNorms", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "rowsForColumns")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.operatorNorms, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("they are the other way round")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("Hilbert spaces: a projection not divided by ⟨u, u⟩ is named, then the right one is correct", async ({ page, request }) => {
  const r = 0.02;
  const ex = exercise("hilbertSpaces", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "noNormalise")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.hilbertSpaces, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("orthogonal to u when u is not a unit vector")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
