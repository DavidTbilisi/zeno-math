// "Where it breaks" (issue #577): a worked answer to judge. Is it right? If not, tap the line where it goes wrong,
// then pick what went wrong from three named mistakes. Every part is a button (tapped, or Tab and Enter), never typed,
// so a seven-year-old and an adult answer it the same way. Once judged, the line that goes wrong is marked and the
// mistake is named, in the checker's own words for it (src/math/whereItBreaks.ts).
import { useMemo, useState } from "react";
import { fill } from "../math/text";
import { latexToSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { breakWhy, judgedRight, type Break, type BreakAnswer, type BreakId } from "../math/whereItBreaks";
import type { PracticeWords } from "../math/practice";
import { SpokenMath } from "./SpokenMath";

type Props = {
  b: Break;
  w: PracticeWords;
  /** The working is judged: what the student said, and whether it was right. */
  onDone: (answer: BreakAnswer, right: boolean) => void;
};

const mathSrc = (tex: string) => {
  try {
    return svgToDataUrl(latexToSvg(tex).svg);
  } catch {
    return null;
  }
};

export function WhereItBreaks({ b, w, onDone }: Props) {
  const words = w.breaks;
  const [said, setSaid] = useState<"right" | "wrong" | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [answer, setAnswer] = useState<BreakAnswer | null>(null);
  const lines = useMemo(() => b.worked.lines.map(mathSrc), [b]);
  const finish = (a: BreakAnswer) => {
    setAnswer(a);
    onDone(a, judgedRight(b, a));
  };
  // Once "wrong" is said, the lines are buttons until the mistake is picked, so a line tapped can be changed.
  const choosing = said === "wrong" && !answer;
  const right = answer && judgedRight(b, answer);
  const wrongAt = b.worked.wrong;
  const lineClass = (i: number) =>
    ["breaks-line", answer && wrongAt === i ? "wrong" : "", step === i ? "tapped" : ""].filter(Boolean).join(" ");
  const why = answer ? breakWhy(b, w) : null;

  return (
    <section className="practice-breaks" aria-label={words.label}>
      <p className="practice-steps-intro">{words.ask}</p>
      <ol className="breaks-lines">
        {b.worked.lines.map((tex, i) => {
          const label = fill(words.line, { n: i + 1 });
          const body = (
            <>
              <span className="breaks-n" aria-hidden="true">{i + 1}</span>
              {lines[i] ? <img src={lines[i]!} alt="" /> : <code>{tex}</code>}
              <SpokenMath tex={tex} />
            </>
          );
          return (
            <li key={i}>
              {choosing ? (
                <button className={`${lineClass(i)} tap`} aria-label={label} aria-pressed={step === i} onClick={() => setStep(i)}>{body}</button>
              ) : (
                <div className={lineClass(i)}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      {said === null && (
        <div className="field-row breaks-choices" role="group" aria-label={words.ask}>
          <button className="btn" onClick={() => (setSaid("right"), finish({ variant: b.variant, said: "right" }))}>✓ {words.right}</button>
          <button className="btn" onClick={() => setSaid("wrong")}>✗ {words.wrong}</button>
        </div>
      )}
      {choosing && step === null && <p className="hint" role="status">{words.tapLine}</p>}
      {said === "wrong" && step !== null && !answer && (
        <fieldset className="practice-hard breaks-pick">
          <legend>{words.pick}</legend>
          {b.options.map((id: BreakId) => (
            <button key={id} className="btn breaks-option" onClick={() => finish({ variant: b.variant, said: "wrong", step, picked: id })}>
              {words.names[id]}
            </button>
          ))}
        </fieldset>
      )}
      {answer && (
        <div className={`practice-verdict ${right ? "ok" : "bad"}`} role="status">
          {right ? `✓ ${b.worked.mistake ? words.found : w.ui.correct}` : `✗ ${words.missed}`}
          <div className="practice-hint">
            {wrongAt === null ? words.wasRight : `${fill(words.wentWrong, { n: wrongAt + 1 })} ${words.names[b.worked.mistake!]}.`}
          </div>
          {why && <div className="practice-hint">{why}</div>}
        </div>
      )}
    </section>
  );
}
