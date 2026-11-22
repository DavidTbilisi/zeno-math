// A soroban on the board, worked by hand: a bead dragged (or tapped) towards the beam or away from it, and the number
// underneath follows; a finger run along the beam clears it; the edge of the frame dragged sideways gives more rods or
// fewer. Each rod is also a slider for the keyboard. Under the soroban, a number to add or take away is set on digit
// wheels, one a rod, and "+" or "−" starts the sum: it is done the way it is on a soroban, a rod at a time from the
// highest place, and a tap on the blue rod does the next step, saying whether the beads go straight on or off or need a
// friend of 5 or of 10; the dots under it go back to any step. The die asks the pupil to show a number. Adding or
// taking away 0 is allowed, to see that no bead moves; after ± 1 the answer is named as the next or the number before,
// and a number taken from itself as leaving 0.
import type { KeyboardEvent } from "react";
import type { Dict } from "../locales/en";
import type { LiveSoroban } from "../math/live";
import {
  beadsOf, digitAt, pushBead, rodDigits, SOROBAN_RODS, sorobanFits, sorobanMax, sorobanSteps, sorobanTarget, withDigit,
  type SorobanStep, clickBead,
} from "../math/soroban";
import { subCase } from "../math/addition";
import { BLUE, DieButton, keyTap, NumBox, Pill, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

// Rod spacing and bead size; the frame's side, top and beam; the rows below the frame.
const SP = 58;
const BW = 50;
const BH = 30;
const M = 20;
const TOP = 16;
const BEAM = TOP + 2 * BH;
const EARTH = BEAM + 14;
const BOTTOM = EARTH + 5 * BH;
const H = BOTTOM + 16;
const WOOD = "#6b4226";
const BEAD = "#e8913a";
const BEAD_EDGE = "#7a4513";
/** The picture is as wide as the most rods, so the frame's edge has room to be dragged out. */
const W = SOROBAN_RODS.max * SP + 2 * M;
/** Where the frame starts: under the pills for the number and the digits. */
const FY = 48;
const WHEEL = 30;

/** 1 234 567, with thin spaces between the thousands. */
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, " ");

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const placeName = (w: Dict["live"]["soroban"], place: number) =>
  w.places[place] ?? `10${String(place).split("").map((c) => SUP[Number(c)]).join("")}`;

function stepText(w: Dict["live"]["soroban"], s: SorobanStep): string {
  const key = `${s.sign === 1 ? "add" : "sub"}${s.rule[0].toUpperCase()}${s.rule.slice(1)}` as keyof Dict["live"]["soroban"]["rules"];
  const text = fill(w.rules[key], { place: placeName(w, s.place), d: s.d, c: s.c, e: s.e });
  return s.carry ? `${s.sign === 1 ? w.carry : w.borrow} ${text}` : text;
}

const hexagon = (x: number) =>
  [[-BW / 2, BH / 2], [-BW / 2 + 13, 1], [BW / 2 - 13, 1], [BW / 2, BH / 2], [BW / 2 - 13, BH - 1], [-BW / 2 + 13, BH - 1]]
    .map(([u, v]) => `${x + u},${v}`)
    .join(" ");

type Hold = { kind: "bead"; place: number; bead: "five" | number } | { kind: "beam" } | { kind: "edge" };

