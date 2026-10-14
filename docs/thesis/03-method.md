# 3 Method

This chapter sets out how the research question is answered. Section 3.1 defines grain, components and the relation
between the model's grain and the learners'. Section 3.2 defines the methods compared, and section 3.3 proves two
results that follow from the definitions alone. Section 3.4 states the hypotheses: those of the comparison at one grain,
which is the foundation, and those of the four granularity studies. Section 3.5 describes the data, real and simulated,
section 3.6 how each method is fitted, and section 3.7 how each hypothesis is evaluated. Section 3.8 explains where the
result fits in Zeno.

## 3.1 Grain, components and questions

A topic such as fractions is divided, for modelling, into some number of components, and every question on the topic
needs some of them. The number of components and the mapping from questions to components together make up the grain of
the model (section 2.4). At the coarsest grain the topic is one component and every question needs it. At a finer grain
a question may need one component or several, and two questions may need different ones. The mapping is fixed by
whoever writes the questions or tags the data: in Zeno a generator decides what a question asks for, and in a data set
the skill tags record it.

Students also learn at some grain: there are units that a student acquires as one thing, and a student may have some
of a topic's units and lack others. In the simulations of this thesis that grain is known, because it is built in. The
model's grain can then stand in one of three relations to it. The model is too coarse when one modelled skill is
several learnt units, so that its one state has to stand for a mixture. It is at the right grain when each modelled
component is one learnt unit. It is too fine when one learnt unit is modelled as several components, each of which
sees part of the evidence for the same thing, or when the components are so many that the practice cannot support them.

Mastery of a skill, at whatever grain the model uses, means the same thing throughout: every component the skill's
questions can need is known. In the simulated worlds where answers arise from a chance that rises gradually, this is
read as a true chance of a right answer of at least 0.9, which is the same condition when the components are known or
not with a slip of 0.1, since only a student who knows every component answers right with that chance. The definition
is fixed in advance and does not move with the model's grain, so methods at different grains are judged against the
same truth.

## 3.2 The methods compared

All the methods read one student's answers on one skill, in the order given, and after each answer say whether the
skill is now mastered. Each declares mastery the first time its condition holds and does not take the declaration
back.

BKT on the skill (section 2.2) has four parameters per skill: the chance the skill is known at the start, the chance of
learning it at each question, the chance of a right guess and the chance of a slip. They are fitted on training students
(section 3.6). After each answer the model updates its probability that the student knows the skill, then allows for
learning from the question. Mastery is declared when that probability reaches a threshold $\theta$; the usual choice is
0.95 [@corbett1994].

EMA (section 2.3) has one decay rate $\alpha$, the same for all skills, and a starting score $s_0$, both set from
training students. After each answer the score moves a share $\alpha$ of the way towards 1 if the answer was right and
towards 0 if it was wrong. Mastery is declared when the score reaches a threshold $\theta$.

The streak rule has one parameter, $N$, and declares mastery when the last $N$ answers were all right. With $N = 3$
it is the rule of the ASSISTments skill builders. It fits nothing and gives no probability.

BKT on each component is the finer-grained form. Each component has its own four BKT parameters, and the model keeps a
probability $L_j$ that the student knows component $j$. A question that needs one component is that component's own
BKT step. A question that needs several is read conjunctively [@pardos2008composition]: with $A = \prod_j L_j$ the
probability that every needed component is known, the chance of a right answer is $A(1 - P(S)) + (1 - A)P(G)$, where
$P(G)$ and $P(S)$ are the guess and slip of a question on the skill, and the probability that component $j$ is known
and the answer right is $A(1 - P(S)) + (L_j - A)P(G)$, so that after a right answer

$$L_j \leftarrow \frac{A\,(1 - P(S)) + (L_j - A)\,P(G)}{A\,(1 - P(S)) + (1 - A)\,P(G)},$$

