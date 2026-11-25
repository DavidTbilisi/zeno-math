// Scale drawings and maps. A scale 1 cm : k m multiplies every length by k (and changes the unit); an area is
// multiplied by k twice, since each square centimetre of the plan stands for a k-by-k block of square metres.
// `mapSvg` draws two places on a map with a ruler and a scale bar, `planSvg` a room on a plan; the piece `scalePlan`
// puts a plan beside the real floor, one square of the plan and its k × k block of metres marked on both.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
const CM = 30;

/**
 * Two places `d` cm apart on a map, a ruler under them (left out when the distance on the map is what is asked), and
 * the scale bar: each centimetre is `k` of `unit`.
 */
export function mapSvg(d: number, k: number, unit: string, ruler = true, a = "A", b = "B"): { body: string; w: number; h: number } {
  const x0 = 30;
  const out: string[] = [];
  out.push(`<rect x="4" y="4" width="${d * CM + 52}" height="72" rx="8" fill="#ebfbee" stroke="#b2f2bb"/>`);
  out.push(`<path d="M${x0} 46 C ${x0 + d * CM * 0.3} 20, ${x0 + d * CM * 0.6} 66, ${x0 + d * CM} 40" fill="none" stroke="#ced4da" stroke-width="4" stroke-linecap="round"/>`);
  for (const [x, y, n] of [[x0, 46, a], [x0 + d * CM, 40, b]] as const)
    out.push(`<circle cx="${x}" cy="${y}" r="6" fill="${C.red}"/><text x="${x}" y="${y - 11}" font-size="15" font-weight="700" text-anchor="middle" ${font} fill="${C.ink}">${n}</text>`);
  // The ruler, straight from A's mark to B's.
  const ry = 92;
  if (ruler) out.push(`<rect x="${x0 - 8}" y="${ry}" width="${d * CM + 16}" height="26" fill="#fff9db" stroke="#e9c46a"/>`);
  for (let i = 0; i <= d && ruler; i++)
    out.push(`<line x1="${x0 + i * CM}" y1="${ry}" x2="${x0 + i * CM}" y2="${ry + (i % 5 === 0 ? 12 : 8)}" stroke="${C.ink}"/><text x="${x0 + i * CM}" y="${ry + 23}" font-size="10" text-anchor="middle" ${font} fill="${C.ink}">${i}</text>`);
  if (ruler)
    out.push(
      `<line x1="${x0}" y1="46" x2="${x0}" y2="${ry}" stroke="${C.grey}" stroke-dasharray="2 3"/><line x1="${x0 + d * CM}" y1="40" x2="${x0 + d * CM}" y2="${ry}" stroke="${C.grey}" stroke-dasharray="2 3"/>`,
      `<text x="${x0 + d * CM + 14}" y="${ry + 17}" font-size="12" ${font} fill="${C.ink}">cm</text>`,
    );
  // The scale bar: two centimetres, black and white, labelled.
  const sy = 140;
  for (let i = 0; i < 2; i++) out.push(`<rect x="${x0 + i * CM}" y="${sy}" width="${CM}" height="8" fill="${i === 0 ? C.ink : "#fff"}" stroke="${C.ink}"/>`);
  for (let i = 0; i <= 2; i++) out.push(`<text x="${x0 + i * CM}" y="${sy + 22}" font-size="11" text-anchor="middle" ${font} fill="${C.ink}">${i * k}</text>`);
  out.push(`<text x="${x0 + 2 * CM + 14}" y="${sy + 9}" font-size="12" ${font} fill="${C.ink}">${unit}</text>`);
  return { body: out.join(""), w: Math.max(d * CM + 76, 200), h: 168 };
}

/** A room `a` cm by `b` cm on a squared plan, its sides written, one square shaded, the scale beneath. */
export function planSvg(a: number, b: number, scale: string): { body: string; w: number; h: number } {
  const [x0, y0] = [44, 16];
  const out: string[] = [];
  for (let i = 0; i <= a; i++) out.push(`<line x1="${x0 + i * CM}" y1="${y0}" x2="${x0 + i * CM}" y2="${y0 + b * CM}" stroke="#dee2e6"/>`);
  for (let j = 0; j <= b; j++) out.push(`<line x1="${x0}" y1="${y0 + j * CM}" x2="${x0 + a * CM}" y2="${y0 + j * CM}" stroke="#dee2e6"/>`);
  out.push(`<rect x="${x0}" y="${y0}" width="${CM}" height="${CM}" fill="${C.orange}" fill-opacity="0.3"/>`);
  out.push(`<rect x="${x0}" y="${y0}" width="${a * CM}" height="${b * CM}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`);
  out.push(`<text x="${x0 + (a * CM) / 2}" y="${y0 + b * CM + 18}" font-size="13" text-anchor="middle" ${font} fill="${C.ink}">${a} cm</text>`);
  out.push(`<text x="${x0 - 8}" y="${y0 + (b * CM) / 2 + 4}" font-size="13" text-anchor="end" ${font} fill="${C.ink}">${b} cm</text>`);
  out.push(`<text x="${x0}" y="${y0 + b * CM + 40}" font-size="13" font-weight="700" ${font} fill="${C.ink}">${scale}</text>`);
  return { body: out.join(""), w: Math.max(a * CM + 60, 200), h: b * CM + 62 };
}

/** The piece: the room on the plan, `w` by `h` centimetres, and how many metres each centimetre stands for. */
export type LiveScalePlan = { w: number; h: number; k: number };
export const SCALE_PLAN_START: LiveScalePlan = { w: 3, h: 2, k: 2 };
export const PLAN_MAX = { w: 6, h: 4, k: 4 };
