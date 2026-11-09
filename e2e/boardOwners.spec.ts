// Boards have owners: a student's boards are theirs alone, a browser with neither a student code nor the teacher
// password is told how to get boards, and a teacher opens a student's board from the class page to look, not change.
import { expect, test, type Browser } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const TEACHER = "e2e-teacher";

// A browser of its own, without the teacher header the config gives every test: a student's, or nobody's.
async function browserOf(browser: Browser, student?: unknown) {
  const page = await (await browser.newContext({ extraHTTPHeaders: {} })).newPage();
  if (student) await page.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(student));
  return page;
}

test("a student's board is theirs: another student doesn't see it, and the teacher opens it read only", async ({ browser, request }) => {
  const name = `Owners ${Date.now()}`;
  const { code } = await (await request.post("/api/classes", { data: { name }, headers: { "X-Teacher-Password": TEACHER } })).json();
  const join = async () => (await request.post("/api/students", { data: { class: code } })).json();
  const [first, second] = [await join(), await join()];
  const title = `Fractions ${Date.now()}`;

  // The first student makes a board and names it.
  const a = await browserOf(browser, first);
  await a.goto("/");
  await a.getByRole("button", { name: /New board/ }).first().click();
  await a.waitForURL(/#\/b\/[0-9a-f-]+$/);
  const id = a.url().split("/").pop()!;
  await a.locator(".excalidraw").waitFor();
  await a.getByLabel(en.rename).fill(title);
  await a.getByLabel(en.rename).press("Enter");
  await expect(a.locator(".save-state")).toHaveText(en.saved);
  await a.goto("/");
  await expect(a.locator(".board-card")).toHaveText(new RegExp(title));

  // The second student sees none of it, not even by the board's address.
  const b = await browserOf(browser, second);
  await b.goto("/");
  await expect(b.getByText(en.noBoards)).toBeVisible();
  await expect(b.getByText(title)).toHaveCount(0);
  await b.goto(`/#/b/${id}`);
  await expect(b.getByText(en.notFound)).toBeVisible();

  // A browser that is neither a student's nor a teacher's has no boards, and is told how to get them.
  const visitor = await browserOf(browser);
  await visitor.goto("/");
  await expect(visitor.getByText(en.boardsNeedOwner)).toBeVisible();
  await expect(visitor.getByRole("button", { name: /New board/ })).toHaveCount(0);

  // The teacher finds the board on the class page and opens it read only: no title box, no Share, no saving.
  const teacher = await (await browser.newContext()).newPage();
  await teacher.addInitScript((pw) => sessionStorage.setItem("zeno.teacher", pw), TEACHER);
  await teacher.goto("/#/teacher");
  await teacher.locator(".class-item", { hasText: name }).click();
  await teacher.getByRole("heading", { name: en.teacher.studentBoards }).click();
  await teacher.getByRole("link", { name: title }).click();
  await expect(teacher.locator(".shared-title")).toHaveText(title);
  await expect(teacher.getByText(en.readOnly)).toBeVisible();
  await expect(teacher.getByLabel(en.rename)).toHaveCount(0);
  // And the server still refuses the teacher's save, whatever the page shows.
  const put = await request.put(`/api/boards/${id}`, { data: { title: "Marked" }, headers: { "X-Teacher-Password": TEACHER } });
  expect(put.status()).toBe(403);
  expect((await (await request.get(`/api/boards/${id}`)).json()).title).toBe(title);
});
