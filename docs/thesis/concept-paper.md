```{=latex}
\begin{titlepage}
\thispagestyle{fancy}
\centering
\vspace*{1cm}
\includegraphics[width=3.5cm]{docs/thesis/figures/ug-logo.jpeg}\par
\vspace{1.2cm}
{\LARGE The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems\par}
\vspace{0.6cm}
{\large Concept Paper\par}
\vspace{2cm}
Author:\par
Davit Tchintcharashvili\par
\vspace{1.5cm}
This is proved by the Bachelor Thesis Committee of the School of IT, Engineering and Mathematics of the University of
Georgia\par
\vspace{1.5cm}
Supervisor:\par
Mikheil Gigauri\par
\vfill
26 October 2026\par
\end{titlepage}
```

::: {.docx custom-style="Title Page"}
![](figures/ug-logo.jpeg){width=3.3cm}

&nbsp;

The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems

Concept Paper

&nbsp;

&nbsp;

Author: Davit Tchintcharashvili

&nbsp;

&nbsp;

This is proved by the Bachelor Thesis Committee of the School of IT, Engineering and Mathematics of the University of
Georgia

&nbsp;

&nbsp;

Supervisor:

Mikheil Gigauri

&nbsp;

&nbsp;

&nbsp;

26 October 2026
:::

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

# Abstract {.unnumbered .unlisted}

Every adaptive practice system decides, after each answer, whether a student has mastered a skill, and every method
that makes that decision takes the skill as given. Yet what counts as one skill is a choice: fractions can be one skill
in a curriculum or sixteen ideas a student may have or lack separately. This thesis asks how the grain at which skills
are defined, the number of knowledge components a topic is divided into and which of them each question needs,
affects the accuracy and reliability of mastery estimation. Three methods are compared: Bayesian Knowledge Tracing
(BKT), the exponential moving average (EMA) of a student's answers, and the rule "N right in a row". The comparison is
made first at one grain and then across grains. At one grain, BKT and the EMA are tested on how well they predict the
answers of held-out students in the public ASSISTments 2009–2010 data set, and all three methods are tested on how
soon their declarations of mastery become trustworthy for simulated students whose true state is known. Across grains,
simulated learners whose skills are made of a known number of components are modelled too coarsely, at the right grain
and too finely, and the same real answers from ASSISTments are modelled at three grains. Two hypotheses are
confirmatory, with the test and the smallest difference that counts fixed in advance; the rest are estimates with
intervals. The expected outcome is a statement of the conditions under which each grain is usable and of what each
method loses when the grain is wrong, together with a recommendation for Zeno, the mathematics practice system the
work grew out of, on which rule should decide mastery and at what grain.

```{=latex}
\newpage
```

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

# რეზიუმე {.unnumbered .unlisted}

ყოველი ადაპტური სავარჯიშო სისტემა თითოეული პასუხის შემდეგ წყვეტს, აითვისა თუ არა მოსწავლემ უნარი, და ყოველი
მეთოდი, რომელიც ამ გადაწყვეტილებას იღებს, უნარს მოცემულად თვლის. თუმცა ის, თუ რა ითვლება ერთ უნარად, არჩევანის
საკითხია: წილადები შეიძლება იყოს სასწავლო გეგმის ერთი უნარი ან თექვსმეტი იდეა, რომელთაგან თითოეული მოსწავლეს
შეიძლება ცალკე ჰქონდეს ან აკლდეს. ეს ნაშრომი იკვლევს, როგორ მოქმედებს უნარების განსაზღვრის მარცვლოვანება, ანუ
რამდენ ცოდნის კომპონენტად იყოფა თემა და რომელი კომპონენტები სჭირდება თითოეულ კითხვას, ათვისების შეფასების
სიზუსტესა და საიმედოობაზე. შედარებულია სამი მეთოდი: ბაიესური ცოდნის მიდევნება (BKT), მოსწავლის პასუხების
ექსპონენციალური მოძრავი საშუალო (EMA) და წესი „N სწორი პასუხი ზედიზედ“. შედარება ჯერ ერთ მარცვალზე ხდება, შემდეგ
კი სხვადასხვა მარცვალზე. ერთ მარცვალზე BKT და მოძრავი საშუალო მოწმდება იმაზე, რამდენად კარგად წინასწარმეტყველებს
გამოყოფილი მოსწავლეების პასუხებს საჯარო მონაცემთა ბაზაში ASSISTments 2009–2010, ხოლო სამივე მეთოდი მოწმდება
იმაზე, რამდენად მალე ხდება მათი ათვისების გადაწყვეტილებები სანდო სიმულირებული მოსწავლეებისთვის, რომელთა ნამდვილი
მდგომარეობა ცნობილია. სხვადასხვა მარცვალზე სიმულირებული მოსწავლეები, რომელთა უნარები ცნობილი რაოდენობის
კომპონენტისგან შედგება, მოდელირდება ზედმეტად მსხვილად, სწორ მარცვალზე და ზედმეტად წვრილად, ხოლო ASSISTments-ის
ერთი და იგივე რეალური პასუხები მოდელირდება სამ მარცვალზე. ორი ჰიპოთეზა დამადასტურებელია, ტესტითა და უმცირესი
მნიშვნელოვანი სხვაობით, რომლებიც წინასწარაა განსაზღვრული; დანარჩენი შედეგები ინტერვალებიანი შეფასებებია.
მოსალოდნელი შედეგია იმ პირობების დადგენა, რომლებშიც თითოეული მარცვალი გამოსადეგია, და იმისა, რას კარგავს თითოეული
მეთოდი, როცა მარცვალი არასწორია, ასევე რეკომენდაცია ზენოსთვის, მათემატიკის სავარჯიშო სისტემისთვის, რომლისგანაც ეს
ნაშრომი წარმოიშვა: რომელმა წესმა უნდა გადაწყვიტოს ათვისება და რომელ მარცვალზე.

