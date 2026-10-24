// The interview problems on the board: pick a category and one of its problems, type its inputs, and step through
// the solution, play it, or (with "Your turn") say what happens before each move. "Solve it" hides the key idea and
// works a coding question out on a ladder instead: the example by hand, the technique, the brute force's cost, a plan
// of one's own, the trace with a question before each step, and the solution's cost. The frames come from
// math/problems and are drawn by the same scenes as the algorithm patterns.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LiveProblems } from "../math/live";
import type { Frame, Trace } from "../math/patternSteps";
import { CATEGORIES, isProblemId, PROBLEM_IDS, SYSTEM_CATEGORIES, problemInfo, problemsIn, problemTrace, problemWords, type Category, type ProblemId } from "../math/problems/index";
import { depth } from "../math/problems/core";
import { costQuestion, DONE, isCoding, rungsOf, solveInfo, techniqueQuestion, withAsks, type Technique } from "../math/problems/solve";
import { archScene, cellsScene, graphScene, gridScene, listScene, Markers, matScene, rowsScene, spansScene, SW, treeScene, type Scene } from "./scenes";
import { fill, FONT, Toggle, type PieceProps } from "./ui";

const PLAY_MS = 1100;
/** The ladder's rungs that the piece treats apart: the plan, the trace, the cost (math/problems/solve RUNGS). */
const PLAN = 3;
const TRACE = 4;
const COST = 5;

/** What has been opened and answered on the ladder, per problem: for each question, whether its first try was right. */
type Marks = { id: ProblemId; shown: Record<string, boolean>; first: Record<string, boolean>; solved: Record<string, boolean> };
const fresh = (id: ProblemId): Marks => ({ id, shown: {}, first: {}, solved: {} });

