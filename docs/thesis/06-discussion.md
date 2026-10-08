# 6 Discussion

This chapter asks what the evidence in chapter 5 supports, what it does not, and what a classroom study would need to
look like to answer the research question. It ends with the threats to the validity of each kind of evidence and what
was done about each.

## 6.1 What the evidence shows

The evidence comes in four kinds, and each supports a different claim.

**The system works as specified.** About 280 automated tests check the maths engine, the answer checker, the study
rules, the learner model and the analysis. They compare each against an independent computation or against hand-worked
values, not against the code's own output. The dry run takes simulated students through the whole protocol on the real
server: joining, the pre-test, a timed practice session, the post-test, both exports and the planned analysis. It fails
if a guarantee of the study breaks, such as balanced groups, counterbalanced forms, complete tests, or practice chosen
by each student's own condition. It runs in CI on every push. This is strong evidence that the study, if it were run
tomorrow, would collect the data it promises and analyse it as planned.

**The answer checker marks much as a teacher would.** On 333 typed answers across all 42 skills, the checker agrees
with teacher marking in 91.3 % of cases. It marks every one of the 123 wrong answers wrong. It credits two answers a
teacher would not, and refuses one right answer. Most other disagreements come from deliberately lenient choices: a
rounding slip is sent back for another try rather than marked close. The checker also names the mistake in all 31
wrong answers where a teacher would name one, and in none of the other 92. The corpus was written by the author,
however, so these figures describe the checker on plausible answers, not on a class's real ones.

**The learner model predicts well on data shaped like its own assumptions.** On simulated classes, the three-layer Elo
model reaches a log-loss of 0.550 and an AUC of 0.789 on held-out students, against 0.642 and 0.678 for PFA and 0.641
and 0.679 for BKT. Because the simulated students were built with the same structure as the model, this shows that the
model and its evaluation are implemented correctly. It does not show that the model fits real students.
**[TODO: add the ASSISTments results from 5.2 here: how Elo compares with PFA and BKT on real answers, what the area
layer adds (`elo, one area`), and how well calibrated it is. Rewrite this paragraph around them.]**

**Whether adaptive practice helps depends on assumptions no simulation can settle.** Aiming at a 75 % chance of
success helps in the elo and irt2pl worlds when practice on one skill transfers to the skills built on it. In the bkt
world it is no better than the fixed sequence, and often worse (mean d −0.18, with four of twelve assumption sets
clearly below zero). The mechanism is visible in the logs: in a world where a skill is either known or not, a question
the model rates at 75 % is mostly one on a skill the student already knows, so adaptive practice drills what is known
rather than teaching what is not. The simulation therefore does not say that adaptive practice works. It says under
which assumptions it would, and that those assumptions matter more than the choice of policy.

What the evidence does *not* show is the answer to the research question. No real student has practised with Zeno
under either condition, so there is no measured effect of adaptive practice on learning.

## 6.2 The target: 60 % rather than 75 %

The most robust result of the simulation is not about adaptive practice as such, but about its target. Aiming at a
60 % chance of a right first answer was never worse than the fixed sequence in any of the 36 assumption sets, and
clearly better in 30 of them (mean d +0.69 in the elo world, +0.71 in irt2pl, +0.18 in bkt). Aiming at 85 % was the
worst choice in every world. The reason follows from the mechanism above: a lower target sends students to skills they
have not yet learned, which is where any learning rule gives the most.

Zeno uses 75 % by default because Math Garden does [@klinkenberg2011]. That choice is not about learning per question.
Jansen et al. [-@jansen2013success] varied the success rate in Math Garden to study its effect on anxiety, perceived
competence and performance. Children practised at one of three pre-set success rates for six weeks. The higher the
rate, the more problems they attempted and the more their maths performance improved; anxiety improved equally in all
conditions. In that study, then, an easier target led to more practice, and the extra practice led to more learning.
The simulation has no such mechanism: a simulated student answers every question it is given, so it cannot weigh a
lower target's gain per question against fewer questions attempted. In a classroom with a fixed timed session the
difference may be smaller than in Math Garden's free practice, because both groups practise for the same minutes; but
students who meet more failure may still work more slowly or try less hard on each question.

The thesis therefore recommends reconsidering the target (`TARGET` in `src/model/policy.ts`) before a classroom study,
and suggests 60 % as the candidate, but does not claim that 60 % is better for real students. A classroom study could
test this directly, for example as a third arm, if it were large enough.

## 6.3 Why the planned study cannot detect the effect

