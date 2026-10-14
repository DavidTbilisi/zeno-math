# 4 Results

This chapter reports the results in the order of the hypotheses: the data kept and the simulated settings (section
4.1), the methods at one grain (H1 to H3, section 4.2), and then the four granularity studies, too coarse (G1, section
4.3), the right grain and the questions (G2, section 4.4), too fine (G3, section 4.5) and real data across grains (G4,
section 4.6). It reports what was found; chapter 5 interprets it. The one-grain simulation results were made at commit
88c4af7 of the Zeno repository, the check above BKT's highest threshold (Table 4.7) at commit 66c2eda and the
calibration of the methods' scores (Table 4.8) at commit ba04c48; the granularity sweeps were made at commit 9180a75
(G1, G2) and 66ee9af (G3, G4 on simulated learners), with the commands in Appendix B.

[TODO: the ASSISTments results in sections 4.1, 4.2 and 4.6 need the data file. Download `skill_builder_data.csv`
(the corrected 2009–2010 version), then run `npm run import-assistments -- skill_builder_data.csv`,
`npm run model -- --observations assistments.json --fit --calibration assistments-bins.csv`,
`npm run h1 -- --observations assistments.json`, `npm run mastery -- --observations assistments.json` and
`npm run grain -- --observations assistments.json`, and record the commit hash.]

## 4.1 Data and settings

[TODO: the number of rows read, and the answers, students, skills, problems and classes the importer keeps; how many
students answered in more than one class; the share of right first answers; the fitted EMA's starting score, which
Proposition 1 predicts to be above 0.5; and, for G4, the number of skills, topics and observations at each grain and
how many answers every grain has.]

In the one-grain simulation, 400 students each practised 38 skills with 30 questions per skill, which gives 15,200
practices of 30 answers in each world and at each learning rate. A fifth of the students, held out by split seed 1,
were used for judging, which leaves about 3,000 held-out practices in each setting. Table 4.1 shows how many of them
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

## 4.2 The methods at one grain (H1 to H3)

### Prediction on real answers (H1)

[TODO: Table 4.2 from `npm run model -- --observations assistments.json --fit`: log-loss, RMSE, AUC and accuracy for
BKT, EMA and the reference rows (the Elo model, PFA and the three counting baselines).]

| Model | Log-loss | RMSE | AUC | Accuracy |
|---|---:|---:|---:|---:|
| BKT | | | | |
| EMA | | | | |
| Elo | | | | |
| PFA | | | | |
| Per student and skill rate | | | | |
| Per skill rate | | | | |
| Overall rate | | | | |

Table: Prediction of held-out ASSISTments students' first-attempt answers, split seed 1.

[TODO: from `npm run h1 -- --observations assistments.json`: the BKT − EMA difference in mean log-loss per answer for
split seed 1, its 95 % interval over students and the verdict, which decides H1; the same for seeds 2 to 5; and each
seed's interval from resampling classes. Then the calibration plot of BKT and EMA, and how many skills' fitted BKT
parameters sit on an edge of the grid or on the bound of 0.3 for guess or slip.]

### Mastery decisions where the truth is known (H2)

Table 4.3 gives the H2 comparison. For each world and learning rate it shows, for each method, the threshold chosen on
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

The plain BKT world is not part of H2, because Proposition 2 settles it, and Table 4.4 shows how fitted BKT does
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

Table 4.5 gives the comparison as it was first planned, at equal cost: each method's threshold set so that it needs,
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
(section 3.4).

In the gradual worlds, mastery was defined in advance as a true chance of at least 0.9. Table 4.6 repeats the H2
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

