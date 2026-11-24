// Accounts (server/accounts.ts, issue #605): sign up, sign in on another device, sign out, a new password by mail
// (against a stand-in SMTP server), confirming the address, and deleting the account; and what is refused.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addressOf, compose, encodeHeader, mailSettings } from "../server/mail.ts";
import { hashPassword, passwordMatches } from "../server/accounts.ts";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "zeno-account-"));
const servers: ChildProcess[] = [];

/** What the stand-in mail server was handed: who signed in, and each message as sent. */
type Got = { auth: string | null; from: string; to: string; data: string };
const inbox: Got[] = [];
let smtp: Server;
/** A mail server that speaks just enough SMTP: no TLS (it is on this machine), AUTH PLAIN, one message a connection. */
function startSmtp(): Promise<number> {
  smtp = createServer((socket) => {
    const got: Got = { auth: null, from: "", to: "", data: "" };
    let inData = false;
    let buffer = "";
    socket.write("220 stand-in ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      for (;;) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          got.data = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          inbox.push(got);
          socket.write("250 queued\r\n");
          continue;
        }
        const i = buffer.indexOf("\r\n");
        if (i < 0) return;
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        if (/^EHLO /i.test(line)) socket.write("250-stand-in\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
        else if (/^AUTH PLAIN /i.test(line)) (got.auth = Buffer.from(line.slice(11), "base64").toString()), socket.write("235 welcome\r\n");
        else if (/^MAIL FROM:/i.test(line)) (got.from = line.slice(10)), socket.write("250 ok\r\n");
        else if (/^RCPT TO:/i.test(line)) (got.to = line.slice(8)), socket.write("250 ok\r\n");
        else if (/^DATA$/i.test(line)) (inData = true), socket.write("354 go on\r\n");
        else if (/^QUIT$/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("500 what?\r\n");
      }
    });
    socket.on("error", () => {});
  });
  return new Promise((ok) => smtp.listen(0, "127.0.0.1", () => ok((smtp.address() as { port: number }).port)));
}

async function start(port: number, name: string, env: Record<string, string> = {}) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: join(dir, name), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", TEACHER_PASSWORD: "", BACKUP_KEEP: "0", ...env },
    stdio: "pipe",
  });
  servers.push(server);
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
}

