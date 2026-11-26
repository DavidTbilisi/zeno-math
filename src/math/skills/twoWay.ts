// Practice: two-way tables (#651). Easy: a missing count found from its row's total, and everyone in a table without
// totals. Medium: a percentage of a row, of a column, and of everyone. Hard: whether the year and playing a sport are
// associated, by the rows' shares; and, in a new setting, who is more likely to be late, walkers or bus riders, when
// the counts point the other way. The column's total for the row's, one row for everyone, the wrong total for a share,
// and counts compared for shares are slips. Since #735 half the questions are new kinds: a table built from what is
// told (easy); the marginal share of a row, and whether a pair of shares is a marginal or a conditional distribution
// (medium); a share read off a mosaic plot, and whether a share went up or down when the counts went the other way
// (hard). Everyone taken for the row, the other row's count, a cell for the row's total, the two kinds swapped, the
// column's width read for a height, the other part read, and the counts' trend for the shares' are the slips.
import { mosaicSvg } from "../displays";
import { pickPart } from "../tTails";
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
  /** A percentage answer: exact, typed with or without the % sign; a slip counts typed to a decimal place or two (33.3 for 33.33…), and one equal to the answer or to a slip before it is dropped. */
  const percent = (v: number, traps: [Trap["id"], number, Record<string, string | number>][]): Pick<Part, "answer" | "show" | "plain" | "format"> => ({
    answer: { ...num(v, 1e-6), traps: traps.filter(([, x], i) => Math.abs(x - v) > 0.2 && traps.findIndex(([, y]) => Math.abs(y - x) <= 0.2) === i).map(([id, x, vars]) => ({ id, a: num(x, 0.051), vars })) },
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

  const more = (): Part => {
    const K = w.twK;
    if (L === 1) {
      // Of N students, a in Year 7; b of Year 7 and c of Year 8 play: Year 8 without a sport is N − a − c.
      const N = r.pick([40, 50, 60, 80]);
      const a = r.int(12, N - 12);
      const [b, c] = [r.int(3, a - 3), r.int(3, N - a - 3)];
      const v = N - a - c;
      if (N - a - b === v || N - c === v || c === a + b) return more();
      return {
        prompt: fill(K.buildQ, { n: N, a, b, c }), q: "",
        answer: { ...num(v), traps: [{ id: "wholeForRow", a: num(N - c), vars: { n: N, a, y: N - a, c, v } }, { id: "wrongRowSubtracted", a: num(N - a - b), vars: { b, c, y: N - a, v } }] },
        show: String(v), plain: String(v), format: "number",
        steps: [`${N} - ${a} = ${N - a}`, `${N - a} - ${c} = ${v}`],
      };
    }
    if (L === 2) {
      const N = r.pick([20, 25, 40, 50]);
      const t0 = r.int(6, N - 6);
      if (2 * t0 === N) return more();
      const full = [[r.int(2, t0 - 2), 0], [r.int(2, N - t0 - 2), 0]];
      full[0][1] = t0 - full[0][0];
      full[1][1] = N - t0 - full[1][0];
      const i = r.int(0, 1);
      const rowT = full[i][0] + full[i][1];
      if (r.next() < 0.5)
        return {
          prompt: fill(K.margQ, { r: rows[i] }), q: "", pic: table(full, { totals: true }),
          ...percent((rowT / N) * 100, [["marginalFromCell", (full[i][0] / N) * 100, { r: rows[i], c: full[i][0], t: rowT, n: N }]]),
          steps: [`${rowT} \\div ${N} = ${pct(rowT / N)}\\%`],
        };
      // A pair of shares: of one row (conditional), or of everyone by row (marginal).
      const cond = r.next() < 0.5;
      const pair = cond ? [pct(full[i][0] / rowT), pct(full[i][1] / rowT)] : [pct((full[0][0] + full[0][1]) / N), pct((full[1][0] + full[1][1]) / N)];
      const said = fill(cond ? K.condSay : K.margSay, { p1: pair[0] + "%", p2: pair[1] + "%", r: rows[i] });
      return {
        ...pickPart(r, [K.marginal, K.conditional], cond ? 1 : 0, [{ id: "marginalCondSwapped", at: cond ? 0 : 1, vars: { r: rows[i] } }], `${said} ${K.kindQ}`,
          [cond ? `${full[i][0]} \\div ${rowT} = ${pair[0]}\\%` : `${full[0][0] + full[0][1]} \\div ${N} = ${pair[0]}\\%`]),
        pic: table(full, { totals: true }),
      };
    }
    if (r.next() < 0.5) {
      // A mosaic of 100 students: walkers g wide, bus riders 100 − g; late shares in tenths.
      const g = r.pick([30, 40, 60, 70]);
      const [s0, s1] = [r.int(1, 9), r.int(1, 9)];
      if (s0 === s1) return more();
      const cells = [[(g * s0) / 10, g - (g * s0) / 10], [((100 - g) * s1) / 10, 100 - g - ((100 - g) * s1) / 10]];
      const k = r.int(0, 1);
      const v = [s0, s1][k] * 10;
      const width = k ? 100 - g : g;
      const grp = [W.walk, W.bus][k];
      const pic = picOf(mosaicSvg([W.walk, W.bus], [W.late, W.onTime], cells));
      return {
        prompt: fill(K.mosaicQ, { g: grp }), q: "", pic,
        ...percent(v, [["mosaicWidthRead", width, { g: grp, w: width, v }], ["mosaicOtherPart", 100 - v, { g: grp, o: 100 - v, v }]]),
        steps: [`\\text{${fill(K.mosaicWhy, { g: grp, v })}}`],
      };
    }
    // Two years: walkers' count goes one way, their share the other.
    for (;;) {
      const N = r.pick([40, 50, 60]);
      const s0 = r.int(4, 7) / 10;
      const s1 = s0 - r.pick([0.1, 0.2]);
      const [a0, a1] = [Math.round(N * s0), Math.round(2 * N * s1)];
      if (a1 <= a0) continue;
      const up = r.next() < 0.5;
      // Up: the later year is the smaller one, fewer walkers but a larger share.
      const data = up ? [[a1, 2 * N - a1], [a0, N - a0]] : [[a0, N - a0], [a1, 2 * N - a1]];
      const y = r.int(2019, 2024);
      const yrs = [String(y), String(y + 1)];
      const p = data.map((d) => pct(d[0] / (d[0] + d[1])) + "%");
      return {
        ...pickPart(r, [K.up, K.down], up ? 0 : 1, [{ id: "trendByCounts", at: up ? 1 : 0, vars: { a: data[0][0], b: data[1][0], p1: p[0], p2: p[1] } }], fill(K.trendQ, { a: yrs[0], b: yrs[1] }),
          data.map((d, k) => `\\text{${yrs[k]}}: ${d[0]} \\div ${d[0] + d[1]} = ${p[k].replace("%", "\\%")}`)),
        pic: picOf(tableSvg(yrs, [W.walk, W.bus], W.total, data, { totals: true })),
      };
    }
  };
  if (r.int(0, 9) >= 5) return more();

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
