// The geometry lab: the 3-4-5 triangle it starts with is measured, a drawn rectangle is named and measured, an
// enlargement by 2 makes its area 4 times as big, shapes are built from their measurements (or refused, with why).
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("geometry lab: measure, draw, enlarge and build shapes", async ({ page }) => {
  const piece = await boardWith(page, "Geometry lab: any shape, measured", ".live-geoLab");
  const facts = piece.locator(".glab-facts");
  await expect(facts).toContainText("Triangle · scalene · right-angled");
  await expect(facts).toContainText("12 cm"); // the perimeter 4 + 3 + 5
  await expect(facts).toContainText("6 cm²");
  await expect(facts).toContainText("Pythagoras' theorem");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geolab-start.png` });

  // Draw a 6 × 2 rectangle above the shapes, corner by corner (the plane starts centred on (5, 1.5), 48 px a unit).
  const plane = piece.locator("svg.glab-plane");
  const box = (await plane.boundingBox())!;
  const k = box.width / 600;
  const at = async (x: number, y: number) => page.mouse.click(box.x + (300 + (x - 5) * 48) * k, box.y + (270 - (y - 1.5) * 48) * k);
  // The board's own toolbar lies over the piece's top row at this size, so the button is pressed without the mouse.

  // Drag B from (4, 0) to (6, 0): the triangle is now 6 by 3, its area 9.
  await page.mouse.move(box.x + (300 + (4 - 5) * 48) * k, box.y + (270 - (0 - 1.5) * 48) * k);
  await page.mouse.down();
  await page.mouse.move(box.x + (300 + (6 - 5) * 48) * k, box.y + (270 - (0 - 1.5) * 48) * k, { steps: 8 });
  await page.mouse.up();
  await expect(facts).toContainText("½ · AB · h = ½ · 6 · 3 = 9");
  // Pointing at a line of the list lights up what it is about on the plane.
  await piece.getByRole("button", { name: "Circumcircle" }).click();
  await facts.locator(".glab-fact", { hasText: "Circumradius R" }).hover();
  await expect(plane.locator("circle[stroke='#f08c00']")).toHaveCount(1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geolab-hover.png` });

  await piece.getByRole("button", { name: "Draw a polygon" }).dispatchEvent("click");
  for (const [x, y] of [[2, 5], [8, 5], [8, 7], [2, 7], [2, 5]]) await at(x, y);
  await expect(facts.locator(".glab-name")).toHaveText("Rectangle");
  await expect(facts).toContainText("a · b = 6 · 2 = 12");
  await expect(facts).toContainText("2√10 ≈ 6.32 cm"); // the diagonal

  // Enlarge it by 2: the sides double, the area is four times as big.
  await facts.getByRole("button", { name: "Enlarge" }).click();
  await expect(facts).toContainText("a · b = 12 · 4 = 48");

  // Build a regular hexagon of side 4, then a triangle that can't be.
  await piece.locator(".glab-make select").selectOption({ label: "Regular polygon" });
  await piece.getByRole("button", { name: "Add" }).click();
  await expect(facts.locator(".glab-name")).toHaveText("Hexagon · regular");
  await expect(facts).toContainText("Each interior angle");
  await piece.locator(".glab-make select").selectOption({ label: "Triangle from 3 sides" });
  const inputs = piece.locator(".glab-make input");
  await inputs.nth(0).fill("1");
  await inputs.nth(1).fill("2");
  await inputs.nth(2).fill("10");
  await piece.getByRole("button", { name: "Add" }).click();
  await expect(piece).toContainText("These sides don't make a triangle");

  // A circle of radius 3: its circumference and area in π.
  await piece.locator(".glab-make select").selectOption({ label: "Circle" });
  await piece.getByRole("button", { name: "Add" }).click();
  await expect(facts).toContainText("6π ≈ 18.85 cm");
  await expect(facts).toContainText("9π ≈ 28.27 cm²");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geolab.png` });
});
