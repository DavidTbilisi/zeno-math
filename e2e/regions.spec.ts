// Inequalities in two variables: on the piece, eight points tested with one on the line show the region; in practice
// solid and dashed swapped is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const w = en.pracWords;

test("test the points: eight tests, one on the line, and the region of y < 2x + 1 shows dashed", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveTestPoints, ".live-testPoints");
  await expect(g.getByText(/^Tap points on the grid to test them in y < 2x \+ 1/)).toBeVisible();
  const grid = g.getByRole("grid");
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await grid.focus({ timeout: 1000 });
    await page.keyboard.press("Enter");
    await expect(g.getByText(/^\(0, 0\): 0 < 1 is true/)).toBeVisible({ timeout: 1000 });
  }).toPass();
  // Up to (0, 1), on the line: 1 < 1 is false.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(g.getByText(/^\(0, 1\): 1 < 1 is false/)).toBeVisible();
  for (const k of ["ArrowUp", "ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown", "ArrowLeft"]) {
    await page.keyboard.press(k);
    await page.keyboard.press("Enter");
  }
  await expect(g.getByRole("group", { name: /so it is drawn dashed/ })).toBeVisible();
});

test("regions in practice: solid and dashed swapped is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("regions", 1, seedOf(k / 100), w);
    if (ex.prompt.startsWith("When ")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("regions", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "lineStyleSwapped")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.regions, level: "easy", r, prompt: ex.prompt });
  const wrong = slip.a.k === "pick" ? slip.a.options[slip.a.right].text : "";
  await page.locator(".sign-picks").getByRole("button", { name: wrong, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/Solid means the line's points count/)).toBeVisible();
  await page.locator(".sign-picks").getByRole("button", { name: ex.plain, exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
