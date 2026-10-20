// Problem-solving tactics (after Zeitz, The Art and Craft of Problem Solving, ch. 3, via the Neural OS notes):
// symmetry — 1 + 2 + … + n as a staircase and its turned copy filling a rectangle; the extreme principle —
// everyone squirts their nearest neighbour, and the closest pair is forced to squirt each other; the pigeonhole
// principle — by counts, or numbers sorted into boxes by their remainder; and the invariants: parity (can
// ±1 ±2 … ±n reach t?), a remainder mod 3 (the chameleons that change colour when two meet), colouring (can
// dominoes tile a board with some squares removed?) and a monovariant (swapping neighbours that are out of
// order removes exactly one inversion, so the swapping must stop). Where the invariant allows something, a
// search finds it.
import { txt } from "./algoArrays";
import { arrow, C, compose, fill, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type TacticsTopic = "symmetry" | "extreme" | "pigeonhole" | "parity" | "modular" | "tiling" | "monovariant";
export const TACTICS_TOPICS: TacticsTopic[] = ["symmetry", "extreme", "pigeonhole", "parity", "modular", "tiling", "monovariant"];
export type PigeonMode = "count" | "residues";
export const PIGEON_MODES: PigeonMode[] = ["count", "residues"];

/**
 * symmetry: n · extreme: people at the points pts ("1,1 4,2 …") · pigeonhole: p pigeons in h holes (count), or the
 * numbers in nums sorted by remainder mod h (residues) · parity: ±1 ±2 … ±n = t · modular: abc chameleons, red green
 * blue ("13 15 17") · tiling: a rows × cols board without the squares in removed ("a1 h8" or "1,1 8,8") ·
 * monovariant: the numbers in nums put in order by swapping neighbours.
 */
export type TacticsSpec = {
  topic: TacticsTopic;
  n: string;
  p: string;
  h: string;
  mode: PigeonMode;
  nums: string;
  rows: string;
  cols: string;
  removed: string;
  pts: string;
  t: string;
  abc: string;
};

export type TacticsWords = {
  bad: string;
  info: Record<TacticsTopic, string>;
  sym: { pairs: string; rect: string };
  pig: { count: string; boxes: string; few: string; same: string; none: string; holes: string };
  tile: { counts: string; impossible: string; found: string; none: string; badCell: string; odd: string; black: string; white: string };
  ext: { badPoint: string; few: string; twice: string; ties: string; closest: string; odd: string; even: string; dry: string; nobody: string };
  par: { sum: string; tooBig: string; parity: string; found: string };
  mod: { badCounts: string; residues: string; invariant: string; impossible: string; found: string; already: string; more: string };
  mono: { badList: string; start: string; step: string; stop: string; sorted: string; more: string };
};

const int = (s: string, w: TacticsWords, lo: number, hi: number): number => {
  const t = s.trim().replace(/[−–]/g, "-");
  const v = Number(t);
  if (!/^-?\d+$/.test(t) || v < lo || v > hi) throw new Error(fill(w.bad, { s, lo, hi }));
  return v;
};

// ---------- symmetry ----------

function renderSymmetry(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const n = int(s.n, w, 1, 16);
  const S = Math.min(28, Math.floor(260 / (n + 1)));
  const x0 = 24;
  const y0 = 14;
  const parts: string[] = [];
  // Row i: i blue squares (the sum), then n + 1 − i orange ones (the same staircase turned round).
  for (let i = 1; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const blue = j < i;
      parts.push(`<rect x="${x0 + j * S}" y="${y0 + (i - 1) * S}" width="${S - 2}" height="${S - 2}" rx="3" fill="${blue ? "#d0ebff" : "#ffe8cc"}" stroke="${blue ? C.blue : C.orange}" stroke-width="1.2"/>`);
    }
  for (let i = 1; i <= n; i++) parts.push(txt(x0 - 6, y0 + (i - 1) * S + S / 2 + 4, String(i), { size: 11, color: C.blue, anchor: "end", bold: true }));
  parts.push(
    txt(x0 + ((n + 1) * S) / 2, y0 + n * S + 16, `n + 1 = ${n + 1}`, { size: 12.5, anchor: "middle", color: C.grey, bold: true }),
    txt(x0 + (n + 1) * S + 8, y0 + (n * S) / 2, `n = ${n}`, { size: 12.5, color: C.grey, bold: true }),
  );
  // The pairing: 1 + n, 2 + (n − 1), … all equal n + 1.
  const px = x0 + (n + 1) * S + 70;
  const shown = Math.min(n, 12);
  const pw = Math.min(30, Math.floor((W - px - 10) / shown));
  for (let i = 0; i < shown; i++) {
    const x = px + i * pw;
    parts.push(
      txt(x + pw / 2, y0 + 20, String(i + 1), { size: 13, anchor: "middle", color: C.blue, bold: true }),
      txt(x + pw / 2, y0 + 44, String(n - i), { size: 13, anchor: "middle", color: C.orange, bold: true }),
      `<line x1="${x + 4}" y1="${y0 + 52}" x2="${x + pw - 4}" y2="${y0 + 52}" stroke="#868e96"/>`,
      txt(x + pw / 2, y0 + 70, String(n + 1), { size: 13, anchor: "middle", color: C.purple, bold: true }),
    );
  }
  if (shown < n) parts.push(txt(px + shown * pw + 4, y0 + 44, "…", { size: 14, color: C.grey }));
  const caps: Caption[] = [
    { text: fill(w.sym.pairs, { n, m: n + 1 }), color: C.purple },
    { text: fill(w.sym.rect, { n, m: n + 1, a: n * (n + 1), s: (n * (n + 1)) / 2 }), color: C.blue },
    { text: w.info.symmetry, color: "#495057" },
  ];
  return compose(`1 + 2 + \\dots + ${n} = \\frac{${n}\\cdot${n + 1}}{2} = ${(n * (n + 1)) / 2}`, parts.join(""), y0 + n * S + 24, caps);
}

// ---------- pigeonhole ----------

function renderPigeonhole(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const caps: Caption[] = [];
  const parts: string[] = [];
  let boxes: { label: string; items: string[] }[];
  let tex: string;
  if (s.mode === "count") {
    const p = int(s.p, w, 1, 60);
    const h = int(s.h, w, 1, 12);
    boxes = Array.from({ length: h }, (_, i) => ({ label: String(i + 1), items: [] as string[] }));
    for (let k = 0; k < p; k++) boxes[k % h].items.push("●");
    const most = Math.ceil(p / h);
    caps.push({ text: fill(w.pig.count, { p, h, m: most }), color: most > 1 ? C.green : C.orange });
    tex = `\\left\\lceil \\frac{${p}}{${h}} \\right\\rceil = ${most}`;
  } else {
    const n = int(s.h, w, 2, 10);
    const nums = s.nums.split(/[\s,;]+/).filter(Boolean).map((x) => int(x, w, -9999, 9999));
    if (!nums.length || nums.length > 16) throw new Error(fill(w.bad, { s: s.nums, lo: 1, hi: 16 }));
    boxes = Array.from({ length: n }, (_, r) => ({ label: `r = ${r}`, items: [] as string[] }));
    for (const x of nums) boxes[((x % n) + n) % n].items.push(String(x));
    const twin = boxes.find((b) => b.items.length > 1);
    if (twin) {
      const [y, x] = twin.items.map(Number).sort((p, q) => p - q);
      caps.push({ text: fill(w.pig.same, { x, y, n, d: x - y, k: (x - y) / n }), color: C.green });
    } else caps.push({ text: fill(w.pig.none, { k: nums.length, n }), color: C.orange });
    if (nums.length <= n) caps.push({ text: fill(w.pig.few, { k: nums.length, n, m: n + 1 }), color: "#495057" });
    tex = `${nums.length}\\ \\text{numbers},\\ ${n}\\ \\text{${w.pig.holes}} \\pmod{${n}}`;
  }
  const most = Math.max(...boxes.map((b) => b.items.length));
  const per = Math.min(6, boxes.length);
  const bw = Math.floor((W - 32) / per);
  const rowsOf = (b: { items: string[] }) => Math.ceil(b.items.length / Math.max(1, Math.floor((bw - 16) / (s.mode === "count" ? 16 : 40))));
  const bh = Math.max(56, 30 + Math.max(...boxes.map(rowsOf)) * 20);
  boxes.forEach((b, i) => {
    const x = 16 + (i % per) * bw;
    const y = 8 + Math.floor(i / per) * (bh + 12);
    const full = b.items.length === most && most > 1;
    parts.push(
      `<rect x="${x + 4}" y="${y}" width="${bw - 8}" height="${bh}" rx="8" fill="${full ? "#d3f9d8" : "#f8f9fa"}" stroke="${full ? C.green : "#ced4da"}" stroke-width="${full ? 2 : 1.2}"/>`,
      txt(x + bw / 2, y + 16, b.label, { size: 12, anchor: "middle", color: C.grey, bold: true }),
    );
    const perRow = Math.max(1, Math.floor((bw - 16) / (s.mode === "count" ? 16 : 40)));
    b.items.forEach((it, k) => {
      const ix = x + 12 + (k % perRow) * (s.mode === "count" ? 16 : 40);
      const iy = y + 36 + Math.floor(k / perRow) * 20;
      parts.push(txt(ix + (s.mode === "count" ? 6 : 16), iy, it, { size: s.mode === "count" ? 15 : 13, anchor: "middle", color: full ? C.green : C.blue, bold: true }));
    });
  });
  const h = 8 + Math.ceil(boxes.length / per) * (bh + 12);
  caps.push({ text: w.info.pigeonhole, color: "#495057" });
  return compose(tex, parts.join(""), h, caps);
}

// ---------- domino tiling ----------

function parseCells(s: string, R: number, Cn: number, w: TacticsWords): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of s.split(/[\s;]+/).filter(Boolean)) {
    let m = tok.match(/^([a-z])(\d+)$/i);
    let rc: [number, number] | null = null;
    // Chess style: a1 is the bottom-left square.
    if (m) rc = [R - Number(m[2]), m[1].toLowerCase().charCodeAt(0) - 97];
    m = tok.match(/^(\d+),(\d+)$/);
    if (m) rc = [Number(m[1]) - 1, Number(m[2]) - 1];
    if (!rc || rc[0] < 0 || rc[0] >= R || rc[1] < 0 || rc[1] >= Cn) throw new Error(fill(w.tile.badCell, { s: tok }));
    out.push(rc);
  }
  return out;
}

