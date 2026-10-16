// Small controls shared by the tool dialogs.
import type { KeyboardEvent, ReactNode } from "react";

/** Arrow keys (and Home / End) move between the buttons of a group and pick the one they land on. */
function arrowKeys<K>(items: readonly K[], value: K, onChange: (k: K) => void) {
  return (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.indexOf(value);
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % items.length
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + items.length) % items.length
      : e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next]);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    buttons[next]?.focus();
  };
}

/** The topic tabs at the top of a dialog. Only the active tab is in the Tab order; arrows move between tabs. */
export function Tabs<K extends string>({ items, value, onChange, label }: {
  items: readonly K[];
  value: K;
  onChange: (k: K) => void;
  label: (k: K) => ReactNode;
}) {
  return (
    <div className="tabs" role="tablist" onKeyDown={arrowKeys(items, value, onChange)}>
      {items.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={k === value}
          tabIndex={k === (items.includes(value) ? value : items[0]) ? 0 : -1}
          className={`tab${k === value ? " active" : ""}`}
          onClick={() => onChange(k)}
        >
          {label(k)}
        </button>
      ))}
    </div>
  );
}

/** A row of buttons where exactly one is chosen (a radio group). */
export function Segmented<K extends string | number | boolean>({ items, value, onChange, label, className = "", itemClassName = "", ariaLabel }: {
  items: readonly K[];
  value: K;
  onChange: (k: K) => void;
  label: (k: K) => ReactNode;
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={`segmented${className ? ` ${className}` : ""}`} role="radiogroup" aria-label={ariaLabel} onKeyDown={arrowKeys(items, value, onChange)}>
      {items.map((k) => (
        <button
          key={String(k)}
          type="button"
          role="radio"
          aria-checked={k === value}
          tabIndex={k === (items.includes(value) ? value : items[0]) ? 0 : -1}
          className={[itemClassName, k === value ? "active" : ""].filter(Boolean).join(" ")}
          onClick={() => onChange(k)}
        >
          {label(k)}
        </button>
      ))}
    </div>
  );
}

/** The topic a dialog opens on: `start` when it names one of the topics, otherwise the default. */
export const startOr = <K extends string>(start: string | undefined, items: readonly K[], fallback: K): K =>
  (items as readonly string[]).includes(start ?? "") ? (start as K) : fallback;

/** The three signs as buttons, for an answer that is a sign between two numbers (no hunting for < on a keyboard). */
/** Buttons that each type one of a few answers (the benchmarks a number could be nearest). */
export function ChoicePicks({ choices, onPick, disabled }: { choices: { label: string; value: string }[]; onPick: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="field-row sign-picks">
      {choices.map((c) => (
        <button key={c.value} className="btn" disabled={disabled} onClick={() => onPick(c.value)}>{c.label}</button>
      ))}
    </div>
  );
}

/** Buttons that list items in the order they are tapped, each once, with one to take the last back. */
export function ListPicks({ items, typed, onChange, disabled }: { items: string[]; typed: string; onChange: (typed: string) => void; disabled?: boolean }) {
  const listed = typed.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="field-row sign-picks">
      {items.map((it) => (
        <button key={it} className="btn" disabled={disabled || listed.includes(it)} onClick={() => onChange([...listed, it].join(", "))}>{it}</button>
      ))}
      <button className="btn" disabled={disabled || !listed.length} aria-label="⌫" onClick={() => onChange(listed.slice(0, -1).join(", "))}>⌫</button>
    </div>
  );
}

/** Buttons that type a sum: the cards, the signs that may be used, brackets, and one to take the last piece back. */
export function TargetPicks({ cards, ops, onPick, onBack, disabled }: { cards: number[]; ops: string[]; onPick: (s: string) => void; onBack: () => void; disabled?: boolean }) {
  const sign: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  return (
    <div className="field-row sign-picks target-picks">
      {cards.map((c, i) => (
        <button key={`c${i}`} className="btn target-card" disabled={disabled} onClick={() => onPick(`${c}`)}>{c}</button>
      ))}
      {[...ops, "(", ")"].map((o) => (
        <button key={o} className="btn" disabled={disabled} onClick={() => onPick(sign[o] ?? o)}>{sign[o] ?? o}</button>
      ))}
      <button className="btn" disabled={disabled} aria-label="⌫" onClick={onBack}>⌫</button>
    </div>
  );
}

export function SignPicks({ onPick, disabled }: { onPick: (sign: string) => void; disabled?: boolean }) {
  return (
    <div className="field-row sign-picks">
      {["<", "=", ">"].map((s) => (
        <button key={s} className="btn" disabled={disabled} onClick={() => onPick(s)}>{s}</button>
      ))}
    </div>
  );
}
