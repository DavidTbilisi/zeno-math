// Free practice in the browser: a wrong answer that a known mistake gives is named under the verdict and the question is
// worked in steps, an inequality typed with ≥ is accepted, and the page counts a session of ten and sums it up; calm is a switch that
// stills practice and the games alike. The dialog's question comes from Math.random, so the test fixes it, works out the same
// question here, and types its answers.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, stepsOf, trapInputs, type Exercise, type SkillId } from "../src/math/practice.ts";
import { boardWith } from "./helpers.ts";

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
  // A question without steps, so a miss doesn't start fading worked examples (that has a test of its own).
  const { r } = questionWith("fractions", (e) => stepsOf(e, w).length < 2);
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

test("a session of five ends on a full ring, keeps the choice, and waits for a tap to start again", async ({ page }) => {
  const { r } = questionWith("fractions", (e) => stepsOf(e, w).length < 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/practice");
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  const ring = page.getByRole("region", { name: w.ui.sessionTitle });
  // On a phone the ring is with the question, not below the fold.
  await expect(ring).toBeInViewport();
  await ring.getByRole("radio", { name: "5 questions" }).click();
  await expect(ring).toContainText("0 of 5 questions");
  for (let i = 1; i <= 5; i++) {
    await page.getByRole("button", { name: "Show solution" }).click();
    // Once the session is under way its length is set.
    await expect(ring.getByRole("radio")).toHaveCount(0);
    await expect(ring).toContainText(`${i} of 5 questions`);
    await page.getByRole("button", { name: i < 5 ? "Next →" : w.ui.seeSummary }).click();
  }
  await expect(page.getByRole("heading", { name: w.ui.sessionDone })).toBeVisible();
  await expect(page.getByText("You got 0 of 5 right.")).toBeVisible();
  // No session starts by itself: the summary stays until the student taps.
  await page.waitForTimeout(1500);
  await expect(page.getByRole("heading", { name: w.ui.sessionDone })).toBeVisible();
  await expect(page.locator(".practice-prompt")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Another 5 questions" })).toBeFocused();
  // Kept in this browser.
  await page.reload();
  await expect(ring).toContainText("0 of 5 questions");
  await ring.getByRole("radio", { name: "10 questions" }).click();
  await expect(ring).toContainText("0 of 10 questions");
});

test("after about 25 minutes of answering, a word about a break that the student can wave away", async ({ page }) => {
  const { r } = questionWith("fractions", (e) => stepsOf(e, w).length < 2);
  await page.clock.install();
  await page.goto("/#/practice");
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  const prompt = page.getByRole("status").filter({ hasText: w.ui.breakTime });
  // An answer every four minutes: the stretch reaches 25 minutes at the eighth (0, 4, ... 28).
  for (let i = 1; i <= 8; i++) {
    if (i > 1) await page.clock.fastForward("04:00");
    await page.getByRole("button", { name: "Show solution" }).click();
    await expect(prompt).toHaveCount(i < 8 ? 0 : 1);
    await page.getByRole("button", { name: "Next →" }).click();
  }
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: w.ui.breakOn }).click();
  await expect(prompt).toHaveCount(0);
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(prompt).toHaveCount(0);
});

test("too easy moves the next questions up a level, too hard down, and the ends say so", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  const rating = page.getByRole("group", { name: w.ui.rateAsk });
  await expect(rating).toHaveCount(0);
  await page.getByRole("button", { name: "Show solution" }).click();
  await rating.getByRole("button", { name: `😌 ${w.ui.rate.easy}` }).click();
  await expect(rating).toContainText("Next questions: medium.");
  await expect(rating.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "medium" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.locator(".practice-question")).toContainText("medium");
  // Too hard goes back down, and below easy there is nowhere to go.
  await page.getByRole("button", { name: "Show solution" }).click();
  await rating.getByRole("button", { name: `😓 ${w.ui.rate.hard}` }).click();
  await expect(rating).toContainText("Next questions: easy.");
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await rating.getByRole("button", { name: `😓 ${w.ui.rate.hard}` }).click();
  await expect(rating).toContainText(w.ui.rateBottom);
  await expect(page.getByRole("radio", { name: "easy" })).toHaveAttribute("aria-checked", "true");
});

