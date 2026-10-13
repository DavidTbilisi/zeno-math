# 4 Results

This chapter reports the results for each hypothesis in turn: the data kept and the simulated settings (section 4.1),
prediction on real answers (H1, section 4.2), mastery decisions where the truth is known (H2, section 4.3) and mastery
decisions on real answers (H3, section 4.4). It reports what was found; chapter 5 interprets it. The simulation
results were made at commit 88c4af7 of the Zeno repository, the check above BKT's highest threshold (Table 4.7) at
commit 66c2eda, the calibration of the methods' scores (Table 4.8) at commit ba04c48, and the world of ideas (Table
4.9) at commit 7dbd426 and, with the fraction forms, at commit 2b32a8e, with the
commands in Appendix B.

[TODO: the ASSISTments results in sections 4.1, 4.2 and 4.4 need the data file. Download `skill_builder_data.csv`
(the corrected 2009–2010 version), then run `npm run import-assistments -- skill_builder_data.csv`,
`npm run model -- --observations assistments.json --fit --calibration assistments-bins.csv`,
`npm run h1 -- --observations assistments.json` and `npm run mastery -- --observations assistments.json`, and record
the commit hash.]

## 4.1 Data and settings

[TODO: the number of rows read, and the answers, students, skills and classes the importer keeps; how many students
answered in more than one class; the share of right first answers; and the fitted EMA's starting score, which
Proposition 1 predicts to be above 0.5.]

In the simulation, 400 students each practised 38 skills with 30 questions per skill, which gives 15,200 practices of
30 answers in each world and at each learning rate. A fifth of the students, held out by split seed 1, were used for
judging, which leaves about 3,000 held-out practices in each setting. Table 4.1 shows how many of them truly knew the
skill after the first and after the last answer, and the EMA settings fitted on the training students.

| World | Learning rate | Known after the first answer | Known after the last answer | EMA $\alpha$ | EMA start |
|---|---:|---:|---:|---:|---:|
| BKT | 0.02 | 49.5 % | 88.2 % | 0.15 | 0.535 |
| BKT with forgetting | 0.02 | 48.3 % | 70.5 % | 0.15 | 0.536 |
| elo | 0.02 | 4.8 % | 10.7 % | 0.10 | 0.478 |
| irt2pl | 0.02 | 3.9 % | 8.9 % | 0.10 | 0.485 |
| BKT | 0.1 | 60.2 % | 100.0 % | 0.15 | 0.533 |
| BKT with forgetting | 0.1 | 59.0 % | 92.6 % | 0.15 | 0.536 |
| elo | 0.1 | 5.3 % | 68.2 % | 0.15 | 0.478 |
| irt2pl | 0.1 | 4.5 % | 58.9 % | 0.15 | 0.485 |

Table: Held-out simulated practices in which the student truly knew the skill after the first and after the last of 30
answers (in the gradual worlds, a true chance of a right answer of at least 0.9), and the EMA settings fitted on the
training students (`npm run mastery`).

The worlds differ sharply. In the two BKT worlds about half the students know a skill before practising it, and at the
higher learning rate nearly all of them know it after 30 questions. In the gradual worlds very few students start at a
true chance of 0.9, and at the lower learning rate only about one in ten reaches it within the 30 questions. The
fitted EMA moves slowly in every world, with $\alpha$ of 0.1 or 0.15, far from the $\alpha$ of at least one half that
Proposition 1 requires for the EMA to act as a streak rule.

## 4.2 Prediction on real answers (H1)

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

## 4.3 Mastery decisions where the truth is known (H2)

### The comparison at equal precision

Table 4.3 gives the H2 comparison. For each world and learning rate it shows, for each method, the threshold chosen on
the training students as the cheapest whose declarations were right at least 90 % of the time, and how that rule did
on the held-out students: the mean number of answers it needed, with its 95 % interval, the share of its declarations
that were right and the share of practices in which it declared mastery at all. The last column is the number of
answers BKT saves against that method, with its interval; a positive value means BKT needs fewer.

