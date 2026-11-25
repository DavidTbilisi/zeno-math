// Fold the box. Drag the size of the square cut from each corner of a sheet: the sheet shows the cuts and the base
// left, and the graph of the volume V(x) shows the point and its tangent. While the tangent climbs a bigger cut gives a
// bigger box; where it is flat, V′ = 0, the box is the largest it can be.
import { boxSlope, boxVolume, SHEETS } from "../math/derivContext";
import { n4 } from "../math/continuity";
import { BLUE, GREEN, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const SAY_Y = 420;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
const G = { x: 400, y: 70, w: 280, h: 240 };

export function FoldBox({ state, set, w: words, svgRef }: PieceProps<"foldBox">) {
  const w = words.foldBox;
  const [L, Wd] = SHEETS[state.which];
  const x = state.q / 4;
  const v = boxVolume(L, Wd, x);
  const d = boxSlope(L, Wd, x);
  const xMax = Wd / 2;
  const vTop = Math.max(...Array.from({ length: 2 * Wd + 1 }, (_, i) => boxVolume(L, Wd, i / 4)));
  const say = wrapWords(
    [
      x === 0 ? w.none : fill(w.say, { x: n4(x), l: n4(L - 2 * x), w: n4(Wd - 2 * x), v: n4(v) }),
      d === 0 ? fill(w.top, { x: n4(x) }) : fill(d > 0 ? w.rising : w.falling, { x: n4(x), d: n4(d) }),
    ].join(" "),
    80,
  );
  // The sheet, scaled so its long side is 320 wide.
  const s = 320 / L;
  const [sx, sy] = [24, 70];
  const gx = (t: number) => G.x + (t / xMax) * G.w;
  const gy = (vv: number) => G.y + G.h - (vv / (vTop * 1.1)) * G.h;
  const curve = Array.from({ length: 81 }, (_, i) => (i * xMax) / 80)
    .map((t, i) => `${i ? "L" : "M"}${gx(t).toFixed(1)} ${gy(boxVolume(L, Wd, t)).toFixed(1)}`)
    .join("");
  // A short tangent, drawn in the graph's own scale.
  const dt = xMax / 8;
  const tan = [x - dt, x + dt].map((t) => [gx(t), gy(v + d * (t - x))]);
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={["0", "1"]} on={String(state.which)} names={{ 0: w.square, 1: w.wide }}
          onPick={(k) => set({ which: Number(k), q: Math.min(state.q, 2 * SHEETS[Number(k)][1]) })} />
        <g pointerEvents="none">
          <rect x={sx} y={sy} width={L * s} height={Wd * s} fill="#f8f9fa" stroke={INK} />
          <rect x={sx + x * s} y={sy + x * s} width={(L - 2 * x) * s} height={(Wd - 2 * x) * s} fill={BLUE} fillOpacity={0.25} stroke={BLUE} />
          {[[0, 0], [L - x, 0], [0, Wd - x], [L - x, Wd - x]].map(([a, b], i) => (
            <rect key={i} x={sx + a * s} y={sy + b * s} width={x * s} height={x * s} fill="#fff" stroke={RED} strokeWidth={2} strokeDasharray="5 3" />
          ))}
          <text x={sx + (L * s) / 2} y={sy - 8} fontSize={13} textAnchor="middle" fill={MUTED}>{L}</text>
          <text x={sx + L * s + 6} y={sy + (Wd * s) / 2} fontSize={13} fill={MUTED}>{Wd}</text>
          <line x1={G.x} y1={G.y} x2={G.x} y2={G.y + G.h} stroke="#adb5bd" />
          <line x1={G.x} y1={G.y + G.h} x2={G.x + G.w} y2={G.y + G.h} stroke="#adb5bd" />
          <text x={G.x + G.w} y={G.y + G.h + 18} fontSize={13} textAnchor="end" fill={MUTED}>x</text>
          <text x={G.x - 6} y={G.y + 4} fontSize={13} textAnchor="end" fill={MUTED}>V</text>
          <path d={curve} fill="none" stroke={BLUE} strokeWidth={3} />
          <line x1={tan[0][0]} y1={tan[0][1]} x2={tan[1][0]} y2={tan[1][1]} stroke={ORANGE} strokeWidth={2.5} />
          <circle cx={gx(x)} cy={gy(v)} r={6} fill={INK} />
          <text x={G.x + 10} y={G.y + G.h + 40} fontSize={15} fontWeight={700} fill={INK}>{fill(w.vShow, { v: n4(v) })}</text>
          <text x={G.x + 150} y={G.y + G.h + 40} fontSize={15} fontWeight={700} fill={d === 0 ? GREEN : ORANGE}>{fill(w.dShow, { d: n4(d) })}</text>
        </g>
        <Track x={24} y={380} w={340} value={state.q} min={0} max={2 * Wd} label={w.xLabel} show={(q) => `x = ${n4(q / 4)}`} color={RED}
          onChange={(q) => q !== state.q && set({ ...state, q })} />
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 10 + i * 25} fontSize={16} fill={d === 0 ? GREEN : INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
