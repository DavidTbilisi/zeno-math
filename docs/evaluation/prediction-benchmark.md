# A better model for the benchmarks: predicting the next answer, and when to stop

`npm run model` scores student models by how well they predict each held-out student's next first answer
(`docs/study.md`). On ASSISTments 2009–2010 the best was the Elo model Zeno runs, at log-loss 0.5581 and AUC 0.728
(one area). This note records the search for something better. Ideas came from five fields. Each was tried on the
same split, and what was kept became `src/model/logistic.ts`. The same model, used to decide when a skill is
mastered, also beats the rules of H3 on real answers (`npm run mastery -- --observations`; see below).

## Result

On the 853 held-out students (51,452 answers; seed 1):

| model | log-loss | AUC | accuracy |
|---|---|---|---|
| Elo, three layers | 0.5607 | 0.724 | 0.719 |
| Elo, one area | 0.5581 | 0.728 | 0.722 |
| **logistic** | **0.5221** | **0.776** | **0.745** |
| logistic, no question difficulty | 0.5457 | 0.744 | 0.733 |
| BKT | 0.5690 | 0.711 | 0.715 |
| PFA | 0.5814 | 0.701 | 0.703 |

The test is H1's paired bootstrap: the logistic model's log-loss minus Elo's, on the same answers, resampling whole
students. Across five splits the logistic model is 0.036 to 0.041 lower per answer. Every 95 % interval lies below
−0.032, also when whole classes are resampled. That is seven to eight times the smallest difference H1 counts (0.005).

| split seed | against Elo | against Elo, one area |
|---|---|---|
| 1 | −0.0387 [−0.0422, −0.0352] | −0.0360 [−0.0395, −0.0327] |
| 2 | −0.0390 [−0.0423, −0.0356] | −0.0363 [−0.0397, −0.0329] |
| 3 | −0.0381 [−0.0419, −0.0343] | −0.0358 [−0.0395, −0.0320] |
| 4 | −0.0398 [−0.0436, −0.0360] | −0.0372 [−0.0410, −0.0334] |
| 5 | −0.0408 [−0.0443, −0.0376] | −0.0381 [−0.0417, −0.0350] |

Gervet et al. (2020) report AUC 0.772 for their best logistic model on this data set. Our 0.776 is under a stricter
protocol: whole students held out, and every answer predicted before it is learnt from.

On the simulated class, whose learners are made with the Elo model's own structure, the logistic model is level with
Elo (0.549 against 0.550). It does not lose where Elo is right by construction.

Most of the gain comes from two things Elo lacks.
- **A difficulty per question.** With no question difficulty the AUC is 0.744; with one it is 0.776. Two problems
  tagged with one skill can differ a lot.
- **Counts on a log scale over every skill.** A student's whole record says how strong they are.

## The search, field by field

Each candidate was scored on students split off from the training students (seed 2), never the test students. A
feature was kept if it lowered log-loss there. The ladder on that inner split:

| model | log-loss |
|---|---|
| Best-LR (Gervet et al. 2020) | 0.5390 |
| + recency | 0.5349 |
| + question difficulty moving after the fit | 0.5329 |
| + area counts | 0.5320 |
| + gap since the skill was last practised | 0.5309 |

**Psychometrics and cognitive psychology.**
- *Rasch/IRT:* a difficulty per question.
- *PFA (Pavlik et al. 2009):* counts of right and wrong answers per skill.
- *ACT-R:* practice has diminishing returns, so counts enter as log(1 + n).

Together these are Best-LR, which reproduced the published result at once (AUC 0.767 untuned).

- **Recency** (Galyardt & Goldin 2015, from the psychology of memory): each student keeps an exponentially weighted
  record of their last answers. Kept: −0.0041.
- **Forgetting between practices:** DAS3H (Choffin et al. 2019) uses time windows, but this file has no timestamps.
  The number of answers given elsewhere since the skill was last practised stands in for the clock. Kept: −0.0011.

**Neuroscience and biology.**
- **A Kalman filter on each student's ability:** the Bayesian reading of the Rescorla–Wagner rule, and Piray &
  Daw's volatile Kalman filter. The step shrinks as the ability's uncertainty does. It lowered log-loss by only
  0.0008, at the smallest prior variance tried, and volatility made it worse. The totals already track ability, so
  it was not kept.
- **Shared structure, as related species share traits:** a skill's area pools practice across related skills.
  Kept: −0.0009.

**Blockchain.** Proof-of-stake consensus weights each validator's vote by its stake. The model version is a weighted
vote of the logistic model, Elo and BKT in log-odds:
- the weights were fitted on the inner split (0.88, 0.13 and 0.05);
- the stakes then moved with each answer, as multiplicative weights (Hedge) would.

The consensus improved on the logistic model alone by 0.0006 on the test students (by 0.0002 with fixed stakes).
That is below what counts, so the ensemble was not kept. The logistic model already carries what the others know.

**The Bible and the Talmud.**
- **Repetition with diminishing returns.** Hillel's "one who reviews a hundred times is not like one who reviews a
  hundred and one times" (Chagigah 9b) says repetition matters. It does not say what the hundred-and-first review
  adds over the hundredth.
- **Many counsellors.** "In the multitude of counsellors there is safety" (Proverbs 11:14) is the ensemble above.

These are principles that agree with the memory research above, not methods with a number to fit. They added
nothing a test could tell apart.

## When to stop: the logistic score as a mastery rule

H3 compares mastery rules on real answers, where nobody knows when a student truly mastered a skill:
- *cost:* the answers a rule takes before declaring mastery;
- *the share right of the next three answers* after it does.

The logistic rule declares mastery once the model's chance of a right answer on a next question of the skill
reaches a threshold. Unlike the other rules, it reads the student's answers on every skill. The threshold is set to
cost what the streak rule costs on training students held out from the fit, so no truth and no test student goes
into it.

