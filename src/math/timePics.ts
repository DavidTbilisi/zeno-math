// Time on the clock: times as minutes after midnight, read and written on the 12-hour and the 24-hour clock, lengths of
// time in hours and minutes, and the two pictures of the time questions. The clock face goes with a question that
// asks what it shows; the time line is the worked solution of a question about how long, or when: hops from the
// start to the next o'clock, on by whole hours, then the minutes left, each hop labelled, the answer green.
import { C, FONT, r2 } from "./chart";

export const DAY = 24 * 60;
export const HALF_DAY = 12 * 60;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const two = (n: number) => String(n).padStart(2, "0");

/** A time on a clock with hands: 3:05, and 12:40 for twenty to one (night or day). */
export function clock12(t: number): string {
  const m = mod(t, HALF_DAY);
  return `${Math.floor(m / 60) || 12}:${two(m % 60)}`;
}

/** A time on the 24-hour clock, the hour in two digits: 09:05, 15:40, 00:20. */
export const clock24 = (t: number) => `${two(Math.floor(mod(t, DAY) / 60))}:${two(mod(t, DAY) % 60)}`;

/** A clock time as LaTeX (the colon without the spacing of a relation). */
export const timeTex = (s: string) => s.replace(":", "{:}");

/**
 * A typed clock time: "3:05", "3.05", "15 40", "03:05", or a bare hour ("3" for three o'clock). The minutes are given
 * as typed, so 2:75 comes back with minutes 75 for the checker to say why that is no time.
 */
export function readClock(s: string): { h: number; m: number } | null {
  const t = s.trim().replace(/[∶：]/g, ":");
  // Two digits for the minutes, or three when they were added up past 99 (5:55 + 45 min typed as 5:100).
  const hm = t.match(/^(\d{1,2})\s*[:.,\s]\s*(\d{2,3})$/);
  if (hm) return { h: Number(hm[1]), m: Number(hm[2]) };
  if (/^\d{1,2}\s*[:.,\s]\s*\d$/.test(t)) return null;
  const h = t.match(/^(\d{1,2})$/);
  return h ? { h: Number(h[1]), m: 0 } : null;
}

/**
 * The first letters a language writes hours and minutes with ("ч" for ч and час, "м" for мин and минут). The Latin h
 * and m are read in every language.
 */
export type DurationStems = { h: string; min: string };

/**
 * A typed length of time, in minutes: "85", "85 min", "1 h 25 min", "1h25", "1:25", "1 hour 25 minutes". A bare number
 * is minutes; "h:mm" and a number of hours followed by a bare number are hours and minutes. `over` is set when hours
 * come with 60 minutes or more (1 h 65 min): time counted in hundreds, not sixties; `mins` is the minutes typed.
 */
export function readDuration(s: string, stems: DurationStems): { m: number; over: boolean; mins: number } | null {
  const t = s.trim().toLowerCase().replace(/[∶：]/g, ":");
  const hm = t.match(/^(\d{1,3})\s*:\s*(\d{1,2})$/);
  if (hm) return { m: 60 * Number(hm[1]) + Number(hm[2]), over: Number(hm[2]) >= 60, mins: Number(hm[2]) };
  const parts = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*([^\d\s.,]*)[\s.,]*/g)];
  if (!parts.length || parts.map((p) => p[0]).join("").trim() !== t.replace(/\s+$/, "")) return null;
  let hours: number | null = null;
  let minutes: number | null = null;
  for (const [, n, unit] of parts) {
    const v = Number(n.replace(",", "."));
    const isH = unit !== "" && [stems.h, "h"].some((x) => unit.startsWith(x));
    const isM = unit !== "" && [stems.min, "m"].some((x) => unit.startsWith(x));
    if (unit !== "" && !isH && !isM) return null;
    // A bare number after the hours is the minutes; a bare number alone is minutes.
    if (isH || (unit === "" && hours === null && minutes === null && parts.length > 1)) {
      if (hours !== null) return null;
      hours = v;
    } else {
      if (minutes !== null) return null;
      minutes = v;
    }
  }
  const m = 60 * (hours ?? 0) + (minutes ?? 0);
  return Number.isFinite(m) ? { m: Math.round(m * 1e6) / 1e6, over: hours !== null && (minutes ?? 0) >= 60, mins: minutes ?? 0 } : null;
}

