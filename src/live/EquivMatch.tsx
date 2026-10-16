// Equal amounts: cards to pair up (or put in threes at hard) — a fraction and its picture, a fraction and an equal one
// with bigger numbers, a fraction with its decimal and its percentage. Tap the cards that go together; they turn green
// and stay, and two that don't go together flash red. Clearing the board with no misses earns three stars. The endless
// run deals board after board and keeps a streak of groups made without a miss.
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  EQ_LADDER,
  EQ_NOTICES,
  eqNotice,
  eqNow,
  eqStars,
  groupSize,
  partsSvg,
  same,
  type Card,
  type EqLevel,
  type LiveEquiv,
} from "../math/equivMatch";
import { withBest, withFound, withStars } from "../math/ladder";
import { play } from "./juice";
import { Cheer, LadderBar, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, SvgFrac, Toggle, type PieceProps } from "./ui";

const [CW, CH, GAP] = [132, 92, 12];
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

function Face({ c, x, y }: { c: Card; x: number; y: number }) {
  const [cx, cy] = [x + CW / 2, y + CH / 2];
  if (c.kind === "frac") return <SvgFrac n={c.n} d={c.d} x={cx} y={cy - 4} size={26} />;
  if (c.kind === "pic") return <g transform={`translate(${x + 10} ${cy - 16})`} dangerouslySetInnerHTML={{ __html: partsSvg(c.n, c.d, CW - 20, 32) }} />;
  return <text x={cx} y={cy + 10} fontSize={28} fontWeight={700} textAnchor="middle" fill={INK}>{c.text}</text>;
}

export function EquivMatch({ state: d, set, w: words, svgRef }: PieceProps<"equivMatch">) {
  const w = words.equivMatch;
  const { t } = useI18n();
  const [ladder, keep] = useLadder("zeno.equivmatch.v1", EQ_LADDER.length, EQ_NOTICES);
  const [cheer, setCheer] = useState(0);
  const started = useRef(performance.now());
  const cards = eqNow(d);
  const level = d.mode === "puzzle" ? EQ_LADDER[d.stage].level : d.level;
  const size = groupSize(level);
  const cols = cards.length === 9 ? 3 : 4;
  const rows = Math.ceil(cards.length / cols);
  const [W, H] = [cols * (CW + GAP) + GAP, rows * (CH + GAP) + GAP];
  const done = d.cleared.length === cards.length;

  const tap = (i: number) => {
    if (done || d.cleared.includes(i)) return;
    if (d.picked.includes(i)) return set({ ...d, picked: d.picked.filter((j) => j !== i), said: null });
    const picked = [...d.picked, i];
    if (!same(cards[picked[0]], cards[i])) {
      play("miss");
      return set({ ...d, picked: [], misses: d.misses + 1, streak: 0, said: { kind: "miss", a: picked[0], b: i } });
    }
    if (picked.length < size) return set({ ...d, picked, said: null });
    // A whole group: it stays, green.
    const cleared = [...d.cleared, ...picked];
    const streak = d.mode === "endless" ? d.streak + 1 : d.streak;
    const all = cleared.length === cards.length;
    const key = eqNotice(level, all, d.misses, performance.now() - started.current, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    let said: LiveEquiv["said"] = key ? { kind: "notice", key } : null;
    if (all) {
      const stars = eqStars(d.misses);
      if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
      said = key ? said : { kind: "done", stars };
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
    }
    if (key && !next.found.includes(key)) next = withFound(next, key, EQ_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    set({ ...d, cleared, picked: [], streak, said });
  };
  const fresh: Pick<LiveEquiv, "cleared" | "picked" | "misses" | "said"> = { cleared: [], picked: [], misses: 0, said: null };
  const restart = (s: Partial<LiveEquiv>) => {
    started.current = performance.now();
    set({ ...d, ...fresh, ...s });
  };
  const go = (stage: number) => restart({ mode: "puzzle", stage });
  const endless = (l: EqLevel) => restart({ mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? restart({ seed: newSeed() }) : go(d.stage + 1 < EQ_LADDER.length ? d.stage + 1 : d.stage));

  const missed = d.said?.kind === "miss" ? [d.said.a, d.said.b] : [];
  const stars = eqStars(d.misses);
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]}${done ? ` ${fill(w.done, { stars: starText(stars) })}` : ""}`
    : d.said?.kind === "done" ? fill(w.done, { stars: starText(d.said.stars) })
    : d.said?.kind === "miss" ? w.miss
    : size === 3 ? w.hintThrees : w.hint;
  return (
    <>
      <LadderBar stars={ladder.stars} current={d.mode === "puzzle" ? d.stage : null} onPick={go} words={w}>
        <Toggle on={d.mode === "endless"} onClick={() => endless(d.level)}>∞ {w.endless}</Toggle>
      </LadderBar>
      <span className="est-streak">
        {d.mode === "endless" ? fill(w.streak, { n: d.streak, best: ladder.best }) : fill(w.misses, { n: d.misses })}
      </span>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="group" aria-label={size === 3 ? w.hintThrees : w.hint}>
          <rect width={W} height={H} fill="#fff" />
          {cards.map((c, i) => {
            const [x, y] = [GAP + (i % cols) * (CW + GAP), GAP + Math.floor(i / cols) * (CH + GAP)];
            const state = d.cleared.includes(i) ? "cleared" : d.picked.includes(i) ? "picked" : missed.includes(i) ? "missed" : "";
            return (
              <g key={i} className={`eq-card ${state}`} role="button" aria-label={c.kind === "pic" ? fill(w.picture, { n: c.n, d: c.d }) : c.text} aria-pressed={state === "picked"} style={{ cursor: state === "cleared" ? "default" : "pointer" }} onClick={() => tap(i)}>
                <rect x={x} y={y} width={CW} height={CH} rx={10} fill={state === "cleared" ? "#d3f9d8" : state === "picked" ? "#d0ebff" : state === "missed" ? "#ffe3e3" : "#f8f9fa"} stroke={state === "cleared" ? "#2f9e44" : state === "picked" ? "#1971c2" : state === "missed" ? "#e03131" : "#ced4da"} strokeWidth={state ? 3 : 2} />
                <g opacity={state === "cleared" ? 0.55 : 1}>
                  <Face c={c} x={x} y={y} />
                </g>
              </g>
            );
          })}
        </svg>
        {cheer > 0 && done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.mode === "endless" &&
          ([1, 2, 3] as const).map((l) => (
            <Toggle key={l} on={d.level === l} onClick={() => endless(l)}>{t.pracWords.levels[String(l) as "1" | "2" | "3"]}</Toggle>
          ))}
        {done && <button className="live-btn on" onClick={onward}>{d.mode === "endless" || d.stage + 1 < EQ_LADDER.length ? w.next : w.again} →</button>}
        <SoundToggle title={w.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.said?.kind === "done" ? "live-said ok" : d.said?.kind === "miss" ? "live-said" : "live-hint"}>
        {said}{" "}
        <span className="geo-found" title={ladder.found.map((k) => w.notices[k]).join("\n")}>
          {fill(w.found, { n: ladder.found.length, of: EQ_NOTICES.length })}
        </span>
      </p>
    </>
  );
}
