// Fractions to shade, worked by hand: tap a part, drag across parts to paint them, drag or tap the two numbers of the
// fraction, and switch between a circle and a bar.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function centre(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function drag(page: Page, from: Locator, to: Locator) {
  const [a, b] = [await centre(from), await centre(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

test("fractions to shade by hand", async ({ page }) => {
  const piece = await boardWith(page, "Fractions to shade", ".live-fractions");
  const pic = piece.locator("svg").first();
  const part = (n: number) => pic.getByRole("button", { name: new RegExp(`^Part ${n} of`) });
  const top = pic.getByRole("slider", { name: /^Shaded parts:/ });
  const bottom = pic.getByRole("slider", { name: /^Parts:/ });

  // A circle in 4, one part shaded.
  await expect(top).toHaveAttribute("aria-valuenow", "1");
  await expect(bottom).toHaveAttribute("aria-valuenow", "4");
  // A tap shades part 3.
  await part(3).click();
  await expect(part(3)).toHaveAttribute("aria-pressed", "true");
  await expect(top).toHaveAttribute("aria-valuenow", "2");
  // A drag from part 2 across to part 4 paints them shaded.
  await drag(page, part(2), part(4));
  await expect(top).toHaveAttribute("aria-valuenow", "4");
  // The bottom number up: the circle is cut in 5, the 4 shaded kept.
  await bottom.press("ArrowUp");
  await expect(bottom).toHaveAttribute("aria-valuenow", "5");
  await expect(part(5)).toHaveAttribute("aria-pressed", "false");
  await expect(top).toHaveAttribute("aria-valuenow", "4");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fractions-circle.png` });

  // A bar; the top number down twice shades the first 2.
  await pic.getByRole("button", { name: "Bar" }).click();
  await top.press("ArrowDown");
  await top.press("ArrowDown");
  await expect(part(1)).toHaveAttribute("aria-pressed", "true");
  await expect(part(3)).toHaveAttribute("aria-pressed", "false");
  // A drag from a shaded part across the bar takes the shading off.
  await drag(page, part(1), part(4));
  await expect(top).toHaveAttribute("aria-valuenow", "0");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fractions-bar.png` });
});
