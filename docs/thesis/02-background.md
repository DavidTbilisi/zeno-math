# 2 Background and related work

This chapter covers the ideas Zeno is built on. Section 2.1 reviews adaptive practice and what is known about the
right difficulty for a practice question. Section 2.2 describes the student models that adaptive systems use to
estimate what a learner knows, and section 2.3 how those models are judged. Section 2.4 covers feedback on wrong
answers and the diagnosis of mistakes. Section 2.5 looks at existing digital tools for the maths classroom, and
section 2.6 at the statistics of the pre/post experiment Zeno is designed to run.

## 2.1 Adaptive practice

### 2.1.1 Difficulty and learning

The idea that teaching works best a little beyond what a learner can already do alone is old. Vygotsky's *zone of
proximal development* is the range of tasks a child cannot yet do unaided but can do with help [@vygotsky1978]. A
practice system cannot give the help a teacher gives, but it can try to choose questions from the corresponding range:
not yet automatic, not yet out of reach.

Turning this into a number requires a measure of difficulty *for this learner*. The usual measure is the chance that
the learner answers correctly. Math Garden (Rekentuin), a Dutch adaptive practice system used by many primary
schools, chooses items so that each child succeeds about 75 % of the time [@klinkenberg2011]. A field experiment in
Math Garden assigned children to different target success rates and looked at maths anxiety, perceived competence
and performance [@jansen2013success]. **[TODO: state the three targets and the main findings from the paper itself;
in particular whether the easier setting led to more items practised and how that related to performance.]** The
choice of target is a trade-off between how much a single question can teach and how willing a learner is to keep
going.

A theoretical argument points the same way from the other side. For a broad class of learning algorithms trained by
gradient descent, @wilson2019 show that learning is fastest when the error rate is about 15.9 %, that is, at a success
rate of about 85 %. Their model is of a learner adjusting a single decision boundary, not of a student learning
algebra, and it does not say how a target interacts with prerequisites or transfer between skills. It is cited here
because it shows that an "optimal" target depends on assumptions about how learning happens, which is the point
section 5.3 makes with simulations.

### 2.1.2 Adaptive systems in practice

Intelligent tutoring systems that adapt to the learner have been studied for decades. Bloom's "two sigma" result for
one-to-one human tutoring set a benchmark for them [@bloom1984]. Reviews of the evidence find that step-based tutoring systems come close to human tutors
[@vanlehn2011] and that intelligent tutoring systems on average raise test scores compared with conventional
teaching [@kulik2016]. These reviews compare whole systems with other forms of teaching. They do not isolate the
contribution of the *selection* of practice items, which is what Zeno's study compares: the same questions, feedback
and time, chosen in two different ways.

Two systems are close to Zeno's design:

- **Math Garden** [@klinkenberg2011] rates children and items on one scale with an Elo-style rule (section 2.2.1),
  updates both after every answer, and chooses items near a target chance of success. It has no training phase: the
  ratings start from defaults and move with the answers. Zeno's learner model follows this approach.
- **ASSISTments** [@feng2009assistments] is a web-based system from Worcester Polytechnic Institute, used in US middle
  schools, that tutors while it assesses: a wrong answer opens a sequence of scaffolding questions. Its logs of
  students' answers have been released as public data sets. The 2009–2010 "skill builder" set is one of the most
  used benchmarks for student models, and Zeno uses it to evaluate its learner model on real answers (section 5.2).

Item selection is not only about difficulty. Mixing practice on different skills (*interleaving*), rather than
practising one skill in a block, improved later test scores in a mathematics experiment by @rohrer2007. Zeno's
adaptive policy interleaves on purpose (section 4.4); its fixed policy, like most textbook exercise lists, practises
each skill in a block.

## 2.2 Student models

A student model estimates, from a learner's answers so far, the chance that they will answer the next question
correctly. An adaptive system needs one to choose questions. This section describes the four families that matter for
Zeno: item response theory and its online form, the Elo rating; Bayesian Knowledge Tracing; Performance Factors
Analysis; and deep knowledge tracing. Throughout, $c \in \{0, 1\}$ is whether an answer was correct and
$\sigma(x) = 1 / (1 + e^{-x})$ is the logistic function.

### 2.2.1 Item response theory and the Elo rating

Item response theory (IRT) models the chance of a correct answer as a function of the student's ability $\theta$ and
the item's difficulty $b$, on the same scale. The simplest model, due to @rasch1960, is

$$P(c = 1) = \sigma(\theta - b).$$

When ability equals difficulty the chance is 50 %; each unit of difference multiplies the odds by $e$. The
two-parameter logistic model adds a discrimination $a$ per item, $P(c = 1) = \sigma(a(\theta - b))$, so that some items
separate strong and weak students more sharply than others. Classical IRT fits all parameters at once from a large
data set, and assumes that ability does not change while the data are collected. Neither holds in a practice system:
items are new, and the point of practice is that ability changes.

