// Multiplication as a rectangle of base-ten blocks, with the box and the written sum beside it, all three kept in
// step: concrete, picture, symbols. The two numbers are digit wheels (drag, tap or arrow keys). Each side is split
// into its tens and ones, which cuts the rectangle into parts; a tap on a part (or on its cell in the box) fills it
// with blocks, hundred flats for tens × tens, ten rods for tens × ones, cubes for ones × ones, and its product is
// written into the box and into a line of the sum. With "Your turn" the pupil gives each product on the digit tiles
// before it is filled in, a wrong one answered by how the blocks count it (2 tens × 6 = 12 tens), and at the end adds
// the parts. The die deals two new numbers. The rules are in src/math/areaBlocks.ts.
import type { ReactNode } from "react";
import {
  allFilled, AREA_RANGE, areaDone, areaParts, asked, checkTyped, dealtArea, isFilled, partCount, runningTotal, sideParts, tapPart,
  withAsk, withNumbers, type AreaPart, type LiveAreaBlocks,
} from "../math/areaBlocks";
import { PV_COLORS } from "../math/placeValue";
import { DigitPad, PAD_H } from "./DigitPad";
import { BLUE, DieButton, GREEN, keyTap, MUTED, NumBox, Pill, RED } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 760;
const HEAD = 60;
/** The room the rectangle has, each way. */
const ROOM = 320;
const GUT = 34;
const GAP = 8;
/** The height of the picture without the digit tiles, and how much they add. */
const PIC_H = HEAD + 24 + 26 + GAP + ROOM + 44;
const ASK_H = 30 + PAD_H + 34;
/** The box and the written sum, right of the rectangle. */
const RZ = 506;
const CELL = { w: 96, h: 46, label: 44, head: 24 };
const WHEEL = 34;

type Words = PieceProps<"areaBlocks">["w"]["areaBlocks"];

const unitOf = (a: number, b: number) => Math.max(8, Math.min(26, Math.floor(ROOM / Math.max(a, b))));

/** The lines of a part's blocks: every unit faintly, and the edges of its blocks (flats, rods one way or the other, cubes). */
function gridLines(p: AreaPart, u: number): { thin: string; strong: string } {
  const [w, h] = [p.cols * u, p.rows * u];
  const lines = (stepX: number, stepY: number) => {
    let d = "";
    for (let x = stepX; x < p.cols; x += stepX) d += `M${x * u} 0V${h}`;
    for (let y = stepY; y < p.rows; y += stepY) d += `M0 ${y * u}H${w}`;
    return d;
  };
  return { thin: lines(1, 1), strong: lines(p.key[1] === "t" ? 10 : 1, p.key[0] === "t" ? 10 : 1) };
}

/** A side's number as blocks in a strip: ten rods, then cubes, along the top or down the left. */
function Strip({ n, u, down }: { n: number; u: number; down?: boolean }) {
  let at = 0;
  return (
    <>
      {sideParts(n).map((p) => {
        const from = at;
        at += p.size;
        const c = PV_COLORS[p.tens ? "t" : "o"];
        const step = p.tens ? 10 : 1;
        const [w, h] = down ? [u, p.size * u] : [p.size * u, u];
        let thin = "";
        let strong = "";
        for (let k = 1; k < p.size; k++) {
          const line = down ? `M0 ${k * u}H${u}` : `M${k * u} 0V${u}`;
          if (k % step) thin += line;
          else strong += line;
        }
        return (
          <g key={p.tens ? "t" : "o"} transform={down ? `translate(0 ${from * u})` : `translate(${from * u} 0)`}>
            <rect width={w} height={h} rx={2} fill={c.fill} stroke={c.stroke} strokeWidth={1.4} />
            <path d={thin} stroke={c.stroke} strokeWidth={0.6} strokeOpacity={0.5} />
            <path d={strong} stroke={c.stroke} strokeWidth={1.4} />
          </g>
        );
      })}
    </>
  );
}

function hintLine(s: LiveAreaBlocks, parts: AreaPart[], w: Words): string {
  if (s.at === "total") return fill(w.hints.total, { parts: parts.map((p) => p.value).join(" + ") });
  const p = parts.find((q) => q.key === s.at);
  return p ? fill(w.hints[p.key], { ...partCount(p), r: p.rows, c: p.cols }) : "";
}

