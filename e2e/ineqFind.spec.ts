// Inequalities on a number line by testing points (#723): a tile tapped before both sides and the end are tested is
// met with "test more first"; numbers tapped (and one reached with the keyboard) turn green or red with their
// working; x ≤ 3 for x + 2 < 5 is sent to look at 3 itself, x < −3 for −2x < 6 to look at the green side; the right
// set draws itself on the line, and all four rounds end the ladder.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("inequalities by testing points: the end point, the side, the sign turned round", async ({ page }) => {
  const piece = await boardWith(page, "Inequalities: find the set by testing points", ".live-ineqFind");
  const pic = piece.locator("svg").first();
  const btn = (s: string) => pic.getByRole("button", { name: s, exact: true });
  const say = pic.locator("[data-say]");
  const read = pic.locator("[data-read]");
  const tryAt = async (...xs: string[]) => {
    for (const x of xs) await btn(`test x = ${x}`).click();
  };
  await expect(pic.locator("[data-ask]")).toContainText("Tap numbers on the line to test them");
  await expect(pic.locator("[data-eq]")).toHaveText("x + 2 < 5");

  await btn("x < 3").click();
  await expect(say).toContainText("Test more numbers first");
  await tryAt("0");
  await expect(read).toHaveText("x = 0: 0 + 2 = 2, and 2 < 5 is true.");
  await expect(pic.locator('[data-tested="0"]')).toHaveAttribute("data-holds", "yes");
  await tryAt("5");
  await btn("test x = 3").focus();
  await page.keyboard.press("Enter");
  await expect(read).toHaveText("x = 3: 3 + 2 = 5, and 5 < 5 is false.");
  await btn("x ≤ 3").click();
  await expect(say).toContainText("Look at 3 itself: it is red");
  await btn("x < 3").click();
  await expect(say).toContainText("< leaves the end out");
  await expect(pic.locator("[data-set]")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ineqFind-strict.png` });

  await btn("Next").click();
  await expect(pic.locator("[data-eq]")).toHaveText("x − 1 ≥ 2");
  await tryAt("0", "3", "5");
  await btn("x > 3").click();
  await expect(say).toContainText("Look at 3 itself: it is green");
  await btn("x ≥ 3").click();
  await expect(say).toContainText("≥ takes the end in");

  await btn("Next").click();
  await expect(pic.locator("[data-eq]")).toHaveText("−2x < 6");
  await tryAt("−5", "0", "−3");
  await expect(read).toHaveText("x = −3: −2 × (−3) = 6, and 6 < 6 is false.");
  await btn("x < −3").click();
  await expect(say).toContainText("on the right, the larger side");
  await btn("x > −3").click();
  await expect(say).toContainText("dividing by −2 turns the sign round");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ineqFind-flip.png` });

  await btn("Next").click();
  await expect(pic.locator("[data-eq]")).toHaveText("3 − x ≤ 1");
  await tryAt("0", "2", "5");
  await btn("x ≥ 2").click();
  await expect(say).toContainText("3 − x ≤ 1 holds from 2 upwards");
  await btn("Next").click();
  await expect(pic.locator("[data-ask]")).toHaveText("All rounds done: tap numbers as you like");
});
