// The surface by hand (#565): turned by dragging the stage, the point moved by its keys (z and both partials follow),
// sliced along x and along y, the gradient at the point, the point walked along a fence to where the contours touch
// (Lagrange), and a ball rolled down the bowl a step per tap.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("surfaces: turn, move the point, slice, gradient, Lagrange and descent", async ({ page }) => {
  const piece = await boardWith(page, "Surfaces z = f(x, y): slices, gradient, descent", ".live-surface");
  const pic = piece.locator("svg").first();
  // The tray is pressed by its keys: Excalidraw's toolbar lies over the top of the piece.
  const tap = async (name: string) => {
    await pic.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  };
  await expect(piece).toContainText("f(x, y) = x² + y²");
  await expect(piece).toContainText("At (1.5, −1): z = f(x, y) = 3.25");
  await expect(piece).toContainText("∂f/∂x = 3, ∂f/∂y = −2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-point.png` });

  // Dragged left across the stage, the hill turns round its upright.
  const turn = pic.getByRole("slider", { name: /^Turn the surface/ });
  await expect(turn).toHaveAttribute("aria-valuenow", "330");
  const box = (await pic.boundingBox())!;
  const k = box.width / 640;
  const [x, y] = [box.x + 50 * k, box.y + 420 * k];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 60 * k, y, { steps: 8 });
  await page.mouse.up();
  await expect(turn).not.toHaveAttribute("aria-valuenow", "330");

  // The point one step right by its keys: z and the partials follow.
  const point = pic.getByRole("slider", { name: /^The point \(x, y\)/ });
  await point.focus();
  await page.keyboard.press("ArrowRight");
  await expect(piece).toContainText("At (1.6, −1): z = f(x, y) = 3.56");
  await expect(piece).toContainText("∂f/∂x = 3.2, ∂f/∂y = −2");

  // A slice along x: the plane y = −1, its tangent's slope is ∂f/∂x; along y, ∂f/∂y.
  await tap("Slice");
  await expect(piece).toContainText("The plane y = −1 cuts the hill in the curve z = f(x, −1)");
  await expect(piece).toContainText("Its tangent at x = 1.6 has slope ∂f/∂x = 3.2.");
  await tap("Along y");
  await expect(piece).toContainText("Its tangent at y = −1 has slope ∂f/∂y = −2.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-slice.png` });

  // The gradient: uphill, across the contour, as long as the slope is steep.
  await tap("Gradient");
  await expect(piece).toContainText("∇f = (3.2, −2) points uphill, across the contour z = 3.56.");
  await expect(piece).toContainText("|∇f| = 3.77");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-gradient.png` });

  // Lagrange on the fence x + y = 2: walked along by its keys to where the contour of f touches it, at (1, 1).
  await tap("Lagrange");
  await expect(piece).toContainText("The point stays on the fence x + y = 2");
  const along = pic.getByRole("slider", { name: /^The point on the fence/ });
  await along.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowUp");
  await expect(piece).toContainText("The contour f = 2 touches the fence: the lowest point on it.");
  await expect(piece).toContainText("At (1, 1) ∇f = λ∇g with λ = 2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-lagrange.png` });

  // Descent from (1.6, −1) with η = 0.1: each step takes the ball to 0.8 of the way it was.
  await tap("Descent");
  await expect(piece).toContainText("Step 0: the ball is at (1.6, −1), f = 3.56");
  const ball = pic.getByRole("button", { name: /^The ball/ });
  await ball.focus();
  await page.keyboard.press("Enter");
  await expect(piece).toContainText("Step 1: the ball is at (1.28, −0.8), f = 2.28");
  for (let i = 0; i < 5; i++) await tap("Step");
  await expect(piece).toContainText("Step 6:");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-descent.png` });

  // The ravine from the tray: its own square and start.
  await tap("Ravine");
  await expect(piece).toContainText("f(x, y) = x²/5 + 3y²");
  await expect(piece).toContainText("Step 0: the ball is at (−2.5, 1.2)");
  for (let i = 0; i < 8; i++) await tap("Step");
  await expect(piece).toContainText("Step 8:");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/surface-ravine.png` });
});
