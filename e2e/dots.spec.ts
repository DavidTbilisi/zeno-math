// Dot multiplication, worked by hand: a slide along the top row fills it, a tap on the last dot takes it away, the
// pills pick the numbers, and the bin empties both rows.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function slide(page: Page, row: Locator, from: number, to: number) {
  const b = (await row.boundingBox())!;
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width * from, y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * to, y, { steps: 8 });
  await page.mouse.up();
}

test("dot multiplication by hand", async ({ page }) => {
  const piece = await boardWith(page, "Dot multiplication", ".live-dots");
  const pic = piece.locator("svg").first();
  const top = pic.getByRole("slider", { name: /^Top:/ });
  const bottom = pic.getByRole("slider", { name: /^Bottom:/ });

  // 5 squares a row, 3 and 1 dots to start: 8 × 6 = 48.
  await expect(piece).toContainText("8 × 6 = 48");
  // Slide along the top row to the last square: 10 × 6 = 60.
  await slide(page, top, 0.05, 0.95);
  await expect(top).toHaveAttribute("aria-valuenow", "5");
  await expect(piece).toContainText("10 × 6 = 60");
  // The bottom row's last dot tapped goes: 10 × 5 = 50.
  const b = (await bottom.boundingBox())!;
  await page.mouse.click(b.x + b.width * 0.1, b.y + b.height / 2);
  await expect(piece).toContainText("10 × 5 = 50");
  // Keys on the bottom row add a dot.
  await bottom.press("ArrowRight");
  await bottom.press("ArrowRight");
  await expect(piece).toContainText("10 × 7 = 70");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/dots.png` });

  // 6–12 numbers, then the bin.
  await pic.getByRole("button", { name: "6–12" }).click();
  await expect(piece).toContainText("6 × 6 = 36");
  await slide(page, top, 0.05, 0.55);
  await expect(top).toHaveAttribute("aria-valuenow", "4");
  await pic.getByRole("button", { name: /empty both rows/ }).click();
  await expect(piece).toContainText("6 × 6 = 36");
});
