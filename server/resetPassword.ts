// A link for a new password, made by whoever runs the server, for a server that sends no mail (or a learner whose
// address was mistyped): `npm run reset-password -- someone@example.org`, or in the container
// `docker compose exec app node server/resetPassword.ts someone@example.org`. The link works once, for one hour;
// hand it to the account's owner yourself.
import { DatabaseSync } from "node:sqlite";
import { join, resolve } from "node:path";
import { linkFor, makeToken } from "./accounts.ts";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("usage: node server/resetPassword.ts <email>");
  process.exit(2);
}
const db = new DatabaseSync(join(resolve(process.env.DATA_DIR ?? "data"), "boards.db"));
db.exec("PRAGMA busy_timeout = 5000");
const row = db.prepare("SELECT id FROM accounts WHERE email = ?").get(email) as { id: number } | undefined;
if (!row) {
  console.error(`no account has the email ${email}`);
  process.exit(1);
}
const site = (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 8787}`).replace(/\/+$/, "");
console.log(linkFor(site, "reset", makeToken(db, row.id, "reset")));
db.close();
