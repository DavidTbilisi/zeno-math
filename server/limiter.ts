// Brute-force protection for the site and teacher passwords: a client that gives a wrong password too often in a
// short time is refused for a while (429 with Retry-After), without its password even being checked, so guessing
// gains nothing. Only wrong passwords count; a request that sends none (a browser's first visit) doesn't.
//
// A school reaches the server from one address, so a class's typos all count against it, and a lock-out would cut
// off the students already signed in too. So an address that gave a right password in the last day is allowed ten
// times as many wrong ones: only someone who knows a password can earn that, and a guesser sharing the address
// still gets a hundred tries in ten minutes, nowhere near enough for a long password.
import type { IncomingMessage } from "node:http";

export class FailureLimiter {
  private failures = new Map<string, number[]>();
  /** When each client last gave a right password. */
  private rights = new Map<string, number>();
  readonly max: number;
  readonly windowMs: number;
  readonly keys: number;
  readonly trustedMax: number;
  readonly trustMs: number;
  /**
   * max: wrong passwords allowed in windowMs; keys: how many clients are remembered at most; trustedMax: wrong
   * passwords allowed instead for a client that gave a right one in the last trustMs.
   */
  constructor(max = 10, windowMs = 10 * 60_000, keys = 10_000, trustedMax = max * 10, trustMs = 24 * 60 * 60_000) {
    this.max = max;
    this.windowMs = windowMs;
    this.keys = keys;
    this.trustedMax = trustedMax;
    this.trustMs = trustMs;
  }

  /** Wrong passwords this client may give in the window. */
  limit(key: string, now = Date.now()): number {
    const right = this.rights.get(key);
    return right !== undefined && right > now - this.trustMs ? this.trustedMax : this.max;
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
    const max = this.limit(key, now);
    return ts.length >= max ? Math.max(1, Math.ceil((ts[ts.length - max] + this.windowMs - now) / 1000)) : 0;
  }
  /** This client gave a right password. */
  succeed(key: string, now = Date.now()) {
    remember(this.rights, key, now, this.keys);
  }
  fail(key: string, now = Date.now()) {
    const ts = this.recent(key, now);
    ts.push(now);
    remember(this.failures, key, ts, this.keys);
  }
}

/** Sets a client's entry last, so the client seen longest ago is first to go when the map is full. */
function remember<T>(map: Map<string, T>, key: string, value: T, keys: number) {
  map.delete(key);
  map.set(key, value);
  while (map.size > keys) map.delete(map.keys().next().value!);
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
