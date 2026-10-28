// Algorithm-sense games: be the sort, be the search, be the DP, be the binary search, be the two pointers, be the
// sliding window, be the backtracking, be the heap and be the tree, each one's first puzzle played move by move as the algorithm makes them, and a
// wrong tap refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { checkOp, expect as next, replay, SEARCH_LADDER, searchNow, searchRun, type Machine } from "../src/math/beSearch.ts";
import { SORT_LADDER, sortNow, sortRun } from "../src/math/beSort.ts";
import { binNow, binRun, checkOp as binCheck, expect as binNext, replay as binReplay } from "../src/math/beBinary.ts";
import { checkOp as ptrCheck, expect as ptrNext, ptrNow, ptrRun, replay as ptrReplay } from "../src/math/bePointers.ts";
import { btNow, btRun, checkOp as btCheck, expect as btNext, nextChoice, pathText, replay as btReplay, shown as btShown } from "../src/math/beBacktrack.ts";
import { checkOp as heapCheck, expect as heapNext, heapNow, heapRun, partner, replay as heapReplay } from "../src/math/beHeap.ts";
import { checkOp as treeCheck, expect as treeNext, replay as treeReplay, step as treeStep, treeNow, treeRun } from "../src/math/beTree.ts";
import { checkOp as winCheck, expect as winNext, replay as winReplay, value as winValue, winNow, winRun } from "../src/math/beWindow.ts";
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

const winTask = winNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const win = winRun(winTask);
const cellOf = (x: number) => `a[${x}] = ${winTask.a[x]}`;
const bestOf = (b: number) => `best = ${b === -Infinity ? "−∞" : b}`;

