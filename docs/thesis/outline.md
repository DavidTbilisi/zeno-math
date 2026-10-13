# Thesis outline

A chapter plan for a bachelor's thesis built on Zeno's learner-modelling code. For each chapter it gives what to argue,
where the work is in the code, and the evidence that backs it. Citation keys are in [references.bib](references.bib).

**Title (approved at the title defence, 13 October 2026):** *The Effect of Skill Granularity on Mastery Estimation in
Adaptive Learning Systems.*

**Research question:** how does the level of skill granularity affect the accuracy and reliability of mastery
estimation in adaptive learning systems?

**Scope.** Every adaptive practice system decides, after each answer, whether a student has mastered a skill. The
methods that make that decision, Bayesian Knowledge Tracing (BKT), a moving average of recent answers (EMA) and the
streak rule, all take the skill as given. The thesis asks what happens to their decisions when the grain at which a
skill is defined changes: when one modelled skill is really several ideas (too coarse), when the model is at the grain
at which students learn (right), and when it is finer than the questions can tell apart or than the data can support
(too fine). The comparison of the methods at one grain, done first under the working title *When is a skill
mastered?*, is kept in full as the foundation: it is what shows that the choice of method matters, and it supplies the
yardstick (precision of declarations against the known truth) that the granularity study uses. Zeno stays as the
context that motivates the question and as the code base; it is not evaluated.

**Terms.** *Grain* (granularity) is the number of knowledge components a topic is divided into for modelling,
together with the mapping that says which components each question needs (a Q-matrix, [@tatsuoka1983rulespace]).
*Accuracy* of mastery estimation is the share of declarations that are right where the truth is known (simulation)
and prediction quality where it is not (real data). *Reliability* is whether a method's probability means what it
says (calibration), whether the threshold it needs stays put from one setting to another, and whether its decisions
survive a change of grain.

**Status of the chapter drafts.** The chapters `01-introduction.md` to `06-conclusion.md` were written under the
working title (rewritten on 2026-10-11); the results of the one-grain comparison (H2, and the ideas world as a check)
are in; the ASSISTments results are [TODO]. The chapters now need the reframing below: the introduction and
background to open on grain, the method and results to add the granularity studies (G1 to G4), the discussion to
answer the new question. Until each chapter is reworked, its text stands as the foundation part.

**Methods compared**, at every grain.

| Method | Parameters | Gives a probability? | Declares mastery when |
|---|---|---|---|
| BKT [@corbett1994] | init, learn, guess, slip per component, fitted on training students | yes | P(known) ≥ θ (0.95 is the usual choice) |
| BKT per component, conjunctive [@pardos2008composition] | the same per component; a question that needs several updates them together | yes, per component | every component the skill needs is at ≥ θ |
| EMA | one decay rate α, tuned on training students; a starting score fixed from them | yes (the average itself) | average ≥ θ |
| Streak rule | N | no | the last N answers were right (N = 3 in the ASSISTments skill builders) |

The streak rule is what most deployed systems use; the EMA is its probabilistic generalisation (Proposition 1 gives
the exact settings under which they coincide). The Elo model and PFA already in `src/model/evaluate.ts` are reference
rows in the prediction table, not hypotheses.

## What is proved, what is tested, what is shown

The claims are of three kinds and the text keeps them apart. Two are proved from the definitions (Propositions 1 and
2). Two are tested on real data (H1 at one grain, G4 across grains), the only confirmatory tests. The rest are shown
on simulated learners whose true state is known (H2, G1 to G3), which holds only as far as each simulated world is
believed, or described on real data (H3). What Zeno should use is a judgement drawn from all of them.

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

Stated before the results are computed, with the test for each. H1 to H3 are the foundation, the methods compared at
the grain the data or the simulation gives; they were stated and, for H2, run under the working title. G1 to G4 are
the granularity studies the title asks for. G1 and G2 rest on worlds (`src/model/atoms.ts`, `src/model/ideas.ts`) that
were first built as checks after the H2 results; their first runs are reported as such, and the hypotheses below are
stated for the sweeps that have not yet been run.

### The foundation: the methods at one grain

- **H1, prediction.** On held-out ASSISTments students, BKT predicts the next first-attempt answer better than EMA:
  lower log-loss. Test: the per-student difference in log-loss, a paired bootstrap over students (10,000 resamples).
  BKT is better if the 95 % interval excludes zero on its side; 0.005 in mean log-loss per answer is the smallest
  difference that counts, fixed in advance. Secondary: RMSE, AUC, calibration.