On the 7,561 held-out practices (seed 1; 95 % intervals over students):

| rule | answers before | next three right |
|---|---|---|
| streak 3 | 4.05 | 77.2 % |
| EMA θ 0.6962 | 4.02 | 80.4 % |
| BKT θ 0.95 | 3.25 | 78.6 % |
| logistic θ 0.7902 | 3.74 | 81.7 % |

Against streak 3 it is +4.5 points [+3.1, +6.0] on the next three answers, with 0.31 fewer answers [0.18, 0.43].
Against EMA it is +1.3 points [+0.3, +2.2]. On seeds 2 to 4:
- against streak 3: +5.2 to +6.3 points, at a cost within ±0.22 answers;
- against EMA: +2.9 to +3.3 points;
- against BKT: +3.7 to +4.9 points, though BKT at 0.95 stops 0.8 to 1.0 answers sooner.

Every threshold traces a curve of cost against the share right, and the logistic rule's curve lies above the
others' at every cost (seed 1, description):

| answers before | streak | EMA | BKT | logistic |
|---|---|---|---|---|
| ≈ 2.2 | – | 76.4 % (2.11) | 76.5 % (2.24) | 77.3 % (2.24) |
| ≈ 3.0 | 77.3 % (2.99) | 77.3 % (2.91) | 78.6 % (3.25) | 80.1 % (3.15) |
| ≈ 4.0 | 77.2 % (4.05) | 80.5 % (4.02) | 79.7 % (4.24) | 82.4 % (3.91) |
| ≈ 4.9 | 81.3 % (4.89) | 81.9 % (4.79) | – | 84.9 % (4.86) |

Streak 3's 77.2 % is reached by the logistic rule after 2.24 answers instead of 4.05, which is 1.8 times fewer. Some
of that is the streak rule's own weakness: streak 2 does as well as streak 3 here, at 2.99.

Caveats:
- The next three answers exist only where practice went on after the declaration. ASSISTments ends a skill builder
  at three right in a row, so these are not the same practices for every rule.
- A practice is a student's answers on a skill over every assignment. About three in five of the logistic rule's
  declarations come after the first answer (37 % of all practices), from what the student showed on other skills.
  That is the point of the rule, but it is a pretest more than practice.
- None of this measures learning that lasts. That needs the post-test of Zeno's own study.

## The app's model, run as the app runs it

Since PR #144 the app runs the logistic model (`src/model/classModel.ts`). Before a class has answered, its weights
are fitted on a simulated class. Every answer moves the student's records at once. The weights are fitted again on
the class's own answers at 200 and whenever their number has grown by a fifth. Elo learns from every answer instead.

Here both run from no answers through every answer in order, each predicted before either model learns from it.
ASSISTments is without its problem ids, since Zeno's questions are new each time:

| answers | Elo | logistic, as the app runs it |
|---|---|---|
| ASSISTments, every answer in order | 0.5667 (one area 0.5640) | **0.5595** |
| simulated, Elo world (seeds 1, 2) | 0.5559, 0.5500 | 0.5653, 0.5587 |
| simulated, IRT world | 0.5443, 0.5611 | 0.5538, 0.5675 |
| simulated, BKT world | 0.5832, 0.5786 | **0.5628, 0.5577** |

On real answers the logistic model predicts better. On simulated learners made the way Elo assumes, Elo stays ahead
by 0.006 to 0.010, in the second half of the answers as well as the first, so this is not the cold start. Three
changes were tried, and none closed that gap:
- moving each skill's difficulty between fits;
- counting answers by level;
- feeding Elo's prediction in as a feature.

`npm run benchmark -- --parts app` writes `docs/results/benchmark-app.csv`.

## What it does not change

- Zeno's own questions are new each time, so the app's logistic model has no question difficulty to learn on them.
  Without one it still beats every Elo variant on ASSISTments (0.5457 against 0.5581 held out; 0.5595 against 0.5640
  run as the app runs it).
- The thesis's printed results (chapter 4) are as defended.
- The parameters were tuned on ASSISTments training students only. Another data set should be tuned the same way.

## Reproduce

```bash
npm run import-assistments -- skill_builder_data.csv --out data/assistments.json   # keeps problem ids now
npm run model -- --observations data/assistments.json
npm run mastery -- --observations data/assistments.json     # H3, with the logistic rule
npm run benchmark                                           # every table here, as docs/results/benchmark-*.csv
```

The dashboard's Benchmark tab draws those CSVs (`npm run dashboard`).

## Sources

- Gervet, T., Koedinger, K., Schneider, J., & Mitchell, T. (2020). When is deep learning the best approach to
  knowledge tracing? *Journal of Educational Data Mining*, 12(3), 31–54.
- Pavlik, P. I., Cen, H., & Koedinger, K. R. (2009). Performance factors analysis. *AIED 2009*.
- Choffin, B., Popineau, F., Bourda, Y., & Vie, J.-J. (2019). DAS3H: Modeling student learning and forgetting for
  optimally scheduling distributed practice of skills. *EDM 2019*. arXiv:1905.06873.
- Galyardt, A., & Goldin, I. (2015). Move your lamp post: Recent data reflects learner knowledge better than older
  data. *Journal of Educational Data Mining*, 7(2), 83–108.
- Piray, P., & Daw, N. D. (2020). A simple model for learning in volatile environments. *PLOS Computational Biology*,
  16(7), e1007963.
- Freund, Y., & Schapire, R. E. (1997). A decision-theoretic generalization of on-line learning and an application to
  boosting. *Journal of Computer and System Sciences*, 55(1), 119–139.
- Babylonian Talmud, Chagigah 9b. Proverbs 11:14.
