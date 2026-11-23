// "Where it breaks" (issue #577) in class practice: in a class testing it, three right answers in a row bring a worked
// answer to judge; the student says it goes wrong, taps the line and picks the mistake, all by keyboard here, and what
// they said reaches the server. On a phone the working fits the screen.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { classQuestion, toClassPlan } from "../src/learner.ts";
import { breakOf } from "../src/math/whereItBreaks.ts";
import { parseCsv } from "../src/model/evaluate.ts";

const TEACHER = "e2e-teacher";
const w = en.pracWords;

test("three right in a row bring a worked answer to judge: it goes wrong, on this line, with this mistake, and the server has it", async ({ browser, request }) => {
  const headers = { "X-Teacher-Password": TEACHER };
  const { code } = await (await request.post("/api/classes", { data: { name: "Where it breaks", skills: ["fractions"], feature: "breaks" }, headers })).json();
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push(await (await request.post("/api/students", { data: { class: code } })).json());
  const withIt = joined.find((j) => j.arm === "on");
  // Three fractions questions right in class practice, from another device.
  for (const seed of [1, 2, 3]) {
    const data = {
      clientId: `e2e-breaks-${seed}-${Date.now()}`, student: withIt.code, skill: "fractions", level: 1, seed, review: false, outcome: "solved", policy: "adaptive",
      predicted: 0.7, solutionViewed: false, msTotal: 20000, shownAt: Date.now() - 20000, answers: [{ input: exercise("fractions", 1, seed, w).plain, verdict: "correct", ms: 9000 }],
    };
    expect((await request.post("/api/attempts", { data })).status()).toBe(201);
  }
  const plan = await (await request.get(`/api/students/${withIt.code}/plan`)).json();
  expect(plan.breaks.due).toBe("fractions");
  // The page draws its numbers from Math.random; with it fixed, the question is the one this makes, with a mistake.
  const asked = (r: number) => {
    try {
      return classQuestion(toClassPlan(plan), w, {}, () => r);
    } catch {
      return null; // every try the same question, and it can't be worked wrong
    }
  };
  let x = 0.3, q = asked(x);
  while (!q || !breakOf(q.ex, q.breaks!)?.worked.mistake) q = asked((x += 0.0173));
  const b = breakOf(q.ex, q.breaks!)!;

  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(([s, r]) => {
    localStorage.setItem("zeno.student.v1", s as string);
    Math.random = () => r as number;
  }, [JSON.stringify(withIt), x]);
  await page.goto("/#/practice");
  const judge = page.getByRole("region", { name: w.breaks.label });
  await expect(judge).toBeVisible();
  await expect(page.getByText(w.breaks.label)).toBeVisible();
  await expect(judge.locator(".breaks-lines li")).toHaveCount(b.worked.lines.length);
  // Nothing to type: no answer box, no Check.
  await expect(page.getByRole("button", { name: "Check" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/breaks-desktop.png", fullPage: true });

  // By keyboard: "it goes wrong", the line, the mistake.
  await judge.getByRole("button", { name: `✗ ${w.breaks.wrong}` }).focus();
  await page.keyboard.press("Enter");
  await expect(judge.getByText(w.breaks.tapLine)).toBeVisible();
  await judge.getByRole("button", { name: `Line ${b.worked.wrong! + 1}`, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(judge.getByRole("group", { name: w.breaks.pick })).toBeVisible();
  await expect(judge.locator(".breaks-option")).toHaveCount(3);
  await judge.getByRole("button", { name: w.breaks.names[b.worked.mistake!] }).focus();
  await page.keyboard.press("Enter");
  await expect(judge.getByText(`✓ ${w.breaks.found}`)).toBeVisible();
  await expect(judge.getByText(w.breaks.names[b.worked.mistake!], { exact: false })).toBeVisible();
  await expect(judge.locator(".breaks-line.wrong")).toHaveCount(1);
  // Nothing asks what was hard of a question judged.
  await expect(page.getByText(w.ui.whatWasHard)).toHaveCount(0);

  // On a phone: the working and the choices fit, nothing scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.screenshot({ path: "test-results/breaks-phone.png", fullPage: true });

  await page.getByRole("button", { name: "Next →" }).click();
  const rows = async () => parseCsv(await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text());
  await expect.poll(async () => (await rows()).length).toBe(4);
  const row = (await rows()).find((r) => r.policy === "breaks")!;
  expect([row.arm, row.outcome, row.skill, row.seed]).toEqual(["on", "solved", "fractions", String(q.ex.seed)]);
  expect(JSON.parse(row.breaks)).toEqual({ variant: q.breaks, said: "wrong", step: b.worked.wrong, picked: b.worked.mistake });
  expect((await (await request.get(`/api/students/${withIt.code}/plan`)).json()).breaks.due).toBeUndefined();
});
