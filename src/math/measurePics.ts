// The measuring instruments of the measuring questions: a ruler with a pencil lying along it, a kitchen scale's dial,
// and a measuring jug with water in it. Each has a scale whose labelled marks go up in big steps and whose small marks
// split those steps into equal parts, so the reading needs the size of one small step first. Also the reading of
// typed measures: "2 m 35 cm", "1kg 450g", "235", in any of the three languages' unit words.
import { C, FONT, r2 } from "./chart";
import type { MeasureUnit } from "./practice";

export type Pic = { body: string; w: number; h: number };

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/** A ruler from 0 to `max` cm with a pencil from `a` to `b` above it (whole or half centimetres). */
export function rulerPic(a: number, b: number, max: number, cm: string): Pic {
  const k = 32;
  const x0 = 24;
  const X = (v: number) => x0 + v * k;
  const [top, h] = [64, 46];
  const out: string[] = [`<g ${FONT}>`];
  // The pencil: a yellow body, a wooden tip and a dark point at b, a pink eraser at a.
  const py = 26;
  out.push(`<rect x="${r2(X(a))}" y="${py}" width="${r2(Math.max(0, X(b) - X(a) - 22))}" height="20" fill="#fcc419" stroke="${C.ink}" stroke-width="1.4"/>`);
  out.push(`<rect x="${r2(X(a))}" y="${py}" width="10" height="20" fill="#faa2c1" stroke="${C.ink}" stroke-width="1.4"/>`);
  out.push(`<path d="M ${r2(X(b) - 22)} ${py} L ${r2(X(b))} ${py + 10} L ${r2(X(b) - 22)} ${py + 20} Z" fill="#f3d9b1" stroke="${C.ink}" stroke-width="1.4"/>`);
  out.push(`<path d="M ${r2(X(b) - 7)} ${py + 6.8} L ${r2(X(b))} ${py + 10} L ${r2(X(b) - 7)} ${py + 13.2} Z" fill="${C.ink}"/>`);
  // Dashed guides from the pencil's ends down to the scale.
  for (const v of [a, b]) out.push(`<line x1="${r2(X(v))}" y1="${py + 20}" x2="${r2(X(v))}" y2="${top}" stroke="${C.grey}" stroke-dasharray="3 3"/>`);
  out.push(`<rect x="${x0 - 14}" y="${top}" width="${r2(max * k + 50)}" height="${h}" rx="3" fill="#fff9db" stroke="${C.ink}" stroke-width="1.6"/>`);
  for (let i = 0; i <= 2 * max; i++) {
    const v = i / 2;
    const whole = i % 2 === 0;
    out.push(`<line x1="${r2(X(v))}" y1="${top}" x2="${r2(X(v))}" y2="${top + (whole ? 16 : 9)}" stroke="${C.ink}" stroke-width="${whole ? 1.6 : 1}"/>`);
    if (whole) out.push(text(X(v), top + 32, String(v), 13));
  }
  out.push(text(X(max) + 22, top + 32, cm, 12, C.grey));
  out.push("</g>");
  return { body: out.join(""), w: r2(max * k + x0 + 46), h: top + h + 4 };
}

/** The marks of a scale from 0 to max: labelled every `major`, a small mark every `minor`. */
const marks = (max: number, major: number, minor: number) => Array.from({ length: Math.round(max / minor) + 1 }, (_, i) => ({ v: i * minor, label: (i * minor) % major === 0 }));