function renderTiling(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const t = w.tile;
  const R = int(s.rows, w, 1, 10);
  const Cn = int(s.cols, w, 1, 10);
  const gone = new Set(parseCells(s.removed, R, Cn, w).map(([r, c]) => r * Cn + c));
  const black = (r: number, c: number) => (r + c) % 2 === 1;
  let nb = 0;
  let nw = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) if (!gone.has(r * Cn + c)) black(r, c) ? nb++ : nw++;
  // When the colours balance, look for a tiling: a perfect matching of white squares to black neighbours.
  let match: Map<number, number> | null = null;
  if (nb === nw) {
    const owner = new Map<number, number>();
    const nbrs = (id: number) => {
      const [r, c] = [Math.floor(id / Cn), id % Cn];
      return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as const).filter(([a, b]) => a >= 0 && a < R && b >= 0 && b < Cn && !gone.has(a * Cn + b)).map(([a, b]) => a * Cn + b);
    };
    const tryAug = (u: number, seen: Set<number>): boolean => {
      for (const v of nbrs(u)) {
        if (seen.has(v)) continue;
        seen.add(v);
        if (!owner.has(v) || tryAug(owner.get(v)!, seen)) {
          owner.set(v, u);
          return true;
        }
      }
      return false;
    };
    let ok = true;
    for (let r = 0; r < R && ok; r++) for (let c = 0; c < Cn && ok; c++) if (!black(r, c) && !gone.has(r * Cn + c)) ok = tryAug(r * Cn + c, new Set());
    match = ok ? owner : null;
  }
  const S = Math.min(40, Math.floor(320 / Math.max(R, Cn)));
  const x0 = (W - Cn * S) / 2;
  const y0 = 8;
  const parts: string[] = [];
  for (let r = 0; r < R; r++)
    for (let c = 0; c < Cn; c++) {
      const x = x0 + c * S;
      const y = y0 + r * S;
      if (gone.has(r * Cn + c)) {
        parts.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="#ffffff" stroke="#dee2e6"/>`, `<path d="M${x + 6},${y + 6}L${x + S - 6},${y + S - 6}M${x + S - 6},${y + 6}L${x + 6},${y + S - 6}" stroke="${C.red}" stroke-width="2"/>`);
      } else parts.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${black(r, c) ? "#495057" : "#f1f3f5"}" stroke="#adb5bd" stroke-width="0.6"/>`);
    }
  // Coordinates: a, b, c … along the bottom, 1, 2, 3 … up the side.
  for (let c = 0; c < Cn; c++) parts.push(txt(x0 + c * S + S / 2, y0 + R * S + 14, String.fromCharCode(97 + c), { size: 11, anchor: "middle", color: C.grey }));
  for (let r = 0; r < R; r++) parts.push(txt(x0 - 8, y0 + r * S + S / 2 + 4, String(R - r), { size: 11, anchor: "end", color: C.grey }));
  if (match)
    for (const [b, wt] of match) {
      const [r1, c1, r2_, c2] = [Math.floor(b / Cn), b % Cn, Math.floor(wt / Cn), wt % Cn];
      const x = x0 + Math.min(c1, c2) * S + 4;
      const y = y0 + Math.min(r1, r2_) * S + 4;
      parts.push(`<rect x="${x}" y="${y}" width="${(Math.abs(c1 - c2) + 1) * S - 8}" height="${(Math.abs(r1 - r2_) + 1) * S - 8}" rx="${S * 0.22}" fill="#74c0fc" fill-opacity="0.55" stroke="${C.blue}" stroke-width="2"/>`);
    }
  const caps: Caption[] = [{ text: fill(t.counts, { b: nb, w: nw }), color: "#495057" }];
  if ((nb + nw) % 2) caps.push({ text: fill(t.odd, { k: nb + nw }), color: C.red });
  else if (nb !== nw) caps.push({ text: fill(t.impossible, { b: nb, w: nw, d: (nb + nw) / 2 }), color: C.red });
  else if (match) caps.push({ text: fill(t.found, { d: (nb + nw) / 2 }), color: C.green });
  else caps.push({ text: t.none, color: C.orange });
  caps.push({ text: w.info.tiling, color: "#495057" });
  const tex = `${R} \\times ${Cn} - ${gone.size} = ${nb + nw}:\\quad ${nb}\\ \\blacksquare\\ \\ ${nw}\\ \\square`;
  return compose(tex, parts.join(""), y0 + R * S + 22, caps);
}

