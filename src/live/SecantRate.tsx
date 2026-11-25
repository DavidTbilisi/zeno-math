// The chord's slope. A curve that rises, falls and rises again, with two points on it: drag them along and the chord
// between them is drawn with its run and its rise, and the average rate of change, rise over run, is written beside
// it. The task: find two points whose average rate of change is 0, a flat chord, though the curve moved in between.
import { useState, type KeyboardEvent } from "react";
import { rateOf, SECANT_MAX, secantF, sgn, type LiveSecantRate } from "../math/readFunction";
import { BLUE, GREEN, MUTED, RED, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const UX = 56;
const UY = 30;
const PX = 50;
const PY = 30;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + x * UX;
const Y = (y: number) => PY + (9 - y) * UY;
const CURVE = Array.from({ length: 141 }, (_, i) => i * 0.05).map((x) => `${X(x).toFixed(1)},${Y(secantF(x)).toFixed(1)}`).join(" ");

type End = "a" | "b";

export function SecantRate({ state, set, w: words, svgRef }: PieceProps<"secantRate">) {
  const w = words.secantRate;
  const [draft, setDraft] = useState<LiveSecantRate | null>(null);
  const s = draft ?? state;
  const rate = rateOf(s);
  const done = rate === 0;
  const [fa, fb] = [secantF(s.a), secantF(s.b)];
  const toX = (px: number) => Math.max(0, Math.min(SECANT_MAX, Math.round((px - PX) / UX)));
  const { drag, begin, svgProps } = useDrag<{ end: End }>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => setDraft({ ...state, [h.end]: toX(h.x) }),
  );
  const keys = (end: End) => (e: KeyboardEvent) => {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    set({ ...state, [end]: Math.max(0, Math.min(SECANT_MAX, state[end] + by)) });
  };
  const say = wrapWords(
    rate === null ? w.same : done ? fill(w.done, { a: s.a, b: s.b, f: sgn(fa) }) : fill(rate > 0 ? w.rising : w.falling, { r: sgn(rate) }),
    74,
  );
  // The chord, carried a little past both points.
  const [lo, hi] = [Math.min(s.a, s.b), Math.max(s.a, s.b)];
  const [flo, fhi] = [secantF(lo), secantF(hi)];
  const m = rate ?? 0;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <g pointerEvents="none">
          {Array.from({ length: SECANT_MAX + 1 }, (_, i) => (
            <g key={i}>
              <line x1={X(i)} y1={Y(-1)} x2={X(i)} y2={Y(9)} stroke="#f1f3f5" />
              <text x={X(i)} y={Y(-1) + 18} fontSize={12} textAnchor="middle" fill={MUTED}>{i}</text>
            </g>
          ))}
          {Array.from({ length: 11 }, (_, i) => i - 1).map((v) => (
            <g key={v}>
              <line x1={X(0)} y1={Y(v)} x2={X(SECANT_MAX)} y2={Y(v)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v % 2 === 0 && <text x={X(0) - 8} y={Y(v) + 4} fontSize={12} textAnchor="end" fill={MUTED}>{sgn(v)}</text>}
            </g>
          ))}
          <line x1={X(0)} y1={Y(-1)} x2={X(0)} y2={Y(9)} stroke={INK} strokeWidth={1.5} />
          <polyline points={CURVE} fill="none" stroke={BLUE} strokeWidth={3} />
          {rate !== null && (
            <>
              {/* Run along, then rise up or down, from the left point to the right one. */}
              <line x1={X(lo)} y1={Y(flo)} x2={X(hi)} y2={Y(flo)} stroke={MUTED} strokeWidth={2} strokeDasharray="5 4" />
              <line x1={X(hi)} y1={Y(flo)} x2={X(hi)} y2={Y(fhi)} stroke={RED} strokeWidth={2.5} />
              <text x={(X(lo) + X(hi)) / 2} y={Y(flo) + (fhi >= flo ? 18 : -8)} fontSize={14} textAnchor="middle" fill={MUTED}>{fill(w.run, { v: hi - lo })}</text>
              {fhi !== flo && <text x={X(hi) + 8} y={(Y(flo) + Y(fhi)) / 2 + 5} fontSize={14} fill={RED}>{fill(w.rise, { v: sgn(fhi - flo) })}</text>}
              <line x1={X(lo - 0.4)} y1={Y(flo - 0.4 * m)} x2={X(hi + 0.4)} y2={Y(fhi + 0.4 * m)} stroke={done ? GREEN : ORANGE} strokeWidth={3} />
            </>
          )}
        </g>
        {(["a", "b"] as const).map((end) => (
          <g key={end} role="slider" tabIndex={0} aria-label={end === "a" ? w.first : w.second} aria-valuenow={s[end]} aria-valuemin={0} aria-valuemax={SECANT_MAX}
            onKeyDown={keys(end)} onPointerDown={(e) => begin(e, { end })} style={{ cursor: drag ? "grabbing" : "ew-resize" }}>
            <circle cx={X(s[end])} cy={Y(secantF(s[end]))} r={20} fill="transparent" />
            <circle cx={X(s[end])} cy={Y(secantF(s[end]))} r={9} fill="#fff" stroke={ORANGE} strokeWidth={3.5} />
            <text x={X(s[end])} y={Y(secantF(s[end])) - 15} fontSize={15} fontWeight={700} textAnchor="middle" fill={ORANGE} pointerEvents="none">{end === "a" ? "A" : "B"}</text>
          </g>
        ))}
        <g pointerEvents="none">
          <text x={500} y={60} fontSize={15} fill={INK}>{fill(w.point, { n: "A", x: s.a, y: sgn(fa) })}</text>
          <text x={500} y={86} fontSize={15} fill={INK}>{fill(w.point, { n: "B", x: s.b, y: sgn(fb) })}</text>
          <text x={500} y={128} fontSize={15} fill={MUTED}>{w.rateName}</text>
          <text x={500} y={156} fontSize={18} fontWeight={700} fill={done ? GREEN : INK}>
            {rate === null ? "—" : `(${sgn(fb)} − ${sgn(fa)}) ÷ (${s.b} − ${s.a}) = ${sgn(rate)}`}
          </text>
          <text x={500} y={200} fontSize={15} fill={INK}>{w.goal}</text>
        </g>
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={done ? GREEN : INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
