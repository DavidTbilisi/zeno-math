// Algorithm-sense games: be the sort, its first puzzle played move by move as bubble sort makes them, and a wrong
// tap refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { SORT_LADDER, sortNow, sortRun } from "../src/math/beSort.ts";
import { boardWith } from "./helpers.ts";

const run = sortRun(sortNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 }));
const gap = (i: number) => `Gap ${i + 1}`;

test("be the sort: bubble sort's swaps tapped in turn earn three stars and open the next", async ({ page }) => {
  const game = await boardWith(page, "Be the sort: you are the algorithm", ".live-beSort");
  const tap = (move: number) => game.getByRole("button", { name: gap(move), exact: true }).dispatchEvent("click");
  await expect(async () => {
    await tap(run.moves[0]);
    await expect(game.getByText(`Moves: 1 of ${run.moves.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (const m of run.moves.slice(1)) await tap(m);
  await expect(game.getByText(new RegExp(`Sorted in ${run.moves.length} swaps, just as bubble sort does! ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(SORT_LADDER).toHaveLength(9);
});

test("be the sort: a tap on two neighbours in order is refused and says why", async ({ page }) => {
  const game = await boardWith(page, "Be the sort: you are the algorithm", ".live-beSort");
  const look = run.looks[0];
  if (look.algo !== "bubble") throw new Error("the first puzzle is bubble sort");
  const inOrder = look.a.findIndex((x, i) => i + 1 < look.a.length && x <= look.a[i + 1]);
  await expect(async () => {
    await game.getByRole("button", { name: gap(inOrder), exact: true }).dispatchEvent("click");
    await expect(game.getByText(`${look.a[inOrder]} and ${look.a[inOrder + 1]} are in order already: bubble sort leaves them.`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Moves: 0 of ${run.moves.length}`)).toBeVisible();
});
