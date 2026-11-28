// First-time help (#872): a welcome card that explains a page in three numbered steps until "Got it", a ? that brings
// it back, and an (i) whose tip shows on hover, keyboard focus and a tap (a title= tooltip never shows on a tablet).
import { useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
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
