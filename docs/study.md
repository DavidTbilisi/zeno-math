# The class study

Everything about Zeno's research side: how a class study runs, the learner model, the simulations, the dry run and
the answer checker. The HTTP routes are in [api.md](api.md), the design in [architecture.md](architecture.md), and a
chapter plan for the thesis in [thesis/outline.md](thesis/outline.md).

## How a study runs

Zeno can record practice for a study that compares ways of choosing exercises (an adaptive learner model against a
fixed sequence). A teacher makes a class; students join it in the Practice dialog with the class code. Each student is
given a student code to write down (it brings their record back on any device) and is assigned a condition at random,
in blocks of four, so every class is split two-and-two as it fills. Only the codes are stored: no names or emails.

From then on, every question a student tries is saved: the skill, level and seed (so the exact question can be
rebuilt), each answer typed with its verdict (correct, close, wrong, or sent back for its form) and the time it took,
whether the answer was revealed or the worked solution looked at, and how long the question took in all. Finished
questions wait in the browser until the server has them, so a dropped connection loses nothing, and a retried upload
is stored once. A student can delete everything saved under their code from the dialog.

A signed-in student practises in one of two ways:

- **Class practice:** the study chooses each question from the class's skills, and the student's condition decides
  how (`src/model/policy.ts`):
  - *fixed*: the skills in curriculum order, each at levels 1, 2 and 3 with two questions per level, then round again.
  - *adaptive*: the skill and level where the learner model gives the student about a 75 % chance of a right first
    answer, as in Math Garden. It skips skills the student has mastered (80 % at level 3) and skills whose
    prerequisites they've shown weakness in (under 50 % at level 2). A skill from the last three questions counts as
    further from the target, so practice interleaves.

  Everything else is the same for both groups: the feedback, the worked solutions, and missed questions coming back
  three questions later.
- **Free practice:** the student picks the topic and level, as without a class.

Each attempt records who chose it (`adaptive`, `fixed`, `free` or `review`) and the model's chance of a right answer
when the question appeared (`predicted`), so the model can be checked against what happened. The browser gets the
class-wide difficulties and its student's own ratings from the server (`/api/students/:code/plan`). It carries them
forward after every answer, so class practice keeps going if the connection drops mid-lesson. The server refuses a
class-practice attempt that claims the other condition's policy, and marks every answer again with the same checker:
the verdicts stored, and the summaries the model learns from, are the server's, with the browser's kept beside any it
gave differently.

**The protocol.** The teacher runs the study from the dashboard by setting what the class is doing now. Students see
the change within half a minute:

- *Open practice:* class practice whenever students like, untimed.
- *Pre-test* / *post-test:* the test, for students who haven't finished it. Class practice waits.
- *Timed session:* class practice with a countdown, the same window for everyone in the room, so both groups get equal
  practice time. When it ends, class practice stops; free practice stays open.
- *Closed:* no class practice.

The browser waits for the phase, and the server logs every change. An answer that reaches the server more than five
minutes after its phase ended (a test answer after its test, class practice after the practice time) is kept and
marked `late`: a tablet that was offline uploads when it can, and nothing is lost. The analysis says how many there
were.

The two tests come in parallel forms, A and B. Both ask about the same skills at the same levels in the same order, but
with different questions, built from the class code, so every browser and the server build the same form. Within each
condition, students alternate between taking A first and B first, so a harder form can't pass for learning; the
dashboard compares the forms on the pre-test. A test shows no marks and no solutions. Only a wrong-*form* message
("lowest terms") allows another try, so notation isn't penalised. Passing a question counts as an answer. Each question
is answered once; the server works out which question it was from the form, so a client can't answer a question that
wasn't on its test, and marks the answer itself. A test can't be answered before the teacher starts it. Test answers
never reach the learner model, so the outcome measure stays independent of what the
adaptive condition learns from. The test length is set per class (4–30 questions, default 12).

Teachers follow a class at **`#/teacher`** (linked from the home page; it asks for `TEACHER_PASSWORD` when one is
set). There they can make classes and hand out the codes, and see for each class:

- **The two groups** side by side: students, questions answered, right first time, the model's expected chance and how
  far class practice was from the 75 % target, the median time per question, how often the worked solution was opened,
  and how often a question was left unfinished.
