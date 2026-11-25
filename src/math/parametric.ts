// Parametric and polar curves (#665). A point at (x(t), y(t)) moves as t grows: per unit of t it goes dx/dt across and
// dy/dt up, so the curve's slope is dy/dx = (dy/dt) ÷ (dx/dt) and its speed √((dx/dt)² + (dy/dt)²). A polar curve is
// the same with x = r cos θ and y = r sin θ. The piece `tracePath` moves a point along three curves with its velocity.

/** The piece: which curve, and the step along it. */
export type LiveTracePath = { which: number; step: number };
export const TRACE_START: LiveTracePath = { which: 0, step: 4 };
export const TRACE_STEPS = [16, 24, 24] as const;
type At = { x: number; y: number; dx: number; dy: number; t: number; r?: number };
/** The point and its velocity at a step: the ball in quarters of t, the circle and the cardioid in 15° steps. */
export function traceAt(which: number, step: number): At {
  if (which === 0) {
    const t = step / 4;
    return { t, x: 2 * t - 4, y: 4 * t - t * t, dx: 2, dy: 4 - 2 * t };
  }
  const th = (step * 15 * Math.PI) / 180;
  if (which === 1) return { t: step * 15, x: 3 * Math.cos(th), y: 3 * Math.sin(th), dx: -3 * Math.sin(th), dy: 3 * Math.cos(th) };
  const r = 2 + 2 * Math.cos(th);
  const dr = -2 * Math.sin(th);
  return { t: step * 15, r, x: r * Math.cos(th), y: r * Math.sin(th), dx: dr * Math.cos(th) - r * Math.sin(th), dy: dr * Math.sin(th) + r * Math.cos(th) };
}
/** A number to at most 2 decimal places, with a real minus. */
export const n2 = (v: number) => String(Math.round(v * 100) / 100 || 0).replace("-", "−");