```{=latex}
\newpage
\tableofcontents
\newpage
```

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

<!-- docx-contents -->

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

# Introduction

## The problem and its relevance

Practice is where most mathematics is learnt, and a practice system has to decide, again and again, when a student
has practised a skill enough to move on. Mastery learning, the idea that a student should master one unit before the
next one builds on it, depends on that decision [@bloom1984]. Stop too early and the student moves on to work that
needs a skill they do not yet have. Stop too late and the student keeps answering questions they could already
answer, time that could have gone to the next skill.

Two kinds of rule make this decision in practice. Some widely used systems apply a simple rule based on recent
answers. The ASSISTments skill builders, for example, ended a problem set when a student had answered three problems
in a row right [@assistments2010data], and Khan Academy tracks each skill through mastery levels that a student climbs
by answering correctly [@khanmastery]. Much of the research literature uses a statistical model of the student. In
Bayesian Knowledge Tracing (BKT) [@corbett1994] a skill is either known or not, the model keeps the probability that the
student knows it, and it allows for a student who guesses right without knowing the skill and for one who slips while
knowing it. The Cognitive Tutors declared a skill mastered when that probability reached 0.95 [@corbett1994].

Every one of these rules takes the skill as given. Yet what counts as one skill is a choice. "Fractions" can be one
skill in a curriculum, or it can be sixteen ideas, from the times tables through equivalent fractions and a common
denominator to the conversion of a mixed number, each of which a student may or may not have. The person who writes
the curriculum, or who tags the problems in a data set, decides the grain at which skills are defined, and the model
inherits that decision. BKT in particular assumes that a skill is learnt all at once, in one step from not knowing to
knowing. If the modelled skill is really several such steps, the model's picture is wrong before any parameter is
fitted; if the modelled skills are finer than anything the questions can tell apart, each of them has too little
evidence to go on. Whether the grain at which skills are defined changes the decisions a practice system makes, and
how, is the question this thesis asks.

The question matters in particular to Zeno, the system this thesis grew out of. Zeno is a self-hosted mathematics
whiteboard for Georgian classrooms with a practice engine built in. It already chooses each student's next question
from a learner model, keeps a state for every skill and, on three skills, for each of the ideas inside them, and
decides which skills a student has mastered and can leave behind. Its present mastery rule was set by judgement, not
measured. Before choosing how Zeno should make that decision, it is worth knowing both which rule decides best and at
what grain the rule should be applied.

## Aim, research question and hypotheses

The aim of the thesis is to find out how the grain at which skills are defined affects the accuracy and the
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

The question is answered in two parts. The first compares the three methods at one grain, the grain the data or the
simulation gives, and is the foundation for the second: it shows whether the choice of method matters at all, and it
supplies the yardstick the second part uses, the precision of a method's declarations against a known truth at the
cheapest threshold that meets a standard fixed in advance. The second part changes the grain and watches what the
same methods do. The model's grain can stand in three relations to the grain at which students learn: it can be too
coarse, when one modelled skill is several things a student learns separately; right, when each modelled component is
one thing learnt; or too fine, when one thing learnt is modelled as several components, or when the components are more
than the practice can support. Table 1 lists the hypotheses of both parts.

