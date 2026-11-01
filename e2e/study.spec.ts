// The class study from both sides: a teacher makes a class, a student agrees and joins with its code and answers a
// question that reaches the server, and when the teacher starts the pre-test the student gets the test.
import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, stepsOf, trapInputs } from "../src/math/practice.ts";
import { testItems } from "../src/model/testForms.ts";

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

test("after a wrong answer on fractions the student is asked what exactly was hard, and the ticks reach the server", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const { code } = await (await request.post("/api/classes", { data: { name: "Fractions", skills: ["fractions"] }, headers })).json();
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  await student.locator(".practice-join summary").click();
  await student.getByLabel("Class code").fill(code);
  await student.getByLabel("I understand and want to take part").check();
  await student.locator(".practice-join").getByRole("button", { name: "Join" }).click();
  await expect(student.getByText(/Chosen for you: Fractions/)).toBeVisible();

  // Nothing is asked before the question is over; a wrong answer and the solution bring the list of its ideas.
  const list = student.getByRole("group", { name: "What exactly was hard? Tick everything that was." });
  await student.getByLabel("Your answer").fill("12345");
  await student.getByRole("button", { name: "Check" }).click();
  await expect(student.locator(".practice-verdict.bad")).toBeVisible();
  await expect(list).toHaveCount(0);
  await student.getByRole("button", { name: "Show solution" }).click();
  await expect(list).toBeVisible();
  const first = list.getByRole("checkbox").first();
  const idea = (await list.locator("label").first().textContent())!.trim();
  expect(idea.length).toBeGreaterThan(3);
  await first.check();
  await student.getByRole("button", { name: "Next" }).click();

  const rows = async () => (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text()).trim().split("\n");
  await expect.poll(async () => (await rows()).length).toBe(2);
  const [head, row] = await rows();
  // The export's answers column holds JSON with commas in it, so the ticked ideas are found by their own quoting.
  expect(head.split(",")).toContain("hard");
  expect(row).toMatch(/"\[""[a-zA-Z]+""\]"/);
});

test("a wrong answer on a fractions operation is worked in steps, and the steps reach the server", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const { code } = await (await request.post("/api/classes", { data: { name: "Steps", skills: ["fractions"] }, headers })).json();
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  await student.locator(".practice-join summary").click();
  await student.getByLabel("Class code").fill(code);
  await student.getByLabel("I understand and want to take part").check();
  await student.locator(".practice-join").getByRole("button", { name: "Join" }).click();
  await expect(student.getByText(/Chosen for you: Fractions/)).toBeVisible();

  // The class may aim at one idea alone, which has no steps, so the operation is asked in free practice, which is
  // saved under the student's code just the same; Math.random fixed so it is a question known here.
  const r = Array.from({ length: 500 }, (_, i) => (i + 1) / 501).find((x) => stepsOf(exercise("fractions", 1, Math.floor(x * 2 ** 31), en.pracWords), en.pracWords).length > 1)!;
  await student.getByRole("radio", { name: "Free practice" }).click();
  await student.getByRole("tab", { name: "Number" }).click();
  await student.evaluate((x) => (Math.random = () => x), r);
  await student.getByRole("radio", { name: "easy" }).click();
  await student.getByRole("button", { name: "Fractions", exact: true }).click();
  await expect(student.locator(".practice-prompt")).toHaveText("Work out, in lowest terms:");
  const steps = student.getByRole("region", { name: "Let's work it out step by step." });
  await student.getByLabel("Your answer").fill("12345");
  await student.getByRole("button", { name: "Check" }).click();
  await expect(steps).toBeVisible();
  // The first step missed once, then every step's answer shown.
  const first = steps.getByLabel(/^Step 1 of \d+$/);
  await first.fill("12345");
  await first.press("Enter");
  while (await steps.getByRole("button", { name: "Show this step" }).count()) await steps.getByRole("button", { name: "Show this step" }).click();
  await expect(student.getByText("Now answer the whole question again.")).toBeVisible();
  // The steps said which idea went wrong: nothing more is asked.
  await student.getByRole("button", { name: "Show solution" }).click();
  await expect(student.getByRole("group", { name: "What exactly was hard? Tick everything that was." })).toHaveCount(0);
  await student.getByRole("button", { name: "Next" }).click();

  const csv = async () => (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text()).trim();
  await expect.poll(async () => (await csv()).includes('""shown"":true')).toBe(true);
  expect((await csv()).split("\n")[0].split(",")).toContain("steps");
});

