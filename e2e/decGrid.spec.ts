// The hundredths grid, worked by hand: squares dragged across to shade them until the amount asked is made, its rule
// said and Next asking the next amount; a drag started on a shaded square takes squares off; the arrow keys add a
// square or, with Shift, a column.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

/** A drag from square a to square b (squares numbered down the first column, then the next). */
async function sweep(page: Page, pic: Locator, a: number, b: number) {
  const at = async (i: number) => {
    const r = (await pic.locator(`rect[data-cell='${i}']`).boundingBox())!;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const [p, q] = [await at(a), await at(b)];
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 12 });
  await page.mouse.up();
}

test("hundredths grid by hand: shade 0.07, find the tenth, take squares off, keys", async ({ page }) => {
  const piece = await boardWith(page, "Hundredths grid: find what a square is worth", ".live-decGrid");
  const pic = piece.locator("svg").first();
  await expect(pic.locator("[data-ask]")).toHaveText("Shade 0.07");
  await expect(pic.locator("[data-amount]")).toHaveText("Shaded: 0");

  // Down the first column to its 9th square: 0.09, more than asked; two taken off from the bottom make 0.07.
  await sweep(page, pic, 0, 8);
  await expect(pic.locator("[data-amount]")).toHaveText("Shaded: 0.09");
  await expect(pic.locator("[data-say]")).toHaveText("More than 0.07: take some off");
  await sweep(page, pic, 8, 7);
  await expect(pic.locator("[data-amount]")).toHaveText("Shaded: 0.07");
  await expect(pic.locator("[data-say]")).toHaveText("That is 0.07!");
  await expect(pic.locator("[data-rule='hundredth']")).toContainText("A small square is a hundredth, 0.01: 7 squares make 0.07.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/decGrid-hundredth.png` });

  // Next: 0.13, made by the keys: a column with Shift, then three squares.
  await pic.getByRole("button", { name: "Next" }).click();
  await expect(pic.locator("[data-ask]")).toHaveText("Shade 0.13");
  await expect(pic.locator("[data-amount]")).toHaveText("Shaded: 0");
  const grid = pic.getByRole("slider");
  await grid.focus();
  await grid.press("Shift+ArrowUp");
  await expect(pic.locator("[data-amount]")).toHaveText("Shaded: 0.1");
  for (let k = 0; k < 4; k++) await grid.press("ArrowUp");
  await grid.press("ArrowDown");
  await expect(pic.locator("[data-say]")).toHaveText("That is 0.13!");

  // Next: 0.3, three columns swept across the top row's corner to corner.
  await pic.getByRole("button", { name: "Next" }).click();
  await expect(pic.locator("[data-ask]")).toHaveText("Shade 0.3");
  for (const c of [0, 1, 2]) await sweep(page, pic, 10 * c, 10 * c + 9);
  await expect(pic.locator("[data-say]")).toHaveText("That is 0.3!");
  await expect(pic.locator("[data-rule='tenth']")).toContainText("A column of ten squares is a tenth, 0.1: 3 columns make 0.3.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/decGrid.png` });
});
