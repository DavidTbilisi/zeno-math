// The geometry lab: built shapes have the measurements asked for, every shape gets its right name, and the
// numbers (sides, angles, area, centres, circles) agree with the textbook values.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  area2, bounds, enlarge, fitView, fromPx, gridStep, insertPoint, make, MAKE_PARAMS, MAKES, measureCircle, measureFig,
  measurePoly, moveFig, niceStep, num, placeBeside, pointNames, removePoint, rounded, setSide, snapTo, START_VIEW,
  surd, toPx, zoomView, dist, type Fact, type GeoFig, type Measured, type Pt,
} from "../src/math/geoLab.ts";

const ABC = ["A", "B", "C", "D", "E", "F", "G", "H"];
const fact = (m: Measured, key: Fact["key"], name?: string) => m.sections.flatMap((s) => s.facts).find((f) => f.key === key && (name === undefined || f.name === name));
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const polyOf = (r: ReturnType<typeof make>): Pt[] => {
  assert.ok("fig" in r && r.fig.kind === "poly");
  return (r as { fig: { pts: Pt[] } }).fig.pts;
};
const named = (pts: Pt[]) => {
  const m = measurePoly(pts, ABC);
  return [m.base, ...m.tags].join(" ");
};

test("numbers: two decimals, more for small ones, exact roots", () => {
  assert.equal(num(4.4721), "4.47");
  assert.equal(num(-2.5), "−2.5");
  assert.equal(num(0.004567), "0.00457");
  assert.equal(num(0), "0");
  assert.equal(num(-1e-15), "0");
  assert.equal(num(NaN), "—");
  assert.equal(rounded(4.4721), true);
  assert.equal(rounded(2.5), false);
  assert.equal(surd(25), "5");
  assert.equal(surd(20), "2√5");
  assert.equal(surd(2), "√2");
  assert.equal(surd(4.5), "3√2/2");
  assert.equal(surd(1.25), "√5/2");
  assert.equal(surd(2.25), "1.5");
  assert.equal(surd(Math.PI), null);
});

test("the 3-4-5 triangle: sides, angles, area, centres", () => {
  const m = measurePoly([[0, 0], [4, 0], [0, 3]], ABC);
  assert.equal(m.base, "triangle");
  assert.deepEqual(m.tags, ["scalene", "right"]);
  assert.equal(fact(m, "side", "AB")!.v!.n, 4);
  assert.equal(fact(m, "side", "BC")!.v!.exact, "5");
  assert.equal(fact(m, "side", "BC")!.how, "√(4² + 3²) = √25");
  near(fact(m, "angle", "A")!.v!.n, 90);
  near(fact(m, "angle", "B")!.v!.n, 36.86989764584402);
  assert.equal(fact(m, "angleSum")!.v!.n, 180);
  assert.equal(fact(m, "perimeter")!.v!.n, 12);
  assert.equal(fact(m, "area")!.v!.n, 6);
  near(fact(m, "heron")!.v!.n, 6);
  near(fact(m, "height", "A")!.v!.n, 2.4); // onto the hypotenuse
  near(fact(m, "median", "A")!.v!.n, 2.5); // half the hypotenuse
  near(fact(m, "circumradius")!.v!.n, 2.5);
  near(fact(m, "inradius")!.v!.n, 1);
  assert.deepEqual(fact(m, "circumcentre")!.v!.p, [2, 1.5]); // the hypotenuse's middle
  assert.deepEqual(fact(m, "orthocentre")!.v!.p, [0, 0]); // the right-angled corner
  const I = fact(m, "incentre")!.v!.p!;
  near(I[0], 1);
  near(I[1], 1);
  assert.ok(fact(m, "pythagoras")!.how!.includes("3² + 4² = 9 + 16 = 25 = 5²"));
  assert.ok(fact(m, "euler"));
  assert.equal(fact(m, "symLines")!.v!.n, 0);
  assert.equal(fact(m, "diagCount"), undefined);
  // The bisector from the right angle: 2·4·3·cos 45° / 7.
  near(fact(m, "bisector", "A")!.v!.n, (24 * Math.SQRT1_2) / 7);
});

test("triangles get their names", () => {
  assert.equal(named(polyOf(make("equilateral", [6]))), "triangle equilateral acute");
  assert.equal(named(polyOf(make("isosceles", [6, 4]))), "triangle isosceles acute");
  assert.equal(named([[0, 0], [10, 0], [1, 1]]), "triangle scalene obtuse");
  assert.equal(named([[0, 0], [2, 0], [0, 2]]), "triangle isosceles right");
  assert.ok(fact(measurePoly([[0, 0], [2, 0], [0, 2]], ABC), "pythagoras")!.how!.endsWith("= 8 = (√8)²"));
  const eq = measurePoly(polyOf(make("equilateral", [6])), ABC);
  assert.equal(fact(eq, "symLines")!.v!.n, 3);
  assert.equal(fact(eq, "symOrder")!.v!.n, 3);
  assert.equal(fact(eq, "euler"), undefined, "every centre is the same point");
  assert.ok(fact(eq, "cosines"));
});

