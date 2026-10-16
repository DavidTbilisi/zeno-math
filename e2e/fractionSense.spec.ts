// Fraction-sense games: a make-a-whole puzzle filled with the fewest tiles for three stars, and its practice question.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { WALL_LADDER, wallTask } from "../src/math/fractionWall.ts";
import { exercise } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("make a whole: a gap filled with the fewest tiles earns three stars and opens the next puzzle", async ({ page }) => {
  const game = await boardWith(page, "Make a whole: fraction tiles", ".live-fractionWall");
  const t = wallTask(WALL_LADDER[0].level, rng(WALL_LADDER[0].seed));
  // The first tap may still be waking the piece up on a slow machine: tap until the tile is in.
  await expect(async () => {
    await game.locator(".wall-tray").getByRole("button", { name: `1/${t.fewest[0]}`, exact: true }).click();
    await expect(game.getByText(/in so far|Exactly/)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (const d of t.fewest.slice(1)) await game.locator(".wall-tray").getByRole("button", { name: `1/${d}`, exact: true }).click();
  await expect(game.getByText(/Exactly, with the fewest tiles! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("make a whole in practice: the missing fraction typed", async ({ page, request }) => {
  const r = 0.52;
  const ex = exercise("makeWhole", 1, seedOf(r), w);
  await practise(page, request, { tab: "Number", skill: "Make a whole", level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
