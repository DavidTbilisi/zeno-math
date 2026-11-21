// Points and slices on a circle measured clockwise from twelve, as on a clock face, a spinner or a cut-up pie.

export const rad = (deg: number) => (deg * Math.PI) / 180;
/** A point at `deg` clockwise from twelve, as on a clock face or a spinner. */
export const around = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))];
/** A slice of the circle from `from` to `to` degrees (a whole circle when it goes all the way round). */
export const sectorPath = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x0, y0] = around(cx, cy, r, from);
  const [x1, y1] = around(cx, cy, r, to);
  return to - from >= 359.999
    ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`
    : `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${to - from > 180 ? 1 : 0},1 ${x1},${y1}Z`;
};

