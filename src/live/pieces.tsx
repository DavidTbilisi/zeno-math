// The live pieces that need no heavy maths: a geared clock, dice, a spinner, a coin, fractions to shade, a ten frame
// with counters, a hundred square for patterns, and dot multiplication. Each draws one SVG picture (what "Copy as a
// picture" copies) with its buttons around it, keeps what's mid-way (a drag, a roll) to itself, and hands the
// result to the board with `set`.
import { useEffect, useRef, useState } from "react";
import {
  clockTime,
  counters,
  dotProduct,
  dragHand,
  handAngles,
  multiplesOf,
  snapTo,
  tapSquare,
  wrapDay,
} from "../math/live";
import { fill, FONT, INK, Stepper, svgPoint, Toggle, type PieceProps } from "./ui";

const BLUE = "#1971c2";
export const SECTION_COLORS = ["#ffc9c9", "#ffec99", "#b2f2bb", "#a5d8ff", "#d0bfff", "#ffd8a8", "#eebefa", "#99e9f2", "#c0eb75", "#e9ecef"];
const rad = (deg: number) => (deg * Math.PI) / 180;
/** A point at `deg` clockwise from twelve, as on a clock face or a spinner. */
const around = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
const sectorPath = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x0, y0] = around(cx, cy, r, from);
  const [x1, y1] = around(cx, cy, r, to);
  return to - from >= 359.999
    ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`
    : `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${to - from > 180 ? 1 : 0},1 ${x1},${y1}Z`;
};

/** Runs `step(t)` with t from 0 to 1 over `ms`, then `done`; a new run or unmounting stops the old one. */
function useAnimation() {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (ms: number, step: (t: number) => void, done: () => void) => {
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      step(t);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else done();
    };
    frame.current = requestAnimationFrame(tick);
  };
}

// ——— Clock ———

export function Clock({ state, set, w, svgRef }: PieceProps<"clock">) {
  const [drag, setDrag] = useState<{ hand: "hour" | "minute"; minutes: number } | null>(null);
  const minutes = drag?.minutes ?? state.minutes;
  const { hour, minute } = handAngles(minutes);
  const [c, r] = [150, 140];
  const angleAt = (e: React.PointerEvent) => {
    const [x, y] = svgPoint(svgRef.current!, e);
    return ((Math.atan2(x - c, c - y) * 180) / Math.PI + 360) % 360;
  };
  const grab = (hand: "hour" | "minute") => (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ hand, minutes: state.minutes });
  };
  const hand = (which: "hour" | "minute", angle: number, len: number, width: number) => {
    const [x, y] = around(c, c, len, angle);
    return (
      <g style={{ cursor: "grab" }} onPointerDown={grab(which)}>
        <line x1={c} y1={c} x2={x} y2={y} stroke={which === "hour" ? INK : BLUE} strokeWidth={width} strokeLinecap="round" />
        <line x1={c} y1={c} x2={x} y2={y} stroke="transparent" strokeWidth={28} strokeLinecap="round" />
      </g>
    );
  };
  return (
    <>
      <svg
        ref={svgRef}
        width={300}
        height={348}
        viewBox="0 0 300 348"
        fontFamily={FONT}
        onPointerMove={(e) => drag && setDrag({ ...drag, minutes: dragHand(drag.minutes, drag.hand, angleAt(e)) })}
        onPointerUp={() => {
          if (!drag) return;
          set({ ...state, minutes: wrapDay(state.snap ? snapTo(drag.minutes, 5) : drag.minutes) });
          setDrag(null);
        }}
      >
        <circle cx={c} cy={c} r={r} fill="#fff" stroke={INK} strokeWidth={4} />
        {Array.from({ length: 60 }, (_, m) => {
          const [x0, y0] = around(c, c, r - 4, m * 6);
          const [x1, y1] = around(c, c, r - (m % 5 ? 12 : 22), m * 6);
          return <line key={m} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={m % 5 ? 1.5 : 3.5} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const [x, y] = around(c, c, r - 44, (i + 1) * 30);
          return <text key={i} x={x} y={y + 9} fontSize={26} textAnchor="middle" fill={INK}>{i + 1}</text>;
        })}
        {state.showTime && (
          <g>
            <rect x={c - 50} y={306} width={100} height={38} rx={6} fill="#f1f3f5" stroke="#ced4da" />
            <text x={c} y={334} fontSize={26} textAnchor="middle" fill={INK}>{clockTime(minutes)}</text>
          </g>
        )}
        {hand("hour", hour, 74, 9)}
        {hand("minute", minute, 112, 5)}
        <circle cx={c} cy={c} r={8} fill={INK} />
      </svg>
      <div className="live-bar">
        <Toggle on={state.showTime} onClick={() => set({ ...state, showTime: !state.showTime })}>{w.clock.showTime}</Toggle>
        <Toggle on={state.snap} onClick={() => set({ ...state, snap: !state.snap, minutes: state.snap ? state.minutes : snapTo(state.minutes, 5) })}>{w.clock.snap}</Toggle>
        <button className="live-btn" title={w.clock.random} aria-label={w.clock.random} onClick={() => set({ ...state, minutes: 5 * Math.floor(Math.random() * 144) })}>🎲</button>
      </div>
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

export function Dice({ state, set, w, svgRef }: PieceProps<"dice">) {
  const [rolling, setRolling] = useState<number[] | null>(null);
  const animate = useAnimation();
  const faces = rolling ?? state.faces;
  const size = 92;
  const gap = 22;
  const x0 = (340 - (faces.length * size + (faces.length - 1) * gap)) / 2;
  const roll = () => {
    let last = -1;
    animate(
      650,
      (t) => {
        const tick = Math.floor(t * 9);
        if (tick !== last) (last = tick), setRolling(state.faces.map(rollDie));
      },
      () => {
        const next = state.faces.map(rollDie);
        setRolling(null);
        set({ ...state, faces: next, history: [next.reduce((a, b) => a + b, 0), ...state.history].slice(0, 14) });
      },
    );
  };
  const setCount = (count: number) => set({ ...state, count, faces: Array.from({ length: count }, (_, i) => state.faces[i] ?? rollDie()), history: [] });
  const total = faces.reduce((a, b) => a + b, 0);
  return (
    <>
      <svg ref={svgRef} width={340} height={150} viewBox="0 0 340 150" fontFamily={FONT} style={{ cursor: "pointer" }} onClick={roll}>
        {faces.map((f, i) => {
          const x = x0 + i * (size + gap);
          return (
            <g key={i} transform={rolling ? `rotate(${(f * 37) % 24 - 12} ${x + size / 2} ${60})` : undefined}>
              <rect x={x} y={14} width={size} height={size} rx={16} fill="#fff" stroke={INK} strokeWidth={3} />
              {PIPS[f].map(([px, py], j) => <circle key={j} cx={x + px * size} cy={14 + py * size} r={8.5} fill={INK} />)}
            </g>
          );
        })}
        {faces.length > 1 && <text x={170} y={140} fontSize={20} textAnchor="middle" fill={INK}>{w.dice.total}: {rolling ? "…" : total}</text>}
      </svg>
      <div className="live-bar">
        <Stepper value={state.count} min={1} max={3} onChange={setCount} less={w.dice.fewer} more={w.dice.more} />
        <button className="live-btn primary" onClick={roll}>🎲 {w.dice.roll}</button>
        <button className="live-btn" onClick={() => set({ ...state, history: [] })}>{w.reset}</button>
      </div>
      <div className="live-history" title={w.dice.history}>
        {state.history.map((h, i) => <span key={i} className="live-chip">{h}</span>)}
      </div>
    </>
  );
}

// ——— Spinner ———

export function Spinner({ state, set, w, svgRef }: PieceProps<"spinner">) {
  const [spinning, setSpinning] = useState<number | null>(null);
  const animate = useAnimation();
  const n = state.sections;
  const angle = spinning ?? state.angle;
  const [c, r] = [140, 128];
  const spin = () => {
    if (spinning !== null) return;
    const from = state.angle;
    const to = from + 360 * (3 + Math.floor(Math.random() * 3)) + Math.random() * 360;
    animate(
      2400,
      (t) => setSpinning(from + (to - from) * (1 - (1 - t) ** 3)),
      () => {
        const end = to % 360;
        const result = Math.floor(end / (360 / n)) % n;
        setSpinning(null);
        set({ ...state, angle: end, result, counts: state.counts.map((k, i) => (i === result ? k + 1 : k)) });
      },
    );
  };
  const setSections = (sections: number) => set({ ...state, sections, result: -1, counts: Array(sections).fill(0) });
  const [tx, ty] = around(c, c, r - 18, angle);
  return (
    <>
      <svg ref={svgRef} width={280} height={280} viewBox="0 0 280 280" fontFamily={FONT} style={{ cursor: "pointer" }} onClick={spin}>
        {Array.from({ length: n }, (_, i) => {
          const [lx, ly] = around(c, c, r * 0.68, (i + 0.5) * (360 / n));
          const lit = spinning === null && state.result === i;
          return (
            <g key={i}>
              <path d={sectorPath(c, c, r, (i * 360) / n, ((i + 1) * 360) / n)} fill={SECTION_COLORS[i % SECTION_COLORS.length]} stroke={INK} strokeWidth={lit ? 4 : 2} />
              <text x={lx} y={ly + 8} fontSize={24} textAnchor="middle" fill={INK} fontWeight={lit ? 700 : 400}>{i + 1}</text>
            </g>
          );
        })}
        <line x1={c} y1={c} x2={tx} y2={ty} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <circle cx={tx} cy={ty} r={7} fill={INK} />
        <circle cx={c} cy={c} r={12} fill={INK} />
      </svg>
      <div className="live-bar">
        <Stepper value={n} min={2} max={10} onChange={setSections} less={w.spinner.fewer} more={w.spinner.more} />
        <button className="live-btn primary" onClick={spin}>↻ {w.spinner.spin}</button>
        <button className="live-btn" onClick={() => set({ ...state, result: -1, counts: Array(n).fill(0) })}>{w.reset}</button>
      </div>
      <div className="live-history">
        {state.counts.map((k, i) => (
          <span key={i} className="live-chip" style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }}>{i + 1}: {k}</span>
        ))}
      </div>
    </>
  );
}

// ——— Coin ———

export function Coin({ state, set, w, svgRef }: PieceProps<"coin">) {
  const [flip, setFlip] = useState<{ t: number; side: number; halves: number } | null>(null);
  const animate = useAnimation();
  const side = flip?.side ?? state.side;
  const toss = () => {
    if (flip) return;
    const result = Math.random() < 0.5 ? 0 : 1;
    // Seven half-turns or eight, so it lands on the side that came up.
    const halves = 7 + ((7 + state.side + result) % 2);
    animate(
      1100,
      // The face changes when the coin is edge-on.
      (t) => setFlip({ t, side: (state.side + Math.floor(t * halves + 0.5)) % 2, halves }),
      () => {
        setFlip(null);
        set({ side: result, counts: state.counts.map((k, i) => (i === result ? k + 1 : k)) as [number, number] });
      },
    );
  };
  const squash = flip ? Math.abs(Math.cos(flip.t * Math.PI * flip.halves)) : 1;
  const label = side === 0 ? w.coin.heads : w.coin.tails;
  return (
    <>
      <svg ref={svgRef} width={240} height={200} viewBox="0 0 240 200" fontFamily={FONT} style={{ cursor: "pointer" }} onClick={toss}>
        <g transform={`translate(120 ${100 - (flip ? Math.sin(flip.t * Math.PI) * 30 : 0)}) scale(1 ${Math.max(0.04, squash)})`}>
          <circle r={86} fill={side === 0 ? "#ffd43b" : "#e9ecef"} stroke={INK} strokeWidth={3} />
          <circle r={72} fill="none" stroke={INK} strokeWidth={1.5} strokeDasharray="3 4" />
          <text y={label.length > 6 ? 8 : 12} fontSize={label.length > 6 ? 24 : 34} textAnchor="middle" fill={INK}>{label}</text>
        </g>
      </svg>
      <div className="live-bar">
        <button className="live-btn primary" onClick={toss}>🪙 {w.coin.flip}</button>
        <button className="live-btn" onClick={() => set({ ...state, counts: [0, 0] })}>{w.reset}</button>
      </div>
      <div className="live-history">
        <span className="live-chip">{w.coin.heads}: {state.counts[0]}</span>
        <span className="live-chip">{w.coin.tails}: {state.counts[1]}</span>
      </div>
    </>
  );
}

// ——— Fractions ———

export function Fractions({ state, set, w, svgRef }: PieceProps<"fractions">) {
  const n = state.parts;
  const k = state.shaded.filter(Boolean).length;
  const toggle = (i: number) => set({ ...state, shaded: state.shaded.map((s, j) => (j === i ? !s : s)) });
  const setParts = (parts: number) => set({ ...state, parts, shaded: Array.from({ length: parts }, (_, i) => i < Math.min(k, parts)) });
  const piece = (i: number) => ({
    fill: state.shaded[i] ? "#a5d8ff" : "#fff",
    stroke: INK,
    strokeWidth: 2.5,
    style: { cursor: "pointer" },
    onClick: () => toggle(i),
  });
  return (
    <>
      <svg ref={svgRef} width={300} height={290} viewBox="0 0 300 290" fontFamily={FONT}>
        {state.shape === "circle"
          ? Array.from({ length: n }, (_, i) =>
              n === 1 ? <circle key={i} cx={150} cy={112} r={104} {...piece(i)} /> : <path key={i} d={sectorPath(150, 112, 104, (i * 360) / n, ((i + 1) * 360) / n)} {...piece(i)} />,
            )
          : Array.from({ length: n }, (_, i) => <rect key={i} x={10 + (i * 280) / n} y={70} width={280 / n} height={84} {...piece(i)} />)}
        <text x={150} y={250} fontSize={30} textAnchor="middle" fill={INK}>{k}</text>
        <line x1={128} y1={259} x2={172} y2={259} stroke={INK} strokeWidth={2.5} />
        <text x={150} y={286} fontSize={30} textAnchor="middle" fill={INK}>{n}</text>
      </svg>
      <div className="live-bar">
        <Toggle on={state.shape === "circle"} onClick={() => set({ ...state, shape: "circle" })}>{w.fractions.circle}</Toggle>
        <Toggle on={state.shape === "bar"} onClick={() => set({ ...state, shape: "bar" })}>{w.fractions.bar}</Toggle>
        <Stepper value={n} min={1} max={12} onChange={setParts} less={w.fractions.fewer} more={w.fractions.more} />
      </div>
    </>
  );
}

// ——— Ten frame ———

export function TenFrame({ state, set, w, svgRef }: PieceProps<"tenFrame">) {
  const s = 58;
  const frames = state.double ? 2 : 1;
  const cells = state.cells.slice(0, 10 * frames);
  const { a, b, n } = counters(cells);
  const height = frames * 2 * s + (frames - 1) * 18 + 60;
  const cycle = (i: number) => set({ ...state, cells: state.cells.map((c, j) => (j === i ? (c + 1) % 3 : c)) });
  return (
    <>
      <svg ref={svgRef} width={310} height={height} viewBox={`0 0 310 ${height}`} fontFamily={FONT}>
        {cells.map((c, i) => {
          const f = Math.floor(i / 10);
          const x = 10 + (i % 5) * s;
          const y = 4 + f * (2 * s + 18) + Math.floor((i % 10) / 5) * s;
          return (
            <g key={i} style={{ cursor: "pointer" }} onClick={() => cycle(i)}>
              <rect x={x} y={y} width={s} height={s} fill="#fff" stroke={INK} strokeWidth={2.5} />
              {c > 0 && <circle cx={x + s / 2} cy={y + s / 2} r={21} fill={c === 1 ? "#ff8787" : "#ffd43b"} stroke={INK} strokeWidth={2} />}
            </g>
          );
        })}
        <text x={155} y={height - 14} fontSize={30} textAnchor="middle" fill={INK}>{b ? `${a} + ${b} = ${n}` : n}</text>
      </svg>
      <div className="live-bar">
        <Toggle on={state.double} onClick={() => set({ ...state, double: !state.double })}>{w.tenFrame.twenty}</Toggle>
        <button className="live-btn" onClick={() => set({ ...state, cells: Array(20).fill(0) })}>{w.tenFrame.clear}</button>
      </div>
      <p className="live-hint">{w.tenFrame.hint}</p>
    </>
  );
}

// ——— Hundred square ———

export function Hundred({ state, set, w, svgRef }: PieceProps<"hundred">) {
  const s = 38;
  const marked = new Set(state.marked);
  const toggle = (v: number) => set({ ...state, marked: marked.has(v) ? state.marked.filter((m) => m !== v) : [...state.marked, v] });
  return (
    <>
      <svg ref={svgRef} width={384} height={384} viewBox="0 0 384 384" fontFamily={FONT}>
        {Array.from({ length: 100 }, (_, i) => {
          const v = i + 1;
          const [x, y] = [2 + (i % 10) * s, 2 + Math.floor(i / 10) * s];
          return (
            <g key={v} style={{ cursor: "pointer" }} onClick={() => toggle(v)}>
              <rect x={x} y={y} width={s} height={s} fill={marked.has(v) ? "#ffec99" : "#fff"} stroke={INK} strokeWidth={1.2} />
              <text x={x + s / 2} y={y + s / 2 + 6} fontSize={16} textAnchor="middle" fill={INK} fontWeight={marked.has(v) ? 700 : 400}>{v}</text>
            </g>
          );
        })}
      </svg>
      <div className="live-bar">
        <span>{w.hundred.multiples}</span>
        <Stepper value={state.n} min={2} max={12} onChange={(n) => set({ ...state, n })} less="−" more="+" />
        <button className="live-btn primary" onClick={() => set({ ...state, marked: multiplesOf(state.n) })}>{w.hundred.show}</button>
        <button className="live-btn" onClick={() => set({ ...state, marked: [] })}>{w.hundred.clear}</button>
        <span className="live-note">{fill(w.hundred.marked, { n: state.marked.length })}</span>
      </div>
    </>
  );
}

// ——— Dot multiplication ———

export const DOT_ROWS = [3, 4, 5, 6, 10];

export function Dots({ state, set, w, svgRef }: PieceProps<"dots">) {
  const { k, top, bottom } = state;
  const r = dotProduct(k, top, bottom);
  const W = 500;
  const gap = 6;
  const s = Math.min(92, (W - 20 - (k - 1) * gap) / k);
  const x0 = (W - (k * s + (k - 1) * gap)) / 2;
  const row = (y: number, dots: number, which: "top" | "bottom") =>
    Array.from({ length: k }, (_, i) => {
      const x = x0 + i * (s + gap);
      return (
        <g key={`${which}${i}`} style={{ cursor: "pointer" }} onClick={() => set({ ...state, [which]: tapSquare(dots, i) })}>
          <rect x={x} y={y} width={s} height={s} fill="#fff" stroke="#adb5bd" strokeWidth={1.5} />
          {i < dots && <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.32} fill="#40c057" />}
        </g>
      );
    });
  const rowsTop = 62;
  const y2 = rowsTop + s + 46;
  const steps = y2 + s + 40;
  const line = (i: number, label: string, v: Record<string, number>) => (
    <text key={i} x={x0} y={steps + i * 34} fontSize={19} fill={INK}>
      <tspan fontWeight={700}>{"①②③④"[i]}</tspan> {fill(label, { ...v, r: "" })}
      <tspan fontWeight={700}>{v.r}</tspan>
    </text>
  );
  return (
    <>
      <div className="live-bar">
        <label className="live-select">
          <span>{w.dots.perRow}</span>
          <select value={k} onChange={(e) => set({ k: Number(e.target.value), top: 0, bottom: 0 })}>
            {DOT_ROWS.map((n) => <option key={n} value={n}>{fill(w.dots.option, { k: n, k2: 2 * n })}</option>)}
          </select>
        </label>
        <button className="live-btn" onClick={() => set({ ...state, top: 0, bottom: 0 })}>{w.dots.clear}</button>
      </div>
      <p className="live-hint">{w.dots.hint}</p>
      <svg ref={svgRef} width={W} height={steps + 4 * 34 + 20} viewBox={`0 0 ${W} ${steps + 4 * 34 + 20}`} fontFamily={FONT}>
        {Array.from({ length: k }, (_, i) => (
          <text key={i} x={x0 + i * (s + gap) + s / 2} y={20} fontSize={18} textAnchor="middle" fill={INK}>{k + i + 1}</text>
        ))}
        <text x={x0} y={rowsTop - 10} fontSize={17} fill={INK}>{fill(w.dots.top, { n: r.a, d: top, e: r.empty[0] })}</text>
        {row(rowsTop, top, "top")}
        <text x={x0} y={y2 - 10} fontSize={17} fill={INK}>{fill(w.dots.bottom, { n: r.b, d: bottom, e: r.empty[1] })}</text>
        {row(y2, bottom, "bottom")}
        {line(0, w.dots.step1, { a: top, b: bottom, r: r.dots })}
        {line(1, w.dots.step2, { a: r.dots, b: r.value, r: r.dotValue })}
        {line(2, w.dots.step3, { a: r.empty[0], b: r.empty[1], r: r.emptyProduct })}
        {line(3, w.dots.step4, { a: r.dotValue, b: r.emptyProduct, r: r.product })}
        <text x={x0} y={steps + 4 * 34 + 8} fontSize={22} fontWeight={700} fill={INK}>{r.a} × {r.b} = {r.product}</text>
      </svg>
    </>
  );
}

