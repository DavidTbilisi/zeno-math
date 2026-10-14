# 6 Conclusion and future work

## 6.1 Answers to the hypotheses

H1 asked whether BKT predicts held-out students' answers on the ASSISTments data better than the exponential moving
average. [TODO: the verdict for split seed 1 by the rule fixed in advance, the estimate and its interval, and whether
the other seeds and the class-level intervals agree.]

H2 asked whether, in simulated worlds that break BKT's assumptions, BKT needs fewer answers than the moving average and
the streak rule before its declarations of mastery are right at least 90 % of the time. The answer depends on which
assumption is broken. Where students forget, BKT needs one to two answers fewer than either simpler rule, at both
learning rates, so H2 holds in that world. Where students learn gradually, BKT's declarations were never right 90 % of
the time at any threshold fixed in advance, up to 0.9999, while the moving average and the streak rule reached that
standard by waiting longer, so by the rule fixed in advance H2 does not hold in either gradual world. A check made
after the results, with thresholds up to $1 - 10^{-15}$, qualifies this: BKT then met the standard in three of the four
gradual settings, and at the higher learning rate needed 0.3 to 0.4 answers fewer than the moving average. Its failure
was a matter of where its threshold has to be, not of whether one exists. In BKT's own world, the fitted model was as
precise as Proposition 2 promises for the true parameters.

H3 asked, as an exploratory question, how often the methods agree on real answers. [TODO: the agreement and the
answers after declaration.]

G1 asked what a model too coarse for its learners does. In a world where a skill is several components, each learnt in
the one step BKT assumes, BKT on the skill fails as it did in the gradual worlds: at its usual threshold of 0.95 its
declarations were right 98 % of the time with one component, 59 to 71 % with two, 23 to 28 % with four and under 8 %
with eight or more; no threshold up to 0.9999 met the standard from four components on; and its probability became the
worst calibrated score. The failure follows the share of a skill's components that a question leaves untested, not
their number: when every question asked for every component the skill was one unit again to every method. The part of
G1 that held that the moving average and the streak rule lose less did not hold for precision, which fell as far for
them, and held for calibration and for keeping a threshold that works. Zeno's own skills line up with the sweep: times,
whose questions need all of its ideas, is one unit; hcf and fractions are not.

G2 asked whether the right grain restores what the coarse one lost and under what condition. It does, if and only if
the questions tell the components apart and the practice is long enough to ask about each. BKT on each component kept
its precision at an ordinary threshold at every number of components, and on hcf, carried from the arithmetic settled
earlier, decided sooner than the moving average, was best calibrated and named the missing idea four times in five. On
fractions, sixteen ideas of which a question needs about six, it could not within 30 questions: the sweep showed that
about 120 questions, or one question in four asking for one idea alone, meet the condition, after which it names the
missing idea two times in three and is the only rule that declares fractions mastered in time, and that every question
alone teaches too little to be worth it.

G3 asked what a model too fine for its learners does. Splitting a component that is learnt as one thing into two or
four parts cost answers for no gain in precision, doubled the Brier score with each split, and degenerated the fits as
the evidence per part thinned, from none at the bound to four in five; and more components than the practice can
support, eight or sixteen in 30 questions, left the right grain unable to declare at all, which 120 questions remedied
for eight components and not yet for sixteen; that shortage did not show in the fits, only in the declarations. The
right grain is a property of the model and the practice together.

G4 asked whether the same real answers are predicted better at a finer grain. [TODO: the verdict on ASSISTments by
the pre-specified rule, and the exploratory findings.] On a simulated class the finer grain predicted better for BKT
without a conclusive interval, and the moving average lost less than BKT from coarsening, with an interval that
excluded zero.

Besides these, the thesis proved two results. The streak rule is an EMA rule exactly when the decay rate, threshold and
starting score satisfy the conditions of Proposition 1, which require a decay rate of at least one half; the moving
averages fitted for prediction move far more slowly than that, so in practice the two are different rules. And in a
world that follows BKT's assumptions, BKT's declarations are right at least as often as its threshold says
(Proposition 2), which means that such a world can check how well BKT is fitted but cannot be evidence for it, and
which also says that a skill made of several such components is no longer such a world.

## 6.2 The research question

