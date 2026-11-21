// A fraction worked by hand: a circle or a bar cut into equal parts. Tap a part to shade it or take the shading off;
// drag across parts to paint them all the same way. The fraction underneath is two numbers to drag or tap: the top
// shades that many parts, the bottom cuts the shape into that many. The pills pick the shape.
import type { KeyboardEvent, PointerEvent } from "react";
import { paintParts, shadeFirst, sliceAt } from "../math/live";
import { keyTap, NumBox, Tabs, useDrag } from "./hand";
import { sectorPath } from "./sectors";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 300;
const CX = 150;
const CY = 156;
const R = 104;
const BAR = { x: 10, y: 114, w: 280, h: 84 };
const SHAPES = ["circle", "bar"] as const;
const SHADE = "#a5d8ff";
type Drag = { first: number; over: number[] };

export function Fractions({ state, set, w: words, svgRef }: PieceProps<"fractions">) {
  const w = words.fractions;
  const n = state.parts;
  const circle = state.shape === "circle";
  /** The part under a point of the picture, or null off the shape. */
  const partAt = (x: number, y: number) => {
    if (circle) return Math.hypot(x - CX, y - CY) <= R ? sliceAt(x - CX, y - CY, n) : null;
    if (y < BAR.y || y > BAR.y + BAR.h || x < BAR.x || x > BAR.x + BAR.w) return null;
    return Math.min(n - 1, Math.floor(((x - BAR.x) * n) / BAR.w));
  };
  const { drag, begin, svgProps } = useDrag<Drag>(
    (d) => set({ ...state, shaded: d.moved ? paintParts(state.shaded, d.first, d.over) : state.shaded.map((s, j) => (j === d.first ? !s : s)) }),
    (d) => {
      const i = partAt(d.x, d.y);
      if (i !== null && !d.over.includes(i)) d.over.push(i);
    },
  );
  const shaded = drag?.moved ? paintParts(state.shaded, drag.first, drag.over) : state.shaded;
  const k = shaded.filter(Boolean).length;
  const toggle = (i: number) => set({ ...state, shaded: state.shaded.map((s, j) => (j === i ? !s : s)) });
  const cut = (parts: number) => set({ ...state, parts, shaded: shadeFirst(parts, Math.min(k, parts)) });

  const part = (i: number) => ({
    key: i,
    role: "button",
    tabIndex: 0,
    "aria-label": fill(w.part, { n: i + 1, d: n, s: shaded[i] ? w.shaded : w.plain }),
    "aria-pressed": shaded[i],
    fill: shaded[i] ? SHADE : "#fff",
    stroke: INK,
    strokeWidth: 2.5,
    style: { cursor: "pointer" },
    onPointerDown: (e: PointerEvent) => begin(e, { first: i, over: [i] }),
    onKeyDown: (e: KeyboardEvent) => keyTap(e, () => toggle(i)),
  });
  const H = 382;
  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={10} y={8} keys={SHAPES} on={state.shape} names={{ circle: w.circle, bar: w.bar }}
          onPick={(shape) => set({ ...state, shape })} />
        {circle
          ? Array.from({ length: n }, (_, i) =>
              n === 1 ? <circle cx={CX} cy={CY} r={R} {...part(i)} /> : <path d={sectorPath(CX, CY, R, (i * 360) / n, ((i + 1) * 360) / n)} {...part(i)} />,
            )
          : Array.from({ length: n }, (_, i) => <rect x={BAR.x + (i * BAR.w) / n} y={BAR.y} width={BAR.w / n} height={BAR.h} {...part(i)} />)}
        <NumBox x={CX - 34} y={272} w={68} h={44} value={k} min={0} max={n} size={26} label={fill(w.top, { k, n })}
          onChange={(v) => set({ ...state, shaded: shadeFirst(n, v) })} />
        <line x1={CX - 44} y1={323} x2={CX + 44} y2={323} stroke={INK} strokeWidth={3} />
        <NumBox x={CX - 34} y={330} w={68} h={44} value={n} min={1} max={12} size={26} label={fill(w.bottom, { n })} onChange={cut} />
        <text x={CX + 56} y={302} fontSize={13} fill="#868e96">{w.shadedParts}</text>
        <text x={CX + 56} y={360} fontSize={13} fill="#868e96">{w.allParts}</text>
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
