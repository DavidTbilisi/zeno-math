// Long division on the board: the division tool's own working (bracket, corner or short), stepped through in place.
// With "Your turn" on, each quotient digit is asked for before it is drawn: a digit that is too big or too small is
// answered with the multiplication or the subtraction that shows why. With blocks (small whole numbers), the pupil
// shares hundreds, tens and ones into the groups by hand, and the working fills in as each place is shared out.
// The special cases are named under the working (0 ÷ n, n ÷ 1, n ÷ n), and n ÷ 0 shows why it has no working at all.
// Worked by hand: the numbers are digit wheels (one more, faded, on the left for a longer number), the decimal places a
// wheel and the layouts pills; a tap on the working takes the next step and the steps under it are a track to drag
// along; with "Your turn" the next digit is tapped from a row of tiles (or typed). With "Labels" the step just done is
// named beside the working with arrows: what each group gets, what was taken away, what is left.
import { useMemo, useState, type KeyboardEvent } from "react";
import { DIVISION_LIMITS, DIVISION_STYLES, divisionStepCount, planDivision, renderDivision, type DivisionLabels, type DivisionSpec } from "../math/division";
import { blocksFit } from "../math/divisionBlocks";
import { divisionAsk, divisionCase, divisionNumbers, judgeDigit, type LiveDivision } from "../math/live";
import { shareStatus, sharingAt, stepsShared } from "../math/sharing";
import { SharingBoard } from "./SharingBoard";
import { BLUE, keyTap, NumBox, Pill, Tabs, useDrag } from "./hand";
import { fill, FONT, INK, type PieceProps } from "./ui";

// The room the working has in the piece (less beside the blocks); it is scaled to fit, the same scale at every step.
const PW = 740;
const PH = { alone: 340, blocks: 240 };
const NOTE_H = 50; // the stage gives up this much when a special case is named under it

const specOf = (d: LiveDivision, step: number, labels?: DivisionLabels): DivisionSpec => ({ type: "division", style: d.style, a: d.a, b: d.b, decimals: d.decimals, step, labels });
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

export function LongDivision(props: PieceProps<"division">) {
  return props.state.b === 0 ? <ByZero {...props} /> : <Working {...props} />;
}

const WHEEL = 34;
const HEAD_H = 100;
/** The step track under the working: its two ends, and the row of digit tiles under it for "Your turn". */
const TRACK = { x0: 130, x1: PW - 12, y: 22 };
const TILE = 44;

/** A number as a wheel for each digit, and a faded one on its left for one digit more (up to `most` digits). */
function digitWheels(x: number, y: number, value: number, most: number, what: string, word: string, onChange: (v: number) => void) {
  const len = String(value).length;
  const places = len + (len < most ? 1 : 0);
  const out = Array.from({ length: places }, (_, i) => {
    const p = 10 ** (places - 1 - i);
    const digit = Math.floor(value / p) % 10;
    const lead = i === 0 && places > len;
    return (
      <NumBox key={p} x={x + i * (WHEEL + 3)} y={y} w={WHEEL} h={44} size={20} value={digit} min={0} max={9}
        label={fill(word, { what, place: p })} show={(v) => (lead && !v ? "·" : `${v}`)} onChange={(v) => onChange(value + (v - digit) * p)} />
    );
  });
  return { wheels: out, end: x + places * (WHEEL + 3) };
}

