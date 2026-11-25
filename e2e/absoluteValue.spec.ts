// Absolute value: the piece keeps both answers of |x − 3| = 4 and then shades between them; in practice one answer of
// |x − a| = b is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.absLine;
const w = en.pracWords;

test("both ways from a: |x − 3| = 4 has two answers", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveAbsLine, ".live-absLine");
  const pt = g.getByRole("slider", { name: W.pointName });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await pt.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(pt).toHaveAttribute("aria-valuenow", "1", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await expect(g.getByText(/^7 is 4 away from 3/)).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowLeft");
  await expect(g.getByText(/^Two answers, −1 and 7/)).toBeVisible();
});

test("absolute value in practice: one answer only is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("absoluteValue", 2, seedOf(k / 100), w).answer.traps?.some((t) => t.id === "absOneRoot")) {
      r = k / 100;
      break;
    }
  const ex = exercise("absoluteValue", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "absOneRoot")!;
  await practise(page, request, { tab: "Algebra", skill: w.skills.absoluteValue, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "set" ? String(slip.a.vs[0]) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("There are two")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
