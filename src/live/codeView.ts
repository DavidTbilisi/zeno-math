// The code view of the algorithm games, one setting for all of them in this browser: the picture tells by pointers and
// written-out variables instead of colours, and a code panel marks its running line with ▶ instead of a highlight. Kept
// in localStorage; the page's root carries the class zeno-code-view while it is on, for the panels' CSS.
import { useMemo, useSyncExternalStore } from "react";
import { parseNames, type Names } from "../math/codeStyle";

const KEY = "zeno.codeView";
const listeners = new Set<() => void>();

export function codeViewOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const mark = (on: boolean) => {
  if (typeof document !== "undefined") document.documentElement.classList.toggle("zeno-code-view", on);
};
mark(codeViewOn());

export function setCodeView(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* not kept: it still applies until the page reloads */
  }
  mark(on);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Whether the code view is on, and how to switch it; every game showing it updates together. */
export function useCodeView(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, codeViewOn, () => false), setCodeView];
}

// The aliases the code view gives the variables (i = left, j = scan), one setting for all the games, kept as typed.
const NAMES_KEY = "zeno.codeNames";

export function codeNamesText(): string {
  try {
    return localStorage.getItem(NAMES_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCodeNames(text: string) {
  try {
    if (text.trim()) localStorage.setItem(NAMES_KEY, text);
    else localStorage.removeItem(NAMES_KEY);
  } catch {
    /* not kept */
  }
  listeners.forEach((l) => l());
}

/**
 * The aliases as typed, the names they give (only while the code view is on, and none while what is typed has a bad
 * part, so a half-typed alias never shows), the bad part, and how to change them.
 */
export function useCodeNames(): { text: string; names: Names; bad?: string; set: (text: string) => void } {
  const text = useSyncExternalStore(subscribe, codeNamesText, () => "");
  const [on] = useCodeView();
  const parsed = useMemo(() => parseNames(text), [text]);
  return { text, names: on && parsed.bad === undefined ? parsed.names : {}, bad: parsed.bad, set: setCodeNames };
}
