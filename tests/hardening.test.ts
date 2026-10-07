// Hardening the server: wrong passwords are limited per client (and behind a proxy, per forwarded client), the
// database is backed up daily with old copies pruned, and a database from a newer Zeno is refused.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage } from "node:http";
import { backup, backupDue, backups } from "../server/backup.ts";
import { clientKey, FailureLimiter } from "../server/limiter.ts";

const dir = mkdtempSync(join(tmpdir(), "zeno-hardening-"));
after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

test("the limiter refuses a client after too many wrong passwords in the window, and forgets them after it", () => {
  const l = new FailureLimiter(3, 60_000);
  for (let i = 0; i < 2; i++) l.fail("a", 1000 * i);
  assert.equal(l.retryAfter("a", 2000), 0, "two wrong: still allowed");
  l.fail("a", 2000);
  assert.equal(l.retryAfter("a", 2000), 58, "three wrong: wait until the first (at 0 s) is a minute old");
  assert.equal(l.retryAfter("b", 2000), 0, "another client is not affected");
  assert.equal(l.retryAfter("a", 59_000), 1, "a second before the first failure leaves the window");
  assert.equal(l.retryAfter("a", 60_001), 0);
  // It remembers a bounded number of clients, dropping the one seen longest ago.
  const small = new FailureLimiter(1, 60_000, 2);
  for (const k of ["x", "y", "z"]) small.fail(k, 0);
  assert.equal(small.retryAfter("x", 0), 0);
  assert.ok(small.retryAfter("z", 0) > 0);
});

test("the client is the connection's address, or behind a trusted proxy the address the proxy added last", () => {
  const req = (forwarded?: string) => ({ headers: forwarded ? { "x-forwarded-for": forwarded } : {}, socket: { remoteAddress: "127.0.0.1" } }) as unknown as IncomingMessage;
  assert.equal(clientKey(req("10.0.0.7"), false), "127.0.0.1", "not trusted: the header is ignored");
  assert.equal(clientKey(req("10.0.0.7"), true), "10.0.0.7");
  assert.equal(clientKey(req("6.6.6.6, 10.0.0.7"), true), "10.0.0.7", "a client's own X-Forwarded-For can't change who it is");
  assert.equal(clientKey(req(), true), "127.0.0.1");
});

test("a backup is a working copy of the database; only the newest ones are kept", () => {
  const data = join(dir, "backup-unit");
  mkdirSync(data);
  const db = new DatabaseSync(join(data, "boards.db"));
  db.exec("CREATE TABLE boards (id TEXT PRIMARY KEY, title TEXT)");
  db.prepare("INSERT INTO boards VALUES (?, ?)").run("b1", "Lesson 1");
  const folder = join(data, "backups");
  assert.ok(backupDue(folder), "no backup yet: one is due");
  const day = 24 * 60 * 60 * 1000;
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 9; i++) backup(db, folder, 7, start + i * day);
  const kept = backups(folder);
  assert.equal(kept.length, 7);
  assert.equal(kept[0], "boards-2026-01-03T00-00-00.db", "the two oldest are gone");
  const copy = new DatabaseSync(join(folder, kept.at(-1)!), { readOnly: true });
  assert.deepEqual({ ...(copy.prepare("SELECT title FROM boards").get() as object) }, { title: "Lesson 1" });
  copy.close();
  assert.ok(!backupDue(folder), "just made one: none due");
  const newest = join(folder, kept.at(-1)!);
  const yesterday = (Date.now() - day - 1000) / 1000;
  utimesSync(newest, yesterday, yesterday);
  assert.ok(backupDue(folder), "a day later: due again");
  db.close();
});