// ---------- extreme principle ----------

const NAMES = "ABCDEFGHIJKLMNO";

function parsePoints(s: string, w: TacticsWords): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of s.split(/[\s;]+/).filter(Boolean)) {
    const m = tok.match(/^\(?(\d+),(\d+)\)?$/);
    if (!m || Number(m[1]) > 12 || Number(m[2]) > 12) throw new Error(fill(w.ext.badPoint, { s: tok }));
    const pt: [number, number] = [Number(m[1]), Number(m[2])];
    if (out.some(([x, y]) => x === pt[0] && y === pt[1])) throw new Error(fill(w.ext.twice, { s: tok }));
    out.push(pt);
  }
  if (out.length < 2 || out.length > NAMES.length) throw new Error(fill(w.ext.few, { lo: 2, hi: NAMES.length }));
  return out;
}

/** √d², or the whole number when d² is a square. */
const root = (d2: number) => (Number.isInteger(Math.sqrt(d2)) ? String(Math.sqrt(d2)) : `√${d2}`);

function renderExtreme(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const e = w.ext;
  const pts = parsePoints(s.pts, w);
  const n = pts.length;
  const d2 = (i: number, j: number) => (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2;
  // All distances must differ, or "the nearest one" is not a single person.
  const pairOf = new Map<number, [number, number]>();
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const twin = pairOf.get(d2(i, j));
      if (twin) throw new Error(fill(e.ties, { a: NAMES[twin[0]] + NAMES[twin[1]], b: NAMES[i] + NAMES[j] }));
      pairOf.set(d2(i, j), [i, j]);
    }
  const aim = pts.map((_, i) => {
    let best = -1;
    for (let j = 0; j < n; j++) if (j !== i && (best < 0 || d2(i, j) < d2(i, best))) best = j;
    return best;
  });
  // The extreme object: the closest pair is each other's nearest, so they squirt each other.
  const dmin = Math.min(...pairOf.keys());
  const [a, b] = pairOf.get(dmin)!;
  const hit = new Set(aim);
  const dry = pts.map((_, i) => i).filter((i) => !hit.has(i));
  const span = Math.max(4, ...pts.flat());
  const S = Math.floor(300 / span);
  const x0 = (W - span * S) / 2;
  const y0 = 12;
  const X = (x: number) => x0 + x * S;
  const Y = (y: number) => y0 + (span - y) * S;
  const parts: string[] = [];
  for (let k = 0; k <= span; k++)
    parts.push(
      `<line x1="${X(k)}" y1="${Y(0)}" x2="${X(k)}" y2="${Y(span)}" stroke="#f1f3f5"/>`,
      `<line x1="${X(0)}" y1="${Y(k)}" x2="${X(span)}" y2="${Y(k)}" stroke="#f1f3f5"/>`,
    );
  parts.push(`<line x1="${X(pts[a][0])}" y1="${Y(pts[a][1])}" x2="${X(pts[b][0])}" y2="${Y(pts[b][1])}" stroke="#e5dbff" stroke-width="12" stroke-linecap="round"/>`);
  pts.forEach(([x, y], i) => {
    const [tx, ty] = pts[aim[i]];
    const L = Math.hypot(X(tx) - X(x), Y(ty) - Y(y));
    const [ux, uy] = [(X(tx) - X(x)) / L, (Y(ty) - Y(y)) / L];
    const pair = (i === a && aim[i] === b) || (i === b && aim[i] === a);
    parts.push(arrow(X(x) + ux * 10, Y(y) + uy * 10, X(tx) - ux * 10, Y(ty) - uy * 10, pair ? C.purple : C.blue, pair ? 2.6 : 1.8));
  });
  pts.forEach(([x, y], i) => {
    const isDry = !hit.has(i);
    parts.push(
      `<circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="${isDry ? "#d3f9d8" : "#ffffff"}" stroke="${isDry ? C.green : C.ink}" stroke-width="${isDry ? 2.4 : 1.4}"/>`,
      txt(X(x) + 9, Y(y) - 9, NAMES[i], { size: 13, color: isDry ? C.green : C.ink, bold: true }),
    );
  });
  const names = (ids: number[]) => (ids.length ? ids.map((i) => NAMES[i]).join(", ") : e.nobody);
  const caps: Caption[] = [{ text: fill(e.closest, { a: NAMES[a], b: NAMES[b], d: root(dmin) }), color: C.purple }];
  if (n % 2) caps.push({ text: fill(e.odd, { n, dry: names(dry) }), color: C.green });
  else caps.push({ text: fill(e.even, { n, dry: names(dry) }), color: dry.length ? C.green : C.orange });
  caps.push({ text: e.dry, color: "#495057" }, { text: w.info.extreme, color: "#495057" });
  const tex = `\\min d = d(${NAMES[a]}, ${NAMES[b]}) = ${Number.isInteger(Math.sqrt(dmin)) ? Math.sqrt(dmin) : `\\sqrt{${dmin}}`}`;
  return compose(tex, parts.join(""), y0 + span * S + 8, caps);
}

