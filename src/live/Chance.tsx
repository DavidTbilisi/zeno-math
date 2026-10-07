// The chance experiment on the board: a coin, a die, two dice, a spinner or a bag of counters, run once or a thousand
// times at a click. The bars show what came up (as counts or relative frequencies) against what theory expects;
// "Over time" follows one outcome's relative frequency as the trials pile up, on a log scale, settling on p.
import { BAG_COLORS, DIE_SIDES, emptyTally, MAX_TRIALS, outcomes, runTrials, type Device, type LiveStates } from "../math/live";
import { SECTION_COLORS } from "./pieces";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

type State = LiveStates["chance"];
const W = 660;
const H = 330;
const L = 54;
const R = 14;
const T = 26;
const B = 48;
const BAG_WORDS = ["red", "blue", "green", "yellow"] as const;

/** A round step for an axis up to `max`: 1, 2 or 5 times a power of ten, about five of them. */
function niceStep(max: number) {
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}
/** A tick label with as many decimals as the step between ticks needs. */
const tick = (v: number, step: number) => v.toFixed(Math.max(0, -Math.floor(Math.log10(step) + 1e-9)));
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 0.1 ? 3 : 2));

/** Where the "over time" chart starts: the most likely outcome (a six for a die is as good as any; 7 for two dice). */
function startFocus(d: Device) {
  if (d.kind === "twoDice") return 5;
  if (d.kind === "die") return d.sides - 1;
  return 0;
}

