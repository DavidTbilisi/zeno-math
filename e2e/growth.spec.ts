// Growth rates and big-O (#460) in practice: the slip in a loop's order is named, then the right order is correct.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { practise, seedOf } from "./helpers.ts";

const w = en.pracWords;
const NAMED: Record<string, string> = { loopsMultiplied: "These loops come one after the other", logAsN: "Halving reaches 1 after about" };

test("growth: a loop's slip is named, then its order is correct (#460)", async ({ page, request }) => {
  const r = 0.01;
  const ex = exercise("growth", 2, seedOf(r), w);
  if (ex.answer.k !== "pick") throw new Error();
  const trap = ex.answer.traps![0]!;
  const options = ex.answer.options;
  await practise(page, request, { tab: "Probability & statistics", skill: w.skills.growth, level: "medium", r, prompt: ex.prompt });
  const picks = page.getByRole("button", { name: options[(trap.a as { right: number }).right]!.text, exact: true });
  await picks.click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(NAMED[trap.id]!)).toBeVisible();
  await page.getByRole("button", { name: options[ex.answer.right]!.text, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