The thresholds tried for BKT stopped at 0.9999, a range fixed in advance, and in the one setting of Table 4.6 where BKT
met the standard it did so exactly there. As a check made after the results, the search for BKT and EMA was continued
above 0.9999 to $1 - 10^{-15}$, in steps of a tenth of a power of ten, past which the difference from 1 is lost in the
arithmetic. Nothing else changed: the same students, the same fitted parameters and the same rule for choosing a
threshold. A higher threshold never costs fewer answers, so every rule chosen below 0.9999 stays as it was, and only
the settings in which BKT never met the standard can change. Table 4.7 gives them.

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
true chance of at least 0.9 and, as in Table 4.6, 0.8. EMA and the streak rule keep the rules of Tables 4.3 and 4.6;
the answers BKT saves against the streak rule are given in the text. "BKT saves" is as in Table 4.3 (`npm run mastery -- --worlds elo,irt2pl --beyond`, with `--mastered-at 0.8` for the
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
ranks the evidence. Table 4.8 measures this directly, as description made after the results. After every answer of
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

[TODO: Table 4.9 from `npm run mastery -- --observations assistments.json`: for BKT at 0.95, EMA at the streak rule's
cost and the streak rule with N = 3, how often each pair both declare, only one declares or neither does, and the mean
gap in answers where both declare; then the share right on the next three answers after each method declares, with
the number of practices that have such answers.]

| Pair | Both | Only the first | Only the second | Neither | Gap (answers) |
|--------------------|-----:|-----:|-----:|-----:|-----:|
| BKT 0.95 and streak 3 | | | | | |
| EMA and streak 3 | | | | | |
| BKT 0.95 and EMA | | | | | |

Table: Agreement between the mastery methods on held-out ASSISTments practices.

## 4.3 Too coarse: a skill that is really several components (G1)

The world of components keeps everything of the BKT world except that each skill is $k$ components, each learnt all at
once, and the model treats the skill as one. Table 4.10 gives the sweep over $k$ at both learning rates, with the
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

Table 4.11 gives the same measures in the world of ideas, where the components are the ideas of fractions and its
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
generators, 400 learners, 30 questions per skill, the measures as in Table 4.10, and the missing idea found by BKT on
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
threshold, as the eight-component rows of Table 4.10 lead one to expect. The last column already shows G2's condition:
on hcf, whose questions need different ideas at different levels and whose arithmetic was settled in times, carried BKT
on each idea names the missing idea 62 and 80 % of the time, where started afresh in hcf it is below chance, because
the three arithmetic ideas that every hcf question needs can only tie; on fractions at the higher rate it names it 51 %
of the time against 6 % by chance, and at the lower rate, where only 128 held-out moments had a learner one idea short,
it is at chance.

## 4.4 The right grain, and the condition on the questions (G2)

G2 holds that BKT on each component restores the standard and names the missing component if and only if the questions
tell the components apart, and it was swept on fractions, the skill where the generated questions tell them apart
least. Table 4.12 varies the share of questions that ask for one idea alone, from the generator's own two in five with
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
as they were for eight components in Table 4.10, and the same questions suffice when there are enough of them. At 120
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

## 4.5 Too fine: finer than the learners, or than the practice supports (G3)

The first way of being too fine models a component that is learnt as one thing as several. Table 4.13 keeps the
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

The second way of being too fine is more components than the practice can support, and Table 4.10 already showed it at
30 questions: with eight or sixteen components asked one at a time, BKT on each component at 0.95 declares for almost
nobody, and its cheapest threshold meeting the standard, 0.66 to 0.89, is met by declaring for 0 to 2 % of learners.
Table 4.14 repeats the sweep over $k$ with 120 questions per skill, so that each component is asked about four times as
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
only where the model was finer than the learners, in Table 4.13, where parts of one component were asked to explain
answers that belonged to the whole: four in five of them at the bound when split in four. A system could therefore
read over-splitting from its own fits, but not a shortage of practice, which shows itself instead in declarations that
never come.

## 4.6 Real data across grains (G4)

[TODO: Table 4.15 from `npm run grain -- --observations assistments.json`: at each grain the number of skills, the
training and held-out answers, BKT's and the EMA's log-loss, BKT's fits at the bound and at the edge and the EMA's
$\alpha$; the six paired differences with their intervals and verdicts, of which BKT at the skill grain against one
skill decides G4; what coarsening costs BKT minus what it costs the EMA; and the declarations of the three rules at each
grain. The data set must be imported at a commit from 448f4f1 on, so that problems are kept and a problem's skills fall
together at a coarser grain.]

| Grain | Skills | Answers held out | BKT log-loss | EMA log-loss | BKT fits at bound / edge | EMA $\alpha$ |
|---|---:|---:|---:|---:|---|---:|
| skill | | | | | | |
| topic | | | | | | |
| one | | | | | | |

Table: G4 on ASSISTments: BKT and the EMA fitted and judged at three grains on the same held-out students.

As a check of the method before the data file, Table 4.16 runs the same analysis on the one-grain simulation's
students, whose 38 skills fall into five areas, so that the three grains are 38, 5 and 1 skills. Simulated answers name
no problem, so nothing falls together at a coarser grain and every grain has every answer.

| Grain | Skills | BKT log-loss | EMA log-loss | BKT fits at bound / edge | EMA $\alpha$ | BKT, finer against this grain's coarser neighbour | EMA, the same |
|---|---:|---:|---:|---|---:|---|---|
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

## 4.7 Summary

[TODO: H1's verdict.] At one grain, H2 holds in the BKT world with forgetting, where BKT needs one to two answers fewer
than the simpler methods for the same precision, and fails in both gradual worlds by the rule fixed in advance, where
no BKT threshold up to 0.9999 makes its declarations right nine times in ten while EMA and the streak rule reach that
standard by waiting. The check above 0.9999 changes the reading: with thresholds between $1 - 10^{-6.9}$ and
$1 - 10^{-12.6}$ BKT meets the standard in three of the four gradual settings, and at the higher learning rate it then
needs 0.3 to 0.4 answers fewer than EMA. Measured against the truth after every answer, BKT's $P(L)$ is the best
calibrated score in the BKT worlds and the worst in the gradual ones, where a value of 0.99 means mastery in 15 to 55 %
of cases (Table 4.8). [TODO: H3.]

Across grains, a skill of $k$ components modelled as one makes BKT on the skill look exactly as the gradual worlds did,
in proportion to what each question leaves untested: right 98 % of the time at 0.95 with one component and under 4 %
with sixteen, with no threshold meeting the standard from four components on, and right again when every question
asks for every component (G1). The EMA and the streak rule fall as far in precision at their usual thresholds, and keep
only a usable threshold and a better Brier score. BKT at the learners' grain keeps its precision and an ordinary
threshold, and names the missing component, where the questions tell the components apart and the practice is long
enough for each to be asked about: on fractions this takes about 120 questions, or a quarter of the questions asking
for one idea alone, and within Zeno's 30 it is not met (G2). Finer than the learners, each split doubles the Brier
score and costs answers for no gain in precision, and the fits degenerate; more components than the practice supports
leaves the right grain unable to declare, which four times the practice remedies for eight components and not yet for
sixteen (G3). On real
data the method is ready and the result waits for the data file; on a simulated class the finer grain predicts better
for BKT without a conclusive interval, and the EMA loses less than BKT from coarsening (G4).
