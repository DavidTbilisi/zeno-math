// Squares on the residuals. Points on a grid and a line with two orange ends; drag the ends and the line moves, and
// each point's residual, its distance above or below the line, is drawn as a red square. The total area of the squares
// is written beside the smallest it can be; shrink it until the line is the line of best fit, and see that the
// residuals above and below it add up to nothing. One set has a point far off the pattern, which pulls the line.
import { useState, type KeyboardEvent } from "react";
import { bestLine, FIT_HI, FIT_LO, FIT_SETS, isBest, lineOf, residuals, short, sse, type LiveFitLine } from "../math/scatterFit";
import { GREEN, MUTED, RED, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const U = 28;
const PX = 50;
const PY = 64;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + x * U;
const Y = (y: number) => PY + (10 - y) * U;

type End = "y0" | "y1";

export function FitLine({ state, set, w: words, svgRef }: PieceProps<"fitLine">) {
  const w = words.fitLine;
  const [draft, setDraft] = useState<LiveFitLine | null>(null);
  const s = draft ?? state;
  const pts = FIT_SETS[s.set];
  const l = lineOf(s);
  const rs = residuals(pts, l);
  const total = sse(pts, l);
  const least = sse(pts, bestLine(pts));
  const done = isBest(s);
  const toY = (py: number) => Math.round(Math.max(FIT_LO, Math.min(FIT_HI, 10 - (py - PY) / U)) * 10) / 10;
  const { drag, begin, svgProps } = useDrag<{ end: End }>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => setDraft({ ...state, [h.end]: toY(h.y) }),
  );
  const keys = (end: End) => (e: KeyboardEvent) => {
    const by = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    set({ ...state, [end]: Math.round(Math.max(FIT_LO, Math.min(FIT_HI, state[end] + by)) * 10) / 10 });
  };
  const say = wrapWords(
    done ? fill(w.done, { r: short(rs.reduce((a, b) => a + b, 0)) }) : total <= least * 1.3 ? fill(w.close, { s: short(total), b: short(least) }) : w.start,
    76,
  );
  // The line drawn across the plot, from x = 0 to x = 10, cut at the top and bottom of the grid.
  const yAt = (x: number) => l.m * x + l.c;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={[fill(w.sum, { s: short(total) }), fill(w.least, { b: short(least) }), ...say].join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={FIT_SETS.map((_, i) => String(i))} on={String(s.set)} names={{ 0: w.set0, 1: w.set1, 2: w.set2 }}
          onPick={(k) => set({ set: Number(k), y0: 2, y1: 2 })} />
        <defs>
          <clipPath id="fitline-plot"><rect x={X(0)} y={Y(10)} width={10 * U} height={10 * U} /></clipPath>
        </defs>
        <g pointerEvents="none">
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(10)} stroke="#f1f3f5" />
              <line x1={X(0)} y1={Y(i)} x2={X(10)} y2={Y(i)} stroke="#f1f3f5" />
              {i % 2 === 0 && <text x={X(i)} y={Y(0) + 18} fontSize={12} textAnchor="middle" fill={MUTED}>{i}</text>}
              {i % 2 === 0 && <text x={X(0) - 8} y={Y(i) + 4} fontSize={12} textAnchor="end" fill={MUTED}>{i}</text>}
            </g>
          ))}
          <line x1={X(0)} y1={Y(0)} x2={X(10)} y2={Y(0)} stroke={INK} strokeWidth={1.5} />
          <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(10)} stroke={INK} strokeWidth={1.5} />
          {/* The squares on the residuals, each beside its point's gap to the line. */}
          <g clipPath="url(#fitline-plot)">
            {pts.map(([x, y], i) => {
              const r = rs[i];
              const side = Math.abs(r) * U;
              return (
                <g key={i}>
                  <rect x={X(x)} y={Math.min(Y(y), Y(yAt(x)))} width={side} height={side} fill={RED} fillOpacity={0.18} stroke={RED} strokeOpacity={0.5} />
                  <line x1={X(x)} y1={Y(y)} x2={X(x)} y2={Y(yAt(x))} stroke={RED} strokeWidth={2} />
                </g>
              );
            })}
            <line x1={X(0)} y1={Y(yAt(0))} x2={X(10)} y2={Y(yAt(10))} stroke={done ? GREEN : ORANGE} strokeWidth={3} />
          </g>
          {pts.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r={5} fill={INK} />)}
        </g>
        {/* The two ends of the line, at x = 0 and x = 10. */}
        {(["y0", "y1"] as const).map((end) => {
          const cx = end === "y0" ? X(0) : X(10);
          const cy = Y(s[end]);
          return (
            <g key={end} role="slider" tabIndex={0} aria-label={end === "y0" ? w.leftEnd : w.rightEnd} aria-valuenow={s[end]} aria-valuemin={FIT_LO} aria-valuemax={FIT_HI}
              onKeyDown={keys(end)} onPointerDown={(e) => begin(e, { end })} style={{ cursor: drag ? "grabbing" : "ns-resize" }}>
              <circle cx={cx} cy={cy} r={20} fill="transparent" />
              <circle cx={cx} cy={cy} r={9} fill="#fff" stroke={ORANGE} strokeWidth={3.5} />
            </g>
          );
        })}
        {/* The total area of the squares, against the least it can be. */}
        <g pointerEvents="none">
          <text x={410} y={Y(9)} fontSize={18} fontWeight={700} fill={done ? GREEN : RED}>{fill(w.sum, { s: short(total) })}</text>
          <text x={410} y={Y(9) + 26} fontSize={15} fill={MUTED}>{fill(w.least, { b: short(least) })}</text>
          <rect x={410} y={Y(9) + 42} width={240} height={16} fill="#f1f3f5" />
          <rect x={410} y={Y(9) + 42} width={Math.min(240, (240 * least) / Math.max(total, 1e-9))} height={16} fill={done ? GREEN : RED} fillOpacity={0.6} />
          <text x={410} y={Y(9) + 92} fontSize={15} fill={INK}>{fill(w.line, { eq: `y = ${short(l.m)}x ${l.c < 0 ? "−" : "+"} ${short(Math.abs(l.c))}` })}</text>
        </g>
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fill={done ? GREEN : INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
