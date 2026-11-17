// The geometry lab on the board: a coordinate plane to make any shape on, of any size, with everything about the
// chosen one worked out beside it. Draw a polygon corner by corner or a circle, or build one from its measurements
// (three sides, a rectangle w × h, a regular n-gon …); drag a corner or a whole shape, drag the empty plane to look
// around, zoom out for a field or in for a millimetre. The panel names the shape and gives every side, angle,
// diagonal, the perimeter and the area by the shape's own formula, a triangle's heights, medians, bisectors and
// centres, a circle's circumference and equation; pointing at a line of it lights up what it is about on the plane.
// The maths is in src/math/geoLab.ts. "Copy as a picture" copies the plane without the handles, with the main numbers.
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  CANVAS, dist, enlarge, fitView, fromPx, gridStep, insertPoint, make, MAKE_PARAMS, MAKES, MAX_FIGS, MAX_PTS,
  measureFig, moveFig, num, placeBeside, pointNames, removePoint, rounded, setSide, SHOWS, snapTo, toPx, UNITS,
  zoomView, type GeoFig, type GeoShow, type GeoTool, type GeoView, type LiveGeoLab, type MakeKind, type MakeProblem,
  type Mark, type Measured, type Pt, type SectionKey, type Val,
} from "../math/geoLab";
import { fill, FONT, INK, svgPoint, Toggle, type PieceProps } from "./ui";

type Words = PieceProps<"geoLab">["w"]["geoLab"];
type Drag =
  | { type: "vertex"; f: number; i: number; moved: boolean }
  | { type: "fig"; f: number; p0: Pt; orig: GeoFig; moved: boolean }
  | { type: "radius"; f: number; moved: boolean }
  | { type: "pan"; px0: Pt; view0: GeoView; moved: boolean };
type Temp = { figs: GeoFig[]; view: GeoView; sel: number };

