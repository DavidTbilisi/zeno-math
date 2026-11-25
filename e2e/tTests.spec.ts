// t against the normal: dragging the sample size to thirty brings t* close to 1.96; in practice s divided by n is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.tTails;
const w = en.pracWords;

test("fat tails: a small sample's t cut lies far out, and by thirty t and z nearly agree", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveTTails, ".live-tTails");
  await expect(g.getByText(/^With n = 4, s is a rough guess/)).toBeVisible();
  const n = g.getByRole("slider", { name: W.nLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await n.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(n).toHaveAttribute("aria-valuenow", "5", { timeout: 1000 });
  }).toPass();
  for (let i = 5; i < 30; i++) await page.keyboard.press("ArrowRight");
  await expect(n).toHaveAttribute("aria-valuenow", "30");
  await expect(g.getByText(/^With n = 30, t\* = 2\.045 is close to 1\.96/)).toBeVisible();
});

test("t tests in practice: s divided by n instead of its square root is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("tTests", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "seDividedByN")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("tTests", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "seDividedByN")!;
  await practise(page, request, { tab: en.practiceData, skill: w.skills.tTests, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(Math.round(slip.a.v * 100) / 100) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/divides s by √n, not by n/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
