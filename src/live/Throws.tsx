// The chance devices worked by hand: a coin to tap or flick up, dice to tap or throw (a spare die dragged on adds one,
// a die dragged to the bin takes it off), and a spinner whose pointer is flicked round. Each keeps its tally in the
// picture, as bars that grow, and a tap on the bin empties it.
import { useRef, useState, type PointerEvent } from "react";
import { sectionAt, spinTurn, tallyUp } from "../math/live";
import { Bin, BLUE, inBox, keyTap, NumBox, pointIn, useDrag } from "./hand";
import { SECTION_COLORS } from "./pieces";
import { around, sectorPath } from "./sectors";
import { useAnimation } from "./useAnimation";
import { fill, FONT, INK, type PieceProps } from "./ui";

const PIC = { className: "hand-pic", style: { touchAction: "none", userSelect: "none" } as const };

/** Bars for a tally, side by side in the box (x, y, w, h), each its count above and its name below. */
function Tally({ x, y, w, h, counts, names, colors }: { x: number; y: number; w: number; h: number; counts: number[]; names: string[]; colors: string[] }) {
  const top = Math.max(5, ...counts);
  const gap = Math.min(14, w / counts.length / 5);
  const bw = (w - gap * (counts.length - 1)) / counts.length;
  const barH = h - 38;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={y + barH + 18} x2={x + w} y2={y + barH + 18} stroke="#adb5bd" />
      {counts.map((k, i) => {
        const bh = (k / top) * barH;
        const bx = x + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={bx} y={y + 18 + barH - bh} width={bw} height={bh} fill={colors[i]} stroke={INK} strokeWidth={k ? 1.5 : 0} />
            <text className="tally-count" x={bx + bw / 2} y={y + 12 + barH - bh} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{k}</text>
            <text x={bx + bw / 2} y={y + h - 4} fontSize={Math.min(14, bw / 2.4)} textAnchor="middle" fill={INK}>{names[i]}</text>
          </g>
        );
      })}
    </g>
  );
}

// ——— Coin ———

export function Coin({ state, set, w: words, svgRef }: PieceProps<"coin">) {
  const w = words.coin;
  const [flip, setFlip] = useState<{ t: number; side: number; halves: number; high: number } | null>(null);
  const animate = useAnimation();
  const side = flip?.side ?? state.side;
  const toss = (high = 30) => {
    if (flip) return;
    const result = Math.random() < 0.5 ? 0 : 1;
    // Seven half-turns or eight, so it lands on the side that came up.
    const halves = 7 + ((7 + state.side + result) % 2);
    animate(
      1100,
      (t) => setFlip({ t, side: (state.side + Math.floor(t * halves + 0.5)) % 2, halves, high }),
      () => {
        setFlip(null);
        set({ side: result, counts: tallyUp(state.counts, result) });
      },
    );
  };
  // A flick up tosses it higher; a tap tosses it.
  const { begin, svgProps } = useDrag<object>((d) => toss(d.moved ? Math.min(70, Math.max(30, d.y0 - d.y)) : 30));
  const squash = flip ? Math.abs(Math.cos(flip.t * Math.PI * flip.halves)) : 1;
  const label = side === 0 ? w.heads : w.tails;
  const W = 260;
  const H = 320;
  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...PIC} {...svgProps}>
        <rect width={W} height={H} fill="#fff" />
        <g role="button" tabIndex={0} aria-label={fill(w.toss, { s: label })} style={{ cursor: "pointer" }}
          onPointerDown={(e) => begin(e, {})} onKeyDown={(e) => keyTap(e, () => toss())}
          transform={`translate(130 ${96 - (flip ? Math.sin(flip.t * Math.PI) * flip.high : 0)}) scale(1 ${Math.max(0.04, squash)})`}>
          <circle r={78} fill={side === 0 ? "#ffd43b" : "#e9ecef"} stroke={INK} strokeWidth={3} />
          <circle r={65} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 4" />
          <text y={label.length > 6 ? 8 : 12} fontSize={label.length > 6 ? 24 : 32} textAnchor="middle" fill={INK} pointerEvents="none">{label}</text>
        </g>
        <Tally x={14} y={196} w={160} h={118} counts={state.counts} names={[w.heads, w.tails]} colors={["#ffd43b", "#e9ecef"]} />
        <Bin x={188} y={242} w={62} h={64} hot={false} label={w.bin} title={w.binTitle} onTap={() => set({ ...state, counts: [0, 0] })} />
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}

// ——— Dice ———

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};
const rollDie = () => 1 + Math.floor(Math.random() * 6);
const MAX_DICE = 3;

