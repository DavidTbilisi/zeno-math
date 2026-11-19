// Tile it: which shapes cover a floor with no gaps and no overlaps. Easy puts copies of one regular polygon round a
// point, one at a time, and asks whether it tiles: the angles drawn at the point add up as they go, a gap shown
// orange and an overlap red, and only a polygon whose angle goes into 360° exactly tiles on its own. Medium fills the
// gap left by polygons already at a point from a palette (triangle, square, hexagon, octagon, twelve-gon), won when
// the angles make 360° exactly; one that would go past it is shown red and costs a star. Hard is the tangram: drag
// the pieces from the tray onto a grey outline, pick one to turn it a quarter or flip it (or move it with the arrow
// keys, R to turn, F to flip), and the outline is made when the pieces cover it exactly, each part once; parts covered
// twice show red. "Why?" steps through the level's idea with a picture and costs no stars.
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  angleOf,
  aroundPoint,
  BOARD,
  cornersOf,
  coverOf,
  degText,
  fullness,
  PALETTE,
  piecesNow,
  polygonAt,
  reachOf,
  sumOf,
  TESSELLATE_LADDER,
  TESSELLATE_NOTICES,
  tessellateNotice,
  tessellateNow,
  tessellateStars,
  tilesAlone,
  type LiveTessellate,
  type PieceKind,
  type Placed,
  type Sides,
} from "../math/tessellate";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { WhySteps } from "./WhySteps";

const FRESH: Partial<LiveTessellate> = { count: 1, added: [], pieces: [], picked: null, misses: 0, done: false, said: null };
const W = 600;
const H = 340;
const [CX, CY] = [300, 172];
/** The space round the point: a polygon reaches at most this far from it. */
const REACH = 150;
const U = 30;
const [GX, GY] = [15, 18];
const RAD = Math.PI / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;
const POLY_FILL = "#d0ebff";
const POLY_LINE = "#1971c2";
const GIVEN_FILL = "#e9ecef";
const GIVEN_LINE = "#495057";
const GAP = "#f08c00";
const OVER = "#e03131";
const PIECE_COLORS: Record<PieceKind, string> = { large: "#4dabf7", medium: "#69db7c", small: "#ffa94d", square: "#f783ac", para: "#b197fc" };

type Why = "point" | "angle" | "divide" | "mix" | "left" | "many" | "area" | "turn" | "corners";

/** A regular polygon at the point as an SVG polygon: corner at the point, its angle there from `from`. */
const polyPoints = (n: number, from: number, s: number) =>
  polygonAt(n, from, s)
    .map(([x, y]) => `${r1(CX + x)},${r1(CY - y)}`)
    .join(" ");
/** A wedge round the point from one angle to another, for a gap or an overlap. */
function wedge(a: number, b: number, r: number) {
  const p = (t: number) => `${r1(CX + r * Math.cos(t * RAD))},${r1(CY - r * Math.sin(t * RAD))}`;
  return `M${CX},${CY} L${p(a)} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 0 ${p(b)} Z`;
}

