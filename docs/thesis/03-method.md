# 3 Method

This chapter sets out how the research question is answered. Section 3.1 defines the three methods compared. Section
3.2 proves two results that follow from the definitions alone, and section 3.3 states the hypotheses that the data
and simulations test. Section 3.4 describes the data, section 3.5 how each method is fitted, and section 3.6 how each
hypothesis is evaluated. Section 3.7 explains where the result fits in Zeno.

## 3.1 The methods compared

All three methods read one student's answers on one skill, in the order given, and after each answer say whether the
skill is now mastered. Each declares mastery the first time its condition holds and does not take the declaration
back.

BKT (section 2.2) has four parameters per skill: the chance the skill is known at the start, the chance of learning it
at each question, the chance of a right guess and the chance of a slip. They are fitted on training students (section
3.5). After each answer the model updates its probability that the student knows the skill, then allows for learning
from the question. Mastery is declared when that probability reaches a threshold $\theta$; the usual choice is 0.95
[@corbett1994].

EMA (section 2.3) has one decay rate $\alpha$, the same for all skills, and a starting score $s_0$, both set from
training students. After each answer the score moves a share $\alpha$ of the way towards 1 if the answer was right and
towards 0 if it was wrong. Mastery is declared when the score reaches a threshold $\theta$.

The streak rule has one parameter, $N$, and declares mastery when the last $N$ answers were all right. With $N = 3$
it is the rule of the ASSISTments skill builders. It fits nothing and gives no probability.

BKT and EMA both give a probability of a right answer before every answer, so both can be judged as predictors (H1).
All three make mastery decisions, so all three can be judged as decision rules (H2 and H3). Two other student models
already implemented in Zeno's evaluation code, the Elo model and Performance Factors Analysis (section 2.5), are
reported as reference rows in the prediction table and are not part of any hypothesis.

## 3.2 What can be proved

Two results follow from the definitions and need no data. The first explains in what sense the streak rule is a
special case of EMA; the second explains why a simulation in which students learn exactly as BKT assumes cannot be
used as evidence for BKT.

### Proposition 1: the streak rule is an EMA rule

Let an EMA score start at $s_0$ in $[0, 1)$ and after each answer $c$ become $(1 - \alpha)s + \alpha c$, with
$0 < \alpha < 1$, and let $N \geq 2$. The rule "mastered when the score is at least $\theta$" declares mastery after
exactly the same answers as "the last $N$ answers were right", on every sequence of answers of any length, if and only
if

$$(1 - \alpha)^N \leq 1 - \theta \leq \alpha(1 - \alpha)^{N-1} \qquad \text{and} \qquad
s_0 < 1 - \frac{1 - \theta}{(1 - \alpha)^{N-1}}.$$

Proof. Follow the gap $g = 1 - s$ between the score and 1. A right answer multiplies the gap by $1 - \alpha$; a wrong
one sets it to $(1 - \alpha)g + \alpha$, which is more than $\alpha$ because $g$ stays above 0. After $N$ right answers
in a row, $g \leq (1 - \alpha)^N \leq 1 - \theta$, so the score has reached $\theta$. After a wrong answer followed by
$k < N$ right ones, $g > \alpha(1 - \alpha)^k \geq \alpha(1 - \alpha)^{N-1} \geq 1 - \theta$, so it has not. Before any
wrong answer, $k < N$ right answers leave $g = (1 - s_0)(1 - \alpha)^k > 1 - \theta$ by the condition on $s_0$. Each
condition is also needed. A long run of wrong answers brings $g$ as close to 1 as we like, after which $N$ right
answers reach the threshold only if the left inequality holds. A long run of right answers, then one wrong and
$N - 1$ right, brings $g$ as close as we like to $\alpha(1 - \alpha)^{N-1}$ from above, so the right inequality is
needed for the rule not to fire there. And $N - 1$ right answers from the start must not reach the threshold, which is
the condition on $s_0$. ∎

The band for $\theta$ is empty unless $\alpha \geq 1/2$, so only a fast-moving average can behave as a streak rule. For
$N = 3$ and $\alpha = 0.6$, the band is $0.904 \leq \theta \leq 0.936$, and at $\theta = 0.92$ the start must be below
0.5. Zeno's test suite checks this case on every sequence of up to 12 answers, for starts of 0, 0.3 and 0.49, and
checks that a start of 0.65 or a threshold of 0.95, outside the conditions, gives different decisions
(`tests/mastery.test.ts`).

