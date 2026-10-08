// The board's read-only link: make it, copy it, or take it away. The link shows the board in view mode and follows
// it as it is saved (src/pages/SharedBoardPage.tsx).
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";

export const shareLink = (token: string) => `${location.origin}${location.pathname}#/s/${token}`;

export function ShareBox({ id, token, onChange }: { id: string; token: string | null; onChange: (token: string | null) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const toggle = () => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const run = async (work: () => Promise<string | null>) => {
    setBusy(true);
    try {
      onChange(await work());
    } catch {
      // offline: the button can be pressed again
    } finally {
      setBusy(false);
    }
  };
  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no clipboard (an insecure page): the link is selected in its box for copying by hand
    }
  };
  return (
    <div className="share" ref={box}>
      <button className={`btn${token ? " shared" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={toggle} title={t.shareTitle}>
        🔗 <span className="btn-label">{t.share}</span>
      </button>
      {open && (
        <div className="share-box" role="dialog" aria-label={t.shareTitle} style={pos}>
          <strong>{t.shareTitle}</strong>
          <p className="hint">{t.shareHint}</p>
          {token ? (
            <>
              <input className="mono" readOnly value={shareLink(token)} aria-label={t.shareTitle} onFocus={(e) => e.target.select()} />
              <div className="field-row">
                <button className="btn primary small" onClick={() => void copy(shareLink(token))}>{copied ? `✓ ${t.shareCopied}` : t.shareCopy}</button>
                <button className="btn small danger" disabled={busy} onClick={() => void run(async () => (await api.unshare(id), null))}>{t.shareStop}</button>
              </div>
            </>
          ) : (
            <button className="btn primary small" disabled={busy} onClick={() => void run(async () => (await api.share(id)).token)}>{t.shareMake}</button>
          )}
        </div>
      )}
    </div>
  );
}