and after a wrong one the same with $P(S)$ and $1 - P(G)$ in place of $1 - P(S)$ and $P(G)$; then each needed
component has its chance to be learnt, at its own rate. The skill is declared mastered when every one of its
components' probabilities has reached the threshold $\theta$. Two variants are compared in the world of ideas. With
blame, a wrong answer in the shape of a mistake Zeno's checker recognises, which shows one particular idea missing, is
read as a wrong answer on that idea alone, since the mistake says the student got as far as it. Carried, each
component's probability is kept from one skill to the next, so that a skill whose arithmetic was settled in an earlier
skill starts from what that skill showed, rather than from the fitted starting probability.

BKT and EMA both give a probability of a right answer before every answer, so both can be judged as predictors (H1,
G4). All the methods make mastery decisions, so all can be judged as decision rules (H2, H3, G1 to G3). Two other
student models already implemented in Zeno's evaluation code, the Elo model and Performance Factors Analysis (section
2.6), are reported as reference rows in the prediction table and are not part of any hypothesis.

## 3.3 What can be proved

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
against $\theta$, and only the worlds that break BKT's assumptions test it. The proposition also says what a change of
grain does: a skill made of several components, each a BKT process, is not itself a BKT process, so the guarantee holds
for BKT on each component and not for BKT on the skill. Whether, and by how much, BKT on the skill then falls short is
what G1 measures.

The simulated BKT world (section 3.5) satisfies the proposition's conditions in its plain form: one question level, a
constant chance of learning, no transfer between skills and no forgetting. Students' starting chance of knowing a
skill varies with their ability, but nothing else depends on ability, so each skill's answers still follow a single
BKT process whose starting probability is the average over students.

## 3.4 Hypotheses

The hypotheses and the test for each were written down, in the thesis outline in the project repository, before the
results were computed. H1 to H3 are the foundation: the methods compared at the grain the data or the simulation gives.
They were stated and, for H2, run under the working title. G1 to G4 are the granularity studies the title asks for. G1
to G3 rest on simulated worlds that were first built as checks after H2's results had been seen, and their first runs
are reported as such; the sweeps stated below were specified before they were run, and each hypothesis is judged on
its sweep.

### The methods at one grain

H1, prediction. On held-out students of the ASSISTments data set, BKT predicts the next first-attempt answer better
than EMA, with a lower log-loss. The test is the difference in mean log-loss per answer between the two models (BKT
minus EMA), with a 95 % interval from a paired bootstrap over students (10,000 resamples). With several thousand
students, a difference too small to matter would still have an interval that excludes zero, so the smallest
difference that counts was fixed in advance at 0.005 in mean log-loss per answer. The verdict follows a rule fixed at
the same time. If the interval excludes zero and the estimate is at least 0.005, the model with the lower log-loss is
better. If the interval excludes zero but the estimate is below 0.005, the difference is real but negligible. If the
interval lies wholly within $\pm 0.005$, there is no practical difference. Anything else is inconclusive. RMSE, AUC
and calibration are reported as secondary measures. H1 is about prediction, not mastery decisions. It is the part of
the one-grain question that real data can settle.

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

### The granularity studies

G1, too coarse: a skill that is really several components. In a world where a skill is $k$ components, each learnt all
at once as BKT assumes, and the model treats the skill as one, BKT on the skill fails H2's standard once $k \geq 2$,
its calibration worsens with $k$, and the threshold it would need rises with $k$; the EMA and the streak rule, which
assume nothing about the skill, lose less. The sweep is $k$ in 1, 2, 4, 8 and 16, at both learning rates, with the
components asked for one at a time and several at a time (one, two and four of the $k$); and, in the world of ideas,
the three skills of three, six and sixteen ideas asked by Zeno's own questions. The measures are the precision of each
method at the threshold a deployed system would use without a truth to set it by, the cheapest threshold meeting the
90 % standard, and the Brier score of each method's score against the truth.

