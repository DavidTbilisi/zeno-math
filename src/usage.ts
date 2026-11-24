// Anonymous usage counts, the browser's half (server/usage.ts, issue #615): what was opened and done, by name, so the
// site can be made better. Nothing here says who: no cookie, no id, nothing kept in the browser. What happened first
// in this page load is marked `first`, so the server can count page loads ("visits") without telling them apart.
//
// Events wait a few seconds and go together, and the rest go as the page is hidden or left. A browser driven by a
// program (the tests, the recordings for the README) sends nothing.
import type { UsageKind } from "../server/usage";
import { detectLang } from "./langs";

/** Which site this is: the app on its server, or the front page, the practice and a topic's page published on their own. */
export type Site = "app" | "front page" | "practice page" | "topic page";

const WAIT_MS = 3000;
const BATCH = 40;
const MAX_ERRORS = 10;

let url: string | null = null;
let queue: { kind: UsageKind; name: string; first: boolean }[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let errors = 0;
const done = new Set<string>();

/** A name the server takes: plain letters, digits and a few marks, at most 80 characters ("" if nothing is left). */
export const cleanName = (text: string) => text.replace(/[^\w .:'()/-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80).trim();

/**
 * The page an address shows, without what would tell one board, class or person from another: a board is "board",
 * a join link "join", a mailed link "account/reset", a class's printed tests "teacher/print". null for an address that is no page of its own.
 */
export function pageName(hash: string, pathname = "/"): string | null {
  if (hash === "" || hash === "#" || hash === "#/") return pathname === "/about" ? "about" : "home";
  if (/^#\/b\//.test(hash)) return "board";
  if (/^#\/s\//.test(hash)) return "shared board";
  if (/^#\/join\//.test(hash)) return "join";
  // The teacher's sheets to print carry the class code in their address.
  if (/^#\/teacher/.test(hash)) return hash === "#/teacher/usage" ? "teacher/usage" : /\/print$/.test(hash) ? "teacher/print" : "teacher";
  const account = hash.match(/^#\/account(?:\/(reset|verify))?/);
  if (account) return account[1] ? `account/${account[1]}` : "account";
  const m = hash.match(/^#\/([a-z]+(?:\/[\w.-]+){0,3})$/);
  return m ? cleanName(m[1]) || null : null;
}

/**
 * An error's message as a name to count it under. A message can quote an address, and an address can hold a board's
 * id, a student's code or an email: those are taken out first, so the counts never hold one.
 */
export const errorName = (message: string) =>
  cleanName(
    message
      .replace(/\S+@\S+/g, "(email)")
      .replace(/(\/api\/\w+)\/[^\s:]*/g, "$1/(id)")
      .replace(/#\/(b|s|join)\/[\w-]+/g, "#/$1/(id)")
      .replace(/\b(?=[\w-]*\d)[\w-]{5,}\b/g, "(id)"),
  ) || "unknown error";

/** The host a visitor came from, or null when they came from this site or from nowhere. */
export function fromHost(referrer: string, here: string): string | null {
  try {
    const host = new URL(referrer).host.replace(/^www\./, "");
    return host && host !== here.replace(/^www\./, "") ? cleanName(host) || null : null;
  } catch {
    return null;
  }
}

export const screenName = (width: number) => (width < 600 ? "phone" : width < 1024 ? "tablet" : "desktop");

/** For the usage page's chart: a round number at or above the largest value, so the scale's marks are whole (4, 10, 20, 50, 100 …). */
export function scaleTop(max: number): number {
  if (max <= 4) return 4;
  const unit = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((k) => k * unit).find((v) => v >= max)!;
}

function send() {
  clearTimeout(timer);
  timer = undefined;
  if (!url) return;
  while (queue.length) {
    const body = JSON.stringify({ events: queue.splice(0, BATCH) });
    // sendBeacon outlives the page and, with a plain string, needs no permission to reach another host.
    try {
      if (!navigator.sendBeacon?.(url, body)) void fetch(url, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
    } catch {
      // No way to send: the counts go without this page load.
    }
  }
}

/** Counts something that happened, under a kind and a name. Does nothing until startUsage, or when counting is off. */
export function seen(kind: UsageKind, name: string) {
  const clean = cleanName(name);
  if (!url || !clean) return;
  const key = `${kind}\n${clean}`;
  queue.push({ kind, name: clean, first: !done.has(key) });
  done.add(key);
  if (queue.length >= BATCH) send();
  else timer ??= setTimeout(send, WAIT_MS);
}

const seenPage = () => {
  const page = pageName(location.hash, location.pathname);
  if (page) seen("page", page);
};

/**
 * Starts counting for this page load: the visit, the screen, the language, where the visitor came from, then every
 * page opened and every script error. `to` is where the counts go; with none (a site published with no server to
 * report to) nothing is counted.
 */
export function startUsage(site: Site, to: string | undefined = "/api/usage") {
  if (url || !to || navigator.webdriver) return;
  url = to;
  seen("visit", site);
  seen("screen", screenName(window.innerWidth));
  seen("lang", detectLang());
  const from = fromHost(document.referrer, location.host);
  if (from) seen("from", from);
  if (site === "app") {
    seenPage();
    window.addEventListener("hashchange", seenPage);
  }
  const error = (message: unknown) => {
    if (errors++ < MAX_ERRORS) seen("error", errorName(String(message ?? "")));
  };
  window.addEventListener("error", (e) => error(e.message));
  window.addEventListener("unhandledrejection", (e) => error((e.reason as { message?: unknown } | null)?.message ?? e.reason));
  // Leaving is the last moment to send: a hidden page may never come back.
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && send());
  window.addEventListener("pagehide", send);
}

/** For the tests: counting as if the page had just loaded, and what is waiting to go. */
export const usageForTest = {
  reset: (to: string | null) => {
    url = to;
    queue = [];
    done.clear();
    errors = 0;
    clearTimeout(timer);
    timer = undefined;
  },
  waiting: () => queue,
};