test("quadrilaterals get their names, and the area formula that fits", () => {
  const sqr = measurePoly(polyOf(make("square", [5])), ABC);
  assert.equal(sqr.base, "square");
  assert.equal(fact(sqr, "area")!.how, "a² = 5² = 25");
  assert.ok(fact(sqr, "diagBisect") && fact(sqr, "diagPerp") && fact(sqr, "diagEqual") && fact(sqr, "cyclic"));
  assert.equal(fact(sqr, "diag", "AC")!.v!.exact, "5√2");
  assert.equal(fact(sqr, "symLines")!.v!.n, 4);
  assert.equal(fact(sqr, "symOrder")!.v!.n, 4);

  const rect = measurePoly(polyOf(make("rectangle", [6, 4])), ABC);
  assert.equal(rect.base, "rectangle");
  assert.equal(fact(rect, "area")!.how, "a · b = 6 · 4 = 24");

  const rh = measurePoly(polyOf(make("rhombus", [5, 60])), ABC);
  assert.equal(rh.base, "rhombus");
  near(fact(rh, "area")!.v!.n, 25 * Math.sin(Math.PI / 3));
  assert.ok(fact(rh, "area")!.how!.startsWith("½ · d₁ · d₂"));
  assert.ok(fact(rh, "diagPerp"));

  const pg = measurePoly(polyOf(make("parallelogram", [6, 4, 60])), ABC);
  assert.equal(pg.base, "parallelogram");
  assert.ok(fact(pg, "area")!.how!.startsWith("b · h = 6 · 3.46"));
  assert.equal(pg.sections.find((s) => s.key === "diagonals")!.facts.filter((f) => f.key === "parallel").length, 2);
  assert.equal(fact(pg, "symOrder")!.v!.n, 2);

  const tz = measurePoly(polyOf(make("trapezoid", [8, 4, 3])), ABC);
  assert.equal(tz.base, "trapezoid");
  assert.deepEqual(tz.tags, ["isosceles"]);
  assert.equal(fact(tz, "area")!.how, "½ · (a + b) · h = ½ · (8 + 4) · 3 = 18");
  assert.ok(fact(tz, "cyclic"), "an isosceles trapezoid is cyclic");
  assert.equal(measurePoly([[0, 0], [5, 0], [3, 2], [0, 2]], ABC).tags.join(), "right");
  // A trapezoid whose parallel sides are BC and DA.
  assert.equal(measurePoly([[0, 0], [3, 0], [3, 5], [0, 4]], ABC).base, "trapezoid");

  const kite = measurePoly(polyOf(make("kite", [8, 6, 2])), ABC);
  assert.equal(kite.base, "kite");
  assert.equal(fact(kite, "area")!.how, "½ · d₁ · d₂ = ½ · 8 · 6 = 24");
  assert.equal(fact(kite, "symLines")!.v!.n, 1);
  assert.equal(measurePoly([[0, 0], [3, 3], [0, 1], [-3, 3]], ABC).base, "kite", "a dart");
  assert.ok(measurePoly([[0, 0], [3, 3], [0, 1], [-3, 3]], ABC).tags.includes("concave"));

  const odd = measurePoly([[0, 0], [5, 0], [6, 3], [1, 5]], ABC);
  assert.equal(odd.base, "quadrilateral");
  assert.ok(fact(odd, "area")!.how!.startsWith("½ · |Σ"));
  assert.equal(fact(odd, "area")!.v!.n, Math.abs(area2([[0, 0], [5, 0], [6, 3], [1, 5]])) / 2);
  assert.equal(fact(odd, "diagCount")!.v!.n, 2);
  assert.ok(fact(odd, "diagAngle"));
});

