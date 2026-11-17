// Round the unit circle: a point P dragged round a circle of radius 1 (or turned 15° at a time with the arrow keys),
// its across drawn as cos and its up as sin as it goes. Easy: put P at an angle, then pick its coordinates from four
// (a wrong pair is drawn, in orange, where it really is). Medium: solve sin θ = ½ or the like by putting P at each of
// its angles, the line sin = ½ dashed across the circle. Hard: no line; tan, drawn where the line through P meets the
// tangent at 1; and an equation with one angle, the other ratio's sign given. A wrong angle is told what its ratio
// really is there, and whether only the sign is wrong. No misses earns three stars, one two. Built on the game shell.
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  CIRCLE_LADDER,
  CIRCLE_NOTICES,
  circleNotice,
  circleNow,
  circleStars,
  coordText,
  exactText,
  fnAt,
  norm,
  snap,
  solveSlip,
  type LiveUnitCircle,
} from "../math/unitCircleGame";
import { starText } from "./ladderUi";
import { fill, FONT, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const FRESH: Partial<LiveUnitCircle> = { p: 0, placed: false, found: [], misses: 0, done: false, said: null };
const W = 460;
const H = 440;
const [CX, CY, R] = [230, 220, 150];
const RAD = Math.PI / 180;
const COS = "#0c8599";
const SIN = "#9c36b5";
const r2 = (v: number) => Math.round(v * 10) / 10;
const at = (a: number, r = R): [number, number] => [r2(CX + r * Math.cos(a * RAD)), r2(CY - r * Math.sin(a * RAD))];

export function UnitCircleGame({ state: d, set, w: words, svgRef }: PieceProps<"unitCircleGame">) {
  const [w, g] = [words.unitCircleGame, words.game];
  const game = useGame({ key: "zeno.unitcircle.v1", size: CIRCLE_LADDER.length, notices: CIRCLE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = circleNow(d);
  const stars = circleStars(d.misses);
  const [drag, setDrag] = useState<number | null>(null);
  const p = drag ?? d.p;
  const moving = !d.done && !(task.kind === "place" && d.placed);

  const angleAt = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = svgPoint(e.currentTarget, e);
    return snap(Math.atan2(CY - y, x - CX) / RAD);
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (!moving || e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag(angleAt(e));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => drag !== null && setDrag(angleAt(e));
  const up = () => {
    if (drag === null) return;
    setDrag(null);
    if (drag !== d.p) game.tap({ p: drag, said: null });
  };
  const key = (e: KeyboardEvent) => {
    if (!moving) return;
    const by = e.key === "ArrowRight" || e.key === "ArrowUp" ? 15 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -15 : 0;
    if (!by) return;
    e.preventDefault();
    game.tap({ p: norm(d.p + by), said: null });
  };

  const rn = w.ratios;
  const eq = task.kind === "solve" ? `${rn[task.fn]} θ = ${exactText(task.v)}${task.cond ? `${w.and}${w.cond[task.cond]}` : ""}` : "";
  const list = (xs: number[]) => xs.map((a) => `${a}°`).join(", ");

  const check = () => {
    if (task.kind === "place") {
      if (d.p !== task.angle) return game.miss({ misses: d.misses + 1, said: { kind: "place", a: d.p } });
      return game.step({ placed: true, said: null }, { counts: false });
    }
    const slip = solveSlip(task, d.p, d.found);
    if (slip === "again") return game.tap({ said: { kind: "solve", a: d.p, why: "again" } });
    if (slip) return game.miss({ misses: d.misses + 1, said: { kind: "solve", a: d.p, why: slip } });
    const found = [...d.found, d.p].sort((a, b) => a - b);
    if (found.length < task.answers.length) return game.step({ found, said: null }, { counts: false });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => circleNotice(task, d.misses, streak), patch: { found, done: true } });
  };
  const pickCoords = (b: number) => {
    if (task.kind !== "place") return;
    if (b !== task.angle) return game.miss({ misses: d.misses + 1, said: { kind: "coords", b } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => circleNotice(task, d.misses, streak), patch: { done: true } });
  };

  const prompt =
    task.kind === "place"
      ? d.placed ? fill(w.coords, { t: task.angle, c: rn.cos, s: rn.sin }) : fill(w.place, { t: task.angle })
      : fill(task.answers.length === 1 ? w.solveOne : w.solveMany, { eq, n: task.answers.length });
  const oneStar = d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : "";
  const doneLine = task.kind === "place" ? fill(w.rightPlace, { t: task.angle, xy: coordText(task.angle), stars: starText(stars) }) + oneStar : fill(w.rightSolve, { eq, list: list(task.answers), stars: starText(stars) }) + oneStar;
  const why = (): string => {
    const s = d.said;
    if (!s || s.kind === "notice") return "";
    if (s.kind === "place" && task.kind === "place") {
      const diff = ((task.angle - s.a + 540) % 360) - 180;
      return fill(w.placeWhy, { a: s.a, t: task.angle, d: Math.abs(diff), dir: diff > 0 ? w.anti : w.clock });
    }
    if (s.kind === "coords" && task.kind === "place") return fill(w.coordsWhy, { xy: coordText(s.b), b: s.b, t: task.angle });
    if (s.kind === "solve" && task.kind === "solve") {
      const v = fnAt(task.fn, s.a);
      const text = s.why === "sign" ? `${w.solveWhy.sign} ${w.signWhere[task.fn]}` : w.solveWhy[s.why];
      return fill(text, { a: s.a, f: rn[task.fn], v: exactText(v), want: exactText(task.v), cond: task.cond ? w.cond[task.cond] : "" });
    }
    return "";
  };
  const progress = task.kind === "solve" && d.found.length > 0 ? fill(w.foundSome, { list: list(d.found), n: task.answers.length - d.found.length }) : "";
  const hint = task.kind === "place" && d.placed ? w.pickHint : progress || w.dragHint;
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${doneLine}` }
    : d.done ? { tone: "ok", text: doneLine }
    : d.said ? { tone: d.said.kind === "solve" && d.said.why === "again" ? "hint" : "wrong", text: `${why()} ${progress}`.trim() }
    : { tone: "hint", text: hint };

  const [px, py] = at(p);
  const showGuide = task.kind === "solve" && task.level === 2 && task.fn !== "tan";
  const ghost = d.said?.kind === "coords" ? d.said.b : null;
  const wrongAt = d.said?.kind === "solve" && d.said.why !== "again" && d.said.a === p;
  const arcR = 30;
  const [ax, ay] = at(p, arcR);

  return (
    <>
      <GameHead game={game} g={g}>
        <Stake stars={stars} tries={d.misses} g={g} />
      </GameHead>
      <Said line={{ tone: "prompt", text: prompt }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          fontFamily={FONT}
          role="img"
          aria-label={prompt}
          style={{ cursor: moving ? "grab" : "default", touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <rect width={W} height={H} fill="#fff" />
          <line x1={CX - R - 34} y1={CY} x2={CX + R + 34} y2={CY} stroke="#adb5bd" strokeWidth={1.5} />
          <line x1={CX} y1={CY - R - 34} x2={CX} y2={CY + R + 34} stroke="#adb5bd" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1e1e" strokeWidth={2} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = i * 15;
            const long = a % 90 === 0 ? 10 : a % 45 === 0 || a % 30 === 0 ? 7 : 4;
            const [x1, y1] = at(a, R - long);
            const [x2, y2] = at(a, R + long);
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#495057" strokeWidth={a % 90 === 0 ? 2 : 1.2} />;
          })}
          {[0, 90, 180, 270].map((a) => {
            // Beside the axis on the left and right, so the line doesn't run through the label.
            const [x, y] = at(a, R + 24);
            return <text key={a} x={x} y={a % 180 === 0 ? y - 7 : y + 5} fontSize={13} textAnchor="middle" fill="#868e96" stroke="#fff" strokeWidth={4} paintOrder="stroke">{a}°</text>;
          })}
          <text x={CX + R + 6} y={CY + 16} fontSize={12} fill="#868e96">1</text>
          {showGuide && task.kind === "solve" && (
            task.fn === "sin" ? (
              <g>
                <line x1={CX - R - 20} y1={r2(CY - R * task.v)} x2={CX + R + 20} y2={r2(CY - R * task.v)} stroke={SIN} strokeWidth={2} strokeDasharray="7 5" />
                <text x={CX + R + 22} y={r2(CY - R * task.v - 6)} fontSize={13} fontWeight={700} fill={SIN}>{eq}</text>
              </g>
            ) : (
              <g>
                <line x1={r2(CX + R * task.v)} y1={CY - R - 20} x2={r2(CX + R * task.v)} y2={CY + R + 20} stroke={COS} strokeWidth={2} strokeDasharray="7 5" />
                <text x={r2(CX + R * task.v)} y={CY - R - 26} fontSize={13} fontWeight={700} textAnchor="middle" fill={COS}>{eq}</text>
              </g>
            )
          )}
          {task.kind === "solve" && task.fn === "tan" && <TanLine p={p} label={rn.tan} />}
          {/* The angle from 0°, anticlockwise, and the radius to P. */}
          {p !== 0 && <path d={`M${CX + arcR},${CY} A${arcR},${arcR} 0 ${p > 180 ? 1 : 0} 0 ${ax},${ay}`} fill="none" stroke="#2f9e44" strokeWidth={2.5} />}
          <line x1={CX} y1={CY} x2={px} y2={py} stroke="#1971c2" strokeWidth={2.5} />
          {/* P's across (cos) and up (sin). */}
          <line x1={CX} y1={CY} x2={px} y2={CY} stroke={wrongAt && task.kind === "solve" && task.fn === "cos" ? "#e8590c" : COS} strokeWidth={5} strokeLinecap="round" />
          <line x1={px} y1={CY} x2={px} y2={py} stroke={wrongAt && task.kind === "solve" && task.fn === "sin" ? "#e8590c" : SIN} strokeWidth={5} strokeLinecap="round" />
          {Math.abs(px - CX) > 24 && <text x={r2((CX + px) / 2)} y={py < CY ? CY + 18 : CY - 8} fontSize={13} fontWeight={700} textAnchor="middle" fill={COS}>{rn.cos}</text>}
          {Math.abs(py - CY) > 24 && <text x={px + (px >= CX ? 8 : -8)} y={r2((CY + py) / 2 + 5)} fontSize={13} fontWeight={700} textAnchor={px >= CX ? "start" : "end"} fill={SIN}>{rn.sin}</text>}
          {d.found.map((a) => {
            const [x, y] = at(a);
            const [lx, ly] = at(a, R + 30);
            return (
              <g key={`f${a}`}>
                <circle cx={x} cy={y} r={7} fill="#2f9e44" />
                <text x={lx} y={ly + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill="#2f9e44" stroke="#fff" strokeWidth={4} paintOrder="stroke">{a}°</text>
              </g>
            );
          })}
          {ghost !== null && (() => {
            const [x, y] = at(ghost);
            const [lx, ly] = at(ghost, R + 34);
            return (
              <g>
                <circle cx={x} cy={y} r={8} fill="none" stroke="#e8590c" strokeWidth={3} />
                <text x={lx} y={ly + 5} fontSize={13} fontWeight={700} textAnchor="middle" fill="#e8590c" stroke="#fff" strokeWidth={4} paintOrder="stroke">{coordText(ghost)}</text>
              </g>
            );
          })()}
          <circle
            className="uc-handle"
            role="slider"
            tabIndex={0}
            aria-label={w.handle}
            aria-valuemin={0}
            aria-valuemax={345}
            aria-valuenow={p}
            aria-valuetext={`${p}°`}
            cx={px}
            cy={py}
            r={drag !== null ? 13 : 11}
            fill={d.done ? "#2f9e44" : "#1971c2"}
            stroke="#fff"
            strokeWidth={3}
            onKeyDown={key}
          />
          <text x={px + (px >= CX ? 14 : -14)} y={py + (py <= CY ? -10 : 20)} fontSize={15} fontWeight={700} textAnchor={px >= CX ? "start" : "end"} fill="#1e1e1e" stroke="#fff" strokeWidth={4} paintOrder="stroke">
            {d.done && task.kind === "place" ? `P ${coordText(p)}` : "P"}
          </text>
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        {task.kind === "place" && d.placed
          ? task.choices.map((b) => (
              <button key={b} className="live-btn on" disabled={b === ghost} onClick={() => pickCoords(b)}>
                {coordText(b)}
              </button>
            ))
          : <button className="live-btn on" onClick={check}>{g.check}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** tan, drawn: the line through the middle and P, out to where it meets the upright tangent at 1. */
function TanLine({ p, label }: { p: number; label: string }) {
  const t = fnAt("tan", p);
  const x1 = CX + R;
  const reach = R + 60;
  const tangent = <line x1={x1} y1={CY - reach} x2={x1} y2={CY + reach} stroke="#adb5bd" strokeWidth={1.5} strokeDasharray="5 4" />;
  if (Number.isNaN(t)) return tangent;
  // Too steep to meet the tangent on the picture: the line runs to the edge, the bar to its end.
  const steep = Math.abs(R * t) > reach;
  const [ex, ey] = steep ? [CX + reach / Math.abs(t), CY - Math.sign(t) * reach] : [x1, CY - R * t];
  const ty = steep ? CY - Math.sign(t) * reach : ey;
  return (
    <g>
      {tangent}
      <line x1={CX} y1={CY} x2={r2(ex)} y2={r2(ey)} stroke="#e8590c" strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={x1} y1={CY} x2={x1} y2={r2(ty)} stroke="#e8590c" strokeWidth={5} strokeLinecap="round" />
      <text x={x1 + 8} y={r2((CY + ty) / 2 + 5)} fontSize={13} fontWeight={700} fill="#e8590c">{label}</text>
    </g>
  );
}

