// First-time help (#872–#875): a fresh browser sees the practice welcome card until "Got it" and the ? brings it
// back; its first board shows the tour once, and the board's ? starts it again; the help page puts them all back.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const h = en.help;

test("a first visit shows the welcome card and the board's tour, once", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await page.goto("/#/practice");
  const card = page.getByRole("region", { name: h.practice.title });
  await expect(card).toContainText(h.practice.pick);
  await card.getByRole("button", { name: h.gotIt }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: en.practice })).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: h.show }).click();
  await expect(card).toBeVisible();

  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  const tour = page.getByRole("dialog", { name: h.tour.title });
  await expect(tour).toContainText(h.board.steps.insert);
  const next = tour.getByRole("button", { name: h.tour.next });
  for (let i = 0; i < 6 && (await next.count()); i++) await next.click();
  await tour.getByRole("button", { name: h.tour.done }).click();
  await expect(tour).toHaveCount(0);

  await page.reload();
  await page.locator(".excalidraw").waitFor();
  await expect(page.locator(".board-bar .insert-btn")).toBeVisible();
  await expect(tour).toHaveCount(0);
  await page.getByRole("button", { name: h.board.title }).click();
  await page.locator(".board-help").getByRole("button", { name: h.board.tour }).click();
  await expect(tour).toContainText(h.board.steps.insert);
  await tour.getByRole("button", { name: h.tour.skip }).click();
  await expect(tour).toHaveCount(0);

  // The help page (#876) puts every card back.
  await page.goto("/#/help");
  await expect(page.getByRole("heading", { name: h.page.teachTitle })).toBeVisible();
  await page.getByRole("button", { name: h.page.again }).click();
  await expect(page.getByText(h.page.againDone)).toBeVisible();
  await page.goto("/#/practice");
  await expect(card).toBeVisible();
  await context.close();
});
