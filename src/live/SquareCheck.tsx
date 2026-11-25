// Square and check. √(x + a) = x + c as a curve and a line. Tap the equation to square both sides: the dashed mirror
// curve y = −√(x + a) appears, because the squared equation cannot tell the two apart, and the line now meets the pair
// twice. Tap each crossing to check it in the first equation: one fits, the other lies on the mirror and does not.
import { checkAt, plusText, ROOT_EQS, rootsOf, squareIt } from "../math/rootEquations";
import { BLUE, GREEN, keyTap, MUTED, RED, Tabs, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 700;
const PX = 30;
const U = 28;
const CY = 190;
const UY = 22;
const LO = -6;
const HI = 9;
const YT = 6;
const YB = -5;
const SAY_Y = 400;
const H = SAY_Y + 3 * 25 + 8;
const ORANGE = "#e8590c";
const X = (x: number) => PX + (x - LO) * U;
const Y = (y: number) => CY - y * UY;
const m = (v: number) => String(v).replace("-", "−");

export function SquareCheck({ state, set, w: words, svgRef }: PieceProps<"squareCheck">) {
  const w = words.squareCheck;
  const { a, c } = ROOT_EQS[state.which];
  const [good, bad] = rootsOf(a, c);
  const eq = `√(x + ${a}) = ${plusText(c)}`;
  const sq = `x + ${a} = (${plusText(c)})²`;
  const done = state.checked.length === 2;
  const lastI = state.checked[state.checked.length - 1];
  const said = (i: number) => {
    const x = i === 0 ? good : bad;
    return fill(i === 0 ? w.good : w.bad, { x: m(x), a, r: m(Math.sqrt(x + a)), l: m(x + c), c: plusText(c).replace("x", m(x)) });
  };
  const say = wrapWords(
    !state.squared
      ? fill(w.start, { e: eq, c: plusText(c), a })
      : lastI === undefined
        ? fill(w.squared, { s: sq, g: m(good), b: m(bad), a })
        : [said(lastI), done ? fill(w.done, { g: m(good) }) : w.next].join(" "),
    80,
  );
  const curve = (sign: number) =>
    Array.from({ length: 301 }, (_, i) => -a + (i / 300) * (HI + a))
      .map((x) => [x, sign * Math.sqrt(Math.max(0, x + a))] as const)
      .filter(([, y]) => y <= YT && y >= YB)
      .map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`)
      .join("");
  const lineEnds = [Math.max(LO, YB - c), Math.min(HI, YT - c)];
  const tapEq = () => set(squareIt(state));
  return (
    <>
      <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT}
        style={{ userSelect: "none" }} role="group" aria-label={say.join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={20} y={10} keys={ROOT_EQS.map((_, i) => String(i))} on={String(state.which)}
          names={Object.fromEntries(ROOT_EQS.map((e, i) => [i, `√(x + ${e.a}) = ${plusText(e.c)}`]))} onPick={(k) => set({ which: Number(k), squared: false, checked: [] })} />
        <g pointerEvents="none">
          {Array.from({ length: HI - LO + 1 }, (_, i) => LO + i).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(YT)} x2={X(v)} y2={Y(YB)} stroke={v === 0 ? INK : "#f1f3f5"} strokeWidth={v === 0 ? 1.5 : 1} />
              {v !== 0 && v % 2 === 0 && <text x={X(v)} y={Y(0) + 15} fontSize={11} textAnchor="middle" fill={MUTED}>{m(v)}</text>}
            </g>
          ))}
          {[-4, -2, 2, 4].map((v) => <text key={v} x={X(0) - 5} y={Y(v) + 4} fontSize={11} textAnchor="end" fill={MUTED}>{m(v)}</text>)}
          <line x1={X(LO)} y1={Y(0)} x2={X(HI)} y2={Y(0)} stroke={INK} strokeWidth={1.5} />
          <path d={curve(1)} fill="none" stroke={BLUE} strokeWidth={3} />
          {state.squared && <path d={curve(-1)} fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="7 5" />}
          <line x1={X(lineEnds[0])} y1={Y(lineEnds[0] + c)} x2={X(lineEnds[1])} y2={Y(lineEnds[1] + c)} stroke={ORANGE} strokeWidth={3} />
          <text x={490} y={84} fontSize={14} fill={BLUE}>{fill(w.curve, { a })}</text>
          {state.squared && <text x={490} y={106} fontSize={14} fill={MUTED}>{fill(w.mirror, { a })}</text>}
          <text x={490} y={128} fontSize={14} fill={ORANGE}>{fill(w.line, { c: plusText(c) })}</text>
        </g>
        {/* The equation: tap it to square both sides. */}
        <g role="button" tabIndex={0} aria-label={fill(w.eqTap, { e: eq })} onPointerDown={(e) => e.stopPropagation()} onClick={tapEq} onKeyDown={(e) => keyTap(e, tapEq)}
          style={{ cursor: state.squared ? "default" : "pointer" }}>
          <rect x={486} y={150} width={196} height={40} rx={8} fill={state.squared ? "#fff" : "#fff4e6"} stroke={state.squared ? MUTED : ORANGE} strokeWidth={2} />
          <text x={584} y={176} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{state.squared ? sq : eq}</text>
        </g>
        {state.squared && [good, bad].map((x, i) => {
          const checked = state.checked.includes(i);
          const tap = () => set(checkAt(state, i));
          return (
            <g key={i} role="button" tabIndex={0} aria-label={fill(w.cross, { x: m(x) })} onPointerDown={(e) => e.stopPropagation()} onClick={tap} onKeyDown={(e) => keyTap(e, tap)}
              style={{ cursor: "pointer" }}>
              <circle cx={X(x)} cy={Y(x + c)} r={11} fill={checked ? (i === 0 ? GREEN : RED) : "#fff"} stroke={checked ? "#fff" : INK} strokeWidth={2} />
              <text x={X(x)} y={Y(x + c) + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill={checked ? "#fff" : INK} pointerEvents="none">{checked ? (i === 0 ? "✓" : "✗") : "?"}</text>
            </g>
          );
        })}
        {say.map((s, i) => <text key={i} x={24} y={SAY_Y + i * 25} fontSize={16} fill={done ? GREEN : INK} pointerEvents="none">{s}</text>)}
      </svg>
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
