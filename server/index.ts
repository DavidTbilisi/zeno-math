// Minimal self-hosted backend: stores boards (and the practice study's learner records, see research.ts) in SQLite and
// serves the built frontend.
// Runs directly with Node >= 23.6 (native TypeScript type stripping, built-in node:sqlite).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { HttpError, readJson, send } from "./http.ts";
import { clientOf, passwords } from "./limiter.ts";
import { scheduleBackups } from "./backup.ts";
import { handleResearch, initResearch, RESEARCH_RESOURCES } from "./research.ts";

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? "data");
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? "dist");
const APP_PASSWORD = process.env.APP_PASSWORD ?? "";

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, "boards.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    scene TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
// A board shared read-only has a token: the link /#/s/<token> shows it without the board's id (which would edit it).
if (!(db.prepare("PRAGMA table_info(boards)").all() as { name: string }[]).some((c) => c.name === "share_token"))
  db.exec("ALTER TABLE boards ADD COLUMN share_token TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS boards_share_token ON boards(share_token)");
initResearch(db);
// The schema this code writes. A database from a newer Zeno is refused rather than half understood; an older one has
// just been brought up to date by the CREATE / ADD COLUMN steps above.
const SCHEMA_VERSION = 5;
const { user_version: found } = db.prepare("PRAGMA user_version").get() as { user_version: number };
if (found > SCHEMA_VERSION) {
  console.error(`The database in ${DATA_DIR} is from a newer version of Zeno (schema ${found}; this one knows ${SCHEMA_VERSION}). Update Zeno.`);
  process.exit(1);
}
db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
scheduleBackups(db, DATA_DIR, process.env.BACKUP_KEEP === undefined ? 7 : Number(process.env.BACKUP_KEEP));

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

// Sent with every response. The page itself also gets a CSP: everything from this server, no inline scripts
// (Excalidraw needs inline styles, data:/blob: images and WebAssembly for font subsetting).
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "SAMEORIGIN",
};
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // Fonts come from /fonts; Excalidraw always lists its CDN as a fallback source after it.
  "font-src 'self' data: https://esm.sh",
  // Libraries chosen on libraries.excalidraw.com ("Browse libraries" in the Library tab) are fetched from there.
  "connect-src 'self' data: blob: https://libraries.excalidraw.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

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

async function handleApi(req: IncomingMessage, res: ServerResponse, path: string, query: URLSearchParams) {
  const [, , resource, id, sub, ...deeper] = path.split("/"); // "", "api", "boards", id?, sub?
  // No route goes deeper than /api/resource/id/sub.
  if (deeper.length) return send(res, 404, { error: "not found" });
  if (RESEARCH_RESOURCES.has(resource)) return handleResearch(req, res, resource, id, sub, query, db);
  // A board shared read-only, by its token: the scene and title, never the id.
  if (resource === "shared" && id && sub === undefined && req.method === "GET") {
    const row = db.prepare("SELECT title, scene, updated_at AS updatedAt FROM boards WHERE share_token = ?").get(id) as
      { title: string; scene: string; updatedAt: number } | undefined;
    return row ? send(res, 200, { ...row, scene: JSON.parse(row.scene) }) : send(res, 404, { error: "no such shared board" });
  }
  // Making a read-only link (or giving back the one there is), and taking it away.
  if (resource === "boards" && id && sub === "share") {
    const row = db.prepare("SELECT share_token AS token FROM boards WHERE id = ?").get(id) as { token: string | null } | undefined;
    if (!row) return send(res, 404, { error: "no such board" });
    if (req.method === "POST") {
      const token = row.token ?? randomBytes(16).toString("base64url");
      db.prepare("UPDATE boards SET share_token = ? WHERE id = ?").run(token, id);
      return send(res, row.token ? 200 : 201, { token });
    }
    if (req.method === "DELETE") {
      db.prepare("UPDATE boards SET share_token = NULL WHERE id = ?").run(id);
      return send(res, 204);
    }
    return send(res, 405, { error: "method not allowed" });
  }
  // Nothing below has a third level, and only boards take an id: /api/boards/x/anything is not a board.
  if (sub !== undefined || (id !== undefined && resource !== "boards")) return send(res, 404, { error: "not found" });
  if (resource === "health" && req.method === "GET") {
    db.prepare("SELECT 1").get();
    return send(res, 200, { ok: true });
  }
  // Every board in one file, for backups.
  if (resource === "export" && req.method === "GET") {
    const rows = db
      .prepare("SELECT id, title, scene, created_at AS createdAt, updated_at AS updatedAt FROM boards ORDER BY created_at")
      .all() as { scene: string }[];
    const stamp = new Date().toISOString().slice(0, 10);
    return send(res, 200, { app: "zeno", exportedAt: Date.now(), boards: rows.map((r) => ({ ...r, scene: JSON.parse(r.scene) })) }, {
      "Content-Disposition": `attachment; filename="zeno-boards-${stamp}.json"`,
    });
  }
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
      .prepare("SELECT id, title, scene, updated_at AS updatedAt, share_token AS shareToken FROM boards WHERE id = ?")
      .get(id) as { scene: string } | undefined;
    if (!row) return send(res, 404, { error: "not found" });
    return send(res, 200, { ...row, scene: JSON.parse(row.scene) });
  }
  if (req.method === "PUT") {
    const body = await readJson(req);
    // A scene that clients can't load would break the board for everyone.
    const scene = body.scene;
    if (scene !== undefined && (scene === null || typeof scene !== "object" || Array.isArray(scene) || !Array.isArray(scene.elements))) {
      return send(res, 400, { error: "scene must be an object with an elements array" });
    }
    const last = db.prepare("SELECT updated_at AS updatedAt FROM boards WHERE id = ?").get(id) as { updatedAt: number } | undefined;
    if (!last) return send(res, 404, { error: "not found" });
    // A client that sends the updatedAt it last saw is refused if someone else saved since (another tab or device).
    if (typeof body.baseUpdatedAt === "number" && last.updatedAt !== body.baseUpdatedAt) {
      return send(res, 409, { error: "conflict", updatedAt: last.updatedAt });
    }
    // Strictly increasing, so two saves in the same millisecond still differ.
    const now = Math.max(Date.now(), last.updatedAt + 1);
    const result = db
      .prepare("UPDATE boards SET title = COALESCE(?, title), scene = COALESCE(?, scene), updated_at = ? WHERE id = ?")
      .run(
        body.title === undefined ? null : cleanTitle(body.title),
        body.scene === undefined ? null : JSON.stringify(body.scene),
        now,
        id,
      );
    return send(res, result.changes ? 200 : 404, result.changes ? { updatedAt: now, previous: last.updatedAt } : { error: "not found" });
  }
  if (req.method === "DELETE") {
    db.prepare("DELETE FROM boards WHERE id = ?").run(id);
    return send(res, 204);
  }
  return send(res, 405, { error: "method not allowed" });
}

