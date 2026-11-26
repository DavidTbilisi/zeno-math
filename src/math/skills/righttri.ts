// Practice: Right triangles. #716 added ratio reasoning without a calculator and the special triangles. Easy: a side
// from a ratio given as a fraction and another side. Medium: sin A = cos B for the two sharp angles, and the angle whose
// cosine is a given sine. Hard: the 45-45-90 and 30-60-90 triangles, exact. The ratio upside down, the supplement for
// the complement, the cosine of the same angle for the other's, the 30-60-90 sides swapped and the 45-45-90 hypotenuse
// doubled are slips.
import { C, esc, fill, FONT, r2 } from "../chart";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { figurePic, type Figure } from "../simPics";

const TRIPLE = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25]] as const;
const slip = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v, 0.0051), vars });
/** Triangle ABC with the right angle at C, legs BC (up) and AC (along), drawn to its sides. */
const rightTri = (ac: number, bc: number, sides: Figure["sides"], angles: Figure["angles"] = []): Figure => ({
  pts: { A: [0, 0], C: [ac, 0], B: [ac, bc] }, polys: [["A", "C", "B"]], rights: [{ at: "C", from: "A", to: "B" }], sides, angles,
});
const keepTraps = (v: number, traps: Trap[]) =>
  traps.filter((t, i) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6 && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && Math.abs(u.a.v - t.a.v) < 1e-6));

