// The mean as the balance point (#736): a point too far right tips the beam, the middle dot and the point halfway
// between the ends are named when they don't balance, and the beam is level only at the mean, where the distances on
// each side add up the same; the last round says the rule.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("the mean balances: the distances below add up to the distances above", async ({ page }) => {
  const piece = await boardWith(page, "Mean: find where the dots balance", ".live-meanBalance");
  const pic = piece.locator("svg").first();
  const at = (p: number) => pic.getByRole("button", { name: `balance point at ${p}`, exact: true });
  const say = pic.locator("[data-say]");
  const ask = pic.locator("[data-ask]");
  const next = () => pic.getByRole("button", { name: "Next" }).click();

  await expect(ask).toContainText("Where does the beam balance?");
  await at(7).click();
  await expect(say).toContainText("The left side pulls harder, 5 against 1");
  await at(5).focus();
  await page.keyboard.press("Enter");
  await expect(say).toContainText("(2 + 8) ÷ 2 = 5");

  await next();
  await at(2).click();
  await expect(say).toContainText("the middle dot, the median");
  await at(5).click();
  await expect(say).toContainText("halfway between the end dots");
  await at(4).click();
  await expect(pic.locator("[data-pulls]")).toContainText("3 + 2 = 5");
  await expect(say).toContainText("the far 9 pulls hard");

  for (const p of [4, 5]) {
    await next();
    await at(p).click();
  }
  await expect(say).toContainText("pulls the mean down");
  await next();
  await at(5).click();
  await expect(say).toContainText("the distances below it add up to the distances above it");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/meanBalance-level.png` });
  await next();
  await expect(ask).toContainText("All rounds done");
});
