import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { MAX_SLICES, revCaption, revolve, type Revolution } from "../math/revolution";
import {
  canUnfold,
  captionLines,
  DEFAULT_CUBES,
  DEFAULT_REVOLUTION,
  DEFAULT_SOLID,
  DEFAULT_TRANSFORM3D,
  interpolated,
  REVOLUTION_PRESETS,
  TRANSFORM3D_PRESETS,
  DEFAULT_VIEW,
  REVOLUTION_VIEW,
  SOLID_DEFAULT_DIMS,
  SOLID_SHAPES,
  type CubesSpec,
  type RevolutionSpec,
  type SolidShape,
  type SolidSpec,
  type Spec3D,
  type Transform3DSpec,
} from "../three/spec";
import { Viewer, type Snapshot } from "../three/viewer";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

const TABS = ["solid", "cubes", "transform3d", "revolution"] as const;
const BASIS_COLORS = ["#2f9e44", "#e03131", "#1971c2"];
const SLICE_CHOICES = [0, 4, 8, 16, MAX_SLICES];
const fmtEntry = (v: number) => String(Math.round(v * 100) / 100).replace("-", "−");

const num = (v: string, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v.trim() !== "" ? Math.min(max, Math.max(min, n)) : fallback;
};

export default function ThreeDialog({ initial, start, onSubmit, onClose }: {
  initial?: Spec3D;
  start?: string;
  onSubmit: (spec: Spec3D, image: Snapshot) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [solid, setSolid] = useState<SolidSpec>(initial?.type === "solid" ? initial : DEFAULT_SOLID);
  const [cubes, setCubes] = useState<CubesSpec>(initial?.type === "cubes" ? initial : DEFAULT_CUBES);
  const [tab, setTab] = useState<Spec3D["type"]>(initial?.type ?? startOr(start, TABS, "solid"));
  const [tf, setTf] = useState<Transform3DSpec>(initial?.type === "transform3d" ? initial : DEFAULT_TRANSFORM3D);
  const [revSpec, setRevSpec] = useState<RevolutionSpec>(initial?.type === "revolution" ? initial : DEFAULT_REVOLUTION);
  const spec: Spec3D = tab === "solid" ? solid : tab === "cubes" ? cubes : tab === "transform3d" ? tf : revSpec;

  // The solid of revolution is worked out once per change, for the picture and the caption alike.
  const rev = useMemo((): { ok?: Revolution; error?: string } => {
    if (tab !== "revolution") return {};
    try {
      return { ok: revolve(revSpec, t.revWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [tab, revSpec, t]);

  const homeView = tab === "revolution" ? REVOLUTION_VIEW : DEFAULT_VIEW;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);

  useEffect(() => {
    const v = new Viewer(hostRef.current!);
    viewer.current = v;
    v.show(spec, rev.ok);
    v.setView(initial?.view ?? homeView);
    return () => {
      v.dispose();
      viewer.current = null;
    };
    // The viewer is made once, for the scene and view the dialog opened with; later changes go to viewer.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each tab starts from its own view (the one it opened with stays until the tab changes).
  const firstTab = useRef(tab);
  useEffect(() => {
    if (tab !== firstTab.current) viewer.current?.setView(homeView);
    firstTab.current = tab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    // A region that can't be read keeps the last good picture, with the error above it.
    if (!rev.error) viewer.current?.show(spec, rev.ok);
  }, [spec, rev]);

  const caption = !spec.formulas ? [] : spec.type !== "revolution" ? captionLines(spec, t.cubes) : rev.ok ? revCaption(spec, rev.ok, t.revWords) : [];

  const insert = () => {
    const v = viewer.current!;
    // The 3×3 transformation also prints its (current, interpolated) matrix on the snapshot.
    const matrix =
      spec.type === "transform3d"
        ? { rows: [0, 1, 2].map((i) => interpolated(spec).slice(i * 3, i * 3 + 3).map(fmtEntry)), colors: BASIS_COLORS }
        : undefined;
    onSubmit({ ...spec, view: v.getView() }, v.snapshot(caption, matrix));
  };

  const shapeLabel: Record<SolidShape, string> = {
    cuboid: t.cuboid,
    prism: t.prism,
    pyramid: t.pyramid,
    cylinder: t.cylinder,
    cone: t.cone,
    sphere: t.sphere,
  };

  return (
    <Modal
      title={initial ? t.edit3d : t.threeD}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" disabled={!!rev.error} onClick={insert}>{initial ? t.update : t.insert}</button>
        </>
      }
    >
      {!initial && (
        <Tabs items={TABS} value={tab} onChange={setTab} label={(k) => ({ solid: t.solids, cubes: t.unitCubes, transform3d: t.matrix3d, revolution: t.revolution })[k]} />
      )}

      {tab === "solid" && <SolidControls spec={solid} onChange={setSolid} shapeLabel={shapeLabel} />}
      {tab === "cubes" && <CubesControls spec={cubes} onChange={setCubes} />}
      {tab === "transform3d" && <Transform3DControls spec={tf} onChange={setTf} />}
      {tab === "revolution" && <RevolutionControls spec={revSpec} onChange={setRevSpec} error={rev.error} />}

      <div className="viewer-wrap">
        <div ref={hostRef} className="viewer" />
        <div className="viewer-bar">
          <small className="hint">{t.rotateHint}</small>
          <div>
            <button className="btn small ghost" onClick={() => viewer.current?.setView({ azimuth: 0, polar: 0.0001, zoom: 1 })}>
              ⬒ {t.topView}
            </button>
            <button className="btn small ghost" onClick={() => viewer.current?.setView(homeView)}>⟲ {t.resetView}</button>
          </div>
        </div>
        {caption.length > 0 && (
          <div className="caption">
            {caption.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SolidControls({ spec, onChange, shapeLabel }: {
  spec: SolidSpec;
  onChange: (s: SolidSpec) => void;
  shapeLabel: Record<SolidShape, string>;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<SolidSpec>) => onChange({ ...spec, ...patch });
  const dims: { key: "a" | "b" | "c"; label: string }[] =
    spec.shape === "cuboid"
      ? [{ key: "a", label: t.length }, { key: "b", label: t.width }, { key: "c", label: t.height }]
      : spec.shape === "pyramid" || spec.shape === "prism"
        ? [{ key: "a", label: t.baseSide }, { key: "c", label: t.height }]
        : spec.shape === "sphere"
          ? [{ key: "a", label: t.radius }]
          : [{ key: "a", label: t.radius }, { key: "c", label: t.height }];

  return (
    <>
      <div className="segmented wrap" role="radiogroup">
        {SOLID_SHAPES.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={spec.shape === s}
            className={spec.shape === s ? "active" : ""}
            onClick={() => s !== spec.shape && set({ shape: s, ...SOLID_DEFAULT_DIMS[s], unfold: 0 })}
          >
            {shapeLabel[s]}
          </button>
        ))}
      </div>
      <div className="range-grid">
        {dims.map((d) => (
          <label key={d.key}>
            <span>{d.label}</span>
            <input
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              defaultValue={spec[d.key]}
              key={`${spec.shape}-${d.key}`}
              onChange={(e) => set({ [d.key]: num(e.target.value, 0.5, 20, spec[d.key]) })}
            />
          </label>
        ))}
        {spec.shape === "prism" && (
          <label>
            <span>{t.baseSides}</span>
            <input
              type="number"
              min={3}
              max={8}
              value={spec.sides ?? 3}
              onChange={(e) => set({ sides: Math.round(num(e.target.value, 3, 8, spec.sides ?? 3)) })}
            />
          </label>
        )}
        <label>
          <span>{t.unit}</span>
          <input className="unit-input" value={spec.unit} onChange={(e) => set({ unit: e.target.value.slice(0, 6) })} />
        </label>
      </div>
      {canUnfold(spec.shape) && (
        <div className="field">
          <span>{t.unfold}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={spec.unfold}
            onChange={(e) => set({ unfold: Number(e.target.value) })}
          />
        </div>
      )}
      <div className="range-grid">
        <label className="check">
          <input type="checkbox" checked={spec.seeThrough} onChange={(e) => set({ seeThrough: e.target.checked })} />
          <span>{t.seeThrough}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.labels} onChange={(e) => set({ labels: e.target.checked })} />
          <span>{t.showLabels}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.formulas} onChange={(e) => set({ formulas: e.target.checked })} />
          <span>{t.showFormulas}</span>
        </label>
      </div>
    </>
  );
}

function CubesControls({ spec, onChange }: { spec: CubesSpec; onChange: (s: CubesSpec) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<CubesSpec>) => onChange({ ...spec, ...patch });
  const rows = spec.heights.length;
  const cols = spec.heights[0]?.length ?? 0;

  const resize = (r: number, c: number) =>
    set({ heights: Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => spec.heights[i]?.[j] ?? 0)) });
  const bump = (i: number, j: number, delta: number) =>
    set({ heights: spec.heights.map((row, r) => row.map((h, c) => (r === i && c === j ? (h + delta + 9) % 9 : h))) });

  return (
    <>
      <Segmented items={(["cuboid", "stacks"] as const)} value={spec.mode} onChange={(m) => set({ mode: m })} label={(m) => m === "cuboid" ? t.cubesCuboid : t.cubesStacks} />

      {spec.mode === "cuboid" ? (
        <div className="range-grid">
          {([["a", t.length], ["b", t.width], ["c", t.height]] as const).map(([k, label]) => (
            <label key={k}>
              <span>{label}</span>
              <input type="number" min={1} max={8} value={spec[k]} onChange={(e) => set({ [k]: num(e.target.value, 1, 8, spec[k]) })} />
            </label>
          ))}
        </div>
      ) : (
        <div className="field">
          <span>{t.stacksHint}</span>
          <div className="stacks-row">
            <div className="stack-grid" style={{ gridTemplateColumns: `repeat(${cols}, 38px)` }}>
              {spec.heights.map((row, i) =>
                row.map((h, j) => (
                  <button
                    key={`${i}-${j}`}
                    className={`stack-cell${h ? " filled" : ""}`}
                    onClick={(e) => bump(i, j, e.shiftKey ? -1 : 1)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      bump(i, j, -1);
                    }}
                  >
                    {h || ""}
                  </button>
                )),
              )}
            </div>
            <div className="range-grid column">
              <label>
                <span>{t.rows}</span>
                <input type="number" min={1} max={6} value={rows} onChange={(e) => resize(num(e.target.value, 1, 6, rows), cols)} />
              </label>
              <label>
                <span>{t.columns}</span>
                <input type="number" min={1} max={6} value={cols} onChange={(e) => resize(rows, num(e.target.value, 1, 6, cols))} />
              </label>
            </div>
          </div>
        </div>
      )}
      <label className="check inline">
        <input type="checkbox" checked={spec.formulas} onChange={(e) => set({ formulas: e.target.checked })} />
        <span>{t.showFormulas}</span>
      </label>
    </>
  );
}

function Transform3DControls({ spec, onChange }: { spec: Transform3DSpec; onChange: (s: Transform3DSpec) => void }) {
  const { t } = useI18n();
  const set = (patch: Partial<Transform3DSpec>) => onChange({ ...spec, ...patch });
  // Entries are edited as text so "-" or "0." can be typed; the spec keeps numbers.
  const [text, setText] = useState(spec.m.map(String));
  const setEntry = (i: number, v: string) => {
    setText(text.map((x, j) => (j === i ? v : x)));
    const n = Number(v);
    if (v.trim() !== "" && Number.isFinite(n)) set({ m: spec.m.map((x, j) => (j === i ? n : x)) });
  };

  return (
    <>
      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {TRANSFORM3D_PRESETS.map((p) => (
            <button
              key={p.key}
              className="chip text"
              onClick={() => {
                setText(p.m.map(String));
                set({ m: p.m, t: 1 });
              }}
            >
              {t.transform3dPresets[p.key as keyof typeof t.transform3dPresets]}
            </button>
          ))}
        </div>
      </div>
      <div className="transform-row">
        <div className="matrix-grid" style={{ gridTemplateColumns: "repeat(3, auto)" }}>
          {spec.m.map((_, i) => (
            <input
              key={i}
              className={`matrix-cell ${["col-i", "col-j", "col-k"][i % 3]}`}
              value={text[i]}
              inputMode="decimal"
              aria-label={`m${Math.floor(i / 3) + 1}${(i % 3) + 1}`}
              onChange={(e) => setEntry(i, e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>
        <small className="hint">{t.transform3dHint}</small>
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
          <input type="checkbox" checked={spec.formulas} onChange={(e) => set({ formulas: e.target.checked })} />
          <span>{t.showFormulas}</span>
        </label>
      </div>
    </>
  );
}

function RevolutionControls({ spec, onChange, error }: { spec: RevolutionSpec; onChange: (s: RevolutionSpec) => void; error?: string }) {
  const { t } = useI18n();
  const w = t.revWords;
  const set = (patch: Partial<RevolutionSpec>) => onChange({ ...spec, ...patch });
  const text = (key: "f" | "g" | "a" | "b", label: string, width: number, placeholder = "") => (
    <label>
      <span>{label}</span>
      <input type="text" className="mono" style={{ width }} spellCheck={false} placeholder={placeholder} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <>
      <small className="hint">{t.revHint}</small>
      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {REVOLUTION_PRESETS.map((p) => (
            <button key={p.key} className="chip text" onClick={() => set({ ...p.spec, slices: 0 })}>
              {w.presets[p.key as keyof typeof w.presets]}
            </button>
          ))}
        </div>
      </div>
      <div className="range-grid">
        {text("f", "f(x)", 150)}
        {text("g", "g(x)", 150, w.gEmpty)}
        {text("a", t.from, 70)}
        {text("b", t.to, 70)}
      </div>
      <Segmented items={(["x", "y"] as const)} value={spec.axis} onChange={(axis) => set({ axis })} label={(k) => (k === "x" ? w.axisX : w.axisY)} />
      <div className="field">
        <span>{w.turn}: {Math.round(spec.sweep * 360)}°</span>
        <input type="range" min={0} max={1} step={0.01} value={spec.sweep} onChange={(e) => set({ sweep: Number(e.target.value) })} />
      </div>
      <div className="field">
        <span>{w.slices}</span>
        <Segmented items={SLICE_CHOICES} value={spec.slices} onChange={(slices) => set({ slices })} label={(n) => (n ? String(n) : w.smooth)} />
      </div>
      <div className="range-grid">
        <label className="check">
          <input type="checkbox" checked={spec.seeThrough} onChange={(e) => set({ seeThrough: e.target.checked })} />
          <span>{t.seeThrough}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.formulas} onChange={(e) => set({ formulas: e.target.checked })} />
          <span>{t.showFormulas}</span>
        </label>
      </div>
      {error && <span className="error">{error}</span>}
    </>
  );
}
