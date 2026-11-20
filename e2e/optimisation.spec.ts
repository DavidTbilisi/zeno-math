// Optimisation of a degree in practice: a least cost over an unbounded region answered with the largest corner
// (named), then the least; the least squared distance to a half-plane with λ² not halved (named), then λ²/2.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("linear programming: the largest corner for a minimisation is named, then the least value is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("linearProgramming", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "maxForMin")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.linearProgramming, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("This is a minimisation")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("KKT: the value not halved is named, then the least value is correct", async ({ page, request }) => {
  const r = 0.02;
  const ex = exercise("convex", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "projectionNotHalved")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.convex, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("x and y each move by λ/2")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
