// Practice: Functions — injective, surjective, bijective. Easy reads the kind off an arrow diagram from A to B
// (bijective picked when something in B is missed or two arrows meet, and injective and surjective swapped, named);
// medium does the same for a rule such as eˣ on ℝ or 2n on ℤ, where the domain and the target decide; hard works out
// (f ∘ g)(k) (g ∘ f named) or f⁻¹(y) (1/f named) for two linear functions.
import { kindOf, MAP_KINDS, MAP_RULES, missed, option, shared, type MapKind, type MapRule } from "../logicSets";
import type { Exercise, Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
const LETTERS = ["a", "b", "c", "d"];

/** The mistakes of a wrong kind picked, for a function of this kind: what is missed, and which two meet where. */
function kindTraps(kind: MapKind, pick: { options: ReturnType<typeof option>[] }, miss: string | undefined, meet: [string, string, string] | undefined): Trap[] {
  const at = (k: MapKind) => ({ k: "pick" as const, options: pick.options, right: MAP_KINDS.indexOf(k) });
  const missedTrap = (k: MapKind): Trap[] => (miss === undefined ? [] : [{ id: "missedTarget", a: at(k), vars: { x: miss } }]);
  const sharedTrap = (k: MapKind): Trap[] => (meet === undefined ? [] : [{ id: "sharedTarget", a: at(k), vars: { x: meet[0], y: meet[1], v: meet[2] } }]);
  if (kind === "injOnly") return [...missedTrap("bij"), { id: "injSurjSwap", a: at("surjOnly") }];
  if (kind === "surjOnly") return [...sharedTrap("bij"), { id: "injSurjSwap", a: at("injOnly") }];
  if (kind === "neither") return [...sharedTrap("injOnly"), ...missedTrap("surjOnly")];
  return [];
}
const kindOptions = (w: PracticeWords) => ({ k: "pick" as const, options: MAP_KINDS.map((k) => option(w.logic.maps[k])), right: 0 });

/** Two ovals, A on the left and B on the right, with an arrow from each x to f(x). */
function arrowsPic(f: readonly number[], m: number): Exercise["pic"] {
  const ys = (k: number) => Array.from({ length: k }, (_, i) => 40 + i * 36 + (4 - k) * 18);
  const [ya, yb] = [ys(f.length), ys(m)];
  const dot = (x: number, y: number, label: string, left: boolean) =>
    `<circle cx="${x}" cy="${y}" r="4" fill="#1e1e1e"/><text x="${left ? x - 12 : x + 12}" y="${y + 5}" text-anchor="${left ? "end" : "start"}" font-size="15" fill="#1e1e1e">${label}</text>`;
  const arrow = (y1: number, y2: number) => {
    const [x1, x2] = [64, 196];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
    const [ex, ey] = [x2 - ux * 7, y2 - uy * 7];
    const head = `${x2 - ux * 2},${y2 - uy * 2} ${ex - uy * 5 - ux * 6},${ey + ux * 5 - uy * 6} ${ex + uy * 5 - ux * 6},${ey - ux * 5 - uy * 6}`;
    return `<line x1="${x1 + ux * 6}" y1="${y1 + uy * 6}" x2="${ex}" y2="${ey}" stroke="#1971c2" stroke-width="2"/><polygon points="${head}" fill="#1971c2"/>`;
  };
  const svg =
    `<ellipse cx="50" cy="94" rx="40" ry="86" fill="#e7f5ff" stroke="#1971c2"/><ellipse cx="210" cy="94" rx="40" ry="86" fill="#fff4e6" stroke="#e8590c"/>` +
    `<text x="50" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#1971c2">A</text><text x="210" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#e8590c">B</text>` +
    f.map((t, i) => arrow(ya[i], yb[t])).join("") +
    ya.map((y, i) => dot(60, y, `${i + 1}`, true)).join("") +
    yb.map((y, i) => dot(200, y, LETTERS[i], false)).join("");
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 202, w: 262 };
}

