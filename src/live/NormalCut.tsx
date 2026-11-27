// The empirical rule found by cutting a normal curve (#740). The round's normal model is drawn over its axis, marked
// at every standard deviation in the setting's units; the learner drags a cut (anywhere on the curve, or the cut
// reached with Tab and moved with the arrow keys) and the share between the pair of cuts, or beyond the one cut, is
// shaded and given as a percent. A share too small or too large, or a tail on the wrong side, is named; once right
// the share is said in standard deviations, then Next. The rounds and sums are in src/math/normalCut.ts.
import type { KeyboardEvent } from "react";
import { again, CUT_ROUNDS, done, FAR, missOf, moveCut, next, roundOf, share, shareSay, STEP, valueAt, type CutRound } from "../math/normalCut";
import { GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const H = 640;
const XC = 360;
const U = 84;
const BY = 420;
const PEAK = 230;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const SHADE = "#a5d8ff";
const X = (z: number) => XC + z * U;
const Y = (z: number) => BY - (PEAK * Math.exp((-z * z) / 2));
const toZ = (x: number) => (x - XC) / U;

/** The curve from a to b (in standard deviations) as path points. */
const along = (a: number, b: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const z = a + ((b - a) * i) / 80;
    pts.push(`${X(z).toFixed(1)} ${Y(z).toFixed(1)}`);
  }
  return pts;
};
const area = (a: number, b: number) => `M${X(a)} ${BY} L${along(a, b).join(" L")} L${X(b)} ${BY} Z`;

/** Where the shading runs for the cut at k. */
const shaded = (r: CutRound, k: number): [number, number] => (r.mode === "both" ? [-k, k] : r.mode === "above" ? [k, FAR + 0.5] : [-FAR - 0.5, k]);

export function NormalCut({ state, set, w: words, svgRef }: PieceProps<"normalCut">) {
  const w = words.normalCut;
  const r = roundOf(state);
  const ok = done(state);
  const { k } = state;
  const { begin, svgProps } = useDrag<{ cut: true }>((d) => set(moveCut(state, toZ(d.x), true)), (d) => set(moveCut(state, toZ(d.x), false)));
  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveCut(state, k + d, true));
  };

  const p = r ? share(r.mode, k) : 0;
  const shareLine = !r ? "" : fill(w[`${r.mode === "both" ? "between" : r.mode}Say` as "betweenSay"], { p: shareSay(p), a: valueAt(r, r.mode === "both" ? -k : k), b: valueAt(r, k) });
  let say_ = "";
  if (r && state.tried) say_ = ok ? w[`done${state.round}` as "done0"] : fill(w[`miss_${missOf(r, k)}` as "miss_few"], { p: shareSay(p) });
  const askLines = wrapWords(r ? w[`ask${state.round}` as "ask0"] : w.done, 62);
  const sayLines = wrapWords(say_, 74);

  const curve = (live: boolean) => {
    if (!r) return null;
    const [a, b] = shaded(r, k);
    const cuts = r.mode === "both" ? [-k, k] : [k];
    return (
      <>
        <path d={area(Math.max(a, -FAR - 0.5), Math.min(b, FAR + 0.5))} fill={ok ? "#b2f2bb" : SHADE} pointerEvents="none" data-share={shareSay(p)} />
        <path d={`M${along(-FAR - 0.5, FAR + 0.5).join(" L")}`} fill="none" stroke={BLUE} strokeWidth={2.6} pointerEvents="none" />
        <line x1={X(-FAR - 0.5)} y1={BY} x2={X(FAR + 0.5)} y2={BY} stroke={INK} strokeWidth={1.6} pointerEvents="none" />
        {[-3, -2, -1, 0, 1, 2, 3].map((j) => (
          <g key={j} pointerEvents="none">
            <line x1={X(j)} y1={BY} x2={X(j)} y2={BY + 7} stroke={INK} />
            <text x={X(j)} y={BY + 25} fontSize={15} textAnchor="middle" fill={j === 0 ? INK : MUTED} fontWeight={j === 0 ? 700 : 400}>{valueAt(r, j)}</text>
          </g>
        ))}
        <text x={X(FAR + 0.5)} y={BY + 48} fontSize={14} textAnchor="end" fill={MUTED} pointerEvents="none">{w[`axis${r.setting}` as "axis0"]}</text>
        {live && !ok && <rect x={X(-FAR - 0.5)} y={BY - PEAK - 30} width={(2 * FAR + 1) * U} height={PEAK + 60} fill="transparent" style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, { cut: true })} />}
        {cuts.map((c, i) => (
          <g key={i} data-cut={c} pointerEvents="none">
            <line x1={X(c)} y1={BY + 4} x2={X(c)} y2={BY - PEAK - 22} stroke={ok ? GREEN : ASK} strokeWidth={2.4} />
            <circle cx={X(c)} cy={BY - PEAK - 22} r={11} fill={ok ? GREEN : ASK} stroke={INK} strokeWidth={1.2} />
          </g>
        ))}
        {live && !ok && (
          <g role="slider" tabIndex={0} aria-label={fill(w.cutLabel, { v: valueAt(r, k) })} aria-valuenow={k} aria-valuemin={r.mode === "both" ? STEP : -FAR} aria-valuemax={FAR}
            onKeyDown={onKey} onPointerDown={(e) => begin(e, { cut: true })} style={{ cursor: "ew-resize" }} data-handle="">
            <rect x={X(k) - 16} y={BY - PEAK - 36} width={32} height={PEAK + 40} fill="transparent" />
          </g>
        )}
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none", touchAction: "none" }} {...svgProps}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={30} y={36 + i * 25} fontSize={19} fontWeight={700} fill={r ? BLUE : MUTED}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {r && <text x={30} y={36 + askLines.length * 25} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: CUT_ROUNDS.length })}</text>}
        {curve(true)}
        {r && <text x={XC} y={BY + 80} fontSize={19} fontWeight={700} textAnchor="middle" fill={ok ? GREEN : BLUE} data-reading="">{shareLine}</text>}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={BY + 114 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 50} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {!r && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={330} viewBox={`0 150 ${W} 330`} fontFamily={FONT}>
          <rect x={0} y={150} width={W} height={330} fill="#fff" />
          {curve(false)}
          {r && <text x={XC} y={BY + 50} fontSize={17} fontWeight={700} textAnchor="middle" fill={BLUE}>{shareLine}</text>}
        </svg>
      </div>
    </>
  );
}
