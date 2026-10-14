# 3 Results and discussion

This chapter reports the results in the order of the hypotheses and interprets them. Section 3.1 describes the data
kept and the simulated settings, reports the methods at one grain (H1 to H3) and discusses what that evidence shows.
Section 3.2 does the same for the four granularity studies, too coarse (G1), the right grain and the questions (G2),
too fine (G3) and real data across grains (G4). Section 3.3 draws the consequences for a system such as Zeno and sets
out the threats to the validity of the conclusions. The one-grain simulation results were made at commit 88c4af7 of
the Zeno repository, the check above BKT's highest threshold (Table 3.7) at commit 66c2eda and the calibration of the
methods' scores (Table 3.8) at commit ba04c48; the granularity sweeps were made at commit 9180a75 (G1, G2) and 66ee9af
(G3, G4 on simulated learners), and the ASSISTments results (sections 3.1 and 3.2) at commit 3633cc1, with the
commands in Appendix B.

## 3.1 The methods at one grain

### Data and settings

The corrected ASSISTments 2009–2010 skill builder file has 346,860 rows. The importer kept 259,399 of them as
answers: main problems with a skill and a first-attempt result, every one naming its problem. They come from 4,163
students in 213 classes, on 110 skills, of which 102 carry a name and eight only a tag number; 432 students answered
in more than one class and are counted in the class they answered most in. The rows left out are the scaffolding
questions that a wrong answer opens and the problems with no skill tag, which the corrected file writes as NA. Of the
kept answers 65.8 % were right at the first attempt. Split seed 1 holds out 853 students with 51,452 answers, 66.6 % of
them right, and leaves 3,310 students with 207,947 answers for fitting; the same split serves H1, H3 and G4, and the
held-out students' answers form 7,561 practices, one per student and skill, of 6.8 answers on average, since a skill
builder ends after three right in a row. The EMA fitted on the training students has $\alpha$ = 0.15 and a starting
score of 0.594, the share of right first answers, above one half as Proposition 1 predicts. For G4 the 110 skills fall
into five topic areas, algebra (29 skills), geometry (26), number (26), data (16) and the rest (13), and at the
coarsest grain into one. Every problem is one observation in the corrected file, so every grain has every answer and
the three grains are compared on the same 51,452 held-out answers.

In the one-grain simulation, 400 students each practised 38 skills with 30 questions per skill, which gives 15,200
practices of 30 answers in each world and at each learning rate. A fifth of the students, held out by split seed 1,
were used for judging, which leaves about 3,000 held-out practices in each setting. Table 3.1 shows how many of them
truly knew the skill after the first and after the last answer, and the EMA settings fitted on the training students.

| World | Learning rate | Known after the first answer | Known after the last answer | EMA $\alpha$ | EMA start |
|---|---:|---:|---:|---:|---:|
| BKT | 0.02 | 49.5 % | 88.2 % | 0.15 | 0.535 |
| BKT with forgetting | 0.02 | 48.3 % | 70.5 % | 0.15 | 0.536 |
| elo | 0.02 | 4.8 % | 10.7 % | 0.10 | 0.478 |
| irt2pl | 0.02 | 3.9 % | 8.9 % | 0.10 | 0.485 |
| BKT | 0.1 | 60.2 % | 100.0 % | 0.15 | 0.533 |
| BKT with forgetting | 0.1 | 59.0 % | 92.6 % | 0.15 | 0.536 |
| elo | 0.1 | 5.3 % | 68.2 % | 0.15 | 0.478 |
| irt2pl | 0.1 | 4.5 % | 58.9 % | 0.15 | 0.485 |

Table: Held-out simulated practices in which the student truly knew the skill after the first and after the last of 30
answers (in the gradual worlds, a true chance of a right answer of at least 0.9), and the EMA settings fitted on the
training students (`npm run mastery`).

The worlds differ sharply. In the two BKT worlds about half the students know a skill before practising it, and at the
higher learning rate nearly all of them know it after 30 questions. In the gradual worlds very few students start at a
true chance of 0.9, and at the lower learning rate only about one in ten reaches it within the 30 questions. The
fitted EMA moves slowly in every world, with $\alpha$ of 0.1 or 0.15, far from the $\alpha$ of at least one half that
Proposition 1 requires for the EMA to act as a streak rule.

In the world of components, 400 learners each practised 12 skills of $k$ components, 30 questions on each, which gives
4,800 practices per setting and about 960 held out. The share of held-out learners who knew every component after the
last answer falls with $k$: asked one component at a time at the lower learning rate, 88 % with one component, 58 %
with two, 24 % with four, 7 % with eight and under 1 % with sixteen, and at the higher rate 100 %, 97 %, 71 %, 19 % and
3 %. In the world of ideas, 400 learners each practised times, hcf and fractions, 30 questions on each unless stated,
and of the held-out fifth 73 % and 100 % knew every idea of times after the last answer at the two rates, 53 % and 92 %
of hcf, and 12 % and 37 % of fractions.

### Prediction on real answers (H1)

Table 3.2 gives the prediction of the held-out students' first-attempt answers under split seed 1. BKT predicts
better than the EMA on every measure, with a log-loss of 0.5690 against 0.5915 and an AUC of 0.711 against 0.692. The
Elo model Zeno runs predicts better than both, at 0.5607, and searching its two rates on the training students returns
the values it already uses ($\alpha$ = 0.2, $\beta$ = 0.01); PFA sits between BKT and the EMA. Every model beats the
three counting baselines, and the EMA beats the best of them, each student's rate on each skill, by 0.019 in log-loss.

| Model | Log-loss | RMSE | AUC | Accuracy |
|---|---:|---:|---:|---:|
| BKT | 0.5690 | 0.4385 | 0.711 | 0.715 |
| EMA | 0.5915 | 0.4493 | 0.692 | 0.701 |
| Elo | 0.5607 | 0.4351 | 0.724 | 0.719 |
| PFA | 0.5814 | 0.4437 | 0.701 | 0.703 |
| Per student and skill rate | 0.6106 | 0.4599 | 0.690 | 0.687 |
| Per skill rate | 0.6173 | 0.4625 | 0.614 | 0.670 |
| Overall rate | 0.6371 | 0.4717 | 0.503 | 0.666 |

Table: Prediction of the 51,452 first-attempt answers of 853 held-out ASSISTments students, split seed 1, by models
fitted on the other 3,310 students (`npm run model -- --observations data/assistments.json --fit`, commit 3633cc1).

The paired bootstrap decides H1. On split seed 1 the difference in mean log-loss per answer, BKT minus EMA, is
−0.0225 with a 95 % interval of [−0.0264, −0.0183] from 10,000 resamples of the 853 held-out students. The interval
excludes zero and the estimate is more than four times the smallest difference that counts, 0.005, so by the rule fixed
in advance BKT is better, and H1 holds. The four other splits agree: the differences are −0.0251 [−0.0287, −0.0212],
−0.0224 [−0.0262, −0.0182], −0.0225 [−0.0263, −0.0184] and −0.0214 [−0.0251, −0.0174] for seeds 2 to 5, with 767 to
837 students held out, and BKT's log-loss stays between 0.569 and 0.581 while the EMA's stays between 0.592 and 0.602.
Resampling whole classes instead of students, 145 to 157 classes a split, widens every interval by about half, to
[−0.0289, −0.0142] on seed 1, and changes no verdict.

In ten calibration bins, BKT's predicted chance of a right answer is within 0.04 of the observed share in every bin
that holds more than a thousand answers, and within 0.01 in the three bins from 0.6 to 0.9 that hold 36,586 of the
51,452 answers. The EMA is under-confident through the middle of its range, predicting 0.57 where 0.63 were right and
0.65 where 0.76 were, and over-confident at the top, 0.93 where 0.87 were; a third of its predictions, 16,794 answers,
lie between 0.5 and 0.6, because every practice starts at 0.594 and with $\alpha$ = 0.15 the score moves slowly. Of the
110 skills' fitted BKT parameter sets, 63.6 % have guess or slip at the bound of 0.3 and 80.0 % have some parameter at
an edge of the grid.

### Mastery decisions where the truth is known (H2)

Table 3.3 gives the H2 comparison. For each world and learning rate it shows, for each method, the threshold chosen on
the training students as the cheapest whose declarations were right at least 90 % of the time, and how that rule did
on the held-out students: the mean number of answers it needed, with its 95 % interval, the share of its declarations
that were right and the share of practices in which it declared mastery at all. The last column is the number of
answers BKT saves against that method, with its interval; a positive value means BKT needs fewer.

| World | Rate | Method | Rule | Answers [95 % interval] | Right | Declared | BKT saves [95 % interval] |
|----------------|-----|-------|-----------|-------------------:|------:|---------:|------------------|
| BKT with forgetting | 0.02 | BKT | $\theta$ = 0.74 | 10.08 [9.37, 10.79] | 90.0 % | 87.1 % | |
| | | EMA | $\theta$ = 0.61 | 11.27 [10.51, 12.06] | 93.6 % | 84.1 % | 1.20 [1.08, 1.32] |
| | | streak | $N$ = 3 | 11.46 [10.79, 12.11] | 92.6 % | 87.4 % | 1.38 [1.21, 1.55] |
| BKT with forgetting | 0.1 | BKT | $\theta$ = 0.79 | 3.54 [3.36, 3.72] | 89.4 % | 100.0 % | |
| | | EMA | $\theta$ = 0.61 | 5.53 [5.25, 5.81] | 96.0 % | 99.9 % | 1.99 [1.87, 2.11] |
| | | streak | $N$ = 2 | 4.23 [4.05, 4.40] | 93.5 % | 100.0 % | 0.68 [0.63, 0.74] |
| elo | 0.02 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.97 | 29.97 [29.95, 29.98] | 90.2 % | 2.2 % | |
| | | streak | $N$ = 26 | 29.92 [29.88, 29.95] | 85.7 % | 2.2 % | |
| elo | 0.1 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.93 | 25.70 [24.94, 26.43] | 89.5 % | 48.3 % | |
| | | streak | $N$ = 14 | 27.11 [26.54, 27.65] | 92.9 % | 35.5 % | |
| irt2pl | 0.02 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.96 | 29.89 [29.84, 29.93] | 87.2 % | 3.1 % | |
| | | streak | $N$ = 25 | 29.90 [29.86, 29.94] | 88.1 % | 2.4 % | |
| irt2pl | 0.1 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.95 | 27.32 [26.78, 27.82] | 91.6 % | 34.6 % | |
| | | streak | $N$ = 15 | 27.84 [27.37, 28.26] | 93.2 % | 27.8 % | |

Table: H2, the answers each method needs for its declarations to be right at least 90 % of the time, on about 80
held-out students per setting (about 3,000 practices). "Never": no threshold up to 0.9999 met the standard on the training
students. Intervals from 2,000 bootstrap resamples of students (`npm run mastery`, commit 88c4af7).

