# Thesis outline

A chapter plan for a bachelor's thesis that uses Zeno's learner-modelling code for one measurable experiment. For each
chapter it gives what to argue, where the work is in the code, and the evidence that backs it. Citation keys are in
[references.bib](references.bib).

**Scope.** The thesis no longer evaluates an adaptive learning platform. It asks one question that public data and
simulation can answer without a classroom: does Bayesian Knowledge Tracing decide when a skill is mastered better than
a simple rule? Zeno stays in the thesis as the context that motivates the question (its adaptive policy needs a
mastery decision) and as the code base the experiment runs in. It is not a contribution to be evaluated. The adaptive
vs fixed class study, its power analysis, the dry run, the checker agreement study and the usability study move to
future work or an appendix.

**Status of the chapter drafts.** The drafts `01-introduction.md` to `07-conclusion.md` were written for the wider
scope and do not yet follow this outline. Most of 5.2 (models, metrics, held-out evaluation, ASSISTments import) carries
over; the rest needs rewriting or moving.

**Working title:** *When is a skill mastered? Bayesian Knowledge Tracing against a simple mastery rule on real and
simulated students' answers.*

**Research question:** does Bayesian Knowledge Tracing (BKT) estimate a student's mastery of a skill more accurately
than a simpler method, the exponential moving average of their answers (EMA), of which the "N right in a row" rule is
a special case?

**Methods compared.**

| Method | Parameters | Gives a probability? | Declares mastery when |
|---|---|---|---|
| BKT [@corbett1994] | init, learn, guess, slip per skill, fitted on training students | yes | P(known) ≥ θ (0.95 is the usual choice) |
| EMA | one decay rate α, tuned on training students | yes (the average itself) | average ≥ θ |
| Streak rule | N | no | the last N answers were right (N = 3 is the rule the ASSISTments skill builder used) |

The streak rule is the method most systems deploy; EMA is its probabilistic generalisation, needed so the
prediction metrics can be computed for the simple side too. The Elo model and PFA already in `src/model/evaluate.ts`
appear as reference rows in the prediction table, not as hypotheses.

## Hypotheses

Stated before the results are computed, with the test for each:

- **H1, prediction.** On held-out ASSISTments students, BKT predicts the next first-attempt answer better than EMA:
  lower log-loss. Test: the per-student difference in log-loss, a paired bootstrap over students (10,000
  resamples), 95 % interval excluding zero. Secondary: RMSE, AUC, calibration.
- **H2, mastery decisions where the truth is known.** On simulated learners whose true state is recorded, at equal
  practice cost (mean opportunities until mastery is declared), BKT's declarations are right more often (the skill
  is truly known when declared) than EMA's and the streak rule's. Reported as a trade-off curve over thresholds, in
  every simulated world, not only the one built like BKT.
- **H3, mastery decisions on real data (exploratory).** How often BKT and the streak rule agree on ASSISTments, and
  the share right on the next answers after each method declares mastery. Exploratory because the data were
  collected under a streak policy (see threats).

## 1. Introduction

- **The problem.** Mastery learning [@bloom1984] needs a decision: has this student learnt this skill? Every
  adaptive practice system makes it, including Zeno's (`MASTERED_AT` in `src/model/policy.ts`). Deployed systems
  mostly use simple rules (N right in a row, [@khanmastery]); the research literature mostly uses BKT. Whether the
  extra machinery pays off is an empirical question with a measurable answer.
- **Aim and research question**, as above. Why it is narrower than "does adaptive practice help": it needs no
  classroom, no ethics approval and no school timetable, and every number comes from public data or simulation.
- **Contributions:**
  - a pre-specified comparison of BKT with EMA and the streak rule on a public data set (H1, H3);
  - a simulation with known truth that measures mastery decisions directly, in worlds that do and do not match
    BKT's assumptions (H2);
  - open, deterministic code for both, with every number reproducible from Appendix D.

## 2. Background

- **Mastery learning** [@bloom1984], and how mastery is decided in practice: Cognitive Tutors at P(known) ≥ 0.95
  [@corbett1994], ASSISTments skill builders at three right in a row [@feng2009assistments], Khan Academy
  [@khanmastery].
- **BKT** [@corbett1994]: the four parameters, the update, fitting (brute-force grid as here, or EM
  [@yudelson2013]), identifiability and degenerate fits [CITATION NEEDED: Beck & Chang 2007, "Identifiability: a
  fundamental problem of student modeling"], and extensions it leaves out (forgetting, individualisation
  [@yudelson2013], [@khajah2016]).
- **Simple estimators:** running proportions, moving averages, streaks. The closest earlier work compares mastery
  criteria directly [CITATION NEEDED: Pelánek & Řihák 2017, "Experimental analysis of mastery learning criteria",
  UMAP] and studies BKT mastery thresholds by simulation [CITATION NEEDED: Fancsali, Nixon & Ritter 2013, EDM].
  Verify both before citing.
- **Judging student models:** log-loss, RMSE, AUC and calibration [@pelanek2015metrics; @fawcett2006; @brier1950];
  why log-loss is the primary metric; why splits must be by student.
- **Where the other models sit:** Elo-based [@pelanek2016elo; @klinkenberg2011], PFA [@pavlik2009pfa], deep knowledge
  tracing [@piech2015dkt]. One paragraph each; they are context, not compared.

## 3. Method

### 3.1 Data

- **ASSISTments 2009–2010 skill builder** [@assistments2010data], cleaned by `npm run import-assistments`
  (`src/model/datasets.ts`): main problems only, first attempts, ordered by `order_id`, a multi-skill problem
  counted once per skill. Report students, answers and skills kept. Sequences are per student and skill.