| Hypothesis | Statement | Evidence | Kind |
|-------|------------------|--------|---------|
| H1 | BKT predicts held-out students' next answers better than the EMA, by log-loss | ASSISTments | Confirmatory |
| H2 | Where students do not learn as BKT assumes, BKT needs fewer answers than the EMA and the streak rule before its declarations are right nine times in ten | Simulation | Pre-specified estimate |
| H3 | How often the three methods agree, and how students answer after each declares mastery | ASSISTments | Exploratory |
| G1 | Too coarse: when a skill is several components modelled as one, BKT loses precision and calibration, and the simpler rules lose less | Simulation | Pre-specified sweep |
| G2 | Right grain: BKT on each component restores precision and names the missing component, if and only if the questions tell the components apart | Simulation | Pre-specified sweep |
| G3 | Too fine: splitting what is learnt as one, or more components than the practice supports, costs answers for no gain in precision | Simulation | Pre-specified sweep |
| G4 | On the same real answers, BKT at the data set's own skills predicts better than at five topics and at one skill | ASSISTments | Confirmatory |

: The hypotheses of the thesis, the evidence each rests on and the kind of claim each makes.

H1 and G4 are the two confirmatory tests. For both, the measure is the difference in mean log-loss per answer on the
same held-out answers, with a 95 % interval from a paired bootstrap over students, and the smallest difference that
counts is fixed in advance at 0.005 per answer, so that a difference too small to matter is not declared a win only
because the data set is large. The verdict follows a rule written down before any result: if the interval excludes
zero and the estimate is at least 0.005, the model with the lower log-loss is better; if the interval excludes zero
but the estimate is smaller, the difference is real but negligible; if the interval lies wholly within 0.005 of zero,
there is no practical difference; anything else is inconclusive. H2 and G1 to G3 are estimates with intervals, each
reported for every simulated world and learning rate separately and never pooled. H3 is exploratory because the
ASSISTments data were collected under the streak rule itself, so the data cannot show what would have happened had a
student been kept practising longer.

# 1 Background and related work

Mastery learning holds that most students can reach a high level in a subject if each unit is learnt to a set standard
before the next one starts, and if the time each student spends varies to make that possible [@bloom1984]. Reviews of
intelligent tutoring systems, many of which implement mastery learning, find that they raise test scores compared with
conventional teaching [@kulik2016] and that step-based tutors come close to human tutors [@vanlehn2011]. A computer
system that implements mastery learning has to turn "learnt to a set standard" into a rule it can apply after every
answer, and every such rule trades the two errors of stopping too early and too late against each other, usually
through a threshold: a higher probability for BKT, a longer run for the streak rule.

BKT is a hidden Markov model with two states and four parameters per skill: the chance that the skill is known before
any practice, the chance of learning it at each practice opportunity, the chance of a right answer by guessing and the
chance of a wrong answer by slipping [@corbett1994]. After each answer the model updates its probability that the
student knows the skill by Bayes' rule and then allows for learning from the question. It makes three assumptions that
matter here: learning happens in one step, nothing is forgotten, and all students share a skill's parameters.
Extensions that relax them predict real answers about as well as much more complex models [@khajah2016; @yudelson2013],
but deployed systems use the standard model. Its fitted parameters are also not always identifiable: different values
can predict the observed answers equally well while implying different probabilities that the student knows the skill
[@beck2007identifiability], and that matters directly for mastery decisions, which act on that probability. A question
that needs several skills is usually read conjunctively, as answered right, but for a slip, only when every skill it
needs is known [@pardos2008composition], and how the evidence of such a question is shared among its skills decides
how well each is traced [@xu2012subskills].

The simpler estimators weigh recent answers more than old ones. The streak rule declares mastery when the last $N$
answers were all right; it needs no fitting and gives no probability. The exponential moving average keeps a score
$s$ between 0 and 1 that, after each answer $c$, becomes $(1 - \alpha)s + \alpha c$, so an answer $k$ steps back
carries weight proportional to $(1 - \alpha)^k$. The score can be read as the predicted chance of a right answer, so
the EMA can be judged as a predictor in the same way as BKT, and a mastery rule follows by declaring mastery when the
score reaches a threshold. Neither rule assumes anything about what a skill is. Mastery criteria have been compared
directly before: @pelanek2017mastery analysed several criteria for a single, well-specified skill on simulated and real
data and found the choice of data and of threshold to matter more than the choice of learner model, and
@fancsali2013mastery studied by simulation how BKT's mastery assessment fares when its parameters differ from the ones
that generate the answers. Neither varied the grain of the skill.

