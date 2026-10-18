# Introduction

## The problem

Practice is where most mathematics is learnt, and a practice system has to decide, again and again, when a student
has practised a skill enough to move on. Mastery learning, the idea that a student should master one unit before the
next one builds on it, depends on that decision [@bloom1984]. Stop too early and the student moves on to work that
needs a skill they do not yet have. Stop too late and the student keeps answering questions they could already
answer, time that could have gone to the next skill.

Every adaptive practice system makes this decision for every student and skill, and two kinds of rule are in use. Some
widely used systems apply a simple rule based on recent answers. The ASSISTments skill builders, for example, ended a
problem set when a student had answered three problems in a row right [@assistments2010data], and Khan Academy tracks
each skill through mastery levels that a student climbs by answering correctly [@khanmastery]. Much of the research
literature uses a statistical model of the student. In Bayesian Knowledge Tracing (BKT) [@corbett1994] a skill is
either known or not, and the model keeps the probability that the student knows it. The model allows for a student who
guesses right without knowing the skill and for one who slips while knowing it. The Cognitive Tutors declared a skill
mastered when that probability reached 0.95 [@corbett1994].

Every one of these rules takes the skill as given. Yet what counts as one skill is a choice. "Fractions" can be one
skill in a curriculum, or it can be sixteen ideas, from the times tables through equivalent fractions and a common
denominator to the conversion of a mixed number, each of which a student may or may not have. The person who writes
the curriculum, or who tags the problems in a data set, decides the grain at which skills are defined, and the model
inherits that decision. BKT in particular assumes that a skill is learnt all at once, in one step from not knowing to
knowing. If the modelled skill is really several such steps, the model's picture is wrong before any parameter is
fitted; if the modelled skills are finer than anything the questions can tell apart, each of them has too little
evidence to go on. Whether the grain at which skills are defined changes the decisions a practice system makes, and
how, is the question this thesis asks.

It matters in particular to Zeno, the system this thesis grew out of. Zeno is a self-hosted mathematics whiteboard
for Georgian classrooms with a practice engine built in (Appendix A). It already chooses each student's next question
from a learner model, keeps a state for every skill and, on three skills, for each of the ideas inside them, and
decides which skills a student has mastered and can leave behind. Before choosing how Zeno should make that decision,
it is worth knowing both which rule decides best and at what grain the rule should be applied.

## Aim, research question and approach

The aim of this thesis is to find out how the grain at which skills are defined affects the accuracy and the
reliability of mastery estimation, using evidence that does not require a classroom. The research question is:

> How does the level of skill granularity affect the accuracy and reliability of mastery estimation in adaptive
> learning systems?

Three terms in the question need fixing. The grain, or granularity, is the number of knowledge components a topic is
divided into for modelling, together with the mapping that says which components each question needs, which the
literature calls a Q-matrix [@tatsuoka1983rulespace]. Accuracy of mastery estimation is the share of a method's
declarations of mastery that are right where the truth is known, which only simulation provides, and the quality of
its predictions of the next answer where it is not, which real data provide. Reliability is whether a method's
probability means what it says, which is its calibration; whether the threshold the method needs stays put from one
setting to another; and whether its decisions survive a change of grain.

The methods whose estimates are compared are BKT, the exponential moving average (EMA) of a student's answers, and the
streak rule, "N right in a row". The EMA keeps a score between 0 and 1 that moves part of the way towards 1 after each
right answer and towards 0 after each wrong one, so recent answers count more than old ones. It is the simple rule's
probabilistic counterpart: like BKT, it gives a number that can be read as the chance of a right answer, so both
methods can be judged on how well they predict, and Proposition 1 shows that the streak rule is one of its special
cases. Where the grain is finer than one skill, BKT is also run on each component, reading from every question the
components it needs, which is the conjunctive form of BKT for questions that need several skills
[@pardos2008composition].

An earlier plan for this thesis asked whether choosing practice questions with a learner model helps a class learn
more than a fixed sequence of questions. That question can only be answered in classrooms, with ethics approval for
children's data, a school's timetable and, as a power analysis showed, several classes (see the future work in section 3.3). The question
asked here needs none of these. Every number in the thesis comes from a public data set of real students' answers or
from simulation, and all of it can be reproduced from the code (Appendix B).

The question is answered in two parts, and the thesis keeps apart the kinds of claim each part makes.

