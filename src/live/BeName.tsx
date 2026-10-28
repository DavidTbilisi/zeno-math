// Name the pattern: the player reads a problem and drags its card onto the pattern that solves it, one of the twelve
// tiles of the algorithm-sense games (or taps the card, then the tile). A wrong tile is not taken: the stage shakes and
// the line says what that pattern needs, to check the problem against. A right one moves on, shows the clue that gave
// the pattern away, and adds what the pattern needs to a cheat sheet beside the board. No miss earns three stars, one
// two. Nine rounds open in turn, the later ones with look-alikes (two problems with a sorted list, or two graphs), and
// the endless run keeps a streak of rounds named without a miss. Built on the game shell (useGame), which does the
// ladder, the sounds and the cheer.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { apply, checkOp, expect, NAME_LADDER, NAME_NOTICES, nameNotice, nameNow, nameStars, nameSvg, PATTERNS, replay, type LiveBeName } from "../math/beName";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveBeName> = { ops: [], misses: 0, done: false, said: null };
type Drag = { src: string; x: number; y: number; x0: number; y0: number; moved: boolean };

export function BeName({ state: d, set, w: words, svgRef }: PieceProps<"beName">) {
  const [w, g] = [words.beName, words.game];
  const game = useGame({ key: "zeno.bename.v1", size: NAME_LADDER.length, notices: NAME_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = nameNow(d);
  const m = replay(task, d.ops);
  const stars = nameStars(d.misses);
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const tapped = useRef({ id: "", at: 0 });
  const items = task.items;
  const textOf = (k: number) => fill(w.problems[items[k].id as keyof typeof w.problems], items[k]);
  const clueOf = (k: number) => fill(w.clues[items[k].id as keyof typeof w.clues], items[k]);
  const names = PATTERNS.map((p) => w.tiles[p]);
  const now = Math.min(m.k, items.length - 1);
  const last = m.k - 1;
  const pic = nameSvg(m, { text: textOf(now), clue: last >= 0 ? clueOf(last) : "", names, showClue: last >= 0 }, { hot, sel, finished: d.done });
  const spotAt = (x: number, y: number, kind: "from" | "to") => pic.spots.find((s) => s[kind] && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);

  const drop = (src: string, to: string): boolean => {
    if (src !== "card" || !to.startsWith("tile")) return false;
    setSel(null);
    const c = checkOp(m, Number(to.slice(4)));
    if (!c.ok) {
      game.miss({ misses: d.misses + 1, said: { kind: "wrong", why: c.why, vars: c.vars } });
      return true;
    }
    const ops = [...d.ops, c.code];
    const after = apply(m, c.code);
    if (expect(after)) game.step({ ops, said: null }, { counts: false });
    else game.win({ stars, clean: d.misses === 0, notice: (streak) => nameNotice(after, d.misses, streak), patch: { ops, done: true } });
    return true;
  };
  /** A tap: drop what was picked up here, or pick this up (a second tap puts it down). */
  const activate = (id: string) => {
    if (d.done) return;
    const spot = pic.spots.find((s) => s.id === id);
    if (!spot) return;
    if (sel && sel !== id && spot.to && drop(sel, id)) return;
    setSel(spot.from && sel !== id ? id : null);
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (d.done) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const s = spotAt(x, y, "from");
    if (!s) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ src: s.id, x, y, x0: x, y0: y, moved: false });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const [x, y] = svgPoint(e.currentTarget, e);
    const moved = drag.moved || Math.hypot(x - drag.x0, y - drag.y0) > 6;
    setDrag({ ...drag, x, y, moved });
    if (moved) setHot(spotAt(x, y, "to")?.id ?? null);
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    setDrag(null);
    setHot(null);
    if (!drag.moved) {
      tapped.current = { id: drag.src, at: Date.now() };
      return activate(drag.src);
    }
    const [x, y] = svgPoint(e.currentTarget, e);
    const to = spotAt(x, y, "to");
    if (to && to.id !== drag.src) drop(drag.src, to.id);
  };
  // A click on a spot right after the pointer handlers took a tap on it is the same tap.
  const click = (id: string) => (tapped.current.id !== id || Date.now() - tapped.current.at > 400) && activate(id);
  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    activate(id);
  };

  const right = `${fill(w.right, { n: items.length, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { name: w.tiles[d.said.vars.tile], needs: w.needs[d.said.vars.tile] }) }
    : { tone: "hint", text: w.hint };
  const sheet = PATTERNS.filter((p) => m.answered.includes(p));
  const log = m.answered.map((p, k) => `“${clueOf(k)}” → ${w.tiles[p]}`).slice(-7);
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: w.ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <div className="search-row">
          <svg
            ref={svgRef}
            width={pic.w}
            height={pic.h}
            viewBox={`0 0 ${pic.w} ${pic.h}`}
            fontFamily={FONT}
            role="group"
            aria-label={w.ask}
            style={{ cursor: drag?.moved ? "grabbing" : "default", touchAction: "none" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => {
              setDrag(null);
              setHot(null);
            }}
          >
            <rect width={pic.w} height={pic.h} fill="#fff" />
            <g dangerouslySetInnerHTML={{ __html: pic.body }} />
            {pic.spots.map((s) => (
              <rect
                key={s.id}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill="transparent"
                role="button"
                tabIndex={d.done ? -1 : 0}
                aria-label={s.label}
                aria-pressed={sel === s.id}
                style={{ cursor: d.done ? "default" : s.from ? "grab" : "pointer" }}
                onClick={() => click(s.id)}
                onKeyDown={key(s.id)}
              />
            ))}
            {drag?.moved && (
              <g pointerEvents="none" opacity={0.85}>
                <rect x={drag.x - 44} y={drag.y - 13} width={88} height={26} rx={13} fill="#ffe8cc" stroke="#f08c00" strokeWidth={2.5} />
                <text x={drag.x} y={drag.y + 5} fontSize={13} fontWeight={700} textAnchor="middle">{`${m.k + 1} / ${items.length}`}</text>
              </g>
            )}
          </svg>
          <div className="search-side">
            <div className="search-code" role="group" aria-label={w.sheet}>
              <div>{w.sheet}</div>
              {sheet.map((p) => (
                <div key={p} className={p === m.answered[m.answered.length - 1] && !d.done ? "lit" : undefined}>{`${w.tiles[p]}: ${w.needs[p]}`}</div>
              ))}
            </div>
            <ol className="search-log" aria-label={w.log} aria-live="polite" start={m.answered.length - log.length + 1}>
              {log.map((l, i) => (
                <li key={m.answered.length - log.length + i}>{l}</li>
              ))}
            </ol>
          </div>
        </div>
      </Stage>
      <p className="live-said info">{fill(w.moves, { k: d.ops.length, n: items.length })}</p>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
