// Kakooma by hand: the hint is a bulb in the picture's corner (it rings a part and costs a star), the number tapped in
// the picture.
import { expect, test } from "@playwright/test";
import { KAK_LADDER, kakTask } from "../src/math/kakooma.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("kakooma by hand: the bulb in the picture, then the sum tapped", async ({ page }) => {
  const game = await boardWith(page, "Kakooma: find the sum of two others", ".live-kakooma");
  const pic = game.locator("svg").first();
  const [one] = kakTask(KAK_LADDER[0].level, KAK_LADDER[0].grid, KAK_LADDER[0].seed).sets;
  await pic.getByRole("button", { name: /^Hint:/ }).click();
  await expect(pic.getByRole("button", { name: /^Hint:/ })).toHaveCount(0);
  await expect(game.getByText(/^💡 /)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/kakooma.png` });
  await pic.getByRole("button", { name: String(one.answer), exact: true }).click();
  await expect(game.getByText(/^Right! 7 = 2 \+ 5\. ★★☆/)).toBeVisible();
});
