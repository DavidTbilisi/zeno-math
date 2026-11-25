// Exponential growth: dragging the day past seventeen shows the multiplying plant overtake; in practice the factor
// times the steps is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.growthRace;
const w = en.pracWords;

test("the growth race: at 30 % a day the multiplying plant overtakes on day 17", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveGrowthRace, ".live-growthRace");
  await expect(g.getByRole("group", { name: /It overtakes on day 17/ })).toBeVisible();
  const day = g.getByRole("slider", { name: W.dayLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await day.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(day).toHaveAttribute("aria-valuenow", "1", { timeout: 1000 });
  }).toPass();
  for (let i = 1; i < 17; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByRole("group", { name: /overtook on day 17/ })).toBeVisible();
});

test("exponential growth in practice: the factor times the steps is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("exponential", 1, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "factorTimesSteps")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("exponential", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "factorTimesSteps")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.exponential, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/Each step multiplies by/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
