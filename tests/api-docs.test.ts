// docs/api.md against the running server: every route in its table exists, and every other method and path on the
// same resources answers 404 or 405, so a route added without documenting it (or documented and since removed) fails.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../scripts/dry-run-study.ts";

const dir = mkdtempSync(join(tmpdir(), "zeno-api-docs-"));
let server: Awaited<ReturnType<typeof startServer>>;
before(async () => (server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), "chalk")));
after(async () => {
  await server.stop();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;
/** The routes table: | METHOD | `path` | … |, with "[?…]" and "?…" query parts dropped. */
const documented = [...readFileSync("docs/api.md", "utf8").matchAll(/^\| (GET|POST|PUT|DELETE) \| `([^`]+)` \|/gm)].map(([, method, path]) => ({
  method,
  path: path.replace(/\[\?[^\]]*\]|\?.*$/g, ""),
}));
const key = (method: string, path: string) => `${method} ${path}`;

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(server.base + path, {
    method,
    headers: { "Content-Type": "application/json", "X-Teacher-Password": "chalk" },
    body: body === undefined && method !== "POST" && method !== "PUT" ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let error: string | undefined;
  try {
    error = JSON.parse(text).error;
  } catch {
    // not JSON: no error message
  }
  return { status: res.status, error };
};
/** The router's own answers for a path or method it doesn't have, as opposed to a route saying "no such student". */
const unrouted = (r: { status: number; error?: string }) => r.status === 405 || (r.status === 404 && r.error === "not found");

test("the API reference lists the routes", () => {
  assert.ok(documented.length >= 19, `${documented.length} routes in docs/api.md`);
  assert.equal(new Set(documented.map((d) => key(d.method, d.path))).size, documented.length, "no route listed twice");
});

test("every route in the API reference exists, and nothing else on its resources answers", async () => {
  const board = (await (await fetch(`${server.base}/api/boards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json()).id as string;
  const doomed = (await (await fetch(`${server.base}/api/boards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json()).id as string;
  const klass = (await (await fetch(`${server.base}/api/classes`, { method: "POST", headers: { "Content-Type": "application/json", "X-Teacher-Password": "chalk" }, body: "{}" })).json()).code as string;
  const join = async () => (await (await fetch(`${server.base}/api/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ class: klass }) })).json()).code as string;
  const [student, leaver] = [await join(), await join()];
  const fill = (path: string, method: string) =>
    path
      .replace(":id", method === "DELETE" ? doomed : board)
      .replace(":code/phase", `${klass}/phase`)
      .replace(":code", method === "DELETE" ? leaver : student) + (path.endsWith("/dashboard") ? `?class=${klass}` : "");

  for (const d of documented) {
    const r = await call(d.method, fill(d.path, d.method));
    assert.ok(!unrouted(r), `${d.method} ${d.path} → ${r.status} ${r.error ?? ""}: documented but not routed`);
  }

  // Every method on every path shape the documented resources use, plus a few near misses.
  const shapes = new Set([
    ...documented.map((d) => d.path),
    "/api/boards/:id/extra", "/api/classes/:code", "/api/classes/:code/students", "/api/students/:code/attempts",
    "/api/attempts/:id", "/api/tests/:id", "/api/research", "/api/research/students.csv", "/api/health/:id", "/api/export/:id", "/api/nothing",
  ]);
  const listed = new Set(documented.map((d) => key(d.method, d.path)));
  for (const shape of shapes)
    for (const method of METHODS) {
      if (listed.has(key(method, shape))) continue;
      const r = await call(method, fill(shape, method));
      assert.ok(unrouted(r) || r.status === 404, `${method} ${shape} → ${r.status} ${r.error ?? ""}: routed but not in docs/api.md`);
    }
});
