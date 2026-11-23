// Delete at once, with a few seconds to take it back (#562), instead of asking first. The row goes from the page
// straight away, but the server is only told when the time is up (or the page is left, or another delete starts):
// until then Undo just puts it back. A tab closed in those seconds can leave the row undeleted, never deleted twice
// or wrongly, so nothing is lost by it.
import { useEffect, useRef, useState } from "react";

/** How long "Deleted — Undo" stays. */
export const UNDO_MS = 6000;

export function useUndoDelete<T>(remove: (item: T) => Promise<unknown>, ms = UNDO_MS) {
  const [pending, setPending] = useState<T | null>(null);
  const job = useRef<{ item: T; timer: number } | null>(null);
  const removeRef = useRef(remove);
  removeRef.current = remove;

  /** Tells the server now about the delete waiting, if any. */
  const flush = () => {
    const j = job.current;
    if (!j) return;
    job.current = null;
    clearTimeout(j.timer);
    setPending(null);
    void removeRef.current(j.item);
  };
  const start = (item: T) => {
    flush();
    job.current = { item, timer: window.setTimeout(flush, ms) };
    setPending(item);
  };
  const undo = () => {
    if (job.current) clearTimeout(job.current.timer);
    job.current = null;
    setPending(null);
  };
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  return { pending, start, undo };
}

/** "Deleted …" with its Undo, at the bottom of the page while the delete waits. */
export function UndoToast({ text, undo, onUndo }: { text: string; undo: string; onUndo: () => void }) {
  return (
    <div className="undo-toast" role="status">
      <span>{text}</span>
      <button className="btn small" onClick={onUndo}>{undo}</button>
    </div>
  );
}
