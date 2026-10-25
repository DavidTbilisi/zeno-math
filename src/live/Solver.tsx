// The algorithm solver on the board: pick a kind of data and a pattern, start from a ready-made problem or write the
// formulas in the pattern's slots yourself, and step through the run or play it. The frames come from math/solver
// and are drawn by the same scenes as the interview problems.
import { useMemo, useState } from "react";
import type { Frame } from "../math/patternSteps";
import { DATA, DATA_KINDS, fromPair, fromPreset, isPresetId, mendSolver, PATTERNS, patternsFor, presetsFor, solverTrace, type DataKind, type LiveSolver, type PatternKind, type PresetId } from "../math/solver/index";
import type { SlotSpec } from "../math/solver/types";
import { cellsScene, graphScene, gridScene, Markers, matScene, rowsScene, SW, type Scene } from "./scenes";
import { stackScenes, StepBar, StepSaid, useStepper } from "./stepper";
import { fill, FONT, Toggle, type PieceProps } from "./ui";

export function Solver({ state: saved, set, w: words, svgRef }: PieceProps<"solver">) {
  const w = words.solver;
  const state = useMemo(() => mendSolver(saved), [saved]);
  const def = PATTERNS[state.pattern];
  const fields = DATA[state.data].fields;
  const result = useMemo((): { trace: ReturnType<typeof solverTrace> } | { error: string } => {
    try {
      return { trace: solverTrace(state, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [state, w]);
  const frames = "trace" in result ? result.trace.frames : [];
  const error = "error" in result ? result.error : null;
  const setStep = (k: number) => set({ ...state, step: k });
  const s = useStepper(frames, state.step, state.quiz, setStep);
  const [focus, setFocus] = useState<SlotSpec | null>(null);

  /** Anything new starts again from the beginning. */
  const restart = (next: LiveSolver) => {
    s.stop();
    set({ ...next, step: 0, quiz: state.quiz });
  };
  const pickData = (d: DataKind) => restart(fromPair(d, patternsFor(d).includes(state.pattern) ? state.pattern : patternsFor(d)[0]));
  const pickPattern = (p: PatternKind) => restart(fromPair(state.data, p));
  const pickPreset = (id: string) => restart(id ? fromPreset(id as PresetId) : { ...state, preset: null });
  const example = () => restart(isPresetId(state.preset) ? fromPreset(state.preset) : { ...state, inputs: [...(def.example[state.data] ?? [])] });
  const setInput = (i: number, v: string) => restart({ ...state, inputs: fields.map((_, j) => (j === i ? v : (state.inputs[j] ?? ""))) });
  const setSlot = (id: string, v: string) => restart({ ...state, preset: null, slots: { ...state.slots, [id]: v } });
  const presets = presetsFor(state.data, state.pattern);
  const asks = frames.some((f) => f.ask);
  /** The slot an error names, so its box shows it. */
  const faulty = (sl: SlotSpec) => !!error && error.startsWith(`${w.slots[sl.id]}:`);

  // ——— The picture ———
  const frame: Frame | undefined = s.frame;
  const scenes: Scene[] = [];
  if (frame && "trace" in result) {
    if (frame.cells) scenes.push(cellsScene(frames, frame, null));
    if (frame.grid) scenes.push(gridScene(frame, null, null));
    if (frame.mat) scenes.push(matScene(frames, frame));
    if (frame.graph) scenes.push(graphScene(frames, frame));
    if (frames.some((f) => f.rows?.length)) scenes.push(rowsScene(frames, frame));
  }
  const { height, drawn } = stackScenes(scenes);

  return (
    <>
      <div className="live-bar">
        <select value={state.data} aria-label={w.data} onChange={(e) => pickData(e.target.value as DataKind)}>
          {DATA_KINDS.map((d) => (
            <option key={d} value={d}>{w.kinds[d]}</option>
          ))}
        </select>
        <select value={state.pattern} aria-label={w.pattern} onChange={(e) => pickPattern(e.target.value as PatternKind)}>
          {patternsFor(state.data).map((p) => (
            <option key={p} value={p}>{w.names[p]}</option>
          ))}
        </select>
        <select value={state.preset ?? ""} aria-label={w.preset} onChange={(e) => pickPreset(e.target.value)}>
          {presets.map((id) => (
            <option key={id} value={id}>{w.presets[id]}</option>
          ))}
          <option value="">{w.custom}</option>
        </select>
        <button className="live-btn" onClick={example}>{w.example}</button>
        {asks && (
          <Toggle
            on={state.quiz}
            title={w.quizTip}
            onClick={() => {
              s.setSaid(null);
              set({ ...state, quiz: !state.quiz });
            }}
          >🙋 {w.quiz}</Toggle>
        )}
      </div>
      <p className="live-hint live-pattern-idea">{w.ideas[state.pattern]}</p>
      <div className="live-bar live-problem-inputs">
        {fields.map((f, i) => (
          <label key={f} className="live-select">
            <span>{w.fields[f]}</span>
            <input
              className={`live-problem-input${f === "k" || f === "lo" || f === "hi" || f === "cap" ? " short" : ""}`}
              key={`${state.data}:${i}:${state.inputs[i] ?? ""}`}
              defaultValue={state.inputs[i] ?? ""}
              aria-label={w.fields[f]}
              spellCheck={false}
              onBlur={(e) => e.target.value !== (state.inputs[i] ?? "") && setInput(i, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
        ))}
      </div>
      <div className="live-bar live-solver-slots">
        {def.slots.map((sl) => (
          <label key={sl.id} className="live-select">
            <span>{w.slots[sl.id]}</span>
            {sl.kind === "select" ? (
              <select value={state.slots[sl.id] ?? sl.default} aria-label={w.slots[sl.id]} onChange={(e) => setSlot(sl.id, e.target.value)}>
                {sl.options.map((o) => (
                  <option key={o} value={o}>{w.options[o]}</option>
                ))}
              </select>
            ) : (
              <input
                className={`live-solver-slot${faulty(sl) ? " invalid" : ""}${sl.kind === "text" ? " short" : ""}`}
                key={`${state.pattern}:${sl.id}:${state.slots[sl.id] ?? ""}`}
                defaultValue={state.slots[sl.id] ?? sl.default}
                aria-label={w.slots[sl.id]}
                spellCheck={false}
                onFocus={() => setFocus(sl)}
                onBlur={(e) => {
                  setFocus(null);
                  if (e.target.value !== (state.slots[sl.id] ?? sl.default)) setSlot(sl.id, e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            )}
          </label>
        ))}
      </div>
      {focus && focus.kind !== "select" && focus.scope.length > 0 && <p className="live-hint live-solver-scope">{fill(w.scope, { list: focus.scope.join(", ") })}</p>}
      <div className="live-problem-stage">
        <svg ref={svgRef} width={SW} height={height} viewBox={`0 0 ${SW} ${height}`} fontFamily={FONT}>
          <Markers />
          <rect width={SW} height={height} fill="#fff" />
          {drawn}
        </svg>
      </div>
      <StepBar s={s} w={w} frames={frames} />
      <StepSaid s={s} w={w} error={error} setStep={setStep} />
      <p className="live-hint">{w.hint}</p>
    </>
  );
}
