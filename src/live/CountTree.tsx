// The counting principle as a tree of outfits (#738). Build rounds: shirts stand in a column; a tap on a shirt (or a
// node reached with Tab and pressed with Enter) grows a branch to every pair of trousers, a tap on those to every hat,
// and each finished outfit is drawn at the end of its branch and counted. Predict rounds: the choices are shown in rows
// and the learner taps a count; adding the choices or leaving a stage out is named. The rule (multiply) is said only
// after a right prediction. The rounds and sums are in src/math/countTree.ts.
import { again, done, made, missOf, next, openAt, pathsTo, pickCount, roundOf, shown, slot, total, COUNT_ROUNDS } from "../math/countTree";
import { GREEN, keyTap, MUTED, Pill, wrapWords } from "./hand";
import type { ReactElement } from "react";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const H = 640;
const BLUE = "#1971c2";
const ASK = "#e8590c";
const TOP = 96;
const GAP = 42;
const COLX = [60, 190, 320, 450];
/** Shirts, trousers and hats, each choice its own colour. */
const COLOURS = [
  ["#e03131", "#1971c2", "#2f9e44", "#f08c00"],
  ["#343a40", "#8d6e63", "#74c0fc"],
  ["#7048e8", "#f76707", "#0ca678", "#e64980"],
];
const SHAPES = [
  "M-12 -8 L-6 -12 L6 -12 L12 -8 L9 -2 L6 -4 L6 12 L-6 12 L-6 -4 L-9 -2 Z",
  "M-8 -12 L8 -12 L9 12 L2 12 L0 -2 L-2 12 L-9 12 Z",
  "M-12 6 L12 6 L12 3 L7 3 L5 -9 L-5 -9 L-7 3 L-12 3 Z",
];

const Item = ({ stage, k, x, y, scale = 1 }: { stage: number; k: number; x: number; y: number; scale?: number }) => (
  <path d={SHAPES[stage]} transform={`translate(${x} ${y}) scale(${scale})`} fill={COLOURS[stage][k % COLOURS[stage].length]} stroke={INK} strokeWidth={1.2 / scale} />
);

/** An outfit: a hat on top, the shirt, the trousers below. */
const Outfit = ({ p, x, y }: { p: readonly number[]; x: number; y: number }) => (
  <g pointerEvents="none" data-outfit={p.join(".")}>
    {p[2] !== undefined && <Item stage={2} k={p[2]} x={x} y={y - 15} scale={0.55} />}
    <Item stage={0} k={p[0]} x={x} y={y - 3} scale={0.6} />
    <Item stage={1} k={p[1]} x={x} y={y + 12} scale={0.6} />
  </g>
);

