# 5 Discussion

This chapter interprets the results. Section 5.1 discusses what the evidence shows, first for the methods at one grain
and then for each granularity study, and section 5.2 what it means for a system such as Zeno. Section 5.3 sets out the
threats to the validity of the conclusions.

## 5.1 What the evidence shows

### Prediction at one grain

[TODO, once H1 has been run: whether BKT predicts held-out ASSISTments answers better than EMA by the pre-specified
rule, by how much in log-loss per answer, whether the verdict is the same for split seeds 2 to 5 and with classes
resampled, and how the two compare with the Elo model and PFA. If the verdict is "no practical difference", say that
the extra machinery buys nothing in prediction on these data; if BKT is better, say by how much and that this does
not by itself make its mastery decisions better (section 2.5).]

### Mastery decisions at one grain

The one-grain simulations give a clear pattern. Where learning happens as BKT assumes, all at once, BKT makes mastery
decisions more cheaply than the simpler rules. In the plain BKT world this is what Proposition 2 leads one to expect,
and the fitted model kept the precision the proposition promises for the true parameters. In the BKT world with
forgetting, which breaks one of BKT's assumptions, BKT still needed one to two answers fewer than EMA and the streak
rule for the same precision. A small chance of forgetting does not undo the advantage of a model whose picture of
learning is otherwise right.

Where learning is gradual, BKT fails H2 by the rule fixed in advance. In the elo and irt2pl worlds, where each question
raises a student's chance of a right answer a little, no BKT threshold up to 0.9999 made declarations that were right
nine times in ten, while EMA and the streak rule reached that standard by waiting longer. The trade-off curves show
why. BKT's model has two states, so it reads a run of right answers as evidence that the skill has been learnt, and
after a few such answers its probability is close to 1. A student whose true chance is well below 0.9 still gives
runs of right answers quite often, and BKT declares them masters. Raising BKT's threshold from 0.80 to 0.99 made it
wait only six answers longer and left most of its declarations wrong. EMA has no such crowding: its score approaches 1
only through a long run of right answers, so an ordinary threshold makes it wait as long as needed. In the gradual
worlds the EMA was also slightly cheaper than the streak rule for the same precision, which fits the recommendation of
@pelanek2017mastery.

The check above 0.9999 shows that BKT can nevertheless be made to wait, only not at any threshold that still reads as
a probability. With thresholds between $1 - 10^{-6.9}$ and $1 - 10^{-12.6}$, BKT met the standard in three of the four
gradual settings, and at the higher learning rate it then needed 0.3 to 0.4 answers fewer than EMA (Table 4.7). BKT's
probability still ranks the evidence usefully when learning is gradual; what breaks is its calibration against the
definition of mastery used here, which Table 4.8 measures directly: a $P(L)$ of 0.99 meant mastery in 15 to 55 % of
cases, against 70 to 94 % for EMA's top scores. The gradual worlds have no known state for BKT's probability to refer
to, so a probability near 1 says only that the answers look like those of a student who knows the skill, not that the
true chance of a right answer has reached 0.9. The "never" of Table 4.3 is therefore mostly a statement about the
range of thresholds, not about the model. This check came after the results, so it qualifies H2's verdict without
replacing it. What survives of BKT's failure is a practical point. In the gradual worlds the threshold BKT needs
ranges over eight orders of magnitude of closeness to 1, and at its usual 0.95 about one declaration in ten is right
(Table 4.5). A system using BKT where learning is gradual would have to set its threshold from data, with nothing in
BKT's own probability to guide it. The thresholds EMA needs stay between 0.84 and 0.97.

What the comparison at equal cost adds is a warning about how such comparisons are set up. At the streak rule's cost,
all three methods were right more than 92 % of the time in the BKT worlds and less than 10 % in the gradual ones, and
within each world they were nearly indistinguishable. A comparison at a fixed amount of practice, which is how the
question is often posed, can hide differences that appear only when each method is allowed to choose how long to
wait.

