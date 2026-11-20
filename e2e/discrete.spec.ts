// Discrete mathematics (degree level) in practice: the overlaps of inclusion–exclusion left in (named), then the count;
// the pigeonhole guarantee without its + 1 (named), then the guarantee.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("inclusion–exclusion: the overlaps not subtracted are named, then the union is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("inclusionExclusion", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "intersectionsNotSubtracted")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.inclusionExclusion, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Elements in two of the sets are counted twice")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("pigeonhole: the guarantee without its + 1 is named, then the guarantee is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("pigeonhole", 1, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "pigeonholeNoPlusOne")!;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.pigeonhole, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That many can still miss, one short in every box")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
