// System-design-sense games: be the cache, its first puzzle played operation by operation as the code makes them, and
// a wrong one refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { cacheNow, cacheRun, cacheSvg, checkOp as cacheCheck, expect as cacheNext, replay as cacheReplay, victimAt, type CacheMachine } from "../src/math/beCache.ts";
import { fill } from "../src/math/text.ts";
import { boardWith } from "./helpers.ts";

const cacheTask = cacheNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const cache = cacheRun(cacheTask);
/** The accessible name of a spot of the picture, by its id. */
const cacheLabel = (m: CacheMachine, id: string) => cacheSvg(m).spots.find((s) => s.id === id)!.label;
/** What the code's next operation drags, and where to. */
function cacheMove(m: CacheMachine): [string, string] {
  const q = m.task.reqs[m.r];
  const node = (k: number) => cacheLabel(m, `n${k}`);
  switch (cacheNext(m)!) {
    case "hit":
      return [cacheLabel(m, "req"), node(q.k)];
    case "miss":
      return [cacheLabel(m, "req"), "return −1"];
    case "insert":
      return [cacheLabel(m, "req"), "head"];
    case "write":
      return [cacheLabel(m, "req"), "database"];
    case "evict":
      return [node(m.list[victimAt(m)].k), "evict"];
    case "flush":
      return [node(m.list[victimAt(m)].k), "database"];
    case "load":
      return [cacheLabel(m, `d${q.k}`), "head"];
  }
}

test("be the cache: LRU requests served operation by operation, hits to the head and the tail evicted, earn three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeCache, ".live-beCache");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const [from, to] = cacheMove(cacheReplay(cacheTask, cache.ops.slice(0, k)));
    await tap(from).then(() => tap(to));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${cache.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < cache.ops.length; k++) await op(k);
  await expect(game.getByText(new RegExp(`All ${cacheTask.reqs.length} requests served: .* ★★★`))).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the cache: a node that isn't the tail dragged into evict is refused, then the tail evicted", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeCache, ".live-beCache");
  const k = cache.ops.findIndex((_, i) => cacheNext(cacheReplay(cacheTask, cache.ops.slice(0, i))) === "evict");
  const m = cacheReplay(cacheTask, cache.ops.slice(0, k));
  const head = m.list[0];
  const c = cacheCheck(m, { kind: "evict", k: head.k });
  if (c.ok) throw new Error("the tail goes");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(async () => {
    const [from, to] = cacheMove(cacheReplay(cacheTask, []));
    await tap(from).then(() => tap(to));
    await expect(game.getByText("Operations: 1 of", { exact: false })).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let i = 1; i < k; i++) {
    const [from, to] = cacheMove(cacheReplay(cacheTask, cache.ops.slice(0, i)));
    await tap(from).then(() => tap(to));
  }
  await expect(async () => {
    await drag(cacheLabel(m, `n${head.k}`), "evict");
    await expect(game.getByText(fill(en.live.beCache.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  const tail = m.list[m.list.length - 1];
  await expect(async () => {
    await drag(cacheLabel(m, `n${tail.k}`), "evict");
    await expect(game.getByText(`evict ${tail.k} (tail)`)).toBeVisible({ timeout: 1000 });
  }).toPass();
});
