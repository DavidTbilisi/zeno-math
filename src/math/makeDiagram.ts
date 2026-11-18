// Make the diagram: the numbers are given, and the player draws them. Easy: a picture graph — tap where each row's last
// face goes, half a face being the left half of a place when the key is even. Medium: a line graph of the temperature —
// a point for each hour at its height. Hard: a pie chart — drag the dots on the edge until each fruit's slice is its
// share of 360°. The slips named: as many faces as the number (each face taken for 1), a point at as many lines as
// degrees (each line taken for 1), and a slice of as many degrees as children.
import { C, FONT, r2 } from "./chart";
import { face, hourText, lineQuestion, PIE, pictoQuestion, pieQuestion, type LineTask, type Pic, type PictoTask, type PieTask } from "./dataGraphs";
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type MakeLevel = 1 | 2 | 3;
export type MakeTask = { kind: "picto"; t: PictoTask } | { kind: "line"; t: LineTask } | { kind: "pie"; t: PieTask };

export function makeTask(level: MakeLevel, next: () => number): MakeTask {
  if (level === 1) return { kind: "picto", t: pictoQuestion(next).task };
  if (level === 2) return { kind: "line", t: lineQuestion(next).task };
  return { kind: "pie", t: pieQuestion(next).task };
}

/** Faces worth 5, then 2, then 10 with halves; lines in fives, in twos (odd numbers between lines), in fives; three pies, the last of four slices all wrong at the start. */
export const MAKE_LADDER: { level: MakeLevel; seed: number }[] = [
  { level: 1, seed: 971 },
  { level: 1, seed: 960 },
  { level: 1, seed: 974 },
  { level: 2, seed: 981 },
  { level: 2, seed: 986 },
  { level: 2, seed: 990 },
  { level: 3, seed: 990 },
  { level: 3, seed: 1003 },
  { level: 3, seed: 1000 },
];

/** What has been drawn: the faces in each row, each hour's temperature (null before its point is put), or where each slice ends. */
export type Drawn = (number | null)[];

/** A face may be halved when the key is even: half of 2 is 1, half of 10 is 5. */
export const halves = (t: PictoTask) => t.key % 2 === 0;
/** The places for faces in a row: enough for 8 faces, and for the slip of as many faces as the number when it fits. */
export const SLOTS = 12;
/** A pie slice moves in steps of 15°. */
export const PIE_STEP = 15;

/** The drawing as numbers: the faces, the points, or the slices' angles (from where they end, the first from the top). */
export function drawnOf(m: MakeTask, d: Drawn): number[] {
  if (m.kind === "picto") return m.t.rows.map((_, i) => d[i] ?? 0);
  if (m.kind === "line") return m.t.vs.map((_, k) => d[k] ?? -1);
  const ends = pieEnds(m.t, d);
  return m.t.slices.map((_, i) => ends[i] - (i ? ends[i - 1] : 0));
}
/** Where each slice ends, in degrees clockwise from the top: as drawn, or the circle shared out evenly to start with. */
export function pieEnds(t: PieTask, d: Drawn): number[] {
  const k = t.slices.length;
  const even = Array.from({ length: k }, (_, i) => Math.round(((i + 1) * 360) / k / PIE_STEP) * PIE_STEP);
  return even.map((e, i) => (i === k - 1 ? 360 : (d[i] ?? e)));
}
/** What each part should be: the faces, the temperatures, the angles. */
export function targetOf(m: MakeTask): number[] {
  if (m.kind === "picto") return m.t.rows.map((r) => r.v / m.t.key);
  if (m.kind === "line") return m.t.vs;
  return m.t.slices.map((s) => s.deg);
}
/** The parts not yet right. */
export function wrongParts(m: MakeTask, d: Drawn): number[] {
  const [now, want] = [drawnOf(m, d), targetOf(m)];
  return want.flatMap((v, i) => (now[i] !== v ? [i] : []));
}
/** A part drawn with the slip: as many faces as the number, a point as many lines up as degrees, a slice of as many degrees as children. −1 when none. */
export function slipAt(m: MakeTask, d: Drawn): number {
  const now = drawnOf(m, d);
  if (m.kind === "picto") return m.t.key > 1 ? m.t.rows.findIndex((r, i) => now[i] === r.v) : -1;
  if (m.kind === "line") return m.t.vs.findIndex((v, k) => v > 0 && now[k] === v * m.t.step);
  return m.t.slices.findIndex((s, i) => now[i] === pieChildren(m.t, i) && s.deg !== now[i]);
}
export const pieChildren = (t: PieTask, i: number) => (t.slices[i].deg * t.n) / 360;

