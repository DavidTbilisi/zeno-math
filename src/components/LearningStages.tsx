// A skill's learning stage (learningStage.ts, #576) as four small squares in the stages' colours, filled up to the
// stage reached: an empty corner shows before any word is read. The stage's number and name are in its label, so it
// reads without colour, and in a tooltip.
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { LEARNING_STAGES, type LearningStage } from "../model/learningStage";

/** The words for a stage: "Learning stage 2 of 4: I keep it", or not started. */
export function useStageLabel() {
  const l = useI18n().t.site.learning;
  return (stage: LearningStage) => (stage ? fill(l.stage, { n: stage, name: l.names[stage] }) : l.none);
}

export function StageSquares({ stage }: { stage: LearningStage }) {
  const label = useStageLabel()(stage);
  return (
    <span className="ls-squares" role="img" aria-label={label} title={label}>
      {LEARNING_STAGES.map((n) => <i key={n} className={`ls-sq ls-${n}${n <= stage ? " on" : ""}`} />)}
    </span>
  );
}

/** One stage's mark: its number in its colour. */
export const StageBadge = ({ stage }: { stage: 1 | 2 | 3 | 4 }) => <i className={`ls-badge ls-${stage}`} aria-hidden="true">{stage}</i>;

/** What each of the four stages means, with its colour and number. */
export function StageLegend() {
  const l = useI18n().t.site.learning;
  return (
    <ol className="ls-legend">
      {LEARNING_STAGES.map((n) => (
        <li key={n}>
          <StageBadge stage={n} />
          <span><strong>{l.kinds[n]}</strong> · {l.names[n]}. <span className="ls-how">{l.how[n]}</span></span>
        </li>
      ))}
    </ol>
  );
}
