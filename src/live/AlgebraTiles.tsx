// Algebra tiles on the board: x² a big square, x a long rod, 1 a small square, red when negative. Combine puts tiles
// out and takes zero pairs away (drag a tile onto its negative and the two pop, or take every pair at once); multiply draws (ax + b)(cx + d) as a rectangle with the sides along its edges;
// factor asks for the sides whose rectangle uses exactly a trinomial's tiles. The tiles come from
// src/math/algebraTiles.ts.
import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  clampFactors, FACTOR_TARGETS, matText, net, ONE_RANGE, partsText, poly, product, rectangle, removePairs, rows, same,
  side, TILE_CAP, TILE_KINDS, TILE_MODES, X_RANGE, zeroPairs, type Counts, type Tile, type TileKind,
} from "../math/algebraTiles";
import { usePops } from "./pops";
import { fill, FONT, INK, Stepper, svgPoint, Toggle, type PieceProps } from "./ui";

const W = 640;
const PAD = 20;
const PIC_TOP = 20;
const PIC_W = W - 2 * PAD;
const PIC_H = 400;
const COLORS: Record<TileKind | "neg", { fill: string; stroke: string }> = {
  x2: { fill: "#a5d8ff", stroke: "#1971c2" },
  x: { fill: "#b2f2bb", stroke: "#2f9e44" },
  one: { fill: "#ffec99", stroke: "#f08c00" },
  neg: { fill: "#ffc9c9", stroke: "#e03131" },
};
const NAME: Record<TileKind, string> = { x2: "x²", x: "x", one: "1" };

type Drag = { i: number; x0: number; y0: number; dx: number; dy: number; moved: boolean };

/** One tile at scale u from (ox, oy); dashed when it is half of a zero pair, ringed when a dragged tile would cancel it. */
function TileRect({ t, u, ox, oy, dashed, ring, onClick, onPointerDown, label, className, opacity }: {
  t: Tile; u: number; ox: number; oy: number; dashed?: boolean; ring?: boolean; onClick?: () => void;
  onPointerDown?: (e: ReactPointerEvent) => void; label?: string; className?: string; opacity?: number;
}) {
  const c = COLORS[t.neg ? "neg" : t.kind];
  const [x, y, w, h] = [ox + t.x * u, oy + t.y * u, t.w * u, t.h * u];
  const text = `${t.neg ? "−" : ""}${NAME[t.kind]}`;
  const size = Math.min(w, h) * 0.55;
  const active = onClick || onPointerDown;
  return (
    <g className={className} opacity={opacity} style={active ? { cursor: onPointerDown ? "grab" : "pointer" } : undefined} onClick={onClick} onPointerDown={onPointerDown}
      aria-label={label} role={active ? "button" : undefined}>
      {ring && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={6} fill="none" stroke="#2f9e44" strokeWidth={3} />}
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={Math.min(4, u / 6)} fill={c.fill} stroke={c.stroke} strokeWidth={2} strokeDasharray={dashed ? "5 3" : undefined} />
      {size >= 9 && (
        <text x={x + w / 2} y={y + h / 2 + size * 0.36} fontSize={Math.min(size, 20)} textAnchor="middle" fill={c.stroke} fontWeight={700} pointerEvents="none">{text}</text>
      )}
    </g>
  );
}

