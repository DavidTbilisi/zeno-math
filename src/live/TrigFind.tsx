// Trig identities and the sine and cosine rules on the board, worked by hand (#716). One point is moved by dragging, by
// pressing where it should go, or with the arrow keys: P round the unit circle, P with its mirror P′, C round the circle
// through a triangle's corners, or the side CB swung to open the angle at C. The numbers of the round are read off as it
// moves, and the round is answered on its tiles once the point has been moved a few times; a wrong tap is met with
// something to look at again, the right one with its rule, and Next. The rounds are in src/math/trigFind.ts.
import type { KeyboardEvent, ReactNode } from "react";
import { again, MOVES, move, next, onCircle, order, readings, roundOf, SIDE_A, SIDE_B, SINE_R, sineTriangle, tap, tiles, TRIG_LADDER } from "../math/trigFind";
import { BLUE, GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const CX = 200;
const CY = 270;
const RP = 125;
const ASK = "#e8590c";
const FILL = "#e7f5ff";
const TY = CY + RP + 55;
const H = TY + 150;
/** The cosine-rule round: where C sits and how many pixels a unit is. */
const VC: [number, number] = [170, 360];
const UNIT = 45;
const RX = 410;

const px = ([x, y]: [number, number], k = RP): [number, number] => [CX + x * k, CY - y * k];
const two = (v: number) => v.toFixed(2).replace("-", "−");
const one = (v: number) => v.toFixed(1).replace("-", "−");
const KEY = { pyth: "Pyth", mirror: "Mirror", sine: "Sine", cosine: "Cosine" } as const;

export function TrigFind({ state, set, w: words, svgRef }: PieceProps<"trigFind">) {
  const w = words.trigFind;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const read = readings(state);
  const cosine = r?.kind === "cosine";

  const toPoint = (x: number, y: number) => {
    const [ox, oy] = cosine ? VC : [CX, CY];
    set(move(state, (Math.atan2(oy - y, x - ox) * 180) / Math.PI));
  };
  const { begin, svgProps } = useDrag<{ what: "point" }>((d) => toPoint(d.x, d.y), (d) => toPoint(d.x, d.y));
  const onKey = (e: KeyboardEvent) => {
    const turn = e.key === "ArrowLeft" || e.key === "ArrowUp" ? 5 : e.key === "ArrowRight" || e.key === "ArrowDown" ? -5 : 0;
    if (!turn) return;
    e.preventDefault();
    e.stopPropagation();
    set(move(state, state.t + turn));
  };

  // The words under the tiles: what a wrong tap should look at again, or the right one's rule.
  let say = "";
  if (state.said && t && r) {
    const key = KEY[r.kind];
    if (state.said.ok) say = fill(w[`rule${key}`], { d: 2 * SINE_R });
    else if (state.seen < MOVES) say = r.kind === "sine" || cosine ? w.lookMoveC : w.lookMove;
    else say = state.said.v === t.slip ? w[`slip${key}`] : w[`other${key}`];
  }
  const lines = wrapWords(say, 58);
  const ask = !r ? w.done : w[`ask${KEY[r.kind]}`];
  const askLines = wrapWords(ask, 60);

  const label = (x: number, y: number, s: string, color = INK, anchor: "start" | "middle" | "end" = "middle", bold = false, size = 16) => (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontWeight={bold ? 700 : 400} pointerEvents="none">{s}</text>
  );
  const line = (a: [number, number], b: [number, number], color = INK, dash = false, width = 2) => (
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeDasharray={dash ? "6 4" : undefined} pointerEvents="none" />
  );
  /** The numbers the round reads, one to a line beside the picture; the first ones in colour. */
  const panel = (rows: [string, string?][]) =>
    rows.map(([s, color], i) => <g key={i}>{label(RX, 150 + i * 30, s, color ?? INK, "start", Boolean(color), 18)}</g>);

  const picture = (live: boolean) => {
    if (!r) return null;
    const body: ReactNode[] = [];
    let handle: [number, number];
    let name = "P";
    if (r.kind === "cosine") {
      const A: [number, number] = [VC[0] + SIDE_B * UNIT, VC[1]];
      const B: [number, number] = [VC[0] + SIDE_A * UNIT * Math.cos((state.t * Math.PI) / 180), VC[1] - SIDE_A * UNIT * Math.sin((state.t * Math.PI) / 180)];
      handle = B;
      name = "B";
      body.push(
        <polygon points={[VC, A, B].map((p) => p.join(",")).join(" ")} fill={FILL} stroke="none" pointerEvents="none" />,
        line(VC, A, BLUE), line(VC, B, BLUE), line(A, B, ASK, false, 2.5),
        label(VC[0] - 14, VC[1] + 6, "C", INK, "end", true), label(A[0] + 12, A[1] + 6, "A", INK, "start", true),
        label((VC[0] + A[0]) / 2, VC[1] + 22, `b = ${SIDE_B}`, BLUE, "middle", true, 15),
        label((VC[0] + B[0]) / 2 - 16, (VC[1] + B[1]) / 2, `a = ${SIDE_A}`, BLUE, "end", true, 15),
        label((A[0] + B[0]) / 2 + 12, (A[1] + B[1]) / 2 - 6, "c", ASK, "start", true, 16),
        <path d={`M ${VC[0] + 30} ${VC[1]} A 30 30 0 0 0 ${VC[0] + 30 * Math.cos((state.t * Math.PI) / 180)} ${VC[1] - 30 * Math.sin((state.t * Math.PI) / 180)}`} fill="none" stroke={GREEN} strokeWidth={2} pointerEvents="none" />,
      );
      body.push(panel([[`C = ${read.C}°`, GREEN], [`a² + b² = ${SIDE_A ** 2} + ${SIDE_B ** 2} = ${read.sum}`], [`c² = ${one(read.c2)}`, ASK], [`a² + b² − c² = ${one(read.gap)}`], [`2ab cos C = ${one(read.twoab)}`]]));
    } else if (r.kind === "sine") {
      const k = RP / SINE_R;
      const { A, B, C } = sineTriangle(state.t);
      const [pa, pb, pc] = [px(A, k), px(B, k), px(C, k)];
      handle = pc;
      name = "C";
      const out = (p: [number, number], s: string, color = INK) => {
        const d = Math.hypot(p[0] - CX, p[1] - CY) || 1;
        return label(p[0] + ((p[0] - CX) / d) * 20, p[1] + ((p[1] - CY) / d) * 20 + 6, s, color, "middle", true);
      };
      const side = (p: [number, number], q: [number, number], s: string) => {
        const [mx, my] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const d = Math.hypot(mx - CX, my - CY) || 1;
        return label(mx - ((mx - CX) / d) * 16, my - ((my - CY) / d) * 16 + 5, s, BLUE, "middle", true, 15);
      };
      body.push(
        <polygon points={[pa, pb, pc].map((p) => p.join(",")).join(" ")} fill={FILL} stroke={BLUE} strokeWidth={2} pointerEvents="none" />,
        out(pa, "A"), out(pb, "B"), side(pb, pc, "a"), side(pa, pc, "b"), side(pa, pb, "c"),
      );
      body.push(panel([
        [`a = ${two(read.a)},  A = ${read.A}°`], [`b = ${two(read.b)},  B = ${read.B}°`], [`c = ${two(read.c)},  C = ${read.C}°`],
        [`a ÷ sin A = ${two(read.ra)}`, GREEN], [`b ÷ sin B = ${two(read.rb)}`, GREEN], [`c ÷ sin C = ${two(read.rc)}`, GREEN],
      ]));
    } else {
      const P = onCircle(state.t);
      const [pp, foot] = [px(P), px([P[0], 0])];
      handle = pp;
      body.push(line([CX - RP - 20, CY], [CX + RP + 20, CY], MUTED, false, 1.2), line([CX, CY + RP + 20], [CX, CY - RP - 20], r.kind === "mirror" ? ASK : MUTED, r.kind === "mirror", 1.4));
      body.push(line([CX, CY], pp, INK, false, 1.6), line([CX, CY], foot, BLUE, false, 3), line(foot, pp, GREEN, false, 3));
      if (r.kind === "pyth") {
        body.push(
          label((CX + foot[0]) / 2, CY + (P[1] >= 0 ? 22 : -10), "cos θ", BLUE, "middle", true, 15),
          label(foot[0] + (P[0] >= 0 ? 8 : -8), (CY + pp[1]) / 2 + 5, "sin θ", GREEN, P[0] >= 0 ? "start" : "end", true, 15),
          label((CX + pp[0]) / 2 - (P[1] >= 0 ? 10 : -10), (CY + pp[1]) / 2 - 8, "1", INK, "middle", true, 15),
        );
        const cos2 = Math.round((1 - read.sin2) * 100) / 100;
        body.push(panel([[`θ = ${read.t}°`], [`sin θ = ${two(read.sin)}`, GREEN], [`cos θ = ${two(read.cos)}`, BLUE], [`sin²θ = ${two(read.sin2)}`, GREEN], [`cos²θ = ${two(cos2)}`, BLUE]]));
      } else {
        const Q: [number, number] = [-P[0], P[1]];
        const [qq, qfoot] = [px(Q), px([Q[0], 0])];
        body.push(line([CX, CY], qq, MUTED, false, 1.4), line(qfoot, qq, ASK, false, 3), line(pp, qq, MUTED, true, 1.2), label(qq[0] + (Q[0] >= 0 ? 14 : -14), qq[1] - 8, "P′", ASK, Q[0] >= 0 ? "start" : "end", true));
        body.push(panel([[`θ = ${read.t}°,  180° − θ = ${read.u}°`], [`sin θ = ${two(read.sinP)}`, GREEN], [`sin(180° − θ) = ${two(read.sinQ)}`, ASK], [`cos θ = ${two(read.cosP)}`], [`cos(180° − θ) = ${two(read.cosQ)}`]]));
      }
    }
    return (
      <>
        {!cosine && <circle cx={CX} cy={CY} r={RP} fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" />}
        {!cosine && <circle cx={CX} cy={CY} r={3} fill={INK} pointerEvents="none" />}
        {r.kind !== "sine" && !cosine && label(CX - 10, CY + 20, "O", INK, "end", true)}
        {body.map((b, i) => <g key={i}>{b}</g>)}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w[cosine ? "angleLabel" : r.kind === "sine" ? "cLabel" : "pLabel"] : undefined}
          aria-valuenow={live ? state.t : undefined} data-point="" style={live ? { cursor: "grab" } : undefined} onKeyDown={live ? onKey : undefined}
          onPointerDown={live ? (e) => begin(e, { what: "point" }) : undefined}>
          <rect x={10} y={CY - RP - 30} width={RX - 30} height={2 * RP + 60} fill="transparent" />
          <circle cx={handle[0]} cy={handle[1]} r={10} fill={GREEN} stroke="#fff" strokeWidth={2} pointerEvents="none" />
        </g>
        {label(handle[0] + (handle[0] >= (cosine ? VC[0] : CX) ? 16 : -16), handle[1] - 10, name, GREEN, handle[0] >= (cosine ? VC[0] : CX) ? "start" : "end", true)}
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
        {!done && <text x={20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: TRIG_LADDER.length })}</text>}
        <g data-read="">{picture(true)}</g>
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
        <svg ref={svgRef} width={W} height={2 * RP + 80} viewBox={`0 ${CY - RP - 40} ${W} ${2 * RP + 80}`} fontFamily={FONT}>
          <rect x={0} y={CY - RP - 40} width={W} height={2 * RP + 80} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
