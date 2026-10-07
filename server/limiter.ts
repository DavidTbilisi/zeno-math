// Brute-force protection for the site and teacher passwords: a client that gives a wrong password too often in a
// short time is refused for a while (429 with Retry-After), without its password even being checked, so guessing
// gains nothing. Only wrong passwords count; a request that sends none (a browser's first visit) doesn't.
import type { IncomingMessage } from "node:http";

export class FailureLimiter {
  private failures = new Map<string, number[]>();
  readonly max: number;
  readonly windowMs: number;
  readonly keys: number;
  /** max: wrong passwords allowed in windowMs; keys: how many clients are remembered at most. */
  constructor(max = 10, windowMs = 10 * 60_000, keys = 10_000) {
    this.max = max;
    this.windowMs = windowMs;
    this.keys = keys;
  }

  private recent(key: string, now: number): number[] {
    const kept = (this.failures.get(key) ?? []).filter((t) => t > now - this.windowMs);
    if (kept.length) this.failures.set(key, kept);
    else this.failures.delete(key);
    return kept;
  }
  /** Seconds until this client may try again; 0 if it may now. */
  retryAfter(key: string, now = Date.now()): number {
    const ts = this.recent(key, now);
    return ts.length >= this.max ? Math.max(1, Math.ceil((ts[ts.length - this.max] + this.windowMs - now) / 1000)) : 0;
  }
  fail(key: string, now = Date.now()) {
    const ts = this.recent(key, now);
    ts.push(now);
    this.failures.delete(key); // re-inserted last, so the oldest client is first to go when the map is full
    this.failures.set(key, ts);
    while (this.failures.size > this.keys) this.failures.delete(this.failures.keys().next().value!);
  }
}

/**
 * Who a request comes from. Behind a reverse proxy (TRUST_PROXY set), every connection comes from the proxy, so the
 * client is the last address in X-Forwarded-For: the one the proxy added itself, which a client can't forge.
 */
export function clientKey(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (forwarded.length) return forwarded[forwarded.length - 1];
  }
  return req.socket.remoteAddress ?? "";
}

const TRUST_PROXY = ["1", "true", "yes"].includes(String(process.env.TRUST_PROXY ?? "").toLowerCase());
/** The server's one limiter: wrong site and teacher passwords count together, per client. */
export const passwords = new FailureLimiter(Number(process.env.PASSWORD_ATTEMPTS) || 10, (Number(process.env.PASSWORD_WINDOW_MINUTES) || 10) * 60_000);
export const clientOf = (req: IncomingMessage) => clientKey(req, TRUST_PROXY);
