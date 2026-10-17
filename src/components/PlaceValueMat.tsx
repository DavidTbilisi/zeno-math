// Interactive place-value mat: drag base-ten blocks from the tray into Thousands / Hundreds / Tens / Ones,
// drag between neighbouring columns to trade (10 ↔ 1), drag off the mat to remove.
// Add and subtract with blocks: a starts on the mat and a strip under each column holds b's blocks to put in, or the
// blocks taken away; the pupil trades until every column is under 10 and the mat reads the answer.
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
  columnHeight,
  expanded,
  matCounts,
  placeDigits,
  PV_CAP,
  PV_KINDS,
  PV_VALUE,
  pvTotal,
  randomSum,
  regroup,
  startSum,
  sumAnswer,
  sumMove,
  sumVerdict,
  tenDividers,
  validSum,
  type BlockSum,
  type DropResult,
  type MatCounts,
  type MatKind,
  type PlaceValueSpec,
  type PVOp,
  type SumMove,
  type SumVerdict,
} from "../math/placeValue";

type Drag = { kind: MatKind; from: "tray" | "mat" | "zone"; x: number; y: number; sx: number; sy: number; moved: boolean };
type Challenge = { target: number; verdict: null | "correct" | "tooMany" | "notEnough" };
type Sum = BlockSum & { verdict: SumVerdict | null };

const Block = ({ kind }: { kind: MatKind }) => <span className="pv-block" dangerouslySetInnerHTML={{ __html: blockSvg(kind) }} />;

