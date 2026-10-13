# Title defense, 13 October 2026

Tuesday, 18:00 Tbilisi time, room 303, University of Georgia. The supervisor and an expert attend. The task is to
present what the thesis will work on. No length or slides are prescribed, so the talk below runs about seven minutes
and works without slides.

## Title

Approved by the board at the defence: *The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning
Systems*, with the research question: how does the level of skill granularity affect the accuracy and reliability of
mastery estimation in adaptive learning systems? The outline (outline.md) is reframed under it; the proposed title
below is kept for the record.

English, as proposed: *When is a skill mastered? Bayesian Knowledge Tracing against a simple mastery rule on real and simulated
students' answers.*

Georgian (draft, check the wording): *როდის არის უნარი ათვისებული? ბაიესური ცოდნის მიდევნება მარტივი ათვისების
წესთან შედარებით რეალური და სიმულირებული მოსწავლეების პასუხებზე.*

## The talk

Every adaptive practice system has to answer one question again and again: has this student mastered this skill, so
that they can move on? Both ways of getting it wrong cost something. Declared too early, the student goes on to work
that needs a skill they do not have; declared too late, they spend time on questions they can already answer. The
systems that schools actually use mostly answer it with a simple rule, such as three right answers in a row. Research
systems mostly use a statistical model, Bayesian Knowledge Tracing, which estimates the probability that the student
knows the skill, allowing for lucky guesses and careless slips, with four parameters per skill fitted on data. My thesis
asks whether that extra machinery pays off: does BKT judge mastery more accurately than a simple rule?

The simple side is a moving average of the student's recent answers. Two parts of the thesis are mathematics. I prove
exactly when "three in a row" is a special case of that average, and I prove that BKT, in a world that works the way
BKT assumes, is right at least as often as its threshold says. The rest is evidence, in three hypotheses. First, on
real students' answers, BKT predicts the next answer better than the moving average, measured by log-loss on students
the models were not fitted on; this is the one confirmatory test, and I fixed in advance how small a difference counts
as none. Second, in simulation, where I know whether each simulated student has really learnt the skill, BKT needs
less practice than the simpler rules before its mastery decisions are right nine times in ten, in worlds where
students do not learn the way BKT assumes. Third, exploratory: how often the methods agree on real data.

The real data are the ASSISTments 2009–2010 data set, a public, anonymised record of several thousand US
middle-school students answering maths problems. The simulation matters because real data cannot say when a student
truly knows a skill. I simulate students who learn gradually or who forget, because a comparison run only in BKT's own
world would favour BKT by construction.

The software is built. Over the last year I built Zeno, a self-hosted maths whiteboard with a practice engine and a
learner model for Georgian classrooms, and the experiment runs inside its code: BKT, the moving average, the streak
rule, the evaluation on held-out students, the statistical test and the simulation.

The simulation has been run, and its result splits the second hypothesis in two. Where students learn in a jump, as
BKT assumes, but sometimes forget, the hypothesis holds: BKT needs one to two answers fewer than the simpler rules for
decisions that are right as often. Where students learn gradually, it fails by the rule I fixed in advance: no
threshold up to 0.9999 makes BKT's decisions right nine times in ten, because after a short run of right answers it is
almost certain the student knows the skill, even when they do not. I then checked whether that was only where I had
stopped searching, and largely it was: with a threshold of seven nines or more, BKT does get there, at about the moving
average's cost. So BKT still ranks students sensibly, but its probability no longer means what it says: when it says
99 %, the student has mastered the skill at most about half the time, and the threshold it needs moves by orders of
magnitude from one world to another.

Then I asked why. I simulated a skill that is really several ideas, each learnt in a jump exactly as BKT assumes, and
asked Zeno's own generated questions, which need several of those ideas at once. BKT on the whole skill then shows the
same pattern as the gradual worlds: no threshold up to 0.9999 makes it right nine times in ten. So what looked like a
failure of the model may be a failure of grain. A skill that is really several ideas looks gradual from outside, and
BKT applied at the wrong grain is miscalibrated even in a world built from its own assumptions. BKT on each idea does
better, but only where the questions tell the ideas apart. On highest common factor, where questions need different
ideas and the arithmetic was settled in an earlier skill, it decided sooner than the moving average, was the best
calibrated and named the one idea the student lacked most of the time. On fractions, where every question needs the
same eight ideas, it could not say which idea was missing however many answers it saw. The grain at which a skill is
modelled has to be chosen together with the questions that are asked of it. This check came after the results, so the
thesis reports it as a check beside the second hypothesis, not as a hypothesis of its own.

So the thesis contributes five things. The exact conditions under which a streak rule is a moving average, proved for
sequences of any length. A known-truth simulation in worlds that break BKT's assumptions, with the test and the
verdict rule fixed before the results. The finding that where learning is gradual BKT's probability is badly calibrated
and needs a threshold that no one would choose without data. The diagnosis that this is a question of grain, with a
condition on the questions, that they must tell the ideas apart, for the finer grain to be usable; that is the one
part I would carry into further research, because Zeno generates its questions and so can change them, which a fixed
item bank cannot. And a practical answer for Zeno: a moving average with its threshold set from Zeno's own data where
a skill is treated as one thing, and BKT at the finer grain where the skill is decomposed and the questions isolate
its ideas. What remains is the test on the real data, which decides the first hypothesis.

