import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  COMPASS_QUADS,
  renderTrig,
  RIGHT_GIVENS,
  TRI_CASES,
  TRIG_FNS,
  TRIG_PRESETS,
  TRIG_TOPICS,
  type AngleUnit,
  type TrigSpec,
  type TrigSpecOf,
  type TrigTopic,
} from "../math/trig";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Slider } from "./AnalysisDialog";
import { Modal } from "./Modal";

type Specs = { [K in TrigTopic]: TrigSpecOf<K> };

const GIVEN_LABELS = { oppAdj: "a, b", oppHyp: "a, c", adjHyp: "b, c", angOpp: "θ, a", angAdj: "θ, b", angHyp: "θ, c" };
const GIVEN_KEYS = { oppAdj: ["opp", "adj"], oppHyp: ["opp", "hyp"], adjHyp: ["adj", "hyp"], angOpp: ["ang", "opp"], angAdj: ["ang", "adj"], angHyp: ["ang", "hyp"] };
const CASE_KEYS = { SSS: ["a", "b", "c"], SAS: ["b", "c", "A"], ASA: ["A", "B", "c"], AAS: ["A", "B", "a"], SSA: ["a", "b", "A"] };

export function TrigDialog({ initial, onSubmit, onClose }: {
  initial?: TrigSpec;
  onSubmit: (spec: TrigSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<TrigTopic>(initial?.topic ?? "circle");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(TRIG_TOPICS.map((k) => [k, TRIG_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<TrigSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderTrig(spec, t.trigWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const text = (label: string, key: string, width = 70) => (
    <label key={key}>
      <span>{label}</span>
      <input
        type="text"
        className="mono"
        style={{ width }}
        spellCheck={false}
        value={(spec as Record<string, unknown>)[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<TrigSpec>)}
      />
    </label>
  );
  const segmented = <K extends string>(keys: readonly K[], label: (k: K) => string, value: K, onPick: (k: K) => void) => (
    <div className="segmented wrap" role="radiogroup">
      {keys.map((k) => (
        <button key={k} role="radio" aria-checked={value === k} className={`math-label${value === k ? " active" : ""}`} onClick={() => onPick(k)}>
          {label(k)}
        </button>
      ))}
    </div>
  );
  const unitToggle = (unit: AngleUnit) => segmented(["deg", "rad"] as const, (u) => (u === "deg" ? t.degrees : t.radians), unit, (u) => set({ unit: u } as Partial<TrigSpec>));
  const sideLabel: Record<string, string> = { opp: `a (${t.trigWords.opp})`, adj: `b (${t.trigWords.adj})`, hyp: `c (${t.trigWords.hyp})`, ang: "θ (°)" };

  return (
    <Modal
      title={initial ? t.editTrig : t.trig}
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
          {TRIG_TOPICS.map((k) => (
            <button key={k} role="tab" aria-selected={k === topic} className={`tab${k === topic ? " active" : ""}`} onClick={() => setTopic(k)}>
              {t.trigTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.trigHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {TRIG_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "circle" && (
        <>
          {unitToggle(spec.unit)}
          <Slider label={t.trigAngle} min={-360} max={720} step={1} value={spec.angle} shown={`${spec.angle}°`} onChange={(angle) => set({ angle })} />
        </>
      )}

      {spec.topic === "compass" && (
        <>
          {unitToggle(spec.unit)}
          <Slider label={t.trigAngle} min={-360} max={720} step={1} value={spec.angle} shown={`${spec.angle}°`} onChange={(angle) => set({ angle })} />
          <div className="field">
            <span>{t.trigCues}</span>
            <div className="range-grid">
              {(["n", "e", "s", "w"] as const).map((d) => (
                <label key={d}>
                  <span>{t.trigWords.compass.dirs[d]}</span>
                  <input
                    type="text"
                    style={{ width: 130 }}
                    placeholder={t.trigWords.compass.cues[d]}
                    value={spec[d]}
                    onChange={(e) => set({ [d]: e.target.value } as Partial<TrigSpec>)}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t.trigQuads}</span>
            {segmented(COMPASS_QUADS, (q) => t.trigWords.compass.quads[q], spec.quads ?? "neighbours", (quads) => set({ quads } as Partial<TrigSpec>))}
          </div>
          {spec.quads === "images" && (
            <div className="range-grid">
              {(["nw", "ne", "sw", "se"] as const).map((d) => (
                <label key={d}>
                  <span>{t.trigWords.compass.dirs[d]}</span>
                  <input
                    type="text"
                    style={{ width: 130 }}
                    placeholder={t.trigWords.compass.images[d]}
                    value={spec[d] ?? ""}
                    onChange={(e) => set({ [d]: e.target.value } as Partial<TrigSpec>)}
                  />
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {spec.topic === "right" && (
        <>
          {segmented(RIGHT_GIVENS, (g) => GIVEN_LABELS[g], spec.given, (given) => set({ given }))}
          <div className="range-grid">{GIVEN_KEYS[spec.given].map((k) => text(sideLabel[k], k, 90))}</div>
        </>
      )}

      {spec.topic === "triangle" && (
        <>
          {segmented(TRI_CASES, (c) => c, spec.kase, (kase) => set({ kase }))}
          <div className="range-grid">{CASE_KEYS[spec.kase].map((k) => text(/[A-Z]/.test(k) ? `${k} (°)` : k, k))}</div>
        </>
      )}

      {spec.topic === "graph" && (
        <>
          {segmented(TRIG_FNS, (f) => f, spec.fn, (fn) => set({ fn }))}
          <small className="hint mono">y = A·{spec.fn}(B(x − C)) + D</small>
          <div className="range-grid">
            {text("A", "A")}
            {text("B", "B")}
            {text("C", "C")}
            {text("D", "D")}
          </div>
          {unitToggle(spec.unit)}
        </>
      )}

      {spec.topic === "equation" && (
        <>
          {segmented(TRIG_FNS, (f) => `${f} x = k`, spec.fn, (fn) => set({ fn }))}
          <div className="range-grid">{text("k", "k", 140)}</div>
          {unitToggle(spec.unit)}
        </>
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
