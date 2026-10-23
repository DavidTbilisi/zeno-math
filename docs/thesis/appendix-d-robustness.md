# Appendix D Robustness checks

Section 3.3 names four checks of whether the results depend on choices that could have been made otherwise: the
random seed of the simulations, the definition of mastery in the gradual worlds, the practices kept from the
ASSISTments data and the grouping of its skills into topics. All four were made on 18 October 2026, after every result,
and are reported as checks, not as tests (Appendix C). This appendix gives their numbers; the commands are in Appendix B.

All simulations use one random seed for their tables. Table D.1 repeats every simulated table on seeds 2 to 5, each
seed drawing new learners and a new split, at a commit where seed 1 reproduces every table exactly. Every verdict
stands on every seed. H2 holds with forgetting on all five, each interval excluding zero, though on seed 5 at the lower
rate BKT saved only 0.12 answers against the EMA [0.01, 0.24], and in the gradual worlds BKT met the standard at no
threshold up to 0.9999 on any seed. In G1 BKT on the skill falls with the number of components on every seed, and from
four components asked one at a time no threshold up to 0.9999 met the standard on any. In G3 the Brier score rises and
the fits degenerate with each split on every seed. The rows of the world of ideas were made again on 23 October, with
each idea fitted on the conjunctive model's likelihood (section 3.3, Appendix C), on all five seeds. Findings of a
single seed vary. The share of hcf's missing idea found by carried BKT on each idea, 53 and 85 % on seed 1, is 43 to
53 % and 57 to 85 % over the five, well above the 17 % of chance; a quarter of the questions asking for one idea alone,
at 120 answers, finds the missing idea less often than the generator as it is on three seeds of five at the lower rate
and on all five at the higher, which is why the conclusions about G2 rest on the length of practice and not on
isolating questions; and carried BKT on each idea's declarations at 120 answers and the higher rate, right 78 % of the
time on seed 1's held-out learners, are right 78 to 95 % over the five. The ranges are the sampling error of a world with 400 learners, of
whom about 80 are held out, and are wider where fewer of them come within one idea of mastery.

| Result | Setting | Seed 1 | Seeds 1 to 5 |
|---|---|---:|---:|
| H2, BKT's answers saved against the EMA, with forgetting | rate 0.02 / 0.1 | 1.20 / 1.99 | 0.12 to 1.62 / 0.75 to 1.99 |
| H2, BKT's answers saved against the streak rule, with forgetting | rate 0.02 / 0.1 | 1.38 / 0.68 | 0.88 to 1.70 / 0.61 to 0.70 |
| H2, BKT's threshold at 90 % in the elo and irt2pl worlds | both rates | never | never |
| G1, BKT on the skill at 0.95, right | 1 component | 98.0 / 98.4 % | 96.3 to 98.4 % |
| | 2 components | 58.8 / 71.3 % | 55.2 to 74.9 % |
| | 4 components | 23.3 / 28.3 % | 17.9 to 32.1 % |
| | 8 components | 7.7 / 5.0 % | 4.8 to 7.7 % |
| | 16 components | 0.5 / 3.4 % | 0.5 to 3.4 % |
| G1, BKT on the skill's threshold at 90 % | 4 to 16 components | never | never |
| G1, the EMA at its usual threshold, right | 1 / 16 components | 97.1 / 0.5 % | 95.9 to 99.0 / 0.5 to 3.5 % |
| G1, ideas, BKT on the skill at 0.95, right | times / hcf / fractions | 94 / 55 / 30 % | 94 to 100 / 55 to 86 / 5 to 30 % |
| G1, ideas, hcf's missing idea found, carried | rate 0.02 / 0.1 | 52.8 / 84.8 % | 42.7 to 52.8 / 57.0 to 84.8 % |
| G2, fractions' missing idea found, carried, generator as it is | rate 0.02, 30 / 120 answers | 35.2 / 78.2 % | 35.2 to 62.4 / 77.4 to 81.3 % |
| | rate 0.1, 30 / 120 answers | 56.7 / 78.8 % | 39.0 to 58.5 / 72.9 to 83.7 % |
| G2, a quarter alone minus the generator as it is, found, 120 answers | rate 0.02 / 0.1 | +2.3 / −7.8 | −12.0 to +2.3 / −7.8 to −3.2 |
| G2, carried BKT on each idea at 90 %, 120 answers, rate 0.1 | answers / declared | 68.5 / 85 % | 67.2 to 86.5 / 74 to 88 % |
| | right, held out | 77.8 % | 77.8 to 94.6 % |
| G3, BKT on each part's Brier score, split 1 / 2 / 4 | rate 0.1 | 0.082 / 0.149 / 0.384 | 0.073 to 0.082 / 0.136 to 0.149 / 0.362 to 0.395 |
| G3, BKT on each part's fits at the bound, split 1 / 2 / 4 | rate 0.1 | 0 / 29 / 80 % | 0 / 17 to 29 / 75 to 83 % |

Table: The simulated results on seeds 1 to 5: seed 1 as in Tables 3.3 to 3.14, and the lowest and highest value over
the five seeds; for G1 on components, the two rates are given for seed 1 and pooled in the range (`npm run mastery`,
`npm run atoms` and `npm run ideas` with `--seed 2` to `--seed 5`, the commands of Appendix B, at the commits recorded there).

