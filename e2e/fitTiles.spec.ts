// How many fit? by hand: tiles laid from the tray, one taken off, laid to the bar's end, then the count written; on a
// puzzle with a cut tile, the leftover written as a part of the whole misses, and as a part of the tile is right.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Frac } from "../src/math/fraction.ts";
import { FIT_LADDER, fitNow, fitOf, tilesToCover } from "../src/math/fitTiles.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = FIT_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.fittiles.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "How many fit? Divide by laying tiles", ".live-fitTiles");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => fitNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};

test("how many fit: lay tiles, take one off, lay to the end and count", async ({ page }) => {
  const game = await open(page, 0);
  const pic = game.locator("svg").first();
  const t = task(0);
  const lay = pic.getByRole("button", { name: `Lay a ${t.b.n}/${t.b.d} tile` });
  await lay.click();
  await lay.click();
  await pic.getByRole("button", { name: "Take off tile 2 and the ones after it" }).click();
  await expect(game.getByText(/^Laid: 1\./)).toBeVisible();
  for (let i = 1; i < tilesToCover(t); i++) await lay.click();
  await expect(lay).toHaveAttribute("aria-disabled", "true");
  await setTo(pic.getByRole("slider", { name: "Answer: whole tiles" }), fitOf(t).whole);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Dividing by a part made it bigger! Right! .* ★★★/)).toBeVisible();
});

test("how many fit: the cut tile's leftover counts in tiles, not in wholes", async ({ page }) => {
  const game = await open(page, 3);
  const pic = game.locator("svg").first();
  const t = task(3);
  const { whole, part } = fitOf(t);
  const lay = pic.getByRole("button", { name: `Lay a ${t.b.n}/${t.b.d} tile` });
  for (let i = 0; i < tilesToCover(t); i++) await lay.click();
  await expect(pic.getByText(`${part.n}/${part.d} of a tile`)).toBeVisible();
  // The leftover of the bar, as a part of the whole.
  const left = t.a.sub(t.b.mul(new Frac(whole, 1)));
  await setTo(pic.getByRole("slider", { name: "Answer: whole tiles" }), whole);
  await setTo(pic.getByRole("slider", { name: "Answer: part bottom" }), left.d);
  await setTo(pic.getByRole("slider", { name: "Answer: part top" }), left.n);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^That leftover is a part of the whole/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer: part bottom" }), part.d);
  await setTo(pic.getByRole("slider", { name: "Answer: part top" }), part.n);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fitTiles.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^The leftover counted in tiles, not in wholes! Right! .* ★★/)).toBeVisible();
});
