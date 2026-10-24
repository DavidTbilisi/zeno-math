// System design fundamentals on networks, storage and spreading load, each as something to run: a browser fetching a
// page, segments sent over TCP or UDP, writes that do or don't survive a crash, a transfer timed from its latency and
// bandwidth, parts in series that are up or down, proxies, a load balancer, keys hashed onto servers, a table with and
// without an index, a hash table whose keys expire, and a quadtree. The inputs are the knobs; each step says what
// happened and why, and the answer gives the numbers.
import type { sysNet } from "../../locales/problems/en/sysNet";
import { cells, done, fill, int, nums, points, row, type ArchBox, type ArchLink, type Frame, type ProblemSubset, type Role } from "./core";
import { amount, choice } from "./sys";

const enc = new TextEncoder();
/** FNV-1a, 32 bits: a small hash that spreads names well and comes out the same everywhere. */
export function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (const b of enc.encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h;
}

/** A word from a list, typed in English or in the reader's language; the error names the choices. */
function option(s: string, en: readonly string[], local: readonly string[], bad: string): number {
  const t = s.trim().toLowerCase();
  const i = en.findIndex((o, k) => o.toLowerCase() === t || local[k]?.toLowerCase() === t);
  if (i < 0) throw new Error(fill(bad, { s: s.trim() || "…", list: local.join(", ") }));
  return i;
}

/** At most three significant figures, without trailing zeros. */
export function sig(x: number, d = 3): string {
  if (x === 0) return "0";
  const p = Math.max(0, d - 1 - Math.floor(Math.log10(Math.abs(x))));
  return String(Number(x.toFixed(Math.min(p, 12))));
}

type Units = { us: string; ms: string; s: string; min: string; h: string; d: string };
/** A time in seconds, in the unit that suits it. */
export function dur(sec: number, u: Units): string {
  const a = Math.abs(sec);
  if (a < 1e-3) return `${sig(sec * 1e6)} ${u.us}`;
  if (a < 1) return `${sig(sec * 1e3)} ${u.ms}`;
  if (a < 60) return `${sig(sec)} ${u.s}`;
  if (a < 3600) return `${sig(sec / 60)} ${u.min}`;
  if (a < 86_400) return `${sig(sec / 3600)} ${u.h}`;
  return `${sig(sec / 86_400)} ${u.d}`;
}

/** Split a list typed with commas (or semicolons, or new lines) into its trimmed entries. */
const entries = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

/** The boxes and links of an architecture, some boxes lit and some links changed (lit, labelled). */
function draw(boxes: ArchBox[], links: ArchLink[], lit: Record<number, Role> = {}, hot: Record<number, Partial<ArchLink>> = {}) {
  return { boxes: boxes.map((b, i) => (lit[i] ? { ...b, role: lit[i] } : b)), links: links.map((l, i) => (hot[i] ? { ...l, ...hot[i] } : l)) };
}

/**
 * An availability written from how much of the time something is down (1 − availability), with as many decimals as
 * it takes to show the first digits that aren't 9: 0.001 → "99.9%", 2.5e-7 → "99.999975%".
 */
export function avail(down: number): string {
  if (down >= 1) return "0%";
  if (down <= 0) return "100%";
  const p = down * 100;
  const d = Math.min(24, Math.max(1, Math.ceil(-Math.log10(p)) + 1));
  const m = BigInt(Math.round(p * 10 ** d));
  const s = (100n * 10n ** BigInt(d) - m).toString().padStart(d + 1, "0");
  const whole = s.slice(0, s.length - d);
  const frac = s.slice(s.length - d).replace(/0+$/, "");
  return `${whole}${frac ? `.${frac}` : ""}%`;
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => [...String(n)].map((c) => SUP[Number(c)]).join("");
const letter = (i: number) => String.fromCharCode(65 + i);

/** Lower bound by halving: the first index where `right(i)` holds (or n), with each index looked at on the way. */
function bound(n: number, right: (i: number) => boolean): { at: number; probes: { lo: number; mid: number; hi: number; right: boolean }[] } {
  let [lo, hi] = [0, n];
  const probes: { lo: number; mid: number; hi: number; right: boolean }[] = [];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const r = right(mid);
    probes.push({ lo, mid, hi, right: r });
    if (r) hi = mid;
    else lo = mid + 1;
  }
  return { at: lo, probes };
}

// ——— Quadtree ———

type Quad = { x: number; y: number; size: number; pts: number[]; kids: number[] | null; depth: number; quad: number };
/** The quadtree's nodes level by level (root first, then each node's four parts in order), with their layers. */
function quadOrder(qs: Quad[]): number[] {
  const out = [0];
  for (let i = 0; i < out.length; i++) out.push(...(qs[out[i]].kids ?? []));
  return out;
}