test("calm hides the sound switch and stills the page, is remembered, and the games share it", async ({ page }) => {
  await page.goto("/#/practice");
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  const calm = page.getByRole("button", { name: `🌙 ${w.ui.calm}` });
  await expect(calm).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: w.ui.sound })).toBeVisible();
  await calm.click();
  await expect(calm).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: w.ui.sound })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-feel", "calm");
  // Kept in this browser: after a reload practice is still calm.
  await page.reload();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  await expect(page.getByRole("button", { name: `🌙 ${w.ui.calm}` })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-feel", "calm");
  // A game on a board is calm too, with no sound switch; turning calm off there brings the sound switch back.
  const game = await boardWith(page, "Make the target: cards and signs", ".live-target");
  const g = en.live.game;
  await expect(game.getByRole("button", { name: `🌙 ${g.calm}` })).toHaveAttribute("aria-pressed", "true");
  await expect(game.getByTitle(g.sound)).toHaveCount(0);
  await game.getByRole("button", { name: `🌙 ${g.calm}` }).click();
  await expect(game.getByTitle(g.sound)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-feel", "arcade");
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

test("scratch paper on the practice page draws, rubs out, lifts whole lines, undoes, and is clean for the next question", async ({ page }) => {
  const s = w.ui.scratch;
  await page.goto("/#/practice");
  await page.getByRole("button", { name: s.title }).click();
  const sheet = page.locator(".scratch-sheet canvas");
  const undo = page.getByRole("button", { name: s.undo });
  await expect(undo).toBeDisabled();
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  const line = async (x0: number, y0: number, x1: number, y1: number) => {
    await page.mouse.move(box.x + x0, box.y + y0);
    await page.mouse.down();
    await page.mouse.move(box.x + x1, box.y + y1, { steps: 8 });
    await page.mouse.up();
  };
  const inked = () =>
    sheet.evaluate((c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.filter((a, i) => i % 4 === 3 && a > 0).length);
  // Two lines, far apart.
  await line(20, 40, 200, 40);
  const one = await inked();
  expect(one).toBeGreaterThan(100);
  await line(20, 140, 200, 140);
  const two = await inked();
  expect(two).toBeGreaterThan(one);
  // The eraser rubs out only what it passes over.
  await page.getByRole("button", { name: `🧽 ${s.rub}`, exact: true }).click();
  await line(110, 20, 110, 60);
  const rubbed = await inked();
  expect(rubbed).toBeLessThan(two);
  expect(rubbed).toBeGreaterThan(two - one);
  // The line eraser takes the whole of a line it touches, and leaves the other.
  await page.getByRole("button", { name: s.lift }).click();
  await line(60, 130, 60, 150);
  expect(await inked()).toBe(rubbed - (two - one));
  // Undo puts the lifted line back, then the rubbed-out piece.
  await undo.click();
  expect(await inked()).toBe(rubbed);
  await undo.click();
  expect(await inked()).toBe(two);
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("button", { name: s.title })).toHaveAttribute("aria-pressed", "true");
  await expect(undo).toBeDisabled();
  expect(await inked()).toBe(0);
});

test("with dots on, the scratch pen draws and the eraser rubs straight from dot to dot, the line eraser cuts at dots, and the choice is remembered", async ({ page }) => {
  const s = w.ui.scratch;
  await page.goto("/#/practice");
  await page.getByRole("button", { name: s.title }).click();
  const dots = page.getByRole("button", { name: s.dots });
  await dots.click();
  await expect(dots).toHaveAttribute("aria-pressed", "true");
  const sheet = page.locator(".scratch-sheet canvas");
  await sheet.scrollIntoViewIfNeeded();
  const box = (await sheet.boundingBox())!;
  // A wobbly drag from near (40, 40) to near (160, 40) becomes the straight line between those dots.
  await page.mouse.move(box.x + 43, box.y + 37);
  await page.mouse.down();
  for (const [x, y] of [[80, 55], [120, 25], [157, 44]]) await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
  await page.mouse.up();
  const ink = await sheet.evaluate((c: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const at = (x: number, y: number) => c.getContext("2d")!.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data[3] > 0;
    return { line: [40, 70, 100, 130, 160].every((x) => at(x, 40)), above: at(100, 30), below: at(100, 50), past: at(170, 40) };
  });
  expect(ink).toEqual({ line: true, above: false, below: false, past: false });
  // A second line one square below; the eraser on dots takes out the stretch from 80 to 120 of the first line only.
  const drag = async (x0: number, y0: number, x1: number, y1: number) => {
    await page.mouse.move(box.x + x0, box.y + y0);
    await page.mouse.down();
    await page.mouse.move(box.x + x1, box.y + y1, { steps: 6 });
    await page.mouse.up();
  };
  await drag(38, 62, 162, 58);
  await page.getByRole("button", { name: `🧽 ${s.rub}`, exact: true }).click();
  await drag(83, 45, 117, 36);
  const left = await sheet.evaluate((c: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const at = (x: number, y: number) => c.getContext("2d")!.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data[3] > 0;
    return { kept: [50, 70, 130, 150].every((x) => at(x, 40)), gone: [85, 100, 115].some((x) => at(x, 40)), below: [70, 100, 130].every((x) => at(x, 60)) };
  });
  expect(left).toEqual({ kept: true, gone: false, below: true });
  // The line eraser on dots takes from the second line only the piece between the dots either side of where it
  // touches (40 to 60), even with a shaky press, and undo puts it back.
  await page.getByRole("button", { name: s.lift }).click();
  await page.mouse.move(box.x + 52, box.y + 63);
  await page.mouse.down();
  await page.mouse.move(box.x + 57, box.y + 58, { steps: 3 });
  await page.mouse.up();
  const second = () =>
    sheet.evaluate((c: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const at = (x: number, y: number) => c.getContext("2d")!.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data[3] > 0;
      return [45, 55, 65, 100, 155].map((x) => at(x, 60));
    });
  expect(await second()).toEqual([false, false, true, true, true]);
  await page.getByRole("button", { name: s.undo }).click();
  expect(await second()).toEqual([true, true, true, true, true]);
  await page.reload();
  await expect(page.getByRole("button", { name: s.dots })).toHaveAttribute("aria-pressed", "true");
});

test("a level made secure comes back for review a day later, then three days after a right review", async ({ page }) => {
  const DAY = 86_400_000;
  const T = new Date("2026-11-02T09:00:00Z").getTime();
  // Only the date is faked: the page's timers run as usual.
  await page.clock.setFixedTime(T);
  const { r, ex } = questionWith("fractions", () => true);
  await page.goto("/#/practice");
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  const answer = async () => {
    await page.getByLabel("Your answer").fill(ex.plain);
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("Correct!")).toBeVisible();
  };
  const spacing = () => page.evaluate(() => JSON.parse(localStorage.getItem("zeno.practice.v1")!).spacing?.["fractions.1"] ?? null);
  // Three right at the first try make the level secure: its review falls a day later, and isn't asked before then.
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole("button", { name: "Next →" }).click();
    await answer();
  }
  expect(await spacing()).toEqual({ step: 0, due: T + DAY });
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.locator(".practice-review")).toHaveCount(0);

  // Two days on, the review comes first, marked as one; answered right, the next falls three days later.
  await page.clock.setFixedTime(T + 2 * DAY);
  await page.getByRole("button", { name: /^Fractions \d+\/\d+$/ }).click();
  await expect(page.locator(".practice-review")).toHaveText(`↻ ${w.ui.spaced}`);
  await answer();
  expect(await spacing()).toEqual({ step: 1, due: T + 5 * DAY });
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.locator(".practice-review")).toHaveCount(0);
});

