// Parametric curves: at t = 1 the ball rises with slope 1, at t = 2 its arrow is flat at the top; in practice
// dy/dx turned upside down is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.tracePath;
const w = en.pracWords;

test("trace the path: the ball's slope is 1 at t = 1 and 0 at its top", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveTracePath, ".live-tracePath");
  await expect(g.getByRole("group", { name: /^t = 1: the point is at \(−2, 3\)\. .*the slope is dy\/dx = 2 ÷ 2 = 1\./ })).toBeVisible();
  const t = g.getByRole("slider", { name: W.tLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await t.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(t).toHaveAttribute("aria-valuenow", "5", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByRole("group", { name: /^t = 2: the point is at \(0, 4\)\. .*At the top the arrow is flat/ })).toBeVisible();
});

test("parametric curves in practice: dy/dx upside down is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("parametric", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "dydxUpsideDown")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("parametric", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "dydxUpsideDown")!;
  await practise(page, request, { tab: en.practiceCalculus, skill: w.skills.parametric, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/the rise over the run/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
