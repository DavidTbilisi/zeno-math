// Builds three.js scene content for a 3D spec: solids (with foldable nets) and unit-cube stacks.
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { canUnfold, cubeHeights, interpolated, type CubesSpec, type SolidSpec, type Spec3D, type Transform3DSpec } from "./spec";

const INK = 0x1e1e1e;
const COLORS = { base: 0xa5d8ff, side1: 0xffd8a8, side2: 0xb2f2bb, top: 0xeebefa };
const LAYER_COLORS = [0xa5d8ff, 0xffd8a8, 0xb2f2bb, 0xeebefa, 0xffec99, 0xffc9c9];

type Ctx = { lineMats: LineMaterial[]; seeThrough: boolean; L: number };

export type Built = { group: THREE.Group; lineMats: LineMaterial[]; fitBox: THREE.Box3 };

type LineOpts = { dashed?: boolean; onTop?: boolean; width?: number; color?: number };

function lineMat(ctx: Ctx, opts: LineOpts = {}) {
  const m = new LineMaterial({
    color: opts.color ?? INK,
    linewidth: opts.width ?? 2,
    dashed: !!opts.dashed,
    dashSize: ctx.L * 0.05,
    gapSize: ctx.L * 0.035,
    depthTest: !opts.onTop,
  });
  ctx.lineMats.push(m);
  return m;
}

function edgesOf(geo: THREE.BufferGeometry, ctx: Ctx) {
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 25));
  return new LineSegments2(lg, lineMat(ctx));
}

/** Line segments from pairs of points. */
function segments(points: THREE.Vector3[], ctx: Ctx, opts: LineOpts = {}) {
  const lg = new LineSegmentsGeometry().setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const line = new LineSegments2(lg, lineMat(ctx, opts));
  if (opts.dashed) line.computeLineDistances();
  line.renderOrder = opts.onTop ? 5 : 0;
  return line;
}

function faceMat(color: number, ctx: Ctx) {
  return new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: ctx.seeThrough,
    opacity: ctx.seeThrough ? 0.35 : 1,
    depthWrite: !ctx.seeThrough,
    polygonOffset: true, // keep edges drawn on top of their faces
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

function face(geo: THREE.BufferGeometry, color: number, ctx: Ctx, edges = true) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, faceMat(color, ctx)));
  if (edges) g.add(edgesOf(geo, ctx));
  return g;
}

function label(text: string, pos: THREE.Vector3, ctx: Ctx, color = "#1e1e1e", scale = 1) {
  const fs = 56;
  const font = `600 ${fs}px "Segoe UI", Helvetica, Arial, sans-serif`;
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d")!;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width + fs * 0.7);
  const h = Math.ceil(fs * 1.35);
  canvas.width = w;
  canvas.height = h;
  g.font = font;
  g.fillStyle = "rgba(255,255,255,0.88)";
  g.beginPath();
  g.roundRect(0, 0, w, h, h / 3);
  g.fill();
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const H = ctx.L * 0.13 * scale;
  sprite.scale.set((H * w) / h, H, 1);
  sprite.position.copy(pos);
  sprite.renderOrder = 10;
  return sprite;
}

const fmt = (v: number) => String(Math.round(v * 100) / 100);
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function circle(r: number, y: number, n = 96) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    pts.push(V(r * Math.cos(a1), y, r * Math.sin(a1)), V(r * Math.cos(a2), y, r * Math.sin(a2)));
  }
  return pts;
}

// ---------- Solids ----------

