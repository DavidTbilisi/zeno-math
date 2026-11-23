// No tool opens a dialog over the board (#558, #567): every one opens in the panel beside its picture.
import { expect, test } from "@playwright/test";

test("a tool opens in the panel beside its picture, with no dialog over the board", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Dialogs" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  for (const tool of ["Graph", "Formula"]) {
    await page.keyboard.press("Control+k");
    await page.keyboard.type(tool);
    await page.keyboard.press("Enter");
    await expect(page.locator(".item-panel")).toBeVisible();
    await expect(page.locator(".modal-backdrop")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(".item-panel")).toHaveCount(0);
  }
});
