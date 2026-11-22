// 3D views by hand: a tap on a floor square stacks a cube there, a cube dragged into the bin goes, one dragged in from
// the tray lands on the square it's let go over, the ↶ pill takes the last change back, and the difficulty is a tab.
import { expect, test, type Page } from "@playwright/test";
import { boardWith } from "./helpers.ts";

test.use({ viewport: { width: 1280, height: 1200 } });

const centre = async (page: Page, sel: ReturnType<Page["locator"]>) => {
  const b = (await sel.boundingBox())!;
  return [b.x + b.width / 2, b.y + b.height / 2] as const;
};
const dragTo = async (page: Page, from: readonly [number, number], to: readonly [number, number]) => {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 10 });
  await page.mouse.up();
};

test("views3d: tap, bin, tray and undo", async ({ page }) => {
  const piece = await boardWith(page, "3D views: build the solid", ".live-views3d");
  const pic = piece.locator(".hand-pic");
  const height = (i: number) => pic.locator(`[data-col='${i}'] title`).first();

  await pic.locator("[data-col='4'] polygon").first().click();
  await expect(height(4)).toHaveText("5: 1");

  // The cube's top face, dragged into the bin.
  const bin = pic.getByRole("button", { name: /^Tap to take every cube away/ });
  await dragTo(page, await centre(page, pic.locator("[data-col='4'] polygon").last()), await centre(page, bin));
  await expect(height(4)).toHaveText("5: 0");

  // A cube from the tray onto the first floor square.
  const tray = pic.locator("g", { has: page.locator("title", { hasText: /^Drag a cube from here/ }) }).last();
  await dragTo(page, await centre(page, tray), await centre(page, pic.locator("[data-col='0'] polygon").first()));
  await expect(height(0)).toHaveText("1: 1");

  await pic.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(height(0)).toHaveText("1: 0");

  await pic.getByRole("button", { name: "Hard", exact: true }).click();
  await expect(pic.getByRole("button", { name: "Hard", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: test.info().outputPath("views3d.png") });
});