// ---------- parity ----------

function renderParity(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const p = w.par;
  const n = int(s.n, w, 1, 20);
  const t = int(s.t, w, -210, 210);
  const S = (n * (n + 1)) / 2;
  const r = S % 2;
  // Flipping +k to −k lowers the total by 2k, so the flipped numbers must add up to (S − t) / 2; for 1 … n a greedy
  // pick from the top always finds such a set when the half lies between 0 and S.
  const ok = Math.abs(t) <= S && (S - t) % 2 === 0;
  const flip = new Set<number>();
  if (ok) {
    let rest = (S - t) / 2;
    for (let k = n; k >= 1; k--)
      if (k <= rest) {
        flip.add(k);
        rest -= k;
      }
  }
  const cw = Math.min(46, Math.floor((W - 32) / n));
  const x0 = (W - n * cw) / 2;
  const y0 = 8;
  const parts: string[] = [];
  for (let k = 1; k <= n; k++) {
    const x = x0 + (k - 1) * cw;
    const neg = flip.has(k);
    const sign = ok ? (neg ? "−" : "+") : "±";
    parts.push(
      `<rect x="${x + 2}" y="${y0}" width="${cw - 4}" height="34" rx="5" fill="${neg ? "#ffe3e3" : ok ? "#d0ebff" : "#f1f3f5"}" stroke="${neg ? C.red : ok ? C.blue : "#adb5bd"}" stroke-width="1.3"/>`,
      txt(x + cw / 2, y0 + 22, `${sign}${k}`, { size: cw < 34 ? 11 : 13.5, anchor: "middle", color: neg ? C.red : ok ? C.blue : C.grey, bold: true }),
    );
    if (neg) parts.push(txt(x + cw / 2, y0 + 52, `−${2 * k}`, { size: cw < 34 ? 10 : 12, anchor: "middle", color: C.red }));
  }
  const caps: Caption[] = [{ text: fill(p.sum, { n, s: S, r }), color: "#495057" }];
  if (Math.abs(t) > S) caps.push({ text: fill(p.tooBig, { s: S, t }), color: C.red });
  else if (!ok) caps.push({ text: fill(p.parity, { r, t }), color: C.red });
  else {
    const ks = [...flip].sort((u, v) => u - v);
    caps.push({ text: fill(p.found, { t, r, ks: ks.length ? ks.join(", ") : "—", s: S, m: (S - t) / 2, d: S - t }), color: C.green });
  }
  caps.push({ text: w.info.parity, color: "#495057" });
  const tex = ok
    ? Array.from({ length: n }, (_, i) => (flip.has(i + 1) ? `- ${i + 1}` : i ? `+ ${i + 1}` : "1")).join(" ").replace(/^- 1/, "-1") + ` = ${t}`
    : `\\pm 1 \\pm 2 \\pm \\dots \\pm ${n} \\ne ${t}`;
  return compose(tex, parts.join(""), y0 + 60, caps);
}

