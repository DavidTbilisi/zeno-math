// Spread: on the piece a miss says how many cards it leaves on each side, and the right taps give the median, the
// quartiles and a box plot; in practice the range given for the IQR is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("split the row: a miss counts each side, then the median, the quartiles and the box", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveBoxSplit, ".live-boxSplit");
  await expect(g.getByText(/^Tap where the row splits/)).toBeVisible();
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await g.getByRole("button", { name: "Card 4: 6" }).click({ timeout: 1000 });
    await expect(g.getByText("That leaves 3 on the left and 7 on the right: not halves yet.")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await g.getByRole("button", { name: "Card 6: 8" }).click();
  await expect(g.getByText(/^The median is 8: 5 cards on each side of it/)).toBeVisible();
  await g.getByRole("button", { name: "Card 3: 4" }).click();
  await g.getByRole("button", { name: "Card 9: 12" }).click();
  await expect(g.getByText("IQR = 8")).toBeVisible();
  await expect(g.getByText(/^Q1 = 4, median 8, Q3 = 12: four parts, 2 cards in each/)).toBeVisible();
});

test("spread in practice: the range for the IQR is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("spread", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "iqrAsRange") && ex.prompt.startsWith("Find the interquartile")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("spread", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "iqrAsRange")!;
  await practise(page, request, { tab: en.practiceData, skill: w.skills.spread, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/is the range, the largest minus the smallest/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