[TODO, once H3 has been run: how often BKT, EMA and the streak rule agree on ASSISTments, and what the answers after
each method's declaration show, read with the caution of section 5.3.]

### Too coarse

The granularity studies begin by explaining the one-grain result. The gradual worlds made learning continuous by
construction, and one may ask whether they were rigged against a model that assumes a jump. The world of components
answers that they were not: a skill made of several components, each learnt in exactly the jump BKT assumes, looks to
BKT on the skill exactly as the gradual worlds did. With two components BKT at 0.95 was right 59 to 71 % of the time and
needed a threshold of 0.999 or 0.9999 to meet the standard; with four or more it met it at no threshold up to 0.9999,
and its Brier score climbed towards that of the gradual worlds (Table 4.10). The mechanism is the one Proposition 2
points at. A skill of $k$ components is a mixture of $2^k$ states, not two, and the chance of a right answer on it
rises in steps as the components are learnt, so from outside it looks like gradual learning; a model with one known
state has nothing in the world to refer to, and its probability stops meaning what it says. This is the reading
@koedinger2012kli give of a knowledge component applied to the model's failure: the grain at which the assumption
holds is finer than the grain at which the model is applied. The three skills of the world of ideas line up with the
sweep by the share of their ideas a question needs, times whole, hcf two thirds and fractions a third (Table 4.11), and
the sweep over questions that ask for several components at once confirms that this share, not $k$, is what matters:
when every question needs every component the skill is one unit again to every method, and when a question needs half
the components BKT on the skill is right about half the time.

The part of G1 that did not hold is instructive. The EMA and the streak rule were hypothesised to lose less from a
coarse grain because they assume nothing about what a skill is, and in precision at their usual thresholds they lost
exactly as much: a run of three right answers on a skill of eight components is no evidence that all eight are known,
whatever rule reads it. Nothing that reads a sequence of answers can know whether the sequence is on one thing. What
the simpler rules kept was a threshold that could be found, up to eight components where BKT on the skill had none from
four, and a probability that was less wrong, with a Brier score a third of BKT's at sixteen components. So the first
answer to the research question is that a coarse grain hurts the accuracy of every method and the reliability of BKT
most: its probability becomes the least calibrated score and the threshold it needs moves out of the range in which a
probability can be read.

### The right grain, and the questions

Modelling at the learners' grain restores what the coarse grain lost, under a condition that G2 states and the sweeps
measure. BKT on each component was right 97 to 100 % of the time at 0.95 wherever it declared and met the standard at
thresholds between 0.66 and 0.89 at every $k$ (Table 4.10); on hcf, carried from the arithmetic settled in times, it had
the best Brier score, decided sooner than the EMA and named the missing idea 62 and 80 % of the time (Table 4.11). The
condition is that the questions tell the components apart. On fractions as Zeno generates them, where an operation
needs seven to ten ideas and the forms need two, started afresh it was at chance at the lower rate, and no form of it
declared mastery within 30 questions. The reason is in the model's own arithmetic. A conjunctive model that is nearly
sure not every idea is known puts a right answer down to guessing and a wrong one to whichever idea is missing, so a
question that needs eight ideas moves none of them much, and the estimate drifts with the learning step instead
[@xu2012subskills]. This is the identifiability problem of student modelling [@beck2007identifiability] at the level of
the components: the finer the grain, the more the questions must differ in what they ask for, which is what a complete
Q-matrix provides [@tatsuoka1983rulespace] and what learning factors analysis checks a decomposition for [@cen2006lfa].

The sweep says how the condition can be met and what it costs. Length does most of the work: the same generated
questions that left the model at chance after 30 answers let it name the missing idea two times in three after 120 and
made carried BKT on each idea the only rule that declared fractions mastered in time, at 73 answers where the EMA and
the streak rule declared for nobody (Table 4.12). Isolating questions help at the margin and have a price. A quarter of
the questions asking for one idea alone raised the share found to about 70 % and left learning as it was, because the
remaining operations still teach several ideas at once; half taught less; and every question alone taught one idea at a
time, so that few learners ever came within one idea of mastery and the measure itself became unstable. This is the
trade-off a generator faces between questions that diagnose and questions that teach, and the sweep puts it at about
one isolating question in four. Carrying what earlier skills settled saved up to four answers where the skill was
declared at all, and a recognised mistake's blame added a few points to the diagnosis; neither replaces evidence that
the questions do not provide. The second answer to the research question is therefore conditional: the fine grain is
the accurate and reliable one, with an ordinary threshold and a calibrated probability, if and only if the questions
identify the components and the practice is long enough for each to be asked about, and on Zeno's fractions within a
session of 30 questions that condition is not met.

### Too fine

Going finer than the learners costs answers for no gain, in both of the ways G3 distinguished. Modelling a component
that is learnt as one thing as two or four parts left precision where it was and doubled the Brier score with each
split, since each part sees a share of the evidence for the same thing and the product of the parts' probabilities
understates what the learner knows; split in four, the finer model was worse calibrated and dearer than BKT on the
skill, which the right grain had beaten by a wide margin (Table 4.13). The fits degenerated as the evidence per part
thinned, from none at the bound to 80 % of them, which is the warning sign a system could read from its own fits
without a truth. Too many components for the practice is the same shortage seen from the other side: at 30 questions
BKT on eight or sixteen components declared for almost nobody, because each component was asked about fewer than four
times, and at 120 questions eight components had the evidence they needed while sixteen still did not (Table 4.14).
Here the hypothesis was half wrong: the fits did not degenerate as the evidence thinned, as they did when a component
was over-split, so a system cannot read a shortage of practice from its parameters; it shows itself only in
declarations that never come. The right grain is therefore not a property of the model alone but of the model and the
practice together, through the evidence per component $n / k$, and a system that decomposes its skills has to lengthen
its practice, or ask for several components at once, to pay for it.

### Real data across grains

[TODO, once G4 has been run on ASSISTments: whether BKT at the data set's grain predicts better than at the topic
grain and than one skill by the pre-specified rule, by how much; whether the EMA loses less from coarsening; how the
declarations move with the grain and how many fits are degenerate at each.] On the simulated class the finer grain
predicted better for BKT, by 0.022 in log-loss per answer from one skill to 38, but with 80 held-out students the
interval reached past zero and the verdict was inconclusive, while the EMA was indifferent to the grain and lost less
from coarsening than BKT did, with an interval that excluded zero (Table 4.16). That is the pattern the simulations lead
one to expect on real data too: a model with a known state gains from a grain at which there is one, and loses more
when there is not; a rule that assumes nothing about the skill gains and loses less. @pardos2007granularity and
@feng2009grainsize found the finer ASSISTments skill models better at predicting a test score; whether they are also
better at predicting the next answer, at the grain of the data set's own tags, is what the data file will decide.

## 5.2 What a system like Zeno should use

The answer to the research question in one sentence is that a coarse grain makes BKT's probability stop meaning what
it says and takes every method's precision down with it, a fine grain is usable only where the questions identify the
components and the practice supports them, and the simple rules are less affected by grain in calibration and in
having a usable threshold, but not in precision, because they assume less and therefore know less. What follows for a
system is that the grain has to be chosen together with the questions, and the rule together with the grain.

Zeno's learner model assumes that learning is gradual, and the world of components shows that a skill made of several
ideas looks gradual from outside, so the gradual worlds and the coarse-grain worlds point the same way. At the grain of
the skill, BKT at any usual threshold declares mastery when most students have not reached it. It matches the moving
average only with a threshold such as $1 - 10^{-7}$, found from data, whose right value moves by orders of magnitude
from one world to another, and even then it saves at most about a third of an answer. The moving average meets the same
standard with an ordinary threshold and a single fitted parameter, and on a skill of several ideas it keeps a threshold
that works where BKT on the skill has none. A system that does not know how its students learn should prefer the rule
whose failure is milder. BKT's failure, with a threshold not set for the world it is in, is to declare mastery when most
students have not reached it. EMA's failure in the BKT worlds is to need one or two more answers. For practice that
feeds later skills, an early false declaration is the more costly error, so for deciding mastery at the grain of the
skill the evidence points to the EMA, with a threshold set from the system's own data. [TODO: revise in the light of
H1 and H3.]

