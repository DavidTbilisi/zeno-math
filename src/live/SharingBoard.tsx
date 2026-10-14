// The blocks of a long division to share by hand: the pool of hundreds, tens and ones on top, a box that changes one
// block for ten of the next place, and the groups below. Drag a block to a group, back to the pool, or onto the change
// box; a tap deals a pool block to the group with the fewest of its kind, or sends a group's block back. Pointer events
// on the window (as the place-value mat does), so a fast tap or a drag off the piece still ends cleanly.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PV_COLORS, type Counts, type PVKind } from "../math/placeValue";
import { countsValue, dealTo, moveBlock, tradeBlock, type Sharing, type Spot } from "../math/sharing";
import { FONT, INK, svgPoint } from "./ui";

export const BOARD_W = 740;
const POOL = { x: 0, y: 18, w: 600, h: 128 };
const TRADE = { x: 612, y: 18, w: 128, h: 128 };
const GROUPS_Y = 166;
const GROUP_H = 132;
/** The pool's place columns: hundreds, tens, ones, left to right. */
const POOL_COLS = [170, 215, 215];
export const BOARD_H = GROUPS_Y + GROUP_H + 26;

const KINDS: PVKind[] = ["h", "t", "o"];
/** A block's size and the room it takes in a pile. */
const SHAPE: Record<PVKind, { w: number; h: number; px: number; py: number }> = {
  h: { w: 32, h: 32, px: 35, py: 35 },
  t: { w: 7, h: 52, px: 10, py: 56 },
  o: { w: 12, h: 12, px: 15, py: 15 },
};
type Box = { x: number; y: number; w: number; h: number };
const inside = (b: Box, [x, y]: [number, number]) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** n blocks of a kind in rows inside a box, shrunk when they wouldn't fit. */
function pile(kind: PVKind, n: number, box: Box): { x: number; y: number; s: number }[] {
  const sh = SHAPE[kind];
  let s = 1;
  for (;;) {
    const cols = Math.max(1, Math.floor(box.w / (sh.px * s)));
    if (Math.ceil(n / cols) * sh.py * s <= box.h || s < 0.2) return Array.from({ length: n }, (_, i) => ({ x: box.x + (i % cols) * sh.px * s, y: box.y + Math.floor(i / cols) * sh.py * s, s }));
    s *= 0.9;
  }
}

function BlockShape({ kind, x, y, s = 1, onPointerDown }: { kind: PVKind; x: number; y: number; s?: number; onPointerDown?: (e: ReactPointerEvent) => void }) {
  const { w, h } = SHAPE[kind];
  const c = PV_COLORS[kind];
  return <rect x={x} y={y} width={w * s} height={h * s} rx={kind === "h" ? 2 : 1} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} style={{ cursor: onPointerDown ? "grab" : undefined }} onPointerDown={onPointerDown} />;
}

type Drag = { kind: PVKind; from: Spot; at: [number, number]; start: [number, number] };