- **H2, mastery decisions where the truth is known.** In the worlds that are not BKT (elo, irt2pl, bkt with
  forgetting), BKT needs fewer answers than EMA and the streak rule before its declarations are right at least 90 %
  of the time, each method at the cheapest threshold meeting that standard on training learners, cost judged on
  held-out learners; a method meeting it at no threshold up to 0.9999 is reported as never meeting it. Per world and
  learning rate, never pooled. Result so far: holds with forgetting (1 to 2 answers fewer); fails in the gradual
  worlds, where BKT meets the standard only at thresholds between 1 − 10⁻⁷ and 1 − 10⁻¹³ and is badly calibrated
  (when it says 0.99 the learner has mastered the skill 15 to 55 % of the time). The comparison moved from equal
  cost to equal precision after a first run; both are reported.
- **H3, mastery decisions on real data (exploratory).** Agreement between the methods on ASSISTments and the share
  right after each declares; exploratory because the data were collected under the streak rule.

### The granularity studies

- **G1, too coarse: a skill that is really several components.** In a world where a skill is k components, each
  learnt all at once as BKT assumes, and the model treats the skill as one (`atoms.ts`; the ideas world with Zeno's
  generators), BKT on the skill fails H2's standard once k ≥ 2, its calibration worsens with k, and the threshold it
  would need rises with k; the EMA and the streak rule, which assume nothing about the skill, lose less. Sweep: k in
  1, 2, 4, 8, 16, both learning rates, components asked one at a time (as in `atoms.ts`) and several at a time (as in
  the ideas world). Measures: precision at the usual thresholds (BKT 0.95, EMA and streak at their fitted values),
  the cheapest threshold meeting 90 %, Brier score of each score against the truth. First runs: BKT on the skill fails
  at k ≥ 2 in `atoms.ts`, and on hcf and fractions in the ideas world at no threshold up to 0.9999, with the worst
  Brier score on fractions (Table 4.9). The sweep (seed 1, 400 learners, 12 skills, 30 questions): asked one
  component at a time, BKT on the skill at 0.95 is right 98 % of the time with one component, 59 to 71 % with two,
  23 to 28 % with four, 5 to 8 % with eight and under 4 % with sixteen; the cheapest threshold meeting 90 % is 0.80
  to 0.86 with one, 0.999 to 0.9999 with two and none from four on; its Brier score rises from 0.02 to 0.04 with one
  to 0.55 to 0.68 with sixteen. The EMA and the streak rule at their usual thresholds fall as far in precision (the
  EMA from 97 to 99 % with one to 1 to 4 % with sixteen), so the part of the hypothesis that says they lose less
  holds for the Brier score (the EMA's stays at 0.17 to 0.33) and for whether any threshold meets the standard (the
  EMA finds one up to eight components at the low rate, by declaring late), not for precision at the usual threshold.
  BKT per component at 0.95 is right 97 to 100 % of the time wherever it declares, but declares for fewer learners as
  k grows and for none at eight or sixteen within 30 answers, which is G3's shortage of evidence per component. Asked
  several at a time, what matters is the share of the skill's components a question leaves untested: with every
  component in every question the skill is one unit again (two of two, 97 to 98 % at 0.95; four of four, 94 to
  98 %, cheapest threshold 0.78 to 0.83), with half of them it is halfway (two of four, 58 to 70 %; four of eight,
  50 to 72 %). In the ideas world, with the generators as they are, BKT on the skill at 0.95 is right 94 % of the
  time on times (three ideas, all in every question), 55 to 77 % on hcf (six, four a question) and 16 to 30 % on
  fractions (sixteen, six a question). This is also the diagnosis of H2's result: a coarse grain makes all-at-once
  learning look gradual, and it does so in proportion to what each question leaves untested.