export const NET: ProblemSubset<"sysBasics", keyof typeof sysNet> = {
  clientServer: {
    level: 0,
    example: ["https://zeno.example", "/, /lessons/7, /style.css", "40"],
    solve: ([address, paths, rtt], w, e) => {
      const m = address.trim().match(/^(?:(https?):\/\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::(\d{1,5}))?\/?$/i);
      if (!m) throw new Error(fill(w.badAddress, { s: address.trim() || "…" }));
      const scheme = (m[1] ?? "https").toLowerCase();
      const host = m[2].toLowerCase();
      if (host.length > 20) throw new Error(fill(e.tooLong, { n: 20 }));
      const port = m[3] ? Number(m[3]) : scheme === "https" ? 443 : 80;
      if (port < 1 || port > 65_535) throw new Error(fill(w.badAddress, { s: address.trim() }));
      const list = paths.split(/[,\s]+/).filter(Boolean);
      if (!list.length) throw new Error(e.empty);
      if (list.length > 6) throw new Error(fill(e.tooMany, { n: 6 }));
      const badPath = list.find((p) => !/^\/[\w\-./~%]*$/.test(p) || p.length > 18);
      if (badPath) throw new Error(fill(w.badPath, { s: badPath }));
      const t = amount(rtt, 1, 1000, w.badNumber) / 1000;
      const ip = `203.0.113.${1 + (fnv(host) % 254)}`;
      const boxes: ArchBox[] = [
        { label: w.browser, col: 0, row: 1, kind: "client" },
        { label: w.dns, col: 1, row: 0, kind: "server", tag: "DNS" },
        { label: host, col: 2, row: 1, kind: "server", tag: `${ip}:${port}` },
      ];
      const links: ArchLink[] = [{ a: 0, b: 1, both: true }, { a: 0, b: 2, both: true }];
      const trips: string[] = [];
      const frames: Frame[] = [];
      const tripRow = () => row(w.trips, trips, (i) => (i === trips.length - 1 ? "key" : "plain"));
      const so = () => ({ k: trips.length, t: dur(trips.length * t, w.units) });
      const addressRow = row(w.address, [scheme, host, String(port)]);

      frames.push({ note: fill(w.parse, { scheme, host, port }), arch: draw(boxes, links, { 0: "key" }), rows: [addressRow, tripRow()] });
      frames.push({ note: fill(w.ask, { host }), arch: draw(boxes, links, { 0: "compare", 1: "compare" }, { 0: { role: "compare", label: host } }), rows: [addressRow, tripRow()] });
      trips.push("DNS");
      frames.push({ note: fill(w.dnsAnswer, { ip, ...so() }), arch: draw(boxes, links, { 1: "sorted" }, { 0: { role: "sorted", label: ip } }), rows: [row(w.address, [scheme, ip, String(port)]), tripRow()] });
      trips.push("TCP");
      frames.push({ note: fill(w.tcp, { ip, port, ...so() }), arch: draw(boxes, links, { 0: "pivot", 2: "pivot" }, { 1: { role: "pivot", label: "SYN · ACK" } }), rows: [row(w.address, [scheme, ip, String(port)]), tripRow()] });
      if (scheme === "https") {
        trips.push("TLS");
        frames.push({ note: fill(w.tls, { host, ...so() }), arch: draw(boxes, links, { 0: "pivot", 2: "pivot" }, { 1: { role: "pivot", label: "TLS" } }), rows: [row(w.address, [scheme, ip, String(port)]), tripRow()] });
      }
      const type = (p: string) => (/\.css$/i.test(p) ? "text/css" : /\.js$/i.test(p) ? "text/javascript" : /\.png$/i.test(p) ? "image/png" : /\.jpe?g$/i.test(p) ? "image/jpeg" : /\.json$/i.test(p) ? "application/json" : "text/html");
      list.forEach((p, j) => {
        frames.push({
          note: fill(j === 0 ? w.request : w.again, { path: p, host }),
          arch: draw(boxes, links, { 0: "compare", 2: "compare" }, { 1: { role: "compare", label: `GET ${p}` } }),
          rows: [row(w.req, [`GET ${p}`, `Host: ${host}`], () => "compare"), tripRow()],
        });
        trips.push(`GET ${p}`);
        const size = `${1 + (fnv(host + p) % 60)} KB`;
        frames.push({
          note: fill(w.response, { path: p, size, type: type(p), ...so() }),
          arch: draw(boxes, links, { 0: "sorted", 2: "sorted" }, { 1: { role: "sorted", label: "200 OK" } }),
          rows: [row(w.res, ["200 OK", type(p), size], () => "sorted"), tripRow()],
        });
      });
      return done(frames, fill(w.answer, { paths: list.join(", "), host, ip, port, k: trips.length, t: dur(trips.length * t, w.units), rtt: dur(t, w.units) }));
    },
  },

  networkProtocols: {
    level: 0,
    example: ["8", "3, 6, 6", "TCP"],
    solve: ([count, lost, proto], w, e) => {
      const n = int(count, e, 1, 10);
      const t = lost.trim();
      const none = !t || /^(0|-|—|none)$/i.test(t) || t.toLowerCase() === w.none.toLowerCase();
      const drops = none ? [] : nums(t, e, { whole: true, min: 1, max: 12 });
      const big = drops.find((s) => s > n);
      if (big !== undefined) throw new Error(fill(e.atMost, { s: big, n }));
      const lose: number[] = Array(n + 1).fill(0);
      for (const s of drops) lose[s]++;
      if (lose.some((c) => c > 3)) throw new Error(w.tooLost);
      const p = choice(proto, ["TCP", "UDP"] as const, w.badProtocol);
      const tcp = p === "TCP";

      const boxes: ArchBox[] = [
        { label: w.sender, col: 0, row: 0, kind: "client", tag: "10.0.0.2" },
        { label: w.network, col: 1, row: 0, kind: "cdn" },
        { label: w.receiver, col: 2, row: 0, kind: "server", tag: "203.0.113.9" },
      ];
      const plainLinks: ArchLink[] = [{ a: 0, b: 1 }, { a: 1, b: 2 }];
      const st: ("wait" | "lost" | "buf" | "app")[] = Array(n + 1).fill("wait");
      const app: number[] = [];
      const segs = Array.from({ length: n }, (_, i) => i + 1);
      const roleOf = { wait: "plain", lost: "min", buf: "key", app: "sorted" } as const;
      const pic = (links: ArchLink[], cur?: number, lit: Record<number, Role> = {}): Partial<Frame> => ({
        arch: { boxes: boxes.map((b, i) => (lit[i] ? { ...b, role: lit[i] } : b)), links },
        cells: cells(segs, (i) => (i + 1 === cur && st[i + 1] === "wait" ? "compare" : roleOf[st[i + 1]]), cur ? { [w.now]: cur - 1 } : undefined),
        rows: tcp ? [row(w.buffer, segs.filter((s) => st[s] === "buf"), () => "key"), row(w.app, app, () => "sorted")] : [row(w.app, app, () => "sorted")],
      });
      const frames: Frame[] = [];
      let trips = 0;
      let sent = 0;
      if (tcp) {
        trips++;
        frames.push({ note: w.handshake, ...pic([{ a: 0, b: 1, both: true, role: "pivot", label: "SYN" }, { a: 1, b: 2, both: true, role: "pivot", label: "SYN-ACK" }], undefined, { 0: "pivot", 2: "pivot" }) });
      } else frames.push({ note: w.udpStart, ...pic(plainLinks) });
      frames.push({ note: fill(w.packet, { p }), ...pic(plainLinks), rows: [...(pic(plainLinks).rows ?? []), row(w.packetRow, ["10.0.0.2 → 203.0.113.9", `${p} #1`, "…"], (i) => (i === 0 ? "pivot" : "key"))] });

      let next = 1;
      const tries: number[] = Array(n + 1).fill(0);
      for (let round = 1; ; round++) {
        const todo = segs.filter((s) => st[s] === "wait" || st[s] === "lost");
        if (!todo.length || (!tcp && round > 1)) break;
        if (round > 1) frames.push({ note: fill(w.timeout, { list: todo.join(", ") }), ...pic(plainLinks, undefined, { 0: "compare" }) });
        for (const s of todo) {
          sent++;
          tries[s]++;
          if (tries[s] <= lose[s]) {
            st[s] = "lost";
            frames.push({ note: fill(tcp ? w.lost : w.udpLost, { s }), ...pic([{ a: 0, b: 1, role: "min", label: `#${s}` }, { a: 1, b: 2 }], s, { 1: "min" }) });
            continue;
          }
          let note: string;
          if (!tcp) {
            st[s] = "app";
            app.push(s);
            note = fill(w.udpArrive, { s });
          } else {
            st[s] = "buf";
            const freed: number[] = [];
            while (next <= n && st[next] === "buf") {
              st[next] = "app";
              app.push(next);
              freed.push(next);
              next++;
            }
            note = !freed.length ? fill(w.held, { s, m: next }) : freed.length === 1 ? fill(w.arrive, { s }) : fill(w.release, { s, list: freed.join(", ") });
          }
          frames.push({ note, ...pic([{ a: 0, b: 1, role: "key", label: `#${s}` }, { a: 1, b: 2, role: "key" }], s, { 2: "key" }) });
        }
        if (tcp) {
          trips++;
          const got = segs.filter((s) => st[s] === "buf" || st[s] === "app");
          frames.push({ note: fill(got.length === n ? w.ackAll : w.ack, { list: got.join(", "), k: trips }), ...pic([{ a: 1, b: 0, role: "sorted", label: "ACK" }, { a: 2, b: 1, role: "sorted" }], undefined, { 0: "sorted" }) });
        }
      }
      if (tcp) return done(frames, fill(w.answerTcp, { n, r: sent - n, k: trips }));
      const lostNow = segs.filter((s) => st[s] === "lost");
      return done(frames, fill(lostNow.length ? w.answerUdp : w.answerUdpAll, { d: app.length, n, x: lostNow.length, list: lostNow.join(", ") }));
    },
  },

  storage: {
    level: 0,
    example: ["write a 1, write b 2, read a, crash, read a, delete a, write c 3, crash, read a, read c", "both"],
    solve: ([opsText, place], w, e) => {
      const VERBS = ["write", "read", "delete", "crash"] as const;
      const ops = entries(opsText).map((op) => {
        const parts = op.split(/\s+/);
        const v = VERBS[option(parts[0], VERBS, w.verbs, fill(w.badOp, { s: op }))];
        const arity = { write: 3, read: 2, delete: 2, crash: 1 }[v];
        if (parts.length !== arity || parts.slice(1).some((x) => x.length > 6)) throw new Error(fill(w.badOp, { s: op }));
        return { v, k: parts[1] ?? "", val: parts[2] ?? "", text: op };
      });
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));
      const mode = option(place, ["memory", "disk", "both"], w.places, w.badPlace);
      const useMem = mode !== 1;
      const useDisk = mode !== 0;
      const MEM = 1e-7;
      const READ = 1e-4;
      const WRITE = 1e-3;

      const boxes: ArchBox[] = [{ label: w.app, col: 0, row: 0, kind: "server" }];
      const memAt = useMem ? boxes.push({ label: w.memory, col: 1, row: 0, kind: "cache", tag: dur(MEM, w.units) }) - 1 : -1;
      const diskAt = useDisk ? boxes.push({ label: mode === 2 ? w.logDisk : w.disk, col: boxes.length, row: 0, kind: "db", tag: mode === 2 ? `${w.write} ${dur(WRITE, w.units)}` : `${w.write} ${dur(WRITE, w.units)} · ${w.read} ${dur(READ, w.units)}` }) - 1 : -1;
      const links: ArchLink[] = [];
      const memLink = useMem ? links.push({ a: 0, b: memAt, both: true }) - 1 : -1;
      const diskLink = useDisk ? links.push({ a: mode === 2 ? memAt : 0, b: diskAt, both: mode !== 2 }) - 1 : -1;

      const mem = new Map<string, string>();
      const disk = new Map<string, string>();
      const log: string[] = [];
      const lostKeys = new Set<string>();
      const reads: string[] = [];
      let time = 0;
      const frames: Frame[] = [];
      const pic = (i: number, changed: string | null, lit: Record<number, Role>, hot: Record<number, Partial<ArchLink>>, wiped = false): Partial<Frame> => ({
        arch: draw(boxes, links, lit, hot),
        rows: [
          row(w.ops, ops.map((o) => o.text), (j) => (j === i ? "key" : j < i ? "idle" : "plain")),
          ...(useMem ? [row(w.memory, wiped ? ["—"] : [...mem].map(([k, v]) => `${k}=${v}`), (j) => (wiped ? "min" : [...mem.keys()][j] === changed ? "key" : "plain"))] : []),
          ...(mode === 1 ? [row(w.disk, [...disk].map(([k, v]) => `${k}=${v}`), (j) => ([...disk.keys()][j] === changed ? "key" : "plain"))] : []),
          ...(mode === 2 ? [row(w.log, log, (j) => (j === log.length - 1 && changed !== null ? "key" : "plain"))] : []),
        ],
      });
      const memHot = (role: Role) => (useMem ? { [memLink]: { role } } : {});
      ops.forEach((o, i) => {
        if (o.v === "write" || o.v === "delete") {
          const del = o.v === "delete";
          if (useDisk) time += WRITE;
          if (useMem) time += MEM;
          if (mode === 1) del ? disk.delete(o.k) : disk.set(o.k, o.val);
          else {
            if (mode === 2) log.push(del ? `✕${o.k}` : `${o.k}=${o.val}`);
            del ? mem.delete(o.k) : mem.set(o.k, o.val);
          }
          lostKeys.delete(o.k);
          const lit: Record<number, Role> = { 0: "key" };
          if (useMem) lit[memAt] = "key";
          if (useDisk) lit[diskAt] = "key";
          const hot: Record<number, Partial<ArchLink>> = { ...memHot("key") };
          if (useDisk) hot[diskLink] = { role: "key", label: mode === 2 ? w.append : w.write };
          frames.push({ note: fill((del ? w.del : w.writeNote)[mode], { k: o.k, v: o.val }), ...pic(i, o.k, lit, hot) });
        } else if (o.v === "read") {
          const fromDisk = mode === 1;
          time += fromDisk ? READ : MEM;
          const v = fromDisk ? disk.get(o.k) : mem.get(o.k);
          reads.push(`${o.k} → ${v ?? w.nothing}`);
          const at = fromDisk ? diskAt : memAt;
          const lk = fromDisk ? diskLink : memLink;
          const from = fromDisk ? w.fromDisk : w.fromMem;
          const t = dur(fromDisk ? READ : MEM, w.units);
          const note = v !== undefined ? fill(w.readNote, { k: o.k, v, from, t }) : lostKeys.has(o.k) ? fill(w.readLost, { k: o.k }) : fill(w.readNone, { k: o.k, from });
          frames.push({ note, ...pic(i, null, { 0: "key", [at]: v !== undefined ? "sorted" : "min" }, { [lk]: { role: v !== undefined ? "sorted" : "min", label: o.k } }) });
        } else {
          if (mode === 0) for (const k of mem.keys()) lostKeys.add(k);
          const had = mem.size;
          mem.clear();
          const lit: Record<number, Role> = { 0: "min" };
          if (useMem) lit[memAt] = "min";
          if (useDisk) lit[diskAt] = "sorted";
          frames.push({ note: fill(w.crash[mode], { n: mode === 1 ? disk.size : had }), ...pic(i, null, lit, {}, useMem) });
          if (mode === 2) {
            for (const x of log) {
              if (x.startsWith("✕")) mem.delete(x.slice(1));
              else {
                const [k, ...v] = x.split("=");
                mem.set(k, v.join("="));
              }
            }
            time += READ;
            frames.push({ note: fill(w.replay, { n: log.length, m: mem.size }), ...pic(i, null, { 0: "key", [memAt]: "sorted", [diskAt]: "sorted" }, { [diskLink]: { role: "sorted", label: w.replayLink } }) });
          }
        }
      });
      return done(frames, fill(w.answer, { reads: reads.length ? reads.join(", ") : w.noReads, t: dur(time, w.units) }));
    },
  },

  latencyThroughput: {
    level: 0,
    example: ["300", "100", "80", "6", "serial"],
    solve: ([size, bandwidth, rtt, count, how], w, e) => {
      const S = amount(size, 1, 100_000, w.badNumber);
      const B = amount(bandwidth, 1, 10_000, w.badNumber);
      const R = amount(rtt, 0.1, 1000, w.badNumber) / 1000;
      const n = int(count, e, 1, 8);
      const par = option(how, ["serial", "parallel"], w.modes, w.badMode) === 1;
      const u = w.units;
      const tx = (S * 8) / B / 1000; // KB × 8 = kilobits; ÷ Mbit/s = ms
      const one = R + tx;
      const total = par ? R + n * tx : n * one;
      const other = par ? n * one : R + n * tx;
      const wait = par ? R : n * R;
      const send = n * tx;
      const rate = (n * S * 8) / 1000 / total; // Mbit/s

      // The requests on a timeline, in ms (or s when that would be very long).
      const scale = total * 1000 > 20_000 ? 1 : 1000;
      const unit = scale === 1 ? u.s : u.ms;
      const at = (x: number) => Number(sig(x * scale));
      const timeline = (lit: boolean) => [
        { label: `${w.total} (${unit})`, items: [[0, at(total)]] as [number, number][], roles: [lit ? "pivot" : "idle"] as Role[] },
        ...Array.from({ length: n }, (_, i) => ({
          label: `#${i + 1}`,
          items: [[at(par ? 0 : i * one), at(par ? total : (i + 1) * one)]] as [number, number][],
          roles: [lit ? "key" : "idle"] as Role[],
        })),
      ];
      const frames: Frame[] = [];

      // The standard latencies, against reading 1 MB from memory.
      const STD = [250e-6, 1e-3, 20e-3, 0.5e-3, 150e-3];
      const std = (upTo: number) => ({
        vals: STD.slice(0, upTo + 1).map((v) => [dur(v, u), `× ${sig(v / STD[0])}`]),
        roles: STD.slice(0, upTo + 1).map((_, i): Role[] => (i === upTo ? ["key", "key"] : ["plain", "plain"])),
        rowHeads: w.std.slice(0, upTo + 1),
        colHeads: [w.time, w.vsMemory],
      });
      STD.forEach((_, i) => frames.push({ note: w.stdNote[i], mat: std(i), spans: timeline(false) }));

      const est: [string, string, string][] = [
        [w.est.transfer, dur(tx, u), `${sig(S)} KB × 8 ÷ ${sig(B)} Mbit/s`],
        [w.est.one, dur(one, u), `${dur(R, u)} + ${dur(tx, u)}`],
        [par ? w.est.allPar : w.est.allSerial, dur(total, u), par ? `${dur(R, u)} + ${n} × ${dur(tx, u)}` : `${n} × ${dur(one, u)}`],
        [w.est.rate, `${sig(rate)} Mbit/s`, `${n} × ${sig(S)} KB × 8 ÷ ${dur(total, u)}`],
        [par ? w.est.allSerial : w.est.allPar, dur(other, u), par ? `${n} × ${dur(one, u)}` : `${dur(R, u)} + ${n} × ${dur(tx, u)}`],
      ];
      const table = (upTo: number) => ({
        vals: est.slice(0, upTo + 1).map(([, v, h]) => [v, h]),
        roles: est.slice(0, upTo + 1).map((_, i): Role[] => (i === upTo ? ["key", "key"] : ["plain", "plain"])),
        rowHeads: est.slice(0, upTo + 1).map(([what]) => what),
        colHeads: [w.value, w.how],
      });
      const notes = [w.calc.transfer, w.calc.one, par ? w.calc.allPar : w.calc.allSerial, w.calc.rate, par ? w.calc.otherSerial : w.calc.otherPar];
      est.forEach(([, v], i) => frames.push({ note: fill(notes[i], { v, n, r: dur(R, u), b: sig(B) }), mat: table(i), spans: timeline(i >= 2) }));
      const latency = wait >= send;
      frames.push({ note: fill(latency ? w.latDom : w.bwDom, { l: dur(wait, u), b: dur(send, u) }), mat: table(est.length - 1), spans: timeline(true) });
      return done(frames, fill(latency ? w.answerLat : w.answerBw, { n, how: w.modeText[par ? 1 : 0], t: dur(total, u), l: dur(wait, u), b: dur(send, u) }));
    },
  },

  availability: {
    level: 0,
    example: ["LB 99.99 x2, Web 99.9 x3, Cache 99.5, DB 99.95 x2", "99.95"],
    solve: ([parts, target], w, e) => {
      const comps = entries(parts).map((c) => {
        const m = c.match(/^(\S+)\s+(\d+(?:[.,]\d+)?)\s*%?(?:\s*[x×*]\s*(\d+))?$/i);
        if (!m) throw new Error(fill(w.badComponent, { s: c }));
        if ([...m[1]].length > 10) throw new Error(fill(e.tooLong, { n: 10 }));
        const a = amount(m[2], 50, 99.999, w.badNumber);
        const k = m[3] ? int(m[3], e, 1, 4) : 1;
        return { name: m[1], a, k, down: ((100 - a) / 100) ** k };
      });
      if (!comps.length) throw new Error(e.empty);
      if (comps.length > 6) throw new Error(fill(e.tooMany, { n: 6 }));
      const goal = amount(target, 50, 99.9999, w.badNumber);
      const u = w.units;
      const down = -Math.expm1(comps.reduce((s, c) => s + Math.log1p(-c.down), 0));
      const weak = comps.reduce((a, b) => (b.down > a.down ? b : a));

      const boxes: ArchBox[] = [];
      const first: number[] = [];
      comps.forEach((c, i) => {
        first.push(boxes.length);
        for (let j = 0; j < c.k; j++) boxes.push({ label: j ? `${c.name} ${j + 1}` : c.name, col: i, row: j, kind: i === 0 ? "lb" : /db|data/i.test(c.name) ? "db" : "server", tag: `${c.a}%` });
      });
      const links: ArchLink[] = [];
      comps.forEach((c, i) => {
        if (i === comps.length - 1) return;
        for (let j = 0; j < c.k; j++) links.push({ a: first[i] + j, b: first[i + 1] + Math.min(j, comps[i + 1].k - 1) });
      });
      const litComp = (i: number, role: Role): Record<number, Role> => Object.fromEntries(Array.from({ length: comps[i].k }, (_, j) => [first[i] + j, role]));
      const allLit = (role: Role) => Object.fromEntries(boxes.map((_, i) => [i, role])) as Record<number, Role>;

      const rows: (string | number)[][] = comps.map((c) => [`${c.a}%`, c.k, avail(c.down), c.k === 1 ? w.oneCopy : `1 − (${sig(100 - c.a)}%)${sup(c.k)}`]);
      const heads = comps.map((c) => c.name);
      const mat = (upTo: number, lit: number) => ({
        vals: rows.slice(0, upTo + 1),
        roles: rows.slice(0, upTo + 1).map((r, i): Role[] => r.map(() => (i === lit ? "key" : "plain"))),
        rowHeads: heads.slice(0, upTo + 1),
        colHeads: [w.single, w.copies, w.up, w.how],
      });
      const frames: Frame[] = [];
      frames.push({ note: w.intro, arch: draw(boxes, links) });
      comps.forEach((c, i) =>
        frames.push({
          note: c.k === 1 ? fill(w.alone, { name: c.name, a: `${c.a}%` }) : fill(w.spare, { name: c.name, a: `${c.a}%`, k: c.k, d: `${sig(100 - c.a)}%`, v: avail(c.down) }),
          arch: draw(boxes, links, litComp(i, "key")),
          mat: mat(i, i),
        }),
      );
      rows.push(["", "", avail(down), comps.map((c) => c.name).join(" × ")]);
      heads.push(w.all);
      frames.push({ note: fill(w.series, { a: avail(down), weak: weak.name, wa: avail(weak.down) }), arch: draw(boxes, links, { ...allLit("sorted"), ...litComp(comps.indexOf(weak), "min") }), mat: mat(rows.length - 1, rows.length - 1) });

      const year = down * 365 * 86_400;
      const month = down * 30 * 86_400;
      const allowed = ((100 - goal) / 100) * 365 * 86_400;
      const met = 1 - down >= goal / 100 - 1e-12;
      const dt: [string, string, string][] = [
        [w.year, dur(year, u), `${sig(down * 100)}% × 365 ${u.d}`],
        [w.month, dur(month, u), `${sig(down * 100)}% × 30 ${u.d}`],
        [fill(w.allowed, { t: `${goal}%` }), dur(allowed, u), `${sig(100 - goal)}% × 365 ${u.d}`],
      ];
      const dtMat = (upTo: number) => ({
        vals: dt.slice(0, upTo + 1).map(([, v, h]) => [v, h]),
        roles: dt.slice(0, upTo + 1).map((_, i): Role[] => (i === upTo ? [upTo === 2 ? (met ? "sorted" : "min") : "key", "key"] : ["plain", "plain"])),
        rowHeads: dt.slice(0, upTo + 1).map(([x]) => x),
        colHeads: [w.value, w.how],
      });
      const nines = Math.floor(-Math.log10(down) + 1e-6);
      frames.push({ note: fill(w.yearNote, { v: dt[0][1], n: nines }), arch: draw(boxes, links, allLit("sorted")), mat: dtMat(0) });
      frames.push({ note: fill(w.monthNote, { v: dt[1][1] }), arch: draw(boxes, links, allLit("sorted")), mat: dtMat(1) });
      frames.push({ note: fill(met ? w.targetMet : w.targetMissed, { t: `${goal}%`, v: dt[2][1], y: dt[0][1], weak: weak.name }), arch: draw(boxes, links, met ? allLit("sorted") : litComp(comps.indexOf(weak), "min")), mat: dtMat(2) });
      return done(frames, fill(met ? w.answerMet : w.answerMissed, { a: avail(down), n: nines, y: dt[0][1], m: dt[1][1], t: `${goal}%`, weak: weak.name }));
    },
  },

  proxies: {
    level: 0,
    example: ["reverse", "ana /home, ben /news, cy /home, ana /about, ben /home, dan /news", "2"],
    solve: ([kind, requests, servers], w, e) => {
      const fwd = option(kind, ["forward", "reverse"], w.kinds, w.badKind) === 0;
      const reqs = entries(requests).map((r) => {
        const p = r.split(/\s+/);
        if (p.length !== 2) throw new Error(fill(w.badRequest, { s: r }));
        if ([...p[0]].length > 6 || [...p[1]].length > 14) throw new Error(fill(w.badRequest, { s: r }));
        return { c: p[0], t: p[1] };
      });
      if (!reqs.length) throw new Error(e.empty);
      if (reqs.length > 10) throw new Error(fill(e.tooMany, { n: 10 }));
      const clients = [...new Set(reqs.map((r) => r.c))];
      if (clients.length > 4) throw new Error(fill(w.tooManyClients, { n: 4 }));
      const sites = [...new Set(reqs.map((r) => r.t))];
      if (fwd && sites.length > 4) throw new Error(fill(w.tooManySites, { n: 4 }));
      const k = int(servers, e, 1, 4);
      const nServers = fwd ? sites.length : k;
      const PROXY = "198.51.100.7";
      const clientIp = (i: number) => (fwd ? `10.0.0.${11 + i}` : `192.0.2.${11 + i}`);
      const serverIp = (j: number) => (fwd ? `203.0.113.${1 + (fnv(sites[j]) % 254)}` : `10.1.0.${11 + j}`);
      const mid = Math.floor((Math.max(clients.length, nServers) - 1) / 2);

      const boxes: ArchBox[] = [
        ...clients.map((c, i): ArchBox => ({ label: c, col: 0, row: i, kind: "client", tag: clientIp(i) })),
        { label: fwd ? w.forwardProxy : w.reverseProxy, col: 1, row: mid, kind: "lb", tag: PROXY },
        ...Array.from({ length: nServers }, (_, j): ArchBox => ({ label: fwd ? sites[j] : `${w.server} ${j + 1}`, col: 2, row: j, kind: "server", tag: serverIp(j) })),
      ];
      const P = clients.length;
      const S0 = P + 1;
      const links: ArchLink[] = [
        ...clients.map((_, i): ArchLink => ({ a: i, b: P, both: true })),
        ...Array.from({ length: nServers }, (_, j): ArchLink => ({ a: P, b: S0 + j, both: true })),
      ];
      const cache: string[] = [];
      const load: number[] = Array(nServers).fill(0);
      let hits = 0;
      let rr = 0;
      const frames: Frame[] = [];
      const rows = (cur: number, clientSees: string, serverSees: string, hit: boolean) => [
        row(w.requests, reqs.map((r) => `${r.c} ${r.t}`), (j) => (j === cur ? (hit ? "sorted" : "compare") : j < cur ? "idle" : "plain")),
        row(w.clientSees, [clientSees], () => "key"),
        row(w.serverSees, [serverSees], () => (serverSees === "—" ? "idle" : "pivot")),
        row(w.cache, cache, (j) => (cache[j] === reqs[cur]?.t ? (hit ? "sorted" : "key") : "plain")),
      ];
      frames.push({ note: fwd ? w.fwdIntro : w.revIntro, arch: draw(boxes, links, { [P]: "pivot" }), rows: rows(-1, "—", "—", false) });
      reqs.forEach((r, i) => {
        const ci = clients.indexOf(r.c);
        const hit = cache.includes(r.t);
        const ip = clientIp(ci);
        if (hit) {
          hits++;
          frames.push({
            note: fill(fwd ? w.fwdHit : w.revHit, { c: r.c, t: r.t }),
            arch: draw(boxes, links, { [ci]: "sorted", [P]: "sorted" }, { [ci]: { role: "sorted", label: r.t } }),
            rows: rows(i, fwd ? r.t : PROXY, "—", true),
          });
          return;
        }
        const j = fwd ? sites.indexOf(r.t) : rr++ % k;
        load[j]++;
        cache.push(r.t);
        frames.push({
          note: fill(fwd ? w.fwdMiss : w.revMiss, { c: r.c, t: r.t, ip, p: PROXY, s: boxes[S0 + j].label }),
          arch: draw(boxes, links, { [ci]: "compare", [P]: "compare", [S0 + j]: "compare" }, { [ci]: { role: "compare", label: r.t }, [P + j]: { role: "compare" } }),
          rows: rows(i, fwd ? r.t : PROXY, fwd ? PROXY : `${PROXY} (X-Forwarded-For: ${ip})`, false),
        });
      });
      const misses = reqs.length - hits;
      if (fwd) return done(frames, fill(w.answerFwd, { p: PROXY, m: misses, h: hits }));
      const spread = load.map((x, j) => `${w.server} ${j + 1}: ${x}`).join(", ");
      return done(frames, fill(w.answerRev, { p: PROXY, load: spread, h: hits }));
    },
  },

  loadBalancers: {
    level: 0,
    example: ["S1 2, S2 1, S3 1", "least-connections", "ana 7, ben 6, cy 2, dan 5, eve 3, fay 4, ana 2, gus 6, ben 1"],
    solve: ([serversText, strategy, requests], w, e) => {
      const servers = entries(serversText).map((s) => {
        const m = s.match(/^(\S+)(?:\s+(\S+))?$/);
        if (!m || [...m[1]].length > 6) throw new Error(fill(w.badServer, { s }));
        return { name: m[1], wt: m[2] ? int(m[2], e, 1, 5) : 1 };
      });
      if (!servers.length) throw new Error(e.empty);
      if (servers.length > 4) throw new Error(fill(e.tooMany, { n: 4 }));
      if (new Set(servers.map((s) => s.name)).size < servers.length) throw new Error(w.twice);
      const STRATEGIES = ["round-robin", "weighted", "least-connections", "ip-hash"] as const;
      const how = STRATEGIES[option(strategy, STRATEGIES, w.strategies, w.badStrategy)];
      const reqs = entries(requests).map((r) => {
        const m = r.match(/^(\S+)\s+(\S+)$/);
        if (!m || [...m[1]].length > 5) throw new Error(fill(w.badRequest, { s: r }));
        return { c: m[1], d: int(m[2], e, 1, 9) };
      });
      if (!reqs.length) throw new Error(e.empty);
      if (reqs.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));
      const n = servers.length;
      const total = servers.reduce((s, x) => s + x.wt, 0);

      const mid = Math.floor((n - 1) / 2);
      const boxes = (client: string): ArchBox[] => [
        { label: client, col: 0, row: mid, kind: "client" },
        { label: w.lb, col: 1, row: mid, kind: "lb", tag: w.strategies[STRATEGIES.indexOf(how)] },
        ...servers.map((s, j): ArchBox => ({ label: s.name, col: 2, row: j, kind: "server" })),
      ];
      const links: ArchLink[] = [{ a: 0, b: 1 }, ...servers.map((_, j): ArchLink => ({ a: 1, b: 2 + j }))];
      const active: { c: string; s: number; end: number }[] = [];
      const handled: number[] = Array(n).fill(0);
      const peak: number[] = Array(n).fill(0);
      const cur: number[] = Array(n).fill(0);
      let turn = 0;
      const frames: Frame[] = [];
      const open = (j: number) => active.filter((a) => a.s === j).length;
      const pic = (i: number, client: string, pick: number | null, now: number): Partial<Frame> => ({
        arch: {
          boxes: boxes(client).map((b, j) => (j < 2 ? (j === 0 && pick !== null ? { ...b, role: "key" as Role } : b) : { ...b, role: j - 2 === pick ? "key" : "plain", tag: fill(w.open, { n: open(j - 2) }) + (how === "weighted" || how === "least-connections" ? ` · ×${servers[j - 2].wt}` : "") })),
          links: links.map((l, j) => (pick !== null && (j === 0 || j === pick + 1) ? { ...l, role: "key" as Role, label: j === 0 ? `${reqs[i].d} ${w.ticks}` : undefined } : l)),
        },
        cells: cells(reqs.map((r) => r.c), (j) => (j === i ? "key" : j < i ? "idle" : "plain"), i >= 0 ? { [w.now]: i } : undefined),
        rows: servers.map((s, j) => row(s.name, active.filter((a) => a.s === j).map((a) => `${a.c} ${a.end - now}`), (k) => (j === pick && k === open(j) - 1 ? "key" : "plain"))),
      });
      frames.push({ note: fill(w.intro, { how: w.strategies[STRATEGIES.indexOf(how)], n }), ...pic(-1, w.clients, null, 0) });
      reqs.forEach((r, i) => {
        const ended = active.filter((a) => a.end <= i);
        for (const a of ended) active.splice(active.indexOf(a), 1);
        let pick: number;
        let why: string;
        if (how === "round-robin") {
          pick = turn++ % n;
          why = fill(w.pick.rr, { c: r.c, d: r.d, s: servers[pick].name });
        } else if (how === "weighted") {
          for (let j = 0; j < n; j++) cur[j] += servers[j].wt;
          pick = cur.indexOf(Math.max(...cur));
          cur[pick] -= total;
          why = fill(w.pick.weighted, { c: r.c, d: r.d, s: servers[pick].name, wt: servers[pick].wt, tot: total });
        } else if (how === "least-connections") {
          // The fewest open connections for its weight: a server twice the size may hold twice as many.
          const load = servers.map((s, j) => open(j) / s.wt);
          pick = load.indexOf(Math.min(...load));
          why = fill(w.pick.least, { c: r.c, d: r.d, s: servers[pick].name, n: open(pick), wt: servers[pick].wt });
        } else {
          const h = fnv(r.c);
          pick = h % n;
          why = fill(w.pick.hash, { c: r.c, d: r.d, s: servers[pick].name, k: n, h: pick });
        }
        active.push({ c: r.c, s: pick, end: i + r.d });
        handled[pick]++;
        peak[pick] = Math.max(peak[pick], open(pick));
        const before = ended.length ? fill(w.ended, { list: ended.map((a) => a.c).join(", ") }) + " " : "";
        frames.push({ note: before + why, ...pic(i, r.c, pick, i) });
      });
      return done(frames, fill(w.answer, { list: servers.map((s, j) => fill(w.each, { s: s.name, n: handled[j], p: peak[j] })).join("; ") }));
    },
  },

  hashing: {
    level: 0,
    example: ["n1, n2, n3", "ant, bee, cat, dog, eel, fox, gnu, hen", "add n4"],
    solve: ([serversText, keysText, change], w, e) => {
      const list = (s: string, max: number, longest: number) => {
        const out = s.split(/[,;\s]+/).filter(Boolean);
        if (!out.length) throw new Error(e.empty);
        if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
        if (out.some((x) => [...x].length > longest)) throw new Error(fill(e.tooLong, { n: longest }));
        if (new Set(out).size < out.length) throw new Error(w.twice);
        return out;
      };
      const before = list(serversText, 5, 4);
      const keys = list(keysText, 8, 5);
      const m = change.trim().match(/^(\S+?)\s*(\S+)$/);
      const verb = m?.[1].replace(/[−–—]/, "-") ?? "";
      const op = verb === "+" ? 0 : verb === "-" ? 1 : m ? option(verb, ["add", "remove"], w.verbs, fill(w.badChange, { s: change.trim() })) : -1;
      if (op < 0 || !m) throw new Error(fill(w.badChange, { s: change.trim() || "…" }));
      const who = m[2];
      if (op === 0 && (before.includes(who) || [...who].length > 4)) throw new Error(fill(w.badChange, { s: change.trim() }));
      if (op === 1 && !before.includes(who)) throw new Error(fill(w.noServer, { s: who }));
      if (op === 1 && before.length < 2) throw new Error(w.lastServer);
      const after = op === 0 ? [...before, who] : before.filter((s) => s !== who);

      const place = (x: string) => fnv(x) % 360;
      const modOf = (k: string, ss: string[]) => ss[place(k) % ss.length];
      // The first server clockwise from the key (at the same place or after it), going round past 359 to 0.
      const ringOf = (k: string, ss: string[]) => {
        const sorted = [...ss].sort((a, b) => place(a) - place(b) || (a < b ? -1 : 1));
        return sorted.find((s) => place(s) >= place(k)) ?? sorted[0];
      };
      const score = (k: string, s: string) => fnv(`${k}/${s}`) % 1000;
      const hrwOf = (k: string, ss: string[]) => ss.reduce((a, b) => (score(k, b) > score(k, a) || (score(k, b) === score(k, a) && b < a) ? b : a));

      const frames: Frame[] = [];
      const kh = keys.map(place);
      // mod n
      frames.push({ note: fill(w.hashNote, { k: keys[0], h: kh[0] }), mat: { vals: keys.map((_, i) => [kh[i]]), roles: keys.map(() => ["key"]), rowHeads: keys, colHeads: [w.hash] } });
      const nb = before.length;
      const na = after.length;
      frames.push({
        note: fill(w.modNote, { k: keys[0], h: kh[0], n: nb, r: kh[0] % nb, s: modOf(keys[0], before) }),
        mat: { vals: keys.map((k, i) => [kh[i], kh[i] % nb, modOf(k, before)]), roles: keys.map((): Role[] => ["plain", "plain", "key"]), rowHeads: keys, colHeads: [w.hash, `mod ${nb}`, w.server] },
      });
      const movedMod = keys.filter((k) => modOf(k, before) !== modOf(k, after)).length;
      frames.push({
        note: fill(op === 0 ? w.modAdd : w.modRemove, { s: who, n: na, m: movedMod, k: keys.length }),
        mat: {
          vals: keys.map((k, i) => [kh[i], modOf(k, before), kh[i] % na, modOf(k, after)]),
          roles: keys.map((k): Role[] => (modOf(k, before) !== modOf(k, after) ? ["plain", "idle", "plain", "min"] : ["plain", "plain", "plain", "sorted"])),
          rowHeads: keys,
          colHeads: [w.hash, w.before, `mod ${na}`, w.after],
        },
      });

      // The ring: servers and keys round a circle at their places (nudged apart where two would overlap).
      const ring = (ss: string[], assigned: boolean, moved: Set<string>, prev?: string[]) => {
        const nodes = [...ss.map((s) => ({ name: s, server: true })), ...keys.map((k) => ({ name: k, server: false }))].sort(
          (a, b) => place(a.name) - place(b.name) || (a.server === b.server ? (a.name < b.name ? -1 : 1) : a.server ? -1 : 1),
        );
        const at = (name: string, server: boolean) => nodes.findIndex((x) => x.name === name && x.server === server);
        return {
          nodes: nodes.map((x) => x.name),
          tags: nodes.map((x) => `${place(x.name)}°`),
          angle: nodes.map((x) => place(x.name)),
          roles: nodes.map((x): Role => (x.server ? (prev && !prev.includes(x.name) ? "pivot" : "key") : !assigned ? "idle" : moved.has(x.name) ? "min" : "plain")),
          edges: assigned ? keys.map((k) => ({ a: at(k, false), b: at(ringOf(k, ss), true), role: (moved.has(k) ? "min" : "plain") as Role })) : [],
          directed: true,
        };
      };
      const firstServer = [...before].sort((a, b) => place(a) - place(b))[0];
      frames.push({ note: fill(w.ringNote, { s: firstServer, h: place(firstServer) }), graph: ring(before, false, new Set()) });
      frames.push({ note: fill(w.ringKeys, { k: keys[0], h: kh[0], s: ringOf(keys[0], before), p: place(ringOf(keys[0], before)) }), graph: ring(before, true, new Set()) });
      const movedRing = new Set(keys.filter((k) => ringOf(k, before) !== ringOf(k, after)));
      frames.push({
        note: fill(op === 0 ? w.ringAdd : w.ringRemove, { s: who, h: place(who), m: movedRing.size, k: keys.length, next: op === 1 ? ringOf(who, after) : "" }),
        graph: ring(after, true, movedRing, before),
      });

      // Rendezvous: every key scored with every server, the highest wins.
      const hrw = (ss: string[], moved: Set<string>) => ({
        vals: keys.map((k) => ss.map((s) => score(k, s))),
        roles: keys.map((k): Role[] => ss.map((s) => (hrwOf(k, ss) === s ? (moved.has(k) ? "min" : "sorted") : "plain"))),
        rowHeads: keys,
        colHeads: ss,
      });
      frames.push({ note: fill(w.hrwNote, { k: keys[0], s: hrwOf(keys[0], before), v: score(keys[0], hrwOf(keys[0], before)) }), mat: hrw(before, new Set()) });
      const movedHrw = new Set(keys.filter((k) => hrwOf(k, before) !== hrwOf(k, after)));
      frames.push({ note: fill(op === 0 ? w.hrwAdd : w.hrwRemove, { s: who, m: movedHrw.size, k: keys.length }), mat: hrw(after, movedHrw) });
      return done(frames, fill(op === 0 ? w.answerAdd : w.answerRemove, { s: who, k: keys.length, m: movedMod, c: movedRing.size, r: movedHrw.size }));
    },
  },

  relationalDatabases: {
    level: 0,
    example: ["Ana 120, Ben 80, Cleo 45, Dev 200, Eve 80, Finn 15, Gus 95", "balance = 80", "60 Cleo Ana"],
    solve: ([table, query, transfer], w, e) => {
      const accounts = entries(table).map((r) => {
        const m = r.match(/^(\S+)\s+(\S+)$/);
        if (!m || [...m[1]].length > 8) throw new Error(fill(w.badRow, { s: r }));
        return { name: m[1], bal: int(m[2], e, 0, 9999) };
      });
      if (!accounts.length) throw new Error(e.empty);
      if (accounts.length > 9) throw new Error(fill(e.tooMany, { n: 9 }));
      if (new Set(accounts.map((a) => a.name.toLowerCase())).size < accounts.length) throw new Error(w.twice);
      const q = query.trim().replace(/[−–—]/g, "-").replace(new RegExp(`^(balance|${w.column})\\s*`, "i"), "").match(/^(=|<|>)\s*(-?\d+)$/);
      if (!q) throw new Error(fill(w.badQuery, { s: query.trim() || "…" }));
      const op = q[1] as "=" | "<" | ">";
      const v = Number(q[2]);
      const t = transfer.trim().match(/^(\d+)\s+(\S+)\s+(\S+)$/);
      if (!t) throw new Error(fill(w.badTransfer, { s: transfer.trim() || "…" }));
      const sum = int(t[1], e, 1, 9999);
      const find = (s: string) => {
        const i = accounts.findIndex((a) => a.name.toLowerCase() === s.toLowerCase());
        if (i < 0) throw new Error(fill(w.noAccount, { s }));
        return i;
      };
      const from = find(t[2]);
      const to = find(t[3]);
      if (from === to) throw new Error(w.sameAccount);
      const hit = (b: number) => (op === "=" ? b === v : op === "<" ? b < v : b > v);

      const frames: Frame[] = [];
      const ids = accounts.map((_, i) => String(i + 1));
      const tableMat = (bal: number[], role: (i: number) => Role) => ({
        vals: accounts.map((a, i) => [a.name, bal[i]]),
        roles: accounts.map((_, i): Role[] => [role(i), role(i)]),
        rowHeads: ids,
        colHeads: [w.nameCol, w.column],
      });
      const bals = accounts.map((a) => a.bal);
      const sql = `${w.column} ${op} ${v}`;
      // A full scan reads every row.
      const found: number[] = [];
      accounts.forEach((a, i) => {
        if (hit(a.bal)) found.push(i);
        frames.push({
          note: fill(i === 0 ? w.scanFirst : hit(a.bal) ? w.scanHit : w.scanMiss, { q: sql, name: a.name, b: a.bal, i: i + 1 }),
          mat: tableMat(bals, (j) => (j === i ? (hit(a.bal) ? "sorted" : "compare") : found.includes(j) ? "sorted" : j < i ? "idle" : "plain")),
        });
      });
      // The index: the balances sorted, each with its row, searched by halving.
      const order = accounts.map((_, i) => i).sort((a, b) => accounts[a].bal - accounts[b].bal || a - b);
      const keys = order.map((i) => accounts[i].bal);
      const idxRow = (role: (k: number) => Role) => [row(w.rowIds, order.map((i) => i + 1), role)];
      frames.push({ note: w.indexNote, cells: cells(keys), rows: idxRow(() => "plain"), mat: tableMat(bals, () => "plain") });
      const after = op === ">";
      const b = bound(keys.length, (i) => (after ? keys[i] > v : keys[i] >= v));
      b.probes.forEach((p, k) =>
        frames.push({
          note: fill(after ? (p.right ? w.probe.gtLeft : w.probe.leRight) : p.right ? w.probe.geLeft : w.probe.ltRight, { k: k + 1, m: keys[p.mid], v }),
          cells: cells(keys, (i) => (i === p.mid ? "compare" : i < p.lo || i >= p.hi ? "idle" : "plain"), { lo: p.lo, mid: p.mid, ...(p.hi < keys.length ? { hi: p.hi } : {}) }, [p.lo, Math.max(p.lo, p.hi - 1)]),
          rows: idxRow((i) => (i === p.mid ? "compare" : "plain")),
          mat: tableMat(bals, () => "plain"),
        }),
      );
      const lo = op === "<" ? 0 : b.at;
      let hi = op === "<" ? b.at : keys.length;
      if (op === "=") {
        hi = lo;
        while (hi < keys.length && keys[hi] === v) hi++;
      }
      const matched = order.slice(lo, hi);
      frames.push({
        note: fill(matched.length ? w.indexFound : w.indexNone, { p: b.probes.length, m: matched.length, list: matched.map((i) => i + 1).join(", "), n: accounts.length }),
        cells: cells(keys, (i) => (i >= lo && i < hi ? "sorted" : "idle")),
        rows: idxRow((i) => (i >= lo && i < hi ? "sorted" : "idle")),
        mat: tableMat(bals, (j) => (matched.includes(j) ? "sorted" : "plain")),
      });

      // The transfer, as one transaction.
      const [A, B] = [accounts[from], accounts[to]];
      frames.push({ note: fill(w.begin, { x: sum, a: A.name, b: B.name }), mat: tableMat(bals, (j) => (j === from || j === to ? "pivot" : "plain")) });
      const mid = [...bals];
      mid[to] += sum;
      frames.push({ note: fill(w.credit, { x: sum, b: B.name, o: bals[to], n: mid[to] }), mat: tableMat(mid, (j) => (j === to ? "key" : j === from ? "pivot" : "plain")) });
      const ok = A.bal >= sum;
      const end = [...mid];
      end[from] -= sum;
      const mat2 = tableMat(end, (j) => (j === from ? (ok ? "key" : "min") : j === to ? "key" : "plain"));
      mat2.vals = mat2.vals.map((r, j) => (j === from ? [r[0], ok ? r[1] : `${bals[from]} → −${sum - bals[from]}`] : r));
      frames.push({ note: fill(ok ? w.debit : w.debitFail, { x: sum, a: A.name, o: bals[from], n: end[from], d: `−${sum - bals[from]}` }), mat: mat2 });
      const final = ok ? end : bals;
      frames.push({ note: fill(ok ? w.commit : w.rollback, { a: A.name, b: B.name, x: sum, o: bals[to] }), mat: tableMat(final, (j) => (j === from || j === to ? (ok ? "sorted" : "min") : "plain")) });
      const list = accounts.map((a, i) => `${a.name} ${final[i]}`).join(", ");
      return done(frames, fill(ok ? w.answerOk : w.answerFail, {
        n: accounts.length,
        p: b.probes.length,
        m: matched.length,
        found: matched.length ? matched.map((i) => accounts[i].name).join(", ") : w.none,
        list,
      }), { mat: tableMat(final, (j) => (j === from || j === to ? (ok ? "sorted" : "min") : "plain")) });
    },
  },

  keyValueStores: {
    level: 0,
    example: ["4", "put ana 7 3, put ben 2, put cy 5, get ana, wait 4, get ana, put ben 9, delete cy, get ben, get cy"],
    solve: ([buckets, opsText], w, e) => {
      const nb = int(buckets, e, 1, 8);
      const VERBS = ["put", "get", "delete", "wait"] as const;
      const ops = entries(opsText).map((op) => {
        const p = op.split(/\s+/);
        const v = VERBS[option(p[0], VERBS, w.verbs, fill(w.badOp, { s: op }))];
        const ok = v === "put" ? p.length === 3 || p.length === 4 : p.length === 2;
        if (!ok || p.slice(1, 3).some((x) => [...x].length > 6)) throw new Error(fill(w.badOp, { s: op }));
        if (v === "wait") return { v, k: "", val: "", n: int(p[1], e, 1, 99), text: op };
        return { v, k: p[1], val: p[2] ?? "", n: p[3] ? int(p[3], e, 1, 99) : 0, text: op };
      });
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 12) throw new Error(fill(e.tooMany, { n: 12 }));

      type Entry = { k: string; v: string; until: number | null };
      const table: Entry[][] = Array.from({ length: nb }, () => []);
      let now = 0;
      const gets: string[] = [];
      const frames: Frame[] = [];
      const bucketOf = (k: string) => fnv(k) % nb;
      const pic = (i: number, b: number, role: (x: Entry) => Role): Partial<Frame> => ({
        rows: [
          row(w.clock, [`t = ${now}`, ops[i].text], (j) => (j === 0 ? "pivot" : "key")),
          ...table.map((chain, j) => {
            if (!chain.length) return row(`${w.bucket} ${j}`, ["—"], () => "idle");
            const gone = (x: Entry) => x.until !== null && x.until <= now;
            return row(`${w.bucket} ${j}`, chain.map((x) => `${x.k}=${x.v}${x.until !== null ? ` ⌛${x.until}` : ""}`), (k) => (j === b ? role(chain[k]) : gone(chain[k]) ? "idle" : "plain"));
          }),
        ],
      });
      ops.forEach((o, i) => {
        if (o.v === "wait") {
          now += o.n;
          const gone = table.flat().filter((x) => x.until !== null && x.until <= now).map((x) => x.k);
          frames.push({ note: fill(gone.length ? w.waitGone : w.wait, { n: o.n, t: now, list: gone.join(", ") }), ...pic(i, -1, () => "plain") });
          return;
        }
        const b = bucketOf(o.k);
        const chain = table[b];
        const at = chain.findIndex((x) => x.k === o.k);
        const live = at >= 0 && (chain[at].until === null || chain[at].until! > now);
        const walked = at >= 0 ? at + 1 : chain.length;
        if (o.v === "put") {
          const entry = { k: o.k, v: o.val, until: o.n ? now + o.n : null };
          if (at >= 0) chain[at] = entry;
          else chain.push(entry);
          const note = fill(o.n ? w.putTtl : at >= 0 ? w.putOver : w.put, { k: o.k, v: o.val, b, n: o.n, u: now + o.n, chain: chain.length });
          frames.push({ note, ...pic(i, b, (x) => (x.k === o.k ? "key" : "plain")) });
        } else if (o.v === "get") {
          const expired = at >= 0 && !live;
          if (expired) {
            const until = chain[at].until!;
            chain.splice(at, 1);
            gets.push(`${o.k} → ${w.nothingExpired}`);
            frames.push({ note: fill(w.getExpired, { k: o.k, b, u: until, t: now }), ...pic(i, b, () => "compare") });
          } else if (live) {
            gets.push(`${o.k} → ${chain[at].v}`);
            frames.push({ note: fill(w.getHit, { k: o.k, b, v: chain[at].v, n: walked }), ...pic(i, b, (x) => (x.k === o.k ? "sorted" : chain.indexOf(x) < at ? "compare" : "plain")) });
          } else {
            gets.push(`${o.k} → ${w.nothing}`);
            frames.push({ note: fill(w.getMiss, { k: o.k, b, n: walked }), ...pic(i, b, () => "compare") });
          }
        } else {
          if (at >= 0) chain.splice(at, 1);
          frames.push({ note: fill(live ? w.deleted : w.deleteNone, { k: o.k, b }), ...pic(i, b, () => "plain") });
        }
      });
      return done(frames, fill(w.answer, { list: gets.length ? gets.join(", ") : w.noGets }));
    },
  },

  specializedStorage: {
    level: 0,
    example: ["1,1 2,6 3,5 5,1 6,6 6,7 7,5 4,4 1,7 2,3", "2", "2,4 6,7"],
    solve: ([pointsText, capacity, query], w, e) => {
      const pts = points(pointsText, e, 12);
      const off = pts.find(([x, y]) => x < 0 || y < 0 || x > 7 || y > 7);
      if (off) throw new Error(fill(w.offPlane, { s: `${off[0]}, ${off[1]}` }));
      const dup = pts.find(([x, y], i) => pts.findIndex(([a, b]) => a === x && b === y) !== i);
      if (dup) throw new Error(fill(w.samePoint, { s: `${dup[0]}, ${dup[1]}` }));
      const cap = int(capacity, e, 1, 4);
      const corners = points(query, e, 2);
      if (corners.length !== 2) throw new Error(fill(w.badQuery, { s: query.trim() || "…" }));
      const offQ = corners.find(([x, y]) => x < 0 || y < 0 || x > 7 || y > 7);
      if (offQ) throw new Error(fill(w.offPlane, { s: `${offQ[0]}, ${offQ[1]}` }));
      const [qx0, qx1] = [Math.min(corners[0][0], corners[1][0]), Math.max(corners[0][0], corners[1][0])];
      const [qy0, qy1] = [Math.min(corners[0][1], corners[1][1]), Math.max(corners[0][1], corners[1][1])];
      const inQ = (x: number, y: number) => x >= qx0 && x <= qx1 && y >= qy0 && y <= qy1;
      const name = (i: number) => letter(i);

      const qs: Quad[] = [{ x: 0, y: 0, size: 8, pts: [], kids: null, depth: 0, quad: -1 }];
      const inside = (q: Quad, [x, y]: [number, number]) => x >= q.x && x < q.x + q.size && y >= q.y && y < q.y + q.size;
      const leafOf = (p: [number, number]) => {
        let at = 0;
        while (qs[at].kids) at = qs[at].kids!.find((k) => inside(qs[k], p))!;
        return at;
      };
      const sq = (q: Quad) => fill(w.square, { x0: q.x, x1: q.x + q.size - 1, y0: q.y, y1: q.y + q.size - 1 });
      // Split while too full: NW, NE, SW, SE (north is up, where y is bigger).
      const split = (at: number): void => {
        const q = qs[at];
        if (q.pts.length <= cap || q.size === 1) return;
        const h = q.size / 2;
        const offs: [number, number][] = [[0, h], [h, h], [0, 0], [h, 0]];
        q.kids = offs.map(([dx, dy], k) => qs.push({ x: q.x + dx, y: q.y + dy, size: h, pts: [], kids: null, depth: q.depth + 1, quad: k }) - 1);
        for (const p of q.pts) qs[q.kids.find((k) => inside(qs[k], pts[p]))!].pts.push(p);
        q.pts = [];
        for (const k of q.kids) split(k);
      };

      // The plane, y = 7 at the top, and the tree.
      const placed = new Set<number>();
      const plane = (role: (x: number, y: number) => Role) => ({
        vals: Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, x) => {
          const p = pts.findIndex(([a, b]) => a === x && b === 7 - r);
          return p >= 0 && placed.has(p) ? name(p) : "·";
        })),
        roles: Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, x) => role(x, 7 - r))),
        rowHeads: Array.from({ length: 8 }, (_, r) => String(7 - r)),
        colHeads: Array.from({ length: 8 }, (_, x) => String(x)),
      });
      const tree = (role: (i: number) => Role) => {
        const order = quadOrder(qs);
        const pos = new Map(order.map((q, i) => [q, i]));
        return {
          nodes: order.map((q) => (q === 0 ? w.root : w.quads[qs[q].quad])),
          edges: order.flatMap((q) => (qs[q].kids ?? []).map((k) => ({ a: pos.get(q)!, b: pos.get(k)! }))),
          roles: order.map((q) => role(q)),
          directed: false,
          layer: order.map((q) => qs[q].depth),
          tags: order.map((q) => (qs[q].kids ? "" : qs[q].pts.map(name).join("") || "∅")),
        };
      };
      const frames: Frame[] = [];
      pts.forEach((p, i) => {
        const at = leafOf(p);
        qs[at].pts.push(i);
        placed.add(i);
        const full = qs[at].pts.length > cap && qs[at].size > 1;
        const n = qs[at].pts.length;
        const was = sq(qs[at]);
        split(at);
        if (qs.length > 17) throw new Error(w.tooDeep);
        const now = leafOf(p);
        frames.push({
          note: fill(full ? w.split : w.insert, { p: name(i), x: p[0], y: p[1], sq: was, n, c: cap }),
          mat: plane((x, y) => (x === p[0] && y === p[1] ? "key" : inside(qs[now], [x, y]) ? "compare" : "plain")),
          graph: tree((q) => (q === now ? "key" : full && (q === at || qs[at].kids?.includes(q)) ? "compare" : "plain")),
        });
      });

      // The query: only the squares that overlap it are visited.
      const overlaps = (q: Quad) => q.x <= qx1 && q.x + q.size - 1 >= qx0 && q.y <= qy1 && q.y + q.size - 1 >= qy0;
      const visited = new Set<number>();
      const skipped = new Set<number>();
      const checked = new Set<number>();
      const hits: number[] = [];
      const qsq = fill(w.square, { x0: qx0, x1: qx1, y0: qy0, y1: qy1 });
      const look = (cur: number) => (x: number, y: number): Role => {
        const p = pts.findIndex(([a, b]) => a === x && b === y);
        if (p >= 0 && hits.includes(p)) return "sorted";
        if (p >= 0 && checked.has(p)) return "min";
        if (inside(qs[cur], [x, y]) && !inQ(x, y)) return "compare";
        if (inQ(x, y)) return "pivot";
        if ([...skipped].some((s) => inside(qs[s], [x, y]))) return "idle";
        return "plain";
      };
      // A square inside one that was skipped is skipped with it.
      const within = (q: number, s: number) => q !== s && qs[q].x >= qs[s].x && qs[q].y >= qs[s].y && qs[q].x + qs[q].size <= qs[s].x + qs[s].size && qs[q].y + qs[q].size <= qs[s].y + qs[s].size;
      const treeRoles = (cur: number) => tree((q) => (q === cur ? "compare" : skipped.has(q) || [...skipped].some((s) => within(q, s)) ? "idle" : visited.has(q) ? (qs[q].pts.some((p) => hits.includes(p)) ? "sorted" : "pivot") : "plain"));
      const visit = (at: number) => {
        visited.add(at);
        const q = qs[at];
        if (q.kids) {
          const yes = q.kids.filter((k) => overlaps(qs[k]));
          const no = q.kids.filter((k) => !overlaps(qs[k]));
          for (const k of no) skipped.add(k);
          const where = at === 0 ? w.rootName : `${w.quads[q.quad]} (${sq(q)})`;
          frames.push({
            note: fill(no.length ? w.visitSome : w.visitAll, { at: where, q: qsq, yes: yes.map((k) => w.quads[qs[k].quad]).join(", "), no: no.map((k) => w.quads[qs[k].quad]).join(", ") }),
            mat: plane(look(at)),
            graph: treeRoles(at),
          });
          for (const k of yes) visit(k);
          return;
        }
        for (const p of q.pts) {
          checked.add(p);
          if (inQ(...pts[p])) hits.push(p);
        }
        const yes = q.pts.filter((p) => inQ(...pts[p]));
        const no = q.pts.filter((p) => !inQ(...pts[p]));
        frames.push({
          note: fill(!q.pts.length ? w.leafEmpty : !no.length ? w.leafAll : !yes.length ? w.leafNone : w.leafSome, { at: at === 0 ? w.rootName : `${w.quads[q.quad]} (${sq(q)})`, n: q.pts.length, yes: yes.map(name).join(", "), no: no.map(name).join(", ") }),
          mat: plane(look(at)),
          graph: treeRoles(at),
        });
      };
      if (!overlaps(qs[0])) throw new Error(fill(w.badQuery, { s: query.trim() }));
      visit(0);
      hits.sort((a, b) => a - b);
      const found = hits.map((p) => `${name(p)} (${pts[p][0]}, ${pts[p][1]})`).join(", ");
      return done(frames, fill(hits.length ? w.answer : w.answerNone, { list: found, n: hits.length, v: visited.size, c: checked.size, all: pts.length }));
    },
  },
};
