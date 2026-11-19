// Practice: Relations. Easy decides whether a relation on {1, 2, 3} or {1, …, 4}, drawn as arrows, is reflexive,
// symmetric or transitive (a yes when one pair is missing names that pair); medium lists the equivalence class of k
// under "m divides x − y" (k left out of its own class named); hard lists the minimal or maximal elements of a set
// ordered by divides, drawn as a Hasse diagram (only the smallest, or only the largest, named).
import { fill } from "../chart";
import { breaks, closeUnder, covers, esc, extremes, option, POSET_POOL, primeFactors, REL_PROPS, setTex, shuffled, type Pair, type RelProp } from "../logicSets";
import type { Exercise, Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
const g = (svg: string, w: number, h: number): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h, w });

/** The elements as dots round a circle, each pair (x, y) an arrow from x to y, each (x, x) a loop. */
function arrowsPic(R: readonly Pair[], n: number): Exercise["pic"] {
  const [cx, cy, rad] = [120, 110, 72];
  const at = (k: number) => {
    const t = n === 3 ? -Math.PI / 2 + ((k - 1) * 2 * Math.PI) / 3 : -Math.PI * 0.75 + ((k - 1) * Math.PI) / 2;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)];
  };
  let svg = "";
  for (const [x, y] of R) {
    const [px, py] = at(x);
    if (x === y) {
      const [ox, oy] = [(px - cx) / rad, (py - cy) / rad];
      svg += `<circle cx="${px + ox * 24}" cy="${py + oy * 24}" r="11" fill="none" stroke="#1971c2" stroke-width="2"/>`;
      continue;
    }
    const [qx, qy] = at(y);
    const len = Math.hypot(qx - px, qy - py);
    const [ux, uy] = [(qx - px) / len, (qy - py) / len];
    // Two arrows between the same dots sit side by side.
    const [sx, sy] = [-uy * 5, ux * 5];
    const [ax, ay, bx, by] = [px + ux * 17 + sx, py + uy * 17 + sy, qx - ux * 19 + sx, qy - uy * 19 + sy];
    const head = `${bx + ux * 8},${by + uy * 8} ${bx - uy * 5},${by + ux * 5} ${bx + uy * 5},${by - ux * 5}`;
    svg += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#1971c2" stroke-width="2"/><polygon points="${head}" fill="#1971c2"/>`;
  }
  for (let k = 1; k <= n; k++) {
    const [px, py] = at(k);
    svg += `<circle cx="${px}" cy="${py}" r="14" fill="#fff" stroke="#1e1e1e" stroke-width="2"/><text x="${px}" y="${py + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#1e1e1e">${k}</text>`;
  }
  return g(svg, 240, 220);
}

const pairsTex = (R: readonly Pair[]) => `\\{${R.map(([x, y]) => `(${x}, ${y})`).join(", ")}\\}`;

/** A relation on {1, …, n} that has the property or, when `has` is false, lacks it by one pair. */
export function relationWith(r: Rng, n: number, prop: RelProp, has: boolean): Pair[] {
  for (;;) {
    const raw: Pair[] = [];
    for (let x = 1; x <= n; x++) for (let y = 1; y <= n; y++) if (r.next() < 0.3) raw.push([x, y]);
    let R = closeUnder(raw, n, prop);
    if (!has) {
      const drop = (p: Pair) => (R = R.filter((q) => q !== p));
      if (prop === "reflexive") drop(r.pick(R.filter(([x, y]) => x === y)));
      else if (prop === "symmetric") {
        const out = R.filter(([x, y]) => x !== y);
        if (!out.length) continue;
        drop(r.pick(out));
      } else {
        const chains = R.flatMap(([x, y]) => R.filter(([y2, z]) => y2 === y && x !== y && y !== z).map(([, z]) => R.find(([a, b]) => a === x && b === z)!));
        if (!chains.length) continue;
        drop(r.pick(chains));
      }
    }
    if ((breaks(R, n, prop) === null) === has && R.length >= 2 && R.length <= 8) return R;
  }
}

/** Is the relation reflexive, symmetric or transitive? */
export function propPart(R: Pair[], n: number, prop: RelProp, w: PracticeWords): Part {
  const W = w.logic;
  const why = breaks(R, n, prop);
  const options = [option(W.yes), option(W.no)];
  const right = why === null ? 0 : 1;
  const traps: Trap[] = [];
  if (why) {
    const id = prop === "reflexive" ? "missedLoop" : prop === "symmetric" ? "missedReverse" : "missedChain";
    traps.push({ id, a: { k: "pick", options, right: 0 }, vars: { x: why[0], y: why[1] ?? why[0], z: why[2] ?? why[0] } });
  }
  const S = Array.from({ length: n }, (_, i) => i + 1);
  const step = !why
    ? { reflexive: S.map((x) => `(${x}, ${x})`).join(", ") + " \\in R", symmetric: "(x, y) \\in R \\Rightarrow (y, x) \\in R", transitive: "(x, y), (y, z) \\in R \\Rightarrow (x, z) \\in R" }[prop]
    : { reflexive: `(${why[0]}, ${why[0]}) \\notin R`, symmetric: `(${why[0]}, ${why[1]}) \\in R,\\ (${why[1]}, ${why[0]}) \\notin R`, transitive: `(${why[0]}, ${why[1]}), (${why[1]}, ${why[2]}) \\in R,\\ (${why[0]}, ${why[2]}) \\notin R` }[prop];
  return {
    prompt: fill(W.prompt.relProp, { prop: W.rel[prop] }),
    q: `S = ${setTex(S)},\\quad R = ${pairsTex(R)}`,
    pic: arrowsPic(R, n),
    answer: { k: "pick", options, right, traps },
    show: `\\text{${options[right].text}}`,
    plain: options[right].plain,
    format: "pick",
    steps: [step],
  };
}

