// Make the diagram: the numbers are given, the player draws them — a picture graph (tap where a row's last face goes;
// the left half of a place for half a face when the key is even), a line graph of the temperature (tap or drag an hour's
// point to its height), a pie chart (drag the dots on the edge until each slice is its share of 360°). Arrow keys work
// on every row, point and dot. The parts that are wrong turn orange; as many faces as the number, a point as many
// lines up as degrees, and a slice of as many degrees as children are told what each is worth. Right at the first
// check earns three stars, at the second two. Nine puzzles open in turn, three of each kind, and the endless run keeps
// a streak right at the first check. Built on the game shell (useGame), like the bar chart.
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { hourText } from "../math/dataGraphs";
import { drawnOf, halves, lineGeom, MAKE_LADDER, MAKE_NOTICES, makeNotice, makeNow, makeStars, makeSvg, moveEnd, PIE_STEP, pieChildren, pieEnds, pieGeom, pictoGeom, slipAt, SLOTS, wrongParts, type LiveMakeDiagram } from "../math/makeDiagram";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { CHECK_H, CheckRow } from "./hand";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveMakeDiagram> = { drawn: [], wrong: [], misses: 0, done: false, said: null };

export function MakeDiagram({ state: d, set, w: words, svgRef }: PieceProps<"makeDiagram">) {
  const [w, g] = [words.makeDiagram, words.game];
  const game = useGame({ key: "zeno.makediagram.v1", size: MAKE_LADDER.length, notices: MAKE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const m = makeNow(d);
  const now = drawnOf(m, d.drawn);
  const stars = makeStars(d.misses);
  /** The row, hour or slice end being dragged. */
  const held = useRef(-1);

  /** Part i drawn as `v` (faces, a temperature, a slice's end): a tick on a tap, quiet while dragging. */
  const put = (i: number, v: number, quiet = false) => {
    if (d.done) return;
    const drawn = m.kind === "pie" ? moveEnd(m.t, d.drawn, i, v) : Array.from({ length: Math.max(d.drawn.length, i + 1) }, (_, j) => (j === i ? v : (d.drawn[j] ?? null)));
    if (drawn.every((x, j) => x === d.drawn[j]) && drawn.length === d.drawn.length) return;
    const patch = { drawn, wrong: d.wrong.filter((j) => j !== i && (m.kind !== "pie" || j !== i + 1)), said: null };
    if (quiet) set({ ...d, ...patch });
    else game.tap(patch);
  };
  /** What a pointer at (x, y) asks for: the part it is over, or the one held, and its value. */
  const aim = (x: number, y: number, start: boolean): [number, number] | null => {
    if (m.kind === "picto") {
      const G = pictoGeom(m.t);
      const i = start ? G.rowAt(y) : held.current;
      return i < 0 ? null : [i, G.facesAt(x)];
    }
    if (m.kind === "line") {
      const G = lineGeom(m.t);
      const k = start ? G.colAt(x) : held.current;
      return k < 0 || y > G.foot + 6 ? null : [k, G.valueAt(y)];
    }
    const G = pieGeom();
    const deg = G.angleAt(x, y);
    if (!start) return held.current < 0 ? null : [held.current, deg === 0 ? 360 : deg];
    // The nearest dot within 30° of the pointer, and not too near the middle.
    const ends = pieEnds(m.t, d.drawn).slice(0, -1);
    const a = ((Math.atan2(x - G.cx, G.cy - y) * 180) / Math.PI + 360) % 360;
    const far = Math.hypot(x - G.cx, y - G.cy) > G.R * 0.35;
    const i = ends.reduce((best, e, j) => (Math.abs(e - a) < Math.abs((ends[best] ?? 999) - a) ? j : best), -1);
    return far && i >= 0 && Math.abs(ends[i] - a) <= 30 ? [i, deg] : null;
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = svgPoint(e.currentTarget, e);
    const hit = aim(x, y, true);
    if (!hit) return;
    held.current = hit[0];
    e.currentTarget.setPointerCapture?.(e.pointerId);
    put(hit[0], hit[1]);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (held.current < 0 || !e.buttons) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const hit = aim(x, y, false);
    if (hit) put(hit[0], hit[1], true);
  };
  const up = () => {
    held.current = -1;
  };
  const step = m.kind === "picto" ? (halves(m.t) ? 0.5 : 1) : m.kind === "line" ? lineGeom(m.t).grain : PIE_STEP;
  const key = (i: number) => (e: KeyboardEvent) => {
    const by = e.key === "ArrowUp" || e.key === "ArrowRight" ? step : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -step : 0;
    if (!by) return;
    e.preventDefault();
    if (m.kind === "picto") put(i, Math.max(0, Math.min(SLOTS, now[i] + by)));
    else if (m.kind === "line") put(i, Math.max(0, Math.min(lineGeom(m.t).top, Math.max(0, now[i]) + (now[i] < 0 ? Math.max(0, by) : by))));
    else put(i, pieEnds(m.t, d.drawn)[i] + by);
  };
  const check = () => {
    const wrong = wrongParts(m, d.drawn);
    if (wrong.length) return game.miss({ wrong, misses: d.misses + 1, said: { kind: "wrong", slip: slipAt(m, d.drawn) } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => makeNotice(m, d.misses, streak), patch: { done: true, wrong: [] } });
  };

  const pic = makeSvg(m, d.drawn, { wrong: d.wrong, done: d.done });
  const right = `${fill(w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const slip = d.said?.kind === "wrong" ? d.said.slip : -1;
  const slipText = (): string => {
    if (m.kind === "picto") {
      const r = m.t.rows[slip];
      return fill(w.slip.picto, { k: m.t.key, f: r.icon, n: r.v, h: r.v * m.t.key, v: r.v });
    }
    if (m.kind === "line") return fill(w.slip.line, { s: m.t.step, t: hourText(m.t.from + slip), h: m.t.vs[slip] * m.t.step, v: m.t.vs[slip] });
    return fill(w.slip.pie, { f: m.t.slices[slip].icon, x: pieChildren(m.t, slip), n: m.t.n });
  };
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : slip >= 0 ? { tone: "wrong", text: slipText() }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[m.kind], { n: d.wrong.length, k: m.kind === "picto" ? m.t.key : 0, c: m.kind === "pie" ? m.t.n : 0 }) }
    : { tone: "hint", text: w.hint[m.kind] };

  // What to draw, given above the picture.
  const items = m.kind === "picto" ? m.t.rows.map((r) => `${r.icon} ${r.v}`) : m.kind === "line" ? m.t.vs.map((v, k) => `${hourText(m.t.from + k)} ${v} °C`) : m.t.slices.map((s, i) => `${s.icon} ${pieChildren(m.t, i)}`);
  // A slider over each row, hour or dot, for the keyboard and for screen readers.
  const sliders = (() => {
    if (m.kind === "picto") {
      const G = pictoGeom(m.t);
      return m.t.rows.map((r, i) => ({ label: r.icon, now: now[i], max: SLOTS, x: 4, y: G.rowY(i) - 20, w: G.w - 8, h: 40 }));
    }
    if (m.kind === "line") {
      const G = lineGeom(m.t);
      return m.t.vs.map((_, k) => ({ label: hourText(m.t.from + k), now: Math.max(0, now[k]), max: G.top, x: G.X(k) - 28, y: 10, w: 56, h: G.foot }));
    }
    const G = pieGeom();
    const ends = pieEnds(m.t, d.drawn);
    return m.t.slices.slice(0, -1).map((s, i) => {
      const [x, y] = G.at(ends[i], G.R);
      return { label: s.icon, now: now[i], max: 360, x: x - 14, y: y - 14, w: 28, h: 28 };
    });
  })();
  const row = d.done ? 0 : CHECK_H;
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <p className="live-said geo-prompt chart-data">
        {m.kind === "pie" && <span>{fill(w.children, { n: m.t.n })}</span>}
        {items.map((s, k) => (
          <span key={k} className={d.wrong.includes(k) ? "off" : undefined}>{s}</span>
        ))}
      </p>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={pic.w} height={pic.h + row} viewBox={`0 0 ${pic.w} ${pic.h + row}`} fontFamily={FONT} aria-label={w.hint[m.kind]} style={{ touchAction: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <rect width={pic.w} height={pic.h + row} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: pic.body }} />
          {sliders.map((s, i) => (
            <rect
              key={i}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              fill="transparent"
              role="slider"
              tabIndex={d.done ? -1 : 0}
              aria-label={s.label}
              aria-valuemin={0}
              aria-valuemax={s.max}
              aria-valuenow={s.now}
              style={{ cursor: d.done ? "default" : m.kind === "pie" ? "grab" : m.kind === "line" ? "ns-resize" : "pointer", outline: "none", pointerEvents: m.kind === "pie" ? "none" : undefined }}
              onKeyDown={key(i)}
            />
          ))}
          {row > 0 && <CheckRow w={pic.w} y={pic.h} check={{ text: g.check, onTap: check }} clear={{ text: g.clear, disabled: !d.drawn.length, onTap: () => set({ ...d, drawn: [], wrong: [], said: null }) }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
