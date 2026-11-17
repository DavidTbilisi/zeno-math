// Number patterns as dots: pick square, triangle, rectangle or cube numbers, primes or Fibonacci numbers, change n
// (or tap a number in the row) and see its picture. "Why?" colours what the rule comes from: odd or even L-shapes,
// a second triangle, the layers, the rows that leave dots over, the two squares each new one is built on.
// The shapes themselves come from src/math/numberShapes.ts.
import type { ReactNode } from "react";
import {
  arrangements, clampN, dotPicture, fib, fibTiles, isPrime, N_RANGE, N_START, row, SHAPE_KINDS, sumText, term, whyParts,
  type ShapeKind,
} from "../math/numberShapes";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

const W = 600;
const PAD = 20;
const PIC_TOP = 44;
const PIC_W = W - 2 * PAD;
const PIC_H = 320;
const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const RED = "#e03131";
const GRAY = "#adb5bd";
/** "Why?" bands take turns in these, so each L-shape (or layer) stands apart from the next. */
const BANDS = [BLUE, GREEN];

export function NumberShapes({ state, set, w: words, svgRef }: PieceProps<"numberShapes">) {
  const w = words.numberShapes;
  const { kind, why } = state;
  const n = clampN(kind, state.n);
  const t = term(kind, n);
  const lines: string[] = [];
  let picture: ReactNode;

  if (kind === "prime") {
    const rects = arrangements(n, why);
    const exact = rects.filter((a) => a.left === 0);
    lines.push(isPrime(n) ? fill(w.prime, { n }) : fill(w.composite, { n, list: exact.map((a) => `${a.rows} × ${a.cols}`).join(", ") }));
    if (why) lines.push(w.primeWhy, fill(w.primeRoot, { n }));
    const LABEL = 76;
    const gaps = rects.length - 1;
    const cols = Math.max(...rects.map((a) => a.cols + (a.left ? 1 : 0)));
    const cell = Math.min((PIC_W - LABEL) / cols, PIC_H / (rects.reduce((s, a) => s + a.rows, 0) + gaps * 0.8), 30);
    let y = PIC_TOP;
    picture = rects.map((a) => {
      const top = y;
      y += (a.rows + 0.8) * cell;
      const dot = (x: number, r: number, color: string) => (
        <circle key={`${x},${r}`} cx={PAD + LABEL + (x + 0.5) * cell} cy={top + (r + 0.5) * cell} r={cell * 0.36} fill={color} />
      );
      return (
        <g key={a.rows}>
          <text x={PAD} y={top + Math.min(a.rows * cell, 30) / 2 + 6} fontSize={16} fill={a.left ? RED : INK}>
            {a.left ? `${a.rows} × ${a.cols} + ${a.left}` : `${a.rows} × ${a.cols}`}
          </text>
          {Array.from({ length: a.rows * a.cols }, (_, i) => dot(i % a.cols, Math.floor(i / a.cols), a.left ? GRAY : GREEN))}
          {Array.from({ length: a.left }, (_, r) => dot(a.cols, r, RED))}
        </g>
      );
    });
  } else if (kind === "fibonacci") {
    const { tiles, box } = fibTiles(n);
    const [x0, y0, x1, y1] = box;
    const s = Math.min(PIC_W / (x1 - x0), PIC_H / (y1 - y0));
    const ox = PAD + (PIC_W - (x1 - x0) * s) / 2 - x0 * s;
    const oy = PIC_TOP + (PIC_H - (y1 - y0) * s) / 2 - y0 * s;
    const px = ([x, y]: [number, number]) => `${ox + x * s} ${oy + y * s}`;
    // With "Why?", the newest square in orange and the two it is built against in blue and green.
    const tint = (k: number) => (!why || n < 3 ? "#e7f5ff" : k === n - 1 ? "#ffe8cc" : k === n - 2 ? "#d0ebff" : k === n - 3 ? "#d3f9d8" : "#f8f9fa");
    lines.push(n <= 2 ? w.fibStart : fill(w.says.fibonacci, { a: fib(n - 2), b: fib(n - 1), t }));
    if (why && n >= 3) lines.push(fill(w.whys.fibonacci, { a: t, b: fib(n - 1), r: (t / fib(n - 1)).toFixed(3) }));
    picture = (
      <>
        {tiles.map((q, k) => (
          <g key={k}>
            <rect x={ox + q.x * s} y={oy + q.y * s} width={q.s * s} height={q.s * s} fill={tint(k)} stroke={INK} strokeWidth={1.2} />
            {q.s * s >= 18 && (
              <text x={ox + (q.x + q.s / 2) * s} y={oy + (q.y + q.s / 2) * s + 6} fontSize={Math.min(28, q.s * s * 0.4)} textAnchor="middle" fill={INK}>{q.s}</text>
            )}
          </g>
        ))}
        <path
          d={tiles.map((q, k) => `${k ? "" : `M ${px(q.arc.from)} `}A ${q.s * s} ${q.s * s} 0 0 ${q.arc.sweep} ${px(q.arc.to)}`).join(" ")}
          fill="none" stroke={RED} strokeWidth={2.5}
        />
      </>
    );
  } else {
    const pic = dotPicture(kind, n, why);
    const cell = Math.min(PIC_W / pic.cols, PIC_H / pic.rows, 36);
    const ox = PAD + (PIC_W - pic.cols * cell) / 2;
    const oy = PIC_TOP + (PIC_H - pic.rows * cell) / 2;
    const color = (band: number) => (!why ? BLUE : kind === "triangle" ? (band ? ORANGE : BLUE) : BANDS[band % 2]);
    picture = pic.dots.map((d) => (
      <circle key={`${d.x},${d.y}`} cx={ox + (d.x + 0.5) * cell} cy={oy + (d.y + 0.5) * cell} r={cell * 0.36} fill={color(d.band)} />
    ));
    lines.push(fill(w.says[kind], { n, m: n + 1, t }));
    if (why) lines.push(fill(w.whys[kind], { n, m: n + 1, t, sq: n * n, sum: sumText(whyParts(kind, n)), both: n * (n + 1) }));
  }

  const chips = row(kind, n);
  const chipW = PIC_W / chips.length;
  const chipY = PIC_TOP + PIC_H + 24 + lines.length * 26 + 8;
  const H = chipY + 44;
  const pick = (k: ShapeKind) => set({ kind: k, n: N_START[k], why });

  return (
    <>
      <div className="live-bar">
        <label className="live-select">
          <span>{w.pattern}</span>
          <select value={kind} onChange={(e) => pick(e.target.value as ShapeKind)}>
            {SHAPE_KINDS.map((k) => <option key={k} value={k}>{w.kinds[k]}</option>)}
          </select>
        </label>
        <span>{kind === "prime" ? w.number : w.figure}</span>
        <Stepper value={n} min={N_RANGE[kind][0]} max={N_RANGE[kind][1]} onChange={(v) => set({ ...state, n: v })} less={w.less} more={w.more} />
        <Toggle on={why} onClick={() => set({ ...state, n, why: !why })}>{w.why}</Toggle>
      </div>
      <p className="live-hint">{w.hint}</p>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}>
        <text x={PAD} y={26} fontSize={20} fill={INK}>
          <tspan fontWeight={700}>{w.kinds[kind]}</tspan>
          <tspan fill="#495057">{`  ·  ${w.rule[kind]}`}</tspan>
        </text>
        {picture}
        {lines.map((l, i) => (
          <text key={i} x={PAD} y={PIC_TOP + PIC_H + 24 + i * 26} fontSize={l.length > 62 ? (17 * 62) / l.length : 17} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
        ))}
        {chips.map((c, i) => {
          const on = c.n === n;
          const prime = kind === "prime" && isPrime(c.v);
          return (
            <g key={c.n} style={{ cursor: "pointer" }} onClick={() => set({ ...state, n: c.n })}>
              <rect x={PAD + i * chipW + 2} y={chipY} width={chipW - 4} height={34} rx={6}
                fill={on ? BLUE : prime ? "#d3f9d8" : "#f1f3f5"} stroke={on ? BLUE : prime ? GREEN : "#dee2e6"} />
              <text x={PAD + (i + 0.5) * chipW} y={chipY + 23} fontSize={c.v >= 100 ? 14 : 17} textAnchor="middle"
                fill={on ? "#fff" : INK} fontWeight={on || prime ? 700 : 400}>{c.v}</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}
