// Tile it: squares round a point fill it (said not to tile first: a star), pentagons leave a gap and then overlap;
// octagons with a hexagon go past 360° before a square fills the point; two small tangram triangles make the grey
// triangle, one dragged and one turned and moved with the keys.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers.ts";

const open = async (page: Page, stars: number[]) => {
  await page.addInitScript((s) => localStorage.setItem("zeno.tessellate.v1", JSON.stringify({ stars: s })), stars);
  return boardWith(page, "Tile it: tessellations and tangrams", ".live-tessellate");
};
const press = async (piece: Locator, key: string, times: number) => {
  await piece.focus();
  for (let i = 0; i < times; i++) await piece.press(key);
};
const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(name) });

test("tessellate: squares tile on their own, pentagons don't", async ({ page }) => {
  const game = await open(page, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  await expect(game.getByText(/^A regular square: does it tile a floor on its own/)).toBeVisible();
  const more = game.getByRole("button", { name: "➕ One more" });
  for (let i = 0; i < 3; i++) await more.click();
  await expect(game.getByText("360°: no gap")).toBeVisible();
  await expect(more).toBeDisabled();
  await game.getByRole("button", { name: "✗ It doesn't tile" }).click();
  await expect(game.getByText(/^Look again: 4 × 90° = 360° exactly/)).toBeVisible();
  await game.getByRole("button", { name: "✓ It tiles" }).click();
  await expect(game.getByText("4 × 90° = 360°: the regular square tiles on its own. ★★☆")).toBeVisible();

  await game.getByRole("button", { name: /^Puzzle 2/ }).click();
  await expect(game.getByText(/^A regular pentagon:/)).toBeVisible();
  await more.click();
  await more.click();
  await expect(game.getByText("Gap: 36°")).toBeVisible();
  await more.click();
  await expect(game.getByText("Overlap: 72°")).toBeVisible();
  await shot(page, "tess-pentagon.png");
  await game.getByRole("button", { name: "✗ It doesn't tile" }).click();
  await expect(game.getByText(/3 × 108° = 324° leaves a gap of 36°, and one more overlaps: the regular pentagon doesn't tile on its own\. ★★★/)).toBeVisible();
});

test("tessellate: fill the point round an octagon", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 0, 0, 0, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 4/ }).click();
  await expect(game.getByText("Fill the gap round the point with regular polygons: no gap and no overlap.")).toBeVisible();
  const palette = game.getByRole("group", { name: "Polygons to add" });
  await palette.getByRole("button", { name: "octagon" }).click();
  await expect(game.getByText("135° + 135° = 270°")).toBeVisible();
  await palette.getByRole("button", { name: "hexagon" }).click();
  await expect(game.getByText(/^A hexagon has angles of 120°: the point would hold 390°, 30° past 360°\. The gap is only 90°\./)).toBeVisible();
  await shot(page, "tess-fill.png");
  await palette.getByRole("button", { name: "square" }).click();
  await expect(game.getByText("135° + 135° + 90° = 360°: no gap and no overlap. ★★☆")).toBeVisible();
});

test("tessellate: two small triangles make the grey triangle", async ({ page }) => {
  const game = await open(page, [2, 2, 2, 2, 2, 2, 0, 0, 0]);
  await game.getByRole("button", { name: /^Puzzle 7/ }).click();
  await expect(game.getByText("Make the grey triangle from the two small triangles.")).toBeVisible();
  // The first small triangle dragged from the tray, (10, 0), to the outline's corner at (3, 4).
  const box = (await game.locator("svg[role=img]").first().boundingBox())!;
  const k = box.width / 600;
  const at = (x: number, y: number) => [box.x + (15 + x * 30) * k, box.y + (18 + y * 30) * k] as const;
  await page.mouse.move(...at(11, 0.33));
  await page.mouse.down();
  await page.mouse.move(...at(4, 4.33), { steps: 8 });
  await page.mouse.up();
  await expect(game.getByText("Covered: 4 of 8")).toBeVisible();
  // The second turned three quarters with R and moved with the arrow keys.
  const second = game.getByRole("button", { name: "Small triangle 2" });
  await press(second, "r", 3);
  await press(second, "ArrowLeft", 10);
  await shot(page, "tess-tangram.png");
  await press(second, "ArrowDown", 4);
  await expect(game.getByText(/Made! The pieces cover the shape exactly.* ★★★/)).toBeVisible();
  await game.getByRole("button", { name: "💡 Why?" }).click();
  await expect(game.getByRole("note")).toContainText("1/3 Moving, turning or flipping a piece never changes its area.");
  await shot(page, "tess-tangram-done.png");
});
