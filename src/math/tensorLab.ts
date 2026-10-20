// Tensors by hand, the board's lab: a tensor drawn as NumPy and PyTorch keep it, its entries on top as slices, rows
// and columns, and under them the one line of memory they all live in, row-major, the last index changing fastest.
// An entry T[i, j, k] sits at place i·s₀ + j·s₁ + k·s₂, where the strides s say how many places one step along each
// axis moves. Eight puzzles ask to tap an entry by its indices (counted from 0), its place in memory (in a matrix and
// in an order-3 tensor), the entry at a given place, to type the strides, where an entry lands after a reshape (the
// same memory with new strides) and where an entry of a transpose sits (the strides swapped, so the view is no longer
// contiguous). Free play takes any of the shapes and views, tapping an entry or a place shows the other, and a walk
// through the view in its own order shows the memory it jumps across. Kept free of React so it can be tested on its own.

/** How a view reads the memory of T: as T itself, with its axes put in another order, or with another shape. */
export type TnViewKind = { kind: "as" } | { kind: "permute"; perm: number[] } | { kind: "reshape"; dims: number[] };
export type TnSetupId = "vec" | "m34" | "m43" | "t234" | "t324" | "t432" | "tr34" | "rs46" | "rs38" | "pm201";
/** T's shape, and the view of it that is drawn. */
export type TnSetup = { id: TnSetupId; base: number[]; view: TnViewKind };
/** What is drawn: its name, the code that makes it from T, its shape, and the strides it reads memory with. */
export type TnView = { name: string; code: string; shape: number[]; strides: number[] };

const plain = (id: TnSetupId, base: number[]): TnSetup => ({ id, base, view: { kind: "as" } });
export const TN_SETUPS: TnSetup[] = [
  plain("vec", [6]),
  plain("m34", [3, 4]),
  plain("m43", [4, 3]),
  plain("t234", [2, 3, 4]),
  plain("t324", [3, 2, 4]),
  plain("t432", [4, 3, 2]),
  { id: "tr34", base: [3, 4], view: { kind: "permute", perm: [1, 0] } },
  { id: "rs46", base: [2, 3, 4], view: { kind: "reshape", dims: [4, 6] } },
  { id: "rs38", base: [2, 3, 4], view: { kind: "reshape", dims: [3, 8] } },
  { id: "pm201", base: [2, 3, 4], view: { kind: "permute", perm: [2, 0, 1] } },
];
export const tnSetup = (id: TnSetupId) => TN_SETUPS.find((s) => s.id === id)!;

/** The numbers in memory, the first as many as T has entries: no pattern to read a place from. */
export const MEMORY = [31, 7, 58, 12, 44, 3, 26, 90, 15, 62, 8, 37, 71, 19, 50, 4, 83, 28, 66, 11, 47, 95, 22, 39];

export const sizeOf = (shape: number[]) => shape.reduce((a, b) => a * b, 1);
/** Row-major: how many places one step along each axis moves, the product of the lengths after it. */
export const rowStrides = (shape: number[]) => shape.map((_, k) => sizeOf(shape.slice(k + 1)));
/** Column-major, Fortran's order: the first index changing fastest. */
export const colStrides = (shape: number[]) => shape.map((_, k) => sizeOf(shape.slice(0, k)));
const dotWith = (idx: number[], st: number[]) => idx.reduce((a, v, k) => a + v * st[k], 0);
/** The indices of the i-th entry in a shape's own order, the last index changing fastest. */
export function unravel(i: number, shape: number[]): number[] {
  const idx: number[] = [];
  for (let k = shape.length - 1; k >= 0; k--) {
    idx[k] = i % shape[k];
    i = Math.floor(i / shape[k]);
  }
  return idx;
}

