// Interview problems on strings: each solver reads its strings, works the problem out the standard way (two pointers,
// counts in a map, expanding round a centre, a sliding window, a stack, a trie…) and leaves a frame at every step,
// the characters drawn as cells (a space as ␣) and the counts, pieces and answers so far as rows under them.
import { cells, done, fill, int, row, show, text, words, type Errors, type Frame, type ProblemSet, type Role } from "./core";
import { seen, Trie, trieGraph } from "./tries";

/** The characters of a text, a space drawn as ␣. */
const shown = (cs: readonly string[]) => cs.map(seen);
/** A count map as "c: n" entries. */
const tally = (m: Map<string, number>) => [...m].map(([c, n]) => `${seen(c)}: ${n}`);
const bump = (m: Map<string, number>, c: string, by = 1) => m.set(c, (m.get(c) ?? 0) + by);
const counted = (cs: readonly string[]) => {
  const m = new Map<string, number>();
  for (const c of cs) bump(m, c);
  return m;
};
const bracket = (xs: readonly string[]) => `[${xs.join(", ")}]`;

/** A text read as it is typed, spaces at the ends kept: at most `max` characters, and not only spaces. */
function raw(s: string, e: Errors, max = 16): string {
  if (!s.trim()) throw new Error(e.empty);
  if ([...s].length > max) throw new Error(fill(e.tooLong, { n: max }));
  return s;
}

/** Whether a part of an IPv4 address is valid: 0–255, no leading zero. */
const validPart = (p: string) => p.length >= 1 && p.length <= 3 && Number(p) <= 255 && String(Number(p)) === p;

