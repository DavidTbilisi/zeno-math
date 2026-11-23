// The solid by hand (#564): turned by dragging the stage, its height changed by its handle, opened into its net with
// a tap, sliced (a cuboid level, a cone at its slant and steeper) and a cuboid filled with unit cubes to the top.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("solids: turn, resize, unfold, slice a cone into a parabola and a hyperbola, fill with cubes", async ({ page }) => {
  const piece = await boardWith(page, "Solids: turn, unfold, slice, fill", ".live-solid");
  const pic = piece.locator("svg").first();
  // The tray is pressed by its keys: Excalidraw's toolbar lies over the top of the piece.
  const tap = async (name: string) => {
    await pic.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  };
  const turn = pic.getByRole("slider", { name: /^Turn the solid/ });
  await expect(turn).toHaveAttribute("aria-valuenow", "30");
  await expect(piece).toContainText("V = 4 × 3 × 5 = 60");
  await expect(piece).toContainText("S = 2 × (12 + 15 + 20) = 94");

  // Dragged left across the stage, the solid turns round its upright.
  const box = (await pic.boundingBox())!;
  const k = box.width / 640;
  const [x, y] = [box.x + 120 * k, box.y + 140 * k];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 100 * k, y, { steps: 8 });
  await page.mouse.up();
  await expect(turn).not.toHaveAttribute("aria-valuenow", "30");

  // The blue height handle, one up by its keys.
  const height = pic.getByRole("slider", { name: /^height: drag the handle/ });
  await height.focus();
  await page.keyboard.press("ArrowUp");
  await expect(height).toHaveAttribute("aria-valuenow", "6");
  await expect(piece).toContainText("V = 4 × 3 × 6 = 72");

  // Unfold, then a tap on the solid opens it flat: the pieces add up to the surface area.
  await tap("Unfold");
  await expect(piece).toContainText("Drag the solid outwards, or tap it");
  const net = pic.getByRole("slider", { name: /^Open the net/ });
  await net.focus();
  await page.keyboard.press("End");
  await expect(net).toHaveAttribute("aria-valuenow", "100");
  await expect(piece).toContainText("The net's pieces add up to the surface area:");
  await expect(piece).toContainText("= 108");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/solid-net.png` });

  // Sliced level, the cuboid shows a 4 × 3 rectangle.
  await tap("Slice");
  await expect(piece).toContainText("The slice is a rectangle, area = 12");

  // A cone (r 4, h 6) tilted to its side's slope is a parabola; steeper, a hyperbola.
  await tap("Cone");
  await expect(piece).toContainText("The slice is a circle");
  const tilt = pic.getByRole("slider", { name: /^How steep the slice is/ });
  await tilt.focus();
  for (let i = 0; i < 11; i++) await page.keyboard.press("ArrowUp");
  await expect(tilt).toHaveAttribute("aria-valuenow", "55");
  await expect(piece).toContainText("The slice is a parabola");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(piece).toContainText("The slice is a hyperbola");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/solid-cone.png` });

  // Back to the cuboid and Fill: the blue handle raised to the top packs 4 × 3 × 6 unit cubes.
  await tap("Cuboid");
  await tap("Fill");
  await expect(piece).toContainText("2 layers × 12 = 24 cubes");
  const layers = pic.getByRole("slider", { name: /^Layers of unit cubes/ });
  await layers.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
  await expect(piece).toContainText("Full: V = 4 × 3 × 6 = 72");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/solid-fill.png` });
});