/** Starts the server with the environment given; resolves with how to reach it, or rejects with what it printed. */
function start(env: Record<string, string>) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), STATIC_DIR: join(dir, "no-static"), APP_PASSWORD: "", TEACHER_PASSWORD: "", TRUST_PROXY: "", ...env },
    stdio: "pipe",
  });
  let output = "";
  return new Promise<{ base: string; stop: () => Promise<void> }>((ok, fail) => {
    server.stdout!.on("data", (d) => ((output += d), String(d).includes("listening") && ok({
      base: `http://127.0.0.1:${port}`,
      stop: () => new Promise<void>((done) => (server.exitCode !== null ? done() : (server.once("exit", () => done()), server.kill()))),
    })));
    server.stderr!.on("data", (d) => (output += d));
    server.on("exit", (code) => fail(new Error(`exited with ${code}: ${output}`)));
  });
}

test("wrong passwords: the eleventh in ten minutes gets 429, even with the right password, for that client only", async () => {
  const data = join(dir, "limited");
  const server = await start({ DATA_DIR: data, APP_PASSWORD: "open sesame", TEACHER_PASSWORD: "chalk", TRUST_PROXY: "1" });
  const basic = (password: string) => `Basic ${Buffer.from(`any:${password}`).toString("base64")}`;
  const get = (path: string, from: string, headers: Record<string, string> = {}) =>
    fetch(server.base + path, { headers: { "X-Forwarded-For": from, ...headers } });
  try {
    for (let i = 0; i < 15; i++) assert.equal((await get("/api/boards", "10.0.0.1")).status, 401, "no password: asked for one");
    assert.equal((await get("/api/boards", "10.0.0.1", { Authorization: basic("open sesame") })).status, 200, "asking without a password doesn't count");
    for (let i = 0; i < 10; i++) assert.equal((await get("/api/boards", "10.0.0.1", { Authorization: basic(`guess ${i}`) })).status, 401);
    const blocked = await get("/api/boards", "10.0.0.1", { Authorization: basic("open sesame") });
    assert.equal(blocked.status, 429, "the right password doesn't get through while blocked");
    assert.ok(Number(blocked.headers.get("retry-after")) > 500, "told to wait about ten minutes");
    assert.equal((await get("/api/boards", "6.6.6.6, 10.0.0.1", { Authorization: basic("open sesame") })).status, 429, "a forged X-Forwarded-For doesn't help");
    assert.equal((await get("/api/boards", "10.0.0.2", { Authorization: basic("open sesame") })).status, 200, "other clients carry on");
    assert.equal((await get("/api/health", "10.0.0.1")).status, 200, "the health check stays open");
    // Wrong teacher passwords count the same way.
    const site = { Authorization: basic("open sesame") };
    for (let i = 0; i < 10; i++) assert.equal((await get("/api/classes", "10.0.0.3", { ...site, "X-Teacher-Password": `guess ${i}` })).status, 403);
    const teacher = await get("/api/classes", "10.0.0.3", { ...site, "X-Teacher-Password": "chalk" });
    assert.equal(teacher.status, 429);
    assert.ok(Number(teacher.headers.get("retry-after")) > 0);
    assert.equal((await get("/api/classes", "10.0.0.4", { ...site, "X-Teacher-Password": "chalk" })).status, 200);
  } finally {
    await server.stop();
  }
});

test("the server records its schema version, backs up on start, and refuses a database from a newer Zeno", async () => {
  const data = join(dir, "versioned");
  const server = await start({ DATA_DIR: data });
  await server.stop();
  const db = new DatabaseSync(join(data, "boards.db"));
  const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  assert.equal(user_version, 4);
  assert.equal(backups(join(data, "backups")).length, 1, "a first backup on start");
  db.exec("PRAGMA user_version = 99");
  db.close();
  await assert.rejects(start({ DATA_DIR: data }), /newer version of Zeno/);
  const off = join(dir, "no-backups");
  await (await start({ DATA_DIR: off, BACKUP_KEEP: "0" })).stop();
  assert.equal(backups(join(off, "backups")).length, 0, "BACKUP_KEEP=0: no backups");
});