| World | Rate | Method | Rule | Answers [95 % interval] | Right | Declared | BKT saves [95 % interval] |
|----------------|-----|-------|-----------|-------------------:|------:|---------:|------------------|
| BKT with forgetting | 0.02 | BKT | $\theta$ = 0.74 | 10.08 [9.37, 10.79] | 90.0 % | 87.1 % | |
| | | EMA | $\theta$ = 0.61 | 11.27 [10.51, 12.06] | 93.6 % | 84.1 % | 1.20 [1.08, 1.32] |
| | | streak | $N$ = 3 | 11.46 [10.79, 12.11] | 92.6 % | 87.4 % | 1.38 [1.21, 1.55] |
| BKT with forgetting | 0.1 | BKT | $\theta$ = 0.79 | 3.54 [3.36, 3.72] | 89.4 % | 100.0 % | |
| | | EMA | $\theta$ = 0.61 | 5.53 [5.25, 5.81] | 96.0 % | 99.9 % | 1.99 [1.87, 2.11] |
| | | streak | $N$ = 2 | 4.23 [4.05, 4.40] | 93.5 % | 100.0 % | 0.68 [0.63, 0.74] |
| elo | 0.02 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.97 | 29.97 [29.95, 29.98] | 90.2 % | 2.2 % | |
| | | streak | $N$ = 26 | 29.92 [29.88, 29.95] | 85.7 % | 2.2 % | |
| elo | 0.1 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.93 | 25.70 [24.94, 26.43] | 89.5 % | 48.3 % | |
| | | streak | $N$ = 14 | 27.11 [26.54, 27.65] | 92.9 % | 35.5 % | |
| irt2pl | 0.02 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.96 | 29.89 [29.84, 29.93] | 87.2 % | 3.1 % | |
| | | streak | $N$ = 25 | 29.90 [29.86, 29.94] | 88.1 % | 2.4 % | |
| irt2pl | 0.1 | BKT | never | | | | |
| | | EMA | $\theta$ = 0.95 | 27.32 [26.78, 27.82] | 91.6 % | 34.6 % | |
| | | streak | $N$ = 15 | 27.84 [27.37, 28.26] | 93.2 % | 27.8 % | |

Table: H2, the answers each method needs for its declarations to be right at least 90 % of the time, on about 80
held-out students per setting (about 3,000 practices). "Never": no threshold up to 0.9999 met the standard on the training
students. Intervals from 2,000 bootstrap resamples of students (`npm run mastery`, commit 88c4af7).

In the BKT world with forgetting, H2 holds at both learning rates. BKT needs 1.20 fewer answers than EMA and 1.38
fewer than the streak rule at the lower rate, and 1.99 and 0.68 fewer at the higher rate, and none of the four
intervals comes near zero.

In the two gradual worlds, H2 does not hold. At neither learning rate did any BKT threshold, up to 0.9999, make
declarations that were right 90 % of the time on the training students, so by the rule fixed in advance BKT never meets
the standard there, and this counts against it. The check at the end of this section, made after these results, shows
that this is largely a matter of where the search for a threshold stopped. EMA and the streak rule do meet the standard,
but only by waiting for almost the whole practice. At the lower learning rate, where about one student in ten masters a
skill at all, they declare mastery in 2 to 3 % of practices, near the 30th answer. At the higher rate they declare it in
between a quarter and a half of practices, after 25 to 28 answers on average, with EMA a little cheaper than the streak
rule (1.41 answers in the elo world and 0.52 in the irt2pl world, from the costs in the table).

The thresholds were chosen on training students, and on the held-out students their precision scatters around the
target: from 85.7 % to 96.0 % across the table. Five of the 14 chosen rules fall below 90 % on the held-out students,
one of them BKT's.

### Why BKT falls short at the thresholds fixed in advance

