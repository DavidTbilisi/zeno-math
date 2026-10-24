// Interview problems on stacks: each solver keeps its stack in plain sight as a row under the picture (the top at the
// right), pushes and pops it the way the problem is meant to be solved — matching brackets, a monotonic stack, a
// stack of minima and maxima beside the values — and leaves a frame at every push or pop with a note on why.
import { cells, done, fill, int, listText, nums, row, show, text, type Errors, type Frame, type ProblemSet, type Role } from "./core";

const minus = (s: string) => s.replace(/[−–—]/g, "-");
/** Operations split by commas: each a name and its arguments. */
function operations(s: string, e: Errors, max: number): string[][] {
  const ops = s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => x.split(/\s+/));
  if (!ops.length) throw new Error(e.empty);
  if (ops.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return ops;
}
const top = <T>(a: readonly T[]) => a[a.length - 1];
const topRole = (n: number, r: Role) => (i: number): Role => (i === n - 1 ? r : "plain");

export const STACKS: ProblemSet<"stacks"> = {
  minMaxStackConstruction: {
    level: 2,
    example: ["push 5, push 7, push 2, getMin, getMax, pop, getMin, push 9, peek, getMax"],
    solve: ([o], w, e) => {
      const ops = operations(o, e, 14);
      const stack: number[] = [];
      const mins: number[] = [];
      const maxs: number[] = [];
      const answers: string[] = [];
      const frames: Frame[] = [];
      const step = (note: string, r: Role = "plain") =>
        frames.push({
          note,
          rows: [
            row(w.stack, stack, topRole(stack.length, r)),
            row(w.min, mins, topRole(mins.length, r)),
            row(w.max, maxs, topRole(maxs.length, r)),
            row(w.answers, answers, (i) => (i === answers.length - 1 ? "key" : "plain")),
          ],
        });
      step(w.start);
      for (const op of ops) {
        const [name, ...args] = op;
        const bad = () => new Error(fill(e.bad, { s: op.join(" ") }));
        const verb = name.toLowerCase();
        if (verb === "push") {
          if (args.length !== 1) throw bad();
          if (stack.length >= 10) throw new Error(fill(e.tooMany, { n: 10 }));
          const x = int(args[0], e, -999, 999);
          const [m, M] = [top(mins), top(maxs)];
          stack.push(x);
          if (m === undefined) {
            mins.push(x);
            maxs.push(x);
            step(fill(w.pushFirst, { x: show(x) }), "key");
          } else {
            mins.push(Math.min(m, x));
            maxs.push(Math.max(M, x));
            step(fill(w.push, { x: show(x), m: show(m), M: show(M), nm: show(top(mins)), nM: show(top(maxs)) }), "key");
          }
          continue;
        }
        if (args.length) throw bad();
        const say: Record<string, string> = { pop: w.pop, peek: w.peek, getmin: w.getMin, getmax: w.getMax };
        if (!(verb in say)) throw bad();
        if (!stack.length) {
          answers.push(w.none);
          step(fill(w.empty, { op: name }));
          continue;
        }
        const x = verb === "getmin" ? top(mins) : verb === "getmax" ? top(maxs) : top(stack);
        answers.push(show(x));
        if (verb === "pop") {
          step(fill(w.pop, { x: show(x) }), "min");
          stack.pop();
          mins.pop();
          maxs.pop();
          step(fill(w.popped, { x: show(x) }));
        } else step(fill(say[verb], { x: show(x) }), "sorted");
      }
      return done(frames, answers.length ? fill(w.answer, { a: answers.join(", ") }) : fill(w.answerNone, { list: listText(stack) }));
    },
  },

  balancedBrackets: {
    level: 2,
    example: ["{a[(b)c]}(d]"],
    solve: ([s], w, e) => {
      const chars = [...text(s, e, 20)];
      const OPEN = "([{";
      const CLOSE = ")]}";
      const stack: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        cells: cells(chars, (j) => (j === i ? r : stack.includes(j) ? "pivot" : j < i ? "idle" : "plain"), i >= 0 && i < chars.length ? { i } : undefined),
        rows: [row(w.stack, stack.map((j) => chars[j]), topRole(stack.length, sr))],
      });
      frames.push({ note: w.start, ...pic(-1, "plain") });
      for (const [i, c] of chars.entries()) {
        if (OPEN.includes(c)) {
          stack.push(i);
          frames.push({ note: fill(w.open, { c }), ...pic(i, "key", "key") });
        } else if (CLOSE.includes(c)) {
          const want = OPEN[CLOSE.indexOf(c)];
          const t = top(stack);
          if (t === undefined) {
            frames.push({ note: fill(w.closeEmpty, { c }), ...pic(i, "min") });
            return done(frames, fill(w.noEmpty, { c, i }));
          }
          if (chars[t] !== want) {
            frames.push({ note: fill(w.mismatch, { c, o: chars[t] }), ...pic(i, "min", "min") });
            return done(frames, fill(w.noMismatch, { c, i, o: chars[t] }));
          }
          stack.pop();
          frames.push({ note: fill(w.close, { c, o: chars[t] }), ...pic(i, "sorted") });
        } else frames.push({ note: fill(w.other, { c: c === " " ? "␣" : c }), ...pic(i, "idle") });
      }
      if (stack.length) {
        frames.push({ note: fill(w.leftOpen, { n: stack.length }), ...pic(chars.length, "plain", "min") });
        return done(frames, fill(w.noOpen, { list: stack.map((j) => chars[j]).join(" ") }));
      }
      frames.push({ note: w.emptyEnd, ...pic(chars.length, "plain") });
      return done(frames, w.yes);
    },
  },

  sunsetViews: {
    level: 2,
    example: ["3, 5, 4, 4, 3, 1, 3, 2", "EAST"],
    solve: ([a, d], w, e) => {
      const hs = nums(a, e, { whole: true, min: 1, max: 12 });
      const big = hs.find((h) => h > 99);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: big, n: 99 }));
      const dir = d.trim().toLowerCase();
      const east = ["e", "east", w.east.toLowerCase()].includes(dir);
      if (!east && !["w", "west", w.west.toLowerCase()].includes(dir)) throw new Error(w.direction);
      const n = hs.length;
      // Walk away from the sun: each building hides every building already passed that is no taller.
      const order = east ? hs.map((_, i) => i) : hs.map((_, i) => n - 1 - i);
      const stack: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, gone: number[] = []) => ({
        cells: cells(hs, (j) => (j === i ? r : gone.includes(j) ? "min" : stack.includes(j) ? "sorted" : "plain"), i >= 0 ? { i } : undefined),
        rows: [row(w.stack, stack, (k) => (gone.length || k !== stack.length - 1 || i < 0 ? "plain" : "key"))],
      });
      frames.push({ note: east ? w.startEast : w.startWest, ...pic(-1, "plain") });
      for (const i of order) {
        const gone: number[] = [];
        while (stack.length && hs[top(stack)] <= hs[i]) gone.push(stack.pop()!);
        if (gone.length) frames.push({ note: fill(w.hides, { i, h: hs[i], list: listText(gone) }), ...pic(i, "compare", gone) });
        stack.push(i);
        frames.push({ note: fill(gone.length ? w.pushAfter : w.push, { i, h: hs[i] }), ...pic(i, "key") });
      }
      const answer = [...stack].sort((x, y) => x - y);
      return done(frames, fill(w.answer, { list: listText(answer) }), { cells: cells(hs, (j) => (answer.includes(j) ? "sorted" : "idle")) });
    },
  },

  bestDigits: {
    level: 2,
    example: ["4629371", "3"],
    solve: ([s, kk], w, e) => {
      const t = text(s, e, 14).replace(/[\s,]/g, "");
      if (!/^\d+$/.test(t)) throw new Error(w.digits);
      const ds = [...t];
      let k = int(kk, e, 0, ds.length - 1);
      const k0 = k;
      const stack: string[] = [];
      const gone = new Set<number>();
      const at: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        cells: cells(ds, (j) => (j === i ? r : gone.has(j) ? "min" : j < i ? "idle" : "plain"), i >= 0 && i < ds.length ? { i } : undefined),
        rows: [row(w.stack, stack, topRole(stack.length, sr))],
      });
      frames.push({ note: fill(w.start, { k }), ...pic(-1, "plain") });
      for (const [i, d] of ds.entries()) {
        while (k > 0 && stack.length && top(stack) < d) {
          const x = stack.pop()!;
          gone.add(at.pop()!);
          k--;
          frames.push({ note: fill(w.pop, { d, t: x, k }), ...pic(i, "compare") });
        }
        const v = { d, t: top(stack) ?? "", k };
        const note = !stack.length ? w.pushEmpty : k === 0 ? w.pushNoK : w.push;
        stack.push(d);
        at.push(i);
        frames.push({ note: fill(note, v), ...pic(i, "key", "key") });
      }
      if (k > 0) {
        const cut = at.splice(at.length - k, k);
        cut.forEach((j) => gone.add(j));
        stack.splice(stack.length - k, k);
        frames.push({ note: fill(w.trim, { k }), ...pic(ds.length, "plain") });
      }
      const best = stack.join("");
      return done(frames, fill(w.answer, { n: best, k: k0 }), { cells: cells(ds, (j) => (gone.has(j) ? "idle" : "sorted")) });
    },
  },

  sortStack: {
    level: 2,
    example: ["4, -2, 7, 1, 3"],
    solve: ([a], w, e) => {
      const stack = nums(a, e, { whole: true, max: 8 });
      const sortHeld: number[] = [];
      const insertHeld: number[] = [];
      const frames: Frame[] = [];
      const step = (note: string, r: Role = "plain") =>
        frames.push({ note, rows: [row(w.stack, stack, topRole(stack.length, r)), row(w.sortHeld, sortHeld, topRole(sortHeld.length, "pivot")), row(w.insertHeld, insertHeld, topRole(insertHeld.length, "compare"))] });
      step(w.start);
      // Put x where it belongs in a sorted stack: lift off everything bigger, push x, put them back.
      const insert = (x: number) => {
        const t = top(stack);
        if (t === undefined || t <= x) {
          stack.push(x);
          step(t === undefined ? fill(w.pushEmpty, { x: show(x) }) : fill(w.push, { x: show(x), t: show(t) }), "key");
          return;
        }
        stack.pop();
        insertHeld.push(t);
        step(fill(w.lift, { x: show(x), t: show(t) }), "compare");
        insert(x);
        insertHeld.pop();
        stack.push(t);
        step(fill(w.back, { t: show(t) }), "sorted");
      };
      const sort = () => {
        if (!stack.length) {
          step(w.base);
          return;
        }
        const x = stack.pop()!;
        sortHeld.push(x);
        step(fill(w.pop, { x: show(x) }));
        sort();
        sortHeld.pop();
        step(fill(w.insert, { x: show(x) }));
        insert(x);
      };
      sort();
      return done(frames, fill(w.answer, { list: listText(stack) }));
    },
  },

  nextGreaterElement: {
    level: 2,
    example: ["4, 2, 6, 1, 5, 3"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 12 });
      const n = xs.length;
      const res: (number | string)[] = xs.map(() => "?");
      const stack: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        cells: cells(xs, (j) => (j === i ? r : stack.includes(j) ? "pivot" : "plain"), i >= 0 ? { i } : undefined),
        rows: [row(w.stack, stack.map((j) => xs[j]), topRole(stack.length, sr)), row(w.result, res.map((v) => (typeof v === "number" ? show(v) : v)), (j) => (res[j] === "?" ? "idle" : "sorted"))],
      });
      frames.push({ note: w.start, ...pic(-1, "plain") });
      for (let k = 0; k < 2 * n; k++) {
        const i = k % n;
        if (k === n) frames.push({ note: fill(w.round, { n: stack.length }), ...pic(-1, "plain") });
        while (stack.length && xs[top(stack)] < xs[i]) {
          const j = stack.pop()!;
          res[j] = xs[i];
          frames.push({ note: fill(w.pop, { x: show(xs[i]), v: show(xs[j]), j }), ...pic(i, "key") });
        }
        if (k < n) {
          stack.push(i);
          frames.push({ note: fill(w.push, { x: show(xs[i]) }), ...pic(i, "compare", "key") });
        }
        if (k >= n && !stack.length) break;
      }
      if (stack.length) {
        for (const j of stack) res[j] = -1;
        stack.length = 0;
        frames.push({ note: w.left, ...pic(-1, "plain") });
      }
      return done(frames, fill(w.answer, { list: listText(res as number[]) }));
    },
  },

  reversePolishNotation: {
    level: 2,
    example: ["6, 2, 3, +, -, 7, *, 4, /"],
    solve: ([s], w, e) => {
      const tokens = minus(s).split(/[,\s]+/).filter(Boolean);
      if (!tokens.length) throw new Error(e.empty);
      if (tokens.length > 15) throw new Error(fill(e.tooMany, { n: 15 }));
      const SIGN: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
      const shown = tokens.map((t) => SIGN[t] ?? t.replace(/^-/, "−"));
      for (const t of tokens) if (!(t in SIGN) && !(/^-?\d+$/.test(t) && Math.abs(Number(t)) <= 999)) throw new Error(fill(e.bad, { s: t }));
      const stack: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        cells: cells(shown, (j) => (j === i ? r : j < i ? "idle" : "plain"), i >= 0 ? { i } : undefined),
        rows: [row(w.stack, stack, topRole(stack.length, sr))],
      });
      frames.push({ note: w.start, ...pic(-1, "plain") });
      for (const [i, t] of tokens.entries()) {
        if (!(t in SIGN)) {
          stack.push(Number(t));
          frames.push({ note: fill(w.num, { t: shown[i] }), ...pic(i, "key", "key") });
          continue;
        }
        if (stack.length < 2) throw new Error(fill(w.short, { t: shown[i] }));
        const b = stack.pop()!;
        const x = stack.pop()!;
        if (t === "/" && b === 0) throw new Error(w.zero);
        const r = t === "+" ? x + b : t === "-" ? x - b : t === "*" ? x * b : Math.trunc(x / b) + 0;
        stack.push(r);
        frames.push({ note: fill(t === "/" && x % b !== 0 ? w.divide : w.op, { a: show(x), b: show(b), o: SIGN[t], r: show(r) }), ...pic(i, "compare", "sorted") });
      }
      if (stack.length !== 1) throw new Error(fill(w.leftover, { n: stack.length }));
      return done(frames, fill(w.answer, { v: show(stack[0]) }));
    },
  },

  collidingAsteroids: {
    level: 2,
    example: ["3, 6, -4, 2, -2, -8, 5"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 12 });
      const zero = xs.find((x) => x === 0 || Math.abs(x) > 99);
      if (zero !== undefined) throw new Error(w.size);
      const stack: number[] = [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        cells: cells(xs, (j) => (j === i ? r : j < i ? "idle" : "plain"), i >= 0 ? { i } : undefined),
        rows: [row(w.stack, stack, topRole(stack.length, sr))],
      });
      frames.push({ note: w.start, ...pic(-1, "plain") });
      for (const [i, x] of xs.entries()) {
        for (;;) {
          const t = top(stack);
          if (t === undefined || x > 0 || t < 0) {
            stack.push(x);
            frames.push({ note: fill(x > 0 ? w.right : w.safe, { a: show(x) }), ...pic(i, "key", "key") });
            break;
          }
          const v = { a: show(x), t: show(t) };
          if (-x > t) {
            frames.push({ note: fill(w.wins, v), ...pic(i, "compare", "min") });
            stack.pop();
            continue;
          }
          if (-x === t) {
            frames.push({ note: fill(w.both, v), ...pic(i, "min", "min") });
            stack.pop();
          } else frames.push({ note: fill(w.loses, v), ...pic(i, "min", "compare") });
          break;
        }
      }
      return done(frames, fill(w.answer, { list: listText(stack) }), { cells: cells(xs, () => "idle"), rows: [row(w.stack, stack, () => "sorted")] });
    },
  },

  shortenPath: {
    level: 3,
    example: ["/usr/./lib//../bin/../../etc/x/.."],
    solve: ([s], w, e) => {
      const path = text(s, e, 48);
      if (/\s/.test(path)) throw new Error(fill(e.bad, { s: path }));
      const abs = path.startsWith("/");
      const parts = path.split("/").filter((t) => t && t !== ".");
      if (parts.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));
      // The root is kept as "" at the bottom of the stack, so ".." can never pop it.
      const stack: string[] = abs ? [""] : [];
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, sr: Role = "plain") => ({
        rows: [
          row(w.parts, parts.length ? parts : ["∅"], (j) => (j === i ? r : j < i ? "idle" : "plain")),
          row(w.stack, stack.map((t) => t || "/"), topRole(stack.length, sr)),
        ],
      });
      frames.push({ note: fill(abs ? w.startAbs : w.startRel, { n: parts.length }), ...pic(-1, "plain") });
      for (const [i, t] of parts.entries()) {
        if (t !== "..") {
          stack.push(t);
          frames.push({ note: fill(w.push, { t }), ...pic(i, "key", "key") });
        } else if (!stack.length || top(stack) === "..") {
          stack.push(t);
          frames.push({ note: w.keepUp, ...pic(i, "pivot", "pivot") });
        } else if (top(stack) === "") frames.push({ note: w.rootUp, ...pic(i, "idle") });
        else {
          const x = stack.pop()!;
          frames.push({ note: fill(w.up, { t: x }), ...pic(i, "compare") });
        }
      }
      const out = stack.length === 1 && stack[0] === "" ? "/" : stack.join("/");
      return done(frames, out ? fill(w.answer, { p: out }) : w.emptyPath);
    },
  },

  largestRectangleUnderSkyline: {
    level: 3,
    example: ["2, 4, 5, 1, 3, 3, 2"],
    solve: ([a], w, e) => {
      const hs = nums(a, e, { whole: true, min: 0, max: 12 });
      const big = hs.find((h) => h > 99);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: big, n: 99 }));
      const n = hs.length;
      const stack: number[] = [];
      let best = { a: 0, h: 0, l: 0, r: -1 };
      const frames: Frame[] = [];
      const pic = (i: number, r: Role, range?: [number, number], sr: Role = "plain") => ({
        cells: cells(hs, (j) => (j === i ? r : range && j >= range[0] && j <= range[1] ? "pivot" : stack.includes(j) ? "compare" : "plain"), i < n ? { i } : undefined, range),
        rows: [row(w.stack, stack.map((j) => hs[j]), topRole(stack.length, sr)), row(w.best, [best.a], () => "sorted")],
      });
      frames.push({ note: w.start, ...pic(-1, "plain") });
      // One step past the end, with height 0, to empty the stack.
      for (let i = 0; i <= n; i++) {
        const h = i < n ? hs[i] : 0;
        while (stack.length && hs[top(stack)] >= h) {
          const j = stack.pop()!;
          const l = stack.length ? top(stack) + 1 : 0;
          const area = hs[j] * (i - l);
          const better = area > best.a;
          if (better) best = { a: area, h: hs[j], l, r: i - 1 };
          const v = { h: show(h), t: hs[j], wd: i - l, a: area, l, r: i - 1 };
          const note = i < n ? (better ? w.popBest : h === hs[j] ? w.popSame : w.pop) : better ? w.endBest : w.end;
          frames.push({ note: fill(note, v), ...pic(i, "key", [l, i - 1], "min") });
        }
        if (i < n) {
          stack.push(i);
          frames.push({ note: fill(w.push, { h: hs[i], i }), ...pic(i, "key", undefined, "key") });
        }
      }
      const answer = best.a ? fill(w.answer, best) : w.answerZero;
      return done(frames, answer, { ...pic(n, "plain", best.a ? [best.l, best.r] : undefined) });
    },
  },
};
