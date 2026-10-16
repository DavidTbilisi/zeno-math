// The parts of a game on the board that every game shares: its ladder kept in this browser, the row of puzzles with
// their stars (a puzzle opens once the one before it has a star), the celebration when one is done (outside the
// piece's picture, so the 📷 copy never has confetti in it) and the sound switch.
import { useState, type CSSProperties, type ReactNode } from "react";
import { isOpen, readLadder, type Ladder } from "../math/ladder";
import { muted, setMuted } from "./juice";
import { fill, Toggle } from "./ui";

/** A game's ladder, read from this browser once and written back on every change. */
export function useLadder<K extends string>(key: string, size: number, keys: readonly K[]): [Ladder<K>, (next: Ladder<K>) => void] {
  const [ladder, setLadder] = useState(() => {
    try {
      return readLadder(localStorage.getItem(key), size, keys);
    } catch {
      return readLadder(null, size, keys);
    }
  });
  const keep = (next: Ladder<K>) => {
    setLadder(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // private mode: the stars last until the page closes
    }
  };
  return [ladder, keep];
}

export const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

/** The puzzles in a row, each with its stars, and anything else the game puts first (its free play). */
export function LadderBar({ stars, current, onPick, words, children }: {
  stars: number[];
  current: number | null;
  onPick: (stage: number) => void;
  words: { puzzle: string; locked: string };
  children?: ReactNode;
}) {
  return (
    <div className="live-bar geo-ladder">
      {children}
      {stars.map((s, i) => {
        const open = isOpen({ stars }, i);
        const name = fill(words.puzzle, { n: i + 1 });
        return (
          <button
            key={i}
            className={`live-btn geo-stage${current === i ? " on" : ""}`}
            disabled={!open}
            title={open ? name : words.locked}
            aria-label={open ? `${name}: ${s} ★` : words.locked}
            onClick={() => onPick(i)}
          >
            <b>{i + 1}</b>
            <small>{open ? starText(s) : "🔒"}</small>
          </button>
        );
      })}
    </div>
  );
}

/** Stars popping up and a burst of confetti; give it a new key to play it again. */
export function Cheer({ text, small }: { text: string; small?: boolean }) {
  return (
    <div className={`celebrate${small ? " small" : ""}`} aria-hidden="true">
      {Array.from({ length: small ? 14 : 18 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
      <b>{text}</b>
    </div>
  );
}

export function SoundToggle({ title }: { title: string }) {
  const [quiet, setQuiet] = useState(muted);
  return (
    <Toggle on={!quiet} title={title} onClick={() => (setMuted(!quiet), setQuiet(!quiet))}>
      {quiet ? "🔇" : "🔊"}
    </Toggle>
  );
}
