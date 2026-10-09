# Title defense, 13 October 2026

Tuesday, 18:00 Tbilisi time, room 303, University of Georgia. The supervisor and an expert attend. The task is to
present what the thesis will work on. No length or slides are prescribed, so the talk below runs about three minutes
and works without slides.

## Title

English: *When is a skill mastered? Bayesian Knowledge Tracing against a simple mastery rule on real and simulated
students' answers.*

Georgian (draft, check the wording): *როდის არის უნარი ათვისებული? ბაიესური ცოდნის მიდევნება მარტივი ათვისების
წესთან შედარებით რეალური და სიმულირებული მოსწავლეების პასუხებზე.*

## The talk

Every adaptive practice system has to answer one question again and again: has this student mastered this skill, so
that they can move on? The systems that schools actually use mostly answer it with a simple rule, such as three right
answers in a row. Research systems mostly use a statistical model, Bayesian Knowledge Tracing, which estimates the
probability that the student knows the skill, allowing for lucky guesses and careless slips. BKT needs four
parameters per skill, fitted on data. My thesis asks whether that extra machinery pays off: does BKT judge mastery
more accurately than a simple rule?

The simple side is a moving average of the student's recent answers; "three in a row" is a special case of it. I
have three hypotheses. First, on real students' answers, BKT predicts the next answer better than the moving average,
measured by log-loss on students the models were not fitted on. Second, in simulation, where I know whether each
simulated student has really learnt the skill, BKT's mastery decisions are right more often at the same amount of
practice. Third, exploratory: how often the two methods agree on real data.

The real data are the ASSISTments 2009–2010 data set, a public, anonymised record of several thousand US
middle-school students answering maths problems. The simulation matters because real data cannot say when a student
truly knows a skill. I will also simulate students who learn in ways BKT does not assume, gradually or with
forgetting, because a comparison run only in BKT's own world would favour BKT by construction.

Much of the software exists. Over the last year I built Zeno, a self-hosted maths whiteboard with a practice engine
and a learner model for Georgian classrooms. It already contains BKT, the evaluation by held-out students, the
standard metrics and the importer for the ASSISTments data. What remains is the moving-average method, the
measurement of mastery decisions, the statistical test and the experiments themselves.

The result is useful whichever way it goes. If BKT wins, systems using simple rules are leaving accuracy unused. If
it does not, a one-parameter rule is the better engineering choice. Either way, Zeno will use the winner to decide
when a student moves on. The main limitation, which I state in advance, is that the ASSISTments data were collected
under the three-in-a-row rule, so the real data cannot show that rule stopping too early; that is why the decisive
comparison is the simulation.

## Questions to expect

**Why not run the study in a classroom?** It needs ethics approval for minors' data and a school's timetable, which
do not fit a bachelor's schedule. Public, anonymised data and simulation answer this question without collecting any
personal data. A classroom study is future work, and Zeno is built to run it.

**What is new here, if BKT and mastery rules have been compared before?** Earlier comparisons exist (check
Pelánek & Řihák 2017 before naming it). This thesis adds a known-truth simulation in worlds that break BKT's
assumptions, a pre-specified test on held-out students, and an answer to a practical question for a real system.
A careful replication with a stated hypothesis is a sound bachelor's contribution.

**Why not deep knowledge tracing?** It needs large training data, is hard to explain to a teacher, and is not what
deployed systems use to decide mastery. The question is about the decision rule, not the most accurate predictor.

**Isn't the simulation circular?** It would be if it used only BKT's own assumptions. That is why it includes
gradual learning and forgetting, and why results are reported for each world separately.

**How do you define "mastered" in the simulation?** In the BKT world, the simulated student knows the skill. In
the gradual worlds, the true chance of a right answer is at least 0.9; the threshold is fixed in advance, and a
second value is reported as a check.

**What if the ASSISTments data are unsuitable?** The prediction comparison works on any logged first attempts; Zeno's
own export produces the same format, and the simulation part does not depend on the data set.

**What is the role of Zeno, the platform?** It is the context and the code base, not what is evaluated. The thesis
describes it briefly; the experiment is the contribution.

## Plan by stage

| Stage | Minimum | Content |
|---|---|---|
| Concept | 8 pages | introduction, research question and hypotheses, background, the planned method |
| Preliminary draft | 15 pages | the method in full, the simulation results |
| Final thesis | 30 pages | the ASSISTments results, discussion, threats to validity, conclusion, abstracts in Georgian and English |

## Format rules to remember while writing

The thesis must follow APA style, with a set title-page sequence, abstracts in Georgian and English, and the table of
contents after the abstracts. Bullet points and bold text are not allowed anywhere in it. The current chapter drafts
use both, so every list has to become prose. Pandoc can produce APA citations with the APA CSL style file
(`--csl apa.csl`).
