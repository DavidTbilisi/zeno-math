// Dynamical systems (a degree elective) in practice: a saddle-node's critical r from the discriminant without its 4
// (named), then the right r; the 2-cycle of the logistic map with the fixed points left in (named), then the cycle.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("bifurcations: the discriminant's 4 is named, then the right critical r is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("bifurcations", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "discriminantNotQuartered")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.bifurcations, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("still has the 4 in it")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("iterated maps: the fixed points left in the 2-cycle are named, then the cycle is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("iteratedMaps", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "fixedPointsNotDivided")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.iteratedMaps, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Divide them out")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
