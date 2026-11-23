// Regression, from the Discrete menu: logistic regression explains a missing label, an example fills the fields, the
// picture goes on the board, and it opens again for editing with the same points.
import { expect, test } from "@playwright/test";
import { insertGroup, insertPanel } from "./helpers.ts";

test("regression: one label only says why, an example inserts and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Regression" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await insertGroup(page, /Discrete/);
  await insertPanel(page).getByRole("button", { name: /Regression/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Regression" })).toBeVisible();
  await expect(dialog.locator(".preview img")).toBeAttached();
  await dialog.getByRole("tab", { name: "Logistic regression" }).click();

  const points = dialog.getByRole("textbox", { name: "points (x₁, x₂, label; …):" });
  await points.fill("1, 2, 0; 2, 3, 0");
  await expect(dialog.locator(".preview .error")).toHaveText(/both labels present/);

  await dialog.getByRole("button", { name: "overlapping classes" }).click();
  await expect(points).toHaveValue(/^1, 2, 0; 2, 1, 0/);
  await expect(dialog.locator(".preview img")).toBeAttached();
  await page.screenshot({ path: test.info().outputPath("regression.png") });
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  // The picture is still selected: Enter opens its panel again.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "points (x₁, x₂, label; …):" })).toHaveValue(/^1, 2, 0; 2, 1, 0/);
});