export function viewOf(s: TnSetup): TnView {
  const st = rowStrides(s.base);
  const v = s.view;
  if (v.kind === "as") return { name: "T", code: "T", shape: s.base, strides: st };
  if (v.kind === "reshape") return { name: "R", code: `T.reshape(${v.dims.join(", ")})`, shape: v.dims, strides: rowStrides(v.dims) };
  const t = v.perm.length === 2;
  return { name: t ? "Tᵀ" : "P", code: t ? "T.T" : `T.permute(${v.perm.join(", ")})`, shape: v.perm.map((k) => s.base[k]), strides: v.perm.map((k) => st[k]) };
}
/** Where in memory an entry of a view sits. */
export const placeOf = (v: TnView, idx: number[]) => dotWith(idx, v.strides);
/** Whether a view reads memory in order, as if it had been laid out on its own. */
export const isContiguous = (v: TnView) => v.strides.every((s, k) => s === rowStrides(v.shape)[k]);
/** The entry of a view that sits at a place in memory, by its order in the view. */
export const viewIndexAt = (v: TnView, place: number) => Array.from({ length: sizeOf(v.shape) }, (_, i) => i).find((i) => placeOf(v, unravel(i, v.shape)) === place)!;

export const shapeText = (shape: number[]) => shape.join(" × ");
export const entryText = (name: string, idx: number[]) => `${name}[${idx.join(", ")}]`;
/** How free play's list names a setup: the view's code, and T's shape. */
export const setupLabel = (s: TnSetup) => {
  const v = viewOf(s);
  return s.view.kind === "as" ? `T: ${shapeText(s.base)}` : `${v.code}, T: ${shapeText(s.base)}`;
};
/** The line over the picture: T's shape, and the view drawn if it is not T. */
export function tnCaption(s: TnSetup): string {
  const v = viewOf(s);
  return s.view.kind === "as" ? `T: ${shapeText(s.base)}` : `T: ${shapeText(s.base)} · ${v.name} = ${v.code}: ${shapeText(v.shape)}`;
}

export type TnNotice = "zero" | "rows" | "slices" | "strides" | "unravel" | "product" | "reshape" | "transpose";
export const TN_NOTICES: TnNotice[] = ["zero", "rows", "slices", "strides", "unravel", "product", "reshape", "transpose"];

/** A puzzle: tap the entry with these indices, tap its place in memory, tap the entry at a place, or type the strides. */
export type TnPuzzle =
  | { kind: "cell"; setup: TnSetupId; idx: number[]; notice: TnNotice }
  | { kind: "place"; setup: TnSetupId; idx: number[]; notice: TnNotice }
  | { kind: "find"; setup: TnSetupId; at: number; notice: TnNotice }
  | { kind: "strides"; setup: TnSetupId; notice: TnNotice };

export const TN_LADDER: TnPuzzle[] = [
  { kind: "cell", setup: "m34", idx: [1, 2], notice: "zero" },
  { kind: "place", setup: "m34", idx: [2, 1], notice: "rows" },
  { kind: "cell", setup: "t234", idx: [1, 0, 2], notice: "slices" },
  { kind: "place", setup: "t234", idx: [1, 2, 3], notice: "strides" },
  { kind: "find", setup: "t234", at: 17, notice: "unravel" },
  { kind: "strides", setup: "t432", notice: "product" },
  // Where T[1, 0, 2] (place 14) lands in R.
  { kind: "find", setup: "rs46", at: 14, notice: "reshape" },
  { kind: "place", setup: "tr34", idx: [3, 1], notice: "transpose" },
];

/** A tap: an entry of the view, by its order in the view, or a place in memory. */
export type TnSel = { at: "view" | "mem"; i: number };
/** Which of the two a puzzle takes taps on; free play takes both. */
export const tapsOn = (q: TnPuzzle | null): TnSel["at"][] => (!q ? ["view", "mem"] : q.kind === "place" ? ["mem"] : q.kind === "strides" ? [] : ["view"]);
/** The entry a puzzle is after, by its order in the view, or the place; null for the strides. */
export function answerOf(q: TnPuzzle): TnSel | null {
  const v = viewOf(tnSetup(q.setup));
  if (q.kind === "cell") return { at: "view", i: dotWith(q.idx, rowStrides(v.shape)) };
  if (q.kind === "place") return { at: "mem", i: placeOf(v, q.idx) };
  if (q.kind === "find") return { at: "view", i: viewIndexAt(v, q.at) };
  return null;
}