- **Mastery by skill:** one row per student, one column per skill, shaded by the chance of a right first answer at
  medium level. The scale has five bins, validated as an ordinal colour ramp for both light and dark mode, and grey
  means no answers yet. Each group's average sits on top. Hovering a cell gives all three levels; "show numbers" puts
  the percentages in the cells.
- **The pre- and post-test:** scores per group as mean (SD, n) over completed tests, the gain for students who
  completed both, Cohen's d of the gain as a first look, and the form check. Each student's scores also appear beside
  their row in the heatmap, in brackets while a test is unfinished.
- **Practice time per student,** from the questions class practice chose: the check that both groups got equal time.
- **Whether the model predicts well:** the chance logged when each question appeared, against what the student then
  did, as a calibration plot (bigger dots rest on more answers), with log-loss, AUC and a table view.

The same data is at `/api/research/dashboard?class=CODE`, and the CSV download is on the page.

```bash
# make a class (send the header only if TEACHER_PASSWORD is set); skills: skill ids and/or areas, default every skill there is when the class is made (kept if skills are added later)
curl -X POST localhost:8787/api/classes -H 'Content-Type: application/json' -H 'X-Teacher-Password: …' \
  -d '{"name":"7B","skills":["algebra","average"]}'
# classes, with how many students are in each condition
curl localhost:8787/api/classes -H 'X-Teacher-Password: …'
# every attempt as CSV (add ?class=CODE for one class); students appear as s1, s2, … and never by their code
curl -OJ localhost:8787/api/research/attempts.csv -H 'X-Teacher-Password: …'
# every test answer: student, condition, form order, test, form, question, skill, level, seed, what was typed (as JSON), verdict
curl -OJ localhost:8787/api/research/tests.csv -H 'X-Teacher-Password: …'
# move a class on: open | pretest | session (with minutes) | posttest | closed
curl -X POST localhost:8787/api/classes/CODE/phase -H 'Content-Type: application/json' -H 'X-Teacher-Password: …' \
  -d '{"phase":"session","minutes":20}'
```

**The analysis** is fixed before any data exists (`src/model/analysis.ts`) and runs on the tests export:

```bash
npm run analyse -- zeno-tests.csv
```

- *Primary:* ANCOVA. The post-test score is modelled from the condition and the pre-test score, with the form order
  (A or B first) and the class as factors when they vary. The condition's coefficient is the effect of adaptive over
  fixed practice, reported in percentage points with a 95 % confidence interval and a two-sided p-value. It also gives
  the adjusted means and d in post-test SDs.
