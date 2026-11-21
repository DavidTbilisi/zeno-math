// Integer counters on the board, worked by hand: yellow +1 chips and red −1 chips on a mat, and no buttons. Drag a
// chip out of a tray onto the mat (or tap the tray), drag it back off to take it away (or tap it), drop a + on a − and
// the two cancel, a zero pair. Drag round empty mat to pick up several chips and move or take them at once. The
// zero-pair tray puts out a + and a − together, worth nothing, for taking away more than the mat has.
//
// Above the mat is a sum, a + b or a − b: drag its numbers up or down (or tap them, or use the arrow keys) and tap the
// sign to change it. "Do it on the mat" clears the mat and asks for the sum's moves one at a time; each is ticked off
// when the mat holds what it says, however the learner gets there, and "Show me" does the one asked. The moves and
// the layout come from src/math/counters.ts; "Copy as a picture" copies the mat and the words.
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CHIP_CAP, CHIP_R as R, counterState, freeColumn, freeSpot, keepOn, landsOn, MAT, MAT_LINE, matOf, num, NUM_RANGE,
  onMat, pairs, signed, stackedPairs, sumSteps, sumText, taskStep, tidy, toMat, value,
  type CounterStep, type LiveCounters, type MatChip,
} from "../math/counters";
import { Bin, BLUE, GREEN, keyTap, NumBox, Pill, TAP, wrapWords } from "./hand";
import { usePops } from "./pops";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";

const W = 640;
const POS = { fill: "#ffe066", stroke: "#e67700" };
const NEG = { fill: "#ff8787", stroke: "#c92a2a" };
/** The trays, left of the mat: where each pile is, and the bin under them. */
const TX = 56;
const TRAY = { pos: 112, neg: 176, pair: 244 } as const;
/** The + and − of a zero pair put out together, one over the other. */
const PAIR_DY = R + 2;
const BIN = { x: 16, y: 300, w: 100, h: 66 };
/** Dropped left of the mat, a chip is taken away. */
const OFF_X = MAT.x - 6;
const CARD_Y = 12;
const SAY_Y = MAT.y + MAT.h + 30;
const SAY = 27;
const WRAP = 70;

type Words = PieceProps<"counters">["w"]["counters"];
type Tray = keyof typeof TRAY;
type Num = "a" | "b";
type Drag = { x0: number; y0: number; x: number; y: number; moved: boolean } & (
  | { from: "mat"; ids: number[] }
  | { from: Tray }
  | { from: "box" }
);
type Ghost = { x: number; y: number; neg?: boolean; zero?: boolean };

function stepLine(s: CounterStep, w: Words, asked: boolean): string {
  const c = (negative: boolean) => (negative ? "−1" : "+1");
  switch (s.kind) {
    case "start": return fill(w.steps.start, { a: num(s.a), n: Math.abs(s.a), c: c(s.a < 0) });
    case "put": return fill(w.steps.put, { b: num(s.b), n: s.n, c: c(s.negative) });
    case "zeroPairs": return fill(w.steps.zeroPairs, { take: s.take, c: c(s.negative), n: s.n });
    case "take": return fill(w.steps.take, { b: num(s.b), n: s.n, c: c(s.negative) });
    case "cancel": return fill(asked ? w.steps.cancelDo : w.steps.cancel, { n: s.n });
    case "answer": return `${sumText(s.a, s.op, s.b)} = ${num(s.r)}`;
  }
}

/** One chip: a disc with its sign, its centre at (0, 0). */
function ChipDisc({ neg, ring }: { neg: boolean; ring?: string }) {
  const c = neg ? NEG : POS;
  return (
    <>
      {ring && <circle r={R + 5} fill="none" stroke={ring} strokeWidth={2.5} />}
      <circle r={R} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
      <text y={7} fontSize={21} fontWeight={700} textAnchor="middle" fill={c.stroke} pointerEvents="none">{neg ? "−" : "+"}</text>
    </>
  );
}

const at = (x: number, y: number) => ({ transform: `translate(${x}px, ${y}px)` });

/** The chips that land on one of the other sign, dropped where they are in `moving`: each pair cancels. */
function cancels(moving: MatChip[], others: MatChip[]): [MatChip, MatChip][] {
  const used: number[] = [];
  const out: [MatChip, MatChip][] = [];
  for (const m of moving) {
    const hit = landsOn(others, m.x, m.y, m.neg, used);
    if (hit) {
      used.push(hit.id);
      out.push([m, hit]);
    }
  }
  return out;
}

