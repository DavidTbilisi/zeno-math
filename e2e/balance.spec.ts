// Balance by hand: a wrong weight weighed (the scales tapped) tips the scales; the wheel turned to the right weight
// and the scales tapped again balance them, for two stars.
import { expect, test } from "@playwright/test";
import { BALANCE_LADDER, balanceTask } from "../src/math/balance.ts";
import { rng } from "../src/math/random.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("balance by hand: a wheel per shape, the scales tapped to weigh", async ({ page }) => {
  const game = await boardWith(page, "Balance the scales", ".live-balance");
  const t = balanceTask(BALANCE_LADDER[0].level, rng(BALANCE_LADDER[0].seed));
  const wheel = game.getByRole("slider", { name: "What ■ weighs" });
  const scales = game.getByRole("button", { name: "Tap the scales to weigh" });
  const wrong = t.values[0] === 1 ? 2 : 1;
  if (wrong === 2) await wheel.press("ArrowUp");
  await scales.click();
  await expect(game).toContainText("Not yet");
  for (let v = wrong; v < t.values[0]; v++) await wheel.press("ArrowUp");
  await expect(wheel).toHaveAttribute("aria-valuenow", String(t.values[0]));
  await scales.press("Enter");
  await expect(game.getByText(/Balanced! ★★/)).toBeVisible();
  await expect(scales).toHaveAttribute("aria-disabled", "true");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/balance.png` });
});
