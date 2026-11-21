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
import { fill, FONT, INK, Stepper, type PieceProps } from "./ui";
import { WhySteps } from "./WhySteps";

const W = 640;
const UNIT = 17;
const X0 = W / 2;
/** The most the tip can be from 0: 4 × 4. */
const REACH = 16;
/** The arrows ride just above the line, and swing round over the top of 0, so there is room above for the longest. */
const AY = REACH * UNIT + 26;
const LINE_Y = AY + 16;
const SAY_Y = LINE_Y + 52;
const SAY = 27;
/** The most lines of words: the product and a walk's five steps. */
const MAX_LINES = 6;
const H = SAY_Y + MAX_LINES * SAY;
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
  return (
    <>
      <div className="live-bar">
        <i>a</i>
        <Stepper value={a} min={SIGN_RANGE[0]} max={SIGN_RANGE[1]} onChange={(n) => change({ a: stepPast0(n, a) })} less={w.less} more={w.more} />
        <b>×</b>
        <i>b</i>
        <Stepper value={b} min={SIGN_RANGE[0]} max={SIGN_RANGE[1]} onChange={(n) => change({ b: stepPast0(n, b) })} less={w.less} more={w.more} />
        <button className="live-btn on" onClick={next}>{done ? w.again : step ? w.next : w.show}</button>
        <button className="live-btn" disabled={!done} title={w.turnTitle} onClick={() => set({ ...state, extra: extra + 1 })}>↻ × (−1)</button>
        <button className={`live-btn${explain !== null ? " on" : ""}`} aria-pressed={explain !== null} onClick={() => setExplain(explain !== null ? null : 0)}>
          💡 {w.why}
        </button>
      </div>
      {explain !== null && (
        <WhySteps at={explain} of={whys.length} text={whyText(explain)} back={w.whyBack} next={w.whyNext} onStep={setExplain}
          picture={<PatternPicture b={b} stage={whys[explain]} />} />
      )}
      <p className="live-hint">{w.hint}</p>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={lines.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
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
        <Arrow key={`${a}/${b}/${step > 0}`} len={shape.len} segs={shape.segs} turns={turns} />
        <circle cx={X0} cy={AY} r={5} fill={INK} />
        <g key={`tip${v}/${turns}`} className="sign-tip">
          <line x1={tipX} y1={AY + 8} x2={tipX} y2={LINE_Y} stroke={v > 0 ? GREEN : "#c92a2a"} strokeWidth={2} strokeDasharray="3 3" />
          <text x={tipX} y={AY - 16} fontSize={18} fontWeight={700} textAnchor="middle" fill={v > 0 ? GREEN : "#c92a2a"}>{num(v)}</text>
        </g>
        {swung && <text x={X0} y={AY - reach - 10} fontSize={14} textAnchor="middle" fill="#868e96">↻ {fill(w.turns, { t: turns })}</text>}
        {lines.map((l, i) => (
          <text key={i} x={24} y={SAY_Y + i * SAY} fontSize={l.length > 64 ? (17 * 64) / l.length : 17} fill={i ? "#495057" : INK} fontWeight={i ? 400 : 700}>{l}</text>
        ))}
      </svg>
    </>
  );
}
