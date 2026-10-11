# 1 Introduction

## 1.1 The problem

Practice is where most mathematics is learnt, and a practice system has to decide, again and again, when a student
has practised a skill enough to move on. Mastery learning, the idea that a student should master one unit before the
next one builds on it, depends on that decision [@bloom1984]. Stop too early and the student moves on to work that
needs a skill they do not yet have. Stop too late and the student keeps answering questions they could already
answer, time that could have gone to the next skill.

Every adaptive practice system makes this decision for every student and skill, and two kinds of rule are in use. The
systems that schools use mostly apply a simple rule based on recent answers. The ASSISTments skill builders, for
example, ended a problem set when a student had answered three problems in a row right [@assistments2010data], and
Khan Academy tracks each skill through mastery levels that a student climbs by answering correctly [@khanmastery]. The research literature mostly uses a statistical model of the student. In Bayesian Knowledge
Tracing (BKT) [@corbett1994] a skill is either known or not, and the model keeps the probability that the student
knows it. The model allows for a student who guesses right without knowing the skill and for one who slips while
knowing it. The Cognitive Tutors declared a skill mastered when that probability reached 0.95 [@corbett1994].

BKT needs four parameters for each skill, fitted on earlier students' answers, and it rests on assumptions that are
known to be simplifications: a skill is learnt all at once, and once learnt it is never forgotten. A simple rule needs
nothing fitted, or one number, and a teacher can understand it at once. Whether BKT's extra machinery leads to better
decisions is therefore a practical question with a measurable answer, and the answer matters to anyone who builds a
practice system.

It matters in particular to Zeno, the system this thesis grew out of. Zeno is a self-hosted mathematics whiteboard
for Georgian classrooms with a practice engine built in (Appendix A). It already chooses each student's next question
from a learner model, and that choice includes deciding which skills a student has mastered and can leave behind.
Before choosing how Zeno should make that decision, it is worth knowing whether the standard model of the field makes
it better than a rule anyone could explain.

## 1.2 Aim and research question

The aim of this thesis is to find out whether BKT decides when a skill is mastered better than a simple rule, using
evidence that does not require a classroom. The research question is:

> Does Bayesian Knowledge Tracing estimate a student's mastery of a skill more accurately than a simpler method, the
> exponential moving average of their answers, of which the rule "N right in a row" is a special case?

The exponential moving average (EMA) keeps a score between 0 and 1 that moves part of the way towards 1 after each
right answer and towards 0 after each wrong one, so recent answers count more than old ones. It is the simple rule's
probabilistic counterpart: like BKT, it gives a number that can be read as the chance of a right answer, so both
methods can be judged on how well they predict. The streak rule ("N right in a row") is the rule most deployed systems
use, and it is compared as a method of its own.

An earlier plan for this thesis asked a wider question: whether choosing practice questions with a learner model
helps a class learn more than a fixed sequence of questions. That question can only be answered in classrooms, with
ethics approval for children's data, a school's timetable and, as a power analysis showed, several classes (section
6.3). The question asked here needs none of these. Every number in the thesis comes from a public data set of real
students' answers or from simulation, and all of it can be reproduced from the code (Appendix B).

## 1.3 Approach

The question is approached in three ways, and the thesis keeps them apart because they support different kinds of
claim.

Some claims are proved from the definitions and need no data. Proposition 1 gives the exact conditions under which the
streak rule makes the same decisions as an EMA with a threshold, on every sequence of answers. Proposition 2 shows
that when students learn exactly as BKT assumes and the model knows the true parameters, BKT's declarations of mastery
are right at least as often as its threshold says. The second result means that a comparison run only in BKT's own
world would favour BKT by construction, and so it shapes the rest of the design.

One claim is tested on real data, and it is the only confirmatory test in the thesis. On the ASSISTments 2009–2010
data set [@assistments2010data], which records several thousand US middle-school students answering mathematics
problems, BKT and EMA are fitted on some students and then predict every answer of the others. Hypothesis H1 states
that BKT predicts those answers better, measured by log-loss. The test, the size of difference that counts and the
rule for each verdict were fixed before any result was computed.

Real data cannot say whether a declaration of mastery was right, because nobody knows when a real student truly knew
a skill. The remaining claims therefore rest on simulated students, whose true state is recorded after every answer.
Hypothesis H2 states that in simulated worlds where students do not learn as BKT assumes (gradually, or with
forgetting), BKT needs fewer answers than EMA and the streak rule before its declarations are right nine times in
ten. These results hold only as far as each simulated world is believed, and each world is reported separately.
Hypothesis H3, exploratory, describes how often the methods agree on the real data.

## 1.4 Contributions

The thesis makes four contributions. The first is the two propositions: the exact conditions, for answer sequences of
any length, under which "N right in a row" is a moving average with a threshold, and the precision BKT is guaranteed
in a world that matches its assumptions (section 3.2). The second is a comparison of BKT with EMA on held-out students
of a public data set, specified in advance, with an interval and a verdict rule fixed before the data were analysed
(sections 3.3, 3.6 and 4.2). The third is a simulation in which the truth is known, which measures mastery decisions
directly in worlds that do and do not match BKT's assumptions (sections 3.6 and 4.3). The fourth is the code for all
of it, open and deterministic, inside the Zeno repository, with every number reproducible by a command listed in
Appendix B.

None of these is a new model. Both BKT and moving averages are well known, and mastery criteria have been compared
before, most closely by @pelanek2017mastery (section 2.3). The contribution is a careful, pre-specified comparison
with the conditions for each claim made explicit, and an answer to a design question for a real system.

## 1.5 Structure of the thesis

Chapter 2 reviews mastery learning and how mastery is decided in practice, BKT, simple estimators and earlier
comparisons of mastery criteria, and how student models are judged. Chapter 3 sets out the method: the three methods,
the two propositions, the hypotheses, the data, how the methods are fitted and how each hypothesis is evaluated, and
where the result fits in Zeno. Chapter 4 reports the results for each hypothesis. Chapter 5 discusses what they show
and the threats to their validity. Chapter 6 answers the research question, recommends how Zeno should decide mastery
and sets out future work. Appendix A describes Zeno briefly, and Appendix B lists the command behind every number.
