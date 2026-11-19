// Practice: Confidence intervals.
import { fill } from "../chart";
import { tUpper, zUpper } from "../inference";
import { dp } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const conf = r.pick([90, 95, 99]);
  const tail = (1 - conf / 100) / 2;
  const base = { topic: "ci", d: "", e: "", f: "", data: "", data2: "", level: String(conf), alt: "ne", seed: 1 };
  if (L === 3) {
    const n = r.pick([100, 200, 250, 400, 500]);
    const x = r.int(Math.round(n * 0.2), Math.round(n * 0.8));
    const p = x / n;
    const E = zUpper(tail) * Math.sqrt((p * (1 - p)) / n);
    return {
      prompt: fill(w.prompts.ciP, { n, x, c: conf }),
      q: "",
      answer: { k: "tuple", vs: [p - E, p + E], tol: 0.00051 },
      show: `(${dp(p - E, 3)}, \\; ${dp(p + E, 3)})`,
      plain: `(${dp(p - E, 3)}; ${dp(p + E, 3)})`,
      format: "interval",
      solution: { kind: "inference", spec: { ...base, kind: "prop", a: String(x), b: String(n), c: "" } },
    };
  }
  const n = L === 1 ? r.pick([25, 36, 49, 64, 100]) : r.int(8, 30);
  const m = r.int(20, 80) + r.pick([0, 0.5, 0.2, 0.8]);
  const s = r.int(2, 15);
  const crit = L === 1 ? zUpper(tail) : tUpper(tail, n - 1);
  const E = (crit * s) / Math.sqrt(n);
  return {
    prompt: fill(L === 1 ? w.prompts.ciZ : w.prompts.ciT, { n, m, s, c: conf }),
    q: "",
    answer: { k: "tuple", vs: [m - E, m + E], tol: 0.0051 },
    show: `(${dp(m - E, 2)}, \\; ${dp(m + E, 2)})`,
    plain: `(${dp(m - E, 2)}; ${dp(m + E, 2)})`,
    format: "interval",
    solution: { kind: "inference", spec: { ...base, kind: L === 1 ? "z" : "t", a: String(m), b: String(s), c: String(n) } },
  };
};

export default gen;
