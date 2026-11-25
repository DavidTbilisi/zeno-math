// Samples: ten fish tapped give an estimate, five samples show the true number; in practice the sample's own count given
// for the estimate is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.sampleField;
const w = en.pracWords;

test("fish in a pond: a sample of ten gives an estimate, and five samples show the truth", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveSampleField, ".live-sampleField");
  await expect(g.getByText(/^A hundred fish in the pond/)).toBeVisible();
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await g.getByRole("button", { name: "Fish 1", exact: true }).click({ timeout: 1000 });
    await expect(g.getByRole("button", { name: "Fish 1", exact: true })).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  for (let i = 2; i <= 10; i++) await g.getByRole("button", { name: `Fish ${i}`, exact: true }).click();
  await expect(g.getByText(/red out of 10 suggests about/)).toBeVisible();
  for (let k = 0; k < 4; k++) await g.getByRole("button", { name: W.die }).click();
  await expect(g.getByText("truly 30")).toBeVisible();
});

test("samples in practice: the sample's own count given for the estimate is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("sampling", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "estimateSampleCount")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("sampling", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "estimateSampleCount")!;
  await practise(page, request, { tab: en.practiceData, skill: w.skills.sampling, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/is the count in the sample of/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
