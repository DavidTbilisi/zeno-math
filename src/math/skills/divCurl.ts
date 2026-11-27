// Practice: Divergence and curl (#753). Easy reads the sign of the divergence off a picture of a plane field (inflow
// and outflow swapped, or a flow with nowhere to spread called a source, named), or finds ∇ · F as an expression
// (each part differentiated by the wrong letter, or a part left out, named); medium reads which way a field turns a
// paddle wheel (the turn read backwards, a shear flow called curl-free, or a spreading flow called a spin, named), or
// finds the 2D curl at a point (subtracted the wrong way round, or the divergence given, named); hard is curl F in 3D
// at a point (the middle part's sign flipped, or every sign, named), or the Laplacian at a point (first derivatives
// added, or the z-part left out, named).
import { exact, F, shuffled, word } from "../calculusTwo";
import { fieldSvg, picOf } from "../fieldPics";
import { tup, vecOf } from "../linearAlgebra";
import { fnOf } from "../odes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { fill } from "../text";
import { at, d, par, type Poly, polyTex, term } from "../vectorCalculus";

/** f as a typed answer: 3*x^2*y - 2*z. */
function plainOf(f: Poly): string {
  const ts = f.filter((t) => t.c !== 0);
  if (!ts.length) return "0";
  return ts
    .map((t, n) => {
      const mono = t.p.flatMap((e, i) => (e === 0 ? [] : [e === 1 ? "xyz"[i] : `${"xyz"[i]}^${e}`]));
      const k = Math.abs(t.c);
      const body = mono.length ? (k === 1 ? mono.join("*") : `${k}*${mono.join("*")}`) : String(k);
      return `${t.c < 0 ? (n ? " - " : "-") : n ? " + " : ""}${body}`;
    })
    .join("");
}

/** A field P = ax + by + c, Q = ex + fy + g in the plane. */
type Flat = readonly [number, number, number, number, number, number];
const FIELDS: readonly Flat[] = [
  [1, 0, 0, 0, 1, 0], [-1, 0, 0, 0, -1, 0], [1, 0, 0, 0, 0, 0], [0, 0, 0, 0, -1, 0],
  [0, -1, 0, 1, 0, 0], [0, 1, 0, -1, 0, 0], [1, 0, 0, 0, -1, 0], [0, 1, 0, 0, 0, 0],
  [0, -1, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 1, 0, 0, 1], [1, -1, 0, 1, 1, 0], [-1, -1, 0, 1, -1, 0],
];
const flatTex = ([a, b, c, e, f, g]: Flat) => `\\mathbf{F} = \\left(${polyTex([term(a, 1), term(b, 0, 1), term(c, 0)])}, \\; ${polyTex([term(e, 1), term(f, 0, 1), term(g, 0)])}\\right)`;
const picFor = ([a, b, c, e, f, g]: Flat) => picOf(fieldSvg((x, y) => a * x + b * y + c, (x, y) => e * x + f * y + g));
const signTex = (v: number) => (v > 0 ? " > 0" : v < 0 ? " < 0" : "");

/** Positive, negative or zero divergence at the dot, read off the arrows. */
function divPicPart(r: Rng, w: PracticeWords): Part {
  const W = w.dcK;
  const fl = r.pick(FIELDS);
  const div = fl[0] + fl[4];
  const options = [word(W.positive), word(W.negative), word(W.zero)];
  const right = div > 0 ? 0 : div < 0 ? 1 : 2;
  return {
    prompt: W.divPicQ,
    q: "",
    pic: picFor(fl),
    ...shuffled(r, options, right, div > 0 ? [["inflowOutflowSwapped", 1]] : div < 0 ? [["inflowOutflowSwapped", 0]] : [["flowCalledDivergence", 0]]),
    steps: [`${flatTex(fl)}: \\quad \\nabla \\cdot \\mathbf{F} = \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} = ${fl[0]} + ${par(fl[4])} = ${div}${signTex(div)}`],
  };
}

