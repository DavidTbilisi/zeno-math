// Everyday money: the piece says 20 % off then 10 % off is 72, not 70; in practice the two percentages added are named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.twoChanges;
const w = en.pracWords;

test("two changes in a row: 20 % off then 10 % off is 72", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveTwoChanges, ".live-twoChanges");
  await expect(g.getByText("20% off, then 10% off: 100 → 80 → 72.")).toBeVisible();
  await expect(g.getByText(/^That is 28 off in all, not 30/)).toBeVisible();
  const second = g.getByRole("slider", { name: W.secondName });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await second.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowLeft");
    await expect(second).toHaveAttribute("aria-valuenow", "15", { timeout: 1000 });
  }).toPass();
  await expect(g.getByText("20% off, then 15% off: 100 → 80 → 68.")).toBeVisible();
});

test("money in practice: two percentages added are named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("moneySense", 2, seedOf(k / 100), w).answer.traps?.some((t) => t.id === "percentsAdded")) {
      r = k / 100;
      break;
    }
  const ex = exercise("moneySense", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "percentsAdded")!;
  await practise(page, request, { tab: "Number", skill: w.skills.moneySense, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? slip.a.v.toFixed(2) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Changes in a row multiply")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
