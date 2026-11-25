// Two-way tables: on the piece one count is three shares, and Year 8's numbers changed until the rows split alike
// show no association; in practice the column's total used for a row's share is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("out of what: one count, three shares, and rows that split alike", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveTableShares, ".live-tableShares");
  await expect(g.getByText(/^The same 12 is 40% of its row, 54.5% of its column and 17.1% of everyone/)).toBeVisible();
  // Year 8, no sport: 30 down to 15 makes Year 8's share 10 of 25 = 40%, the same as Year 7's.
  const none = g.getByRole("slider", { name: /^Year 8, No sport/ });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await none.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowDown");
    await expect(none).toHaveAttribute("aria-valuenow", "29", { timeout: 1000 });
  }).toPass();
  for (let i = 0; i < 14; i++) await page.keyboard.press("ArrowDown");
  await expect(none).toHaveAttribute("aria-valuenow", "15");
  await expect(g.getByText(/No association/)).toBeVisible();
});

test("two-way tables in practice: the column's total for a row's share is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("twoWay", 2, seedOf(k / 100), w);
    if (ex.answer.traps?.some((t) => t.id === "shareOfColumn") && ex.prompt.endsWith("play a sport?") && !ex.prompt.includes("who play")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("twoWay", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "shareOfColumn")!;
  await practise(page, request, { tab: en.practiceData, skill: w.skills.twoWay, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? slip.a.v.toFixed(2) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/That is out of the Sport column/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