test("polygons: regular, concave, crossed and flat", () => {
  const hex = measurePoly(polyOf(make("regular", [6, 4])), ABC);
  assert.equal(hex.base, "hexagon");
  assert.deepEqual(hex.tags, ["regular"]);
  near(fact(hex, "interior")!.v!.n, 120);
  near(fact(hex, "circumradius")!.v!.n, 4);
  near(fact(hex, "apothem")!.v!.n, 2 * Math.sqrt(3));
  near(fact(hex, "area")!.v!.n, 24 * Math.sqrt(3), 1e-9);
  assert.ok(fact(hex, "area")!.how!.startsWith("½ · P · a"));
  assert.equal(fact(hex, "diagCount")!.v!.n, 9);
  assert.equal(fact(hex, "symLines")!.v!.n, 6);
  assert.equal(fact(hex, "angleSum")!.v!.n, 720);
  assert.ok(hex.overlay.circum && hex.overlay.incircle);

  const twelve = measurePoly(polyOf(make("regular", [12, 1])), ABC.concat("JKLM".split("")));
  assert.equal(twelve.base, "polygon");
  assert.equal(twelve.sections.find((s) => s.key === "diagonals")!.facts.filter((f) => f.key === "diag").length, 0, "too many to list");

  const L: Pt[] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [0, 3]];
  const l = measurePoly(L, ABC);
  assert.deepEqual(l.tags, ["concave"]);
  assert.equal(fact(l, "area")!.v!.n, 6);
  near(fact(l, "angle", "D")!.v!.n, 270);
  assert.equal(fact(l, "exteriorSum"), undefined);
  assert.equal(fact(l, "angleSum")!.v!.n, 720);
  // Clockwise corners give the same angles.
  near(measurePoly([...L].reverse(), ABC).angles[2], 270);

  const bow = measurePoly([[0, 0], [2, 2], [2, 0], [0, 2]], ABC);
  assert.ok(bow.tags.includes("crossed"));
  assert.equal(fact(bow, "area"), undefined);
  assert.equal(fact(bow, "angle"), undefined);
  assert.ok(fact(bow, "perimeter"));

  const flat = measurePoly([[0, 0], [1, 1], [2, 2]], ABC);
  assert.deepEqual(flat.tags, ["flat"]);
  assert.equal(fact(flat, "height"), undefined);

  const star = measurePoly(polyOf(make("regular", [5, 2])).map((_, i, p) => p[(i * 2) % 5]), ABC);
  assert.ok(star.tags.includes("crossed"));
  const eqPent = measurePoly([[0, 0], [2, 0], [3, 1.7320508075688772], [2, 3.4641016151377544], [0, 3.4641016151377544]], ABC);
  assert.equal(eqPent.base, "pentagon");
});

test("building: every builder makes what it says, or says why not", () => {
  for (const kind of MAKES) {
    const r = make(kind, MAKE_PARAMS[kind].start);
    assert.ok("fig" in r, kind);
  }
  const sss = polyOf(make("sss", [7, 5, 6]));
  near(dist(sss[0], sss[1]), 7);
  near(dist(sss[1], sss[2]), 5);
  near(dist(sss[2], sss[0]), 6);
  const sas = measurePoly(polyOf(make("sas", [6, 5, 50])), ABC);
  near(sas.angles[0], 50);
  const asa = measurePoly(polyOf(make("asa", [50, 7, 60])), ABC);
  near(asa.angles[0], 50);
  near(asa.angles[1], 60);
  assert.deepEqual(polyOf(make("right", [4, 3])), [[0, 0], [4, 0], [0, 3]]);
  assert.deepEqual(polyOf(make("square", [2])), [[0, 0], [2, 0], [2, 2], [0, 2]]);
  const c = make("circle", [3]);
  assert.ok("fig" in c && c.fig.kind === "circle" && c.fig.r === 3);

  assert.deepEqual(make("sss", [1, 2, 10]), { problem: "triangle" });
  assert.deepEqual(make("isosceles", [2, 5]), { problem: "triangle" });
  assert.deepEqual(make("asa", [100, 5, 90]), { problem: "angles" });
  assert.deepEqual(make("sas", [3, 4, 180]), { problem: "angle" });
  assert.deepEqual(make("parallelogram", [3, 4, 200]), { problem: "angle" });
  assert.deepEqual(make("kite", [4, 2, 5]), { problem: "kite" });
  assert.deepEqual(make("regular", [2.5, 3]), { problem: "n" });
  assert.deepEqual(make("regular", [40, 3]), { problem: "n" });
  assert.deepEqual(make("square", [-1]), { problem: "positive" });
  assert.deepEqual(make("rectangle", [1]), { problem: "positive" });
});

test("circles: exact in π, the equation", () => {
  const m = measureCircle([2, -1], 3, "O");
  assert.equal(m.base, "circle");
  assert.equal(fact(m, "circumference")!.v!.exact, "6π");
  assert.equal(fact(m, "circleArea")!.v!.exact, "9π");
  near(fact(m, "circleArea")!.v!.n, 9 * Math.PI);
  assert.equal(fact(m, "diameter")!.v!.n, 6);
  assert.equal(fact(m, "equation")!.how, "(x − 2)² + (y + 1)² = 9");
  assert.equal(measureCircle([0, 0], 1, "O").sections[1].facts[4].how, "x² + y² = 1");
  assert.equal(fact(measureCircle([0, 0], 0.5, "O"), "circumference")!.v!.exact, "π");
  assert.equal(fact(measureCircle([0, 0], 1.2345, "O"), "circleArea")!.v!.exact, undefined);
  const f: GeoFig = { kind: "circle", c: [0, 0], r: 2 };
  assert.equal(measureFig(f, ["O"]).base, "circle");
  assert.equal(measureFig({ kind: "poly", pts: [[0, 0], [1, 0], [0, 1]] }, ABC).base, "triangle");
});

