// The parts of a game on the board that every game shares, so a player finds their way round each one alike: its ladder
// kept in this browser; at the top the row of puzzles with their stars (a puzzle opens once the one before it has a
// star), the way into the endless run (or free play) and, under it, where the player is — the round's dots, or the
// endless run's levels and streak; at the bottom the button that moves on, the sound switch and the discoveries so
// far; and the celebration when a puzzle is done (outside the piece's picture, so the 📷 copy never has confetti in it).
// A new game is written on useGame.tsx, which puts these together and does what every outcome does; the games written
// before it use these parts directly.
import { useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { burst, GAME_LEVELS, isOpen, readLadder, type GameLevel, type Ladder } from "../math/ladder";
import { muted, setMuted } from "./juice";
import { fill, Toggle } from "./ui";

export type GameWords = Dict["live"]["game"];
export { GAME_LEVELS, type GameLevel };

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** The puzzle after `stage`, or the same one again after the last. */
export const nextStage = (stage: number, size: number) => (stage + 1 < size ? stage + 1 : stage);

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

/**
 * Stars popping up and a burst of confetti; give it a new key to play it again. With `stars` the burst is in proportion
 * (one star: no confetti); `streak` is the orange mark of a streak.
 */
export function Cheer({ text, small, stars, streak }: { text: string; small?: boolean; stars?: number; streak?: boolean }) {
  const b = streak ? burst("streak") : stars !== undefined ? burst("stars", stars) : null;
  const pieces = b ? b.pieces : small ? 14 : 18;
  return (
    <div className={`celebrate${small ? " small" : ""}${b ? ` ${b.cls}` : ""}`} aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
      <b>{text}</b>
    </div>
  );
}

/**
 * The top of a game. The row of puzzles, with the way out of them first: ∞ into the endless run (at the level it was
 * last played at) or ✏️ into free play. Under it, in the endless run, its levels and the streak (with `pace` before
 * it, such as how long the dots show); in a puzzle, `children` (the round's dots, the misses so far), if any.
 */
export function GameNav({ ladder, mode, stage, level, streak, onPuzzle, onEndless, onFree, words, g, pace, children }: {
  ladder: Ladder<string>;
  mode: "puzzle" | "endless" | "free";
  stage: number;
  level?: GameLevel;
  streak?: number;
  onPuzzle: (stage: number) => void;
  onEndless?: (level: GameLevel) => void;
  onFree?: () => void;
  /** A game's own names for its puzzles ("Round {n}"), its lock and its free play, where they differ from every game's. */
  words: { puzzle?: string; locked?: string; free?: string };
  g: GameWords;
  pace?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <LadderBar stars={ladder.stars} current={mode === "puzzle" ? stage : null} onPick={onPuzzle} words={{ puzzle: words.puzzle ?? g.puzzle, locked: words.locked ?? g.locked }}>
        {onEndless && <Toggle on={mode === "endless"} onClick={() => onEndless(level ?? 1)}>∞ {g.endless}</Toggle>}
        {onFree && <Toggle on={mode === "free"} onClick={onFree}>✏️ {words.free ?? g.free}</Toggle>}
      </LadderBar>
      {mode === "endless" && onEndless ? (
        <div className="live-bar">
          {GAME_LEVELS.map((l) => (
            <Toggle key={l} on={level === l} onClick={() => onEndless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
          <span className="est-streak">{pace}{fill(g.streak, { n: streak ?? 0, best: ladder.best })}</span>
        </div>
      ) : (
        children
      )}
    </>
  );
}

/** A round's questions as dots: green right (or close enough), orange not, ringed blue the one being asked. */
export function RoundDots({ results, i, size }: { results: boolean[]; i: number; size: number }) {
  return (
    <span className="est-dots" aria-label={`${i + 1} / ${size}`}>
      {Array.from({ length: size }, (_, k) => (
        <i key={k} className={k < results.length ? (results[k] ? "ok" : "off") : k === i ? "now" : ""} />
      ))}
    </span>
  );
}

/**
 * The button that moves on: to the next question of a round (`finished` false), to the next puzzle or round, or after
 * the last one to the same again; in the endless run, to the next puzzle.
 */
export function Onward({ mode, stage, size, rounds, finished = true, onClick, g }: {
  mode: "puzzle" | "endless" | "free";
  stage: number;
  size: number;
  rounds?: boolean;
  finished?: boolean;
  onClick: () => void;
  g: GameWords;
}) {
  const word = mode === "endless" || !finished ? g.next : stage + 1 < size ? (rounds ? g.nextRound : g.next) : g.again;
  return <button className="live-btn on" onClick={onClick}>{word} →</button>;
}

/** The discoveries made so far out of all of them; the tooltip names the ones made. */
export function Found({ ladder, of, notices, g }: { ladder: Ladder<string>; of: number; notices: Record<string, string>; g: GameWords }) {
  return (
    <span className="geo-found" title={ladder.found.map((k) => notices[k]).join("\n")}>
      {fill(g.found, { n: ladder.found.length, of })}
    </span>
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