The **Elo rating** was developed to rate chess players [@elo1978]. Applied to education, the student and the item are
the two "players": a correct answer is a win for the student [@pelanek2016elo]. After each answer, both ratings move
by the *surprise*, the difference between what happened and what was predicted:

$$\theta \leftarrow \theta + K\,(c - P), \qquad b \leftarrow b - K\,(c - P),$$

where $P = \sigma(\theta - b)$ is the prediction made before the answer and $K$ is a step size. An unexpected right
answer raises the student's ability and lowers the item's difficulty; an expected one changes little. The Elo rating
is therefore an online, approximate way to fit a Rasch model that also tracks learning. A fixed $K$ is a compromise
between new students and items, whose ratings should move fast, and settled ones, which should move slowly. A common
remedy is an *uncertainty function* that shrinks with the number of answers $n$ a rating has seen, for example
$K = U(n) = \alpha / (1 + \beta n)$ [@pelanek2016elo].

Elo-based models have practical advantages for a classroom system. They need no training data, they learn from the
first answer, the computation after each answer is a few additions, and every number has a plain meaning a teacher can
be told ("the chance that this student gets a level-2 question on this skill right"). Extensions add layers of ability
(for example a global ability plus a deviation per skill or concept), so that a skill a student has not tried yet
starts from what they showed elsewhere [@pelanek2016elo]. Zeno's model, described in section 4.3, has three such layers
(overall, area and skill) and a difficulty per skill and level.

### 2.2.2 Bayesian Knowledge Tracing

Bayesian Knowledge Tracing (BKT) [@corbett1994] models each skill as either known or not known. It is a hidden Markov
model with two states and four parameters per skill:

- $P(L_0)$, the chance the skill is known before practice;
- $P(T)$, the chance of learning it at each practice opportunity;
- $P(G)$, the chance of guessing right when it is not known;
- $P(S)$, the chance of slipping (answering wrong) when it is known.

With $L$ the current probability that the skill is known, the chance of a correct answer is

$$P(c = 1) = L\,(1 - P(S)) + (1 - L)\,P(G).$$

After observing the answer, Bayes' rule gives the probability that the skill was known,

$$L_{c=1} = \frac{L\,(1 - P(S))}{L\,(1 - P(S)) + (1 - L)\,P(G)}, \qquad
L_{c=0} = \frac{L\,P(S)}{L\,P(S) + (1 - L)\,(1 - P(G))},$$

and practice then gives a chance to learn: $L' = L_c + (1 - L_c)\,P(T)$. The parameters are fitted per skill on
training data, usually by expectation–maximisation or by a search over a grid of values. Unconstrained fits can be
*degenerate*, for example a guess rate above one half, so that knowing the skill makes a right answer less likely; it
is usual to bound guess and slip below about 0.3.

BKT has been the standard model in cognitive tutors for decades. Its weaknesses for Zeno's setting are that it has no
notion of question difficulty or level within a skill, that it treats skills as independent (a student new to a skill
starts at $P(L_0)$ whatever they showed on related skills), and that it needs training data before it can be used.
Individualised variants add per-student parameters [@yudelson2013], at the cost of more data.

### 2.2.3 Performance Factors Analysis

Performance Factors Analysis (PFA) [@pavlik2009pfa] is a logistic regression on a student's history. In the form used
for one skill $k$ per item, the log-odds of a correct answer are

$$\operatorname{logit} P(c = 1) = \beta_k + \gamma_k\,s_k + \rho_k\,f_k,$$

where $s_k$ and $f_k$ count the student's earlier successes and failures on skill $k$, $\beta_k$ is the skill's
easiness, and $\gamma_k$ and $\rho_k$ say how much each earlier success and failure changes the odds. When an item
involves several skills the terms are summed over them. The parameters are fitted on training students by ordinary
logistic regression. PFA often predicts as well as or better than BKT on the same data [@pavlik2009pfa], and it
handles items with several skills more naturally. Like BKT, it has no student ability that carries across skills,
and it needs a training set.

### 2.2.4 Deep knowledge tracing

Deep knowledge tracing (DKT) [@piech2015dkt] replaces the hand-built model with a recurrent neural network. Each
answer is encoded as a vector $x_t$ (which skill, and whether it was right); a hidden state summarises the history,

$$h_t = \tanh(W_x x_t + W_h h_{t-1} + b_h), \qquad y_t = \sigma(W_y h_t + b_y),$$

and $y_t$ holds the predicted chance of a right answer on every skill at the next step. In the original paper the
network was an LSTM, and on ASSISTments it predicted much better than BKT. Later work found that much of the gap
closes when BKT is given forgetting, ability differences between students, or skill-to-skill structure
[@khajah2016].

