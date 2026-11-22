// The chance experiment by hand: the die tapped once and held for many, its sides turned on the wheel; the coin, the
// spinner and the bag picked from the tray; the bag's counters turned; the bin clears; the views are pills.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function hold(page: Page, l: Locator, done: () => Promise<unknown>) {
  const b = (await l.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await done();
  await page.mouse.up();
}
const trials = async (piece: Locator) => Number((await piece.textContent())!.match(/Trials: ([\d,]+)/)![1].replace(/,/g, ""));

test("chance experiment by hand: tap, hold, tray, wheels, bin, views", async ({ page }) => {
  const piece = await boardWith(page, "Chance experiment", ".live-chance");
  const strip = piece.locator("svg").first();
  const thrown = (name: string) => strip.getByRole("button", { name: new RegExp(`^${name}: tap it`) });

  // The die: a tap is one throw; held, the throws pile up faster and faster, into one undo step.
  await thrown("Die").click();
  await expect(strip).toContainText(/Last: [1-6] · Trials: 1(?!\d)/);
  await hold(page, thrown("Die"), () => expect.poll(() => trials(piece), { timeout: 10000 }).toBeGreaterThan(2000));
  const n = await trials(piece);
  await page.waitForTimeout(300);
  expect(await trials(piece)).toBe(n);
  await expect(piece.getByRole("slider", { name: "Sides" })).toHaveAttribute("aria-valuetext", "6");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/chance-die.png` });

  // The bin clears; the wheel turns the die to 8 sides (eight bars).
  await strip.getByRole("button", { name: "Clear the results and start again" }).click();
  await expect(strip).toContainText("Trials: 0");
  await piece.getByRole("slider", { name: "Sides" }).press("ArrowUp");
  await expect(piece.getByRole("slider", { name: "Sides" })).toHaveAttribute("aria-valuetext", "8");

  // The coin from the tray, thrown from the keyboard; "Over time" follows heads, with the theory line at p = 0.5.
  await strip.getByRole("button", { name: "Coin", exact: true }).click();
  await thrown("Coin").press("Enter");
  await expect(strip).toContainText(/Last: (Heads|Tails) · Trials: 1(?!\d)/);
  await strip.getByRole("button", { name: "Over time" }).click();
  await expect(piece).toContainText("p = 0.5");
  await strip.getByRole("button", { name: "Theory" }).click();
  await expect(piece).not.toContainText("p = 0.5");

  // The spinner with 5 sections; the bag with its blue counters turned up to 5.
  await strip.getByRole("button", { name: "Spinner", exact: true }).click();
  await piece.getByRole("slider", { name: "Sections" }).press("ArrowUp");
  await expect(piece.getByRole("slider", { name: "Sections" })).toHaveAttribute("aria-valuenow", "5");
  await strip.getByRole("button", { name: "Bag of counters", exact: true }).click();
  const blue = piece.getByRole("slider", { name: "blue" });
  for (let i = 0; i < 3; i++) await blue.press("ArrowUp");
  await expect(blue).toHaveAttribute("aria-valuenow", "5");
  await strip.getByRole("button", { name: "Results", exact: true }).click();
  await hold(page, thrown("Bag of counters"), () => expect.poll(() => trials(piece), { timeout: 10000 }).toBeGreaterThan(500));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/chance-bag.png` });
});
