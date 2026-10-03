// School geometry: circle theorem answers obey the theorems and match the angles measured on the figure drawn from
// them; similar triangles keep one scale factor and the tests (SSS, SAS, ASA, RHS, AA…) decide correctly; images of
// transformations match the formulas, and describing an image finds the transformation that made it; volumes and
// surface areas match the formulas, and a length found from a volume gives that volume back; constructions and loci
// satisfy their conditions; practice answers follow from the question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { buildEuclid, type EuclidTopic } from "../src/math/euclid.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.euclidWords;
const build = (topic: EuclidTopic, src: string) => buildEuclid({ topic, src }, w);

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
type P = [number, number];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Every angle found matches the figure drawn from it; lengths match up to one scale. */
function agreesWithFigure(d: ReturnType<typeof build>["data"], src: string) {
  const v = d.values!;
  const m = d.measured!;
  let scale: number | undefined;
  for (const [n, x] of Object.entries(v)) {
    if (m[n] === undefined || n === "RAOB") continue;
    if (n.length === 3) assert.ok(close(m[n], x, 1e-6), `${src}: ∠${n} = ${x}, drawn ${m[n]}`);
    else {
      scale ??= x / m[n];
      assert.ok(close(x / m[n], scale, 1e-6), `${src}: ${n} = ${x} is out of scale`);
    }
  }
}

test("circle theorems: the answers obey the theorems and match the figure", () => {
  for (let i = 0; i < 25; i++) {
    const a = int(20, 85);
    let d = build("circle", `centre; AOB = ${2 * a}; find ACB, OAB`).data;
    assert.equal(d.values!.ACB, a);
    assert.equal(d.values!.OAB, 90 - a);
    agreesWithFigure(d, "centre");

    const b = int(10, 80);
    d = build("circle", `semicircle; CAB = ${b}; find CBA, AOC`).data;
    assert.equal(d.values!.CBA, 90 - b);
    assert.equal(d.values!.AOC, 180 - 2 * b);
    agreesWithFigure(d, "semicircle");

    const [A, B] = [int(40, 140), int(40, 140)];
    d = build("circle", `cyclic; A = ${A}; B = ${B}; find C, D, E`).data;
    assert.equal(d.values!.BCD, 180 - A);
    assert.equal(d.values!.CDA, 180 - B);
    assert.equal(d.values!.DCE, A);
    agreesWithFigure(d, `cyclic ${A} ${B}`);

    const P = int(20, 160);
    d = build("circle", `tangents; APB = ${P}; find AOB, PAB, OAB`).data;
    assert.ok(close(d.values!.AOB, 180 - P) && close(d.values!.PAB, 90 - P / 2) && close(d.values!.OAB, P / 2));
    agreesWithFigure(d, `tangents ${P}`);

    const [t, s] = [int(20, 80), int(20, 80)];
    d = build("circle", `alternate; TAB = ${t}; SAC = ${s}`).data;
    assert.equal(d.values!.ACB, t);
    assert.equal(d.values!.ABC, s);
    assert.equal(d.values!.BAC, 180 - t - s);
    agreesWithFigure(d, `alternate ${t} ${s}`);

    // Lengths: Pythagoras with the radius, chords and secants as products.
    const r = int(5, 20);
    const ab = int(2, 2 * r - 1);
    d = build("circle", `chord; AB = ${ab}; OA = ${r}; find OM, AOB`).data;
    assert.ok(close(d.values!.OM ** 2 + (ab / 2) ** 2, r * r), `chord ${ab} ${r}`);
    agreesWithFigure(d, `chord ${ab} ${r}`);
    const [ae, eb, ce] = [int(1, 9), int(1, 9), int(1, 9)];
    d = build("circle", `chords; AE = ${ae}; EB = ${eb}; CE = ${ce}`).data;
    assert.ok(close(d.values!.ED * ce, ae * eb));
    agreesWithFigure(d, `chords ${ae} ${eb} ${ce}`);
    const [pa, pb] = [int(1, 6), int(7, 15)];
    d = build("circle", `secant; PA = ${pa}; PB = ${pb}; find PT, AB`).data;
    assert.ok(close(d.values!.PT ** 2, pa * pb) && close(d.values!.AB, pb - pa));
    agreesWithFigure(d, `secant ${pa} ${pb}`);
    const [oa, ap] = [int(2, 12), int(2, 12)];
    d = build("circle", `tangent; OA = ${oa}; AP = ${ap}; find OP, AOP`).data;
    assert.ok(close(d.values!.OP ** 2, oa * oa + ap * ap));
    agreesWithFigure(d, `tangent ${oa} ${ap}`);
  }
});

