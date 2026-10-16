// Equal expressions: cards to pair up, each with the simplest way to write it — like terms collected, brackets
// multiplied out, products and powers — with a near miss on the board too (2x + 3 beside 2(x + 3)). Tap two that are
// equal for every x; they turn green and stay, and two that aren't flash red. Clearing the board with no misses earns
// three stars. The endless run deals board after board and keeps a streak of pairs made without a miss.
import { useState } from "react";
import { EXPR_LADDER, EXPR_NOTICES, exprNotice, exprNow, exprStars, same, type ExprLevel, type LiveExprMatch } from "../math/exprMatch";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";

const [CW, CH, GAP, COLS] = [170, 80, 12, 4];

export function ExprMatch({ state: d, set, w: words, svgRef }: PieceProps<"exprMatch">) {
  const [w, g] = [words.exprMatch, words.game];
  const [ladder, keep] = useLadder("zeno.exprmatch.v1", EXPR_LADDER.length, EXPR_NOTICES);
  const [cheer, setCheer] = useState(0);
  const cards = exprNow(d);
  const level = d.mode === "puzzle" ? EXPR_LADDER[d.stage].level : d.level;
  const rows = Math.ceil(cards.length / COLS);
  const [W, H] = [COLS * (CW + GAP) + GAP, rows * (CH + GAP) + GAP];
  const done = d.cleared.length === cards.length;

  const tap = (i: number) => {
    if (done || d.cleared.includes(i)) return;
    if (d.picked.includes(i)) return set({ ...d, picked: [], said: null });
    if (!d.picked.length) return set({ ...d, picked: [i], said: null });
    const a = d.picked[0];
    if (!same(cards[a], cards[i])) {
      play("miss");
      return set({ ...d, picked: [], misses: d.misses + 1, streak: 0, said: { kind: "miss", a, b: i } });
    }
    const cleared = [...d.cleared, a, i];
    const streak = d.mode === "endless" ? d.streak + 1 : d.streak;
    const all = cleared.length === cards.length;
    const key = exprNotice(level, all, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    let said: LiveExprMatch["said"] = key ? { kind: "notice", key } : null;
    if (all) {
      const stars = exprStars(d.misses);
      if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
      said = key ? said : { kind: "done", stars };
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
    }
    if (key && !next.found.includes(key)) next = withFound(next, key, EXPR_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    set({ ...d, cleared, picked: [], streak, said });
  };
  const fresh: Pick<LiveExprMatch, "cleared" | "picked" | "misses" | "said"> = { cleared: [], picked: [], misses: 0, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: ExprLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? set({ ...d, ...fresh, seed: newSeed() }) : go(nextStage(d.stage, EXPR_LADDER.length)));

  const missed = d.said?.kind === "miss" ? [d.said.a, d.said.b] : [];
  const stars = exprStars(d.misses);
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]}${done ? ` ${fill(w.done, { stars: starText(stars) })}` : ""}`
    : d.said?.kind === "done" ? fill(w.done, { stars: starText(d.said.stars) })
    : d.said?.kind === "miss" ? fill(w.miss, { a: cards[d.said.a].text, b: cards[d.said.b].text })
    : w.hint;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g}>
        <span className="est-streak">{fill(w.misses, { n: d.misses })}</span>
      </GameNav>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={w.hint}>
          <rect width={W} height={H} fill="#fff" />
          {cards.map((c, i) => {
            const [x, y] = [GAP + (i % COLS) * (CW + GAP), GAP + Math.floor(i / COLS) * (CH + GAP)];
            const state = d.cleared.includes(i) ? "cleared" : d.picked.includes(i) ? "picked" : missed.includes(i) ? "missed" : "";
            return (
              <g key={i} className={`eq-card ${state}`} role="button" aria-label={c.text} aria-pressed={state === "picked"} style={{ cursor: state === "cleared" ? "default" : "pointer" }} onClick={() => tap(i)}>
                <rect x={x} y={y} width={CW} height={CH} rx={10} fill={state === "cleared" ? "#d3f9d8" : state === "picked" ? "#d0ebff" : state === "missed" ? "#ffe3e3" : "#f8f9fa"} stroke={state === "cleared" ? "#2f9e44" : state === "picked" ? "#1971c2" : state === "missed" ? "#e03131" : "#ced4da"} strokeWidth={state ? 3 : 2} />
                <text x={x + CW / 2} y={y + CH / 2 + 8} fontSize={c.text.length > 13 ? 17 : 22} fontWeight={700} textAnchor="middle" fill={INK} opacity={state === "cleared" ? 0.55 : 1}>{c.text}</text>
              </g>
            );
          })}
        </svg>
        {cheer > 0 && done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {done && <Onward mode={d.mode} stage={d.stage} size={EXPR_LADDER.length} onClick={onward} g={g} />}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" ? "live-said ok" : d.said?.kind === "miss" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={EXPR_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
