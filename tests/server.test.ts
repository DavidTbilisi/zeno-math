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
let server: ChildProcess;

before(async () => {
  // A tiny stand-in for the built frontend, with a precompressed copy like scripts/compress.mjs writes.
  mkdirSync(join(dir, "dist", "assets"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  const js = "console.log('zeno');\n".repeat(200);
  writeFileSync(join(dir, "dist", "assets", "app.js"), js);
  writeFileSync(join(dir, "dist", "assets", "app.js.gz"), gzipSync(js));
  server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: join(dir, "data"), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "" },
    stdio: "pipe",
  });
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
});

after(async () => {
  // Wait for the server to exit: on Windows the database file stays locked until then.
  if (server && server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
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
