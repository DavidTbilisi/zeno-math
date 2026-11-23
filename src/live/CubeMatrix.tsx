// A 3×3 matrix on the board (#567), changed by hand: the tips of its three columns (green î, red ĵ, blue k̂) are
// dragged in the plane facing the viewer, snapping to whole numbers, and the unit cube shears with them. Its volume
// is |det M|: flattened, det M is 0; pushed through, the cube turns inside out (drawn red) as the sign flips. The
// matrix is also written as nine boxes to drag or key, and a dial runs from I to M. The stage turns by dragging it.
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  apply, between, column, CUBE_PRESETS, cubeImage, det3, detSays, detWorking, ENTRY, setColumn, setEntry, type LiveCubeMatrix,
} from "../math/cubeMatrix";
import { add, scale, type V3 } from "../math/solid";
import { BLUE, GREEN, NumBox, PillRows, pillRowsH, RED, Track, useDrag, type RowItem } from "./hand";
import { clamp, FlatFace, lay, PITCH_RANGE, projector, screenWays, wrap360 } from "./stage3d";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const COLS = [GREEN, RED, BLUE];
const HATS = ["î", "ĵ", "k̂"];
/** The stage: always the box from −3 to 3 each way, so the picture keeps still as the matrix changes. */
const PX = 40;
const REACH = 3;

type Hold =
  | { part: "turn"; yaw0: number; pitch0: number }
  | { part: "tip"; j: number; tip0: V3 };

