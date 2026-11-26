// A hundredths grid on the board, worked by hand (#704): the pupil is asked for an amount (0.07, then 0.3, 0.47, 1.2)
// and shades small squares by dragging across them, a press on a shaded square taking squares off instead. The amount
// shaded is written under the grids as a decimal all the while, so what a square and a column are worth is found by
// trying; once the amount asked is made, its rule is said and stays listed, and Next asks for the next one. After the
// last the grids are free to shade. Keys on the grids: ↑ or → one more square, ↓ or ← one fewer, with Shift a column.
// The rules and the ladder are in src/math/decGrid.ts.
import { useRef, type KeyboardEvent } from "react";
import {
  asked, CELLS, decimalOf, DEC_GRID_START, gridsShown, LADDER, made, next, nudge, paint, parts, rulesFound, type DecRule,
} from "../math/decGrid";
import { BLUE, GREEN, MUTED, Pill, pointIn, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const C = 22;
const G = 10 * C;
const GAP = 34;
const GX = 24;
const GY = 64;
const SHADE = "#a5d8ff";
type Words = PieceProps<"decGrid">["w"]["decGrid"];

const gridX = (k: number) => GX + k * (G + GAP);
/** Square i of a grid: down the first column, then the next. */
const cellXY = (i: number) => {
  const [k, j] = [Math.floor(i / 100), i % 100];
  return { x: gridX(k) + Math.floor(j / 10) * C, y: GY + (j % 10) * C };
};
function cellAt(x: number, y: number, grids: number): number | null {
  for (let k = 0; k < grids; k++) {
    const [cx, cy] = [Math.floor((x - gridX(k)) / C), Math.floor((y - GY) / C)];
    if (cx >= 0 && cx < 10 && cy >= 0 && cy < 10) return 100 * k + 10 * cx + cy;
  }
  return null;
}

export function ruleLine(rule: DecRule, n: number, w: Words) {
  const { wholes, tenths, hundredths } = parts(n);
  return fill(w.rules[rule], { d: decimalOf(n), w: wholes, t: tenths, h: hundredths });
}

/** The grids with their shaded squares and the decimal under them, as "Copy as a picture" takes them. */
function Grids({ shaded, grids, w }: { shaded: number[]; grids: number; w: Words }) {
  const on = new Set(shaded);
  return (
    <>
      {Array.from({ length: grids }, (_, k) => (
        <g key={k} data-grid={k}>
          {Array.from({ length: 100 }, (_, j) => {
            const i = 100 * k + j;
            const { x, y } = cellXY(i);
            return <rect key={j} data-cell={i} x={x} y={y} width={C} height={C} fill={on.has(i) ? SHADE : "#fff"} stroke="#ced4da" strokeWidth={1} />;
          })}
          {Array.from({ length: 9 }, (_, c) => (
            <line key={c} x1={gridX(k) + (c + 1) * C} y1={GY} x2={gridX(k) + (c + 1) * C} y2={GY + G} stroke="#868e96" strokeWidth={1.3} />
          ))}
          <rect x={gridX(k)} y={GY} width={G} height={G} fill="none" stroke={INK} strokeWidth={2} />
        </g>
      ))}
      <text x={GX} y={GY + G + 40} fontSize={24} fontWeight={700} fill={INK} data-amount="">{fill(w.shaded, { d: decimalOf(shaded.length) })}</text>
    </>
  );
}

export function DecGrid({ state, set, w: words, svgRef }: PieceProps<"decGrid">) {
  const w = words.decGrid;
  const grids = gridsShown(state);
  const goal = asked(state);
  const done = made(state);
  const found = rulesFound(state);
  // The squares as they are now: a drag paints several before the piece draws again.
  const now = useRef(state.shaded);
  now.current = state.shaded;
  const put = (shaded: number[]) => {
    now.current = shaded;
    set({ ...state, shaded });
  };
  const paintAt = (x: number, y: number, on: boolean) => {
    const i = cellAt(x, y, grids);
    if (i !== null && now.current.includes(i) !== on) put(paint(now.current, [i], on));
  };
  const { begin, svgProps } = useDrag<{ on: boolean }>(() => {}, (d) => paintAt(d.x, d.y, d.on));
  const onKey = (e: KeyboardEvent) => {
    const up = e.key === "ArrowUp" || e.key === "ArrowRight";
    if (!up && e.key !== "ArrowDown" && e.key !== "ArrowLeft") return;
    // The board around would take the arrows to move the piece.
    e.preventDefault();
    e.stopPropagation();
    put(nudge(now.current, up, e.shiftKey));
  };

  const n = state.shaded.length;
  const sayY = GY + G + 76;
  const say =
    goal === null ? w.free
    : done ? fill(w.made, { d: decimalOf(goal) })
    : n > goal ? fill(w.tooMuch, { d: decimalOf(goal) })
    : "";
  const ruleY = sayY + 34;
  const H = ruleY + 4 * 26 + 16;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <text x={GX} y={38} fontSize={24} fontWeight={700} fill={goal === null ? MUTED : BLUE} data-ask="">
          {goal === null ? w.freeTitle : fill(w.shade, { d: decimalOf(goal) })}
        </text>
        {goal !== null && <text x={W - 24} y={38} fontSize={14} textAnchor="end" fill={MUTED}>{fill(w.step, { k: state.step + 1, n: LADDER.length })}</text>}
        <g role="slider" tabIndex={0} aria-label={w.grid} aria-valuemin={0} aria-valuemax={CELLS} aria-valuenow={n} aria-valuetext={decimalOf(n)}
          style={{ cursor: "crosshair" }} onKeyDown={onKey}>
          <Grids shaded={state.shaded} grids={grids} w={w} />
          <rect x={GX} y={GY} width={gridX(grids - 1) + G - GX} height={G} fill="transparent" data-paint=""
            onPointerDown={(e) => {
              // A press on an empty square shades as it goes; on a shaded one it takes squares off.
              const [x, y] = pointIn(e);
              const i = cellAt(x, y, grids);
              if (i === null) return;
              const on = !now.current.includes(i);
              begin(e, { on });
              paintAt(x, y, on);
            }} />
        </g>
        {say && <text x={GX} y={sayY} fontSize={18} fontWeight={done ? 700 : 400} fill={done ? GREEN : goal === null ? MUTED : "#e8590c"} data-say="">{say}</text>}
        {found.map((f, k) => (
          <text key={f.rule} x={GX} y={ruleY + k * 26} fontSize={16} fill="#495057" data-rule={f.rule}>{`✓ ${ruleLine(f.rule, f.n, w)}`}</text>
        ))}
        {done && <Pill x={W - 24 - 110} y={sayY - 22} w={110} h={32} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {goal === null && <Pill x={W - 24 - 150} y={sayY - 22} w={150} h={32} text={w.again} onTap={() => set(DEC_GRID_START)} />}
        {n > 0 && !done && <Pill x={W - 24 - 90} y={GY + G + 18} w={90} h={30} size={14} text={w.clear} onTap={() => put([])} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={gridX(grids - 1) + G + 24} height={GY + G + 54 - 50} viewBox={`0 50 ${gridX(grids - 1) + G + 24} ${GY + G + 54 - 50}`} fontFamily={FONT}>
          <rect x={0} y={50} width={gridX(grids - 1) + G + 24} height={GY + G + 4} fill="#fff" />
          <Grids shaded={state.shaded} grids={grids} w={w} />
        </svg>
      </div>
    </>
  );
}
