// Long division as fair sharing with base-ten blocks: the panel drawn next to the written working.
// Each step of planDivision shares one place among b groups. The quotient digit is how many blocks
// of that place each group gets; what is left over is traded for ten times as many of the next
// place (that is the "bring down"). The blocks still in the pool at the end are the remainder.
import type { DivisionPlan } from "./division";
import { blockSvg, PV_VALUE, type Counts, type PVKind } from "./placeValue";

/** Blocks only make sense for small whole numbers: at most 9 groups and no thousands block. */
export const BLOCKS_LIMITS = { a: 999, b: 9 };
export const blocksFit = (a: number, b: number, decimals: number) => decimals === 0 && a <= BLOCKS_LIMITS.a && b <= BLOCKS_LIMITS.b;

const KIND_BY_EXP: PVKind[] = ["o", "t", "h"];
const LOWER: Partial<Record<PVKind, PVKind>> = { h: "t", t: "o" };

export type BlocksState = {
  pool: Counts; // blocks not shared yet (at the end: the remainder)
  group: Counts; // what each group holds
  fresh: PVKind | null; // the place shared in the latest step
  trades: { kind: PVKind; n: number }[]; // the latest step's trades: n of kind → 10n of the next place
};

/** The blocks after the first k steps of the plan. */
export function blocksState(plan: DivisionPlan, b: number, k: number): BlocksState {
  const kindAt = (pos: number) => KIND_BY_EXP[plan.intLen - 1 - pos];
  const pool: Counts = { h: 0, t: 0, o: 0 };
  plan.digits.slice(0, plan.intLen).forEach((d, c) => (pool[kindAt(c)] = d));
  const group: Counts = { h: 0, t: 0, o: 0 };
  let trades: BlocksState["trades"] = [];
  const trade = (kind: PVKind) => {
    const n = pool[kind];
    if (!n) return;
    trades.push({ kind, n });
    pool[LOWER[kind]!] += 10 * n;
    pool[kind] = 0;
  };
  plan.steps.slice(0, k).forEach((s, i) => {
    trades = [];
    // The first step may start on a prefix (12 of 125 ÷ 3): the places before it are traded down first.
    if (i === 0) for (let c = 0; c < plan.first; c++) trade(kindAt(c));
    const kind = kindAt(s.pos);
    group[kind] = s.q;
    pool[kind] -= s.q * b;
    if (s.pos + 1 < plan.intLen) trade(kind);
  });
  return { pool, group, fresh: k > 0 ? kindAt(plan.steps[k - 1].pos) : null, trades };
}

// ---------- Layout ----------

const INK = "#1e1e1e";
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const GREEN = "#2f9e44";
const SANS = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;

// Blocks drawn at half size or so. Tens come in bundles of ten rods and ones in ten-frames
// (2 rows of 5), so a traded block is visibly one bundle of ten.
const SIZE: Record<PVKind, { w: number; h: number }> = { h: { w: 28, h: 28 }, t: { w: 4, h: 40 }, o: { w: 8, h: 8 } };
type Box = { x: number; y: number; w: number; h: number };
type Pile = { blocks: { x: number; y: number }[]; bundles: Box[]; w: number; h: number };

/** n blocks of one kind, perRow bundles of ten side by side (flats: perRow·3 in a row). */
function pile(kind: PVKind, n: number, perRow: number): Pile {
  const blocks: { x: number; y: number }[] = [];
  const bundles: Box[] = [];
  if (kind === "h") {
    const cols = Math.min(n, 3 * perRow);
    for (let i = 0; i < n; i++) blocks.push({ x: (i % cols) * 31, y: Math.floor(i / cols) * 31 });
  } else {
    const [pitch, bw, bh, bx, by] = kind === "t" ? [6, 58, 40, 66, 48] : [10, 48, 18, 56, 24];
    for (let i = 0; i < n; i++) {
      const j = Math.floor(i / 10);
      const ox = (j % perRow) * bx;
      const oy = Math.floor(j / perRow) * by;
      if (i % 10 === 0) bundles.push({ x: ox, y: oy, w: bw, h: bh });
      blocks.push(kind === "t" ? { x: ox + (i % 10) * pitch, y: oy } : { x: ox + (i % 5) * pitch, y: oy + Math.floor((i % 10) / 5) * pitch });
    }
  }
  const w = Math.max(0, ...blocks.map((p) => p.x + SIZE[kind].w));
  const h = Math.max(0, ...blocks.map((p) => p.y + SIZE[kind].h));
  return { blocks, bundles, w, h };
}

