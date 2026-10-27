import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * How far a toolbar must squeeze to fit, from 0 (as it is) up to `levels`: a level is taken when the bar overflows at
 * the one before, and given back once the bar is as wide as it needed there. Checked after every render (a button can
 * come and go, a language has longer words) and whenever the bar is resized. Give the bar the ref this returns and
 * `data-fit` set to the level, which is where the check reads the level the bar is drawn at.
 */
export function useCompact<T extends HTMLElement>(levels: number): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [level, setLevel] = useState(0);
  // The width the bar needed at each level, when it last overflowed there.
  const wide = useRef<number[]>([]);
  const check = useCallback(() => {
    if (!el) return;
    const at = Number(el.dataset.fit ?? 0);
    if (el.scrollWidth > el.clientWidth) {
      wide.current[at] = el.scrollWidth;
      if (at < levels) setLevel(at + 1);
    } else if (at > 0 && el.clientWidth >= (wide.current[at - 1] ?? Infinity)) setLevel(at - 1);
  }, [el, levels]);
  useLayoutEffect(check);
  useEffect(() => {
    if (!el) return;
    const watch = new ResizeObserver(check);
    watch.observe(el);
    return () => watch.disconnect();
  }, [el, check]);
  return [setEl, level];
}