before(async () => {
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  const smtpPort = await startSmtp();
  await start(PORT, "data", {
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtpPort), SMTP_USER: "zeno", SMTP_PASSWORD: "s3cret", MAIL_FROM: "Zeno <zeno@school.example>", PUBLIC_URL: "https://zeno.school.example/",
  });
});
after(async () => {
  for (const server of servers) if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  await new Promise((ok) => smtp.close(ok));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** A browser as far as the server can tell: it keeps the cookie it is given and sends it back. */
function device(base = BASE) {
  let cookie = "";
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = /Max-Age=0/.test(set) ? "" : set.split(";")[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined, setCookie: set };
  };
  return { call, cookie: () => cookie, me: async () => (await call("GET", "/api/account")).body.account as { email: string; name: string; verified: boolean } | null };
}
/** Waits for the next mail to an address and returns its text, decoded. */
async function mailTo(address: string, after = 0) {
  for (let i = 0; i < 100; i++) {
    const m = inbox.slice(after).find((x) => x.to === `<${address}>`);
    if (m) {
      const [head, body] = m.data.split("\r\n\r\n");
      return { ...m, head, text: Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8") };
    }
    await new Promise((ok) => setTimeout(ok, 50));
  }
  throw new Error(`no mail to ${address}`);
}
const linkToken = (text: string, kind: string) => new RegExp(`https://zeno\\.school\\.example/#/account/${kind}/([\\w-]+)`).exec(text)?.[1];

test("a password is stored as a salted hash and checked against it", async () => {
  const a = await hashPassword("correct horse");
  const b = await hashPassword("correct horse");
  assert.match(a, /^scrypt\$16384\$[\w-]+\$[\w-]+$/);
  assert.notEqual(a, b, "its own salt each time");
  assert.equal(await passwordMatches("correct horse", a), true);
  assert.equal(await passwordMatches("correct horsf", a), false);
  assert.equal(await passwordMatches("correct horse", "plain"), false);
  // The same letters, composed or not, are the same password.
  assert.equal(await passwordMatches("café au lait", await hashPassword("café au lait")), true);
});

test("mail needs a host, a sender and the site's own address", () => {
  assert.equal(mailSettings({}), null);
  assert.equal(mailSettings({ SMTP_HOST: "mail", MAIL_FROM: "z@x.org" }), null, "no PUBLIC_URL: links would have to trust the request");
  assert.equal(mailSettings({ SMTP_HOST: "mail", MAIL_FROM: "z@x.org", PUBLIC_URL: "zeno.x.org" }), null);
  assert.deepEqual(mailSettings({ SMTP_HOST: "mail", MAIL_FROM: "z@x.org", PUBLIC_URL: "https://zeno.x.org/" }),
    { host: "mail", port: 587, user: "", password: "", from: "z@x.org", site: "https://zeno.x.org" });
  assert.equal(addressOf("Zeno <zeno@x.org>"), "zeno@x.org");
  assert.equal(addressOf("zeno@x.org"), "zeno@x.org");
});

test("a message's headers stay ASCII and on their own lines", () => {
  assert.equal(encodeHeader("A new password"), "A new password");
  const ka = encodeHeader("ახალი პაროლი Zeno-სთვის");
  assert.ok(ka.split("\r\n ").every((w) => /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/.test(w) && w.length <= 75), ka);
  assert.equal(ka.split("\r\n ").map((w) => Buffer.from(w.slice(10, -2), "base64").toString()).join(""), "ახალი პაროლი Zeno-სთვის");
  const m = compose("Zeno <zeno@x.org>", { to: "a@b.org\r\nBcc: evil@x.org", subject: "Hi\r\nBcc: evil@x.org", text: "one\n.two\n" });
  assert.ok(!/^Bcc:/m.test(m), "a line break in a header can't add a header");
  assert.match(m, /^Message-ID: <[0-9a-f]+@x\.org>$/m);
});

test("sign up, then sign in on another device; the name and password can be changed", async () => {
  const laptop = device();
  assert.equal(await laptop.me(), null);
  const made = await laptop.call("POST", "/api/account", { email: " Nino@School.Example ", name: "  Nino   K. ", password: "long enough" });
  assert.equal(made.status, 201);
  assert.deepEqual(made.body, { email: "nino@school.example", name: "Nino K.", verified: false });
  assert.match(made.setCookie!, /^zeno_session=[\w-]{40,}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=31536000$/);
  assert.deepEqual(await laptop.me(), made.body);

  // The same address again, however it is typed.
  assert.equal((await device().call("POST", "/api/account", { email: "NINO@school.example", name: "Other", password: "long enough" })).status, 409);

  const phone = device();
  assert.equal((await phone.call("POST", "/api/account/session", { email: "nino@school.example", password: "wrong one" })).status, 401);
  assert.equal((await phone.call("POST", "/api/account/session", { email: "nobody@school.example", password: "long enough" })).status, 401);
  assert.equal(await phone.me(), null);
  const signedIn = await phone.call("POST", "/api/account/session", { email: "Nino@school.example", password: "long enough" });
  assert.equal(signedIn.status, 200);
  assert.equal((await phone.me())?.name, "Nino K.");

  assert.equal((await phone.call("PUT", "/api/account", { name: "Nino Kapanadze" })).body.name, "Nino Kapanadze");
  assert.equal((await laptop.me())?.name, "Nino Kapanadze", "the other device sees the new name");

  // A new password needs the current one, and signs the other devices out.
  assert.equal((await phone.call("PUT", "/api/account", { password: "another long one", current: "nope" })).status, 403);
  assert.equal((await phone.call("PUT", "/api/account", { password: "short", current: "long enough" })).status, 400);
  assert.equal((await phone.call("PUT", "/api/account", { password: "another long one", current: "long enough" })).status, 200);
  assert.equal(await laptop.me(), null);
  assert.equal((await phone.me())?.email, "nino@school.example");
  assert.equal((await laptop.call("POST", "/api/account/session", { email: "nino@school.example", password: "long enough" })).status, 401);
  assert.equal((await laptop.call("POST", "/api/account/session", { email: "nino@school.example", password: "another long one" })).status, 200);

  // Signing out ends this device's session only.
  assert.equal((await phone.call("DELETE", "/api/account/session")).status, 204);
  assert.equal(phone.cookie(), "");
  assert.equal((await laptop.me())?.email, "nino@school.example");
});

test("what a sign-up must have", async () => {
  const d = device();
  const base = { email: "ok@school.example", name: "Ok", password: "long enough" };
  for (const bad of [{ email: "not an address" }, { email: "a@b" }, { email: `${"a".repeat(250)}@b.org` }, { name: "" }, { name: "   " }, { name: "x".repeat(61) }, { password: "1234567" }, { password: 12345678 }])
    assert.equal((await d.call("POST", "/api/account", { ...base, ...bad })).status, 400, JSON.stringify(bad));
  assert.equal(await d.me(), null);
  // Signed out, there is nothing to change or delete.
  assert.equal((await d.call("PUT", "/api/account", { name: "X" })).status, 401);
  assert.equal((await d.call("DELETE", "/api/account", { password: "long enough" })).status, 401);
  // A cookie nobody was given signs nobody in.
  assert.equal((await (await fetch(`${BASE}/api/account`, { headers: { Cookie: "zeno_session=made-up" } })).json()).account, null);
});

test("the cookie is marked Secure behind an HTTPS proxy", async () => {
  const d = device();
  const made = await d.call("POST", "/api/account", { email: "secure@school.example", name: "S", password: "long enough" }, { "X-Forwarded-Proto": "https" });
  assert.match(made.setCookie!, /; Secure$/);
});

test("the address is confirmed from the mailed link, which works once", async () => {
  const d = device();
  const before = inbox.length;
  await d.call("POST", "/api/account", { email: "gio@school.example", name: "გიო", password: "long enough", lang: "ka" });
  const mail = await mailTo("gio@school.example", before);
  assert.equal(mail.auth, "\0zeno\0s3cret");
  assert.equal(mail.from, "<zeno@school.example>");
  assert.match(mail.head, /^From: Zeno <zeno@school\.example>$/m);
  assert.match(mail.head, /^Subject: =\?UTF-8\?B\?/m);
  assert.match(mail.text, /^გამარჯობა, გიო!/);
  const token = linkToken(mail.text, "verify");
  assert.ok(token, mail.text);
  // The link confirms on any device, signed in or not.
  assert.deepEqual((await device().call("POST", "/api/account/verify", { token })).body, { verified: true });
  assert.equal((await d.me())?.verified, true);
  assert.equal((await device().call("POST", "/api/account/verify", { token })).status, 410);
  assert.equal((await device().call("POST", "/api/account/verify", { token: "made-up" })).status, 410);
  // Asking again once confirmed sends nothing.
  const sent = inbox.length;
  assert.deepEqual((await d.call("POST", "/api/account/verify", {})).body, { verified: true });
  assert.equal(inbox.length, sent);
  assert.equal((await device().call("POST", "/api/account/verify", {})).status, 401);
});

test("a forgotten password: the mailed link sets a new one, once, and signs the other devices out", async () => {
  const old = device();
  await old.call("POST", "/api/account", { email: "luka@school.example", name: "Luka", password: "first password" });
  await mailTo("luka@school.example");
  const before = inbox.length;
  const anyone = device();
  assert.equal((await anyone.call("GET", "/api/account")).body.mail, true);
  assert.equal((await anyone.call("POST", "/api/account/reset", { email: "luka@school.example", lang: "ru" })).status, 202);
  // An address with no account gets the same answer and no mail.
  assert.equal((await anyone.call("POST", "/api/account/reset", { email: "nobody@school.example" })).status, 202);
  const mail = await mailTo("luka@school.example", before);
  assert.match(mail.text, /^Здравствуйте, Luka!/);
  const token = linkToken(mail.text, "reset")!;
  await new Promise((ok) => setTimeout(ok, 200));
  assert.equal(inbox.slice(before).length, 1);

  const fresh = device();
  // A password too short doesn't use the link up.
  assert.equal((await fresh.call("PUT", "/api/account/reset", { token, password: "short" })).status, 400);
  const set = await fresh.call("PUT", "/api/account/reset", { token, password: "second password" });
  assert.equal(set.status, 200);
  assert.deepEqual(set.body, { email: "luka@school.example", name: "Luka", verified: true });
  assert.equal((await fresh.me())?.email, "luka@school.example", "signed in by the link");
  assert.equal(await old.me(), null, "the old sessions are gone");
  assert.equal((await device().call("PUT", "/api/account/reset", { token, password: "third password" })).status, 410);
  assert.equal((await device().call("POST", "/api/account/session", { email: "luka@school.example", password: "first password" })).status, 401);
  assert.equal((await device().call("POST", "/api/account/session", { email: "luka@school.example", password: "second password" })).status, 200);

  // A second link stops the first; an address is mailed at most three times an hour.
  const n = inbox.length;
  for (let i = 0; i < 4; i++) assert.equal((await anyone.call("POST", "/api/account/reset", { email: "luka@school.example" })).status, 202);
  await new Promise((ok) => setTimeout(ok, 300));
  const links = inbox.slice(n).map((m) => linkToken(Buffer.from(m.data.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString(), "reset")!);
  assert.equal(links.length, 2, "three mails this hour, one of them above");
  assert.equal((await device().call("PUT", "/api/account/reset", { token: links[0], password: "fourth password" })).status, 410);
  assert.equal((await device().call("PUT", "/api/account/reset", { token: links[1], password: "fourth password" })).status, 200);
});

test("deleting the account needs the password and removes it", async () => {
  const d = device();
  await d.call("POST", "/api/account", { email: "leaver@school.example", name: "Leaver", password: "long enough" });
  assert.equal((await d.call("DELETE", "/api/account", { password: "wrong one" })).status, 403);
  assert.equal((await d.call("DELETE", "/api/account", { password: "long enough" })).status, 204);
  assert.equal(await d.me(), null);
  assert.equal((await device().call("POST", "/api/account/session", { email: "leaver@school.example", password: "long enough" })).status, 401);
  const db = new DatabaseSync(join(dir, "data", "boards.db"), { readOnly: true });
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  assert.equal(count("SELECT COUNT(*) AS n FROM accounts WHERE email = 'leaver@school.example'"), 0);
  assert.equal(count("SELECT COUNT(*) AS n FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = s.account_id)"), 0);
  // Nothing readable is stored: no password, no session token as the browser holds it.
  const stored = db.prepare("SELECT password FROM accounts WHERE email = 'nino@school.example'").get() as { password: string };
  assert.match(stored.password, /^scrypt\$/);
  assert.equal(count(`SELECT COUNT(*) AS n FROM sessions WHERE length(token) <> 64`), 0);
  db.close();
});

test("guessing at one account's password runs into a wait", async () => {
  const owner = device();
  await owner.call("POST", "/api/account", { email: "target@school.example", name: "Target", password: "long enough" });
  const guesser = device();
  for (let i = 0; i < 8; i++) assert.equal((await guesser.call("POST", "/api/account/session", { email: "target@school.example", password: `guess number ${i}` })).status, 401);
  const refused = await guesser.call("POST", "/api/account/session", { email: "target@school.example", password: "long enough" });
  assert.equal(refused.status, 429);
  // Other accounts are not held up by it.
  assert.equal((await guesser.call("POST", "/api/account/session", { email: "luka@school.example", password: "fourth password" })).status, 200);
});

test("without mail settings accounts still work, and a link comes from the command line", async () => {
  const port = PORT + 1;
  await start(port, "nomail");
  const d = device(`http://127.0.0.1:${port}`);
  assert.equal((await d.call("POST", "/api/account", { email: "solo@home.example", name: "Solo", password: "long enough" })).status, 201);
  assert.equal((await d.call("GET", "/api/account")).body.mail, false);
  assert.equal((await d.call("POST", "/api/account/reset", { email: "solo@home.example" })).status, 503);
  assert.equal((await d.call("POST", "/api/account/verify", {})).status, 503);
  const run = (email: string) =>
    new Promise<{ code: number | null; out: string }>((ok) => {
      const p = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/resetPassword.ts", email], {
        env: { ...process.env, DATA_DIR: join(dir, "nomail"), PUBLIC_URL: "https://zeno.home.example", PORT: String(port) },
      });
      let out = "";
      p.stdout.on("data", (c) => (out += c));
      p.on("exit", (code) => ok({ code, out }));
    });
  assert.equal((await run("nobody@home.example")).code, 1);
  const { code, out } = await run("Solo@home.example");
  assert.equal(code, 0);
  const token = /^https:\/\/zeno\.home\.example\/#\/account\/reset\/([\w-]+)\s*$/.exec(out)?.[1];
  assert.ok(token, out);
  assert.equal((await device(`http://127.0.0.1:${port}`).call("PUT", "/api/account/reset", { token, password: "a new long one" })).status, 200);
  assert.equal(await d.me(), null);
});
