// Practice: direct and iterative solvers for Ax = b. Easy finds an entry of the Doolittle factorisation A = LU of a
// 3 × 3 matrix (the product added instead of subtracted, the multiplier left unreduced or upside down, named); medium a
// component after one Jacobi or Gauss–Seidel sweep from x⁽⁰⁾ = 0 (the other method's value, named); hard the spectral
// radius of the Gauss–Seidel matrix of a 2 × 2 system (Jacobi's radius, named), or whether Jacobi converges for a
// matrix that is not diagonally dominant (no dominance taken for divergence, one dominant row taken for enough, named).
import { exact, pickOf, word, type NumSlip } from "../calculusTwo";
import { F, doolittle, matTex } from "../numericalAnalysis";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const nz = (r: Rng, lo: number, hi: number) => {
  let v: number;
  do v = r.int(lo, hi);
  while (v === 0);
  return v;
};

function luPart(r: Rng, w: PracticeWords): Part {
  // A = LU from a whole-number L (unit lower) and U, so every entry is whole.
  const l = [nz(r, -3, 3), nz(r, -3, 3), nz(r, -3, 3)];
  const u = [
    [nz(r, 1, 4) * r.sign(), nz(r, -4, 4), r.int(-4, 4)],
    [0, nz(r, 1, 4) * r.sign(), nz(r, -4, 4)],
    [0, 0, nz(r, -5, 5)],
  ];
  const L = [
    [1, 0, 0],
    [l[0], 1, 0],
    [l[1], l[2], 1],
  ];
  const a = L.map((row) => [0, 1, 2].map((j) => row.reduce((s, x, k) => s + x * u[k][j], 0)));
  const { L: Lf, U: Uf } = doolittle(a)!;
  const q = `A = ${matTex(a)}`;
  if (r.next() < 0.5) {
    const v = Uf[1][1];
    return {
      prompt: fill(w.na.prompt.lu, { e: "u₂₂" }),
      q,
      ...exact(v, [["luSignSlip", F(a[1][1]).add(Lf[1][0].mul(Uf[0][1]))]]),
      steps: [
        `u_{11} = ${a[0][0]}, \\; u_{12} = ${a[0][1]}, \\quad l_{21} = \\frac{a_{21}}{u_{11}} = \\frac{${a[1][0]}}{${a[0][0]}} = ${Lf[1][0].tex()}`,
        `u_{22} = a_{22} - l_{21} u_{12} = ${a[1][1]} - ${Lf[1][0].texP()} \\cdot ${F(a[0][1]).texP()} = ${v.tex()}`,
      ],
    };
  }
  const v = Lf[2][1];
  const raw = F(a[2][1]).div(Uf[1][1]);
  const slips: NumSlip[] = [["multiplierNotUpdated", raw]];
  if (!v.isZero()) slips.push(["multiplierInverted", F(1).div(v)]);
  return {
    prompt: fill(w.na.prompt.lu, { e: "l₃₂" }),
    q,
    ...exact(v, slips),
    steps: [
      `l_{21} = ${Lf[1][0].tex()}, \\; l_{31} = ${Lf[2][0].tex()}, \\quad u_{12} = ${Uf[0][1].tex()}, \\; u_{22} = ${Uf[1][1].tex()}`,
      `l_{32} = \\frac{a_{32} - l_{31} u_{12}}{u_{22}} = \\frac{${a[2][1]} - ${Lf[2][0].texP()} \\cdot ${Uf[0][1].texP()}}{${Uf[1][1].tex()}} = ${v.tex()}`,
    ],
  };
}

