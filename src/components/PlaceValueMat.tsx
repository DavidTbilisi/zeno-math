// Interactive place-value mat: drag base-ten blocks from the tray into Hundreds / Tens / Ones,
// drag between neighbouring columns to trade (10 ↔ 1), drag off the mat to remove.
// Pointer events (not HTML5 drag & drop) so it also works with touch.
import { useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  applyDrop,
  BLOCK,
  blockPositions,
  blockSvg,
  breakDown,
  COL_PAD,
  COL_W,
  expanded,
  PV_CAP,
  PV_KINDS,
  pvTotal,
  regroup,
  type Counts,
  type DropResult,
  type PlaceValueSpec,
  type PVKind,
} from "../math/placeValue";

type Drag = { kind: PVKind; from: "tray" | "mat"; x: number; y: number; sx: number; sy: number; moved: boolean };
type Challenge = { target: number; verdict: null | "correct" | "tooMany" | "notEnough" };

const Block = ({ kind }: { kind: PVKind }) => <span className="pv-block" dangerouslySetInnerHTML={{ __html: blockSvg(kind) }} />;

export function PlaceValueMat({ spec, onChange }: { spec: PlaceValueSpec; onChange: (s: PlaceValueSpec) => void }) {
  const { t } = useI18n();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<PVKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const cols = useRef<Record<PVKind, HTMLDivElement | null>>({ h: null, t: null, o: null });
  const latest = useRef({ spec, onChange });
  latest.current = { spec, onChange };

  const labels: Record<PVKind, string> = { h: t.hundreds, t: t.tens, o: t.ones };
  const messages = { wrong: t.pvWrong, need10: t.pvNeed10, full: t.pvFull };

  const commit = (r: DropResult) => {
    const { spec: s, onChange: set } = latest.current;
    const next: PlaceValueSpec = { ...s, ...r.counts, labels: [t.hundreds, t.tens, t.ones] };
    latest.current.spec = next; // so a second tap before re-render builds on this one
    set(next);
    setMessage(r.message ? messages[r.message] : null);
    setChallenge((c) => (c ? { ...c, verdict: null } : c));
  };

  const columnAt = (x: number, y: number): PVKind | null =>
    PV_KINDS.find((k) => {
      const r = cols.current[k]?.getBoundingClientRect();
      return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) ?? null;

  // Window listeners are attached synchronously on pointerdown (not in an effect), so even a very
  // fast tap can't release before the listener exists. The ghost follows the pointer anywhere.
  const start = (kind: PVKind, from: "tray" | "mat") => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const d: Drag = { kind, from, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    setDrag(d);
    const move = (ev: PointerEvent) => {
      d.moved ||= Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 4;
      setDrag({ ...d, x: ev.clientX, y: ev.clientY });
      setHover(columnAt(ev.clientX, ev.clientY));
    };
    const finish = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setDrag(null);
      setHover(null);
      if (ev.type === "pointercancel") return;
      const { h, t: tens, o } = latest.current.spec;
      const counts: Counts = { h, t: tens, o };
      if (!(d.moved || Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 4)) {
        // A click on a tray block adds one to its column.
        if (d.from === "tray") commit(applyDrop(counts, d.kind, "tray", d.kind));
        return;
      }
      commit(applyDrop(counts, d.kind, d.from, columnAt(ev.clientX, ev.clientY)));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  // While dragging a block out of a column, that column shows one fewer.
  const shown = (k: PVKind) => spec[k] - (drag?.moved && drag.from === "mat" && drag.kind === k ? 1 : 0);

  const newChallenge = () => {
    const target = 1 + Math.floor(Math.random() * 999);
    setChallenge({ target, verdict: null });
    onChange({ ...spec, h: 0, t: 0, o: 0 });
    setMessage(null);
  };
  const check = () => {
    if (!challenge) return;
    const total = pvTotal(spec);
    setChallenge({ ...challenge, verdict: total === challenge.target ? "correct" : total > challenge.target ? "tooMany" : "notEnough" });
  };
  const hideTotal = challenge && challenge.verdict !== "correct";

  return (
    <div className="pv">
      <div className="pv-toolbar">
        <button className="btn small" onClick={newChallenge}>🎲 {t.challenge}</button>
        {challenge && (
          <>
            <span className="pv-target">
              {t.pvMake} <b>{challenge.target}</b>
            </span>
            <button className="btn small primary" onClick={check}>{t.check}</button>
            {challenge.verdict && <span className={`pv-verdict ${challenge.verdict}`}>{t.pvVerdict[challenge.verdict]}</span>}
          </>
        )}
        <div className="spacer" />
        <button className="btn small ghost" onClick={() => { onChange({ ...spec, h: 0, t: 0, o: 0 }); setMessage(null); }}>
          ✕ {t.clear}
        </button>
      </div>

      <div className="pv-mat">
        {PV_KINDS.map((k) => {
          const n = shown(k);
          const lower = PV_KINDS[PV_KINDS.indexOf(k) + 1];
          const higher = PV_KINDS[PV_KINDS.indexOf(k) - 1];
          return (
            <div
              key={k}
              ref={(el) => { cols.current[k] = el; }}
              className={`pv-col pv-${k}${hover === k && drag?.moved ? " over" : ""}`}
              style={{ width: COL_W }}
            >
              <div className="pv-head">{labels[k]}</div>
              <div className="pv-body" style={{ padding: COL_PAD }}>
                {blockPositions(k, n).map((p, i) => (
                  <span
                    key={i}
                    className="pv-placed"
                    style={{ left: COL_PAD + p.x, top: COL_PAD + p.y, width: BLOCK[k].w, height: BLOCK[k].h }}
                    onPointerDown={start(k, "mat")}
                  >
                    <Block kind={k} />
                  </span>
                ))}
              </div>
              <div className="pv-foot">
                <span className={`pv-digit${!hideTotal && spec[k] >= 10 ? " over10" : ""}`}>{hideTotal ? "?" : spec[k]}</span>
                <span className="pv-trades">
                  {higher && (
                    <button className="btn small ghost" title={t.pvRegroupTitle} disabled={spec[k] < 10} onClick={() => commit(regroup(spec, k))}>
                      10→1
                    </button>
                  )}
                  {lower && (
                    <button className="btn small ghost" title={t.pvBreakTitle} disabled={spec[k] < 1} onClick={() => commit(breakDown(spec, k))}>
                      1→10
                    </button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pv-tray">
        <span className="hint">{t.pvTray}</span>
        <div className="pv-sources">
          {PV_KINDS.map((k) => (
            <button
              key={k}
              className="pv-source"
              title={`${labels[k]} (${spec[k]}/${PV_CAP[k]})`}
              onPointerDown={start(k, "tray")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && commit(applyDrop(spec, k, "tray", k))}
            >
              <Block kind={k} />
              <span>{k === "h" ? "100" : k === "t" ? "10" : "1"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pv-status">
        {!hideTotal && <span className="pv-total">{expanded(spec)}</span>}
        {message && <span className="pv-message">{message}</span>}
      </div>
      <small className="hint">{t.pvHint}</small>
      <label className="check inline">
        <input type="checkbox" checked={spec.showTotal} onChange={(e) => onChange({ ...spec, showTotal: e.target.checked })} />
        <span>{t.pvShowTotal}</span>
      </label>

      {drag?.moved && (
        <span className="pv-ghost" style={{ left: drag.x - BLOCK[drag.kind].w / 2, top: drag.y - BLOCK[drag.kind].h / 2 }}>
          <Block kind={drag.kind} />
        </span>
      )}
    </div>
  );
}
