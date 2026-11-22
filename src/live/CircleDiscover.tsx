// Discover the unit circle: sin and cos past 90° found from the first quarter before they are told. Easy draws P on a
// circle of radius 1 in the first quarter and its mirror Q in another quarter: drag P, measure three angles or more
// into the table (θ, P's across x and up y, Q's angle, across and up), then make a rule for Q (180° − θ, 180° + θ,
// 360° − θ or 90° + θ; x, −x, y or −y for each of its across and up) and claim it when it holds in every row; each
// part is lit green or orange row by row, trying is free, a rule claimed that fails costs a star, and the one found is
// named (sin(180° − θ) = sin θ). Medium lets P go all the way round: an angle's sin or cos is given, measure as P turns
// and stop at the other angle with the same value. Hard uses it: sin or cos of an angle past 90°, out of reach, from
// the first-quarter angle it mirrors; four values to choose from, a wrong one told why (the sign, sin and cos swapped,
// both). "Why?" steps through the level's idea with a picture and costs no stars.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  ANGLE_RULES,
  angleText,
  CIRCLE_DISCOVER_LADDER,
  CIRCLE_DISCOVER_NOTICES,
  circleDiscoverNotice,
  circleDiscoverNow,
  circleDiscoverStars,
  cosOf,
  FIRST_RANGE,
  fnOf,
  holdsAll,
  mirrorAngle,
  mirrorRuleOf,
  norm,
  numText,
  partsHold,
  reachSlip,
  refOf,
  ROWS_MAX,
  ROWS_NEEDED,
  ruleText,
  sinOf,
  STEP,
  twinOf,
  X_COORDS,
  Y_COORDS,
  type AngleRule,
  type CircleFn,
  type Coord,
  type LiveCircleDiscover,
  type Mirror,
} from "../math/circleDiscover";
import { starText } from "./ladderUi";
import type { P } from "./TrigBuild";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { WhySteps } from "./WhySteps";
import { barHeight, DiscoverBar, type BarGroup, type BarPill } from "./DiscoverBar";
import { pointIn, useDrag } from "./hand";

const FRESH: Partial<LiveCircleDiscover> = { n: null, rows: [], qa: null, qx: null, qy: null, tried: [], misses: 0, done: false, said: null };
const W = 600;
const H = 340;
const [CX, CY, R] = [150, 172, 118];
const RAD = Math.PI / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;
const at = (t: number, r = R): P => [r1(CX + r * Math.cos(t * RAD)), r1(CY - r * Math.sin(t * RAD))];
const TABLE_X = 312;
const ROW_Y = 66;
const ROW_H = 24;
/** The across (cos) teal and the up (sin) purple, as the other trig games colour them; Q grey. */
const X_COLOR = "#0c8599";
const Y_COLOR = "#9c36b5";
const Q_COLOR = "#495057";
const ANGLE_COLOR = "#2f9e44";
const deg = (t: number) => `${t}°`;

type Why = "mirror" | "signs" | "nameUp" | "nameCentre" | "nameAcross" | "twice" | "sinTwin" | "cosTwin" | "ref" | "sign" | "which";
const NAME_WHY: Record<Mirror, Why> = { up: "nameUp", centre: "nameCentre", across: "nameAcross" };

