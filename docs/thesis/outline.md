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

**Status of the chapter drafts.** The chapters `01-introduction.md` to `06-conclusion.md` and the appendices follow
this outline (rewritten on 2026-10-11). The drafts written for the wider scope (design, implementation and evaluation
of Zeno as a platform) are in the git history before that date. The H2 results are in; the ASSISTments results (H1,
H3 and the data counts) are marked [TODO] in the chapters until the data file has been downloaded and run.

**Working title:** *When is a skill mastered? Bayesian Knowledge Tracing against a simple mastery rule on real and
simulated students' answers.*

**Research question:** does Bayesian Knowledge Tracing (BKT) estimate a student's mastery of a skill more accurately
than a simpler method, the exponential moving average of their answers (EMA), of which the "N right in a row" rule is
a special case?

**Methods compared.**

| Method | Parameters | Gives a probability? | Declares mastery when |
|---|---|---|---|
| BKT [@corbett1994] | init, learn, guess, slip per skill, fitted on training students | yes | P(known) ≥ θ (0.95 is the usual choice) |
| EMA | one decay rate α, tuned on training students; a starting score fixed from them | yes (the average itself) | average ≥ θ |
| Streak rule | N | no | the last N answers were right (N = 3 is the rule the ASSISTments skill builder used) |

The streak rule is the method most systems deploy; EMA is its probabilistic generalisation, needed so the
prediction metrics can be computed for the simple side too. Proposition 1 below gives the exact settings under which
the streak rule is an EMA; the fitted EMA, which starts from the training students' share right, is in general not
one of them, so the streak rule stays a method of its own. The Elo model and PFA already in `src/model/evaluate.ts`
appear as reference rows in the prediction table, not as hypotheses.

## What is proved, what is tested, what is shown

The claims in this thesis are of three kinds, and the text keeps them apart. Two are proved from the definitions
(Propositions 1 and 2), and need no data. One is tested on real data (H1), the only confirmatory test. The rest are
shown on simulated learners (H2), which holds only as far as each simulated world is believed, or described on real
data (H3). What Zeno should use is a judgement drawn from all of them, not a result.

## Propositions

**Proposition 1, the streak rule is an EMA.** Let the score start at s₀ in [0, 1) and after each answer x (1 right,
0 wrong) become (1 − α)s + αx, with 0 < α < 1, and let N ≥ 2. "Mastered when the score is at least θ" says
"mastered" after exactly the same answers as "the last N answers were right", on every sequence of answers of any
length, if and only if

(1 − α)^N ≤ 1 − θ ≤ α(1 − α)^(N−1)  and  s₀ < 1 − (1 − θ) / (1 − α)^(N−1).

Proof. Follow the gap g = 1 − s. A right answer multiplies it by 1 − α; a wrong one sets it to (1 − α)g + α, which
is more than α because g stays above 0. After N right answers in a row g ≤ (1 − α)^N ≤ 1 − θ, so the score has
reached θ. After a wrong answer followed by k < N right ones, g > α(1 − α)^k ≥ α(1 − α)^(N−1) ≥ 1 − θ, so it has
not. Before any wrong answer, k < N right ones leave g = (1 − s₀)(1 − α)^k > 1 − θ by the condition on s₀. Each
condition is also needed: a long run of wrong answers brings g as close to 1 as we like, after which N right answers
need the left inequality; a long run of right answers, one wrong and N − 1 right brings g as close to α(1 − α)^(N−1)
from above as we like, so the right inequality is needed; and N − 1 right answers from the start need the condition
on s₀. ∎

Consequences. The band for θ is empty unless α ≥ 1/2. For N = 3 and α = 0.6 it is 0.904 ≤ θ ≤ 0.936, and at
θ = 0.92 the start must be below 0.5. The fitted EMA starts at the training students' share of right first answers,
which on ASSISTments is likely above 0.5 [check on the data]; it is then not the streak rule. Checked by enumeration
of every sequence of up to 12 answers for 8,400 settings of N (2 to 4), α, θ and s₀: the two agree except at exact
equality on a boundary, where rounding decides.

**Proposition 2, BKT's declarations are right at least θ of the time in its own world.** Let the answers on a skill
come from a BKT process with parameters p, and let the model use the same p. Then the P(known) the model holds after
each answer and its learning step (`bktStep` in `src/model/evaluate.ts`) is exactly the probability that the learner
knows the skill before the next question, given the answers so far. If mastery is declared the first time P(known)
reaches θ, then among the learners for whom it is declared, the expected share who truly know the skill at that
moment is at least θ, and with no forgetting they still know it afterwards.