In the BKT world with forgetting, H2 holds at both learning rates. BKT needs 1.20 fewer answers than EMA and 1.38
fewer than the streak rule at the lower rate, and 1.99 and 0.68 fewer at the higher rate, and none of the four
intervals comes near zero.

In the two gradual worlds, H2 does not hold. At neither learning rate did any BKT threshold, up to 0.9999, make
declarations that were right 90 % of the time on the training students, so by the rule fixed in advance BKT never meets
the standard there, and this counts against it. The check later in this section, made after these results, shows
that this is largely a matter of where the search for a threshold stopped. EMA and the streak rule do meet the standard,
but only by waiting for almost the whole practice. At the lower learning rate, where about one student in ten masters a
skill at all, they declare mastery in 2 to 3 % of practices, near the 30th answer. At the higher rate they declare it in
between a quarter and a half of practices, after 25 to 28 answers on average, with EMA a little cheaper than the streak
rule (1.41 answers in the elo world and 0.52 in the irt2pl world, from the costs in the table).

The thresholds were chosen on training students, and on the held-out students their precision scatters around the
target: from 85.7 % to 96.0 % across the table. Five of the 14 chosen rules fall below 90 % on the held-out students,
one of them BKT's.

The trade-off curves show where BKT's precision stops. In the elo world at the higher learning rate, BKT at
$\theta = 0.80$ declares mastery in 94 % of practices after 10.4 answers on average, and only 7 % of its declarations
are right. At $\theta = 0.99$ it waits for 16.2 answers on average and declares in 85 % of practices, and 17 % of its
declarations are right. EMA at $\theta = 0.99$, by contrast, waits 29.7 answers, declares in 12 % of practices and is
right every time. The streak rule with $N = 6$ needs 18.9 answers and is right 33 % of the time. Raising BKT's threshold
from 0.80 to 0.99 makes it wait only six answers longer, and even the highest threshold tried, 0.9999, did not bring
its precision on the training students to 90 %. The irt2pl world shows the same pattern (16 % right at
$\theta = 0.99$, after 16.5 answers). BKT's probability crowds so close to 1 that only thresholds much closer to 1 than
0.9999 could make it wait as long as the standard requires.

The plain BKT world is not part of H2, because Proposition 2 settles it, and Table 3.4 shows how fitted BKT does
there. At the usual threshold of 0.95, the proposition promises at least 95 % right declarations if the parameters
were the true ones. With the fitted parameters, 97.7 % were right at the lower learning rate and 96.7 % at the higher,
so fitting cost nothing measurable against the bound. At equal precision BKT also needs the fewest answers, as the
proposition leads one to expect.

| Rate | Method | Rule | Answers [95 % interval] | Right | Declared | BKT saves [95 % interval] |
|----:|----------|-----------|------------------|--------------------------:|---------:|------------------|
| 0.02 | BKT | $\theta$ = 0.84 | 9.00 [8.34, 9.67] | 89.4 % | 90.6 % | |
| | EMA | $\theta$ = 0.61 | 10.74 [9.98, 11.52] | 96.1 % | 86.0 % | 1.74 [1.57, 1.92] |
| | streak | $N$ = 3 | 10.84 [10.20, 11.50] | 94.7 % | 89.3 % | 1.84 [1.71, 1.98] |
| | BKT, usual | $\theta$ = 0.95 | 11.20 | 97.7 % [97.0 %, 98.4 %] | 86.6 % | |
| 0.1 | BKT | $\theta$ = 0.83 | 3.28 [3.11, 3.45] | 91.0 % | 100.0 % | |
| | EMA | $\theta$ = 0.54 | 3.46 [3.22, 3.69] | 90.9 % | 100.0 % | 0.17 [0.09, 0.25] |
| | streak | $N$ = 2 | 4.03 [3.86, 4.20] | 95.7 % | 100.0 % | 0.75 [0.69, 0.81] |
| | BKT, usual | $\theta$ = 0.95 | 4.39 | 96.7 % [96.0 %, 97.3 %] | 100.0 % | |

Table: The plain BKT world, which follows BKT's assumptions: the comparison at 90 % right, and BKT at its usual
threshold of 0.95 with the interval of its precision, which Proposition 2 bounds below by 0.95 for the true
parameters (`npm run mastery`, commit 88c4af7).

Table 3.5 gives the comparison as it was first planned, at equal cost: each method's threshold set so that it needs,
on the training students, as many answers as the streak rule with $N = 3$.

| World | Rate | Answers | BKT right | EMA right | Streak right | BKT at 0.95: answers, right |
|--------------------|----:|------:|------:|------:|------:|---------------|
| BKT | 0.02 | 10.8 | 96.9 % | 96.6 % | 94.7 % | 11.2, 97.7 % |
| BKT with forgetting | 0.02 | 11.5 | 94.4 % | 94.1 % | 92.6 % | 13.3, 96.6 % |
| elo | 0.02 | 14.8 | 7.5 % | 7.6 % | 7.2 % | 18.2, 9.3 % |
| irt2pl | 0.02 | 14.8 | 6.1 % | 6.3 % | 6.0 % | 18.4, 7.7 % |
| BKT | 0.1 | 5.6 | 99.2 % | 98.4 % | 99.2 % | 4.4, 96.7 % |
| BKT with forgetting | 0.1 | 6.0 | 97.0 % | 96.5 % | 97.1 % | 5.4, 96.4 % |
| elo | 0.1 | 11.2 | 8.1 % | 8.1 % | 9.5 % | 13.6, 11.1 % |
| irt2pl | 0.1 | 11.3 | 7.4 % | 7.0 % | 8.2 % | 13.7, 10.0 % |

Table: The three methods at the cost of the streak rule with $N = 3$ (its mean answers on the held-out students), and
BKT at its usual threshold, which costs what it costs. The intervals of the precisions are about ±1 percentage
point in the BKT worlds and ±2 to 3 in the gradual worlds (`npm run mastery`, commit 88c4af7).

At equal cost the three methods are hard to tell apart. In the BKT worlds all three are right 92 to 99 % of the time.
In the gradual worlds all three are right less than 10 % of the time, because at 11 to 15 answers very few students
have reached a true chance of 0.9. This is the result that led to the change from equal cost to equal precision
(section 2.2).

In the gradual worlds, mastery was defined in advance as a true chance of at least 0.9. Table 3.6 repeats the H2
comparison with 0.8 instead.

| World | Rate | Known at the end | BKT | EMA | Streak | BKT saves against EMA, streak |
|-------|----:|-------:|--------------|--------------|--------------|--------------------|
| elo | 0.02 | 26.6 % | never | 28.63, 16.1 % declared | 28.86, 11.3 % declared | |
| irt2pl | 0.02 | 22.2 % | never | 29.00, 12.5 % declared | 29.15, 8.8 % declared | |
| elo | 0.1 | 85.1 % | 21.04, 73.2 % declared | 21.06, 70.7 % declared | 22.08, 65.4 % declared | 0.02 [−0.07, 0.11], 1.04 [0.88, 1.19] |
| irt2pl | 0.1 | 80.3 % | never | 22.75, 62.4 % declared | 24.03, 54.2 % declared | |

Table: H2 in the gradual worlds with mastery defined as a true chance of at least 0.8: the mean answers each method
needs for 90 % right declarations, and the share of practices in which it declares (`npm run mastery -- --worlds
elo,irt2pl --mastered-at 0.8`, commit 88c4af7).

With the lower bar, BKT meets the standard in one of the four settings, the elo world at the higher learning rate,
and only at its highest threshold, 0.9999. There it needs as many answers as EMA (the difference of 0.02 answers has
an interval that includes zero) and about one fewer than the streak rule. In the other three settings BKT again never
meets the standard within the thresholds fixed in advance, while EMA and the streak rule do, with EMA the cheaper of
the two.

The thresholds tried for BKT stopped at 0.9999, a range fixed in advance, and in the one setting of Table 3.6 where BKT
met the standard it did so exactly there. As a check made after the results, the search for BKT and EMA was continued
above 0.9999 to $1 - 10^{-15}$, in steps of a tenth of a power of ten, past which the difference from 1 is lost in the
arithmetic. Nothing else changed: the same students, the same fitted parameters and the same rule for choosing a
threshold. A higher threshold never costs fewer answers, so every rule chosen below 0.9999 stays as it was, and only
the settings in which BKT never met the standard can change. Table 3.7 gives them.

| At | World | Rate | BKT $\theta$ | Answers [95 % interval] | Right | Declared | BKT saves against EMA |
|---|------|----|--------------|----------------------:|------:|--------:|----------------------:|
| 0.9 | elo | 0.02 | $1 - 10^{-12.6}$ | 29.95 [29.93, 29.97] | 89.4 % | 2.3 % | 0.01 [0.01, 0.02] |
| 0.9 | irt2pl | 0.02 | never |  |  |  |  |
| 0.9 | elo | 0.1 | $1 - 10^{-6.9}$ | 25.41 [24.67, 26.13] | 90.7 % | 53.7 % | 0.29 [0.20, 0.38] |
| 0.9 | irt2pl | 0.1 | $1 - 10^{-7.9}$ | 26.91 [26.36, 27.44] | 90.4 % | 43.5 % | 0.42 [0.33, 0.50] |
| 0.8 | elo | 0.02 | $1 - 10^{-8.3}$ | 28.99 [28.72, 29.24] | 90.9 % | 17.9 % | −0.37 [−0.48, −0.26] |
| 0.8 | irt2pl | 0.02 | $1 - 10^{-8.9}$ | 29.24 [29.02, 29.43] | 90.6 % | 13.6 % | −0.24 [−0.33, −0.16] |
| 0.8 | elo | 0.1 | 0.9999 | 21.04 [19.94, 22.14] | 91.6 % | 73.2 % | 0.02 [−0.07, 0.11] |
| 0.8 | irt2pl | 0.1 | $1 - 10^{-4.5}$ | 22.45 [21.46, 23.44] | 89.3 % | 66.6 % | 0.30 [0.20, 0.40] |

Table: BKT in the gradual worlds with its threshold searched up to $1 - 10^{-15}$, with mastery ("At") defined as a
true chance of at least 0.9 and, as in Table 3.6, 0.8. EMA and the streak rule keep the rules of Tables 3.3 and 4.6;
the answers BKT saves against the streak rule are given in the text. "BKT saves" is as in Table 3.3 (`npm run mastery -- --worlds elo,irt2pl --beyond`, with `--mastered-at 0.8` for the
lower bar, commit 66c2eda; a check made after the results).