The fitted EMA used in this thesis starts at the training students' share of right first answers and has its $\alpha$
chosen for prediction. Its settings need not satisfy the conditions above, and in the simulations they do not (the
fitted $\alpha$ is 0.1 or 0.15, well below one half). The streak rule is therefore compared as a method of its own,
not only as one setting of EMA.

### Proposition 2: BKT is right in its own world

Let the answers on a skill come from a BKT process with parameters $p$, and let the model use the same $p$. Then the
probability the model holds after each answer and its learning step is exactly the probability that the student knows
the skill before the next question, given the answers so far. If mastery is declared the first time this probability
reaches $\theta$, then among the students for whom it is declared, the expected share who truly know the skill at that
moment is at least $\theta$, and, as BKT has no forgetting, they still know it afterwards.

Proof. The first statement holds because the model's update is Bayes' rule followed by the process's own learning
step, with the true parameters. Let $\tau$ be the answer after which mastery is declared. Whether $\tau = t$ is decided
by the first $t$ answers alone, so

$$P(\text{known at } \tau,\ \tau = t) = E\big[\mathbf{1}\{\tau = t\} \cdot P(\text{known at } t \mid \text{answers } 1..t)\big]
\geq \theta \cdot P(\tau = t).$$

Summing over $t$ gives $P(\text{known at } \tau \mid \text{declared}) \geq \theta$. ∎

The consequence for the design is that in a world that is exactly BKT, BKT's precision at threshold $\theta$ is
guaranteed, up to the error in fitting its parameters. A finding that "BKT wins in the BKT world" would be a theorem,
not evidence. The BKT world is therefore used to measure what fitting costs, by setting the fitted model's precision
against $\theta$, and only the worlds that break BKT's assumptions test it.

The simulated BKT world (section 3.4) satisfies the proposition's conditions in its plain form: one question level, a
constant chance of learning, no transfer between skills and no forgetting. Students' starting chance of knowing a
skill varies with their ability, but nothing else depends on ability, so each skill's answers still follow a single
BKT process whose starting probability is the average over students.

## 3.3 Hypotheses

The hypotheses and the test for each were written down, in the thesis outline in the project repository, before the
results were computed.

H1, prediction. On held-out students of the ASSISTments data set, BKT predicts the next first-attempt answer better
than EMA, with a lower log-loss. The test is the difference in mean log-loss per answer between the two models (BKT
minus EMA), with a 95 % interval from a paired bootstrap over students (10,000 resamples). With several thousand
students, a difference too small to matter would still have an interval that excludes zero, so the smallest
difference that counts was fixed in advance at 0.005 in mean log-loss per answer. The verdict follows a rule fixed at
the same time. If the interval excludes zero and the estimate is at least 0.005, the model with the lower log-loss is
better. If the interval excludes zero but the estimate is below 0.005, the difference is real but negligible. If the
interval lies wholly within $\pm 0.005$, there is no practical difference. Anything else is inconclusive. RMSE, AUC
and calibration are reported as secondary measures. H1 is about prediction, not mastery decisions. It is the part of
the research question real data can settle, and it is the only confirmatory test in the thesis.

H2, mastery decisions where the truth is known. In simulated worlds that do not follow BKT's assumptions, namely the
two gradual worlds (elo and irt2pl) and the BKT world with forgetting, BKT needs fewer answers than EMA and the streak
rule before its declarations are right at least 90 % of the time. A declaration is right if the simulated student
truly knows the skill at the moment it is made. Each method's threshold is the cheapest one that meets the 90 %
standard on the training students, and the comparison is the mean number of answers each method then needs on the
held-out students. A method that meets the standard at no threshold is reported as never meeting it, which counts
against it. Results are reported for each world and each of two learning rates separately, as the difference in
answers with its interval over students, and never pooled. The plain BKT world is not part of H2, because
Proposition 2 settles it.