/** A length of time in hours and minutes as LaTeX: 1 h 25 min, 2 h, 40 min. */
export function durationTex(m: number, u: { h: string; min: string }): string {
  const [h, r] = [Math.floor(m / 60), m % 60];
  // An \enspace between the hours and the minutes: a space inside the text is lost after Georgian letters, whose
  // width MathJax underestimates.
  return [h ? `${h}\\text{ ${u.h}}` : "", r || !h ? `${r}\\text{ ${u.min}}` : ""].filter(Boolean).join("\\enspace ");
}

/** The same as typed text: "1 h 25 min". */
export function durationText(m: number, u: { h: string; min: string }): string {
  const [h, r] = [Math.floor(m / 60), m % 60];
  return [h ? `${h} ${u.h}` : "", r || !h ? `${r} ${u.min}` : ""].filter(Boolean).join(" ");
}

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false) {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="middle" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/**
 * A clock face showing time t, centred at (cx, cy) with radius R: twelve numbers, a tick for each minute (longer at the
 * five-minute marks), the hour hand short and thick, moved on between the hours as on a real clock, the minute hand
 * longer and thin. `marks` colours the hands and the numbers they point between (the worked solution of a reading question).
 */
export function clockFace(t: number, cx: number, cy: number, R: number, marks = false): string {
  const m = mod(t, HALF_DAY);
  const out: string[] = [`<g ${FONT}>`, `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffffff" stroke="${C.ink}" stroke-width="3"/>`];
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180;
    const [s, c] = [Math.sin(a), -Math.cos(a)];
    const long = i % 5 === 0;
    const r0 = R - (long ? 10 : 5);
    out.push(`<line x1="${r2(cx + r0 * s)}" y1="${r2(cy + r0 * c)}" x2="${r2(cx + (R - 2) * s)}" y2="${r2(cy + (R - 2) * c)}" stroke="${C.ink}" stroke-width="${long ? 2.4 : 1}"/>`);
  }
  const hour = Math.floor(m / 60) || 12;
  const minuteAt = (m % 60) / 5;
  for (let n = 1; n <= 12; n++) {
    const a = (n * 30 * Math.PI) / 180;
    const color = marks && n === hour ? C.blue : marks && m % 5 === 0 && (minuteAt || 12) === n ? C.orange : C.ink;
    out.push(text(cx + 0.74 * R * Math.sin(a), cy - 0.74 * R * Math.cos(a) + 0.08 * R, String(n), r2(0.19 * R), color, marks && color !== C.ink));
  }
  const hand = (deg: number, len: number, width: number, color: string) => {
    const a = (deg * Math.PI) / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${r2(cx + len * Math.sin(a))}" y2="${r2(cy - len * Math.cos(a))}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  };
  out.push(hand(m / 2, 0.4 * R, 7, marks ? C.blue : C.ink));
  // The minute hand stops short of the numbers, so the one it points at can be read.
  out.push(hand((m % 60) * 6, 0.64 * R, 4, marks ? C.orange : C.ink));
  out.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="${C.ink}"/>`, "</g>");
  return out.join("");
}

/** The clock face as a question's picture: body, width and height. */
export function clockPic(t: number): { body: string; w: number; h: number } {
  const R = 92;
  return { body: clockFace(t, R + 6, R + 6, R), w: 2 * R + 12, h: 2 * R + 12 };
}

/** The worked solution of a time question. */
export type TimeSolution =
  /** What the clock shows: the face with the hour hand and its number blue, the minute hand and its number orange. */
  | { pic: "read"; t: number; steps: string[] }
  /**
   * From one time to another on a time line, by the next o'clock, whole hours, then the minutes left. `ask` is what
   * the question wanted: when it ends, when it started (the hops go back from the end) or how long it took.
   */
  | { pic: "line"; from: number; to: number; h24: boolean; ask: "end" | "start" | "length"; units: { h: string; min: string }; steps: string[] };

/** The hops from one time to a later one: to the next o'clock, the whole hours, then the minutes left (none empty). */
export function hops(from: number, to: number): { a: number; b: number }[] {
  const out: { a: number; b: number }[] = [];
  let at = from;
  const toHour = Math.min(to, from + mod(60 - mod(from, 60), 60));
  if (toHour > at) out.push({ a: at, b: (at = toHour) });
  const whole = 60 * Math.floor((to - at) / 60);
  if (whole > 0) out.push({ a: at, b: (at += whole) });
  if (to > at) out.push({ a: at, b: to });
  return out;
}

export function timeLineSvg(s: Extract<TimeSolution, { pic: "line" }>): { body: string; w: number; h: number } {
  const hs = hops(s.from, s.to);
  // Each hop's width grows with its length, but stays readable whether it is 5 minutes or 6 hours.
  const width = (h: { a: number; b: number }) => Math.max(96, Math.min(240, 1.6 * (h.b - h.a)));
  const x0 = 40;
  const xs = [x0];
  for (const h of hs) xs.push(xs[xs.length - 1] + width(h));
  const y = 110;
  const end = xs[xs.length - 1];
  const show = (t: number) => (s.h24 ? clock24(t) : clock12(t));
  const out: string[] = [`<line x1="${x0 - 20}" y1="${y}" x2="${r2(end + 20)}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`];
  const times = [s.from, ...hs.map((h) => h.b)];
  times.forEach((t, i) => {
    const answer = (s.ask === "end" && i === times.length - 1) || (s.ask === "start" && i === 0);
    const key = i === 0 || i === times.length - 1;
    out.push(`<line x1="${r2(xs[i])}" y1="${y - 9}" x2="${r2(xs[i])}" y2="${y + 9}" stroke="${C.ink}" stroke-width="${key ? 2.4 : 1.6}"/>`);
    out.push(text(xs[i], y + 32, show(t), key ? 17 : 15, answer ? C.green : key ? C.ink : C.grey, key));
  });
  // The hops: forward from the start, or back from the end when the start is what was asked.
  hs.forEach((h, i) => {
    const [x1, x2] = s.ask === "start" ? [xs[i + 1], xs[i]] : [xs[i], xs[i + 1]];
    const mid = (x1 + x2) / 2;
    const top = y - 64;
    const [ux, uy] = [x2 - mid, y - top];
    const len = Math.hypot(ux, uy);
    const [bx, by] = [x2 - (10 * ux) / len, y - (10 * uy) / len];
    const color = s.ask === "length" ? C.green : C.purple;
    out.push(
      `<path d="M ${r2(x1)} ${y - 4} Q ${r2(mid)} ${top} ${r2(x2)} ${y - 4}" fill="none" stroke="${color}" stroke-width="2"/>` +
        `<path d="M ${r2(x2)} ${y - 4} L ${r2(bx - (5 * uy) / len)} ${r2(by - 4 + (5 * ux) / len)} L ${r2(bx + (5 * uy) / len)} ${r2(by - 4 - (5 * ux) / len)} Z" fill="${color}"/>`,
    );
    const label = `${s.ask === "start" ? "−" : "+"} ${durationText(h.b - h.a, s.units)}`;
    out.push(text(mid, top + 10, label, 15, color, true));
  });
  return { body: out.join(""), w: end + 40, h: y + 48 };
}

export function timeSvg(s: TimeSolution): { body: string; w: number; h: number } {
  if (s.pic === "line") return timeLineSvg(s);
  const R = 110;
  return { body: clockFace(s.t, R + 8, R + 8, R, true), w: 2 * R + 16, h: 2 * R + 16 };
}

export function renderTime(spec: TimeSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = timeSvg(spec);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const ph = pic.h + 10;
  const h = ph + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${r2(ph)})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${r2(h)}" viewBox="0 0 ${w} ${r2(h)}"><rect width="${w}" height="${r2(h)}" fill="#ffffff"/><g ${FONT} transform="translate(${r2((w - pic.w) / 2)} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
