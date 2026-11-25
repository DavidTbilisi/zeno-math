// The growth race. Two plants: one starts at 100 cm and adds 40 cm a day, the other starts at 10 cm and grows by a
// chosen percentage a day. Drag the day along and watch both heights, as bars and as curves: the steps of the adding
// plant stay the same, the multiplying plant's steps keep growing, and it overtakes on the day shown, sooner the
// bigger its rate. Past the top of the picture its curve leaves with an arrow.
import { expAt, linearAt, overtakes, RACE_DAYS, RACE_RATES } from "../math/exponential";
import { BLUE, GREEN, MUTED, Track, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 60;
const PW = 400;
const PY = 30;
const PH = 240;
const TOP = 1200;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (d: number) => PX + (d / RACE_DAYS) * PW;
const Y = (v: number) => PY + PH - (Math.min(v, TOP) / TOP) * PH;

/** The curve from day 0 to 20, cut at the top. */
const path = (f: (d: number) => number) =>
  Array.from({ length: 201 }, (_, i) => i / 10).filter((d) => d === 0 || f(d - 0.1) < TOP).map((d, i) => `${i ? "L" : "M"}${X(d).toFixed(1)} ${Y(f(d)).toFixed(1)}`).join("");

export function GrowthRace({ state, set, w: words, svgRef }: PieceProps<"growthRace">) {
  const w = words.growthRace;
  const at = overtakes(state.rate);
  const [lin, exp] = [linearAt(state.day), expAt(state.day, state.rate)];
  const past = state.day >= at;
  const r = (v: number) => String(Math.round(v));
  const say = wrapWords(
    fill(past ? w.past : at > RACE_DAYS ? w.far : w.before, { d: state.day, a: r(lin), b: r(exp), t: at, p: state.rate }),
    76,
  );
  // Each plant's last step, to compare: the adding one always 40.
  const step = state.day ? r(exp - expAt(state.day - 1, state.rate)) : "—";
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <g pointerEvents="none">
          {[0, 200, 400, 600, 800, 1000, 1200].map((v) => (
            <g key={v}>
              <line x1={PX} y1={Y(v)} x2={PX + PW} y2={Y(v)} stroke="#f1f3f5" />
              <text x={PX - 8} y={Y(v) + 4} fontSize={12} textAnchor="end" fill={MUTED}>{v}</text>
            </g>
          ))}
          {[0, 5, 10, 15, 20].map((d) => <text key={d} x={X(d)} y={PY + PH + 18} fontSize={12} textAnchor="middle" fill={MUTED}>{d}</text>)}
          <line x1={PX} y1={PY + PH} x2={PX + PW} y2={PY + PH} stroke={INK} strokeWidth={1.5} />
          <line x1={PX} y1={PY} x2={PX} y2={PY + PH} stroke={INK} strokeWidth={1.5} />
          <text x={PX + PW / 2} y={PY + PH + 36} fontSize={13} textAnchor="middle" fill={MUTED}>{w.days}</text>
          <path d={path(linearAt)} fill="none" stroke={BLUE} strokeWidth={3} />
          <path d={path((d) => expAt(d, state.rate))} fill="none" stroke={ORANGE} strokeWidth={3} />
          {at <= RACE_DAYS && <circle cx={X(at)} cy={Y(expAt(at, state.rate))} r={6} fill="none" stroke={GREEN} strokeWidth={3} />}
          <line x1={X(state.day)} y1={PY} x2={X(state.day)} y2={PY + PH} stroke={INK} strokeDasharray="4 4" />
          {/* The two plants as bars, on the right, at the day chosen. */}
          {[[lin, BLUE, w.adds], [exp, ORANGE, fill(w.times, { p: state.rate })]].map(([v, color, name], i) => (
            <g key={i}>
              <rect x={500 + i * 90} y={Y(v as number)} width={56} height={PY + PH - Y(v as number)} fill={color as string} fillOpacity={0.75} />
              {(v as number) > TOP && <text x={528 + i * 90} y={PY - 6} fontSize={16} textAnchor="middle" fill={color as string}>↑</text>}
              <text x={528 + i * 90} y={Math.max(PY + 12, Y(v as number) - 6)} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{r(v as number)}</text>
              <text x={528 + i * 90} y={PY + PH + 18} fontSize={12} textAnchor="middle" fill={color as string}>{name as string}</text>
            </g>
          ))}
          <text x={500} y={PY + PH + 40} fontSize={13} fill={MUTED}>{fill(w.steps, { a: 40, b: step })}</text>
        </g>
        <Track x={24} y={318} w={430} value={state.day} min={0} max={RACE_DAYS} label={w.dayLabel} show={(v) => fill(w.day, { d: v })}
          onChange={(day) => day !== state.day && set({ ...state, day })} />
        <Track x={24} y={356} w={430} value={state.rate} min={RACE_RATES[0]} max={RACE_RATES[1]} label={w.rateLabel} show={(v) => `${v} %`} color={ORANGE}
          onChange={(rate) => rate !== state.rate && set({ ...state, rate })} />
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + 14 + i * 25} fontSize={16} fill={past ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
