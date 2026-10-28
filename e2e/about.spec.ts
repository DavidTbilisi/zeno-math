// The front page for schools: reached from the home page, its question closes half of the gap on each right answer,
// leaves the gap where it was on a wrong one, and calls the skill mastered past 0.95.
import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const a = en.about;

/** Answers the question on show, rightly or not. */
async function answer(page: Page, right: boolean) {
  const [x, y] = (await page.locator(".z-ask-q span").first().innerText()).match(/\d+/g)!.map(Number);
  await page.getByLabel(a.answer).fill(String(right ? x * y : x * y + 1));
  await page.getByRole("button", { name: a.check }).click();
}

test("each right answer covers half of what's left, and past 0.95 the skill is mastered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: en.aboutLink }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(a.title);
  const line = page.getByRole("img", { name: /of the way to 1/ });

  await answer(page, true);
  await expect(page.getByText(a.right)).toBeVisible();
  await expect(line).toHaveAccessibleName("1/2 of the way to 1");
  await answer(page, false);
  await expect(page.getByText(/Not yet: \d+ × \d+ = \d+\. The gap stays where it was\./)).toBeVisible();
  await expect(line).toHaveAccessibleName("1/2 of the way to 1");

  // 1 − 2⁻⁴ = 0.9375 is short of the line; 1 − 2⁻⁵ = 0.96875 is past it.
  for (let i = 0; i < 3; i++) await answer(page, true);
  await expect(page.getByText(a.masteredTitle, { exact: true })).toHaveCount(0);
  await answer(page, true);
  await expect(page.getByText(a.masteredTitle, { exact: true })).toBeVisible();
  await expect(line).toHaveAccessibleName("31/32 of the way to 1");

  await page.getByRole("button", { name: a.again }).click();
  await expect(line).toHaveAccessibleName("0/1 of the way to 1");
  await expect(page.getByLabel(a.answer)).toBeFocused();
});