test("the teacher sees who is stuck, grouped by the mistake they repeat, in every language, and marks one seen", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const name = `Stuck ${Date.now()}`;
  const { code } = await (await request.post("/api/classes", { data: { name, skills: ["fractions"] }, headers })).json();
  const join = async () => (await (await request.post("/api/students", { data: { class: code } })).json()).code as string;
  const [a, b, c] = [await join(), await join(), await join()];
  // Two students repeat the same known mistake on a question; a third ticks the same idea as hard each time.
  const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => trapInputs(exercise("fractions", 1, s, en.pracWords)).length)!;
  const trap = trapInputs(exercise("fractions", 1, seed, en.pracWords))[0];
  let n = 0;
  const wrong = (student: string, input: string, hard?: string[]) => request.post("/api/attempts", {
    data: {
      clientId: `stuck-${Date.now()}-${n++}`, student, skill: "fractions", level: 1, seed, review: false, outcome: "revealed", solutionViewed: true,
      msTotal: 9000, shownAt: Date.now() - 9000, answers: [{ input, verdict: "wrong", ms: 9000 }], policy: "free", ...(hard ? { hard } : {}),
    },
  });
  for (let i = 0; i < 10; i++) {
    expect((await wrong(a, trap.input)).status()).toBe(201);
    expect((await wrong(b, trap.input)).status()).toBe(201);
    expect((await wrong(c, "12345", ["commonDenom"])).status()).toBe(201);
  }

  for (const L of [en, ru, ka]) {
    const lang = L === en ? "en" : L === ru ? "ru" : "ka";
    const page = await (await browser.newContext()).newPage();
    await page.addInitScript(([l, pw]) => (localStorage.setItem("lang", l), sessionStorage.setItem("zeno.teacher", pw)), [lang, TEACHER]);
    await page.goto("/#/teacher");
    await page.locator(".class-item", { hasText: name }).click();
    const list = page.getByRole("region", { name: L.teacher.stuck });
    await expect(list).toBeVisible();
    const groups = list.locator(".stuck-group");
    await expect(groups).toHaveCount(2);
    // The two with the same mistake first, said in the checker's own words for the question; then the ticked idea.
    const hint = check(exercise("fractions", 1, seed, L.pracWords), trap.input, L.pracWords).hint!;
    await expect(groups.nth(0)).toContainText(hint);
    await expect(groups.nth(0).locator(".stuck-row")).toHaveCount(2);
    await expect(groups.nth(1)).toContainText(L.pracWords.ideas.commonDenom);
    await expect(groups.nth(1).locator(".stuck-row")).toContainText(L.teacher.stuckAnswers.replace("{n}", "10"));
    if (L === ka) {
      // Seen: the student leaves the list, and the others stay.
      const seen = groups.nth(1).getByRole("button", { name: new RegExp(`${L.pracWords.skills.fractions}`) });
      await expect(seen).toHaveText(L.teacher.seen);
      await seen.click();
      await expect(groups).toHaveCount(1);
      await expect(list.locator(".stuck-row")).toHaveCount(2);
    }
    await page.context().close();
  }
});

