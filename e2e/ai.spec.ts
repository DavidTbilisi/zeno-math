// Math for AI: the AI menu opens the Tensors tool, an example and a typed list draw, a list that is not a full box
// says why, and the picture goes on the board and opens again for editing. Tensor operations open on their own tab,
// shapes that do not broadcast say why, and a matrix product goes on the board.
import { expect, test } from "@playwright/test";

test("the tensor tool draws, explains a ragged list and inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensors" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensors/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Math for AI" })).toBeVisible();
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("[[1, 2], [3]]");
  await expect(dialog.locator(".preview .error")).toHaveText(/Lists of different lengths \(2 and 1\)/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "pick T[1, 2, 3]" }).click();
  await expect(dialog.getByRole("textbox")).toHaveValue("2x3x4; T[1, 2, 3]");
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tensor.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("2x3x4; T[1, 2, 3]");
});

test("tensor operations: a mismatch says why, and a matrix product inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensor operations" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensor operations/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Operations" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("2x3x4; reshape 4x6");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("2x3 + [1, 2]");
  await expect(dialog.locator(".preview .error")).toHaveText(/Shapes \(2, 3\) and \(2\) do not broadcast/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "matrix product" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tensor-ops.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("[[1, 2, 3], [4, 5, 6]] @ [[7, 8], [9, 10], [11, 12]]; [1, 0]");
});