// ---------- an invariant mod 3: the chameleons ----------

type Trio = [number, number, number];

/** Meetings of two chameleons of different colours (both take the third colour) until all are one colour, or null. */
export function chameleonPath(start: Trio): Trio[] | null {
  const T = start[0] + start[1] + start[2];
  const key = (v: Trio) => v[0] * (T + 1) + v[1];
  const done = (v: Trio) => v.filter((x) => x === 0).length >= 2;
  const prev = new Map<number, Trio | null>([[key(start), null]]);
  const queue: Trio[] = [start];
  for (let q = 0; q < queue.length; q++) {
    const v = queue[q];
    if (done(v)) {
      const path: Trio[] = [];
      for (let u: Trio | null = v; u; u = prev.get(key(u))!) path.unshift(u);
      return path;
    }
    for (const [i, j, k] of [[0, 1, 2], [0, 2, 1], [1, 2, 0]] as const) {
      if (!v[i] || !v[j]) continue;
      const u = [...v] as Trio;
      u[i]--;
      u[j]--;
      u[k] += 2;
      if (!prev.has(key(u))) {
        prev.set(key(u), v);
        queue.push(u);
      }
    }
  }
  return null;
}

const HUE: { line: string; fill: string }[] = [
  { line: C.red, fill: "#ffe3e3" },
  { line: C.green, fill: "#d3f9d8" },
  { line: C.blue, fill: "#d0ebff" },
];