function cuboid(spec: SolidSpec, ctx: Ctx, t: number) {
  const { a, b, c } = spec;
  const root = new THREE.Group();
  const ang = (t * Math.PI) / 2;

  root.add(face(new THREE.PlaneGeometry(a, b).rotateX(-Math.PI / 2), COLORS.base, ctx));

  // Side faces hinge on the bottom edges; t=1 lays them flat into a cross-shaped net.
  const side = (w: number, color: number) => face(new THREE.PlaneGeometry(w, c).translate(0, c / 2, 0), color, ctx);
  const front = new THREE.Group();
  front.position.set(0, 0, b / 2);
  front.rotation.x = ang;
  front.add(side(a, COLORS.side1));
  const back = new THREE.Group();
  back.position.set(0, 0, -b / 2);
  back.rotation.x = -ang;
  back.add(side(a, COLORS.side1));
  const right = new THREE.Group();
  right.position.set(a / 2, 0, 0);
  right.rotation.z = -ang;
  right.add(face(new THREE.PlaneGeometry(b, c).translate(0, c / 2, 0).rotateY(Math.PI / 2), COLORS.side2, ctx));
  const left = new THREE.Group();
  left.position.set(-a / 2, 0, 0);
  left.rotation.z = ang;
  left.add(face(new THREE.PlaneGeometry(b, c).translate(0, c / 2, 0).rotateY(Math.PI / 2), COLORS.side2, ctx));

  // Top hinges on the back face's upper edge.
  const top = new THREE.Group();
  top.position.set(0, c, 0);
  top.rotation.x = -ang;
  top.add(face(new THREE.PlaneGeometry(a, b).rotateX(-Math.PI / 2).translate(0, 0, b / 2), COLORS.top, ctx));
  back.add(top);
  root.add(front, back, left, right);

  if (spec.labels && t === 0) {
    const o = ctx.L * 0.09;
    const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
    root.add(
      label(`${fmt(a)}${u}`, V(0, -o * 0.5, b / 2 + o), ctx),
      label(`${fmt(b)}${u}`, V(a / 2 + o, -o * 0.5, 0), ctx),
      label(`${fmt(c)}${u}`, V(-a / 2 - o * 1.6, c / 2, b / 2), ctx),
    );
  }
  return root;
}

function pyramid(spec: SolidSpec, ctx: Ctx, t: number) {
  const { a, c } = spec;
  const root = new THREE.Group();
  root.add(face(new THREE.PlaneGeometry(a, a).rotateX(-Math.PI / 2), COLORS.base, ctx));

  const slant = Math.hypot(c, a / 2);
  const tilt = Math.atan2(a / 2, c); // closed: faces lean inward by this angle
  for (let k = 0; k < 4; k++) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([-a / 2, 0, 0, a / 2, 0, 0, 0, slant, 0], 3));
    tri.computeVertexNormals();
    const yaw = new THREE.Group();
    yaw.rotation.y = (k * Math.PI) / 2;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, a / 2);
    hinge.rotation.x = -tilt + t * (Math.PI / 2 + tilt);
    hinge.add(face(tri, k % 2 ? COLORS.side2 : COLORS.side1, ctx));
    yaw.add(hinge);
    root.add(yaw);
  }

  if (t === 0) {
    root.add(segments([V(0, 0, 0), V(0, c, 0)], ctx, { dashed: true, onTop: spec.seeThrough }));
    if (spec.labels) {
      const o = ctx.L * 0.09;
      const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
      root.add(label(`${fmt(a)}${u}`, V(0, -o * 0.4, a / 2 + o), ctx), label(`h = ${fmt(c)}${u}`, V(o * 1.6, c / 2, 0), ctx));
    }
  }
  return root;
}

/**
 * Cylinder with an unrolling net. First half of t: the curved surface unrolls around its front
 * generator into a flat 2πr × h rectangle (constant arc length, shrinking curvature). Second half:
 * the rectangle folds down onto the ground, with the top circle hinged on its far edge.
 */