/** The class of k under "m divides x − y", on {0, …, N}. */
export function classPart(m: number, N: number, k: number, w: PracticeWords): Part {
  const cls = Array.from({ length: N + 1 }, (_, x) => x).filter((x) => (((x - k) % m) + m) % m === 0);
  const traps: Trap[] = cls.length >= 2 ? [{ id: "classWithoutItself", a: { k: "set", vs: cls.filter((x) => x !== k), tol: 1e-9 }, vars: { k } }] : [];
  return {
    prompt: w.logic.prompt.relClass,
    q: `S = \\{0, 1, \\dots, ${N}\\},\\quad x \\sim y \\iff ${m} \\mid x - y.\\qquad [${k}] = \\,?`,
    answer: { k: "set", vs: cls, tol: 1e-9, listed: true, traps },
    show: setTex(cls),
    plain: cls.join("; "),
    format: "elements",
    steps: [`[${k}] = \\{x \\in S : x \\equiv ${k} \\pmod{${m}}\\} = ${setTex(cls)}`],
  };
}

/** The set's Hasse diagram: a row for each number of prime factors, a line up from a to each b it divides directly. */
function hassePic(S: readonly number[]): Exercise["pic"] {
  const ranks = [...new Set(S.map(primeFactors))].sort((a, b) => a - b);
  const W = 300;
  const H = 40 + (ranks.length - 1) * 60 + 40;
  const pos = new Map<number, [number, number]>();
  // Each row after the first in the order of the mean place of what it covers, so fewer lines cross.
  const below = (v: number) => covers(S).filter(([, b]) => b === v).map(([a]) => pos.get(a)?.[0]).filter((x): x is number => x !== undefined);
  const mean = (v: number) => {
    const xs = below(v);
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : W / 2;
  };
  ranks.forEach((k, row) => {
    const xs = S.filter((v) => primeFactors(v) === k);
    if (row > 0) xs.sort((a, b) => mean(a) - mean(b) || a - b);
    xs.forEach((v, i) => pos.set(v, [((i + 1) * W) / (xs.length + 1), H - 26 - row * 60]));
  });
  const lines = covers(S)
    .map(([a, b]) => `<line x1="${pos.get(a)![0]}" y1="${pos.get(a)![1]}" x2="${pos.get(b)![0]}" y2="${pos.get(b)![1]}" stroke="#868e96" stroke-width="2"/>`)
    .join("");
  const dots = S.map((v) => {
    const [x, y] = pos.get(v)!;
    return `<circle cx="${x}" cy="${y}" r="15" fill="#fff" stroke="#1e1e1e" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#1e1e1e">${esc(String(v))}</text>`;
  }).join("");
  return g(lines + dots, W, H);
}

/** The minimal or maximal elements of a set ordered by divides. */
export function extremesPart(S: number[], which: "min" | "max", w: PracticeWords): Part {
  const ext = extremes(S, which);
  const one = which === "min" ? Math.min(...S) : Math.max(...S);
  const traps: Trap[] = ext.length >= 2 ? [{ id: which === "min" ? "smallestOnly" : "largestOnly", a: { k: "set", vs: [one], tol: 1e-9 }, vars: { x: ext.filter((v) => v !== one).join(", ") } }] : [];
  return {
    prompt: which === "min" ? w.logic.prompt.minimal : w.logic.prompt.maximal,
    q: `S = ${setTex(S)}`,
    pic: hassePic(S),
    answer: { k: "set", vs: ext, tol: 1e-9, listed: true, traps },
    show: setTex(ext),
    plain: ext.join("; "),
    format: "elements",
    steps: [covers(S).map(([a, b]) => `${a} \\mid ${b}`).join(",\\ "), setTex(ext)],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const n = r.next() < 0.6 ? 3 : 4;
    const prop = r.pick(REL_PROPS);
    const has = r.next() < 0.5;
    return propPart(relationWith(r, n, prop, has), n, prop, w);
  }
  if (L === 2) {
    const [m, N] = [r.pick([3, 4, 5]), r.int(10, 14)];
    return classPart(m, N, r.int(0, N), w);
  }
  const S = shuffled(r, POSET_POOL)
    .slice(0, 6)
    .sort((a, b) => a - b);
  return extremesPart(S, r.next() < 0.5 ? "min" : "max", w);
};

export default gen;
