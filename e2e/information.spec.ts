// Information, from the Discrete menu: cross-entropy explains a q that rules out a possible outcome, an example fills
// the fields, the picture goes on the board, and it opens again for editing with the same chances.
import { expect, test } from "@playwright/test";

test("information: a zero in q says why, an example inserts and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Information" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Discrete/ }).click();
  await page.getByRole("menuitem", { name: /Information/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Information" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await dialog.getByRole("tab", { name: "Cross-entropy" }).click();

  await dialog.getByRole("textbox", { name: "chances q:" }).fill("1, 0, 0");
  await expect(dialog.locator(".preview .error")).toHaveText(/infinitely long/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "a fair coin coded for a bent one" }).click();
  await expect(dialog.getByRole("textbox", { name: "chances q:" })).toHaveValue("0.9, 0.1");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("information.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit information/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "chances q:" })).toHaveValue("0.9, 0.1");
});