/** The kinds #716 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.trgP;
  if (L === 1) {
    // A side from a ratio: sin A = BC/AB, cos A = AC/AB, tan A = BC/AC.
    const [a, b, h] = r.pick(TRIPLE);
    const m = r.pick([1, 2, 3, 4]);
    const f = r.pick(["sin", "cos", "tan"] as const);
    const [num_, den, ask, given, gv] = f === "sin" ? [a, h, "BC", "AB", h * m] : f === "cos" ? [b, h, "AC", "AB", h * m] : [a, b, "BC", "AC", b * m];
    const v = (num_ * gv) / den;
    const label = (s: string) => (s === ask ? "?" : s === given ? String(gv) : "");
    const fig = rightTri(b, a, [{ a: "A", b: "C", text: label("AC") }, { a: "C", b: "B", text: label("BC") }, { a: "A", b: "B", text: label("AB") }].filter((x) => x.text));
    const ratio = `${num_}/${den}`;
    const word = f === "sin" ? "\\frac{BC}{AB}" : f === "cos" ? "\\frac{AC}{AB}" : "\\frac{BC}{AC}";
    return {
      prompt: fill(W.ratioSide, { f, r: ratio, s: given, v: gv, a: ask }), q: "", pic: figurePic(fig, 200, 150),
      answer: { ...num(v), traps: keepTraps(v, [slip("ratioUpsideDown", r2((gv * den) / num_), { x: r2((gv * den) / num_), r: ratio, f, v })]) },
      show: String(v), plain: String(v), format: "number", steps: [`\\${f} A = ${word} = \\frac{${num_}}{${den}}`, `${ask} = ${gv} \\times \\frac{${num_}}{${den}} = ${v}`],
    };
  }
  if (L === 2 && kind <= 7) {
    // sin θ = cos a: the angles add to 90°, not 180°.
    const a = r.int(12, 78);
    const flip = r.next() < 0.5;
    return {
      prompt: fill(W.cofunction, { f: flip ? "cos" : "sin", g: flip ? "sin" : "cos", a }), q: "",
      answer: { ...num(90 - a), traps: [slip("supplementForComplement", 180 - a, { x: 180 - a, a, v: 90 - a })] },
      show: `${90 - a}^\\circ`, plain: String(90 - a), format: "number", steps: [`\\sin\\theta = \\cos(90^\\circ - \\theta)`, `\\theta = 90^\\circ - ${a}^\\circ = ${90 - a}^\\circ`],
    };
  }
  if (L === 2) {
    // The two sharp angles of a right triangle: sin A = cos B.
    const [a, b, h] = r.pick(TRIPLE);
    const flip = r.next() < 0.5;
    const v = fr(a, h);
    const fig = rightTri(b, a, []);
    return {
      prompt: fill(W.sinCos, { f: flip ? "cos B" : "sin A", g: flip ? "sin A" : "cos B", r: plainFrac(v) }), q: "", pic: figurePic(fig, 200, 150),
      answer: { ...num(v.toNumber(), 1e-9), traps: [{ id: "sameAngleRatio", a: num(b / h, 1e-9), vars: { x: `${b}/${h}`, v: plainFrac(v), f: flip ? "sin A" : "cos B" } }] },
      show: v.tex(), plain: plainFrac(v), format: "fraction", steps: [`\\sin A = \\frac{BC}{AB} = \\cos B`, `= ${v.tex()}`],
    };
  }
  // The special triangles, exact: 45-45-90 sides k, k, k√2; 30-60-90 sides k, k√3, 2k.
  const k = r.int(2, 9);
  const half = kind <= 6;
  const surd = (n: number, root: number) => ({ show: `${n === 1 ? "" : n}\\sqrt{${root}}`, plain: `${n === 1 ? "" : n}sqrt(${root})`, text: `${n === 1 ? "" : n}√${root}` });
  if (half) {
    const toHyp = kind === 5;
    const hyp = surd(k, 2);
    const fig = rightTri(1, 1, [{ a: "A", b: "C", text: toHyp ? String(k) : "" }, { a: "A", b: "B", text: toHyp ? "?" : hyp.text }, { a: "C", b: "B", text: toHyp ? "" : "?" }].filter((x) => x.text), [{ at: "A", from: "C", to: "B", text: "45°" }]);
    if (toHyp)
      return {
        prompt: fill(W.special45, { s: "AC", v: k, a: "AB" }), q: "", pic: figurePic(fig, 170, 170),
        answer: { ...num(k * Math.SQRT2, 1e-9, { surd: true }), traps: [slip("isoscelesHypDoubled", 2 * k, { x: 2 * k, k, v: hyp.text })] },
        show: hyp.show, plain: hyp.plain, format: "exact", steps: [`AB = AC\\sqrt{2} = ${hyp.show}`],
      };
    return {
      prompt: fill(W.special45, { s: "AB", v: hyp.text, a: "BC" }), q: "", pic: figurePic(fig, 170, 170),
      answer: { ...num(k), traps: [slip("isoscelesHypDoubled", (k * Math.SQRT2) / 2, { x: dp((k * Math.SQRT2) / 2, 2), k, v: k })] },
      show: String(k), plain: String(k), format: "number", steps: [`BC = \\frac{AB}{\\sqrt{2}} = \\frac{${hyp.show}}{\\sqrt{2}} = ${k}`],
    };
  }
  // 30-60-90: A = 30° at the long leg's end, so BC (opposite 30°) is the short leg.
  const which = r.pick(["long", "hyp", "short"] as const);
  const long = surd(k, 3);
  const given = which === "short" ? { s: "AB", v: String(2 * k) } : { s: "BC", v: String(k) };
  const fig = rightTri(Math.sqrt(3), 1, [
    { a: "C", b: "B", text: which === "short" ? "?" : String(k) }, { a: "A", b: "C", text: which === "long" ? "?" : "" }, { a: "A", b: "B", text: which === "hyp" ? "?" : which === "short" ? String(2 * k) : "" },
  ].filter((x) => x.text), [{ at: "A", from: "C", to: "B", text: "30°" }, { at: "B", from: "A", to: "C", text: "60°" }]);
  const ask = which === "long" ? "AC" : which === "hyp" ? "AB" : "BC";
  const prompt = fill(W.special30, { s: given.s, v: given.v, a: ask });
  if (which === "long")
    return {
      prompt, q: "", pic: figurePic(fig, 220, 130),
      answer: { ...num(k * Math.sqrt(3), 1e-9, { surd: true }), traps: [slip("specialSidesSwapped", 2 * k, { x: 2 * k, k, v: long.text })] },
      show: long.show, plain: long.plain, format: "exact", steps: [`AC = BC\\sqrt{3} = ${long.show}`],
    };
  if (which === "hyp")
    return {
      prompt, q: "", pic: figurePic(fig, 220, 130),
      answer: { ...num(2 * k), traps: [slip("specialSidesSwapped", k * Math.sqrt(3), { x: long.text, k, v: 2 * k })] },
      show: String(2 * k), plain: String(2 * k), format: "number", steps: [`AB = 2 \\times BC = ${2 * k}`],
    };
  return {
    prompt, q: "", pic: figurePic(fig, 220, 130),
    answer: { ...num(k), traps: [slip("specialSidesSwapped", (2 * k) / Math.sqrt(3), { x: dp((2 * k) / Math.sqrt(3), 2), k, v: k })] },
    show: String(k), plain: String(k), format: "number", steps: [`BC = \\frac{AB}{2} = ${k}`],
  };
}

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
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #716; practical trigonometry dresses these up in settings. */
export const old: Gen = (r, L, w) => {
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
