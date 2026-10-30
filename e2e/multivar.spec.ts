// Several variables, from the Algebra menu: the gradient tab draws, a point with one number says how to type it, an
// example fills the fields, the picture goes on the board, and it opens again for editing with the same function. The
// Lagrange tab asks for the constraint's c when it is missing, and draws one of its examples.
import { expect, test } from "@playwright/test";

test("several variables: the gradient explains a bad point, inserts, and opens again", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Several variables" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Algebra/ }).click();
  await page.getByRole("menuitem", { name: /Several variables/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Several variables" })).toBeVisible();
  await dialog.getByRole("tab", { name: "Gradient" }).click();
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox", { name: "at (x, y) =" }).fill("1");
  await expect(dialog.locator(".preview .error")).toHaveText(/Type the point as two numbers/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "x² − y², (1, 0.5)" }).click();
  await expect(dialog.getByRole("textbox", { name: "f(x, y) =" })).toHaveValue("x^2 - y^2");
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("multivar.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit several variables/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "f(x, y) =" })).toHaveValue("x^2 - y^2");
});

test("several variables: Lagrange multipliers ask for c, and an example draws", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Lagrange" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /Algebra/ }).click();
  await page.getByRole("menuitem", { name: /Several variables/ }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Lagrange multipliers" }).click();
  await expect(dialog.getByRole("textbox", { name: "g(x, y) =" })).toHaveValue("x^2 + y^2");
  await dialog.getByRole("textbox", { name: "= c, c =" }).fill("");
  await expect(dialog.locator(".preview .error")).toHaveText(/Type the number c of the constraint/);
  await dialog.getByRole("button", { name: "x² + y² on x + 2y = 5" }).click();
  await expect(dialog.locator(".preview img")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("lagrange.png") });
});
