// The worked pictures for the ratio questions: the bar model, one row for each of A, B (and C), made of equal parts,
// as many as the ratio says, each part with its size written in it. What the question asks for is green: a row (a
// share, the missing term), the bracket round all of them (the total), or each row's count of parts (the simplest
// form, where the size of a part is what the terms had in common). A part as a fraction of the whole puts all the
// parts in one row with A's green.
import { C, FONT, r2, texAt } from "./chart";

export type RatioSolution =
  /** terms = vs × k: each row vs[i] parts of k. */
  | { pic: "simplify"; vs: number[]; k: number }
  /** vs[0] parts of u are known (u × vs[0]); asked: B's parts, or all of them. Missing: m : n = km : ?, no A and B. */
  | { pic: "partKnown"; vs: number[]; u: number; whole: boolean; missing?: boolean }
  /** total = u × (sum of vs), shared; asked: row `who`. */
  | { pic: "share"; vs: number[]; u: number; who: number }
  /** A's parts as a fraction of all of them. */
  | { pic: "fraction"; vs: number[] };

const ROWS = [
  { name: "A", fill: "#a5d8ff", stroke: C.blue },
  { name: "B", fill: "#ffd8a8", stroke: C.orange },
  { name: "C", fill: "#d0bfff", stroke: "#7048e8" },
];
const GREEN = { fill: "#b2f2bb", stroke: C.green };
const sum = (vs: number[]) => vs.reduce((s, v) => s + v, 0);

/** The written working, as LaTeX lines; a square is one part. */
export function ratioSteps(s: RatioSolution): string[] {
  const names = s.vs.map((_, i) => ROWS[i].name);
  const P = "\\square";
  if (s.pic === "simplify") {
    const terms = s.vs.map((v) => v * s.k);
    return [`${terms.join(" : ")} = ${terms.map((t) => `(${t} \\div ${s.k})`).join(" : ")}`, `= ${s.vs.join(" : ")}`];
  }
  if (s.pic === "partKnown") {
    const [m, n] = s.vs;
    const head = [`${s.missing ? "" : "A = "}${m}${P} = ${m * s.u}`, `1${P} = ${m * s.u} \\div ${m} = ${s.u}`];
    if (s.whole) return [...head, `A + B = ${m + n}${P} = ${m + n} \\times ${s.u} = ${(m + n) * s.u}`];
    return [...head, `${s.missing ? "?" : "B"} = ${n}${P} = ${n} \\times ${s.u} = ${n * s.u}`];
  }
  const t = sum(s.vs);
  if (s.pic === "share") return [`${s.vs.join(" + ")} = ${t}`, `${t}${P} = ${t * s.u}`, `1${P} = ${t * s.u} \\div ${t} = ${s.u}`, `${names[s.who]} = ${s.vs[s.who]} \\times ${s.u} = ${s.vs[s.who] * s.u}`];
  return [`${names.join(" + ")} = ${s.vs.join(" + ")} = ${t}${P}`, `A = ${s.vs[0]}${P} = \\frac{${s.vs[0]}}{${t}}`];
}

const H = 38;
const GAP = 14;

