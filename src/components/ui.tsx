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
