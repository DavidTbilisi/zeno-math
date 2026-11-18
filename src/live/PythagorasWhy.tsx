// Why Pythagoras holds, a step at a time on a 3-4-5 triangle of its own: a square drawn on each side (9, 16 and 25
// small squares), the two small ones together making the big one, the proof by fitting four copies of the triangle
// into a 7 × 7 square two ways (the space left is c² one way and a² + b² the other), then using it: a missing
// hypotenuse is the root of the squares added, a missing shorter side the root of the squares taken away. The steps
// join SOH CAH TOA's hint on its hard level, and stand on their own beside the Pythagoras tool of the geometry dialog.
import { useState } from "react";
import { FONT } from "./ui";
import { WhySteps } from "./WhySteps";

export const PYTH_STEPS = ["squares", "sum", "proof", "findHyp", "findLeg"] as const;
export type PythStep = (typeof PYTH_STEPS)[number];
export const isPythStep = (s: string): s is PythStep => (PYTH_STEPS as readonly string[]).includes(s);

/** The sides' colours, as the trig games colour them: the up (3) purple, the across (4) teal, the hypotenuse (5) blue. */
const UP = "#9c36b5";
const ACROSS = "#0c8599";
const HYP = "#1971c2";
type P = [number, number];

/** A square on a side: its corner and its two edges, in triangle units, with n small squares along each edge. */
type Square = { o: P; e1: P; e2: P; n: number; color: string; label: string };

/** The squares picture: the right angle at (4, 0), the foot at (0, 0), the top at (4, −3); a unit is 9 pixels. */
function SquaresPicture({ sum }: { sum: boolean }) {
  const px = ([x, y]: P): P => [62 + 9 * x, 70 + 9 * y];
  const squares: Square[] = [
    { o: [0, 0], e1: [4, 0], e2: [0, 4], n: 4, color: ACROSS, label: "16" },
    { o: [4, 0], e1: [0, -3], e2: [3, 0], n: 3, color: UP, label: "9" },
    { o: [0, 0], e1: [4, -3], e2: [-3, -4], n: 5, color: HYP, label: "25" },
  ];
  const at = (o: P, e1: P, e2: P, s: number, t: number): P => px([o[0] + e1[0] * s + e2[0] * t, o[1] + e1[1] * s + e2[1] * t]);
  const pts = (q: P[]) => q.map((p) => p.join(",")).join(" ");
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" fontFamily={FONT} aria-hidden>
      {squares.map((q) => {
        const corners = [at(q.o, q.e1, q.e2, 0, 0), at(q.o, q.e1, q.e2, 1, 0), at(q.o, q.e1, q.e2, 1, 1), at(q.o, q.e1, q.e2, 0, 1)];
        const centre = at(q.o, q.e1, q.e2, 0.5, 0.5);
        return (
          <g key={q.label}>
            <polygon points={pts(corners)} fill={q.color} fillOpacity={sum ? 0.28 : 0.12} stroke={q.color} strokeWidth={1.5} />
            {!sum &&
              Array.from({ length: q.n - 1 }, (_, k) => {
                const f = (k + 1) / q.n;
                const [a, b, c, d] = [at(q.o, q.e1, q.e2, f, 0), at(q.o, q.e1, q.e2, f, 1), at(q.o, q.e1, q.e2, 0, f), at(q.o, q.e1, q.e2, 1, f)];
                return (
                  <g key={k} stroke={q.color} strokeOpacity={0.45} strokeWidth={0.8}>
                    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                    <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
                  </g>
                );
              })}
            {sum && (
              <text x={centre[0]} y={centre[1] + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={q.color}>
                {q.label}
              </text>
            )}
          </g>
        );
      })}
      <polygon points={pts([px([0, 0]), px([4, 0]), px([4, -3])])} fill="#fff" stroke="#1e1e1e" strokeWidth={2} />
      <path d={`M${px([3.2, 0]).join(",")} L${px([3.2, -0.8]).join(",")} L${px([4, -0.8]).join(",")}`} fill="none" stroke="#1e1e1e" strokeWidth={1} />
      {sum && (
        <text x={136} y={104} fontSize={12} fontWeight={700} textAnchor="middle" fill="#1e1e1e">
          9 + 16 = 25
        </text>
      )}
    </svg>
  );
}

