# Title defense, 13 October 2026

Tuesday, 18:00 Tbilisi time, room 303, University of Georgia. The supervisor and an expert attend. The task is to
present what the thesis will work on. No length or slides are prescribed, so the talk below runs about ten minutes
and works without slides. The title was approved at that defence; the talk and the answers below are kept current
with the results, and on 14 October they were updated with the granularity sweeps (G1 to G4) and with the ASSISTments
results (H1, H3 and G4 on real data), so that the same talk serves for the thesis defence.

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
knows the skill, allowing for lucky guesses and careless slips, with four parameters per skill fitted on data. And
every one of these rules takes the skill as given. But what counts as one skill is a choice: fractions can be one skill
in a curriculum or sixteen ideas, from the times tables to converting a mixed number, and whoever writes the
curriculum decides. My thesis asks how that choice, the grain at which skills are defined, affects the accuracy and
reliability of mastery estimation.

The foundation is a comparison of the three rules at one grain: BKT, a moving average of the student's recent answers,
and three in a row. Two parts of it are mathematics. I prove exactly when "three in a row" is a special case of the
moving average, and I prove that BKT, in a world that works the way BKT assumes, is right at least as often as its
threshold says, which is why a comparison run only in BKT's own world would favour BKT by construction. The rest is
evidence. On real students' answers, the ASSISTments data set, a public, anonymised record of four thousand US
middle-school students and a quarter of a million answers, BKT and the moving average predict the next answer of
students they were not fitted on; that is one of two confirmatory tests, with the size of difference that counts fixed
in advance. BKT wins it: its log-loss per answer is lower by 0.0225, with an interval that excludes zero on the split
that decides, on four other splits, and when whole classes are resampled instead of students. The margin is real and
more than four times the smallest difference that counts, but it is modest, and the Elo model Zeno already runs
predicts better than both. On the same held-out practices the three rules mostly agree: BKT at 0.95 is the most
generous, declaring mastery in 69 % of practices against 48 % for the simpler rules and one to one and a half answers
sooner, and the next three answers after any rule's declaration are right 77 to 80 % of the time, so the real data
cannot say which rule is right. In simulation, where I know whether each simulated student has really learnt the skill,
I measure the decisions themselves: how much practice each rule needs before its declarations are right nine times in
ten.

That simulation gave the result the granularity question grew from. Where students learn in a jump, as BKT assumes,
BKT needs one to two answers fewer than the simpler rules. Where students learn gradually, no threshold up to 0.9999
makes its decisions right nine times in ten: after a short run of right answers it is almost certain the student knows
the skill, even when they do not. It gets there only with a threshold of seven nines or more. Its probability no
longer means what it says: when it says 99 %, the student has mastered the skill at most about half the time.

Then I asked why, and the answer is grain. I built a world where a skill is several components, each learnt in a jump
exactly as BKT assumes, and modelled the skill as one. That reproduces the gradual pattern exactly. With one component
BKT at its usual threshold of 0.95 is right 98 % of the time; with two, about 65 %; with four, a quarter; with eight,
under a tenth; with sixteen, almost never. From four components on, no threshold up to 0.9999 meets the standard, and
BKT's probability becomes the worst calibrated score of all. A skill that is really several things looks gradual from
outside, and a model with one known state has nothing in the world to refer to. What decides it is not the number of
components but how much of the skill each question leaves untested: when every question asks for every component, the
skill is one unit again to every rule, and when a question asks for half of them, BKT is right about half the time.
Zeno's own skills line up with this: times, whose every question needs all three ideas, is one unit; fractions, where a
question needs six of sixteen, is not. One part of my hypothesis did not hold, and I say so: I expected the simple
rules to lose less, because they assume nothing about the skill, and in precision they lost exactly as much, since
three right answers on a skill of eight components is no evidence that all eight are known. What they kept was a
threshold that could still be found and a probability that was less wrong.

The second study puts the model at the right grain, BKT on each component, reading from every question the
components it needs. That restores precision at an ordinary threshold, and it adds something no coarser model has: it
can say which component the student lacks. But only on a condition, that the questions tell the components apart. I
swept that condition on fractions, with Zeno's own generated questions. Within the thirty questions of a session the
model is at chance about which idea is missing, because an operation on fractions needs seven to ten ideas at once and
the evidence is spread too thin. What meets the condition is either four times the practice, after which the model
names the missing idea two times in three and is the only rule that declares fractions mastered in time, or one
question in four asking for one idea alone, which does the same without slowing learning. Every question alone, I also
found, teaches too little to be worth it. So the right grain is usable if and only if the questions identify the
components and the practice is long enough to ask about each.

