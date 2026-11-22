// The turning arrow: why a minus times a minus is a plus, as arrows on a number line. A number is an arrow from 0;
// multiplying by a size puts that many of it end to end, and a minus sign turns it round, swinging over the top of 0.
// a × b is walked through a step at a time (src/math/signs.ts, arrowSteps): an arrow of |b| pointing right, turned
// round if b is negative, stretched |a| times, turned round again if a is negative. Two minus signs, two half turns:
// it faces right again. After the walk "× (−1)" turns it once more, as often as you like, counting the turns. The
// Why? steps show the same answer another way, from the pattern of a column of products (SignPattern.tsx).
import { useState } from "react";
import {
  arrowShape, arrowSteps, arrowValue, factor, num, productText, SIGN_RANGE, stepPast0,
  type ArrowStep,
} from "../math/signs";
import { PatternPicture } from "./SignPattern";
import { BLUE, keyTap, NumBox, Pill, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const PAD = 20;
/** The tools take the top: the wheels for a and b, Why?, the turn and the step dots. */
const TOP = 58;
const UNIT = 17;
const X0 = W / 2;
/** The most the tip can be from 0: 4 × 4. */
const REACH = 16;
/** The arrows ride just above the line, and swing round over the top of 0, so there is room above for the longest. */
const AY = TOP + REACH * UNIT + 26;
const LINE_Y = AY + 16;
const SAY_Y = LINE_Y + 52;
const SAY = 27;
/** The most lines of words: the product and a walk's five steps. */
const MAX_LINES = 6;
const H = SAY_Y + MAX_LINES * SAY;
/** The Why? steps open under the words: the small graph and the step's sentence. */
const WHY_H = 170;
const DOT = 24;
const SEG = ["#1971c2", "#4dabf7"];
const GREEN = "#2f9e44";

type Words = PieceProps<"signArrow">["w"]["signArrow"];

function stepLine(s: ArrowStep, w: Words, extra: number): string {
  switch (s.kind) {
    case "size": return fill(w.steps.size, { n: s.n });
    case "turnB": return fill(w.steps.turnB, { b: num(s.b) });
    case "stretch": return fill(s.k === 1 ? w.steps.stretch1 : w.steps.stretch, { k: s.k, v: num(s.v) });
    case "turnA": return fill(s.v > 0 ? w.steps.turnAgain : w.steps.turnA, { a: num(s.a), v: num(s.v) });
    case "answer": {
      const p = productText(s.a, s.b, extra);
      const r = extra % 2 ? -s.r : s.r;
      if (extra) return fill(r > 0 ? w.steps.extraEven : w.steps.extraOdd, { p, r: num(r), t: s.turns + extra });
      return fill([w.steps.answer0, w.steps.answer1, w.steps.answer2][s.turns], { p, r: num(r) });
    }
  }
}

/** The arrow: `segs` arrows of `len` end to end from 0, swung round by `turns` half turns (as a CSS rotation about 0). */
function Arrow({ len, segs, turns }: { len: number; segs: number; turns: number }) {
  const L = len * UNIT;
  return (
    <g className="sign-swing" style={{ transform: `rotate(${-180 * turns}deg)`, transformOrigin: `${X0}px ${AY}px`, transformBox: "view-box" }}>
      {Array.from({ length: segs }, (_, i) => {
        const [x1, x2] = [X0 + i * L, X0 + (i + 1) * L];
        const c = SEG[i % 2];
        return (
          <g key={i} className={i ? "sign-seg" : undefined} style={i ? { animationDelay: `${0.12 * i}s` } : undefined}>
            <line x1={x1} y1={AY} x2={x2 - 9} y2={AY} stroke={c} strokeWidth={6} strokeLinecap="round" />
            <path d={`M${x2} ${AY} l-13 -8 v16 z`} fill={c} />
          </g>
        );
      })}
    </g>
  );
}

/** The arrow is the one thing to hold: a tap is the next step, a drag sets b or turns it once more. */
type Hold = { b0: number };

export function SignArrow({ state, set, w: words, svgRef }: PieceProps<"signArrow">) {
  const w = words.signArrow;
  const { a, b, step, extra } = state;
  const [explain, setExplain] = useState<number | null>(null);
  const steps = arrowSteps(a, b);
  const done = step >= steps.length;
  const shape = arrowShape(a, b, step, done ? extra : 0);
  const v = arrowValue(shape);
  const turns = shape.turns;

  const next = () => set({ ...state, step: done ? 0 : step + 1, extra: 0 });
  const change = (patch: Partial<typeof state>) => set({ ...state, ...patch, step: 0, extra: 0 });
  const turnOnce = () => done && set({ ...state, extra: extra + 1 });

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      if (!d.moved) return next();
      // Past the walk, the tip let go on the other side of 0 (a step past it at least) is one more half turn.
      if (done && Math.abs(d.x - X0) > UNIT && Math.sign(d.x - X0) !== Math.sign(v)) turnOnce();
    },
    (d) => {
      if (step || !d.moved) return;
      const nb = Math.max(SIGN_RANGE[0], Math.min(SIGN_RANGE[1], d.b0 + Math.round((d.x - d.x0) / UNIT)));
      if (nb && nb !== b) change({ b: nb });
    },
  );

  const lines = [step ? productText(a, b, done ? extra : 0) : fill(w.ready, { p: productText(a, b) })];
  if (step) lines.push(...steps.slice(0, step).map((s) => stepLine(s, w, extra)));

  const whys = [0, 1, 2] as const;
  const rows = [3, 2, 1, 0].map((k) => `${k} × ${factor(b)} = ${num(k * b)}`).join(", ");
  const whyText = (i: number) =>
    i === 0 ? fill(b < 0 ? w.whyText.countUp : w.whyText.countDown, { rows, n: Math.abs(b) })
    : i === 1 ? w.whyText.line
    : fill(b < 0 ? w.whyText.pastUp : w.whyText.pastDown, { b: factor(b), r: num(-b) });

  const tipX = X0 + v * UNIT;
  /** The path of the swing (a half circle over 0) and the count of turns, once the walk has turned the arrow. */
  const swung = step > 0 && turns > 0;
  const reach = shape.len * shape.segs * UNIT;
  /** Past the walk, where the held tip is now: on the other side of 0 it would turn. */
  const swing = done && drag?.moved ? drag.x : null;
  const across = swing !== null && Math.abs(swing - X0) > UNIT && Math.sign(swing - X0) !== Math.sign(v);

  const drawing = (live: boolean) => (
    <>
      {swung && <path d={`M${X0 - reach} ${AY} A${reach} ${reach} 0 0 1 ${X0 + reach} ${AY}`} fill="none" stroke="#dee2e6" strokeWidth={1.5} strokeDasharray="4 5" />}
      <line x1={X0 - REACH * UNIT - 10} y1={LINE_Y} x2={X0 + REACH * UNIT + 10} y2={LINE_Y} stroke="#495057" strokeWidth={2} />
      {Array.from({ length: 2 * REACH + 1 }, (_, k) => k - REACH).map((n) => (
        <g key={n}>
          <line x1={X0 + n * UNIT} y1={LINE_Y - (n % 4 ? 4 : 7)} x2={X0 + n * UNIT} y2={LINE_Y + (n % 4 ? 4 : 7)} stroke="#495057" strokeWidth={n ? 1 : 2} />
          {n % 4 === 0 && <text x={X0 + n * UNIT} y={LINE_Y + 24} fontSize={13} textAnchor="middle" fill="#868e96">{num(n)}</text>}
        </g>
      ))}
      <text x={X0 - REACH * UNIT} y={LINE_Y - 12} fontSize={13} fill="#868e96">← {w.minus}</text>
      <text x={X0 + REACH * UNIT} y={LINE_Y - 12} fontSize={13} textAnchor="end" fill="#868e96">{w.plus} →</text>
      <g opacity={swing !== null ? 0.45 : 1}>
        <Arrow key={`${a}/${b}/${step > 0}`} len={shape.len} segs={shape.segs} turns={turns} />
      </g>
      <circle cx={X0} cy={AY} r={5} fill={INK} />
      <g key={`tip${v}/${turns}`} className="sign-tip">
        <line x1={tipX} y1={AY + 8} x2={tipX} y2={LINE_Y} stroke={v > 0 ? GREEN : "#c92a2a"} strokeWidth={2} strokeDasharray="3 3" />
        <text x={tipX} y={AY - 16} fontSize={18} fontWeight={700} textAnchor="middle" fill={v > 0 ? GREEN : "#c92a2a"}>{num(v)}</text>
      </g>
      {swung && <text x={X0} y={AY - reach - 10} fontSize={14} textAnchor="middle" fill="#868e96">↻ {fill(w.turns, { t: turns })}</text>}
      {live && swing !== null && (
        <g pointerEvents="none">
          <line x1={X0} y1={AY} x2={swing} y2={AY} stroke={across ? BLUE : "#adb5bd"} strokeWidth={5} strokeDasharray="8 6" strokeLinecap="round" />
          <circle cx={swing} cy={AY} r={9} fill={across ? BLUE : "#adb5bd"} />
        </g>
      )}
      {lines.map((l, i) => (
        <text key={i} x={24} y={SAY_Y + i * SAY} fontSize={l.length > 64 ? (17 * 64) / l.length : 17} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
      ))}
    </>
  );

  // The arrow to hold: its whole length and a wider ring round the tip.
  const lo = Math.min(X0, tipX);
  const hi = Math.max(X0, tipX);
  const arrowName = step === 0 ? w.show : done ? w.again : w.next;
  const dots = steps.length + 1;
  const dotX = (i: number) => W - PAD - (dots - 1 - i) * DOT - 8;
  const whyY = H + 6;
  const fullH = H + (explain !== null ? WHY_H : 0);
  return (
    <>
      <svg className="hand-pic" width={W} height={fullH} viewBox={`0 0 ${W} ${fullH}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={lines.join(" ")}>
        <rect width={W} height={fullH} fill="#fff" />
        <text x={PAD} y={36} fontSize={20} fontStyle="italic" fill={INK}>a</text>
        <NumBox x={PAD + 16} y={8} w={58} h={42} value={a} min={SIGN_RANGE[0]} max={SIGN_RANGE[1]} label="a" onChange={(n) => change({ a: stepPast0(n, a) })} />
        <text x={PAD + 92} y={36} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>×</text>
        <text x={PAD + 108} y={36} fontSize={20} fontStyle="italic" fill={INK}>b</text>
        <NumBox x={PAD + 124} y={8} w={58} h={42} value={b} min={SIGN_RANGE[0]} max={SIGN_RANGE[1]} label="b" onChange={(n) => change({ b: stepPast0(n, b) })} />
        <Pill x={PAD + 200} y={14} w={96} h={30} size={14} text={`💡 ${w.why}`} title={w.why} on={explain !== null}
          onTap={() => setExplain(explain !== null ? null : 0)} />
        <Pill x={PAD + 306} y={14} w={96} h={30} size={14} text="↻ × (−1)" title={w.turnTitle} disabled={!done} onTap={turnOnce} />
        {Array.from({ length: dots }, (_, i) => (
          <g key={i} role="button" tabIndex={0} aria-label={fill(w.stepDot, { n: i })} aria-pressed={i === Math.min(step, steps.length)}
            style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => set({ ...state, step: i, extra: 0 })}
            onKeyDown={(e) => keyTap(e, () => set({ ...state, step: i, extra: 0 }))}>
            <circle cx={dotX(i)} cy={29} r={11} fill="transparent" />
            <circle cx={dotX(i)} cy={29} r={i === Math.min(step, steps.length) ? 8 : 6}
              fill={i === Math.min(step, steps.length) ? BLUE : i < step ? "#a5d8ff" : "#fff"} stroke={i <= step ? BLUE : "#adb5bd"} strokeWidth={1.5} />
          </g>
        ))}
        {drawing(true)}
        <g role="button" tabIndex={0} aria-label={arrowName} style={{ cursor: step === 0 || done ? "grab" : "pointer" }}
          onPointerDown={(e) => begin(e, { b0: b })} onKeyDown={(e) => keyTap(e, next)}>
          <title>{arrowName}</title>
          <rect x={lo - 10} y={AY - 18} width={hi - lo + 20} height={36} fill="transparent" />
          <circle cx={tipX} cy={AY} r={18} fill="transparent" stroke={step === 0 || done ? "#a5d8ff" : "none"} strokeDasharray="3 3" />
        </g>
        {explain !== null && (
          <g>
            <g role="button" tabIndex={0} aria-label={`${w.why}: ${w.whyNext}`} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setExplain((explain + 1) % whys.length)} onKeyDown={(e) => keyTap(e, () => setExplain((explain + 1) % whys.length))}>
              <rect x={PAD} y={whyY} width={W - 2 * PAD} height={WHY_H - 14} rx={10} fill="#f8f9fa" stroke="#dee2e6" />
              <g transform={`translate(${PAD + 4} ${whyY + 3})`}><PatternPicture b={b} stage={whys[explain]} /></g>
              {wrapWords(`${explain + 1}/${whys.length}  ${whyText(explain)}`, 52).map((l, i) => (
                <text key={i} x={PAD + 170} y={whyY + 28 + i * 21} fontSize={15} fill={INK} pointerEvents="none">{l}</text>
              ))}
            </g>
            {whys.map((i) => (
              <g key={i} role="button" tabIndex={0} aria-label={`${w.why} ${i + 1}`} aria-pressed={i === explain} style={{ cursor: "pointer" }}
                onPointerDown={(e) => e.stopPropagation()} onClick={() => setExplain(i)} onKeyDown={(e) => keyTap(e, () => setExplain(i))}>
                <circle cx={W - PAD - 70 + i * 24} cy={whyY + WHY_H - 34} r={10} fill="transparent" />
                <circle cx={W - PAD - 70 + i * 24} cy={whyY + WHY_H - 34} r={i === explain ? 7 : 5} fill={i === explain ? BLUE : "#fff"} stroke={BLUE} />
              </g>
            ))}
          </g>
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - TOP} viewBox={`0 ${TOP} ${W} ${H - TOP}`} fontFamily={FONT}>
          <rect y={TOP} width={W} height={H - TOP} fill="#fff" />
          {drawing(false)}
        </svg>
      </div>
    </>
  );
}
