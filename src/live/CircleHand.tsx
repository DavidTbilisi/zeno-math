// Circle theorems on the board, worked by hand (#715). A circle with centre O; a point on it (or P outside it) is moved
// by dragging, by pressing where it should go, or with the arrow keys, and the angles or lengths of the round are read
// off as it moves. Each round is answered on its tiles once the point has been moved a few times; a wrong tap is met
// with something to look at again, the right one with its rule, and Next. The rounds are in src/math/circleHand.ts.
import type { KeyboardEvent, ReactNode } from "react";
import { again, CIRCLE_LADDER, fixedOf, MOVES, move, next, onCircle, readings, roundOf, ruleOf, tap, tiles } from "../math/circleHand";
import { BLUE, GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const CX = 330;
const CY = 285;
const RP = 125;
const ASK = "#e8590c";
const FILL = "#e7f5ff";
const TY = CY + RP + 50;
const H = TY + 150;

const px = ([x, y]: [number, number], k = RP): [number, number] => [CX + x * k, CY - y * k];

export function CircleHand({ state, set, w: words, svgRef }: PieceProps<"circleHand">) {
  const w = words.circleHand;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const n = r ? ruleOf(r) : {};
  const read = readings(state);
  const tangents = r?.kind === "tangents";

  const toPoint = (x: number, y: number) => {
    const deg = (Math.atan2(CY - y, x - CX) * 180) / Math.PI;
    set(move(state, deg, Math.hypot(x - CX, y - CY) / RP));
  };
  const { begin, svgProps } = useDrag<{ what: "point" }>((d) => toPoint(d.x, d.y), (d) => toPoint(d.x, d.y));
  const onKey = (e: KeyboardEvent) => {
    const turn = e.key === "ArrowLeft" ? 5 : e.key === "ArrowRight" ? -5 : 0;
    const out = tangents ? (e.key === "ArrowUp" ? 0.25 : e.key === "ArrowDown" ? -0.25 : 0) : e.key === "ArrowUp" ? 5 : e.key === "ArrowDown" ? -5 : 0;
    if (!turn && !out) return;
    e.preventDefault();
    e.stopPropagation();
    set(tangents ? move(state, state.t - turn, state.d + out) : move(state, state.t + turn + out));
  };

  // The words under the tiles: what a wrong tap should look at again, or the right one's rule.
  let say = "";
  if (state.said && t && r) {
    const v = state.said.v;
    const key = r.kind === "semi" ? "Semi" : r.kind === "cyclic" ? "Cyclic" : r.kind === "tangents" ? "Tangents" : r.kind === "centre" ? "Centre" : "Compare";
    if (state.said.ok) say = fill(w[`rule${key}`], n);
    else if (state.seen < MOVES) say = tangents ? w.lookMoveP : w.lookMove;
    else say = fill(v === t.slip ? w[`slip${key}`] : w[`other${key}`], n);
  }
  const lines = wrapWords(say, 78);
  const ask = !r ? w.done : fill(w[`ask${r.kind[0].toUpperCase()}${r.kind.slice(1)}` as "askCompare"], n);
  const askLines = wrapWords(ask, 56);
  const order = t ? [t.right, t.slip, t.other].sort((a, b) => (Number.isNaN(Number(a)) || Number.isNaN(Number(b)) ? 0 : Number(a) - Number(b))) : [];
  const shown = (v: string) => (Number.isNaN(Number(v)) ? w[v as "half"] : `${v}°`);

  const label = (x: number, y: number, s: string, color = INK, anchor: "start" | "middle" | "end" = "middle", bold = false, size = 16) => (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={color} fontWeight={bold ? 700 : 400} pointerEvents="none">{s}</text>
  );
  /** A point's name, just outside the circle (or beside P). */
  const name = (deg: number, s: string, color = INK, rad = 1) => {
    const [x, y] = px(onCircle(deg, rad + 0.16));
    return label(x, y + 6, s, color, "middle", true);
  };
  /** The arc of an angle at a point, between the rays to two others, with its reading. */
  const corner = (p: [number, number], q: [number, number], s: [number, number], text: string, color: string) => {
    const [a, b] = [Math.atan2(q[1] - p[1], q[0] - p[0]), Math.atan2(s[1] - p[1], s[0] - p[0])];
    let d = b - a;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    const rad = 28;
    const [Q, S] = [px([p[0] + (rad / RP) * Math.cos(a), p[1] + (rad / RP) * Math.sin(a)]), px([p[0] + (rad / RP) * Math.cos(b), p[1] + (rad / RP) * Math.sin(b)])];
    const mid = a + d / 2;
    const [lx, ly] = px([p[0] + (58 / RP) * Math.cos(mid), p[1] + (58 / RP) * Math.sin(mid)]);
    return (
      <g pointerEvents="none">
        <path d={`M ${Q[0]} ${Q[1]} A ${rad} ${rad} 0 0 ${d > 0 ? 0 : 1} ${S[0]} ${S[1]}`} fill="none" stroke={color} strokeWidth={2} />
        {label(lx, ly + 6, text, color, "middle", true, 15)}
      </g>
    );
  };
  const seg = (a: [number, number], b: [number, number], color = INK, dash = false, width = 2) => {
    const [[x1, y1], [x2, y2]] = [px(a), px(b)];
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dash ? "6 4" : undefined} pointerEvents="none" />;
  };

  const picture = (live: boolean) => {
    if (!r) return null;
    const f = fixedOf(r);
    const O: [number, number] = [0, 0];
    const moving = tangents ? onCircle(state.t, state.d) : onCircle(state.t);
    const handle = px(moving);
    const body: ReactNode[] = [];
    if (r.kind === "tangents") {
      const phi = (Math.acos(1 / state.d) * 180) / Math.PI;
      const [A, B] = [onCircle(state.t + phi), onCircle(state.t - phi)];
      body.push(seg(moving, A, BLUE), seg(moving, B, BLUE), seg(O, A, MUTED, true), seg(O, B, MUTED, true), seg(O, moving, MUTED, true, 1.4));
      for (const T of [A, B]) {
        const u = [(moving[0] - T[0]) / Math.hypot(moving[0] - T[0], moving[1] - T[1]), (moving[1] - T[1]) / Math.hypot(moving[0] - T[0], moving[1] - T[1])];
        const v = [-T[0], -T[1]];
        const k = 12 / RP;
        const [p1, p2, p3] = [px([T[0] + u[0] * k, T[1] + u[1] * k]), px([T[0] + (u[0] + v[0]) * k, T[1] + (u[1] + v[1]) * k]), px([T[0] + v[0] * k, T[1] + v[1] * k])];
        body.push(<path d={`M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]}`} fill="none" stroke={INK} strokeWidth={1.2} pointerEvents="none" />);
      }
      const mid = (p: [number, number], q: [number, number], side: number) => {
        const [x, y] = px([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
        return [x, y + side] as const;
      };
      body.push(
        name(state.t + phi, "A"), name(state.t - phi, "B"),
        <g data-len="">{label(...mid(moving, A, -10), `PA = ${read.PA}`, BLUE, "middle", true, 15)}{label(...mid(moving, B, 22), `PB = ${read.PB}`, BLUE, "middle", true, 15)}</g>,
      );
    } else if (r.kind === "cyclic") {
      const [A, B, D] = [onCircle(f.A), onCircle(f.B), onCircle(f.D)];
      const pts = [A, B, moving, D].map((p) => px(p)).map((p) => p.join(",")).join(" ");
      body.push(<polygon points={pts} fill={FILL} stroke={BLUE} strokeWidth={2} pointerEvents="none" />);
      body.push(corner(A, B, D, `${read.A}°`, ASK), corner(moving, D, B, `${read.C}°`, GREEN), name(f.A, "A"), name(f.B, "B"), name(f.D, "D"));
    } else {
      const [A, B] = [onCircle(f.A), onCircle(f.B)];
      body.push(seg(moving, A, BLUE), seg(moving, B, BLUE), name(f.A, "A"), name(f.B, "B"));
      if (r.kind === "semi") body.push(seg(A, B, MUTED, false, 1.6));
      else body.push(seg(O, A, MUTED, true), seg(O, B, MUTED, true));
      const hideO = r.kind === "centre";
      body.push(corner(moving, A, B, `${read.C}°`, GREEN));
      if (r.kind !== "semi") body.push(corner(O, A, B, hideO ? "?" : `${read.O}°`, ASK));
    }
    return (
      <>
        <circle cx={CX} cy={CY} r={RP} fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" />
        <circle cx={CX} cy={CY} r={3.5} fill={INK} pointerEvents="none" />
        {label(CX - 12, CY - 8, "O", INK, "end", true)}
        {body.map((b, i) => <g key={i}>{b}</g>)}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? (tangents ? w.pLabel : w.cLabel) : undefined}
          aria-valuenow={live ? state.t : undefined} data-point="" style={live ? { cursor: "grab" } : undefined} onKeyDown={live ? onKey : undefined}
          onPointerDown={live ? (e) => begin(e, { what: "point" }) : undefined}>
          <rect x={20} y={110} width={W - 40} height={2 * RP + 70} fill="transparent" />
          <circle cx={handle[0]} cy={handle[1]} r={10} fill={GREEN} stroke="#fff" strokeWidth={2} pointerEvents="none" />
        </g>
        {tangents ? label(handle[0] + 18, handle[1] + 6, "P", GREEN, "start", true) : name(state.t, "C", GREEN)}
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
        {!done && <text x={20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: CIRCLE_LADDER.length })}</text>}
        {picture(true)}
        {!done && order.map((v, i) => (
          <Pill key={v} x={20 + i * 170} y={TY} w={156} h={40} size={17} text={shown(v)}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say && (
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={20} y={TY + 72 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && <Pill x={W - 150} y={TY} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
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
