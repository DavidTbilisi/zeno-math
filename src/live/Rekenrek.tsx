// A rekenrek (counting rack) on the board, worked by hand: beads wait on the right of their rod and count once they
// are slid to the left. A bead dragged left pushes the beads on its left along with it, dragged back it pushes the
// ones on its right; a tap sends it (and those) across. The pills pick a rack of ten beads, twenty or a hundred, and
// whether the counts are written; "All back" slides every bead to the right. The die deals a sum, a + b or a − b:
// its two steps are ticked off by what the beads show, however the pupil gets there. Each row is also a slider for
// the keyboard. The rules are in src/math/rekenrek.ts; "Copy as a picture" copies the rack and its words.
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  BEADS, beadColor, cleared, dealt, RACK_ROWS, says, setRow, shownRows, slideBead, tapBead, taskAnswer, withBeads,
  withRows, type LiveRekenrek, type RackSay,
} from "../math/rekenrek";
import { BLUE, DieButton, GREEN, MUTED, Pill, Tabs, useDrag, type DragAt } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const D = 27;
const R = 12.5;
/** The two posts, and where the beads' room between them starts and ends. */
const POST = { l: 58, r: W - 28, w: 6 };
const XL = POST.l + POST.w + 2;
const XR = POST.r - 2;
const TASK_H = 82;
const LINE = 28;
const WOOD = "#6b4226";
const COLORS = [
  { fill: "#ff6b6b", stroke: "#c92a2a", shine: "#ffe3e3" },
  { fill: "#ffffff", stroke: "#868e96", shine: "#ced4da" },
];

type Words = PieceProps<"rekenrek">["w"]["rekenrek"];
type Hold = { row: number; i: number };

const leftX = (i: number) => XL + D / 2 + i * D;
const rightX = (i: number) => XR - (BEADS - i) * D + D / 2;
const restX = (i: number, left: number) => (i < left ? leftX(i) : rightX(i));
/** Rows of a small rack have room between them; the hundred rack packs them. */
const pitch = (rows: number) => (rows > 2 ? 31 : 46);

/** Where a held bead is: it follows the pointer between its two places on the rod. */
const heldX = (d: DragAt<Hold>, left: number) => Math.max(leftX(d.i), Math.min(rightX(d.i), restX(d.i, left) + d.x - d.x0));
/** A row's beads while one of them is held: the held one pushes the beads in its way, and no others. */
function rowXs(left: number, hold: { i: number; x: number } | null): number[] {
  return Array.from({ length: BEADS }, (_, j) => {
    const own = restX(j, left);
    if (!hold) return own;
    return j < hold.i ? Math.min(own, hold.x - (hold.i - j) * D) : j > hold.i ? Math.max(own, hold.x + (j - hold.i) * D) : hold.x;
  });
}

function sayLine(s: RackSay, w: Words): string {
  switch (s.kind) {
    case "empty": return w.says.empty;
    case "count": return fill(w.says.count, { n: s.n });
    case "fives": return fill(w.says.fives, { more: s.more, n: s.n });
    case "sum": return fill(w.says.sum, { parts: s.parts.join(" + "), n: s.n });
    case "tens": return fill(s.ones ? w.says.tens : w.says.tensOnly, { tens: s.tens, ones: s.ones, n: s.n });
    case "rest": return fill(w.says.rest, { n: s.n, rest: s.rest, cap: s.cap });
  }
}

function Bead({ c }: { c: 0 | 1 }) {
  const k = COLORS[c];
  return (
    <>
      <circle r={R} fill={k.fill} stroke={k.stroke} strokeWidth={1.8} />
      <path d={`M${-R * 0.55} ${-R * 0.2}A${R * 0.6} ${R * 0.6} 0 0 1 ${-R * 0.1} ${-R * 0.6}`} fill="none" stroke={k.shine} strokeWidth={2.2}
        strokeLinecap="round" pointerEvents="none" />
    </>
  );
}

/** The rack: its posts, rods and beads, with each row's count beside it. `begin` makes the beads ones to drag. */
function Rack({ state, y0, hold, w, begin, onKey }: {
  state: LiveRekenrek; y0: number; hold?: DragAt<Hold> | null; w: Words;
  begin?: (e: ReactPointerEvent, h: Hold) => void; onKey?: (e: KeyboardEvent, row: number) => void;
}) {
  const rows = shownRows(state);
  const P = pitch(state.rows);
  const rowY = (r: number) => y0 + 20 + r * P;
  const bottom = rowY(state.rows - 1) + 20;
  return (
    <>
      {rows.map((left, r) => {
        const held = hold && hold.row === r ? { i: hold.i, x: heldX(hold, left) } : null;
        const xs = rowXs(left, held);
        const y = rowY(r);
        return (
          <g key={r} role={begin ? "slider" : undefined} tabIndex={begin ? 0 : undefined} aria-label={begin ? fill(w.row, { r: r + 1 }) : undefined}
            aria-valuemin={begin ? 0 : undefined} aria-valuemax={begin ? BEADS : undefined} aria-valuenow={begin ? left : undefined}
            onKeyDown={onKey && ((e) => onKey(e, r))}>
            <line x1={POST.l} y1={y} x2={POST.r + POST.w} y2={y} stroke="#495057" strokeWidth={2} />
            {state.numbers && left > 0 && (
              <text x={POST.l - 10} y={y + 6} fontSize={18} fontWeight={700} textAnchor="end" fill={INK}>{left}</text>
            )}
            {xs.map((x, i) =>
              begin ? (
                <g key={i} data-bead={`${r}-${i}`} className={held ? undefined : "chip-move"} style={{ transform: `translate(${x}px, ${y}px)`, cursor: "grab" }}
                  onPointerDown={(e) => begin(e, { row: r, i })}>
                  <Bead c={beadColor(r, i)} />
                </g>
              ) : (
                <g key={i} transform={`translate(${x} ${y})`}><Bead c={beadColor(r, i)} /></g>
              ),
            )}
          </g>
        );
      })}
      <rect x={POST.l} y={y0} width={POST.w} height={bottom - y0} rx={2} fill={WOOD} />
      <rect x={POST.r} y={y0} width={POST.w} height={bottom - y0} rx={2} fill={WOOD} />
    </>
  );
}