G2, the right grain, and the condition on the questions. Modelling at the true grain, BKT on each component read
conjunctively, restores the standard at an ordinary threshold and lets the model say which component a learner lacks,
if and only if the questions tell the components apart. The sweep, in the world of ideas on fractions, is the share of
questions that ask for one idea alone (0, 25, 50 and 100 %) against the length of the practice (30, 60 and 120
questions), at both learning rates; the number of components a question needs is swept in the world of components,
where it can be set. The measures are those of G1, together with whether the missing idea is found (at every moment a
learner is exactly one idea short of mastery, how often the idea with the lowest probability is that one, against a
chance of one in $k$), and the answers saved by carrying components from skill to skill.

G3, too fine: finer than the students learn, or than the data supports. There are two ways of being too fine, and both
are hypothesised to cost answers for no gain in precision. In the first, a component that is learnt as one thing is
modelled as two or four, each question tagged with one of them at random, so that each modelled part sees a share of
the evidence for the same thing; declarations should come later, and precision should not improve. In the second, the
number of components grows past what the practice can support: with $k$ components and $n$ questions the mean evidence
per component is $n / k$, and below some value of it the per-component fit should degenerate, with guess or slip at
their bound or the starting probability at the edge of its grid, and the threshold chosen on training learners should
no longer transfer to held-out ones. The sweep is the over-splitting factor 1, 2 and 4 at a true $k$ of two, and $k$
from 1 to 16 at 30 and at 120 questions. The measures are those of G1, together with the answers to declaration, the
share of learners never declared, the share of degenerate fits, and the difference between the threshold chosen on
training learners and the one the held-out learners would have chosen.

G4, real data across grains, confirmatory. On ASSISTments 2009–2010 the same answers can be modelled at three grains
without new data: the data set's own skill tags, the topic areas the importer assigns to them, and one skill for all of
mathematics. The hypothesis is that BKT fitted at the data set's grain predicts held-out students' answers better than
BKT at the topic grain, which predicts better than one skill, measured by log-loss with the paired bootstrap of H1,
0.005 as the smallest difference that counts and the same verdict rule. The difference between the finest and the
coarsest grain is the one confirmatory test; the others are description. Exploratory beside it are whether the EMA
loses less than BKT from coarsening, since it conditions on fewer answers; how the mastery declarations of each method
move with the grain; and how many fits are degenerate at each grain. The thesis does not claim that an optimal grain
exists; it reports where each measure improves or worsens and under what condition.

## 3.5 Data

### ASSISTments 2009–2010

The real answers come from the ASSISTments 2009–2010 skill builder data set [@assistments2010data], logged by the
ASSISTments system [@feng2009assistments]. It records US middle-school students answering mathematics problems, one
row per problem a student answered, with the skill or skills the problem practises and whether the first attempt was
right. The ASSISTments data sets are the ones most widely used to benchmark knowledge-tracing models, and for the
2009–2010 data the corrected version is preferred, because the original contains duplicated records; results from the
two versions should not be compared directly [@abdelrahman2023survey]. The corrected version is used here.

Zeno's importer (`npm run import-assistments`, `src/model/datasets.ts`) applies the usual cleaning. It keeps main
problems only, not the scaffolding questions that a wrong answer opens, and only rows with a skill and a first-attempt
result of 0 or 1. It puts the answers in the order they were given, by the log's order identifier, and keeps each
problem's identifier. A problem tagged with several skills counts once for each skill, as in most work on knowledge
tracing; this gives the same answer weight on each of its skills, and section 5.3 returns to it. The importer also
keeps each student's class, so the bootstrap can resample whole classes as a robustness check (section 3.7). A student
who answered in several classes is counted in the one in which they answered most of the kept problems. For the
mastery methods the answers are grouped into sequences, one per student and skill, which this thesis calls practices.

