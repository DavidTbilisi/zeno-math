// Number rods, worked by hand: the rod that fits a gap is dragged in from the tray, a rod is moved along its row and
// to another row, a tray rod tapped joins the last row, and a rod dragged back to the tray comes off.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const at = async (l: Locator | { x: number; y: number }) => {
    if (!("boundingBox" in l)) return l;
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const [a, b] = [await at(from), await at(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test("number rods by hand: fill a gap, move a rod, add and take off", async ({ page }) => {
  const piece = await boardWith(page, "Number rods", ".live-rods");
  const pic = piece.locator("svg").first();
  const rod = (t: number, i: number) => pic.locator(`g[data-rod='${t}-${i}']`);
  const tray = (n: number) => pic.getByRole("button", { name: `Rod ${n}`, exact: true });
  await expect(piece).toContainText("10 = 9 + 1 = 8 + 2");
  await expect(piece).toContainText("7 + ? = 10");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rods-start.png` });

  // The light green 3 dragged into the gap beside the 7: a third way to make 10, and no gap left.
  await drag(page, tray(3), pic.locator("g[data-gap='3']"));
  await expect(piece).toContainText("10 = 9 + 1 = 8 + 2 = 7 + 3");
  await expect(pic.locator("g[data-gap]")).toHaveCount(0);

  // The 1 of the second row dragged to the row's start: 1 + 9.
  const nine = (await rod(1, 0).boundingBox())!;
  await drag(page, rod(1, 1), { x: nine.x + 20, y: nine.y + nine.height / 2 });
  await expect(piece).toContainText("10 = 1 + 9 = 8 + 2 = 7 + 3");

  // The 2 of the third row moved onto the end of the fourth: 8 is left with a gap, and 12 is now the longest.
  const three = (await rod(3, 1).boundingBox())!;
  await drag(page, rod(2, 1), { x: three.x + three.width + 60, y: three.y + three.height / 2 });
  await expect(rod(3, 2)).toBeVisible();
  await expect(piece).toContainText("7 + 3 + 2 = 12");
  await expect(piece).toContainText("10 + ? = 12");

  // By the keys: the 2 goes back up a row; then a tray rod tapped joins the end of the last row.
  await rod(3, 2).focus();
  await rod(3, 2).press("ArrowUp");
  await expect(piece).toContainText("10 = 1 + 9 = 8 + 2 = 7 + 3");
  await tray(5).click();
  await expect(piece).toContainText("7 + 3 + 5 = 15");

  // The 5 dragged back over the tray comes off.
  await drag(page, rod(3, 2), tray(8));
  await expect(piece).toContainText("10 = 1 + 9 = 8 + 2 = 7 + 3");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/rods.png` });
});
