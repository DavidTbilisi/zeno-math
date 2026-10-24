// The distributed-systems fundamentals give the right numbers: on their examples, on cases picked to reach every
// branch (sync replication, a stuck election, a valid config rollout, the other rate limiters, a lost ack while
// catching up), and on random inputs checked against simple models written here another way; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { wordHash } from "../src/math/problems/sysDist.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const frames = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).frames;
const pick = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const fmt = (x: number) => String(Math.round(x * 100) / 100);

test("replication and sharding", () => {
  assert.equal(answer("replicationSharding", "3", "range", "12, 71, 45, 88, 67, 93, 70, 5, 81, 76", "async", "3"), "Keys per shard: S1 2, S2 1, S3 7. Writes lost when S3's leader failed: 2 (81, 76).");
  assert.equal(answer("replicationSharding", "3", "hash", "1, 2, 3, 4, 5, 6", "sync", "1"), "Keys per shard: S1 2, S2 2, S3 2. Writes lost when S1's leader failed: 0.");
  // The last two writes went elsewhere: async loses nothing this time.
  assert.equal(answer("replicationSharding", "2", "range", "10, 20, 60, 70", "async", "1"), "Keys per shard: S1 2, S2 2. Writes lost when S1's leader failed: 0.");
  assert.equal(answer("replicationSharding", "2", "RANGE", "10, 20, 60, 70", "Async", "2"), "Keys per shard: S1 2, S2 2. Writes lost when S2's leader failed: 2 (60, 70).");
  const r = rng(11);
  for (let k = 0; k < 150; k++) {
    const n = pick(r, 2, 4);
    const mode = r() < 0.5 ? "range" : "hash";
    const sync = r() < 0.3;
    const keys = [...new Set(Array.from({ length: pick(r, 1, 12) }, () => pick(r, 0, 99)))];
    const fail = pick(r, 1, n);
    // Range: shard i owns [round(100i/n), round(100(i+1)/n)).
    const shard = (x: number) => (mode === "hash" ? x % n : [...Array(n).keys()].filter((i) => x >= Math.round((100 * i) / n)).pop()!);
    const counts = [...Array(n).keys()].map((i) => keys.filter((x) => shard(x) === i).length);
    const lost = sync ? [] : keys.slice(-2).filter((x) => shard(x) === fail - 1);
    const want = `Keys per shard: ${counts.map((c, i) => `S${i + 1} ${c}`).join(", ")}. Writes lost when S${fail}'s leader failed: ${lost.length ? `${lost.length} (${lost.join(", ")})` : "0"}.`;
    assert.equal(answer("replicationSharding", String(n), mode, keys.join(", "), sync ? "sync" : "async", String(fail)), want, `${n} ${mode} ${keys} ${sync} ${fail}`);
  }
  assert.throws(() => answer("replicationSharding", "3", "modulo", "1", "sync", "1"), /isn't|doesn't fit/);
  assert.throws(() => answer("replicationSharding", "3", "range", "1, 100", "sync", "1"), /at most 99/);
  assert.throws(() => answer("replicationSharding", "3", "range", "4, 4", "sync", "1"), /twice/);
  assert.throws(() => answer("replicationSharding", "3", "range", "4", "sync", "4"), /from 1 to 3/);
  assert.throws(() => answer("replicationSharding", "5", "range", "4", "sync", "1"), /from 2 to 4/);
});

/** Raft as a millisecond clock: elections, then the crash, then the heartbeats, at every tick. */
function raft(T: number[], h: number, crashes: number[]) {
  const n = T.length;
  const need = Math.floor(n / 2) + 1;
  const alive = T.map(() => true);
  const deadline = [...T];
  let leader = -1;
  let since = 0;
  let term = 0;
  const leaders: string[] = [];
  for (let t = 0; t <= 30000; t++) {
    if (leader < 0) {
      const due = T.map((_, i) => i).filter((i) => alive[i] && deadline[i] === t);
      if (due.length) {
        const c = due[0];
        term++;
        const votes = alive.filter(Boolean).length;
        if (votes < need) return { leaders, stuck: true, up: votes };
        leader = c;
        since = t;
        leaders.push(`${String.fromCharCode(65 + c)} for term ${term} (from ${t} ms)`);
        T.forEach((x, i) => (deadline[i] = t + x));
      }
    }
    if (crashes.includes(t) && leader >= 0) {
      alive[leader] = false;
      leader = -1;
    } else if (leader >= 0 && t > since && (t - since) % h === 0) T.forEach((x, i) => (deadline[i] = t + x));
  }
  return { leaders, stuck: false, up: 0 };
}