function renderModular(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const m = w.mod;
  const v = s.abc.split(/[\s,;]+/).filter(Boolean).map((x) => int(x, w, 0, 40));
  if (v.length !== 3 || v.every((x) => x === 0)) throw new Error(m.badCounts);
  const start = v as Trio;
  const res = start.map((x) => x % 3) as Trio;
  const path = chameleonPath(start);
  // Rows: every meeting when there are few, otherwise the first eight, a gap for the meetings in between, and the last two.
  const steps = path ?? [start];
  const shown: (Trio | "gap")[] = steps.length <= 12 ? steps : [...steps.slice(0, 8), "gap", ...steps.slice(-2)];
  const cw = 64;
  const x0 = (W - 3 * cw - 70) / 2 + 40;
  const y0 = 8;
  const rh = 26;
  const parts: string[] = [];
  HUE.forEach((h, c) => parts.push(`<rect x="${x0 + c * cw + 6}" y="${y0}" width="${cw - 12}" height="10" rx="5" fill="${h.line}"/>`));
  shown.forEach((row, i) => {
    const y = y0 + 18 + i * rh;
    if (row === "gap") {
      parts.push(txt(x0 + 1.5 * cw, y + 17, fill(m.more, { k: steps.length - 9 }), { size: 12, anchor: "middle", color: C.grey }));
      return;
    }
    const step = steps.indexOf(row);
    parts.push(txt(x0 - 12, y + 17, String(step), { size: 12, anchor: "end", color: C.grey }));
    row.forEach((x, c) =>
      parts.push(
        `<rect x="${x0 + c * cw + 4}" y="${y}" width="${cw - 8}" height="${rh - 4}" rx="4" fill="${HUE[c].fill}" stroke="${HUE[c].line}" stroke-width="1.2"/>`,
        txt(x0 + c * cw + cw / 2, y + 16, String(x), { size: 13, anchor: "middle", color: HUE[c].line, bold: true }),
      ),
    );
    parts.push(txt(x0 + 3 * cw + 8, y + 16, `≡ ${row.map((x) => x % 3).join(", ")}`, { size: 12, color: C.purple }));
  });
  const caps: Caption[] = [{ text: fill(m.residues, { a: v[0], b: v[1], c: v[2], ra: res[0], rb: res[1], rc: res[2] }), color: C.purple }, { text: m.invariant, color: "#495057" }];
  if (path && path.length === 1) caps.push({ text: m.already, color: C.green });
  else if (path) caps.push({ text: fill(m.found, { k: path.length - 1 }), color: C.green });
  // The search fails exactly when all three remainders differ (tests/mental.test.ts checks it).
  else caps.push({ text: m.impossible, color: C.red });
  caps.push({ text: w.info.modular, color: "#495057" });
  const tex = `(${v.join(", ")}) \\equiv (${res.join(", ")}) \\pmod{3}`;
  return compose(tex, parts.join(""), y0 + 18 + shown.length * rh, caps);
}

