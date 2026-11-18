// Discover trig: sin, cos and tan found before they are named. Easy keeps θ and lets the size go: drag the top corner
// to grow or shrink the triangle on its grid, measure it into the table at three sizes or more, then make a new column
// from two sides (a side, + − × or ÷, another side) and claim the one that is the same in every row; trying costs
// nothing, a claim that changes costs a star, and the ratio found is named (opp ÷ hyp is sin 37°), upside down too.
// Medium keeps the hypotenuse at 10 and turns θ: measure as it turns (the table sorts by angle, the ratio's column
// beside), and claim the angle where the ratio has the value asked. Hard uses what was found: a triangle too big to
// measure, one side known, a small one with the same angle measured beside it with its three ratios, and four lengths
// to choose from, a wrong one told why (the same difference, upside down, the wrong side). "Why?" steps through the
// level's idea with a small picture and costs no stars. Nine puzzles open in turn; the endless run keeps a streak.
import { useState, type KeyboardEvent, type PointerEvent, type ReactElement } from "react";
import {
  columnOf,
  columnText,
  DISCOVER_LADDER,
  DISCOVER_NOTICES,
  discoverNotice,
  discoverNow,
  discoverStars,
  grows,
  judgeClaim,
  numText,
  OPS,
  ratioOf,
  reachAnswer,
  reachSlip,
  rowSides,
  ROWS_MAX,
  ROWS_NEEDED,
  SIDE_NAMES,
  sidesAt,
  sidesTurned,
  sizeRange,
  steady,
  turnTarget,
  TURN_RANGE,
  valueOf,
  angleOf,
  type Column,
  type DiscoverTask,
  type LiveDiscover,
  type Op,
  type Sides,
} from "../math/trigDiscover";
import { RATIO_PARTS, type TrigName, type TrigRatio } from "../math/trigBuild";
import { starText } from "./ladderUi";
import { arcAt, mid, NAME_COLOR, outward, type P } from "./TrigBuild";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { WhySteps } from "./WhySteps";

const FRESH: Partial<LiveDiscover> = { n: null, rows: [], a: null, op: null, b: null, tried: [], flipped: false, misses: 0, done: false, said: null };
const W = 600;
const H = 340;
/** θ's corner: the triangle grows up and to the right from here. */
const O: P = [44, 304];
const r1 = (v: number) => Math.round(v * 10) / 10;
const TABLE_X = 356;
const ROW_Y = 66;
const ROW_H = 24;

export type DiscoverWhy = "grow" | "gap" | "ratio" | "name" | "turn" | "ten" | "table" | "times" | "use" | "add";
const WHYS: Record<1 | 2 | 3, DiscoverWhy[]> = { 1: ["grow", "gap", "ratio", "name"], 2: ["turn", "ten", "table"], 3: ["times", "use", "add"] };

/** The corners for sides `s` at `u` pixels a unit: θ at O, the right angle along the bottom, the top above it. */
function corners(s: Sides, u: number) {
  const C: P = [r1(O[0] + s.adj * u), O[1]];
  const B: P = [C[0], r1(O[1] - s.opp * u)];
  return { A: O, B, C, centre: [(O[0] + B[0] + C[0]) / 3, (O[1] + B[1] + C[1]) / 3] as P };
}
/** Pixels a unit: easy fits the largest size it can be dragged to; medium fits a hypotenuse of 10. */
function unitOf(t: DiscoverTask): number {
  if (t.level === 2) return 24;
  if (t.level === 3) {
    const s = sidesAt(t.shape, 10 * t.times);
    return Math.min(236 / s.adj, 262 / s.opp);
  }
  const s = sidesAt(t.shape, sizeRange(t.shape)[1]);
  return Math.min(236 / s.adj, 270 / s.opp);
}