export type MakeNotice = "half" | "between" | "pie" | "streak10";
export const MAKE_NOTICES: MakeNotice[] = ["half", "between", "pie", "streak10"];
/** What a diagram made right first time shows: half a face, a point between two lines, a whole pie; ten in a row. */
export function makeNotice(m: MakeTask, misses: number, streak: number): MakeNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (m.kind === "picto") return m.t.rows.some((r) => (r.v / m.t.key) % 1 !== 0) ? "half" : null;
  if (m.kind === "line") return m.t.vs.some((v) => v % m.t.step !== 0) ? "between" : null;
  return "pie";
}
export const makeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type LiveMakeDiagram = EndlessGame<MakeNotice, MakeLevel, { kind: "wrong"; slip: number }> &
  TryGame & {
    /** What has been drawn (see Drawn), and the parts found wrong at the last check. */
    drawn: Drawn;
    wrong: number[];
  };
export const makeNow = (d: Pick<LiveMakeDiagram, "mode" | "stage" | "level" | "seed">): MakeTask =>
  d.mode === "puzzle" ? makeTask(MAKE_LADDER[d.stage].level, rng(MAKE_LADDER[d.stage].seed)) : makeTask(d.level, rng(d.seed));

// ---------- where things are ----------

function text(x: number, y: number, s: string | number, size: number, color: string = C.ink, anchor = "middle", bold = false) {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}
const [P_LEFT, P_ROW, P_TOP, P_GAP, P_R] = [56, 44, 14, 34, 14];
export const pictoGeom = (t: PictoTask) => ({
  w: P_LEFT + SLOTS * P_GAP + 12,
  h: P_TOP + t.rows.length * P_ROW + 54,
  rowY: (i: number) => P_TOP + i * P_ROW + P_ROW / 2,
  /** The row under a height, or −1. */
  rowAt: (y: number) => {
    const i = Math.floor((y - P_TOP) / P_ROW);
    return i >= 0 && i < t.rows.length ? i : -1;
  },
  /** The faces a tap at x asks for: up to the place tapped, half of it when its left half is tapped and halves are allowed. */
  facesAt: (x: number) => {
    const u = (x - P_LEFT) / P_GAP;
    if (u <= 0) return 0;
    const whole = Math.min(SLOTS, Math.ceil(u));
    return halves(t) && u - (whole - 1) <= 0.5 ? whole - 0.5 : whole;
  },
});
const [L_LEFT, L_TOP, L_GAP, L_COL] = [46, 26, 24, 64];
export const lineGeom = (t: LineTask) => {
  const foot = L_TOP + t.lines * L_GAP;
  const grain = t.step === 2 ? 1 : 5;
  return {
    foot,
    grain,
    top: t.step * t.lines,
    w: L_LEFT + 24 + (t.vs.length - 1) * L_COL + 30,
    h: foot + 30,
    X: (k: number) => L_LEFT + 24 + k * L_COL,
    Y: (v: number) => foot - (v / t.step) * L_GAP,
    /** The hour under an x, or −1. */
    colAt: (x: number) => {
      const k = Math.round((x - L_LEFT - 24) / L_COL);
      return k >= 0 && k < t.vs.length && Math.abs(x - (L_LEFT + 24 + k * L_COL)) <= L_COL / 2 ? k : -1;
    },
    /** The temperature at a height, to the scale's grain, on the scale. */
    valueAt: (y: number) => Math.max(0, Math.min(t.step * t.lines, Math.round(((foot - y) / L_GAP) * (t.step / grain)) * grain)),
  };
};
const PIE_R = 110;
export const pieGeom = () => {
  const [cx, cy] = [PIE_R + 50, PIE_R + 44];
  return {
    cx,
    cy,
    R: PIE_R,
    w: 2 * cx,
    h: 2 * cy + 6,
    at: (deg: number, r: number): [number, number] => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)],
    /** The angle of a point, clockwise from the top, to the step. */
    angleAt: (x: number, y: number) => {
      const a = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
      return (Math.round((a < 0 ? a + 360 : a) / PIE_STEP) * PIE_STEP) % 360;
    },
  };
};
/** Slice i's end moved to `deg` (within reach of the top and of 360°), the other ends pushed along to stay a step apart. */
export function moveEnd(t: PieTask, d: Drawn, i: number, deg: number): Drawn {
  const k = t.slices.length;
  const ends = pieEnds(t, d).slice(0, -1);
  ends[i] = Math.max((i + 1) * PIE_STEP, Math.min(360 - (k - 1 - i) * PIE_STEP, deg));
  for (let j = i + 1; j < k - 1; j++) ends[j] = Math.max(ends[j], ends[j - 1] + PIE_STEP);
  for (let j = i - 1; j >= 0; j--) ends[j] = Math.min(ends[j], ends[j + 1] - PIE_STEP);
  return ends;
}

