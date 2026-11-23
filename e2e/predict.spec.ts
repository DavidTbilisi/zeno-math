// Predict, then reveal (#578): on a topic page the piece asks first, stays still until a guess, plays the change, marks
// the guess and can play it again; the guess is kept for the next visit. By keyboard, at phone width.
import { expect, test } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR;

test("the geometry lab asks about the area first, then shows it stays the same", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/#/learn/geometry");
  const card = page.locator(".predict");
  await expect(card).toContainText("What will happen to the triangle's area?");
  await expect(page.locator(".inline-piece").first()).toHaveAttribute("inert", "");
  if (SHOTS) await card.screenshot({ path: `${SHOTS}/predict-ask.png` });
  // By keyboard: focus the first choice, move to "It stays the same", press it.
  const same = card.getByRole("radio", { name: "It stays the same" });
  await same.focus();
  await page.keyboard.press("Enter");
  await expect(card.locator(".predict-verdict")).toContainText("Right.");
  await expect(card.locator(".predict-verdict")).toContainText("the area stays half of 4 × 3 = 6");
  await expect(page.locator(".inline-piece").first()).not.toHaveAttribute("inert", "");
  await expect(card.getByRole("radio", { name: "It gets bigger" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  if (SHOTS) await page.locator(".site-try").first().screenshot({ path: `${SHOTS}/predict-done.png` });
  // Played again, and kept for the next visit.
  await card.getByRole("button", { name: /Play it again/ }).click();
  await expect(card.locator(".predict-verdict")).toBeVisible();
  await page.reload();
  await expect(page.locator(".predict-verdict")).toContainText("Right.");
  await expect(page.locator(".predict").getByRole("radio", { name: "It stays the same" })).toHaveAttribute("aria-checked", "true");
});

test("a wrong guess on the fraction wall is marked wrong and sent for a signed-in student", async ({ page }) => {
  const sent: unknown[] = [];
  await page.route("**/api/students/*/predictions", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { pick: "up", right: false } });
  });
  await page.addInitScript(() => localStorage.setItem("zeno.student.v1", JSON.stringify({ code: "TEST-CODE", class: "ABC123" })));
  await page.goto("/#/learn/fractions");
  const card = page.locator(".predict");
  await expect(card).toContainText("swapped for a ⅛ tile");
  await card.getByRole("radio", { name: "More is filled" }).click();
  await expect(card.locator(".predict-verdict")).toContainText("Not this time.");
  await expect(card.locator(".predict-verdict")).toContainText("⅛ is half of ¼");
  await expect.poll(() => sent).toEqual([{ kind: "fractionWall", pick: "up" }]);
});

test("the slope walk asks how far across as the slope gets steeper", async ({ page }) => {
  await page.goto("/#/learn/trigonometry");
  const card = page.locator(".predict");
  await expect(card).toContainText("The slope will turn from 30° to 60°");
  await card.getByRole("radio", { name: "Less far across" }).click();
  await expect(card.locator(".predict-verdict")).toContainText("Right.");
  await expect(page.locator(".live-slopeWalk")).toContainText("60°");
});
