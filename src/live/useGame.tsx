// The shell a game on the board is built on, so every game plays alike and a game's own file holds only what is
// right or wrong in it and how well. The hook keeps the ladder (in this browser), and does what every outcome does:
// a tap ticks; a right step glows and rings (higher the longer the streak); a miss shakes the stage with a red flash,
// a low note and a nudge of the feedback line; a puzzle done settles the stars, the best streak and a notice found into
// the ladder, cheers in proportion (one star a pop, three a big burst and a held chord), marks a streak of 5, 10, 25
// or 50 with a burst of its own, and plays a chord when the ninth star completes the ladder. It also moves between the
// puzzles, the endless run and free play, and clears every timer it set when the piece goes. Each outcome is one
// `set`, so each stays one step to undo; what only moves (the shake, the cheer) is kept here, not on the board. The
// pieces under it draw the head (the puzzles and the way out of them), the stage (with the panel over it when the
// ladder is done), the stars still at stake, the line of feedback and the bottom bar.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { burst, isMilestone, ladderDone, nextStreak, settle, totalStars, type GameBase, type GameLevel, type GameMode, type Ladder } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder, type GameWords } from "./ladderUi";
import { fill } from "./ui";

/** What a line of feedback is: a hint in grey, the prompt in bold, a miss in red, a right answer in green, a notice in purple. */
export type Tone = "hint" | "prompt" | "wrong" | "ok" | "notice";
export type Line = { tone: Tone; text: string };

/** What only moves: counters that re-key a cheer or a nudge, and the pulse (a shake or a beat) the stage is in. */
export type Fx = { cheer: number; mark: number; markN: number; pulse: number; kind: "shake" | "beat" | null };

type Notice<K> = (streak: number) => K | null;

export type Game<K extends string, S extends GameBase<K, unknown>> = {
  state: S;
  ladder: Ladder<K>;
  size: number;
  modes: readonly GameMode[];
  notices: readonly K[];
  fx: Fx;
  /** A move that is neither right nor wrong: a tick. */
  tap(patch: Partial<S>): void;
  /** Right, but the puzzle is not finished: a chord (higher along a streak), a beat, a notice found if any. */
  step(patch: Partial<S>, o?: { notice?: Notice<K> }): void;
  /** Wrong: a low note, a shake, the endless streak back to nought; a notice can still be found (what the miss showed). */
  miss(patch: Partial<S>, o?: { notice?: Notice<K> }): void;
  /** The puzzle finished: its stars (in a puzzle), the streak (`clean` in the endless run), a notice, and the cheer. */
  win(o: { stars?: number; clean?: boolean; right?: boolean; notice?: Notice<K>; patch?: Partial<S> }): void;
  go(stage: number): void;
  endless(level: GameLevel): void;
  free(): void;
  /** On: the next puzzle of the endless run, the puzzle after this one (the same again after the last), or free play afresh. */
  onward(): void;
  /** Milliseconds since this puzzle was shown, for "quick" notices. */
  sinceShown(): number;
};

