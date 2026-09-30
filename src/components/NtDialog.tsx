import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  CRT_MODES,
  GCD_MODES,
  MOD_OPS,
  NT_PRESETS,
  NT_TOPICS,
  renderNt,
  sievingPrimes,
  type NtSpec,
  type NtSpecOf,
  type NtTopic,
} from "../math/numtheory";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Slider } from "./AnalysisDialog";
import { Modal } from "./Modal";

type Specs = { [K in NtTopic]: NtSpecOf<K> };

export function NtDialog({ initial, onSubmit, onClose }: {
  initial?: NtSpec;
  onSubmit: (spec: NtSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.ntWords;
  const [topic, setTopic] = useState<NtTopic>(initial?.topic ?? "sieve");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(NT_TOPICS.map((k) => [k, NT_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<NtSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderNt(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const value = (key: string) => (spec as Record<string, unknown>)[key] as string;
  const text = (label: string, key: string, width = 90) => (
    <label key={key}>
      <span>{label}</span>
      <input type="text" className="mono" style={{ width }} spellCheck={false} value={value(key)} onChange={(e) => set({ [key]: e.target.value } as Partial<NtSpec>)} />
    </label>
  );
  const segmented = <K extends string>(keys: readonly K[], label: (k: K) => string, current: K, onPick: (k: K) => void) => (
    <div className="segmented wrap" role="radiogroup">
      {keys.map((k) => (
        <button key={k} role="radio" aria-checked={current === k} className={`math-label${current === k ? " active" : ""}`} onClick={() => onPick(k)}>
          {label(k)}
        </button>
      ))}
    </div>
  );

  // The sieve slider runs over the primes up to √n.
  const sievers = spec.topic === "sieve" ? sievingPrimes(Math.min(400, Math.max(2, Math.floor(Number(spec.n)) || 2))) : [];

  return (
    <Modal
      title={initial ? t.editNt : t.nt}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" disabled={!result.rendered} onClick={() => result.rendered && onSubmit(spec, result.rendered)}>
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      {!initial && (
        <div className="tabs" role="tablist">
          {NT_TOPICS.map((k) => (
            <button key={k} role="tab" aria-selected={k === topic} className={`tab${k === topic ? " active" : ""}`} onClick={() => setTopic(k)}>
              {t.ntTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.ntHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {NT_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "sieve" && (
        <>
          <div className="range-grid">{text(t.ntN, "n")}</div>
          <Slider
            label={t.ntStep}
            min={0}
            max={sievers.length}
            step={1}
            value={Math.min(spec.step, sievers.length)}
            shown={sievers.slice(0, Math.min(spec.step, sievers.length)).join(", ") || "—"}
            onChange={(step) => set({ step: step >= sievers.length ? 99 : step })}
          />
        </>
      )}

      {spec.topic === "factor" && <div className="range-grid">{text(t.ntN, "n", 160)}</div>}

      {spec.topic === "gcd" && (
        <>
          {segmented(GCD_MODES, (m) => t.gcdModes[m], spec.mode, (mode) => set({ mode }))}
          <div className="range-grid">
            {text(t.ntA, "a")}
            {text(t.ntB, "b")}
            {spec.mode === "diophantine" && text(t.ntC, "c")}
          </div>
        </>
      )}

      {spec.topic === "mod" && (
        <>
          {segmented(MOD_OPS, (o) => t.modOps[o], spec.op, (op) => set({ op }))}
          <div className="range-grid">
            {spec.op !== "add" && spec.op !== "mul" && text(t.ntA, "a")}
            {spec.op === "power" && text(t.ntK, "k")}
            {text(t.ntM, "m")}
          </div>
        </>
      )}

      {spec.topic === "crt" && (
        <>
          {segmented(CRT_MODES, (m) => t.crtModes[m], spec.mode, (mode) => set({ mode }))}
          {spec.mode === "linear" ? (
            <div className="range-grid">
              {text(t.ntA, "a")}
              {text(t.ntB, "b")}
              {text(t.ntM, "m")}
            </div>
          ) : (
            <div className="fn-row">
              <span className="fn-prefix" style={{ fontStyle: "normal" }}>{t.ntSystem}</span>
              <input className="mono" spellCheck={false} value={spec.system} onChange={(e) => set({ system: e.target.value })} />
            </div>
          )}
        </>
      )}

      {spec.topic === "bases" && (
        <div className="range-grid">
          {text(t.ntN, "n", 160)}
          {text(t.ntFrom, "from", 70)}
          {text(t.ntTo, "to", 70)}
        </div>
      )}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? (
            <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} />
          ) : (
            <span className="error">{result.error}</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
