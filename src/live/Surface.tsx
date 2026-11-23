// A surface z = f(x, y) on the board (#565), worked by hand on the 3D stage of the solid piece: the hill drawn as a
// shaded mesh with its contour lines, the same contours as a map on the floor under it, and a point dragged on either
// (or moved by the arrow keys) that moves on both. Slice cuts the hill by the plane through the point and lays its
// tangent on the curve (the partial derivative is that slope, drawn flat beside it too); Gradient draws ∇f on the map,
// across the contour and as long as the hill is steep; Lagrange keeps the point on a fence g = c, lifted onto the hill,
// and says when the contour of f touches it (the highest or lowest point on the fence); Descent rolls a ball downhill
// a step per tap, with the learning-rate and momentum dials of the descent lab. Dragging empty stage turns it all.
import { useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { textLen, wrap } from "../math/chart";
import { seen, seenWay, sub, unit, cross, type V3 } from "../math/solid";
import {
  along, arrowScale, BETAS, contour, descend, joinSegments, ETAS, etaIndex, fence, floorMove, FLOOR, fmt, gradient, grid, lambdaAt, levels, movePoint, nearestT,
  onFloor, pathExtrema, pickFn, PITCH, readSurface, SIDE, SLICE_AXES, snapT, SURFACE_FNS, SURFACE_MODES, tangentAt, tGap, toStage, Z0, ZS, zRange,
  type LiveSurface, type P2, type SurfaceFn,
} from "../math/surface";
import { BLUE, GREEN, keyTap, NumBox, Pill, RED, Tabs, Track, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
/** The stage: its top, height and middle. */
const ST = 88;
const SH = 400;
const [CX, CY] = [W / 2, ST + SH / 2];
/** Screen units to one stage unit (the square is 4 across). */
const PX = 62;
/** The strip under the stage for a mode's dials. */
const STRIP = 84;
const SAY_Y = ST + SH + STRIP + 20;
const SAY = 23;
const H = SAY_Y + 4 * SAY;
/** Cells of the mesh along each side, and of the finer grid the contours are traced on. */
const MESH = 28;
const FINE = 60;
const ORANGE = "#e8590c";
const PURPLE = "#9c36b5";
const LIGHT = unit([-0.45, 0.6, 0.66]);
/** Low to high: blue, teal, lime, yellow, orange. */
const STOPS = ["#4dabf7", "#38d9a9", "#a9e34b", "#ffd43b", "#ff922b"].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap360 = (v: number) => ((Math.round(v) % 360) + 360) % 360;
/** The colour of a height a share k of the way up, darkened by `light`. */
function heightColor(k: number, light = 1) {
  const u = clamp(k, 0, 1) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(u));
  const c = STOPS[i].map((v, j) => Math.round((v + (STOPS[i + 1][j] - v) * (u - i)) * light));
  return `rgb(${c.join(",")})`;
}
/** f as it is written under the picture. */
const pretty = (e: string) => e.replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\*/g, "·").replace(/-/g, "−");
const num = (v: number) => {
  const r = Number(v.toPrecision(2));
  return String(r);
};

type Item = { depth: number; el: ReactNode };
/** What the hand holds: the view, or the point (dragged from where it was). */
type Hold = { part: "turn"; yaw0: number; pitch0: number } | { part: "point"; x0: number; y0: number } | { part: "ball" };

