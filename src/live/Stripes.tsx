// Stripes, worked by hand: fractions as stripes across a square. Multiply (and free play): the number over the square
// cuts it into vertical stripes and the one beside it into horizontal ones (drag a number, or tap its top or bottom); a
// tap on the strip over the square shades the vertical stripes up to it, one on the strip beside it the horizontal
// ones, and the cells shaded both ways (purple) are the product, written in the answer's top and bottom. Add: two
// squares, one fraction in vertical stripes and one in horizontal ones; cut each the other way until their cells are
// the same size, and the shaded cells pour together into the squares below, to count. Between: two neighbours marked on
// a square of vertical stripes; cut across, then tap a cell to shade up to it, column by column, until what is shaded
// lies between them. Built on the game shell (useGame): a check right first time earns three stars, after one miss two.
import type { KeyboardEvent, ReactNode } from "react";
import type { Frac } from "../math/fraction";
import {
  fracOf,
  judgeStripes,
  MAX_CUTS,
  poured,
  recut,
  sameCells,
  STRIPE_LADDER,
  STRIPE_NOTICES,
  stripeNotice,
  stripesNow,
  stripeCols,
  stripeStars,
  STRIPES_FRESH,
  tapStripe,
  type LiveStripes,
  type StripeTask,
} from "../math/stripes";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, MUTED, NumBox, pointIn } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const DOWN = "#a5d8ff";
const ACROSS = "#ffc9c9";
const BOTH = "#9775fa";
const STRIP = 28;
const fr = (f: Frac) => `${f.n}/${f.d}`;

/** A square cut into cells, each coloured by `paint` (column, row); the stripes it was cut into first are drawn bolder. */
function Cells({ x, y, w, h, cols, rows, paint, bold }: {
  x: number; y: number; w: number; h: number; cols: number; rows: number; paint: (i: number, j: number) => string; bold?: "cols" | "rows";
}) {
  const [cw, rh] = [w / cols, h / rows];
  const cells: ReactNode[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) cells.push(<rect key={`${i}-${j}`} x={x + i * cw} y={y + j * rh} width={cw} height={rh} fill={paint(i, j)} />);
  const line = (k: number, down: boolean) => {
    const strong = bold === (down ? "cols" : "rows");
    return down
      ? <line key={`c${k}`} x1={x + k * cw} y1={y} x2={x + k * cw} y2={y + h} stroke={strong ? INK : "#495057"} strokeWidth={strong ? 2 : 1} strokeDasharray={bold && !strong ? "4 3" : undefined} />
      : <line key={`r${k}`} x1={x} y1={y + k * rh} x2={x + w} y2={y + k * rh} stroke={strong ? INK : "#495057"} strokeWidth={strong ? 2 : 1} strokeDasharray={bold && !strong ? "4 3" : undefined} />;
  };
  return (
    <g pointerEvents="none">
      {cells}
      {Array.from({ length: cols - 1 }, (_, k) => line(k + 1, true))}
      {Array.from({ length: rows - 1 }, (_, k) => line(k + 1, false))}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK} strokeWidth={2.5} />
    </g>
  );
}

/** The arrow keys move a shading by one. */
const arrows = (e: KeyboardEvent, on: number, n: number, set: (v: number) => void) => {
  const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
  if (!by) return;
  e.preventDefault();
  const v = Math.max(0, Math.min(n, on + by));
  if (v !== on) set(v);
};

/** The strip along a square to shade its stripes on: a tap on a stripe's part shades up to it; a slider for keys. */
function Band({ x, y, len, n, on, down, color, label, onSet, disabled }: {
  x: number; y: number; len: number; n: number; on: number; down: boolean; color: string; label: string; onSet: (v: number) => void; disabled?: boolean;
}) {
  const step = len / n;
  const [bw, bh] = down ? [len, STRIP] : [STRIP, len];
  return (
    <g role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={0} aria-valuemax={n} aria-valuenow={on} aria-valuetext={`${on}/${n}`}
      style={{ cursor: disabled ? "default" : "pointer" }} onKeyDown={(e) => !disabled && arrows(e, on, n, onSet)}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (disabled) return;
        const [px, py] = pointIn(e);
        const k = Math.max(0, Math.min(n - 1, Math.floor((down ? px - x : py - y) / step)));
        onSet(tapStripe(on, k));
      }}>
      <rect x={x} y={y} width={bw} height={bh} rx={4} fill="#f8f9fa" stroke="#adb5bd" />
      {Array.from({ length: n }, (_, k) => (
        <rect key={k} x={down ? x + k * step + 2 : x + 3} y={down ? y + 3 : y + k * step + 2} width={down ? step - 4 : STRIP - 6} height={down ? STRIP - 6 : step - 4} rx={3}
          fill={k < on ? color : "#fff"} stroke={k < on ? "#495057" : "#dee2e6"} pointerEvents="none" />
      ))}
    </g>
  );
}