const isFile = (file: string) => {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
};

// Keep what's been read in memory; a rebuild (new modification time) is picked up without a restart.
const fileCache = new Map<string, { mtime: number; data: Buffer }>();
function readCached(file: string): Buffer {
  const mtime = statSync(file).mtimeMs;
  let hit = fileCache.get(file);
  if (!hit || hit.mtime !== mtime) fileCache.set(file, (hit = { mtime, data: readFileSync(file) }));
  return hit.data;
}

function serveStatic(req: IncomingMessage, res: ServerResponse, path: string) {
  let file = normalize(join(STATIC_DIR, decodeURIComponent(path)));
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) return send(res, 403);
  if (!isFile(file)) file = join(STATIC_DIR, "index.html"); // SPA fallback
  // Send the .br / .gz copy written by scripts/compress.mjs when the browser accepts it.
  const accept = String(req.headers["accept-encoding"] ?? "");
  const encoding = [["br", ".br"], ["gzip", ".gz"]].find(([name, ext]) => accept.includes(name) && isFile(file + ext));
  try {
    const cache = file.startsWith(join(STATIC_DIR, "assets") + sep) || file.startsWith(join(STATIC_DIR, "fonts") + sep)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res
      .writeHead(200, {
        "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
        "Cache-Control": cache,
        Vary: "Accept-Encoding",
        ...(extname(file) === ".html" ? { "Content-Security-Policy": CSP } : {}),
        ...(encoding ? { "Content-Encoding": encoding[0] } : {}),
      })
      .end(readCached(encoding ? file + encoding[1] : file));
  } catch {
    send(res, 404, { error: "frontend not built — run `npm run build`" });
  }
}

const server = createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  // The health check reveals nothing, so Docker can probe it without the password.
  if (path !== "/api/health" && APP_PASSWORD) {
    const client = clientOf(req);
    const wait = passwords.retryAfter(client);
    if (wait) return send(res, 429, { error: "too many wrong passwords; try again later" }, { "Retry-After": String(wait) });
    if (!authorized(req)) {
      // A browser's first request carries no password: only a wrong one counts.
      if (req.headers.authorization) passwords.fail(client);
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Zeno"' }).end();
      return;
    }
  }
  try {
    if (path.startsWith("/api/")) await handleApi(req, res, path, url.searchParams);
    else serveStatic(req, res, path);
  } catch (err) {
    if (err instanceof HttpError) {
      // An oversized upload is not read to the end: answer, then close the connection so it isn't reused.
      if (!res.headersSent) send(res, err.status, { error: err.message }, { ...err.headers, ...(err.status === 413 ? { Connection: "close" } : {}) });
      if (err.status === 413) res.once("finish", () => req.destroy());
      return;
    }
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: "internal error" });
  }
}).listen(PORT, () => {
  console.log(`Zeno listening on http://localhost:${PORT} (data: ${DATA_DIR})`);
});

// Docker stops containers with SIGTERM: finish, close the database cleanly, exit.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}
