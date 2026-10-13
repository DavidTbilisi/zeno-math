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
precise as Proposition 2 promises for the true parameters. A second check, in a world where each skill is several
ideas learnt as BKT assumes and asked by Zeno's own questions, showed BKT on the skill failing as it does in the
gradual worlds, and BKT on each idea meeting the standard, deciding sooner and naming the missing idea only where the
questions tell the ideas apart, as hcf's do and fractions' do not.

H3 asked, as an exploratory question, how often the methods agree on real answers. [TODO: the agreement and the
answers after declaration.]

Besides these, the thesis proved two results. The streak rule is an EMA rule exactly when the decay rate, threshold and
starting score satisfy the conditions of Proposition 1, which require a decay rate of at least one half; the moving
averages fitted for prediction move far more slowly than that, so in practice the two are different rules. And in a
world that follows BKT's assumptions, BKT's declarations are right at least as often as its threshold says
(Proposition 2), which means that such a world can check how well BKT is fitted but cannot be evidence for it.

## 6.2 The research question

The research question asked whether BKT estimates a student's mastery of a skill more accurately than the exponential
moving average. The answer from this thesis is that it depends on how students learn, and that the cost of being wrong
is not symmetric. If learning happens in a jump, BKT is somewhat more efficient. If learning is gradual, BKT at any
usual threshold declares mastery too early, and it can be made to wait only with a threshold like $1 - 10^{-7}$, set
from data, at which it is about as efficient as the moving average. [TODO: what H1 adds about real students.] A simple
rule therefore does not leave much accuracy unused: where BKT is ahead, it is ahead by one or two answers, and where
learning is gradual it keeps up with the moving average only at thresholds that no longer match the chance of mastery.

For Zeno, whose own learner model assumes gradual learning, the recommendation, among the rules compared here, is to
decide mastery with an exponential moving average of each student's first answers on a skill, with a threshold set
from the system's own data once classes have used it, and to treat the threshold as a stated trade-off between letting
students move on early and keeping them practising. Its present rule, a fixed chance of 0.8 on a hard question under
the Elo model, was not part of the comparison, and it should be measured in the same way before the moving average
replaces it.

## 6.3 Future work

The most direct extension is to repeat the simulations with other seeds and other amounts of practice. A second is to
compare the versions of BKT that relax its assumptions, with forgetting or with parameters for each student
[@yudelson2013; @khajah2016], which may bring its probability closer to the true chance of mastery in the gradual
worlds, so that an ordinary threshold works, at the cost of more parameters. A third is a check of the ASSISTments
results with each answer kept for one skill only. A fourth follows from the world of ideas. Zeno's fractions generator
now asks for one idea alone in two questions of five, a missing top of an equivalent fraction, lowest terms, the lowest
common denominator, a reciprocal and the two conversions between mixed numbers and improper fractions, and in the
simulation these let BKT on each idea name the idea a student lacks, where students learn fast enough to come within one
idea of mastery (section 4.3). What remains is to let the choice
of the next question use that: to ask for the idea with the lowest probability, rather than a form at random, and to
see whether students who practise this way master fractions sooner than those who practise operations alone; and to
run on real class answers the three tests of whether an idea is learnt as one thing, whether a question tests it
alone, whether its error rate falls as one smooth curve, and whether practice on one form of it carries over to the
others [@cen2006lfa].

Zeno's own class data would give a replication on the students the result is meant for. The system already exports
every first answer in the format the evaluation reads, so the prediction test and the agreement of the mastery
methods can be run on it unchanged.

The wider question this thesis started from, whether choosing practice questions with a learner model helps a class
learn more than a fixed sequence, remains open, and Zeno is built to study it (Appendix A). A power analysis made for
that study showed that a single class, with the design first planned, would have almost no chance of detecting an
effect, and that a focused design with fewer skills and longer practice and tests would need from about 180 to 1,100
students in total if a question teaches most when a student has about an even chance of answering it right
(`docs/study.md` in the repository). That study needs several classes,
ethics approval and a school year, and it belongs after this one: it would use the mastery rule this thesis recommends.
