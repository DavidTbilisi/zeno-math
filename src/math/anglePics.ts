// The pictures for the angle and figure questions #710 added: an angle with a point named on each arm, rays from one
// point, a shape cut along dashed lines, a blue line with three others to choose from, a protractor (both scales, an
// angle on it, or three arms to choose from, or a reflex angle outside it), a circle cut into equal parts, three
// angles side by side, and arms from a point with their angles written in x. Plain SVG strings.
import { arcPath, toward } from "./angleGuess";
import { C, FONT, r2 } from "./chart";
import type { Part } from "./practiceTypes";

type Pic = NonNullable<Part["pic"]>;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A drawing in its own coordinates, any sign; `done` frames what was seen with a margin round it. */
class Sketch {
  out: string[] = [];
  xs: number[] = [];
  ys: number[] = [];
  see(x: number, y: number) {
    this.xs.push(x);
    this.ys.push(y);
  }
  add(s: string) {
    this.out.push(s);
  }
  line(a: [number, number], b: [number, number], color: string = C.ink, width = 3, dash = "") {
    this.see(...a);
    this.see(...b);
    this.add(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  }
  dot(p: [number, number], color: string = C.ink, r = 4) {
    this.add(`<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r}" fill="${color}"/>`);
  }
  text(p: [number, number], s: string, o: { size?: number; color?: string; anchor?: string; weight?: number } = {}) {
    const size = o.size ?? 16;
    const half = (s.length * size) / 3.6;
    const anchor = o.anchor ?? "middle";
    const left = anchor === "start" ? 0 : anchor === "end" ? 2 * half : half;
    this.see(p[0] - left, p[1] - size);
    this.see(p[0] - left + 2 * half, p[1] + 4);
    this.add(`<text x="${r1(p[0])}" y="${r1(p[1])}" font-size="${size}" font-weight="${o.weight ?? 700}" text-anchor="${anchor}" fill="${o.color ?? C.ink}" paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round">${s}</text>`);
  }
  done(m = 14): Pic {
    const [x0, x1, y0, y1] = [Math.min(...this.xs) - m, Math.max(...this.xs) + m, Math.min(...this.ys) - m, Math.max(...this.ys) + m];
    const body = this.out.join("");
    return { svg: (x, y) => `<g transform="translate(${r2(x - x0)} ${r2(y - y0)})" ${FONT}>${body}</g>`, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
  }
}
const O: [number, number] = [0, 0];

/** An angle of `deg` from the direction `tilt`, a point named on each arm and the corner named: [arm, corner, arm]. */
export function namedAngle(deg: number, tilt: number, names: [string, string, string]): Pic {
  const s = new Sketch();
  const R = 110;
  const [a, c] = [toward(0, 0, R, tilt), toward(0, 0, R, tilt + deg)];
  s.add(`<path d="${arcPath(0, 0, 26, tilt, deg)}" fill="none" stroke="${C.purple}" stroke-width="2.5"/>`);
  s.line(O, a, C.blue);
  s.line(O, c, C.blue);
  for (const p of [O, a, c]) s.dot(p);
  s.text(toward(0, 6, R + 20, tilt), names[0]);
  s.text(toward(0, 6, R + 20, tilt + deg), names[2]);
  s.text(toward(0, 6, 22, tilt + deg / 2 + 180), names[1]);
  return s.done();
}

/** Rays from one point in the directions `dirs`, each end named; the point named `corner`. */
export function raysFrom(dirs: number[], ends: string[], corner: string): Pic {
  const s = new Sketch();
  const R = 120;
  dirs.forEach((d, i) => {
    const p = toward(0, 0, R, d);
    s.line(O, p, C.blue);
    s.dot(p);
    s.text(toward(0, 6, R + 20, d), ends[i]);
  });
  s.dot(O);
  const mid = (dirs[0] + dirs[dirs.length - 1]) / 2;
  s.text(toward(0, 6, 22, mid + 180), corner);
  return s.done();
}

export type ComposeKind = "twoTri" | "twoRect" | "sqTri" | "threeTri";
/** A shape cut along dashed lines into the pieces `kind` names. */
export function composePic(kind: ComposeKind, k: number): Pic {
  const s = new Sketch();
  const S = 70;
  const P = (pts: [number, number][]) => pts.map(([x, y]): [number, number] => [x * S, -y * S]);
  const shape = (pts: [number, number][]) => {
    const q = P(pts);
    q.forEach((p) => s.see(...p));
    s.add(`<polygon points="${q.map((p) => p.map(r1).join(",")).join(" ")}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="3" stroke-linejoin="round"/>`);
  };
  const cut = (a: [number, number], b: [number, number]) => s.line(P([a])[0], P([b])[0], C.orange, 2.5, "8 6");
  if (kind === "twoTri") {
    const w = 1.6 + 0.2 * k;
    shape([[0, 0], [w, 0], [w, 1.2], [0, 1.2]]);
    if (k % 2) cut([0, 0], [w, 1.2]);
    else cut([w, 0], [0, 1.2]);
  } else if (kind === "twoRect") {
    shape([[0, 0], [1.6, 0], [1.6, 1.6], [0, 1.6]]);
    if (k % 2) cut([0.8, 0], [0.8, 1.6]);
    else cut([0, 0.8], [1.6, 0.8]);
  } else if (kind === "sqTri") {
    const t = 0.5 + 0.1 * k;
    shape([[0, 0], [1.5, 0], [1.5, 1.5], [0.75, 1.5 + t], [0, 1.5]]);
    cut([0, 1.5], [1.5, 1.5]);
  } else {
    const h = Math.sqrt(3) / 2;
    shape([[0, 0], [2, 0], [1.5, h * 1], [0.5, h]].map(([x, y]) => [x * 1.2, y * 1.2] as [number, number]));
    cut([0.6, h * 1.2], [1.2, 0]);
    cut([1.2, 0], [1.8, h * 1.2]);
  }
  return s.done(18);
}

export type LineKind = "perp" | "cross" | "slant" | "par" | "near";
/**
 * A blue line and three others named A, B and C, in the slots given. For "which is perpendicular" the three cross the
 * blue line; for "which is parallel" they lie beside it. The whole picture is turned by `tilt`.
 */
export function linesPic(kinds: LineKind[], tilt: number, cross: number[]): Pic {
  const s = new Sketch();
  const rot = ([x, y]: [number, number]): [number, number] => {
    const t = (tilt * Math.PI) / 180;
    return [x * Math.cos(t) + y * Math.sin(t), -x * Math.sin(t) + y * Math.cos(t)];
  };
  s.line(rot([-170, 0]), rot([170, 0]), C.blue, 3.5);
  const crossing = kinds.some((k) => k === "perp" || k === "cross");
  const slots = crossing ? [-125, 0, 125] : [-85, 62, 128];
  kinds.forEach((k, i) => {
    const deg = k === "perp" ? 90 : k === "par" ? 0 : cross[i];
    const d = (deg * Math.PI) / 180;
    const half = crossing ? 66 : 120;
    const [cx, cy] = crossing ? [slots[i], 0] : [(i - 1) * 12, slots[i]];
    const a = rot([cx - Math.cos(d) * half, cy + Math.sin(d) * half]);
    const b = rot([cx + Math.cos(d) * half, cy - Math.sin(d) * half]);
    s.line(a, b, C.ink, 2.5);
    const end = (crossing ? (a[1] < b[1] ? a : b) : a[0] > b[0] ? a : b) as [number, number];
    // The letter just beyond the line's end, along it.
    const other = end === a ? b : a;
    const l = Math.hypot(end[0] - other[0], end[1] - other[1]);
    const out: [number, number] = [end[0] + ((end[0] - other[0]) / l) * 16, end[1] + ((end[1] - other[1]) / l) * 16 + 6];
    s.text(out, "ABC"[i], { color: C.orange, size: 17 });
  });
  return s.done();
}

/**
 * A protractor, its outer scale 0 on the left and its inner scale 0 on the right, a tick every 5°. `arms` are drawn from
 * its centre (directions anticlockwise from →); `arc` marks an angle; `reflex` marks the angle outside, below the line.
 */
export function protractorPic(arms: { dir: number; color?: string; dash?: boolean; label?: string }[], arc?: { from: number; size: number }, reflex?: { from: number; size: number; label: string }): Pic {
  const s = new Sketch();
  const R = 150;
  s.see(-R - 30, -R - 30);
  s.see(R + 30, 12);
  s.add(`<path d="${arcPath(0, 0, R, 0, 180)} Z" fill="#fff9db" fill-opacity="0.85" stroke="#868e96" stroke-width="1.5"/>`);
  for (let d = 0; d <= 180; d += 5) {
    const long = d % 10 === 0;
    const [a, b] = [toward(0, 0, R, d), toward(0, 0, R - (long ? 10 : 6), d)];
    s.add(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="#868e96" stroke-width="1"/>`);
    if (long) {
      // Clear of the base line at the two ends.
      const lift = d === 0 || d === 180 ? -7 : 0;
      const [ox, oy] = toward(0, 3.5 + lift, R - 20, d);
      const [ix, iy] = toward(0, 3.5 + lift, R - 37, d);
      s.add(`<text x="${r1(ox)}" y="${r1(oy)}" font-size="10" text-anchor="middle" fill="${C.ink}">${180 - d}</text>`);
      s.add(`<text x="${r1(ix)}" y="${r1(iy)}" font-size="10" text-anchor="middle" fill="${C.red}">${d}</text>`);
    }
  }
  if (arc) s.add(`<path d="${arcPath(0, 0, 30, arc.from, arc.size)}" fill="none" stroke="${C.purple}" stroke-width="2.5"/>`);
  if (reflex) {
    s.add(`<path d="${arcPath(0, 0, 34, reflex.from, reflex.size)}" fill="none" stroke="${C.orange}" stroke-width="2.5"/>`);
    s.text(toward(0, 6, 54, reflex.from + reflex.size / 2), reflex.label, { color: C.orange, size: 17 });
    s.see(0, 60);
  }
  for (const a of arms) {
    const end = toward(0, 0, R + 22, a.dir);
    s.line(O, end, a.color ?? C.blue, 3, a.dash ? "7 5" : "");
    if (a.label) s.text(toward(0, 6, R + 34, a.dir), a.label, { color: a.color ?? C.blue, size: 17 });
  }
  s.dot(O, C.ink, 3.5);
  return s.done(8);
}

/** A circle cut into n equal parts, k of them shaded from → anticlockwise, the angle they turn through marked. */
export function turnCircle(n: number, k: number): Pic {
  const s = new Sketch();
  const R = 80;
  s.see(-R, -R);
  s.see(R, R);
  const end = toward(0, 0, R, (360 * k) / n);
  s.add(`<circle cx="0" cy="0" r="${R}" fill="#ffffff" stroke="${C.ink}" stroke-width="2.5"/>`);
  s.add(`<path d="M0,0 L${R},0 A${R},${R} 0 ${2 * k > n ? 1 : 0} 0 ${r1(end[0])},${r1(end[1])} Z" fill="#a5d8ff"/>`);
  for (let i = 0; i < n; i++) s.line(O, toward(0, 0, R, (360 * i) / n), "#868e96", 1.5);
  s.line(O, [R, 0], C.blue, 3);
  s.line(O, end, C.blue, 3);
  s.add(`<path d="${arcPath(0, 0, 22, 0, (360 * k) / n)}" fill="none" stroke="${C.orange}" stroke-width="2.5"/>`);
  s.dot(O);
  return s.done();
}

/** Three angles side by side, named A, B and C, each with its first arm to the right. */
export function benchRow(sizes: number[]): Pic {
  const s = new Sketch();
  sizes.forEach((v, i) => {
    const c: [number, number] = [i * 170, 0];
    const R = 62;
    s.see(c[0] - R, c[1] - R);
    s.see(c[0] + R, c[1] + 30);
    s.add(`<path d="${arcPath(c[0], c[1], 18, 0, v)}" fill="none" stroke="${C.purple}" stroke-width="2.5"/>`);
    s.line(c, toward(c[0], c[1], R, 0), C.blue);
    s.line(c, toward(c[0], c[1], R, v), C.blue);
    s.dot(c);
    s.text([c[0], c[1] + 28], "ABC"[i], { color: C.orange, size: 17 });
  });
  return s.done();
}

/**
 * Arms from one point, the angles between them in turn from the direction `turn`, each with its label (or none):
 * on a straight line, in a right angle (marked), the whole angle with its own label further out, or two straight
 * lines crossing (four angles, the opposite ones equal).
 */
export function armsPic(turn: number, parts: number[], labels: (string | null)[], o: { kind: "line" | "right" | "whole" | "point" | "cross"; whole?: string }): Pic {
  const s = new Sketch();
  const R = 125;
  s.see(-R, -R);
  s.see(R, o.kind === "cross" || o.kind === "point" ? R : 10);
  let at = turn;
  const ends: number[] = [];
  parts.forEach((p, i) => {
    ends.push(at);
    if (labels[i] !== null) {
      s.add(`<path d="${arcPath(0, 0, 30 + (i % 2) * 8, at, p)}" fill="none" stroke="${C.purple}" stroke-width="2.5"/>`);
      const r = p < 40 ? 100 : 72;
      s.text(toward(0, 6, r, at + p / 2), labels[i]!, { size: 15, color: C.purple });
    }
    at += p;
  });
  if (o.kind !== "point" && o.kind !== "cross") ends.push(at);
  for (const e of ends) s.line(O, toward(0, 0, R, e), C.ink);
  if (o.kind === "right") {
    const [a, b] = [toward(0, 0, 14, turn), toward(0, 0, 14, turn + 90)];
    s.add(`<path d="M${r1(a[0])},${r1(a[1])} L${r1(a[0] + b[0])},${r1(a[1] + b[1])} L${r1(b[0])},${r1(b[1])}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`);
  }
  if (o.kind === "whole" && o.whole) {
    const size = parts.reduce((t, p) => t + p, 0);
    s.add(`<path d="${arcPath(0, 0, 112, turn, size)}" fill="none" stroke="${C.orange}" stroke-width="2" stroke-dasharray="6 4"/>`);
    s.text(toward(0, 6, 140, turn + size / 2), o.whole, { size: 15, color: C.orange });
  }
  s.dot(O);
  return s.done();
}
