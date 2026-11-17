// Trig builder: a ladder against a wall, a ramp or a pole's support cable, drawn to scale, with one angle and one side
// given and a side or the angle to find. It is solved the way it is done on paper, a step at a time, on the picture:
// tap the sides as they are asked for (the hypotenuse, the side opposite θ, the side next to it), and each takes its
// name; choose the ratio that joins the two sides that matter; choose how to rearrange it. Each wrong step says why,
// and a wrong rearrangement is worked out and drawn beside the side, so a wall taller than its own ladder shows. The
// scaffold fades up the levels (see math/trigBuild.ts). No misses earns three stars, one two. Nine puzzles open in
// turn, and the endless run keeps a streak with no misses. Built on the game shell (useGame).
import type { KeyboardEvent, ReactNode } from "react";
import {
  lenText,
  nameOf,
  nameSlip,
  opSlip,
  opText,
  opValue,
  RATIO_PARTS,
  ratioOf,
  ratioText,
  rightOp,
  sideOf,
  sidesOf,
  stepsOf,
  TRIG_LADDER,
  TRIG_NOTICES,
  trigNotice,
  trigNow,
  trigParts,
  trigStars,
  valueText,
  type LiveTrigBuild,
  type TrigName,
  type TrigOp,
  type TrigRatio,
  type TrigSide,
  type TrigTask,
} from "../math/trigBuild";
import { starText } from "./ladderUi";
import { fill, FONT, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveTrigBuild> = { at: 0, misses: 0, done: false, said: null };
const W = 540;
const H = 320;
const GROUND = 280;
const NAME_COLOR: Record<TrigName, string> = { opp: "#9c36b5", adj: "#0c8599", hyp: "#1971c2" };
const RATIOS: TrigRatio[] = ["sin", "cos", "tan"];
type P = [number, number];
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const r2 = (v: number) => Math.round(v * 10) / 10;

/** Where the corners go: the foot B, the right angle C (at the foot of the wall), the top A; and pixels per metre. */
function layout(t: TrigTask) {
  const s = Math.min(380 / t.len.base, 220 / t.len.up);
  const [bw, bh] = [t.len.base * s, t.len.up * s];
  const left = (W - bw) / 2;
  const B: P = t.mirror ? [left + bw, GROUND] : [left, GROUND];
  const C: P = t.mirror ? [left, GROUND] : [left + bw, GROUND];
  const A: P = [C[0], GROUND - bh];
  return { s, A, B, C, ends: { base: [B, C], up: [C, A], hyp: [B, A] } as Record<TrigSide, [P, P]> };
}
/** A point pushed off the triangle, away from its middle, by `by` pixels. */
function outward(p: P, centre: P, by: number): P {
  const [dx, dy] = [p[0] - centre[0], p[1] - centre[1]];
  const n = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / n) * by, p[1] + (dy / n) * by];
}
/** An arc at a corner between two directions, the short way round. */
function arcAt(o: P, toA: P, toB: P, r: number): string {
  const ang = (p: P) => Math.atan2(p[1] - o[1], p[0] - o[0]);
  let [a, b] = [ang(toA), ang(toB)];
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (d < 0) [a, b, d] = [b, a, -d];
  const p1 = [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a)];
  const p2 = [o[0] + r * Math.cos(b), o[1] + r * Math.sin(b)];
  return `M${r2(p1[0])},${r2(p1[1])} A${r},${r} 0 0 1 ${r2(p2[0])},${r2(p2[1])}`;
}