/** The numbers to divide, the decimal places and the layout, and the two ways of working: the same whatever the numbers are. */
function Head({ state: d, set, w, hands, fits }: PieceProps<"division"> & { hands: boolean; fits: boolean }) {
  const wd = w.division;
  const numbers = (patch: Partial<LiveDivision>) => set({ ...d, ...divisionNumbers({ ...d, ...patch }), step: 0, share: null });
  const A = digitWheels(0, 6, d.a, String(DIVISION_LIMITS.a).length, wd.dividend, wd.digit, (a) => numbers({ a }));
  const B = digitWheels(A.end + 32, 6, d.b, String(DIVISION_LIMITS.b).length, wd.divisor, wd.digit, (b) => numbers({ b }));
  const tabsW = DIVISION_STYLES.reduce((s, k) => s + Math.max(60, wd.styles[k].length * 13 * 0.6 + 24) + 6, 0);
  return (
    <svg className="hand-pic" width={PW} height={HEAD_H} viewBox={`0 0 ${PW} ${HEAD_H}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none" }}>
      {A.wheels}
      <text x={A.end + 13} y={36} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK}>{d.style === "corner" ? ":" : "÷"}</text>
      {B.wheels}
      <text x={PW - 60} y={34} fontSize={13} textAnchor="end" fill={INK}>{wd.decimals}</text>
      <NumBox x={PW - 52} y={6} w={52} h={44} size={20} value={d.decimals} min={0} max={DIVISION_LIMITS.decimals} label={wd.decimals}
        onChange={(v) => numbers({ decimals: v })} />
      <Tabs x={0} y={62} keys={DIVISION_STYLES} on={d.style} names={wd.styles} size={13} onPick={(s) => set({ ...d, style: s })} />
      <Pill x={tabsW + 14} y={62} w={140} h={28} size={13} text={`✋ ${wd.turn}`} title={wd.turn} on={d.turn && !hands} disabled={hands}
        onTap={() => set({ ...d, turn: !d.turn })} />
      <Pill x={tabsW + 162} y={62} w={110} h={28} size={13} text={`🧱 ${wd.blocks}`} title={fits ? wd.blocks : wd.blocksOff} on={hands} disabled={!fits}
        onTap={() => set({ ...d, blocks: !d.blocks, share: null })} />
      <Pill x={tabsW + 280} y={62} w={Math.max(100, wd.labels.length * 8 + 44)} h={28} size={13} text={`➜ ${wd.labels}`} title={wd.labelsTitle}
        on={!!d.labels && d.style !== "short"} disabled={d.style === "short"} onTap={() => set({ ...d, labels: !d.labels })} />
    </svg>
  );
}

/** n ÷ 0: there is no working to step through, only the reason why. */
function ByZero(props: PieceProps<"division">) {
  const { state: d, w, svgRef } = props;
  const wd = w.division;
  const [sw, sh] = [PW, 300];
  return (
    <>
      <Head {...props} hands={false} fits={false} />
      <div className="live-stage" style={{ width: PW, height: 300 }}>
        <svg ref={svgRef} width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <rect width={sw} height={sh} fill="#fff" />
          <text x={sw / 2} y={130} fontFamily="Consolas, 'Courier New', monospace" fontSize={64} textAnchor="middle" fill={INK}>
            {d.a} {d.style === "corner" ? ":" : "÷"} 0
          </text>
          <text x={sw / 2} y={210} fontFamily={FONT} fontSize={40} fontWeight={700} textAnchor="middle" fill="#c92a2a">{wd.undefined}</text>
        </svg>
      </div>
      <p className="live-said info"><b>{fill(wd.cases.byZero.rule, { a: d.a })}</b> {wd.cases.byZero.why}</p>
      <p className="live-hint">{wd.hint}</p>
    </>
  );
}

function Working(props: PieceProps<"division">) {
  const { state: d, set, w, svgRef } = props;
  const { a, b, decimals, style } = d;
  const wd = w.division;
  const fits = blocksFit(a, b, decimals);
  const hands = d.blocks && fits;
  const plan = useMemo(() => planDivision(a, b, decimals), [a, b, decimals]);
  const n = divisionStepCount(specOf(d, 0));
  // With blocks the arrangement decides how far the working has got; otherwise the step does.
  const share = hands ? (d.share && d.share.groups.length === b ? d.share : sharingAt(plan, b, 0)) : null;
  const k = share ? stepsShared(plan, b, share) : Math.min(d.step, n);
  const special = divisionCase(a, b);
  const labels = useMemo<DivisionLabels | undefined>(
    () => (d.labels ? { each: wd.each, taken: wd.taken, left: wd.leftOf, leftAny: wd.leftAny } : undefined),
    [d.labels, wd],
  );
  const ph = (hands ? PH.blocks : PH.alone) - (special ? NOTE_H : 0);
  // The biggest the working gets over all its steps, so it doesn't jump about as it grows.
  const box = useMemo(() => {
    let [bw, bh] = [1, 1];
    for (let i = 0; i <= n; i++) {
      const r = renderDivision({ type: "division", style, a, b, decimals, step: i, labels });
      [bw, bh] = [Math.max(bw, r.width), Math.max(bh, r.height)];
    }
    return { w: bw, h: bh, s: Math.min(1.5, PW / bw, ph / bh) };
  }, [a, b, decimals, style, n, ph, labels]);
  const pic = renderDivision(specOf(d, k, labels));
  const ask = d.turn && !hands ? divisionAsk({ ...d, step: k }) : null;
  const [said, setSaid] = useState<{ step: number; text: string; ok: boolean } | null>(null);

  const go = (step: number) => {
    const to = Math.max(0, Math.min(n, step));
    set(hands ? { ...d, share: sharingAt(plan, b, to) } : { ...d, step: to });
  };
  const guess = (g: number) => {
    if (!ask) return;
    const verdict = judgeDigit(ask, g);
    const p = g * ask.b;
    if (verdict === "right") {
      setSaid({ step: k + 1, text: fill(wd.right, { q: g, b: ask.b, p }), ok: true });
      go(k + 1);
    } else setSaid({ step: k, text: fill(wd[verdict], { g, b: ask.b, p, cur: ask.cur, r: ask.cur - p }), ok: false });
  };
  const status = share && shareStatus(share);
  const trackX = (i: number) => TRACK.x0 + (n ? (i / n) * (TRACK.x1 - TRACK.x0) : 0);
  const stepAt = (x: number) => Math.round(((x - TRACK.x0) / (TRACK.x1 - TRACK.x0)) * n);
  const { drag, begin, svgProps } = useDrag<object>((h) => !h.moved && go(stepAt(h.x)), (h) => h.moved && stepAt(h.x) !== k && go(stepAt(h.x)));
  const trackKey = (e: KeyboardEvent) => {
    const to = { ArrowRight: k + 1, ArrowUp: k + 1, ArrowLeft: k - 1, ArrowDown: k - 1, Home: 0, End: n }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };
  const tapWorking = () => !ask && k < n && go(k + 1);
  const typeDigit = (e: KeyboardEvent) => {
    if (ask && /^[0-9]$/.test(e.key)) {
      // The board's own keys are digits too (its tools): this one is an answer, not a tool.
      e.preventDefault();
      e.stopPropagation();
      return guess(Number(e.key));
    }
    keyTap(e, tapWorking);
  };
  const place = (p: "h" | "t" | "o") => wd.places[p];

  return (
    <>
      <Head {...props} hands={hands} fits={fits} />
      <div className="live-stage" style={{ width: PW, height: box.h * box.s, cursor: !ask && k < n ? "pointer" : undefined }} role="button" tabIndex={0}
        aria-label={wd.next} aria-disabled={!!ask || k >= n} onClick={tapWorking} onKeyDown={typeDigit}>
        <svg ref={svgRef} width={box.w * box.s} height={box.h * box.s} viewBox={`0 0 ${box.w} ${box.h}`}>
          <rect width={box.w} height={box.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: inner(pic.svg) }} />
        </svg>
      </div>
      {special && (
        <p className="live-said info"><b>{fill(wd.cases[special].rule, { a, b })}</b> {wd.cases[special].why}</p>
      )}
      {share && <SharingBoard share={share} onChange={(s) => set({ ...d, share: s })} change={wd.change} />}
      <svg className="hand-pic" width={PW} height={ask ? 112 : 44} viewBox={`0 0 ${PW} ${ask ? 112 : 44}`} fontFamily={FONT} {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}>
        <text x={0} y={TRACK.y + 5} fontSize={14} fill="#495057">{fill(wd.step, { k, n })}</text>
        <g role="slider" tabIndex={0} aria-label={wd.steps} aria-valuemin={0} aria-valuemax={n} aria-valuenow={k} onKeyDown={trackKey}
          style={{ cursor: "ew-resize" }} onPointerDown={(e) => begin(e, {})}>
          <rect x={TRACK.x0 - 12} y={TRACK.y - 16} width={TRACK.x1 - TRACK.x0 + 24} height={32} fill="transparent" />
          <line x1={TRACK.x0} y1={TRACK.y} x2={TRACK.x1} y2={TRACK.y} stroke="#dee2e6" strokeWidth={6} strokeLinecap="round" />
          <line x1={TRACK.x0} y1={TRACK.y} x2={trackX(k)} y2={TRACK.y} stroke="#a5d8ff" strokeWidth={6} strokeLinecap="round" />
          {n <= 60 && Array.from({ length: n + 1 }, (_, i) => (
            <circle key={i} cx={trackX(i)} cy={TRACK.y} r={2.5} fill={i <= k ? BLUE : "#adb5bd"} pointerEvents="none" />
          ))}
          <circle cx={trackX(k)} cy={TRACK.y} r={drag ? 12 : 10} fill={BLUE} stroke="#fff" strokeWidth={2} pointerEvents="none" />
        </g>
        {ask && (
          <g>
            <text x={0} y={TRACK.y + 46} fontSize={15} fontWeight={700} fill={INK}>{fill(wd.ask, { b: ask.b, cur: ask.cur })}</text>
            {Array.from({ length: 10 }, (_, g) => (
              <g key={g} role="button" tabIndex={0} aria-label={`${g}`} style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}
                onClick={() => guess(g)} onKeyDown={(e) => keyTap(e, () => guess(g))}>
                <rect x={g * (TILE + 6)} y={TRACK.y + 56} width={TILE} height={TILE - 12} rx={7} fill="#fff9db" stroke="#e67700" />
                <text x={g * (TILE + 6) + TILE / 2} y={TRACK.y + 79} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{g}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
      {status ? (
        <p className={`live-said${status.kind === "done" ? " ok" : " info"}`}>
          {status.kind === "unfair"
            ? wd.unfair
            : status.kind === "more"
              ? fill(wd.more, { place: place(status.place) })
              : status.kind === "trade"
                ? fill(wd.trade, { n: status.n, place: place(status.place), b })
                : fill(status.left ? wd.shared : wd.sharedExact, { each: status.each, left: status.left })}
        </p>
      ) : (
        d.turn && k >= n && <p className="live-hint">{wd.done}</p>
      )}
      {!hands && said && said.step === k && <p className={`live-said${said.ok ? " ok" : ""}`}>{said.text}</p>}
      <p className="live-hint">{wd.hint}</p>
    </>
  );
}
