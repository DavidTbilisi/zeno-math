// Integer counters on the board: yellow +1 chips above the line, red −1 chips below it. A + and a − make a zero pair
// and cancel: drag a chip onto one of the other sign and the two pop, or take every pair away at once. A tap takes one
// chip off. Under the mat, a sum such as 3 + (−5) or 2 − (−4) can be walked through a step at a time: its chips go out,
// are taken away (with zero pairs put out first when there are too few), the pairs cancel and what is left is the
// answer. The moves come from src/math/counters.ts; "Copy as a picture" copies the mat and the words.
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  cancelOne, cancelPairs, CHIP_CAP, COUNTER_OPS, num, NUM_RANGE, pairs, put, slots, sumSteps, sumText, take, value,
  type CounterStep, type Mat,
} from "../math/counters";
import { usePops } from "./pops";
import { fill, FONT, INK, Stepper, svgPoint, type PieceProps } from "./ui";

const W = 640;
const PAD = 24;
const R = 15;
const GAP = 39;
const TOP = 34;
const PER_ROW = 10;
/** Rows for each sign: CHIP_CAP chips, PER_ROW to a row. */
const ROWS = Math.ceil(CHIP_CAP / PER_ROW);
const LINE_Y = TOP + ROWS * GAP + 2;
const NEG_TOP = LINE_Y + 22;
const MAT_H = NEG_TOP + ROWS * GAP;
const SAY = 30;
/** The most lines of words: the mat's two and a sum's five steps. */
const MAX_LINES = 7;
const POS = { fill: "#ffe066", stroke: "#e67700" };
const NEG = { fill: "#ff8787", stroke: "#c92a2a" };

type Words = PieceProps<"counters">["w"]["counters"];
type Chip = { negative: boolean; i: number; x: number; y: number; paired: boolean };
type Drag = { chip: Chip; x0: number; y0: number; dx: number; dy: number; moved: boolean };
type Ghost = { x: number; y: number; negative?: boolean; zero?: boolean };

const where = (slot: number, negative: boolean) => ({
  x: PAD + 46 + (slot % PER_ROW) * GAP + R,
  y: (negative ? NEG_TOP : TOP) + Math.floor(slot / PER_ROW) * GAP + R,
});

function chipsOf(m: Mat): Chip[] {
  const s = slots(m);
  const side = (list: number[], negative: boolean) =>
    list.map((slot, i): Chip => ({ negative, i, ...where(slot, negative), paired: i >= list.length - s.paired }));
  return [...side(s.pos, false), ...side(s.neg, true)];
}

function stepLine(s: CounterStep, w: Words): string {
  const c = (negative: boolean) => (negative ? "−1" : "+1");
  switch (s.kind) {
    case "start": return fill(w.steps.start, { a: num(s.a), n: Math.abs(s.a), c: c(s.a < 0) });
    case "put": return fill(w.steps.put, { b: num(s.b), n: s.n, c: c(s.negative) });
    case "zeroPairs": return fill(w.steps.zeroPairs, { take: s.take, c: c(s.negative), n: s.n });
    case "take": return fill(w.steps.take, { b: num(s.b), n: s.n, c: c(s.negative) });
    case "cancel": return fill(w.steps.cancel, { n: s.n });
    case "answer": return `${sumText(s.a, s.op, s.b)} = ${num(s.r)}`;
  }
}

/** One chip: a disc with its sign; dashed when it is half of a zero pair. */
function ChipDisc({ x, y, negative, paired, lift }: { x: number; y: number; negative: boolean; paired?: boolean; lift?: boolean }) {
  const c = negative ? NEG : POS;
  return (
    <>
      <circle cx={x} cy={y} r={R} fill={c.fill} stroke={c.stroke} strokeWidth={lift ? 3 : 2} strokeDasharray={paired ? "5 3" : undefined} />
      <text x={x} y={y + 7} fontSize={21} fontWeight={700} textAnchor="middle" fill={c.stroke} pointerEvents="none">{negative ? "−" : "+"}</text>
    </>
  );
}

