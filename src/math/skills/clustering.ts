// Practice: Nearest neighbours and k-means.
import { C, fill, FONT, r2 } from "../chart";
import { fr, num, plainFrac } from "../practiceKit";
import type { Exercise, Gen } from "../practiceTypes";

/** Two different classes' points, both on the 0–8 grid. */
type Dot = { x: number; y: number; c: 0 | 1 };

const sq = (p: { x: number; y: number }, q: { x: number; y: number }) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

/** Points on a 0–8 grid: class A as blue dots, B as orange triangles (with a key when there are both), and the marked points as crosses with names. */
function dotsPic(dots: Dot[], marks: { x: number; y: number; name: string }[]): Exercise["pic"] {
  const [S, P, N] = [22, 26, 8];
  const X = (x: number) => P + x * S;
  const Y = (y: number) => 10 + (N - y) * S;
  const dot = (x: number, y: number, c: 0 | 1) => (c === 0 ? `<circle cx="${x}" cy="${y}" r="5.5" fill="${C.blue}"/>` : `<path d="M${x} ${y - 6.5} l6 10.5 h-12 z" fill="${C.orange}"/>`);
  let body = "";
  for (let i = 0; i <= N; i++)
    body += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(N)}" stroke="#dee2e6"/><line x1="${X(0)}" y1="${Y(i)}" x2="${X(N)}" y2="${Y(i)}" stroke="#dee2e6"/>`;
  for (let i = 0; i <= N; i += 2)
    body += `<text x="${X(i)}" y="${Y(0) + 20}" font-size="11" text-anchor="middle" fill="${C.grey}" ${FONT}>${i}</text><text x="${X(0) - 12}" y="${Y(i) + 4}" font-size="11" text-anchor="end" fill="${C.grey}" ${FONT}>${i}</text>`;
  for (const d of dots) body += dot(X(d.x), Y(d.y), d.c);
  for (const m of marks)
    body += `<path d="M${X(m.x) - 5} ${Y(m.y) - 5} l10 10 m0 -10 l-10 10" stroke="${C.ink}" stroke-width="2.4"/><text x="${X(m.x) + 7}" y="${Y(m.y) - 6}" font-size="13" font-style="italic" fill="${C.ink}" ${FONT}>${m.name}</text>`;
  const key = dots.some((d) => d.c === 1);
  if (key)
    ([0, 1] as const).forEach((c) => {
      body += `${dot(X(N) + 26, Y(N) + 4 + c * 24, c)}<text x="${X(N) + 38}" y="${Y(N) + 9 + c * 24}" font-size="13" fill="${C.ink}" ${FONT}>${"AB"[c]}</text>`;
    });
  const [w, h] = [X(N) + (key ? 56 : 16), Y(0) + 26];
  return { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w };
}

/** Points with their coordinates, in LaTeX. */
const ptsTex = (ps: { x: number; y: number }[]) => ps.map((p) => `(${p.x}, ${p.y})`).join(",\\ ");

const gen: Gen = (r, L, w) => {
  const cell = () => ({ x: r.int(0, 8), y: r.int(0, 8) });
  if (L === 1) {
    // k-NN: four points of each class, P somewhere among them, every squared distance from P different.
    const k = r.pick([3, 5] as const);
    let P: { x: number; y: number }, dots: Dot[];
    do {
      P = { x: r.int(2, 6), y: r.int(2, 6) };
      dots = [];
      while (dots.length < 8) {
        const p = cell();
        if ((p.x !== P.x || p.y !== P.y) && !dots.some((d) => d.x === p.x && d.y === p.y)) dots.push({ ...p, c: dots.length < 4 ? 0 : 1 });
      }
    } while (new Set(dots.map((d) => sq(d, P))).size < 8);
    const near = [...dots].sort((a, b) => sq(a, P) - sq(b, P)).slice(0, k);
    const votesA = near.filter((d) => d.c === 0).length;
    const right = votesA * 2 > k ? 0 : 1;
    const options = ["A", "B"].map((n) => ({ text: n, plain: n, tex: "" }));
    return {
      prompt: fill(w.prompts.knnVote, { k }),
      q: `\\begin{array}{l} \\mathrm{A}: ${ptsTex(dots.slice(0, 4))} \\\\ \\mathrm{B}: ${ptsTex(dots.slice(4))} \\\\ P = (${P.x}, ${P.y}) \\end{array}`,
      pic: dotsPic(dots, [{ ...P, name: "P" }]),
      answer: { k: "pick", options, right },
      show: `${votesA} \\times \\mathrm{A}, \\ ${k - votesA} \\times \\mathrm{B}`,
      plain: options[right].plain,
      format: "pick",
      steps: near.map((d) => `d^2(P, (${d.x}, ${d.y})) = ${sq(d, P)} \\ \\ \\mathrm{${d.c === 0 ? "A" : "B"}}`),
    };
  }
  // k-means with two centres: each point joins the nearer, no point halfway, at least two points for each.
  let pts: { x: number; y: number }[], c1: { x: number; y: number }, c2: { x: number; y: number }, joins: number[];
  do {
    c1 = cell();
    c2 = cell();
    pts = [];
    while (pts.length < 6) {
      const p = cell();
      if (!pts.some((q) => q.x === p.x && q.y === p.y) && sq(p, c1) > 0 && sq(p, c2) > 0) pts.push(p);
    }
    joins = pts.map((p) => (sq(p, c1) < sq(p, c2) ? 1 : sq(p, c1) > sq(p, c2) ? 2 : 0));
  } while (joins.includes(0) || joins.filter((j) => j === 1).length < 2 || joins.filter((j) => j === 2).length < 2);
  const q = `\\begin{array}{l} ${ptsTex(pts)} \\\\ c_1 = (${c1.x}, ${c1.y}), \\ c_2 = (${c2.x}, ${c2.y}) \\end{array}`;
  const pic = dotsPic(pts.map((p) => ({ ...p, c: 0 })), [{ ...c1, name: "c₁" }, { ...c2, name: "c₂" }]);
  const assign = pts.map((p, i) => `(${p.x}, ${p.y}): \\ ${sq(p, c1)} ${joins[i] === 1 ? "<" : ">"} ${sq(p, c2)} \\to c_${joins[i]}`);
  if (L === 2) {
    const mine = pts.filter((_, i) => joins[i] === 1);
    const [mx, my] = [fr(mine.reduce((s, p) => s + p.x, 0), mine.length), fr(mine.reduce((s, p) => s + p.y, 0), mine.length)];
    return {
      prompt: w.prompts.kmCentroid,
      q,
      pic,
      answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 },
      show: `\\left(${mx.tex()}, ${my.tex()}\\right)`,
      plain: `(${plainFrac(mx)}; ${plainFrac(my)})`,
      format: "point",
      steps: [...assign, `c_1' = \\left(\\frac{${mine.map((p) => p.x).join(" + ")}}{${mine.length}}, \\frac{${mine.map((p) => p.y).join(" + ")}}{${mine.length}}\\right) = \\left(${mx.tex()}, ${my.tex()}\\right)`],
    };
  }
  const ds = pts.map((p) => Math.min(sq(p, c1), sq(p, c2)));
  const v = ds.reduce((s, x) => s + x, 0);
  return { prompt: w.prompts.kmInertia, q, pic, answer: num(v), show: String(v), plain: String(v), format: "number", steps: [...assign, `${ds.join(" + ")} = ${v}`] };
};

export default gen;