- **Simulated learners** (`src/model/simulate.ts`), with the true state of each learner recorded after every
  answer:
  - the **bkt** world, where BKT is the true model (its home ground, so a BKT win there is expected);
  - the **elo** and **irt2pl** worlds, where ability grows gradually and "mastered" means a true chance of a right
    answer of at least 0.9 at level 2 (fixed in advance);
  - a **bkt with forgetting** variant [TODO: to add], which breaks BKT's no-forgetting assumption.

### 3.2 Models and fitting

- BKT per skill by the grid search in `fitBkt`, with guess and slip under 0.3; a pooled fit for skills unseen in
  training (`BktModel`).
- EMA: one α for all skills, chosen by log-loss on the training students from a grid [TODO: to add as `EmaModel`].
- Streak rule: N from 2 to 6.
- Every parameter and threshold is chosen on the training students only.

### 3.3 Evaluation

- **Prediction (H1):** the held-out replay of `evaluateHeldOut`: 20 % of students held out by `splitByStudent`, each
  answer predicted before it is learnt from. Log-loss, RMSE, AUC, accuracy, calibration bins (`src/model/evaluate.ts`).
  Add a paired bootstrap over students for the BKT − EMA difference [TODO: to add]. Repeat over five split seeds to
  show the result does not hang on one split. As a robustness check, not a second test, resample whole classes
  instead of students where the data identify classes [TODO: check which class or teacher columns the file has].
- **Mastery decisions (H2):** for each learner and skill, the opportunity at which each method first declares
  mastery. Measures: the share of declarations that are true (the learner knows the skill then), the share of truly
  learnt skills never declared, and the mean opportunities to declaration. Sweep each method's threshold
  (BKT θ from 0.80 to 0.99, EMA θ likewise, streak N from 2 to 6) and draw cost against accuracy: the method whose
  curve lies above the other's is better at every cost [TODO: to add as a mastery module and a script].
- **Mastery on real data (H3):** agreement between methods; the share right on the next one to three answers on the
  skill after each declaration, where such answers exist.

### 3.4 Where this sits in Zeno

One short section: the learner model, the policy's mastery threshold and why the result matters for it. Point to
[docs/architecture.md](../architecture.md) and Appendix B for the rest of the system.

## 4. Results

- **4.1 Data kept** by the importer, and the simulated settings.
- **4.2 Prediction** (H1): the table for BKT, EMA and the reference rows (Elo, PFA, counting baselines); the
  bootstrap interval for BKT − EMA; the calibration plot; the result across split seeds; the fitted BKT parameters
  (how many skills hit the grid's edges or the 0.3 bound).
- **4.3 Mastery decisions with known truth** (H2): one trade-off plot per world; the table at the usual settings
  (BKT 0.95, streak 3, EMA at the threshold of equal cost).
- **4.4 Mastery decisions on ASSISTments** (H3): agreement; accuracy after declaration; how many sequences end
  before any method can declare.

## 5. Discussion

- What the evidence shows for each hypothesis, and whether BKT's advantage (if any) survives outside the bkt world.
- What a system like Zeno should use to decide mastery, and at which threshold.

### Threats to validity

- **The data were collected under a streak policy.** ASSISTments skill builders end when a student gets three right
  in a row, so sequences stop at the streak rule's own decision: the real data cannot show the streak rule declaring
  too early, and post-mastery answers are scarce. This is why H3 is exploratory and the known-truth comparison is
  simulated.
- **Home advantage.** The bkt world is built on BKT's assumptions; only the other worlds test it fairly.
- **What "mastered" means** in the gradual worlds is a threshold chosen in advance (0.9), and results may depend on
  it: report a second value as a check.
- **Fitting.** Grid-search BKT is coarse; a skill whose best fit sits on the grid's edge is reported. EMA has one
  parameter and BKT four per skill, so BKT has more room to overfit the training students.
- **Data.** ASSISTments skill tags are coarse and multi-skill problems are duplicated; US middle-school students
  are not Zeno's students.
- **Multiple comparisons.** H1 is the one confirmatory test; everything else is reported as estimates with
  intervals.
- **Students are not independent.** The bootstrap resamples students as if each were an independent draw, but
  students in one class share a teacher and lessons, so their answers are related and the interval comes out
  narrower than it should. The class-level resampling in 3.3 shows how much this matters; if the file has no class
  identifiers, say so and treat the interval as optimistic.

## 6. Conclusion and future work

- Answers to H1–H3, and the recommendation for Zeno's mastery decision.
- **Future work:** BKT with forgetting or individual parameters; Zeno's own class data as a replication (the export
  already gives the sequences, `observationsFromCsv`); the adaptive vs fixed class study, with the design and power
  analysis already worked out (`docs/study.md`, `docs/results/power*.csv`).

## Appendices

- A. The Zeno system in brief, and its API: [docs/architecture.md](../architecture.md), [docs/api.md](../api.md).
- B. The answer checker's agreement with teacher marking (`npm run checker-agreement`), if kept.
- D. Reproducing every number (below).

## Reproducing every number

Each command is deterministic for a given commit (seeds are fixed). Record the commit hash
(`git rev-parse HEAD`) with every table.

| Result | Command | Status |
|---|---|---|
| ASSISTments import | `npm run import-assistments -- skill_builder_data.csv` | exists; needs the data file |
| Prediction on ASSISTments | `npm run model -- --observations assistments.json --fit --calibration bins.csv` | exists; EMA row and bootstrap to add |
| Prediction on simulated learners | `npm run model -- --simulate --fit` | exists |
| Mastery trade-off, simulated | to be written | to add |
| Mastery agreement on ASSISTments | to be written | to add |
| Test suite | `npm test` | exists |
| Figures | `npm run build`, then `npm run figures` | exists; new plots to add |
