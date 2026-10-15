// Multiplication models, from counting to algebra: equal groups, arrays, number-line jumps
// the place-value area model and the lattice (gelosia) method. a × b reads "a groups of b". `step` reveals the model
// one group / row / jump / cell at a time (a large value shows everything). A factor may be 0: a groups of nothing,
// or no groups at all. Under a special case (× 0 or × 1) its rule is written in symbols, n × 0 = 0 or n × 1 = n.
import type { RenderedSvg } from "./latex";

export type MultiplyStyle = "groups" | "array" | "numberline" | "area" | "lattice";
export const MULTIPLY_STYLES: MultiplyStyle[] = ["groups", "array", "numberline", "area", "lattice"];

export type MultiplySpec = { type: "multiply"; style: MultiplyStyle; a: number; b: number; step: number };

export const MULTIPLY_LIMITS: Record<MultiplyStyle, { a: number; b: number }> = {
  groups: { a: 10, b: 12 },
  array: { a: 12, b: 12 },
  numberline: { a: 10, b: 12 },
  area: { a: 999, b: 999 },
  lattice: { a: 99999, b: 99999 },
};

const INK = "#1e1e1e";
const FONT = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
const PAD = 16;
const DOT = { fill: "#a5d8ff", stroke: "#1971c2" };
const ALT = { fill: "#b2f2bb", stroke: "#2f9e44" };
const CELLS = [
  { fill: "#a5d8ff", stroke: "#1971c2" },
  { fill: "#ffd8a8", stroke: "#e8590c" },
  { fill: "#b2f2bb", stroke: "#2f9e44" },
  { fill: "#eebefa", stroke: "#9c36b5" },
  { fill: "#ffec99", stroke: "#f08c00" },
  { fill: "#ffc9c9", stroke: "#e03131" },
];

const text = (x: number, y: number, s: string, o: { size?: number; anchor?: string; color?: string; bold?: boolean } = {}) =>
  `<text x="${Math.round(x * 10) / 10}" y="${Math.round(y * 10) / 10}" font-size="${o.size ?? 16}" text-anchor="${o.anchor ?? "middle"}" fill="${o.color ?? INK}"${o.bold ? ' font-weight="700"' : ""}>${s}</text>`;
const width = (s: string, size = 16) => s.length * size * 0.56;

