// Integer counters: a + dragged onto a − cancels it; the zero pairs go and leave the value; 2 − (−4) walked through
// puts out zero pairs, takes the − away and ends on 6.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("integer counters: drag to cancel, take the pairs away, walk a subtraction", async ({ page }) => {
  const piece = await boardWith(page, "Integer counters", ".live-counters");
  await expect(piece).toContainText("3 zero pairs cancel: the mat is worth −2");

  // Drag the first + onto a −: the pair cancels, the value stays −2.
  const pic = piece.locator("svg").first();
  const lastMinus = pic.getByRole("button", { name: "A −1 chip" }).last();
  const before = await lastMinus.boundingBox();
  const plus = (await pic.getByRole("button", { name: "A +1 chip" }).first().boundingBox())!;
  const minus = (await pic.getByRole("button", { name: "A −1 chip" }).nth(2).boundingBox())!;
  await page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2);
  await page.mouse.down();
  await page.mouse.move(minus.x + minus.width / 2, minus.y + minus.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(piece).toContainText("2 zero pairs cancel: the mat is worth −2");
  // The chips left hold their places: the last − has not moved.
  expect(await lastMinus.boundingBox()).toEqual(before);

  await piece.getByRole("button", { name: "Take away zero pairs" }).click();
  await expect(piece).toContainText("The mat is worth −2");

  // 2 − (−4): a from 3 to 2, subtract, b from −5 to −4.
  await piece.getByRole("button", { name: "One less" }).first().click();
  await piece.getByRole("button", { name: "Subtract" }).click();
  await piece.getByRole("button", { name: "One more" }).nth(1).click();
  await piece.getByRole("button", { name: "Show it" }).click();
  await expect(piece).toContainText("2 − (−4)");
  await expect(piece).toContainText("Start with 2: put out 2 × (+1).");
  await piece.getByRole("button", { name: "Next step" }).click();
  await expect(piece).toContainText("first put out 4 zero pairs");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/counters-pairs.png` });
  await piece.getByRole("button", { name: "Next step" }).click();
  await expect(piece).toContainText("Take away −4: take off 4 × (−1).");
  await piece.getByRole("button", { name: "Next step" }).click();
  await expect(piece).toContainText("2 − (−4) = 6");
  await expect(piece).toContainText("The mat is worth 6");
  await expect(piece.getByRole("button", { name: "Start again" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/counters.png` });
});