/** A small picture of stripes one way, by a number that cuts them. */
const StripeIcon = ({ x, y, down }: { x: number; y: number; down: boolean }) => (
  <g pointerEvents="none" stroke="#495057" strokeWidth={1.5}>
    <rect x={x} y={y} width={22} height={22} fill="#fff" />
    {[7, 15].map((k) => (down ? <line key={k} x1={x + k} y1={y} x2={x + k} y2={y + 22} /> : <line key={k} x1={x} y1={y + k} x2={x + 22} y2={y + k} />))}
  </g>
);

/** The answer: a top over a bottom, each a number to drag or tap. */
function Answer({ x, y, d, set, words, disabled }: { x: number; y: number; d: LiveStripes; set: (p: Partial<LiveStripes>) => void; words: { top: string; bottom: string }; disabled: boolean }) {
  if (disabled)
    return <SvgFrac n={d.top} d={d.bottom} x={x + 30} y={y + 50} size={24} />;
  return (
    <g>
      <NumBox x={x} y={y} w={60} value={d.top} min={0} max={MAX_CUTS * MAX_CUTS} label={words.top} onChange={(top) => set({ top })} />
      <line x1={x - 4} y1={y + 50} x2={x + 64} y2={y + 50} stroke={INK} strokeWidth={3} />
      <NumBox x={x} y={y + 56} w={60} value={d.bottom} min={1} max={MAX_CUTS * MAX_CUTS} label={words.bottom} onChange={(bottom) => set({ bottom })} />
    </g>
  );
}

export function Stripes({ state: d, set, w: words, svgRef }: PieceProps<"stripes">) {
  const [w, g] = [words.stripes, words.game];
  const game = useGame({ key: "zeno.stripes.v1", size: STRIPE_LADDER.length, notices: STRIPE_NOTICES, modes: ["puzzle", "endless", "free"], state: d, set, fresh: STRIPES_FRESH });
  const task = stripesNow(d);
  const stars = stripeStars(d.misses);
  const change = (p: Partial<LiveStripes>) => !d.done && set({ ...d, ...p, said: null });

  const check = () => {
    if (!task) return;
    const why = judgeStripes(task, d);
    if (why) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => stripeNotice(task, d, streak), patch: { done: true } });
  };

  const ask = !task ? w.askFree : fill(task.kind === "times" ? w.askTimes : task.kind === "plus" ? w.askPlus : w.askBetween, { a: fr(task.a), b: fr(task.b) });
  const body = !task ? <TimesSquare d={d} change={change} w={w} free />
    : task.kind === "times" ? <TimesSquare d={d} change={change} w={w} task={task} />
    : task.kind === "plus" ? <PlusSquares d={d} change={change} w={w} task={task} />
    : <BetweenSquare d={d} change={change} w={w} task={task} />;
  const H = task?.kind === "plus" ? 432 : task?.kind === "between" ? 374 : 392;
  const row = task && !d.done ? CHECK_H : 0;

  const shaded = task?.kind === "between" ? fracOf(d.cells, stripeCols(task) * d.across) : null;
  const answer = task?.kind === "between" ? shaded! : fracOf(d.top, d.bottom);
  const right = task && fill(task.kind === "times" ? w.rightTimes : task.kind === "plus" ? w.rightPlus : w.rightBetween, {
    a: fr(task.a), b: fr(task.b), c: task.kind === "between" ? `${d.cells}/${stripeCols(task) * d.across}` : `${d.top}/${d.bottom}`, stars: starText(stars),
  });
  const wrongText = (why: string) =>
    !task ? ""
    : why === "answer" ? (task.kind === "times" ? w.wrongTimes : w.wrongPlus)
    : fill(w.wrong[why as keyof typeof w.wrong], { a: fr(task.a), b: fr(task.b), f: `${d.cells}/${stripeCols(task) * d.across}` });
  const status =
    !task ? fill(w.freeLine, { a: `${d.colsOn}/${d.cols}`, b: `${d.rowsOn}/${d.rows}`, c: `${d.colsOn * d.rowsOn}/${d.cols * d.rows}`, s: fr(fracOf(d.colsOn * d.rowsOn, d.cols * d.rows)) })
    : task.kind === "plus" ? (sameCells(task, d) ? fill(w.samePlus, { n: poured(task, d).each }) : fill(w.hintPlus, { a: stripeCols(task) * d.across, b: task.b.d * d.down }))
    : task.kind === "between" ? fill(w.hintBetween, { k: d.cells, n: stripeCols(task) * d.across, f: fr(answer) })
    : w.hintTimes;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right ?? ""}` }
    : d.done ? { tone: "ok", text: right ?? "" }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: wrongText(d.said.why) }
    : { tone: "hint", text: status };
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={d.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + row} viewBox={`0 0 ${W} ${H + row}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H + row} fill="#fff" />
          {body}
          {task && task.kind !== "between" && (
            <Answer x={task.kind === "plus" ? 500 : 560} y={task.kind === "plus" ? 128 : 172} d={d} set={change} words={w} disabled={d.done} />
          )}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

