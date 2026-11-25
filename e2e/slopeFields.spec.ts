// Slope fields: a point dropped at y = 1 on the logistic field rises towards 8, and one at y = 8 stays put; in
// practice the logistic brake left out is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.dropPoint;
const w = en.pracWords;

test("drop a point: the logistic curve rises to 8, and y = 8 is an equilibrium", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveDropPoint, ".live-dropPoint");
  await expect(g.getByRole("group", { name: /^Dropped at \(0, 1\), the slope is 0\.4375\. Below 8 the curve rises and levels off at 8/ })).toBeVisible();
  const y = g.getByRole("slider", { name: W.yLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await y.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(y).toHaveAttribute("aria-valuenow", "3", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 13; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByRole("group", { name: /the slope is 0\. The slope is 0 all along: y = 8 is an equilibrium/ })).toBeVisible();
});

test("slope fields in practice: the logistic brake left out is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("slopeFields", 3, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "logisticAsExponential")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("slopeFields", 3, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "logisticAsExponential")!;
  await practise(page, request, { tab: en.practiceCalculus, skill: w.skills.slopeFields, level: "hard", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/Keep the brake/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
