# 5 Evaluation

This chapter collects the evidence for the sub-questions of chapter 1. No class has used Zeno yet, so none of it is
an answer to the main research question. What it can show is narrower and, for a system meant to run a study, comes
first: that the software computes what it claims (5.1), that the learner model predicts answers better than the
standard alternatives (5.2), under which assumptions adaptive practice would help at all (5.3), whether the planned
study is ready and able to detect that help (5.4), and whether people can use the system (5.5).

Every number in this chapter comes from a command in the repository. Seeds are fixed, so each command gives the same
output for the same commit; the commit is given under each table, and appendix D lists the commands with their run
times. Results that do not exist yet are marked **[TODO]** with the command that will produce them.

## 5.1 Correctness

### The test suite

Zeno's tests use Node's built-in test runner, with no test framework. `npm test` runs 280 tests in 39 files, all
passing at commit 28f046d, in about three minutes. They cover:

- the maths engine, tool by tool;
- every example in every tool, rendered in all three languages;
- the HTTP API, including a check of the route table in the API documentation against the running server;
- the study rules (randomisation, test forms, phases, the per-condition policy check);
- the learner model, its baselines and its metrics;
- the analysis;
- the answer checker against teacher marking;
- a dry run of the whole study through the real server.

Five Playwright specifications (six tests) drive a real browser through a board, the class study, the read-only
share link, printing the tests to PDF, and practice with a named mistake.

Continuous integration runs on every push and pull request. One job runs the typecheck, ESLint, the whole suite with
coverage thresholds for `src/math` and `src/model` (95 % of lines and functions, 88 % of branches) and the
production build. A second job builds the site and runs the Playwright tests in Chromium. A third builds the Docker
image, starts it on a named volume, and checks that it answers its health check and saves a board.

**Checked against something independent.** A test that compares a function with its own earlier output only shows
that nothing changed. Zeno's maths tests are written the other way round: each result the tools state is checked
against a computation that does not share its code. Some examples:

- a derivative is compared with a numerical derivative, on many random expressions (`tests/derive.test.ts`);
- applied calculus answers are compared with an independent numerical computation (`tests/applied.test.ts`);
- a polynomial division must satisfy dividend = divisor × quotient + remainder, and every root found must be a root
  with no sign change missed (`tests/polynomials.test.ts`);
- sequence terms, sums and limits are checked by brute force: adding the terms one by one, iterating the recurrence
  (`tests/sequences.test.ts`);
- a point found where two lines meet must lie on both, and a foot of a perpendicular must make a right angle
  (`tests/vectors.test.ts`);
- a trigonometric identity is proved only if it is true, and false ones are refused (`tests/identities.test.ts`);
- distribution functions are checked against printed tables and closed forms, and confidence intervals against the
  matching tests (`tests/inference.test.ts`);
- the study's ANCOVA and Welch test are checked against hand-worked values and printed t tables
  (`tests/analysis.test.ts`);
- the learner model, run on simulated learners whose true abilities and difficulties are known, must recover the
  true order of difficulties and students and beat simple counting (`tests/model.test.ts`).

For practice, every generated question must accept its own answer and reject a wrong one, at every level, over many
seeds (`tests/practice.test.ts`). This catches a generator whose stated answer is wrong, but not a generator whose
question is shown wrongly, because both sides then come from the same code. The next section describes how that
second kind of fault was found.

### The answer checker against teacher marking

A test score is only as good as its marking. In Zeno the checker marks the pre- and post-tests, so its accuracy is
part of the outcome measure of the study. To measure it, I built a corpus of 333 typed answers to questions from all
42 practice skills (`tests/fixtures/answers.json`), each marked the way a teacher would mark it, using four labels:

- *correct*;
- *close*: a rounding slip;
- *wrong*;
- *form*: the right idea in a form the question did not ask for (not simplified, not factorised, not exact, a root
  missing, unreadable). The checker sends such an answer back to be retyped, without counting it.

The answers were written to probe the checker rather than to be typical: equivalent forms of right answers, the
slips a teacher would forgive, and the wrong answers students commonly give. `npm run checker-agreement` compares the
checker's verdicts with the labels (Table 5.1).

| teacher \\ checker | correct | close | wrong | form |
|---|---:|---:|---:|---:|
| correct (158) | 155 | 0 | 1 | 2 |
| close (16) | 0 | 0 | 3 | 13 |
| wrong (123) | 0 | 0 | 123 | 0 |
| form (36) | 2 | 0 | 8 | 26 |

