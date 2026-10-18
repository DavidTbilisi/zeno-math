// Every dialog can be maximised to the whole window and put back, from its button or a double click on its title.
import { expect, test } from "@playwright/test";

test("a dialog maximises and restores", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Dialogs" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Graph");
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  const width = async () => (await dialog.boundingBox())!.width;
  const normal = await width();
  await page.screenshot({ path: test.info().outputPath("normal.png") });

  await dialog.getByRole("button", { name: "Maximise" }).click();
  expect(await width()).toBeGreaterThan(normal);
  expect((await dialog.boundingBox())!.height).toBeGreaterThan(800);
  await page.screenshot({ path: test.info().outputPath("max.png") });

  await dialog.getByRole("button", { name: "Restore size" }).click();
  expect(await width()).toBe(normal);

  await dialog.getByRole("heading").dblclick();
  await expect(dialog.getByRole("button", { name: "Restore size" })).toBeVisible();
});