The trade-off curves show where BKT's precision stops. In the elo world at the higher learning rate, BKT at
$\theta = 0.80$ declares mastery in 94 % of practices after 10.4 answers on average, and only 7 % of its declarations
are right. At $\theta = 0.99$ it waits for 16.2 answers on average and declares in 85 % of practices, and 17 % of its
declarations are right. EMA at $\theta = 0.99$, by contrast, waits 29.7 answers, declares in 12 % of practices and is
right every time. The streak rule with $N = 6$ needs 18.9 answers and is right 33 % of the time. Raising BKT's threshold
from 0.80 to 0.99 makes it wait only six answers longer, and even the highest threshold tried, 0.9999, did not bring
its precision on the training students to 90 %. The irt2pl world shows the same pattern (16 % right at
$\theta = 0.99$, after 16.5 answers). BKT's probability crowds so close to 1 that only thresholds much closer to 1 than
0.9999 could make it wait as long as the standard requires, which the last part of this section examines.

### The BKT world, where Proposition 2 applies

The plain BKT world is not part of H2, because Proposition 2 settles it, and Table 4.4 shows how fitted BKT does
there. At the usual threshold of 0.95, the proposition promises at least 95 % right declarations if the parameters
were the true ones. With the fitted parameters, 97.7 % were right at the lower learning rate and 96.7 % at the higher,
so fitting cost nothing measurable against the bound. At equal precision BKT also needs the fewest answers, as the
proposition leads one to expect.

| Rate | Method | Rule | Answers [95 % interval] | Right | Declared | BKT saves [95 % interval] |
|----:|----------|-----------|------------------|--------------------------:|---------:|------------------|
| 0.02 | BKT | $\theta$ = 0.84 | 9.00 [8.34, 9.67] | 89.4 % | 90.6 % | |
| | EMA | $\theta$ = 0.61 | 10.74 [9.98, 11.52] | 96.1 % | 86.0 % | 1.74 [1.57, 1.92] |
| | streak | $N$ = 3 | 10.84 [10.20, 11.50] | 94.7 % | 89.3 % | 1.84 [1.71, 1.98] |
| | BKT, usual | $\theta$ = 0.95 | 11.20 | 97.7 % [97.0 %, 98.4 %] | 86.6 % | |
| 0.1 | BKT | $\theta$ = 0.83 | 3.28 [3.11, 3.45] | 91.0 % | 100.0 % | |
| | EMA | $\theta$ = 0.54 | 3.46 [3.22, 3.69] | 90.9 % | 100.0 % | 0.17 [0.09, 0.25] |
| | streak | $N$ = 2 | 4.03 [3.86, 4.20] | 95.7 % | 100.0 % | 0.75 [0.69, 0.81] |
| | BKT, usual | $\theta$ = 0.95 | 4.39 | 96.7 % [96.0 %, 97.3 %] | 100.0 % | |

Table: The plain BKT world, which follows BKT's assumptions: the comparison at 90 % right, and BKT at its usual
threshold of 0.95 with the interval of its precision, which Proposition 2 bounds below by 0.95 for the true
parameters (`npm run mastery`, commit 88c4af7).

### At the streak rule's cost

Table 4.5 gives the comparison as it was first planned, at equal cost: each method's threshold set so that it needs,
on the training students, as many answers as the streak rule with $N = 3$.

| World | Rate | Answers | BKT right | EMA right | Streak right | BKT at 0.95: answers, right |
|--------------------|----:|------:|------:|------:|------:|---------------|
| BKT | 0.02 | 10.8 | 96.9 % | 96.6 % | 94.7 % | 11.2, 97.7 % |
| BKT with forgetting | 0.02 | 11.5 | 94.4 % | 94.1 % | 92.6 % | 13.3, 96.6 % |
| elo | 0.02 | 14.8 | 7.5 % | 7.6 % | 7.2 % | 18.2, 9.3 % |
| irt2pl | 0.02 | 14.8 | 6.1 % | 6.3 % | 6.0 % | 18.4, 7.7 % |
| BKT | 0.1 | 5.6 | 99.2 % | 98.4 % | 99.2 % | 4.4, 96.7 % |
| BKT with forgetting | 0.1 | 6.0 | 97.0 % | 96.5 % | 97.1 % | 5.4, 96.4 % |
| elo | 0.1 | 11.2 | 8.1 % | 8.1 % | 9.5 % | 13.6, 11.1 % |
| irt2pl | 0.1 | 11.3 | 7.4 % | 7.0 % | 8.2 % | 13.7, 10.0 % |