With mastery at 0.9, BKT now meets the standard in three of the four gradual settings. At the higher learning rate it
needs 0.29 answers fewer than EMA in the elo world and 0.42 fewer in the irt2pl world, and 1.70 and 0.93 fewer than
the streak rule, all with intervals that exclude zero. At the lower rate in the elo world all three methods wait
almost to the 30th answer and declare mastery in about 2 % of practices, and they differ by a few hundredths of an
answer. Only in the irt2pl world at the lower rate does BKT still never meet the standard: its precision on the
training students rises to about 82 % near $1 - 10^{-12}$ and falls again as ever fewer practices are declared. With
mastery at 0.8, BKT meets the standard in all four settings. It needs about a third and a quarter of an answer more
than EMA at the lower rate, ties with it in the elo world at the higher rate, and needs 0.30 fewer in the irt2pl world.
Against the streak rule it needs 0.13 and 0.08 answers more at the lower rate, the second with an interval reaching
zero, and 1.04 and 1.59 fewer at the higher rate.

The thresholds at which BKT meets the standard lie between $1 - 10^{-4.5}$ and $1 - 10^{-12.6}$. At such values its
probability no longer matches the chance of mastery: in the elo world at the higher rate, BKT's declarations are right
nine times in ten only when it declares mastery at more than 99.9999 % certainty. The thresholds EMA needs in the same
settings lie between 0.84 and 0.97.

The check above 0.9999 suggests that what fails in the gradual worlds is BKT's probability, not the order in which it
ranks the evidence. Table 3.8 measures this directly, as description made after the results. After every answer of
every held-out practice, three scores are set against whether the simulated student had mastered the skill at that
moment: BKT's $P(L)$, BKT's chance of a right answer on the next question, $P(L)(1 - P(S)) + (1 - P(L))P(G)$, and
EMA's score. The second is included because in the gradual worlds mastery is defined on the chance of a right answer,
which is the scale of that score and of EMA's, while $P(L)$ is about a known state those worlds do not have. For each
score the table gives the Brier score, the mean squared difference between the score and the truth (1 if mastered, 0
if not) over every answer, and, over the answers after which the score was 0.9 or more, the share at which the student
had mastered the skill, with the mean score in brackets. A calibrated score has that share close to its mean. The
Brier score also depends on how many answers come after mastery, so it compares the scores within a row, not the rows
with each other.

| World | Rate | Brier $P(L)$ | Brier $P$(right) | Brier EMA | Mastered at $P(L) \geq 0.9$ | at $P$(right) $\geq 0.9$ | at EMA $\geq 0.9$ |
|------|----|-----:|-----:|-----:|------:|------:|------:|
| BKT | 0.02 | 0.042 | 0.055 | 0.079 | 99.7 % (0.996) | 100.0 % (0.900) | 100.0 % (0.947) |
| BKT | 0.1 | 0.023 | 0.032 | 0.065 | 99.7 % (0.997) | 100.0 % (0.900) | 100.0 % (0.947) |
| BKT with forgetting | 0.02 | 0.108 | 0.118 | 0.111 | 90.4 % (0.993) | none | 97.6 % (0.946) |
| BKT with forgetting | 0.1 | 0.079 | 0.085 | 0.099 | 94.0 % (0.996) | none | 97.7 % (0.945) |
| elo | 0.02 | 0.401 | 0.286 | 0.256 | 17.9 % (0.989) | none | 70.1 % (0.933) |
| elo | 0.1 | 0.339 | 0.309 | 0.227 | 54.9 % (0.992) | 84.2 % (0.946) | 93.6 % (0.953) |
| irt2pl | 0.02 | 0.416 | 0.285 | 0.260 | 15.3 % (0.988) | none | 69.0 % (0.934) |
| irt2pl | 0.1 | 0.395 | 0.326 | 0.252 | 46.3 % (0.991) | 86.2 % (0.947) | 89.8 % (0.953) |

Table: Calibration of the methods' scores against the truth after every answer of the held-out practices: the Brier
score of BKT's $P(L)$, of BKT's chance of a right answer and of EMA's score, and, where a score was 0.9 or more, the
share of those answers at which the student had mastered the skill, with the mean score in brackets ("none": the
score never reached 0.9). Mastery in the gradual worlds is a true chance of at least 0.9 (`npm run mastery`, commit
ba04c48; description made after the results).

In the BKT worlds, BKT's $P(L)$ is the best calibrated of the three scores, with the lowest Brier score in all four
settings. When it is 0.9 or more the student knows the skill 99.7 % of the time in the plain world, as the first
statement of Proposition 2 leads one to expect, and 90.4 % and 94.0 % of the time with forgetting, which BKT does not
allow for. In the gradual worlds the order reverses. $P(L)$ has the highest Brier score of the three, and when it is
0.9 or more, at a mean of 0.99, the student has mastered the skill in 15 to 18 % of cases at the lower learning rate
and in 46 to 55 % at the higher. EMA's score, at a mean of 0.93 to 0.95, means mastery about seven times in ten at the
lower rate and nine times in ten at the higher. EMA is not calibrated either at the lower rate, but it overstates
mastery far less than BKT does.

BKT's chance of a right answer lies between the two. Its Brier score is lower than that of $P(L)$ in the gradual
worlds, and where it reaches 0.9 it means mastery 84 to 86 % of the time. It reaches 0.9 rarely, however, because it
can never exceed $1 - P(S)$: on every skill whose fitted slip is above 0.1 it stays below 0.9 however many answers are
right, and at the lower learning rate it never got there at all. Within a skill it is a rescaling of $P(L)$, so it
declares mastery for the students in the same order. Reading BKT on the scale on which mastery is defined therefore
makes its probability less overconfident, but it does not remove the need for an extreme threshold, which comes from
how quickly $P(L)$ approaches 1 after a run of right answers.

### Mastery decisions on real answers (H3)

Table 3.9 gives the agreement between the three rules on the 7,561 held-out practices. The EMA threshold that costs
on the training students what the streak rule costs there is 0.6962. BKT at 0.95 declares mastery in 68.6 % of the
practices, the EMA in 48.0 % and the streak rule in 48.5 %. The two simple rules declare in nearly the same practices,
each alone in about 10 % of them; BKT declares in almost every practice they declare in and in a further 22 % where
neither does, and in 29 % of practices no rule declares. Where both members of a pair declare, BKT declares 1.5
answers before the streak rule and 1.0 before the EMA, and the EMA 0.5 before the streak rule. After a declaration, the
next three answers where the practice has them were right 78.6 % of the time for BKT (9,532 answers in 3,905
practices), 80.4 % for the EMA (6,874 in 2,691) and 77.2 % for the streak rule (6,820 in 2,662), against 66.6 % of all
held-out answers; the EMA, which declares latest, is followed by the highest share right, and the three are within
three points of each other.

| Pair | Both | Only the first | Only the second | Neither | Gap (answers) |
|--------------------|-----:|-----:|-----:|-----:|-----:|
| BKT 0.95 and streak 3 | 46.1 % | 22.5 % | 2.3 % | 29.1 % | −1.52 |
| EMA and streak 3 | 37.8 % | 10.2 % | 10.7 % | 41.3 % | −0.49 |
| BKT 0.95 and EMA | 46.4 % | 22.2 % | 1.6 % | 29.8 % | −0.98 |

Table: Agreement between the mastery methods on the 7,561 held-out ASSISTments practices, the EMA at θ = 0.6962, the
streak rule's cost on the training students. The gap is the first rule's declaring answer minus the second's, where
both declare; below zero, the first declares earlier (`npm run mastery -- --observations data/assistments.json`,
commit 3633cc1).

### What the evidence shows at one grain

On the real answers BKT predicts held-out students' first attempts better than the EMA, by 0.0225 in mean log-loss
per answer on the split that decides, with an interval of [−0.0264, −0.0183] that excludes zero and lies beyond the
0.005 fixed as the smallest difference that counts, so H1 holds by the pre-specified rule. The four other splits give
the same verdict with estimates between 0.021 and 0.025, and resampling whole classes, which widens the intervals by
about half, changes none of them. The difference is real and not negligible, but it is modest beside the spread
between models: the Elo model Zeno runs predicts better than BKT by 0.008, and PFA sits between BKT and the EMA. What
H1 shows is that BKT's extra machinery, a learnt state per skill with four fitted parameters, earns its keep in
prediction on these data, where the EMA's one parameter and its slow start, from 0.594 for every student and skill,
cannot tell students apart until several answers are in. A better prediction of the next answer does not by itself
make a method's mastery decisions better (section 1.3): on the real data there is no truth to judge the declarations
against, and the simulations below show where BKT's probability and its decisions part company.

The one-grain simulations give a clear pattern. Where learning happens as BKT assumes, all at once, BKT makes mastery
decisions more cheaply than the simpler rules. In the plain BKT world this is what Proposition 2 leads one to expect,
and the fitted model kept the precision the proposition promises for the true parameters. In the BKT world with
forgetting, which breaks one of BKT's assumptions, BKT still needed one to two answers fewer than EMA and the streak
rule for the same precision. A small chance of forgetting does not undo the advantage of a model whose picture of
learning is otherwise right.

Where learning is gradual, BKT fails H2 by the rule fixed in advance. In the elo and irt2pl worlds, where each question
raises a student's chance of a right answer a little, no BKT threshold up to 0.9999 made declarations that were right
nine times in ten, while EMA and the streak rule reached that standard by waiting longer. The trade-off curves show
why. BKT's model has two states, so it reads a run of right answers as evidence that the skill has been learnt, and
after a few such answers its probability is close to 1. A student whose true chance is well below 0.9 still gives
runs of right answers quite often, and BKT declares them masters. Raising BKT's threshold from 0.80 to 0.99 made it
wait only six answers longer and left most of its declarations wrong. EMA has no such crowding: its score approaches 1
only through a long run of right answers, so an ordinary threshold makes it wait as long as needed. In the gradual
worlds the EMA was also slightly cheaper than the streak rule for the same precision, which fits the recommendation of
@pelanek2017mastery.

The check above 0.9999 shows that BKT can nevertheless be made to wait, only not at any threshold that still reads as
a probability. With thresholds between $1 - 10^{-6.9}$ and $1 - 10^{-12.6}$, BKT met the standard in three of the four
gradual settings, and at the higher learning rate it then needed 0.3 to 0.4 answers fewer than EMA (Table 3.7). BKT's
probability still ranks the evidence usefully when learning is gradual; what breaks is its calibration against the
definition of mastery used here, which Table 3.8 measures directly: a $P(L)$ of 0.99 meant mastery in 15 to 55 % of
cases, against 70 to 94 % for EMA's top scores. The gradual worlds have no known state for BKT's probability to refer
to, so a probability near 1 says only that the answers look like those of a student who knows the skill, not that the
true chance of a right answer has reached 0.9. The "never" of Table 3.3 is therefore mostly a statement about the
range of thresholds, not about the model. This check came after the results, so it qualifies H2's verdict without
replacing it. What survives of BKT's failure is a practical point. In the gradual worlds the threshold BKT needs
ranges over eight orders of magnitude of closeness to 1, and at its usual 0.95 about one declaration in ten is right
(Table 3.5). A system using BKT where learning is gradual would have to set its threshold from data, with nothing in
BKT's own probability to guide it. The thresholds EMA needs stay between 0.84 and 0.97.