/** A kitchen scale's dial from 0 to max with its needle at v; the unit under the centre. */
export function dialPic(v: number, max: number, major: number, minor: number, unit: string): Pic {
  const R = 110;
  const [cx, cy] = [R + 20, R + 20];
  // 0 at the bottom left, max at the bottom right, clockwise over the top: 270°.
  const ang = (x: number) => ((-135 + (270 * x) / max) * Math.PI) / 180;
  const out: string[] = [`<g ${FONT}>`, `<circle cx="${cx}" cy="${cy}" r="${R + 12}" fill="#e9ecef" stroke="${C.ink}" stroke-width="2"/>`, `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffffff" stroke="${C.ink}" stroke-width="1.4"/>`];
  for (const m of marks(max, major, minor)) {
    const a = ang(m.v);
    const [s, c] = [Math.sin(a), -Math.cos(a)];
    const r0 = R - (m.label ? 16 : 8);
    out.push(`<line x1="${r2(cx + r0 * s)}" y1="${r2(cy + r0 * c)}" x2="${r2(cx + (R - 2) * s)}" y2="${r2(cy + (R - 2) * c)}" stroke="${C.ink}" stroke-width="${m.label ? 2 : 1}"/>`);
    if (m.label) out.push(text(cx + (R - 32) * s, cy + (R - 32) * c + 5, String(m.v), 13));
  }
  const a = ang(v);
  out.push(`<line x1="${cx}" y1="${cy}" x2="${r2(cx + (R - 10) * Math.sin(a))}" y2="${r2(cy - (R - 10) * Math.cos(a))}" stroke="${C.red}" stroke-width="3" stroke-linecap="round"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${C.red}"/>`, text(cx, cy + 46, unit, 16, C.grey, true), "</g>");
  return { body: out.join(""), w: 2 * R + 40, h: 2 * R + 40 };
}

/** A measuring jug from 0 to max with water up to v; the scale on its left side, the unit at the top. */
export function jugPic(v: number, max: number, major: number, minor: number, unit: string): Pic {
  const [x0, y0, w, h] = [70, 30, 120, 250];
  const Y = (x: number) => y0 + h - (h * x) / (max * 1.1);
  const out: string[] = [`<g ${FONT}>`];
  out.push(`<rect x="${x0}" y="${r2(Y(v))}" width="${w}" height="${r2(y0 + h - Y(v))}" fill="#a5d8ff" opacity="0.8"/>`);
  out.push(`<line x1="${x0}" y1="${r2(Y(v))}" x2="${x0 + w}" y2="${r2(Y(v))}" stroke="${C.blue}" stroke-width="2.4"/>`);
  out.push(`<path d="M ${x0} ${y0} V ${y0 + h} H ${x0 + w} V ${y0}" fill="none" stroke="${C.ink}" stroke-width="2.4"/>`);
  // The handle on the right.
  out.push(`<path d="M ${x0 + w} ${y0 + 40} C ${x0 + w + 40} ${y0 + 40} ${x0 + w + 40} ${y0 + 150} ${x0 + w} ${y0 + 150}" fill="none" stroke="${C.ink}" stroke-width="2.4"/>`);
  for (const m of marks(max, major, minor)) {
    if (m.v === 0) continue;
    out.push(`<line x1="${x0}" y1="${r2(Y(m.v))}" x2="${x0 + (m.label ? 26 : 14)}" y2="${r2(Y(m.v))}" stroke="${C.ink}" stroke-width="${m.label ? 2 : 1}"/>`);
    if (m.label) out.push(text(x0 - 8, Y(m.v) + 5, String(m.v), 13, C.ink, false, "end"));
  }
  out.push(text(x0 + w / 2, y0 - 10, unit, 15, C.grey, true), "</g>");
  return { body: out.join(""), w: x0 + w + 50, h: y0 + h + 10 };
}

/** The unit each typed word stands for: the language's own (w.units) and the Latin ones everywhere. */
export function unitWords(own: Record<MeasureUnit, string>): Map<string, MeasureUnit> {
  const m = new Map<string, MeasureUnit>();
  const latin: Record<MeasureUnit, string[]> = { km: ["km"], m: ["m"], cm: ["cm"], kg: ["kg"], g: ["g"], l: ["l", "L", "ℓ"], ml: ["ml", "mL"] };
  for (const u of Object.keys(latin) as MeasureUnit[]) for (const s of [own[u], ...latin[u]]) m.set(s, u);
  return m;
}

/**
 * A typed measure as numbers with their units: "2 m 35 cm" → [[2, m], [35, cm]], "235" → [[235, null]]. Null when
 * something can't be read: a word that is no unit, or a number missing.
 */
export function readMeasure(s: string, words: Map<string, MeasureUnit>): [number, MeasureUnit | null][] | null {
  const t = s.trim();
  const parts = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*([^\d\s.,]*)\s*/g)];
  if (!parts.length || parts.map((p) => p[0]).join("").trim() !== t) return null;
  const out: [number, MeasureUnit | null][] = [];
  for (const [, n, word] of parts) {
    const u = word === "" ? null : words.get(word);
    if (u === undefined) return null;
    out.push([Number(n.replace(",", ".")), u]);
  }
  return out;
}
