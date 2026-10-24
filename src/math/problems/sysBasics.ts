// System design fundamentals, each as something to run: a cache that evicts, a ring of servers that keys hash onto, a
// rate limiter that turns requests away… The inputs are the knobs (sizes, policies, the requests that arrive), and
// every step says what the system did and why, ending on the numbers that matter (hit rate, keys moved, requests let
// through).
import { cells, done, fill, int, row, text, type ArchBox, type ArchLink, type Frame, type ProblemSet, type Role } from "./core";
import { choice, names, pct } from "./sys";

import { NET } from "./sysNet";
import { DIST } from "./sysDist";
export const SYS_BASICS: ProblemSet<"sysBasics"> = {
  designInterview: {
    level: 0,
    example: ["45", "a URL shortener"],
    solve: ([mins, sys], w, e) => {
      const M = int(mins, e, 20, 120);
      const name = text(sys, e, 40);
      // The share of the time each phase deserves; the minutes are rounded and the last phase takes what is left.
      const share = [0.1, 0.1, 0.1, 0.1, 0.25, 0.3, 0.05];
      const minutes = share.map((x) => Math.round(x * M));
      minutes[minutes.length - 1] = M - minutes.slice(0, -1).reduce((a, b) => a + b, 0);
      const frames: Frame[] = [{ note: fill(w.start, { s: name, m: M }), rows: [row(w.kinds[0], w.layers[0])] }];
      const table = (upTo: number) => ({
        vals: w.phases.slice(0, upTo + 1).map((p, i) => [`${minutes[i]} min`, p]),
        roles: w.phases.slice(0, upTo + 1).map((_, i): Role[] => (i === upTo ? ["key", "key"] : ["plain", "plain"])),
        rowHeads: w.phaseNames.slice(0, upTo + 1),
        colHeads: [...w.heads],
      });
      for (let i = 0; i < w.phases.length; i++) frames.push({ note: fill(w.phaseNotes[i], { s: name, m: minutes[i] }), mat: table(i) });
      // The four kinds of fundamentals the lessons that follow are about, a kind at a time.
      for (let k = 0; k < w.kinds.length; k++)
        frames.push({ note: w.kindNotes[k], rows: w.kinds.slice(0, k + 1).map((label, j) => row(label, w.layers[j], () => (j === k ? "key" : "plain"))) });
      return done(frames, fill(w.answer, { m: M, s: name, a: minutes[0], h: minutes[4], d: minutes[5] }));
    },
  },
  caching: {
    level: 0,
    example: ["3", "LRU", "A, B, C, A, D, B, E, A, B, C"],
    solve: ([cap, pol, reqs], w, e) => {
      const size = int(cap, e, 1, 8);
      const policy = choice(pol, ["LRU", "LFU", "FIFO"] as const, w.badPolicy);
      const keys = names(reqs, e.empty, e.tooMany, 16);
      // The cache in the order the policy evicts from: the first entry goes first.
      let cache: string[] = [];
      const uses = new Map<string, number>();
      const since = new Map<string, number>();
      let hits = 0;
      const frames: Frame[] = [];
      const boxes: ArchBox[] = [
        { label: w.client, col: 0, row: 0, kind: "client" },
        { label: w.cache, col: 1, row: 0, kind: "cache" },
        { label: w.database, col: 2, row: 0, kind: "db" },
      ];
      for (const [i, k] of keys.entries()) {
        const hit = cache.includes(k);
        let evicted: string | undefined;
        if (hit) {
          hits++;
          uses.set(k, (uses.get(k) ?? 0) + 1);
          if (policy === "LRU") cache = [...cache.filter((x) => x !== k), k];
        } else {
          if (cache.length === size) {
            // LFU: the fewest uses goes, the one in the cache longest among a tie.
            evicted = policy === "LFU" ? cache.reduce((a, b) => (uses.get(b)! < uses.get(a)! || (uses.get(b) === uses.get(a) && since.get(b)! < since.get(a)!) ? b : a)) : cache[0];
            cache = cache.filter((x) => x !== evicted);
            uses.delete(evicted);
          }
          cache.push(k);
          uses.set(k, 1);
          since.set(k, i);
        }
        const links: ArchLink[] = hit
          ? [{ a: 0, b: 1, label: k, role: "sorted", both: true }, { a: 1, b: 2 }]
          : [{ a: 0, b: 1, label: k, role: "compare" }, { a: 1, b: 2, label: w.miss, role: "compare", both: true }];
        const v = { k, x: evicted ?? "", n: uses.get(k) ?? 1 };
        frames.push({
          note: hit ? fill(w.hit, v) : evicted ? fill(w.evict, v) : fill(w.missNote, v),
          arch: { boxes: boxes.map((b, j) => (j === 1 ? { ...b, role: hit ? "sorted" : "compare", tag: fill(w.held, { n: cache.length, c: size }) } : b)), links },
          cells: cells(keys, (j) => (j === i ? (hit ? "sorted" : "compare") : j < i ? "idle" : "plain"), { i }),
          rows: [
            row(fill(w.order[policy], {}), cache.map((x) => (policy === "LFU" ? `${x} ×${uses.get(x)}` : x)), (j) => (cache[j] === k ? (hit ? "sorted" : "key") : "plain")),
            ...(evicted ? [row(w.out, [evicted], () => "min" as Role)] : []),
          ],
        });
      }
      return done(frames, fill(w.answer, { h: hits, m: keys.length - hits, r: pct(hits / keys.length) }));
    },
  },
  ...NET,
  ...DIST,
};