test("circle theorems: unknowns in x are solved for", () => {
  for (let i = 0; i < 40; i++) {
    // ∠A = px + q and ∠C = rx + s with a chosen x.
    const x = int(5, 40);
    const [p, rr] = [int(1, 3), int(1, 3)];
    const q = int(10, 40);
    const s = 180 - p * x - q - rr * x;
    if (p * x + q >= 175 || s + rr * x <= 5) continue;
    const d = build("circle", `cyclic; A = ${p}x + ${q}; C = ${rr}x ${s < 0 ? "-" : "+"} ${Math.abs(s)}`).data;
    assert.ok(close(d.x!, x), `${p}x + ${q}, ${rr}x + ${s}: x = ${d.x}`);
    assert.ok(close(d.values!.DAB + d.values!.BCD, 180));
  }
  const d = build("circle", "chords; AE = x; EB = 6; CE = 4; ED = 9").data;
  assert.equal(d.x, 6);
  assert.equal(build("circle", "centre; AOB = 3x; ACB = x + 20").data.x, 40);
});

test("similar triangles keep one scale factor; the A- and X-shapes", () => {
  for (let i = 0; i < 40; i++) {
    const k = pick([0.5, 1.5, 2, 2.5, 3, 4 / 3]);
    const [a, b] = [int(3, 9), int(3, 9)];
    const c = int(Math.abs(a - b) + 1, a + b - 1);
    const d = build("similar", `ABC ~ DEF; AB = ${c}; BC = ${a}; AC = ${b}; DE = ${c * k}`).data;
    assert.ok(close(d.k!, k));
    assert.ok(close(d.values!.EF, a * k) && close(d.values!.FD, b * k), `k = ${k}`);
    // A-shape: AD + DB = AB, DE ∥ BC.
    const [ad, db, de] = [int(1, 9), int(1, 9), int(1, 9)];
    const e = build("similar", `ADE ~ ABC; AD = ${ad}; DB = ${db}; DE = ${de}; find BC`).data;
    assert.ok(close(e.values!.BC, (de * (ad + db)) / ad));
    // X-shape.
    const x = build("similar", `EAB ~ EDC; X; AB = ${a}; DC = ${b}; EA = ${c}; find ED`).data;
    assert.ok(close(x.values!.ED, (c * b) / a));
  }
  // x in the sides: (x + 6)/x = 10/4.
  assert.equal(build("similar", "ABC ~ PQR; AB = 4; BC = x; PQ = 10; QR = x + 6").data.x, 4);
  assert.throws(() => build("similar", "ABC ~ DEF; AB = 2; BC = 3; DE = 4; EF = 9"), { message: /Not similar/ });
});

