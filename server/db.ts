// Small helpers around node:sqlite: statements prepared once per database and reused, and a transaction.
import type { DatabaseSync, StatementSync } from "node:sqlite";

const prepared = new WeakMap<DatabaseSync, Map<string, StatementSync>>();

/** The statement for this SQL, prepared the first time it is asked for. Every call is synchronous, so a statement is never in use twice at once. */
export function stmt(db: DatabaseSync, sql: string): StatementSync {
  let cache = prepared.get(db);
  if (!cache) prepared.set(db, (cache = new Map()));
  let s = cache.get(sql);
  if (!s) cache.set(sql, (s = db.prepare(sql)));
  return s;
}

/** Runs `fn` inside one transaction: all of its writes are stored, or none (and the error is thrown on). */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Sends JSON that already holds a serialised piece (a board's scene) without parsing and re-serialising it. */
export const rawJson = (parts: Record<string, unknown>, raw: Record<string, string>) =>
  `{${[
    ...Object.entries(parts).filter(([, v]) => v !== undefined).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`),
    ...Object.entries(raw).map(([k, v]) => `${JSON.stringify(k)}:${v}`),
  ].join(",")}}`;