type Line = { text: string; tone: "main" | "sum" | "done" | "now" | "answer" };
const TONE: Record<Line["tone"], { fill: string; weight: number }> = {
  main: { fill: INK, weight: 600 },
  sum: { fill: INK, weight: 700 },
  done: { fill: "#868e96", weight: 400 },
  now: { fill: BLUE, weight: 600 },
  answer: { fill: GREEN, weight: 700 },
};

export function Counters({ state: saved, set, w: words, svgRef }: PieceProps<"counters">) {
  const w = words.counters;
  const state = counterState(saved);
  const { chips, a, op, b, task } = state;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [ghosts, pop] = usePops<Ghost>();
  const steps = sumSteps(a, op, b);
  const mat = matOf(chips);
  const done = task !== null && task >= steps.length - 1;

  /** New chips on the mat: the sum being done follows them. */
  const put = (next: MatChip[], patch: Partial<LiveCounters> = {}) => {
    const t = patch.task !== undefined ? patch.task : task;
    set({ ...state, ...patch, chips: next, task: t === null ? null : taskStep(a, op, b, t, matOf(next)) });
  };
  const gone = (list: MatChip[]) => list.map((c) => ({ x: c.x, y: c.y, neg: c.neg }));
  const zeros = (ps: [MatChip, MatChip][]) => ps.flatMap(([p, q]) => [
    { x: q.x - 7, y: q.y, neg: p.neg }, { x: q.x + 7, y: q.y, neg: q.neg }, { x: q.x, y: q.y - R - 8, zero: true },
  ]);
  const room = (neg: boolean, n = 1) => (neg ? mat.neg : mat.pos) + n <= CHIP_CAP;
  const trayFull = (t: Tray) => (t === "pair" ? !room(false) || !room(true) : !room(t === "neg"));

  /** The chips a tray puts out with their centre at (x, y). */
  const fromTray = (t: Tray, x: number, y: number): MatChip[] => {
    const id = state.next;
    if (t !== "pair") return [{ id, ...keepOn(x, y), neg: t === "neg" }];
    const p = keepOn(x, y - PAIR_DY);
    const m = keepOn(x, p.y + 2 * PAIR_DY);
    return [{ id, x: p.x, y: m.y - 2 * PAIR_DY, neg: false }, { id: id + 1, x: m.x, y: m.y, neg: true }];
  };
  /** Where the chips being dragged off the mat are, and those dragged out of a tray. */
  const moving = (d: Drag | null): MatChip[] => {
    if (!d?.moved) return [];
    if (d.from === "mat") return chips.filter((c) => d.ids.includes(c.id)).map((c) => ({ ...c, x: c.x + d.x - d.x0, y: c.y + d.y - d.y0 }));
    if (d.from === "pos" || d.from === "neg" || d.from === "pair") return fromTray(d.from, d.x, d.y);
    return [];
  };
  const inFlight = moving(drag);
  const overMat = !!drag?.moved && onMat(drag.x, drag.y);
  const overBin = !!drag?.moved && drag.from === "mat" && drag.x < OFF_X;
  const flightIds = drag?.from === "mat" && drag.moved ? drag.ids : [];
  const landing = overMat ? cancels(inFlight, chips.filter((c) => !flightIds.includes(c.id))) : [];
  const landed = new Set(landing.map(([, c]) => c.id));
  const box = drag?.from === "box" && drag.moved
    ? { x: Math.min(drag.x0, drag.x), y: Math.min(drag.y0, drag.y), w: Math.abs(drag.x - drag.x0), h: Math.abs(drag.y - drag.y0) }
    : null;
  const inBox = (c: MatChip) => !!box && c.x >= box.x && c.x <= box.x + box.w && c.y >= box.y && c.y <= box.y + box.h;

  const begin = (e: ReactPointerEvent, d: Drag) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    svg.setPointerCapture(e.pointerId);
    setDrag(d);
  };
  const point = (e: ReactPointerEvent) => {
    const el = e.currentTarget as SVGElement;
    return svgPoint(el.ownerSVGElement ?? (el as SVGSVGElement), e);
  };
  const pressChip = (e: ReactPointerEvent, c: MatChip) => {
    const [x, y] = point(e);
    const ids = picked.includes(c.id) ? picked : [c.id];
    if (!picked.includes(c.id)) setPicked([]);
    begin(e, { from: "mat", ids, x0: x, y0: y, x, y, moved: false });
  };
  const pressTray = (e: ReactPointerEvent, t: Tray) => {
    if (trayFull(t)) return;
    const [x, y] = point(e);
    begin(e, { from: t, x0: x, y0: y, x, y, moved: false });
  };
  const pressMat = (e: ReactPointerEvent) => {
    const [x, y] = point(e);
    begin(e, { from: "box", x0: x, y0: y, x, y, moved: false });
  };

  const setNum = (n: Num, v: number) => set({ ...state, [n]: v, task: null });
  const numBox = (n: Num, x: number, width: number) => (
    <NumBox x={x} y={CARD_Y} w={width} value={n === "a" ? a : b} min={NUM_RANGE[0]} max={NUM_RANGE[1]} label={n === "a" ? w.first : w.second}
      onChange={(v) => setNum(n, v)} show={n === "b" ? signed : num} />
  );
  const pill = (x: number, y: number, width: number, text: string, act: () => void, strong = false, title?: string) => (
    <Pill x={x} y={y} w={width} text={text} onTap={act} strong={strong} title={title} />
  );
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const moved = drag.moved || Math.hypot(x - drag.x0, y - drag.y0) > TAP;
    setDrag({ ...drag, x, y, moved });
  };

  const up = () => {
    if (!drag) return;
    setDrag(null);
    const d = drag;
    if (d.from === "box") {
      setPicked(d.moved ? chips.filter(inBox).map((c) => c.id) : []);
      return;
    }
    if (d.from === "mat") {
      const own = chips.filter((c) => d.ids.includes(c.id));
      // A tap, or a drag off the mat to the left, takes the chips away.
      if (!d.moved || d.x < OFF_X) {
        pop(gone(d.moved ? inFlight : own));
        setPicked([]);
        return put(chips.filter((c) => !d.ids.includes(c.id)));
      }
      if (!onMat(d.x, d.y)) return;
      const placed = new Map(inFlight.map((c) => [c.id, { ...c, ...keepOn(c.x, c.y) }]));
      const pairsGone = landing.flatMap(([m, c]) => [m.id, c.id]);
      pop(zeros(landing));
      setPicked(picked.filter((id) => !pairsGone.includes(id)));
      return put(chips.filter((c) => !pairsGone.includes(c.id)).map((c) => placed.get(c.id) ?? c));
    }
    // Out of a tray: a tap puts the chips in the first free places of the lined-up rows.
    if (!d.moved) {
      if (d.from === "pair") {
        return putPair();
      }
      return putOne(d.from === "neg");
    }
    if (!onMat(d.x, d.y)) return;
    const add = inFlight;
    const pairsGone = landing.flatMap(([m, c]) => [m.id, c.id]);
    pop(zeros(landing));
    put([...chips, ...add].filter((c) => !pairsGone.includes(c.id)), { next: state.next + add.length });
  };

  /** A zero pair put out with a tap, in the first free column of the lined-up rows. */
  const putPair = () => {
    const f = !trayFull("pair") && freeColumn(chips);
    if (f) put([...chips, { id: state.next, ...f.p, neg: false }, { id: state.next + 1, ...f.m, neg: true }], { next: state.next + 2 });
  };
  /** One chip put out with a tap, in the first free place of its lined-up rows. */
  const putOne = (neg: boolean) => {
    const s = !trayFull(neg ? "neg" : "pos") && freeSpot(chips, neg);
    if (s) put([...chips, { id: state.next, ...s, neg }], { next: state.next + 1 });
  };
  const flipOp = () => set({ ...state, op: op === "add" ? "sub" : "add", task: null });
  const lineUp = () => put(tidy(chips));
  const clearMat = () => {
    pop(gone(chips));
    setPicked([]);
    put([]);
  };
  const startTask = () => {
    pop(gone(chips));
    setPicked([]);
    put([], { task: 0 });
  };
  const showMe = () => {
    if (task === null || done) return;
    const r = toMat(chips, steps[task].mat, state.next);
    pop(gone(r.gone));
    setPicked([]);
    put(r.chips, { next: r.next });
  };

  const z = pairs(mat);
  const lines: Line[] = [{ text: z ? fill(w.cancel, { z, v: num(value(mat)) }) : fill(w.worth, { v: num(value(mat)) }), tone: "main" }];
  if (task !== null) {
    lines.push({ text: sumText(a, op, b), tone: "sum" });
    steps.slice(0, Math.min(task, steps.length - 1)).forEach((s) => lines.push({ text: `✓ ${stepLine(s, w, false)}`, tone: "done" }));
    lines.push(done ? { text: stepLine(steps[steps.length - 1], w, false), tone: "answer" } : { text: `→ ${stepLine(steps[task], w, true)}`, tone: "now" });
  } else lines.push({ text: w.hint, tone: "done" });
  const drawn = lines.flatMap((l, i) => wrapWords(l.text, WRAP).map((text) => ({ text, tone: l.tone, gap: i > 0 ? 8 : 0 })));
  let y = SAY_Y;
  const placedLines = drawn.map((l, i) => {
    if (i > 0 && l.gap && drawn[i - 1].tone === "main") y += l.gap;
    const out = { ...l, y };
    y += SAY;
    return out;
  });
  const H = y + 4;
  const label = [fill(w.onMat, { p: mat.pos, n: mat.neg }), ...lines.map((l) => l.text)].join(". ");

  // One band behind each column of zero pairs, joining its + and − across the line.
  const bands: { key: string; x: number; top: number; bottom: number }[] = [];
  for (const [p, m] of stackedPairs(chips.filter((c) => !flightIds.includes(c.id)))) {
    const b = bands.find((d) => Math.abs(d.x - p.x) < 6 && p.y <= d.bottom && m.y >= d.top);
    if (b) [b.top, b.bottom] = [Math.min(b.top, p.y), Math.max(b.bottom, m.y)];
    else bands.push({ key: `${p.id}/${m.id}`, x: p.x, top: p.y, bottom: m.y });
  }
  const sel = new Set(box ? chips.filter(inBox).map((c) => c.id) : picked);
  const counts = { pos: mat.pos, neg: mat.neg };

  const bBox = 64;
  const opX = 24 + 52 + 8;
  const bX = opX + 36 + 8;
  const actX = bX + bBox + 18;
  return (
    <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="hand-pic" fontFamily={FONT} role="group" aria-label={label}
      onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} style={{ touchAction: "none", userSelect: "none" }}>
      <rect width={W} height={H} fill="#fff" />

      {/* The sum: a, its sign, b, and doing it on the mat. */}
      {numBox("a", 24, 52)}
      <g role="button" tabIndex={0} aria-label={fill(w.opTitle, { o: w.ops[op] })} style={{ cursor: "pointer" }}
        onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => keyTap(e, flipOp)} onClick={flipOp}>
        <title>{fill(w.opTitle, { o: w.ops[op] })}</title>
        <rect x={opX} y={CARD_Y + 4} width={36} height={36} rx={18} fill="#e7f5ff" stroke={BLUE} />
        <text x={opX + 18} y={CARD_Y + 30} fontSize={24} fontWeight={700} textAnchor="middle" fill={BLUE} pointerEvents="none">{op === "add" ? "+" : "−"}</text>
      </g>
      {numBox("b", bX, bBox)}
      {task === null && pill(actX, CARD_Y + 7, 200, `▶ ${w.doIt}`, startTask, true)}
      {task !== null && !done && pill(actX, CARD_Y + 7, 130, `${w.showMe} ▸`, showMe, true, w.showMeTitle)}
      {task !== null && done && pill(actX, CARD_Y + 7, 130, `↺ ${w.again}`, startTask, true)}
      {task !== null && pill(actX + 140, CARD_Y + 7, 90, `✕ ${w.stop}`, () => set({ ...state, task: null }))}
      {chips.length > 0 && pill(W - 16 - 100, CARD_Y + 7, 100, w.lineUp, lineUp, false, w.lineUpTitle)}

      {/* The mat: drag round empty mat to pick up several chips. */}
      <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx={12} fill={overMat && drag?.from !== "mat" ? "#f1f8ff" : "#f8f9fa"}
        stroke={overMat && drag?.from !== "mat" ? BLUE : "#dee2e6"} onPointerDown={pressMat} onDoubleClick={lineUp} style={{ cursor: "crosshair" }} />
      <line x1={MAT.x + 10} y1={MAT_LINE} x2={MAT.x + MAT.w - 10} y2={MAT_LINE} stroke="#e9ecef" strokeWidth={2} pointerEvents="none" />
      {bands.map((band) => (
        <rect key={band.key} x={band.x - R - 3} y={band.top - R - 3} width={2 * R + 6} height={band.bottom - band.top + 2 * R + 6} rx={R + 3}
          fill="#e9ecef" stroke="#ced4da" pointerEvents="none" />
      ))}
      {chips.map((c) => {
        const flying = flightIds.includes(c.id);
        return (
          <g key={c.id} className={flying ? undefined : "chip-move"} style={{ ...at(c.x, c.y), cursor: "grab" }} opacity={flying ? 0.25 : 1}
            role="button" aria-label={fill(w.chip, { s: c.neg ? "−1" : "+1" })} onPointerDown={(e) => pressChip(e, c)}>
            <ChipDisc neg={c.neg} ring={landed.has(c.id) ? GREEN : sel.has(c.id) ? BLUE : undefined} />
          </g>
        );
      })}
      {box && <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#1971c214" stroke={BLUE} strokeDasharray="5 4" pointerEvents="none" />}

      {/* The trays: drag a chip out, or tap for one; the count of each kind on the mat beside it. */}
      {(["pos", "neg"] as const).map((t) => (
        <g key={t} role="button" tabIndex={0} aria-label={t === "pos" ? w.trayPos : w.trayNeg} opacity={trayFull(t) ? 0.35 : 1}
          style={{ cursor: trayFull(t) ? "not-allowed" : "grab" }} onPointerDown={(e) => pressTray(e, t)}
          onKeyDown={(e) => keyTap(e, () => putOne(t === "neg"))}>
          <title>{t === "pos" ? w.trayPos : w.trayNeg}</title>
          {[2, 1, 0].map((k) => <g key={k} style={at(TX - 2 * k, TRAY[t] + 2 * k)}><ChipDisc neg={t === "neg"} /></g>)}
          <text x={TX + 30} y={TRAY[t] + 6} fontSize={17} fontWeight={700} fill={t === "neg" ? NEG.stroke : POS.stroke} pointerEvents="none">
            {t === "neg" ? (counts.neg ? `−${counts.neg}` : 0) : counts.pos ? `+${counts.pos}` : 0}
          </text>
        </g>
      ))}
      <g role="button" tabIndex={0} aria-label={w.trayPair} opacity={trayFull("pair") ? 0.35 : 1} style={{ cursor: trayFull("pair") ? "not-allowed" : "grab" }}
        onPointerDown={(e) => pressTray(e, "pair")}
        onKeyDown={(e) => keyTap(e, putPair)}>
        <title>{w.trayPair}</title>
        <rect x={TX - R - 3} y={TRAY.pair - PAIR_DY - R - 3} width={2 * R + 6} height={2 * PAIR_DY + 2 * R + 6} rx={R + 3} fill="#e9ecef" stroke="#ced4da" />
        <g style={at(TX, TRAY.pair - PAIR_DY)}><ChipDisc neg={false} /></g>
        <g style={at(TX, TRAY.pair + PAIR_DY)}><ChipDisc neg /></g>
        <text x={TX + 30} y={TRAY.pair + 6} fontSize={15} fill="#868e96" pointerEvents="none">= 0</text>
      </g>
      <Bin x={BIN.x} y={BIN.y} w={BIN.w} h={BIN.h} hot={overBin} label={w.bin} title={w.binTitle} onTap={clearMat} />

      {ghosts?.items.map((g, i) =>
        g.zero ? (
          <text key={`${ghosts.id}-${i}`} className="chip-zero" x={g.x} y={g.y} fontSize={22} fontWeight={700} textAnchor="middle" fill={GREEN}>0</text>
        ) : (
          <g key={`${ghosts.id}-${i}`} style={at(g.x, g.y)}><g className="chip-pop"><ChipDisc neg={!!g.neg} /></g></g>
        ),
      )}
      {inFlight.length > 0 && drag?.from === "pair" && (
        <rect x={inFlight[0].x - R - 3} y={inFlight[0].y - R - 3} width={2 * R + 6} height={2 * PAIR_DY + 2 * R + 6} rx={R + 3}
          fill="#e9ecef" stroke="#ced4da" pointerEvents="none" />
      )}
      {inFlight.map((c) => (
        <g key={`fly${c.id}`} style={at(c.x, c.y)} pointerEvents="none" opacity={0.95}><ChipDisc neg={c.neg} /></g>
      ))}

      {placedLines.map((l, i) => (
        <text key={i} x={24} y={l.y} fontSize={l.tone === "done" ? 15 : 17} fill={TONE[l.tone].fill} fontWeight={TONE[l.tone].weight}>{l.text}</text>
      ))}
    </svg>
  );
}

