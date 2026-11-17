// Linking cubes on the board: trains of coloured cubes. Tap a cube to paint it, drag a train onto another to join it
// on, tap a dot between two cubes to break the train there, + and − at a train's end to add or take off a cube.
// "Share into trains of k" lays every cube out again in trains of k, to see a division and what is left over. The
// words under the trains come from src/math/cubes.ts. "Copy as a picture" copies the trains without the controls.
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  addCube, breakAt, CUBE_COLORS, join, joinAll, K_RANGE, MAX_LEN, MAX_TRAINS, newTrain, paint, removeCube, says,
  shareInto, sortByLength, type CubeSay, type LiveCubes,
} from "../math/cubes";
import { fill, FONT, INK, Stepper, svgPoint, Toggle, type PieceProps } from "./ui";

const W = 700;
const PAD = 16;
const LABEL = 36;
const S = 27;
const ROW = 40;
const TOP = 14;
const LINE = 28;
const COLORS = [
  { fill: "#ff8787", stroke: "#c92a2a" },
  { fill: "#74c0fc", stroke: "#1864ab" },
  { fill: "#ffd43b", stroke: "#e67700" },
  { fill: "#8ce99a", stroke: "#2b8a3e" },
  { fill: "#b197fc", stroke: "#5f3dc4" },
  { fill: "#ffa94d", stroke: "#d9480f" },
];
const rowY = (t: number) => TOP + t * ROW + 6;
const cubeX = (i: number) => PAD + LABEL + i * S;

type Drag = { t: number; x0: number; y0: number; dx: number; dy: number; moved: boolean; cube: number };
type Words = PieceProps<"cubes">["w"]["cubes"];

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

