// A lesson: the teacher starts it on a board and opens it; a student who comes by the link sees the teacher's board
// beside a board of their own; what the student draws shows on the teacher's side; the teacher's board handed out
// lands on the student's; and when the lesson ends the student's page says so.
import { expect, test, type Browser, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR;
const TEACHER = "e2e-teacher";
const elementsIn = async (body: string) => ((JSON.parse(body).scene?.elements ?? []) as { isDeleted?: boolean }[]).filter((e) => !e.isDeleted).length;

// A student's browser: without the teacher header the config gives every test, and with a class record of its own.
async function studentPage(browser: Browser, student: { code: string }) {
  const page = await (await browser.newContext({ extraHTTPHeaders: {} })).newPage();
  await page.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(student));
  return page;
}
/** How many elements a board has, asked as its owner the student. */
const boardSize = (page: Page, id: string, code: string) =>
  page.evaluate(async ([board, who]) => {
    const scene = (await (await fetch(`/api/boards/${board}`, { headers: { "X-Student-Code": who } })).json()).scene;
    return ((scene.elements ?? []) as { isDeleted?: boolean }[]).filter((e) => !e.isDeleted).length;
  }, [id, code]);

test("a lesson: two boards side by side, each followed by the other, and the teacher's handed out", async ({ page, browser, request }) => {
  const { code: klass } = await (await request.post("/api/classes", { data: { name: `Lesson ${Date.now()}` }, headers: { "X-Teacher-Password": TEACHER } })).json();
  const pupil = await (await request.post("/api/students", { data: { class: klass } })).json();

  // The teacher draws on a board and starts a lesson on it from the Share box.
  await page.goto("/#/boards");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Protractor", exact: true }).click();
  const hostBoard = page.url().split("/").pop()!;
  await expect.poll(async () => elementsIn(await (await request.get(`/api/boards/${hostBoard}`)).text())).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Start a lesson" }).click();
  const link = await page.getByRole("textbox", { name: "Lesson link" }).inputValue();
  expect(link).toMatch(/#\/l\/[A-Za-z0-9_-]{22}$/);
  const token = link.split("/").pop()!;
  await page.getByRole("link", { name: "Open the lesson" }).click();
  await expect(page.getByText("Nobody has joined yet", { exact: false })).toBeVisible();
  await expect(page.frameLocator('iframe[title="My board"]').locator(".excalidraw")).toBeVisible();

  // The student comes by the link: the teacher's board on the left to look at, a board of their own on the right.
  const student = await studentPage(browser, pupil);
  await student.goto(link);
  const theirs = student.frameLocator('iframe[title="Teacher\'s board"]');
  const own = student.frameLocator('iframe[title="My board"]');
  await expect(theirs.getByText("Teacher's board")).toBeVisible();
  await expect(theirs.getByRole("button", { name: "Shapes" })).toHaveCount(0);
  await own.locator(".excalidraw").waitFor();
  const mine = (await (await student.evaluate(async ([t, who]) => (await fetch(`/api/lessons/${t}`, { headers: { "X-Student-Code": who } })).text(), [token, pupil.code as string])));
  const studentBoard = JSON.parse(mine).board as string;
  expect(JSON.parse(mine).role).toBe("guest");

  // What the student draws is on the teacher's side within a few seconds (the wait starts before the drawing: the
  // teacher's side may open on the board already drawn on, or follow it there).
  const followed = page.waitForResponse(
    async (r) => r.url().includes(`/api/lessons/${token}/guest`) && r.status() === 200 && (await elementsIn(await r.text())) > 0,
    { timeout: 40_000 },
  );
  await own.getByRole("button", { name: "Shapes" }).click();
  await own.getByRole("button", { name: "Kite", exact: true }).click();
  await expect.poll(() => boardSize(student, studentBoard, pupil.code)).toBeGreaterThan(0);
  const drawn = await boardSize(student, studentBoard, pupil.code);
  const watched = page.frameLocator('iframe[title="Student\'s board"]');
  await expect(watched.getByText("Student's board")).toBeVisible();
  await expect(watched.locator(".excalidraw")).toBeVisible();
  await followed;
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-host.png` });

  // The teacher hands their board out: it lands on the student's board, beside the kite.
  await page.getByRole("button", { name: "Hand out my board" }).click();
  await expect(page.getByRole("status")).toHaveText("Handed out.");
  await expect(student.getByRole("status")).toHaveText("The teacher's board was added to yours.", { timeout: 20_000 });
  await expect.poll(() => boardSize(student, studentBoard, pupil.code)).toBeGreaterThan(drawn);
  const afterHandout = await boardSize(student, studentBoard, pupil.code);
  if (SHOTS) await student.screenshot({ path: `${SHOTS}/lesson-guest.png` });

  // The student can take the teacher's board again whenever they like.
  await student.getByRole("button", { name: "Copy the teacher's board to mine" }).click();
  await expect.poll(() => boardSize(student, studentBoard, pupil.code)).toBeGreaterThan(afterHandout);

  // The teacher can't write on the student's board, and the lesson ended is said on the student's page.
  expect((await request.put(`/api/boards/${studentBoard}`, { data: { scene: { elements: [] } } })).status()).toBe(403);
  expect((await request.delete(`/api/boards/${hostBoard}/lesson`)).status()).toBe(204);
  await expect(student.getByText("This lesson has ended.")).toBeVisible({ timeout: 20_000 });
  // The board the student made in the lesson is still theirs.
  expect(await boardSize(student, studentBoard, pupil.code)).toBeGreaterThan(afterHandout);
});

test("someone with the link but no boards of their own watches the teacher's board", async ({ browser, request }) => {
  const board = (await (await request.post("/api/boards", { data: { title: "Watch me" } })).json()).id as string;
  const { token } = await (await request.post(`/api/boards/${board}/lesson`, { data: {} })).json();
  const visitor = await (await browser.newContext({ extraHTTPHeaders: {} })).newPage();
  await visitor.goto(`/#/l/${token}`);
  await expect(visitor.getByText("You are watching the teacher's board.", { exact: false })).toBeVisible();
  await expect(visitor.frameLocator('iframe[title="Teacher\'s board"]').getByText("Teacher's board")).toBeVisible();
  await expect(visitor.locator('iframe[title="My board"]')).toHaveCount(0);
});
