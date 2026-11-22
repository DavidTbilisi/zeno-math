// Comparing fractions, worked by hand: a bar painted by a drag and trimmed by a tap, a card's parts changed on its
// number, a sign dragged between the cards, and the scissors, the half-way line and the pencils laid on the bars.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator | { x: number; y: number }, to: Locator | { x: number; y: number }) {
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

test("comparing fractions by hand", async ({ page }) => {
  const piece = await boardWith(page, "Comparing fractions", ".live-compareFractions");
  const pic = piece.locator("svg").first();
  const first = pic.getByRole("slider", { name: /^First bar:/ });
  const middle = pic.getByRole("button", { name: /^Between the cards:/ });

  // 2/3 and 3/4 to start. A drag up the first bar from its floor to its top shades all three parts.
  await expect(first).toHaveAttribute("aria-valuetext", "2/3");
  const bar = (await first.boundingBox())!;
  await drag(page, { x: bar.x + bar.width / 2, y: bar.y + bar.height - 4 }, { x: bar.x + bar.width / 2, y: bar.y + 4 });
  await expect(first).toHaveAttribute("aria-valuetext", "3/3");
  // A tap on the top shaded part takes it off again.
  await page.mouse.click(bar.x + bar.width / 2, bar.y + 20);
  await expect(first).toHaveAttribute("aria-valuetext", "2/3");
  // One more part for the first fraction, on its card: 2/4 against 3/4.
  await pic.getByRole("slider", { name: "First fraction: parts" }).press("ArrowUp");
  await expect(first).toHaveAttribute("aria-valuetext", "2/4");

  // The right sign dragged between the cards.
  await drag(page, pic.getByRole("button", { name: /^2\/4 is less than 3\/4:/ }), middle);
  await expect(piece).toContainText("Yes! 2/4 is less than 3/4.");

  // The scissors dragged onto the bars, the half-way line tapped, the pencils dragged on.
  const scissors = pic.getByRole("button", { name: /^Scissors:/ });
  await drag(page, scissors, first);
  await expect(scissors).toHaveAttribute("aria-pressed", "true");
  await expect(piece).toContainText("with pieces of the same size");
  await pic.getByRole("button", { name: /^Half-way line:/ }).click();
  await expect(piece).toContainText("2/4 is exactly 1/2");
  const pencils = pic.getByRole("button", { name: /^Pencils:/ });
  await drag(page, pencils, first);
  await expect(pencils).toHaveAttribute("aria-pressed", "true");
  await expect(piece).toContainText("The sign opens towards the bigger number.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/compareFractions.png` });
});