const BLUE = "#1971c2";
const HL = "#f08c00";
const COL = { heights: "#7048e8", medians: "#2f9e44", bisectors: "#e8590c", circum: "#e03131", incircle: "#0c8599", diagonals: "#868e96", symmetry: "#ae3ec9" };
const ORDER: SectionKey[] = ["size", "sides", "angles", "circle", "diagonals", "triangle", "regular", "symmetry", "points"];
const halo = { stroke: "#fff", strokeWidth: 3.5, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

const readNum = (s: string) => {
  const t = s.trim().replace(",", ".");
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  return frac ? Number(frac[1]) / Number(frac[2]) : t === "" ? NaN : Number(t);
};

/** The shape's name: "Triangle · scalene · right-angled". */
export function shapeName(m: Measured, w: Words): string {
  const base = m.base === "polygon" ? fill(w.bases.polygon, { n: m.n }) : w.bases[m.base];
  const tag = (t: Measured["tags"][number]) => (m.base === "trapezoid" && (t === "isosceles" || t === "right") ? w.trapezoidTags[t] : w.tags[t]);
  return [base, ...m.tags.map(tag)].join(" · ");
}

function fmtVal(v: Val, w: Words, unit: string): string {
  const u = (p: string) => (unit ? ` ${unit}${p}` : "");
  if (v.dim === "pt") return fill(w.pointFmt, { x: num(v.p![0]), y: num(v.p![1]) });
  if (v.dim === 0) return Number.isFinite(v.n) ? String(v.n) : w.infinite;
  const approx = rounded(v.n) ? "≈ " : "";
  if (v.dim === "deg") return `${approx}${num(v.n)}°`;
  const tail = `${num(v.n)}${u(v.dim === 2 ? "²" : "")}`;
  if (v.exact && v.exact !== num(v.n)) return `${v.exact} ≈ ${tail}`;
  return approx + tail;
}

// ---------- the plane ----------

type PlaneProps = {
  figs: GeoFig[];
  sel: number;
  m: Measured | null;
  names: string[][];
  view: GeoView;
  show: GeoShow[];
  unit: string;
  w: Words;
  clean?: boolean;
  tool?: GeoTool;
  draft?: Pt[];
  cursor?: Pt | null;
  hl?: Mark[] | null;
  caption?: string[];
  svgRef?: React.Ref<SVGSVGElement>;
  on?: {
    down: (e: ReactPointerEvent<SVGSVGElement>) => void;
    move: (e: ReactPointerEvent<SVGSVGElement>) => void;
    up: (e: ReactPointerEvent<SVGSVGElement>) => void;
    dbl: (e: React.MouseEvent<SVGSVGElement>) => void;
  };
};

function Grid({ view }: { view: GeoView }) {
  const step = gridStep(view);
  const [x0, y1] = fromPx(view, [0, 0]);
  const [x1, y0] = fromPx(view, [CANVAS.w, CANVAS.h]);
  const lines: ReactNode[] = [];
  const labels: ReactNode[] = [];
  const [ax, ay] = toPx(view, [0, 0]);
  const labelY = Math.min(CANVAS.h - 6, Math.max(14, ay + 14));
  const labelX = Math.min(CANVAS.w - 6, Math.max(6, ax - 5));
  const every = step * view.s < 50 ? 2 : 1;
  for (let i = Math.ceil(x0 / step); i <= Math.floor(x1 / step) && lines.length < 200; i++) {
    const [x] = toPx(view, [i * step, 0]);
    lines.push(<line key={`x${i}`} x1={x} y1={0} x2={x} y2={CANVAS.h} stroke={i === 0 ? "#868e96" : "#e9ecef"} strokeWidth={i === 0 ? 1.4 : 1} />);
    if (i !== 0 && i % every === 0) labels.push(<text key={`lx${i}`} x={x} y={labelY} fontSize={10} textAnchor="middle" fill="#868e96" {...halo}>{num(i * step)}</text>);
  }
  for (let j = Math.ceil(y0 / step); j <= Math.floor(y1 / step) && lines.length < 400; j++) {
    const [, y] = toPx(view, [0, j * step]);
    lines.push(<line key={`y${j}`} x1={0} y1={y} x2={CANVAS.w} y2={y} stroke={j === 0 ? "#868e96" : "#e9ecef"} strokeWidth={j === 0 ? 1.4 : 1} />);
    if (j !== 0 && j % every === 0) labels.push(<text key={`ly${j}`} x={labelX} y={y + 3.5} fontSize={10} textAnchor={ax - 5 > CANVAS.w - 6 || labelX < ax - 5 + 0.01 ? "end" : "start"} fill="#868e96" {...halo}>{num(j * step)}</text>);
  }
  return <g pointerEvents="none">{lines}{labels}</g>;
}

const path = (view: GeoView, pts: Pt[], close = true) => pts.map((p, i) => `${i ? "L" : "M"}${toPx(view, p).map((v) => v.toFixed(2)).join(" ")}`).join(" ") + (close ? " Z" : "");

/** The arc (or the little square of a right angle) that marks the angle at v between its neighbours. */
function angleMark(view: GeoView, p: Pt, v: Pt, q: Pt, deg: number, orient: number, color: string, label?: string) {
  const dirQ = Math.atan2(q[1] - v[1], q[0] - v[0]);
  const dirP = Math.atan2(p[1] - v[1], p[0] - v[0]);
  const start = orient > 0 ? dirQ : dirP;
  const sweep = (deg * Math.PI) / 180;
  const shortest = Math.min(dist(p, v), dist(q, v)) * view.s;
  const r = Math.max(8, Math.min(24, shortest * 0.4)) / view.s;
  const at = (a: number, rr: number): Pt => toPx(view, [v[0] + rr * Math.cos(a), v[1] + rr * Math.sin(a)]);
  const midA = start + sweep / 2;
  const lab = at(midA, r + 15 / view.s);
  if (Math.abs(deg - 90) < 1e-6) {
    const k = Math.min(10, shortest * 0.35) / view.s;
    const a = at(start, k);
    const c = at(start + sweep, k);
    const b = toPx(view, [v[0] + k * (Math.cos(start) + Math.cos(start + sweep)), v[1] + k * (Math.sin(start) + Math.sin(start + sweep))]);
    return (
      <g>
        <path d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]}`} fill="none" stroke={color} strokeWidth={1.4} />
        {label && <text x={lab[0]} y={lab[1] + 4} fontSize={11} textAnchor="middle" fill={color} {...halo}>{label}</text>}
      </g>
    );
  }
  const steps = Math.max(6, Math.ceil(deg / 10));
  const d = Array.from({ length: steps + 1 }, (_, t) => at(start + (sweep * t) / steps, r)).map(([x, y], t) => `${t ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} />
      {label && <text x={lab[0]} y={lab[1] + 4} fontSize={11} textAnchor="middle" fill={color} {...halo}>{label}</text>}
    </g>
  );
}

function Highlight({ view, marks }: { view: GeoView; marks: Mark[] }) {
  return (
    <g pointerEvents="none">
      {marks.map((mk, i) => {
        if ("seg" in mk) {
          const [a, b] = mk.seg.map((p) => toPx(view, p));
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={HL} strokeWidth={4} strokeLinecap="round" opacity={0.85} />;
        }
        if ("pt" in mk) {
          const [x, y] = toPx(view, mk.pt);
          return <circle key={i} cx={x} cy={y} r={7} fill={HL} opacity={0.85} />;
        }
        if ("ring" in mk) {
          const [x, y] = toPx(view, mk.ring[0]);
          return <circle key={i} cx={x} cy={y} r={mk.ring[1] * view.s} fill="none" stroke={HL} strokeWidth={3.5} opacity={0.85} />;
        }
        const [p, v, q] = mk.corner.map((c) => toPx(view, c));
        return <path key={i} d={`M${p[0]} ${p[1]} L${v[0]} ${v[1]} L${q[0]} ${q[1]}`} fill="none" stroke={HL} strokeWidth={4} strokeLinejoin="round" opacity={0.85} />;
      })}
    </g>
  );
}

