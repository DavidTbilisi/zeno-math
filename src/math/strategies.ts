// Problem-solving strategies (after Pólya, How to Solve It, and Zeitz, The Art and Craft of Problem Solving ch. 2,
// via the Neural OS notes): Pólya's four phases as a card you fill in for your own problem, with Pólya's own questions
// standing in for any phase left empty; and Zeitz's four start-up strategies — get your hands dirty, make it easier,
// the penultimate step, wishful thinking — each worked on one of four sample problems for an n you choose. Both are
// drawn as a square of four boxes, read clockwise, because both are four moves that loop back to the start.
import { txt } from "./algoArrays";
import { C, compose, fill, W, wrap, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type StrategyTopic = "polya" | "startup";
export const STRATEGY_TOPICS: StrategyTopic[] = ["polya", "startup"];
export type Phase = "u" | "p" | "c" | "l";
export const PHASES: Phase[] = ["u", "p", "c", "l"];
export type StartupProblem = "odds" | "handshakes" | "lockers" | "stones";
export const STARTUP_PROBLEMS: StartupProblem[] = ["odds", "handshakes", "lockers", "stones"];
export type Strategy = "hands" | "easier" | "penult" | "wishful";

/** polya: your problem and your notes for each phase · startup: a sample problem worked for n. */
export type StrategySpec = { topic: StrategyTopic; problem: string; u: string; p: string; c: string; l: string; sample: StartupProblem; n: string };

type ProblemWords = { statement: string; answer: string } & Record<Strategy, string>;
export type StrategyWords = {
  bad: string;
  info: Record<StrategyTopic, string>;
  phases: Record<Phase, string>;
  prompts: Record<Phase, string>;
  noProblem: string;
  strat: Record<Strategy, string>;
  ask: Record<Strategy, string>;
  odds: ProblemWords;
  handshakes: ProblemWords;
  lockers: ProblemWords;
  stones: ProblemWords & { lose: string };
};

const int = (s: string, w: StrategyWords, lo: number, hi: number): number => {
  const t = s.trim();
  const v = Number(t);
  if (!/^\d+$/.test(t) || v < lo || v > hi) throw new Error(fill(w.bad, { s, lo, hi }));
  return v;
};

// ---------- the square of four boxes ----------

type Art = { h: number; svg: (x: number, y: number, w: number) => string };
type Box = { title: string; color: string; ask?: string; lines: string[]; faint?: boolean; art?: Art };

const BW = (W - 32 - 28) / 2;
const CHARS = 44;

const boxHeight = (b: Box) => 30 + (b.ask ? wrap(b.ask, CHARS).length * 16 + 4 : 0) + (b.art ? b.art.h + 6 : 0) + b.lines.length * 17 + 8;

function boxSvg(b: Box, x: number, y: number, h: number): string {
  const out = [`<rect x="${x}" y="${y}" width="${BW}" height="${h}" rx="10" fill="#ffffff" stroke="${b.color}" stroke-width="2"/>`];
  out.push(`<rect x="${x}" y="${y}" width="${BW}" height="26" rx="10" fill="${b.color}"/>`, `<rect x="${x}" y="${y + 16}" width="${BW}" height="10" fill="${b.color}"/>`);
  out.push(txt(x + 12, y + 18, b.title, { size: 13.5, color: "#ffffff", bold: true }));
  let cy = y + 30;
  if (b.ask)
    for (const line of wrap(b.ask, CHARS)) {
      out.push(txt(x + 12, cy + 12, line, { size: 12, color: C.grey, italic: true }));
      cy += 16;
    }
  if (b.ask) cy += 4;
  if (b.art) {
    out.push(b.art.svg(x + 12, cy, BW - 24));
    cy += b.art.h + 6;
  }
  for (const line of b.lines) {
    out.push(txt(x + 12, cy + 13, line, { size: 12.5, color: b.faint ? C.grey : C.ink, italic: b.faint }));
    cy += 17;
  }
  return out.join("");
}

/** Four boxes clockwise from the top left, with arrows round the loop; the title wrapped above them. */
function square(title: string[], titleFaint: boolean, boxes: [Box, Box, Box, Box]): { body: string; h: number } {
  const parts: string[] = [];
  let y = 4;
  for (const line of title) {
    parts.push(txt(W / 2, y + 14, line, { size: 14.5, anchor: "middle", bold: !titleFaint, italic: titleFaint, color: titleFaint ? C.grey : C.ink }));
    y += 20;
  }
  y += 8;
  const [x0, x1] = [16, 16 + BW + 28];
  const h1 = Math.max(boxHeight(boxes[0]), boxHeight(boxes[1]));
  const h2 = Math.max(boxHeight(boxes[2]), boxHeight(boxes[3]));
  const y1 = y + h1 + 28;
  parts.push(boxSvg(boxes[0], x0, y, h1), boxSvg(boxes[1], x1, y, h1), boxSvg(boxes[2], x1, y1, h2), boxSvg(boxes[3], x0, y1, h2));
  const ar = (ax: number, ay: number, bx: number, by: number) => {
    const [dx, dy] = [Math.sign(bx - ax), Math.sign(by - ay)];
    return `<line x1="${ax}" y1="${ay}" x2="${bx - dx * 7}" y2="${by - dy * 7}" stroke="#495057" stroke-width="2"/><path d="M${bx},${by}l${-dx * 8 - dy * 5},${-dy * 8 + dx * 5}l${dy * 10},${-dx * 10}z" fill="#495057"/>`;
  };
  parts.push(
    ar(x0 + BW + 3, y + 20, x1 - 3, y + 20),
    ar(x1 + BW / 2, y + h1 + 3, x1 + BW / 2, y1 - 3),
    ar(x1 - 3, y1 + h2 - 20, x0 + BW + 3, y1 + h2 - 20),
    ar(x0 + BW / 2, y1 - 3, x0 + BW / 2, y + h1 + 3),
  );
  return { body: parts.join(""), h: y1 + h2 + 4 };
}

const notes = (s: string) => s.split("\n").flatMap((l) => (l.trim() ? wrap(l.trim(), CHARS) : []));

// ---------- Pólya's four phases ----------

const PHASE_COLOR: Record<Phase, string> = { u: C.blue, p: C.purple, c: C.orange, l: C.green };

function renderPolya(s: StrategySpec, w: StrategyWords): RenderedSvg {
  const boxes = PHASES.map((ph, i): Box => {
    const mine = notes(s[ph]);
    return { title: `${i + 1}. ${w.phases[ph]}`, color: PHASE_COLOR[ph], lines: mine.length ? mine : wrap(w.prompts[ph], CHARS), faint: !mine.length };
  }) as [Box, Box, Box, Box];
  const problem = notes(s.problem);
  const { body, h } = square(problem.length ? problem.flatMap((l) => wrap(l, 70)) : [w.noProblem], !problem.length, boxes);
  return compose("", body, h, [{ text: w.info.polya, color: "#495057" }]);
}

// ---------- Zeitz's start-up strategies on sample problems ----------

const RANGE: Record<StartupProblem, [number, number]> = { odds: [1, 30], handshakes: [2, 30], lockers: [1, 100], stones: [1, 60] };

/** Lockers left open after students 1 … n each toggle every k-th locker. */
export function openLockers(n: number): number[] {
  const open = Array<boolean>(n + 1).fill(false);
  for (let k = 1; k <= n; k++) for (let m = k; m <= n; m += k) open[m] = !open[m];
  return open.flatMap((o, m) => (o ? [m] : []));
}

/** Piles from 0 to n: true when the player to move wins (taking 1, 2 or 3, the last stone wins). */
export function stoneWins(n: number): boolean[] {
  const win: boolean[] = [];
  for (let p = 0; p <= n; p++) win.push([1, 2, 3].some((k) => k <= p && !win[p - k]));
  return win;
}

const textArt = (rows: string[], color = C.ink): Art => ({
  h: rows.length * 16,
  svg: (x, y) => rows.map((r, i) => txt(x, y + 12 + i * 16, r, { size: 12, color, bold: true })).join(""),
});

/** A small table, one cell per column; the first row the counts in, the second what they give. */
function tableArt(rows: number[][]): Art {
  const S = 26;
  return {
    h: rows.length * 22,
    svg: (x, y, w) => {
      const x0 = x + (w - rows[0].length * S) / 2;
      return rows
        .flatMap((row, r) =>
          row.map(
            (v, c) =>
              `<rect x="${x0 + c * S + 1}" y="${y + r * 22}" width="${S - 2}" height="20" rx="3" fill="${r ? "#d0ebff" : "#f1f3f5"}" stroke="${r ? C.blue : "#ced4da"}"/>` +
              txt(x0 + c * S + S / 2, y + r * 22 + 14, String(v), { size: 11, anchor: "middle", color: r ? C.blue : C.grey, bold: r > 0 }),
          ),
        )
        .join("");
    },
  };
}

function gnomons(m: number): Art {
  const S = Math.min(18, Math.floor(110 / m));
  const hues = ["#d0ebff", "#e5dbff", "#ffe8cc", "#d3f9d8", "#ffe3e3", "#fff3bf"];
  return {
    h: m * S,
    svg: (x, y, w) => {
      const x0 = x + (w - m * S) / 2;
      const out: string[] = [];
      for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) out.push(`<rect x="${x0 + c * S}" y="${y + (m - 1 - r) * S}" width="${S - 1}" height="${S - 1}" fill="${hues[Math.max(r, c) % hues.length]}" stroke="#868e96" stroke-width="0.6"/>`);
      return out.join("");
    },
  };
}

