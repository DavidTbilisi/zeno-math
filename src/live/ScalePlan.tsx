// The plan and the floor. A room drawn on a squared plan, beside the real floor it stands for. Drag the plan's corner
// to change the room, and the scale to change how many metres one centimetre stands for. Every side grows k times;
// the shaded square centimetre of the plan is a k-by-k block of square metres on the floor, so the area grows k × k
// times, not k times.
import { useState, type KeyboardEvent } from "react";
import { PLAN_MAX, type LiveScalePlan } from "../math/scaleMaps";
import { BLUE, Track, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
const CM = 40;
const M = 12;
const PLAN: [number, number] = [36, 70];
const FLOOR: [number, number] = [340, 70];
const SAY_Y = 400;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";

export function ScalePlan({ state, set, w: words, svgRef }: PieceProps<"scalePlan">) {
  const w = words.scalePlan;
  const [draft, setDraft] = useState<LiveScalePlan | null>(null);
  const d = draft ?? state;
  const { drag, begin, svgProps } = useDrag<object>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => {
      const nw = Math.max(1, Math.min(PLAN_MAX.w, Math.round((h.x - PLAN[0]) / CM)));
      const nh = Math.max(1, Math.min(PLAN_MAX.h, Math.round((h.y - PLAN[1]) / CM)));
      if (nw !== d.w || nh !== d.h) setDraft({ ...d, w: nw, h: nh });
    },
  );
  const keys = (e: KeyboardEvent) => {
    const v = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!v) return;
    e.preventDefault();
    e.stopPropagation();
    set({ ...d, w: Math.max(1, Math.min(PLAN_MAX.w, d.w + v[0])), h: Math.max(1, Math.min(PLAN_MAX.h, d.h + v[1])) });
  };

  const [px, py] = PLAN;
  const [fx, fy] = FLOOR;
  const [rw, rh] = [d.w * d.k, d.h * d.k];
  const grid = (x0: number, y0: number, nx: number, ny: number, u: number, every: number, key: string) => [
    ...Array.from({ length: nx + 1 }, (_, i) => <line key={`${key}x${i}`} x1={x0 + i * u} y1={y0} x2={x0 + i * u} y2={y0 + ny * u} stroke={i % every === 0 ? "#868e96" : "#e9ecef"} strokeWidth={i % every === 0 ? 1.4 : 1} />),
    ...Array.from({ length: ny + 1 }, (_, j) => <line key={`${key}y${j}`} x1={x0} y1={y0 + j * u} x2={x0 + nx * u} y2={y0 + j * u} stroke={j % every === 0 ? "#868e96" : "#e9ecef"} strokeWidth={j % every === 0 ? 1.4 : 1} />),
  ];
  const v = { w: d.w, h: d.h, k: d.k, a: d.w * d.h, rw, rh, r: rw * rh, k2: d.k * d.k };
  const say = [fill(w.plan, v), fill(w.floor, v), ...wrapWords(fill(w.why, v), 78)];
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <text x={px} y={40} fontSize={17} fontWeight={700} fill={INK}>{w.planName}</text>
        <text x={fx} y={40} fontSize={17} fontWeight={700} fill={INK}>{w.floorName}</text>
        {/* The plan: centimetre squares, the room, its first square shaded. */}
        {grid(px, py, PLAN_MAX.w, PLAN_MAX.h, CM, 1, "p")}
        <rect x={px} y={py} width={CM} height={CM} fill={ORANGE} fillOpacity={0.35} />
        <rect x={px} y={py} width={d.w * CM} height={d.h * CM} fill={BLUE} fillOpacity={0.08} stroke={BLUE} strokeWidth={3} />
        <text x={px + (d.w * CM) / 2} y={py + d.h * CM + 20} fontSize={15} fontWeight={700} textAnchor="middle" fill={BLUE} stroke="#fff" strokeWidth={4} paintOrder="stroke">{d.w} cm</text>
        <text x={px + d.w * CM + 8} y={py + (d.h * CM) / 2 + 5} fontSize={15} fontWeight={700} fill={BLUE} stroke="#fff" strokeWidth={4} paintOrder="stroke">{d.h} cm</text>
        <g role="slider" tabIndex={0} aria-label={w.cornerName} aria-valuetext={`${d.w} × ${d.h}`} onKeyDown={keys} style={{ cursor: drag ? "grabbing" : "nwse-resize" }}
          onPointerDown={(e) => begin(e, {})}>
          <circle cx={px + d.w * CM} cy={py + d.h * CM} r={10} fill="#fff" stroke={BLUE} strokeWidth={3} />
          <circle cx={px + d.w * CM} cy={py + d.h * CM} r={24} fill="transparent" />
        </g>
        {/* The floor: square metres, every k metres a heavier line (one centimetre of the plan), its first block shaded. */}
        <rect x={fx} y={fy} width={d.k * M} height={d.k * M} fill={ORANGE} fillOpacity={0.35} />
        {grid(fx, fy, rw, rh, M, d.k, "f")}
        <rect x={fx} y={fy} width={rw * M} height={rh * M} fill="none" stroke={BLUE} strokeWidth={3} />
        <text x={fx + (rw * M) / 2} y={fy + rh * M + 20} fontSize={15} fontWeight={700} textAnchor="middle" fill={BLUE} stroke="#fff" strokeWidth={4} paintOrder="stroke">{rw} m</text>
        <text x={fx + rw * M + 8} y={fy + (rh * M) / 2 + 5} fontSize={15} fontWeight={700} fill={BLUE} stroke="#fff" strokeWidth={4} paintOrder="stroke">{rh} m</text>
        <Track x={24} y={SAY_Y - 70} w={420} value={d.k} min={1} max={PLAN_MAX.k} label={w.scaleName} show={(k) => fill(w.scale, { k })} lead={150}
          onChange={(k, done) => (done ? (set({ ...d, k }), setDraft(null)) : setDraft({ ...d, k }))} />
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fontWeight={i < 2 ? 700 : 400} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