function text(x: number, y: number, s: string, size: number, color: string, anchor = "middle", bold = true) {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/** A row of `count` parts `pw` wide from x, each with its size written in it (none when size is null). */
function parts(out: string[], x: number, y: number, pw: number, count: number, c: { fill: string; stroke: string }, size: number | null, green = 0) {
  for (let i = 0; i < count; i++) {
    const cc = i < green ? GREEN : c;
    out.push(`<rect x="${r2(x + i * pw)}" y="${y}" width="${r2(pw)}" height="${H}" fill="${cc.fill}" stroke="${cc.stroke}" stroke-width="1.6"/>`);
    if (size !== null) out.push(text(x + i * pw + pw / 2, y + H / 2 + 5, String(size), pw >= 34 ? 14 : 12, C.ink, "middle", false));
  }
}

/** A bracket down the right of the rows, from y1 to y2 at x, with its label. */
function bracket(out: string[], x: number, y1: number, y2: number, label: string, color: string) {
  out.push(`<path d="M ${r2(x)} ${y1} h 8 V ${y2} h -8" fill="none" stroke="${color}" stroke-width="2"/>`);
  out.push(text(x + 16, (y1 + y2) / 2 + 6, label, 17, color, "start"));
}

export function ratioSvg(s: RatioSolution): { body: string; w: number; h: number } {
  const out: string[] = [];
  const x0 = 46;
  const most = s.pic === "fraction" ? sum(s.vs) : Math.max(...s.vs);
  const pw = Math.min(64, 340 / most);
  const right = x0 + most * pw;
  const rowY = (i: number) => 10 + i * (H + GAP);
  if (s.pic === "fraction") {
    // All the parts in one row, A's green: A's share is A's parts out of all of them.
    const t = sum(s.vs);
    s.vs.forEach((v, i) => {
      const y = rowY(i);
      out.push(text(x0 - 14, y + H / 2 + 6, ROWS[i].name, 18, ROWS[i].stroke));
      parts(out, x0, y, pw, v, ROWS[i], null);
    });
    const y = rowY(s.vs.length) + 34;
    out.push(text(x0 - 14, y + H / 2 + 6, `${s.vs.map((_, i) => ROWS[i].name).join("+")}`, 15, C.ink, "end"));
    let x = x0;
    s.vs.forEach((v, i) => {
      parts(out, x, y, pw, v, i === 0 ? GREEN : ROWS[i], null);
      x += v * pw;
    });
    out.push(`<path d="M ${r2(x0)} ${y + H + 8} v 8 H ${r2(x0 + s.vs[0] * pw)} v -8" fill="none" stroke="${C.green}" stroke-width="2"/>`);
    out.push(text(x0 + (s.vs[0] * pw) / 2, y + H + 34, String(s.vs[0]), 16, C.green));
    out.push(`<path d="M ${r2(x0)} ${y - 6} v -8 H ${r2(x0 + t * pw)} v 8" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
    out.push(text(x0 + (t * pw) / 2, y - 20, String(t), 16, C.ink));
    out.push(texAt(`\\frac{${s.vs[0]}}{${t}}`, right + 20, y + H / 2, "start", 1.1, C.green).svg);
    return { body: out.join(""), w: right + 80, h: y + H + 44 };
  }
  const u = s.pic === "simplify" ? s.k : s.u;
  s.vs.forEach((v, i) => {
    const y = rowY(i);
    const asked = (s.pic === "partKnown" && !s.whole && i === 1) || (s.pic === "share" && i === s.who);
    if (!(s.pic === "partKnown" && s.missing)) out.push(text(x0 - 14, y + H / 2 + 6, ROWS[i].name, 18, ROWS[i].stroke));
    parts(out, x0, y, pw, v, asked ? GREEN : ROWS[i], u);
    const end = x0 + v * pw + 10;
    if (s.pic === "simplify") {
      // The term, and how many parts of k it is: the simplest form, in green.
      out.push(text(right + 14, y + H / 2 + 6, String(v * u), 17, C.ink, "start"));
      out.push(text(right + 14 + String(v * u).length * 11 + 8, y + H / 2 + 6, "→", 17, C.grey, "start", false));
      out.push(text(right + 14 + String(v * u).length * 11 + 34, y + H / 2 + 6, String(v), 19, C.green, "start"));
    } else if (s.pic === "share" || s.pic === "partKnown") {
      // Each row's amount at its end: the known one plain, the asked one green.
      const known = s.pic === "partKnown" && i === 0;
      if (known || asked) out.push(text(end, y + H / 2 + 6, String(v * u), 17, asked ? C.green : C.ink, "start"));
    }
  });
  const yEnd = rowY(s.vs.length - 1) + H;
  const bx = right + (s.pic === "simplify" ? 110 : 56);
  if (s.pic === "share") bracket(out, bx, 10, yEnd, String(sum(s.vs) * u), C.ink);
  if (s.pic === "partKnown" && s.whole) bracket(out, bx, 10, yEnd, String(sum(s.vs) * u), C.green);
  return { body: out.join(""), w: bx + 60, h: yEnd + 14 };
}

export function renderRatio(spec: RatioSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = ratioSvg(spec);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const ph = pic.h + 20;
  const h = ph + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${r2(ph)})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${r2(h)}" viewBox="0 0 ${w} ${r2(h)}"><rect width="${w}" height="${r2(h)}" fill="#ffffff"/><g ${FONT} transform="translate(${r2((w - pic.w) / 2)} 10)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
