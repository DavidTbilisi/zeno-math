// From the wheel to the wave. A wheel of radius a, its centre at height d, turns b times as fast as the angle; the
// height of its orange point is drawn against the angle, and the wave a·sin(bx) + d grows as the angle is dragged. A
// dashed level y = c, dragged up and down by its handle, meets the wave at every solution of a·sin(bx) + d = c,
// marked from 0° to 360°: two each turn of the wheel, or none when the wheel never reaches that high.
import { useState, type KeyboardEvent } from "react";
import { levelSolutions, WAVE_TURN, waveAt, type LiveWheelWave } from "../math/trigWave";
import { BLUE, GREEN, MUTED, Track, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const CX = 105;
const UY = 22;
const MIDY = 190;
const WX = 230;
const WW = 450;
const SAY_Y = 486;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const PURPLE = "#7048e8";
const Y = (y: number) => MIDY - y * UY;
const XA = (deg: number) => WX + (deg / WAVE_TURN) * WW;
const m = (v: number) => String(v).replace("-", "−");
const half = (v: number) => Math.round(v * 2) / 2;

export function WheelWave({ state, set, w: words, svgRef }: PieceProps<"wheelWave">) {
  const w = words.wheelWave;
  const [draft, setDraft] = useState<LiveWheelWave | null>(null);
  const s = draft ?? state;
  const cMax = 6;
  const { drag, begin, svgProps } = useDrag<{ grip: "level" }>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (d) => setDraft({ ...state, c: Math.max(-cMax, Math.min(cMax, half((MIDY - d.y) / UY))) }),
  );
  const keys = (e: KeyboardEvent) => {
    const by = { ArrowUp: 0.5, ArrowDown: -0.5 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    set({ ...state, c: Math.max(-cMax, Math.min(cMax, state.c + by)) });
  };
  const sols = levelSolutions(s, s.c);
  const f = `y = ${s.a === 1 ? "" : s.a}sin(${s.b === 1 ? "" : s.b}x)${s.d ? ` ${s.d > 0 ? "+" : "−"} ${Math.abs(s.d)}` : ""}`;
  const say = wrapWords(
    [
      fill(w.shape, { f, a: s.a, p: 360 / s.b, b: s.b, d: m(s.d) }),
      sols.length ? fill(w.level, { c: m(s.c), n: sols.length, list: sols.map((x) => `${x}°`).join(", ") }) : fill(w.never, { c: m(s.c), lo: m(s.d - s.a), hi: m(s.d + s.a) }),
    ].join(" "),
    80,
  );
  const turn = (s.b * s.angle * Math.PI) / 180;
  const [px, py] = [CX + s.a * UY * Math.cos(turn), Y(s.d + s.a * Math.sin(turn))];
  const wave = (to: number) =>
    Array.from({ length: Math.round(to / 2) + 1 }, (_, i) => i * 2)
      .map((x, i) => `${i ? "L" : "M"}${XA(x).toFixed(1)} ${Y(waveAt(s, x)).toFixed(1)}`)
      .join("");
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <g pointerEvents="none">
          {[-6, -4, -2, 0, 2, 4, 6].map((v) => (
            <g key={v}>
              <line x1={WX} y1={Y(v)} x2={WX + WW} y2={Y(v)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={WX - 6} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{m(v)}</text>
            </g>
          ))}
          {[0, 90, 180, 270, 360, 450, 540, 630, 720].map((x) => (
            <g key={x}>
              <line x1={XA(x)} y1={Y(6)} x2={XA(x)} y2={Y(-6)} stroke={x === 0 ? INK : x === 360 ? "#ced4da" : "#f1f3f5"} strokeWidth={x === 0 ? 1.5 : 1} />
              {x % 180 === 0 && <text x={XA(x)} y={Y(-6) + 16} fontSize={11} textAnchor="middle" fill={MUTED}>{`${x}°`}</text>}
            </g>
          ))}
          {/* The wheel, its centre on the midline. */}
          <line x1={CX - 80} y1={Y(s.d)} x2={WX + WW} y2={Y(s.d)} stroke={GREEN} strokeWidth={1.5} strokeDasharray="4 4" />
          <circle cx={CX} cy={Y(s.d)} r={s.a * UY} fill="none" stroke={INK} strokeWidth={2} />
          <line x1={CX} y1={Y(s.d)} x2={px} y2={py} stroke={INK} strokeWidth={1.5} />
          <path d={wave(WAVE_TURN)} fill="none" stroke={BLUE} strokeWidth={1.5} strokeOpacity={0.3} />
          <path d={wave(s.angle)} fill="none" stroke={BLUE} strokeWidth={3} />
          <line x1={px} y1={py} x2={XA(s.angle)} y2={py} stroke={ORANGE} strokeWidth={1.5} strokeDasharray="3 4" />
          <circle cx={px} cy={py} r={6} fill={ORANGE} />
          <circle cx={XA(s.angle)} cy={py} r={6} fill={ORANGE} />
          {/* The level and where it meets the wave in the first turn. */}
          <line x1={WX} y1={Y(s.c)} x2={WX + WW} y2={Y(s.c)} stroke={PURPLE} strokeWidth={2} strokeDasharray="7 5" />
          {sols.map((x) => <circle key={x} cx={XA(x)} cy={Y(s.c)} r={5.5} fill={GREEN} stroke="#fff" strokeWidth={1.5} />)}
          <text x={20} y={30} fontSize={20} fontWeight={700} fill={INK}>{f}</text>
        </g>
        <g role="slider" tabIndex={0} aria-label={w.levelLabel} aria-valuenow={s.c} aria-valuemin={-cMax} aria-valuemax={cMax} onKeyDown={keys}
          onPointerDown={(e) => begin(e, { grip: "level" })} style={{ cursor: drag ? "grabbing" : "ns-resize" }}>
          <circle cx={WX + WW + 6} cy={Y(s.c)} r={18} fill="transparent" />
          <circle cx={WX + WW + 6} cy={Y(s.c)} r={8} fill="#fff" stroke={PURPLE} strokeWidth={3.5} />
        </g>
        <Track x={24} y={354} w={320} value={s.angle} min={0} max={WAVE_TURN} label={w.angleLabel} show={(v) => `${v}°`} color={ORANGE}
          onChange={(angle) => angle !== state.angle && set({ ...state, angle })} />
        <Track x={360} y={354} w={320} value={s.a} min={1} max={3} label={w.aLabel} show={(v) => fill(w.aShow, { a: v })}
          onChange={(a) => a !== state.a && set({ ...state, a })} />
        <Track x={24} y={394} w={320} value={s.b} min={1} max={4} label={w.bLabel} show={(v) => fill(w.bShow, { b: v })}
          onChange={(b) => b !== state.b && set({ ...state, b })} />
        <Track x={360} y={394} w={320} value={s.d} min={-2} max={2} label={w.dLabel} show={(v) => fill(w.dShow, { d: m(v) })} color={GREEN}
          onChange={(d) => d !== state.d && set({ ...state, d })} />
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y - 38 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