test("congruence and similarity tests", () => {
  const verdict = (src: string) => build("similar", src).data.test;
  assert.equal(verdict("ABC, DEF; AB = 5; BC = 7; AC = 6; DE = 5; EF = 7; DF = 6"), "SSS");
  assert.equal(verdict("ABC, DEF; AB = 5; BC = 7; B = 40; DE = 5; EF = 7; E = 40"), "SAS");
  assert.equal(verdict("ABC, DEF; A = 50; B = 60; AB = 4; D = 50; E = 60; DE = 4"), "ASA");
  assert.equal(verdict("ABC, DEF; A = 50; B = 60; BC = 4; D = 50; E = 60; EF = 4"), "AAS");
  assert.equal(verdict("ABC, DEF; C = 90; AB = 13; BC = 5; F = 90; DE = 13; EF = 5"), "RHS");
  assert.equal(verdict("ABC, PQR; A = 50; B = 60; P = 50; R = 70"), "AA");
  assert.equal(verdict("ABC, DEF; AB = 3; BC = 4; AC = 5; DE = 6; EF = 8; DF = 10"), "SSSs");
  assert.equal(verdict("ABC, DEF; AB = 3; BC = 4; B = 70; DE = 6; EF = 8; E = 70"), "SASs");
  // Two sides and an angle not between them prove nothing; different angles mean neither.
  assert.equal(verdict("ABC, DEF; AB = 5; BC = 7; C = 40; DE = 5; EF = 7; F = 40"), undefined);
  assert.equal(verdict("ABC, DEF; A = 50; B = 60; D = 50; E = 65"), undefined);
});

test("scale factors for lengths, areas and volumes", () => {
  for (let i = 0; i < 30; i++) {
    const [a, b] = [int(1, 9), int(1, 9)];
    const A = int(1, 50);
    const d = build("similar", `lengths ${a} : ${b}; area ${A} : ?; volume ? : ${A}`).data;
    assert.ok(close(d.k!, b / a));
    assert.ok(close(d.values!.A1b, A * (b / a) ** 2) && close(d.values!.V2a, A / (b / a) ** 3));
    const e = build("similar", `areas ${a * a} : ${b * b}; volume ${A} : ?`).data;
    assert.ok(close(e.values!.V1b, A * (b / a) ** 3));
  }
});

test("transformations: images match the formulas, and describing them finds the transformation", () => {
  const rot = ([x, y]: P, deg: number, [cx, cy]: P): P => {
    const t = (deg * Math.PI) / 180;
    return [cx + (x - cx) * Math.cos(t) - (y - cy) * Math.sin(t), cy + (x - cx) * Math.sin(t) + (y - cy) * Math.cos(t)];
  };
  const fmt = (ps: P[]) => ps.map((p) => `(${+p[0].toFixed(9)}, ${+p[1].toFixed(9)})`).join(", ");
  for (let i = 0; i < 40; i++) {
    const pts: P[] = [[int(-4, 4), int(-4, 4)], [int(-4, 4), int(-4, 4)], [int(-4, 4), int(-4, 4)]];
    const area = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]);
    if (area === 0) continue;
    const named = pts.map((p, j) => `${"ABC"[j]}(${p[0]}, ${p[1]})`).join(", ");
    const c: P = [int(-3, 3), int(-3, 3)];
    // Rotation.
    const a = pick([90, -90, 180]);
    let d = build("transform", `${named}; rotate ${Math.abs(a)} ${a < 0 ? "clockwise" : "anticlockwise"} about (${c[0]}, ${c[1]})`).data;
    const want = pts.map((p) => rot(p, a, c));
    d.images![0].forEach((p, j) => assert.ok(dist(p, want[j]) < 1e-9, `rotate ${a} about ${c}`));
    let e = build("transform", `${named} -> ${fmt(want)}`).data;
    assert.equal(e.kind, "rotate");
    assert.ok(dist(e.centre!, c) < 1e-9 && close(Math.abs(e.angle!), Math.abs(a)) && (Math.abs(a) === 180 || Math.sign(e.angle!) === Math.sign(a)));
    // Enlargement.
    const f = pick([2, 3, -1, -2, 0.5, -0.5]);
    d = build("transform", `${named}; enlarge by ${f} about (${c[0]}, ${c[1]})`).data;
    const big = pts.map(([x, y]) => [c[0] + f * (x - c[0]), c[1] + f * (y - c[1])] as P);
    d.images![0].forEach((p, j) => assert.ok(dist(p, big[j]) < 1e-9));
    e = build("transform", `${named} -> ${fmt(big)}`).data;
    if (f === -1) assert.equal(e.kind, "rotate");
    else {
      assert.equal(e.kind, "enlarge");
      assert.ok(close(e.factor!, f) && dist(e.centre!, c) < 1e-9);
    }
    // Reflection in y = mx + q.
    const [m, q] = [pick([0, 1, -1, 2]), int(-2, 2)];
    d = build("transform", `${named}; reflect in y = ${m}x + ${q}`).data;
    const refl = pts.map(([x, y]) => {
      const t = (2 * (m * x - y + q)) / (m * m + 1);
      return [x - t * m, y + t] as P;
    });
    d.images![0].forEach((p, j) => assert.ok(dist(p, refl[j]) < 1e-9, `reflect in y = ${m}x + ${q}`));
    e = build("transform", `${named} -> ${fmt(refl)}`).data;
    assert.equal(e.kind, "reflect");
    const [nx, ny, dd] = e.mirror!;
    for (const x of [0, 1]) assert.ok(Math.abs(nx * x + ny * (m * x + q) - dd) < 1e-9, `mirror of y = ${m}x + ${q}`);
    // Translation.
    const v: P = [int(-5, 5), int(-5, 5)];
    if (v[0] || v[1]) {
      e = build("transform", `${named} -> ${fmt(pts.map(([x, y]) => [x + v[0], y + v[1]] as P))}`).data;
      assert.equal(e.kind, "translate");
      assert.deepEqual(e.vector, v);
    }
  }
  // Two reflections in crossing lines make a rotation.
  assert.equal(build("transform", "A(1, 1), B(3, 1), C(1, 2); reflect in x = 0; then reflect in y = 0").data.kind, "rotate");
  // A stretch is none of the four.
  assert.equal(build("transform", "A(0, 0), B(1, 0), C(0, 1) -> (0, 0), (2, 0), (0, 1)").data.kind, "other");
});

