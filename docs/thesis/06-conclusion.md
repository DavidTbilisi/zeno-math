# 6 Conclusion and future work

## 6.1 Answers to the hypotheses

H1 asked whether BKT predicts held-out students' answers on the ASSISTments data better than the exponential moving
average. [TODO: the verdict for split seed 1 by the rule fixed in advance, the estimate and its interval, and whether
the other seeds and the class-level intervals agree.]

H2 asked whether, in simulated worlds that break BKT's assumptions, BKT needs fewer answers than the moving average and
the streak rule before its declarations of mastery are right at least 90 % of the time. The answer depends on which
assumption is broken. Where students forget, BKT needs one to two answers fewer than either simpler rule, at both
learning rates, so H2 holds in that world. Where students learn gradually, BKT's declarations were never right 90 % of
the time at any threshold tried, while the moving average and the streak rule reached that standard by waiting
longer, so H2 does not hold in either gradual world. With a lower bar for mastery the pattern was the same in three of
the four gradual settings, and in the fourth BKT and the moving average tied. In BKT's own world, the fitted model was
as precise as Proposition 2 promises for the true parameters.

H3 asked, as an exploratory question, how often the methods agree on real answers. [TODO: the agreement and the
answers after declaration.]

Besides these, the thesis proved two results. The streak rule is an EMA rule exactly when the decay rate, threshold and
starting score satisfy the conditions of Proposition 1, which require a decay rate of at least one half; the moving
averages fitted for prediction move far more slowly than that, so in practice the two are different rules. And in a
world that follows BKT's assumptions, BKT's declarations are right at least as often as its threshold says
(Proposition 2), which means that such a world can check how well BKT is fitted but cannot be evidence for it.

## 6.2 The research question

The research question asked whether BKT estimates a student's mastery of a skill more accurately than the exponential
moving average. The answer from this thesis is that it depends on how students learn, and that the cost of being
wrong is not symmetric. If learning happens in a jump, BKT is somewhat more efficient. If learning is gradual, BKT
declares mastery too early and cannot be made to wait, while the moving average can. [TODO: what H1 adds about real
students.] A simple rule therefore does not leave much accuracy unused, and in some plausible worlds it is the more
accurate choice.

For Zeno, whose own learner model assumes gradual learning, the recommendation is to decide mastery with an
exponential moving average of each student's first answers on a skill, with a threshold set from the system's own data
once classes have used it, and to treat the threshold as a stated trade-off between letting students move on early and
keeping them practising. Its present rule, a fixed chance of 0.8 on a hard question under the Elo model, was not part
of the comparison and should be measured in the same way before it is kept.

## 6.3 Future work

The most direct extension is to settle whether BKT's failure in the gradual worlds is a matter of the threshold, by
searching thresholds above 0.9999, and to repeat the simulations with other seeds and other amounts of practice. A
second is to compare the versions of BKT that relax its assumptions, with forgetting or with parameters for each
student [@yudelson2013; @khajah2016], which may close the gap in the gradual worlds at the cost of more parameters. A
third is a check of the ASSISTments results with each answer kept for one skill only.

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
