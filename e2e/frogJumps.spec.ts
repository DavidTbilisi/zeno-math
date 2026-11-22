// Frog jumps by hand: past the flag (the arc tapped to take the jump off), then on it in the
// fewest; and the zoom opens one whole with every tick labelled.
import { expect, test, type Page } from "@playwright/test";
import { Frac } from "../src/math/fraction.ts";
import { FROG_LADDER, fewest, frogNow } from "../src/math/frogJumps.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = FROG_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.frog.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Frog jumps: land on a fraction in the fewest jumps", ".live-frogJumps");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => frogNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const fr = (n: number, d: number) => (d === 1 ? `${n}` : `${n}/${d}`);

test("frog jumps: past the flag, then the fewest of two sizes", async ({ page }) => {
  const s = FROG_LADDER.findIndex((r) => r.level === 3);
  const t = task(s);
  const [a, b] = t.sizes;
  const m = fewest(t.sizes, t.target)!;
  // The fewest: i jumps of a and j of b.
  let best: [number, number] = [0, 0];
  for (let i = 0; i <= m; i++) {
    const rest = t.target.sub(a.mul(new Frac(i)));
    const j = rest.div(b);
    if (!rest.isNeg() && j.isInt() && i + j.n === m) best = [i, j.n];
  }
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  const padA = pic.getByRole("button", { name: `Jump ${fr(a.n, a.d)}`, exact: true });
  const padB = pic.getByRole("button", { name: `Jump ${fr(b.n, b.d)}`, exact: true });
  // Past the flag with the big jumps, then the last one taken off.
  const big = a.toNumber() > b.toNumber() ? padA : padB;
  const bigSize = Math.max(a.toNumber(), b.toNumber());
  const over = Math.floor(t.target.toNumber() / bigSize) + 1;
  for (let k = 0; k < over; k++) await big.click();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Past the flag by/)).toBeVisible();
  await pic.getByRole("button", { name: "Take off jump 1 and the ones after it" }).click();
  // On the flag in the fewest: i of a, j of b.
  for (let k = 0; k < best[0]; k++) await padA.click();
  for (let k = 0; k < best[1]; k++) await padB.click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/frogJumps.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${m} jumps: .* = ${fr(t.target.n, t.target.d)}\\. ★★`))).toBeVisible();
});

test("frog jumps: one size, the zoom labels every tick", async ({ page }) => {
  const t = task(0);
  const k = t.target.div(t.sizes[0]).n;
  const game = await open(page, 0);
  const pic = game.locator("svg").first();
  const pad = pic.getByRole("button", { name: `Jump 1/${t.sizes[0].d}`, exact: true });
  for (let i = 0; i <= k; i++) await pad.click();
  await pic.getByRole("button", { name: `Take off jump ${k + 1} and the ones after it` }).click();
  await pic.getByRole("button", { name: "Zoom into 0 to 1" }).click();
  await expect(pic.getByRole("button", { name: "Zoom out" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/frogZoom.png` });
  await pic.getByRole("button", { name: "Zoom out" }).click();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${k} jumps: ${k} × 1/${t.sizes[0].d}`))).toBeVisible();
});
