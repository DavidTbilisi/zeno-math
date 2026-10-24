// Interview problems on recursion: each solver works the problem out the way it is meant to be worked out (a call per
// nested array, swapping into place and back, a memo of what has been tried, backtracking) and leaves a frame at every
// step with a note on what happened.
import { cells, done, fill, grid2, int, intervals, letters, listText, nums, row, show, text, edges, type Errors, type Frame, type GraphEdge, type ProblemSet, type Role } from "./core";

// ——— Product sum: reading a nested array ———

type Nested = (number | Nested)[];

/** "[5, [7, -1], 3]" (or the same without the outer brackets) as nested arrays. */
function nested(s: string, bad: string, e: Errors): Nested {
  let t = s.replace(/[−–—]/g, "-").trim();
  if (!t) throw new Error(e.empty);
  if (!t.startsWith("[")) t = `[${t}]`;
  const tokens = t.match(/\[|\]|,|-?\d+(?:\.\d+)?|[^\s[\],]+/g) ?? [];
  let at = 0;
  const fail = (): never => {
    throw new Error(fill(bad, { s: tokens[at] ?? "…" }));
  };
  const array = (): Nested => {
    if (tokens[at] !== "[") fail();
    at++;
    const out: Nested = [];
    if (tokens[at] === "]") return at++, out;
    for (;;) {
      if (tokens[at] === "[") out.push(array());
      else if (tokens[at] !== undefined && Number.isFinite(Number(tokens[at]))) out.push(Number(tokens[at++]));
      else fail();
      if (tokens[at] === "]") return at++, out;
      if (tokens[at] !== ",") fail();
      at++;
    }
  };
  const out = array();
  if (at < tokens.length) fail();
  return out;
}

// ——— Sudoku ———

const BOX = (r: number, c: number) => 3 * Math.floor(r / 3) + Math.floor(c / 3);

function sudoku(s: string, size: string, clash: string): number[][] {
  const rows = s.split(/[;\n]/).map((r) => r.trim()).filter(Boolean).map((r) => (/[\s,]/.test(r) ? r.split(/[\s,]+/) : [...r]).map((d) => (d === "." ? "0" : d)));
  if (rows.length !== 9 || rows.some((r) => r.length !== 9 || r.some((d) => !/^\d$/.test(d)))) throw new Error(size);
  const board = rows.map((r) => r.map(Number));
  const seen = new Set<string>();
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const d = board[r][c];
      if (!d) continue;
      for (const key of [`r${r}:${d}`, `c${c}:${d}`, `b${BOX(r, c)}:${d}`]) {
        if (seen.has(key)) throw new Error(fill(clash, { d }));
        seen.add(key);
      }
    }
  return board;
}

/** Frames that would make a trace too long to step through are counted instead, and said in one note. */
const CAP = 60;

const KEYPAD: Record<string, string[]> = {
  "0": ["0"], "1": ["1"], "2": [..."abc"], "3": [..."def"], "4": [..."ghi"], "5": [..."jkl"], "6": [..."mno"], "7": [..."pqrs"], "8": [..."tuv"], "9": [..."wxyz"],
};

