// Move the shape: a blue shape on a grid and the dashed orange outline of where it has gone, by one slide, flip, turn
// or enlargement. Pick a move and set it by hand: drag the green copy to slide it; drag the mirror line, and tap its
// end to turn it a different way; drag the centre and the turning handle; drag the centre and the scale factor. When
// the green copy covers the outline the move is named, and what stayed the same with it: the lengths and angles, or
// only the angles. The die deals another shape and move.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { imageOf, moveTask, sameShape, SCALES, TOOLS, type LiveMoveShape, type Mirror, type P2, type Tool } from "../math/moveShape";
import { DieButton, GREEN, keyTap, Tabs, Track, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const U = 26;
const [NX, NY] = [8, 6];
const OX = W / 2;
const OY = 64 + NY * U;
const SAY_Y = OY + NY * U + 76;
const H = SAY_Y + 3 * 25 + 8;
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const PURPLE = "#9c36b5";
const X = (x: number) => OX + x * U;
const Y = (y: number) => OY - y * U;
const gx = (px: number) => Math.max(-NX, Math.min(NX, Math.round((px - OX) / U)));
const gy = (py: number) => Math.max(-NY, Math.min(NY, Math.round((OY - py) / U)));
const DIRS: Mirror["dir"][] = ["v", "h", "d1", "d2"];
const ptsOf = (ps: P2[]) => ps.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
const neg = (v: number) => (v < 0 ? `−${-v}` : String(v));
const kText = (k: number) => (k === 0.5 ? "½" : k === -0.5 ? "−½" : neg(k));

/** The two ends of a mirror line, just past the grid. */
function mirrorEnds(m: Mirror): [P2, P2] {
  const [a, b] = [NX + 0.5, NY + 0.5];
  if (m.dir === "v") return [[m.c, -b], [m.c, b]];
  if (m.dir === "h") return [[-a, m.c], [a, m.c]];
  const lo = Math.max(-a, m.dir === "d1" ? -b - m.c : m.c - b), hi = Math.min(a, m.dir === "d1" ? b - m.c : m.c + b);
  return m.dir === "d1" ? [[lo, lo + m.c], [hi, hi + m.c]] : [[lo, m.c - lo], [hi, m.c - hi]];
}
const mirrorName = (m: Mirror) =>
  m.dir === "v" ? `x = ${neg(m.c)}` : m.dir === "h" ? `y = ${neg(m.c)}` : m.dir === "d1" ? `y = x${m.c ? ` ${m.c > 0 ? "+" : "−"} ${Math.abs(m.c)}` : ""}` : `y = −x${m.c ? ` ${m.c > 0 ? "+" : "−"} ${Math.abs(m.c)}` : ""}`;

type Hold = { part: "copy" | "mirror" | "centre" | "turn"; s0: LiveMoveShape };

export function MoveShape({ state, set, w: words, svgRef }: PieceProps<"moveShape">) {
  const w = words.moveShape;
  const [draft, setDraft] = useState<LiveMoveShape | null>(null);
  const d = draft ?? state;
  const task = moveTask(d.task);
  const image = imageOf(d, task.base);
  const done = sameShape(image, task.target);

  const { drag, begin, svgProps } = useDrag<Hold>(
    (h) => {
      if (!h.moved && h.part === "mirror") return;
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => {
      if (!h.moved) return;
      const s = h.s0;
      if (h.part === "copy") return setDraft({ ...s, dx: s.dx + Math.round((h.x - h.x0) / U), dy: s.dy - Math.round((h.y - h.y0) / U) });
      if (h.part === "centre") return setDraft({ ...s, centre: [gx(h.x), gy(h.y)] });
      if (h.part === "turn") {
        const deg = (Math.atan2(Y(s.centre[1]) - h.y, h.x - X(s.centre[0])) * 180) / Math.PI;
        return setDraft({ ...s, q: ((Math.round(deg / 90) % 4) + 4) % 4 });
      }
      // The mirror moves across itself, to the grid line or diagonal nearest the pointer.
      const [x, y] = [(h.x - OX) / U, (OY - h.y) / U];
      const m = s.mirror;
      const c = m.dir === "v" ? x : m.dir === "h" ? y : m.dir === "d1" ? y - x : y + x;
      setDraft({ ...s, mirror: { ...m, c: Math.max(-6, Math.min(6, Math.round(c))) } });
    },
  );
  const grab = (part: Hold["part"]) => (e: PointerEvent) => begin(e, { part, s0: d });
  const keys = (e: KeyboardEvent, patch: (dx: number, dy: number) => Partial<LiveMoveShape> | null) => {
    const v = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!v) return;
    e.preventDefault();
    e.stopPropagation();
    const p = patch(v[0], v[1]);
    if (p) set({ ...d, ...p });
  };
  const spinMirror = () => set({ ...d, mirror: { dir: DIRS[(DIRS.indexOf(d.mirror.dir) + 1) % 4], c: 0 } });

  const grid = () => {
    const out = [];
    for (let i = -NX; i <= NX; i++) out.push(<line key={`v${i}`} x1={X(i)} y1={Y(-NY)} x2={X(i)} y2={Y(NY)} stroke={i === 0 ? INK : "#e9ecef"} strokeWidth={i === 0 ? 1.6 : 1} />);
    for (let i = -NY; i <= NY; i++) out.push(<line key={`h${i}`} x1={X(-NX)} y1={Y(i)} x2={X(NX)} y2={Y(i)} stroke={i === 0 ? INK : "#e9ecef"} strokeWidth={i === 0 ? 1.6 : 1} />);
    return out;
  };

  const handles = () => {
    if (d.tool === "slide")
      return (
        <polygon role="slider" tabIndex={0} aria-label={w.copyName} aria-valuetext={`(${d.dx}, ${d.dy})`} points={ptsOf(image)} fill="transparent"
          style={{ cursor: drag ? "grabbing" : "grab" }} onPointerDown={grab("copy")} onKeyDown={(e) => keys(e, (a, b) => ({ dx: d.dx + a, dy: d.dy + b }))} />
      );
    if (d.tool === "flip") {
      const [a, b] = mirrorEnds(d.mirror);
      return (
        <>
          <g role="slider" tabIndex={0} aria-label={w.mirrorName} aria-valuetext={mirrorName(d.mirror)} style={{ cursor: "move" }} onPointerDown={grab("mirror")}
            onKeyDown={(e) => { keyTap(e, spinMirror); keys(e, (dx, dy) => ({ mirror: { ...d.mirror, c: Math.max(-6, Math.min(6, d.mirror.c + (d.mirror.dir === "v" ? dx : d.mirror.dir === "h" ? dy : dy - dx))) } })); }}>
            <line x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={PURPLE} strokeWidth={3} strokeDasharray="10 6" />
            <line x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke="transparent" strokeWidth={22} />
          </g>
          <g role="button" tabIndex={0} aria-label={w.spinName} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={spinMirror} onKeyDown={(e) => keyTap(e, spinMirror)}>
            <circle cx={X(b[0])} cy={Y(b[1])} r={13} fill="#fff" stroke={PURPLE} strokeWidth={3} />
            <path d={`M${X(b[0]) - 6},${Y(b[1]) + 2} A6,6 0 1 1 ${X(b[0]) + 2},${Y(b[1]) + 6}`} fill="none" stroke={PURPLE} strokeWidth={2} />
          </g>
        </>
      );
    }
    const [cx, cy] = [X(d.centre[0]), Y(d.centre[1])];
    const centre = (
      <g role="slider" tabIndex={0} aria-label={w.centreName} aria-valuetext={`(${d.centre[0]}, ${d.centre[1]})`} style={{ cursor: "move" }} onPointerDown={grab("centre")}
        onKeyDown={(e) => keys(e, (a, b) => ({ centre: [Math.max(-NX, Math.min(NX, d.centre[0] + a)), Math.max(-NY, Math.min(NY, d.centre[1] + b))] }))}>
        <circle cx={cx} cy={cy} r={7} fill={PURPLE} />
        <circle cx={cx} cy={cy} r={18} fill="transparent" />
      </g>
    );
    if (d.tool === "turn") {
      const a = (d.q * Math.PI) / 2;
      const [hx, hy] = [cx + 52 * Math.cos(a), cy - 52 * Math.sin(a)];
      return (
        <>
          <circle cx={cx} cy={cy} r={52} fill="none" stroke={PURPLE} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 5" pointerEvents="none" />
          <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={PURPLE} strokeWidth={3} pointerEvents="none" />
          {centre}
          <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuenow={d.q * 90} aria-valuetext={`${d.q * 90}°`} style={{ cursor: "grab" }} onPointerDown={grab("turn")}
            onKeyDown={(e) => keys(e, (dx, dy) => ({ q: (((d.q + (dx || dy)) % 4) + 4) % 4 }))}>
            <circle cx={hx} cy={hy} r={11} fill="#fff" stroke={PURPLE} strokeWidth={3} />
            <circle cx={hx} cy={hy} r={20} fill="transparent" />
          </g>
        </>
      );
    }
    return centre;
  };

  const desc = done
    ? d.tool === "slide" ? fill(w.did.slide, { v: `(${neg(d.dx)}, ${neg(d.dy)})` })
      : d.tool === "flip" ? fill(w.did.flip, { line: mirrorName(d.mirror) })
      : d.tool === "turn" ? fill(w.did.turn, { deg: d.q * 90, c: `(${neg(d.centre[0])}, ${neg(d.centre[1])})` })
      : fill(w.did.enlarge, { k: kText(SCALES[d.k]), c: `(${neg(d.centre[0])}, ${neg(d.centre[1])})` })
    : "";
  const say = done ? [desc, ...wrapWords(d.tool === "enlarge" && Math.abs(SCALES[d.k]) !== 1 ? w.similar : w.congruent, 70)] : wrapWords(w.how[d.tool], 70);
  const pick = (tool: Tool) => set({ ...d, tool });
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={TOOLS} on={d.tool} names={w.tools} onPick={pick} />
        <DieButton x={W - 58} y={10} s={36} title={w.again} onTap={() => set({ ...state, task: state.task + 1, dx: 0, dy: 0, q: 0 })} />
        {grid()}
        <polygon points={ptsOf(task.base)} fill={BLUE} fillOpacity={0.3} stroke={BLUE} strokeWidth={2.5} pointerEvents="none" />
        <polygon points={ptsOf(task.target)} fill="none" stroke={ORANGE} strokeWidth={3} strokeDasharray="7 5" pointerEvents="none" />
        <polygon points={ptsOf(image)} fill={GREEN} fillOpacity={done ? 0.55 : 0.35} stroke={GREEN} strokeWidth={done ? 3.5 : 2.5} pointerEvents="none" />
        {handles()}
        {d.tool === "enlarge" && (
          <Track x={20} y={Y(-NY) + 14} w={W - 40} value={d.k} min={0} max={SCALES.length - 1} label={w.scaleName} show={(i) => `k = ${kText(SCALES[i])}`}
            onChange={(k, end) => (end ? (setDraft(null), set({ ...d, k })) : setDraft({ ...d, k }))} color={PURPLE} />
        )}
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fontWeight={i === 0 && done ? 700 : 400} fill={i === 0 && done ? GREEN : INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
