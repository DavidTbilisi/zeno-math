// A live piece on a page of the site instead of a board (#448): the same component, its state kept here, drawn at its
// design size and scaled down to the column when the column is narrower, so it works on a phone as on a desk.
import { Suspense, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { noteAchieved } from "../achieved";
import { useI18n } from "../i18n";
import { isPredictKind, PREDICTIONS, readGuesses } from "../model/predict";
import { isLabKind } from "../model/roadmap";
import { initialLive, LIVE_SIZES, type LiveKind, type LiveStates } from "../math/live";
import { Predict } from "./Predict";
import { PIECES } from "./registry";
import type { PieceProps } from "./ui";

/** With `predict`, a piece that has a "predict, then reveal" (#578) asks for the guess first and stays still until then. */
export function InlinePiece<K extends LiveKind>({ kind, label, predict }: { kind: K; label?: string; predict?: boolean }) {
  const { t } = useI18n();
  const asks = !!predict && isPredictKind(kind);
  const [state, setState] = useState<LiveStates[K]>(() => {
    if (!asks) return initialLive(kind);
    const p = PREDICTIONS[kind as keyof typeof PREDICTIONS];
    return (readGuesses()[kind as keyof typeof PREDICTIONS] ? p.after : p.before) as LiveStates[K];
  });
  const [guessed, setGuessed] = useState(() => !asks || !!readGuesses()[kind as keyof typeof PREDICTIONS]);
  const svgRef = useRef<SVGSVGElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, H0] = LIVE_SIZES[kind];
  const [width, setWidth] = useState(W);
  const [tall, setTall] = useState(H0);
  useLayoutEffect(() => {
    const o = outer.current, b = box.current;
    if (!o || !b) return;
    // The column's width sets the scale; what the piece shows can run taller than its design height (a long line in
    // Georgian), and then the box grows to hold it, as LiveView scales it into the element.
    const ro = new ResizeObserver(() => {
      setWidth(o.clientWidth);
      setTall(b.scrollHeight);
    });
    ro.observe(o);
    for (const c of Array.from(b.children)) ro.observe(c);
    return () => ro.disconnect();
  }, [kind]);
  const s = Math.min(1, width / W);
  const H = Math.max(H0, tall);
  const Piece = PIECES[kind] as ComponentType<PieceProps<K>>;
  // A roadmap's lab item (#461) is done once the learner has tried the lab: their first press or key in it.
  const tried = () => {
    if (isLabKind(kind)) noteAchieved(`lab:${kind}`);
  };
  return (
    <>
    {asks && <Predict kind={kind as keyof typeof PREDICTIONS} show={(s: LiveStates[K]) => (setState(s), setGuessed(true))} />}
    <div ref={outer} className="inline-piece" inert={!guessed} role="group" aria-label={label} style={{ height: H * s }} onPointerDownCapture={tried} onKeyDownCapture={tried}>
      <div ref={box} className={`live live-${kind}`} style={{ width: W, minHeight: H0, transform: `translate(${Math.max(0, (width - W * s) / 2)}px, 0) scale(${s})` }}>
        <Suspense fallback={null}>
          <Piece state={state} set={setState} w={t.live} svgRef={svgRef} />
        </Suspense>
        <button className="live-snap" title={t.live.reset} aria-label={t.live.reset} onClick={() => setState(initialLive(kind))}>↺</button>
      </div>
    </div>
    </>
  );
}
