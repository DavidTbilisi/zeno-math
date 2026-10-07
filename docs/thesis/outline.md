# Thesis outline

A chapter plan for a bachelor's thesis on Zeno. For each chapter it gives what to argue, where the work is in the
code, and the evidence that backs it. Citation keys are in [references.bib](references.bib).

**Working title:** *Adaptive practice in a self-hosted mathematics whiteboard: design, implementation, and
evaluation before the classroom.*

**Research question:** does choosing practice questions with a learner model (adaptive, aiming at a target chance
of success) help students learn more than a fixed curriculum sequence?

**Sub-questions this thesis can answer without a classroom:**

1. How well does the learner model predict real students' answers, compared with standard student models?
2. Under which assumptions about learning would adaptive practice help, and how robust is that?
3. Is the study, as designed, able to detect the effect, and what design would be?
4. Is the system ready to run the study: do randomisation, counterbalancing, marking, data collection and analysis
   work as specified?
5. Can teachers and students use it?

## 1. Introduction

- **The problem.** Practice is most useful at the right difficulty, but a class gets one sequence for everyone.
  Teachers in Georgia and elsewhere lack free, self-hostable tools that adapt.
- **The aim.** A whiteboard teachers already want to use (`src/math`, 33 tools, 72 shapes and live pieces), with
  an adaptive practice study built in.
- **Contributions.** List them, each with its evidence:
  - the system (chapters 3–4);
  - the learner model and its evaluation (5.2);
  - the simulation study across worlds (5.3);
  - the power analysis and its design recommendation (5.4);
  - a study protocol that has been rehearsed end to end (5.4);
  - the measured accuracy of the answer checker (5.1);
  - the usability study (5.5).

## 2. Background and related work

- **Adaptive practice:**
  - Math Garden and the Elo approach (`klinkenberg2011`, `pelanek2016elo`);
  - ASSISTments (`feng2009assistments`);
  - success-rate targets and motivation (`jansen2013success`), and the zone of proximal development
    (`vygotsky1978`).
- **Student models:**
  - BKT (`corbett1994`);
  - PFA (`pavlik2009pfa`);
  - IRT-based and Elo models;
  - deep knowledge tracing (`piech2015dkt`), and why it is out of scope: it needs training data and is opaque to
    teachers.
  - How student models are judged: log-loss, RMSE, AUC and calibration (`pelanek2015metrics`).
- **Digital maths whiteboards and classroom tools:** GeoGebra Classroom and Desmos Classroom, for what they do and
  don't do (adaptivity, self-hosting, languages).
- **Analysing pre/post experiments:** ANCOVA rather than gain scores (`vanbreukelen2006`), Welch's test
  (`welch1947`), effect sizes and power (`cohen1988`).

## 3. Requirements and design

- **Context.** A school with unreliable Wi-Fi and shared devices, no budget for accounts or cloud services, three
  languages (Georgian, Russian, English), and minors' data.
- **Requirements**, functional and non-functional:
  - self-hosted;
  - works offline mid-lesson;
  - no personal data;
  - reproducible study materials;
  - accessible on phones.
- **Architecture:** [docs/architecture.md](../architecture.md), with its context, building blocks, data model and
  sequence diagrams.
- **Design decisions**, each with its trade-off (the table in architecture.md):
  - Elo rather than BKT or DKT;
  - questions chosen in the browser and checked on the server;
  - questions generated from seeds;
  - codes instead of accounts;
  - SQLite;
  - optimistic locking.
- **The study design:**
  - randomisation in blocks of four;
  - parallel forms A and B, counterbalanced within each condition;
  - teacher-controlled phases;
  - equal practice time;
  - test answers kept away from the model.
  - Sources: `server/research.ts`, `server/protocol.ts`, `src/model/testForms.ts`.

## 4. Implementation

- **The whiteboard:** Excalidraw integration, autosave with conflict handling, tool dialogs loaded on demand, live
  pieces (`src/pages/BoardPage.tsx`, `src/live/`). Keep this brief: it is the platform, not the research.
- **The practice engine:**
  - question generators for 38 skills × 3 levels;
  - the answer checker, with its verdicts correct, close, wrong, and form (sent back);
  - worked solutions.
  - Sources: `src/math/practice.ts`, `src/math/expr.ts`.
- **The learner model:** the three-layer Elo rating, with uncertainty that shrinks as evidence builds
  (`src/model/elo.ts`). Give the formula from its header comment.
- **The policies:**
  - the fixed sequence;
  - adaptive choice: the target chance, prerequisites, mastery, interleaving.
  - Source: `src/model/policy.ts`, `src/model/curriculum.ts`.
- **The client:** a plan carried forward offline, and an outbox (`src/learner.ts`, `src/components/PracticeDialog.tsx`).
- **The server and API:** [docs/api.md](../api.md); security measures (architecture.md, "Quality").
- **The teacher dashboard:** `server/dashboard.ts`, `src/pages/TeacherPage.tsx`.

## 5. Evaluation

### 5.1 Correctness

- **The test suite** (`npm test`, about 260 tests) and CI. Describe how each area is checked against an independent
  computation, not against itself.
- **The answer checker against teacher marking** (`npm run checker-agreement`; `tests/fixtures/answers.json`):
  - 285 answers across all 38 skills, with 89.8 % agreement;
  - every wrong answer is marked wrong;
  - two wrong answers credited, one right answer refused.
  - Discuss the disagreements: rounding slips are sent back rather than marked close, and rounded decimals for exact
    answers are marked wrong.
  - Report the two display and parsing faults found and fixed. A wrong expression was shown in 2.6 % of questions.
    Building the evaluation found it.

