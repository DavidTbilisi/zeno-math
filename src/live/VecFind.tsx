// 2D vectors on the board, worked by hand (#717). The tip of a vector is dragged about a square grid, pressed into place
// or moved by the arrow keys, and the numbers of the round are read off beside it as it moves. Each round is answered on
// its tiles once the tip has been moved a few times; a wrong tap is met with something to look at again, the right one
// with its rule, and Next. The rounds are in src/math/vecFind.ts.
import type { KeyboardEvent, ReactNode } from "react";
import { A_FIXED, again, MOVES, move, next, order, readings, REACH, roundOf, tap, tiles, VEC_LADDER } from "../math/vecFind";
import { BLUE, GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const CX = 200;
const CY = 300;
const U = 18;
const SPAN = 9;
const ASK = "#e8590c";
const TY = CY + SPAN * U + 30;
const H = TY + 150;
const RX = 400;
const KEY = { length: "Length", direction: "Direction", add: "Add", unit: "Unit" } as const;

const px = (x: number, y: number): [number, number] => [CX + x * U, CY - y * U];
const two = (v: number) => (Number.isNaN(v) ? "—" : v.toFixed(2).replace("-", "−"));
const num = (v: number) => String(v).replace("-", "−");
const pair = (x: number, y: number) => `(${num(x)}, ${num(y)})`;

export function VecFind({ state, set, w: words, svgRef }: PieceProps<"vecFind">) {
  const w = words.vecFind;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const read = readings(state);

  const toPoint = (x: number, y: number) => set(move(state, (x - CX) / U, (CY - y) / U));
  const { begin, svgProps } = useDrag<{ what: "tip" }>((d) => toPoint(d.x, d.y), (d) => toPoint(d.x, d.y));
  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(move(state, state.x + d[0], state.y + d[1]));
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
  /** An arrow from one grid point to another, named beside its middle. */
  const arrow = (a: [number, number], b: [number, number], color: string, name = "", dash = false, width = 3) => {
    const [[x1, y1], [x2, y2]] = [px(...a), px(...b)];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = (k: number) => `${x2 - 12 * Math.cos(ang + k)},${y2 - 12 * Math.sin(ang + k)}`;
    const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];
    const [nx, ny] = [-Math.sin(ang), Math.cos(ang)];
    return (
      <g pointerEvents="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash ? "6 4" : undefined} />
        <polygon points={`${x2},${y2} ${head(0.4)} ${head(-0.4)}`} fill={color} />
        {name && label(mx - nx * 16, my - ny * 16 + 5, name, color, "middle", true, 15)}
      </g>
    );
  };
  const panel = (rows: [string, string?][]) => rows.map(([s, color], i) => <g key={i}>{label(RX, 170 + i * 30, s, color ?? INK, "start", Boolean(color), 18)}</g>);

  const picture = (live: boolean) => {
    if (!r) return null;
    const grid: ReactNode[] = [];
    for (let k = -SPAN; k <= SPAN; k++) {
      const strong = k === 0;
      const [gx] = px(k, 0);
      const [, gy] = px(0, k);
      grid.push(
        <line key={`v${k}`} x1={gx} y1={CY - SPAN * U} x2={gx} y2={CY + SPAN * U} stroke={strong ? MUTED : "#e9ecef"} strokeWidth={strong ? 1.4 : 1} />,
        <line key={`h${k}`} x1={CX - SPAN * U} y1={gy} x2={CX + SPAN * U} y2={gy} stroke={strong ? MUTED : "#e9ecef"} strokeWidth={strong ? 1.4 : 1} />,
      );
    }
    const body: ReactNode[] = [];
    const { x, y } = state;
    let tip: [number, number] = [x, y];
    if (r.kind === "length") {
      body.push(arrow([0, 0], [x, 0], ASK, "x", true, 2), arrow([x, 0], [x, y], GREEN, "y", true, 2), arrow([0, 0], [x, y], BLUE, "v"));
      body.push(panel([[`x = ${num(x)}`, ASK], [`y = ${num(y)}`, GREEN], [`|v| = ${two(read.len)}`, BLUE]]));
    } else if (r.kind === "direction") {
      const a = (read.t * Math.PI) / 180;
      const R = 34;
      body.push(
        <path d={`M ${CX + R} ${CY} A ${R} ${R} 0 ${read.t > 180 ? 1 : 0} 0 ${CX + R * Math.cos(a)} ${CY - R * Math.sin(a)}`} fill="none" stroke={ASK} strokeWidth={2} pointerEvents="none" />,
        label(CX + 52 * Math.cos(a / 2), CY - 52 * Math.sin(a / 2) + 5, "θ", ASK, "middle", true),
        arrow([0, 0], [x, y], BLUE, "v"),
      );
      body.push(panel([[`x = ${num(x)}`], [`y = ${num(y)}`], [`θ = ${read.t.toFixed(1)}°`, ASK], [`tan θ = ${two(read.tan)}`, ASK]]));
    } else if (r.kind === "add") {
      const [ax, ay] = A_FIXED;
      tip = [x, y];
      body.push(arrow([0, 0], [x, y], BLUE, "", true, 1.6), arrow([0, 0], [ax, ay], ASK, "a"), arrow([ax, ay], [ax + x, ay + y], BLUE, "b"), arrow([0, 0], [ax + x, ay + y], GREEN, "a + b"));
      body.push(panel([
        [`a = ${pair(ax, ay)},  |a| = ${two(read.la)}`, ASK], [`b = ${pair(x, y)},  |b| = ${two(read.lb)}`, BLUE], [`a + b = ${pair(read.sx, read.sy)}`, GREEN],
        [`|a + b| = ${two(read.ls)}`, GREEN], [`|a| + |b| = ${two(read.la + read.lb)}`],
      ]));
    } else {
      body.push(<circle cx={CX} cy={CY} r={U} fill="none" stroke={MUTED} strokeWidth={1.2} strokeDasharray="4 3" pointerEvents="none" />, arrow([0, 0], [x, y], BLUE, "v"), arrow([0, 0], [read.ux, read.uy], GREEN, "", false, 3));
      body.push(panel([[`v = ${pair(x, y)}`, BLUE], [`|v| = ${two(read.len)}`, BLUE], [`v ÷ |v| = (${two(read.ux)}, ${two(read.uy)})`, GREEN], [`|v ÷ |v|| = ${two(read.ulen)}`, GREEN]]));
    }
    const handle = px(...tip);
    return (
      <>
        {grid}
        {label(CX - 8, CY + 18, "O", INK, "end", true)}
        {body.map((b, i) => <g key={i}>{b}</g>)}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w.tipLabel : undefined}
          aria-valuetext={live ? pair(x, y) : undefined} data-point="" style={live ? { cursor: "grab" } : undefined} onKeyDown={live ? onKey : undefined}
          onPointerDown={live ? (e) => begin(e, { what: "tip" }) : undefined}>
          <rect x={CX - REACH * U - 10} y={CY - REACH * U - 10} width={2 * REACH * U + 20} height={2 * REACH * U + 20} fill="transparent" />
          <circle cx={handle[0]} cy={handle[1]} r={9} fill={GREEN} stroke="#fff" strokeWidth={2} pointerEvents="none" />
        </g>
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
        {!done && <text x={20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: VEC_LADDER.length })}</text>}
        {picture(true)}
        {!done && order(state).map((v, i) => (
          <Pill key={v} x={20 + i * 232} y={TY} w={220} h={40} size={15} text={w[v as "one"]}
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
        <svg ref={svgRef} width={W} height={2 * SPAN * U + 40} viewBox={`0 ${CY - SPAN * U - 20} ${W} ${2 * SPAN * U + 40}`} fontFamily={FONT}>
          <rect x={0} y={CY - SPAN * U - 20} width={W} height={2 * SPAN * U + 40} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
