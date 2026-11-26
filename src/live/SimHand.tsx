// Similar triangles on the board, worked by hand (#714). A right triangle ABC stands on the ground line with a copy
// A′B′C′ beside it; the copy is stretched by dragging its corner, by pressing where its corner should go, or with the
// arrow keys. At the round's stretch every side of the copy shows that it grew by the same number; in the test rounds
// a dashed triangle DEF is there to cover. Each round is answered on its tiles; a wrong tap is met with something to
// look at again, the right one with its rule, and Next. The rounds and the rules' numbers are in src/math/simHand.ts.
import type { KeyboardEvent } from "react";
import { again, angleA, atTarget, fmt, hypOf, K_MAX, next, roundOf, ruleOf, SIM_LADDER, similarOf, stretch, tap, targetOf, tiles } from "../math/simHand";
import { BLUE, GREEN, MUTED, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const OX = 40;
const BY = 420;
const ASK = "#e8590c";
const FILL = "#e7f5ff";
const COPY = "#d3f9d8";
const TY = BY + 86;
const H = TY + 150;

export function SimHand({ state, set, w: words, svgRef }: PieceProps<"simHand">) {
  const w = words.simHand;
  const r = roundOf(state);
  const t = tiles(state);
  const done = !r;
  const there = atTarget(state);
  const n = r ? ruleOf(r) : {};

  // The unit: the copy at its largest still fits beside ABC and under the words.
  const U = r ? Math.min(40, 560 / (5 * r.base), 310 / (K_MAX * r.height)) : 30;
  const AX = r ? OX + r.base * U + 60 : 0;
  const kAt = (x: number) => (r ? (x - AX) / (r.base * U) : 1);
  const { begin, svgProps } = useDrag<{ what: "copy" }>((d) => set(stretch(state, kAt(d.x))), (d) => set(stretch(state, kAt(d.x))));
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    set(stretch(state, state.k + step));
  };

  // The words under the tiles: what a wrong tap should look at again, or the right one's rule.
  let say = "";
  if (state.said && t && r) {
    const v = state.said.v;
    if (state.said.ok) {
      say = fill(r.kind === "side" ? w.ruleSide : r.kind === "angle" ? w.ruleAngle : r.kind === "shadow" ? w.ruleShadow : similarOf(r) ? w.ruleTestYes : w.ruleTestNo, n);
    } else if (!there) {
      say = r.kind === "test" ? w.lookTestFirst : fill(r.kind === "shadow" ? w.lookStretchShadow : w.lookStretch, { t: fmt(targetOf(r) * r.base) });
    } else if (r.kind === "test") say = similarOf(r) ? w.lookTestNo : fill(w.lookTestYes, n);
    else if (r.kind === "angle") say = v === t.slip ? fill(w.lookAngleScaled, n) : w.lookAngleOther;
    else if (v === t.slip) say = fill(r.kind === "shadow" ? w.lookAddedShadow : w.lookAdded, { v, k: n.k });
    else say = r.kind === "shadow" ? fill(w.lookShadowOther, { v, k: n.k }) : fill(w.lookOther, n);
  }
  const lines = wrapWords(say, 78);
  const ask = !r
    ? w.done
    : r.kind === "side" ? fill(w.askSide, n) : r.kind === "angle" ? fill(w.askAngle, { t: fmt(r.k * r.base) }) : r.kind === "test" ? w.askTest : fill(w.askShadow, n);
  const askLines = wrapWords(ask, 64);
  const order = t ? [t.right, t.slip, ...(t.other ? [t.other] : [])].sort((a, b) => (a === "yes" ? -1 : b === "yes" ? 1 : Number(a) - Number(b))) : [];
  const shown = (v: string) => (v === "yes" ? w.yes : v === "no" ? w.no : r?.kind === "angle" ? `${v}°` : v);

  const label = (x: number, y: number, s: string, color = INK, anchor: "start" | "middle" | "end" = "middle", bold = false) => (
    <text x={x} y={y} fontSize={15} textAnchor={anchor} fill={color} fontWeight={bold ? 700 : 400} pointerEvents="none">{s}</text>
  );

  const picture = (live: boolean) => {
    if (!r) return null;
    const unit = r.kind === "shadow" ? " m" : "";
    const [bw, bh] = [r.base * U, r.height * U];
    const [cw, ch] = [state.k * bw, state.k * bh];
    const shadow = r.kind === "shadow";
    // A triangle: the ground side, the upright side (a stick or a tree in the shadow round) and the slope.
    const tri = (x: number, w_: number, h_: number, fillC: string, stroke: string) => (
      <g pointerEvents="none">
        <polygon points={`${x},${BY} ${x + w_},${BY} ${x + w_},${BY - h_}`} fill={shadow ? "none" : fillC} stroke={shadow ? "none" : stroke} strokeWidth={2} />
        {shadow && (
          <>
            <line x1={x} y1={BY} x2={x + w_} y2={BY - h_} stroke={ASK} strokeWidth={2} strokeDasharray="6 4" />
            <line x1={x + w_} y1={BY} x2={x + w_} y2={BY - h_} stroke={GREEN} strokeWidth={4} />
          </>
        )}
        <path d={`M ${x + w_ - 10} ${BY} v -10 h 10`} fill="none" stroke={INK} strokeWidth={1.2} />
      </g>
    );
    const arc = (x: number, text: string, color: string) => {
      const a = (Math.atan2(r.height, r.base) * 180) / Math.PI;
      const rad = 26;
      const [ex, ey] = [x + rad * Math.cos((a * Math.PI) / 180), BY - rad * Math.sin((a * Math.PI) / 180)];
      return (
        <g pointerEvents="none">
          <path d={`M ${x + rad} ${BY} A ${rad} ${rad} 0 0 0 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={2} />
          {label(x + rad + 22, BY - 8, text, color, "start", true)}
        </g>
      );
    };
    const tx = AX + targetOf(r) * bw;
    const hyp = (x: number, w_: number, h_: number) => [x + w_ / 2 - 14, BY - h_ / 2 - 8] as const;
    return (
      <>
        <line x1={20} y1={BY} x2={W - 20} y2={BY} stroke={MUTED} strokeWidth={1.5} pointerEvents="none" />
        {/* ABC, with its sides. */}
        {tri(OX, bw, bh, FILL, BLUE)}
        {label(OX - 8, BY + 18, shadow ? "" : "A", INK, "end")}
        {label(OX + bw + 8, BY + 18, shadow ? "" : "B", INK, "start")}
        {label(OX + bw + 8, BY - bh - 4, shadow ? "" : "C", INK, "start")}
        {label(OX + bw / 2, BY + 20, `${fmt(r.base)}${unit}`)}
        {shadow ? label(OX + bw - 10, BY - bh / 2 + 5, `${fmt(r.height)}${unit}`, GREEN, "end") : label(OX + bw + 10, BY - bh / 2 + 5, fmt(r.height), INK, "start")}
        {!shadow && label(...hyp(OX, bw, bh), fmt(hypOf(r)), INK, "end")}
        {shadow && label(OX + bw, BY - bh - 14, w.stick, MUTED)}
        {r.kind === "angle" && arc(OX, `${angleA(r)}°`, ASK)}

        {/* DEF, dashed, in the test rounds. */}
        {r.kind === "test" && (
          <g pointerEvents="none" data-def="">
            <polygon points={`${AX},${BY} ${AX + r.other[0] * U},${BY} ${AX + r.other[0] * U},${BY - r.other[1] * U}`} fill="none" stroke={ASK} strokeWidth={2} strokeDasharray="7 5" />
            {label(AX + r.other[0] * U + 26, BY + 18, "E", ASK, "start")}
            {label(AX + r.other[0] * U + 26, BY - r.other[1] * U - 4, "F", ASK, "start")}
            {label(AX + r.other[0] * U + 26, BY - (r.other[1] * U) / 2 + 22, `EF = ${fmt(r.other[1])}`, ASK, "start")}
            {label(AX + (r.other[0] * U) / 2, BY + 40, `DE = ${fmt(r.other[0])}`, ASK)}
          </g>
        )}
        {/* The mark A′B′ must reach. */}
        {r.kind !== "test" && (
          <g pointerEvents="none" data-mark="">
            <line x1={tx} y1={BY - 6} x2={tx} y2={BY + 30} stroke={ASK} strokeWidth={2} />
            {label(tx, BY + 46, shadow ? `${w.shadow} ${n.t} m` : `A′B′ = ${fmt(targetOf(r) * r.base)}`, ASK)}
          </g>
        )}

        {/* The copy, stretched by hand. */}
        <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w.copyLabel : undefined} aria-valuenow={live ? state.k : undefined}
          aria-valuemin={0.5} aria-valuemax={K_MAX} data-copy="" style={live ? { cursor: "ew-resize" } : undefined} onKeyDown={live ? onKey : undefined}
          onPointerDown={live ? (e) => begin(e, { what: "copy" }) : undefined}>
          <rect x={AX - 10} y={80} width={W - AX} height={BY - 60} fill="transparent" />
          {tri(AX, cw, ch, there ? COPY : FILL, there ? GREEN : BLUE)}
          <circle cx={AX + cw} cy={BY - ch} r={9} fill={there ? GREEN : BLUE} stroke="#fff" strokeWidth={2} pointerEvents="none" />
        </g>
        {label(AX - 8, BY + 18, shadow ? "" : r.kind === "test" ? "A′ D" : "A′", INK, "end")}
        {label(AX + cw / 2, BY + 20, `${fmt(state.k * r.base)}${unit}${there && r.kind !== "test" ? `  (× ${n.k})` : ""}`, there ? GREEN : BLUE, "middle", true)}
        {r.kind === "test" && label(AX + cw + 12, BY - ch / 2 + 5, fmt(state.k * r.height), there ? GREEN : BLUE, "start", true)}
        {shadow && label(AX + cw, BY - ch - 14, w.tree, MUTED)}
        {r.kind === "angle" && arc(AX, "?", ASK)}
        {/* At the round's stretch each side says it grew by the same number. */}
        {there && r.kind !== "test" && (
          <g data-grew="">
            {shadow
              ? label(AX + cw - 12, BY - ch / 2 + 5, `? = × ${n.k}`, GREEN, "end", true)
              : label(AX + cw + 12, BY - ch / 2 + 5, r.kind === "side" && r.ask === "height" ? `? = × ${n.k}` : `× ${n.k}`, GREEN, "start", true)}
            {!shadow && label(...hyp(AX, cw, ch), r.kind === "side" && r.ask === "hyp" ? `? = × ${n.k}` : `× ${n.k}`, GREEN, "end", true)}
          </g>
        )}
      </>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps} style={{ touchAction: "none", userSelect: "none" }}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={OX - 20} y={34 + i * 26} fontSize={20} fontWeight={700} fill={done ? MUTED : BLUE}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {!done && <text x={OX - 20} y={34 + askLines.length * 26} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: SIM_LADDER.length })}</text>}
        {picture(true)}
        {!done && order.map((v, i) => (
          <Pill key={v} x={OX - 20 + i * 150} y={TY} w={136} h={40} size={18} text={shown(v)}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say && (
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={OX - 20} y={TY + 72 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && <Pill x={W - 150} y={TY} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={OX - 20} y={TY} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={BY - 20} viewBox={`0 60 ${W} ${BY - 20}`} fontFamily={FONT}>
          <rect x={0} y={60} width={W} height={BY - 20} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}
