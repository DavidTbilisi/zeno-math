// Slices of solids, solids swept out by turning a flat shape, and Cavalieri's principle. `slicePic` draws a solid of
// src/math/solid.ts cut by a level or upright plane, the part nearer the viewer faded and the cut face shaded, and
// names the cut with `cutName`; `revolvePic` draws a flat shape beside the axis it turns about. The piece `coinStack`
// leans a stack of coins: every level slice is still one coin, so the volume stays the same.
import { C } from "./chart";
import { add, cutFaces, cutName, cutPlane, mean, scale, seen, seenWay, SOLID_START, type CutName, type Face, type LiveSolid, type SolidShape, type V3 } from "./solid";

export type SliceSpec = { shape: SolidShape; n: number; a: number; b: number; c: number; tilt: 0 | 90; cutAt: number };
const VIEW = { yaw: 28, pitch: 24 };
const f1 = (v: number) => Math.round(v * 10) / 10;

export const solidOf = (s: SliceSpec): LiveSolid => ({ ...SOLID_START, ...s, mode: "cut", spin: 0, yaw: VIEW.yaw, pitch: VIEW.pitch });
/** What the slice is: the solid cut as given. */
export function sliceName(s: SliceSpec): CutName {
  const solid = solidOf(s);
  const pl = cutPlane(solid);
  return cutName(solid, pl, cutFaces(solid, pl).cut);
}

/** The solid cut through, the part kept solid and the part cut off faded, the cut face shaded orange. */
export function slicePic(s: SliceSpec, W = 300, H = 240): { body: string; w: number; h: number } {
  const solid = solidOf(s);
  const pl = cutPlane(solid);
  const { below, above, cut } = cutFaces(solid, pl);
  // Keep the part whose cut face looks at the viewer; the other is drawn faint, as if lifted away.
  const upFaces = seenWay(pl.n, VIEW)[2] >= 0;
  const [kept, cutOff] = upFaces ? [below, above] : [above, below];
  // The part cut off is lifted away along the plane's normal, towards the viewer, so the cut face shows.
  const lift = scale(pl.n, (upFaces ? 1 : -1) * 0.55 * Math.max(s.a, s.b, s.c));
  // An upright cut's lifted part would still cover the cut face, seen from the side: it is left out.
  const gone = s.tilt === 90 ? [] : cutOff.map((f) => ({ ...f, pts: f.pts.map((q) => add(q, lift)) }));
  const all = [...kept, ...gone].flatMap((f) => f.pts);
  const xs = all.map((p) => seen(p, VIEW)[0]);
  const ys = all.map((p) => seen(p, VIEW)[1]);
  const k = Math.min((W - 40) / (Math.max(...xs) - Math.min(...xs)), (H - 40) / (Math.max(...ys) - Math.min(...ys)));
  const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
  const at = (p: V3) => {
    const [x, y] = seen(p, VIEW);
    return `${f1(W / 2 + (x - cx) * k)},${f1(H / 2 - (y - cy) * k)}`;
  };
  const front = (f: Face) => seenWay(f.n, VIEW)[2] > 1e-9;
  const depth = (f: Face) => seen(mean(f.pts), VIEW)[2];
  const draw = (fs: Face[], faded: boolean) =>
    fs.filter(front).sort((p, q) => depth(p) - depth(q)).map((f) => {
      const round = f.tag === "curved";
      const fill = f.tag === "cut" ? C.orange : faded ? "#e7f5ff" : f.tag === "side" || round ? "#a5d8ff" : "#d0ebff";
      const stroke = round ? fill : C.blue;
      return `<polygon points="${f.pts.map(at).join(" ")}" fill="${fill}" fill-opacity="${faded ? 0.35 : f.tag === "cut" ? 0.85 : 1}" stroke="${faded ? "#a5d8ff" : stroke}" stroke-width="${round ? 0.6 : 1.4}" stroke-linejoin="round"${faded ? ` stroke-dasharray="3 3"` : ""}/>`;
    }).join("");
  // The kept part first, then the part lifted off (nearer the viewer), the cut outlined last.
  const cutPoly = cut.length >= 3 ? `<polygon points="${cut.map(at).join(" ")}" fill="none" stroke="${C.red}" stroke-width="2.4" stroke-linejoin="round"/>` : "";
  return { body: draw(kept, false) + draw(gone, true) + cutPoly, w: W, h: H };
}

export type Revolve = "rectangle" | "rightTriangle" | "semicircle" | "isosceles";
/** A flat shape beside its axis (dashed, upright), with an arrow round the axis to show the turn. */
export function revolvePic(kind: Revolve, p = 3, q = 5): { body: string; w: number; h: number } {
  const [W, H] = [240, 220];
  const ax = 90;
  const u = Math.min(130 / Math.max(p, 1), 170 / Math.max(q, 1), 30);
  const [top, bot] = [H / 2 - (q * u) / 2, H / 2 + (q * u) / 2];
  let shape = "";
  if (kind === "rectangle") shape = `<rect x="${ax}" y="${f1(top)}" width="${f1(p * u)}" height="${f1(q * u)}"/>`;
  else if (kind === "rightTriangle") shape = `<polygon points="${ax},${f1(top)} ${ax},${f1(bot)} ${f1(ax + p * u)},${f1(bot)}"/>`;
  else if (kind === "isosceles") shape = `<polygon points="${ax},${f1(top)} ${ax},${f1(bot)} ${f1(ax + p * u)},${f1((top + bot) / 2)}"/>`;
  else {
    const r = (q * u) / 2;
    shape = `<path d="M${ax} ${f1(top)} A${f1(r)} ${f1(r)} 0 0 1 ${ax} ${f1(bot)} Z"/>`;
  }
  const labels =
    kind === "semicircle" ? `<text x="${ax - 8}" y="${f1(H / 2 + 4)}" font-size="13" text-anchor="end" font-family="Helvetica, Arial, sans-serif" fill="${C.ink}">${q}</text>`
    : `<text x="${ax - 8}" y="${f1(H / 2 + 4)}" font-size="13" text-anchor="end" font-family="Helvetica, Arial, sans-serif" fill="${C.ink}">${q}</text><text x="${f1(ax + (p * u) / 2)}" y="${f1((kind === "isosceles" ? (top + bot) / 2 : bot) + 16)}" font-size="13" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" fill="${C.ink}">${p}</text>`;
  const turnArrow = `<path d="M${ax - 26} ${f1(top - 8)} A26 8 0 1 0 ${ax + 22} ${f1(top - 12)}" fill="none" stroke="${C.purple}" stroke-width="2"/><polygon points="${ax + 22},${f1(top - 17)} ${ax + 30},${f1(top - 11)} ${ax + 20},${f1(top - 7)}" fill="${C.purple}"/>`;
  return {
    body: `<line x1="${ax}" y1="${f1(top - 24)}" x2="${ax}" y2="${f1(bot + 20)}" stroke="${C.purple}" stroke-width="2" stroke-dasharray="7 5"/><g fill="#d0ebff" stroke="${C.blue}" stroke-width="2.2">${shape}</g>${labels}${turnArrow}`,
    w: W, h: H,
  };
}

/** The coin stack piece: how far the top coin is pushed over, and the height of the level slice, both in pixels. */
export type LiveCoinStack = { shift: number; at: number };
export const COIN_START: LiveCoinStack = { shift: 0, at: 120 };
export const COINS = 14;
export const COIN_H = 14;
export const SHIFT_MAX = 150;