function cylinder(spec: SolidSpec, ctx: Ctx, t: number) {
  const r = spec.a;
  const h = spec.c;
  const root = new THREE.Group();
  const o = ctx.L * 0.09;
  const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
  const unroll = Math.min(1, 2 * t);
  const fold = Math.max(0, 2 * t - 1) * (Math.PI / 2);
  const disc = () => new THREE.CircleGeometry(r, 96).rotateX(-Math.PI / 2);
  const rim = (cz: number) => circle(r, 0).map((p) => p.setZ(p.z + cz));

  root.add(face(disc(), COLORS.base, ctx, false), segments(rim(0), ctx));

  // Lateral surface in the frame of the front generator (x = 0, z = 0 local, y up).
  const side = new THREE.Group();
  side.position.set(0, 0, r);
  side.rotation.x = fold;
  root.add(side);

  const N = 128;
  const k = 1 - unroll; // curvature factor: 1 = closed, 0 = flat
  const at = (i: number, y: number) => {
    const s = -Math.PI * r + (2 * Math.PI * r * i) / N; // arc length from the generator
    if (k < 1e-4) return V(s, y, 0);
    const R = r / k;
    const th = s / R;
    return V(R * Math.sin(th), y, -R * (1 - Math.cos(th)));
  };
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) for (const y of [0, h]) pos.push(...at(i, y).toArray());
  for (let i = 0; i < N; i++) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  const lateral = new THREE.BufferGeometry();
  lateral.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  lateral.setIndex(idx);
  lateral.computeVertexNormals();
  side.add(new THREE.Mesh(lateral, faceMat(COLORS.side1, ctx)));
  const outline: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) outline.push(at(i, 0), at(i + 1, 0), at(i, h), at(i + 1, h));
  if (unroll > 0) outline.push(at(0, 0), at(0, h), at(N, 0), at(N, h)); // the cut seam
  side.add(segments(outline, ctx));

  const top = new THREE.Group();
  top.position.set(0, h, 0);
  top.rotation.x = fold;
  top.add(face(disc().translate(0, 0, -r), COLORS.top, ctx, false), segments(rim(-r), ctx));
  side.add(top);

  if (t === 0) {
    root.add(segments([V(0, h, 0), V(r, h, 0)], ctx, { dashed: true, onTop: true }));
    if (spec.labels) root.add(label(`r = ${fmt(r)}${u}`, V(r / 2, h + o * 0.7, 0), ctx), label(`h = ${fmt(h)}${u}`, V(r + o * 1.5, h / 2, 0), ctx));
  } else if (t === 1 && spec.labels) {
    // Flat net: circle, 2πr × h rectangle, circle. The net is ~3× wider than the solid, so bigger labels.
    const big = Math.max(1, (2 * Math.PI * r) / ctx.L) * 0.8;
    root.add(
      label(`2πr ≈ ${fmt(2 * Math.PI * r)}${u}`, V(0, 0.02, r + h / 2), ctx, "#1e1e1e", big),
      label(`h = ${fmt(h)}${u}`, V(Math.PI * r + o * 1.4 * big, 0.02, r + h / 2), ctx, "#1e1e1e", big),
      label(`r = ${fmt(r)}${u}`, V(0, 0.02, 0), ctx, "#1e1e1e", big),
    );
  }
  return root;
}

/**
 * Cone with an unrolling net (slant l = √(r² + h²), net sector angle Φ = 2πr/l).
 * First half of t: the curved surface flattens around its front generator — it wraps onto cones
 * of the same slant l whose half-angle β grows from asin(r/l) to 90°, ending as a flat sector
 * in the tangent plane. Second half: that sector folds down about the base's tangent point onto
 * the ground, arc touching the base circle.
 */
