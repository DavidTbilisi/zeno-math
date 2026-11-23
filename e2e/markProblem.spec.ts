// Marking a word problem first (issue #582): in a class testing it, a student in the arm with it marks each sentence
// of a bar-model problem, by tapping and by keyboard, before solving it; one wrong mark is pointed out, solving
// begins, and the marks reach the server with the attempt, one per sentence of the question that was asked.
import { expect, test, type Browser, type APIRequestContext } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise, type SkillId } from "../src/math/practice.ts";
import { parseCsv } from "../src/model/evaluate.ts";

const headers = { "X-Teacher-Password": "e2e-teacher" };
const M = en.pracWords.ui.mark;

async function joinedPage(browser: Browser, request: APIRequestContext, width?: number) {
  const { code } = await (await request.post("/api/classes", { data: { name: "Mark it", skills: ["barModels"], feature: "marking" }, headers })).json();
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push(await (await request.post("/api/students", { data: { class: code } })).json());
  const context = await browser.newContext(width ? { viewport: { width, height: 844 }, hasTouch: true } : {});
  const page = await context.newPage();
  await page.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(joined.find((j) => j.arm === "on")));
  await page.goto("/#/practice");
  return { page, code, without: joined.find((j) => j.arm === "off") };
}

test("a bar-model problem is marked sentence by sentence before it is solved, and the marks reach the server", async ({ browser, request }) => {
  const { page, code } = await joinedPage(browser, request);
  const sentences = page.locator(".mark-problem .sentence");
  await expect(sentences.first()).toBeVisible();
  // Nothing to answer yet: the problem is marked first.
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show solution" })).toHaveCount(0);
  const texts = await sentences.allTextContents();
  const n = texts.length;
  await expect(page.getByRole("button", { name: M.check })).toBeDisabled();

  // The first sentence marked "asked" on purpose, by keyboard: the focus then moves on to the next sentence.
  await sentences.first().click();
  await page.keyboard.press("2");
  await expect(sentences.first()).toContainText(M.name.asked);
  await expect(sentences.nth(1)).toBeFocused();
  // The arrows move back and forth.
  await page.keyboard.press("ArrowUp");
  await expect(sentences.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  // The second by tapping, as a relation; on a problem that compares people, whose amount is bigger is asked too
  // (the first offered is picked), on one that doesn't (posts and gaps), not.
  await sentences.nth(1).click();
  await page.getByRole("group", { name: M.marks }).getByRole("button", { name: M.name.relation }).click();
  const bigger = page.getByRole("group", { name: M.bigger }).getByRole("button");
  if (await bigger.count()) {
    await expect(bigger).toHaveCount(2);
    const who = (await bigger.first().textContent())!;
    await bigger.first().click();
    await expect(sentences.nth(1)).toContainText(who);
  } else await expect(sentences.nth(1)).toContainText(M.name.relation);
  // The rest by keyboard: given, and the last asked.
  for (let i = 2; i < n; i++) {
    await sentences.nth(i).focus();
    await page.keyboard.press(i === n - 1 ? "2" : "1");
  }
  await page.screenshot({ path: test.info().outputPath("marking.png"), fullPage: true });
  await page.getByRole("button", { name: M.check }).click();

  // The first sentence is pointed out (it was marked wrong), and solving begins with the marks still on.
  await expect(page.locator(".mark-problem .practice-verdict")).toContainText("Look again at the highlighted sentence");
  await expect(page.locator(".mark-problem .sentence.pointed")).toContainText(texts[0]);
  await expect(page.getByLabel("Your answer")).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("solving.png"), fullPage: true });
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // The attempt carries a mark per sentence of the question asked, in its order.
  const rows = async () => parseCsv(await (await request.get(`/api/research/attempts.csv?class=${code}`, { headers })).text());
  await expect.poll(async () => (await rows()).length).toBe(1);
  const [row] = await rows();
  const marks = JSON.parse(row.marks) as { picks: string[]; ms: number };
  const asked = exercise(row.skill as SkillId, Number(row.level) as 1 | 2 | 3, Number(row.seed), en.pracWords).marked!;
  expect(asked.map((s) => s.text)).toEqual(texts);
  expect(marks.picks).toHaveLength(n);
  expect(marks.picks[0]).toBe("asked");
  expect(marks.picks[1]).toBe("relation:0");
  // The rest as marked: given, and the last asked (a problem of two sentences has only the two above).
  expect(marks.picks.slice(2)).toEqual(Array.from({ length: n - 2 }, (_, i) => (i === n - 3 ? "asked" : "given")));
  expect(marks.ms).toBeGreaterThan(0);
});

test("at phone width the sentences and the marks fit, and the arm without marking solves as before", async ({ browser, request }) => {
  const { page, without } = await joinedPage(browser, request, 390);
  await expect(page.locator(".mark-problem .sentence").first()).toBeVisible();
  await page.locator(".mark-problem .sentence").first().tap();
  await page.getByRole("group", { name: M.marks }).getByRole("button", { name: M.name.given }).tap();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath("phone.png"), fullPage: true });

  const other = await (await browser.newContext()).newPage();
  await other.addInitScript((s) => localStorage.setItem("zeno.student.v1", s), JSON.stringify(without));
  await other.goto("/#/practice");
  await expect(other.getByLabel("Your answer")).toBeVisible();
  await expect(other.locator(".practice-prompt")).toContainText("?");
  await expect(other.locator(".mark-problem")).toHaveCount(0);
});
