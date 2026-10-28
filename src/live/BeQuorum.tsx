// Be the replicas: the player is the coordinator of a store kept on N replicas. Every operation is a drag (or a tap on
// what to move, then a tap on where it goes): the request onto the next replica on its preference list, or onto fail
// when too few are up; for a read, the newest reply onto return, then the value returned onto each replica that replied
// with an older one. Replicas going down and coming back happen by themselves. The code runs beside it with the lines
// the last operation ran lit, and a log below says, as code, what each operation did. An operation the code would not
// make is not made: the stage shakes and the line names the rule it broke. No miss earns three stars, one two. Nine
// puzzles open in turn, and the endless run keeps a streak of runs made without a miss. Built on the game shell
// (useGame), which does the ladder, the sounds and the cheer.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { apply, checkOp, CODE, eventText, expect, letter, logText, QUORUM_LADDER, QUORUM_NOTICES, quorumNotice, quorumNow, quorumRun, quorumStars, quorumSvg, replay, type LiveBeQuorum, type QuorumAttempt } from "../math/beQuorum";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveBeQuorum> = { ops: [], misses: 0, done: false, said: null };
type Drag = { src: string; x: number; y: number; x0: number; y0: number; moved: boolean };

/** What dropping one spot on another tries, or null when it means nothing (see the head of this file). */
function attemptOf(src: string, to: string): QuorumAttempt | null {
  const i = to[0] === "r" ? Number(to.slice(1)) : null;
  if (src === "req") return i !== null ? { kind: "send", i } : to === "fail" ? { kind: "fail" } : null;
  if (src[0] === "p") return to === "ret" ? { kind: "pick", i: Number(src.slice(1)) } : null;
  return src === "val" && i !== null ? { kind: "repair", i } : null;
}

export function BeQuorum({ state: d, set, w: words, svgRef }: PieceProps<"beQuorum">) {
  const [w, g] = [words.beQuorum, words.game];
  const game = useGame({ key: "zeno.bequorum.v1", size: QUORUM_LADDER.length, notices: QUORUM_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = quorumNow(d);
  const run = quorumRun(task);
  const m = replay(task, d.ops);
  const stars = quorumStars(d.misses);
  const [sel, setSel] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const tapped = useRef({ id: "", at: 0 });
  const pic = quorumSvg(m, { hot, sel, finished: d.done });
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
    else game.win({ stars, clean: d.misses === 0, notice: (streak) => quorumNotice(after, d.misses, streak), patch: { ops, done: true } });
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

  const vars = { n: task.events.filter((ev) => ev.kind === "write" || ev.kind === "read").length, failed: run.ops.filter((c) => c === 1).length };
  const right = `${fill(w.right[task.algo], { ...vars, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.why[d.said.why], d.said.vars) }
    : { tone: "hint", text: w.hint[task.algo] };
  const ghost = !drag?.moved ? null : drag.src === "req" ? eventText(task.events[m.e]) : drag.src === "val" ? letter(m.picked?.v ?? 0) : `r${drag.src.slice(1)}`;
  const log = m.log.slice(-7);
  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: `${w.names[task.algo]}: ${fill(w.ask[task.algo], vars)}` }} />
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
                <rect x={drag.x - 44} y={drag.y - 13} width={88} height={26} rx={13} fill="#ffe8cc" stroke="#f08c00" strokeWidth={2.5} />
                <text x={drag.x} y={drag.y + 5} fontSize={13} fontWeight={700} textAnchor="middle">{ghost}</text>
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
