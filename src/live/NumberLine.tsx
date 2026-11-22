// A number line on the board, worked by hand. A tap on the line marks the nearest tick, and so does the blue pin
// dragged from the top onto it; a mark is dragged from tick to tick (its jumps and the sum follow it), tapped to take it
// off, or dropped in the bin. Dragging the line itself slides it along; dragging either end stretches or shortens it a
// step at a time; the step wheel turns the step (keeping how many steps long the line is). The pills on top lay out a
// ready-made range and turn on fractions, jumps and "move together", which slides every mark the same way so the gaps
// stay the same (63 − 28 = 65 − 30). With jumps on, the marks are joined in the order they were made and the sum is
// written underneath (−3 + 5 − 1 = 1). "Copy as a picture" copies the line without the tools.
import { useId } from "react";
import {
  formatJump,
  formatNumber,
  jumpSum,
  labelEvery,
  moveMark,
  moveTogether,
  nearestTick,
  NUMBER_LINE_RANGES,
  NUMBER_LINE_STEPS,
  slideRange,
  stepsLong,
  stretchEnd,
  ticksOf,
  toggleMark,
  withRange,
  withStep,
  type LiveNumberLine,
} from "../math/numberLine";
import { BLUE, Bin, inBox, keyTap, NumBox, Pill, useDrag } from "./hand";
import { FONT, INK, type PieceProps } from "./ui";

const W = 760;
const PAD = 16;
const X0 = 48;
const L = W - 2 * X0;
const LINE_Y = 236;
const SIZE = 16;
const ORANGE = "#e8590c";
const BIN = { x: W - PAD - 96, y: 6, w: 96, h: 60 };
const PIN = { x: BIN.x - 44, y: 34 };
/** Where a tap or a pin lands on the line. */
const BAND = { x: X0 - 12, y: LINE_Y - 30, w: L + 24, h: 76 };
const H = LINE_Y + 96;
const textWidth = (s: string, size = SIZE) => s.length * size * 0.56;
const pillWidth = (s: string, size = 14) => Math.max(60, s.length * size * 0.6 + 24);

type Hold =
  | { kind: "mark"; i: number }
  | { kind: "pin" }
  | { kind: "line"; base: LiveNumberLine }
  | { kind: "end"; end: "from" | "to"; base: LiveNumberLine };

