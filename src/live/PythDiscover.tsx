// Discover Pythagoras: a² + b² = c² found before it is named. Easy draws a right triangle on a grid with a square on
// each side, its area written in it: drag the ends of a and b to change the shape, measure three triangles or more
// (a and b each changed at least once), then make a rule (a or a², + − or ×, b or b², against c or c²) and claim it
// when it holds in every row; trying is free, a rule claimed that fails costs a star. The later puzzles make a shorter
// side from the other two (c² − a² = b²). Medium keeps a and b and opens or closes the corner between them; the table
// sorts by angle with c² against a² + b², and the claim is a corner where c² equals, beats or falls short of a² + b²
// (only 90° makes them equal). Hard uses it: two sides measured, the third out of reach, four lengths to choose from,
// a wrong one told why. "Why?" steps through the level's idea with a picture and costs no stars.
import { useState, type KeyboardEvent, type PointerEvent, type ReactElement } from "react";
import {
  c2At,
  codeOf,
  CORNER_RANGE,
  enoughRows,
  holds,
  holdsAll,
  LEG_RANGE,
  leftOf,
  leftText,
  legsOf,
  meets,
  numText,
  P_OPS,
  partsOf,
  PYTH_LADDER,
  PYTH_NOTICES,
  pythNotice,
  pythNow,
  pythStars,
  reachSlip,
  rightOf,
  ROWS_MAX,
  ROWS_NEEDED,
  ruleOf,
  ruleText,
  sideOf,
  termText,
  type Legs,
  type LivePythDiscover,
  type POp,
  type Pow,
  type Side,
} from "../math/pythDiscover";
import { starText } from "./ladderUi";
import { isPythStep, PythPicture, type PythStep } from "./PythagorasWhy";
import { Choice } from "./TrigDiscover";
import { arcAt, type P } from "./TrigBuild";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { WhySteps } from "./WhySteps";

const FRESH: Partial<LivePythDiscover> = { n: null, rows: [], p1: null, op: null, p2: null, pr: null, tried: [], misses: 0, done: false, said: null };
const W = 600;
const H = 340;
const r1 = (v: number) => Math.round(v * 10) / 10;
const TABLE_X = 336;
const ROW_Y = 66;
const ROW_H = 24;
/** The sides' colours, as the trig games colour them: a along the bottom teal, b up purple, c blue. */
const COLOR: Record<Side, string> = { a: "#0c8599", b: "#9c36b5", c: "#1971c2" };
/** Medium's corner and pixels a unit. */
const CORNER: P = [165, 300];
const U2 = 30;

type OwnWhy = "name" | "open" | "close" | "ninety" | "root";
type Why = PythStep | OwnWhy;
const WHYS: Record<1 | 2 | 3, Why[]> = { 1: ["squares", "sum", "proof", "name"], 2: ["open", "close", "ninety"], 3: ["findHyp", "findLeg", "root"] };

/** A right triangle with its three squares, `u` pixels a unit, the right angle at `o`: a along, b up, c's square outward. */
function squaresOf(l: Legs, u: number, o: P) {
  const px = ([x, y]: P): P => [r1(o[0] + x * u), r1(o[1] - y * u)];
  const { a, b } = l;
  const C: P = [0, 0];
  const A: P = [a, 0];
  const B: P = [0, b];
  const sq: Record<Side, P[]> = {
    a: [C, A, [a, -a], [0, -a]],
    b: [C, B, [-b, b], [-b, 0]],
    c: [A, B, [b, a + b], [a + b, a]],
  };
  const mid = (q: P[]): P => [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2];
  return { px, A: px(A), B: px(B), C: px(C), squares: sq, centre: (s: Side) => px(mid(sq[s])) };
}

