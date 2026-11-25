// Zeros and ends. A polynomial with zeros at −3, 0 and 2: tap a zero to raise its power, 1, 2, 3 and round again, and
// the curve crosses there (odd), touches and turns back (even) or flattens as it crosses (3); tap the leading sign and
// the whole curve turns over. The two ends go as the degree and the leading sign say, shown by arrows.
import { endsOf, nextPower, POLY_ZEROS, polyAt, polyText, scaleFor } from "../math/polyGraph";
import { BLUE, GREEN, keyTap, MUTED, RED, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 50;
const U = 40;
const LO = -5;
const HI = 5;
const CY = 200;
const UY = 22;
const TOP = 6.5;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + (x - LO) * U;
const Y = (y: number) => CY - y * UY;

export function PolyShape({ state, set, w: words, svgRef }: PieceProps<"polyShape">) {
  const w = words.polyShape;
  const k = scaleFor(POLY_ZEROS, state.m, 4.5);
  const f = (x: number) => k * polyAt(POLY_ZEROS, state.m, state.lead, x);
  const deg = state.m.reduce((a, b) => a + b, 0);
  const [l, r] = endsOf(deg, state.lead);
  const pts = Array.from({ length: (HI - LO) * 25 + 1 }, (_, i) => LO + i / 25).filter((x) => Math.abs(f(x)) <= TOP);
  const d = pts.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`).join("");
  const how = (m: number) => (m === 2 ? w.touches : m === 3 ? w.flattens : w.crosses);
  const minus = (v: number) => String(v).replace("-", "−");
  const say = wrapWords(
    [
      fill(w.ends, { d: deg, s: state.lead > 0 ? "+" : "−", l: l > 0 ? w.up : w.down, r: r > 0 ? w.up : w.down, why: deg % 2 ? w.odd : w.even }),
      ...POLY_ZEROS.map((z, i) => fill(w.at, { x: minus(z), how: how(state.m[i]), m: state.m[i] })),
    ].join(" "),
    80,
  );
  const flip = () => set({ ...state, lead: -state.lead });
  // An arrow at each end of the curve, pointing the way it leaves.
  const arrow = (x: number, up: number) => {
    const [ax, ay] = [X(x), Y(up * TOP)];
    return <path d={`M${ax - 7} ${ay + up * 12} L${ax} ${ay} L${ax + 7} ${ay + up * 12}`} fill="none" stroke={ORANGE} strokeWidth={3} />;
  };
  const leftX = pts[0];
  const rightX = pts[pts.length - 1];
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={`${polyText(POLY_ZEROS, state.m, state.lead)}. ${say.join(" ")}`}>
        <rect width={W} height={H} fill="#fff" />
        <g pointerEvents="none">
          {Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(TOP)} x2={X(v)} y2={Y(-TOP)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v !== 0 && <text x={X(v)} y={Y(0) + 34} fontSize={11} textAnchor="middle" fill={MUTED}>{minus(v)}</text>}
            </g>
          ))}
          <line x1={X(LO)} y1={Y(0)} x2={X(HI)} y2={Y(0)} stroke={INK} strokeWidth={1.5} />
          <path d={d} fill="none" stroke={BLUE} strokeWidth={3} />
          {leftX > LO + 0.05 && arrow(leftX, l)}
          {rightX < HI - 0.05 && arrow(rightX, r)}
          <text x={466} y={40} fontSize={20} fontWeight={700} fill={INK}>{polyText(POLY_ZEROS, state.m, state.lead)}</text>
          <text x={466} y={70} fontSize={15} fill={MUTED}>{fill(w.degree, { d: deg })}</text>
          <text x={466} y={160} fontSize={14} fill={GREEN}>{w.oddRule}</text>
          <text x={466} y={184} fontSize={14} fill={RED}>{w.evenRule}</text>
        </g>
        {POLY_ZEROS.map((z, i) => {
          const tap = () => set(nextPower(state, i));
          return (
            <g key={z} role="button" tabIndex={0} aria-label={fill(w.zero, { x: minus(z), m: state.m[i] })} onPointerDown={(e) => e.stopPropagation()}
              onClick={tap} onKeyDown={(e) => keyTap(e, tap)} style={{ cursor: "pointer" }}>
              <circle cx={X(z)} cy={Y(0)} r={11} fill={state.m[i] % 2 ? GREEN : RED} stroke="#fff" strokeWidth={2} />
              <text x={X(z)} y={Y(0) + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill="#fff" pointerEvents="none">{state.m[i]}</text>
            </g>
          );
        })}
        <g role="button" tabIndex={0} aria-label={w.lead} onPointerDown={(e) => e.stopPropagation()} onClick={flip} onKeyDown={(e) => keyTap(e, flip)} style={{ cursor: "pointer" }}>
          <rect x={466} y={90} width={170} height={36} rx={18} fill={state.lead > 0 ? BLUE : ORANGE} />
          <text x={551} y={114} fontSize={15} fontWeight={700} textAnchor="middle" fill="#fff" pointerEvents="none">{fill(w.leadSign, { s: state.lead > 0 ? "+" : "−" })}</text>
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
