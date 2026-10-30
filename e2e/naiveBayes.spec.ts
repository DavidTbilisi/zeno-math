// Naive Bayes, from the Discrete menu: counting words explains an empty new message, an example fills the fields, the
// picture goes on the board, and it opens again for editing with the same message.
import { expect, test } from "@playwright/test";

test("naive Bayes: an empty message says why, an example inserts and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Naive Bayes" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Discrete/ }).click();
  await page.getByRole("menuitem", { name: /Naive Bayes/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Naive Bayes" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeVisible();

  const message = dialog.getByRole("textbox", { name: "new message:" });
  await message.fill("");
  await expect(dialog.locator(".preview .error")).toHaveText(/Type the new message/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "spam or not: lunch money" }).click();
  await expect(message).toHaveValue("money for lunch");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("naive-bayes.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit naive Bayes/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "new message:" })).toHaveValue("money for lunch");
});
