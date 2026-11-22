// Linking cubes on the board, worked by hand: cubes are dragged from the tray onto the end of a train, or below the
// trains to start a new one. A cube in a train lifts with every cube after it: dropped on another train it joins on
// at the end, dropped below the trains it becomes a train of its own (a break), dropped in the bin it is taken off.
// A tap on a tray cube picks the paint, a tap on a train's cube paints it. The number on the right shares every cube
// out into trains of that length; "Join all" and "Longest first" lay the trains out again. The words under the trains
// come from src/math/cubes.ts. "Copy as a picture" copies the trains without the tray and the tools.
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  addCube, CUBE_COLORS, joinAll, K_RANGE, MAX_LEN, MAX_TRAINS, moveTail, newTrain, paint, says, shareInto, sortByLength,
  type CubeSay, type LiveCubes,
} from "../math/cubes";
import { BLUE, Bin, inBox, keyTap, NumBox, Pill, useDrag, type DragAt } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PAD = 16;
const LABEL = 36;
const S = 27;
const ROW = 40;
const LINE = 28;
/** Where the first train is: under the tray and the tools. */
const TOP = 104;
const TRAY = { x: PAD, y: 12, step: 36 };
const BIN = { x: W - PAD - 96, y: 6, w: 96, h: 60 };
const TOOLS_Y = 62;
/** The number to share by: its words end just before it. */
const SHARE_X = 330;
/** The mat the trains lie on: every row a train could be in. */
const MAT = { x: PAD, y: TOP - 8, w: W - 2 * PAD, h: MAX_TRAINS * ROW };
const COLORS = [
  { fill: "#ff8787", stroke: "#c92a2a" },
  { fill: "#74c0fc", stroke: "#1864ab" },
  { fill: "#ffd43b", stroke: "#e67700" },
  { fill: "#8ce99a", stroke: "#2b8a3e" },
  { fill: "#b197fc", stroke: "#5f3dc4" },
  { fill: "#ffa94d", stroke: "#d9480f" },
];
const rowY = (t: number) => TOP + t * ROW;
const cubeX = (i: number) => PAD + LABEL + i * S;
const trayX = (c: number) => TRAY.x + c * TRAY.step;

type Hold = { from: "train"; t: number; i: number } | { from: "tray"; c: number };
type Words = PieceProps<"cubes">["w"]["cubes"];
/** Where a held cube would go if let go here. */
type Spot = { to: "train"; t: number } | { to: "new" } | { to: "bin" } | null;

function sayLine(s: CubeSay, w: Words): string {
  switch (s.kind) {
    case "empty": return w.says.empty;
    case "one": return fill(w.says.one, { n: s.n });
    case "parts": return fill(w.says.parts, { parts: s.parts.join(" + "), n: s.n });
    case "sum": return fill(w.says.sum, { lengths: s.lengths.join(" + "), n: s.n });
    case "equal": return fill(w.says.equal, { trains: s.trains, k: s.k, n: s.n });
    case "share": return fill(w.says.share, { trains: s.trains, k: s.k, left: s.left, n: s.n });
    case "compare": return fill(w.says.compare, { a: s.a, b: s.b, d: s.a - s.b });
    case "same": return fill(w.says.same, { a: s.a });
  }
}

/** One cube: a square with the nub that links it to the next on top. */
function Cube({ x, y, color, n }: { x: number; y: number; color: number; n?: number }) {
  const c = COLORS[color % COLORS.length];
  return (
    <>
      <rect x={x + 8} y={y - 4} width={S - 16} height={5} rx={1.5} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} />
      <rect x={x + 1} y={y} width={S - 2} height={S - 2} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={1.6} />
      <rect x={x + 6} y={y + 5} width={S - 12} height={S - 12} rx={2} fill="none" stroke={c.stroke} strokeOpacity={0.35} strokeWidth={1.2} />
      {n !== undefined && (
        <text x={x + S / 2} y={y + S / 2 + 4} fontSize={n >= 10 ? 10 : 12} textAnchor="middle" fill={INK} fontWeight={700} pointerEvents="none">{n}</text>
      )}
    </>
  );
}