What the comparison at equal cost adds is a warning about how such comparisons are set up. At the streak rule's cost,
all three methods were right more than 92 % of the time in the BKT worlds and less than 10 % in the gradual ones, and
within each world they were nearly indistinguishable. A comparison at a fixed amount of practice, which is how the
question is often posed, can hide differences that appear only when each method is allowed to choose how long to
wait.

On ASSISTments the three rules agree more than they differ. BKT at 0.95 declares in 69 % of the held-out practices
and the two simple rules in 48 %; where a simple rule declares, BKT nearly always does too, one to one and a half
answers earlier, and it declares alone in a further 22 % of practices. The share right on the next three answers after
a declaration is 77 to 80 % for all three, against 67 % of all answers, and highest after the EMA, which declares
latest. Read with the caution of section 3.3, this says two things. On skill-builder practices, which end after three
right in a row and average under seven answers, BKT's extra declarations fall where the students then did about as
well as after the other rules' declarations, so nothing in these data marks them as wrong. And none of the three rules
is followed by the near-certain success that a declaration of mastery promises, which is what the gradual worlds and
the component worlds would predict for skill tags that are each really several things. Which rule is right cannot be
told from these data; what can be told is that BKT at its usual threshold is the most generous of the three.

## 3.2 Across grains

### Too coarse: a skill that is really several components (G1)

