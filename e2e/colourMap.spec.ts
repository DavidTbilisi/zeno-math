// Colour the graph by hand: a paint pot dragged onto a vertex paints it, a vertex dragged into the bin loses its
// colour, and the check is a pill that shows once every vertex is painted.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { COLOUR_LADDER, colourTask } from "../src/math/colouring.ts";
import { colourWith, name } from "../src/math/graphPlay.ts";
import { rng } from "../src/math/random.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator) {
  const [a, b] = [(await from.boundingBox())!, (await to.boundingBox())!];
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("colour the graph by hand: pots dragged onto vertices, one into the bin, checked", async ({ page }) => {
  const game = await boardWith(page, "Colour the graph", ".live-colourMap");
  const pic = game.locator("svg").first();
  const t = colourTask(COLOUR_LADDER[0].level, rng(COLOUR_LADDER[0].seed));
  const col = colourWith(t.g, t.k)!;
  const vertex = (v: number) => pic.getByRole("button", { name: name(v), exact: true });
  const pot = (c: number) => pic.getByRole("radio", { name: `Colour ${c + 1}` });
  const check = pic.getByRole("button", { name: "Check" });

  for (const [v, c] of col.entries()) await drag(page, pot(c), vertex(v));
  await expect(check).toBeVisible();
  await expect(pot(col[col.length - 1])).toHaveAttribute("aria-checked", "true");
  // The first vertex's colour dropped in the bin: no check until it is painted again.
  await drag(page, vertex(0), pic.getByRole("button", { name: /^Tap to clear every colour/ }));
  await expect(check).toHaveCount(0);
  await expect(game.getByText("Vertices left to colour: 1.")).toBeVisible();
  // A tap on its pot, then on the vertex.
  await pot(col[0]).click();
  await vertex(0).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/colourMap.png` });
  await check.click();
  await expect(game.getByText(/Right! 2 colours, and no edge joins two alike\. ★★★/)).toBeVisible();
});