test("leader election", () => {
  assert.equal(answer("leaderElection", "150, 300, 220, 270, 190", "50", "600, 1100"), "Leaders: A for term 1 (from 150 ms), E for term 2 (from 740 ms), C for term 3 (from 1310 ms).");
  assert.equal(answer("leaderElection", "100, 200, 300", "50", "500, 900"), "Leaders: A for term 1 (from 100 ms), B for term 2 (from 650 ms). Then only 1 of the 3 nodes were up, too few for a majority: no leader after that.");
  // A crash before anyone leads hits nobody.
  assert.equal(answer("leaderElection", "300, 400, 500", "50", "100"), "Leaders: A for term 1 (from 300 ms).");
  // A tie goes to the first node.
  assert.equal(answer("leaderElection", "200, 200, 300", "40", "1000"), "Leaders: A for term 1 (from 200 ms), B for term 2 (from 1160 ms).");
  const r = rng(12);
  for (let k = 0; k < 80; k++) {
    const T = Array.from({ length: pick(r, 3, 7) }, () => pick(r, 100, 600));
    const h = pick(r, 10, Math.min(...T) - 1);
    const crashes = [...new Set(Array.from({ length: pick(r, 1, 3) }, () => pick(r, 0, 4000)))].sort((a, b) => a - b);
    const ref = raft(T, h, crashes);
    const list = ref.leaders.join(", ");
    const want = ref.stuck ? `Leaders: ${list}. Then only ${ref.up} of the ${T.length} nodes were up, too few for a majority: no leader after that.` : `Leaders: ${list}.`;
    assert.equal(answer("leaderElection", T.join(", "), String(h), crashes.join(", ")), want, `${T} / ${h} / ${crashes}`);
  }
  assert.throws(() => answer("leaderElection", "150, 300", "50", "600"), /At least 3/);
  assert.throws(() => answer("leaderElection", "150, 300, 220", "200", "600"), /more often than the shortest timeout \(150 ms\)/);
  assert.throws(() => answer("leaderElection", "150, 30, 220", "20", "600"), /from 50 to 2000/);
});

