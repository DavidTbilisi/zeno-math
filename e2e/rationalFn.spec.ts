// Rational functions: walking x to 1.1 sends y off the picture and to 1 finds no value; in practice a hole read as
// y = 0 is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.asymptoteWalk;
const w = en.pracWords;

test("walk to the wall: near x = 1 the bottom is tiny and y huge; at x = 1 there is no value", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveAsymptoteWalk, ".live-asymptoteWalk");
  await expect(g.getByRole("group", { name: /^x = 3: the top is 7 and the bottom 2, so y = 3\.5/ })).toBeVisible();
  const x = g.getByRole("slider", { name: W.xLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await x.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowLeft");
    await expect(x).toHaveAttribute("aria-valuenow", "29", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 18; i++) await page.keyboard.press("ArrowLeft");
  await expect(g.getByRole("group", { name: /^x = 1\.1: the top is 3\.2 but the bottom only 0\.1, so y = 32\./ })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(g.getByRole("group", { name: /^x = 1: the bottom is 0 but the top is 3, so y has no value/ })).toBeVisible();
});

test("rational functions in practice: a hole read as y = 0 is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("rationalFn", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "holeAsZero")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("rationalFn", 2, seedOf(r), w);
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.rationalFn, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill("0");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/cancel the common factor/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
