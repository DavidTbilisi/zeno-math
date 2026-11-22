// The chance experiment on the board: a coin, a die, two dice, a spinner or a bag of counters, run once or a thousand
// times at a click. The bars show what came up (as counts or relative frequencies) against what theory expects;
// "Over time" follows one outcome's relative frequency as the trials pile up, on a log scale, settling on p.
// Worked by hand: a tray of the five things to throw, the chosen one drawn big to tap for one go and hold for more and
// more; wheels for the die's sides, the spinner's sections and the counters in the bag; a bin to clear the results.
import { BAG_COLORS, DIE_SIDES, emptyTally, MAX_TRIALS, outcomes, runTrials, type Device, type LiveStates, type Tally } from "../math/live";
import { Bin, keyTap, NumBox, Pill, Tabs, useHold, wrapWords } from "./hand";
import { SECTION_COLORS } from "./sectors";
import { fill, FONT, INK, type PieceProps } from "./ui";

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

const KINDS = ["coin", "die", "twoDice", "spinner", "bag"] as const;
const FRESH: Record<Device["kind"], Device> = {
  coin: { kind: "coin" }, die: { kind: "die", sides: 6 }, twoDice: { kind: "twoDice" }, spinner: { kind: "spinner", sections: 4 },
  bag: { kind: "bag", counts: [3, 2, 1, 0] },
};
const SW = 660;
const SH = 192;
/** The thing thrown, drawn big: its centre. */
const DX = 450;
const DY = 68;

export function Chance({ state, set, w, svgRef }: PieceProps<"chance">) {
  const c = w.chance;
  const d = state.device;
  const { labels: rawLabels, p } = outcomes(d, { heads: w.coin.heads, tails: w.coin.tails });
  const labels = d.kind === "bag" ? BAG_WORDS.map((k) => c[k]) : rawLabels;
  const colors = p.map((_, i) => (d.kind === "bag" ? BAG_COLORS[i] : d.kind === "spinner" ? SECTION_COLORS[i % SECTION_COLORS.length] : "#74c0fc"));

  const setDevice = (device: Device) => {
    const k = outcomes(device, { heads: "", tails: "" }).p.length;
    set({ ...state, device, tally: emptyTally(k), focus: startFocus(device), last: -1 });
  };
  type Run = { tally: Tally; last: number };
  const { shown, hand } = useHold<Run>(
    { tally: state.tally, last: state.last }, (r, m) => runTrials(r.tally, d, m, Math.random), (r) => MAX_TRIALS - r.tally.n,
    (r) => set({ ...state, ...r }), fill(c.tap, { device: c[d.kind] }),
  );
  const { n, counts } = shown.tally;
  const last = shown.last;
  const now = { ...state, ...shown };
  const total = d.kind === "bag" ? d.counts.reduce((a, b) => a + b, 0) : 0;
  const relW = Math.max(60, c.relative.length * 13 * 0.6 + 24);

  return (
    <>
      <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="hand-pic" fontFamily={FONT}>
        {KINDS.map((k, i) => (
          <Tile key={k} x={8 + i * 66} y={6} kind={k} on={d.kind === k} name={c[k]} onTap={() => d.kind !== k && setDevice(FRESH[k])} />
        ))}
        {d.kind === "die" && (
          <>
            <text x={12} y={104} fontSize={12} fill="#495057">{c.sides}</text>
            <NumBox x={8} y={108} w={70} h={38} size={18} label={c.sides} value={DIE_SIDES.indexOf(d.sides)} min={0} max={DIE_SIDES.length - 1}
              show={(i) => String(DIE_SIDES[i])} onChange={(i) => setDevice({ kind: "die", sides: DIE_SIDES[i] })} />
          </>
        )}
        {d.kind === "spinner" && (
          <>
            <text x={12} y={104} fontSize={12} fill="#495057">{c.sections}</text>
            <NumBox x={8} y={108} w={70} h={38} size={18} label={c.sections} value={d.sections} min={2} max={10}
              onChange={(sections) => setDevice({ kind: "spinner", sections })} />
          </>
        )}
        {d.kind === "bag" &&
          d.counts.map((k, i) => (
            <g key={i}>
              <circle cx={22 + i * 76} cy={127} r={9} fill={BAG_COLORS[i]} />
              <NumBox x={34 + i * 76} y={108} w={44} h={38} size={18} label={c[BAG_WORDS[i]]} value={k} min={total - k === 0 ? 1 : 0} max={20}
                onChange={(v) => setDevice({ kind: "bag", counts: d.counts.map((x, j) => (j === i ? v : x)) })} />
            </g>
          ))}
        <Thrown d={d} last={last} labels={labels} colors={colors} hand={hand} />
        <text x={DX} y={146} fontSize={14} textAnchor="middle" fill={INK}>
          {last >= 0 ? `${c.last}: ${labels[last]} · ` : ""}{fill(c.trials, { n: n.toLocaleString() })}
        </text>
        <Bin x={SW - 96} y={6} w={88} h={66} hot={false} label={c.clear} title={c.clearTitle} onTap={() => setDevice(d)} />
        <Tabs x={8} y={158} keys={["bars", "time"] as const} on={state.view} names={{ bars: c.bars, time: c.overTime }}
          onPick={(view) => set({ ...state, view })} />
        {state.view === "bars" && (
          <Pill x={210} y={158} w={relW} h={28} size={14} text={c.relative} on={state.relative} onTap={() => set({ ...state, relative: !state.relative })} />
        )}
        <Pill x={state.view === "bars" ? 216 + relW : 210} y={158} w={90} h={28} size={14} text={c.theory} on={state.theory}
          onTap={() => set({ ...state, theory: !state.theory })} />
      </svg>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <rect width={W} height={H} fill="#fff" />
        {state.view === "bars" ? (
          <Bars state={now} labels={labels} colors={colors} p={p} counts={counts} n={n} onFocus={(focus) => set({ ...state, focus })} />
        ) : (
          <OverTime state={now} label={labels[state.focus] ?? ""} p={p[state.focus] ?? 0} />
        )}
      </svg>
      <p className="live-hint">{c.focus}</p>
    </>
  );
}