function cone(spec: SolidSpec, ctx: Ctx, t: number) {
  const r = spec.a;
  const h = spec.c;
  const l = Math.hypot(r, h);
  const phi = (2 * Math.PI * r) / l; // sector angle of the net
  const root = new THREE.Group();
  const o = ctx.L * 0.09;
  const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
  const unroll = Math.min(1, 2 * t);
  const fold = Math.max(0, 2 * t - 1);

  root.add(face(new THREE.CircleGeometry(r, 96).rotateX(-Math.PI / 2), COLORS.base, ctx, false), segments(circle(r, 0), ctx));

  // Fold hinge: the x-parallel line through the base's front point P0 = (0, 0, r).
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, r);
  hinge.rotation.x = fold * (Math.PI / 2 + Math.atan2(r, h)); // tangent plane → flat on the ground, outward
  root.add(hinge);

  // Tangent-plane frame at the front generator: ex along x, ey up the generator to the apex, ez outward.
  const ex = V(1, 0, 0);
  const ey = V(0, h / l, -r / l);
  const ez = new THREE.Vector3().crossVectors(ex, ey);
  const frame = new THREE.Group();
  frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez));
  hinge.add(frame);

  // In the frame: apex at (0, l, 0), generator σ = 0 runs down to the origin.
  const beta0 = Math.asin(Math.min(1, r / l));
  const beta = beta0 + (Math.PI / 2 - beta0) * unroll;
  const [sb, cb] = [Math.sin(beta), Math.cos(beta)];
  const apex = V(0, l, 0);
  const axis = V(0, -cb, -sb); // cone axis from the apex
  const n0 = V(0, -sb, cb); // toward the fixed generator, perpendicular to the axis
  const rimAt = (sigma: number) => {
    const alpha = sigma / sb; // arc length along the rim is preserved
    const dir = axis.clone().multiplyScalar(cb).add(n0.clone().multiplyScalar(sb * Math.cos(alpha))).add(ex.clone().multiplyScalar(sb * Math.sin(alpha)));
    return apex.clone().addScaledVector(dir, l);
  };

  const N = 128;
  const rim = [...Array(N + 1).keys()].map((i) => rimAt(-phi / 2 + (phi * i) / N));
  const pos: number[] = [];
  const idx: number[] = [];
  rim.forEach((p) => pos.push(...apex.toArray(), ...p.toArray())); // one apex copy per column → smooth normals
  for (let i = 0; i < N; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 3);
  const lateral = new THREE.BufferGeometry();
  lateral.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  lateral.setIndex(idx);
  lateral.computeVertexNormals();
  frame.add(new THREE.Mesh(lateral, faceMat(COLORS.side1, ctx)));
  const outline: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) outline.push(rim[i], rim[i + 1]);
  if (unroll > 0) outline.push(apex, rim[0], apex, rim[N]); // the cut seam
  frame.add(segments(outline, ctx));

  if (t === 0) {
    root.add(segments([V(0, 0, 0), V(r, 0, 0), V(0, 0, 0), V(0, h, 0)], ctx, { dashed: true, onTop: true }));
    if (spec.labels) root.add(label(`r = ${fmt(r)}${u}`, V(r / 2, -o * 0.7, 0), ctx), label(`h = ${fmt(h)}${u}`, V(-o * 1.5, h / 2, 0), ctx));
  } else if (t === 1 && spec.labels) {
    // Flat net: sector (radius l, angle Φ) touching the base circle. Positions in world coordinates.
    const big = Math.max(1, (2 * l) / ctx.L) * 0.7;
    root.add(
      label(`r = ${fmt(r)}${u}`, V(0, 0.02, 0), ctx, "#1e1e1e", big),
      label(`l ≈ ${fmt(l)}${u}`, V(0, 0.02, r + l * 0.5), ctx, "#1e1e1e", big),
      label(`θ ≈ ${fmt((phi * 180) / Math.PI)}°`, V(0, 0.02, r + l * 0.78), ctx, "#1e1e1e", big),
    );
  }
  return root;
}

/** Regular n-gon geometry (horizontal, facing up); edge 0's outward normal points along +z. */
function polygon(n: number, a: number, cz = 0) {
  const Rc = a / (2 * Math.sin(Math.PI / n));
  const pos: number[] = [];
  for (let k = 0; k < n; k++) {
    const p1 = (2 * Math.PI * k) / n - Math.PI / n;
    const p2 = p1 + (2 * Math.PI) / n;
    pos.push(0, 0, cz, Rc * Math.sin(p1), 0, cz + Rc * Math.cos(p1), Rc * Math.sin(p2), 0, cz + Rc * Math.cos(p2));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); // winding faces +y
  g.computeVertexNormals();
  return g;
}

