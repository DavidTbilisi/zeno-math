// Practice: Subgroups, cosets and Lagrange's theorem. Easy counts the cosets of H in G by Lagrange (|G| − |H|, named)
// or lists the orders Lagrange allows a subgroup (1 and |G| left out, named); medium lists the cyclic subgroup ⟨a⟩ of
// ℤₙ (0 left out, the multiples of a without going round, named); hard lists a coset a + H (H itself, the sums not
// reduced mod n, named) or counts the cosets of ⟨a⟩ (the size of ⟨a⟩, named).
import { divisors, elementsOf, gcd, mod, multiples, setOfTex, Zn } from "../groups";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function lagrangePart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const g = r.pick([12, 18, 20, 24, 30, 36, 40, 48, 60]);
    const h = r.pick(divisors(g).filter((d) => d > 1 && d < g));
    const v = g / h;
    return {
      prompt: fill(w.group.prompt.index, { g, h }),
      q: `|G| = ${g}, \\quad |H| = ${h}`,
      ...wholeOf(v, [["indexSubtracted", g - h]]),
      steps: [`|G| = [G : H] \\cdot |H|`, `[G : H] = \\frac{${g}}{${h}} = ${v}`],
    };
  }
  const g = r.pick([6, 8, 10, 12, 15, 16, 18, 20, 21, 28]);
  const ds = divisors(g);
  return {
    prompt: fill(w.group.prompt.subgroupOrders, { g }),
    q: `|G| = ${g}`,
    ...elementsOf(ds, [["forgotTrivialSubgroups", ds.filter((d) => d > 1 && d < g)]]),
    steps: [`|H| \\mid |G| = ${g}`, `|\\{e\\}| = 1, \\; |G| = ${g}: \\quad |H| \\in ${setOfTex(ds)}`],
  };
}

function cyclicSubgroupPart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([8, 9, 10, 12, 14, 15, 16, 18, 20]);
  const a = r.pick(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => gcd(x, n) > 1 && gcd(x, n) < x));
  const g = gcd(a, n);
  const H = multiples(g, n);
  const noWrap = Array.from({ length: Math.ceil(n / a) }, (_, i) => i * a);
  const run = Array.from({ length: H.length }, (_, i) => ((i + 1) * a) % n);
  return {
    prompt: w.group.prompt.cyclicSubgroup,
    q: `\\langle ${a} \\rangle \\le ${Zn(n)}`,
    ...elementsOf(H, [["forgotIdentity", H.filter((x) => x !== 0)], ["noWrapAround", noWrap]]),
    steps: [run.map((x, i) => `${i + 1} \\cdot ${a} \\equiv ${x}`).join(", \\; "), `\\langle ${a} \\rangle = \\langle \\gcd(${a}, ${n}) \\rangle = \\langle ${g} \\rangle = ${setOfTex(H)}`],
  };
}

function cosetPart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([8, 10, 12, 15, 16, 18, 20, 24]);
  if (r.int(0, 1) === 0) {
    const d = r.pick(divisors(n).filter((x) => x > 1 && x < n));
    const H = multiples(d, n);
    const a = r.pick(Array.from({ length: n - 1 }, (_, i) => i + 1).filter((x) => x % d !== 0 && x > d));
    const sums = H.map((h) => a + h);
    const v = sums.map((x) => mod(x, n));
    return {
      prompt: fill(w.group.prompt.coset, { a, d }),
      q: `H = \\langle ${d} \\rangle = ${setOfTex(H)} \\le ${Zn(n)}`,
      ...elementsOf(v, [["cosetIsSubgroup", H], ["notReducedMod", sums]]),
      steps: [`${a} + H = \\{${H.map((h) => `${a} + ${h}`).join(", ")}\\}`, `\\equiv ${setOfTex([...v].sort((x, y) => x - y))} \\pmod{${n}}`],
    };
  }
  const a = r.pick(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => gcd(x, n) > 1));
  const g = gcd(a, n);
  return {
    prompt: fill(w.group.prompt.cosetCount, { a }),
    q: `\\langle ${a} \\rangle \\le ${Zn(n)}`,
    ...wholeOf(g, [["indexIsOrder", n / g]]),
    steps: [`|\\langle ${a} \\rangle| = \\frac{${n}}{\\gcd(${a}, ${n})} = ${n / g}`, `[${Zn(n)} : \\langle ${a} \\rangle] = \\frac{${n}}{${n / g}} = ${g}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? lagrangePart(r, w) : L === 2 ? cyclicSubgroupPart(r, w) : cosetPart(r, w));

export default gen;