- **G2, the right grain, and the condition on the questions.** Modelling at the true grain (BKT per component,
  conjunctive) restores the standard at an ordinary threshold and lets the model say which component a learner lacks,
  if and only if the questions tell the components apart. Sweep, in the ideas world: the share of questions that ask
  for one component alone (0, 25, 50, 100 %) against practice length (30, 60, 120), on fractions (sixteen
  components, six a question as generated); and, in the atoms world where it can be set, the number of components a
  question needs (`--per-question`). Measures: as G1, plus "missing idea found" (at every moment a learner is one
  component short, how often the lowest P(known) is that one; chance is 1/k), and the answers saved by carrying
  components across skills. First runs: on hcf (four of six components a question, arithmetic settled earlier) BKT
  per component carried from the earlier skill needed 2.2 answers fewer than started afresh and 3.8 fewer than the
  EMA at the higher rate, was best calibrated and found the missing idea 47 to 79 % of the time; on fractions (eight
  components a question) it was at chance (6 to 8 % against 6.7 %) until questions asking for one idea alone were
  added, when it found the idea two times in three. The sweep (seed 1, 400 learners): on fractions BKT on the skill
  meets the standard at no setting and at 0.95 is right 0 to 30 % of the time, and the EMA and the streak rule meet
  it only by declaring for almost nobody. Length does more than the isolating share: with the generators as they
  are the missing idea is found 8 % of the time after 30 answers at the low rate and 66 % after 120, and 51 to 69 %
  at the high rate; a quarter of the questions asking for one idea alone lifts that to 70 to 71 % at 120 answers
  while leaving learning as it was (93 % of learners knowing every idea at the high rate, against 89 %), half lifts
  it to 65 to 76 % but teaches less, and every question alone teaches one idea at a time, so after 120 answers at
  the high rate only 47 % know every idea and the share found falls back (20 to 68 %, unstable). Carried BKT per
  component is the only rule that declares fractions mastered in time: at the high rate after 120 answers it needs
  73 answers (92 % right, 87 % declared) where the EMA and the streak rule never declare, and with a quarter alone
  75 against their 105; carrying saves 0.8 to 3.9 answers at that length. This is the identifiability problem
  [@beck2007identifiability] at the level of the components [@xu2012subskills]: the questions, and enough of them,
  decide whether the fine grain is usable.
