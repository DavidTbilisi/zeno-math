// A fair price as a balance (#739). The round's spinner stands at the top right, its equal parts coloured by prize;
// below, each part is a weight on a beam over a price line from 0 to 12, stacked at its prize. A tap on the line (or a
// mark reached with Tab and pressed with Enter) sets the price and puts the fulcrum there; the beam tips to the side
// that wins over many games, and a tally says what the player wins and pays over them. The most likely prize, the
// different prizes' average and the point halfway are named; once level the rule is said, then Next. The rounds and
// sums are in src/math/fairGame.ts.
import { again, distinct, fair, FAIR_LADDER, HI, LO, missOf, next, prizesOf, tally, tap, torque } from "../math/fairGame";
import { GREEN, keyTap, MUTED, Pill, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const U = 44;
const X0 = 90;
const BY = 290;
const LY = 370;
const H = 640;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const X = (v: number) => X0 + (v - LO) * U;
const PRIZE_COLOURS: Record<number, string> = { 0: "#ced4da", 2: "#74c0fc", 4: "#ffd43b", 6: "#ff922b", 8: "#f06595", 12: "#9775fa" };
const colourOf = (v: number) => PRIZE_COLOURS[v] ?? "#69db7c";

/** The spinner: equal parts, each with its prize written in it. */
function Spinner({ xs, cx, cy, rad }: { xs: readonly number[]; cx: number; cy: number; rad: number }) {
  const n = xs.length;
  const pt = (a: number, r: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  return (
    <g pointerEvents="none" data-spinner="">
      {xs.map((x, i) => {
        const [a0, a1] = [(2 * Math.PI * i) / n, (2 * Math.PI * (i + 1)) / n];
        const [p0, p1] = [pt(a0, rad), pt(a1, rad)];
        const [lx, ly] = pt((a0 + a1) / 2, rad * 0.62);
        return (
          <g key={i}>
            <path d={`M${cx} ${cy} L${p0[0]} ${p0[1]} A${rad} ${rad} 0 ${n === 1 ? 1 : 0} 1 ${p1[0]} ${p1[1]} Z`} fill={colourOf(x)} stroke={INK} strokeWidth={1.4} />
            <text x={lx} y={ly + 6} fontSize={17} fontWeight={700} textAnchor="middle" fill={INK}>{x}</text>
          </g>
        );
      })}
      <path d={`M${cx} ${cy - rad - 4} l-7 -12 h14 Z`} fill={INK} />
    </g>
  );
}

export function FairGame({ state, set, w: words, svgRef }: PieceProps<"fairGame">) {
  const w = words.fairGame;
  const xs = prizesOf(state);
  const done = !xs;
  const at = state.at;
  const ok = fair(state);
  const t = xs && at !== null ? tally(xs, at) : null;
  const tilt = xs && at !== null ? Math.max(-14, Math.min(14, (torque(xs, at) / xs.length) * 4)) : 0;

  let say_ = "";
  if (xs && at !== null) say_ = ok ? w[`rule${state.round}` as "rule0"] : fill(w[`miss_${missOf(xs, at)}` as "miss_player"], { p: at, list: distinct(xs).join(", ") });
  const ask = done ? w.done : ok ? w.askDone : w.ask;
  const askLines = wrapWords(ask, 52);
  const sayLines = wrapWords(say_, 76);

  const scene = (live: boolean) => {
    if (!xs) return null;
    const seen = new Map<number, number>();
    const centre = at ?? (LO + HI) / 2;
    return (
      <>
        <Spinner xs={xs} cx={W - 110} cy={110} rad={72} />
        <g transform={`rotate(${tilt} ${X(centre)} ${BY})`} pointerEvents="none" data-tilt={tilt}>
          <rect x={X(LO) - 14} y={BY - 6} width={(HI - LO) * U + 28} height={12} rx={4} fill="#ced4da" stroke={INK} strokeWidth={1.5} />
          {xs.map((x, i) => {
            const k = seen.get(x) ?? 0;
            seen.set(x, k + 1);
            return <rect key={i} x={X(x) - 13} y={BY - 30 - k * 24} width={26} height={22} rx={3} fill={colourOf(x)} stroke={INK} strokeWidth={1.2} data-part={x} />;
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
        <text x={X(LO) - 30} y={LY + 5} fontSize={14} fill={MUTED} textAnchor="end" pointerEvents="none">{w.priceAxis}</text>
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
        {!done && <text x={30} y={36 + askLines.length * 25} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: FAIR_LADDER.length })}</text>}
        {scene(true)}
        {t && at !== null && (
          <g data-tally="">
            <text x={30} y={432} fontSize={16} fill={BLUE}>{fill(w.winSay, { g: t.games, e: 10, win: t.win })}</text>
            <text x={30} y={456} fontSize={16} fill={ASK}>{fill(w.paySay, { g: t.games, p: at, pay: t.pay })}</text>
          </g>
        )}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={492 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 52} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={380} viewBox={`0 20 ${W} 380`} fontFamily={FONT}>
          <rect x={0} y={20} width={W} height={380} fill="#fff" />
          {scene(false)}
        </svg>
      </div>
    </>
  );
}