test("solids: volumes and surface areas match the formulas; a length found from the volume gives it back", () => {
  const pi = Math.PI;
  for (let i = 0; i < 30; i++) {
    const [r, h, l, wd] = [int(1, 9), int(1, 12), int(1, 9), int(1, 9)];
    const cases: [string, number, number][] = [
      [`cube ${l}`, l ** 3, 6 * l * l],
      [`cuboid ${l} x ${wd} x ${h}`, l * wd * h, 2 * (l * wd + l * h + wd * h)],
      [`cylinder r = ${r} h = ${h}`, pi * r * r * h, 2 * pi * r * r + 2 * pi * r * h],
      [`cylinder d = ${2 * r} h = ${h}`, pi * r * r * h, 2 * pi * r * r + 2 * pi * r * h],
      [`cone r = ${r} h = ${h}`, (pi * r * r * h) / 3, pi * r * r + pi * r * Math.hypot(r, h)],
      [`sphere r = ${r}`, (4 / 3) * pi * r ** 3, 4 * pi * r * r],
      [`hemisphere r = ${r}`, (2 / 3) * pi * r ** 3, 3 * pi * r * r],
      [`pyramid a = ${l} h = ${h}`, (l * l * h) / 3, l * l + 2 * l * Math.hypot(h, l / 2)],
      [`prism b = ${l} h = ${h} l = ${wd}`, (l * h * wd) / 2, l * h + l * wd + 2 * Math.hypot(h, l / 2) * wd],
      [`frustum R = ${r + 2} r = ${r} h = ${h}`, (pi * h * ((r + 2) ** 2 + (r + 2) * r + r * r)) / 3, pi * ((r + 2) ** 2 + r * r) + pi * (2 * r + 2) * Math.hypot(h, 2)],
      [`cylinder r = ${r} h = ${h} + hemisphere r = ${r}`, pi * r * r * h + (2 / 3) * pi * r ** 3, 2 * pi * r * h + pi * r * r + 2 * pi * r * r],
      [`cylinder r = ${r} h = ${h} + cone r = ${r} h = ${l}`, pi * r * r * h + (pi * r * r * l) / 3, 2 * pi * r * h + pi * r * r + pi * r * Math.hypot(r, l)],
      [`cube ${2 * r + 2} - cylinder r = ${r} h = ${2 * r + 2}`, (2 * r + 2) ** 3 - pi * r * r * (2 * r + 2), 6 * (2 * r + 2) ** 2 - 2 * pi * r * r + 2 * pi * r * (2 * r + 2)],
    ];
    for (const [src, V, A] of cases) {
      const d = build("solids", src).data;
      assert.ok(close(d.V!, V, 1e-9) && close(d.A!, A, 1e-9), `${src}: V ${d.V} / ${V}, A ${d.A} / ${A}`);
    }
    // Back from the volume (or the surface area).
    const back: [string, string, number][] = [
      [`cylinder r = ${r} V = ${pi * r * r * h}`, "h", h],
      [`cylinder h = ${h} V = ${pi * r * r * h}`, "r", r],
      [`sphere V = ${(4 / 3) * pi * r ** 3}`, "r", r],
      [`cone r = ${r} V = ${(pi * r * r * h) / 3}`, "h", h],
      [`cube A = ${6 * l * l}`, "a", l],
      [`cylinder h = ${h} A = ${2 * pi * r * r + 2 * pi * r * h}`, "r", r],
      [`cone h = ${h} A = ${pi * r * r + pi * r * Math.hypot(r, h)}`, "r", r],
      [`frustum R = ${r + 2} r = ${r} V = ${(pi * h * ((r + 2) ** 2 + (r + 2) * r + r * r)) / 3}`, "h", h],
    ];
    for (const [src, , v] of back) assert.ok(close(build("solids", src).data.dim!, v, 1e-7), `${src} → ${v}`);
  }
  // Exact in π: V = 36π gives r = 3.
  assert.equal(build("solids", "sphere V = 36pi").data.dim, 3);
});

