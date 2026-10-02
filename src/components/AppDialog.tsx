import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { APP_PRESETS, APP_TOPICS, appFields, OPT_KINDS, RATE_KINDS, renderApplied, type AppSpec, type AppTopic } from "../math/applied";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, startOr, Tabs } from "./ui";

type Specs = Record<AppTopic, AppSpec>;

export function AppDialog({ initial, start, onSubmit, onClose }: {
  initial?: AppSpec;
  start?: string;
  onSubmit: (spec: AppSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.appWords;
  const [topic, setTopic] = useState<AppTopic>(initial?.topic ?? startOr(start, APP_TOPICS, "area"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(APP_TOPICS.map((k) => [k, APP_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<AppSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });
  /** Switching the set-up starts from its first example, so the numbers fit. */
  const pick = (opt: string) => set(APP_PRESETS[topic].find((p) => p.spec.opt === opt)?.spec ?? { ...spec, opt });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderApplied(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editApplied : t.applied}
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
      {!initial && <Tabs items={APP_TOPICS} value={topic} onChange={setTopic} label={(k) => t.appTopics[k]} />}
      <small className="hint">{t.appHints[topic]}</small>

      {topic === "volume" && (
        <Segmented items={["x", "y"] as const} value={spec.opt === "y" ? "y" : "x"} onChange={(opt) => set({ opt })} label={(k) => (k === "x" ? w.fields.axisX : w.fields.axisY)} />
      )}
      {topic === "optimise" && <Segmented items={OPT_KINDS} value={OPT_KINDS.find((k) => k === spec.opt) ?? "box"} onChange={pick} label={(k) => w.opt.kinds[k]} ariaLabel={t.appFields.topic} />}
      {topic === "rates" && <Segmented items={RATE_KINDS} value={RATE_KINDS.find((k) => k === spec.opt) ?? "ladder"} onChange={pick} label={(k) => w.rates.kinds[k]} ariaLabel={t.appFields.topic} />}

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {APP_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {appFields(spec, w).map(({ key, label }) => (
        <div className="fn-row" key={key}>
          <span className="fn-prefix" style={{ fontStyle: "normal" }}>{label}</span>
          <input className="mono" spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
        </div>
      ))}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{result.error}</span>}
        </div>
      </div>
    </Modal>
  );
}
