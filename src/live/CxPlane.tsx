// The complex plane, found by tapping points (#732). Each round asks for a point: 3 + 2i, z + w, i·z, the conjugate.
// A point of the plane is tapped (or reached with Tab and pressed with Enter) to answer; a wrong one is said back as
// a number with what it got wrong, the right one draws what it shows (the parts across and up, the arrows end to end,
// the quarter turn, the mirror in the real axis), then the rule is said, and Next. The rounds are in
// src/math/cxPlane.ts.
import { again, CX_LADDER, cxSay, HI, LO, missOf, next, type Pt, roundOf, tap, target } from "../math/cxPlane";
import { GREEN, keyTap, MUTED, Pill, RED, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const U = 34;
const OX = 40 + (0 - LO) * U;
const OY = 100 + HI * U;
const PH = (HI - LO) * U;
const TX = 450;
const H = 100 + PH + 70;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const X = (a: number) => OX + a * U;
const Y = (b: number) => OY - b * U;

/** An arrow from 0 (or from a point) to a point. */
function Arrow({ from = [0, 0], to, color, dash }: { from?: Pt; to: Pt; color: string; dash?: boolean }) {
  const [x1, y1, x2, y2] = [X(from[0]), Y(from[1]), X(to[0]), Y(to[1])];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  const head = `M${x2} ${y2} L${x2 - 11 * ux - 5 * uy} ${y2 - 11 * uy + 5 * ux} L${x2 - 11 * ux + 5 * uy} ${y2 - 11 * uy - 5 * ux} Z`;
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2 - 8 * ux} y2={y2 - 8 * uy} stroke={color} strokeWidth={3} strokeDasharray={dash ? "6 5" : undefined} />
      <path d={head} fill={color} />
    </g>
  );
}

export function CxPlane({ state, set, w: words, svgRef }: PieceProps<"cxPlane">) {
  const w = words.cxPlane;
  const r = roundOf(state);
  const done = !r;
  const goal = r && target(r);
  const tp = state.tapped;
  const z = r ? cxSay(r.z) : "";
  const zw = r?.w ? cxSay(r.w) : "";

  let say_ = "";
  if (r && tp) {
    const miss = missOf(r, tp);
    if (state.ok) say_ = w[`rule${state.round}` as "rule0"];
    else say_ = fill(w[`miss_${miss}` as "miss_other"], { p: cxSay(tp), z });
  }
  const ask = done ? w.done : fill(w[`ask${state.round}` as "ask0"], { z, w: zw });
  const askLines = wrapWords(ask, 32);
  const sayLines = wrapWords(say_, 34);

  const plane = (live: boolean) => {
    if (!r || !goal) return null;
    const shown = state.ok;
    return (
      <>
        {Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => (
          <g key={`g${v}`} pointerEvents="none">
            <line x1={X(v)} y1={Y(HI)} x2={X(v)} y2={Y(LO)} stroke={v ? "#e9ecef" : INK} strokeWidth={v ? 1 : 2} />
            <line x1={X(LO)} y1={Y(v)} x2={X(HI)} y2={Y(v)} stroke={v ? "#e9ecef" : INK} strokeWidth={v ? 1 : 2} />
            {v !== 0 && <text x={X(v)} y={OY + 16} fontSize={11} textAnchor="middle" fill={MUTED}>{String(v).replace("-", "−")}</text>}
            {v !== 0 && <text x={OX - 6} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{`${String(v).replace("-", "−")}i`}</text>}
          </g>
        ))}
        <text x={X(HI) + 6} y={OY + 4} fontSize={13} fill={INK} pointerEvents="none">{w.reAxis}</text>
        <text x={OX} y={Y(HI) - 10} fontSize={13} textAnchor="middle" fill={INK} pointerEvents="none">{w.imAxis}</text>
        {r.kind !== "plot" && <Arrow to={r.z} color={BLUE} />}
        {r.kind !== "plot" && <text x={X(r.z[0]) + 8} y={Y(r.z[1]) - 8} fontSize={15} fontWeight={700} fill={BLUE} pointerEvents="none">z</text>}
        {r.kind === "add" && r.w && <Arrow to={r.w} color="#9c36b5" />}
        {r.kind === "add" && r.w && <text x={X(r.w[0]) + 8} y={Y(r.w[1]) - 8} fontSize={15} fontWeight={700} fill="#9c36b5" pointerEvents="none">w</text>}
        {shown && (
          <g data-shown="">
            {r.kind === "plot" && (
              <>
                <Arrow to={[goal[0], 0]} color={GREEN} />
                <Arrow from={[goal[0], 0]} to={goal} color={GREEN} />
              </>
            )}
            {r.kind === "add" && r.w && (
              <>
                <Arrow from={r.z} to={goal} color="#9c36b5" dash />
                <Arrow from={r.w} to={goal} color={BLUE} dash />
                <Arrow to={goal} color={GREEN} />
              </>
            )}
            {r.kind === "times" && (
              <>
                <Arrow to={goal} color={GREEN} />
                <path d={`M${X(r.z[0] * 0.35)} ${Y(r.z[1] * 0.35)} L${X(r.z[0] * 0.35 + goal[0] * 0.35)} ${Y(r.z[1] * 0.35 + goal[1] * 0.35)} L${X(goal[0] * 0.35)} ${Y(goal[1] * 0.35)}`} fill="none" stroke={GREEN} strokeWidth={2} pointerEvents="none" />
              </>
            )}
            {r.kind === "conj" && (
              <>
                <line x1={X(goal[0])} y1={Y(r.z[1])} x2={X(goal[0])} y2={Y(goal[1])} stroke={GREEN} strokeWidth={2} strokeDasharray="5 4" pointerEvents="none" />
                <Arrow to={goal} color={GREEN} />
              </>
            )}
          </g>
        )}
        {tp && <circle cx={X(tp[0])} cy={Y(tp[1])} r={9} fill={state.ok ? GREEN : RED} stroke={INK} strokeWidth={1.5} pointerEvents="none" data-tapped={cxSay(tp)} data-ok={state.ok ? "yes" : "no"} />}
        {live && !state.ok && Array.from({ length: (HI - LO + 1) ** 2 }, (_, k) => {
          const p: Pt = [LO + (k % (HI - LO + 1)), HI - Math.floor(k / (HI - LO + 1))];
          const act = () => set(tap(state, p));
          return (
            <rect key={k} x={X(p[0]) - U / 2} y={Y(p[1]) - U / 2} width={U} height={U} fill="transparent" role="button" tabIndex={0}
              aria-label={fill(w.tapLabel, { p: cxSay(p) })} style={{ cursor: "pointer" }} onClick={act} onKeyDown={(e) => keyTap(e, act)} />
          );
        })}
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={TX} y={40 + i * 26} fontSize={19} fontWeight={700} fill={done ? MUTED : BLUE}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={TX} y={40 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: CX_LADDER.length })}</text>}
        {plane(true)}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={TX} y={200 + i * 24} fontSize={16} fontWeight={state.ok ? 700 : 400} fill={state.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {!done && !tp && <text x={TX} y={200} fontSize={16} fill={INK}>{w.readNone}</text>}
        {state.ok && <Pill x={W - 140} y={H - 60} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={TX} y={140} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={PH + 80} height={PH + 60} viewBox={`0 60 ${PH + 80} ${PH + 60}`} fontFamily={FONT}>
          <rect x={0} y={60} width={PH + 80} height={PH + 60} fill="#fff" />
          {plane(false)}
        </svg>
      </div>
    </>
  );
}
