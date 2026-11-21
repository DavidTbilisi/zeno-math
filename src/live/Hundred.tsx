// The hundred square worked by hand. Two pills in the picture pick what a tap does. Mark: a tap marks a square (or
// takes its mark off), a drag across squares paints them all the same way, and the number box marks the multiples of
// its number. Jumps: a tap starts a walk; a tap on, or a drag to, any other square jumps there by tens and then ones,
// drawn as arrows; a tap on the walk's last square takes its last jump back, and a tap on the sum replays the walk.
// The bin clears the marks or the walk. Keys on the square: arrows move (Mark) or jump (Jumps), Enter marks or
// starts, Backspace takes a jump back.
import { useEffect, useState, type KeyboardEvent } from "react";
import {
  HUNDRED_STEPS,
  hundredJump,
  hundredPath,
  hundredSum,
  jumpsTo,
  multiplesOf,
  paintMarks,
  type LiveStates,
} from "../math/live";
import {
  Bin,
  BLUE,
  GREEN,
  keyTap,
  NumBox,
  RED,
  Tabs,
  useDrag,
  wrapWords,
} from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const S = 38;
const GX = 2;
const GY = 52;
const W = GX * 2 + 10 * S;
const BOTTOM = GY + 10 * S;
const MODES = ["mark", "walk"] as const;
const KEY_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: 10,
  ArrowUp: -10,
};

type Drag = { v: number; over: number[] };

const centre = (v: number): [number, number] => [
  GX + ((v - 1) % 10) * S + S / 2,
  GY + Math.floor((v - 1) / 10) * S + S / 2,
];
const squareAt = (x: number, y: number): number | null => {
  const [c, r] = [Math.floor((x - GX) / S), Math.floor((y - GY) / S)];
  return c >= 0 && c < 10 && r >= 0 && r < 10 ? r * 10 + c + 1 : null;
};

// Each jump an arrow from square to square, kept to its left-hand side so it runs beside the numbers, not over them:
// a +1 above them, a −1 below, a +10 to the right, a −10 to the left, and a jump there and back two arrows.
function Arrow({ a, b, faint }: { a: number; b: number; faint?: boolean }) {
  const [[x0, y0], [x1, y1]] = [centre(a), centre(b)];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const [ux, uy] = [(x1 - x0) / len, (y1 - y0) / len];
  const [nx, ny] = [uy, -ux];
  const side = 12;
  const bend = side + Math.min(14, len * 0.2);
  const up = b > a;
  return (
    <path
      d={`M${x0 + ux * 6 + nx * side},${y0 + uy * 6 + ny * side} Q${(x0 + x1) / 2 + nx * bend},${(y0 + y1) / 2 + ny * bend} ${x1 - ux * 8 + nx * side},${y1 - uy * 8 + ny * side}`}
      fill="none"
      stroke={up ? GREEN : RED}
      strokeWidth={2.5}
      opacity={faint ? 0.45 : 1}
      markerEnd={`url(#hundred-${up ? "up" : "down"})`}
    />
  );
}

