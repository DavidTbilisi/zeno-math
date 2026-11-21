// The pencils laid across two towers (of blocks, or of fraction bars): the towers slide to a middle line, then a pencil
// joins their tops and one their bottoms, which draws the sign between the two numbers.
import { useEffect, useRef, useState } from "react";

const easeInOut = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2;

/**
 * How far the pencils have got, eased: over the first half of the way the towers slide to the middle line, over the
 * second half the pencils are laid. Runs forwards when joined, backwards when taken apart.
 */
export function useJoin(joined: boolean) {
  const target = joined ? 1 : 0;
  const [t, setT] = useState(target);
  const tRef = useRef(target);
  useEffect(() => {
    const from = tRef.current;
    if (from === target) return;
    const start = performance.now();
    const ms = 1100 * Math.abs(target - from);
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      tRef.current = from + (target - from) * k;
      setT(tRef.current);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const slide = easeInOut(Math.min(1, t * 2));
  const pencils = easeInOut(Math.max(0, t * 2 - 1));
  return { slide, pencils };
}

/** A pencil from one point towards another, drawn as far as `k` of the way (0 to 1). */
export const Pencil = ({
  from,
  to,
  color,
  k,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  k: number;
}) =>
  k > 0 ? (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={from[0] + (to[0] - from[0]) * k}
      y2={from[1] + (to[1] - from[1]) * k}
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
    />
  ) : null;
