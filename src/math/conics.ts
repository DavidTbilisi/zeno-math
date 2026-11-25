// Conic sections (#664). An ellipse is every point whose distances to two pins add up to the string's length 2a; with
// the pins c from the centre it is 2a wide and 2b tall, b² = a² − c², and a circle when the pins meet. A parabola is
// every point as far from a focus (0, p) as from the line y = −p: y = x² ÷ 4p. The piece `pinString` draws both.

/** The piece: ellipse or parabola, the pencil's place (degrees round the ellipse, or x in halves) and the spread. */
export type LivePinString = { kind: "ellipse" | "parabola"; t: number; c: number; x: number; p: number };
export const PIN_START: LivePinString = { kind: "ellipse", t: 40, c: 3, x: 4, p: 2 };
/** Half the string, so the string is 10 long. */
export const PIN_A = 5;
/** The pencil on the ellipse with pins at (±c, 0). */
export function ellipsePoint(t: number, c: number): [number, number] {
  const b = Math.sqrt(PIN_A * PIN_A - c * c);
  return [PIN_A * Math.cos((t * Math.PI) / 180), b * Math.sin((t * Math.PI) / 180)];
}
/** The two lengths of string from the pencil to the pins. */
export const strings = (pt: [number, number], c: number): [number, number] => [Math.hypot(pt[0] + c, pt[1]), Math.hypot(pt[0] - c, pt[1])];
/** A number to at most 2 decimal places. */
export const two = (v: number) => String(Math.round(v * 100) / 100).replace("-", "−");