The world of components keeps everything of the BKT world except that each skill is $k$ components, each learnt all at
once, and the model treats the skill as one. Table 3.10 gives the sweep over $k$ at both learning rates, with the
components asked for one at a time and, below, several at a time. For BKT on the skill, the EMA and BKT on each
component it shows the precision at the threshold a deployed system would use without a truth to set it by (BKT at
0.95, the EMA at the streak rule's cost, BKT on each component at 0.95), the cheapest threshold whose declarations were
right at least 90 % of the time on the training learners, and the Brier score of the method's own score against the
truth after every answer; for the streak rule, its precision at $N = 3$.

| Components | Asked at once | Rate | BKT 0.95 right | BKT $\theta$ at 90 % | BKT Brier | EMA right | EMA $\theta$ at 90 % | EMA Brier | Streak 3 right | Per component 0.95 right | $\theta$ at 90 % | Brier |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 0.02 | 98.0 % | 0.86 | 0.039 | 97.1 % | 0.62 | 0.077 | 94.8 % | 98.0 % | 0.86 | 0.039 |
| 2 | 1 | 0.02 | 58.8 % | 0.9999 | 0.195 | 47.9 % | 0.78 | 0.167 | 46.1 % | 98.0 % | 0.86 | 0.068 |
| 4 | 1 | 0.02 | 23.3 % | never | 0.384 | 18.8 % | 0.93 | 0.245 | 17.7 % | 98.5 % | 0.86 | 0.062 |
| 8 | 1 | 0.02 | 7.7 % | never | 0.500 | 6.7 % | 0.89 | 0.289 | 5.8 % | – | 0.82 | 0.041 |
| 16 | 1 | 0.02 | 0.5 % | never | 0.546 | 0.5 % | never | 0.312 | 0.4 % | – | 0.72 | 0.004 |
| 1 | 1 | 0.1 | 98.4 % | 0.80 | 0.023 | 98.5 % | 0.55 | 0.064 | 99.8 % | 98.4 % | 0.80 | 0.023 |
| 2 | 1 | 0.1 | 71.3 % | 0.999 | 0.133 | 67.1 % | 0.76 | 0.118 | 68.7 % | 96.7 % | 0.84 | 0.082 |
| 4 | 1 | 0.1 | 28.3 % | never | 0.396 | 27.0 % | 0.88 | 0.232 | 26.6 % | 96.8 % | 0.86 | 0.132 |
| 8 | 1 | 0.1 | 5.0 % | never | 0.667 | 4.4 % | never | 0.329 | 4.4 % | 50.0 % | 0.89 | 0.063 |
| 16 | 1 | 0.1 | 3.4 % | never | 0.682 | 3.5 % | never | 0.324 | 3.1 % | – | 0.66 | 0.036 |
| 2 | 2 | 0.02 | 97.5 % | 0.83 | 0.054 | 92.1 % | 0.54 | 0.094 | 92.6 % | 97.6 % | 0.82 | 0.063 |
| 4 | 2 | 0.02 | 57.5 % | 0.9999 | 0.145 | 31.4 % | 0.76 | 0.145 | 29.5 % | 100.0 % | 0.68 | 0.085 |
| 4 | 4 | 0.02 | 93.8 % | 0.83 | 0.057 | 82.3 % | 0.54 | 0.090 | 79.8 % | 98.1 % | 0.79 | 0.119 |
| 8 | 2 | 0.02 | 17.9 % | never | 0.243 | 9.5 % | 0.90 | 0.192 | 8.6 % | 100.0 % | 0.65 | 0.058 |
| 8 | 4 | 0.02 | 49.7 % | never | 0.072 | 22.0 % | 0.75 | 0.103 | 16.4 % | – | 0.50 | 0.087 |
| 16 | 2 | 0.02 | 4.6 % | never | 0.208 | 3.3 % | 0.84 | 0.167 | 1.9 % | – | 0.61 | 0.013 |
| 16 | 4 | 0.02 | 5.1 % | never | 0.082 | 6.6 % | 0.81 | 0.087 | 0.9 % | – | never | 0.008 |
| 2 | 2 | 0.1 | 98.2 % | 0.77 | 0.035 | 99.0 % | 0.52 | 0.075 | 98.6 % | 98.3 % | 0.79 | 0.038 |
| 4 | 2 | 0.1 | 70.1 % | 0.997 | 0.135 | 57.9 % | 0.74 | 0.126 | 59.1 % | 99.4 % | 0.76 | 0.105 |
| 4 | 4 | 0.1 | 98.2 % | 0.78 | 0.043 | 97.9 % | 0.50 | 0.087 | 98.2 % | 98.1 % | 0.85 | 0.071 |
| 8 | 2 | 0.1 | 22.9 % | never | 0.410 | 15.6 % | 0.94 | 0.228 | 16.7 % | 98.8 % | 0.84 | 0.134 |
| 8 | 4 | 0.1 | 71.6 % | 0.998 | 0.139 | 57.5 % | 0.81 | 0.122 | 57.6 % | 99.1 % | 0.77 | 0.168 |
| 16 | 2 | 0.1 | 2.9 % | never | 0.401 | 2.2 % | 0.97 | 0.216 | 2.2 % | – | 0.72 | 0.030 |
| 16 | 4 | 0.1 | 24.2 % | never | 0.259 | 11.8 % | 0.87 | 0.156 | 8.4 % | – | 0.79 | 0.124 |

Table: G1, the world of components: a skill of $k$ components modelled as one, with the components asked for one at a
time (top) and several at a time (bottom), 400 learners, 12 skills, 30 questions. For each method the precision of its
declarations at the usual threshold on the held-out learners, the cheapest threshold right 90 % of the time on the
training learners ("never": none up to 0.9999), and the Brier score of its score against the truth. A dash: BKT on
each component at 0.95 declared mastery for no held-out learner within 30 answers; with eight components asked one at
a time at the higher rate it declared for 0.2 % of them, and asked two at a time at the lower rate for 0.3 % (`npm run
atoms -- --atoms 1,2,4,8,16 --per-question 1,2,4`, commit 9180a75).

Asked one component at a time, BKT on the skill at its usual threshold loses its precision as the components multiply:
right 98 % of the time with one component, where the world is BKT's own, 59 to 71 % with two, 23 to 28 % with four, 5
to 8 % with eight and under 4 % with sixteen. The cheapest threshold that meets the 90 % standard moves the same way,
from 0.80 to 0.86 with one component to 0.999 and 0.9999 with two, and from four components on no threshold up to
0.9999 meets it. Its Brier score rises from 0.02 and 0.04 to 0.55 and 0.68. This is the pattern of the gradual worlds of
H2, in a world built from BKT's own assumptions at a finer grain than the model's. BKT on each component, the model at
the learners' grain, keeps its precision at 0.95 wherever it declares, 97 to 100 %, and meets the standard at an
ordinary threshold, 0.72 to 0.89; but as $k$ grows it declares for fewer learners within the 30 answers, for half of
them with two components, a sixth to a half with four, and almost none with eight or sixteen, since each component is
then asked about fewer than four times. That shortage is the subject of G3.

The EMA and the streak rule do not escape. At their usual thresholds their precision falls as far as BKT's, the EMA
from 97 to 99 % with one component to 1 to 4 % with sixteen, and the streak rule the same, because a run of right
answers on a skill of many components is no evidence that every component is known. What they keep is a threshold that
works: the EMA meets the 90 % standard with up to eight components at the lower rate and four at the higher, at
thresholds of 0.76 to 0.94, by declaring late, where BKT on the skill has none from four components on; and the EMA's
Brier score stays between 0.17 and 0.33 where BKT's reaches 0.68. G1 hypothesised that the simpler rules lose less, and
this holds for the Brier score and for whether any threshold meets the standard, not for precision at the usual
threshold.

Asked several at a time, the picture depends not on $k$ but on how much of the skill each question leaves untested.
When every question asks for every component, two of two or four of four, the skill is one unit again to every
method: BKT on the skill at 0.95 is right 94 to 98 % of the time and meets the standard at 0.77 to 0.83, and the EMA
and the streak rule are right 80 to 99 %. When a question asks for half the components, two of four or four of eight,
BKT on the skill is halfway, right 50 to 72 % of the time; a quarter, two of eight or four of sixteen, 5 to 24 %.

Table 3.11 gives the same measures in the world of ideas, where the components are the ideas of fractions and its
arithmetic and the questions are Zeno's own: three ideas on times, every question needing all three; six on hcf, about
four a question; and sixteen on fractions, about six a question. The last column adds, for BKT on each idea carried from
the earlier skills, whether the missing idea is found: at every moment a held-out learner was exactly one idea short of
mastery, the share at which that idea had the lowest probability, against one in three, one in six and one in sixteen
by chance.

| Skill | Ideas (a question) | Rate | BKT 0.95 right | BKT $\theta$ at 90 % | BKT Brier | EMA right | EMA $\theta$ at 90 % | EMA Brier | Per idea, carried, 0.95 right | $\theta$ at 90 % | Brier | Missing idea found, afresh / carried |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| times | 3 (3.0) | 0.02 | 94.3 % | 0.82 | 0.062 | 86.0 % | 0.53 | 0.099 | 100.0 % | 0.64 | 0.102 | 0.0 % / 1.5 % |
| hcf | 6 (3.9) | 0.02 | 54.8 % | never | 0.228 | 50.0 % | 0.86 | 0.135 | 100.0 % | 0.57 | 0.105 | 5.6 % / 62.3 % |
| fractions | 16 (6.1) | 0.02 | 30.0 % | never | 0.115 | 11.4 % | 0.94 | 0.128 | – | never | 0.084 | 4.7 % / 7.8 % |
| times | 3 (3.0) | 0.1 | 94.6 % | 0.89 | 0.043 | 94.6 % | 0.50 | 0.093 | 94.6 % | 0.85 | 0.053 | 0.0 % / 3.7 % |
| hcf | 6 (3.9) | 0.1 | 77.0 % | 0.999 | 0.148 | 78.4 % | 0.72 | 0.118 | 98.5 % | 0.77 | 0.076 | 11.1 % / 80.3 % |
| fractions | 16 (6.1) | 0.1 | 16.4 % | never | 0.470 | 12.3 % | 0.99 | 0.274 | – | 0.76 | 0.152 | 44.1 % / 51.4 % |

Table: G1 in the world of ideas: the three skills of three, six and sixteen ideas modelled as one, asked by Zeno's
generators, 400 learners, 30 questions per skill, the measures as in Table 3.10, and the missing idea found by BKT on
each idea started afresh in every skill and carried from the earlier skills, against 33.3 %, 16.7 % and 6.3 % by chance
(`npm run ideas`, commit 9180a75).

The three skills line up with the sweep. On times, whose every question needs all three ideas, the skill is one unit:
BKT on the skill at 0.95 is right 94 % of the time and meets the standard at 0.82 and 0.89, and BKT on each idea gains
nothing, costing 0.1 to 1.0 answers more at the standard. On hcf, four of six ideas a question, BKT on the skill is
right 55 and 77 % of the time at 0.95 and meets the standard at no threshold at the lower rate and at 0.999 at the
higher. On fractions, six of sixteen ideas a question, it is right 30 and 16 % of the time, meets the standard at no
threshold and at the higher rate has the worst Brier score of every method, 0.470 against the EMA's 0.274. BKT on each
idea carried from times and hcf is right 98 to 100 % of the time wherever it declares and has the lowest Brier score on
hcf; on fractions it declares for nobody at 0.95 within 30 questions, and at the lower rate meets the standard at no
threshold, as the eight-component rows of Table 3.10 lead one to expect. The last column already shows G2's condition:
on hcf, whose questions need different ideas at different levels and whose arithmetic was settled in times, carried BKT
on each idea names the missing idea 62 and 80 % of the time, where started afresh in hcf it is below chance, because
the three arithmetic ideas that every hcf question needs can only tie; on fractions at the higher rate it names it 51 %
of the time against 6 % by chance, and at the lower rate, where only 128 held-out moments had a learner one idea short,
it is at chance.

### The right grain, and the condition on the questions (G2)

G2 holds that BKT on each component restores the standard and names the missing component if and only if the questions
tell the components apart, and it was swept on fractions, the skill where the generated questions tell them apart
least. Table 3.12 varies the share of questions that ask for one idea alone, from the generator's own two in five with
no replacement to every question, against the length of the practice, 30, 60 and 120 questions, at both learning
rates. For each setting it gives the ideas a question needs on average, the share of held-out learners who knew every
idea after the last answer, BKT on each idea carried from the earlier skills at its cheapest threshold meeting the
standard (threshold, answers, precision and share declared), and the missing idea found by each form of BKT on each
idea. BKT on the skill and the EMA are described in the text.

| Alone | $n$ | Rate | Ideas a question | Know all at the end | Carried $\theta$ | Answers | Right | Declared | Found afresh | blamed | carried |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 % | 30 | 0.02 | 6.1 | 12.2 % | never | – | – | – | 4.7 % | 7.8 % | 7.8 % |
| 0 % | 60 | 0.02 | 6.1 | 14.9 % | 0.50 | 59.9 | 100 % | 1.4 % | 0.2 % | 8.1 % | 13.5 % |
| 0 % | 120 | 0.02 | 6.2 | 35.1 % | 0.58 | 108.2 | 84.6 % | 35.1 % | 56.4 % | 62.0 % | 66.3 % |
| 25 % | 30 | 0.02 | 4.8 | 4.1 % | never | – | – | – | 26.0 % | 26.0 % | 35.0 % |
| 25 % | 60 | 0.02 | 4.9 | 10.8 % | 0.50 | 60.0 | 100 % | 1.4 % | 35.6 % | 37.3 % | 38.2 % |
| 25 % | 120 | 0.02 | 4.9 | 24.3 % | 0.60 | 112.9 | 77.8 % | 24.3 % | 62.7 % | 61.0 % | 69.8 % |
| 50 % | 30 | 0.02 | 3.6 | 5.4 % | never | – | – | – | 17.6 % | 17.6 % | 47.1 % |
| 50 % | 60 | 0.02 | 3.5 | 5.4 % | 0.50 | 60.0 | – | 0.0 % | 47.7 % | 57.5 % | 56.5 % |
| 50 % | 120 | 0.02 | 3.6 | 16.2 % | 0.70 | 117.4 | 100 % | 12.2 % | 80.2 % | 78.9 % | 76.0 % |
| 100 % | 30 | 0.02 | 1.0 | 0.0 % | never | – | – | – | 46.7 % | 46.7 % | 46.7 % |
| 100 % | 60 | 0.02 | 1.0 | 4.1 % | 0.50 | 59.5 | 100 % | 2.7 % | 52.4 % | 52.4 % | 52.4 % |
| 100 % | 120 | 0.02 | 1.0 | 0.0 % | 0.69 | 120.0 | – | 0.0 % | 20.2 % | 20.2 % | 22.5 % |
| 0 % | 30 | 0.1 | 6.1 | 36.5 % | 0.76 | 29.8 | 83.3 % | 8.1 % | 44.1 % | 49.4 % | 51.4 % |
| 0 % | 60 | 0.1 | 6.1 | 73.0 % | 0.80 | 54.0 | 85.2 % | 36.5 % | 53.6 % | 54.7 % | 57.3 % |
| 0 % | 120 | 0.1 | 6.2 | 89.2 % | 0.75 | 73.0 | 92.2 % | 86.5 % | 67.7 % | 66.2 % | 68.8 % |
| 25 % | 30 | 0.1 | 4.9 | 29.7 % | 0.80 | 29.9 | 100 % | 2.7 % | 30.9 % | 26.8 % | 35.2 % |
| 25 % | 60 | 0.1 | 4.9 | 68.9 % | 0.79 | 51.7 | 97.4 % | 51.4 % | 47.3 % | 49.6 % | 57.3 % |
| 25 % | 120 | 0.1 | 4.9 | 93.2 % | 0.76 | 75.3 | 90.6 % | 86.5 % | 65.1 % | 67.9 % | 70.8 % |
| 50 % | 30 | 0.1 | 3.6 | 14.9 % | 0.71 | 30.0 | 0.0 % | 1.4 % | 40.7 % | 33.6 % | 37.7 % |
| 50 % | 60 | 0.1 | 3.5 | 60.8 % | 0.80 | 57.1 | 94.7 % | 25.7 % | 44.0 % | 43.6 % | 50.4 % |
| 50 % | 120 | 0.1 | 3.6 | 87.8 % | 0.77 | 76.1 | 82.5 % | 85.1 % | 62.3 % | 61.9 % | 65.4 % |
| 100 % | 30 | 0.1 | 1.0 | 1.4 % | 0.61 | 30.0 | – | 0.0 % | 19.2 % | 19.2 % | 22.4 % |
| 100 % | 60 | 0.1 | 1.0 | 10.8 % | 0.78 | 60.0 | 100 % | 1.4 % | 50.5 % | 50.5 % | 50.5 % |
| 100 % | 120 | 0.1 | 1.0 | 47.3 % | 0.88 | 113.3 | 90.5 % | 28.4 % | 68.1 % | 68.1 % | 68.2 % |

Table: G2 on fractions (sixteen ideas): the share of generated questions replaced by a question on one idea alone
("Alone"; 0 % is the generator as it is, with two forms in five), against the length of the practice $n$, 400
learners. "Know all at the end" is the share of held-out learners knowing every idea after the last answer. Carried
BKT on each idea is at the cheapest threshold right 90 % of the time on the training learners ("never": none up to
0.9999; a dash under "Right": declared for nobody held out). The missing idea found is for BKT on each idea started
afresh, with a recognised mistake's blame on its idea, and carried from the earlier skills, against 6.3 % by chance
(`npm run ideas -- --skills fractions --isolate 0,0.25,0.5,1 --length 30,60,120`, commit 9180a75).

BKT on the skill meets the standard at no setting of the sweep, and at 0.95 it is right between 0 and 30 % of the time.
The EMA meets the standard in 20 of the 24 settings, at thresholds of 0.87 to 0.9993, but within 60 questions only by
declaring mastery for at most 5 % of learners, and at 120 questions for 47 to 60 % of them only where a quarter or half
of the questions ask for one idea alone, at 103 to 105 answers; the streak rule does the same. The sweep then shows two
things about the finer grain.

The first is that the length of the practice does more than the share of isolating questions. With the generator as it
is, the missing idea is found 8 % of the time after 30 answers at the lower rate, at chance, 14 % after 60 and 66 %
after 120; at the higher rate 51, 57 and 69 %. The 30 questions of Zeno's class study are too few for sixteen ideas,
as they were for eight components in Table 3.10, and the same questions suffice when there are enough of them. At 120
questions and the higher rate, carried BKT on each idea is the only rule that declares fractions mastered in time: it
needs 73.0 answers, is right 92 % of the time and declares for 87 % of learners, where the EMA and the streak rule at
their cheapest threshold meeting the standard declare for nobody within 120 answers. At the lower rate it needs 108.2
answers and declares for 35 %, every learner who knew every idea, though held out its precision is 85 %.

The second is what the isolating questions do. Replacing a quarter of the generated questions with questions on one
idea alone lifts the share found to 70 and 71 % at 120 answers, at both rates, and at the higher rate leaves learning as
it was: 93 % of learners know every idea at the end, against 89 % with the generator as it is, since the operations
still teach several ideas at once. Replacing half lifts it to 65 and 76 % but teaches less, 88 % knowing every idea at
the higher rate and 16 % at the lower. Replacing every question teaches one idea at a time, so after 120 answers at the
higher rate only 47 % of learners know every idea, hardly any at the lower rate, and the share found is unstable
between settings, from 20 to 68 %, because few learners ever come within one idea of mastery. A quarter of the questions
alone also gives the EMA and the streak rule enough separate evidence to declare within 120 answers, at 105 answers
against carried BKT on each idea's 75. Carrying saves 0.8 to 3.9 answers at 120 questions and nothing at 30, where
nothing is declared; the blame of a recognised mistake adds between nothing and six points to the share found. The
condition G2 states is met on fractions by a quarter of the questions asking for one idea alone and a practice long
enough for the ideas to be asked about; it is not met by the generator as it is within 30 questions.

### Too fine: finer than the learners, or than the practice supports (G3)

The first way of being too fine models a component that is learnt as one thing as several. Table 3.13 keeps the
learners of the two-component world as they are, with their answers and truth unchanged, and models each component as
one, two or four parts, each question tagged with one of its component's parts at random. BKT on the skill, the EMA and
the streak rule see the same answers at every split and are unchanged; only BKT on each part moves.

| Split | Rate | $\theta$ at 90 % | Answers [95 % interval] | Right | Declared | At 0.95: answers | declared | Brier | Fits at the bound | at the edge | Minus BKT on the skill |
|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 0.02 | 0.86 | 19.88 [18.75, 21.14] | 92.0 % | 55.2 % | 21.5 | 50.7 % | 0.068 | 0 % | 0 % | −3.01 [−3.39, −2.61] |
| 2 | 0.02 | 0.56 | 21.29 [20.21, 22.44] | 93.5 % | 49.9 % | 26.2 | 38.0 % | 0.132 | 0 % | 0 % | −1.60 [−1.98, −1.22] |
| 4 | 0.02 | 0.56 | 26.33 [25.77, 26.93] | 97.6 % | 32.8 % | 29.9 | 3.8 % | 0.301 | 3.1 % | 3.1 % | 3.44 [2.93, 3.94] |
| 1 | 0.1 | 0.84 | 11.05 [10.45, 11.64] | 89.9 % | 97.2 % | 13.6 | 94.5 % | 0.082 | 0 % | 50 % | −2.70 [−3.00, −2.43] |
| 2 | 0.1 | 0.66 | 14.46 [13.94, 14.95] | 94.8 % | 93.7 % | 22.5 | 74.9 % | 0.149 | 29.2 % | 100 % | 0.71 [0.39, 1.05] |
| 4 | 0.1 | 0.66 | 21.02 [20.34, 21.70] | 93.0 % | 67.8 % | 29.7 | 7.1 % | 0.384 | 80.2 % | 100 % | 7.27 [6.72, 7.84] |

Table: G3, over-splitting: a skill of two components, each learnt as one thing, modelled as one, two or four parts per
component, 400 learners, 12 skills, 30 questions; the learners and their answers are the same at every split. BKT on
each part at the cheapest threshold right 90 % of the time on the training learners and at the usual 0.95, its Brier
score, the share of its fitted parameter sets (24, 48 and 96 at the three splits) with guess or slip at the bound of
0.3 and with any parameter at the grid's edge, and its cost minus that of BKT on the skill at the standard (22.89 and 13.75 answers at the two rates,
at thresholds of 0.9999 and 0.999), with intervals over students (`npm run atoms -- --atoms 2 --split 1,2,4`, commit
66ee9af).

