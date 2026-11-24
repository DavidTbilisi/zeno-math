// A lesson: two people working side by side, each on a board of their own, each seeing the other's as it changes.
// The host (a board's owner, usually the teacher) starts a lesson on their board and hands out its link. Whoever
// opens the link follows the host's board, and a learner who can own boards gets one of their own for the lesson, made
// the first time they come; the host follows every such board. Nobody writes on another's board, so nothing is ever
// overwritten: a board keeps its one writer. "Hand out" is a mark the guests' pages watch for, at which each copies
// the host's board into its own, so the copying is done by the board's owner too.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { HttpError, send, sendJsonText } from "./http.ts";
import { rawJson, stmt } from "./db.ts";
import { boardUser, type BoardUser } from "./research.ts";

export function initLessons(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      token TEXT PRIMARY KEY,
      -- the host's board; a board has at most one lesson
      board_id TEXT NOT NULL UNIQUE REFERENCES boards(id) ON DELETE CASCADE,
      -- when the host last handed their board out (0: never)
      handout_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lesson_boards (
      lesson TEXT NOT NULL REFERENCES lessons(token) ON DELETE CASCADE,
      -- a guest's own board for the lesson; it stays theirs when the lesson ends
      board_id TEXT NOT NULL UNIQUE REFERENCES boards(id) ON DELETE CASCADE,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (lesson, board_id)
    );
  `);
}

type Lesson = { token: string; boardId: string; handoutAt: number; title: string };
const lessonOf = (db: DatabaseSync, token: string) =>
  stmt(db, "SELECT l.token, l.board_id AS boardId, l.handout_at AS handoutAt, b.title FROM lessons l JOIN boards b ON b.id = l.board_id WHERE l.token = ?")
    .get(token) as Lesson | undefined;

/** The lesson a board hosts, for its owner's page: null for none. */
export const lessonTokenOf = (db: DatabaseSync, boardId: string) =>
  (stmt(db, "SELECT token FROM lessons WHERE board_id = ?").get(boardId) as { token: string } | undefined)?.token ?? null;

/** Starting a lesson on a board (or giving back the one it has), and ending it: the caller has shown the board is theirs. */
export function handleBoardLesson(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, boardId: string) {
  if (req.method === "POST") {
    const had = lessonTokenOf(db, boardId);
    if (had) return send(res, 200, { token: had });
    const token = randomBytes(16).toString("base64url");
    stmt(db, "INSERT INTO lessons (token, board_id, created_at) VALUES (?, ?, ?)").run(token, boardId, Date.now());
    return send(res, 201, { token });
  }
  if (req.method === "DELETE") {
    stmt(db, "DELETE FROM lessons WHERE board_id = ?").run(boardId);
    return send(res, 204);
  }
  return send(res, 405, { error: "method not allowed" });
}

/** Who is asking, or null for a browser that can own no boards (it may still watch the host's board). */
function whoIs(req: IncomingMessage, db: DatabaseSync): BoardUser | null {
  try {
    return boardUser(req, db);
  } catch (e) {
    if (e instanceof HttpError && e.status === 403 && req.headers["x-teacher-password"] === undefined && req.headers["x-student-code"] === undefined) return null;
    throw e;
  }
}

/** A learner's own board in a lesson, if they have joined it. */
function guestBoard(db: DatabaseSync, token: string, user: Exclude<BoardUser, { teacher: true }>): string | null {
  const row = stmt(db, `
    SELECT b.id FROM lesson_boards lb JOIN boards b ON b.id = lb.board_id
    WHERE lb.lesson = ?1 AND (b.student_id = ?2 OR b.account_id = ?3 OR b.student_id IN (SELECT id FROM students WHERE account_id = ?3))
    ORDER BY lb.joined_at LIMIT 1
  `).get(token, user.studentId, user.accountId) as { id: string } | undefined;
  return row?.id ?? null;
}

/** The guests' boards, in the order they joined. Only a teacher is told whose each is (as on the class page). */
function guests(db: DatabaseSync, token: string, named: boolean) {
  const rows = stmt(db, `
    SELECT b.id AS board, b.updated_at AS updatedAt, s.list_no AS number, a.name
    FROM lesson_boards lb JOIN boards b ON b.id = lb.board_id
    LEFT JOIN students s ON s.id = b.student_id
    LEFT JOIN accounts a ON a.id = COALESCE(b.account_id, s.account_id)
    WHERE lb.lesson = ? ORDER BY lb.joined_at, b.id
  `).all(token) as { board: string; updatedAt: number; number: number | null; name: string | null }[];
  return named ? rows : rows.map((r) => ({ ...r, number: null, name: null }));
}

function scene(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, boardId: string) {
  const row = stmt(db, "SELECT title, scene, updated_at AS updatedAt FROM boards WHERE id = ?").get(boardId) as
    { title: string; scene: string; updatedAt: number } | undefined;
  if (!row) return send(res, 404, { error: "no such board" });
  // As for a read-only link: the save time is the ETag, so a follower gets the scene again only once it has changed.
  const etag = `"${row.updatedAt}"`;
  if (req.headers["if-none-match"] === etag) return send(res, 304, undefined, { ETag: etag });
  return sendJsonText(res, 200, rawJson({ title: row.title, updatedAt: row.updatedAt }, { scene: row.scene }), { ETag: etag, "Cache-Control": "no-cache" });
}

/**
 * /api/lessons/:token and what is under it. `owns` says whether a board is the caller's to change (the board rules
 * are the server's own, in index.ts).
 */
export function handleLessons(
  req: IncomingMessage, res: ServerResponse, token: string | undefined, sub: string | undefined, query: URLSearchParams, db: DatabaseSync,
  owns: (user: BoardUser, boardId: string) => boolean,
) {
  if (!token) return send(res, 404, { error: "not found" });
  if (sub !== undefined && !["board", "guest", "handout"].includes(sub)) return send(res, 404, { error: "not found" });
  const method = req.method ?? "";
  const allowed = sub === undefined ? ["GET", "POST"] : sub === "handout" ? ["POST"] : ["GET"];
  if (!allowed.includes(method)) return send(res, 405, { error: "method not allowed" });
  const lesson = lessonOf(db, token);
  if (!lesson) return send(res, 404, { error: "no such lesson" });

  // The host's board, for anyone who has the link: followed like a read-only link.
  if (sub === "board") return scene(req, res, db, lesson.boardId);

  const user = whoIs(req, db);
  const host = !!user && owns(user, lesson.boardId);
  if (sub === "guest") {
    // One guest's board, for the host to follow.
    if (!host) throw new HttpError(403, "only the lesson's host follows its guests");
    const board = query.get("board") ?? "";
    if (!stmt(db, "SELECT 1 FROM lesson_boards WHERE lesson = ? AND board_id = ?").get(token, board)) return send(res, 404, { error: "no such guest" });
    return scene(req, res, db, board);
  }
  if (sub === "handout") {
    if (!host) throw new HttpError(403, "only the lesson's host hands a board out");
    // Strictly later than the last, so two in one millisecond are still two.
    const at = Math.max(Date.now(), lesson.handoutAt + 1);
    stmt(db, "UPDATE lessons SET handout_at = ? WHERE token = ?").run(at, token);
    return send(res, 200, { handoutAt: at });
  }

  const base = { title: lesson.title, handoutAt: lesson.handoutAt };
  if (host) return send(res, 200, { ...base, role: "host", board: lesson.boardId, guests: guests(db, token, user.teacher) });
  // A teacher who is not the host has no board of their own to bring; nor has a browser that owns none.
  if (!user || user.teacher) return send(res, 200, { ...base, role: "viewer" });
  let board = guestBoard(db, token, user);
  if (!board && method === "GET") return send(res, 200, { ...base, role: "viewer" });
  let made = false;
  if (!board) {
    // Joining: a board of the learner's own, named after the host's.
    board = randomUUID();
    made = true;
    const now = Date.now();
    stmt(db, "INSERT INTO boards (id, title, scene, created_at, updated_at, student_id, account_id) VALUES (?, ?, '{}', ?, ?, ?, ?)")
      .run(board, lesson.title, now, now, user.studentId, user.accountId);
    stmt(db, "INSERT INTO lesson_boards (lesson, board_id, joined_at) VALUES (?, ?, ?)").run(token, board, now);
  }
  return send(res, made ? 201 : 200, { ...base, role: "guest", board, ...(made ? { made: true } : {}) });
}