function complete(m: number): Art {
  const R = 46;
  return {
    h: 2 * R + 12,
    svg: (x, y, w) => {
      const [cx, cy] = [x + w / 2, y + R + 6];
      const pt = (i: number) => [cx + R * Math.sin((2 * Math.PI * i) / m), cy - R * Math.cos((2 * Math.PI * i) / m)];
      const out: string[] = [];
      for (let i = 0; i < m; i++)
        for (let j = i + 1; j < m; j++) {
          const [[a, b], [c, d]] = [pt(i), pt(j)];
          out.push(`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${C.purple}" stroke-width="1.3"/>`);
        }
      for (let i = 0; i < m; i++) out.push(`<circle cx="${pt(i)[0]}" cy="${pt(i)[1]}" r="5" fill="#ffffff" stroke="${C.ink}" stroke-width="1.4"/>`);
      return out.join("");
    },
  };
}

function lockerGrid(n: number, open: Set<number>): Art {
  const per = Math.min(10, n);
  const S = 24;
  return {
    h: Math.ceil(n / per) * S,
    svg: (x, y, w) => {
      const x0 = x + (w - per * S) / 2;
      const out: string[] = [];
      for (let m = 1; m <= n; m++) {
        const [cx, cy] = [x0 + ((m - 1) % per) * S, y + Math.floor((m - 1) / per) * S];
        const o = open.has(m);
        out.push(
          `<rect x="${cx + 1}" y="${cy + 1}" width="${S - 2}" height="${S - 2}" rx="3" fill="${o ? "#d3f9d8" : "#f1f3f5"}" stroke="${o ? C.green : "#ced4da"}"/>`,
          txt(cx + S / 2, cy + S / 2 + 4, String(m), { size: 9.5, anchor: "middle", color: o ? C.green : C.grey, bold: o }),
        );
      }
      return out.join("");
    },
  };
}