export function Soroban({ state, set, w: words, svgRef }: PieceProps<"soroban">) {
  const w = words.soroban;
  const { rods, value, work } = state;
  const frameW = rods * SP + 2 * M;
  const steps = work ? sorobanSteps(work.start, work.sign, work.n) : [];
  const k = work ? Math.min(work.step, steps.length) : 0;
  const current = k > 0 ? steps[k - 1] : null;
  const coming = work && k < steps.length ? steps[k] : null;
  const digits = rodDigits(value, rods);
  const rodX = (i: number) => M + SP / 2 + i * SP;
  const fits = sorobanFits(value, 1, state.n, rods);
  const fitsBack = sorobanFits(value, -1, state.n, rods);

  const patch = (p: Partial<LiveSoroban>) => set({ ...state, ...p });
  const setValue = (v: number) => v !== value && patch({ value: v, work: null });
  const setRods = (r: number) => {
    const to = Math.max(SOROBAN_RODS.min, Math.min(SOROBAN_RODS.max, r));
    if (to !== rods) patch({ rods: to, value: value % (sorobanMax(to) + 1), n: state.n % (sorobanMax(to) + 1), work: null });
  };
  const go = (step: number) => {
    if (!work) return;
    const to = Math.max(0, Math.min(steps.length, step));
    patch({ work: { ...work, step: to }, value: to ? steps[to - 1].after : work.start });
  };
  const start = (sign: 1 | -1) => patch({ work: { start: value, sign, n: state.n, step: 0 }, target: null });
  const sum = work && `${grouped(work.start)} ${work.sign === 1 ? "+" : "−"} ${grouped(work.n)}`;
  // The special cases are named: ± 0, ± 1 and n − n.
  const special = !work ? null : work.sign === -1 ? subCase(work.start, work.n) : work.n === 0 ? "zero" : work.n === 1 ? "one" : null;
  const minus = work?.sign === -1;

  const { drag, begin, svgProps } = useDrag<Hold>(
    (d) => {
      if (d.kind === "beam") return setValue(0);
      if (d.kind !== "bead") return;
      // A tap moves the bead over; a drag pushes it the way the hand went (down is towards the beam for the five bead).
      if (!d.moved) return setValue(clickBead(value, d.place, d.bead));
      const down = d.y > d.y0;
      setValue(pushBead(value, d.place, d.bead, d.bead === "five" ? down : !down));
    },
    (d) => d.kind === "edge" && d.moved && setRods(Math.round((d.x - 2 * M) / SP)),
  );
  const rodKey = (e: KeyboardEvent, place: number) => {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    setValue(withDigit(value, place, (digitAt(value, place) + by + 10) % 10));
  };

  const bead = (key: string, x: number, y: number, place: number, b: "five" | number, label: string, on: boolean) => (
    <g key={key} style={{ transform: `translateY(${y}px)`, transition: on ? "transform 160ms ease-out" : undefined, cursor: on ? "grab" : undefined }}
      aria-label={on ? label : undefined} onPointerDown={on ? (e) => begin(e, { kind: "bead", place, bead: b }) : undefined}>
      <polygon points={hexagon(x)} fill={BEAD} stroke={BEAD_EDGE} strokeWidth={1.5} />
      <line x1={x - BW / 2 + 6} y1={BH / 2} x2={x + BW / 2 - 6} y2={BH / 2} stroke={BEAD_EDGE} strokeWidth={0.8} opacity={0.6} pointerEvents="none" />
    </g>
  );

  // The soroban itself; `on` adds what the hand works (the beam to clear, the frame's edge, the rod to tap next).
  const dots = digits.map((_, i) => (rods - 1 - i) % 3 === 0 && <circle key={i} cx={rodX(i)} cy={(BEAM + EARTH) / 2} r={2.5} fill="#fff" pointerEvents="none" />);
  const frame = (on: boolean) => (
        <>
          <rect x={0} y={0} width={frameW} height={H} rx={6} fill={WOOD} />
          <rect x={M - 6} y={TOP} width={frameW - 2 * (M - 6)} height={BOTTOM - TOP} fill="#f8f1e7" />
          {current && <rect x={rodX(rods - 1 - current.place) - SP / 2 + 2} y={TOP} width={SP - 4} height={BOTTOM - TOP} fill="#d0ebff" />}
          {digits.map((_, i) => (
            <line key={i} x1={rodX(i)} y1={TOP} x2={rodX(i)} y2={BOTTOM} stroke="#868e96" strokeWidth={3} />
          ))}
          {on ? (
          <g role="button" tabIndex={0} aria-label={w.clearBeam} style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, { kind: "beam" })}
            onKeyDown={(e) => keyTap(e, () => setValue(0))}>
            <title>{w.clearBeam}</title>
            <rect x={M - 6} y={BEAM} width={frameW - 2 * (M - 6)} height={EARTH - BEAM} fill={drag?.kind === "beam" ? "#8b5a36" : WOOD} />
            {dots}
          </g>
          ) : (
            <>
              <rect x={M - 6} y={BEAM} width={frameW - 2 * (M - 6)} height={EARTH - BEAM} fill={WOOD} />
              {dots}
            </>
          )}
          {digits.map((digit, i) => {
            const place = rods - 1 - i;
            const { five, ones } = beadsOf(digit);
            const x = rodX(i);
            return (
              <g key={i} {...(on && { "data-rod": place, role: "slider", tabIndex: 0, "aria-label": fill(w.rod, { place: placeName(w, place) }),
                "aria-valuemin": 0, "aria-valuemax": 9, "aria-valuenow": digit, onKeyDown: (e: KeyboardEvent) => rodKey(e, place) })}>
                {bead("five", x, five ? BEAM - BH : TOP, place, "five", w.five, on)}
                {[0, 1, 2, 3].map((b) => bead(`one${b}`, x, EARTH + (b < ones ? b : b + 1) * BH, place, b, w.one, on))}
              </g>
            );
          })}
          {on && coming && (
            <g role="button" tabIndex={0} aria-label={w.next} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
              onClick={() => go(k + 1)} onKeyDown={(e) => keyTap(e, () => go(k + 1))}>
              <title>{w.next}</title>
              <rect x={rodX(rods - 1 - coming.place) - SP / 2 + 2} y={TOP} width={SP - 4} height={BOTTOM - TOP} rx={4} fill={BLUE} fillOpacity={0.15}
                stroke={BLUE} strokeWidth={2.5} strokeDasharray="7 4" />
            </g>
          )}
          {on && (
          <g role="slider" tabIndex={0} aria-label={w.rodsEdge} aria-valuemin={SOROBAN_RODS.min} aria-valuemax={SOROBAN_RODS.max} aria-valuenow={rods}
            style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, { kind: "edge" })}
            onKeyDown={(e) => {
              const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
              if (!by) return;
              e.preventDefault();
              setRods(rods + by);
            }}>
            <title>{w.rodsEdge}</title>
            <rect x={frameW - 10} y={0} width={20} height={H} fill="transparent" />
            <rect x={frameW - 3} y={H / 2 - 26} width={10} height={52} rx={5} fill={drag?.kind === "edge" ? BLUE : "#fff"} stroke={WOOD} strokeWidth={2} />
            {[-8, 0, 8].map((dy) => <line key={dy} x1={frameW} y1={H / 2 + dy} x2={frameW + 4} y2={H / 2 + dy} stroke={WOOD} strokeWidth={1.5} pointerEvents="none" />)}
          </g>
          )}
        </>
  );

  // The rows under the frame: the digits, the number, the wheels for the number to add or take away, the steps.
  const digitsY = FY + H + 22;
  const valueY = FY + H + (state.showDigits ? 30 : 0) + 38;
  const amountY = FY + H + (state.showDigits ? 30 : 0) + (state.showValue ? 50 : 0) + 14;
  const wheelsY = amountY + 12;
  const signX = M + rods * (WHEEL + 4) + 12;
  const dotsY = wheelsY + 66;
  const height = (work ? dotsY + 22 : wheelsY + 50) + 4;
  const cleanH = H + (state.showDigits ? 30 : 0) + (state.showValue ? 50 : 0);
  const nPlaces = Array.from({ length: rods }, (_, i) => rods - 1 - i);

  return (
    <>
      <svg className="hand-pic" width={W} height={height} viewBox={`0 0 ${W} ${height}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <Pill x={M} y={6} w={100} h={28} size={14} text={w.number} on={state.showValue} onTap={() => patch({ showValue: !state.showValue })} />
        <Pill x={M + 108} y={6} w={90} h={28} size={14} text={w.digits} on={state.showDigits} onTap={() => patch({ showDigits: !state.showDigits })} />
        <DieButton x={W - M - 34} y={2} s={34} title={w.target} onTap={() => patch({ target: sorobanTarget(rods, Math.random), value: 0, work: null })} />
        <g transform={`translate(0 ${FY})`}>{frame(true)}</g>
        {state.showDigits &&
          digits.map((digit, i) => (
            <text key={i} x={rodX(i)} y={digitsY} fontSize={20} textAnchor="middle" fill={INK}>{digit}</text>
          ))}
        {state.showValue && (
          <text x={frameW / 2} y={valueY} fontSize={34} textAnchor="middle" fill={INK} data-value={value}>{grouped(value)}</text>
        )}
        <text x={M} y={amountY} fontSize={13} fill="#495057">{w.amount}</text>
        {nPlaces.map((place, i) => (
          <NumBox key={place} x={M + i * (WHEEL + 4)} y={wheelsY} w={WHEEL} h={40} size={18} value={digitAt(state.n, place)} min={0} max={9}
            label={`${w.amount}: ${placeName(w, place)}`} onChange={(d) => patch({ n: withDigit(state.n, place, d) })} />
        ))}
        <Pill x={signX} y={wheelsY + 5} w={90} h={30} text={`+ ${w.add}`} strong disabled={!fits} title={fits ? `+ ${w.add}` : fill(w.tooBig, { rods })}
          onTap={() => start(1)} />
        <Pill x={signX + 98} y={wheelsY + 5} w={130} h={30} text={`− ${w.sub}`} strong disabled={!fitsBack} title={fitsBack ? `− ${w.sub}` : w.tooSmall}
          onTap={() => start(-1)} />
        {work && (
          <g>
            {Array.from({ length: steps.length + 1 }, (_, j) => (
              <g key={j} role="button" tabIndex={0} aria-label={j ? fill(w.step, { k: j, n: steps.length }) : w.first} aria-pressed={j === k}
                style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(j)} onKeyDown={(e) => keyTap(e, () => go(j))}>
                <circle cx={M + 11 + j * 28} cy={dotsY} r={11} fill={j === k ? BLUE : j < k ? "#d0ebff" : "#fff"} stroke={j <= k ? BLUE : "#adb5bd"} />
                <text x={M + 11 + j * 28} y={dotsY + 4} fontSize={11} textAnchor="middle" fill={j === k ? "#fff" : INK} pointerEvents="none">{j}</text>
              </g>
            ))}
            <text x={M + (steps.length + 1) * 28 + 6} y={dotsY + 5} fontSize={14} fill="#495057">{fill(w.step, { k, n: steps.length })}</text>
          </g>
        )}
      </svg>
      <div hidden>
        <svg ref={svgRef} width={frameW} height={cleanH} viewBox={`0 0 ${frameW} ${cleanH}`} fontFamily={FONT}>
          {frame(false)}
          {state.showDigits &&
            digits.map((digit, i) => <text key={i} x={rodX(i)} y={H + 22} fontSize={20} textAnchor="middle" fill={INK}>{digit}</text>)}
          {state.showValue && <text x={frameW / 2} y={cleanH - 12} fontSize={34} textAnchor="middle" fill={INK}>{grouped(value)}</text>}
        </svg>
      </div>
      {work ? (
        <p className="live-said info">
          {special === "zero"
            ? fill(minus ? w.minusZero : w.plusZero, { sum: sum ?? "", n: grouped(work.start) })
            : k === 0
            ? fill(w.begin, { sum: sum ?? "" })
            : k >= steps.length
              ? `${sum} = ${grouped(value)}`
              : stepText(w, steps[k - 1])}
        </p>
      ) : state.target !== null ? (
        <p className={`live-said${value === state.target ? " ok" : " info"}`}>
          {fill(value === state.target ? w.shown : w.show, { n: grouped(state.target) })}
        </p>
      ) : (
        <p className="live-hint">{w.hint}</p>
      )}
      {work && k >= steps.length && k > 0 && <p className="live-hint">{stepText(w, steps[k - 1])}</p>}
      {work && k >= steps.length && (special === "one" || special === "self") && (
        <p className="live-said ok">{special === "self" ? w.minusSelf : fill(minus ? w.minusOne : w.plusOne, { n: grouped(work.start), next: grouped(value) })}</p>
      )}
    </>
  );
}
