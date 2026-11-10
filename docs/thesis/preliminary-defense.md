# Preliminary defence

The talk for the preliminary defence of *The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems*, by Davit Tchintcharashvili, supervised by Mikheil Gigauri. The defence falls between 16 and 21 November 2026; the date, room and length allowed are not yet known. The talk is about 1200 words, which is about 9 minutes at an even pace. It covers what the preliminary draft sent on 9 November contains, the method and the simulation results, and every number is that draft's. The slides are in `preliminary-defense.pptx`, with this text in each slide's notes; both files are written by `scripts/preliminary-slides.py`.

## The talk

*Slide 1: the title, the author, the supervisor.*

Good afternoon. My thesis is about one decision that every adaptive practice system makes, and about something that decision quietly depends on. Today I present the method and the simulation results, which is what the preliminary draft contains.

*Slide 2: The decision: has this student mastered this skill?.*

A practice system must decide, after each answer, whether the student has mastered the skill and can move on. Both mistakes cost something. Too early, and the student starts work that needs a skill they do not have. Too late, and they spend time on questions they can already answer. Every method that makes this decision takes the skill as given. But what counts as one skill is a choice. Fractions can be one skill, or sixteen separate ideas, from the times tables to converting a mixed number. I call that choice the grain.

*Slide 3: Research question.*

The research question, approved at the title defence, is how the grain at which skills are defined affects the accuracy and reliability of mastery estimation. Grain means two things together: how many components a topic is divided into, and which of them each question needs. Accuracy is the share of mastery declarations that are right. Reliability is whether the score can be read as a probability, and whether a threshold that works in one setting still works in another.

*Slide 4: What earlier work measured, and what it did not.*

Three lines of earlier work meet here. Mastery rules have been compared before, most closely by Pelánek and Řihák, who found that the threshold and the data matter more than the model. The grain of a skill model has been compared too, on the ASSISTments system, but for predicting answers. And there is a model for questions that need several skills at once. What had not been measured is what the grain does to the mastery decision itself, checked against a known truth. That is the gap this thesis fills.

*Slide 5: Three methods, two proofs.*

I compare three methods. Bayesian Knowledge Tracing treats a skill as known or not known and keeps a probability that it is known; mastery is declared when that probability reaches a threshold, usually 0.95. The exponential moving average simply weights recent answers more. The streak rule asks for N right answers in a row. Two results are proved. The first says exactly when the streak rule is a special case of the moving average. The second says that in a world built the way BKT assumes, BKT's declarations are right at least as often as its threshold says. So a world like that cannot be evidence for BKT. The comparison that counts happens in worlds that break its assumptions.

*Slide 6: Method: simulated students whose true state is known.*

Real data never show whether a student has truly mastered a skill. So I simulate students whose true state is known after every answer, and check each declaration against it. There are four worlds at one grain: BKT's own world, the same with forgetting, and two where ability rises gradually. Then three granularity studies change the grain: the model is made coarser than the way students learn, matched to it, and made finer. Everything is fitted on training students and judged on a fifth of the students held out. I measure how often declarations are right, how many answers they cost, how many students are released at all, and calibration. Every run is seeded and can be reproduced from the code.

*Slide 7: Result 1: at one grain, BKT works where its assumptions hold.*

First, the methods at one grain. The rule for each method is chosen so that nine declarations in ten are right on the training students. Where students forget, BKT is the cheapest: about three and a half answers against five and a half for the moving average. Where learning is gradual, no threshold up to 0.9999 brings BKT to that standard. A later check showed it can get there, but only at a threshold of about seven nines, which has to be set knowing the world. Calibration tells the same story: BKT's Brier score is 0.023 in its own world and 0.339 in the gradual one. A number that is a good probability in one world is a poor one in another.

*Slide 8: Result 2: a model that is too coarse declares too early.*

Why does BKT fail in the gradual worlds? The answer is grain. Here every skill is made of several components, and each one is learnt in a single step, exactly as BKT assumes. But the model treats the skill as one. With one component, 98 % of BKT's declarations at 0.95 are right. With two it is 59 %, with four 23 %, with sixteen half a percent. The moving average and the streak rule fall the same way, so simplicity does not protect them. The dashed line is BKT on each real component: it stays near 98 %. But at eight and sixteen components it stops declaring at all, because thirty questions give each component too little evidence.

