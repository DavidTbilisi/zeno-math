// A solid on the board (#564), worked by hand: dragged round to look at it from any side, its sizes changed by the
// blue handles on its edges, opened out into its net (the pieces carrying their areas, which add up to the surface
// area), sliced by a plane that is moved, tilted and turned by its handles (the cut face named and measured), and a
// cuboid filled with unit cubes a layer at a time. The solid comes from the tray at the top; what the hand does, from
// the row under it. It is drawn as flat faces in an SVG, nearest last, so any number of solids show on one board.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  add, CUT_AT, cubeFaces, cutArea, cutFaces, cutName, cutPlane, coneSlant, DIM, fmt, measures, mean, modesOf, netFaces, netParts, netSum, pickShape,
  polyArea, resize, scale, seen, seenWay, SIDES, SOLID_SHAPES, solidFaces, sub, TILT, unit, PITCH, type Face, type FaceTag, type LiveSolid, type Plane,
  type SolidMode, type V3,
} from "../math/solid";
import { BLUE, keyTap, NumBox, RED, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
/** The stage the solid is drawn on: its top, height and middle. */
const ST = 88;
const SH = 440;
const [CX, CY] = [W / 2, ST + SH / 2];
/** The most screen units to one unit of the solid, so a small solid looks small. */
const PX = 34;
const SAY_Y = ST + SH + 30;
const SAY = 25;
const H = SAY_Y + 4 * SAY;
/** How long a tap takes to open or fold the net. */
const OPEN_MS = 900;
/** Light from the upper left, a little in front, as seen. */
const LIGHT = unit([-0.45, 0.6, 0.66]);
const COLORS: Record<FaceTag, string> = { base: "#a5d8ff", top: "#a5d8ff", side: "#b2f2bb", curved: "#ffd8a8", cut: "#ff8787", cube: "#ffe066" };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap360 = (v: number) => ((Math.round(v) % 360) + 360) % 360;

/** A colour darker by k (0 to 1). */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `rgb(${c.join(",")})`;
}

const key = (p: V3) => p.map((v) => v.toFixed(4)).join(",");
const edgeKey = (p: V3, q: V3) => [key(p), key(q)].sort().join("|");

type Shown = Face & { faded?: boolean };
/** A face as drawn: its corners on the picture, how near, its colour, and which of its edges are lines. */
type Drawn = { pts: [number, number][]; depth: number; fill: string; lines: boolean[]; faded?: boolean; tag: FaceTag };

/** What the hand holds: the view, a size or the slice by one of their handles, or the net. */
type Hold =
  | { part: "turn"; yaw0: number; pitch0: number; px: number }
  | { part: "open"; open0: number; out: [number, number]; px: number }
  | { part: "value"; id: string; v0: number; sx: number; sy: number; px: number };

/** A handle on the solid: where it is, which way it goes as its value grows by one, and what that value does. */
type Handle = { id: string; name: string; label?: string; at: V3; way: V3; value: number; min: number; max: number; step: number; to: (v: number) => LiveSolid; color: string };