test("names run on from shape to shape", () => {
  const figs: GeoFig[] = [
    { kind: "poly", pts: [[0, 0], [1, 0], [0, 1]] },
    { kind: "circle", c: [0, 0], r: 1 },
    { kind: "poly", pts: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    { kind: "circle", c: [0, 0], r: 1 },
  ];
  assert.deepEqual(pointNames(figs), [["A", "B", "C"], ["O"], ["D", "E", "F", "G"], ["O₂"]]);
  const many: GeoFig[] = Array.from({ length: 2 }, () => ({ kind: "poly", pts: Array.from({ length: 20 }, (_, i) => [i, i * i] as Pt) }));
  assert.equal(pointNames(many)[1][19], "R₁");
});

test("the plane: fitting, zooming, snapping, placing", () => {
  assert.equal(niceStep(0.3), 0.5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(1), 1);
  assert.equal(niceStep(2.1), 5);
  assert.equal(gridStep(START_VIEW), 1);
  assert.deepEqual(fitView([]), START_VIEW);
  assert.equal(bounds([]), null);
  const v = fitView([{ kind: "poly", pts: [[0, 0], [1000, 0], [0, 500]] }]);
  assert.deepEqual([v.cx, v.cy], [500, 250]);
  const [x, y] = toPx(v, [1000, 0]);
  assert.ok(x > 0 && x < 600 && y > 0 && y < 540);
  const back = fromPx(v, toPx(v, [12.5, -3]));
  near(back[0], 12.5, 1e-9);
  near(back[1], -3, 1e-9);
  assert.equal(zoomView(v, 2).s, v.s * 2);
  assert.equal(zoomView({ cx: 0, cy: 0, s: 1e7 }, 10).s, 1e7);
  assert.deepEqual(snapTo([1.26, -0.74], 0.5), [1.5, -0.5]);
  const circleBox = bounds([{ kind: "circle", c: [1, 1], r: 2 }]);
  assert.deepEqual(circleBox, [-1, -1, 3, 3]);

  const tri: GeoFig = { kind: "poly", pts: [[0, 0], [4, 0], [0, 3]] };
  const placed = placeBeside([tri], { kind: "poly", pts: [[0, 0], [2, 0], [2, 2], [0, 2]] });
  assert.ok(placed.kind === "poly" && placed.pts[0][0] > 4 && placed.pts[0][1] === 0);
  assert.deepEqual(placeBeside([], tri), tri);
  assert.deepEqual(moveFig({ kind: "circle", c: [0, 0], r: 1 }, [1, 2]), { kind: "circle", c: [1, 2], r: 1 });
});

test("changing a shape: enlarge, set a side, add and take away corners", () => {
  const sq: Pt[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const big = enlarge({ kind: "poly", pts: sq }, 3);
  assert.ok(big.kind === "poly");
  assert.deepEqual(big.pts, [[-2, -2], [4, -2], [4, 4], [-2, 4]]);
  assert.equal(measurePoly(big.pts, ABC).sections.find((s) => s.key === "size")!.facts[1].v!.n, 36, "area × 9");
  assert.deepEqual(enlarge({ kind: "circle", c: [0, 0], r: 1 }, 2), { kind: "circle", c: [0, 0], r: 2 });
  assert.deepEqual(enlarge({ kind: "circle", c: [0, 0], r: 1 }, 0), { kind: "circle", c: [0, 0], r: 1 });
  assert.deepEqual(setSide(sq, 0, 5), [[0, 0], [5, 0], [2, 2], [0, 2]]);
  assert.deepEqual(setSide(sq, 3, 1), [[0, 1], [2, 0], [2, 2], [0, 2]]);
  assert.deepEqual(setSide(sq, 0, -1), sq);
  assert.deepEqual(insertPoint(sq, 3), [[0, 0], [2, 0], [2, 2], [0, 2], [0, 1]]);
  assert.deepEqual(removePoint(sq, 1), [[0, 0], [2, 2], [0, 2]]);
  const tri: Pt[] = [[0, 0], [1, 0], [0, 1]];
  assert.deepEqual(removePoint(tri, 0), tri, "a triangle keeps its three corners");
  const full = Array.from({ length: 20 }, (_, i) => [i, i * i] as Pt);
  assert.equal(insertPoint(full, 0).length, 20);
});