const drawBlock = (kind: PVKind, x: number, y: number) =>
  blockSvg(kind).replace(/width="[\d.]+" height="[\d.]+"/, `x="${x}" y="${y}" width="${SIZE[kind].w}" height="${SIZE[kind].h}"`);
const rect = (b: Box, stroke: string, dash = true, pad = 3) =>
  `<rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + 2 * pad}" height="${b.h + 2 * pad}" rx="4" fill="none" stroke="${stroke}" stroke-width="1.5"${dash ? ' stroke-dasharray="4 3"' : ""}/>`;
const text = (x: number, y: number, s: string, color: string, size: number, anchor = "start") =>
  `<text x="${x}" y="${y}" ${SANS} font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${color}">${s}</text>`;

/** The places side by side (hundreds | tens | ones), each a pile; only the places present take room. */
function arrange(counts: Counts, perRow: number) {
  let x = 0;
  const piles: { kind: PVKind; x: number; pile: Pile }[] = [];
  for (const kind of ["h", "t", "o"] as PVKind[]) {
    if (!counts[kind]) continue;
    const p = pile(kind, counts[kind], perRow);
    piles.push({ kind, x, pile: p });
    x += p.w + 12;
  }
  return { piles, w: Math.max(0, x - 12), h: Math.max(0, ...piles.map((p) => p.pile.h)) };
}

function drawArranged(a: ReturnType<typeof arrange>, ox: number, oy: number, mark: (kind: PVKind, p: Pile, x: number) => string): string {
  return a.piles
    .map(({ kind, x, pile: p }) => p.blocks.map((b) => drawBlock(kind, ox + x + b.x, oy + b.y)).join("") + mark(kind, p, ox + x))
    .join("");
}

const value = (c: Counts) => c.h * 100 + c.t * 10 + c.o;

/** The panel for step k: the pool on top, the b groups below. Drawn from (0, 0). */
export function renderBlocksPanel(plan: DivisionPlan, b: number, k: number): { svg: string; width: number; height: number } {
  const st = blocksState(plan, b, k);
  const done = k >= plan.steps.length;
  const out: string[] = [];
  const PAD = 10;
  const GAP = 10;

  const g = arrange(st.group, 1);
  const gw = Math.max(70, g.w + 2 * PAD);
  const gh = Math.max(56, g.h + 2 * PAD);
  const rowW = b * gw + (b - 1) * GAP;

  const p = arrange(st.pool, 3);
  const pw = Math.max(rowW, p.w + 2 * PAD);
  const ph = Math.max(48, p.h + 2 * PAD);

  // The pool: what is still to share. At the end it holds the remainder.
  const poolTop = 26;
  out.push(text(0, 18, String(value(st.pool)), done && value(st.pool) ? ORANGE : INK, 17));
  out.push(`<rect x="0" y="${poolTop}" width="${pw}" height="${ph}" rx="8" fill="#f8f9fa" stroke="#adb5bd" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  const traded = new Map(st.trades.map((t) => [LOWER[t.kind]!, t.n]));
  out.push(
    drawArranged(p, PAD, poolTop + PAD, (kind, pl, x) =>
      pl.bundles
        .slice(0, traded.get(kind) ?? 0)
        .map((bx) => rect({ ...bx, x: x + bx.x, y: poolTop + PAD + bx.y }, BLUE))
        .join(""),
    ),
  );

  // What was traded in this step, e.g. 1 × 100 = 10 × 10, in the blue of the brought-down digit.
  let y = poolTop + ph;
  if (st.trades.length) {
    y += 22;
    out.push(text(0, y, st.trades.map((t) => `${t.n} × ${PV_VALUE[t.kind]} = ${10 * t.n} × ${PV_VALUE[t.kind] / 10}`).join("  ·  "), BLUE, 15));
  }

  // The groups: each gets the same share; this step's share is outlined in the quotient's green.
  const groupTop = y + 16;
  for (let i = 0; i < b; i++) {
    const x = i * (gw + GAP);
    out.push(`<rect x="${x}" y="${groupTop}" width="${gw}" height="${gh}" rx="8" fill="#ffffff" stroke="#868e96" stroke-width="1.5"/>`);
    const cx = x + (gw - g.w) / 2;
    out.push(
      drawArranged(g, cx, groupTop + PAD, (kind, pl, px) =>
        kind === st.fresh ? rect({ x: px, y: groupTop + PAD, w: pl.w, h: pl.h }, GREEN) : "",
      ),
    );
    out.push(text(x + gw / 2, groupTop + gh + 20, String(value(st.group)), GREEN, 17, "middle"));
  }

  const width = Math.max(pw, rowW, st.trades.length ? 200 : 0);
  return { svg: out.join(""), width, height: groupTop + gh + 28 };
}