export function NumberLine({ state: d, set, w: words, svgRef }: PieceProps<"numberLine">) {
  const w = words.numberLine;
  const id = useId().replace(/:/g, "");
  const { from, to, step } = d;
  const ticks = ticksOf(from, to, step);
  const X = (v: number) => X0 + ((v - from) / (to - from)) * L;
  const valueAt = (x: number) => from + ((x - X0) / L) * (to - from);
  const stepPx = L / Math.max(1, stepsLong(d));
  const o = { fractions: d.fractions, step, from };
  const fmt = (v: number) => formatNumber(v, o);
  const kept = d.marks.filter((m) => m >= from - 1e-9 && m <= to + 1e-9);
  const dragTo = (i: number, v: number) => (d.together ? moveTogether(kept, i, v, from, to) : moveMark(kept, i, v));
  const put = (next: LiveNumberLine) => next !== d && set(next);
  const onLine = (x: number, y: number) => inBox(BAND, x, y);

  const { drag, begin, svgProps } = useDrag<Hold>(
    (h) => {
      if (h.kind === "mark") {
        if (!h.moved || inBox(BIN, h.x, h.y)) return set({ ...d, marks: kept.filter((_, j) => j !== h.i) });
        const v = nearestTick(ticks, valueAt(h.x));
        if (v !== kept[h.i]) set({ ...d, marks: dragTo(h.i, v) });
      } else if (h.kind === "pin") {
        const v = nearestTick(ticks, valueAt(h.x));
        if (h.moved && onLine(h.x, h.y) && !kept.some((m) => Math.abs(m - v) < 1e-9)) set({ ...d, marks: [...kept, v] });
      } else if (h.kind === "line" && !h.moved && ticks.length) {
        set({ ...d, marks: toggleMark(kept, nearestTick(ticks, valueAt(h.x))) });
      }
    },
    (h) => {
      if (!h.moved) return;
      // Dragging the line right brings the smaller numbers in from the left; an end dragged outwards adds steps.
      if (h.kind === "line") {
        const next = slideRange(h.base, -Math.round((h.x - h.x0) / stepPx));
        if (next.from !== from) set(next);
      }
      if (h.kind === "end") {
        const k = Math.round(((h.end === "to" ? 1 : -1) * (h.x - h.x0)) / (L / Math.max(1, stepsLong(h.base))));
        const next = stretchEnd(h.base, h.end, k);
        if (next.from !== from || next.to !== to) set(next);
      }
    },
  );
  // A mark being dragged is drawn where it would land; the board only hears of it when it is let go.
  const holding = drag?.moved && drag.kind === "mark" ? drag : null;
  const binHot = !!holding && inBox(BIN, holding.x, holding.y);
  const heldV = holding && !binHot ? nearestTick(ticks, valueAt(holding.x)) : null;
  const marks = holding ? (binHot ? kept.filter((_, j) => j !== holding.i) : dragTo(holding.i, heldV!)) : kept;
  const pinAt = drag?.moved && drag.kind === "pin" ? drag : null;
  const pinV = pinAt && onLine(pinAt.x, pinAt.y) ? nearestTick(ticks, valueAt(pinAt.x)) : null;

  const widest = Math.max(...ticks.map((t) => textWidth(fmt(t))));
  const numbered = labelEvery(ticks, step, ticks.length > 1 ? L * (step / (to - from)) : L, widest);
  // A number next to a mark gives way to the mark's own.
  const nearMark = (v: number) => marks.some((m) => Math.abs(X(m) - X(v)) > 0.5 && Math.abs(X(m) - X(v)) < widest + 6);
  const isMark = (v: number) => marks.some((m) => Math.abs(m - v) < 1e-9);

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

  /** The line, its numbers, the jumps and the marks: with `on` they can be taken hold of, without it they are the picture. */
  const drawing = (on: boolean, key: string) => (
    <>
      <defs>
        <marker id={`${key}-end`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0L10,5L0,10z" fill={INK} />
        </marker>
        <marker id={`${key}-jump`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0L10,5L0,10z" fill={ORANGE} />
        </marker>
      </defs>
      {on && (
        <rect role="slider" tabIndex={0} aria-label={w.slide} aria-valuemin={-1e6} aria-valuemax={1e6} aria-valuenow={from} aria-valuetext={`${fmt(from)} … ${fmt(to)}`}
          x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} rx={10} fill={drag?.kind === "line" && drag.moved ? "#f1f3f5" : "transparent"}
          style={{ cursor: drag?.kind === "line" && drag.moved ? "grabbing" : "pointer" }}
          onPointerDown={(e) => begin(e, { kind: "line", base: d })}
          onKeyDown={(e) => {
            const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
            if (by) (e.preventDefault(), put(slideRange(d, by)));
          }} />
      )}
      <line x1={X0 - 26} y1={LINE_Y} x2={W - X0 + 26} y2={LINE_Y} stroke={INK} strokeWidth={2} markerStart={`url(#${key}-end)`} markerEnd={`url(#${key}-end)`} pointerEvents="none" />
      {ticks.map((t, i) => {
        const marked = isMark(t);
        const label = !marked && numbered(i) && !nearMark(t);
        const zero = Math.abs(t) < 1e-9;
        const h = zero ? 12 : label || marked ? 9 : 5;
        return (
          <g key={i} pointerEvents="none">
            <line x1={X(t)} y1={LINE_Y - h} x2={X(t)} y2={LINE_Y + h} stroke={INK} strokeWidth={zero ? 3 : label || marked ? 2 : 1} />
            {label && (
              <text x={X(t)} y={LINE_Y + 32} fontSize={SIZE} fontWeight={zero ? 700 : 400} textAnchor="middle" fill={INK}>{fmt(t)}</text>
            )}
          </g>
        );
      })}
      {arcs.map(({ s, e, h }, i) => (
        <path key={i} d={`M${s},${LINE_Y - 6} Q${(s + e) / 2},${LINE_Y - 6 - 2 * h} ${e},${LINE_Y - 6}`} fill="none" stroke={ORANGE} strokeWidth={2.5}
          markerEnd={`url(#${key}-jump)`} pointerEvents="none" />
      ))}
      {/* The jumps' labels over every arc, haloed so a line passing behind doesn't hide them. */}
      {arcs.map(({ s, e, h, label }, i) => (
        <text key={i} x={(s + e) / 2} y={LINE_Y - 12 - h} fontSize={15} fontWeight={700} textAnchor="middle" fill={ORANGE} stroke="#fff" strokeWidth={4}
          paintOrder="stroke" pointerEvents="none">{label}</text>
      ))}
      {marks.map((m, i) => {
        const big = holding && (d.together || (heldV !== null && Math.abs(m - heldV) < 1e-9));
        const mark = (
          <>
            <circle cx={X(m)} cy={LINE_Y} r={big ? 9 : 7} fill={BLUE} />
            <text x={X(m)} y={LINE_Y + 32} fontSize={SIZE + 2} fontWeight={700} textAnchor="middle" fill={BLUE}>{fmt(m)}</text>
          </>
        );
        if (!on) return <g key={i}>{mark}</g>;
        const nudge = (by: number) => {
          const v = ticks[ticks.findIndex((t) => Math.abs(t - kept[i]) < 1e-9) + by];
          if (v !== undefined) set({ ...d, marks: dragTo(i, v) });
        };
        return (
          <g key={i} role="button" tabIndex={0} aria-label={`${w.mark} ${fmt(m)}`} style={{ cursor: holding ? "grabbing" : "grab" }}
            onPointerDown={(e) => begin(e, { kind: "mark", i })}
            onKeyDown={(e) => {
              const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
              if (by) return (e.preventDefault(), nudge(by));
              if (e.key === "Delete" || e.key === "Backspace") return set({ ...d, marks: kept.filter((_, j) => j !== i) });
              keyTap(e, () => set({ ...d, marks: kept.filter((_, j) => j !== i) }));
            }}>
            <circle cx={X(m)} cy={LINE_Y} r={18} fill="transparent" />
            {mark}
          </g>
        );
      })}
      {sum && <text x={W / 2} y={H - 14} fontSize={24} textAnchor="middle" fill={INK} pointerEvents="none">{sum}</text>}
    </>
  );

  /** A grip on either end of the line: drag it out for more steps, in for fewer. */
  const end = (which: "from" | "to") => {
    const x = which === "from" ? X0 - 26 : W - X0 + 26;
    const held = drag?.kind === "end" && drag.end === which;
    return (
      <g role="slider" tabIndex={0} aria-label={which === "from" ? w.startEnd : w.endEnd} aria-valuemin={-1e6} aria-valuemax={1e6}
        aria-valuenow={which === "from" ? from : to} aria-valuetext={fmt(which === "from" ? from : to)} style={{ cursor: "ew-resize" }}
        onPointerDown={(e) => begin(e, { kind: "end", end: which, base: d })}
        onKeyDown={(e) => {
          const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (by) (e.preventDefault(), put(stretchEnd(d, which, which === "to" ? by : -by)));
        }}>
        <title>{which === "from" ? w.startEnd : w.endEnd}</title>
        <rect x={x - 16} y={LINE_Y - 18} width={32} height={36} rx={10} fill={held ? "#d0ebff" : "#e7f5ff"} stroke={held ? BLUE : "#a5d8ff"} />
        <text x={x} y={LINE_Y - 24} fontSize={12} textAnchor="middle" fill={BLUE}>⟷</text>
      </g>
    );
  };

  const stepAt = (() => {
    let best = 0;
    NUMBER_LINE_STEPS.forEach((s, i) => Math.abs(s - step) < Math.abs(NUMBER_LINE_STEPS[best] - step) && (best = i));
    return best;
  })();
  const stepText = (s: number) => formatNumber(s, { fractions: s === 0.25 || s === 0.5, step: s, from: 0 });
  const toggles = [
    { text: `½ ${w.fractions}`, on: d.fractions, flip: () => set({ ...d, fractions: !d.fractions }) },
    { text: `↷ ${w.jumps}`, on: d.jumps, flip: () => set({ ...d, jumps: !d.jumps }) },
    { text: `↔ ${w.together}`, on: !!d.together, flip: () => set({ ...d, together: !d.together }) },
  ];
  let tx = PAD;
  let rx = PAD;

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        {toggles.map((t) => {
          const x = tx;
          const pw = pillWidth(t.text);
          tx += pw + 6;
          return <Pill key={t.text} x={x} y={8} w={pw} h={28} size={14} text={t.text} on={t.on} onTap={t.flip} />;
        })}
        <text x={tx + 6} y={27} fontSize={14} fill="#495057">{w.step}</text>
        <NumBox x={tx + 12 + textWidth(w.step, 14)} y={4} w={64} h={36} size={17} value={stepAt} min={0} max={NUMBER_LINE_STEPS.length - 1}
          label={w.step} show={(i) => stepText(NUMBER_LINE_STEPS[i])} onChange={(i) => set(withStep(d, NUMBER_LINE_STEPS[i]))} />
        <g role="group" aria-label={w.ranges}>
          {NUMBER_LINE_RANGES.map((r) => {
            const ro = { fractions: r.fractions, step: r.step, from: r.from };
            const text = `${formatNumber(r.from, ro)}…${formatNumber(r.to, ro)}${r.step !== 1 ? ` (${formatNumber(r.step, ro)})` : ""}`;
            const x = rx;
            const pw = pillWidth(text, 12) - 6;
            rx += pw + 5;
            return <Pill key={text} x={x} y={46} w={pw} h={28} size={12} text={text} on={r.from === from && r.to === to && r.step === step} onTap={() => set(withRange(d, r))} />;
          })}
        </g>
        <g role="button" tabIndex={0} aria-label={w.pin} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { kind: "pin" })}
          onKeyDown={(e) => keyTap(e, () => {
            const v = ticks.find((t) => !isMark(t) && t >= (from + to) / 2 - 1e-9) ?? ticks.find((t) => !isMark(t));
            if (v !== undefined) set({ ...d, marks: [...kept, v] });
          })}>
          <title>{w.pin}</title>
          <circle cx={PIN.x} cy={PIN.y} r={18} fill="#e7f5ff" stroke="#a5d8ff" />
          <circle cx={PIN.x} cy={PIN.y} r={8} fill={BLUE} />
        </g>
        <Bin {...BIN} hot={binHot} label={w.bin} title={w.binTitle} onTap={() => kept.length && set({ ...d, marks: [] })} />
        {drawing(true, `nl${id}`)}
        {end("from")}
        {end("to")}
        {pinV !== null && (
          <g pointerEvents="none" opacity={0.5}>
            <line x1={X(pinV)} y1={LINE_Y - 14} x2={X(pinV)} y2={LINE_Y + 14} stroke={BLUE} strokeWidth={2} strokeDasharray="3 3" />
            <text x={X(pinV)} y={LINE_Y + 32} fontSize={SIZE + 2} fontWeight={700} textAnchor="middle" fill={BLUE}>{fmt(pinV)}</text>
          </g>
        )}
        {pinAt && <circle cx={pinAt.x} cy={pinAt.y} r={8} fill={BLUE} opacity={0.85} pointerEvents="none" />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - 80} viewBox={`0 80 ${W} ${H - 80}`} fontFamily={FONT}>
          <rect y={80} width={W} height={H - 80} fill="#fff" />
          {drawing(false, `nlc${id}`)}
        </svg>
      </div>
    </>
  );
}
