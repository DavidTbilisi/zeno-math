// A fair price as a balance (#739): a price too low favours the player, the average of the prizes and the likeliest
// prize are named when the game is not fair, the tally shows winnings against pay, and the last round says the rule.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("the fair price is the expected value: each prize times its chance", async ({ page }) => {
  const piece = await boardWith(page, "Expected value: find the fair price", ".live-fairGame");
  const pic = piece.locator("svg").first();
  const at = (p: number) => pic.getByRole("button", { name: `price ${p}`, exact: true });
  const say = pic.locator("[data-say]");
  const ask = pic.locator("[data-ask]");
  const tallySay = pic.locator("[data-tally]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(ask).toContainText("Which price per spin makes the game fair?");
  await at(1).click();
  await expect(say).toContainText("the game favours the player");
  await expect(tallySay).toContainText("pays 20 × 1 = 20");
  await at(2).focus();
  await page.keyboard.press("Enter");
  await expect(say).toContainText("wins about 40 and pays 40");

  await next();
  await at(4).click();
  await expect(say).toContainText("the average of the prizes 0, 8");
  await at(0).click();
  await expect(say).toContainText("the most likely prize");
  await at(2).click();
  await expect(say).toContainText("only a quarter of the spins");

  for (const p of [2, 3]) {
    await next();
    await at(p).click();
  }
  await expect(say).toContainText("the big prizes are rare");
  await next();
  await at(3).click();
  await expect(say).toContainText("the fair price is the expected value");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fairGame-fair.png` });
  await next();
  await expect(ask).toContainText("All rounds done");
});