Table: The three methods at the cost of the streak rule with $N = 3$ (its mean answers on the held-out students), and
BKT at its usual threshold, which costs what it costs. The intervals of the precisions are about ±1 percentage
point in the BKT worlds and ±2 to 3 in the gradual worlds (`npm run mastery`, commit 88c4af7).

At equal cost the three methods are hard to tell apart. In the BKT worlds all three are right 92 to 99 % of the time.
In the gradual worlds all three are right less than 10 % of the time, because at 11 to 15 answers very few students
have reached a true chance of 0.9. This is the result that led to the change from equal cost to equal precision
(section 3.3).

### A second definition of mastery

In the gradual worlds, mastery was defined in advance as a true chance of at least 0.9. Table 4.6 repeats the H2
comparison with 0.8 instead.

| World | Rate | Known at the end | BKT | EMA | Streak | BKT saves against EMA, streak |
|-------|----:|-------:|--------------|--------------|--------------|--------------------|
| elo | 0.02 | 26.6 % | never | 28.63, 16.1 % declared | 28.86, 11.3 % declared | |
| irt2pl | 0.02 | 22.2 % | never | 29.00, 12.5 % declared | 29.15, 8.8 % declared | |
| elo | 0.1 | 85.1 % | 21.04, 73.2 % declared | 21.06, 70.7 % declared | 22.08, 65.4 % declared | 0.02 [−0.07, 0.11], 1.04 [0.88, 1.19] |
| irt2pl | 0.1 | 80.3 % | never | 22.75, 62.4 % declared | 24.03, 54.2 % declared | |

Table: H2 in the gradual worlds with mastery defined as a true chance of at least 0.8: the mean answers each method
needs for 90 % right declarations, and the share of practices in which it declares (`npm run mastery -- --worlds
elo,irt2pl --mastered-at 0.8`, commit 88c4af7).

With the lower bar, BKT meets the standard in one of the four settings, the elo world at the higher learning rate,
and only at its highest threshold, 0.9999. There it needs as many answers as EMA (the difference of 0.02 answers has
an interval that includes zero) and about one fewer than the streak rule. In the other three settings BKT again never
meets the standard within the thresholds fixed in advance, while EMA and the streak rule do, with EMA the cheaper of
the two.

### Thresholds above 0.9999

The thresholds tried for BKT stopped at 0.9999, a range fixed in advance, and in the one setting of Table 4.6 where BKT
met the standard it did so exactly there. As a check made after the results, the search for BKT and EMA was continued
above 0.9999 to $1 - 10^{-15}$, in steps of a tenth of a power of ten, past which the difference from 1 is lost in the
arithmetic. Nothing else changed: the same students, the same fitted parameters and the same rule for choosing a
threshold. A higher threshold never costs fewer answers, so every rule chosen below 0.9999 stays as it was, and only
the settings in which BKT never met the standard can change. Table 4.7 gives them.

| At | World | Rate | BKT $\theta$ | Answers [95 % interval] | Right | Declared | BKT saves against EMA |
|---|------|----|--------------|----------------------:|------:|--------:|----------------------:|
| 0.9 | elo | 0.02 | $1 - 10^{-12.6}$ | 29.95 [29.93, 29.97] | 89.4 % | 2.3 % | 0.01 [0.01, 0.02] |
| 0.9 | irt2pl | 0.02 | never |  |  |  |  |
| 0.9 | elo | 0.1 | $1 - 10^{-6.9}$ | 25.41 [24.67, 26.13] | 90.7 % | 53.7 % | 0.29 [0.20, 0.38] |
| 0.9 | irt2pl | 0.1 | $1 - 10^{-7.9}$ | 26.91 [26.36, 27.44] | 90.4 % | 43.5 % | 0.42 [0.33, 0.50] |
| 0.8 | elo | 0.02 | $1 - 10^{-8.3}$ | 28.99 [28.72, 29.24] | 90.9 % | 17.9 % | −0.37 [−0.48, −0.26] |
| 0.8 | irt2pl | 0.02 | $1 - 10^{-8.9}$ | 29.24 [29.02, 29.43] | 90.6 % | 13.6 % | −0.24 [−0.33, −0.16] |
| 0.8 | elo | 0.1 | 0.9999 | 21.04 [19.94, 22.14] | 91.6 % | 73.2 % | 0.02 [−0.07, 0.11] |
| 0.8 | irt2pl | 0.1 | $1 - 10^{-4.5}$ | 22.45 [21.46, 23.44] | 89.3 % | 66.6 % | 0.30 [0.20, 0.40] |

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

