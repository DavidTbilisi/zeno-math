// A question worked in steps after a wrong answer (stepsOf in practice.ts): one step at a time, each checked as a
// question of its own, two tries and then its answer is shown, so a wrong step points at the idea it needs. The steps
// done stay on screen as worked lines; when the last is done the student answers the whole question again.
import { useMemo, useRef, useState } from "react";
import { fill } from "../math/text";
import { latexToSvg } from "../math/latex";
import { check, type Exercise, type PracticeWords, type Verdict } from "../math/practice";
import { svgToDataUrl } from "../math/svg";
import { SpokenMath } from "./SpokenMath";

type Props = {
  steps: readonly Exercise[];
  w: PracticeWords;
  /** Every answer to step i, with the checker's verdict. */
  onAnswer: (i: number, input: string, v: Verdict) => void;
  /** Step i's answer shown before it was answered right. */
  onShow: (i: number) => void;
  onDone: () => void;
};

const mathSrc = (tex: string, colour?: string) => {
  try {
    return svgToDataUrl(latexToSvg(tex, colour).svg);
  } catch {
    return null;
  }
};

export function WorkInSteps({ steps, w, onAnswer, onShow, onDone }: Props) {
  const [at, setAt] = useState(0);
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [wrongs, setWrongs] = useState(0);
  /** How each step done ended: answered right, or its answer shown (with what the checker said of the last try). */
  const [ends, setEnds] = useState<{ right: boolean; hint?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pictures = useMemo(() => steps.map((s) => ({ q: mathSrc(s.q), answer: mathSrc(s.show, "#2f9e44") })), [steps]);

  const advance = (right: boolean, hint?: string) => {
    setEnds((e) => [...e, { right, hint }]);
    setInput("");
    setWrongs(0);
    setVerdict(null);
    if (at + 1 >= steps.length) onDone();
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
    <section className="practice-steps" aria-label={w.ui.inSteps}>
      <p className="practice-steps-intro">{w.ui.inSteps}</p>
      <ol>
        {steps.slice(0, ends.length < steps.length ? at + 1 : steps.length).map((s, i) => {
          const finished = i < ends.length;
          return (
            <li key={i} className={finished ? (ends[i].right ? "right" : "shown") : "current"}>
              <small className="hint">{fill(w.ui.stepOf, { i: i + 1, n: steps.length })}</small>
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
      {ends.length === steps.length && <p className="practice-verdict ok" role="status">{w.ui.stepsDone}</p>}
    </section>
  );
}