For G4 the same rows are modelled at three grains (`src/model/grain.ts`). At the finest, each answer keeps the skill
tag the data set gives it. At the middle grain each skill is replaced by the topic area the importer assigns it, about
a dozen areas such as fractions, geometry and probability; at the coarsest every answer belongs to one skill. A problem
tagged with several skills is one observation per skill at the finest grain; where those skills fall together at a
coarser grain it becomes one observation there, the first kept. The models at the three grains are therefore compared
on the answers every grain has, the first observation of each problem, so that no grain is judged on answers another
grain never saw. The split into training and held-out students is the same at every grain.

### Simulated students at one grain

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

### The world of components

The first granularity world (`src/model/atoms.ts`) keeps everything of the BKT world except what a skill is. Every
skill is $k$ components, and each component is exactly what BKT assumes a skill is: known or not, learnt all at once,
with the BKT world's guess of 0.2 and slip of 0.1 and its chance of being learnt from a question that asks for it. A
learner's chance of knowing a component at the start is their ability against the component's own difficulty, as in
the BKT world. The 400 learners each practise 12 skills of $k$ components, 30 questions on each unless stated. A
question on the skill asks for one component chosen at random, or, when several are asked at once, for that many
distinct components, and is right, but for a slip, only when every component it asks for is known. The skill is
mastered when every component is known, which is the only state in which the chance of a right answer is 0.9. With
$k = 1$ this is the plain BKT world. The model's grain is set apart from the learners': BKT on the skill sees one
state where there are $k$, which is G1; BKT on each component is at the right grain; and with an over-splitting
factor above 1 every component is modelled as that many parts, each question tagged with one of its component's parts
at random, so that the answers and the truth are the same at every factor and only the model is finer, which is G3.
Components may also be shared between skills, each in a set number of them, so that what a learner knows of a
component goes with them from one skill to the next and BKT on each component can carry it.

### The world of ideas

The second granularity world (`src/model/ideas.ts`) replaces the abstract components with the ideas of a real topic and
the random questions with Zeno's own. Fractions and the whole-number arithmetic it rests on were decomposed by hand
into sixteen ideas: the times tables, long multiplication, exact division, the highest common factor, the lowest
common multiple, equivalent fractions, lowest terms, a common denominator, adding over a common denominator,
multiplying, the reciprocal, dividing, the two conversions between mixed numbers and improper fractions, and adding
whole numbers, with the connections between them (`src/model/conceptGraph.ts`). A simulated learner knows or does not
know each idea. Every learner practises the skills times, hcf and fractions in that order, 30 questions on each unless
stated, the questions made by Zeno's generators at the three levels in turn, and each question is read for the ideas it
needs: a times question needs the times tables and, above 12, long multiplication; an hcf question needs exact division
and the highest common factor, and at its middle level the lowest common multiple as well; a fractions question that is
an operation needs between seven and ten ideas at once, and a fractions form that asks for one idea alone, a missing
top of an equivalent fraction, lowest terms, a common denominator, a reciprocal or a conversion, needs that idea and
the idea of a fraction as a part. Two fractions questions in five are such forms, as Zeno's generator now deals them,
so a fractions question needs about six ideas on average. An answer is right, but for a slip of 0.1, only when every
idea the question needs is known, and is otherwise a guess with chance 0.2; each unknown idea the question needed may
then be learnt, with the BKT world's chance. Half the time a wrong answer could take the form of one of the mistakes
Zeno's checker recognises, such as adding tops and bottoms across or flipping the wrong fraction when dividing, and the
idea that mistake shows missing is indeed missing, it does. An idea once known stays known from one skill to the next,
so the times tables learnt in times are known in hcf and fractions. A skill is mastered when every idea its questions
can need is known: three ideas on times, six on hcf, sixteen on fractions.

Two settings of this world are swept for G2. The share of questions that ask for one idea alone can be raised from the
generator's own, by replacing a generated question with a question on one idea chosen at random, up to every question;
and the length of each practice can be set to 30, 60 or 120 questions. The world also records, at every moment a
learner is exactly one idea short of mastery, whether the idea with the lowest probability under BKT on each idea is
that one, which is what a system would need to know to choose the next question.

