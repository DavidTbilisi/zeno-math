// The games a student's teacher assigned to their class (server/classGames.ts), kept in this browser as they last came
// from the server, and the stars of those games sent back: whenever an assigned game's ladder changes, and once on
// each page for every assigned game, in case a send was lost. Only a signed-in student's browser sends anything, and
// only for the games assigned.
import { useEffect, useState } from "react";
import { study } from "./api";
import { loadStudent } from "./learner";
import { GAME_KEYS, isGameId, type GameId } from "./model/gameKeys";

const KEY = "zeno.classGames";
export function classGames(): GameId[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter(isGameId) : [];
  } catch {
    return [];
  }
}
/** Keeps what the server said ([] or nothing: no games, or the student isn't in a class any more). */
export function storeClassGames(v: unknown) {
  try {
    const games = Array.isArray(v) ? v.filter(isGameId) : [];
    if (games.length) localStorage.setItem(KEY, JSON.stringify(games));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the games are just not kept */
  }
}

const GAME_OF_KEY = new Map(Object.entries(GAME_KEYS).map(([game, key]) => [key as string, game as GameId]));

/**
 * The stars of a game's ladder kept in this browser, one per puzzle (an empty list for a game not played here), read
 * whatever the ladder's length: readLadder (ladder.ts) needs the length, which only the game itself knows.
 */
export function starsHere(game: GameId): number[] {
  try {
    const stars = (JSON.parse(localStorage.getItem(GAME_KEYS[game]) ?? "null") as { stars?: unknown } | null)?.stars;
    return Array.isArray(stars) ? stars.map((s) => (Number.isInteger(s) && s >= 0 && s <= 3 ? (s as number) : 0)) : [];
  } catch {
    return [];
  }
}

/** A game's ladder has changed (useLadder): sent if the game is assigned and a student is signed in here. */
export function reportLadder(key: string, stars: readonly number[]) {
  const game = GAME_OF_KEY.get(key);
  const student = loadStudent();
  if (!game || !student || !classGames().includes(game) || !stars.some((s) => s > 0)) return;
  // A lost send is made good by the next page's sync.
  study.stars(student.code, game, [...stars]).catch(() => {});
}

/** Sends the stars of every assigned game played in this browser: the server keeps the best, so sending again is harmless. */
export function syncClassGames(code: string, games: readonly GameId[]) {
  for (const g of games) {
    const stars = starsHere(g);
    if (stars.some((s) => s > 0)) study.stars(code, g, stars).catch(() => {});
  }
}

// What the server says about the student's class, asked once per page: the goal (classGoal.ts) and the games.
type ClassInfo = { goal: unknown; games: GameId[] } | null;
let asked: Promise<ClassInfo> | null = null;
export function classInfo(): Promise<ClassInfo> {
  const s = loadStudent();
  if (!s) return Promise.resolve(null);
  asked ??= study.student(s.code).then(
    (me) => {
      storeClassGames(me.games);
      syncClassGames(s.code, classGames());
      return { goal: me.goal, games: classGames() };
    },
    () => null,
  );
  return asked;
}

/** The games assigned to the signed-in student's class, as last kept, then as the server says. */
export function useClassGames(): GameId[] {
  const [games, setGames] = useState(() => (loadStudent() ? classGames() : []));
  useEffect(() => {
    let live = true;
    void classInfo().then((info) => {
      if (live && info) setGames(info.games);
    });
    return () => {
      live = false;
    };
  }, []);
  return games;
}
