// Squeeze the root. A number line cut into ten pieces, each tick's square shown as a dot: blue while it is less than n,
// red once it is more. Tap the piece where blue turns red and the line zooms into it, ten times finer: one more decimal
// place of √n. For 2.25 a tick lands exactly on it (1.5² = 2.25) and the root stops: rational. For 2 the colours keep
// changing between two ticks however far you zoom: the decimals never stop or repeat, irrational.
import { exactAt, holds, ROOT_NS, ROOT_PLACES, zoomOf } from "../math/realNumbers";
import { BLUE, GREEN, keyTap, RED, Tabs, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
const X0 = 40;
const SEG = 60;
const LINE_Y = 190;
const SAY_Y = 330;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";

/** A number to as many places as the zoom has reached, with the decimal point written as a point. */
const at = (v: number, places: number) => v.toFixed(Math.max(0, places));
const nName = (n: number) => String(n);

export function RootZoom({ state, set, w: words, svgRef }: PieceProps<"rootZoom">) {
  const w = words.rootZoom;
  const { n, digits } = state;
  const places = Math.max(0, digits.length - 1);
  const { lo, step } = zoomOf(digits);
  const exact = exactAt(n, digits);
  const done = exact || digits.length > ROOT_PLACES;
  const ticks = Array.from({ length: 11 }, (_, j) => lo + j * step);
  const tickPlaces = digits.length;

  const tap = (j: number) => {
    if (done) return;
    if (holds(n, ticks[j], step)) set({ ...state, digits: [...digits, j], miss: null });
    else set({ ...state, miss: j });
  };
  const sofar = digits.length === 0 ? "?" : at(lo, places) + (exact ? "" : "…");
  const miss = state.miss;
  const say = done
    ? wrapWords(exact ? fill(w.exact, { n: nName(n), v: at(lo, places) }) : fill(w.forever, { n: nName(n), v: at(lo, places) }), 74)
    : miss !== null
      ? wrapWords(fill(w.wrong, { a: at(ticks[miss], tickPlaces), b: at(ticks[miss + 1], tickPlaces), n: nName(n), lo: (ticks[miss] ** 2).toFixed(Math.min(8, 2 * tickPlaces)), hi: (ticks[miss + 1] ** 2).toFixed(Math.min(8, 2 * tickPlaces)) }), 74)
      : wrapWords(fill(digits.length === 0 ? w.start : w.zoom, { n: nName(n) }), 74);
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={[`√${n} ≈ ${sofar}`, ...say].join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={ROOT_NS.map(String)} on={String(n)} names={Object.fromEntries(ROOT_NS.map((v) => [String(v), `√${v}`]))}
          onPick={(v) => set({ n: Number(v), digits: [], miss: null })} />
        <text x={W / 2} y={92} fontSize={34} fontWeight={700} textAnchor="middle" fill={done ? (exact ? GREEN : ORANGE) : INK}>√{nName(n)} ≈ {sofar}</text>
        {/* The ten pieces of the line, each a tap target; the one tapped wrongly shaded red. */}
        {ticks.slice(0, 10).map((x, j) => (
          <g key={j} role="button" tabIndex={done ? -1 : 0} aria-label={fill(w.pieceName, { a: at(x, tickPlaces), b: at(x + step, tickPlaces) })} onPointerDown={(e) => e.stopPropagation()} onClick={() => tap(j)} onKeyDown={(e) => keyTap(e, () => tap(j))}
            style={{ cursor: done ? "default" : "pointer" }}>
            <rect x={X0 + j * SEG} y={LINE_Y - 34} width={SEG} height={68} fill={miss === j ? RED : BLUE} fillOpacity={miss === j ? 0.12 : 0.0001} />
          </g>
        ))}
        <line x1={X0} y1={LINE_Y} x2={X0 + 10 * SEG} y2={LINE_Y} stroke={INK} strokeWidth={3} pointerEvents="none" />
        {ticks.map((x, j) => {
          const sq = x * x;
          const color = Math.abs(sq - n) < 1e-9 ? GREEN : sq < n ? BLUE : RED;
          return (
            <g key={j} pointerEvents="none">
              <line x1={X0 + j * SEG} y1={LINE_Y - 9} x2={X0 + j * SEG} y2={LINE_Y + 9} stroke={INK} strokeWidth={2} />
              <circle cx={X0 + j * SEG} cy={LINE_Y - 22} r={7} fill={color} />
              <text x={X0 + j * SEG} y={LINE_Y + 28} fontSize={tickPlaces > 3 ? 10 : 13} textAnchor="middle" fill={INK} transform={tickPlaces > 2 ? `rotate(-35 ${X0 + j * SEG} ${LINE_Y + 28})` : undefined}>{at(x, tickPlaces)}</text>
            </g>
          );
        })}
        <text x={X0} y={LINE_Y + 70} fontSize={14} fill={BLUE} fontWeight={700}>● {fill(w.less, { n: nName(n) })}</text>
        <text x={X0 + 230} y={LINE_Y + 70} fontSize={14} fill={RED} fontWeight={700}>● {fill(w.more, { n: nName(n) })}</text>
        <text x={X0 + 460} y={LINE_Y + 70} fontSize={14} fill={GREEN} fontWeight={700}>● {fill(w.equal, { n: nName(n) })}</text>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
