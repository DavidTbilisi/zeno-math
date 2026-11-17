// A soroban on the board: click a bead to push it against the beam or away from it, and the number underneath follows.
// "Add" and "Take away" step through a sum the way it is done on a soroban, a rod at a time from the highest place,
// saying at each rod whether the beads go straight on or off or need a friend of 5 or of 10; and "Show a number" asks
// the pupil to set one. Adding or taking away 0 is allowed, to see that no bead moves; after ± 1 the answer is named as
// the next or the number before, and a number taken from itself as leaving 0.
import type { Dict } from "../locales/en";
import type { LiveSoroban } from "../math/live";
import { beadsOf, clickBead, rodDigits, SOROBAN_RODS, sorobanFits, sorobanMax, sorobanSteps, sorobanTarget, type SorobanStep } from "../math/soroban";
import { subCase } from "../math/addition";
import { fill, FONT, INK, Stepper, Toggle, type PieceProps } from "./ui";

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

/** 1 234 567, with thin spaces between the thousands. */
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, " ");

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

export function Soroban({ state, set, w: words, svgRef }: PieceProps<"soroban">) {
  const w = words.soroban;
  const { rods, value, work } = state;
  const W = rods * SP + 2 * M;
  const steps = work ? sorobanSteps(work.start, work.sign, work.n) : [];
  const k = work ? Math.min(work.step, steps.length) : 0;
  const current = k > 0 ? steps[k - 1] : null;
  const digits = rodDigits(value, rods);
  const height = H + (state.showDigits ? 30 : 0) + (state.showValue ? 50 : 0);
  const rodX = (i: number) => M + SP / 2 + i * SP;
  const fits = sorobanFits(value, 1, state.n, rods);
  const fitsBack = sorobanFits(value, -1, state.n, rods);

  const patch = (p: Partial<LiveSoroban>) => set({ ...state, ...p });
  const click = (place: number, bead: "five" | number) => patch({ value: clickBead(value, place, bead), work: null });
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

  const bead = (key: string, x: number, y: number, onClick: () => void, label: string) => (
    <g key={key} style={{ transform: `translateY(${y}px)`, transition: "transform 160ms ease-out", cursor: "pointer" }} onClick={onClick} aria-label={label}>
      <polygon points={hexagon(x)} fill={BEAD} stroke={BEAD_EDGE} strokeWidth={1.5} />
      <line x1={x - BW / 2 + 6} y1={BH / 2} x2={x + BW / 2 - 6} y2={BH / 2} stroke={BEAD_EDGE} strokeWidth={0.8} opacity={0.6} />
    </g>
  );

  return (
    <>
      <svg ref={svgRef} width={W} height={height} viewBox={`0 0 ${W} ${height}`} fontFamily={FONT}>
        <rect x={0} y={0} width={W} height={H} rx={6} fill={WOOD} />
        <rect x={M - 6} y={TOP} width={W - 2 * (M - 6)} height={BOTTOM - TOP} fill="#f8f1e7" />
        {current && <rect x={rodX(rods - 1 - current.place) - SP / 2 + 2} y={TOP} width={SP - 4} height={BOTTOM - TOP} fill="#d0ebff" />}
        {digits.map((_, i) => (
          <line key={i} x1={rodX(i)} y1={TOP} x2={rodX(i)} y2={BOTTOM} stroke="#868e96" strokeWidth={3} />
        ))}
        <rect x={M - 6} y={BEAM} width={W - 2 * (M - 6)} height={EARTH - BEAM} fill={WOOD} />
        {digits.map((_, i) => (rods - 1 - i) % 3 === 0 && <circle key={i} cx={rodX(i)} cy={(BEAM + EARTH) / 2} r={2.5} fill="#fff" />)}
        {digits.map((digit, i) => {
          const place = rods - 1 - i;
          const { five, ones } = beadsOf(digit);
          const x = rodX(i);
          return (
            <g key={i} data-rod={place}>
              {bead("five", x, five ? BEAM - BH : TOP, () => click(place, "five"), w.five)}
              {[0, 1, 2, 3].map((b) => bead(`one${b}`, x, EARTH + (b < ones ? b : b + 1) * BH, () => click(place, b), w.one))}
            </g>
          );
        })}
        {state.showDigits &&
          digits.map((digit, i) => (
            <text key={i} x={rodX(i)} y={H + 22} fontSize={20} textAnchor="middle" fill={INK}>{digit}</text>
          ))}
        {state.showValue && (
          <text x={W / 2} y={height - 12} fontSize={34} textAnchor="middle" fill={INK} data-value={value}>{grouped(value)}</text>
        )}
      </svg>
      <div className="live-bar">
        <span>{w.rods}</span>
        <Stepper
          value={rods}
          min={SOROBAN_RODS.min}
          max={SOROBAN_RODS.max}
          onChange={(r) => patch({ rods: r, value: value % (sorobanMax(r) + 1), work: null })}
          less={w.fewer}
          more={w.more}
        />
        <Toggle on={state.showValue} onClick={() => patch({ showValue: !state.showValue })}>{w.number}</Toggle>
        <Toggle on={state.showDigits} onClick={() => patch({ showDigits: !state.showDigits })}>{w.digits}</Toggle>
        <button className="live-btn" onClick={() => patch({ value: 0, work: null })}>{w.clear}</button>
        <button className="live-btn" onClick={() => patch({ target: sorobanTarget(rods, Math.random), value: 0, work: null })}>🎯 {w.target}</button>
      </div>
      <div className="live-bar">
        <input
          className="live-num"
          key={state.n}
          type="number"
          min={0}
          defaultValue={state.n}
          aria-label={w.amount}
          onBlur={(e) => {
            const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
            if (n !== state.n) patch({ n });
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <button className="live-btn primary" disabled={!fits} title={fits ? undefined : fill(w.tooBig, { rods })} onClick={() => start(1)}>+ {w.add}</button>
        <button className="live-btn primary" disabled={!fitsBack} title={fitsBack ? undefined : w.tooSmall} onClick={() => start(-1)}>− {w.sub}</button>
        {work && (
          <>
            <button className="live-btn" disabled={k === 0} title={w.first} aria-label={w.first} onClick={() => go(0)}>⏮</button>
            <button className="live-btn" disabled={k === 0} title={w.prev} aria-label={w.prev} onClick={() => go(k - 1)}>◀</button>
            <span className="live-note">{fill(w.step, { k, n: steps.length })}</span>
            <button className="live-btn" disabled={k >= steps.length} title={w.next} aria-label={w.next} onClick={() => go(k + 1)}>▶</button>
            <button className="live-btn" disabled={k >= steps.length} title={w.all} aria-label={w.all} onClick={() => go(steps.length)}>⏭</button>
          </>
        )}
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