export function TrigDiscover({ state: d, set, w: words, svgRef }: PieceProps<"trigDiscover">) {
  const [w, tw, g] = [words.trigDiscover, words.trigBuild, words.game];
  const [explain, setExplain] = useState<number | null>(null);
  // The size or angle while the corner is dragged; the board hears only where it is let go.
  const [dragged, setDragged] = useState<number | null>(null);
  const game = useGame({ key: "zeno.trigdiscover.v1", size: DISCOVER_LADDER.length, notices: DISCOVER_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = discoverNow(d);
  const stars = discoverStars(d.misses);
  const short = tw.short;
  const rn = tw.ratios;
  const u = unitOf(task);
  const deg = (v: number) => `${v}°`;

  // ---------- where the triangle is ----------

  const range: [number, number] = task.level === 1 ? sizeRange(task.shape) : TURN_RANGE;
  const start = task.level === 1 ? task.start : task.level === 2 ? task.start : 10 * task.times;
  const now = dragged ?? d.n ?? start;
  const sides: Sides = task.level === 1 ? sidesAt(task.shape, now) : task.level === 2 ? sidesTurned(now) : sidesAt(task.shape, 10 * task.times);
  const theta = task.level === 2 ? now : angleOf(task.shape);
  const K = corners(sides, u);
  const rows = rowSides(task, d.rows);
  const col = columnOf(d);
  // Medium's column is the ratio asked for; easy's is the one the player makes.
  const shownCol: Column | null = task.level === 2 ? { a: RATIO_PARTS[task.ratio][0], op: "÷", b: RATIO_PARTS[task.ratio][1] } : col;

  // ---------- the moves ----------

  const clamp = (v: number) => Math.max(range[0], Math.min(range[1], v));
  const fromPoint = (p: P): number => {
    if (task.level === 2) return clamp(Math.round((Math.atan2(O[1] - p[1], p[0] - O[0]) * 180) / Math.PI));
    // Along the hypotenuse's line: how long it would be, in tenths of the triple.
    const s = sidesAt(task.shape, 10);
    const [dx, dy] = [s.adj / s.hyp, -s.opp / s.hyp];
    const along = ((p[0] - O[0]) * dx + (p[1] - O[1]) * dy) / u;
    return clamp(Math.round((along * 10) / task.shape.triple[2]));
  };
  const moveTo = (n: number) => n !== (d.n ?? start) && game.tap({ n, said: d.said?.kind === "again" ? null : d.said });
  const at = (e: PointerEvent) => (svgRef.current ? svgPoint(svgRef.current, e) : ([0, 0] as P));
  const down = (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragged(fromPoint(at(e)));
  };
  const move = (e: PointerEvent) => dragged !== null && setDragged(fromPoint(at(e)));
  const up = () => {
    if (dragged === null) return;
    setDragged(null);
    moveTo(dragged);
  };
  const key = (e: KeyboardEvent) => {
    const by = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    moveTo(clamp((d.n ?? start) + by));
  };

  const measure = () => {
    const n = d.n ?? start;
    if (d.rows.includes(n)) return game.tap({ said: { kind: "again" } });
    const more = [...d.rows, n].sort((x, y) => x - y);
    // Medium keeps the latest five; easy stops at five.
    const kept = task.level === 2 && more.length > ROWS_MAX ? more.filter((x) => x !== d.rows[0]) : more;
    if (task.level === 1 && kept.length === ROWS_NEEDED) return game.step({ rows: kept, said: null }, { counts: false });
    game.tap({ rows: kept, said: null });
  };
  /** A part of the column chosen; once all three are, the column is tried (and logged, newest last, four kept). */
  const choose = (patch: Partial<Pick<LiveDiscover, "a" | "op" | "b">>) => {
    const next = { a: d.a, op: d.op, b: d.b, ...patch };
    if (next.a && next.a === next.b) next.b = null;
    const c = columnOf(next);
    const last = d.tried[d.tried.length - 1];
    const fresh = c && !(last && last.a === c.a && last.op === c.op && last.b === c.b);
    game.tap({ ...next, tried: fresh ? [...d.tried, c].slice(-4) : d.tried, said: null });
  };
  const claim = () => {
    if (task.level !== 1 || !col) return;
    const verdict = judgeClaim(task, col, rows);
    if (verdict === "otherPair") return game.tap({ said: { kind: "otherPair", col } });
    if (verdict === "changes") return game.miss({ misses: d.misses + 1, said: { kind: "changes", col } });
    const flipped = ratioOf(col)?.flip ?? false;
    game.win({ stars, clean: d.misses === 0, notice: (streak) => discoverNotice(task, d.misses, streak, flipped), patch: { flipped, done: true } });
  };
  const here = () => {
    if (task.level !== 2) return;
    const n = d.n ?? start;
    if (n === turnTarget(task)) return game.win({ stars, clean: d.misses === 0, notice: (streak) => discoverNotice(task, d.misses, streak, false), patch: { done: true } });
    game.miss({ misses: d.misses + 1, said: { kind: "off", at: n } });
  };
  const pick = (v: number) => {
    if (task.level !== 3) return;
    if (!reachSlip(task, v)) return game.win({ stars, clean: d.misses === 0, notice: (streak) => discoverNotice(task, d.misses, streak, false), patch: { done: true } });
    game.miss({ misses: d.misses + 1, said: { kind: "pick", v } });
  };

  // ---------- the words ----------

  const ct = (c: Column) => columnText(c, short);
  const pairWord = (c: Column) => `${short[c.a]} ÷ ${short[c.b]}`;
  const prompt =
    task.level === 1 ?
      task.goal ? fill(w.prompt.pair, { t: deg(theta), p: tw.names[task.goal[0]], q: tw.names[task.goal[1]] })
      : fill(w.prompt.any, { t: deg(theta) })
    : task.level === 2 ? fill(w.prompt.turn, { c: pairWord(shownCol!), v: numText(task.value) })
    : fill(w.prompt.reach, { t: deg(theta), g: tw.names[task.given], gv: numText(sides[task.given]), w: tw.names[task.want] });
  const stepHint =
    task.level === 1 ?
      d.rows.length < ROWS_NEEDED ? fill(w.measureHint, { n: String(d.rows.length), of: String(ROWS_NEEDED) })
      : col ? w.claimHint
      : w.tryHint
    : task.level === 2 ? fill(w.turnHint, { c: pairWord(shownCol!), v: numText(task.value) })
    : w.reachHint;
  const small = task.level === 3 ? sidesAt(task.shape, 10) : null;
  const why = (): { tone: "wrong" | "near" | "hint"; text: string } | null => {
    const s = d.said;
    if (!s || s.kind === "notice") return null;
    if (s.kind === "again") return { tone: "hint", text: w.again };
    if (s.kind === "otherPair" && task.level === 1 && task.goal) return { tone: "near", text: fill(w.otherPair, { c: ct(s.col), p: tw.names[task.goal[0]], q: tw.names[task.goal[1]] }) };
    if (s.kind === "changes") return { tone: "wrong", text: fill(w.changes, { c: ct(s.col), vals: rows.map((r) => numText(valueOf(s.col, r))).join(", ") }) };
    if (s.kind === "off" && task.level === 2) {
      const v = valueOf(shownCol!, sidesTurned(s.at));
      const big = v > task.value;
      return { tone: "wrong", text: `${fill(big ? w.offBig : w.offSmall, { t: deg(s.at), c: pairWord(shownCol!), v: numText(v), want: numText(task.value) })} ${big === grows(task.ratio) ? w.turnDown : w.turnUp}` };
    }
    if (s.kind === "pick" && task.level === 3 && small) {
      const slip = reachSlip(task, s.v) ?? "other";
      const third = SIDE_NAMES.find((n) => n !== task.given && n !== task.want)!;
      return { tone: "wrong", text: fill(w.reachWhy[slip], { v: numText(s.v), k: String(task.times), w: tw.names[task.want], g: tw.names[task.given], o: tw.names[third], f: `${numText(small[task.want])} ÷ ${numText(small[task.given])}` }) };
    }
    return null;
  };
  const ratioName = (r: TrigRatio) => `${rn[r]} ${deg(theta)}`;
  const doneText = (): string => {
    const st = starText(stars);
    if (task.level === 1 && col) {
      const found = ratioOf(col);
      const v = numText(valueOf(col, sides));
      if (found?.flip) {
        const [p, q] = RATIO_PARTS[found.r];
        return fill(w.rightFlip, { c: ct(col), v, r: rn[found.r], u: `${short[p]} ÷ ${short[q]}`, uv: numText(valueOf({ a: p, op: "÷", b: q }, sides)), n: ratioName(found.r), stars: st });
      }
      return fill(w.rightGrow, { c: ct(col), v, n: found ? ratioName(found.r) : "", stars: st });
    }
    if (task.level === 2) return fill(w.rightTurn, { t: deg(theta), c: pairWord(shownCol!), v: numText(valueOf(shownCol!, sides)), n: ratioName(task.ratio), stars: st });
    if (task.level === 3 && small) {
      return fill(w.rightReach, { w: tw.names[task.want], g: numText(sides[task.given]), f: `${numText(small[task.want])}/${numText(small[task.given])}`, v: numText(reachAnswer(task)), stars: st });
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
  const whyText = (s: DiscoverWhy) => fill(w.whyText[s], { s: rn.sin, c: rn.cos, t: rn.tan, o: short.opp, a: short.adj, h: short.hyp });

  // ---------- the picture ----------

  const text = (p: P, s: string, color: string, size = 15, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={r1(p[0])} y={r1(p[1] + size * 0.35)} fontSize={size} fontWeight={700} textAnchor={anchor} fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {s}
    </text>
  );
  const ends: Record<TrigName, [P, P]> = { opp: [K.C, K.B], adj: [K.A, K.C], hyp: [K.A, K.B] };
  const sideLabel = (n: TrigName): string | null => {
    if (task.level !== 3) return `${short[n]} ${numText(sides[n])}`;
    if (n === task.given) return `${short[n]} ${numText(sides[n])}`;
    if (n === task.want) return d.done ? `${short[n]} ${numText(sides[n])}` : `${short[n]} ?`;
    return null;
  };
  const sq = 12;
  const corner = `M${K.C[0] - sq},${K.C[1]} L${K.C[0] - sq},${K.C[1] - sq} L${K.C[0]},${K.C[1] - sq}`;
  const grid = task.level !== 3;
  const gridLines: ReactElement[] = [];
  if (grid) {
    for (let x = O[0]; x <= 300; x += u) gridLines.push(<line key={`x${x}`} x1={r1(x)} y1={20} x2={r1(x)} y2={O[1]} stroke="#e9ecef" />);
    for (let y = O[1]; y >= 20; y -= u) gridLines.push(<line key={`y${y}`} x1={O[0]} y1={r1(y)} x2={300} y2={r1(y)} stroke="#e9ecef" />);
  }

  // The table: easy's three sides and the column made; medium's angle, sides and the ratio asked.
  const heads: { label: string; color: string; w: number }[] =
    task.level === 1 ? [...SIDE_NAMES.map((n) => ({ label: short[n], color: NAME_COLOR[n], w: 52 })), { label: col ? ct(col) : "?", color: "#1e1e1e", w: 78 }]
    : task.level === 2 ? [{ label: "θ", color: "#2f9e44", w: 40 }, ...SIDE_NAMES.map((n) => ({ label: short[n], color: NAME_COLOR[n], w: 46 })), { label: pairWord(shownCol!), color: "#1e1e1e", w: 56 }]
    : [];
  const xs = heads.reduce<number[]>((a, h, i) => [...a, (a[i - 1] ?? TABLE_X) + (i ? heads[i - 1].w : 0)], []);
  // Only easy's column is judged by colour: medium's ratio is meant to change as θ turns.
  const holds = task.level === 1 && shownCol && rows.length >= 2 ? steady(shownCol, rows) : null;
  const cells = (r: Sides, i: number): string[] => [
    ...(task.level === 2 ? [deg(d.rows[i])] : []),
    ...SIDE_NAMES.map((n) => numText(r[n])),
    shownCol ? numText(valueOf(shownCol, r)) : "",
  ];

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
          {task.level === 2 && <path d={`M${O[0] + 10 * u},${O[1]} A${10 * u},${10 * u} 0 0 0 ${O[0]},${O[1] - 10 * u}`} fill="none" stroke="#ced4da" strokeDasharray="4 5" />}
          <polygon points={`${K.A.join(",")} ${K.B.join(",")} ${K.C.join(",")}`} fill="#f8f9fa" fillOpacity={0.8} />
          {SIDE_NAMES.map((n) => {
            const [p, q] = ends[n];
            return <line key={n} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={NAME_COLOR[n]} strokeWidth={3.5} strokeLinecap="round" />;
          })}
          <path d={corner} fill="none" stroke="#1e1e1e" strokeWidth={1.5} />
          <path d={arcAt(K.A, K.C, K.B, 30)} fill="none" stroke="#2f9e44" strokeWidth={2.5} />
          {text([300, 34], `θ = ${deg(theta)}`, "#2f9e44", 18, "end")}
          {SIDE_NAMES.map((n) => {
            const s = sideLabel(n);
            if (!s) return null;
            const m = mid(...ends[n]);
            const p = n === "opp" ? ([m[0] + 10, m[1]] as P) : n === "adj" ? ([m[0], m[1] + 20] as P) : outward(m, K.centre, 20);
            const want = task.level === 3 && n === task.want;
            return <g key={`l${n}`}>{text(p, s, want && !d.done ? "#e03131" : NAME_COLOR[n], 15, n === "opp" ? "start" : n === "hyp" ? "end" : "middle")}</g>;
          })}
          {/* The corner to drag: the size (easy) or the angle (medium). */}
          {task.level !== 3 && !d.done && (
            <g
              role="slider"
              tabIndex={0}
              className="disc-handle"
              aria-label={task.level === 1 ? w.sizeLabel : w.angleLabel}
              aria-valuemin={range[0]}
              aria-valuemax={range[1]}
              aria-valuenow={now}
              aria-valuetext={task.level === 1 ? `${short.hyp} ${numText(sides.hyp)}` : deg(now)}
              style={{ cursor: "grab" }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onKeyDown={key}
            >
              <circle cx={K.B[0]} cy={K.B[1]} r={22} fill="transparent" />
              <circle cx={K.B[0]} cy={K.B[1]} r={9} fill="#f08c00" stroke="#fff" strokeWidth={2} />
            </g>
          )}

          {/* The table. */}
          {task.level !== 3 && (
            <g fontSize={14}>
              {heads.map((h, i) => (
                <text key={`h${i}`} x={xs[i] + h.w / 2} y={44} textAnchor="middle" fontWeight={700} fill={h.color} fontSize={h.label.length > 7 ? 12 : 14}>
                  {h.label}
                </text>
              ))}
              <line x1={TABLE_X} y1={52} x2={xs[xs.length - 1] + heads[heads.length - 1].w} y2={52} stroke="#adb5bd" />
              {rows.length === 0 && (
                <text x={TABLE_X + 116} y={ROW_Y + 16} textAnchor="middle" fill="#868e96" fontSize={13}>
                  {w.emptyTable}
                </text>
              )}
              {rows.map((r, i) => {
                const y = ROW_Y + i * ROW_H;
                const last = heads.length - 1;
                return (
                  <g key={`r${d.rows[i]}`}>
                    {shownCol && <rect x={xs[last] + 2} y={y - 2} width={heads[last].w - 4} height={ROW_H - 4} rx={4} fill={holds === true ? "#ebfbee" : holds === false ? "#fff4e6" : "#f8f9fa"} />}
                    {cells(r, i).map((c, j) => (
                      <text key={j} x={xs[j] + heads[j].w / 2} y={y + 15} textAnchor="middle" fill={j === last ? (holds === true ? "#2f9e44" : holds === false ? "#e8590c" : "#1e1e1e") : "#1e1e1e"} fontWeight={j === last ? 700 : 400}>
                        {c}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          )}
          {/* Easy: the columns tried before this one, and whether each stayed. */}
          {task.level === 1 && rows.length >= 2 && d.tried.length > 1 && (
            <g fontSize={13}>
              <text x={TABLE_X} y={206} fill="#868e96">{w.triedTag}</text>
              {d.tried.slice(0, -1).reverse().map((c, i) => {
                const ok = steady(c, rows);
                return (
                  <text key={`t${i}`} x={TABLE_X} y={226 + i * 20} fill={ok ? "#2f9e44" : "#e8590c"}>
                    {`${ct(c)}: ${ok ? w.stays : w.changesTag}`}
                  </text>
                );
              })}
            </g>
          )}
          {/* Medium: the value asked for. */}
          {task.level === 2 && (
            <text x={TABLE_X} y={214} fontSize={16} fontWeight={700} fill="#f08c00">
              {fill(w.goalTag, { c: pairWord(shownCol!), v: numText(task.value) })}
            </text>
          )}
          {/* Hard: the small triangle with the same angle, measured, and its three ratios. */}
          {task.level === 3 && small && <SmallTriangle small={small} short={short} tag={w.smallTag} ratios={(["sin", "cos", "tan"] as const).map((r) => `${short[RATIO_PARTS[r][0]]} ÷ ${short[RATIO_PARTS[r][1]]} = ${numText(valueOf({ a: RATIO_PARTS[r][0], op: "÷", b: RATIO_PARTS[r][1] }, small))} = ${ratioName(r)}`)} />}
        </svg>
      </Stage>
      {explain !== null && (
        <WhySteps at={explain} of={whys.length} text={whyText(whys[explain])} back={w.whyBack} next={w.whyNext} onStep={setExplain} picture={<DiscoverPicture step={whys[explain]} short={short} />} />
      )}
      {/* Easy: the column to make, once three rows are in. */}
      {!d.done && task.level === 1 && d.rows.length >= ROWS_NEEDED && (
        <div className="live-bar disc-build">
          <Choice label={w.first} options={SIDE_NAMES} on={d.a} text={(n) => short[n]} color={(n) => NAME_COLOR[n]} pick={(a) => choose({ a })} />
          <Choice label={w.opLabel} options={OPS} on={d.op} text={(o: Op) => o} pick={(op) => choose({ op })} />
          <Choice label={w.second} options={SIDE_NAMES} on={d.b} text={(n) => short[n]} color={(n) => NAME_COLOR[n]} off={(n) => n === d.a} pick={(b) => choose({ b })} />
          <button className="live-btn on" disabled={!col} onClick={claim}>
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
        {!d.done && task.level === 3 && task.choices.map((v) => (
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

/** A row of buttons, one of them chosen. */
export function Choice<T extends string>({ label, options, on, text, color, off, pick }: { label: string; options: readonly T[]; on: T | null; text: (t: T) => string; color?: (t: T) => string; off?: (t: T) => boolean; pick: (t: T) => void }) {
  return (
    <span className="disc-choice" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} className={`live-btn${on === o ? " on" : ""}`} aria-pressed={on === o} disabled={off?.(o)} style={color && on !== o ? { color: color(o) } : undefined} onClick={() => pick(o)}>
          {text(o)}
        </button>
      ))}
    </span>
  );
}

/** Hard's small triangle: the same angle, every side measured, and its three ratios beneath. */
function SmallTriangle({ small, short, tag, ratios }: { small: Sides; short: Record<TrigName, string>; tag: string; ratios: string[] }) {
  const s = Math.min(150 / small.adj, 100 / small.opp);
  const A: P = [380, 160];
  const C: P = [r1(A[0] + small.adj * s), A[1]];
  const B: P = [C[0], r1(A[1] - small.opp * s)];
  const m = (p: P, q: P) => mid(p, q);
  return (
    <g>
      <text x={470} y={30} textAnchor="middle" fontSize={13} fill="#868e96">{tag}</text>
      <polygon points={`${A.join(",")} ${B.join(",")} ${C.join(",")}`} fill="#f8f9fa" />
      <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke={NAME_COLOR.adj} strokeWidth={3} />
      <line x1={C[0]} y1={C[1]} x2={B[0]} y2={B[1]} stroke={NAME_COLOR.opp} strokeWidth={3} />
      <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={NAME_COLOR.hyp} strokeWidth={3} />
      <path d={arcAt(A, C, B, 20)} fill="none" stroke="#2f9e44" strokeWidth={2} />
      <text x={m(A, C)[0]} y={A[1] + 18} textAnchor="middle" fontSize={14} fontWeight={700} fill={NAME_COLOR.adj}>{`${short.adj} ${numText(small.adj)}`}</text>
      <text x={C[0] + 8} y={m(C, B)[1] + 5} fontSize={14} fontWeight={700} fill={NAME_COLOR.opp}>{`${short.opp} ${numText(small.opp)}`}</text>
      <text x={m(A, B)[0] - 8} y={m(A, B)[1] - 6} textAnchor="end" fontSize={14} fontWeight={700} fill={NAME_COLOR.hyp}>{`${short.hyp} ${numText(small.hyp)}`}</text>
      {ratios.map((r, i) => (
        <text key={r} x={366} y={212 + i * 24} fontSize={14} fill="#1e1e1e">{r}</text>
      ))}
    </g>
  );
}

/** The explanation's small picture: two triangles, one twice the other, or the hypotenuse turned, with a line or two. */
export function DiscoverPicture({ step, short }: { step: DiscoverWhy; short: Record<TrigName, string> }) {
  const A: P = [14, 100];
  const tri = (k: number, color = "#1e1e1e", dash?: string) => {
    const C: P = [A[0] + 40 * k, A[1]];
    const B: P = [C[0], A[1] - 30 * k];
    return <polygon points={`${A.join(",")} ${B.join(",")} ${C.join(",")}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray={dash} />;
  };
  const say = (lines: string[], x = 104) =>
    lines.map((s, i) => (
      <text key={s} x={x} y={30 + i * 22} fontSize={13} fontWeight={700} textAnchor="middle" fill="#1e1e1e">
        {s}
      </text>
    ));
  const two = (
    <>
      {tri(2, "#adb5bd")}
      {tri(1)}
      <text x={34} y={111} fontSize={11} textAnchor="middle" fill="#495057">4</text>
      <text x={78} y={111} fontSize={11} textAnchor="middle" fill="#495057">8</text>
      <text x={57} y={90} fontSize={11} fill="#495057">3</text>
      <text x={97} y={64} fontSize={11} fill="#495057">6</text>
    </>
  );
  const body = (() => {
    switch (step) {
      case "grow":
        return <>{two}{say(["3, 4, 5", "6, 8, 10"], 144)}</>;
      case "gap":
        return <>{two}{say(["5 − 3 = 2", "10 − 6 = 4"], 140)}</>;
      case "ratio":
        return <>{two}{say(["3 ÷ 5 = 0.6", "6 ÷ 10 = 0.6"], 138)}</>;
      case "name":
        return say([`${short.opp} ÷ ${short.hyp}: sin`, `${short.adj} ÷ ${short.hyp}: cos`, `${short.opp} ÷ ${short.adj}: tan`], 88);
      case "turn":
      case "ten": {
        const R = 86;
        const at = (a: number): P => [A[0] + R * Math.cos((a * Math.PI) / 180), A[1] - R * Math.sin((a * Math.PI) / 180)];
        const arm = (a: number, color: string) => {
          const p = at(a);
          return (
            <g key={a}>
              <line x1={A[0]} y1={A[1]} x2={r1(p[0])} y2={r1(p[1])} stroke={color} strokeWidth={2} />
              <line x1={r1(p[0])} y1={r1(p[1])} x2={r1(p[0])} y2={A[1]} stroke={NAME_COLOR.opp} strokeWidth={2} />
            </g>
          );
        };
        return (
          <>
            <path d={`M${A[0] + R},${A[1]} A${R},${R} 0 0 0 ${A[0]},${A[1] - R}`} fill="none" stroke="#ced4da" strokeDasharray="3 4" />
            <line x1={A[0]} y1={A[1]} x2={A[0] + R + 6} y2={A[1]} stroke="#1e1e1e" />
            {step === "turn" ? [arm(25, "#adb5bd"), arm(55, NAME_COLOR.hyp)] : arm(30, NAME_COLOR.hyp)}
            {step === "ten" && (
              <>
                <text x={50} y={66} fontSize={12} fontWeight={700} fill={NAME_COLOR.hyp}>10</text>
                <text x={93} y={84} fontSize={12} fontWeight={700} fill={NAME_COLOR.opp}>5</text>
                {say(["5 ÷ 10", "= 0.5"], 146)}
              </>
            )}
          </>
        );
      }
      case "table":
        return say(["30°: 0.5", "45°: 0.71", "60°: 0.87"], 88);
      case "times":
        return <>{two}{say(["× 2"], 144)}</>;
      case "use":
        return say(["? = 20 × 3/5", "? = 12"], 88);
      case "add":
        return say(["20 − 2 = 18 ✗", "20 × 3/5 = 12 ✓"], 88);
    }
  })();
  return (
    <svg width={176} height={112} viewBox="0 0 176 112" aria-hidden fontFamily={FONT} style={{ flex: "none" }}>
      <rect width={176} height={112} rx={6} fill="#fff" />
      {body}
    </svg>
  );
}
