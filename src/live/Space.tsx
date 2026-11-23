// Vectors, lines and planes in space (#566), worked by hand on the stage of the solid piece: the axes turned by
// dragging the empty stage (or looked at straight down one of them, for the flat picture, by tapping its letter), and
// every vector's tip, line's point and plane's point or normal dragged in the plane facing the viewer, snapping to
// whole numbers. What is shown comes from the tray at the top (vector, dot product, cross product, lines, planes), the
// row under it (what goes with it) and the Vectors tool's own examples; the tool's working, exact, is written under
// the picture. Drawn in an SVG like the solid, so any number show on one board.
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { add, len, scale, seen, sub, unit, cross as cross3, dot as dot3 } from "../math/solid";
import {
  arc, clampPoint, clipLine, CROSS_WITH, crossFacts, dotFacts, dragTo, handlesOf, keyStep, LIM, LINES_WITH, lineText, linePlane, LOOK, lookingDown,
  nearestOn, PITCH, planeEq, planePatch, PLANES_WITH, pointLine, pointPlane, SPACE_EXAMPLES, SPACE_MODES, symmText, tripleFacts, twoLines,
  twoPlanes, unseen, vecText, vectorFacts, wrap360, AXES, type Axis, type LiveSpace, type SpaceHandle, type V3,
} from "../math/space";
import { BLUE, GREEN, keyTap, MUTED, Pill, RED, Tabs, useDrag, wrapWords } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 680;
/** The stage: its top and height, and the origin in its middle. */
const ST = 120;
const SH = 440;
const [CX, CY] = [W / 2, ST + SH / 2];
const SAY_Y = ST + SH + 26;
const SAY = 23;
const SAY_LINES = 6;
const H = SAY_Y + SAY_LINES * SAY - 8;
const ORANGE = "#e8590c";
const PURPLE = "#9c36b5";
const COLOR: Record<SpaceHandle["color"], string> = { blue: BLUE, red: RED, orange: ORANGE, green: GREEN, ink: INK };
const O: V3 = [0, 0, 0];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mid = (p: V3, q: V3) => scale(add(p, q), 0.5);
const dist = (p: V3, q: V3) => len(sub(p, q));

/** What is drawn, in space: a segment, an arrow, a flat polygon, a dot and a word. */
type Prim =
  | { k: "seg"; a: V3; b: V3; color: string; width?: number; dash?: string; opacity?: number; label?: string; endless?: boolean }
  | { k: "arrow"; a: V3; b: V3; color: string; width?: number; dash?: string; label?: string }
  | { k: "poly"; pts: V3[]; fill: string; stroke?: string; opacity?: number; width?: number; open?: boolean }
  | { k: "dot"; p: V3; color: string; label?: string }
  | { k: "word"; p: V3; text: string; color: string };

type Line = { text: string; color: string; strong?: boolean };

/** What the hand holds: the view, or one of the points by its id. */
type Hold = { part: "turn"; yaw0: number; pitch0: number; px: number } | { part: "point"; id: string; p0: V3; px: number };

