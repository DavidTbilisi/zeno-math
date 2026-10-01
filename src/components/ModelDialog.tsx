import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import {
  DEFAULT_MODELS,
  MODEL_COLORS,
  PRESETS,
  renderModel,
  type BarModelSpec,
  type BondSpec,
  type FractionSpec,
  type ModelSpec,
  type ModelType,
  type PercentSpec,
} from "../math/models";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";
import { PlaceValueMat } from "./PlaceValueMat";
import { MULTIPLY_LIMITS, MULTIPLY_STYLES, stepCount, type MultiplySpec } from "../math/multiply";
import { DIVISION_LIMITS, DIVISION_STYLES, divisionStepCount, type DivisionSpec } from "../math/division";
import { FRAC_OPS, fracOpStepCount, type FracOpSpec } from "../math/fracop";
import { PERCENT_KINDS, percRatioStepCount, RATIO_KINDS, type PercRatioSpec } from "../math/percratio";

type Specs = { [K in ModelType]: Extract<ModelSpec, { type: K }> };

const TYPES: ModelType[] = ["bar", "fraction", "percent", "bond", "placeValue", "multiply", "division", "fracop", "percratio"];
const clampInt = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

export function ModelDialog({ initial, start, onSubmit, onClose }: {
  initial?: ModelSpec;
  start?: string;
  onSubmit: (spec: ModelSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<ModelType>(initial?.type ?? startOr(start, TYPES, "bar"));
  const [specs, setSpecs] = useState<Specs>(() => ({ ...DEFAULT_MODELS, ...(initial ? { [initial.type]: initial } : {}) }));
  const spec = specs[type];
  const update = <K extends ModelType>(k: K, next: Specs[K]) => setSpecs((s) => ({ ...s, [k]: next }));

  const result = useMemo(() => {
    try {
      return { rendered: renderModel(spec) };
    } catch {
      return { error: t.invalidParts };
    }
  }, [spec, t]);

  const tabLabel: Record<ModelType, string> = { bar: t.barModel, fraction: t.fractions, percent: t.percent, bond: t.numberBond, placeValue: t.placeValue, multiply: t.multiplication, division: t.division, fracop: t.fracOps, percratio: t.percRatio };

  return (
    <Modal
      title={initial ? t.editModel : t.models}
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
        <Tabs items={TYPES} value={type} onChange={setType} label={(k) => tabLabel[k]} />
      )}

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {PRESETS[type].map((p) => (
            <button key={p.key} className="chip text" onClick={() => update(type, structuredClone(p.spec) as never)}>
              {t.presets[p.key as keyof typeof t.presets]}
            </button>
          ))}
        </div>
      </div>

      {spec.type === "multiply" && <MultiplyEditor spec={spec} onChange={(s) => update("multiply", s)} />}
      {spec.type === "division" && <DivisionEditor spec={spec} onChange={(s) => update("division", s)} />}
      {spec.type === "fracop" && <FracOpEditor spec={spec} onChange={(s) => update("fracop", s)} />}
      {spec.type === "percratio" && <PercRatioEditor spec={spec} onChange={(s) => update("percratio", s)} />}
      {spec.type === "placeValue" && <PlaceValueMat spec={spec} onChange={(s) => update("placeValue", s)} />}
      {spec.type === "bar" && <BarEditor spec={spec} onChange={(s) => update("bar", s)} />}
      {spec.type === "fraction" && <FractionEditor spec={spec} onChange={(s) => update("fraction", s)} />}
      {spec.type === "percent" && <PercentEditor spec={spec} onChange={(s) => update("percent", s)} />}
      {spec.type === "bond" && <BondEditor spec={spec} onChange={(s) => update("bond", s)} />}

      {spec.type !== "placeValue" && (
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
      )}
    </Modal>
  );
}

function Dot({ i }: { i: number }) {
  const c = MODEL_COLORS[i % MODEL_COLORS.length];
  return <span className="dot" style={{ background: c.fill, borderColor: c.stroke }} />;
}

