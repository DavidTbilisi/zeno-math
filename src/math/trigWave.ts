// Trigonometric graphs and equations (#663). y = a·sin(bx) + d is the height of a point on a wheel of radius a whose
// centre is at height d, turning b times while x goes round 360°: the amplitude is a, the period 360° ÷ b and the
// midline y = d. A level y = c meets the wave where sin(bx) = (c − d) ÷ a: two angles each turn, α and 180° − α,
// repeated every period. The piece `wheelWave` turns the wheel and traces the wave beside it.

/** The piece: the angle turned, the radius a, the speed b, the centre's height d and the level c (halves). */
export type LiveWheelWave = { angle: number; a: number; b: number; d: number; c: number };
export const WHEEL_START: LiveWheelWave = { angle: 60, a: 2, b: 1, d: 0, c: 1 };
export const WAVE_TURN = 720;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** The wave's height at x degrees. */
export const waveAt = (s: Pick<LiveWheelWave, "a" | "b" | "d">, x: number) => s.a * Math.sin(rad(s.b * x)) + s.d;
/** Where a·sin(bx) + d = c for 0° ≤ x < 360°, to the nearest tenth of a degree, in order. */
export function levelSolutions(s: Pick<LiveWheelWave, "a" | "b" | "d">, c: number) {
  const v = (c - s.d) / s.a;
  if (Math.abs(v) > 1 + 1e-12) return [];
  const al = (Math.asin(Math.max(-1, Math.min(1, v))) * 180) / Math.PI;
  const out = new Set<number>();
  for (const base of [al, 180 - al])
    for (let k = -1; k <= s.b + 1; k++) {
      const x = Math.round(((base + 360 * k) / s.b) * 10) / 10;
      if (x >= 0 && x < 360) out.add(x === 0 ? 0 : x);
    }
  return [...out].sort((p, q) => p - q);
}

/** A wave picture for questions: y = f(x) from 0° to 360° with the given y range, gridlines every 90° and 1. */
export function waveSvg(f: (x: number) => number, lo: number, hi: number) {
  const [w, h, l, t] = [400, (hi - lo) * 24, 40, 14];
  const X = (x: number) => l + (x / 360) * w;
  const Y = (y: number) => t + (hi - y) * 24;
  const out: string[] = [];
  const font = 'font-family="system-ui, sans-serif"';
  for (let y = lo; y <= hi; y++) {
    out.push(`<line x1="${X(0)}" y1="${Y(y)}" x2="${X(360)}" y2="${Y(y)}" stroke="${y === 0 ? "#212529" : "#e9ecef"}" stroke-width="${y === 0 ? 1.5 : 1}"/>`);
    out.push(`<text x="${X(0) - 6}" y="${Y(y) + 4}" font-size="11" text-anchor="end" ${font} fill="#868e96">${String(y).replace("-", "−")}</text>`);
  }
  for (let x = 0; x <= 360; x += 90) {
    out.push(`<line x1="${X(x)}" y1="${Y(hi)}" x2="${X(x)}" y2="${Y(lo)}" stroke="${x === 0 ? "#212529" : "#e9ecef"}" stroke-width="${x === 0 ? 1.5 : 1}"/>`);
    out.push(`<text x="${X(x)}" y="${Y(lo) + 16}" font-size="11" text-anchor="middle" ${font} fill="#868e96">${x}°</text>`);
  }
  const pts = Array.from({ length: 361 }, (_, x) => `${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(" ");
  out.push(`<polyline points="${pts}" fill="none" stroke="#1971c2" stroke-width="2.5"/>`);
  return { body: out.join(""), w: w + l + 20, h: h + t + 26 };
}
