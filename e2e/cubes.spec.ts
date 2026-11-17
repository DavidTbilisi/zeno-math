// Linking cubes: a train dragged onto another joins it, a dot between cubes breaks a train, a tap paints a cube,
// and sharing all the cubes into trains of 4 shows 12 = 3 × 4.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("linking cubes: join, break, paint and share", async ({ page }) => {
  const piece = await boardWith(page, "Linking cubes", ".live-cubes");
  await expect(piece).toContainText("7 + 5 = 12");
  await expect(piece).toContainText("7 is 2 more than 5; 5 is 2 fewer than 7");

  // Drag the second train (5 cubes) onto the first: one train of 12, in its colours 4 + 3 + 5.
  const pic = piece.locator("svg").first();
  const cubes = pic.locator("g[style*='grab']");
  const from = (await cubes.nth(7).boundingBox())!;
  const to = (await cubes.nth(0).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(piece).toContainText("4 + 3 + 5 = 12");

  // Break it after the 7th cube, then paint the first cube green: by colour, 1 green, 3 red, 3 blue and 5 yellow.
  await pic.locator("circle[fill='#ced4da']").nth(6).click();
  await expect(piece).toContainText("7 + 5 = 12");
  await piece.getByRole("button", { name: "Paint with this colour 4" }).click();
  await cubes.nth(0).click();
  await piece.getByRole("button", { name: "Join all" }).click();
  await expect(piece).toContainText("1 + 3 + 3 + 5 = 12");

  // Share into trains of 4: 3 trains of 4.
  await piece.getByRole("button", { name: "One more" }).click();
  await piece.getByRole("button", { name: "Share", exact: true }).click();
  await expect(piece).toContainText("3 trains of 4: 3 × 4 = 12");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cubes.png` });
});
