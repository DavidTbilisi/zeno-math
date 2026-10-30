# Final defence

The talk for the defence of the finished thesis, *The Effect of Skill Granularity on Mastery Estimation in Adaptive
Learning Systems*, by Davit Tchintcharashvili, supervised by Mikheil Gigauri. At the title defence on 13 October 2026
the board was Merab Topuria (chair), Mikheil Gigauri (supervisor) and Nikoloz Katsitadze (expert); check whether the
final board is the same, and the date, room and length allowed. No length is known yet, so the talk below runs about
fifteen minutes read at an even pace, and each part names the picture to show beside it if slides are wanted. Every
number in it is the thesis's own, from the abstract, chapter 3 and Appendix D as they stand on 30 October 2026.

## The talk

*Slide: the title, the author, the supervisor.*

Every adaptive practice system has to answer one question again and again: has this student mastered this skill, so
that they can move on? Both ways of getting it wrong cost something. Declared too early, the student goes on to work
that needs a skill they do not have; declared too late, they answer questions they could already answer, time that
could have gone to the next skill. Some systems answer it with a simple rule, such as three right answers in a row;
others with a statistical model, Bayesian Knowledge Tracing, which estimates the probability that the student knows the
skill, allowing for lucky guesses and careless slips. And every one of these methods takes the skill as given. But what
counts as one skill is a choice. Fractions can be one skill in a curriculum or sixteen ideas, from the times tables to
converting a mixed number, and whoever writes the curriculum decides. My research question, approved at the title
defence, is how that choice, the grain at which skills are defined, affects the accuracy and reliability of mastery
estimation.

*Slide: the thesis in one picture (figures/thesis-map.png).*

The thesis answers it in two parts. The foundation compares three methods at one grain: BKT, an exponential moving
average of the student's answers, and the streak rule, N right in a row. Four granularity studies then change the
grain: too coarse, right, too fine, and the same real answers at three grains. The evidence is of three kinds. Two
results are proved. Two hypotheses, H1 and G4, are tested on real students, the ASSISTments 2009–2010 data set, about
four thousand US middle-school students, with the size of difference that counts fixed in advance. The rest is
simulation, where I build students whose true state is known, so that a declaration of mastery can be checked against
the truth, which real data never allow. Appendix C shows from the public history of the repository that each
hypothesis was committed before its result, and where I changed something after seeing results, the thesis says so.

*Slide: the two propositions, in one line each.*

The two proofs set the ground. The first says exactly when "N right in a row" is a moving average: it requires a decay
rate of at least one half, and the moving averages fitted for prediction move far more slowly, so in practice they are
different rules. The second says that in a world that works the way BKT assumes, BKT's declarations are right at least
as often as its threshold says. That sounds like good news for BKT, but it means such a world cannot be evidence for
BKT; it can only check how well BKT was fitted. The comparison that counts has to happen in worlds that break BKT's
assumptions.

*Slide: the one-grain results, H1 and H2 side by side.*

At one grain, on the real answers, BKT predicts the next answer of held-out students better than the moving average,
by 0.0225 in log-loss per answer, with an interval that excludes zero, more than four times the 0.005 fixed as the
smallest difference that counts. So H1 holds, on all five splits of the students and with whole classes resampled. The
margin is real but modest. In simulation the decision itself is measured: how many answers each method needs before its
declarations are right nine times in ten. Where students forget, BKT needs one to two answers fewer than either simple
rule. Where students learn gradually, no threshold up to 0.9999 makes BKT right nine times in ten: a short run of right
answers makes it nearly certain, even when the student is only partway there. When it says 99 %, the student has
mastered the skill in 15 to 55 % of cases. So H2, that BKT is cheaper in worlds that break its assumptions, holds where
students forget and fails where they learn gradually, on all five seeds.

*Slide: G1, precision against the number of components (figures/g1-components.png).*

Then I asked why BKT fails in the gradual worlds, and the answer is grain. I built a world where a skill is several
components, each learnt in a single jump exactly as BKT assumes, and modelled the skill as one. That reproduces the
gradual pattern. At its usual threshold of 0.95, BKT is right 98 % of the time with one component, 59 to 71 % with two,
about a quarter with four, and under 8 % with eight or more; from four components on, no threshold up to 0.9999 meets
the standard. A skill that is really several things looks gradual from outside. What decides it is not the number of
components but how much of the skill each question leaves untested: when every question asks for every component, the
skill is one unit again to every method. One part of my hypothesis did not hold, and I say so. I expected the simple
rules to lose less, because they assume nothing about the skill. In precision they lost exactly as much: three right
answers on a skill of eight components say nothing about whether all eight are known. What they kept was a threshold
that can still be found and a score that is less badly calibrated.

*Slide: G2, the missing idea named, by length of practice.*

