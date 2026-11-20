// Practice: Homomorphisms, kernels and quotients. Easy uses |G| = |ker φ| · |φ(G)| (subtracting instead of dividing,
// named) or finds φ(a) for φ: ℤₘ → ℤₙ (ka not reduced mod n, named); medium lists ker φ (0 left out, the image given
// instead, named); hard finds the order of a + H in ℤₙ/H (the order of a in ℤₙ, the size of the quotient, named) or
// says whether H is normal in G (a subgroup taken to be normal, a normal one missed, named).
import { pickOf, word } from "../calculusTwo";
import { addOrder, divisors, elementsOf, gcd, multiples, Zn } from "../groups";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** φ: ℤₘ → ℤₙ, x ↦ kx mod n, well defined because n | km. */
function homOf(r: Rng, ok: (m: number, n: number, k: number) => boolean): { m: number; n: number; k: number } {
  for (;;) {
    const [m, n] = [r.pick([6, 8, 9, 10, 12, 15, 18]), r.pick([4, 6, 8, 9, 10, 12])];
    const ks = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((k) => (k * m) % n === 0 && ok(m, n, k));
    if (ks.length) return { m, n, k: r.pick(ks) };
  }
}

const homTex = (m: number, n: number, k: number) => `\\varphi: ${Zn(m)} \\to ${Zn(n)}, \\quad \\varphi(x) = ${k}x \\bmod ${n}`;

function countingPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind < 2) {
    const g = r.pick([12, 18, 20, 24, 30, 36, 40, 48, 60]);
    const known = r.pick(divisors(g).filter((d) => d > 1 && d < g));
    const v = g / known;
    const [prompt, q, step] =
      kind === 0
        ? [fill(w.group.prompt.kernelSize, { g, i: known }), `|G| = ${g}, \\quad |\\varphi(G)| = ${known}`, `|\\ker \\varphi| = \\frac{${g}}{${known}} = ${v}`]
        : [fill(w.group.prompt.imageSize, { g, k: known }), `|G| = ${g}, \\quad |\\ker \\varphi| = ${known}`, `|\\varphi(G)| = \\frac{${g}}{${known}} = ${v}`];
    return {
      prompt,
      q,
      ...wholeOf(v, [["isoTheoremSubtracted", g - known]]),
      steps: [`G / \\ker \\varphi \\cong \\varphi(G) \\Rightarrow |G| = |\\ker \\varphi| \\cdot |\\varphi(G)|`, step],
    };
  }
  // An a whose image is not 0 and needs reducing, so the unreduced ka is a different number.
  const fits = (m: number, n: number, k: number) => Array.from({ length: m - 2 }, (_, i) => i + 2).filter((x) => k * x >= n && (k * x) % n !== 0);
  const { m, n, k } = homOf(r, (m, n, k) => fits(m, n, k).length > 0);
  const a = r.pick(fits(m, n, k));
  const v = (k * a) % n;
  return {
    prompt: fill(w.group.prompt.homValue, { a }),
    q: `\\varphi: ${Zn(m)} \\to ${Zn(n)}, \\quad \\varphi(1) = ${k}`,
    ...wholeOf(v, [["notReducedMod", k * a]]),
    steps: [`\\varphi(${a}) = \\varphi(\\underbrace{1 + \\dots + 1}_{${a}}) = ${a} \\cdot ${k} = ${k * a}`, `${k * a} \\equiv ${v} \\pmod{${n}}`],
  };
}

function kernelPart(r: Rng, w: PracticeWords): Part {
  const { m, n, k } = homOf(r, (m, n, k) => {
    const ker = multiples(n / gcd(k, n), m);
    const im = multiples(gcd(k, n), n);
    return ker.length > 1 && ker.join() !== im.join();
  });
  const t = n / gcd(k, n);
  const ker = multiples(t, m);
  const im = multiples(gcd(k, n), n);
  return {
    prompt: w.group.prompt.kernel,
    q: homTex(m, n, k),
    ...elementsOf(ker, [["forgotIdentity", ker.filter((x) => x !== 0)], ["imageForKernel", im]]),
    steps: [`${k}x \\equiv 0 \\pmod{${n}} \\iff ${t} \\mid x`, `\\ker \\varphi = \\{${ker.join(", ")}\\} \\le ${Zn(m)}`],
  };
}

function quotientPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const n = r.pick([12, 18, 20, 24, 30]);
    const d = r.pick(divisors(n).filter((x) => x > 2 && x < n));
    const a = r.pick(Array.from({ length: n - 1 }, (_, i) => i + 1).filter((x) => x % d !== 0));
    const b = a % d;
    const v = addOrder(b, d);
    return {
      prompt: fill(w.group.prompt.quotientOrder, { a, d }),
      q: `H = \\langle ${d} \\rangle \\le ${Zn(n)}, \\quad ${a} + H \\in ${Zn(n)} / H`,
      ...wholeOf(v, [["orderInGNotQuotient", addOrder(a, n)], ["orderIsGroupSize", d]]),
      steps: [`${Zn(n)} / \\langle ${d} \\rangle \\cong ${Zn(d)}, \\quad ${a} + H \\mapsto ${b}`, `|${b}| = \\frac{${d}}{\\gcd(${b}, ${d})} = ${v}`],
    };
  }
  const n = r.int(4, 8);
  const cases: { q: string; normal: boolean; step: string }[] = [
    { q: "H = \\langle (1\\,2\\,3) \\rangle \\le S_{3}", normal: true, step: "[S_{3} : H] = \\frac{6}{3} = 2 \\Rightarrow gH = Hg" },
    { q: "H = \\langle (1\\,2) \\rangle \\le S_{3}", normal: false, step: "(1\\,3)(1\\,2)(1\\,3)^{-1} = (2\\,3) \\notin H" },
    { q: `H = \\langle r \\rangle \\le D_{${n}}`, normal: true, step: `[D_{${n}} : H] = \\frac{${2 * n}}{${n}} = 2 \\Rightarrow gH = Hg` },
    { q: `H = \\{e, s\\} \\le D_{${n}}`, normal: false, step: "r s r^{-1} = r^{2} s \\notin \\{e, s\\}" },
    { q: `A_{${n}} \\le S_{${n}}`, normal: true, step: `[S_{${n}} : A_{${n}}] = 2 \\Rightarrow gH = Hg` },
    { q: `H = \\langle 2 \\rangle \\le ${Zn(2 * n)}`, normal: true, step: "g + h - g = h \\in H" },
    { q: "SL_{2}(\\mathbb{R}) \\le GL_{2}(\\mathbb{R})", normal: true, step: "\\det(gAg^{-1}) = \\det A = 1: \\; SL_{2}(\\mathbb{R}) = \\ker \\det" },
    { q: "H = \\langle (1\\,2)(3\\,4) \\rangle \\le A_{4}", normal: false, step: "(1\\,2\\,3)\\,(1\\,2)(3\\,4)\\,(1\\,2\\,3)^{-1} = (1\\,4)(2\\,3) \\notin H" },
    { q: "V = \\{e, (1\\,2)(3\\,4), (1\\,3)(2\\,4), (1\\,4)(2\\,3)\\} \\le A_{4}", normal: true, step: "g\\,(a\\,b)(c\\,d)\\,g^{-1} = (g(a)\\,g(b))(g(c)\\,g(d)) \\in V" },
  ];
  const c = r.pick(cases);
  const options = [word(w.group.normal), word(w.group.notNormal)];
  const right = c.normal ? 0 : 1;
  return {
    prompt: w.group.prompt.normal,
    q: c.q,
    ...pickOf(options, right, [[c.normal ? "normalMissed" : "subgroupAssumedNormal", 1 - right]]),
    steps: [c.step, `\\text{${options[right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? countingPart(r, w) : L === 2 ? kernelPart(r, w) : quotientPart(r, w));

export default gen;
