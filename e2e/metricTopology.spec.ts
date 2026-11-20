// Metric spaces and topology (degree level) in practice: the closure of a half-open interval with its limit point
// left out (named), then the closed interval; the components of ℝ less two points counted by the fencepost slip
// (named), then n + 1.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("closure: the limit point left out is named, then the closed interval is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("openClosed", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "limitPointsLeftOut")!;
  await practise(page, request, { tab: "Geometry", skill: w.skills.openClosed, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The closure adds every limit point")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("components: the fencepost slip is named, then n + 1 is correct", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("connected", 2, seedOf(r), w);
  const slip = trapInputs(ex).find((t) => t.id === "componentsFencepost")!;
  await practise(page, request, { tab: "Geometry", skill: w.skills.connected, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.input);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("the two rays count too")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