/** Right prism on a regular n-gon; unfolds like the cuboid: sides hinge out, top hinges on side 0. */
function prism(spec: SolidSpec, ctx: Ctx, t: number) {
  const n = spec.sides ?? 3;
  const { a, c } = spec;
  const ap = a / (2 * Math.tan(Math.PI / n)); // apothem
  const ang = (t * Math.PI) / 2;
  const root = new THREE.Group();
  const outlinePoly = (cz: number) => {
    const Rc = a / (2 * Math.sin(Math.PI / n));
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < n; k++) {
      const p1 = (2 * Math.PI * k) / n - Math.PI / n;
      const p2 = p1 + (2 * Math.PI) / n;
      pts.push(V(Rc * Math.sin(p1), 0, cz + Rc * Math.cos(p1)), V(Rc * Math.sin(p2), 0, cz + Rc * Math.cos(p2)));
    }
    return pts;
  };
  root.add(face(polygon(n, a), COLORS.base, ctx, false), segments(outlinePoly(0), ctx));

  for (let k = 0; k < n; k++) {
    const yaw = new THREE.Group();
    yaw.rotation.y = (2 * Math.PI * k) / n; // turns local +z onto edge k's outward normal
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, ap);
    hinge.rotation.x = ang;
    hinge.add(face(new THREE.PlaneGeometry(a, c).translate(0, c / 2, 0), k % 2 ? COLORS.side2 : COLORS.side1, ctx));
    if (k === 0) {
      const top = new THREE.Group();
      top.position.set(0, c, 0);
      top.rotation.x = ang;
      top.add(face(polygon(n, a, -ap), COLORS.top, ctx, false), segments(outlinePoly(-ap), ctx));
      hinge.add(top);
    }
    yaw.add(hinge);
    root.add(yaw);
  }

  if (spec.labels && t === 0) {
    const o = ctx.L * 0.09;
    const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
    root.add(label(`${fmt(a)}${u}`, V(0, -o * 0.5, ap + o), ctx), label(`h = ${fmt(c)}${u}`, V(-a / 2 - o * 2, c / 2, ap), ctx));
  }
  return root;
}

function sphere(spec: SolidSpec, ctx: Ctx) {
  const r = spec.a;
  const root = new THREE.Group();
  const u = spec.unit.trim() ? ` ${spec.unit.trim()}` : "";
  root.add(face(new THREE.SphereGeometry(r, 64, 48), COLORS.base, ctx, false));
  root.add(segments(circle(r, 0), ctx, { dashed: true }));
  root.add(segments([V(0, 0, 0), V(r, 0, 0)], ctx, { dashed: true, onTop: true }));
  if (spec.labels) root.add(label(`r = ${fmt(r)}${u}`, V(r / 2, ctx.L * 0.063, 0), ctx));
  return root;
}

function buildSolid(spec: SolidSpec, t: number): { group: THREE.Group; lineMats: LineMaterial[] } {
  // L = the solid's largest extent; labels and dashes scale with it.
  const L =
    spec.shape === "cuboid" ? Math.max(spec.a, spec.b, spec.c)
    : spec.shape === "pyramid" ? Math.max(spec.a, spec.c)
    : spec.shape === "sphere" ? 2 * spec.a
    : spec.shape === "prism" ? Math.max(spec.a / Math.sin(Math.PI / (spec.sides ?? 3)), spec.c)
    : Math.max(2 * spec.a, spec.c);
  const ctx: Ctx = { lineMats: [], seeThrough: spec.seeThrough, L: Math.max(L, 1) };
  const builders: Record<SolidSpec["shape"], (s: SolidSpec, c: Ctx, t: number) => THREE.Group> = {
    cuboid,
    pyramid,
    prism,
    cylinder,
    cone,
    sphere,
  };
  const group = builders[spec.shape](spec, ctx, t);
  return { group, lineMats: ctx.lineMats };
}

// ---------- Unit cubes ----------

