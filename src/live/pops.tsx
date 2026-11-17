// Things that pop and go: when pieces cancel (a + chip and a − chip, an x tile and a −x tile), ghosts of them are
// drawn where they were for a moment with a CSS animation (.chip-pop, .chip-zero in styles.css), then forgotten.
// Each firing gets a new id, so the same spot popping twice runs its animation again.
import { useCallback, useEffect, useState } from "react";

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
