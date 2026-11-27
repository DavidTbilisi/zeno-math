// A restore drill: a backup of the database (server/backup.ts writes one a day) is copied into a fresh data folder,
// Zeno is started on it, and what the file holds is checked against what Zeno serves from it. Every class with as many
// students and practice questions, every test answer and practice question in the exports, and every board opening.
// The backup itself is never written to. It fails (exit code 1) if the file is damaged, from a newer Zeno, or anything
// in it doesn't come back.
//
//   npm run restore-check -- ~/.local/share/zeno-math/backups/boards-2026-11-02T03-30-00.db
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseCsv } from "../src/model/evaluate.ts";
import { SESSION_COOKIE } from "../server/accounts.ts";
import { startServer, type Check } from "./dry-run-study.ts";

export type RestoreResult = { checks: Check[]; counts: Record<string, number> };

export async function restoreCheck(backupFile: string): Promise<RestoreResult> {
  const dir = mkdtempSync(join(tmpdir(), "zeno-restore-"));
  const checks: Check[] = [];
  const counts: Record<string, number> = {};
  try {
    const data = join(dir, "data");
    mkdirSync(data);
    copyFileSync(backupFile, join(data, "boards.db"));

    // What the file holds, read before Zeno has touched the copy.
    type ClassRow = { code: string; students: number; attempts: number; tests: number };
    let classes: ClassRow[] = [];
    // A board an account owns opens only for that account (a teacher reads it only through a class): it is read as its owner.
    let boards: { id: string; account: number | null }[] = [];
    try {
      const db = new DatabaseSync(join(data, "boards.db"), { readOnly: true });
      const integrity = (db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
      checks.push({ name: "the file is a whole SQLite database", ok: integrity === "ok", detail: integrity === "ok" ? "" : integrity });
      const has = (table: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
      const owned = (db.prepare("PRAGMA table_info(boards)").all() as { name: string }[]).some((c) => c.name === "account_id");
      boards = db.prepare(`SELECT id, ${owned ? "account_id" : "NULL"} AS account FROM boards`).all() as typeof boards;
      if (has("classes"))
        classes = db.prepare(`
          SELECT c.code,
            (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code) AS students,
            (SELECT COUNT(*) FROM attempts a JOIN students s ON s.id = a.student_id WHERE s.class_code = c.code) AS attempts,
            ${has("test_responses") ? "(SELECT COUNT(*) FROM test_responses t JOIN students s ON s.id = t.student_id WHERE s.class_code = c.code)" : "0"} AS tests
          FROM classes c ORDER BY c.code
        `).all() as ClassRow[];
      db.close();
    } catch (e) {
      checks.push({ name: "the file is a whole SQLite database", ok: false, detail: (e as Error).message });
      return { checks, counts };
    }
    counts.classes = classes.length;
    counts.students = classes.reduce((n, c) => n + c.students, 0);
    counts.attempts = classes.reduce((n, c) => n + c.attempts, 0);
    counts.tests = classes.reduce((n, c) => n + c.tests, 0);
    counts.boards = boards.length;

    const teacher = "restore-check";
    let server: Awaited<ReturnType<typeof startServer>>;
    try {
      // No backups of the copy: it is thrown away.
      server = await startServer(data, teacher, { BACKUP_KEEP: "0" });
    } catch (e) {
      checks.push({ name: "Zeno opens it", ok: false, detail: `${(e as Error).message} (a damaged file, or one from a newer Zeno)` });
      return { checks, counts };
    }
    try {
      const get = async (path: string, cookie?: string) => {
        const res = await fetch(server.base + path, { headers: cookie ? { Cookie: cookie } : { "X-Teacher-Password": teacher } });
        return { status: res.status, text: await res.text() };
      };
      checks.push({ name: "Zeno opens it", ok: (await get("/api/health")).status === 200, detail: "" });

      const served = JSON.parse((await get("/api/classes")).text) as { code: string; students: number; attempts: number }[];
      const same = JSON.stringify(served.map((c) => [c.code, c.students, c.attempts]).sort()) === JSON.stringify(classes.map((c) => [c.code, c.students, c.attempts]).sort());
      checks.push({ name: "every class, with its students and practice questions", ok: same, detail: `${counts.classes} classes, ${counts.students} students, ${counts.attempts} practice questions` });

      const missing: string[] = [];
      for (const c of classes) {
        const rows = async (kind: string) => parseCsv((await get(`/api/research/${kind}.csv?class=${c.code}`)).text).length;
        if ((await rows("attempts")) !== c.attempts) missing.push(`${c.code} practice`);
        if ((await rows("tests")) !== c.tests) missing.push(`${c.code} tests`);
      }
      checks.push({ name: "every practice question and test answer in the exports", ok: !missing.length, detail: missing.length ? `short: ${missing.join(", ")}` : `${counts.tests} test answers` });

      // A session for each owner, written into the throw-away copy after Zeno has made its tables.
      const cookies = new Map<number, string>();
      const owners = [...new Set(boards.flatMap((b) => (b.account === null ? [] : [b.account])))];
      if (owners.length) {
        const db = new DatabaseSync(join(data, "boards.db"));
        const now = Date.now();
        for (const account of owners) {
          const token = randomBytes(32).toString("base64url");
          db.prepare("INSERT INTO sessions (token, account_id, created_at, seen_at, expires_at) VALUES (?, ?, ?, ?, ?)")
            .run(createHash("sha256").update(token).digest("hex"), account, now, now, now + 3_600_000);
          cookies.set(account, `${SESSION_COOKIE}=${token}`);
        }
        db.close();
      }
      let opened = 0;
      for (const b of boards)
        if ((await get(`/api/boards/${b.id}`, b.account === null ? undefined : cookies.get(b.account))).status === 200) opened++;
      checks.push({ name: "every board opens", ok: opened === boards.length, detail: `${opened} of ${boards.length}` });
    } finally {
      await server.stop();
    }
    return { checks, counts };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: npm run restore-check -- <backup .db file>");
    process.exit(2);
  }
  const { checks } = await restoreCheck(file);
  console.log(`Restore check of ${file}\n`);
  for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
}
