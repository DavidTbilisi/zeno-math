// Games assigned to a class: the teacher picks games with a ladder (src/model/gameKeys.ts), each student's site lists
// them, and a signed-in student's browser sends the stars of an assigned game whenever its ladder changes (and once
// on each page, in case a send was lost). Only the best stars of each puzzle are kept, so a student playing on two
// devices, or sending an old copy, never loses a star. The teacher sees who has played each game and who has passed it.
//
// Games are extra practice, so they open as homework does (homework.ts): once the class has given its delayed
// post-test, or at any time in a class out of the study, and never while a test runs. Taking the games off is always
// allowed.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { isGameId, ladderDone, MAX_CLASS_GAMES, mergeStars, parseStars, type GameId } from "../src/model/gameKeys.ts";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { homeworkOpen } from "./homework.ts";

export function initClassGames(db: DatabaseSync) {
  const has = (stmt(db, "PRAGMA table_info(classes)").all() as { name: string }[]).some((c) => c.name === "games");
  // The games assigned to the class, in the teacher's order (JSON array of game ids); NULL: none.
  if (!has) db.exec("ALTER TABLE classes ADD COLUMN games TEXT");
  db.exec(`
    -- a student's best stars on each assigned game they have played, one number per puzzle (JSON array)
    CREATE TABLE IF NOT EXISTS game_stars (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      game TEXT NOT NULL,
      stars TEXT NOT NULL,
      passed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, game)
    );
  `);
}

/** The games assigned to a class, in order (none for no such class). */
export function classGames(db: DatabaseSync, classCode: string): GameId[] {
  const row = stmt(db, "SELECT games FROM classes WHERE code = ?").get(classCode) as { games: string | null } | undefined;
  return row?.games ? (JSON.parse(row.games) as unknown[]).filter(isGameId) : [];
}

/** The games from what a teacher sent: known game ids, each once, in the order sent. */
export function parseGames(v: unknown): GameId[] {
  if (!Array.isArray(v) || v.length > MAX_CLASS_GAMES) throw new HttpError(400, `games must be a list of at most ${MAX_CLASS_GAMES} games`);
  const bad = v.find((g) => !isGameId(g));
  if (bad !== undefined) throw new HttpError(400, `unknown game: ${String(bad).slice(0, 40)}`);
  return [...new Set(v as GameId[])];
}

/**
 * POST /api/classes/:code/games (teacher): { games: GameId[] } — the class's games, [] for none. Games open as
 * homework does (409 before then); taking them all off is always allowed.
 */
export async function setGames(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, 8192);
  const games = parseGames(body.games);
  if (!stmt(db, "SELECT 1 FROM classes WHERE code = ?").get(classCode)) return send(res, 404, { error: "no such class" });
  if (games.length && !homeworkOpen(db, classCode)) return send(res, 409, { error: "games open with homework: after the delayed post-test, or out of the study" });
  stmt(db, "UPDATE classes SET games = ? WHERE code = ?").run(games.length ? JSON.stringify(games) : null, classCode);
  return send(res, 200, { games });
}

/**
 * POST /api/students/:code/games (the student's browser): { game, stars } — the ladder of an assigned game as it is
 * now in that browser. Kept puzzle by puzzle at the best stars sent; a game not assigned to the class is refused (409),
 * so nothing is kept about games the teacher didn't ask for.
 */
export async function recordStars(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, student: { id: number; class: string }) {
  const body = await readJson(req, 4096);
  if (!isGameId(body.game)) throw new HttpError(400, "unknown game");
  const stars = parseStars(body.stars);
  if (!stars) throw new HttpError(400, "stars must be a list of 0–3 for each puzzle");
  const game = body.game;
  if (!classGames(db, student.class).includes(game)) return send(res, 409, { error: "this game isn't assigned to the class" });
  const now = Date.now();
  const kept = transaction(db, () => {
    const old = stmt(db, "SELECT stars, passed_at FROM game_stars WHERE student_id = ? AND game = ?").get(student.id, game) as
      { stars: string; passed_at: number | null } | undefined;
    const best = old ? mergeStars(JSON.parse(old.stars) as number[], stars) : stars;
    const passedAt = old?.passed_at ?? (ladderDone(best) ? now : null);
    stmt(db, `
      INSERT INTO game_stars (student_id, game, stars, passed_at, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (student_id, game) DO UPDATE SET stars = excluded.stars, passed_at = excluded.passed_at, updated_at = excluded.updated_at
    `).run(student.id, game, JSON.stringify(best), passedAt, now);
    return { stars: best, passed: passedAt !== null };
  });
  return send(res, 200, kept);
}

/** For the teacher's dashboard: the games assigned, whether they can be assigned now, and each student's stars on them. */
export function gamesOverview(db: DatabaseSync, classCode: string, students: readonly { id: number }[]) {
  const assigned = classGames(db, classCode);
  const rows = stmt(db, `
    SELECT g.student_id, g.game, g.stars, g.passed_at FROM game_stars g JOIN students s ON s.id = g.student_id WHERE s.class_code = ?
  `).all(classCode) as { student_id: number; game: string; stars: string; passed_at: number | null }[];
  const ids = new Set(students.map((s) => s.id));
  const stars: Record<string, Partial<Record<GameId, { stars: number[]; passedAt: number | null }>>> = {};
  for (const r of rows) {
    if (!ids.has(r.student_id) || !isGameId(r.game)) continue;
    (stars[`s${r.student_id}`] ??= {})[r.game] = { stars: JSON.parse(r.stars) as number[], passedAt: r.passed_at };
  }
  return { assigned, open: homeworkOpen(db, classCode), stars };
}
