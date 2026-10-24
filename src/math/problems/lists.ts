// Interview problems on linked lists: each solver builds the list as nodes with a `next` index each, then relinks
// them the way the problem is meant to be solved (two pointers, three pointers for a reversal, a slow and a fast
// one), leaving a frame at every step. The nodes keep their places in the picture while their links change, so a
// link that now reaches back is drawn underneath; the last frame lays the list out again as it now reads.
import { done, fill, int, listText, nums, rolesOf, row, show, type Errors, type Frame, type ProblemSet, type Role } from "./core";

type Ptrs = Record<string, number>;
type List = NonNullable<Frame["list"]>;

/** A list's values: whole numbers from −999 to 999 (so they fit a node), at most `max` of them. */
function readList(s: string, e: Errors, max = 10, least = 1): number[] {
  const xs = nums(s, e, { whole: true, max, least });
  const big = xs.find((x) => Math.abs(x) > 999);
  if (big !== undefined) throw new Error(big > 0 ? fill(e.atMost, { s: show(big), n: 999 }) : fill(e.atLeast, { s: show(big), n: show(-999) }));
  return xs;
}
/** A list that may be left empty. */
const maybeList = (s: string, e: Errors, max = 10) => (s.trim() ? readList(s, e, max) : []);
const sorted = (xs: readonly number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);

/** Each node pointing at the one after it, the last at nothing. */
const chain = (n: number) => Array.from({ length: n }, (_, i) => (i < n - 1 ? i + 1 : -1));
/** The pointers that are on a node (one that has run off the end isn't drawn). */
const on = (ptrs: Ptrs): Ptrs => Object.fromEntries(Object.entries(ptrs).filter(([, i]) => i >= 0));
const pic = (vals: readonly number[], next: readonly number[], role: (i: number) => Role, ptrs: Ptrs = {}): List => ({
  vals: [...vals],
  next: [...next],
  roles: rolesOf(vals.length, role),
  ptrs: on(ptrs),
});
/** The nodes in the order the links reach them from `head`. */
function walk(next: readonly number[], head: number): number[] {
  const out: number[] = [];
  for (let i = head; i >= 0 && out.length <= next.length; i = next[i]) out.push(i);
  return out;
}
/** The list laid out again as it reads from `head`. */
function laid(vals: readonly number[], next: readonly number[], head: number, role: (node: number) => Role = () => "sorted"): List {
  const order = walk(next, head);
  return { vals: order.map((i) => vals[i]), next: chain(order.length), roles: order.map(role), ptrs: order.length ? { head: 0 } : {} };
}
const reads = (vals: readonly number[], next: readonly number[], head: number) => listText(walk(next, head).map((i) => vals[i]));

