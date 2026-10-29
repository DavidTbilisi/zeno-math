// Random variables, from the Discrete menu: the joint table explains a table of the wrong shape, an example fills the
// fields, the picture goes on the board, and it opens again for editing with the same table.
import { expect, test } from "@playwright/test";

test("random variables: a joint table of the wrong shape says why, an example inserts and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Random variables" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Discrete/ }).click();
  await page.getByRole("menuitem", { name: /Random variables/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Random variables" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await dialog.getByRole("tab", { name: "Joint table" }).click();

  await dialog.getByRole("textbox", { name: "P(x, y), rows by |:" }).fill("0.5 0.5");
  await expect(dialog.locator(".preview .error")).toHaveText(/The table needs 2 rows/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "independent: two coins" }).click();
  await expect(dialog.getByRole("textbox", { name: "P(x, y), rows by |:" })).toHaveValue("1/4 1/4 | 1/4 1/4");
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("randvar.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit random variable/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "P(x, y), rows by |:" })).toHaveValue("1/4 1/4 | 1/4 1/4");
});