- **G3, too fine: finer than the students learn, or than the data supports.** Two ways of being too fine. (a) A
  component that is learnt as one thing is modelled as two (each question tagged with one of the two at random):
  each modelled half sees half the evidence, so declarations come later and the two halves disagree; precision does
  not improve. (b) The number of components grows past what the practice length can support: with k components and
  n questions, the mean evidence per component is n/k, and below some n/k the per-component fit degenerates (guess or
  slip at the bound, init at the grid's edge) and the threshold found on training learners no longer transfers to
  held-out ones. Sweep: over-splitting factor 1, 2, 4 at the true k; k from 1 to 32 at n = 30 and 120. Measures: as
  G1, plus answers to declaration, the share of learners never declared, the share of degenerate fits, and the
  difference between the threshold chosen on training learners and the one that would have been best on held-out
  ones (threshold stability). This study has no first run; it needs an over-splitting variant in `atoms.ts`.
- **G4, real data across grains (confirmatory).** On ASSISTments 2009–2010 the same answers can be modelled at three
  grains without new data: the data set's own skill tags (about a hundred skills), the topic areas the importer
  already assigns to them (`assistmentsTopic` in `src/model/datasets.ts`, a dozen areas), and one skill for all of
  mathematics (`src/model/grain.ts`, `npm run grain`). A problem tagged with several skills is one observation per
  skill at the finest grain and, where those skills fall together, one at a coarser grain; the paired tests run on
  the first observation of each problem, which every grain keeps. Hypothesis: BKT fitted at the data set's grain predicts held-out students' answers better than BKT
  at the topic grain, which predicts better than one skill (log-loss, paired bootstrap over students, 0.005 as the
  smallest difference that counts, the finest-against-coarsest difference as the one confirmatory test). Exploratory
  beside it: whether the EMA loses less than BKT from coarsening (it conditions on fewer answers, so it should),
  how the mastery declarations of each method move with the grain (when each declares, how often they agree across
  grains, the share right afterwards), and how many fits are degenerate at each grain. If a finer real grain is
  wanted, the KDD Cup 2010 Cognitive Tutor data sets tag the same transactions with several knowledge-component
  models [check the data dictionary for the column names before relying on this]; that is an extension, not a
  requirement. The thesis does not claim an optimal grain exists; it reports where each measure improves or worsens
  and under what condition.

## 1. Introduction

- **The problem.** Mastery learning [@bloom1984] needs a decision: has this student learnt this skill? Every
  adaptive practice system makes it (Zeno's in `src/model/policy.ts`). Deployed systems use simple rules, research
  systems BKT; and every one of them takes the skill as given. But "fractions" can be one skill or sixteen ideas, and
  the choice is made by whoever writes the curriculum, not by the model.
- **Aim and research question**, as above. The question is answered where the truth is known (simulation, with the
  grain under control) and checked on real data at the grains the data allow.
- **Why it matters.** Too coarse: abilities are mixed and the model's probability stops meaning what it says. Too
  fine: little evidence per component, components the questions cannot tell apart, and decisions that come late or
  never. Both are failures of the decision, not of the student.
- **Contributions:**
  - the comparison of BKT, EMA and the streak rule at one grain, pre-specified, with the two propositions, on real
    data (H1, H3) and in known-truth simulation (H2), as the foundation;
  - a known-truth simulation of the same methods across grains, too coarse, right and too fine, with the condition
    on the questions under which a finer grain is usable (G1 to G3);
  - the same answers modelled at three grains on a public data set, with one pre-specified test (G4);
  - a practical answer for a real system, and open deterministic code for all of it (Appendix B).
- **What is not claimed:** that nobody has studied grain (they have, section 2.4), or that an optimal grain exists in
  general; the thesis reports under which conditions a grain is usable.

## 2. Background

- **Mastery learning** [@bloom1984] and how mastery is decided in practice: Cognitive Tutors at P(known) ≥ 0.95
  [@corbett1994], ASSISTments skill builders at three in a row [@feng2009assistments], Khan Academy [@khanmastery].
- **BKT** [@corbett1994]: parameters, update, fitting [@yudelson2013], identifiability and degenerate fits
  [@beck2007identifiability], extensions [@khajah2016]; BKT on questions that need several skills: the conjunctive
  reading and the composition effect [@pardos2008composition], subskills [@xu2012subskills].
- **Simple estimators** and earlier comparisons of mastery criteria [@pelanek2017mastery; @fancsali2013mastery].
- **Knowledge components and grain.** What a knowledge component is [@koedinger2012kli]; Q-matrices
  [@tatsuoka1983rulespace]; learning factors analysis as a search over grains [@cen2006lfa]; the ASSISTments studies
  that compared skill models of 1, 5, 39 and 106 skills for prediction [CITATION NEEDED: Feng, Heffernan, Heffernan &
  Mani, "Using mixed-effects modeling to analyze different grain-sized skill models in an intelligent tutoring
  system", IEEE Trans. Learning Technologies; Pardos, Heffernan, Anderson & Heffernan, "The effect of model
  granularity on student performance prediction using Bayesian networks", UM 2007; Pardos, Feng, Heffernan &
  Heffernan, AIED 2007: verify years and pages]. These compared grains for predicting a test score; none measured
  mastery decisions against a known truth, which is the gap this thesis fills.
- **Judging student models:** log-loss, RMSE, AUC, calibration [@pelanek2015metrics; @fawcett2006; @brier1950];
  splits by student. **Other models** (Elo, PFA, DKT) in one paragraph each, as context.

## 3. Method

### 3.1 Definitions: grain, components, questions

A topic, the components it is divided into, the mapping from questions to components (which a generator fixes and
a data set's tags record), and the three relations between the modelled grain and the grain at which learners learn:
coarser, equal, finer. Mastery of a skill at any grain: every component the skill's questions can need is known.

### 3.2 The methods and the propositions

As in the table above; Propositions 1 and 2 with proofs (section 3.2 of the draft). BKT per component, conjunctive,
with the closed-form posterior (`conjunctiveStep` in `src/model/ideaState.ts`), the mistake-blame form and the
carried form.

### 3.3 Data

- **ASSISTments 2009–2010** [@assistments2010data], as imported (`npm run import-assistments`); the three grains of
  G4 from the same rows: skill tags, topic areas, one skill. Report students, answers, skills and areas kept, and how
  multi-skill problems are handled at each grain.
- **Simulated learners**, each with the true state recorded after every answer:
  - the one-grain worlds of H2 (`src/model/simulate.ts`): bkt, bkt with forgetting, elo, irt2pl;
  - the atoms world (`src/model/atoms.ts`): a skill is k components, one asked per question; with `split` above 1 the
    model is finer than the learner (G3), and the fits at the grid's edge and the threshold's transfer from training
    to held-out learners are counted;
  - the ideas world (`src/model/ideas.ts`): fractions and its arithmetic as sixteen ideas (`conceptGraph.ts`), asked
    by Zeno's own generators, with the share of isolating questions as a setting [to add as a sweep].

### 3.4 Fitting and thresholds

As in the draft (grid-search BKT with guess and slip under 0.3, EMA's α by log-loss, every threshold chosen on training
learners), applied per component where the grain is finer. Record degenerate fits.

### 3.5 Evaluation

- **Prediction** (H1, G4): held-out replay, log-loss primary, paired bootstrap, the class-level check (`npm run h1`).
- **Mastery decisions with known truth** (H2, G1 to G3): precision of declarations, cheapest threshold meeting 90 %,
  answers to declaration, share never declared, Brier, missing idea found, threshold stability (`npm run mastery`,
  `npm run atoms`, `npm run ideas`).
- **Mastery on real data** (H3, G4 exploratory part): agreement, share right after declaration, across grains.

### 3.6 Where this sits in Zeno

The adaptive policy already keeps a per-idea state and aims at the weakest idea (`src/model/ideaState.ts`); the
thesis's answer decides what grain that state should have and which rule declares mastery.

## 4. Results

- **4.1 Data kept** and the simulated settings.
- **4.2 The methods at one grain**: H1 (table, interval, seeds, fitted parameters), H2 (per world and rate, the check
  above 0.9999, calibration), H3. This is the draft's chapter 4 as it stands.
- **4.3 Too coarse (G1)**: precision, threshold and Brier against k, in both worlds; BKT on the skill beside the EMA.
- **4.4 The right grain and the questions (G2)**: the isolating-share sweep, missing idea found, carrying.
- **4.5 Too fine (G3)**: over-splitting and k against practice length; degenerate fits; threshold stability.
- **4.6 Real data across grains (G4)**: log-loss at three grains with the confirmatory interval; the EMA beside BKT;
  declarations across grains.

## 5. Discussion

- The answer in one sentence: a coarse grain makes BKT's probability stop meaning what it says, a fine grain is usable
  only where the questions identify the components and the data support them, and the simple rules are less affected
  by grain because they assume less. Then each study in turn.
- What follows for a system: choose the grain together with the questions; BKT at the finer grain where both are
  there, the EMA with a threshold set from the system's own data otherwise.

### Threats to validity

Those of the draft (the ASSISTments streak policy, worlds of our making, the revisions after first runs, the 0.9
definition, coarse fitting, non-independent students, one confirmatory test), plus: the atoms and ideas worlds were
built after H2's results and their first runs are checks; the coarsening of ASSISTments into topics is by keyword and
checked by eye, so G4's middle grain is one of many possible; a single data set at three grains cannot say what a
different fine tagging would do; the simulated decompositions are of our making, and the real curriculum's ideas were
decomposed by hand.

## 6. Conclusion and future work

- Answers to the research question by study; the recommendation for Zeno.
- **Future work:** the KDD Cup 2010 data with several knowledge-component models; learning the grain from data
  (learning factors analysis) rather than fixing it; a prerequisite graph, which this thesis does not use; the
  adaptive vs fixed class study (`docs/study.md`).

## Appendices

- A. Zeno in brief. B. Reproducing every number.

## Reproducing every number

| Result | Command | Status |
|---|---|---|
| ASSISTments import | `npm run import-assistments -- skill_builder_data.csv` | exists; needs the data file |
| Prediction on ASSISTments (H1) | `npm run h1 -- --observations assistments.json` | exists |
| Mastery decisions, simulated (H2) | `npm run mastery -- --curves mastery-curves.csv` | exists |
| Mastery agreement on ASSISTments (H3) | `npm run mastery -- --observations assistments.json` | exists; needs the data file |
| Too coarse, k components (G1) | `npm run atoms -- --atoms 1,2,4,8,16 --per-question 1,2,4`; `npm run ideas` | exists; the last table of each is the sweep side by side |
| Right grain, isolating share (G2) | `npm run ideas -- --skills fractions --isolate 0,0.25,0.5,1 --length 30,60,120` | exists; components a question in `npm run atoms -- --per-question` |
| Too fine, over-splitting (G3) | `npm run atoms -- --atoms 2 --split 1,2,4` | exists; also reports fits at the grid's edge and threshold stability |
| Real data at three grains (G4) | `npm run grain -- --observations assistments.json` | exists; needs the data file (re-import it, so that problems are kept) |
| Figures | `npm run figures` | exists; grain plots to add |
