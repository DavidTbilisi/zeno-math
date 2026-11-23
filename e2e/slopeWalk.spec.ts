// Walk the slope by hand: the walker dragged down to the bottom, tapped to walk to the top (where how far is cos θ
// and how tall is sin θ), the slope made steeper with the keys on its flag and by dragging the flag round, and the
// walker moved back with the keys.
import { expect, test, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
// The slope starts at (60, 500) and is 380 long.
const [OX, GY, L] = [60, 500, 380];
const rad = (d: number) => (d * Math.PI) / 180;

async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

test("walk the slope: drag down, tap to the top, steeper by keys and by the flag", async ({ page }) => {
  const piece = await boardWith(page, "Walk the slope: how far is cos, how tall is sin", ".live-slopeWalk");
  const pic = piece.locator("svg").first();
  const box = (await pic.boundingBox())!;
  const k = box.width / 640;
  const on = (theta: number, at: number, up = 0) => ({
    x: box.x + (OX + at * L * Math.cos(rad(theta))) * k,
    y: box.y + (GY - at * L * Math.sin(rad(theta)) - up) * k,
  });
  const walker = pic.getByRole("slider", { name: "The walker, on the slope" });
  const top = pic.getByRole("slider", { name: /^The top of the slope/ });
  await expect(walker).toHaveAttribute("aria-valuenow", "60");
  await expect(top).toHaveAttribute("aria-valuenow", "35");
  await expect(piece).toContainText("How far across = 0.60 × cos 35° = 0.49");
  await expect(piece).toContainText("How tall = 0.60 × sin 35° = 0.34");

  // Held by the body and dragged down past the bottom: the walk is 0.
  await drag(page, on(35, 0.6, 36), on(35, -0.2, 36));
  await expect(walker).toHaveAttribute("aria-valuenow", "0");
  await expect(piece).toContainText("Drag the walker up the slope, or tap them to walk.");

  // A tap: they walk all the way up, and there how far is cos θ and how tall is sin θ.
  await page.mouse.click(on(35, 0, 36).x, on(35, 0, 36).y);
  await expect(walker).toHaveAttribute("aria-valuenow", "100", { timeout: 6000 });
  await expect(piece).toContainText("and how tall is sin 35°, 0.57.");
  await expect(piece).toContainText("how tall 0.57 = sin 35°");

  // The flag's keys: ten degrees steeper.
  await top.press("PageUp");
  await expect(top).toHaveAttribute("aria-valuenow", "45");
  await expect(piece).toContainText("How far across = 1.00 × cos 45° = 0.71");
  // The flag held by its cloth and turned 15° about the bottom of the slope, to 60°.
  const cloth = { x: OX + L * Math.cos(rad(45)) + 12, y: GY - L * Math.sin(rad(45)) - 84 };
  const turned = (deg: number) => {
    const [dx, dy] = [cloth.x - OX, GY - cloth.y];
    const [c, s] = [Math.cos(rad(deg)), Math.sin(rad(deg))];
    return { x: box.x + (OX + dx * c - dy * s) * k, y: box.y + (GY - (dx * s + dy * c)) * k };
  };
  await drag(page, turned(0), turned(15));
  await expect(top).toHaveAttribute("aria-valuenow", "60");
  await expect(piece).toContainText("How tall = 1.00 × sin 60° = 0.87");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/slopeWalk.png` });

  // The walker's keys: back down half way.
  await walker.press("PageDown");
  await walker.press("PageDown");
  await expect(walker).toHaveAttribute("aria-valuenow", "50");
  await expect(piece).toContainText("How far across = 0.50 × cos 60° = 0.25");
  // The steepest slope: the flag still fits in the picture.
  await top.press("End");
  await expect(top).toHaveAttribute("aria-valuenow", "85");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/slopeWalkSteep.png` });
});