export function Hundred({
  state,
  set,
  w: words,
  svgRef,
}: PieceProps<"hundred">) {
  const w = words.hundred;
  const walk = !!state.walk;
  const marked = new Set(state.marked);
  // The walk: a start and the jumps from it. Replay draws it again a jump at a time.
  const [shown, setShown] = useState<number | null>(null);
  const [cursor, setCursor] = useState(1);
  const [focused, setFocused] = useState(false);
  const steps = state.steps ?? [];
  const start = walk ? (state.start ?? null) : null;
  const path = start === null ? [] : hundredPath(start, steps);
  const at = path.at(-1) ?? null;
  const upTo = shown ?? steps.length;
  const visited = new Set(path.slice(0, upTo + 1));
  const sum = start === null ? null : hundredSum(start, steps);
  useEffect(() => {
    if (shown === null) return;
    const t = setTimeout(
      () => setShown(shown < steps.length ? shown + 1 : null),
      shown < steps.length ? 450 : 900,
    );
    return () => clearTimeout(t);
  }, [shown, steps.length]);

  const walkTo = (next: Partial<LiveStates["hundred"]>) => (
    setShown(null),
    set({ ...state, ...next })
  );
  const jumpTo = (v: number) =>
    at !== null && v !== at && walkTo({ steps: [...steps, ...jumpsTo(at, v)] });
  const back = () => {
    if (steps.length) walkTo({ steps: steps.slice(0, -1) });
  };
  const toggle = (v: number) =>
    set({
      ...state,
      marked: marked.has(v)
        ? state.marked.filter((m) => m !== v)
        : [...state.marked, v],
    });
  // In a walk a tap on the last square takes a jump back, a tap one jump away goes there, and a tap further off
  // starts a new walk there; a drag always jumps.
  const tapWalk = (v: number) => {
    if (at === null) return walkTo({ start: v, steps: [] });
    if (v === at)
      return steps.length ? back() : walkTo({ start: null, steps: [] });
    if (HUNDRED_STEPS.some((d) => at + d === v)) return jumpTo(v);
    walkTo({ start: v, steps: [] });
  };

  const { drag, begin, svgProps } = useDrag<Drag>(
    (d) => {
      const end = squareAt(d.x, d.y);
      if (!d.moved) return walk ? tapWalk(d.v) : toggle(d.v);
      if (!walk)
        return set({ ...state, marked: paintMarks(state.marked, d.v, d.over) });
      if (end === null) return;
      if (at === null || d.v !== at)
        walkTo({ start: d.v, steps: jumpsTo(d.v, end) });
      else jumpTo(end);
    },
    // `over` is one array for the whole drag (each move copies the drag but not it), so the squares passed collect in it.
    (d) => {
      const v = squareAt(d.x, d.y);
      if (v !== null && !d.over.includes(v)) d.over.push(v);
    },
  );
  const held = drag?.moved ? drag : null;
  const heldEnd = held ? squareAt(held.x, held.y) : null;
  // While a walk drag is held: the jumps it would make, drawn faint.
  const preview =
    walk && held && heldEnd !== null
      ? hundredPath(held.v, jumpsTo(held.v, heldEnd))
      : [];
  const painting = !walk && held ? held.over : [];
  const paintOn = !walk && held ? !marked.has(held.v) : false;

  const onKey = (e: KeyboardEvent) => {
    const step = KEY_STEP[e.key];
    if (step !== undefined) {
      e.preventDefault();
      if (walk && at !== null) {
        if (hundredJump(at, step) !== null) jumpTo(at + step);
      } else setCursor((c) => hundredJump(c, step) ?? c);
      return;
    }
    if (walk && (e.key === "Backspace" || e.key === "Delete"))
      return (e.preventDefault(), back());
    keyTap(e, () => (walk ? tapWalk(at ?? cursor) : toggle(cursor)));
  };

  const lines = sum
    ? wrapWords(sum.long.replace(/([+−=]) /g, "$1\u00a0"), 34)
    : [];
  const binY = BOTTOM + 10;
  const H = binY + Math.max(62, sum ? 34 + lines.length * 22 : 0) + 8;
  const showCursor = focused && !(walk && at !== null);
  return (
    <>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="hand-pic"
        fontFamily={FONT}
        {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <defs>
          {[
            ["up", GREEN],
            ["down", RED],
          ].map(([id, c]) => (
            <marker
              key={id}
              id={`hundred-${id}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0,0L10,5L0,10z" fill={c} />
            </marker>
          ))}
        </defs>
        <rect width={W} height={H} fill="#fff" />
        <Tabs
          x={GX}
          y={8}
          keys={MODES}
          on={walk ? "walk" : "mark"}
          names={{ mark: w.mark, walk: w.jumps }}
          onPick={(m) => walkTo({ walk: m === "walk" })}
        />
        {!walk && (
          <>
            <text x={W - 96} y={31} fontSize={14} textAnchor="end" fill={INK}>
              {w.multiples}
            </text>
            <NumBox
              x={W - 90}
              y={6}
              w={86}
              h={36}
              size={18}
              value={state.n}
              min={2}
              max={12}
              label={w.multiples}
              onChange={(n) => set({ ...state, n, marked: multiplesOf(n) })}
            />
          </>
        )}
        <g
          role="group"
          tabIndex={0}
          aria-label={
            walk
              ? fill(w.gridWalk, { v: at ?? cursor })
              : fill(w.gridMark, { v: cursor })
          }
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {Array.from({ length: 100 }, (_, i) => {
            const v = i + 1;
            const [x, y] = [GX + (i % 10) * S, GY + Math.floor(i / 10) * S];
            const on = painting.includes(v) ? paintOn : marked.has(v);
            const lit = !walk && on;
            const label = walk ? `${v}` : `${v}${marked.has(v) ? ` ✓` : ""}`;
            return (
              <g
                key={v}
                role="button"
                aria-label={label}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => begin(e, { v, over: [v] })}
              >
                <rect
                  x={x}
                  y={y}
                  width={S}
                  height={S}
                  fill={
                    visited.has(v)
                      ? "#d0ebff"
                      : lit || (walk && marked.has(v))
                        ? "#ffec99"
                        : "#fff"
                  }
                  stroke={INK}
                  strokeWidth={1.2}
                />
                <text
                  x={x + S / 2}
                  y={y + S / 2 + 6}
                  fontSize={16}
                  textAnchor="middle"
                  fill={INK}
                  pointerEvents="none"
                  fontWeight={lit || visited.has(v) ? 700 : 400}
                >
                  {v}
                </text>
              </g>
            );
          })}
        </g>
        <g pointerEvents="none">
          {path.slice(1, upTo + 1).map((b, i) => (
            <Arrow key={i} a={path[i]} b={b} />
          ))}
          {preview.slice(1).map((b, i) => (
            <Arrow key={`p${i}`} a={preview[i]} b={b} faint />
          ))}
          {start !== null && (
            <circle
              cx={centre(start)[0]}
              cy={centre(start)[1]}
              r={16}
              fill="none"
              stroke={INK}
              strokeWidth={2.5}
            />
          )}
          {path.length > 1 && (
            <circle
              cx={centre(path[upTo])[0]}
              cy={centre(path[upTo])[1]}
              r={16}
              fill="none"
              stroke={BLUE}
              strokeWidth={3}
            />
          )}
          {showCursor && (
            <rect
              x={centre(cursor)[0] - S / 2 + 2}
              y={centre(cursor)[1] - S / 2 + 2}
              width={S - 4}
              height={S - 4}
              fill="none"
              stroke={BLUE}
              strokeWidth={2.5}
              strokeDasharray="5 3"
            />
          )}
        </g>
        {!walk && (
          <text
            x={(W - 76) / 2}
            y={binY + 36}
            fontSize={18}
            textAnchor="middle"
            fill={INK}
          >
            {fill(w.marked, { n: state.marked.length })}
          </text>
        )}
        {sum && (
          <g
            role="button"
            tabIndex={0}
            aria-label={w.replay}
            style={{ cursor: "pointer" }}
            onClick={() => setShown(0)}
            onKeyDown={(e) => keyTap(e, () => setShown(0))}
          >
            <title>{w.replay}</title>
            <rect
              x={0}
              y={binY}
              width={W - 80}
              height={34 + lines.length * 22}
              fill="transparent"
            />
            <text
              x={(W - 76) / 2}
              y={binY + 24}
              fontSize={22}
              fontWeight={700}
              textAnchor="middle"
              fill={INK}
            >
              ▶ {sum.short}
            </text>
            {lines.map((l, i) => (
              <text
                key={i}
                x={(W - 76) / 2}
                y={binY + 48 + i * 22}
                fontSize={15}
                textAnchor="middle"
                fill="#495057"
              >
                {l}
              </text>
            ))}
          </g>
        )}
        <Bin
          x={W - 72}
          y={binY}
          w={68}
          h={62}
          hot={false}
          label={w.bin}
          title={walk ? w.binWalk : w.binMark}
          onTap={() =>
            walk
              ? walkTo({ start: null, steps: [] })
              : set({ ...state, marked: [] })
          }
        />
      </svg>
      <p className="live-hint">{walk ? w.walkHint : w.markHint}</p>
    </>
  );
}