A knowledge component, in the framework of @koedinger2012kli, is the unit a student learns, which may or may not be
the unit a curriculum names, and a skill model says which components each task needs. Finding the right grain has
been treated as a search: learning factors analysis splits or merges components and keeps a change when it fits the
students' learning curves better [@cen2006lfa]. The effect of grain on prediction has been measured on the system this
thesis's real data come from. @pardos2007granularity fitted models of ASSISTments students at 1, 5, 39 and 106 skills
and found the finer models predicted state test scores better, and @pardos2007finegrained and @feng2009grainsize
reached the same result with mixed-effects models. These studies compared grains for predicting an external score.
None measured mastery decisions against a known truth, which no real data set allows, because a real student's state
is never observed. That is the gap the simulated part of this thesis fills.

Student models that give probabilities are judged by how good those probabilities are [@pelanek2015metrics]. Log-loss,
the negative mean log-likelihood of the observed answers, punishes a confident wrong prediction most, which is the
error that makes a mastery decision wrong, so it is the primary measure here, with the root mean squared error, the
area under the ROC curve and calibration reported beside it. The fair test for a system that will meet new students
holds out whole students: the model is fitted on the rest and predicts each held-out student's answers in order,
learning from each answer only after predicting it [@pelanek2015metrics].

# 2 Planned method

The three methods compared all read one student's answers on one skill, in order, and after each answer say whether
the skill is now mastered; each declares mastery the first time its condition holds. BKT on the skill has four
parameters per skill, fitted on training students by a search over a grid with guess and slip bounded at 0.3, and
declares mastery when its probability reaches a threshold, usually 0.95. The EMA has one decay rate for all skills,
chosen on training students for the lowest log-loss, and a starting score set to the training students' share of
right first answers; it declares mastery when its score reaches a threshold. The streak rule declares mastery after
$N$ right answers in a row, with $N = 3$ as in the ASSISTments skill builders. Where the grain is finer than one skill,
BKT is also run on each component, reading every question conjunctively for the components it needs, and the skill is
declared mastered when every component's probability has reached the threshold. Two further student models already in
Zeno's evaluation code, the Elo rating and Performance Factors Analysis, are reported as reference rows only.

Two results follow from the definitions alone and shape the design. The first shows exactly when the streak rule is a
special case of the EMA: an EMA with decay $\alpha$, threshold $\theta$ and starting score $s_0$ makes the same
decisions as "the last $N$ answers were right" on every sequence of answers if and only if
$(1 - \alpha)^N \leq 1 - \theta \leq \alpha(1 - \alpha)^{N-1}$ and $s_0$ is low enough. The band for $\theta$ is
empty unless $\alpha \geq 1/2$, so only a fast-moving average behaves as a streak rule, and the streak rule is compared
as a method of its own. The second shows that when students learn exactly as BKT assumes and the model knows the true
parameters, BKT's declarations at threshold $\theta$ are right at least a share $\theta$ of the time. A comparison run
only in BKT's own world would therefore favour BKT by construction, so that world is used only to measure what fitting
the parameters costs, and only worlds that break BKT's assumptions test it. The same result says what a change of
grain does: a skill made of several components, each learnt in one step, is no longer a BKT process, so the guarantee
holds for BKT on each component and not for BKT on the skill.

The real answers come from the corrected ASSISTments 2009–2010 skill builder data set [@assistments2010data], logged
by the ASSISTments system [@feng2009assistments]: US middle-school students answering mathematics problems, with the
skill each problem practises and whether the first attempt was right. The cleaning keeps main problems only, not the
scaffolding questions a wrong answer opens, puts the answers in the order they were given and keeps each student's
class. For G4 the same answers are modelled at three grains without new data: the data set's own 110 skill tags, five
topic areas the skills fall into, and one skill for all of mathematics.

The simulated students are of three kinds, and after every answer each records whether the student truly knows the
skill. In the one-grain worlds, 400 students practise 38 skills, 30 questions each, in one of four worlds: a BKT world
where a skill is known or not and is learnt in one step, the same with a small chance of forgetting, and two gradual
worlds where the chance of a right answer rises a little with each question, in which a skill counts as mastered when
the true chance of a right answer reaches 0.9. Each is run at two learning rates. In the world of components, which
serves G1 to G3, every skill is $k$ components, each exactly what BKT assumes a skill to be, and a question asks for
one component or several; the model's grain can then be set to one state for the skill, one per component, or several
per component, against the same answers and the same truth. In the world of ideas, the components are the sixteen
ideas of fractions and the whole-number arithmetic it rests on, decomposed by hand, and the questions are the ones
Zeno's own generators ask, each read for the ideas it needs; a fractions operation needs seven to ten ideas at once,
while some forms ask for one idea alone. Every random choice is seeded, so every number can be reproduced.

