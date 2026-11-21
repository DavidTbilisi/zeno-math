// The ten frame, worked by hand: a red counter dragged onto a square, a yellow tray tapped to fill the next square, a
// counter tapped turns over, one dragged off the frame goes, the second frame opens, and the bin clears both.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: { x: number; y: number } | Locator) {
  const a = (await from.boundingBox())!;
  const b = "boundingBox" in to ? (await to.boundingBox())! : { ...to, width: 0, height: 0 };
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("ten frame: counters by hand", async ({ page }) => {
  const piece = await boardWith(page, "Ten frame with counters", ".live-tenFrame");
  const pic = piece.locator("svg").first();
  const square = (n: number) => pic.getByRole("button", { name: new RegExp(`^Square ${n}:`) });
  const sum = (text: string) => expect(pic).toHaveAttribute("aria-label", text);

  // A red counter dragged onto square 7; the yellow tray tapped twice fills squares 1 and 2.
  await drag(page, pic.getByRole("button", { name: /^Red counters:/ }), square(7));
  await expect(square(7)).toHaveAccessibleName("Square 7: red counter");
  await pic.getByRole("button", { name: /^Yellow counters:/ }).click();
  await pic.getByRole("button", { name: /^Yellow counters:/ }).click();
  await expect(square(2)).toHaveAccessibleName("Square 2: yellow counter");
  await sum("1 red and 2 yellow: 3");
  await expect(piece).toContainText("1 + 2 = 3");

  // Square 1's counter tapped turns red; square 7's dragged onto square 3 moves; square 2's dragged off goes.
  await square(1).click();
  await sum("2 red and 1 yellow: 3");
  await drag(page, square(7), square(3));
  await expect(square(3)).toHaveAccessibleName("Square 3: red counter");
  await expect(square(7)).toHaveAccessibleName("Square 7: empty");
  const box = (await pic.boundingBox())!;
  await drag(page, square(2), { x: box.x + box.width - 4, y: box.y + 60 });
  await sum("2 red and 0 yellow: 2");

  // Two frames: the yellow tray fills on past the first frame.
  await pic.getByRole("button", { name: "Two frames" }).click();
  await expect(square(20)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tenframe.png` });
  await pic.getByRole("button", { name: /Drop a counter here/ }).click();
  await sum("0 red and 0 yellow: 0");
  await pic.getByRole("button", { name: "One frame" }).click();
  await expect(square(11)).toHaveCount(0);
});