/** The proof: a 7 × 7 square holding four copies of the triangle twice, leaving c² (left) or a² and b² (right). */
function ProofPicture() {
  const u = 10;
  const sq = (x0: number, y0: number) => (q: P[]) => q.map(([x, y]) => `${x0 + x * u},${y0 + y * u}`).join(" ");
  const L = sq(6, 14);
  const R = sq(96, 14);
  const tri = (q: P[], f: (q: P[]) => string, k: number) => <polygon key={k} points={f(q)} fill="#dee2e6" stroke="#868e96" strokeWidth={1} />;
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" fontFamily={FONT} aria-hidden>
      <polygon points={L([[0, 0], [7, 0], [7, 7], [0, 7]])} fill="none" stroke="#1e1e1e" strokeWidth={1.5} />
      <polygon points={L([[3, 0], [7, 3], [4, 7], [0, 4]])} fill={HYP} fillOpacity={0.25} stroke={HYP} strokeWidth={1.5} />
      {[
        [[0, 0], [3, 0], [0, 4]],
        [[7, 0], [7, 3], [3, 0]],
        [[7, 7], [4, 7], [7, 3]],
        [[0, 7], [0, 4], [4, 7]],
      ].map((q, k) => tri(q as P[], L, k))}
      <text x={6 + 3.5 * u} y={14 + 3.5 * u + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={HYP}>c²</text>
      <text x={88} y={14 + 3.5 * u + 5} fontSize={16} fontWeight={700} textAnchor="middle" fill="#1e1e1e">=</text>
      <polygon points={R([[0, 0], [7, 0], [7, 7], [0, 7]])} fill="none" stroke="#1e1e1e" strokeWidth={1.5} />
      <polygon points={R([[0, 0], [3, 0], [3, 3], [0, 3]])} fill={UP} fillOpacity={0.25} stroke={UP} strokeWidth={1.5} />
      <polygon points={R([[3, 3], [7, 3], [7, 7], [3, 7]])} fill={ACROSS} fillOpacity={0.25} stroke={ACROSS} strokeWidth={1.5} />
      {[
        [[3, 0], [7, 0], [3, 3]],
        [[7, 0], [7, 3], [3, 3]],
        [[0, 3], [3, 3], [0, 7]],
        [[3, 3], [3, 7], [0, 7]],
      ].map((q, k) => tri(q as P[], R, k))}
      <text x={96 + 1.5 * u} y={14 + 1.5 * u + 5} fontSize={12} fontWeight={700} textAnchor="middle" fill={UP}>a²</text>
      <text x={96 + 5 * u} y={14 + 5 * u + 5} fontSize={14} fontWeight={700} textAnchor="middle" fill={ACROSS}>b²</text>
      <text x={6 + 3.5 * u} y={104} fontSize={11} textAnchor="middle" fill="#495057">7 × 7</text>
      <text x={96 + 3.5 * u} y={104} fontSize={11} textAnchor="middle" fill="#495057">7 × 7</text>
    </svg>
  );
}

/** Using it: the 3-4-5 triangle with one side asked (the hypotenuse, or the up) and the working beside it. */
function FindPicture({ hyp }: { hyp: boolean }) {
  const [B, C, A]: P[] = [[10, 74], [66, 74], [66, 32]];
  const lines = hyp ? ["?² = 3² + 4²", "?² = 25", "? = 5"] : ["?² = 5² − 4²", "?² = 9", "? = 3"];
  const label = (x: number, y: number, s: string, color: string, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={x} y={y} fontSize={13} fontWeight={700} textAnchor={anchor} fill={color}>{s}</text>
  );
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" fontFamily={FONT} aria-hidden>
      <polygon points={[B, C, A].map((p) => p.join(",")).join(" ")} fill="#f8f9fa" stroke="#1e1e1e" strokeWidth={2} />
      <path d={`M${C[0] - 8},${C[1]} V${C[1] - 8} H${C[0]}`} fill="none" stroke="#1e1e1e" strokeWidth={1} />
      {label(38, 90, "4", ACROSS)}
      {label(72, 58, hyp ? "3" : "?", hyp ? UP : "#e03131", "start")}
      {label(32, 46, hyp ? "?" : "5", hyp ? "#e03131" : HYP, "end")}
      {lines.map((s, i) => (
        <text key={s} x={84} y={38 + i * 20} fontSize={12} fontWeight={i === 2 ? 700 : 400} fill={i === 2 ? "#2f9e44" : "#1e1e1e"}>
          {s}
        </text>
      ))}
    </svg>
  );
}

export function PythPicture({ step }: { step: PythStep }) {
  if (step === "squares" || step === "sum") return <SquaresPicture sum={step === "sum"} />;
  if (step === "proof") return <ProofPicture />;
  return <FindPicture hyp={step === "findHyp"} />;
}

/** `whyHere` labels the button where the steps join another hint (SOH CAH TOA's third side). */
export type PythWords = { why: string; whyHere: string; whyBack: string; whyNext: string; steps: Record<PythStep, string> };

/** The steps on their own, behind a "Why?" button: for the geometry dialog's Pythagoras tool. */
export function PythagorasWhy({ w }: { w: PythWords }) {
  const [at, setAt] = useState<number | null>(null);
  return (
    <>
      <button type="button" className={`live-btn${at !== null ? " on" : ""}`} aria-pressed={at !== null} onClick={() => setAt(at !== null ? null : 0)}>
        💡 {w.why}
      </button>
      {at !== null && (
        <WhySteps at={at} of={PYTH_STEPS.length} text={w.steps[PYTH_STEPS[at]]} back={w.whyBack} next={w.whyNext} onStep={setAt} picture={<PythPicture step={PYTH_STEPS[at]} />} />
      )}
    </>
  );
}
