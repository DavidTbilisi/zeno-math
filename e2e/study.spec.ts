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

/**
 * Answers the practice question wrong if it can: true when it is marked wrong, false when the only answer it takes was
 * right. A typed answer of the wrong kind (one root of two, a number for an inequality) is sent back for its form, so
 * kinds are tried until one is marked wrong; a question answered from buttons (equal expressions, graph stories) sends
 * back every typed answer, so its first option is picked, which may be the right one.
 */
async function answerWrong(page: Page): Promise<boolean> {
  const verdict = page.locator(".practice-verdict");
  const marked = async () => {
    await page.getByRole("button", { name: "Check" }).click();
    await expect(verdict).toBeVisible();
    return verdict.evaluate((e) => (e.classList.contains("bad") ? "bad" : e.classList.contains("ok") ? "ok" : "again"));
  };
  for (const wrong of ["12345", "12345; 12346", "x > 12345", "x^7 + 12345"]) {
    await page.getByLabel("Your answer").fill(wrong);
    if ((await marked()) === "bad") return true;
  }
  const pick = page.locator(".sign-picks button").first();
  if (!(await pick.count())) throw new Error(`no answer marked wrong: ${await page.locator(".practice-prompt").textContent()}`);
  await pick.click();
  const after = await marked();
  if (after === "again") throw new Error(`the first option was sent back: ${await verdict.textContent()}`);
  return after === "bad";
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
  // A question whose first option was the right one is answered and left for the next.
  let questions = 1;
  while (!(await answerWrong(student))) {
    expect(questions, "a wrong answer within ten questions").toBeLessThan(10);
    await student.getByRole("button", { name: "Next" }).click();
    questions++;
  }
  await expect(student.getByText("Not quite — try again.")).toBeVisible();
  await student.getByRole("button", { name: "Show solution" }).click();
  await student.getByRole("button", { name: "Next" }).click();

  // The attempts reach the server, under the student's condition.
  const attempts = async () =>
    (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers: { "X-Teacher-Password": TEACHER } })).text()).trim().split("\n").length - 1;
  await expect.poll(attempts).toBe(questions);

  // The teacher starts the pre-test; the student's practice dialog, opened again, shows the test.
  await teacher.getByRole("button", { name: "Pre-test" }).click();
  await expect(teacher.getByRole("button", { name: "Pre-test" })).toHaveAttribute("aria-pressed", "true");
  await student.reload();
  await openPractice(student);
  await expect(student.getByText("No marks during the test", { exact: false })).toBeVisible();
});
