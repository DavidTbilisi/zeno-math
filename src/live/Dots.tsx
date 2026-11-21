// Dot multiplication worked by hand: two rows of k squares, each number k plus the dots in its row. Slide along a row
// to fill it through the square under the finger (a tap fills through a square, a tap on the last dot takes it away);
// the pills at the top pick how many squares a row has, and the bin empties both rows. The four steps of the trick
// are written underneath. Keys on a row: arrows add and take a dot.
import { type KeyboardEvent } from "react";
import { DOT_ROWS, dotProduct, dotsUpTo, tapSquare } from "../math/live";
import { Bin, BLUE, Tabs, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 500;
const GAP = 6;
const KEYS = DOT_ROWS.map(String) as readonly string[];
type Row = "top" | "bottom";
type Drag = { row: Row; i: number };

export function Dots({ state, set, w: words, svgRef }: PieceProps<"dots">) {
  const w = words.dots;
  const { k } = state;
  const s = Math.min(92, (W - 20 - (k - 1) * GAP) / k);
  const step = s + GAP;
  const x0 = (W - (k * s + (k - 1) * GAP)) / 2;

  const { drag, begin, svgProps } = useDrag<Drag>((d) => {
    const n = d.moved
      ? dotsUpTo(d.x, x0, step, k)
      : tapSquare(state[d.row], d.i);
    if (n !== state[d.row]) set({ ...state, [d.row]: n });
  });
  // While a row is slid along, it shows the dots it will have.
  const shown = (row: Row) =>
    drag?.moved && drag.row === row
      ? dotsUpTo(drag.x, x0, step, k)
      : state[row];
  const top = shown("top");
  const bottom = shown("bottom");
  const r = dotProduct(k, top, bottom);

  const headY = 70;
  const rowsTop = headY + 42;
  const y2 = rowsTop + s + 46;
  const steps = y2 + s + 40;
  const H = steps + 4 * 34 + 24;
  const rowKeys = (e: KeyboardEvent, row: Row) => {
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[
      e.key
    ];
    if (by === undefined) return;
    e.preventDefault();
    set({ ...state, [row]: Math.max(0, Math.min(k, state[row] + by)) });
  };
  const row = (y: number, dots: number, which: Row) => (
    <g
      role="slider"
      tabIndex={0}
      aria-label={fill(w[which], { n: k + dots, d: dots, e: k - dots })}
      aria-valuemin={0}
      aria-valuemax={k}
      aria-valuenow={dots}
      onKeyDown={(e) => rowKeys(e, which)}
    >
      {Array.from({ length: k }, (_, i) => {
        const x = x0 + i * step;
        return (
          <g
            key={i}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => begin(e, { row: which, i })}
          >
            <rect
              x={x}
              y={y}
              width={s}
              height={s}
              fill={
                drag?.moved && drag.row === which && i === dots - 1
                  ? "#e7f5ff"
                  : "#fff"
              }
              stroke="#adb5bd"
              strokeWidth={1.5}
            />
            {i < dots && (
              <circle
                cx={x + s / 2}
                cy={y + s / 2}
                r={s * 0.32}
                fill="#40c057"
              />
            )}
          </g>
        );
      })}
    </g>
  );
  const line = (i: number, label: string, v: Record<string, number>) => (
    <text key={i} x={x0} y={steps + i * 34} fontSize={19} fill={INK}>
      <tspan fontWeight={700}>{"①②③④"[i]}</tspan> {fill(label, { ...v, r: "" })}
      <tspan fontWeight={700}>{v.r}</tspan>
    </text>
  );
  return (
    <>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="hand-pic"
        fontFamily={FONT}
        {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <rect width={W} height={H} fill="#fff" />
        <text x={10} y={29} fontSize={15} fill={INK}>
          {w.perRow}
        </text>
        <Tabs
          x={150}
          y={10}
          keys={KEYS}
          on={String(k)}
          names={Object.fromEntries(
            KEYS.map((n) => [n, fill(w.option, { k: n, k2: 2 * Number(n) })]),
          )}
          onPick={(n) => set({ k: Number(n), top: 0, bottom: 0 })}
        />
        {Array.from({ length: k }, (_, i) => (
          <text
            key={i}
            x={x0 + i * step + s / 2}
            y={headY}
            fontSize={18}
            textAnchor="middle"
            fill={INK}
          >
            {k + i + 1}
          </text>
        ))}
        <text x={x0} y={rowsTop - 10} fontSize={17} fill={INK}>
          {fill(w.top, { n: r.a, d: top, e: r.empty[0] })}
        </text>
        {row(rowsTop, top, "top")}
        <text x={x0} y={y2 - 10} fontSize={17} fill={INK}>
          {fill(w.bottom, { n: r.b, d: bottom, e: r.empty[1] })}
        </text>
        {row(y2, bottom, "bottom")}
        {line(0, w.step1, { a: top, b: bottom, r: r.dots })}
        {line(1, w.step2, { a: r.dots, b: r.value, r: r.dotValue })}
        {line(2, w.step3, { a: r.empty[0], b: r.empty[1], r: r.emptyProduct })}
        {line(3, w.step4, { a: r.dotValue, b: r.emptyProduct, r: r.product })}
        <text
          x={x0}
          y={steps + 4 * 34 + 8}
          fontSize={22}
          fontWeight={700}
          fill={INK}
        >
          {r.a} × {r.b} = {r.product}
        </text>
        <Bin
          x={W - 88}
          y={steps + 4 * 34 - 58}
          w={78}
          h={62}
          hot={false}
          label={w.bin}
          title={w.binTitle}
          onTap={() => set({ ...state, top: 0, bottom: 0 })}
        />
        {drag?.moved && (
          <line
            x1={x0}
            x2={x0 + Math.max(0, shown(drag.row)) * step - GAP}
            y1={(drag.row === "top" ? rowsTop : y2) + s + 5}
            y2={(drag.row === "top" ? rowsTop : y2) + s + 5}
            stroke={BLUE}
            strokeWidth={3}
            strokeLinecap="round"
            pointerEvents="none"
          />
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
