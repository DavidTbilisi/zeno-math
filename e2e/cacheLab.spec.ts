// The cache (#855) by hand: direct mapping placed line by line (a wrong line, a drag from memory, a conflict), the
// loop's hits predicted, and a sequence that thrashes the direct-mapped cache but not the two-way one.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const NAME = "The cache: hits, misses and mapping";
const press = async (l: Locator) => {
  await l.focus();
  await l.press("Enter");
};
const open = async (page: Page, n: number) => {
  await page.addInitScript((k) => localStorage.setItem("zeno.cachelab.v1", JSON.stringify({ stars: [3, 3, 3, 3, 3].map((s, i) => (i < k ? s : 0)) })), n - 1);
  const piece = await boardWith(page, NAME, ".live-cacheLab");
  if (n > 1) await press(piece.getByRole("button", { name: new RegExp(`^Puzzle ${n}`) }));
  return { piece, pic: piece.locator("svg.hand-pic") };
};
const line = (pic: Locator, i: number) => pic.locator(`g[data-line='${i}'] rect`);

test("direct mapped by hand: each block to its line, hits where it already is", async ({ page }) => {
  const { piece, pic } = await open(page, 1);
  await expect(pic.locator("[data-address]")).toHaveAttribute("data-address", "00|01");
  await line(pic, 0).click();
  await expect(piece).toContainText("Block 1 can go only in line 1: 1 mod 4 = 1.");
  await line(pic, 1).click();
  await line(pic, 2).click();
  await line(pic, 1).click();
  await expect(piece).toContainText("Block 1 is already in line 1: a hit");
  // Block 5 dragged from memory onto line 1: it throws block 1 out.
  const from = (await pic.locator("g[data-mem='5'] rect").boundingBox())!;
  const to = (await line(pic, 1).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(piece).toContainText("block 1 goes out");
  await expect(pic.locator("g[data-line='1']")).toHaveAttribute("data-block", "5");
  for (const i of [2, 1, 1]) await line(pic, i).click();
  await expect(piece).toContainText("Done!");
  await expect(pic.locator("[data-hits]")).toHaveAttribute("data-hits", "2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cache-direct.png` });
});

test("a loop over an array: misses the first time round, hits the second", async ({ page }) => {
  const { piece, pic } = await open(page, 4);
  for (const hit of [false, false, false, false, true, true, true, true, false, false]) await pic.getByRole("button", { name: hit ? "It will be a hit" : "It will be a miss" }).click();
  await expect(piece).toContainText("Done! ★★★");
});

test("thrashing: 0 and 4 in turn, no hit direct mapped, four hits two-way", async ({ page }) => {
  const { piece, pic } = await open(page, 5);
  for (const b of [0, 4, 0, 4, 0]) await pic.locator(`g[data-mem='${b}'] rect`).click();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(piece).toContainText("Not yet: 5 requests");
  await pic.locator("g[data-mem='4'] rect").click();
  await expect(piece).toContainText("Direct mapped: 0 hits. Two-way: 4 hits.");
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(piece).toContainText("Done!");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cache-thrash.png` });
});
