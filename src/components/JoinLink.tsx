// A class's join link (#/join/<code>) on the teacher page: the address to copy, and a QR code to put up on the board, so
// students open Practice with the class code already in its box instead of typing it.
import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import type { Dict } from "../locales/en";
import { Modal } from "./Modal";

export const joinLink = (classCode: string) => `${location.origin}${location.pathname}#/join/${classCode}`;

/** The QR code of `text`, black on white whatever the theme (phone cameras read dark squares on a light ground). */
export function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  const { size, d } = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { size: n + 8, d }; // a quiet zone of four squares all round, as scanners expect
  }, [text]);
  return (
    <svg className={`qr${className ? ` ${className}` : ""}`} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

export function JoinLink({ code, name, w }: { code: string; name: string; w: Dict["teacher"] }) {
  const [copied, setCopied] = useState(false);
  const [showing, setShowing] = useState(false);
  const link = joinLink(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no clipboard (an insecure page): the link is selected in its box for copying by hand
    }
  };
  return (
    <div className="join-link">
      <QrCode text={link} label={w.joinQr} className="small" />
      <div>
        <span className="muted">{w.joinLink}</span>
        <input className="mono" readOnly value={link} aria-label={w.joinLink} onFocus={(e) => e.target.select()} />
        <div className="field-row wrap">
          <button className="btn small" onClick={() => void copy()}>{copied ? `✓ ${w.joinCopied}` : w.joinCopy}</button>
          <button className="btn small primary" onClick={() => setShowing(true)}>{w.joinShow}</button>
        </div>
      </div>
      {showing && (
        <Modal title={name} onClose={() => setShowing(false)} wide footer={<button className="btn" onClick={() => setShowing(false)}>{w.joinDone}</button>}>
          <div className="join-show">
            <QrCode text={link} label={w.joinQr} />
            <p className="hint">{w.joinShowHint}</p>
            <p className="class-code"><span className="muted">{w.code}</span> <strong className="mono">{code}</strong></p>
            <p className="mono join-show-link">{link}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
