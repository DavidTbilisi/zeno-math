// The roadmap as a walk through rooms (#584): a goal's roadmap opens as rooms, one per stage, each place marked with
// its glyph; the list is one click away and remembered; the walk-it check is answered by keyboard; and at phone width
// the rooms stack with no sideways scroll.
import { expect, test } from "@playwright/test";

test("a roadmap opens as rooms, the list is one click away, and walk-it is answered by keyboard", async ({ page }) => {
  await page.goto("/#/roadmaps/software");
  const map = page.locator(".rm-map");
  await expect(map.locator(".rm-room")).toHaveCount(9);
  const first = map.locator(".rm-room").first();
  await expect(first.getByRole("heading", { level: 2 })).toContainText("How computers hold numbers");
  // The room's picture reads out its places in order.
  await expect(first.getByRole("img")).toHaveAttribute("aria-label", /^Room 1, How computers hold numbers: 1 [^,]+\?, 2 Number bases, 3 /);
  await expect(first.locator(".rm-spot")).toHaveCount(9);
  await expect(first.locator(".rm-spot .rm-glyph").nth(1)).toHaveText("1011₂");
  // Tapping a place says what it is, with its link.
  await first.locator(".rm-spot").nth(1).click();
  await expect(first.locator(".rm-caption a")).toHaveAttribute("href", "#/practice/bases.1");
  await expect(first.locator(".rm-caption")).toContainText("Number bases");
  await page.screenshot({ path: "test-results/roadmap-rooms-desktop.png", fullPage: true });

  // The list, one click away, and remembered.
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(map).toHaveCount(0);
  await expect(page.locator(".road-item", { hasText: "Number bases" })).toHaveAttribute("href", "#/practice/bases.1");
  await page.reload();
  await expect(page.locator(".road-item", { hasText: "Number bases" })).toBeVisible();
  await page.getByRole("button", { name: "Rooms", exact: true }).click();
  await expect(map).toBeVisible();

  // Walk it, by keyboard only: the start button, then a choice, then another room.
  const walk = page.locator(".rm-walkit");
  await walk.getByRole("button", { name: "Walk a room" }).focus();
  await page.keyboard.press("Enter");
  await expect(walk.locator(".rm-empty")).toHaveCount(1);
  await expect(walk.getByRole("img")).toHaveAttribute("aria-label", /\d \?/);
  const choices = walk.locator(".rm-choice");
  await expect(choices).toHaveCount(3);
  // The first choice has the focus; Tab moves to the next one.
  await expect(choices.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(choices.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(walk.getByRole("status")).toHaveText(/stands here|Not here/);
  await expect(walk.locator(".rm-choice.right")).toHaveCount(1);
  await expect(walk.locator(".rm-empty .rm-glyph")).not.toHaveText("?");
  await expect(walk.getByRole("button", { name: "Another room" })).toBeFocused();
  await page.screenshot({ path: "test-results/roadmap-walkit-desktop.png", fullPage: true });
  await page.keyboard.press("Enter");
  await expect(walk.locator(".rm-empty .rm-glyph")).toHaveText("?");
  await expect(choices.first()).toBeFocused();
});

test("at phone width the rooms stack, with no sideways scroll, on every goal and in Georgian", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const goal of ["software", "algorithms", "finance", "banking", "ml", "school"]) {
    await page.goto(`/#/roadmaps/${goal}`);
    const rooms = page.locator(".rm-map > .rm-room");
    await expect(rooms.first()).toBeVisible();
    const boxes = await rooms.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((b) => ({ x: Math.round(b.x), y: b.y, w: b.width })));
    // One column: every room starts at the same left edge, each below the one before.
    for (const [k, b] of boxes.entries()) {
      expect(b.x).toBe(boxes[0].x);
      expect(b.x + b.w).toBeLessThanOrEqual(390);
      if (k) expect(b.y).toBeGreaterThan(boxes[k - 1].y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
  await page.goto("/#/roadmaps/finance");
  await page.locator(".rm-walkit").getByRole("button", { name: "Walk a room" }).click();
  await page.screenshot({ path: "test-results/roadmap-rooms-phone.png", fullPage: true });
  await page.evaluate(() => localStorage.setItem("lang", "ka"));
  await page.reload();
  await expect(page.getByRole("button", { name: "ოთახები" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".rm-walkit h2")).toHaveText("გაიარე");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
