// The geometry lab, worked by hand: the 3-4-5 triangle it starts with is measured and a corner dragged, a rectangle is
// drawn with the plane's own tools and enlarged by its ⤢ corner, a copy is dragged in from the list, a corner of it and then the
// whole copy dropped in the bin, a side's length is dragged, an ellipse and a sector get their π values, shapes are dragged in from the tray (or
// refused, with why, when the wheels make none), and the lever zooms.
import { expect, test, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

test("geometry lab by hand: tools on the plane, the ⤢ corner, copy, bin, tray and wheels", async ({ page }) => {
  const piece = await boardWith(page, "Geometry lab: any shape, measured", ".live-geoLab");
  const facts = piece.locator(".glab-facts");
  const plane = piece.locator("svg.glab-plane");
  const shapes = plane.locator("[data-h^='f-']");
  await expect(facts).toContainText("Triangle · scalene · right-angled");
  await expect(facts).toContainText("12 cm"); // the perimeter 4 + 3 + 5
  await expect(facts).toContainText("6 cm²");
  await expect(facts).toContainText("Pythagoras' theorem");

  // The plane starts centred on (5, 1.5), 48 px a unit: the screen place of a point.
  const box = (await plane.boundingBox())!;
  const k = box.width / 600;
  const at = (x: number, y: number) => ({ x: box.x + (300 + (x - 5) * 48) * k, y: box.y + (270 - (y - 1.5) * 48) * k });
  const tap = async (x: number, y: number) => page.mouse.click(at(x, y).x, at(x, y).y);

  // Drag B from (4, 0) to (6, 0): the triangle is now 6 by 3, its area 9.
  await drag(page, at(4, 0), at(6, 0));
  await expect(facts).toContainText("½ · AB · h = ½ · 6 · 3 = 9");
  // Pointing at a line of the list lights up what it is about on the plane.
  await piece.getByRole("button", { name: "Circumcircle", exact: true }).click();
  await facts.locator(".glab-fact", { hasText: "Circumradius R" }).hover();
  await expect(plane.locator("circle[stroke='#f08c00']")).toHaveCount(1);

  // The polygon tool from the plane's left edge, a 3 × 1 rectangle tapped corner by corner.
  await plane.getByRole("button", { name: "Polygon", exact: true }).press("Enter");
  for (const [x, y] of [[3, 3], [6, 3], [6, 4], [3, 4], [3, 3]]) await tap(x, y);
  await expect(facts.locator(".glab-name")).toHaveText("Rectangle");
  await expect(facts).toContainText("a · b = 3 · 1 = 3");
  // Its ⤢ corner dragged twice as far out from the centre (4.5, 3.5): the area is 4 times as big.
  const grip = (await plane.locator("[data-h^='s-'] rect").boundingBox())!;
  const g = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  const c = at(4.5, 3.5);
  await drag(page, g, { x: 2 * g.x - c.x, y: 2 * g.y - c.y });
  await expect(facts).toContainText("a · b = 6 · 2 = 12");
  await expect(facts).toContainText("2√10 ≈ 6.32 cm"); // the diagonal
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geolab-hand.png` });

  // A copy dragged from the list onto (2, −2), then dragged into the bin.
  await expect(shapes).toHaveCount(3);
  const copy = (await facts.getByRole("button", { name: /^Drag a copy/ }).boundingBox())!;
  await drag(page, { x: copy.x + copy.width / 2, y: copy.y + copy.height / 2 }, at(2, -2));
  await expect(shapes).toHaveCount(4);
  // Its corner (5, −1) dragged into the bin: the corner goes, a triangle is left; then the whole shape goes in.
  const bin = (await plane.getByRole("button", { name: /^Drag a shape here/ }).boundingBox())!;
  const into = { x: bin.x + bin.width / 2, y: bin.y + bin.height / 2 };
  await drag(page, at(5, -1), into);
  await expect(facts.locator(".glab-name")).toContainText("Triangle");
  await expect(shapes).toHaveCount(4);
  await drag(page, at(0, -2), into);
  await expect(shapes).toHaveCount(3);

  // The rectangle again: its first side dragged two squares longer.
  await page.mouse.click(at(4.5, 3.5).x, at(4.5, 3.5).y);
  await expect(facts.locator(".glab-name")).toHaveText("Rectangle");
  const side = facts.getByRole("button", { name: /^Change HJ/ });
  await expect(side).toContainText("6 cm");
  const s = (await side.boundingBox())!;
  await drag(page, { x: s.x + s.width / 2, y: s.y + s.height / 2 }, { x: s.x + s.width / 2 + 26, y: s.y + s.height / 2 });
  await expect(side).toContainText("8 cm");

  // An ellipse below the shapes (centre, end of the long axis, how wide), then a quarter-circle sector.
  await plane.getByRole("button", { name: "Ellipse", exact: true }).press("Enter");
  for (const [x, y] of [[5, -3], [8, -3], [5, -2]]) await tap(x, y);
  await expect(facts.locator(".glab-name")).toHaveText("Ellipse");
  await expect(facts).toContainText("3π ≈ 9.42 cm²");
  await expect(facts).toContainText("(x − 5)² / 9 + (y + 3)² / 1 = 1");
  await plane.getByRole("button", { name: "Sector", exact: true }).press("Enter");
  for (const [x, y] of [[10, -3], [11, -3], [10, -2]]) await tap(x, y);
  await expect(facts.locator(".glab-name")).toHaveText("Sector · a quarter circle");
  await expect(facts).toContainText("0.25π ≈ 0.785 cm²");

  // A regular hexagon of side 4 from the tray by the keyboard (the board's tools lie over the middle of the tray).
  await piece.getByRole("button", { name: /^Regular polygon:/ }).press("Enter");
  await expect(facts.locator(".glab-name")).toHaveText("Hexagon · regular");
  await expect(facts).toContainText("Each interior angle");

  // The wheels of the triangle from 3 sides turned to 10, 2 and 1: no triangle, and why.
  const wheel = (name: string) => piece.getByRole("slider", { name: `Triangle from 3 sides: ${name}` });
  for (let i = 0; i < 3; i++) await wheel("AB").press("ArrowUp");
  for (let i = 0; i < 3; i++) await wheel("BC").press("ArrowDown");
  for (let i = 0; i < 5; i++) await wheel("CA").press("ArrowDown");
  await expect(piece).toContainText("These sides don't make a triangle");
  await expect(piece.locator(".glab-noclose")).toBeVisible();

  // A circle of radius 3 dragged in from the tray onto (1, −1).
  const circle = (await piece.getByRole("button", { name: /^Circle:/ }).boundingBox())!;
  await drag(page, { x: circle.x + circle.width / 2, y: circle.y + circle.height / 2 }, at(1, -1));
  await expect(facts.locator(".glab-name")).toHaveText("Circle");
  await expect(facts).toContainText("6π ≈ 18.85 cm");
  await expect(facts).toContainText("9π ≈ 28.27 cm²");
  await expect(piece.getByRole("slider", { name: "Circle: radius" })).toBeVisible();

  // The zoom lever pulled down: the plane zooms out.
  const lever = plane.getByRole("slider", { name: /^Zoom/ });
  const z0 = Number(await lever.getAttribute("aria-valuenow"));
  const l = (await lever.boundingBox())!;
  await drag(page, { x: l.x + l.width / 2, y: l.y + l.height / 2 }, { x: l.x + l.width / 2, y: l.y + l.height / 2 + 50 });
  await expect.poll(async () => Number(await lever.getAttribute("aria-valuenow"))).toBeLessThan(z0);
  await lever.press("ArrowUp");
  // Away from every shape in view, the house under the lever brings them all in, then is gone.
  const home = plane.getByRole("button", { name: "Fit every shape in view" });
  const z1 = await lever.getAttribute("aria-valuenow");
  const h = (await home.boundingBox())!;
  await page.mouse.click(h.x + h.width / 2, h.y + h.height / 2);
  await expect(home).toHaveCount(0);
  await expect(lever).not.toHaveAttribute("aria-valuenow", z1!);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/geolab.png` });
});
