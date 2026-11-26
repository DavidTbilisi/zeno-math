// Slope fields (#669). The piece `dropPoint` draws the field of y′ = 0.5y, of the logistic y′ = 0.5y(1 − y/8) or of
// y′ = x − y; a point dropped on it flows along the field, and the curve it traces is the solution through that point.

/** The piece: which equation, and the dropped point (in halves of a unit). */
export type LiveDropPoint = { which: number; x0: number; y0: number };
export const DROP_START: LiveDropPoint = { which: 1, x0: 0, y0: 1 };
export const DROP_BOX = { x0: 0, x1: 8, y0: -2, y1: 10 } as const;
/** The slope y′ at (x, y) for each equation. */
export const fieldSlope = (which: number, x: number, y: number) => (which === 0 ? 0.5 * y : which === 1 ? 0.5 * y * (1 - y / 8) : x - y);

/** The solution through (x0, y0) by RK4 steps, forward to x = 8 and back to x = 0, stopping once it leaves far off. */
export function solution(which: number, x0: number, y0: number, h = 0.05): [number, number][] {
  const run = (dir: number) => {
    const pts: [number, number][] = [];
    let [x, y] = [x0, y0];
    while (x * dir < (dir > 0 ? DROP_BOX.x1 : -DROP_BOX.x0) - 1e-9 && Math.abs(y) < 40) {
      const s = dir * h;
      const k1 = fieldSlope(which, x, y);
      const k2 = fieldSlope(which, x + s / 2, y + (s / 2) * k1);
      const k3 = fieldSlope(which, x + s / 2, y + (s / 2) * k2);
      const k4 = fieldSlope(which, x + s, y + s * k3);
      y += (s / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      x += s;
      pts.push([x, y]);
    }
    return pts;
  };
  return [...run(-1).reverse(), [x0, y0], ...run(1)];
}
