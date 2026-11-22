// Tile drop, played in real time: each bar sent to its group's row clears every row clean; one bar sent first to a
// row it overfills jams, falls on, and still clears where it belongs, for two stars.
import { expect, test, type Page } from "@playwright/test";
import { sumOf } from "../src/math/makeOne.ts";
import { planRows, ROWS, TILE_LADDER, tileNow } from "../src/math/tileDrop.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR ?? "test-results";
const waveOf = (stage: number) => {
  const { spec, drops } = tileNow({ mode: "puzzle", stage, level: 1, seed: 1 });
  return { spec, drops, plan: planRows(drops) };
};

/** Starts the wave of a puzzle (those before it passed); the lowest bar goes to its planned row, except that bar `jam.i` goes to row `jam.r` once first. */
async function play(page: Page, stage: number, jam: { i: number; r: number } | null) {
  const { plan } = waveOf(stage);
  const stars = TILE_LADDER.map((_, k) => (k < stage ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.tiledrop.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Tile drop: fill rows of a wall to exactly one whole", ".live-tileDrop");
  if (stage) await game.getByRole("button", { name: new RegExp(`^Puzzle ${stage + 1}`) }).click();
  else await game.getByRole("button", { name: /Start/ }).click();
  await page.waitForFunction(({ plan, jam }) => {
    const g = document.querySelector(".live-tileDrop")!;
    if (/Wave over/.test(g.textContent ?? "")) return true;
    const w = window as unknown as { jammed?: boolean };
    const bar = g.querySelector<SVGGElement>("g[data-falling]");
    if (!bar) return false;
    const i = Number(bar.dataset.i);
    const r = jam && jam.i === i && !w.jammed ? jam.r : plan[i];
    if (r !== plan[i]) w.jammed = true;
    g.querySelector(`g[data-row="${r}"]`)!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, button: 0 }));
    return false;
  }, { plan, jam }, { polling: 60, timeout: 60_000 });
  return game;
}

test("tile drop: every bar to its group's row clears every row clean and opens the next puzzle", async ({ page }) => {
  const { spec } = waveOf(0);
  const game = await play(page, 0, null);
  await expect(game.getByText(`Wave over: ${spec.goal} of ${spec.goal} rows cleared, 0 jammed. ★★★`)).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/tile-drop-done.png` });
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(TILE_LADDER.length).toBe(9);
});

test("tile drop: a bar sent to a row it overfills jams, then clears where it belongs", async ({ page }) => {
  // Puzzle 3 has two groups under way at once. The first bar that would take some other row past one, with the rows as the plan leaves them.
  const { spec, drops, plan } = waveOf(2);
  expect(spec.open).toBe(2);
  const rows = Array.from({ length: ROWS }, () => [] as (typeof drops)[number]["f"][]);
  let jam: { i: number; r: number } | null = null;
  drops.forEach((d, i) => {
    for (let r = 0; r < ROWS && !jam; r++) if (r !== plan[i] && sumOf([...rows[r], d.f]).toNumber() > 1) jam = { i, r };
    const next = [...rows[plan[i]], d.f];
    rows[plan[i]] = sumOf(next).isOne() ? [] : next;
  });
  expect(jam).not.toBeNull();
  const game = await play(page, 2, jam);
  await expect(game.getByText(`Wave over: ${spec.goal} of ${spec.goal} rows cleared, 1 jammed. ★★☆`)).toBeVisible();
  await expect(game.getByText("✗ jams: 1")).toBeVisible();
});
