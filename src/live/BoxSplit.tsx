// Split the row. A row of values in order, as cards; tap where it splits into two halves with as many cards on each
// side, a card or the gap between two. A miss says how many cards it leaves on each side, so the learner finds the
// rule by counting: that is the median. Then each half is split the same way, giving Q1 and Q3, and under the row a box
// plot draws itself from the taps: the box from Q1 to Q3 holds the middle half, and its length is the IQR.
import type { KeyboardEvent } from "react";
import { BOX_SETS, regionOf, short, sides, tapAt, valueAt } from "../math/spread";
import { BLUE, GREEN, MUTED, RED, Tabs, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const CARD = 44;
const STEP = 56;
const ROW_Y = 96;
const LINE_Y = 290;
const SAY_Y = 350;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";

export function BoxSplit({ state, set, w: words, svgRef }: PieceProps<"boxSplit">) {
  const w = words.boxSplit;
  const vs = BOX_SETS[state.set];
  const n = vs.length;
  const x0 = (W - (n * STEP - (STEP - CARD))) / 2;
  /** The left edge of card i, and the middle of position p along the row. */
  const cardX = (i: number) => x0 + i * STEP;
  const posX = (p: number) => (p % 2 ? cardX((p + 1) / 2) - (STEP - CARD) / 2 : cardX(p / 2) + CARD / 2);
  const tap = (p: number) => set(tapAt(state, p));
  const keyOn = (p: number) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    tap(p);
  };

  // The number line under the row, wide enough for every value.
  const lo = Math.floor(vs[0]) - 1;
  const hi = Math.ceil(vs[n - 1]) + 1;
  const u = (W - 80) / (hi - lo);
  const X = (v: number) => 40 + (v - lo) * u;
  const every = hi - lo > 24 ? 5 : hi - lo > 12 ? 2 : 1;
  const [mv, q1v, q3v] = [state.med, state.q1, state.q3].map((p) => (p === null ? null : valueAt(vs, p)));
  const done = mv !== null && q1v !== null && q3v !== null;
  const h = Math.floor(n / 2);
  const v = { n, h, m: mv === null ? "" : short(mv), q1: q1v === null ? "" : short(q1v), q3: q3v === null ? "" : short(q3v), iqr: done ? short(q3v! - q1v!) : "", k: Math.floor(h / 2), lo: short(vs[0]), hi: short(vs[n - 1]) };
  const miss = state.miss === null ? null : sides(state.miss, regionOf(state, state.miss).from, regionOf(state, state.miss).to);
  const say = wrapWords(
    done ? fill(w.box, v)
      : miss ? fill(w.miss, { l: miss.left, r: miss.right })
      : mv === null ? w.start
      : q1v === null && q3v === null ? fill(w.median, v)
      : fill(w.halves, v),
    74,
  );
  const cut = (p: number | null, name: string, color: string) =>
    p === null ? null : (
      <g key={name} pointerEvents="none">
        {/* Through a gap; above and below a card, so its number stays readable. */}
        {p % 2 ? (
          <line x1={posX(p)} y1={ROW_Y - 18} x2={posX(p)} y2={ROW_Y + CARD + 18} stroke={color} strokeWidth={3} />
        ) : (
          <>
            <line x1={posX(p)} y1={ROW_Y - 18} x2={posX(p)} y2={ROW_Y} stroke={color} strokeWidth={3} />
            <line x1={posX(p)} y1={ROW_Y + CARD} x2={posX(p)} y2={ROW_Y + CARD + 18} stroke={color} strokeWidth={3} />
          </>
        )}
        <text x={posX(p)} y={ROW_Y - 24} fontSize={15} fontWeight={700} textAnchor="middle" fill={color}>{name}</text>
      </g>
    );

  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={[vs.join(", "), ...say].join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={BOX_SETS.map((_, i) => String(i))} on={String(state.set)}
          names={Object.fromEntries(BOX_SETS.map((s, i) => [String(i), fill(w.setName, { n: s.length })]))}
          onPick={(k) => set({ set: Number(k), med: null, q1: null, q3: null, miss: null })} />
        {/* The cards, and the gaps between them: each a place to tap. */}
        {vs.map((value, i) => {
          const p = 2 * i;
          const isCut = p === state.med || p === state.q1 || p === state.q3;
          return (
            <g key={`c${i}`} role="button" tabIndex={0} aria-label={fill(w.cardName, { v: value, i: i + 1 })} onKeyDown={keyOn(p)}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => tap(p)} style={{ cursor: "pointer" }}>
              <rect x={cardX(i)} y={ROW_Y} width={CARD} height={CARD} rx={6} fill={isCut ? "#fff4e6" : state.miss === p ? "#fff5f5" : "#e7f5ff"}
                stroke={isCut ? ORANGE : state.miss === p ? RED : BLUE} strokeWidth={2} />
              <text x={cardX(i) + CARD / 2} y={ROW_Y + CARD / 2 + 7} fontSize={19} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{value}</text>
            </g>
          );
        })}
        {vs.slice(1).map((_, i) => {
          const p = 2 * i + 1;
          return (
            <g key={`g${i}`} role="button" tabIndex={0} aria-label={fill(w.gapName, { a: vs[i], b: vs[i + 1] })} onKeyDown={keyOn(p)}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => tap(p)} style={{ cursor: "pointer" }}>
              <rect x={posX(p) - 9} y={ROW_Y - 4} width={18} height={CARD + 8} fill="transparent" />
              <line x1={posX(p)} y1={ROW_Y + 6} x2={posX(p)} y2={ROW_Y + CARD - 6} stroke={state.miss === p ? RED : "#ced4da"} strokeWidth={2} strokeDasharray="3 3" pointerEvents="none" />
            </g>
          );
        })}
        {cut(state.med, w.medName, ORANGE)}
        {cut(state.q1, "Q1", GREEN)}
        {cut(state.q3, "Q3", GREEN)}
        {/* A miss: how many cards it leaves on each side. */}
        {miss && state.miss !== null && (
          <g pointerEvents="none">
            <text x={posX(state.miss) - 14} y={ROW_Y + CARD + 34} fontSize={16} fontWeight={700} textAnchor="end" fill={RED}>← {miss.left}</text>
            <text x={posX(state.miss) + 14} y={ROW_Y + CARD + 34} fontSize={16} fontWeight={700} fill={RED}>{miss.right} →</text>
          </g>
        )}
        {/* The box plot, drawn from the taps as they come. */}
        <g pointerEvents="none">
          {done && (
            <>
              <line x1={X(vs[0])} y1={LINE_Y - 40} x2={X(q1v!)} y2={LINE_Y - 40} stroke={INK} strokeWidth={2} />
              <line x1={X(q3v!)} y1={LINE_Y - 40} x2={X(vs[n - 1])} y2={LINE_Y - 40} stroke={INK} strokeWidth={2} />
              {[vs[0], vs[n - 1]].map((e, i) => <line key={i} x1={X(e)} y1={LINE_Y - 50} x2={X(e)} y2={LINE_Y - 30} stroke={INK} strokeWidth={2} />)}
            </>
          )}
          {q1v !== null && q3v !== null && (
            <rect x={X(q1v)} y={LINE_Y - 58} width={X(q3v) - X(q1v)} height={36} fill={BLUE} fillOpacity={0.15} stroke={BLUE} strokeWidth={2} />
          )}
          {[q1v, q3v].map((q, i) => q !== null && <line key={i} x1={X(q)} y1={LINE_Y - 58} x2={X(q)} y2={LINE_Y - 22} stroke={GREEN} strokeWidth={3} />)}
          {mv !== null && <line x1={X(mv)} y1={LINE_Y - 58} x2={X(mv)} y2={LINE_Y - 22} stroke={ORANGE} strokeWidth={3.5} />}
          {done && (
            <text x={(X(q1v!) + X(q3v!)) / 2} y={LINE_Y - 66} fontSize={15} fontWeight={700} textAnchor="middle" fill={BLUE}>IQR = {v.iqr}</text>
          )}
          <line x1={X(lo)} y1={LINE_Y} x2={X(hi)} y2={LINE_Y} stroke={INK} strokeWidth={2} />
          {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((t) => (
            <g key={t}>
              <line x1={X(t)} y1={LINE_Y} x2={X(t)} y2={LINE_Y + 5} stroke={INK} />
              {(t - lo) % every === 0 && <text x={X(t)} y={LINE_Y + 20} fontSize={12} textAnchor="middle" fill={MUTED}>{t}</text>}
            </g>
          ))}
          {vs.map((value, i) => <circle key={i} cx={X(value)} cy={LINE_Y - 8 - 7 * vs.slice(0, i).filter((x) => x === value).length} r={3.5} fill={MUTED} />)}
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fill={done ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