Table: The checker's verdicts against a teacher's marking, 333 answers over 42 skills (`npm run checker-agreement`,
commit 28f046d).

The checker agrees with the teacher on 304 of the 333 answers (91.3 %). The errors that matter for a test score are
the ones that cross between right and wrong:

- **Every wrong answer is marked wrong** (123 of 123).
- **Two answers are credited that a teacher would not credit:** `13*17` typed for "work out 13 × 17" (the question
  written back), and an indefinite integral without `+ C`.
- **One right answer is refused:** `50%` given as a probability.

The other 26 disagreements are milder, and most fall into two patterns:

- **Rounding slips are sent back rather than marked close.** The checker never gives "close" in this corpus: of the
  16 answers a teacher would mark close, 13 are sent back and 3 marked wrong (rounded to the wrong number of places,
  such as `44` for 43.9). On a test, a send-back costs the student a retry, not a mark.
- **A rounded decimal for an exact answer is marked wrong.** For example, `2.83` for 2√2, or `1.0556` for 19/18. A
  teacher would ask for the exact value instead. Seven of the eight teacher-*form*, checker-*wrong* answers are of
  this kind; the eighth is a right line not rearranged into the asked form.

A few answers the checker cannot read come back as unreadable, such as a confidence interval written as
`76.24 to 82.16`. `tests/checker.test.ts` keeps these figures as thresholds: it fails if overall agreement drops, or
if the checker starts crediting wrong answers or refusing right ones.

**Faults found by building the corpus.** Writing the corpus meant reading several hundred generated questions closely,
and it found two real faults that the existing tests had missed:

- About one question in forty showed its expression wrongly: 2.6 % of 22,800 sampled questions. A term like `-3x^3`
  was printed as `x^{3} -3` in function, calculus and expansion questions. The stated answer was right for the
  intended expression, so the self-consistency test above could not see it.
- A list of exact answers such as `-4 - 2sqrt(3); -4 + 2sqrt(3)` could not be read, because the closing bracket of
  `sqrt(3)` was taken for the end of the list.

Both are fixed, with tests. Exact roots, "or" between roots, and `±` are now also accepted.

**Limits of this measure.** The corpus was written and labelled by one person, the author, so the labels have no
inter-rater check. The answers were chosen to cover the checker's cases rather than sampled from students, so 91.3 %
is agreement on a deliberately hard set, not an estimate of agreement on a real class's answers. A real study should
have a second marker label a sample of its exported answers, which `npm run checker-agreement` can then score.

### Naming the mistake

Many wrong answers are predictable from the question. ½ + ⅓ answered as 2/5 comes from adding the tops and the
bottoms; (2x + 7)² answered as 4x² + 49 comes from squaring each term; x > −8, where dividing by a negative should
have turned the sign round, comes from not flipping the inequality. Zeno's generators know the numbers in each
question, so each question lists the answers that its known mistakes would give (section 4.2). The catalogue has 17
mistakes (`src/math/mistakes.ts`); "right size, wrong sign" is tried on every question whose answer is a number, a set
of roots or an expression.

A matched mistake does not change the verdict. The answer is still marked wrong and still counts as a miss for the
learner model; in practice the student also reads a short hint naming the slip. Tests show no feedback, so on a test
the name appears only later, when the exports are analysed.

In the corpus, 31 of the 123 wrong answers show a mistake a teacher would name. The checker names the same mistake in
all 31, names a different one in none, and names a mistake in none of the 92 wrong answers that show no known
mistake (Table 5.2).

| wrong answers | named correctly | named wrongly | not named |
|---|---:|---:|---:|
| with a mistake a teacher names (31) | 31 | 0 | 0 |
| with no known mistake (92) | — | 0 | 92 |

Table: Mistakes named in the corpus's wrong answers (`npm run checker-agreement`, commit 28f046d).

This is a test of recognition, not of coverage. The catalogue is the author's list of common slips, drawn from
experience and the teaching literature, not one found in students' answers, and the labelled answers were written
with the catalogue in view. A perfect score therefore shows that the checker recognises the mistakes it was built to
recognise, without false alarms on other wrong answers. It does not show how many of a real class's wrong answers
these 17 mistakes explain; `npm run mistakes` on a real export will show that (section 5.4).

