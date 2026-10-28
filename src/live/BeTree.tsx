// Be the tree: the player is the computer working a binary search tree, laid out with each node above its place
// among the sorted values. Every operation is a drag (or a tap on what to move, then a tap on where it goes): x onto
// the child of cur it goes to, into the empty place it belongs (insert) or onto the node holding it (search), or into an
// empty place when it isn't there; for the traversals, a node onto the stack and the stack's top into out[]. The code
// runs beside it with the lines the last operation ran lit, and a log below says, as code, what each operation did. An
// operation the code would not make is not made: the stage shakes and the line names the rule it broke. No miss earns
// three stars, one two. Nine puzzles open in turn, and the endless run keeps a streak of trees worked without a miss.
// Built on the game shell (useGame), which does the ladder, the sounds and the cheer.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { apply, checkOp, CODE, expect, logText, replay, TREE_LADDER, TREE_NOTICES, treeNotice, treeNow, treeRun, treeStars, treeSvg, xOf, type LiveBeTree, type TreeAttempt } from "../math/beTree";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveBeTree> = { ops: [], misses: 0, done: false, said: null };
type Drag = { src: string; x: number; y: number; x0: number; y0: number; moved: boolean };

/** What dropping one spot on another tries, or null when it means nothing: x onto a node or an empty place, a node onto the stack or into out[], the stack's top into out[]. */
function attemptOf(src: string, to: string): TreeAttempt | null {
  const node = (id: string) => (id[0] === "n" ? Number(id.slice(1)) : null);
  if (src === "x") return node(to) !== null ? { kind: "drop", node: node(to)! } : to === "sl" || to === "sr" ? { kind: "slot", side: to === "sl" ? "l" : "r" } : null;
  if (src === "top") return to === "out" ? { kind: "pop" } : null;
  const from = node(src);
  if (from === null) return null;
  return to === "stack" ? { kind: "push", node: from } : to === "out" ? { kind: "out", node: from } : null;
}

export function BeTree({ state: d, set, w: words, svgRef }: PieceProps<"beTree">) {
  const [w, g] = [words.beTree, words.game];
  const game = useGame({ key: "zeno.betree.v1", size: TREE_LADDER.length, notices: TREE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = treeNow(d);
  const run = treeRun(task);
  const m = replay(task, d.ops);
  const stars = treeStars(d.misses);
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const tapped = useRef({ id: "", at: 0 });
  const pic = treeSvg(m, { hot, sel, finished: d.done });
  const spotAt = (x: number, y: number, kind: "from" | "to") => pic.spots.find((s) => s[kind] && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);

  const drop = (src: string, to: string): boolean => {
    const a = attemptOf(src, to);
    if (!a) return false;
    setSel(null);
    const c = checkOp(m, a);
    if (!c.ok) {
      game.miss({ misses: d.misses + 1, said: { kind: "wrong", why: c.why, vars: c.vars } });
      return true;
    }
    const ops = [...d.ops, c.code];
    const after = apply(m, c.code);
    if (expect(after)) game.step({ ops, said: null }, { counts: false });
    else game.win({ stars, clean: d.misses === 0, notice: (streak) => treeNotice(after, d.misses, streak), patch: { ops, done: true } });
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

  const vars = { n: run.end.nodes.length, q: task.q.length, found: run.end.res.filter((r) => r !== null).length, out: run.end.out.map((i) => run.end.nodes[i].v).join(", ") };
  const right = `${fill(w.right[task.algo], { ...vars, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.why[d.said.why], d.said.vars) }
    : { tone: "hint", text: w.hint[task.algo] };
  const ghost = !drag?.moved ? null : drag.src === "x" ? String(xOf(m)) : drag.src === "top" ? String(m.nodes[m.stack[m.stack.length - 1]].v) : String(m.nodes[Number(drag.src.slice(1))].v);
  const log = m.log.slice(-7);
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: `${w.names[task.algo]}: ${fill(w.ask[task.algo], { n: task.a.length, a: task.a.join(", "), q: task.q.join(", ") })}` }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <div className="search-row">
          <svg
            ref={svgRef}
            width={pic.w}
            height={pic.h}
            viewBox={`0 0 ${pic.w} ${pic.h}`}
            fontFamily={FONT}
            role="group"
            aria-label={w.names[task.algo]}
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
            {ghost && drag && (
              <g pointerEvents="none" opacity={0.85}>
                <rect x={drag.x - 24} y={drag.y - 13} width={48} height={26} rx={13} fill="#ffe8cc" stroke="#f08c00" strokeWidth={2.5} />
                <text x={drag.x} y={drag.y + 5} fontSize={14} fontWeight={700} textAnchor="middle">{ghost}</text>
              </g>
            )}
          </svg>
          <div className="search-side">
            <div className="search-code" role="group" aria-label={w.code}>
              {CODE[task.algo].map((l, i) => (
                <div key={i} className={!d.done && m.lines.includes(i) ? "lit" : undefined}>{l}</div>
              ))}
            </div>
            <ol className="search-log" aria-label={w.log} aria-live="polite" start={m.log.length - log.length + 1}>
              {log.map((l, i) => (
                <li key={m.log.length - log.length + i}>{logText(l, task)}</li>
              ))}
            </ol>
          </div>
        </div>
      </Stage>
      <p className="live-said info">{fill(w.moves, { k: d.ops.length, n: run.ops.length })}</p>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
