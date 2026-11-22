// The chance devices, worked by hand: the coin tossed by a tap and by a flick, dice thrown, one added from the spare
// and one dropped in the bin, and the spinner flicked and tapped, each tally growing as bars and emptied by the bin.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function centre(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

/** The counts the bars show, read from their numbers. */
const counted = async (pic: Locator) => (await pic.locator("text.tally-count").allTextContents()).map(Number).reduce((a, b) => a + b, 0);

test("coin by hand: tapped and flicked, the tally counts, the bin empties it", async ({ page }) => {
  const piece = await boardWith(page, "Coin to toss", ".live-coin");
  const pic = piece.locator("svg").first();
  const coin = pic.getByRole("button", { name: /^Coin showing/ });
  await coin.click();
  await expect.poll(() => counted(pic)).toBe(1);
  const c = await centre(coin);
  await drag(page, c, { x: c.x, y: c.y - 60 }, 4);
  await expect.poll(() => counted(pic)).toBe(2);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/coin.png` });
  await pic.getByRole("button", { name: "Empty the tally" }).click();
  await expect.poll(() => counted(pic)).toBe(0);
});

test("dice by hand: thrown, a spare added, one dropped in the bin", async ({ page }) => {
  const piece = await boardWith(page, "Dice to roll", ".live-dice");
  const pic = piece.locator("svg").first();
  const dice = pic.getByRole("button", { name: /^Die \d/ });
  await expect(dice).toHaveCount(2);
  // A tap rolls: one total in the last rolls.
  await dice.first().click();
  await expect(pic).toContainText(/Total: \d+/);
  await expect(pic.locator("text").last()).toHaveText(/^\d+$/);
  // The spare dragged onto the table: three dice.
  await drag(page, await centre(pic.getByRole("button", { name: /^A spare die/ })), await centre(dice.first()));
  await expect(dice).toHaveCount(3);
  await expect(pic.getByRole("button", { name: /^A spare die/ })).toHaveCount(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/dice.png` });
  // A die dropped in the bin: two again.
  await drag(page, await centre(dice.nth(2)), await centre(pic.getByRole("button", { name: /^Empty the last rolls/ })));
  await expect(dice).toHaveCount(2);
});

test("spinner by hand: flicked, tapped, sections changed, the bin empties the tally", async ({ page }) => {
  const piece = await boardWith(page, "Spinner to spin", ".live-spinner");
  const pic = piece.locator("svg").first();
  const wheel = pic.getByRole("button", { name: /^Spinner:/ });
  const c = await centre(wheel);
  // A flick across the top, then a tap: two spins counted.
  await drag(page, { x: c.x - 50, y: c.y - 60 }, { x: c.x + 50, y: c.y - 60 }, 3);
  await expect.poll(() => counted(pic), { timeout: 10_000 }).toBe(1);
  await page.mouse.click(c.x + 30, c.y + 30);
  await expect.poll(() => counted(pic), { timeout: 10_000 }).toBe(2);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/spinner.png` });
  // Six sections: a new tally of six bars.
  const sections = pic.getByRole("slider", { name: /^Sections/ });
  await sections.press("ArrowUp");
  await sections.press("ArrowUp");
  await expect(sections).toHaveAttribute("aria-valuenow", "6");
  await expect.poll(() => counted(pic)).toBe(0);
  await wheel.press("Enter");
  await expect.poll(() => counted(pic), { timeout: 10_000 }).toBe(1);
  await pic.getByRole("button", { name: "Empty the tally" }).click();
  await expect.poll(() => counted(pic)).toBe(0);
});
