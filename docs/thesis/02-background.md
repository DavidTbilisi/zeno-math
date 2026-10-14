# 1 Background and related work

This chapter covers the ideas the comparison rests on. Section 1.1 describes mastery learning and how deployed systems
decide that a skill is mastered. Section 1.2 describes Bayesian Knowledge Tracing, including its form for questions
that need several skills, the simple estimators it is compared with, together with earlier comparisons of mastery
criteria, and, briefly, the other common student models. Section 1.3 covers knowledge components and the grain of a
skill model, what earlier work has found about it, and how student models are judged. Throughout, $c \in \{0, 1\}$ is
whether an answer was right and $\sigma(x) = 1 / (1 + e^{-x})$ is the logistic function.

## 1.1 Mastery learning and the mastery decision

Mastery learning holds that most students can reach a high level in a subject if each unit is learnt to a set
standard before the next one starts, and if the time each student spends varies to make that possible. Bloom's
studies of mastery learning, and his "two sigma" comparison of group teaching with one-to-one tutoring, made the idea
a benchmark for instruction and later for tutoring systems [@bloom1984]. Reviews of intelligent tutoring systems,
many of which implement mastery learning, find that they raise test scores compared with conventional teaching
[@kulik2016] and that step-based tutors come close to human tutors [@vanlehn2011].

A computer system that implements mastery learning has to turn "learnt to a set standard" into a rule it can apply
after every answer. Three such rules are common in systems that have been used at scale. The Cognitive Tutors, which
introduced BKT, estimate the probability that a student knows each skill and treat the skill as mastered once that
probability reaches 0.95 [@corbett1994]. The ASSISTments skill builders, problem sets for practising one skill, ended
when a student answered three problems in a row right [@assistments2010data]. Khan Academy tracks each skill through
a series of mastery levels that a student climbs by answering correctly [@khanmastery]. The first rule depends on a
fitted model; the second needs nothing but the last few answers.

The choice of rule has consequences either way. A rule that declares mastery too early lets a student move on to
work that builds on a skill they do not have. A rule that declares it too late spends practice time on questions the
student could already answer, which costs time and, judging by experiments with the difficulty of practice, can cost
motivation [@jansen2013success]. Every mastery rule trades these two errors against each other, usually through a
threshold: a higher probability for BKT, a longer run for the streak rule. Comparing rules therefore means comparing
them along the whole trade-off, or at a point on it that is fixed in advance, and this thesis does both (section 2.3).

## 1.2 Bayesian Knowledge Tracing, simple estimators and other student models

### Bayesian Knowledge Tracing

Bayesian Knowledge Tracing [@corbett1994] models each skill separately, as either known or not known. It is a hidden
Markov model with two states and four parameters per skill. The first, $P(L_0)$, is the chance that the skill is
known before any practice. The second, $P(T)$, is the chance of learning it at each practice opportunity. The third,
$P(G)$, is the chance of a right answer by guessing when the skill is not known, and the fourth, $P(S)$, the chance of
a wrong answer by slipping when it is known.

With $L$ the current probability that the skill is known, the chance of a right answer is

$$P(c = 1) = L\,(1 - P(S)) + (1 - L)\,P(G).$$

After the answer, Bayes' rule gives the probability that the skill was known when it was answered,

$$L_{c=1} = \frac{L\,(1 - P(S))}{L\,(1 - P(S)) + (1 - L)\,P(G)}, \qquad
L_{c=0} = \frac{L\,P(S)}{L\,P(S) + (1 - L)\,(1 - P(G))},$$

and the practice then gives a chance to learn, $L' = L_c + (1 - L_c)\,P(T)$. The value $L'$ is the probability that
the student knows the skill before the next question, and it is the number a mastery threshold is applied to.

The model makes three assumptions that matter for this thesis. Learning happens all at once: a student moves from not
knowing to knowing in one step, rather than becoming gradually more likely to answer right. Nothing is forgotten:
once known, a skill stays known. And all students share the same four parameters for a skill, so a strong student and
a weak one start from the same $P(L_0)$. Each of these is known to be a simplification. Extensions add forgetting,
differences between students and links between skills, and with them BKT predicts real answers about as well as much
more complex models [@khajah2016; @yudelson2013]. The standard model is studied here because it is the one deployed
systems use, and because its assumptions can be broken on purpose in a simulation to see what that costs. The first
assumption is also the one the grain of the model bears on most directly: whether a skill is learnt in one step depends
on what is called a skill.

The parameters are fitted per skill on earlier students' answers, by expectation–maximisation or by searching a grid
of values for the combination that makes the observed answers most likely. Two problems are well known. First, the
fit is not always meaningful. A fitted guess rate above one half implies that knowing the skill makes a right answer
less likely, and it is usual to bound guess and slip below about 0.3 to rule such fits out. Second, different
parameter values can predict the observed answers equally well while implying different probabilities that the
student knows the skill, so the fitted value of $L$ is not fully determined by the data [@beck2007identifiability].
That second problem matters directly for mastery decisions, which act on $L$ rather than on the predictions.