export function Solid({ state, set, w: words, svgRef }: PieceProps<"solid">) {
  const w = words.solid;
  /** What is shown while a handle is held or the net is opening, before it is kept as one step to undo. */
  const [draft, setDraft] = useState<LiveSolid | null>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const s = draft ?? state;
  const view = { yaw: s.yaw, pitch: s.pitch };
  const modes = modesOf(s.shape);
  const mode: SolidMode = modes.includes(s.mode) ? s.mode : "turn";

  const keep = (next: LiveSolid) => {
    cancelAnimationFrame(frame.current);
    setDraft(null);
    set(next);
  };

  // ---- what is drawn --------------------------------------------------------------------------------------------
  const scene = useMemo(() => {
    let faces: Shown[] = [];
    let shell: Face[] = [];
    let cull = true;
    let plane: Plane | null = null;
    let cut: V3[] = [];
    if (mode === "open") {
      faces = netFaces(s, s.open / 100);
      cull = false;
    } else if (mode === "cut") {
      plane = cutPlane(s);
      const parts = cutFaces(s, plane);
      cut = parts.cut;
      // The part above is lifted off along the plane's normal and shown faint, so the cut face shows.
      const lift = scale(plane.n, 0.45 * Math.max(s.a, s.c));
      faces = [...parts.below, ...parts.above.map((f) => ({ ...f, pts: f.pts.map((p) => add(p, lift)), faded: true }))];
    } else if (mode === "fill") {
      faces = cubeFaces(s, s.layers);
      shell = solidFaces(s).faces;
    } else {
      faces = solidFaces(s).faces;
    }
    return { faces, shell, cull, plane, cut };
  }, [s, mode]);

  // The solid is kept in the middle of the stage, as big as fits (and no bigger than PX to a unit).
  const all = [...scene.faces, ...scene.shell].flatMap((f) => f.pts);
  const lo: V3 = [0, 1, 2].map((i) => Math.min(...all.map((p) => p[i]))) as V3;
  const hi: V3 = [0, 1, 2].map((i) => Math.max(...all.map((p) => p[i]))) as V3;
  const middle = scale(add(lo, hi), 0.5);
  const reach = Math.max(0.5, ...all.map((p) => Math.hypot(...sub(p, middle))));
  const fitted = Math.min(PX, (SH / 2 - 30) / reach);

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      if (d.part === "open" && !d.moved) return swing(s);
      if (draft) keep(draft);
    },
    (d) => {
      if (!d.moved) return;
      const [dx, dy] = [d.x - d.x0, d.y - d.y0];
      if (d.part === "turn") return setDraft({ ...s, yaw: wrap360(d.yaw0 - dx * 0.6), pitch: clamp(Math.round(d.pitch0 + dy * 0.5), PITCH[0], PITCH[1]) });
      if (d.part === "open") return setDraft({ ...s, open: clamp(Math.round(d.open0 + ((dx * d.out[0] + dy * d.out[1]) / 160) * 100), 0, 100) });
      const h = handles.find((x) => x.id === d.id);
      if (!h) return;
      const v = d.v0 + (dx * d.sx + dy * d.sy) / (d.sx * d.sx + d.sy * d.sy);
      setDraft(h.to(Math.round(v / h.step) * h.step));
    },
  );
  // While a size is dragged the picture keeps its scale, so the handle stays under the pointer.
  const px = drag?.px ?? fitted;
  const mid = seen(middle, view);
  const at = (p: V3): [number, number] => {
    const [x, y] = seen(p, view);
    return [CX + px * (x - mid[0]), CY - px * (y - mid[1])];
  };

  /** The net opens (or folds back) on its own. */
  const swing = (from: LiveSolid) => {
    cancelAnimationFrame(frame.current);
    const goal = from.open < 50 ? 100 : 0;
    const ms = (Math.abs(goal - from.open) / 100) * OPEN_MS;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(1, ms));
      if (t < 1) {
        setDraft({ ...from, open: from.open + (goal - from.open) * t });
        frame.current = requestAnimationFrame(tick);
      } else {
        setDraft(null);
        set({ ...from, open: goal });
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  // ---- the faces, nearest last ----------------------------------------------------------------------------------
  const drawn = useMemo(() => {
    const faces = scene.faces;
    const facing = faces.map((f) => seenWay(f.n, view));
    const shown = faces.map((_, i) => !scene.cull || facing[i][2] > 1e-9);
    const by = new Map<string, number[]>();
    faces.forEach((f, i) => f.pts.forEach((p, j) => {
      const k = edgeKey(p, f.pts[(j + 1) % f.pts.length]);
      by.set(k, [...(by.get(k) ?? []), i]);
    }));
    const out: Drawn[] = [];
    faces.forEach((f, i) => {
      if (!shown[i]) return;
      const lines = f.pts.map((p, j) => {
        const others = (by.get(edgeKey(p, f.pts[(j + 1) % f.pts.length])) ?? []).filter((o) => o !== i);
        // A line where the face meets another face of the solid, or the outline; none between facets of one surface.
        return others.length === 0 || others.some((o) => faces[o].group !== f.group || !shown[o]);
      });
      const n = facing[i][2] < 0 ? scale(facing[i], -1) : facing[i];
      const light = 0.66 + 0.34 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      out.push({
        pts: f.pts.map(at), depth: mean(f.pts.map((p) => seen(p, view))).at(2) ?? 0, lines, faded: (f as Shown).faded, tag: f.tag,
        fill: shade(COLORS[f.tag], facing[i][2] < 0 ? light * 0.9 : light),
      });
    });
    return out.sort((p, q) => p.depth - q.depth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, view.yaw, view.pitch, px, mid[0], mid[1]]);

  // ---- the handles ----------------------------------------------------------------------------------------------
  const handles: Handle[] = (() => {
    const { a, b, c } = s;
    const size = (id: "a" | "b" | "c", name: string, at: V3, way: V3, value: number): Handle =>
      ({ id, name: fill(w.sizeName, { what: name }), label: `${name} ${value}`, at, way, value, min: DIM[0], max: DIM[1], step: 1, to: (v) => resize(s, id, v), color: BLUE });
    if (mode === "turn") {
      switch (s.shape) {
        case "cuboid":
          return [
            size("a", w.length, [-a / 2, -b / 2, -c / 2], [-0.5, 0, 0], a),
            size("b", w.width, [a / 2, b / 2, -c / 2], [0, 0.5, 0], b),
            size("c", w.height, [a / 2, -b / 2, c / 2], [0, 0, 0.5], c),
          ];
        case "prism":
        case "pyramid": {
          const k = s.n;
          const phase = -Math.PI / 2 - Math.PI / k;
          const out: V3 = [Math.cos(phase), Math.sin(phase), 0];
          const grow = 1 / (2 * Math.sin(Math.PI / k));
          const top: V3 = s.shape === "prism" ? add(scale(out, a * grow), [0, 0, c / 2]) : [0, 0, c / 2];
          return [size("a", w.side, add(scale(out, a * grow), [0, 0, -c / 2]), scale(out, grow), a), size("c", w.height, top, [0, 0, 0.5], c)];
        }
        case "cylinder":
        case "cone": {
          const out: V3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
          const top: V3 = s.shape === "cylinder" ? add(scale(out, a), [0, 0, c / 2]) : [0, 0, c / 2];
          return [size("a", w.radius, add(scale(out, a), [0, 0, -c / 2]), out, a), size("c", w.height, top, [0, 0, 0.5], c)];
        }
        case "sphere": {
          const out: V3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
          return [size("a", w.radius, scale(out, a), out, a)];
        }
      }
    }
    if (mode === "fill") {
      return [{
        id: "layers", name: w.layersName, label: `${w.layers}: ${s.layers}`, at: [0, 0, -c / 2 + s.layers], way: [0, 0, 1], value: s.layers, min: 0, max: c, step: 1,
        to: (v) => ({ ...s, layers: clamp(v, 0, c) }), color: BLUE,
      }];
    }
    if (mode === "cut" && scene.plane) {
      const pl = scene.plane;
      const R = 0.62 * reach + 0.6;
      const tau = (pl.tilt * Math.PI) / 180;
      const phi = (s.spin * Math.PI) / 180;
      const deg = Math.PI / 180;
      const list: Handle[] = [
        { id: "cutAt", name: w.heightName, at: add(pl.c0, scale(pl.e1, R)), way: scale(pl.n, (pl.hi - pl.lo) / 100), value: s.cutAt, min: CUT_AT[0], max: CUT_AT[1], step: 1, to: (v) => ({ ...s, cutAt: clamp(v, CUT_AT[0], CUT_AT[1]) }), color: RED },
        {
          id: "tilt", name: w.tiltName, at: add(pl.c0, scale(pl.e2, R)),
          way: scale([Math.sin(tau) * Math.sin(phi), -Math.sin(tau) * Math.cos(phi), -Math.cos(tau)], R * deg),
          value: s.tilt, min: TILT[0], max: TILT[1], step: 1, to: (v) => ({ ...s, tilt: clamp(v, TILT[0], TILT[1]) }), color: RED,
        },
      ];
      // Round solids look the same turned any way round; only a solid with corners needs its slice turned.
      if (s.shape === "cuboid" || s.shape === "prism" || s.shape === "pyramid") {
        list.push({
          id: "spin", name: w.spinName, at: sub(pl.c0, scale(pl.e1, R)), way: scale([Math.sin(phi), -Math.cos(phi), 0], R * deg),
          value: s.spin, min: -100000, max: 100000, step: 1, to: (v) => ({ ...s, spin: wrap360(v) }), color: RED,
        });
      }
      return list;
    }
    return [];
  })();

  const grabValue = (h: Handle) => (e: PointerEvent) => {
    cancelAnimationFrame(frame.current);
    const [x0, y0] = at(h.at);
    const [x1, y1] = at(add(h.at, h.way));
    const [sx, sy] = [x1 - x0, y1 - y0];
    // A handle pointing straight at the viewer cannot be dragged along its way: turn the solid instead.
    if (sx * sx + sy * sy < 0.5) return begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch, px });
    begin(e, { part: "value", id: h.id, v0: h.value, sx, sy, px });
  };
  const grabSolid = (e: PointerEvent) => {
    cancelAnimationFrame(frame.current);
    if (mode !== "open") return begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch, px });
    // Dragged away from the middle of the stage opens it; back towards the middle folds it.
    const [x, y] = [e.clientX, e.clientY];
    const box = (e.currentTarget as Element).closest("svg")?.getBoundingClientRect();
    const [ox, oy] = box ? [x - box.left - (CX / W) * box.width, y - box.top - (CY / H) * box.height] : [0, 1];
    const r = Math.hypot(ox, oy);
    begin(e, { part: "open", open0: s.open, out: r > 8 ? [ox / r, oy / r] : [0, 1], px });
  };

  const keyTurn = (e: KeyboardEvent) => {
    const by: Record<string, [number, number]> = { ArrowLeft: [15, 0], ArrowRight: [-15, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    const m = by[e.key];
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, yaw: wrap360(s.yaw + m[0]), pitch: clamp(s.pitch + m[1], PITCH[0], PITCH[1]) });
  };
  const keyValue = (h: Handle) => (e: KeyboardEvent) => {
    const step = h.id === "cutAt" || h.id === "tilt" || h.id === "spin" ? 5 : 1;
    const to = { ArrowRight: h.value + step, ArrowUp: h.value + step, ArrowLeft: h.value - step, ArrowDown: h.value - step }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    keep(h.to(clamp(to, h.min, h.max)));
  };
  const keyOpen = (e: KeyboardEvent) => {
    keyTap(e, () => swing(s));
    const to = { ArrowRight: s.open + 10, ArrowUp: s.open + 10, ArrowLeft: s.open - 10, ArrowDown: s.open - 10, Home: 0, End: 100 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, open: clamp(to, 0, 100) });
  };

  // ---- what is said under it ------------------------------------------------------------------------------------
  const m = measures(s);
  type Line = { text: string; color: string; strong?: boolean };
  const lines: Line[] = (() => {
    if (mode === "open") {
      if (s.open === 0) return [{ text: w.openStart, color: INK }];
      const out: Line[] = [{ text: w.netLine, color: INK }, ...wrapWords(netSum(s), 72).map((text) => ({ text, color: BLUE, strong: true }))];
      if (s.shape === "cone") out.push({ text: fill(w.coneAngle, { deg: fmt((360 * s.a) / Math.hypot(s.a, s.c)) }), color: INK });
      return out;
    }
    if (mode === "cut" && scene.plane) {
      const name = cutName(s, scene.plane, scene.cut);
      const area = cutArea(s, scene.plane, scene.cut);
      const whole = Math.abs(area - Math.round(area)) < 1e-6;
      const out: Line[] = [{ text: fill(w.cutLine, { name: w.names[name], area: `${whole ? "=" : "≈"} ${fmt(area)}` }), color: RED, strong: true }];
      if (s.shape === "cone") out.push({ text: fill(w.coneTilt, { t: fmt(scene.plane.tilt), s: fmt(coneSlant(s)) }), color: INK });
      return out;
    }
    if (mode === "fill") {
      const ab = s.a * s.b;
      if (s.layers === 0) return [{ text: w.fillStart, color: INK }];
      const out: Line[] = [
        { text: fill(w.fillLayer, { a: s.a, b: s.b, ab }), color: INK },
        { text: fill(w.fillCount, { k: s.layers, ab, n: ab * s.layers }), color: BLUE, strong: true },
      ];
      if (s.layers === s.c) out.push({ text: fill(w.fillFull, { a: s.a, b: s.b, c: s.c, v: ab * s.c }), color: INK, strong: true });
      return out;
    }
    return m.lines.map((text, i) => ({ text, color: i === 0 ? BLUE : INK, strong: true }));
  })();

  // ---- the picture ----------------------------------------------------------------------------------------------
  const pathOf = (pts: [number, number][]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;
  const edgesOf = (d: Drawn) => d.pts.map((p, j) => (d.lines[j] ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${d.pts[(j + 1) % d.pts.length][0].toFixed(1)} ${d.pts[(j + 1) % d.pts.length][1].toFixed(1)}` : "")).join("");
  const faceEl = (d: Drawn, i: number) => (
    <g key={i} opacity={d.faded ? 0.3 : 1}>
      {/* A thin rim of its own colour closes the hairlines between the facets of a round surface. */}
      <path d={pathOf(d.pts)} fill={d.fill} stroke={d.fill} strokeWidth={0.8} strokeLinejoin="round" />
      <path d={edgesOf(d)} fill="none" stroke={d.tag === "cut" ? "#a61e4d" : INK} strokeWidth={d.tag === "cube" ? 1 : 1.6} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
  const shellLines = (front: boolean) => scene.shell.map((f, i) => {
    const facing = seenWay(f.n, view)[2] > 0;
    if (facing !== front) return null;
    const pts = f.pts.map(at);
    return <path key={i} d={pathOf(pts)} fill={front ? "rgba(165,216,255,0.12)" : "none"} stroke={front ? INK : "#adb5bd"} strokeWidth={front ? 1.6 : 1.2} strokeDasharray={front ? undefined : "5 5"} />;
  });

  /** The net's pieces carry their areas once it is most of the way open. */
  const netLabels = mode === "open" && s.open >= 60 ? (() => {
    const faces = scene.faces;
    return netParts(s).map((part) => {
      const mine = faces.filter((f) => f.group === part.group);
      const weight = mine.map((f) => polyArea(f.pts));
      const total = weight.reduce((t, v) => t + v, 0) || 1;
      const c = mine.reduce((acc, f, i) => add(acc, scale(mean(f.pts), weight[i] / total)), [0, 0, 0] as V3);
      return { at: at(c), text: fmt(part.area) };
    });
  })() : [];

  const planeEl = () => {
    const pl = scene.plane;
    if (!pl) return null;
    const R = 0.62 * reach + 0.6;
    const quad = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([u, v]) => at(add(pl.c0, add(scale(pl.e1, u * R), scale(pl.e2, v * R)))));
    return <path d={pathOf(quad)} fill="rgba(201,42,42,0.07)" stroke={RED} strokeWidth={1.4} strokeDasharray="7 6" pointerEvents="none" />;
  };

  const sizeLabels = () => handles.filter((h) => h.label).map((h) => {
    const [x, y] = at(h.at);
    const [cx, cy] = at(middle);
    const r = Math.hypot(x - cx, y - cy) || 1;
    return (
      <text key={h.id} x={x + ((x - cx) / r) * 24} y={y + ((y - cy) / r) * 24 + 5} fontSize={15} fontWeight={700} fill={h.color} textAnchor="middle"
        stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none">{h.label}</text>
    );
  });

  /** Dashed guides for what the handles change: a radius, or a height up the middle. */
  const guides = () => {
    if (mode !== "turn") return null;
    const { a, c } = s;
    const segs: [V3, V3][] = [];
    if (s.shape === "cylinder" || s.shape === "cone") segs.push([[0, 0, -c / 2], [a * Math.SQRT1_2, -a * Math.SQRT1_2, -c / 2]]);
    if (s.shape === "cone" || s.shape === "pyramid") segs.push([[0, 0, -c / 2], [0, 0, c / 2]]);
    if (s.shape === "sphere") segs.push([[0, 0, 0], [a * Math.SQRT1_2, -a * Math.SQRT1_2, 0]]);
    return segs.map(([p, q], i) => {
      const [x0, y0] = at(p);
      const [x1, y1] = at(q);
      return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={BLUE} strokeWidth={2} strokeDasharray="6 5" pointerEvents="none" />;
    });
  };

  const drawing = () => (
    <>
      {mode === "fill" && shellLines(false)}
      {drawn.map(faceEl)}
      {mode === "fill" && shellLines(true)}
      {guides()}
      {planeEl()}
      {netLabels.map((l, i) => (
        <text key={i} x={l.at[0]} y={l.at[1] + 5} fontSize={14} fontWeight={700} fill={INK} textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none">{l.text}</text>
      ))}
      {sizeLabels()}
      {lines.map((l, i) => (
        <text key={i} x={24} y={SAY_Y + i * SAY} fontSize={16} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>
      ))}
    </>
  );

  const shapeNames = w.shapes;
  const modeNames = w.modes;
  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={lines.map((l) => l.text).join(" ")}>
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={16} y={10} keys={SOLID_SHAPES} on={s.shape} names={shapeNames} onPick={(k) => keep(pickShape(s, k))} />
        <Tabs x={16} y={48} keys={modes} on={mode} names={modeNames} onPick={(k) => keep({ ...s, mode: k })} />
        {(s.shape === "prism" || s.shape === "pyramid") && (
          <NumBox x={W - 70} y={44} w={54} h={36} size={18} value={s.n} min={SIDES[0]} max={SIDES[1]} label={w.sides} onChange={(n) => keep({ ...s, n })} />
        )}
        {/* The stage: dragged anywhere to turn the solid; the arrow keys turn it too. */}
        <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuemin={0} aria-valuemax={359} aria-valuenow={s.yaw} aria-valuetext={`${s.yaw}°, ${s.pitch}°`}
          onKeyDown={keyTurn} style={{ cursor: drag?.part === "turn" ? "grabbing" : "grab" }}
          onPointerDown={(e) => { cancelAnimationFrame(frame.current); begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch, px }); }}>
          <title>{w.turnName}</title>
          <rect x={0} y={ST} width={W} height={SH} fill="transparent" />
        </g>
        <g pointerEvents="none">
          {mode === "fill" && shellLines(false)}
        </g>
        {mode === "open" ? (
          <g role="slider" tabIndex={0} aria-label={w.openName} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.open)} onKeyDown={keyOpen}
            style={{ cursor: "grab" }} onPointerDown={grabSolid}>
            <title>{w.openName}</title>
            {drawn.map(faceEl)}
          </g>
        ) : (
          <g style={{ cursor: "grab" }} onPointerDown={grabSolid}>{drawn.map(faceEl)}</g>
        )}
        <g pointerEvents="none">
          {mode === "fill" && shellLines(true)}
          {guides()}
          {planeEl()}
          {netLabels.map((l, i) => (
            <text key={i} x={l.at[0]} y={l.at[1] + 5} fontSize={14} fontWeight={700} fill={INK} textAnchor="middle" stroke="#fff" strokeWidth={4} paintOrder="stroke">{l.text}</text>
          ))}
          {sizeLabels()}
        </g>
        {handles.map((h) => {
          const [x, y] = at(h.at);
          const held = drag?.part === "value" && drag.id === h.id;
          return (
            <g key={h.id} role="slider" tabIndex={0} aria-label={h.name} aria-valuemin={h.min} aria-valuemax={h.max} aria-valuenow={h.value}
              data-handle={h.id} style={{ cursor: held ? "grabbing" : "grab" }} onPointerDown={grabValue(h)} onKeyDown={keyValue(h)}>
              <title>{h.name}</title>
              <circle cx={x} cy={y} r={held ? 10 : 8} fill="#fff" stroke={h.color} strokeWidth={3} />
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          );
        })}
        {lines.map((l, i) => (
          <text key={i} x={24} y={SAY_Y + i * SAY} fontSize={16} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>
        ))}
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