### 5.2 The learner model on real answers

- **Method:** student-wise held-out evaluation; metrics (`npm run model`; `src/model/evaluate.ts`).
- **Data:**
  - ASSISTments 2009–2010 (`npm run import-assistments`), with its cleaning steps;
  - the simulated classes for comparison.
- **Results:**
  - a table for Elo, its ablations, PFA, BKT and the counting baselines;
  - a calibration plot (`--calibration`);
  - the parameters fitted on the training students (`--fit`).
- **Discussion:** what the area layer adds, and how ASSISTments differs from Zeno (no levels, US curriculum, skill
  tags).

### 5.3 Would adaptive practice help? A simulation study

- **Method:** three worlds (elo, irt2pl, bkt) × learning × transfer × rate; four comparisons; 10 classes per cell
  (`npm run simulate -- --grid`; `src/model/simulate.ts`).
- **Results:** the tables in [docs/study.md](../study.md), *Simulation study*, from `docs/results/simulation-grid.csv`.
- **Findings:**
  - Adaptive practice at 75 % helps when practice transfers to later skills (elo, irt2pl) and hurts in the bkt world.
  - Aiming at 60 % is never worse than fixed, under any assumption tested.
  - Explain the mechanism in the bkt world: a 75 % question there is mostly on a skill already known.

### 5.4 Is the study ready, and can it find the effect?

- **The analysis**, written before the data: ANCOVA with form order and class, plus the secondary and check
  analyses (`src/model/analysis.ts`, `npm run analyse`), validated against hand-worked values.
- **The dry run:** the whole protocol through the real server with simulated students. Report its ten guarantees
  (`npm run dry-run`; it also runs in CI).
- **Power** (`npm run simulate -- --power`; `docs/results/power*.csv`):
  - The planned design (12 skills, 60 questions, 12-question tests) has power near α in the elo and irt2pl worlds.
  - A focused design detects mostly fixed's advantage.
  - Conclusion: recommend a real study with fewer skills, longer practice and tests, and a 60 % target, and say how
    large it would need to be.

### 5.5 Usability

- **Protocol:** [docs/evaluation/usability-protocol.md](../evaluation/usability-protocol.md). 5–8 participants,
  task success and time, SUS (`brooke1996sus`, `bangor2009sus`, `nielsen1993`).
- **Results:** per task; the mean SUS with its SD; problems ranked by severity; what was fixed.

## 6. Discussion

- What the evidence does and doesn't show; the 60 % target; what a real classroom study must look like.

### Threats to validity

- **Internal (simulation).**
  - The worlds are assumptions. The learning rate, transfer and the shape of learning are not measured, so results
    are reported across them, never for one.
  - The elo world shares the model's structure; the irt2pl and bkt worlds are there to break that.
  - The grid holds many comparisons. Read it as patterns, not as significance tests.
- **External.**
  - ASSISTments students, items and skills differ from Zeno's classes.
  - Usability participants (classmates, student teachers) are not pupils.
  - Simulated students don't get bored, give up or help each other.
- **Construct.**
  - The test measures the expected score on the class's skills with 12 items, so it is noisy.
  - Its marking depends on the checker: 89.8 % agreement, with lenient "send back" choices.
  - Equal practice *time* is controlled in a real class, but in the simulation, equal question *counts*.
- **Conclusion.**
  - Simulation results come from 10 classes per cell, with 95 % intervals over classes; power figures from 100
    studies (±4 points).
  - No real classroom data: the research question stays open, and the thesis says so plainly.

## 7. Conclusion and future work

- **Answers to the sub-questions.**
- **Future work:**
  - the classroom study with the recommended design;
  - a delayed post-test for retention;
  - forgetting in the learner model;
  - teacher-written questions;
  - real-time collaboration (Yjs);
  - screen-reader-accessible maths on the board.

## Appendices

- A. API reference: [docs/api.md](../api.md).
- B. Data model and diagrams: [docs/architecture.md](../architecture.md).
- C. Usability materials: [docs/evaluation/usability-protocol.md](../evaluation/usability-protocol.md).
- D. Reproducing the results (below).

## Reproducing every number

Each command is deterministic for a given commit (seeds are fixed). The run times are on a laptop.

| Result | Command | Time |
|---|---|---|
| Test suite | `npm test` | ~3 min |
| Model on simulated classes | `npm run model -- --simulate --fit` | ~7 s |
| Model on ASSISTments | `npm run import-assistments -- skill_builder_data.csv` then `npm run model -- --observations assistments.json --fit --calibration bins.csv` | minutes |
| Simulation, adaptive vs fixed | `npm run simulate` | ~30 s |
| Simulation grid | `npm run simulate -- --grid --csv docs/results/simulation-grid.csv` | ~3 min |
| Power, planned design | `npm run simulate -- --power --csv docs/results/power.csv` | ~15 min |
| Power, focused design | `npm run simulate -- --power --skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160 --csv docs/results/power-focused.csv` | ~25 min |
| Dry run | `npm run dry-run`, then `npm run analyse -- dry-run/tests.csv` | ~10 s |
| Checker agreement | `npm run checker-agreement` | ~2 s |

Record the commit hash (`git rev-parse HEAD`) with every table in the thesis.
