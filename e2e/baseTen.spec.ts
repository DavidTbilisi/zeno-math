// Base-ten blocks as a live piece: the place-value mat on the board, its tray adding blocks, a block dragged across
// (with the piece scaled on the board) trading a ten for ten ones, and the copy placed as a picture.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("base-ten blocks: add from the tray, trade by dragging, copy as a picture", async ({ page }) => {
  const piece = await boardWith(page, "Base-ten blocks", ".live-baseTen");
  const total = piece.locator(".pv-total");
  await expect(total).toHaveText("123 = 100 + 20 + 3");

  // A click on the tray's one adds a one.
  await piece.locator(".pv-source").nth(3).click();
  await expect(total).toHaveText("124 = 100 + 20 + 4");

  // A ten dragged onto Ones breaks into ten ones.
  const ten = (await piece.locator(".pv-t .pv-placed").first().boundingBox())!;
  const ones = (await piece.locator(".pv-o .pv-body").boundingBox())!;
  await page.mouse.move(ten.x + ten.width / 2, ten.y + ten.height / 2);
  await page.mouse.down();
  await page.mouse.move(ones.x + ones.width / 2, ones.y + ones.height / 2, { steps: 8 });
  // The block follows the pointer while it is dragged.
  const ghost = (await page.locator(".pv-ghost").boundingBox())!;
  expect(Math.abs(ghost.x + ghost.width / 2 - (ones.x + ones.width / 2))).toBeLessThan(4);
  await page.mouse.up();
  await expect(total).toHaveText("124 = 100 + 10 + 14");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/base-ten.png` });

  await piece.getByRole("button", { name: "Copy as a picture" }).click();
  await expect(page.locator(".live-baseTen")).toHaveCount(1);
});
