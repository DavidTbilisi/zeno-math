# 1 Introduction

## 1.1 The problem

Practice is where most mathematics is learned, and how useful a practice question is depends on its difficulty. A
question the student cannot start teaches little, and neither does one they could already answer in their sleep.
Somewhere between the two there is a range where a question is hard enough to need effort but easy enough to be
solved. Vygotsky's zone of proximal development [@vygotsky1978] is the classic name for this idea. Studies of adaptive
practice systems such as Math Garden give it a measurable form: a target chance of success
[@klinkenberg2011; @jansen2013success].

A class, however, usually gets one sequence of questions for everyone. The textbook exercise list or the teacher's
worksheet is fixed before the lesson starts. A student who is ahead spends the lesson on questions that are too easy,
and a student who is behind spends it on questions that are too hard. Adaptive practice systems address this by
estimating what each student knows and choosing the next question from that estimate. Several such systems exist and
are used at scale, but most are commercial services, hosted abroad, and work only in the languages of their home
markets. A school that wants to keep pupils' data on its own premises, that has unreliable Wi-Fi and shared devices,
and that teaches in Georgian or Russian has few options. **[CITATION NEEDED: evidence on the availability of adaptive
maths tools in Georgian schools, e.g. a Ministry of Education or OECD report — or soften the claim to the author's
own experience.]**

There is also a research gap. Adaptive systems are usually evaluated as whole products, against no practice or
against classroom teaching as usual. The narrower question — does the *choice of questions by a learner model* help,
compared with the same questions in a fixed order, when everything else is equal? — is answered less often, and the
answer depends on assumptions about how students learn that are rarely stated.

## 1.2 Aim

This thesis builds and evaluates **Zeno**, a self-hosted mathematics whiteboard with an adaptive practice study built
in. The whiteboard is meant to be something a teacher would use anyway: it is built on Excalidraw [@excalidraw] and
adds 33 mathematics tools (graphs, geometry, algebra step by step, statistics and others), 72 ready-made maths shapes
and live pieces, and an interface in Georgian, Russian and English. Inside it, a practice dialog generates questions
for 42 skills in five areas, at three levels each, checks typed answers, names 17 common mistakes, and shows worked
solutions.

The research layer turns this dialog into an experiment. A teacher creates a class; students join with a code, with no
accounts and no personal data, and are randomised into one of two conditions:

- **fixed**: the class's skills in curriculum order, each at levels 1, 2 and 3;
- **adaptive**: the skill and level where an Elo-style learner model gives the student a target chance of a right first
  answer (75 % by default), skipping mastered skills and those whose prerequisites are weak.

Everything else is the same for both groups: the feedback, the worked solutions, and the practice time. A pre-test and
a post-test in parallel forms measure what was learned.

## 1.3 Research question

The research question of the thesis is:

> **Does choosing practice questions with a learner model (adaptive, aiming at a target chance of success) help
> students learn more than a fixed curriculum sequence?**

The honest position at the time of writing is that this question cannot yet be answered: **no class has used Zeno**,
and no classroom data exist. A bachelor's project cannot wait for ethics approval, a school's timetable and a full
study. The thesis therefore answers the parts of the question that can be answered before the classroom, and prepares
the rest. It asks five sub-questions:

1. **How well does the learner model predict real students' answers, compared with standard student models?** The
   model is evaluated on a public data set of real students' answers (ASSISTments 2009–2010
   [@feng2009assistments]) and on simulated classes, against Performance Factors Analysis, Bayesian Knowledge Tracing
   and simple baselines.
2. **Under which assumptions about learning would adaptive practice help, and how robust is that?** A simulation study
   runs both conditions in worlds that differ in how answers arise from knowledge, how much a question teaches, how
   much practice transfers between skills, and how fast students learn.
3. **Is the study, as designed, able to detect the effect, and what design would be?** A power analysis runs the
   planned analysis on simulated studies of different sizes and designs.
4. **Is the system ready to run the study?** Randomisation, counterbalancing, marking, data collection and the analysis
   must work as specified. A dry run rehearses the whole protocol through the real server, and the answer checker is
   compared with teacher marking.
5. **Can teachers and students use it?** A usability study with a small number of participants measures task success,
   time and the System Usability Scale [@brooke1996sus].

## 1.4 Contributions

The thesis makes the following contributions. Each is listed with the section that gives its evidence.

- **The system.** A self-hosted, offline-tolerant maths whiteboard with an adaptive practice study built in, available
  in three languages, with no accounts and no personal data (chapters 3 and 4).
- **The learner model and its evaluation.** A three-layer Elo-style model (overall, area and skill ability) that learns
  from the first answer, runs in the browser and on the server, and is compared on held-out students with PFA, BKT and
  counting baselines (section 5.2). On simulated classes it reaches a log-loss of 0.550 and an AUC of 0.789, against
  0.642 and 0.678 for PFA. **[TODO: the result on ASSISTments, from `npm run import-assistments -- skill_builder_data.csv`
  then `npm run model -- --observations assistments.json --fit --calibration assistments-bins.csv`.]**
- **A simulation study across worlds.** Adaptive practice at 75 % helps when practice transfers to later skills in two
  of the three simulated worlds, and hurts in the third. Aiming at 60 % is never worse than the fixed sequence under
  any of the 36 assumption sets tested, and better in 30 of them (section 5.3).
- **A power analysis and a design recommendation.** The study as first planned (12 skills, 60 questions, 12-question
  tests) has power close to the 5 % false-positive rate in two of the three worlds. The thesis recommends a focused
  design with fewer skills, longer practice and tests, and a 60 % target (section 5.4).
- **A study protocol rehearsed end to end.** A dry run with simulated students joins a class through the real HTTP API,
  runs the pre-test, a practice session and the post-test, downloads the exports and runs the pre-registered
  analysis; it checks the study's guarantees on every push to the repository (section 5.4).
- **The measured accuracy of the answer checker.** On 333 typed answers marked as a teacher would, the checker agrees
  91.3 % of the time and marks every wrong answer wrong. Where a teacher would name the mistake behind a wrong answer
  (31 cases), the checker names the same one in all of them, and names none in the other 92 wrong answers
  (section 5.1).
- **A usability study** of the board and the class study (section 5.5). **[TODO: participants, task success and the
  mean SUS, from the protocol in docs/evaluation/usability-protocol.md.]**

All code, data and results are in one repository. Every number in the thesis comes from a command listed in
Appendix D, with fixed seeds, so it can be reproduced for a given commit.

## 1.5 Structure of the thesis

Chapter 2 reviews adaptive practice systems, the student models used to drive them and the ways those models are
judged, existing classroom maths tools, and the statistics of pre/post experiments. Chapter 3 sets out the context
and requirements and the design that follows from them, including the design of the class study. Chapter 4 describes
the implementation: the whiteboard briefly, then the practice engine, the learner model, the question-choosing
policies, the client, the server and the teacher dashboard. Chapter 5 evaluates the system in five parts, one for each
sub-question: correctness and the answer checker (5.1), the learner model on real answers (5.2), the simulation study
(5.3), the readiness and power of the study (5.4), and usability (5.5). Chapter 6 discusses what the evidence does and
does not show, and the threats to its validity. Chapter 7 answers the sub-questions and sets out future work, first
of all the classroom study in the design the evidence recommends.

In short, the thesis does not claim that adaptive practice works. It builds the instrument to find out, shows where
and why it should work, and says what a fair test would need. The next chapter places that work among existing
adaptive systems and student models.
