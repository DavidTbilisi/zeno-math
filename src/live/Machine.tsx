// Guess my rule: a machine that does the same to every number put in, and its rule to find. Put numbers in (0 to 10)
// and see what comes out, in a table; then answer for a number too big to put in — or, at hard, say what went in.
// Right first time earns three stars, after one miss two. Nine puzzles open in turn — one step (n + 7, 4n), two
// steps (3n + 2), two steps asked for 100 or backwards — and the endless run keeps a streak right first time. Once
// it is answered, the machine shows its rule.
import { useState } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import {
  apply,
  INPUTS,
  MACHINE_LADDER,
  MACHINE_NOTICES,
  machineAnswer,
  machineNotice,
  machineNow,
  machineStars,
  readWhole,
  type LiveMachine,
  type MachineLevel,
} from "../math/machine";
import { play } from "./juice";
import { Keypad } from "./Keypad";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";

const [W, H] = [520, 210];
const ruleText = (mul: number, add: number) => `${mul === 1 ? "" : `× ${mul} `}${add === 0 ? "" : `${add < 0 ? "−" : "+"} ${Math.abs(add)}`}`.trim();

export function Machine({ state: d, set, w: words, svgRef }: PieceProps<"machine">) {
  const [w, g] = [words.machine, words.game];
  const [ladder, keep] = useLadder("zeno.machine.v1", MACHINE_LADDER.length, MACHINE_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = machineNow(d);
  const last = d.tried.at(-1);

  const feed = (n: number) => {
    if (d.done) return;
    play("snap");
    set({ ...d, tried: [...d.tried.filter((k) => k !== n), n], said: d.said?.kind === "notice" ? null : d.said });
  };
  const check = () => {
    const v = readWhole(d.typed);
    if (v === null) return;
    if (v !== machineAnswer(task)) {
      play("miss");
      return set({ ...d, typed: "", misses: d.misses + 1, streak: 0, said: { kind: "wrong", v } });
    }
    const stars = machineStars(d.misses);
    const streak = d.mode === "endless" && d.misses === 0 ? d.streak + 1 : d.mode === "endless" ? 0 : d.streak;
    const key = machineNotice(task, d.tried, d.misses, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, MACHINE_NOTICES);
    if (next !== ladder) keep(next);
    play("good");
    setTimeout(() => play("star"), 260);
    setCheer((c) => c + 1);
    set({ ...d, done: true, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveMachine, "tried" | "typed" | "misses" | "done" | "said"> = { tried: [], typed: "", misses: 0, done: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: MachineLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, MACHINE_LADDER.length)));

  const ask = task.ask.dir === "out" ? fill(w.askOut, { n: task.ask.n }) : fill(w.askIn, { out: task.ask.out });
  const stars = machineStars(d.misses);
  const right = fill(w.right, { rule: `n ${ruleText(task.rule.mul, task.rule.add)}`, stars: starText(stars) });
  const said =
    d.said?.kind === "notice" ? `${w.notices[d.said.key]} ${right}`
    : d.done ? right
    : d.said?.kind === "wrong" ? fill(w.wrong, { v: d.said.v })
    : d.tried.length ? w.more
    : w.hint;
  // The table: what went in, in order, and what came out.
  const rows = [...d.tried].sort((a, b) => a - b);
  const colW = Math.min(40, (W - 70) / Math.max(rows.length, 1));
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
      <p className="live-said geo-prompt">{ask}</p>
      <div className="geo-stage-wrap">
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={ask}>
          <rect width={W} height={H} fill="#fff" />
          <rect x={60} y={20} width={86} height={50} rx={10} fill="#fff3bf" stroke="#fab005" strokeWidth={2} />
          <text x={103} y={53} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>{last ?? "?"}</text>
          <path d="M156,45 L200,45 M192,38 L202,45 L192,52" stroke="#868e96" strokeWidth={3} fill="none" />
          <rect x={210} y={8} width={110} height={74} rx={12} fill={d.done ? "#d3f9d8" : "#e7f5ff"} stroke={d.done ? "#2f9e44" : "#1971c2"} strokeWidth={3} />
          <text x={265} y={d.done ? 54 : 58} fontSize={d.done ? 22 : 34} fontWeight={700} textAnchor="middle" fill={INK}>{d.done ? ruleText(task.rule.mul, task.rule.add) : "⚙ ?"}</text>
          <path d="M330,45 L374,45 M366,38 L376,45 L366,52" stroke="#868e96" strokeWidth={3} fill="none" />
          <rect x={384} y={20} width={86} height={50} rx={10} fill="#d0ebff" stroke="#1971c2" strokeWidth={2} />
          <text x={427} y={53} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK}>{last === undefined ? "?" : apply(task.rule, last)}</text>
          <g transform="translate(0 110)" fontSize={16} fill={INK}>
            <text x={50} y={22} textAnchor="end" fill="#495057">{w.in}</text>
            <text x={50} y={62} textAnchor="end" fill="#495057">{w.out}</text>
            <line x1={58} y1={36} x2={W - 10} y2={36} stroke="#ced4da" strokeWidth={1.5} />
            {rows.map((n, i) => (
              <g key={n} fontWeight={n === last ? 700 : 400}>
                <text x={58 + colW * (i + 0.5)} y={22} textAnchor="middle">{n}</text>
                <text x={58 + colW * (i + 0.5)} y={62} textAnchor="middle" fill="#1971c2">{apply(task.rule, n)}</text>
              </g>
            ))}
          </g>
        </svg>
        {cheer > 0 && d.done && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar machine-inputs">
        <span className="est-streak">{w.putIn}</span>
        {INPUTS.map((n) => (
          <button key={n} className={`live-btn${d.tried.includes(n) ? " on" : ""}`} disabled={d.done} onClick={() => feed(n)}>{n}</button>
        ))}
      </div>
      {!d.done && <Keypad value={d.typed} onChange={(typed) => set({ ...d, typed, said: d.said?.kind === "wrong" ? null : d.said })} erase={w.erase} minus={task.level > 1} />}
      <div className="live-bar">
        {d.done ? (
          <Onward mode={d.mode} stage={d.stage} size={MACHINE_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={readWhole(d.typed) === null} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.done ? "live-said ok" : d.said?.kind === "wrong" ? "live-said" : "live-hint"}>
        {said} <Found ladder={ladder} of={MACHINE_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
