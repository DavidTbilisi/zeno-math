// Payments (#757): the teacher sets the lesson price, ticks who came, records a payment, and sees each student's
// line and the class's; each student's site says whether they have paid.
import { expect, test, type Browser } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const TEACHER = "e2e-teacher";
const w = en.site.teach;

async function studentPage(browser: Browser, student: unknown) {
  const page = await (await browser.newContext({ extraHTTPHeaders: {} })).newPage();
  await page.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(student));
  return page;
}

test("the teacher keeps the register and the payments; each student sees whether they have paid", async ({ browser, page, request }) => {
  const name = `Payments ${Date.now()}`;
  const { code } = await (await request.post("/api/classes", { data: { name }, headers: { "X-Teacher-Password": TEACHER } })).json();
  const join = async (number: number) => (await request.post("/api/students", { data: { class: code, number } })).json();
  const [ana, beka] = [await join(1), await join(2)];

  await page.goto("/#/teacher");
  await page.locator(".class-item", { hasText: name }).click();
  await page.getByRole("tab", { name: w.tabs.payments }).click();
  const card = page.locator(".pay-card");
  await expect(card.getByText(w.payPriceFirst)).toBeVisible();
  await expect(card.getByRole("button", { name: w.addLesson })).toBeDisabled();

  await card.getByLabel(w.payPrice).fill("20");
  await card.getByRole("button", { name: w.paySavePrice }).click();
  await expect(card.getByText(w.payPriceNote)).toBeVisible();

  // Two lessons; both students came to the first, only № 1 to the second.
  await card.getByLabel(w.lessonDay).first().fill("2026-11-04");
  await card.getByRole("button", { name: w.addLesson }).click();
  await card.getByLabel(w.lessonDay).first().fill("2026-11-11");
  await card.getByRole("button", { name: w.addLesson }).click();
  await card.getByLabel(w.payMonth).fill("2026-11");
  const boxes = card.locator(".pay-table tbody tr");
  await expect(boxes).toHaveCount(2);
  for (const [row, col] of [[0, 0], [1, 0], [0, 1]] as const) {
    const box = boxes.nth(row).locator("td.pay-tick input").nth(col);
    await box.check();
    await expect(box).toBeChecked();
    await expect(box).toBeEnabled();
  }
  await expect(boxes.nth(0).locator("td.pay-owed")).toHaveText(/40/);
  await expect(boxes.nth(1).locator("td.pay-owed")).toHaveText(/20/);
  await expect(card.locator(".pay-table tfoot td.pay-owed")).toHaveText(/60/);

  // № 1 pays for both lessons.
  await card.getByLabel(w.payStudent).selectOption({ index: 1 });
  await card.getByLabel(w.payAmount).fill("40");
  await card.getByLabel(w.lessonDay).nth(1).fill("2026-11-11");
  await card.getByRole("button", { name: w.payRecord }).click();
  await expect(boxes.nth(0).locator("td.pay-clear")).toBeVisible();
  await expect(card.locator(".pay-table tfoot td.pay-owed")).toHaveText(/20/);
  await expect(card.locator(".pay-list li")).toHaveCount(1);

  // Each student sees their own: № 1 has paid, № 2 still owes for one lesson.
  const a = await studentPage(browser, ana);
  await a.goto("/#/");
  await expect(a.locator(".site-pay .pay-state")).toHaveText(en.site.myPayAllPaid);
  const b = await studentPage(browser, beka);
  await b.goto("/#/");
  await expect(b.locator(".site-pay .pay-state.owed")).toContainText("20");
});
