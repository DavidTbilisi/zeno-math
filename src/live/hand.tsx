// The parts of a piece worked by hand, drawn inside its picture instead of a bar of buttons above it: a number to drag
// up or down (or tap, or use the arrow keys), a pill of a word or two to tap, a row of pills of which one is on, a bin
// to drop things in, and a drag that tells a tap from a move. Each is keyboard-usable with a role and a label, so a
// piece without buttons is still one a screen reader and a keyboard can work. First used by src/live/Counters.tsx.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
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

/** How much taller a game's picture grows for its CheckRow. */
export const CHECK_H = 50;
type RowPill = { text: string; onTap: () => void; disabled?: boolean };

/**
 * A game's ✓ Check pill, with a 🗑 Clear pill before it when given, along the bottom of its picture: from `y`, CHECK_H
 * tall, centred on a picture `w` wide. The row's own strip keeps a tap beside the pills from reaching the picture.
 */
export function CheckRow({ w, y, check, clear }: { w: number; y: number; check: RowPill; clear?: RowPill }) {
  const pw = (s: string) => 34 + [...s].length * 8.6;
  const [ct, kt] = [clear ? `🗑 ${clear.text}` : "", `✓ ${check.text}`];
  const lead = clear ? pw(ct) + 12 : 0;
  const x0 = (w - lead - pw(kt)) / 2;
  return (
    <g>
      <rect x={0} y={y} width={w} height={CHECK_H} fill="transparent" onPointerDown={(e) => e.stopPropagation()} />
      {clear && <Pill x={x0} y={y + 10} w={pw(ct)} text={ct} title={clear.text} disabled={clear.disabled} onTap={clear.onTap} />}
      <Pill x={x0 + lead} y={y + 10} w={pw(kt)} text={kt} title={check.text} strong disabled={check.disabled} onTap={check.onTap} />
    </g>
  );
}

/** A pill of a PillRows: `on` makes it a switch (aria-pressed). */
export type RowItem = { text: string; onTap: () => void; title?: string; strong?: boolean; on?: boolean; disabled?: boolean };
const ROWS_H = 40;
const rowPw = (t: string) => 34 + [...t].length * 8.4;
function layRows(items: RowItem[], w: number) {
  const rows: RowItem[][] = [[]];
  let used = 0;
  for (const it of items) {
    const pw = rowPw(it.text);
    if (used + pw > w - 24 && rows.at(-1)!.length) {
      rows.push([]);
      used = 0;
    }
    rows.at(-1)!.push(it);
    used += pw + 10;
  }
  return rows;
}
/** How tall PillRows draws these pills across a picture `w` wide. */
export const pillRowsH = (items: RowItem[], w: number) => layRows(items, w).length * ROWS_H;

