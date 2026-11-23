// Find the crux (issue #583): a word problem in its sentences (the layout of marking a problem, #582) or an equation,
// on a card, and under it its steps by what they ask or do, their answers hidden. The player taps the step it all
// hinges on (or presses its number). A step that is not the crux is not taken: the stage shakes and the line says it
// is routine once the crux is seen. Found, the steps are shown worked, the crux lit with its tag, and the line says
// why it is the crux. On the later puzzles the steps stand scrambled: the crux first, then the steps tapped in the
// order they are worked, a step tapped before one it needs not taken. One game a set (word problems, equations),
// each with its own ladder; against the clock once the ladder opens it. Built on the game shell (useGame).
import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n";
import { wrap } from "../math/chart";
import { checkTap, CRUX_LADDERS, CRUX_NOTICES, cruxNotice, cruxNow, cruxStars, eqText, isBarStep, replay, type CruxGroup, type CruxStep, type LiveCrux } from "../math/crux";
import { money } from "../math/practiceKit";
import { barPart } from "../math/skills/barModels";
import { GREEN, keyTap, MUTED, RED } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveCrux> = { ops: [], misses: 0, done: false, said: null };
const W = 560;
const ORANGE = "#f08c00";
/** The steps that find an amount of money, on a money problem. */
const MONEY_ASKS = new Set(["benHas", "twoEqual", "equalUnits", "oneUnit", "difference", "answer"]);

type CruxProps = PieceProps<"cruxWord"> | PieceProps<"cruxEq">;
/** Where each set keeps its ladder in this browser (model/gameKeys.ts says the same). */
const LADDER: Record<CruxGroup, { key: string }> = { word: { key: "zeno.cruxword.v1" }, eq: { key: "zeno.cruxeq.v1" } };