## 3.6 Fitting

Every parameter and threshold is chosen on training students only. A fifth of the students are held out, chosen by a
hash of their identifier and a seed, so the split is the same on every run and no student's answers are split between
the two sides. Seed 1 is used throughout, and for H1 seeds 2 to 5 as well (section 3.7).

BKT is fitted for each skill separately by a search over a grid: the starting probability from 0.05 to 0.95 in steps
of 0.1, the learning probability at 0.01, 0.03, 0.05, 0.1, 0.15, 0.2 and 0.3, and the guess and slip probabilities
each from 0.05 to 0.3 in steps of 0.05. The bound of 0.3 on guess and slip rules out degenerate fits (section 2.2).
For each skill the combination that makes the training students' answers most likely is kept. A skill that no
training student practised uses one set of parameters fitted on all skills together. At every grain the same search
runs on whatever the skills are at that grain, so at the coarsest grain of G4 one set of parameters is fitted for all
of mathematics.

BKT on each component is fitted in the same way, one set of parameters per component, on the answers of the questions
that asked for the component: within one skill for the afresh form, and across every skill a student practised, in
order, for the carried form. Where a question asks for several components this is a heuristic, since it treats the
answer as evidence on each component alone, and the conjunctive model's own fit would need expectation–maximisation
over the hidden states of all the components a question needs. The guess and slip of a question on several components
are those fitted for BKT on the skill. A fit is counted as degenerate when its guess or slip is at the bound of 0.3,
which is what the bound is there to stop, and as at the edge when any parameter is at an end of its grid.

EMA has one decay rate for all skills. Its starting score is fixed first, at the share of right answers among the
training students' first answers on each skill, so that its first prediction is learnt from data like the rest.
The decay rate is then chosen from 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8 and 0.9 as the
value with the lowest log-loss on the training students.

The streak rule fits nothing. Its $N$ is chosen in the same way as the other methods' thresholds, as described for
each hypothesis below.

BKT has four parameters per skill and EMA two in all, so BKT has more room to fit the training students too closely,
and the room grows with the number of components. Judging every method on held-out students is what makes the
comparison fair.

## 3.7 Evaluation

### Prediction (H1, G4)

Both models are fitted on the training students and then predict every held-out answer in order, each answer before
the model learns from it, as the model would be used in a real system (`src/model/evaluate.ts`). The primary measure
is log-loss; RMSE, AUC, accuracy at a threshold of one half and calibration in ten bins are reported as well. The Elo
model, PFA and three counting baselines (each student's rate on each skill, each skill's rate and the overall rate)
are reported as reference rows.

The difference between two models in mean log-loss per answer is computed on the same held-out answers, so the
comparison is paired. Its 95 % interval comes from 10,000 bootstrap resamples of whole students, because one
student's answers are not independent of each other, and the verdict follows the rule in section 3.4 (`npm run h1`,
`npm run grain`). Split seed 1 decides H1 and G4. For H1, seeds 2 to 5 show whether the result depends on which
students happened to be held out. Students in one class share a teacher and lessons, so their answers are related too,
and resampling students as if they were independent makes the interval too narrow. As a robustness check, not a second
test, the interval is also computed by resampling whole classes. For G4 the paired comparisons are BKT at the finest
grain against BKT at the coarsest, which is the test, and the other pairs of grains for BKT and for the EMA as
description; and what coarsening costs BKT minus what it costs the EMA, per answer, with an interval from the same
resampling.

### Mastery decisions with known truth (H2, G1 to G3)

