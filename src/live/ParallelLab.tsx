// Angles on parallel lines, by hand. Two parallel lines and a transversal through them: drag the transversal's end
// round and the eight angles change, but they stay two sizes, one colour each, purple θ and green 180° − θ. Tap an
// angle to see its partners named at the other crossing: corresponding, alternate, vertically opposite, co-interior.
// The triangle view puts a triangle between the lines, its top corner on the top line: the angles beside the corner are
// alternate to the base angles, so the three angles of the triangle fill the straight line, 180°.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { clampApex, clampLabTheta, LAB_PLACES, pairOf, positionAngle, type Corner, type LiveParallelLab } from "../math/parallelAngles";
import { BLUE, GREEN, keyTap, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const [YP, YQ] = [130, 300];
const CX = 320;
const SAY_Y = 436;
const H = SAY_Y + 4 * 26 + 10;
const PURPLE = "#9c36b5";
const ORANGE = "#e8590c";
const rad = (d: number) => (d * Math.PI) / 180;
const SECTOR: Record<Corner, (t: number) => [number, number]> = { tr: (t) => [0, t], tl: (t) => [t, 180], bl: (t) => [180, 180 + t], br: (t) => [180 + t, 360] };

/** A filled wedge at (x, y) from one direction to another (degrees, y up), radius r. */
function wedge(x: number, y: number, from: number, to: number, r: number) {
  const [a, b] = [rad(from), rad(to)];
  return `M${x},${y} L${x + r * Math.cos(a)},${y - r * Math.sin(a)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 0 ${x + r * Math.cos(b)},${y - r * Math.sin(b)} Z`;
}
const arrowsAt = (x: number, y: number) => [0, 10].map((d) => `M${x + d - 7},${y - 6} L${x + d},${y} L${x + d - 7},${y + 6}`).join(" ");

type Hold = { part: "end" | "apex" };

export function ParallelLab({ state, set, w: words, svgRef }: PieceProps<"parallelLab">) {
  const w = words.parallelLab;
  /** What is shown while a part is held, kept as one step to undo when it is let go. */
  const [draft, setDraft] = useState<LiveParallelLab | null>(null);
  const d = draft ?? state;
  const { drag, begin, svgProps } = useDrag<Hold>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => {
      if (!h.moved) return;
      if (h.part === "end") setDraft({ ...d, theta: clampLabTheta((Math.atan2((YP + YQ) / 2 - h.y, h.x - CX) * 180) / Math.PI) });
      else setDraft({ ...d, apex: clampApex(h.x) });
    },
  );
  const grab = (part: Hold["part"]) => (e: PointerEvent) => begin(e, { part });
  const keys = (e: KeyboardEvent, v: number, to: (n: number) => void) => {
    const n = { ArrowRight: v + 1, ArrowUp: v + 1, ArrowLeft: v - 1, ArrowDown: v - 1, PageUp: v + 10, PageDown: v - 10 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    to(n);
  };

  const lines = () => (
    <>
      <line x1={20} y1={YP} x2={W - 20} y2={YP} stroke={BLUE} strokeWidth={4} />
      <line x1={20} y1={YQ} x2={W - 20} y2={YQ} stroke={BLUE} strokeWidth={4} />
      <path d={`${arrowsAt(40, YP)} ${arrowsAt(40, YQ)}`} fill="none" stroke={ORANGE} strokeWidth={2.5} />
    </>
  );

  const linesView = () => {
    const t = d.theta;
    const mid = (YP + YQ) / 2;
    const xAt = (y: number) => CX + (mid - y) / Math.tan(rad(t));
    const reach = Math.min((mid - 30) / Math.sin(rad(t)), 300 / Math.abs(Math.cos(rad(t)) || 1));
    const end = [CX + reach * Math.cos(rad(t)), mid - reach * Math.sin(rad(t))];
    const start = [CX - reach * Math.cos(rad(t)), mid + reach * Math.sin(rad(t))];
    const picked = d.pick === null ? null : LAB_PLACES[d.pick];
    return (
      <>
        {lines()}
        {LAB_PLACES.map((p, i) => {
          const [x, y] = [xAt(p.at === "p" ? YP : YQ), p.at === "p" ? YP : YQ];
          const [a, b] = SECTOR[p.c](t);
          const v = positionAngle(t, p.c);
          const color = v === t ? PURPLE : GREEN;
          const pair = picked && i !== d.pick ? pairOf(picked, p) : null;
          const on = i === d.pick || pair !== null;
          const m = rad((a + b) / 2);
          const k = b - a < 45 ? 66 : 50;
          return (
            <g key={i} role="button" tabIndex={0} aria-pressed={i === d.pick} aria-label={`${v}°`} style={{ cursor: "pointer" }}
              onClick={() => set({ ...d, pick: d.pick === i ? null : i })} onKeyDown={(e) => keyTap(e, () => set({ ...d, pick: d.pick === i ? null : i }))}>
              <path d={wedge(x, y, a, b, 32)} fill={color} fillOpacity={on ? 0.6 : picked ? 0.1 : 0.25} stroke={i === d.pick ? INK : "none"} strokeWidth={2} />
              <text x={x + k * Math.cos(m)} y={y - k * Math.sin(m) + 6} fontSize={17} fontWeight={700} textAnchor="middle" fill={color}
                stroke="#fff" strokeWidth={4} paintOrder="stroke">{v}°</text>
              {pair && pair !== "line" && (
                <text x={x + k * Math.cos(m)} y={y - k * Math.sin(m) + (Math.sin(m) > 0 ? -16 : 26)} fontSize={13} textAnchor="middle" fill={INK}
                  stroke="#fff" strokeWidth={4} paintOrder="stroke">{w.pairs[pair]}</text>
              )}
            </g>
          );
        })}
        <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke={INK} strokeWidth={4} strokeLinecap="round" pointerEvents="none" />
        <g role="slider" tabIndex={0} aria-label={w.endName} aria-valuemin={20} aria-valuemax={160} aria-valuenow={t} aria-valuetext={`θ = ${t}°`}
          style={{ cursor: drag ? "grabbing" : "grab" }} onPointerDown={grab("end")} onKeyDown={(e) => keys(e, t, (n) => set({ ...d, theta: clampLabTheta(n) }))}>
          <title>{w.endName}</title>
          <circle cx={end[0]} cy={end[1]} r={11} fill="#fff" stroke={INK} strokeWidth={3} />
          <circle cx={end[0]} cy={end[1]} r={24} fill="transparent" />
        </g>
      </>
    );
  };

  const triangleView = () => {
    const [ax, bx] = [130, 510];
    const tx = d.apex;
    const A = Math.round((Math.atan2(YQ - YP, tx - ax) * 180) / Math.PI);
    const B = Math.round((Math.atan2(YQ - YP, bx - tx) * 180) / Math.PI);
    const C = 180 - A - B;
    return (
      <>
        {lines()}
        <polygon points={`${ax},${YQ} ${bx},${YQ} ${tx},${YP}`} fill="#e7f5ff" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d={wedge(ax, YQ, 0, A, 44)} fill={PURPLE} fillOpacity={0.4} />
        <path d={wedge(bx, YQ, 180 - B, 180, 44)} fill={GREEN} fillOpacity={0.4} />
        <path d={wedge(tx, YP, 180 + A, 360 - B, 44)} fill={ORANGE} fillOpacity={0.4} />
        {/* Beside the top corner, on the top line: the alternate angles of the base angles. */}
        <path d={wedge(tx, YP, 180, 180 + A, 44)} fill={PURPLE} fillOpacity={0.4} />
        <path d={wedge(tx, YP, 360 - B, 360, 44)} fill={GREEN} fillOpacity={0.4} />
        {[
          [ax + 66 * Math.cos(rad(A / 2)), YQ - 66 * Math.sin(rad(A / 2)), A, PURPLE],
          [bx - 66 * Math.cos(rad(B / 2)), YQ - 66 * Math.sin(rad(B / 2)), B, GREEN],
          [tx + 66 * Math.cos(rad(270 + (A - B) / 2)), YP - 66 * Math.sin(rad(270 + (A - B) / 2)), C, ORANGE],
          [tx - 66 * Math.cos(rad(A / 2)), YP + 66 * Math.sin(rad(A / 2)), A, PURPLE],
          [tx + 66 * Math.cos(rad(B / 2)), YP + 66 * Math.sin(rad(B / 2)), B, GREEN],
        ].map(([x, y, v, c], i) => (
          <text key={i} x={x} y={Number(y) + 6} fontSize={17} fontWeight={700} textAnchor="middle" fill={String(c)} stroke="#fff" strokeWidth={4} paintOrder="stroke">{v}°</text>
        ))}
        <g role="slider" tabIndex={0} aria-label={w.apexName} aria-valuemin={150} aria-valuemax={490} aria-valuenow={tx}
          style={{ cursor: drag ? "grabbing" : "grab" }} onPointerDown={grab("apex")} onKeyDown={(e) => keys(e, tx, (n) => set({ ...d, apex: clampApex(n) }))}>
          <title>{w.apexName}</title>
          <circle cx={tx} cy={YP} r={11} fill="#fff" stroke={INK} strokeWidth={3} />
          <circle cx={tx} cy={YP} r={26} fill="transparent" />
        </g>
      </>
    );
  };

  const t = d.theta;
  const say: string[] = d.view === "triangle"
    ? (() => {
      const A = Math.round((Math.atan2(YQ - YP, d.apex - 130) * 180) / Math.PI);
      const B = Math.round((Math.atan2(YQ - YP, 510 - d.apex) * 180) / Math.PI);
      return wrapWords(fill(w.triangle, { a: A, b: B, c: 180 - A - B }), 72);
    })()
    : d.pick === null ? wrapWords(fill(w.lines, { t, s: 180 - t }), 72)
    : (() => {
      const v = positionAngle(t, LAB_PLACES[d.pick].c);
      return wrapWords(fill(w.picked, { v, s: 180 - v }), 72);
    })();
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={["lines", "triangle"] as const} on={d.view} names={w.views} onPick={(view) => set({ ...d, view, pick: null })} />
        {d.view === "lines" ? linesView() : triangleView()}
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 26} fontSize={17} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{d.view === "lines" ? w.hintLines : w.hintTriangle}</p>
    </>
  );
}
