// The live pieces that need no heavy maths: a geared clock, dice, a spinner, a coin, fractions to shade, a ten frame
// with counters, a hundred square for patterns, dot multiplication, and towers of blocks or bars of fractions to
// compare. Each draws one SVG picture (what "Copy as a picture" copies) with its buttons around it, keeps what's
// mid-way (a drag, a roll) to itself, and hands the result to the board with `set`.
import {
  COMPARE_SIGNS,
  type Frac,
  FRACTION_FILLS,
  FRACTION_PARTS,
  fracNumbers,
  fracSign,
  halfSign,
  PENCIL_COLORS,
  SAME_PIECES_MAX,
  samePieces,
  tapSquare,
  towerSpan,
  viaHalf,
} from "../math/live";
import { Pencil, useJoin } from "./pencils";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

const RED = "#e03131";
export const SECTION_COLORS = ["#ffc9c9", "#ffec99", "#b2f2bb", "#a5d8ff", "#d0bfff", "#ffd8a8", "#eebefa", "#99e9f2", "#c0eb75", "#e9ecef"];
// ——— Fractions ———

// ——— Ten frame ———

// ——— Dot multiplication ———

// ——— Comparing two numbers ———


// ——— Comparing two fractions ———

const fracText = (f: Frac) => `${f.n}/${f.d}`;

/**
 * The towers again, for fractions: two bars of the same height, each cut into equal parts, with the shaded parts as
 * the tower. Click a part to shade up to it. "Join with pencils" fades the empty parts and slides the shaded ones to
 * the middle line, and the pencils draw the sign. "Same-size pieces" cuts both bars into the same parts, so 2/3 and
 * 3/4 are read as 8 and 9 twelfths. "Compare with 1/2" draws the half-way line across both bars and says which side of it
 * each fraction is on (2/5 < 1/2 < 3/4), or that the half does not decide when both are on the same side.
 */