export function Space({ state, set, w: words, svgRef }: PieceProps<"space">) {
  const w = words.space;
  /** What is shown while a point is held or the view turned, before it is kept as one step to undo. */
  const [draft, setDraft] = useState<LiveSpace | null>(null);
  const s = draft ?? state;
  const view = { yaw: s.yaw, pitch: s.pitch };
  const keep = (next: LiveSpace) => {
    setDraft(null);
    set(next);
  };
  const handles = handlesOf(s);

  // The axes reach past every point; everything is drawn inside a ball a little bigger, so it fits however turned.
  const R = clamp(Math.ceil(Math.max(3, ...handles.flatMap((h) => h.at.map(Math.abs)))) + 1, 4, LIM + 1);
  const ball = R * 1.18;

  const { drag, begin, svgProps } = useDrag<Hold>(
    () => {
      if (draft) keep(draft);
    },
    (d) => {
      if (!d.moved) return;
      const [dx, dy] = [d.x - d.x0, d.y - d.y0];
      if (d.part === "turn") return setDraft({ ...s, yaw: wrap360(d.yaw0 - dx * 0.6), pitch: clamp(Math.round(d.pitch0 + dy * 0.5), PITCH[0], PITCH[1]) });
      const h = handles.find((x) => x.id === d.id);
      const next = h?.to(dragTo(d.p0, dx / d.px, -dy / d.px, view));
      if (next) setDraft(next);
    },
  );
  /** The scale: set once the scene is built (below), and kept while something is held. */
  let px = drag?.px ?? 30;
  const at = (p: V3): [number, number] => {
    const [x, y] = seen(p, view);
    return [CX + px * x, CY - px * y];
  };
  /** The way to the viewer, in space. */
  const toViewer = unseen([0, 0, 1], view);
  const looking = lookingDown(view);

  // ---- the scene and its working --------------------------------------------------------------------------------
  const prims: Prim[] = [];
  const lines: Line[] = [];
  const say = (text: string, color = INK, strong = false) => lines.push({ text, color, strong });
  const right = (p: V3, u: V3, v: V3, size = 0.45) => {
    if (len(u) < 1e-9 || len(v) < 1e-9) return;
    const [a, b] = [scale(unit(u), size), scale(unit(v), size)];
    prims.push({ k: "poly", pts: [add(p, a), add(add(p, a), b), add(p, b)], fill: "none", stroke: INK, width: 1.2, open: true });
  };
  const angleArc = (c: V3, u: V3, v: V3, r: number, label: string) => {
    const pts = arc(c, u, v, r);
    if (pts.length < 2) return;
    prims.push({ k: "poly", pts, fill: "none", stroke: PURPLE, width: 1.8, open: true });
    prims.push({ k: "word", p: add(c, scale(unit(add(unit(u), unit(v))), r + 0.45)), text: label, color: PURPLE });
  };
  /** A line across the stage: the whole of it inside the ball. */
  const wholeLine = (a: V3, d: V3, color: string, label?: string, width = 2.4) => {
    const ends = clipLine(a, d, ball);
    if (ends) prims.push({ k: "seg", a: ends[0], b: ends[1], color, width, label, endless: true });
  };

  if (s.mode === "vector") {
    const a = s.vec.a;
    const f = vectorFacts(a);
    // The box from the origin with a at its far corner, and the way to a along x, then y, then z.
    const corner = (i: number): V3 => [i & 1 ? a[0] : 0, i & 2 ? a[1] : 0, i & 4 ? a[2] : 0];
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) prims.push({ k: "seg", a: corner(i), b: corner(i | bit), color: "#adb5bd", width: 1.2, dash: "5 5" });
    const comps = vecText(a).slice(1, -1).split(", ");
    const steps: V3[] = [O, [a[0], 0, 0], [a[0], a[1], 0], a];
    steps.slice(1).forEach((p, i) => {
      if (a[i] === 0) return;
      prims.push({ k: "seg", a: steps[i], b: p, color: INK, width: 2, dash: "7 5" });
      prims.push({ k: "word", p: add(mid(steps[i], p), [0, 0, 0.35]), text: comps[i], color: INK });
    });
    prims.push({ k: "arrow", a: O, b: a, color: BLUE, width: 3.2 });
    say(fill(w.components, { a: vecText(a), x: comps[0], y: comps[1], z: comps[2] }), BLUE, true);
    say(fill(w.length, { sq: f.squares, len: f.len }), INK, true);
    say(fill(w.unitVec, { u: f.unit }));
  }

  if (s.mode === "dot") {
    const { a, b } = s.dot;
    const f = dotFacts(a, b);
    wholeLine(O, b, "#ced4da", undefined, 1.4);
    if (!f.right) prims.push({ k: "seg", a: O, b: f.foot, color: GREEN, width: 7, opacity: 0.45 });
    prims.push({ k: "seg", a, b: f.foot, color: GREEN, width: 1.8, dash: "6 5" });
    right(f.foot, sub(a, f.foot), dot3(f.foot, b) < 0 ? scale(b, -1) : b);
    if (dist(a, f.foot) > 1e-9) prims.push({ k: "dot", p: f.foot, color: GREEN });
    prims.push({ k: "arrow", a: O, b: b, color: RED, width: 3 }, { k: "arrow", a: O, b: a, color: BLUE, width: 3 });
    angleArc(O, a, b, 0.8, "θ");
    say(fill(w.dot, { work: f.products, v: f.dot }), INK, true);
    say(fill(w.angle, { cos: f.cos, angle: f.angle }), PURPLE);
    say(f.right ? w.right : fill(w.shadow, { len: f.shadow, v: f.footText }), GREEN, true);
  }

  if (s.mode === "cross") {
    const x = s.cross;
    const corners = x.with === "triangle" || x.with === "tetra";
    const o = corners ? x.o : O;
    const nm = corners ? { a: "AB", b: "AC", c: "AD" } : { a: "a", b: "b", c: "c" };
    const name = `${nm.a} × ${nm.b}`;
    const f = crossFacts(x.a, x.b);
    const [A, B] = [add(o, x.a), add(o, x.b)];
    if (corners) prims.push({ k: "poly", pts: [o, A, B], fill: "#a5d8ff", stroke: BLUE, opacity: 0.55, width: 1.2 });
    else {
      prims.push({ k: "poly", pts: [o, A, add(A, x.b), B], fill: "#d0ebff", stroke: BLUE, opacity: 0.7, width: 1 });
    }
    const third = x.with === "box" || x.with === "tetra";
    const C = add(o, x.c);
    if (third) {
      if (x.with === "box") {
        const base = [A, add(A, x.b), B];
        for (const q of base) prims.push({ k: "seg", a: q, b: add(q, x.c), color: ORANGE, width: 1.3, dash: "6 5" });
        [C, ...base.map((q) => add(q, x.c)), C].reduce((p, q) => (prims.push({ k: "seg", a: p, b: q, color: ORANGE, width: 1.3, dash: "6 5" }), q));
      } else {
        prims.push({ k: "seg", a: A, b: C, color: ORANGE, width: 1.3, dash: "6 5" }, { k: "seg", a: B, b: C, color: ORANGE, width: 1.3, dash: "6 5" });
      }
    }
    if (!f.zero) {
      const longest = Math.max(len(x.a), len(x.b));
      const k = len(f.c) > 1.6 * longest ? (1.2 * longest) / len(f.c) : 1;
      prims.push({ k: "arrow", a: o, b: add(o, scale(f.c, k)), color: PURPLE, width: 3.2, label: k < 1 ? `${name} (${w.shortened})` : name });
      right(o, f.c, x.a, 0.4);
      right(o, f.c, x.b, 0.4);
    }
    // The tips carry their names on their handles.
    prims.push({ k: "arrow", a: o, b: A, color: BLUE, width: 3 }, { k: "arrow", a: o, b: B, color: RED, width: 3 });
    if (third) prims.push({ k: "arrow", a: o, b: C, color: ORANGE, width: 3 });
    say(fill(w.crossWork, { name, work: f.work, c: f.cText }), PURPLE, true);
    if (f.zero) say(fill(w.crossFlat, { a: nm.a, b: nm.b, name }), RED, true);
    else {
      say(fill(w.crossRight, { name, a: nm.a, b: nm.b, x: f.checks[0], y: f.checks[1] }));
      say(fill(corners ? w.crossTri : w.crossArea, { name, sq: f.squares, area: corners ? f.half : f.area }), BLUE, true);
    }
    if (third) {
      const t = tripleFacts(x.a, x.b, x.c);
      say(fill(w.triple, { name, c: nm.c, work: t.products, v: t.v }), ORANGE);
      if (t.flat) say(w.flatBox, ORANGE, true);
      else say(x.with === "box" ? fill(w.boxVolume, { v: t.v, vol: t.volume }) : fill(w.tetraVolume, { vol: t.volume, t: t.sixth }), ORANGE, true);
    }
  }

  if (s.mode === "lines") {
    const l = s.lines;
    const two = l.with === "two";
    wholeLine(l.a1, l.d1, BLUE, two ? "ℓ₁" : "ℓ");
    prims.push({ k: "arrow", a: l.a1, b: add(l.a1, l.d1), color: BLUE, width: 1.8, dash: "6 4" });
    say(fill(w.line, { name: two ? "ℓ₁" : "ℓ", eq: lineText(l.a1, l.d1) }), BLUE, true);
    if (l.with === "one") {
      say(fill(w.cart, { eq: symmText(l.a1, l.d1) }));
      say(w.each);
    }
    if (l.with === "point") {
      const f = pointLine(l.a1, l.d1, l.p);
      if (f.on) say(fill(w.pointOn, { t: f.t }), GREEN, true);
      else {
        prims.push({ k: "seg", a: l.p, b: f.foot, color: GREEN, width: 2, dash: "6 5" }, { k: "dot", p: f.foot, color: PURPLE, label: "F" });
        right(f.foot, sub(l.p, f.foot), l.d1);
        say(fill(w.foot, { t: f.t, f: f.footText }), PURPLE);
        say(fill(w.pointDist, { d: f.dist }), GREEN, true);
      }
    }
    if (two) {
      wholeLine(l.a2, l.d2, RED, "ℓ₂");
      prims.push({ k: "arrow", a: l.a2, b: add(l.a2, l.d2), color: RED, width: 1.8, dash: "6 4" });
      say(fill(w.line, { name: "ℓ₂", eq: lineText(l.a2, l.d2, "s") }), RED, true);
      const m = twoLines(l.a1, l.d1, l.a2, l.d2);
      if (m.kind === "same") say(w.sameLine, PURPLE, true);
      if (m.kind === "parallel") {
        prims.push({ k: "seg", a: l.a2, b: m.foot, color: GREEN, width: 2.4, dash: "6 5" });
        say(fill(w.parallel, { d: m.dist }), GREEN, true);
      }
      if (m.kind === "meet") {
        prims.push({ k: "dot", p: m.x, color: GREEN, label: "X" });
        say(fill(w.meet, { x: m.xText, t: m.t, s: m.s, angle: m.angle }), GREEN, true);
      }
      if (m.kind === "skew") {
        prims.push({ k: "seg", a: m.p, b: m.q, color: GREEN, width: 3, label: m.dist.split(" ≈")[0] }, { k: "dot", p: m.p, color: GREEN }, { k: "dot", p: m.q, color: GREEN });
        say(fill(w.skew, { n: m.n }), PURPLE);
        say(fill(w.skewDist, { d: m.dist, angle: m.angle }), GREEN, true);
      }
    }
  }

  if (s.mode === "planes") {
    const q = s.planes;
    const two = q.with === "two";
    const n1 = two ? "Π₁" : "Π";
    let c1 = q.a;
    let half1 = 3;
    /** The plane drawn as a square round c, wide enough to hold its own point. */
    const patch = (n: V3, c: V3, half: number, fillC: string, stroke: string, label: string) => {
      const pts = planePatch(n, c, half);
      prims.push({ k: "poly", pts, fill: fillC, stroke, opacity: 0.42, width: 1.2 });
      prims.push({ k: "word", p: add(pts[0], scale(sub(c, pts[0]), 0.12)), text: label, color: stroke });
    };
    /** A normal from its plane's point; its tip is a handle, which carries its name. */
    const normal = (p: V3, n: V3, color: string) => prims.push({ k: "arrow", a: p, b: add(p, n), color, width: 2.6 });
    say(fill(w.plane, { name: n1, eq: planeEq(q.n, q.a) }), BLUE, true);
    say(fill(w.normal, { n: vecText(q.n), a: vecText(q.a) }));
    if (q.with === "one") {
      patch(q.n, c1, half1, "#a5d8ff", BLUE, n1);
      normal(q.a, q.n, BLUE);
    }
    if (q.with === "point") {
      const f = pointPlane(q.n, q.a, q.p);
      c1 = mid(q.a, f.foot);
      half1 = Math.max(3, dist(q.a, f.foot) / 2 + 1.5);
      patch(q.n, c1, half1, "#a5d8ff", BLUE, n1);
      normal(q.a, q.n, BLUE);
      say(fill(w.planePoint, { work: f.np, v: f.value }));
      if (f.on) say(w.planeOn, GREEN, true);
      else {
        prims.push({ k: "seg", a: q.p, b: f.foot, color: GREEN, width: 2, dash: "6 5" }, { k: "dot", p: f.foot, color: PURPLE, label: "F" });
        say(fill(w.planeDist, { d: f.dist, f: f.footText }), GREEN, true);
      }
    }
    if (q.with === "line") {
      const m = linePlane(q.n, q.a, q.la, q.ld);
      say(fill(w.line, { name: "ℓ", eq: lineText(q.la, q.ld) }), RED, true);
      say(fill(w.nd, { work: m.nd }));
      const ends = clipLine(q.la, q.ld, ball);
      if (m.kind === "meet") {
        c1 = mid(q.a, m.x);
        half1 = Math.max(3, dist(q.a, m.x) / 2 + 1.5);
        // The part of the line behind the plane, as the viewer sees it, is drawn faint and before the plane.
        const facing = dot3(q.n, toViewer) >= 0 ? 1 : -1;
        const parts = ends ? ends.map((e) => ({ e, behind: dot3(sub(e, m.x), q.n) * facing < 0 })) : [];
        for (const p of parts) if (p.behind) prims.push({ k: "seg", a: p.e, b: m.x, color: RED, width: 2.2, dash: "6 5", opacity: 0.55, endless: true });
        patch(q.n, c1, half1, "#a5d8ff", BLUE, n1);
        for (const p of parts) if (!p.behind) prims.push({ k: "seg", a: m.x, b: p.e, color: RED, width: 2.4, label: "ℓ", endless: true });
        prims.push({ k: "dot", p: m.x, color: GREEN, label: "X" });
        say(fill(w.pierce, { x: m.xText, t: m.t, angle: m.angle }), GREEN, true);
      } else {
        patch(q.n, c1, half1, "#a5d8ff", BLUE, n1);
        if (ends) prims.push({ k: "seg", a: ends[0], b: ends[1], color: RED, width: 2.4, label: "ℓ", endless: true });
        say(m.kind === "inside" ? w.lineInside : w.lineParallel, PURPLE, true);
      }
      prims.push({ k: "arrow", a: q.la, b: add(q.la, q.ld), color: RED, width: 1.8, dash: "6 4" });
      normal(q.a, q.n, BLUE);
    }
    if (two) {
      const m = twoPlanes(q.n, q.a, q.m, q.b);
      say(fill(w.plane, { name: "Π₂", eq: planeEq(q.m, q.b) }), ORANGE, true);
      if (m.kind === "meet") {
        const c = nearestOn(m.point, m.dir, mid(q.a, q.b));
        const [h1, h2] = [Math.max(3, dist(q.a, c) + 1), Math.max(3, dist(q.b, c) + 1)].map((h) => Math.min(h, 1.3 * R));
        patch(q.n, c, h1, "#a5d8ff", BLUE, "Π₁");
        patch(q.m, c, h2, "#ffd8a8", ORANGE, "Π₂");
        const along = scale(unit(m.dir), Math.min(h1, h2));
        prims.push({ k: "seg", a: sub(c, along), b: add(c, along), color: GREEN, width: 3.2 });
        // The angle between them, across the common line: square to it in each plane.
        const u1 = cross3(m.dir, q.n);
        let u2 = cross3(m.dir, q.m);
        if (dot3(u1, u2) < 0) u2 = scale(u2, -1);
        angleArc(c, u1, u2, 1.3, "θ");
        say(fill(w.planesMeet, { line: m.line }), GREEN, true);
        say(fill(w.planesAngle, { cos: m.cos, angle: m.angle }), PURPLE);
      } else {
        patch(q.n, q.a, 3, "#a5d8ff", BLUE, "Π₁");
        patch(q.m, q.b, 3, "#ffd8a8", ORANGE, "Π₂");
        say(m.kind === "same" ? w.samePlane : fill(w.planesParallel, { d: m.dist }), GREEN, true);
      }
      normal(q.a, q.n, BLUE);
      normal(q.b, q.m, ORANGE);
    }
  }

  // The scene fills the stage as seen (the endless lines run off it), with the origin kept in the middle; while a point
  // is dragged or the axes turned, the picture keeps its scale, so what is held stays under the pointer.
  if (!drag) {
    const ends = AXES.flatMap((_, i) => [-1, 1].map((sg) => {
      const e: V3 = [0, 0, 0];
      e[i] = sg * (R + 0.75);
      return e;
    }));
    const pts = [...ends, ...handles.map((h) => h.at), ...prims.flatMap((p) => (p.k === "seg" ? (p.endless ? [] : [p.a, p.b]) : p.k === "arrow" ? [p.a, p.b] : p.k === "poly" ? p.pts : [p.p]))];
    const seenPts = pts.map((p) => seen(p, view));
    const [mx, my] = [Math.max(1, ...seenPts.map((p) => Math.abs(p[0]))), Math.max(1, ...seenPts.map((p) => Math.abs(p[1])))];
    px = Math.min(36, (W / 2 - 34) / mx, (SH / 2 - 22) / my);
  }

  const said = lines.flatMap((l) => wrapWords(l.text, 78).map((text) => ({ ...l, text }))).slice(0, SAY_LINES);

  // ---- the hand -------------------------------------------------------------------------------------------------
  const keyTurn = (e: KeyboardEvent) => {
    const by: Record<string, [number, number]> = { ArrowLeft: [15, 0], ArrowRight: [-15, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    const m = by[e.key];
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    keep({ ...s, yaw: wrap360(s.yaw + m[0]), pitch: clamp(s.pitch + m[1], PITCH[0], PITCH[1]) });
  };
  const keyPoint = (h: SpaceHandle) => (e: KeyboardEvent) => {
    const step = keyStep(e.key, view);
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const next = h.to(clampPoint(add(h.at, step)));
    if (next) keep(next);
  };
  const turnFrom = (e: PointerEvent) => begin(e, { part: "turn", yaw0: s.yaw, pitch0: s.pitch, px });
  const look = (k: Axis) => keep({ ...s, ...LOOK[k] });

  // ---- the picture ----------------------------------------------------------------------------------------------
  const r1 = (v: number) => v.toFixed(1);
  const halo = { stroke: "#fff", strokeWidth: 4, paintOrder: "stroke" as const };
  const wordAt = (p: [number, number], text: string, color: string, key: string | number, size = 15) => (
    <text key={key} x={p[0]} y={p[1] + 5} fontSize={size} fontWeight={700} fill={color} textAnchor="middle" {...halo} pointerEvents="none">{text}</text>
  );
  /** A label just past an arrow's tip, or beside a point away from the origin. */
  const beyond = (from: [number, number], to: [number, number], d = 16): [number, number] => {
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
    const r = Math.hypot(dx, dy);
    return r < 1 ? [to[0] + d, to[1] - d] : [to[0] + (dx / r) * d, to[1] + (dy / r) * d];
  };
  const primEl = (p: Prim, i: number): ReactNode => {
    switch (p.k) {
      case "seg": {
        const [a, b] = [at(p.a), at(p.b)];
        return (
          <g key={i} opacity={p.opacity ?? 1}>
            <line x1={r1(a[0])} y1={r1(a[1])} x2={r1(b[0])} y2={r1(b[1])} stroke={p.color} strokeWidth={p.width ?? 2} strokeDasharray={p.dash} strokeLinecap="round" />
            {p.label && wordAt(beyond(a, b, 14), p.label, p.color, "l")}
          </g>
        );
      }
      case "arrow": {
        const [a, b] = [at(p.a), at(p.b)];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        const r = Math.hypot(dx, dy);
        const width = p.width ?? 2.4;
        if (r < 3) return <circle key={i} cx={b[0]} cy={b[1]} r={3} fill={p.color} />;
        const [ux, uy] = [dx / r, dy / r];
        const head = Math.min(r * 0.45, 9 + width * 1.5);
        const base = [b[0] - ux * head, b[1] - uy * head];
        const side = head * 0.45;
        return (
          <g key={i}>
            <line x1={r1(a[0])} y1={r1(a[1])} x2={r1(base[0])} y2={r1(base[1])} stroke={p.color} strokeWidth={width} strokeDasharray={p.dash} strokeLinecap="round" />
            <path d={`M${r1(b[0])} ${r1(b[1])}L${r1(base[0] - uy * side)} ${r1(base[1] + ux * side)}L${r1(base[0] + uy * side)} ${r1(base[1] - ux * side)}Z`} fill={p.color} />
            {p.label && wordAt(beyond(a, b, 18), p.label, p.color, "l")}
          </g>
        );
      }
      case "poly": {
        const pts = p.pts.map(at).map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
        return p.open ? (
          <polyline key={i} points={pts} fill="none" stroke={p.stroke} strokeWidth={p.width ?? 1.2} />
        ) : (
          <polygon key={i} points={pts} fill={p.fill} fillOpacity={p.opacity ?? 1} stroke={p.stroke} strokeWidth={p.width ?? 1.2} strokeLinejoin="round" />
        );
      }
      case "dot": {
        const c = at(p.p);
        return (
          <g key={i}>
            <circle cx={c[0]} cy={c[1]} r={5} fill={p.color} stroke="#fff" strokeWidth={1.5} />
            {p.label && wordAt(beyond(at(O), c, 16), p.label, p.color, "l")}
          </g>
        );
      }
      case "word":
        return wordAt(at(p.p), p.text, p.color, i);
    }
  };

  /** The axes, each to R with whole-number ticks, the faint grid of the plane at right angles to the axis looked down
   * (z = 0 otherwise), and the letters that turn the view to look down an axis. */
  const grid = () => {
    const flatAxis = looking === "x" ? 0 : looking === "y" ? 1 : 2;
    const [i, j] = [0, 1, 2].filter((q) => q !== flatAxis);
    const pt = (u: number, v: number): V3 => {
      const p: V3 = [0, 0, 0];
      p[i] = u;
      p[j] = v;
      return p;
    };
    const out: ReactNode[] = [];
    for (let k = -R; k <= R; k++) {
      for (const [a, b] of [[pt(k, -R), pt(k, R)], [pt(-R, k), pt(R, k)]]) {
        const [p, q] = [at(a), at(b)];
        out.push(<line key={`${k}${a.join()}`} x1={r1(p[0])} y1={r1(p[1])} x2={r1(q[0])} y2={r1(q[1])} stroke="#f1f3f5" strokeWidth={1} />);
      }
    }
    return out;
  };
  const axes = () => AXES.map((k, i) => {
    const e: V3 = [0, 0, 0];
    e[i] = 1;
    const [a, b] = [at(scale(e, -R)), at(scale(e, R))];
    const ticks = Array.from({ length: 2 * R - 1 }, (_, t) => t - R + 1).filter((t) => t !== 0).map((t) => {
      const c = at(scale(e, t));
      return <circle key={t} cx={c[0]} cy={c[1]} r={1.8} fill={MUTED} />;
    });
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const r = Math.hypot(dx, dy);
    const head = r > 20 ? (
      <path d={`M${r1(b[0])} ${r1(b[1])}L${r1(b[0] - (dx / r) * 10 - (dy / r) * 4)} ${r1(b[1] - (dy / r) * 10 + (dx / r) * 4)}L${r1(b[0] - (dx / r) * 10 + (dy / r) * 4)} ${r1(b[1] - (dy / r) * 10 - (dx / r) * 4)}Z`} fill={MUTED} />
    ) : null;
    return (
      <g key={k} pointerEvents="none">
        <line x1={r1(a[0])} y1={r1(a[1])} x2={r1(b[0])} y2={r1(b[1])} stroke={MUTED} strokeWidth={1.4} />
        {head}
        {ticks}
      </g>
    );
  });
  /** Where an axis's letter sits: past its end, or (looked straight down) beside the origin. */
  const letterAt = (k: Axis): [number, number] => {
    const e: V3 = [0, 0, 0];
    e[AXES.indexOf(k)] = 1;
    const p = at(scale(e, R + 0.75));
    return looking === k ? [CX + 22, CY + 22] : p;
  };
  const letters = (live: boolean) => AXES.map((k) => {
    const [x, y] = letterAt(k);
    const on = looking === k;
    const name = fill(w.lookName, { axis: k });
    const face = (
      <>
        <circle cx={x} cy={y} r={13} fill={on ? BLUE : "#fff"} stroke={on ? BLUE : MUTED} strokeWidth={1.5} />
        <text x={x} y={y + 5} fontSize={16} fontWeight={700} fontStyle="italic" textAnchor="middle" fill={on ? "#fff" : INK} pointerEvents="none">{k}</text>
      </>
    );
    return live ? (
      <g key={k} role="button" tabIndex={0} aria-label={name} aria-pressed={on} style={{ cursor: "pointer" }}
        onPointerDown={(e) => e.stopPropagation()} onClick={() => look(k)} onKeyDown={(e) => keyTap(e, () => look(k))}>
        <title>{name}</title>
        {face}
      </g>
    ) : <g key={k}>{face}</g>;
  });
  const pointFace = (h: SpaceHandle, held = false) => {
    const [x, y] = at(h.at);
    return <circle cx={x} cy={y} r={held ? 10 : 8} fill="#fff" stroke={COLOR[h.color]} strokeWidth={3} />;
  };
  /** The points' names, over every point, so one point never hides another's name. */
  const pointNames = () => (
    <g pointerEvents="none">
      {handles.map((h) => {
        const lab = beyond([CX, CY], at(h.at), 20);
        return <text key={h.id} x={lab[0]} y={lab[1] + 5} fontSize={15} fontWeight={700} fill={COLOR[h.color]} textAnchor="middle" {...halo}>{h.name}</text>;
      })}
    </g>
  );

  const drawing = (live: boolean) => (
    <g clipPath={`url(#space-stage-${live ? "a" : "b"})`}>
      <g pointerEvents="none">
        {grid()}
        {axes()}
        {prims.map(primEl)}
      </g>
      {letters(live)}
    </g>
  );
  const clip = (id: string) => (
    <defs>
      <clipPath id={id}>
        <rect x={0} y={ST} width={W} height={SH} />
      </clipPath>
    </defs>
  );
  const sayEls = said.map((l, i) => (
    <text key={i} x={22} y={SAY_Y + i * SAY} fontSize={15.5} fontWeight={l.strong ? 700 : 400} fill={l.color}>{l.text}</text>
  ));

  const examples = SPACE_EXAMPLES[s.mode];
  const withRow = () => {
    if (s.mode === "cross") return <Tabs x={16} y={48} keys={CROSS_WITH} on={s.cross.with} names={w.crossWith} onPick={(k) => keep({ ...s, cross: { ...s.cross, with: k } })} />;
    if (s.mode === "lines") return <Tabs x={16} y={48} keys={LINES_WITH} on={s.lines.with} names={w.linesWith} onPick={(k) => keep({ ...s, lines: { ...s.lines, with: k } })} />;
    if (s.mode === "planes") return <Tabs x={16} y={48} keys={PLANES_WITH} on={s.planes.with} names={w.planesWith} onPick={(k) => keep({ ...s, planes: { ...s.planes, with: k } })} />;
    return null;
  };
  const exampleRow = () => {
    const lead = 16 + w.examples.length * 7.6 + 10;
    return (
      <g>
        <text x={16} y={102} fontSize={14} fill={MUTED}>{w.examples}</text>
        {examples.map((ex, i) => (
          <Pill key={i} x={lead + i * 40} y={84} w={34} h={28} size={14} text={String(i + 1)} title={fill(w.example, { n: i + 1, label: ex.label })}
            onTap={() => keep(ex.to(s))} />
        ))}
      </g>
    );
  };

  return (
    <>
      <svg className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }} role="group" aria-label={said.map((l) => l.text).join(" ")}>
        {clip("space-stage-a")}
        <rect width={W} height={H} fill="#fff" />
        <Tabs x={16} y={12} keys={SPACE_MODES} on={s.mode} names={w.modes} onPick={(k) => keep({ ...s, mode: k })} />
        {withRow()}
        {exampleRow()}
        {/* The stage: dragged anywhere to turn the axes; the arrow keys turn them too. */}
        <g role="slider" tabIndex={0} aria-label={w.turnName} aria-valuemin={0} aria-valuemax={359} aria-valuenow={s.yaw} aria-valuetext={`${s.yaw}°, ${s.pitch}°`}
          onKeyDown={keyTurn} style={{ cursor: drag?.part === "turn" ? "grabbing" : "grab" }} onPointerDown={turnFrom}>
          <title>{w.turnName}</title>
          <rect x={0} y={ST} width={W} height={SH} fill="transparent" />
        </g>
        {drawing(true)}
        {handles.map((h) => {
          const held = drag?.part === "point" && drag.id === h.id;
          const [x, y] = at(h.at);
          const name = fill(w.pointName, { name: h.name, at: vecText(h.at) });
          return (
            <g key={h.id} role="slider" tabIndex={0} aria-label={name} aria-valuemin={-LIM} aria-valuemax={LIM} aria-valuenow={h.at[0]} aria-valuetext={vecText(h.at)}
              data-point={h.id} style={{ cursor: held ? "grabbing" : "grab" }} onKeyDown={keyPoint(h)}
              onPointerDown={(e) => begin(e, { part: "point", id: h.id, p0: h.at, px })}>
              <title>{name}</title>
              {pointFace(h, held)}
              <circle cx={x} cy={y} r={18} fill="transparent" />
            </g>
          );
        })}
        {pointNames()}
        {sayEls}
      </svg>
      <p className="live-hint">{w.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={W} height={H - ST} viewBox={`0 ${ST} ${W} ${H - ST}`} fontFamily={FONT}>
          {clip("space-stage-b")}
          <rect y={ST} width={W} height={H - ST} fill="#fff" />
          {drawing(false)}
          {handles.map((h) => <g key={h.id}>{pointFace(h)}</g>)}
          {pointNames()}
          {sayEls}
        </svg>
      </div>
    </>
  );
}
