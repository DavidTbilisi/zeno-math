// A read-only link: the viewer sees the board in view mode with no editing tools, follows the owner's saves, and is
// told when the owner stops sharing.
import { expect, test } from "@playwright/test";

const elementsIn = async (body: string) => (JSON.parse(body).scene?.elements ?? []).length as number;

test("a read-only link follows the board as it changes, then stops when sharing stops", async ({ page, browser, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Protractor", exact: true }).click();
  // Autosave has it before anyone looks.
  const id = page.url().split("/").pop()!;
  await expect.poll(async () => elementsIn(await (await request.get(`/api/boards/${id}`)).text())).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Make a link" }).click();
  const link = await page.getByRole("dialog", { name: "Read-only link" }).getByRole("textbox").inputValue();
  expect(link).toMatch(/#\/s\/[A-Za-z0-9_-]{22}$/);

  const viewer = await (await browser.newContext()).newPage();
  const first = viewer.waitForResponse((r) => r.url().includes("/api/shared/") && r.ok());
  await viewer.goto(link);
  const before = await elementsIn(await (await first).text());
  expect(before).toBeGreaterThan(0);
  await expect(viewer.getByText("Read-only")).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Shapes" })).toHaveCount(0);
  await expect(viewer.getByRole("button", { name: "Share" })).toHaveCount(0);

  // The owner adds another shape; the viewer's next look at the board has it.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Kite", exact: true }).click();
  await viewer.waitForResponse(async (r) => r.url().includes("/api/shared/") && r.ok() && (await elementsIn(await r.text())) > before, { timeout: 20_000 });

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(viewer.getByText("This link no longer works", { exact: false })).toBeVisible({ timeout: 20_000 });
});
