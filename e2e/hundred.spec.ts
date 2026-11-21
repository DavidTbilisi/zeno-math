// The hundred square, worked by hand: squares tapped and dragged across are marked, the number box marks multiples,
// the bin clears; in jumps a drag from 23 to 56 jumps by tens and ones, a tap on the last square takes a jump back.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("hundred square: marks and jumps by hand", async ({ page }) => {
  const piece = await boardWith(page, "Hundred square to colour", ".live-hundred");
  const pic = piece.locator("svg").first();
  const sq = (v: number) => pic.getByRole("button", { name: new RegExp(`^${v}( ✓)?$`) });

  // Mark: a tap, then a drag across a row paints 41 to 45.
  await sq(7).click();
  await expect(sq(7)).toHaveAccessibleName("7 ✓");
  await drag(page, sq(41), sq(45));
  await expect(piece).toContainText("6 marked");
  await expect(sq(43)).toHaveAccessibleName("43 ✓");
  // The number box up one (from 3 to 4) marks the multiples of 4.
  await pic.getByRole("slider", { name: "Multiples of" }).press("ArrowUp");
  await expect(piece).toContainText("25 marked");
  await pic.getByRole("button", { name: /take every mark off/ }).click();
  await expect(piece).toContainText("0 marked");

  // Jumps: tap 23, drag to 56: 23 + 10 + 10 + 10 + 1 + 1 + 1 = 56.
  await pic.getByRole("button", { name: "Jumps" }).click();
  await sq(23).click();
  await drag(page, sq(23), sq(56));
  await expect(piece).toContainText("23 + 33 = 56");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/hundred.png` });
  // A tap on 56 takes the last jump back; a tap on 54 (one jump on) goes there.
  await sq(56).click();
  await expect(piece).toContainText("23 + 32 = 55");
  await sq(54).click();
  await expect(piece).toContainText("23 + 31 = 54");
  await pic.getByRole("button", { name: /start the jumps again/ }).click();
  await expect(piece).not.toContainText("= 54");
});
