// Trace the path. A point moves along a thrown ball's path, a circle or the cardioid r = 2 + 2cos θ as t is dragged;
// an arrow shows its velocity (dx/dt, dy/dt). The words give the point, the slope dy/dx as the arrow's rise over its
// run, and the speed as the arrow's length: zero slope at the ball's top, and the same speed all round the circle.
import { n2, TRACE_STEPS, traceAt } from "../math/parametric";
import { BLUE, GREEN, MUTED, RED, Tabs, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const U = 30;
const CX = 230;
const CY = 200;
const SAY_Y = 420;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => CX + x * U;
/** A number in brackets when it is negative, to be squared. */
const par = (v: number) => (Math.round(v * 100) < 0 ? `(${n2(v)})` : n2(v));
const Y = (y: number) => CY - y * U;

export function TracePath({ state, set, w: words, svgRef }: PieceProps<"tracePath">) {
  const w = words.tracePath;
  const p = traceAt(state.which, state.step);
  const steps = TRACE_STEPS[state.which];
  const speed = Math.hypot(p.dx, p.dy);
  const name = state.which === 2 ? "θ" : "t";
  const slope = Math.abs(p.dx) < 1e-9 ? null : p.dy / p.dx;
  const where = state.which === 2 ? fill(w.polarAt, { th: p.t, r: n2(p.r ?? 0), x: n2(p.x), y: n2(p.y) }) : fill(w.at, { t: state.which === 0 ? n2(p.t) : `${p.t}°`, x: n2(p.x), y: n2(p.y) });
  const how = slope === null ? fill(w.upright, { dy: n2(p.dy), n: name }) : fill(w.slope, { dx: n2(p.dx), dy: n2(p.dy), m: n2(slope), n: name });
  const extra = state.which === 0 && Math.abs(p.dy) < 1e-9 ? w.top : state.which === 1 ? w.steady : "";
  const say = wrapWords([where, how, fill(w.speed, { dx: par(p.dx), dy: par(p.dy), s: n2(speed) }), extra].filter(Boolean).join(" "), 80);
  const path = Array.from({ length: steps * 4 + 1 }, (_, i) => traceAt(state.which, i / 4))
    .map((q, i) => `${i ? "L" : "M"}${X(q.x).toFixed(1)} ${Y(q.y).toFixed(1)}`)
    .join("");
  // The velocity arrow, at half size so it stays on the picture.
  const [ax, ay] = [X(p.x + p.dx / 2), Y(p.y + p.dy / 2)];
  const ang = Math.atan2(ay - Y(p.y), ax - X(p.x));
  const head = [ang + 2.6, ang - 2.6].map((a) => `${ax + 10 * Math.cos(a)},${ay + 10 * Math.sin(a)}`).join(" ");
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={["0", "1", "2"]} on={String(state.which)} names={{ 0: w.ball, 1: w.circle, 2: w.cardioid }}
          onPick={(k) => set({ which: Number(k), step: Math.min(state.step, TRACE_STEPS[Number(k)]) })} />
        <g pointerEvents="none">
          {Array.from({ length: 13 }, (_, i) => i - 6).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(5)} x2={X(v)} y2={Y(-5)} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />
              {Math.abs(v) <= 5 && <line x1={X(-6)} y1={Y(v)} x2={X(6)} y2={Y(v)} stroke={v === 0 ? "#adb5bd" : "#f1f3f5"} />}
            </g>
          ))}
          <path d={path} fill="none" stroke={BLUE} strokeWidth={3} strokeOpacity={0.8} />
          {state.which === 2 && <line x1={X(0)} y1={Y(0)} x2={X(p.x)} y2={Y(p.y)} stroke={MUTED} strokeWidth={2} strokeDasharray="5 4" />}
          {speed > 1e-9 && (
            <>
              <line x1={X(p.x)} y1={Y(p.y)} x2={ax} y2={ay} stroke={ORANGE} strokeWidth={3} />
              <polyline points={`${head.split(" ")[0]} ${ax},${ay} ${head.split(" ")[1]}`} fill="none" stroke={ORANGE} strokeWidth={3} />
              <line x1={X(p.x)} y1={Y(p.y)} x2={ax} y2={Y(p.y)} stroke={GREEN} strokeWidth={1.5} strokeDasharray="3 3" />
              <line x1={ax} y1={Y(p.y)} x2={ax} y2={ay} stroke={RED} strokeWidth={1.5} strokeDasharray="3 3" />
            </>
          )}
          <circle cx={X(p.x)} cy={Y(p.y)} r={7} fill={INK} />
          <text x={460} y={80} fontSize={17} fontWeight={700} fill={INK}>{[w.ballEq, w.circleEq, w.cardioidEq][state.which]}</text>
          <text x={460} y={110} fontSize={15} fill={GREEN}>{fill(w.across, { v: n2(p.dx) })}</text>
          <text x={460} y={134} fontSize={15} fill={RED}>{fill(w.upBy, { v: n2(p.dy) })}</text>
          <text x={460} y={164} fontSize={15} fill={ORANGE}>{fill(w.speedIs, { s: n2(speed) })}</text>
        </g>
        <Track x={24} y={380} w={440} value={state.step} min={0} max={steps} label={w.tLabel}
          show={(v) => (state.which === 0 ? `t = ${n2(v / 4)}` : `${state.which === 2 ? "θ" : "t"} = ${v * 15}°`)} color={INK}
          onChange={(step) => step !== state.step && set({ ...state, step })} />
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + 10 + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
