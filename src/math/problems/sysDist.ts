// System design fundamentals on distributed systems, each something to run: keys sharded and replicated, a Raft
// election, a file spread peer to peer, polling against streaming, a config rollout with a canary, a rate limiter,
// metrics and an alert rolled up from logs, a pub/sub broker, a MapReduce word count, a Diffie–Hellman handshake and a
// REST API's pagination. The inputs are the knobs, every step says what happened and why, and the answer gives the
// numbers that matter.
import type { sysDist } from "../../locales/problems/en/sysDist";
import { cells, done, fill, grid2, int, listText, nums, row, text, type ArchBox, type ArchLink, type Cells, type Frame, type GraphEdge, type ProblemSubset, type Role } from "./core";
import { amount, choice, names } from "./sys";

/** A number with at most two decimals, as times and rates are written. */
const fmt = (x: number) => String(Math.round(x * 100) / 100);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const EPS = 1e-9;

/** An architecture: the boxes with some lit (and tags added), the links with some lit. */
function archOf(boxes: ArchBox[], links: ArchLink[], lit: { boxes?: Record<number, Role>; links?: Record<number, Role>; tags?: Record<number, string> } = {}) {
  return {
    boxes: boxes.map((b, i) => ({ ...b, ...(lit.boxes?.[i] ? { role: lit.boxes[i] } : {}), ...(lit.tags?.[i] !== undefined ? { tag: lit.tags[i] } : {}) })),
    links: links.map((l, i) => (lit.links?.[i] ? { ...l, role: lit.links[i] } : l)),
  };
}

/** Superscript digits, for powers written in a note: 5⁶. */
const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
function modPow(b: number, e: number, m: number) {
  let r = 1;
  b %= m;
  for (; e > 0; e >>= 1, b = (b * b) % m) if (e & 1) r = (r * b) % m;
  return r;
}
const isPrime = (p: number) => p >= 2 && range(Math.floor(Math.sqrt(p)) - 1).every((i) => p % (i + 2) !== 0);
/** A Caesar shift of the letters A–Z, spaces kept. */
const shift = (s: string, k: number) => s.replace(/[A-Z]/g, (ch) => String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + k + 26) % 26)));
/** The toy hash the word count shuffles by: the sum of the character codes. */
export const wordHash = (x: string) => [...x].reduce((a, ch) => a + ch.codePointAt(0)!, 0);
/** "none", "-" or nothing: the knob is not used. */
const isNone = (s: string, none: string) => /^(none|no|-|–|—|0)?$/i.test(s.trim()) || s.trim().toLowerCase() === none.toLowerCase();