export function CountTree({ state, set, w: words, svgRef }: PieceProps<"countTree">) {
  const w = words.countTree;
  const r = roundOf(state);
  const ok = done(state);
  const names = [w.shirt, w.trousers, w.hat];
  const label = (p: readonly number[]) => p.map((k, i) => `${names[i]} ${k + 1}`).join(", ");

  let say_ = "";
  if (r && r.mode === "build" && ok) say_ = w[`done${state.round}` as "done0"];
  if (r && r.mode === "predict" && state.pick !== null)
    say_ = ok ? w[`rule${state.round}` as "rule2"] : fill(w[`miss_${missOf(r, state.pick)}` as "miss_other"], { v: state.pick, sum: r.stages.join(" + ") });
  const ask = !r ? w.done : w[`ask${state.round}` as "ask0"];
  const askLines = wrapWords(ask, 62);
  const sayLines = wrapWords(say_, 74);

  const tree = (live: boolean) => {
    if (!r || r.mode !== "build") return null;
    const n = r.stages.length;
    const Y = (p: readonly number[]) => TOP + 20 + (slot(r.stages, p) + 0.5) * GAP;
    const out: ReactElement[] = [];
    for (let d = 1; d <= n; d++)
      for (const p of pathsTo(r.stages, d)) {
        const key = p.join(".");
        if (!shown(state, key)) continue;
        const parent = p.slice(0, -1);
        const [x0, y0] = d === 1 ? [COLX[0] + 14, TOP + 20 + (total(r.stages) / 2) * GAP] : [COLX[d - 1] + 16, Y(parent)];
        out.push(<line key={`l${key}`} x1={x0} y1={y0} x2={COLX[d] - 16} y2={Y(p)} stroke="#adb5bd" strokeWidth={1.6} pointerEvents="none" />);
        const isOpen = state.open.includes(key);
        const canOpen = live && d < n && !isOpen && !ok;
        const act = () => set(openAt(state, key));
        out.push(
          <g key={`n${key}`} data-node={key}>
            {isOpen && <circle cx={COLX[d]} cy={Y(p)} r={17} fill="none" stroke={GREEN} strokeWidth={2} pointerEvents="none" />}
            <Item stage={d - 1} k={p[d - 1]} x={COLX[d]} y={Y(p)} />
            {canOpen && (
              <rect x={COLX[d] - 20} y={Y(p) - 20} width={40} height={40} fill="transparent" role="button" tabIndex={0} aria-label={label(p)}
                style={{ cursor: "pointer" }} onClick={act} onKeyDown={(e) => keyTap(e, act)} />
            )}
          </g>,
        );
        if (d === n) out.push(<Outfit key={`o${key}`} p={p} x={COLX[n] + 90} y={Y(p)} />);
      }
    return (
      <>
        <circle cx={COLX[0]} cy={TOP + 20 + (total(r.stages) / 2) * GAP} r={8} fill={INK} pointerEvents="none" />
        {out}
      </>
    );
  };

  const rows = () => {
    if (!r || r.mode !== "predict") return null;
    return r.stages.map((c, i) => (
      <g key={i} pointerEvents="none" data-stage={i}>
        <text x={30} y={TOP + 44 + i * 64} fontSize={16} fill={INK}>{fill(w.stageSay, { n: c, t: [w.stage0, w.stage1, w.stage2][i] })}</text>
        {Array.from({ length: c }, (_, k) => <Item key={k} stage={i} k={k} x={250 + k * 46} y={TOP + 38 + i * 64} scale={1.3} />)}
      </g>
    ));
  };

  const optY = TOP + 60 + (r?.stages.length ?? 0) * 64;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
        <g data-ask="">
          {askLines.map((l, i) => (
            <text key={i} x={30} y={34 + i * 25} fontSize={19} fontWeight={700} fill={r ? BLUE : MUTED}>{i ? ` ${l}` : l}</text>
          ))}
        </g>
        {r && <text x={30} y={34 + askLines.length * 25} fontSize={14} fill={MUTED}>{fill(w.round, { k: state.round + 1, n: COUNT_ROUNDS.length })}</text>}
        {tree(true)}
        {r?.mode === "build" && <text x={W - 30} y={TOP + 6} fontSize={17} fontWeight={700} fill={ok ? GREEN : INK} textAnchor="end" data-made="">{fill(w.madeSay, { n: made(state) })}</text>}
        {rows()}
        {r?.mode === "predict" && (r.options ?? []).map((v, i) => (
          <Pill key={v} x={30 + i * 130} y={optY} w={110} h={44} size={20} text={String(v)} title={String(v)}
            strong={state.pick === v && ok} onTap={() => set(pickCount(state, v))} />
        ))}
        {say_ && (
          <g data-say="">
            {sayLines.map((l, i) => (
              <text key={i} x={30} y={H - 128 + i * 23} fontSize={16} fontWeight={ok ? 700 : 400} fill={ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {ok && <Pill x={W - 140} y={H - 54} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {!r && <Pill x={30} y={90} w={170} h={36} text={w.again} onTap={() => set(again())} />}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - 140} viewBox={`0 60 ${W} ${H - 140}`} fontFamily={FONT}>
          <rect x={0} y={60} width={W} height={H - 140} fill="#fff" />
          {tree(false)}
          {rows()}
        </svg>
      </div>
    </>
  );
}
