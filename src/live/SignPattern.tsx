// The sign pattern: why a minus times a minus is a plus, from a column of products. 3 × b, 2 × b and 1 × b are given,
// as dots on a graph of a × b against a; the learner taps the graph for 0 × b and then (−1) × b, (−2) × b, (−3) × b.
// Each row down the answer moves by the same step, so the dots stay on one straight line, and the line can't bend at
// 0: past it, the products of two negatives come out above the axis. A wrong tap is drawn orange with a hint, and
// from then on the line through the dots so far is carried on, dashed, to follow. The rows are in src/math/signs.ts;
// `PatternPicture` is the small graph the turning arrow's Why? steps show.
import type { PointerEvent } from "react";
import {
  factor, num, PATTERN_AS, PATTERN_GIVEN, PATTERN_Y, patternJump, patternKnown, patternRow, patternSlip, patternTap,
  SIGN_PATTERN_START, SIGN_RANGE, stepPast0,
} from "../math/signs";
import { fill, FONT, INK, Stepper, svgPoint, type PieceProps } from "./ui";

const W = 640;
const TOP = 26;
const CELL_Y = 15;
const COL = 50;
const G_LEFT = 262;
/** The graph's middle: a = 0 across, a × b = 0 down. */
const X0 = G_LEFT + 3 * COL + COL / 2;
const Y0 = TOP + PATTERN_Y * CELL_Y;
const G_H = 2 * PATTERN_Y * CELL_Y;
const ROW_H = 46;
const T_LEFT = 24;
const SAY_Y = TOP + G_H + 46;
/** Room for three lines of words. */
const H = SAY_Y + 64;
const GREEN = "#2f9e44";
const ORANGE = "#e8590c";
const BLUE = "#1971c2";

const gx = (a: number) => X0 + a * COL;
const gy = (y: number) => Y0 - y * CELL_Y;

/** The text of the row "−1 × (−2)". */
const rowText = (a: number, b: number) => `${factor(a)} × ${factor(b)}`;

/** A line of words wrapped at spaces, `max` characters at most to a line. */
function lines(s: string, max = 72): string[] {
  const out: string[] = [];
  for (const word of s.split(" ")) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}

