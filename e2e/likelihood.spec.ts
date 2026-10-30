// Likelihood, from the Discrete menu: log loss explains a chance of 1, an example fills the fields, the picture goes on
// the board, and it opens again for editing with the same chances.
import { expect, test } from "@playwright/test";

test("likelihood: a chance of 1 says why, an example inserts and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Likelihood" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Discrete/ }).click();
  await page.getByRole("menuitem", { name: /Likelihood/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Likelihood" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await dialog.getByRole("tab", { name: "Log loss" }).click();

  await dialog.getByRole("textbox", { name: "chances q = P(y = 1):" }).fill("1, 0.8, 0.2, 0.7, 0.1, 0.3");
  await expect(dialog.locator(".preview .error")).toHaveText(/between 0 and 1/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "one confident mistake" }).click();
  await expect(dialog.getByRole("textbox", { name: "chances q = P(y = 1):" })).toHaveValue("0.9, 0.8, 0.2, 0.02, 0.1, 0.3");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("likelihood.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit likelihood/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "chances q = P(y = 1):" })).toHaveValue("0.9, 0.8, 0.2, 0.02, 0.1, 0.3");
});