Splitting a component in two costs 1.4 and 3.4 answers at the standard and leaves precision where it was; splitting it
in four costs 6.5 and 10.0 answers, declaring for a third and two thirds of learners where the right grain declared for
half and nearly all. At the usual threshold of 0.95 the loss is larger: declared for 51 % and 95 % of learners at the
right grain, for 38 and 75 % split in two, and for 4 and 7 % split in four, since every part has to reach 0.95 on a
quarter of the evidence. The Brier score doubles with each split, from 0.07 and 0.08 to 0.30 and 0.38, so that split in
four the finer model is worse calibrated than BKT on the skill, which the right grain beat by a wide margin. The fits
degenerate as the evidence per part thins: at the higher rate none of the 24 parameter sets at the right grain has
guess or slip at the bound, 29 % of 48 do split in two and 80 % of 96 split in four. At the standard the finer model
is still cheaper than BKT on the skill when split in two at the lower rate, by 1.6 answers, because BKT on the skill
there needs a threshold of 0.9999; split in four it is dearer than BKT on the skill at both rates, by 3.4 and 7.3
answers. The threshold chosen on the training learners transferred to the held-out learners at every split in this
table, within one step of the grid; what did not transfer is the cost.

The second way of being too fine is more components than the practice can support, and Table 3.10 already showed it at
30 questions: with eight or sixteen components asked one at a time, BKT on each component at 0.95 declares for almost
nobody, and its cheapest threshold meeting the standard, 0.66 to 0.89, is met by declaring for 0 to 2 % of learners.
Table 3.14 repeats the sweep over $k$ with 120 questions per skill, so that each component is asked about four times as
often.

| Components | Rate | Know all at the end | BKT 0.95 right | EMA $\theta$ at 90 % | EMA answers | EMA declared | Per component $\theta$ at 90 % | Answers | Right | Declared | At 0.95 declared | Brier | Fits at the edge |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4 | 0.02 | 61.3 % | 15.6 % | 0.86 | 94.5 | 52.4 % | 0.89 | 86.2 | 91.9 % | 58.6 % | 55.3 % | 0.050 | 0 % |
| 8 | 0.02 | 16.4 % | 5.8 % | 0.95 | 118.0 | 6.5 % | 0.80 | 112.7 | 92.0 % | 14.1 % | 11.6 % | 0.032 | 0 % |
| 16 | 0.02 | 2.9 % | 1.9 % | 0.99 | 120.0 | 0.0 % | 0.80 | 119.5 | 86.7 % | 1.7 % | 0.5 % | 0.016 | 0.5 % |
| 4 | 0.1 | 100.0 % | 34.9 % | 0.77 | 37.0 | 100.0 % | 0.87 | 30.3 | 92.0 % | 99.9 % | 99.9 % | 0.049 | 66.7 % |
| 8 | 0.1 | 90.7 % | 4.8 % | 0.91 | 96.7 | 65.9 % | 0.86 | 76.5 | 90.8 % | 85.8 % | 81.1 % | 0.088 | 57.3 % |
| 16 | 0.1 | 30.5 % | 0.8 % | 0.992 | 120.0 | 0.0 % | 0.89 | 117.4 | 89.2 % | 11.5 % | 8.0 % | 0.053 | 52.1 % |

Table: G3, components against practice length: the world of components with 120 questions per skill in place of 30,
one component asked at a time, 400 learners, 12 skills. The share of held-out learners knowing every component at the
end, BKT on the skill at 0.95, the EMA at its cheapest threshold right 90 % of the time on the training learners
(threshold, answers, share declared), BKT on each component at its cheapest such threshold (threshold, answers,
precision, share declared) and at the usual 0.95 (share declared), its Brier score, and the share of its fitted
parameter sets with any parameter at the grid's edge; none had guess or slip at the bound. With one or two components
120 questions change only the cost (`npm run atoms -- --atoms 1,2,4,8,16 --length 120`, commit 66ee9af).

With four times the practice the finer grain has the evidence it lacked. With four components at the higher rate BKT
on each component declares for every learner at the standard, after 30.3 answers, where the EMA needs 37.0 and the
streak rule 43.7; at 30 questions it had declared for 57 %. With eight it declares for 86 % after 76.5 answers, against
the EMA's 66 % after 96.7, where at 30 questions it had declared for 2 %; at 0.95 it declares for 81 %, right 96 % of
the time, where at 30 questions it had declared for 0.2 %. Sixteen components are still too many for 120 questions:
only 31 % of learners know every component by the end at the higher rate and 3 % at the lower, so BKT on each component
declares for 12 % and 2 % and its training threshold reaches 89 % and 87 % held out, a little under the standard, while
the EMA and the streak rule declare for nobody. BKT on the skill, meanwhile, is no better for the longer practice: at
0.95 it is right 35 %, 5 % and 1 % of the time with four, eight and sixteen components at the higher rate, and meets
the standard at no threshold, since more answers on a skill that is not one thing are more of the same evidence.

The second part of G3's hypothesis, that the per-component fits degenerate as the evidence per component thins, did
not hold in the form stated. Asked one component at a time, none of the per-component fits had guess or slip at the
bound at either length, and the share at the grid's edge, half to two thirds at the higher rate, is the starting
probability at the top of its grid where nearly every learner knows the component by the end of a long practice, not
a sign of thin evidence. What thin evidence did was leave the model unable to declare, and, at sixteen components, let
the threshold chosen on the training learners fall a few points short of the standard held out. The fits degenerated
only where the model was finer than the learners, in Table 3.13, where parts of one component were asked to explain
answers that belonged to the whole: four in five of them at the bound when split in four. A system could therefore
read over-splitting from its own fits, but not a shortage of practice, which shows itself instead in declarations that
never come.

### Real data across grains (G4)

Table 3.15 gives G4 on the real answers. At the data set's own grain BKT predicts the held-out answers with a
log-loss of 0.5690, at the topic grain 0.5962 and with one skill for everything 0.6037; the EMA goes the other way,
0.5915, 0.5854 and 0.5847. The test compares BKT at the skill grain with BKT at one skill: the difference is −0.0346 per
answer with an interval of [−0.0392, −0.0302] from 10,000 resamples of students, which excludes zero and lies beyond
the smallest difference that counts, so by the rule fixed in advance the finer grain predicts better and G4 holds. The
other two BKT pairs point the same way, skill against topic by −0.0272 [−0.0316, −0.0230] and topic against one by
−0.0075 [−0.0097, −0.0053]. For the EMA the coarser grain predicts better, skill against one by +0.0068 [+0.0024,
+0.0110] and skill against topic by +0.0061 [+0.0025, +0.0097], while topic against one, +0.0007 [−0.0013, +0.0026],
is no practical difference. What coarsening from 110 skills to one costs BKT, minus what it costs the EMA, is 0.0414
per answer with an interval of [0.0366, 0.0463], so on the real data as on the simulated class the EMA loses less from
coarsening; here it gains a little. At the skill grain 63.6 % of BKT's 110 fits have guess or slip at the bound and
80.0 % have a parameter at an edge of the grid; at the two coarser grains every fit does. The EMA's fitted $\alpha$
falls from 0.15 to 0.1 to 0.05 as the grain coarsens and the practices lengthen.

The declarations move with the grain much as they did on the simulated class. BKT at 0.95 declares for 68.6 % of
practices at the skill grain after 3.3 answers on average, for 64.2 % at the topic grain after 6.1 and for 72.0 % at
the coarsest grain after 8.9, where a practice is a student's whole history in the data set; the share right on the
next three answers after its declaration falls from 78.6 % to 73.4 % to 73.2 %. The EMA at the threshold set at each
grain (0.6962, 0.6103 and 0.5747) declares for 48.0 %, 66.4 % and 83.8 % of practices after 4.0, 5.8 and 5.9 answers,
and the streak rule for 48.5 %, 67.7 % and 80.0 % after 4.1, 5.8 and 6.7, with the share right after a declaration
falling from 80.4 % and 77.2 % to 72.4 % and 72.2 %. At the coarsest grain every rule is followed by a share right
within six points of the data set's overall 66.6 %, so a declaration there says little about the next answers.