// ---------- a monovariant: inversions ----------

export const inversions = (a: number[]) => a.reduce((s, x, i) => s + a.slice(i + 1).filter((y) => y < x).length, 0);

function renderMonovariant(s: TacticsSpec, w: TacticsWords): RenderedSvg {
  const mo = w.mono;
  const nums = s.nums.split(/[\s,;]+/).filter(Boolean).map((x) => int(x, w, -99, 99));
  if (nums.length < 2 || nums.length > 10) throw new Error(fill(mo.badList, { lo: 2, hi: 10 }));
  // Swap the leftmost neighbours that are out of order, again and again; any choice would do.
  const rows: { a: number[]; at: number }[] = [];
  const cur = [...nums];
  for (;;) {
    const at = cur.findIndex((x, i) => i + 1 < cur.length && x > cur[i + 1]);
    rows.push({ a: [...cur], at });
    if (at < 0) break;
    [cur[at], cur[at + 1]] = [cur[at + 1], cur[at]];
  }
  const k = rows.length - 1;
  const shown: ({ a: number[]; at: number; step: number } | "gap")[] =
    rows.length <= 12 ? rows.map((r, step) => ({ ...r, step })) : [...rows.slice(0, 8).map((r, step) => ({ ...r, step })), "gap", ...rows.slice(-2).map((r, i) => ({ ...r, step: rows.length - 2 + i }))];
  const cw = 40;
  const x0 = (W - nums.length * cw - 90) / 2 + 20;
  const y0 = 8;
  const rh = 28;
  const parts: string[] = [];
  shown.forEach((row, i) => {
    const y = y0 + i * rh;
    if (row === "gap") {
      parts.push(txt(x0 + (nums.length * cw) / 2, y + 17, fill(mo.more, { k: rows.length - 9 }), { size: 12, anchor: "middle", color: C.grey }));
      return;
    }
    row.a.forEach((x, c) => {
      const swap = row.at >= 0 && (c === row.at || c === row.at + 1);
      parts.push(
        `<rect x="${x0 + c * cw + 2}" y="${y}" width="${cw - 4}" height="${rh - 4}" rx="4" fill="${swap ? "#ffe8cc" : "#f8f9fa"}" stroke="${swap ? C.orange : "#ced4da"}" stroke-width="1.2"/>`,
        txt(x0 + c * cw + cw / 2, y + 17, String(x).replace("-", "−"), { size: 13, anchor: "middle", color: swap ? C.orange : C.ink, bold: swap }),
      );
    });
    if (row.at >= 0) parts.push(`<path d="M${x0 + row.at * cw + cw / 2},${y + rh - 3} q${cw / 2},8 ${cw},0" fill="none" stroke="${C.orange}" stroke-width="1.4"/>`);
    parts.push(txt(x0 + nums.length * cw + 12, y + 17, `inv = ${inversions(row.a)}`, { size: 12.5, color: inversions(row.a) ? C.purple : C.green, bold: true }));
  });
  const caps: Caption[] = k
    ? [
        { text: fill(mo.start, { k }), color: C.purple },
        { text: mo.step, color: "#495057" },
        { text: fill(mo.stop, { k }), color: C.green },
      ]
    : [{ text: mo.sorted, color: C.green }];
  caps.push({ text: w.info.monovariant, color: "#495057" });
  const tex = `\\mathrm{inv} = ${k <= 3 ? Array.from({ length: k + 1 }, (_, i) => k - i).join(" \\to ") : `${k} \\to ${k - 1} \\to \\dots \\to 0`}`;
  return compose(tex, parts.join(""), y0 + shown.length * rh, caps);
}

