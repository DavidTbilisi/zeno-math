// Practice: Trig identities.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import { fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "identities" as const, spec: { topic, src } });
  if (L === 1) {
    // sin, cos, tan of 15°, 75°, 105°, 165°: from the compound angle formulas.
    const f = r.pick(["sin", "cos", "tan"] as const);
    const deg = r.pick([15, 75, 105, 165]);
    const t = (deg * Math.PI) / 180;
    const v = f === "sin" ? Math.sin(t) : f === "cos" ? Math.cos(t) : Math.tan(t);
    const [s6, s2, s3] = [Math.sqrt(6), Math.sqrt(2), Math.sqrt(3)];
    const forms: [number, string, string, string, string][] = [
      [(s6 + s2) / 4, "\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "(sqrt(6) + sqrt(2))/4", "-\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "-(sqrt(6) + sqrt(2))/4"],
      [(s6 - s2) / 4, "\\frac{\\sqrt{6} - \\sqrt{2}}{4}", "(sqrt(6) - sqrt(2))/4", "\\frac{\\sqrt{2} - \\sqrt{6}}{4}", "(sqrt(2) - sqrt(6))/4"],
      [2 + s3, "2 + \\sqrt{3}", "2 + sqrt(3)", "-2 - \\sqrt{3}", "-2 - sqrt(3)"],
      [2 - s3, "2 - \\sqrt{3}", "2 - sqrt(3)", "\\sqrt{3} - 2", "sqrt(3) - 2"],
    ];
    const m = forms.find((x) => Math.abs(Math.abs(v) - x[0]) < 1e-9)!;
    const [show, plain] = v > 0 ? [m[1], m[2]] : [m[3], m[4]];
    return { prompt: w.prompts.trigexact, q: `\\${f} ${deg}^\\circ`, answer: num(v), show, plain, format: "exact", solution: sol("compound", `${f} ${deg}°`) };
  }
  if (L === 2) {
    // A Pythagorean triple gives sin A, cos A and tan A; the double angle formulas give the rest.
    let [a, b, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]] as const) as unknown as [number, number, number];
    if (r.next() < 0.5) [a, b] = [b, a];
    const f = r.pick(["sin", "cos", "tan"] as const);
    const g = r.pick(["sin", "cos", "tan"] as const);
    const given = f === "sin" ? fr(a, h) : f === "cos" ? fr(b, h) : fr(a, b);
    const v = g === "sin" ? fr(2 * a * b, h * h) : g === "cos" ? fr(b * b - a * a, h * h) : fr(2 * a * b, b * b - a * a);
    return {
      prompt: fill(w.prompts.idDouble, { f, v: plainFrac(given) }),
      q: `\\${g} 2A`,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("compound", `${f} A = ${plainFrac(given)}, A acute; ${g} 2A`),
    };
  }
  // The greatest value of a sin x + b cos x is R = √(a² + b²).
  const [a, b] = [r.nz(-6, 6), r.nz(-6, 6)];
  const { out, s } = sqrtSplit(fr(a * a + b * b));
  const R = Math.sqrt(a * a + b * b);
  const src = `${a} sin x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos x`;
  return {
    prompt: w.prompts.idMax,
    q: `${a === 1 ? "" : a === -1 ? "-" : a}\\sin x ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}\\cos x`,
    answer: num(R, 1e-9, { surd: true }),
    show: s === 1 ? String(out.n) : surdTex(fr(0), out, s),
    plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
    format: "exact",
    solution: sol("rform", src),
  };
};

export default gen;