function BarEditor({ spec, onChange }: { spec: BarModelSpec; onChange: (s: BarModelSpec) => void }) {
  const { t } = useI18n();
  const setRow = (i: number, patch: Partial<BarModelSpec["rows"][number]>) =>
    onChange({ ...spec, rows: spec.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <>
      <div className="field">
        <div className="model-rows">
          <div className="model-row head">
            <span />
            <span>{t.rowLabel}</span>
            <span>{t.segments}</span>
            <span>{t.total}</span>
            <span />
          </div>
          {spec.rows.map((r, i) => (
            <div key={i} className="model-row">
              <Dot i={i} />
              <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
              <input className="mono" value={r.segments} spellCheck={false} onChange={(e) => setRow(i, { segments: e.target.value })} />
              <input value={r.total} onChange={(e) => setRow(i, { total: e.target.value })} />
              {spec.rows.length > 1 ? (
                <button className="icon-btn" aria-label={t.remove} onClick={() => onChange({ ...spec, rows: spec.rows.filter((_, j) => j !== i) })}>
                  ×
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
        {spec.rows.length < 5 && (
          <button className="btn small add-fn" onClick={() => onChange({ ...spec, rows: [...spec.rows, { label: "", segments: "", total: "" }] })}>
            + {t.addRow}
          </button>
        )}
        <small className="hint">{t.segmentsHint}</small>
      </div>
      <div className="range-grid">
        <label>
          <span>{t.grandTotal}</span>
          <input value={spec.grandTotal} onChange={(e) => onChange({ ...spec, grandTotal: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.showNumbers} onChange={(e) => onChange({ ...spec, showNumbers: e.target.checked })} />
          <span>{t.showNumbers}</span>
        </label>
      </div>
    </>
  );
}

function FractionEditor({ spec, onChange }: { spec: FractionSpec; onChange: (s: FractionSpec) => void }) {
  const { t } = useI18n();
  const setRow = (i: number, patch: Partial<FractionSpec["rows"][number]>) =>
    onChange({ ...spec, rows: spec.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <>
      <div className="field">
        <span>{t.fractions}</span>
        <div className="frac-list">
          {spec.rows.map((r, i) => (
            <div key={i} className="frac-edit">
              <Dot i={i} />
              <div className="frac-inputs">
                <input type="number" min={0} max={r.d * 3} value={r.n} onChange={(e) => setRow(i, { n: clampInt(e.target.value, 0, r.d * 3) })} />
                <hr />
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={r.d}
                  onChange={(e) => {
                    const d = clampInt(e.target.value, 1, 24);
                    setRow(i, { d, n: Math.min(r.n, d * 3) });
                  }}
                />
              </div>
              {spec.rows.length > 1 && (
                <button className="icon-btn" aria-label={t.remove} onClick={() => onChange({ ...spec, rows: spec.rows.filter((_, j) => j !== i) })}>
                  ×
                </button>
              )}
            </div>
          ))}
          {spec.rows.length < 6 && (
            <button className="btn small" onClick={() => onChange({ ...spec, rows: [...spec.rows, { ...spec.rows[spec.rows.length - 1] }] })}>
              +
            </button>
          )}
        </div>
      </div>
      <div className="range-grid">
        <Segmented ariaLabel={t.shape} items={(["bar", "circle"] as const)} value={spec.shape} onChange={(s) => onChange({ ...spec, shape: s })} label={(s) => s === "bar" ? t.shapeBar : t.shapeCircle} />
        <label className="check">
          <input type="checkbox" checked={spec.unitLabels} onChange={(e) => onChange({ ...spec, unitLabels: e.target.checked })} />
          <span>{t.unitLabels}</span>
        </label>
      </div>
    </>
  );
}

function MultiplyEditor({ spec, onChange }: { spec: MultiplySpec; onChange: (s: MultiplySpec) => void }) {
  const { t } = useI18n();
  const lim = MULTIPLY_LIMITS[spec.style];
  const n = stepCount(spec);
  const shown = Math.min(spec.step, n);
  const setStyle = (style: MultiplySpec["style"]) => {
    const l = MULTIPLY_LIMITS[style];
    onChange({ ...spec, style, a: Math.min(spec.a, l.a), b: Math.min(spec.b, l.b), step: 999 });
  };
  const setNum = (k: "a" | "b", v: string) => onChange({ ...spec, [k]: clampInt(v, 1, lim[k]), step: 999 });

  return (
    <>
      <Segmented className="wrap" items={MULTIPLY_STYLES} value={spec.style} onChange={(s) => setStyle(s)} label={(s) => t.multStyles[s]} />
      <div className="range-grid mult-inputs">
        <input type="number" min={1} max={lim.a} value={spec.a} aria-label="a" onChange={(e) => setNum("a", e.target.value)} />
        <span className="mult-sign">×</span>
        <input type="number" min={1} max={lim.b} value={spec.b} aria-label="b" onChange={(e) => setNum("b", e.target.value)} />
        <span className="mult-sign">= {spec.a * spec.b}</span>
      </div>
      <small className="hint">{t.multHint[spec.style]}</small>
      <div className="field">
        <span>
          {t.stepByStep}: {shown} / {n}
        </span>
        <input
          type="range"
          min={0}
          max={n}
          step={1}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...spec, step: v >= n ? 999 : v });
          }}
        />
      </div>
    </>
  );
}

function PercRatioEditor({ spec, onChange }: { spec: PercRatioSpec; onChange: (s: PercRatioSpec) => void }) {
  const { t } = useI18n();
  const n = percRatioStepCount(spec);
  const shown = Math.min(spec.step, n);
  const set = (patch: Partial<PercRatioSpec>) => onChange({ ...spec, ...patch, step: 999 });
  const fields = t.prFields[spec.kind] as Partial<Record<"p" | "a" | "b" | "ratio", string>>;
  const kinds = (list: readonly PercRatioSpec["kind"][], title: string) => (
    <div className="field">
      <span>{title}</span>
      <Segmented className="wrap" items={list} value={spec.kind} onChange={(k) => set({ kind: k })} label={(k) => t.prKinds[k]} />
    </div>
  );
  return (
    <>
      {kinds(PERCENT_KINDS, t.prPercent)}
      {kinds(RATIO_KINDS, t.prRatio)}
      <div className="range-grid">
        {(["ratio", "p", "a", "b"] as const).map((key) =>
          fields[key] ? (
            <label key={key}>
              <span>{fields[key]}</span>
              <input type="text" className="mono" style={{ width: key === "ratio" ? 150 : 90 }} spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
            </label>
          ) : null,
        )}
        {(spec.kind === "change" || spec.kind === "reverseChange") && (
          <div className="segmented" role="radiogroup">
            <button role="radio" aria-checked={spec.up} className={spec.up ? "active" : ""} onClick={() => set({ up: true })}>{t.prUp}</button>
            <button role="radio" aria-checked={!spec.up} className={!spec.up ? "active" : ""} onClick={() => set({ up: false })}>{t.prDown}</button>
          </div>
        )}
      </div>
      <small className="hint">{t.prHints[spec.kind]}</small>
      <div className="field">
        <span>
          {t.stepByStep}: {shown} / {n}
        </span>
        <input
          type="range"
          min={0}
          max={n}
          step={1}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...spec, step: v >= n ? 999 : v });
          }}
        />
      </div>
    </>
  );
}

function FracOpEditor({ spec, onChange }: { spec: FracOpSpec; onChange: (s: FracOpSpec) => void }) {
  const { t } = useI18n();
  const n = fracOpStepCount(spec);
  const shown = Math.min(spec.step, n);
  const set = (patch: Partial<FracOpSpec>) => onChange({ ...spec, ...patch, step: 999 });
  return (
    <>
      <Segmented itemClassName="math-label" items={FRAC_OPS} value={spec.op} onChange={(op) => set({ op })} label={(op) => op === "-" ? "−" : op} />
      <div className="range-grid mult-inputs">
        <input type="text" className="mono" spellCheck={false} value={spec.a} aria-label="a" onChange={(e) => set({ a: e.target.value })} />
        <span className="mult-sign">{spec.op === "-" ? "−" : spec.op}</span>
        <input type="text" className="mono" spellCheck={false} value={spec.b} aria-label="b" onChange={(e) => set({ b: e.target.value })} />
      </div>
      <small className="hint">{t.fracOpHint[spec.op]}</small>
      <div className="field">
        <span>
          {t.stepByStep}: {shown} / {n}
        </span>
        <input
          type="range"
          min={0}
          max={n}
          step={1}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...spec, step: v >= n ? 999 : v });
          }}
        />
      </div>
    </>
  );
}