The result is useful whichever way that test goes. If BKT wins, systems using simple rules are leaving accuracy
unused. If it does not, a one-parameter rule is the better engineering choice. The main limitation, which I state in
advance, is that the ASSISTments data were collected under the three-in-a-row rule, so the real data cannot show that
rule stopping too early; that is why the decisions themselves are compared in the simulation.

## Questions to expect

**Why is this question important?** Because every practice system makes this decision after every answer, and both
ways of getting it wrong cost something. Declared too early, the student moves on to work that needs a skill they do
not have; declared too late, they spend time on questions they could already answer, and experiments with the
difficulty of practice suggest that can cost motivation too (Jansen et al., 2013). Mastery learning itself works:
Bloom (1984) made it a benchmark, and reviews find that tutoring systems built on it raise test scores (Kulik &
Fletcher, 2016) and come close to human tutors (VanLehn, 2011). Yet the systems used at scale do not agree on how to
decide it: the Cognitive Tutors use BKT at 0.95, the ASSISTments skill builders used three right in a row, Khan
Academy uses mastery levels. And my own results show the choice matters: in the gradual worlds, when BKT says 99 % the
student has mastered the skill at most about half the time, and at its usual 0.95 about one declaration in ten is
right. What the thesis measures is the accuracy of the decision, not how much students learn from it; that would need
the classroom study.

**Why this topic, of all the ones you could have chosen?** Because it is a decision I had to make anyway, and the
part of my original question that I can answer properly. I built Zeno, and Zeno has to decide for every student and
skill when to move on. I first wanted to test whether choosing questions with a learner model helps a class learn
more than a fixed sequence, but that needs ethics approval for children's data, a school's timetable and, by my
power analysis, several classes. The mastery decision is the piece of that question that public, anonymised data and
simulation can answer, with a test fixed in advance that can fail, and with an answer that is useful whichever way it
goes. I considered deep knowledge tracing instead and set it aside, for the reasons below.

**Why not run the study in a classroom?** It needs ethics approval for minors' data and a school's timetable, which
do not fit a bachelor's schedule. Public, anonymised data and simulation answer this question without collecting any
personal data. A classroom study is future work, and Zeno is built to run it.

**What is new here, if BKT and mastery rules have been compared before?** They have, most closely by Pelánek and
Řihák (2017), who found the threshold and the data to matter more than the model and recommended the moving average;
my simulation agrees with them, since once each method gets the threshold it needs, BKT and the moving average are
close. This thesis adds the exact conditions under which "N right in a row" is a
moving average, proved for answer sequences of any length; a known-truth simulation in worlds that break BKT's
assumptions; a pre-specified test on held-out students; and an answer to a practical question for a real system.
A careful replication with a stated hypothesis is a sound bachelor's contribution.

**What exactly is proved, and what is only shown?** Two statements are proved: when the streak rule equals a
moving average, and that BKT's declarations are right at least θ of the time when the world matches BKT. H1 is
tested on real students. H2 is shown on simulated students, so it holds only as far as each simulated world is
believed, which is why every world is reported separately. Which rule Zeno should use is a judgement drawn from these.

**Why not deep knowledge tracing?** It needs large training data, is hard to explain to a teacher, and is not what
deployed systems use to decide mastery. The question is about the decision rule, not the most accurate predictor.

**Isn't the simulation circular?** In BKT's own world, yes, and I do not count it as evidence: there BKT's win is a
theorem, not a finding, so that world only checks how much fitting the parameters costs. The comparison that counts
is in the worlds with gradual learning and forgetting, and results are reported for each world separately.

**Your second hypothesis failed in two of the three worlds. Is that a problem?** No. It was stated before the
results, with the rule for what counts as failing, and a hypothesis that can fail is the point of stating it. The
result is informative: BKT's advantage depends on students learning in a jump, which is exactly its assumption, and
where they do not, BKT keeps up only with a threshold no one would choose without data.

**Why does BKT fall short where learning is gradual?** It has two states, known and not known. A few right answers in a
row push its probability close to 1, and a student who is only partway there often gives such a run. Raising the
threshold from 0.80 to 0.99 made it wait only about six answers longer, and most of its declarations stayed wrong. The
moving average reaches a high threshold only through a long run, so an ordinary threshold makes it wait.

