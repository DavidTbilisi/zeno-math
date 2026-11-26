# Developing Zeno

*Tests, the project layout and ideas for later.*

## Tests

```bash
npm test           # node:test, no extra dependencies
npm run test:changed   # only the test files that import (or read) something changed since main; -- --list to see them
npm run snapshot   # every skill's questions against tests/fixtures/practice-snapshot.json; -- --write after a meant change
npm run typecheck
npm run lint       # ESLint: recommended, typescript-eslint, React's rules of hooks
npm run coverage   # the tests, failing below 95 % of lines / 88 % of branches / 95 % of functions in src/math and src/model
npm run build && npm run e2e   # Playwright: the built app in Chromium against a fresh server (npx playwright install chromium first)
```

Coverage today is about 97 % of lines, 91 % of branches and 97 % of functions in `src/math` and `src/model`. Server
code runs in spawned servers, which Node's coverage doesn't follow, so it is tested but not measured. The end-to-end
tests cover two journeys:

- **A board:** make a board, add a shape and a live piece, use the piece, and find it after a reload.
- **The class study:** a teacher makes a class; a student agrees, joins and answers a question that reaches the
  server; then the teacher starts the pre-test and the student gets it.

The tests check that every example of every tool renders in English, Russian and Georgian; that the three languages have the same
keys; the logic parser; the NAEC 2025 answers; complex-number arithmetic against mathjs; that solved equations and
inequalities satisfy the input, expansions and factorisations multiply back and all four quadratic methods agree;
that simplified powers, surds, standard forms and logarithms keep the value of the input, and that solutions of exponential
and log equations satisfy them (with false roots thrown out); that midpoints, lines, feet of perpendiculars, meeting points,
centres, radii and areas from coordinate geometry agree with the input; that the angles, areas, volumes, meeting points,
feet of perpendiculars and distances from the vectors tool match plain floating-point geometry; that terms, sums, sums to
infinity, telescoping sums, "first n" answers and recurrence limits match adding and iterating term by term; that points inside a stated domain
give values and points outside don't, every value lands in the stated range, f(f⁻¹(y)) = y, transformed key points lie
on the new graph and stationary points have f′ = 0; that true trig identities built from random expressions are
proved and false ones refused, every solution of a trig equation satisfies it and no sign change is missed, and
R-forms, exact values and values from given ratios match plain floating-point trigonometry; that random polynomial
divisions satisfy dividend = divisor × quotient + remainder, unknown coefficients come back from their conditions, every
root of a cubic or quartic is a root and no sign change is missed, polynomial inequalities agree with the sign of f,
binomial expansions and series match arithmetic, the points where a line meets a curve lie on both (as many as the
discriminant says) and partial fractions add back up to the fraction; that circle theorem answers obey the theorems and match the angles
measured on the figure drawn from them, unknowns in x come back, similar triangles keep one scale factor and the
congruence and similarity tests decide correctly, images of rotations, enlargements, reflections and translations
match the formulas and describing an image finds the transformation that made it, volumes and surface areas match the
formulas and a length found from a volume gives it back, and constructions and loci satisfy their conditions; that a change of sign is reported exactly when there is one
(breaks, touching roots and hidden pairs caught), bisection, false position, Newton–Raphson, the secant method and
fixed-point iteration land on the true root rounded correctly with every step following its formula, flat tangents,
cycles and divergence are recognised, the trapezium, mid-ordinate and Simpson's rules match their formulas, are exact
where theory says, err the way f″ says and shrink at orders 2 and 4, and difference quotients match theirs; that derivatives of hundreds of random expressions
match numerical ones, and stationary points, tangents and the chain rule agree with them; that areas, volumes,
distances travelled, optima and rates match independent numerical computations; that the normal, t and χ²
functions match tables and closed forms, a two-sided test rejects exactly when the interval misses μ₀, Welch, paired,
pooled and χ² statistics match their formulas, the n for 80 % power is just enough and about 95 % of simulated 95 %
intervals catch μ; that every practice question (106 skills × 3 levels × 60 seeds) accepts its own answer and
rejects a wrong one, answers in other forms are judged fairly and wrong forms are named, and every worked solution
renders; that every known mistake is named in the questions that can produce it, still counts as a miss, is never the
right answer and never hides a form message, and inequalities and standard form are read however they are typed; that no picture repeats an attribute; that
dark pictures turn back into the same light ones; and the API: conflicts, compression,
bad requests, path traversal, password, headers and export; and the class study: the teacher password, randomisation
in balanced blocks, attempts refused when they don't add up, summaries worked out from the answers, retried uploads
stored once, deletion, an export without sign-in codes, and an outbox that keeps attempts in order until they are sent;
and the learner model: ratings move the right way by shrinking steps, an untried skill starts from the area, levels keep
their order, the metrics match hand-worked values, the export reads back into the model, and on simulated learners it
beats every baseline, is calibrated within 0.05, and ranks the true difficulties (ρ > 0.9) and students (ρ > 0.85);
and class practice: the curriculum covers every skill with prerequisites first, the fixed sequence walks level by level,
the adaptive choice aims at the target, moves on after mastery, goes up and down a level and interleaves, a class's
skills and plan come back right, attempts must match the student's condition, the browser moves its plan on as the
server will, a database from before class practice is upgraded, and simulated studies treat both conditions alike;
and the dashboard: teacher-only, mastery for every student and skill, group figures and logged-prediction calibration
that match hand-worked values; and the protocol: the forms are stable, parallel and spread over the skills, every test
question accepts its own answer in all three languages, phases and sessions are the teacher's alone, forms are
counterbalanced within each condition, each test question is stored once and worked out by the server, the server
marks every answer itself and keeps the browser's verdict where it differs, a test can't be answered before it starts
and what arrives long after its phase is marked late, typed answers can't become spreadsheet formulas, and the
dashboard's test figures match; and the evidence: the CSV reader survives
any split of its input, the ASSISTments importer keeps the right rows, the held-out split keeps students whole, PFA
and BKT match hand-worked steps and BKT's fit recovers the parameters its data came from, the ANCOVA, Welch's test and
t quantiles match hand-worked values and printed tables, every simulated world teaches and every arm runs, a dry run
of the whole study through the server keeps every guarantee, and the answer checker agrees with a teacher's marking
of 701 typed answers at least 89 % of the time, crediting at most two wrong answers, and names every mistake a
teacher names in them and almost none that a teacher doesn't. GitHub Actions runs the typecheck,
lint, tests with coverage, build and end-to-end tests on every push, and builds the Docker image, saves a board in
it and checks that it marks a practice answer itself.