test("be the sliding window: the window grown, shrunk and its sum taken into best, then best into return, earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeWindow, ".live-beWindow");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = winReplay(winTask, win.ops.slice(0, k));
    const e = winNext(m);
    if (e === "R") await tap("r").then(() => tap(cellOf(m.r + 1)));
    else if (e === "L") await tap("l").then(() => tap(cellOf(m.l + 1)));
    else if (e === "best") await tap(`s = ${winValue(m)}`).then(() => tap(bestOf(m.best)));
    else await tap(bestOf(m.best)).then(() => tap("return"));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${win.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < win.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`The largest sum of ${winTask.k} in a row is ${win.end.ret}, found by sliding once along ${winTask.a.length}! ★★★`))).toBeVisible();
  await expect(game.getByText(`return best = ${win.end.ret}`)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the sliding window: l dragged before the window has grown is refused, then r dragged onto a[0]", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeWindow, ".live-beWindow");
  const m = winReplay(winTask, []);
  const c = winCheck(m, { kind: "move", p: "l", to: 1 });
  if (c.ok) throw new Error("r moves first");
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: "l", exact: true })).toBeVisible();
  await expect(async () => {
    await drag("l", cellOf(1));
    await expect(game.getByText(fill(en.live.beWindow.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  await expect(async () => {
    await drag("r", cellOf(0));
    await expect(game.getByText(`r = 0; s = 0 + ${winTask.a[0]} = ${winTask.a[0]}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Operations: 1 of ${win.ops.length}`)).toBeVisible();
});

const btTask = btNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const bt = btRun(btTask);
const choiceOf = (i: number) => `a[${i}] = ${btShown(btTask, btTask.a[i])}`;

test("be the backtracking: every subset pushed, recorded and popped as the code does, then res into return, earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBacktrack, ".live-beBacktrack");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = btReplay(btTask, bt.ops.slice(0, k));
    const e = btNext(m);
    const d = m.path.length;
    const res = `res, ${m.res.length} found`;
    if (e === "push") await tap(choiceOf(nextChoice(m)!)).then(() => tap(`path[${d}]`));
    else if (e === "pop") await tap(`path[${d - 1}] = ${btShown(btTask, btTask.a[m.path[d - 1]])}`).then(() => tap("pop"));
    else if (e === "record") await tap(`path = ${pathText(btTask, m.path)}`).then(() => tap(res));
    else await tap(res).then(() => tap("return"));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${bt.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < bt.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`All ${bt.end.ret} subsets of ${btTask.a.length} letters, 2ⁿ: each letter in or out! ★★★`))).toBeVisible();
  await expect(game.getByText(`return len(res) = ${bt.end.ret}`)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the backtracking: a choice dragged before the empty path is recorded is refused; recorded, it is pushed", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBacktrack, ".live-beBacktrack");
  const c = btCheck(btReplay(btTask, []), { kind: "push", i: 0 });
  if (c.ok) throw new Error("the empty path is recorded first");
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: choiceOf(0), exact: true })).toBeVisible();
  await expect(async () => {
    await drag(choiceOf(0), "path[0]");
    await expect(game.getByText(fill(en.live.beBacktrack.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the moves are retried until they land.
  await expect(async () => {
    await game.getByRole("button", { name: "path = []", exact: true }).dispatchEvent("click");
    await game.getByRole("button", { name: "res, 0 found", exact: true }).dispatchEvent("click");
    await expect(game.getByText("res.append([]); 1 found")).toBeVisible({ timeout: 1000 });
  }).toPass();
  const a0 = btShown(btTask, btTask.a[0]);
  await expect(async () => {
    await drag(choiceOf(0), "path[0]");
    await expect(game.getByText(`path.append(${a0}) → [${a0}]`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Operations: 2 of ${bt.ops.length}`)).toBeVisible();
});

const heapTask = heapNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const heap = heapRun(heapTask);

test("be the heap: each value put on the end and swapped up as the code does earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeHeap, ".live-beHeap");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = heapReplay(heapTask, heap.ops.slice(0, k));
    const h = m.heap;
    if (heapNext(m) === "append") await tap(`x = a[${m.j}] = ${heapTask.a[m.j]}`).then(() => tap(`heap[${h.length}], empty`));
    else await tap(`heap[${m.cur}] = ${h[m.cur!]}`).then(() => tap(`node ${partner(m)} = ${h[partner(m)!]}`));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${heap.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < heap.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`All ${heapTask.a.length} values are in, every parent ≤ its children! ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the heap: a value dropped past the end of heap[] is refused, then dropped on heap[0]", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeHeap, ".live-beHeap");
  const c = heapCheck(heapReplay(heapTask, []), { kind: "put", to: 1 });
  if (c.ok) throw new Error("a value goes on the end");
  const x = `x = a[0] = ${heapTask.a[0]}`;
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: x, exact: true })).toBeVisible();
  await expect(async () => {
    await drag(x, "heap[1], empty");
    await expect(game.getByText(fill(en.live.beHeap.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  await expect(async () => {
    await drag(x, "heap[0], empty");
    await expect(game.getByText(`heap.append(${heapTask.a[0]}) → heap[0] = ${heapTask.a[0]}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(`Operations: 1 of ${heap.ops.length}`)).toBeVisible();
});

const treeTask = treeNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const tree = treeRun(treeTask);

test("be the tree: each value walked down and dropped into its empty place as the code does earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeTree, ".live-beTree");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const m = treeReplay(treeTask, tree.ops.slice(0, k));
    const { side, to } = treeStep(m);
    const x = treeTask.q[m.qi];
    await tap(`x = ${x}`);
    await tap(treeNext(m) === "down" ? `node ${m.nodes[to].v}` : `empty, ${side === "l" ? "left" : "right"} of ${m.nodes[m.cur].v}`);
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${tree.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < tree.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`All ${treeTask.q.length} values are in, each a new leaf where its walk ended! ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the tree: x dropped on the root is refused, then dragged onto the child it goes to", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeTree, ".live-beTree");
  const m = treeReplay(treeTask, []);
  const c = treeCheck(m, { kind: "drop", node: m.root });
  if (c.ok) throw new Error("x moves on from the root");
  const x = `x = ${treeTask.q[0]}`;
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: x, exact: true })).toBeVisible();
  await expect(async () => {
    await drag(x, `node ${m.nodes[m.root].v}`);
    await expect(game.getByText(fill(en.live.beTree.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  const to = m.nodes[treeStep(m).to].v;
  await expect(async () => {
    await drag(x, `node ${to}`);
    await expect(game.getByText(`Operations: 1 of ${tree.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(game.getByText(new RegExp(`cur = cur\\.(left|right) = ${to}`))).toBeVisible();
});
