// Fold to equal by hand: a check before folding misses, the strip folded in two past the goal and tapped back along
// the trail, then folded to the asked-for pieces and the top written; and a later puzzle that unfolds first.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { FOLD_LADDER, foldAll, foldNow } from "../src/math/fold.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = FOLD_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.foldstrip.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Fold to equal: fold a strip, keep the amount", ".live-foldStrip");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => foldNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};

test("fold to equal: fold in two, step back along the trail, then the right pieces and top", async ({ page }) => {
  const game = await open(page, 0);
  const pic = game.locator("svg").first();
  const t = task(0);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`^The strip is in ${t.d} pieces, not ${t.to}`))).toBeVisible();
  // Folded in two until there are more pieces than asked, then back along the trail to the goal.
  const two = pic.getByRole("button", { name: "Fold in two", exact: true });
  for (let d = t.d; d <= t.to; d *= 2) await two.click();
  await pic.getByRole("button", { name: `Back to ${t.n * (t.to / t.d)}/${t.to}` }).click();
  await expect(pic.getByRole("button", { name: /^Back to / })).toHaveCount(Math.log2(t.to / t.d) + 1);
  await setTo(pic.getByRole("slider", { name: "Answer top" }), (t.n * t.to) / t.d);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/foldStrip.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.n}/${t.d} = ${(t.n * t.to) / t.d}/${t.to} ★★`))).toBeVisible();
});

test("fold to equal: a strip not in lowest terms unfolds first", async ({ page }) => {
  const game = await open(page, 6);
  const pic = game.locator("svg").first();
  const t = task(6);
  const unfold = pic.getByRole("button", { name: "Unfold: erase every other crease" });
  const three = pic.getByRole("button", { name: "Unfold: erase two creases of three" });
  const path: number[] = [];
  // Unfold while it can and the goal isn't reached, then fold up to it.
  for (;;) {
    const at = foldAll(t.n, t.d, path as never)!;
    if (at.d === t.to) break;
    if (at.d % 2 === 0 && at.n % 2 === 0 && at.d > t.to) (await unfold.click(), path.push(-2));
    else if (at.d % 3 === 0 && at.n % 3 === 0 && at.d > t.to) (await three.click(), path.push(-3));
    else if ((t.to / at.d) % 3 === 0) (await pic.getByRole("button", { name: "Fold in three", exact: true }).click(), path.push(3));
    else (await pic.getByRole("button", { name: "Fold in two", exact: true }).click(), path.push(2));
  }
  const at = foldAll(t.n, t.d, path as never)!;
  await setTo(pic.getByRole("slider", { name: "Answer top" }), at.n);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/foldStrip-unfold.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.n}/${t.d} = ${at.n}/${t.to} ★★★`))).toBeVisible();
});
