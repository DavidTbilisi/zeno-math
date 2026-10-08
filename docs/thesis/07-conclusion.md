# 7 Conclusion and future work

This thesis set out to ask whether choosing practice questions with a learner model helps students learn more than a
fixed curriculum sequence. Without access to a classroom, it answered five narrower questions that a classroom study
depends on. This chapter gives those answers, says what remains open, and lists the work that would close it.

## 7.1 Answers to the sub-questions

1. **How well does the learner model predict real students' answers, compared with standard student models?**
   On simulated classes, the three-layer Elo model predicts held-out students' answers better than PFA, BKT and three
   counting baselines (log-loss 0.550 and AUC 0.789, against 0.642 and 0.678 for PFA and 0.641 and 0.679 for BKT), and
   each of its layers adds to that. Since the simulated students share the model's structure, this shows only that the
   model and its evaluation work. **[TODO: the answer on real answers, from the ASSISTments evaluation in 5.2: the
   table's headline figures, whether Elo beats PFA and BKT there, and whether it is well calibrated.]**

2. **Under which assumptions about learning would adaptive practice help, and how robust is that?**
   Adaptive practice aiming at a 75 % chance of success helps when practice on one skill transfers to the skills built
   on it and answers follow a smooth, Elo-like relation to ability (the elo and irt2pl worlds). It does not help, and
   often harms, when a skill is either known or not (the bkt world), because the questions it picks are then mostly on
   skills already known. The result is not robust to these assumptions. What is robust is the target: aiming at 60 %
   was never worse than the fixed sequence in any of the 36 assumption sets, and better in 30.

3. **Is the study, as designed, able to detect the effect, and what design would be?**
   No. With 12 skills, 60 practice questions and 12-question tests, the planned study finds a significant difference no
   more often than chance in the elo and irt2pl worlds, at any class size up to 160 students. A focused design with 4
   skills, 120 questions and 24-question tests does better, but still detects adaptive practice's advantage in at most
   11 % of studies. Detecting the small effects the simulation predicts would take on the order of several hundred to
   several thousand students per group, depending on the effect and on how strongly the pre-test predicts the
   post-test. A real study should therefore be focused, run over several sessions, use a longer test, compare a 60 %
   target with 75 % rather than assume it, and pool many classes.

4. **Is the system ready to run the study?**
   Yes. Randomisation in blocks of four, counterbalanced parallel forms, teacher-controlled phases, equal practice time,
   data collection that survives dropped connections, and the analysis fixed in advance are all implemented and tested.
   The dry run carries simulated students through the whole protocol on the real server and checks the study's
   guarantees on every push. The answer checker, which marks the tests, agrees with teacher marking on 91.3 % of 333
   answers. It marks every wrong answer wrong; it credits two answers a teacher would send back for their form, and both
   are documented.

5. **Can teachers and students use it?**
   **[TODO: the usability study's results: task success rates, the mean SUS with its SD, and the most serious problems
   found and fixed. Until then: the protocol is ready (docs/evaluation/usability-protocol.md), and the interface is
   covered by end-to-end tests of a board, the class study, practice and printing.]**

## 7.2 The research question

The research question remains open. No real student has practised with Zeno under either condition, so this thesis
cannot say whether adaptive practice helps students learn more than a fixed sequence. What it can say is narrower but
still useful. The answer depends on how students learn, in ways a simulation can describe but not settle. If adaptive
practice does help, the effect on a short classroom test is small, and a single class could not detect it. And the
conventional target of 75 % is a weaker choice than 60 % under every assumption tested, although the simulation cannot
judge what a harder target does to students' willingness to practise; in Math Garden, children at higher success
rates attempted more problems and improved more [@jansen2013success].

## 7.3 Future work

- **The classroom study with the recommended design.** A focused study over several sessions, with a longer test and
  a 60 % target, across enough classes to have the power the simulation calls for. This is the work that would answer
  the research question.
- **A delayed post-test.** Measuring what students still know weeks later would show whether adaptive practice
  affects retention, not only the immediate gain.
- **Forgetting in the learner model.** The Elo model assumes that what a student has shown stays known. A model of
  forgetting would let practice bring back skills at the right time, and would matter for any study over several
  sessions.
- **Teacher-written questions.** All practice questions are generated from 42 built-in skills. Letting teachers add
  their own would fit Zeno to their curriculum, though their difficulty would have to be learned from answers.
- **Real-time collaboration.** Boards are saved with optimistic locking, so two people editing one board take turns.
  A shared-editing layer such as Yjs would let a teacher and a class work on one board at once.
- **Screen-reader-accessible maths on the board.** Practice and test questions are already readable by screen
  readers, as MathML. The maths drawn on the board is not yet.

## 7.4 Closing

Zeno began as a whiteboard teachers might want to use and became a platform for a study that has not yet been run.
The work in this thesis makes that study possible and shows what it must look like to be worth running: which
assumptions it tests, which target it should use, and how large it must be. Its most useful result may be the least
welcome one, that a single class would not have been enough. Knowing that before collecting any data from children is
the main thing a thesis without a classroom can offer the classroom study that follows it.