/** A piece's moves and switches as pills, centred in rows across a picture `w` wide from `y`, onto another row when the width runs out. */
export function PillRows({ items, w, y }: { items: RowItem[]; w: number; y: number }) {
  return (
    <g>
      {layRows(items, w).map((row, r) => {
        let px = (w - row.reduce((a, it) => a + rowPw(it.text) + 10, -10)) / 2;
        return row.map((it) => {
          const x0 = px;
          px += rowPw(it.text) + 10;
          return <Pill key={it.text} x={x0} y={y + 5 + r * ROWS_H} w={rowPw(it.text)} text={it.text} title={it.title} strong={it.strong} on={it.on} disabled={it.disabled} onTap={it.onTap} />;
        });
      })}
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

/**
 * A dial drawn as a line with a knob, for a value with many stops (a rate on a log scale, an angle): the knob dragged
 * along the line, or the line tapped where the value should go; the arrow keys move a stop, Page Up and Down ten, Home
 * and End to the ends. `onChange(v, done)`: done is false while the knob is still held, so the caller can keep the
 * move as a draft and make it one step to undo when let go. Its name and value are written to its left.
 */
export function Track({ x, y, w, value, min, max, label, show, onChange, disabled, color = BLUE, lead = 92 }: {
  x: number; y: number; w: number; value: number; min: number; max: number; label: string; show: (v: number) => string;
  onChange: (v: number, done: boolean) => void; disabled?: boolean; color?: string;
  /** How wide the written value is, before the line. */
  lead?: number;
}) {
  const held = useRef(false);
  const [hold, setHold] = useState(false);
  const [x0, x1] = [x + lead + 20, x + w - 10];
  const at = (v: number) => x0 + ((v - min) / Math.max(1, max - min)) * (x1 - x0);
  const of = (px: number) => Math.max(min, Math.min(max, Math.round(min + ((px - x0) / (x1 - x0)) * (max - min))));
  const down = (e: ReactPointerEvent<SVGRectElement>) => {
    if (disabled || e.button !== 0) return;
    e.stopPropagation();
    capture(e.currentTarget, e.pointerId);
    held.current = true;
    setHold(true);
    onChange(of(pointIn(e)[0]), false);
  };
  const move = (e: ReactPointerEvent<SVGRectElement>) => held.current && onChange(of(pointIn(e)[0]), false);
  const up = (e: ReactPointerEvent<SVGRectElement>) => {
    if (!held.current) return;
    held.current = false;
    setHold(false);
    onChange(of(pointIn(e)[0]), true);
  };
  const key = (e: KeyboardEvent) => {
    if (disabled) return;
    const span = max - min;
    const to = { ArrowRight: value + 1, ArrowUp: value + 1, ArrowLeft: value - 1, ArrowDown: value - 1, PageUp: value + 10, PageDown: value - 10, Home: min, End: max }[e.key];
    if (to === undefined || span <= 0) return;
    // Kept here: the board would scroll on Page Up and Down, and move what is selected on the arrows.
    e.preventDefault();
    e.stopPropagation();
    onChange(Math.max(min, Math.min(max, to)), true);
  };
  const kx = at(value);
  return (
    <g role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={show(value)}
      aria-disabled={disabled || undefined} onKeyDown={key} opacity={disabled ? 0.55 : 1} style={{ cursor: disabled ? "default" : "ew-resize" }}>
      <title>{label}</title>
      <text x={x + lead} y={y + 20} fontSize={15} fontWeight={700} textAnchor="end" fill={color} pointerEvents="none">{show(value)}</text>
      <line x1={x0} y1={y + 15} x2={x1} y2={y + 15} stroke="#dee2e6" strokeWidth={6} strokeLinecap="round" pointerEvents="none" />
      <line x1={x0} y1={y + 15} x2={kx} y2={y + 15} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.35} pointerEvents="none" />
      <circle cx={kx} cy={y + 15} r={hold ? 11 : 9} fill="#fff" stroke={color} strokeWidth={3} pointerEvents="none" />
      <rect x={x0 - 12} y={y} width={x1 - x0 + 24} height={30} fill="transparent" onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerCancel={() => { held.current = false; setHold(false); }} />
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

/** How many a tick deals while the deck is held: slowly at first, then faster and faster. */
const RATE = [1, 1, 1, 1, 2, 2, 3, 5, 5, 10, 10, 20, 50, 100, 200, 500];
const rate = (t: number) => (t < RATE.length ? RATE[t] : 1000);
/** How long a press is a tap before it starts dealing, and the time between deals. */
const HOLD = 350;
const TICK = 70;

export type HoldHand = { label: string; hot: boolean; props: Record<string, unknown> };

/**
 * Something tapped for one more go and held for many (a deck dealt, a die thrown): a tap (or Enter) does one, a press
 * held (or the key held) does more and more each tick until it is let go, `room` saying how many more there can be.
 * What is done while held is shown at once and handed to the board when it is let go, one step to undo. Spread
 * `hand.props` on the thing's group, which also takes `role="button"` and `hand.label`.
 */
export function useHold<T>(cur: T, deal: (s: T, m: number) => T, room: (s: T) => number, put: (s: T) => void, label: string) {
  const [held, setHeldState] = useState<T | null>(null);
  const live = useRef<T | null>(null);
  const timers = useRef<{ wait?: number; tick?: number; t: number }>({ t: 0 });
  const setHeld = (s: T | null) => {
    live.current = s;
    setHeldState(s);
  };
  const more = () => {
    const s = live.current ?? cur;
    const m = Math.min(rate(timers.current.t++), room(s));
    if (m > 0) setHeld(deal(s, m));
  };
  const stop = () => {
    window.clearTimeout(timers.current.wait);
    window.clearInterval(timers.current.tick);
    const dealt = timers.current.t > 0;
    timers.current = { t: 0 };
    const s = live.current;
    setHeld(null);
    if (s) put(s);
    return dealt;
  };
  useEffect(() => () => {
    window.clearTimeout(timers.current.wait);
    window.clearInterval(timers.current.tick);
  }, []);
  const down = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(e.currentTarget, e.pointerId);
    stop();
    timers.current.wait = window.setTimeout(() => {
      more();
      timers.current.tick = window.setInterval(more, TICK);
    }, HOLD);
  };
  const up = () => {
    const holding = timers.current.wait !== undefined;
    // Let go before it started dealing: a tap, one more (the deck shuffled full again if it was used up).
    if (!stop() && holding) put(deal(cur, 1));
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!e.repeat) {
      timers.current.t = 0;
      return setHeld(deal(cur, 1));
    }
    more();
  };
  const hand: HoldHand = {
    label,
    hot: held !== null,
    props: {
      onPointerDown: down, onPointerUp: up, onPointerCancel: () => void stop(),
      onKeyDown: key, onKeyUp: () => void stop(), onBlur: () => void stop(),
    },
  };
  return { shown: held ?? cur, hand };
}