type Words = PieceProps<"stripes">["w"]["stripes"];
type Part = { d: LiveStripes; change: (p: Partial<LiveStripes>) => void; w: Words };

/** Multiplying: one square, its vertical stripes cut over it and its horizontal ones beside it. */
function TimesSquare({ d, change, w, task, free }: Part & { task?: StripeTask; free?: boolean }) {
  const [X, Y, S] = [150, 116, 260];
  const both = d.colsOn * d.rowsOn;
  return (
    <g>
      <StripeIcon x={X + S / 2 - 64} y={22} down />
      <NumBox x={X + S / 2 - 32} y={12} w={64} value={d.cols} min={1} max={MAX_CUTS} label={w.cols} onChange={(n) => { const c = recut(n, d.colsOn); change({ cols: c.n, colsOn: c.on }); }} />
      <SvgFrac n={d.colsOn} d={d.cols} x={X + S / 2 + 62} y={34} size={18} />
      <Band x={X} y={Y - STRIP - 8} len={S} n={d.cols} on={d.colsOn} down color={DOWN} label={w.colsBand} onSet={(colsOn) => change({ colsOn })} disabled={d.done} />
      <StripeIcon x={32} y={Y + S / 2 - 58} down={false} />
      <NumBox x={12} y={Y + S / 2 - 22} w={64} value={d.rows} min={1} max={MAX_CUTS} label={w.rows} onChange={(n) => { const c = recut(n, d.rowsOn); change({ rows: c.n, rowsOn: c.on }); }} />
      <SvgFrac n={d.rowsOn} d={d.rows} x={44} y={Y + S / 2 + 54} size={18} />
      <Band x={X - STRIP - 8} y={Y} len={S} n={d.rows} on={d.rowsOn} down={false} color={ACROSS} label={w.rowsBand} onSet={(rowsOn) => change({ rowsOn })} disabled={d.done} />
      <Cells x={X} y={Y} w={S} h={S} cols={d.cols} rows={d.rows} paint={(i, j) => (i < d.colsOn && j < d.rowsOn ? BOTH : i < d.colsOn ? DOWN : j < d.rowsOn ? ACROSS : "#fff")} />
      {task && (
        <g pointerEvents="none">
          <SvgFrac n={task.a.n} d={task.a.d} x={440} y={Y + S / 2 - 4} size={20} />
          <text x={474} y={Y + S / 2 + 3} fontSize={24} textAnchor="middle" fill={INK}>×</text>
          <SvgFrac n={task.b.n} d={task.b.d} x={508} y={Y + S / 2 - 4} size={20} />
          <text x={538} y={Y + S / 2 + 3} fontSize={24} textAnchor="middle" fill={INK}>=</text>
        </g>
      )}
      {free && (
        <g pointerEvents="none">
          <rect x={448} y={Y + 70} width={22} height={22} fill={BOTH} stroke="#495057" />
          <text x={480} y={Y + 87} fontSize={16} fill={INK}>{fill(w.bothWays, { k: both, n: d.cols * d.rows })}</text>
          <SvgFrac n={d.colsOn} d={d.cols} x={460} y={Y + 150} size={18} />
          <text x={488} y={Y + 156} fontSize={22} textAnchor="middle" fill={INK}>×</text>
          <SvgFrac n={d.rowsOn} d={d.rows} x={516} y={Y + 150} size={18} />
          <text x={544} y={Y + 156} fontSize={22} textAnchor="middle" fill={INK}>=</text>
          <SvgFrac n={both} d={d.cols * d.rows} x={584} y={Y + 150} size={18} />
        </g>
      )}
    </g>
  );
}