export const DIST: ProblemSubset<"sysBasics", keyof typeof sysDist> = {
  replicationSharding: {
    level: 0,
    example: ["3", "range", "12, 71, 45, 88, 67, 93, 70, 5, 81, 76", "async", "3"],
    solve: ([ns, how, ks, rep, fl], w, e) => {
      const n = int(ns, e, 2, 4);
      const mode = choice(how, ["range", "hash"] as const, w.badChoice);
      const keys = nums(ks, e, { whole: true, min: 0, max: 12 });
      const big = keys.find((k) => k > 99);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: big, n: 99 }));
      const again = keys.find((k, i) => keys.indexOf(k) !== i);
      if (again !== undefined) throw new Error(fill(w.twice, { s: again }));
      const sync = choice(rep, ["sync", "async"] as const, w.badChoice) === "sync";
      const failing = int(fl, e, 1, n) - 1;
      // Asynchronous followers copy a write two writes after it was made.
      const LAG = 2;
      const lo = (i: number) => Math.round((i * 100) / n);
      const shardOf = (k: number) => {
        if (mode === "hash") return k % n;
        let s = 0;
        while (s + 1 < n && k >= lo(s + 1)) s++;
        return s;
      };
      const sName = (i: number) => fill(w.shard, { i: i + 1 });
      const label = (i: number) => (mode === "range" ? fill(w.range, { i: i + 1, a: lo(i), b: lo(i + 1) - 1 }) : fill(w.hashRow, { i: i + 1, n, r: i }));

      const mid = Math.floor((n - 1) / 2);
      const boxes: ArchBox[] = [
        { label: w.client, col: 0, row: mid, kind: "client" },
        { label: w.router, col: 1, row: mid, kind: "lb" },
        ...range(n).map((i): ArchBox => ({ label: fill(w.leader, { i: i + 1 }), col: 2, row: i, kind: "db" })),
        ...range(n).map((i): ArchBox => ({ label: fill(w.follower, { i: i + 1 }), col: 3, row: i, kind: "db" })),
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1 },
        ...range(n).map((i): ArchLink => ({ a: 1, b: 2 + i })),
        ...range(n).map((i): ArchLink => ({ a: 2 + i, b: 2 + n + i, label: w.copy, dashed: !sync })),
      ];
      // Which shard each write went to, and which writes each follower holds after write `t`.
      const shardAt = keys.map(shardOf);
      const copied = (t: number, j: number) => j <= t && (sync || j <= t - LAG);
      const tags = (t: number) => {
        const out: Record<number, string> = {};
        for (const i of range(n)) {
          const mine = range(t + 1).filter((j) => shardAt[j] === i);
          out[2 + i] = String(mine.length);
          out[2 + n + i] = fill(w.copies, { n: mine.filter((j) => copied(t, j)).length, m: mine.length });
        }
        return out;
      };
      const shardRows = (t: number, role: (j: number) => Role) =>
        range(n).map((i) => {
          const mine = range(t + 1).filter((j) => shardAt[j] === i);
          return row(label(i), mine.map((j) => keys[j]), (q) => role(mine[q]));
        });

      const frames: Frame[] = [];
      frames.push({
        note: fill(w.start[mode], { n }),
        arch: archOf(boxes, links, { tags: tags(-1) }),
        cells: cells(keys),
        rows: shardRows(-1, () => "plain"),
      });
      for (const [t, k] of keys.entries()) {
        const s = shardAt[t];
        const lit: Record<number, Role> = { 0: "compare", [1 + s]: "compare" };
        const litBoxes: Record<number, Role> = { [2 + s]: "key" };
        if (sync) (lit[1 + n + s] = "key"), (litBoxes[2 + n + s] = "key");
        else if (t - LAG >= 0) lit[1 + n + shardAt[t - LAG]] = "pivot";
        const to = mode === "range" ? fill(w.toRange, { k, s: sName(s) }) : fill(w.toHash, { k, n, r: k % n, s: sName(s) });
        frames.push({
          note: `${to} ${sync ? w.sync : w.async}`,
          arch: archOf(boxes, links, { boxes: litBoxes, links: lit, tags: tags(t) }),
          cells: cells(keys, (j) => (j === t ? "compare" : j < t ? "idle" : "plain")),
          rows: shardRows(t, (j) => (j === t ? "key" : copied(t, j) ? "plain" : "compare")),
        });
      }
      const T = keys.length - 1;
      const counts = range(n).map((i) => shardAt.filter((s) => s === i).length);
      const countText = counts.map((c, i) => `${sName(i)} ${c}`).join(", ");
      const most = counts.indexOf(Math.max(...counts));
      const hot = counts[most] > (1.5 * keys.length) / n;
      frames.push({
        note: hot ? fill(w.hot, { s: sName(most), c: counts[most], t: keys.length, x: fmt(counts[most] / (keys.length / n)) }) : fill(w.even, { counts: countText }),
        arch: archOf(boxes, links, { boxes: hot ? { [2 + most]: "min" } : {}, tags: tags(T) }),
        cells: cells(keys, () => "idle"),
        rows: shardRows(T, (j) => (hot && shardAt[j] === most ? "min" : copied(T, j) ? "plain" : "compare")),
      });
      const mine = range(T + 1).filter((j) => shardAt[j] === failing);
      const lost = mine.filter((j) => !copied(T, j));
      frames.push({
        note: fill(w.crash, { s: sName(failing), h: mine.length - lost.length, m: mine.length }),
        arch: archOf(boxes, links, { boxes: { [2 + failing]: "min" }, tags: tags(T) }),
        cells: cells(keys, () => "idle"),
        rows: shardRows(T, (j) => (copied(T, j) ? "plain" : "compare")),
      });
      frames.push({
        note: sync ? w.syncSafe : lost.length ? fill(w.lostNote, { list: lost.map((j) => keys[j]).join(", ") }) : w.noneLost,
        arch: archOf(boxes, links, { boxes: { [2 + failing]: "idle", [2 + n + failing]: "sorted" }, tags: tags(T) }),
        cells: cells(keys, (j) => (lost.includes(j) ? "min" : "idle")),
        rows: shardRows(T, (j) => (lost.includes(j) ? "min" : "plain")),
      });
      const lostText = lost.length ? `${lost.length} (${lost.map((j) => keys[j]).join(", ")})` : "0";
      return done(frames, fill(w.answer, { counts: countText, s: sName(failing), lost: lostText }));
    },
  },

  leaderElection: {
    level: 0,
    example: ["150, 300, 220, 270, 190", "50", "600, 1100"],
    solve: ([ts, hb, cs], w, e) => {
      const T = nums(ts, e, { whole: true, least: 3, max: 7 });
      for (const t of T) if (t < 50 || t > 2000) throw new Error(fill(e.range, { s: t, lo: 50, hi: 2000 }));
      const h = int(hb, e, 10, 1000);
      const shortest = Math.min(...T);
      if (h >= shortest) throw new Error(fill(w.slowBeat, { t: shortest }));
      const crashes = nums(cs, e, { whole: true, max: 3, min: 0 }).sort((a, b) => a - b);
      const late = crashes.find((c) => c > 20000);
      if (late !== undefined) throw new Error(fill(e.atMost, { s: late, n: 20000 }));

      const n = T.length;
      const need = Math.floor(n / 2) + 1;
      const label = T.map((_, i) => String.fromCharCode(65 + i));
      const alive = T.map(() => true);
      const deadline = [...T];
      let term = 0;
      let leader = -1;
      const leaders: { x: number; k: number; t: number }[] = [];
      const frames: Frame[] = [];
      const pic = (cand: number, edges: GraphEdge[] = []): Frame["graph"] => ({
        nodes: label,
        edges,
        directed: true,
        roles: label.map((_, i) => (!alive[i] ? "min" : i === leader ? "sorted" : i === cand ? "compare" : "plain")),
        tags: label.map((_, i) => (!alive[i] ? w.down : i === leader ? fill(w.leads, { k: term }) : fill(w.timer, { t: deadline[i] }))),
      });
      /** The live node whose timer fires first (the first in order among a tie). */
      const first = () => range(n).filter((i) => alive[i] && i !== leader).reduce((a, b) => (deadline[b] < deadline[a] ? b : a));
      const rest = (c: number) => range(n).filter((i) => alive[i] && i !== c);

      let f = first();
      frames.push({ note: fill(w.start, { n, first: label[f], t: deadline[f] }), graph: pic(-1) });
      let ci = 0;
      let stuck = false;
      for (;;) {
        const c = first();
        const t = deadline[c];
        // A crash before anyone leads hits nobody.
        while (ci < crashes.length && crashes[ci] < t) frames.push({ note: fill(w.idle, { c: crashes[ci++] }), graph: pic(-1) });
        term++;
        const others = rest(c);
        frames.push({ note: fill(w.timeout, { x: label[c], t, k: term }), graph: pic(c, others.map((i) => ({ a: c, b: i, role: "compare" }))) });
        const votes = 1 + others.length;
        if (votes < need) {
          frames.push({ note: fill(w.stuck, { x: label[c], v: votes, m: need }), graph: pic(c) });
          stuck = true;
          break;
        }
        leader = c;
        leaders.push({ x: c, k: term, t });
        frames.push({ note: fill(w.wins, { x: label[c], v: votes, n, m: need, k: term }), graph: pic(-1, others.map((i) => ({ a: i, b: c, role: "sorted" }))) });
        for (const i of others) deadline[i] = t + T[i];
        const beats = others.map((i): GraphEdge => ({ a: c, b: i, role: "key" }));
        if (ci >= crashes.length) {
          frames.push({ note: fill(w.keeps, { x: label[c], k: term }), graph: pic(-1, beats) });
          break;
        }
        frames.push({ note: fill(w.heartbeats, { x: label[c], h }), graph: pic(-1, beats) });
        // The last heartbeat before the crash; the followers' timers run on from it.
        const crash = crashes[ci++];
        const last = t + Math.max(0, Math.ceil((crash - t) / h) - 1) * h;
        for (const i of others) deadline[i] = last + T[i];
        alive[c] = false;
        leader = -1;
        f = first();
        frames.push({ note: fill(w.crash, { x: label[c], c: crash, b: last, first: label[f], t: deadline[f] }), graph: pic(-1) });
      }
      const list = leaders.map((l) => fill(w.leader, { x: label[l.x], k: l.k, t: l.t })).join(", ");
      return done(frames, stuck ? fill(w.answerStuck, { list, a: alive.filter(Boolean).length, n }) : fill(w.answer, { list }));
    },
  },

  peerToPeer: {
    level: 0,
    example: ["4", "6"],
    solve: ([cs, ns], w, e) => {
      const c = int(cs, e, 2, 8);
      const n = int(ns, e, 2, 8);
      const peers = range(n).map((i) => fill(w.peer, { i: i + 1 }));
      const heads = range(c).map((j) => fill(w.chunk, { j: j + 1 }));
      const table = (has: boolean[][], fresh: Set<string> = new Set()) => ({
        vals: has.map((r) => r.map((x) => (x ? "✓" : "·"))),
        roles: has.map((r, i) => r.map((x, j): Role => (fresh.has(`${i}:${j}`) ? "key" : x ? "sorted" : "plain"))),
        rowHeads: peers,
        colHeads: heads,
      });
      const frames: Frame[] = [];

      // The server alone: one chunk a round, a machine at a time.
      let has = grid2(n, c, () => false);
      frames.push({ note: fill(w.serverStart, { n, c, t: n * c }), mat: table(has), rows: [row(w.sent, [])] });
      for (let i = 0; i < n; i++) {
        has[i] = has[i].map(() => true);
        frames.push({
          note: fill(w.serverDone, { r: (i + 1) * c, p: peers[i], c }),
          mat: table(has, new Set(range(c).map((j) => `${i}:${j}`))),
          rows: [row(w.sent, heads.map((h) => `${w.seed}→${peers[i]} ${h}`), () => "key")],
        });
      }
      frames.push({ note: fill(w.serverEnd, { t: n * c }), mat: table(has), rows: [row(w.sent, [])] });

      // Peer to peer: the server and every machine with a chunk each send one a round, rarest first.
      has = grid2(n, c, () => false);
      frames.push({ note: w.p2pStart, mat: table(has), rows: [row(w.sent, [])] });
      let rounds = 0;
      while (has.some((r) => r.some((x) => !x))) {
        rounds++;
        const before = has.map((r) => [...r]);
        const copies = range(c).map((j) => before.filter((r) => r[j]).length);
        const held = (i: number) => before[i].filter(Boolean).length;
        const busy = new Set<number>();
        const moves: [number, number, number][] = [];
        for (const s of [-1, ...range(n).filter((i) => before[i].some(Boolean))]) {
          let best: [number, number] | null = null;
          for (let j = 0; j < c; j++) {
            if (s >= 0 && !before[s][j]) continue;
            const takers = range(n).filter((r) => r !== s && !busy.has(r) && !before[r][j]);
            if (!takers.length) continue;
            // The machine with the fewest chunks takes it.
            const r = takers.reduce((a, b) => (held(b) < held(a) ? b : a));
            if (!best || copies[j] < copies[best[0]]) best = [j, r];
          }
          if (best) {
            moves.push([s, best[1], best[0]]);
            busy.add(best[1]);
            copies[best[0]]++;
          }
        }
        for (const [, r, j] of moves) has[r][j] = true;
        frames.push({
          note: fill(w.round, { r: rounds, k: moves.length }),
          mat: table(has, new Set(moves.map(([, r, j]) => `${r}:${j}`))),
          rows: [row(w.sent, moves.map(([s, r, j]) => `${s < 0 ? w.seed : peers[s]}→${peers[r]} ${heads[j]}`), () => "key")],
        });
      }
      frames.push({ note: fill(w.p2pEnd, { r: rounds, t: n * c }), mat: table(has), rows: [row(w.sent, [])] });
      return done(frames, fill(w.answer, { a: n * c, b: rounds }));
    },
  },

  pollingStreaming: {
    level: 0,
    example: ["3, 4, 11, 27, 28.5", "5", "60"],
    solve: ([ms, ps, ws], w, e) => {
      const msgs = nums(ms, e, { max: 8, min: 0.1 }).sort((a, b) => a - b);
      const p = amount(ps, 0.5, 30, w.badNumber);
      const W = amount(ws, 10, 120, w.badNumber);
      const after = msgs.find((m) => m > W);
      if (after !== undefined) throw new Error(fill(w.tooLate, { s: fmt(after), w: fmt(W) }));
      const HOLD = 30;
      const at = (x: number) => Math.round(x * 1000) / 1000;

      const boxes: ArchBox[] = [
        { label: w.client, col: 0, row: 0, kind: "client" },
        { label: w.server, col: 1, row: 0, kind: "server" },
      ];
      const arch = (label: string, role: Role = "plain", both = false) => ({ boxes, links: [{ a: 0, b: 1, label, role, both }] });
      const spans = (waits: [number, number][], wr: Role[], reqs: [number, number][], rr: Role[]) => [
        { label: w.waits, items: waits, roles: wr },
        { label: w.requests, items: reqs, roles: rr },
      ];
      const frames: Frame[] = [];
      frames.push({ note: fill(w.start, { n: msgs.length, w: fmt(W) }), spans: spans(msgs.map((m) => [m, m]), msgs.map(() => "plain"), [], []), arch: arch("") });

      // Polling: a request every p seconds; a message waits for the next one.
      const polls = Math.ceil(W / p - EPS);
      if (polls > 40) throw new Error(fill(w.tooManyPolls, { n: 40 }));
      const pollTimes = range(polls).map((k) => at((k + 1) * p));
      const got = msgs.map((m) => at(Math.ceil(m / p - EPS) * p));
      const busy = [...new Set(got)];
      frames.push({
        note: fill(w.pollStart, { p: fmt(p), r: polls, w: fmt(W) }),
        spans: spans(msgs.map((m) => [m, m]), msgs.map(() => "plain"), pollTimes.map((t) => [t, t]), pollTimes.map(() => "plain")),
        arch: arch(w.poll, "compare"),
      });
      for (const t of busy) {
        const now = msgs.flatMap((m, i) => (got[i] === t ? [i] : []));
        frames.push({
          note: fill(w.pollGot, { t: fmt(t), list: now.map((i) => fmt(msgs[i])).join(", "), d: now.map((i) => fmt(t - msgs[i])).join(", ") }),
          spans: spans(
            msgs.map((m, i) => [m, got[i] <= t ? got[i] : m]),
            msgs.map((_, i) => (got[i] === t ? "key" : got[i] < t ? "sorted" : "plain")),
            pollTimes.map((x) => [x, x]),
            pollTimes.map((x) => (x === t ? "key" : x < t ? (busy.includes(x) ? "sorted" : "idle") : "plain")),
          ),
          arch: arch(w.poll, "key"),
        });
      }
      const avg = msgs.reduce((s, m, i) => s + got[i] - m, 0) / msgs.length;
      frames.push({
        note: fill(w.pollEnd, { d: fmt(avg), e: polls - busy.length, r: polls }),
        spans: spans(msgs.map((m, i) => [m, got[i]]), msgs.map(() => "sorted"), pollTimes.map((x) => [x, x]), pollTimes.map((x) => (busy.includes(x) ? "sorted" : "idle"))),
        arch: arch(w.poll),
      });

      // Long polling: each request is held until a message comes or HOLD seconds pass, then asked again at once.
      const held: { a: number; b: number; news: boolean; open: boolean }[] = [];
      let open = 0;
      while (open < W - EPS) {
        const next = msgs.find((m) => m > open + EPS);
        if (next !== undefined && next <= open + HOLD + EPS) held.push({ a: open, b: next, news: true, open: false }), (open = next);
        else if (open + HOLD < W - EPS) held.push({ a: open, b: at(open + HOLD), news: false, open: false }), (open = at(open + HOLD));
        else held.push({ a: open, b: W, news: false, open: true }), (open = W);
      }
      const reqSpans = (upTo: number): [number, number][] => held.slice(0, upTo + 1).map((q) => [q.a, q.b]);
      frames.push({ note: w.longStart, spans: spans(msgs.map((m) => [m, m]), msgs.map(() => "plain"), [], []), arch: arch(w.held, "compare") });
      for (const [k, q] of held.entries()) {
        if (q.open) continue;
        frames.push({
          note: fill(q.news ? w.longGot : w.longEmpty, { t: fmt(q.b), a: fmt(q.a) }),
          spans: spans(
            msgs.map((m) => [m, m]),
            msgs.map((m) => (m === q.b ? "key" : m < q.b ? "sorted" : "plain")),
            reqSpans(k),
            held.slice(0, k + 1).map((r, i) => (i === k ? (q.news ? "key" : "idle") : r.news ? "sorted" : "idle")),
          ),
          arch: arch(w.held, q.news ? "key" : "idle"),
        });
      }
      frames.push({
        note: fill(w.longEnd, { r: held.length }),
        spans: spans(msgs.map((m) => [m, m]), msgs.map(() => "sorted"), reqSpans(held.length - 1), held.map((r) => (r.news ? "sorted" : r.open ? "compare" : "idle"))),
        arch: arch(w.held),
      });

      // Streaming: one connection, every message pushed as it comes.
      frames.push({ note: w.stream, spans: spans(msgs.map((m) => [m, m]), msgs.map(() => "sorted"), [[0, W]], ["key"]), arch: arch(w.socket, "key", true) });
      return done(frames, fill(w.answer, { p: fmt(p), d: fmt(avg), r: polls, lr: held.length }));
    },
  },

  configuration: {
    level: 0,
    example: ["40", "5, 25, 100", "10", "invalid"],
    solve: ([ns, ss, ws, vs], w, e) => {
      const n = int(ns, e, 1, 10000);
      const stages = nums(ss, e, { max: 6, min: 1 });
      if (stages.some((x, i) => x > 100 || (i > 0 && x <= stages[i - 1])) || stages[stages.length - 1] !== 100) throw new Error(w.badStages);
      const wait = amount(ws, 1, 120, w.badNumber);
      const bad = choice(vs, ["valid", "invalid"] as const, w.badChoice) === "invalid";
      const BUILD = 20;
      const RESTART = 2;
      const counts = stages.map((s) => Math.max(1, Math.ceil((s * n) / 100 - EPS)));

      const boxes: ArchBox[] = [
        { label: w.box.engineer, col: 0, row: 1, kind: "client" },
        { label: w.box.repo, col: 1, row: 0, kind: "store" },
        { label: w.box.build, col: 2, row: 0, kind: "service" },
        { label: w.box.config, col: 1, row: 2, kind: "db" },
        { label: w.box.canary, col: 3, row: 1, kind: "server" },
        { label: w.box.servers, col: 4, row: 1, kind: "server" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: w.link.commit }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 4, label: w.link.deploy }, // 2
        { a: 2, b: 5, label: w.link.deploy }, // 3
        { a: 0, b: 3, label: w.link.set }, // 4
        { a: 3, b: 4, label: w.link.push, dashed: true }, // 5
        { a: 3, b: 5, label: w.link.push, dashed: true }, // 6
      ];
      const frames: Frame[] = [];
      const step = (note: string, t: number, have: number, stageRole: (i: number) => Role, lit: { boxes?: Record<number, Role>; links?: Record<number, Role> } = {}) =>
        frames.push({
          note,
          arch: archOf(boxes, links, { ...lit, tags: { 4: fill(w.few, { k: counts[0] }), 5: fill(w.count, { k: have, n }) } }),
          cells: cells(stages.map((s) => `${s}%`), stageRole),
          rows: [row(w.clock, [fill(w.min, { t: fmt(t) })])],
        });
      step(fill(w.start, { n, s: stages.length, list: stages.map((s, i) => `${counts[i]} (${s}%)`).join(", ") }), 0, 0, () => "plain");

      // Static: a build, then a rolling restart stage by stage.
      step(w.staticStart, 0, 0, () => "plain", { boxes: { 0: "key", 1: "key" }, links: { 0: "key" } });
      let t = BUILD;
      step(fill(w.build, { t }), t, 0, () => "plain", { boxes: { 1: "key", 2: "key" }, links: { 1: "key" } });
      let staticTime: number;
      if (!bad) {
        for (let i = 0; i < stages.length; i++) {
          t += RESTART;
          step(fill(w.restart, { i: i + 1, k: counts[i] - (i ? counts[i - 1] : 0), s: counts[i], n, t }), t, counts[i], (j) => (j < i ? "sorted" : j === i ? "key" : "plain"), {
            boxes: { [i ? 5 : 4]: "sorted" },
            links: { [i ? 3 : 2]: "key" },
          });
        }
        staticTime = t;
      } else {
        t += RESTART;
        step(fill(w.staticBad, { k: counts[0], t }), t, counts[0], (j) => (j === 0 ? "min" : "plain"), { boxes: { 4: "min" }, links: { 2: "min" } });
        t += BUILD + RESTART;
        step(fill(w.staticBack, { k: counts[0], t }), t, 0, (j) => (j === 0 ? "idle" : "plain"), { boxes: { 2: "key", 4: "sorted" }, links: { 2: "key" } });
        staticTime = t;
      }

      // Dynamic: the config service pushes the value stage by stage, a wait between them.
      step(w.dynStart, 0, 0, () => "plain", { boxes: { 0: "key", 3: "key" }, links: { 4: "key" } });
      let dynTime: number;
      if (!bad) {
        for (let i = 0; i < stages.length; i++) {
          t = i * wait;
          const lastStage = i === stages.length - 1;
          step(fill(lastStage ? w.push : w.pushWait, { i: i + 1, t: fmt(t), s: counts[i], n, w: fmt(wait) }), t, counts[i], (j) => (j < i ? "sorted" : j === i ? "key" : "plain"), {
            boxes: { 3: "key", [i ? 5 : 4]: "sorted" },
            links: { [i ? 6 : 5]: "key" },
          });
        }
        dynTime = t;
      } else {
        step(fill(w.canaryBad, { k: counts[0] }), 0, counts[0], (j) => (j === 0 ? "min" : "plain"), { boxes: { 4: "min" }, links: { 5: "min" } });
        step(fill(w.rollback, { w: fmt(wait), k: counts[0] }), wait, 0, (j) => (j === 0 ? "idle" : "plain"), { boxes: { 3: "key", 4: "sorted" }, links: { 5: "key" } });
        dynTime = wait;
      }
      return done(
        frames,
        bad ? fill(w.answerBad, { a: counts[0], ts: fmt(staticTime), b: counts[0], td: fmt(dynTime) }) : fill(w.answer, { n, ts: fmt(staticTime), td: fmt(dynTime) }),
      );
    },
  },

  rateLimiting: {
    level: 0,
    example: ["2, 7, 8, 9, 9.5, 10, 10.5, 11, 12, 18", "3", "10", "fixed"],
    solve: ([ts, ls, ws, as], w, e) => {
      const times = nums(ts, e, { max: 16, min: 0 }).sort((a, b) => a - b);
      const big = times.find((t) => t > 1000);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: fmt(big), n: 1000 }));
      const L = int(ls, e, 1, 10);
      const W = amount(ws, 1, 60, w.badNumber);
      const algo = choice(as, ["fixed", "sliding", "token"] as const, w.badAlgo);

      const boxes: ArchBox[] = [
        { label: w.client, col: 0, row: 0, kind: "client" },
        { label: w.limiter, col: 1, row: 0, kind: "service" },
        { label: w.api, col: 2, row: 0, kind: "server" },
      ];
      const links: ArchLink[] = [{ a: 0, b: 1 }, { a: 1, b: 2, label: w.ok }, { a: 1, b: 0, label: "429" }];
      const ok: boolean[] = [];
      const counts = new Map<number, number>();
      let log: number[] = [];
      let tokens = L;
      let last = 0;
      const stateRow = (): Cells =>
        algo === "fixed" ? row(fill(w.window, { a: 0, b: fmt(W) }), []) : algo === "sliding" ? row(w.log, log.map(fmt)) : row(w.tokens, [fill(w.ofCap, { x: fmt(tokens), l: L })]);
      const frames: Frame[] = [];
      frames.push({ note: fill(w.start[algo], { w: fmt(W), l: L, r: fmt(L / W) }), arch: archOf(boxes, links), cells: cells(times.map(fmt)), rows: [stateRow()] });
      for (const [i, t] of times.entries()) {
        let allowed: boolean;
        let note: string;
        let state: Cells;
        if (algo === "fixed") {
          const k = Math.floor(t / W + EPS);
          const c = counts.get(k) ?? 0;
          const v = { t: fmt(t), a: fmt(k * W), b: fmt((k + 1) * W), c, l: L };
          allowed = c < L;
          if (allowed) counts.set(k, c + 1);
          note = fill(allowed ? w.fixedOk : w.fixedNo, v);
          const inWindow = times.slice(0, i + 1).filter((x, j) => (ok[j] ?? allowed) && Math.floor(x / W + EPS) === k);
          state = row(fill(w.window, v), inWindow.map(fmt), (j) => (allowed && j === inWindow.length - 1 ? "key" : "plain"));
        } else if (algo === "sliding") {
          const gone = log.filter((x) => x <= t - W + EPS);
          log = log.filter((x) => x > t - W + EPS);
          const c = log.length;
          allowed = c < L;
          if (allowed) log.push(t);
          const v = { t: fmt(t), w: fmt(W), c, l: L, list: gone.map(fmt).join(", ") };
          note = `${gone.length ? `${fill(w.dropped, v)} ` : ""}${fill(allowed ? w.slideOk : w.slideNo, v)}`;
          state = row(w.log, log.map(fmt), (j) => (allowed && j === log.length - 1 ? "key" : "plain"));
        } else {
          tokens = Math.min(L, tokens + ((t - last) * L) / W);
          last = t;
          allowed = tokens >= 1 - EPS;
          note = fill(allowed ? w.tokenOk : w.tokenNo, { t: fmt(t), x: fmt(tokens) });
          if (allowed) tokens = Math.max(0, tokens - 1);
          state = row(w.tokens, [fill(w.ofCap, { x: fmt(tokens), l: L })], () => (allowed ? "key" : "min"));
        }
        ok.push(allowed);
        frames.push({
          note,
          arch: archOf(boxes, links, allowed ? { boxes: { 1: "sorted", 2: "sorted" }, links: { 0: "sorted", 1: "sorted" } } : { boxes: { 1: "min" }, links: { 0: "compare", 2: "min" } }),
          cells: cells(times.map(fmt), (j) => (j === i ? (allowed ? "key" : "min") : j < i ? (ok[j] ? "sorted" : "idle") : "plain")),
          rows: [state],
        });
      }
      const a = ok.filter(Boolean).length;
      return done(frames, fill(w.answer, { a, r: ok.length - a }));
    },
  },

  loggingMonitoring: {
    level: 0,
    example: ["120, 95, 180, 110, 140, 130, 620!, 105, 900!, 150, 115, 125, 98, 135, 160", "5", "p99 > 500"],
    solve: ([ls, ws, rs], w, e) => {
      const parts = ls.split(/[,;\s]+/).filter(Boolean);
      if (!parts.length) throw new Error(e.empty);
      if (parts.length > 20) throw new Error(fill(e.tooMany, { n: 20 }));
      const reqs = parts.map((p) => {
        const m = p.match(/^(\d+(?:\.\d+)?)(!?)$/);
        if (!m) throw new Error(fill(e.number, { s: p }));
        const v = Number(m[1]);
        if (v < 1) throw new Error(fill(e.atLeast, { s: p, n: 1 }));
        if (v > 60000) throw new Error(fill(e.atMost, { s: p, n: 60000 }));
        return { ms: v, err: m[2] === "!" };
      });
      const size = int(ws, e, 2, 10);
      const count = Math.ceil(reqs.length / size);
      if (count > 8) throw new Error(fill(w.tooManyWindows, { n: 8 }));
      const rm = rs.trim().toLowerCase().match(/^(\S+)\s*>\s*(\d+(?:[.,]\d+)?)\s*(%|ms)?$/);
      const metric = rm && (["p50", "p95", "p99"].includes(rm[1]) ? rm[1] : ["errors", "error", w.errorsWord.toLowerCase()].includes(rm[1]) ? "errors" : null);
      if (!rm || !metric) throw new Error(fill(w.badRule, { s: rs.trim() || "…" }));
      const limit = Number(rm[2].replace(",", "."));
      const isErr = metric === "errors";
      const ruleText = `${isErr ? w.errorsWord : metric} > ${fmt(limit)}${isErr ? "%" : ""}`;

      const boxes: ArchBox[] = [
        { label: w.box.servers, col: 0, row: 0, kind: "server" },
        { label: w.box.logs, col: 1, row: 0, kind: "queue" },
        { label: w.box.metrics, col: 2, row: 0, kind: "db" },
        { label: w.box.alerts, col: 3, row: 0, kind: "service" },
        { label: w.box.oncall, col: 4, row: 0, kind: "client" },
      ];
      const links: ArchLink[] = [{ a: 0, b: 1, dashed: true }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 4 }];
      const table: { vals: (number | string)[][]; roles: Role[][]; rowHeads: string[]; colHeads: string[] } = { vals: [], roles: [], rowHeads: [], colHeads: [...w.heads] };
      const snapshot = (lit = -1) => ({ ...table, vals: table.vals.map((r) => [...r]), roles: table.roles.map((r, i) => (i === lit ? r.map((x): Role => (x === "plain" ? "key" : x)) : [...r])), rowHeads: [...table.rowHeads] });
      const all = cells(reqs.map((r) => (r.err ? `${r.ms}!` : String(r.ms))), (i) => (reqs[i].err ? "min" : "plain"));
      const frames: Frame[] = [];
      frames.push({ note: fill(w.logs, { e: reqs.filter((r) => r.err).length, n: reqs.length }), cells: all, arch: archOf(boxes, links, { boxes: { 0: "key" }, links: { 0: "key" } }), mat: snapshot() });
      frames.push({ note: fill(w.ship, { w: size, r: ruleText }), cells: all, arch: archOf(boxes, links, { boxes: { 1: "key", 2: "key", 3: "key" }, links: { 1: "key", 2: "key" } }), mat: snapshot() });

      const rank = (p: number, c: number) => Math.max(1, Math.ceil((p * c) / 100));
      let firing = false;
      const events: string[] = [];
      const items: string[] = [];
      for (let k = 0; k < count; k++) {
        const win = reqs.slice(k * size, (k + 1) * size);
        const sorted = [...win].sort((a, b) => a.ms - b.ms);
        const c = win.length;
        const [i50, i95, i99] = [50, 95, 99].map((p) => rank(p, c));
        const [p50, p95, p99] = [i50, i95, i99].map((i) => sorted[i - 1].ms);
        const errPct = (100 * win.filter((r) => r.err).length) / c;
        // Pointers that land on the same latency share a name.
        const ptrs: Record<string, number> = {};
        for (const [name, i] of [["p50", i50], ["p95", i95], ["p99", i99]] as const) {
          const same = Object.keys(ptrs).find((x) => ptrs[x] === i - 1);
          if (same) {
            delete ptrs[same];
            ptrs[`${same}/${name}`] = i - 1;
          } else ptrs[name] = i - 1;
        }
        const sortedCells = cells(sorted.map((r) => (r.err ? `${r.ms}!` : String(r.ms))), (i) => (sorted[i].err ? "min" : "plain"), ptrs);
        const arch = archOf(boxes, links, { boxes: { 2: "key" }, links: { 1: "key" } });
        frames.push({
          note: fill(w.sorted, { k: k + 1, c, i50, i95, i99, a: fmt(p50), b: fmt(p95), d: fmt(p99) }),
          cells: sortedCells,
          arch,
          mat: snapshot(),
        });
        const value = isErr ? errPct : metric === "p50" ? p50 : metric === "p95" ? p95 : p99;
        const over = value > limit + EPS;
        const v = { m: isErr ? w.errorRate : metric, v: isErr ? `${fmt(value)}%` : fill(w.ms, { v: fmt(value) }), t: isErr ? `${fmt(limit)}%` : fill(w.ms, { v: fmt(limit) }) };
        let note: string;
        let state: string;
        let stateRole: Role;
        if (over && !firing) (note = fill(w.firing, v)), (state = w.state.fire), (stateRole = "min"), events.push(fill(w.fired, { k: k + 1 }));
        else if (over) (note = fill(w.still, v)), (state = w.state.on), (stateRole = "min");
        else if (firing) (note = fill(w.resolved, v)), (state = w.state.resolve), (stateRole = "sorted"), events.push(fill(w.resolvedAt, { k: k + 1 }));
        else (note = fill(w.quiet, v)), (state = w.state.ok), (stateRole = "plain");
        firing = over;
        const col = isErr ? 1 : metric === "p50" ? 2 : metric === "p95" ? 3 : 4;
        table.vals.push([c, `${fmt(errPct)}%`, fmt(p50), fmt(p95), fmt(p99), state]);
        table.roles.push([0, 1, 2, 3, 4, 5].map((j): Role => (j === 5 ? stateRole : j === col ? (over ? "min" : "sorted") : "plain")));
        table.rowHeads.push(fill(w.win, { k: k + 1 }));
        frames.push({
          note,
          cells: sortedCells,
          arch: archOf(boxes, links, over ? { boxes: { 3: "min", 4: "min" }, links: { 2: "min", 3: "min" } } : { boxes: { 3: "key" }, links: { 2: "key" } }),
          mat: snapshot(k),
        });
        items.push(fill(w.item, { k: k + 1, a: fmt(p50), b: fmt(p95), c: fmt(p99), e: `${fmt(errPct)}%` }));
      }
      return done(frames, fill(w.answer, { list: items.join("; "), alert: events.length ? events.join(", ") : w.never }));
    },
  },

  pubSub: {
    level: 0,
    example: ["orders: billing, email; news: email, app", "orders, news, orders, orders, news", "email 2-3", "billing 4"],
    solve: ([ss, ms, offs, losts], w, e) => {
      const groups = ss.split(/[;\n]/).map((g) => g.trim()).filter(Boolean);
      if (!groups.length) throw new Error(e.empty);
      const topics: string[] = [];
      const subsOf = new Map<string, string[]>();
      const subscribers: string[] = [];
      for (const g of groups) {
        const m = g.match(/^([\p{L}\d_-]+)\s*:\s*(.+)$/u);
        if (!m) throw new Error(fill(w.badSubs, { s: g }));
        const t = m[1].toLowerCase();
        const who = names(m[2].toLowerCase(), e.empty, e.tooMany, 4);
        if ([t, ...who].some((x) => [...x].length > 10)) throw new Error(fill(e.tooLong, { n: 10 }));
        if (!subsOf.has(t)) topics.push(t), subsOf.set(t, []);
        for (const s of who) {
          if (!subsOf.get(t)!.includes(s)) subsOf.get(t)!.push(s);
          if (!subscribers.includes(s)) subscribers.push(s);
        }
      }
      if (topics.length > 3) throw new Error(fill(e.tooMany, { n: 3 }));
      if (subscribers.length > 4) throw new Error(fill(e.tooMany, { n: 4 }));
      const msgs = names(ms.toLowerCase(), e.empty, e.tooMany, 10).map((t) => {
        if (!topics.includes(t)) throw new Error(fill(w.noTopic, { s: t, list: topics.join(", ") }));
        return t;
      });
      const k = msgs.length;
      const known = (s: string) => {
        if (!subscribers.includes(s)) throw new Error(fill(w.noSub, { s, list: subscribers.join(", ") }));
        return s;
      };
      let off: { s: string; a: number; b: number } | null = null;
      if (!isNone(offs, w.none)) {
        const m = offs.trim().toLowerCase().match(/^([\p{L}\d_-]+)\s+(\d+)(?:\s*[-–—]\s*(\d+))?$/u);
        if (!m) throw new Error(fill(w.badOffline, { s: offs.trim() }));
        const a = int(m[2], e, 1, k);
        off = { s: known(m[1]), a, b: m[3] === undefined ? a : int(m[3], e, a, k) };
      }
      let lost: { s: string; m: number } | null = null;
      if (!isNone(losts, w.none)) {
        const m = losts.trim().toLowerCase().match(/^([\p{L}\d_-]+)\s+(\d+)$/u);
        if (!m) throw new Error(fill(w.badLost, { s: losts.trim() }));
        const j = int(m[2], e, 1, k) - 1;
        const s = known(m[1]);
        if (!subsOf.get(msgs[j])!.includes(s)) throw new Error(fill(w.notSubscribed, { s, t: msgs[j], m: j + 1 }));
        lost = { s, m: j };
      }

      // Each message is named by the shortest start that tells its topic apart, and its number in that topic.
      let len = 1;
      while (new Set(topics.map((t) => t.slice(0, len))).size < topics.length) len++;
      const seen = new Map<string, number>();
      const tag = msgs.map((t) => {
        seen.set(t, (seen.get(t) ?? 0) + 1);
        const head = t.slice(0, len);
        return `${/^[a-z]/.test(head) ? head[0].toUpperCase() + head.slice(1) : head}${seen.get(t)}`;
      });

      const midT = Math.floor((topics.length - 1) / 2);
      const boxes: ArchBox[] = [
        { label: w.publisher, col: 0, row: midT, kind: "client" },
        ...topics.map((t, i): ArchBox => ({ label: t, col: 1, row: i, kind: "queue" })),
        ...subscribers.map((s, i): ArchBox => ({ label: s, col: 3, row: i, kind: "server" })),
      ];
      const subLinks: [number, string][] = topics.flatMap((t, i) => subsOf.get(t)!.map((s): [number, string] => [i, s]));
      const links: ArchLink[] = [
        ...topics.map((_, i): ArchLink => ({ a: 0, b: 1 + i })),
        ...subLinks.map(([i, s]): ArchLink => ({ a: 1 + i, b: 1 + topics.length + subscribers.indexOf(s), dashed: true })),
      ];
      const linkOf = (t: string, s: string) => topics.length + subLinks.findIndex(([i, x]) => topics[i] === t && x === s);
      const boxOf = (s: string) => 1 + topics.length + subscribers.indexOf(s);

      const pending = new Map(subscribers.map((s) => [s, [] as number[]]));
      const got = new Map(subscribers.map((s) => [s, [] as { m: number; dup: boolean }[]]));
      let lostDone = false;
      const isOff = (s: string, j: number) => off !== null && off.s === s && j + 1 >= off.a && j + 1 <= off.b;
      const frames: Frame[] = [];
      const picture = (j: number, lit: { boxes?: Record<number, Role>; links?: Record<number, Role> }, fresh: Set<string>) => ({
        arch: archOf(boxes, links, {
          ...lit,
          boxes: { ...Object.fromEntries(subscribers.filter((s) => isOff(s, j)).map((s) => [boxOf(s), "idle" as Role])), ...lit.boxes },
          tags: Object.fromEntries(subscribers.filter((s) => isOff(s, j)).map((s) => [boxOf(s), `${w.offline} · ${fill(w.stored, { n: pending.get(s)!.length })}`])),
        }),
        cells: cells(tag, (i) => (i === j ? "compare" : i < j ? "idle" : "plain")),
        rows: subscribers.map((s) => {
          const list = got.get(s)!;
          return row(s, list.map((x) => tag[x.m]), (i) => (list[i].dup ? "min" : fresh.has(`${s}:${i}`) ? "key" : "plain"));
        }),
      });
      /**
       * Hands a subscriber what is waiting for it, in order; a message whose ack is lost holds back the ones behind it
       * until it has been sent again, so the order is kept. Says which message's ack was lost, if one was.
       */
      const deliver = (s: string, fresh: Set<string>, lit: Record<number, Role>) => {
        const queue = pending.get(s)!;
        while (queue.length) {
          const m = queue.shift()!;
          fresh.add(`${s}:${got.get(s)!.length}`);
          got.get(s)!.push({ m, dup: false });
          lit[linkOf(msgs[m], s)] = "sorted";
          if (lost && !lostDone && lost.s === s && lost.m === m) {
            lostDone = true;
            return m;
          }
        }
        return -1;
      };
      const lostFrame = (s: string, m: number, j: number) => {
        got.get(s)!.push({ m, dup: true });
        const fresh = new Set<string>();
        const lit: Record<number, Role> = {};
        deliver(s, fresh, lit);
        frames.push({ note: fill(w.lost, { s, m: tag[m] }), ...picture(j, { boxes: { [boxOf(s)]: "min" }, links: { ...lit, [linkOf(msgs[m], s)]: "min" } }, fresh) });
      };

      frames.push({ note: fill(w.start, { t: topics.length, s: subscribers.length }), ...picture(-1, {}, new Set()) });
      for (const [j, t] of msgs.entries()) {
        const fresh = new Set<string>();
        const linkLit: Record<number, Role> = { [topics.indexOf(t)]: "compare" };
        const boxLit: Record<number, Role> = { [1 + topics.indexOf(t)]: "compare" };
        const now: string[] = [];
        const kept: string[] = [];
        let lostHere: [string, number] | null = null;
        for (const s of subsOf.get(t)!) {
          pending.get(s)!.push(j);
          if (isOff(s, j)) {
            kept.push(s);
            continue;
          }
          now.push(s);
          boxLit[boxOf(s)] = "sorted";
          const lostNow = deliver(s, fresh, linkLit);
          if (lostNow >= 0) lostHere = [s, lostNow];
        }
        const note = [fill(w.publish, { m: tag[j], t }), now.length ? fill(w.got, { list: now.join(", ") }) : "", kept.length ? fill(w.kept, { list: kept.join(", ") }) : ""].filter(Boolean).join(" ");
        frames.push({ note, ...picture(j, { boxes: boxLit, links: linkLit }, fresh) });
        if (lostHere) lostFrame(lostHere[0], lostHere[1], j);
        if (off && off.b === j + 1) {
          const s = off.s;
          const back = new Set<string>();
          const lit: Record<number, Role> = {};
          const waiting = pending.get(s)!.map((m) => tag[m]);
          const lostNow = deliver(s, back, lit);
          frames.push({ note: fill(w.back, { s, n: waiting.length, list: waiting.join(", ") }), ...picture(j + 0.5, { boxes: { [boxOf(s)]: "sorted" }, links: lit }, back) });
          if (lostNow >= 0) lostFrame(s, lostNow, j + 0.5);
        }
      }
      const answer = subscribers
        .map((s) => {
          const list = got.get(s)!;
          const dups = list.filter((x) => x.dup).map((x) => tag[x.m]);
          const text = fill(w.item, { s, list: list.length ? list.map((x) => tag[x.m]).join(", ") : w.nothing });
          return dups.length ? `${text} ${fill(w.dups, { d: dups.join(", ") })}` : text;
        })
        .join("; ");
      return done(frames, fill(w.answer, { list: answer }));
    },
  },

  mapReduce: {
    level: 0,
    example: ["the cat sat; the dog sat on the mat; a cat and a dog", "2", "2"],
    solve: ([ls, ms, rs], w, e) => {
      const lines = ls.split(/[;\n]/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error(e.empty);
      if (lines.length > 6) throw new Error(fill(e.tooMany, { n: 6 }));
      if (lines.some((l) => [...l].length > 40)) throw new Error(fill(e.tooLong, { n: 40 }));
      const words = lines.map((l) => {
        const out = l.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
        if (!out.length) throw new Error(fill(e.bad, { s: l }));
        return out;
      });
      if (words.flat().length > 30) throw new Error(fill(e.tooMany, { n: 30 }));
      if (words.flat().some((x) => [...x].length > 12)) throw new Error(fill(e.tooLong, { n: 12 }));
      const m = int(ms, e, 1, 4);
      const r = int(rs, e, 1, 4);

      const mid = Math.floor((Math.max(m, r) - 1) / 2);
      const boxes: ArchBox[] = [
        { label: w.input, col: 0, row: mid, kind: "store" },
        ...range(m).map((i): ArchBox => ({ label: fill(w.mapper, { i: i + 1 }), col: 1, row: i, kind: "service" })),
        ...range(r).map((i): ArchBox => ({ label: fill(w.reducer, { i: i + 1 }), col: 3, row: i, kind: "service" })),
        { label: w.output, col: 4, row: mid, kind: "store" },
      ];
      const links: ArchLink[] = [
        ...range(m).map((i): ArchLink => ({ a: 0, b: 1 + i })),
        ...range(m).flatMap((i) => range(r).map((k): ArchLink => ({ a: 1 + i, b: 1 + m + k, dashed: true }))),
        ...range(r).map((k): ArchLink => ({ a: 1 + m + k, b: 1 + m + r })),
      ];
      const shuffleLink = (i: number, k: number) => m + i * r + k;
      const outLink = (k: number) => m + m * r + k;

      const mineOf = (i: number) => range(lines.length).filter((l) => l % m === i);
      const pairs = range(m).map((i) => mineOf(i).flatMap((l) => words[l]));
      const reducerOf = (x: string) => wordHash(x) % r;
      // What each reducer gets: its words in order, and a 1 for each time any mapper emitted them.
      const grouped = range(r).map((k) => {
        const g = new Map<string, number>();
        for (const x of pairs.flat()) if (reducerOf(x) === k) g.set(x, (g.get(x) ?? 0) + 1);
        return [...g.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      });

      const mapRows = (stage: number[], lit: number) =>
        range(m).map((i) => row(fill(w.mapRow, { i: i + 1 }), stage[i] ? pairs[i].map((x) => `${x} 1`) : mineOf(i).map((l) => lines[l]), () => (i === lit ? "key" : stage[i] ? "plain" : "idle")));
      const redRows = (stage: number[], lit: number) =>
        range(r).map((k) => row(fill(w.redRow, { i: k + 1 }), stage[k] === 0 ? [] : grouped[k].map(([x, c]) => (stage[k] === 1 ? `${x} ${Array(c).fill(1).join("+")}` : `${x} ${c}`)), () => (k === lit ? "key" : "plain")));
      const frames: Frame[] = [];
      const mapped = range(m).map(() => 0);
      const reduced = range(r).map(() => 0);
      frames.push({
        note: fill(w.split, { l: lines.length, m }),
        arch: archOf(boxes, links, { boxes: { 0: "key" }, links: Object.fromEntries(range(m).map((i) => [i, "key" as Role])) }),
        rows: [...mapRows(mapped, -1), ...redRows(reduced, -1)],
      });
      for (let i = 0; i < m; i++) {
        mapped[i] = 1;
        frames.push({
          note: fill(w.map, { i: i + 1, n: pairs[i].length }),
          arch: archOf(boxes, links, { boxes: { [1 + i]: "key" } }),
          rows: [...mapRows(mapped, i), ...redRows(reduced, -1)],
        });
      }
      const x = pairs.flat()[0];
      const hx = wordHash(x);
      frames.push({
        note: fill(w.hash, { r, x, h: hx, k: hx % r, k1: (hx % r) + 1 }),
        arch: archOf(boxes, links, { boxes: { [1 + m + (hx % r)]: "compare" }, links: Object.fromEntries(range(m).filter((i) => pairs[i].includes(x)).map((i) => [shuffleLink(i, hx % r), "compare" as Role])) }),
        rows: [...mapRows(mapped, -1), ...redRows(reduced, -1)],
      });
      for (let k = 0; k < r; k++) {
        reduced[k] = 1;
        const from = range(m).filter((i) => pairs[i].some((y) => reducerOf(y) === k));
        frames.push({
          note: grouped[k].length ? fill(w.group, { i: k + 1, n: grouped[k].length }) : fill(w.none, { i: k + 1 }),
          arch: archOf(boxes, links, { boxes: { [1 + m + k]: "key" }, links: Object.fromEntries(from.map((i) => [shuffleLink(i, k), "key" as Role])) }),
          rows: [...mapRows(mapped, -1), ...redRows(reduced, k)],
        });
      }
      for (let k = 0; k < r; k++) {
        if (!grouped[k].length) continue;
        reduced[k] = 2;
        frames.push({
          note: fill(w.reduce, { i: k + 1, list: grouped[k].map(([y, c]) => `${y} ${c}`).join(", ") }),
          arch: archOf(boxes, links, { boxes: { [1 + m + k]: "sorted", [1 + m + r]: "sorted" }, links: { [outLink(k)]: "sorted" } }),
          rows: [...mapRows(mapped, -1), ...redRows(reduced, k)],
        });
      }
      const all = grouped.flat().sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return done(frames, fill(w.answer, { list: all.map(([y, c]) => `${y} ${c}`).join(", ") }));
    },
  },

  securityHttps: {
    level: 0,
    example: ["23", "5", "6", "15", "HELLO"],
    solve: ([ps, gs, as, bs, msg], w, e) => {
      const p = int(ps, e, 5, 997);
      if (!isPrime(p)) throw new Error(fill(w.notPrime, { s: p }));
      const g = int(gs, e, 2, p - 2);
      const a = int(as, e, 2, p - 2);
      const b = int(bs, e, 2, p - 2);
      const plain = text(msg, e, 12).toUpperCase();
      if (!/^[A-Z ]+$/.test(plain)) throw new Error(w.badMessage);
      const A = modPow(g, a, p);
      const B = modPow(g, b, p);
      const K = modPow(B, a, p);
      const s = K % 26;
      const secret = shift(plain, s);
      const pow = (x: number, y: number, v: number) => `${x}${sup(y)} mod ${p} = ${v}`;

      const boxes: ArchBox[] = [
        { label: w.box.client, col: 0, row: 0, kind: "client" },
        { label: w.box.server, col: 2, row: 0, kind: "server" },
        { label: w.box.eve, col: 1, row: 1, kind: "client" },
        { label: w.box.ca, col: 3, row: 0, kind: "service" },
      ];
      const arch = (label: string, role: Role, lit: Record<number, Role> = {}, ca = false) =>
        archOf(boxes, [{ a: 0, b: 1, label, both: true }, { a: 3, b: 1, label: w.link.signs, dashed: true }], { boxes: lit, links: ca ? { 0: role, 1: "key" } : { 0: role } });
      const known = { client: [] as string[], server: [] as string[], eve: [] as string[] };
      const rows = () => [row(w.knows.client, known.client), row(w.knows.server, known.server), row(w.knows.eve, known.eve, () => "min")];
      const frames: Frame[] = [];
      frames.push({ note: w.hello, arch: arch(w.link.hello, "compare", { 0: "key" }), rows: rows() });
      frames.push({ note: w.cert, arch: arch(w.link.cert, "compare", { 1: "key", 3: "key" }, true), rows: rows() });
      for (const list of [known.client, known.server, known.eve]) list.push(`p = ${p}`, `g = ${g}`);
      frames.push({ note: fill(w.public, { p, g }), arch: arch(`p, g`, "compare", { 2: "min" }), rows: rows() });
      known.client.push(`a = ${a}`);
      for (const list of [known.client, known.server, known.eve]) list.push(`A = ${A}`);
      frames.push({ note: fill(w.clientHalf, { a, x: pow(g, a, A) }), arch: arch(`A = ${A}`, "compare", { 0: "key", 2: "min" }), rows: rows() });
      known.server.push(`b = ${b}`);
      for (const list of [known.client, known.server, known.eve]) list.push(`B = ${B}`);
      frames.push({ note: fill(w.serverHalf, { b, x: pow(g, b, B) }), arch: arch(`B = ${B}`, "compare", { 1: "key", 2: "min" }), rows: rows() });
      known.client.push(`K = ${K}`);
      frames.push({ note: fill(w.clientKey, { x: pow(B, a, K) }), arch: arch("", "plain", { 0: "sorted" }), rows: rows() });
      known.server.push(`K = ${K}`);
      frames.push({ note: fill(w.serverKey, { x: pow(A, b, K) }), arch: arch("", "plain", { 0: "sorted", 1: "sorted" }), rows: rows() });
      frames.push({ note: fill(w.eve, { p, g, A, B }), arch: arch("", "plain", { 2: "min" }), rows: rows() });
      const letters = [...plain];
      const view = (role: Role) => ({ cells: cells(letters, () => role), rows: [...rows(), row(w.cipher, [...secret], () => "key")] });
      frames.push({ note: fill(w.encrypt, { k: K, s, m: plain, c: secret }), arch: arch(w.link.data, "key", { 0: "key" }), ...view("plain") });
      frames.push({ note: fill(w.decrypt, { s, m: plain, c: secret }), arch: arch(w.link.data, "sorted", { 1: "sorted" }), ...view("sorted") });
      return done(frames, fill(w.answer, { k: K, m: plain, c: secret }));
    },
  },

  apiDesign: {
    level: 0,
    example: ["books", "8", "3", "1"],
    solve: ([rs, ns, ks, as], w, e) => {
      const r = text(rs, e, 12).toLowerCase();
      if (!/^[a-z][a-z_-]*$/.test(r)) throw new Error(fill(w.badName, { s: rs.trim() }));
      const n = int(ns, e, 1, 13);
      const k = int(ks, e, 1, 6);
      const after = int(as, e, 0, 13);
      if (Math.ceil((n + 1) / k) > 8) throw new Error(fill(w.tooManyPages, { n: 8 }));

      const boxes: ArchBox[] = [
        { label: w.client, col: 0, row: 0, kind: "client" },
        { label: w.api, col: 1, row: 0, kind: "server" },
        { label: w.db, col: 2, row: 0, kind: "db" },
      ];
      const methods = ["GET", "GET", "POST", "PATCH", "DELETE"];
      const paths = [`/${r}`, `/${r}/:id`, `/${r}`, `/${r}/:id`, `/${r}/:id`];
      const frames: Frame[] = [];
      for (let i = 0; i < 5; i++)
        frames.push({
          note: fill(w.endpoint[i], { r }),
          mat: {
            vals: methods.map((m, j) => [m, paths[j], w.status[j]]),
            roles: methods.map((_, j): Role[] => (j === i ? ["key", "key", "key"] : j < i ? ["sorted", "sorted", "sorted"] : ["plain", "plain", "plain"])),
            rowHeads: [...w.does],
            colHeads: [...w.cols],
          },
          arch: archOf(boxes, [{ a: 0, b: 1, label: methods[i], both: true }, { a: 1, b: 2, both: true }], { links: { 0: "key", 1: "key" }, boxes: { 1: "key" } }),
        });

      /** Pages through the list by offset or by cursor, a new item arriving after page `after`. */
      const page = (cursor: boolean) => {
        let list = range(n).map((i) => n - i);
        const seen = new Set<number>();
        const pages: number[][] = [];
        const twice: number[] = [];
        let offset = 0;
        let last: number | null = null;
        let added = -1;
        frames.push({ note: cursor ? w.cursorStart : w.offsetStart, cells: cells(list), rows: [] });
        const pageRows = () => pages.map((pg, i) => row(fill(w.pageRow, { k: i + 1 }), pg, (j) => (pages.slice(0, i).some((q) => q.includes(pg[j])) ? "min" : "plain")));
        for (;;) {
          const start = cursor ? (last === null ? 0 : list.indexOf(last) + 1) : offset;
          const items = list.slice(start, start + k);
          const more = start + k < list.length;
          const q = cursor ? (last === null ? `/${r}?limit=${k}` : `/${r}?limit=${k}&after=${last}`) : `/${r}?limit=${k}&offset=${offset}`;
          const again = items.filter((x) => seen.has(x));
          twice.push(...again);
          pages.push(items);
          const ptr: Record<string, number> | undefined = cursor ? (last === null ? undefined : { after: list.indexOf(last) }) : { offset: Math.min(offset, list.length - 1) };
          for (const x of items) seen.add(x);
          const listText2 = items.join(", ");
          const note = cursor
            ? more
              ? fill(w.cursorPage, { q, list: listText2, c: items[items.length - 1] })
              : fill(w.cursorLast, { q, list: listText2 })
            : again.length
              ? fill(w.offsetDup, { q, list: listText2, d: again.join(", ") })
              : fill(w.offsetPage, { q, list: listText2 });
          frames.push({
            note,
            cells: cells(list, (j) => (j >= start && j < start + k ? (again.includes(list[j]) ? "min" : "key") : list[j] === added ? "pivot" : seen.has(list[j]) ? "idle" : "plain"), ptr),
            rows: pageRows(),
          });
          last = items[items.length - 1];
          offset += k;
          if (!more) break;
          if (pages.length === after) {
            added = n + 1;
            list = [added, ...list];
            frames.push({
              note: fill(cursor ? w.cursorAdded : w.added, { x: added }),
              cells: cells(list, (j) => (j === 0 ? "pivot" : seen.has(list[j]) ? "idle" : "plain")),
              rows: pageRows(),
            });
          }
        }
        return { pages, twice };
      };
      const off = page(false);
      const cur = page(true);
      const text2 = (pages: number[][]) => pages.map((pg) => listText(pg)).join(", ");
      return done(frames, fill(w.answer, { o: text2(off.pages), d: off.twice.length ? fill(w.twice, { list: off.twice.join(", ") }) : "", c: text2(cur.pages) }));
    },
  },
};