export function Tessellate({ state: d, set, w: words, svgRef }: PieceProps<"tessellate">) {
  const [w, g] = [words.tessellate, words.game];
  const [explain, setExplain] = useState<number | null>(null);
  // A piece being dragged: which, where the pointer started, and where the piece is now; the board hears the drop.
  const [drag, setDrag] = useState<{ i: number; from: [number, number]; at: Placed; moved: boolean } | null>(null);
  const game = useGame({ key: "zeno.tessellate.v1", size: TESSELLATE_LADDER.length, notices: TESSELLATE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  // An endless outline is laid at random from its seed: work it out once per puzzle, not on every move.
  const { mode, stage, level, seed } = d;
  const task = useMemo(() => tessellateNow({ mode, stage, level, seed }), [mode, stage, level, seed]);
  const stars = tessellateStars(d.misses);
  const winNow = (patch: Partial<LiveTessellate> = {}) =>
    game.win({ stars, clean: d.misses === 0, notice: (streak) => tessellateNotice(task, d.misses, streak), patch: { ...patch, done: true } });

  // ---------- easy: one polygon round a point ----------

  const name = (n: number) => w.names[String(n) as keyof typeof w.names];
  const aloneMax = task.level === 1 ? (tilesAlone(task.n) ? aroundPoint(task.n).fit : aroundPoint(task.n).fit + 1) : 0;
  const claim = (tiles: boolean) => {
    if (task.level !== 1) return;
    if (tiles === tilesAlone(task.n)) return winNow({ count: Math.max(d.count, aroundPoint(task.n).fit) });
    game.miss({ misses: d.misses + 1, said: { kind: "claim", tiles } });
  };

  // ---------- medium: fill the point ----------

  const around: Sides[] = task.level === 2 ? [...task.given, ...d.added] : [];
  const add = (n: Sides) => {
    if (task.level !== 2) return;
    const sum = sumOf([...around, n]);
    const f = fullness(sum);
    if (f === "over") return game.miss({ misses: d.misses + 1, said: { kind: "over", n } });
    if (f === "full") return winNow({ added: [...d.added, n], said: null });
    game.tap({ added: [...d.added, n], said: null });
  };

  // ---------- hard: the tangram ----------

  const pieces = task.level === 3 ? piecesNow(task, d.pieces) : [];
  const shown = drag ? pieces.map((p, i) => (i === drag.i ? drag.at : p)) : pieces;
  const target = task.level === 3 ? new Set(task.target) : new Set<string>();
  const cover = task.level === 3 ? coverOf(shown, target) : null;
  const inBoard = (p: Placed) => {
    const cs = cornersOf(p);
    return cs.every(([x, y]) => x >= 0 && y >= 0 && x <= BOARD.cols && y <= BOARD.rows);
  };
  const putPieces = (next: Placed[], picked: number | null) => {
    if (task.level !== 3) return;
    if (coverOf(next, target).made) return winNow({ pieces: next, picked: null });
    game.tap({ pieces: next, picked, said: null });
  };
  const change = (i: number, patch: Partial<Placed>) => {
    const next = pieces.map((p, j) => (j === i ? { ...p, ...patch } : p));
    if (!inBoard(next[i])) return;
    putPieces(next, i);
  };
  const unit = (e: PointerEvent): [number, number] => {
    const [x, y] = svgRef.current ? svgPoint(svgRef.current, e) : [0, 0];
    return [(x - GX) / U, (y - GY) / U];
  };
  const down = (i: number) => (e: PointerEvent<SVGGElement>) => {
    if (d.done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ i, from: unit(e), at: pieces[i], moved: false });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const [x, y] = unit(e);
    const at = { ...pieces[drag.i], x: pieces[drag.i].x + Math.round(x - drag.from[0]), y: pieces[drag.i].y + Math.round(y - drag.from[1]) };
    if (inBoard(at) && (at.x !== drag.at.x || at.y !== drag.at.y)) setDrag({ ...drag, at, moved: true });
  };
  const up = () => {
    if (!drag) return;
    setDrag(null);
    if (drag.moved) putPieces(pieces.map((p, i) => (i === drag.i ? drag.at : p)), drag.i);
    else game.tap({ pieces, picked: drag.i, said: null });
  };
  const turn = (i: number) => change(i, { rot: (pieces[i].rot + 1) % 4 });
  const flip = (i: number) => change(i, { flip: !pieces[i].flip });
  const key = (i: number) => (e: KeyboardEvent) => {
    const by: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const k = e.key.toLowerCase();
    if (!by[e.key] && k !== "r" && k !== "f" && k !== "enter" && k !== " ") return;
    // The board's own shortcuts (R is its rectangle tool) must not hear the keys that move a piece.
    e.preventDefault();
    e.stopPropagation();
    if (by[e.key]) change(i, { x: pieces[i].x + by[e.key][0], y: pieces[i].y + by[e.key][1] });
    else if (k === "r") turn(i);
    else if (k === "f") flip(i);
    else game.tap({ pieces, picked: i, said: null });
  };

  // ---------- the words ----------

  const sumLine = (ns: readonly number[]) => {
    if (task.level === 1) return `${ns.length} × ${degText(angleOf(task.n))} = ${degText(sumOf(ns))}`;
    return `${ns.map((n) => degText(angleOf(n))).join(" + ")} = ${degText(sumOf(ns))}`;
  };
  const prompt =
    task.level === 1 ? fill(w.prompt.alone, { name: name(task.n) })
    : task.level === 2 ? w.prompt.fill
    : w.prompt.shape[task.name];
  const stepHint = task.level === 1 ? w.aloneHint : task.level === 2 ? w.fillHint : w.shapeHint;
  const why = (): string | null => {
    const s = d.said;
    if (!s || s.kind === "notice") return null;
    if (s.kind === "claim" && task.level === 1) {
      const { fit, gap } = aroundPoint(task.n);
      const a = degText(angleOf(task.n));
      return s.tiles ? fill(w.wrongTiles, { fit, a, sum: degText(fit * angleOf(task.n)), gap: degText(gap) }) : fill(w.wrongNot, { fit, a });
    }
    if (s.kind === "over" && task.level === 2) {
      const sum = sumOf([...around, s.n]);
      return fill(w.over, { name: name(s.n), a: degText(angleOf(s.n)), sum: degText(sum), by: degText(sum - 360), gap: degText(360 - sumOf(around)) });
    }
    return null;
  };
  const doneText = (): string => {
    const st = starText(stars);
    if (task.level === 1) {
      const { fit, gap } = aroundPoint(task.n);
      const a = degText(angleOf(task.n));
      return tilesAlone(task.n) ? fill(w.rightTiles, { fit, a, name: name(task.n), stars: st }) : fill(w.rightNot, { fit, a, sum: degText(fit * angleOf(task.n)), gap: degText(gap), name: name(task.n), stars: st });
    }
    if (task.level === 2) return fill(w.rightFill, { sum: sumLine(around).replace(/ = .*$/, ""), stars: st });
    return fill(w.rightShape, { stars: st });
  };
  const doneLine = `${doneText()}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = why();
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : said ? { tone: "wrong", text: `${said} ${stepHint}` }
    : { tone: "hint", text: stepHint };
  const whys: Why[] = task.level === 1 ? ["point", "angle", "divide"] : task.level === 2 ? ["mix", "left", "many"] : ["area", "turn", "corners"];

  // ---------- the picture ----------

  const label = (x: number, y: number, s: string, color: string, size = 14, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={r1(x)} y={r1(y)} fontSize={size} fontWeight={700} textAnchor={anchor} fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {s}
    </text>
  );
  /** Polygons round the point, each starting where the one before ends; the last past 360° drawn red. */
  const roundPoint = (ns: readonly Sides[], given: number, s: number, ghost: Sides | null) => {
    let from = 0;
    const out = ns.map((n, i) => {
      const a = angleOf(n);
      const over = from + a > 360 + 1e-9;
      const el = (
        <polygon
          key={i}
          points={polyPoints(n, from, s)}
          fill={over ? OVER : i < given ? GIVEN_FILL : POLY_FILL}
          fillOpacity={over ? 0.35 : 0.9}
          stroke={over ? OVER : i < given ? GIVEN_LINE : POLY_LINE}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );
      const mid = from + a / 2;
      const tag = label(CX + 30 * Math.cos(mid * RAD), CY - 30 * Math.sin(mid * RAD) + 5, degText(a), over ? OVER : "#1e1e1e", 11);
      from += a;
      return (
        <g key={i}>
          {el}
          {tag}
        </g>
      );
    });
    const sum = sumOf(ns);
    const ghostEl = ghost && <polygon points={polyPoints(ghost, sum, s)} fill={OVER} fillOpacity={0.25} stroke={OVER} strokeWidth={2} strokeDasharray="6 4" />;
    const gap = sum < 360 - 1e-9 && <path d={wedge(sum, 360, 46)} fill={GAP} fillOpacity={0.3} stroke={GAP} strokeWidth={1.5} />;
    const over = sum > 360 + 1e-9 && <path d={wedge(360, sum, 46)} fill={OVER} fillOpacity={0.45} stroke={OVER} strokeWidth={1.5} />;
    return (
      <>
        {out}
        {ghostEl}
        {gap}
        {over}
        <circle cx={CX} cy={CY} r={4} fill="#1e1e1e" />
      </>
    );
  };
  const tagOf = (sum: number) => {
    const f = fullness(sum);
    const text = f === "full" ? w.fullTag : fill(f === "gap" ? w.gapTag : w.overTag, { g: degText(Math.abs(360 - sum)) });
    return label(16, 30, text, f === "full" ? "#2f9e44" : f === "gap" ? GAP : OVER, 16, "start");
  };

  const quarter = (k: string) => {
    const [x, y, q] = k.split(",").map(Number);
    const [x0, y0] = [GX + x * U, GY + y * U];
    const c = `${x0 + U / 2},${y0 + U / 2}`;
    const corners = [`${x0},${y0}`, `${x0 + U},${y0}`, `${x0 + U},${y0 + U}`, `${x0},${y0 + U}`];
    return `${c} ${corners[q]} ${corners[(q + 1) % 4]}`;
  };
  const piece = (p: Placed, i: number) => {
    const pts = cornersOf(p)
      .map(([x, y]) => `${GX + x * U},${GY + y * U}`)
      .join(" ");
    const picked = d.picked === i && !d.done;
    return (
      <g
        key={i}
        role="button"
        tabIndex={d.done ? -1 : 0}
        aria-label={`${w.pieces[p.kind]} ${i + 1}`}
        aria-pressed={picked}
        className="tess-piece"
        style={{ cursor: d.done ? "default" : "grab" }}
        onPointerDown={down(i)}
        onPointerMove={move}
        onPointerUp={up}
        onKeyDown={key(i)}
      >
        <polygon points={pts} fill={PIECE_COLORS[p.kind]} fillOpacity={0.85} stroke={picked ? "#1e1e1e" : "#fff"} strokeWidth={picked ? 3 : 1.5} strokeLinejoin="round" />
      </g>
    );
  };

  const shapeS = (ns: readonly number[]) => REACH / Math.max(...ns.map(reachOf));
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={prompt} style={{ touchAction: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {task.level === 1 && (
            <>
              {roundPoint(Array<Sides>(d.count).fill(task.n), 0, shapeS([task.n]), null)}
              {tagOf(sumOf(Array<Sides>(d.count).fill(task.n)))}
              {label(16, 54, sumLine(Array<Sides>(d.count).fill(task.n)), "#1e1e1e", 14, "start")}
            </>
          )}
          {task.level === 2 && (
            <>
              {roundPoint(around, task.given.length, shapeS([...PALETTE]), d.said?.kind === "over" ? d.said.n : null)}
              {tagOf(sumOf(around))}
              {label(16, 54, sumLine(around), "#1e1e1e", 14, "start")}
            </>
          )}
          {task.level === 3 && cover && (
            <>
              <g stroke="#f1f3f5" strokeWidth={1}>
                {Array.from({ length: BOARD.cols + 1 }, (_, x) => <line key={`x${x}`} x1={GX + x * U} y1={GY} x2={GX + x * U} y2={GY + BOARD.rows * U} />)}
                {Array.from({ length: BOARD.rows + 1 }, (_, y) => <line key={`y${y}`} x1={GX} y1={GY + y * U} x2={GX + BOARD.cols * U} y2={GY + y * U} />)}
              </g>
              <line x1={GX + (BOARD.trayFrom - 0.5) * U} y1={GY} x2={GX + (BOARD.trayFrom - 0.5) * U} y2={GY + BOARD.rows * U} stroke="#ced4da" strokeDasharray="6 5" />
              <g fill="#adb5bd" stroke="#adb5bd" strokeWidth={0.6}>
                {task.target.map((k) => <polygon key={k} points={quarter(k)} />)}
              </g>
              {shown.map(piece)}
              <g fill={OVER} fillOpacity={0.55} pointerEvents="none">
                {cover.twice.map((k) => <polygon key={k} points={quarter(k)} />)}
              </g>
              {label(GX, H - 8, fill(w.coverTag, { n: cover.covered, of: task.target.length }), cover.made ? "#2f9e44" : "#495057", 13, "start")}
            </>
          )}
        </svg>
      </Stage>
      {explain !== null && (
        <WhySteps at={explain} of={whys.length} text={w.whyText[whys[explain]]} back={w.whyBack} next={w.whyNext} onStep={setExplain} picture={<TilePicture step={whys[explain]} />} />
      )}
      {!d.done && task.level === 2 && (
        <div className="live-bar" role="group" aria-label={w.paletteLabel}>
          {PALETTE.map((n) => (
            <button key={n} className="live-btn" onClick={() => add(n)}>
              <svg width={18} height={18} viewBox="-10 -10 20 20" aria-hidden style={{ verticalAlign: "-4px", marginRight: 4 }}>
                <polygon points={Array.from({ length: n }, (_, k) => `${r1(8 * Math.cos((2 * Math.PI * k) / n - Math.PI / 2))},${r1(8 * Math.sin((2 * Math.PI * k) / n - Math.PI / 2))}`).join(" ")} fill={POLY_FILL} stroke={POLY_LINE} strokeWidth={1.5} />
              </svg>
              {name(n)}
            </button>
          ))}
        </div>
      )}
      <GameActions game={game} g={g} done={d.done} always>
        {!d.done && task.level === 1 && (
          <>
            <button className="live-btn" disabled={d.count >= aloneMax} onClick={() => game.tap({ count: d.count + 1, said: null })}>
              ➕ {w.more}
            </button>
            <button className="live-btn" disabled={d.count <= 1} onClick={() => game.tap({ count: d.count - 1, said: null })}>
              ➖ {w.fewer}
            </button>
            <button className="live-btn on" onClick={() => claim(true)}>
              ✓ {w.tiles}
            </button>
            <button className="live-btn on" onClick={() => claim(false)}>
              ✗ {w.notTiles}
            </button>
          </>
        )}
        {!d.done && task.level === 2 && (
          <button className="live-btn" disabled={d.added.length === 0} onClick={() => game.tap({ added: d.added.slice(0, -1), said: null })}>
            ↩ {w.takeBack}
          </button>
        )}
        {!d.done && task.level === 3 && (
          <>
            <button className="live-btn" disabled={d.picked === null} onClick={() => d.picked !== null && turn(d.picked)}>
              ⟳ {w.turn}
            </button>
            <button className="live-btn" disabled={d.picked === null} onClick={() => d.picked !== null && flip(d.picked)}>
              ⇋ {w.flip}
            </button>
          </>
        )}
        <button className={`live-btn${explain !== null ? " on" : ""}`} aria-pressed={explain !== null} onClick={() => setExplain(explain !== null ? null : 0)}>
          💡 {w.why}
        </button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** The explanation's pictures: polygons round a point, an angle, or two pieces making one shape. */
function TilePicture({ step }: { step: Why }) {
  const [cx, cy] = [56, 60];
  const at = (n: number, from: number, s: number, color: string) => (
    <polygon
      key={`${n}-${from}`}
      points={polygonAt(n, from, s)
        .map(([x, y]) => `${r1(cx + x)},${r1(cy - y)}`)
        .join(" ")}
      fill={color}
      stroke="#1971c2"
      strokeWidth={1.2}
    />
  );
  const ring = (ns: number[], s: number) => {
    let from = 0;
    return ns.map((n, i) => {
      const el = at(n, from, s, i % 2 ? "#a5d8ff" : "#d0ebff");
      from += angleOf(n);
      return el;
    });
  };
  const say = (lines: string[]) =>
    lines.map((s, i) => (
      <text key={s} x={136} y={60 + (i - (lines.length - 1) / 2) * 22} fontSize={11} fontWeight={700} textAnchor="middle" fill="#1e1e1e">
        {s}
      </text>
    ));
  const tri = (pts: [number, number][], color: string) => <polygon points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill={color} stroke="#fff" strokeWidth={1.5} />;
  const body =
    step === "point" ? <>{ring([4, 4, 4, 4], 28)}{say(["4 × 90°", "= 360°"])}</>
    : step === "angle" ? <>{at(5, 0, 26, "#d0ebff")}{say(["180° − 360°/5", "= 108°"])}</>
    : step === "divide" ? <>{ring([5, 5, 5], 24)}<path d={`M${cx},${cy} L${cx + 30},${cy} A30,30 0 0 0 ${r1(cx + 30 * Math.cos(-36 * RAD))},${r1(cy - 30 * Math.sin(-36 * RAD))} Z`} fill={GAP} fillOpacity={0.4} />{say(["3 × 108° = 324°", "gap 36°"])}</>
    : step === "mix" ? <>{ring([8, 8, 4], 20)}{say(["135° + 135° + 90°", "= 360°"])}</>
    : step === "left" ? <>{ring([12], 14)}{say(["360° − 150°", "= 210° to fill"])}</>
    : step === "many" ? <>{ring([12, 3, 12], 14)}{say(["210° = 60° + 150°", "= 90° + 120°"])}</>
    : step === "area" ? <>{tri([[20, 30], [80, 30], [50, 60]], PIECE_COLORS.small)}{tri([[20, 30], [50, 60], [20, 90]], PIECE_COLORS.small)}{say(["1 + 1 = 2:", "a medium triangle"])}</>
    : step === "turn" ? <>{tri([[20, 40], [60, 40], [40, 60]], PIECE_COLORS.small)}<text x={70} y={56} fontSize={18}>⟳</text>{tri([[90, 30], [90, 70], [70, 50]], PIECE_COLORS.small)}{say(["a quarter", "turn"])}</>
    : <>{tri([[20, 90], [80, 90], [20, 30]], PIECE_COLORS.medium)}{say(["90° corner:", "a right angle"])}</>;
  return (
    <svg width={196} height={112} viewBox="0 0 196 112" aria-hidden fontFamily={FONT} style={{ flex: "none" }}>
      <rect width={196} height={112} rx={6} fill="#fff" />
      {body}
    </svg>
  );
}