export function TrigBuild({ state: d, set, w: words, svgRef }: PieceProps<"trigBuild">) {
  const [w, g] = [words.trigBuild, words.game];
  const game = useGame({ key: "zeno.trigbuild.v1", size: TRIG_LADDER.length, notices: TRIG_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = trigNow(d);
  const steps = stepsOf(task);
  const cur = d.done ? null : steps[d.at] ?? null;
  const stars = trigStars(d.misses);
  const pair = sidesOf(task);
  const ratio = ratioOf(pair);
  const right = rightOp(task);
  const sceneSides = w.sides[task.scene];

  const next = (patch: Partial<LiveTrigBuild>) => game.step({ ...patch, at: d.at + 1, said: null }, { counts: false });
  const tapSide = (s: TrigSide) => {
    if (cur?.kind !== "name") return;
    if (nameOf(task.top, s) === cur.n) return next({});
    game.miss({ misses: d.misses + 1, said: { kind: "name", why: nameSlip(task.top, s) } });
  };
  const pickRatio = (r: TrigRatio) => {
    if (cur?.kind !== "ratio") return;
    if (r === ratio) return next({});
    game.miss({ misses: d.misses + 1, said: { kind: "ratio", r } });
  };
  const pickOp = (op: TrigOp) => {
    if (cur?.kind !== "op") return;
    if (op !== right) return game.miss({ misses: d.misses + 1, said: { kind: "op", op } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => trigNotice(task, d.misses, streak), patch: { at: steps.length, done: true } });
  };

  // The sides named so far: each one tapped, and once the ratio is chosen the two it joins.
  const named = new Set<TrigName>(steps.slice(0, d.at).flatMap((s) => (s.kind === "name" ? [s.n] : [])));
  const ratioDone = steps.findIndex((s) => s.kind === "ratio") < d.at;
  if (ratioDone) RATIO_PARTS[ratio].forEach((n) => named.add(n));

  const L = layout(task);
  const centre: P = [(L.A[0] + L.B[0] + L.C[0]) / 3, (L.A[1] + L.B[1] + L.C[1]) / 3];
  const thetaAt = task.top ? L.A : L.B;
  const otherAt = task.top ? L.B : L.A;
  const askSide = task.ask === "ang" ? null : sideOf(task.top, task.ask);
  const wrongOp = d.said?.kind === "op" ? d.said.op : null;
  const p = trigParts(task);

  const label = (at: P, text: string, color: string, size = 16) => (
    <text x={r2(at[0])} y={r2(at[1] + size * 0.35)} fontSize={size} fontWeight={700} textAnchor="middle" fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {text}
    </text>
  );
  const sideLabel = (s: TrigSide) => {
    const n = nameOf(task.top, s);
    const [a, b] = L.ends[s];
    const m = mid(a, b);
    const parts: ReactNode[] = [];
    const value = task.ask === n ? (d.done ? `x = ${valueText(task, right, w.m)}` : "x") : task.known.includes(n) ? `${lenText(task.len[s])} ${w.m}` : null;
    if (value) parts.push(<g key="v">{label(outward(m, centre, 26), value, task.ask === n ? (d.done ? "#2f9e44" : "#e03131") : "#1e1e1e")}</g>);
    if (named.has(n)) {
      const at = outward(m, centre, -20);
      const text = w.short[n];
      parts.push(
        <g key="n">
          <rect x={r2(at[0] - text.length * 4.6 - 7)} y={r2(at[1] - 11)} width={r2(text.length * 9.2 + 14)} height={22} rx={11} fill={NAME_COLOR[n]} />
          <text x={r2(at[0])} y={r2(at[1] + 5)} fontSize={14} fontWeight={700} textAnchor="middle" fill="#fff">{text}</text>
        </g>,
      );
    }
    return parts;
  };

  // The scene behind the triangle: the ground, and the wall, the ramp or the pole.
  const { A, B, C } = L;
  const out = task.mirror ? -1 : 1;
  const scene =
    task.scene === "ladder" ? (
      <>
        <rect x={out > 0 ? C[0] : C[0] - 16} y={A[1] - 26} width={16} height={GROUND - A[1] + 26} fill="#dee2e6" stroke="#868e96" />
        {Array.from({ length: 9 }, (_, i) => {
          const f = (i + 1) / 10;
          const [x, y] = [B[0] + (A[0] - B[0]) * f, B[1] + (A[1] - B[1]) * f];
          const [nx, ny] = [-(A[1] - B[1]), A[0] - B[0]];
          const n = Math.hypot(nx, ny);
          return <line key={i} x1={r2(x - (nx / n) * 7)} y1={r2(y - (ny / n) * 7)} x2={r2(x + (nx / n) * 7)} y2={r2(y + (ny / n) * 7)} stroke="#e8590c" strokeWidth={3} />;
        })}
      </>
    ) : task.scene === "ramp" ? (
      <polygon points={`${B[0]},${B[1]} ${C[0]},${C[1]} ${A[0]},${A[1]}`} fill="#fff3bf" />
    ) : (
      <>
        <line x1={C[0]} y1={GROUND} x2={C[0]} y2={A[1] - 30} stroke="#495057" strokeWidth={9} strokeLinecap="round" />
        <circle cx={B[0]} cy={B[1]} r={5} fill="#495057" />
      </>
    );
  const sideStroke: Record<TrigSide, { color: string; width: number; dash?: string }> = {
    base: { color: "#495057", width: 3 },
    up: { color: task.scene === "cable" ? "#495057" : "#1e1e1e", width: task.scene === "cable" ? 0 : 3 },
    hyp: { color: task.scene === "ladder" ? "#e8590c" : task.scene === "ramp" ? "#f08c00" : "#1e1e1e", width: task.scene === "cable" ? 2 : 4 },
  };

  // A wrong rearrangement, worked out: the length it gives drawn beside the side asked, or the other angle marked.
  let ghost: ReactNode = null;
  if (wrongOp && askSide) {
    const v = opValue(task, wrongOp);
    const [a, b] = L.ends[askSide];
    const len = Math.min(v * L.s, 560);
    const [ux, uy] = [(b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1])];
    const off = outward(mid(a, b), centre, 40);
    const shift: P = [off[0] - mid(a, b)[0], off[1] - mid(a, b)[1]];
    const s0: P = [a[0] + shift[0], a[1] + shift[1]];
    const s1: P = [s0[0] + ux * len, s0[1] + uy * len];
    ghost = (
      <g>
        <line x1={r2(s0[0])} y1={r2(s0[1])} x2={r2(s1[0])} y2={r2(s1[1])} stroke="#e8590c" strokeWidth={4} strokeDasharray="8 5" strokeLinecap="round" />
        {label(outward(mid(s0, s1), centre, 18), `x = ${valueText(task, wrongOp, w.m)}?`, "#e8590c", 15)}
      </g>
    );
  } else if (wrongOp === "invFlip" && !Number.isNaN(opValue(task, wrongOp))) {
    const [q1, q2] = otherAt === A ? [B, C] : [A, C];
    ghost = <path d={arcAt(otherAt, q1, q2, 30)} fill="none" stroke="#e8590c" strokeWidth={3} />;
  }

  const thetaLabel = task.ask === "ang" ? (d.done ? `θ = ${valueText(task, right, w.m)}` : "θ") : `${Math.round(task.angle)}°`;
  const [ta, tb] = task.top ? [B, C] : [A, C];
  const thetaArcR = 34;
  const labelAt = outward(thetaAt, centre, -thetaArcR - 26);

  const keyTap = (s: TrigSide) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tapSide(s);
    }
  };
  const tapping = cur?.kind === "name";

  const rn = w.ratios;
  const q = task.ask === "ang" ? w.find[task.scene][task.top ? "angTop" : "angFoot"] : w.find[task.scene][sideOf(task.top, task.ask)];
  const given = (i: number) => {
    const s = sideOf(task.top, task.known[i]);
    return { v: `${lenText(task.len[s])} ${w.m}`, name: sceneSides[s] };
  };
  const [g0, g1] = [given(0), task.known.length > 1 ? given(1) : null];
  const sentence = g1 ? fill(w.givenTwo, { an: g0.name, a: g0.v, bn: g1.name, b: g1.v }) : fill(w.givenOne, { an: g0.name, a: g0.v, t: `${Math.round(task.angle)}°` });
  const facts = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  const ask = `${facts} ${q}`;
  const longName = (n: TrigName) => w.names[n];
  const why = (): string => {
    const s = d.said;
    if (!s || s.kind === "notice") return "";
    if (s.kind === "name") return w.nameWhy[s.why];
    if (s.kind === "ratio") {
      const [a, b] = RATIO_PARTS[s.r];
      return fill(w.ratioWhy, { r: rn[s.r], a: longName(a), b: longName(b), p: longName(pair[0]), q: longName(pair[1]) });
    }
    const slip = opSlip(task, s.op);
    const v = valueText(task, s.op, w.m);
    const k = "k" in p ? `${p.k} ${w.m}` : "";
    return fill(slip === "size" ? (right === "mul" ? w.opWhy.sizeTop : w.opWhy.sizeBottom) : w.opWhy[slip], { eq: opText(task, s.op, rn), v, k, r: rn[ratio], t: `${Math.round(task.angle)}°` });
  };
  const doneLine = `${fill(w.right, { eq: `${opText(task, right, rn)} = ${valueText(task, right, w.m)}`, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const stepHint =
    cur?.kind === "name" ? w.tap[cur.n]
    : cur?.kind === "ratio"
      ? // On hard nothing is named for the player: the ratio is asked for by the things in the picture.
        task.level === 3 ? fill(w.whichRatioHard, { p: sceneSides[sideOf(task.top, pair[0])], q: sceneSides[sideOf(task.top, pair[1])] }) : fill(w.whichRatio, { p: longName(pair[0]), q: longName(pair[1]) })
    : cur?.kind === "op" ? w.rearrange
    : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : d.said ? { tone: "wrong", text: `${why()} ${stepHint}` }
    : { tone: "hint", text: stepHint };

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={ask}>
          <rect width={W} height={H} fill="#fff" />
          <line x1={10} y1={GROUND} x2={W - 10} y2={GROUND} stroke="#868e96" strokeWidth={2} />
          {scene}
          {(["base", "up", "hyp"] as const).map((s) => {
            const [a, b] = L.ends[s];
            const st = sideStroke[s];
            return st.width > 0 && <line key={s} x1={r2(a[0])} y1={r2(a[1])} x2={r2(b[0])} y2={r2(b[1])} stroke={st.color} strokeWidth={st.width} strokeLinecap="round" />;
          })}
          {[...named].map((n) => {
            const [a, b] = L.ends[sideOf(task.top, n)];
            return <line key={`n${n}`} x1={r2(a[0])} y1={r2(a[1])} x2={r2(b[0])} y2={r2(b[1])} stroke={NAME_COLOR[n]} strokeWidth={6} strokeOpacity={0.45} strokeLinecap="round" />;
          })}
          <path d={`M${C[0] - out * 14},${GROUND} V${GROUND - 14} H${C[0]}`} fill="none" stroke="#1e1e1e" strokeWidth={1.6} />
          <path d={arcAt(thetaAt, ta, tb, thetaArcR)} fill="none" stroke={task.ask === "ang" && !d.done ? "#e03131" : "#2f9e44"} strokeWidth={2.5} />
          {label(labelAt, thetaLabel, task.ask === "ang" ? (d.done ? "#2f9e44" : "#e03131") : "#2f9e44", 16)}
          {ghost}
          {(["base", "up", "hyp"] as const).map((s) => (
            <g key={`l${s}`}>{sideLabel(s)}</g>
          ))}
          {tapping &&
            (["base", "up", "hyp"] as const).map((s) => {
              const [a, b] = L.ends[s];
              return (
                <line
                  key={`t${s}`}
                  className="trig-side"
                  role="button"
                  tabIndex={0}
                  aria-label={sceneSides[s]}
                  x1={r2(a[0])}
                  y1={r2(a[1])}
                  x2={r2(b[0])}
                  y2={r2(b[1])}
                  stroke="transparent"
                  strokeWidth={26}
                  strokeLinecap="round"
                  style={{ cursor: "pointer" }}
                  onPointerDown={() => tapSide(s)}
                  onKeyDown={keyTap(s)}
                />
              );
            })}
        </svg>
      </Stage>
      {ratioDone && (
        <p className="live-said geo-prompt mono" style={{ margin: "4px 0" }}>
          {ratioText(task, rn)}
          {d.done ? `  ⇒  ${opText(task, right, rn)} = ${valueText(task, right, w.m)}` : ""}
        </p>
      )}
      <GameActions game={game} g={g} done={d.done}>
        {cur?.kind === "ratio" &&
          RATIOS.map((r) => (
            <button key={r} className="live-btn on" onClick={() => pickRatio(r)}>
              {task.level === 3 ? rn[r] : `${rn[r]} = ${w.short[RATIO_PARTS[r][0]]} / ${w.short[RATIO_PARTS[r][1]]}`}
            </button>
          ))}
        {cur?.kind === "op" &&
          task.ops.map((op) => (
            <button key={op} className="live-btn on" disabled={op === wrongOp} onClick={() => pickOp(op)}>
              {opText(task, op, rn)}
            </button>
          ))}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