/** One of the things to throw, in the tray: a small picture and its name; tapped, it is the one thrown. */
function Tile({ x, y, kind, on, name, onTap }: { x: number; y: number; kind: Device["kind"]; on: boolean; name: string; onTap: () => void }) {
  const cx = x + 30;
  const cy = y + 26;
  return (
    <g role="button" tabIndex={0} aria-label={name} aria-pressed={on} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
      onClick={onTap} onKeyDown={(e) => keyTap(e, onTap)}>
      <title>{name}</title>
      <rect x={x} y={y} width={60} height={84} rx={10} fill={on ? "#e7f5ff" : "#fff"} stroke={on ? BLUE : "#ced4da"} strokeWidth={on ? 2.5 : 1.5} />
      <g pointerEvents="none">
        <Icon kind={kind} cx={cx} cy={cy} s={34} />
        {wrapWords(name, 11).slice(0, 2).map((l, i) => (
          <text key={i} x={cx} y={y + 60 + i * 12} fontSize={10.5} textAnchor="middle" fill={INK}>{l}</text>
        ))}
      </g>
    </g>
  );
}

const BLUE = "#1971c2";
const COIN = { fill: "#ffd43b", edge: "#f59f00" };

/** A small picture of a kind of thing, about `s` across. */
function Icon({ kind, cx, cy, s }: { kind: Device["kind"]; cx: number; cy: number; s: number }) {
  const r = s / 2;
  switch (kind) {
    case "coin":
      return <circle cx={cx} cy={cy} r={r * 0.9} fill={COIN.fill} stroke={COIN.edge} strokeWidth={2} />;
    case "die":
      return <DieFace x={cx - r * 0.85} y={cy - r * 0.85} s={s * 0.85} v={5} />;
    case "twoDice":
      return (
        <>
          <DieFace x={cx - r} y={cy - r * 0.9} s={s * 0.6} v={3} />
          <DieFace x={cx - r * 0.1} y={cy - r * 0.2} s={s * 0.6} v={4} />
        </>
      );
    case "spinner":
      return <Wheel cx={cx} cy={cy} r={r * 0.9} k={4} />;
    case "bag":
      return <Bag cx={cx} cy={cy} s={s} counts={[3, 2, 1, 0]} />;
  }
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

/** A die's face: pips for 1 to 6, the number written for more, nothing for 0. */
function DieFace({ x, y, s, v, faded }: { x: number; y: number; s: number; v: number; faded?: boolean }) {
  return (
    <g opacity={faded ? 0.45 : 1}>
      <rect x={x} y={y} width={s} height={s} rx={s / 6} fill="#fff" stroke={INK} strokeWidth={Math.max(1.5, s / 30)} />
      {PIPS[v]
        ? PIPS[v].map(([fx, fy], i) => <circle key={i} cx={x + fx * s} cy={y + fy * s} r={s / 11} fill={INK} />)
        : v > 0 && <text x={x + s / 2} y={y + s * 0.66} fontSize={s * 0.46} fontWeight={700} textAnchor="middle" fill={INK}>{v}</text>}
    </g>
  );
}

/** A spinner of k equal sections; with `at`, its arrow points into that section. */
function Wheel({ cx, cy, r, k, at }: { cx: number; cy: number; r: number; k: number; at?: number }) {
  const pt = (deg: number, rr = r) => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)];
  const step = 360 / k;
  const aim = at === undefined ? -90 : -90 + (at + 0.5) * step;
  const [tx, ty] = pt(aim, r * 0.78);
  return (
    <g>
      {Array.from({ length: k }, (_, i) => {
        const [x1, y1] = pt(-90 + i * step);
        const [x2, y2] = pt(-90 + (i + 1) * step);
        return <path key={i} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={SECTION_COLORS[i % SECTION_COLORS.length]} stroke="#fff" />;
      })}
      <line x1={cx} y1={cy} x2={tx} y2={ty} stroke={INK} strokeWidth={Math.max(2, r / 14)} strokeLinecap="round" />
      <circle cx={tx} cy={ty} r={Math.max(2, r / 12)} fill={INK} />
      <circle cx={cx} cy={cy} r={Math.max(2.5, r / 10)} fill={INK} />
    </g>
  );
}

