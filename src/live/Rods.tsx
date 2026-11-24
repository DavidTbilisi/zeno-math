// Number rods on the board, worked by hand: a rod for each number from 1 to 10, its length the number and its colour
// always the same. A rod is dragged from the tray on the left into a row (it goes in where it is let go, so rods can
// be put between others) or below the rows to start a new one; a rod in a row is dragged to another place, another
// row, or back to the tray or the bin to take it off. A tap on a tray rod lays it at the end of the last row. A row
// shorter than the longest shows its gap as a dashed space: which rod fits? The words under the mat read rows of the
// same length as equal sums and ask about the first gap; they come from src/math/rods.ts. Keys on a rod: the arrows
// move it along its row or to the row above or below, Delete takes it off. "Copy as a picture" copies the rows.
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  addRod, gaps, MAX_ROWS, MAX_SUM, moveRod, newRow, putRod, ROD_MAX, rowSum, says, slotAt, type LiveRods, type RodSay,
} from "../math/rods";
import { Bin, BLUE, inBox, keyTap, Pill, useDrag, type DragAt } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const U = 25;
const RH = 26;
const ROW = 34;
const LINE = 28;
const TOP = 48;
/** The tray: a small rod for each number, its number beside it. */
const TRAY = { x: 14, y: TOP + 2, u: 9, h: 21, step: 27, num: 20 };
const BIN = { x: 14, y: TRAY.y + ROD_MAX * TRAY.step + 4, w: 112, h: 62 };
const MAT = { x: 140, y: TOP - 4, w: W - 140 - 12, h: MAX_ROWS * ROW + 4 };
/** Where the rods of a row start: after the row's length. */
const RX = MAT.x + 36;
/** The rods' colours, 1 to 10: white, red, light green, purple, yellow, dark green, black, brown, blue, orange. */
const COLORS = [
  { fill: "#f8f9fa", stroke: "#868e96", ink: INK },
  { fill: "#ff8787", stroke: "#c92a2a", ink: INK },
  { fill: "#b2f2bb", stroke: "#2f9e44", ink: INK },
  { fill: "#da77f2", stroke: "#862e9c", ink: INK },
  { fill: "#ffe066", stroke: "#e67700", ink: INK },
  { fill: "#37b24d", stroke: "#2b8a3e", ink: "#fff" },
  { fill: "#495057", stroke: "#212529", ink: "#fff" },
  { fill: "#a0704c", stroke: "#6b4226", ink: "#fff" },
  { fill: "#4c6ef5", stroke: "#364fc7", ink: "#fff" },
  { fill: "#ff922b", stroke: "#d9480f", ink: INK },
];
const rowY = (t: number) => TOP + t * ROW;
const trayY = (n: number) => TRAY.y + (n - 1) * TRAY.step;
/** Where rod `i` of a row starts, in units. */
const startOf = (row: number[], i: number) => rowSum(row.slice(0, i));

type Hold = { from: "tray"; n: number } | { from: "row"; t: number; i: number };
type Spot = { to: "row"; t: number; at: number } | { to: "new" } | { to: "off" } | null;
type Words = PieceProps<"rods">["w"]["rods"];

const plus = (parts: number[]) => parts.join(" + ");
function sayLine(s: RodSay, w: Words): string {
  switch (s.kind) {
    case "empty": return w.says.empty;
    case "one": return fill(w.says.one, { n: s.n });
    case "sum": return `${plus(s.parts)} = ${s.n}`;
    case "same": return [s.n, ...(s.ways.length ? s.ways.map(plus) : [s.n])].join(" = ");
    case "gap": return `${plus(s.parts)} + ? = ${s.n}`;
  }
}

