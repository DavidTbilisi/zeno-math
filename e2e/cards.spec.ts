// Playing cards: a whole deck drawn without putting back counts exactly the deck's share; P(king | face card) is 4 of
// 12 and P(king | red) shows independence; the two-ace tree gives 1/221 (1/169 with the first card back); samples of
// four cards give the theory's spread.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("playing cards: draw and count, given that, two cards, sample means", async ({ page }) => {
  const piece = await boardWith(page, "Playing cards: chance and statistics", ".live-cards");
  await expect(piece).toContainText("Cards drawn: 0");
  await expect(piece).toContainText("♥: the deck's share is 13/52 = 1/4");
  await expect(piece).toContainText("Each card goes back, so the next is ♥ with chance 13/52 = 1/4, every time.");

  // Kept out: 52 cards are the whole deck, so each suit has come up exactly 13 times.
  await piece.getByRole("button", { name: "Put each card back" }).click();
  for (let i = 0; i < 5; i++) await piece.getByRole("button", { name: "×10", exact: true }).click();
  await expect(piece).toContainText("2 left");
  await piece.getByRole("button", { name: /Draw a card/ }).click();
  await piece.getByRole("button", { name: /Draw a card/ }).click();
  await expect(piece).toContainText("Cards drawn: 52");
  await expect(piece).toContainText("♥: 13 of 52 = 0.250");
  await expect(piece).toContainText("A whole deck drawn: every count is exactly the deck's.");
  await expect(piece).toContainText("The deck is used up; shuffled full again, the next is ♥ with chance 13/52 = 1/4.");
  await expect(piece.getByRole("img", { name: /^(A|[2-9]|10|J|Q|K)[♠♥♦♣]$/ })).toHaveCount(6);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-draw.png` });

  await piece.getByRole("button", { name: "Given that…" }).click();
  await expect(piece).toContainText("P(A) = 4/52 = 1/13: 4 of the 52 cards.");
  await expect(piece).toContainText("Given B, only 12 cards are left; 4 of them are A: P(A | B) = 4/12 = 1/3.");
  await expect(piece).toContainText("Knowing B makes A more likely.");
  await expect(piece.getByRole("img", { name: /^(A|[2-9]|10|J|Q|K)[♠♥♦♣]$/ })).toHaveCount(52);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-given.png` });
  await piece.getByRole("combobox", { name: "given B:" }).selectOption("red");
  await expect(piece).toContainText("P(A | B) = 2/26 = 1/13");
  await expect(piece).toContainText("A and B are independent.");

  await piece.getByRole("button", { name: "Two cards" }).click();
  await expect(piece).toContainText("P(A, then B) = 4/52 × 3/51 = 12/2652 = 1/221");
  await expect(piece).toContainText("P(B second) = 1/13: the same as for the first card.");
  await piece.getByRole("button", { name: "×1000", exact: true }).click();
  await expect(piece).toContainText("Pairs drawn: 1,000");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-two.png` });
  await piece.getByRole("button", { name: "Put the first card back" }).click();
  await expect(piece).toContainText("P(A, then B) = 4/52 × 4/52 = 16/2704 = 1/169");
  await expect(piece).toContainText("Pairs drawn: 0");

  await piece.getByRole("button", { name: "Sample means" }).click();
  await expect(piece).toContainText("Theory for samples of 4: σ/√n × √((52 − n)/51) = 1.81");
  await piece.getByRole("button", { name: "×1000", exact: true }).click();
  await expect(piece).toContainText("Samples of 4 cards: 1,000");
  await expect(piece).toContainText("Your sample means: mean");
  await expect(piece.getByRole("img", { name: /^(A|[2-9]|10|J|Q|K)[♠♥♦♣]$/ })).toHaveCount(4);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-means.png` });
  await piece.getByRole("button", { name: "One card more" }).click();
  await expect(piece).toContainText("Samples of 5 cards: 0");
});