At the grain of the ideas, BKT becomes the right tool where the questions tell the ideas apart. On hcf it already does:
BKT on each idea carried from times decided sooner than the moving average, was better calibrated and named the idea a
student lacked four times in five. On fractions it does not yet, within a session of 30 questions: the forms Zeno's
generator now deals, two in five, let it name the missing idea about seven times as often as chance at the higher
learning rate, which is what the adaptive policy uses to choose the next form, but no rule declares fractions mastered
in 30 questions, and the sweep says what would change that: about 120 questions, or a quarter of the questions asking
for one idea alone, after which carried BKT on each idea declares in about 75 answers where the moving average needs
105 or never declares. The recommendation is therefore split by grain and by purpose. For deciding mastery within a
session, the moving average on the skill, with its threshold set from data. For choosing what to practise next, the
state at the grain of the ideas, which Zeno already keeps, since even where it cannot declare mastery it can say which
idea is weakest. And if Zeno lengthens its fractions practice or shifts its generator towards one isolating question in
four, BKT on each idea becomes the mastery rule on fractions as well, with the moving average as the fallback on skills
whose ideas the questions do not separate. Going finer than the ideas, by splitting one of them, would cost answers for
nothing, and the share of degenerate fits is the sign to watch for it.

The threshold matters at least as much as the method, as @pelanek2017mastery also found. The EMA thresholds that met
the 90 % standard ranged from 0.50 to 0.99 across the simulated settings, and BKT's from 0.74 to $1 - 10^{-12.6}$, so
no single value is right everywhere, and a threshold should be set from data on the system's own students. The results
also show what a strict standard costs. In the gradual worlds, and on fractions, declarations right nine times in ten
required students to practise for most of the session, and many were never declared. A practice system may reasonably
accept a lower standard and catch the errors through later review, but that is a choice about the cost of errors, which
should be made openly and not left to a default threshold.

