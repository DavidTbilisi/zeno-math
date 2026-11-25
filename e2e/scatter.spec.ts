// Scatter plots: on the piece the ends moved by key until the squares are the least they can be give the line of best
// fit; in practice the intercept left out of a prediction is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { bestLine, FIT_SETS } from "../src/math/scatterFit.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.fitLine;
const w = en.pracWords;

test("squares on the residuals: the line that makes them least is the line of best fit", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveFitLine, ".live-fitLine");
  await expect(g.getByText(/^Drag the two orange ends/)).toBeVisible();
  const b = bestLine(FIT_SETS[0]);
  const want = [Math.round(b.c * 10) / 10, Math.round((b.c + 10 * b.m) * 10) / 10];
  const ends = [g.getByRole("slider", { name: W.leftEnd }), g.getByRole("slider", { name: W.rightEnd })];
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await ends[0].focus({ timeout: 1000 });
    await page.keyboard.press("ArrowUp");
    await expect(ends[0]).toHaveAttribute("aria-valuenow", "2.1", { timeout: 1000 });
  }).toPass();
  for (const [i, end] of ends.entries()) {
    await end.focus();
    const now = Number(await end.getAttribute("aria-valuenow"));
    const steps = Math.round((want[i] - now) * 10);
    for (let k = 0; k < Math.abs(steps); k++) await page.keyboard.press(steps > 0 ? "ArrowUp" : "ArrowDown");
    await expect(end).toHaveAttribute("aria-valuenow", String(want[i]));
  }
  await expect(g.getByText(/^That is the line of best fit/)).toBeVisible();
});

test("scatter plots in practice: the intercept left out of a prediction is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("scatter", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "predictNoIntercept")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("scatter", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "predictNoIntercept")!;
  await practise(page, request, { tab: en.practiceData, skill: w.skills.scatter, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/is only the rise from x = 0/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
