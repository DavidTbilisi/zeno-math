// The anonymous usage counts (#615): what the browser names things, what the server takes and refuses, who may read
// the counts, and that nothing in them tells one visitor, board or class from another.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { countUsage, dayOf, initUsage, usageEvents, usageReport, USAGE_NAME } from "../server/usage.ts";
import { cleanName, errorName, fromHost, pageName, scaleTop, screenName, seen, usageForTest } from "../src/usage.ts";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const dir = mkdtempSync(join(tmpdir(), "zeno-usage-"));
const servers: ChildProcess[] = [];

async function start(port: number, name: string, env: Record<string, string> = {}) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: join(dir, name), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", TEACHER_PASSWORD: "", USAGE: "", ...env },
    stdio: "pipe",
  });
  servers.push(server);
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
}

before(async () => {
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  await Promise.all([
    start(PORT, "open"),
    start(PORT + 1, "locked", { APP_PASSWORD: "site", TEACHER_PASSWORD: "teach" }),
    start(PORT + 2, "off", { USAGE: "off" }),
  ]);
});

after(async () => {
  for (const server of servers) if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const post = (port: number, body: string, headers: Record<string, string> = {}) =>
  fetch(`http://127.0.0.1:${port}/api/usage`, { method: "POST", body, headers });
const events = (...list: [string, string, boolean?][]) => JSON.stringify({ events: list.map(([kind, name, first]) => ({ kind, name, first })) });
const report = async (port: number, headers: Record<string, string> = {}) => {
  const res = await fetch(`http://127.0.0.1:${port}/api/usage?days=7`, { headers });
  return { status: res.status, body: res.ok ? await res.json() : null };
};

test("events are added to the day's counts: times, and the page loads they happened in", async () => {
  // As sendBeacon sends a string: plain text, which a page on another host may send unasked.
  assert.equal((await post(PORT, events(["visit", "app", true], ["page", "home", true], ["page", "home"], ["page", "practice", true]), { "Content-Type": "text/plain;charset=UTF-8" })).status, 204);
  assert.equal((await post(PORT, events(["visit", "app", true], ["page", "home", true]), { "Content-Type": "application/json" })).status, 204);
  const { status, body } = await report(PORT);
  assert.equal(status, 200);
  assert.equal(body.on, true);
  assert.deepEqual(body.kinds.page, [{ name: "home", hits: 3, visits: 2 }, { name: "practice", hits: 1, visits: 1 }]);
  assert.deepEqual(body.kinds.visit, [{ name: "app", hits: 2, visits: 2 }]);
  // Every day asked for, oldest first, today last.
  assert.equal(body.days.length, 7);
  assert.deepEqual(body.days.at(-1), { day: dayOf(Date.now()), visits: 2, hits: 2 });
  assert.deepEqual(body.days[0], { day: dayOf(Date.now() - 6 * 86_400_000), visits: 0, hits: 0 });
});

test("what can't be counted is passed over, and the sender is told nothing", async () => {
  const before = (await report(PORT)).body;
  for (const body of [
    events(["secret", "x"], ["page", "a@b.example"], ["page", ""], ["page", "x".repeat(81)], ["page", "<script>"], ["page", "(other)"]),
    JSON.stringify({ events: "no" }),
    JSON.stringify({ events: [null, 3, { kind: 1, name: 2 }] }),
    "[]",
  ])
    assert.equal((await post(PORT, body)).status, 204);
  assert.equal((await post(PORT, "not json")).status, 400);
  assert.equal((await post(PORT, " ".repeat(9000))).status, 413);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/api/usage`, { method: "DELETE" })).status, 405);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/api/usage/x`)).status, 404);
  assert.deepEqual((await report(PORT)).body.kinds, before.kinds);
});

test("anyone may add to the counts, only a teacher reads them", async () => {
  // No site password and no teacher password sent: counted all the same.
  assert.equal((await post(PORT + 1, events(["visit", "front page", true]))).status, 204);
  const site = { Authorization: `Basic ${Buffer.from("x:site").toString("base64")}` };
  assert.equal((await report(PORT + 1)).status, 401);
  assert.equal((await report(PORT + 1, site)).status, 403);
  assert.equal((await report(PORT + 1, { ...site, "X-Teacher-Password": "wrong" })).status, 403);
  const read = await report(PORT + 1, { ...site, "X-Teacher-Password": "teach" });
  assert.equal(read.status, 200);
  assert.deepEqual(read.body.kinds.visit, [{ name: "front page", hits: 1, visits: 1 }]);
});

test("USAGE=off counts nothing", async () => {
  assert.equal((await post(PORT + 2, events(["visit", "app", true]))).status, 204);
  const { body } = await report(PORT + 2);
  assert.equal(body.on, false);
  assert.deepEqual(body.kinds.visit, []);
});

