// Anonymous usage counts (issue #615): which pages, tools and steps get used, day by day, so the site can be made
// better without learning who uses it. The browser sends event names (src/usage.ts) and the server adds them to daily
// counts. Nothing about the sender is kept: no cookie, no visitor id, no address. A "visit" is one page load: the
// browser marks an event `first` the first time it happens in that page load, and that mark is all the server sees.
//
// Anyone may send (the front page is open to anyone, and so is the published one on another host), so what is taken
// is bounded on every side: the kinds are fixed, a name is short and plain, a day holds so many names of a kind, and
// one address so many events in ten minutes. A flood can make a day's numbers wrong; it cannot grow the database.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { HttpError, send } from "./http.ts";
import { clientOf } from "./limiter.ts";
import { stmt, transaction } from "./db.ts";

/** What is counted. visit: page loads, by site; page: pages opened; tool: pieces and pictures put on a board; skill:
 * practice skills tried; step: the way from the front page to practising; from: the host a visitor came from; error:
 * script errors. */
export const USAGE_KINDS = ["visit", "page", "tool", "skill", "step", "from", "screen", "lang", "error"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];
export type UsageRow = { name: string; hits: number; visits: number };
/** days: every day asked for, oldest first; kinds: each kind's names summed over those days, most visits first. */
export type UsageReport = { on: boolean; days: { day: string; visits: number; hits: number }[]; kinds: Record<UsageKind, UsageRow[]> };

