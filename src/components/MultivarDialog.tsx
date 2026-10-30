import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { MV_PRESETS, MV_TOPICS, renderMultivar, type MvSpec, type MvTopic } from "../math/multivar";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<MvTopic, MvSpec>;

export function MultivarDialog({ initial, start, onSubmit, onClose }: {
  initial?: MvSpec;
  start?: string;
  onSubmit: (spec: MvSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.multivarWords;
  const f = t.multivarFields;
  const [topic, setTopic] = useState<MvTopic>(initial?.topic ?? startOr(start, MV_TOPICS, "partial"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(MV_TOPICS.map((k) => [k, MV_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<MvSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });
  const setSrc = (i: number, v: string) => set({ src: spec.src.map((s, k) => (k === i ? v : s)).concat(i >= spec.src.length ? [v] : []) });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderMultivar(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  // What each line of input is called: the function, or for the chain rule x(t) and y(t) too, u and v of a map, or
  // the constraint's g.
  const names = topic === "chain" ? [f.f, f.x, f.y] : topic === "jacobian" ? [f.u, f.v] : topic === "lagrange" ? [f.f, f.g] : [f.f];
  const row = (label: string, value: string, onChange: (v: string) => void) => (
    <div className="fn-row" key={label}>
      <span className="fn-prefix" style={{ fontStyle: "normal" }}>{label}</span>
      <input className="mono" spellCheck={false} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  return (
    <Modal
      title={initial ? t.editMultivar : t.multivar}
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
      {!initial && <Tabs items={MV_TOPICS} value={topic} onChange={setTopic} label={(k) => t.multivarTopics[k]} />}
      <small className="hint">{t.multivarHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {MV_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {names.map((n, i) => row(n, spec.src[i] ?? "", (v) => setSrc(i, v)))}
      {row(topic === "chain" ? f.atT : topic === "convex" ? f.around : topic === "lagrange" ? f.c : f.at, spec.at, (v) => set({ at: v }))}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{result.error}</span>}
        </div>
      </div>
    </Modal>
  );
}
