// A question worked in steps (stepsOf in practice.ts): one step at a time, each checked as a question of its own, two
// tries and then its answer is shown, so a wrong step points at the idea it needs. The steps done stay on screen as
// worked lines. After a wrong answer on fractions the student works every step, then answers the whole question again;
// a faded worked example (src/model/fading.ts) starts with the first steps done, and a worked example has them all.
import { useMemo, useRef, useState } from "react";
import { fill } from "../math/text";
import { latexToSvg } from "../math/latex";
import { check, type Exercise, type PracticeWords, type Verdict } from "../math/practice";
import { svgToDataUrl } from "../math/svg";
import { SpokenMath } from "./SpokenMath";

type Props = {
  steps: readonly Exercise[];
  w: PracticeWords;
  /** How many of the first steps are shown done (all of them: a worked example to read). */
  given?: number;
  /** What the list is, said above it. */
  intro?: string;
  /** The region's name (the intro when not given). */
  label?: string;
  /** Every answer to step i, with the checker's verdict. */
  onAnswer: (i: number, input: string, v: Verdict) => void;
  /** Step i's answer shown before it was answered right. */
  onShow: (i: number) => void;
  /** The last step is done: answered right, or its answer shown. */
  onDone?: (right: boolean) => void;
};

const mathSrc = (tex: string, colour?: string) => {
  try {
    return svgToDataUrl(latexToSvg(tex, colour).svg);
  } catch {
    return null;
  }
};

export function WorkInSteps({ steps, w, given = 0, intro = w.ui.inSteps, label, onAnswer, onShow, onDone }: Props) {
  const [at, setAt] = useState(given);
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [wrongs, setWrongs] = useState(0);
  /** How each step done ended: answered right, or its answer shown (with what the checker said of the last try). */
  const [ends, setEnds] = useState<{ right: boolean; hint?: string; given?: true }[]>(() => Array.from({ length: given }, () => ({ right: true, given: true })));
  const inputRef = useRef<HTMLInputElement>(null);
  const pictures = useMemo(() => steps.map((s) => ({ q: mathSrc(s.q), answer: mathSrc(s.show, "#2f9e44") })), [steps]);

  const advance = (right: boolean, hint?: string) => {
    setEnds((e) => [...e, { right, hint }]);
    setInput("");
    setWrongs(0);
    setVerdict(null);
    if (at + 1 >= steps.length) onDone?.(right);
    else {
      setAt(at + 1);
      inputRef.current?.focus();
    }
  };
  const onCheck = () => {
    const v = check(steps[at], input, w);
    onAnswer(at, input, v);
    setVerdict(v);
    if (v.ok) return advance(true);
    if (v.why) return;
    if (wrongs + 1 >= 2) {
      onShow(at);
      return advance(false, v.hint);
    }
    setWrongs(wrongs + 1);
  };
  const show = () => {
    onShow(at);
    advance(false);
  };

  return (
    <section className="practice-steps" aria-label={label ?? intro}>
      <p className="practice-steps-intro">{intro}</p>
      <ol>
        {steps.slice(0, ends.length < steps.length ? at + 1 : steps.length).map((s, i) => {
          const finished = i < ends.length;
          return (
            <li key={i} className={finished ? (ends[i].given ? "given" : ends[i].right ? "right" : "shown") : "current"}>
              <small className="hint">{fill(w.ui.stepOf, { i: i + 1, n: steps.length })}{finished && ends[i].given && ` · ${w.ui.given}`}</small>
              <span className="practice-step-prompt">{s.prompt}</span>
              <span className="practice-step-math">
                {pictures[i].q && <img src={pictures[i].q!} alt="" />}
                {finished && pictures[i].answer && (
                  <>
                    <span aria-hidden="true">→</span>
                    <img src={pictures[i].answer!} alt="" />
                  </>
                )}
              </span>
              <SpokenMath text={s.prompt} tex={finished ? `${s.q} \\to ${s.show}` : s.q} />
              {finished && ends[i].hint && <small className="practice-hint">{ends[i].hint}</small>}
              {!finished && (
                <>
                  <div className="field-row">
                    <input
                      ref={inputRef}
                      autoFocus
                      className="mono practice-input"
                      aria-label={fill(w.ui.stepOf, { i: i + 1, n: steps.length })}
                      spellCheck={false}
                      autoComplete="off"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        setVerdict(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        onCheck();
                      }}
                    />
                    <button className="btn primary" onClick={onCheck}>{w.ui.check}</button>
                    <button className="btn" onClick={show}>{w.ui.showStep}</button>
                  </div>
                  {verdict && !verdict.ok && (
                    <div className={`practice-verdict ${verdict.close || verdict.why ? "close" : "bad"}`} role="status">
                      {verdict.why ?? `✗ ${w.ui.wrong}`}
                      {verdict.hint && <div className="practice-hint">{verdict.hint}</div>}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
      {ends.length === steps.length && given === 0 && <p className="practice-verdict ok" role="status">{w.ui.stepsDone}</p>}
    </section>
  );
}