// ---------- the pictures ----------

const BG = { wrong: "#ffe8cc", done: "#d3f9d8" };
/** The diagram as drawn so far: wrong parts orange, all green when done. */
export function makeSvg(m: MakeTask, d: Drawn, o: { wrong?: number[]; done?: boolean } = {}): Pic {
  const wrong = o.wrong ?? [];
  const out: string[] = [`<g ${FONT}>`];
  if (m.kind === "picto") {
    const G = pictoGeom(m.t);
    const faces = drawnOf(m, d);
    m.t.rows.forEach((row, i) => {
      const y = G.rowY(i);
      const bg = o.done ? BG.done : wrong.includes(i) ? BG.wrong : null;
      if (bg) out.push(`<rect x="4" y="${r2(y - P_ROW / 2 + 2)}" width="${G.w - 8}" height="${P_ROW - 4}" rx="6" fill="${bg}"/>`);
      out.push(text(26, y + 9, row.icon, 24));
      for (let k = 0; k < SLOTS; k++) {
        const x = P_LEFT + P_GAP / 2 + k * P_GAP;
        if (k < Math.ceil(faces[i])) out.push(face(x, y, P_R, k + 1 > faces[i]));
        else out.push(`<circle cx="${x}" cy="${y}" r="${P_R}" fill="none" stroke="#dee2e6" stroke-dasharray="3 3"/>`);
      }
    });
    const foot = P_TOP + m.t.rows.length * P_ROW;
    out.push(`<line x1="${P_LEFT - 6}" y1="${P_TOP}" x2="${P_LEFT - 6}" y2="${foot}" stroke="${C.ink}" stroke-width="1.6"/>`);
    out.push(face(P_LEFT + 20, foot + 30, P_R, false), text(P_LEFT + 44, foot + 35, `= ${m.t.key}`, 16, C.ink, "start", true), "</g>");
    return { body: out.join(""), w: G.w, h: G.h };
  }
  if (m.kind === "line") {
    const G = lineGeom(m.t);
    for (let k = 0; k <= m.t.lines; k++) {
      const v = k * m.t.step;
      out.push(`<line x1="${L_LEFT}" y1="${G.Y(v)}" x2="${G.w - 10}" y2="${G.Y(v)}" stroke="${k ? "#dee2e6" : C.ink}" stroke-width="${k ? 1 : 2}"/>`);
      out.push(text(L_LEFT - 8, G.Y(v) + 4, v, 13, "#495057", "end"));
    }
    out.push(`<line x1="${L_LEFT}" y1="${L_TOP - 14}" x2="${L_LEFT}" y2="${G.foot}" stroke="${C.ink}" stroke-width="2"/>`, text(L_LEFT - 8, L_TOP - 12, "°C", 13, C.grey, "end", true));
    m.t.vs.forEach((_, k) => {
      out.push(`<line x1="${G.X(k)}" y1="${L_TOP}" x2="${G.X(k)}" y2="${G.foot}" stroke="#e9ecef"/>`);
      out.push(text(G.X(k), G.foot + 20, hourText(m.t.from + k), 12, "#495057"));
    });
    const pts = drawnOf(m, d);
    // The line joins the points put so far, hour after hour.
    for (let k = 0; k + 1 < pts.length; k++)
      if (pts[k] >= 0 && pts[k + 1] >= 0) out.push(`<line x1="${G.X(k)}" y1="${r2(G.Y(pts[k]))}" x2="${G.X(k + 1)}" y2="${r2(G.Y(pts[k + 1]))}" stroke="${o.done ? C.green : C.blue}" stroke-width="2.4"/>`);
    pts.forEach((v, k) => {
      if (wrong.includes(k)) out.push(`<line x1="${G.X(k) - 12}" y1="${r2(G.Y(m.t.vs[k]))}" x2="${G.X(k) + 12}" y2="${r2(G.Y(m.t.vs[k]))}" stroke="${C.green}" stroke-width="3" stroke-dasharray="5 3"/>`);
      if (v >= 0) out.push(`<circle cx="${G.X(k)}" cy="${r2(G.Y(v))}" r="${wrong.includes(k) ? 6 : 5}" fill="${o.done ? C.green : wrong.includes(k) ? C.orange : C.blue}"/>`);
    });
    out.push("</g>");
    return { body: out.join(""), w: G.w, h: G.h };
  }
  const G = pieGeom();
  const ends = pieEnds(m.t, d);
  const rings: string[] = [];
  m.t.slices.forEach((s, i) => {
    const [from, to] = [i ? ends[i - 1] : 0, ends[i]];
    const [x0, y0] = G.at(from, G.R);
    const [x1, y1] = G.at(to, G.R);
    const p = `M ${G.cx} ${G.cy} L ${r2(x0)} ${r2(y0)} A ${G.R} ${G.R} 0 ${to - from > 180 ? 1 : 0} 1 ${r2(x1)} ${r2(y1)} Z`;
    out.push(`<path d="${p}" fill="${o.done ? BG.done : PIE[i]}" stroke="${C.ink}" stroke-width="1.6"/>`);
    if (wrong.includes(i)) rings.push(`<path d="${p}" fill="none" stroke="${C.orange}" stroke-width="3.5" stroke-linejoin="round"/>`);
    const mid = (from + to) / 2;
    const [lx, ly] = G.at(mid, to - from <= 45 ? G.R * 0.7 : G.R * 0.58);
    out.push(text(lx, ly + 5, `${to - from}°`, 14, C.ink, "middle", true));
    const [ix, iy] = G.at(mid, G.R + 26);
    out.push(text(ix, iy + 9, s.icon, 24));
  });
  out.push(...rings);
  // The top, where the first slice starts, and a dot to drag at each slice's end.
  out.push(`<line x1="${G.cx}" y1="${G.cy - G.R - 8}" x2="${G.cx}" y2="${G.cy - G.R + 8}" stroke="${C.ink}" stroke-width="3"/>`);
  if (!o.done)
    ends.slice(0, -1).forEach((e) => {
      const [x, y] = G.at(e, G.R);
      out.push(`<circle cx="${r2(x)}" cy="${r2(y)}" r="9" fill="#fff" stroke="${C.blue}" stroke-width="3"/>`);
    });
  out.push("</g>");
  return { body: out.join(""), w: G.w, h: G.h };
}
