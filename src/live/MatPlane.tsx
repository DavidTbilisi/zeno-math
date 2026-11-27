// A matrix acting on the plane, found by tapping points (#734). The round's matrix M is written beside the plane
// with M(x, y) = (ax + by, cx + dy); the learner taps where M sends (1, 0), then (0, 1) (a point can be reached with
// Tab and pressed with Enter). A wrong tap is said back with what it is; once both are found the unit square's image
// is drawn, M's columns turn the colours of the two images, and the rule is said, then Next. The rounds are in
// src/math/matPlane.ts.
import { again, apply, column, det, HI, LO, MAT_LADDER, mapSay, matOf, missOf, next, type Pt, say, sayPt, tap, UNITS } from "../math/matPlane";
import { GREEN, keyTap, MUTED, Pill, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const U = 40;
const OX = 40 + (0 - LO) * U;
const OY = 90 + HI * U;
const PH = (HI - LO) * U;
const TX = 420;
const H = 90 + PH + 190;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const C1 = GREEN;
const C2 = "#e8590c";
const X = (a: number) => OX + a * U;
const Y = (b: number) => OY - b * U;

const quad = (a: Pt, b: Pt) => `${X(0)},${Y(0)} ${X(a[0])},${Y(a[1])} ${X(a[0] + b[0])},${Y(a[1] + b[1])} ${X(b[0])},${Y(b[1])}`;

export function MatPlane({ state, set, w: words, svgRef }: PieceProps<"matPlane">) {
  const w = words.matPlane;
  const m = matOf(state);
  const done = !m;
  const k = Math.min(state.found, 1) as 0 | 1;
  const solved = state.found >= 2;

  let say_ = "";
  let good = false;
  if (m && solved) [say_, good] = [w[`rule${state.round}` as "rule0"], true];
  else if (m && state.miss) {
    const miss = missOf(m, k, state.miss);
    say_ = fill(w[`miss_${miss}` as "miss_other"], { p: sayPt(state.miss), u: sayPt(UNITS[k]), k: k + 1 });
  } else if (m && state.found === 1) [say_, good] = [fill(w.found1, { p: sayPt(column(m, 0)) }), true];
  const ask = done ? w.done : solved ? w.askDone : fill(w.ask, { u: sayPt(UNITS[k]) });
  const askLines = wrapWords(ask, 30);
  const sayLines = wrapWords(say_, 34);

  const plane = (live: boolean) => {
    if (!m) return null;
    const e1 = column(m, 0);
    const e2 = column(m, 1);
    return (
      <>
        {Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => (
          <g key={`g${v}`} pointerEvents="none">
            <line x1={X(v)} y1={Y(HI)} x2={X(v)} y2={Y(LO)} stroke={v ? "#e9ecef" : INK} strokeWidth={v ? 1 : 2} />
            <line x1={X(LO)} y1={Y(v)} x2={X(HI)} y2={Y(v)} stroke={v ? "#e9ecef" : INK} strokeWidth={v ? 1 : 2} />
            {v !== 0 && <text x={X(v)} y={OY + 16} fontSize={11} textAnchor="middle" fill={MUTED}>{say(v)}</text>}
            {v !== 0 && <text x={OX - 6} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{say(v)}</text>}
          </g>
        ))}
        <polygon points={quad(UNITS[0], UNITS[1])} fill="#868e96" fillOpacity={0.18} stroke="#868e96" strokeDasharray="5 4" pointerEvents="none" />
        {solved && (
          <g data-image="" pointerEvents="none">
            <polygon points={quad(e1, e2)} fill={BLUE} fillOpacity={0.15} stroke={BLUE} strokeWidth={2} />
            <text x={X((e1[0] + e2[0]) / 2) + 6} y={Y((e1[1] + e2[1]) / 2) + 5} fontSize={14} fontWeight={700} fill={BLUE}>{fill(w.areaSay, { a: Math.abs(det(m)) })}</text>
          </g>
        )}
        {[UNITS[0], UNITS[1]].map((u, i) => (
          <circle key={`u${i}`} cx={X(u[0])} cy={Y(u[1])} r={5} fill="#fff" stroke={i ? C2 : C1} strokeWidth={2.5} pointerEvents="none" />
        ))}
        {state.found >= 1 && <line x1={X(0)} y1={Y(0)} x2={X(e1[0])} y2={Y(e1[1])} stroke={C1} strokeWidth={3.5} pointerEvents="none" />}
        {state.found >= 1 && <circle cx={X(e1[0])} cy={Y(e1[1])} r={8} fill={C1} pointerEvents="none" data-found="1" />}
        {solved && <line x1={X(0)} y1={Y(0)} x2={X(e2[0])} y2={Y(e2[1])} stroke={C2} strokeWidth={3.5} pointerEvents="none" />}
        {solved && <circle cx={X(e2[0])} cy={Y(e2[1])} r={8} fill={C2} pointerEvents="none" data-found="2" />}
        {state.miss && <circle cx={X(state.miss[0])} cy={Y(state.miss[1])} r={8} fill="#fa5252" stroke={INK} strokeWidth={1.5} pointerEvents="none" data-miss={sayPt(state.miss)} />}
        {live && !solved && Array.from({ length: (HI - LO + 1) ** 2 }, (_, i) => {
          const p: Pt = [LO + (i % (HI - LO + 1)), HI - Math.floor(i / (HI - LO + 1))];
          const act = () => set(tap(state, p));
          return (
            <rect key={i} x={X(p[0]) - U / 2} y={Y(p[1]) - U / 2} width={U} height={U} fill="transparent" role="button" tabIndex={0}
              aria-label={fill(w.tapLabel, { p: sayPt(p) })} style={{ cursor: "pointer" }} onClick={act} onKeyDown={(e) => keyTap(e, act)} />
          );
        })}
      </>
    );
  };

  /** M with big brackets; once solved, its columns in the colours of the two images. */
  const matrix = () => {
    if (!m) return null;
    const [x0, y0, cw, rh] = [TX + 18, 150, 44, 32];
    const col = (j: number) => (solved ? (j ? C2 : C1) : INK);
    return (
      <g data-matrix="">
        <text x={TX} y={y0 + rh - 4} fontSize={22} fontWeight={700} fill={INK}>M =</text>
        <path d={`M${x0 + 48} ${y0 - 6} h-6 v${2 * rh + 8} h6`} fill="none" stroke={INK} strokeWidth={2} />
        <path d={`M${x0 + 48 + 2 * cw + 8} ${y0 - 6} h6 v${2 * rh + 8} h-6`} fill="none" stroke={INK} strokeWidth={2} />
        {m.map((row, i) => row.map((v, j) => (
          <text key={`${i}${j}`} x={x0 + 50 + cw / 2 + j * cw} y={y0 + 20 + i * rh} fontSize={22} fontWeight={700} textAnchor="middle" fill={col(j)}>{say(v)}</text>
        )))}
        <text x={TX} y={y0 + 2 * rh + 36} fontSize={16} fill={INK}>{mapSay(m)}</text>
        {state.found >= 1 && <text x={TX} y={y0 + 2 * rh + 62} fontSize={16} fill={C1}>{`M(1, 0) = ${sayPt(apply(m, UNITS[0]))}`}</text>}
        {solved && <text x={TX} y={y0 + 2 * rh + 86} fontSize={16} fill={C2}>{`M(0, 1) = ${sayPt(apply(m, UNITS[1]))}`}</text>}
      </g>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={TX} y={40 + i * 25} fontSize={19} fontWeight={700} fill={done ? MUTED : BLUE}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={TX} y={40 + askLines.length * 25} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: MAT_LADDER.length })}</text>}
        {matrix()}
        {plane(true)}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={TX} y={350 + i * 23} fontSize={16} fontWeight={good ? 700 : 400} fill={good ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {solved && <Pill x={W - 140} y={H - 62} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={TX} y={140} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={PH + 80} height={PH + 50} viewBox={`0 60 ${PH + 80} ${PH + 50}`} fontFamily={FONT}>
          <rect x={0} y={60} width={PH + 80} height={PH + 50} fill="#fff" />
          {plane(false)}
        </svg>
      </div>
    </>
  );
}
