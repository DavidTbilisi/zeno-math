// The interview problems on the board: pick a category and one of its problems, type its inputs, and step through
// the solution, play it, or (with "Your turn", where a problem asks) say what happens before each move. The frames
// come from math/problems and are drawn by the same scenes as the algorithm patterns.
import { useMemo } from "react";
import type { LiveProblems } from "../math/live";
import type { Trace } from "../math/patternSteps";
import { CATEGORIES, isProblemId, SYSTEM_CATEGORIES, problemInfo, problemsIn, problemTrace, problemWords, type Category, type ProblemId } from "../math/problems/index";
import { depth } from "../math/problems/core";
import { archScene, cellsScene, graphScene, gridScene, listScene, Markers, matScene, rowsScene, spansScene, SW, treeScene, type Scene } from "./scenes";
import { stackScenes, StepBar, StepSaid, useStepper } from "./stepper";
import { FONT, Toggle, type PieceProps } from "./ui";

export function Problems({ state, set, w: words, svgRef }: PieceProps<"problems">) {
  const w = words.problems;
  const { quiz } = state;
  // A board saved with a problem that is gone opens the first one; inputs not typed yet are the example's.
  const id = isProblemId(state.id) ? state.id : "twoNumberSum";
  const info = problemInfo(id);
  const typed = useMemo(() => info.example.map((x, i) => state.inputs[i] ?? x), [info, state.inputs]);
  const pw = problemWords(id, w);
  const result = useMemo((): { trace: Trace } | { error: string } => {
    try {
      return { trace: problemTrace(id, typed, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [id, typed, w]);
  const frames = "trace" in result ? result.trace.frames : [];
  const asks = frames.some((f) => f.ask);
  const patch = (p: Partial<LiveProblems>) => set({ ...state, ...p });
  const s = useStepper(frames, state.step, quiz, (k) => patch({ step: k }));
  const { frame } = s;
  /** New inputs (or a new problem) start again from the beginning. */
  const restart = (p: Partial<LiveProblems>) => {
    s.stop();
    patch({ ...p, step: 0 });
  };
  const pick = (next: ProblemId) => restart({ id: next, inputs: [...problemInfo(next).example] });

  // ——— The picture ———

  const scenes: Scene[] = [];
  if (frame && "trace" in result) {
    const nodes = frame.tree?.nodes ?? result.trace.tree;
    if (frame.cells) scenes.push(cellsScene(frames, frame, null));
    if (frame.list) scenes.push(listScene(frames, frame, null));
    if (frame.tree && nodes?.length) {
      const levels = Math.max(...frames.map((f) => depth(f.tree?.nodes ?? result.trace.tree ?? [])));
      scenes.push(treeScene(nodes, frame, false, null, null, "", levels));
    }
    if (frame.grid) scenes.push(gridScene(frame, null, null));
    if (frame.mat) scenes.push(matScene(frames, frame));
    if (frame.graph) scenes.push(graphScene(frames, frame));
    if (frame.arch) scenes.push(archScene(frames, frame));
    if (frame.spans) scenes.push(spansScene(frames, frame));
    if (frames.some((f) => f.rows?.length)) scenes.push(rowsScene(frames, frame));
  }
  const { height, drawn } = stackScenes(scenes);

  return (
    <>
      <div className="live-bar">
        <select
          value={info.cat}
          aria-label={w.category}
          onChange={(e) => {
            const first = problemsIn(e.target.value as Category)[0];
            if (first) pick(first);
          }}
        >
          {([["coding", CATEGORIES.filter((c) => !SYSTEM_CATEGORIES.includes(c))], ["systems", SYSTEM_CATEGORIES]] as const).map(([group, cats]) => (
            <optgroup key={group} label={w.groups[group]}>
              {cats.map((c) => (
                <option key={c} value={c} disabled={!problemsIn(c).length}>{w.cats[c]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={id} aria-label={w.problem} onChange={(e) => pick(e.target.value as ProblemId)}>
          {problemsIn(info.cat).map((p) => (
            <option key={p} value={p}>{problemInfo(p).level ? `${problemWords(p, w).name} · ${w.levels[problemInfo(p).level - 1]}` : problemWords(p, w).name}</option>
          ))}
        </select>
        <button className="live-btn" onClick={() => restart({ inputs: [...info.example] })}>{w.example}</button>
        {asks && (
          <Toggle
            on={quiz}
            title={w.quizTip}
            onClick={() => {
              s.setSaid(null);
              patch({ quiz: !quiz });
            }}
          >🙋 {w.quiz}</Toggle>
        )}
      </div>
      <p className="live-hint live-pattern-idea">{pw.idea}</p>
      <div className="live-bar live-problem-inputs">
        {pw.labels.map((label, i) => (
          <label key={i} className="live-select">
            <span>{label}</span>
            <input
              className={`live-problem-input${"error" in result ? " invalid" : ""}`}
              key={`${id}:${i}:${typed[i]}`}
              defaultValue={typed[i] ?? ""}
              aria-label={label}
              spellCheck={false}
              onBlur={(e) => e.target.value !== typed[i] && restart({ inputs: typed.map((v, j) => (j === i ? e.target.value : v)) })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
        ))}
      </div>
      <div className="live-problem-stage">
        <svg ref={svgRef} width={SW} height={height} viewBox={`0 0 ${SW} ${height}`} fontFamily={FONT}>
          <Markers />
          <rect width={SW} height={height} fill="#fff" />
          {drawn}
        </svg>
      </div>
      <StepBar s={s} w={w} frames={frames} />
      <StepSaid s={s} w={w} error={"error" in result ? result.error : null} setStep={(k) => patch({ step: k })} />
      <p className="live-hint">{w.hint}</p>
    </>
  );
}