The second study puts the model at the right grain, BKT on each component, reading from every question which
components it needs. That restores precision at an ordinary threshold, and it adds something no coarser model has: it
can say which component the student lacks. But only on a condition: the questions must tell the components apart, and
the practice must be long enough to ask about each. I tested it on Zeno's own fractions questions, sixteen ideas of
which a question needs about six. Within a session of 30 questions the model names the missing idea about half the
time, seven to eight times chance, which is enough to choose the next question, but no rule can declare fractions
mastered. About 120 questions meet the condition; then the model names the missing idea about four times in five and
declares mastery sooner and for more learners than any other rule. Adding more questions on one idea alone did not
reliably help on five seeds, so the condition rests on the length of practice. On highest common factor, a smaller
skill, the condition is already met within a session.

*Slide: G3, the cost of splitting.*

The third study goes too fine. Splitting a component that students learn as one thing into two or four parts costs
answers for no gain in precision, doubles the Brier score with each split, and degenerates the fits, four in five at
the edge of the parameter grid when split in four. That is a sign a system can read from its own parameters. Too many
components for the practice is a different failure, and here my expectation was wrong too: the fits stay sound, and the
model simply never declares.

*Slide: G4 on ASSISTments, log-loss at three grains (figures/g4-grains.png).*

The fourth study returns to real students and models the same answers at three grains: the data set's own 110 skills,
five topic areas, and one skill for everything. The pre-specified test asked whether the finest grain predicts better
than one skill. It does, for BKT, by 0.0346 in log-loss per answer, with an interval that excludes zero, so G4 holds,
again on five splits and with whole classes resampled. Each step of coarsening costs BKT, while the moving average is
indifferent to the grain, because it has no skill parameters to lose. The declarations move with the grain as in the
simulations: BKT needs 3.3 answers at the finest grain and 8.9 at the coarsest. And even at the finest grain, two thirds
of BKT's fitted skills have a guess or slip at the bound, which says the data set's tags are not yet the components
students learn.

*Slide: the checks.*

I checked whether these results are one lucky run, after every result, and the thesis reports each check as a check,
not a finding. Every simulated table was repeated on four more seeds, and every verdict held; two single-seed numbers
did not, and I changed the conclusions about G2 to rest on practice length because of it. H1 and G4 hold on five splits,
with whole classes resampled, and on the long practices alone, which matters because the ASSISTments skill builders
stopped at three right in a row. H2's verdict holds for every definition of mastery from 0.9 upwards. And the middle
grain of G4, topics grouped by keywords, predicts no better than random groupings of the same sizes for BKT, which is
why the confirmatory test never used it.

*Slide: the answer to the research question.*

So the answer has three parts. Too coarse a grain lowers the accuracy of every method's declarations, in proportion to
how much of the skill each question leaves untested, and it destroys the reliability of BKT in particular: its
probability stops meaning what it says. The right grain restores accuracy and a calibrated probability and says which
component a student lacks, but only where the questions identify the components and the practice is long enough to ask
about each. Too fine a grain costs answers for nothing and shows itself in degenerate fits or in declarations that never
come. The simple rules are less affected in calibration because they assume less, and no less affected in precision
because they therefore know less. The real data place real students nearer the worlds where the skill tags carry
learning a known state can use, while the fits say the tags are not yet the components. In the simulations it is the
questions, more than the model, that decide which grain is usable.

*Slide: Zeno's building blocks (figures/blocks.png), with the recommendation.*

The work grew out of Zeno, a self-hosted maths whiteboard and practice engine for Georgian classrooms that I built, and
every experiment runs inside its code and is reproducible by one command each, listed in Appendix B. For Zeno the
recommendation is split by grain and by purpose. To decide mastery of a skill within a session, a moving average with
its threshold set from the system's own data, because its failure is milder: needing one or two more answers, where
BKT's is declaring mastery when most students have not reached it. To choose what to practise next, the state at the
grain of the ideas, which Zeno already keeps, since it can say which idea is weakest even where it cannot declare
mastery. And where the questions tell the ideas apart and the practice is long enough, as on highest common factor now
and on fractions with about four times the practice, BKT on each idea as the mastery rule.

*Slide: limits and what follows.*

The limits are stated in the thesis. Every simulated world is of my own making, and a result in a world holds only as
far as its way of learning is believed, which is why no world is pooled with another. The real students are American,
from 2009, on a system unlike Zeno, so the result transfers to Georgian students only as an expectation. And the thesis
measures the accuracy of the decision, not how much students learn from it. The next steps are the same tests on
Zeno's own class data, which it already exports in the format the evaluation reads, a finer real grain from the KDD Cup
2010 data sets, and the classroom study this work started from, whether choosing practice with a learner model helps a
class learn more, which needs several classes, ethics approval and a school year.

