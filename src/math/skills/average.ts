// Practice: Averages and spread.
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const n = r.int(5, 9);
  let xs: number[];
  let stat: "mean" | "median" | "mode" | "range" | "sd";
  let v: number;
  if (L === 1) {
    stat = r.pick(["mean", "range"] as const);
    for (;;) {
      xs = Array.from({ length: n - 1 }, () => r.int(1, 20));
      const mean = r.int(5, 15);
      const last = mean * n - xs.reduce((s, x) => s + x, 0);
      if (last >= 1 && last <= 25) {
        xs.push(last);
        break;
      }
    }
  } else if (L === 2) {
    stat = r.pick(["median", "mode"] as const);
    xs = Array.from({ length: n }, () => r.int(1, 30));
    if (stat === "mode") {
      const m = xs[0];
      xs[1] = m;
      xs[2] = m;
      const counts = new Map<number, number>();
      xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
      if ([...counts.entries()].filter(([, c]) => c >= 3).length > 1) return gen(r, L, w);
    }
  } else {
    stat = "sd";
    xs = Array.from({ length: n }, () => r.int(1, 20));
    if (new Set(xs).size === 1) xs[0]++;
  }
  // Shuffle (Fisher–Yates), so a mode or the last value doesn't sit at a fixed place.
  for (let i = xs.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  if (stat === "mean") v = mean;
  else if (stat === "range") v = sorted[n - 1] - sorted[0];
  else if (stat === "median") v = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  else if (stat === "mode") v = [...new Set(sorted)].reduce((best, x) => (sorted.filter((y) => y === x).length > sorted.filter((y) => y === best).length ? x : best), sorted[0]);
  else v = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  return {
    prompt: w.prompts[stat],
    q: xs.join(",\\ "),
    answer: num(v, stat === "sd" ? 0.0051 : 1e-9),
    show: stat === "sd" ? `s \\approx ${dp(v, 2)}` : String(v),
    plain: stat === "sd" ? dp(v, 2) : String(v),
    format: stat === "sd" ? "dp2" : "number",
    solution: { kind: "statistics", spec: { topic: "data", values: xs.join(" "), chart: "dot", bins: 0 } },
  };
};

export default gen;
