// Move the graph. A parent graph, x², |x| or √x, dashed, and a copy to drag: its orange key point moves it (right h,
// up k) and its green point one step to the right sets the stretch a, a minus flipping it. The formula y = a·f(x − h)
// + k follows every move, and the words say why a move right shows as a minus inside the bracket.
import { useState, type KeyboardEvent } from "react";
import { formulaOf, MOVE_MAX, movedAt, PARENTS, STRETCH_MAX, type LiveMoveGraph } from "../math/fnTransform";
import { BLUE, GREEN, MUTED, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 30;
const PY = 50;
const U = 22;
const R = 7;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + (x + R) * U;
const Y = (y: number) => PY + (R - y) * U;
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
type Grip = "point" | "stretch";

export function MoveGraph({ state, set, w: words, svgRef }: PieceProps<"moveGraph">) {
  const w = words.moveGraph;
  const [draft, setDraft] = useState<LiveMoveGraph | null>(null);
  const s = draft ?? state;
  const toA = (py: number, old: number) => {
    const a = clamp(Math.round(R - (py - PY) / U - s.k), STRETCH_MAX);
    return a === 0 ? old : a;
  };
  const { drag, begin, svgProps } = useDrag<{ grip: Grip }>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (d) =>
      setDraft(
        d.grip === "point"
          ? { ...state, h: clamp(Math.round((d.x - PX) / U - R), MOVE_MAX), k: clamp(Math.round(R - (d.y - PY) / U), MOVE_MAX) }
          : { ...state, a: toA(d.y, state.a) },
      ),
  );
  const keys = (grip: Grip) => (e: KeyboardEvent) => {
    const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    if (grip === "point") set({ ...state, h: clamp(state.h + step[0], MOVE_MAX), k: clamp(state.k + step[1], MOVE_MAX) });
    else if (step[1]) {
      const a = clamp(state.a + step[1], STRETCH_MAX);
      set({ ...state, a: a === 0 ? state.a + 2 * step[1] : a });
    }
  };
  const p = PARENTS[s.parent];
  const n = (v: number) => Math.abs(v);
  const parts = [
    s.h > 0 && fill(w.right, { n: n(s.h) }),
    s.h < 0 && fill(w.left, { n: n(s.h) }),
    s.k > 0 && fill(w.up, { n: n(s.k) }),
    s.k < 0 && fill(w.down, { n: n(s.k) }),
    n(s.a) !== 1 && fill(w.stretch, { a: n(s.a) }),
    s.a < 0 && w.flip,
  ].filter(Boolean);
  const say = wrapWords(`${formulaOf(s)}. ${parts.length ? parts.join(" ") : fill(w.home, { f: p.name })}`, 80);
  const path = (f: (x: number) => number) =>
    Array.from({ length: 561 }, (_, i) => -R + i / 40)
      .map((x) => [x, f(x)] as const)
      .filter(([, y]) => Number.isFinite(y) && Math.abs(y) <= R)
      .map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`)
      .join("");
  const grip = (g: Grip, cx: number, cy: number, color: string, label: string, now: string) => (
    <g role="slider" tabIndex={0} aria-label={label} aria-valuetext={now} onKeyDown={keys(g)} onPointerDown={(e) => begin(e, { grip: g })}
      style={{ cursor: drag ? "grabbing" : g === "point" ? "move" : "ns-resize" }}>
      <circle cx={cx} cy={cy} r={18} fill="transparent" />
      <circle cx={cx} cy={cy} r={8} fill="#fff" stroke={color} strokeWidth={3.5} />
    </g>
  );
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={PARENTS.map((_, i) => String(i))} on={String(s.parent)} names={Object.fromEntries(PARENTS.map((q, i) => [i, `y = ${q.name}`]))}
          onPick={(k) => set({ ...state, parent: Number(k) })} />
        <g pointerEvents="none">
          {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(R)} x2={X(v)} y2={Y(-R)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              <line x1={X(-R)} y1={Y(v)} x2={X(R)} y2={Y(v)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v !== 0 && v % 2 === 0 && <text x={X(v)} y={Y(0) + 15} fontSize={11} textAnchor="middle" fill={MUTED}>{String(v).replace("-", "−")}</text>}
              {v !== 0 && v % 2 === 0 && <text x={X(0) - 5} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{String(v).replace("-", "−")}</text>}
            </g>
          ))}
          <path d={path(p.f)} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="6 5" />
          <path d={path((x) => movedAt(s, x))} fill="none" stroke={BLUE} strokeWidth={3} />
          {/* How far the key point moved: across, then up or down. */}
          {s.h !== 0 && <line x1={X(0)} y1={Y(0)} x2={X(s.h)} y2={Y(0)} stroke={ORANGE} strokeWidth={2} strokeDasharray="3 4" />}
          {s.k !== 0 && <line x1={X(s.h)} y1={Y(0)} x2={X(s.h)} y2={Y(s.k)} stroke={ORANGE} strokeWidth={2} strokeDasharray="3 4" />}
          <text x={400} y={84} fontSize={22} fontWeight={700} fill={INK}>{formulaOf(s)}</text>
          <text x={400} y={118} fontSize={14} fill={ORANGE}>{fill(w.moved, { h: String(s.h).replace("-", "−"), k: String(s.k).replace("-", "−") })}</text>
          <text x={400} y={142} fontSize={14} fill={GREEN}>{fill(w.stretched, { a: String(s.a).replace("-", "−") })}</text>
          <text x={400} y={166} fontSize={14} fill={MUTED}>{fill(w.parent, { f: p.name })}</text>
        </g>
        {grip("point", X(s.h), Y(s.k), ORANGE, w.pointLabel, `(${s.h}, ${s.k})`)}
        {grip("stretch", X(s.h + 1), Y(clamp(s.k + s.a, R)), GREEN, w.stretchLabel, String(s.a))}
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