function sweepPart(r: Rng, w: PracticeWords): Part {
  let a: number[][];
  do a = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 0 : r.int(-3, 3))));
  while (a[1][0] === 0);
  // Strictly diagonally dominant, so both sweeps make sense.
  a.forEach((row, i) => (row[i] = (row.reduce((s, x) => s + Math.abs(x), 0) + r.int(1, 3)) * r.pick([1, 1, -1])));
  const b = [nz(r, -9, 9), r.int(-9, 9), r.int(-9, 9)];
  const jac = b.map((bi, i) => F(bi, a[i][i]));
  const x1 = jac[0];
  const gs = F(b[1]).sub(F(a[1][0]).mul(x1)).div(F(a[1][1]));
  const seidel = r.next() < 0.5;
  const v = seidel ? gs : jac[1];
  return {
    prompt: fill(w.na.prompt.iterate, { m: w.na.methods[seidel ? "seidel" : "jacobi"] }),
    q: `${matTex(a)} \\mathbf{x} = ${matTex(b.map((x) => [x]))}, \\quad \\mathbf{x}^{(0)} = \\mathbf{0}`,
    ...exact(v, [seidel ? ["jacobiForSeidel", jac[1]] : ["seidelForJacobi", gs]]),
    steps: seidel
      ? [`x_1^{(1)} = \\frac{${b[0]}}{${a[0][0]}} = ${x1.tex()}`, `x_2^{(1)} = \\frac{${b[1]} - ${F(a[1][0]).texP()} \\cdot ${x1.texP()}}{${a[1][1]}} = ${gs.tex()}`]
      : [`x_2^{(1)} = \\frac{b_2 - a_{21} x_1^{(0)} - a_{23} x_3^{(0)}}{a_{22}} = \\frac{${b[1]}}{${a[1][1]}} = ${v.tex()}`],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    let a: number[][];
    let rho: Frac;
    do {
      a = [
        [nz(r, -6, 6), nz(r, -6, 6)],
        [nz(r, -6, 6), nz(r, -6, 6)],
      ];
      rho = F(a[0][1] * a[1][0], a[0][0] * a[1][1]).abs();
    } while (rho.isOne() || a[0][0] * a[1][1] - a[0][1] * a[1][0] === 0);
    return {
      prompt: w.na.prompt.radius,
      q: `A = ${matTex(a)}`,
      ...exact(rho, [["jacobiSeidelRadiusSwapped", Math.sqrt(rho.toNumber())]]),
      steps: [
        `T_{GS} = -(D + L)^{-1} U, \\quad \\lambda \\in \\left\\{ 0, \\; \\frac{a_{12} a_{21}}{a_{11} a_{22}} \\right\\}`,
        `\\rho(T_{GS}) = \\left| \\frac{${a[0][1]} \\cdot ${F(a[1][0]).texP()}}{${a[0][0]} \\cdot ${F(a[1][1]).texP()}} \\right| = ${rho.tex()}`,
      ],
    };
  }
  // A 2 × 2 matrix with |a₁₁| ≤ |a₁₂|; Jacobi converges exactly when |a₁₂ a₂₁| < |a₁₁ a₂₂|.
  const converges = r.next() < 0.6;
  let a: number[][];
  let ratio: number;
  do {
    const a11 = nz(r, -4, 4);
    const a12 = Math.abs(a11) + r.int(0, 3);
    a = [
      [a11, a12 * r.sign()],
      [nz(r, -2, 2), nz(r, -9, 9)],
    ];
    ratio = Math.abs((a[0][1] * a[1][0]) / (a[0][0] * a[1][1]));
  } while (converges ? !(ratio < 1 && Math.abs(a[1][1]) > Math.abs(a[1][0])) : !(ratio > 1 && Math.abs(a[1][1]) > Math.abs(a[1][0])));
  const options = [word(w.na.converges), word(w.na.diverges)];
  const rho = `\\sqrt{\\left| \\frac{${a[0][1]} \\cdot ${F(a[1][0]).texP()}}{${a[0][0]} \\cdot ${F(a[1][1]).texP()}} \\right|}`;
  return {
    prompt: w.na.prompt.converges,
    q: `A = ${matTex(a)}`,
    ...pickOf(options, converges ? 0 : 1, [converges ? ["notDominantMeansDiverges", 1] : ["oneRowDominantEnough", 0]]),
    steps: [`T_J = -D^{-1}(L + U), \\quad \\rho(T_J) = ${rho} \\approx ${Math.sqrt(ratio).toFixed(3)}`, `\\rho(T_J) ${converges ? "<" : ">"} 1`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? luPart(r, w) : L === 2 ? sweepPart(r, w) : hardPart(r, w));

export default gen;
