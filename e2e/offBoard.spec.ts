// Off the board (#562): a board is renamed by typing in its title on the list, and a board or an empty class is
// deleted at once with a few seconds to undo it — no Rename/Cancel form and no confirm row.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { UNDO_MS } from "../src/components/UndoDelete.tsx";

const TEACHER = { "X-Teacher-Password": "e2e-teacher" };

test("a board is renamed in place and deleted with an undo", async ({ page, request }) => {
  const title = `Off board ${Date.now()}`;
  const board = await (await request.post("/api/boards", { data: { title } })).json();
  await page.clock.install();
  await page.goto("/#/boards");
  const field = page.getByRole("textbox", { name: `Rename “${title}”` });
  await expect(field).toHaveValue(title);
  await expect(page.getByRole("button", { name: en.rename, exact: true })).toHaveCount(0);

  // Typed and Enter: saved, no button.
  await field.fill(`${title} renamed`);
  await field.press("Enter");
  const renamed = page.getByRole("textbox", { name: `Rename “${title} renamed”` });
  await expect(renamed).toHaveValue(`${title} renamed`);
  await expect.poll(async () => (await (await request.get(`/api/boards/${board.id}`)).json()).title).toBe(`${title} renamed`);
  // Escape puts it back.
  await renamed.fill("Something else");
  await renamed.press("Escape");
  await expect(renamed).toHaveValue(`${title} renamed`);
  await expect(renamed).not.toBeFocused();

  // Deleted at once; Undo puts it back, and the server never heard of it.
  await page.getByRole("button", { name: `Delete “${title} renamed”` }).click();
  await expect(renamed).toHaveCount(0);
  const toast = page.locator(".undo-toast");
  await expect(toast).toContainText(`Deleted “${title} renamed”.`);
  await toast.getByRole("button", { name: en.undo }).click();
  await expect(toast).toHaveCount(0);
  await expect(renamed).toBeVisible();
  expect((await request.get(`/api/boards/${board.id}`)).status()).toBe(200);

  // Deleted again and left: once the time is up it is gone for good.
  await page.getByRole("button", { name: `Delete “${title} renamed”` }).click();
  await page.clock.runFor(UNDO_MS + 100);
  await expect(toast).toHaveCount(0);
  await expect.poll(async () => (await request.get(`/api/boards/${board.id}`)).status()).toBe(404);
  await page.reload();
  await expect(page.getByRole("heading", { name: en.myBoards })).toBeVisible();
  await expect(page.getByRole("textbox", { name: `Rename “${title} renamed”` })).toHaveCount(0);
});

test("an empty class is deleted at once with an undo, no confirm row", async ({ page, request }) => {
  const name = `Undo class ${Date.now()}`;
  const klass = await (await request.post("/api/classes", { data: { name, skills: ["algebra"] }, headers: TEACHER })).json();
  const codes = async () => ((await (await request.get("/api/classes", { headers: TEACHER })).json()) as { code: string }[]).map((c) => c.code);
  await page.clock.install();
  await page.goto("/#/teacher");
  await page.getByRole("button", { name: new RegExp(klass.code) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("button", { name: en.teacher.deleteClass }).click();
  await expect(page.getByRole("button", { name: new RegExp(klass.code) })).toHaveCount(0);
  await expect(page.getByRole("button", { name: en.cancel })).toHaveCount(0);
  const toast = page.locator(".undo-toast");
  await expect(toast).toContainText(`Deleted class ${name}.`);
  await toast.getByRole("button", { name: en.undo }).click();
  // Back, and shown again.
  await expect(page.getByRole("heading", { name })).toBeVisible();
  expect(await codes()).toContain(klass.code);

  await page.getByRole("button", { name: en.teacher.deleteClass }).click();
  await page.clock.runFor(UNDO_MS + 100);
  await expect(toast).toHaveCount(0);
  await expect.poll(codes).not.toContain(klass.code);
});