A question may need several skills at once. The usual reading is conjunctive: the answer is right, but for a slip,
only when every skill it needs is known, and otherwise a guess. @pardos2008composition tested this reading against a
compensatory one on multi-skill mathematics questions and found that the conjunctive model predicted them better. In
that model, with the skills independent given what is known of each, the chance that every needed skill is known is
the product of their probabilities, and each skill's posterior after the answer has a closed form, so a question that
needs $m$ skills updates all $m$ without summing over their $2^m$ joint states (section 2.1). The consequence that
matters here is that a question which needs many skills says little about any one of them: when the model is nearly
sure that not every skill is known, it puts a right answer down to guessing and a wrong one to whichever skill is
missing, so no single probability moves far. @xu2012subskills compared methods for tracing several subskills from such
questions and found that how the evidence is shared among them decides how well each is traced.

### Simple estimators and earlier comparisons

The simplest estimate of whether a student has learnt a skill is the share of their answers on it that were right.
It weighs a mistake made at the start, before any practice, as heavily as one made just now, which is wrong for a
student who is learning. Two common alternatives weigh recent answers more.

The streak rule looks only at the end of the sequence: the skill is mastered when the last $N$ answers were all right.
It needs no fitting, a teacher or student can see at once why it has or has not fired, and with $N = 3$ it is the
rule of the ASSISTments skill builders. It gives no probability, so it cannot be judged as a predictor, and it ignores
everything before the most recent wrong answer.

The exponential moving average (EMA) keeps a score $s$ between 0 and 1 that starts at some value $s_0$ and after each
answer becomes

$$s \leftarrow (1 - \alpha)\,s + \alpha\,c,$$

with $0 < \alpha < 1$. A right answer moves the score a share $\alpha$ of the way towards 1, and a wrong one the same
share towards 0, so an answer $k$ steps back carries weight proportional to $(1 - \alpha)^k$. The score can be read as
the predicted chance of a right answer, so EMA can be judged with the same metrics as BKT. A mastery rule follows by
declaring mastery when $s$ reaches a threshold $\theta$. The decay $\alpha$ is the only parameter apart from the
starting value, and it is the same for every skill. Proposition 1 in section 2.1 shows that the streak rule is exactly
an EMA rule for some settings of $\alpha$, $\theta$ and $s_0$. Neither the EMA nor the streak rule assumes anything
about what a skill is: they read a sequence of answers, whatever the sequence is on. This is why the granularity
studies compare them with BKT at every grain.

Mastery criteria have been compared directly before. @pelanek2017mastery analysed several criteria for a single,
well-specified skill on simulated and real data, among them BKT, moving averages and streaks. They found that the
choice of data and of the threshold mattered more than the choice of learner model, and they recommended the
exponential moving average as a mastery criterion. @fancsali2013mastery studied by simulation how well mastery
assessment with BKT performs at best and at worst, when the model's parameters differ from the ones that generate the
answers. The first part of this thesis is close to both. It differs in proving when the streak rule is an EMA rule, in
fixing a single comparison and its verdict rule in advance, in testing prediction on held-out students of a public data
set, and in measuring decisions in simulated worlds built to break BKT's assumptions in stated ways. Neither earlier
study varied the grain of the skill.

### Other student models

Three other families of student model are common, and two of them appear in this thesis only as reference rows.
@abdelrahman2023survey survey knowledge tracing as a whole, from BKT to the deep models that now predict best on most
benchmark data sets.

The Elo rating, developed to rate chess players [@elo1978], treats a student and a question as two players and a right
answer as a win for the student [@pelanek2016elo]. After each answer, the student's ability and the question's
difficulty move by the difference between the outcome and the predicted chance $\sigma(\theta - b)$. It is an online
approximation of the Rasch model [@rasch1960] that also follows learning, it needs no training phase, and Math Garden
uses it to choose questions near a target chance of success [@klinkenberg2011]. Zeno's learner model is of this kind
(Appendix A).

Performance Factors Analysis (PFA) [@pavlik2009pfa] is a logistic regression on a student's earlier right and wrong
answers on each skill, with weights fitted on training students. It often predicts as well as BKT or better
[@pavlik2009pfa].

Deep knowledge tracing [@piech2015dkt] replaces the hand-built model with a recurrent neural network over the whole
history of answers. It predicted much better than BKT in its original evaluation, though much of the gap closes when
BKT is given forgetting and differences between students [@khajah2016]. It needs a large training set and its internal
state is much harder to interpret than BKT's or a moving average, and it is not what deployed systems use to decide
mastery, so it is not compared here.

The Elo model and PFA are already implemented in the evaluation code this thesis uses, and they are reported in the
prediction table as points of reference. They are not part of any hypothesis.

## 1.3 The grain of a skill model and how models are judged

### Knowledge components and the grain of a skill model