export function useGame<K extends string, S extends GameBase<K, unknown>>(o: {
  /** Where the ladder is kept in this browser, such as "zeno.target.v1". */
  key: string;
  size: number;
  notices: readonly K[];
  modes: readonly GameMode[];
  state: S;
  set: (s: S) => void;
  /** What a new puzzle starts from. */
  fresh: Partial<S>;
  /** What a puzzle of the ladder sets besides (its start, its rate), and what free play sets. */
  stagePatch?: (stage: number) => Partial<S>;
  freePatch?: Partial<S>;
}): Game<K, S> {
  const { state: d, set, size, notices, modes, fresh } = o;
  const [ladder, keep] = useLadder(o.key, size, notices);
  const [fx, setFx] = useState<Fx>({ cheer: 0, mark: 0, markN: 0, pulse: 0, kind: null });
  const shownAt = useRef(performance.now());
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const streakOf = (s: S) => (s as { streak?: number }).streak ?? 0;
  const streakPatch = (streak: number) => ("streak" in d ? { streak } : {});
  const saidOf = (key: K | null, patch?: Partial<S>) => (key ? { kind: "notice" as const, key } : (patch?.said ?? null));
  const pulse = (kind: "shake" | "beat") => {
    setFx((f) => ({ ...f, pulse: f.pulse + 1, kind }));
    later(450, () => setFx((f) => ({ ...f, kind: null })));
  };
  const mark = (streak: number) => {
    if (!isMilestone(streak)) return false;
    later(520, () => play("streak"));
    setFx((f) => ({ ...f, mark: f.mark + 1, markN: streak }));
    return true;
  };
  const settleIn = (streak: number, key: K | null, stars?: number) => {
    const next = settle(ladder, { mode: d.mode, stage: d.stage, stars, streak, key, keys: notices });
    if (next !== ladder) keep(next);
    return next;
  };

  const tap = (patch: Partial<S>) => {
    play("snap");
    set({ ...d, ...patch } as S);
  };
  const step = (patch: Partial<S>, s: { notice?: Notice<K> } = {}) => {
    const streak = nextStreak(d.mode, streakOf(d), true);
    const key = s.notice?.(streak) ?? null;
    const next = settleIn(streak, key);
    play("good", { pitch: d.mode === "endless" ? Math.min(streak, 8) : 0 });
    if (key && !ladder.found.includes(key) && next !== ladder) later(200, () => play("star"));
    mark(streak);
    pulse("beat");
    set({ ...d, ...patch, ...streakPatch(streak), said: saidOf(key, patch) } as S);
  };
  const miss = (patch: Partial<S>, s: { notice?: Notice<K> } = {}) => {
    const streak = nextStreak(d.mode, streakOf(d), false);
    const key = s.notice?.(streak) ?? null;
    settleIn(streak, key);
    play("miss");
    pulse("shake");
    set({ ...d, ...patch, ...streakPatch(streak), said: patch.said ?? saidOf(key) } as S);
  };
  const win = (s: { stars?: number; clean?: boolean; right?: boolean; notice?: Notice<K>; patch?: Partial<S> }) => {
    const streak = nextStreak(d.mode, streakOf(d), s.clean ?? true);
    const key = s.notice?.(streak) ?? null;
    const next = settleIn(streak, key, s.stars);
    play(s.right ?? true ? "good" : "miss", { pitch: d.mode === "endless" ? Math.min(streak, 8) : 0 });
    later(260, () => play(s.stars === 3 ? "levelup" : "star"));
    mark(streak);
    if (!ladderDone(ladder.stars) && ladderDone(next.stars)) later(700, () => play("levelup"));
    setFx((f) => ({ ...f, cheer: f.cheer + 1 }));
    set({ ...d, ...s.patch, ...streakPatch(streak), said: saidOf(key, s.patch) } as S);
  };

  const show = () => (shownAt.current = performance.now());
  const go = (stage: number) => {
    show();
    set({ ...d, ...fresh, ...o.stagePatch?.(stage), mode: "puzzle", stage } as S);
  };
  const endless = (level: GameLevel) => {
    show();
    set({ ...d, ...fresh, mode: "endless", level, seed: newSeed() } as S);
  };
  const free = () => {
    show();
    set({ ...d, ...fresh, ...o.freePatch, mode: "free" } as S);
  };
  const onward = () => {
    if (d.mode === "endless") return endless((d as { level?: GameLevel }).level ?? 1);
    if (d.mode === "free") return free();
    go(nextStage(d.stage, size));
  };

  return { state: d, ladder, size, modes, notices, fx, tap, step, miss, win, go, endless, free, onward, sinceShown: () => performance.now() - shownAt.current };
}

/** Any game, for the pieces that draw one. */
export type AnyGame = Game<string, GameBase<string, unknown>>;

/** The puzzle just done was the last, and every puzzle has a star: the ladder is complete. */
export const isFinale = (game: AnyGame, done: boolean) => done && game.state.mode === "puzzle" && game.state.stage === game.size - 1 && ladderDone(game.ladder.stars);

/** The top of a game: the puzzles with their stars and the way out of them, and under it the round's dots or the stars at stake. */
export function GameHead({ game, g, words, pace, children }: {
  game: AnyGame;
  g: GameWords;
  /** A game's own names for its puzzles ("Round {n}") and its lock, where they differ from every game's. */
  words?: { puzzle?: string; locked?: string; free?: string };
  pace?: ReactNode;
  children?: ReactNode;
}) {
  const d = game.state as GameBase<string, unknown> & { level?: GameLevel; streak?: number };
  return (
    <GameNav
      ladder={game.ladder}
      mode={d.mode}
      stage={d.stage}
      level={d.level}
      streak={d.streak}
      onPuzzle={game.go}
      onEndless={game.modes.includes("endless") ? game.endless : undefined}
      onFree={game.modes.includes("free") ? game.free : undefined}
      words={words ?? {}}
      g={g}
      pace={pace}
    >
      {children}
    </GameNav>
  );
}