test("a teacher tests spaced review in a class: two arms, the delayed post-test reaches the students, and every student counts", async ({ browser, request }) => {
  const name = `Kept ${Date.now()}`;
  const teacher = await browser.newPage();
  await teacher.addInitScript((pw) => sessionStorage.setItem("zeno.teacher", pw), TEACHER);
  await teacher.goto("/#/teacher");
  const form = teacher.locator(".new-class");
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Questions per test").fill("4");
  await form.getByLabel("What to test").selectOption("spaced");
  await expect(form).toContainText(en.teacher.features.spaced.hint);
  await form.getByRole("button", { name: "Algebra" }).click();
  await teacher.getByRole("button", { name: "Create class" }).click();
  await expect(teacher.locator(".class-head h2")).toHaveText(name);
  const code = (await teacher.locator(".class-code strong").textContent())!.trim();

  // Four students join: two with spaced review, two without, all practising adaptively.
  type Joined = { code: string; class: string; condition: string; feature: string; arm: string };
  const joined: Joined[] = [];
  for (let i = 0; i < 4; i++) joined.push(await (await request.post("/api/students", { data: { class: code } })).json());
  expect(joined.map((j) => j.arm).sort()).toEqual(["off", "off", "on", "on"]);
  expect(joined.every((j) => j.condition === "adaptive")).toBe(true);
  const [on, off] = [joined.filter((j) => j.arm === "on"), joined.filter((j) => j.arm === "off")];
  let k = 0;
  /** A student's answers on a test, through the API: the first `right` of `answered` right. */
  const sit = async (student: string, phase: string, answered: number, right: number) => {
    const plan = await (await request.get(`/api/students/${student}/plan`)).json();
    const items = testItems(code, plan.skills, plan.tests[phase].form, 4).slice(0, answered);
    for (const [item, q] of items.entries()) {
      const input = item < right ? exercise(q.skill, q.level, q.seed, en.pracWords).plain : "12345";
      const res = await request.post("/api/tests", { data: { clientId: `kept-${Date.now()}-${k++}`, student, phase, item, input, verdict: item < right ? "correct" : "wrong", retries: 0, ms: 9000 } });
      expect(res.status()).toBe(201);
    }
  };

  const phases = teacher.getByRole("group", { name: "Now" });
  await phases.getByRole("button", { name: "Post-test", exact: true }).click();
  const item = teacher.locator(".class-item", { hasText: name });
  await expect(item).toContainText(en.teacher.features.spaced.name);
  await expect(item).toContainText("4 students · 2 with, 2 without");
  // One student with spaced review gets all four; the other never sits it. Both without get two.
  await sit(on[0].code, "post", 4, 4);
  await sit(off[0].code, "post", 4, 2);
  await sit(off[1].code, "post", 4, 2);
  await teacher.getByRole("button", { name: "Refresh" }).click();
  await expect(teacher.locator(".delayed-when")).toHaveText("Best a week or more after the post-test. Days since: 0.");
  await phases.getByRole("button", { name: "Delayed post-test" }).click();
  await expect(phases.getByRole("button", { name: "Delayed post-test" })).toHaveAttribute("aria-pressed", "true");

  // A student signed in on a board gets the delayed post-test.
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(on[0]));
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  await expect(student.getByText("Delayed post-test", { exact: true })).toBeVisible();
  await expect(student.getByText("Question 1 of 4")).toBeVisible();
  await student.context().close();

  await sit(on[0].code, "delayed", 4, 3);
  await sit(off[0].code, "delayed", 4, 1);
  await teacher.getByRole("button", { name: "Refresh" }).click();
  await expect(teacher.locator(".delayed-when")).toHaveText("Taken 0 days after the post-test.");
  const card = teacher.locator(".tests-card");
  await expect(card.locator("thead th")).toHaveText(["", "Spaced review", "No spaced review", "d"]);
  await expect(card.locator("tr[data-test]")).toHaveCount(2); // no pre-test in this class
  // By intention to treat: the student who sat nothing counts as 0 in their arm.
  const post = card.locator('tr[data-test="post"] td');
  await expect(post.nth(0)).toContainText("50% (SD 70.7, n = 2)");
  await expect(post.nth(0)).toContainText("1 of 2 finished");
  await expect(post.nth(1)).toContainText("50% (SD 0, n = 2)");
  await expect(post.nth(1)).toContainText("2 of 2 finished");
  const delayed = card.locator('tr[data-test="delayed"] td');
  await expect(delayed.nth(0)).toContainText("38% (SD 53, n = 2)");
  await expect(delayed.nth(1)).toContainText("13% (SD 17.7, n = 2)");
  await expect(delayed.nth(1)).toContainText("1 of 2 finished");
  await expect(teacher.locator(".heat thead")).toContainText("Delayed post-test");
  await expect(teacher.locator(".heat .heat-group").first()).toContainText("Spaced review (2)");
  await teacher.close();
});

test("in a class testing what was hard, a student in the arm without it isn't asked, and their answers still reach the server", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const { code } = await (await request.post("/api/classes", { data: { name: "Hard or not", skills: ["fractions"], feature: "hard" }, headers })).json();
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push(await (await request.post("/api/students", { data: { class: code } })).json());
  const without = joined.find((j) => j.arm === "off");
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(without));
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  await expect(student.getByText(/Chosen for you: Fractions/)).toBeVisible();
  await student.getByLabel("Your answer").fill("12345");
  await student.getByRole("button", { name: "Check" }).click();
  await expect(student.locator(".practice-verdict.bad")).toBeVisible();
  await student.getByRole("button", { name: "Show solution" }).click();
  await expect(student.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(student.getByRole("group", { name: "What exactly was hard? Tick everything that was." })).toHaveCount(0);
  await student.getByRole("button", { name: "Next" }).click();
  const rows = async () => (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text()).trim().split("\n");
  await expect.poll(async () => (await rows()).length).toBe(2);
  const [head, row] = (await rows()).map((r) => r.split(","));
  expect([row[head.indexOf("feature")], row[head.indexOf("arm")]]).toEqual(["hard", "off"]);
});