DKT is out of scope for Zeno for three reasons. It needs a large training set from the same kind of students and
questions, which a new system does not have. It cannot explain its predictions to a teacher, whose trust in a tool
that chooses their students' work matters. And it is far more expensive to run on a phone after every answer than
an Elo update. Chapter 3 returns to this choice.

### 2.2.5 Summary of the families

| Model | Parameters fitted from data before use | Learns after each answer | Question difficulty | Ability shared across skills |
|---|---|---|---|---|
| IRT (Rasch, 2PL) | all | no | yes | one ability |
| Elo, layered | none (step sizes only) | yes | yes | yes, through layers |
| BKT | four per skill | yes | no | no |
| PFA | three per skill | yes (through counts) | through the skill only | no |
| DKT | network weights | yes | through the skill only | learned, implicitly |

## 2.3 How student models are judged

A student model makes a probabilistic prediction for each answer, so it is judged by how good those probabilities
are. @pelanek2015metrics reviews the metrics used in the field and the ways they can mislead. Zeno reports the
following, with $p_i$ the prediction and $c_i$ the outcome of answer $i$ out of $N$:

- **Log-loss** (cross-entropy), $-\frac{1}{N}\sum_i \left[c_i \log p_i + (1 - c_i) \log(1 - p_i)\right]$, the negative
  mean log-likelihood. It punishes confident wrong predictions heavily. Always predicting 0.5 gives $\log 2 \approx
  0.693$.
- **RMSE**, $\sqrt{\frac{1}{N}\sum_i (c_i - p_i)^2}$, the square root of the Brier score [@brier1950]. It is less
  dominated by a few extreme predictions than log-loss, and @pelanek2015metrics argues for it as a sensible default.
- **AUC**, the area under the ROC curve: the chance that a randomly chosen right answer got a higher prediction than a
  randomly chosen wrong one [@fawcett2006]. It measures ranking only, so a model can have a good AUC while every
  probability is off by the same amount. A value of 0.5 means no better than chance.
- **Calibration**: predictions are grouped into bins (0–10 %, 10–20 %, …) and each bin's mean prediction is compared
  with the share of right answers in it. For an adaptive system that aims at a target chance, calibration matters
  directly: if the model says 75 % and students succeed 60 % of the time, the policy is not doing what it claims.

How the data are split matters as much as the metric. A model evaluated on the same students it was fitted on can
memorise them. The fair test for a system that will meet new students is a *student-wise* split: some students are
held out entirely, the model is fitted on the rest, and then predicts the held-out students' answers one at a time,
updating after each one as it would in use [@pelanek2015metrics]. Zeno's evaluation (section 5.2) follows this design.

## 2.4 Feedback and the diagnosis of mistakes

Feedback is among the strongest influences on learning, but its effect varies widely: feedback about the task and
how to do it helps more than a bare right or wrong, and much more than praise [@hattie2007]. Reviews of formative
feedback in computer-based settings reach a similar conclusion and recommend feedback that is specific, focused on
the task, and short enough not to overload the learner [@shute2008].

Many wrong answers in school mathematics are not random. @brown1978 showed that children's errors in subtraction
follow from systematic "bugs" in otherwise sensible procedures, such as always subtracting the smaller digit from the
larger, and that a program could identify the bug from a child's answers. Familiar examples at secondary level are
adding the numerators and the denominators of two fractions, expanding $(a + b)^2$ as $a^2 + b^2$, and reading
$2^{-3}$ as $-8$. Because each such procedure gives a predictable answer, a checker that knows the numbers of a
question can compute what each mistake would give and recognise it when it is typed. Zeno does this for 17 mistakes
(section 4.2); the wording of its hints, which name the slip, make it small and offer a number to check with, follows
a popular-mathematics approach to such errors [CITATION NEEDED: Orlin (2025), Russian edition — author to supply].

## 2.5 Digital tools for the maths classroom

Two families of tools are relevant: dynamic mathematics software with classroom features, and adaptive practice
platforms.

**GeoGebra Classroom** [@geogebraclassroom] lets a teacher share GeoGebra activities with a class and see each
student's work live. GeoGebra itself is free for non-commercial use and offers graphing, geometry, a computer algebra
system and a large library of user-made activities. **Desmos Classroom** [@desmosclassroom] offers teacher-paced
activities built on the Desmos graphing calculator, with a dashboard of student responses. Both are strong tools for
exploration and for the teacher to see a class's work. Neither chooses questions for each student from a model of
what they know: the activity is the same for everyone, and the teacher adapts. Both are hosted services that require
the teacher to have an account and send students' work to the provider's servers. **[TODO: check the current
interface languages of GeoGebra Classroom and Desmos Classroom, in particular Georgian, before stating anything about
them.]**

