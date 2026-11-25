// Practice: two-way tables (#651). Easy: a missing count found from its row's total, and everyone in a table without
// totals. Medium: a percentage of a row, of a column, and of everyone. Hard: whether the year and playing a sport are
// associated, by the rows' shares; and, in a new setting, who is more likely to be late, walkers or bus riders, when
// the counts point the other way. The column's total for the row's, one row for everyone, the wrong total for a share,
// and counts compared for shares are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { pct, tableSvg } from "../twoWay";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });
const NICE = [20, 25, 40, 50];

const gen: Gen = (r, L, w) => {
  const W = w.twy;
  const rows = [W.y7, W.y8];
  const cols = [W.sport, W.noSport];
  const table = (full: number[][], o: { totals: boolean; hide?: [number, number] }) => picOf(tableSvg(rows, cols, W.total, full, o));
  /** A percentage answer: exact, typed with or without the % sign; a slip counts typed to a decimal place or two (33.3 for 33.33…), and one equal to the answer is dropped. */
  const percent = (v: number, traps: [Trap["id"], number, Record<string, string | number>][]): Pick<Part, "answer" | "show" | "plain" | "format"> => ({
    answer: { ...num(v, 1e-6), traps: traps.filter(([, x]) => Math.abs(x - v) > 0.2).map(([id, x, vars]) => ({ id, a: num(x, 0.051), vars })) },
    show: `${pct(v / 100)}\\%`, plain: pct(v / 100), format: "number",
  });
  const pick = (options: string[], right: number, trap: Trap, prompt: string, steps: string[], pic: Part["pic"]): Part => {
    const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    return {
      prompt, q: "", pic,
      answer: { k: "pick", options: opts, right, traps: [{ ...trap, a: { k: "pick", options: opts, right: 1 - right } }] },
      show: opts[right].tex, plain: options[right], format: "pick", steps,
    };
  };

  if (L === 1) {
    const full = [[r.int(4, 30), r.int(4, 30)], [r.int(4, 30), r.int(4, 30)]];
    if (r.next() < 0.6) {
      const i = r.int(0, 1);
      const j = r.int(0, 1);
      const rowT = full[i][0] + full[i][1];
      const colT = full[0][j] + full[1][j];
      const other = full[i][1 - j];
      const v = full[i][j];
      const wrong = colT - other;
      const traps: Trap[] = wrong !== v && wrong > 0 ? [{ id: "cellWrongTotal", a: num(wrong), vars: { r: rows[i], t: rowT, o: other, v } }] : [];
      return {
        prompt: W.missing, q: "", pic: table(full, { totals: true, hide: [i, j] }),
        answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number",
        steps: [`${rowT} - ${other} = ${v}`],
      };
    }
    const r0 = full[0][0] + full[0][1];
    const r1 = full[1][0] + full[1][1];
    return {
      prompt: W.everyone, q: "", pic: table(full, { totals: false }),
      answer: { ...num(r0 + r1), traps: [{ id: "grandOneRow", a: num(r0), vars: { r: rows[0], a: r0, b: r1, v: r0 + r1 } }, { id: "grandOneRow", a: num(r1), vars: { r: rows[1], a: r0, b: r1, v: r0 + r1 } }] },
      show: String(r0 + r1), plain: String(r0 + r1), format: "number",
      steps: [`${full[0].join(" + ")} + ${full[1].join(" + ")} = ${r0 + r1}`],
    };
  }

  if (L === 2) {
    const t = r.pick(["row", "col", "all"] as const);
    // The total asked about is a nice number, so the share is an exact percentage.
    let full: number[][];
    if (t === "row") {
      const i = r.int(0, 1);
      const n = r.pick(NICE);
      const a = r.int(3, n - 3);
      full = i === 0 ? [[a, n - a], [r.int(3, 30), r.int(3, 30)]] : [[r.int(3, 30), r.int(3, 30)], [a, n - a]];
      const col = full[0][0] + full[1][0];
      const all = full.flat().reduce((s, v) => s + v, 0);
      return {
        prompt: fill(W.rowShare, { r: rows[i] }), q: "", pic: table(full, { totals: true }),
        ...percent((a / n) * 100, [
          ["shareOfColumn", (a / col) * 100, { c: cols[0], r: rows[i], n: a, t: n }],
          ["shareOfAll", (a / all) * 100, { n: a, t: n }],
        ]),
        steps: [`${a} \\div ${n} = ${pct(a / n)}\\%`],
      };
    }
    if (t === "col") {
      const i = r.int(0, 1);
      const n = r.pick(NICE);
      const a = r.int(3, n - 3);
      full = i === 0 ? [[a, r.int(3, 30)], [n - a, r.int(3, 30)]] : [[n - a, r.int(3, 30)], [a, r.int(3, 30)]];
      const row = full[i][0] + full[i][1];
      const all = full.flat().reduce((s, v) => s + v, 0);
      return {
        prompt: fill(W.colShare, { r: rows[i] }), q: "", pic: table(full, { totals: true }),
        ...percent((a / n) * 100, [
          ["shareOfRow", (a / row) * 100, { r: rows[i], n: a, t: n }],
          ["shareOfAll", (a / all) * 100, { n: a, t: n }],
        ]),
        steps: [`${a} \\div ${n} = ${pct(a / n)}\\%`],
      };
    }
    const N = r.pick([50, 100]);
    for (;;) {
      const [a, b, c] = [r.int(3, N / 3), r.int(3, N / 3), r.int(3, N / 3)];
      const d = N - a - b - c;
      if (d < 3) continue;
      full = [[a, b], [c, d]];
      const i = r.int(0, 1);
      const n = full[i][0];
      return {
        prompt: fill(W.allShare, { r: rows[i] }), q: "", pic: table(full, { totals: true }),
        ...percent((n / N) * 100, [
          ["shareOfRow", (n / (full[i][0] + full[i][1])) * 100, { r: rows[i], n, t: N }],
          ["shareOfColumn", (n / (a + c)) * 100, { c: cols[0], r: rows[i], n, t: N }],
        ]),
        steps: [`${n} \\div ${N} = ${pct(n / N)}\\%`],
      };
    }
  }

  if (r.next() < 0.5) {
    // Shares the same but counts different, or counts the same but shares different.
    const alike = r.next() < 0.5;
    let full: number[][];
    if (alike) {
      const [s, t] = r.pick([[1, 4], [2, 5], [1, 3], [3, 5], [3, 10]] as const);
      const [m1, m2] = [r.int(3, 8), r.int(3, 8)];
      if (m1 === m2) return gen(r, L, w);
      full = [[s * m1, (t - s) * m1], [s * m2, (t - s) * m2]];
    } else {
      const k = r.int(6, 20);
      const [b, d] = [r.int(5, 40), r.int(5, 40)];
      if (Math.abs(k / (k + b) - k / (k + d)) < 0.08) return gen(r, L, w);
      full = [[k, b], [k, d]];
    }
    const [p1, p2] = full.map((row) => pct(row[0] / (row[0] + row[1])) + "%");
    return pick([W.assocYes, W.assocNo], alike ? 1 : 0, { id: "assocByCounts", a: { k: "pick", options: [], right: 0 }, vars: { p1, p2 } }, W.assoc,
      [0, 1].map((i) => `\\text{${rows[i]}}: ${full[i][0]} \\div ${full[i][0] + full[i][1]} = ${pct(full[i][0] / (full[i][0] + full[i][1]))}\\%`),
      table(full, { totals: true }));
  }
  // Walkers and bus riders: the smaller group has fewer late but a larger share late; which group is smaller varies.
  for (;;) {
    const small = r.pick([20, 25, 40, 50]);
    const big = r.pick([60, 75, 80, 100]);
    const ls = r.int(4, small - 4);
    const lb = r.int(ls + 2, Math.min(big - 4, ls + 20));
    const [ps, pb] = [ls / small, lb / big];
    if (ps - pb < 0.05) continue;
    // right: the row of the smaller group, the more likely to be late.
    const right = r.int(0, 1);
    const late = right === 0 ? [ls, lb] : [lb, ls];
    const tot = right === 0 ? [small, big] : [big, small];
    const full = [0, 1].map((k) => [late[k], tot[k] - late[k]]);
    const pic = picOf(tableSvg([W.walk, W.bus], [W.late, W.onTime], W.total, full, { totals: true }));
    const p = (k: number) => pct(late[k] / tot[k]);
    return pick([W.walkers, W.riders], right, { id: "likelyByCount", a: { k: "pick", options: [], right: 1 - right }, vars: { p1: p(0) + "%", p2: p(1) + "%" } }, W.likely,
      [0, 1].map((k) => `\\text{${[W.walk, W.bus][k]}}: ${late[k]} \\div ${tot[k]} = ${p(k)}\\%`), pic);
  }
};

export default gen;