test("constructions and loci satisfy their conditions", () => {
  for (let i = 0; i < 30; i++) {
    const A: P = [int(-3, 5), int(-3, 5)];
    const B: P = [int(-3, 8), int(-3, 8)];
    const C: P = [int(-3, 8), int(-3, 8)];
    if (dist(A, B) < 1 || dist(B, C) < 1 || dist(A, C) < 1) continue;
    const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    const pts = `A(${A[0]}, ${A[1]}) B(${B[0]}, ${B[1]})`;
    // Perpendicular bisector: the midpoint, and a line of points equidistant from A and B.
    let d = build("construct", `perpendicular bisector ${pts}`).data;
    assert.ok(dist(d.points![0], [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]) < 1e-9);
    // The perpendicular from C meets AB at a right angle.
    if (Math.abs(cross) > 1e-6) {
      d = build("construct", `perpendicular from P(${C[0]}, ${C[1]}) to ${pts}`).data;
      const F = d.points![0];
      const dot = (F[0] - C[0]) * (B[0] - A[0]) + (F[1] - C[1]) * (B[1] - A[1]);
      const onAB = (F[0] - A[0]) * (B[1] - A[1]) - (F[1] - A[1]) * (B[0] - A[0]);
      assert.ok(Math.abs(dot) < 1e-9 && Math.abs(onAB) < 1e-9);
      // The angle bisector halves the angle.
      d = build("construct", `angle bisector A(${A[0]}, ${A[1]}) B(${B[0]}, ${B[1]}) C(${C[0]}, ${C[1]})`).data;
      const R = d.points![0];
      const ang = (p: P, q: P) => Math.acos(((p[0] - B[0]) * (q[0] - B[0]) + (p[1] - B[1]) * (q[1] - B[1])) / (dist(p, B) * dist(q, B)));
      assert.ok(close(ang(A, R), ang(R, C), 1e-9) && close(ang(A, R) * 2, ang(A, C), 1e-9));
    }
    // Triangle from three sides: the corners are those distances apart.
    const [a, b, c] = [int(3, 9), int(3, 9), int(3, 9)];
    if (a + b > c && a + c > b && b + c > a) {
      d = build("construct", `triangle AB = ${c}, BC = ${a}, AC = ${b}`).data;
      const [P0, P1, P2] = d.points!;
      assert.ok(close(dist(P0, P1), c) && close(dist(P1, P2), a) && close(dist(P0, P2), b));
      assert.ok(close(d.values!.A + d.values!.B + d.values!.C, 180));
    } else assert.throws(() => build("construct", `triangle AB = ${c}, BC = ${a}, AC = ${b}`), { message: w.construct.noTriangle });
    // Where two loci meet: equidistant from A and B, and r from C.
    const r = int(1, 6);
    d = build("construct", `A(${A[0]}, ${A[1]}); B(${B[0]}, ${B[1]}); C(${C[0]}, ${C[1]}); equidistant from A and B; exactly ${r} from C`).data;
    for (const X of d.points!) assert.ok(close(dist(X, A), dist(X, B), 1e-9) && close(dist(X, C), r, 1e-9));
  }
  for (const n of [60, 30, 90, 45]) assert.ok(close(build("construct", `angle ${n} at A(1, 1) B(7, 3)`).data.angle!, n, 1e-9));
});