/** Slips: nothing tapped; for an entry by its indices, counting from 1, the indices the other way round, or off; for a
 * place, reading the view as if laid out on its own, column-major order, one place off, or off; for the entry at a
 * place, column-major order, one place off, or off; for the strides, a box empty or not a whole number, the shape, the
 * strides the other way round, column-major strides, or one axis off. */
export type TnSlip =
  | "none"
  | "oneBased" | "swapped" | "offCell"
  | "contiguous" | "colMajor" | "near" | "offPlace"
  | "colEntry" | "nearEntry" | "offFind"
  | "empty" | "bad" | "shape" | "reversed" | "colStrides" | "axis";
/** A try: done, or wrong and why, with what was tapped or typed, and for the strides the axis. */
export type TnVerdict = { state: "won" } | { state: "lost"; why: TnSlip; have: string; k: number };

/** A whole number as typed, with − or -; null if it is not one. */
export function readWhole(s: string): number | null {
  const t = s.trim().replace(/[−–]/g, "-");
  return /^-?\d+$/.test(t) ? Number(t) : null;
}

/** A try judged: the right entry, place or strides, or the slip it looks like — counting from 1, the indices the other
 * way round, reading a view as if it were laid out on its own, column-major order, one place off, or just off. */
export function judgeTn(q: TnPuzzle, sel: TnSel | null, answers: string[]): TnVerdict {
  const v = viewOf(tnSetup(q.setup));
  const lost = (why: TnSlip, have = "", k = 0): TnVerdict => ({ state: "lost", why, have, k });
  if (q.kind === "strides") {
    const typed = v.shape.map((_, k) => (answers[k] ?? "").trim());
    const empty = typed.findIndex((t) => !t);
    if (empty >= 0) return lost("empty", "", empty);
    const nums = typed.map(readWhole);
    const bad = nums.findIndex((n) => n === null);
    if (bad >= 0) return lost("bad", typed[bad], bad);
    const same = (xs: number[]) => xs.every((x, k) => nums[k] === x);
    if (same(v.strides)) return { state: "won" };
    const have = nums.join(", ");
    if (same(v.shape)) return lost("shape", have);
    if (same([...v.strides].reverse())) return lost("reversed", have);
    if (same(colStrides(v.shape))) return lost("colStrides", have);
    const k = v.strides.findIndex((s, k) => nums[k] !== s);
    return lost("axis", String(nums[k]), k);
  }
  const want = answerOf(q)!;
  if (!sel || sel.at !== want.at) return lost("none");
  if (sel.i === want.i) return { state: "won" };
  if (sel.at === "mem") {
    const idx = (q as { idx: number[] }).idx;
    const have = String(sel.i);
    if (!isContiguous(v) && sel.i === dotWith(idx, rowStrides(v.shape))) return lost("contiguous", have);
    if (sel.i === dotWith(idx, colStrides(v.shape))) return lost("colMajor", have);
    if (Math.abs(sel.i - want.i) === 1) return lost("near", have);
    return lost("offPlace", have);
  }
  const got = unravel(sel.i, v.shape);
  const have = entryText(v.name, got);
  if (q.kind === "cell") {
    if (got.every((x, k) => x === q.idx[k] + 1)) return lost("oneBased", have);
    if ([...got].sort().join() === [...q.idx].sort().join()) return lost("swapped", have);
    return lost("offCell", have);
  }
  const at = (q as { at: number }).at;
  if (dotWith(got, colStrides(v.shape)) === at) return lost("colEntry", have);
  if (Math.abs(placeOf(v, got) - at) === 1) return lost("nearEntry", have);
  return lost("offFind", have);
}