function DivisionEditor({ spec, onChange }: { spec: DivisionSpec; onChange: (s: DivisionSpec) => void }) {
  const { t } = useI18n();
  const n = divisionStepCount(spec);
  const shown = Math.min(spec.step, n);
  const set = (patch: Partial<DivisionSpec>) => onChange({ ...spec, ...patch, step: 999 });
  return (
    <>
      <Segmented className="wrap" items={DIVISION_STYLES} value={spec.style} onChange={(s) => set({ style: s })} label={(s) => t.divStyles[s]} />
      <div className="range-grid mult-inputs">
        <input type="number" min={0} max={DIVISION_LIMITS.a} value={spec.a} aria-label="a" onChange={(e) => set({ a: clampInt(e.target.value, 0, DIVISION_LIMITS.a) })} />
        <span className="mult-sign">{spec.style === "corner" ? ":" : "÷"}</span>
        <input type="number" min={1} max={DIVISION_LIMITS.b} value={spec.b} aria-label="b" onChange={(e) => set({ b: clampInt(e.target.value, 1, DIVISION_LIMITS.b) })} />
        <label>
          <span>{t.divDecimals}</span>
          <input type="number" min={0} max={DIVISION_LIMITS.decimals} value={spec.decimals} onChange={(e) => set({ decimals: clampInt(e.target.value, 0, DIVISION_LIMITS.decimals) })} />
        </label>
      </div>
      <small className="hint">{t.divHint[spec.style]}</small>
      <div className="field">
        <span>
          {t.stepByStep}: {shown} / {n}
        </span>
        <input
          type="range"
          min={0}
          max={n}
          step={1}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...spec, step: v >= n ? 999 : v });
          }}
        />
      </div>
    </>
  );
}

