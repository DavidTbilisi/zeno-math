import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  INT_PRESETS,
  INT_TOPICS,
  PARTS_KINDS,
  renderIntegral,
  SUB_OUTERS,
  TRIG_FORMS,
  type IntegralSpec,
  type IntSpecOf,
  type IntTopic,
} from "../math/integration";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = { [K in IntTopic]: IntSpecOf<K> };

const OUTER_LABELS = { power: "uⁿ", exp: "eᵘ", sin: "sin u", cos: "cos u", recip: "1/u" };
const PARTS_LABELS = { exp: "xⁿ eᵃˣ", sin: "xⁿ sin ax", cos: "xⁿ cos ax", ln: "xⁿ ln x", expsin: "eᵃˣ sin bx", expcos: "eᵃˣ cos bx" };
const TRIG_LABELS = { asin: "1 / √(a² − x²)", sqrtA: "√(a² − x²)", atan: "1 / (a² + x²)", asinh: "1 / √(x² + a²)", acosh: "1 / √(x² − a²)", x2sqrt: "1 / (x² √(a² − x²))" };

export function IntegralDialog({ initial, start, onSubmit, onClose }: {
  initial?: IntegralSpec;
  start?: string;
  onSubmit: (spec: IntegralSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<IntTopic>(initial?.topic ?? startOr(start, INT_TOPICS, "sub"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(INT_TOPICS.map((k) => [k, INT_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<IntegralSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderIntegral(spec, t.intWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const text = (label: string, key: string, width = 70, placeholder = "") => (
    <label>
      <span>{label}</span>
      <input
        type="text"
        className="mono"
        style={{ width }}
        spellCheck={false}
        placeholder={placeholder}
        value={(spec as Record<string, unknown>)[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<IntegralSpec>)}
      />
    </label>
  );
  const segmented = <K extends string>(keys: readonly K[], labels: Record<K, string>, value: K, onPick: (k: K) => void) => (
    <Segmented className="wrap" itemClassName="math-label" items={keys} value={value} onChange={(k) => onPick(k)} label={(k) => labels[k]} />
  );
  const bounds = (
    <>
      {text(t.from, "lo", 80, "—")}
      {text(t.to, "hi", 80, "—")}
    </>
  );

  return (
    <Modal
      title={initial ? t.editIntegral : t.integrals}
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
        <Tabs items={INT_TOPICS} value={topic} onChange={setTopic} label={(k) => t.intTopics[k]} />
      )}
      <small className="hint">{t.intHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {INT_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "sub" && (
        <>
          {segmented(SUB_OUTERS, OUTER_LABELS, spec.outer, (outer) => set({ outer }))}
          <div className="range-grid">
            {text("c", "c")}
            {text("a", "a")}
            <label>
              <span>m</span>
              <input type="number" min={1} max={6} value={spec.m} onChange={(e) => set({ m: Number(e.target.value) })} />
            </label>
            {text("b", "b")}
            {spec.outer === "power" && text("n", "n")}
            {bounds}
          </div>
        </>
      )}

      {spec.topic === "parts" && (
        <>
          {segmented(PARTS_KINDS, PARTS_LABELS, spec.kind, (kind) => set({ kind }))}
          <div className="range-grid">
            {spec.kind !== "expsin" && spec.kind !== "expcos" && (
              <label>
                <span>n</span>
                <input type="number" min={0} max={6} value={spec.n} onChange={(e) => set({ n: Number(e.target.value) })} />
              </label>
            )}
            {spec.kind !== "ln" && text("a", "a")}
            {(spec.kind === "expsin" || spec.kind === "expcos") && text("b", "b")}
            {bounds}
          </div>
        </>
      )}

      {spec.topic === "partial" && (
        <div className="range-grid">
          {text(t.numerator, "num", 200)}
          {text(t.denominator, "den", 220)}
          {bounds}
        </div>
      )}

      {spec.topic === "trig" && (
        <>
          {segmented(TRIG_FORMS, TRIG_LABELS, spec.form, (form) => set({ form }))}
          <div className="range-grid">
            {text("a", "a")}
            {bounds}
          </div>
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