export function AlgebraTiles({ state, set, w: words, svgRef }: PieceProps<"algebraTiles">) {
  const w = words.algebraTiles;
  const { mode, pos, neg } = state;
  const f = clampFactors(state.f);
  const lines: string[] = [];
  /** Whether the last line is a solved puzzle (drawn green). */
  let solved = false;
  let picture: ReactNode;
  let bar: ReactNode;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghosts, pop] = usePops<{ t: Tile; u: number; zero?: boolean }>();
  /** The picture's own pointer handlers: a drag in combine. */
  let svgOn: { onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void; onPointerUp?: () => void; onPointerCancel?: () => void } = {};

  if (mode === "combine") {
    const pairs = zeroPairs(pos, neg);
    const { tiles, h } = rows(pos, neg, 16);
    const u = Math.min(30, PIC_W / 16, PIC_H / Math.max(h, 1));
    // The first tiles of each kind on either side are the ones in pairs.
    const seen = { pos: [0, 0, 0], neg: [0, 0, 0] };
    const paired = tiles.map((t) => {
      const k = TILE_KINDS.indexOf(t.kind);
      return (t.neg ? seen.neg : seen.pos)[k]++ < pairs[k];
    });
    const dragged = drag?.moved ? tiles[drag.i] : null;
    // The tile a dragged one is over, if it is the same kind with the other sign: dropped there, the two cancel.
    const target = dragged && drag
      ? tiles.findIndex((t, j) => {
          const [cx, cy] = [(dragged.x + dragged.w / 2) * u + drag.dx, (dragged.y + dragged.h / 2) * u + drag.dy];
          return j !== drag.i && t.kind === dragged.kind && t.neg !== dragged.neg && cx >= t.x * u && cx <= (t.x + t.w) * u && cy >= t.y * u && cy <= (t.y + t.h) * u;
        })
      : -1;
    const counts = (t: Tile, by: number) => {
      const k = TILE_KINDS.indexOf(t.kind);
      const next = (t.neg ? [...neg] : [...pos]) as Counts;
      next[k] += by;
      return t.neg ? { neg: next } : { pos: next };
    };
    const press = (e: ReactPointerEvent, i: number) => {
      if (e.button !== 0) return;
      const svg = (e.currentTarget as SVGElement).ownerSVGElement;
      if (!svg) return;
      svg.setPointerCapture(e.pointerId);
      const [x, y] = svgPoint(svg, e);
      setDrag({ i, x0: x, y0: y, dx: 0, dy: 0, moved: false });
    };
    const up = () => {
      if (!drag) return;
      setDrag(null);
      const t = tiles[drag.i];
      if (!drag.moved) return set({ ...state, ...counts(t, -1) });
      if (target < 0) return;
      const other = tiles[target];
      pop([{ t: other, u }, { t: { ...t, x: other.x + 0.25, y: other.y + 0.25 }, u }, { t: other, u, zero: true }]);
      const k = TILE_KINDS.indexOf(t.kind);
      set({ ...state, pos: pos.map((p, j) => (j === k ? p - 1 : p)) as Counts, neg: neg.map((n, j) => (j === k ? n - 1 : n)) as Counts });
    };
    svgOn = {
      onPointerMove: (e) => {
        if (!drag) return;
        const [x, y] = svgPoint(e.currentTarget, e);
        const [dx, dy] = [x - drag.x0, y - drag.y0];
        setDrag({ ...drag, dx, dy, moved: drag.moved || Math.hypot(dx, dy) > 5 });
      },
      onPointerUp: up,
      onPointerCancel: up,
    };
    picture = tiles.length ? (
      <>
        {tiles.map((t, i) => (
          <TileRect key={i} t={t} u={u} ox={PAD} oy={PIC_TOP} dashed={paired[i]} ring={i === target} opacity={dragged && drag?.i === i ? 0.25 : 1}
            onPointerDown={(e) => press(e, i)} label={fill(w.take, { t: `${t.neg ? "−" : ""}${NAME[t.kind]}` })} />
        ))}
        {ghosts?.items.map((g, i) =>
          g.zero ? (
            <text key={`${ghosts.id}-${i}`} className="chip-zero" x={PAD + (g.t.x + g.t.w / 2) * g.u} y={PIC_TOP + g.t.y * g.u - 6} fontSize={22} fontWeight={700} textAnchor="middle" fill="#2f9e44">0</text>
          ) : (
            <TileRect key={`${ghosts.id}-${i}`} className="chip-pop" t={g.t} u={g.u} ox={PAD} oy={PIC_TOP} />
          ),
        )}
        {dragged && drag && (
          <g pointerEvents="none" transform={`translate(${drag.dx} ${drag.dy})`}><TileRect t={dragged} u={u} ox={PAD} oy={PIC_TOP} /></g>
        )}
      </>
    ) : (
      <text x={W / 2} y={PIC_TOP + PIC_H / 2} fontSize={18} textAnchor="middle" fill="#868e96">{w.empty}</text>
    );
    const takePairs = () => {
      pop(tiles.flatMap((t, i) => (paired[i] ? [{ t, u }] : [])));
      set({ ...state, ...removePairs(pos, neg) });
    };
    lines.push(fill(w.onMat, { e: matText(pos, neg) }));
    if (pairs.some(Boolean)) lines.push(fill(w.cancel, { e: poly(net(pos, neg)) }));
    const add = (k: number, isNeg: boolean) => {
      const next = (isNeg ? [...neg] : [...pos]) as Counts;
      next[k] = Math.min(TILE_CAP[k], next[k] + 1);
      set({ ...state, ...(isNeg ? { neg: next } : { pos: next }) });
    };
    bar = (
      <div className="live-bar">
        {[false, true].flatMap((isNeg) =>
          TILE_KINDS.map((kind, k) => {
            const label = `${isNeg ? "−" : "+"}${NAME[kind]}`;
            return (
              <button key={label} className="live-btn" style={{ color: COLORS[isNeg ? "neg" : kind].stroke, fontWeight: 700 }} disabled={(isNeg ? neg : pos)[k] >= TILE_CAP[k]}
                title={fill(w.put, { t: `${isNeg ? "−" : ""}${NAME[kind]}` })} aria-label={fill(w.put, { t: `${isNeg ? "−" : ""}${NAME[kind]}` })} onClick={() => add(k, isNeg)}>
                {label}
              </button>
            );
          }),
        )}
        <button className="live-btn" disabled={!pairs.some(Boolean)} onClick={takePairs}>{w.removePairs}</button>
        <button className="live-btn" onClick={() => set({ ...state, pos: [0, 0, 0], neg: [0, 0, 0] })}>{w.clear}</button>
      </div>
    );
  } else {
    const [a, b, c, d] = f;
    const target = FACTOR_TARGETS[((state.target % FACTOR_TARGETS.length) + FACTOR_TARGETS.length) % FACTOR_TARGETS.length];
    const made = product(f);
    const empty = (!a && !b) || (!c && !d);
    // The factor puzzle's tiles in a strip above the rectangle.
    const strip = mode === "factor" ? rows(target.map((v) => Math.max(0, v)) as Counts, target.map((v) => Math.max(0, -v)) as Counts, 40) : null;
    const su = strip ? Math.min(12, PIC_W / 40) : 0;
    const stripH = strip ? strip.h * su + 18 : 0;
    const r = rectangle(f);
    const u = Math.min(44, PIC_W / (r.w + 1.4), (PIC_H - stripH) / (r.h + 1.4));
    // Centred in the room left, with the sides (1.3 tiles) outside its top and left edges.
    const ox = PAD + (PIC_W - (r.w + 1.3) * u) / 2 + 1.3 * u;
    const oy = PIC_TOP + stripH + (PIC_H - stripH - (r.h + 1.3) * u) / 2 + 1.3 * u;
    picture = (
      <>
        {strip && strip.tiles.map((t, i) => <TileRect key={`s${i}`} t={t} u={su} ox={PAD} oy={PIC_TOP} />)}
        {empty ? (
          <text x={W / 2} y={PIC_TOP + stripH + (PIC_H - stripH) / 2} fontSize={18} textAnchor="middle" fill="#868e96">{w.noRect}</text>
        ) : (
          <>
            {r.top.map((t, i) => <TileRect key={`t${i}`} t={t} u={u} ox={ox} oy={oy} />)}
            {r.left.map((t, i) => <TileRect key={`l${i}`} t={t} u={u} ox={ox} oy={oy} />)}
            {r.tiles.map((t, i) => <TileRect key={`r${i}`} t={t} u={u} ox={ox} oy={oy} />)}
            <rect x={ox} y={oy} width={r.w * u} height={r.h * u} fill="none" stroke={INK} strokeWidth={2} />
          </>
        )}
      </>
    );
    const sides = { a: side(a, b), b: side(c, d) };
    if (mode === "multiply") {
      lines.push(fill(w.times, { ...sides, parts: partsText(f) }));
      lines.push(`= ${poly(made)}`);
    } else {
      lines.push(fill(w.make, { e: poly(target) }));
      solved = same(made, target);
      lines.push(solved ? fill(w.solved, { e: poly(target), ...sides }) : fill(w.yours, { e: empty ? "0" : poly(made) }));
    }
    const setF = (i: number, v: number) => {
      const next = [...f] as typeof f;
      next[i] = v;
      set({ ...state, f: clampFactors(next) });
    };
    const sideBar = (name: string, i: number) => (
      <div className="live-bar">
        <span>{name}</span>
        <Stepper value={f[i]} min={X_RANGE[0]} max={X_RANGE[1]} onChange={(v) => setF(i, v)} less={fill(w.less, { t: "x" })} more={fill(w.more, { t: "x" })} />
        <b>x</b>
        <Stepper value={f[i + 1]} min={ONE_RANGE[0]} max={ONE_RANGE[1]} onChange={(v) => setF(i + 1, v)} less={fill(w.less, { t: "1" })} more={fill(w.more, { t: "1" })} />
        <b>1</b>
        <span className="live-note">{side(f[i], f[i + 1])}</span>
      </div>
    );
    bar = (
      <>
        {sideBar(w.top, 0)}
        {sideBar(w.left, 2)}
        {mode === "factor" && (
          <div className="live-bar">
            <span className="live-note">{fill(w.puzzle, { n: (state.target % FACTOR_TARGETS.length) + 1, m: FACTOR_TARGETS.length })}</span>
            <button className="live-btn" onClick={() => set({ ...state, target: (state.target + 1) % FACTOR_TARGETS.length, f: [1, 0, 1, 0] })}>{w.next}</button>
          </div>
        )}
      </>
    );
  }

  const H = PIC_TOP + PIC_H + 24 + lines.length * 28 + 6;
  return (
    <>
      <div className="live-bar">
        {TILE_MODES.map((m) => (
          <Toggle key={m} on={mode === m} onClick={() => set({ ...state, mode: m })}>{w.modes[m]}</Toggle>
        ))}
      </div>
      {bar}
      <p className="live-hint">{w.hints[mode]}</p>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} {...svgOn} style={mode === "combine" ? { touchAction: "none" } : undefined}>
        {picture}
        {lines.map((l, i) => (
          <text key={i} x={PAD} y={PIC_TOP + PIC_H + 24 + i * 28} fontSize={l.length > 60 ? (19 * 60) / l.length : 19} fill={solved && i ? "#2f9e44" : i ? "#495057" : INK} fontWeight={i && !solved ? 400 : 700}>{l}</text>
        ))}
      </svg>
    </>
  );
}
