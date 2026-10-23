// The learner model the app runs (server/research.ts, and from its state each student's browser, src/learner.ts): the
// logistic model (src/model/logistic.ts), kept up to date with a class's answers. Until a class has answered, its
// weights are those fitted on a simulated class (src/model/simulate.ts, a seed apart from the tests' and the
// evaluations'), as the Elo model's defaults were chosen. Every answer moves the student's own records at once. The
// weights are fitted again on every answer stored so far once there are FIRST_FIT of them and whenever their number
// has grown by a fifth since, each time starting from the simulated class's weights, so a few answers move them a
// little and many answers move them a lot.
import type { Level, Observation } from "./elo.ts";
import type { Predictor } from "./evaluate.ts";
import { LogisticModel, type LogisticMastery, type LogisticParams, type LogisticState } from "./logistic.ts";
import { simulateRandom } from "./simulate.ts";

/** The simulated class the starting weights are fitted on. */
export const PRIOR_SEED = 101;
export const FIRST_FIT = 200;
export const REFIT_GROWTH = 1.2;

let prior: LogisticState | undefined;
/** The weights before a class has answered: the logistic model fitted on a simulated class of Zeno's skills and levels. */
export function priorState(): LogisticState {
  if (!prior) {
    const m = new LogisticModel();
    m.fit(simulateRandom({ seed: PRIOR_SEED }).observations);
    prior = m.state([]);
  }
  return prior;
}

export class ClassModel implements Predictor {
  readonly name: string;
  private model: LogisticModel;
  private observations: Observation[] = [];
  private nextFit = FIRST_FIT;
  private readonly start: LogisticState;
  private readonly params: Partial<LogisticParams>;
  constructor({ start = priorState(), params = {}, name = "logistic, fitted as answers come" }: { start?: LogisticState; params?: Partial<LogisticParams>; name?: string } = {}) {
    // Only the weights: the records are rebuilt from the answers this model is given.
    this.start = { ...start, students: {} };
    this.params = params;
    this.name = name;
    this.model = LogisticModel.fromState(this.start, params);
  }

  /** How many answers the weights were last fitted on (0 before the first fit). */
  fittedOn = 0;
  predict(o: Observation) {
    return this.model.predict(o);
  }
  predictAt(student: string, skill: string, level: Level) {
    return this.model.predictAt(student, skill, level);
  }
  mastery(student: string, skill: string): LogisticMastery {
    return this.model.mastery(student, skill);
  }
  state(students?: readonly string[]): LogisticState {
    return this.model.state(students);
  }

  update(o: Observation) {
    this.model.update(o);
    this.observations.push(o);
    if (this.observations.length >= this.nextFit) this.refit();
  }
  /** Fits the weights again on every answer so far, from the starting weights, and rebuilds the students' records. */
  private refit() {
    const m = LogisticModel.fromState(this.start, this.params);
    m.fit(this.observations);
    for (const o of this.observations) m.track(o);
    this.model = m;
    this.fittedOn = this.observations.length;
    this.nextFit = Math.ceil(this.observations.length * REFIT_GROWTH);
  }
}