test("in a class testing step-down, two early misses bring a question on the weakest idea, labelled, and it reaches the server as one", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const { code } = await (await request.post("/api/classes", { data: { name: "Step down", skills: ["fractions"], feature: "stepdown" }, headers })).json();
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push(await (await request.post("/api/students", { data: { class: code } })).json());
  const withIt = joined.find((j) => j.arm === "on");
  // Two fractions questions missed in class practice, from another device.
  for (const seed of [1, 2]) {
    const data = {
      clientId: `e2e-step-${seed}-${Date.now()}`, student: withIt.code, skill: "fractions", level: 1, seed, review: false, outcome: "revealed", policy: "adaptive",
      predicted: 0.7, solutionViewed: true, msTotal: 20000, shownAt: Date.now() - 20000, answers: [{ input: "12345", verdict: "wrong", ms: 9000 }],
    };
    expect((await request.post("/api/attempts", { data })).status()).toBe(201);
  }
  const plan = await (await request.get(`/api/students/${withIt.code}/plan`)).json();
  expect(plan.stepDown.now.left).toBe(3);
  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(withIt));
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  const idea = en.pracWords.ideas[plan.stepDown.now.idea as keyof typeof en.pracWords.ideas];
  await expect(student.getByText(`A step back to one idea: ${idea}`)).toBeVisible();
  await student.getByRole("button", { name: "Show solution" }).click();
  await student.getByRole("button", { name: "Next" }).click();
  const rows = async () => (await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text()).trim().split("\n");
  await expect.poll(async () => (await rows()).length).toBe(4);
  const [head, , , row] = (await rows()).map((r) => r.split(","));
  expect([row[head.indexOf("policy")], row[head.indexOf("arm")]]).toEqual(["stepdown", "on"]);
  expect((await (await request.get(`/api/students/${withIt.code}/plan`)).json()).stepDown.now.left).toBe(2);
});

test("a skill mastered, then kept by a right review days later: the student's panel and the teacher's mastery view show both", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const name = `Kept ${Date.now()}`;
  const { code } = await (await request.post("/api/classes", { data: { name, skills: ["linear", "quadratic"] }, headers })).json();
  const joined = await (await request.post("/api/students", { data: { class: code } })).json();
  const plan = async () => (await (await request.get(`/api/students/${joined.code}/plan`)).json()) as { spacing: Record<string, unknown> };
  const DAY = 86_400_000;
  let at = Date.now() - 30 * DAY, n = 0;
  // Right answers until each skill is mastered; then linear's review a day later goes right, and quadratic waits.
  const right = async (skill: string, shownAt: number, policy = joined.condition) => {
    const ex = exercise(skill as "linear", 3, 7, en.pracWords);
    const data = {
      clientId: `e2e-kept-${n++}-${Date.now()}`, student: joined.code, skill, level: 3, seed: 7, review: false, outcome: "solved", policy,
      predicted: 0.7, solutionViewed: false, msTotal: 9000, shownAt, answers: [{ input: ex.plain, verdict: "correct", ms: 9000 }],
    };
    expect((await request.post("/api/attempts", { data })).status()).toBe(201);
  };
  for (const skill of ["linear", "quadratic"])
    for (let i = 0; i < 80 && !(await plan()).spacing[skill]; i++) await right(skill, (at += 60_000));
  await right("linear", at + DAY + 5000, "spaced");
  expect(Object.keys((await plan()).spacing).sort()).toEqual(["linear", "quadratic"]);

  const student = await (await browser.newContext()).newPage();
  const board = await (await request.post("/api/boards", { data: { title: "Student" } })).json();
  await student.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(joined));
  await student.goto(`/#/b/${board.id}`);
  await openPractice(student);
  const holds = student.locator(".practice-holds");
  await expect(holds).toContainText(`Kept, right days later: ${en.pracWords.skills.linear}`);
  await expect(holds).toContainText(`Mastered, a review will check it: ${en.pracWords.skills.quadratic}`);

  const teacher = await (await browser.newContext()).newPage();
  await teacher.addInitScript((pw) => sessionStorage.setItem("zeno.teacher", pw), TEACHER);
  await teacher.goto("/#/teacher");
  await teacher.locator(".class-item", { hasText: name }).click();
  await expect(teacher.locator(".heat-legend")).toContainText(en.teacher.holds.kept);
  const row = teacher.locator(".heat tbody tr").nth(1);
  await expect(row.locator(".heat-kept .heat-hold")).toHaveText("★");
  await expect(row.locator(".heat-mastered .heat-hold")).toHaveText("✓");
  await expect(teacher.locator(".teacher").getByText(en.teacher.metrics.kept)).toBeVisible();
});
