// Read-only links: a token per board that shows its title and scene but not its id, follows its saves, and stops
// working when it is taken away.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../scripts/dry-run-study.ts";

const dir = mkdtempSync(join(tmpdir(), "zeno-sharing-"));
let server: Awaited<ReturnType<typeof startServer>>;
before(async () => (server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), "t")));
after(async () => {
  await server.stop();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(server.base + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
};

test("a board's read-only link shows it without its id, follows its saves, and stops when taken away", async () => {
  const { body: board } = await call("POST", "/api/boards", { title: "Lesson" });
  assert.equal((await call("GET", `/api/boards/${board.id}`)).body.shareToken, null, "not shared yet");

  const first = await call("POST", `/api/boards/${board.id}/share`);
  assert.equal(first.status, 201);
  const { token } = first.body;
  assert.match(token, /^[A-Za-z0-9_-]{22}$/, "16 random bytes");
  const again = await call("POST", `/api/boards/${board.id}/share`);
  assert.deepEqual([again.status, again.body.token], [200, token], "asking again gives the same link");
  assert.equal((await call("GET", `/api/boards/${board.id}`)).body.shareToken, token);

  const shared = await call("GET", `/api/shared/${token}`);
  assert.equal(shared.status, 200);
  assert.equal(shared.body.title, "Lesson");
  assert.equal(shared.body.id, undefined, "the id would let a viewer edit");
  assert.ok(!JSON.stringify(shared.body).includes(board.id));

  const scene = { elements: [{ id: "a", type: "rectangle" }], appState: {} };
  await call("PUT", `/api/boards/${board.id}`, { scene });
  const updated = await call("GET", `/api/shared/${token}`);
  assert.deepEqual(updated.body.scene, scene, "the link shows what was saved last");
  assert.ok(updated.body.updatedAt > shared.body.updatedAt);

  assert.equal((await call("DELETE", `/api/boards/${board.id}/share`)).status, 204);
  assert.equal((await call("GET", `/api/shared/${token}`)).status, 404, "a link taken away stops working");
  const fresh = await call("POST", `/api/boards/${board.id}/share`);
  assert.notEqual(fresh.body.token, token, "a new link is a new token");

  assert.equal((await call("POST", "/api/boards/no-such-board/share")).status, 404);
  assert.equal((await call("PUT", `/api/boards/${board.id}/share`)).status, 405);
  assert.equal((await call("GET", "/api/shared/not-a-token")).status, 404);
});
