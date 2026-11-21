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

/** The two pencils lying in their box, faded once they are laid on the towers. */
export const PencilBox = ({ x, y, w, h, joined, colors, on }: { x: number; y: number; w: number; h: number; joined: boolean; colors: readonly string[]; on: string }) => (
  <>
    <rect x={x} y={y} width={w} height={h} rx={8} fill={joined ? "#e7f5ff" : "#fff"} stroke={joined ? on : "#ced4da"} strokeDasharray={joined ? undefined : "5 4"} />
    {colors.map((c, i) => (
      <g key={c} opacity={joined ? 0.3 : 1}>
        <line x1={x + 12} y1={y + 12 + i * 11} x2={x + w - 20} y2={y + 12 + i * 11} stroke={c} strokeWidth={7} strokeLinecap="round" />
        <path d={`M${x + w - 20} ${y + 8.5 + i * 11} l10 3.5 l-10 3.5 z`} fill="#f4d6a0" stroke={c} strokeWidth={1} />
      </g>
    ))}
  </>
);
