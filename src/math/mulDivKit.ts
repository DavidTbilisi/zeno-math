// What the multiplication and division skills (tables, times, divide) share: picks among expressions or equations,
// each wrong option that is a usual slip named, the order of the options set by the seed.
import type { MistakeId } from "./mistakes";
import type { Exercise, Part, Rng, Trap } from "./practiceTypes";

/** xs in an order the seed sets. */
export function shuffled<T>(r: Rng, xs: T[]): T[] {
  const all = [...xs];
  for (let i = all.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** An option written in TeX, read and typed with ×, ÷, □ and a real minus. */
export const opt = (tex: string) => {
  const text = tex.replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\square/g, "□").replace(/-/g, "−");
  return { text, plain: text, tex };
};

/**
 * A pick: the right option, the slips (each with its mistake id and hint vars; {x} is the option's own text unless
 * the vars give it) and options that are only wrong. Options are TeX.
 */
export function pickPart(
  r: Rng,
  prompt: string,
  right: string,
  slips: { tex: string; id: MistakeId; vars: Record<string, string | number> }[],
  others: string[],
  more: Pick<Part, "steps" | "solution"> & { pic?: Exercise["pic"] },
): Part {
  const options = shuffled(r, [right, ...slips.map((s) => s.tex), ...others].map(opt));
  const at = (t: string) => options.findIndex((o) => o.tex === t);
  const traps: Trap[] = slips.map((s) => ({ id: s.id, a: { k: "pick", options, right: at(s.tex) }, vars: { x: options[at(s.tex)].text, ...s.vars } }));
  return { prompt, q: "", answer: { k: "pick", options, right: at(right), traps }, show: options[at(right)].tex, plain: options[at(right)].plain, format: "pick", ...more };
}
