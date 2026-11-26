// Accumulation: four left-end rectangles fall short of the area and four right-end ones overshoot it; in practice
// the width of each rectangle forgotten is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.fillUnder;
const w = en.pracWords;

test("fill under the curve: left ends fall short, right ends overshoot, more rectangles close in", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveFillUnder, ".live-fillUnder");
  await expect(g.getByRole("group", { name: /^4 rectangles, each 1 wide, add to 7\.5; the true area is 9\.33\. Too little, by 1\.83\./ })).toBeVisible();
  await g.getByRole("button", { name: W.right }).click();
  await expect(g.getByRole("group", { name: /add to 11\.5; the true area is 9\.33\. Too much, by 2\.17\./ })).toBeVisible();
  const n = g.getByRole("slider", { name: W.nLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await n.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(n).toHaveAttribute("aria-valuenow", "5", { timeout: 1000 });
  }).toPass();
  await expect(g.getByRole("group", { name: /^5 rectangles, each 0\.8 wide, add to 11\.04; .* Too much, by 1\.71\./ })).toBeVisible();
});

test("accumulation in practice: the rectangles' width forgotten is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("accumulation", 1, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "widthForgotten")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("accumulation", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "widthForgotten")!;
  await practise(page, request, { tab: en.practiceCalculus, skill: w.skills.accumulation, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/multiply the heights by 2/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
