// A plateau in free practice (#580): a kept skill whose last days on its hardest level were no faster than the days
// before is offered a stretch, the hardest level against the learner's own best day; "Not now" puts it off.
import { expect, test } from "@playwright/test";
import { pickTopic } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;

test("a kept skill that stopped getting faster is offered a stretch against the best day", async ({ page }) => {
  // Six days on fractions' hardest level, about seven seconds a question each day, after the skill was kept.
  const sessions = [8, 6, 7, 6, 7, 7].map((s, i) => ({ day: `2026-11-0${i + 1}`, times: [Math.log(s), Math.log(s)] }));
  const progress = { stats: {}, mistakes: [], answered: 40, stages: { fractions: { stage: 2 } }, plateaus: { fractions: { sessions } } };
  await page.addInitScript((p) => localStorage.setItem("zeno.practice.v1", p), JSON.stringify(progress));
  await page.goto("/#/practice");
  await page.getByRole("radio", { name: "easy" }).click();
  await pickTopic(page, "Fractions");
  const offer = page.locator(".practice-stretch");
  await expect(offer).toContainText("Fractions: you have stopped getting faster");
  await expect(offer).toContainText("beat your best day, 6 s a question");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/plateau-offer.png` });

  // Taken up: the hardest level, with the best day as the target.
  await offer.getByRole("button", { name: "Stretch" }).click();
  await expect(page.getByText("⏱ Beat your best: 6 s a question")).toBeVisible();
  await expect(page.getByRole("radio", { name: "hard" })).toBeChecked();
});

test("Not now puts the offer off for the visit", async ({ page }) => {
  const sessions = [8, 6, 7, 6, 7, 7].map((s, i) => ({ day: `2026-11-0${i + 1}`, times: [Math.log(s), Math.log(s)] }));
  await page.addInitScript((p) => localStorage.setItem("zeno.practice.v1", p),
    JSON.stringify({ stats: {}, mistakes: [], answered: 40, stages: { fractions: { stage: 2 } }, plateaus: { fractions: { sessions } } }));
  await page.goto("/#/practice");
  await page.getByRole("radio", { name: "easy" }).click();
  await pickTopic(page, "Fractions");
  await page.locator(".practice-stretch").getByRole("button", { name: "Not now" }).click();
  await expect(page.locator(".practice-stretch")).toHaveCount(0);
});