function wrap(w: number, h: number, body: string): RenderedSvg {
  const W = Math.ceil(w);
  const H = Math.ceil(h);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g ${FONT}>${body}</g></svg>`, width: W, height: H };
}

/** 234 → [200, 30, 4] (zero parts dropped); used by the area model. */
export function placeParts(n: number): number[] {
  const parts = String(n)
    .split("")
    .map((d, i, all) => Number(d) * 10 ** (all.length - 1 - i))
    .filter((v) => v > 0);
  return parts.length ? parts : [0];
}

/**
 * The special cases of multiplication: anything times 0 is 0, and anything times 1 is itself (either way round). When
 * both apply (0 × 1), it is the 0 that decides.
 */
export type MultiplyCase = "zero" | "one";
export const multiplyCase = (a: number, b: number): MultiplyCase | null =>
  a === 0 || b === 0 ? "zero" : a === 1 || b === 1 ? "one" : null;

/** The rule a special case follows, written the way round the numbers are: n × 0 = 0, 0 × n = 0, n × 1 = n, 1 × n = n. */
export function multiplyRule(a: number, b: number): string | null {
  const c = multiplyCase(a, b);
  if (c === "zero") return b === 0 ? "n × 0 = 0" : "0 × n = 0";
  if (c === "one") return b === 1 ? "n × 1 = n" : "1 × n = n";
  return null;
}

/** How many reveal steps a model has. */
export function stepCount(spec: MultiplySpec): number {
  if (spec.style === "area") return placeParts(spec.a).length * placeParts(spec.b).length;
  if (spec.style === "lattice") {
    const [m, n] = [String(spec.a).length, String(spec.b).length];
    return m * n + m + n; // every cell, then every diagonal
  }
  return spec.a;
}

function groups({ a, b }: MultiplySpec, k: number) {
  const cols = Math.max(1, Math.min(b, 5)); // a group of 0 is still drawn, empty
  const rows = Math.max(1, Math.ceil(b / 5));
  const P = 22;
  const gw = cols * P + 20;
  const gh = rows * P + 20;
  const perRow = Math.max(1, Math.min(a, 5));
  const out: string[] = [];
  for (let g = 0; g < a; g++) {
    const gx = PAD + (g % perRow) * (gw + 18);
    const gy = PAD + Math.floor(g / perRow) * (gh + 44);
    const shown = g < k;
    out.push(
      `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="${Math.min(gw, gh) / 2}" fill="${shown ? "#fff4e6" : "none"}" stroke="${shown ? "#e8590c" : "#ced4da"}" stroke-width="2"${shown ? "" : ' stroke-dasharray="6 5"'}/>`,
    );
    if (!shown) continue;
    for (let i = 0; i < b; i++)
      out.push(`<circle cx="${gx + 10 + (i % 5) * P + P / 2}" cy="${gy + 10 + Math.floor(i / 5) * P + P / 2}" r="8" fill="${DOT.fill}" stroke="${DOT.stroke}" stroke-width="1.5"/>`);
    out.push(text(gx + gw / 2, gy + gh + 24, String((g + 1) * b), { bold: true, color: "#e8590c" })); // skip count
  }
  const lines = Math.ceil(a / perRow);
  const eqY = PAD + lines * (gh + 44) + 8;
  const sums = Array(k).fill(b).join(" + ");
  const eq = k >= a ? `${a} × ${b} = ${a > 1 ? `${sums} = ` : ""}${a * b}` : `${sums || "0"} = ${k * b}`;
  out.push(text(PAD, eqY, eq, { anchor: "start", size: 22, bold: true }));
  return wrap(Math.max(PAD * 2 + perRow * (gw + 18) - 18, PAD * 2 + width(eq, 22)), eqY + PAD, out.join(""));
}

function array({ a, b }: MultiplySpec, k: number) {
  const P = 30;
  const out: string[] = [];
  const x0 = PAD + 8;
  const y0 = PAD + 8;
  for (let r = 0; r < a; r++) {
    const c = r % 2 ? ALT : DOT;
    for (let col = 0; col < b; col++) {
      const cx = x0 + col * P + P / 2;
      const cy = y0 + r * P + P / 2;
      out.push(
        r < k
          ? `<circle cx="${cx}" cy="${cy}" r="10" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>`
          : `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#dee2e6" stroke-width="1.5"/>`,
      );
    }
    if (r < k) out.push(text(x0 + b * P + 18, y0 + r * P + P / 2 + 6, String((r + 1) * b), { anchor: "start", bold: true, color: c.stroke }));
  }
  const eqY = y0 + a * P + 36;
  const done = k >= a;
  const eq1 = done ? `${a} × ${b} = ${a * b}` : `${k} × ${b} = ${k * b}`;
  out.push(text(PAD, eqY, eq1, { anchor: "start", size: 22, bold: true }));
  if (done && a !== b) out.push(text(PAD, eqY + 28, `${b} × ${a} = ${a * b}`, { anchor: "start", size: 18, color: "#868e96" }));
  return wrap(Math.max(x0 + b * P + 60, PAD * 2 + width(eq1, 22)), eqY + (done && a !== b ? 28 : 0) + PAD, out.join(""));
}

