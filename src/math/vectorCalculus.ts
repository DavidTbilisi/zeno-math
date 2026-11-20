// Multivariable and vector calculus as a degree's second year teaches it (OpenStax, Calculus Vol. 3; Marsden and
// Tromba, Vector Calculus; Colley, Vector Calculus): partial derivatives and the gradient, the chain rule and the
// Jacobian, critical points and Lagrange multipliers, double and triple integrals, polar, cylindrical and spherical
// coordinates, line integrals and potentials, and the theorems of Green, Stokes and Gauss. The words, and the
// polynomials in x, y and z the questions are made of; the questions are in src/math/skills/{partials,chainMulti,
// extremaMulti,multipleIntegrals,changeVariables,lineIntegrals,vectorTheorems}.ts.
/** The words of these questions (the locale's `vcalc` block). */
export type VecCalcWords = {
  yes: string;
  no: string;
  kinds: { min: string; max: string; saddle: string; inconclusive: string };
  prompt: {
    gradient: string;
    directional: string;
    tangentPlane: string;
    chainT: string;
    jacobian: string;
    chainS: string;
    critical: string;
    classify: string;
    lagrange: string;
    integral: string;
    swapOrder: string;
    polar: string;
    cylinder: string;
    sphere: string;
    conservative: string;
    work: string;
    lineIntegral: string;
    green: string;
    divergence: string;
    stokes: string;
  };
};

/** A term c·xⁱyʲzᵏ: its coefficient and the powers of x, y and z. */
export type Term = { c: number; p: [number, number, number] };
/** A polynomial in x, y and z, as its terms. */
export type Poly = Term[];

export const term = (c: number, i: number, j = 0, k = 0): Term => ({ c, p: [i, j, k] });

/** Its value at (x, y, z). */
export const at = (f: Poly, x: number, y = 0, z = 0) => f.reduce((s, t) => s + t.c * x ** t.p[0] * y ** t.p[1] * z ** t.p[2], 0);

/** Like terms gathered, zero terms left out. */
export function tidyPoly(f: Poly): Poly {
  const out: Poly = [];
  for (const t of f) {
    const same = out.find((o) => o.p.every((e, i) => e === t.p[i]));
    if (same) same.c += t.c;
    else out.push({ c: t.c, p: [...t.p] });
  }
  return out.filter((t) => t.c !== 0);
}

/** The partial derivative by the variable v (0 = x, 1 = y, 2 = z). */
export const d = (f: Poly, v: 0 | 1 | 2): Poly =>
  tidyPoly(f.filter((t) => t.p[v] > 0).map((t) => ({ c: t.c * t.p[v], p: t.p.map((e, i) => (i === v ? e - 1 : e)) as Term["p"] })));

const VARS = ["x", "y", "z"];
/** As LaTeX: 3x^{2}y - xy^{2} + 4. */
export function polyTex(f: Poly, vars = VARS): string {
  const ts = tidyPoly(f);
  if (!ts.length) return "0";
  return ts
    .map((t, n) => {
      const mono = t.p.map((e, i) => (e === 0 ? "" : e === 1 ? vars[i] : `${vars[i]}^{${e}}`)).join("");
      const k = Math.abs(t.c);
      const body = mono ? `${k === 1 ? "" : k}${mono}` : String(k);
      return `${t.c < 0 ? (n ? "- " : "-") : n ? "+ " : ""}${body}`;
    })
    .join(" ");
}

/** A whole number, bracketed when negative: (-3). */
export const par = (v: number) => (v < 0 ? `(${v})` : String(v));
