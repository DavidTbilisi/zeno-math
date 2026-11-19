// Practice: Softmax and cross-entropy.
import { fill } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Three classes' scores, whole numbers from −2 to 4 and at most 4 apart; p_k = e^{z_k} / Σ e^{z_j}.
  let zs: number[];
  do zs = [r.int(-2, 4), r.int(-2, 4), r.int(-2, 4)];
  while (Math.max(...zs) - Math.min(...zs) > 4);
  const S = zs.reduce((s, z) => s + Math.exp(z), 0);
  const p = zs.map((z) => Math.exp(z) / S);
  const q = `z = (${zs.join(", ")})`;
  const sum = zs.map((z) => `e^{${z}}`).join(" + ");
  const pTex = (k: number) => `p_${k + 1} = \\frac{e^{${zs[k]}}}{${sum}} \\approx ${dp(p[k], 4)}`;
  const at3 = (v: number) => ({ answer: num(v, 0.00051), show: dp(v, 3), plain: dp(v, 3), format: "dp3" as const });
  let k: number;
  do k = r.int(0, 2);
  while (p[k] < 0.01);
  if (L === 1) return { prompt: fill(w.prompts.smProb, { k: k + 1 }), q, ...at3(p[k]), steps: [pTex(k)] };
  if (L === 2) return { prompt: fill(w.prompts.smLoss, { k: k + 1 }), q, ...at3(-Math.log(p[k])), steps: [pTex(k), `L = -\\ln p_${k + 1} \\approx ${dp(-Math.log(p[k]), 3)}`] };
  // ∂L/∂z_i = p_i − [i is the right class].
  const i = r.next() < 0.5 ? k : (k + r.int(1, 2)) % 3;
  const v = p[i] - (i === k ? 1 : 0);
  const traps: Trap[] = i === k && Math.abs(p[i] - 0.5) > 0.002 ? [{ id: "noMinusOne", a: num(p[i], 0.00051) }] : [];
  return {
    prompt: fill(w.prompts.smGrad, { k: k + 1, i: i + 1 }),
    q,
    ...at3(v),
    answer: { ...num(v, 0.00051), traps },
    steps: [pTex(i), `\\frac{\\partial L}{\\partial z_${i + 1}} = p_${i + 1} - ${i === k ? 1 : 0} \\approx ${dp(v, 3)}`],
  };
};

export default gen;
