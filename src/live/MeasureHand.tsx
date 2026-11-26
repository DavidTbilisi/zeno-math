// A ruler and a kitchen scale on the board, worked by hand (#705). Ruler: a pencil lies on the mat and the ruler is
// dragged under it (or moved with the arrow keys); dashed lines drop from the pencil's ends to the marks. Scale: in
// the first round a weight from the tray is put on the pan (dragged or tapped) and the needle moves; later rounds have
// a fruit on the pan. Each round is answered on three tiles; a wrong tap is met with a question to look again, the
// right one with its rule, and Next. The rounds and the rules' numbers are in src/math/measureHand.ts.
import type { KeyboardEvent } from "react";
import { dialPic } from "../math/measurePics";
import {
  again, ends, moveRuler, needle, next, putWeight, rulerRound, RULER_LADDER, RULER_LEN, SCALE_LADDER, scaleRound, switchMode, takeWeight, tap, tiles, trayOf,
  type HandMode,
} from "../math/measureHand";
import { BLUE, GREEN, MUTED, Pill, Tabs, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 720;
const K = 32;
const MX = 40;
const PY = 96;
const RY = 150;
const RH = 52;
const ASK = "#e8590c";
type Words = PieceProps<"measureHand">["w"]["measureHand"];

const mx = (cm: number) => MX + cm * K;

function Pencil({ a, n }: { a: number; n: number }) {
  const [x0, x1] = [mx(a), mx(a + n)];
  return (
    <g pointerEvents="none">
      <rect x={x0} y={PY} width={Math.max(0, x1 - x0 - 22)} height={20} fill="#fcc419" stroke={INK} strokeWidth={1.4} />
      <rect x={x0} y={PY} width={10} height={20} fill="#faa2c1" stroke={INK} strokeWidth={1.4} />
      <path d={`M ${x1 - 22} ${PY} L ${x1} ${PY + 10} L ${x1 - 22} ${PY + 20} Z`} fill="#f3d9b1" stroke={INK} strokeWidth={1.4} />
      <path d={`M ${x1 - 7} ${PY + 6.8} L ${x1} ${PY + 10} L ${x1 - 7} ${PY + 13.2} Z`} fill={INK} />
      {[x0, x1].map((x) => <line key={x} x1={x} y1={PY + 20} x2={x} y2={RY} stroke={MUTED} strokeDasharray="3 3" />)}
    </g>
  );
}

/** The ruler with its first mark at `at` cm on the mat, numbered from `from`; a broken ruler has a jagged left end. */
function Ruler({ at, from, w }: { at: number; from: number; w: Words }) {
  const len = RULER_LEN - from;
  const x0 = mx(at);
  const marks = [];
  for (let i = 0; i <= 2 * len; i++) {
    const whole = i % 2 === 0;
    const x = x0 + (i / 2) * K;
    marks.push(<line key={i} x1={x} y1={RY} x2={x} y2={RY + (whole ? 16 : 9)} stroke={INK} strokeWidth={whole ? 1.6 : 1} />);
    if (whole) marks.push(<text key={`t${i}`} x={x} y={RY + 32} fontSize={13} textAnchor="middle" fill={INK}>{from + i / 2}</text>);
  }
  const end = x0 + len * K + 40;
  // A broken ruler's left end is jagged; a whole one starts a little before its 0.
  const jag = Array.from({ length: 7 }, (_, j) => `${x0 - 4 - (j % 2 ? 7 : 0)},${RY + RH - (j * RH) / 6}`);
  const outline = from ? [`${x0 - 4},${RY}`, `${end},${RY}`, `${end},${RY + RH}`, ...jag].join(" ") : `${x0 - 14},${RY} ${end},${RY} ${end},${RY + RH} ${x0 - 14},${RY + RH}`;
  return (
    <g>
      <polygon points={outline} fill="#fff9db" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      {marks}
      <text x={x0 + len * K + 24} y={RY + 32} fontSize={12} fill={MUTED} textAnchor="middle">{w.cm}</text>
    </g>
  );
}

/** A weight of g grams, its top left corner at (x, y). */
function Weight({ x, y, g, w }: { x: number; y: number; g: number; w: Words }) {
  const wd = g >= 100 ? 64 : 48;
  return (
    <>
      <rect x={x} y={y} width={wd} height={30} rx={5} fill="#adb5bd" stroke="#495057" strokeWidth={1.5} />
      <text x={x + wd / 2} y={y + 20} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{fill(w.grams, { g })}</text>
    </>
  );
}
const weightW = (g: number) => (g >= 100 ? 64 : 48);

const FRUIT: Record<string, string> = { pear: "🍐", apple: "🍎", melon: "🍉" };
const PAN = { x: 300, y: 92, w: 200 };
const DIAL = { x: 270, y: 124 };
const TRAY = { x: 40, y: 140 };

export function MeasureHand({ state, set, w: words, svgRef }: PieceProps<"measureHand">) {
  const w = words.measureHand;
  const ruler = state.mode === "ruler";
  const rr = rulerRound(state);
  const sr = scaleRound(state);
  const t = tiles(state);
  const done = ruler ? !rr : !sr;

  const { drag, begin, svgProps } = useDrag<{ what: "ruler"; at0: number } | { what: "weight"; g: number } | { what: "pan"; i: number }>((d) => {
    if (d.what === "ruler") return;
    const onPan = d.x > PAN.x - 20 && d.x < PAN.x + PAN.w + 20 && d.y < DIAL.y + 40;
    if (d.what === "weight" && (!d.moved || onPan)) set(putWeight(state, d.g));
    if (d.what === "pan" && (!d.moved || !onPan)) set(takeWeight(state, d.i));
  }, (d) => {
    if (d.what === "ruler") set(moveRuler(state, d.at0 + (d.x - d.x0) / K));
  });
  const onRulerKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -0.5 : e.key === "ArrowRight" ? 0.5 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    set(moveRuler(state, state.at + step));
  };

  // The words under the tiles: what a wrong tap should look at again, or the right one's rule.
  let say = "";
  if (state.said && t) {
    if (state.said.ok) {
      if (ruler && rr) {
        const [p, q] = ends(rr, state.at);
        say = p === 0 ? fill(w.ruleZero, { n: rr.n }) : fill(rr.from ? w.ruleBroken : w.ruleEnds, { p, q, n: rr.n });
      } else if (sr) {
        const k = sr.major / sr.minor;
        if (!sr.fruit) say = fill(w.ruleMark, { s: sr.minor, b: sr.major, k });
        else {
          const lo = sr.v - (sr.v % sr.major);
          say = fill(w.ruleDial, { lo, hi: lo + sr.major, k, s: sr.minor, j: (sr.v % sr.major) / sr.minor, v: sr.v });
        }
      }
    } else if (ruler) say = state.said.v === t.slip ? w.lookStart : w.lookBoth;
    else say = !sr?.fruit ? fill(w.tryWeight, { s: sr?.minor ?? 0 }) : state.said.v === t.slip ? w.lookSpaces : w.lookNeedle;
  }
  const unit = ruler ? w.cm : w.g;
  const tileVals = t ? [t.right, t.slip, t.other].sort((a, b) => a - b) : [];
  const TY = ruler ? 240 : 400;
  const H = TY + 150;

  const lines = say.length > 80 ? [say.slice(0, say.lastIndexOf(" ", 80)), say.slice(say.lastIndexOf(" ", 80) + 1)] : [say];
  const ask = done ? w.done : ruler ? w.askRuler : sr?.fruit ? fill(w.askFruit, { fruit: w.fruits[sr.fruit] }) : fill(w.askMark, { s: sr?.minor ?? 0 });
  const total = needle(state);

  const picture = (live: boolean) => (
    <>
      {ruler && rr && (
        <>
          <Pencil a={rr.a} n={rr.n} />
          <g role={live ? "slider" : undefined} tabIndex={live ? 0 : undefined} aria-label={live ? w.rulerLabel : undefined} aria-valuenow={live ? state.at : undefined}
            style={live ? { cursor: "ew-resize" } : undefined} data-ruler="" onKeyDown={live ? onRulerKey : undefined}
            onPointerDown={live ? (e) => begin(e, { what: "ruler", at0: state.at }) : undefined}>
            <Ruler at={state.at} from={rr.from} w={w} />
          </g>
        </>
      )}
      {!ruler && sr && (
        <>
          <rect x={PAN.x} y={PAN.y} width={PAN.w} height={8} rx={4} fill="#868e96" data-panzone="" />
          <rect x={PAN.x + PAN.w / 2 - 6} y={PAN.y + 8} width={12} height={DIAL.y - PAN.y - 6} fill="#868e96" />
          {sr.fruit && <text x={PAN.x + 40} y={PAN.y - 6} fontSize={46} textAnchor="middle" data-fruit={sr.fruit}>{FRUIT[sr.fruit]}</text>}
          {state.pan.map((g, i) => {
            const x = PAN.x + 6 + state.pan.slice(0, i).reduce((s, h) => s + weightW(h) + 4, 0);
            return (
              <g key={i} data-pan={i} role={live ? "button" : undefined} aria-label={live ? fill(w.takeOff, { g }) : undefined} style={live ? { cursor: "grab" } : undefined}
                onPointerDown={live ? (e) => begin(e, { what: "pan", i }) : undefined}>
                <Weight x={x} y={PAN.y - 31} g={g} w={w} />
              </g>
            );
          })}
          <g transform={`translate(${DIAL.x} ${DIAL.y})`} dangerouslySetInnerHTML={{ __html: dialPic(total, sr.max, sr.major, sr.minor, w.g).body }} />
        </>
      )}
    </>
  );

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps} style={{ touchAction: "none", userSelect: "none" }}>
        <Tabs x={W - 230} y={10} keys={["ruler", "scale"] as HandMode[]} on={state.mode} names={w.modes} onPick={(m) => set(switchMode(state, m))} />
        <text x={MX - 16} y={36} fontSize={21} fontWeight={700} fill={done ? MUTED : BLUE} data-ask="">{ask}</text>
        {!done && (
          <text x={MX - 16} y={60} fontSize={14} fill={MUTED}>
            {fill(w.round, { k: (ruler ? state.ruler : state.scale) + 1, n: ruler ? RULER_LADDER.length : SCALE_LADDER.length })}
          </text>
        )}
        {picture(true)}
        {!ruler && trayOf(sr).map((g, i) => (
          <g key={g} role="button" tabIndex={0} aria-label={fill(w.put, { g })} style={{ cursor: "grab" }} data-tray={g}
            onPointerDown={(e) => begin(e, { what: "weight", g })} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && set(putWeight(state, g))}>
            <title>{w.trayTitle}</title>
            <Weight x={TRAY.x} y={TRAY.y + i * 44} g={g} w={w} />
          </g>
        ))}
        {!ruler && !!trayOf(sr).length && <text x={TRAY.x} y={TRAY.y - 12} fontSize={13} fill={MUTED}>{w.tray}</text>}
        {drag?.moved && drag.what === "weight" && <g pointerEvents="none" opacity={0.85}><Weight x={drag.x - 24} y={drag.y - 15} g={drag.g} w={w} /></g>}
        {!done && t && tileVals.map((v, i) => (
          <Pill key={v} x={MX - 16 + i * 130} y={TY} w={116} h={40} size={18} text={`${v} ${unit}`}
            on={state.said?.v === v} strong={state.said?.ok && state.said.v === v} onTap={() => set(tap(state, v))} />
        ))}
        {say && (
          // One group for the sentence, its second line keeping the space it was broken at.
          <g data-say="">
            {lines.map((l, i) => (
              <text key={i} x={MX - 16} y={TY + 72 + i * 24} fontSize={17} fontWeight={state.said?.ok ? 700 : 400} fill={state.said?.ok ? GREEN : ASK}>{i ? ` ${l}` : l}</text>
            ))}
          </g>
        )}
        {state.said?.ok && <Pill x={W - 150} y={TY} w={120} h={40} size={17} text={`${w.next} →`} title={w.next} strong onTap={() => set(next(state))} />}
        {done && <Pill x={MX - 16} y={TY} w={170} h={36} text={w.again} onTap={() => set(again(state))} />}
      </svg>
      <p className="live-hint">{ruler ? w.hintRuler : w.hintScale}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={TY - 20} viewBox={`0 60 ${W} ${TY - 20}`} fontFamily={FONT}>
          <rect x={0} y={60} width={W} height={TY - 20} fill="#fff" />
          {picture(false)}
        </svg>
      </div>
    </>
  );
}