export const RECURSION: ProblemSet<"recursion"> = {
  nthFibonacci: {
    level: 1,
    example: ["9"],
    solve: ([s], w, e) => {
      const n = int(s, e, 1, 30);
      const seq = n === 1 ? [0] : [0, 1];
      let [a, b] = [0, 1];
      const frames: Frame[] = [{ note: w.start, rows: [row(w.kept, [a, b], () => "key"), row(w.sequence, seq)] }];
      for (let k = 3; k <= n; k++) {
        const v = a + b;
        frames.push({
          note: fill(w.step, { k, a, b, v }),
          rows: [row(w.kept, [b, v], (i) => (i === 1 ? "key" : "compare")), row(w.sequence, [...seq, v], (i) => (i === seq.length ? "key" : i >= seq.length - 2 ? "compare" : "plain"))],
        });
        seq.push(v);
        [a, b] = [b, v];
      }
      const v = n === 1 ? 0 : b;
      return done(frames, fill(w.answer, { n, v }), { rows: [row(w.kept, [a, b]), row(w.sequence, seq, (i) => (i === n - 1 ? "sorted" : "plain"))] });
    },
  },

  productSum: {
    level: 1,
    example: ["[3, [4, -2], 1, [[5, 6], -7]]"],
    solve: ([s], w, e) => {
      const root = nested(s, w.bad, e);
      // The nodes level by level (arrays and numbers), so the layered picture puts them in order.
      type Node = { label: string; layer: number; parent: number; item: number | Nested };
      const nodes: Node[] = [{ label: "×1", layer: 0, parent: -1, item: root }];
      for (let i = 0; i < nodes.length; i++) {
        const it = nodes[i].item;
        if (typeof it === "number") continue;
        for (const x of it) nodes.push({ label: typeof x === "number" ? show(x) : `×${nodes[i].layer + 2}`, layer: nodes[i].layer + 1, parent: i, item: x });
        if (nodes.length > 16) throw new Error(fill(w.big, { n: 16 }));
      }
      if (Math.max(...nodes.map((n) => n.layer)) > 4) throw new Error(fill(w.big, { n: 16 }));
      const kids = nodes.map((_, i) => nodes.flatMap((n, k) => (n.parent === i ? [k] : [])));
      const tags = nodes.map(() => "");
      const state: Role[] = nodes.map(() => "plain");
      const frames: Frame[] = [];
      const pic = (note: string, now: number, stack: number[]): Frame => ({
        note,
        graph: {
          nodes: nodes.map((n) => n.label),
          edges: nodes.flatMap((n, i): GraphEdge[] => (n.parent < 0 ? [] : [{ a: n.parent, b: i, role: stack.includes(n.parent) && (stack.includes(i) || i === now) ? "compare" : undefined }])),
          roles: nodes.map((_, i) => (i === now ? "key" : stack.includes(i) ? "compare" : state[i])),
          directed: false,
          layer: nodes.map((n) => n.layer),
          tags: [...tags],
        },
      });
      const sum = (at: number, d: number, stack: number[]): number => {
        let total = 0;
        tags[at] = "Σ 0";
        if (at > 0) frames.push(pic(fill(w.enter, { d }), at, stack));
        for (const k of kids[at]) {
          if (typeof nodes[k].item === "number") {
            total += nodes[k].item;
            tags[at] = `Σ ${show(total)}`;
            state[k] = "sorted";
            frames.push(pic(fill(w.add, { d, v: show(nodes[k].item), s: show(total) }), k, [...stack, at]));
          } else total += sum(k, d + 1, [...stack, at]);
          tags[at] = `Σ ${show(total)}`;
        }
        const p = total * d;
        tags[at] = `= ${show(p)}`;
        state[at] = "sorted";
        frames.push(pic(fill(w.leave, { s: show(total), d, p: show(p) }), at, stack));
        return p;
      };
      frames.push(pic(w.start, 0, []));
      const v = sum(0, 1, []);
      return done(frames, fill(w.answer, { v: show(v) }));
    },
  },

  permutations: {
    level: 2,
    example: ["1, 2, 3"],
    solve: ([s], w, e) => {
      const xs = nums(s, e, { max: 4 });
      if (new Set(xs).size !== xs.length) throw new Error(w.distinct);
      const n = xs.length;
      const found: string[] = [];
      const frames: Frame[] = [];
      const pic = (note: string, i: number, j: number, hot: Role): Frame => ({
        note,
        cells: cells(xs, (k) => (k === i ? hot : k < i ? "sorted" : k === j ? "compare" : "plain"), i < n ? { i, j } : undefined),
        rows: [row(w.found, found, (k) => (k === found.length - 1 && hot === "sorted" ? "key" : "sorted"))],
      });
      const go = (i: number) => {
        if (i === n - 1) {
          found.push(xs.map(show).join(" "));
          frames.push(pic(fill(w.full, { list: listText(xs), k: found.length }), n, -1, "sorted"));
          return;
        }
        for (let j = i; j < n; j++) {
          [xs[i], xs[j]] = [xs[j], xs[i]];
          frames.push(pic(fill(j === i ? w.keep : w.take, { i, j, v: show(xs[i]) }), i, j, "key"));
          go(i + 1);
          [xs[i], xs[j]] = [xs[j], xs[i]];
          if (j !== i) frames.push(pic(fill(w.back, { j, v: show(xs[j]) }), i, j, "plain"));
        }
      };
      go(0);
      return done(frames, fill(w.answer, { n: found.length, list: found.map((p) => `[${p.split(" ").join(", ")}]`).join(", ") }));
    },
  },

  powerset: {
    level: 2,
    example: ["4, -1, 7"],
    solve: ([s], w, e) => {
      const xs = nums(s, e, { max: 5 });
      if (new Set(xs).size !== xs.length) throw new Error(w.distinct);
      const subsets: number[][] = [[]];
      const frames: Frame[] = [{ note: w.start, cells: cells(xs), rows: [row(w.subsets, ["[]"], () => "key")] }];
      for (const [i, x] of xs.entries()) {
        const before = subsets.length;
        for (let k = 0; k < before; k++) {
          const t = [...subsets[k], x];
          subsets.push(t);
          frames.push({
            note: fill(w.add, { s: listText(subsets[k]), x: show(x), t: listText(t) }),
            cells: cells(xs, (c) => (c === i ? "key" : c < i ? "sorted" : "plain")),
            rows: [row(w.subsets, subsets.map((u) => listText(u)), (c) => (c === subsets.length - 1 ? "key" : c === k ? "compare" : "plain"))],
          });
        }
      }
      return done(frames, fill(w.answer, { n: subsets.length, list: subsets.map((u) => listText(u)).join(", ") }));
    },
  },

  phoneNumberMnemonics: {
    level: 2,
    example: ["1905"],
    solve: ([s], w, e) => {
      const digits = [...text(s, e, 12).replace(/[\s-]/g, "")];
      if (!digits.length || digits.some((d) => !/^\d$/.test(d))) throw new Error(w.digits);
      const total = digits.reduce((p, d) => p * KEYPAD[d].length, 1);
      if (total > 36) throw new Error(fill(w.tooMany, { n: total, m: 36 }));
      const word: string[] = digits.map(() => "");
      const found: string[] = [];
      const frames: Frame[] = [];
      const go = (i: number) => {
        if (i === digits.length) return;
        const options = KEYPAD[digits[i]];
        for (const [k, c] of options.entries()) {
          word[i] = c;
          for (let j = i + 1; j < word.length; j++) word[j] = "";
          const last = i === digits.length - 1;
          if (last) found.push(word.join(""));
          frames.push({
            note: last ? fill(w.word, { d: digits[i], i, c, s: word.join(""), k: found.length }) : fill(w.try, { d: digits[i], i, c }),
            cells: cells(digits, (j) => (j === i ? "key" : j < i ? "sorted" : "plain"), { i }),
            rows: [
              row(w.letters, options, (j) => (j === k ? "key" : j < k ? "idle" : "plain")),
              row(w.current, word, (j) => (j === i ? "key" : j < i ? "sorted" : "plain")),
              row(w.found, found, (j) => (last && j === found.length - 1 ? "key" : "sorted")),
            ],
          });
          go(i + 1);
        }
      };
      go(0);
      return done(frames, fill(w.answer, { n: found.length, list: found.join(", ") }));
    },
  },

  staircaseTraversal: {
    level: 2,
    example: ["7", "3"],
    solve: ([h, k], w, e) => {
      const height = int(h, e, 1, 13);
      const most = int(k, e, 1, 13);
      const ways: (number | string)[] = Array.from({ length: height + 1 }, (_, i) => (i === 0 ? 1 : ""));
      const frames: Frame[] = [{ note: w.start, cells: cells(ways, (i) => (i === 0 ? "sorted" : "plain")) }];
      let current = 0;
      for (let i = 1; i <= height; i++) {
        const [start, end] = [i - most - 1, i - 1];
        const drop = start >= 0;
        if (drop) current -= ways[start] as number;
        current += ways[end] as number;
        ways[i] = current;
        const lo = Math.max(0, i - most);
        frames.push({
          note: fill(drop ? w.slide : w.add, { i, j: end, a: ways[end], d: start, b: drop ? ways[start] : 0, v: current }),
          cells: cells(ways, (c) => (c === i ? "key" : c === start ? "idle" : c >= lo && c < i ? "compare" : c < i ? "sorted" : "plain"), { i }, [lo, end]),
        });
      }
      return done(frames, fill(w.answer, { h: height, v: current }), { cells: cells(ways, (c) => (c === height ? "key" : "sorted")) });
    },
  },

  blackjackProbability: {
    level: 2,
    example: ["21", "12"],
    solve: ([t0, s0], w, e) => {
      const t = int(t0, e, 4, 40);
      const start = int(s0, e, Math.max(0, t - 14), 40);
      const lo = t - 4;
      // The hands the dealer draws on, then a column for stopping and one for bust.
      const first = Math.min(start, lo);
      const hands = Array.from({ length: Math.max(0, lo - first) }, (_, i) => first + i);
      const heads = [...hands.map(String), `${lo}–${t}`, `>${t}`];
      const vals: (number | string)[] = [...hands.map(() => ""), 0, 1];
      const col = (h: number) => (h > t ? hands.length + 1 : h >= lo ? hands.length : h - first);
      const memo = new Map<number, number>();
      const frames: Frame[] = [];
      const pic = (note: string, h: number, from: number, to: number): Frame => ({
        note,
        mat: {
          vals: [[...vals]],
          roles: [vals.map((_, c) => (c === col(h) ? "key" : c >= from && c <= to ? "compare" : vals[c] === "" ? "plain" : "sorted"))],
          rowHeads: [w.bust],
          colHeads: heads,
        },
      });
      const calc = (h: number): number => {
        const known = memo.get(h);
        if (known !== undefined) return known;
        if (h > t) return 1;
        if (h >= lo) return 0;
        frames.push(pic(fill(w.draw, { h, lo, a: h + 1, b: h + 10 }), h, col(h + 1), col(h + 10)));
        let p = 0;
        for (let d = 1; d <= 10; d++) p += 0.1 * calc(h + d);
        memo.set(h, p);
        vals[col(h)] = p.toFixed(3);
        const range = Array.from({ length: 10 }, (_, d) => h + d + 1);
        const v = { h, b: range.filter((x) => x > t).length, s: range.filter((x) => x >= lo && x <= t).length, r: range.filter((x) => x < lo).length, p: p.toFixed(3) };
        frames.push(pic(fill(w.worked, v), h, col(h + 1), col(h + 10)));
        return p;
      };
      if (start > t) frames.push(pic(fill(w.over, { h: start, t }), start, -1, -1));
      else if (start >= lo) frames.push(pic(fill(w.stand, { h: start, lo, t }), start, -1, -1));
      const p = calc(start);
      return done(frames, fill(w.answer, { p: String(Math.round(p * 1000) / 1000) }), { mat: { ...frames[frames.length - 1].mat!, roles: [vals.map((_, c) => (c === col(start) ? "sorted" : "plain"))] } });
    },
  },

  revealMinesweeper: {
    level: 2,
    example: ["HHHHHH; HMHHHH; HHHHHH; HHHHMH; HHHHHH", "0, 5"],
    solve: ([b, c], w, e) => {
      const board = letters(b.toUpperCase(), e, 8, 8);
      const odd = board.flat().find((x) => x !== "M" && x !== "H");
      if (odd !== undefined) throw new Error(fill(e.bad, { s: odd }));
      const [R, C] = [board.length, board[0].length];
      let at: number[];
      try {
        at = nums(c, e, { whole: true, least: 2, max: 2 });
      } catch {
        throw new Error(w.square);
      }
      const [r0, c0] = at;
      if (r0 < 0 || r0 >= R) throw new Error(fill(e.range, { s: show(r0), lo: 0, hi: R - 1 }));
      if (c0 < 0 || c0 >= C) throw new Error(fill(e.range, { s: show(c0), lo: 0, hi: C - 1 }));
      const frames: Frame[] = [];
      const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const around = (r: number, k: number) => DIRS.map(([dr, dc]) => [r + dr, k + dc]).filter(([y, x]) => y >= 0 && y < R && x >= 0 && x < C);
      const pic = (note: string, r: number, k: number, near: number[][]): Frame => ({
        note,
        mat: {
          vals: board.map((line) => line.map((v) => (v === "H" ? "" : v))),
          roles: grid2(R, C, (y, x) =>
            y === r && x === k ? (board[y][x] === "X" ? "min" : "key") : near.some(([a, d]) => a === y && d === x) ? "compare" : board[y][x] === "M" ? "idle" : board[y][x] === "H" ? "plain" : "sorted",
          ),
        },
      });
      const reveal = (r: number, k: number) => {
        if (board[r][k] === "M") {
          board[r][k] = "X";
          frames.push(pic(fill(w.mine, { r, c: k }), r, k, []));
          return;
        }
        const near = around(r, k);
        const mines = near.filter(([y, x]) => board[y][x] === "M").length;
        board[r][k] = String(mines);
        frames.push(pic(fill(mines ? w.count : w.zero, { r, c: k, n: mines }), r, k, near));
        if (mines) return;
        for (const [y, x] of near) if (board[y][x] === "H") reveal(y, x);
      };
      reveal(r0, c0);
      return done(frames, fill(w.answer, { rows: board.map((line) => line.join("")).join("; ") }));
    },
  },

  lowestCommonManager: {
    level: 3,
    example: ["A>B, A>C, B>D, B>E, C>F, C>G, E>H, E>I", "A", "H", "D"],
    solve: ([chart, top0, one0, two0], w, e) => {
      const g = edges(chart, e, { nodes: 15, max: 14 });
      const name = (s: string) => {
        const t = text(s, e, 12);
        if (!g.names.includes(t)) throw new Error(fill(w.unknown, { s: t }));
        return g.names.indexOf(t);
      };
      const [top, one, two] = [name(top0), name(one0), name(two0)];
      const n = g.names.length;
      const boss = Array(n).fill(-1);
      for (const { a, b } of g.edges) {
        if (boss[b] >= 0 || a === b) throw new Error(fill(w.notTree, { m: g.names[top] }));
        boss[b] = a;
      }
      // Level by level from the top: everyone must be reached, and gets their place in the picture.
      const order = [top];
      const layer = Array(n).fill(-1);
      layer[top] = 0;
      for (let i = 0; i < order.length; i++)
        for (const { a, b } of g.edges)
          if (a === order[i] && layer[b] < 0) {
            layer[b] = layer[a] + 1;
            order.push(b);
          }
      if (order.length !== n || boss[top] >= 0) throw new Error(fill(w.notTree, { m: g.names[top] }));
      const pos = Array(n).fill(0);
      order.forEach((v, i) => (pos[v] = i));
      const reports = (m: number) => g.edges.filter((x) => x.a === m).map((x) => x.b);
      const count: (number | null)[] = Array(n).fill(null);
      let found = -1;
      const frames: Frame[] = [];
      const pic = (note: string, now: number): Frame => ({
        note,
        graph: {
          nodes: order.map((v) => g.names[v]),
          edges: g.edges.map(({ a, b }) => ({ a: pos[a], b: pos[b], role: count[b] ? "compare" : undefined })),
          roles: order.map((v): Role => (v === found ? "sorted" : v === now ? "key" : count[v] === null ? (v === one || v === two ? "pivot" : "plain") : count[v] ? "compare" : "idle")),
          directed: true,
          layer: order.map((v) => layer[v]),
          tags: order.map((v) => (count[v] === null ? "" : String(count[v]))),
        },
      });
      const [a, b] = [g.names[one], g.names[two]];
      frames.push(pic(fill(w.start, { a, b }), -1));
      const visit = (m: number): boolean => {
        let k = 0;
        for (const r of reports(m)) {
          if (visit(r)) return true;
          k += count[r]!;
        }
        k += (m === one ? 1 : 0) + (m === two ? 1 : 0);
        count[m] = k;
        if (k === 2) {
          found = m;
          frames.push(pic(fill(w.found, { m: g.names[m] }), m));
          return true;
        }
        frames.push(pic(fill(w.count, { m: g.names[m], k }), m));
        return false;
      };
      visit(top);
      return done(frames, fill(w.answer, { m: g.names[found] }));
    },
  },

  interweavingStrings: {
    level: 3,
    example: ["baa", "aab", "baaaba"],
    solve: ([s1, s2, s3], w, e) => {
      const [one, two, three] = [[...text(s1, e, 7)], [...text(s2, e, 7)], [...text(s3, e, 14)]];
      const [A, B, S] = [one.join(""), two.join(""), three.join("")];
      const memo: (boolean | null)[][] = grid2(one.length + 1, two.length + 1, () => null);
      const path: [number, number][] = [];
      const frames: Frame[] = [];
      const pic = (note: string, i: number, j: number, end?: boolean): Frame => ({
        note,
        cells: cells(three, (k) => (k < i + j ? "sorted" : k === i + j && !end ? "compare" : "plain"), i + j < three.length ? { k: i + j } : undefined),
        mat: {
          vals: memo.map((r) => r.map((v) => (v === false ? "✗" : v ? "✓" : ""))),
          roles: grid2(one.length + 1, two.length + 1, (y, x) =>
            y === i && x === j ? (memo[y][x] === false ? "min" : end ? "sorted" : "key") : path.some(([p, q]) => p === y && q === x) ? (end ? "sorted" : "compare") : memo[y][x] === false ? "idle" : "plain",
          ),
          rowHeads: ["–", ...one],
          colHeads: ["–", ...two],
        },
        rows: [row(w.one, one, (k) => (k < i ? "sorted" : k === i ? "compare" : "plain")), row(w.two, two, (k) => (k < j ? "sorted" : k === j ? "compare" : "plain"))],
      });
      if (one.length + two.length !== three.length) {
        frames.push(pic(fill(w.lengths, { a: one.length, b: two.length, c: three.length }), 0, 0));
        return done(frames, fill(w.no, { s: S, a: A, b: B }));
      }
      const go = (i: number, j: number): boolean => {
        if (memo[i][j] === false) {
          frames.push(pic(fill(w.seen, { i, j }), i, j));
          return false;
        }
        const k = i + j;
        if (k === three.length) {
          memo[i][j] = true;
          path.push([i, j]);
          frames.push(pic(w.all, i, j, true));
          return true;
        }
        path.push([i, j]);
        const c = three[k];
        if (i < one.length && one[i] === c) {
          frames.push(pic(fill(w.takeOne, { k, c, i }), i, j));
          if (go(i + 1, j)) return (memo[i][j] = true);
        }
        if (j < two.length && two[j] === c) {
          frames.push(pic(fill(w.takeTwo, { k, c, j }), i, j));
          if (go(i, j + 1)) return (memo[i][j] = true);
        }
        memo[i][j] = false;
        frames.push(pic(fill(w.dead, { i, j }), i, j));
        path.pop();
        return false;
      };
      const yes = go(0, 0);
      return done(frames, fill(yes ? w.yes : w.no, { s: S, a: A, b: B }));
    },
  },

  solveSudoku: {
    level: 3,
    example: ["000060290; 032780061; 610203004; 126930040; 058612900; 309805602; 560129078; 001308056; 783450120"],
    solve: ([s], w) => {
      const board = sudoku(s, w.size, w.clash);
      const given = board.map((r) => r.map((d) => d > 0));
      const frames: Frame[] = [];
      let tries = 0;
      let hidden = 0;
      const pic = (note: string, r: number, c: number, role: Role): Frame => ({
        note,
        mat: { vals: board.map((line) => line.map((d) => (d ? d : ""))), roles: grid2(9, 9, (y, x) => (y === r && x === c ? role : given[y][x] ? "plain" : board[y][x] ? "sorted" : "plain")) },
      });
      const step = (note: string, r: number, c: number, role: Role) => {
        if (frames.length < CAP) frames.push(pic(note, r, c, role));
        else hidden++;
      };
      const fits = (r: number, c: number, d: number) => {
        for (let k = 0; k < 9; k++) if (board[r][k] === d || board[k][c] === d) return false;
        const [r0, c0] = [r - (r % 3), c - (c % 3)];
        for (let y = r0; y < r0 + 3; y++) for (let x = c0; x < c0 + 3; x++) if (board[y][x] === d) return false;
        return true;
      };
      const solve = (at: number): boolean => {
        while (at < 81 && board[Math.floor(at / 9)][at % 9]) at++;
        if (at === 81) return true;
        const [r, c] = [Math.floor(at / 9), at % 9];
        for (let d = 1; d <= 9; d++) {
          if (!fits(r, c, d)) continue;
          if (++tries > 200000) throw new Error(w.hard);
          board[r][c] = d;
          step(fill(w.place, { r, c, d }), r, c, "key");
          if (solve(at + 1)) return true;
        }
        board[r][c] = 0;
        step(fill(w.back, { r, c }), r, c, "min");
        return false;
      };
      frames.push(pic(w.start, -1, -1, "plain"));
      const ok = solve(0);
      if (hidden) frames.push(pic(fill(w.more, { n: hidden }), -1, -1, "plain"));
      const rows = board.map((r) => r.join("")).join("; ");
      return done(frames, ok ? fill(w.answer, { n: tries, rows }) : fill(w.none, { n: tries }));
    },
  },

  generateDivTags: {
    level: 3,
    example: ["3"],
    solve: ([s], w, e) => {
      const n = int(s, e, 1, 4);
      const found: string[] = [];
      const frames: Frame[] = [];
      const pic = (note: string, tags: string[], o: number, c: number, hit: boolean): Frame => ({
        note,
        rows: [
          row(w.tags, tags, (k) => (k === tags.length - 1 ? (hit ? "sorted" : "key") : hit ? "sorted" : "plain")),
          row(w.toOpen, [o], () => (o ? "plain" : "idle")),
          row(w.toClose, [c], () => (c ? "plain" : "idle")),
          row(w.found, [found.length], () => (hit ? "key" : "sorted")),
        ],
      });
      const go = (o: number, c: number, tags: string[]) => {
        if (o > 0) {
          const next = [...tags, "<div>"];
          frames.push(pic(fill(w.open, { o: o - 1 }), next, o - 1, c, false));
          go(o - 1, c, next);
        }
        if (o < c) {
          const next = [...tags, "</div>"];
          const hit = c - 1 === 0;
          if (hit) found.push(next.join(""));
          // After the branch that opened a tag, closing one here goes back up the tree first.
          const note = hit ? w.done : o > 0 ? w.instead : w.close;
          frames.push(pic(fill(note, { c: c - 1, k: found.length, n: tags.length }), next, o, c - 1, hit));
          go(o, c - 1, next);
        }
      };
      go(n, n, []);
      return done(frames, fill(w.answer, { n: found.length, list: found.join(", ") }));
    },
  },

  ambiguousMeasurements: {
    level: 3,
    example: ["[4, 6], [9, 10]", "17, 21"],
    solve: ([c0, t0], w, e) => {
      const cups = intervals(c0, e, 4);
      const small = cups.find(([a, b]) => a < 1 || !Number.isInteger(a) || !Number.isInteger(b));
      if (small) throw new Error(fill(w.zero, { s: `[${small[0]}, ${small[1]}]` }));
      const [[L, H]] = intervals(t0.includes("[") || t0.includes("-") ? t0 : `[${t0}]`, e, 1);
      for (const v of [L, H, ...cups.flat()]) if (v > 999 || v < 0 || !Number.isInteger(v)) throw new Error(fill(e.range, { s: show(v), lo: 0, hi: 999 }));
      const memo = new Map<string, boolean>();
      const frames: Frame[] = [];
      let hidden = 0;
      const pic = (note: string, pl: number, ph: number, cup: number, role: Role): Frame => ({
        note,
        spans: [
          { label: w.target, items: [[L, H]], roles: ["pivot"] },
          { label: w.poured, items: [[pl, ph]], roles: [role] },
          { label: w.after, items: cup >= 0 ? [[pl + cups[cup][0], ph + cups[cup][1]]] : [], roles: [role === "sorted" ? "sorted" : "compare"] },
        ],
        rows: [row(w.cup, cups.map(([a, b]) => `[${a}, ${b}]`), (k) => (k === cup ? "key" : "plain"))],
      });
      const step = (f: Frame) => {
        if (frames.length < CAP) frames.push(f);
        else hidden++;
      };
      const can = (lo: number, hi: number, pl: number, ph: number): boolean => {
        const key = `${lo}:${hi}`;
        if (memo.has(key)) {
          step(pic(fill(w.seen, { lo, hi }), pl, ph, -1, "min"));
          return memo.get(key)!;
        }
        if (lo <= 0 && hi <= 0) {
          step(pic(fill(w.over, { hi: H }), pl, ph, -1, "min"));
          return false;
        }
        let ok = false;
        for (const [k, [a, b]] of cups.entries()) {
          if (lo <= a && b <= hi) {
            step(pic(fill(w.fits, { lo, hi, a, b }), pl, ph, k, "sorted"));
            ok = true;
            break;
          }
          const [nlo, nhi] = [Math.max(0, lo - a), Math.max(0, hi - b)];
          step(pic(fill(w.pour, { lo, hi, a, b, nlo, nhi }), pl, ph, k, "key"));
          if (can(nlo, nhi, pl + a, ph + b)) {
            ok = true;
            break;
          }
        }
        if (!ok) step(pic(fill(w.fail, { lo, hi }), pl, ph, -1, "min"));
        memo.set(key, ok);
        return ok;
      };
      frames.push(pic(fill(w.start, { lo: L, hi: H }), 0, 0, -1, "plain"));
      const ok = can(L, H, 0, 0);
      if (hidden) frames.push({ ...frames[frames.length - 1], note: fill(w.more, { n: hidden }) });
      return done(frames, fill(ok ? w.yes : w.no, { lo: L, hi: H }));
    },
  },

  numberOfBinaryTreeTopologies: {
    level: 4,
    example: ["5"],
    solve: ([s], w, e) => {
      const n = int(s, e, 0, 13);
      const T: (number | string)[] = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? 1 : ""));
      const frames: Frame[] = [{ note: w.start, cells: cells(T, (i) => (i === 0 ? "sorted" : "plain")), rows: [row(w.sum, [1])] }];
      for (let m = 1; m <= n; m++) {
        let sum = 0;
        for (let l = 0; l < m; l++) {
          const r = m - 1 - l;
          const [a, b] = [T[l] as number, T[r] as number];
          sum += a * b;
          frames.push({
            note: fill(w.term, { m, l, r, a, b, p: a * b, s: sum }),
            cells: cells(T, (i) => (i === m ? "key" : i === l || i === r ? "compare" : i < m ? "sorted" : "plain"), l === r ? { l } : { l, r }),
            rows: [row(w.sum, [sum], () => "key")],
          });
        }
        T[m] = sum;
        frames.push({ note: fill(w.total, { m, s: sum }), cells: cells(T, (i) => (i === m ? "key" : i < m ? "sorted" : "plain")), rows: [row(w.sum, [sum], () => "sorted")] });
      }
      return done(frames, fill(w.answer, { n, v: T[n] }), { cells: cells(T, (i) => (i === n ? "sorted" : "plain")) });
    },
  },

  nonAttackingQueens: {
    level: 4,
    example: ["4"],
    solve: ([s], w, e) => {
      const n = int(s, e, 1, 8);
      const queen = Array(n).fill(-1);
      const [cols, ups, downs] = [new Set<number>(), new Set<number>(), new Set<number>()];
      const frames: Frame[] = [];
      let hidden = 0;
      let ways = 0;
      const attacked = (r: number, c: number) => cols.has(c) || ups.has(r + c) || downs.has(r - c);
      const pic = (note: string, r: number, c: number, role: Role): Frame => ({
        note,
        mat: {
          vals: grid2(n, n, (y, x) => (queen[y] === x || (y === r && x === c) ? "♛" : queen[y] < 0 && attacked(y, x) ? "·" : "")),
          roles: grid2(n, n, (y, x) => (y === r && x === c ? role : queen[y] === x ? "sorted" : queen[y] < 0 && attacked(y, x) ? "idle" : "plain")),
        },
      });
      const step = (f: () => Frame) => {
        if (frames.length < CAP) frames.push(f());
        else hidden++;
      };
      const place = (r: number) => {
        if (r === n) {
          ways++;
          step(() => pic(fill(w.full, { n, k: ways }), -1, -1, "plain"));
          return;
        }
        for (let c = 0; c < n; c++) {
          if (attacked(r, c)) continue;
          queen[r] = c;
          cols.add(c), ups.add(r + c), downs.add(r - c);
          step(() => pic(fill(w.place, { r, c }), r, c, "key"));
          place(r + 1);
          queen[r] = -1;
          cols.delete(c), ups.delete(r + c), downs.delete(r - c);
          step(() => pic(fill(w.back, { r, c }), r, c, "min"));
        }
      };
      place(0);
      if (hidden) frames.push(pic(fill(w.more, { n: hidden }), -1, -1, "plain"));
      if (!frames.length) frames.push(pic(fill(w.answer, { n, k: ways }), -1, -1, "plain"));
      return done(frames, fill(w.answer, { n, k: ways }));
    },
  },
};
