// The percent bar by hand (#707): even the right tile, tapped before shading, is met with "shade it first"; the bar pressed at 50 %
// shows its two parts; the slip (the percent taken for the amount) and then the rule; the shade moved by the keys;
// finding the whole, the shade cannot pass the known part and says what a smaller share holds.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("percent bar by hand: shade first, the parts' worth, then the whole from a known part", async ({ page }) => {
  const piece = await boardWith(page, "Percent bar: shade it by hand", ".live-percentHand");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  await expect(pic.locator("[data-ask]")).toHaveText("Shade 50% of 80. How much is it?");

  await tile("40").click();
  await expect(say).toHaveText("Drag the shade to 50% first and watch the bar.");
  // The bar pressed half way along: the shade jumps there and the bar shows its two parts of 40.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.click(b.x + (60 + 50 * 6) * k, b.y + 178 * k);
  await expect(pic.locator("[data-shade-pct]")).toHaveText("50%");
  await expect(pic.locator("[data-part]")).toHaveCount(2);
  await tile("50").click();
  await expect(say).toHaveText("50 is the percent, not the amount. What is each part of the bar worth?");
  await tile("40").click();
  await expect(say).toHaveText("50% is 1 × 50%. Each 50% is 80 ÷ 2 = 40, so 50% is 1 × 40 = 40.");

  // Round 2 by the keys: five steps of 5 % make 25 %, a quarter, four parts.
  await tile("Next").click();
  const bar = pic.getByRole("slider");
  await bar.focus();
  for (let i = 0; i < 5; i++) await bar.press("ArrowRight");
  await expect(pic.locator("[data-part]")).toHaveCount(4);
  await tile("20").click();
  await expect(say).toContainText("Each 25% is 80 ÷ 4 = 20");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/percentHand-of.png` });

  // Rounds 3 to 5: the bar pressed at the percent, then the amount.
  for (const [p, v] of [[10, "12"], [30, "36"], [75, "45"]] as const) {
    await tile("Next").click();
    await page.mouse.click(b.x + (60 + p * 6) * k, b.y + 178 * k);
    await tile(v).click();
    await expect(say).toContainText(`= ${v}.`);
  }

  // The whole from 40 % holding 36: the shade cannot pass 40 %; at 10 % it holds 9.
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("The shade is 40% and holds 36. How much is the whole bar?");
  await bar.focus();
  await bar.press("ArrowRight");
  await expect(pic.locator("[data-shade-pct]")).toHaveText("40%");
  for (let i = 0; i < 6; i++) await bar.press("ArrowLeft");
  await expect(pic.locator("[data-holds]")).toHaveText("holds 9");
  await tile("18").click();
  await expect(say).toHaveText("That is only 20%. How many of those make the whole bar?");
  await tile("90").click();
  await expect(say).toHaveText("40% holds 36, so 20% holds 36 ÷ 2 = 18, and 100% is 5 × 18 = 90.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/percentHand-whole.png` });
});