| Grain | Skills | BKT log-loss | EMA log-loss | BKT fits at bound / edge | EMA $\alpha$ | BKT, finer against this grain's coarser neighbour | EMA, the same |
|-----|-----|-------|-------|------------|-----|----------------------|--------------------|
| skill | 110 | 0.5690 | 0.5915 | 63.6 % / 80.0 % of 110 | 0.15 | skill against one: −0.0346 [−0.0392, −0.0302], finer better | +0.0068 [+0.0024, +0.0110], coarser better |
| topic | 5 | 0.5962 | 0.5854 | 100 % / 100 % of 5 | 0.1 | skill against topic: −0.0272 [−0.0316, −0.0230], finer better | +0.0061 [+0.0025, +0.0097], coarser better |
| one | 1 | 0.6037 | 0.5847 | 100 % / 100 % of 1 | 0.05 | topic against one: −0.0075 [−0.0097, −0.0053], finer better | +0.0007 [−0.0013, +0.0026], no practical difference |

Table: G4 on ASSISTments: BKT and the EMA fitted on 3,310 training students (207,947 answers) and judged on the same 853
held-out students (51,452 answers at every grain) at three grains; the paired differences between grains with intervals
from 10,000 resamples of students (below zero, the finer grain predicts better) and the verdict by H1's rule. The test
is BKT at the skill grain against one skill (`npm run grain -- --observations data/assistments.json`, commit 3633cc1).

As a check of the method, Table 3.16 runs the same analysis on the one-grain simulation's
students, whose 38 skills fall into five areas, so that the three grains are 38, 5 and 1 skills. Simulated answers name
no problem, so nothing falls together at a coarser grain and every grain has every answer.

| Grain | Skills | BKT log-loss | EMA log-loss | BKT fits at bound / edge | EMA $\alpha$ | BKT, finer against this grain's coarser neighbour | EMA, the same |
|-----|-----|-------|-------|------------|-----|----------------------|--------------------|
| skill | 38 | 0.6412 | 0.6497 | 86.8 % / 94.7 % of 38 | 0.20 | skill against one: −0.0221 [−0.0470, +0.0044], inconclusive | +0.0081 [−0.0074, +0.0269], inconclusive |
| topic | 5 | 0.6580 | 0.6469 | 100 % / 100 % of 5 | 0.05 | skill against topic: −0.0168 [−0.0357, +0.0038], inconclusive | +0.0027 [−0.0079, +0.0137], inconclusive |
| one | 1 | 0.6634 | 0.6415 | 100 % / 100 % of 1 | 0.02 | topic against one: −0.0053 [−0.0139, +0.0028], inconclusive | +0.0054 [−0.0032, +0.0163], inconclusive |

Table: G4's analysis on the simulated class of the one-grain worlds (the elo world's settings, 400 students, 2,700
held-out answers), as a check of the method: log-loss at three grains, the paired differences between grains with
intervals from 10,000 resamples of students (below zero, the finer grain predicts better), and the verdict by H1's
rule (`npm run grain -- --simulate`, commit 66ee9af).

On the simulated class BKT predicts better at the finer grain, by 0.022 in log-loss per answer from one skill to 38,
but with 80 held-out students the interval reaches past zero and every verdict is inconclusive; the EMA predicts a
little better at the coarser grain. What coarsening from 38 skills to one costs BKT, minus what it costs the EMA, is
0.030 per answer with an interval of [0.019, 0.042], so on this class the EMA loses less from coarsening, as G4's
exploratory part expects. At the finest grain 87 % of BKT's 38 fits have guess or slip at the bound, and at the two
coarser grains every fit does. The declarations move with the grain as they must: BKT at 0.95 declares for 23 % of
practices at the skill grain after 3.7 answers, for 48 % at the topic grain after 21.9, and for 61 % at the coarsest
grain after 76.3 answers, the practice then being a student's whole history; the share right on the next three
answers after a declaration falls from 72 % to 61 % to 52 %, while the EMA's stays at about 60 % at every grain.

### What the evidence shows across grains

The granularity studies begin by explaining the one-grain result. The gradual worlds made learning continuous by
construction, and one may ask whether they were rigged against a model that assumes a jump. The world of components
answers that they were not: a skill made of several components, each learnt in exactly the jump BKT assumes, looks to
BKT on the skill exactly as the gradual worlds did. With two components BKT at 0.95 was right 59 to 71 % of the time and
needed a threshold of 0.999 or 0.9999 to meet the standard; with four or more it met it at no threshold up to 0.9999,
and its Brier score climbed towards that of the gradual worlds (Table 3.10). The mechanism is the one Proposition 2
points at. A skill of $k$ components is a mixture of $2^k$ states, not two, and the chance of a right answer on it
rises in steps as the components are learnt, so from outside it looks like gradual learning; a model with one known
state has nothing in the world to refer to, and its probability stops meaning what it says. This is the reading
@koedinger2012kli give of a knowledge component applied to the model's failure: the grain at which the assumption
holds is finer than the grain at which the model is applied. The three skills of the world of ideas line up with the
sweep by the share of their ideas a question needs, times whole, hcf two thirds and fractions a third (Table 3.11), and
the sweep over questions that ask for several components at once confirms that this share, not $k$, is what matters:
when every question needs every component the skill is one unit again to every method, and when a question needs half
the components BKT on the skill is right about half the time.

The part of G1 that did not hold is instructive. The EMA and the streak rule were hypothesised to lose less from a
coarse grain because they assume nothing about what a skill is, and in precision at their usual thresholds they lost
exactly as much: a run of three right answers on a skill of eight components is no evidence that all eight are known,
whatever rule reads it. Nothing that reads a sequence of answers can know whether the sequence is on one thing. What
the simpler rules kept was a threshold that could be found, up to eight components where BKT on the skill had none from
four, and a probability that was less wrong, with a Brier score a third of BKT's at sixteen components. So the first
answer to the research question is that a coarse grain hurts the accuracy of every method and the reliability of BKT
most: its probability becomes the least calibrated score and the threshold it needs moves out of the range in which a
probability can be read.

Modelling at the learners' grain restores what the coarse grain lost, under a condition that G2 states and the sweeps
measure. BKT on each component was right 97 to 100 % of the time at 0.95 wherever it declared and met the standard at
thresholds between 0.66 and 0.89 at every $k$ (Table 3.10); on hcf, carried from the arithmetic settled in times, it had
the best Brier score, decided sooner than the EMA and named the missing idea 62 and 80 % of the time (Table 3.11). The
condition is that the questions tell the components apart. On fractions as Zeno generates them, where an operation
needs seven to ten ideas and the forms need two, started afresh it was at chance at the lower rate, and no form of it
declared mastery within 30 questions. The reason is in the model's own arithmetic. A conjunctive model that is nearly
sure not every idea is known puts a right answer down to guessing and a wrong one to whichever idea is missing, so a
question that needs eight ideas moves none of them much, and the estimate drifts with the learning step instead
[@xu2012subskills]. This is the identifiability problem of student modelling [@beck2007identifiability] at the level of
the components: the finer the grain, the more the questions must differ in what they ask for, which is what a complete
Q-matrix provides [@tatsuoka1983rulespace] and what learning factors analysis checks a decomposition for [@cen2006lfa].

The sweep says how the condition can be met and what it costs. Length does most of the work: the same generated
questions that left the model at chance after 30 answers let it name the missing idea two times in three after 120 and
made carried BKT on each idea the only rule that declared fractions mastered in time, at 73 answers where the EMA and
the streak rule declared for nobody (Table 3.12). Isolating questions help at the margin and have a price. A quarter of
the questions asking for one idea alone raised the share found to about 70 % and left learning as it was, because the
remaining operations still teach several ideas at once; half taught less; and every question alone taught one idea at a
time, so that few learners ever came within one idea of mastery and the measure itself became unstable. This is the
trade-off a generator faces between questions that diagnose and questions that teach, and the sweep puts it at about
one isolating question in four. Carrying what earlier skills settled saved up to four answers where the skill was
declared at all, and a recognised mistake's blame added a few points to the diagnosis; neither replaces evidence that
the questions do not provide. The second answer to the research question is therefore conditional: the fine grain is
the accurate and reliable one, with an ordinary threshold and a calibrated probability, if and only if the questions
identify the components and the practice is long enough for each to be asked about, and on Zeno's fractions within a
session of 30 questions that condition is not met.

Going finer than the learners costs answers for no gain, in both of the ways G3 distinguished. Modelling a component
that is learnt as one thing as two or four parts left precision where it was and doubled the Brier score with each
split, since each part sees a share of the evidence for the same thing and the product of the parts' probabilities
understates what the learner knows; split in four, the finer model was worse calibrated and dearer than BKT on the
skill, which the right grain had beaten by a wide margin (Table 3.13). The fits degenerated as the evidence per part
thinned, from none at the bound to 80 % of them, which is the warning sign a system could read from its own fits
without a truth. Too many components for the practice is the same shortage seen from the other side: at 30 questions
BKT on eight or sixteen components declared for almost nobody, because each component was asked about fewer than four
times, and at 120 questions eight components had the evidence they needed while sixteen still did not (Table 3.14).
Here the hypothesis was half wrong: the fits did not degenerate as the evidence thinned, as they did when a component
was over-split, so a system cannot read a shortage of practice from its parameters; it shows itself only in
declarations that never come. The right grain is therefore not a property of the model alone but of the model and the
practice together, through the evidence per component $n / k$, and a system that decomposes its skills has to lengthen
its practice, or ask for several components at once, to pay for it.

On ASSISTments BKT at the data set's grain predicts better than at the topic grain and than one skill, by 0.0346 per
answer from 110 skills to one with an interval of [−0.0392, −0.0302], so G4 holds by the pre-specified rule, and each
step of coarsening costs. The EMA moves the other way: it predicts slightly better at the coarser grains, by 0.0068
from skills to one, because it carries no skill parameters to lose and gains a longer sequence to average over, so
what coarsening costs BKT minus what it costs the EMA is 0.041 per answer, with an interval that excludes zero. The
declarations move with the grain as well, BKT needing 3.3 answers at the skill grain, 6.1 at the topic grain and 8.9
at the coarsest, while the share right after its declaration falls from 79 % to 73 %; at the skill grain 64 % of BKT's
fits have guess or slip at the bound and 80 % a parameter at an edge of the grid, and at the coarser grains every fit
does. The simulated class, run as a check of the method before the data were in, showed the same shape with less data
to show it on: there the finer grain predicted better for BKT, by 0.022 in log-loss per answer from one skill to 38, but with 80 held-out students the
interval reached past zero and the verdict was inconclusive, while the EMA was indifferent to the grain and lost less
from coarsening than BKT did, with an interval that excluded zero (Table 3.16). That is the pattern the simulations lead one to expect, and the real data confirm it: a model with a known state
gains from a grain at which there is one, and loses more when there is not; a rule that assumes nothing about the
skill gains and loses less. @pardos2007granularity and @feng2009grainsize found the finer ASSISTments skill models
better at predicting a test score; G4 finds them better at predicting the next answer too, at the grain of the data
set's own tags. Whether a grain finer than the tags would be better still, the data cannot say, since they carry no
finer tags; the fits at the bound and the share wrong after a declaration at 0.95 suggest that the tags are not yet
the components.

