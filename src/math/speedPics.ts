// The picture with the hard speed questions: a road. Two legs of one journey, each with its distance over it and its
// speed under it; two vehicles setting off from the ends towards each other, the distance between them marked; or one
// vehicle with a head start and another following, the gap the head start made marked (but not measured). The first vehicle is blue, the
// second orange, each with an arrow the way it goes and its speed.
import { C, FONT, r2 } from "./chart";

export type RoadSpec =
  | { kind: "legs"; d1: number; v1: number; d2: number; v2: number }
  | { kind: "meet"; d: number; v1: number; v2: number }
  /** The first vehicle has gone d in its head start of h hours (d is not shown: it is the first step). */
  | { kind: "catch"; d: number; v1: number; v2: number; h: number };

/** How the units are written: km/h, km, h. */
export type RoadUnits = { kmh: string; km: string; h: string };

const W = 520;
const X0 = 30;
const X1 = W - 30;
const Y = 70;

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/** A vehicle at x on the road: a rounded box with two wheels. */
function vehicle(x: number, color: string) {
  return (
    `<rect x="${r2(x - 16)}" y="${Y - 22}" width="32" height="14" rx="5" fill="${color}"/>` +
    `<circle cx="${r2(x - 9)}" cy="${Y - 7}" r="4" fill="${C.ink}"/><circle cx="${r2(x + 9)}" cy="${Y - 7}" r="4" fill="${C.ink}"/>`
  );
}

/** An arrow along the road from x1 to x2 at height y, with a label over its middle. */
function arrow(x1: number, x2: number, y: number, color: string, label: string) {
  const dir = Math.sign(x2 - x1);
  return (
    `<line x1="${r2(x1)}" y1="${y}" x2="${r2(x2 - 8 * dir)}" y2="${y}" stroke="${color}" stroke-width="2.4"/>` +
    `<path d="M ${r2(x2)} ${y} L ${r2(x2 - 10 * dir)} ${y - 5} L ${r2(x2 - 10 * dir)} ${y + 5} Z" fill="${color}"/>` +
    text((x1 + x2) / 2, y - 8, label, 14, color, true)
  );
}

/** A distance marked under the road between x1 and x2: end ticks, a line, the length beneath. */
function span(x1: number, x2: number, y: number, label: string, color: string = C.ink) {
  return (
    `<path d="M ${r2(x1)} ${y - 6} V ${y + 6} M ${r2(x1)} ${y} H ${r2(x2)} M ${r2(x2)} ${y - 6} V ${y + 6}" fill="none" stroke="${color}" stroke-width="1.6"/>` +
    text((x1 + x2) / 2, y + 20, label, 14, color, true)
  );
}

export function roadSvg(s: RoadSpec, u: RoadUnits): { body: string; w: number; h: number } {
  const out: string[] = [`<g ${FONT}>`, `<line x1="${X0}" y1="${Y}" x2="${X1}" y2="${Y}" stroke="${C.grey}" stroke-width="6" stroke-linecap="round"/>`];
  const speed = (v: number) => `${v} ${u.kmh}`;
  if (s.kind === "legs") {
    // The split where the first leg ends, in proportion to the distances.
    const xm = X0 + ((X1 - X0) * s.d1) / (s.d1 + s.d2);
    out.push(`<line x1="${r2(xm)}" y1="${Y - 12}" x2="${r2(xm)}" y2="${Y + 12}" stroke="${C.ink}" stroke-width="2"/>`);
    out.push(`<line x1="${X0}" y1="${Y - 12}" x2="${X0}" y2="${Y + 12}" stroke="${C.ink}" stroke-width="2"/>`, `<line x1="${X1}" y1="${Y - 12}" x2="${X1}" y2="${Y + 12}" stroke="${C.ink}" stroke-width="2"/>`);
    out.push(arrow(X0 + 6, xm - 6, Y - 22, C.blue, speed(s.v1)), arrow(xm + 6, X1 - 6, Y - 22, C.orange, speed(s.v2)));
    out.push(span(X0, xm, Y + 22, `${s.d1} ${u.km}`), span(xm, X1, Y + 22, `${s.d2} ${u.km}`));
  } else if (s.kind === "meet") {
    out.push(vehicle(X0 + 18, C.blue), vehicle(X1 - 18, C.orange));
    out.push(arrow(X0 + 44, X0 + 150, Y - 30, C.blue, speed(s.v1)), arrow(X1 - 44, X1 - 150, Y - 30, C.orange, speed(s.v2)));
    out.push(span(X0, X1, Y + 22, `${s.d} ${u.km}`));
  } else {
    // The follower at the start, the leader its head start further on.
    const xa = X0 + 0.45 * (X1 - X0);
    out.push(vehicle(X0 + 18, C.orange), vehicle(xa, C.blue));
    out.push(arrow(X0 + 44, X0 + 150, Y - 30, C.orange, speed(s.v2)), arrow(xa + 26, xa + 132, Y - 30, C.blue, speed(s.v1)));
    // The gap is the first step of the working, so it is left for the student: only how it was made is shown.
    out.push(span(X0, xa, Y + 22, `? ${u.km}`, C.blue), text((X0 + xa) / 2, Y + 64, `${s.h} ${u.h}`, 13, C.grey));
  }
  out.push("</g>");
  return { body: out.join(""), w: W, h: s.kind === "catch" ? Y + 74 : Y + 52 };
}