/** The mat, its chips and the words; with `on` set, what a tap or a drag does and the chips popping too. */
function Picture({ mat, lines, height, svgRef, drag, target, ghosts, on }: {
  mat: Mat;
  lines: string[];
  height: number;
  svgRef?: React.Ref<SVGSVGElement>;
  drag?: Drag | null;
  target?: Chip | null;
  ghosts?: { id: number; items: Ghost[] } | null;
  on?: {
    w: Words;
    press: (e: ReactPointerEvent, chip: Chip) => void;
    move: (e: ReactPointerEvent<SVGSVGElement>) => void;
    up: () => void;
  };
}) {
  const chips = chipsOf(mat);
  const H = height;
  const same = (c: Chip, d?: Chip | null) => !!d && d.negative === c.negative && d.i === c.i;
  return (
    <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
      onPointerMove={on?.move} onPointerUp={on?.up} onPointerCancel={on?.up} style={on ? { touchAction: "none" } : undefined}>
      <rect x={PAD} y={TOP - 14} width={W - 2 * PAD} height={MAT_H - TOP + 8} rx={10} fill="#f8f9fa" stroke="#dee2e6" />
      <line x1={PAD + 8} y1={LINE_Y + 10} x2={W - PAD - 8} y2={LINE_Y + 10} stroke="#ced4da" strokeWidth={2} />
      <text x={PAD + 22} y={TOP + R + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={POS.stroke}>{mat.pos}</text>
      <text x={PAD + 22} y={NEG_TOP + R + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={NEG.stroke}>{mat.neg}</text>
      {chips.map((c) => {
        const label = on && fill(on.w.chip, { s: c.negative ? "−1" : "+1" });
        return (
          <g key={`${c.negative ? "n" : "p"}${c.i}`} opacity={drag?.moved && same(c, drag.chip) ? 0.25 : 1} role={on ? "button" : undefined} aria-label={label || undefined}
            style={on ? { cursor: "grab" } : undefined} onPointerDown={on && ((e) => on.press(e, c))}>
            <ChipDisc x={c.x} y={c.y} negative={c.negative} paired={c.paired} lift={same(c, target)} />
            {same(c, target) && <circle cx={c.x} cy={c.y} r={R + 5} fill="none" stroke="#2f9e44" strokeWidth={2.5} />}
          </g>
        );
      })}
      {ghosts?.items.map((g, i) =>
        g.zero ? (
          <text key={`${ghosts.id}-${i}`} className="chip-zero" x={g.x} y={g.y} fontSize={22} fontWeight={700} textAnchor="middle" fill="#2f9e44">0</text>
        ) : (
          <g key={`${ghosts.id}-${i}`} className="chip-pop"><ChipDisc x={g.x} y={g.y} negative={!!g.negative} /></g>
        ),
      )}
      {drag?.moved && (
        <g pointerEvents="none"><ChipDisc x={drag.chip.x + drag.dx} y={drag.chip.y + drag.dy} negative={drag.chip.negative} lift /></g>
      )}
      {lines.map((l, i) => (
        <text key={i} x={PAD} y={MAT_H + 22 + i * SAY} fontSize={l.length > 60 ? (19 * 60) / l.length : 19} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </svg>
  );
}

export function Counters({ state, set, w: words, svgRef }: PieceProps<"counters">) {
  const w = words.counters;
  const { a, op, b, step } = state;
  const mat: Mat = { pos: state.pos, neg: state.neg };
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghosts, pop] = usePops<Ghost>();
  const steps = sumSteps(a, op, b);

  /** A new mat by hand: the walk through the sum stops. */
  const setMat = (m: Mat) => set({ ...state, ...m, step: 0 });
  /** The ghosts of the chips about to go, popping where they were, and a 0 on the line under each pair. */
  const popPairs = (m: Mat) => {
    const paired = chipsOf(m).filter((c) => c.paired);
    const xs = [...new Set(paired.map((c) => c.x))];
    pop([...paired.map((c) => ({ x: c.x, y: c.y, negative: c.negative })), ...xs.map((x) => ({ x, y: LINE_Y + 17, zero: true }))]);
  };

  const chipAt = (x: number, y: number, not: Chip) =>
    chipsOf(mat).find((c) => c.negative !== not.negative && Math.hypot(c.x - x, c.y - y) <= R + 6) ?? null;
  const target = drag?.moved ? chipAt(drag.chip.x + drag.dx, drag.chip.y + drag.dy, drag.chip) : null;

  const press = (e: ReactPointerEvent, chip: Chip) => {
    if (e.button !== 0) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const [x, y] = svgPoint(svg, e);
    setDrag({ chip, x0: x, y0: y, dx: 0, dy: 0, moved: false });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const [dx, dy] = [x - drag.x0, y - drag.y0];
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > 5 });
  };
  const up = () => {
    if (!drag) return;
    setDrag(null);
    if (!drag.moved) return setMat(take(mat, drag.chip.negative));
    if (!target) return;
    pop([
      { x: target.x - 7, y: target.y, negative: drag.chip.negative },
      { x: target.x + 7, y: target.y, negative: target.negative },
      { x: target.x, y: target.y - R - 8, zero: true },
    ]);
    setMat(cancelOne(mat));
  };

  const nextStep = () => {
    const i = step >= steps.length ? 0 : step;
    const s = steps[i];
    if (s.kind === "cancel") popPairs(mat);
    set({ ...state, ...s.mat, step: i + 1 });
  };

  const z = pairs(mat);
  const lines = [fill(w.onMat, { p: mat.pos, n: mat.neg })];
  lines.push(z ? fill(w.cancel, { z, v: num(value(mat)) }) : fill(w.worth, { v: num(value(mat)) }));
  if (step) lines.push(...steps.slice(0, step).map((s) => stepLine(s, w)));

  return (
    <>
      <div className="live-bar">
        <button className="live-btn chip-btn pos" disabled={mat.pos >= CHIP_CAP} title={w.putPos} aria-label={w.putPos} onClick={() => setMat(put(mat, false))}>+1</button>
        <button className="live-btn chip-btn neg" disabled={mat.neg >= CHIP_CAP} title={w.putNeg} aria-label={w.putNeg} onClick={() => setMat(put(mat, true))}>−1</button>
        <button className="live-btn" disabled={mat.pos >= CHIP_CAP || mat.neg >= CHIP_CAP} onClick={() => setMat(put(put(mat, false), true))}>{w.putPair}</button>
        <button className="live-btn" disabled={!z} onClick={() => { popPairs(mat); setMat(cancelPairs(mat)); }}>{w.removePairs}</button>
        <button className="live-btn" onClick={() => setMat({ pos: 0, neg: 0 })}>{w.clear}</button>
      </div>
      <div className="live-bar">
        <span>{w.sum}</span>
        <i>a</i>
        <Stepper value={a} min={NUM_RANGE[0]} max={NUM_RANGE[1]} onChange={(v) => set({ ...state, a: v, step: 0 })} less={w.less} more={w.more} />
        <span className="chip-ops">
        {COUNTER_OPS.map((o) => (
          <button key={o} className={`live-btn${op === o ? " on" : ""}`} aria-pressed={op === o} title={w.ops[o]} aria-label={w.ops[o]} onClick={() => set({ ...state, op: o, step: 0 })}>
            {o === "add" ? "+" : "−"}
          </button>
        ))}
        </span>
        <i>b</i>
        <Stepper value={b} min={NUM_RANGE[0]} max={NUM_RANGE[1]} onChange={(v) => set({ ...state, b: v, step: 0 })} less={w.less} more={w.more} />
        <b className="chip-sum">{sumText(a, op, b)}</b>
        <button className="live-btn" onClick={nextStep}>{step >= steps.length ? w.again : step ? w.next : w.show}</button>
      </div>
      <p className="live-hint">{w.hint}</p>
      <Picture mat={mat} lines={lines} height={MAT_H + 16 + MAX_LINES * SAY} drag={drag} target={target} ghosts={ghosts} on={{ w, press, move, up }} />
      <div hidden>
        <Picture mat={mat} lines={lines} height={MAT_H + 16 + lines.length * SAY} svgRef={svgRef} />
      </div>
    </>
  );
}
