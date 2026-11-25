// Quadratic graphs: six strips laid and the corner filled make (x + 3)² − 4; in practice the square added instead of
// taken is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.completeSquare;
const w = en.pracWords;

test("make it a square: the strips on two sides leave a corner of 9, and x² + 6x + 5 = (x + 3)² − 4", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveCompleteSquare, ".live-completeSquare");
  await expect(g.getByRole("group", { name: /^x² \+ 6x \+ 5 as tiles/ })).toBeVisible();
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await g.getByRole("button", { name: W.strip }).first().click({ timeout: 1000 });
    await expect(g.getByRole("group", { name: /^1 of 6 strips laid/ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let i = 1; i < 6; i++) await g.getByRole("button", { name: W.strip }).first().click();
  await expect(g.getByRole("group", { name: /missing its corner: 3 × 3 = 9/ })).toBeVisible();
  await g.getByRole("button", { name: W.corner }).click();
  await expect(g.getByRole("group", { name: /= \(x \+ 3\)² − 4\. .* the least value is −4, at x = −3/ })).toBeVisible();
});

test("quadratic graphs in practice: the square added instead of taken away is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("quadraticGraph", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "kAddsSquare")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("quadraticGraph", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "kAddsSquare")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.quadraticGraph, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/brings in \d+ that were not there/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