## 5.2 The learner model on real answers

Sub-question 1 asks how well Zeno's learner model predicts students' answers compared with standard student models.

### Method

`npm run model` (`scripts/evaluate-model.ts`, `src/model/evaluate.ts`) judges a model on students it has never seen.
A fifth of the students are held out, chosen by a hash of their id, so the split is the same on every run and no
student is split between training and test. Every model fits, or warms up, on the training students. It then
predicts the held-out students' answers in the order they were given, learning from each answer only after
predicting it, so no prediction has seen its own answer. This is how the model is used in class: it must predict a
student's next answer from what came before.

Each answer is a student's first attempt at a question, scored right (1) or wrong (0). The metrics are the usual ones
for student models [@pelanek2015metrics]:

- **log-loss** and **RMSE**, for how close the predicted probabilities are to what happened;
- **AUC**, for how well the predictions rank right answers above wrong ones;
- **accuracy** at a 0.5 threshold, reported but not relied on;
- **calibration**: the answers grouped into ten bins by prediction, with the share right in each, so that "70 %"
  can be seen to come true about 70 % of the time.

Log-loss is the primary metric, because the adaptive policy uses the predicted probability itself (it aims at a
target chance), not only its ranking.

The models compared are:

- **Elo, three layers**: Zeno's model (section 4.3), with ability as overall + area + skill;
- two **ablations**: Elo without the area layer, and with the skill layer only, to show what each layer adds;
- **PFA**, Performance Factors Analysis [@pavlik2009pfa]: a logistic regression on each skill's earlier right and
  wrong answers, fitted on the training students;
- **BKT**, Bayesian Knowledge Tracing [@corbett1994]: each skill known or not, with learn, guess and slip
  probabilities per skill from a grid search on the training students;
- three **counting baselines**: each student's rate on each skill, each skill-and-level's rate, and the overall rate.

With `--fit`, the Elo model's two step-size parameters (α, the initial step, and β, how fast it shrinks with
evidence) are also chosen by grid search on the training students and the best pair scored on the held-out ones.

### Data

**ASSISTments.** The real-data evaluation uses the ASSISTments 2009–2010 "skill builder" data set
[@assistments2010data], from the ASSISTments system [@feng2009assistments]: first attempts by several thousand US middle-school students at maths problems, each
tagged with the skills it practises. `npm run import-assistments` (`scripts/import-assistments.ts`) prepares it:

- it keeps main problems only, not the scaffolding questions that a wrong answer opens;
- it keeps rows with a skill and a 0/1 first-attempt result, in the order they were answered;
- a problem tagged with two skills counts once for each;
- every question is treated as level 2, since the data has no levels;
- the model's area layer uses a rough grouping of the skill names into topics (number, algebra, geometry, data,
  other). The output also reports `elo, one area`, a version with a single area, to show what that grouping adds.

**Simulated classes.** For comparison, the same evaluation runs on a simulated class (`--simulate`): 120 students
answering 150 questions each, from learners whose answers follow the elo world of section 5.3.

### Results

**[TODO: run `npm run import-assistments -- skill_builder_data.csv`, then
`npm run model -- --observations assistments.json --fit --calibration assistments-bins.csv`. Report the number of
students, answers and skills the importer keeps; the table of log-loss, RMSE, AUC and accuracy for every model,
including `elo, one area`; the fitted α and β; and the commit hash.]**

| model | log-loss | RMSE | AUC | accuracy |
|---|---:|---:|---:|---:|
| **[TODO: ASSISTments rows]** | | | | |

Table: The learner model and its alternatives on held-out ASSISTments students.

![Calibration of each model on held-out ASSISTments students: predicted chance against the observed share right, per
bin.](figures/TODO-calibration-assistments.png)

On the simulated class, the evaluation gives Table 5.4.

| model | log-loss | RMSE | AUC | accuracy |
|---|---:|---:|---:|---:|
| Elo, three layers | 0.550 | 0.431 | 0.789 | 0.713 |
| Elo, fitted (α 0.4, β 0.05) | 0.550 | 0.431 | 0.789 | 0.713 |
| Elo, no area layer | 0.558 | 0.434 | 0.782 | 0.710 |
| Elo, skill layer only | 0.597 | 0.453 | 0.741 | 0.677 |
| PFA | 0.642 | 0.475 | 0.678 | 0.632 |
| BKT | 0.641 | 0.474 | 0.679 | 0.639 |
| per student & skill rate | 0.654 | 0.481 | 0.653 | 0.590 |
| per skill & level rate | 0.626 | 0.467 | 0.704 | 0.654 |
| overall rate | 0.693 | 0.500 | 0.505 | 0.536 |