export function Surface({ state, set, w: words, svgRef }: PieceProps<"surface">) {
  const w = words.surface;
  /** What is shown while something is held, before it is kept as one step to undo. */
  const [draft, setDraft] = useState<LiveSurface | null>(null);
  const s = draft ?? state;
  const view = { yaw: s.yaw, pitch: s.pitch };
  const keep = (next: LiveSurface) => {
    setDraft(null);
    set(next);
  };

  // ---- the function, its mesh and its map ------------------------------------------------------------------------
  const f = useMemo(() => readSurface(s.expr, s.half), [s.expr, s.half]);
  const model = useMemo(() => {
    if (!f) return null;
    const mesh = grid(f, s.half, MESH);
    const fine = grid(f, s.half, FINE);
    const range = zRange(fine);
    const lv = levels(range[0], range[1], 10);
    return {
      mesh, fine, range, lv,
      floorLines: lv.map((v) => ({ v, segs: contour(fine, v) })),
      hillLines: lv.map((v) => ({ v, segs: contour(mesh, v) })),
      k: arrowScale(f, s.half),
    };
  }, [f, s.half]);
  const g = useMemo(() => readSurface(s.g, s.half), [s.g, s.half]);
  const path = useMemo(() => (g && s.mode === "lagrange" ? fence(g, s.c, s.half) : null), [g, s.c, s.half, s.mode]);
  const ext = useMemo(() => (f && path ? pathExtrema(path, f) : []), [f, path]);

  // The middle of the stage box, so the picture stays centred however it is turned.
  const box = [-SIDE, SIDE].flatMap((x) => [-SIDE, SIDE].flatMap((y) => [FLOOR, Z0 + ZS].map((z) => seen([x, y, z], view))));
  const mid = [(Math.min(...box.map((p) => p[0])) + Math.max(...box.map((p) => p[0]))) / 2, (Math.min(...box.map((p) => p[1])) + Math.max(...box.map((p) => p[1]))) / 2];
  const at = (p: V3): [number, number] => {
    const [x, y] = seen(p, view);
    return [cx + PX * (x - mid[0]), CY - PX * (y - mid[1])];
  };
  const depth = (p: V3) => seen(p, view)[2];
  // A slice shows its curve laid flat at the right, so the hill moves over to the left.
  const cx = CX - (s.mode === "slice" ? 80 : 0);

  // The point: on the fence in Lagrange, else where it was put.
  const point: P2 = s.mode === "lagrange" && path ? along(path, s.t) : [s.x, s.y];

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      if (d.part === "ball") return d.moved ? undefined : stepBall();
      if (d.part === "point" && !d.moved && s.mode === "descent") return keep({ ...s, steps: 0 });
      if (d.part === "point" && s.mode === "lagrange" && path) return keep({ ...s, t: snapT(path, ext, (draft ?? s).t) });
      if (draft) keep(draft);
    },
    (d) => {
      if (!d.moved) return;
      const [dx, dy] = [d.x - d.x0, d.y - d.y0];
      if (d.part === "turn") return setDraft({ ...s, yaw: wrap360(d.yaw0 - dx * 0.6), pitch: clamp(Math.round(d.pitch0 + dy * 0.5), PITCH[0], PITCH[1]) });
      if (d.part !== "point") return;
      const [mx, my] = floorMove(view, PX, s.half, dx, dy);
      const to: P2 = [d.x0 + mx, d.y0 + my];
      if (s.mode === "lagrange" && path) return setDraft({ ...s, t: nearestT(path, to) });
      setDraft(movePoint(s, to[0], to[1]));
    },
  );

  const grabPoint = (e: PointerEvent) => begin(e, { part: "point", x0: point[0], y0: point[1] });
  const grabTurn = (e: PointerEvent) => begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch });

  // ---- descent ----------------------------------------------------------------------------------------------------
  const walk = f && s.mode === "descent" ? descend(f, [s.x, s.y], s.eta, s.beta, s.steps, s.half) : null;
  const ball: P2 = walk ? walk.pts[walk.pts.length - 1] : point;
  const hop = f && walk && !walk.away ? descend(f, [s.x, s.y], s.eta, s.beta, s.steps + 1, s.half) : null;
  const next: P2 | null = hop && !hop.away ? hop.pts[hop.pts.length - 1] : null;
  const gBall = f ? gradient(f, ...ball) : [0, 0];
  const settled = Math.hypot(gBall[0], gBall[1]) < 1e-3;
  const canStep = !!walk && !walk.away && !settled && s.steps < 500;
  function stepBall() {
    if (canStep) keep({ ...s, steps: s.steps + 1 });
  }

  // ---- keys -------------------------------------------------------------------------------------------------------
  const arrow = (e: KeyboardEvent) => ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as Record<string, [number, number]>)[e.key];
  const keyTurn = (e: KeyboardEvent) => {
    const m = arrow(e);
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, yaw: wrap360(s.yaw - m[0] * 15), pitch: clamp(s.pitch - m[1] * 10, PITCH[0], PITCH[1]) });
  };
  const keyPoint = (e: KeyboardEvent) => {
    if (s.mode === "descent") keyTap(e, () => keep({ ...s, steps: 0 }));
    const m = arrow(e);
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    if (s.mode === "lagrange" && path) {
      const t = s.t + (m[0] + m[1]) * 0.01;
      return keep({ ...s, t: snapT(path, ext, t, 0.006) });
    }
    const step = s.half / 20;
    keep(movePoint(s, s.x + m[0] * step, s.y + m[1] * step));
  };
  const keyBall = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
    keyTap(e, stepBall);
  };

  // ---- the hill, its map, and what is drawn on them ---------------------------------------------------------------
  const scene = useMemo(() => {
    if (!f || !model) return null;
    const { mesh, range } = model;
    const S = toStage(s.half, range);
    const Fl = onFloor(s.half);
    const [lo, hi] = range;
    const share = (z: number) => (z - lo) / (hi - lo);
    const items: Item[] = [];
    const cell = (i: number) => -s.half + (2 * s.half * i) / MESH;
    for (let i = 0; i < MESH; i++)
      for (let j = 0; j < MESH; j++) {
        const zs = [mesh.z[i][j], mesh.z[i + 1][j], mesh.z[i + 1][j + 1], mesh.z[i][j + 1]];
        if (!zs.every(Number.isFinite)) continue;
        const pts: V3[] = [S(cell(i), cell(j), zs[0]), S(cell(i + 1), cell(j), zs[1]), S(cell(i + 1), cell(j + 1), zs[2]), S(cell(i), cell(j + 1), zs[3])];
        const n = unit(cross(sub(pts[2], pts[0]), sub(pts[3], pts[1])));
        const way = seenWay(n, view);
        const lit = way[2] < 0 ? [-n[0], -n[1], -n[2]] : n;
        const light = (0.64 + 0.36 * Math.max(0, lit[0] * LIGHT[0] + lit[1] * LIGHT[1] + lit[2] * LIGHT[2])) * (way[2] < 0 ? 0.85 : 1);
        const color = heightColor(share((zs[0] + zs[1] + zs[2] + zs[3]) / 4), light);
        const d = pts.map(at).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
        items.push({ depth: (depth(pts[0]) + depth(pts[1]) + depth(pts[2]) + depth(pts[3])) / 4, el: <path key={`q${i}.${j}`} d={`M${d}Z`} fill={color} stroke={color} strokeWidth={0.7} strokeLinejoin="round" /> });
      }
    // The contours on the hill itself, each a short line just in front of the cell it crosses.
    model.hillLines.forEach(({ v, segs }, li) => segs.forEach(([p, q], k) => {
      const [a, b] = [S(p[0], p[1], v), S(q[0], q[1], v)];
      const [pa, pb] = [at(a), at(b)];
      items.push({
        depth: (depth(a) + depth(b)) / 2 + 0.03,
        el: <line key={`c${li}.${k}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke={heightColor(share(v), 0.55)} strokeWidth={1.1} strokeLinecap="round" />,
      });
    }));
    const floorSquare = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => at([u * SIDE, v * SIDE, FLOOR]));
    const floorMap = model.floorLines.map(({ v, segs }, li) => (
      <path key={li} d={segs.map(([p, q]) => { const [a, b] = [at(Fl(...p)), at(Fl(...q))]; return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }).join("")}
        stroke={heightColor(share(v), 0.75)} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    ));
    return { S, Fl, items, floorSquare, floorMap, share };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, model, s.half, view.yaw, view.pitch, cx]);

  if (!f || !model || !scene) {
    return (
      <>
        <svg className="hand-pic" width={W} height={200} viewBox={`0 0 ${W} 200`} fontFamily={FONT} ref={svgRef}>
          <rect width={W} height={200} fill="#fff" />
          <Tabs x={16} y={10} keys={SURFACE_FNS} on={s.fn as SurfaceFn} names={w.fns} onPick={(k) => keep(pickFn(s, k))} />
          <text x={24} y={100} fontSize={16} fill={RED} fontWeight={700}>{fill(w.badF, { f: s.expr })}</text>
        </svg>
        <p className="live-hint">{w.hint}</p>
      </>
    );
  }

  const { S, Fl } = scene;
  const fp = f(...point);
  const [fx, fy] = gradient(f, ...point);
  const P = S(point[0], point[1], fp);
  const span = model.range[1] - model.range[0];
  /** A move on the hill from (x, y, z) by (dx, dy, dz), not clamped: tangents and arrows run past the heights shown. */
  const toward = (x: number, y: number, z: number, d: [number, number, number]): V3 =>
    [((x + d[0]) / s.half) * SIDE, ((y + d[1]) / s.half) * SIDE, Z0 + ((z + d[2] - model.range[0]) / span) * ZS];
  const scr = (p: V3) => at(p);
  const lineEl = (a: [number, number], b: [number, number], color: string, width: number, extra: object = {}) => (
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" {...extra} />
  );
  const arrowEl = (key: string, a: [number, number], b: [number, number], color: string, width = 3) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const r = Math.hypot(dx, dy);
    if (r < 2) return null;
    const [ux, uy] = [dx / r, dy / r];
    const head = Math.min(14, r * 0.5);
    const tip = `M${b[0]} ${b[1]}L${b[0] - ux * head - uy * head * 0.5} ${b[1] - uy * head + ux * head * 0.5}L${b[0] - ux * head + uy * head * 0.5} ${b[1] - uy * head - ux * head * 0.5}Z`;
    return (
      <g key={key}>
        {lineEl(a, [b[0] - ux * head * 0.8, b[1] - uy * head * 0.8], color, width)}
        <path d={tip} fill={color} />
      </g>
    );
  };
  /** A line on the hill, cut into short pieces painted just in front of the cells under them. */
  const onHill = (key: string, pts: P2[], color: string, width: number, dash?: string): Item[] => {
    const out: Item[] = [];
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const [za, zb] = [f(...a), f(...b)];
      if (!Number.isFinite(za) || !Number.isFinite(zb)) continue;
      const [A, B] = [S(a[0], a[1], za), S(b[0], b[1], zb)];
      out.push({ depth: (depth(A) + depth(B)) / 2 + 0.06, el: <g key={`${key}${i}`}>{lineEl(at(A), at(B), color, width, dash ? { strokeDasharray: dash } : {})}</g> });
    }
    return out;
  };
  const floorPath = (pts: P2[]) => pts.map((p, i) => { const [x, y] = at(Fl(...p)); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join("");
  /** The contour of f through the point. */
  const here = s.mode === "gradient" || s.mode === "lagrange" ? joinSegments(contour(model.fine, fp)) : [];

  // ---- what each mode adds ----------------------------------------------------------------------------------------
  const floorExtra: ReactNode[] = [];
  const hillExtra: Item[] = [];
  const topExtra: ReactNode[] = [];
  type Line = { text: string; color: string; strong?: boolean };
  const lines: Line[] = [{ text: `f(x, y) = ${pretty(s.expr)}`, color: INK, strong: true }];
  const pointWords = () => lines.push(
    { text: fill(w.at, { x: fmt(point[0]), y: fmt(point[1]), z: fmt(fp) }), color: BLUE, strong: true },
    { text: fill(w.partials, { fx: fmt(fx), fy: fmt(fy) }), color: INK },
  );

  if (s.mode === "point") {
    pointWords();
    lines.push({ text: w.pointHint, color: INK });
  } else if (s.mode === "slice") {
    const along = s.axis === "x";
    const curve: P2[] = Array.from({ length: 81 }, (_, i) => {
      const t = -s.half + (2 * s.half * i) / 80;
      return along ? [t, point[1]] : [point[0], t];
    });
    // The cutting plane, faint, through the point.
    const [lo, hi] = [FLOOR, Z0 + ZS];
    const c = (along ? point[1] : point[0]) / s.half * SIDE;
    const quad: V3[] = along ? [[-SIDE, c, lo], [SIDE, c, lo], [SIDE, c, hi], [-SIDE, c, hi]] : [[c, -SIDE, lo], [c, SIDE, lo], [c, SIDE, hi], [c, -SIDE, hi]];
    topExtra.push(<path key="plane" d={`M${quad.map(scr).map((p) => p.join(" ")).join("L")}Z`} fill="rgba(201,42,42,0.08)" stroke={RED} strokeWidth={1.2} strokeDasharray="7 6" />);
    floorExtra.push(<path key="trace" d={floorPath(along ? [[-s.half, point[1]], [s.half, point[1]]] : [[point[0], -s.half], [point[0], s.half]])} stroke={RED} strokeWidth={2} strokeDasharray="6 5" fill="none" />);
    hillExtra.push(...onHill("slice", curve, RED, 3.2));
    const d = along ? fx : fy;
    const reach = 0.3 * s.half;
    const dir: [number, number, number] = along ? [reach, 0, d * reach] : [0, reach, d * reach];
    topExtra.push(<g key="tan">{lineEl(at(toward(point[0], point[1], fp, [-dir[0], -dir[1], -dir[2]])), at(toward(point[0], point[1], fp, dir)), "#a61e4d", 3)}</g>);
    lines.push(
      { text: along ? fill(w.sliceX, { y: fmt(point[1]) }) : fill(w.sliceY, { x: fmt(point[0]) }), color: RED, strong: true },
      { text: along ? fill(w.slopeX, { x: fmt(point[0]), d: fmt(d) }) : fill(w.slopeY, { y: fmt(point[1]), d: fmt(d) }), color: INK, strong: true },
      { text: fill(w.at, { x: fmt(point[0]), y: fmt(point[1]), z: fmt(fp) }), color: BLUE },
    );
  } else if (s.mode === "gradient") {
    const len = Math.hypot(fx, fy);
    const k = Math.min(model.k, (0.9 * s.half) / (len || 1));
    floorExtra.push(<path key="lvl" d={here.map(floorPath).join("")} stroke={ORANGE} strokeWidth={2.4} fill="none" strokeDasharray="8 5" />);
    hillExtra.push(...here.flatMap((l, i) => onHill(`lv${i}`, l, ORANGE, 2.6)));
    floorExtra.push(arrowEl("grad", at(Fl(...point)), at(Fl(point[0] + fx * k, point[1] + fy * k)), RED, 3.5));
    // On the hill: the way straight up, rising |∇f| for each unit walked.
    if (len > 1e-6) {
      const u = (0.3 * s.half) / len;
      topExtra.push(arrowEl("up", at(P), at(toward(point[0], point[1], fp, [fx * u, fy * u, len * len * u])), RED, 3));
    }
    lines.push(len < 1e-3
      ? { text: w.flat, color: RED, strong: true }
      : { text: fill(w.grad, { fx: fmt(fx), fy: fmt(fy), z: fmt(fp) }), color: RED, strong: true });
    if (len >= 1e-3) lines.push({ text: fill(w.gradLen, { n: fmt(len) }), color: INK, strong: true });
    lines.push({ text: fill(w.at, { x: fmt(point[0]), y: fmt(point[1]), z: fmt(fp) }), color: BLUE });
  } else if (s.mode === "lagrange") {
    const gName = pretty(s.g);
    if (!path || !g) {
      lines.push({ text: fill(w.noCurve, { g: gName, c: fmt(s.c) }), color: RED, strong: true });
    } else {
      floorExtra.push(<path key="fence" d={floorPath(path.pts)} stroke={PURPLE} strokeWidth={3} fill="none" />);
      hillExtra.push(...onHill("fence", path.pts, PURPLE, 3.4));
      floorExtra.push(<path key="lvl" d={here.map(floorPath).join("")} stroke={ORANGE} strokeWidth={2.2} fill="none" strokeDasharray="8 5" />);
      const gg = gradient(g, ...point);
      const touch = ext.find((e) => tGap(path, e.t, s.t) < 1e-6);
      // ∇f and ∇g at the point, scaled alike to show which way each points: along one line where the contours touch.
      const unitArrow = (v: P2, color: string, key: string) => {
        const r = Math.hypot(v[0], v[1]);
        if (r < 1e-9) return null;
        const L = 0.45 * s.half;
        return arrowEl(key, at(Fl(...point)), at(Fl(point[0] + (v[0] / r) * L, point[1] + (v[1] / r) * L)), color, 3);
      };
      floorExtra.push(unitArrow(gg, PURPLE, "gg"), unitArrow([fx, fy], RED, "gf"));
      const tan = tangentAt(path, s.t);
      const slope = fx * tan[0] + fy * tan[1];
      lines.push({ text: fill(w.constraint, { g: gName, c: fmt(s.c), v: fmt(fp) }), color: PURPLE, strong: true });
      if (touch) {
        lines.push({ text: fill(touch.kind === "max" ? w.touchMax : w.touchMin, { v: fmt(touch.v) }), color: RED, strong: true });
        lines.push({ text: fill(w.lambda, { x: fmt(point[0]), y: fmt(point[1]), l: fmt(lambdaAt([fx, fy], gg)) }), color: INK });
      } else {
        lines.push({ text: fill(w.alongSlope, { s: fmt(Math.abs(slope)) }), color: INK });
        lines.push({ text: w.lagrangeHint, color: INK });
      }
    }
  } else if (walk) {
    const pts = walk.pts;
    floorExtra.push(<path key="walk" d={floorPath(pts)} stroke={GREEN} strokeWidth={2} fill="none" />);
    floorExtra.push(...pts.map((p, i) => { const [x, y] = at(Fl(...p)); return <circle key={`w${i}`} cx={x} cy={y} r={2.6} fill={GREEN} />; }));
    hillExtra.push(...onHill("walk", pts, GREEN, 2.6));
    if (next) topExtra.push(<g key="hop">{lineEl(at(S(ball[0], ball[1], f(...ball))), at(S(next[0], next[1], f(...next))), GREEN, 2, { strokeDasharray: "5 5", opacity: 0.8 })}</g>);
    const fb = f(...ball);
    lines.push({ text: fill(w.descentStep, { k: s.steps, x: fmt(ball[0]), y: fmt(ball[1]), v: fmt(fb) }), color: GREEN, strong: true });
    if (walk.away || (hop && hop.away)) lines.push({ text: w.descentAway, color: RED, strong: true });
    else if (settled) lines.push({ text: w.settled, color: GREEN, strong: true });
    else lines.push({ text: fill(w.descentGrad, { fx: fmt(gBall[0]), fy: fmt(gBall[1]) }), color: INK });
    lines.push({ text: w.descentHint, color: INK });
  }

  // ---- the picture ------------------------------------------------------------------------------------------------
  const hill = [...scene.items, ...hillExtra].sort((a, b) => a.depth - b.depth);
  const floorPt = at(Fl(...point));
  const hillPt = at(P);
  const ballPt = at(S(ball[0], ball[1], f(...ball)));
  const axisLabel = (p: V3, t: string) => {
    const [x, y] = at(p);
    return <text x={x} y={y + 5} fontSize={15} fontStyle="italic" fontWeight={700} fill="#495057" textAnchor="middle">{t}</text>;
  };
  const sliceInset = () => {
    if (s.mode !== "slice") return null;
    // The slice laid flat: z against x (or y), the tangent at the point.
    const [bx, by, bw, bh] = [W - 186, ST + SH - 128, 170, 116];
    const alongX = s.axis === "x";
    const t0 = alongX ? point[0] : point[1];
    const zt = (t: number) => (alongX ? f(t, point[1]) : f(point[0], t));
    const ts = Array.from({ length: 61 }, (_, i) => -s.half + (2 * s.half * i) / 60);
    const zs = ts.map(zt).filter(Number.isFinite);
    const [zl, zh] = [Math.min(...zs), Math.max(...zs)];
    const zspan = zh - zl || 1;
    const X = (t: number) => bx + 10 + ((t + s.half) / (2 * s.half)) * (bw - 20);
    const Y = (z: number) => by + bh - 22 - ((z - zl) / zspan) * (bh - 40);
    const d = alongX ? fx : fy;
    const r = 0.35 * s.half;
    const pts = ts.map((t) => `${X(t).toFixed(1)} ${Y(clamp(zt(t), zl - zspan, zh + zspan)).toFixed(1)}`).join("L");
    return (
      <g>
        <rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#fff" stroke="#ced4da" />
        <clipPath id="surface-inset"><rect x={bx} y={by} width={bw} height={bh} rx={8} /></clipPath>
        <g clipPath="url(#surface-inset)">
          <path d={`M${pts}`} fill="none" stroke={RED} strokeWidth={2.2} />
          {lineEl([X(t0 - r), Y(fp - d * r)], [X(t0 + r), Y(fp + d * r)], "#a61e4d", 2)}
          <circle cx={X(t0)} cy={Y(fp)} r={4.5} fill={BLUE} />
        </g>
        <text x={bx + bw / 2} y={by + bh - 6} fontSize={13} textAnchor="middle" fill={INK}>{fill(w.insetSlope, { d: fmt(d), v: alongX ? "x" : "y" })}</text>
      </g>
    );
  };
  const said = lines.flatMap((l) => wrap(l.text, 76).map((text) => ({ ...l, text }))).slice(0, 4);

  const drawing = () => (
    <>
      <path d={`M${scene.floorSquare.map((p) => p.join(" ")).join("L")}Z`} fill="#f8f9fa" stroke="#adb5bd" strokeWidth={1.2} />
      {scene.floorMap}
      {axisLabel([SIDE + 0.35, 0, FLOOR], "x")}
      {axisLabel([0, SIDE + 0.35, FLOOR], "y")}
      {floorExtra}
      {/* The drop from the point on the map up to the hill. */}
      {lineEl(floorPt, s.mode === "descent" ? at(S(s.x, s.y, f(s.x, s.y))) : hillPt, BLUE, 1.4, { strokeDasharray: "4 4" })}
      {hill.map((it) => it.el)}
      {topExtra}
      {s.mode === "descent" ? <circle cx={ballPt[0]} cy={ballPt[1]} r={9} fill={GREEN} stroke="#fff" strokeWidth={2} />
        : <circle cx={hillPt[0]} cy={hillPt[1]} r={7} fill={BLUE} stroke="#fff" strokeWidth={2} />}
      <circle cx={floorPt[0]} cy={floorPt[1]} r={7} fill="#fff" stroke={BLUE} strokeWidth={3} />
      {sliceInset()}
      {said.map((l, i) => (
        <text key={i} x={20} y={SAY_Y + i * SAY} fontSize={15} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>
      ))}
    </>
  );

  const ei = etaIndex(s.eta);
  const held = drag?.part === "point";
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={said.map((l) => l.text).join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={16} y={10} keys={SURFACE_FNS} on={s.fn as SurfaceFn} names={w.fns} onPick={(k) => keep(pickFn(s, k))} />
        <Tabs x={16} y={48} keys={SURFACE_MODES} on={s.mode} names={w.modes} onPick={(k) => keep({ ...s, mode: k, steps: 0 })} />
        {/* The stage: dragged anywhere to turn the hill; the arrow keys turn it too. */}
        <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuemin={0} aria-valuemax={359} aria-valuenow={s.yaw} aria-valuetext={`${s.yaw}°, ${s.pitch}°`}
          onKeyDown={keyTurn} style={{ cursor: drag?.part === "turn" ? "grabbing" : "grab" }} onPointerDown={grabTurn}>
          <title>{w.turnName}</title>
          <rect x={0} y={ST} width={W} height={SH} fill="transparent" />
        </g>
        <g pointerEvents="none">{drawing()}</g>
        {/* The point, on the map and on the hill: either is dragged. */}
        <g role="slider" tabIndex={0} aria-label={s.mode === "lagrange" ? w.curveName : s.mode === "descent" ? w.startName : w.pointName}
          aria-valuemin={-s.half} aria-valuemax={s.half} aria-valuenow={point[0]} aria-valuetext={`(${fmt(point[0])}, ${fmt(point[1])})`}
          data-handle="point" style={{ cursor: held ? "grabbing" : "grab" }} onPointerDown={grabPoint} onKeyDown={keyPoint}>
          <title>{s.mode === "lagrange" ? w.curveName : s.mode === "descent" ? w.startName : w.pointName}</title>
          <circle cx={floorPt[0]} cy={floorPt[1]} r={held ? 10 : 8} fill="#fff" stroke={BLUE} strokeWidth={3} />
          <circle cx={floorPt[0]} cy={floorPt[1]} r={18} fill="transparent" />
        </g>
        {s.mode !== "descent" && (
          <circle cx={hillPt[0]} cy={hillPt[1]} r={16} fill="transparent" style={{ cursor: held ? "grabbing" : "grab" }} onPointerDown={grabPoint} />
        )}
        {s.mode === "descent" && (
          <g role="button" tabIndex={0} aria-label={w.ballName} data-handle="ball" style={{ cursor: canStep ? "pointer" : "default" }}
            onPointerDown={(e) => begin(e, { part: "ball" })} onKeyDown={keyBall}>
            <title>{w.ballName}</title>
            <circle cx={ballPt[0]} cy={ballPt[1]} r={18} fill="transparent" />
          </g>
        )}
        {s.mode === "slice" && (
          <Tabs x={16} y={ST + SH + 10} keys={SLICE_AXES} on={s.axis} names={w.axes} onPick={(k) => keep({ ...s, axis: k })} />
        )}
        {s.mode === "lagrange" && (
          <g>
            <text x={16} y={ST + SH + 36} fontSize={15} fontWeight={700} fill={PURPLE}>{fill(w.fenceIs, { g: pretty(s.g) })}</text>
            <NumBox x={28 + textLen(fill(w.fenceIs, { g: pretty(s.g) })) * 8.6} y={ST + SH + 10} w={64} h={40} size={18} value={s.c} min={-9} max={9} label={w.cName}
              onChange={(c) => keep({ ...s, c, t: 0.25 })} />
          </g>
        )}
        {s.mode === "descent" && (
          <g>
            <Track x={8} y={ST + SH + 6} w={330} value={ei} min={0} max={ETAS.length - 1} label={w.eta} show={(i) => `η = ${num(ETAS[i])}`}
              onChange={(i, done) => (done ? keep : setDraft)({ ...s, eta: ETAS[i], steps: 0 })} />
            <Track x={8} y={ST + SH + 44} w={330} value={Math.round(s.beta * 20)} min={0} max={BETAS.length - 1} label={w.beta} show={(i) => `β = ${num(BETAS[i])}`}
              color={ORANGE} onChange={(i, done) => (done ? keep : setDraft)({ ...s, beta: BETAS[i], steps: 0 })} />
            <Pill x={360} y={ST + SH + 10} w={120} text={w.step} strong disabled={!canStep} onTap={stepBall} />
            <Pill x={490} y={ST + SH + 10} w={130} text={`↺ ${w.again}`} title={w.again} disabled={s.steps === 0} onTap={() => keep({ ...s, steps: 0 })} />
          </g>
        )}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - ST} viewBox={`0 ${ST} ${W} ${H - ST}`} fontFamily={FONT}>
          <rect y={ST} width={W} height={H - ST} fill="#fff" />
          {drawing()}
        </svg>
      </div>
    </>
  );
}

