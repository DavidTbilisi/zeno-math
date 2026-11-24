// The learner's account in this browser (#605): who is signed in, as the server last said, and the calls that change
// it. The session itself is a cookie scripts can't read (server/accounts.ts); what is kept here is only the name and
// email to show, so the top bar has them before the server answers. Every page reads it through useAccount, and a
// change in one tab (signing out) reaches the others through the storage event.
import { useSyncExternalStore } from "react";
import { ApiError, req } from "./api";
import { loadStudent, saveStudent, type Student } from "./learner";

export type Account = { email: string; name: string; verified: boolean };
/**
 * student: the class record the account practises under (#606), null for none or when signed out. mail: whether the
 * server can mail a link for a forgotten password. known: the server has answered on this page.
 */
export type AccountState = { account: Account | null; student: Student | null; mail: boolean; known: boolean };
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

let state: AccountState = { account: cached(), student: null, mail: false, known: false };
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

/**
 * Who has been practising on this browser, to ask about before someone signs in: the student whose code it holds, or
 * null when it holds nobody's work. On a shared tablet that student may not be the one signing in.
 */
export const whoIsHere = (): { code: string } | null => {
  const s = loadStudent();
  return s ? { code: s.code } : null;
};

/** Asks the server who is signed in and under which class record; signed in, that record is this browser's student. */
async function refresh() {
  const r = await req<{ account: Account | null; student: Student | null; mail: boolean }>("GET", "/api/account");
  if (r.account) saveStudent(r.student);
  set({ account: r.account, student: r.account ? r.student : null, mail: r.mail, known: true });
  return r;
}
/**
 * A session has just started on a browser that may hold a student's code. `mine`: the code is the new owner's, so it
 * joins their account (unless it is another account's already: then it stays that account's). Either way the browser
 * goes on with the account's own record, or none.
 */
async function settle(mine: boolean) {
  const here = loadStudent();
  if (here && mine) {
    try {
      await req<Student>("POST", "/api/account/student", { code: here.code });
    } catch (e) {
      if (!(e instanceof ApiError && (e.status === 404 || e.status === 409))) throw e;
    }
  }
  return (await refresh()).account!;
}
/** Signed out (or the account is gone): its class record leaves the browser with it. */
function left() {
  saveStudent(null);
  set({ account: null, student: null });
}

/** The account calls (server/accounts.ts). Each rejects with an ApiError whose status says why. */
export const account = {
  /** Called once as the app starts. */
  refresh: async () => (await refresh()).account,
  /** mine: whether what this browser holds (whoIsHere) is the new owner's. */
  signUp: async (email: string, name: string, password: string, lang: string, mine = false) => {
    await req<Account>("POST", "/api/account", { email, name, password, lang });
    return settle(mine);
  },
  signIn: async (email: string, password: string, mine = false) => {
    await req<Account>("POST", "/api/account/session", { email, password });
    return settle(mine);
  },
  signOut: async () => {
    await req<void>("DELETE", "/api/account/session");
    left();
  },
  rename: async (name: string) => signedIn(await req<Account>("PUT", "/api/account", { name })),
  changePassword: async (current: string, password: string) => signedIn(await req<Account>("PUT", "/api/account", { current, password })),
  remove: async (password: string) => {
    await req<void>("DELETE", "/api/account", { password });
    left();
  },
  /** Adds a record from before the account to it, by its code (409: it is another account's). */
  addCode: async (code: string) => {
    const student = await req<Student>("POST", "/api/account/student", { code });
    saveStudent(student);
    set({ student });
    return student;
  },
  /** The practice dialog has changed the browser's student (joined a class, deleted the record): the account's too. */
  noteStudent: (student: Student | null) => {
    if (state.account) set({ student });
  },
  /** Mails a link for a new password, if the address has an account (the answer is the same either way). */
  askReset: (email: string, lang: string) => req<unknown>("POST", "/api/account/reset", { email, lang }),
  /** The link's page: sets the password and signs in. */
  setPassword: async (token: string, password: string) => {
    await req<Account>("PUT", "/api/account/reset", { token, password });
    return settle(false);
  },
  /** The confirming link's page. */
  confirm: async (token: string) => {
    await req<unknown>("POST", "/api/account/verify", { token });
    if (state.account) set({ account: { ...state.account, verified: true } });
  },
  /** Mails the confirming link again. */
  resend: (lang: string) => req<unknown>("POST", "/api/account/verify", { lang }),
};
