// The parts of a piece worked by hand, drawn inside its picture instead of a bar of buttons above it: a number to drag
// up or down (or tap, or use the arrow keys), a pill of a word or two to tap, a row of pills of which one is on, a bin
// to drop things in, and a drag that tells a tap from a move. Each is keyboard-usable with a role and a label, so a
// piece without buttons is still one a screen reader and a keyboard can work. First used by src/live/Counters.tsx.
import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { INK, svgPoint } from "./ui";

export const BLUE = "#1971c2";
export const GREEN = "#2f9e44";
export const RED = "#c92a2a";
export const MUTED = "#868e96";
/** A press that moves less than this (in picture units) is a tap. */
export const TAP = 5;
/** How far a drag up or down moves a number by one. */
const SCRUB = 14;

/** Enter or space does what a tap does. */
export function keyTap(e: KeyboardEvent, act: () => void) {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  act();
}

/** The picture an element is in. */
const ownerSvg = (el: Element) => (el instanceof SVGSVGElement ? el : (el as SVGElement).ownerSVGElement!);
/** Where a pointer event is, in the picture's units. */
export const pointIn = (e: ReactPointerEvent) => svgPoint(ownerSvg(e.currentTarget), e);

export type DragAt<T> = T & { x0: number; y0: number; x: number; y: number; moved: boolean };

/** Keeps the pointer's moves coming here; a press the board passes on (the click that brought the piece into use) has no
 * pointer to keep, and that is fine. */
export function capture(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // No such pointer is down: the moves still come by bubbling.
  }
}

/**
 * A drag that starts on any part of the picture and is followed by the picture itself: `begin` it from a part's
 * pointer-down with what is being dragged, spread `svgProps` on the svg, and `end` gets it when the pointer is let go,
 * `moved` false for a tap.
 */
export function useDrag<T>(end: (d: DragAt<T>) => void, onMove?: (d: DragAt<T>) => void) {
  const [drag, setDrag] = useState<DragAt<T> | null>(null);
  // The drag as it is now: a move and the let-go can come before the picture draws again, so they read this, not `drag`.
  const live = useRef<DragAt<T> | null>(null);
  const to = (d: DragAt<T> | null) => {
    live.current = d;
    setDrag(d);
  };
  const follow = (e: ReactPointerEvent<SVGSVGElement>, d: DragAt<T>): DragAt<T> => {
    const [x, y] = svgPoint(e.currentTarget, e);
    return { ...d, x, y, moved: d.moved || Math.hypot(x - d.x0, y - d.y0) > TAP };
  };
  const begin = (e: ReactPointerEvent, data: T) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(ownerSvg(e.currentTarget), e.pointerId);
    const [x, y] = pointIn(e);
    to({ ...data, x0: x, y0: y, x, y, moved: false });
  };
  const svgProps = {
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!live.current) return;
      const next = follow(e, live.current);
      to(next);
      onMove?.(next);
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!live.current) return;
      const last = follow(e, live.current);
      to(null);
      end(last);
    },
    onPointerCancel: () => to(null),
  };
  return { drag, begin, svgProps };
}

/** A word or two to tap, drawn as a pill; `strong` fills it blue, `on` marks it as the chosen one of a row. */
export function Pill({ x, y, w, h = 30, text, onTap, strong, on, title, disabled, size = 15 }: {
  x: number; y: number; w: number; h?: number; text: string; onTap: () => void; strong?: boolean; on?: boolean; title?: string;
  disabled?: boolean; size?: number;
}) {
  const filled = strong || on;
  const act = () => !disabled && onTap();
  return (
    <g role="button" tabIndex={disabled ? -1 : 0} aria-label={title ?? text} aria-pressed={on === undefined ? undefined : on}
      aria-disabled={disabled || undefined} opacity={disabled ? 0.4 : 1} style={{ cursor: disabled ? "default" : "pointer" }}
      onPointerDown={(e) => e.stopPropagation()} onClick={act} onKeyDown={(e) => keyTap(e, act)}>
      {title && <title>{title}</title>}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={filled ? BLUE : "#fff"} stroke={filled ? BLUE : "#adb5bd"} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.35} fontSize={size} fontWeight={600} textAnchor="middle" fill={filled ? "#fff" : INK} pointerEvents="none">{text}</text>
    </g>
  );
}

/** A row of pills, one of them on: tabs for a piece's ways of working. Returns the width it took. */
export function Tabs<K extends string>({ x, y, keys, on, names, onPick, gap = 6, size = 14 }: {
  x: number; y: number; keys: readonly K[]; on: K; names: Record<K, string>; onPick: (k: K) => void; gap?: number; size?: number;
}) {
  let at = x;
  return (
    <g role="group">
      {keys.map((k) => {
        const w = Math.max(60, names[k].length * size * 0.6 + 24);
        const px = at;
        at += w + gap;
        return <Pill key={k} x={px} y={y} w={w} h={28} size={size} text={names[k]} on={k === on} onTap={() => onPick(k)} />;
      })}
    </g>
  );
}

/**
 * A number to change by hand: drag it up or down, tap its top half for one more and its bottom half for one less, or
 * use the arrow keys. `show` writes it (a minus sign, brackets, a unit).
 */
