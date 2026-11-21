// Integer counters, worked by hand: a + dragged out of its tray onto a − cancels it, a tap takes a chip off, a chip
// dragged to the bin goes; 2 − (−4) done on the mat is followed step by step and ends on 6.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("integer counters: drag out, cancel, take away, do a subtraction on the mat", async ({ page }) => {
  const piece = await boardWith(page, "Integer counters", ".live-counters");
  await expect(piece).toContainText("3 zero pairs cancel: the mat is worth −2");
  const pic = piece.locator("svg").first();
  const minus = pic.getByRole("button", { name: "A −1 chip" });
  const plus = pic.getByRole("button", { name: "A +1 chip" });

  // A + out of its tray onto the lone − at the left: the two cancel.
  await drag(page, pic.getByRole("button", { name: "+1 chips" }), minus.first());
  await expect(piece).toContainText("3 zero pairs cancel: the mat is worth −1");
  await expect(minus).toHaveCount(4);

  // A tap takes a + off; a − dragged to the bin goes too.
  await plus.first().click();
  await expect(piece).toContainText("2 zero pairs cancel: the mat is worth −2");
  await drag(page, minus.first(), pic.getByRole("button", { name: /Drop chips here/ }));
  await expect(piece).toContainText("2 zero pairs cancel: the mat is worth −1");

  // 2 − (−4): a down to 2, the sign to subtract, b up to −4.
  await pic.getByRole("slider", { name: /first number/ }).focus();
  await page.keyboard.press("ArrowDown");
  await pic.getByRole("button", { name: /The sum is to add/ }).click();
  await pic.getByRole("slider", { name: /second number/ }).focus();
  await page.keyboard.press("ArrowUp");
  await pic.getByRole("button", { name: /Do it on the mat/ }).click();
  await expect(piece).toContainText("2 − (−4)");
  await expect(piece).toContainText("→ Start with 2: put out 2 × (+1).");
  await expect(plus).toHaveCount(0);

  // Two taps on the + tray do the first step; "Show me" puts out the zero pairs.
  const plusTray = pic.getByRole("button", { name: "+1 chips" });
  await plusTray.click();
  await plusTray.click();
  await expect(piece).toContainText("✓ Start with 2: put out 2 × (+1).");
  await expect(piece).toContainText("first put out 4 zero pairs");
  await pic.getByRole("button", { name: /Do the step asked/ }).click();
  await expect(minus).toHaveCount(4);
  await expect(piece).toContainText("→ Take away −4: take off 4 × (−1).");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/counters-pairs.png` });

  // Take the four − off by hand.
  for (let i = 0; i < 4; i++) await minus.first().click();
  await expect(piece).toContainText("2 − (−4) = 6");
  await expect(piece).toContainText("The mat is worth 6");
  await expect(pic.getByRole("button", { name: /Again/ })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/counters.png` });
});