test("a missed calculus question brings a worked example; the next leaves its last step, then the student solves it alone", async ({ page, request }) => {
  const { r, ex } = questionWith("stationary", (e) => stepsOf(e, w).length === 2);
  const steps = stepsOf(ex, w);
  await practise(page, request, "Calculus", w.skills.stationary, r);
  await expect(page.locator(".practice-prompt")).toHaveText(ex.prompt);
  // Asked whole and missed: a worked example of the same kind, with other numbers, every step done.
  await page.getByLabel("Your answer").fill("12345");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".practice-verdict.bad")).toBeVisible();
  await page.getByRole("button", { name: "Show solution" }).click();
  const example = page.getByRole("region", { name: w.ui.workedExample });
  await expect(example).toBeVisible();
  await expect(example.locator("li.given")).toHaveCount(2);
  await expect(example.locator("input")).toHaveCount(0);

  // The next question of the kind (the same one, Math.random being fixed) has dy/dx done; the student does the rest.
  await page.getByRole("button", { name: "Next →" }).click();
  const faded = page.getByRole("region", { name: w.ui.fadedIntro.replace("{k}", "1").replace("{n}", "2") });
  await expect(faded).toBeVisible();
  await expect(faded.locator("li.given")).toContainText(steps[0].prompt);
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
  const last = faded.getByLabel("Step 2 of 2");
  await last.fill(ex.plain);
  await last.press("Enter");
  await expect(page.getByRole("button", { name: "Next →" })).toBeVisible();

  // Then nothing is given: the student solves it alone, and the fading is over.
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(faded).toHaveCount(0);
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(page.locator(".practice-steps")).toHaveCount(0);
});