export function NumBox({ x, y, w, h = 44, value, min, max, label, onChange, show = (v) => (v < 0 ? `−${-v}` : `${v}`), size = 22 }: {
  x: number; y: number; w: number; h?: number; value: number; min: number; max: number; label: string; onChange: (v: number) => void;
  show?: (v: number) => string; size?: number;
}) {
  type Press = { y0: number; v0: number; top: boolean; moved: boolean };
  const [press, setPressState] = useState<Press | null>(null);
  // The press as it is now: a let-go can come before the picture draws again (in one frame), so it reads this.
  const live = useRef<Press | null>(null);
  const setPress = (p: Press | null) => {
    live.current = p;
    setPressState(p);
  };
  const to = (v: number) => {
    const c = Math.max(min, Math.min(max, v));
    if (c !== value) onChange(c);
  };
  const down = (e: ReactPointerEvent<SVGRectElement>, top: boolean) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(e.currentTarget, e.pointerId);
    setPress({ y0: pointIn(e)[1], v0: value, top, moved: false });
  };
  const move = (e: ReactPointerEvent<SVGRectElement>) => {
    const press = live.current;
    if (!press) return;
    const dy = press.y0 - pointIn(e)[1];
    const moved = press.moved || Math.abs(dy) > TAP;
    if (moved !== press.moved) setPress({ ...press, moved });
    if (moved) to(press.v0 + Math.round(dy / SCRUB));
  };
  const up = (e: ReactPointerEvent<SVGRectElement>) => {
    // Read the let-go's own place too: a move just before it may not have been drawn yet.
    const press = live.current;
    if (press && !press.moved && Math.abs(press.y0 - pointIn(e)[1]) <= TAP) to(press.v0 + (press.top ? 1 : -1));
    setPress(null);
  };
  const key = (e: KeyboardEvent) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    to(value + by);
  };
  const half = (top: boolean) => (
    <rect x={x} y={top ? y : y + h / 2} width={w} height={h / 2} fill="transparent" onPointerDown={(e) => down(e, top)} onPointerMove={move}
      onPointerUp={up} onPointerCancel={() => setPress(null)} />
  );
  return (
    <g role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={show(value)}
      onKeyDown={key} style={{ cursor: "ns-resize" }}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#fff" stroke={press ? BLUE : "#adb5bd"} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} fontSize={size} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{show(value)}</text>
      <text x={x + w / 2} y={y + 9} fontSize={9} textAnchor="middle" fill={value < max ? "#adb5bd" : "#e9ecef"} pointerEvents="none">▲</text>
      <text x={x + w / 2} y={y + h - 2} fontSize={9} textAnchor="middle" fill={value > min ? "#adb5bd" : "#e9ecef"} pointerEvents="none">▼</text>
      {half(true)}
      {half(false)}
    </g>
  );
}

/** A bin to drop things in: red while something is held over it; a tap empties what it is for. */
export function Bin({ x, y, w = 100, h = 66, hot, label, title, onTap }: {
  x: number; y: number; w?: number; h?: number; hot: boolean; label: string; title: string; onTap: () => void;
}) {
  const c = hot ? RED : MUTED;
  const mx = x + w / 2;
  return (
    <g role="button" tabIndex={0} aria-label={title} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
      onClick={onTap} onKeyDown={(e) => keyTap(e, onTap)}>
      <title>{title}</title>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={hot ? "#fff5f5" : "#fff"} stroke={hot ? RED : "#ced4da"}
        strokeDasharray={hot ? undefined : "5 4"} strokeWidth={hot ? 2.5 : 1.5} />
      <path d={`M${mx - 12} ${y + 14} h24 M${mx - 4} ${y + 14} v-3 h8 v3 M${mx - 10} ${y + 17} l2 20 h16 l2 -20`}
        fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
      <text x={mx} y={y + h - 10} fontSize={13} textAnchor="middle" fill={c} pointerEvents="none">{label}</text>
    </g>
  );
}

/** A line of words wrapped at spaces, at most `n` characters a line. */
export function wrapWords(s: string, n: number): string[] {
  const out: string[] = [];
  for (const word of s.split(" ")) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= n) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}

/** The box dragged from (x0, y0) to (x, y). */
export function boxOf(d: { x0: number; y0: number; x: number; y: number }) {
  return { x: Math.min(d.x0, d.x), y: Math.min(d.y0, d.y), w: Math.abs(d.x - d.x0), h: Math.abs(d.y - d.y0) };
}
export const inBox = (b: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
  x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

const DIE_PIPS: [number, number][] = [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]];

/** A die to tap for something new at random (new numbers, a time, a roll). */
export function DieButton({ x, y, s = 38, title, onTap }: { x: number; y: number; s?: number; title: string; onTap: () => void }) {
  return (
    <g role="button" tabIndex={0} aria-label={title} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
      onClick={onTap} onKeyDown={(e) => keyTap(e, onTap)}>
      <title>{title}</title>
      <rect x={x} y={y} width={s} height={s} rx={s / 5} fill="#fff" stroke={INK} strokeWidth={2} />
      {DIE_PIPS.map(([fx, fy], i) => <circle key={i} cx={x + fx * s} cy={y + fy * s} r={s / 11} fill={INK} pointerEvents="none" />)}
    </g>
  );
}