The comparison in H2 was first set at equal cost: each method's threshold chosen so that it needs as many answers as
the streak rule with $N = 3$, and the precision of each compared. A first simulated run showed that in the gradual
worlds almost no student has truly mastered a skill after that many answers, so every method was mostly wrong there
and the comparison could not tell them apart. The comparison was moved to equal precision, the share of declarations
that are right, which has a meaning in every world. This change was made after seeing results, and section 5.3
discusses it as a threat to validity. The equal-cost comparison and the full trade-off between cost and precision are
still reported, as description.

H3, mastery decisions on real data, is exploratory. It describes how often BKT, EMA and the streak rule agree on the
ASSISTments data, and the share of right answers among the next answers after each method declares mastery. It is
exploratory because the data were collected under the streak rule itself (section 5.3).

## 3.4 Data

### ASSISTments 2009–2010

The real answers come from the ASSISTments 2009–2010 skill builder data set [@assistments2010data], logged by the
ASSISTments system [@feng2009assistments]. It records US middle-school students answering mathematics problems, one
row per problem a student answered, with the skill or skills the problem practises and whether the first attempt was
right. The ASSISTments data sets are the ones most widely used to benchmark knowledge-tracing models, and for the
2009–2010 data the corrected version is preferred, because the original contains duplicated records; results from the
two versions should not be compared directly [@abdelrahman2023survey]. The corrected version is used here.

Zeno's importer (`npm run import-assistments`, `src/model/datasets.ts`) applies the usual cleaning. It keeps main
problems only, not the scaffolding questions that a wrong answer opens, and only rows with a skill and a first-attempt
result of 0 or 1. It puts the answers in the order they were given, by the log's order identifier. A problem tagged
with several skills counts once for each skill, as in most work on knowledge tracing; this gives the same answer
weight on each of its skills, and section 5.3 returns to it. The importer also keeps each student's class, so the
bootstrap can resample whole classes as a robustness check (section 3.6). A student who answered in several classes
is counted in the one in which they answered most of the kept problems. For the mastery methods the answers are
grouped into sequences, one per student and skill, which this thesis calls practices.

### Simulated students

The simulation (`src/model/simulate.ts`, `src/model/mastery.ts`) creates 400 students who each practise 38 skills, one
after another, answering 30 questions on each, all at the middle of three difficulty levels. Each student has a true
ability on every skill, made of an overall part, a part for the skill's area and a part for the skill itself, drawn
from normal distributions with standard deviations 1, 0.5 and 0.5. Each skill has a true difficulty drawn with
standard deviation 0.7. After every answer the simulation records whether the student truly knows the skill at that
moment, after any learning from the question. That record is the truth against which mastery decisions are judged.

How answers arise from ability is the simulated world, and four worlds are used. In the elo world, the chance of a
right answer is $\sigma(\text{ability} - \text{difficulty})$, and each question raises the student's ability on the
skill by the learning rate, so the chance of a right answer rises gradually. A skill counts as mastered when the true
chance of a right answer is at least 0.9, a value fixed in advance; 0.8 is reported as a check. The irt2pl world is
the same with a discrimination for each skill, $\sigma(a(\text{ability} - \text{difficulty}))$, where $a$ is drawn
around 1 (its logarithm normal with standard deviation 0.4), so that some skills separate students more sharply than
others. In the BKT world, each skill is known or not, as BKT assumes. A student starts knowing a skill with chance
$\sigma(\text{ability} - \text{difficulty})$, answers right with chance 0.9 if they know it (a slip rate of 0.1) and
0.2 if they do not (a guess rate of 0.2), and after each question on a skill they do not know learns it with a fixed
chance. The BKT world with forgetting adds a chance of 0.02, at each question on a known skill, that the student
loses it, which BKT assumes never happens.

Each world is run at two learning rates, 0.02 and 0.1, the two used in an earlier simulation study of Zeno's adaptive
practice, so that H2 rests on no rate chosen for it. In the gradual worlds the learning rate is the rise in ability per
question, on the logistic scale. In the BKT worlds it sets the chance of learning a skill at each question, 5 % at the
lower rate and 25 % at the higher. Every question teaches the same amount, and practice on one skill does not help
another. Every random choice is seeded, so each run gives the same numbers.