Proof. Let τ be the answer after which mastery is declared. Whether τ = t is decided by the first t answers alone,
so P(known at τ and τ = t) = E[1{τ = t} · P(known at t | answers 1..t)] ≥ θ · P(τ = t). Summing over t gives
P(known at τ | declared) ≥ θ. ∎

Consequences. In a world that is exactly BKT, BKT's precision at θ is guaranteed, so "BKT wins in the bkt world" is
not a hypothesis: up to fitting error it is a theorem. The bkt world therefore measures what fitting costs (the
fitted model's precision against θ). It says nothing about EMA, and nothing about worlds that are not BKT. The
world in `src/model/simulate.ts` is exactly BKT for `BktModel` only in a plain variant: one question level (its
guess and slip depend on the level, and `BktModel` has one guess and slip per skill), flat learning and no transfer.
Learners' starting chance of knowing a skill varies with their ability, but as nothing else depends on ability, each
skill's answers still follow one BKT process whose init is the average starting chance.

## Hypotheses

Stated before the results are computed, with the test for each:

- **H1, prediction.** On held-out ASSISTments students, BKT predicts the next first-attempt answer better than EMA:
  lower log-loss. Test: the per-student difference in log-loss, a paired bootstrap over students (10,000
  resamples). BKT is better if the 95 % interval excludes zero on its side. With several thousand students a
  difference too small to matter will still exclude zero, so the smallest difference that counts is fixed now:
  0.005 in mean log-loss per answer. A difference whose interval excludes zero but whose estimate is below 0.005 is
  reported as real but negligible; an interval wholly inside ±0.005 as no practical difference. Secondary: RMSE,
  AUC, calibration. H1 is about prediction, not mastery decisions: it is the part of the question real data can
  settle, and the thesis says so rather than letting it stand for the whole question.
- **H2, mastery decisions where the truth is known.** In the worlds that are not BKT (elo, irt2pl, and bkt with
  forgetting), BKT needs fewer answers than EMA and the streak rule before its declarations are right (the skill is
  truly known when declared) at least 90 % of the time. Each method's threshold is the cheapest one that meets
  that standard on training learners (BKT and EMA θ from 0.5 to 0.9999, streak N from 1 to the practice length);
  the comparison is the mean answers each then needs on the held-out learners, a learner never declared counting
  the whole practice. A method that meets the standard at no threshold is reported as never meeting it, which
  counts against it. Reported per world and per learning rate (0.02 and 0.1, the two of the earlier simulation
  study), as the difference in answers with its interval over simulated learners, never pooled. The plain bkt world
  is not part of H2: Proposition 2 settles it, and there it checks fitting.
  The comparison was first set at the streak rule's cost. A first simulated run showed that in the gradual worlds
  almost no learner has truly mastered a skill after that many answers, so every rule was mostly wrong there and the
  comparison could not tell them apart; it was moved to equal accuracy, which has a meaning in every world. The
  equal-cost comparison and the full trade-off curves are kept as description.
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
  - the exact conditions under which "N right in a row" is a moving average, and the precision BKT is guaranteed
    in its own world (Propositions 1 and 2);
  - a pre-specified comparison of BKT with EMA and the streak rule on a public data set (H1, H3);
  - a simulation with known truth that measures mastery decisions directly, in worlds that do and do not match
    BKT's assumptions (H2);
  - open, deterministic code for both, with every number reproducible from Appendix B.

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
  - the **bkt** world, where BKT is the true model (its home ground, so a BKT win there is guaranteed by
    Proposition 2); run in its plain variant (one level, flat learning, no transfer) so the proposition applies,
    and used to check fitting;
  - the **elo** and **irt2pl** worlds, where ability grows gradually and "mastered" means a true chance of a right
    answer of at least 0.9 at level 2 (fixed in advance);
  - a **bkt with forgetting** variant (`forget` in `SimParams`: the chance that a question on a known skill leaves
    it unknown, 0.02 unless given), which breaks BKT's no-forgetting assumption.

### 3.2 Models and fitting

- BKT per skill by the grid search in `fitBkt`, with guess and slip under 0.3; a pooled fit for skills unseen in
  training (`BktModel`).
- EMA: one α for all skills, chosen by log-loss on the training students from a grid (`EmaModel` and `fitEma` in `src/model/evaluate.ts`).
  Every student's score on a skill starts at the share of right first answers among the training students (their
  first answer on each skill), fixed before α is chosen, so the first prediction is learnt from data like the rest.
- Streak rule: N from 2 to 6.
- Every parameter and threshold is chosen on the training students only.

### 3.3 Evaluation

