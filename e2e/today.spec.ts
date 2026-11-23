// Today (#585): one session from the learner's own state, in the order of the four learning stages, ticked as each
// part is opened, ending with what moved. By keyboard, at phone width.
import { expect, test } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR;
const DAY = 86_400_000;

test("a learner with a review due, a green and a gold skill gets all four parts, and the end shows what moved", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const now = Date.now();
  const run = { seen: 3, right: 3, run: 3 };
  const progress = {
    stats: {}, mistakes: [], answered: 60,
    cells: { "times.1": run, "times.2": run, "times.3": run, "fractions.1": run, "fractions.2": run, "fractions.3": run, "integers.1": run },
    spacing: { "integers.1": { step: 0, due: now - DAY } },
    stages: { times: { stage: 3 }, fractions: { stage: 2 }, integers: { stage: 1 } },
  };
  await page.addInitScript((p) => localStorage.getItem("zeno.practice.v1") || localStorage.setItem("zeno.practice.v1", p), JSON.stringify(progress));
  await page.goto("/#/");
  await page.getByRole("link", { name: "Today", exact: true }).first().click();
  await expect(page).toHaveURL(/#\/today$/);
  const parts = page.locator(".today-part");
  await expect(parts).toHaveCount(4);
  await expect(parts.nth(0)).toContainText("Review");
  await expect(parts.nth(0)).toContainText("starting with its idea card");
  await expect(parts.nth(1)).toContainText("A new idea");
  await expect(parts.nth(2)).toContainText("Drill");
  await expect(parts.nth(2)).toContainText("level 3");
  await expect(parts.nth(3)).toContainText("A problem");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/today.png`, fullPage: true });

  // By keyboard: the review opens practice on its level, and coming back it is ticked.
  await parts.nth(0).getByRole("link", { name: "Start" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/practice\/integers\.1$/);
  // A review gone right moves integers on to "I keep it".
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("zeno.practice.v1")!);
    p.stages.integers = { stage: 2 };
    localStorage.setItem("zeno.practice.v1", JSON.stringify(p));
  });
  await page.goto("/#/today");
  await expect(parts.nth(0)).toHaveClass(/done/);
  await expect(page.locator(".today-part")).toHaveCount(4);
  await page.getByRole("button", { name: "End the session" }).click();
  const moved = page.locator(".today-moved");
  await expect(moved).toContainText("What moved");
  await expect(moved.locator("li.up")).toHaveCount(1);
  await expect(moved.locator("li.up")).toContainText("from Learning stage 1 of 4: I get it to Learning stage 2 of 4: I keep it");
  if (SHOTS) await moved.screenshot({ path: `${SHOTS}/today-moved.png` });
});

test("an empty learner gets just the course's first new idea", async ({ page }) => {
  await page.goto("/#/today");
  await expect(page.locator(".today-part")).toHaveCount(1);
  await expect(page.locator(".today-part")).toContainText("A new idea");
});
