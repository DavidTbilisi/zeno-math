// Algebra tiles: the rectangle of (x + 2)(x + 3) is x² + 5x + 6; an x dragged onto a −x cancels it, zero pairs go
// and leave the same value; a factor puzzle is solved by its sides.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("algebra tiles: multiply, combine and factor", async ({ page }) => {
  const piece = await boardWith(page, "Algebra tiles", ".live-algebraTiles");

  // Multiply: (x + 2)(x + 3) to start, then one more on the top side's ones.
  await expect(piece).toContainText("(x + 2)(x + 3) = x² + 3x + 2x + 6");
  await expect(piece).toContainText("= x² + 5x + 6");
  await piece.getByRole("button", { name: "One 1 more" }).first().click();
  await expect(piece).toContainText("= x² + 6x + 9");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-multiply.png` });

  // Combine: x² + 3x + 2 and −x − 4 out; the zero pairs go, the value stays.
  await piece.getByRole("button", { name: "Combine" }).click();
  await expect(piece).toContainText("On the mat: x² + 3x + 2 − x − 4");
  await expect(piece).toContainText("x² + 2x − 2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-combine.png` });
  // Drag the first x onto the −x: that pair cancels, the value stays.
  const pic = piece.locator("svg").first();
  const lastOne = pic.getByRole("button", { name: "Take away this −1 tile" }).last();
  const before = await lastOne.boundingBox();
  const x = (await pic.getByRole("button", { name: "Take away this x tile" }).first().boundingBox())!;
  const minusX = (await pic.getByRole("button", { name: "Take away this −x tile" }).boundingBox())!;
  await page.mouse.move(x.x + x.width / 2, x.y + x.height / 2);
  await page.mouse.down();
  await page.mouse.move(minusX.x + minusX.width / 2, minusX.y + minusX.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(piece).toContainText("On the mat: x² + 2x + 2 − 4");
  // The tiles left hold their places.
  expect(await lastOne.boundingBox()).toEqual(before);
  await piece.getByRole("button", { name: "Take away zero pairs" }).click();
  await expect(piece).toContainText("On the mat: x² + 2x − 2");
  await piece.getByRole("button", { name: "Put out a −x tile" }).click();
  await expect(piece).toContainText("On the mat: x² + 2x − x − 2");
  await piece.getByRole("button", { name: "Take away this −x tile" }).click();
  await expect(piece).toContainText("On the mat: x² + 2x − 2");

  // Factor: x² + 3x + 2 is (x + 1)(x + 2).
  await piece.getByRole("button", { name: "Factor" }).click();
  await expect(piece).toContainText("Make a rectangle from x² + 3x + 2");
  await piece.getByRole("button", { name: "Next puzzle" }).click();
  await piece.getByRole("button", { name: "Next puzzle" }).click();
  await expect(piece).toContainText("Puzzle 3 of");
  await expect(piece).toContainText("Make a rectangle from x² + 4x + 4");
  // Sides reset to x and x: two more ones on each.
  for (const i of [0, 1]) {
    const more = piece.getByRole("button", { name: "One 1 more" }).nth(i);
    await more.click();
    await more.click();
  }
  await expect(piece).toContainText("✓ x² + 4x + 4 = (x + 2)(x + 2)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tiles-factor.png` });
});
