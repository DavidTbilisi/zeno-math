// Things that pop and go, and the places the rest keep: when pieces cancel (a + chip and a − chip, an x tile and a −x tile), ghosts of them are
// drawn where they were for a moment with a CSS animation (.chip-pop, .chip-zero in styles.css), then forgotten.
// Each firing gets a new id, so the same spot popping twice runs its animation again.
import { useCallback, useEffect, useState } from "react";

/**
 * A layout that holds its places when things are taken away from it: the rest stay where they were, with gaps, until
 * the state changes some other way (a tile put out, an undo), when `laidOut` is used again. `key` names the state the
 * layout is for; `drop` takes items away and names the state that follows.
 */
export function useHeld<T>(key: string, laidOut: T[]): [T[], (remove: number[], next: string) => void] {
  const [held, setHeld] = useState<{ key: string; items: T[] } | null>(null);
  const items = held && held.key === key ? held.items : laidOut;
  const drop = (remove: number[], next: string) => setHeld({ key: next, items: items.filter((_, i) => !remove.includes(i)) });
  return [items, drop];
}

export function usePops<T>(ms = 700): [{ id: number; items: T[] } | null, (items: T[]) => void] {
  const [pops, setPops] = useState<{ id: number; items: T[] } | null>(null);
  useEffect(() => {
    if (!pops) return;
    const h = setTimeout(() => setPops(null), ms);
    return () => clearTimeout(h);
  }, [pops, ms]);
  const fire = useCallback((items: T[]) => setPops((p) => ({ id: (p?.id ?? 0) + 1, items })), []);
  return [pops, fire];
}
