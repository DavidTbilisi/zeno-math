// The board's ? (#875): what the keys do, and the tour again.
import { useState } from "react";
import { useI18n } from "../i18n";

export function BoardHelp({ onTour }: { onTour: () => void }) {
  const { t } = useI18n();
  const w = t.help.board;
  const [open, setOpen] = useState(false);
  return (
    <div className="board-help-wrap">
      <button type="button" className="help-button" aria-label={w.title} title={w.title} aria-expanded={open} onClick={() => setOpen(!open)}>?</button>
      {open && (
        <div className="board-help" role="dialog" aria-label={w.title} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <strong>{w.title}</strong>
          <dl>
            {w.keys.map(([key, what]) => (
              <div key={key}><dt><kbd>{key}</kbd></dt><dd>{what}</dd></div>
            ))}
          </dl>
          <button type="button" className="btn primary" onClick={() => (setOpen(false), onTour())}>{w.tour}</button>
        </div>
      )}
    </div>
  );
}