test("peer to peer", () => {
  assert.equal(answer("peerToPeer", "4", "6"), "From the server alone: 24 rounds; peer to peer: 6 rounds.");
  assert.equal(answer("peerToPeer", "2", "2"), "From the server alone: 4 rounds; peer to peer: 3 rounds.");
  for (let c = 2; c <= 8; c++)
    for (let n = 2; n <= 8; n++) {
      const fs = frames("peerToPeer", String(c), String(n));
      const rounds = Number(fs[fs.length - 1].note.match(/peer to peer: (\d+) rounds/)![1]);
      // The server sends each chunk out at least once, and every machine takes a chunk a round at most.
      assert.ok(rounds >= c && rounds < n * c, `${c} ${n}: ${rounds}`);
      // Each round: every receiver takes one chunk at most, and every sender had the chunk before the round.
      const p2p = fs.slice(n + 3, -2);
      assert.equal(p2p.length, rounds);
      for (const [k, f] of p2p.entries()) {
        const before = fs[n + 2 + k].mat!.vals;
        const moves = f.rows![0].vals.map((v) => String(v).match(/^(S|P(\d+))→P(\d+) #(\d+)$/)!);
        const to = moves.map((m) => m[3]);
        assert.equal(new Set(to).size, to.length, `${c} ${n} round ${k + 1}`);
        for (const m of moves) {
          if (m[2]) assert.equal(before[Number(m[2]) - 1][Number(m[4]) - 1], "✓");
          assert.equal(before[Number(m[3]) - 1][Number(m[4]) - 1], "·");
        }
      }
      assert.ok(fs[fs.length - 1].mat!.vals.every((row) => row.every((v) => v === "✓")));
    }
  assert.throws(() => answer("peerToPeer", "1", "6"), /from 2 to 8/);
  assert.throws(() => answer("peerToPeer", "4", "9"), /from 2 to 8/);
});

test("polling and streaming", () => {
  assert.equal(answer("pollingStreaming", "3, 4, 11, 27, 28.5", "5", "60"), "Polling every 5 s: 2.3 s average delay, 12 requests; long polling: no delay, 7 requests; streaming: no delay, 1 connection.");
  assert.equal(answer("pollingStreaming", "1, 2, 3", "2", "10"), "Polling every 2 s: 0.67 s average delay, 5 requests; long polling: no delay, 4 requests; streaming: no delay, 1 connection.");
  // Two messages at once come back on one long poll; a message as the watch ends needs no new request.
  assert.equal(answer("pollingStreaming", "5, 5, 20", "10", "20"), "Polling every 10 s: 3.33 s average delay, 2 requests; long polling: no delay, 2 requests; streaming: no delay, 1 connection.");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const W = pick(r, 10, 120);
    const p = pick(r, Math.ceil(W / 40), 30);
    const msgs = Array.from({ length: pick(r, 1, 8) }, () => pick(r, 1, W)).sort((a, b) => a - b);
    // Polling: count the polls in (0, W], and walk forward from each message to its poll.
    let polls = 0;
    for (let t = p; t - p < W; t += p) polls++;
    const delay = msgs.reduce((s, m) => {
      let t = p;
      while (t < m) t += p;
      return s + t - m;
    }, 0) / msgs.length;
    // Long polling: a second at a time, a request answered by a message or after 30 s.
    let requests = 1;
    let open = 0;
    for (let t = 1; t < W; t++) {
      if (msgs.includes(t) || t - open === 30) (requests++, (open = t));
    }
    const want = `Polling every ${p} s: ${fmt(delay)} s average delay, ${polls} requests; long polling: no delay, ${requests} requests; streaming: no delay, 1 connection.`;
    assert.equal(answer("pollingStreaming", msgs.join(", "), String(p), String(W)), want, `${msgs} / ${p} / ${W}`);
  }
  assert.throws(() => answer("pollingStreaming", "3, 70", "5", "60"), /after the watch ends at 60 s/);
  assert.throws(() => answer("pollingStreaming", "3", "0", "60"), /from 0.5 to 30/);
  assert.throws(() => answer("pollingStreaming", "0, 3", "5", "60"), /too small/);
  assert.throws(() => answer("pollingStreaming", "3", "1", "60"), /At most 40 polls/);
});

test("configuration", () => {
  assert.equal(answer("configuration", "40", "5, 25, 100", "10", "invalid"), "Static config: 2 servers got the bad value, and undoing it took until 44 min; dynamic config: 2 servers got it, rolled back at 10 min.");
  assert.equal(answer("configuration", "40", "5, 25, 100", "10", "valid"), "Static config: all 40 servers had the change after 26 min; dynamic config: all 40 after 20 min.");
  assert.equal(answer("configuration", "7", "50, 100", "15", "INVALID"), "Static config: 4 servers got the bad value, and undoing it took until 44 min; dynamic config: 4 servers got it, rolled back at 15 min.");
  assert.equal(answer("configuration", "1", "100", "5", "valid"), "Static config: all 1 servers had the change after 22 min; dynamic config: all 1 after 0 min.");
  const r = rng(14);
  for (let k = 0; k < 100; k++) {
    const n = pick(r, 1, 500);
    const stages = [...new Set([...Array.from({ length: pick(r, 0, 4) }, () => pick(r, 1, 99)), 100])].sort((a, b) => a - b);
    const wait = pick(r, 1, 60);
    const bad = r() < 0.5;
    const canary = Math.max(1, Math.ceil((stages[0] * n) / 100));
    const want = bad
      ? `Static config: ${canary} servers got the bad value, and undoing it took until 44 min; dynamic config: ${canary} servers got it, rolled back at ${wait} min.`
      : `Static config: all ${n} servers had the change after ${20 + 2 * stages.length} min; dynamic config: all ${n} after ${(stages.length - 1) * wait} min.`;
    assert.equal(answer("configuration", String(n), stages.join(", "), String(wait), bad ? "invalid" : "valid"), want);
  }
  assert.throws(() => answer("configuration", "40", "50, 40, 100", "10", "valid"), /grow and end at 100%/);
  assert.throws(() => answer("configuration", "40", "10, 90", "10", "valid"), /grow and end at 100%/);
  assert.throws(() => answer("configuration", "40", "10, 100", "10", "maybe"), /valid, invalid/);
});

test("rate limiting", () => {
  const times = "2, 7, 8, 9, 9.5, 10, 10.5, 11, 12, 18";
  assert.equal(answer("rateLimiting", times, "3", "10", "fixed"), "6 allowed and 4 rejected.");
  assert.equal(answer("rateLimiting", times, "3", "10", "sliding"), "5 allowed and 5 rejected.");
  assert.equal(answer("rateLimiting", times, "3", "10", "token"), "6 allowed and 4 rejected.");
  assert.equal(answer("rateLimiting", "5", "1", "1", "Sliding"), "1 allowed and 0 rejected.");
  const r = rng(15);
  for (let k = 0; k < 200; k++) {
    const ts = Array.from({ length: pick(r, 1, 16) }, () => pick(r, 0, 40)).sort((a, b) => a - b);
    const L = pick(r, 1, 5);
    const W = pick(r, 1, 15);
    // Fixed window: counts per window. Sliding log: allowed ones in (t − W, t]. Token bucket: in W-ths of a token.
    const fixed = new Map<number, number>();
    const slid: number[] = [];
    let bucket = L * W;
    let last = 0;
    const ok = { fixed: 0, sliding: 0, token: 0 };
    for (const t of ts) {
      const win = Math.floor(t / W);
      if ((fixed.get(win) ?? 0) < L) fixed.set(win, (fixed.get(win) ?? 0) + 1), ok.fixed++;
      if (slid.filter((x) => x > t - W).length < L) slid.push(t), ok.sliding++;
      bucket = Math.min(L * W, bucket + (t - last) * L);
      last = t;
      if (bucket >= W) (bucket -= W), ok.token++;
    }
    for (const algo of ["fixed", "sliding", "token"] as const)
      assert.equal(answer("rateLimiting", ts.join(", "), String(L), String(W), algo), `${ok[algo]} allowed and ${ts.length - ok[algo]} rejected.`, `${algo}: ${ts} / ${L} per ${W}`);
  }
  assert.throws(() => answer("rateLimiting", times, "3", "10", "leaky"), /isn't an algorithm here: write one of fixed, sliding, token/);
  assert.throws(() => answer("rateLimiting", times, "0", "10", "fixed"), /from 1 to 10/);
  assert.throws(() => answer("rateLimiting", "1, x", "3", "10", "fixed"), /isn't a number/);
});

test("logging and monitoring", () => {
  const lat = "120, 95, 180, 110, 140, 130, 620!, 105, 900!, 150, 115, 125, 98, 135, 160";
  assert.equal(
    answer("loggingMonitoring", lat, "5", "p99 > 500"),
    "Window 1: p50 120, p95 180, p99 180 ms, 0% errors; Window 2: p50 150, p95 900, p99 900 ms, 40% errors; Window 3: p50 125, p95 160, p99 160 ms, 0% errors. The alert fired at window 2, resolved at window 3.",
  );
  assert.match(answer("loggingMonitoring", lat, "5", "errors > 40%"), /The alert never fired\.$/);
  assert.match(answer("loggingMonitoring", lat, "5", "Errors > 30%"), /The alert fired at window 2, resolved at window 3\.$/);
  assert.match(answer("loggingMonitoring", "100, 200, 300, 400", "4", "p50 > 100"), /^Window 1: p50 200, p95 400, p99 400 ms, 0% errors\. The alert fired at window 1\.$/);
  const r = rng(16);
  for (let k = 0; k < 150; k++) {
    const reqs = Array.from({ length: pick(r, 1, 20) }, () => ({ ms: pick(r, 1, 1000), err: r() < 0.2 }));
    const size = pick(r, Math.max(2, Math.ceil(reqs.length / 8)), 10);
    const metric = ["p50", "p95", "p99", "errors"][pick(r, 0, 3)];
    const limit = metric === "errors" ? pick(r, 0, 60) : pick(r, 100, 900);
    const items: string[] = [];
    const events: string[] = [];
    let on = false;
    for (let s = 0, k2 = 1; s < reqs.length; s += size, k2++) {
      const win = reqs.slice(s, s + size);
      const sorted = win.map((x) => x.ms).sort((a, b) => a - b);
      // Nearest rank: the smallest value with at least p% of the window at or below it.
      const pc = (p: number) => sorted.find((_, i) => (i + 1) * 100 >= p * sorted.length)!;
      const errs = (100 * win.filter((x) => x.err).length) / win.length;
      items.push(`Window ${k2}: p50 ${pc(50)}, p95 ${pc(95)}, p99 ${pc(99)} ms, ${fmt(errs)}% errors`);
      const v = metric === "errors" ? errs : pc(Number(metric.slice(1)));
      if (v > limit && !on) events.push(`fired at window ${k2}`);
      if (v <= limit && on) events.push(`resolved at window ${k2}`);
      on = v > limit;
    }
    const rule = `${metric} > ${limit}${metric === "errors" ? "%" : ""}`;
    const text = reqs.map((x) => `${x.ms}${x.err ? "!" : ""}`).join(", ");
    assert.equal(answer("loggingMonitoring", text, String(size), rule), `${items.join("; ")}. The alert ${events.length ? events.join(", ") : "never fired"}.`, `${text} / ${size} / ${rule}`);
  }
  assert.throws(() => answer("loggingMonitoring", lat, "5", "p90 > 3"), /isn't a rule/);
  assert.throws(() => answer("loggingMonitoring", lat, "5", "p99 < 3"), /isn't a rule/);
  assert.throws(() => answer("loggingMonitoring", "1, 2, fast", "5", "p99 > 3"), /“fast” isn't a number/);
  assert.throws(() => answer("loggingMonitoring", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18", "2", "p99 > 3"), /At most 8 windows/);
});

test("publish/subscribe", () => {
  const subs = "orders: billing, email; news: email, app";
  assert.equal(answer("pubSub", subs, "orders, news, orders, orders, news", "email 2-3", "billing 4"), "billing: O1, O2, O3, O3 (O3 twice); email: O1, N1, O2, O3, N2; app: N1, N2.");
  assert.equal(answer("pubSub", "a: x, y", "a, a", "none", "-"), "x: A1, A2; y: A1, A2.");
  // A lost ack while catching up holds back the rest, so the order is kept.
  assert.equal(answer("pubSub", "orders: billing", "orders, orders, orders", "billing 1-2", "billing 1"), "billing: O1, O1, O2, O3 (O1 twice).");
  // Offline to the end: the messages wait, nothing is delivered.
  assert.equal(answer("pubSub", "news: app, web", "news, news", "app 1-2", "none"), "app: N1, N2; web: N1, N2.");
  assert.equal(answer("pubSub", "news: app; nine: web", "news, nine", "app 1", "none"), "app: Ne1; web: Ni1.");
  assert.equal(answer("pubSub", subs, "news", "none", "none"), "billing: nothing; email: N1; app: N1.");
  assert.throws(() => answer("pubSub", "orders billing", "orders", "none", "none"), /isn't a subscription/);
  assert.throws(() => answer("pubSub", subs, "orders, sports", "none", "none"), /no topic “sports”: the topics are orders, news/);
  assert.throws(() => answer("pubSub", subs, "orders", "bob 1-1", "none"), /no subscriber “bob”/);
  assert.throws(() => answer("pubSub", subs, "orders", "email 1-3", "none"), /from 1 to 1/);
  assert.throws(() => answer("pubSub", subs, "orders, news", "none", "billing 2"), /billing doesn't subscribe to news/);
  assert.throws(() => answer("pubSub", subs, "orders", "none", "billing"), /doesn't fit/);
});

test("map reduce", () => {
  assert.equal(answer("mapReduce", "the cat sat; the dog sat on the mat; a cat and a dog", "2", "2"), "The counts: a 2, and 1, cat 2, dog 2, mat 1, on 1, sat 2, the 3.");
  assert.equal(answer("mapReduce", "To be, or not to be!", "1", "3"), "The counts: be 2, not 1, or 1, to 2.");
  assert.equal(wordHash("cat"), 99 + 97 + 116);
  const vocab = ["a", "b", "ab", "cat", "dog", "sun", "moon", "x", "zebra"];
  const r = rng(17);
  for (let k = 0; k < 150; k++) {
    const lines = Array.from({ length: pick(r, 1, 6) }, () => Array.from({ length: pick(r, 1, 5) }, () => vocab[pick(r, 0, vocab.length - 1)]).join(" "));
    const m = pick(r, 1, 4);
    const red = pick(r, 1, 4);
    const counts = new Map<string, number>();
    for (const x of lines.join(" ").split(" ")) counts.set(x, (counts.get(x) ?? 0) + 1);
    const want = [...counts.keys()].sort().map((x) => `${x} ${counts.get(x)}`).join(", ");
    const fs = frames("mapReduce", lines.join("; "), String(m), String(red));
    assert.equal(fs[fs.length - 1].note, `The counts: ${want}.`);
    // Every word ends up in the reducer its hash picks, and only there.
    const last = fs[fs.length - 1].rows!.slice(m);
    for (const x of counts.keys()) last.forEach((row, i) => assert.equal(row.vals.includes(`${x} ${counts.get(x)}`), wordHash(x) % red === i, `${x} @ R${i + 1}`));
  }
  assert.throws(() => answer("mapReduce", "a; b; c; d; e; f; g", "2", "2"), /At most 6/);
  assert.throws(() => answer("mapReduce", "a b", "0", "2"), /from 1 to 4/);
  assert.throws(() => answer("mapReduce", "a b; !!!", "1", "2"), /doesn't fit/);
});

test("security and HTTPS", () => {
  assert.equal(answer("securityHttps", "23", "5", "6", "15", "HELLO"), "The shared key is 2: “HELLO” went over the network as “JGNNQ”.");
  assert.equal(answer("securityHttps", "29", "2", "3", "5", "zip it"), "The shared key is 27: “ZIP IT” went over the network as “AJQ JU”.");
  const primes = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 997];
  const r = rng(18);
  for (let k = 0; k < 200; k++) {
    const p = primes[pick(r, 0, primes.length - 1)];
    const [g, a, b] = [pick(r, 2, p - 2), pick(r, 2, p - 2), pick(r, 2, p - 2)];
    // Powers by repeated multiplication; both sides must reach the same key.
    const pow = (x: number, e: number) => Array.from({ length: e }).reduce((acc: number) => (acc * x) % p, 1);
    const key = pow(pow(g, b), a);
    assert.equal(pow(pow(g, a), b), key);
    const shifted = "ABC XYZ".replace(/[A-Z]/g, (ch) => String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + key) % 26)));
    assert.equal(answer("securityHttps", String(p), String(g), String(a), String(b), "abc xyz"), `The shared key is ${key}: “ABC XYZ” went over the network as “${shifted}”.`);
  }
  assert.throws(() => answer("securityHttps", "21", "5", "6", "15", "HI"), /21 isn't a prime/);
  assert.throws(() => answer("securityHttps", "23", "1", "6", "15", "HI"), /from 2 to 21/);
  assert.throws(() => answer("securityHttps", "23", "5", "22", "15", "HI"), /from 2 to 21/);
  assert.throws(() => answer("securityHttps", "23", "5", "6", "15", "héllo"), /Latin letters/);
});

test("API design", () => {
  assert.equal(answer("apiDesign", "books", "8", "3", "1"), "Offset pages: [8, 7, 6], [6, 5, 4], [3, 2, 1] (6 came twice); cursor pages: [8, 7, 6], [5, 4, 3], [2, 1].");
  assert.equal(answer("apiDesign", "Users", "5", "2", "0"), "Offset pages: [5, 4], [3, 2], [1]; cursor pages: [5, 4], [3, 2], [1].");
  // Added after the last page: nobody asks again, so nothing shifts.
  assert.equal(answer("apiDesign", "posts", "4", "2", "2"), "Offset pages: [4, 3], [2, 1]; cursor pages: [4, 3], [2, 1].");
  const r = rng(19);
  for (let k = 0; k < 150; k++) {
    const n = pick(r, 1, 13);
    const size = pick(r, Math.max(1, Math.ceil((n + 1) / 8)), 6);
    const after = pick(r, 0, 5);
    const run = (cursor: boolean) => {
      let list = Array.from({ length: n }, (_, i) => n - i);
      const pages: number[][] = [];
      let from = 0;
      for (;;) {
        const page = list.slice(from, from + size);
        pages.push(page);
        if (from + size >= list.length) break;
        from = cursor ? list.indexOf(page[page.length - 1]) + 1 : from + size;
        if (pages.length === after) {
          list = [n + 1, ...list];
          if (cursor) from++;
        }
      }
      return pages;
    };
    const off = run(false);
    const cur = run(true);
    const seen = off.flat();
    const twice = seen.filter((x, i) => seen.indexOf(x) !== i);
    const text = (pages: number[][]) => pages.map((pg) => `[${pg.join(", ")}]`).join(", ");
    assert.equal(answer("apiDesign", "items", String(n), String(size), String(after)), `Offset pages: ${text(off)}${twice.length ? ` (${twice.join(", ")} came twice)` : ""}; cursor pages: ${text(cur)}.`, `${n} / ${size} / ${after}`);
    assert.equal(new Set(cur.flat()).size, cur.flat().length);
  }
  assert.throws(() => answer("apiDesign", "b00ks!", "8", "3", "1"), /one word in Latin letters/);
  assert.throws(() => answer("apiDesign", "books", "0", "3", "1"), /from 1 to 13/);
  assert.throws(() => answer("apiDesign", "books", "13", "1", "1"), /At most 8 pages/);
});
