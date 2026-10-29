// Free practice in the browser: a wrong answer that a known mistake gives is named under the verdict and the question is
// worked in steps, an inequality typed with ≥ is accepted, and the page counts a session of ten and sums it up. The dialog's question comes from Math.random, so the test fixes it, works out the same
// question here, and types its answers.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, stepsOf, trapInputs, type Exercise, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;
const seedOf = (r: number) => Math.floor(r * 2 ** 31);

/** A value for Math.random whose question has the wanted kind of trap. */
function questionWith(skill: SkillId, ok: (ex: Exercise) => boolean): { r: number; ex: Exercise } {
  for (let i = 1; i < 500; i++) {
    const r = i / 501;
    const ex = exercise(skill, 1, seedOf(r), w);
    if (ok(ex)) return { r, ex };
  }
  throw new Error(`no ${skill} question found`);
}

async function practise(page: Page, request: APIRequestContext, area: string, skill: string, r: number) {
  const board = await (await request.post("/api/boards", { data: { title: "Practice" } })).json();
  await page.goto(`/#/b/${board.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: area }).click();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: skill, exact: true }).click();
}

test("a known mistake is named, still counts as a miss, and the question is then worked in steps", async ({ page, request }) => {
  const { r, ex } = questionWith("fractions", (e) => trapInputs(e).some((t) => t.id === "addAcross"));
  const typed = trapInputs(ex).find((t) => t.id === "addAcross")!.input;
  const want = check(ex, typed, w);
  expect(want.mistake).toBe("addAcross");
  await practise(page, request, "Number", "Fractions", r);
  await page.getByLabel("Your answer").fill(typed);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".practice-verdict.bad")).toContainText("Not quite — try again.");
  await expect(page.locator(".practice-hint")).toHaveText(want.hint!);
  // Each step in turn, the first missed once; the whole question waits until the last is done.
  const steps = stepsOf(ex, w);
  await expect(page.getByLabel("Your answer")).toBeDisabled();
  const first = page.getByLabel(`Step 1 of ${steps.length}`);
  await first.fill("12345");
  await first.press("Enter");
  await expect(page.locator(".practice-steps .practice-verdict.bad")).toBeVisible();
  for (const [i, step] of steps.entries()) {
    const field = page.getByLabel(`Step ${i + 1} of ${steps.length}`);
    await field.fill(step.plain);
    await field.press("Enter");
  }
  await expect(page.getByText(w.ui.stepsDone)).toBeVisible();
  // The right answer still goes through.
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("an inequality is accepted however its sign is typed", async ({ page, request }) => {
  const { r, ex } = questionWith("inequalities", (e) => /[<>]=/.test(e.plain));
  await practise(page, request, "Algebra", "Inequalities", r);
  await page.getByLabel("Your answer").fill(ex.plain.replace(">=", "≥").replace("<=", "≤"));
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("practice has a page of its own, reached from the home page", async ({ page }) => {
  const { r, ex } = questionWith("fractions", () => true);
  await page.goto("/");
  await page.getByRole("link", { name: /Start practising/ }).click();
  await expect(page).toHaveURL(/#\/practice$/);
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  // No board to insert into: no worksheet and no Insert button.
  await expect(page.getByRole("radio", { name: w.ui.sheet })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Insert" })).toHaveCount(0);
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});

test("the practice page counts a session of ten and sums it up", async ({ page }) => {
  const { r } = questionWith("fractions", () => true);
  await page.goto("/#/practice");
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  const session = page.getByRole("region", { name: w.ui.sessionTitle });
  await expect(session).toContainText("0 of 10 questions");
  for (let i = 1; i <= 10; i++) {
    await page.getByRole("button", { name: "Show solution" }).click();
    await expect(session).toContainText(`${i} of 10 questions`);
    await page.getByRole("button", { name: i < 10 ? "Next →" : w.ui.seeSummary }).click();
  }
  await expect(page.getByRole("heading", { name: w.ui.sessionDone })).toBeVisible();
  await expect(page.getByText("You got 0 of 10 right.")).toBeVisible();
  await expect(page.getByText("Fractions: 0 of 10")).toBeVisible();
  // The missed question waits to come back; another session starts from nothing.
  await expect(page.getByRole("region", { name: w.ui.comingBack })).toContainText("Fractions");
  await page.getByRole("button", { name: "Another 10 questions" }).click();
  await expect(session).toContainText("0 of 10 questions");
  await expect(page.locator(".practice-prompt")).toBeVisible();
});

test("on a board, practice opens beside it and stays while other tools are used", async ({ page, request }) => {
  const board = await (await request.post("/api/boards", { data: { title: "Docked" } })).json();
  await page.goto(`/#/b/${board.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  const dock = page.getByRole("complementary", { name: "Practice" });
  await expect(dock).toBeVisible();
  // Not a dialog over the board: the board is still there to work on beside it.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const boardBox = (await page.locator(".canvas-wrap").boundingBox())!;
  const dockBox = (await dock.boundingBox())!;
  expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(dockBox.x + 1);
  // Typing an answer stays in the answer field rather than reaching the board's shortcuts (algebra: every answer is typed).
  await dock.getByRole("tab", { name: "Algebra" }).click();
  await dock.getByLabel("Your answer").pressSequentially("2; -3");
  await expect(dock.getByLabel("Your answer")).toHaveValue("2; -3");
  // Inserting the question puts it on the board and practice goes on.
  await dock.getByRole("button", { name: "Insert" }).click();
  await expect(page.getByRole("button", { name: /Edit practice sheet/ })).toBeVisible();
  await expect(dock).toBeVisible();
  // Another tool opens as a dialog while practice stays docked.
  await page.getByRole("button", { name: /Algebra/ }).click();
  await page.getByRole("menuitem", { name: /Formula/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(dock).toBeVisible();
  await page.keyboard.press("Escape");
  await dock.getByRole("button", { name: "Close" }).click();
  await expect(dock).toHaveCount(0);
});

test("the practice page finds the learner's grade by halving, then practises it, and the home page says where they are", async ({ page }) => {
  const g = w.grades;
  await page.goto("/#/practice");
  const card = page.getByRole("region", { name: g.title });
  await expect(card).toContainText(g.intro);
  await card.getByRole("button", { name: g.place }).click();
  // Every question missed: each rules out the grades from its own up, so three questions leave grade 1.
  for (const left of ["grade 1 to university", "grade 1 to grade 5", "grade 1 to grade 2"]) {
    await expect(card).toContainText(`Still possible: ${left}.`);
    await page.getByRole("button", { name: "Show solution" }).click();
    await page.getByRole("button", { name: "Next →" }).click();
  }
  await expect(card).toContainText("You are in grade 1");
  await expect(card).toContainText("0 of 9 levels secure");
  await expect(card.locator(".grade-ladder li.here")).toHaveText("1");
  // The grade's own practice: no topics to pick, and a way back to them.
  await expect(page.getByText("Practise grade 1")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Algebra" })).toHaveCount(0);
  await page.getByRole("button", { name: g.topics }).click();
  await expect(page.getByRole("tab", { name: "Algebra" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Practise grade 1" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("You are working on grade 1")).toBeVisible();
});
