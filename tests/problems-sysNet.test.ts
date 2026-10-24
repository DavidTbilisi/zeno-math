// The system design fundamentals on networks, storage and spreading load give the right numbers: on their examples, on
// cases worked out by hand, and on random inputs checked against a plain model of each written here (a hash done with
// big integers, intervals counted tick by tick, a map with expiry times, points filtered one by one); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { avail } from "../src/math/problems/sysNet.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const trace = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w);
const answer = (id: ProblemId, ...input: string[]) => trace(id, ...input).answer;
const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** FNV-1a, 32 bits, worked out with big integers rather than the solver's 32-bit multiply. */
function fnv(s: string): number {
  let h = 2166136261n;
  for (const b of Buffer.from(s, "utf8")) h = ((h ^ BigInt(b)) * 16777619n) % 4294967296n;
  return Number(h);
}
/** "624 ms", "1.83 days" … back to seconds. */
function seconds(s: string): number {
  const m = s.match(/^([\d.]+) (µs|ms|s|min|h|days)$/);
  assert.ok(m, s);
  return Number(m[1]) * { µs: 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, days: 86_400 }[m[2] as "s"];
}

test("client–server: a page fetched in round trips", () => {
  assert.equal(answer("clientServer", "https://zeno.example", "/, /lessons/7, /style.css", "40"), "Fetched /, /lessons/7, /style.css from zeno.example (203.0.113.70:443) in 6 round trips: 240 ms at 40 ms each.");
  assert.equal(1 + (fnv("zeno.example") % 254), 70);
  // Plain HTTP on its own port: no TLS, so DNS, TCP and the one request.
  assert.equal(answer("clientServer", "http://shop.example:8080", "/cart", "20"), `Fetched /cart from shop.example (203.0.113.${1 + (fnv("shop.example") % 254)}:8080) in 3 round trips: 60 ms at 20 ms each.`);
  const r = rng(11);
  for (let k = 0; k < 60; k++) {
    const https = r() < 0.5;
    const host = `${pick(r, ["a", "news", "zeno", "my-site"])}.${pick(r, ["example", "test", "org"])}`;
    const paths = Array.from({ length: between(r, 1, 6) }, (_, i) => `/p${i}`);
    const rtt = between(r, 1, 200);
    const t = trace("clientServer", `${https ? "https" : "http"}://${host}`, paths.join(", "), String(rtt));
    const trips = 2 + (https ? 1 : 0) + paths.length;
    assert.match(t.answer, new RegExp(`\\(203\\.0\\.113\\.${1 + (fnv(host) % 254)}:${https ? 443 : 80}\\) in ${trips} round trips`), t.answer);
    assert.equal(t.frames.length, 3 + (https ? 1 : 0) + 2 * paths.length + 2);
  }
  assert.throws(() => answer("clientServer", "not an address", "/", "40"), /isn't an address/);
  assert.throws(() => answer("clientServer", "https://a.example", "home", "40"), /isn't a path/);
  assert.throws(() => answer("clientServer", "https://a.example", "/", "0"), /from 1 to 1000/);
  assert.throws(() => answer("clientServer", "https://a.example", "/1 /2 /3 /4 /5 /6 /7", "40"), /At most 6/);
});

test("network protocols: TCP resends until all arrive, UDP doesn't", () => {
  assert.equal(answer("networkProtocols", "8", "3, 6, 6", "TCP"), "TCP: all 8 segments arrived, in order; 3 resent; 4 round trips, one of them the handshake.");
  assert.equal(answer("networkProtocols", "8", "3, 6, 6", "UDP"), "UDP: 6 of 8 segments arrived; lost for good: 3, 6. Nothing resent, no round trip waited for.");
  assert.equal(answer("networkProtocols", "4", "0", "TCP"), "TCP: all 4 segments arrived, in order; 0 resent; 2 round trips, one of them the handshake.");
  assert.equal(answer("networkProtocols", "3", "none", "udp"), "UDP: all 3 segments arrived this time; nothing resent, no round trip waited for.");
  const r = rng(12);
  for (let k = 0; k < 200; k++) {
    const n = between(r, 1, 10);
    const lose = Array(n + 1).fill(0);
    const lost: number[] = [];
    for (let j = 0; j < between(r, 0, 6); j++) {
      const s = between(r, 1, n);
      if (lose[s] < 3) lose[s]++, lost.push(s);
    }
    const input = lost.length ? lost.join(", ") : "0";
    // TCP: one round for the handshake, one for the first burst, one more for each time the unluckiest segment is lost.
    const worst = Math.max(...lose);
    const tcp = trace("networkProtocols", String(n), input, "TCP");
    assert.equal(tcp.answer, `TCP: all ${n} segments arrived, in order; ${lost.length} resent; ${2 + worst} round trips, one of them the handshake.`, `${n} / ${input}`);
    const app = tcp.frames[tcp.frames.length - 1].rows!.find((x) => x.label === w.sysBasics.networkProtocols.app)!;
    assert.deepEqual(app.vals, Array.from({ length: n }, (_, i) => i + 1));
    const gone = new Set(lost).size;
    const udp = answer("networkProtocols", String(n), input, "UDP");
    assert.ok(udp.startsWith(gone ? `UDP: ${n - gone} of ${n} segments arrived; lost for good: ${[...new Set(lost)].sort((a, b) => a - b).join(", ")}.` : `UDP: all ${n} segments arrived`), udp);
  }
  assert.throws(() => answer("networkProtocols", "5", "6", "TCP"), /too big/);
  assert.throws(() => answer("networkProtocols", "5", "2, 2, 2, 2", "TCP"), /at most 3 times/);
  assert.throws(() => answer("networkProtocols", "5", "1", "SCTP"), /isn't a protocol/);
  assert.throws(() => answer("networkProtocols", "11", "1", "TCP"), /from 1 to 10/);
});

test("storage: what survives a crash", () => {
  assert.equal(answer("storage", "write a 1, write b 2, read a, crash, read a, delete a, write c 3, crash, read a, read c", "both"), "Reads: a → 1, a → 1, a → nothing, c → 3; 4.2 ms spent in all.");
  assert.equal(answer("storage", "write a 1, crash, read a", "memory"), "Reads: a → nothing; 0.2 µs spent in all.");
  assert.equal(answer("storage", "write a 1, crash, read a", "disk"), "Reads: a → 1; 1.1 ms spent in all.");
  assert.equal(answer("storage", "write a 1, delete a", "disk"), "Reads: none; 2 ms spent in all.");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const ops: string[] = [];
    for (let j = 0; j < between(r, 1, 12); j++) {
      const v = pick(r, ["write", "write", "read", "read", "delete", "crash"]);
      const key = pick(r, ["a", "b", "c"]);
      ops.push(v === "write" ? `write ${key} ${between(r, 1, 9)}` : v === "crash" ? "crash" : `${v} ${key}`);
    }
    for (const place of ["memory", "disk", "both"]) {
      // A map that a crash empties only when everything lives in memory.
      const m = new Map<string, string>();
      const reads: string[] = [];
      for (const op of ops) {
        const [v, key, val] = op.split(" ");
        if (v === "write") m.set(key, val);
        else if (v === "delete") m.delete(key);
        else if (v === "read") reads.push(`${key} → ${m.get(key) ?? "nothing"}`);
        else if (place === "memory") m.clear();
      }
      const got = answer("storage", ops.join(", "), place);
      assert.ok(got.startsWith(`Reads: ${reads.length ? reads.join(", ") : "none"};`), `${place}: ${ops.join(", ")} → ${got}`);
    }
  }
  assert.throws(() => answer("storage", "write a", "disk"), /isn't an operation/);
  assert.throws(() => answer("storage", "jump a", "disk"), /isn't an operation/);
  assert.throws(() => answer("storage", "write a 1", "cloud"), /isn't a place/);
});

test("latency and throughput: round trips plus size over bandwidth", () => {
  assert.equal(answer("latencyThroughput", "300", "100", "80", "6", "serial"), "All 6 sent one after another: 624 ms in all, 480 ms of it round trips and 144 ms sending, so latency dominates.");
  assert.equal(answer("latencyThroughput", "300", "100", "80", "6", "parallel"), "All 6 sent in parallel: 224 ms in all, 144 ms of it sending and 80 ms round trips, so bandwidth dominates.");
  assert.equal(answer("latencyThroughput", "50000", "50", "150", "2", "serial"), "All 2 sent one after another: 16.3 s in all, 16 s of it sending and 300 ms round trips, so bandwidth dominates.");
  const r = rng(14);
  for (let k = 0; k < 150; k++) {
    const [S, B, R, n] = [between(r, 1, 5000), between(r, 1, 1000), between(r, 1, 300), between(r, 1, 8)];
    const par = r() < 0.5;
    const tx = (S * 8) / B / 1000;
    const total = par ? R / 1000 + n * tx : n * (R / 1000 + tx);
    const wait = (par ? 1 : n) * (R / 1000);
    const got = answer("latencyThroughput", String(S), String(B), String(R), String(n), par ? "parallel" : "serial");
    const m = got.match(/: (.+?) in all, (.+?) of it (round trips|sending) and (.+?) (round trips|sending), so (latency|bandwidth) dominates\.$/);
    assert.ok(m, got);
    assert.ok(Math.abs(seconds(m[1]) - total) <= total * 0.006, `${got} vs ${total}`);
    assert.equal(m[6], wait >= n * tx ? "latency" : "bandwidth", got);
  }
  assert.throws(() => answer("latencyThroughput", "0", "100", "80", "6", "serial"), /from 1 to 100000/);
  assert.throws(() => answer("latencyThroughput", "300", "100", "80", "9", "serial"), /from 1 to 8/);
  assert.throws(() => answer("latencyThroughput", "300", "100", "80", "6", "sideways"), /isn't a way to send/);
});

test("availability: copies side by side, parts in series", () => {
  assert.equal(avail(0.001), "99.9%");
  assert.equal(avail(2.5e-7), "99.999975%");
  assert.equal(avail(1e-12), "99.9999999999%");
  assert.equal(avail(0.0052), "99.48%");
  assert.equal(answer("availability", "LB 99.99 x2, Web 99.9 x3, Cache 99.5, DB 99.95 x2", "99.95"), "Overall 99.5% (nines: 2): about 1.83 days down a year and 3.6 h a month — short of the 99.95% target; Cache is the weak link.");
  assert.equal(answer("availability", "A 99.9, B 99.9", "99.8"), "Overall 99.8% (nines: 2): about 17.5 h down a year and 1.44 h a month — it meets the 99.8% target.");
  assert.equal(answer("availability", "Web 99 x2", "99.9"), "Overall 99.99% (nines: 4): about 52.6 min down a year and 4.32 min a month — it meets the 99.9% target.");
  const r = rng(15);
  for (let k = 0; k < 150; k++) {
    const parts = Array.from({ length: between(r, 1, 6) }, (_, i) => ({ name: `P${i}`, a: pick(r, [90, 95, 99, 99.5, 99.9, 99.95, 99.99]), k: between(r, 1, 4) }));
    const goal = pick(r, [99, 99.9, 99.95, 99.99]);
    // Down when any part is down: 1 − Π(1 − uᵢ), by inclusion–exclusion so that tiny downtimes keep their digits.
    const u = parts.map((c) => ((100 - c.a) / 100) ** c.k);
    let down = 0;
    for (let mask = 1; mask < 1 << u.length; mask++) {
      const picked = u.filter((_, i) => mask & (1 << i));
      down += (picked.length % 2 ? 1 : -1) * picked.reduce((p, x) => p * x, 1);
    }
    const up = 1 - down;
    const got = answer("availability", parts.map((c) => `${c.name} ${c.a} x${c.k}`).join(", "), String(goal));
    const m = got.match(/^Overall ([\d.]+)% \(nines: (\d+)\): about (.+?) down a year .* — (it meets|short of)/);
    assert.ok(m, got);
    const shown = m[1].split(".")[1]?.length ?? 0;
    assert.ok(Math.abs(Number(m[1]) - up * 100) <= 0.5 * 10 ** -shown + 1e-9, `${got} vs ${up}`);
    assert.equal(Number(m[2]), Math.floor(-Math.log10(down) + 1e-6), got);
    assert.ok(Math.abs(seconds(m[3]) - down * 365 * 86_400) <= down * 365 * 86_400 * 0.006, got);
    assert.equal(m[4] === "it meets", up >= goal / 100 - 1e-12, got);
  }
  assert.throws(() => answer("availability", "Web 120", "99"), /from 50 to 99.999/);
  assert.throws(() => answer("availability", "Web 99.9 x9", "99"), /from 1 to 4/);
  assert.throws(() => answer("availability", "Web", "99"), /isn't a part/);
  assert.throws(() => answer("availability", "Web 99", "40"), /from 50/);
});

test("proxies: who sees whom, and the cache", () => {
  assert.equal(answer("proxies", "reverse", "ana /home, ben /news, cy /home, ana /about, ben /home, dan /news", "2"), "The clients saw only the proxy, 198.51.100.7; the servers handled Server 1: 2, Server 2: 1; answered from the cache: 3.");
  assert.equal(answer("proxies", "forward", "ana news.example, ben news.example, ana shop.example", "1"), "The sites saw only the proxy's address, 198.51.100.7, on every request that reached them (2), never the clients'; answered from the cache: 1.");
  const r = rng(16);
  for (let k = 0; k < 100; k++) {
    const fwd = r() < 0.5;
    const servers = between(r, 1, 4);
    const reqs = Array.from({ length: between(r, 1, 10) }, () => [pick(r, ["ana", "ben", "cy", "dan"]), pick(r, ["/a", "/b", "/c", "/d"])]);
    const t = trace("proxies", fwd ? "forward" : "reverse", reqs.map((x) => x.join(" ")).join(", "), String(servers));
    const misses = new Set(reqs.map((x) => x[1])).size;
    const hits = reqs.length - misses;
    if (fwd) assert.equal(t.answer, `The sites saw only the proxy's address, 198.51.100.7, on every request that reached them (${misses}), never the clients'; answered from the cache: ${hits}.`);
    else {
      const load = Array.from({ length: servers }, (_, j) => `Server ${j + 1}: ${Math.floor(misses / servers) + (j < misses % servers ? 1 : 0)}`);
      assert.equal(t.answer, `The clients saw only the proxy, 198.51.100.7; the servers handled ${load.join(", ")}; answered from the cache: ${hits}.`);
    }
    // No server ever sees a client as the sender: only the proxy (a reverse proxy passes the client on in a header).
    for (const f of t.frames) {
      const sees = f.rows!.find((x) => x.label === w.sysBasics.proxies.serverSees)!.vals[0] as string;
      assert.ok(sees === "—" || sees.startsWith("198.51.100.7"), sees);
    }
  }
  assert.throws(() => answer("proxies", "sideways", "ana /a", "1"), /isn't a kind of proxy/);
  assert.throws(() => answer("proxies", "reverse", "ana", "1"), /isn't a request/);
  assert.throws(() => answer("proxies", "reverse", "a /x, b /x, c /x, d /x, e /x", "1"), /At most 4 different clients/);
  assert.throws(() => answer("proxies", "reverse", "ana /a", "5"), /from 1 to 4/);
});

test("load balancers: each strategy, against counting tick by tick", () => {
  assert.equal(answer("loadBalancers", "S1 2, S2 1, S3 1", "least-connections", "ana 7, ben 6, cy 2, dan 5, eve 3, fay 4, ana 2, gus 6, ben 1"), "Requests handled, and the most open at once: S1 3 (at most 3); S2 3 (at most 2); S3 3 (at most 1).");
  assert.equal(answer("loadBalancers", "A, B", "round-robin", "x 9, y 1, z 1"), "Requests handled, and the most open at once: A 2 (at most 2); B 1 (at most 1).");
  // Weighted turns: over a whole cycle each server gets exactly its weight.
  assert.equal(answer("loadBalancers", "A 3, B 1, C 2", "weighted", Array.from({ length: 12 }, (_, i) => `c${i} 1`).join(", ")), "Requests handled, and the most open at once: A 6 (at most 1); B 2 (at most 1); C 4 (at most 1).");
  const r = rng(17);
  for (let k = 0; k < 200; k++) {
    const servers = Array.from({ length: between(r, 1, 4) }, (_, j) => ({ name: `S${j + 1}`, wt: between(r, 1, 5) }));
    const how = pick(r, ["round-robin", "weighted", "least-connections", "ip-hash"]);
    const reqs = Array.from({ length: between(r, 1, 12) }, () => ({ c: pick(r, ["ana", "ben", "cy", "dan", "eve"]), d: between(r, 1, 9) }));
    // The model: who is open at tick i is counted from the intervals [start, start + d).
    const at: number[] = [];
    const openAt = (j: number, t: number) => reqs.filter((q, i) => i < at.length && at[i] === j && i <= t && t < i + q.d).length;
    const cur = servers.map(() => 0);
    const total = servers.reduce((s, x) => s + x.wt, 0);
    reqs.forEach((q, i) => {
      let j = 0;
      if (how === "round-robin") j = i % servers.length;
      else if (how === "ip-hash") j = fnv(q.c) % servers.length;
      else if (how === "weighted") {
        servers.forEach((s, x) => (cur[x] += s.wt));
        j = cur.indexOf(Math.max(...cur));
        cur[j] -= total;
      } else {
        const load = servers.map((s, x) => openAt(x, i) / s.wt);
        j = load.indexOf(Math.min(...load));
      }
      at.push(j);
    });
    const each = servers.map((s, j) => {
      const peak = Math.max(0, ...reqs.map((_, t) => openAt(j, t)));
      return `${s.name} ${at.filter((x) => x === j).length} (at most ${peak})`;
    });
    const got = answer("loadBalancers", servers.map((s) => `${s.name} ${s.wt}`).join(", "), how, reqs.map((q) => `${q.c} ${q.d}`).join(", "));
    assert.equal(got, `Requests handled, and the most open at once: ${each.join("; ")}.`, `${how}: ${JSON.stringify(reqs)}`);
  }
  assert.throws(() => answer("loadBalancers", "S1 9", "weighted", "a 1"), /from 1 to 5/);
  assert.throws(() => answer("loadBalancers", "S1, S1", "weighted", "a 1"), /only once/);
  assert.throws(() => answer("loadBalancers", "S1", "random", "a 1"), /isn't a strategy/);
  assert.throws(() => answer("loadBalancers", "S1", "weighted", "a"), /isn't a request/);
});

test("hashing: keys moved by mod n, a ring and rendezvous", () => {
  assert.equal(answer("hashing", "n1, n2, n3", "ant, bee, cat, dog, eel, fox, gnu, hen", "add n4"), "Adding n4 moves 5 of 8 keys with mod n, 2 with consistent hashing and 2 with rendezvous hashing.");
  const place = (x: string) => fnv(x) % 360;
  const mod = (k: string, ss: string[]) => ss[place(k) % ss.length];
  const ring = (k: string, ss: string[]) => {
    const sorted = [...ss].sort((a, b) => place(a) - place(b) || (a < b ? -1 : 1));
    return sorted.find((s) => place(s) >= place(k)) ?? sorted[0];
  };
  const score = (k: string, s: string) => fnv(`${k}/${s}`) % 1000;
  const hrw = (k: string, ss: string[]) => [...ss].sort((a, b) => score(k, b) - score(k, a) || (a < b ? -1 : 1))[0];
  const r = rng(18);
  for (let k = 0; k < 200; k++) {
    const pool = ["A", "B", "C", "D", "E", "F", "n1", "n2", "db1", "x"];
    const servers = pool.filter(() => r() < 0.5).slice(0, 5);
    if (!servers.length) continue;
    const keys = ["ant", "bee", "cat", "dog", "eel", "fox", "gnu", "hen", "owl", "yak"].filter(() => r() < 0.6).slice(0, 8);
    if (!keys.length) continue;
    const add = servers.length < 2 || r() < 0.5;
    const who = add ? pool.find((s) => !servers.includes(s))! : pick(r, servers);
    const after = add ? [...servers, who] : servers.filter((s) => s !== who);
    const moved = (f: (k: string, ss: string[]) => string) => keys.filter((x) => f(x, servers) !== f(x, after)).length;
    const got = answer("hashing", servers.join(", "), keys.join(", "), `${add ? "add" : "remove"} ${who}`);
    assert.equal(got, `${add ? "Adding" : "Removing"} ${who} moves ${moved(mod)} of ${keys.length} keys with mod n, ${moved(ring)} with consistent hashing and ${moved(hrw)} with rendezvous hashing.`, `${servers} / ${keys} / ${who}`);
    // The ring and rendezvous move only what they must: keys onto the new server, or off the one removed.
    for (const f of [ring, hrw]) for (const x of keys) if (f(x, servers) !== f(x, after)) assert.ok(add ? f(x, after) === who : f(x, servers) === who);
  }
  assert.throws(() => answer("hashing", "A, B", "k", "add A"), /isn't a change/);
  assert.throws(() => answer("hashing", "A, B", "k", "remove Z"), /no server Z/);
  assert.throws(() => answer("hashing", "A", "k", "remove A"), /only server/);
  assert.throws(() => answer("hashing", "A, A", "k", "add B"), /only once/);
  assert.throws(() => answer("hashing", "A", "k", "swap B"), /isn't a change/);
});

test("relational databases: a scan, an index and a transaction", () => {
  assert.equal(answer("relationalDatabases", "Ana 120, Ben 80, Cleo 45, Dev 200, Eve 80, Finn 15, Gus 95", "balance = 80", "60 Cleo Ana"), "Rows read: 7 by a full scan, 2 with the index (probes: 3; matches: Ben, Eve). The transfer was rolled back: Ana 120, Ben 80, Cleo 45, Dev 200, Eve 80, Finn 15, Gus 95.");
  assert.equal(answer("relationalDatabases", "Ana 120, Ben 80, Cleo 45", "> 100", "30 Ana Cleo"), "Rows read: 3 by a full scan, 1 with the index (probes: 2; matches: Ana). The transfer was committed: Ana 90, Ben 80, Cleo 75.");
  const r = rng(19);
  const NAMES = ["Ana", "Ben", "Cleo", "Dev", "Eve", "Finn", "Gus", "Hal", "Ivy"];
  for (let k = 0; k < 200; k++) {
    const n = between(r, 2, 9);
    const rows = NAMES.slice(0, n).map((name) => ({ name, bal: between(r, 0, 12) * 10 }));
    const op = pick(r, ["=", "<", ">"]);
    const v = between(r, 0, 12) * 10;
    const [a, b] = [between(r, 0, n - 1), between(r, 0, n - 1)];
    if (a === b) continue;
    const sum = between(r, 1, 100);
    const got = answer("relationalDatabases", rows.map((x) => `${x.name} ${x.bal}`).join(", "), `balance ${op} ${v}`, `${sum} ${rows[a].name} ${rows[b].name}`);
    const match = rows.map((x, i) => ({ ...x, i })).filter((x) => (op === "=" ? x.bal === v : op === "<" ? x.bal < v : x.bal > v)).sort((x, y) => x.bal - y.bal || x.i - y.i);
    const ok = rows[a].bal >= sum;
    const after = rows.map((x, i) => `${x.name} ${x.bal + (ok && i === a ? -sum : 0) + (ok && i === b ? sum : 0)}`);
    const m = got.match(/^Rows read: (\d+) by a full scan, (\d+) with the index \(probes: (\d+); matches: (.+)\)\. The transfer was (committed|rolled back): (.+)\.$/);
    assert.ok(m, got);
    assert.equal(Number(m[1]), n);
    assert.ok(Number(m[3]) <= Math.ceil(Math.log2(n + 1)), got);
    assert.equal(Number(m[2]), match.length, got);
    assert.equal(m[4], match.length ? match.map((x) => x.name).join(", ") : "none", got);
    assert.equal(m[5], ok ? "committed" : "rolled back");
    assert.equal(m[6], after.join(", "));
  }
  assert.throws(() => answer("relationalDatabases", "Ana", "= 1", "1 Ana Ben"), /isn't a row/);
  assert.throws(() => answer("relationalDatabases", "Ana 1, Ana 2", "= 1", "1 Ana Ben"), /only once/);
  assert.throws(() => answer("relationalDatabases", "Ana 1, Ben 2", "like 1", "1 Ana Ben"), /isn't a query/);
  assert.throws(() => answer("relationalDatabases", "Ana 1, Ben 2", "= 1", "1 Ana Zed"), /no account Zed/);
  assert.throws(() => answer("relationalDatabases", "Ana 1, Ben 2", "= 1", "1 Ana Ana"), /two different/);
  assert.throws(() => answer("relationalDatabases", "Ana 1, Ben 2", "= 1", "Ana Ben"), /isn't a transfer/);
});

test("key-value stores: buckets, chains and keys that expire", () => {
  assert.equal(answer("keyValueStores", "4", "put ana 7 3, put ben 2, put cy 5, get ana, wait 4, get ana, put ben 9, delete cy, get ben, get cy"), "What each get returned: ana → 7, ana → nothing (expired), ben → 9, cy → nothing.");
  assert.equal(answer("keyValueStores", "1", "put a 1 2, wait 1, get a, wait 1, get a"), "What each get returned: a → 1, a → nothing (expired).");
  assert.equal(answer("keyValueStores", "2", "put a 1"), "What each get returned: there were no gets.");
  const r = rng(20);
  for (let k = 0; k < 200; k++) {
    const ops: string[] = [];
    // The model: a map from key to its value and the time it dies.
    const m = new Map<string, { v: string; until: number }>();
    const gets: string[] = [];
    let now = 0;
    for (let j = 0; j < between(r, 1, 12); j++) {
      const v = pick(r, ["put", "put", "get", "get", "delete", "wait"]);
      const key = pick(r, ["a", "b", "c", "d", "e"]);
      if (v === "put") {
        const val = String(between(r, 1, 99));
        const ttl = r() < 0.4 ? between(r, 1, 5) : 0;
        ops.push(`put ${key} ${val}${ttl ? ` ${ttl}` : ""}`);
        m.set(key, { v: val, until: ttl ? now + ttl : Infinity });
      } else if (v === "get") {
        ops.push(`get ${key}`);
        const x = m.get(key);
        gets.push(`${key} → ${!x ? "nothing" : x.until <= now ? "nothing (expired)" : x.v}`);
        if (x && x.until <= now) m.delete(key);
      } else if (v === "delete") {
        ops.push(`delete ${key}`);
        m.delete(key);
      } else {
        const n = between(r, 1, 4);
        ops.push(`wait ${n}`);
        now += n;
      }
    }
    const got = answer("keyValueStores", String(between(r, 1, 8)), ops.join(", "));
    assert.equal(got, `What each get returned: ${gets.length ? gets.join(", ") : "there were no gets"}.`, ops.join(", "));
  }
  assert.throws(() => answer("keyValueStores", "0", "get a"), /from 1 to 8/);
  assert.throws(() => answer("keyValueStores", "2", "put a"), /isn't an operation/);
  assert.throws(() => answer("keyValueStores", "2", "fetch a"), /isn't an operation/);
  assert.throws(() => answer("keyValueStores", "2", "wait x"), /whole number/);
});

test("specialized storage: a quadtree visits only the squares it must", () => {
  assert.equal(answer("specializedStorage", "1,1 2,6 3,5 5,1 6,6 6,7 7,5 4,4 1,7 2,3", "2", "2,4 6,7"), "Found B (2, 6), C (3, 5), E (6, 6), F (6, 7), H (4, 4), checking 6 of the 10 points, in the squares visited (9).");
  // Few enough points: the plane never splits, and every point is checked.
  assert.equal(answer("specializedStorage", "1,1 6,6", "2", "0,0 3,3"), "Found A (1, 1), checking 2 of the 2 points, in the squares visited (1).");
  assert.equal(answer("specializedStorage", "1,1 6,6 7,7", "1", "0,4 2,7"), "Nothing found, checking 0 of the 3 points, in the squares visited (2).");
  const r = rng(21);
  let ran = 0;
  for (let k = 0; k < 200; k++) {
    const pts: [number, number][] = [];
    for (let j = 0; j < between(r, 1, 12); j++) {
      const p: [number, number] = [between(r, 0, 7), between(r, 0, 7)];
      if (!pts.some(([x, y]) => x === p[0] && y === p[1])) pts.push(p);
    }
    const [x0, x1, y0, y1] = [between(r, 0, 7), between(r, 0, 7), between(r, 0, 7), between(r, 0, 7)];
    let got: string;
    try {
      got = answer("specializedStorage", pts.map((p) => p.join(",")).join(" "), String(between(r, 1, 4)), `${x0},${y0} ${x1},${y1}`);
    } catch (err) {
      assert.equal((err as Error).message, w.sysBasics.specializedStorage.tooDeep);
      continue;
    }
    ran++;
    const inside = pts.flatMap(([x, y], i) => (x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y >= Math.min(y0, y1) && y <= Math.max(y0, y1) ? [`${String.fromCharCode(65 + i)} (${x}, ${y})`] : []));
    const checked = Number(got.match(/checking (\d+) of the/)![1]);
    assert.ok(checked >= inside.length && checked <= pts.length, got);
    assert.ok(got.startsWith(inside.length ? `Found ${inside.join(", ")}, checking` : "Nothing found"), `${JSON.stringify(pts)} → ${got}`);
  }
  assert.ok(ran > 150);
  assert.throws(() => answer("specializedStorage", "1,1 9,2", "2", "0,0 3,3"), /off the plane/);
  assert.throws(() => answer("specializedStorage", "1,1 1,1", "2", "0,0 3,3"), /twice/);
  assert.throws(() => answer("specializedStorage", "1,1", "2", "0,0"), /isn't a rectangle/);
  assert.throws(() => answer("specializedStorage", "1,1", "5", "0,0 3,3"), /from 1 to 4/);
});
