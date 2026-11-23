// The class's tests on paper: all three forms and their answer keys, and nothing else when printed. The preview is a
// page of its own (#562): it has an address, and Back closes it.
import { expect, test } from "@playwright/test";

test("a teacher prints the three test forms with answer keys", async ({ browser, request }) => {
  // Without the teacher header the config gives every page, so the teacher page asks for the password.
  const page = await browser.newPage({ extraHTTPHeaders: {} });
  const klass = await (await request.post("/api/classes", { data: { name: "Paper class", skills: ["algebra"], testLength: 6 }, headers: { "X-Teacher-Password": "e2e-teacher" } })).json();
  await page.goto("/#/teacher");
  await page.getByLabel("Teacher password").fill("e2e-teacher");
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByRole("button", { name: new RegExp(klass.code) }).click();
  await page.getByRole("link", { name: "Print the tests" }).click();
  await expect(page).toHaveURL(new RegExp(`#/teacher/${klass.code}/tests/print$`));

  const sheet = page.getByRole("main", { name: "Print the tests" });
  await expect(page.locator(".modal-backdrop, [role=dialog]")).toHaveCount(0);
  await expect(sheet.locator('[data-form="A"] .print-items > li')).toHaveCount(6);
  await expect(sheet.locator('[data-form="B"] .print-items > li')).toHaveCount(6);
  await expect(sheet.locator('[data-form="C"] .print-items > li')).toHaveCount(6);
  await expect(sheet.locator('[data-key="A"] li')).toHaveCount(6);
  await expect(sheet.getByText("Paper class: test, form B")).toBeVisible();
  // Every question carries its words for a screen reader too.
  for (const text of await sheet.locator('[data-form="A"] .sr-only').allTextContents()) expect(text.trim().length).toBeGreaterThan(5);

  // On paper: the sheet alone, a page per form and per key.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-actions")).toBeHidden();
  await expect(page.locator(".teacher-main h2").first()).toBeHidden();
  const pdf = await page.pdf({ format: "A4" });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBeGreaterThanOrEqual(6);
  await page.emulateMedia({ media: "screen" });
  // The browser's Back closes it; its address opens it again, and so does a reload.
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Paper class" })).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(sheet.locator('[data-form="C"] .print-items > li')).toHaveCount(6);
  await sheet.getByRole("link", { name: "← Back to the class" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Paper class" })).toBeVisible();
});
