// Algorithm-sense games: be the sort, be the search, be the DP, be the binary search and be the two pointers, each one's
// first puzzle played move by move as the algorithm makes them, and a wrong tap refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { checkOp, expect as next, replay, SEARCH_LADDER, searchNow, searchRun, type Machine } from "../src/math/beSearch.ts";
import { SORT_LADDER, sortNow, sortRun } from "../src/math/beSort.ts";
import { binNow, binRun, checkOp as binCheck, expect as binNext, replay as binReplay } from "../src/math/beBinary.ts";
import { checkOp as ptrCheck, expect as ptrNext, ptrNow, ptrRun, replay as ptrReplay } from "../src/math/bePointers.ts";
import { cellName, checkOp as dpCheck, dpNow, dpRun, expect as dpNext, fmt, RETURNS, replay as dpReplay, valueAt } from "../src/math/beDp.ts";
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

const dpTask = dpNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const dp = dpRun(dpTask);

test("be the DP: the stairs table filled operation by operation, each slot read and the sum written, earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeDp, ".live-beDp");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  /** A filled cell's spot is named with what it holds, an empty one by its name alone. */
  const spot = (m: ReturnType<typeof dpReplay>, at: number) => `${cellName(m, "dp", at)}${m.dp[at] === null ? "" : ` = ${valueAt(m, "dp", at)}`}`;
  const op = async (k: number) => {
    const m = dpReplay(dpTask, dp.ops.slice(0, k));
    const e = dpNext(m)!;
    if (e.kind === "read") await tap(spot(m, e.slot.at)).then(() => tap(e.slot.text));
    else if (e.kind === "write") {
      const c = e.plan.cands[dp.ops[k]];
      await tap(`${c.expr} = ${fmt(c.v)}`).then(() => tap(spot(m, e.at)));
    } else await tap(spot(m, dp.ops[k])).then(() => tap(`return ${RETURNS[dpTask.p]}`));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${dp.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < dp.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`8 ways up 5 stairs, each counted from the stairs below! ★★★`))).toBeVisible();
  await expect(game.getByText("return dp[5]  # 8")).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the DP: dp[0] dragged into its slot, then the result dropped on the wrong cell refused with why", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeDp, ".live-beDp");
  const from = game.getByRole("button", { name: "dp[0] = 1", exact: true });
  const to = game.getByRole("button", { name: "dp[i−1]", exact: true });
  await expect(from).toBeVisible();
  await expect(async () => {
    const [a, b] = [(await from.boundingBox())!, (await to.boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(game.getByText("dp[i−1] → dp[0] = 1")).toBeVisible({ timeout: 1000 });
  }).toPass();
  const m = dpReplay(dpTask, [0]);
  const c = dpCheck(m, { kind: "write", k: 0, at: 2 });
  if (c.ok) throw new Error("dp[1] is the cell being filled");
  await game.getByRole("button", { name: "1 = 1", exact: true }).dispatchEvent("click");
  await game.getByRole("button", { name: "dp[2]", exact: true }).dispatchEvent("click");
  await expect(game.getByText(fill(en.live.beDp.why[c.why], c.vars))).toBeVisible();
  await expect(game.getByText(`Operations: 1 of ${dp.ops.length}`)).toBeVisible();
});

const binTask = binNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const bin = binRun(binTask);
/** A column's spot is named by the value in it. */
const column = (i: number) => `a[${i}] = ${binTask.a[i]}`;

test("be the binary search: mid placed and lo or hi moved round by round, then mid into return, earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBinary, ".live-beBinary");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const e = binNext(binReplay(binTask, bin.ops.slice(0, k)))!;
    if (e.kind === "return") await tap("mid").then(() => tap("return"));
    else await tap(e.kind).then(() => tap(column(e.at)));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${bin.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < bin.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`x = ${binTask.x} is at index ${bin.end.ret}, found in ${bin.end.looks} looks among 7! ★★★`))).toBeVisible();
  await expect(game.getByText(`return mid = ${bin.end.ret}`)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the binary search: mid dragged to (lo + hi) // 2 rounded up is refused, then dragged to the right place", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBinary, ".live-beBinary");
  const m = binReplay(binTask, []);
  const c = binCheck(m, { kind: "mid", at: 4 });
  if (c.ok) throw new Error("(0 + 6) // 2 is 3");
  const drag = async (to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: "mid", exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: "mid", exact: true })).toBeVisible();
  await expect(async () => {
    await drag(column(4));
    await expect(game.getByText(fill(en.live.beBinary.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  await expect(async () => {
    await drag(column(3));
    await expect(game.getByText(`mid = (0 + 6) // 2 = 3; a[3] = ${binTask.a[3]}`, { exact: false })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Operations: 1 of ${bin.ops.length}`)).toBeVisible();
});

const ptrTask = ptrNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const ptr = ptrRun(ptrTask);
const slot = (x: number) => `a[${x}] = ${ptrTask.a[x]}`;

test("be the two pointers: i and j moved in step by step to the pair, then into return, earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBePointers, ".live-bePointers");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = ptrReplay(ptrTask, ptr.ops.slice(0, k));
    const e = ptrNext(m);
    if (e === "return") await tap("i").then(() => tap("return"));
    else await tap(e!).then(() => tap(slot(e === "i" ? m.i + 1 : m.j - 1)));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${ptr.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < ptr.ops.length; k++) await op(k);
  const { i, j } = ptr.end;
  await expect(game.getByText(new RegExp(`a\\[${i}\\] \\+ a\\[${j}\\] = ${ptrTask.a[i]} \\+ ${ptrTask.a[j]} = ${ptrTask.t}, found in ${ptr.ops.length - 1} moves! ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the two pointers: the pointer the sum doesn't move is refused, then the right one dragged a step in", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBePointers, ".live-bePointers");
  const m = ptrReplay(ptrTask, []);
  const n = ptrTask.a.length;
  const right = ptrNext(m);
  if (right !== "i" && right !== "j") throw new Error("the first move is i or j");
  const wrong = right === "i" ? "j" : "i";
  const step = (p: "i" | "j") => (p === "i" ? 1 : n - 2);
  const c = ptrCheck(m, { kind: "move", p: wrong, to: step(wrong) });
  if (c.ok) throw new Error(`${wrong} doesn't move first`);
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: wrong, exact: true })).toBeVisible();
  await expect(async () => {
    await drag(wrong, slot(step(wrong)));
    await expect(game.getByText(fill(en.live.bePointers.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  const s = ptrTask.a[0] + ptrTask.a[n - 1];
  await expect(async () => {
    await drag(right, slot(step(right)));
    await expect(game.getByText(`s = ${ptrTask.a[0]} + ${ptrTask.a[n - 1]} = ${s} ${right === "i" ? "<" : ">"} ${ptrTask.t}; ${right} = ${step(right)}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Operations: 1 of ${ptr.ops.length}`)).toBeVisible();
});
