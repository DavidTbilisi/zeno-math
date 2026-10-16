// Fraction-sense games: a make-a-whole puzzle filled with the fewest tiles for three stars, and its practice question;
// a board of equal amounts cleared with no misses, and the equal fraction picked in practice; a line of fractions put
// in their places, and a practice list tapped in order; a fraction of a shape shaded right first time, and in practice.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { WALL_LADDER, wallTask } from "../src/math/fractionWall.ts";
import { eqNow, same } from "../src/math/equivMatch.ts";
import { ORDER_LADDER, orderTask, rightOrder } from "../src/math/fracOrder.ts";
import { SHADE_LADDER, shadeTask } from "../src/math/shadeFrac.ts";
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

test("fractions on the line: every card put at its place earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Fractions on the line: put them in order", ".live-fracOrder");
  const t = orderTask(ORDER_LADDER[0].level, rng(ORDER_LADDER[0].seed));
  const line = game.locator("svg").first();
  const put = async (v: number) => {
    const b = (await line.boundingBox())!;
    const k = b.width / 680;
    await page.mouse.click(b.x + (40 + (v / t.to) * 600) * k, b.y + 120 * k);
  };
  // The cards are picked up one after another; the first click may still be waking the piece up.
  await expect(async () => {
    await put(t.items[0].v);
    await expect(game.locator(".order-card").first()).toHaveClass(/placed/, { timeout: 1000 });
  }).toPass();
  for (const it of t.items.slice(1)) await put(it.v);
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/In order, and every one close to its place! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Line 2/ })).toBeEnabled();
});

test("fractions in order in practice: tapped smallest first", async ({ page, request }) => {
  const r = 0.71;
  const ex = exercise("orderFractions", 2, seedOf(r), w);
  if (ex.answer.k !== "order") throw new Error();
  const { items } = ex.answer;
  await practise(page, request, { tab: "Number", skill: "Fractions in order", level: "medium", r, prompt: ex.prompt });
  for (const i of rightOrder(items)) await page.locator(".sign-picks").getByRole("button", { name: items[i].text, exact: true }).click();
  await expect(page.getByLabel("Your answer")).toHaveValue(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("shade the fraction: the right number of pieces shaded first time earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Shade the fraction", ".live-shadeFrac");
  const t = shadeTask(SHADE_LADDER[0].level, rng(SHADE_LADDER[0].seed));
  const piece = (k: number) => game.locator(".shade-piece").nth(k);
  await expect(async () => {
    await piece(0).click();
    await expect(piece(0)).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
  for (let k = 1; k < t.count; k++) await piece(k).click();
  await game.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/Right! .*★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("shade the fraction in practice: pieces tapped, scattered or not", async ({ page, request }) => {
  const r = 0.18;
  const ex = exercise("shadeFraction", 2, seedOf(r), w);
  if (ex.answer.k !== "shade") throw new Error();
  const { count, play } = ex.answer;
  await practise(page, request, { tab: "Number", skill: "Shade the fraction", level: "medium", r, prompt: ex.prompt });
  // Every other piece from the end, so the pieces needn't be side by side.
  const pieces = page.locator(".shade-shape .shade-piece");
  for (let k = 0; k < count; k++) await pieces.nth(play.pieces - 1 - ((2 * k) % play.pieces)).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
