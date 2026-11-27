// The sum of a series as where its partial sums go (#751). Bars stand for S₁, S₂, … of a geometric series; the
// learner drags a line up or down (or reaches it with Tab and moves it with the arrow keys) to the number the bars
// close in on. A line too low is named by the first bar that passes it, one too high by the bars never reaching it.
// The last rounds show only three bars, the rest as empty outlines. The rounds are in src/math/partialSums.ts.
import type { KeyboardEvent } from "react";
import { again, BARS, done, missOf, moveLine, next, partial, roundOf, seriesText, show2, SUMS_ROUNDS, valueOf, type SumsRound } from "../math/partialSums";
import { GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const H = 720;
const X0 = 100;
const X1 = 660;
const Y0 = 540;
const Y1 = 150;
const ASK = "#e8590c";
const BLUE = "#1971c2";
const SLOT = (X1 - X0) / BARS;

export function PartialSums({ state, set, w: words, svgRef }: PieceProps<"partialSums">) {
  const w = words.partialSums;
  const r = roundOf(state);
  const ok = done(state);
  const Y = (v: number) => (r ? Y0 - (v / r.top) * (Y0 - Y1) : Y0);
  const toV = (py: number) => (r ? ((Y0 - py) / (Y0 - Y1)) * r.top : 0);
  const { begin, svgProps } = useDrag<{ line: true }>((d) => set(moveLine(state, toV(d.y), true)), (d) => set(moveLine(state, toV(d.y), false)));
  const v = r ? valueOf(r, state.at) : 0;
  const onKey = (e: KeyboardEvent) => {
    if (!r) return;
    const step: Record<string, number> = { ArrowDown: -r.step, ArrowLeft: -r.step, ArrowUp: r.step, ArrowRight: r.step };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveLine(state, v + d, true));
  };

  let say = "";
  if (r && state.tried) {
    const miss = missOf(r, state.at);
    say = !miss ? w[`done${state.round}` as "done0"] : miss.kind === "high" ? fill(w.high, { s: show2(partial(r, 30)) }) : fill(w.low, { n: miss.n });
  }
  const askLines = wrapWords(r ? fill(r.shown < BARS ? w.askHidden : w.askShown, { series: seriesText(r) }) : w.done, 62);
  const sayLines = wrapWords(say, 74);

  const chart = (round: SumsRound, live: boolean) => {
    const ticks = Array.from({ length: Math.floor(round.top / (round.top <= 1.5 ? 0.25 : 1)) + 1 }, (_, i) => i * (round.top <= 1.5 ? 0.25 : 1));
    return (
      <>
        {ticks.map((t) => (
          <g key={t} pointerEvents="none">
            <line x1={X0} y1={Y(t)} x2={X1} y2={Y(t)} stroke="#e9ecef" />
            <text x={X0 - 10} y={Y(t) + 5} fontSize={14} textAnchor="end" fill={MUTED}>{show2(t)}</text>
          </g>
        ))}
        <line x1={X0} y1={Y(0)} x2={X1} y2={Y(0)} stroke={INK} strokeWidth={1.4} pointerEvents="none" />
        {Array.from({ length: BARS }, (_, i) => {
          const n = i + 1;
          const s = partial(round, n);
          const x = X0 + i * SLOT + SLOT * 0.2;
          const bw = SLOT * 0.6;
          const label = <text x={x + bw / 2} y={Y0 + 22} fontSize={13} textAnchor="middle" fill={MUTED}>{`S${n}`}</text>;
          if (n > round.shown)
            return (
              <g key={n} pointerEvents="none" data-hidden="">
                <rect x={x} y={Y1 + 20} width={bw} height={Y0 - Y1 - 20} fill="none" stroke="#ced4da" strokeDasharray="5 4" rx={3} />
                <text x={x + bw / 2} y={(Y0 + Y1) / 2 + 6} fontSize={16} textAnchor="middle" fill={MUTED}>?</text>
                {label}
              </g>
            );
          return (
            <g key={n} pointerEvents="none" data-bar={show2(s)}>
              <rect x={x} y={Math.min(Y(s), Y(0))} width={bw} height={Math.abs(Y(0) - Y(s))} fill="#a5d8ff" stroke={BLUE} strokeWidth={1.2} rx={2} />
              {label}
            </g>
          );
        })}
        <line x1={X0} y1={Y(v)} x2={X1} y2={Y(v)} stroke={ok ? GREEN : ASK} strokeWidth={3} pointerEvents="none" data-line={show2(v)} />
        <text x={X1 + 8} y={Y(v) + 6} fontSize={17} fontWeight={700} fill={ok ? GREEN : ASK} pointerEvents="none">{show2(v)}</text>
        {live && !ok && <rect x={X0} y={Y1 - 10} width={X1 - X0} height={Y0 - Y1 + 20} fill="transparent" style={{ cursor: "ns-resize" }} onPointerDown={(e) => begin(e, { line: true })} />}
        {live && !ok && (
          <g role="slider" tabIndex={0} aria-label={fill(w.lineLabel, { v: show2(v) })} aria-valuenow={v} aria-valuemin={0} aria-valuemax={round.top}
            onKeyDown={onKey} onPointerDown={(e) => begin(e, { line: true })} style={{ cursor: "ns-resize" }} data-handle="">
            <rect x={X0} y={Y(v) - 14} width={X1 - X0} height={28} fill="transparent" />
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
        {r && <text x={W - 30} y={Y1 - 24} fontSize={14} textAnchor="end" fill={MUTED}>{fill(w.round, { k: state.round + 1, n: SUMS_ROUNDS.length })}</text>}
        {r && chart(r, true)}
        {say && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={Y0 + 62 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 50} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {!r && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={Y0 - Y1 + 80} viewBox={`0 ${Y1 - 30} ${W} ${Y0 - Y1 + 80}`} fontFamily={FONT}>
          <rect x={0} y={Y1 - 30} width={W} height={Y0 - Y1 + 80} fill="#fff" />
          {r && chart(r, false)}
        </svg>
      </div>
    </>
  );
}
