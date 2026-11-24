// Mail for accounts (accounts.ts): one plain-text message to one address, for confirming an email and for a new
// password. The server image has no node_modules, so this is a small SMTP client on node:net and node:tls rather than
// a library: connect (port 465 speaks TLS from the start; any other port starts plain and moves to TLS with STARTTLS
// when the server offers it), sign in when a user is set, hand the message over, leave.
//
// A password is never sent over a connection that isn't encrypted, except to this machine itself (a local relay).
import { connect as connectPlain, type Socket } from "node:net";
import { connect as connectTls } from "node:tls";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";

/** from: the address mail comes from, alone or as "Zeno <zeno@example.org>". site: the site's own address, for links. */
export type MailSettings = { host: string; port: number; user: string; password: string; from: string; site: string };
export type Mail = { to: string; subject: string; text: string };

/**
 * The mail settings from the environment, or null when the server sends no mail: SMTP_HOST, MAIL_FROM and PUBLIC_URL
 * are all needed. The links in a message are built from PUBLIC_URL and never from a request, whose Host header anyone
 * can set.
 */
export function mailSettings(env: NodeJS.ProcessEnv = process.env): MailSettings | null {
  const host = (env.SMTP_HOST ?? "").trim();
  const from = (env.MAIL_FROM ?? "").trim();
  const site = (env.PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
  if (!host || !from || !/^https?:\/\//.test(site)) return null;
  return { host, port: Number(env.SMTP_PORT) || 587, user: env.SMTP_USER ?? "", password: env.SMTP_PASSWORD ?? "", from, site };
}

const TIMEOUT = 15_000;
const LOCAL = new Set(["localhost", "127.0.0.1", "::1"]);
/** The bare address of "Name <a@b.c>" or "a@b.c". */
export const addressOf = (from: string) => (/<([^<>]+)>/.exec(from)?.[1] ?? from).trim();
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");

/** A header value in UTF-8 (RFC 2047): ASCII as it is, anything else as base64 words of at most 45 bytes each. */
export function encodeHeader(text: string): string {
  const clean = oneLine(text);
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  const words: string[] = [];
  let piece = "";
  for (const ch of clean) {
    if (Buffer.byteLength(piece + ch) > 45) {
      words.push(piece);
      piece = "";
    }
    piece += ch;
  }
  if (piece) words.push(piece);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w).toString("base64")}?=`).join("\r\n ");
}

/** The message as it goes over the wire: headers, a blank line, and the text as base64 in lines of 76. */
export function compose(from: string, mail: Mail, now = new Date()): string {
  const domain = addressOf(from).split("@")[1] || hostname();
  const body = Buffer.from(mail.text.replace(/\r?\n/g, "\r\n")).toString("base64").replace(/.{76}/g, "$&\r\n");
  return [
    `From: ${oneLine(from)}`,
    `To: ${oneLine(mail.to)}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${randomBytes(12).toString("hex")}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

type Reply = { code: number; lines: string[] };
/** The server's replies on a socket, one at a time: a reply ends at the line whose code is followed by a space. */
function replies(socket: Socket) {
  let buffer = "";
  let lines: string[] = [];
  const ready: Reply[] = [];
  let waiting: { ok: (r: Reply) => void; fail: (e: Error) => void } | null = null;
  let broken: Error | null = null;
  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    for (let i = buffer.indexOf("\n"); i >= 0; i = buffer.indexOf("\n")) {
      const line = buffer.slice(0, i).replace(/\r$/, "");
      buffer = buffer.slice(i + 1);
      lines.push(line);
      if (!/^\d{3}(?: |$)/.test(line)) continue;
      const reply = { code: Number(line.slice(0, 3)), lines };
      lines = [];
      if (waiting) {
        const w = waiting;
        waiting = null;
        w.ok(reply);
      } else ready.push(reply);
    }
  };
  const fail = (e: Error) => {
    broken ??= e;
    const w = waiting;
    waiting = null;
    w?.fail(broken);
  };
  const onClose = () => fail(new Error("the mail server closed the connection"));
  const onTimeout = () => socket.destroy(new Error("the mail server did not answer in time"));
  socket.on("data", onData).on("error", fail).on("close", onClose).on("timeout", onTimeout);
  return {
    next: () =>
      new Promise<Reply>((ok, no) => {
        const r = ready.shift();
        if (r) ok(r);
        else if (broken) no(broken);
        else waiting = { ok, fail: no };
      }),
    /** Stops listening, so the socket can be handed to TLS. */
    release: () => socket.off("data", onData).off("error", fail).off("close", onClose).off("timeout", onTimeout),
  };
}

/** Sends one message; rejects with what went wrong (the server's own words when it refused). */
export async function sendMail(settings: MailSettings, mail: Mail): Promise<void> {
  const { host, port } = settings;
  let encrypted = port === 465;
  let socket: Socket = await new Promise<Socket>((ok, fail) => {
    const s = encrypted ? connectTls({ host, port, servername: host }, () => ok(s)) : connectPlain({ host, port }, () => ok(s));
    s.setTimeout(TIMEOUT);
    s.once("error", fail);
  });
  let wire = replies(socket);
  const expect = async (codes: number[], what: string) => {
    const r = await wire.next();
    if (!codes.includes(r.code)) throw new Error(`mail server, ${what}: ${r.lines.join(" ").slice(0, 300)}`);
    return r;
  };
  const say = (line: string, codes: number[], what = line.split(" ")[0]) => {
    socket.write(`${line}\r\n`);
    return expect(codes, what);
  };
  try {
    await expect([220], "greeting");
    const name = hostname() || "localhost";
    let offers = (await say(`EHLO ${name}`, [250])).lines.map((l) => l.slice(4).toUpperCase());
    if (!encrypted && offers.includes("STARTTLS")) {
      await say("STARTTLS", [220]);
      wire.release();
      const plain = socket;
      socket = await new Promise<Socket>((ok, fail) => {
        const s = connectTls({ socket: plain, servername: host }, () => ok(s));
        s.once("error", fail);
      });
      socket.setTimeout(TIMEOUT);
      wire = replies(socket);
      encrypted = true;
      offers = (await say(`EHLO ${name}`, [250])).lines.map((l) => l.slice(4).toUpperCase());
    }
    if (settings.user) {
      if (!encrypted && !LOCAL.has(host)) throw new Error("the mail server offers no encryption, so the password was not sent");
      const auth = offers.find((o) => o.startsWith("AUTH")) ?? "";
      if (auth.includes("PLAIN") || !auth.includes("LOGIN")) {
        await say(`AUTH PLAIN ${Buffer.from(`\0${settings.user}\0${settings.password}`).toString("base64")}`, [235], "AUTH");
      } else {
        await say("AUTH LOGIN", [334]);
        await say(Buffer.from(settings.user).toString("base64"), [334], "AUTH user");
        await say(Buffer.from(settings.password).toString("base64"), [235], "AUTH password");
      }
    }
    await say(`MAIL FROM:<${addressOf(settings.from)}>`, [250]);
    await say(`RCPT TO:<${oneLine(mail.to)}>`, [250, 251]);
    await say("DATA", [354]);
    // A line that starts with a dot gets a second one, so a lone dot can only be the end of the message.
    await say(`${compose(settings.from, mail).replace(/^\./gm, "..")}\r\n.`, [250], "message");
    socket.write("QUIT\r\n");
  } finally {
    wire.release();
    socket.on("error", () => {}); // a reset after QUIT is nothing to report
    socket.end();
    socket.destroy();
  }
}
