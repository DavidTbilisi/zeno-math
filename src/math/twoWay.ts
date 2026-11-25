// Two-way tables (#651): counts sorted two ways at once, with each row's, each column's and the grand total. A share
// is a count out of some total, and the same count is a different share of its row, of its column and of everyone:
// what it is out of decides. Two things are associated when the rows split differently: compare the rows' shares,
// not their counts, since the rows can be different sizes. `tableSvg` draws a table for a question; the piece
// `tableShares` shows one count as its three shares, and has the learner change a row until the rows split alike.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A percentage to one decimal place at most: 40, 37.5, 33.3. */
export const pct = (v: number) => String(Math.round(v * 1000) / 10);

/** A 2 × 2 table of the counts `full`, with the row, column and grand totals when `totals`, and one cell shown as "?" when `hide` names it. */
export function tableSvg(rows: readonly string[], cols: readonly string[], total: string, full: readonly (readonly number[])[], o: { totals: boolean; hide?: [number, number] }) {
  const hw = 112;
  const cw = 84;
  const rh = 34;
  const grey = "#f1f3f5";
  const out: string[] = [];
  const box = (x: number, y: number, w: number, text: string, bold: boolean, fill: string, color: string = C.ink) => {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${rh}" fill="${fill}" stroke="${C.ink}" stroke-width="1"/>`);
    out.push(`<text x="${x + w / 2}" y="${y + rh / 2 + 5}" font-size="14" text-anchor="middle" ${font} fill="${color}"${bold ? ' font-weight="700"' : ""}>${esc(text)}</text>`);
  };
  box(0, 0, hw, "", false, grey);
  [...cols, ...(o.totals ? [total] : [])].forEach((c, j) => box(hw + j * cw, 0, cw, c, true, grey));
  const rowT = full.map((r) => r[0] + r[1]);
  const colT = [0, 1].map((j) => full[0][j] + full[1][j]);
  [0, 1].forEach((i) => {
    const y = (i + 1) * rh;
    box(0, y, hw, rows[i], true, grey);
    [0, 1].forEach((j) => {
      const hidden = o.hide !== undefined && i === o.hide[0] && j === o.hide[1];
      box(hw + j * cw, y, cw, hidden ? "?" : String(full[i][j]), false, "#fff", hidden ? C.red : C.ink);
    });
    if (o.totals) box(hw + 2 * cw, y, cw, String(rowT[i]), true, "#f8f9fa");
  });
  if (o.totals) {
    box(0, 3 * rh, hw, total, true, grey);
    [...colT, rowT[0] + rowT[1]].forEach((v, j) => box(hw + j * cw, 3 * rh, cw, String(v), true, "#f8f9fa"));
  }
  const ncols = o.totals ? 3 : 2;
  return { body: out.join(""), w: hw + ncols * cw + 2, h: (o.totals ? 4 : 3) * rh + 2 };
}

/** The piece: the four counts [Year 7 sport, Year 7 none, Year 8 sport, Year 8 none] and the cell tapped (0–3). */
export type LiveTableShares = { cells: [number, number, number, number]; sel: number };
export const TABLE_START: LiveTableShares = { cells: [12, 18, 10, 30], sel: 0 };
/** A count's three shares: of its row, of its column, of everyone. */
export function sharesOf(cells: readonly number[], k: number) {
  const n = cells[k];
  const row = k < 2 ? cells[0] + cells[1] : cells[2] + cells[3];
  const col = k % 2 === 0 ? cells[0] + cells[2] : cells[1] + cells[3];
  const all = cells.reduce((s, v) => s + v, 0);
  return { n, row, col, all };
}
/** Whether the two rows split alike: the same share of each row in the first column. */
export const sameSplit = (c: readonly number[]) => c[0] * (c[2] + c[3]) === c[2] * (c[0] + c[1]);
