# 5 Discussion

This chapter interprets the results. Section 5.1 discusses what the evidence shows for each hypothesis, and section
5.2 what it means for a system such as Zeno. Section 5.3 sets out the threats to the validity of the conclusions.

## 5.1 What the evidence shows

### Prediction

[TODO, once H1 has been run: whether BKT predicts held-out ASSISTments answers better than EMA by the pre-specified
rule, by how much in log-loss per answer, whether the verdict is the same for split seeds 2 to 5 and with classes
resampled, and how the two compare with the Elo model and PFA. If the verdict is "no practical difference", say that
the extra machinery buys nothing in prediction on these data; if BKT is better, say by how much and that this does
not by itself make its mastery decisions better (section 2.4).]

### Mastery decisions

The simulations give a clear pattern. Where learning happens as BKT assumes, all at once, BKT makes mastery decisions
more cheaply than the simpler rules. In the plain BKT world this is what Proposition 2 leads one to expect, and the
fitted model kept the precision the proposition promises for the true parameters. In the BKT world with forgetting,
which breaks one of BKT's assumptions, BKT still needed one to two answers fewer than EMA and the streak rule for the
same accuracy. A small chance of forgetting does not undo the advantage of a model whose picture of learning is
otherwise right.

Where learning is gradual, the pattern reverses. In the elo and irt2pl worlds, where each question raises a student's
chance of a right answer a little, no BKT threshold made declarations that were right nine times in ten, while EMA and
the streak rule reached that standard by waiting longer. The trade-off curves suggest why. BKT's model has two states,
so it reads a run of right answers as evidence that the skill has been learnt, and after a few such answers its
probability is close to 1 whatever the threshold. A student whose true chance is well below 0.9 still gives runs of
right answers quite often, and BKT declares them masters. Raising BKT's threshold from 0.80 to 0.99 made it wait only
six answers longer and left most of its declarations wrong. EMA has no such ceiling: its score approaches 1 only
through a long run of right answers, so a high threshold makes it wait as long as needed. In the gradual worlds the
EMA was also slightly cheaper than the streak rule for the same accuracy, which fits the recommendation of
@pelanek2017mastery.

Three qualifications keep this from being a verdict against BKT in general. The first is that the threshold BKT was
allowed stopped at 0.9999, and in the one setting of the check where BKT met the standard, it did so exactly at that
highest value (Table 4.6). Thresholds even closer to 1 might let BKT meet the standard in more settings, so "never"
in Table 4.3 means "never within the thresholds tried", which is what the hypothesis fixed in advance, but not "never
at any threshold". The second is that meeting the standard in the gradual worlds was expensive for every method: 25
to 30 answers out of 30, with most students never declared. Little separates methods that all wait until nearly the
end. The third is that the gradual worlds are as much a model as the BKT world is, and section 5.3 returns to this.

What the comparison at equal cost adds is a warning about how such comparisons are set up. At the streak rule's cost,
all three methods were right more than 92 % of the time in the BKT worlds and less than 10 % in the gradual ones, and
within each world they were nearly indistinguishable. A comparison at a fixed amount of practice, which is how the
question is often posed, can hide differences that appear only when each method is allowed to choose how long to
wait.

