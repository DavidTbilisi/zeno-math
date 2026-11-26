// Inequalities on a number line, found by testing points (#723). A number on the line is tapped (or reached with Tab
// and pressed with Enter) to put it into the round's inequality: it turns green where the inequality holds and red
// where it does not, and the working is written under the line. The set is answered on its tiles once points on
// both sides and the point where it changes have been tested; a wrong tap is met with what to look at again, the
// right one with the rule, the set drawn on the line, and Next. The rounds are in src/math/ineqFind.ts.
import { again, HI, holds, INEQ_LADDER, lhs, lhsAt, LO, missOf, next, ORDER, ready, REL_SAY, roundOf, say, solution, tap, test, tiles } from "../math/ineqFind";
import { GREEN, keyTap, MUTED, Pill, RED, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const X0 = 60;
const U = 50;
const ASK = "#e8590c";
const EQ_Y = 120;
const LY = 240;
const RY = 320;
const TY = 370;
const H = TY + 170;
const X = (v: number) => X0 + (v - LO) * U;

export function IneqFind({ state, set, w: words, svgRef }: PieceProps<"ineqFind">) {
  const w = words.ineqFind;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const sol = r && solution(r);

  let say_ = "";
  if (state.said && r && sol) {
    const v = state.said.v;
    const miss = missOf(state, v);
    if (state.said.ok) say_ = w[`rule${state.round}` as "rule0"];
    else if (!ready(state)) say_ = w.lookTest;
    else if (miss === "end") say_ = fill(holds(r, sol.t) ? w.missEndIn : w.missEndOut, { t: say(sol.t) });
    else if (miss === "side") say_ = w[sol.rel[0] === "<" ? "missSideLeft" : "missSideRight"];
    else say_ = fill(w.missBoth, { t: say(sol.t) });
  }
  const lines = wrapWords(say_, 58);
  const askLines = wrapWords(done ? w.done : w.ask, 60);

  const last = state.tested[state.tested.length - 1];
  const read = r && last !== undefined
    ? fill(holds(r, last) ? w.readTrue : w.readFalse, { x: say(last), s: lhsAt(r, last), v: say(r.a * last + r.b), r: REL_SAY[r.rel], c: say(r.c) })
    : w.readNone;

  const line = (live: boolean) => {
    if (!r || !sol) return null;
    const shown = state.said?.ok;
    const toRight = sol.rel[0] === ">";
    const end = X(sol.t);
    return (
      <>
        <text x={W / 2} y={EQ_Y} fontSize={34} fontWeight={700} textAnchor="middle" fill={INK} data-eq="">{`${lhs(r)} ${REL_SAY[r.rel]} ${say(r.c)}`}</text>
        {shown && (
          <g data-set="" pointerEvents="none">
            <line x1={end} y1={LY} x2={toRight ? X(HI) + 22 : X(LO) - 22} y2={LY} stroke={GREEN} strokeWidth={9} strokeOpacity={0.45} />
            <path d={toRight ? `M${X(HI) + 30} ${LY} l-12 -9 v18 z` : `M${X(LO) - 30} ${LY} l12 -9 v18 z`} fill={GREEN} />
            <circle cx={end} cy={LY} r={8} fill={sol.rel.length === 2 ? GREEN : "#fff"} stroke={GREEN} strokeWidth={3} />
          </g>
        )}
        <line x1={X(LO) - 20} y1={LY} x2={X(HI) + 20} y2={LY} stroke={INK} strokeWidth={2} pointerEvents="none" />
        {Array.from({ length: HI - LO + 1 }, (_, i) => {
          const v = LO + i;
          const tried = state.tested.includes(v);
          const ok = tried && holds(r, v);
          const act = () => set(test(state, v));
          return (
            <g key={v} role={live ? "button" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? fill(w.testLabel, { x: say(v) }) : undefined}
              style={live ? { cursor: "pointer" } : undefined} onClick={live ? act : undefined} onKeyDown={live ? (e) => keyTap(e, act) : undefined}>
              {live && <rect x={X(v) - U / 2} y={LY - 58} width={U} height={92} fill="transparent" />}
              <line x1={X(v)} y1={LY - 7} x2={X(v)} y2={LY + 7} stroke={INK} pointerEvents="none" />
              <text x={X(v)} y={LY + 28} fontSize={16} textAnchor="middle" fill={v === 0 ? INK : MUTED} fontWeight={v === 0 ? 700 : 400} pointerEvents="none">{say(v)}</text>
              {tried && (
                <g pointerEvents="none" data-tested={v} data-holds={ok ? "yes" : "no"}>
                  <circle cx={X(v)} cy={LY - 34} r={13} fill={ok ? GREEN : RED} stroke={v === last ? INK : "none"} strokeWidth={2} />
                  <text x={X(v)} y={LY - 29} fontSize={15} fontWeight={700} textAnchor="middle" fill="#fff">{ok ? "✓" : "✗"}</text>
                </g>
              )}
            </g>
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
            <text key={i} x={20} y={34 + i * 26} fontSize={20} fontWeight={700} fill={done ? MUTED : "#1971c2"}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: INEQ_LADDER.length })}</text>}
        {line(true)}
        {!done && (
          <g data-read="">
            {wrapWords(read, 66).map((l, i) => <text key={i} x={20} y={RY + i * 24} fontSize={18} fill={INK} pointerEvents="none">{i ? ` ${l}` : l}</text>)}
          </g>
        )}
        {!done && sol && ORDER.map((v, i) => (
          <Pill key={v} x={20 + i * 172} y={TY} w={160} h={42} size={19} text={`x ${REL_SAY[v]} ${say(sol.t)}`}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say_ && (
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={20} y={TY + 76 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && t && <Pill x={W - 140} y={TY + 112} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={20} y={TY} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={LY + 50 - EQ_Y + 50} viewBox={`0 ${EQ_Y - 50} ${W} ${LY + 50 - EQ_Y + 50}`} fontFamily={FONT}>
          <rect x={0} y={EQ_Y - 50} width={W} height={LY + 50 - EQ_Y + 50} fill="#fff" />
          {line(false)}
        </svg>
      </div>
    </>
  );
}
