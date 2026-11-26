// The mean as the balance point (#736). The round's dots sit on a beam over a line from 0 to 10; a tap on the line (or
// a mark reached with Tab and pressed with Enter) puts the balance point there, the beam tips towards the heavier side,
// and the distances on each side are added up beneath it. The middle dot and the point halfway between the ends are
// named when they don't balance; once the beam is level the rule is said, then Next. The rounds are in
// src/math/meanBalance.ts.
import { again, balanced, dotsOf, HI, LO, MEAN_LADDER, missOf, next, pulls, sumSay, tap, torque } from "../math/meanBalance";
import { GREEN, keyTap, MUTED, Pill, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const U = 52;
const X0 = 100;
const BY = 250;
const LY = 330;
const H = 560;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const LEFT = "#e8590c";
const RIGHT = "#1971c2";
const X = (v: number) => X0 + (v - LO) * U;

export function MeanBalance({ state, set, w: words, svgRef }: PieceProps<"meanBalance">) {
  const w = words.meanBalance;
  const vs = dotsOf(state);
  const done = !vs;
  const at = state.at;
  const ok = balanced(state);
  const p = vs && at !== null ? pulls(vs, at) : null;
  const tilt = vs && at !== null ? Math.max(-16, Math.min(16, torque(vs, at) * 3)) : 0;

  let say_ = "";
  if (vs && at !== null && p) {
    if (ok) say_ = w[`rule${state.round}` as "rule0"];
    else say_ = fill(w[`miss_${missOf(vs, at)}` as "miss_left"], { p: at, l: p.l, r: p.r });
  }
  const ask = done ? w.done : ok ? w.askDone : w.ask;
  const askLines = wrapWords(ask, 60);
  const sayLines = wrapWords(say_, 76);

  const scene = (live: boolean) => {
    if (!vs) return null;
    const seen = new Map<number, number>();
    const centre = at ?? (LO + HI) / 2;
    return (
      <>
        <g transform={`rotate(${tilt} ${X(centre)} ${BY})`} pointerEvents="none" data-tilt={tilt}>
          <rect x={X(LO) - 14} y={BY - 6} width={(HI - LO) * U + 28} height={12} rx={4} fill="#ced4da" stroke={INK} strokeWidth={1.5} />
          {vs.map((v, i) => {
            const k = seen.get(v) ?? 0;
            seen.set(v, k + 1);
            const c = at === null || v === at ? "#495057" : v < at ? LEFT : RIGHT;
            return <circle key={i} cx={X(v)} cy={BY - 20 - k * 26} r={12} fill={c} stroke={INK} strokeWidth={1.2} data-dot={v} />;
          })}
        </g>
        {at !== null ? (
          <path d={`M${X(at)} ${BY + 7} L${X(at) - 20} ${BY + 46} L${X(at) + 20} ${BY + 46} Z`} fill={ok ? GREEN : "#868e96"} stroke={INK} strokeWidth={1.5} pointerEvents="none" data-at={at} />
        ) : (
          <>
            <rect x={X(LO) - 16} y={BY + 7} width={14} height={39} fill="#adb5bd" pointerEvents="none" />
            <rect x={X(HI) + 2} y={BY + 7} width={14} height={39} fill="#adb5bd" pointerEvents="none" />
          </>
        )}
        <line x1={X(LO) - 16} y1={BY + 46} x2={X(HI) + 16} y2={BY + 46} stroke={INK} strokeWidth={2} pointerEvents="none" />
        <line x1={X(LO)} y1={LY} x2={X(HI)} y2={LY} stroke={INK} strokeWidth={1.6} pointerEvents="none" />
        {Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => (
          <g key={v} pointerEvents="none">
            <line x1={X(v)} y1={LY - 6} x2={X(v)} y2={LY + 6} stroke={INK} />
            <text x={X(v)} y={LY + 24} fontSize={15} textAnchor="middle" fill={v === at ? (ok ? GREEN : INK) : MUTED} fontWeight={v === at ? 700 : 400}>{v}</text>
          </g>
        ))}
        {live && !ok && Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => {
          const act = () => set(tap(state, v));
          return (
            <rect key={`t${v}`} x={X(v) - U / 2} y={LY - 26} width={U} height={60} fill="transparent" role="button" tabIndex={0}
              aria-label={fill(w.tapLabel, { p: v })} style={{ cursor: "pointer" }} onClick={act} onKeyDown={(e) => keyTap(e, act)} />
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
            <text key={i} x={30} y={36 + i * 25} fontSize={19} fontWeight={700} fill={done ? MUTED : BLUE}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={30} y={36 + askLines.length * 25} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: MEAN_LADDER.length })}</text>}
        {scene(true)}
        {p && (
          <g data-pulls="">
            <text x={30} y={392} fontSize={16} fill={LEFT}>{fill(w.leftSay, { s: sumSay(p.left) })}</text>
            <text x={W - 30} y={392} fontSize={16} fill={RIGHT} textAnchor="end">{fill(w.rightSay, { s: sumSay(p.right) })}</text>
          </g>
        )}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={428 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 56} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={200} viewBox={`0 150 ${W} 200`} fontFamily={FONT}>
          <rect x={0} y={150} width={W} height={200} fill="#fff" />
          {scene(false)}
        </svg>
      </div>
    </>
  );
}
