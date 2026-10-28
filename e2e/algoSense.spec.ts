// Algorithm-sense games: be the sort and be the search, each one's first puzzle played move by move as the algorithm
// makes them, and a wrong tap refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { checkOp, expect as next, replay, SEARCH_LADDER, searchNow, searchRun, type Machine } from "../src/math/beSearch.ts";
import { SORT_LADDER, sortNow, sortRun } from "../src/math/beSort.ts";
import { name } from "../src/math/graphPlay.ts";
import { fill } from "../src/math/text.ts";
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

const task = searchNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const search = searchRun(task);
/** The spots' names: a place by its letter, a queue cell by index and what is in it, the v box. */
const cell = (m: Machine, i: number) => `queue[${i}]${m.cells[i] >= 0 ? ` = ${name(m.cells[i])}` : ""}`;

test("be the search: BFS run operation by operation, front of the queue into v and new neighbours in at tail, earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Be the search: BFS, DFS, Dijkstra", ".live-beSearch");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = replay(task, search.ops.slice(0, k));
    const code = search.ops[k];
    if (code < 0) await tap(cell(m, m.head)).then(() => tap("v"));
    else await tap(name(code)).then(() => tap(cell(m, m.tail)));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${search.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < search.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`Queue empty: all ${task.g.pts.length} places visited, layer by layer, FIFO! ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(SEARCH_LADDER).toHaveLength(9);
});

test("be the search: the front of the queue dragged into v, then a neighbour out of turn refused with why", async ({ page }) => {
  const game = await boardWith(page, "Be the search: BFS, DFS, Dijkstra", ".live-beSearch");
  const from = game.getByRole("button", { name: `queue[0] = ${name(task.s)}`, exact: true });
  const to = game.getByRole("button", { name: "v", exact: true });
  await expect(from).toBeVisible();
  await expect(async () => {
    const [a, b] = [(await from.boundingBox())!, (await to.boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(game.getByText(`v = queue[0] = ${name(task.s)}; head = 1`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  const m = replay(task, [-1]);
  const e = next(m);
  const wrong = m.todo[1];
  if (e?.kind !== "in" || wrong === undefined) throw new Error("the start has two new neighbours");
  const c = checkOp(m, { kind: "in", v: wrong, i: m.tail });
  if (c.ok) throw new Error("the second neighbour is not next");
  await game.getByRole("button", { name: name(wrong), exact: true }).dispatchEvent("click");
  await game.getByRole("button", { name: cell(m, m.tail), exact: true }).dispatchEvent("click");
  await expect(game.getByText(fill(en.live.beSearch.why[c.why], c.vars))).toBeVisible();
  await expect(game.getByText(`Operations: 1 of ${search.ops.length}`)).toBeVisible();
});