export function CircleDiscover({ state: d, set, w: words, svgRef }: PieceProps<"circleDiscover">) {
  const [w, g] = [words.circleDiscover, words.game];
  const [explain, setExplain] = useState<number | null>(null);
  // Where P is while it is dragged; the board hears only where it is let go.
  const [dragged, setDragged] = useState<number | null>(null);
  const game = useGame({ key: "zeno.circlediscover.v1", size: CIRCLE_DISCOVER_LADDER.length, notices: CIRCLE_DISCOVER_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = circleDiscoverNow(d);
  const stars = circleDiscoverStars(d.misses);

  // ---------- where P is ----------

  const start = task.level === 3 ? task.angle : task.start;
  const committed = d.n ?? start;
  const p = dragged ?? committed;
  const rule = mirrorRuleOf(d);
  const mirror: Mirror = task.level === 1 ? task.mirror : "up";
  const enough = task.level === 1 && d.rows.length >= ROWS_NEEDED;

  // ---------- the moves ----------

  const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));
  const fromAngle = (raw: number) => {
    const t = Math.round(raw / STEP) * STEP;
    return task.level === 1 ? clamp(t, FIRST_RANGE) : norm(t);
  };
  const fromPoint = (e: PointerEvent) => {
    const [x, y] = svgRef.current ? svgPoint(svgRef.current, e) : [CX + 1, CY];
    return fromAngle(Math.atan2(CY - y, x - CX) / RAD);
  };
  const commit = (n: number) => {
    if (n !== committed) game.tap({ n, said: d.said?.kind === "again" ? null : d.said });
  };
  const down = (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragged(fromPoint(e));
  };
  const move = (e: PointerEvent) => dragged !== null && setDragged(fromPoint(e));
  const up = () => {
    if (dragged === null) return;
    setDragged(null);
    commit(dragged);
  };
  const key = (e: KeyboardEvent) => {
    const by = e.key === "ArrowUp" || e.key === "ArrowRight" ? STEP : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -STEP : 0;
    if (!by) return;
    e.preventDefault();
    commit(task.level === 1 ? clamp(committed + by, FIRST_RANGE) : norm(committed + by));
  };

  const measure = () => {
    if (d.rows.includes(committed)) return game.tap({ said: { kind: "again" } });
    const more = [...d.rows, committed].sort((x, y) => x - y);
    const kept = task.level === 2 && more.length > ROWS_MAX ? more.filter((x) => x !== d.rows[0]) : more;
    if (task.level === 1 && d.rows.length < ROWS_NEEDED && kept.length >= ROWS_NEEDED) return game.step({ rows: kept, said: null }, { counts: false });
    game.tap({ rows: kept, said: null });
  };
  const choose = (patch: Partial<Pick<LiveCircleDiscover, "qa" | "qx" | "qy">>) => {
    const next = { qa: d.qa, qx: d.qx, qy: d.qy, ...patch };
    const r = mirrorRuleOf(next);
    const last = d.tried[d.tried.length - 1];
    const fresh = r && !(last && ruleText(last) === ruleText(r));
    game.tap({ ...next, tried: fresh ? [...d.tried, r].slice(-4) : d.tried, said: null });
  };
  const winNow = () => game.win({ stars, clean: d.misses === 0, notice: (streak) => circleDiscoverNotice(task, d.misses, streak), patch: { done: true } });
  const claim = () => {
    if (task.level !== 1 || !rule) return;
    if (holdsAll(rule, mirror, d.rows)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "fails", rule } });
  };
  const here = () => {
    if (task.level !== 2) return;
    if (committed === twinOf(task.fn, task.given)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "off", at: committed } });
  };
  const pick = (v: number) => {
    if (task.level !== 3) return;
    if (!reachSlip(task, v)) return winNow();
    game.miss({ misses: d.misses + 1, said: { kind: "pick", v } });
  };

  // ---------- the words ----------

  const pair = (t: number) => `(${numText(cosOf(t))}, ${numText(sinOf(t))})`;
  const ref = task.level === 3 ? refOf(task.angle) : 0;
  const prompt =
    task.level === 1 ? fill(w.prompt.mirror, { where: w.where[task.mirror] })
    : task.level === 2 ? fill(w.prompt.twin, { fn: task.fn, g: deg(task.given), v: numText(fnOf(task.fn, task.given)) })
    : fill(w.prompt.reach, { fn: task.fn, t: deg(task.angle), r: deg(ref), s: numText(sinOf(ref)), c: numText(cosOf(ref)) });
  const stepHint =
    task.level === 1 ?
      !enough ? fill(w.measureHint, { n: String(d.rows.length), of: String(ROWS_NEEDED) })
      : rule ? w.claimHint
      : w.tryHint
    : task.level === 2 ? w.twinHint
    : w.reachHint;
  const why = (): { tone: "wrong" | "hint"; text: string } | null => {
    const s = d.said;
    if (!s || s.kind === "notice") return null;
    if (s.kind === "again") return { tone: "hint", text: w.again };
    if (s.kind === "fails" && task.level === 1) {
      const bad = d.rows.find((t) => !holdsAll(s.rule, mirror, [t])) ?? d.rows[0];
      const q = mirrorAngle(mirror, bad);
      return { tone: "wrong", text: fill(w.fails, { r: ruleText(s.rule), t: deg(bad), q: deg(q), qq: pair(q) }) };
    }
    if (s.kind === "off" && task.level === 2) {
      const text =
        s.at === task.given ? fill(w.offSelf, { g: deg(task.given) })
        : fill(w.off, { t: deg(s.at), fn: task.fn, v: numText(fnOf(task.fn, s.at)), target: numText(fnOf(task.fn, task.given)) });
      return { tone: "wrong", text: `${text} ${w.offHint[task.fn]}` };
    }
    if (s.kind === "pick" && task.level === 3) {
      const slip = reachSlip(task, s.v) ?? "sign";
      const value = fnOf(task.fn, task.angle);
      const place = task.fn === "sin" ? (value > 0 ? w.place.above : w.place.below) : value > 0 ? w.place.right : w.place.left;
      const other: CircleFn = task.fn === "sin" ? "cos" : "sin";
      return {
        tone: "wrong",
        text: fill(w.reachWhy[slip], { v: numText(s.v), t: deg(task.angle), fn: task.fn, place, pn: value > 0 ? w.positive : w.negative, other, r: deg(ref), part: w.part[task.fn], otherPart: w.part[other] }),
      };
    }
    return null;
  };
  const doneText = (): string => {
    const st = starText(stars);
    if (task.level === 1 && rule) return fill(w.rightMirror[task.mirror], { r: ruleText(rule), stars: st });
    if (task.level === 2) return fill(w.rightTwin[task.fn], { fn: task.fn, t: deg(committed), g: deg(task.given), v: numText(fnOf(task.fn, task.given)), stars: st });
    if (task.level === 3) return fill(w.rightReach, { fn: task.fn, t: deg(task.angle), r: deg(ref), v: numText(fnOf(task.fn, task.angle)), stars: st });
    return st;
  };
  const doneLine = `${doneText()}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = why();
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : said ? { tone: said.tone, text: said.tone === "hint" ? said.text : `${said.text} ${stepHint}` }
    : { tone: "hint", text: stepHint };
  const whys: Why[] =
    task.level === 1 ? ["mirror", "signs", NAME_WHY[task.mirror]]
    : task.level === 2 ? ["twice", "sinTwin", "cosTwin"]
    : ["ref", "sign", "which"];

  // ---------- the picture ----------

  const text = (q: P, s: string, color: string, size = 15, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={r1(q[0])} y={r1(q[1] + size * 0.35)} fontSize={size} fontWeight={700} textAnchor={anchor} fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {s}
    </text>
  );
  /** A point of the circle with its across and up drawn from the centre: solid for P, dashed for the others. */
  const point = (t: number, color: string, dashed: boolean) => {
    const q = at(t);
    const dash = dashed ? "5 4" : undefined;
    return (
      <g>
        <line x1={CX} y1={CY} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={dashed ? 1.5 : 2} strokeDasharray={dash} />
        <line x1={CX} y1={CY} x2={q[0]} y2={CY} stroke={X_COLOR} strokeWidth={dashed ? 2.5 : 4} strokeDasharray={dash} strokeLinecap="round" />
        <line x1={q[0]} y1={CY} x2={q[0]} y2={q[1]} stroke={Y_COLOR} strokeWidth={dashed ? 2.5 : 4} strokeDasharray={dash} strokeLinecap="round" />
        <circle cx={q[0]} cy={q[1]} r={dashed ? 5 : 6} fill={color} stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  };
  /** A label just outside the circle at an angle. */
  const outside = (t: number, s: string, color: string, size = 14) => {
    const q = at(t, R + 18);
    const c = Math.cos(t * RAD);
    return text(q, s, color, size, c > 0.3 ? "start" : c < -0.3 ? "end" : "middle");
  };
  /** Where P is now, under the circle, as it moves: its angle and its coordinates. */
  const where = (t: number) => (
    <text x={10} y={330} fontSize={14} fontWeight={700} fill="#1e1e1e">
      <tspan fill={ANGLE_COLOR}>{`θ = ${deg(t)}`}</tspan>
      <tspan dx={14}>{`P = ${pair(t)}`}</tspan>
    </text>
  );
  const arc = (t: number, r = 26) => {
    const [x, y] = at(t, r);
    const big = norm(t) > 180 ? 1 : 0;
    return <path d={`M${CX + r},${CY} A${r},${r} 0 ${big} 0 ${x},${y}`} fill="none" stroke={ANGLE_COLOR} strokeWidth={2} />;
  };
  const handle = (t: number) => {
    const q = at(t);
    return (
      <g
        role="slider"
        tabIndex={0}
        className="disc-handle"
        aria-label={w.pointLabel}
        aria-valuemin={task.level === 1 ? FIRST_RANGE[0] : 0}
        aria-valuemax={task.level === 1 ? FIRST_RANGE[1] : 355}
        aria-valuenow={t}
        aria-valuetext={deg(t)}
        style={{ cursor: "grab" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onKeyDown={key}
      >
        <circle cx={q[0]} cy={q[1]} r={20} fill="transparent" />
        <circle cx={q[0]} cy={q[1]} r={8} fill="#f08c00" stroke="#fff" strokeWidth={2} />
      </g>
    );
  };

  // The tables: easy's θ, P and Q; medium's θ with its cos and sin.
  type Head = { label: string; color: string; w: number };
  const heads: Head[] =
    task.level === 1 ?
      [
        { label: "θ", color: ANGLE_COLOR, w: 38 },
        { label: "x", color: X_COLOR, w: 46 },
        { label: "y", color: Y_COLOR, w: 46 },
        { label: w.qAt, color: Q_COLOR, w: 46 },
        { label: w.qx, color: Q_COLOR, w: 52 },
        { label: w.qy, color: Q_COLOR, w: 52 },
      ]
    : [
        { label: "θ", color: ANGLE_COLOR, w: 54 },
        { label: "cos θ", color: X_COLOR, w: 72 },
        { label: "sin θ", color: Y_COLOR, w: 72 },
      ];
  const xs = heads.reduce<number[]>((acc, h, i) => [...acc, (acc[i - 1] ?? TABLE_X) + (i ? heads[i - 1].w : 0)], []);
  const target = task.level === 2 ? numText(fnOf(task.fn, task.given)) : "";
  const tableRows: { cells: string[]; ok: (boolean | null)[] }[] =
    task.level === 1 ?
      d.rows.map((t) => {
        const q = mirrorAngle(mirror, t);
        const h = partsHold({ angle: d.qa ?? undefined, qx: d.qx ?? undefined, qy: d.qy ?? undefined }, mirror, t);
        return { cells: [deg(t), numText(cosOf(t)), numText(sinOf(t)), deg(q), numText(cosOf(q)), numText(sinOf(q))], ok: [null, null, null, h.angle, h.qx, h.qy] };
      })
    : task.level === 2 ?
      d.rows.map((t) => {
        const cells = [deg(t), numText(cosOf(t)), numText(sinOf(t))];
        const j = task.fn === "cos" ? 1 : 2;
        return { cells, ok: cells.map((c, i) => (i === j && c === target ? true : null)) };
      })
    : [];

  // ---------- the hands under the picture ----------

  const canMeasure = !d.done && task.level !== 3 && !(task.level === 1 && d.rows.length >= ROWS_MAX);
  // The circle dragged into the table (or tapped) is measured into it; P keeps its own drag.
  const tri = useDrag<object>((e) => canMeasure && (!e.moved || e.x > TABLE_X - 20) && measure());
  const startMeasure = (e: PointerEvent<SVGSVGElement>) => {
    if (!canMeasure || (e.target as Element).closest("[role=slider]")) return;
    const [x, y] = pointIn(e);
    if (x < TABLE_X - 12 && y < H) tri.begin(e, {});
  };
  const pills: BarPill[] = d.done ? [] : [
    ...(task.level !== 3 ? [{ text: `📏 ${w.measure}`, onTap: measure, disabled: !canMeasure }] : []),
    ...(task.level === 2 ? [{ text: `✓ ${w.here}`, onTap: here, strong: true }] : []),
    ...(enough ? [{ text: `✓ ${w.claim}`, onTap: claim, strong: true, disabled: !rule }] : []),
  ];
  const cards = !d.done && task.level === 3 ? { values: task.choices, text: numText, off: (v: number) => d.said?.kind === "pick" && d.said.v === v, pick } : undefined;
  const coord = (c: string) => (c.includes("x") ? X_COLOR : Y_COLOR);
  const groups: BarGroup[] | null = !d.done && enough ? [
    { label: w.qAngle, options: ANGLE_RULES, on: d.qa, text: (a) => angleText(a as AngleRule), pick: (a) => choose({ qa: a as AngleRule | null }) },
    { label: w.qAcross, options: X_COORDS, on: d.qx, text: (c) => c, color: coord, pick: (c) => choose({ qx: c as Coord | null }) },
    { label: w.qUp, options: Y_COORDS, on: d.qy, text: (c) => c, color: coord, pick: (c) => choose({ qy: c as Coord | null }) },
  ] : null;
  const whyPill = { text: `💡 ${w.why}`, on: explain !== null, onTap: () => setExplain(explain !== null ? null : 0) };
  const barH = barHeight({ w: W, pills, cards, groups, why: whyPill });

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + barH} viewBox={`0 0 ${W} ${H + barH}`} fontFamily={FONT} aria-label={prompt} style={{ touchAction: "none", cursor: tri.drag?.moved ? "grabbing" : undefined }}
          {...tri.svgProps} onPointerDown={startMeasure}>
          <rect width={W} height={H + barH} fill="#fff" />
          {canMeasure && <rect x={0} y={0} width={TABLE_X - 12} height={H} fill="transparent" style={{ cursor: "grab" }}><title>{w.measureDrag}</title></rect>}
          {/* The axes and the circle of radius 1. */}
          <line x1={CX - R - 20} y1={CY} x2={CX + R + 20} y2={CY} stroke="#ced4da" strokeWidth={1.5} />
          <line x1={CX} y1={CY - R - 20} x2={CX} y2={CY + R + 20} stroke="#ced4da" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1e1e" strokeWidth={2} />
          {text([CX + R + 4, CY + 14], "1", "#868e96", 12, "start")}
          {text([CX - R - 4, CY + 14], "−1", "#868e96", 12, "end")}
          {task.level === 1 && (
            <>
              {point(mirrorAngle(task.mirror, p), Q_COLOR, true)}
              {outside(mirrorAngle(task.mirror, p), "Q", Q_COLOR, 16)}
              {point(p, "#1971c2", false)}
              {arc(p)}
              {text(at(p / 2, 40), "θ", ANGLE_COLOR, 14)}
              {outside(p, "P", "#1e1e1e", 16)}
              {where(p)}
              {!d.done && handle(p)}
            </>
          )}
          {task.level === 2 && (
            <>
              {point(task.given, "#adb5bd", true)}
              {outside(task.given, deg(task.given), "#868e96", 13)}
              {point(p, "#1971c2", false)}
              {arc(p)}
              {outside(p, "P", "#1e1e1e", 16)}
              {where(p)}
              {!d.done && handle(p)}
              <text x={TABLE_X} y={214} fontSize={16} fontWeight={700} fill="#f08c00">
                {fill(w.goalTag, { fn: task.fn, v: target })}
              </text>
            </>
          )}
          {task.level === 3 && (
            <>
              {point(ref, "#adb5bd", true)}
              {outside(ref, deg(ref), "#868e96", 13)}
              {point(task.angle, "#1971c2", false)}
              {arc(task.angle)}
              {outside(task.angle, d.done ? deg(task.angle) : `${deg(task.angle)} ?`, d.done ? "#2f9e44" : "#e03131", 14)}
              <g fontSize={15} fontWeight={700}>
                <text x={TABLE_X + 10} y={60} fill="#868e96" fontSize={13} fontWeight={400}>{w.knownTag}</text>
                <text x={TABLE_X + 10} y={88} fill={Y_COLOR}>{`sin ${deg(ref)} = ${numText(sinOf(ref))}`}</text>
                <text x={TABLE_X + 10} y={114} fill={X_COLOR}>{`cos ${deg(ref)} = ${numText(cosOf(ref))}`}</text>
                <text x={TABLE_X + 10} y={160} fill="#1e1e1e" fontSize={20}>{`${task.fn} ${deg(task.angle)} = ${d.done ? numText(fnOf(task.fn, task.angle)) : "?"}`}</text>
              </g>
            </>
          )}

          {/* The table. */}
          {task.level !== 3 && (
            <g fontSize={13}>
              {heads.map((h, i) => (
                <text key={`h${i}`} x={xs[i] + h.w / 2} y={44} textAnchor="middle" fontWeight={700} fill={h.color}>
                  {h.label}
                </text>
              ))}
              <line x1={TABLE_X} y1={52} x2={xs[xs.length - 1] + heads[heads.length - 1].w} y2={52} stroke="#adb5bd" />
              {tableRows.length === 0 && (
                <text x={TABLE_X + 100} y={ROW_Y + 16} textAnchor="middle" fill="#868e96">
                  {w.emptyTable}
                </text>
              )}
              {tableRows.map((r, i) => {
                const yy = ROW_Y + i * ROW_H;
                return (
                  <g key={`r${d.rows[i]}`}>
                    {r.ok.map((ok, j) => ok !== null && <rect key={j} x={xs[j] + 2} y={yy - 2} width={heads[j].w - 4} height={ROW_H - 4} rx={4} fill={ok ? "#ebfbee" : "#fff4e6"} />)}
                    {r.cells.map((c, j) => (
                      <text key={j} x={xs[j] + heads[j].w / 2} y={yy + 15} textAnchor="middle" fontWeight={r.ok[j] !== null ? 700 : 400} fill={r.ok[j] === null ? "#1e1e1e" : r.ok[j] ? "#2f9e44" : "#e8590c"}>
                        {c}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          )}
          {/* Easy: the rules tried before this one, and whether each held. */}
          {task.level === 1 && enough && d.tried.length > 1 && (
            <g fontSize={13}>
              <text x={TABLE_X} y={206} fill="#868e96">{w.triedTag}</text>
              {d.tried.slice(0, -1).reverse().map((r, i) => {
                const ok = holdsAll(r, mirror, d.rows);
                return (
                  <text key={`t${i}`} x={TABLE_X} y={226 + i * 20} fill={ok ? "#2f9e44" : "#e8590c"}>
                    {`${ruleText(r)}: ${ok ? w.holdsTag : w.failsTag}`}
                  </text>
                );
              })}
            </g>
          )}
          <DiscoverBar y={H} w={W} pills={pills} cards={cards} groups={groups} why={whyPill} />
          {tri.drag?.moved && <text x={tri.drag.x} y={tri.drag.y} fontSize={24} textAnchor="middle" pointerEvents="none">📏</text>}
        </svg>
      </Stage>
      {explain !== null && (
        <WhySteps at={explain} of={whys.length} text={w.whyText[whys[explain]]} back={w.whyBack} next={w.whyNext} onStep={setExplain} picture={<CirclePicture step={whys[explain]} />} />
      )}
      <GameActions game={game} g={g} done={d.done} always />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** The explanation's pictures: a small circle with P and its mirror, or the signs of each quarter, and a line or two beside it. */
function CirclePicture({ step }: { step: Why }) {
  const [cx, cy, r] = [34, 56, 28];
  const pt = (t: number): P => [r1(cx + r * Math.cos(t * RAD)), r1(cy - r * Math.sin(t * RAD))];
  const dot = (t: number, color: string, dashed = false) => {
    const q = pt(t);
    const dash = dashed ? "3 3" : undefined;
    return (
      <g key={`${t}${color}`}>
        <line x1={cx} y1={cy} x2={q[0]} y2={cy} stroke={X_COLOR} strokeWidth={2.5} strokeDasharray={dash} />
        <line x1={q[0]} y1={cy} x2={q[0]} y2={q[1]} stroke={Y_COLOR} strokeWidth={2.5} strokeDasharray={dash} />
        <circle cx={q[0]} cy={q[1]} r={3.5} fill={color} />
      </g>
    );
  };
  const say = (lines: string[]) =>
    lines.map((s, i) => (
      <text key={s} x={121} y={60 + (i - (lines.length - 1) / 2) * 22} fontSize={11} fontWeight={700} textAnchor="middle" fill="#1e1e1e">
        {s}
      </text>
    ));
  const signs = (
    <g fontSize={10} fontWeight={700} textAnchor="middle">
      <text x={cx + 14} y={cy - 10} fill="#1e1e1e">+ +</text>
      <text x={cx - 14} y={cy - 10} fill="#1e1e1e">− +</text>
      <text x={cx - 14} y={cy + 18} fill="#1e1e1e">− −</text>
      <text x={cx + 14} y={cy + 18} fill="#1e1e1e">+ −</text>
    </g>
  );
  const pairOf = (p: number, q: number, lines: string[]) => <>{dot(p, "#1971c2")}{dot(q, Q_COLOR, true)}{say(lines)}</>;
  const body =
    step === "mirror" ? pairOf(30, 150, ["Q: (−x, y)", "P: (x, y)"])
    : step === "signs" || step === "sign" ? <>{signs}{say(["(cos, sin)", "right +, up +"])}</>
    : step === "nameUp" ? pairOf(30, 150, ["sin 150° = sin 30°", "cos 150° = −cos 30°"])
    : step === "nameCentre" ? pairOf(30, 210, ["sin 210° = −sin 30°", "cos 210° = −cos 30°"])
    : step === "nameAcross" ? pairOf(30, 330, ["sin 330° = −sin 30°", "cos 330° = cos 30°"])
    : step === "twice" ? <>
        <line x1={cx - r - 6} y1={pt(40)[1]} x2={cx + r + 6} y2={pt(40)[1]} stroke={Y_COLOR} strokeDasharray="3 3" />
        <circle cx={pt(40)[0]} cy={pt(40)[1]} r={3.5} fill="#1971c2" />
        <circle cx={pt(140)[0]} cy={pt(140)[1]} r={3.5} fill="#1971c2" />
        {say(["one height,", "two angles"])}
      </>
    : step === "sinTwin" ? pairOf(40, 140, ["sin 140° = sin 40°", "140° = 180° − 40°"])
    : step === "cosTwin" ? pairOf(70, 290, ["cos 290° = cos 70°", "290° = 360° − 70°"])
    : step === "ref" ? pairOf(20, 160, ["160° = 180° − 20°", "mirrors 20°"])
    : <>{dot(20, "#1971c2")}{say(["sin 20° = 0.34: up", "cos 20° = 0.94: across"])}</>;
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" aria-hidden fontFamily={FONT} style={{ flex: "none" }}>
      <rect width={176} height={112} rx={6} fill="#fff" />
      <line x1={cx - r - 6} y1={cy} x2={cx + r + 6} y2={cy} stroke="#ced4da" />
      <line x1={cx} y1={cy - r - 6} x2={cx} y2={cy + r + 6} stroke="#ced4da" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e1e" strokeWidth={1.5} />
      {body}
    </svg>
  );
}