### How well the scores are calibrated

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
| BKT | 0.02 | 0.042 | 0.055 | 0.079 | 99.7 % (0.996) | 100.0 % (0.900) | 100.0 % (0.947) |
| BKT | 0.1 | 0.023 | 0.032 | 0.065 | 99.7 % (0.997) | 100.0 % (0.900) | 100.0 % (0.947) |
| BKT with forgetting | 0.02 | 0.108 | 0.118 | 0.111 | 90.4 % (0.993) | none | 97.6 % (0.946) |
| BKT with forgetting | 0.1 | 0.079 | 0.085 | 0.099 | 94.0 % (0.996) | none | 97.7 % (0.945) |
| elo | 0.02 | 0.401 | 0.286 | 0.256 | 17.9 % (0.989) | none | 70.1 % (0.933) |
| elo | 0.1 | 0.339 | 0.309 | 0.227 | 54.9 % (0.992) | 84.2 % (0.946) | 93.6 % (0.953) |
| irt2pl | 0.02 | 0.416 | 0.285 | 0.260 | 15.3 % (0.988) | none | 69.0 % (0.934) |
| irt2pl | 0.1 | 0.395 | 0.326 | 0.252 | 46.3 % (0.991) | 86.2 % (0.947) | 89.8 % (0.953) |

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

### Skills made of ideas, asked by Zeno's own questions

The gradual worlds make learning continuous by construction. The world of ideas (section 3.4), a check made after the
results, asks whether a skill that is several ideas, each learnt all at once as BKT assumes, looks the same to BKT on
the skill, and whether BKT on each idea does better, with the questions Zeno's generators ask. Of the 400 simulated
learners, the held-out fifth knew every idea of times after the last answer in 54 % of practices at the lower
learning rate and in all of them at the higher, of hcf in 45 % and 96 %, and of fractions in 10 % and 66 %. Table 4.9
gives the comparison for hcf and fractions at both rates, by H2's rule: each method's threshold is the cheapest on
the training learners whose declarations are right at least 90 % of the time there, and the cost is judged on the
held-out learners. Times, whose every question needs the same three ideas together, behaves as one skill: BKT on the
skill meets the standard at both rates, at 21.3 and 5.1 answers, and BKT on each idea needs 0.4 to 1.2 answers more.

| Skill | Rate | Method | $\theta$ | Answers [95 % interval] | Right | Declared | Brier | Missing idea found |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| hcf | 0.02 | BKT on the skill | never |  |  |  | 0.304 |  |
| hcf | 0.02 | EMA | 0.86 | 25.58 [23.93, 27.08] | 80.8 % | 35.1 % | 0.180 |  |
| hcf | 0.02 | BKT per idea | 0.50 | 27.96 [27.15, 28.77] | 95.2 % | 28.4 % | 0.226 | 9.3 % |
| hcf | 0.02 | BKT per idea, carried | 0.50 | 25.78 [24.03, 27.43] | 100.0 % | 28.4 % | 0.119 | 47.0 % |
| hcf | 0.1 | BKT on the skill | never |  |  |  | 0.140 |  |
| hcf | 0.1 | EMA | 0.78 | 15.24 [13.78, 16.78] | 97.1 % | 94.6 % | 0.116 |  |
| hcf | 0.1 | BKT per idea | 0.59 | 13.68 [12.58, 14.92] | 93.0 % | 95.9 % | 0.237 | 9.1 % |
| hcf | 0.1 | BKT per idea, carried | 0.76 | 11.41 [9.74, 13.20] | 92.9 % | 94.6 % | 0.092 | 79.3 % |
| fractions | 0.02 | BKT on the skill | never |  |  |  | 0.059 |  |
| fractions | 0.02 | EMA | 0.93 | 29.55 [28.91, 30.00] | 100.0 % | 4.1 % | 0.107 |  |
| fractions | 0.02 | BKT per idea | never |  |  |  | 0.059 | 8.4 % |
| fractions | 0.02 | BKT per idea, carried | never |  |  |  | 0.059 | 13.8 % |
| fractions | 0.1 | BKT on the skill | never |  |  |  | 0.261 |  |
| fractions | 0.1 | EMA | 0.98 | 29.81 [29.53, 30.00] | 100.0 % | 2.7 % | 0.182 |  |
| fractions | 0.1 | BKT per idea | 0.75 | 28.04 [27.26, 28.77] | 88.6 % | 47.3 % | 0.281 | 6.3 % |
| fractions | 0.1 | BKT per idea, carried | 0.73 | 27.43 [26.46, 28.32] | 87.9 % | 44.6 % | 0.244 | 15.2 % |