A fifth world was added after the H2 results had been seen, and is reported apart from H2's verdict (section 4.3). It
asks whether a skill that is really several smaller ideas, each learnt all at once as BKT assumes, is what makes
learning look gradual, and it uses Zeno's own questions. Fractions and the whole-number arithmetic it rests on were
decomposed by hand into sixteen ideas: the times tables, long multiplication, exact division, the highest common factor,
the lowest common multiple, equivalent fractions, lowest terms, a common denominator, adding over a common denominator,
multiplying, the reciprocal, dividing, and the two conversions between mixed numbers and improper fractions, with the
connections between them (`src/model/conceptGraph.ts`). A simulated learner knows or does not know each idea. Every
learner practises the skills times, hcf and fractions in that order, 30 questions on each, the questions made by Zeno's
generators at the three levels in turn, and each question is read for the ideas it needs: a times question needs the
times tables and, above 12, long multiplication; an hcf question needs exact division and the highest common factor,
and at its middle level the lowest common multiple as well; a fractions question needs between seven and ten ideas at
once and almost never one alone. An answer is right, but for a slip of 0.1, only when every idea the question needs is
known, and is otherwise a guess with chance 0.2, which is the conjunctive reading of a question on several skills
[@pardos2008composition]; each unknown idea the question needed may then be learnt, with the BKT world's chance. Half
the time a wrong answer could take the form of one of the two mistakes Zeno's checker recognises on fractions, adding
tops and bottoms across, or flipping the wrong fraction when dividing, and the idea that mistake shows missing is
indeed missing, it does. An idea once known stays known from one skill to the next, so the times tables learnt in times
are known in hcf and fractions. A skill is mastered when every idea its questions can need is known, which is the only
state in which the chance of a right answer is 0.9, the gradual worlds' definition. Beside BKT on the skill, the
moving average and the streak rule, this world compares BKT on each idea. A question that needs several ideas updates
them together, as a conjunctive question, for which each idea's posterior has a closed form; in a second form a
recognised mistake puts the blame on its one idea; in a third the ideas' probabilities are also carried from skill to
skill, so that fractions starts from what times and hcf settled. The skill is declared mastered when every one of its
ideas has reached the threshold, and since the skills share ideas each form is judged on one skill at a time. The
world also records, at every moment a learner is exactly one idea short of mastery, whether the idea with the lowest
probability is that one, which is what a system would need to know to choose the next question
(`src/model/ideas.ts`). The world was first run with the generators as they were, in which every fractions question
is an operation; it was run again after the generator was given forms that ask for one idea alone, two seeds in five,
which section 4.3 reports in turn.

## 3.5 Fitting

Every parameter and threshold is chosen on training students only. A fifth of the students are held out, chosen by a
hash of their identifier and a seed, so the split is the same on every run and no student's answers are split between
the two sides. Seed 1 is used throughout, and for H1 seeds 2 to 5 as well (section 3.6).

BKT is fitted for each skill separately by a search over a grid: the starting probability from 0.05 to 0.95 in steps
of 0.1, the learning probability at 0.01, 0.03, 0.05, 0.1, 0.15, 0.2 and 0.3, and the guess and slip probabilities
each from 0.05 to 0.3 in steps of 0.05. The bound of 0.3 on guess and slip rules out degenerate fits (section 2.2).
For each skill the combination that makes the training students' answers most likely is kept. A skill that no
training student practised uses one set of parameters fitted on all skills together.

EMA has one decay rate for all skills. Its starting score is fixed first, at the share of right answers among the
training students' first answers on each skill, so that its first prediction is learnt from data like the rest.
The decay rate is then chosen from 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8 and 0.9 as the
value with the lowest log-loss on the training students.

The streak rule fits nothing. Its $N$ is chosen in the same way as the other methods' thresholds, as described for
each hypothesis below.

BKT has four parameters per skill and EMA two in all, so BKT has more room to fit the training students too closely.
Judging both on held-out students is what makes the comparison fair.

## 3.6 Evaluation

### Prediction (H1)