/** A bag of counters: up to 24 of them shown inside it, in the bag's mix. */
function Bag({ cx, cy, s, counts, out }: { cx: number; cy: number; s: number; counts: number[]; out?: number }) {
  const r = s / 2;
  const dots = counts.flatMap((k, i) => Array<number>(k).fill(i));
  const shown = dots.length > 24 ? Array.from({ length: 24 }, (_, j) => dots[Math.floor((j * dots.length) / 24)]) : dots;
  const per = Math.ceil(Math.sqrt(shown.length || 1));
  const cell = (r * 1.1) / per;
  return (
    <g>
      <path d={`M${cx - r * 0.45} ${cy - r * 0.75} Q${cx - r} ${cy - r * 0.2} ${cx - r * 0.95} ${cy + r * 0.55} Q${cx - r * 0.9} ${cy + r}
        ${cx} ${cy + r} Q${cx + r * 0.9} ${cy + r} ${cx + r * 0.95} ${cy + r * 0.55} Q${cx + r} ${cy - r * 0.2} ${cx + r * 0.45} ${cy - r * 0.75} Z`}
        fill="#f1e3c8" stroke="#a5784a" strokeWidth={Math.max(1.5, s / 40)} />
      <path d={`M${cx - r * 0.5} ${cy - r * 0.78} h${r}`} stroke="#a5784a" strokeWidth={Math.max(2, s / 25)} strokeLinecap="round" />
      {shown.map((i, j) => (
        <circle key={j} cx={cx - (per - 1) * cell * 0.5 + (j % per) * cell} cy={cy - r * 0.1 + Math.floor(j / per) * cell - ((per - 1) * cell) / 2 + r * 0.25}
          r={cell * 0.38} fill={BAG_COLORS[i]} opacity={out === undefined ? 1 : 0.55} />
      ))}
    </g>
  );
}

/** The thing thrown, drawn big with what came up last: tapped for one go, held for more and more. */
function Thrown({ d, last, labels, colors, hand }: {
  d: Device; last: number; labels: string[]; colors: string[]; hand: ReturnType<typeof useHold>["hand"];
}) {
  const got = last >= 0;
  let pic;
  switch (d.kind) {
    case "coin":
      pic = (
        <>
          <circle cx={DX} cy={DY} r={50} fill={COIN.fill} stroke={COIN.edge} strokeWidth={4} />
          <circle cx={DX} cy={DY} r={40} fill="none" stroke={COIN.edge} strokeWidth={1.5} />
          <text x={DX} y={DY + 7} fontSize={got ? 19 : 30} fontWeight={700} textAnchor="middle" fill="#7a4d00">{got ? labels[last] : "?"}</text>
        </>
      );
      break;
    case "die":
      pic = <DieFace x={DX - 48} y={DY - 48} s={96} v={got ? Number(labels[last]) : 0} />;
      if (!got) pic = <>{pic}<text x={DX} y={DY + 12} fontSize={34} fontWeight={700} textAnchor="middle" fill={INK}>?</text></>;
      if (d.sides !== 6) pic = <>{pic}<text x={DX + 42} y={DY + 42} fontSize={11} textAnchor="end" fill="#868e96">{`1–${d.sides}`}</text></>;
      break;
    case "twoDice":
      pic = (
        <>
          <DieFace x={DX - 84} y={DY - 50} s={70} v={0} faded={!got} />
          <DieFace x={DX + 14} y={DY - 50} s={70} v={0} faded={!got} />
          <text x={DX - 49} y={DY - 6} fontSize={28} fontWeight={700} textAnchor="middle" fill="#adb5bd">?</text>
          <text x={DX + 49} y={DY - 6} fontSize={28} fontWeight={700} textAnchor="middle" fill="#adb5bd">?</text>
          <text x={DX} y={DY + 50} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>{`Σ = ${got ? labels[last] : "?"}`}</text>
        </>
      );
      break;
    case "spinner":
      pic = <Wheel cx={DX} cy={DY} r={58} k={d.sections} at={got ? last : undefined} />;
      break;
    case "bag":
      pic = (
        <>
          <Bag cx={DX - 22} cy={DY + 6} s={104} counts={d.counts} out={got ? last : undefined} />
          {got && <circle cx={DX + 52} cy={DY - 36} r={17} fill={colors[last]} stroke={INK} strokeWidth={2.5} />}
        </>
      );
      break;
  }
  return (
    <g role="button" tabIndex={0} aria-label={hand.label} style={{ cursor: "pointer" }} {...hand.props}>
      <title>{hand.label}</title>
      <rect x={DX - 70} y={DY - 64} width={140} height={128} rx={14} fill={hand.hot ? "#ebfbee" : "transparent"}
        stroke={hand.hot ? "#2f9e44" : "none"} strokeWidth={2.5} />
      {pic}
    </g>
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
