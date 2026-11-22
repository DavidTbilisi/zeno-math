// Fractions on the line by hand: each card dragged from the tray down onto its place; one dragged back up to the tray
// and down again; the check pill in the empty tray; out of order, "Try again" puts the cards back in the tray.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { ORDER_LADDER, orderTask } from "../src/math/fracOrder.ts";
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

test("fractions on the line by hand: dragged from the tray onto the line, checked in the tray", async ({ page }) => {
  const game = await boardWith(page, "Fractions on the line: put them in order", ".live-fracOrder");
  const t = orderTask(ORDER_LADDER[0].level, rng(ORDER_LADDER[0].seed));
  const pic = game.locator("svg").first();
  const b = (await pic.boundingBox())!;
  const k = b.width / 680;
  const on = (v: number) => ({ x: b.x + (40 + (v / t.to) * 600) * k, y: b.y + 150 * k });
  const card = (i: number) => pic.getByRole("button", { name: t.items[i].text, exact: true });

  await expect(pic.getByRole("button", { name: "Check" })).toHaveCount(0);
  // All in the wrong order first (every card at the far end but the last at 0), checked: out of order, tried again.
  for (let i = 0; i < t.items.length; i++) await drag(page, card(i), on(i === t.items.length - 1 ? 0 : t.to));
  await pic.getByRole("button", { name: "Check" }).click();
  const ordered = await game.getByText(/In order/).count();
  if (!ordered) {
    await pic.getByRole("button", { name: "Try again" }).click();
    await expect(pic.getByRole("button", { name: "Check" })).toHaveCount(0);
  } else {
    await game.getByRole("button", { name: /^Line 1/ }).click();
  }

  // Each to its place; the first dragged back up to the tray (no check then) and down again.
  for (let i = 0; i < t.items.length; i++) await drag(page, card(i), on(t.items[i].v));
  await drag(page, card(0), { x: b.x + 340 * k, y: b.y + 30 * k });
  await expect(pic.getByRole("button", { name: "Check" })).toHaveCount(0);
  await drag(page, card(0), on(t.items[0].v));
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/In order, and every one close to its place! ★★★/)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fracOrder.png` });
});
