// Vectors in space by hand (#566): the axes turned by dragging and looked at straight down z, a × b worked exactly,
// b's tip dragged in the plane facing the viewer, a moved by its keys onto b's line (the cross product shrinks to 0),
// then the tool's skew lines, a line piercing a plane and two planes meeting, opened from its examples.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("space: turn the axes, cross product by hand, skew lines, a line through a plane, two planes", async ({ page }) => {
  const piece = await boardWith(page, "Vectors in space: cross product, lines and planes you can turn", ".live-space");
  const pic = piece.locator("svg").first();
  // The piece is taller than most: its top corner is under the app's bar, so a click on its bottom corner puts it in use.
  const whole = (await piece.boundingBox())!;
  await page.mouse.click(whole.x + 6, whole.y + whole.height - 6);
  // The tray is pressed by its keys: Excalidraw's toolbar lies over the top of the piece.
  const press = async (name: string | RegExp) => {
    await pic.getByRole("button", { name, exact: typeof name === "string" }).focus();
    await page.keyboard.press("Enter");
  };
  await expect(piece).toContainText("a × b = ((−1)·(−2) − 1·3, 1·1 − 2·(−2), 2·3 − (−1)·1) = (−1, 5, 7)");
  await expect(piece).toContainText("The parallelogram's area = |a × b| = √((−1)² + 5² + 7²) = 5√3 ≈ 8.66");
  await expect(piece).toContainText("(a × b)·a = 0 and (a × b)·b = 0");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/space-cross.png` });

  // Dragged left across the empty stage, the axes turn.
  const turn = pic.getByRole("slider", { name: /^Turn the axes/ });
  await expect(turn).toHaveAttribute("aria-valuenow", "235");
  const box = (await pic.boundingBox())!;
  const k = box.width / 680;
  const [x, y] = [box.x + 90 * k, box.y + 160 * k];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 100 * k, y, { steps: 8 });
  await page.mouse.up();
  await expect(turn).not.toHaveAttribute("aria-valuenow", "235");

  // Straight down z: the flat picture, x across and y up.
  await press("Look straight down the z axis");
  await expect(turn).toHaveAttribute("aria-valuetext", "0°, 90°");

  // b's tip dragged two units to the right moves only x. A unit on the screen, from a's tip to b's: (2, −1) to (1, 3).
  const b = pic.getByRole("slider", { name: /^b at/ });
  const a = pic.getByRole("slider", { name: /^a at/ });
  await expect(b).toHaveAttribute("aria-valuetext", "(1, 3, −2)");
  const middle = async (l: typeof a) => {
    const r = (await l.locator("circle").first().boundingBox())!;
    return [r.x + r.width / 2, r.y + r.height / 2];
  };
  const [[ax, ay], [bx, by]] = [await middle(a), await middle(b)];
  const unit = Math.hypot(bx - ax, by - ay) / Math.hypot(1, 4);
  await page.mouse.move(bx, by);
  await page.mouse.down();
  await page.mouse.move(bx + 2.2 * unit, by + 0.2 * unit, { steps: 10 });
  await page.mouse.up();
  await expect(b).toHaveAttribute("aria-valuetext", "(3, 3, −2)");

  // a moved by its keys onto b's line: a × b shrinks to nothing.
  await a.focus();
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp");
  await expect(a).toHaveAttribute("aria-valuetext", "(3, 3, 1)");
  await a.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("PageDown");
  await expect(piece).toContainText("a and b lie along one line: a × b = 0");

  // The tool's skew lines, opened in the starting view: the shortest way between them, exact.
  await press("Lines");
  await press(/^Example 4: skew/);
  await expect(piece).toContainText("Skew: they never meet and are not parallel. n = d₁ × d₂ = (1, −1, −1)");
  await expect(piece).toContainText("= 4√3/3 ≈ 2.309");
  await expect(turn).toHaveAttribute("aria-valuetext", "235°, 20°");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/space-skew.png` });

  // r·(1, 1, 1) = 6 pierced by the line: the point it goes through.
  await press("Planes");
  await press(/^Example 4: r·\(1, 1, 1\) = 6; line/);
  await expect(piece).toContainText("Π: x + y + z = 6");
  await expect(piece).toContainText("The line pierces the plane at X = (11/6, 5/3, 5/2) (t = 5/6)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/space-pierce.png` });

  // Two planes: the line where they meet and the angle between them.
  await press(/^Example 5: two planes/);
  await expect(piece).toContainText("They meet in the line r = (0, 3/2, 9/2) + t(2, 1, −3)");
  await expect(piece).toContainText("cos θ = |n₁·n₂|/(|n₁| |n₂|) = √2/3, θ ≈ 61.87°");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/space-planes.png` });

  // The dot product: the shadow of a on b.
  await press("Dot product");
  await expect(piece).toContainText("a·b = 1·2 + 2·(−1) + 2·2 = 4");
  await expect(piece).toContainText("Shadow of a on b: a·b/|b| = 4/3, the vector (a·b/|b|²)b = (8/9, −4/9, 8/9)");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/space-dot.png` });
});
