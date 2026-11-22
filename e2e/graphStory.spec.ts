// Graph stories by hand: the pieces dragged from the tray onto the graph, the last part dragged into the bin and put
// again with a tap, and the check pill.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { STORY_LADDER, storyTask } from "../src/math/graphStory.ts";
import { rng } from "../src/math/random.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const a = (await from.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test("graph stories by hand: pieces dragged onto the graph, the last into the bin", async ({ page }) => {
  const game = await boardWith(page, "Graph stories: draw the walk", ".live-graphStory");
  const pic = game.locator("svg").first();
  const t = storyTask(STORY_LADDER[0].level, rng(STORY_LADDER[0].seed));
  const piece = (p: (typeof t.parts)[number]) => pic.getByRole("button", { name: en.live.graphStory.pieces[p], exact: true });
  const b = (await pic.boundingBox())!;
  const mid = { x: b.x + b.width / 2, y: b.y + 60 };
  const check = pic.getByRole("button", { name: "Check" });

  for (const p of t.parts) await drag(page, piece(p), mid);
  await expect(check).toBeVisible();
  await drag(page, pic.getByRole("button", { name: /^Last part/ }), (await pic.getByRole("button", { name: /^Tap to clear the graph/ }).boundingBox().then((r) => ({ x: r!.x + r!.width / 2, y: r!.y + r!.height / 2 }))));
  await expect(check).toHaveCount(0);
  await piece(t.parts[t.parts.length - 1]).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/graphStory.png` });
  await check.click();
  await expect(game.getByText(/Right! The graph tells the walk\. ★★★/)).toBeVisible();
});
