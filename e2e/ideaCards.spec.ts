// Idea cards (#579): a topic page shows its ideas' cards under the intro, one at a time by its sign, at phone width too;
// and a spaced review due on a skill made of ideas opens with the card of the weakest idea, one corner covered, filled
// by keyboard from three choices, before the review question is asked as before. The pick moves nothing.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { coveredCard, IDEA_CARDS } from "../src/model/ideaCards.ts";
import { seedOf } from "./helpers.ts";

const c = en.cards;
const SHOTS = process.env.IDEA_CARD_SHOTS;

test("a topic page shows its ideas' cards under the intro, one by its sign", async ({ page }) => {
  await page.goto("/#/learn/fractions");
  const section = page.getByRole("region", { name: c.title });
  await expect(section).toBeVisible();
  // Right under the intro.
  await expect(page.locator(".explainer + .idea-cards")).toHaveCount(1);
  const card = section.locator(".idea-card");
  await expect(card.getByRole("heading")).toHaveText(en.pracWords.ideas.part);
  await expect(card.locator(".ic-corner")).toHaveText([
    `${c.corners.glyph}${IDEA_CARDS.part.glyph}`,
    `${c.corners.essence}${c.ideas.part.essence}`,
    `${c.corners.like}${c.ideas.part.like}${c.ideas.part.test}`,
    `${c.corners.failure}${c.ideas.part.failure}`,
  ]);
  // Another sign by the keyboard: its card, with its look-alike's sign beside the name.
  const pick = section.getByRole("button", { name: en.pracWords.ideas.divide });
  await pick.focus();
  await page.keyboard.press("Enter");
  await expect(pick).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("heading")).toHaveText(en.pracWords.ideas.divide);
  await expect(card.locator(".ic-essence")).toContainText(c.ideas.divide.essence);
  await expect(card.locator(".ic-like-glyph")).toHaveText(IDEA_CARDS.multiply.glyph);
  await expect(card.locator(".ic-failure")).toContainText(c.ideas.divide.failure);
  if (SHOTS) await section.screenshot({ path: `${SHOTS}/topic-desktop.png` });
  // A topic without ideas in the graphs has no cards.
  await page.goto("/#/learn/geometry");
  await expect(page.getByRole("heading", { name: en.site.explain.useHead })).toBeVisible();
  await expect(page.locator(".idea-cards")).toHaveCount(0);

  // At phone width the corners stack and nothing runs off the page.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/learn/numbers");
  await expect(page.getByRole("region", { name: c.title }).locator(".idea-card")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (SHOTS) await page.getByRole("region", { name: c.title }).screenshot({ path: `${SHOTS}/topic-phone.png` });
});

test("a due review on a skill made of ideas opens with its weakest idea's card, one corner covered; then the review as before", async ({ page }) => {
  const r = 0.3;
  const due = Date.now() - 1000;
  // Fractions level 1 was made secure days ago and its review is due; dividing is the idea least likely known.
  await page.addInitScript(
    ([x, at]) => {
      Math.random = () => x;
      localStorage.setItem("zeno.practice.v1", JSON.stringify({
        stats: {}, mistakes: [], answered: 3, spacing: { "fractions.1": { step: 0, due: at } }, ideas: { divide: 0.1 },
      }));
    },
    [r, due] as const,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/practice");
  const want = coveredCard("fractions", "divide", () => r);
  const corner = c.corners[want.corner];
  await expect(page.locator(".practice-review")).toHaveText(`↻ ${en.pracWords.ui.spaced}`);
  const review = page.getByRole("region", { name: c.reviewHead });
  await expect(review.getByRole("heading")).toHaveText(en.pracWords.ideas.divide);
  await expect(review.locator(".ic-corner.covered")).toHaveCount(1);
  await expect(review.locator(".ic-corner.covered")).toHaveAttribute("aria-label", corner);
  await expect(review.getByText(c.reviewAsk.replace("{corner}", corner))).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
  const text = (id: keyof typeof IDEA_CARDS) => (want.corner === "glyph" ? IDEA_CARDS[id].glyph : c.ideas[id][want.corner]);
  await expect(review.locator(".ic-choice")).toHaveText(want.choices.map(text));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (SHOTS) await review.screenshot({ path: `${SHOTS}/review-phone.png` });

  // The first choice has the focus: Enter picks it, the corner shows, and Enter again goes on.
  await page.keyboard.press("Enter");
  const right = want.choices[0] === "divide";
  await expect(review.getByRole("status")).toHaveText(right ? `✓ ${c.right}` : c.wrong);
  await expect(review.locator(".ic-corner.covered")).toHaveCount(0);
  await expect(review.locator(".ic-choice.right")).toHaveText(text("divide"));
  if (SHOTS) await review.screenshot({ path: `${SHOTS}/review-picked.png` });
  await page.keyboard.press("Enter");

  // The review question, asked as before; the pick moved no idea, and the right answer keeps the level.
  await expect(review).toHaveCount(0);
  const ex = exercise("fractions", 1, seedOf(r), en.pracWords);
  const field = page.getByLabel("Your answer");
  await expect(field).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.practice.v1")!).ideas)).toEqual({ divide: 0.1 });
  await field.fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  const spacing = await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.practice.v1")!).spacing["fractions.1"]);
  expect(spacing.step).toBe(1);
});
