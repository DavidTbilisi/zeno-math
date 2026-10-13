# Appendix B Reproducing every number

Every number in this thesis comes from a command in the Zeno repository. Each command is deterministic for a given
commit, because every random choice is seeded. The run times below were measured on an 8-core laptop.

| Result | Command | Time |
|---|---|---|
| ASSISTments import (section 4.1) | `npm run import-assistments -- skill_builder_data.csv` | minutes |
| Prediction on ASSISTments (Table 4.2) | `npm run model -- --observations assistments.json --fit --calibration bins.csv` | minutes |
| H1, the paired bootstrap (section 4.2) | `npm run h1 -- --observations assistments.json` | minutes |
| H2, settings and comparison (Tables 4.1, 4.3 to 4.5) | `npm run mastery -- --curves mastery-curves.csv` | ~2.5 min |
| H2 with mastery at 0.8 (Table 4.6) | `npm run mastery -- --worlds elo,irt2pl --mastered-at 0.8` | ~1 min |
| BKT above 0.9999, mastery at 0.9 (Table 4.7) | `npm run mastery -- --worlds elo,irt2pl --beyond` | ~1.5 min |
| BKT above 0.9999, mastery at 0.8 (Table 4.7) | `npm run mastery -- --worlds elo,irt2pl --beyond --mastered-at 0.8` | ~1.5 min |
| Calibration of the scores (Table 4.8) | `npm run mastery -- --calibration bins.csv` | ~3 min |
| Skills made of ideas (Table 4.9) | `npm run ideas` | ~5 min |
| Skills made of ideas, 120 questions and isolating questions (section 4.3) | `npm run ideas -- --skills fractions --length 120 --isolate 0,0.5` | ~10 min |
| H3 on ASSISTments (Table 4.10) | `npm run mastery -- --observations assistments.json` | minutes |
| Proposition 1 and 2 checks | `npm test` (`tests/mastery.test.ts`) | ~3 min for the whole suite |
| The thesis as a PDF | `npm run thesis-pdf` | ~1 min |

The ASSISTments data set is not in the repository. Download `skill_builder_data.csv`, the corrected 2009–2010
version, from the ASSISTments data site [@assistments2010data].

The simulations use the 38 skills Zeno had when the earlier simulation results were made (`SIM_SKILLS` in
`src/model/simulate.ts`), so skills added later do not change any simulated number. The trade-off curves are written
to the CSV file named by `--curves`, one row per world, learning rate, method and threshold.

A later commit may change the simulator, a model or the fitting, and with them the numbers. The commit at which each
table was made is recorded below; to reproduce a table, check out that commit (`git checkout <hash>`) and run its
command.

| Tables | Commit |
|---|---|
| 4.1, 4.3 to 4.6 | 88c4af7 |
| 4.7 | 66c2eda |
| 4.8 | ba04c48 |
| 4.2, 4.9 and the ASSISTments counts | [TODO] |