export const STRINGS: ProblemSet<"strings"> = {
  palindromeCheck: {
    level: 1,
    example: ["step on no pets"],
    solve: ([s], w, e) => {
      const str = text(s, e, 16);
      const cs = [...str];
      const frames: Frame[] = [];
      let [l, r] = [0, cs.length - 1];
      while (l < r) {
        const same = cs[l] === cs[r];
        frames.push({
          note: fill(same ? w.same : w.differ, { i: l, j: r, a: seen(cs[l]), b: seen(cs[r]) }),
          cells: cells(shown(cs), (k) => (k === l || k === r ? (same ? "sorted" : "min") : k < l || k > r ? "idle" : "plain"), { L: l, R: r }),
        });
        if (!same) return done(frames, fill(w.no, { s: str }));
        l++;
        r--;
      }
      frames.push({ note: w.meet, cells: cells(shown(cs), () => "sorted", { L: l, R: Math.max(r, 0) }) });
      return done(frames, fill(w.yes, { s: str }));
    },
  },

  caesarCipherEncryptor: {
    level: 1,
    example: ["zebra", "28"],
    solve: ([s, key], w, e) => {
      const str = text(s, e, 14);
      if (!/^[a-z]+$/.test(str)) throw new Error(w.lettersOnly);
      const k = int(key, e, 0, 999);
      const m = k % 26;
      const cs = [...str];
      const out: string[] = [];
      const frames: Frame[] = [{ note: fill(w.start, { k, m }), cells: cells(cs), rows: [row(w.encrypted, [])] }];
      for (const [i, c] of cs.entries()) {
        const p = c.charCodeAt(0) - 97;
        const q = p + m;
        const b = String.fromCharCode(97 + (q % 26));
        out.push(b);
        frames.push({
          note: fill(w.shift, { a: c, p, m, q, r: q % 26, b }),
          cells: cells(cs, (j) => (j === i ? "key" : j < i ? "sorted" : "plain"), { i }),
          rows: [row(w.encrypted, out, (j) => (j === i ? "key" : "sorted"))],
        });
      }
      return done(frames, fill(w.answer, { s: out.join("") }));
    },
  },

  runLengthEncoding: {
    level: 1,
    example: ["AAAAAAAAAAAABBCD"],
    solve: ([s], w, e) => {
      const cs = [...text(s, e, 16)];
      const out: string[] = [];
      const frames: Frame[] = [];
      const pieces = (fresh: boolean) => [row(w.encoded, out.map((p) => p.slice(0, 1) + seen(p.slice(1))), (j) => (fresh && j === out.length - 1 ? "key" : "sorted"))];
      let [from, run] = [0, 1];
      frames.push({ note: fill(w.start, { c: seen(cs[0]) }), cells: cells(shown(cs), (k) => (k === 0 ? "compare" : "plain"), { i: 0 }), rows: pieces(false) });
      for (let i = 1; i < cs.length; i++) {
        const prev = cs[i - 1];
        if (cs[i] !== prev || run === 9) {
          out.push(`${run}${prev}`);
          const nine = cs[i] === prev;
          frames.push({
            note: fill(nine ? w.nine : w.close, { n: run, c: seen(prev), d: seen(cs[i]) }),
            cells: cells(shown(cs), (k) => (k === i ? "compare" : k >= from && k < i ? "key" : k < from ? "sorted" : "plain"), { i }),
            rows: pieces(true),
          });
          [from, run] = [i, 1];
        } else {
          run++;
          frames.push({
            note: fill(w.more, { c: seen(prev), n: run }),
            cells: cells(shown(cs), (k) => (k >= from && k <= i ? "compare" : k < from ? "sorted" : "plain"), { i }),
            rows: pieces(false),
          });
        }
      }
      const last = cs[cs.length - 1];
      out.push(`${run}${last}`);
      frames.push({ note: fill(w.last, { n: run, c: seen(last) }), cells: cells(shown(cs), (k) => (k >= from ? "key" : "sorted")), rows: pieces(true) });
      return done(frames, fill(w.answer, { s: out.join("") }));
    },
  },

  commonCharacters: {
    level: 1,
    example: ["pencil, spine, tiles"],
    solve: ([s], w, e) => {
      const ws = words(s, e, 6, 12);
      const counts = new Map<string, number>();
      const frames: Frame[] = [];
      for (const word of ws) {
        const cs = [...word];
        const uniq = [...new Set(cs)];
        for (const c of uniq) bump(counts, c);
        frames.push({
          note: fill(w.take, { w: word, list: uniq.join(", ") }),
          cells: cells(cs, (k) => (cs.indexOf(cs[k]) === k ? "key" : "idle")),
          rows: [row(w.counts, tally(counts), (j) => (uniq.includes([...counts.keys()][j]) ? "key" : "plain"))],
        });
      }
      const common = [...counts].filter(([, n]) => n === ws.length).map(([c]) => c);
      frames.push({ note: fill(w.check, { n: ws.length }), rows: [row(w.counts, tally(counts), (j) => ([...counts.values()][j] === ws.length ? "sorted" : "idle"))] });
      return done(frames, common.length ? fill(w.answer, { list: common.join(", ") }) : w.none);
    },
  },

  generateDocument: {
    level: 1,
    example: ["a stop pot", "pots top"],
    solve: ([a, d], w, e) => {
      const av = [...text(a, e, 16)];
      const doc = [...text(d, e, 16, 0)];
      const left = counted(av);
      const keys = () => [...left.keys()];
      const frames: Frame[] = [{ note: fill(w.count, { n: av.length, k: left.size }), cells: cells(shown(av), () => "key"), rows: [row(w.left, tally(left))] }];
      for (const [i, c] of doc.entries()) {
        const m = left.get(c) ?? 0;
        const at = (j: number) => keys()[j] === c;
        if (!m) {
          frames.push({ note: fill(w.out, { c: seen(c) }), cells: cells(shown(doc), (k) => (k === i ? "min" : k < i ? "sorted" : "plain"), { i }), rows: [row(w.left, tally(left), (j) => (at(j) ? "min" : "plain"))] });
          return done(frames, fill(w.no, { c: seen(c) }));
        }
        left.set(c, m - 1);
        frames.push({ note: fill(w.use, { c: seen(c), m, r: m - 1 }), cells: cells(shown(doc), (k) => (k === i ? "key" : k < i ? "sorted" : "plain"), { i }), rows: [row(w.left, tally(left), (j) => (at(j) ? "key" : "plain"))] });
      }
      return done(frames, w.yes);
    },
  },

  firstNonRepeatingCharacter: {
    level: 1,
    example: ["abracadabra"],
    solve: ([s], w, e) => {
      const cs = [...text(s, e, 16)];
      const counts = new Map<string, number>();
      const frames: Frame[] = [];
      const at = (c: string) => (j: number) => [...counts.keys()][j] === c;
      for (const [i, c] of cs.entries()) {
        bump(counts, c);
        frames.push({ note: fill(w.count, { c: seen(c), n: counts.get(c)! }), cells: cells(shown(cs), (k) => (k === i ? "key" : k < i ? "idle" : "plain"), { i }), rows: [row(w.counts, tally(counts), (j) => (at(c)(j) ? "key" : "plain"))] });
      }
      for (const [i, c] of cs.entries()) {
        const n = counts.get(c)!;
        const once = n === 1;
        frames.push({
          note: fill(once ? w.found : w.repeats, { c: seen(c), i, n }),
          cells: cells(shown(cs), (k) => (k === i ? (once ? "sorted" : "compare") : k < i ? "idle" : "plain"), { i }),
          rows: [row(w.counts, tally(counts), (j) => (at(c)(j) ? (once ? "sorted" : "compare") : "plain"))],
        });
        if (once) return done(frames, fill(w.answer, { c: seen(c), i }));
      }
      return done(frames, w.none);
    },
  },

  semordnilap: {
    level: 1,
    example: ["stressed, live, desserts, gulp, evil, level, plug"],
    solve: ([s], w, e) => {
      const ws = words(s, e, 8, 12);
      const twice = ws.find((x, i) => ws.indexOf(x) !== i);
      if (twice !== undefined) throw new Error(fill(e.bad, { s: twice }));
      const set = new Set(ws);
      const pairs: string[] = [];
      const frames: Frame[] = [];
      const paired = new Set<string>();
      for (const [i, word] of ws.entries()) {
        const rev = [...word].reverse().join("");
        let note: string;
        let hit = false;
        if (!set.has(word)) note = fill(w.gone, { w: word });
        else if (rev === word) note = fill(w.self, { w: word });
        else if (set.has(rev)) {
          pairs.push(`${word} / ${rev}`);
          set.delete(word);
          set.delete(rev);
          paired.add(word).add(rev);
          [note, hit] = [fill(w.hit, { w: word, r: rev }), true];
        } else note = fill(w.miss, { w: word, r: rev });
        frames.push({
          note,
          rows: [
            row(w.words, ws, (k) => (k === i ? (hit ? "key" : "compare") : paired.has(ws[k]) ? (hit && ws[k] === rev ? "key" : "sorted") : "plain")),
            row(w.set, [...set]),
            row(w.pairs, pairs, (k) => (hit && k === pairs.length - 1 ? "key" : "sorted")),
          ],
        });
      }
      const list = pairs.map((p) => `[${p.replace(" / ", ", ")}]`).join(", ");
      return done(frames, pairs.length ? fill(w.answer, { list }) : w.none);
    },
  },

  longestPalindromicSubstring: {
    level: 2,
    example: ["noonabcbax"],
    solve: ([s], w, e) => {
      const cs = [...text(s, e, 16)];
      const n = cs.length;
      let best: [number, number] = [0, 1];
      const word = ([a, b]: [number, number]) => cs.slice(a, b).join("");
      const frames: Frame[] = [{ note: fill(w.start, { p: seen(cs[0]) }), cells: cells(shown(cs), (k) => (k === 0 ? "sorted" : "plain"), undefined, [0, 0]), rows: [row(w.longest, [word(best)])] }];
      const grow = (l: number, r: number): [number, number] => {
        while (l >= 0 && r < n && cs[l] === cs[r]) [l, r] = [l - 1, r + 1];
        return [l + 1, r];
      };
      for (let i = 1; i < n; i++) {
        for (const odd of [true, false]) {
          const span = grow(i - 1, odd ? i + 1 : i);
          const len = span[1] - span[0];
          if (!len) continue;
          const better = len > best[1] - best[0];
          if (better) best = span;
          const key = odd ? (better ? w.best : w.odd) : better ? w.bestEven : w.even;
          frames.push({
            note: fill(key, { c: seen(cs[i]), i, a: i - 1, p: word(span), n: len }),
            cells: cells(shown(cs), (k) => (k >= span[0] && k < span[1] ? (better ? "key" : "compare") : k >= best[0] && k < best[1] ? "sorted" : "plain"), odd ? { c: i } : { c: i - 1, d: i }, [span[0], span[1] - 1]),
            rows: [row(w.longest, [word(best)], () => (better ? "key" : "sorted"))],
          });
        }
      }
      return done(frames, fill(w.answer, { p: word(best) }));
    },
  },

  groupAnagrams: {
    level: 2,
    example: ["listen, pots, silent, elbow, stop, tinsel, below, opts"],
    solve: ([s], w, e) => {
      const ws = words(s, e, 8, 12);
      const groups = new Map<string, string[]>();
      const frames: Frame[] = [];
      for (const [i, word] of ws.entries()) {
        const key = [...word].sort().join("");
        const open = !groups.has(key);
        if (open) groups.set(key, []);
        groups.get(key)!.push(word);
        frames.push({
          note: fill(open ? w.open : w.put, { w: word, k: key }),
          rows: [
            row(w.words, ws, (k) => (k === i ? "key" : k < i ? "idle" : "plain")),
            ...[...groups].map(([k, g]) => row(k, g, (j) => (k === key && j === g.length - 1 ? "key" : "sorted"))),
          ],
        });
      }
      return done(frames, fill(w.answer, { list: [...groups.values()].map(bracket).join(", ") }));
    },
  },

  validIpAddresses: {
    level: 2,
    example: ["2550010"],
    solve: ([s], w, e) => {
      const str = s.trim();
      if (!str) throw new Error(e.empty);
      if (!/^\d+$/.test(str)) throw new Error(w.digitsOnly);
      if (str.length > 12) throw new Error(fill(e.tooLong, { n: 12 }));
      const n = str.length;
      const ds = [...str];
      const found: string[] = [];
      const frames: Frame[] = [];
      const foundRow = (fresh: boolean) => row(w.found, found, (j) => (fresh && j === found.length - 1 ? "key" : "sorted"));
      // The digits coloured by part (the cuts at i, j, k), the part that fails in red.
      const pic = (cuts: number[], bad: number) => {
        const ends = cuts.length === 3 ? [...cuts, n] : cuts;
        const part = (x: number) => ends.findIndex((c) => x < c);
        return cells(ds, (x) => (part(x) < 0 ? "plain" : part(x) === bad ? "min" : part(x) % 2 ? "pivot" : "key"), Object.fromEntries(cuts.map((c, z) => [`${z + 1}`, c])));
      };
      if (n < 4) {
        frames.push({ note: fill(w.short, { n }), cells: cells(ds), rows: [foundRow(false)] });
        return done(frames, w.none);
      }
      for (let i = 1; i < Math.min(n, 4); i++) {
        const a = str.slice(0, i);
        if (!validPart(a)) {
          frames.push({ note: fill(w.badFirst, { p: a }), cells: pic([i], 0), rows: [foundRow(false)] });
          continue;
        }
        for (let j = i + 1; j < i + Math.min(n - i, 4); j++) {
          const b = str.slice(i, j);
          if (!validPart(b)) {
            frames.push({ note: fill(w.badSecond, { a, p: b }), cells: pic([i, j], 1), rows: [foundRow(false)] });
            continue;
          }
          for (let k = j + 1; k < j + Math.min(n - j, 4); k++) {
            const parts = [a, b, str.slice(j, k), str.slice(k)];
            const ip = parts.join(".");
            const bad = parts.findIndex((p) => !validPart(p));
            if (bad < 0) found.push(ip);
            frames.push({ note: bad < 0 ? fill(w.good, { ip }) : fill(w.bad, { ip, p: parts[bad] }), cells: pic([i, j, k], bad), rows: [foundRow(bad < 0)] });
          }
        }
      }
      return done(frames, found.length ? fill(w.answer, { list: found.join(", ") }) : w.none);
    },
  },

  reverseWordsInString: {
    level: 2,
    example: ["dogs  chase cats"],
    solve: ([s], w, e) => {
      const cs = [...raw(s, e, 16)];
      const pieces: string[] = [];
      const frames: Frame[] = [];
      const pieceText = (p: string) => (p[0] === " " ? "␣".repeat(p.length) : p);
      for (let a = 0; a < cs.length; ) {
        let b = a + 1;
        while (b < cs.length && (cs[b] === " ") === (cs[a] === " ")) b++;
        const p = cs.slice(a, b).join("");
        pieces.push(p);
        frames.push({
          note: p[0] === " " ? fill(w.gap, { n: p.length }) : fill(w.word, { p }),
          cells: cells(shown(cs), (k) => (k >= a && k < b ? "key" : k < a ? "sorted" : "plain"), undefined, [a, b - 1]),
          rows: [row(w.pieces, pieces.map(pieceText), (j) => (j === pieces.length - 1 ? "key" : "plain"))],
        });
        a = b;
      }
      for (let [i, j] = [0, pieces.length - 1]; i < j; i++, j--) {
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        const [l, r] = [i, j];
        frames.push({ note: fill(w.swap, { i, j }), cells: cells(shown(cs), () => "idle"), rows: [row(w.pieces, pieces.map(pieceText), (k) => (k === l || k === r ? "key" : k < l || k > r ? "sorted" : "plain"))] });
      }
      const out = pieces.join("");
      return done(frames, fill(w.answer, { s: out }), { cells: cells(shown([...out]), () => "sorted"), rows: [row(w.pieces, pieces.map(pieceText), () => "sorted")] });
    },
  },

  minimumCharactersForWords: {
    level: 2,
    example: ["noon, moon, onion, moose"],
    solve: ([s], w, e) => {
      const ws = words(s, e, 8, 12);
      const need = new Map<string, number>();
      const frames: Frame[] = [];
      for (const word of ws) {
        const here = counted([...word]);
        const up = [...here].filter(([c, n]) => n > (need.get(c) ?? 0)).map(([c]) => c);
        for (const c of up) need.set(c, here.get(c)!);
        const list = tally(here).join(", ");
        frames.push({
          note: up.length ? fill(w.raise, { w: word, list, up: up.join(", ") }) : fill(w.word, { w: word, list }),
          cells: cells([...word]),
          rows: [row(w.counts, tally(here)), row(w.needed, tally(need), (j) => (up.includes([...need.keys()][j]) ? "key" : "sorted"))],
        });
      }
      const out = [...need].flatMap(([c, n]) => Array.from({ length: n }, () => c));
      return done(frames, fill(w.answer, { list: bracket(out) }));
    },
  },

  oneEdit: {
    level: 2,
    example: ["planet", "plant"],
    solve: ([x, y], w, e) => {
      const A = [...text(x, e, 12, 0)];
      const B = [...text(y, e, 12, 0)];
      if (!A.length && !B.length) throw new Error(e.empty);
      const C = Math.max(A.length, B.length);
      const pad = (cs: string[]) => [...shown(cs), ...Array.from({ length: C - cs.length }, () => "")];
      const frames: Frame[] = [];
      const line = (n: number, at: number, now: Role) => Array.from({ length: C }, (_, k): Role => (k >= n ? "idle" : k === at ? now : k < at ? "sorted" : "plain"));
      const pic = (i: number, j: number, now: Role, nowB = now): Frame["mat"] => ({
        vals: [pad(A), pad(B)],
        roles: [line(A.length, i, now), line(B.length, j, nowB)],
        rowHeads: [w.first, w.second],
      });
      if (Math.abs(A.length - B.length) > 1) {
        frames.push({ note: fill(w.tooFar, { a: A.length, b: B.length }), mat: pic(-1, -1, "plain") });
        return done(frames, w.no);
      }
      let [i, j, edited] = [0, 0, false];
      while (i < A.length && j < B.length) {
        const v = { a: seen(A[i]), b: seen(B[j]) };
        if (A[i] === B[j]) {
          frames.push({ note: fill(w.match, v), mat: pic(i, j, "sorted") });
          [i, j] = [i + 1, j + 1];
          continue;
        }
        if (edited) {
          frames.push({ note: fill(w.again, v), mat: pic(i, j, "min") });
          return done(frames, w.no);
        }
        edited = true;
        const key = A.length > B.length ? w.skip : B.length > A.length ? w.skipB : w.swap;
        frames.push({ note: fill(key, v), mat: pic(i, j, A.length >= B.length ? "pivot" : "compare", B.length >= A.length ? "pivot" : "compare") });
        if (A.length >= B.length) i++;
        if (B.length >= A.length) j++;
      }
      if (i < A.length || j < B.length) frames.push({ note: fill(w.tail, { a: seen(i < A.length ? A[i] : B[j]) }), mat: pic(i, j, "pivot") });
      return done(frames, w.yes);
    },
  },

  longestSubstringWithoutDuplication: {
    level: 3,
    example: ["missionaries"],
    solve: ([s], w, e) => {
      const cs = [...text(s, e, 16)];
      const last = new Map<string, number>();
      let best: [number, number] = [0, 1];
      let start = 0;
      const frames: Frame[] = [];
      const word = () => cs.slice(best[0], best[1]).join("");
      const pic = (i: number, hot: Role, c: string) => ({
        cells: cells(shown(cs), (k) => (k === i ? hot : k >= start && k < i ? "compare" : "plain"), { S: start, i }, [start, i] as [number, number]),
        rows: [row(w.lastSeen, [...last].map(([ch, k]) => `${seen(ch)}: ${k}`), (j) => ([...last.keys()][j] === c ? "key" : "plain")), row(w.longest, [word()], () => "sorted")],
      });
      for (const [i, c] of cs.entries()) {
        const k = last.get(c);
        if (k !== undefined) {
          const jump = k + 1 > start;
          if (jump) start = k + 1;
          frames.push({ note: fill(jump ? w.jump : w.old, { c: seen(c), k, a: start }), ...pic(i, jump ? "min" : "compare", c) });
        }
        const better = best[1] - best[0] < i + 1 - start;
        if (better) best = [start, i + 1];
        last.set(c, i);
        frames.push({ note: fill(better ? w.best : w.grow, { c: seen(c), a: start, i, n: i + 1 - start }), ...pic(i, better ? "sorted" : "key", c) });
      }
      return done(frames, fill(w.answer, { p: word() }));
    },
  },

  underscorifySubstring: {
    level: 3,
    example: ["banana bandana", "ana"],
    solve: ([s, t], w, e) => {
      const cs = [...text(s, e, 16)];
      const sub = [...text(t, e, 8)];
      const str = cs.join("");
      const subText = sub.join("");
      const at = (i: number) => sub.every((c, k) => cs[i + k] === c);
      const spans: [number, number][] = [];
      const frames: Frame[] = [];
      const found = (hot: number): NonNullable<Frame["spans"]>[number] => ({ label: w.found, items: [...spans], roles: spans.map((_, k) => (k === hot ? "key" : "plain")) });
      for (let i = 0; i + sub.length <= cs.length; i++) {
        if (!at(i)) continue;
        spans.push([i, i + sub.length]);
        frames.push({ note: fill(w.at, { t: subText, i, j: i + sub.length }), cells: cells(shown(cs), (k) => (k >= i && k < i + sub.length ? "key" : "plain"), undefined, [i, i + sub.length - 1]), spans: [found(spans.length - 1)] });
      }
      if (!spans.length) {
        frames.push({ note: fill(w.noneFound, { t: subText }), cells: cells(shown(cs)) });
        return done(frames, fill(w.answer, { s: str }));
      }
      const merged: [number, number][] = [[...spans[0]]];
      for (const [k, [c, d]] of spans.entries()) {
        if (!k) continue;
        const prev = merged[merged.length - 1];
        const join = c <= prev[1];
        const note = join ? fill(w.join, { a: prev[0], b: prev[1], c, d, e: Math.max(prev[1], d) }) : fill(w.keep, { b: prev[1], c, d });
        if (join) prev[1] = Math.max(prev[1], d);
        else merged.push([c, d]);
        frames.push({
          note,
          cells: cells(shown(cs), (x) => (merged.some(([a, b]) => x >= a && x < b) ? "sorted" : "plain")),
          spans: [found(k), { label: w.merged, items: merged.map((m) => [...m] as [number, number]), roles: merged.map((_, j) => (j === merged.length - 1 ? "key" : "sorted")) }],
        });
      }
      // Merged spans never touch, so no place is both an end and a start.
      const marks = new Set(merged.flat());
      let out = "";
      for (let x = 0; x <= cs.length; x++) out += (marks.has(x) ? "_" : "") + (cs[x] ?? "");
      frames.push({
        note: w.write,
        cells: cells(shown(cs), (x) => (merged.some(([a, b]) => x >= a && x < b) ? "sorted" : "plain")),
        spans: [{ label: w.merged, items: merged, roles: merged.map(() => "sorted") }],
        rows: [row(w.result, shown([...out]), (k) => (out[k] === "_" ? "key" : "plain"))],
      });
      return done(frames, fill(w.answer, { s: out }));
    },
  },

  patternMatcher: {
    level: 3,
    example: ["yxyy", "gophergogo"],
    solve: ([p, s], w, e) => {
      const pat = text(p, e, 8);
      if (!/^[xy]+$/.test(pat)) throw new Error(w.xyOnly);
      const cs = [...text(s, e, 16)];
      const str = cs.join("");
      const n = cs.length;
      const swapped = pat[0] !== "x";
      const P = [...pat].map((c) => (swapped ? (c === "x" ? "y" : "x") : c));
      const cx = P.filter((c) => c === "x").length;
      const cy = P.length - cx;
      const firstY = P.indexOf("y");
      const frames: Frame[] = [];
      const patRow = () => row(w.pattern, P);
      // The string coloured by which letter of the pattern each character falls under; red where the guess is wrong.
      const pic = (lx: number, ly: number, built: string) => {
        const owner: string[] = P.flatMap((c) => Array.from({ length: c === "x" ? lx : ly }, () => c));
        return cells(shown(cs), (k) => (built[k] !== cs[k] ? "min" : owner[k] === "x" ? "key" : "pivot"));
      };
      if (swapped) frames.push({ note: fill(w.swapped, { p: P.join("") }), cells: cells(shown(cs)), rows: [patRow()] });
      frames.push({ note: fill(w.counts, { x: cx, y: cy, n }), cells: cells(shown(cs)), rows: [patRow()] });
      const answer = (x: string, y: string) => {
        const [a, b] = swapped ? [y, x] : [x, y];
        return done(frames, fill(w.answer, { a, b }));
      };
      if (cy) {
        for (let lx = 1; lx < n; lx++) {
          const rest = n - lx * cx;
          if (rest <= 0) {
            frames.push({ note: fill(w.noRoom, { l: lx, t: lx * cx }), cells: cells(shown(cs), () => "idle"), rows: [patRow()] });
            break;
          }
          if (rest % cy) {
            frames.push({ note: fill(w.notWhole, { l: lx, n, x: cx, y: cy, q: show(Math.round((rest / cy) * 100) / 100) }), cells: cells(shown(cs), () => "idle"), rows: [patRow()] });
            continue;
          }
          const ly = rest / cy;
          const x = str.slice(0, lx);
          const y = str.slice(firstY * lx, firstY * lx + ly);
          const built = P.map((c) => (c === "x" ? x : y)).join("");
          const ok = built === str;
          frames.push({ note: fill(ok ? w.match : w.tryIt, { a: x, b: y, s: built }), cells: pic(lx, ly, built), rows: [patRow()] });
          if (ok) return answer(x, y);
        }
      } else if (n % cx) {
        frames.push({ note: fill(w.xOnly, { x: cx, n }), cells: cells(shown(cs), () => "idle"), rows: [patRow()] });
      } else {
        const x = str.slice(0, n / cx);
        const built = x.repeat(cx);
        const ok = built === str;
        frames.push({ note: fill(ok ? w.match : w.tryX, { a: x, b: "", s: built }), cells: pic(n / cx, 0, built), rows: [patRow()] });
        if (ok) return answer(x, "");
      }
      return done(frames, w.none);
    },
  },

  smallestSubstringContaining: {
    level: 4,
    example: ["bacon and beans", "nab"],
    solve: ([b, s], w, e) => {
      const big = [...text(b, e, 16)];
      const small = [...text(s, e, 8)];
      const need = counted(small);
      const have = new Map<string, number>([...need.keys()].map((c) => [c, 0]));
      let doneKinds = 0;
      let best: [number, number] | null = null;
      const frames: Frame[] = [];
      const word = () => (best ? big.slice(best[0], best[1] + 1).join("") : "");
      const pic = (l: number, r: number, hot: number, role: Role, fresh = false) => ({
        cells: cells(shown(big), (k) => (k === hot ? role : k >= l && k <= r ? "compare" : "plain"), { L: Math.min(l, big.length - 1), R: r }, r >= l ? ([l, r] as [number, number]) : undefined),
        rows: [
          row(w.need, [...need].map(([c, n]) => `${seen(c)}: ${have.get(c)}/${n}`), (j) => ([...have.values()][j] >= [...need.values()][j] ? "sorted" : "plain")),
          row(w.best, best ? [seen(word())] : [], () => (fresh ? "key" : "sorted")),
        ],
      });
      let l = 0;
      for (let r = 0; r < big.length; r++) {
        const c = big[r];
        if (need.has(c)) {
          bump(have, c);
          if (have.get(c) === need.get(c)) doneKinds++;
        }
        const all = doneKinds === need.size;
        frames.push({ note: fill(all ? w.have : w.grow, { c: seen(c), a: l, b: r }), ...pic(l, r, r, "key") });
        while (doneKinds === need.size && l <= r) {
          if (!best || r - l < best[1] - best[0]) {
            best = [l, r];
            frames.push({ note: fill(w.shorter, { a: l, b: r, n: r - l + 1 }), ...pic(l, r, -1, "plain", true) });
          }
          const d = big[l];
          let lost = false;
          if (need.has(d)) {
            if (have.get(d) === need.get(d)) [doneKinds, lost] = [doneKinds - 1, true];
            bump(have, d, -1);
          }
          l++;
          frames.push({ note: fill(lost ? w.lose : w.drop, { c: seen(d) }), ...pic(l, r, l - 1, lost ? "min" : "idle") });
        }
      }
      return done(frames, best ? fill(w.answer, { p: word() }) : w.none);
    },
  },

  longestBalancedSubstring: {
    level: 4,
    example: ["())(()())(("],
    solve: ([s], w, e) => {
      const str = text(s, e, 16);
      if (!/^[()]+$/.test(str)) throw new Error(w.bracketsOnly);
      const cs = [...str];
      const stack = [-1];
      let best: [number, number] | null = null;
      const frames: Frame[] = [];
      const stackRow = (fresh: boolean) => row(w.stack, stack.map(show), (j) => (fresh && j === stack.length - 1 ? "key" : "plain"));
      for (const [i, c] of cs.entries()) {
        if (c === "(") {
          stack.push(i);
          frames.push({ note: fill(w.open, { i }), cells: cells(cs, (k) => (k === i ? "key" : "plain"), { i }), rows: [stackRow(true)] });
          continue;
        }
        stack.pop();
        if (!stack.length) {
          stack.push(i);
          frames.push({ note: fill(w.floor, { i }), cells: cells(cs, (k) => (k === i ? "min" : "plain"), { i }), rows: [stackRow(true)] });
          continue;
        }
        const t = stack[stack.length - 1];
        const len = i - t;
        const better = !best || len > best[1] - best[0] + 1;
        if (better) best = [t + 1, i];
        frames.push({
          note: fill(better ? w.best : w.close, { i, t: show(t), a: t + 1, n: len }),
          cells: cells(cs, (k) => (k > t && k <= i ? (better ? "sorted" : "compare") : "plain"), { i }, [t + 1, i]),
          rows: [stackRow(false)],
        });
      }
      if (!best) return done(frames, w.none);
      return done(frames, fill(w.answer, { n: best[1] - best[0] + 1, p: cs.slice(best[0], best[1] + 1).join("") }));
    },
  },

  stringsMadeUpOfStrings: {
    level: 4,
    example: ["bedrock, bedroom, rockbed", "be, bed, d, rock, roo"],
    solve: ([a, b], w, e) => {
      const strs = words(a, e, 5, 12);
      const subs = words(b, e, 6, 8);
      const t = new Trie();
      const frames: Frame[] = [];
      const made: string[] = [];
      const tag = (n: number) => (t.end[n] !== null ? "*" : "");
      for (const sub of subs) {
        const { path, made: fresh } = t.add(sub, 20, w.big);
        frames.push({
          note: fill(w.insert, { w: sub }),
          graph: trieGraph(t, (n) => (fresh.includes(n) ? "key" : path.includes(n) && n > 0 ? "compare" : "plain"), tag),
          rows: [row(w.made, made)],
        });
      }
      for (const str of strs) {
        const cs = [...str];
        const deadEnds = new Set<number>();
        const parts: [number, number][] = [];
        const pic = (start: number, end: number, path: number[], hot: Role) => ({
          cells: cells(cs, (k) => (k >= start && k <= end ? hot : parts.some(([x, y]) => k >= x && k < y) ? "sorted" : "plain"), { i: start }, end >= start ? ([start, end] as [number, number]) : undefined),
          graph: trieGraph(t, (n) => (n > 0 && n === path[path.length - 1] ? hot : path.includes(n) && n > 0 ? "compare" : "plain"), tag),
          rows: [row(w.made, made), row(w.dead, [...deadEnds].sort((x, y) => x - y))],
        });
        const make = (start: number): boolean => {
          if (start === cs.length) return true;
          if (deadEnds.has(start)) {
            frames.push({ note: fill(w.known, { w: str, a: start }), ...pic(start, start - 1, [0], "min") });
            return false;
          }
          const path = [0];
          for (let i = start; i < cs.length; i++) {
            const next = t.kids[path[path.length - 1]].get(cs[i]);
            if (next === undefined) {
              frames.push({ note: fill(w.stuck, { w: str, c: cs[i], i }), ...pic(start, i, path, "min") });
              break;
            }
            path.push(next);
            if (t.end[next] === null) continue;
            frames.push({ note: fill(w.piece, { w: str, p: cs.slice(start, i + 1).join(""), a: start, b: i + 1 }), ...pic(start, i, path, "key") });
            parts.push([start, i + 1]);
            if (make(i + 1)) return true;
            parts.pop();
          }
          deadEnds.add(start);
          frames.push({ note: fill(w.fail, { w: str, a: start }), ...pic(start, start - 1, [0], "min") });
          return false;
        };
        const ok = make(0);
        if (ok) made.push(str);
        const pieces = parts.map(([x, y]) => cs.slice(x, y).join("")).join(" + ");
        frames.push({ note: ok ? fill(w.yes, { w: str, parts: pieces }) : fill(w.no, { w: str }), ...pic(0, -1, [0], "plain"), cells: cells(cs, () => (ok ? "sorted" : "idle")) });
      }
      return done(frames, made.length ? fill(w.answer, { list: bracket(made) }) : w.none);
    },
  },
};
