// Trigonometric graphs: the level y = 1 meets 2sin x at 30° and 150°, four times once the wheel turns twice as fast;
// in practice a calculator's single angle is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.wheelWave;
const w = en.pracWords;

test("from the wheel to the wave: y = 1 meets 2sin x twice, and 2sin 2x four times", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveWheelWave, ".live-wheelWave");
  await expect(g.getByRole("group", { name: /meets the wave 2 times between 0° and 360°: at 30°, 150°/ })).toBeVisible();
  const speed = g.getByRole("slider", { name: W.bLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await speed.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(speed).toHaveAttribute("aria-valuenow", "2", { timeout: 1000 });
  }).toPass();
  await expect(g.getByRole("group", { name: /period 360° ÷ 2 = 180°.*meets the wave 4 times between 0° and 360°: at 15°, 75°, 195°, 255°/ })).toBeVisible();
  await g.getByRole("slider", { name: W.levelLabel }).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
  await expect(g.getByRole("group", { name: /The level y = 3 is never reached/ })).toBeVisible();
});

test("trigonometric equations in practice: a calculator's single angle is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("trigEquations", 1, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "oneSolutionOnly")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("trigEquations", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "oneSolutionOnly")!;
  await practise(page, request, { tab: en.practiceGeometry, skill: w.skills.trigEquations, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/A calculator gives only one angle/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