*Slide: one sentence.*

The thesis does not claim that a best grain exists. It says under which conditions each grain is usable and what each
method loses when the grain is wrong, and its practical lesson is that the grain has to be chosen together with the
questions, and the rule together with the grain. Thank you.

## Questions to expect

**What is new here, if BKT and mastery rules have been compared before?** They have, most closely by Pelánek and
Řihák (2017), who found the threshold and the data to matter more than the model; my results agree. The grain of a
skill model has been studied too, by Feng et al. (2009) and Pardos et al. (2007) on the same ASSISTments system, but for
prediction. What has not been measured is what grain does to the mastery decision against a known truth, with the
condition on the questions, on a real curriculum's generated questions. None of the methods is new; the measurement is.

**What exactly is proved, and what is only shown?** Two propositions are proved: when the streak rule is a moving
average, and that BKT is right at least as often as its threshold in a world that follows its assumptions. H1 and G4
are tested on real students by rules fixed in advance, and both hold. H2 and G1 to G3 are shown in simulation and hold
only as far as each world is believed. The recommendation for Zeno is a judgement drawn from these.

**Isn't the simulation circular?** In BKT's own world, yes, and the thesis does not count it as evidence; Proposition
2 makes BKT's win there a theorem. The world of components is BKT's world at a finer grain, so it favours BKT on each
component in the same way; what it can show is how far the other grains fall short and what the finer grain costs in
evidence.

**Why does BKT predict better and still not get the recommendation for deciding mastery?** Prediction and the decision
are different things. BKT's state per skill tells students apart sooner, so it predicts the next answer better, by a
modest margin that the Elo model Zeno already runs beats. The decision can only be judged against a truth, which only
the simulations have, and there BKT at 0.95 was mostly wrong wherever the skill was really several things. On the real
data the next three answers after any rule's declaration are right 77 to 80 % of the time, so the real data cannot
pick the rule.

**Could BKT not just use a higher threshold?** It can, and the thesis checked it after the results: with thresholds up
to $1 - 10^{-15}$, BKT meets the standard in three of four gradual settings, at thresholds like $1 - 10^{-7}$ or beyond,
and then saves at most about a third of an answer. But that threshold has to be found from data and moves by orders of
magnitude from one world to another. The moving average meets the same standard at thresholds between 0.50 and 0.99
with one fitted parameter.

**Which of your hypotheses failed?** H2 in the gradual worlds, on every seed. In G1, that the simple rules would lose
less precision from a coarse grain: they lost as much. In G3, that too many components for the practice would show in
degenerate fits: it showed only in declarations that never came. Each was stated before its result, with the rule for
failing.

**Did you change anything after seeing results?** Yes, and Appendix C dates each change. The H2 comparison moved from
equal practice to equal precision after a first run, because at equal practice almost no simulated student had mastered
anything. The threshold search above 0.9999 and the robustness checks came after the results and are reported beside
the verdicts, not in place of them. And on 23 October the fit of BKT on each idea was changed from a heuristic to the
conjunctive model's own likelihood; the tables were made again, and two findings moved, both in the thesis: within 30
questions the missing idea is now named about half the time instead of at chance, and at 120 questions the declarations
are right nine times in ten on average, not on every seed.

**The ASSISTments skill builders stopped at three right in a row. Doesn't that decide your real-data results?** It
limits what the real data can say about the streak rule's decisions, which is why H3 is exploratory and the decisions
are compared in simulation. For prediction, H1 and G4 were run again on the practices of ten answers or more alone, and
both hold on every split, BKT's lead over the moving average narrowing to about two thirds.

**How would a system find the right grain for itself?** By the share of its components a question tests, by the
evidence per component its practice gives, and by its own fits: degenerate fits are the sign of a grain too fine. The
thesis also tried letting the answers choose the grouping of fractions' sixteen ideas, after the results. It helped only
where the ideas as drawn were much finer than the way students learn them, and only with a few hundred students, so
Zeno should keep one probability per idea until answers from several classes can be pooled.

**What is the role of Zeno?** It is the setting and the code base, not what is evaluated. Its own mastery rule, a fixed
chance of 0.8 on a hard question under the Elo model, was not part of the comparison, and the thesis says it should be
measured the same way before the moving average replaces it.

**Why not run the study in a classroom?** It needs ethics approval for minors' data, a school's timetable and, by the
power analysis in `docs/study.md`, from about 180 to 1,100 students. Public, anonymised data and simulation answer this
question without collecting any personal data. The classroom study is the work that should follow, and Zeno is built to
run it.

**Why not deep knowledge tracing?** The question is about the decision rule deployed systems use, not the most accurate
predictor. Deep models need large training data, are hard to explain to a teacher, and are not what deployed systems
use to decide mastery.