const within = (el: HTMLElement | null, x: number, y: number) => {
  const r = el?.getBoundingClientRect();
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

/** Blocks laid out in a column's body or zone, with the dividers between fives of ten-rods. */
function Blocks({ kind, n, onPointerDown }: { kind: MatKind; n: number; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <>
      {kind === "t" &&
        tenDividers(n).map((d, i) => (
          <span key={`d${i}`} className="pv-divider" style={{ left: COL_PAD + d.x, top: COL_PAD + d.y, height: d.h }} />
        ))}
      {blockPositions(kind, n).map((p, i) => (
        <span
          key={i}
          className="pv-placed"
          style={{ left: COL_PAD + p.x, top: COL_PAD + p.y, width: BLOCK[kind].w, height: BLOCK[kind].h }}
          onPointerDown={onPointerDown}
        >
          <Block kind={kind} />
        </span>
      ))}
    </>
  );
}

export function PlaceValueMat({ spec, onChange }: { spec: PlaceValueSpec; onChange: (s: PlaceValueSpec) => void }) {
  const { t } = useI18n();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ kind: MatKind; zone: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [sum, setSum] = useState<Sum | null>(null);
  const [draft, setDraft] = useState({ a: "", b: "" });
  const cols = useRef<Record<MatKind, HTMLDivElement | null>>({ th: null, h: null, t: null, o: null });
  const zones = useRef<Record<MatKind, HTMLDivElement | null>>({ th: null, h: null, t: null, o: null });
  const latest = useRef({ spec, onChange, sum });
  latest.current = { spec, onChange, sum };

  const labels: Record<MatKind, string> = { th: t.thousands, h: t.hundreds, t: t.tens, o: t.ones };
  const counts = matCounts(spec);
  const messages = { wrong: t.pvWrong, need10: t.pvNeed10, full: t.pvFull, enough: t.pvEnough };

  const setCounts = (c: MatCounts) => {
    const { spec: s, onChange: set } = latest.current;
    const next: PlaceValueSpec = { ...s, ...c, labels: [t.thousands, t.hundreds, t.tens, t.ones] };
    latest.current.spec = next; // so a second tap before re-render builds on this one
    set(next);
  };

  const commit = (r: DropResult) => {
    setCounts(r.counts);
    setMessage(r.message ? messages[r.message] : null);
    setChallenge((c) => (c ? { ...c, verdict: null } : c));
    setSum((s) => (s ? { ...s, verdict: null } : s));
  };

  const commitSum = (r: SumMove) => {
    const s = latest.current.sum;
    if (!s) return;
    const next = { ...s, zone: r.zone, verdict: null };
    latest.current.sum = next;
    setSum(next);
    setCounts(r.counts);
    setMessage(r.message ? messages[r.message] : null);
  };

  const columnAt = (x: number, y: number): MatKind | null => PV_KINDS.find((k) => within(cols.current[k], x, y)) ?? null;
  const zoneAt = (x: number, y: number): MatKind | null => PV_KINDS.find((k) => within(zones.current[k], x, y)) ?? null;
  const hoverAt = (x: number, y: number) => {
    const z = latest.current.sum ? zoneAt(x, y) : null;
    if (z) return { kind: z, zone: true };
    const c = columnAt(x, y);
    return c ? { kind: c, zone: false } : null;
  };

  // Window listeners are attached synchronously on pointerdown (not in an effect), so even a very
  // fast tap can't release before the listener exists. The ghost follows the pointer anywhere.
  const start = (kind: MatKind, from: Drag["from"]) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const d: Drag = { kind, from, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    setDrag(d);
    const move = (ev: PointerEvent) => {
      d.moved ||= Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 4;
      setDrag({ ...d, x: ev.clientX, y: ev.clientY });
      setHover(hoverAt(ev.clientX, ev.clientY));
    };
    const finish = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setDrag(null);
      setHover(null);
      if (ev.type === "pointercancel") return;
      const counts = matCounts(latest.current.spec);
      const s = latest.current.sum;
      if (!(d.moved || Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 4)) {
        // A click on a tray block adds one to its column; during a sum, a click moves a block between mat and zone.
        if (d.from === "tray") commit(applyDrop(counts, d.kind, "tray", d.kind));
        else if (s && d.from === "zone") commitSum(sumMove(counts, s, d.kind, false));
        else if (s?.op === "sub") commitSum(sumMove(counts, s, d.kind, true));
        return;
      }
      if (!s) return commit(applyDrop(counts, d.kind, d.from === "zone" ? "mat" : d.from, columnAt(ev.clientX, ev.clientY)));
      const z = zoneAt(ev.clientX, ev.clientY);
      const c = z ? null : columnAt(ev.clientX, ev.clientY);
      if (d.from === "zone") {
        if (c === d.kind) commitSum(sumMove(counts, s, d.kind, false));
        else if (c || (z && z !== d.kind)) setMessage(t.pvWrong);
      } else if (z) {
        if (z === d.kind) commitSum(sumMove(counts, s, d.kind, true));
        else setMessage(t.pvWrong);
      } else if (c) commit(applyDrop(counts, d.kind, "mat", c)); // trades still work; nothing leaves the mat mid-sum
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  // While dragging a block out of a column or zone, it shows one fewer.
  const shown = (k: MatKind) => counts[k] - (drag?.moved && drag.from === "mat" && drag.kind === k ? 1 : 0);
  const zoneShown = (k: MatKind) => (sum ? sum.zone[k] - (drag?.moved && drag.from === "zone" && drag.kind === k ? 1 : 0) : 0);

  const newChallenge = () => {
    const target = 1 + Math.floor(Math.random() * 9999);
    setChallenge({ target, verdict: null });
    setSum(null);
    onChange({ ...spec, th: 0, h: 0, t: 0, o: 0 });
    setMessage(null);
  };
  const check = () => {
    if (!challenge) return;
    const total = pvTotal(spec);
    setChallenge({ ...challenge, verdict: total === challenge.target ? "correct" : total > challenge.target ? "tooMany" : "notEnough" });
  };

  const beginSum = (op: PVOp, a: number, b: number) => {
    const r = startSum(op, a, b);
    latest.current.sum = { ...r.sum, verdict: null };
    setSum(latest.current.sum);
    setDraft({ a: String(a), b: String(b) });
    setChallenge(null);
    setCounts(r.counts);
    setMessage(null);
  };
  const newSum = (op: PVOp) => {
    const { a, b } = randomSum(op);
    beginSum(op, a, b);
  };
  const editSum = (part: "a" | "b", value: string) => {
    const next = { ...draft, [part]: value };
    setDraft(next);
    const a = Number(next.a);
    const b = Number(next.b);
    if (sum && next.a !== "" && next.b !== "" && validSum(sum.op, a, b)) beginSum(sum.op, a, b);
  };
  const draftValid = !!sum && draft.a !== "" && draft.b !== "" && validSum(sum.op, Number(draft.a), Number(draft.b));

  const hideDigits = challenge && challenge.verdict !== "correct";
  const hideTotal = hideDigits || (sum && sum.verdict !== "correct");
  const target = sum ? placeDigits(sum.b) : null;
  // The zone is as tall as b's blocks, so it doesn't jump as blocks move.
  const zoneH = target ? Math.max(40, ...PV_KINDS.map((k) => columnHeight(k, target[k]))) + 2 * COL_PAD : 0;

  return (
    <div className="pv">
      <div className="pv-toolbar">
        <button className="btn small" onClick={newChallenge}>🎲 {t.challenge}</button>
        <button className={`btn small${sum?.op === "add" ? " primary" : ""}`} onClick={() => newSum("add")}>＋ {t.pvAdd}</button>
        <button className={`btn small${sum?.op === "sub" ? " primary" : ""}`} onClick={() => newSum("sub")}>− {t.pvSub}</button>
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
        <button className="btn small ghost" onClick={() => { onChange({ ...spec, th: 0, h: 0, t: 0, o: 0 }); setSum(null); setMessage(null); }}>
          ✕ {t.clear}
        </button>
      </div>

      {sum && (
        <div className="pv-toolbar pv-sum">
          <input className="pv-num" type="number" min={0} max={999} value={draft.a} aria-label={t.pvNumbers[0]} onChange={(e) => editSum("a", e.target.value)} />
          <b>{sum.op === "add" ? "+" : "−"}</b>
          <input className="pv-num" type="number" min={0} max={999} value={draft.b} aria-label={t.pvNumbers[1]} onChange={(e) => editSum("b", e.target.value)} />
          <b>= {sum.verdict === "correct" ? sumAnswer(sum) : "?"}</b>
          <button className="btn small ghost" title={t.pvNewNumbers} onClick={() => newSum(sum.op)}>🎲</button>
          <button className="btn small primary" onClick={() => setSum({ ...sum, verdict: sumVerdict(counts, sum) })}>{t.check}</button>
          {!draftValid && <span className="pv-message">{t.pvBadSum}</span>}
          {sum.verdict && <span className={`pv-verdict ${sum.verdict === "correct" ? "correct" : "notEnough"}`}>{t.pvSumVerdict[sum.verdict]}</span>}
        </div>
      )}

      <div className="pv-mat">
        {PV_KINDS.map((k) => {
          const lower = PV_KINDS[PV_KINDS.indexOf(k) + 1];
          const higher = PV_KINDS[PV_KINDS.indexOf(k) - 1];
          const over = (zone: boolean) => drag?.moved && hover?.kind === k && hover.zone === zone;
          const short = sum?.op === "sub" && target && target[k] - sum.zone[k] > counts[k];
          return (
            <div
              key={k}
              ref={(el) => { cols.current[k] = el; }}
              className={`pv-col pv-${k}${over(false) ? " over" : ""}`}
              style={{ width: COL_W }}
            >
              <div className="pv-head">{labels[k]}</div>
              <div className="pv-body" style={{ padding: COL_PAD }}>
                <Blocks kind={k} n={shown(k)} onPointerDown={start(k, "mat")} />
              </div>
              <div className="pv-foot">
                <span className={`pv-digit${!hideDigits && counts[k] >= 10 ? " over10" : ""}`}>{hideDigits ? "?" : counts[k]}</span>
                <span className="pv-trades">
                  {higher && (
                    <button className="btn small ghost" title={t.pvRegroupTitle} disabled={counts[k] < 10} onClick={() => commit(regroup(counts, k))}>
                      10→1
                    </button>
                  )}
                  {lower && (
                    <button className="btn small ghost" title={t.pvBreakTitle} disabled={counts[k] < 1} onClick={() => commit(breakDown(counts, k))}>
                      1→10
                    </button>
                  )}
                </span>
              </div>
              {sum && target && (
                <div
                  ref={(el) => { zones.current[k] = el; }}
                  className={`pv-zone ${sum.op}${over(true) ? " over" : ""}`}
                >
                  <div className="pv-zone-head">
                    {short && <span className="pv-zone-short">{t.pvShort}</span>}
                    {sum.op === "add" && sum.zone[k] > 0 && <span className="pv-zone-tag">+{sum.zone[k]}</span>}
                    {sum.op === "sub" && target[k] > 0 && (
                      <span className={`pv-zone-tag${sum.zone[k] === target[k] ? " done" : ""}`}>−{sum.zone[k]}/{target[k]}</span>
                    )}
                  </div>
                  <div className="pv-zone-body" style={{ height: zoneH }}>
                    <Blocks kind={k} n={zoneShown(k)} onPointerDown={start(k, "zone")} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!sum && (
        <div className="pv-tray">
          <span className="hint">{t.pvTray}</span>
          <div className="pv-sources">
            {PV_KINDS.map((k) => (
              <button
                key={k}
                className="pv-source"
                title={`${labels[k]} (${counts[k]}/${PV_CAP[k]})`}
                onPointerDown={start(k, "tray")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && commit(applyDrop(counts, k, "tray", k))}
              >
                <Block kind={k} />
                <span>{PV_VALUE[k]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pv-status">
        {!hideTotal && <span className="pv-total">{expanded(spec)}</span>}
        {message && <span className="pv-message">{message}</span>}
      </div>
      <small className="hint">{sum ? t.pvSumHint[sum.op] : t.pvHint}</small>
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
