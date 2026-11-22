// Overflow bars by hand: shading spills into a second bar, a tap on the last shaded part takes it off; an improper
// fraction written as a mixed number, and a mixed number turned into one fraction with the whole-times-top slip first.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mixedOf, OVERFLOW_LADDER, overflowNow } from "../src/math/overflowBars.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = OVERFLOW_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.overflow.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Overflow bars: improper and mixed", ".live-overflowBars");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => overflowNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};
const part = (pic: Locator, b: number, k: number) => pic.getByRole("button", { name: `Bar ${b}, part ${k}`, exact: true });
/** Shade n parts of d-part bars from none: fill each bar before (the next one shows when it is full), then the n-th. */
const shade = async (pic: Locator, n: number, d: number) => {
  const bar = Math.floor((n - 1) / d) + 1;
  for (let b = 1; b < bar; b++) await part(pic, b, d).click();
  await part(pic, bar, ((n - 1) % d) + 1).click();
};

test("overflow bars: an improper fraction spills into a second bar and is written as a mixed number", async ({ page }) => {
  const game = await open(page, 0);
  const pic = game.locator("svg").first();
  const t = task(0);
  const { w, a } = mixedOf(t.n, t.d);
  await expect(part(pic, 2, 1)).toHaveCount(0);
  await part(pic, 1, t.d).click();
  await part(pic, 2, t.n + 1 - t.d).click();
  await part(pic, 2, t.n + 1 - t.d).click();
  await expect(game.getByText(`Shaded: ${t.n} parts.`)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer: whole" }), w);
  await setTo(pic.getByRole("slider", { name: "Answer bottom" }), t.d);
  await setTo(pic.getByRole("slider", { name: "Answer top" }), a);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.n}/${t.d} = ${w} ${a}/${t.d} ★★★`))).toBeVisible();
});

test("overflow bars: a mixed number as one fraction, the whole times the top caught first", async ({ page }) => {
  const game = await open(page, 3);
  const pic = game.locator("svg").first();
  const t = task(3);
  const { w, a } = mixedOf(t.n, t.d);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Shade exactly/)).toBeVisible();
  await shade(pic, t.n, t.d);
  await setTo(pic.getByRole("slider", { name: "Answer bottom" }), t.d);
  await setTo(pic.getByRole("slider", { name: "Answer top" }), w * a + t.d);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^That multiplies the whole by the top/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer top" }), t.n);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/overflowBars.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.n}/${t.d} = ${w} ${a}/${t.d}`))).toBeVisible();
});