Table: Models on a simulated class: 120 students × 150 questions, 18 held out (2,700 answers, 44.2 % right first
time) (`npm run model -- --simulate --fit`, commit 28f046d).

On simulated data each layer of the Elo model helps: dropping the area layer costs 0.008 in log-loss, and keeping
only the skill layer costs 0.047. The three-layer model is also well calibrated: in eight of the ten bins the observed
share right is within 0.04 of the prediction; the largest gaps are in the 0.2–0.3 bin (0.251 predicted, 0.207
observed) and the 0.6–0.7 bin (0.649 predicted, 0.577 observed). PFA and BKT overestimate the chance of a right answer in
the middle of the range. The fit search chooses α = 0.4, β = 0.05, the defaults, so on this data `--fit` changes nothing.

![Calibration on the held-out simulated students: the predicted chance of a right first answer against the share
answered right, in bins of 0.1. Bins with fewer than 20 answers are left out (two of PFA's).
(`npm run figures`.)](figures/calibration-simulated.png)

These figures show only that the model works as built. The simulated learners share the model's structure: abilities
in three layers, a difficulty per skill and level. The defaults were chosen on classes like these, though with
different seeds. PFA and BKT know nothing of levels, which the simulation has, so they are at a disadvantage here
that they do not have on ASSISTments. The ASSISTments table is the evidence on real answers.

### Discussion

**[TODO, once the ASSISTments results exist: whether the Elo model's advantage over PFA and BKT survives on real
answers, and by how much; whether the area layer helps with a rough grouping of skill names (compare `elo` with
`elo, one area`); whether the fitted α, β differ from the defaults, and if so whether the defaults should change
before a real study; and where the calibration plot departs from the diagonal.]**

Three differences between ASSISTments and Zeno limit how far the result transfers. ASSISTments has no levels, so the
part of the model that separates a skill's levels is not tested. Its students are US middle-school students working
through a curriculum unlike Georgia's. And its skill tags were made by the platform's authors, with problems tagged
to one or several skills, while every Zeno question belongs to exactly one skill. A model that does well on
ASSISTments is likely to do at least as well on Zeno's cleaner structure, but that is an expectation, not a result.

## 5.3 Would adaptive practice help? A simulation study

Sub-question 2 asks under which assumptions about learning adaptive practice would help, and how robust that is.
Without a classroom, the only way to ask it is to simulate learners. A simulation, though, can only show what follows
from its assumptions, so the study does not pick one set of assumptions; it runs across all of them and reports the
pattern.

### Method

`npm run simulate` (`scripts/simulate-study.ts`, `src/model/simulate.ts`) runs the two conditions on simulated
classes. Each simulated learner has a true ability on every skill, built from overall, area and skill parts, and every
skill and level has a true difficulty. Each class has 60 students, half in each condition, who answer 60 practice
questions each on the 12 algebra skills. Both conditions use the real policy code (`src/model/policy.ts`) and the
real learner model, which sees only the answers, not the truth.

Four assumptions are varied:

- **The world**: how answers come from what a learner knows.
  - *elo*: the chance of a right answer is σ(ability − difficulty), the learner model's own form.
  - *irt2pl*: the same with a discrimination per skill, σ(a · (ability − difficulty)), so some skills separate
    those who know from those who don't more sharply than the model assumes.
  - *bkt*: each skill is known or not, as in BKT. A learner who knows it sometimes slips; one who doesn't sometimes
    guesses. Practice may teach the skill, all at once.

  The irt2pl and bkt worlds are there to break the model's assumptions: a result that holds only in the elo world
  may be an artefact of simulating the model's own view of learning.
- **Learning**: how much a question teaches. Under *flat*, every question teaches the same. Under *zpd*, a question
  teaches most when the learner has an even chance, and little when it is far too easy or too hard, as a gain of
  4p(1 − p) [@vygotsky1978].
- **Transfer**: the share of a question's learning that also goes to each skill built directly on its skill: 0, 0.3
  or 0.6. The learner model assumes none.
- **Rate**: how much one question raises true ability, 0.02 or 0.1.

That gives 3 × 2 × 3 × 2 = 36 assumption sets, with 10 classes each. The outcome is the *true gain*: each learner's
real chance of a right answer on every skill and level of the class, averaged, after practice minus before. Using the
truth rather than a test removes measurement noise, so this asks whether adaptive practice teaches more, not whether
a test could tell (that is section 5.4). The effect is Cohen's d [@cohen1988] of adaptive over fixed in true gain,
with a 95 % interval over the 10 classes.

The grid (`--grid`) adds three comparisons to adaptive (75 %) against fixed: adaptive aiming at 60 % and at 85 %
against fixed, and adaptive against random choice of skill and level.

The simulated learners have the 38 skills Zeno had when these results were made (`SIM_SKILLS`). The four skills added
since are left out, because the simulation draws its random numbers skill by skill and adding a skill would change
every published number. The algebra skills used here are unchanged.

### Results

Table 5.5 gives d of adaptive (75 %) over fixed in each assumption set.

| world | learning | rate | transfer 0 | transfer 0.3 | transfer 0.6 |
|---|---|---:|---:|---:|---:|
| elo | flat | 0.02 | 0.13 | 0.64 | 0.78 |
| elo | flat | 0.1 | −0.16 | 0.26 | 0.24 |
| elo | zpd | 0.02 | 0.02 | 0.39 | 0.52 |
| elo | zpd | 0.1 | −0.36 | −0.04 | 0.12 |
| irt2pl | flat | 0.02 | 0.21 | 0.72 | 0.86 |
| irt2pl | flat | 0.1 | 0.05 | 0.37 | 0.47 |
| irt2pl | zpd | 0.02 | 0.14 | 0.52 | 0.67 |
| irt2pl | zpd | 0.1 | −0.16 | 0.13 | 0.24 |
| bkt | flat | 0.02 | −0.53 | −0.14 | −0.19 |
| bkt | flat | 0.1 | −0.49 | −0.19 | −0.08 |
| bkt | zpd | 0.02 | −0.07 | −0.00 | −0.03 |
| bkt | zpd | 0.1 | −0.33 | −0.13 | 0.01 |

Table: Cohen's d of adaptive (75 % target) over fixed practice in true gain; 60 students × 60 questions on 12
algebra skills, 10 classes per cell (`npm run simulate`; `docs/results/simulation-grid.csv`). **[TODO: commit hash
the CSV was made at.]**

Table 5.6 summarises the grid: the mean d over each world's 12 assumption sets, and how many sets had a 95 %
interval entirely above zero (↑) or entirely below (↓).

| world | adaptive 75 % vs fixed | adaptive 60 % vs fixed | adaptive 85 % vs fixed | adaptive 75 % vs random |
|---|---|---|---|---|
| elo | +0.21 (5↑ 1↓) | +0.69 (12↑ 0↓) | −0.15 (2↑ 5↓) | +0.33 (8↑ 2↓) |
| irt2pl | +0.35 (7↑ 0↓) | +0.71 (11↑ 0↓) | +0.03 (3↑ 3↓) | +0.41 (8↑ 0↓) |
| bkt | −0.18 (0↑ 4↓) | +0.18 (7↑ 0↓) | −0.44 (0↑ 10↓) | −0.19 (0↑ 6↓) |

Table: Mean d per world over 12 assumption sets, with the number of sets whose interval lies above (↑) or below (↓)
zero (`npm run simulate -- --grid`; `docs/results/simulation-grid.csv`).

### Findings

**The adaptive policy does what it is meant to do.** Averaged over each world's assumption sets, adaptive questions
are 0.12 (elo) and 0.13 (irt2pl) from a 75 % chance of a right first answer, against 0.27 and 0.28 for the fixed
sequence. In the bkt world the gap is smaller (0.22 against 0.26), probably because a continuous estimate fits a known-or-not
learner less well.

**At 75 %, adaptive practice helps when practice transfers.** In the elo and irt2pl worlds, d grows with transfer:
with no transfer it is between −0.36 and +0.21, with transfer 0.6 between +0.12 and +0.86. The adaptive policy holds
a learner on a skill's prerequisites until they are secure, which pays off only if securing them makes the later
skills easier. The faster learning rate shrinks the advantage, since at that rate the fixed sequence's even coverage
probably already teaches most skills.

**In the bkt world, adaptive practice at 75 % is no better and often worse.** The mean d is −0.18, with four sets
reliably below zero and none above. The mechanism follows from the world's structure. Where a skill is either known
or not, a learner's chance on it is high (one minus the slip rate) or low (the guess rate), with little in between.
A question with a 75 % predicted chance is therefore mostly on a skill the learner already knows, answered right
80–95 % of the time, while a skill not yet known looks hard and is put off. Adaptive practice then drills what is
known rather than what is not.

**A 60 % target is the robust choice.** Aiming at a 60 % chance is never reliably worse than the fixed sequence, in
any world under any assumption tested, and reliably better in 30 of the 36 sets. It is the only comparison with no
↓ in any world. Aiming at 85 % is the worst choice in every world. The reason is the same as in the bkt world: a
higher target pushes practice towards what is already known.

This does not by itself make 60 % the right target for a class. A simulated learner does not get discouraged, while
real students may lose motivation when they get many questions wrong; that is why Math Garden aims at about 75 %
[@klinkenberg2011]. In Math Garden, children set to a higher success rate attempted more problems and improved more
[@jansen2013success], so a lower target may teach more per question but lead to fewer questions. The simulation can
weigh only the learning side of that trade-off. Still, it is the strongest reason to reconsider the target
(`TARGET` in `src/model/policy.ts`) before a real study.

**Limits.** The grid holds 144 comparisons, so a few intervals will exclude zero by chance; the tables are read as
patterns across assumption sets, not as significance tests. Ten classes per cell give intervals wide enough that a
single cell's d is not reliable to better than about ±0.2. Simulated learners answer every question honestly, never
give up, and never help each other. And the comparison is at equal numbers of questions, while a real study controls
practice *time*, which adaptive and fixed questions may use differently.

## 5.4 Is the study ready, and can it find the effect?

Sub-questions 3 and 4 ask whether the system can run the study as designed, and whether that design could detect the
effect the simulations suggest.

### The analysis, written before the data

The analysis is fixed in code before any data exists (`src/model/analysis.ts`) and runs on the tests export with
`npm run analyse`. Writing it first guards against choosing an analysis after seeing the results.

- **Primary: ANCOVA.** The post-test score is regressed on the condition and the pre-test score, with the form order
  (A or B first) and the class as factors when they vary. The condition's coefficient is the effect of adaptive over
  fixed practice, in percentage points, with a 95 % confidence interval and a two-sided p-value. Adjusting for the
  pre-test removes the part of the post-test that was there before practice, which gives a sharper comparison than
  gain scores [@vanbreukelen2006].
- **Secondary: Welch's t-test** on gains (post − pre), which does not assume equal variances [@welch1947].
- **Check:** form A against form B on the pre-test, which should score alike if the forms are parallel.
- **Descriptive:** which mistakes each group made (`npm run mistakes`).

Only students who finished both tests are analysed (a per-protocol analysis); the script reports how many did in each
group. The code uses plain least squares and Student's t, with no statistics library, so the same file runs in the
server, the browser and the scripts. `tests/analysis.test.ts` checks it against hand-worked values and printed
t tables.

### The dry run

`npm run dry-run` (`scripts/dry-run-study.ts`) rehearses the whole study against the real server, through its HTTP
API, with simulated students in place of a class. It makes a class and joins 40 students. The teacher's side moves the
class through the pre-test, a practice session and the post-test. Each student acts as a browser would: test questions
are rebuilt from the class code, practice is chosen by the student's condition from the plan the server sends and
carried forward between refreshes, and each answer is typed and marked by the real checker. Whether an answer is
right comes from a simulated learner, who learns from practice. At the end, the script downloads both exports and runs
the planned analysis on them.

It then checks the study's guarantees, and fails if one breaks (Table 5.7).

| guarantee | result |
|---|---|
| randomised in balanced blocks | adaptive 20, fixed 20 |
| test forms counterbalanced within each condition | AB, BA alternating in both conditions |
| each test on the form its order says | 960 test answers |
| every student finished both tests | 40 of 40 |
| every practice question stored | 1,200 of 1,200 |
| retried uploads stored once | a repeated test answer and attempt each kept once |
| class practice follows each student's condition | 1,200 class-practice questions |
| the model's prediction logged with each question | yes |
| the planned analysis runs on the export | effect +3.2 points, p = 0.573 |
| every wrong test answer could be typed | yes |
| the server marked every answer as the browser did | 2,160 test answers and practice questions marked again |
| nothing arrived after its phase | yes |

Table: The dry run's guarantees: 40 students, 30 practice questions each, 12-question tests (`npm run dry-run`, commit
28f046d; the last two rows from the commit that added server marking). **[TODO: re-run at the final commit and update
the table.]** The class code, and so the test forms, is random on each run, so the effect and p-value in row 9 vary
between runs; the guarantees do not.