## Project layout

```
server/index.ts           HTTP server: /api/boards CRUD (SQLite) + static files
server/research.ts        class study: classes, students randomised to a condition, practice attempts, CSV export
src/learner.ts            the student's side of the study: question log, attempt records, outbox kept until sent
src/model/elo.ts          the Elo model the app ran before and the thesis simulations run: ratings of students and questions, mastery
src/model/evaluate.ts     replay, metrics (log-loss, RMSE, AUC, calibration), baselines, reading the CSV export
src/model/logistic.ts     the learner model: a logistic model (counts, recency, gap, question difficulty) and a mastery rule on its score
src/model/classModel.ts   the learner model as the app runs it: starting weights from a simulated class, refitted as answers come
src/model/simulate.ts     synthetic learners with a known truth, for tests and the simulation study
src/model/curriculum.ts   the fixed order of the skills and what each builds on
src/model/policy.ts       choosing the next question: fixed sequence or adaptive (target chance, mastery, prerequisites)
src/components/StudentPanel.tsx  joining a class (with your number in the class list), signing back in, deleting your answers
src/components/JoinLink.tsx      a class's join link (#/join/<code>) and its QR code, on the teacher page
src/components/PaperTest.tsx     typing in a test written on the printout, on the teacher page
server/dashboard.ts       the teacher's dashboard data: who is stuck, mastery per student and skill, the two arms, tests by intention to treat, calibration
src/model/fading.ts       worked examples that fade: after a miss, then one step fewer given each time, until solved alone
src/math/calcSteps.ts     how a calculus question comes apart into steps (terms, u and v, the inside)
src/model/learningStage.ts  a skill's learning stage (#576): mastered, kept, fast, used on something new; per skill in My progress and on the roadmaps
src/model/ideaCards.ts    an idea's card (#579): glyph, essence, look-alike, failure; on the topic page, and covered before a spaced review
src/model/stepDown.ts     targeted step-down: two early misses on a skill made of ideas, three questions on its weakest idea, back
src/model/breaks.ts       where it breaks: three right in a row on a skill made of ideas bring a worked answer to judge
src/math/whereItBreaks.ts the worked answers to judge: the right working, or one with a trap or slip worked in, and the mistakes offered
src/model/arms.ts         what a class tests: the features, the two arms, the condition each arm practises in
src/model/stuckList.ts    the stuck list: ten questions without three right in a row, the reason (mistake, ticked idea, weakest idea), groups
src/model/pace.ts         relative response time: question norms, the three-layer pace model, speed-weighted EMA (rejected), a change of pace
src/model/conceptGraph.ts the ideas inside a skill: fractions and arithmetic, and signed numbers, powers, brackets, order of operations, rounding; each mistake's idea
src/math/orderOps.ts      order of operations worked the right way or as a known mistake would, for the generator and for reading a question's ideas
server/protocol.ts        the study protocol: class phases (logged), timed sessions, counterbalanced test forms, the delayed post-test, test answers
server/marking.ts, checker.ts  every answer marked again on the server with the browser's checker (bundled for Docker)
src/model/testForms.ts    the test forms A and B (pre- and post-test) and C (delayed post-test), built from the class code
src/components/TestRunner.tsx  taking a test: one question at a time, no marks, form messages only
src/pages/TeacherPage.tsx the teacher's page (#/teacher): classes in a side list, the class header (code, join link, class board), then tabs: Today (phase steps, stuck, pace), Progress (class per topic, mastery heatmap), Homework, Study (arms, tests, paper test, calibration)
src/components/MasteryHeatmap.tsx, CalibrationChart.tsx, ChartTip.tsx  the dashboard's charts and their readouts
src/model/datasets.ts     public data sets (ASSISTments) as observations, read as a stream
src/model/analysis.ts     the study's planned analysis: ANCOVA, Welch's test, least squares, scores from the export
src/model/ratingCheck.ts  the rating against the prediction: Spearman's ρ, within each outcome, intervals over students
src/math/distributions.ts normal, t and χ² tails and their inverses (no imports, for the server and scripts too)
scripts/evaluate-model.ts `npm run model`: the model against the logistic model, PFA, BKT and baselines on held-out students
scripts/benchmark.ts      `npm run benchmark`: the benchmark CSVs in docs/results (prediction, paired splits, mastery rules) for the dashboard
scripts/import-assistments.ts  `npm run import-assistments`: the ASSISTments file as observations
scripts/simulate-study.ts `npm run simulate`: the conditions on simulated classes, across worlds and assumptions; power
scripts/analyse-study.ts  `npm run analyse`: the planned analysis on the tests export
scripts/dry-run-study.ts  `npm run dry-run`: the whole study with simulated students through the real server (or a running one, under load)
scripts/restore-check.ts  `npm run restore-check`: a backup restored into a fresh Zeno and read back whole
scripts/checker-agreement.ts  `npm run checker-agreement`: the answer checker against labelled answers
scripts/snapshot-practice.ts  `npm run snapshot`: a hash per skill of all its questions, to show a refactor changed none
scripts/mistakes.ts       `npm run mistakes`: the known mistakes in an export's wrong answers, per condition
scripts/rating-check.ts   `npm run ratings`: how each question felt to the student against the model's prediction (exploratory)
scripts/thesis-figures.ts `npm run figures`: the thesis figures (diagrams, calibration, screenshots) made again from the code
scripts/dashboard.ts      `npm run dashboard`: the results dashboard's data: chapter 3's tables, the simulation CSVs, verdicts, learning profiles
src/math/mistakes.ts      the mistakes the checker names (each question lists the answers they would give)
docs/study.md             the class study in full: protocol, analysis, learner model, simulations, dry run, checker
docs/architecture.md      design, diagrams (context, building blocks, data model, a question end to end), decisions
docs/api.md               every HTTP route (checked against the server by tests/api-docs.test.ts)
docs/thesis/              a chapter plan mapping the thesis to the code and evidence; references.bib
docs/evaluation/          the usability study protocol (tasks, SUS in three languages, results template)
docs/results/             the simulation results docs/study.md quotes, as CSV
src/pages/SiteHome.tsx    the site's home (#448): hero, goals, topics, practice; LearnPage, LibraryPage, ProgressPage
                          are #/learn (topics), #/library (tools and games), #/progress (each topic's bar)
src/model/topics.ts       the topics: their skills, Shapes sections and shelf; src/library.ts the menus as a library
src/model/explainers.ts   each topic's intro (#450): use icons and its piece; words in src/locales/site, pictures in
                          src/components/TopicPicture.tsx, shown by Explainer.tsx and #/explain (ExplainPage)
src/math/symbols.ts       maths symbols (#451): sign, LaTeX/character matchers, topics, look-alikes; words in
                          src/locales/symbols, cards by SymbolCard.tsx on #/symbols (SymbolsPage) and in practice
                          (QuestionSymbols.tsx)
src/pages/BoardsPage.tsx  board list (#/boards)
src/pages/BoardPage.tsx   whiteboard, autosave, inserting & editing pictures, dark pictures, tool search
src/components/InsertPanel.tsx  the board's Insert button: the src/menus.ts groups, their sections and a search
src/components/ToolOnPage.tsx   a tool's dialog drawn into a page (library entry, a topic's lessons)
src/tools.tsx             every tool in one table: dialog (loaded on demand), menu entry, edit label, search topics
src/components/ui.tsx     shared dialog controls: Tabs, Segmented, startOr
src/components/CommandPalette.tsx  the tool search (Ctrl+K or /)
src/math/shapes.ts        the ready-made maths shapes (instruments, axes, figures, solids, number, algebra, data)
src/components/ShapesPanel.tsx  their side-panel tab: thumbnails, click or drag onto the board
src/math/live.ts          the live pieces' arithmetic: geared clock, chance devices and tallies, dot multiplication
src/math/liveGraph.ts     the live graph's letters, curves, zoom and frozen copies (mathjs)
src/math/rubik.ts         the Rubik's cube: face turns as sticker permutations, moves read and written, orders,
                          scrambles, and the dots of the Borromean-rings picture
src/math/soroban.ts       the soroban: digits on the rods, bead clicks, and sums a rod at a time with the friends of 5
                          and 10
src/math/rekenrek.ts      the rekenrek: beads that slide in groups, what a rack says, a dealt sum's two steps
src/math/rods.ts          number rods: rows of rods, moves between rows, equal rows and gaps as sentences
src/math/decGrid.ts       the hundredths grid: squares shaded, the amounts asked, the rules found so far
src/math/measureHand.ts   ruler and scale by hand: the pencil's ends on a moved ruler, the needle, the tiles
src/math/areaBlocks.ts    the block area model: a × b cut into tens and ones parts, filled by a tap or an answer
src/math/patternSteps.ts  the algorithm patterns as frames to step through, with the questions for "Your turn"
src/math/problems/        the interview problems: core.ts (inputs, frame helpers), one file per category, index.ts,
                          and solve.ts (each coding question's techniques and costs, the solve ladder's questions,
                          and "what happens next?" before every step)
src/live/scenes.tsx       the pictures of a frame (cells, rows, list, tree, grid, table, graph, architecture)
src/math/descentLab.ts    the gradient descent lab: steps with momentum, the nine puzzles and how a try is judged,
                          free play's functions, and the picture
src/math/pcaLab.ts        the PCA lab: PC1 and least squares from the covariance, a line's error and kept spread,
                          the eight puzzles and how a check is judged, and the picture
src/math/softmaxLab.ts    the softmax lab: softmax with a temperature, the loss and its gradient, the eight puzzles
                          and how a check is judged, and the picture
src/math/embedLab.ts      the embeddings lab: cosine, nearest words and analogies, the eight puzzles and how a check
                          is judged, the readout, and the picture
src/math/backpropLab.ts   the backprop lab: the graphs' forward and backward passes, the eight puzzles and how a
                          check is judged, free play's nudge, the hints, and the picture
src/math/tensorLab.ts     the tensors lab: shapes, views and their strides, places and indices, the eight puzzles and
                          how a check is judged, free play's walk, and the picture
src/math/fitLab.ts        the overfitting lab: points from a hidden curve, ridge fits, test, cross-validation, bias and
                          variance errors, the eight puzzles and how a check is judged, and the picture
src/math/batchLab.ts      the batch training lab: data, the mean squared error and its gradient, training in batches
                          with schedules, momentum and Adam, the six puzzles and how a run is judged, and the picture
src/math/rocLab.ts        the threshold lab: scores, the confusion matrix and its measures, ROC with AUC and the
                          precision–recall curve, the six puzzles and how a check is judged, and the picture
src/math/knnLab.ts        the nearest-neighbours lab: the datasets, distances, the vote, accuracy on test points,
                          distances in many dimensions, the six puzzles and how a check is judged, and the picture
src/math/treeLab.ts       the decision-tree lab: impurity, cuts and the best cut, trees by hand and grown greedily,
                          forests, the six puzzles and how a check is judged, and the picture
src/math/kmeansLab.ts     the k-means lab: assign and move, runs, random and k-means++ starts, the lowest error for
                          each k, the disc's own cluster, the five puzzles and how a check is judged, and the picture
src/math/nnLab.ts         the network lab: the perceptron's update, a 2 → h → 1 network, its forward pass, backprop and
                          training, the four puzzles and how a check is judged, and the picture
src/math/convLab.ts       the convolution lab: padding, output size, sliding sums, max pooling, where a kernel fires,
                          the five puzzles and how a check is judged, and the picture
src/math/attnLab.ts       the attention lab: softmax, scaled scores, the weighted output, self-attention, positions,
                          the next word, the five puzzles and how a check is judged, and the picture
src/math/rnnLab.ts        the recurrent-network lab: tanh, linear and gated cells unrolled, the gradient back through
                          time, the five puzzles and how a check is judged, and the picture
src/math/rlLab.ts         the reinforcement-learning lab: the chain and its long run, moves, value iteration, Q-learning,
                          the four puzzles and how a check is judged, and the picture
src/live/                 live pieces on the board: Excalidraw embeddables drawn in React, state in customData
src/math/latex.ts         LaTeX → SVG (MathJax)
src/math/plot.ts          functions → SVG plot (mathjs)
src/math/models.ts        Singapore-method models → SVG (bar model, fractions, percent, number bond)
src/math/ode.ts           differential equations: slope fields, Euler, first/second order, phase planes
src/math/integration.ts   integration techniques: substitution, by parts, partial fractions, trig substitution
src/math/statistics.ts    statistics & probability pictures: data, scatter, chance, trees, distributions, CLT
src/math/inference.ts     inference: confidence intervals, coverage, z/t/proportion tests, two samples, χ², power
src/math/practice.ts      practice: question generators, answer checking, worksheets; practiceSolve.ts draws solutions
src/math/practiceTypes.ts the shapes of a question, its answer and its words; practiceKit.ts the helpers generators share
src/math/skills/          one file per practice skill: its generator (questions for each level); index.ts gathers them
src/math/chart.ts         shared plot helpers (frames, axes, curves, LaTeX header + captions)
src/math/analysis.ts      real analysis pictures: ε–N, ε–δ, secant → tangent, Riemann sums, series, Taylor
src/math/geometry.ts      plane geometry: measurements, classification, drawing
src/components/GeometryDialog.tsx  the drag-the-points geometry editor
src/math/percratio.ts     percentages and ratios: steps + percent bars and unit bar models
src/math/fracop.ts        fraction arithmetic: steps (lcm, cancelling, reciprocal, gcd) + bar / area / fitting pictures
src/math/division.ts      long division: bracket, corner and short layouts, decimals and repeating decimals
src/math/multiply.ts      multiplication models (groups, array, number line, area, lattice) → SVG
src/math/placeValue.ts    base-ten blocks: layout, trading rules, board image
src/components/PlaceValueMat.tsx  the drag & drop place-value mat
src/math/fraction.ts      exact rational arithmetic
src/math/algo.ts          algorithms: specs, presets, words (renderers in the algo*.ts files below)
src/math/algoArrays.ts    sorting, searching, stacks/queues/hashing, DP tables, complexity + cell/table helpers
src/math/algoGraphs.ts    graph algorithms (BFS, DFS, Dijkstra, Bellman–Ford, Floyd–Warshall, Prim, Kruskal, union–find,
                          topological sort), BST/AVL, heaps
src/math/algoRecur.ts     recursion trees (Fibonacci, factorial, Hanoi), N-queens, subset sum, the farm split (divide and conquer)
src/math/algoStrings.ts   string matching: naive, KMP, Rabin–Karp
src/math/algoPatterns.ts  patterns: two pointers, fast & slow pointers, sliding windows, prefix sums, monotonic stack, Kadane
src/math/graphtheory.ts   graph theory: properties, Euler, Hamilton, colouring, walks, spanning trees
src/math/logic.ts         logic: parser, truth tables, equivalence, Karnaugh maps / minimal forms, circuits, arguments, Venn
src/math/logicArgue.ts    strengthen / weaken: the unstated premise, pattern cards, options judged by support
src/math/logicPuzzles.ts  constraint boards (bins / slots, sweep, "if …") and truth-teller / liar puzzles
src/math/logicSyllogism.ts categorical syllogisms: mood / figure, three-circle Venn, rules, what follows
src/math/logicSquare.ts   the square of opposition and immediate inferences, from the Venn regions of two terms
src/math/logicTree.ts     truth trees (semantic tableaux): stacking and splitting rules, closed and open branches
src/math/logicGrid.ts     logic grids: categories and clues, every answer counted, steps worked out as a person does
src/math/logicMill.ts     Mill's methods: agreement, difference and joint method on a table of cases, concomitant
                          variation as scatters with r, residues as a bar model
src/math/combinatorics.ts counting, Pascal's triangle, stars and bars, inclusion–exclusion, Catalan/Stirling/partitions
src/math/numtheory.ts     number theory: sieve, factorization, gcd/Bézout/Diophantine, modular arithmetic, CRT, bases, base arithmetic
src/math/trig.ts          trigonometry: unit circle, right triangles, laws of sines/cosines, graphs, equations
src/math/vectorspace.ts   span, subspaces, coordinates, Gram–Schmidt, eigenvalues (exact) + ℝ²/ℝ³ pictures
src/math/algebra.ts       equations & polynomials: linear, inequalities, expanding, factoring, quadratics (exact)
src/math/svg.ts           SVG data URLs and the dark-board version of a picture
src/math/complex.ts       complex numbers: forms, operations, powers, roots, quadratics, Euler's formula
src/math/powers.ts        powers, roots & logs: index laws, scientific notation, surds, logarithms, exponential equations
src/math/functions.ts     functions: domain & range, composites, inverses, transformations, curve sketching + pictures
src/math/identities.ts    trig identities: exact values, R-form, proofs, equations (exact surds) + pictures
src/math/polynomials.ts   polynomials: division, factor/remainder theorems, cubics & inequalities, binomial, line & curve,
                          partial fractions (exact) + pictures
src/math/euclid.ts        school geometry: circle theorems, similarity & congruence, transformations, surface area &
                          volume, constructions & loci + figures
src/math/numerical.ts     numerical methods: change of sign, bisection, Newton–Raphson, iteration, trapezium &
                          Simpson, numerical derivatives + pictures
src/math/ai.ts            math for AI: tensors (order, shape, strides, slices, picking an entry, matrix rank),
                          their operations (reshape, permute, reductions, broadcasting, @), gradient descent (rates,
                          momentum, verdicts, curvature), backpropagation (computational graphs, the chain rule),
                          softmax with cross-entropy, embeddings (cosine similarity, nearest neighbours,
                          analogies) and SVD with PCA (Jacobi SVD, rank-k approximation, principal components)
                          + pictures
src/math/sequences.ts     sequences & series: rules, arithmetic, geometric, Σ notation, recurrences (exact) + pictures
src/math/coordgeom.ts     coordinate geometry: points, lines, parallel/perpendicular, intersections, circles, shapes
src/math/vectors.ts       vectors in 2D/3D: combinations, dot and cross products, lines, planes (exact) + pictures
src/math/expr.ts          expressions in x: parser, LaTeX, tidy-up and simplifier, exact a + b√s, real roots of polynomials
src/math/derive.ts        derivatives: rules one level at a time, first principles, chain, tangents, stationary points
src/math/multivar.ts      several variables: partial derivatives, gradient, chain rule as a graph, Jacobian, Hessian,
                          convexity and stationary points, Lagrange multipliers
src/math/randvar.ts       random variables: tables and densities, E and Var, aX + b, joint tables, covariance matrix
src/math/likelihood.ts    maximum likelihood: a coin, a normal, Poisson counts, least squares and log loss as MLE
src/math/information.ts   information: surprise and entropy, a coin, cross-entropy, KL divergence, log loss
src/math/regression.ts    regression: several features, polynomial and one-hot features, logistic regression, reading weights
src/math/naiveBayes.ts    naive Bayes: words counted by hand, smoothing, the same evidence counted again, Gaussian
src/math/applied.ts       applied calculus: areas, volumes of revolution, motion, optimisation, related rates
src/math/mental.ts        mental math: base multiplication, division (base, flag, Trachtenberg), divisibility,
                          reciprocals, digit-sum check, roots, cubing, magic squares, Major System
src/math/tactics.ts       problem-solving tactics: symmetry, the extreme principle, pigeonhole, parity, mod 3, colouring, a monovariant
src/math/strategies.ts    problem-solving strategies: Pólya's four phases, Zeitz's start-up strategies on sample problems
src/math/matrix.ts        matrix operations → LaTeX with worked steps
src/math/transform.ts     2×2 matrix as a plane transformation → SVG
src/three/                3D: spec + formulas (spec.ts), scene building (build.ts), viewer & PNG snapshot (viewer.ts)
src/i18n.tsx              language provider; strings in src/locales/{en,ru,ka}.ts, loaded on demand
tests/                    npm test (node:test); scripts/ts-register.mjs lets Node import the app's .ts files
```

## Roadmap ideas

- Practice: more skills (complex numbers, matrices), timed quizzes
- Class study: a delayed post-test (retention), re-scoring test answers offline with the current checker
- Spaced repetition of key formulas
- Real-time collaboration (Yjs), teacher-written questions
- Parametric & implicit plots, points and tangent lines, geometry tools