/** The kind of a function drawn as arrows, from {1, …, n} to {a, …}. */
export function arrowsPart(f: number[], m: number, w: PracticeWords): Part {
  const kind = kindOf(f, m);
  const pick = kindOptions(w);
  const s = shared(f);
  const miss = missed(f, m);
  const traps = kindTraps(kind, pick, miss === null ? undefined : LETTERS[miss], s ? [`${s[0] + 1}`, `${s[1] + 1}`, LETTERS[f[s[0]]]] : undefined);
  const right = MAP_KINDS.indexOf(kind);
  const why = [s ? `f(${s[0] + 1}) = f(${s[1] + 1}) = ${LETTERS[f[s[0]]]}` : "", miss === null ? "" : `${LETTERS[miss]} \\notin f(A)`].filter(Boolean);
  return {
    prompt: w.logic.prompt.mapKind,
    q: "f\\colon A \\to B",
    pic: arrowsPic(f, m),
    answer: { ...pick, right, traps },
    show: `\\text{${pick.options[right].text}}`,
    plain: pick.options[right].plain,
    format: "pick",
    steps: [f.map((t, i) => `f(${i + 1}) = ${LETTERS[t]}`).join(",\\ "), ...why],
  };
}

/** The kind of a function given by its rule, its domain and its target. */
export function rulePart(rule: MapRule, w: PracticeWords): Part {
  const pick = kindOptions(w);
  const right = MAP_KINDS.indexOf(rule.kind);
  return {
    prompt: w.logic.prompt.mapKind,
    q: rule.tex,
    answer: { ...pick, right, traps: kindTraps(rule.kind, pick, rule.missed, rule.shared) },
    show: `\\text{${pick.options[right].text}}`,
    plain: pick.options[right].plain,
    format: "pick",
    steps: [rule.why],
  };
}

/** A function from {1, …, n} to {a, …, m} of the given kind, at random. */
export function arrowsOfKind(r: Rng, kind: MapKind): { f: number[]; m: number } {
  for (;;) {
    const [n, m] = kind === "injOnly" ? [3, 4] : kind === "surjOnly" ? [4, 3] : r.next() < 0.5 ? [3, 3] : [4, 4];
    const f = Array.from({ length: n }, () => r.int(0, m - 1));
    if (kindOf(f, m) === kind) return { f, m };
  }
}

const linTex = (a: number, b: number) => `${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`.replace(/ \+ 0$/, "");

/** (f ∘ g)(k) or f⁻¹(y) for linear f and g. */
export function computePart(r: Rng, w: PracticeWords): Part {
  const coef = () => r.pick([2, 3, 4, -2, -3]);
  const [a, b, c, d] = [coef(), r.int(-5, 5), coef(), r.int(-5, 5)];
  if (r.next() < 0.5) {
    const k = r.int(-3, 3);
    const gk = c * k + d;
    const v = a * gk + b;
    const wrong = c * (a * k + b) + d;
    const traps: Trap[] = wrong !== v && wrong !== -v ? [{ id: "compositionOrder", a: { k: "num", v: wrong, tol: 1e-9 } }] : [];
    return {
      prompt: w.logic.prompt.compute,
      q: `f(x) = ${linTex(a, b)},\\ g(x) = ${linTex(c, d)}.\\qquad (f \\circ g)(${k}) = \\,?`,
      answer: { k: "num", v, tol: 1e-9, traps },
      show: `${v}`,
      plain: `${v}`,
      format: "number",
      steps: [`g(${k}) = ${gk}`, `f(${gk}) = ${v}`],
    };
  }
  const t = r.int(-4, 4);
  const y = a * t + b;
  const fy = a * y + b;
  const traps: Trap[] = fy !== 0 && 1 / fy !== t && 1 / fy !== -t ? [{ id: "inverseReciprocal", a: { k: "num", v: 1 / fy, tol: 1e-9 }, vars: { y } }] : [];
  return {
    prompt: w.logic.prompt.compute,
    q: `f(x) = ${linTex(a, b)}.\\qquad f^{-1}(${y}) = \\,?`,
    answer: { k: "num", v: t, tol: 1e-9, traps },
    show: `${t}`,
    plain: `${t}`,
    format: "number",
    steps: [`${linTex(a, b)} = ${y}`, `${a}x = ${y - b}`, `x = ${t}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const { f, m } = arrowsOfKind(r, r.pick(MAP_KINDS));
    return arrowsPart(f, m, w);
  }
  if (L === 2) return rulePart(r.pick(MAP_RULES), w);
  return computePart(r, w);
};

export default gen;
