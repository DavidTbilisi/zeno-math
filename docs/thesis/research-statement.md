# Research statement

Davit Tchintcharashvili, University of Georgia, Bachelor of Computer Science. Draft of 10 November 2026.

## The question I want to answer

Does choosing each practice question with a model of the learner help a class learn mathematics more, or sooner, than
a fixed sequence of questions? Adaptive practice systems are built on the belief that it does. I started my
bachelor's thesis with this question and set it aside, because it cannot be answered honestly without classrooms,
ethics approval for children's data, and, as my own power analysis showed, between about 180 and 1,100 students.

## What my bachelor's thesis contributes to it

Before asking whether adaptive practice helps, one has to trust the decision at its centre: after each answer, has
this student mastered this skill? Every method that makes that decision takes the skill as given. My thesis, The
Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems (supervisor: Mikheil Gigauri), measures
what the grain of a skill does to that decision. Earlier work had measured what grain does to the prediction of
answers; what it does to the mastery decision itself, checked against a known truth, had not been measured.

The thesis compares Bayesian Knowledge Tracing, the exponential moving average and the rule "N right in a row", which
it proves to be a special case of the moving average. It uses held-out students of the public ASSISTments 2009–2010
data and simulated students whose true state is known. Three results matter for the next step. Modelling a skill
coarser than the way students learn it makes one-step learning look gradual and lowers the precision of every method,
and BKT's probability can then no longer be read at the usual threshold of 0.95. Modelling at the learners' grain
restores precision and can name the component a student lacks, but only when the questions tell components apart and
practice is long enough: on fractions with sixteen ideas, 30 questions name the missing idea about half the time, and
declaring mastery takes about 120. On real answers, BKT predicts better at 110 skills than at five topics or one, by a
test fixed in advance. Every number can be reproduced from the published code.

## What I propose to do next

The thesis leaves me with a tested measuring instrument and a system built to use it. Zeno, the practice system the
thesis grew out of, already assigns students to two arms at random, runs a pre-test and a post-test with alternating
forms, and exports anonymised attempts. The power analysis gives the design a real study needs: a few skills, longer
practice and tests, and a few hundred students. The next project is to run that study in schools, with ethics
approval, and to report the result whichever way it falls.

## Why I can do this work

I designed the thesis so that each kind of claim is kept apart: two propositions are proved, two hypotheses are tested
on real students by rules fixed before the data were seen, and the rest is shown in simulation and claimed only as far
as each simulated world is believed. I wrote the system, the simulations and the analysis myself, and when the first
question proved too large for a bachelor's thesis I replaced it with one I could answer fully instead of answering the
large one badly.