## 3.3 Consequences for Zeno and threats to validity

### What a system like Zeno should use

The answer to the research question in one sentence is that a coarse grain makes BKT's probability stop meaning what
it says and takes every method's precision down with it, a fine grain is usable only where the questions identify the
components and the practice supports them, and the simple rules are less affected by grain in calibration and in
having a usable threshold, but not in precision, because they assume less and therefore know less. What follows for a
system is that the grain has to be chosen together with the questions, and the rule together with the grain.

Zeno's learner model assumes that learning is gradual, and the world of components shows that a skill made of several
ideas looks gradual from outside, so the gradual worlds and the coarse-grain worlds point the same way. At the grain of
the skill, BKT at any usual threshold declares mastery when most students have not reached it. It matches the moving
average only with a threshold such as $1 - 10^{-7}$, found from data, whose right value moves by orders of magnitude
from one world to another, and even then it saves at most about a third of an answer. The moving average meets the same
standard with an ordinary threshold and a single fitted parameter, and on a skill of several ideas it keeps a threshold
that works where BKT on the skill has none. A system that does not know how its students learn should prefer the rule
whose failure is milder. BKT's failure, with a threshold not set for the world it is in, is to declare mastery when most
students have not reached it. EMA's failure in the BKT worlds is to need one or two more answers. For practice that
feeds later skills, an early false declaration is the more costly error, so for deciding mastery at the grain of the
skill the evidence points to the EMA, with a threshold set from the system's own data. H1 and H3 do not change this. On the
real answers BKT predicts the next answer better than the EMA, but the gap is modest and the Elo model Zeno already
runs predicts better than both; and on the skill-builder practices BKT at 0.95 is the most generous of the three
rules, declaring in a fifth more of them, one to one and a half answers sooner, with no higher share right afterwards.
Prediction is not the decision, and on the decision the real data cannot say which rule is right; the simulations,
which can, favour the rule whose failure is milder.

At the grain of the ideas, BKT becomes the right tool where the questions tell the ideas apart. On hcf it already does:
BKT on each idea carried from times decided sooner than the moving average, was better calibrated and named the idea a
student lacked four times in five. On fractions it does not yet, within a session of 30 questions: the forms Zeno's
generator now deals, two in five, let it name the missing idea about seven times as often as chance at the higher
learning rate, which is what the adaptive policy uses to choose the next form, but no rule declares fractions mastered
in 30 questions, and the sweep says what would change that: about 120 questions, or a quarter of the questions asking
for one idea alone, after which carried BKT on each idea declares in about 75 answers where the moving average needs
105 or never declares. The recommendation is therefore split by grain and by purpose. For deciding mastery within a
session, the moving average on the skill, with its threshold set from data. For choosing what to practise next, the
state at the grain of the ideas, which Zeno already keeps, since even where it cannot declare mastery it can say which
idea is weakest. And if Zeno lengthens its fractions practice or shifts its generator towards one isolating question in
four, BKT on each idea becomes the mastery rule on fractions as well, with the moving average as the fallback on skills
whose ideas the questions do not separate. Going finer than the ideas, by splitting one of them, would cost answers for
nothing, and the share of degenerate fits is the sign to watch for it.

The threshold matters at least as much as the method, as @pelanek2017mastery also found. The EMA thresholds that met
the 90 % standard ranged from 0.50 to 0.99 across the simulated settings, and BKT's from 0.74 to $1 - 10^{-12.6}$, so
no single value is right everywhere, and a threshold should be set from data on the system's own students. The results
also show what a strict standard costs. In the gradual worlds, and on fractions, declarations right nine times in ten
required students to practise for most of the session, and many were never declared. A practice system may reasonably
accept a lower standard and catch the errors through later review, but that is a choice about the cost of errors, which
should be made openly and not left to a default threshold.

### Internal validity

The ASSISTments data were collected under a streak policy. The skill builders ended once a student had three right in
a row, so a practice usually stops at the streak rule's own decision. The real data therefore cannot show the streak
rule declaring mastery too early, and there are few answers after any declaration to judge it by. The same policy
shapes H1 and G4: practices mostly end soon after a run of three right, so the prediction comparisons are made on
sequences of that kind, and their results need not hold for students who keep practising for 20 or 30 questions. This is
why H3 is exploratory and the comparisons of decisions are simulated.

The H2 comparison was revised after a first simulated run, from equal cost to equal precision (section 2.2). A change
made after seeing results can favour a conclusion. The revision chose a standard that has a meaning in every world,
not one that favours a particular method, and the equal-cost comparison is still reported in full (Table 3.5). Under
the original comparison, the conclusion would have been that the methods cannot be told apart, not that one is better.

The two granularity worlds were built after H2's results had been seen, as checks on the reading that hidden components
make learning look gradual, and their first runs are reported as such. The hypotheses G1 to G3 and their sweeps were
then stated before the sweeps were run, and one part of G1 did not hold, which is some evidence that the sweeps were
not shaped to their conclusions; but the worlds were. The over-splitting variant and the questions on several
components at once were added to the world of components for G3 and G2 after the first runs of G1, and the measures at
the usual thresholds and the sweep tables at the same time.

The thresholds were chosen on training students and judged on held-out ones, and five of the 14 rules chosen in Table
3.3 fell slightly below 90 % on the held-out students, as did several in the granularity sweeps. The standard is
therefore met on average, not guaranteed, and a comparison at a precision a few points lower or higher could reorder
close results. The large differences in Tables 3.3 and 4.10 are not of this kind, but the differences of a few tenths of
an answer between BKT and EMA in Table 3.7, and between the forms of BKT on each idea in Table 3.12, may be. The usual
threshold at which the EMA is judged in the granularity sweeps is the one costing what the streak rule costs on the
training learners, since the EMA has no usual threshold of its own; a different choice would move its precision at the
usual threshold, though not the cheapest threshold meeting the standard or the Brier score.

BKT on each component is fitted heuristically, with each answer counted as evidence on every component its question
needed, where the conjunctive model's own fit would need expectation–maximisation over the hidden states. A better fit
could only help the finer grain, so the condition G2 states may be met somewhat sooner than the sweep shows; it could
not make the coarse grain look better.

BKT's thresholds were first tried up to 0.9999, a range set before the results. The search above it (Table 3.7) was
made after the results had been seen, so it is reported as a check beside H2's verdict, not in place of it. Its own
upper end, $1 - 10^{-15}$, is set by the precision of the arithmetic.

### External validity

Every simulated world is of this thesis's own making. The BKT world gives BKT a home advantage that Proposition 2 makes
exact, and the elo world follows the form of Zeno's own learner model, which gives gradual learning an advantage of the
same kind. The world of components is the BKT world at a finer grain, so by the same proposition it favours BKT on each
component: its precision at the right grain is a theorem there, up to fitting, and what the world can show is only how
far the other grains fall short of it and what the finer grain costs in evidence. Real components are unlikely to be
learnt in one step each. A result in a world holds only as far as its way of learning is believed, which is why each
world is reported on its own and none is pooled. The world of ideas is of this thesis's making too: its decomposition
of fractions was drawn by hand, its ideas are assumed to be learnt as one thing, which the three tests in
`src/model/conceptGraph.ts` could check on real answers but have only been run on simulated ones, and its questions,
though Zeno's own, are read for the ideas they need by a rule written for the purpose.

The simulated practice has every student answer a fixed number of questions per skill at one level or in a fixed
cycle of levels, with every question teaching the same amount and no transfer between skills except the shared ideas.
Real practice varies in all these respects, and the results may depend on them. At the lower learning rate, few
students in the gradual worlds or on fractions mastered a skill within 30 questions, so a method could meet the
standard only by declaring almost nobody, and the comparison there says little about which method is better. All
simulations use one random seed for their tables; seeds 2 to 5 were checked for the ideas world's first runs and gave
the same picture, and the sweeps were not repeated.

The real data come from US middle-school students in 2009 and 2010, using a system unlike Zeno, with skill tags made by
the system's authors. This is typical of the field: the public data sets for knowledge tracing are mostly mathematics
from a few countries, and most carry no demographic information [@abdelrahman2023survey]. Zeno's students are
Georgian, and the result transfers to them only as an expectation. The three grains of G4 are also only three: the
data set's tags are one grain among many the same problems could be given, and the topic areas are the importer's.

### Construct validity

What "mastered" means in the gradual worlds is a threshold on the true chance of a right answer, fixed in advance at
0.9. With 0.8 instead, BKT met the standard in one more setting and tied with EMA there (Table 3.6); with the search
continued above 0.9999 it met the standard in all four settings (Table 3.7). The conclusion depends on this definition
to some degree. In the component worlds the definition is sharper, every component known, and does not move with the
model's grain, which is what makes the grains comparable; but it is also strict, since a learner one component short
of sixteen is counted as not having mastered the skill, and a system might reasonably count them otherwise. In the
corrected ASSISTments file a problem tagged with several skills is one row carrying the first of them, about one row
in seven, so no answer weighs on several skills' sequences, but a problem that needed two skills is credited to one
and the finest grain cannot tell which it tested. The importer counts a problem once for each skill where a file has a
row per skill; on this file that is every problem once, so G4's rule of comparing grains on the first observation of
each problem keeps every answer. BKT and EMA see the same sequences, so the comparison stays fair, and the bootstrap
resamples whole students, which accounts for the dependence within a student. A run on the original file, with its
row per skill, would show whether crediting a problem to one skill or to all of them matters at the finest grain.

### Conclusion validity

H1 and G4 are the two confirmatory tests, each decided by one pre-specified interval. Everything else is reported as
estimates with intervals, without tests, so there is no problem of multiple testing to correct for, but neither should
any single interval among the many in this chapter be read as a confirmed finding. The bootstrap resamples students as if
each were an independent draw, while students in one class share a teacher and lessons. The class-level resampling
shows how much this matters for H1. On ASSISTments the class-level intervals are about half again as wide as the student-level ones and change no
verdict. H1 and G4
are decided on one split of students, with four other splits reported for H1 to show whether the result depends on it,
which is weaker than cross-validation over several folds.
