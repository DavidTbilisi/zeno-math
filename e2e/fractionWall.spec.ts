// Make a whole by hand: tiles dragged from the tray into the gap (or tapped), one dragged back out, one into the bin,
// and the gap filled with the fewest tiles for three stars.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { rng } from "../src/math/random.ts";
import { WALL_LADDER, wallTask } from "../src/math/fractionWall.ts";
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

test("make a whole by hand: tiles dragged in, out and into the bin, then the fewest fill", async ({ page }) => {
  const game = await boardWith(page, "Make a whole: fraction tiles", ".live-fractionWall");
  const pic = game.locator("svg").first();
  const t = wallTask(WALL_LADDER[0].level, rng(WALL_LADDER[0].seed));
  const box = (await pic.boundingBox())!;
  const k = box.width / 620;
  const bar = { x: box.x + 300 * k, y: box.y + 75 * k };
  const tile = (den: number) => pic.getByRole("button", { name: `1/${den}`, exact: true });
  const placed = pic.getByRole("button", { name: /^Take out / });

  // One dragged into the bar, then dragged back down out of it.
  await expect(async () => {
    await drag(page, tile(t.sizes[0]), bar);
    await expect(placed).toHaveCount(1, { timeout: 1000 });
  }).toPass();
  await drag(page, placed.first(), { x: box.x + 300 * k, y: box.y + 200 * k });
  await expect(placed).toHaveCount(0);
  // One tapped in, then dropped in the bin.
  await tile(t.sizes[0]).click();
  await expect(placed).toHaveCount(1);
  await drag(page, placed.first(), pic.getByRole("button", { name: /^Tap to take every tile out/ }));
  await expect(placed).toHaveCount(0);

  // The fewest tiles, dragged in: three stars.
  for (const den of t.fewest) await drag(page, tile(den), bar);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fractionWall.png` });
  await expect(game.getByText(/Exactly, with the fewest tiles! ★★★/)).toBeVisible();
});