/** The trains and the words under them, as "Copy as a picture" takes them. */
function Trains({ state, lines, hold, spot, begin }: {
  state: LiveCubes; lines: string[]; hold?: DragAt<Hold> | null; spot?: Spot; begin?: (e: ReactPointerEvent, h: Hold) => void;
}) {
  const { trains, numbers } = state;
  const capY = rowY(Math.max(1, trains.length)) + 22;
  const lifted = hold?.moved && hold.from === "train" ? hold : null;
  return (
    <>
      {trains.map((train, t) => {
        const y = rowY(t);
        return (
          <g key={t}>
            {spot?.to === "train" && spot.t === t && (
              <rect x={PAD + LABEL - 4} y={y - 8} width={W - 2 * PAD - LABEL + 4} height={S + 12} rx={6} fill="#e7f5ff" />
            )}
            <text x={PAD + LABEL / 2 - 4} y={y + S / 2 + 6} fontSize={17} textAnchor="middle" fill="#495057" fontWeight={700}>{train.length}</text>
            {train.map((c, i) => {
              const up = lifted && lifted.t === t && i >= lifted.i;
              return (
                <g key={i} data-cube={`${t}-${i}`} style={begin ? { cursor: "grab" } : undefined} opacity={up ? 0.25 : 1}
                  onPointerDown={begin && ((e) => begin(e, { from: "train", t, i }))}>
                  <Cube x={cubeX(i)} y={y} color={c} n={numbers ? i + 1 : undefined} />
                </g>
              );
            })}
          </g>
        );
      })}
      {spot?.to === "new" && (
        <rect x={PAD + LABEL - 4} y={rowY(trains.length) - 8} width={W - 2 * PAD - LABEL + 4} height={S + 12} rx={6} fill="none"
          stroke={BLUE} strokeDasharray="6 4" />
      )}
      {lines.map((l, i) => (
        <text key={i} x={PAD} y={capY + i * LINE} fontSize={l.length > 64 ? (19 * 64) / l.length : 19} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </>
  );
}

export function Cubes({ state, set, w: words, svgRef }: PieceProps<"cubes">) {
  const w = words.cubes;
  const { trains, color, k } = state;
  const lines = says(trains).map((s) => sayLine(s, w));
  const put = (next: number[][]) => next !== trains && set({ ...state, trains: next });

  const spotAt = (x: number, y: number): Spot => {
    if (inBox(BIN, x, y)) return { to: "bin" };
    if (!inBox(MAT, x, y)) return null;
    const t = Math.floor((y - MAT.y) / ROW);
    return t < trains.length ? { to: "train", t } : { to: "new" };
  };
  const dropOf = (d: DragAt<Hold>): Spot => {
    const s = spotAt(d.x, d.y);
    if (d.from === "tray") return s?.to === "bin" ? null : s;
    return s?.to === "train" && s.t === d.t ? null : s;
  };
  const { drag, begin, svgProps } = useDrag<Hold>((d) => {
    if (!d.moved) {
      if (d.from === "tray") return d.c !== color && set({ ...state, color: d.c });
      return trains[d.t][d.i] !== color && put(paint(trains, d.t, d.i, color));
    }
    const s = dropOf(d);
    if (!s) return;
    if (d.from === "tray") return put(s.to === "train" ? addCube(trains, s.t, d.c) : newTrain(trains, d.c));
    put(moveTail(trains, d.t, d.i, s.to === "train" ? s.t : s.to === "new" ? "new" : null));
  });
  const spot = drag?.moved ? dropOf(drag) : null;

  // What the hand holds, drawn under the pointer: the cubes lifted off a train, or one from the tray.
  const held = drag?.moved ? (drag.from === "tray" ? [drag.c] : trains[drag.t].slice(drag.i)) : [];
  const heldX = drag ? (drag.from === "tray" ? trayX(drag.c) : cubeX(drag.i)) + drag.x - drag.x0 : 0;
  const heldY = drag ? (drag.from === "tray" ? TRAY.y : rowY(drag.t)) + drag.y - drag.y0 : 0;

  const H = MAT.y + MAT.h + 22 + 2 * LINE;
  const cleanH = rowY(Math.max(1, trains.length)) + 22 + lines.length * LINE;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        {Array.from({ length: CUBE_COLORS }, (_, c) => (
          <g key={c} role="button" tabIndex={0} aria-label={`${w.colour} ${c + 1}`} aria-pressed={c === color} style={{ cursor: "grab" }}
            onPointerDown={(e) => begin(e, { from: "tray", c })} onKeyDown={(e) => keyTap(e, () => set({ ...state, color: c }))}>
            <title>{w.tray}</title>
            {c === color && <rect x={trayX(c) - 3} y={TRAY.y - 8} width={S + 6} height={S + 10} rx={6} fill="none" stroke={INK} strokeWidth={2} />}
            <Cube x={trayX(c)} y={TRAY.y} color={c} />
          </g>
        ))}
        <Pill x={PAD} y={TOOLS_Y} w={92} h={28} size={14} text={w.numbers} on={state.numbers} onTap={() => set({ ...state, numbers: !state.numbers })} />
        <text x={SHARE_X - 8} y={TOOLS_Y + 19} fontSize={13} textAnchor="end" fill={INK}>{w.shareInto}</text>
        <NumBox x={SHARE_X} y={TOOLS_Y - 4} w={44} h={36} size={18} value={k} min={K_RANGE[0]} max={Math.min(K_RANGE[1], MAX_LEN)}
          label={w.shareInto} onChange={(v) => set({ ...state, k: v })} />
        <Pill x={SHARE_X + 54} y={TOOLS_Y} w={90} h={28} size={14} text={w.share} strong
          disabled={shareInto(trains, k) === trains} onTap={() => put(shareInto(trains, k))} />
        <Pill x={BIN.x - 232} y={TRAY.y - 2} w={96} h={28} size={14} text={w.joinAll} disabled={joinAll(trains) === trains} onTap={() => put(joinAll(trains))} />
        <Pill x={BIN.x - 128} y={TRAY.y - 2} w={120} h={28} size={14} text={w.sort} disabled={trains.length < 2} onTap={() => put(sortByLength(trains))} />
        <Bin {...BIN} hot={spot?.to === "bin"} label={w.bin} title={w.binTitle} onTap={() => put([])} />
        <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx={10} fill="none" stroke="#f1f3f5" />
        <Trains state={state} lines={lines} hold={drag} spot={spot} begin={begin} />
        {!trains.length && !drag && (
          <text x={cubeX(0)} y={rowY(0) + S / 2 + 5} fontSize={15} fill="#adb5bd">{w.dropHere}</text>
        )}
        {held.length > 0 && (
          <g pointerEvents="none" opacity={0.85}>
            {held.map((c, j) => <Cube key={j} x={heldX + j * S} y={heldY} color={c} />)}
          </g>
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={cleanH - TOP + 20} viewBox={`0 ${TOP - 14} ${W} ${cleanH - TOP + 20}`} fontFamily={FONT}>
          <Trains state={state} lines={lines} />
        </svg>
      </div>
    </>
  );
}
