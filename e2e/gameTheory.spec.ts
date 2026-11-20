// Game theory (a degree elective) in practice: a mixed equilibrium found from the player's own payoffs (named), then
// from the other player's; the Stackelberg follower given the Cournot output (named), then the right one.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("mixed equilibrium: the player's own payoffs are named, then the indifference answer is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("mixedNash", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "mixOwnPayoff")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.mixedNash, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("each player mixes to make the other indifferent")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("Stackelberg: the Cournot output is named, then the follower's output is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("backwardInduction", 3, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "cournotForStackelberg")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.backwardInduction, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("when the firms choose at the same time")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