function DieFace({ x, y, s, face, tilt = 0 }: { x: number; y: number; s: number; face: number; tilt?: number }) {
  return (
    <g transform={tilt ? `rotate(${tilt} ${x + s / 2} ${y + s / 2})` : undefined} pointerEvents="none">
      <rect x={x} y={y} width={s} height={s} rx={s / 6} fill="#fff" stroke={INK} strokeWidth={3} />
      {PIPS[face].map(([px, py], j) => <circle key={j} cx={x + px * s} cy={y + py * s} r={s / 11} fill={INK} />)}
    </g>
  );
}

type DiceDrag = { from: number | "spare" };

export function Dice({ state, set, w: words, svgRef }: PieceProps<"dice">) {
  const w = words.dice;
  const [rolling, setRolling] = useState<number[] | null>(null);
  const animate = useAnimation();
  const faces = rolling ?? state.faces;
  const W = 340;
  const TABLE = { x: 10, y: 8, w: 320, h: 124 };
  const BIN = { x: 262, y: 146, w: 68, h: 66 };
  const SPARE = { x: 10, y: 146, w: 68, h: 66 };
  const s = 84;
  const gap = 18;
  const x0 = (W - (faces.length * s + (faces.length - 1) * gap)) / 2;
  const roll = (count = state.count, from = state.faces) => {
    if (rolling) return;
    const start = Array.from({ length: count }, (_, i) => from[i] ?? rollDie());
    let last = -1;
    animate(
      650,
      (t) => {
        const tick = Math.floor(t * 9);
        if (tick !== last) (last = tick), setRolling(start.map(rollDie));
      },
      () => {
        const next = start.map(rollDie);
        setRolling(null);
        set({ ...state, count, faces: next, history: [next.reduce((a, b) => a + b, 0), ...state.history].slice(0, 14) });
      },
    );
  };
  const { drag, begin, svgProps } = useDrag<DiceDrag>((d) => {
    if (d.from === "spare") {
      if (d.moved && inBox(TABLE, d.x, d.y)) roll(state.count + 1);
      return;
    }
    if (d.moved && inBox(BIN, d.x, d.y) && state.count > 1) {
      const kept = state.faces.filter((_, i) => i !== d.from);
      return set({ ...state, count: kept.length, faces: kept, history: [] });
    }
    roll(); // a tap, or a die thrown anywhere else
  });
  const held = drag?.moved ? drag : null;
  const total = faces.reduce((a, b) => a + b, 0);
  const H = 272;
  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...PIC} {...svgProps}>
        <rect width={W} height={H} fill="#fff" />
        <rect x={TABLE.x} y={TABLE.y} width={TABLE.w} height={TABLE.h} rx={14} fill="#ebfbee" stroke={held?.from === "spare" && inBox(TABLE, held.x, held.y) ? BLUE : "#b2f2bb"} strokeWidth={2} />
        {faces.map((f, i) => {
          const away = held?.from === i;
          const x = away ? held.x - s / 2 : x0 + i * (s + gap);
          const y = away ? held.y - s / 2 : TABLE.y + (TABLE.h - s) / 2;
          return (
            <g key={i} role="button" tabIndex={0} aria-label={fill(w.die, { n: i + 1, f })} style={{ cursor: "grab" }}
              onPointerDown={(e: PointerEvent) => begin(e, { from: i })} onKeyDown={(e) => keyTap(e, () => roll())}>
              <rect x={x} y={y} width={s} height={s} fill="transparent" />
              <DieFace x={x} y={y} s={s} face={f} tilt={rolling ? ((f * 37) % 24) - 12 : 0} />
            </g>
          );
        })}
        {state.count < MAX_DICE && (
          <g role="button" tabIndex={0} aria-label={w.spare} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { from: "spare" })}
            onKeyDown={(e) => keyTap(e, () => roll(state.count + 1))}>
            <title>{w.spare}</title>
            <rect x={SPARE.x} y={SPARE.y} width={SPARE.w} height={SPARE.h} rx={10} fill="#fff" stroke="#ced4da" strokeDasharray="5 4" />
            {held?.from === "spare" ? (
              <DieFace x={held.x - 22} y={held.y - 22} s={44} face={6} />
            ) : (
              <DieFace x={SPARE.x + 12} y={SPARE.y + 6} s={44} face={6} />
            )}
            <text x={SPARE.x + SPARE.w / 2} y={SPARE.y + SPARE.h - 4} fontSize={12} textAnchor="middle" fill="#868e96" pointerEvents="none">{w.spareLabel}</text>
          </g>
        )}
        <text x={W / 2} y={186} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>
          {faces.length > 1 ? `${w.total}: ${rolling ? "…" : total}` : ""}
        </text>
        <Bin {...BIN} hot={typeof held?.from === "number" && inBox(BIN, held.x, held.y)} label={w.bin} title={w.binTitle}
          onTap={() => set({ ...state, history: [] })} />
        <text x={10} y={240} fontSize={13} fill="#868e96">{w.history}</text>
        <text x={10} y={262} fontSize={17} fill={INK}>{state.history.join("  ") || "—"}</text>
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}

