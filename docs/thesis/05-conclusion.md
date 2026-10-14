# Conclusion and future work

At one grain, BKT decides mastery more cheaply than simpler rules where learning happens all at once, even with some
forgetting, and where learning is gradual it reaches a high standard of precision only at thresholds far closer to 1
than any probability can be read, while the moving average reaches it by waiting longer. Across grains, the gradual
pattern is what a coarse grain does: a skill of several components looks gradual from outside, in proportion to what
each question leaves untested, and every method's precision at its usual threshold falls with it, BKT's probability
furthest. The right grain restores precision and an ordinary threshold, and lets the model say what a student lacks,
on the condition that the questions identify the components and the practice is long enough to ask about each; on
Zeno's fractions that takes about 120 questions or one isolating question in four. Finer than the learners costs
answers for nothing and shows itself in degenerate fits; more components than the practice supports shows itself only
in declarations that never come. For Zeno the evidence points to the moving average for deciding
mastery at the grain of the skill, with a threshold set from data, and to the state at the grain of the ideas for
choosing what to practise next, becoming the mastery rule where the questions and the practice allow it. The real data
across grains, where BKT predicts better at the data set's grain than at any coarser one and the EMA does not, and the
prediction test at one grain, where BKT beats the EMA, both place real students nearer the worlds in which the skill
tags carry learning that a known state can use than the gradual ones; the fits at the bound and the share wrong after
a declaration at 0.95 say that the tags are not yet the components.

## Answers to the hypotheses

H1 asked whether BKT predicts held-out students' answers on the ASSISTments data better than the exponential moving
average. On split seed 1 BKT's mean log-loss per answer is lower than the EMA's by 0.0225, with a 95 % interval of
[−0.0264, −0.0183] from 10,000 resamples of the held-out students; the interval excludes zero and the estimate exceeds
the 0.005 fixed as the smallest difference that counts, so by the rule fixed in advance BKT is better and H1 holds. The
four other splits give the same verdict, with estimates from 0.021 to 0.025, and so does resampling whole classes.

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

H3 asked, as an exploratory question, how often the methods agree on real answers. On the held-out ASSISTments practices BKT at 0.95, the EMA at the
streak rule's cost and the streak rule with N = 3 agree in most practices: both members of each pair declare in 38 to
46 % of practices and neither in 29 to 41 %. BKT is the most generous, declaring in 69 % of practices against 48 % for
the simple rules, and the earliest, by 1.0 answer against the EMA and 1.5 against the streak rule where both declare.
The next three answers after a declaration are right 78.6 % of the time after BKT, 80.4 % after the EMA and 77.2 %
after the streak rule, against 66.6 % of all held-out answers.

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

G4 asked whether the same real answers are predicted better at a finer grain. On ASSISTments BKT at the data set's own grain, 110 skills,
predicts held-out answers better than at one skill, by 0.0346 per answer with an interval of [−0.0392, −0.0302], so G4
holds by the rule fixed in advance; each step of coarsening costs BKT, and the EMA predicts slightly better at the
coarser grains, so that coarsening costs BKT 0.041 per answer more than it costs the EMA, with an interval that
excludes zero. The declarations move with the grain, BKT needing 3.3 answers at the finest grain and 8.9 at the
coarsest, with the share right after a declaration falling from 79 % to 73 %. On a simulated class the finer grain predicted better for BKT
without a conclusive interval, and the moving average lost less than BKT from coarsening, with an interval that
excluded zero.

Besides these, the thesis proved two results. The streak rule is an EMA rule exactly when the decay rate, threshold and
starting score satisfy the conditions of Proposition 1, which require a decay rate of at least one half; the moving
averages fitted for prediction move far more slowly than that, so in practice the two are different rules. And in a
world that follows BKT's assumptions, BKT's declarations are right at least as often as its threshold says
(Proposition 2), which means that such a world can check how well BKT is fitted but cannot be evidence for it, and
which also says that a skill made of several such components is no longer such a world.

## The research question

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
these conditions real students are in is what the real data bear on: BKT predicts their answers better than the EMA
(H1) and better at the data set's grain than at any coarser one (G4), which is what a world with learning at the grain
of the tags would give, while its fits at the bound and the share wrong after its declarations say the tags are not
yet the components; and in the simulations it is the questions, more than the model, that decide it.

For Zeno, the recommendation is split by grain and by purpose. To decide mastery of a skill within a session, use an
exponential moving average of each student's first answers on the skill, with a threshold set from the system's own
data once classes have used it, and treat the threshold as a stated trade-off between letting students move on early
and keeping them practising. To choose what to practise next, keep the state at the grain of the ideas that Zeno
already holds, since it can say which idea is weakest even where it cannot yet declare mastery. Where the questions tell
the ideas apart and the practice is long enough, as on hcf now and on fractions with about one isolating question in
four or four times the practice, let BKT on each idea decide mastery too. Zeno's present rule, a fixed chance of 0.8 on
a hard question under the Elo model, was not part of the comparison, and it should be measured in the same way before
the moving average replaces it.

## Future work

The most direct extension is more real data. The three grains the ASSISTments data set allows are only three, and the
KDD Cup 2010 Cognitive Tutor data sets, which tag the same transactions with several knowledge-component models, would
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