/** The stars still to be had on this puzzle, and which try this is. */
export function Stake({ stars, tries, g }: { stars: number; tries: number; g: GameWords }) {
  return (
    <span className="live-stake">
      <b aria-label={`${stars} ★`}>{starText(stars)}</b>
      {fill(g.tries, { n: tries + 1 })}
    </span>
  );
}

/**
 * The picture, shaken or glowing as the game goes, with the cheer (sized to the stars) and a streak mark over it, and
 * the ladder-done panel over it once the last puzzle completes the ladder.
 */
export function Stage({ game, stars, done, g, notices, children }: { game: AnyGame; stars: number; done: boolean; g: GameWords; notices: Record<string, string>; children: ReactNode }) {
  const { fx } = game;
  return (
    <div className="geo-stage-wrap">
      <div className={fx.kind === "shake" ? "live-shake" : fx.kind === "beat" ? "live-beat" : undefined}>{children}</div>
      {fx.kind === "shake" && <i key={fx.pulse} className="live-flash" />}
      {isFinale(game, done) && <LadderDone game={game} g={g} notices={notices} />}
      {fx.cheer > 0 && done && <Cheer key={fx.cheer} text={starText(stars)} stars={stars} />}
      {fx.mark > 0 && <Cheer key={`m${fx.mark}`} text={fill(g.streakMark, { n: fx.markN })} streak />}
    </div>
  );
}

/** The line of feedback, announced as it changes; a miss nudges it, and the discoveries so far can follow it. */
export function Said({ line, pulse, found }: { line: Line; pulse?: number; found?: { game: AnyGame; notices: Record<string, string>; g: GameWords } }) {
  const cls = line.tone === "hint" ? "live-hint" : line.tone === "prompt" ? "live-said geo-prompt" : `live-said ${line.tone}`;
  return (
    <p className={cls} role={line.tone === "prompt" ? undefined : "status"}>
      <span key={pulse} className={line.tone === "wrong" && pulse ? "live-said-in" : undefined}>{line.text}</span>
      {found && (
        <>
          {" "}
          <Found ladder={found.game.ladder} of={found.game.notices.length} notices={found.notices} g={found.g} />
        </>
      )}
    </p>
  );
}

/**
 * The bottom of a game: its own buttons until the puzzle is done (or always, with `always`), then the button that moves
 * on, and the sound switch. When the puzzle done completed the ladder, the panel over the stage says where to go.
 */
export function GameActions({ game, g, done, finished = true, rounds, always, onward, children }: {
  game: AnyGame;
  g: GameWords;
  done: boolean;
  finished?: boolean;
  rounds?: boolean;
  always?: boolean;
  onward?: () => void;
  children?: ReactNode;
}) {
  const d = game.state;
  return (
    <div className="live-bar">
      {(always || !done) && children}
      {done && !isFinale(game, done && finished) && <Onward mode={d.mode} stage={d.stage} size={game.size} rounds={rounds} finished={finished} onClick={onward ?? game.onward} g={g} />}
      <SoundToggle title={g.sound} />
    </div>
  );
}

/** Every puzzle done, over the stage: the stars in all, the discoveries made, and where to go from here. */
export function LadderDone({ game, g, notices }: { game: AnyGame; g: GameWords; notices: Record<string, string> }) {
  const level = (game.state as { level?: GameLevel }).level ?? 1;
  return (
    <div className="ladder-done" role="status">
      <b>{fill(g.allDone, { n: totalStars(game.ladder.stars), of: 3 * game.size })}</b>
      {game.ladder.found.length > 0 && (
        <>
          <span className="geo-found">{g.discoveries}</span>
          <ul>
            {game.ladder.found.map((k) => (
              <li key={k}>{notices[k]}</li>
            ))}
          </ul>
        </>
      )}
      <div className="live-bar">
        {game.modes.includes("endless") && <button className="live-btn on" onClick={() => game.endless(level)}>∞ {g.playEndless}</button>}
        {game.modes.includes("free") && <button className="live-btn on" onClick={game.free}>✏️ {g.free}</button>}
        <button className="live-btn" onClick={() => game.go(0)}>{g.replay}</button>
      </div>
    </div>
  );
}

export { burst };
