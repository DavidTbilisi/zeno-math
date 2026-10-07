// The class study from both sides: a teacher makes a class, a student agrees and joins with its code and answers a
// question that reaches the server, and when the teacher starts the pre-test the student gets the test.
import { expect, test, type Page } from "@playwright/test";

const TEACHER = "e2e-teacher";

async function openPractice(page: Page) {
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.locator(".practice-join, .practice-class").first().waitFor();
}

test("a teacher makes a class, a student joins and practises, and the pre-test reaches the student", async ({ browser, request }) => {
  // The teacher: sign in, make a class of algebra with a four-question test.
  const teacher = await browser.newPage();
  await teacher.goto("/#/teacher");
  await teacher.getByLabel("Teacher password").fill(TEACHER);
  await teacher.getByRole("button", { name: "Open" }).click();
  await teacher.locator(".new-class").getByLabel("Name").fill("E2E class");
  await teacher.locator(".new-class").getByLabel("Questions per test").fill("4");
  await teacher.locator(".new-class").getByRole("button", { name: "Algebra" }).click();
  await teacher.getByRole("button", { name: "Create class" }).click();
  // The page shows the new class once the server has made it; until then it shows whichever was selected before.
  await expect(teacher.locator(".class-head h2")).toHaveText("E2E class");
  const code = (await teacher.locator(".class-code strong").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  // The student, in a browser of their own: a board, the practice dialog, the consent, the class code.
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  await student.locator(".practice-join summary").click();
  await student.getByLabel("Class code").fill(code);
  const join = student.locator(".practice-join").getByRole("button", { name: "Join" });
  await expect(join).toBeDisabled();
  await student.getByLabel("I understand and want to take part").check();
  await join.click();
  await expect(student.locator(".practice-class strong.mono")).toContainText(/Student [A-Z0-9]{4}-[A-Z0-9]{4}/);

  // Class practice: a question chosen by the study; a wrong answer, the solution, the next question.
  await expect(student.getByText(/Chosen for you:/)).toBeVisible();
  // The question is a picture; a screen reader gets its words (and its maths as MathML) instead.
  expect((await student.locator(".preview .sr-only").first().textContent())!.trim().length).toBeGreaterThan(5);
  await student.getByLabel("Your answer").fill("12345");
  await student.getByRole("button", { name: "Check" }).click();
  await expect(student.getByText("Not quite — try again.")).toBeVisible();
  await student.getByRole("button", { name: "Show solution" }).click();
  await student.getByRole("button", { name: "Next" }).click();

  // The attempt reaches the server, under the student's condition.
  const attempts = async () =>
    (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers: { "X-Teacher-Password": TEACHER } })).text()).trim().split("\n").length - 1;
  await expect.poll(attempts).toBe(1);

  // The teacher starts the pre-test; the student's practice dialog, opened again, shows the test.
  await teacher.getByRole("button", { name: "Pre-test" }).click();
  await expect(teacher.getByRole("button", { name: "Pre-test" })).toHaveAttribute("aria-pressed", "true");
  await student.reload();
  await openPractice(student);
  await expect(student.getByText("No marks during the test", { exact: false })).toBeVisible();
});