function pileRow(win: boolean[]): Art {
  const per = 11;
  const S = 24;
  return {
    h: Math.ceil(win.length / per) * S,
    svg: (x, y, w) => {
      const x0 = x + (w - Math.min(per, win.length) * S) / 2;
      return win
        .map((wn, p) => {
          const [cx, cy] = [x0 + (p % per) * S, y + Math.floor(p / per) * S];
          return (
            `<rect x="${cx + 1}" y="${cy + 1}" width="${S - 2}" height="${S - 2}" rx="3" fill="${wn ? "#d3f9d8" : "#ffe3e3"}" stroke="${wn ? C.green : C.red}"/>` +
            txt(cx + S / 2, cy + S / 2 + 4, String(p), { size: 10, anchor: "middle", color: wn ? C.green : C.red, bold: true })
          );
        })
        .join("");
    },
  };
}

const list = (xs: number[], most = 10) => (xs.length <= most ? xs.join(", ") : `${xs.slice(0, most).join(", ")}, …`);

function renderStartup(s: StrategySpec, w: StrategyWords): RenderedSvg {
  const [lo, hi] = RANGE[s.sample];
  const n = int(s.n, w, lo, hi);
  const pw = w[s.sample];
  let v: Record<string, string | number>;
  let art: Partial<Record<Strategy, Art>>;
  let answer: string;
  let tex: string;
  switch (s.sample) {
    case "odds": {
      const m = Math.min(n, 6);
      const k = Math.min(n, 5);
      v = { n, m, nn: n * n, last: 2 * n - 1, p: n - 1, pp: (n - 1) ** 2, two: 2 * n };
      const rows = Array.from({ length: k }, (_, i) => `${Array.from({ length: i + 1 }, (_, j) => 2 * j + 1).join(" + ")} = ${(i + 1) ** 2}`);
      art = { hands: textArt(n > k ? [...rows, "…"] : rows, C.blue), easier: gnomons(m) };
      answer = fill(pw.answer, v);
      tex = n <= 3 ? `${Array.from({ length: n }, (_, j) => 2 * j + 1).join(" + ")} = ${n}^2` : `1 + 3 + \\dots + ${2 * n - 1} = ${n}^2 = ${n * n}`;
      break;
    }
    case "handshakes": {
      const m = Math.min(n, 6);
      const h = (q: number) => (q * (q - 1)) / 2;
      v = { n, m, e: h(m), p: n - 1, hp: h(n - 1), h: h(n), np: n * (n - 1) };
      const upto = Math.min(n, 8);
      art = { hands: tableArt([Array.from({ length: upto }, (_, i) => i + 1), Array.from({ length: upto }, (_, i) => h(i + 1))]), easier: complete(m) };
      answer = fill(pw.answer, v);
      tex = `\\binom{${n}}{2} = \\frac{${n} \\cdot ${n - 1}}{2} = ${h(n)}`;
      break;
    }
    case "lockers": {
      const open = openLockers(n);
      const ten = Math.min(n, 10);
      const toggles = Array.from({ length: ten }, (_, i) => Array.from({ length: i + 1 }, (_, d) => d + 1).filter((d) => (i + 1) % d === 0).length);
      v = { n, open: list(open), ten, toggles: toggles.join(", "), odd: list(toggles.flatMap((t, i) => (t % 2 ? [i + 1] : []))), k: open.length };
      art = { hands: lockerGrid(n, new Set(open)) };
      answer = fill(pw.answer, v);
      tex = `\\lfloor \\sqrt{${n}} \\rfloor = ${open.length}`;
      break;
    }
    case "stones": {
      const win = stoneWins(n);
      const shown = win.slice(0, Math.min(n, 21) + 1);
      v = { n, r: n % 4 };
      art = { hands: pileRow(shown) };
      answer = fill(n % 4 ? pw.answer : w.stones.lose, v);
      tex = `${n} \\equiv ${n % 4} \\pmod{4}`;
      break;
    }
  }
  const order: Strategy[] = ["hands", "easier", "penult", "wishful"];
  const colors = [C.blue, C.purple, C.orange, C.green];
  const boxes = order.map((st, i): Box => ({ title: w.strat[st], color: colors[i], ask: w.ask[st], art: art[st], lines: wrap(fill(pw[st], v), CHARS) })) as [Box, Box, Box, Box];
  const { body, h } = square(wrap(fill(pw.statement, v), 70), false, boxes);
  const caps: Caption[] = [{ text: answer, color: C.green }, { text: w.info.startup, color: "#495057" }];
  return compose(tex, body, h, caps);
}

