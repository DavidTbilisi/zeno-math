// Equations with roots: squaring √(x + 2) = x − 4 gives 7 and 2, and checking shows 2 does not fit; in practice the
// answer that does not fit kept is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("square and check: x = 2 lies on the mirror and does not fit, x = 7 does", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveSquareCheck, ".live-squareCheck");
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await g.getByRole("button", { name: "Square both sides of √(x + 2) = x − 4" }).click({ timeout: 1000 });
    await expect(g.getByRole("group", { name: /^Squared: x \+ 2 = \(x − 4\)², with answers x = 7 and x = 2/ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await g.getByRole("button", { name: "The crossing at x = 2" }).click();
  await expect(g.getByRole("group", { name: /^x = 2: √\(2 \+ 2\) = 2 but 2 − 4 = −2\. It does not fit/ })).toBeVisible();
  await g.getByRole("button", { name: "The crossing at x = 7" }).click();
  await expect(g.getByRole("group", { name: /It fits\. Only x = 7 solves it/ })).toBeVisible();
});

test("equations with roots in practice: the answer that does not fit kept is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("rootEquations", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "extraneousKept")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("rootEquations", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "extraneousKept")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.rootEquations, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/a root is never negative/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
