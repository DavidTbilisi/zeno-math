// Divisible by? by hand: a tile that doesn't divide dragged into the box and checked (the number tapped) shows its
// remainder; dragged back out to the tray, the right ones dragged in and checked from the keyboard, it is done. The
// bulb gives the hint.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { DIV_LADDER, divTask } from "../src/math/divisible.ts";
import { rng } from "../src/math/random.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const b = (await from.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test("divisible by hand: tiles dragged into the box, the number tapped to check", async ({ page }) => {
  const game = await boardWith(page, "Divisible by? Tap every divisor", ".live-divisible");
  const t = divTask(DIV_LADDER[0].level, rng(DIV_LADDER[0].seed));
  const pic = game.locator("svg").first();
  const box = (await pic.boundingBox())!;
  const k = box.width / 560;
  const inBox = { x: box.x + 60 * k, y: box.y + 150 * k };
  const inTray = { x: box.x + 40 * k, y: box.y + 250 * k };
  const tile = (n: number) => pic.getByRole("button", { name: String(n), exact: true });
  const number = pic.getByRole("button", { name: `${t.n}: tap it to check the box` });

  // Nothing in the box: the number can't be checked yet.
  await expect(number).toHaveAttribute("aria-disabled", "true");
  const off = t.offered.find((n) => !t.right.includes(n))!;
  await drag(page, tile(off), inBox);
  await expect(tile(off)).toHaveAttribute("aria-pressed", "true");
  await number.click();
  await expect(game).toContainText(`${Math.floor(t.n / off)} r ${t.n % off}`);
  // Out again to the tray, the right ones in, the hint taken, then checked from the keyboard: two stars.
  await drag(page, tile(off), inTray);
  await expect(tile(off)).toHaveAttribute("aria-pressed", "false");
  for (const n of t.right) await drag(page, tile(n), inBox);
  await pic.getByRole("button", { name: /^Hint:/ }).click();
  await expect(game).toContainText("💡");
  await number.press("Enter");
  await expect(game.getByText(new RegExp(`Right! ${t.n} is divisible by ${t.right.join(", ")}\\. ★☆☆`))).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/divisible.png` });
});
