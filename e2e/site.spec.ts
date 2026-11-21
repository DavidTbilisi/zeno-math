// The maths site around the boards (#448): a learner gets from the home page to a topic and works through its lesson
// without a board, and a teacher on a board inserts anything from the library with one button.
import { expect, test } from "@playwright/test";
import { insertGroup } from "./helpers.ts";

test("a learner goes from the home page to a topic and works through its lesson on the page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#/");
  await page.getByRole("link", { name: "Browse topics" }).click();
  await page.locator('a[href="#/learn/geometry"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Geometry");
  const lessons = page.locator("section", { has: page.getByRole("heading", { name: "Work through it here" }) });
  // The first lesson is open to start, drawn into the page; another chip swaps it.
  await expect(lessons.getByRole("button", { name: /Geometry/ }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(lessons.locator(".site-tool svg").first()).toBeVisible();
  await lessons.getByRole("button", { name: /School geometry/ }).click();
  await expect(lessons.getByRole("button", { name: /School geometry/ })).toHaveAttribute("aria-pressed", "true");
  await expect(lessons.getByRole("link", { name: /On its own page/ })).toHaveAttribute("href", "#/library/tool/euclid");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test("Insert puts a piece on the board, finds by search and links each section to its topic", async ({ page }) => {
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.locator(".excalidraw").waitFor();
  const panel = await insertGroup(page, "Geometry");
  await expect(panel.getByRole("link", { name: "Topic: Geometry →" }).first()).toHaveAttribute("href", "#/learn/geometry");
  await panel.getByRole("searchbox").fill("comparing fractions");
  await expect(panel.getByRole("tab")).toHaveCount(0);
  await panel.getByRole("button", { name: /Comparing fractions/ }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".live-compareFractions")).toBeVisible();
  // It remembers the group it was last on.
  await page.locator(".insert-btn").click();
  await expect(panel.getByRole("tab", { name: "Geometry" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".insert-btn")).toBeFocused();
});
