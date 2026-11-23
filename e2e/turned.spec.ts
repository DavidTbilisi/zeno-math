// The solid of revolution and the 3D matrix by hand (#567): y = x² swept all the way round, cut into slabs that close
// in on 32π/5, one slab pulled out to read; the matrix's entry changed, flattened to det 0 and turned inside out.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("revolution: sweep the region round, cut it into slabs and pull one out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  const piece = await boardWith(page, "Solid of revolution: turn a region round its axis", ".live-turned");
  const pic = piece.locator("svg").first();
  await expect(piece).toContainText("V = π∫ f(x)² dx = 32π/5 ≈ 20.1062");
  await expect(piece).toContainText("Drag the red handle round the axis");

  // The red handle, by its keys, takes the turn to the whole way round.
  const sweep = pic.getByRole("slider", { name: /^How far the region is turned/ });
  await sweep.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowUp");
  await expect(sweep).toHaveAttribute("aria-valuenow", "360");
  await expect(piece).toContainText("Drag the slices box up");

  // Eight discs, then one pulled out: π r² Δx with the numbers in.
  const slices = pic.getByRole("slider", { name: /^Slices/ });
  await slices.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowUp");
  await expect(piece).toContainText("Discs, n = 8: V ≈ 19.8451");
  const pull = pic.getByRole("slider", { name: /^Pull a slab out/ });
  await pull.focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  await expect(piece).toContainText("Slab 8: π × 3.52² × 0.25 ≈ 9.71");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/turned-slab.png` });

  // A limit moved by its keys: b from 2 to 1.5 changes the volume.
  const b = pic.getByRole("slider", { name: /^The limit b/ });
  await b.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(b).toHaveAttribute("aria-valuenow", "1.5");
  await expect(piece).toContainText("0 ≤ x ≤ 1.5");
});

test("3D matrix: an entry changed, flattened to det 0, turned inside out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  const piece = await boardWith(page, "3D matrix: shear the unit cube by its columns", ".live-cubeMatrix");
  const pic = piece.locator("svg").first();
  await expect(piece).toContainText("det M = 2·1 − 1·(−1) + 0·(−1) = 3");
  await expect(piece).toContainText("The cube's volume is |det M| = 3.");

  // Row 3, column 3 down to 0: det M = 2·0 − 1·(−1) + 0 = 1; then the top-left down to −1 turns it inside out.
  const m33 = pic.getByRole("slider", { name: "Row 3, column 3 of M" });
  await m33.focus();
  await page.keyboard.press("ArrowDown");
  await expect(piece).toContainText("= 1");
  await pic.getByRole("button", { name: "Flatten onto xy", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(piece).toContainText("det M = 0: the cube is flattened, its volume 0.");
  await pic.getByRole("button", { name: "Mirror in xy", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(piece).toContainText("det M < 0: the cube is turned inside out; its volume is still 1.");

  // A column's tip dragged: the cube follows, and the matrix with it.
  const tip = pic.getByRole("group", { name: /^Where î lands/ });
  const box = (await tip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(pic.getByRole("slider", { name: "Row 1, column 1 of M" })).not.toHaveAttribute("aria-valuenow", "1");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cube-matrix.png` });
});
