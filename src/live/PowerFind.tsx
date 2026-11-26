// The laws of powers on the board, worked by hand (#720). Rows of 2s are made longer or shorter by dragging their ends
// (or pressing the arrow keys on them), and what the rows come to is counted beside them as they change. Each round is
// answered on its tiles once the rows have been changed a few times; a wrong tap is met with something to look at
// again, the right one with its law, and Next. The rounds are in src/math/powerFind.ts.
import type { KeyboardEvent, ReactNode } from "react";
import { again, BASE, MOST, MOVES, next, order, POWER_LADDER, readings, roundOf, setCount, tap, tiles } from "../math/powerFind";
import { BLUE, GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const X0 = 70;
const STEP = 46;
const CHIP = 38;
const ASK = "#e8590c";
const TOP = 120;
const RY = 410;
const TY = RY + 70;
const H = TY + 150;
const KEY = { product: "Product", quotient: "Quotient", power: "Power", negative: "Negative" } as const;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** 2 to the k as read: "2⁵", "2⁻³". */
const pw = (k: number) => `${BASE}${k < 0 ? "⁻" : ""}${[...String(Math.abs(k))].map((c) => SUP[Number(c)]).join("")}`;
const big = (v: number) => (v >= 1 ? v.toLocaleString("en-US").replace(/,/g, " ") : `1/${(1 / v).toLocaleString("en-US").replace(/,/g, " ")}`);

export function PowerFind({ state, set, w: words, svgRef }: PieceProps<"powerFind">) {
  const w = words.powerFind;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const read = readings(state);
  const { m, n } = state;

  const toCount = (which: "m" | "n", x: number) => set(setCount(state, which, (x - X0 + STEP / 2) / STEP));
  const { begin, svgProps } = useDrag<{ which: "m" | "n" }>((d) => toCount(d.which, d.x), (d) => toCount(d.which, d.x));
  const onKey = (which: "m" | "n") => (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(setCount(state, which, state[which] + d));
  };

  let say = "";
  if (state.said && t && r) {
    const key = KEY[r.kind];
    if (state.said.ok) say = w[`rule${key}`];
    else if (state.seen < MOVES) say = w.lookMove;
    else say = state.said.v === t.slip ? w[`slip${key}`] : w[`other${key}`];
  }
  const lines = wrapWords(say, 58);
  const ask = !r ? w.done : w[`ask${KEY[r.kind]}`];
  const askLines = wrapWords(ask, 60);

  const label = (x: number, y: number, s: string, color = INK, anchor: "start" | "middle" | "end" = "middle", bold = false, size = 16) => (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontWeight={bold ? 700 : 400} pointerEvents="none">{s}</text>
  );
  /** A chip with its text, crossed out when it has cancelled. */
  const chip = (x: number, y: number, s: string, color: string, size = CHIP, crossed = false) => (
    <g pointerEvents="none">
      <rect x={x} y={y} width={size} height={size} rx={6} fill={crossed ? "#f1f3f5" : "#fff"} stroke={crossed ? MUTED : color} strokeWidth={2} />
      <text x={x + size / 2} y={y + size / 2 + size * 0.17} fontSize={size * 0.5} textAnchor="middle" fill={crossed ? MUTED : color} fontWeight={700}>{s}</text>
      {crossed && <line x1={x + 4} y1={y + size - 4} x2={x + size - 4} y2={y + 4} stroke={ASK} strokeWidth={2.5} />}
    </g>
  );
  /** A row of k chips whose end is dragged (or moved by the keys) to set its count. */
  const row = (which: "m" | "n", y: number, text: string, color: string, live: boolean, crossed = 0) => {
    const k = state[which];
    const end = X0 + k * STEP;
    return (
      <g>
        {label(X0 - 14, y + CHIP / 2 + 6, which, color, "end", true, 18)}
        {Array.from({ length: k }, (_, i) => <g key={i}>{chip(X0 + i * STEP, y, text, color, CHIP, i < crossed)}</g>)}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w[which === "m" ? "mLabel" : "nLabel"] : undefined}
          aria-valuenow={live ? k : undefined} aria-valuemin={live ? 1 : undefined} aria-valuemax={live ? MOST : undefined} data-row={which}
          style={live ? { cursor: "ew-resize" } : undefined} onKeyDown={live ? onKey(which) : undefined} onPointerDown={live ? (e) => begin(e, { which }) : undefined}>
          <rect x={X0 - 10} y={y - 6} width={MOST * STEP + 30} height={CHIP + 12} fill="transparent" />
          <rect x={end - 4} y={y - 4} width={10} height={CHIP + 8} rx={4} fill={color} pointerEvents="none" />
        </g>
      </g>
    );
  };

  const picture = (live: boolean) => {
    if (!r) return null;
    const body: ReactNode[] = [];
    let text = "";
    if (r.kind === "product") {
      body.push(row("m", TOP, String(BASE), BLUE, live), label(X0 - 40, TOP + 84, "×", INK, "middle", true, 22), row("n", TOP + 70, String(BASE), GREEN, live));
      const small = 30;
      for (let i = 0; i < m + n; i++) body.push(chip(X0 + i * (small + 6), TOP + 160, String(BASE), i < m ? BLUE : GREEN, small));
      text = fill(w.readProduct, { a: pw(m), b: pw(n), k: m + n, c: pw(read.exp), v: big(read.value) });
    } else if (r.kind === "power") {
      body.push(row("m", TOP, String(BASE), BLUE, live), row("n", TOP + 70, pw(m), ASK, live));
      // Up to six rows of six: kept above the line the count is written on.
      const small = 18;
      for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) body.push(chip(X0 + i * (small + 3), TOP + 135 + j * (small + 3), String(BASE), BLUE, small));
      text = fill(w.readPower, { a: `(${pw(m)})${pw(n).slice(1)}`, n, m, k: m * n, c: pw(read.exp), v: big(read.value) });
    } else {
      body.push(row("m", TOP, String(BASE), BLUE, live, read.cancel), row("n", TOP + 76, String(BASE), GREEN, live, read.cancel));
      body.push(<line x1={X0 - 6} y1={TOP + 61} x2={X0 + MOST * STEP + 14} y2={TOP + 61} stroke={INK} strokeWidth={2.5} pointerEvents="none" />);
      const args = { a: pw(m), b: pw(n), p: read.cancel, k: read.twos, c: pw(read.exp), d: pw(-read.exp), v: big(read.value) };
      text = fill(m > n ? w.readQuotient : m === n ? w.readEqual : w.readBelow, args);
    }
    return (
      <>
        {body.map((b, i) => <g key={i}>{b}</g>)}
        <g data-read="">{wrapWords(text, 66).map((l, i) => <g key={i}>{label(20, RY + i * 26, i ? ` ${l}` : l, INK, "start", false, 18)}</g>)}</g>
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps} style={{ touchAction: "none", userSelect: "none" }}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={20} y={34 + i * 26} fontSize={20} fontWeight={700} fill={done ? MUTED : BLUE}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: POWER_LADDER.length })}</text>}
        {picture(true)}
        {!done && order(state).map((v, i) => (
          <Pill key={v} x={20 + i * 232} y={TY} w={220} h={40} size={15} text={w[v as "addExp"]}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say && (
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={20} y={TY + 72 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && <Pill x={W - 140} y={TY + 60} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={20} y={TY} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={RY + 70 - TOP + 20} viewBox={`0 ${TOP - 20} ${W} ${RY + 70 - TOP + 20}`} fontFamily={FONT}>
          <rect x={0} y={TOP - 20} width={W} height={RY + 70 - TOP + 20} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
