// Integer counters on the board: yellow +1 chips above the line, red −1 chips below it. A + and a − make a zero pair
// and cancel: drag a chip onto one of the other sign and the two pop, or take every pair away at once. A tap takes one
// chip off. Under the mat, a sum such as 3 + (−5) or 2 − (−4) can be walked through a step at a time: its chips go out,
// are taken away (with zero pairs put out first when there are too few), the pairs cancel and what is left is the
// answer. The moves come from src/math/counters.ts; "Copy as a picture" copies the mat and the words.
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  cancelOne, cancelPairs, CHIP_CAP, COUNTER_OPS, num, NUM_RANGE, pairs, pairUp, put, slots, sumSteps, sumText, take, value,
  type CounterStep, type Mat,
} from "../math/counters";
import { useHeld, usePops } from "./pops";
import { fill, FONT, INK, Stepper, svgPoint, type PieceProps } from "./ui";

const W = 640;
const PAD = 24;
const R = 15;
const GAP = 39;
const PER_ROW = 10;
/** The mat's top; the + rows rise from the line and the − rows hang under it, the first row of each next to it. */
const MAT_Y = 6;
/** Half the room between the first + row and the first − row, across the line. */
const HALF = 13;
const SAY = 28;
const POS = { fill: "#ffe066", stroke: "#e67700" };
const NEG = { fill: "#ff8787", stroke: "#c92a2a" };

type Words = PieceProps<"counters">["w"]["counters"];
/** A chip in its slot; `k` is its place in the list of chips, which says which chip is which. */
type Slotted = { negative: boolean; slot: number };
type Chip = Slotted & { x: number; y: number; paired: boolean; k: number };
type Drag = { chip: Chip; x0: number; y0: number; dx: number; dy: number; moved: boolean };
type Ghost = { x: number; y: number; negative?: boolean; zero?: boolean };

/** Where things are on a mat of `rows` rows a side (1, or 2 once a side has more than PER_ROW chips). */
function layout(rows: number) {
  const lineY = MAT_Y + 12 + 2 * R + HALF + (rows - 1) * GAP;
  const bottom = lineY + HALF + 2 * R + (rows - 1) * GAP + 12;
  const at = ({ slot, negative }: Slotted) => {
    const row = Math.floor(slot / PER_ROW);
    return {
      x: PAD + 20 + (slot % PER_ROW) * GAP + R,
      y: negative ? lineY + HALF + R + row * GAP : lineY - HALF - R - row * GAP,
    };
  };
  return { lineY, bottom, at };
}

const keyOf = (m: Mat) => `${m.pos}/${m.neg}`;

/** The chips of a mat in their slots, + first. */
function placed(m: Mat): Slotted[] {
  const s = slots(m);
  return [...s.pos.map((slot) => ({ negative: false, slot })), ...s.neg.map((slot) => ({ negative: true, slot }))];
}