/** Which way a paddle wheel at the dot turns: the sign of ∂Q/∂x − ∂P/∂y. */
function curlPicPart(r: Rng, w: PracticeWords): Part {
  const W = w.dcK;
  const fl = r.pick(FIELDS);
  const curl = fl[3] - fl[1];
  const options = [word(W.ccw), word(W.cw), word(W.none)];
  const right = curl > 0 ? 0 : curl < 0 ? 1 : 2;
  const shear = curl !== 0 && (fl[1] === 0 || fl[3] === 0);
  return {
    prompt: W.curlPicQ,
    q: "",
    pic: picFor(fl),
    ...shuffled(r, options, right, curl === 0 ? [["spreadCalledSpin", 0]] : [["spinDirectionSwapped", 1 - right], ...(shear ? [["shearCalledCurlFree", 2] as ["shearCalledCurlFree", number]] : [])]),
    steps: [`${flatTex(fl)}: \\quad \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${fl[3]} - ${par(fl[1])} = ${curl}${signTex(curl)}`],
  };
}

/** ∇ · F as an expression in x, y and z. */
function divPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c, e, g, h] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
  const P: Poly = [term(a, 2, r.int(0, 1)), term(b, 0, 0, 1)];
  const Q: Poly = [term(c, 0, 2, r.int(0, 1)), term(e, 1)];
  const R: Poly = [r.next() < 0.5 ? term(g, 0, 1, 1) : term(g, 0, 0, 2), term(h, 2)];
  const div: Poly = [...d(P, 0), ...d(Q, 1), ...d(R, 2)];
  return {
    prompt: w.dcK.divQ,
    q: `\\mathbf{F} = \\left(${polyTex(P)}, \\; ${polyTex(Q)}, \\; ${polyTex(R)}\\right)`,
    ...fnOf(plainOf(div), [
      ["divergenceWrongLetters", plainOf([...d(P, 1), ...d(Q, 2), ...d(R, 0)])],
      ["divergencePartLeftOut", plainOf([...d(P, 0), ...d(Q, 1)])],
    ], ["x", "y", "z"]),
    steps: [
      `\\frac{\\partial P}{\\partial x} = ${polyTex(d(P, 0))}, \\quad \\frac{\\partial Q}{\\partial y} = ${polyTex(d(Q, 1))}, \\quad \\frac{\\partial R}{\\partial z} = ${polyTex(d(R, 2))}`,
      `\\nabla \\cdot \\mathbf{F} = ${polyTex(div)}`,
    ],
  };
}

/** The 2D curl ∂Q/∂x − ∂P/∂y at a point. */
function curl2Part(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P: Poly = [term(r.nz(-3, 3), 0, 2), term(r.nz(-3, 3), 1, 1), term(r.nz(-3, 3), 1)];
    const Q: Poly = [term(r.nz(-3, 3), 2), term(r.nz(-3, 3), 1, 1), term(r.nz(-3, 3), 0, 1)];
    const [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
    const [qx, py] = [at(d(Q, 0), x, y), at(d(P, 1), x, y)];
    const div = at(d(P, 0), x, y) + at(d(Q, 1), x, y);
    if (qx === py || div === qx - py) continue;
    return {
      prompt: fill(w.dcK.curl2Q, { x, y }),
      q: `\\mathbf{F} = \\left(${polyTex(P)}, \\; ${polyTex(Q)}\\right)`,
      ...exact(F(qx - py), [["curlSignSlip", py - qx], ["divergenceForCurl", div]]),
      steps: [
        `\\frac{\\partial Q}{\\partial x} = ${polyTex(d(Q, 0))}, \\quad \\frac{\\partial P}{\\partial y} = ${polyTex(d(P, 1))}`,
        `(${x}, ${y}): \\quad ${qx} - ${par(py)} = ${qx - py}`,
      ],
    };
  }
}