The third study goes too fine. Modelling a component that is learnt as one thing as two or four parts costs answers
for no gain in precision, doubles the Brier score with each split, and degenerates the fits: four in five of them at
the bound when split in four. That is a sign a system could read from its own parameters. Too many components for the
practice is different: the fits stay sound, and the model simply never declares. The fourth study takes the same real
answers from ASSISTments and models them at three grains, the data set's own tags, 110 skills, the five topic areas
they fall into, and one skill for everything, with one pre-specified test of whether the finer grain predicts better.
It does: BKT at the data set's grain beats BKT at one skill by 0.035 in log-loss per answer, with an interval that
excludes zero, and each step of coarsening costs. The moving average goes the other way, predicting slightly better the
coarser the grain, because it has no skill parameters to lose, so coarsening costs BKT 0.041 per answer more than it
costs the moving average. The declarations move with the grain as in the simulations, BKT needing three answers at the
finest grain and nine at the coarsest, and even at the finest grain two thirds of its fitted skills have a guess or
slip at the bound, which says that the data set's tags are not yet the components the students learn.

The software is built. Over the last year I built Zeno, a self-hosted maths whiteboard with a practice engine and a
learner model for Georgian classrooms, and every experiment runs inside its code and is reproducible by one command.
For Zeno the answer splits by grain and by purpose: a moving average with its threshold set from data to decide
mastery of a skill within a session, the state at the grain of the ideas, which Zeno already keeps, to choose what to
practise next, and BKT on each idea as the mastery rule where the questions and the practice allow it. The thesis
does not claim that an optimal grain exists. It says under which conditions each grain is usable, and that the
questions, more than the model, decide it.

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
moving average, and that BKT's declarations are right at least θ of the time when the world matches BKT. H1 and G4
are tested on real students by a rule fixed in advance, and both hold. H2 and the other granularity studies are shown
on simulated students, so they hold only as far as each simulated world is believed, which is why every world is
reported separately. Which rule Zeno should use is a judgement drawn from these.

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

**How finely should a skill be divided? How would you find the right granularity?** The thesis answers it in
simulation, where the true state of each component is known and the grain is under control, by the same rule as H2:
the practice each method needs before its declarations are right nine times in ten, and its precision at the threshold
a system would use without a truth. Too coarse, a skill of k components modelled as one, BKT at 0.95 goes from 98 %
right with one component to about 65 % with two, a quarter with four, under a tenth with eight and almost never with
sixteen, in proportion to how much of the skill each question leaves untested; from four components on no threshold up
to 0.9999 meets the standard. At the right grain, BKT on each component keeps its precision at an ordinary threshold at
every k and names the missing component, on the condition that the questions tell the components apart and the
practice is long enough to ask about each: on fractions, sixteen ideas of which a question needs six, that takes about
120 questions or one question in four asking for one idea alone, and within Zeno's thirty it is not met. Too fine,
splitting a component in two or four costs answers for nothing, doubles the Brier score and degenerates the fits. So
the right grain is a property of the model, the questions and the practice together, and a system finds it by the
share of its components a question tests and by the evidence per component. This is an old question in the field, from
Tatsuoka's Q-matrices to learning factors analysis and the knowledge-learning-instruction framework, and the
ASSISTments group compared skill models of 1 to 106 skills for predicting a test score; what is mine is measuring what
grain does to the mastery decision against a known truth, with the condition on the questions, on a real curriculum's
generated questions. The ideas have prerequisite edges in Zeno's code, but the result uses only which ideas a question
needs and the order of the skills; a prerequisite graph is future work and not part of the thesis.

**Which of your hypotheses failed?** Two parts, and the thesis says so. In G1 I expected the simple rules to lose
less from a coarse grain than BKT, because they assume nothing about the skill; in precision at their usual thresholds
they lost exactly as much, since nothing that reads a sequence of answers can know whether the sequence is on one
thing. What they kept was a threshold that could be found, up to eight components where BKT on the skill had none from
four, and a Brier score a third of BKT's at sixteen. In G3 I expected the fits to degenerate when there are more
components than the practice supports; they did not, and the shortage showed only in declarations that never came. The
fits degenerated where a component was over-split, which is the sign a system could read from its own parameters.

