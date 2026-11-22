// Two fraction bars over two fraction cards, worked by hand. Tap a part to shade the bar up to it, or drag along a
// bar to paint it; the numbers on a card are dragged (or tapped at the top and bottom) for the shaded parts and the
// parts. The signs lie below: drag one between the cards (or tap it) to say which fraction is bigger, drag it out to
// take it away. Three tools lie along the top and are tapped, or dragged onto the bars: the pencils slide the shaded
// parts to a middle line and join them, which draws the sign; the scissors cut both bars into same-size pieces; the
// half-way line says which side of 1/2 each fraction is on. The die deals two new fractions.
import { type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  COMPARE_SIGNS,
  FRACTION_FILLS,
  FRACTION_PARTS,
  fracNumbers,
  fracSign,
  halfSign,
  PENCIL_COLORS,
  SAME_PIECES_MAX,
  samePieces,
  shadeUpTo,
  tapSquare,
  towerSpan,
  viaHalf,
  type CompareSign,
  type Frac,
  type Tower,
} from "../math/live";
import { SignCard } from "./Compare";
import { BLUE, DieButton, inBox, keyTap, NumBox, pointIn, RED, useDrag } from "./hand";
import { Pencil, PencilBox, useJoin } from "./pencils";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 380;
const BW = 64;
const WHOLE = 240;
const TOP = 72;
const FLOOR = TOP + WHOLE;
const MID = 192;
const CARD_Y = 326;
const CARD_H = 92;
const SIGN_Y = CARD_Y + CARD_H + 12;
const H = SIGN_Y + 56;
const BARS = [
  { key: "a" as const, x: 50, cx: 82 },
  { key: "b" as const, x: 266, cx: 298 },
];
const PENCILS = { x: 6, y: 4, w: 92, h: 36 };
const SCISSORS = { x: 106, y: 4, w: 56, h: 36 };
const HALF = { x: 170, y: 4, w: 56, h: 36 };
const MIDDLE = { x: 158, y: CARD_Y + 9, w: 64, h: 74 };
const ON_BARS = { x: 30, y: TOP - 30, w: W - 60, h: FLOOR - TOP + 30 };
const signX = (i: number) => 190 + (i - 1) * 56;
const fracText = (f: Frac) => `${f.n}/${f.d}`;

type Tool = "pencils" | "scissors" | "half";
type Drag = { from: "bar"; t: Tower; tapped: number } | { from: "sign"; s: CompareSign } | { from: "guess" } | { from: "tool"; tool: Tool };

/** A tool in its box along the top: on (laid on the bars) or off, and greyed when it cannot be used. */
function ToolBox({ r, on, off, label, onPress, onKey, children }: {
  r: typeof SCISSORS; on: boolean; off?: boolean; label: string; onPress: (e: ReactPointerEvent) => void; onKey: () => void; children: ReactNode;
}) {
  return (
    <g role="button" tabIndex={0} aria-label={label} aria-pressed={on} aria-disabled={off || undefined} style={{ cursor: off ? "not-allowed" : "grab" }}
      opacity={off ? 0.4 : 1} onPointerDown={onPress} onKeyDown={(e) => keyTap(e, onKey)}>
      <title>{label}</title>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill={on ? "#e7f5ff" : "#fff"} stroke={on ? BLUE : "#ced4da"} strokeDasharray={on ? undefined : "5 4"} />
      {children}
    </g>
  );
}

