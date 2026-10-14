// Long division on the board: the division tool's own working (bracket, corner or short), stepped through in place.
// With "Your turn" on, each quotient digit is asked for before it is drawn: a digit that is too big or too small is
// answered with the multiplication or the subtraction that shows why. With blocks (small whole numbers), the pupil
// shares hundreds, tens and ones into the groups by hand, and the working fills in as each place is shared out.
import { useMemo, useState } from "react";
import { DIVISION_STYLES, divisionStepCount, planDivision, renderDivision, type DivisionSpec } from "../math/division";
import { blocksFit } from "../math/divisionBlocks";
import { divisionAsk, divisionNumbers, judgeDigit, type LiveDivision } from "../math/live";
import { shareStatus, sharingAt, stepsShared } from "../math/sharing";
import { SharingBoard } from "./SharingBoard";
import { fill, Stepper, Toggle, type PieceProps } from "./ui";

// The room the working has in the piece (less beside the blocks); it is scaled to fit, the same scale at every step.
const PW = 740;
const PH = { alone: 620, blocks: 330 };

const specOf = (d: LiveDivision, step: number): DivisionSpec => ({ type: "division", style: d.style, a: d.a, b: d.b, decimals: d.decimals, step });
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

export function LongDivision({ state, set, w, svgRef }: PieceProps<"division">) {
  const d = state;
  const { a, b, decimals, style } = d;
  const wd = w.division;
  const fits = blocksFit(a, b, decimals);
  const hands = d.blocks && fits;
  const plan = useMemo(() => planDivision(a, b, decimals), [a, b, decimals]);
  const n = divisionStepCount(specOf(d, 0));
  // With blocks the arrangement decides how far the working has got; otherwise the step does.
  const share = hands ? (d.share && d.share.groups.length === b ? d.share : sharingAt(plan, b, 0)) : null;
  const k = share ? stepsShared(plan, b, share) : Math.min(d.step, n);
  const ph = hands ? PH.blocks : PH.alone;
  // The biggest the working gets over all its steps, so it doesn't jump about as it grows.
  const box = useMemo(() => {
    let [bw, bh] = [1, 1];
    for (let i = 0; i <= n; i++) {
      const r = renderDivision({ type: "division", style, a, b, decimals, step: i });
      [bw, bh] = [Math.max(bw, r.width), Math.max(bh, r.height)];
    }
    return { w: bw, h: bh, s: Math.min(1.5, PW / bw, ph / bh) };
  }, [a, b, decimals, style, n, ph]);
  const pic = renderDivision(specOf(d, k));
  const ask = d.turn && !hands ? divisionAsk({ ...d, step: k }) : null;
  const [said, setSaid] = useState<{ step: number; text: string; ok: boolean } | null>(null);

  const go = (step: number) => {
    const to = Math.max(0, Math.min(n, step));
    set(hands ? { ...d, share: sharingAt(plan, b, to) } : { ...d, step: to });
  };
  const numbers = (patch: Partial<LiveDivision>) => set({ ...d, ...divisionNumbers({ ...d, ...patch }), step: 0, share: null });
  const guess = (g: number) => {
    if (!ask) return;
    const verdict = judgeDigit(ask, g);
    const p = g * ask.b;
    if (verdict === "right") {
      setSaid({ step: k + 1, text: fill(wd.right, { q: g, b: ask.b, p }), ok: true });
      go(k + 1);
    } else setSaid({ step: k, text: fill(wd[verdict], { g, b: ask.b, p, cur: ask.cur, r: ask.cur - p }), ok: false });
  };
  const number = (key: "a" | "b", label: string) => (
    <input
      className="live-num"
      key={`${key}${d[key]}`}
      type="number"
      defaultValue={d[key]}
      aria-label={label}
      onBlur={(e) => Number(e.target.value) !== d[key] && numbers({ [key]: Number(e.target.value) })}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
  const status = share && shareStatus(share);
  const place = (p: "h" | "t" | "o") => wd.places[p];

  return (
    <>
      <div className="live-bar">
        {number("a", wd.dividend)}
        <b>{d.style === "corner" ? ":" : "÷"}</b>
        {number("b", wd.divisor)}
        <span className="live-note">{wd.decimals}</span>
        <Stepper value={d.decimals} min={0} max={10} onChange={(v) => numbers({ decimals: v })} less="−" more="+" />
        {DIVISION_STYLES.map((s) => (
          <Toggle key={s} on={d.style === s} onClick={() => set({ ...d, style: s })}>{wd.styles[s]}</Toggle>
        ))}
      </div>
      <div className="live-stage" style={{ width: PW, height: ph }}>
        <svg ref={svgRef} width={box.w * box.s} height={box.h * box.s} viewBox={`0 0 ${box.w} ${box.h}`}>
          <rect width={box.w} height={box.h} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: inner(pic.svg) }} />
        </svg>
      </div>
      {share && <SharingBoard share={share} onChange={(s) => set({ ...d, share: s })} change={wd.change} />}
      <div className="live-bar">
        <button className="live-btn" disabled={k === 0} title={wd.first} aria-label={wd.first} onClick={() => go(0)}>⏮</button>
        <button className="live-btn" disabled={k === 0} title={wd.prev} aria-label={wd.prev} onClick={() => go(k - 1)}>◀</button>
        <span className="live-note">{fill(wd.step, { k, n })}</span>
        <button className="live-btn" disabled={k >= n} title={wd.next} aria-label={wd.next} onClick={() => go(k + 1)}>▶</button>
        <button className="live-btn" disabled={k >= n} title={wd.all} aria-label={wd.all} onClick={() => go(n)}>⏭</button>
        {!hands && <Toggle on={d.turn} onClick={() => set({ ...d, turn: !d.turn })}>✋ {wd.turn}</Toggle>}
        <Toggle on={hands} title={fits ? undefined : wd.blocksOff} onClick={() => fits && set({ ...d, blocks: !d.blocks, share: null })}>🧱 {wd.blocks}</Toggle>
      </div>
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
      ) : ask ? (
        <div className="live-bar">
          <span>{fill(wd.ask, { b: ask.b, cur: ask.cur })}</span>
          <span className="live-digits">
            {Array.from({ length: 10 }, (_, g) => (
              <button key={g} className="live-btn" onClick={() => guess(g)}>{g}</button>
            ))}
          </span>
        </div>
      ) : (
        d.turn && k >= n && <p className="live-hint">{wd.done}</p>
      )}
      {!hands && said && said.step === k && <p className={`live-said${said.ok ? " ok" : ""}`}>{said.text}</p>}
    </>
  );
}
