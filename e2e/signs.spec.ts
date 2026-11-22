// Minus times minus, worked by hand. The turning arrow: b set by dragging the arrow's tip, the walk taken by tapping
// the arrow, one more turn by dragging the tip over 0, the step dots and the Why? steps. The pattern: the dot dragged
// down the yellow column, a wrong tap, the keyboard, and the line carried on past 0.
import { expect, test, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

test("turning arrow by hand: drag b, tap through the walk, swing it over 0", async ({ page }) => {
  const piece = await boardWith(page, "Minus turns it round: arrows on a line", ".live-signArrow");
  const pic = piece.locator("svg").first();
  const box = (await pic.boundingBox())!;
  const k = box.width / 640;
  // The arrow lies on y = 58 + 16 × 17 + 26 from 0 at x = 320, 17 a step.
  const at = (n: number) => ({ x: box.x + (320 + 17 * n) * k, y: box.y + (58 + 16 * 17 + 26) * k });
  const b = pic.getByRole("slider", { name: "b", exact: true });
  await expect(b).toHaveAttribute("aria-valuenow", "-2");

  // The tip at −2 dragged five steps right: b = 3; the wheel turned back down past 0 to −2.
  await drag(page, at(-2), at(3));
  await expect(b).toHaveAttribute("aria-valuenow", "3");
  for (let i = 0; i < 4; i++) await b.press("ArrowLeft");
  await expect(b).toHaveAttribute("aria-valuenow", "-2");

  // Tapping the arrow walks (−3) × (−2) through to 6.
  await pic.getByRole("button", { name: "Show it" }).click();
  const nextStep = pic.getByRole("button", { name: "Next step", exact: true });
  while (await nextStep.count()) await nextStep.click();
  await expect(piece).toContainText("(−3) × (−2) = 6");
  // The tip at 6 swung over 0 to the left: one more turn.
  await drag(page, at(6), at(-4));
  await expect(piece).toContainText("(−3) × (−2) × (−1) = −6");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/signArrow.png` });

  // The step dots go back; Why? opens its steps and a tap goes on.
  await pic.getByRole("button", { name: "Step 0" }).click();
  await expect(pic.getByRole("button", { name: "Show it" })).toBeVisible();
  await pic.getByRole("button", { name: "Why?", exact: true }).click();
  await expect(piece).toContainText("1/3");
  await pic.getByRole("button", { name: "Why?: Next step" }).click();
  await expect(piece).toContainText("2/3");
});

test("sign pattern by hand: drag the dot down the column, past 0", async ({ page }) => {
  const piece = await boardWith(page, "Minus times minus: follow the pattern", ".live-signPattern");
  const pic = piece.locator("svg").first();
  const box = (await pic.boundingBox())!;
  const k = box.width / 640;
  // The graph: a column 50 wide for each a, 0 at x = 437; 15 a unit up from y = 80 + 12 × 15.
  const at = (a: number, y: number) => ({ x: box.x + (437 + 50 * a) * k, y: box.y + (260 - 15 * y) * k });

  // Pressed at 5 in the 0 column and dragged down to 0.
  await drag(page, at(0, 5), at(0, 0));
  await expect(piece).toContainText("Right: 0 × (−2) = 0.");
  // A tap on −2 for (−1) × (−2): the right size, the wrong side.
  await page.mouse.click(at(-1, -2).x, at(-1, -2).y);
  await expect(piece).toContainText("−2 is the right size but on the wrong side");
  // From the keyboard: up two from 0, Enter.
  const column = pic.getByRole("slider", { name: /^The yellow column/ });
  await column.press("ArrowUp");
  await column.press("ArrowUp");
  await column.press("Enter");
  await expect(piece).toContainText("Right: (−1) × (−2) = 2.");
  await page.mouse.click(at(-2, 4).x, at(-2, 4).y);
  await page.mouse.click(at(-3, 6).x, at(-3, 6).y);
  await expect(piece).toContainText("a minus times a minus is a plus");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/signPattern.png` });

  // A new b starts the table again.
  await pic.getByRole("slider", { name: "b", exact: true }).press("ArrowUp");
  await expect(pic.getByRole("slider", { name: /^The yellow column/ })).toHaveAttribute("aria-label", "The yellow column: 0 × (−1)");
});