## 5.3 Threats to validity

### Internal validity

The ASSISTments data were collected under a streak policy. The skill builders ended once a student had three right in
a row, so a practice usually stops at the streak rule's own decision. The real data therefore cannot show the streak
rule declaring mastery too early, and there are few answers after any declaration to judge it by. The same policy
shapes H1 and G4: practices mostly end soon after a run of three right, so the prediction comparisons are made on
sequences of that kind, and their results need not hold for students who keep practising for 20 or 30 questions. This is
why H3 is exploratory and the comparisons of decisions are simulated.

The H2 comparison was revised after a first simulated run, from equal cost to equal precision (section 3.4). A change
made after seeing results can favour a conclusion. The revision chose a standard that has a meaning in every world,
not one that favours a particular method, and the equal-cost comparison is still reported in full (Table 4.5). Under
the original comparison, the conclusion would have been that the methods cannot be told apart, not that one is better.

The two granularity worlds were built after H2's results had been seen, as checks on the reading that hidden components
make learning look gradual, and their first runs are reported as such. The hypotheses G1 to G3 and their sweeps were
then stated before the sweeps were run, and one part of G1 did not hold, which is some evidence that the sweeps were
not shaped to their conclusions; but the worlds were. The over-splitting variant and the questions on several
components at once were added to the world of components for G3 and G2 after the first runs of G1, and the measures at
the usual thresholds and the sweep tables at the same time.

The thresholds were chosen on training students and judged on held-out ones, and five of the 14 rules chosen in Table
4.3 fell slightly below 90 % on the held-out students, as did several in the granularity sweeps. The standard is
therefore met on average, not guaranteed, and a comparison at a precision a few points lower or higher could reorder
close results. The large differences in Tables 4.3 and 4.10 are not of this kind, but the differences of a few tenths of
an answer between BKT and EMA in Table 4.7, and between the forms of BKT on each idea in Table 4.12, may be. The usual
threshold at which the EMA is judged in the granularity sweeps is the one costing what the streak rule costs on the
training learners, since the EMA has no usual threshold of its own; a different choice would move its precision at the
usual threshold, though not the cheapest threshold meeting the standard or the Brier score.

BKT on each component is fitted heuristically, with each answer counted as evidence on every component its question
needed, where the conjunctive model's own fit would need expectation–maximisation over the hidden states. A better fit
could only help the finer grain, so the condition G2 states may be met somewhat sooner than the sweep shows; it could
not make the coarse grain look better.