export function renderStrategies(spec: StrategySpec, words: StrategyWords): RenderedSvg {
  return spec.topic === "polya" ? renderPolya(spec, words) : renderStartup(spec, words);
}

const P = (topic: StrategyTopic, o: Partial<StrategySpec>): StrategySpec => ({ topic, problem: "", u: "", p: "", c: "", l: "", sample: "odds", n: "10", ...o });
export const STRATEGY_PRESETS: { [K in StrategyTopic]: { label: string; spec: StrategySpec }[] } = {
  polya: [
    { label: "Empty card", spec: P("polya", {}) },
    {
      label: "Handshakes, filled in",
      spec: P("polya", {
        problem: "At a party of 10 people everyone shakes hands once with everyone else. How many handshakes?",
        u: "Unknown: the number of handshakes.\nData: 10 people.\nCondition: each pair shakes exactly once.",
        p: "Seen it before? It is counting pairs.\nMake it easier: 2, 3, 4 people give 1, 3, 6.",
        c: "Each person shakes 9 hands: 10 · 9 = 90.\nEvery handshake is counted twice: 90 / 2 = 45.",
        l: "Check: 4 people give 4 · 3 / 2 = 6, as counted.\nUse it again: n people give n(n − 1)/2 = C(n, 2).",
      }),
    },
    {
      label: "Two trains, half done",
      spec: P("polya", {
        problem: "Two trains 300 km apart drive towards each other at 70 and 80 km/h. When do they meet?",
        u: "Unknown: the time t until they meet.\nData: 300 km, 70 km/h, 80 km/h.",
        p: "Change the point of view: from one train, the other comes at 70 + 80 = 150 km/h.",
      }),
    },
  ],
  startup: [
    { label: "Odd numbers, n = 10", spec: P("startup", { sample: "odds", n: "10" }) },
    { label: "Handshakes, n = 10", spec: P("startup", { sample: "handshakes", n: "10" }) },
    { label: "100 lockers", spec: P("startup", { sample: "lockers", n: "100" }) },
    { label: "30 lockers", spec: P("startup", { sample: "lockers", n: "30" }) },
    { label: "21 stones", spec: P("startup", { sample: "stones", n: "21" }) },
    { label: "20 stones", spec: P("startup", { sample: "stones", n: "20" }) },
  ],
};