Table: H2's comparison in the world of ideas, on hcf (six ideas, about four a question) and fractions (fifteen ideas,
about eight a question), with 30 questions per skill. "BKT per idea" starts every skill afresh; "carried" takes each
idea's probability from the learner's earlier skills and puts a recognised mistake's blame on its one idea. The Brier
score is of each method's own score against the truth after every answer. "Missing idea found" is, over every moment
a held-out learner was exactly one idea short of mastering the skill, the share at which that idea had the lowest
probability of the skill's ideas; by chance 16.7 % on hcf and 6.7 % on fractions (`npm run ideas`, seed 1; a check
made after the results).

BKT on the skill never met the standard on hcf or fractions at any threshold up to 0.9999, and on fractions at the
higher rate its probability was the worst calibrated of the scores, with a Brier score of 0.261 against the moving
average's 0.182: the pattern of the gradual worlds, in a world built from BKT's own assumptions at a finer grain. The
streak rule, not in the table, needed 25.4 and 14.9 answers on hcf and 29.4 and 29.2 on fractions. On fractions, eight
ideas a question, nothing decided well within 30 answers. The moving average and the streak rule met the standard only
by declaring mastery for 3 to 14 % of learners at a cost of 29 to 30 answers; BKT on each idea met it at no threshold at
the lower rate, and at the higher rate declared for 45 to 47 % of learners at 88 % precision and a cost of 27.4 to
28.1 answers, 1.7 to 2.4 fewer than the moving average. Asked which one idea a learner was short of, BKT on each idea
started afresh was at chance (6.3 and 8.4 % against 6.7 %); putting a recognised mistake's blame on its idea raised
this to 12.0 and 13.8 %, and carrying the ideas in from times and hcf to 15.2 and 13.8 %. On hcf, four of six ideas a
question and the arithmetic settled in times, carrying is what worked. BKT on each idea carried from times needed 2.2
answers fewer than started afresh at both rates, with intervals of [−3.35, −1.08] and [−3.68, −0.91], and at the
higher rate 3.8 fewer than the moving average and 3.5 fewer than the streak rule; it had the best Brier score of the
scores at both rates, where started afresh it had the worst; and it named the missing idea 47 % of the time at the
lower rate and 79 % at the higher, where afresh it was below chance, because the three arithmetic ideas that every hcf
question needs can only tie. Seeds 2 and 3 gave the same picture on every skill.

Thirty questions is the length of a practice in Zeno's class study, not a limit of the methods, so fractions was run
again with 120 questions per skill, and once more with half of the questions asking for one of the skill's ideas
alone, chosen at random, which Zeno's generators do not do yet. With 120 generated questions every form of BKT on each
idea met the standard at both rates. At the higher rate it needed 38.7 answers [34.5, 43.7] against the moving
average's 48.4 [44.2, 52.9] and the streak rule's 50.5, with 92 % of its declarations right; at the lower rate 101.8
to 103.5 answers against 112.6 and 111.8, though started afresh only 79 % of its held-out declarations were right,
against 88 % carried. Its Brier scores were the lowest of the six at the lower rate, 0.096 to 0.119 against the moving
average's 0.236, and second to the moving average's at the higher. Asked for the missing idea, started afresh it
stayed near chance, at 7 and 14 %, while a recognised mistake's blame alone raised it to 42 and 52 % and carrying to
43 and 57 %. With half the questions asking for one idea alone, learners learnt more slowly, since such a question can
teach only one idea, so every method needed more answers and fewer learners mastered the skill; but BKT on each idea
started afresh now found the missing idea 63 and 65 % of the time, with blame and carrying adding a little, to 62 to
76 %, and it kept the lowest Brier scores. What fractions lacked within 30 questions was evidence about each idea,
not a way of reading it.

