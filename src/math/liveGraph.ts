// The live graph on the board: functions of x with letters in them (y = a·x² + b·x + c) that become sliders. This finds
// the letters, draws the curves for the current values, and writes a frozen copy with the numbers put in.
import * as math from "mathjs";
import { ConstantNode, parse, type MathNode } from "mathjs";
import type { LiveGraphState, LiveParam } from "./live";

export const MAX_PARAMS = 6;

const clean = (expr: string) => expr.replace(/^\s*y\s*=/, "");

/** The letters an expression uses besides x and mathjs's own names (pi, e, sin…), in the order they appear. */
export function paramsOf(expr: string): string[] {
  const found: string[] = [];
  parse(clean(expr)).traverse((node, path, parent) => {
    if (node.type !== "SymbolNode" || (parent?.type === "FunctionNode" && path === "fn")) return;
    const name = (node as unknown as { name: string }).name;
    if (name === "x" || name in math || found.includes(name)) return;
    found.push(name);
  });
  return found;
}

/** The letters of all the functions, at most MAX_PARAMS of them; a function that doesn't parse adds none. */
export function allParams(exprs: string[]): string[] {
  const out: string[] = [];
  for (const e of exprs) {
    let ps: string[] = [];
    try {
      ps = paramsOf(e);
    } catch {
      /* unreadable for now: the row shows it */
    }
    for (const p of ps) if (!out.includes(p) && out.length < MAX_PARAMS) out.push(p);
  }
  return out;
}

/** f(x) for the given letters, or a reason it can't be drawn. Unknown letters count as 1 until they get a slider. */
export function compileWith(expr: string): { f: (x: number, scope: Record<string, number>) => number } | { error: string } {
  try {
    const code = parse(clean(expr)).compile();
    const f = (x: number, scope: Record<string, number>) => {
      try {
        const y = code.evaluate({ ...scope, x });
        return typeof y === "number" ? y : NaN;
      } catch {
        return NaN;
      }
    };
    return { f };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** The curve as runs of points, broken where it's undefined or leaps (an asymptote), in the graph's own units. */
export function sample(f: (x: number) => number, xMin: number, xMax: number, yMin: number, yMax: number, n = 600): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  const jump = (yMax - yMin) * 2;
  let prev = NaN;
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const y = f(x);
    if (!Number.isFinite(y) || (Number.isFinite(prev) && Math.abs(y - prev) > jump)) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
    if (Number.isFinite(y)) run.push([x, Math.max(yMin - (yMax - yMin), Math.min(yMax + (yMax - yMin), y))]);
    prev = y;
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** The gradient at x, from the two sides. */
export function slope(f: (x: number) => number, x: number, h = 1e-4): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** A tidy number for a slider's value: no more decimals than its step has. */
export function roundTo(v: number, step: number): number {
  const d = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(v.toFixed(Math.min(d, 10)));
}

export const stepFor = (p: LiveParam) => {
  const raw = (p.max - p.min) / 100;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
};

/** The expression with each letter replaced by its value, for a frozen copy that the ordinary graph tool can draw. */
export function substitute(expr: string, values: Record<string, number>): string {
  const out = parse(clean(expr)).transform((node: MathNode, path, parent) => {
    if (node.type !== "SymbolNode" || (parent?.type === "FunctionNode" && path === "fn")) return node;
    const name = (node as unknown as { name: string }).name;
    if (!(name in values)) return node;
    const v = values[name];
    return v < 0 ? parse(`(${v})`) : new ConstantNode(v);
  });
  return out.toString({ parenthesis: "keep", implicit: "show" });
}

/** Each letter keeps its slider; new letters start at 1 on −5 … 5; letters no longer used are dropped. */
export function syncParams(state: LiveGraphState): Record<string, LiveParam> {
  const names = allParams(state.fns.map((f) => f.expr));
  return Object.fromEntries(names.map((n) => [n, state.params[n] ?? { v: 1, min: -5, max: 5 }]));
}

/** Zoom about a point of the graph (in its units); factor < 1 zooms in. */
export function zoomView(v: LiveGraphState["view"], at: [number, number], factor: number): LiveGraphState["view"] {
  return {
    xMin: at[0] + (v.xMin - at[0]) * factor,
    xMax: at[0] + (v.xMax - at[0]) * factor,
    yMin: at[1] + (v.yMin - at[1]) * factor,
    yMax: at[1] + (v.yMax - at[1]) * factor,
  };
}