function buildCubes(spec: CubesSpec): { group: THREE.Group; lineMats: LineMaterial[] } {
  const heights = cubeHeights(spec);
  const rows = heights.length;
  const cols = Math.max(0, ...heights.map((r) => r.length));
  const ctx: Ctx = { lineMats: [], seeThrough: false, L: Math.max(rows, cols, ...heights.flat(), 1) };
  const group = new THREE.Group();

  const cubes: THREE.Vector3[] = [];
  heights.forEach((row, r) =>
    row.forEach((h, col) => {
      for (let y = 0; y < h; y++) cubes.push(V(col - cols / 2 + 0.5, y + 0.5, r - rows / 2 + 0.5));
    }),
  );

  // Faint floor grid so empty cells of the plan are visible.
  const floor: THREE.Vector3[] = [];
  for (let i = 0; i <= cols; i++) floor.push(V(i - cols / 2, 0, -rows / 2), V(i - cols / 2, 0, rows / 2));
  for (let j = 0; j <= rows; j++) floor.push(V(-cols / 2, 0, j - rows / 2), V(cols / 2, 0, j - rows / 2));
  const floorLines = segments(floor, ctx);
  (floorLines.material as LineMaterial).color.set(0xadb5bd);
  (floorLines.material as LineMaterial).linewidth = 1;
  group.add(floorLines);

  if (cubes.length) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), faceMat(0xffffff, ctx), cubes.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    cubes.forEach((p, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
      mesh.setColorAt(i, color.set(LAYER_COLORS[Math.floor(p.y) % LAYER_COLORS.length]));
    });
    group.add(mesh);

    // All cube edges merged into one line geometry.
    const e: number[] = [];
    const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => [x - 0.5, y - 0.5, z - 0.5])));
    const pairs = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const p of cubes)
      for (const [i, j] of pairs) e.push(p.x + corners[i][0], p.y + corners[i][1], p.z + corners[i][2], p.x + corners[j][0], p.y + corners[j][1], p.z + corners[j][2]);
    group.add(new LineSegments2(new LineSegmentsGeometry().setPositions(e), lineMat(ctx, { width: 1.6 })));
  }

  if (spec.mode === "cuboid") {
    const o = 0.9;
    group.add(
      label(String(spec.a), V(0, -0.3, rows / 2 + o), ctx),
      label(String(spec.b), V(cols / 2 + o, -0.3, 0), ctx),
      label(String(spec.c), V(-cols / 2 - o * 1.2, spec.c / 2, rows / 2), ctx),
    );
  }
  return { group, lineMats: ctx.lineMats };
}

// ---------- 3×3 matrix transformation ----------

/** Math coordinates (x right, y back, z up) → three.js (y up). Orientation-preserving. */
const M3 = (x: number, y: number, z: number) => V(x, z, -y);

type Triple = [number, number, number];

/** The 12 edges of the unit cube as pairs of corners. */
const CUBE_EDGES: [Triple, Triple][] = [0, 1, 2].flatMap((axis) =>
  [[0, 0], [1, 0], [0, 1], [1, 1]].map(([p, q]) => {
    const [u, v] = [0, 1, 2].filter((k) => k !== axis);
    const a: Triple = [0, 0, 0];
    a[u] = p;
    a[v] = q;
    const b: Triple = [...a];
    b[axis] = 1;
    return [a, b] as [Triple, Triple];
  }),
);

function arrowHead(to: THREE.Vector3, color: number, size: number) {
  if (to.length() < size * 0.6) return null;
  const dir = to.clone().normalize();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.38, size, 24), new THREE.MeshBasicMaterial({ color, depthTest: false }));
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  cone.position.copy(to).addScaledVector(dir, -size / 2);
  cone.renderOrder = 6;
  return cone;
}