The power analysis (5.4) is the most important negative result of this thesis. The planned design (12 skills, 60
practice questions per student, 12-question tests) found a significant difference in only 1–9 % of simulated studies
in the elo and irt2pl worlds, at every class size from 40 to 160 students. That is about the rate expected by chance
alone at α = 0.05. Only in the bkt world did it often reach significance, and then mostly for the *fixed* sequence.

The reason is that the effect shrinks on its way to the test. In the elo world, adaptive practice raises students'
true ability on the practised skills by up to d ≈ 0.8. But with 60 questions spread over 12 skills, each skill gets
about five, and the true gains are a few percentage points. A 12-question test, answered right or wrong with some luck,
measures this with so much noise that the effect on the test score is tiny: at most d ≈ 0.03 in the power runs'
elo and irt2pl worlds, and at most 0.09 for the 75 % target anywhere in the grid (section 5.4). The 60 % target does
better here too, reaching d ≈ 0.24 on the test in the elo world's grid.

A focused design (4 skills, 120 questions, 24-question tests) raises the power, but not in the direction one would
hope. Across all 24 assumption sets with 160 students, at most 11 % of studies were significant in favour of adaptive
practice, while up to 41 % were significant in favour of the fixed sequence. The adjusted effects on the post-test that
favour adaptive practice are small: d from about 0.01 to 0.10, and below 0.05 in most sets.

How large would a study need to be? For a two-group comparison with 80 % power at α = 0.05, the standard approximation
needs about 16 / d² students per group [@cohen1988]. For d between 0.05 and 0.10 that is about 1,600 to 6,300 students
per group. ANCOVA on the pre-test reduces this by a factor of 1 − ρ², where ρ is the correlation between pre- and
post-test [@vanbreukelen2006]. The simulation does not report ρ, but its own power figures give a rough check: in the
focused design's elo world with fast learning, d ≈ −0.19 with 80 students per group was significant in 39 % of
studies, which matches a ρ of roughly 0.7. With that value, the required size falls to about 800 to 3,200 students per
group. Because each power figure rests on 100 simulated studies, it is only good to about ±4 percentage points, and the
d values for adaptive practice vary between class sizes in the same cell, so these sizes are an order of magnitude,
not a plan. The conclusion does not depend on the exact figure: if adaptive practice helps by as much as the simulation
suggests, detecting it on a short test needs more students than one school, and probably more than a few.

Those sizes are for the 75 % target. At 60 %, the focused design was simulated directly with up to 320 students, and
the picture changes (Tables 5.9 and 5.10). The significant results are then almost all in adaptive practice's favour,
and under zpd learning, where a question teaches most when the learner has an even chance, 180 to 1,100 students in
total give 80 % power in the elo and irt2pl worlds: a few hundred per group, which is several classes rather than
dozens of schools. Under flat learning, the effect stays too small to detect at any size a study could reach. A
focused study at 60 % is therefore feasible, but it tests two things at once: whether adaptive practice helps, and
whether learning is concentrated near an even chance. A null result at that size would count against the second as
much as the first.

## 6.4 What a classroom study must look like

From the simulation and power results, a classroom study that can answer the research question needs:

- **Few skills, much practice.** Practice concentrated on three or four related skills, over several sessions rather
  than one, so that each skill gets dozens of questions and the true gains are large enough to measure.
- **A longer, more reliable test.** At least 24 questions on those skills, with the parallel forms checked for
  difficulty on the pre-test as now.
- **A reconsidered target.** 60 % rather than 75 %, or both targets as separate arms.
- **Many classes.** At a 60 % target, 180 to 1,100 students in total for 80 % power if learning is concentrated near
  an even chance (Table 5.10), so about 90 to 550 per group; at 75 %, thousands. That means several classes,
  probably in more than one school. Classes then
  become a level in the analysis; Zeno's ANCOVA already includes the class as a factor, but with many classes a
  multilevel model would be more appropriate.
- **A delayed post-test,** to measure retention as well as immediate gain.
- **Ethics approval and parental consent,** obtained before any data is collected.

Zeno already supports most of this: classes are made with a chosen set of skills, the test length can be set up to 30
questions, the timed sessions keep practice time equal, and the analysis is fixed in advance. A multi-session protocol
and a third arm would need small changes.

## 6.5 Threats to validity

### Internal validity (the simulation)