/** Stars: done at the first try three, at the second two, else one. */
export const tnStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LiveTensor = {
  mode: "puzzle" | "free";
  stage: number;
  /** Free play's shape and view. */
  setup: TnSetupId;
  /** What was tapped last, and what has been typed for each stride. */
  sel: TnSel | null;
  answers: string[];
  /** Tries that failed on this puzzle, whether it is done, and what was said about the last check. */
  tries: number;
  done: boolean;
  said: { kind: "notice"; key: TnNotice } | { kind: "wrong"; why: TnSlip } | null;
};
export const TN_START: LiveTensor = { mode: "puzzle", stage: 0, setup: "t234", sel: null, answers: [], tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play; and the setup in play. */
export const tnPuzzle = (d: Pick<LiveTensor, "mode" | "stage">) => (d.mode === "puzzle" ? TN_LADDER[d.stage] : null);
export const setupOf = (d: Pick<LiveTensor, "mode" | "stage" | "setup">) => tnSetup(tnPuzzle(d)?.setup ?? d.setup);

/** What a tap points at: the entry's indices in the view, its place in memory and its number. */
export function readSel(v: TnView, sel: TnSel): { idx: number[]; place: number; value: number } {
  const i = sel.at === "view" ? sel.i : viewIndexAt(v, sel.i);
  const idx = unravel(i, v.shape);
  const place = placeOf(v, idx);
  return { idx, place, value: MEMORY[place] };
}
/** The next entry of the view in its own order, from what was tapped; the first if nothing was. */
export function walk(v: TnView, sel: TnSel | null): TnSel {
  const i = !sel ? -1 : sel.at === "view" ? sel.i : viewIndexAt(v, sel.i);
  return { at: "view", i: (i + 1) % sizeOf(v.shape) };
}
/** The sum that gives an entry's place: 1·12 + 0·4 + 2·1. */
export const placeSum = (v: TnView, idx: number[]) => idx.map((x, k) => `${x}·${v.strides[k]}`).join(" + ");

// ---------- the picture ----------

export const TN_PLOT = { w: 640, h: 300, memTop: 232, gap: 26 };
/** One slice's tint and edge, by the first index of T: a slice of T keeps its colour in any view and in memory. */
const TINT = ["#d0ebff", "#d3f9d8", "#ffe8cc", "#f3d9fa"];
const EDGE = ["#1971c2", "#2f9e44", "#e8590c", "#9c36b5"];
const HI = "#ff922b";
const r1 = (v: number) => Math.round(v * 10) / 10;

export type TnBox = { x: number; y: number; cs: number };
/** Where everything is: the view's slices (their left edges), its entries in its own order, and the places in memory. */
export function tnLayout(v: TnView): { cs: number; top: number; slices: number[]; cells: TnBox[]; mem: TnBox[] } {
  const { w, memTop, gap } = TN_PLOT;
  const o = v.shape.length;
  const [s, r, c] = [o === 3 ? v.shape[0] : 1, o >= 2 ? v.shape[o - 2] : 1, v.shape[o - 1]];
  const cs = Math.min(40, (w - 90 - (s - 1) * gap) / (s * c), 150 / r);
  const x0 = (w - s * c * cs - (s - 1) * gap) / 2;
  const top = s > 1 ? 62 : 48;
  const slices = Array.from({ length: s }, (_, j) => x0 + j * (c * cs + gap));
  const cells = Array.from({ length: sizeOf(v.shape) }, (_, i) => {
    const idx = unravel(i, v.shape);
    const [j, row, col] = [o === 3 ? idx[0] : 0, o >= 2 ? idx[o - 2] : 0, idx[o - 1]];
    return { x: slices[j] + col * cs, y: top + row * cs, cs };
  });
  const n = sizeOf(v.shape);
  const ms = Math.min(34, (w - 40) / n);
  const mx = (w - n * ms) / 2;
  const mem = Array.from({ length: n }, (_, p) => ({ x: mx + p * ms, y: memTop, cs: ms }));
  return { cs, top, slices, cells, mem };
}

/** The entry or the place a point is on, if any. */
export function tnHit(v: TnView, px: number, py: number): TnSel | null {
  const { cells, mem } = tnLayout(v);
  const on = (b: TnBox) => px >= b.x && px <= b.x + b.cs && py >= b.y && py <= b.y + b.cs;
  const i = cells.findIndex(on);
  if (i >= 0) return { at: "view", i };
  const p = mem.findIndex(on);
  return p >= 0 ? { at: "mem", i: p } : null;
}

export type TnPicture = {
  /** What was tapped; whether memory shows its numbers and colours and the tap its partner; whether the tap is wrong;
   * the words over memory, and the line over the picture. */
  sel: TnSel | null;
  reveal: boolean;
  wrong: boolean;
  memory: string;
  caption: string;
};

/**
 * The picture: the view's entries with their numbers, slices titled and indices along the rows and columns, each entry
 * tinted by the slice of T it comes from; under it memory, its places numbered, plain until it is revealed. A tap is
 * orange (red when a check went wrong), and once revealed its partner too, with a dashed line between them under the cells.
 */
export function tnSvg(s: TnSetup, o: TnPicture): string {
  const v = viewOf(s);
  const { cs, top, slices, cells, mem } = tnLayout(v);
  const order = v.shape.length;
  const [r, c] = [order >= 2 ? v.shape[order - 2] : 1, v.shape[order - 1]];
  const slice0 = s.base.length > 1 ? rowStrides(s.base)[0] : sizeOf(s.base);
  const tint = (place: number) => Math.floor(place / slice0) % TINT.length;
  const txt = (x: number, y: number, t: string, size: number, color: string, anchor = "middle", weight = "400") =>
    `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${t}</text>`;
  const mine = (at: TnSel["at"], i: number) => o.sel?.at === at && o.sel.i === i;
  const partner = o.reveal && o.sel ? (o.sel.at === "view" ? { at: "mem" as const, i: placeOf(v, unravel(o.sel.i, v.shape)) } : { at: "view" as const, i: viewIndexAt(v, o.sel.i) }) : null;
  const lit = (at: TnSel["at"], i: number) => mine(at, i) || (partner?.at === at && partner.i === i);
  const box = (b: TnBox, fill: string, edge: string, on: boolean, bad: boolean) =>
    `<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.cs)}" height="${r1(b.cs)}" fill="${bad ? "#ffc9c9" : on ? HI : fill}" stroke="${bad ? "#e03131" : on ? "#d9480f" : edge}" stroke-width="${bad || on ? 2.5 : 1.1}"/>`;

  let out = txt(12, 18, o.caption, 12, "#495057", "start", "700");
  // The line between a tap and its partner goes under the cells, so it never crosses a number.
  if (partner && o.sel) {
    const [cell, place] = o.sel.at === "view" ? [cells[o.sel.i], mem[partner.i]] : [cells[partner.i], mem[o.sel.i]];
    out += `<line x1="${r1(cell.x + cell.cs / 2)}" y1="${r1(cell.y + cell.cs / 2)}" x2="${r1(place.x + place.cs / 2)}" y2="${r1(place.y)}" stroke="#d9480f" stroke-width="1.8" stroke-dasharray="5 3"/>`;
  }
  slices.forEach((x, j) => {
    if (slices.length > 1) out += txt(x + (c * cs) / 2, top - 26, entryText(v.name, [j]), 13, "#1e1e1e", "middle", "700");
    for (let col = 0; col < c; col++) out += txt(x + (col + 0.5) * cs, top - 7, String(col), 11, "#868e96");
    if (order >= 2) for (let row = 0; row < r; row++) out += txt(x - 6, top + (row + 0.5) * cs + 4, String(row), 11, "#868e96", "end");
  });
  cells.forEach((b, i) => {
    const place = placeOf(v, unravel(i, v.shape));
    const t = tint(place);
    const on = lit("view", i);
    out += box(b, TINT[t], EDGE[t], on, o.wrong && mine("view", i));
    out += txt(b.x + b.cs / 2, b.y + b.cs / 2 + 5, String(MEMORY[place]), Math.min(14, b.cs * 0.4), "#1e1e1e", "middle", on ? "700" : "400");
  });

  out += txt(mem[0].x, TN_PLOT.memTop - 9, o.memory, 12, "#495057", "start", "700");
  mem.forEach((b, p) => {
    const t = tint(p);
    const on = lit("mem", p);
    out += box(b, o.reveal ? TINT[t] : "#f8f9fa", o.reveal ? EDGE[t] : "#adb5bd", on, o.wrong && mine("mem", p));
    if (o.reveal) out += txt(b.x + b.cs / 2, b.y + b.cs / 2 + 4, String(MEMORY[p]), Math.min(12, b.cs * 0.45), "#1e1e1e", "middle", on ? "700" : "400");
    out += txt(b.x + b.cs / 2, b.y + b.cs + 13, String(p), 10, on ? "#d9480f" : "#868e96", "middle", on ? "700" : "400");
  });
  return out;
}
