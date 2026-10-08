// Free practice in the browser: a wrong answer that a known mistake gives is named under the verdict, and an inequality
// typed with ≥ is accepted. The dialog's question comes from Math.random, so the test fixes it, works out the same
// question here, and types its answers.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type Exercise, type SkillId } from "../src/math/practice.ts";

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

test("a known mistake is named, and still counts as a miss", async ({ page, request }) => {
  const { r, ex } = questionWith("fractions", (e) => trapInputs(e).some((t) => t.id === "addAcross"));
  const typed = trapInputs(ex).find((t) => t.id === "addAcross")!.input;
  const want = check(ex, typed, w);
  expect(want.mistake).toBe("addAcross");
  await practise(page, request, "Number", "Fractions", r);
  await page.getByLabel("Your answer").fill(typed);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".practice-verdict.bad")).toContainText("Not quite — try again.");
  await expect(page.locator(".practice-hint")).toHaveText(want.hint!);
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
