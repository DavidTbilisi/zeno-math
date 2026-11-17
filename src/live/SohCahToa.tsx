// SOH CAH TOA: a bare right-angled triangle with whole sides, turned any way, θ at one of its sharp corners, and a
// fraction beside it to fill. Each of sin θ, cos θ and tan θ is built from two sides: drag a side's length into the
// top or the bottom of the fraction, or tap two sides, top first (a slot tapped empties). A fraction right goes into
// the list beneath; a wrong one is told what it is (that's cos θ; upside down) and its two sides are named on the
// triangle, opposite, adjacent or hypotenuse, so the slip shows where it was. Easy lies flat with θ at the bottom and
// the mnemonic shown; medium turns the triangle and moves θ; hard gives one ratio with the sides unlabelled: drag (or
// tap) its two numbers onto their sides, choose the third side from four lengths (Pythagoras the right way round),
// then build the other two. "Why?" steps through the method on a small triangle of its own and costs no stars. No
// misses earns three stars, one two. Nine puzzles open in turn, and the endless run keeps a streak with no misses.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  buildSlip,
  fractionOf,
  missingOf,
  nameOf,
  ratioOfParts,
  rootText,
  shownSides,
  SOH_LADDER,
  SOH_NOTICES,
  SOH_SIDES,
  sohNotice,
  sohNow,
  sohStars,
  sideOf,
  stepsOf,
  thirdSlip,
  type LiveSoh,
  type SohSide,
  type SohTask,
} from "../math/sohcahtoa";
import { RATIO_PARTS, type TrigName, type TrigRatio } from "../math/trigBuild";
import { starText } from "./ladderUi";
import { arcAt, mid, NAME_COLOR, outward, WhyPicture, type P, type WhyStep } from "./TrigBuild";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";
import { WhySteps } from "./WhySteps";

const FRESH: Partial<LiveSoh> = { at: 0, top: null, bottom: null, misses: 0, done: false, said: null };
const W = 560;
const H = 340;
const r1 = (v: number) => Math.round(v * 10) / 10;
/** The fraction's two slots, and where the ratio's name stands before them. */
const SLOT = { top: { x: 446, y: 112, w: 72, h: 42 }, bottom: { x: 446, y: 176, w: 72, h: 42 } } as const;
type Slot = keyof typeof SLOT;
const BAR = 165;
const inSlot = (p: P, s: Slot) => p[0] >= SLOT[s].x - 10 && p[0] <= SLOT[s].x + SLOT[s].w + 10 && p[1] >= SLOT[s].y - 10 && p[1] <= SLOT[s].y + SLOT[s].h + 10;
/** How far a point is from a segment, for a number dropped near a side. */
function off(p: P, a: P, b: P): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy);
}

/** The corners as drawn: C the right angle, A the end of `a`, B the end of `b`, turned, mirrored and fitted to the left. */
function layout(t: SohTask) {
  const rad = (t.turn * Math.PI) / 180;
  const place = ([x, y]: P): P => {
    const mx = t.mirror ? -x : x;
    return [mx * Math.cos(rad) - y * Math.sin(rad), mx * Math.sin(rad) + y * Math.cos(rad)];
  };
  const raw = { C: place([0, 0]), A: place([t.len.a, 0]), B: place([0, -t.len.b]) };
  const xs = Object.values(raw).map((p) => p[0]);
  const ys = Object.values(raw).map((p) => p[1]);
  const s = Math.min(270 / (Math.max(...xs) - Math.min(...xs)), 250 / (Math.max(...ys) - Math.min(...ys)));
  const [cx, cy] = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
  const fit = (p: P): P => [r1(185 + (p[0] - cx) * s), r1(172 + (p[1] - cy) * s)];
  const [C, A, B] = [fit(raw.C), fit(raw.A), fit(raw.B)];
  return { A, B, C, ends: { a: [C, A], b: [C, B], c: [A, B] } as Record<SohSide, [P, P]>, centre: [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3] as P };
}

type Drag = { from: SohSide | "chip"; start: P; at: P };

