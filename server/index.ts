// Minimal self-hosted backend: stores boards in SQLite and serves the built frontend.
// Runs directly with Node >= 23.6 (native TypeScript type stripping, built-in node:sqlite).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "data");
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? "dist");
const APP_PASSWORD = process.env.APP_PASSWORD ?? "";
const MAX_BODY = 25 * 1024 * 1024;

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, "boards.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    scene TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

function send(res: ServerResponse, status: number, body?: unknown) {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

// Optional HTTP basic auth, enabled when APP_PASSWORD is set (any username).
function authorized(req: IncomingMessage): boolean {
  if (!APP_PASSWORD) return true;
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Basic ")) return false;
  const password = Buffer.from(header.slice(6), "base64").toString().split(":").slice(1).join(":");
  const a = Buffer.from(password);
  const b = Buffer.from(APP_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cleanTitle(value: unknown): string {
  return String(value ?? "").trim().slice(0, 200) || "Untitled";
}

async function handleApi(req: IncomingMessage, res: ServerResponse, path: string) {
  const [, , resource, id] = path.split("/"); // "", "api", "boards", id?
  if (resource !== "boards") return send(res, 404, { error: "not found" });

  if (!id) {
    if (req.method === "GET") {
      const rows = db
        .prepare("SELECT id, title, created_at AS createdAt, updated_at AS updatedAt FROM boards ORDER BY updated_at DESC")
        .all();
      return send(res, 200, rows);
    }
    if (req.method === "POST") {
      const body = await readJson(req);
      const now = Date.now();
      const board = { id: randomUUID(), title: cleanTitle(body.title), createdAt: now, updatedAt: now };
      db.prepare("INSERT INTO boards (id, title, scene, created_at, updated_at) VALUES (?, ?, '{}', ?, ?)").run(
        board.id, board.title, now, now,
      );
      return send(res, 201, board);
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (req.method === "GET") {
    const row = db
      .prepare("SELECT id, title, scene, updated_at AS updatedAt FROM boards WHERE id = ?")
      .get(id) as { scene: string } | undefined;
    if (!row) return send(res, 404, { error: "not found" });
    return send(res, 200, { ...row, scene: JSON.parse(row.scene) });
  }
  if (req.method === "PUT") {
    const body = await readJson(req);
    const now = Date.now();
    const result = db
      .prepare("UPDATE boards SET title = COALESCE(?, title), scene = COALESCE(?, scene), updated_at = ? WHERE id = ?")
      .run(
        body.title === undefined ? null : cleanTitle(body.title),
        body.scene === undefined ? null : JSON.stringify(body.scene),
        now,
        id,
      );
    return send(res, result.changes ? 200 : 404, result.changes ? { updatedAt: now } : { error: "not found" });
  }
  if (req.method === "DELETE") {
    db.prepare("DELETE FROM boards WHERE id = ?").run(id);
    return send(res, 204);
  }
  return send(res, 405, { error: "method not allowed" });
}

function serveStatic(res: ServerResponse, path: string) {
  let file = normalize(join(STATIC_DIR, decodeURIComponent(path)));
  if (!file.startsWith(STATIC_DIR)) return send(res, 403);
  try {
    if (!statSync(file).isFile()) throw new Error();
  } catch {
    file = join(STATIC_DIR, "index.html"); // SPA fallback
  }
  try {
    const cache = file.includes(`${join(STATIC_DIR, "assets")}`) || file.includes("fonts")
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res
      .writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": cache })
      .end(readFileSync(file));
  } catch {
    send(res, 404, { error: "frontend not built — run `npm run build`" });
  }
}

createServer(async (req, res) => {
  if (!authorized(req)) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Zeno"' }).end();
    return;
  }
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  try {
    if (path.startsWith("/api/")) await handleApi(req, res, path);
    else serveStatic(res, path);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 400, { error: (err as Error).message });
  }
}).listen(PORT, () => {
  console.log(`Zeno listening on http://localhost:${PORT} (data: ${DATA_DIR})`);
});