The generator was then given such forms, and the world run again with 30 questions per skill (commit [TODO: the
commit of the fraction forms]). Two fractions questions in five now ask for one idea alone: the missing top of an
equivalent fraction, lowest terms, the lowest common denominator of two fractions, a reciprocal, or one of the two
conversions between a mixed number and an improper fraction, with two more recognised mistakes, adding the same number
to top and bottom, and multiplying the whole number by the top. A fractions question now needs 6.1 ideas on average
rather than 7.9, and the form asking for a mixed number back makes toMixed an idea of the skill, so it has sixteen. At
the higher learning rate BKT on each idea started afresh now found the missing idea 44 % of the time, with blame 49 %
and carried 51 %, against 6 % by chance and 6 to 15 % with the operations alone, and its Brier scores fell to 0.15 and
0.16 against the moving average's 0.27. At the lower rate it did not: only 128 moments in the held-out practices had a
learner one idea short, and the share found, 5 to 8 %, was at chance. What the forms cost is practice. A question on
one idea teaches one idea, so the share of held-out learners who knew every idea after 30 questions fell from 10 to 12
% at the lower rate and from 66 to 36 % at the higher, and no rule now declares mastery on fractions within 30
questions: the moving average declared for 0 to 3 % of learners and BKT on each idea for 5 to 8 %. The arithmetic
skills, whose questions did not change, kept their pattern, with carried BKT on each idea on hcf 5.5 answers cheaper
than afresh at the lower rate [−7.39, −3.88] and finding the missing idea 62 and 80 % of the time.

## 4.4 Mastery decisions on real answers (H3)

[TODO: Table 4.10 from `npm run mastery -- --observations assistments.json`: for BKT at 0.95, EMA at the streak rule's
cost and the streak rule with N = 3, how often each pair both declare, only one declares or neither does, and the mean
gap in answers where both declare; then the share right on the next three answers after each method declares, with
the number of practices that have such answers.]

| Pair | Both | Only the first | Only the second | Neither | Gap (answers) |
|--------------------|-----:|-----:|-----:|-----:|-----:|
| BKT 0.95 and streak 3 | | | | | |
| EMA and streak 3 | | | | | |
| BKT 0.95 and EMA | | | | | |

Table: Agreement between the mastery methods on held-out ASSISTments practices.

## 4.5 Summary

[TODO: H1's verdict.] In the simulations, H2 holds in the BKT world with forgetting, where BKT needs one to two
answers fewer than the simpler methods for the same precision, and fails in both gradual worlds by the rule fixed in
advance, where no BKT threshold up to 0.9999 makes its declarations right nine times in ten while EMA and the streak
rule reach that standard by waiting. The check above 0.9999 changes the reading: with thresholds between
$1 - 10^{-6.9}$ and $1 - 10^{-12.6}$ BKT meets the standard in three of the four gradual settings, and at the higher
learning rate it then needs 0.3 to 0.4 answers fewer than EMA. With a lower bar for mastery it meets the standard in
all four settings, close to EMA in each. Measured against the truth after every answer, BKT's $P(L)$ is the best
calibrated score in the BKT worlds and the worst in the gradual ones, where a value of 0.99 means mastery in 15 to 55
% of cases (Table 4.8). In BKT's own world, fitted BKT is as precise as Proposition 2 promises. In a world where each
skill is several ideas learnt as BKT assumes and asked by Zeno's own questions, BKT on the skill fails as in the
gradual worlds; BKT on each idea meets the standard, decides sooner and names the missing idea where the questions
tell the ideas apart and earlier skills are carried in (hcf), and not where every question needs the same eight
ideas (fractions, Table 4.9). [TODO: H3.]