/** The trains and the words; with `on` set, the controls and what a tap or drag does too. */
function Picture({ state, lines, on, drag, svgRef, height }: {
  state: LiveCubes;
  lines: string[];
  height: number;
  svgRef?: React.Ref<SVGSVGElement>;
  drag?: Drag | null;
  on?: {
    w: Words;
    press: (e: ReactPointerEvent, t: number, cube: number) => void;
    move: (e: ReactPointerEvent<SVGSVGElement>) => void;
    up: (e: ReactPointerEvent<SVGSVGElement>) => void;
    add: (t: number) => void;
    remove: (t: number) => void;
    cut: (t: number, at: number) => void;
    target: number | null;
  };
}) {
  const { trains, numbers } = state;
  // The words right under the last train; the picture keeps room for all ten, so the piece doesn't change size.
  const capY = TOP + Math.max(1, trains.length) * ROW + 26;
  return (
    <svg ref={svgRef} width={W} height={height} viewBox={`0 0 ${W} ${height}`} fontFamily={FONT}
      onPointerMove={on?.move} onPointerUp={on?.up} onPointerCancel={on?.up} style={on ? { touchAction: "none" } : undefined}>
      {trains.map((train, t) => {
        const y = rowY(t);
        const dragging = drag?.moved && drag.t === t;
        const end = cubeX(train.length);
        return (
          <g key={t}>
            {on?.target === t && <rect x={PAD + LABEL - 4} y={y - 8} width={W - 2 * PAD - LABEL + 4} height={S + 12} rx={6} fill="#e7f5ff" />}
            <text x={PAD + LABEL / 2 - 4} y={y + S / 2 + 6} fontSize={17} textAnchor="middle" fill="#495057" fontWeight={700}>{train.length}</text>
            <g transform={dragging ? `translate(${drag.dx} ${drag.dy})` : undefined} opacity={dragging ? 0.8 : 1}>
              {train.map((c, i) => (
                <g key={i} style={on ? { cursor: "grab" } : undefined} onPointerDown={on && ((e) => on.press(e, t, i))}>
                  <Cube x={cubeX(i)} y={y} color={c} n={numbers ? i + 1 : undefined} />
                </g>
              ))}
            </g>
            {on && !dragging && (
              <>
                {train.slice(1).map((_, i) => (
                  <circle key={i} cx={cubeX(i + 1)} cy={y + S + 4} r={4.5} fill="#ced4da" style={{ cursor: "pointer" }} onClick={() => on.cut(t, i + 1)}>
                    <title>{on.w.cut}</title>
                  </circle>
                ))}
                {train.length < MAX_LEN && (
                  <g style={{ cursor: "pointer" }} onClick={() => on.add(t)} role="button" aria-label={on.w.add}>
                    <rect x={end + 4} y={y} width={S - 2} height={S - 2} rx={4} fill="#fff" stroke="#adb5bd" strokeDasharray="4 3" />
                    <text x={end + 4 + (S - 2) / 2} y={y + S / 2 + 5} fontSize={18} textAnchor="middle" fill="#868e96">+</text>
                  </g>
                )}
                <g style={{ cursor: "pointer" }} onClick={() => on.remove(t)} role="button" aria-label={on.w.remove}>
                  <circle cx={end + (train.length < MAX_LEN ? S + 18 : 18)} cy={y + S / 2 - 1} r={10} fill="#fff" stroke="#adb5bd" />
                  <text x={end + (train.length < MAX_LEN ? S + 18 : 18)} y={y + S / 2 + 4} fontSize={16} textAnchor="middle" fill="#868e96">−</text>
                </g>
              </>
            )}
          </g>
        );
      })}
      {lines.map((l, i) => (
        <text key={i} x={PAD} y={capY + i * LINE} fontSize={l.length > 64 ? (19 * 64) / l.length : 19} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </svg>
  );
}

export function Cubes({ state, set, w: words, svgRef }: PieceProps<"cubes">) {
  const w = words.cubes;
  const { trains, color, k } = state;
  const [drag, setDrag] = useState<Drag | null>(null);
  const lines = says(trains).map((s) => sayLine(s, w));
  const put = (next: number[][]) => set({ ...state, trains: next });
  const rowAt = (y: number) => {
    const t = Math.floor((y - TOP) / ROW);
    return t >= 0 && t < trains.length ? t : null;
  };
  const target = drag?.moved ? rowAt(rowY(drag.t) + S / 2 + drag.dy) : null;

  const press = (e: ReactPointerEvent, t: number, cube: number) => {
    if (e.button !== 0) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const [x, y] = svgPoint(svg, e);
    setDrag({ t, cube, x0: x, y0: y, dx: 0, dy: 0, moved: false });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const [dx, dy] = [x - drag.x0, y - drag.y0];
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > 5 });
  };
  const up = () => {
    if (!drag) return;
    setDrag(null);
    if (!drag.moved) return trains[drag.t][drag.cube] !== color && put(paint(trains, drag.t, drag.cube, color));
    if (target !== null && target !== drag.t) put(join(trains, drag.t, target));
  };

  const pictureH = TOP + MAX_TRAINS * ROW + 26 + lines.length * LINE;
  const cleanH = TOP + Math.max(1, trains.length) * ROW + 26 + lines.length * LINE;
  return (
    <>
      <div className="live-bar">
        {Array.from({ length: CUBE_COLORS }, (_, c) => (
          <button key={c} className={`live-btn cube-swatch${c === color ? " on" : ""}`} aria-pressed={c === color} title={w.colour} aria-label={`${w.colour} ${c + 1}`}
            style={{ background: COLORS[c].fill, borderColor: c === color ? INK : COLORS[c].stroke }} onClick={() => set({ ...state, color: c })} />
        ))}
        <button className="live-btn" disabled={trains.length >= MAX_TRAINS} onClick={() => put(newTrain(trains, color))}>{w.newTrain}</button>
        <Toggle on={state.numbers} onClick={() => set({ ...state, numbers: !state.numbers })}>{w.numbers}</Toggle>
      </div>
      <div className="live-bar">
        <span>{w.shareInto}</span>
        <Stepper value={k} min={K_RANGE[0]} max={K_RANGE[1]} onChange={(v) => set({ ...state, k: v })} less={w.less} more={w.more} />
        <button className="live-btn" disabled={shareInto(trains, k) === trains} onClick={() => put(shareInto(trains, k))}>{w.share}</button>
        <button className="live-btn" disabled={joinAll(trains) === trains} onClick={() => put(joinAll(trains))}>{w.joinAll}</button>
        <button className="live-btn" disabled={trains.length < 2} onClick={() => put(sortByLength(trains))}>{w.sort}</button>
        <button className="live-btn" onClick={() => put([])}>{w.clear}</button>
      </div>
      <p className="live-hint">{w.hint}</p>
      <Picture
        state={state}
        lines={lines}
        height={pictureH}
        drag={drag}
        on={{
          w, press, move, up, target,
          add: (t) => put(addCube(trains, t, color)),
          remove: (t) => put(removeCube(trains, t)),
          cut: (t, at) => put(breakAt(trains, t, at)),
        }}
      />
      <div hidden>
        <Picture state={state} lines={lines} height={cleanH} svgRef={svgRef} />
      </div>
    </>
  );
}