export function renderTactics(spec: TacticsSpec, words: TacticsWords): RenderedSvg {
  switch (spec.topic) {
    case "symmetry":
      return renderSymmetry(spec, words);
    case "pigeonhole":
      return renderPigeonhole(spec, words);
    case "extreme":
      return renderExtreme(spec, words);
    case "parity":
      return renderParity(spec, words);
    case "modular":
      return renderModular(spec, words);
    case "tiling":
      return renderTiling(spec, words);
    case "monovariant":
      return renderMonovariant(spec, words);
  }
}

const P = (topic: TacticsTopic, o: Partial<TacticsSpec>): TacticsSpec => ({ topic, n: "10", p: "10", h: "9", mode: "count", nums: "", rows: "8", cols: "8", removed: "", pts: "", t: "0", abc: "13 15 17", ...o });
export const TACTICS_PRESETS: { [K in TacticsTopic]: { label: string; spec: TacticsSpec }[] } = {
  symmetry: [
    { label: "1 + … + 10", spec: P("symmetry", { n: "10" }) },
    { label: "1 + … + 6", spec: P("symmetry", { n: "6" }) },
    { label: "1 + … + 16", spec: P("symmetry", { n: "16" }) },
  ],
  extreme: [
    { label: "5 people", spec: P("extreme", { pts: "0,3 9,7 7,5 9,4 3,0" }) },
    { label: "7 people", spec: P("extreme", { pts: "4,10 1,4 9,3 6,5 1,10 4,3 10,1" }) },
    { label: "4 people, all hit", spec: P("extreme", { pts: "5,7 9,1 8,3 6,10" }) },
    { label: "6 people, two dry", spec: P("extreme", { pts: "0,4 2,3 7,9 0,9 3,10 9,1" }) },
  ],
  pigeonhole: [
    { label: "10 pigeons, 9 holes", spec: P("pigeonhole", { p: "10", h: "9" }) },
    { label: "25 into 6", spec: P("pigeonhole", { p: "25", h: "6" }) },
    { label: "6 numbers mod 5", spec: P("pigeonhole", { mode: "residues", nums: "17, 42, 8, 91, 33, 64", h: "5" }) },
    { label: "4 numbers mod 5", spec: P("pigeonhole", { mode: "residues", nums: "3, 11, 24, 40", h: "5" }) },
  ],
  parity: [
    { label: "±1 … ±10 = 0", spec: P("parity", { n: "10", t: "0" }) },
    { label: "±1 … ±8 = 0", spec: P("parity", { n: "8", t: "0" }) },
    { label: "±1 … ±7 = 4", spec: P("parity", { n: "7", t: "4" }) },
    { label: "±1 … ±12 = 50", spec: P("parity", { n: "12", t: "50" }) },
  ],
  modular: [
    { label: "13, 15, 17", spec: P("modular", { abc: "13 15 17" }) },
    { label: "4, 7, 10", spec: P("modular", { abc: "4 7 10" }) },
    { label: "3, 5, 7", spec: P("modular", { abc: "3 5 7" }) },
    { label: "1, 2, 3", spec: P("modular", { abc: "1 2 3" }) },
  ],
  tiling: [
    { label: "Opposite corners removed", spec: P("tiling", { removed: "a1 h8" }) },
    { label: "Two adjacent removed", spec: P("tiling", { removed: "a1 b1" }) },
    { label: "Same colour, far apart", spec: P("tiling", { removed: "a1 c3" }) },
    { label: "4 × 4, one corner", spec: P("tiling", { rows: "4", cols: "4", removed: "a1" }) },
    { label: "3 × 4, a corner cut off", spec: P("tiling", { rows: "3", cols: "4", removed: "1,2 2,1 2,4 3,3" }) },
  ],
  monovariant: [
    { label: "5 3 4 1 2", spec: P("monovariant", { nums: "5 3 4 1 2" }) },
    { label: "Reversed 1 … 6", spec: P("monovariant", { nums: "6 5 4 3 2 1" }) },
    { label: "Nearly in order", spec: P("monovariant", { nums: "1 2 4 3 5 7 6" }) },
  ],
};