BKT's thresholds were first tried up to 0.9999, a range set before the results. The search above it (Table 4.7) was
made after the results had been seen, so it is reported as a check beside H2's verdict, not in place of it. Its own
upper end, $1 - 10^{-15}$, is set by the precision of the arithmetic.

### External validity

Every simulated world is of this thesis's own making. The BKT world gives BKT a home advantage that Proposition 2 makes
exact, and the elo world follows the form of Zeno's own learner model, which gives gradual learning an advantage of the
same kind. The world of components is the BKT world at a finer grain, so by the same proposition it favours BKT on each
component: its precision at the right grain is a theorem there, up to fitting, and what the world can show is only how
far the other grains fall short of it and what the finer grain costs in evidence. Real components are unlikely to be
learnt in one step each. A result in a world holds only as far as its way of learning is believed, which is why each
world is reported on its own and none is pooled. The world of ideas is of this thesis's making too: its decomposition
of fractions was drawn by hand, its ideas are assumed to be learnt as one thing, which the three tests in
`src/model/conceptGraph.ts` could check on real answers but have only been run on simulated ones, and its questions,
though Zeno's own, are read for the ideas they need by a rule written for the purpose.

The simulated practice has every student answer a fixed number of questions per skill at one level or in a fixed
cycle of levels, with every question teaching the same amount and no transfer between skills except the shared ideas.
Real practice varies in all these respects, and the results may depend on them. At the lower learning rate, few
students in the gradual worlds or on fractions mastered a skill within 30 questions, so a method could meet the
standard only by declaring almost nobody, and the comparison there says little about which method is better. All
simulations use one random seed for their tables; seeds 2 to 5 were checked for the ideas world's first runs and gave
the same picture, and the sweeps were not repeated.

The real data come from US middle-school students in 2009 and 2010, using a system unlike Zeno, with skill tags made by
the system's authors. This is typical of the field: the public data sets for knowledge tracing are mostly mathematics
from a few countries, and most carry no demographic information [@abdelrahman2023survey]. Zeno's students are
Georgian, and the result transfers to them only as an expectation. The three grains of G4 are also only three: the
data set's tags are one grain among many the same problems could be given, and the topic areas are the importer's.

### Construct validity

What "mastered" means in the gradual worlds is a threshold on the true chance of a right answer, fixed in advance at
0.9. With 0.8 instead, BKT met the standard in one more setting and tied with EMA there (Table 4.6); with the search
continued above 0.9999 it met the standard in all four settings (Table 4.7). The conclusion depends on this definition
to some degree. In the component worlds the definition is sharper, every component known, and does not move with the
model's grain, which is what makes the grains comparable; but it is also strict, since a learner one component short
of sixteen is counted as not having mastered the skill, and a system might reasonably count them otherwise. In the
ASSISTments data, problems tagged with several skills are counted once for each at the finest grain, so one answer can
weigh on several skills' sequences. BKT and EMA see the same sequences, so the comparison stays fair, and the bootstrap
resamples whole students, which accounts for the dependence this creates within a student; G4 compares grains on the
first observation of each problem only, so that no grain is judged on answers another never saw. A check with each
answer kept for one skill only would show whether the choice matters at the finest grain.

### Conclusion validity

H1 and G4 are the two confirmatory tests, each decided by one pre-specified interval. Everything else is reported as
estimates with intervals, without tests, so there is no problem of multiple testing to correct for, but neither should
any single interval among the many in chapter 4 be read as a confirmed finding. The bootstrap resamples students as if
each were an independent draw, while students in one class share a teacher and lessons. The class-level resampling
shows how much this matters for H1. [TODO: report whether the class-level intervals change the H1 verdict.] H1 and G4
are decided on one split of students, with four other splits reported for H1 to show whether the result depends on it,
which is weaker than cross-validation over several folds.

## 5.4 Summary

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
across grains [TODO: G4's verdict] and the prediction test at one grain [TODO: H1's verdict] bear on which world real
students are closer to.
