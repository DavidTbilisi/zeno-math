# Appendix C When each hypothesis was fixed

A hypothesis tested after its result has been seen is not a test. This thesis was written in a public repository,
https://github.com/DavidTbilisi/zeno-math, and every hypothesis, every rule for deciding it and every result entered it
as a commit, so the order in which they were made is on record. Table C.1 gives that order for each claim. Two clocks
are given. The commit time is written by the author's own machine and could have been set by hand; the merge time is
the moment the pull request carrying the commit was merged on GitHub, and is recorded by GitHub's server, which the
author cannot change. Both are in Tbilisi time.

Table: The commit that fixed each hypothesis or rule, and the commit that first reported its result, with the commit's
own time and the time GitHub recorded the merge of its pull request. All dates are in October 2026.

| Claim | Fixed in | Commit time | Merged on GitHub | Result first reported in | Commit time | Merged on GitHub |
|---|---|---|---|---|---|---|
| H1, its test and its rule | d7c46a8 | 9th, 17:36 | 11th, 11:55 (#19) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |
| H1 also resampled by class | fe0ece4 | 9th, 18:09 | 11th, 11:55 (#19) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |
| The EMA's starting score | 14ac513 | 9th, 18:14 | 11th, 11:55 (#19) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |
| H1's smallest difference, 0.005 | eccff69 | 11th, 08:58 | 11th, 11:55 (#19) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |
| H2 at equal practice | d7c46a8 | 9th, 17:36 | 11th, 11:55 (#19) | 773e06b | 11th, 10:20 | 11th, 11:55 (#19) |
| H2 at equal precision | 773e06b | 11th, 10:20 | 11th, 11:55 (#19) | 554ef19 | 11th, 15:55 | 11th, 15:57 (#22) |
| BKT above 0.9999, a check | none | | | 66c2eda | 11th, 19:45 | 11th, 19:49 (#25) |
| H3 | d7c46a8 | 9th, 17:36 | 11th, 11:55 (#19) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |
| G1 and G2, the sweeps | 62769e3 | 13th, 22:09 | 13th, 22:09 (#50) | d5ef9ae | 13th, 23:29 | 13th, 23:33 (#52) |
| G3 | 62769e3 | 13th, 22:09 | 13th, 22:09 (#50) | 448f4f1 | 13th, 22:47 | 13th, 22:50 (#51) |
| G4 | 62769e3 | 13th, 22:09 | 13th, 22:09 (#50) | 1c3b909 | 14th, 05:14 | 14th, 05:20 (#56) |

The two confirmatory tests were fixed well before their results. H1, with the rule that decides it, was stated on the
9th, its smallest difference that counts on the morning of the 11th, and its result was first reported on the 14th;
the thesis as it stood on the afternoon of the 11th marks the ASSISTments results as still to be run, in its outline
and Appendix B (commit 554ef19). G4 was stated on the
evening of the 13th, in the outline reframed under the approved title, and its result too was first reported on the
14th.

The table also shows what was not fixed in advance, as the text says where each is reported. H2 was first stated at
equal practice and moved to equal precision on the 11th, after a first simulated run, which is why the row for H2 at
equal practice has a result in the same commit as the revision (section 2.2). The search for
BKT's thresholds above 0.9999 was made after H2's results, and is reported as a check (Table 3.7). The worlds of
components and of ideas were built on the 12th and 13th, after H2's results, and their first runs came before G1 to G4
were stated; the hypotheses were then stated for the sweeps, which came after them. The checks of robustness in
section 3.3 and Appendix D, from other seeds, from resampling whole classes, from random groupings of the skills, from other
definitions of mastery and from the long practices alone, were all made after every result above, on 18 October, and
are reported as checks.
