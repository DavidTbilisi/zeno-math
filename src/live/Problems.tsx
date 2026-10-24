// The interview problems on the board: pick a category and one of its problems, type its inputs, and step through
// the solution, play it, or (with "Your turn", where a problem asks) say what happens before each move. The frames
// come from math/problems and are drawn by the same scenes as the algorithm patterns.
import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveProblems } from "../math/live";
import type { Frame, Trace } from "../math/patternSteps";
import { CATEGORIES, isProblemId, problemInfo, problemsIn, problemTrace, problemWords, type Category, type ProblemId } from "../math/problems/index";
import { depth } from "../math/problems/core";
import { cellsScene, graphScene, gridScene, listScene, Markers, matScene, rowsScene, spansScene, SW, treeScene, type Scene } from "./scenes";
import { fill, FONT, Toggle, type PieceProps } from "./ui";

const PLAY_MS = 1100;

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
  const last = Math.max(0, frames.length - 1);
  const k = Math.min(Math.max(0, state.step), last);
  const frame: Frame | undefined = frames[k];
  const asks = frames.some((f) => f.ask);
  const asking = quiz && !!frame?.ask && k < last;

  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState<{ right: boolean; why?: string } | null>(null);
  // The latest state and setter for the play timer, which the board's re-renders mustn't restart.
  const latest = useRef({ state, set });
  latest.current = { state, set };

  const patch = (p: Partial<LiveProblems>) => set({ ...state, ...p });
  const go = (step: number) => {
    setSaid(null);
    patch({ step: Math.max(0, Math.min(last, step)) });
  };
  /** New inputs (or a new problem) start again from the beginning. */
  const restart = (p: Partial<LiveProblems>) => {
    setPlaying(false);
    setSaid(null);
    patch({ ...p, step: 0 });
  };
  const pick = (next: ProblemId) => restart({ id: next, inputs: [...problemInfo(next).example] });

  useEffect(() => {
    if (!playing) return;
    if (k >= last || asking) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => latest.current.set({ ...latest.current.state, step: k + 1 }), PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, k, last, asking]);

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
    if (frame.spans) scenes.push(spansScene(frames, frame));
    if (frames.some((f) => f.rows?.length)) scenes.push(rowsScene(frames, frame));
  }
  const GAP = 14;
  let height = 4;
  const drawn = scenes.map((s, i) => {
    const el = <g key={i}>{s.draw(height)}</g>;
    height += s.h + GAP;
    return el;
  });
  height = Math.max(120, height - GAP + 4);

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
          {CATEGORIES.map((c) => (
            <option key={c} value={c} disabled={!problemsIn(c).length}>{w.cats[c]}</option>
          ))}
        </select>
        <select value={id} aria-label={w.problem} onChange={(e) => pick(e.target.value as ProblemId)}>
          {problemsIn(info.cat).map((p) => (
            <option key={p} value={p}>{`${problemWords(p, w).name} · ${w.levels[problemInfo(p).level - 1]}`}</option>
          ))}
        </select>
        <button className="live-btn" onClick={() => restart({ inputs: [...info.example] })}>{w.example}</button>
        {asks && (
          <Toggle
            on={quiz}
            title={w.quizTip}
            onClick={() => {
              setSaid(null);
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
      <div className="live-pattern-stage">
        <svg ref={svgRef} width={SW} height={height} viewBox={`0 0 ${SW} ${height}`} fontFamily={FONT}>
          <Markers />
          <rect width={SW} height={height} fill="#fff" />
          {drawn}
        </svg>
      </div>
      <div className="live-bar">
        <button className="live-btn" disabled={k === 0} title={w.first} aria-label={w.first} onClick={() => go(0)}>⏮</button>
        <button className="live-btn" disabled={k === 0} title={w.prev} aria-label={w.prev} onClick={() => go(k - 1)}>◀</button>
        <button
          className="live-btn primary"
          disabled={!frames.length || asking}
          title={playing ? w.pause : w.play}
          aria-label={playing ? w.pause : w.play}
          onClick={() => {
            if (playing) return setPlaying(false);
            if (k >= last) go(0);
            setPlaying(true);
          }}
        >
          {playing ? "⏸" : "⏵"} {playing ? w.pause : w.play}
        </button>
        <button className="live-btn" disabled={k >= last || asking} title={w.next} aria-label={w.next} onClick={() => go(k + 1)}>▶</button>
        <button className="live-btn" disabled={k >= last} title={w.last} aria-label={w.last} onClick={() => go(last)}>⏭</button>
        {frames.length > 0 && <span className="live-note">{fill(w.step, { k, n: last })}</span>}
      </div>
      {"error" in result ? (
        <p className="live-said">{result.error}</p>
      ) : (
        frame && (
          <div className="live-pattern-said">
            <p className={`live-said ${k === last ? "ok" : "info"}`}>{frame.note}</p>
            {asking ? (
              <div className="live-bar">
                <span className="live-pattern-q">{frame.ask!.q}</span>
                {frame.ask!.options.map((o, i) => (
                  <button
                    key={i}
                    className="live-btn"
                    onClick={() => {
                      if (i !== frame.ask!.answer) return setSaid({ right: false });
                      patch({ step: k + 1 });
                      setSaid({ right: true, why: frame.then });
                    }}
                  >
                    {o}
                  </button>
                ))}
                {said && !said.right && <span className="live-said">{w.wrong}</span>}
              </div>
            ) : (
              frame.then && k < last && <p className="live-said info live-pattern-then">→ {frame.then}</p>
            )}
            {said?.right && <p className="live-said ok">{w.right} {said.why}</p>}
          </div>
        )
      )}
      <p className="live-hint">{w.hint}</p>
    </>
  );
}

