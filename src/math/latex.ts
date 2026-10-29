// LaTeX -> standalone SVG using MathJax (no fonts needed: glyphs become paths),
// so the result can be embedded in Excalidraw as an image.
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { SerializedMmlVisitor } from "mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js";
import { STATE } from "mathjax-full/js/core/MathItem.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const packages = AllPackages.filter((p) => p !== "bussproofs" && p !== "require" && p !== "autoload");
const doc = mathjax.document("", {
  InputJax: new TeX({ packages }),
  OutputJax: new SVG({ fontCache: "none" }),
});

// MathJax sizes in "ex"; at our base font size 1ex ≈ 9px.
const PX_PER_EX = 9;

export type RenderedSvg = { svg: string; width: number; height: number };

// MathJax turns the same TeX into the same SVG (no ids or counters), and pictures render the same lines again and
// again (each step's maths, every language, every redraw), so recent results are kept. A Map keeps insertion order:
// the oldest entry goes first once it is full.
const CACHE_SIZE = 2000;
const cache = new Map<string, RenderedSvg>();

export function latexToSvg(tex: string, color = "#1e1e1e"): RenderedSvg {
  const key = `${color}\u0000${tex}`;
  const hit = cache.get(key);
  if (hit) return { ...hit };
  const out = render(tex, color);
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return { ...out };
}

function render(tex: string, color: string): RenderedSvg {
  const node = doc.convert(tex, { display: true });
  let svg = adaptor.innerHTML(node);

  const error = svg.match(/data-mjx-error="([^"]*)"/);
  if (error) throw new Error(error[1]);

  const w = parseFloat(svg.match(/width="([\d.]+)ex"/)?.[1] ?? "1");
  const h = parseFloat(svg.match(/height="([\d.]+)ex"/)?.[1] ?? "1");
  const width = Math.max(1, Math.round(w * PX_PER_EX));
  const height = Math.max(1, Math.round(h * PX_PER_EX));

  svg = svg
    .replace(/width="[\d.]+ex"/, `width="${width}"`)
    .replace(/height="[\d.]+ex"/, `height="${height}"`)
    .replace(/style="[^"]*"/, "")
    // Table rules (e.g. the bar in augmented matrices) are styled by MathJax's page CSS,
    // which a standalone SVG image doesn't have — inline their stroke.
    .replace(/<line data-line/g, '<line stroke="currentColor" stroke-width="60" data-line')
    .replace(/<rect data-frame/g, '<rect fill="none" stroke="currentColor" stroke-width="60" data-frame')
    .replace(/currentColor/g, color);
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return { svg, width, height };
}

const mmlVisitor = new SerializedMmlVisitor();
/**
 * LaTeX as MathML, for screen readers: the SVG pictures say nothing to them, but NVDA (with MathCAT), JAWS and
 * VoiceOver read MathML aloud and let a student step through it.
 */
export function latexToMathML(tex: string): string {
  const node = doc.convert(tex, { display: true, end: STATE.CONVERT });
  const mml = mmlVisitor.visitTree(node);
  if (/<merror/.test(mml)) throw new Error("unreadable LaTeX");
  return mml;
}
