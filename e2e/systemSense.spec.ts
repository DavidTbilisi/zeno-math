// System-design-sense games: be the cache, be the load balancer, be the hash ring and be the rate limiter, each one's
// first puzzle played operation by operation as the code makes them, and a wrong one refused with the rule it broke.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { cacheNow, cacheRun, cacheSvg, checkOp as cacheCheck, expect as cacheNext, replay as cacheReplay, victimAt, type CacheMachine } from "../src/math/beCache.ts";
import { checkOp as lbCheck, choose, expect as lbNext, lbNow, lbRun, replay as lbReplay, serverName } from "../src/math/beBalance.ts";
import { checkOp as ringCheck, ownerOf, replay as ringReplay, ringNow, ringRun } from "../src/math/beRing.ts";
import { checkOp as limitCheck, expect as limitNext, limitNow, limitRun, replay as limitReplay } from "../src/math/beLimit.ts";
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

const lbTask = lbNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const lb = lbRun(lbTask);
const clientOf = (k: number) => {
  const m = lbReplay(lbTask, lb.ops.slice(0, k));
  return { m, req: `request from client ${(lbTask.events[m.e] as { c: number }).c}` };
};

test("be the load balancer: round robin requests sent server by server in turn earn three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBalance, ".live-beBalance");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const { m, req } = clientOf(k);
    if (lbNext(m) === "raise") await tap("+w").then(() => tap("cw[]"));
    else await tap(req).then(() => tap(`server ${serverName(choose(m))}`));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${lb.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < lb.ops.length; k++) await op(k);
  await expect(game.getByText(/requests sent in turn: .* ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the load balancer: a request dragged to a server out of turn is refused, then to the server under i", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeBalance, ".live-beBalance");
  const { m, req } = clientOf(0);
  const c = lbCheck(m, { kind: "send", s: 1 });
  if (c.ok) throw new Error("round robin starts at A");
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(game.getByRole("button", { name: req, exact: true })).toBeVisible();
  await expect(async () => {
    await drag(req, "server B");
    await expect(game.getByText(fill(en.live.beBalance.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  await expect(async () => {
    await drag(req, "server A");
    await expect(game.getByText(`${req.replace("request from ", "")} → A; i = 1`)).toBeVisible({ timeout: 1000 });
  }).toPass();
});

const ringTask = ringNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const ring = ringRun(ringTask);
/** The new key's button and the button of the server it belongs to, after k operations. */
const ringMove = (k: number) => {
  const m = ringReplay(ringTask, ring.ops.slice(0, k));
  const ev = ringTask.events[m.e] as { k: string; h: number };
  const to = ownerOf(m.nodes, ev.h);
  return { m, ev, key: `new key ${ev.k}, hash ${ev.h}`, server: `server ${to.id} at ${to.h}` };
};

test("be the hash ring: each key placed on the first server clockwise earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeRing, ".live-beRing");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const { key, server } = ringMove(k);
    await tap(key).then(() => tap(server));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${ring.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < ring.ops.length; k++) await op(k);
  await expect(game.getByText(/keys placed on the first server clockwise! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the hash ring: a key put on a server it doesn't meet first is refused, then on the right one", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeRing, ".live-beRing");
  const { m, ev, key, server } = ringMove(0);
  const wrong = m.nodes.find((n) => n.id !== ownerOf(m.nodes, ev.h).id)!;
  const c = ringCheck(m, { key: "new", to: wrong.id });
  if (c.ok) throw new Error("only one server is first");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  await expect(async () => {
    await tap(key).then(() => tap(`server ${wrong.id} at ${wrong.h}`));
    await expect(game.getByText(fill(en.live.beRing.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(async () => {
    await tap(key).then(() => tap(server));
    await expect(game.getByText(`Operations: 1 of ${ring.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
});

const limitTask = limitNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
const limit = limitRun(limitTask);
/** What the code's next operation drags, and where to: the clock onto the bucket, or the request onto allow or reject. */
const limitMove = (k: number): [string, string] => {
  const m = limitReplay(limitTask, limit.ops.slice(0, k));
  const e = limitNext(m)!;
  return e === "clean" ? ["refill", "bucket"] : [`request at t = ${limitTask.times[m.r]}`, e];
};

test("be the rate limiter: the token bucket refilled and each request let through or rejected earns three stars", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeLimit, ".live-beLimit");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const op = async (k: number) => {
    const [from, to] = limitMove(k);
    await tap(from).then(() => tap(to));
  };
  await expect(async () => {
    await op(0);
    await expect(game.getByText(`Operations: 1 of ${limit.ops.length}`)).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let k = 1; k < limit.ops.length; k++) await op(k);
  await expect(game.getByText(/let through, .* rejected, a token each! ★★★/)).toBeVisible();
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("be the rate limiter: a request let through with no token left is refused, then rejected", async ({ page }) => {
  const game = await boardWith(page, en.shapes.names.liveBeLimit, ".live-beLimit");
  const k = limit.ops.findIndex((_, i) => limitNext(limitReplay(limitTask, limit.ops.slice(0, i))) === "reject");
  const m = limitReplay(limitTask, limit.ops.slice(0, k));
  const c = limitCheck(m, { kind: "allow" });
  if (c.ok) throw new Error("no token is left");
  const tap = (label: string) => game.getByRole("button", { name: label, exact: true }).dispatchEvent("click");
  const drag = async (from: string, to: string) => {
    const [a, b] = [(await game.getByRole("button", { name: from, exact: true }).boundingBox())!, (await game.getByRole("button", { name: to, exact: true }).boundingBox())!];
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await expect(async () => {
    const [from, to] = limitMove(0);
    await tap(from).then(() => tap(to));
    await expect(game.getByText("Operations: 1 of", { exact: false })).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (let i = 1; i < k; i++) {
    const [from, to] = limitMove(i);
    await tap(from).then(() => tap(to));
  }
  const req = `request at t = ${limitTask.times[m.r]}`;
  await expect(async () => {
    await drag(req, "allow");
    await expect(game.getByText(fill(en.live.beLimit.why[c.why], c.vars))).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The stage shakes after a miss, so the drag is retried until it lands.
  await expect(async () => {
    await drag(req, "reject");
    await expect(game.getByText(`t = ${limitTask.times[m.r]}: reject (no token)`).first()).toBeVisible({ timeout: 1000 });
  }).toPass();
});