Adaptive practice platforms (Math Garden, ASSISTments, and commercial products such as Khan Academy's exercises
[CITATION NEEDED: a source describing Khan Academy's mastery system]) do choose questions per student, but they are
separate from the board the teacher works on, are hosted by their providers, and offer the curricula and languages of
their home markets.

| | Whiteboard for teaching | Questions chosen per student | Self-hosted, no accounts | Georgian interface |
|---|---|---|---|---|
| GeoGebra Classroom | yes | no | no | **[TODO: verify]** |
| Desmos Classroom | partly (activities) | no | no | **[TODO: verify]** |
| Math Garden | no | yes | no | no |
| ASSISTments | no | partly (scaffolding on wrong answers) | no | no |
| Zeno | yes | yes (adaptive condition) | yes | yes |

The table is not a ranking: GeoGebra and Desmos are far more mature tools than Zeno. It shows the combination Zeno
aims at, which none of the others offers: a board teachers can use for whole-class teaching, adaptive practice from
the same page, and a deployment that a school can run on one machine of its own.

## 2.6 Analysing pre/post experiments

Zeno's study is a randomised experiment with a pre-test and a post-test. This section describes how such data are
analysed and how many students are needed.

### 2.6.1 Gain scores and ANCOVA

The intuitive analysis is to compute each student's *gain*, post-test minus pre-test, and compare the mean gains of
the two groups. The alternative is analysis of covariance (ANCOVA): the post-test score is regressed on the group and
the pre-test score,

$$Y_{\text{post}} = \beta_0 + \beta_1\,\text{group} + \beta_2\,Y_{\text{pre}} + \varepsilon,$$

and $\beta_1$ is the effect of the treatment, adjusted for where students started. The gain-score analysis is the
special case $\beta_2 = 1$. When the pre-test is imperfectly correlated with the post-test, as test scores always are,
the fitted $\beta_2$ is below 1, and forcing it to 1 adds noise. @vanbreukelen2006 shows that in *randomised* studies
both analyses are unbiased but ANCOVA has more power, while in non-randomised studies the two can disagree because
the groups differ at baseline (the situation of Lord's paradox [@lord1967]). Since Zeno randomises students, ANCOVA is
the primary analysis, and further factors that vary by design, such as the order of the test forms and the class, are
added to the model.

### 2.6.2 Welch's t-test

As a secondary analysis, the mean gains of the two groups can be compared with a t-test. Student's t-test assumes the
two groups have equal variances, which an intervention may well change. Welch's test [@welch1947] drops that
assumption:

$$t = \frac{\bar x_1 - \bar x_2}{\sqrt{s_1^2/n_1 + s_2^2/n_2}},$$

with degrees of freedom from the Welch–Satterthwaite approximation. With equal group sizes it loses almost nothing when
the variances are in fact equal, so it is a safe default.

### 2.6.3 Effect sizes and power

A p-value says whether an effect is distinguishable from zero, not how large it is. The usual standardised effect
size for two groups is Cohen's $d$, the difference in means divided by the pooled standard deviation [@cohen1988].
Cohen's conventional labels are 0.2 for small, 0.5 for medium and 0.8 for large, with his own warning that they are a
last resort when nothing better is known about the field.

The *power* of a study is the chance that it finds an effect, at a chosen significance level $\alpha$, when the effect
is really there. For a two-sided t-test at $\alpha = 0.05$, about 64 students per group give 80 % power for $d = 0.5$,
and about 393 per group for $d = 0.2$ [@cohen1988]. ANCOVA reduces the required sample by roughly the factor
$1 - \rho^2$, where $\rho$ is the pre/post correlation [@vanbreukelen2006]. A typical class has 20 to 30 students, so
a study of one or two classes can only detect large effects.

Formulas for power assume the effect size is known. For an adaptive practice study it is not, and it depends on how
students learn. The effect on the *test* is also smaller than the effect on what students really know, because a short
test measures knowledge with noise. Section 5.4 therefore estimates power by simulation: it generates many complete
studies under stated assumptions, runs the planned analysis on each, and counts how often it gives $p < 0.05$.

## 2.7 Summary

Adaptive practice chooses questions near a target chance of success, and there are arguments for targets from about
60 % to 85 %. Choosing needs a student model; among the standard ones, a layered Elo rating fits a new, self-hosted
classroom system best because it needs no training data, learns from the first answer, and can be explained to a
teacher, while BKT and PFA serve as baselines to compare it with. Models are judged on held-out students by log-loss,
RMSE, AUC and calibration. Wrong answers often follow known procedures, so feedback can name the mistake. Existing
classroom tools either support the teacher's board or choose questions per student, not both, and are hosted
services. Finally, a randomised pre/post study is analysed with ANCOVA, and its power must be estimated before it is
run. The next chapter turns these points, together with the conditions of the schools Zeno is meant for, into
requirements and a design.
