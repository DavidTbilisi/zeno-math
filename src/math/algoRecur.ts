// Recursion and backtracking for the Algorithms tool: call trees for Fibonacci (with repeated calls
// marked, or cut short by memoisation), factorial and the towers of Hanoi; N-queens solved by
// backtracking (trace + board); and subset sum as an include / skip tree with pruning.
import type { AlgoWords, RecurSpec, Steps } from "./algo";
import { legendRow, parseNum, parseNums, ROLES, table, txt, type Role } from "./algoArrays";
import { C, compose, fill, nt, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

type TN = { label: string; sub?: string; role: Role; kids: TN[]; edge?: string };

/**
 * Leaves spaced evenly left to right, each parent centred over its children, one row per depth.
 * shown: only the first calls in call order (the newest one ringed); a call's value appears once it returns.
 */
function drawTree(root: TN, y0: number, shown = Infinity): { svg: string; h: number } {
  const leaves: TN[] = [];
  const depthOf = new Map<TN, number>();
  const order = new Map<TN, number>();
  const end = new Map<TN, number>();
  const walk = (t: TN, d: number) => {
    depthOf.set(t, d);
    order.set(t, order.size);
    if (!t.kids.length) leaves.push(t);
    t.kids.forEach((k) => walk(k, d + 1));
    end.set(t, order.size - 1);
  };
  walk(root, 0);
  const D = Math.max(...depthOf.values());
  const step = Math.min(90, (W - 32) / leaves.length);
  const size = step < 34 ? 10 : step < 44 ? 11 : 12;
  const x = new Map<TN, number>();
  leaves.forEach((t, i) => x.set(t, 16 + step * (i + 0.5) + (W - 32 - step * leaves.length) / 2));
  const place = (t: TN): number => {
    if (x.has(t)) return x.get(t)!;
    const xs = t.kids.map(place);
    const v = (xs[0] + xs[xs.length - 1]) / 2;
    x.set(t, v);
    return v;
  };
  place(root);
  const rowH = 48;
  const yOf = (t: TN) => y0 + 14 + depthOf.get(t)! * rowH;
  const boxW = (t: TN) => Math.max(26, t.label.length * size * 0.62 + 10);
  const lines: string[] = [];
  const boxes: string[] = [];
  const visit = (t: TN) => {
    const [tx, ty] = [x.get(t)!, yOf(t)];
    for (const k of t.kids) {
      if (order.get(k)! >= shown) continue;
      const [kx, ky] = [x.get(k)!, yOf(k)];
      lines.push(`<line x1="${r2(tx)}" y1="${r2(ty + 11)}" x2="${r2(kx)}" y2="${r2(ky - 11)}" stroke="#adb5bd" stroke-width="1.4"/>`);
      if (k.edge) lines.push(txt((tx + kx) / 2 + (kx < tx ? -6 : 6), (ty + ky) / 2 + 3, k.edge, { size: 10.5, color: C.blue, anchor: kx < tx ? "end" : "start", bold: true }));
      visit(k);
    }
    const r = ROLES[t.role];
    const bw = boxW(t);
    if (order.get(t) === shown - 1 && shown < order.size)
      boxes.push(`<rect x="${r2(tx - bw / 2 - 4)}" y="${r2(ty - 15)}" width="${r2(bw + 8)}" height="30" rx="9" fill="none" stroke="${C.orange}" stroke-width="2.5"/>`);
    boxes.push(
      `<rect x="${r2(tx - bw / 2)}" y="${r2(ty - 11)}" width="${r2(bw)}" height="22" rx="6" fill="${r.fill}" stroke="${r.stroke}" stroke-width="1.4"/>`,
      txt(tx, ty + 4, t.label, { size, anchor: "middle", color: r.text, bold: true }),
    );
    if (t.sub && end.get(t)! < shown) boxes.push(txt(tx, ty + 23, t.sub, { size: size - 1, anchor: "middle", color: C.green, bold: true }));
  };
  visit(root);
  return { svg: lines.join("") + boxes.join(""), h: 14 + D * rowH + 30 };
}

const count = (t: TN): number => 1 + t.kids.reduce((s, k) => s + count(k), 0);

function nIn(spec: RecurSpec, w: AlgoWords, a: number, b: number): number {
  return parseNum(spec.n, w, (v) => Number.isInteger(v) && v >= a && v <= b);
}

export function renderRecur(spec: RecurSpec, w: AlgoWords, st: Steps): RenderedSvg {
  const r = w.recur;
  const caps: Caption[] = [];
  let tex = "";
  let body = "";
  let h = 0;
  // A call tree, one call per step (the first call is always there).
  const tree = (root: TN) => drawTree(root, 0, 1 + st.count(count(root) - 1));
  const legend = (items: { role: Role; text: string }[]) => {
    const l = legendRow(items, h + 8);
    body += l.svg;
    h += 8 + l.h;
  };

  if (spec.problem === "fib") {
    const n = nIn(spec, w, 1, spec.memo ? 10 : 6);
    const fibs = [0, 1];
    for (let i = 2; i <= n; i++) fibs.push(fibs[i - 1] + fibs[i - 2]);
    const seen = new Set<number>();
    let repeats = 0;
    const build = (k: number): TN => {
      const again = seen.has(k);
      seen.add(k);
      if (again && spec.memo) return { label: `f(${k})`, sub: String(fibs[k]), role: "idle", kids: [] };
      if (again) repeats++;
      if (k <= 1) return { label: `f(${k})`, sub: String(fibs[k]), role: again ? "compare" : "sorted", kids: [] };
      return { label: `f(${k})`, sub: String(fibs[k]), role: again ? "compare" : "plain", kids: [build(k - 1), build(k - 2)] };
    };
    const root = build(n);
    const t = tree(root);
    body = t.svg;
    h = t.h;
    const calls = count(root);
    tex = `f(n) = f(n-1) + f(n-2),\\quad f(0) = 0,\\ f(1) = 1 \\qquad f(${n}) = ${fibs[n]}`;
    caps.push(...st.final({ text: fill(r.calls, { calls, distinct: n + 1 }), color: C.blue }));
    if (spec.memo) {
      legend([{ role: "idle", text: r.legend.cached }, { role: "sorted", text: r.legend.base }]);
      caps.push({ text: r.memoOn, color: C.green });
    } else {
      legend([{ role: "compare", text: r.legend.repeated }, { role: "sorted", text: r.legend.base }]);
      caps.push(...st.final({ text: fill(r.memoOff, { k: repeats }), color: C.orange }));
    }
  } else if (spec.problem === "fact") {
    const n = nIn(spec, w, 1, 8);
    const facts = [1];
    for (let i = 1; i <= n; i++) facts.push(facts[i - 1] * i);
    const build = (k: number): TN =>
      k <= 1 ? { label: `${k}!`, sub: "= 1", role: "sorted", kids: [] } : { label: `${k}!`, sub: `= ${k} · ${facts[k - 1]} = ${facts[k]}`, role: "plain", kids: [build(k - 1)] };
    const t = tree(build(n));
    body = t.svg;
    h = t.h;
    tex = `n! = n \\cdot (n-1)!,\\quad 1! = 1 \\qquad ${n}! = ${facts[n]}`;
    caps.push({ text: fill(r.factInfo, { n }), color: C.blue });
  } else if (spec.problem === "hanoi") {
    const n = nIn(spec, w, 1, 4);
    const moves: string[] = [];
    const build = (k: number, from: string, to: string, via: string): TN => {
      if (k === 1) {
        moves.push(`${from}→${to}`);
        return { label: `1: ${from}→${to}`, sub: `#${moves.length}`, role: "sorted", kids: [] };
      }
      const left = build(k - 1, from, via, to);
      moves.push(`${from}→${to}`);
      const mid: TN = { label: `${k}: ${from}→${to}`, sub: `#${moves.length}`, role: "sorted", kids: [] };
      const right = build(k - 1, via, to, from);
      return { label: `h(${k}, ${from}→${to})`, role: "plain", kids: [left, mid, right] };
    };
    const root = build(n, "A", "C", "B");
    const t = tree(root);
    body = t.svg;
    h = t.h;
    tex = `h(n, A \\to C) = h(n-1, A \\to B),\\ \\text{disc } n: A \\to C,\\ h(n-1, B \\to C) \\qquad 2^{${n}} - 1 = ${moves.length}`;
    legend([{ role: "sorted", text: r.legend.move }]);
    caps.push(...st.final({ text: fill(r.hanoiMoves, { n, m: moves.length, list: moves.map((m, i) => `${i + 1}. ${m}`).join("  ") }), color: C.blue }));
  } else if (spec.problem === "queens") {
    const n = nIn(spec, w, 4, 8);
    const col: number[] = [];
    // Each step of the search up to the first solution, with the board after it.
    const steps: { s: string; back: boolean; board: number[] }[] = [];
    let tries = 0;
    let backs = 0;
    let first: number[] | null = null;
    let sols = 0;
    const safe = (row: number, c: number) => col.every((cc, rr) => cc !== c && Math.abs(cc - c) !== row - rr);
    const solve = (row: number) => {
      if (row === n) {
        sols++;
        if (!first) first = col.slice();
        return;
      }
      let placed = false;
      for (let c = 0; c < n; c++) {
        if (!safe(row, c)) continue;
        tries++;
        placed = true;
        if (!first) steps.push({ s: fill(r.place, { r: row + 1, c: c + 1 }), back: false, board: [...col, c] });
        col.push(c);
        solve(row + 1);
        col.pop();
      }
      // A dead end: no column in this row is safe at all (counted over the whole search).
      if (!placed) backs++;
      if (!first) steps.push({ s: fill(placed ? r.backAfter : r.noSafe, { r: row + 1 }), back: true, board: col.slice() });
    };
    solve(0);
    const k = st.count(steps.length);
    // The board with the first solution, or part-way the board after step k (the newest queen orange).
    const sol = st.partial ? (k ? steps[k - 1].board : []) : (first as number[] | null);
    const newRow = st.partial && k && !steps[k - 1].back ? sol!.length - 1 : -1;
    const S = Math.min(30, Math.floor(250 / n));
    const parts: string[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const q = sol && sol[i] === j;
        const color = !st.partial ? C.green : i === newRow ? C.orange : C.blue;
        const bg = !st.partial ? "#d3f9d8" : color === C.orange ? ROLES.compare.fill : ROLES.key.fill;
        parts.push(`<rect x="${16 + j * S}" y="${10 + i * S}" width="${S}" height="${S}" fill="${q ? bg : (i + j) % 2 ? "#dee2e6" : "#f8f9fa"}" stroke="#ced4da" stroke-width="0.6"/>`);
        if (q) parts.push(txt(16 + j * S + S / 2, 10 + i * S + S / 2 + S * 0.25, "♛", { size: Math.round(S * 0.72), anchor: "middle", color }));
      }
    // The first steps of the search, or part-way the last ones up to step k.
    const from = st.partial ? Math.max(0, k - 13) : 0;
    const shown = steps.slice(from, st.partial ? k : 13);
    const more = st.partial ? 0 : steps.length - shown.length;
    const tb = table(16 + n * S + 20, 10, [{ head: "#", w: 34 }, { head: r.cols.action, w: W - (16 + n * S + 20) - 50 }], [
      ...(from > 0 ? [{ cells: ["…", ""], colors: [C.grey] }] : []),
      ...shown.map((s, i) => ({ cells: [String(from + i + 1), s.s], colors: [C.grey, s.back ? C.red : C.ink] })),
      ...(more > 0 ? [{ cells: ["…", fill(r.more, { k: more })], colors: [C.grey, C.grey] }] : []),
    ], 21);
    body = parts.join("") + tb.svg;
    h = Math.max(10 + n * S, 10 + tb.h) + 6;
    tex = `n = ${n}`;
    caps.push(...st.final({ text: fill(r.queensStats, { tries, backs, n, sols }), color: C.blue }));
    caps.push(...st.final({ text: r.queensInfo, color: "#495057" }));
  } else {
    const items = parseNums(spec.data, w, 4, true);
    if (items.some((v) => v <= 0)) throw new Error(fill(w.badNumber, { s: spec.data }));
    const t = parseNum(spec.target, w, (v) => Number.isInteger(v) && v > 0);
    const found: string[] = [];
    let cut = 0;
    const build = (i: number, sum: number, chosen: number[], edge?: string): TN => {
      if (sum === t) {
        found.push(`{${chosen.join(", ")}}`);
        return { label: nt(sum), role: "sorted", kids: [], edge, sub: "✓" };
      }
      if (sum > t) {
        cut++;
        return { label: nt(sum), role: "min", kids: [], edge, sub: "✗" };
      }
      if (i === items.length) return { label: nt(sum), role: "idle", kids: [], edge };
      return { label: nt(sum), role: "plain", edge, kids: [build(i + 1, sum + items[i], [...chosen, items[i]], `+${items[i]}`), build(i + 1, sum, chosen)] };
    };
    const tr = tree(build(0, 0, []));
    body = tr.svg;
    h = tr.h;
    tex = `\\{${items.join(",\\ ")}\\},\\quad \\text{target } ${t}`;
    legend([{ role: "sorted", text: r.legend.found }, { role: "min", text: r.legend.pruned }, { role: "idle", text: r.legend.deadEnd }]);
    caps.push(
      ...st.final(
        found.length ? { text: fill(r.subsetsFound, { k: found.length, t, list: found.join("  ") }), color: C.green } : { text: fill(r.subsetsNone, { t }), color: C.red },
        { text: fill(r.subsetsInfo, { cut }), color: "#495057" },
      ),
    );
  }
  caps.push({ text: r.info[spec.problem], color: "#495057" });
  return compose(tex, body, h, caps);
}
