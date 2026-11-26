// The laws of powers by hand (#720): the right tile tapped before the rows have changed is met with "drag the rows
// first"; a row's end dragged with the mouse and moved by the keys; 2ᵐ × 2ⁿ joins the rows (m + n), 2ᵐ ÷ 2ⁿ cancels
// pairs (m − n, not m ÷ n), (2ᵐ)ⁿ is a grid of n rows of m, and a longer bottom row leaves 2 to a negative power.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("powers by hand: products, quotients, powers of powers, negative exponents", async ({ page }) => {
  const piece = await boardWith(page, "Powers: find the laws by building the rows", ".live-powerFind");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  const read = pic.locator("[data-read]");
  const keys = async (row: "m" | "n", key: string, times: number) => {
    const slider = pic.getByRole("slider", { name: `the row of ${row}` });
    await slider.focus();
    for (let i = 0; i < times; i++) await slider.press(key);
  };
  await expect(pic.locator("[data-ask]")).toContainText("Drag the ends of the two rows of 2s");

  await tile("m + n").click();
  await expect(say).toHaveText("Drag the rows to a few lengths first and watch the count.");
  // The row of m ends at x = 70 + 3 × 46 on the line y = 120 + 19; dragged one chip on, it has four 2s.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.move(b.x + 208 * k, b.y + 139 * k);
  await page.mouse.down();
  await page.mouse.move(b.x + 244 * k, b.y + 139 * k, { steps: 4 });
  await page.mouse.up();
  await expect(read).toContainText("2⁴ × 2²: 6 twos multiplied in all, 2⁶ = 64");
  await keys("n", "ArrowRight", 1);
  await expect(read).toContainText("2⁷ = 128");
  await tile("m × n").click();
  await expect(say).toContainText("Count the 2s");
  await tile("m + n").click();
  await expect(say).toContainText("the rows join, so the exponents add");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/powerFind-product.png` });

  await tile("Next").click();
  await keys("n", "ArrowLeft", 1);
  await keys("m", "ArrowRight", 1);
  await expect(read).toContainText("2⁶ ÷ 2¹");
  await tile("m ÷ n").click();
  await expect(say).toContainText("That is taking away, not dividing");
  await tile("m − n").click();
  await expect(say).toContainText("the exponents are taken away");

  await tile("Next").click();
  await keys("n", "ArrowRight", 1);
  await keys("m", "ArrowLeft", 1);
  await expect(read).toContainText("a grid 3 by 2, 6 twos in all: 2⁶ = 64");
  await tile("m + n").click();
  await expect(say).toContainText("Count the 2s in the grid");
  await tile("m × n").click();
  await expect(say).toContainText("so the exponents multiply");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/powerFind-power.png` });

  await tile("Next").click();
  await keys("n", "ArrowRight", 1);
  await keys("m", "ArrowLeft", 1);
  await expect(read).toContainText("4 left on the bottom: 1 ÷ 2⁴ = 2⁻⁴ = 1/16");
  await tile("0 when the bottom is longer").click();
  await expect(say).toContainText("1 ÷ 2ᵏ is not 1");
  await tile("m − n, below zero too").click();
  await expect(say).toContainText("equal rows leave 1 = 2⁰");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/powerFind-negative.png` });
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: drag the rows as you like");
});