- **The worlds are assumptions.** How fast students learn, how much practice transfers, and the shape of learning
  were not measured. *Mitigation:* every result is reported across three worlds, two learning shapes, three transfer
  levels and two rates, never for one setting, and the conclusions drawn are only those that hold across them (such as
  the 60 % target never being worse than fixed).
- **The elo world shares the model's structure.** Simulating students the way the model assumes they behave would
  flatter the model. *Mitigation:* the irt2pl world adds a discrimination per skill, and the bkt world has a different
  structure altogether. The bkt world is where adaptive practice did worst, which shows the simulation can produce a
  result against the hypothesis.
- **The grid holds many comparisons.** With 36 assumption sets and four comparisons, some intervals will exclude zero
  by chance. *Mitigation:* the grid is read for patterns across sets, not as a series of significance tests, and no
  single cell is used as evidence.

### External validity

- **ASSISTments is not Zeno.** Its students are US middle-school students, its problems are tagged with a different
  set of skills, and it has no levels. A model that predicts well there may not predict as well in a Georgian
  classroom. *Mitigation:* the evaluation is held-out by student, compares the model with standard alternatives on the
  same data, and reports what the area layer adds when its grouping of skills is rough. **[TODO: state the size of
  the ASSISTments data after cleaning, from the importer's output.]**
- **Usability participants are not pupils.** Classmates and student teachers are older and more used to software than
  the students Zeno is for. *Mitigation:* the protocol includes student tasks on the devices students would use, and
  the result is reported as a usability check of the interface, not of classroom use. **[TODO: describe the actual
  participants once the usability study has been run.]**
- **Simulated students are not real students.** They do not get bored, give up, help each other or guess
  strategically. *Mitigation:* none within a simulation; this is the main reason the thesis does not claim an effect.

### Construct validity

- **The test is short.** It measures the expected score on the class's skills with 12 questions, so it is noisy, as
  the power analysis showed. *Mitigation:* the test length can be set per class, and the recommended design doubles
  it.
- **The marking depends on the checker.** The test score is only as good as the checker's verdicts, which agree with a
  teacher's 91.3 % of the time, with some lenient choices such as sending back rounding slips. *Mitigation:* the
  disagreements are documented and are the same for both conditions; and because every question is rebuilt from its
  skill, level and seed, answers can be marked again with an improved checker.
- **Answers outside the protocol.** A modified client, or a page left open across an update, could send verdicts the
  checker would not give, and a tablet that was offline sends its answers late. *Mitigation:* the server marks every
  answer again and stores its own verdict, keeping the browser's beside it where they differ; it refuses answers to a
  test that has not started; and it marks answers that arrive more than five minutes after their phase as late.
  `npm run analyse` reports both counts per group, and the dry run checks that both are zero when the protocol is
  followed. Late answers are kept in the analysis; a study should report them, and could re-run it without them.
- **The mistakes the checker names are the author's catalogue.** The 17 mistakes were chosen from common knowledge of
  students' slips, not found in students' answers. The checker recognises them reliably, but how often each occurs in
  a class is not known. *Mitigation:* `npm run mistakes` counts them per condition in any real export, so a classroom
  study will show which of them actually occur. The hints they produce are part of the practice for both conditions.
- **Equal practice differs between simulation and classroom.** In a real class the two conditions get equal practice
  *time*; in the simulation they get equal numbers of questions. If adaptive questions take longer, a class would see
  fewer of them than the simulation assumes. *Mitigation:* the dashboard reports practice time and questions per
  student, so the difference can be checked in a real study.

### Conclusion validity

- **Simulation results rest on 10 classes per cell.** *Mitigation:* each result is given with a 95 % interval over
  classes, and only patterns that hold across cells are drawn on.
- **Power figures rest on 100 studies per row,** and are good to about ±4 percentage points. *Mitigation:* the power
  results are used only for conclusions that hold well beyond that margin, such as the planned design's power being
  near α.
- **There is no classroom data.** The research question stays open. *Mitigation:* the thesis says so plainly and
  frames its contributions as the system, the evaluation of its parts, and the design of a study that could answer it.

## 6.6 Summary

The thesis has built a system that is ready to run a classroom study, checked that its parts work, and found two
things a classroom study must take into account before it starts. First, whether adaptive practice helps depends on
how students learn, and a 60 % target is more robust than the conventional 75 %. Second, the study as first planned
could not detect the effect. One that could would have to be more focused, aim at 60 %, and have a few hundred
students, several classes rather than one, and it could detect the effect only if questions near an even chance teach
more than others.
Neither finding answers the research question, but both change how it should be asked.
