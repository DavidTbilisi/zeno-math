// A ten frame (or two) worked by hand: red and yellow two-coloured counters are dragged out of their trays onto the
// squares (or a tray tapped to fill the next square), a counter tapped turns over, dragged to another square moves
// (or swaps), and dragged off the frames or into the bin goes. The pills above pick one frame or two; the sum of the
// two colours is written underneath. Keys: Enter on a square goes empty → red → yellow → empty.
import { type PointerEvent as ReactPointerEvent } from "react";
import { counters, firstEmpty, flipCounter, moveCounter } from "../math/live";
import { Bin, BLUE, keyTap, Pill, useDrag } from "./hand";
import { usePops } from "./pops";
import { fill, FONT, INK, type PieceProps } from "./ui";

const S = 52;
const R = 19;
const FX = 92;
const FY = 48;
const GAP = 18;
const W = FX + 5 * S + 14;
const COLOR = ["", "#ff8787", "#ffd43b"];
const TRAYS = [
  { c: 1, y: FY + 6 },
  { c: 2, y: FY + 64 },
];

type Drag = { from: "tray"; c: number } | { from: "cell"; i: number };

const cellXY = (i: number) => {
  const f = Math.floor(i / 10);
  return {
    x: FX + (i % 5) * S,
    y: FY + f * (2 * S + GAP) + Math.floor((i % 10) / 5) * S,
  };
};

function Counter({
  x,
  y,
  c,
  ring,
}: {
  x: number;
  y: number;
  c: number;
  ring?: boolean;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={R}
      fill={COLOR[c]}
      stroke={ring ? BLUE : INK}
      strokeWidth={ring ? 3 : 2}
    />
  );
}

export function TenFrame({
  state,
  set,
  w: words,
  svgRef,
}: PieceProps<"tenFrame">) {
  const w = words.tenFrame;
  const frames = state.double ? 2 : 1;
  const n = 10 * frames;
  const cells = state.cells.slice(0, n);
  const { a, b, n: total } = counters(cells);
  const [ghosts, pop] = usePops<{ x: number; y: number; c: number }>();
  const framesBottom = FY + frames * 2 * S + (frames - 1) * GAP;
  const bin = { x: 12, y: Math.max(framesBottom, FY + 190) - 66, w: 68, h: 66 };
  const height = Math.max(framesBottom, bin.y + bin.h) + 54;

  const put = (next: number[]) => set({ ...state, cells: next });
  const cellAt = (x: number, y: number): number | null => {
    for (let i = 0; i < n; i++) {
      const p = cellXY(i);
      if (x >= p.x && x <= p.x + S && y >= p.y && y <= p.y + S) return i;
    }
    return null;
  };
  const fillNext = (c: number) => {
    const i = firstEmpty(state.cells, frames);
    if (i !== null) put(state.cells.map((v, j) => (j === i ? c : v)));
  };
  const take = (i: number) => {
    const p = cellXY(i);
    pop([{ x: p.x + S / 2, y: p.y + S / 2, c: state.cells[i] }]);
    put(moveCounter(state.cells, i, null));
  };

  const { drag, begin, svgProps } = useDrag<Drag>((d) => {
    const at = d.moved ? cellAt(d.x, d.y) : null;
    if (d.from === "tray") {
      if (!d.moved) return fillNext(d.c);
      if (at !== null && !state.cells[at])
        put(state.cells.map((v, j) => (j === at ? d.c : v)));
      return;
    }
    if (!d.moved)
      return put(state.cells.map((v, j) => (j === d.i ? flipCounter(v) : v)));
    if (at === d.i) return;
    if (at === null) return take(d.i);
    put(moveCounter(state.cells, d.i, at));
  });
  const press = (e: ReactPointerEvent, d: Drag) => begin(e, d);
  const held = drag?.moved ? drag : null;
  const over = held ? cellAt(held.x, held.y) : null;
  const heldColor = held
    ? held.from === "tray"
      ? held.c
      : state.cells[held.i]
    : 0;
  const offFrames = held?.from === "cell" && over === null;
  const name = (c: number) => (c === 1 ? w.red : c === 2 ? w.yellow : w.empty);

  return (
    <>
      <svg
        ref={svgRef}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        className="hand-pic"
        fontFamily={FONT}
        role="group"
        aria-label={fill(w.sum, { a, b, n: total })}
        {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <rect width={W} height={height} fill="#fff" />
        <Pill
          x={FX}
          y={8}
          w={110}
          h={28}
          size={14}
          text={w.one}
          on={!state.double}
          onTap={() => set({ ...state, double: false })}
        />
        <Pill
          x={FX + 116}
          y={8}
          w={110}
          h={28}
          size={14}
          text={w.twenty}
          on={state.double}
          onTap={() => set({ ...state, double: true })}
        />
        {TRAYS.map(({ c, y }) => {
          const label = c === 1 ? w.redTray : w.yellowTray;
          return (
            <g
              key={c}
              role="button"
              tabIndex={0}
              aria-label={label}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => press(e, { from: "tray", c })}
              onKeyDown={(e) => keyTap(e, () => fillNext(c))}
            >
              <title>{label}</title>
              <rect
                x={14}
                y={y - 4}
                width={64}
                height={52}
                fill="transparent"
              />
              {[6, 3, 0].map((k) => (
                <Counter key={k} x={46 + k} y={y + 22 + k} c={c} />
              ))}
            </g>
          );
        })}
        {cells.map((c, i) => {
          const p = cellXY(i);
          const lifted = held?.from === "cell" && held.i === i;
          const label = fill(w.square, { n: i + 1, c: name(c) });
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={label}
              style={{ cursor: c ? "grab" : "default" }}
              onPointerDown={(e) => c && press(e, { from: "cell", i })}
              onKeyDown={(e) =>
                keyTap(e, () =>
                  put(state.cells.map((v, j) => (j === i ? (v + 1) % 3 : v))),
                )
              }
            >
              <rect
                x={p.x}
                y={p.y}
                width={S}
                height={S}
                fill={over === i ? "#e7f5ff" : "#fff"}
                stroke={INK}
                strokeWidth={2.5}
              />
              {c > 0 && (
                <g opacity={lifted ? 0.25 : 1}>
                  <Counter x={p.x + S / 2} y={p.y + S / 2} c={c} />
                </g>
              )}
            </g>
          );
        })}
        <Bin
          x={bin.x}
          y={bin.y}
          w={bin.w}
          h={bin.h}
          hot={offFrames}
          label={w.bin}
          title={w.binTitle}
          onTap={() => {
            pop(
              cells
                .flatMap((c, i) => (c ? [{ ...cellXY(i), c }] : []))
                .map((g) => ({ ...g, x: g.x + S / 2, y: g.y + S / 2 })),
            );
            put(Array(20).fill(0));
          }}
        />
        {ghosts?.items.map((g, i) => (
          <g key={`${ghosts.id}-${i}`} className="chip-pop">
            <Counter x={g.x} y={g.y} c={g.c} />
          </g>
        ))}
        {held && heldColor > 0 && (
          <g pointerEvents="none" opacity={0.95}>
            <Counter x={held.x} y={held.y} c={heldColor} ring={over !== null} />
          </g>
        )}
        <text
          x={FX + 2.5 * S}
          y={height - 16}
          fontSize={30}
          textAnchor="middle"
          fill={INK}
        >
          {b ? `${a} + ${b} = ${total}` : total}
        </text>
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
