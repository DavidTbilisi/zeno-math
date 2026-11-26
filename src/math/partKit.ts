// Helpers for practice parts with named slips (#738, #739): a fraction or a number answer whose slips equal to the
// answer, or lying within the checker's rounding band of it, are dropped; a pick with its options kept in order.
import { dp, fr, num, plainFrac } from "./practiceKit";
import type { Part, Trap } from "./practiceTypes";

/** A picture built by a display function, placed where the practice card puts it. */
export const place = (p: { body: string; w: number; h: number }): Part["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${p.body}</g>`, h: p.h, w: p.w });
/** A fraction in lowest terms, as TeX and as typed. */
export const ft = (n: number, d: number) => fr(n, d).tex();
export const fp = (n: number, d: number) => plainFrac(fr(n, d));
/** Slips within `tol` of the answer, or of a slip before them, are dropped. */
export const keep = (v: number, traps: Trap[], tol: number) => {
  const val = (t: Trap) => (t.a.k === "num" ? t.a.v : NaN);
  const far = (a: number, b: number) => Math.abs(a - b) > tol;
  return traps.filter((t, i) => far(val(t), v) && traps.findIndex((u) => !far(val(u), val(t))) === i);
};
export const tf = (id: Trap["id"], v: number, vars: Record<string, string | number>, tol = 1e-9): Trap => ({ id, a: num(v, tol), vars });
export const fracPart = (prompt: string, n: number, d: number, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => {
  const p = fr(n, d);
  return {
    prompt, q: "", ...(pic ? { pic } : {}),
    answer: { ...num(p.toNumber(), 1e-9, { lowest: true }), traps: keep(p.toNumber(), traps, 1e-9) },
    show: p.tex(), plain: plainFrac(p), format: "fraction", steps,
  };
};
/**
 * A number answer: exact when tol is tiny, else to 2 decimal places (3 when tol < 0.004). The checker calls anything
 * within 20 × tol "check your rounding", so slips that near the answer are dropped rather than left unnamed.
 */
export const numPart = (prompt: string, v: number, traps: Trap[], steps: string[], tol = 1e-9, pic?: Part["pic"]): Part => {
  const places = tol > 1e-6 ? (tol < 0.004 ? 3 : 2) : 0;
  const shown = places ? dp(v, places) : String(v);
  return {
    prompt, q: "", ...(pic ? { pic } : {}),
    answer: { ...num(v, tol), traps: keep(v, traps, places ? tol * 21 : Math.max(tol, 1e-9) * 2) },
    show: shown, plain: shown, format: places === 3 ? "dp3" : places === 2 ? "dp2" : "number", steps,
  };
};
/** Options in the order given (a scale, or A then B). */
export const inOrder = (options: string[], right: number, traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[], prompt: string, steps: string[], pic?: Part["pic"]): Part => {
  const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
  return {
    prompt, q: "", ...(pic ? { pic } : {}),
    answer: { k: "pick", options: opts, right, traps: traps.filter((t) => t.at !== right).map((t) => ({ id: t.id, a: { k: "pick", options: opts, right: t.at }, vars: t.vars })) },
    show: opts[right].tex, plain: options[right], format: "pick", steps,
  };
};
