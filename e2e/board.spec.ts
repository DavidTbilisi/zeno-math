// A teacher's board: make it, put a shape and a live piece on it, use the piece, and find everything again after a
// reload (and on the server); a piece changed in the moment after the click that starts it still answers clicks; the
// bar and its menus fit the window.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers.ts";

test("a board keeps a shape and a live piece's state across a reload", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  await page.locator(".excalidraw").waitFor();

  // The panel closes after each insert (unless it is docked on a wide screen), so open it for each shape.
  for (const name of ["Right triangle", "Dice to roll"]) {
    await page.getByRole("button", { name: "Shapes" }).click();
    await page.getByRole("button", { name, exact: true }).click();
  }

  // A live piece starts working after a click in its middle (Excalidraw's "click to interact").
  const dice = page.locator(".live-dice");
  await dice.waitFor();
  const box = (await dice.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await dice.getByRole("button", { name: "Roll" }).click();

  // The board saves itself: the server soon has the triangle and the dice with one roll in their history.
  const saved = async () => {
    const board = await (await request.get(`/api/boards/${id}`)).json();
    const elements = board.scene?.elements ?? [];
    const live = elements.find((e: { customData?: { live?: string } }) => e.customData?.live === "dice");
    return { elements: elements.length, rolls: live?.customData.state.history.length ?? 0 };
  };
  await expect.poll(saved).toMatchObject({ rolls: 1 });
  const before = await saved();
  expect(before.elements).toBeGreaterThan(2);

  await page.reload();
  await page.locator(".live-dice").waitFor();
  // The roll is still there: one total in the piece's history.
  await expect(page.locator(".live-dice .live-history .live-chip")).toHaveCount(1);
  expect(await saved()).toEqual(before);
  expect(errors).toEqual([]);
});

test("a piece changed in the 100 ms before Excalidraw starts it still answers clicks", async ({ page }) => {
  // Excalidraw starts a piece 100 ms after the click in its middle, holding the element as it was at the click; a
  // change in between (here a mirror line chosen at once) used to leave the piece behind the canvas for good.
  const game = await boardWith(page, "Lines of symmetry: fold the shape", ".live-mirror");
  await game.getByRole("button", { name: "Line 1", exact: true }).dispatchEvent("click");
  await game.getByRole("button", { name: "Check" }).click({ timeout: 5000 });
});

// The bar and its menus fit the window, from a phone to a wide screen and in the longest language: the bar gives up
// labels, then spacing, then wraps; a menu in sections lays them out in columns and is never taller than the window.
for (const [w, h] of [[1366, 768], [1024, 700], [390, 760]])
  test(`the board's bar and every menu fit on a ${w} × ${h} window, in English and Georgian`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.getByRole("button", { name: /New board/ }).first().click();
    await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
    await page.locator(".excalidraw").waitFor();
    for (const lang of ["en", "ka"]) {
      if (lang === "ka") await page.locator(".board-bar .lang-select").selectOption("ka");
      const bar = page.locator(".board-bar");
      await expect.poll(() => bar.evaluate((e) => e.scrollWidth - e.clientWidth)).toBe(0);
      for (const button of await bar.locator(".tool-menu-btn").all()) {
        await button.click();
        const box = (await page.locator(".tool-menu").boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(w);
        expect(box.y + box.height).toBeLessThanOrEqual(h);
        await page.keyboard.press("Escape");
      }
    }
  });