export function Chance({ state, set, w, svgRef }: PieceProps<"chance">) {
  const c = w.chance;
  const d = state.device;
  const { labels: rawLabels, p } = outcomes(d, { heads: w.coin.heads, tails: w.coin.tails });
  const labels = d.kind === "bag" ? BAG_WORDS.map((k) => c[k]) : rawLabels;
  const colors = p.map((_, i) => (d.kind === "bag" ? BAG_COLORS[i] : d.kind === "spinner" ? SECTION_COLORS[i % SECTION_COLORS.length] : "#74c0fc"));
  const { n, counts } = state.tally;

  const setDevice = (device: Device) => {
    const k = outcomes(device, { heads: "", tails: "" }).p.length;
    set({ ...state, device, tally: emptyTally(k), focus: startFocus(device), last: -1 });
  };
  const run = (m: number) => {
    const { tally, last } = runTrials(state.tally, d, m, Math.random);
    set({ ...state, tally, last });
  };

  return (
    <>
      <div className="live-bar">
        <select
          value={d.kind}
          aria-label={c.bars}
          onChange={(e) => {
            const kind = e.target.value as Device["kind"];
            setDevice(
              kind === "die" ? { kind, sides: 6 } : kind === "spinner" ? { kind, sections: 4 } : kind === "bag" ? { kind, counts: [3, 2, 1, 0] } : { kind },
            );
          }}
        >
          {(["coin", "die", "twoDice", "spinner", "bag"] as const).map((k) => <option key={k} value={k}>{c[k]}</option>)}
        </select>
        {d.kind === "die" && (
          <label className="live-select">
            <span>{c.sides}</span>
            <select value={d.sides} onChange={(e) => setDevice({ kind: "die", sides: Number(e.target.value) })}>
              {DIE_SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
        {d.kind === "spinner" && (
          <label className="live-select">
            <span>{c.sections}</span>
            <Stepper value={d.sections} min={2} max={10} onChange={(sections) => setDevice({ kind: "spinner", sections })} less="−" more="+" />
          </label>
        )}
        {d.kind === "bag" &&
          d.counts.map((k, i) => {
            const total = d.counts.reduce((a, b) => a + b, 0);
            return (
              <span key={i} className="live-bag">
                <i style={{ background: BAG_COLORS[i] }} title={c[BAG_WORDS[i]]} />
                <Stepper
                  value={k}
                  min={total - k === 0 ? 1 : 0}
                  max={20}
                  onChange={(v) => setDevice({ kind: "bag", counts: d.counts.map((x, j) => (j === i ? v : x)) })}
                  less="−"
                  more="+"
                />
              </span>
            );
          })}
      </div>
      <div className="live-bar">
        {[1, 10, 100, 1000].map((m) => (
          <button key={m} className="live-btn primary" disabled={n >= MAX_TRIALS} onClick={() => run(m)}>×{m}</button>
        ))}
        <button className="live-btn" onClick={() => setDevice(d)}>{w.reset}</button>
        <span className="live-note">{fill(c.trials, { n: n.toLocaleString() })}</span>
        {state.last >= 0 && (
          <span className="live-chip" style={{ background: colors[state.last] }}>{c.last}: {labels[state.last]}</span>
        )}
      </div>
      <div className="live-bar">
        <Toggle on={state.view === "bars"} onClick={() => set({ ...state, view: "bars" })}>{c.bars}</Toggle>
        <Toggle on={state.view === "time"} onClick={() => set({ ...state, view: "time" })}>{c.overTime}</Toggle>
        {state.view === "bars" && <Toggle on={state.relative} onClick={() => set({ ...state, relative: !state.relative })}>{c.relative}</Toggle>}
        <Toggle on={state.theory} onClick={() => set({ ...state, theory: !state.theory })}>{c.theory}</Toggle>
      </div>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        {state.view === "bars" ? (
          <Bars state={state} labels={labels} colors={colors} p={p} counts={counts} n={n} onFocus={(focus) => set({ ...state, focus })} />
        ) : (
          <OverTime state={state} label={labels[state.focus] ?? ""} p={p[state.focus] ?? 0} />
        )}
      </svg>
      <p className="live-hint">{c.focus}</p>
    </>
  );
}

function Bars({ state, labels, colors, p, counts, n, onFocus }: { state: State; labels: string[]; colors: string[]; p: number[]; counts: number[]; n: number; onFocus: (i: number) => void }) {
  const rel = state.relative;
  const values = counts.map((k) => (rel ? (n ? k / n : 0) : k));
  const expected = p.map((q) => (rel ? q : q * n));
  const top = Math.max(rel ? 0.05 : 5, ...values, ...(state.theory ? expected : [])) * 1.15;
  const step = niceStep(top);
  const yMax = Math.ceil(top / step) * step;
  const y = (v: number) => H - B - (v / yMax) * (H - B - T);
  const k = values.length;
  const slot = (W - L - R) / k;
  const bw = Math.min(64, slot * 0.7);
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e9ecef" />
          <text x={L - 6} y={y(v) + 4} fontSize={12} textAnchor="end" fill="#868e96">{tick(v, step)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={INK} strokeWidth={1.5} />
      {values.map((v, i) => {
        const cx = L + slot * (i + 0.5);
        const focus = i === state.focus;
        return (
          <g key={i} style={{ cursor: "pointer" }} onClick={() => onFocus(i)}>
            <rect x={cx - slot / 2} y={T} width={slot} height={H - B - T} fill="transparent" />
            <rect x={cx - bw / 2} y={y(v)} width={bw} height={Math.max(0, H - B - y(v))} fill={colors[i]} stroke={focus ? INK : "#495057"} strokeWidth={focus ? 3 : 1} />
            {n > 0 && (
              <text x={cx} y={y(state.theory ? Math.max(v, expected[i]) : v) - 7} fontSize={k > 8 ? 10 : 12} textAnchor="middle" fill={INK}>
                {rel ? v.toFixed(2) : v}
              </text>
            )}
            {state.theory && (
              <line x1={cx - bw / 2 - 6} x2={cx + bw / 2 + 6} y1={y(expected[i])} y2={y(expected[i])} stroke="#e03131" strokeWidth={2.5} strokeDasharray="6 4" />
            )}
            <text x={cx} y={H - B + 20} fontSize={k > 8 ? 12 : 15} textAnchor="middle" fill={INK} fontWeight={focus ? 700 : 400}>{labels[i]}</text>
          </g>
        );
      })}
    </g>
  );
}

function OverTime({ state, label, p }: { state: State; label: string; p: number }) {
  const { n, counts, history } = state.tally;
  const N = Math.max(10, n);
  const x = (v: number) => L + (Math.log10(Math.max(1, v)) / Math.log10(N)) * (W - L - R);
  const series = [...history, ...(n && history[history.length - 1]?.n !== n ? [{ n, counts }] : [])].map((h) => ({ n: h.n, f: h.counts[state.focus] / h.n }));
  // Tall enough for p twice over and for the wobbles once there are ten trials (the very first ones jump to 0 or 1).
  const top = Math.min(1, Math.max(0.2, p * 2, ...series.filter((s) => s.n >= 10).map((s) => s.f * 1.1)));
  const step = niceStep(top);
  const yMax = Math.min(1, Math.ceil(top / step) * step);
  const y = (v: number) => H - B - (Math.min(v, yMax) / yMax) * (H - B - T);
  const points = series.map((s) => [x(s.n), y(s.f)]);
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const decades = Array.from({ length: Math.floor(Math.log10(N)) + 1 }, (_, i) => 10 ** i);
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e9ecef" />
          <text x={L - 6} y={y(v) + 4} fontSize={12} textAnchor="end" fill="#868e96">{tick(v, step)}</text>
        </g>
      ))}
      {decades.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={T} y2={H - B} stroke="#f1f3f5" />
          <text x={x(v)} y={H - B + 18} fontSize={12} textAnchor="middle" fill="#868e96">{v.toLocaleString()}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={INK} strokeWidth={1.5} />
      {state.theory && (
        <g>
          <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="#e03131" strokeWidth={2} strokeDasharray="6 4" />
          <text x={W - R - 4} y={y(p) - 6} fontSize={13} textAnchor="end" fill="#e03131">p = {fmt(Number(p.toFixed(4)))}</text>
        </g>
      )}
      {points.length > 1 && <polyline points={points.map((q) => q.join(",")).join(" ")} fill="none" stroke="#1971c2" strokeWidth={2.5} strokeLinejoin="round" />}
      {points.length > 0 && <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={4.5} fill="#1971c2" />}
      <text x={L} y={T - 4} fontSize={14} fill={INK}>{label}: {n ? (counts[state.focus] / n).toFixed(3) : "—"}</text>
    </g>
  );
}