A knowledge component, in the framework of @koedinger2012kli, is "an acquired unit of cognitive function or structure
that can be inferred from performance on a set of related tasks": the unit a student learns, which may or may not be
the unit a curriculum names. A skill model, or cognitive model, says which components each task needs. @tatsuoka1983rulespace
wrote that mapping as a matrix with one row per task and one column per component, the Q-matrix, and most later work
on skill models uses the same form. The grain of a skill model is how many components it has and how the tasks are
spread over them. The same set of problems can be modelled at any grain, from one component for everything to one
component per distinct step, and nothing in the data says which is right.

Finding the right grain has been treated as a search. Learning factors analysis [@cen2006lfa] starts from a given
skill model and tries splitting a component by some feature of the tasks, or merging two components, keeping the
change when it fits the students' learning curves better; it is a search over grains, judged by prediction. The
Cognitive Tutors themselves were built on fine-grained models of production rules, with BKT run on each, so a fine
grain is BKT's original setting [@corbett1994].

The effect of grain on prediction has been measured on the system this thesis's real data come from. @pardos2007granularity
fitted Bayesian network models of the ASSISTments students at four grains, with 1, 5, 39 and 106 skills, and found that
the finer models predicted the students' scores on a state test better. @pardos2007finegrained reached the same result
with mixed-effects models beside the Bayesian ones, and @feng2009grainsize extended the mixed-effects analysis, finding
again that the finest model, of 106 components for eighth-grade mathematics, predicted the test best. These studies
compared grains for predicting an external test score. None measured mastery decisions against a known truth, which no
real data set allows, because a real student's state is never observed. That is the gap the simulated part of this
thesis fills: in a world where the true grain is known, the model's grain can be set coarser, equal or finer, and the
decisions can be judged.

Two failure modes of a wrong grain are already known in outline. A model that is too coarse mixes components that
students have or lack separately, so the skill it tracks has no single state to be in, and a model built on one known
state, as BKT is, has nothing to refer to. A model that is too fine divides the evidence: with $k$ components and $n$
questions each component is asked about $n / k$ times, and where the questions cannot tell two components apart the
data say nothing about either on its own, which is the identifiability problem [@beck2007identifiability] at the level
of the components. @xu2012subskills found exactly this in tracing subskills from questions that need several at once.
What this thesis adds is a measurement of both failures in the same terms, the precision of declarations and the
threshold each method needs, with the methods of section 1.2 beside BKT, and the condition on the questions under which
the finer grain works.

### How student models are judged

A student model that gives probabilities is judged by how good those probabilities are, and @pelanek2015metrics
reviews the metrics in use and the ways each can mislead. With $p_i$ the prediction and $c_i$ the outcome of answer
$i$ out of $n$, the log-loss is the negative mean log-likelihood,

$$-\frac{1}{n}\sum_{i=1}^{n} \left[c_i \log p_i + (1 - c_i) \log(1 - p_i)\right].$$

It punishes a confident wrong prediction heavily, and always predicting one half gives $\log 2 \approx 0.693$. The
root mean squared error, the square root of the Brier score [@brier1950], is less dominated by a few extreme
predictions. The area under the ROC curve (AUC) is the chance that a randomly chosen right answer got a higher
prediction than a randomly chosen wrong one [@fawcett2006]. It measures ranking only, so a model whose probabilities
are all too high by the same amount can still have a good AUC. Calibration compares predictions with outcomes
directly: answers are grouped into bins by their prediction, and each bin's mean prediction is set against the share
of right answers in it.

This thesis uses log-loss as its primary metric for prediction. A mastery decision acts on the probability itself,
not on a ranking, so a metric that judges the probability is the relevant one, and log-loss is the one that punishes
a confident wrong probability most, which is the error that makes a mastery decision wrong. The others are reported
alongside it. Where the truth is known, the Brier score of a method's own score against the truth after every answer
measures its calibration as a mastery estimate, which is the sense of reliability in the research question.

How the data are split matters as much as the metric. A model judged on the students it was fitted on can memorise
them, and a split by answers rather than by students lets the model see part of a test student's history during
fitting. The fair test for a system that will meet new students holds out whole students: the model is fitted on the
rest and then predicts each held-out student's answers in order, learning from each answer only after predicting it,
as it would in use [@pelanek2015metrics].

Prediction is not the same as deciding mastery. A model can predict the next answer well on average and still declare
mastery too early or too late, and two models that predict equally well can declare it at different times. Real data
cannot settle which declaration was right, because a real student's true state is never observed. This is why the
prediction comparisons (H1, G4) are made on real data and the comparisons of decisions (H2, G1 to G3) on simulated
students whose true state is known.

In sum, systems decide mastery either with a fitted model, of which BKT is the standard, or with a simple rule on recent
answers, of which the streak rule is the most common. BKT gives a probability that the student knows the skill, but
it rests on assumptions that real learning breaks, and its fitted parameters are not always identifiable. The EMA is a
simple estimator that also gives a probability, so it can be compared with BKT on prediction, and the streak rule is
one of its special cases. Earlier work has compared mastery criteria and found the threshold and the data to matter
more than the model, and has compared the grain of skill models for predicting test scores, finding finer models
better. What a grain does to the mastery decision itself, against a known truth, has not been measured. The next
chapter sets out how this thesis compares the three methods at one grain and then across grains.