The research question asked how the level of skill granularity affects the accuracy and reliability of mastery
estimation in adaptive learning systems. The answer from this thesis has three parts. Too coarse a grain, one modelled
skill for several things a student learns separately, lowers the accuracy of every method's declarations, in proportion
to how much of the skill each question leaves untested, and it destroys the reliability of BKT in particular: its
probability stops meaning what it says, and the threshold it would need moves out of the range in which a probability
can be read. The right grain, one component per thing learnt, restores accuracy at an ordinary threshold and a
calibrated probability, and adds something no coarser model has, a statement of which component a student lacks; but
it is usable only where the questions identify the components and the practice is long enough to ask about each, and
where they do not, the finer model cannot declare at all. Too fine a grain, several components for one thing learnt or
more components than the practice supports, costs answers for no gain in accuracy, degrades calibration where a
component is split, and shows itself in degenerate fits in the first case and in declarations that never come in the
second. The simple rules are less affected by grain in calibration and in having a threshold that
can be found, because they assume less, and no less affected in precision, because they therefore know less. Which of
these conditions real students are in is what the real data bear on [TODO: H1 and G4], and in the simulations it is the
questions, more than the model, that decide it.

For Zeno, the recommendation is split by grain and by purpose. To decide mastery of a skill within a session, use an
exponential moving average of each student's first answers on the skill, with a threshold set from the system's own
data once classes have used it, and treat the threshold as a stated trade-off between letting students move on early
and keeping them practising. To choose what to practise next, keep the state at the grain of the ideas that Zeno
already holds, since it can say which idea is weakest even where it cannot yet declare mastery. Where the questions tell
the ideas apart and the practice is long enough, as on hcf now and on fractions with about one isolating question in
four or four times the practice, let BKT on each idea decide mastery too. Zeno's present rule, a fixed chance of 0.8 on
a hard question under the Elo model, was not part of the comparison, and it should be measured in the same way before
the moving average replaces it.

## 6.3 Future work

The most direct extension is the real data. G4 is ready to run on ASSISTments once the data file is imported at a
commit that keeps the problems, and H1 and H3 with it; the three grains the data set allows are only three, and the KDD
Cup 2010 Cognitive Tutor data sets, which tag the same transactions with several knowledge-component models, would
give a finer real grain. A second is to repeat the simulations with other seeds and other amounts of practice, and to
fit the conjunctive model properly, by expectation–maximisation over the hidden states, which could only help the finer
grain. A third is to compare the versions of BKT that relax its assumptions, with forgetting or with parameters for each
student [@yudelson2013; @khajah2016], which may bring its probability closer to the true chance of mastery at a coarse
grain, so that an ordinary threshold works, at the cost of more parameters. A fourth is a check of the ASSISTments
results with each answer kept for one skill only.

A fifth follows from the world of ideas. Zeno's fractions generator now asks for one idea alone in two questions of
five, and its adaptive condition keeps one probability per idea for each student and asks the form for the idea they
are least likely to know. The sweep says that one isolating question in four, or a longer practice, would let that
state decide mastery as well, and that every question alone would teach too little. Whether students who practise this
way master fractions sooner than those who practise operations alone is untested, and belongs to the class study. What
remains is to run on real class answers the three tests of whether an idea is learnt as one thing, whether a question
tests it alone, whether its error rate falls as one smooth curve, and whether practice on one form of it carries over
to the others [@cen2006lfa], which is how the grain of Zeno's own skills would be found rather than drawn by hand.

Zeno's own class data would give a replication on the students the result is meant for. The system already exports
every first answer in the format the evaluation reads, so the prediction test, the agreement of the mastery methods
and the analysis across grains can be run on it unchanged.

The wider question this thesis started from, whether choosing practice questions with a learner model helps a class
learn more than a fixed sequence, remains open, and Zeno is built to study it (Appendix A). A power analysis made for
that study showed that a single class, with the design first planned, would have almost no chance of detecting an
effect, and that a focused design with fewer skills and longer practice and tests would need from about 180 to 1,100
students in total if a question teaches most when a student has about an even chance of answering it right
(`docs/study.md` in the repository). That study needs several classes, ethics approval and a school year, and it
belongs after this one: it would use the mastery rule, and the grain, this thesis recommends.
