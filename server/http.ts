// Small HTTP helpers shared by the API modules.
import type { IncomingMessage, ServerResponse } from "node:http";

export const MAX_BODY = 25 * 1024 * 1024;

/** A refusal with a status and a message that is safe to show the client. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function send(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
  if (body === undefined) {
    res.writeHead(status, headers).end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json", ...headers }).end(JSON.stringify(body));
}

export async function readJson(req: IncomingMessage, maxBody = MAX_BODY): Promise<any> {
  // JSON only: a cross-site <form> can't send this content type without the browser asking first.
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new HttpError(415, "expected application/json");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) throw new HttpError(413, "body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
}