test("error messages", () => {
  const bad = [
    ["circle", "square; AB = 3"],
    ["circle", "centre; XYZ = 40"],
    ["circle", "centre; AOB = 200"],
    ["circle", "cyclic; A = 100; C = 100"],
    ["circle", "chord; AB = 30; OA = 10"],
    ["circle", "centre; AOB = x^2"],
    ["similar", "AB ~ DEF"],
    ["similar", "ABC ~ ABD"],
    ["similar", "ABC ~ DEF; XY = 3"],
    ["similar", "lengths 2 : ?"],
    ["transform", "rotate 90"],
    ["transform", "A(1, 1), B(2, 2); spin 90"],
    ["transform", "A(1, 1), B(2, 2); reflect in the wall"],
    ["transform", "A(1, 1) -> (2, 2), (3, 3)"],
    ["solids", "dodecahedron 3"],
    ["solids", "cylinder r = 3"],
    ["solids", "cylinder r = 3 h = -2"],
    ["solids", "sphere r = 3 - cone r = 1 h = 2"],
    ["construct", "triangle 1, 2, 10"],
    ["construct", "perpendicular bisector A(1, 1) B(1, 1)"],
    ["construct", "within 3 of Q"],
    ["construct", "fly to the moon"],
  ] as const;
  for (const [topic, src] of bad)
    assert.throws(
      () => build(topic, src),
      (e: Error) => !/undefined|NaN|\[object/.test(e.message) && e.message.length > 5,
      `${topic}: ${src}`,
    );
  assert.throws(() => build("circle", ""), { message: w.need.circle });
});

test("practice: geometry answers follow from the question", () => {
  const pw = en.pracWords;
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS)
      for (const skill of ["circles", "similarity", "volume"] as const) {
        const ex = exercise(skill, level, s, pw);
        assert.equal(check(ex, ex.plain, pw).ok, true, `${skill} ${ex.q}: ${ex.plain}`);
        const spec = ex.solution!.spec as { topic: EuclidTopic; src: string };
        const d = build(spec.topic, spec.src).data;
        const v = (ex.answer as { v: number }).v;
        if (skill === "circles") {
          const ask = /find (\w+)$/.exec(spec.src)![1];
          assert.ok(close(d.values![ask], v), `${spec.src}: ${d.values![ask]} vs ${v}`);
          assert.ok(ex.pic, spec.src);
        } else if (skill === "similarity") {
          const got = d.values!.EF ?? d.values!.BC ?? d.values!.A1b ?? d.values!.V1b;
          assert.ok(close(got, v), `${spec.src}: ${got} vs ${v}`);
        } else {
          const got = /V = /.test(spec.src) ? d.dim! : ex.prompt === pw.prompts.surface ? d.A! : d.V!;
          assert.ok(close(got, v, 1e-9), `${spec.src}: ${got} vs ${v}`);
          assert.ok(ex.pic, spec.src);
        }
      }
});
