// The shape of a graph read from f′ and f″ (#746). f, f′ and f″ are drawn one above the other on a shared x-axis, the
// parts of f′ and f″ above zero shaded green and below it orange; the learner drags a line across all three (or reaches
// it with Tab and moves it with the arrow keys). A line in the wrong place is named by what f′ or f″ says there; once
// right the round says the rule it shows, then Next. The last rounds hide f. The rounds are in src/math/shapeRead.ts.
import type { KeyboardEvent } from "react";
import { again, derivP, done, evalP, missOf, moveLine, next, readAt, roundOf, SHAPE_ROUNDS, X_FAR, X_STEP, type Poly, type ShapeRound } from "../math/shapeRead";
import { GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const H = 720;
const XC = 380;
const U = 70;
const PANEL = 120;
const TOPS = [120, 270, 420];
const ASK = "#e8590c";
const BLUE = "#1971c2";
const UP = "#b2f2bb";
const DOWN = "#ffd8a8";
const X = (x: number) => XC + x * U;
const toX = (px: number) => (px - XC) / U;
const EDGE = X_FAR + 0.3;

/** The curve p over the panel at top, scaled to fit, with its zero line; shaded above and below zero when asked (tag keeps the clip ids of the two copies apart). */
function panel(p: Poly, top: number, shade: boolean, tag: string) {
  const xs = Array.from({ length: 121 }, (_, i) => -EDGE + (2 * EDGE * i) / 120);
  const ys = xs.map((x) => evalP(p, x));
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const span = hi - lo || 1;
  const Y = (y: number) => top + 8 + ((hi - y) / span) * (PANEL - 16);
  const pts = xs.map((x, i) => `${X(x).toFixed(1)} ${Y(ys[i]).toFixed(1)}`);
  const area = `M${X(-EDGE)} ${Y(0)} L${pts.join(" L")} L${X(EDGE)} ${Y(0)} Z`;
  return {
    Y,
    body: (
      <>
        {shade && (
          <>
            <clipPath id={`sr-up-${tag}${top}`}><rect x={0} y={top} width={W} height={Y(0) - top} /></clipPath>
            <clipPath id={`sr-dn-${tag}${top}`}><rect x={0} y={Y(0)} width={W} height={top + PANEL - Y(0)} /></clipPath>
            <path d={area} fill={UP} clipPath={`url(#sr-up-${tag}${top})`} />
            <path d={area} fill={DOWN} clipPath={`url(#sr-dn-${tag}${top})`} />
          </>
        )}
        <line x1={X(-EDGE)} y1={Y(0)} x2={X(EDGE)} y2={Y(0)} stroke={INK} strokeWidth={1.2} />
        <path d={`M${pts.join(" L")}`} fill="none" stroke={BLUE} strokeWidth={2.6} />
      </>
    ),
  };
}

export function ShapeRead({ state, set, w: words, svgRef }: PieceProps<"shapeRead">) {
  const w = words.shapeRead;
  const r = roundOf(state);
  const ok = done(state);
  const { x } = state;
  const { begin, svgProps } = useDrag<{ line: true }>((d) => set(moveLine(state, toX(d.x), true)), (d) => set(moveLine(state, toX(d.x), false)));
  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -X_STEP, ArrowDown: -X_STEP, ArrowRight: X_STEP, ArrowUp: X_STEP };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveLine(state, x + d, true));
  };

  const reading = (round: ShapeRound) => {
    const [f, d1, d2] = readAt(round, x);
    return [`x = ${x}`, round.showF ? `f = ${f}` : "", `f′ = ${d1}`, round.showF2 ? `f″ = ${d2}` : ""].filter(Boolean).join("  ·  ").replace(/-/g, "−");
  };
  let say_ = "";
  if (r && state.tried) say_ = ok ? w[`done${state.round}` as "done0"] : fill(w[`miss_${missOf(r, x)}` as "miss_rising"], { x: String(x).replace("-", "−") });
  const askLines = wrapWords(r ? w[`ask${state.round}` as "ask0"] : w.done, 64);
  const sayLines = wrapWords(say_, 74);

  const graphs = (live: boolean) => {
    if (!r) return null;
    const d1 = derivP(r.f);
    const polys = [r.f, d1, derivP(d1)];
    const shown = [r.showF, true, r.showF2];
    return (
      <>
        {polys.map((p, i) => {
          const top = TOPS[i];
          const label = <text x={30} y={top + PANEL / 2 + 7} fontSize={22} fontWeight={700} fill={INK} pointerEvents="none">{["f", "f′", "f″"][i]}</text>;
          if (!shown[i])
            return (
              <g key={i} pointerEvents="none" data-hidden="">
                {label}
                <rect x={X(-EDGE)} y={top} width={2 * EDGE * U} height={PANEL} fill="#f1f3f5" stroke="#ced4da" strokeDasharray="6 5" rx={8} />
                <text x={XC} y={top + PANEL / 2 + 6} fontSize={17} textAnchor="middle" fill={MUTED}>{w.hidden}</text>
              </g>
            );
          const g = panel(p, top, i > 0, live ? "a" : "b");
          return (
            <g key={i} pointerEvents="none" data-graph={["f", "d1", "d2"][i]}>
              {label}
              {g.body}
              <circle cx={X(x)} cy={g.Y(evalP(p, x))} r={6} fill={ok ? GREEN : ASK} stroke={INK} strokeWidth={1.2} />
            </g>
          );
        })}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((j) => (
          <text key={j} x={X(j)} y={TOPS[2] + PANEL + 22} fontSize={14} textAnchor="middle" fill={MUTED} pointerEvents="none">{String(j).replace("-", "−")}</text>
        ))}
        <line x1={X(x)} y1={TOPS[0] - 8} x2={X(x)} y2={TOPS[2] + PANEL + 4} stroke={ok ? GREEN : ASK} strokeWidth={2.4} pointerEvents="none" data-line={x} />
        {live && !ok && <rect x={X(-EDGE)} y={TOPS[0] - 10} width={2 * EDGE * U} height={TOPS[2] + PANEL - TOPS[0] + 20} fill="transparent" style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, { line: true })} />}
        {live && !ok && (
          <g role="slider" tabIndex={0} aria-label={fill(w.lineLabel, { x: String(x).replace("-", "−") })} aria-valuenow={x} aria-valuemin={-X_FAR} aria-valuemax={X_FAR}
            onKeyDown={onKey} onPointerDown={(e) => begin(e, { line: true })} style={{ cursor: "ew-resize" }} data-handle="">
            <rect x={X(x) - 16} y={TOPS[0] - 10} width={32} height={TOPS[2] + PANEL - TOPS[0] + 20} fill="transparent" />
          </g>
        )}
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none", touchAction: "none" }} {...svgProps}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={30} y={36 + i * 25} fontSize={19} fontWeight={700} fill={r ? BLUE : MUTED}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {r && <text x={W - 30} y={TOPS[0] - 14} fontSize={14} textAnchor="end" fill={MUTED}>{fill(w.round, { k: state.round + 1, n: SHAPE_ROUNDS.length })}</text>}
        {graphs(true)}
        {r && <text x={XC} y={TOPS[2] + PANEL + 54} fontSize={18} fontWeight={700} textAnchor="middle" fill={ok ? GREEN : BLUE} data-reading="">{reading(r)}</text>}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={TOPS[2] + PANEL + 86 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 50} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {!r && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={TOPS[2] + PANEL + 70 - TOPS[0] + 20} viewBox={`0 ${TOPS[0] - 20} ${W} ${TOPS[2] + PANEL + 70 - TOPS[0] + 20}`} fontFamily={FONT}>
          <rect x={0} y={TOPS[0] - 20} width={W} height={TOPS[2] + PANEL + 90} fill="#fff" />
          {graphs(false)}
          {r && <text x={XC} y={TOPS[2] + PANEL + 54} fontSize={17} fontWeight={700} textAnchor="middle" fill={BLUE}>{reading(r)}</text>}
        </svg>
      </div>
    </>
  );
}