export function Rekenrek({ state, set, w: words, svgRef }: PieceProps<"rekenrek">) {
  const w = words.rekenrek;
  const { task, stage } = state;
  const lines = state.numbers ? says(state).map((s) => sayLine(s, w)) : [];

  const { drag, begin, svgProps } = useDrag<Hold>((d) => {
    const left = state.left[d.row];
    const next = d.moved
      ? slideBead(state.left, d.row, d.i, heldX(d, left) < (leftX(d.i) + rightX(d.i)) / 2)
      : tapBead(state.left, d.row, d.i);
    if (next !== state.left) set(withBeads(state, next));
  });
  const onKey = (e: KeyboardEvent, row: number) => {
    const n = state.left[row];
    const to = { ArrowUp: n + 1, ArrowRight: n + 1, ArrowDown: n - 1, ArrowLeft: n - 1, Home: 0, End: BEADS }[e.key];
    if (to === undefined) return;
    // The board around would take an arrow for a move of its own.
    e.preventDefault();
    e.stopPropagation();
    const next = setRow(state.left, row, to);
    if (next !== state.left) set(withBeads(state, next));
  };

  const rackY = 50 + (task ? TASK_H : 0);
  const rackH = 40 + (state.rows - 1) * pitch(state.rows);
  const sayY = rackY + rackH + 34;
  const H = sayY + (state.numbers ? 2 * LINE : 0) - 8;
  const names = Object.fromEntries(RACK_ROWS.map((r) => [String(r), fill(w.beads, { n: r * BEADS })])) as Record<string, string>;
  const steps = task
    ? [fill(w.show, { a: task.a }), fill(task.op === "+" ? w.more : w.back, { b: task.b })]
    : [];
  const words2 = (
    <>
      {lines.map((l, i) => (
        <text key={i} x={W / 2} y={sayY + i * LINE} fontSize={i ? 18 : 22} textAnchor="middle" fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </>
  );
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <Tabs x={12} y={8} keys={RACK_ROWS.map(String)} on={String(state.rows)} names={names} onPick={(k) => set(withRows(state, Number(k)))} />
        <Pill x={330} y={8} w={96} h={28} size={14} text={w.numbers} on={state.numbers} onTap={() => set({ ...state, numbers: !state.numbers })} />
        <Pill x={434} y={8} w={110} h={28} size={14} text={w.allBack} title={w.allBackTitle} disabled={!state.left.some((n) => n > 0)}
          onTap={() => set(cleared(state))} />
        <DieButton x={W - 50} y={4} s={36} title={w.die} onTap={() => set(dealt(state))} />
        {task && (
          <g>
            <rect x={12} y={46} width={W - 24} height={TASK_H - 10} rx={12} fill={stage === 2 ? "#ebfbee" : "#f8f9fa"} stroke={stage === 2 ? GREEN : "#dee2e6"} />
            <text x={150} y={46 + 47} fontSize={32} fontWeight={700} textAnchor="middle" fill={INK}>
              {`${task.a} ${task.op} ${task.b} =`}
            </text>
            <rect x={228} y={46 + 12} width={64} height={48} rx={8} fill="#fff" stroke={stage === 2 ? GREEN : "#adb5bd"} strokeWidth={2} />
            <text x={260} y={46 + 46} fontSize={30} fontWeight={700} textAnchor="middle" fill={stage === 2 ? GREEN : MUTED} data-answer>
              {stage === 2 ? taskAnswer(task) : "?"}
            </text>
            {steps.map((s, i) => {
              const done = stage > i;
              const now = stage === i;
              return (
                <text key={i} x={320} y={46 + 30 + i * 26} fontSize={16} fill={done ? GREEN : now ? BLUE : MUTED} fontWeight={now ? 700 : 400}>
                  {`${done ? "✓" : i + 1 + "."} ${s}`}
                </text>
              );
            })}
            <Pill x={W - 24 - 34} y={46 + 8} w={30} h={26} size={14} text="✕" title={w.noSum} onTap={() => set({ ...state, task: null, stage: 0 })} />
          </g>
        )}
        <Rack state={state} y0={rackY} hold={drag} w={w} begin={begin} onKey={onKey} />
        {words2}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - rackY + 12} viewBox={`0 ${rackY - 6} ${W} ${H - rackY + 12}`} fontFamily={FONT}>
          <rect x={0} y={rackY - 6} width={W} height={H - rackY + 12} fill="#fff" />
          <Rack state={state} y0={rackY} w={w} />
          {words2}
        </svg>
      </div>
    </>
  );
}