/** curl F = (R_y − Q_z, P_z − R_x, Q_x − P_y) at a point. */
function curl3Part(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a, b, c, e, g, h] = [r.nz(-3, 3), r.nz(-2, 2), r.nz(-3, 3), r.nz(-2, 2), r.nz(-3, 3), r.nz(-2, 2)];
    const P: Poly = [term(a, 0, 1, 1), term(b, 0, 2)];
    const Q: Poly = [term(c, 1, 0, 1), term(e, 0, 0, 2)];
    const R: Poly = [term(g, 1, 1), term(h, 2)];
    const [x, y, z] = [r.nz(-2, 2), r.nz(-2, 2), r.nz(-2, 2)];
    const v = (f: Poly, k: 0 | 1 | 2) => at(d(f, k), x, y, z);
    const curl = [v(R, 1) - v(Q, 2), v(P, 2) - v(R, 0), v(Q, 0) - v(P, 1)];
    if (curl[1] === 0 || (curl[0] === 0 && curl[2] === 0)) continue;
    return {
      prompt: fill(w.dcK.curl3Q, { x, y, z }),
      q: `\\mathbf{F} = \\left(${polyTex(P)}, \\; ${polyTex(Q)}, \\; ${polyTex(R)}\\right)`,
      ...vecOf(curl.map((c0) => F(c0)), [["curlMiddleSignFlipped", [curl[0], -curl[1], curl[2]]], ["curlOrderReversed", curl.map((c0) => -c0)]]),
      steps: [
        `\\nabla \\times \\mathbf{F} = \\left(\\frac{\\partial R}{\\partial y} - \\frac{\\partial Q}{\\partial z}, \\; \\frac{\\partial P}{\\partial z} - \\frac{\\partial R}{\\partial x}, \\; \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right)`,
        `= \\left(${polyTex(d(R, 1))} - (${polyTex(d(Q, 2))}), \\; ${polyTex(d(P, 2))} - (${polyTex(d(R, 0))}), \\; ${polyTex(d(Q, 0))} - (${polyTex(d(P, 1))})\\right)`,
        `(${x}, ${y}, ${z}): \\quad ${tup(curl)}`,
      ],
    };
  }
}

/** ∇²f = f_xx + f_yy + f_zz at a point. */
function laplacianPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const f: Poly = [term(r.nz(-3, 3), 2, 1), term(r.nz(-3, 3), 0, 2, 1), term(r.nz(-2, 2), 0, 0, 3), term(r.nz(-3, 3), 1, 1, 1)];
    const [x, y, z] = [r.nz(-2, 2), r.nz(-2, 2), r.nz(-2, 2)];
    const second = [0, 1, 2].map((k) => at(d(d(f, k as 0 | 1 | 2), k as 0 | 1 | 2), x, y, z));
    const first = [0, 1, 2].map((k) => at(d(f, k as 0 | 1 | 2), x, y, z));
    const v = second[0] + second[1] + second[2];
    if (second[2] === 0) continue;
    return {
      prompt: fill(w.dcK.lapQ, { x, y, z }),
      q: `f(x, y, z) = ${polyTex(f)}`,
      ...exact(F(v), [["laplacianFirstDerivatives", first[0] + first[1] + first[2]], ["laplacianPartLeftOut", second[0] + second[1]]]),
      steps: [
        `f_{xx} = ${polyTex(d(d(f, 0), 0))}, \\quad f_{yy} = ${polyTex(d(d(f, 1), 1))}, \\quad f_{zz} = ${polyTex(d(d(f, 2), 2))}`,
        `(${x}, ${y}, ${z}): \\quad \\nabla^{2} f = ${second[0]} + ${par(second[1])} + ${par(second[2])} = ${v}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => {
  const pic = r.next() < 0.5;
  if (L === 1) return pic ? divPicPart(r, w) : divPart(r, w);
  if (L === 2) return pic ? curlPicPart(r, w) : curl2Part(r, w);
  return pic ? curl3Part(r, w) : laplacianPart(r, w);
};

export default gen;