export function Crux({ state: d, set, w: words, svgRef }: CruxProps) {
  const [w, g] = [words.crux, words.game];
  const pw = useI18n().t.pracWords;
  const group = d.group;
  const game = useGame({ ...LADDER[group], size: CRUX_LADDERS[group].length, notices: CRUX_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = cruxNow(d);
  const p = task.problem;
  const m = replay(task, d.ops);
  const stars = cruxStars(d.misses);
  const n = task.order.length;
  const wrongAt = d.said?.kind === "notCrux" || d.said?.kind === "early" ? d.said.tile : null;

  const tap = (at: number) => {
    const c = checkTap(m, at);
    if (!c) return;
    if (!c.ok) return game.miss({ misses: d.misses + 1, said: { kind: c.why, tile: at } });
    const ops = [...d.ops, at];
    const after = replay(task, ops);
    if (!after.done) return game.step({ ops, said: m.found ? null : { kind: "found" } }, { counts: false });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => cruxNotice(after, d.misses, streak), patch: { ops, done: true, said: null } });
  };
  // A step's number taps it; the board's own keys must not see it.
  const keys = (e: KeyboardEvent) => {
    const k = Number(e.key);
    if (!Number.isInteger(k) || k < 1 || k > n) return;
    e.preventDefault();
    e.stopPropagation();
    tap(k - 1);
  };

  // ---------- the words ----------

  const bar = p.bar ? barPart(p.bar, pw) : null;
  const sentences = bar ? bar.marked!.map((s) => s.text) : [fill(w.solve, { eq: p.show ?? "" })];
  const worked = bar?.worked ?? [];
  const valueOf = (s: CruxStep) => (isBarStep(s) ? (p.bar!.money && MONEY_ASKS.has(s.ask) ? money(pw, s.v) : String(s.v)) : eqText(s.eq));
  const labelOf = (s: CruxStep, i: number) => (isBarStep(s) ? (s.ask === "answer" ? fill(w.answerStep, { ask: sentences[sentences.length - 1] }) : worked[i].prompt) : fill(w.acts[s.act], { n: s.n }));
  const shownVars = Object.fromEntries(Object.entries(p.vars).map(([k, v]) => [k, p.bar?.money && ["g", "d", "t", "e", "u"].includes(k) ? money(pw, v) : String(v)]));
  const cruxStep = p.steps[p.crux];
  const why = fill(w.why[p.kind], { ...shownVars, ...(isBarStep(cruxStep) ? {} : { n: cruxStep.n, eq: eqText(cruxStep.eq) }) });
  const right = `${fill(task.scrambled ? w.ordered : w.right, { stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${why} ${right}` }
    : d.done ? { tone: "ok", text: `${why} ${right}` }
    : d.said?.kind === "notCrux" ? { tone: "wrong", text: w.notCrux }
    : d.said?.kind === "early" ? { tone: "wrong", text: w.early }
    : d.said?.kind === "found" ? { tone: "ok", text: w.found }
    : { tone: "hint", text: w.hint };
  const ask = m.found && !m.done ? w.askOrder : w.ask;

  // ---------- the picture ----------

  const pad = 16;
  const cardW = W - 2 * pad;
  const cardY = 34;
  // The problem: each sentence on a line of its own, wrapped; an equation large.
  const probRows = bar ? sentences.map((s) => wrap(s, 60)) : [];
  const probH = bar ? probRows.reduce((s, r) => s + r.length * 20 + 6, 0) + 8 : 44;
  const cardH = 16 + probH;
  const stepsY = cardY + cardH + 14;
  const live = !m.done;
  const tagW = 96;
  const tiles = task.order.map((s, at) => {
    const step = p.steps[s];
    const fs = 14;
    const lines = wrap(labelOf(step, s), Math.floor((cardW - 40 - tagW) / (fs * 0.58)));
    const shown = m.done;
    const h = 16 + lines.length * (fs + 4) + (shown ? 22 : 0);
    return { s, at, step, lines, fs, h, shown };
  });
  const tops = tiles.map((_, i) => stepsY + tiles.slice(0, i).reduce((sum, t) => sum + t.h + 8, 0));
  const H = (tiles.length ? tops[tops.length - 1] + tiles[tiles.length - 1].h : stepsY) + 12;
  const placedAt = (s: number) => m.placed.indexOf(s);

  let y = cardY + 14;
  const problem = bar ? (
    <g fontSize={15} fill={INK}>
      {probRows.map((rows, i) => {
        const top = y;
        y += rows.length * 20 + 6;
        return rows.map((l, k) => (
          <text key={`${i}-${k}`} x={pad + 16} y={top + 14 + k * 20}>{l}</text>
        ));
      })}
    </g>
  ) : (
    <text x={W / 2} y={cardY + 16 + probH / 2 - 2} fontSize={24} fill={INK} textAnchor="middle" xmlSpace="preserve">{sentences[0]}</text>
  );

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={ask} onKeyDown={keys}>
          <rect width={W} height={H} fill="#fff" />
          <text x={pad} y={22} fontSize={13} fill={MUTED}>{w.sets[group]}</text>
          {task.scrambled && m.found && (
            <text x={W - pad} y={22} fontSize={13} fontWeight={700} fill={GREEN} textAnchor="end">{fill(w.moves, { k: m.placed.length, n })}</text>
          )}
          <g role="img" aria-label={`${w.problem}: ${sentences.join(" ")}`}>
            <rect x={pad} y={cardY} width={cardW} height={cardH} rx={10} fill="#fff4e6" stroke={ORANGE} strokeWidth={2} />
            {problem}
          </g>
          {tiles.map((t, i) => {
            const top = tops[i];
            const isCrux = m.found && t.s === p.crux;
            const isWrong = wrongAt === t.at && !m.done;
            const order = placedAt(t.s);
            const usable = live && !(m.found && order >= 0);
            const act = () => tap(t.at);
            const value = t.shown ? valueOf(t.step) : "";
            return (
              <g
                key={t.at}
                role="button"
                tabIndex={usable ? 0 : -1}
                aria-label={`${t.at + 1}: ${t.lines.join(" ")}${value ? ` = ${value}` : ""}${isCrux ? ` (${w.cruxTag})` : ""}`}
                aria-disabled={!usable || undefined}
                style={{ cursor: usable ? "pointer" : "default" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={act}
                onKeyDown={(e) => keyTap(e, act)}
              >
                <rect
                  x={pad}
                  y={top}
                  width={cardW}
                  height={t.h}
                  rx={8}
                  fill={isCrux ? "#ebfbee" : isWrong ? "#fff5f5" : "#f8f9fa"}
                  stroke={isCrux ? GREEN : isWrong ? RED : "#ced4da"}
                  strokeWidth={isCrux ? 3 : isWrong ? 2.4 : 1.6}
                />
                <text x={pad + 12} y={top + 21} fontSize={12} fontWeight={700} fill={MUTED} pointerEvents="none">{t.at + 1}</text>
                {t.lines.map((l, k) => (
                  <text key={k} x={pad + 32} y={top + 21 + k * (t.fs + 4)} fontSize={t.fs} fill={isWrong ? RED : INK} pointerEvents="none">{l}</text>
                ))}
                {value && (
                  <text x={pad + 32} y={top + 21 + t.lines.length * (t.fs + 4) + 4} fontSize={15} fontWeight={700} fill={isCrux ? GREEN : INK} pointerEvents="none" xmlSpace="preserve">
                    {`→ ${value}`}
                  </text>
                )}
                {isCrux && (
                  <text x={pad + cardW - 12} y={top + 21} fontSize={12} fontWeight={700} fill={GREEN} textAnchor="end" pointerEvents="none">{w.cruxTag}</text>
                )}
                {task.scrambled && order >= 0 && (
                  <text x={pad + cardW - 12} y={top + t.h - 10} fontSize={12} fontWeight={700} fill={MUTED} textAnchor="end" pointerEvents="none">{fill(w.nth, { n: order + 1 })}</text>
                )}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