export function CompareFractions({ state, set, w, svgRef }: PieceProps<"compareFractions">) {
  const { a, b } = state;
  const wc = w.compareFractions;
  const sign = fracSign(a, b);
  const { slide, pencils } = useJoin(state.joined);
  const same = samePieces(a, b);
  const canSame = same.d <= SAME_PIECES_MAX;
  const showSame = state.same && canSame;
  const half = !!state.half;
  const spans = BARS.map(({ key }) => towerSpan(state[key].n, WHOLE / state[key].d, FLOOR, MID, slide));
  const say = (s: CompareSign) => fill(w.compare[s === "<" ? "lt" : s === ">" ? "gt" : "eq"], { a: fracText(a), b: fracText(b) });
  const nameOf = (t: Tower) => (t === "a" ? w.compare.first : w.compare.second);

  const setFrac = (t: Tower, f: Frac) => {
    const next = fracNumbers(f);
    if (next.n !== state[t].n || next.d !== state[t].d) set({ ...state, [t]: next, guess: null });
  };
  const toggle = (tool: Tool, to?: boolean) => {
    if (tool === "pencils") return set({ ...state, joined: to ?? !state.joined });
    if (tool === "scissors") return canSame && set({ ...state, same: to ?? !state.same });
    set({ ...state, half: to ?? !half });
  };
  const deal = () => {
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

  // A drag along a bar paints it up to the pointer; a tap on a part shades up to it (or, on the top shaded part, one fewer).
  const paint = (t: Tower, y: number) => setFrac(t, { ...state[t], n: shadeUpTo(y, FLOOR, WHOLE, state[t].d) });
  const { drag, begin, svgProps } = useDrag<Drag>(
    (d) => {
      const onMiddle = inBox(MIDDLE, d.x, d.y);
      switch (d.from) {
        case "bar":
          if (!d.moved) return setFrac(d.t, { ...state[d.t], n: d.tapped <= state[d.t].n ? tapSquare(state[d.t].n, d.tapped - 1) : d.tapped });
          return paint(d.t, d.y);
        case "sign":
          if (!d.moved || onMiddle) set({ ...state, guess: d.s });
          return;
        case "guess":
          if (d.moved && !onMiddle) set({ ...state, guess: null });
          return;
        case "tool":
          if (!d.moved) return toggle(d.tool);
          if (inBox(ON_BARS, d.x, d.y)) toggle(d.tool, true);
      }
    },
    (d) => d.from === "bar" && d.moved && paint(d.t, d.y),
  );
  const press = (e: ReactPointerEvent, d: Drag) => begin(e, d);
  const held = drag?.moved ? drag : null;
  const overMiddle = !!held && (held.from === "sign" || held.from === "guess") && inBox(MIDDLE, held.x, held.y);
  const toolOver = held?.from === "tool" && inBox(ON_BARS, held.x, held.y);
  const barKeys = (e: KeyboardEvent, t: Tower) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    setFrac(t, { ...state[t], n: state[t].n + by });
  };

  const bar = ({ key, x }: (typeof BARS)[number], i: number) => {
    const f = state[key];
    const part = WHOLE / f.d;
    const [top, bottom] = spans[i];
    const label = fill(wc.bar, { t: nameOf(key), n: f.n, d: f.d });
    return (
      <g key={key} role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={f.d} aria-valuenow={f.n} aria-valuetext={fracText(f)}
        onKeyDown={(e) => barKeys(e, key)}>
        {/* The empty parts above the shaded ones, fading out as the shaded parts slide to the middle. */}
        <g opacity={1 - slide}>
          {Array.from({ length: f.d - f.n }, (_, j) => (
            <rect key={`e${j}`} x={x} y={top - (j + 1) * part} width={BW} height={part} fill="#fff" stroke={INK} strokeWidth={2} />
          ))}
        </g>
        {Array.from({ length: f.n }, (_, j) => (
          <rect key={`s${j}`} x={x} y={top + (f.n - 1 - j) * part} width={BW} height={part} fill={FRACTION_FILLS[i]} stroke={INK} strokeWidth={2} />
        ))}
        {showSame &&
          Array.from({ length: same.d - 1 }, (_, k) => {
            const y = bottom - ((k + 1) * WHOLE) / same.d;
            return <line key={`c${k}`} x1={x + 2} y1={y} x2={x + BW - 2} y2={y} stroke="#495057" strokeWidth={1} strokeDasharray="3 3" opacity={y < top - 0.5 ? 1 - slide : 1} pointerEvents="none" />;
          })}
        {showSame && (
          <text x={x + BW / 2} y={TOP - 10} fontSize={16} textAnchor="middle" fill="#495057" pointerEvents="none">= {fracText({ n: i === 0 ? same.a : same.b, d: same.d })}</text>
        )}
        {/* Where the bar is pressed: the whole bar while it stands on the floor, painted or tapped part by part. */}
        {slide === 0 && (
          <rect x={x - 10} y={TOP} width={BW + 20} height={WHOLE} fill="transparent" style={{ cursor: "ns-resize" }}
            onPointerDown={(e) => {
              const [, y] = pointIn(e);
              press(e, { from: "bar", t: key, tapped: Math.max(1, shadeUpTo(y, FLOOR, WHOLE, f.d)) });
            }} />
        )}
      </g>
    );
  };

  // The middle card: the guess, coloured right or wrong; once the pencils are down and there is no guess, the sign.
  const guessHeld = held?.from === "guess";
  const shown = state.guess && !guessHeld ? state.guess : pencils === 1 ? sign : "?";
  const cardFill = state.guess && !guessHeld ? (state.guess === sign ? "#b2f2bb" : "#ffc9c9") : pencils === 1 ? "#a5d8ff" : "#f1f3f5";
  const fracCard = ({ key, cx }: (typeof BARS)[number]) => {
    const f = state[key];
    return (
      <g key={key}>
        <rect x={cx - 44} y={CARD_Y} width={88} height={CARD_H} rx={4} fill="#d8f5a2" stroke="#adb5bd" />
        <NumBox x={cx - 30} y={CARD_Y + 4} w={60} h={40} value={f.n} min={0} max={f.d} size={26} label={fill(wc.shaded, { t: nameOf(key) })}
          onChange={(n) => setFrac(key, { ...f, n })} />
        <line x1={cx - 22} y1={CARD_Y + CARD_H / 2} x2={cx + 22} y2={CARD_Y + CARD_H / 2} stroke={INK} strokeWidth={2.5} />
        <NumBox x={cx - 30} y={CARD_Y + CARD_H - 44} w={60} h={40} value={f.d} min={1} max={FRACTION_PARTS} size={26} label={fill(wc.parts, { t: nameOf(key) })}
          onChange={(d) => setFrac(key, { n: Math.min(f.n, d), d })} />
      </g>
    );
  };
  // Each fraction against the half, and what that says about the two.
  const halfLine = (f: Frac) => {
    const s = halfSign(f);
    return fill(wc[s === "<" ? "halfBelow" : s === ">" ? "halfAbove" : "halfEqual"], { f: fracText(f), n: f.n, t: 2 * f.n, d: f.d });
  };
  const chain = viaHalf(a, b);
  const halfSays = [halfLine(a), halfLine(b), chain ? fill(wc.halfDecides, { chain: `${fracText(a)} ${chain[0]} 1/2 ${chain[1]} ${fracText(b)}` }) : wc.halfUndecided].join(" ");
  const heldSign = held?.from === "sign" ? held.s : held?.from === "guess" ? state.guess : null;

  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="hand-pic" fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        {/* The tools along the top, and the die. */}
        <g role="button" tabIndex={0} aria-label={state.joined ? w.compare.pencilsOff : w.compare.pencils} aria-pressed={state.joined} style={{ cursor: "grab" }}
          onPointerDown={(e) => press(e, { from: "tool", tool: "pencils" })} onKeyDown={(e) => keyTap(e, () => toggle("pencils"))}>
          <title>{state.joined ? w.compare.pencilsOff : w.compare.pencils}</title>
          <PencilBox {...PENCILS} joined={state.joined} colors={PENCIL_COLORS} on={BLUE} />
        </g>
        <ToolBox r={SCISSORS} on={showSame} off={!canSame} label={canSame ? (showSame ? wc.scissorsOff : wc.scissors) : wc.tooMany}
          onPress={(e) => press(e, { from: "tool", tool: "scissors" })} onKey={() => toggle("scissors")}>
          <text x={SCISSORS.x + SCISSORS.w / 2} y={SCISSORS.y + 27} fontSize={24} textAnchor="middle" fill={INK} opacity={showSame ? 0.35 : 1}>✂</text>
        </ToolBox>
        <ToolBox r={HALF} on={half} label={half ? wc.halfOff : wc.halfTool} onPress={(e) => press(e, { from: "tool", tool: "half" })} onKey={() => toggle("half")}>
          <g opacity={half ? 0.35 : 1}>
            <line x1={HALF.x + 8} y1={HALF.y + 25} x2={HALF.x + HALF.w - 8} y2={HALF.y + 25} stroke={RED} strokeWidth={2.5} strokeDasharray="6 4" />
            <text x={HALF.x + HALF.w / 2} y={HALF.y + 18} fontSize={14} fontWeight={700} textAnchor="middle" fill={RED}>1/2</text>
          </g>
        </ToolBox>
        <DieButton x={W - 44} y={3} title={wc.random} onTap={deal} />
        <rect {...{ x: ON_BARS.x, y: TOP - 4, width: ON_BARS.w, height: WHOLE + 8 }} rx={8} fill="none" stroke={toolOver ? BLUE : "none"} strokeWidth={2.5} strokeDasharray="6 4" />
        {BARS.map(bar)}
        {/* Half-way up both bars; it fades as the shaded parts slide to the middle. */}
        {half && (
          <g opacity={1 - slide} pointerEvents="none">
            <line x1={42} y1={FLOOR - WHOLE / 2} x2={338} y2={FLOOR - WHOLE / 2} stroke={RED} strokeWidth={2} strokeDasharray="8 5" />
            <text x={190} y={FLOOR - WHOLE / 2 - 8} fontSize={18} fontWeight={700} textAnchor="middle" fill={RED}>1/2</text>
          </g>
        )}
        <g pointerEvents="none">
          <Pencil from={[114, spans[0][0]]} to={[266, spans[1][0]]} color={PENCIL_COLORS[0]} k={pencils} />
          <Pencil from={[114, spans[0][1]]} to={[266, spans[1][1]]} color={PENCIL_COLORS[1]} k={pencils} />
        </g>
        {BARS.map(fracCard)}
        <g role="button" aria-label={fill(w.compare.middle, { s: state.guess ? say(state.guess) : "?" })} style={{ cursor: state.guess ? "grab" : "default" }}
          onPointerDown={(e) => state.guess && press(e, { from: "guess" })}>
          <rect x={MIDDLE.x - 4} y={MIDDLE.y - 4} width={MIDDLE.w + 8} height={MIDDLE.h + 8} rx={6} fill="none" stroke={overMiddle ? BLUE : "none"} strokeWidth={2.5} />
          <SignCard cx={190} y={MIDDLE.y} s={shown} fillColor={cardFill} w={64} h={74} size={42} />
        </g>
        {COMPARE_SIGNS.map((s, i) => (
          <g key={s} role="button" tabIndex={0} aria-label={fill(w.compare.sign, { s: say(s) })} style={{ cursor: "grab" }}
            onPointerDown={(e) => press(e, { from: "sign", s })} onKeyDown={(e) => keyTap(e, () => set({ ...state, guess: s }))}>
            <title>{fill(w.compare.sign, { s: say(s) })}</title>
            <SignCard cx={signX(i)} y={SIGN_Y} s={s} fillColor={state.guess === s ? "#e7f5ff" : "#fff"} />
          </g>
        ))}
        <g pointerEvents="none">
          {heldSign && held && <SignCard cx={held.x} y={held.y - 25} s={heldSign} fillColor="#fff" />}
          {held?.from === "tool" && held.tool === "pencils" && (
            <line x1={held.x - 40} y1={held.y} x2={held.x + 40} y2={held.y} stroke={PENCIL_COLORS[0]} strokeWidth={7} strokeLinecap="round" />
          )}
          {held?.from === "tool" && held.tool === "scissors" && <text x={held.x} y={held.y + 10} fontSize={30} textAnchor="middle" fill={INK}>✂</text>}
          {held?.from === "tool" && held.tool === "half" && (
            <line x1={held.x - 50} y1={held.y} x2={held.x + 50} y2={held.y} stroke={RED} strokeWidth={2.5} strokeDasharray="8 5" />
          )}
        </g>
      </svg>
      <p className="live-hint">
        {state.guess && state.guess !== sign
          ? `${wc.wrong}${state.joined ? "" : ` ${wc.tryPencils}`}`
          : state.guess || pencils === 1
            ? `${state.guess ? `${w.compare.right} ` : ""}${say(sign)}.${pencils === 1 ? ` ${sign === "=" ? wc.parallel : w.compare.opens}` : ""}`
            : wc.hint}
      </p>
      {showSame && <p className="live-hint">{fill(wc.sameSays, { a: fracText(a), b: fracText(b), x: same.a, y: same.b, d: same.d })}</p>}
      {half && <p className="live-hint">{halfSays}</p>}
    </>
  );
}