/** A rod `n` long with its top left corner at (x, y), `u` to a unit. */
function Rod({ x, y, n, u = U, h = RH, number }: { x: number; y: number; n: number; u?: number; h?: number; number?: boolean }) {
  const c = COLORS[n - 1];
  return (
    <>
      <rect x={x + 0.75} y={y} width={n * u - 1.5} height={h} rx={4} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
      {number && <text x={x + (n * u) / 2} y={y + h / 2 + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={c.ink} pointerEvents="none">{n}</text>}
    </>
  );
}

/** The rows and the words under them, as "Copy as a picture" takes them. */
function Rows({ state, lines, w, lifted, spot, begin, onKey }: {
  state: LiveRods; lines: string[]; w: Words; lifted?: { t: number; i: number } | null; spot?: Spot;
  begin?: (e: ReactPointerEvent, h: Hold) => void; onKey?: (e: KeyboardEvent, t: number, i: number) => void;
}) {
  const { rows, numbers } = state;
  const gap = gaps(rows);
  const capY = rowY(begin ? MAX_ROWS : Math.max(1, rows.length)) + 26;
  return (
    <>
      {rows.map((row, t) => {
        const y = rowY(t);
        const end = RX + rowSum(row) * U;
        return (
          <g key={t}>
            {spot?.to === "row" && spot.t === t && <rect x={MAT.x + 2} y={y - 4} width={MAT.w - 4} height={RH + 8} rx={6} fill="#e7f5ff" />}
            {numbers && <text x={RX - 10} y={y + RH / 2 + 6} fontSize={17} textAnchor="end" fill="#495057" fontWeight={700}>{rowSum(row)}</text>}
            {gap[t] > 0 && (
              <g data-gap={t}>
                <rect x={end + 2} y={y + 1} width={gap[t] * U - 4} height={RH - 2} rx={4} fill="none" stroke="#adb5bd" strokeDasharray="5 4" />
                {numbers && <text x={end + (gap[t] * U) / 2} y={y + RH / 2 + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill="#adb5bd">?</text>}
              </g>
            )}
            {row.map((n, i) => {
              const up = lifted && lifted.t === t && lifted.i === i;
              return (
                <g key={i} data-rod={`${t}-${i}`} role={begin ? "button" : undefined} tabIndex={begin ? 0 : undefined}
                  aria-label={begin ? fill(w.rodIn, { n, r: t + 1 }) : undefined} style={begin ? { cursor: "grab" } : undefined} opacity={up ? 0.25 : 1}
                  onPointerDown={begin && ((e) => begin(e, { from: "row", t, i }))} onKeyDown={onKey && ((e) => onKey(e, t, i))}>
                  <Rod x={RX + startOf(row, i) * U} y={y} n={n} number={numbers} />
                </g>
              );
            })}
          </g>
        );
      })}
      {lines.map((l, i) => (
        <text key={i} x={RX - 26} y={capY + i * LINE} fontSize={l.length > 44 ? (20 * 44) / l.length : 20} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </>
  );
}

export function Rods({ state, set, w: words, svgRef }: PieceProps<"rods">) {
  const w = words.rods;
  const { rows } = state;
  const lines = state.numbers ? says(rows).map((s) => sayLine(s, w)) : [];
  const put = (next: number[][]) => next !== rows && set({ ...state, rows: next });

  const lengthOf = (h: Hold) => (h.from === "tray" ? h.n : rows[h.t][h.i]);
  /** The held rod's left end: a tray rod is held by its middle, a row's rod where it was taken. */
  const heldX = (d: DragAt<Hold>) => (d.from === "tray" ? d.x - (d.n * U) / 2 : RX + startOf(rows[d.t], d.i) * U + d.x - d.x0);
  const heldY = (d: DragAt<Hold>) => (d.from === "tray" ? d.y - RH / 2 : rowY(d.t) + d.y - d.y0);
  const spotOf = (d: DragAt<Hold>): Spot => {
    if (inBox(BIN, d.x, d.y) || d.x < MAT.x) return d.from === "row" ? { to: "off" } : null;
    if (!inBox(MAT, d.x, d.y)) return null;
    const t = Math.floor((d.y - MAT.y) / ROW);
    const n = lengthOf(d);
    if (t >= rows.length) return rows.length < MAX_ROWS || (d.from === "row" && rows[d.t].length === 1) ? { to: "new" } : null;
    const row = d.from === "row" && d.t === t ? rows[t].filter((_, k) => k !== d.i) : rows[t];
    if (rowSum(row) + n > MAX_SUM) return null;
    return { to: "row", t, at: slotAt(row, (heldX(d) - RX) / U + n / 2) };
  };
  const { drag, begin, svgProps } = useDrag<Hold>((d) => {
    if (!d.moved) return d.from === "tray" ? put(addRod(rows, d.n)) : undefined;
    const s = spotOf(d);
    if (!s) return;
    if (d.from === "tray") return s.to === "row" ? put(putRod(rows, d.n, s.t, s.at)) : s.to === "new" ? put(newRow(rows, d.n)) : undefined;
    put(moveRod(rows, d.t, d.i, s.to === "row" ? { t: s.t, at: s.at } : s.to === "new" ? "new" : null));
  });
  const held = drag?.moved ? drag : null;
  const spot = held ? spotOf(held) : null;
  // Where the held rod would go in: a line at its place in the row.
  const caret = spot?.to === "row" && held
    ? startOf(held.from === "row" && held.t === spot.t ? rows[spot.t].filter((_, k) => k !== held.i) : rows[spot.t], spot.at)
    : null;

  const onKey = (e: KeyboardEvent, t: number, i: number) => {
    const to =
      e.key === "Delete" || e.key === "Backspace" ? null
      : e.key === "ArrowLeft" ? { t, at: i - 1 }
      : e.key === "ArrowRight" ? { t, at: i + 1 }
      : e.key === "ArrowUp" && t > 0 ? { t: t - 1, at: Infinity }
      : e.key === "ArrowDown" ? (t + 1 < rows.length ? { t: t + 1, at: Infinity } : "new" as const)
      : undefined;
    if (to === undefined) return;
    // The board around would take the key for a move or a delete of its own.
    e.preventDefault();
    e.stopPropagation();
    put(moveRod(rows, t, i, to));
  };

  const H = rowY(MAX_ROWS) + 26 + LINE + 16;
  const cleanBottom = rowY(Math.max(1, rows.length)) + 26 + Math.max(0, lines.length - 1) * LINE + 14;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <Pill x={MAT.x} y={8} w={96} h={28} size={14} text={w.numbers} on={state.numbers} onTap={() => set({ ...state, numbers: !state.numbers })} />
        {Array.from({ length: ROD_MAX }, (_, k) => k + 1).map((n) => (
          <g key={n} role="button" tabIndex={0} aria-label={fill(w.rod, { n })} style={{ cursor: "grab" }}
            onPointerDown={(e) => begin(e, { from: "tray", n })} onKeyDown={(e) => keyTap(e, () => put(addRod(rows, n)))}>
            <title>{w.tray}</title>
            <rect x={TRAY.x} y={trayY(n) - 3} width={BIN.w} height={TRAY.step} fill="transparent" />
            <text x={TRAY.x + TRAY.num - 4} y={trayY(n) + TRAY.h / 2 + 5} fontSize={14} fontWeight={700} textAnchor="end" fill="#495057">{n}</text>
            <Rod x={TRAY.x + TRAY.num} y={trayY(n)} n={n} u={TRAY.u} h={TRAY.h} />
          </g>
        ))}
        <Bin {...BIN} hot={spot?.to === "off"} label={w.bin} title={w.binTitle} onTap={() => put([])} />
        <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx={10} fill="none" stroke="#e9ecef" />
        {spot?.to === "new" && (
          <rect x={MAT.x + 2} y={rowY(rows.length) - 4} width={MAT.w - 4} height={RH + 8} rx={6} fill="none" stroke={BLUE} strokeDasharray="6 4" />
        )}
        <Rows state={state} lines={lines} w={w} lifted={held?.from === "row" ? held : null} spot={spot} begin={begin} onKey={onKey} />
        {!rows.length && !drag && <text x={RX} y={rowY(0) + RH / 2 + 5} fontSize={15} fill="#adb5bd">{w.dropHere}</text>}
        {caret !== null && spot?.to === "row" && (
          <line x1={RX + caret * U} y1={rowY(spot.t) - 5} x2={RX + caret * U} y2={rowY(spot.t) + RH + 5} stroke={BLUE} strokeWidth={3} strokeLinecap="round" pointerEvents="none" />
        )}
        {held && (
          <g pointerEvents="none" opacity={0.9}>
            <Rod x={heldX(held)} y={heldY(held)} n={lengthOf(held)} number={state.numbers} />
          </g>
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={MAT.w + 12} height={cleanBottom - TOP + 14} viewBox={`${MAT.x} ${TOP - 10} ${MAT.w + 12} ${cleanBottom - TOP + 14}`} fontFamily={FONT}>
          <rect x={MAT.x} y={TOP - 10} width={MAT.w + 12} height={cleanBottom - TOP + 14} fill="#fff" />
          <Rows state={state} lines={lines} w={w} />
        </svg>
      </div>
    </>
  );
}
