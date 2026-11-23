// Double number line by hand: two marks picked, a move off the fewest taken back with ↶, then the flag reached in the
// fewest moves and read across; and level 1's one move (×n or ÷n) straight from the pair.
import { expect, test, type Page } from "@playwright/test";
import { Frac } from "../src/math/fraction.ts";
import { afterMove, DOUBLE_LADDER, doubleNow, fewest, NS, partner, reached, showVal, targetBot, type DMove, type DoubleTask } from "../src/math/doubleLine.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = DOUBLE_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.doubleline.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Double number line: build marks to the missing amount", ".live-doubleLine");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => doubleNow({ mode: "puzzle", stage, level: 1, seed: 1 });

/** The fewest moves to the flag, found the way the board would make them. */
function solve(t: DoubleTask): DMove[] {
  const best = fewest(t)!;
  const go = (ticks: Frac[], left: number): DMove[] | null => {
    if (reached(t, ticks)) return [];
    if (!left) return null;
    for (let i = 0; i < ticks.length; i++)
      for (let j = i + 1; j < ticks.length; j++)
        for (const op of ["split", "times"] as const)
          for (const n of NS) {
            const next = afterMove(ticks, t.end, ticks[i], ticks[j], op, n);
            const rest = next && go(next, left - 1);
            if (rest) return [{ p: `${ticks[i].n}/${ticks[i].d}`, q: `${ticks[j].n}/${ticks[j].d}`, op, n }, ...rest];
          }
    return null;
  };
  return go([Frac.ZERO, new Frac(t.a)], best)!;
}

const mark = (t: DoubleTask, v: Frac) => `Mark ${showVal(v)} ↔ ${showVal(partner(t, v))}`;
async function play(game: ReturnType<Page["locator"]>, t: DoubleTask, m: DMove) {
  const pic = game.locator("svg").first();
  const [p, q] = [Frac.parse(m.p)!, Frac.parse(m.q)!];
  await pic.getByRole("button", { name: mark(t, p), exact: true }).click();
  await pic.getByRole("button", { name: mark(t, q), exact: true }).click();
  const title = m.op === "split" ? `Split ${showVal(p)} to ${showVal(q)} into ${m.n} equal parts` : `Lay the gap ${showVal(p)} to ${showVal(q)} ${m.n} times from ${showVal(p)}`;
  await pic.getByRole("button", { name: title, exact: true }).click();
}

test("double line: a move taken back, then the flag in the fewest moves", async ({ page }) => {
  const s = DOUBLE_LADDER.findIndex((r) => r.level === 2);
  const t = task(s);
  const moves = solve(t);
  expect(moves.length).toBe(2);
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  // A move off the way: the pair split in two, then taken back.
  await play(game, t, { p: "0", q: String(t.a), op: "split", n: 2 });
  await expect(game.getByText(/split into 2:/)).toBeVisible();
  await pic.getByRole("button", { name: "Take back the last move" }).click();
  await expect(game.getByText(/^Tap two marks: a move/)).toBeVisible();
  // One mark picked, then the fewest.
  await pic.getByRole("button", { name: mark(t, Frac.ZERO), exact: true }).click();
  await expect(game.getByText(/^0 picked: tap a second mark\./)).toBeVisible();
  await pic.getByRole("button", { name: mark(t, Frac.ZERO), exact: true }).click();
  await play(game, t, moves[0]);
  if (SHOTS) {
    // The gap of the next move picked, its pills showing, then let go again.
    const marks = [moves[1].p, moves[1].q].map((v) => pic.getByRole("button", { name: mark(t, Frac.parse(v)!), exact: true }));
    for (const m of marks) await m.click();
    await page.screenshot({ path: `${SHOTS}/doubleLine.png` });
    for (const m of marks) await m.click();
  }
  await play(game, t, moves[1]);
  await expect(game.getByText(new RegExp(`Right! ${showVal(t.t)} ↔ ${showVal(targetBot(t))}\\. Moves: 2\\. ★★★`))).toBeVisible();
});

test("double line: level 1 is one move from the pair", async ({ page }) => {
  const t = task(0);
  const [m] = solve(t);
  const game = await open(page, 0);
  await play(game, t, m);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/doubleLineDone.png` });
  await expect(game.getByText(new RegExp(`Moves: 1\\. ★★★`))).toBeVisible();
});