/** The chips where they are drawn, and which of them are zero pairs, wherever they are (src/math/counters.ts, pairUp). */
function withPairs(list: Slotted[], at: ReturnType<typeof layout>["at"]): Chip[] {
  const sides = [list.filter((c) => !c.negative), list.filter((c) => c.negative)];
  const p = pairUp(sides[0].map((c) => c.slot), sides[1].map((c) => c.slot));
  const counters = { pos: 0, neg: 0 };
  return list.map((c, k) => ({ ...c, ...at(c), k, paired: c.negative ? p.neg[counters.neg++] : p.pos[counters.pos++] }));
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

/** One chip: a disc with its sign. */
function ChipDisc({ x, y, negative, lift }: { x: number; y: number; negative: boolean; lift?: boolean }) {
  const c = negative ? NEG : POS;
  return (
    <>
      <circle cx={x} cy={y} r={R} fill={c.fill} stroke={c.stroke} strokeWidth={lift ? 3 : 2} />
      <text x={x} y={y + 7} fontSize={21} fontWeight={700} textAnchor="middle" fill={c.stroke} pointerEvents="none">{negative ? "−" : "+"}</text>
    </>
  );
}

/** A soft band behind each + and − of a zero pair that sit one above the other, joining them across the line. */
function pairBands(chips: Chip[]) {
  const cols = new Map<number, { top: number; bottom: number; pos: boolean; neg: boolean }>();
  for (const c of chips.filter((c) => c.paired)) {
    const b = cols.get(c.x) ?? { top: c.y, bottom: c.y, pos: false, neg: false };
    cols.set(c.x, { top: Math.min(b.top, c.y), bottom: Math.max(b.bottom, c.y), pos: b.pos || !c.negative, neg: b.neg || c.negative });
  }
  return [...cols].filter(([, b]) => b.pos && b.neg).map(([x, b]) => ({ x, top: b.top - R - 3, bottom: b.bottom + R + 3 }));
}

/** The words under the mat: what it is worth, then the sum's heading and its steps; the first line is the main one. */
type Line = { text: string; strong?: boolean };
/** The most characters to a drawn line; a longer one goes on over the next. */
const WRAP = 68;
/** Room between what the mat is worth and the sum's steps under it. */
const SPLIT = 10;

/** The lines as drawn: each wrapped at spaces, with where it goes down the page. */
function drawn(lines: Line[]): (Line & { main: boolean; y: number })[] {
  const out: (Line & { main: boolean; y: number })[] = [];
  let y = 0;
  lines.forEach((l, i) => {
    if (i === 1) y += SPLIT;
    const parts: string[] = [];
    for (const word of l.text.split(" ")) {
      const last = parts[parts.length - 1];
      if (last !== undefined && last.length + 1 + word.length <= WRAP) parts[parts.length - 1] = `${last} ${word}`;
      else parts.push(word);
    }
    for (const text of parts) {
      out.push({ text, strong: l.strong, main: i === 0, y });
      y += SAY;
    }
  });
  return out;
}

/** The mat, its chips and the words; with `on` set, what a tap or a drag does and the chips popping too. */
function Picture({ mat, chips, rows, lines, label, svgRef, drag, target, ghosts, on }: {
  mat: Mat;
  chips: Chip[];
  rows: number;
  lines: Line[];
  label: string;
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
  const { lineY, bottom } = layout(rows);
  const words = drawn(lines);
  const H = bottom + 14 + (words.at(-1)?.y ?? 0) + SAY;
  const same = (c: Chip, d?: Chip | null) => !!d && d.k === c.k;
  const countX = W - PAD - 16;
  return (
    <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={label}
      onPointerMove={on?.move} onPointerUp={on?.up} onPointerCancel={on?.up} style={on ? { touchAction: "none" } : undefined}>
      <rect x={PAD} y={MAT_Y} width={W - 2 * PAD} height={bottom - MAT_Y} rx={12} fill="#f8f9fa" stroke="#dee2e6" />
      <line x1={PAD + 10} y1={lineY} x2={W - PAD - 10} y2={lineY} stroke="#ced4da" strokeWidth={2} />
      {pairBands(chips).map((b) => (
        <rect key={b.x} x={b.x - R - 3} y={b.top} width={2 * R + 6} height={b.bottom - b.top} rx={R + 3} fill="#e9ecef" stroke="#ced4da" />
      ))}
      {/* How many of each: + over the line, − under it. */}
      <text x={countX} y={lineY - HALF - R + 7} fontSize={20} fontWeight={700} textAnchor="end" fill={POS.stroke}>{mat.pos ? `+${mat.pos}` : 0}</text>
      <text x={countX} y={lineY + HALF + R + 7} fontSize={20} fontWeight={700} textAnchor="end" fill={NEG.stroke}>{mat.neg ? num(-mat.neg) : 0}</text>
      {chips.map((c) => {
        const chipLabel = on && fill(on.w.chip, { s: c.negative ? "−1" : "+1" });
        return (
          <g key={`${c.negative ? "n" : "p"}${c.slot}`} opacity={drag?.moved && same(c, drag.chip) ? 0.25 : 1} role={on ? "button" : undefined} aria-label={chipLabel || undefined}
            style={on ? { cursor: "grab" } : undefined} onPointerDown={on && ((e) => on.press(e, c))}>
            <ChipDisc x={c.x} y={c.y} negative={c.negative} lift={same(c, target)} />
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
      {words.map((l, i) => (
        <text key={i} x={PAD} y={bottom + 26 + l.y} fontSize={17} fill={l.strong || l.main ? INK : "#495057"} fontWeight={l.strong ? 700 : l.main ? 600 : 400}>{l.text}</text>
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
  // The chips hold their places when some are taken away (gaps where they were) until the mat changes another way.
  const [held, drop] = useHeld(keyOf(mat), placed(mat));
  const rows = held.some((c) => c.slot >= PER_ROW) ? 2 : 1;
  const { lineY, at } = layout(rows);
  const chips = withPairs(held, at);

  /** A new mat by hand: the walk through the sum stops. */
  const setMat = (m: Mat) => set({ ...state, ...m, step: 0 });
  /** Every zero pair goes: their ghosts pop where they were, with a 0 on the line under them; the rest stay put. */
  const popPairs = (next: Mat) => {
    const paired = chips.filter((c) => c.paired);
    const xs = [...new Set(paired.map((c) => c.x))];
    pop([...paired.map((c) => ({ x: c.x, y: c.y, negative: c.negative })), ...xs.map((x) => ({ x, y: lineY + 8, zero: true }))]);
    drop(paired.map((c) => c.k), keyOf(next));
  };

  const chipAt = (x: number, y: number, not: Chip) =>
    chips.find((c) => c.negative !== not.negative && Math.hypot(c.x - x, c.y - y) <= R + 6) ?? null;
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
    if (!drag.moved) {
      const next = take(mat, drag.chip.negative);
      drop([drag.chip.k], keyOf(next));
      return setMat(next);
    }
    if (!target) return;
    pop([
      { x: target.x - 7, y: target.y, negative: drag.chip.negative },
      { x: target.x + 7, y: target.y, negative: target.negative },
      { x: target.x, y: target.y - R - 8, zero: true },
    ]);
    const next = cancelOne(mat);
    drop([drag.chip.k, target.k], keyOf(next));
    setMat(next);
  };

  const nextStep = () => {
    const i = step >= steps.length ? 0 : step;
    const s = steps[i];
    if (s.kind === "cancel") popPairs(s.mat);
    set({ ...state, ...s.mat, step: i + 1 });
  };

  const z = pairs(mat);
  const lines: Line[] = [{ text: z ? fill(w.cancel, { z, v: num(value(mat)) }) : fill(w.worth, { v: num(value(mat)) }) }];
  if (step) lines.push({ text: sumText(a, op, b), strong: true }, ...steps.slice(0, step).map((s) => ({ text: stepLine(s, w) })));
  const label = [fill(w.onMat, { p: mat.pos, n: mat.neg }), ...lines.map((l) => l.text)].join(". ");

  return (
    <>
      <div className="live-bar">
        <button className="live-btn chip-btn pos" disabled={mat.pos >= CHIP_CAP} title={w.putPos} aria-label={w.putPos} onClick={() => setMat(put(mat, false))}>+1</button>
        <button className="live-btn chip-btn neg" disabled={mat.neg >= CHIP_CAP} title={w.putNeg} aria-label={w.putNeg} onClick={() => setMat(put(mat, true))}>−1</button>
        <button className="live-btn chip-pair" disabled={mat.pos >= CHIP_CAP || mat.neg >= CHIP_CAP} title={w.putPair} aria-label={w.putPair} onClick={() => setMat(put(put(mat, false), true))}>
          <span className="pos">+</span><span className="neg">−</span>
        </button>
        <button className="live-btn" disabled={!z} onClick={() => { popPairs(cancelPairs(mat)); setMat(cancelPairs(mat)); }}>{w.removePairs}</button>
        <button className="live-btn" onClick={() => setMat({ pos: 0, neg: 0 })}>{w.clear}</button>
      </div>
      <div className="live-bar">
        <span>{w.sum}</span>
        <i>a</i>
        <Stepper value={a} min={NUM_RANGE[0]} max={NUM_RANGE[1]} onChange={(v) => set({ ...state, a: v, step: 0 })} less={w.less} more={w.more} />
        <span className="chip-ops" role="group">
          {COUNTER_OPS.map((o) => (
            <button key={o} className={`live-btn${op === o ? " on" : ""}`} aria-pressed={op === o} title={w.ops[o]} aria-label={w.ops[o]} onClick={() => set({ ...state, op: o, step: 0 })}>
              {o === "add" ? "+" : "−"}
            </button>
          ))}
        </span>
        <i>b</i>
        <Stepper value={b} min={NUM_RANGE[0]} max={NUM_RANGE[1]} onChange={(v) => set({ ...state, b: v, step: 0 })} less={w.less} more={w.more} />
        <button className="live-btn on" onClick={nextStep}>{step >= steps.length ? w.again : step ? w.next : w.show}</button>
      </div>
      <p className="live-hint">{w.hint}</p>
      <Picture mat={mat} chips={chips} rows={rows} lines={lines} label={label} svgRef={svgRef} drag={drag} target={target} ghosts={ghosts} on={{ w, press, move, up }} />
    </>
  );
}
