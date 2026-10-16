// A number typed by tapping, for the games whose answer is a number too big for a row of buttons: the digits, a minus
// sign at the front, and a key to take the last back, with the number so far shown beside them.
export function Keypad({ value, onChange, disabled, erase, minus = false }: { value: string; onChange: (v: string) => void; disabled?: boolean; erase: string; minus?: boolean }) {
  const add = (k: string) => value.replace("−", "").length < 6 && onChange(value + k);
  return (
    <div className="live-bar keypad">
      <output className="keypad-shown" aria-live="polite">{value || "?"}</output>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((k) => (
        <button key={k} className="live-btn" disabled={disabled} onClick={() => add(String(k))}>{k}</button>
      ))}
      {minus && (
        <button className="live-btn" disabled={disabled || value !== ""} onClick={() => onChange("−")}>−</button>
      )}
      <button className="live-btn" disabled={disabled || !value} aria-label={erase} title={erase} onClick={() => onChange(value.slice(0, -1))}>⌫</button>
    </div>
  );
}