export function PythDiscover({ state: d, set, w: words, svgRef }: PieceProps<"pythDiscover">) {
  const [w, pw, g] = [words.pythDiscover, words.pythWhy, words.game];
  const [explain, setExplain] = useState<number | null>(null);
  // Where a dragged corner is; the board hears only where it is let go.
  const [dragged, setDragged] = useState<{ which: "a" | "b" | "corner"; n: number } | null>(null);
  const game = useGame({ key: "zeno.pythdiscover.v1", size: PYTH_LADDER.length, notices: PYTH_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = pythNow(d);
  const stars = pythStars(d.misses);
  const deg = (v: number) => `${v}°`;

  // ---------- where the triangle is ----------

  const start = task.level === 1 ? codeOf(task.start) : task.level === 2 ? task.start : 0;
  const committed = d.n ?? start;
  const legsNow: Legs =
    task.level === 1 ? legsOf(dragged && dragged.which !== "corner" ? codeOf({ ...legsOf(committed), [dragged.which]: dragged.n }) : committed)
    : task.level === 2 ? task.legs
    : { a: task.sides.a, b: task.sides.b };
  const corner = task.level === 2 ? (dragged?.which === "corner" ? dragged.n : committed) : 90;
  const rowsL1 = task.level === 1 ? d.rows.map(legsOf) : [];
  const form = task.level === 1 ? task.form : "c";
  const rule = ruleOf(form, d);

  // ---------- the moves ----------

  const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));
  const L1 = squaresOf(legsNow, 20, [110, 220]);
  const fromPoint = (which: "a" | "b" | "corner", p: P): number => {
    if (which === "a") return clamp(Math.round((p[0] - L1.C[0]) / 20), LEG_RANGE);
    if (which === "b") return clamp(Math.round((L1.C[1] - p[1]) / 20), LEG_RANGE);
    return clamp(Math.round((Math.atan2(CORNER[1] - p[1], p[0] - CORNER[0]) * 180) / Math.PI), CORNER_RANGE);
  };
  const commit = (which: "a" | "b" | "corner", n: number) => {
    const next = which === "corner" ? n : codeOf({ ...legsOf(committed), [which]: n });
    if (next !== committed) game.tap({ n: next, said: d.said?.kind === "again" ? null : d.said });
  };
  const at = (e: PointerEvent) => (svgRef.current ? svgPoint(svgRef.current, e) : ([0, 0] as P));
  const down = (which: "a" | "b" | "corner") => (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragged({ which, n: fromPoint(which, at(e)) });
  };
  const move = (e: PointerEvent) => dragged && setDragged({ ...dragged, n: fromPoint(dragged.which, at(e)) });
  const up = () => {
    if (!dragged) return;
    setDragged(null);
    commit(dragged.which, dragged.n);
  };
  const key = (which: "a" | "b" | "corner") => (e: KeyboardEvent) => {
    const by = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    if (which === "corner") return commit(which, clamp(committed + by, CORNER_RANGE));
    commit(which, clamp(legsOf(committed)[which] + by, LEG_RANGE));
  };

  const measure = () => {
    if (d.rows.includes(committed)) return game.tap({ said: { kind: "again" } });
    const more = [...d.rows, committed].sort((x, y) => x - y);
    const kept = task.level === 2 && more.length > ROWS_MAX ? more.filter((x) => x !== d.rows[0]) : more;
    if (task.level === 1 && !enoughRows(rowsL1) && enoughRows(kept.map(legsOf))) return game.step({ rows: kept, said: null }, { counts: false });
    game.tap({ rows: kept, said: null });
  };
  const choose = (patch: Partial<Pick<LivePythDiscover, "p1" | "op" | "p2" | "pr">>) => {
    const next = { p1: d.p1, op: d.op, p2: d.p2, pr: d.pr, ...patch };
    const r = ruleOf(form, next);
    const last = d.tried[d.tried.length - 1];
    const fresh = r && !(last && ruleText(last) === ruleText(r));
    game.tap({ ...next, tried: fresh ? [...d.tried, r].slice(-4) : d.tried, said: null });
  };
  const winNow = () => game.win({ stars, clean: d.misses === 0, notice: (streak) => pythNotice(task, d.misses, streak), patch: { done: true } });
  const claim = () => {
    if (task.level !== 1 || !rule) return;
    if (holdsAll(rule, rowsL1)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "fails", rule } });
  };
  const here = () => {
    if (task.level !== 2) return;
    if (meets(task.goal, committed)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "off", at: committed } });
  };
  const pick = (v: number) => {
    if (task.level !== 3) return;
    if (!reachSlip(task, v)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "pick", v } });
  };

  // ---------- the words ----------

  const s2 = (l: Legs) => l.a * l.a + l.b * l.b;
  const [x, y, z] = partsOf(form);
  const prompt =
    task.level === 1 ? fill(w.prompt.grow, { z, x, y })
    : task.level === 2 ? fill(w.prompt.turn, { a: String(task.legs.a), b: String(task.legs.b), goal: w.goal[task.goal] })
    : fill(w.prompt.reach, { known: (["a", "b", "c"] as const).filter((s) => s !== task.missing).map((s) => `${s} = ${task.sides[s]}`).join(", "), s: task.missing });
  const stepHint =
    task.level === 1 ?
      d.rows.length < ROWS_NEEDED ? fill(w.measureHint, { n: String(d.rows.length), of: String(ROWS_NEEDED) })
      : !enoughRows(rowsL1) ? w.varyHint
      : rule ? w.claimHint
      : w.tryHint
    : task.level === 2 ? w.turnHint
    : w.reachHint;
  const eqOf = (missing: Side, sides: { a: number; b: number; c: number }) => {
    if (missing === "c") return `c² = ${sides.a}² + ${sides.b}²`;
    const other = missing === "a" ? "b" : "a";
    return `${missing}² = ${sides.c}² − ${sides[other]}²`;
  };
  const why = (): { tone: "wrong" | "hint"; text: string } | null => {
    const s = d.said;
    if (!s || s.kind === "notice") return null;
    if (s.kind === "again") return { tone: "hint", text: w.again };
    if (s.kind === "fails" && task.level === 1) {
      const bad = rowsL1.find((l) => !holds(s.rule, l)) ?? rowsL1[0];
      return { tone: "wrong", text: fill(w.fails, { r: ruleText(s.rule), l: numText(leftOf(s.rule, bad)), rr: numText(rightOf(s.rule, bad)), a: String(bad.a), b: String(bad.b) }) };
    }
    if (s.kind === "off" && task.level === 2) {
      const c2 = c2At(task.legs, s.at);
      const sum = s2(task.legs);
      const rel = c2 > sum + 1e-9 ? w.rel.more : c2 < sum - 1e-9 ? w.rel.less : w.rel.equal;
      const toward = task.goal === "less" || (task.goal === "equal" && s.at > 90) ? w.closer : w.wider;
      return { tone: "wrong", text: `${fill(w.off, { t: deg(s.at), c2: numText(c2), s: String(sum), rel })} ${toward}` };
    }
    if (s.kind === "pick" && task.level === 3) {
      const slip = reachSlip(task, s.v) ?? "sides";
      const key = slip === "noRoot" ? "noRoot" : `${slip}${task.missing === "c" ? "Hyp" : "Leg"}`;
      return { tone: "wrong", text: fill(w.reachWhy[key as keyof typeof w.reachWhy], { v: numText(s.v), eq: eqOf(task.missing, task.sides) }) };
    }
    return null;
  };
  const doneText = (): string => {
    const st = starText(stars);
    if (task.level === 1 && rule) return fill(form === "c" ? w.rightGrow : w.rightLeg, { r: ruleText(rule), stars: st });
    if (task.level === 2) return fill(w.rightTurn[task.goal], { t: deg(committed), c2: numText(c2At(task.legs, committed)), s: String(s2(task.legs)), stars: st });
    if (task.level === 3) {
      const v = task.sides[task.missing];
      return fill(w.rightReach, { eq: eqOf(task.missing, task.sides), sq: String(v * v), s: task.missing, v: String(v), stars: st });
    }
    return st;
  };
  const doneLine = `${doneText()}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = why();
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : said ? { tone: said.tone, text: said.tone === "hint" ? said.text : `${said.text} ${stepHint}` }
    : { tone: "hint", text: stepHint };
  const whys = WHYS[task.level];
  const whyText = (s: Why) => (isPythStep(s) ? pw.steps[s] : w.whyText[s]);

  // ---------- the picture ----------

  const text = (p: P, s: string, color: string, size = 15, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={r1(p[0])} y={r1(p[1] + size * 0.35)} fontSize={size} fontWeight={700} textAnchor={anchor} fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {s}
    </text>
  );
  const handle = (which: "a" | "b" | "corner", p: P, label: string, now: number, range: [number, number], valueText: string) => (
    <g
      role="slider"
      tabIndex={0}
      className="disc-handle"
      aria-label={label}
      aria-valuemin={range[0]}
      aria-valuemax={range[1]}
      aria-valuenow={now}
      aria-valuetext={valueText}
      style={{ cursor: "grab" }}
      onPointerDown={down(which)}
      onPointerMove={move}
      onPointerUp={up}
      onKeyDown={key(which)}
    >
      <circle cx={p[0]} cy={p[1]} r={20} fill="transparent" />
      <circle cx={p[0]} cy={p[1]} r={8} fill="#f08c00" stroke="#fff" strokeWidth={2} />
    </g>
  );

  /** A right triangle with its squares and their areas: easy at 20 pixels a unit, hard fitted to its numbers. */
  const withSquares = (l: Legs, u: number, o: P, area: (s: Side) => string, sideText: (s: Side) => string, hot: Side | null) => {
    const T = squaresOf(l, u, o);
    const ends: Record<Side, [P, P]> = { a: [T.C, T.A], b: [T.C, T.B], c: [T.A, T.B] };
    return (
      <g>
        {(["a", "b", "c"] as const).map((s) => (
          <g key={`sq${s}`}>
            <polygon points={T.squares[s].map((p) => T.px(p).join(",")).join(" ")} fill={COLOR[s]} fillOpacity={hot === s ? 0.06 : 0.16} stroke={COLOR[s]} strokeWidth={1.5} strokeDasharray={hot === s ? "5 4" : undefined} />
            {text(T.centre(s), area(s), COLOR[s], l.a <= 1 && s !== "c" ? 12 : 16)}
          </g>
        ))}
        <polygon points={`${T.A.join(",")} ${T.B.join(",")} ${T.C.join(",")}`} fill="#fff" stroke="none" />
        {(["a", "b", "c"] as const).map((s) => {
          const [p, q] = ends[s];
          return <line key={s} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={COLOR[s]} strokeWidth={3.5} strokeLinecap="round" />;
        })}
        <path d={`M${T.C[0] + 10},${T.C[1]} L${T.C[0] + 10},${T.C[1] - 10} L${T.C[0]},${T.C[1] - 10}`} fill="none" stroke="#1e1e1e" strokeWidth={1.4} />
        {(["a", "b", "c"] as const).map((s) => {
          const label = sideText(s);
          const [p, q] = ends[s];
          // A small square has room for its area only; the side's length is beside the drawing too.
          if (!label || Math.hypot(q[0] - p[0], q[1] - p[1]) < 56) return null;
          const m: P = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          // Just inside the side's own square, away from the triangle.
          const c = T.centre(s);
          const k = Math.min(0.5, 14 / (Math.hypot(c[0] - m[0], c[1] - m[1]) || 1));
          return <g key={`t${s}`}>{text([m[0] + (c[0] - m[0]) * k, m[1] + (c[1] - m[1]) * k], label, hot === s ? "#e03131" : COLOR[s], 13)}</g>;
        })}
      </g>
    );
  };

  const gridLines: ReactElement[] = [];
  if (task.level === 1) {
    for (let i = 0; i <= 15; i++) {
      gridLines.push(<line key={`x${i}`} x1={10 + i * 20} y1={20} x2={10 + i * 20} y2={320} stroke="#f1f3f5" />);
      gridLines.push(<line key={`y${i}`} x1={10} y1={20 + i * 20} x2={310} y2={20 + i * 20} stroke="#f1f3f5" />);
    }
  }

  // Medium: the two sides of the corner, and the long side across it.
  const M = (() => {
    const r = (corner * Math.PI) / 180;
    const l = task.level === 2 ? task.legs : { a: 0, b: 0 };
    const A: P = [CORNER[0] + l.a * U2, CORNER[1]];
    const B: P = [r1(CORNER[0] + l.b * U2 * Math.cos(r)), r1(CORNER[1] - l.b * U2 * Math.sin(r))];
    return { A, B };
  })();

  // Hard: the triangle fitted to the box beside the panel.
  const hardFit = (l: Legs) => {
    const u = Math.min(296 / (l.a + 2 * l.b), 296 / (2 * l.a + l.b));
    return { u, o: [r1(12 + l.b * u + (296 - (l.a + 2 * l.b) * u) / 2), r1(22 + (l.a + l.b) * u)] as P };
  };

  // The tables: easy's a, b, c and the rule's two sides; medium's corner, c, c², the comparison and a² + b².
  type Head = { label: string; color: string; w: number };
  const heads: Head[] =
    task.level === 1 ?
      [
        { label: "a", color: COLOR.a, w: 34 },
        { label: "b", color: COLOR.b, w: 34 },
        { label: "c", color: COLOR.c, w: 48 },
        { label: rule ? leftText(rule) : "?", color: "#1e1e1e", w: 84 },
        { label: rule ? termText(z, rule.pr) : "?", color: "#1e1e1e", w: 46 },
      ]
    : [
        { label: "∠C", color: "#2f9e44", w: 44 },
        { label: "c", color: COLOR.c, w: 48 },
        { label: "c²", color: COLOR.c, w: 50 },
        { label: "", color: "#1e1e1e", w: 24 },
        { label: "a² + b²", color: "#1e1e1e", w: 76 },
      ];
  const xs = heads.reduce<number[]>((acc, h, i) => [...acc, (acc[i - 1] ?? TABLE_X) + (i ? heads[i - 1].w : 0)], []);
  const tableRows: { cells: string[]; ok: boolean | null }[] =
    task.level === 1 ?
      rowsL1.map((l) => ({
        cells: [String(l.a), String(l.b), numText(sideOf("c", l)), rule ? numText(leftOf(rule, l)) : "", rule ? numText(rightOf(rule, l)) : ""],
        ok: rule ? holds(rule, l) : null,
      }))
    : task.level === 2 ?
      d.rows.map((t) => {
        const c2 = c2At(task.legs, t);
        const sum = s2(task.legs);
        return { cells: [deg(t), numText(Math.sqrt(c2)), numText(c2), c2 > sum ? ">" : c2 < sum ? "<" : "=", String(sum)], ok: null };
      })
    : [];

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={prompt} style={{ touchAction: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {gridLines}
          {task.level === 1 && (
            <>
              {withSquares(legsNow, 20, [110, 220], (s) => String(s === "c" ? s2(legsNow) : legsNow[s] ** 2), () => "", null)}
              {!d.done && handle("a", L1.A, w.sideA, legsNow.a, LEG_RANGE, `a ${legsNow.a}`)}
              {!d.done && handle("b", L1.B, w.sideB, legsNow.b, LEG_RANGE, `b ${legsNow.b}`)}
            </>
          )}
          {task.level === 2 && (
            <g>
              <path d={`M${CORNER[0] + task.legs.b * U2},${CORNER[1]} A${task.legs.b * U2},${task.legs.b * U2} 0 0 0 ${r1(CORNER[0] + task.legs.b * U2 * Math.cos((CORNER_RANGE[1] * Math.PI) / 180))},${r1(CORNER[1] - task.legs.b * U2 * Math.sin((CORNER_RANGE[1] * Math.PI) / 180))}`} fill="none" stroke="#ced4da" strokeDasharray="4 5" />
              <polygon points={`${CORNER.join(",")} ${M.A.join(",")} ${M.B.join(",")}`} fill="#f8f9fa" />
              <line x1={CORNER[0]} y1={CORNER[1]} x2={M.A[0]} y2={M.A[1]} stroke={COLOR.a} strokeWidth={3.5} strokeLinecap="round" />
              <line x1={CORNER[0]} y1={CORNER[1]} x2={M.B[0]} y2={M.B[1]} stroke={COLOR.b} strokeWidth={3.5} strokeLinecap="round" />
              <line x1={M.A[0]} y1={M.A[1]} x2={M.B[0]} y2={M.B[1]} stroke={COLOR.c} strokeWidth={3.5} strokeLinecap="round" />
              <path d={arcAt(CORNER, M.A, M.B, 24)} fill="none" stroke="#2f9e44" strokeWidth={2.5} />
              {corner === 90 && <path d={`M${CORNER[0] + 10},${CORNER[1]} L${CORNER[0] + 10},${CORNER[1] - 10} L${CORNER[0]},${CORNER[1] - 10}`} fill="none" stroke="#2f9e44" strokeWidth={1.6} />}
              {text([300, 34], `∠C = ${deg(corner)}`, "#2f9e44", 18, "end")}
              {text([(CORNER[0] + M.A[0]) / 2, CORNER[1] + 18], `a ${task.legs.a}`, COLOR.a, 14)}
              {text([(CORNER[0] + M.B[0]) / 2 - 14, (CORNER[1] + M.B[1]) / 2], `b ${task.legs.b}`, COLOR.b, 14, "end")}
              {text([(M.A[0] + M.B[0]) / 2 + 12, (M.A[1] + M.B[1]) / 2 - 8], `c ${numText(Math.sqrt(c2At(task.legs, corner)))}`, COLOR.c, 14, "start")}
              {!d.done && handle("corner", M.B, w.cornerLabel, corner, CORNER_RANGE, deg(corner))}
              <text x={TABLE_X} y={214} fontSize={16} fontWeight={700} fill="#f08c00">{w.goalTag[task.goal]}</text>
            </g>
          )}
          {task.level === 3 &&
            (() => {
              const l = { a: task.sides.a, b: task.sides.b };
              const f = hardFit(l);
              const hot = d.done ? null : task.missing;
              return (
                <>
                  {withSquares(l, f.u, f.o, (s) => (s === hot ? "?" : String(task.sides[s] ** 2)), (s) => (s === hot ? `${s} ?` : `${s} ${task.sides[s]}`), hot)}
                  <g fontSize={15} fontWeight={700}>
                    {(["a", "b", "c"] as const).map((s, i) => (
                      <text key={s} x={TABLE_X + 10} y={70 + i * 30} fill={COLOR[s]}>
                        {s === hot ? `${s} = ? · ${s}² = ?` : `${s} = ${task.sides[s]} · ${s}² = ${task.sides[s] ** 2}`}
                      </text>
                    ))}
                  </g>
                </>
              );
            })()}

          {/* The table. */}
          {task.level !== 3 && (
            <g fontSize={14}>
              {heads.map((h, i) => (
                <text key={`h${i}`} x={xs[i] + h.w / 2} y={44} textAnchor="middle" fontWeight={700} fill={h.color}>
                  {h.label}
                </text>
              ))}
              <line x1={TABLE_X} y1={52} x2={xs[xs.length - 1] + heads[heads.length - 1].w} y2={52} stroke="#adb5bd" />
              {tableRows.length === 0 && (
                <text x={TABLE_X + 118} y={ROW_Y + 16} textAnchor="middle" fill="#868e96" fontSize={13}>
                  {w.emptyTable}
                </text>
              )}
              {tableRows.map((r, i) => {
                const yy = ROW_Y + i * ROW_H;
                return (
                  <g key={`r${d.rows[i]}`}>
                    {r.ok !== null &&
                      [3, 4].map((j) => <rect key={j} x={xs[j] + 2} y={yy - 2} width={heads[j].w - 4} height={ROW_H - 4} rx={4} fill={r.ok ? "#ebfbee" : "#fff4e6"} />)}
                    {r.cells.map((c, j) => (
                      <text key={j} x={xs[j] + heads[j].w / 2} y={yy + 15} textAnchor="middle" fontWeight={j >= 3 ? 700 : 400} fill={r.ok === null || j < 3 ? "#1e1e1e" : r.ok ? "#2f9e44" : "#e8590c"}>
                        {c}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          )}
          {/* Easy: the rules tried before this one, and whether each held. */}
          {task.level === 1 && enoughRows(rowsL1) && d.tried.length > 1 && (
            <g fontSize={13}>
              <text x={TABLE_X} y={206} fill="#868e96">{w.triedTag}</text>
              {d.tried.slice(0, -1).reverse().map((r, i) => {
                const ok = holdsAll(r, rowsL1);
                return (
                  <text key={`t${i}`} x={TABLE_X} y={226 + i * 20} fill={ok ? "#2f9e44" : "#e8590c"}>
                    {`${ruleText(r)}: ${ok ? w.holdsTag : w.failsTag}`}
                  </text>
                );
              })}
            </g>
          )}
        </svg>
      </Stage>
      {explain !== null && (
        <WhySteps
          at={explain}
          of={whys.length}
          text={whyText(whys[explain])}
          back={w.whyBack}
          next={w.whyNext}
          onStep={setExplain}
          picture={isPythStep(whys[explain]) ? <PythPicture step={whys[explain] as PythStep} /> : <OwnPicture step={whys[explain] as OwnWhy} />}
        />
      )}
      {!d.done && task.level === 1 && enoughRows(rowsL1) && (
        <div className="live-bar disc-build">
          <Choice label={w.first} options={["1", "2"] as const} on={d.p1 ? (String(d.p1) as "1" | "2") : null} text={(p) => termText(x, Number(p) as Pow)} color={() => COLOR[x]} pick={(p) => choose({ p1: Number(p) as Pow })} />
          <Choice label={w.opLabel} options={P_OPS} on={d.op} text={(o: POp) => o} pick={(op) => choose({ op })} />
          <Choice label={w.second} options={["1", "2"] as const} on={d.p2 ? (String(d.p2) as "1" | "2") : null} text={(p) => termText(y, Number(p) as Pow)} color={() => COLOR[y]} pick={(p) => choose({ p2: Number(p) as Pow })} />
          <span aria-hidden>=</span>
          <Choice label={w.equals} options={["1", "2"] as const} on={d.pr ? (String(d.pr) as "1" | "2") : null} text={(p) => termText(z, Number(p) as Pow)} color={() => COLOR[z]} pick={(p) => choose({ pr: Number(p) as Pow })} />
          <button className="live-btn on" disabled={!rule} onClick={claim}>
            ✓ {w.claim}
          </button>
        </div>
      )}
      <GameActions game={game} g={g} done={d.done} always>
        {!d.done && task.level !== 3 && (
          <button className="live-btn" disabled={task.level === 1 && d.rows.length >= ROWS_MAX} onClick={measure}>
            📏 {w.measure}
          </button>
        )}
        {!d.done && task.level === 2 && (
          <button className="live-btn on" onClick={here}>
            ✓ {w.here}
          </button>
        )}
        {!d.done &&
          task.level === 3 &&
          task.choices.map((v) => (
            <button key={v} className="live-btn on" disabled={d.said?.kind === "pick" && d.said.v === v} onClick={() => pick(v)}>
              {numText(v)}
            </button>
          ))}
        <button className={`live-btn${explain !== null ? " on" : ""}`} aria-pressed={explain !== null} onClick={() => setExplain(explain !== null ? null : 0)}>
          💡 {w.why}
        </button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** The explanation's own pictures: the corner opened, closed and square; the root of a square taken. */
function OwnPicture({ step }: { step: OwnWhy }) {
  const say = (lines: string[], x = 88) =>
    lines.map((s, i) => (
      <text key={s} x={x} y={36 + i * 24} fontSize={13} fontWeight={700} textAnchor="middle" fill="#1e1e1e">
        {s}
      </text>
    ));
  const O: P = [54, 96];
  const corner = (deg: number, color: string) => {
    const r = (deg * Math.PI) / 180;
    const A: P = [O[0] + 60, O[1]];
    const B: P = [r1(O[0] + 70 * Math.cos(r)), r1(O[1] - 70 * Math.sin(r))];
    return (
      <g key={deg}>
        <line x1={O[0]} y1={O[1]} x2={B[0]} y2={B[1]} stroke={COLOR.b} strokeWidth={2} />
        <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={color} strokeWidth={2} strokeDasharray={color === COLOR.c ? undefined : "4 3"} />
      </g>
    );
  };
  const base = <line x1={O[0]} y1={O[1]} x2={O[0] + 60} y2={O[1]} stroke={COLOR.a} strokeWidth={2} />;
  const body =
    step === "name" ? say(["a² + b² = c²", "Pythagoras"])
    : step === "root" ? say(["c² = 100", "c = √100 = 10"])
    : step === "open" ? <>{base}{corner(90, "#adb5bd")}{corner(120, COLOR.c)}{say(["c² > a² + b²"], 134)}</>
    : step === "close" ? <>{base}{corner(90, "#adb5bd")}{corner(60, COLOR.c)}{say(["c² < a² + b²"], 134)}</>
    : <>{base}{corner(90, COLOR.c)}{say(["3, 4, 5", "9 + 16 = 25"], 134)}</>;
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" aria-hidden fontFamily={FONT} style={{ flex: "none" }}>
      <rect width={176} height={112} rx={6} fill="#fff" />
      {body}
    </svg>
  );
}