function Plane({ figs, sel, m, names, view, show, unit, w, clean, tool = "move", draft = [], cursor, hl, caption = [], svgRef, on }: PlaneProps) {
  const has = (k: GeoShow) => show.includes(k);
  const px = (p: Pt) => toPx(view, p);
  const f = figs[sel];
  const uText = unit ? ` ${unit}` : "";
  const H = CANVAS.h + caption.length * 22 + (caption.length ? 10 : 0);
  const big = 3000 / view.s;

  const overlays: ReactNode[] = [];
  const labels: ReactNode[] = [];
  if (f && m && f.kind === "poly") {
    const pts = f.pts;
    const n = pts.length;
    const o = m.overlay;
    const ring = (c: Pt, r: number, color: string, name: string, key: string) => {
      const [x, y] = px(c);
      overlays.push(
        <g key={key}>
          <circle cx={x} cy={y} r={r * view.s} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="6 4" />
          <circle cx={x} cy={y} r={3} fill={color} />
          <text x={x + 6} y={y - 6} fontSize={12} fill={color} fontWeight={700} {...halo}>{name}</text>
        </g>,
      );
    };
    if (has("symmetry"))
      o.axes.forEach(({ c, d }, i) => {
        const l = Math.hypot(d[0], d[1]) || 1;
        const [a, b] = [px([c[0] - (d[0] / l) * big, c[1] - (d[1] / l) * big]), px([c[0] + (d[0] / l) * big, c[1] + (d[1] / l) * big])];
        overlays.push(<line key={`ax${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={COL.symmetry} strokeWidth={1.3} strokeDasharray="10 4 2 4" />);
      });
    if (has("circum") && o.circum) ring(o.circum.c, o.circum.r, COL.circum, "O", "circ");
    if (has("incircle") && o.incircle) ring(o.incircle.c, o.incircle.r, COL.incircle, "I", "inc");
    if (has("diagonals"))
      o.diagonals.forEach(([a, b], i) => {
        const [p, q] = [px(a), px(b)];
        overlays.push(<line key={`dg${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={COL.diagonals} strokeWidth={1.3} strokeDasharray="5 4" />);
      });
    if (has("heights")) {
      o.heights.forEach(({ from, foot, base }, i) => {
        const [p, q] = [px(from), px(foot)];
        // The base's line carried on to the foot when it falls outside the side.
        const [b0, b1] = base;
        const t = ((foot[0] - b0[0]) * (b1[0] - b0[0]) + (foot[1] - b0[1]) * (b1[1] - b0[1])) / ((b1[0] - b0[0]) ** 2 + (b1[1] - b0[1]) ** 2 || 1);
        const near = t < 0 ? px(b0) : t > 1 ? px(b1) : null;
        const ref: Pt = dist(foot, b0) > dist(foot, b1) ? b0 : b1;
        overlays.push(
          <g key={`h${i}`}>
            {near && <line x1={near[0]} y1={near[1]} x2={q[0]} y2={q[1]} stroke={COL.heights} strokeWidth={1} strokeDasharray="2 3" />}
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={COL.heights} strokeWidth={1.5} strokeDasharray="6 3" />
            {dist(from, foot) > 1e-12 && dist(foot, ref) > 1e-12 && angleMark(view, ref, foot, from, 90, 1, COL.heights)}
          </g>,
        );
      });
      const H0 = o.centres.find((c) => c.name === "H");
      if (H0) {
        const [x, y] = px(H0.p);
        overlays.push(<g key="H"><circle cx={x} cy={y} r={3.2} fill={COL.heights} /><text x={x + 6} y={y - 6} fontSize={12} fill={COL.heights} fontWeight={700} {...halo}>H</text></g>);
      }
    }
    if (has("medians")) {
      o.medians.forEach(([a, b], i) => {
        const [p, q] = [px(a), px(b)];
        overlays.push(<g key={`m${i}`}><line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={COL.medians} strokeWidth={1.5} /><circle cx={q[0]} cy={q[1]} r={2.5} fill={COL.medians} /></g>);
      });
      const G = o.centres.find((c) => c.name === "G");
      if (G) {
        const [x, y] = px(G.p);
        overlays.push(<g key="G"><circle cx={x} cy={y} r={3.2} fill={COL.medians} /><text x={x + 6} y={y - 6} fontSize={12} fill={COL.medians} fontWeight={700} {...halo}>G</text></g>);
      }
    }
    if (has("bisectors"))
      o.bisectors.forEach(([a, b], i) => {
        const [p, q] = [px(a), px(b)];
        overlays.push(<line key={`b${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={COL.bisectors} strokeWidth={1.5} strokeDasharray="8 3" />);
      });

    // Angles, side lengths and the corners' names.
    const centre: Pt = [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
    pts.forEach((v, i) => {
      const [p, q] = [pts[(i + n - 1) % n], pts[(i + 1) % n]];
      const a = m.angles[i];
      if (has("angles") && Number.isFinite(a)) labels.push(<g key={`a${i}`}>{angleMark(view, p, v, q, a, m.orient, "#495057", `${num(a)}°`)}</g>);
      if (has("lengths")) {
        const [dx, dy] = [q[0] - v[0], q[1] - v[1]];
        const l = Math.hypot(dx, dy) || 1;
        const [nx, ny] = m.orient > 0 ? [dy / l, -dx / l] : [-dy / l, dx / l];
        const [mx, my] = px([(v[0] + q[0]) / 2, (v[1] + q[1]) / 2]);
        const side = m.sections.find((s) => s.key === "sides")?.facts[i]?.v;
        const text = (side?.exact && side.exact.includes("√") ? side.exact : num(Math.hypot(dx, dy))) + uText;
        labels.push(<text key={`s${i}`} x={mx + nx * 13} y={my - ny * 13 + 4} fontSize={12} textAnchor="middle" fill={BLUE} fontWeight={600} {...halo}>{text}</text>);
      }
      // The name sits outside the corner, across from the angle's middle.
      let [ux, uy] = [v[0] - centre[0], v[1] - centre[1]];
      if (Number.isFinite(a)) {
        const dirQ = Math.atan2(q[1] - v[1], q[0] - v[0]);
        const dirP = Math.atan2(p[1] - v[1], p[0] - v[0]);
        const midA = (m.orient > 0 ? dirQ : dirP) + ((a * Math.PI) / 180) / 2;
        [ux, uy] = [-Math.cos(midA), -Math.sin(midA)];
      }
      const ul = Math.hypot(ux, uy) || 1;
      const [x, y] = px(v);
      const coords = has("coords") ? ` (${num(v[0])}; ${num(v[1])})` : "";
      labels.push(
        <text key={`n${i}`} x={x + (ux / ul) * 15} y={y - (uy / ul) * 15 + 4.5} fontSize={13} textAnchor={ux / ul > 0.5 ? "start" : ux / ul < -0.5 ? "end" : "middle"} fill={INK} fontWeight={700} {...halo}>
          {names[sel][i]}
          {coords && <tspan fontWeight={400} fontSize={11} fill="#495057">{coords}</tspan>}
        </text>,
      );
    });
  }
  if (f && m && f.kind === "circle") {
    const [x, y] = px(f.c);
    const rim = px([f.c[0] + f.r, f.c[1]]);
    if (has("lengths"))
      labels.push(
        <g key="r">
          <line x1={x} y1={y} x2={rim[0]} y2={rim[1]} stroke={BLUE} strokeWidth={1.5} />
          <text x={(x + rim[0]) / 2} y={y - 6} fontSize={12} textAnchor="middle" fill={BLUE} fontWeight={600} {...halo}>r = {num(f.r)}{uText}</text>
        </g>,
      );
    labels.push(
      <text key="o" x={x - 6} y={y + 15} fontSize={13} textAnchor="end" fill={INK} fontWeight={700} {...halo}>
        {names[sel][0]}
        {has("coords") && <tspan fontWeight={400} fontSize={11} fill="#495057">{` (${num(f.c[0])}; ${num(f.c[1])})`}</tspan>}
      </text>,
    );
  }

  const handles: ReactNode[] = [];
  if (!clean && tool === "move" && f) {
    if (f.kind === "poly") {
      f.pts.forEach((p, i) => {
        const [x, y] = px(p);
        handles.push(<circle key={`v${i}`} data-h={`v-${sel}-${i}`} cx={x} cy={y} r={6.5} fill="#fff" stroke={BLUE} strokeWidth={2} style={{ cursor: "grab" }} />);
      });
      if (f.pts.length < MAX_PTS)
        f.pts.forEach((p, i) => {
          const q = f.pts[(i + 1) % f.pts.length];
          const [x, y] = px([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
          if (dist(p, q) * view.s < 40) return;
          handles.push(
            <g key={`m${i}`} data-h={`m-${sel}-${i}`} style={{ cursor: "copy" }}>
              <circle cx={x} cy={y} r={6} fill={BLUE} opacity={0.18} />
              <text x={x} y={y + 4} fontSize={12} textAnchor="middle" fill={BLUE} fontWeight={700}>+</text>
              <title>{w.addCorner}</title>
            </g>,
          );
        });
    } else {
      const [x, y] = px(f.c);
      const rim = px([f.c[0] + f.r, f.c[1]]);
      handles.push(<circle key="c" data-h={`c-${sel}`} cx={x} cy={y} r={6} fill="#fff" stroke={BLUE} strokeWidth={2} style={{ cursor: "grab" }} />);
      handles.push(<circle key="r" data-h={`r-${sel}`} cx={rim[0]} cy={rim[1]} r={6.5} fill={BLUE} stroke="#fff" strokeWidth={2} style={{ cursor: "ew-resize" }} />);
    }
  }

  return (
    <svg ref={svgRef} className={clean ? undefined : "glab-plane"} width={CANVAS.w} height={H} viewBox={`0 0 ${CANVAS.w} ${H}`} fontFamily={FONT}
      onPointerDown={on?.down} onPointerMove={on?.move} onPointerUp={on?.up} onPointerCancel={on?.up} onDoubleClick={on?.dbl}
      style={{ cursor: tool === "move" ? "default" : "crosshair" }}>
      <defs>
        <clipPath id={clean ? "geo-clip-c" : "geo-clip"}><rect width={CANVAS.w} height={CANVAS.h} /></clipPath>
      </defs>
      <rect width={CANVAS.w} height={H} fill="#fff" />
      <g clipPath={`url(#${clean ? "geo-clip-c" : "geo-clip"})`}>
        {has("grid") && <Grid view={view} />}
        {figs.map((g, i) => {
          const on = i === sel;
          const style = { fill: on ? "#d0ebff" : "#f1f3f5", fillOpacity: on ? 0.55 : 0.7, stroke: on ? BLUE : "#495057", strokeWidth: on ? 2.2 : 1.6, cursor: tool === "move" && !clean ? "move" : undefined };
          if (g.kind === "circle") {
            const [x, y] = px(g.c);
            return <circle key={i} data-h={`f-${i}`} cx={x} cy={y} r={g.r * view.s} {...style} />;
          }
          return <path key={i} data-h={`f-${i}`} d={path(view, g.pts)} {...style} strokeLinejoin="round" fillRule="evenodd" />;
        })}
        {figs.map((g, i) =>
          i === sel ? null : (
            <g key={`n${i}`} pointerEvents="none">
              {(g.kind === "circle" ? [g.c] : g.pts).map((p, j) => {
                const [x, y] = px(p);
                return <text key={j} x={x + 5} y={y - 5} fontSize={11} fill="#868e96" {...halo}>{names[i][j]}</text>;
              })}
            </g>
          ),
        )}
        <g pointerEvents="none">{overlays}</g>
        <g pointerEvents="none">{labels}</g>
        {handles}
        {hl && <Highlight view={view} marks={hl} />}
        {!clean && draft.length > 0 && (
          <g pointerEvents="none">
            {tool === "poly" && <path d={path(view, cursor ? [...draft, cursor] : draft, false)} fill="none" stroke={BLUE} strokeWidth={2} strokeDasharray="5 3" />}
            {tool === "circle" && cursor && <circle cx={px(draft[0])[0]} cy={px(draft[0])[1]} r={dist(draft[0], cursor) * view.s} fill="#d0ebff" fillOpacity={0.4} stroke={BLUE} strokeWidth={2} strokeDasharray="5 3" />}
            {draft.map((p, i) => {
              const [x, y] = px(p);
              return <circle key={i} cx={x} cy={y} r={i === 0 && tool === "poly" && draft.length >= 3 ? 8 : 4.5} fill={i === 0 ? "#fff" : BLUE} stroke={BLUE} strokeWidth={2} />;
            })}
            {tool === "circle" && cursor && <text x={px(cursor)[0] + 8} y={px(cursor)[1] - 8} fontSize={12} fill={BLUE} {...halo}>r = {num(dist(draft[0], cursor))}{uText}</text>}
            {tool === "poly" && cursor && draft.length > 0 && <text x={px(cursor)[0] + 8} y={px(cursor)[1] - 8} fontSize={12} fill={BLUE} {...halo}>{num(dist(draft[draft.length - 1], cursor))}{uText}</text>}
          </g>
        )}
      </g>
      {caption.map((c, i) => (
        <text key={i} x={10} y={CANVAS.h + 24 + i * 22} fontSize={i ? 15 : 16} fontWeight={i ? 400 : 700} fill={INK}>{c}</text>
      ))}
    </svg>
  );
}

// ---------- the panel ----------

function Facts({ m, w, unit, setHl, editSide, sides }: {
  m: Measured;
  w: Words;
  unit: string;
  setHl: (marks: Mark[] | null) => void;
  editSide?: (i: number, l: number) => void;
  sides?: number;
}) {
  const [editing, setEditing] = useState<{ i: number; text: string } | null>(null);
  const sections = [...m.sections].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  return (
    <>
      {sections.map((s) => (
        <section key={s.key}>
          <h4>{w.sections[s.key]}</h4>
          {s.facts.map((f, i) => {
            const label = fill(w.facts[f.key], { name: f.name ?? "" });
            const canEdit = s.key === "sides" && editSide && sides !== undefined;
            return (
              <div key={i} className="glab-fact" onPointerEnter={() => setHl(f.mark ?? null)} onPointerLeave={() => setHl(null)}>
                <div>
                  <span>{label}</span>
                  {canEdit && editing?.i === i ? (
                    <input
                      className={`live-num${Number.isFinite(readNum(editing.text)) && readNum(editing.text) > 0 ? "" : " invalid"}`}
                      value={editing.text}
                      autoFocus
                      aria-label={fill(w.setLength, { name: f.name ?? "" })}
                      onChange={(e) => setEditing({ i, text: e.target.value })}
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                        if (e.key !== "Enter") return;
                        const l = readNum(editing.text);
                        if (l > 0) editSide!(i, l);
                        setEditing(null);
                      }}
                    />
                  ) : canEdit ? (
                    <button className="glab-edit" title={fill(w.setLength, { name: f.name ?? "" })} onClick={() => setEditing({ i, text: num(f.v!.n).replace("−", "-") })}>
                      {fmtVal(f.v!, w, unit)} ✎
                    </button>
                  ) : (
                    f.v && <b>{fmtVal(f.v, w, unit)}</b>
                  )}
                </div>
                {f.how && <div className="glab-how">{f.how}</div>}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

// ---------- the piece ----------

export function GeoLab({ state, set, w: words, svgRef }: PieceProps<"geoLab">) {
  const w = words.geoLab;
  const [temp, setTemp] = useState<Temp | null>(null);
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [hl, setHl] = useState<Mark[] | null>(null);
  const [makeKind, setMakeKind] = useState<MakeKind>("sss");
  const [vals, setVals] = useState<string[]>(MAKE_PARAMS.sss.start.map(String));
  const [problem, setProblem] = useState<MakeProblem | null>(null);
  const [k, setK] = useState("2");

  const figs = temp?.figs ?? state.figs;
  const view = temp?.view ?? state.view;
  const sel = temp?.sel ?? state.sel;
  const names = useMemo(() => pointNames(figs), [figs]);
  const m = useMemo(() => (figs[sel] ? measureFig(figs[sel], names[sel]) : null), [figs, sel, names]);
  const unit = state.unit ? w.units[state.unit] : "";
  const step = gridStep(view);
  const snapP = (p: Pt) => (state.snap ? snapTo(p, step) : p);
  const put = (patch: Partial<LiveGeoLab>) => set({ ...state, ...patch });

  const addFig = (fig: GeoFig, fit: boolean) => {
    if (state.figs.length >= MAX_FIGS) return;
    const next = [...state.figs, fig];
    put({ figs: next, sel: next.length - 1, tool: "move", ...(fit ? { view: fitView(next) } : {}) });
  };
  const finish = (pts = draft) => {
    setDraft([]);
    if (pts.length >= 3) addFig({ kind: "poly", pts }, false);
  };
  const setTool = (tool: GeoTool) => {
    setDraft([]);
    put({ tool });
  };

  const worldAt = (e: { clientX: number; clientY: number }, svg: SVGSVGElement, v = view): Pt => fromPx(v, svgPoint(svg, e) as Pt);
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const svg = e.currentTarget;
    const p = worldAt(e, svg);
    if (state.tool === "poly") {
      if (draft.length >= 3 && dist(draft[0], p) * view.s < 12) return finish();
      const next = [...draft, snapP(p)];
      if (next.length > 1 && dist(next[next.length - 1], next[next.length - 2]) < 1e-12) return;
      return next.length >= MAX_PTS ? finish(next) : setDraft(next);
    }
    if (state.tool === "circle") {
      if (!draft.length) return setDraft([snapP(p)]);
      const r = dist(draft[0], snapP(p));
      setDraft([]);
      if (r > 0) addFig({ kind: "circle", c: draft[0], r }, false);
      return;
    }
    svg.setPointerCapture(e.pointerId);
    const h = (e.target as Element).closest("[data-h]")?.getAttribute("data-h")?.split("-");
    const base: Temp = { figs: state.figs, view: state.view, sel: state.sel };
    if (h?.[0] === "v") drag.current = { type: "vertex", f: +h[1], i: +h[2], moved: false };
    else if (h?.[0] === "m") {
      const [f, i] = [+h[1], +h[2]];
      const fig = state.figs[f];
      if (fig.kind !== "poly") return;
      base.figs = state.figs.map((g, j) => (j === f ? { ...fig, pts: insertPoint(fig.pts, i) } : g));
      drag.current = { type: "vertex", f, i: i + 1, moved: true };
    } else if (h?.[0] === "f" || h?.[0] === "c") {
      const f = +h[1];
      base.sel = f;
      drag.current = { type: "fig", f, p0: p, orig: state.figs[f], moved: false };
    } else if (h?.[0] === "r") drag.current = { type: "radius", f: +h[1], moved: false };
    else drag.current = { type: "pan", px0: svgPoint(svg, e) as Pt, view0: state.view, moved: false };
    setTemp(base);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    if (state.tool !== "move") return setCursor(draft.length ? snapP(worldAt(e, svg)) : null);
    const d = drag.current;
    if (!d || !temp) return;
    if (d.type === "pan") {
      const [x, y] = svgPoint(svg, e);
      const [dx, dy] = [x - d.px0[0], y - d.px0[1]];
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      return setTemp({ ...temp, view: { ...d.view0, cx: d.view0.cx - dx / d.view0.s, cy: d.view0.cy + dy / d.view0.s } });
    }
    const p = worldAt(e, svg, temp.view);
    const replace = (g: GeoFig) => setTemp({ ...temp, figs: temp.figs.map((x, j) => (j === d.f ? g : x)) });
    const fig = temp.figs[d.f];
    if (d.type === "vertex" && fig.kind === "poly") {
      const q = snapP(p);
      if (!d.moved && dist(q, fig.pts[d.i]) * view.s < 3) return;
      d.moved = true;
      return replace({ ...fig, pts: fig.pts.map((r, j) => (j === d.i ? q : r)) });
    }
    if (d.type === "fig") {
      const raw: Pt = [p[0] - d.p0[0], p[1] - d.p0[1]];
      if (!d.moved && Math.hypot(raw[0], raw[1]) * view.s < 4) return;
      d.moved = true;
      return replace(moveFig(d.orig, state.snap ? snapTo(raw, step) : raw));
    }
    if (d.type === "radius" && fig.kind === "circle") {
      const r = dist(fig.c, p);
      const rr = state.snap ? Math.max(step, Math.round(r / step) * step) : Math.max(r, 1e-9);
      d.moved = true;
      return replace({ ...fig, r: rr });
    }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !temp) return;
    setTemp(null);
    if (d.moved) put({ figs: temp.figs, view: temp.view, sel: temp.sel });
    else if (d.type === "pan" && state.sel !== -1) put({ sel: -1 });
    else if (temp.sel !== state.sel) put({ sel: temp.sel });
  };
  const dbl = (e: React.MouseEvent<SVGSVGElement>) => {
    const h = (e.target as Element).closest("[data-h]")?.getAttribute("data-h")?.split("-");
    if (state.tool !== "move" || h?.[0] !== "v") return;
    const [f, i] = [+h[1], +h[2]];
    const fig = state.figs[f];
    if (fig.kind === "poly" && fig.pts.length > 3) put({ figs: state.figs.map((g, j) => (j === f ? { ...fig, pts: removePoint(fig.pts, i) } : g)) });
  };

  const build = () => {
    const r = make(makeKind, vals.map(readNum));
    if ("problem" in r) return setProblem(r.problem);
    setProblem(null);
    addFig(placeBeside(state.figs, r.fig), true);
  };
  const chooseMake = (kind: MakeKind) => {
    setMakeKind(kind);
    setVals(MAKE_PARAMS[kind].start.map(String));
    setProblem(null);
  };
  const selFig = state.figs[state.sel];
  const replaceSel = (g: GeoFig) => put({ figs: state.figs.map((x, j) => (j === state.sel ? g : x)) });
  const kNum = readNum(k);

  const caption = m
    ? [
        shapeName(m, w),
        m.sections
          .flatMap((s) => s.facts)
          .filter((f) => ["perimeter", "area", "circumference", "circleArea"].includes(f.key) && f.v)
          .map((f) => `${fill(w.facts[f.key], { name: f.name ?? "" })} = ${fmtVal(f.v!, w, unit)}`)
          .join("   ·   "),
      ]
    : [];
  const hint = state.tool === "poly" ? (draft.length ? fill(w.hints.polyGoing, { n: draft.length }) : w.hints.poly) : state.tool === "circle" ? w.hints.circle : w.hints.move;

  return (
    <>
      <div className="live-bar">
        {(["move", "poly", "circle"] as GeoTool[]).map((t) => (
          <Toggle key={t} on={state.tool === t} onClick={() => setTool(t)}>{w.tools[t]}</Toggle>
        ))}
        {state.tool === "poly" && draft.length >= 3 && <button className="live-btn primary" onClick={() => finish()}>{w.finish}</button>}
        {state.tool !== "move" && draft.length > 0 && <button className="live-btn" onClick={() => setDraft([])}>{w.cancel}</button>}
        <span className="glab-sep" />
        <button className="live-btn" title={w.zoomOut} aria-label={w.zoomOut} onClick={() => put({ view: zoomView(state.view, 1 / 1.6) })}>−</button>
        <button className="live-btn" title={w.zoomIn} aria-label={w.zoomIn} onClick={() => put({ view: zoomView(state.view, 1.6) })}>+</button>
        <button className="live-btn" disabled={!state.figs.length} onClick={() => put({ view: fitView(state.figs) })}>{w.fit}</button>
        <Toggle on={state.snap} onClick={() => put({ snap: !state.snap })}>{w.snap}</Toggle>
        <label className="live-select">
          {w.unit}
          <select value={state.unit} onChange={(e) => put({ unit: e.target.value as LiveGeoLab["unit"] })}>
            {UNITS.map((u) => <option key={u} value={u}>{u ? w.units[u] : w.noUnit}</option>)}
          </select>
        </label>
      </div>
      <div className="live-bar glab-make">
        <label className="live-select">
          {w.make}
          <select value={makeKind} onChange={(e) => chooseMake(e.target.value as MakeKind)}>
            {MAKES.map((kind) => <option key={kind} value={kind}>{w.makes[kind]}</option>)}
          </select>
        </label>
        {MAKE_PARAMS[makeKind].keys.map((key, i) => (
          <label key={key} className="live-field">
            {w.params[key]}
            <input
              className={`live-num${Number.isFinite(readNum(vals[i])) && readNum(vals[i]) > 0 ? "" : " invalid"}`}
              inputMode="decimal"
              value={vals[i]}
              onChange={(e) => setVals(vals.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => e.key === "Enter" && build()}
            />
          </label>
        ))}
        <button className="live-btn primary" disabled={state.figs.length >= MAX_FIGS} onClick={build}>{w.add}</button>
      </div>
      {problem && <p className="live-said">{w.problems[problem]}</p>}
      <div className="live-bar">
        {SHOWS.map((s) => (
          <Toggle key={s} on={state.show.includes(s)} onClick={() => put({ show: state.show.includes(s) ? state.show.filter((x) => x !== s) : [...state.show, s] })}>
            {w.shows[s]}
          </Toggle>
        ))}
      </div>
      <div className="glab-row">
        <Plane
          figs={figs} sel={sel} m={m} names={names} view={view} show={state.show} unit={unit} w={w}
          tool={state.tool} draft={draft} cursor={cursor} hl={hl}
          on={{ down, move, up, dbl }}
        />
        <div className="glab-facts" onWheel={(e) => e.stopPropagation()}>
          {m && selFig ? (
            <>
              <div className="glab-name">{shapeName(m, w)}</div>
              <div className="glab-actions">
                <button className="live-btn" disabled={state.figs.length >= MAX_FIGS} onClick={() => addFig(placeBeside(state.figs, selFig), true)}>{w.duplicate}</button>
                <button className="live-btn" onClick={() => put({ figs: state.figs.filter((_, j) => j !== state.sel), sel: -1 })}>{w.remove}</button>
                <span className="live-field">
                  <button className="live-btn" disabled={!(kNum > 0) || kNum === 1} onClick={() => replaceSel(enlarge(selFig, kNum))}>{w.enlarge}</button>
                  ×
                  <input className={`live-num glab-k${kNum > 0 ? "" : " invalid"}`} inputMode="decimal" value={k} aria-label={w.factor} onChange={(e) => setK(e.target.value)} />
                </span>
              </div>
              <Facts
                m={m} w={w} unit={unit} setHl={setHl}
                sides={selFig.kind === "poly" ? selFig.pts.length : undefined}
                editSide={selFig.kind === "poly" ? (i, l) => replaceSel({ ...selFig, pts: setSide(selFig.pts, i, l) }) : undefined}
              />
            </>
          ) : (
            <p className="live-note">{state.figs.length ? w.pick : w.empty}</p>
          )}
        </div>
      </div>
      <p className="live-hint">{hint}</p>
      <div hidden>
        <Plane figs={state.figs} sel={state.sel} m={m} names={names} view={state.view} show={state.show} unit={unit} w={w} clean caption={caption} svgRef={svgRef} />
      </div>
    </>
  );
}