/** Adding: two squares, each cut the other way by hand, and the shaded cells poured together below once they match. */
function PlusSquares({ d, change, w, task }: Part & { task: StripeTask }) {
  const [Y, S] = [110, 170];
  const [AX, BX] = [36, 262];
  const match = sameCells(task, d);
  const { each, filled } = poured(task, d);
  const [PS, PY] = [104, Y + S + 30];
  // Poured: the first square's cells in its own shape, its shaded ones first, then the second's, spilling into a second square.
  const pour = (q: number) => (i: number, j: number) => {
    const k = q * each + i * d.across + j;
    return k < task.a.n * d.across ? DOWN : k < filled ? ACROSS : "#fff";
  };
  return (
    <g>
      <SvgFrac n={task.a.n} d={task.a.d} x={AX + 22} y={78} size={18} />
      <StripeIcon x={AX + S - 100} y={66} down={false} />
      <NumBox x={AX + S - 70} y={56} w={64} value={d.across} min={1} max={MAX_CUTS} label={w.acrossA} onChange={(across) => change({ across })} />
      <Cells x={AX} y={Y} w={S} h={S} cols={task.a.d} rows={d.across} bold="cols" paint={(i) => (i < task.a.n ? DOWN : "#fff")} />
      <text x={(AX + S + BX) / 2} y={Y + S / 2 + 10} fontSize={30} textAnchor="middle" fill={INK} pointerEvents="none">+</text>
      <SvgFrac n={task.b.n} d={task.b.d} x={BX + 22} y={78} size={18} />
      <StripeIcon x={BX + S - 100} y={66} down />
      <NumBox x={BX + S - 70} y={56} w={64} value={d.down} min={1} max={MAX_CUTS} label={w.downB} onChange={(down) => change({ down })} />
      <Cells x={BX} y={Y} w={S} h={S} cols={d.down} rows={task.b.d} bold="rows" paint={(_, j) => (j < task.b.n ? ACROSS : "#fff")} />
      <text x={470} y={Y + S / 2 + 10} fontSize={30} textAnchor="middle" fill={INK} pointerEvents="none">=</text>
      {match ? (
        [0, 1].filter((q) => q === 0 || filled > each).map((q) => (
          <Cells key={q} x={AX + q * (PS + 20)} y={PY} w={PS} h={PS} cols={task.a.d} rows={d.across} paint={pour(q)} />
        ))
      ) : (
        <text x={AX} y={PY + 30} fontSize={15} fill={MUTED} pointerEvents="none">{w.notYet}</text>
      )}
    </g>
  );
}

/** Finding one between: a square of vertical stripes with the two neighbours marked, cut across, and cells shaded in turn. */
function BetweenSquare({ d, change, w, task }: Part & { task: StripeTask }) {
  const [X, Y, S] = [150, 96, 260];
  const cols = stripeCols(task);
  const n = cols * d.across;
  const [ax, bx] = [X + S * task.a.toNumber(), X + S * task.b.toNumber()];
  const at = (e: Parameters<typeof pointIn>[0]) => {
    const [px, py] = pointIn(e);
    const i = Math.max(0, Math.min(cols - 1, Math.floor(((px - X) / S) * cols)));
    const j = Math.max(0, Math.min(d.across - 1, Math.floor(((py - Y) / S) * d.across)));
    return i * d.across + j;
  };
  const f = fracOf(d.cells, n);
  return (
    <g>
      <StripeIcon x={32} y={Y + S / 2 - 58} down={false} />
      <NumBox x={12} y={Y + S / 2 - 22} w={64} value={d.across} min={1} max={8} label={w.across} onChange={(across) => change({ across, cells: Math.min(d.cells, cols * across) })} />
      <g role="slider" tabIndex={d.done ? -1 : 0} aria-label={w.cellsLabel} aria-valuemin={0} aria-valuemax={n} aria-valuenow={d.cells} aria-valuetext={`${d.cells}/${n}`}
        style={{ cursor: d.done ? "default" : "pointer" }} onKeyDown={(e) => !d.done && arrows(e, d.cells, n, (cells) => change({ cells }))}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!d.done) change({ cells: tapStripe(d.cells, at(e)) });
        }}>
        <Cells x={X} y={Y} w={S} h={S} cols={cols} rows={d.across} bold="cols" paint={(i, j) => (i * d.across + j < d.cells ? DOWN : "#fff")} />
      </g>
      <rect x={ax} y={Y - 6} width={bx - ax} height={S + 12} fill="#fcc419" opacity={0.22} pointerEvents="none" />
      {[ax, bx].map((x, k) => <line key={k} x1={x} y1={Y - 10} x2={x} y2={Y + S + 10} stroke="#e8590c" strokeWidth={4} pointerEvents="none" />)}
      <SvgFrac n={task.a.n} d={task.a.d} x={ax - 16} y={Y - 30} size={16} />
      <SvgFrac n={task.b.n} d={task.b.d} x={bx + 16} y={Y - 30} size={16} />
      <g pointerEvents="none">
        <text x={520} y={Y + 60} fontSize={15} textAnchor="middle" fill={MUTED}>{w.shaded}</text>
        <SvgFrac n={d.cells} d={n} x={520} y={Y + 110} size={28} />
        {f.d !== n && d.cells > 0 && <text x={520} y={Y + 180} fontSize={18} textAnchor="middle" fill={INK}>= {fr(f)}</text>}
      </g>
    </g>
  );
}
