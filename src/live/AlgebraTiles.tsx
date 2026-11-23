// Algebra tiles on the board, worked by hand: x² a big square, x a long rod, 1 a small square, red when negative. No
// buttons: the tabs above the picture pick the way of working, and everything else is dragged and tapped.
// - Combine: drag tiles out of the trays onto the mat (or tap a tray), tap a tile or drag it off to take it away, drop
//   a tile on its negative and the two cancel, drag round empty mat to pick up several. "Line up" puts them in rows.
// - Multiply: drag x rods and ones onto the rectangle's top and left sides (a 1 dropped on a side of −1s cancels one);
//   the tiles that fill the rectangle are the product. Tap a side's tile, or drag it off, to take it away.
// - Factor: the same sides, to be built until their rectangle uses exactly a trinomial's tiles.
// The tiles, the rectangle and the layout come from src/math/algebraTiles.ts; the parts worked by hand from ./hand.
import { useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  FACTOR_TARGETS, freeTileSpot, keepTileOn, lineUp, matText, net, onTileMat, partsText, poly, product, rectangle, rows, same,
  side, sideAdd, sideTake, TILE_CAP, TILE_KINDS, TILE_MAT as MAT, TILE_MODES, tilesState, tileSize, tileUnder, countsOf, zeroPairs,
  type Factors, type LiveAlgebraTiles, type MatTile, type Side, type SidePiece, type TileKind,
} from "../math/algebraTiles";
import { Bin, BLUE, boxOf, GREEN, inBox, keyTap, Pill, Tabs, useDrag, wrapWords, type DragAt } from "./hand";
import { usePops } from "./pops";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 640;
const COLORS: Record<TileKind | "neg", { fill: string; stroke: string }> = {
  x2: { fill: "#a5d8ff", stroke: "#1971c2" },
  x: { fill: "#b2f2bb", stroke: "#2f9e44" },
  one: { fill: "#ffec99", stroke: "#f08c00" },
  neg: { fill: "#ffc9c9", stroke: "#e03131" },
};
const NAME: Record<TileKind, string> = { x2: "x²", x: "x", one: "1" };
const TAB_Y = 12;
const BIN = { x: 20, y: MAT.y + MAT.h - 70, w: 104, h: 66 };
/** Dropped left of this, a tile is taken away. */
const OFF_X = MAT.x - 6;
const SAY_Y = MAT.y + MAT.h + 30;
const SAY = 26;
const WRAP = 68;
/** The x² trays are drawn this many px to a small square (the mat's are 20); the thin tiles' trays larger, to be easy to grab. */
const TRAY_U = 16;

type Drag =
  | { from: "mat"; ids: number[] }
  | { from: "tray"; kind: TileKind; neg: boolean }
  | { from: "box" }
  | { from: "sideTray"; piece: SidePiece }
  | { from: "side"; s: Side; piece: "x" | "one" };
type Ghost = { kind: TileKind; neg: boolean; x: number; y: number; w: number; h: number; zero?: boolean };

const label = (kind: TileKind, neg: boolean) => `${neg ? "−" : ""}${NAME[kind]}`;
const at = (x: number, y: number) => ({ transform: `translate(${x}px, ${y}px)` });

/** One tile w × h px with its corner at (0, 0); ringed green when a dragged tile would cancel it, blue when picked. */
function TileShape({ kind, neg, w, h, ring }: { kind: TileKind; neg: boolean; w: number; h: number; ring?: string }) {
  const c = COLORS[neg ? "neg" : kind];
  const size = Math.min(w, h) * 0.55;
  return (
    <>
      {ring && <rect x={-3} y={-3} width={w + 6} height={h + 6} rx={6} fill="none" stroke={ring} strokeWidth={3} />}
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={Math.min(4, w / 6)} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
      {size >= 7 && (
        <text x={w / 2} y={h / 2 + Math.min(size, 20) * 0.36} fontSize={Math.min(size, 20)} textAnchor="middle" fill={c.stroke} fontWeight={700} pointerEvents="none">
          {label(kind, neg)}
        </text>
      )}
    </>
  );
}

type Line = { text: string; tone: "main" | "note" | "solved" };
const TONE = { main: { fill: INK, weight: 700 }, note: { fill: "#495057", weight: 400 }, solved: { fill: GREEN, weight: 700 } };

