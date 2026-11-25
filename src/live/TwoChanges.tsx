// Two changes in a row. The price is a bar; drag the end of the first bar to take a percentage off (or put one on),
// then the end of the second bar to take a percentage off the new price. Each bar has its own ten tenths, so the
// second bar's tenths are shorter: the second cut is a percentage of less. A dashed bar beside them is the one change
// of the two percentages added, and the gap between it and the real result is what adding them gets wrong.
import { useState, type KeyboardEvent } from "react";
import { cash, TWO_MAX, TWO_PRICE, TWO_STEP, twoChanges, type LiveTwoChanges } from "../math/moneySense";
import { BLUE, GREEN, RED, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
const X0 = 150;
const PX = 3.2; // pixels to one unit of money: 150 → 480 px
const BAR_H = 34;
const ROWS = [86, 166, 246];
const SAY_Y = 350;
const H = SAY_Y + 4 * 25 + 8;
const ORANGE = "#e8590c";
type Hold = { which: "first" | "second" };

export function TwoChanges({ state, set, w: words, svgRef }: PieceProps<"twoChanges">) {
  const w = words.twoChanges;
  const [draft, setDraft] = useState<LiveTwoChanges | null>(null);
  const d = draft ?? state;
  const up = d.mode === "upDown";
  const { after1, after2, added } = twoChanges(d);
  const snap = (v: number) => Math.max(0, Math.min(TWO_MAX, Math.round(v / TWO_STEP) * TWO_STEP));
  const { drag, begin, svgProps } = useDrag<Hold>(
    () => {
      if (draft) set(draft);
      setDraft(null);
    },
    (h) => {
      const money = (h.x - X0) / PX;
      if (h.which === "first") setDraft({ ...d, first: snap(up ? (money / TWO_PRICE - 1) * 100 : (1 - money / TWO_PRICE) * 100) });
      else setDraft({ ...d, second: snap((1 - money / after1) * 100) });
    },
  );
  const keys = (which: Hold["which"]) => (e: KeyboardEvent) => {
    const v = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (v === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    // Right makes the bar longer: less off, or more on.
    const grow = which === "first" && up ? v : -v;
    set({ ...d, [which]: snap(d[which] + grow * TWO_STEP) });
  };

  /** A bar of `len` money marked in tenths of `tenthsOf`, a longer line every five. */
  const bar = (y: number, len: number, tenthsOf: number, key: string) => (
    <g key={key} pointerEvents="none">
      <rect x={X0} y={y} width={len * PX} height={BAR_H} fill="#d0ebff" stroke={BLUE} strokeWidth={1.5} />
      {Array.from({ length: Math.floor((len * 10) / tenthsOf + 1e-9) + 1 }, (_, i) => (i * tenthsOf) / 10).map((v, i) => (
        <line key={i} x1={X0 + v * PX} y1={y} x2={X0 + v * PX} y2={y + (i % 5 === 0 ? BAR_H : BAR_H / 2)} stroke={BLUE} strokeWidth={1} />
      ))}
    </g>
  );
  const handle = (which: Hold["which"], x: number, y: number, name: string, now: number) => (
    <g role="slider" tabIndex={0} aria-label={name} aria-valuenow={now} aria-valuemin={0} aria-valuemax={TWO_MAX}
      onKeyDown={keys(which)} onPointerDown={(e) => begin(e, { which })} style={{ cursor: drag ? "grabbing" : "ew-resize" }}>
      <rect x={x - 16} y={y - 8} width={32} height={BAR_H + 16} fill="transparent" />
      <rect x={x - 5} y={y - 6} width={10} height={BAR_H + 12} rx={4} fill="#fff" stroke={ORANGE} strokeWidth={3} />
    </g>
  );
  const v = {
    a: d.first, b: d.second, p: TWO_PRICE, p1: cash(after1), p2: cash(after2), s: cash(added),
    n: up ? d.first - d.second : d.first + d.second, net: cash(Math.abs(TWO_PRICE - after2)), gap: cash(Math.abs(after2 - added)),
    cut2: cash((after1 * d.second) / 100), cut2of: cash(d.second),
  };
  const say = [
    fill(up ? w.resultUp : w.resultOff, v),
    ...wrapWords(Math.abs(after2 - added) < 1e-9 ? w.same : fill(up ? w.whyUp : w.whyOff, v), 76),
  ];
  const labels: [number, string, string][] = [
    [ROWS[0], fill(up ? w.first.up : w.first.off, v), fill(w.price, { v: cash(after1) })],
    [ROWS[1], fill(w.second, v), fill(w.price, { v: cash(after2) })],
    [ROWS[2], fill(up ? w.oneUp : w.oneOff, { n: Math.abs(v.n), sign: v.n >= 0 ? "+" : "−" }), fill(w.price, { v: cash(added) })],
  ];
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={14} keys={["offOff", "upDown"] as const} on={d.mode} names={{ offOff: w.modeOff, upDown: w.modeUp }}
          onPick={(m) => set({ mode: m, first: 20, second: m === "upDown" ? 20 : 10 })} />
        {/* The original price, faint, behind the first bar. */}
        <rect x={X0} y={ROWS[0]} width={TWO_PRICE * PX} height={BAR_H} fill="none" stroke="#adb5bd" strokeDasharray="5 4" pointerEvents="none" />
        {bar(ROWS[0], after1, TWO_PRICE, "b1")}
        {!up && d.first > 0 && <rect x={X0 + after1 * PX} y={ROWS[0]} width={(TWO_PRICE - after1) * PX} height={BAR_H} fill={RED} fillOpacity={0.18} pointerEvents="none" />}
        {up && <rect x={X0 + TWO_PRICE * PX} y={ROWS[0]} width={(after1 - TWO_PRICE) * PX} height={BAR_H} fill={GREEN} fillOpacity={0.25} pointerEvents="none" />}
        {bar(ROWS[1], after2, after1, "b2")}
        {d.second > 0 && <rect x={X0 + after2 * PX} y={ROWS[1]} width={(after1 - after2) * PX} height={BAR_H} fill={RED} fillOpacity={0.18} stroke={RED} strokeDasharray="4 3" pointerEvents="none" />}
        {/* One change of the two added: dashed, to set against the real second bar. */}
        <rect x={X0} y={ROWS[2]} width={added * PX} height={BAR_H} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="6 4" pointerEvents="none" />
        {Math.abs(after2 - added) > 1e-9 && (
          <g pointerEvents="none">
            <line x1={X0 + after2 * PX} y1={ROWS[1] + BAR_H} x2={X0 + after2 * PX} y2={ROWS[2] + BAR_H + 6} stroke={ORANGE} strokeWidth={2} strokeDasharray="3 3" />
            <rect x={X0 + Math.min(after2, added) * PX} y={ROWS[2] + BAR_H + 2} width={Math.abs(after2 - added) * PX} height={8} fill={ORANGE} />
          </g>
        )}
        {labels.map(([y, name, price]) => (
          <g key={y} pointerEvents="none">
            <text x={X0 - 10} y={y + 15} fontSize={13} fontWeight={700} textAnchor="end" fill={INK}>{name}</text>
            <text x={X0 - 10} y={y + 31} fontSize={13} textAnchor="end" fill={BLUE}>{price}</text>
          </g>
        ))}
        {handle("first", X0 + after1 * PX, ROWS[0], w.firstName, d.first)}
        {handle("second", X0 + after2 * PX, ROWS[1], w.secondName, d.second)}
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={17} fontWeight={i === 0 ? 700 : 400} fill={INK}>{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