/** USAGE=off: nothing is counted (what was counted before stays readable). */
const ON = !["off", "0", "false", "no"].includes(String(process.env.USAGE ?? "").toLowerCase());
const MAX_BODY = 8 * 1024;
const MAX_EVENTS = 40;
/** Letters, digits and the few marks a page address, a host name or an error message needs. */
export const USAGE_NAME = /^[\w .:'()/-]{1,80}$/;
/** Names of one kind a day may hold; the rest of that day's are counted together as OTHER. */
const NAMES_PER_DAY = 1000;
const OTHER = "(other)";
/** Events one address may send in WINDOW_MS: a class behind one address is thirty browsers at once. */
const EVENTS_PER_WINDOW = 3000;
const WINDOW_MS = 10 * 60_000;
const CLIENTS = 10_000;
const KEEP_DAYS = 730;

export function initUsage(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_counts (
      day TEXT NOT NULL,    -- the UTC date, 2026-11-24
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,    -- times it happened
      visits INTEGER NOT NULL DEFAULT 0,  -- page loads it happened in
      PRIMARY KEY (day, kind, name)
    ) WITHOUT ROWID
  `);
}

export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

/** How many events each address has sent since its window began; the address seen longest ago goes first when full. */
const sent = new Map<string, { since: number; n: number }>();
/** How many more events this address may send now, and counts `want` of them as sent. */
function allow(client: string, want: number, now: number): number {
  let entry = sent.get(client);
  if (!entry || entry.since <= now - WINDOW_MS) entry = { since: now, n: 0 };
  const granted = Math.max(0, Math.min(want, EVENTS_PER_WINDOW - entry.n));
  entry.n += granted;
  sent.delete(client);
  sent.set(client, entry);
  while (sent.size > CLIENTS) sent.delete(sent.keys().next().value!);
  return granted;
}

type Event = { kind: UsageKind; name: string; first: boolean };

/** The events in what was sent that can be counted; anything else in it is passed over. */
export function usageEvents(body: unknown): Event[] {
  const list = body !== null && typeof body === "object" && Array.isArray((body as { events?: unknown }).events) ? (body as { events: unknown[] }).events : [];
  const events: Event[] = [];
  for (const e of list.slice(0, MAX_EVENTS)) {
    if (e === null || typeof e !== "object") continue;
    const { kind, name, first } = e as Record<string, unknown>;
    if (typeof kind !== "string" || typeof name !== "string") continue;
    if (!(USAGE_KINDS as readonly string[]).includes(kind) || !USAGE_NAME.test(name) || name === OTHER) continue;
    events.push({ kind: kind as UsageKind, name, first: first === true });
  }
  return events;
}

let pruned = "";
/** Adds the events to the day's counts. A name the day has no room for is counted under OTHER. */
export function countUsage(db: DatabaseSync, events: Event[], now = Date.now()) {
  if (!events.length) return;
  const day = dayOf(now);
  transaction(db, () => {
    if (pruned !== day) {
      pruned = day;
      stmt(db, "DELETE FROM usage_counts WHERE day < ?").run(dayOf(now - KEEP_DAYS * 86_400_000));
    }
    const add = stmt(db, "UPDATE usage_counts SET hits = hits + 1, visits = visits + ? WHERE day = ? AND kind = ? AND name = ?");
    const names = stmt(db, "SELECT COUNT(*) AS n FROM usage_counts WHERE day = ? AND kind = ?");
    const insert = stmt(db, "INSERT INTO usage_counts (day, kind, name, hits, visits) VALUES (?, ?, ?, 1, ?) ON CONFLICT DO UPDATE SET hits = hits + 1, visits = visits + excluded.visits");
    for (const { kind, name, first } of events) {
      const visit = first ? 1 : 0;
      if (add.run(visit, day, kind, name).changes) continue;
      const full = (names.get(day, kind) as { n: number }).n >= NAMES_PER_DAY;
      insert.run(day, kind, full ? OTHER : name, visit);
    }
  });
}

/** What was sent, read as JSON whatever type it claims: a page on another host can only send plain text unasked. */
async function readEvents(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "body too large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}

/** The counts of the last `days` days (today included), for the usage page. */
export function usageReport(db: DatabaseSync, days: number, now = Date.now()): UsageReport {
  const span = Math.min(366, Math.max(1, Math.floor(days) || 30));
  const since = dayOf(now - (span - 1) * 86_400_000);
  const perDay = new Map(
    (stmt(db, "SELECT day, SUM(hits) AS hits, SUM(visits) AS visits FROM usage_counts WHERE kind = 'visit' AND day >= ? GROUP BY day").all(since) as
      { day: string; hits: number; visits: number }[]).map((r) => [r.day, r]),
  );
  const rows = stmt(db, `
    SELECT kind, name, SUM(hits) AS hits, SUM(visits) AS visits FROM usage_counts WHERE day >= ?
    GROUP BY kind, name ORDER BY visits DESC, hits DESC, name
  `).all(since) as ({ kind: UsageKind } & UsageRow)[];
  const kinds = Object.fromEntries(USAGE_KINDS.map((k) => [k, [] as UsageRow[]])) as Record<UsageKind, UsageRow[]>;
  for (const { kind, ...row } of rows) kinds[kind]?.push(row);
  return {
    on: ON,
    days: Array.from({ length: span }, (_, i) => {
      const day = dayOf(now - (span - 1 - i) * 86_400_000);
      return { day, visits: perDay.get(day)?.visits ?? 0, hits: perDay.get(day)?.hits ?? 0 };
    }),
    kinds,
  };
}

/**
 * POST /api/usage { events: [{ kind, name, first }] }: counted, and answered 204 whatever was in it (a sender learns
 * nothing from the answer). GET /api/usage?days=30: the report, for whoever `reader` lets through (a teacher).
 */
export async function handleUsage(req: IncomingMessage, res: ServerResponse, query: URLSearchParams, db: DatabaseSync, reader: (req: IncomingMessage) => void) {
  if (req.method === "POST") {
    const events = usageEvents(await readEvents(req));
    if (ON) countUsage(db, events.slice(0, allow(clientOf(req), events.length, Date.now())));
    return send(res, 204);
  }
  if (req.method === "GET") {
    reader(req);
    return send(res, 200, usageReport(db, Number(query.get("days"))));
  }
  return send(res, 405, { error: "method not allowed" });
}
