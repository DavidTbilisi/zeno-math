// What the games on the board share: a ladder of puzzles, each with up to three stars and open once the one before it
// has a star, the things a player has noticed, and the best streak. Kept per game in this browser, so it is read back
// as carefully as anything a user could have edited.
export type Ladder<K extends string> = { stars: number[]; found: K[]; best: number };

export function readLadder<K extends string>(json: string | null, size: number, keys: readonly K[]): Ladder<K> {
  const empty: Ladder<K> = { stars: Array(size).fill(0), found: [], best: 0 };
  try {
    const p = JSON.parse(json ?? "null") as Partial<Ladder<K>> | null;
    if (!p || typeof p !== "object") return empty;
    const stars = empty.stars.map((_, i) => {
      const s = Array.isArray(p.stars) ? Number(p.stars[i]) : 0;
      return s >= 1 && s <= 3 ? Math.floor(s) : 0;
    });
    const found = Array.isArray(p.found) ? keys.filter((k) => p.found!.includes(k)) : [];
    const best = Number.isFinite(p.best) && p.best! > 0 ? Math.floor(p.best!) : 0;
    return { stars, found, best };
  } catch {
    return empty;
  }
}
/** The best stars of each puzzle are kept. */
export const withStars = <K extends string>(p: Ladder<K>, stage: number, stars: number): Ladder<K> => ({ ...p, stars: p.stars.map((s, i) => (i === stage ? Math.max(s, stars) : s)) });
/** A thing noticed, kept in the order of `keys`. */
export const withFound = <K extends string>(p: Ladder<K>, k: K, keys: readonly K[]): Ladder<K> => (p.found.includes(k) ? p : { ...p, found: keys.filter((n) => n === k || p.found.includes(n)) });
export const withBest = <K extends string>(p: Ladder<K>, streak: number): Ladder<K> => (streak > p.best ? { ...p, best: streak } : p);
/** A puzzle opens once the one before it has a star. */
export const isOpen = (p: { stars: number[] }, stage: number) => stage === 0 || p.stars[stage - 1] > 0;