export function AlgebraTiles({ state: saved, set, w: words, svgRef }: PieceProps<"algebraTiles">) {
  const w = words.algebraTiles;
  const state = tilesState(saved);
  const { mode, tiles } = state;
  const f = state.f;
  const [picked, setPicked] = useState<number[]>([]);
  const [ghosts, pop] = usePops<Ghost>();
  const { pos, neg } = countsOf(tiles);
  const lines: Line[] = [];

  // ---- Combine: the mat. ----
  const full = (kind: TileKind, isNeg: boolean) => (isNeg ? neg : pos)[TILE_KINDS.indexOf(kind)] >= TILE_CAP[TILE_KINDS.indexOf(kind)];
  const putTiles = (next: MatTile[], patch: Partial<LiveAlgebraTiles> = {}) => set({ ...state, ...patch, tiles: next });
  const ghostOf = (t: MatTile): Ghost => {
    const [tw, th] = tileSize(t.kind);
    return { kind: t.kind, neg: t.neg, x: t.x, y: t.y, w: tw, h: th };
  };
  /** The tiles being dragged, where they are now. */
  const flying = (d: DragAt<Drag> | null): MatTile[] => {
    if (!d?.moved) return [];
    if (d.from === "mat") return tiles.filter((t) => d.ids.includes(t.id)).map((t) => ({ ...t, x: t.x + d.x - d.x0, y: t.y + d.y - d.y0 }));
    if (d.from === "tray") {
      const [tw, th] = tileSize(d.kind);
      return [{ id: state.next, kind: d.kind, neg: d.neg, x: d.x - tw / 2, y: d.y - th / 2 }];
    }
    return [];
  };
  /** Which dragged tiles land on a negative of theirs, dropped where they are. */
  const cancels = (moving: MatTile[], others: MatTile[]): [MatTile, MatTile][] => {
    const used: number[] = [];
    const out: [MatTile, MatTile][] = [];
    for (const m of moving) {
      const [tw, th] = tileSize(m.kind);
      const hit = tileUnder(others, m.x + tw / 2, m.y + th / 2, m.kind, m.neg, used);
      if (hit) {
        used.push(hit.id);
        out.push([m, hit]);
      }
    }
    return out;
  };
  const zeroPops = (ps: [MatTile, MatTile][]): Ghost[] => ps.flatMap(([m, t]) => {
    const g = ghostOf(t);
    return [{ ...ghostOf(m), x: g.x + 5, y: g.y + 5 }, g, { ...g, zero: true }];
  });
  const putOne = (kind: TileKind, isNeg: boolean) => {
    const s = !full(kind, isNeg) && freeTileSpot(tiles, kind);
    if (s) putTiles([...tiles, { id: state.next, kind, neg: isNeg, ...s }], { next: state.next + 1 });
  };
  const clearMat = () => {
    pop(tiles.map(ghostOf));
    setPicked([]);
    putTiles([]);
  };

  // ---- Multiply and factor: the sides. ----
  const target = FACTOR_TARGETS[((state.target % FACTOR_TARGETS.length) + FACTOR_TARGETS.length) % FACTOR_TARGETS.length];
  const strip = mode === "factor" ? rows(target.map((v) => Math.max(0, v)) as typeof target, target.map((v) => Math.max(0, -v)) as typeof target, 38) : null;
  const su = strip ? Math.min(12, MAT.w / 38) : 0;
  const stripH = strip ? strip.h * su + 16 : 0;
  const room = { x: MAT.x, y: MAT.y + stripH, w: MAT.w, h: MAT.h };
  const r = rectangle(f);
  const [rw, rh] = [Math.max(r.w, 2), Math.max(r.h, 2)];
  const u = Math.min(40, room.w / (rw + 1.8), room.h / (rh + 1.8));
  const ox = room.x + 1.5 * u + (room.w - (rw + 1.5) * u) / 2;
  const oy = room.y + 1.5 * u + (room.h - (rh + 1.5) * u) / 2;
  /** The side a point is over: the band above the rectangle, or the one left of it. */
  const zone = (x: number, y: number): Side | null => {
    if (x < room.x - 4 || x > room.x + room.w || y < room.y - 4 || y > room.y + room.h) return null;
    if (y < oy - 2 && x >= ox - 0.7 * u) return 0;
    if (x < ox - 2 && y >= oy - 0.7 * u) return 1;
    return null;
  };
  const setF = (next: Factors) => set({ ...state, f: next });
  const addTo = (s: Side, p: SidePiece, x: number, y: number) => {
    const [, b, , d] = f;
    const ones = s === 0 ? b : d;
    if ((p === "one" && ones < 0) || (p === "neg" && ones > 0)) pop([{ kind: "one", neg: false, x, y, w: 0, h: 0, zero: true }]);
    setF(sideAdd(f, s, p));
  };

  const { drag, begin, svgProps } = useDrag<Drag>((d) => {
    if (d.from === "box") {
      setPicked(d.moved ? tiles.filter((t) => inBox(boxOf(d), ...centre(t))).map((t) => t.id) : []);
      return;
    }
    if (d.from === "mat") {
      const own = tiles.filter((t) => d.ids.includes(t.id));
      if (!d.moved || d.x < OFF_X) {
        pop((d.moved ? flying(d) : own).map(ghostOf));
        setPicked([]);
        return putTiles(tiles.filter((t) => !d.ids.includes(t.id)));
      }
      if (!onTileMat(d.x, d.y)) return;
      const moved = flying(d);
      const hits = cancels(moved, tiles.filter((t) => !d.ids.includes(t.id)));
      const goneIds = hits.flatMap(([m, t]) => [m.id, t.id]);
      const placed = new Map(moved.map((t) => [t.id, { ...t, ...keepTileOn(t.kind, t.x, t.y) }]));
      pop(zeroPops(hits));
      setPicked(picked.filter((id) => !goneIds.includes(id)));
      return putTiles(tiles.filter((t) => !goneIds.includes(t.id)).map((t) => placed.get(t.id) ?? t));
    }
    if (d.from === "tray") {
      if (!d.moved) return putOne(d.kind, d.neg);
      if (!onTileMat(d.x, d.y)) return;
      const [t] = flying(d);
      const hits = cancels([t], tiles);
      pop(zeroPops(hits));
      if (hits.length) return putTiles(tiles.filter((m) => m.id !== hits[0][1].id));
      return putTiles([...tiles, { ...t, ...keepTileOn(t.kind, t.x, t.y) }], { next: state.next + 1 });
    }
    if (d.from === "sideTray") {
      if (!d.moved) return addTo(0, d.piece, ox + r.w * u, oy - u);
      const s = zone(d.x, d.y);
      if (s !== null) addTo(s, d.piece, d.x, d.y);
      return;
    }
    // A side's own tile: a tap or a drag off takes it away, a drag onto the other side moves it there.
    const s = d.moved ? zone(d.x, d.y) : null;
    if (s === d.s) return;
    const off = sideTake(f, d.s, d.piece);
    if (s === null) return setF(off);
    const ones = d.s === 0 ? f[1] : f[3];
    setF(sideAdd(off, s, d.piece === "x" ? "x" : ones < 0 ? "neg" : "one"));
  });
  function centre(t: MatTile): [number, number] {
    const [tw, th] = tileSize(t.kind);
    return [t.x + tw / 2, t.y + th / 2];
  }

  const press = (e: ReactPointerEvent, d: Drag) => begin(e, d);
  const inFlight = flying(drag);
  const overMat = !!drag?.moved && (drag.from === "tray" || drag.from === "mat") && onTileMat(drag.x, drag.y);
  const overBin = !!drag?.moved && (drag.from === "mat" || drag.from === "side") && drag.x < OFF_X;
  const flightIds = drag?.from === "mat" && drag.moved ? drag.ids : [];
  const landing = overMat ? cancels(inFlight, tiles.filter((t) => !flightIds.includes(t.id))) : [];
  const landed = new Set(landing.map(([, t]) => t.id));
  const box = drag?.from === "box" && drag.moved ? boxOf(drag) : null;
  const sel = new Set(box ? tiles.filter((t) => inBox(box, ...centre(t))).map((t) => t.id) : picked);
  const hoverSide = drag?.moved && (drag.from === "sideTray" || drag.from === "side") ? zone(drag.x, drag.y) : null;

  /** A tray's pile, drawn small, to drag a tile out of or tap. */
  const tray = (key: string, x: number, y: number, kind: TileKind, isNeg: boolean, onPress: (e: ReactPointerEvent) => void, onKey: () => void, off: boolean, name: string, tu = TRAY_U) => {
    const [tw, th] = tileSize(kind).map((v) => (v * tu) / 20);
    return (
      <g key={key} role="button" tabIndex={0} aria-label={fill(w.tray, { t: name })} opacity={off ? 0.35 : 1}
        style={{ cursor: off ? "not-allowed" : "grab" }} onPointerDown={(e) => !off && onPress(e)} onKeyDown={(e) => keyTap(e, onKey)}>
        <title>{fill(w.tray, { t: name })}</title>
        <rect x={x - 4} y={y - 4} width={tw + 12} height={th + 12} fill="transparent" />
        {[2, 0].map((k) => <g key={k} transform={`translate(${x + k} ${y + k})`}><TileShape kind={kind} neg={isNeg} w={tw} h={th} /></g>)}
      </g>
    );
  };

  let picture;
  let trays;
  let corner = null;
  if (mode === "combine") {
    const z = zeroPairs(pos, neg);
    lines.push({ text: fill(w.onMat, { e: matText(pos, neg) }), tone: "main" });
    if (z.some(Boolean)) lines.push({ text: fill(w.cancel, { e: poly(net(pos, neg)) }), tone: "note" });
    lines.push({ text: w.hints.combine, tone: "note" });
    picture = (
      <>
        <rect x={MAT.x} y={MAT.y} width={MAT.w} height={MAT.h} rx={12} fill={overMat && drag?.from === "tray" ? "#f1f8ff" : "#f8f9fa"}
          stroke={overMat && drag?.from === "tray" ? BLUE : "#dee2e6"} style={{ cursor: "crosshair" }}
          onPointerDown={(e) => press(e, { from: "box" })} />
        {!tiles.length && <text x={MAT.x + MAT.w / 2} y={MAT.y + MAT.h / 2} fontSize={16} textAnchor="middle" fill="#868e96" pointerEvents="none">{w.empty}</text>}
        {tiles.map((t) => {
          const [tw, th] = tileSize(t.kind);
          const fly = flightIds.includes(t.id);
          return (
            <g key={t.id} className={fly ? undefined : "chip-move"} style={{ ...at(t.x, t.y), cursor: "grab" }} opacity={fly ? 0.25 : 1}
              role="button" aria-label={fill(w.take, { t: label(t.kind, t.neg) })} onPointerDown={(e) => press(e, { from: "mat", ids: picked.includes(t.id) ? picked : [t.id] })}>
              <TileShape kind={t.kind} neg={t.neg} w={tw} h={th} ring={landed.has(t.id) ? GREEN : sel.has(t.id) ? BLUE : undefined} />
            </g>
          );
        })}
        {box && <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#1971c214" stroke={BLUE} strokeDasharray="5 4" pointerEvents="none" />}
      </>
    );
    trays = TILE_KINDS.flatMap((kind, k) => [false, true].map((isNeg) => {
      const y = [MAT.y + 4, MAT.y + 72, MAT.y + 166][k];
      return tray(`${kind}${isNeg}`, isNeg ? 80 : 16, y, kind, isNeg,
        (e) => { setPicked([]); press(e, { from: "tray", kind, neg: isNeg }); }, () => putOne(kind, isNeg), full(kind, isNeg),
        `${isNeg ? "−" : "+"}${NAME[kind]}`, kind === "x2" ? TRAY_U : 24);
    }));
    if (tiles.length) corner = <Pill x={W - 16 - 100} y={TAB_Y} w={100} h={28} size={14} text={w.lineUp} title={w.lineUpTitle} onTap={() => putTiles(lineUp(tiles))} />;
  } else {
    const made = product(f);
    const empty = (!f[0] && !f[1]) || (!f[2] && !f[3]);
    const sides = { a: side(f[0], f[1]), b: side(f[2], f[3]) };
    if (mode === "multiply") {
      lines.push({ text: fill(w.times, { ...sides, parts: partsText(f) }), tone: "main" });
      lines.push({ text: `= ${poly(made)}`, tone: "main" });
      lines.push({ text: w.hints.multiply, tone: "note" });
    } else {
      const solved = same(made, target);
      lines.push({ text: fill(w.make, { e: poly(target) }), tone: "main" });
      lines.push(solved ? { text: fill(w.solved, { e: poly(target), ...sides }), tone: "solved" } : { text: fill(w.yours, { e: empty ? "0" : poly(made) }), tone: "note" });
      if (!solved) lines.push({ text: w.hints.factor, tone: "note" });
    }
    const sideName = (s: Side) => (s === 0 ? w.top : w.left);
    const sideKey = (e: KeyboardEvent, s: Side) => {
      const p = ({ x: "x", X: "x", "1": "one", "+": "one", "-": "neg", "−": "neg" } as Record<string, SidePiece>)[e.key];
      if (p) {
        e.preventDefault();
        return setF(sideAdd(f, s, p));
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setF(sideTake(f, s, f[s === 0 ? 1 : 3] ? "one" : "x"));
      }
    };
    const rail = (s: Side) => {
      const hot = hoverSide === s;
      const [x, y, rwPx, rhPx] = s === 0 ? [ox, oy - 1.3 * u - 2, room.x + room.w - ox, 1.3 * u - 2] : [ox - 1.3 * u - 2, oy, 1.3 * u - 2, room.y + room.h - oy];
      return (
        <g key={`rail${s}`} role="group" tabIndex={0} onKeyDown={(e) => sideKey(e, s)}
          aria-label={fill(w.rail, { s: sideName(s), e: s === 0 ? sides.a : sides.b })}>
          <rect x={x} y={y} width={Math.max(0, rwPx)} height={Math.max(0, rhPx)} rx={6} fill={hot ? "#e7f5ff" : "#f8f9fa"} stroke={hot ? BLUE : "#ced4da"}
            strokeDasharray={hot ? undefined : "5 4"} />
        </g>
      );
    };
    const sideTile = (t: (typeof r.top)[number], s: Side, i: number) => {
      const piece = t.kind === "x" ? "x" : "one";
      const fly = drag?.moved && drag.from === "side" && drag.s === s && drag.piece === piece;
      return (
        <g key={`${s}-${i}`} role="button" aria-label={fill(w.sideTile, { t: label(t.kind, t.neg), s: sideName(s) })} style={{ cursor: "grab" }}
          opacity={fly ? 0.5 : 1} onPointerDown={(e) => press(e, { from: "side", s, piece })} transform={`translate(${ox + t.x * u} ${oy + t.y * u})`}>
          <TileShape kind={t.kind} neg={t.neg} w={t.w * u} h={t.h * u} />
        </g>
      );
    };
    picture = (
      <>
        {strip && strip.tiles.map((t, i) => (
          <g key={`s${i}`} transform={`translate(${MAT.x + t.x * su} ${MAT.y + t.y * su})`}><TileShape kind={t.kind} neg={t.neg} w={t.w * su} h={t.h * su} /></g>
        ))}
        {rail(0)}
        {rail(1)}
        {r.top.map((t, i) => sideTile(t, 0, i))}
        {r.left.map((t, i) => sideTile(t, 1, i))}
        {empty ? (
          <text x={ox + 8} y={oy + 26} fontSize={15} fill="#868e96" pointerEvents="none">{wrapWords(w.noRect, 40).map((l, i) => <tspan key={i} x={ox + 8} dy={i ? 20 : 0}>{l}</tspan>)}</text>
        ) : (
          <>
            {r.tiles.map((t, i) => (
              <g key={`r${i}`} transform={`translate(${ox + t.x * u} ${oy + t.y * u})`} pointerEvents="none"><TileShape kind={t.kind} neg={t.neg} w={t.w * u} h={t.h * u} /></g>
            ))}
            <rect x={ox} y={oy} width={r.w * u} height={r.h * u} fill="none" stroke={INK} strokeWidth={2} pointerEvents="none" />
          </>
        )}
      </>
    );
    const sidePieces: [SidePiece, TileKind, boolean, number][] = [["x", "x", false, MAT.y + 8], ["one", "one", false, MAT.y + 100], ["neg", "one", true, MAT.y + 140]];
    trays = sidePieces.map(([p, kind, isNeg, y]) => tray(p, 50, y, kind, isNeg, (e) => press(e, { from: "sideTray", piece: p }), () => setF(sideAdd(f, 0, p)),
      false, `${isNeg ? "−" : p === "x" ? "" : "+"}${NAME[kind]}`, 24));
    if (mode === "factor") {
      const n = (((state.target % FACTOR_TARGETS.length) + FACTOR_TARGETS.length) % FACTOR_TARGETS.length) + 1;
      corner = (
        <>
          <text x={W - 16 - 120} y={TAB_Y + 19} fontSize={13} textAnchor="end" fill="#868e96">{fill(w.puzzle, { n, m: FACTOR_TARGETS.length })}</text>
          <Pill x={W - 16 - 112} y={TAB_Y} w={112} h={28} size={14} text={`${w.next} ▸`} title={w.next}
            onTap={() => set({ ...state, target: (state.target + 1) % FACTOR_TARGETS.length, f: [1, 0, 1, 0] })} />
        </>
      );
    }
  }

  const drawn = lines.flatMap((l) => wrapWords(l.text, WRAP).map((text) => ({ text, tone: l.tone })));
  const sayY = SAY_Y + stripH;
  const H = sayY + drawn.length * SAY;
  const inTray = drag?.moved && drag.from === "sideTray" ? drag : null;
  return (
    <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="hand-pic" fontFamily={FONT} role="group"
      aria-label={lines.map((l) => l.text).join(". ")} {...svgProps} style={{ touchAction: "none", userSelect: "none" }}>
      <rect width={W} height={H} fill="#fff" />
      <Tabs x={16} y={TAB_Y} keys={TILE_MODES} on={mode} names={w.modes} onPick={(m) => { setPicked([]); set({ ...state, mode: m }); }} />
      {corner}
      {picture}
      {trays}
      <Bin x={BIN.x} y={BIN.y} w={BIN.w} h={BIN.h} hot={overBin} label={w.bin} title={mode === "combine" ? w.binTitle : w.binSides}
        onTap={mode === "combine" ? clearMat : () => setF([0, 0, 0, 0])} />
      {ghosts?.items.map((g, i) =>
        g.zero ? (
          <text key={`${ghosts.id}-${i}`} className="chip-zero" x={g.x + g.w / 2} y={g.y - 6} fontSize={22} fontWeight={700} textAnchor="middle" fill={GREEN}>0</text>
        ) : (
          <g key={`${ghosts.id}-${i}`} style={at(g.x, g.y)}><g className="chip-pop"><TileShape kind={g.kind} neg={g.neg} w={g.w} h={g.h} /></g></g>
        ),
      )}
      {inFlight.map((t) => {
        const [tw, th] = tileSize(t.kind);
        return <g key={`fly${t.id}`} style={at(t.x, t.y)} pointerEvents="none" opacity={0.95}><TileShape kind={t.kind} neg={t.neg} w={tw} h={th} /></g>;
      })}
      {inTray && (() => {
        const kind: TileKind = inTray.piece === "x" ? "x" : "one";
        const [tw, th] = [u, kind === "x" ? (tileSize("x")[1] / 20) * u : u];
        return <g style={at(inTray.x - tw / 2, inTray.y - th / 2)} pointerEvents="none" opacity={0.95}><TileShape kind={kind} neg={inTray.piece === "neg"} w={tw} h={th} /></g>;
      })()}
      {drag?.moved && drag.from === "side" && (() => {
        const kind: TileKind = drag.piece === "x" ? "x" : "one";
        const isNeg = drag.piece === "one" && (drag.s === 0 ? f[1] : f[3]) < 0;
        const along = kind === "x" ? (tileSize("x")[1] / 20) * u : u;
        const [tw, th] = drag.s === 0 ? [along, u] : [u, along];
        return <g style={at(drag.x - tw / 2, drag.y - th / 2)} pointerEvents="none" opacity={0.95}><TileShape kind={kind} neg={isNeg} w={tw} h={th} /></g>;
      })()}
      {drawn.map((l, i) => (
        <text key={i} x={20} y={sayY + i * SAY} fontSize={l.tone === "note" ? 15 : 18} fill={TONE[l.tone].fill} fontWeight={TONE[l.tone].weight}>{l.text}</text>
      ))}
    </svg>
  );
}
