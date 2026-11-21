// Comparing with blocks, worked by hand: a block from the pile onto a tower, a top block moved across and one taken
// off, a sign dragged between the cards (wrong, then right), and the pencils laid by a tap.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const a = (await from.boundingBox())!;
  const b = "boundingBox" in to ? (await to.boundingBox())! : { ...to, width: 0, height: 0 };
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("compare: towers, signs and pencils by hand", async ({ page }) => {
  const piece = await boardWith(page, "Comparing with blocks", ".live-compare");
  const pic = piece.locator("svg").first();
  const first = pic.getByRole("group", { name: /^First tower:/ });
  const second = pic.getByRole("group", { name: /^Second tower:/ });
  const middle = pic.getByRole("button", { name: /^Between the cards:/ });

  // 5 and 2 to start. A block from the pile onto the second tower: 5 and 3.
  await expect(first).toHaveAccessibleName(/^First tower: 5 blocks/);
  await drag(page, pic.getByRole("button", { name: /^Blocks: drag/ }), second);
  await expect(second).toHaveAccessibleName(/^Second tower: 3 blocks/);
  // The first tower's top block over to the second: 4 and 4; then one of the second's dragged off: 4 and 3.
  await drag(page, first.getByRole("button", { name: /^Block 5:/ }), second);
  await expect(first).toHaveAccessibleName(/^First tower: 4 blocks/);
  await expect(second).toHaveAccessibleName(/^Second tower: 4 blocks/);
  const box = (await pic.boundingBox())!;
  await drag(page, second.getByRole("button", { name: /^Block 4:/ }), { x: box.x + 180, y: box.y + 200 });
  await expect(second).toHaveAccessibleName(/^Second tower: 3 blocks/);

  // A wrong sign between the cards, dragged back out, then the right one tapped.
  await drag(page, pic.getByRole("button", { name: /^4 is less than 3:/ }), middle);
  await expect(piece).toContainText("Not quite");
  await drag(page, middle, { x: box.x + 30, y: box.y + box.height - 20 });
  await expect(middle).toHaveAccessibleName(/^Between the cards: \?/);
  await pic.getByRole("button", { name: /^4 is greater than 3:/ }).click();
  await expect(piece).toContainText("Yes! 4 is greater than 3.");

  // The pencils, tapped, are laid across the towers.
  await pic.getByRole("button", { name: /^Pencils: tap, or drag/ }).click();
  await expect(pic.getByRole("button", { name: /^Pencils: tap to lift/ })).toBeVisible();
  await expect(piece).toContainText("The sign opens towards the bigger number.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/compare.png` });
});