**Is "never" just where you stopped the threshold search?** Largely, yes, and I checked. Thresholds went up to 0.9999,
fixed in advance. Continuing the search up to 1 − 10⁻¹⁵, BKT meets the standard in three of the four gradual settings,
at thresholds between 1 − 10⁻⁷ and 1 − 10⁻¹³, and at the higher learning rate it then needs 0.3 to 0.4 answers fewer
than the moving average. The one setting where it still never gets there is the one where hardly anyone masters a
skill at all. The thesis reports this as a check made after the results, beside the verdict, and it changes the
reading: BKT's problem in those worlds is that its probability is badly calibrated against what mastery means there,
not that it cannot wait. Measured after every answer, when its probability is 0.99 the student has mastered the skill
in 15 to 55 % of cases, against 70 to 94 % for the moving average's top scores. At its usual 0.95, about one
declaration in ten is right.

**So why recommend the moving average, if BKT can match it?** Because BKT matches it only at a threshold like seven
nines, which has to be found from data and moves by orders of magnitude from one world to another. The moving average
reaches the same precision at thresholds between 0.84 and 0.97, with one fitted parameter. For a system that does not
know how its students learn, that is the safer rule.

**BKT's probability is about knowing the skill, but your mastery is about the chance of a right answer. Are you not
comparing two different scales?** It is a fair point, and I checked it. BKT also gives the chance of a right answer:
its probability of knowing times one minus the slip, plus the rest times the guess. Declaring mastery when that chance
reaches a threshold did no better, and in the gradual worlds it never met the 90 % standard at all. Within a skill it
is only a rescaling of the same probability, so it cannot order the students differently, and it can never rise above
one minus the slip. The fitted slip is up to 0.3 in those worlds, so on some skills the chance never rises above 0.7,
and no single threshold suits every skill. The scale is therefore not what makes BKT need seven nines. The thesis
measures both of BKT's scores against the truth after every answer: the chance of a right answer is less overconfident
than the probability of knowing, but it seldom reaches 0.9 at all. That measurement and the decision check both came
after the results, so they are reported as checks, not findings, and only the measurement is in the thesis's tables so
far.

**Did you change the comparison after seeing results?** Yes, once, and the thesis says so. It was first set at equal
practice, but at that much practice almost no simulated student had mastered anything, so every rule was mostly wrong
and they could not be told apart. Equal precision, the share of declarations that are right, has a meaning in every
world. The equal-practice comparison is still reported. The search above 0.9999 also came after the results, and it is
reported as a check beside the verdict, not in place of it.

**How do you define "mastered" in the simulation?** In the BKT world, the simulated student knows the skill. In
the gradual worlds, the true chance of a right answer is at least 0.9; the threshold is fixed in advance, and 0.8
is reported as a check. With 0.8, BKT meets the standard in all four gradual settings once its thresholds go above
0.9999, close to the moving average in each.

**How finely should a skill be divided? How would you find the right granularity?** I would define several grains of
the same topic, one skill against its ideas, and compare them in simulation, where the true state of each idea is
known, by the same rule as H2: the practice each method needs before its declarations are right nine times in ten. I
have done this once, for Zeno's times, hcf and fractions. Too broad, and BKT on the skill never meets the standard, as
in the gradual worlds. At the right grain, on hcf with the arithmetic ideas carried in from the earlier skill, BKT on
each idea needed about four answers fewer than the moving average at the higher learning rate, was the best calibrated
score and named the one missing idea 47 to 79 % of the time. Too fine for the questions, on fractions where every
question needs the same eight ideas, it was at chance on which idea the student lacks: not for want of data but
because questions that all ask for the same ideas cannot tell them apart, which is the identifiability problem of
student modelling at the level of the ideas. The condition is therefore a property of the questions, which a generator
can change. The general study, several grains of several topics and validation on real answers with questions that
isolate ideas, is future work; the one case is reported as a check made after the results. This is an old question in
the field, from Tatsuoka's Q-matrices to learning factors analysis and the knowledge-learning-instruction framework;
what is mine is tying H2's miscalibration to grain in a controlled comparison, on a real curriculum's generated
questions. The ideas have prerequisite edges in Zeno's code, but the result uses only which ideas a question needs and
the order of the skills; a prerequisite graph is future work and not part of the thesis.

**Isn't that a second thesis?** No. It is the mechanism behind a result the thesis already has, and it is reported as
a check beside H2, not as a hypothesis. The thesis stays a comparison of mastery rules on real and simulated answers;
granularity is the condition under which the answer changes, and the recommendation in the discussion is already
conditional on it: the moving average for a skill that is treated as one thing, BKT at the finer grain where the
skill is decomposed and the questions tell the ideas apart.

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

Where it stands on 13 October: the chapters follow this scope (37 pages as a PDF), with the method in full, the
simulation results including the check above 0.9999, the calibration of each method's score and the world of ideas,
the discussion and the threats to validity. The ASSISTments results, the abstracts and the title page are still to come.

## Format rules to remember while writing

The thesis must follow APA style, with a set title-page sequence, abstracts in Georgian and English, and the table of
contents after the abstracts. Bullet points and bold text are not allowed anywhere in it. The current chapter drafts
use both, so every list has to become prose. Pandoc can produce APA citations with the APA CSL style file
(`--csl apa.csl`).