export function SignPattern({ state: d, set, w: words, svgRef }: PieceProps<"signPattern">) {
  const w = words.signPattern;
  const { b } = d;
  const row = patternRow(d);
  const known = patternKnown(d);
  const jump = patternJump(b);
  const up = jump > 0;
  const n = Math.abs(b);
  const last = known[known.length - 1];

  const tap = (e: PointerEvent<SVGSVGElement>) => {
    if (row === null) return;
    const [, py] = svgPoint(e.currentTarget, e);
    const y = Math.round((Y0 - py) / CELL_Y);
    if (Math.abs(y) > PATTERN_Y) return;
    set(patternTap(d, y));
  };

  const ask = row === null ? "" : rowText(PATTERN_AS[row], b);
  let say: string;
  let tone = INK;
  if (row === null) {
    say = fill(b < 0 ? w.doneNeg : w.donePos, { b: factor(b), r1: num(-b), r3: num(-3 * b) });
    tone = GREEN;
  } else if (d.wrong !== null) {
    const slip = patternSlip(b, row, d.wrong);
    const text = slip === "sign" ? w.slips.sign : slip === "jump" ? (up ? w.slips.backUp : w.slips.backDown) : up ? w.slips.farUp : w.slips.farDown;
    say = fill(text, { n, prev: num(last[1]), y: num(d.wrong), p: ask });
    tone = ORANGE;
  } else if (d.placed.length) {
    say = `${fill(w.right, { p: rowText(last[0], b), y: num(last[1]) })} ${fill(w.ask, { p: ask })}`;
  } else {
    say = `${fill(up ? w.startUp : w.startDown, { n, b: factor(b) })} ${fill(w.ask, { p: ask })}`;
  }

  const lineFrom = known[0];
  const dashed = row !== null && d.misses > 0;
  return (
    <>
      <div className="live-bar">
        <span>{w.times}</span>
        <Stepper value={b} min={SIGN_RANGE[0]} max={SIGN_RANGE[1]} onChange={(v) => set({ ...SIGN_PATTERN_START, b: stepPast0(v, b) })} less={w.less} more={w.more} />
        <button className="live-btn" disabled={!d.placed.length && d.wrong === null} onClick={() => set({ ...SIGN_PATTERN_START, b })}>{w.again}</button>
      </div>
      <p className="live-hint">{w.hint}</p>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={say}
        onPointerDown={tap} style={{ cursor: row === null ? "default" : "crosshair", touchAction: "none" }}>
        <rect width={W} height={H} fill="#fff" />
        {/* The table: a, a × b, and the jump from each row to the next. */}
        <text x={T_LEFT} y={TOP + 4} fontSize={14} fill="#868e96">{w.table}</text>
        {PATTERN_AS.map((a, i) => {
          const y = TOP + 32 + i * ROW_H;
          const isKnown = i < known.length;
          const isNow = i === row;
          const neg = a < 0;
          return (
            <g key={a}>
              {isNow && <rect x={T_LEFT - 8} y={y - 24} width={214} height={36} rx={6} fill="#fff3bf" />}
              <text x={T_LEFT} y={y} fontSize={20} fontWeight={isNow ? 700 : 400} fill={isKnown || isNow ? (neg && isKnown ? GREEN : INK) : "#adb5bd"}>
                {rowText(a, b)} = {isKnown ? num(a * b) : "?"}
              </text>
              {i > 0 && i < known.length && (
                <text x={T_LEFT + 196} y={y - ROW_H / 2 + 4} fontSize={13} fontWeight={700} textAnchor="end" fill={BLUE}>{up ? "+" : "−"}{n}</text>
              )}
            </g>
          );
        })}
        {/* The graph: a column for each a, a × b up the side. */}
        <rect x={G_LEFT} y={TOP} width={7 * COL} height={G_H} fill="#f8f9fa" stroke="#dee2e6" />
        {row !== null && <rect x={gx(PATTERN_AS[row]) - COL / 2} y={TOP} width={COL} height={G_H} fill="#fff3bf" />}
        {Array.from({ length: 2 * PATTERN_Y + 1 }, (_, k) => k - PATTERN_Y).map((y) => (
          <g key={y}>
            <line x1={G_LEFT} y1={gy(y)} x2={G_LEFT + 7 * COL} y2={gy(y)} stroke={y === 0 ? "#495057" : "#e9ecef"} strokeWidth={y === 0 ? 2 : 1} />
            {y % 2 === 0 && <text x={G_LEFT - 6} y={gy(y) + 4} fontSize={11} textAnchor="end" fill="#868e96">{num(y)}</text>}
          </g>
        ))}
        <line x1={X0} y1={TOP} x2={X0} y2={TOP + G_H} stroke="#495057" strokeWidth={2} />
        {PATTERN_AS.map((a) => (
          <text key={a} x={gx(a)} y={TOP + G_H + 18} fontSize={13} textAnchor="middle" fill="#495057">{num(a)}</text>
        ))}
        <text x={G_LEFT + 7 * COL} y={TOP + G_H + 34} fontSize={12} textAnchor="end" fill="#868e96">a</text>
        <text x={G_LEFT + 4} y={TOP - 8} fontSize={12} fill="#868e96">a × {factor(b)}</text>
        {dashed && (
          <line x1={gx(-3.5)} y1={gy(-3.5 * b)} x2={gx(3.5)} y2={gy(3.5 * b)} stroke={BLUE} strokeWidth={2} strokeDasharray="7 6" opacity={0.6} />
        )}
        <line x1={gx(lineFrom[0])} y1={gy(lineFrom[1])} x2={gx(last[0])} y2={gy(last[1])} stroke={row === null ? GREEN : BLUE} strokeWidth={3} />
        {known.map(([a, y], i) => (
          <g key={a}>
            <circle cx={gx(a)} cy={gy(y)} r={7} fill={i < PATTERN_GIVEN ? INK : a < 0 ? GREEN : BLUE} stroke="#fff" strokeWidth={2} />
            {(a < 0 || i === known.length - 1) && <text x={gx(a) + 10} y={gy(y) - 8} fontSize={13} fontWeight={700} fill={a < 0 ? GREEN : BLUE}>{num(y)}</text>}
          </g>
        ))}
        {row !== null && d.wrong !== null && (
          <g>
            <circle cx={gx(PATTERN_AS[row])} cy={gy(d.wrong)} r={7} fill={ORANGE} stroke="#fff" strokeWidth={2} />
            <text x={gx(PATTERN_AS[row]) + 10} y={gy(d.wrong) - 8} fontSize={13} fontWeight={700} fill={ORANGE}>{num(d.wrong)}</text>
          </g>
        )}
        {lines(say).map((l, i) => (
          <text key={i} x={W / 2} y={SAY_Y + i * 24} fontSize={17} fontWeight={row === null ? 700 : 400} textAnchor="middle" fill={tone}>{l}</text>
        ))}
      </svg>
    </>
  );
}

/**
 * The small graph of the pattern for the turning arrow's Why? steps: the dots for 3, 2, 1 and 0 lots of b (stage 0),
 * the line through them (stage 1), and the line carried on past 0 to the products with a negative a (stage 2).
 */
export function PatternPicture({ b, stage }: { b: number; stage: 0 | 1 | 2 }) {
  const S = 150;
  const c = S / 2;
  const sx = 20;
  const sy = 5;
  const px = (a: number) => c + a * sx;
  const py = (y: number) => c - y * sy;
  const pos = [3, 2, 1, 0];
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} fontFamily={FONT} aria-hidden="true">
      <rect width={S} height={S} rx={6} fill="#fff" stroke="#dee2e6" />
      <line x1={6} y1={c} x2={S - 6} y2={c} stroke="#868e96" />
      <line x1={c} y1={6} x2={c} y2={S - 6} stroke="#868e96" />
      {stage >= 1 && <line x1={px(stage === 2 ? -3 : 0)} y1={py(stage === 2 ? -3 * b : 0)} x2={px(3)} y2={py(3 * b)} stroke={stage === 2 ? GREEN : BLUE} strokeWidth={2.5} />}
      {pos.map((a) => <circle key={a} cx={px(a)} cy={py(a * b)} r={4.5} fill={INK} />)}
      {stage === 2 && [-1, -2, -3].map((a) => <circle key={a} cx={px(a)} cy={py(a * b)} r={4.5} fill={GREEN} />)}
      {stage === 2 && <text x={px(-1) - 4} y={py(-b) + (b < 0 ? -9 : 17)} fontSize={12} fontWeight={700} textAnchor="middle" fill={GREEN}>{num(-b)}</text>}
    </svg>
  );
}