function buildTransform3D(spec: Transform3DSpec): { group: THREE.Group; lineMats: LineMaterial[] } {
  const m = interpolated(spec);
  const apply = (x: number, y: number, z: number) =>
    M3(m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z);

  const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => apply(x, y, z))));
  // Positive half-axes reach just past the solid; negative halves are shorter to keep the frame tight.
  const R = Math.max(1.5, ...corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y), Math.abs(c.z)))) + 0.6;
  const N = R * 0.45;
  const ctx: Ctx = { lineMats: [], seeThrough: true, L: R * 1.6 };
  const group = new THREE.Group();
  const o = ctx.L * 0.07;

  // Axes.
  const gray = 0x868e96;
  group.add(segments([M3(-N, 0, 0), M3(R, 0, 0), M3(0, -N, 0), M3(0, R, 0), M3(0, 0, -N), M3(0, 0, R)], ctx, { color: gray, width: 1.5 }));
  group.add(label("x", M3(R + o, 0, 0), ctx, "#868e96"), label("y", M3(0, R + o, 0), ctx, "#868e96"), label("z", M3(0, 0, R + o), ctx, "#868e96"));

  // Floor grid (z = 0): original faint, transformed blue.
  if (spec.grid) {
    const G = 2; // grid of the z = 0 plane from −2 to 2, before transforming
    const orig: THREE.Vector3[] = [];
    const moved: THREE.Vector3[] = [];
    for (let k = -G; k <= G; k++) {
      orig.push(M3(k, -G, 0), M3(k, G, 0), M3(-G, k, 0), M3(G, k, 0));
      moved.push(apply(k, -G, 0), apply(k, G, 0), apply(-G, k, 0), apply(G, k, 0));
    }
    const grids = [segments(orig, ctx, { color: 0xdee2e6, width: 1 }), segments(moved, ctx, { color: 0x74c0fc, width: 1.2 })];
    for (const g of grids) g.userData.noFit = true; // a sheared grid reaches far out; frame the axes instead
    group.add(...grids);
  }

  // Unit cube (dashed) → parallelepiped with volume |det|.
  group.add(segments(CUBE_EDGES.flatMap(([a, b]) => [M3(...a), M3(...b)]), ctx, { dashed: true, color: gray, width: 1.5 }));
  const quads: THREE.Vector3[][] = [0, 1, 2].flatMap((axis) =>
    [0, 1].map((side) => {
      const [u, v] = [0, 1, 2].filter((k) => k !== axis);
      return [[0, 0], [1, 0], [1, 1], [0, 1]].map(([p, q]) => {
        const c: Triple = [0, 0, 0];
        c[axis] = side;
        c[u] = p;
        c[v] = q;
        return apply(...c);
      });
    }),
  );
  const pos = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]).flatMap((p) => [p.x, p.y, p.z]);
  const solid = new THREE.BufferGeometry();
  solid.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  solid.computeVertexNormals();
  group.add(new THREE.Mesh(solid, faceMat(0xffa94d, ctx)));
  group.add(segments(CUBE_EDGES.flatMap(([a, b]) => [apply(...a), apply(...b)]), ctx, { color: 0xe8590c, width: 2.5 }));

  // Basis vectors land on the matrix columns: î green, ĵ red, k̂ blue.
  const basis: [THREE.Vector3, number, string, string][] = [
    [apply(1, 0, 0), 0x2f9e44, "#2f9e44", "î"],
    [apply(0, 1, 0), 0xe03131, "#e03131", "ĵ"],
    [apply(0, 0, 1), 0x1971c2, "#1971c2", "k̂"],
  ];
  for (const [to, color, css, name] of basis) {
    group.add(segments([V(0, 0, 0), to], ctx, { color, width: 4, onTop: true }));
    const head = arrowHead(to, color, ctx.L * 0.07);
    if (head) group.add(head);
    if (to.length() > 1e-6) group.add(label(name, to.clone().addScaledVector(to.clone().normalize(), o * 1.3), ctx, css));
  }
  return { group, lineMats: ctx.lineMats };
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const any = o as THREE.Mesh;
    any.geometry?.dispose();
    const mats = Array.isArray(any.material) ? any.material : any.material ? [any.material] : [];
    for (const m of mats) {
      (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
  });
}

function boxOf(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3();
  // Ignore sprites so labels don't affect framing.
  group.traverse((o) => {
    if (o.userData.noFit) return;
    if ((o as THREE.Mesh).isMesh || (o as LineSegments2).isLineSegments2) box.expandByObject(o, false);
  });
  return box;
}

export function build3D(spec: Spec3D): Built {
  if (spec.type === "transform3d") {
    const b = buildTransform3D(spec);
    return { ...b, fitBox: boxOf(b.group) };
  }
  if (spec.type === "cubes") {
    const b = buildCubes(spec);
    return { ...b, fitBox: boxOf(b.group) };
  }
  const b = buildSolid(spec, canUnfold(spec.shape) ? spec.unfold : 0);
  return { ...b, fitBox: boxOf(b.group) };
}
