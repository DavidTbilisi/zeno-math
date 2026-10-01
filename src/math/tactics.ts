// Problem-solving tactics (after Zeitz, The Art and Craft of Problem Solving, via the Neural OS notes):
// symmetry — 1 + 2 + … + n as a staircase and its turned copy filling a rectangle; the pigeonhole
// principle — by counts, or numbers sorted into boxes by their remainder; and invariants by colouring —
// can dominoes tile a board with some squares removed? The chessboard colouring settles it when the
// colours do not balance, and otherwise a search either finds a tiling or shows there is none.
import { cell, txt } from "./algoArrays";
import { C, compose, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type TacticsTopic = "symmetry" | "pigeonhole" | "tiling";
export const TACTICS_TOPICS: TacticsTopic[] = ["symmetry", "pigeonhole", "tiling"];
export type PigeonMode = "count" | "residues";
export const PIGEON_MODES: PigeonMode[] = ["count", "residues"];

/**
 * symmetry: n · pigeonhole: p pigeons in h holes (count), or the numbers in nums sorted by remainder mod h
 * (residues) · tiling: a rows × cols board without the squares in removed ("a1 h8" or "1,1 8,8").
 */
export type TacticsSpec = { topic: TacticsTopic; n: string; p: string; h: string; mode: PigeonMode; nums: string; rows: string; cols: string; removed: string };

export type TacticsWords = {
  bad: string;
  info: Record<TacticsTopic, string>;
  sym: { pairs: string; rect: string };
  pig: { count: string; boxes: string; few: string; same: string; none: string; holes: string };
  tile: { counts: string; impossible: string; found: string; none: string; badCell: string; odd: string; black: string; white: string };
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

export function renderTactics(spec: TacticsSpec, words: TacticsWords): RenderedSvg {
  switch (spec.topic) {
    case "symmetry":
      return renderSymmetry(spec, words);
    case "pigeonhole":
      return renderPigeonhole(spec, words);
    case "tiling":
      return renderTiling(spec, words);
  }
}

const P = (topic: TacticsTopic, o: Partial<TacticsSpec>): TacticsSpec => ({ topic, n: "10", p: "10", h: "9", mode: "count", nums: "", rows: "8", cols: "8", removed: "", ...o });
export const TACTICS_PRESETS: { [K in TacticsTopic]: { label: string; spec: TacticsSpec }[] } = {
  symmetry: [
    { label: "1 + … + 10", spec: P("symmetry", { n: "10" }) },
    { label: "1 + … + 6", spec: P("symmetry", { n: "6" }) },
    { label: "1 + … + 16", spec: P("symmetry", { n: "16" }) },
  ],
  pigeonhole: [
    { label: "10 pigeons, 9 holes", spec: P("pigeonhole", { p: "10", h: "9" }) },
    { label: "25 into 6", spec: P("pigeonhole", { p: "25", h: "6" }) },
    { label: "6 numbers mod 5", spec: P("pigeonhole", { mode: "residues", nums: "17, 42, 8, 91, 33, 64", h: "5" }) },
    { label: "4 numbers mod 5", spec: P("pigeonhole", { mode: "residues", nums: "3, 11, 24, 40", h: "5" }) },
  ],
  tiling: [
    { label: "Opposite corners removed", spec: P("tiling", { removed: "a1 h8" }) },
    { label: "Two adjacent removed", spec: P("tiling", { removed: "a1 b1" }) },
    { label: "Same colour, far apart", spec: P("tiling", { removed: "a1 c3" }) },
    { label: "4 × 4, one corner", spec: P("tiling", { rows: "4", cols: "4", removed: "a1" }) },
    { label: "3 × 4, a corner cut off", spec: P("tiling", { rows: "3", cols: "4", removed: "1,2 2,1 2,4 3,3" }) },
  ],
};
