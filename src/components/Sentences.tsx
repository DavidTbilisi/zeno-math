// A word problem shown as its sentences (or phrases), each one a button to tap, with a tag before it: what marking a
// problem (MarkProblem.tsx, issue #582) and finding its crux (#583) are done on. The arrows move between the
// sentences (one is in the tab order at a time), and any other key goes to the caller with the sentence it was
// pressed on, so each use gives keys its own meaning.
import { useEffect, useRef } from "react";

export type SentenceTag = { tone?: string; label?: string };

type Props = {
  sentences: readonly string[];
  /** The sentence the student is on. */
  active: number;
  onActive: (i: number) => void;
  /** A key other than the arrows, Home and End, pressed on sentence i: true when it was used. */
  onKey?: (i: number, key: string) => boolean;
  /** Each sentence's tone (a class: its colour) and the tag shown before it, or nothing yet. */
  tag?: (i: number) => SentenceTag | null;
  /** A sentence pointed out, after checking. */
  pointed?: number;
  /** Once over, the sentences are read, not tapped. */
  disabled?: boolean;
  label: string;
};

export function Sentences({ sentences, active, onActive, onKey, tag, pointed, disabled, label }: Props) {
  const group = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // The focus follows the sentence the student is on while it is among the sentences (moved by a key, or on by the
  // caller after a mark), not when they are tapping buttons elsewhere.
  useEffect(() => {
    if (group.current?.contains(document.activeElement)) refs.current[active]?.focus();
  }, [active]);
  const move = (i: number) => onActive(Math.max(0, Math.min(sentences.length - 1, i)));
  return (
    <div className="sentences" ref={group} role="group" aria-label={label}>
      {sentences.map((text, i) => {
        const t = tag?.(i);
        return (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            className={`sentence${t?.tone ? ` ${t.tone}` : ""}${i === active && !disabled ? " active" : ""}${i === pointed ? " pointed" : ""}`}
            tabIndex={i === active ? 0 : -1}
            aria-current={i === active && !disabled ? "true" : undefined}
            aria-disabled={disabled || undefined}
            onClick={() => !disabled && onActive(i)}
            onKeyDown={(e) => {
              if (disabled) return;
              const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: sentences.length - 1 }[e.key];
              if (to !== undefined) {
                e.preventDefault();
                move(to);
              } else if (onKey?.(i, e.key)) e.preventDefault();
            }}
          >
            {t?.label && <span className="sentence-tag">{t.label}</span>}
            <span className="sentence-text">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
