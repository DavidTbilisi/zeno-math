# Appendix D Reproducing every number

Every number in this thesis comes from a command in the Zeno repository. Each command is deterministic for a given
commit, because every random choice is seeded, with one exception: the dry run makes a real class, whose code (and so
its test forms) is random, so its effect estimate varies between runs while its guarantees hold on every run. The run times below were measured on a laptop.

| Result | Command | Time |
|---|---|---|
| Test suite | `npm test` | ~3 min |
| Model on simulated classes | `npm run model -- --simulate --fit` | ~7 s |
| Model on ASSISTments | `npm run import-assistments -- skill_builder_data.csv` then `npm run model -- --observations assistments.json --fit --calibration bins.csv` | minutes |
| Simulation, adaptive vs fixed | `npm run simulate` | ~10 s |
| Simulation grid | `npm run simulate -- --grid --csv docs/results/simulation-grid.csv` | ~1 min |
| Power, planned design | `npm run simulate -- --power --csv docs/results/power.csv` | ~4 min |
| Power, focused design | `npm run simulate -- --power --skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160 --csv docs/results/power-focused.csv` | ~2 min |
| Power, focused design at 60 % | `npm run simulate -- --power --target 0.6 --skills linear,expand,factor,quadratic --questions 120 --test-length 24 --sizes 40,80,160,320 --csv docs/results/power-focused-60.csv` | ~4 min |
| Dry run | `npm run dry-run`, then `npm run analyse -- dry-run/tests.csv` | ~10 s |
| Checker agreement and mistakes named | `npm run checker-agreement` | ~2 s |
| Mistakes per group | `npm run mistakes -- dry-run/tests.csv` (or a real export) | ~2 s |
| Figures (`docs/thesis/figures/`) | `npm run build`, then `npm run figures` | ~30 s |

The ASSISTments data set is not in the repository. Download `skill_builder_data.csv` (the corrected 2009–2010
version) from the ASSISTments data site [@assistments2010data].

The simulations use the 38 skills Zeno had when the results in `docs/results/` were made (`SIM_SKILLS` in
`src/model/simulate.ts`). Skills added later do not change any simulated number.

The power runs are the slow ones. Each simulated study is seeded on its own, so `npm run simulate` runs them on every
core of the machine (`--jobs N` for fewer; `--jobs 1` runs them one after another), and the rows are the same however
many threads there are; a run can also be split with `--worlds` and `--sizes`. The times above are on an 8-core
laptop. Their `t` column, the mean t-statistic, gives the sizes for 80 % power in Table 5.10 as students × (2.8 / t)².

**Record the commit.** Run `git rev-parse HEAD` and record the hash with every table in the thesis. A later commit may
change a generator, the checker or the model, and with it the numbers.

**[TODO: fill in the commit hash used for the final tables.]**

| Tables | Commit |
|---|---|
| 5.1 Checker agreement | |
| 5.2 Learner model on ASSISTments and simulated classes | |
| 5.3 Simulation study | |
| 5.4 Power and dry run | |
