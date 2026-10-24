// Interview problems on tries: a tree of characters, one per edge, that shares the starts of the strings put into
// it. Each solver builds its trie a string at a time and walks it, and every frame draws the trie as a layered graph
// (the root on top, a row per depth) with the path being walked coloured. The trie and its drawing are exported for
// the string problems that use one too.
import { cells, done, fill, row, text, words, type Frame, type ProblemSet, type Role } from "./core";

/** A trie: node 0 is the root; each node knows its character, its parent, its children, how many strings pass it. */
export class Trie {
  ch = [""];
  parent = [-1];
  depth = [0];
  kids: Map<string, number>[] = [new Map()];
  /** How many strings were put in through this node. */
  count = [0];
  /** The string that ends here, if any. */
  end: (string | null)[] = [null];

  get size() {
    return this.ch.length;
  }

  /** Puts a string in; returns its path from the root (root included) and the nodes it made. */
  add(s: string, max: number, big: string): { path: number[]; made: number[] } {
    let at = 0;
    const path = [0];
    const made: number[] = [];
    this.count[0]++;
    for (const c of s) {
      let next = this.kids[at].get(c);
      if (next === undefined) {
        next = this.ch.length;
        if (next >= max) throw new Error(fill(big, { n: max }));
        this.ch.push(c);
        this.parent.push(at);
        this.depth.push(this.depth[at] + 1);
        this.kids.push(new Map());
        this.count.push(0);
        this.end.push(null);
        this.kids[at].set(c, next);
        made.push(next);
      }
      at = next;
      this.count[at]++;
      path.push(at);
    }
    this.end[at] = s;
    return { path, made };
  }

  /** Walks a string down from the root as far as it goes: the nodes reached (root included). */
  walk(s: string): number[] {
    const path = [0];
    for (const c of s) {
      const next = this.kids[path[path.length - 1]].get(c);
      if (next === undefined) break;
      path.push(next);
    }
    return path;
  }

  /** The characters from the root down to a node. */
  prefix(n: number): string {
    let out = "";
    for (let at = n; at > 0; at = this.parent[at]) out = this.ch[at] + out;
    return out;
  }
}

/** A space drawn so it can be seen. */
export const seen = (c: string) => (c === " " ? "␣" : c);

/**
 * The trie as a graph in layers: nodes renumbered in depth-first order, so that within each row they sit left to
 * right as in the tree and no edges cross. An edge takes its child's colour when the child is on the path.
 */
export function trieGraph(t: Trie, roleOf: (n: number) => Role, tagOf?: (n: number) => string): NonNullable<Frame["graph"]> {
  const order: number[] = [];
  const visit = (n: number) => {
    order.push(n);
    for (const k of t.kids[n].values()) visit(k);
  };
  visit(0);
  const place = new Map(order.map((n, i) => [n, i]));
  const hot = (r: Role) => r === "compare" || r === "key" || r === "sorted" || r === "min";
  return {
    nodes: order.map((n) => (n === 0 ? "" : seen(t.ch[n]))),
    edges: order.slice(1).map((n) => ({ a: place.get(t.parent[n])!, b: place.get(n)!, ...(hot(roleOf(n)) ? { role: roleOf(n) } : {}) })),
    roles: order.map(roleOf),
    directed: false,
    layer: order.map((n) => t.depth[n]),
    ...(tagOf ? { tags: order.map(tagOf) } : {}),
  };
}

const MAX_NODES = 20;
const quoted = (s: string) => `“${s}”`;

/** Words with no repeats, for an answer line per word. */
const answerList = (qs: readonly string[], yes: readonly boolean[], w: { item: string; yesWord: string; noWord: string }) =>
  qs.map((q, i) => fill(w.item, { q, a: yes[i] ? w.yesWord : w.noWord })).join(", ");