export function Problems({ state, set, w: words, svgRef }: PieceProps<"problems">) {
  const w = words.problems;
  const s = w.solve;
  const { quiz } = state;
  // A board saved with a problem that is gone opens the first one; inputs not typed yet are the example's.
  const id = isProblemId(state.id) ? state.id : "twoNumberSum";
  const info = problemInfo(id);
  const typed = useMemo(() => info.example.map((x, i) => state.inputs[i] ?? x), [info, state.inputs]);
  const pw = problemWords(id, w);
  // Every step gets a "what happens next?" question, from the kinds of step its trace takes.
  const result = useMemo((): { trace: Trace } | { error: string } => {
    try {
      const trace = problemTrace(id, typed, w);
      return { trace: { ...trace, frames: withAsks(trace.frames, s.whatNext) } };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [id, typed, w, s.whatNext]);
  const frames = "trace" in result ? result.trace.frames : [];
  const last = Math.max(0, frames.length - 1);

  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState<{ right: boolean; why?: string } | null>(null);
  const [reply, setReply] = useState<{ text: string; right: boolean } | null>(null);
  const [marksOf, setMarks] = useState<Marks>(() => fresh(id));
  const marks = marksOf.id === id ? marksOf : fresh(id);
  // The latest state and setter for the play timer, which the board's re-renders mustn't restart.
  const latest = useRef({ state, set });
  latest.current = { state, set };

  const patch = (p: Partial<LiveProblems>) => set({ ...state, ...p });
  const hush = () => {
    setPlaying(false);
    setSaid(null);
    setReply(null);
  };
  /** New inputs (or a new problem) start again from the beginning. */
  const restart = (p: Partial<LiveProblems>) => {
    hush();
    patch({ ...p, step: 0 });
  };
  const pick = (next: ProblemId) => restart({ id: next, inputs: [...problemInfo(next).example], rung: 0 });

  // ——— The ladder ———

  const coding = isCoding(id);
  const solving = !!state.solve && coding;
  const rungs = coding ? rungsOf(id) : [];
  const rung = !solving ? -1 : state.rung === DONE || rungs.includes(state.rung ?? -1) ? state.rung! : rungs[0];
  const toRung = (r: number) => {
    hush();
    patch({ rung: r, step: 0 });
  };
  const nextRung = () => toRung(rungs.find((r) => r > rung) ?? DONE);
  const mark = (key: string, right: boolean) =>
    setMarks({ ...marks, first: { [key]: right, ...marks.first }, solved: right ? { ...marks.solved, [key]: true } : marks.solved });
  const open = (key: string) => setMarks({ ...marks, shown: { ...marks.shown, [key]: true } });

  // Before the trace the picture is the example as given; after it, as the solution leaves it.
  const k = solving && rung < TRACE ? 0 : solving && rung > TRACE ? last : Math.min(Math.max(0, state.step), last);
  const frame: Frame | undefined = frames[k];
  const asks = frames.some((f) => f.ask);
  const asking = (solving ? rung === TRACE : quiz) && !!frame?.ask && k < last;
  const stepping = !solving || rung === TRACE;

  const go = (step: number) => {
    setSaid(null);
    patch({ step: Math.max(0, Math.min(last, step)) });
  };

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
    if (frame.arch) scenes.push(archScene(frames, frame));
    if (frame.spans) scenes.push(spansScene(frames, frame));
    if (frames.some((f) => f.rows?.length)) scenes.push(rowsScene(frames, frame));
  }
  const GAP = 14;
  let height = 4;
  const drawn = scenes.map((sc, i) => {
    const el = <g key={i}>{sc.draw(height)}</g>;
    height += sc.h + GAP;
    return el;
  });
  height = Math.max(120, height - GAP + 4);

  // ——— The ladder's panel ———

  const tech = (t: string) => s.techniques[t as Technique];
  /** One of the ladder's questions: a button per option, a word on each answer, closed once it is answered right. */
  const question = (key: string, q: string, options: readonly string[], label: (o: string) => string, right: (o: string) => boolean, answer: (o: string, right: boolean) => string, extra?: ReactNode) => (
    <div className="live-pattern-said">
      <span className="live-pattern-q">{q}</span>
      <div className="live-bar live-solve-options">
        {options.map((o) => (
          <button
            key={o}
            className="live-btn"
            disabled={!!marks.solved[key]}
            onClick={() => {
              const ok = right(o);
              mark(key, ok);
              // A right time is kept above the space question already.
              setReply(key === "time" && ok ? null : { text: answer(o, ok), right: ok });
            }}
          >
            {label(o)}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
  const nextButton = <button className="live-btn primary" onClick={nextRung}>{s.next} →</button>;

  let panel: ReactNode = null;
  if (solving && "trace" in result) {
    const sol = solveInfo(id);
    if (rung === 0) {
      panel = (
        <>
          <p className="live-said info">{s.understand}</p>
          <div className="live-bar">
            {marks.shown.answer ? <span className="live-said ok">{fill(s.answerIs, { a: result.trace.answer })}</span> : <button className="live-btn" onClick={() => open("answer")}>{s.showAnswer}</button>}
            {nextButton}
          </div>
        </>
      );
    } else if (rung === 1) {
      const tq = techniqueQuestion(id)!;
      const main = tech(sol.techniques[0]);
      panel = (
        <>
          {question(
            "technique",
            s.techniqueQ,
            tq.options,
            (o) => tech(o).name,
            (o) => tq.right.includes(o as Technique),
            (o, ok) => (ok ? fill(s.techniqueRight, { names: sol.techniques.map((t) => tech(t).name).join(", "), signal: main.signal }) : fill(s.techniqueWrong, { name: tech(o).name, signal: tech(o).signal })),
            !marks.solved.technique && !marks.shown.hint && <button className="live-btn" onClick={() => open("hint")}>💡 {s.hint}</button>,
          )}
          {marks.shown.hint && !marks.solved.technique && <p className="live-said info">{fill(s.hintIs, { signal: main.signal })}</p>}
          {marks.solved.technique && nextButton}
        </>
      );
    } else if (rung === 2) {
      const bq = costQuestion(id, "brute")!;
      panel = (
        <>
          {question("brute", s.bruteQ, bq.options, (o) => o, (o) => o === bq.right, (o, ok) => (ok ? fill(s.bruteRight, { o }) : s.costWrong))}
          {marks.solved.brute && nextButton}
        </>
      );
    } else if (rung === PLAN) {
      panel = (
        <>
          <p className="live-said info">{sol.brute ? fill(s.plan, { o: sol.brute }) : s.planPlain}</p>
          <div className="live-bar">
            {!marks.shown.idea && <button className="live-btn" onClick={() => open("idea")}>{s.showIdea}</button>}
            {nextButton}
          </div>
        </>
      );
    } else if (rung === TRACE) {
      panel =
        k === last ? (
          <div className="live-bar">
            <span className="live-said ok">{s.traceDone}</span>
            {nextButton}
          </div>
        ) : (
          <p className="live-said info">{s.trace}</p>
        );
    } else if (rung === COST) {
      const which = marks.solved.time ? "space" : "time";
      const cq = costQuestion(id, which)!;
      panel = (
        <>
          {marks.solved.time && <p className="live-said ok">{fill(s.costRight, { o: sol.time })}</p>}
          {!marks.solved.space && question(which, which === "time" ? s.timeQ : s.spaceQ, cq.options, (o) => o, (o) => o === cq.right, (o, ok) => (ok ? fill(s.costRight, { o }) : s.costWrong))}
          {marks.solved.space && nextButton}
        </>
      );
    } else {
      const firsts = Object.values(marks.first);
      const after = PROBLEM_IDS.slice(PROBLEM_IDS.indexOf(id) + 1).find(isCoding);
      panel = (
        <>
          <p className="live-said ok">{fill(s.done, { name: pw.name })}</p>
          {firsts.length > 0 && <p className="live-said info">{fill(s.score, { right: firsts.filter(Boolean).length, n: firsts.length })}</p>}
          <div className="live-bar">
            <button
              className="live-btn"
              onClick={() => {
                setMarks(fresh(id));
                toRung(rungs[0]);
              }}
            >
              ↺ {s.again}
            </button>
            {after && <button className="live-btn primary" onClick={() => pick(after)}>{s.nextProblem} →</button>}
          </div>
        </>
      );
    }
  }

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
        {coding && (
          <Toggle
            on={solving}
            title={s.toggleTip}
            onClick={() => {
              hush();
              patch({ solve: !solving, rung: rungs[0], step: 0 });
            }}
          >🧗 {s.toggle}</Toggle>
        )}
        {asks && !solving && (
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
      {solving && (
        <div className="live-bar live-solve-rungs" role="tablist">
          {rungs.map((r, i) => (
            <button key={r} role="tab" aria-selected={r === rung} className={`live-btn${r === rung ? " on" : r < rung ? " passed" : ""}`} onClick={() => toRung(r)}>
              {i + 1}. {s.rungs[r]}
            </button>
          ))}
        </div>
      )}
      {/* On the cost rung the idea is put away again, since it often says what the solution costs. */}
      {rung !== COST && <p className="live-hint live-pattern-idea">{!solving || marks.shown.idea || rung > PLAN ? pw.idea : s.hidden}</p>}
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
      {stepping && (
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
          <button className="live-btn" disabled={k >= last || (solving && asking)} title={w.last} aria-label={w.last} onClick={() => go(last)}>⏭</button>
          {frames.length > 0 && <span className="live-note">{fill(w.step, { k, n: last })}</span>}
        </div>
      )}
      {"error" in result ? (
        <p className="live-said">{result.error}</p>
      ) : (
        <>
          {panel}
          {reply && <p className={`live-said${reply.right ? " ok" : ""}`}>{reply.text}</p>}
          {frame && stepping && (
            <div className="live-pattern-said">
              <p className={`live-said ${k === last ? "ok" : "info"}`}>{frame.note}</p>
              {asking ? (
                <div className={`live-bar${solving ? " live-solve-options" : ""}`}>
                  <span className="live-pattern-q">{frame.ask!.q}</span>
                  {frame.ask!.options.map((o, i) => (
                    <button
                      key={i}
                      className="live-btn"
                      onClick={() => {
                        const right = i === frame.ask!.answer;
                        if (solving) mark(`step:${k}`, right);
                        if (!right) return setSaid({ right: false });
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
          )}
        </>
      )}
      {stepping && <p className="live-hint">{w.hint}</p>}
    </>
  );
}
