// How practice and the games feel: arcade, with sounds, confetti, a shake on a miss and the clock to race, or calm,
// with none of them. The questions, the levels, the stars and what counts as mastered are the same in both; only what
// moves and sounds differs. Arcade is the default. The choice is kept in this browser, and the page's root element
// carries it as data-feel, so the stylesheet can still the animations the code does not own.
import { useSyncExternalStore } from "react";

export type Feel = "arcade" | "calm";

const KEY = "zeno.feel.v1";

/** A stored value as a feel: only "calm" is calm, anything else (nothing stored, an old value) is arcade. */
export const readFeel = (raw: string | null | undefined): Feel => (raw === "calm" ? "calm" : "arcade");

let current: Feel | null = null;
const listeners = new Set<() => void>();

/** The feel chosen in this browser. */
export function feel(): Feel {
  if (current === null) {
    try {
      current = readFeel(localStorage.getItem(KEY));
    } catch {
      current = "arcade";
    }
  }
  return current;
}

export const isCalm = () => feel() === "calm";

function mark(f: Feel) {
  if (typeof document !== "undefined") document.documentElement.dataset.feel = f;
}

/** Chooses the feel, keeps it in this browser and tells every switch and game showing it. */
export function setFeel(f: Feel) {
  current = f;
  try {
    if (f === "calm") localStorage.setItem(KEY, f);
    else localStorage.removeItem(KEY);
  } catch {
    // private mode: the choice lasts until the page closes
  }
  mark(f);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The feel, for a component: it renders again when the feel changes. */
export const useFeel = (): Feel => useSyncExternalStore(subscribe, feel, () => "arcade");

mark(feel());
