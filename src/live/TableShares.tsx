// Out of what? A two-way table of who plays a sport in Year 7 and Year 8. Tap a count and three bars show it out of its
// row, out of its column and out of everyone: the same count, three shares. Under the table each year's row is a bar
// split into those who play and those who don't; change Year 8's two numbers (drag or tap them) until the two splits
// line up, and the year no longer tells you anything about sport: no association, though the counts still differ.
import type { KeyboardEvent } from "react";
import { pct, sameSplit, sharesOf } from "../math/twoWay";
import { BLUE, GREEN, MUTED, NumBox, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const TX = 20;
const TY = 20;
const HW = 96;
const CW = 80;
const RH = 38;
const SPLIT_Y = 232;
const SAY_Y = 356;
const H = SAY_Y + 4 * 25 + 8;
const GREY = "#dee2e6";

export function TableShares({ state, set, w: words, svgRef }: PieceProps<"tableShares">) {
  const w = words.tableShares;
  const c = state.cells;
  const rows = [w.y7, w.y8];
  const cols = [w.sport, w.noSport];
  const rowT = [c[0] + c[1], c[2] + c[3]];
  const colT = [c[0] + c[2], c[1] + c[3]];
  const all = rowT[0] + rowT[1];
  const pick = (k: number) => set({ ...state, sel: k });
  const keyOn = (k: number) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    pick(k);
  };
  const s = sharesOf(c, state.sel);
  const shares = [
    { name: fill(w.ofRow, { t: s.row }), t: s.row },
    { name: fill(w.ofCol, { t: s.col }), t: s.col },
    { name: fill(w.ofAll, { t: s.all }), t: s.all },
  ];
  const alike = sameSplit(c);
  const [p1, p2] = [pct(c[0] / rowT[0]), pct(c[2] / rowT[1])];
  const say = wrapWords(
    fill(w.sameN, { n: s.n, pr: pct(s.n / s.row), pc: pct(s.n / s.col), pa: pct(s.n / s.all) }) + " " + (alike ? fill(w.alike, { p: p1 }) : fill(w.differ, { p1, p2 })),
    76,
  );
  const cellX = (j: number) => TX + HW + j * CW;
  const cellY = (i: number) => TY + (i + 1) * RH;
  const box = (x: number, y: number, wd: number, text: string | number, o: { bold?: boolean; fill?: string; stroke?: string; sw?: number } = {}) => (
    <g pointerEvents="none">
      <rect x={x} y={y} width={wd} height={RH} fill={o.fill ?? "#fff"} stroke={o.stroke ?? INK} strokeWidth={o.sw ?? 1} />
      <text x={x + wd / 2} y={y + RH / 2 + 6} fontSize={16} fontWeight={o.bold ? 700 : 400} textAnchor="middle" fill={INK}>{text}</text>
    </g>
  );

  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        {/* The table: headings, the counts, the totals. */}
        {box(TX, TY, HW, "", { fill: "#f1f3f5" })}
        {[...cols, w.total].map((h, j) => <g key={h}>{box(cellX(j), TY, CW, h, { bold: true, fill: "#f1f3f5" })}</g>)}
        {[...rows, w.total].map((h, i) => <g key={h}>{box(TX, cellY(i), HW, h, { bold: true, fill: "#f1f3f5" })}</g>)}
        {[0, 1].map((i) => <g key={`r${i}`}>{box(cellX(2), cellY(i), CW, rowT[i], { bold: true, fill: "#f8f9fa" })}</g>)}
        {[0, 1].map((j) => <g key={`c${j}`}>{box(cellX(j), cellY(2), CW, colT[j], { bold: true, fill: "#f8f9fa" })}</g>)}
        {box(cellX(2), cellY(2), CW, all, { bold: true, fill: "#f8f9fa" })}
        {/* Year 7's counts: tap to see their shares. */}
        {[0, 1].map((j) => (
          <g key={`y7${j}`} role="button" tabIndex={0} aria-label={fill(w.cellName, { r: rows[0], c: cols[j], n: c[j] })} aria-pressed={state.sel === j}
            onKeyDown={keyOn(j)} onPointerDown={(e) => e.stopPropagation()} onClick={() => pick(j)} style={{ cursor: "pointer" }}>
            <rect x={cellX(j)} y={cellY(0)} width={CW} height={RH} fill={state.sel === j ? "#fff4e6" : "#fff"} stroke={INK} />
            <text x={cellX(j) + CW / 2} y={cellY(0) + RH / 2 + 6} fontSize={17} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{c[j]}</text>
          </g>
        ))}
        {/* Year 8's counts: change them; a change also picks the count. */}
        {[0, 1].map((j) => (
          <g key={`y8${j}`}>
            <rect x={cellX(j)} y={cellY(1)} width={CW} height={RH} fill={state.sel === 2 + j ? "#fff4e6" : "#fff"} stroke={INK} pointerEvents="none" />
            <NumBox x={cellX(j) + 8} y={cellY(1) + 2} w={CW - 16} h={RH - 4} size={17} value={c[2 + j]} min={1} max={60}
              label={fill(w.cellName, { r: rows[1], c: cols[j], n: c[2 + j] })}
              onChange={(v) => set({ cells: (j === 0 ? [c[0], c[1], v, c[3]] : [c[0], c[1], c[2], v]) as typeof c, sel: 2 + j })} />
          </g>
        ))}
        {/* The picked count out of its row, its column and everyone. */}
        <text x={400} y={TY + 22} fontSize={17} fontWeight={700} fill="#e8590c" pointerEvents="none">{fill(w.count, { n: s.n })}</text>
        {shares.map((sh, k) => {
          const y = TY + 44 + k * 50;
          const bw = 200;
          return (
            <g key={k} pointerEvents="none">
              <text x={400} y={y} fontSize={14} fill={INK}>{sh.name}</text>
              <rect x={400} y={y + 8} width={bw} height={18} fill="#f1f3f5" stroke={GREY} />
              <rect x={400} y={y + 8} width={(bw * s.n) / sh.t} height={18} fill="#e8590c" fillOpacity={0.7} />
              <text x={400 + bw + 10} y={y + 22} fontSize={15} fontWeight={700} fill={INK}>{pct(s.n / sh.t)}%</text>
            </g>
          );
        })}
        {/* Each year split into those who play and those who don't. */}
        <text x={TX} y={SPLIT_Y - 14} fontSize={15} fontWeight={700} fill={INK} pointerEvents="none">{w.split}</text>
        {[0, 1].map((i) => {
          const y = SPLIT_Y + i * 44;
          const bw = 460;
          const share = c[2 * i] / rowT[i];
          return (
            <g key={i} pointerEvents="none">
              <text x={TX} y={y + 21} fontSize={15} fontWeight={700} fill={INK}>{rows[i]}</text>
              <rect x={110} y={y} width={bw * share} height={30} fill={BLUE} fillOpacity={0.75} />
              <rect x={110 + bw * share} y={y} width={bw * (1 - share)} height={30} fill={GREY} />
              <text x={110 + 8} y={y + 20} fontSize={13} fontWeight={700} fill="#fff">{pct(share)}%</text>
              <text x={110 + bw + 10} y={y + 20} fontSize={13} fill={MUTED}>{c[2 * i]} / {rowT[i]}</text>
            </g>
          );
        })}
        {alike && <line x1={110 + (460 * c[0]) / rowT[0]} y1={SPLIT_Y - 6} x2={110 + (460 * c[0]) / rowT[0]} y2={SPLIT_Y + 80} stroke={GREEN} strokeWidth={3} pointerEvents="none" />}
        {say.map((t, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={alike ? GREEN : INK} pointerEvents="none">{t}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