For each held-out student and skill, each method's rule gives the answer after which it first declares mastery, or
none. Three measures describe a rule. Its precision is the share of its declarations that are right, meaning the
student knew the skill right after the declaring answer, which is the moment BKT's probability refers to. Its cost is
the mean number of answers until it declares, where a practice in which it never declares counts all its answers, as a
student who is never let go practises to the end. The cost is therefore the answers needed within the practice, not
the time a method would take to declare without that limit, which for a method that rarely declares can be much
longer; the share declared is reported beside it for this reason. Its share missed is the share of practices ending
with the skill known in which it never declared.

For the comparison at equal precision, each method's threshold is the cheapest one, on the training students, whose
precision there is at least 90 % (`compareAtPrecision` in `src/model/mastery.ts`). The thresholds tried for BKT and
EMA run from 0.50 to 0.99 in steps of 0.01, then more finely up to 0.9999, since BKT's probability crowds just below 1
and only the finest steps make it wait longer. For the streak rule $N$ runs from 1 to the length of the practice. After
the results of H2, the search for BKT and EMA was continued above 0.9999, to $1 - 10^{-15}$, as a check that is reported
apart from H2's verdict (section 4.2). The chosen rules are then applied to the held-out students. For each, the cost
has a 95 % interval from 2,000 bootstrap resamples of held-out students, and so does the difference between its cost
and BKT's, which is the number of answers BKT saves, and, in the granularity worlds, the difference between BKT on each
component afresh and carried, which is what carrying saves.

Beside this, every method is judged at the threshold a deployed system would use without a truth to set it by: BKT at
0.95, the streak rule at $N = 3$, the EMA at the threshold that costs on the training students what the streak rule
costs there, and BKT on each component at 0.95. Its precision there is what a wrong grain costs a system that does not
know its grain is wrong, and it is G1's first measure. Each method's threshold is also swept to draw the trade-off
between cost and precision in each world. After the results of H2, the calibration of the scores the methods decide on
was added as description: after every answer of every held-out practice, BKT's $P(L)$, BKT's chance of a right answer,
EMA's score and, at the finer grain, the product of the components' probabilities are set against whether the student
had mastered the skill at that moment, with the Brier score and ten calibration bins for each (`masteryCalibration` in
`src/model/mastery.ts`).

For G2, the world of ideas also records whether the missing idea is found, as section 3.5 describes, and for G3 the
world of components counts the share of fitted parameter sets that are degenerate or at the grid's edge, and, for each
family of rules, the cheapest threshold meeting the standard on the training learners beside the one the held-out
learners would have chosen, with the precision the training threshold reaches held out.

### Mastery decisions on real data (H3, G4)

On the held-out ASSISTments practices, BKT at 0.95, the streak rule with $N = 3$ and EMA at the threshold that costs as
much as the streak rule on the training students are compared pairwise: how often both declare mastery, only one does
or neither does, and where both do, how far apart their declarations are. For each method, the share of right answers
among the next three answers after it declares mastery is reported, where the practice has such answers. For G4 the
same three rules are run at each grain, and the share declared, the mean answers to a declaration and the share right
afterwards are compared across grains.

## 3.8 Where this sits in Zeno

Zeno's practice engine (Appendix A) chooses each student's next question from a learner model of the Elo kind, which
keeps an ability for every student on every skill and a difficulty for every question. Its adaptive policy skips a
skill once it counts as mastered, which it does when the model gives a hard question on that skill at least an 80 %
chance of a right answer (`MASTERED_AT` in `src/model/policy.ts`). That rule was set by judgement, not measured. On the
three skills with a concept graph the policy also keeps one probability per idea for each student, moved by every
stored answer with the conjunctive step of section 3.2, and on fractions it asks the form for the idea the student is
least likely to know (`src/model/ideaState.ts`). Zeno therefore already holds a state at two grains, the skill and the
idea. The question this thesis asks is the one that design raised: which rule should decide mastery, and at which of
the two grains. Zeno's own Elo-based rule is not one of the methods compared, because it depends on question levels
that the ASSISTments data do not have. Chapter 6 draws the consequences for it.