- **Prediction (H1):** the held-out replay of `evaluateHeldOut`: 20 % of students held out by `splitByStudent`, each
  answer predicted before it is learnt from. Log-loss, RMSE, AUC, accuracy, calibration bins (`src/model/evaluate.ts`).
  The BKT − EMA difference in mean log-loss per answer gets its interval from a paired bootstrap over students
  (`pairedLogLoss`, 10,000 resamples) and its verdict from the rule in H1 (`verdict`); `npm run h1` runs it. Split
  seed 1 decides H1; seeds 2 to 5 show whether the result hangs on one split. As a robustness check, not a second
  test, resample whole classes instead of students (`pairedLogLoss` takes a `groupOf`). The 2009–2010 skill builder
  file is documented with `student_class_id`, `teacher_id` and `school_id` columns [check against the downloaded
  file]. The importer keeps `student_class_id`, counting a student who answered in several classes in the one they
  answered most in (it reports how many such students there are), and `npm run h1` then also gives each seed's
  interval from resampling classes.
- **Mastery decisions (H2):** for each learner and skill, the opportunity at which each method first declares
  mastery. Measures: the share of declarations that are true (the learner knows the skill right after the
  declaring answer, which is the moment BKT's P(known) refers to), the share of truly learnt skills never declared,
  and the mean opportunities to declaration. The comparison H2 decides on is at equal accuracy, as stated there
  (`compareAtPrecision`). Around it, as description, the three methods at the streak-3 cost, and each method's
  threshold swept (BKT θ from 0.80 to 0.99, EMA θ likewise, streak N from 2 to 6) with cost drawn against accuracy
  (`src/model/mastery.ts`, `npm run mastery`).
- **Mastery on real data (H3):** agreement between methods; the share right on the next one to three answers on the
  skill after each declaration, where such answers exist.

### 3.4 Where this sits in Zeno

One short section: the learner model, the policy's mastery threshold and why the result matters for it. Point to
[docs/architecture.md](../architecture.md) and Appendix A for the rest of the system.

## 4. Results

- **4.1 Data kept** by the importer, and the simulated settings.
- **4.2 Prediction** (H1): the table for BKT, EMA and the reference rows (Elo, PFA, counting baselines); the
  bootstrap interval for BKT − EMA; the calibration plot; the result across split seeds; the fitted BKT parameters
  (how many skills hit the grid's edges or the 0.3 bound).
- **4.3 Mastery decisions with known truth** (H2): per world and learning rate, the answers each method needs to be
  right 90 % of the time, or that it never is (the H2 comparison); the precision of each at the streak-3 cost; one
  trade-off plot per world; the table at the usual settings (BKT 0.95, streak 3); in the plain bkt world, fitted
  BKT's precision against the bound of Proposition 2.
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
- **Slow learning leaves little to decide.** At the slower learning rate few simulated learners in the gradual
  worlds master a skill within the 30 questions, so a method can meet the 90 % standard only by declaring almost
  nobody; the table shows the share declared, and such a result says little about which method is better.
- **The H2 comparison was revised after a first simulated run** (see H2). The revision chose a standard that has a
  meaning in every world, not the method it favours, and the equal-cost comparison is still reported.
- **Home advantage.** The bkt world is built on BKT's assumptions, and Proposition 2 shows BKT cannot lose there
  except through fitting; only the other worlds test it. They are still worlds of our making: a result in them
  holds as far as their way of learning is believed, which is why each is reported on its own.
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

- A. The Zeno system in brief (`appendix-a-zeno.md`), pointing to [docs/architecture.md](../architecture.md) and
  [docs/api.md](../api.md) for the rest.
- B. Reproducing every number (`appendix-b-reproducing.md`).

## Reproducing every number

Each command is deterministic for a given commit (seeds are fixed). Record the commit hash
(`git rev-parse HEAD`) with every table.

| Result | Command | Status |
|---|---|---|
| ASSISTments import | `npm run import-assistments -- skill_builder_data.csv` | exists; needs the data file |
| Prediction on ASSISTments | `npm run model -- --observations assistments.json --fit --calibration bins.csv` | exists, with the EMA row |
| H1, the paired bootstrap | `npm run h1 -- --observations assistments.json` | exists, with the class-level check when the file names classes |
| Prediction on simulated learners | `npm run model -- --simulate --fit` | exists |
| Mastery decisions, simulated (H2) | `npm run mastery -- --curves mastery-curves.csv` | exists |
| Mastery agreement on ASSISTments (H3) | `npm run mastery -- --observations assistments.json` | exists; needs the data file |
| Test suite | `npm test` | exists |
| Figures | `npm run build`, then `npm run figures` | exists; new plots to add |