export function AreaBlocks({ state, set, w: words, svgRef }: PieceProps<"areaBlocks">) {
  const w = words.areaBlocks;
  const { a, b, ask, at } = state;
  const parts = areaParts(a, b);
  const u = unitOf(a, b);
  const done = areaDone(state);
  const X0 = 14 + GUT + u + GAP;
  const Y0 = HEAD + 24 + u + GAP;
  const H = PIC_H + (ask ? ASK_H : 0);
  const tap = (p: AreaPart) => set(tapPart(state, p.key));

  /** A number as a wheel for its tens and one for its ones. */
  const wheels = (x: number, n: number, what: string, onChange: (v: number) => void) =>
    [10, 1].map((place, i) => {
      const digit = Math.floor(n / place) % 10;
      return (
        <NumBox key={place} x={x + i * (WHEEL + 3)} y={8} w={WHEEL} h={44} size={22} value={digit} min={0} max={place === 10 ? Math.floor(AREA_RANGE[1] / 10) : 9}
          label={fill(place === 10 ? w.tensOf : w.onesOf, { what })} onChange={(v) => onChange(n + (v - digit) * place)} />
      );
    });

  const rows = sideParts(a);
  const cols = sideParts(b);
  const boxY = HEAD + 12;
  const boxH = CELL.head + rows.length * CELL.h;
  const sumY = boxY + boxH + 40;
  const NX = RZ + 92;
  const written: ReactNode[] = parts.map((p, i) => {
    const y = sumY + 62 + i * 27;
    const on = isFilled(state, p.key);
    return (
      <g key={p.key} data-line={p.key}>
        {at === p.key && <rect x={RZ} y={y - 21} width={W - RZ - 12} height={27} rx={6} fill="#e7f5ff" />}
        {i === parts.length - 1 && parts.length > 1 && <text x={NX - 76} y={y} fontSize={22} fill={INK}>+</text>}
        <text x={NX} y={y} fontSize={22} fontWeight={700} textAnchor="end" fill={on ? PV_COLORS[p.block].stroke : "#ced4da"}>{on ? p.value : "?"}</text>
        <text x={NX + 18} y={y - 2} fontSize={15} fill={on ? "#495057" : "#adb5bd"}>{`${p.rows} × ${p.cols}`}</text>
      </g>
    );
  });
  const ruleY = sumY + 62 + parts.length * 27 - 16;

  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        {wheels(14, a, w.down, (v) => set(withNumbers(state, v, b)))}
        <text x={14 + 2 * (WHEEL + 3) + 16} y={40} fontSize={26} textAnchor="middle" fill={INK}>×</text>
        {wheels(14 + 2 * (WHEEL + 3) + 32, b, w.across, (v) => set(withNumbers(state, a, v)))}
        <Pill x={220} y={15} w={Math.max(110, w.yourTurn.length * 9 + 28)} text={w.yourTurn} title={w.yourTurnTitle} on={ask} onTap={() => set(withAsk(state, !ask))} />
        <DieButton x={W - 52} y={11} s={36} title={w.die} onTap={() => set(dealtArea(state))} />

        {/* The two sides as blocks, and the numbers they are. */}
        <text x={X0 + (b * u) / 2} y={HEAD + 18} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>{b}</text>
        <text x={14 + GUT - 8} y={Y0 + (a * u) / 2 + 7} fontSize={20} fontWeight={700} textAnchor="end" fill={INK}>{a}</text>
        <g transform={`translate(${X0} ${HEAD + 24})`}><Strip n={b} u={u} /></g>
        <g transform={`translate(${14 + GUT} ${Y0})`}><Strip n={a} u={u} down /></g>

        {/* The rectangle, part by part. */}
        {parts.map((p) => {
          const on = isFilled(state, p.key);
          const now = at === p.key;
          const c = PV_COLORS[p.block];
          const g = gridLines(p, u);
          const [pw, ph] = [p.cols * u, p.rows * u];
          const size = Math.max(11, Math.min(18, pw / 5, ph * 0.7));
          return (
            <g key={p.key} data-part={p.key} transform={`translate(${X0 + p.left * u} ${Y0 + p.top * u})`} role="button" tabIndex={0}
              aria-label={fill(w.part, { r: p.rows, c: p.cols })} aria-pressed={on} style={{ cursor: ask && on ? "default" : "pointer" }}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => tap(p)} onKeyDown={(e) => keyTap(e, () => tap(p))}>
              <rect width={pw} height={ph} fill={on ? c.fill : now ? "#fff" : "#f8f9fa"} stroke={on ? c.stroke : now ? BLUE : "#adb5bd"}
                strokeWidth={on || now ? 1.8 : 1.2} strokeDasharray={on || now ? undefined : "5 4"} />
              {(on || now) && (
                <g pointerEvents="none" opacity={on ? 1 : 0.45}>
                  <path d={g.thin} stroke={on ? c.stroke : MUTED} strokeWidth={0.6} strokeOpacity={0.5} />
                  <path d={g.strong} stroke={on ? c.stroke : MUTED} strokeWidth={1.3} />
                </g>
              )}
              {!on && !now && <text x={pw / 2} y={ph / 2 + size * 0.35} fontSize={size} textAnchor="middle" fill={MUTED} pointerEvents="none">{`${p.rows} × ${p.cols}`}</text>}
            </g>
          );
        })}
        <text x={X0 + (b * u) / 2} y={Y0 + a * u + 30} fontSize={done ? 24 : 20} fontWeight={700} textAnchor="middle" fill={done ? GREEN : "#495057"} data-total>
          {done ? `${a} × ${b} = ${a * b}` : state.filled.length ? fill(w.soFar, { n: runningTotal(state) }) : ""}
        </text>

        {/* The box: the same parts as numbers. */}
        {cols.map((c, j) => (
          <text key={j} x={RZ + CELL.label + (j + 0.5) * CELL.w} y={boxY + 17} fontSize={17} textAnchor="middle" fill={INK}>{c.size}</text>
        ))}
        {rows.map((r, i) => (
          <text key={i} x={RZ + CELL.label - 8} y={boxY + CELL.head + (i + 0.5) * CELL.h + 6} fontSize={17} textAnchor="end" fill={INK}>{r.size}</text>
        ))}
        {parts.map((p, k) => {
          const [i, j] = [Math.floor(k / cols.length), k % cols.length];
          const on = isFilled(state, p.key);
          const now = at === p.key;
          const [x, y] = [RZ + CELL.label + j * CELL.w, boxY + CELL.head + i * CELL.h];
          return (
            <g key={p.key} data-cell={p.key} role="button" tabIndex={0} aria-label={fill(w.cell, { r: p.rows, c: p.cols })} aria-pressed={on}
              style={{ cursor: ask && on ? "default" : "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => tap(p)}
              onKeyDown={(e) => keyTap(e, () => tap(p))}>
              <rect x={x} y={y} width={CELL.w} height={CELL.h} fill={on ? PV_COLORS[p.block].fill : now ? "#e7f5ff" : "#fff"} stroke={INK} strokeWidth={1.6} />
              <text x={x + CELL.w / 2} y={y + CELL.h / 2 + 8} fontSize={24} fontWeight={700} textAnchor="middle" fill={on ? INK : "#ced4da"} pointerEvents="none">
                {on ? p.value : "?"}
              </text>
            </g>
          );
        })}

        {/* The written sum: a line for each part, then all of them added. */}
        <text x={NX} y={sumY} fontSize={22} fontWeight={700} textAnchor="end" fill={INK}>{a}</text>
        <text x={NX - 76} y={sumY + 27} fontSize={22} fill={INK}>×</text>
        <text x={NX} y={sumY + 27} fontSize={22} fontWeight={700} textAnchor="end" fill={INK}>{b}</text>
        <line x1={NX - 80} y1={sumY + 36} x2={NX + 4} y2={sumY + 36} stroke={INK} strokeWidth={1.6} />
        {written}
        <line x1={NX - 80} y1={ruleY} x2={NX + 4} y2={ruleY} stroke={INK} strokeWidth={1.6} />
        {at === "total" && <rect x={RZ} y={ruleY + 5} width={W - RZ - 12} height={28} rx={6} fill="#e7f5ff" />}
        <text x={NX} y={ruleY + 27} fontSize={22} fontWeight={700} textAnchor="end" fill={done ? GREEN : "#ced4da"} data-product>{done ? a * b : "?"}</text>

        {ask && (
          <g>
            <text x={W / 2} y={PIC_H + 16} fontSize={18} fontWeight={700} textAnchor="middle" fill={done ? GREEN : INK} data-ask>
              {done ? `✓ ${a} × ${b} = ${a * b}`
                : at === "total" ? fill(w.askTotal, { parts: parts.map((p) => p.value).join(" + ") })
                : at ? `${parts.find((p) => p.key === at)!.rows} × ${parts.find((p) => p.key === at)!.cols} = ?`
                : allFilled(state) ? "" : w.pick}
            </text>
            <DigitPad x={(W - 440) / 2} y={PIC_H + 30} value={state.typed} onChange={(typed) => set({ ...state, typed })} label={w.answer} erase={w.erase}
              disabled={asked(state) === null} check={state.typed ? { text: w.check, onTap: () => set(checkTyped(state)) } : undefined} />
            {state.miss !== null && at && (
              <text x={W / 2} y={PIC_H + 30 + PAD_H + 20} fontSize={15} textAnchor="middle" fill={RED} data-miss>
                {`${fill(w.notThat, { n: state.miss })} ${hintLine(state, parts, w)}`}
              </text>
            )}
          </g>
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