export function SharingBoard({ share, onChange, change, svgRef }: { share: Sharing; onChange: (s: Sharing) => void; change: string; svgRef?: React.RefObject<SVGSVGElement | null> }) {
  const own = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? own;
  const [drag, setDrag] = useState<Drag | null>(null);
  const latest = useRef({ share, onChange });
  latest.current = { share, onChange };
  const b = share.groups.length;
  const gw = (BOARD_W - (b - 1) * 8) / b;
  const groupBox = (i: number): Box => ({ x: i * (gw + 8), y: GROUPS_Y, w: gw, h: GROUP_H });
  const spotAt = (p: [number, number]): Spot | "trade" | null =>
    inside(TRADE, p) ? "trade" : inside(POOL, p) ? "pool" : (share.groups.map((_, i) => i).find((i) => inside(groupBox(i), p)) ?? null);
  const hover = drag && Math.hypot(drag.at[0] - drag.start[0], drag.at[1] - drag.start[1]) > 4 ? spotAt(drag.at) : null;

  const grab = (kind: PVKind, from: Spot) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || !ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = ref.current;
    const start = svgPoint(svg, e);
    let d: Drag = { kind, from, at: start, start };
    setDrag(d);
    const move = (ev: PointerEvent) => {
      d = { ...d, at: svgPoint(svg, ev) };
      setDrag(d);
    };
    const finish = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setDrag(null);
      if (ev.type === "pointercancel") return;
      const { share: s, onChange: set } = latest.current;
      const at = svgPoint(svg, ev);
      const tap = Math.hypot(at[0] - start[0], at[1] - start[1]) <= 4;
      const to = tap ? (from === "pool" ? dealTo(s, kind) : "pool") : spotAt(at);
      const next = to === "trade" ? (from === "pool" ? tradeBlock(s, kind) : null) : to === null ? null : moveBlock(s, kind, from, to);
      if (next) {
        latest.current.share = next; // a second tap before the board re-renders builds on this one
        set(next);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  /** The blocks of one spot, a column per place. */
  const blocks = (c: Counts, box: Box, from: Spot) => {
    const shown = KINDS.filter((k) => c[k] > 0);
    const pool = from === "pool";
    const colW = pool ? POOL_COLS : KINDS.map(() => (box.w - 12) / 3);
    let x = box.x + 6;
    return KINDS.map((k, i) => {
      const top = pool ? 22 : 6;
      const area = { x, y: box.y + top, w: colW[i] - 8, h: box.h - top - 6 };
      x += colW[i];
      if (!shown.includes(k)) return null;
      // The block being dragged leaves a gap where it was.
      const n = c[k] - (drag && drag.kind === k && drag.from === from ? 1 : 0);
      return pile(k, n, area).map((p, j) => <BlockShape key={`${k}${j}`} kind={k} x={p.x} y={p.y} s={p.s} onPointerDown={grab(k, from)} />);
    });
  };
  const zone = (box: Box, on: boolean, fill: string, dashed = false) => (
    <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={8} fill={on ? "#e7f5ff" : fill} stroke={on ? "#1971c2" : "#adb5bd"} strokeWidth={on ? 2.5 : 1.5} strokeDasharray={dashed ? "6 4" : undefined} />
  );

  return (
    <svg ref={ref} width={BOARD_W} height={BOARD_H} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} fontFamily={FONT} style={{ touchAction: "none" }}>
      <text x={0} y={13} fontSize={14} fontWeight={700} fill={INK}>{countsValue(share.pool)}</text>
      {zone(POOL, hover === "pool", "#f8f9fa", true)}
      {POOL_COLS.map((cw, i) => {
        const x = POOL.x + POOL_COLS.slice(0, i).reduce((s, v) => s + v, 0);
        return (
          <g key={i} pointerEvents="none">
            {i > 0 && <line x1={x} y1={POOL.y + 6} x2={x} y2={POOL.y + POOL.h - 6} stroke="#dee2e6" strokeWidth={1.5} />}
            <text x={x + cw / 2} y={POOL.y + 15} fontSize={12} fontWeight={700} textAnchor="middle" fill={PV_COLORS[KINDS[i]].stroke}>{[100, 10, 1][i]}</text>
          </g>
        );
      })}
      {blocks(share.pool, POOL, "pool")}
      {zone(TRADE, hover === "trade", "#fff9db", true)}
      <text x={TRADE.x + TRADE.w / 2} y={TRADE.y + 46} fontSize={22} textAnchor="middle" fill={INK}>1 → 10</text>
      <text x={TRADE.x + TRADE.w / 2} y={TRADE.y + 72} fontSize={12} textAnchor="middle" fill="#495057">{change}</text>
      {share.groups.map((g, i) => {
        const box = groupBox(i);
        return (
          <g key={i}>
            {zone(box, hover === i, "#fff")}
            {blocks(g, box, i)}
            <text x={box.x + box.w / 2} y={GROUPS_Y + GROUP_H + 19} fontSize={15} fontWeight={700} textAnchor="middle" fill="#2f9e44">{countsValue(g)}</text>
          </g>
        );
      })}
      {drag && Math.hypot(drag.at[0] - drag.start[0], drag.at[1] - drag.start[1]) > 4 && (
        <g opacity={0.85} pointerEvents="none">
          <BlockShape kind={drag.kind} x={drag.at[0] - SHAPE[drag.kind].w / 2} y={drag.at[1] - SHAPE[drag.kind].h / 2} />
        </g>
      )}
    </svg>
  );
}
