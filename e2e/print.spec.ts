// The class's tests on paper: both forms and their answer keys, and nothing else when printed.
import { expect, test } from "@playwright/test";

test("a teacher prints both test forms with answer keys", async ({ page, request }) => {
  const klass = await (await request.post("/api/classes", { data: { name: "Paper class", skills: ["algebra"], testLength: 6 }, headers: { "X-Teacher-Password": "e2e-teacher" } })).json();
  await page.goto("/#/teacher");
  await page.getByLabel("Teacher password").fill("e2e-teacher");
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByRole("button", { name: new RegExp(klass.code) }).click();
  await page.getByRole("button", { name: "Print the tests" }).click();

  const sheet = page.getByRole("dialog", { name: "Print the tests" });
  await expect(sheet.locator('[data-form="A"] .print-items > li')).toHaveCount(6);
  await expect(sheet.locator('[data-form="B"] .print-items > li')).toHaveCount(6);
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
  expect(pages).toBeGreaterThanOrEqual(4);
  await page.emulateMedia({ media: "screen" });
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
});
