// Test the points. An inequality in x and y over a grid of whole-number points: tap a point and it is tested, the two
// sides worked out and the point dotted green when true and red when false. Once eight points are tested, one of them
// on the line, the region shades in: all the green points lie on one side, and the line is solid or dashed as its
// own points pass or fail. The third inequality, x − y > 2, shades below its line, not above.
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { clip, holds, onLine, shown, square, strict, TEST_INEQS, testAt, type Pt } from "../math/regions";
import { BLUE, GREEN, MUTED, pointIn, RED, Tabs, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const R = 5;
const U = 30;
const CX = 200;
const CY = 220;
const SAY_Y = 410;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => CX + x * U;
const Y = (y: number) => CY - y * U;
const clamp = (v: number) => Math.max(-R, Math.min(R, v));

export function TestPoints({ state, set, w: words, svgRef }: PieceProps<"testPoints">) {
  const w = words.testPoints;
  const t = TEST_INEQS[state.which];
  const done = shown(state);
  const last = state.tested[state.tested.length - 1];
  const tap = (e: ReactPointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    const [px, py] = pointIn(e);
    set(testAt(state, [clamp(Math.round((px - CX) / U)), clamp(Math.round((CY - py) / U))]));
  };
  const keys = (e: KeyboardEvent) => {
    const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!step && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    if (step) set({ ...state, at: [clamp(state.at[0] + step[0]), clamp(state.at[1] + step[1])] });
    else set(testAt(state, state.at));
  };
  const said = (p: Pt) => {
    const [l, r] = [t.lhs(p), t.rhs(p)];
    return fill(holds(t.q, p) ? w.yes : w.no, { p: `(${p[0]}, ${p[1]})`.replaceAll("-", "−"), l: String(l).replace("-", "−"), op: t.op, r: String(r).replace("-", "−") });
  };
  const say = wrapWords(
    [last ? said(last) : fill(w.start, { q: t.text }), done ? fill(strict(t.op) ? w.doneDashed : w.doneSolid, { q: t.text }) : fill(w.count, { k: state.tested.length, n: 8 })].join(" "),
    76,
  );
  const region = clip(square(R), t.q);
  const ends = clip(clip(square(R), { ...t.q, op: "≥" }), { ...t.q, op: "≤" });
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={385} y={20} keys={TEST_INEQS.map((_, i) => String(i))} on={String(state.which)} names={Object.fromEntries(TEST_INEQS.map((q, i) => [i, q.text]))}
          onPick={(k) => set({ which: Number(k), tested: [], at: [0, 0] })} />
        <g pointerEvents="none">
          {done && <polygon points={region.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")} fill={BLUE} fillOpacity={0.15} />}
          {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(-R)} x2={X(v)} y2={Y(R)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              <line x1={X(-R)} y1={Y(v)} x2={X(R)} y2={Y(v)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v !== 0 && v % 2 === 0 && <text x={X(v)} y={Y(0) + 16} fontSize={11} textAnchor="middle" fill={MUTED}>{String(v).replace("-", "−")}</text>}
              {v !== 0 && v % 2 === 0 && <text x={X(0) - 6} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{String(v).replace("-", "−")}</text>}
            </g>
          ))}
          {ends.length >= 2 && (
            <line x1={X(ends[0][0])} y1={Y(ends[0][1])} x2={X(ends[ends.length - 1][0])} y2={Y(ends[ends.length - 1][1])} stroke={done ? BLUE : MUTED}
              strokeWidth={done ? 3 : 2} strokeDasharray={done && strict(t.op) ? "8 6" : done ? undefined : "2 4"} />
          )}
          {state.tested.map(([x, y], i) => {
            const ok = holds(t.q, [x, y]);
            return <circle key={i} cx={X(x)} cy={Y(y)} r={onLine(state.which, [x, y]) ? 8 : 6} fill={ok ? GREEN : RED} stroke="#fff" strokeWidth={1.5} />;
          })}
          <rect x={X(state.at[0]) - 11} y={Y(state.at[1]) - 11} width={22} height={22} rx={5} fill="none" stroke={ORANGE} strokeWidth={2.5} />
        </g>
        <rect x={X(-R) - U / 2} y={Y(R) - U / 2} width={2 * R * U + U} height={2 * R * U + U} fill="transparent" role="grid" tabIndex={0}
          aria-label={fill(w.grid, { p: `(${state.at[0]}, ${state.at[1]})` })} onKeyDown={keys} onPointerDown={tap} style={{ cursor: "crosshair" }} />
        <g pointerEvents="none">
          <text x={420} y={100} fontSize={26} fontWeight={700} fill={INK}>{t.text}</text>
          <circle cx={430} cy={140} r={7} fill={GREEN} />
          <text x={445} y={145} fontSize={15} fill={INK}>{w.trueKey}</text>
          <circle cx={430} cy={168} r={7} fill={RED} />
          <text x={445} y={173} fontSize={15} fill={INK}>{w.falseKey}</text>
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={done ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