Both models are fitted on the training students and then predict every held-out answer in order, each answer before
the model learns from it, as the model would be used in a real system (`src/model/evaluate.ts`). The primary measure
is log-loss; RMSE, AUC, accuracy at a threshold of one half and calibration in ten bins are reported as well. The Elo
model, PFA and three counting baselines (each student's rate on each skill, each skill's rate and the overall rate)
are reported as reference rows.

The difference between BKT and EMA in mean log-loss per answer is computed on the same held-out answers, so the
comparison is paired. Its 95 % interval comes from 10,000 bootstrap resamples of whole students, because one
student's answers are not independent of each other, and the verdict follows the rule in section 3.3 (`npm run h1`).
Split seed 1 decides H1. Seeds 2 to 5 show whether the result depends on which students happened to be held out.
Students in one class share a teacher and lessons, so their answers are related too, and resampling students as if
they were independent makes the interval too narrow. As a robustness check, not a second test, the interval is also
computed by resampling whole classes.

### Mastery decisions with known truth (H2)

For each held-out student and skill, each method's rule gives the answer after which it first declares mastery, or
none. Three measures describe a rule. Its precision is the share of its declarations that are right, meaning the
student knew the skill right after the declaring answer, which is the moment BKT's probability refers to. Its cost is
the mean number of answers until it declares, where a practice in which it never declares counts all 30 answers, as a
student who is never let go practises to the end. The cost is therefore the answers needed within a session of 30
questions, not the time a method would take to declare without that limit, which for a method that rarely declares can
be much longer; the share declared is reported beside it for this reason. Its share missed is the share of practices
ending with the skill known in which it never declared.

For the H2 comparison, each method's threshold is the cheapest one, on the training students, whose precision there is
at least 90 % (`compareAtPrecision` in `src/model/mastery.ts`). The thresholds tried for BKT and EMA run from 0.50 to
0.99 in steps of 0.01, then more finely up to 0.9999, since BKT's probability crowds just below 1 and only the finest
steps make it wait longer. For the streak rule $N$ runs from 1 to 30. After the results, the search for BKT and EMA was
continued above 0.9999, to $1 - 10^{-15}$, as a check that is reported apart from H2's verdict (section 4.3). The chosen
rules are then applied to the held-out students. For each, the cost has a 95 % interval from 2,000 bootstrap resamples
of held-out students, and so does the difference between its cost and BKT's, which is the number of answers BKT saves.

Around this comparison, as description, the three methods are also compared at the streak rule's cost: BKT and EMA
each get the threshold at which they need, on the training students, as many answers as the streak rule with $N = 3$,
and their precision is compared. BKT at its usual threshold of 0.95 is reported too; in the plain BKT world its
precision should be at least 0.95 by Proposition 2, and any shortfall is the cost of fitting. Finally, each method's
threshold is swept (BKT and EMA from 0.80 to 0.99, the streak rule from 2 to 6) to draw the trade-off between cost and
precision in each world. After the results, the calibration of the scores the methods decide on was added as
description: after every answer of every held-out practice, BKT's $P(L)$, BKT's chance of a right answer and EMA's
score are set against whether the student had mastered the skill at that moment, with the Brier score and ten
calibration bins for each (`masteryCalibration` in `src/model/mastery.ts`).

### Mastery decisions on real data (H3)

On the held-out ASSISTments practices, BKT at 0.95, the streak rule with $N = 3$ and EMA at the threshold that costs as
much as the streak rule on the training students are compared pairwise: how often both declare mastery, only one does
or neither does, and where both do, how far apart their declarations are. For each method, the share of right answers
among the next three answers after it declares mastery is reported, where the practice has such answers.

## 3.7 Where this sits in Zeno

Zeno's practice engine (Appendix A) chooses each student's next question from a learner model of the Elo kind, which
keeps an ability for every student on every skill and a difficulty for every question. Its adaptive policy skips a
skill once it counts as mastered, which it does when the model gives a hard question on that skill at least an 80 %
chance of a right answer (`MASTERED_AT` in `src/model/policy.ts`). That rule was set by judgement, not measured. The
question this thesis asks is the one Zeno's design raised: whether a model built for the purpose, BKT, decides mastery
better than a rule anyone can explain. Zeno's own Elo-based rule is not one of the methods compared, because it depends
on question levels that the ASSISTments data do not have. Chapter 6 draws the consequences for it.