// ——— Spinner ———

export function Spinner({ state, set, w: words, svgRef }: PieceProps<"spinner">) {
  const w = words.spinner;
  const [spinning, setSpinning] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const animate = useAnimation();
  // The last few places of the pointer while held, to tell how fast it was flicked.
  const trail = useRef<{ a: number; t: number }[]>([]);
  const n = state.sections;
  const angle = spinning ?? held ?? state.angle;
  const C = { x: 140, y: 150 };
  const R = 120;
  const spin = (speed: number, from = state.angle) => {
    if (spinning !== null) return;
    const to = from + spinTurn(speed, Math.random());
    animate(
      1600 + Math.abs(to - from),
      (t) => setSpinning(from + (to - from) * (1 - (1 - t) ** 3)),
      () => {
        const end = ((to % 360) + 360) % 360;
        const result = sectionAt(end, n);
        setSpinning(null);
        set({ ...state, angle: end, result, counts: tallyUp(state.counts, result) });
      },
    );
  };
  const angleOf = (e: PointerEvent) => {
    const [x, y] = pointIn(e);
    return ((Math.atan2(x - C.x, C.y - y) * 180) / Math.PI + 360) % 360;
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || spinning !== null) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    trail.current = [{ a: state.angle, t: e.timeStamp }];
    setHeld(state.angle);
  };
  const move = (e: PointerEvent) => {
    if (held === null) return;
    // Unwrapped, so a turn past twelve keeps going rather than jumping back.
    const last = trail.current.at(-1)!;
    const a = last.a + ((((angleOf(e) - last.a) % 360) + 540) % 360) - 180;
    trail.current = [...trail.current, { a, t: e.timeStamp }].slice(-5);
    setHeld(a);
  };
  const up = (e: PointerEvent) => {
    if (held === null) return;
    const pts = trail.current;
    const [first, last] = [pts[0], pts.at(-1)!];
    const moved = Math.abs(last.a - pts[0].a) > 4;
    const speed = moved && last.t > first.t ? (last.a - first.a) / (last.t - first.t) : 0;
    setHeld(null);
    trail.current = [];
    // A drag let go slowly leaves the pointer where it was put; a flick or a tap spins it.
    if (moved && Math.abs(speed) < 0.05 && e.timeStamp - last.t > 120) return set({ ...state, angle: ((last.a % 360) + 360) % 360 });
    spin(speed, last.a);
  };
  const [tx, ty] = around(C.x, C.y, R - 16, angle);
  const W = 280;
  const H = 400;
  const colors = Array.from({ length: n }, (_, i) => SECTION_COLORS[i % SECTION_COLORS.length]);
  return (
    <>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...PIC}>
        <rect width={W} height={H} fill="#fff" />
        <g role="button" tabIndex={0} aria-label={w.flick} style={{ cursor: held === null ? "grab" : "grabbing" }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setHeld(null)}
          onKeyDown={(e) => keyTap(e, () => spin(0))}>
          {Array.from({ length: n }, (_, i) => {
            const [lx, ly] = around(C.x, C.y, R * 0.68, (i + 0.5) * (360 / n));
            const lit = spinning === null && held === null && state.result === i;
            return (
              <g key={i}>
                <path d={sectorPath(C.x, C.y, R, (i * 360) / n, ((i + 1) * 360) / n)} fill={colors[i]} stroke={INK} strokeWidth={lit ? 4 : 2} />
                <text x={lx} y={ly + 8} fontSize={24} textAnchor="middle" fill={INK} fontWeight={lit ? 700 : 400} pointerEvents="none">{i + 1}</text>
              </g>
            );
          })}
          <line x1={C.x} y1={C.y} x2={tx} y2={ty} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <circle cx={tx} cy={ty} r={7} fill={INK} />
          <circle cx={C.x} cy={C.y} r={12} fill={INK} />
        </g>
        <NumBox x={4} y={4} w={52} h={40} value={n} min={2} max={10} size={20} label={fill(w.sections, { n })}
          onChange={(sections) => set({ ...state, sections, result: -1, counts: Array(sections).fill(0) })} />
        <text x={30} y={58} fontSize={12} textAnchor="middle" fill="#868e96">{w.sectionsShort}</text>
        <Bin x={222} y={4} w={54} h={50} hot={false} label="" title={w.binTitle} onTap={() => set({ ...state, result: -1, counts: Array(n).fill(0) })} />
        <Tally x={10} y={282} w={260} h={114} counts={state.counts} names={colors.map((_, i) => String(i + 1))} colors={colors} />
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
