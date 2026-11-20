// Practice: linear programming in two variables. Easy says whether a point is feasible (a point on the boundary
// called infeasible, one broken constraint missed, named) or finds the objective at the corner where two constraint
// lines meet (x and y swapped, named); medium maximises px + qy over x, y ≥ 0 and two ≤ constraints, given as a
// workshop's hours or as inequalities (the meet of the lines missed, an intercept outside the region, named); hard
// minimises a cost over two ≥ constraints, where the region is unbounded (0 at the infeasible origin, the largest
// corner, an intercept outside the region, named).
import { F, exact, pickOf, word, type NumSlip } from "../calculusTwo";
import type { Frac } from "../fraction";
import { drawLp, fmax, fmin, maxCorners, minCorners, otherIntercepts, value, type Lp, type Pt } from "../optimisation";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const term = (k: number, v: string) => (k === 1 ? v : `${k}${v}`);
const lhs = (a: number, b: number) => `${term(a, "x")} + ${term(b, "y")}`;
const ptTex = ([x, y]: Pt) => `(${x.tex()}, ${y.tex()})`;
const constraints = (lp: Lp, rel: string) => `${lhs(lp.a1, lp.b1)} ${rel} ${lp.c1}, \\quad ${lhs(lp.a2, lp.b2)} ${rel} ${lp.c2}, \\quad x, y \\ge 0`;
/** Each corner and its value, as a step: (0, 0) \to 0, … */
const cornerSteps = (lp: Lp, pts: Pt[]) => `${pts.map((p) => `${ptTex(p)} \\to ${value(lp, p).tex()}`).join(", \\quad ")}`;
const objective = (lp: Lp) => `z = ${lhs(lp.p, lp.q)}`;

function feasiblePart(r: Rng, w: PracticeWords): Part {
  const lp = drawLp(r);
  const s1 = (x: number, y: number) => lp.a1 * x + lp.b1 * y;
  const s2 = (x: number, y: number) => lp.a2 * x + lp.b2 * y;
  const on: [number, number][] = [];
  const off: [number, number][] = [];
  for (let x = 0; x <= 12; x++)
    for (let y = 0; y <= 12; y++) {
      const ok1 = s1(x, y) <= lp.c1;
      const ok2 = s2(x, y) <= lp.c2;
      if (ok1 && ok2 && x > 0 && y > 0 && (s1(x, y) === lp.c1 || s2(x, y) === lp.c2)) on.push([x, y]);
      if (ok1 !== ok2) off.push([x, y]);
    }
  const inside = off.length === 0 || r.next() < 0.5;
  const [x, y] = r.pick(inside ? on : off);
  const rel = (v: number, c: number) => (v === c ? "=" : v < c ? "<" : ">");
  return {
    prompt: fill(w.opt.prompt.feasible, { x, y }),
    q: constraints(lp, "\\le"),
    ...pickOf([word(w.opt.feasible.yes), word(w.opt.feasible.no)], inside ? 0 : 1, inside ? [["boundaryInfeasible", 1]] : [["oneConstraintChecked", 0]]),
    steps: [`${lhs(lp.a1, lp.b1)} = ${s1(x, y)} ${rel(s1(x, y), lp.c1)} ${lp.c1}`, `${lhs(lp.a2, lp.b2)} = ${s2(x, y)} ${rel(s2(x, y), lp.c2)} ${lp.c2}`],
  };
}

function cornerPart(r: Rng, w: PracticeWords): Part {
  const lp = drawLp(r);
  const z = F(lp.p * lp.X + lp.q * lp.Y);
  return {
    prompt: w.opt.prompt.corner,
    q: `${lhs(lp.a1, lp.b1)} = ${lp.c1}, \\quad ${lhs(lp.a2, lp.b2)} = ${lp.c2}, \\quad ${objective(lp)}`,
    ...exact(z, [["cornerCoordsSwapped", lp.p * lp.Y + lp.q * lp.X]]),
    steps: [`x = ${lp.X}, \\quad y = ${lp.Y}`, `z = ${lp.p} \\cdot ${lp.X} + ${lp.q} \\cdot ${lp.Y} = ${z.tex()}`],
  };
}

/** The named slips of max: the best axis corner (the meet missed), and the best of every intercept (outside the region). */
function maxSlips(lp: Lp): NumSlip[] {
  const axis = maxCorners(lp).filter((_, i) => i !== 2);
  const all = [...axis, ...otherIntercepts(lp, true)];
  return [["cornerIntersectionMissed", fmax(axis.map((p) => value(lp, p)))], ["infeasibleIntercept", fmax(all.map((p) => value(lp, p)))]];
}

function graphicalPart(r: Rng, w: PracticeWords): Part {
  const lp = drawLp(r);
  const pts = maxCorners(lp);
  const best: Frac = value(lp, pts[2]);
  const story = r.next() < 0.5;
  return {
    prompt: story
      ? fill(w.opt.prompt.workshop, { a1: lp.a1, b1: lp.b1, c1: lp.c1, a2: lp.a2, b2: lp.b2, c2: lp.c2, p: lp.p, q: lp.q })
      : w.opt.prompt.graphical,
    q: story ? "x, y \\ge 0" : `\\max\\ ${objective(lp)}, \\quad ${constraints(lp, "\\le")}`,
    ...exact(best, maxSlips(lp)),
    steps: [
      ...(story ? [`\\max\\ ${objective(lp)}, \\quad ${constraints(lp, "\\le")}`] : []),
      cornerSteps(lp, pts),
      `z_{\\max} = ${best.tex()}, \\quad ${ptTex(pts[2])}`,
    ],
  };
}

function dietPart(r: Rng, w: PracticeWords): Part {
  const lp = drawLp(r);
  const pts = minCorners(lp);
  const best = value(lp, pts[1]);
  return {
    prompt: w.opt.prompt.diet,
    q: `\\min\\ ${objective(lp)}, \\quad ${constraints(lp, "\\ge")}`,
    ...exact(best, [
      ["minAtOrigin", 0],
      ["maxForMin", fmax(pts.map((p) => value(lp, p)))],
      ["infeasibleIntercept", fmin(otherIntercepts(lp, false).map((p) => value(lp, p)))],
    ]),
    steps: [cornerSteps(lp, pts), `z_{\\min} = ${best.tex()}, \\quad ${ptTex(pts[1])}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? feasiblePart(r, w) : cornerPart(r, w);
  if (L === 2) return graphicalPart(r, w);
  return dietPart(r, w);
};

export default gen;
