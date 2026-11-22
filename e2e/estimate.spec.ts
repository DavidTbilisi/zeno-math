// Estimation by hand: the half-way mark tapped on from the pill in the picture's corner (a peek in a round), the pin
// dragged onto the line.
import { expect, test } from "@playwright/test";
import { ESTIMATE_LADDER, roundTasks, shareAlong } from "../src/math/estimate.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("estimation by hand: the half pill in the picture, the pin dragged", async ({ page }) => {
  const game = await boardWith(page, "Number line estimation game", ".live-estimate");
  const pic = game.locator("svg").first();
  const half = pic.getByRole("button", { name: /^½ / });
  await expect(half).toHaveAttribute("aria-pressed", "false");
  await half.click();
  await expect(half).toHaveAttribute("aria-pressed", "true");
  const t = roundTasks(ESTIMATE_LADDER[0].level, ESTIMATE_LADDER[0].seed)[0];
  const b = (await pic.boundingBox())!;
  const k = b.width / 700;
  const x = b.x + (50 + shareAlong(t.play, t.v) * 600) * k;
  await page.mouse.move(b.x + 350 * k, b.y + 130 * k);
  await page.mouse.down();
  await page.mouse.move(x, b.y + 130 * k, { steps: 8 });
  await page.mouse.up();
  await expect(game.getByText(/^(Right! Off by only|Bullseye|Half way)/)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/estimate.png` });
});
