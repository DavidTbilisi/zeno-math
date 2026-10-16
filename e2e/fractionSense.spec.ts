// Fraction-sense games: a make-a-whole puzzle filled with the fewest tiles for three stars, and its practice question;
// a board of equal amounts cleared with no misses, and the equal fraction picked in practice.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { WALL_LADDER, wallTask } from "../src/math/fractionWall.ts";
import { eqNow, same } from "../src/math/equivMatch.ts";
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

test("equal amounts: a board cleared with no misses earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Equal amounts: match the cards", ".live-equivMatch");
  const cards = eqNow({ mode: "puzzle", stage: 0, level: 1, seed: 0 });
  const card = (i: number) => game.locator(".eq-card").nth(i);
  // The first tap may still be waking the piece up: tap until the card is picked.
  await expect(async () => {
    await card(0).click();
    await expect(card(0)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  const mate = cards.findIndex((c, i) => i > 0 && same(c, cards[0]));
  await card(mate).click();
  const left = cards.map((_, i) => i).filter((i) => i !== 0 && i !== mate);
  while (left.length) {
    const a = left.shift()!;
    const b = left.splice(left.findIndex((i) => same(cards[i], cards[a])), 1)[0];
    await card(a).click();
    await card(b).click();
  }
  await expect(game.getByText(/Board cleared! ★★★|A clean board|Cleared with no misses/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Board 2/ })).toBeEnabled();
});

test("equal fractions in practice: the equal one picked from the buttons", async ({ page, request }) => {
  const r = 0.33;
  const ex = exercise("equivalent", 2, seedOf(r), w);
  if (ex.answer.k !== "near") throw new Error();
  const best = ex.answer.options[ex.answer.right];
  await practise(page, request, { tab: "Number", skill: "Equal fractions", level: "medium", r, prompt: ex.prompt });
  await page.locator(".sign-picks").getByRole("button", { name: best.text, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