function numberline({ a, b }: MultiplySpec, k: number) {
  const L = a * b;
  const end = Math.max(L, b, 4); // with a product of 0 the line still runs on a little
  const unit = Math.max(4, Math.min(36, 560 / (end + 1)));
  const x0 = PAD + 12;
  const lineY = PAD + 90;
  const X = (v: number) => x0 + v * unit;
  const out: string[] = [];
  out.push(
    `<defs><marker id="j" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#e8590c"/></marker></defs>`,
    `<line x1="${X(0) - 8}" y1="${lineY}" x2="${X(end) + 16}" y2="${lineY}" stroke="${INK}" stroke-width="2"/>`,
  );
  const everyUnit = unit >= 9;
  for (let v = 0; v <= end; v++) {
    const major = b === 0 ? v === 0 : v % b === 0;
    if (!major && !everyUnit) continue;
    out.push(`<line x1="${X(v)}" y1="${lineY - (major ? 8 : 5)}" x2="${X(v)}" y2="${lineY + (major ? 8 : 5)}" stroke="${INK}" stroke-width="${major ? 2 : 1}"/>`);
    if (major) {
      const landed = v > 0 && v / b <= k && v <= L;
      out.push(text(X(v), lineY + 28, String(v), { bold: landed, color: landed ? "#e8590c" : INK, size: landed ? 17 : 14 }));
    }
  }
  const arcH = Math.min(60, 18 + b * unit * 0.35);
  for (let i = 0; i < k && i < a && b > 0; i++) {
    const s = X(i * b);
    const e = X((i + 1) * b);
    out.push(`<path d="M${s},${lineY - 4} Q${(s + e) / 2},${lineY - 4 - arcH * 2} ${e},${lineY - 4}" fill="none" stroke="#e8590c" stroke-width="2.5" marker-end="url(#j)"/>`);
    out.push(text((s + e) / 2, lineY - 4 - arcH - 6, `+${b}`, { bold: true, color: "#e8590c", size: 14 }));
  }
  // Jumps of 0 go nowhere: one loop at 0 for the jumps made so far.
  if (b === 0 && Math.min(k, a) > 0) {
    const x = X(0);
    out.push(`<path d="M${x - 3},${lineY - 6} C${x - 26},${lineY - 56} ${x + 26},${lineY - 56} ${x + 3},${lineY - 6}" fill="none" stroke="#e8590c" stroke-width="2.5" marker-end="url(#j)"/>`);
    out.push(text(x - 12, lineY - 52, Array(Math.min(k, a)).fill("+0").join(" "), { bold: true, color: "#e8590c", size: 14, anchor: "start" }));
  }
  const eqY = lineY + 70;
  const eq = k >= a ? `${a} × ${b} = ${a * b}` : `${k} × ${b} = ${k * b}`;
  out.push(text(PAD, eqY, eq, { anchor: "start", size: 22, bold: true }));
  return wrap(Math.max(X(end) + 40, PAD * 2 + width(eq, 22)), eqY + PAD, out.join(""));
}

function area({ a, b }: MultiplySpec, k: number) {
  const rowsP = placeParts(a); // height parts (a)
  const colsP = placeParts(b); // width parts (b)
  // Sizes proportional to the parts, but never thinner than MIN so small parts stay readable.
  const size = (parts: number[], total: number, MIN: number) => {
    const raw = parts.map((p) => (p / Math.max(1, parts.reduce((s, x) => s + x, 0))) * total);
    return raw.map((r) => Math.max(MIN, r));
  };
  // Keep the rectangle's aspect ≈ a : b so it really has "area a × b" (within readable bounds).
  const ws = size(colsP, 460, 92);
  const hs = size(rowsP, b ? Math.min(320, Math.max(120, (460 * a) / b)) : 120, 58);
  const x0 = PAD + 56;
  const y0 = PAD + 34;
  const out: string[] = [];
  let n = 0;
  const products: number[] = [];
  let y = y0;
  rowsP.forEach((rp, i) => {
    let x = x0;
    colsP.forEach((cp, j) => {
      const c = CELLS[(i * colsP.length + j) % CELLS.length];
      const shown = n < k;
      const empty = rp * cp === 0; // a side of 0: the rectangle has no area, drawn as an outline only
      out.push(`<rect x="${x}" y="${y}" width="${ws[j]}" height="${hs[i]}" fill="${shown && !empty ? c.fill : "#ffffff"}" stroke="${shown ? c.stroke : "#ced4da"}" stroke-width="2"${empty ? ' stroke-dasharray="6 5"' : ""}/>`);
      if (shown) {
        out.push(text(x + ws[j] / 2, y + hs[i] / 2 - 2, `${rp} × ${cp}`, { size: 14 }));
        out.push(text(x + ws[j] / 2, y + hs[i] / 2 + 18, String(rp * cp), { size: 18, bold: true, color: c.stroke }));
        products.push(rp * cp);
      }
      n++;
      x += ws[j];
    });
    out.push(text(x0 - 10, y + hs[i] / 2 + 6, String(rp), { anchor: "end", bold: true, size: 18 }));
    y += hs[i];
  });
  let x = x0;
  colsP.forEach((cp, j) => {
    out.push(text(x + ws[j] / 2, y0 - 12, String(cp), { bold: true, size: 18 }));
    x += ws[j];
  });
  const done = k >= n;
  const eq = done
    ? `${a} × ${b} = ${products.length > 1 ? `${products.join(" + ")} = ` : ""}${a * b}`
    : `${products.join(" + ") || "0"}${products.length ? " + …" : ""}`;
  const eqY = y + 40;
  out.push(text(PAD, eqY, eq, { anchor: "start", size: 22, bold: true }));
  const W = x0 + ws.reduce((s, v) => s + v, 0) + PAD;
  return wrap(Math.max(W, PAD * 2 + width(eq, 22)), eqY + PAD, out.join(""));
}

