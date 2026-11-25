// Lean the stack. Two stacks of the same coins: drag the top coin of the second one sideways and the stack leans, each
// coin slid over a little more than the one under it. Drag the level slice up and down: wherever it is, it cuts one
// coin in each stack, the same circle. Same slices at every height, so the same volume (Cavalieri), however far it
// leans; the slanted stack is not bigger for looking longer.
import { useState, type KeyboardEvent } from "react";
import { COIN_H, COINS, SHIFT_MAX, type LiveCoinStack } from "../math/crossSections";
import { BLUE, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
const BASE_Y = 330;
const RX = 46;
const RY = 11;
const LEFT_X = 150;
const RIGHT_X = 400;
const SAY_Y = 390;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
const TOP = BASE_Y - COINS * COIN_H;
type Hold = { part: "top" | "slice" };

export function CoinStack({ state, set, w: words, svgRef }: PieceProps<"coinStack">) {
  const w = words.coinStack;
  const [draft, setDraft] = useState<LiveCoinStack | null>(null);
  const d = draft ?? state;
  const { drag, begin, svgProps } = useDrag<Hold>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => {
      if (h.part === "top") setDraft({ ...d, shift: Math.round(Math.max(-SHIFT_MAX, Math.min(SHIFT_MAX, h.x - RIGHT_X))) });
      else setDraft({ ...d, at: Math.round(Math.max(4, Math.min(COINS * COIN_H - 4, BASE_Y - h.y))) });
    },
  );
  const step = (part: Hold["part"]) => (e: KeyboardEvent) => {
    const v = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10 }[e.key];
    if (v === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    if (part === "top") set({ ...d, shift: Math.max(-SHIFT_MAX, Math.min(SHIFT_MAX, d.shift + v)) });
    else set({ ...d, at: Math.max(4, Math.min(COINS * COIN_H - 4, d.at + v)) });
  };

  // Coin i (0 at the bottom) of the leaning stack is pushed over in proportion to its height.
  const off = (i: number) => (d.shift * i) / (COINS - 1);
  const coin = (x: number, i: number, cut: boolean) => {
    const y = BASE_Y - (i + 1) * COIN_H;
    return (
      <g key={`${x}-${i}`}>
        <path d={`M${x - RX} ${y} v${COIN_H} a${RX} ${RY} 0 0 0 ${2 * RX} 0 v${-COIN_H} z`} fill={cut ? "#ffd8a8" : "#ffe066"} stroke="#e67700" strokeWidth={1.2} />
        <ellipse cx={x} cy={y} rx={RX} ry={RY} fill={cut ? "#ffc078" : "#fff3bf"} stroke="#e67700" strokeWidth={1.2} />
      </g>
    );
  };
  const sliceY = BASE_Y - d.at;
  const cutIndex = Math.min(COINS - 1, Math.floor(d.at / COIN_H));
  const leaned = Math.abs(d.shift) >= 20;
  const say = [
    fill(w.same, { n: COINS }),
    ...wrapWords(leaned ? w.why : w.start, 76),
  ];
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <text x={LEFT_X} y={30} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK}>{w.straight}</text>
        <text x={RIGHT_X} y={30} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK}>{w.leaning}</text>
        <line x1={20} y1={BASE_Y + RY} x2={W - 20} y2={BASE_Y + RY} stroke="#adb5bd" strokeWidth={2} />
        {Array.from({ length: COINS }, (_, i) => coin(LEFT_X, i, i === cutIndex))}
        {Array.from({ length: COINS }, (_, i) => coin(RIGHT_X + off(i), i, i === cutIndex))}
        {/* The level slice through both stacks: the same circle in each. */}
        <g role="slider" tabIndex={0} aria-label={w.sliceName} aria-valuenow={d.at} onKeyDown={step("slice")} style={{ cursor: "ns-resize" }}
          onPointerDown={(e) => begin(e, { part: "slice" })}>
          <line x1={30} y1={sliceY} x2={W - 30} y2={sliceY} stroke={ORANGE} strokeWidth={2.5} strokeDasharray="8 5" />
          <rect x={30} y={sliceY - 12} width={W - 60} height={24} fill="transparent" />
          <ellipse cx={LEFT_X} cy={sliceY} rx={RX} ry={RY} fill={ORANGE} fillOpacity={0.45} stroke={ORANGE} strokeWidth={2} />
          <ellipse cx={RIGHT_X + off(cutIndex)} cy={sliceY} rx={RX} ry={RY} fill={ORANGE} fillOpacity={0.45} stroke={ORANGE} strokeWidth={2} />
          <text x={W - 34} y={sliceY - 8} fontSize={13} textAnchor="end" fill={ORANGE} fontWeight={700}>{w.sliceLabel}</text>
        </g>
        <g role="slider" tabIndex={0} aria-label={w.topName} aria-valuenow={d.shift} onKeyDown={step("top")} style={{ cursor: drag ? "grabbing" : "ew-resize" }}
          onPointerDown={(e) => begin(e, { part: "top" })}>
          <circle cx={RIGHT_X + d.shift} cy={TOP - COIN_H} r={11} fill="#fff" stroke={BLUE} strokeWidth={3} />
          <path d={`M${RIGHT_X + d.shift - 26} ${TOP - COIN_H} h-10 m0 0 l6 -5 m-6 5 l6 5 M${RIGHT_X + d.shift + 26} ${TOP - COIN_H} h10 m0 0 l-6 -5 m6 5 l-6 5`} stroke={BLUE} strokeWidth={2.5} fill="none" />
          <circle cx={RIGHT_X + d.shift} cy={TOP - COIN_H} r={26} fill="transparent" />
        </g>
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fontWeight={i === 0 ? 700 : 400} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
