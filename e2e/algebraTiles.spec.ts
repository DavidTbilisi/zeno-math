// Algebra tiles, worked by hand: a 1 dragged onto the top side makes (x + 3)(x + 3); a side's tile tapped comes off; on
// the mat an x dropped on a −x cancels it, a tray tap puts a tile out, a tile dragged to the bin goes; a factor puzzle
// is solved by building its sides.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("algebra tiles: multiply, combine and factor by hand", async ({ page }) => {
  const piece = await boardWith(page, "Algebra tiles", ".live-algebraTiles");
  const pic = piece.locator("svg").first();
  const top = pic.getByRole("group", { name: /^Top side/ });
  const left = pic.getByRole("group", { name: /^Left side/ });
  const oneTray = pic.getByRole("button", { name: /^\+1 tiles/ });

  // Multiply: (x + 2)(x + 3) to start; a 1 dragged onto the top side, then one of the left side's ones tapped off.
  await expect(piece).toContainText("(x + 2)(x + 3) = x² + 3x + 2x + 6");
  await expect(piece).toContainText("= x² + 5x + 6");
  await drag(page, oneTray, top);
  await expect(piece).toContainText("= x² + 6x + 9");
  await pic.getByRole("button", { name: /^Left side: 1 tile/ }).first().click();
  await expect(piece).toContainText("(x + 3)(x + 2)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-multiply.png` });

  // Combine: x² + 3x + 2 and −x − 4 out; drag an x onto the −x and the two cancel.
  await pic.getByRole("button", { name: "Combine" }).click();
  await expect(piece).toContainText("On the mat: x² + 3x + 2 − x − 4");
  await expect(piece).toContainText("Zero pairs cancel: x² + 2x − 2");
  const lastOne = pic.getByRole("button", { name: /^−1 tile:/ }).last();
  const before = await lastOne.boundingBox();
  await drag(page, pic.getByRole("button", { name: /^x tile:/ }).first(), pic.getByRole("button", { name: /^−x tile:/ }));
  await expect(piece).toContainText("On the mat: x² + 2x + 2 − 4");
  // The tiles left hold their places.
  expect(await lastOne.boundingBox()).toEqual(before);
  // A tap on the +1 tray puts one out; a −1 dragged to the bin goes; a tap on a 1 takes it away.
  await pic.getByRole("button", { name: /^\+1 tiles/ }).click();
  await expect(piece).toContainText("On the mat: x² + 2x + 3 − 4");
  await drag(page, lastOne, pic.getByRole("button", { name: /Drop tiles here/ }));
  await expect(piece).toContainText("On the mat: x² + 2x + 3 − 3");
  await pic.getByRole("button", { name: /^1 tile:/ }).first().click();
  await expect(piece).toContainText("On the mat: x² + 2x + 2 − 3");
  await pic.getByRole("button", { name: /Put the tiles in rows/ }).click();
  await expect(piece).toContainText("On the mat: x² + 2x + 2 − 3");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-combine.png` });

  // Factor: the third puzzle is x² + 4x + 4; sides reset to x and x, two ones dragged on top and two typed on the left.
  await pic.getByRole("button", { name: "Factor" }).click();
  await expect(piece).toContainText("Make a rectangle from x² + 3x + 2");
  await pic.getByRole("button", { name: "Next puzzle" }).click();
  await pic.getByRole("button", { name: "Next puzzle" }).click();
  await expect(piece).toContainText("Puzzle 3 of");
  await expect(piece).toContainText("Make a rectangle from x² + 4x + 4");
  await drag(page, oneTray, top);
  await drag(page, oneTray, top);
  await left.focus();
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await expect(piece).toContainText("✓ x² + 4x + 4 = (x + 2)(x + 2)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-factor.png` });
});
