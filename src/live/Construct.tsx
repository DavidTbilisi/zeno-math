// Construct with a compass and a straight edge, nothing else. Pick the compass and drag from a point to a point: a
// circle about the first through the second. Pick the straight edge and drag from a point to a point: the line through
// both. The points are the given ones and wherever two marks cross, so every step lands exactly. A ladder of five:
// the perpendicular bisector, the angle bisector, the equilateral triangle, the perpendicular through a point, the
// hexagon in a circle. When the task is built, the triangles that make it work are shaded and the reason is written.
import { useId, useState, type PointerEvent } from "react";
import { AREA, C_TASKS, GIVEN, goalMet, lineEnds, pointsOf, whyTriangles, dist, type LiveConstruct, type Mark, type Pt, type Tool } from "../math/compass";
import { BLUE, GREEN, MUTED, pointIn, Tabs, useDrag, wrapWords } from "./hand";
import { FONT, INK, type PieceProps } from "./ui";

const W = AREA.x1;
const SAY_Y = AREA.y1 + 30;
const H = SAY_Y + 4 * 24 + 6;
const ORANGE = "#e8590c";
/** How near a press or a let-go must be to a point to take it. */
const GRAB = 22;
type Hold = { from: Pt };

export function Construct({ state, set, w: words, svgRef }: PieceProps<"construct">) {
  const w = words.construct;
  const clip = useId();
  const [hover, setHover] = useState<Pt | null>(null);
  const pts = pointsOf(state.task, state.marks);
  const nearest = (x: number, y: number, not?: Pt) => {
    let best: Pt | null = null;
    for (const p of pts) if ((!not || dist(p, not) > 0.5) && dist(p, [x, y]) < GRAB && (!best || dist(p, [x, y]) < dist(best, [x, y]))) best = p;
    return best;
  };
  const { drag, begin, svgProps } = useDrag<Hold>(
    (h) => {
      const to = nearest(h.x, h.y, h.from);
      setHover(null);
      if (!h.moved || !to) return;
      const mark: Mark = state.tool === "compass" ? { k: "c", c: h.from, p: to } : { k: "l", a: h.from, b: to };
      const marks = [...state.marks, mark];
      const done = goalMet(state.task, marks) && !state.done.includes(state.task) ? [...state.done, state.task] : state.done;
      set({ ...state, marks, done });
    },
    (h) => setHover(nearest(h.x, h.y, h.from)),
  );
  const press = (e: PointerEvent<SVGRectElement>) => {
    const from = nearest(...pointIn(e));
    if (from) begin(e, { from });
  };

  const built = goalMet(state.task, state.marks);
  const shade = built ? whyTriangles(state.task, state.marks) : [];
  const draw = (m: Mark, i: number | string, color: string, width: number, dash?: string) => {
    if (m.k === "c") return <circle key={i} cx={m.c[0]} cy={m.c[1]} r={dist(m.c, m.p)} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />;
    const [a, b] = lineEnds(m);
    return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />;
  };
  // The mark being drawn: from the point held to the point under the finger, or to the finger itself.
  const ghost: Mark | null = drag?.moved ? (() => {
    const to: Pt = hover ?? [drag.x, drag.y];
    if (dist(to, drag.from) < 1) return null;
    return state.tool === "compass" ? { k: "c", c: drag.from, p: to } : { k: "l", a: drag.from, b: to };
  })() : null;

  const say = [
    w.goal[state.task],
    ...wrapWords(built ? w.why[state.task] : state.tool === "compass" ? w.useCompass : w.useRuler, 78),
  ];
  const names = Object.fromEntries(C_TASKS.map((t) => [t, (state.done.includes(t) ? "✓ " : "") + w.tasks[t]])) as Record<LiveConstruct["task"], string>;
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={12} y={10} keys={C_TASKS} on={state.task} names={names} size={13} gap={5}
          onPick={(task) => set({ ...state, task, marks: [] })} />
        <Tabs x={12} y={50} keys={["compass", "ruler"] as const} on={state.tool} names={{ compass: w.compass, ruler: w.ruler }}
          onPick={(tool: Tool) => set({ ...state, tool })} />
        <clipPath id={clip}><rect x={AREA.x0} y={AREA.y0} width={AREA.x1 - AREA.x0} height={AREA.y1 - AREA.y0} /></clipPath>
        <rect x={AREA.x0 + 1} y={AREA.y0} width={AREA.x1 - AREA.x0 - 2} height={AREA.y1 - AREA.y0} fill="#fcfcfd" stroke="#e9ecef" />
        <g clipPath={`url(#${clip})`}>
          {shade.map((t, i) => <polygon key={i} points={t.map((p) => p.join(",")).join(" ")} fill={GREEN} fillOpacity={0.16} stroke={GREEN} strokeWidth={1.5} />)}
          {GIVEN[state.task].marks.map((m, i) => draw(m, `g${i}`, INK, 3))}
          {state.marks.map((m, i) => (m.k === "c" ? draw(m, i, ORANGE, 1.6) : draw(m, i, built ? GREEN : BLUE, 2.2)))}
          {ghost && draw(ghost, "ghost", state.tool === "compass" ? ORANGE : BLUE, 1.6, "6 5")}
        </g>
        {/* The press goes on the drawing; it takes the nearest point. */}
        <rect x={AREA.x0} y={AREA.y0} width={AREA.x1 - AREA.x0} height={AREA.y1 - AREA.y0} fill="transparent" onPointerDown={press}
          style={{ cursor: drag ? "grabbing" : "crosshair" }} />
        {pts.map((p, i) => {
          const given = GIVEN[state.task].pts.find((q) => dist(q.p, p) < 0.5);
          const hot = (hover && dist(hover, p) < 0.5) || (drag && dist(drag.from, p) < 0.5);
          return (
            <g key={i} pointerEvents="none">
              <circle cx={p[0]} cy={p[1]} r={hot ? 8 : given ? 5 : 4} fill={hot ? "#fff" : given ? INK : MUTED} stroke={hot ? BLUE : "none"} strokeWidth={3} />
              {given && <text x={p[0] - 12} y={p[1] - 10} fontSize={16} fontWeight={700} fill={INK} stroke="#fff" strokeWidth={3} paintOrder="stroke">{given.name}</text>}
            </g>
          );
        })}
        {say.map((s, i) => <text key={i} x={16} y={SAY_Y + i * 24} fontSize={16} fontWeight={i === 0 ? 700 : 400} fill={i > 0 && built ? GREEN : INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
