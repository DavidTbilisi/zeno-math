// A number line on the board with any range: type where it starts and ends and the step between ticks (negative,
// decimal or fraction), or pick a ready-made range. Clicking the line marks the nearest tick; a mark can be dragged
// from tick to tick (its jumps and the sum follow it) or clicked to take it off. With "move together" on, dragging one
// mark slides them all by the same steps, so every gap stays the same (63 − 28 = 65 − 30). With jumps on, the marks
// are joined in the order they were made and the sum they make is written underneath (−3 + 5 − 1 = 1).
import { useRef, useState } from "react";
import {
  clean,
  formatJump,
  formatNumber,
  jumpSum,
  labelEvery,
  moveMark,
  moveTogether,
  nearestTick,
  NUMBER_LINE_MAX_TICKS,
  NUMBER_LINE_RANGES,
  parseNumber,
  rangeProblem,
  ticksOf,
  toggleMark,
  withRange,
  type RangeProblem,
} from "../math/numberLine";
import { fill, FONT, INK, svgPoint, Toggle, type PieceProps } from "./ui";

const W = 760;
const H = 250;
const X0 = 40;
const L = W - 2 * X0;
const LINE_Y = 160;
const SIZE = 16;
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const textWidth = (s: string, size = SIZE) => s.length * size * 0.56;

