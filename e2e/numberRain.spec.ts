// Number rain (the fact games): tiles with a number fact fall, and the ringed one is answered from the keyboard
// before it lands. A wave answered right and at once earns three stars and opens the next puzzle; a wrong answer is
// said at once, the fact comes back at the end of the wave ringed in orange, and the wave's facts are listed right
// and still to learn once it is over. The learner's book of facts is kept in the browser.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";
import { rainNow, rainStart } from "../src/math/numberRain.ts";

const SHOTS = process.env.SHOTS_DIR ?? "test-results";

/** The tile to answer now: its id, its fact, and whether it is a missed fact come back. */
const target = (game: Locator) =>
  game.evaluate((g) => {
    const t = g.querySelector<SVGGElement>("g[data-target]");
    return t ? { id: t.dataset.id!, fact: t.dataset.fact!, again: t.dataset.again !== undefined } : null;
  });
/** Types for the target once there is one, and waits until another tile (or none) is the target, unless `stays`. */
async function type(page: Page, game: Locator, what: (fact: string, again: boolean) => string, stays = false) {
  await expect.poll(() => target(game), { timeout: 15_000 }).not.toBeNull();
  const t = (await target(game))!;
  await page.keyboard.type(what(t.fact, t.again));
  if (!stays) await expect.poll(async () => (await target(game))?.id ?? "none").not.toBe(t.id);
  return t;
}

test("number rain, + and −: every fact answered at once earns three stars, lists the facts right and opens the next puzzle", async ({ page }) => {
  const game = await boardWith(page, "Number rain: + and − facts before they land", ".live-rainPlus");
  const { drops } = rainNow(rainStart("plus"));
  const answers = new Map(drops.map((d) => [d.fact.text, String(d.fact.answer)]));
  await expect(game.getByText("Press Start, then type each answer before its tile lands")).toBeVisible();
  await game.getByRole("button", { name: /Start/ }).click();
  await expect(game.getByRole("textbox", { name: "Your answer" })).toBeFocused();
  for (let i = 0; i < drops.length; i++) {
    const t = await type(page, game, (fact) => answers.get(fact)!);
    expect(t.fact).toBe(drops[i].fact.text);
    if (i === 2) await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/number-rain-play.png` });
  }
  // How many were quick depends on the machine's pace, so it is not asked (all quick, a discovery is said before it).
  await expect(game.getByText(new RegExp(`Wave over: ${drops.length} right, \\d+ of them quick ⚡, 0 slips\\. ★★★`))).toBeVisible();
  await expect(game.getByText(`✓ Right: ${drops.length}`)).toBeVisible();
  await expect(game.getByText("✗ To learn: 0")).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/number-rain-done.png` });
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  // Every fact of the wave is in the book now, right once.
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.facts.v1") ?? "{}") as Record<string, { n: number; run: number }>);
  expect(Object.keys(book).sort()).toEqual(drops.map((d) => d.fact.key).sort());
  expect(Object.values(book).every((s) => s.n === 1 && s.run === 1)).toBe(true);
});

test("number rain, × and ÷: a wrong answer is said at once, the fact comes back at the end, and the wave lists it as still to learn", async ({ page }) => {
  const game = await boardWith(page, "Number rain: × and ÷ facts before they land", ".live-rainTimes");
  const { drops } = rainNow(rainStart("times"));
  const answers = new Map(drops.map((d) => [d.fact.text, d.fact.answer]));
  await game.getByRole("button", { name: /Start/ }).click();
  await expect(game.getByRole("textbox", { name: "Your answer" })).toBeFocused();
  // The first fact: one more than its answer cannot become it, so it is wrong as soon as it is typed.
  const first = drops[0].fact;
  const wrong = String(first.answer + 1);
  await type(page, game, () => wrong, true);
  await expect(game.getByText(`${first.text}: not ${wrong}. Try again.`)).toBeVisible();
  await expect(game.getByRole("textbox", { name: "Your answer" })).toHaveText("?");
  // Right now clears it, with no credit; then the rest, and the first again when it comes back.
  await type(page, game, () => String(first.answer));
  await expect(game.getByText(`${first.text} = ${first.answer}. It comes back once more.`)).toBeVisible();
  let back = false;
  for (let i = 1; i <= drops.length; i++) {
    const t = await type(page, game, (fact) => String(answers.get(fact)));
    if (t.again) {
      back = true;
      expect(t.fact).toBe(first.text);
    }
  }
  expect(back).toBe(true);
  await expect(game.getByText(new RegExp(`Wave over: ${drops.length - 1} right, \\d+ of them quick ⚡, 1 slips\\. ★★☆`))).toBeVisible();
  await expect(game.getByText("✗ To learn: 1")).toBeVisible();
  await expect(game.getByText(`${first.text} = ${first.answer} · then right ✓`)).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/number-rain-learn.png` });
  // Two stars pass the puzzle.
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.facts.v1") ?? "{}") as Record<string, { n: number; run: number }>);
  expect(book[first.key]).toMatchObject({ n: 2, run: 1 });
});
