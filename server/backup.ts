// Daily copies of the database, in DATA_DIR/backups: a consistent snapshot (VACUUM INTO, safe while the server runs),
// the newest BACKUP_KEEP kept. They live on the same disk as the database, so they guard against a bad change or a
// damaged file, not a lost disk: copy the folder somewhere else as well.
import type { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const DAY = 24 * 60 * 60 * 1000;
const NAME = /^boards-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.db$/;

/** The backups in the folder, oldest first. */
export function backups(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => NAME.test(f)).sort();
  } catch {
    return [];
  }
}

/** Whether the newest backup is older than a day (or there is none). */
export function backupDue(dir: string, now = Date.now()): boolean {
  const newest = backups(dir).at(-1);
  return !newest || statSync(join(dir, newest)).mtimeMs <= now - DAY;
}

/** Writes a snapshot of the database and deletes all but the newest `keep`. Returns the new file's path. */
export function backup(db: DatabaseSync, dir: string, keep: number, now = Date.now()): string {
  mkdirSync(dir, { recursive: true });
  const stamp = new Date(now).toISOString().slice(0, 19).replace(/:/g, "-");
  const file = join(dir, `boards-${stamp}.db`);
  rmSync(file, { force: true }); // VACUUM INTO won't write over a file
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const all = backups(dir);
  for (const old of all.slice(0, Math.max(0, all.length - keep))) rmSync(join(dir, old), { force: true });
  return file;
}

/** A backup now if one is due, then a check every hour. keep = 0 turns backups off. */
export function scheduleBackups(db: DatabaseSync, dataDir: string, keep: number) {
  if (keep <= 0) return;
  const dir = join(dataDir, "backups");
  const run = () => {
    try {
      if (backupDue(dir)) console.log(`backup: ${backup(db, dir, keep)}`);
    } catch (err) {
      console.error("backup failed:", err);
    }
  };
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}