export function CubeMatrix({ state, set, w: words, svgRef }: PieceProps<"cubeMatrix">) {
  const w = words.cubeMatrix;
  const [draft, setDraft] = useState<LiveCubeMatrix | null>(null);
  const s = draft ?? state;
  const view = { yaw: s.yaw, pitch: s.pitch };
  const keep = (next: LiveCubeMatrix) => {
    setDraft(null);
    set(next);
  };

  const items: RowItem[] = CUBE_PRESETS.map((p) => ({ text: w.presets[p.key], on: p.m.every((v, i) => v === s.m[i]), onTap: () => keep({ ...s, m: [...p.m], t: 100 }) }));
  const ROWS_Y = 8;
  const rowsH = pillRowsH(items, W - 32);
  const ST = ROWS_Y + rowsH + 6;
  const SH = 360;
  const [CX, CY] = [W / 2 - 80, ST + SH / 2];
  const at = projector(view, [0.5, 0.5, 0.5], PX, CX, CY);
  const shown = between(s.m, s.t);
  const D = det3(shown);

  const { drag, begin, svgProps } = useDrag<Hold>(
    () => draft && keep(draft),
    (d) => {
      if (!d.moved) return;
      const [dx, dy] = [d.x - d.x0, d.y - d.y0];
      if (d.part === "turn") return setDraft({ ...s, yaw: wrap360(d.yaw0 - dx * 0.6), pitch: clamp(Math.round(d.pitch0 + dy * 0.5), PITCH_RANGE[0], PITCH_RANGE[1]) });
      // The tip moves in the plane facing the viewer, and lands on whole numbers.
      const { right, up } = screenWays(view);
      const tip = add(d.tip0, add(scale(right, dx / PX), scale(up, -dy / PX)));
      setDraft({ ...s, t: 100, m: setColumn(s.m, d.j, tip) });
    },
  );

  const faces = useMemo(() => cubeImage(shown), [shown]);
  const flats = useMemo(
    () => lay(faces, view, at, () => ({ color: Math.abs(D) < 1e-9 ? "#ced4da" : D < 0 ? "#ffa8a8" : "#ffc078", stroke: INK, width: 1.2, opacity: 0.82 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [faces, s.yaw, s.pitch, D],
  );

  const keyTurn = (e: KeyboardEvent) => {
    const by: Record<string, [number, number]> = { ArrowLeft: [15, 0], ArrowRight: [-15, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    const m = by[e.key];
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, yaw: wrap360(s.yaw + m[0]), pitch: clamp(s.pitch + m[1], PITCH_RANGE[0], PITCH_RANGE[1]) });
  };
  const grabTip = (j: number) => (e: PointerEvent) => begin(e, { part: "tip", j, tip0: column(s.m, j) });

  // ---- words ------------------------------------------------------------------------------------------------------
  const says = detSays(s.m);
  const vol = Math.abs(det3(s.m));
  const lines: { text: string; color: string; strong?: boolean }[] = [
    { text: detWorking(s.m), color: INK, strong: true },
    { text: fill(w.says[says], { v: vol }), color: says === "flipped" ? RED : says === "flat" ? "#495057" : BLUE, strong: true },
  ];
  if (s.t < 100) lines.push({ text: fill(w.partWay, { p: s.t, d: Math.round(D * 100) / 100 }), color: INK });

  // ---- drawing ----------------------------------------------------------------------------------------------------
  const line = (p: V3, q: V3, color: string, width: number, dash?: string, key?: string) => {
    const [[x0, y0], [x1, y1]] = [at(p), at(q)];
    return <line key={key} x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" pointerEvents="none" />;
  };
  const axes = () => (
    <>
      {[0, 1, 2].map((i) => {
        const e: V3 = [0, 0, 0];
        e[i] = REACH;
        const [tx, ty] = at(scale(e, 1.08));
        return (
          <g key={i} pointerEvents="none">
            {line(scale(e, -1), e, "#adb5bd", 1.2, "4 4")}
            <text x={tx} y={ty + 5} fontSize={14} fill="#868e96" textAnchor="middle">{"xyz"[i]}</text>
          </g>
        );
      })}
      {/* The unit cube it started as, dashed. */}
      {cubeImage([1, 0, 0, 0, 1, 0, 0, 0, 1]).map((f, i) => (
        <path key={i} d={`M${f.pts.map(at).map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L")}Z`} fill="none" stroke="#adb5bd" strokeWidth={1} strokeDasharray="3 4" pointerEvents="none" />
      ))}
    </>
  );
  const arrows = () => [0, 1, 2].map((j) => {
    const tip = apply(shown, [j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0]);
    const [x, y] = at(tip);
    return (
      <g key={j} pointerEvents="none">
        {line([0, 0, 0], tip, COLS[j], 3.5)}
        <text x={x + 12} y={y - 10} fontSize={16} fontWeight={700} fill={COLS[j]} stroke="#fff" strokeWidth={4} paintOrder="stroke">{HATS[j]}</text>
      </g>
    );
  });

  // The matrix, written: nine boxes, each column in its colour.
  const MX = W - 196;
  const MY = ST + 70;
  const matrix = () => (
    <g>
      <text x={MX + 90} y={MY - 16} fontSize={16} fontWeight={700} fill={INK} textAnchor="middle">M</text>
      <path d={`M${MX - 6} ${MY}h-6v${3 * 50 - 6}h6M${MX + 186} ${MY}h6v${3 * 50 - 6}h-6`} fill="none" stroke={INK} strokeWidth={2} />
      {s.m.map((v, i) => {
        const [r, c] = [Math.floor(i / 3), i % 3];
        return (
          <g key={i}>
            <NumBox x={MX + c * 62} y={MY + r * 50} w={54} h={44} size={20} value={v} min={ENTRY[0]} max={ENTRY[1]} label={fill(w.entryName, { r: r + 1, c: c + 1 })}
              onChange={(n) => keep({ ...s, t: 100, m: setEntry(s.m, i, n) })} />
            <rect x={MX + c * 62} y={MY + r * 50 + 41} width={54} height={3} fill={COLS[c]} pointerEvents="none" />
          </g>
        );
      })}
    </g>
  );

  const SAY_Y = ST + SH + 64;
  const H = SAY_Y + 3 * 24;
  const words2 = () => lines.map((l, i) => <text key={i} x={24} y={SAY_Y + i * 24} fontSize={15} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>);

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={lines.map((l) => l.text).join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <PillRows y={ROWS_Y} w={W} items={items} />
        <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuemin={0} aria-valuemax={359} aria-valuenow={s.yaw} aria-valuetext={`${s.yaw}°, ${s.pitch}°`}
          onKeyDown={keyTurn} style={{ cursor: drag?.part === "turn" ? "grabbing" : "grab" }}
          onPointerDown={(e) => begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch })}>
          <title>{w.turnName}</title>
          <rect x={0} y={ST} width={W - 210} height={SH} fill="transparent" />
        </g>
        <g pointerEvents="none">
          {axes()}
          {flats.map((f, i) => <FlatFace key={i} f={f} />)}
          {arrows()}
        </g>
        {[0, 1, 2].map((j) => {
          const [x, y] = at(column(shown, j));
          const held = drag?.part === "tip" && drag.j === j;
          return (
            <g key={j} role="group" aria-label={fill(w.tipName, { v: HATS[j] })} style={{ cursor: held ? "grabbing" : "grab" }} onPointerDown={grabTip(j)}>
              <title>{fill(w.tipName, { v: HATS[j] })}</title>
              <circle cx={x} cy={y} r={held ? 10 : 8} fill="#fff" stroke={COLS[j]} strokeWidth={3} />
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          );
        })}
        {matrix()}
        <Track x={16} y={ST + SH + 6} w={W - 32} value={s.t} min={0} max={100} label={w.tName} lead={110}
          show={(v) => (v === 0 ? "I" : v === 100 ? "M" : `${v} %`)} onChange={(v, done) => (done ? keep({ ...s, t: v }) : setDraft({ ...s, t: v }))} />
        {words2()}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - ST} viewBox={`0 ${ST} ${W} ${H - ST}`} fontFamily={FONT}>
          <rect y={ST} width={W} height={H - ST} fill="#fff" />
          {axes()}
          {flats.map((f, i) => <FlatFace key={i} f={f} />)}
          {arrows()}
          {words2()}
        </svg>
      </div>
    </>
  );
}