function PercentEditor({ spec, onChange }: { spec: PercentSpec; onChange: (s: PercentSpec) => void }) {
  const { t } = useI18n();
  return (
    <>
      <div className="field">
        <span>
          {t.percentValue}: {spec.percent}%
        </span>
        <div className="percent-row">
          <input
            type="range"
            min={0}
            max={100}
            value={spec.percent}
            onChange={(e) => onChange({ ...spec, percent: Number(e.target.value) })}
          />
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={spec.percent}
            onChange={(e) => onChange({ ...spec, percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </div>
      </div>
      <div className="range-grid">
        <label>
          <span>{t.ofQuantity}</span>
          <input
            type="number"
            step="any"
            placeholder="—"
            value={spec.of ?? ""}
            onChange={(e) => onChange({ ...spec, of: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </label>
        <Segmented items={(["bar", "grid"] as const)} value={spec.style} onChange={(s) => onChange({ ...spec, style: s })} label={(s) => s === "bar" ? t.styleBar : t.styleGrid} />
      </div>
    </>
  );
}

function BondEditor({ spec, onChange }: { spec: BondSpec; onChange: (s: BondSpec) => void }) {
  const { t } = useI18n();
  return (
    <div className="range-grid">
      <label>
        <span>{t.whole}</span>
        <input className="bond-input" value={spec.whole} onChange={(e) => onChange({ ...spec, whole: e.target.value })} />
      </label>
      <label>
        <span>{t.parts}</span>
        <div>
          {spec.parts.map((p, i) => (
            <input
              key={i}
              className="bond-input"
              value={p}
              onChange={(e) => onChange({ ...spec, parts: spec.parts.map((q, j) => (j === i ? e.target.value : q)) })}
            />
          ))}
          {spec.parts.length < 4 && (
            <button className="btn small" title={t.addPart} onClick={() => onChange({ ...spec, parts: [...spec.parts, "?"] })}>
              +
            </button>
          )}
          {spec.parts.length > 2 && (
            <button className="icon-btn" aria-label={t.remove} onClick={() => onChange({ ...spec, parts: spec.parts.slice(0, -1) })}>
              ×
            </button>
          )}
        </div>
      </label>
    </div>
  );
}
