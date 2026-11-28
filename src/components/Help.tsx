// First-time help (#872): a welcome card that explains a page in three numbered steps until "Got it", a ? that brings
// it back, and an (i) whose tip shows on hover, keyboard focus and a tap (a title= tooltip never shows on a tablet).
import { useLayoutEffect, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { useSeen } from "../seen";

export type WelcomeStep = { pic: ReactNode; text: ReactNode };

export function Welcome({ id, title, steps, children }: { id: string; title: string; steps: WelcomeStep[]; children?: ReactNode }) {
  const { t } = useI18n();
  const [seen, setSeenHere] = useSeen(id);
  if (seen) return null;
  return (
    <section className="welcome" aria-label={title}>
      <h2>{title}</h2>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            <span className="welcome-pic" aria-hidden="true">{s.pic}</span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
      {children}
      <button type="button" className="btn primary" onClick={() => setSeenHere(true)}>{t.help.gotIt}</button>
    </section>
  );
}

/** The ? beside a page's title: shows that page's welcome card again. */
export function HelpButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [seen, setSeenHere] = useSeen(id);
  return (
    <button type="button" className="help-button" aria-label={t.help.show} title={t.help.show} aria-pressed={!seen} onClick={() => setSeenHere(!seen)}>
      ?
    </button>
  );
}

/** An (i) with a short explanation beside a control a first-timer might not understand. */
export function Tip({ text }: { text: string }) {
  const { t } = useI18n();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const show = (el: Element) => {
    const r = el.getBoundingClientRect();
    setAt({ x: r.right, y: r.bottom });
  };
  return (
    <>
      <button
        type="button"
        className="tip-button"
        aria-label={`${t.help.what} ${text}`}
        aria-expanded={!!at}
        onPointerEnter={(e) => e.pointerType === "mouse" && show(e.currentTarget)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setAt(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setAt(null)}
        onClick={(e) => show(e.currentTarget)}
      >
        i
      </button>
      {at && (
        <span className="chart-tip" role="status" style={{ left: Math.min(at.x + 6, window.innerWidth - 260), top: at.y + 6 }}>
          {text}
        </span>
      )}
    </>
  );
}

export type TourStep = { sel: string; text: string };

/**
 * A first-visit tour: dims the page around one control at a time with a line on what it does; Next, Skip or Escape.
 * A step whose control isn't on the page is passed over. The dimming lets clicks through, so nothing is blocked.
 */
export function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (i >= steps.length) return onDone();
    const el = document.querySelector(steps[i].sel);
    if (!el?.getClientRects().length) return setI(i + 1);
    const place = () => setRect(el.getBoundingClientRect());
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (!rect || i >= steps.length) return null;
  const last = i === steps.length - 1;
  const below = rect.bottom + 170 < window.innerHeight;
  return (
    <div className="tour" role="dialog" aria-label={t.help.tour.title} onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <div className="tour-spot" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />
      <div className="tour-card" style={{ left: Math.max(8, Math.min(rect.left, window.innerWidth - 308)), top: below ? rect.bottom + 12 : Math.max(8, rect.top - 160) }}>
        <p aria-live="polite">{steps[i].text}</p>
        <div className="tour-go">
          <span className="muted small">{fill(t.help.tour.step, { i: i + 1, n: steps.length })}</span>
          <span className="spacer" />
          {!last && <button type="button" className="btn" onClick={onDone}>{t.help.tour.skip}</button>}
          <button type="button" className="btn primary" autoFocus onClick={() => (last ? onDone() : setI(i + 1))}>{last ? t.help.tour.done : t.help.tour.next}</button>
        </div>
      </div>
    </div>
  );
}
