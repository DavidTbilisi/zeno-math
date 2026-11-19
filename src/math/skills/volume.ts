// Practice: Surface area & volume.
import { fill, r2 } from "../chart";
import { solidFigure } from "../euclid";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "solids", src } });
  const pic = (src: string, ask?: string) => {
    const f = solidFigure(src, ask);
    return f ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${f.svg}</g>`, h: f.h, w: f.w } : undefined;
  };
  const out = (prompt: string, q: string, v: number, src: string, figSrc: string, ask?: string) => {
    const whole = Math.abs(v - Math.round(v)) < 1e-9;
    return {
      prompt,
      q,
      pic: pic(figSrc, ask),
      answer: num(v, whole ? 1e-9 : 0.0051),
      show: whole ? String(Math.round(v)) : dp(v, 2),
      plain: whole ? String(Math.round(v)) : dp(v, 2),
      format: whole ? ("number" as const) : ("dp2" as const),
      solution: sol(src),
    };
  };
  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [l, wd, h] = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
      const src = `cuboid ${l} x ${wd} x ${h}`;
      return out(w.prompts.volume, "", l * wd * h, src, src);
    }
    if (kind === 1) {
      const [b, h, l] = [2 * r.int(2, 5), r.int(2, 8), r.int(4, 12)];
      const src = `prism b = ${b} h = ${h} l = ${l}`;
      return out(w.prompts.volume, "", (b * h * l) / 2, src, src);
    }
    const [rr, h] = [r.int(2, 8), r.int(3, 15)];
    const src = `cylinder r = ${rr} h = ${h}`;
    return out(w.prompts.volume, "", Math.PI * rr * rr * h, src, src);
  }
  if (L === 2) {
    const kind = r.int(0, 3);
    if (kind === 0) {
      const [rr, h] = [r.int(2, 8), r.int(3, 15)];
      const src = `cylinder r = ${rr} h = ${h}`;
      return out(w.prompts.surface, "", 2 * Math.PI * rr * rr + 2 * Math.PI * rr * h, src, src);
    }
    if (kind === 1) {
      const [rr, h, l] = r.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const);
      const src = `cone r = ${rr} h = ${h}`;
      return r.next() < 0.5 ? out(w.prompts.volume, "", (Math.PI * rr * rr * h) / 3, src, src) : out(w.prompts.surface, "", Math.PI * rr * rr + Math.PI * rr * l, src, src);
    }
    if (kind === 2) {
      const rr = r.int(2, 10);
      const src = `sphere r = ${rr}`;
      return r.next() < 0.5 ? out(w.prompts.volume, "", (4 / 3) * Math.PI * rr ** 3, src, src) : out(w.prompts.surface, "", 4 * Math.PI * rr * rr, src, src);
    }
    const [a, h] = [2 * r.int(2, 6), r.int(3, 12)];
    const src = `pyramid a = ${a} h = ${h}`;
    return out(w.prompts.volume, "", (a * a * h) / 3, src, src);
  }
  // A length from the volume.
  const kind = r.int(0, 2);
  if (kind === 0) {
    const rr = r.int(2, 8);
    const V = r.int(100, 900);
    const h = V / (Math.PI * rr * rr);
    return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cylinder r = ${rr} V = ${V}`, `cylinder r = ${rr} h = ${h}`, "h");
  }
  if (kind === 1) {
    const V = r.int(100, 2000);
    const rr = Math.cbrt((3 * V) / (4 * Math.PI));
    return out(fill(w.prompts.solidDim, { V, d: "r" }), `V = ${V}`, rr, `sphere V = ${V}`, `sphere r = ${rr}`, "r");
  }
  const rr = r.int(2, 8);
  const V = r.int(50, 600);
  const h = (3 * V) / (Math.PI * rr * rr);
  return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cone r = ${rr} V = ${V}`, `cone r = ${rr} h = ${h}`, "h");
};

export default gen;