[TODO, once H3 has been run: how often BKT, EMA and the streak rule agree on ASSISTments, and what the answers after
each method's declaration show, read with the caution of section 5.3.]

## 5.2 What a system like Zeno should use

Zeno's learner model assumes that learning is gradual: every answer moves a student's ability a little, and the
chance of a right answer rises smoothly with ability. If Zeno's students learn as its own model assumes, the gradual
worlds are the relevant ones, and there the simulations favour the moving average over BKT. If they learn more in
jumps, as BKT assumes, BKT saves one or two answers per skill. A system that does not know which is true should prefer
the rule whose failure is milder. BKT's failure in the gradual worlds is to declare mastery when most students have not
reached it. EMA's failure in the BKT worlds is to need one or two more answers. For practice that feeds later skills,
an early false declaration is the more costly error, so the evidence so far points to EMA. [TODO: revise in the light
of H1 and H3.]

The threshold matters at least as much as the method, as @pelanek2017mastery also found. The EMA thresholds that met
the 90 % standard ranged from 0.54 to 0.97 across the simulated settings, so no single value is right everywhere, and
a threshold should be set from data on the system's own students. The results also show what a strict standard costs.
In the gradual worlds, declarations right nine times in ten required students to practise for most of the 30
questions, and many were never declared. A practice system may reasonably accept a lower standard and catch the
errors through later review, but that is a choice about the cost of errors, which should be made openly and not left
to a default threshold.

## 5.3 Threats to validity

### Internal validity

The ASSISTments data were collected under a streak policy. The skill builders ended once a student had three right in
a row, so a practice usually stops at the streak rule's own decision. The real data therefore cannot show the streak
rule declaring mastery too early, and there are few answers after any declaration to judge it by. This is why H3 is
exploratory and the comparison of decisions is simulated.

The H2 comparison was revised after a first simulated run, from equal cost to equal accuracy (section 3.3). A change
made after seeing results can favour a conclusion. The revision chose a standard that has a meaning in every world,
not one that favours a particular method, and the equal-cost comparison is still reported in full (Table 4.5).
Under the original comparison, the conclusion would have been that the methods cannot be told apart, not that one is
better.

The thresholds were chosen on training students and judged on held-out ones, and five of the 14 rules chosen fell
slightly below 90 % on the held-out students. The standard is therefore met on average, not guaranteed, and a
comparison at a precision a few points lower or higher could reorder close results. The large differences in Table
4.3, such as BKT never meeting the standard in the gradual worlds, are not of this kind.

BKT's thresholds were tried up to 0.9999 (section 5.1). The upper end of that range was set before the results,
because BKT's probability crowds just below 1, but it is still a choice, and a finer search above it is the most
direct way to test whether BKT's failure in the gradual worlds is a matter of the threshold or of the model.

### External validity

Every simulated world is of this thesis's own making. The BKT world gives BKT a home advantage that Proposition 2 makes
exact, and the elo world follows the form of Zeno's own learner model, which gives gradual learning an advantage of the
same kind. A result in a world holds only as far as its way of learning is believed, which is why each world is
reported on its own and none is pooled. Real learning is probably neither all at once nor perfectly smooth.

The simulated practice has every student answer 30 questions per skill at one level, with every question teaching
the same amount and no transfer between skills. Real practice varies in all these respects, and the results may
depend on them. At the lower learning rate, few students in the gradual worlds mastered a skill within 30 questions,
so a method could meet the standard only by declaring almost nobody, and the comparison there says little about which
method is better. All simulations use one random seed; a second seed would show how much the numbers move.

The real data come from US middle-school students in 2009 and 2010, using a system unlike Zeno, with skill tags made by
the system's authors. Zeno's students are Georgian, and the result transfers to them only as an expectation.

### Construct validity

What "mastered" means in the gradual worlds is a threshold on the true chance of a right answer, fixed in advance at
0.9. With 0.8 instead, BKT met the standard in one more setting and tied with EMA there (Table 4.6), so the conclusion
depends on this definition to some degree. In the ASSISTments data, problems tagged with several skills are counted
once for each, so one answer can weigh on several skills' sequences. BKT and EMA see the same sequences, so the
comparison stays fair, and the bootstrap resamples whole students, which accounts for the dependence this creates
within a student. A check with each answer kept for one skill only would show whether the choice matters.

### Conclusion validity

H1 is the one confirmatory test. Everything else is reported as estimates with intervals, without tests, so there is
no problem of multiple testing to correct for, but neither should any single interval among the many in chapter 4 be
read as a confirmed finding. The bootstrap resamples students as if each were an independent draw, while students in
one class share a teacher and lessons. The class-level resampling shows how much this matters for H1. [TODO: report
whether the class-level intervals change the H1 verdict.] H1 is decided on one split of students, with four other
splits reported to show whether the result depends on it, which is weaker than cross-validation over several folds.

## 5.4 Summary

In the simulations, BKT decides mastery more cheaply than simpler rules where learning happens all at once, even with
some forgetting, and fails to reach a high standard of accuracy at all where learning is gradual, while the moving
average reaches it by waiting longer. The comparison at equal practice, as first planned, could not tell the methods
apart. Which world real students are closer to is the open question on which the choice depends, and the
prediction test on real answers [TODO: H1's verdict] bears on it only indirectly. For Zeno, whose own model assumes
gradual learning, the evidence so far favours the moving average with a threshold set from data.
