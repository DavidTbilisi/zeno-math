import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { latexToSvg, type RenderedSvg } from "../math/latex";
import { DEFAULT_MATRIX, MATRIX_OPS, MatrixError, matrixLatex, needsB, OP_LABELS, type MatrixCalcSpec } from "../math/matrix";
import { DEFAULT_TRANSFORM, TRANSFORM_PRESETS, transformToSvg, type TransformSpec } from "../math/transform";
import { svgToDataUrl } from "../math/svg";
import { DEFAULT_SPACE, renderSpace, SPACE_LABELS, SPACE_OPS, SPACE_PRESETS, type SpaceSpec } from "../math/vectorspace";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

export type MatrixSpec = MatrixCalcSpec | TransformSpec | SpaceSpec;

const MAX = 4;

export function MatrixDialog({ initial, start, onSubmit, onClose }: {
  initial?: MatrixSpec;
  start?: string;
  onSubmit: (spec: MatrixSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<MatrixSpec["type"]>(initial?.type ?? startOr(start, ["calc", "transform", "space"] as const, "calc"));
  const [calc, setCalc] = useState<MatrixCalcSpec>(initial?.type === "calc" ? initial : DEFAULT_MATRIX);
  const [tf, setTf] = useState<TransformSpec>(initial?.type === "transform" ? initial : DEFAULT_TRANSFORM);
  const [space, setSpace] = useState<SpaceSpec>(initial?.type === "space" ? initial : DEFAULT_SPACE);
  const spec: MatrixSpec = tab === "calc" ? calc : tab === "transform" ? tf : space;

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      if (spec.type === "space") return { rendered: renderSpace(spec, t.spaceWords) };
      return { rendered: spec.type === "calc" ? latexToSvg(matrixLatex(spec)) : transformToSvg(spec) };
    } catch (e) {
      return { error: e instanceof MatrixError ? t.matrixErrors[e.key] : (e as Error).message };
    }
  }, [spec, t]);

  return (
    <Modal
      title={initial ? t.editMatrix : t.matrices}
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
        <Tabs items={(["calc", "transform", "space"] as const)} value={tab} onChange={setTab} label={(k) => k === "calc" ? t.matrixCalc : k === "transform" ? t.matrixTransform : t.matrixSpaces} />
      )}

      {tab === "calc" ? (
        <CalcControls spec={calc} onChange={setCalc} />
      ) : tab === "transform" ? (
        <TransformControls spec={tf} onChange={setTf} />
      ) : (
        <SpaceControls spec={space} onChange={setSpace} />
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

function CalcControls({ spec, onChange }: { spec: MatrixCalcSpec; onChange: (s: MatrixCalcSpec) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<MatrixCalcSpec>) => onChange({ ...spec, ...patch });
  const opHint: Partial<Record<MatrixCalcSpec["op"], string>> = { solve: t.solveHint };

  return (
    <>
      <Segmented className="wrap" itemClassName="math-label" ariaLabel={t.operation} items={MATRIX_OPS} value={spec.op} onChange={(op) => set({ op })} label={(op) => OP_LABELS[op]} />
      {opHint[spec.op] && <small className="hint">{opHint[spec.op]}</small>}
      <div className="matrix-editors">
        <MatrixEditor name="A" cells={spec.A} onChange={(A) => set({ A })} augmented={spec.op === "solve"} />
        {needsB(spec.op) && <MatrixEditor name="B" cells={spec.B} onChange={(B) => set({ B })} />}
        {spec.op === "scalar" && (
          <label className="field">
            <span>k</span>
            <input className="matrix-cell" value={spec.k} onChange={(e) => set({ k: e.target.value })} />
          </label>
        )}
      </div>
      <small className="hint">{t.matrixCellHint}</small>
      <label className="check inline">
        <input type="checkbox" checked={spec.steps} onChange={(e) => set({ steps: e.target.checked })} />
        <span>{t.showSteps}</span>
      </label>
    </>
  );
}

function MatrixEditor({ name, cells, onChange, augmented = false }: {
  name: string;
  cells: string[][];
  onChange: (c: string[][]) => void;
  augmented?: boolean;
}) {
  const { t } = useI18n();
  const rows = cells.length;
  const cols = cells[0].length;
  const resize = (r: number, c: number) =>
    onChange(Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => cells[i]?.[j] ?? "0")));
  const setCell = (i: number, j: number, v: string) => onChange(cells.map((row, r) => row.map((x, c) => (r === i && c === j ? v : x))));
  const maxCols = augmented ? MAX + 1 : MAX;

  return (
    <div className="matrix-editor">
      <div className="matrix-head">
        <span className="matrix-name">{name}</span>
        <Stepper label={t.rows} value={rows} min={1} max={MAX} onChange={(r) => resize(r, cols)} />
        <span className="muted">×</span>
        <Stepper label={t.columns} value={cols} min={augmented ? 2 : 1} max={maxCols} onChange={(c) => resize(rows, c)} />
      </div>
      <div className="matrix-grid" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
        {cells.map((row, i) =>
          row.map((v, j) => (
            <input
              key={`${i}-${j}`}
              className={`matrix-cell${augmented && j === cols - 1 ? " rhs" : ""}`}
              value={v}
              inputMode="decimal"
              aria-label={`${name}${i + 1}${j + 1}`}
              onChange={(e) => setCell(i, j, e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          )),
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <span className="stepper" aria-label={label} title={label}>
      <button disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label} −`}>−</button>
      <span>{value}</span>
      <button disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} +`}>+</button>
    </span>
  );
}

function TransformControls({ spec, onChange }: { spec: TransformSpec; onChange: (s: TransformSpec) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<TransformSpec>) => onChange({ ...spec, ...patch });
  // Inputs are edited as text so "-" or "0." can be typed; the spec keeps numbers.
  const [text, setText] = useState(spec.m.map(String));
  const setEntry = (i: number, v: string) => {
    const next = text.map((x, j) => (j === i ? v : x));
    setText(next);
    const n = Number(v);
    if (v.trim() !== "" && Number.isFinite(n)) set({ m: spec.m.map((x, j) => (j === i ? n : x)) as TransformSpec["m"] });
  };

  return (
    <>
      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {TRANSFORM_PRESETS.map((p) => (
            <button
              key={p.key}
              className="chip text"
              onClick={() => {
                setText(p.m.map(String));
                set({ m: p.m, t: 1 });
              }}
            >
              {t.transformPresets[p.key as keyof typeof t.transformPresets]}
            </button>
          ))}
        </div>
      </div>
      <div className="transform-row">
        <div className="matrix-grid bracket" style={{ gridTemplateColumns: "repeat(2, auto)" }}>
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              className={`matrix-cell ${i % 2 ? "col-j" : "col-i"}`}
              value={text[i]}
              inputMode="decimal"
              aria-label={["a", "b", "c", "d"][i]}
              onChange={(e) => setEntry(i, e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>
        <small className="hint">{t.transformHint}</small>
      </div>
      <div className="field">
        <span>{t.animate}</span>
        <input type="range" min={0} max={1} step={0.01} value={spec.t} onChange={(e) => set({ t: Number(e.target.value) })} />
      </div>
      <div className="range-grid">
        <label className="check">
          <input type="checkbox" checked={spec.grid} onChange={(e) => set({ grid: e.target.checked })} />
          <span>{t.showGrid}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.shape} onChange={(e) => set({ shape: e.target.checked })} />
          <span>{t.showShape}</span>
        </label>
      </div>
    </>
  );
}

function SpaceControls({ spec, onChange }: { spec: SpaceSpec; onChange: (s: SpaceSpec) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<SpaceSpec>) => onChange({ ...spec, ...patch });
  const rows = spec.A.length;
  const w = Array.from({ length: rows }, (_, i) => spec.w[i] ?? "0");
  return (
    <>
      <Segmented className="wrap" itemClassName="math-label" ariaLabel={t.operation} items={SPACE_OPS} value={spec.op} onChange={(op) => set({ op })} label={(op) => SPACE_LABELS[op]} />
      <small className="hint">{t.spaceHints[spec.op]}</small>
      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {SPACE_PRESETS.filter((p) => p.op === spec.op).map((p) => (
            <button key={p.label} className="chip text" onClick={() => set({ A: p.A, w: p.w ?? spec.w })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="matrix-editors">
        <MatrixEditor name={spec.op === "coords" ? "B" : spec.op === "span" || spec.op === "gram" ? "v" : "A"} cells={spec.A} onChange={(A) => set({ A })} />
        {spec.op === "coords" && (
          <div className="matrix-editor">
            <div className="matrix-head">
              <span className="matrix-name">w</span>
            </div>
            <div className="matrix-grid" style={{ gridTemplateColumns: "auto" }}>
              {w.map((v, i) => (
                <input
                  key={i}
                  className="matrix-cell"
                  value={v}
                  inputMode="decimal"
                  aria-label={`w${i + 1}`}
                  onChange={(e) => set({ w: w.map((x, j) => (j === i ? e.target.value : x)) })}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <small className="hint">{t.matrixCellHint}</small>
      {spec.op !== "eigen" && spec.op !== "gram" && (
        <label className="check inline">
          <input type="checkbox" checked={spec.steps} onChange={(e) => set({ steps: e.target.checked })} />
          <span>{t.showSteps}</span>
        </label>
      )}
    </>
  );
}