The first part compares the three methods at one grain, the grain the data or the simulation gives, and it is the
foundation for the second. It was designed and run first, under a working title that asked only whether BKT decides
mastery better than a simple rule, and it is kept in full because it shows that the choice of method matters and
because it supplies the yardstick the second part uses: the precision of a method's declarations against a known
truth, at the cheapest threshold that meets a standard fixed in advance. Some of its claims are proved from the
definitions. Proposition 1 gives the exact conditions under which the streak rule makes the same decisions as an EMA
with a threshold, and Proposition 2 shows that when students learn exactly as BKT assumes and the model knows the true
parameters, BKT's declarations are right at least as often as its threshold says, which means a comparison run only in
BKT's own world would favour BKT by construction. One claim is tested on real data: hypothesis H1 states that on the
ASSISTments 2009–2010 data set [@assistments2010data] BKT predicts held-out students' answers better than the EMA, with
the test, the size of difference that counts and the verdict rule fixed before any result was computed. The rest rests
on simulated students whose true state is recorded after every answer: hypothesis H2 states that in worlds where
students do not learn as BKT assumes, BKT needs fewer answers than the simpler rules before its declarations are right
nine times in ten, and hypothesis H3 describes how often the methods agree on the real data.

The second part changes the grain and watches what the same methods do. Four studies cover the three relations between
the grain at which the model is applied and the grain at which students learn. G1 makes the model too coarse: a skill
is really several components, each learnt all at once as BKT assumes, and the model treats the skill as one. G2 puts
the model at the right grain, BKT on each component, and asks under what condition on the questions that grain is
usable, since a question that needs every component at once cannot say which one a student lacks. G3 makes the model
too fine, finer than the students learn or than the practice can support. These three are run on simulated learners
whose true state is known and whose grain is under control, in two worlds: one where a skill is k abstract components
and one where the components are the sixteen ideas of fractions and the questions are the ones Zeno's own generators
ask. G4 takes the same real answers from ASSISTments and models them at three grains without new data, the data set's
own skill tags, the topic areas they fall into and one skill for all of mathematics; its test of whether the finer grain
predicts better is the second confirmatory test in the thesis. G1 to G3 rest on worlds that were first built as
checks after H2's results had been seen, and their first runs are reported as such; the sweeps that answer the
granularity question were specified before they were run.

![The thesis in one picture: the question, the methods, and the three kinds of claim, with the granularity studies
beside the comparison at one grain they rest on.](figures/thesis-map.png)

## Contributions and structure of the thesis

The thesis makes four contributions. The first is the comparison of BKT, the EMA and the streak rule at one grain,
specified in advance, with the two propositions, on real data (H1, H3) and in known-truth simulation (H2), as the
foundation (sections 2.1 and 3.1). The second is a known-truth simulation of the same methods across grains, too
coarse, right and too fine, with the condition on the questions under which a finer grain is usable (G1 to G3,
section 2.1). The third is the same answers modelled at three grains on a public data set, with one
pre-specified test (G4, section 3.2). The fourth is a practical answer for a real system, and the code for all of it,
open and deterministic, inside the Zeno repository, with every number reproducible by a command listed in Appendix B.

None of these is a new model. BKT, moving averages and the conjunctive form of BKT are well known, mastery criteria
have been compared before, most closely by @pelanek2017mastery, and the grain of a skill model has been studied for
prediction, most closely by @feng2009grainsize and @pardos2007granularity on the same ASSISTments system (section 1.3).
What has not been measured is what grain does to mastery decisions against a known truth, which is what the simulated
worlds make possible. The thesis does not claim that an optimal grain exists in general; it reports under which
conditions each grain is usable, and what each method loses when the grain is wrong.

The thesis has three chapters after this introduction. Chapter 1 reviews mastery learning and how mastery is decided
in practice, BKT, simple estimators and earlier comparisons of mastery criteria, and knowledge components, the grain of
a skill model and how student models are judged. Chapter 2 sets out the method: the definitions of grain and
component, the methods compared, the two propositions and where the question sits in Zeno; the hypotheses of both
parts and the data they are tested on; and how the methods are fitted and each hypothesis is evaluated. Chapter 3
reports and discusses the results, first for the methods at one grain and then for the four granularity studies, and
closes with the conclusion: the answers to the hypotheses and the research question, the recommendation of how Zeno
should decide mastery and at what grain, the threats to validity and the work that should follow. Appendix A
describes Zeno briefly, Appendix B lists the command behind every number, Appendix C records when each hypothesis was
fixed, Appendix D gives the robustness checks, and Appendix E sets Zeno's skills against a primary syllabus.