/**
 * Lattice (gelosia) multiplication: a's digits across the top, b's down the right. Each cell holds
 * the product of its two digits, tens above the diagonal and units below; the diagonal bands are
 * then added from the bottom right, carrying into the next band, and the answer is read down the
 * left side and along the bottom. Steps: every cell (row by row), then every band.
 */
function lattice({ a, b }: MultiplySpec, k: number) {
  const A = String(a).split("").map(Number);
  const B = String(b).split("").map(Number);
  const m = A.length;
  const n = B.length;
  const S = Math.min(72, 380 / Math.max(m, n));
  const D = S * 0.62; // how far the bands reach out of the grid
  const x0 = PAD + D + 20;
  const y0 = PAD + 34;
  const cellsShown = Math.min(k, m * n);
  const bandsShown = Math.max(0, k - m * n);
  const place = (i: number, j: number) => m - 1 - j + (n - 1 - i); // place value of a cell's units digit
  // Band sums, carries and the answer digits.
  const sums: number[][] = Array.from({ length: m + n }, () => []);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const p = A[j] * B[i];
      sums[place(i, j)].push(p % 10);
      sums[place(i, j) + 1].push(Math.floor(p / 10));
    }
  const carryIn: number[] = [0];
  const digit: number[] = [];
  sums.forEach((list, q) => {
    const total = list.reduce((s, v) => s + v, 0) + carryIn[q];
    digit.push(total % 10);
    carryIn.push(Math.floor(total / 10));
  });
  const BAND = ["#d0ebff", "#fff3bf"];
  const out: string[] = [];
  const bandFill = (q: number) => (q < bandsShown ? (q === bandsShown - 1 && bandsShown < m + n ? "#ffd8a8" : BAND[q % 2]) : "#ffffff");
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const x = x0 + j * S;
      const y = y0 + i * S;
      const q = place(i, j);
      out.push(
        `<polygon points="${x},${y} ${x + S},${y} ${x},${y + S}" fill="${bandFill(q + 1)}"/>`,
        `<polygon points="${x + S},${y} ${x + S},${y + S} ${x},${y + S}" fill="${bandFill(q)}"/>`,
        `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
        `<line x1="${x + S}" y1="${y}" x2="${x}" y2="${y + S}" stroke="#868e96" stroke-width="1.2"/>`,
      );
      if (i * m + j < cellsShown) {
        const p = A[j] * B[i];
        const fs = S * 0.34;
        out.push(text(x + S * 0.3, y + S * 0.4, String(Math.floor(p / 10)), { size: fs, bold: true, color: "#1971c2" }));
        out.push(text(x + S * 0.7, y + S * 0.86, String(p % 10), { size: fs, bold: true, color: "#e8590c" }));
      }
    }
  // The diagonals continue out of the grid to separate the answer digits.
  const ext = (x: number, y: number) => `<line x1="${x}" y1="${y}" x2="${x - D}" y2="${y + D}" stroke="#868e96" stroke-width="1.2"/>`;
  for (let j = 1; j <= m; j++) out.push(ext(x0 + j * S, y0 + n * S));
  for (let i = 0; i <= n; i++) out.push(ext(x0, y0 + i * S));
  // Digit labels: a on top, b on the right.
  A.forEach((d, j) => out.push(text(x0 + j * S + S / 2, y0 - 12, String(d), { size: 22, bold: true })));
  B.forEach((d, i) => out.push(text(x0 + m * S + 20, y0 + i * S + S / 2 + 8, String(d), { size: 22, bold: true })));
  out.push(text(x0 + m * S + 20, y0 - 12, "×", { size: 20, color: "#868e96" }));
  // Answer digits (and carries) for the bands added so far.
  const at = (q: number): [number, number] =>
    q < m ? [x0 + (m - 1 - q + 0.5) * S - D * 0.5, y0 + n * S + D * 0.62] : [x0 - D * 0.5, y0 + (m + n - 1 - q + 0.5) * S + D * 0.62];
  for (let q = 0; q < bandsShown; q++) {
    const [x, y] = at(q);
    const lead = q === m + n - 1 && digit[q] === 0;
    out.push(text(x, y, String(digit[q]), { size: 24, bold: true, color: lead ? "#ced4da" : "#2f9e44" }));
    if (carryIn[q + 1] && q + 1 < m + n) {
      const [cx, cy] = at(q + 1);
      out.push(text(cx - 13, cy - 16, String(carryIn[q + 1]), { size: 13, bold: true, color: "#e8590c" }));
    }
  }
  let y = y0 + n * S + D + 30;
  // The addition in the band just summed.
  if (bandsShown > 0 && bandsShown < m + n) {
    const q = bandsShown - 1;
    const terms = sums[q].map(String);
    const total = sums[q].reduce((s, v) => s + v, 0) + carryIn[q];
    const line = `${terms.join(" + ")}${carryIn[q] ? ` + ${carryIn[q]}` : ""} = ${total}`;
    out.push(text(PAD, y, line, { anchor: "start", size: 17, color: "#495057" }));
    y += 32;
  }
  const done = k >= m * n + m + n;
  const eq = done ? `${a} × ${b} = ${a * b}` : `${a} × ${b} = ?`;
  out.push(text(PAD, y, eq, { anchor: "start", size: 22, bold: true }));
  return wrap(Math.max(x0 + m * S + 44, PAD * 2 + width(eq, 22)), y + PAD, out.join(""));
}

export function renderMultiply(spec: MultiplySpec): RenderedSvg {
  const lim = MULTIPLY_LIMITS[spec.style];
  if (!(Number.isInteger(spec.a) && Number.isInteger(spec.b) && spec.a >= 0 && spec.b >= 0 && spec.a <= lim.a && spec.b <= lim.b)) throw new Error("range");
  const n = stepCount(spec);
  const k = Math.max(0, Math.min(spec.step, n));
  const pic = drawStyle(spec, k);
  const rule = k >= n ? multiplyRule(spec.a, spec.b) : null;
  return rule ? withRule(pic, rule) : pic;
}

function drawStyle(spec: MultiplySpec, k: number): RenderedSvg {
  switch (spec.style) {
    case "groups":
      return groups(spec, k);
    case "array":
      return array(spec, k);
    case "numberline":
      return numberline(spec, k);
    case "area":
      return area(spec, k);
    case "lattice":
      return lattice(spec, k);
  }
}

/** The picture with the special case's rule written under it, once every step is shown. */
function withRule(pic: RenderedSvg, rule: string): RenderedSvg {
  const H = pic.height + 34;
  const W = Math.max(pic.width, Math.ceil(PAD * 2 + width(rule, 18)));
  const svg = pic.svg
    .replace(/^<svg([^>]*) width="\d+" height="\d+" viewBox="0 0 \d+ \d+"/, `<svg$1 width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"`)
    .replace(/<\/g><\/svg>$/, `${text(PAD, pic.height + 14, rule, { anchor: "start", size: 18, color: "#2f9e44", bold: true })}</g></svg>`);
  return { svg, width: W, height: H };
}