**Where does the one-grain comparison stand now?** It is the foundation. It shows that the choice of rule matters, it
supplies the yardstick the granularity studies use, and its gradual-world result is what the coarse-grain study
explains: a skill of several components looks gradual from outside. On the real answers it is now decided: BKT
predicts held-out ASSISTments answers better than the moving average, by 0.0225 in log-loss per answer with an interval
that excludes zero on every split, so H1 holds; and on the same answers BKT predicts better at the data set's 110 skills
than at five topics or one skill, by 0.035, while the moving average is indifferent to the grain, so G4 holds too. At
0.95 BKT is also the most generous rule on those practices, declaring in 69 % of them against 48 % for the simple rules,
with no higher share right afterwards. The recommendation for Zeno rests on both: the
moving average, with a threshold set from data, to decide mastery of a skill within a session; the state at the grain
of the ideas to choose what to practise next; and BKT on each idea as the mastery rule where the questions and the
practice allow it, as on hcf now and on fractions with one isolating question in four.

**Why does BKT predict better and still not get the recommendation for deciding mastery?** Prediction and the
decision are different things. BKT's learnt state per skill tells students apart sooner than a moving average that
starts every practice at the same score, so it predicts the next answer better, by a modest margin that the Elo model
Zeno already runs beats. The decision is judged against a truth, which only the simulations have, and there BKT's
probability at 0.95 was mostly wrong wherever the skill was really several things, while the moving average kept a
threshold that worked. On the real data the three rules are followed by nearly the same share right, so the data
cannot pick the rule; the simulations can, and they favour the rule whose failure is milder.

**Do the real data agree with the simulations?** Where they can be compared, yes. The simulations say that a model
with a known state gains from a grain at which there is one and loses more when there is not, and that a rule which
assumes nothing about the skill gains and loses less; on ASSISTments BKT loses 0.035 per answer from the finest grain
to the coarsest and the moving average loses nothing. The simulations say that a skill which is really several things
shows itself in BKT's fits and in generous declarations; on ASSISTments two thirds of BKT's fits at the finest grain
have a guess or slip at the bound, and BKT at 0.95 declares in a fifth more practices than the simpler rules with no
higher share right afterwards. What the real data cannot give is the truth, so they cannot say which rule's
declarations are right; that is the part only the simulations answer. One difference is worth stating: on the real
data the moving average is slightly better at the coarser grain, not merely indifferent, because a longer sequence
gives it more to average over.

**Why is the moving average better at the coarser grain on real data?** It carries no parameters per skill, only a
rate and a start, so coarsening takes nothing from it, and a student's whole history is a longer sequence than their
practice on one skill, which gives the average more to work with. The gain is small, 0.007 per answer from 110 skills
to one, and it is a gain in prediction, not in deciding mastery: at the coarsest grain every rule is followed by a
share right within six points of the data set's overall rate, so a declaration there means little.

**What is the role of Zeno, the platform?** It is the context and the code base, not what is evaluated. The thesis
describes it briefly; the experiment is the contribution.

## Plan by stage

| Stage | Minimum | Content |
|---|---|---|
| Concept | 8 pages | introduction, research question and hypotheses, background, the planned method |
| Preliminary draft | 15 pages | the method in full, the simulation results |
| Final thesis | 30 pages | the ASSISTments results, discussion, threats to validity, conclusion, abstracts in Georgian and English |

Where it stands on 14 October: the chapters are reworked under the approved title (61 pages as a PDF), with the
abstracts in Georgian and English, the method in full, the one-grain results including the check above 0.9999 and the
calibration of each method's score, the four granularity studies with their sweeps, the discussion and the threats to
validity, and the ASSISTments results for H1, H3 and G4 on the corrected 2009–2010 file.

## Format rules to remember while writing

The thesis must follow APA style, with a set title-page sequence, abstracts in Georgian and English, and the table of
contents after the abstracts. Bullet points and bold text are not allowed anywhere in it. The current chapter drafts
use both, so every list has to become prose. Pandoc can produce APA citations with the APA CSL style file
(`--csl apa.csl`).
