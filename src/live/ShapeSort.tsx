// Sort the shapes: two overlapping rings, each asking one thing of a shape, and a row of shapes to put where they
// belong. Tap a shape, then tap a ring, the middle where they overlap, or outside; a shape put right stays there, one
// put wrong flashes red and goes back to the row. The middle fills with the shapes that have both properties, which
// is the rule found by hand: a square is a rectangle and a rhombus at once. A board sorted with no misses earns three
// stars; the endless run deals board after board. Built on the game shell (useGame).
import type { PointerEvent } from "react";
import { polySvg } from "../math/shapeKinds";
import { regionOf, SORT_LADDER, SORT_NOTICES, sortNotice, sortNow, sortStars, type LiveSort, type Region } from "../math/shapeSort";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";
import { starText } from "./ladderUi";

const [W, H] = [640, 500];
const R = 150;
const RING = { a: [245, 205], b: [395, 205] } as const;
const TRAY_Y = 392;
const [CARD, SMALL] = [92, 74];
/** Where the shapes put in each place sit, in turn. */
const SLOTS: Record<Region, [number, number][]> = {
  a: [[165, 150], [165, 262], [125, 206], [205, 206]],
  both: [[320, 150], [320, 262], [320, 206]],
  b: [[475, 150], [475, 262], [515, 206], [435, 206]],
  out: [[44, 60], [596, 60], [44, 330], [596, 330]],
};

const FRESH: Partial<LiveSort> = { placed: [], picked: null, misses: 0, said: null };

export function ShapeSort({ state: d, set, w: words, svgRef }: PieceProps<"shapeSort">) {
  const [w, g] = [words.shapeSort, words.game];
  const game = useGame({ key: "zeno.shapesort.v1", size: SORT_LADDER.length, notices: SORT_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { shapes, rings } = sortNow(d);
  const where = shapes.map((_, i) => d.placed[i] ?? null);
  const done = where.every((p) => p !== null);
  const stars = sortStars(d.misses);

  const pick = (i: number) => {
    if (done || where[i]) return;
    set({ ...d, picked: d.picked === i ? null : i, said: null });
  };
  const put = (e: PointerEvent<SVGRectElement>) => {
    if (d.picked === null || done) return;
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const [x, y] = [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H];
    if (y > TRAY_Y - 8) return set({ ...d, picked: null });
    const inA = Math.hypot(x - RING.a[0], y - RING.a[1]) < R;
    const inB = Math.hypot(x - RING.b[0], y - RING.b[1]) < R;
    const to: Region = inA && inB ? "both" : inA ? "a" : inB ? "b" : "out";
    const i = d.picked;
    if (regionOf(shapes[i].pts, rings) !== to) return game.miss({ picked: null, misses: d.misses + 1, said: { kind: "miss", i, to } });
    const placed = shapes.map((_, k) => (k === i ? to : where[k]));
    const all = placed.every((p) => p !== null);
    const notice = (streak: number) => sortNotice(all, d.misses, game.sinceShown(), streak, to === "both");
    if (!all) return game.step({ placed, picked: null }, { notice });
    game.win({ stars, clean: true, notice, patch: { placed, picked: null } });
  };

  /** The shapes in each place so far, in the order they were put there, to give each its slot. */
  const slotOf = (i: number) => {
    const r = where[i]!;
    const k = where.slice(0, i).filter((p) => p === r).length;
    return SLOTS[r][k % SLOTS[r].length];
  };
  const missed = d.said?.kind === "miss" ? d.said.i : null;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]}${done ? ` ${fill(w.done, { stars: starText(stars) })}` : ""}` }
    : done ? { tone: "ok", text: `${fill(w.done, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` }
    : d.said?.kind === "miss" ? { tone: "wrong", text: w.miss }
    : d.picked !== null ? { tone: "prompt", text: w.where }
    : { tone: "hint", text: w.hint };
  let tray = 0;
  return (
    <>
      <GameHead game={game} g={g} words={w}>
        <span className="est-streak">{fill(w.misses, { n: d.misses })}</span>
      </GameHead>
      <Stage game={game} stars={stars} done={done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={W} height={H} fill="#fff" />
          <circle cx={RING.a[0]} cy={RING.a[1]} r={R} fill="#4dabf7" fillOpacity={0.12} stroke="#1971c2" strokeWidth={3} />
          <circle cx={RING.b[0]} cy={RING.b[1]} r={R} fill="#ffa94d" fillOpacity={0.14} stroke="#e8590c" strokeWidth={3} />
          <text x={RING.a[0] - 60} y={36} fontSize={17} fontWeight={700} textAnchor="middle" fill="#1971c2">{w.rings[rings[0]]}</text>
          <text x={RING.b[0] + 60} y={36} fontSize={17} fontWeight={700} textAnchor="middle" fill="#e8590c">{w.rings[rings[1]]}</text>
          <line x1={0} y1={TRAY_Y - 8} x2={W} y2={TRAY_Y - 8} stroke="#dee2e6" strokeWidth={2} />
          {/* The whole board above the row takes the tap that puts the picked shape down. */}
          <rect width={W} height={H} fill="transparent" onPointerDown={put} style={{ cursor: d.picked !== null ? "copy" : "default" }} />
          {shapes.map((s, i) => {
            const placed = where[i];
            const size = placed ? SMALL : CARD;
            const [cx, cy] = placed ? slotOf(i) : [18 + CARD / 2 + tray++ * (CARD + 12), TRAY_Y + CARD / 2 + 4];
            // In the row each shape shows its marks to judge by; once placed, the ring says what it has.
            const pic = polySvg(s.pts, { w: size, h: size, marked: !placed, pad: placed ? 6 : 10, fill: placed ? "#d3f9d8" : "#f1f3f5" });
            const state = placed ? "placed" : d.picked === i ? "picked" : missed === i ? "missed" : "";
            return (
              <g key={i} role="button" aria-label={fill(w.shape, { n: i + 1 })} aria-pressed={state === "picked"} onClick={() => pick(i)} style={{ cursor: placed ? "default" : "pointer", pointerEvents: placed ? "none" : "auto" }}>
                <rect x={cx - size / 2 - 3} y={cy - size / 2 - 3} width={size + 6} height={size + 6} rx={10} fill={placed ? "none" : "#fff"} stroke={state === "picked" ? "#1971c2" : state === "missed" ? "#e03131" : placed ? "none" : "#ced4da"} strokeWidth={state === "picked" || state === "missed" ? 3 : 1.5} />
                <g transform={`translate(${cx - size / 2} ${cy - size / 2})`} dangerouslySetInnerHTML={{ __html: pic.body }} />
              </g>
            );
          })}
          {done && <text x={W / 2} y={TRAY_Y + 50} fontSize={18} textAnchor="middle" fill={INK}>{fill(w.middle, { a: w.rings[rings[0]], b: w.rings[rings[1]] })}</text>}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
