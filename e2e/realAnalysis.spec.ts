// Real analysis in practice: the N where the distance only equals ε (named), then the first N that works; f(b)
// bounded with the other bound on f′ (named), then right.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("ε–N: the N with the distance equal to ε is named, then the first N that works is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("seqLimits", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "epsilonBoundaryN")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.seqLimits, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That n only makes the gap equal to ε")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("mean value theorem: f(b) bounded with the other bound on f′ is named, then the right bound is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("mvt", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "boundWrongEnd")!;
  await practise(page, request, { tab: "Calculus", skill: w.skills.mvt, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the largest value uses the largest f′")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