Every parameter and threshold is chosen on training students only, and a fifth of the students are held out by a hash
of their identifier, so no student's answers are split between the two sides. For prediction, the models are fitted on
the training students and then predict every held-out answer in order. For mastery decisions where the truth is known,
three measures describe a rule: its precision, the share of its declarations made when the student truly knew the
skill; its cost, the mean number of answers until it declares; and the share of practices it never declares. For H2,
each method's threshold is the cheapest one whose precision on the training students is at least 90 %, and the
methods are compared by their cost on the held-out students, with intervals from 2,000 bootstrap resamples. For G1 to
G3, each method is also judged at the threshold a deployed system would use without a truth to set it by, BKT at 0.95
and the streak rule at three, and its score is set against the truth after every answer to measure its calibration.
G2 adds whether the model names the idea a student lacks, at every moment a learner is exactly one idea short of
mastery, against the chance of one in the number of ideas. G3 adds the share of fitted parameter sets that are
degenerate, with guess or slip at their bound. The sweeps vary the number of components from 1 to 16, how many of
them a question needs, the share of questions that ask for one idea alone, and the length of the practice, from 30 to
120 questions.

All of this runs in open, deterministic code inside the Zeno repository, written in TypeScript, with each hypothesis
behind one command, so that every number in the thesis can be reproduced. The hypotheses, their tests and the verdict
rules are recorded in the repository's history before the results they concern, so the order in which they were fixed
can be checked by anyone.

# 3 Expected contribution, scope and limitations

The thesis does not propose a new model. BKT, moving averages and the conjunctive form of BKT are well known, mastery
criteria have been compared before, and the grain of a skill model has been studied for prediction. What it adds is a
measurement of what grain does to mastery decisions themselves, against a known truth, which only a simulation in which
both the learners' grain and the model's grain are under control makes possible; the same methods compared on real
answers at several grains, with one pre-specified test; and a practical answer for a real system. The expected outcome
is not an optimal grain in general, which the thesis does not claim exists, but the conditions under which each grain
is usable and what each method loses when the grain is wrong. For Zeno, the outcome is a recommendation of which rule
should decide mastery, at the grain of the skill or of the ideas inside it, and how its threshold should be set.

The scope is set by what can be done without a classroom. An earlier plan asked whether choosing practice questions
with a learner model helps a class learn more than a fixed sequence, but that can only be answered in schools, with
ethics approval for children's data and, as a power analysis showed, several classes; it is left as future work.
Every number here comes from a public, anonymised data set or from simulation.

Three limitations are known in advance. First, the simulated worlds are of this thesis's own making, so what they show
holds for the kinds of learning they build in; that is why each world breaks a stated assumption, and why results are
reported for every world separately rather than pooled. Second, the ASSISTments data were collected under the streak
rule, which ended practice after three right answers, so the data cannot show a student who would have been kept
practising longer, and H3 is exploratory for that reason. Third, answers within one class are related through a shared
teacher and lessons, so resampling students as if they were independent makes the intervals too narrow; the intervals
of H1 and G4 are therefore also computed by resampling whole classes, as a robustness check.

# 4 Work plan and current status

The thesis follows the department's three stages: this concept, which covers the introduction, research question,
hypotheses, background and planned method; a preliminary draft with the method in full and the simulation results; and
the final thesis with the real-data results, the discussion, the threats to validity, the conclusion and the abstracts
in both languages. The final thesis has three chapters after an unnumbered introduction: background and related work,
method, and results, discussion and conclusion.

The work is further along than this stage requires. The title and research question were approved at the title
defence on 13 October 2026. The code for every method, simulated world and test is written, the analyses have been
run, and a full draft of the thesis exists. In first results, BKT predicts held-out ASSISTments answers better than the
EMA by 0.0225 in log-loss per answer, so H1 holds by the rule fixed in advance, and BKT at the data set's 110 skills
predicts better than at one skill by 0.0346, so G4 holds. In simulation, a skill made of several components and
modelled as one makes BKT's declarations at 0.95 right 98 % of the time with one component but under 8 % with eight,
while BKT on each component keeps its precision where the questions tell the components apart and the practice is
long enough to ask about each. Robustness checks on four further random seeds and on whole classes resampled are also
done. What remains is to revise the draft with the supervisor, to check it against the department's format, and to
prepare the defence.
