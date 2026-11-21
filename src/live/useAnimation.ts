import { useEffect, useRef } from "react";

/** Runs `step(t)` with t from 0 to 1 over `ms`, then `done`; a new run or unmounting stops the old one. */
export function useAnimation() {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (ms: number, step: (t: number) => void, done: () => void) => {
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      step(t);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else done();
    };
    frame.current = requestAnimationFrame(tick);
  };
}
