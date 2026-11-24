// The front page for schools and universities: at /about of its own, reached from the home page, its question closes half of the gap on each
// right answer, leaves the gap where it was on a wrong one, and calls the skill mastered past 0.95; its fraction sum names the mistake of
// adding across; and the whole path, first steps to university, is on it.
import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const a = en.about;

/** Answers the question on show, rightly or not. */
async function answer(page: Page, right: boolean) {
  const ask = page.locator(".z-ask");
  const [x, y] = (await ask.locator(".z-ask-q span").first().innerText()).match(/\d+/g)!.map(Number);
  await ask.getByLabel(a.answer).fill(String(right ? x * y : x * y + 1));
  await ask.getByRole("button", { name: a.check }).click();
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

test("a sum answered by adding across is told so, a right answer brings another sum", async ({ page }) => {
  await page.goto("/#/about");
  const card = page.locator(".z-try");
  const box = card.getByLabel(a.mistakeAnswer);
  // the tempting answer is already in the box
  await expect(box).toHaveValue("2/5");
  await expect(card.getByText("Many students answer 2/5. Check it.")).toBeVisible();
  await card.getByRole("button", { name: a.check }).click();
  await expect(card.getByText(/^You added the tops and the bottoms\. But 2\/5 is smaller than 1\/2, /)).toBeVisible();

  await box.fill("1/6");
  await card.getByRole("button", { name: a.check }).click();
  await expect(card.getByText("Not yet. Over the same bottom: 3/6 + 2/6 = 5/6.")).toBeVisible();
  await box.fill("5/6");
  await card.getByRole("button", { name: a.check }).click();
  await expect(card.getByText("Right: 1/2 + 1/3 = 5/6.")).toBeVisible();

  await card.getByRole("button", { name: a.mistakeNext }).click();
  await expect(box).toHaveValue("2/6");
  await expect(card.getByText("Many students answer 2/6. Check it.")).toBeVisible();
});

test("the path runs from first steps to university, and the counts are filled in", async ({ page }) => {
  await page.goto("/#/about");
  const path = page.locator(".z-path > li");
  await expect(path).toHaveCount(4);
  await expect(path.first()).toContainText("First steps");
  await expect(path.last()).toContainText("Maths for AI");
  await expect(page.locator(".z-main")).not.toContainText(/\{\w+\}/);
  // each topic of the path leads to its page
  await path.nth(1).getByRole("link", { name: "Trigonometry" }).click();
  await expect(page).toHaveURL(/#\/learn\/trigonometry$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trigonometry");
});

test("the front page has an address of its own, and its links lead into the app", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(a.title);
  await page.getByRole("link", { name: a.tryPractice }).first().click();
  await expect(page).toHaveURL(/\/#\/practice$/);
  await expect(page.getByRole("heading", { name: en.practice, level: 1 })).toBeVisible();
});
