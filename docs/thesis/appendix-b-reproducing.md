# Appendix B Reproducing every number

Every number in this thesis comes from a command in the Zeno repository. Each command is deterministic for a given
commit, because every random choice is seeded. The run times below were measured on an 8-core laptop.

| Result | Command | Time |
|---|---|---|
| ASSISTments import (section 4.1) | `npm run import-assistments -- data/skill_builder_data.csv --out data/assistments.json` | ~10 s |
| Prediction on ASSISTments (Table 4.2) | `npm run model -- --observations data/assistments.json --fit --calibration bins.csv` | ~1.5 min |
| H1, the paired bootstrap (section 4.2) | `npm run h1 -- --observations data/assistments.json` | ~4.5 min |
| H2, settings and comparison (Tables 4.1, 4.3 to 4.5) | `npm run mastery -- --curves mastery-curves.csv` | ~2.5 min |
| H2 with mastery at 0.8 (Table 4.6) | `npm run mastery -- --worlds elo,irt2pl --mastered-at 0.8` | ~1 min |
| BKT above 0.9999, mastery at 0.9 (Table 4.7) | `npm run mastery -- --worlds elo,irt2pl --beyond` | ~1.5 min |
| BKT above 0.9999, mastery at 0.8 (Table 4.7) | `npm run mastery -- --worlds elo,irt2pl --beyond --mastered-at 0.8` | ~1.5 min |
| Calibration of the scores (Table 4.8) | `npm run mastery -- --calibration bins.csv` | ~3 min |
| H3 on ASSISTments (Table 4.9) | `npm run mastery -- --observations data/assistments.json` | ~0.5 min |
| G1, the world of components (Table 4.10) | `npm run atoms -- --atoms 1,2,4,8,16 --per-question 1,2,4` | ~25 min |
| G1, the world of ideas (Table 4.11) | `npm run ideas` | ~6 min |
| G2, the isolating share against length (Table 4.12) | `npm run ideas -- --skills fractions --isolate 0,0.25,0.5,1 --length 30,60,120` | ~45 min |
| G3, over-splitting (Table 4.13) | `npm run atoms -- --atoms 2 --split 1,2,4` | ~5 min |
| G3, components against practice length (Table 4.14) | `npm run atoms -- --atoms 1,2,4,8,16 --length 120` | ~40 min |
| G4 on ASSISTments (Table 4.15) | `npm run grain -- --observations data/assistments.json` | ~2.5 min |
| G4 on the simulated class (Table 4.16) | `npm run grain -- --simulate` | ~1 min |
| Proposition 1 and 2 checks | `npm test` (`tests/mastery.test.ts`) | ~4 min for the whole suite |
| The thesis as a PDF | `npm run thesis-pdf` | ~1 min |

The ASSISTments data set is not in the repository. Download `skill_builder_data.csv`, the corrected 2009–2010
version, from the link on the skill builder page of the ASSISTments data site [@assistments2010data]; the file is
64 MB, with 346,860 rows, and writes a missing value as NA. The `data/` directory is ignored by git, so the file and
the imported JSON can live there. The import must be made at commit 3633cc1 or later, so that each answer keeps its
problem, a problem's skills fall together at a coarser grain, and NA is read as a missing value rather than as a
skill.

The one-grain simulations use the 38 skills Zeno had when the earlier simulation results were made (`SIM_SKILLS` in
`src/model/simulate.ts`), so skills added later do not change any simulated number. The trade-off curves are written
to the CSV file named by `--curves`, one row per world, learning rate, method and threshold. The world of ideas reads
Zeno's generators, so a change to the fractions generator changes its numbers; the commit records which generator was
run.

A later commit may change the simulator, a model or the fitting, and with them the numbers. The commit at which each
table was made is recorded below; to reproduce a table, check out that commit (`git checkout <hash>`) and run its
command.

| Tables | Commit |
|---|---|
| 4.1, 4.3 to 4.6 | 88c4af7 |
| 4.7 | 66c2eda |
| 4.8 | ba04c48 |
| 4.10 to 4.12 | 9180a75 |
| 4.13, 4.14, 4.16 | 66ee9af |
| 4.2, 4.9, 4.15 and the ASSISTments counts | 3633cc1 |