A smaller dry run is part of `npm test`, so continuous integration checks the whole pipeline on every push.

On the dry run's export, the planned analysis gives an effect of +3.2 points (95 % CI −8.1 to +14.4, p = 0.57) for
adaptive over fixed, and Welch's test on gains +3.8 points (p = 0.51). These numbers mean nothing about learning:
they come from 40 simulated students with 30 questions each. They show that the export holds what the analysis needs
and that the analysis runs on it. The same is true of the form check, which here shows form A 10.8 points below form
B on the pre-test (p = 0.10). With 20 students per form and 12 items this is within chance, but it is a reminder that
parallel forms built from generated questions are parallel in design, not by measurement; a real study must report
the check, and the ANCOVA's form-order factor absorbs a constant difference between forms.

`npm run mistakes` also runs on the dry run's export (463 wrong test answers, a mistake named in 378). Those figures
describe the dry run's own way of producing wrong answers (it types the answers known mistakes would give, or the
answer with its sign changed), not anything about students. They show only that the mistake analysis reads the export.

### Power

The simulations in 5.3 measure true gain. A real study sees only a 12-question test, answered right or wrong with some
chance even for a learner who knows the skill. `npm run simulate -- --power` runs the planned ANCOVA on that: for each
world and assumption set, it simulates 100 complete studies with pre- and post-tests and counts how often p < 0.05.
With 100 studies each figure is good to about ±4 points. Table 5.8 gives the range of power over each world's 8
assumption sets, and in brackets the highest share of studies that came out significant for adaptive (A) or for fixed
(F).