export const TRIES: ProblemSet<"tries"> = {
  suffixTrieConstruction: {
    level: 2,
    example: ["abcab", "ab, bca, cab, abd"],
    solve: ([s, q], w, e) => {
      const str = text(s, e, 7);
      const qs = words(q, e, 5, 8);
      const t = new Trie();
      const star = new Set<number>();
      const tag = (n: number) => (star.has(n) ? "*" : "");
      const frames: Frame[] = [];
      const chars = [...str];
      for (let i = 0; i < chars.length; i++) {
        const suffix = chars.slice(i).join("");
        const { path, made } = t.add(suffix, MAX_NODES, w.big);
        star.add(path[path.length - 1]);
        const on = new Set(path);
        const fresh = new Set(made);
        frames.push({
          note: fill(w.insert, { s: suffix, k: made.length }),
          cells: cells(chars.map(seen), (k) => (k >= i ? "key" : "idle"), { i }),
          graph: trieGraph(t, (n) => (fresh.has(n) ? "key" : on.has(n) && n > 0 ? "compare" : "plain"), tag),
        });
      }
      const yes: boolean[] = [];
      for (const query of qs) {
        const path = t.walk(query);
        const last = path[path.length - 1];
        const whole = path.length === [...query].length + 1;
        const ok = whole && star.has(last);
        yes.push(ok);
        const on = new Set(path);
        const note = ok ? w.yes : whole ? w.notEnd : w.off;
        frames.push({
          note: fill(note, { q: query, c: seen([...query][path.length - 1] ?? "") }),
          cells: cells(chars.map(seen), () => "plain"),
          graph: trieGraph(t, (n) => (n === 0 ? "plain" : !on.has(n) ? "plain" : ok ? "sorted" : n === last ? "min" : "compare"), tag),
        });
      }
      return done(frames, fill(w.answer, { list: answerList(qs, yes, w) }));
    },
  },

  multiStringSearch: {
    level: 3,
    example: ["she sells shells", "he, shell, sea, ells, hes"],
    solve: ([b, s], w, e) => {
      const big = text(b, e, 16);
      const smalls = words(s, e, 6, 8);
      const t = new Trie();
      const frames: Frame[] = [];
      const chars = [...big];
      const found = smalls.map(() => false);
      const foundRow = (now: Set<number> = new Set()) => row(w.found, smalls, (k) => (now.has(k) ? "key" : found[k] ? "sorted" : "plain"));
      for (const small of smalls) {
        const { path, made } = t.add(small, MAX_NODES, w.big);
        const on = new Set(path);
        const fresh = new Set(made);
        frames.push({
          note: fill(w.insert, { w: small }),
          graph: trieGraph(t, (n) => (fresh.has(n) ? "key" : on.has(n) && n > 0 ? "compare" : "plain")),
          rows: [foundRow()],
        });
      }
      for (let i = 0; i < chars.length; i++) {
        const path = t.walk(chars.slice(i).join(""));
        const on = new Set(path);
        const ends = path.filter((n) => t.end[n] !== null);
        const now = new Set(smalls.flatMap((x, k) => (ends.some((n) => t.end[n] === x) ? [k] : [])));
        for (const k of now) found[k] = true;
        const reach = path.length - 1;
        const note = !reach
          ? fill(w.stop, { i, c: seen(chars[i]) })
          : ends.length
            ? fill(w.hit, { i, list: [...new Set(ends.map((n) => quoted(t.end[n]!)))].join(", ") })
            : fill(w.walk, { i, p: chars.slice(i, i + reach).join("") });
        frames.push({
          note,
          cells: cells(chars.map(seen), (k) => (k >= i && k < i + reach ? "compare" : k < i ? "idle" : "plain"), { i }, reach ? [i, i + reach - 1] : undefined),
          graph: trieGraph(t, (n) => (n === 0 || !on.has(n) ? "plain" : t.end[n] !== null ? "sorted" : "compare")),
          rows: [foundRow(now)],
        });
      }
      return done(frames, fill(w.answer, { list: answerList(smalls, found, w) }));
    },
  },

  longestMostFrequentPrefix: {
    level: 3,
    example: ["trie, tribe, trip, tree, trick"],
    solve: ([s], w, e) => {
      const strs = words(s, e, 8, 8);
      const t = new Trie();
      const frames: Frame[] = [];
      let [best, bestCount] = [0, 0];
      const tag = (n: number) => (n === 0 ? "" : String(t.count[n]));
      for (const str of strs) {
        const { path, made } = t.add(str, MAX_NODES, w.big);
        let better = false;
        for (const n of path.slice(1))
          if (t.count[n] > bestCount || (t.count[n] === bestCount && t.depth[n] > t.depth[best])) {
            [best, bestCount, better] = [n, t.count[n], true];
          }
        const on = new Set(path);
        const fresh = new Set(made);
        const p = t.prefix(best);
        frames.push({
          note: better ? fill(w.better, { w: str, p, n: bestCount }) : fill(w.insert, { w: str }),
          graph: trieGraph(t, (n) => (n === best ? "sorted" : fresh.has(n) ? "key" : on.has(n) && n > 0 ? "compare" : "plain"), tag),
          rows: [row(w.best, [p, bestCount], () => (better ? "key" : "sorted"))],
        });
      }
      return done(frames, fill(w.answer, { p: t.prefix(best), n: bestCount }));
    },
  },

  shortestUniquePrefixes: {
    level: 3,
    example: ["zebra, dog, duck, dove"],
    solve: ([s], w, e) => {
      const strs = words(s, e, 8, 8);
      for (const [i, a] of strs.entries()) {
        const b = strs.find((x, k) => k !== i && x.startsWith(a));
        if (b !== undefined) throw new Error(fill(w.prefixOf, { a, b }));
      }
      const t = new Trie();
      const frames: Frame[] = [];
      const tag = (n: number) => (n === 0 ? "" : String(t.count[n]));
      for (const str of strs) {
        const { path, made } = t.add(str, MAX_NODES, w.big);
        const on = new Set(path);
        const fresh = new Set(made);
        frames.push({
          note: fill(w.insert, { w: str }),
          graph: trieGraph(t, (n) => (fresh.has(n) ? "key" : on.has(n) && n > 0 ? "compare" : "plain"), tag),
        });
      }
      const out: string[] = [];
      for (const str of strs) {
        const path = t.walk(str);
        const k = path.findIndex((n) => n > 0 && t.count[n] === 1);
        const stop = path[k];
        const on = new Set(path.slice(1, k + 1));
        out.push(t.prefix(stop));
        frames.push({
          note: fill(w.walk, { w: str, p: t.prefix(stop) }),
          graph: trieGraph(t, (n) => (n === stop ? "sorted" : on.has(n) ? "compare" : "plain"), tag),
          rows: [row(w.prefixes, out, (j) => (j === out.length - 1 ? "key" : "sorted"))],
        });
      }
      return done(frames, fill(w.answer, { list: `[${out.join(", ")}]` }));
    },
  },
};
