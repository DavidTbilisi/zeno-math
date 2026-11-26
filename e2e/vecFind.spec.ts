// 2D vectors by hand (#717): the right tile tapped before the tip has moved is met with "move the tip first"; the tip
// pressed onto the grid and moved by the keys keeps |v| = √(x² + y²); tan θ = y ÷ x; a + b part by part, not the lengths
// added; and v ÷ |v| always 1 long.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("vectors by hand: the length, the direction, adding, the unit vector", async ({ page }) => {
  const piece = await boardWith(page, "Vectors: find the rules by moving the tip", ".live-vecFind");
  const pic = piece.locator("svg").first();
  const tile = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  const tip = pic.getByRole("slider");
  const keys = async (key: string, times: number) => {
    await tip.focus();
    for (let i = 0; i < times; i++) await tip.press(key);
  };
  await expect(pic.locator("[data-ask]")).toContainText("Drag the tip of v about the grid");

  await tile("√(x² + y²)").click();
  await expect(say).toHaveText("Move the tip to a few places first and watch the numbers.");
  // Pressed at (−4, 2) on the grid: the origin is (200, 300) and a square is 18 across.
  const b = (await pic.boundingBox())!;
  const k = b.width / 720;
  await page.mouse.click(b.x + (200 - 4 * 18) * k, b.y + (300 - 2 * 18) * k);
  await expect(pic).toContainText("x = −4");
  await keys("ArrowDown", 3);
  await tile("x + y").click();
  await expect(say).toContainText("The two parts are at right angles");
  await tile("√(x² + y²)").click();
  await expect(say).toContainText("v is its hypotenuse");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/vecFind-length.png` });

  await tile("Next").click();
  await keys("ArrowLeft", 2);
  await keys("ArrowUp", 2);
  await tile("x ÷ y").click();
  await expect(say).toContainText("θ is measured from the x-axis");
  await tile("y ÷ x").click();
  await expect(say).toContainText("tan θ = y ÷ x, up over across");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/vecFind-direction.png` });

  await tile("Next").click();
  await keys("ArrowRight", 2);
  await keys("ArrowDown", 2);
  await keys("ArrowUp", 1);
  await expect(pic).toContainText("a + b = (6, 3)");
  await tile("add the lengths").click();
  await expect(say).toContainText("they are equal only when a and b point the same way");
  await tile("add x to x and y to y").click();
  await expect(say).toContainText("put b on the end of a");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/vecFind-add.png` });

  await tile("Next").click();
  await keys("ArrowRight", 2);
  await keys("ArrowUp", 2);
  await expect(pic).toContainText("|v ÷ |v|| = 1.00");
  await tile("|v|").click();
  await expect(say).toContainText("does the green arrow grow");
  await tile("1, wherever the tip is").click();
  await expect(say).toContainText("it is the unit vector along v");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/vecFind-unit.png` });
  await tile("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: move the tip as you like");
});
