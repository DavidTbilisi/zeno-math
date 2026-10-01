// The board API: saves from a stale copy are refused with 409, and static files go out compressed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const URL_ = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "zeno-test-"));
const servers: ChildProcess[] = [];

async function start(port: number, name: string, password = "") {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: join(dir, name), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: password },
    stdio: "pipe",
  });
  servers.push(server);
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
}

before(async () => {
  // A tiny stand-in for the built frontend, with a precompressed copy like scripts/compress.mjs writes.
  mkdirSync(join(dir, "dist", "assets"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  const js = "console.log('zeno');\n".repeat(200);
  writeFileSync(join(dir, "dist", "assets", "app.js"), js);
  writeFileSync(join(dir, "dist", "assets", "app.js.gz"), gzipSync(js));
  await start(PORT, "data");
});

after(async () => {
  // Wait for the server to exit: on Windows the database file stays locked until then.
  for (const server of servers) if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(URL_ + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: res.status === 204 ? undefined : await res.json() };
};

test("a save based on an old version is refused", async () => {
  const board = (await call("POST", "/api/boards", { title: "Test" })).body;
  const scene = { elements: [] };
  // Two tabs open the board at the same version.
  const first = await call("PUT", `/api/boards/${board.id}`, { scene, baseUpdatedAt: board.updatedAt });
  assert.equal(first.status, 200);
  assert.equal(first.body.previous, board.updatedAt);
  const second = await call("PUT", `/api/boards/${board.id}`, { scene, baseUpdatedAt: board.updatedAt });
  assert.equal(second.status, 409);
  assert.equal(second.body.updatedAt, first.body.updatedAt);
  // Saving on top of the latest version works, and so does overwriting without a base.
  assert.equal((await call("PUT", `/api/boards/${board.id}`, { scene, baseUpdatedAt: first.body.updatedAt })).status, 200);
  assert.equal((await call("PUT", `/api/boards/${board.id}`, { scene })).status, 200);
  assert.equal((await call("PUT", "/api/boards/nope", { scene })).status, 404);
});

test("versions strictly increase", async () => {
  const board = (await call("POST", "/api/boards", { title: "Fast" })).body;
  let last = board.updatedAt;
  for (let i = 0; i < 5; i++) {
    const r = await call("PUT", `/api/boards/${board.id}`, { title: `t${i}`, baseUpdatedAt: last });
    assert.equal(r.status, 200);
    assert.ok(r.body.updatedAt > last);
    last = r.body.updatedAt;
  }
});

test("static files are sent compressed when the browser accepts it", async () => {
  const gz = await fetch(`${URL_}/assets/app.js`, { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(gz.headers.get("content-encoding"), "gzip");
  assert.match(await gz.text(), /zeno/); // fetch decompresses
  const plain = await fetch(`${URL_}/assets/app.js`, { headers: { "Accept-Encoding": "identity" } });
  assert.equal(plain.headers.get("content-encoding"), null);
  const spa = await fetch(`${URL_}/some/route`);
  assert.match(await spa.text(), /<title>Zeno/);
});

test("boards: list, read, delete", async () => {
  const board = (await call("POST", "/api/boards", { title: "  Listed  " })).body;
  assert.equal(board.title, "Listed");
  assert.equal((await call("POST", "/api/boards", { title: "   " })).body.title, "Untitled");
  const list = (await call("GET", "/api/boards")).body as { id: string }[];
  assert.ok(list.some((b) => b.id === board.id));
  const got = await call("GET", `/api/boards/${board.id}`);
  assert.equal(got.status, 200);
  assert.deepEqual(got.body.scene, {});
  assert.equal((await call("DELETE", `/api/boards/${board.id}`)).status, 204);
  assert.equal((await call("GET", `/api/boards/${board.id}`)).status, 404);
});

test("bad requests are refused without breaking the board", async () => {
  const board = (await call("POST", "/api/boards", { title: "Guarded" })).body;
  const put = (body: string, type = "application/json") =>
    fetch(`${URL_}/api/boards/${board.id}`, { method: "PUT", headers: { "Content-Type": type }, body });
  assert.equal((await put("{not json")).status, 400);
  assert.equal((await put("[1, 2]")).status, 400);
  assert.equal((await put(JSON.stringify({ scene: "x" }))).status, 400);
  assert.equal((await put(JSON.stringify({ scene: { elements: {} } }))).status, 400);
  assert.equal((await put(JSON.stringify({ scene: null }))).status, 400);
  // A cross-site form can only send form or text content types.
  assert.equal((await put(JSON.stringify({ title: "x" }), "text/plain")).status, 415);
  const form = await fetch(`${URL_}/api/boards`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "title=x" });
  assert.equal(form.status, 415);
  const big = await put(JSON.stringify({ scene: { elements: [], pad: "x".repeat(26 * 1024 * 1024) } })).catch(() => null);
  // The server answers 413 and closes the upload; some clients only see the closed connection.
  if (big) assert.equal(big.status, 413);
  const after = await call("GET", `/api/boards/${board.id}`);
  assert.equal(after.body.title, "Guarded");
  assert.deepEqual(after.body.scene, {});
});

test("static paths cannot leave the build directory", async () => {
  writeFileSync(join(dir, "secret.txt"), "secret");
  for (const p of ["/..%2fsecret.txt", "/%2e%2e/secret.txt", "/assets/..%2f..%2fsecret.txt"]) {
    const res = await fetch(URL_ + p);
    assert.doesNotMatch(await res.text(), /^secret$/, p);
  }
});

test("security headers and the page's CSP", async () => {
  const page = await fetch(`${URL_}/`);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  const api = await fetch(`${URL_}/api/boards`);
  assert.equal(api.headers.get("x-content-type-options"), "nosniff");
});

test("health and export", async () => {
  assert.deepEqual((await call("GET", "/api/health")).body, { ok: true });
  const board = (await call("POST", "/api/boards", { title: "Backed up" })).body;
  await call("PUT", `/api/boards/${board.id}`, { scene: { elements: [{ id: "a" }] } });
  const res = await fetch(`${URL_}/api/export`);
  assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="zeno-boards-/);
  const dump = await res.json();
  const saved = dump.boards.find((b: { id: string }) => b.id === board.id);
  assert.deepEqual(saved.scene, { elements: [{ id: "a" }] });
});

test("with a password, everything but the health check needs it", async () => {
  const port = PORT + 1;
  await start(port, "auth", "s3cret");
  const base = `http://127.0.0.1:${port}`;
  const basic = (user: string, pass: string) => ({ Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` });
  const none = await fetch(`${base}/api/boards`);
  assert.equal(none.status, 401);
  assert.match(none.headers.get("www-authenticate") ?? "", /Basic/);
  assert.equal((await fetch(`${base}/api/boards`, { headers: basic("x", "wrong") })).status, 401);
  assert.equal((await fetch(`${base}/api/boards`, { headers: basic("anyone", "s3cret") })).status, 200);
  assert.equal((await fetch(`${base}/api/export`)).status, 401);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});
