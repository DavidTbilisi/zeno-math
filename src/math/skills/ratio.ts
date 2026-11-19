// Practice: Ratio.
import { fill } from "../chart";
import { type RatioSolution, ratioSteps } from "../ratioPics";
import { fracTex, gcd, num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Ratios of whole numbers (P6): whole numbers from 1 to max with no common factor, all different.
  const coprime = (n: number, max: number) => {
    for (;;) {
      const vs = Array.from({ length: n }, () => r.int(1, max));
      if (vs.reduce(gcd) === 1 && new Set(vs).size === n) return vs;
    }
  };
  // The picture: the bar model, a row of equal parts for each of A, B (and C), what is asked green; the working beneath.
  const model = (spec: RatioSolution) => ({ kind: "ratio" as const, spec: { ...spec, steps: ratioSteps(spec) } });
  const asked = (vs: number[], k: number, prompt: string) => {
    const terms = vs.map((v) => k * v);
    return { prompt, q: terms.join(" : "), answer: { k: "ratio" as const, vs }, show: vs.join(" : "), plain: vs.join(" : "), format: "ratio" as const, solution: model({ pic: "simplify", vs, k }) };
  };
  if (L === 1) {
    const [m, n] = coprime(2, 9);
    const k = r.int(2, 9);
    if (r.next() < 0.5) return asked([m, n], k, w.prompts.ratioSimplify);
    // The missing term of two equal ratios. Adding what the first term grew by, instead of multiplying, is the trap.
    const traps: Trap[] = [{ id: "addedNotScaled", a: num(k * m + n - m), vars: { a: m, b: k * m, k } }];
    return { prompt: w.prompts.ratioMissing, q: `${m} : ${n} = ${k * m} : \\,?`, answer: { ...num(k * n), traps }, show: String(k * n), plain: String(k * n), format: "number", solution: model({ pic: "partKnown", vs: [m, n], u: k, whole: false, missing: true }) };
  }
  if (L === 2) {
    const [m, n] = coprime(2, 9);
    const u = r.int(2, 12);
    if (r.next() < 0.5) {
      // A total shared in a ratio: m + n equal parts. Taking A's share as m/n of the total is the trap.
      const second = r.next() < 0.5;
      const T = u * (m + n);
      const v = u * (second ? n : m);
      const traps: Trap[] = !second && m < n && (T * m) % n === 0 ? [{ id: "ratioAsFraction", a: num((T * m) / n), vars: { m, n, s: m + n } }] : [];
      return { prompt: fill(w.prompts.ratioShare, { t: T, r: `${m} : ${n}`, who: second ? "B" : "A" }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model({ pic: "share", vs: [m, n], u, who: second ? 1 : 0 }) };
    }
    // One part known: the other part (adding what A's part grew by is the trap), or the whole.
    const whole = r.next() < 0.5;
    const v = u * (whole ? m + n : n);
    const traps: Trap[] = whole ? [] : [{ id: "addedNotScaled", a: num(u * m + n - m), vars: { a: m, b: u * m, k: u } }];
    return { prompt: fill(whole ? w.prompts.ratioWhole : w.prompts.ratioPart, { r: `${m} : ${n}`, a: u * m }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model({ pic: "partKnown", vs: [m, n], u, whole }) };
  }
  const kind = r.int(0, 2);
  if (kind === 0) return asked(coprime(3, 9), r.int(2, 6), w.prompts.ratioSimplify);
  if (kind === 1) {
    // Shared between three.
    const vs = coprime(3, 6);
    const u = r.int(2, 12);
    const T = u * vs.reduce((s, v) => s + v, 0);
    const who = r.int(0, 2);
    return { prompt: fill(w.prompts.ratioShare3, { t: T, r: vs.join(" : "), who: "ABC"[who] }), q: "", answer: num(u * vs[who]), show: String(u * vs[who]), plain: String(u * vs[who]), format: "number", solution: model({ pic: "share", vs, u, who }) };
  }
  // A part as a fraction of the whole (fraction and ratio). Taking m : n as m/n is the trap.
  const [m, n] = coprime(2, 9);
  const s = m + n;
  const traps: Trap[] = [{ id: "ratioAsFraction", a: num(m / n), vars: { m, n, s } }];
  return { prompt: fill(w.prompts.ratioFraction, { r: `${m} : ${n}` }), q: "", answer: { ...num(m / s, 1e-9, { lowest: true }), traps }, show: fracTex(m, s), plain: `${m}/${s}`, format: "fraction", solution: model({ pic: "fraction", vs: [m, n] }) };
};

export default gen;