*Slide 9: Result 3: the right grain helps, on two conditions.*

The second study uses a real topic. I decomposed fractions by hand into sixteen ideas and used the question generators of Zeno, the practice system this work grew out of. A fractions question needs about six ideas at once, so a wrong answer does not say which one is missing. After thirty questions the model names the missing idea in about 57 % of cases and releases almost nobody. With 120 questions it names the idea in 79 % of cases and releases 85 % of students. But precision on held-out students falls below the 90 % target, to 78 %. So the right grain helps, on two conditions: the questions must tell the ideas apart, and the practice must be long enough.

*Slide 10: Result 4: a model that is too fine wastes answers.*

The third study goes the other way. The students and their answers stay exactly the same, and I split each real component into artificial parts in the model only. Splitting four ways costs about ten more answers for the same precision. At the usual threshold of 0.95, the share of students released falls from 94.5 % to 7 %. And the fits pile up at the edge of the allowed range, which is a warning a system could see in its own data. Finer is not safer.

*Slide 11: Limits.*

The limits. The worlds are of my own making, so they show what follows under those assumptions, not how all students learn. The decomposition of fractions is done by hand. Comparing the methods at equal precision was a change made after the first run at equal cost turned out to be uninformative, and the draft says so. A threshold chosen on training students does not always hold on new ones. All tables were repeated on four more seeds, and I rely only on the effects that survive. I do not claim a best grain in general, and I do not measure whether Zeno helps a class learn.

*Slide 12: Preliminary conclusion and what remains.*

The preliminary conclusion is that the grain changes both what a mastery score means and how much evidence a decision needs. A model that is too coarse becomes confident about a mixture of known and unknown ideas. A model that is too fine releases almost nobody. So the component mapping, the questions and the mastery rule have to be chosen together. For the final thesis, what remains is the same question on real students' answers, the public ASSISTments data, with the test fixed in advance, and the recommendation for Zeno. Thank you. I am glad to take questions.

## Questions to expect

**What is new, if BKT and mastery rules have been compared before?** They have, most closely by Pelánek and Řihák (2017), and my one-grain results agree with them. Grain has been compared too, by Pardos and by Feng on ASSISTments, but for prediction. What had not been measured is what grain does to the mastery decision itself against a known truth. None of the methods is new; the measurement is.

**Why simulation and not real students?** Because real data never show whether a student has truly mastered a skill, so a declaration cannot be checked. In simulation the truth is recorded. The real-data part, on ASSISTments, is in the final thesis and tests prediction, which real data do allow.

**You built the worlds yourself. Doesn't that decide the result?** It limits what the result means, and the draft says so. The G1 world is the most favourable one for BKT I could build: every component is exactly what BKT assumes. BKT still fails when the grain is wrong, so the failure comes from the grain and not from a world chosen against it.

**Is BKT bad, then?** No. In its own world it is right 97 to 98 % of the time at 0.95, as Proposition 2 predicts, and with forgetting it is the cheapest method. It fails when one modelled skill stands for several learnt units.

**Why does BKT say “never” in the gradual worlds, and then reach the target later?** The first search stopped at 0.9999, a ceiling fixed in advance. A later check extended it and BKT reaches 90 % at about seven nines. I report both. A threshold that close to 1 has to be set knowing the world, so it is not a rule a system could use in general.

**What did you change after seeing results?** Two things, both stated in the draft: the comparison moved from equal cost to equal precision, and the granularity worlds were first built as checks after H2. The later sweeps were specified before they were run.

**What is your own work here?** The two proofs, the simulation worlds, the decomposition of fractions into sixteen ideas, the implementation of all three methods and the per-component model, and the analysis. All of it is in the public repository and each table names the command and the commit that produced it.

**What does this mean for Zeno?** Choose the components together with the questions, and check the stopping rule on the data it will face. The full recommendation is in the final thesis.

**What remains before the final submission?** Integrating the ASSISTments analyses, H1 on prediction and G4 on the same answers at three grains, and the formatting to the university's rules. The final thesis goes to the supervisor by 18 January 2027.
