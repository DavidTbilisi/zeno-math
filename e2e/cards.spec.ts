// Playing cards by hand: the deck held without putting back deals itself out, the whole deck counting exactly the deck's
// share, and the cards dragged back onto it start again; P(king | face card) is 4 of 12 and P(king | red), turned on
// the wheel, shows independence; the two-ace tree gives 1/221 (1/169 with the first card back); samples of four cards
// give the theory's spread, and the size wheel turned up starts again.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;
const CARD = /^(A|[2-9]|10|J|Q|K)[♠♥♦♣]$/;

const mid = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/** Holds the pointer down on `l` until `done` holds. */
async function hold(page: Page, l: Locator, done: () => Promise<unknown>) {
  const p = await mid(l);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await done();
  await page.mouse.up();
}
async function drag(page: Page, from: Locator, to: Locator) {
  const [a, b] = [await mid(from), await mid(to)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

test("playing cards by hand: deal, gather, wheels, two cards, sample means", async ({ page }) => {
  const piece = await boardWith(page, "Playing cards: chance and statistics", ".live-cards");
  const deck = piece.getByRole("button", { name: /^The deck:/ });
  await expect(piece).toContainText("Cards drawn: 0");
  await expect(piece).toContainText("♥: the deck's share is 13/52 = 1/4");
  await expect(piece).toContainText("Each card goes back, so the next is ♥ with chance 13/52 = 1/4, every time.");

  // Kept out: held, the deck deals itself out and stops; 52 cards are the whole deck, so each suit came up 13 times.
  await piece.getByRole("button", { name: "Put each card back" }).click();
  await deck.click();
  await expect(piece).toContainText("Cards drawn: 1");
  await hold(page, deck, () => expect(piece).toContainText("0 left", { timeout: 10000 }));
  await expect(piece).toContainText("Cards drawn: 52");
  await expect(piece).toContainText("♥: 13 of 52 = 0.250");
  await expect(piece).toContainText("A whole deck drawn: every count is exactly the deck's.");
  await expect(piece).toContainText("The deck is used up; shuffled full again, the next is ♥ with chance 13/52 = 1/4.");
  await expect(piece.getByRole("img", { name: CARD })).toHaveCount(6);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-draw.png` });
  // Dragged back onto the deck, the cards are shuffled in.
  await drag(page, piece.getByRole("button", { name: /^The cards drawn:/ }).getByRole("img").last(), deck);
  await expect(piece).toContainText("Cards drawn: 0");
  await expect(piece).toContainText("52 left");

  await piece.getByRole("button", { name: "Given that…" }).click();
  await expect(piece).toContainText("P(A) = 4/52 = 1/13: 4 of the 52 cards.");
  await expect(piece).toContainText("Given B, only 12 cards are left; 4 of them are A: P(A | B) = 4/12 = 1/3.");
  await expect(piece).toContainText("Knowing B makes A more likely.");
  await expect(piece.getByRole("img", { name: CARD })).toHaveCount(52);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-given.png` });
  // The B wheel turned back from "a face card" to "a red card".
  const wheelB = piece.getByRole("slider", { name: "given B:" });
  for (let i = 0; i < 4; i++) await wheelB.press("ArrowDown");
  await expect(wheelB).toHaveAttribute("aria-valuetext", "a red card");
  await expect(piece).toContainText("P(A | B) = 2/26 = 1/13");
  await expect(piece).toContainText("A and B are independent.");

  await piece.getByRole("button", { name: "Two cards" }).click();
  await expect(piece).toContainText("P(A, then B) = 4/52 × 3/51 = 12/2652 = 1/221");
  await expect(piece).toContainText("P(B second) = 1/13: the same as for the first card.");
  await deck.click();
  await expect(piece).toContainText("Pairs drawn: 1");
  await expect(piece.getByRole("img", { name: CARD })).toHaveCount(2);
  await hold(page, deck, () => expect.poll(async () => Number((await piece.textContent())!.match(/Pairs drawn: ([\d,]+)/)![1].replace(/,/g, "")), { timeout: 10000 }).toBeGreaterThan(1000));
  await expect(piece).toContainText("A, then B:");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-two.png` });
  await piece.getByRole("button", { name: "Put the first card back" }).click();
  await expect(piece).toContainText("P(A, then B) = 4/52 × 4/52 = 16/2704 = 1/169");
  await expect(piece).toContainText("Pairs drawn: 0");

  await piece.getByRole("button", { name: "Sample means" }).click();
  await expect(piece).toContainText("Theory for samples of 4: σ/√n × √((52 − n)/51) = 1.81");
  await hold(page, deck, () => expect(piece).toContainText(/Samples of 4 cards: \d{1,3},\d{3}/, { timeout: 10000 }));
  await expect(piece).toContainText("Your sample means: mean");
  await expect(piece.getByRole("img", { name: CARD })).toHaveCount(4);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/cards-means.png` });
  await piece.getByRole("slider", { name: "Cards in a sample" }).press("ArrowUp");
  await expect(piece).toContainText("Samples of 5 cards: 0");
});