export const LISTS: ProblemSet<"lists"> = {
  removeDuplicatesFromLinkedList: {
    level: 1,
    example: ["2, 2, 3, 5, 5, 5, 8, 9, 9"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      if (!sorted(vals)) throw new Error(w.notSorted);
      const next = chain(vals.length);
      const gone = new Set<number>();
      const kept = new Set<number>();
      const role = (cur: number, look: number) => (i: number): Role =>
        i === look ? (gone.has(i) ? "min" : "compare") : gone.has(i) ? "idle" : i === cur ? "key" : kept.has(i) ? "sorted" : "plain";
      const frames: Frame[] = [{ note: fill(w.start, { v: show(vals[0]) }), list: pic(vals, next, role(0, -1), { cur: 0 }) }];
      for (let cur = 0; cur >= 0; ) {
        let look = next[cur];
        while (look >= 0 && vals[look] === vals[cur]) {
          gone.add(look);
          frames.push({ note: fill(w.skip, { v: show(vals[look]) }), list: pic(vals, next, role(cur, look), { cur, next: look }) });
          look = next[look];
        }
        const skipped = next[cur] !== look;
        next[cur] = look;
        kept.add(cur);
        const v = { v: show(vals[cur]), n: look < 0 ? "" : show(vals[look]) };
        frames.push({ note: fill(look < 0 ? (skipped ? w.lastLink : w.last) : skipped ? w.link : w.keep, v), list: pic(vals, next, role(look, -1), { cur: look }) });
        cur = look;
      }
      return done(frames, fill(w.answer, { list: reads(vals, next, 0) }), { list: laid(vals, next, 0) });
    },
  },

  middleNode: {
    level: 1,
    example: ["4, 8, 15, 16, 23, 42"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      const next = chain(vals.length);
      const role = (s: number, f: number) => (i: number): Role => (i === s ? "key" : i === f ? "compare" : i < s ? "idle" : "plain");
      let [s, f] = [0, 0];
      const frames: Frame[] = [{ note: fill(w.start, { v: show(vals[0]) }), list: pic(vals, next, role(s, f), { S: s, F: f }) }];
      while (f >= 0 && next[f] >= 0) {
        s = next[s];
        f = next[next[f]];
        frames.push({ note: fill(f < 0 ? w.off : w.move, { s: show(vals[s]), f: f < 0 ? "" : show(vals[f]) }), list: pic(vals, next, role(s, f), { S: s, F: f }) });
      }
      frames.push({ note: fill(f < 0 ? w.stopOff : w.stopLast, { s: show(vals[s]) }), list: pic(vals, next, (i) => (i === s ? "sorted" : i < s ? "idle" : "plain"), { S: s, F: f }) });
      return done(frames, fill(w.answer, { v: show(vals[s]), list: reads(vals, next, s) }));
    },
  },

  linkedListConstruction: {
    level: 2,
    example: ["1, 2, 3", "setHead 4, insertAfter 2 7, setTail 2, removeNodesWithValue 2, insertAtPosition 1 9, insertBefore 3 5, contains 7, contains 2"],
    solve: ([a, o], w, e) => {
      // The nodes in order from head to tail; each operation makes a new node with its value.
      const list = maybeList(a, e, 8);
      const ops = o.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 10) throw new Error(fill(e.tooMany, { n: 10 }));
      const MAX = 12;
      const frames: Frame[] = [];
      const answers: string[] = [];
      const val = (s: string) => int(s, e, -999, 999);
      const picture = (role: (i: number) => Role): Partial<Frame> =>
        list.length
          ? { list: { vals: [...list], next: chain(list.length), roles: rolesOf(list.length, role), ptrs: list.length > 1 ? { head: 0, tail: list.length - 1 } : { head: 0 } } }
          : { rows: [row(w.listRow, [w.emptyMark])] };
      const step = (note: string, role: (i: number) => Role = () => "plain") => frames.push({ note, ...picture(role) } as Frame);
      step(fill(w.start, { list: listText(list) }));
      const grow = (op: string) => {
        if (list.length >= MAX) throw new Error(fill(w.full, { n: MAX, op }));
      };
      for (const op of ops) {
        const [name, ...args] = op.split(/\s+/);
        const need = (n: number) => {
          if (args.length !== n) throw new Error(fill(e.bad, { s: op }));
        };
        switch (name.toLowerCase()) {
          case "sethead": {
            need(1);
            grow(op);
            const x = val(args[0]);
            list.unshift(x);
            step(fill(w.setHead, { x: show(x) }), (i) => (i === 0 ? "key" : "plain"));
            break;
          }
          case "settail": {
            need(1);
            grow(op);
            const x = val(args[0]);
            list.push(x);
            step(fill(w.setTail, { x: show(x) }), (i) => (i === list.length - 1 ? "key" : "plain"));
            break;
          }
          case "insertbefore":
          case "insertafter": {
            need(2);
            const [x, y] = [val(args[0]), val(args[1])];
            const at = list.indexOf(x);
            const after = name.toLowerCase() === "insertafter";
            if (at < 0) {
              step(fill(w.noNode, { x: show(x), y: show(y) }));
              break;
            }
            grow(op);
            const put = after ? at + 1 : at;
            list.splice(put, 0, y);
            const v = { x: show(x), y: show(y), p: put > 0 ? show(list[put - 1]) : "", n: put < list.length - 1 ? show(list[put + 1]) : "" };
            const note = put === 0 ? w.beforeHead : put === list.length - 1 ? w.afterTail : after ? w.after : w.before;
            step(fill(note, v), (i) => (i === put ? "key" : i === put - 1 || i === put + 1 ? "compare" : "plain"));
            break;
          }
          case "insertatposition": {
            need(2);
            grow(op);
            const p = int(args[0], e, 1, 99);
            const x = val(args[1]);
            const put = Math.min(p - 1, list.length);
            list.splice(put, 0, x);
            step(fill(put === p - 1 ? w.atPosition : w.pastEnd, { p, x: show(x) }), (i) => (i === put ? "key" : "plain"));
            break;
          }
          case "removenodeswithvalue": {
            need(1);
            const x = val(args[0]);
            const n = list.filter((v) => v === x).length;
            if (!n) {
              step(fill(w.removeNone, { x: show(x) }));
              break;
            }
            step(fill(w.removeMark, { x: show(x), n }), (i) => (list[i] === x ? "min" : "plain"));
            for (let i = list.length - 1; i >= 0; i--) if (list[i] === x) list.splice(i, 1);
            step(fill(w.removed, { x: show(x), n }));
            break;
          }
          case "contains": {
            need(1);
            const x = val(args[0]);
            const at = list.indexOf(x);
            answers.push(at >= 0 ? w.yes : w.no);
            step(fill(at >= 0 ? w.containsYes : w.containsNo, { x: show(x), k: at + 1 }), (i) => (i === at ? "sorted" : i < at || at < 0 ? "idle" : "plain"));
            break;
          }
          default:
            throw new Error(fill(e.bad, { s: op }));
        }
      }
      const answer = answers.length ? fill(w.answerAsked, { list: listText(list), a: answers.join(", ") }) : fill(w.answer, { list: listText(list) });
      return done(frames, answer);
    },
  },

  removeKthNodeFromEnd: {
    level: 2,
    example: ["3, 9, 4, 7, 1, 6, 2", "3"],
    solve: ([a, kk], w, e) => {
      const vals = readList(a, e, 12, 2);
      const n = vals.length;
      const k = int(kk, e, 1, n);
      const next = chain(n);
      let [l, r] = [0, 0];
      const role = (i: number): Role => (i === r ? "compare" : i === l ? "key" : "plain");
      const frames: Frame[] = [{ note: fill(w.start, { k }), list: pic(vals, next, role, { L: l, R: r }) }];
      for (let c = 1; c <= k; c++) {
        r = next[r];
        frames.push({ note: r < 0 ? fill(w.offAhead, { k }) : fill(w.ahead, { v: show(vals[r]), c, k }), list: pic(vals, next, role, { L: l, R: r }) });
      }
      let head = 0;
      let gone: number;
      if (r < 0) {
        // R ran off the end: the kth node from the end is the head itself.
        gone = 0;
        head = next[0];
        frames.push({ note: fill(w.head, { v: show(vals[0]), n: show(vals[head]) }), list: pic(vals, next, (i) => (i === 0 ? "min" : "plain"), { head }) });
      } else {
        while (next[r] >= 0) {
          l = next[l];
          r = next[r];
          frames.push({ note: fill(w.both, { l: show(vals[l]), r: show(vals[r]) }), list: pic(vals, next, role, { L: l, R: r }) });
        }
        gone = next[l];
        next[l] = next[gone];
        const v = { l: show(vals[l]), v: show(vals[gone]), n: next[l] < 0 ? "" : show(vals[next[l]]) };
        frames.push({ note: fill(next[l] < 0 ? w.cutLast : w.cut, v), list: pic(vals, next, (i) => (i === gone ? "min" : i === l ? "key" : "plain"), { L: l }) });
      }
      return done(frames, fill(w.answer, { v: show(vals[gone]), list: reads(vals, next, head) }), { list: laid(vals, next, head) });
    },
  },

  sumOfLinkedLists: {
    level: 2,
    example: ["7, 4, 9, 2", "8, 6, 5"],
    solve: ([a, b], w, e) => {
      const digits = (s: string) => {
        const xs = nums(s, e, { whole: true, min: 0, max: 8 });
        const big = xs.find((x) => x > 9);
        if (big !== undefined) throw new Error(fill(e.atMost, { s: big, n: 9 }));
        if (xs.length > 1 && xs[xs.length - 1] === 0) throw new Error(w.leading);
        return xs;
      };
      const [A, B] = [digits(a), digits(b)];
      const out: number[] = [];
      const frames: Frame[] = [];
      const picture = (i: number): Partial<Frame> => ({
        rows: [row("A", A, (j) => (j === i ? "key" : j < i ? "idle" : "plain")), row("B", B, (j) => (j === i ? "key" : j < i ? "idle" : "plain"))],
        ...(out.length ? { list: pic(out, chain(out.length), (j) => (j === out.length - 1 && i >= 0 ? "key" : "sorted"), { new: i >= 0 ? out.length - 1 : -1 }) } : {}),
      });
      frames.push({ note: w.start, ...picture(-1) } as Frame);
      let carry = 0;
      for (let i = 0; i < A.length || i < B.length || carry; i++) {
        const [x, y] = [A[i] ?? 0, B[i] ?? 0];
        const s = x + y + carry;
        out.push(s % 10);
        const note = i >= A.length && i >= B.length ? fill(w.carryOnly, { c: carry }) : fill(w.add, { a: x, b: y, c: carry, s, d: s % 10, c2: Math.floor(s / 10) });
        carry = Math.floor(s / 10);
        frames.push({ note, ...picture(i) } as Frame);
      }
      const num = (d: number[]) => [...d].reverse().join("").replace(/^0+(?=\d)/, "");
      return done(frames, fill(w.answer, { x: num(A), y: num(B), z: num(out), list: listText(out) }), picture(A.length + B.length + 1));
    },
  },

  mergingLinkedLists: {
    level: 2,
    example: ["6, 1, 8", "4", "5, 2, 7"],
    solve: ([a, b, c], w, e) => {
      const [ownA, ownB, shared] = [maybeList(a, e), maybeList(b, e), maybeList(c, e)];
      if (ownA.length + shared.length === 0 || ownB.length + shared.length === 0) throw new Error(e.empty);
      if (ownA.length + ownB.length + shared.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));
      // A's own nodes, then B's, then the shared ones; each own part leads into the shared part.
      const vals = [...ownA, ...ownB, ...shared];
      const [nA, nB, nS] = [ownA.length, ownB.length, shared.length];
      const join = nS ? nA + nB : -1;
      const next = vals.map((_, i) => (i === nA - 1 || i === nA + nB - 1 ? join : i === vals.length - 1 ? -1 : i + 1));
      const [headA, headB] = [nA ? 0 : join, nB ? nA : join];
      const role = (pa: number, pb: number) => (i: number): Role => (i === pa || i === pb ? "compare" : i >= nA + nB ? "pivot" : "plain");
      let [pa, pb] = [headA, headB];
      const frames: Frame[] = [{ note: fill(w.start, { a: show(vals[headA]), b: show(vals[headB]) }), list: pic(vals, next, role(pa, pb), { A: pa, B: pb }) }];
      const clause = (p: string, from: number, to: number, other: number) =>
        from < 0 ? fill(w.jump, { p, v: show(vals[other]) }) : to < 0 ? fill(w.offEnd, { p }) : fill(w.moveTo, { p, v: show(vals[to]) });
      while (pa !== pb) {
        const [na, nb] = [pa < 0 ? headB : next[pa], pb < 0 ? headA : next[pb]];
        const note = `${clause("A", pa, na, headB)}; ${clause("B", pb, nb, headA)}.`;
        [pa, pb] = [na, nb];
        frames.push({ note: note.charAt(0).toUpperCase() + note.slice(1), list: pic(vals, next, role(pa, pb), { A: pa, B: pb }) });
      }
      if (pa < 0) return done(frames, w.none, { list: pic(vals, next, () => "idle") });
      frames.push({ note: fill(w.met, { v: show(vals[pa]) }), list: pic(vals, next, (i) => (i === pa ? "sorted" : i >= nA + nB ? "pivot" : "plain"), { A: pa, B: pb }) });
      return done(frames, fill(w.answer, { v: show(vals[pa]), list: reads(vals, next, pa) }));
    },
  },

  findLoop: {
    level: 3,
    example: ["5, 3, 8, 1, 6, 2, 9", "2"],
    solve: ([a, p], w, e) => {
      const vals = readList(a, e, 12);
      const n = vals.length;
      const pos = int(p, e, 0, n - 1);
      const next = vals.map((_, i) => (i < n - 1 ? i + 1 : pos));
      const at = (ptrs: Ptrs, found = -1) => pic(vals, next, (i) => (i === found ? "sorted" : Object.values(ptrs).includes(i) ? "compare" : "plain"), ptrs);
      const frames: Frame[] = [{ note: fill(w.start, { v: show(vals[n - 1]), t: show(vals[pos]) }), list: at({ S: 0, F: 0 }) }];
      let [s, f] = [0, 0];
      do {
        s = next[s];
        f = next[next[f]];
        const met = s === f;
        frames.push({ note: fill(met ? w.met : w.move, { s: show(vals[s]), f: show(vals[f]) }), list: at({ S: s, F: f }, met ? s : -1) });
      } while (s !== f);
      // From the head and from where they met, a node a move each: they meet where the loop begins.
      let h = 0;
      frames.push({ note: fill(w.phase2, { v: show(vals[s]) }), list: at({ H: h, S: s }) });
      while (h !== s) {
        h = next[h];
        s = next[s];
        frames.push({ note: fill(h === s ? w.entry : w.walk, { h: show(vals[h]), s: show(vals[s]) }), list: at({ H: h, S: s }, h === s ? h : -1) });
      }
      return done(frames, fill(w.answer, { v: show(vals[h]), i: h }), { list: at({ H: h }, h) });
    },
  },

  reverseLinkedList: {
    level: 3,
    example: ["3, 7, 1, 9, 4"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      const next = chain(vals.length);
      let [p1, p2] = [-1, 0];
      const frames: Frame[] = [{ note: fill(w.start, { v: show(vals[0]) }), list: pic(vals, next, (i) => (i === 0 ? "key" : "plain"), { p2 }) }];
      while (p2 >= 0) {
        const p3 = next[p2];
        next[p2] = p1;
        const v = { c: show(vals[p2]), p: p1 < 0 ? "" : show(vals[p1]), n: p3 < 0 ? "" : show(vals[p3]) };
        const note = p1 < 0 ? w.first : p3 < 0 ? w.lastFlip : w.flip;
        const done2 = p2;
        frames.push({ note: fill(note, v), list: pic(vals, next, (i) => (i === done2 ? "key" : i < done2 ? "sorted" : "plain"), { p1, p2, p3 }) });
        [p1, p2] = [p2, p3];
      }
      frames.push({ note: fill(w.end, { v: show(vals[p1]) }), list: pic(vals, next, () => "sorted", { p1 }) });
      return done(frames, fill(w.answer, { list: reads(vals, next, p1) }), { list: laid(vals, next, p1) });
    },
  },

  mergeLinkedLists: {
    level: 3,
    example: ["2, 6, 7, 11", "1, 3, 6, 9"],
    solve: ([a, b], w, e) => {
      const [one, two] = [readList(a, e, 7), readList(b, e, 7)];
      if (!sorted(one) || !sorted(two)) throw new Error(w.notSorted);
      const vals = [...one, ...two];
      const nA = one.length;
      const next = vals.map((_, i) => (i === nA - 1 || i === vals.length - 1 ? -1 : i + 1));
      const placed = new Set<number>();
      const role = (p1: number, p2: number) => (i: number): Role => (i === p1 || i === p2 ? "compare" : placed.has(i) ? "sorted" : i >= nA ? "pivot" : "plain");
      let [p1, p2, prev] = [0, nA, -1];
      const frames: Frame[] = [{ note: fill(w.start, { a: show(vals[0]), b: show(vals[nA]) }), list: pic(vals, next, role(p1, p2), { p1, p2 }) }];
      while (p1 >= 0 && p2 >= 0) {
        const v = { x: show(vals[p1]), y: show(vals[p2]) };
        if (vals[p1] < vals[p2]) {
          placed.add(p1);
          [prev, p1] = [p1, next[p1]];
          frames.push({ note: fill(w.stay, v), list: pic(vals, next, role(p1, p2), { prev, p1, p2 }) });
        } else {
          if (prev >= 0) next[prev] = p2;
          placed.add(p2);
          prev = p2;
          p2 = next[p2];
          next[prev] = p1;
          frames.push({ note: fill(w.link, v), list: pic(vals, next, role(p1, p2), { prev, p1, p2 }) });
        }
      }
      if (p1 < 0) {
        next[prev] = p2;
        frames.push({ note: fill(w.oneOut, { v: show(vals[prev]), n: show(vals[p2]) }), list: pic(vals, next, role(-1, p2), { prev, p2 }) });
      } else frames.push({ note: fill(w.twoOut, { v: show(vals[p1]) }), list: pic(vals, next, role(p1, -1), { prev, p1 }) });
      const head = vals[0] < vals[nA] ? 0 : nA;
      return done(frames, fill(w.answer, { list: reads(vals, next, head) }), { list: laid(vals, next, head) });
    },
  },

  shiftLinkedList: {
    level: 3,
    example: ["4, 1, 7, 3, 8, 5", "8"],
    solve: ([a, kk], w, e) => {
      const vals = readList(a, e, 12);
      const n = vals.length;
      const k = int(kk, e, -99, 99);
      const next = chain(n);
      const frames: Frame[] = [];
      let tail = 0;
      frames.push({ note: fill(w.count, { v: show(vals[0]), c: 1 }), list: pic(vals, next, (i) => (i === 0 ? "key" : "plain"), { T: 0 }) });
      while (next[tail] >= 0) {
        tail = next[tail];
        frames.push({ note: fill(w.count, { v: show(vals[tail]), c: tail + 1 }), list: pic(vals, next, (i) => (i === tail ? "key" : i < tail ? "idle" : "plain"), { T: tail }) });
      }
      const o = Math.abs(k) % n;
      if (o === 0) {
        frames.push({ note: fill(w.full, { k: Math.abs(k), n }), list: pic(vals, next, () => "sorted", { head: 0 }) });
        return done(frames, fill(w.answer, { list: listText(vals) }));
      }
      // The new tail is this many nodes from the head (counting the head as 1).
      const at = k > 0 ? n - o : o;
      const newTail = at - 1;
      const newHead = next[newTail];
      const role = (i: number): Role => (i === newTail ? "key" : i === newHead ? "pivot" : i > newTail ? "compare" : "plain");
      frames.push({ note: fill(k > 0 ? w.forward : w.backward, { k: Math.abs(k), n, o, v: show(vals[newTail]), h: show(vals[newHead]) }), list: pic(vals, next, role, { N: newTail, T: tail }) });
      next[tail] = 0;
      next[newTail] = -1;
      frames.push({ note: fill(w.relink, { t: show(vals[tail]), o: show(vals[0]), v: show(vals[newTail]) }), list: pic(vals, next, role, { head: newHead, N: newTail }) });
      return done(frames, fill(w.answer, { list: reads(vals, next, newHead) }), { list: laid(vals, next, newHead) });
    },
  },

  lruCache: {
    level: 4,
    example: ["3", "put a 1, put b 2, put c 3, get a, put d 4, get b, put c 5, recent, get c, get d"],
    solve: ([c, o], w, e) => {
      const cap = int(c, e, 1, 6);
      const ops = o.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));
      // Keys from the most recently used (the head) to the least (the tail), and the map from key to value.
      const order: string[] = [];
      const map = new Map<string, number>();
      const answers: string[] = [];
      const frames: Frame[] = [];
      const step = (note: string, role: (i: number) => Role = () => "plain") =>
        frames.push({
          note,
          cells: { vals: [...order], roles: rolesOf(order.length, role), ptrs: order.length ? { head: 0, tail: order.length - 1 } : {} },
          rows: [row(w.map, order.map((k) => `${k}: ${show(map.get(k)!)}`), role), row(w.answers, answers, (i) => (i === answers.length - 1 ? "key" : "plain"))],
        });
      step(fill(w.start, { c: cap }));
      for (const op of ops) {
        const [name, key, value, ...rest] = op.split(/\s+/);
        const bad = () => new Error(fill(e.bad, { s: op }));
        if (rest.length || (key !== undefined && !/^[\p{L}\d]{1,4}$/u.test(key))) throw bad();
        const toHead = (k: string) => {
          const i = order.indexOf(k);
          if (i >= 0) order.splice(i, 1);
          order.unshift(k);
        };
        switch (name.toLowerCase()) {
          case "put": {
            if (key === undefined || value === undefined) throw bad();
            const v = int(value, e, -999, 999);
            if (map.has(key)) {
              map.set(key, v);
              toHead(key);
              step(fill(w.update, { k: key, v: show(v) }), (i) => (i === 0 ? "key" : "plain"));
              break;
            }
            if (order.length === cap) {
              const old = order[order.length - 1];
              step(fill(w.evict, { k: key, c: cap, old }), (i) => (i === order.length - 1 ? "min" : "plain"));
              order.pop();
              map.delete(old);
            }
            map.set(key, v);
            toHead(key);
            step(fill(w.put, { k: key, v: show(v) }), (i) => (i === 0 ? "key" : "plain"));
            break;
          }
          case "get": {
            if (key === undefined || value !== undefined) throw bad();
            if (!map.has(key)) {
              answers.push(w.none);
              step(fill(w.miss, { k: key }), () => "idle");
              break;
            }
            answers.push(show(map.get(key)!));
            toHead(key);
            step(fill(w.hit, { k: key, v: show(map.get(key)!) }), (i) => (i === 0 ? "sorted" : "plain"));
            break;
          }
          case "recent": {
            if (key !== undefined) throw bad();
            answers.push(order[0] ?? w.none);
            step(order.length ? fill(w.recent, { k: order[0] }) : w.recentNone, (i) => (i === 0 ? "sorted" : "plain"));
            break;
          }
          default:
            throw bad();
        }
      }
      const keys = listText(order);
      return done(frames, answers.length ? fill(w.answer, { a: answers.join(", "), keys }) : fill(w.answerNone, { keys }));
    },
  },

  rearrangeLinkedList: {
    level: 4,
    example: ["6, 2, 9, 4, 1, 4, 7, 3", "4"],
    solve: ([a, kk], w, e) => {
      const vals = readList(a, e, 12);
      const k = int(kk, e, -999, 999);
      const next = chain(vals.length);
      // Three lists grown at their tails: smaller than k, equal to k, larger.
      const parts: number[][] = [[], [], []];
      const kind = (i: number) => (vals[i] < k ? 0 : vals[i] === k ? 1 : 2);
      const COLOUR: Role[] = ["sorted", "pivot", "key"];
      const seen = new Set<number>();
      const role = (cur: number) => (i: number): Role => (i === cur ? "compare" : seen.has(i) ? COLOUR[kind(i)] : "plain");
      const rows = () => [row(w.smaller, parts[0].map((i) => vals[i]), () => "sorted"), row(w.equal, parts[1].map((i) => vals[i]), () => "pivot"), row(w.larger, parts[2].map((i) => vals[i]), () => "key")];
      const frames: Frame[] = [{ note: fill(w.start, { k: show(k) }), list: pic(vals, next, role(0), { cur: 0 }), rows: rows() }];
      for (let cur = 0; cur >= 0; ) {
        const after = next[cur];
        const part = parts[kind(cur)];
        if (part.length) next[part[part.length - 1]] = cur;
        part.push(cur);
        next[cur] = -1;
        seen.add(cur);
        const note = [w.toSmaller, w.toEqual, w.toLarger][kind(cur)];
        frames.push({ note: fill(note, { v: show(vals[cur]), k: show(k) }), list: pic(vals, next, role(after), { cur: after }), rows: rows() });
        cur = after;
      }
      // Join the non-empty parts in order: each tail points at the next part's head.
      const heads = parts.filter((p) => p.length);
      for (let j = 0; j + 1 < heads.length; j++) next[heads[j][heads[j].length - 1]] = heads[j + 1][0];
      const head = heads[0][0];
      frames.push({ note: w.join, list: pic(vals, next, role(-1), { head }), rows: rows() });
      return done(frames, fill(w.answer, { k: show(k), list: reads(vals, next, head) }), { list: laid(vals, next, head, (i) => COLOUR[kind(i)]) });
    },
  },

  linkedListPalindrome: {
    level: 4,
    example: ["2, 5, 8, 9, 8, 5, 2"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      const next = chain(vals.length);
      const frames: Frame[] = [];
      // Slow and fast pointers: when the fast one runs out, the slow one is at the start of the second half.
      let [s, f] = [0, 0];
      frames.push({ note: w.start, list: pic(vals, next, (i) => (i === 0 ? "key" : "plain"), { S: s, F: f }) });
      while (f >= 0 && next[f] >= 0) {
        s = next[s];
        f = next[next[f]];
        frames.push({ note: fill(w.move, { s: show(vals[s]) }), list: pic(vals, next, (i) => (i === s ? "key" : i === f ? "compare" : "plain"), { S: s, F: f }) });
      }
      const mid = s;
      const half = (i: number) => i >= mid;
      // Reverse the second half, so it can be read from the tail.
      let [prev, cur] = [-1, mid];
      while (cur >= 0) {
        const after = next[cur];
        next[cur] = prev;
        const done2 = cur;
        frames.push({
          note: fill(prev < 0 ? w.flipFirst : w.flip, { c: show(vals[cur]), p: prev < 0 ? "" : show(vals[prev]) }),
          list: pic(vals, next, (i) => (i === done2 ? "key" : half(i) ? "pivot" : "plain"), { prev: cur, cur: after }),
        });
        [prev, cur] = [cur, after];
      }
      // Compare from both ends towards the middle.
      let [l, r] = [0, prev];
      const ok = new Set<number>();
      while (r >= 0) {
        const same = vals[l] === vals[r];
        const v = { a: show(vals[l]), b: show(vals[r]) };
        if (!same) {
          frames.push({ note: fill(w.differ, v), list: pic(vals, next, (i) => (i === l || i === r ? "min" : ok.has(i) ? "sorted" : "plain"), { L: l, R: r }) });
          return done(frames, fill(w.no, v));
        }
        ok.add(l).add(r);
        frames.push({ note: fill(w.same, v), list: pic(vals, next, (i) => (i === l || i === r ? "key" : ok.has(i) ? "sorted" : "plain"), { L: l, R: r }) });
        [l, r] = [next[l], next[r]];
      }
      return done(frames, w.yes, { list: pic(vals, next, () => "sorted") });
    },
  },

  zipLinkedList: {
    level: 4,
    example: ["1, 2, 3, 4, 5, 6, 7"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      const next = chain(vals.length);
      const frames: Frame[] = [];
      // The slow pointer stops on the last node of the first half (the longer one when the length is odd).
      let [s, f] = [0, 0];
      frames.push({ note: w.start, list: pic(vals, next, (i) => (i === 0 ? "key" : "plain"), { S: s, F: f }) });
      while (next[f] >= 0 && next[next[f]] >= 0) {
        s = next[s];
        f = next[next[f]];
        frames.push({ note: fill(w.move, { s: show(vals[s]), f: show(vals[f]) }), list: pic(vals, next, (i) => (i === s ? "key" : i === f ? "compare" : "plain"), { S: s, F: f }) });
      }
      const second = next[s];
      if (second < 0) {
        frames.push({ note: w.short, list: pic(vals, next, () => "sorted", { head: 0 }) });
        return done(frames, fill(w.answer, { list: listText(vals) }));
      }
      next[s] = -1;
      const half = (i: number) => i >= second;
      frames.push({ note: fill(w.split, { v: show(vals[s]), h: show(vals[second]) }), list: pic(vals, next, (i) => (half(i) ? "pivot" : "plain"), { S: s, cur: second }) });
      let [prev, cur] = [-1, second];
      while (cur >= 0) {
        const after = next[cur];
        next[cur] = prev;
        const at = cur;
        frames.push({ note: fill(prev < 0 ? w.flipFirst : w.flip, { c: show(vals[cur]), p: prev < 0 ? "" : show(vals[prev]) }), list: pic(vals, next, (i) => (i === at ? "key" : half(i) ? "pivot" : "plain"), { prev: cur, cur: after }) });
        [prev, cur] = [cur, after];
      }
      // Interleave: a node of the first half, then one of the reversed second half.
      let [p1, p2] = [0, prev];
      const zipped = new Set<number>();
      while (p1 >= 0 && p2 >= 0) {
        const [n1, n2] = [next[p1], next[p2]];
        next[p1] = p2;
        next[p2] = n1;
        zipped.add(p1).add(p2);
        const v = { a: show(vals[p1]), b: show(vals[p2]), n: n1 < 0 ? "" : show(vals[n1]) };
        frames.push({ note: fill(n1 < 0 ? w.weaveLast : w.weave, v), list: pic(vals, next, (i) => (i === p1 || i === p2 ? "key" : zipped.has(i) ? "sorted" : half(i) ? "pivot" : "plain"), { p1: n1, p2: n2 }) });
        [p1, p2] = [n1, n2];
      }
      return done(frames, fill(w.answer, { list: reads(vals, next, 0) }), { list: laid(vals, next, 0) });
    },
  },

  nodeSwap: {
    level: 4,
    example: ["5, 1, 8, 3, 6, 2, 4"],
    solve: ([a], w, e) => {
      const vals = readList(a, e, 12);
      const next = chain(vals.length);
      const frames: Frame[] = [];
      const swapped = new Set<number>();
      let [head, prev, x] = [0, -1, 0];
      const role = (p: number, q: number) => (i: number): Role => (i === p || i === q ? "compare" : swapped.has(i) ? "sorted" : "plain");
      frames.push({ note: w.start, list: pic(vals, next, role(-1, -1), { head }) });
      while (x >= 0 && next[x] >= 0) {
        const y = next[x];
        const after = next[y];
        frames.push({ note: fill(w.pair, { x: show(vals[x]), y: show(vals[y]) }), list: pic(vals, next, role(x, y), { head, prev, x, y }) });
        next[y] = x;
        next[x] = after;
        if (prev < 0) head = y;
        else next[prev] = y;
        swapped.add(x).add(y);
        const chainText = [...(prev >= 0 ? [show(vals[prev])] : []), show(vals[y]), show(vals[x]), after < 0 ? "∅" : show(vals[after])].join(" → ");
        frames.push({ note: fill(prev < 0 ? w.swapHead : w.swap, { c: chainText, y: show(vals[y]) }), list: pic(vals, next, role(-1, -1), { head, prev: x }) });
        [prev, x] = [x, after];
      }
      if (x >= 0) frames.push({ note: fill(w.alone, { v: show(vals[x]) }), list: pic(vals, next, role(-1, -1), { head, x }) });
      return done(frames, fill(w.answer, { list: reads(vals, next, head) }), { list: laid(vals, next, head) });
    },
  },
};
