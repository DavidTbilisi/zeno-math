// Linking cubes, worked by hand: a train dragged onto another joins it, the end of a train dragged below the trains
// breaks it off, a tray cube picks the paint and a tap paints, a cube from the tray joins a train and one dragged into
// the bin comes off, and sharing all the cubes into trains of 4 shows 12 = 3 × 4.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  const at = async (l: Locator | { x: number; y: number }) => {
    if (!("boundingBox" in l)) return l;
    const b = (await l.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const [a, b] = [await at(from), await at(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test("linking cubes by hand: join, break, paint, add, take off and share", async ({ page }) => {
  const piece = await boardWith(page, "Linking cubes", ".live-cubes");
  const pic = piece.locator("svg").first();
  const cube = (t: number, i: number) => pic.locator(`g[data-cube='${t}-${i}']`);
  await expect(piece).toContainText("7 + 5 = 12");
  await expect(piece).toContainText("7 is 2 more than 5; 5 is 2 fewer than 7");

  // The second train (5 cubes), lifted by its first cube, onto the first: one train of 12, in its colours 4 + 3 + 5.
  await drag(page, cube(1, 0), cube(0, 3));
  await expect(piece).toContainText("4 + 3 + 5 = 12");

  // Its last 5 cubes lifted off and laid below it: broken after the 7th cube again.
  const below = (await cube(0, 0).boundingBox())!;
  await drag(page, cube(0, 7), { x: below.x + 200, y: below.y + below.height / 2 + 80 });
  await expect(piece).toContainText("7 + 5 = 12");

  // The green tray cube tapped, then the first cube: by colour, 1 green, 3 red, 3 blue and 5 yellow.
  await pic.getByRole("button", { name: "Paint with this colour 4" }).click();
  await cube(0, 0).click();
  await pic.getByRole("button", { name: "Join all" }).click();
  await expect(piece).toContainText("1 + 3 + 3 + 5 = 12");

  // A cube from the tray onto the train makes 13; its last cube dragged into the bin makes 12 again.
  await drag(page, pic.getByRole("button", { name: "Paint with this colour 2" }), cube(0, 5));
  await expect(piece).toContainText("= 13");
  await drag(page, cube(0, 12), pic.getByRole("button", { name: /^Drop cubes here/ }));
  await expect(piece).toContainText("1 + 3 + 3 + 5 = 12");

  // Shared into trains of 4: 3 trains of 4.
  await pic.getByRole("slider", { name: "Share into trains of" }).press("ArrowUp");
  await pic.getByRole("button", { name: "Share", exact: true }).click();
  await expect(piece).toContainText("3 trains of 4: 3 × 4 = 12");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cubes.png` });
});
