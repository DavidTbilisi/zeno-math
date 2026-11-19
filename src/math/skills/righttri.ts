// Practice: Right triangles.
import { C, esc, FONT, r2 } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

/** The steepest angle a right-triangle picture draws to scale. */
export const STEEPEST = 66;

/**
 * The centre of the angle label in a right-triangle picture: θ at (bx, by), base bw long, right angle at the far end.
 * It is the spot nearest the angle's bisector, 60 px out, where a box tw wide and 12 high lies inside the triangle with
 * 3 px to spare, clear of the right-angle mark and at least 20 px from the vertex, so that an arc fits inside it.
 */
export function angleLabelAt(bx: number, by: number, bw: number, th: number, tw: number): [number, number] {
  const [ix, iy] = [bx + 60 * Math.cos(th / 2), by - 60 * Math.sin(th / 2)];
  const cx = bx + bw;
  let best: [number, number] = [ix, iy];
  let bestD = Infinity;
  for (let x = bx; x <= cx; x += 2) {
    for (let y = by - bw * Math.tan(th); y <= by; y += 2) {
      const [l, r, t, b] = [x - tw / 2, x + tw / 2, y - 6, y + 6];
      const inside = b <= by - 3 && r <= cx - 3 && (l - bx) * Math.sin(th) - (by - t) * Math.cos(th) >= 3;
      const clear = (r < cx - 17 || b < by - 17) && Math.hypot(l - bx, by - b) >= 20;
      const d = Math.hypot(x - ix, y - iy);
      if (inside && clear && d < bestD) [best, bestD] = [[x, y], d];
    }
  }
  return best;
}

const gen: Gen = (r, L, w) => {
  const ang = r.int(20, 70);
  const t = (ang * Math.PI) / 180;
  const S = (v: number) => String(Math.round(v * 10) / 10);
  let given: string;
  let known: { opp?: string; adj?: string; hyp?: string; ang?: string };
  let ask: "opp" | "adj" | "hyp" | "ang";
  let v: number;
  const hyp = r.int(6, 20);
  if (L === 1) {
    known = { hyp: String(hyp), ang: String(ang) };
    ask = r.pick(["opp", "adj"] as const);
    v = ask === "opp" ? hyp * Math.sin(t) : hyp * Math.cos(t);
    given = "angHyp";
  } else if (L === 2) {
    const side = r.int(4, 15);
    if (r.next() < 0.5) {
      known = { adj: String(side), ang: String(ang) };
      ask = r.pick(["opp", "hyp"] as const);
      v = ask === "opp" ? side * Math.tan(t) : side / Math.cos(t);
      given = "angAdj";
    } else {
      known = { opp: String(side), ang: String(ang) };
      ask = r.pick(["adj", "hyp"] as const);
      v = ask === "adj" ? side / Math.tan(t) : side / Math.sin(t);
      given = "angOpp";
    }
  } else {
    const [a, b] = [r.int(3, 15), r.int(3, 15)];
    const kind = r.int(0, 2);
    ask = "ang";
    if (kind === 0) {
      known = { opp: String(a), adj: String(b) };
      v = (Math.atan(a / b) * 180) / Math.PI;
      given = "oppAdj";
    } else {
      const h = Math.max(a, b) + r.int(1, 6);
      const s = Math.min(a, b);
      if (kind === 1) {
        known = { opp: String(s), hyp: String(h) };
        v = (Math.asin(s / h) * 180) / Math.PI;
        given = "oppHyp";
      } else {
        known = { adj: String(s), hyp: String(h) };
        v = (Math.acos(s / h) * 180) / Math.PI;
        given = "adjHyp";
      }
    }
  }
  // The values the trig tool needs; unknown sides get a placeholder it ignores for this case.
  const spec = { topic: "right", given, ask, opp: known.opp ?? "3", adj: known.adj ?? "4", hyp: known.hyp ?? S(hyp), ang: known.ang ?? "30" };
  const pic = (x0: number, y0: number) => {
    // θ at bottom left, right angle at bottom right; roughly to scale, except that a steeper angle is drawn
    // as STEEPEST so that its label still fits inside.
    const th = (Math.min(ask === "ang" ? v : ang, STEEPEST) * Math.PI) / 180;
    const [bw, bh] = Math.tan(th) * 210 <= 120 ? [210, 210 * Math.tan(th)] : [120 / Math.tan(th), 120];
    const [bx, by] = [x0 + 20, y0 + 135];
    const [cx, ay] = [r2(bx + bw), r2(by - bh)];
    const lab = (x: number, y: number, s: string, color: string, anchor = "middle") =>
      `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="15" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
    const side = (k: "opp" | "adj" | "hyp") => (ask === k ? "x" : known[k] ?? "");
    const angLabel = ask === "ang" ? "θ" : `${known.ang}°`;
    const [lx, ly] = angleLabelAt(bx, by, bw, th, angLabel.length * 9);
    // The arc stops short of the label and of the right-angle mark.
    const rad = r2(Math.max(10, Math.min(Math.hypot(lx - angLabel.length * 4.5 - bx, ly + 6 - by) - 6, bw - 20)));
    const parts = [
      `<polygon points="${bx},${by} ${cx},${by} ${cx},${ay}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`,
      `<path d="M${cx - 14},${by} L${cx - 14},${by - 14} L${cx},${by - 14}" fill="none" stroke="${C.blue}" stroke-width="1.6"/>`,
      `<path d="M${bx + rad},${by} A${rad},${rad} 0 0 0 ${r2(bx + rad * Math.cos(th))},${r2(by - rad * Math.sin(th))}" fill="none" stroke="${C.orange}" stroke-width="2"/>`,
      lab(lx, ly + 5.5, angLabel, C.orange),
    ];
    const hs = side("hyp");
    const os = side("opp");
    const as = side("adj");
    if (as) parts.push(lab((bx + cx) / 2, by + 20, as, as === "x" ? C.red : C.ink));
    if (os) parts.push(lab(cx + 10, (by + ay) / 2 + 5, os, os === "x" ? C.red : C.ink, "start"));
    if (hs) parts.push(lab((bx + cx) / 2 - 12, (by + ay) / 2 - 6, hs, hs === "x" ? C.red : C.ink, "end"));
    return parts.join("");
  };
  return {
    prompt: ask === "ang" ? w.prompts.rightAngle : w.prompts.rightSide,
    q: "",
    pic: { svg: pic, h: 160, w: 300 },
    answer: num(v, 0.0051),
    show: `${ask === "ang" ? "\\theta" : "x"} \\approx ${dp(v, 2)}${ask === "ang" ? "^\\circ" : ""}`,
    plain: dp(v, 2),
    format: "dp2",
    solution: { kind: "trig", spec },
  };
};

export default gen;