In the gradual worlds a simulated student has mastered a skill when their true chance of a right answer is at least
0.9, a definition fixed in advance. Table D.2 runs the definition from 0.7 to 0.95, to show where the verdict of H2
turns. At the lower learning rate BKT met the standard below 0.9999 at no definition. At the higher rate it met it
there, at 0.995 to 0.9999, with mastery defined at 0.8 or below, and there tied the moving average, within half an
answer; from 0.85 up it did not. The threshold BKT needs climbs with the definition, from about $1 - 10^{-5}$ at 0.7 to
$1 - 10^{-12.6}$ at 0.9 at the lower rate, while the moving average's stays between 0.75 and 0.99 at every definition,
and where both meet the standard they need about the same number of answers.

| Mastered at | elo, 0.02 | irt2pl, 0.02 | elo, 0.1 | irt2pl, 0.1 |
|---:|---|---|---|---|
| 0.7 | $1 - 10^{-5.3}$†, 26.7 / 0.80, 26.1 | $1 - 10^{-5.7}$†, 27.3 / 0.82, 27.0 | 0.995, 17.1 / 0.75, 17.1 | 0.998, 18.5 / 0.78, 19.0 |
| 0.75 | $1 - 10^{-6.6}$†, 27.9 / 0.85, 27.6 | $1 - 10^{-7.2}$†, 28.5 / 0.86, 28.1 | 0.999, 18.9 / 0.79, 18.8 | 0.9997, 20.5 / 0.82, 20.7 |
| 0.8 | $1 - 10^{-8.3}$†, 29.0 / 0.89, 28.6 | $1 - 10^{-8.9}$†, 29.2 / 0.90, 29.0 | 0.9999, 21.0 / 0.84, 21.1 | $1 - 10^{-4.5}$†, 22.4 / 0.86, 22.8 |
| 0.85 | $1 - 10^{-10.2}$†, 29.7 / 0.93, 29.5 | $1 - 10^{-11}$†, 29.7 / 0.93, 29.5 | $1 - 10^{-5}$†, 22.8 / 0.88, 23.0 | $1 - 10^{-6}$†, 24.8 / 0.91, 25.2 |
| 0.9 | $1 - 10^{-12.6}$†, 30.0 / 0.97, 30.0 | never / 0.96, 29.9 | $1 - 10^{-6.9}$†, 25.4 / 0.93, 25.7 | $1 - 10^{-7.9}$†, 26.9 / 0.95, 27.3 |
| 0.95 | none | none | $1 - 10^{-10}$†, 28.3 / 0.98, 29.0 | $1 - 10^{-10.8}$†, 28.9 / 0.99, 29.7 |

Table: H2 in the gradual worlds by the definition of mastery, the true chance of a right answer at which a simulated
student counts as having mastered the skill: in each cell BKT's cheapest threshold right 90 % of the time on the
training students and its mean answers on the held-out students, then the same for the EMA. The search runs to
$1 - 10^{-15}$; a dagger marks a threshold above 0.9999, which the rule fixed in advance does not reach. "None": no
method met the standard, almost no student having mastered a skill (`npm run mastery -- --worlds elo,irt2pl --beyond
--mastered-at` 0.7 to 0.95, seed 1).

The ASSISTments skill builders ended once a student had three right in a row, so H1 and G4 are compared mostly on short
practices. To see whether their results hold for students who keep practising, both were run again on the practices
that went on to ten answers or more, 8,723 of the 36,974, which hold 159,438 of the 259,399 answers, 18 on average,
with everything else as before (`--min-practice 10`). Both hold. On split seed 1, now 459 held-out students with 31,265
answers, BKT minus the EMA is −0.0150 in log-loss per answer with an interval of [−0.0197, −0.0097], and −0.0164 to
−0.0138 on the other four splits, every interval excluding zero with students or whole classes resampled. That is about
two thirds of the −0.0225 on every practice, so BKT's lead narrows on long practices but does not go. For G4, BKT at the
data set's grain, the 88 skills these practices cover, predicts better than at one skill, by −0.0272 [−0.0339,
−0.0212] on split seed 1 and −0.0334 to −0.0301 on the others, each interval excluding zero with students or classes
resampled. The EMA's difference from that grain to one skill is between −0.0050 and +0.0006, at the smallest
difference that counts on one split and below it on the others, and inconclusive or negligible on every split with
classes resampled, so it stays indifferent to the grain; coarsening costs BKT 0.025 to 0.031 per answer more than it
costs the EMA.

The middle grain of G4, the five topic areas, is the importer's, grouped by keywords in the skills' names. To see
whether that grouping matters, the five topics were set beside 100 random groupings of the same 110 skills into groups
of the same sizes, with the same students held out. For BKT the grouping does not matter: at the topic grain its
log-loss is 0.5962, and 78 of the 100 random groupings predict at least as well, from 0.5923 to 0.5988, so BKT at the
middle grain is what any five groups give it, every fit at the bound, and its place between the finest and the
coarsest grain is a matter of the number of groups. For the EMA the grouping matters: at the topics it is 0.5854, and
every random grouping is worse, from 0.5878 to 0.5919, worse even than one skill for everything, so the EMA uses what
the topics put together, a sequence of related skills to average over, which a random group of the same size does not
give it. The confirmatory test of G4, the data set's grain against one skill, does not involve the topics at all.
