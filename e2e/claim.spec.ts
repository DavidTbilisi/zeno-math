// Claim what you know, then prove it (#823): on the grade being worked on, the learner ticks two skills; the proof asks
// each at its hardest level in the grade, in turns; two right at the first try prove one, a miss leaves the other to
// practise; the proved skill's levels are secure and marked proved. Math.random is fixed, so every question here is
// worked out the same way and its answer typed.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, type SkillId } from "../src/math/practice.ts";
import { fill } from "../src/math/text.ts";
import { claimable, startClaim } from "../src/model/claim.ts";

const w = en.pracWords;
const SHOTS = process.env.SHOTS_DIR;
const G = 7 as const;
const r = 0.3141;
const seed = Math.floor(r * 2 ** 31);
// Two skills of the grade whose question at that seed takes one number typed in the answer box.
const [a, b] = startClaim(G, claimable(G, {})).proofs
  .map((p) => ({ ...p, ex: exercise(p.skill, p.level, seed, w) }))
  .filter(({ ex }) => ex.answer.k === "num" && !ex.marked?.length && check(ex, ex.plain, w).ok && !check(ex, "12345", w).ok);

test("two skills claimed: the one answered right twice is proved and secure, the one missed is left to practise", async ({ page }) => {
  expect(a && b).toBeTruthy();
  await page.addInitScript(({ x, p }) => {
    Math.random = () => x;
    localStorage.setItem("zeno.practice.v1", p);
  }, { x: r, p: JSON.stringify({ stats: {}, mistakes: [], answered: 0, placed: G }) });
  await page.goto("/#/practice");
  const card = page.locator(".grade-card");
  await card.getByRole("button", { name: w.grades.claim }).click();
  const name = (s: SkillId) => w.skills[s];
  await card.getByLabel(name(a.skill), { exact: true }).check();
  await card.getByLabel(name(b.skill), { exact: true }).check();
  if (SHOTS) await card.screenshot({ path: `${SHOTS}/claim-pick.png` });
  await card.getByRole("button", { name: fill(w.grades.prove, { n: 4 }) }).click();

  const answer = async (typed: string[], skill: SkillId) => {
    await expect(card).toContainText(name(skill));
    for (const t of typed) {
      await page.getByLabel("Your answer").fill(t);
      await page.getByRole("button", { name: "Check", exact: true }).click();
    }
    await expect(page.locator(".practice-verdict.ok")).toBeVisible();
    await page.getByRole("button", { name: `${w.ui.next} →` }).click();
  };
  await answer([a.ex.plain], a.skill); // a: 1 of 2
  await answer(["12345", b.ex.plain], b.skill); // b: missed at the first try
  await answer([a.ex.plain], a.skill); // a: proved

  const result = card.getByRole("list", { name: w.grades.claimResult });
  await expect(result).toContainText(fill(w.grades.provedOne, { skill: name(a.skill) }));
  await expect(result).toContainText(fill(w.grades.missedOne, { skill: name(b.skill) }));
  if (SHOTS) await card.screenshot({ path: `${SHOTS}/claim-result.png` });
  const cells = await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.practice.v1")!).cells);
  expect(cells[`${a.skill}.${a.level}`]).toMatchObject({ run: 3, proved: true });
  expect(cells[`${b.skill}.${b.level}`]?.run ?? 0).toBe(0);
  // The grade's practice goes on, without the skill proved among those to claim.
  await card.getByRole("button", { name: w.grades.claim }).click();
  await expect(card.getByLabel(name(a.skill), { exact: true })).toHaveCount(0);
  await expect(card.getByLabel(name(b.skill), { exact: true })).toHaveCount(1);
});
