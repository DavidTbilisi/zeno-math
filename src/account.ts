// The learner's account in this browser (#605): who is signed in, as the server last said, and the calls that change
// it. The session itself is a cookie scripts can't read (server/accounts.ts); what is kept here is only the name and
// email to show, so the top bar has them before the server answers. Every page reads it through useAccount, and a
// change in one tab (signing out) reaches the others through the storage event.
import { useSyncExternalStore } from "react";
import { req } from "./api";

export type Account = { email: string; name: string; verified: boolean };
/** mail: whether the server can mail a link for a forgotten password. known: the server has answered on this page. */
export type AccountState = { account: Account | null; mail: boolean; known: boolean };
/** The shortest password the server takes (MIN_PASSWORD in server/accounts.ts). */
export const MIN_PASSWORD = 8;
/** What the server takes as an email address, near enough to say so before sending it. */
export const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const KEY = "zeno.account.v1";
function cached(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? "null") as Account | null;
    return a && typeof a.email === "string" && typeof a.name === "string" ? a : null;
  } catch {
    return null;
  }
}

let state: AccountState = { account: cached(), mail: false, known: false };
const listeners = new Set<() => void>();
function set(next: Partial<AccountState>, keep = true) {
  state = { ...state, ...next };
  if (keep && "account" in next) {
    try {
      if (state.account) localStorage.setItem(KEY, JSON.stringify(state.account));
      else localStorage.removeItem(KEY);
    } catch {
      // private mode: the name isn't remembered between pages; the session still is
    }
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) set({ account: cached() }, false);
  });

export const accountState = () => state;
export const useAccount = (): AccountState => useSyncExternalStore(subscribe, accountState);

const signedIn = (account: Account) => {
  set({ account, known: true });
  return account;
};

/** The account calls (server/accounts.ts). Each rejects with an ApiError whose status says why. */
export const account = {
  /** Asks the server who is signed in; called once as the app starts. */
  refresh: async () => {
    const r = await req<{ account: Account | null; mail: boolean }>("GET", "/api/account");
    set({ account: r.account, mail: r.mail, known: true });
    return r.account;
  },
  signUp: async (email: string, name: string, password: string, lang: string) => signedIn(await req<Account>("POST", "/api/account", { email, name, password, lang })),
  signIn: async (email: string, password: string) => signedIn(await req<Account>("POST", "/api/account/session", { email, password })),
  signOut: async () => {
    await req<void>("DELETE", "/api/account/session");
    set({ account: null });
  },
  rename: async (name: string) => signedIn(await req<Account>("PUT", "/api/account", { name })),
  changePassword: async (current: string, password: string) => signedIn(await req<Account>("PUT", "/api/account", { current, password })),
  remove: async (password: string) => {
    await req<void>("DELETE", "/api/account", { password });
    set({ account: null });
  },
  /** Mails a link for a new password, if the address has an account (the answer is the same either way). */
  askReset: (email: string, lang: string) => req<unknown>("POST", "/api/account/reset", { email, lang }),
  /** The link's page: sets the password and signs in. */
  setPassword: async (token: string, password: string) => signedIn(await req<Account>("PUT", "/api/account/reset", { token, password })),
  /** The confirming link's page. */
  confirm: async (token: string) => {
    await req<unknown>("POST", "/api/account/verify", { token });
    if (state.account) set({ account: { ...state.account, verified: true } });
  },
  /** Mails the confirming link again. */
  resend: (lang: string) => req<unknown>("POST", "/api/account/verify", { lang }),
};