- *Secondary:* Welch's t-test on gains.
- *Check:* form A against form B on the pre-test.
- *Descriptive:* which mistakes each group made. `npm run mistakes -- zeno-tests.csv` (or the attempts export)
  checks every wrong answer again against its question and counts the known mistakes it shows, per condition and
  phase (see [Answer checker](#answer-checker)). It works on any export, including ones made before the checker
  named mistakes, because skill, level and seed fix the question.

Only students who finished both tests are analysed; the script says how many in each group did. It also counts, per
group, the test answers that came late and those the browser marked differently from the server (the analysis uses
the server's verdicts and keeps every answer). Report these and the practice time per group from the dashboard
alongside it.

**On paper.** **Print the tests** on the teacher page shows both forms of the class's test, with a line for each
answer and an answer key per form; print it, or save it as a PDF. These are the questions the students' browsers
build, so a paper test can be a backup when the network fails.

**Screen readers.** Each question's words and maths (as MathML) are in the page for screen readers, on the screen
and on paper, so a student who can't see the picture can still take part.

Students see what taking part means before they join a class: what is saved, that the class is split into two
groups at random, that taking part is up to them, and how to delete everything. **Join** waits until they tick that
they agree. Set `TEACHER_PASSWORD` whenever students use the server, or any of them could download the class's data.
Before collecting data from real students, check what consent and ethics approval your school or university
requires; for children, a parent's consent usually comes first.

## Learner model

`src/model/elo.ts` estimates what each student knows with an Elo-style rating (Pelánek 2016; Klinkenberg et al. 2011,
Math Garden). The chance of a right first answer is σ(ability − difficulty). Ability has three layers (overall, area,
skill), so a skill the student hasn't tried starts from what they showed in its area. Difficulty belongs to a skill
(shared by its levels) plus a smaller adjustment for each level. Each answer moves every term by the surprise (result
− prediction), with steps that shrink as evidence builds up. `mastery()` gives the chance of a right answer at each
level of a skill.

`npm run model` judges the model on students it has never seen. A fifth of the students are held out (chosen by a
hash of their id, so the split is the same on every run). Every model fits, or warms up, on the rest, then predicts
the held-out students' answers one by one, learning from each after predicting it. It reports log-loss, RMSE, AUC,
accuracy and calibration for:

- the model, and versions of it without its middle layers (ablations);
- two standard student models:
  - *PFA*, Performance Factors Analysis (Pavlik, Cen & Koedinger 2009): a logistic regression on each skill's earlier
    right and wrong answers.
  - *BKT*, Bayesian Knowledge Tracing (Corbett & Anderson 1994): a skill is known or not, with guess and slip. Its
    parameters per skill come from a grid search on the training students.
- three counting baselines.

```bash
npm run model -- zeno-attempts.csv                  # the CSV export
npm run model -- --observations assistments.json    # a public data set (below)
npm run model -- --simulate                         # synthetic learners with a known truth (src/model/simulate.ts)
#   --fit                    also search α, β on the training students and score the best on the held-out ones
#   --test-share 0.2 --seed 1    how many students are held out, and which
#   --calibration bins.csv   every model's calibration bins, for a plot
```

On the built-in simulation (120 students × 150 questions; 18 held out):

| model | log-loss | AUC |
|---|---|---|
| Elo, three layers | 0.550 | 0.789 |
| Elo, no area layer | 0.558 | 0.782 |
| Elo, skill layer only | 0.597 | 0.741 |
| PFA | 0.642 | 0.678 |
| BKT | 0.641 | 0.679 |
| per student & skill rate | 0.654 | 0.653 |
| per skill & level rate | 0.626 | 0.704 |
| overall rate | 0.693 | 0.505 |

The defaults were chosen on simulated classes, which are built with the same structure as the model, so these numbers
only show that it works. PFA and BKT know nothing of levels, which the simulation has; on data without levels that
doesn't hold them back.

**On real answers.** Until a class uses Zeno, the model can be tried on a public data set of real students. The data
set is ASSISTments 2009–2010 "skill builder" (Feng, Heffernan & Koedinger 2009): thousands of middle-school
students' first attempts at maths problems, each tagged with the skills it practises. (The importer prints the exact
numbers it keeps.) Download `skill_builder_data.csv` (the corrected
version) from the ASSISTments data site, then:

```bash
npm run import-assistments -- skill_builder_data.csv      # writes assistments.json
npm run model -- --observations assistments.json --fit --calibration assistments-bins.csv
```

The importer keeps main problems only (not the scaffolding questions a wrong answer opens), with a skill and a 0/1
first-attempt result, in the order they were answered. A problem with two skills counts once for each. Every
question is level 2, since the data has no levels. The model's area layer uses a rough grouping of the skill names
into topics (number, algebra, geometry, data, other); `elo, one area` in the output shows what that grouping adds.
Report this table: it is the evidence on real answers.

## Simulation study

`npm run simulate` runs the two conditions on simulated classes: 60 students, 60 questions each, on the 12 algebra
skills, 10 classes per row. Change these with `--skills`, `--students`, `--questions`, `--runs` and
`--test-length`. Simulated learners have the 38 skills Zeno had when the results in `docs/results/` were made
(`SIM_SKILLS`): the world draws its random numbers skill by skill, so a skill added later would change every number. The result depends on what a simulation has to assume, so it is run across all of these:

- **The world**, meaning how answers come from what a learner knows (`src/model/simulate.ts`):
  - *elo*: σ(ability − difficulty), the learner model's own form.
  - *irt2pl*: the same, with a discrimination per skill.
  - *bkt*: a skill is known or not, with guesses and slips. A world unlike the model's checks that the result isn't
    an artefact of simulating the model's own assumptions.
- **Learning**, meaning how much a question teaches:
  - *flat*: always the same.
  - *zpd*: most at an even chance.
- **Transfer**: how much practising a skill helps the skills built on it.
- **Rate**: how fast students learn.

Cohen's d of adaptive over fixed in true gain (the learner's real chance on every skill and level, before and
after):

| world | learning | rate | transfer 0 | transfer 0.3 | transfer 0.6 |
|---|---|---|---|---|---|
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

**Adaptive questions sit nearer the target.** In the elo and irt2pl worlds they are about 0.12 from a 75 % chance on
average, against about 0.27 for the fixed sequence. In the elo and irt2pl worlds, adaptive practice helps when practice transfers to later
skills. In the bkt world it is no better, and often worse. There, a question with a 75 % chance is mostly one on a
skill the student already knows (80–95 % right), so adaptive practice drills what is known rather than what isn't.

`npm run simulate -- --grid` also tries adaptive practice aiming at 60 % and at 85 %, and random questions. The
table gives the mean d over each world's 12 assumption sets. In brackets: how many sets had a 95 % interval above
zero (↑) and how many below (↓):

| world | adaptive (75 %) vs fixed | adaptive 60 % vs fixed | adaptive 85 % vs fixed | adaptive vs random |
|---|---|---|---|---|
| elo | +0.21 (5↑ 1↓) | +0.69 (12↑ 0↓) | −0.15 (2↑ 5↓) | +0.33 (8↑ 2↓) |
| irt2pl | +0.35 (7↑ 0↓) | +0.71 (11↑ 0↓) | +0.03 (3↑ 3↓) | +0.41 (8↑ 0↓) |
| bkt | −0.18 (0↑ 4↓) | +0.18 (7↑ 0↓) | −0.44 (0↑ 10↓) | −0.19 (0↑ 6↓) |

**A 60 % target is the robust choice.** Aiming at a 60 % chance is never worse than the fixed sequence, in any world
under any assumption, and better in 30 of the 36 sets. A simulation can't say what harder questions do to
motivation, which is why Math Garden aims at 75 %. Still, this is the strongest reason to reconsider `TARGET` in
`src/model/policy.ts` before a real study.

**Power.** `npm run simulate -- --power` runs the planned ANCOVA on what a class would actually see: 12-question
tests, answered right or wrong by chance. It counts how often p < 0.05, over 100 studies per row, so each figure is
good to about ±4 points. The table gives the range over each world's 8 assumption sets. In brackets is the highest
share of studies that came out significant for adaptive (A) or for fixed (F):

| design | world | 40 students | 80 students | 160 students |
|---|---|---|---|---|
| 12 skills, 60 questions, 12-question tests | elo | 3–5 % (A 3, F 3) | 3–7 % (A 1, F 6) | 1–4 % (A 3, F 1) |
| | irt2pl | 3–9 % (A 5, F 4) | 4–7 % (A 3, F 5) | 2–4 % (A 3, F 3) |
| | bkt | 6–38 % (A 4, F 38) | 6–68 % (A 2, F 68) | 5–86 % (A 3, F 86) |
| 4 skills, 120 questions, 24-question tests | elo | 4–13 % (A 2, F 12) | 3–23 % (A 5, F 23) | 5–39 % (A 7, F 39) |
| | irt2pl | 3–18 % (A 3, F 17) | 5–22 % (A 6, F 22) | 8–33 % (A 11, F 33) |
| | bkt | 4–19 % (A 3, F 19) | 1–25 % (A 6, F 25) | 2–41 % (A 8, F 41) |

The second design is `--skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160`.

**What the power table means for the thesis.** As designed, the study can't detect the difference the simulation
predicts:

- **The gains are too small for the test.** With 60 questions over 12 skills, each skill gets about five questions,
  and the true gains are a few points. A 12-question test can't see that against how much students differ. Even the
  elo-world gains that look clear in true ability (d up to 0.8) shrink to d ≈ 0.05 on the test.
- **A focused study shows fixed more often than adaptive.** Concentrating the practice on fewer skills, with more
  questions and a longer test, raises the power. But what it then detects is mostly the fixed sequence's advantage,
  at the faster learning rate or in the bkt world.

So the thesis can't rest on a significant class result. It rests on four things:

1. the model's accuracy on real answers;
2. the simulations, with their assumptions stated;
3. the dry run, showing the system and analysis are ready;
4. this power analysis, as the reason a real study needs a focused design and probably a 60 % target.

The CSVs behind these tables are in [`docs/results/`](results/).

## Dry run

`npm run dry-run` rehearses the whole study with simulated students against the real server, through its HTTP API:

1. It makes a class and joins 40 students, who are randomised in blocks.
2. It runs the pre-test, a practice session and the post-test. Each student answers like a browser would:
   - test questions are rebuilt from the class code;
   - practice is chosen by the student's condition from the plan the server sends, carried forward between refreshes;
   - answers are typed and marked by the real checker.
3. It downloads both exports and runs the analysis on them.

It checks the study's guarantees and fails if one breaks:

- the groups are balanced;
- the forms are counterbalanced within each condition;
- each test is on its form;
- every test is complete;
- every practice question is stored, and a retried upload is stored once;
- class practice follows each student's condition;
- the model's prediction is logged with each question;
- the planned analysis runs on the export;
- every wrong test answer could be typed;
- the server marked every answer as the browser did;
- nothing arrived after its phase.

```bash
npm run dry-run                                         # 40 students, 30 questions, 12-question tests (~10 s)
npm run dry-run -- --students 60 --world bkt --out dry-run
npm run analyse -- dry-run/tests.csv
npm run model -- dry-run/attempts.csv
```

A smaller dry run is part of `npm test`, so CI checks the whole pipeline on every push.

## Answer checker

A test score is only as good as its marking. [`tests/fixtures/answers.json`](../tests/fixtures/answers.json) has 333 typed answers to questions from
all 42 skills, each marked the way a teacher would:

- correct;
- close (a rounding slip);
- wrong;
- form (the right idea, sent back: not simplified, not factorised, not exact, a root missing, unreadable).

`npm run checker-agreement` compares the checker's verdicts with that marking:

| teacher \ checker | correct | close | wrong | form |
|---|---|---|---|---|
| correct (158) | 155 | 0 | 1 | 2 |
| close (16) | 0 | 0 | 3 | 13 |
| wrong (123) | 0 | 0 | 123 | 0 |
| form (36) | 2 | 0 | 8 | 26 |

The checker agrees 91.3 % of the time. It marks every wrong answer wrong. It credits two answers a teacher wouldn't:

- `13*17` for "work out 13 × 17";
- an integral without `+ C`.

It rejects one right answer: `50%` as a probability.

Its other disagreements are mild:

- **Rounding slips are sent back, not marked close.** The checker never gives "close", so a slip costs a retry
  rather than a mark.
- **A rounded decimal for an exact answer is marked wrong.** A teacher would ask for the exact value instead.
- **A few forms it can't read come back as unreadable**, such as `76.24 to 82.16`.

**Naming the mistake.** Many wrong answers are predictable: ½ + ⅓ answered as 2/5 (tops and bottoms added),
(2x + 7)² as 4x² + 49, x > −8 where dividing by a negative should have turned the sign round. Each question lists the
answers the known mistakes would give from its own numbers ([`src/math/mistakes.ts`](../src/math/mistakes.ts) has the
17 of them), and "right size, wrong sign" is tried on every question. A wrong answer that matches one is still marked
wrong and counts as a miss; in practice the student also reads what the slip was and a number to test it with. Tests
give no feedback, so the names appear only in the exports' analysis.

31 of the wrong answers in the corpus show a mistake a teacher would name. The checker names the same one in all 31,
and names none in the 92 wrong answers that show no known mistake. The catalogue is the author's list of common slips, not one
found in students' answers, so this says what the checker can recognise, not how often students make each mistake.

Building the corpus found two real faults, now fixed:

- About one question in forty (2.6 % of 22,800 sampled) showed its expression wrong. `-3x^3` came out as
  `x^{3} -3` in functions, calculus and expansion questions.
- Lists of exact answers like `-4 - 2sqrt(3); -4 + 2sqrt(3)` couldn't be read, because the closing bracket of
  `sqrt(3)` was taken for the list's.

Exact roots, "or" between roots and `±` are now accepted. `tests/checker.test.ts` fails if agreement drops or the
checker starts crediting wrong answers.