export function CompareFractions({ state, set, w, svgRef }: PieceProps<"compareFractions">) {
  const { a, b } = state;
  const wc = w.compareFractions;
  const sign = fracSign(a, b);
  const { slide, pencils } = useJoin(state.joined);
  const same = samePieces(a, b);
  const canSame = same.d <= SAME_PIECES_MAX;
  const showSame = state.same && canSame;
  const half = !!state.half;

  const [bw, whole, floor, mid] = [64, 240, 286, 166];
  const bars = [
    { f: a, x: 50, key: "a" as const },
    { f: b, x: 266, key: "b" as const },
  ];
  const spans = bars.map(({ f }) => towerSpan(f.n, whole / f.d, floor, mid, slide));
  const setFrac = (key: "a" | "b", f: Frac) => set({ ...state, [key]: fracNumbers(f), guess: null });
  const bar = ({ f, x, key }: (typeof bars)[number], i: number) => {
    const part = whole / f.d;
    const [top, bottom] = spans[i];
    const empty = f.d - f.n;
    return (
      <g key={key}>
        {/* The empty parts above the shaded ones, fading out as the shaded parts slide to the middle. */}
        <g opacity={1 - slide}>
          {Array.from({ length: empty }, (_, j) => (
            <rect
              key={`e${j}`}
              x={x}
              y={top - (j + 1) * part}
              width={bw}
              height={part}
              fill="#fff"
              stroke={INK}
              strokeWidth={2}
              style={{ cursor: slide === 0 ? "pointer" : undefined }}
              onClick={() => slide === 0 && setFrac(key, { ...f, n: f.n + j + 1 })}
            />
          ))}
        </g>
        {Array.from({ length: f.n }, (_, j) => (
          <rect
            key={`s${j}`}
            x={x}
            y={top + (f.n - 1 - j) * part}
            width={bw}
            height={part}
            fill={FRACTION_FILLS[i]}
            stroke={INK}
            strokeWidth={2}
            style={{ cursor: "pointer" }}
            onClick={() => setFrac(key, { ...f, n: tapSquare(f.n, j) })}
          />
        ))}
        {showSame &&
          Array.from({ length: same.d - 1 }, (_, k) => {
            const y = bottom - ((k + 1) * whole) / same.d;
            return <line key={`c${k}`} x1={x + 2} y1={y} x2={x + bw - 2} y2={y} stroke="#495057" strokeWidth={1} strokeDasharray="3 3" opacity={y < top - 0.5 ? 1 - slide : 1} pointerEvents="none" />;
          })}
        {showSame && (
          <text x={x + bw / 2} y={26} fontSize={16} textAnchor="middle" fill="#495057">= {fracText({ n: i === 0 ? same.a : same.b, d: same.d })}</text>
        )}
      </g>
    );
  };
  // The middle card: the guess, coloured right or wrong; once the pencils are down and there is no guess, the sign.
  const shown = state.guess ?? (pencils === 1 ? sign : "?");
  const cardFill = state.guess ? (state.guess === sign ? "#b2f2bb" : "#ffc9c9") : pencils === 1 ? "#a5d8ff" : "#f1f3f5";
  const sentence = fill(w.compare[sign === "<" ? "lt" : sign === ">" ? "gt" : "eq"], { a: fracText(a), b: fracText(b) });
  const fracCard = (cx: number, f: Frac) => (
    <g>
      <rect x={cx - 40} y={300} width={80} height={84} rx={4} fill="#d8f5a2" stroke="#adb5bd" />
      <text x={cx} y={334} fontSize={30} textAnchor="middle" fill={INK}>{f.n}</text>
      <line x1={cx - 20} y1={342} x2={cx + 20} y2={342} stroke={INK} strokeWidth={2.5} />
      <text x={cx} y={374} fontSize={30} textAnchor="middle" fill={INK}>{f.d}</text>
    </g>
  );
  // Each fraction against the half, and what that says about the two.
  const halfLine = (f: Frac) => {
    const s = halfSign(f);
    return fill(wc[s === "<" ? "halfBelow" : s === ">" ? "halfAbove" : "halfEqual"], { f: fracText(f), n: f.n, t: 2 * f.n, d: f.d });
  };
  const chain = viaHalf(a, b);
  const halfSays = [halfLine(a), halfLine(b), chain ? fill(wc.halfDecides, { chain: `${fracText(a)} ${chain[0]} 1/2 ${chain[1]} ${fracText(b)}` }) : wc.halfUndecided].join(" ");
  const random = () => {
    if (half) {
      // One below a half and one above, in either order.
      const d = 3 + Math.floor(Math.random() * 10);
      const e = 3 + Math.floor(Math.random() * 10);
      const lo = { n: 1 + Math.floor(Math.random() * (Math.ceil(d / 2) - 1)), d };
      const hi = { n: Math.floor(e / 2) + 1 + Math.floor(Math.random() * (e - 1 - Math.floor(e / 2))), d: e };
      const [na, nb] = Math.random() < 0.5 ? [lo, hi] : [hi, lo];
      return set({ ...state, a: na, b: nb, joined: false, guess: null });
    }
    const pick = () => {
      const d = 2 + Math.floor(Math.random() * 9);
      return { n: 1 + Math.floor(Math.random() * (d - 1)), d };
    };
    const na = pick();
    // Now and then the same amount cut differently, for =.
    const k = 2 + Math.floor(Math.random() * 2);
    const nb = Math.random() < 0.25 && na.d * k <= FRACTION_PARTS ? { n: na.n * k, d: na.d * k } : pick();
    set({ ...state, a: na, b: nb, joined: false, guess: null });
  };
  return (
    <>
      <svg ref={svgRef} width={380} height={390} viewBox="0 0 380 390" fontFamily={FONT}>
        {bars.map(bar)}
        {/* Half-way up both bars; it fades as the shaded parts slide to the middle. */}
        {half && (
          <g opacity={1 - slide} pointerEvents="none">
            <line x1={42} y1={floor - whole / 2} x2={338} y2={floor - whole / 2} stroke={RED} strokeWidth={2} strokeDasharray="8 5" />
            <text x={190} y={floor - whole / 2 - 8} fontSize={18} fontWeight={700} textAnchor="middle" fill={RED}>1/2</text>
          </g>
        )}
        <Pencil from={[114, spans[0][0]]} to={[266, spans[1][0]]} color={PENCIL_COLORS[0]} k={pencils} />
        <Pencil from={[114, spans[0][1]]} to={[266, spans[1][1]]} color={PENCIL_COLORS[1]} k={pencils} />
        {fracCard(82, a)}
        <rect x={158} y={305} width={64} height={74} rx={4} fill={cardFill} stroke="#adb5bd" />
        <text x={190} y={357} fontSize={42} textAnchor="middle" fill={INK}>{shown}</text>
        {fracCard(298, b)}
      </svg>
      <div className="live-bar">
        <Stepper value={a.n} min={0} max={a.d} onChange={(n) => setFrac("a", { ...a, n })} less={wc.shadeLess} more={wc.shadeMore} />
        {COMPARE_SIGNS.map((s) => (
          <Toggle key={s} on={state.guess === s} title={fill(w.compare[s === "<" ? "lt" : s === ">" ? "gt" : "eq"], { a: fracText(a), b: fracText(b) })} onClick={() => set({ ...state, guess: s })}>
            <b className="live-sign">{s}</b>
          </Toggle>
        ))}
        <Stepper value={b.n} min={0} max={b.d} onChange={(n) => setFrac("b", { ...b, n })} less={wc.shadeLess} more={wc.shadeMore} />
      </div>
      <div className="live-bar">
        <Stepper value={a.d} min={1} max={FRACTION_PARTS} onChange={(d) => setFrac("a", { n: Math.min(a.n, d), d })} less={wc.fewerParts} more={wc.moreParts} />
        <span className="live-note">{wc.parts}</span>
        <Stepper value={b.d} min={1} max={FRACTION_PARTS} onChange={(d) => setFrac("b", { n: Math.min(b.n, d), d })} less={wc.fewerParts} more={wc.moreParts} />
      </div>
      <div className="live-bar">
        <Toggle on={state.joined} onClick={() => set({ ...state, joined: !state.joined })}>✏️ {w.compare.join}</Toggle>
        <Toggle on={showSame} title={canSame ? undefined : wc.tooMany} onClick={() => canSame && set({ ...state, same: !state.same })}>✂️ {wc.same}</Toggle>
        <Toggle on={half} onClick={() => set({ ...state, half: !half })}>½ {wc.half}</Toggle>
        <button className="live-btn" title={wc.random} aria-label={wc.random} onClick={random}>🎲</button>
      </div>
      <p className="live-hint">
        {state.guess && state.guess !== sign
          ? `${wc.wrong}${state.joined ? "" : ` ${wc.tryPencils}`}`
          : state.guess || pencils === 1
            ? `${state.guess ? `${w.compare.right} ` : ""}${sentence}.${pencils === 1 ? ` ${sign === "=" ? wc.parallel : w.compare.opens}` : ""}`
            : wc.hint}
      </p>
      {showSame && (
        <p className="live-hint">{fill(wc.sameSays, { a: fracText(a), b: fracText(b), x: same.a, y: same.b, d: same.d })}</p>
      )}
      {half && <p className="live-hint">{halfSays}</p>}
    </>
  );
}