test("a day holds only so many names of a kind, old days go, and only names and numbers are stored", () => {
  const db = new DatabaseSync(":memory:");
  initUsage(db);
  const now = Date.UTC(2026, 10, 24, 12);
  countUsage(db, Array.from({ length: 1005 }, (_, i) => ({ kind: "page" as const, name: `p${i}`, first: true })), now);
  // A name already there still counts under itself; a new one goes to "(other)".
  countUsage(db, [{ kind: "page", name: "p0", first: false }, { kind: "page", name: "new", first: true }, { kind: "tool", name: "ruler", first: true }], now);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM usage_counts WHERE kind = 'page'").get() as { n: number };
  assert.equal(n, 1001);
  assert.deepEqual({ ...db.prepare("SELECT hits, visits FROM usage_counts WHERE name = '(other)'").get() }, { hits: 6, visits: 6 });
  assert.deepEqual({ ...db.prepare("SELECT hits, visits FROM usage_counts WHERE name = 'p0'").get() }, { hits: 2, visits: 1 });
  assert.deepEqual(usageReport(db, 1, now).kinds.tool, [{ name: "ruler", hits: 1, visits: 1 }]);
  assert.deepEqual((db.prepare("PRAGMA table_info(usage_counts)").all() as { name: string }[]).map((c) => c.name), ["day", "kind", "name", "hits", "visits"]);
  // Two years on, the first write of the day clears what is older than that.
  countUsage(db, [{ kind: "visit", name: "app", first: true }], now + 731 * 86_400_000);
  assert.deepEqual((db.prepare("SELECT DISTINCT day FROM usage_counts").all() as { day: string }[]).map((r) => r.day), ["2028-11-24"]);
  // A report asks for at least one day and at most a year and a day.
  assert.equal(usageReport(db, 0, now).days.length, 30);
  assert.equal(usageReport(db, 5000, now).days.length, 366);
  assert.equal(usageEvents({ events: Array.from({ length: 100 }, () => ({ kind: "page", name: "home" })) }).length, 40);
});

test("a page's name never holds a board, a class, a token or a person", () => {
  assert.equal(pageName("", "/"), "home");
  assert.equal(pageName("", "/about"), "about");
  assert.equal(pageName("#/about"), "about");
  assert.equal(pageName("#/b/3f2a9c1e-77aa-4b0e-9d6c-0a1b2c3d4e5f"), "board");
  assert.equal(pageName("#/b/abc/live/trigBuild"), "board");
  assert.equal(pageName("#/s/Tok3n_-x"), "shared board");
  assert.equal(pageName("#/join/S5VDZY"), "join");
  assert.equal(pageName("#/account/reset/abc-DEF_123"), "account/reset");
  assert.equal(pageName("#/account/verify/abc"), "account/verify");
  assert.equal(pageName("#/account"), "account");
  assert.equal(pageName("#/teacher"), "teacher");
  assert.equal(pageName("#/teacher/usage"), "teacher/usage");
  assert.equal(pageName("#/teacher/S5VDZY/tests/print"), "teacher/print");
  // What says only which part of the site: kept as it is.
  assert.equal(pageName("#/practice/fractions.add"), "practice/fractions.add");
  assert.equal(pageName("#/library/live/trigBuild"), "library/live/trigBuild");
  assert.equal(pageName("#/roadmaps/exam"), "roadmaps/exam");
  // A library coming back from libraries.excalidraw.com is no page.
  assert.equal(pageName("#addLibrary=https%3A%2F%2Fx&token=abc"), null);
  for (const hash of ["#/practice/fractions.add", "#/library/live/trigBuild", "#/teacher/usage", "#/b/x"]) assert.match(pageName(hash)!, USAGE_NAME);
});

test("an error's name leaves out addresses' ids, codes and emails", () => {
  assert.equal(errorName("POST /api/students/S5VDZY/games: 500"), "POST /api/students/(id): 500");
  assert.equal(errorName("GET /api/boards/3f2a9c1e-77aa-4b0e-9d6c-0a1b2c3d4e5f: 404"), "GET /api/boards/(id): 404");
  assert.equal(errorName("no user nino@example.ge here"), "no user (email) here");
  assert.equal(errorName("bad address #/b/abc_DEF-1"), "bad address /b/(id)");
  assert.equal(errorName("Cannot read properties of undefined (reading 'x')"), "Cannot read properties of undefined (reading 'x')");
  assert.equal(errorName(""), "unknown error");
  assert.ok(errorName("x".repeat(500)).length <= 80);
  for (const m of ["POST /api/students/S5VDZY/games: 500", "ჩატვირთვა ვერ მოხერხდა", "a\nb\tc"]) assert.match(errorName(m), USAGE_NAME);
});

test("where a visitor came from is a host name, and only another site's", () => {
  assert.equal(fromHost("https://www.google.com/search?q=zeno+math", "zeno.example"), "google.com");
  assert.equal(fromHost("https://zeno.example/#/about", "zeno.example"), null);
  assert.equal(fromHost("https://www.zeno.example/", "zeno.example"), null);
  assert.equal(fromHost("", "zeno.example"), null);
  assert.equal(fromHost("not a url", "zeno.example"), null);
  assert.deepEqual([320, 599, 600, 1023, 1024, 1920].map(screenName), ["phone", "phone", "tablet", "tablet", "desktop", "desktop"]);
  assert.equal(cleanName("  a<b>  c@d \n e  "), "a b c d e");
});

test("the first time something happens in a page load is marked, and nothing is counted before counting starts", () => {
  usageForTest.reset(null);
  seen("page", "home");
  assert.deepEqual(usageForTest.waiting(), []);
  usageForTest.reset("/api/usage");
  seen("page", "home");
  seen("page", "home");
  seen("tool", "home");
  seen("page", "<>");
  assert.deepEqual(usageForTest.waiting(), [
    { kind: "page", name: "home", first: true },
    { kind: "page", name: "home", first: false },
    { kind: "tool", name: "home", first: true },
  ]);
  usageForTest.reset(null);
});

test("the chart's scale ends on a round number at or above the largest day", () => {
  assert.deepEqual([0, 3, 4, 5, 10, 11, 20, 21, 50, 51, 100, 101, 999, 1000, 1001].map(scaleTop), [4, 4, 4, 5, 10, 20, 20, 50, 50, 100, 100, 200, 1000, 1000, 2000]);
});
