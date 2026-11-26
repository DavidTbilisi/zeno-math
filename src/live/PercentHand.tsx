// A percent bar on the board, worked by hand (#707). The bar is a whole amount with 0 % to 100 % along its top; its
// shade is dragged by its edge, or set by pressing the bar, or moved with the arrow keys. Once the shade is at the
// percent asked, the bar shows its equal parts, each with its worth; in the rounds that find the whole or the percent
// the shade says what it holds. Each round is answered on three tiles; a wrong tap is met with something to look at
// again, the right one with its rule, and Next. The rounds and the rules' numbers are in src/math/percentHand.ts.
import type { KeyboardEvent } from "react";
import { again, moveShade, next, PERCENT_LADDER, partsShown, roundOf, ruleOf, shadeHolds, stepOf, tap, tiles, wholeOf } from "../math/percentHand";
import { BLUE, GREEN, MUTED, Pill, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const BX = 60;
const U = 6;
const BY = 150;
const BH = 56;
const ASK = "#e8590c";
const SHADE = "#a5d8ff";
const SHADE_OK = "#b2f2bb";

const bx = (pct: number) => BX + pct * U;

export function PercentHand({ state, set, w: words, svgRef }: PieceProps<"percentHand">) {
  const w = words.percentHand;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const parts = partsShown(state);

  const at = (x: number) => (x - BX) / U;
  const { begin, svgProps } = useDrag<{ what: "shade" }>((d) => set(moveShade(state, at(d.x))), (d) => set(moveShade(state, at(d.x))));
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -5 : e.key === "ArrowRight" ? 5 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveShade(state, state.at + step));
  };

  // The words under the tiles: what a wrong tap should look at again, or the right one's rule.
  let say = "";
  if (state.said && t && r) {
    const n = ruleOf(r);
    if (state.said.ok) say = fill(r.kind === "of" ? w.ruleOf : r.kind === "whole" ? w.ruleWhole : w.ruleWhat, n);
    else if (r.kind === "of") say = state.at !== r.p ? fill(w.lookShade, { p: r.p }) : state.said.v === t.slip ? fill(w.lookSlipOf, { p: r.p }) : w.lookParts;
    else if (r.kind === "whole") say = state.said.v === t.slip ? fill(w.lookSlipWhole, { s: n.s }) : w.lookWhole;
    else say = state.said.v === t.slip ? fill(w.lookSlipWhat, { a: r.part }) : fill(w.lookWhat, { a: r.part });
  }
  const lines = say.length > 80 ? [say.slice(0, say.lastIndexOf(" ", 80)), say.slice(say.lastIndexOf(" ", 80) + 1)] : [say];
  const ask = !r ? w.done : r.kind === "of" ? fill(w.askOf, { p: r.p, a: r.whole }) : r.kind === "whole" ? fill(w.askWhole, { p: r.p, g: r.given }) : fill(w.askWhat, { a: r.part, b: r.whole });
  const tileVals = t ? [t.right, t.slip, t.other].sort((a, b) => a - b) : [];
  const unit = r?.kind === "what" ? "%" : "";
  const TY = 300;
  const H = TY + 150;

  const picture = (live: boolean) => {
    if (!r) return null;
    const step = r.kind === "of" ? stepOf(r.p) : 0;
    const whole = wholeOf(r);
    return (
      <>
        {/* The percent scale along the top. */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i} pointerEvents="none">
            <line x1={bx(i * 10)} y1={BY - 10} x2={bx(i * 10)} y2={BY} stroke={INK} strokeWidth={i % 5 ? 1 : 1.8} />
            <text x={bx(i * 10)} y={BY - 16} fontSize={13} textAnchor="middle" fill={MUTED}>{`${i * 10}%`}</text>
          </g>
        ))}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w.shadeLabel : undefined} aria-valuenow={live ? state.at : undefined}
          aria-valuemin={0} aria-valuemax={100} data-bar="" style={live ? { cursor: "ew-resize" } : undefined} onKeyDown={live ? onKey : undefined}
          onPointerDown={live ? (e) => begin(e, { what: "shade" }) : undefined}>
          <rect x={BX} y={BY} width={100 * U} height={BH} fill="#ffffff" stroke={INK} strokeWidth={2} />
          <rect x={BX} y={BY} width={state.at * U} height={BH} fill={parts ? SHADE_OK : SHADE} stroke="none" pointerEvents="none" />
          {/* Once the shade is at the percent asked, the bar shows its equal parts and what each is worth. */}
          {parts && Array.from({ length: 100 / step }, (_, i) => (
            <g key={i} pointerEvents="none" data-part={i}>
              {i > 0 && <line x1={bx(i * step)} y1={BY} x2={bx(i * step)} y2={BY + BH} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />}
              {step * U >= 26 && <text x={bx((i + 0.5) * step)} y={BY + BH / 2 + 6} fontSize={step * U >= 40 ? 16 : 12} textAnchor="middle" fill={INK}>{(whole * step) / 100}</text>}
            </g>
          ))}
          <rect x={BX} y={BY} width={100 * U} height={BH} fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" />
          {/* The shade's edge, to grab. */}
          <rect x={bx(state.at) - 5} y={BY - 6} width={10} height={BH + 12} rx={3} fill={parts ? GREEN : BLUE} pointerEvents="none" />
        </g>
        <text x={bx(state.at)} y={BY + BH + 24} fontSize={15} fontWeight={700} textAnchor="middle" fill={parts ? GREEN : BLUE} data-shade-pct="">{`${state.at}%`}</text>
        {r.kind !== "of" && state.at > 0 && (
          <text x={bx(state.at)} y={BY + BH + 44} fontSize={15} textAnchor="middle" fill={INK} data-holds="">{fill(w.holds, { v: shadeHolds(r, state.at) })}</text>
        )}
        <text x={bx(100) + 10} y={BY + BH / 2 + 6} fontSize={16} fontWeight={700} fill={INK}>{r.kind === "whole" ? "?" : String(r.whole)}</text>
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps} style={{ touchAction: "none", userSelect: "none" }}>
        <text x={BX - 36} y={36} fontSize={21} fontWeight={700} fill={done ? MUTED : BLUE} data-ask="">{ask}</text>
        {!done && <text x={BX - 36} y={60} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: PERCENT_LADDER.length })}</text>}
        {picture(true)}
        {!done && t && tileVals.map((v, i) => (
          <Pill key={v} x={BX - 36 + i * 130} y={TY} w={116} h={40} size={18} text={`${v}${unit}`}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say && (
          // One group for the sentence, its second line keeping the space it was broken at.
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={BX - 36} y={TY + 72 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && <Pill x={W - 150} y={TY} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={BX - 36} y={TY} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={TY - 60} viewBox={`0 60 ${W} ${TY - 60}`} fontFamily={FONT}>
          <rect x={0} y={60} width={W} height={TY - 60} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