| design | world | 40 students | 80 students | 160 students |
|---|---|---|---|---|
| 12 skills, 60 questions, 12-question tests | elo | 3–5 % (A 3, F 3) | 3–7 % (A 1, F 6) | 1–4 % (A 3, F 1) |
| | irt2pl | 3–9 % (A 5, F 4) | 4–7 % (A 3, F 5) | 2–4 % (A 3, F 3) |
| | bkt | 6–38 % (A 4, F 38) | 6–68 % (A 2, F 68) | 5–86 % (A 3, F 86) |
| 4 skills, 120 questions, 24-question tests | elo | 4–13 % (A 2, F 12) | 3–23 % (A 5, F 23) | 5–39 % (A 7, F 39) |
| | irt2pl | 3–18 % (A 3, F 17) | 5–22 % (A 6, F 22) | 8–33 % (A 11, F 33) |
| | bkt | 4–19 % (A 3, F 19) | 1–25 % (A 6, F 25) | 2–41 % (A 8, F 41) |

Table: Power of the planned ANCOVA (share of 100 simulated studies with p < 0.05), range over each world's assumption
sets (`docs/results/power.csv`, `docs/results/power-focused.csv`). The focused design is
`--skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160`. **[TODO: commit hash the
CSVs were made at.]**

**As planned, the study cannot detect the effect.** In the elo and irt2pl worlds, where the simulations of 5.3 found
adaptive practice helping, the planned design's power is between 1 and 9 %, which is no more than the 5 % a study
with no effect at all would give. Two things combine:

- **The gains are small for a test.** With 60 questions over 12 skills, each skill gets about five questions, and
  the true gains are a few percentage points. Effects that look clear in true ability (d up to 0.8) shrink to a d
  below 0.1 on the 12-question test (at most 0.09 in the grid), because the test's noise and the spread between
  students are much larger than the gain.
- **Only the bkt world gives power, and in the wrong direction.** Up to 86 % of studies with 160 students come out
  significant, but almost all for the fixed sequence.

**A focused design raises power, but mostly to detect fixed's advantage.** Concentrating practice on four skills,
with twice the questions and a test twice as long, raises power in every world. But the share significant for
adaptive stays at 11 % or below even with 160 students, while the share for fixed reaches 33–41 % with 160 students, at the
faster learning rate or in the bkt world. These power runs use the planned 75 % target.

**What this means for the thesis and for a real study.** The thesis cannot rest on a significant classroom result,
even if a class were found: the planned study would very likely find nothing whatever the truth. It rests instead on
the model's accuracy on real answers (5.2), the simulations with their assumptions stated (5.3), the dry run showing
the system and analysis are ready (above), and this power analysis as the reason a real study needs a different
design. That design would have:

- **few skills**, so that each gets many questions;
- **longer practice and longer tests**, so that the gain is large enough for the test to see;
- **a 60 % target**, the one setting that 5.3 found never worse than fixed;
- **a size chosen by a new power run** at that target. **[TODO: run
  `npm run simulate -- --power --skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160,320`
  with the target set to 0.6 (the `TARGET` in `src/model/policy.ts`, or the simulation's own option if added), and
  report the class size needed for 80 % power in the elo and irt2pl worlds.]**

## 5.5 Usability

Sub-question 5 asks whether teachers and students can use the system. A study only works if a teacher can set up a
class and run its phases without help, and students can join, take the tests and practise on their own devices.

### Method

The protocol is in appendix C (`docs/evaluation/usability-protocol.md`). It needs no school: 5–8 participants
(classmates, student teachers, or teachers where available), one at a time, about 40 minutes each. Five participants
find most usability problems in a design [@nielsen1993]; with so few, the questionnaire score is reported with its
spread and not as a verdict on its own.

Each session runs on a fresh deployment, with a laptop for the teacher role and a phone or tablet for the student
role:

1. **Welcome and consent** (3 min), with the instruction to think aloud.
2. **Background** (2 min): role, how often they use a digital whiteboard, confidence with maths on a computer (1–5).
3. **Tasks** (25 min), one card at a time, each with a time limit. For each task the observer notes success (done,
   done with a hint, not done), time, errors, and what the participant said. A hint is given only after 2 minutes
   stuck, and recorded.
4. **The System Usability Scale** [@brooke1996sus] (3 min), straight after the tasks, in the participant's language.
5. **Debrief** (5 min): the hardest part, what to change first, what was missing.

The tasks cover both the whiteboard and the study:

- teacher role, on a laptop: make a board with a labelled right-angled triangle (T1); write the quadratic formula
  (T2); put a live graph of y = ax² + bx + c on the board and make it touch the x-axis (T3); toss a coin 1,000 times
  and read off the share of heads (T4); set up a study class on algebra with a 6-question test (T5); start the
  pre-test, then a 10-minute practice session (T6); read off which group answered more questions right first time
  (T7);
- student role, on a phone or tablet: join the class and take the test (S1); do five practice questions, opening a
  worked solution at least once (S2); sign out and back in with the student code (S3); delete everything saved
  about them (S4).

The SUS is scored from 0 to 100; about 68 is average across published studies, and above 80 is in the top tenth
[@bangor2009sus]. Its Russian and Georgian versions were translated for this study and should be checked with a native
speaker, or replaced with a published validated translation where one exists.

Problems are recorded one per row with how many participants met them and a severity from 1 (cosmetic) to 4 (blocks
the task), and ranked by severity × frequency. Problems of severity 3–4 are fixed and reported below.

### Results

**[TODO: run the sessions following `docs/evaluation/usability-protocol.md` and report: the participants (number,
roles, devices); task success rate and median time per task (a table of T1–T7 and S1–S4); the mean SUS with its
standard deviation and range, against the benchmark of 68; the problems found, ranked by severity × frequency; and
which were fixed, with the commit.]**

| task | success (✓ / ½ / ✗) | median time |
|---|---|---|
| **[TODO: T1–T7, S1–S4]** | | |

Table: Task success and time per task.

| problem | task | participants | severity | fix |
|---|---|---|---|---|
| **[TODO]** | | | | |

Table: Usability problems found, ranked by severity × frequency.

**Limits.** The participants are classmates and student teachers, not pupils or practising teachers in a classroom,
and they use the system for 40 minutes, alone, with an observer, not for a lesson with thirty students on a shaky
network. The study therefore finds problems in the interface; it cannot show that a real class would run smoothly.