export function NumberLine({ state: d, set, w: words, svgRef }: PieceProps<"numberLine">) {
  const w = words.numberLine;
  const [problem, setProblem] = useState<RangeProblem | "number" | null>(null);
  const { from, to, step } = d;
  const ticks = ticksOf(from, to, step);
  const X = (v: number) => X0 + ((v - from) / (to - from)) * L;
  const o = { fractions: d.fractions, step, from };
  const fmt = (v: number) => formatNumber(v, o);
  // A mark being dragged is drawn where it is now; the board only hears of it when it is let go.
  const [drag, setDrag] = useState<{ i: number; v: number; moved: boolean } | null>(null);
  const dropped = useRef(0); // when a drag ended: the click that follows it is not a click on the line
  const kept = d.marks.filter((m) => m >= from - 1e-9 && m <= to + 1e-9);
  const dragTo = (i: number, v: number) => (d.together ? moveTogether(kept, i, v, from, to) : moveMark(kept, i, v));
  const marks = drag ? dragTo(drag.i, drag.v) : kept;
  const widest = Math.max(...ticks.map((t) => textWidth(fmt(t))));
  const numbered = labelEvery(ticks, step, ticks.length > 1 ? L * (step / (to - from)) : L, widest);
  // A number next to a mark gives way to the mark's own.
  const nearMark = (v: number) => marks.some((m) => Math.abs(X(m) - X(v)) > 0.5 && Math.abs(X(m) - X(v)) < widest + 6);
  const isMark = (v: number) => marks.some((m) => Math.abs(m - v) < 1e-9);

  const tickAt = (e: { clientX: number; clientY: number }) => {
    const [x] = svgPoint(svgRef.current!, e);
    return nearestTick(ticks, from + ((x - X0) / L) * (to - from));
  };
  const click = (e: React.MouseEvent) => {
    if (performance.now() - dropped.current < 300) return;
    if (!svgRef.current || !ticks.length) return;
    set({ ...d, marks: toggleMark(kept, tickAt(e)) });
  };
  const grab = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ i, v: kept[i], moved: false });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return;
    const v = tickAt(e);
    if (v !== drag.v) setDrag({ ...drag, v, moved: true });
  };
  const drop = () => {
    if (!drag) return;
    dropped.current = performance.now();
    // Let go where it started: a click on the mark, which takes it off.
    set({ ...d, marks: drag.moved && drag.v !== kept[drag.i] ? dragTo(drag.i, drag.v) : kept.filter((_, j) => j !== drag.i) });
    setDrag(null);
  };
  const commit = (key: "from" | "to" | "step", text: string) => {
    const v = parseNumber(text);
    if (v === null) return setProblem("number");
    const r = { from, to, step, [key]: v };
    // A start typed past the end (or an end before the start) takes the line with it, the same length.
    if (key === "from" && v >= to) r.to = clean(v + (to - from));
    if (key === "to" && v <= from) r.from = clean(v - (to - from));
    const p = rangeProblem(r.from, r.to, r.step);
    setProblem(p);
    // A step typed as a fraction writes the line in fractions.
    if (!p) set(withRange(d, { ...r, fractions: key === "step" && text.includes("/") ? true : d.fractions }));
  };
  const field = (key: "from" | "to" | "step", label: string) => (
    <label className="live-field">
      {label}
      <input
        className="live-num"
        key={`${key}${d[key]}${d.fractions}`}
        type="text"
        inputMode="decimal"
        defaultValue={fmt(d[key]).replace(/\s/g, "")}
        aria-label={label}
        onBlur={(e) => commit(key, e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );

  // The jumps from mark to mark, in the order they were made, and the sum they write.
  const jumps = d.jumps && marks.length > 1 ? marks.slice(1).map((m, i) => [marks[i], m] as const) : [];
  const sum = jumps.length ? jumpSum(marks, o) : null;
  // Each arc rises with its length; one whose label would sit on an earlier label's goes higher.
  const arcs: { s: number; e: number; h: number; label: string }[] = [];
  for (const [a, b] of jumps) {
    const [s, e] = [X(a), X(b)];
    const label = formatJump(a, b, o);
    let h = Math.min(110, 18 + Math.abs(e - s) * 0.35);
    const clash = (h: number) => arcs.some((p) => Math.abs((p.s + p.e) / 2 - (s + e) / 2) < (textWidth(p.label, 15) + textWidth(label, 15)) / 2 + 6 && Math.abs(p.h - h) < 18);
    while (clash(h) && h < 130) h += 18;
    arcs.push({ s, e, h, label });
  }

  return (
    <>
      <div className="live-bar">
        {NUMBER_LINE_RANGES.map((r) => {
          const ro = { fractions: r.fractions, step: r.step, from: r.from };
          const on = r.from === from && r.to === to && r.step === step;
          return (
            <Toggle key={`${r.from}${r.to}${r.step}`} on={on} onClick={() => (setProblem(null), set(withRange(d, r)))}>
              {formatNumber(r.from, ro)}…{formatNumber(r.to, ro)}
              {r.step !== 1 && <small> ({formatNumber(r.step, ro)})</small>}
            </Toggle>
          );
        })}
      </div>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        fontFamily={FONT}
        onClick={click}
        onPointerMove={move}
        onPointerUp={drop}
        onPointerCancel={() => setDrag(null)}
        style={{ cursor: drag ? "grabbing" : "pointer" }}
      >
        <defs>
          <marker id="nl-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0L10,5L0,10z" fill={INK} />
          </marker>
          <marker id="nl-jump" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0L10,5L0,10z" fill={ORANGE} />
          </marker>
        </defs>
        <rect width={W} height={H} fill="#fff" />
        <line x1={X0 - 26} y1={LINE_Y} x2={W - X0 + 26} y2={LINE_Y} stroke={INK} strokeWidth={2} markerStart="url(#nl-end)" markerEnd="url(#nl-end)" />
        {ticks.map((t, i) => {
          const marked = isMark(t);
          const label = !marked && numbered(i) && !nearMark(t);
          const zero = Math.abs(t) < 1e-9;
          const h = zero ? 12 : label || marked ? 9 : 5;
          return (
            <g key={i}>
              <line x1={X(t)} y1={LINE_Y - h} x2={X(t)} y2={LINE_Y + h} stroke={INK} strokeWidth={zero ? 3 : label || marked ? 2 : 1} />
              {label && (
                <text x={X(t)} y={LINE_Y + 32} fontSize={SIZE} fontWeight={zero ? 700 : 400} textAnchor="middle" fill={INK}>
                  {fmt(t)}
                </text>
              )}
            </g>
          );
        })}
        {arcs.map(({ s, e, h }, i) => (
          <path key={i} d={`M${s},${LINE_Y - 6} Q${(s + e) / 2},${LINE_Y - 6 - 2 * h} ${e},${LINE_Y - 6}`} fill="none" stroke={ORANGE} strokeWidth={2.5} markerEnd="url(#nl-jump)" />
        ))}
        {/* The jumps' labels over every arc, haloed so a line passing behind doesn't hide them. */}
        {arcs.map(({ s, e, h, label }, i) => (
          <text key={i} x={(s + e) / 2} y={LINE_Y - 12 - h} fontSize={15} fontWeight={700} textAnchor="middle" fill={ORANGE} stroke="#fff" strokeWidth={4} paintOrder="stroke">{label}</text>
        ))}
        {marks.map((m, i) => (
          <g key={i} style={{ cursor: drag ? "grabbing" : "grab" }} onPointerDown={grab(i)}>
            <circle cx={X(m)} cy={LINE_Y} r={drag && (d.together || Math.abs(m - drag.v) < 1e-9) ? 9 : 7} fill={BLUE} />
            <circle cx={X(m)} cy={LINE_Y} r={16} fill="transparent" />
            <text x={X(m)} y={LINE_Y + 32} fontSize={SIZE + 2} fontWeight={700} textAnchor="middle" fill={BLUE}>{fmt(m)}</text>
          </g>
        ))}
        {sum && <text x={W / 2} y={H - 14} fontSize={24} textAnchor="middle" fill={INK}>{sum}</text>}
      </svg>
      <div className="live-bar">
        {field("from", w.from)}
        {field("to", w.to)}
        {field("step", w.step)}
        <Toggle on={d.fractions} onClick={() => set({ ...d, fractions: !d.fractions })}>½ {w.fractions}</Toggle>
        <Toggle on={d.jumps} onClick={() => set({ ...d, jumps: !d.jumps })}>↷ {w.jumps}</Toggle>
        <Toggle on={!!d.together} onClick={() => set({ ...d, together: !d.together })}>↔ {w.together}</Toggle>
        <button className="live-btn" disabled={!d.marks.length} onClick={() => set({ ...d, marks: [] })}>{w.clear}</button>
      </div>
      {problem ? <p className="live-said">{fill(w.problems[problem], { max: NUMBER_LINE_MAX_TICKS })}</p> : <p className="live-hint">{w.hint}</p>}
    </>
  );
}

