// The geoboard by hand: corners tapped on, one tapped off, the pills hide and show the numbers, the bin takes the shape
// off; in a puzzle a wrong shape closed (the first corner tapped again) is a miss, and the right one closed from the
// keyboard is done.
import { expect, test, type Page } from "@playwright/test";
import { ladderTask, type GeoPt } from "../src/math/geoPlay.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("geoboard by hand: tap corners, pills, bin, close the band to check", async ({ page }) => {
  const piece = await boardWith(page, "Geoboard: shapes and area", ".live-geoboard");
  const grid = piece.locator("svg.geo-grid");
  const click = async (p: Page, [x, y]: GeoPt) => {
    const box = (await grid.boundingBox())!;
    const k = box.width / (2 * 28 + 10 * 44);
    await p.mouse.click(box.x + (28 + x * 44) * k, box.y + (28 + y * 44) * k);
  };
  // A corner's dot (r 7) at its peg; a tap puts one there or takes it off, and is waited for before the next.
  const corner = ([x, y]: GeoPt) => grid.locator(`circle[r="7"][cx="${28 + x * 44}"][cy="${28 + y * 44}"]`);
  const tap = async (p: Page, pts: GeoPt[]) => {
    for (const pt of pts) {
      const was = await corner(pt).count();
      await click(p, pt);
      await expect(corner(pt)).toHaveCount(1 - was);
    }
  };

  // Free play: a 3 × 2 rectangle, with a stray corner tapped on and off again.
  await tap(page, [[1, 1], [4, 1], [6, 6], [4, 3], [1, 3]]);
  await tap(page, [[6, 6]]);
  await expect(grid).toContainText("Area 6");
  await expect(grid).toContainText("Perimeter 10");
  await piece.getByRole("button", { name: /Perimeter$/ }).click();
  await expect(grid).not.toContainText("Perimeter 10");
  await expect(grid).toContainText("Area 6");
  // Free play has no closing: the first corner tapped is taken off.
  await expect(piece.getByRole("button", { name: "Close the band and check it" })).toHaveCount(0);
  await piece.getByRole("button", { name: "Take the whole shape off" }).click();
  await expect(grid).not.toContainText("Area");

  // Puzzle 1: a wrong rectangle closed is a miss; the right one closed from the keyboard is done.
  await piece.getByRole("button", { name: /^Puzzle 1/ }).click();
  await tap(page, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // The first corner tapped again closes the band: it stays on.
  await click(page, [0, 0]);
  await expect(piece).toContainText("Not yet");
  await piece.getByRole("button", { name: "Take the whole shape off" }).click();
  await tap(page, ladderTask(0).sample);
  await piece.getByRole("button", { name: "Close the band and check it" }).press("Enter");
  await expect(piece).toContainText("Done! ★★");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geoboard.png` });
});