export function SohCahToa({ state: d, set, w: words, svgRef }: PieceProps<"sohcahtoa">) {
  const [w, tw, g] = [words.sohcahtoa, words.trigBuild, words.game];
  const [explain, setExplain] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const game = useGame({ key: "zeno.sohcahtoa.v1", size: SOH_LADDER.length, notices: SOH_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = sohNow(d);
  const steps = stepsOf(task);
  const cur = d.done ? null : steps[d.at] ?? null;
  const stars = sohStars(d.misses);
  const rn = tw.ratios;
  const L = layout(task);
  const shown = shownSides(task, d.done ? steps.length : d.at);
  const lenOf = (s: SohSide) => String(task.len[s]);
  const fracText = (r: TrigRatio) => `${rn[r]} θ = ${fractionOf(task, r).join("/")}`;
  const given = task.given ? fractionOf(task, task.given) : null;

  // ---------- the moves ----------

  const next = (patch: Partial<LiveSoh> = {}) => {
    if (d.at + 1 < steps.length) return game.step({ ...patch, at: d.at + 1, top: null, bottom: null, said: null }, { counts: false });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => sohNotice(task, d.misses, streak), patch: { ...patch, at: steps.length, top: null, bottom: null, done: true } });
  };
  /** The fraction with a side put in a slot (out of the other one, if it was there), checked once both are full. */
  const fillWith = (top: SohSide | null, bottom: SohSide | null) => {
    if (cur?.kind !== "build") return;
    if (!top || !bottom) return game.tap({ top, bottom });
    if (!buildSlip(task, cur.r, top, bottom)) return next();
    game.miss({ misses: d.misses + 1, top: null, bottom: null, said: { kind: "build", top, bottom } });
  };
  const put = (slot: Slot, s: SohSide) => {
    const other = slot === "top" ? d.bottom : d.top;
    const kept = other === s ? null : other;
    fillWith(slot === "top" ? s : kept, slot === "top" ? kept : s);
  };
  const place = (s: SohSide) => {
    if (cur?.kind !== "place" || shown.includes(s)) return;
    const got = nameOf(task.at, s);
    if (got === cur.n) return next();
    game.miss({ misses: d.misses + 1, said: { kind: "place", got } });
  };
  /** A side tapped: placed on hard, or into the first empty slot (tapped again, taken out). */
  const tapSide = (s: SohSide) => {
    if (cur?.kind === "place") return place(s);
    if (cur?.kind !== "build") return;
    if (d.top === s) return fillWith(null, d.bottom);
    if (d.bottom === s) return fillWith(d.top, null);
    if (!d.top) return fillWith(s, d.bottom);
    fillWith(d.top, s);
  };
  const pickThird = (sq: number) => {
    if (cur?.kind !== "third") return;
    if (!thirdSlip(task, sq)) return next();
    game.miss({ misses: d.misses + 1, said: { kind: "third", sq } });
  };

  // A drag from a side (its length) to a slot, or from the number to place to a side; a drag that hardly moves is a tap.
  const at = (e: PointerEvent) => (svgRef.current ? svgPoint(svgRef.current, e) : ([0, 0] as P));
  const down = (from: Drag["from"]) => (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at(e);
    setDrag({ from, start: p, at: p });
  };
  const move = (e: PointerEvent) => drag && setDrag({ ...drag, at: at(e) });
  const up = () => {
    if (!drag) return;
    setDrag(null);
    const p = drag.at;
    const still = Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) < 6;
    if (drag.from === "chip") {
      const near = SOH_SIDES.map((s) => ({ s, by: off(p, ...L.ends[s]) })).sort((x, y) => x.by - y.by)[0];
      if (!still && near.by < 34) place(near.s);
      return;
    }
    if (still) return tapSide(drag.from);
    const slot = (["top", "bottom"] as const).find((s) => inSlot(p, s));
    if (slot && cur?.kind === "build") put(slot, drag.from);
  };
  const keyTap = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  // ---------- what the picture shows ----------

  // The sides named: all at the end; the two of a wrong fraction or a wrong place; on easy, those of each ratio built.
  const named = new Map<SohSide, TrigName>();
  const name = (s: SohSide) => named.set(s, nameOf(task.at, s));
  if (d.done) SOH_SIDES.forEach(name);
  if (d.said?.kind === "build") [d.said.top, d.said.bottom].forEach(name);
  if (task.level === 1) steps.slice(0, d.at).forEach((st) => st.kind === "build" && RATIO_PARTS[st.r].forEach((n) => name(sideOf(task.at, n))));
  const wrongPlace = d.said?.kind === "place" ? sideOf(task.at, d.said.got) : null;
  if (wrongPlace) name(wrongPlace);
  const missing = task.given ? missingOf(task) : null;
  const placing = cur?.kind === "place" && given ? given[RATIO_PARTS[task.given!].indexOf(cur.n)] : null;

  const thetaAt = task.at === "a" ? L.A : L.B;
  const otherSharp = task.at === "a" ? L.B : L.A;
  const unit = (p: P, q: P): P => {
    const n = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    return [(q[0] - p[0]) / n, (q[1] - p[1]) / n];
  };
  const [u1, u2] = [unit(thetaAt, L.C), unit(thetaAt, otherSharp)];
  const bis = unit([0, 0], [u1[0] + u2[0], u1[1] + u2[1]]);
  const thetaLabel: P = [thetaAt[0] + bis[0] * 50, thetaAt[1] + bis[1] * 50];
  const [ca, cb] = [unit(L.C, L.A), unit(L.C, L.B)];
  const sq = 14;
  const corner = `M${r1(L.C[0] + ca[0] * sq)},${r1(L.C[1] + ca[1] * sq)} L${r1(L.C[0] + (ca[0] + cb[0]) * sq)},${r1(L.C[1] + (ca[1] + cb[1]) * sq)} L${r1(L.C[0] + cb[0] * sq)},${r1(L.C[1] + cb[1] * sq)}`;

  const text = (p: P, s: string, color: string, size = 17) => (
    <text x={r1(p[0])} y={r1(p[1] + size * 0.35)} fontSize={size} fontWeight={700} textAnchor="middle" fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
      {s}
    </text>
  );
  const sideValue = (s: SohSide): { v: string; color: string } | null => {
    if (shown.includes(s)) return { v: lenOf(s), color: "#1e1e1e" };
    if (d.said?.kind === "third" && s === missing) return { v: `${rootText(d.said.sq)}?`, color: "#e8590c" };
    if (cur?.kind === "third" && s === missing) return { v: "?", color: "#e03131" };
    return null;
  };
  const pill = (p: P, n: TrigName) => {
    const label = tw.short[n];
    const wd = label.length * 9 + 14;
    return (
      <g key={`n${n}`} pointerEvents="none">
        <rect x={r1(p[0] - wd / 2)} y={r1(p[1] - 11)} width={wd} height={22} rx={11} fill={NAME_COLOR[n]} />
        <text x={r1(p[0])} y={r1(p[1] + 5)} fontSize={14} fontWeight={700} textAnchor="middle" fill="#fff">{label}</text>
      </g>
    );
  };
  // The sides from left to right on the drawing, for naming one with no length yet.
  const leftToRight = [...SOH_SIDES].sort((x, y) => mid(...L.ends[x])[0] - mid(...L.ends[y])[0] || mid(...L.ends[x])[1] - mid(...L.ends[y])[1]);
  const slotOf = (s: SohSide) => (d.top === s ? "top" : d.bottom === s ? "bottom" : null);

  // The list beneath the fraction: the ratio given (hard), then each one built.
  const built = steps.slice(0, d.done ? steps.length : d.at).flatMap((st) => (st.kind === "build" ? [st.r] : []));
  const list: { s: string; given?: boolean }[] = [...(task.given ? [{ s: fracText(task.given), given: true }] : []), ...built.map((r) => ({ s: `${fracText(r)} ✓` }))];
  const fracShown = cur?.kind === "build";

  // ---------- the words ----------

  const nm = (n: TrigName) => tw.names[n];
  const prompt = task.given ? fill(w.promptGiven, { r: `${rn[task.given]} θ = ${given!.join("/")}`, p: String(given![0]), q: String(given![1]) }) : fill(w.prompt, { s: rn.sin, c: rn.cos, t: rn.tan });
  const stepHint =
    cur?.kind === "place" ? fill(w.place, { v: String(placing) })
    : cur?.kind === "third" ? w.third
    : cur?.kind === "build" ? fill(task.level === 1 ? w.build : w.buildHard, { r: `${rn[cur.r]} θ` })
    : "";
  const pyth = (): string => {
    if (!missing) return "";
    const [p, q] = SOH_SIDES.filter((s) => s !== missing);
    return missing === "c" ? `${task.len[p]}² + ${task.len[q]}² = x²` : `${task.len[p === "c" ? q : p]}² + x² = ${task.len.c}²`;
  };
  const why = (): string => {
    const s = d.said;
    if (!s || s.kind === "notice") return "";
    if (s.kind === "place" && cur?.kind === "place") return fill(w.placeWhy, { got: nm(s.got), want: nm(cur.n), v: String(placing), r: `${rn[task.given!]} θ = ${given!.join("/")}` });
    if (s.kind === "third") {
      const slip = thirdSlip(task, s.sq);
      const key = slip === "squares" ? (missing === "c" ? "squaresHyp" : "squaresLeg") : slip ?? "add";
      return fill(w.thirdWhy[key], { v: rootText(s.sq), eq: pyth() });
    }
    if (s.kind === "build" && cur?.kind === "build") {
      const slip = buildSlip(task, cur.r, s.top, s.bottom) ?? "neither";
      const [x, y] = [nameOf(task.at, s.top), nameOf(task.at, s.bottom)];
      const [a, b] = RATIO_PARTS[cur.r];
      const o = ratioOfParts(x, y);
      return fill(w.buildWhy[slip], { f: `${lenOf(s.top)}/${lenOf(s.bottom)}`, p: nm(x), q: nm(y), o: o ? `${rn[o]} θ` : "", r: `${rn[cur.r]} θ`, a: nm(a), b: nm(b) });
    }
    return "";
  };
  const all = (["sin", "cos", "tan"] as const).map(fracText).join(", ");
  const doneLine = `${fill(w.right, { eq: all, stars: starText(stars) })}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}`;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : d.said ? { tone: "wrong", text: `${why()} ${stepHint}` }
    : { tone: "hint", text: stepHint };

  const whys: WhyStep[] = ["hyp", "opp", "adj", "swap", "soh", ...(task.given ? (["pyth"] as const) : [])];
  const openAt = cur?.kind === "third" ? whys.indexOf("pyth") : d.said?.kind === "build" ? whys.indexOf("soh") : 0;
  const whyKey = (s: WhyStep) => s as keyof typeof w.whyText;
  const dragChip = drag && !(Math.hypot(drag.at[0] - drag.start[0], drag.at[1] - drag.start[1]) < 6) ? (drag.from === "chip" ? String(placing) : lenOf(drag.from)) : null;

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} role="img" aria-label={prompt} style={{ touchAction: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          <polygon points={`${L.A.join(",")} ${L.B.join(",")} ${L.C.join(",")}`} fill="#f8f9fa" stroke="none" />
          {SOH_SIDES.map((s) => {
            const [p, q] = L.ends[s];
            const n = named.get(s);
            const lit = slotOf(s) || (drag?.from === s && dragChip);
            return (
              <g key={s}>
                {n && <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={NAME_COLOR[n]} strokeWidth={8} strokeOpacity={s === wrongPlace ? 0.25 : 0.45} strokeLinecap="round" />}
                <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={lit ? "#f08c00" : "#1e1e1e"} strokeWidth={lit ? 4 : 3} strokeLinecap="round" />
              </g>
            );
          })}
          <path d={corner} fill="none" stroke="#1e1e1e" strokeWidth={1.6} />
          <path d={arcAt(thetaAt, L.C, otherSharp, 30)} fill="none" stroke="#2f9e44" strokeWidth={2.5} />
          {text(thetaLabel, "θ", "#2f9e44", 18)}
          {SOH_SIDES.map((s) => {
            const v = sideValue(s);
            const n = named.get(s);
            const m = mid(...L.ends[s]);
            return (
              <g key={`l${s}`}>
                {v && text(outward(m, L.centre, 22), v.v, v.color)}
                {n && pill(outward(m, L.centre, -22), n)}
              </g>
            );
          })}
          {/* The sides to drag or tap: the line and its length both. */}
          {(cur?.kind === "build" || cur?.kind === "place") &&
            SOH_SIDES.map((s) => {
              const [p, q] = L.ends[s];
              const lab = outward(mid(p, q), L.centre, 22);
              const can = cur.kind === "build" || !shown.includes(s);
              return (
                can && (
                  <g
                    key={`t${s}`}
                    className="soh-side"
                    role="button"
                    tabIndex={0}
                    aria-label={shown.includes(s) ? fill(w.sideLen, { v: lenOf(s) }) : fill(w.sideNth, { n: String(leftToRight.indexOf(s) + 1) })}
                    style={{ cursor: cur.kind === "build" ? "grab" : "pointer" }}
                    onPointerDown={cur.kind === "build" ? down(s) : () => place(s)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onKeyDown={keyTap(() => tapSide(s))}
                  >
                    <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="transparent" strokeWidth={28} strokeLinecap="round" />
                    <circle cx={lab[0]} cy={lab[1]} r={18} fill="transparent" />
                  </g>
                )
              );
            })}

          {/* The mnemonic, on easy. */}
          {task.level === 1 && !d.done && (
            <g fontSize={13} fill="#495057">
              <text x={482} y={26} textAnchor="middle" fontWeight={700} fontSize={14} fill="#f08c00">{w.card}</text>
              {(["sin", "cos", "tan"] as const).map((r, i) => (
                <text key={r} x={482} y={46 + i * 18} textAnchor="middle">
                  {`${rn[r]} = ${tw.short[RATIO_PARTS[r][0]]} / ${tw.short[RATIO_PARTS[r][1]]}`}
                </text>
              ))}
            </g>
          )}
          {/* The number to place (hard): drag it onto its side. */}
          {placing !== null && (
            <g role="button" tabIndex={-1} aria-hidden style={{ cursor: "grab" }} onPointerDown={down("chip")} onPointerMove={move} onPointerUp={up}>
              <rect x={446} y={140} width={72} height={46} rx={8} fill="#fff3bf" stroke="#f08c00" strokeWidth={2} />
              <text x={482} y={171} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1e1e1e">{placing}</text>
            </g>
          )}
          {/* The fraction being built. */}
          {fracShown && (
            <g>
              <text x={438} y={BAR + 7} textAnchor="end" fontSize={20} fontWeight={700} fill="#1e1e1e">{`${rn[cur.r]} θ =`}</text>
              <line x1={440} y1={BAR} x2={524} y2={BAR} stroke="#1e1e1e" strokeWidth={2.5} />
              {(["top", "bottom"] as const).map((slot) => {
                const s = d[slot];
                const r = SLOT[slot];
                const hot = drag && drag.from !== "chip" && dragChip && inSlot(drag.at, slot);
                return (
                  <g
                    key={slot}
                    role="button"
                    tabIndex={0}
                    aria-label={`${w.slots[slot]}: ${s ? lenOf(s) : "—"}`}
                    style={{ cursor: s ? "pointer" : "default" }}
                    onClick={() => s && fillWith(slot === "top" ? null : d.top, slot === "top" ? d.bottom : null)}
                    onKeyDown={keyTap(() => s && fillWith(slot === "top" ? null : d.top, slot === "top" ? d.bottom : null))}
                  >
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill={hot ? "#fff3bf" : s ? "#fff" : "#f1f3f5"} stroke={hot || s ? "#f08c00" : "#adb5bd"} strokeWidth={2} strokeDasharray={s ? undefined : "5 4"} />
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1e1e1e">{s ? lenOf(s) : ""}</text>
                  </g>
                );
              })}
            </g>
          )}
          {list.map((x, i) => (
            <g key={x.s}>
              {x.given && <text x={482} y={236} textAnchor="middle" fontSize={12} fill="#868e96">{w.givenTag}</text>}
              <text x={482} y={254 + i * 26} textAnchor="middle" fontSize={17} fontWeight={700} fill={x.given ? "#495057" : "#2f9e44"}>
                {x.s}
              </text>
            </g>
          ))}
          {dragChip && drag && (
            <g pointerEvents="none">
              <rect x={drag.at[0] - 26} y={drag.at[1] - 18} width={52} height={36} rx={8} fill="#fff3bf" stroke="#f08c00" strokeWidth={2} />
              <text x={drag.at[0]} y={drag.at[1] + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1e1e1e">{dragChip}</text>
            </g>
          )}
        </svg>
      </Stage>
      {explain !== null && (
        <WhySteps
          at={explain}
          of={whys.length}
          text={fill(w.whyText[whyKey(whys[explain])], { s: rn.sin, c: rn.cos, t: rn.tan, o: tw.short.opp, a: tw.short.adj, h: tw.short.hyp })}
          back={w.whyBack}
          next={w.whyNext}
          onStep={setExplain}
          picture={<WhyPicture step={whys[explain]} short={tw.short} />}
        />
      )}
      <GameActions game={game} g={g} done={d.done} always>
        {cur?.kind === "third" &&
          task.thirds.map((sq) => (
            <button key={sq} className="live-btn on" disabled={d.said?.kind === "third" && d.said.sq === sq} onClick={() => pickThird(sq)}>
              {rootText(sq)}
            </button>
          ))}
        <button className={`live-btn${explain !== null ? " on" : ""}`} aria-pressed={explain !== null} onClick={() => setExplain(explain !== null ? null : Math.max(0, openAt))}>
          💡 {w.why}
        </button>
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
