# Zeno: the code, explained

*A complete walk through the repository at the level of files, functions, data structures and invariants. Written from the source on 2026-10-08 (commit e1edf9c), brought up to date on 2026-10-12 (the practice page and the panel docked beside the board, mental division, divisibility and reciprocals, the mastery study, H1 and the moving average), and checked claim by claim against it. Line references are `path:line` as of this revision.*

The existing documents describe Zeno from above: `README.md` (features), `docs/architecture.md` (why it is built this way), `docs/api.md` (the routes), `docs/study.md` (the research side) and the thesis chapters. This document goes underneath them. It follows every folder and every file, names every exported function and every non-trivial internal one, and states the rule each piece keeps for the others. Read section 1 first; after that the sections are independent and can be read in any order.

## Contents

- [1. Orientation](#1-orientation)
  - [1.1 What Zeno is](#11-what-zeno-is)
  - [1.2 The repository map](#12-the-repository-map)
  - [1.3 The layering rule, and how the Docker image enforces it](#13-the-layering-rule-and-how-the-docker-image-enforces-it)
  - [1.4 Runtime topology](#14-runtime-topology)
  - [1.5 The five ideas the whole system rests on](#15-the-five-ideas-the-whole-system-rests-on)
  - [1.6 How to read this document](#16-how-to-read-this-document)
- [2. The practice engine: questions, the checker, the expression parser](#2-the-practice-engine-questions-the-checker-the-expression-parser)
  - [src/math/practice.ts](#srcmathpracticets)
  - [src/math/practiceSkills.ts](#srcmathpracticeskillsts)
  - [src/math/practiceSolve.ts](#srcmathpracticesolvets)
  - [src/math/mistakes.ts](#srcmathmistakests)
  - [src/math/expr.ts](#srcmathexprts)
  - [src/math/latex.ts](#srcmathlatexts)
  - [src/math/text.ts](#srcmathtextts)
  - [src/math/random.ts](#srcmathrandomts)
  - [src/math/fraction.ts](#srcmathfractionts)
  - [tests/practice.test.ts](#testspracticetestts)
  - [tests/checker.test.ts](#testscheckertestts)
  - [tests/mistakes.test.ts](#testsmistakestestts)
  - [tests/fixtures/answers.json](#testsfixturesanswersjson)
- [3. The learner model, policies, test forms, evaluation, analysis, simulation, and the learner client](#3-the-learner-model-policies-test-forms-evaluation-analysis-simulation-and-the-learner-client)
  - [src/model/elo.ts — the learner model](#srcmodelelots--the-learner-model)
  - [src/model/curriculum.ts — order and prerequisites](#srcmodelcurriculumts--order-and-prerequisites)
  - [src/model/policy.ts — choosing the next question](#srcmodelpolicyts--choosing-the-next-question)
  - [src/model/testForms.ts — parallel pre/post-test forms](#srcmodeltestformsts--parallel-prepost-test-forms)
  - [src/model/evaluate.ts — metrics, held-out split, baselines, CSV](#srcmodelevaluatets--metrics-held-out-split-baselines-csv)
  - [src/model/datasets.ts — public data sets](#srcmodeldatasetsts--public-data-sets)
  - [src/model/analysis.ts — the pre-registered analysis](#srcmodelanalysists--the-pre-registered-analysis)
  - [src/model/simulate.ts — synthetic learners and the simulation study](#srcmodelsimulatets--synthetic-learners-and-the-simulation-study)
  - [src/model/mastery.ts — mastery rules and how they are judged](#srcmodelmasteryts--mastery-rules-and-how-they-are-judged)
  - [src/model/conceptGraph.ts — a concept's inside, and whether an idea is an atom](#srcmodelconceptgraphts--a-concepts-inside-and-whether-an-idea-is-an-atom)
  - [src/model/atoms.ts — skills made of atoms, and BKT on each](#srcmodelatomsts--skills-made-of-atoms-and-bkt-on-each)
  - [src/learner.ts — the browser-side learner client](#srclearnerts--the-browser-side-learner-client)
  - [src/api.ts — the fetch wrapper](#srcapits--the-fetch-wrapper)
- [4. The browser app shell, pages and study UI](#4-the-browser-app-shell-pages-and-study-ui)
  - [index.html](#indexhtml)
  - [public/asset-path.js](#publicasset-pathjs)
  - [src/main.tsx](#srcmaintsx)
  - [src/i18n.tsx](#srci18ntsx)
  - [src/locales/en.ts (and ru.ts, ka.ts)](#srclocalesents-and-ruts-kats)
  - [src/tools.tsx](#srctoolstsx)
  - [src/styles.css](#srcstylescss)
  - [src/pages/HomePage.tsx](#srcpageshomepagetsx)
  - [src/pages/SharedBoardPage.tsx](#srcpagessharedboardpagetsx)
  - [src/components/Modal.tsx](#srccomponentsmodaltsx)
  - [src/components/ui.tsx](#srccomponentsuitsx)
  - [src/components/ToolMenu.tsx](#srccomponentstoolmenutsx)
  - [src/components/ShareBox.tsx](#srccomponentsshareboxtsx)
  - [src/components/CommandPalette.tsx](#srccomponentscommandpalettetsx)
  - [src/pages/BoardPage.tsx](#srcpagesboardpagetsx)
  - [src/components/ShapesPanel.tsx](#srccomponentsshapespaneltsx)
  - [src/components/PlaceValueMat.tsx](#srccomponentsplacevaluemattsx)
  - [src/components/FormulaDialog.tsx](#srccomponentsformuladialogtsx)
  - [src/components/GraphDialog.tsx](#srccomponentsgraphdialogtsx)
  - [src/components/Countdown.tsx](#srccomponentscountdowntsx)
  - [src/components/SpokenMath.tsx](#srccomponentsspokenmathtsx)
  - [src/components/ChartTip.tsx](#srccomponentscharttiptsx)
  - [src/components/StudentPanel.tsx](#srccomponentsstudentpaneltsx)
  - [src/components/TestRunner.tsx](#srccomponentstestrunnertsx)
  - [src/components/PracticeDialog.tsx](#srccomponentspracticedialogtsx)
  - [src/pages/PracticePage.tsx](#srcpagespracticepagetsx)
  - [src/pages/TeacherPage.tsx](#srcpagesteacherpagetsx)
  - [src/components/MasteryHeatmap.tsx](#srccomponentsmasteryheatmaptsx)
  - [src/components/CalibrationChart.tsx](#srccomponentscalibrationcharttsx)
  - [src/components/PrintableTests.tsx](#srccomponentsprintableteststsx)
  - [Cross-cutting notes](#cross-cutting-notes)
- [5. The tool dialogs](#5-the-tool-dialogs)
- [6. Live pieces, the 3D viewer, shapes and the drawing primitives](#6-live-pieces-the-3d-viewer-shapes-and-the-drawing-primitives)
  - [src/live/element.ts — the element encoding](#srcliveelementts--the-element-encoding)
  - [src/math/live.ts — the arithmetic of the pieces](#srcmathlivets--the-arithmetic-of-the-pieces)
  - [src/live/ui.tsx — shared props and widgets](#srcliveuitsx--shared-props-and-widgets)
  - [src/live/pieces.tsx — the eight light pieces](#srclivepiecestsx--the-eight-light-pieces)
  - [src/live/Chance.tsx — the chance experiment](#srclivechancetsx--the-chance-experiment)
  - [src/math/liveGraph.ts — letters, curves and frozen copies](#srcmathlivegraphts--letters-curves-and-frozen-copies)
  - [src/live/LiveGraph.tsx — the graph piece](#srclivelivegraphtsx--the-graph-piece)
  - [src/live/LiveView.tsx — the host](#srcliveliveviewtsx--the-host)
  - [The Excalidraw bridge in src/pages/BoardPage.tsx](#the-excalidraw-bridge-in-srcpagesboardpagetsx)
  - [src/three/spec.ts — the 3D specs and formula captions](#srcthreespects--the-3d-specs-and-formula-captions)
  - [src/three/build.ts — geometry construction](#srcthreebuildts--geometry-construction)
  - [src/three/viewer.ts — renderer, camera, controls, snapshot](#srcthreeviewerts--renderer-camera-controls-snapshot)
  - [src/components/ThreeDialog.tsx — the parts that touch src/three](#srccomponentsthreedialogtsx--the-parts-that-touch-srcthree)
  - [src/math/shapes.ts — the ready-made pieces](#srcmathshapests--the-ready-made-pieces)
  - [src/components/ShapesPanel.tsx — from pieces to elements](#srccomponentsshapespaneltsx--from-pieces-to-elements)
  - [src/math/svg.ts — data URLs and the dark filter](#srcmathsvgts--data-urls-and-the-dark-filter)
  - [src/math/scale.ts — the tick step](#srcmathscalets--the-tick-step)
  - [src/math/chart.ts — the shared SVG builder](#srcmathchartts--the-shared-svg-builder)
  - [src/math/plot.ts — standalone function plots](#srcmathplotts--standalone-function-plots)
  - [src/math/transform.ts — the 2×2 plane transformation](#srcmathtransformts--the-22-plane-transformation)
  - [Pinned invariants (from the four test files)](#pinned-invariants-from-the-four-test-files)
- [7. The maths library, part A: arithmetic, number, algebra, linear algebra](#7-the-maths-library-part-a-arithmetic-number-algebra-linear-algebra)
  - [`src/math/placeValue.ts` — base-ten blocks on a place-value mat](#srcmathplacevaluets--base-ten-blocks-on-a-place-value-mat)
  - [`src/math/division.ts` — long division in three school layouts](#srcmathdivisionts--long-division-in-three-school-layouts)
  - [`src/math/multiply.ts` — five multiplication models](#srcmathmultiplyts--five-multiplication-models)
  - [`src/math/fracop.ts` — fraction arithmetic with bars and the area model](#srcmathfracopts--fraction-arithmetic-with-bars-and-the-area-model)
  - [`src/math/percratio.ts` — percentages and ratios with Singapore bar models](#srcmathpercratiots--percentages-and-ratios-with-singapore-bar-models)
  - [`src/math/models.ts` — the pictorial-model hub](#srcmathmodelsts--the-pictorial-model-hub)
  - [`src/math/mental.ts` — Vedic speed maths, mental division, divisibility, reciprocals and the Major System](#srcmathmentalts--vedic-speed-maths-mental-division-divisibility-reciprocals-and-the-major-system)
  - [`src/math/numtheory.ts` — sieve, factors, Euclid, modular arithmetic, CRT, bases](#srcmathnumtheoryts--sieve-factors-euclid-modular-arithmetic-crt-bases)
  - [`src/math/combinatorics.ts` — counting, Pascal, stars and bars, inclusion–exclusion, special numbers](#srcmathcombinatoricsts--counting-pascal-stars-and-bars-inclusionexclusion-special-numbers)
  - [`src/math/algebra.ts` — linear equations, inequalities, expanding, factoring, quadratics](#srcmathalgebrats--linear-equations-inequalities-expanding-factoring-quadratics)
  - [`src/math/polynomials.ts` — division, theorems, cubics/quartics, binomial, line-and-curve, partial fractions](#srcmathpolynomialsts--division-theorems-cubicsquartics-binomial-line-and-curve-partial-fractions)
  - [`src/math/powers.ts` — index laws, scientific notation, surds, logarithms, exponential/log equations](#srcmathpowersts--index-laws-scientific-notation-surds-logarithms-exponentiallog-equations)
  - [`src/math/sequences.ts` — patterns, arithmetic, geometric, Σ, recurrences](#srcmathsequencests--patterns-arithmetic-geometric-σ-recurrences)
  - [`src/math/identities.ts` — trig identities: exact values, R-form, proofs, equations](#srcmathidentitiests--trig-identities-exact-values-r-form-proofs-equations)
  - [`src/math/functions.ts` — domain/range, composites and inverses, transformations, sketching](#srcmathfunctionsts--domainrange-composites-and-inverses-transformations-sketching)
  - [`src/math/complex.ts` — complex numbers](#srcmathcomplexts--complex-numbers)
  - [`src/math/matrix.ts` — exact matrix arithmetic to LaTeX](#srcmathmatrixts--exact-matrix-arithmetic-to-latex)
  - [`src/math/vectorspace.ts` — span, subspaces, coordinates, Gram–Schmidt, eigenvalues](#srcmathvectorspacets--span-subspaces-coordinates-gramschmidt-eigenvalues)
  - [Cross-module dependency map (part A)](#cross-module-dependency-map-part-a)
- [8. The maths library, part B: geometry, calculus, data, logic, algorithms](#8-the-maths-library-part-b-geometry-calculus-data-logic-algorithms)
  - [src/math/geometry.ts — plane geometry on a grid](#srcmathgeometryts--plane-geometry-on-a-grid)
  - [src/math/euclid.ts — circle theorems, similarity, transformations, solids, constructions](#srcmatheuclidts--circle-theorems-similarity-transformations-solids-constructions)
  - [src/math/coordgeom.ts — coordinate geometry, exactly](#srcmathcoordgeomts--coordinate-geometry-exactly)
  - [src/math/trig.ts — the unit circle, triangles, graphs, equations](#srcmathtrigts--the-unit-circle-triangles-graphs-equations)
  - [src/math/vectors.ts — vectors in 2D and 3D, exactly](#srcmathvectorsts--vectors-in-2d-and-3d-exactly)
  - [src/math/analysis.ts — real analysis made visible](#srcmathanalysists--real-analysis-made-visible)
  - [src/math/derive.ts — differentiation, one rule at a time](#srcmathderivets--differentiation-one-rule-at-a-time)
  - [src/math/integration.ts — integration techniques with every step](#srcmathintegrationts--integration-techniques-with-every-step)
  - [src/math/ode.ts — differential equations](#srcmathodets--differential-equations)
  - [src/math/numerical.ts — numerical methods with every value on show](#srcmathnumericalts--numerical-methods-with-every-value-on-show)
  - [src/math/statistics.ts — probability and statistics pictures](#srcmathstatisticsts--probability-and-statistics-pictures)
  - [src/math/distributions.ts — the normal, t and χ² tails, computed](#srcmathdistributionsts--the-normal-t-and-χ²-tails-computed)
  - [src/math/inference.ts — statistical inference](#srcmathinferencets--statistical-inference)
  - [src/math/applied.ts — applied calculus](#srcmathappliedts--applied-calculus)
  - [src/math/logic.ts — propositional logic](#srcmathlogicts--propositional-logic)
  - [src/math/logicArgue.ts — strengthen / weaken questions](#srcmathlogicarguets--strengthen--weaken-questions)
  - [src/math/logicPuzzles.ts — constraint boards and knights/knaves](#srcmathlogicpuzzlests--constraint-boards-and-knightsknaves)
  - [src/math/graphtheory.ts — graph theory on an edge list](#srcmathgraphtheoryts--graph-theory-on-an-edge-list)
  - [src/math/algo.ts — the Algorithms tool's hub](#srcmathalgots--the-algorithms-tools-hub)
  - [src/math/algoArrays.ts — arrays, data structures, DP, complexity](#srcmathalgoarraysts--arrays-data-structures-dp-complexity)
  - [src/math/algoGraphs.ts — graph and tree pictures](#srcmathalgographsts--graph-and-tree-pictures)
  - [src/math/algoRecur.ts — recursion and backtracking](#srcmathalgorecurts--recursion-and-backtracking)
  - [src/math/algoStrings.ts — string matching](#srcmathalgostringsts--string-matching)
  - [src/math/tactics.ts — problem-solving tactics](#srcmathtacticsts--problem-solving-tactics)
- [9. The server](#9-the-server)
  - [server/index.ts](#serverindexts)
  - [server/http.ts](#serverhttpts)
  - [server/db.ts](#serverdbts)
  - [server/limiter.ts](#serverlimiterts)
  - [server/backup.ts](#serverbackupts)
  - [server/research.ts](#serverresearchts)
  - [server/protocol.ts](#serverprotocolts)
  - [server/dashboard.ts](#serverdashboardts)
  - [server/marking.ts](#servermarkingts)
  - [server/checker.ts](#servercheckerts)
- [10. Build, tooling, scripts, tests, end-to-end tests, CI and deployment](#10-build-tooling-scripts-tests-end-to-end-tests-ci-and-deployment)
  - [Scripts](#scripts)
  - [Tests](#tests)
  - [E2E](#e2e)
- [11. Cross-cutting invariants, conventions and traps](#11-cross-cutting-invariants-conventions-and-traps)
  - [11.1 Things that must never change once a study has started](#111-things-that-must-never-change-once-a-study-has-started)
  - [11.2 Module boundaries](#112-module-boundaries)
  - [11.3 Verdicts and what counts](#113-verdicts-and-what-counts)
  - [11.4 Time and ordering](#114-time-and-ordering)
  - [11.5 Identity and privacy](#115-identity-and-privacy)
  - [11.6 HTTP conventions](#116-http-conventions)
  - [11.7 Rendering conventions](#117-rendering-conventions)
  - [11.8 Things the readers noticed while explaining](#118-things-the-readers-noticed-while-explaining)

## 1. Orientation

### 1.1 What Zeno is

Zeno is one Git repository with three products inside it:

1. **A maths whiteboard.** An Excalidraw canvas with 33 tool dialogs that draw maths pictures (bar models, graphs, constructions, proofs, traces of algorithms), 72 ready-made shapes, and 10 "live pieces" (a clock, dice, a spinner, a ten-frame…) rendered by React inside the canvas. Every picture is an editable object: double-clicking it reopens the dialog with the stored spec.
2. **A practice engine.** 42 skills × 3 levels of generated questions, practised in a panel docked beside the board or on a page of its own (`#/practice`), an answer checker that reads fractions, surds, expressions, sets of roots, inequalities and intervals, worked solutions, and a catalogue of 17 named mistakes.
3. **A research platform.** A class study comparing *adaptive* question choice (an Elo-style learner model aiming at a target chance of success) against a *fixed* curriculum sequence, with randomisation, parallel test forms, a teacher dashboard, CSV exports, a pre-registered analysis, simulations, a power analysis and a dry run through the real server. The thesis in `docs/thesis/` is built on it.

Everything is TypeScript. The browser side is React 19 built by Vite 8. The server is Node 24 with no framework, running the TypeScript sources directly through Node's type stripping and storing everything in one SQLite file through `node:sqlite`. There are six runtime dependencies in total: Excalidraw, MathJax (`mathjax-full`), mathjs, React, ReactDOM and three.js.

### 1.2 The repository map

| Path | Lines | What lives there |
|---|---|---|
| `src/math/` | ~44,000 | Pure TypeScript maths: generators, the checker, exact arithmetic, SVG renderers, worked steps. No React, no Node. Imports only `../locales/en` as a *type*. |
| `src/model/` | ~1,900 | The learner model (`elo.ts`), the two policies (`policy.ts`), the curriculum and prerequisites, test forms, the evaluation harness with PFA, BKT and moving-average baselines and the H1 bootstrap, the mastery rules and how they are judged (`mastery.ts`), a prototype graph of the ideas inside fractions with tests of whether an idea is an atom (`conceptGraph.ts`), H2's comparison in a world whose skills are made of atoms, shared or not (`atoms.ts`), the pre-registered analysis, the simulation worlds, and their seeded generator (`random.ts`). No React, no Node. |
| `src/components/` | ~7,000 | The 33 tool dialogs, the practice dialog (also the docked panel and the practice page's body), the test runner, the teacher widgets, shared UI. |
| `src/pages/` | ~1,300 | Home, Board, SharedBoard, Teacher, Practice. |
| `src/live/` | ~1,050 | Live pieces drawn inside Excalidraw embeddables. |
| `src/three/` | ~980 | The 3D viewer (three.js) for solids, unit cubes and 3D transforms. |
| `src/locales/` | 3 × 4,170 | `en.ts` is the source of truth; `ru.ts` and `ka.ts` are typed against it. |
| `src/main.tsx`, `i18n.tsx`, `tools.tsx`, `learner.ts`, `api.ts`, `styles.css` | ~1,200 | The app shell: hash router, language loading, the tool registry, the student-side learner client with its outbox, the fetch wrapper. |
| `server/` | ~1,300 | `index.ts` (boards, static files, auth), `research.ts` (classes, students, attempts, exports), `protocol.ts` (phases, tests), `dashboard.ts`, `marking.ts` + `checker.ts` (the server re-marks every answer), `db.ts`, `http.ts`, `limiter.ts`, `backup.ts`. |
| `scripts/` | ~1,300 | Build helpers (`copy-assets`, `compress`, the TS resolve hook) and the research CLIs: `evaluate-model`, `simulate-study` (+ worker), `mastery`, `h1`, `analyse-study`, `dry-run-study`, `checker-agreement`, `mistakes`, `import-assistments`, `thesis-figures`, `thesis-pdf`. |
| `tests/` | 41 files, ~6,200 | Node's built-in test runner (40 test files and `fixtures/answers.json`); unit tests of every maths module, the model and baselines, the mastery rules and the H1 test, the analysis, the checker against a 333-answer teacher-marked corpus, the HTTP API against its own documentation, and a dry run of the whole study. |
| `e2e/` | 5 specs | Playwright in Chromium against the built app and a fresh database. |
| `docs/` | | `architecture.md`, `api.md`, `study.md`, the thesis chapters, screenshots, simulation results (CSV). |
| `public/` | | `favicon.svg`, `asset-path.js` (sets `window.EXCALIDRAW_ASSET_PATH = "/"` so fonts come from this server, not esm.sh) and `fonts/` copied from Excalidraw by `scripts/copy-assets.mjs` (git-ignored). |

### 1.3 The layering rule, and how the Docker image enforces it

The rule is: **`src/math` and `src/model` run in both the browser and Node**, so they must import nothing from either environment. `src/model` imports only itself, `../math/practiceSkills.ts` (the skill list) and `../math/distributions.ts` (CDFs for the analysis). `src/math` imports one *type* from `../locales/en` (the dictionary shape, erased at compile time).

The server imports exactly these files from `src/`: `learner.ts` (types), `locales/en.ts` (the words for generating questions when marking), `math/practiceSkills.ts`, `math/practice.ts` (through `marking.ts`), `model/curriculum.ts`, `model/elo.ts`, `model/evaluate.ts` (which brings `model/random.ts` with it), `model/policy.ts`, `model/testForms.ts`. The Dockerfile copies `server/`, `src/model/` and `src/math/practiceSkills.ts` into the image and nothing else from `src/`. `src/math/practice.ts` is *not* copied, because it pulls in `expr.ts` → mathjs and `latex.ts` → MathJax, and the image has no `node_modules`. Instead `npm run build:checker` bundles `server/checker.ts` with its whole dependency tree into `dist-server/checker.js` (Vite in SSR mode with `noExternal: true`, target `node24`), and the image sets `ZENO_CHECKER=/app/dist-server/checker.js`. Outside Docker, `marking.ts` imports the checker from source. CI proves the bundle loads by posting an attempt whose browser verdict is "correct" for the input `-1` to a times-table question and checking the CSV export shows the server's own verdict with `"client":"correct"` kept beside it.

Node runs `.ts` files directly (type stripping, Node ≥ 23.6), which is why every import in `server/` and `src/model/` names its `.ts` extension: plain Node does not guess extensions. Vite tolerates both. For tests and scripts that import browser-style extensionless paths (`"./chart"`), `scripts/ts-register.mjs` registers a resolve hook (`ts-resolve.mjs`) that retries a failed relative extensionless import with `.ts` appended.

### 1.4 Runtime topology

```
browser ──HTTP/JSON──▶ server/index.ts ──▶ SQLite (DATA_DIR/boards.db, WAL)
   │                        │
   │ (same code)            ├── research.ts / protocol.ts / dashboard.ts
   │                        └── marking.ts ──▶ checker (source or bundled)
   ▼
src/model (Elo, policy)        src/model (Elo, policy, testForms, evaluate)
src/math/practice (questions, checker)
```

One Node process, one database file, no external services. HTTPS is a reverse proxy's job (Caddy in the deployment notes). The page loads nothing from a CDN; the CSP allows `connect-src` to `libraries.excalidraw.com` only so that Excalidraw's library browser works, and `font-src https://esm.sh` only because Excalidraw lists its CDN as a fallback after `/fonts`.

### 1.5 The five ideas the whole system rests on

1. **A question is (skill, level, seed).** `exercise(skill, level, seed, words)` is a pure function of a mulberry32 stream seeded by one 31-bit integer. Nothing stores question text. The server can rebuild any question to mark it again; test forms are derived from the class code with FNV-1a and never stored; analyses re-generate questions years later. The cost: a generator must never change what a seed means once a study has started (the `FIRST_SKILLS` list and `SIM_SKILLS` exist for this reason).
2. **The same model code runs on both sides.** The server replays stored attempts into an `EloModel` and keeps it in memory. The browser receives that model's state in the *plan*, rebuilds it with `EloModel.fromState`, and carries it forward after every question with `applyAttempt`, choosing the next question with the same `choose()` the simulations use. Class practice survives a dropped connection. The server's only guarantee about *choice* is that the policy claimed matches the student's condition.
3. **Verdicts are four words, and "form" does not count.** `verdictOf` maps the checker's `{ok, why, close}` to `correct | form | close | wrong`. A form answer (right value, wrong notation) is sent back and is invisible to the miss counter and the model. The model learns once per question, from the first *counted* answer, through one function `evidence()` used by browser, server, dashboard and offline evaluation alike.
4. **The browser is a claim; the server re-marks.** Every answer in every attempt and every test response is marked again on the server with the same checker. The stored verdict is the server's; the browser's is kept beside it where it differed, and `remarked` counts the disagreements. Summary columns (`first_correct`, `wrongs`, `retries`) are computed from the server's verdicts.
5. **Time is judged by windows, not by trust.** The teacher's phase changes are logged; an answer is on time if it arrives inside a window of its phase or within five minutes after one closes. A late answer is stored with `late = 1`, never refused, because an offline tablet must not lose work. Only a test that has never started is refused outright.

### 1.6 How to read this document

Sections 2 to 10 go folder by folder and then file by file in source order, naming every exported function and every non-trivial internal one, with `path:line` references. The order follows a practice question through the system: the maths and checker (2), the model and policies (3), the browser client and pages (4), the tool dialogs (5), the live pieces and drawing primitives (6), the maths library in two parts (7, 8), the server (9), and the build, scripts, tests and deployment (10).


## 2. The practice engine: questions, the checker, the expression parser

The practice engine turns a `(skill, level, seed)` triple into a question, judges a typed answer against it, names the mistake a wrong answer betrays, and hands the worked solution to the tool that draws it. Everything is deterministic: the same seed gives the same question in every language, on the server and in the browser. The code lives in nine files under `src/math/`. `practice.ts` holds the types, the 42 generators and the checker; `practiceSkills.ts` the skill list; `practiceSolve.ts` the lazy dispatch to the drawing tools; `mistakes.ts` the catalogue of named slips; `expr.ts` the expression parser, evaluator, LaTeX printer and simplifier; `latex.ts` MathJax rendering; `text.ts`, `random.ts` and `fraction.ts` the small dependency-free helpers.

### src/math/practice.ts

#### Imports and the core types (lines 1–243)

The header comment (`src/math/practice.ts:1-3`) states the contract: questions from a seed, answers checked up to equivalence "in the form the question asks for", and a worked solution from the tool that covers the topic. The imports (`:4-14`) pull `REL_TEX`, `splitRel` and `Rel` from `algebra.ts` (inequality symbols), `antiderivative` from `applied.ts`, drawing primitives `C, esc, fill, FONT, r2, W, wrap` from `chart.ts`, `derive` from `derive.ts`, `circleFigure`/`solidFigure` from `euclid.ts`, the expression engine from `expr.ts`, `Frac`, the `tUpper`/`zUpper` quantile functions from `inference.ts`, `latexToSvg`, the `MistakeId` type and the skill tables. Line 16 re-exports `ALL_SKILLS, AREAS, SKILLS, areaOf, Area, SkillId` so callers import one module.

`Level = 1 | 2 | 3` and `LEVELS` (`:17-18`). `SolutionKind` (`:21`) is the closed set of 18 tools that can draw a worked solution: `model, algebra, powers, coord, trig, deriv, applied, statistics, comb, nt, inference, vectors, sequences, functions, identities, polynomials, euclid, numerical`. `Format` (`:22-24`) is the 16-valued hint shown under the answer box: `number, exact, fraction, dp2, dp3, roots, point, vector, interval, line, expr, factors, antiderivative, primes, inequality, standard`; the English wording of each is in `PracticeWords.formats` (e.g. `roots` → "every solution, separated by ; e.g. 2; -3").

`Bound = { v: number; closed: boolean }` (`:27`) is one end of an inequality's solution set. `Trap` (`:29`) is `{ id: MistakeId; a: Answer; vars?: Record<string, string | number> }`: the answer a named mistake would produce, plus the numbers its hint template names.

`Answer` (`:30-39`) is a discriminated union, each variant optionally carrying `traps`:

- `{ k: "num"; v; tol; lowest?; surd?; std? }`: one number. `lowest` demands a fraction in lowest terms, `surd` a fully simplified surd, `std` standard form `a × 10ⁿ` (and switches the comparison to relative tolerance).
- `{ k: "set"; vs; tol }`: an unordered multiset of numbers (roots).
- `{ k: "tuple"; vs; tol }`: an ordered list (a point, a vector, an interval).
- `{ k: "expr"; e: E; mode?: "factor" | "expand" | "plusC" | "line" }`: an expression in x compared by sampling; `mode` adds a form requirement (`factor`, `expand`), tolerance of an additive constant (`plusC`), or nothing beyond stripping `y =` (`line`).
- `{ k: "primes"; n }`: a prime factorisation of `n`.
- `{ k: "ineq"; lo: Bound | null; hi: Bound | null }`: a solution set with a missing end unbounded.

`Exercise` (`:41-60`): `skill, level, seed`, `prompt` (the instruction in words), `q` (LaTeX, `""` when the prompt says it all), optional `pic` (`{ svg: (x, y) => string; h; w }`, "with its height and the width it can take up", `:49-50`, used by the right-triangle, circle and solid questions; the card renderer reads only `svg` and `h`, while `w` sizes the standalone figure the practice panel and page draw beside the question text, see `PracticeDialog.tsx`), `answer`, `show` (the answer in LaTeX), `plain` (a typed answer the checker accepts; the tests round-trip it), `format`, optional `solution: { kind: SolutionKind; spec: unknown }` and optional `steps: string[]` (LaTeX lines when no tool draws the solution).

`PracticeWords` (`:62-243`) is the full locale bundle the engine needs: `bad, onlyX, tooBig` (the three parser messages, which makes `PracticeWords` a structural `ExprMessages`), `skills`, `levels`, `mixed`, 96 prompt templates under `prompts` (`times` through `ineqWord`, `:70-165`), the die `events`, `marbleNames`, `formats`, `mistakes: Record<MistakeId, string>` (hint templates with `{r}`, `{big}`, `{L}`, `{R}`, `{b}`, `{p}` placeholders), the twelve `reasons` (`empty, unreadable, notLowest, notSimplified, notFactored, notExpanded, notPrime, count, rounding, notNumber, notIneq, notStandard`), `answer`/`answers` and a large `ui` block for the student page.

#### rngOf and mulberry32 (lines 247–266)

`Rng` (`:247`) is `{ next, int, nz, pick, sign }`. `rngOf(seed)` (`:249-266`) is mulberry32: state `a = seed >>> 0 || 1` (seed 0 becomes 1 so it never sticks), and each `next()` adds `0x6d2b79f5`, mixes with two `Math.imul` rounds and divides by 2³² to give `[0, 1)`. `int(lo, hi)` is inclusive on both ends (`lo + floor(next() * (hi − lo + 1))`), `nz(lo, hi)` loops until it draws a non-zero, `pick(a)` indexes by `floor(next() * a.length)`, and `sign()` is `−1` below ½. Because every generator consumes draws in a fixed order, changing a range inside a generator changes every later question for that seed; the tests pin only seed-determinism, not specific numbers.

#### Shared expression helpers (lines 270–334)

- `gcd` (`:270-275`): Euclid on absolute values.
- `fr(n, d = 1)` (`:276`): `new Frac(n, d)`.
- `polyStr(cs, v = "x")` (`:278-288`): coefficients given lowest power first (`[c0, c1, c2]`), printed highest first; zero coefficients dropped, coefficient 1 omitted before a letter, `k > 1` written `x^k`; signs joined as ` + `/` - ` with a leading `-` for a negative first term; returns `"0"` for an all-zero list. This is the text source for almost every polynomial the engine makes, and it is the text the parser later reads back.
- `pmul(a, b)` (`:290-294`): convolution of coefficient lists.
- `bracket(a, b)` (`:296`): `"(ax + b)"` via `polyStr([b, a])`.
- `T(src)` (`:297`): `tex(parseE(src))`, the route from a text source to display LaTeX.
- `plainFrac(f)` (`:299`): `"3/4"` or `"-2"`.
- `surdTex(p, q, m)` (`:301-307`): `p + q√m` in LaTeX. `m = 1` prints the rational `p + q`; a fractional `q` becomes `\frac{n\sqrt{m}}{d}`; `p = 0` prints just `±root`.
- `num(v, tol = 1e-9, extra)` (`:308`): the `"num"` answer constructor.
- `dp(v, d)` (`:309`): `v` rounded to `d` places as a string (trailing zeros dropped by `String`).
- `plainE(e)` (`:311-334`): an `E` tree back to text `parseE` accepts: negative numbers and fractions bracketed, sums and products fully bracketed and joined with ` + `/` * `, powers as `(b)^(e)`, functions as `f(arg)`, `log` as `log(...)` for base 10 or `log_b(...)`, and a `d` node (an unapplied derivative) rendered as its argument.

#### Order-of-operations machinery (lines 339–395)

The `order` skill needs to evaluate the same string both correctly and as a named mistake would. `OrderMode` (`:339`) is `"right" | "leftToRight" | "mulBeforePow" | "grouped"`. `PREC` (`:341-349`) gives each mode its precedence table: `right` is the usual (`+ − 1, × ÷ 2, ^ 3`); `leftToRight` flattens the four operations to 1 and keeps `^` at 3; `mulBeforePow` puts `*` at 3 above `^` at 2.5 (so `3·2²` is `(3·2)²`); `grouped` keeps the right precedences but makes every operator right-associative (so `a − b − c` is `a − (b − c)`).

`orderTree(src, mode)` (`:351-373`) tokenises with `/\d+|[-+*/^()]/g` and runs precedence climbing: `atom()` reads a number or a bracketed sub-expression (marking an operator node `par: true` so the brackets are printed back), `expr(min)` loops while the next operator's precedence is at least `min`, recursing with `prec` (right-associative: `^` always, everything in `grouped` mode) or `prec + 1`. `orderApply` (`:374`) and `orderValue` (`:375`) evaluate. `orderStep` (`:377-382`) performs exactly one operation, the leftmost innermost reducible node, yielding the next line of working. `orderTex` (`:384-389`) prints with `\times` and `\div`, `^{}` for powers, brackets where `par` is set, and negative values in brackets except at the very top so `4 × (−3)²` cannot be misread. `ORDER_FORMS` (`:391-395`) lists the templates per level with letters `a`–`d` as number slots; level 1 has eight two- or three-operation shapes (`a + b * c`, `a / b * c`, …), level 2 seven with brackets and squares (`(a + b) ^ 2 / c`, `c * a ^ 2`), level 3 six nested ones (`a - 2 * (b - c) ^ 2`, `(a * b - c) / d`). The comment and a test pin that `a ÷ b(c + d)` never appears.

#### Rounding helpers (lines 401–413)

A decimal is held as a whole mantissa `m` at `p` decimal places so rounding is exact. `roundM(m, p, k)` (`:401`) rounds to `k` places (negative `k` is tens, hundreds), half up, returning a mantissa still at `p` places. `cutM` (`:403`) floors instead (truncation). `stagesM` (`:405-409`) rounds one digit at a time from the last place up to `k`: the double-rounding slip, where `7.349 → 7.35 → 7.4`. `fmtM(m, p, k = p)` (`:411`) prints with `min(k, p)` decimals (none for `k ≤ 0`, never more than the `p` the mantissa holds). `tidy(v)` (`:413`) strips float dust via `toFixed(10)`.

#### GENS, the generator table, and exercise() (lines 441–443, 2203–2217)

`Gen = (r: Rng, L: Level, w: PracticeWords) => Omit<Exercise, "skill" | "level" | "seed">` (`:441`). `GENS: Record<SkillId, Gen>` (`:443`) has exactly one entry per skill in `practiceSkills.ts`; TypeScript enforces completeness. `exercise(skill, level, seed, w)` (`:2213-2217`) first calls `exprMessages(w)` so parser errors come out in the user's language, builds the RNG and spreads the generator's result under `skill, level, seed`. `toFrac(v)` (`:2204-2210`) recovers a fraction from a decimal by trying denominators 1..1000 within `1e-9`, falling back to `round(v·10⁶)/10⁶`; the tangent, inequality and trap-input code use it to print gradients and bounds as fractions.

Each generator is described below by area, in the order of `SKILLS`. Ranges are inclusive. "nz" means `r.nz`, a non-zero draw.

#### Number area: times, integers, order, fractions, percent, rounding, hcf, primes

**times** (`:444-447`). L1: `a ∈ [12, 99] × b ∈ [3, 9]`; L2: both `[12, 99]`; L3: `a ∈ [101, 999] × b ∈ [12, 99]`. `q` is `a \times b`, the answer `num(a·b)`, format `number`. Solution: the `model` tool with `{ type: "multiply", style: "area", a, b, step: 999 }`, the area model with every step shown.

**integers** (`:1920-1969`). A local `out()` builds a `number` answer with optional traps and `steps`. L1 (`a ∈ [1, 20]`): kind 0, `−a ± b` with `b ∈ [2, 20]`; kind 1, `a − b` with `b = a + [1, 12]` (crossing zero), step `a − b = −(b − a)`; kind 2, `a + (−b)`, `b ∈ [1, 20]`. The prompt is the generic `prompts.times` ("Work out"). L2: kind 0, `a − (−b)` with `a` nz `[−15, 15]`, `b ∈ [2, 15]`, answer `a + b`, trap `subNeg` = `a − b` with `vars { b }`; kind 1, a temperature rising or falling (`intRise`/`intFall`, `a ∈ [−12, 8]`, `b ∈ [3, 15]`, the prompt showing `a` with a Unicode minus); kind 2, `intDiff` "how many degrees warmer is b than a" with `a = −[2, 15]`, `b ∈ [1, 20]`, answer `b − a`, trap `subNeg` = `b + a` with `vars { b: −a }`. L3: `a, b = [2, 12] × sign`, with `a` negated if both came out positive; kind 0 `a × (b)`; kind 1 `ab ÷ (b) = a`; kind 2 redraws `a, b ∈ [2, 9] × sign`, `c ∈ [2, 15]`, asks `a × (b) − (−c) = ab + c`, trap `subNeg` = `ab − c`. Negatives on the right of an operator are bracketed by `par()`. All have `steps`, no tool solution.

**order** (`:1971-2002`). Picks a template from `ORDER_FORMS[L]`, fills letters with `[2, 12]` at L1 or `[2, 9]` otherwise, builds the `right` tree and the chain of `orderStep` lines, and accepts the draw only if every intermediate leaf is an integer (so each `÷` is exact) and `|value| ≤ 999`; it gives up after 400 tries. Traps: `leftToRight`, `mulBeforePow` (only when the template has `* atom ^`, tested by `/\* (\w|\([^()]*\)) \^/`) and `grouped`, each evaluated in its mode and kept if finite, different from the right value and not already present. `q` is `orderTex(tree)`, `steps` the lines with `= ` prefixes, answer `num(v)` with traps, format `number`.

**fractions** (`:449-488`). `op` is `+`/`−` at L1, any of `+ − × ÷` otherwise. `part()` draws `d ∈ [2, 9]` (L1) or `[2, 12]`, `n ∈ [1, d − 1]`, and at L3 a whole part `[1, 3]`, giving `f = (whole·d + n)/d`. At L1 with probability ½ the second denominator is the first or twice it. For subtraction the larger operand goes first. Traps: for `+` with no whole parts, `addAcross` = `(a.n + b.n)/(a.d + b.d)` with `vars { r, big }` (the hint says the sum is smaller than the larger addend); for `÷`, `flipFirst` = `b ÷ a` when that differs from the answer. `show` adds the mixed-number form when the result is improper; `plain` is `plainFrac(res)`; answer `num(res, 1e-9, { lowest: true })`, format `fraction`. Solution: `model` `fracop` with the operands written `"1 3/4"` style and `step: 99`.

**percent** (`:490-508`). `P()` builds the `model` `percratio` spec. L1: `p ∈ {5, 10, 15, 20, 25, 30, 40, 60, 75}`, `a = 20 × [2, 30]` (40..600), answer `p·a/100`, prompt `percentOf`. L2: `p ∈ {5, …, 50}`, direction `up` random, `b = a(100 ± p)/100`, prompt `percentChange {a, b}`, answer `±p`, shown `v\%`, plain `v%` (the checker strips `%`). L3: reverse percentage, `now = a(100 + p)/100`, prompt `percentReverse {p, a: now}`, answer `a`. Format `number` throughout.

**rounding** (`:2004-2131`). `rounded(m, p, k, prompt)` (`:2006-2017`) computes `want = roundM` and adds traps that differ from it: `truncated` (`cutM`), `doubleRound` (`stagesM`), and for `k < 0` `placeLost` = `want / 10^(p−k)` (4,360 typed as 436). `noTie(lo, hi, p, k)` (`:2019-2024`) draws a mantissa whose dropped digits are not exactly a half and whose last digit is non-zero, so the question never hinges on the half-way convention. L1, half: round a whole `m ∈ [1000, 99999]` to `k ∈ {−1, −2, −3}` (tens, hundreds, thousands; prompts `roundTo10/100/1000`); else `m ∈ [1001, 99999]` at `p = 3` (1.001..99.999) to `k ∈ {1, 2}` places (`roundDp1/2`). L2 kind 0: significant figures `s ∈ [1, 3]`; half the time a whole number with `[4, 6]` digits rounded to `k = s − digits`, else `0.0xxxx` (`m ∈ [1001, 9999]`, `p = 5`) rounded to `k = 1 + s`; prompts `roundSf1`/`roundSf`. Kind 1: write in standard form: `mant ∈ [101, 999]` (1.01..9.99), `e ∈ [4, 8]` or `−[2, 6]`; the number is written out in full (`text`), answer `{ ...num(n), std: true }`, `show` `m \times 10^{e}`, `plain` `m*10^e`, format `standard`. Kind 2: multiply two standard-form numbers `(A/10 × 10^m1)(B/10 × 10^m2)`, `A, B ∈ [11, 99]`, `m1, m2 ∈ [−6, 9]`, renormalising when the mantissa reaches 10; three `steps`. Kind 3: estimate `x × y` by rounding each to 1 s.f., `x = [110, 989]/100`, `y = [110, 989] × 10^[−1, 1]`; `sf1` returns both the rounded and the floored leading digit, and the floored product is the `truncated` trap when it differs. L3, 70 %: an error bound: precision `whole`/`dp1`/`ten` (unit 1, 0.1, 10), `x` drawn to fit, low or high bound `x ∓ unit/2`, trap `fullUnit` = `x ∓ unit` with `vars { p }` naming the precision; else `boundTotal`: `n ∈ [3, 12]` items each `x ∈ [5, 40]` to the nearest whole, greatest total `n(x + 0.5)`, trap `fullUnit` = `n(x + 1)`. All `steps`-based.

**hcf** (`:510-522`). `g ∈ [6, 30]` at L3 else `[2, 12]`; `m, n ∈ [2, 15]` (L3) or `[2, 9]`, distinct and coprime; `a = gm, b = gn`. L2 asks the LCM `gmn` (prompt `lcm`); L1 and L3 the HCF `g`. Format `number`; solution `nt` `{ topic: "gcd", mode: "euclid", a, b, c: "1" }`.

**primes** (`:524-557`). Prime pool `{2,3,5,7}` / `+11` / `+13` and limit 100 / 1000 / 10000 by level. It multiplies random primes until the next would exceed the limit, accepting if at least 2 (L1) or 3 factors went in, else restarting. The factorisation `pf` is recomputed by trial division over the pool. Answer `{ k: "primes", n }`, `show` `2^{3} \cdot 5`, `plain` `2^3 * 5`, format `primes`; solution `nt` `{ topic: "factor", n }`.

#### Algebra area: linear, inequalities, expand, factor, quadratic, simultaneous, polynomials, indices, logs, surds, sequences, series, functions

**linear** (`:559-588`). L1: `ax + b = c` with `a ∈ [2, 9]`, `x` nz `[−9, 9]`, `b` nz `[−15, 15]`, `c = ax + b`; L2: `ax + b = cx + d`, `a ∈ [2, 9]`, `c ∈ [1, 9] ≠ a`, swapped with probability ½, `x` nz `[−9, 9]`, `b ∈ [−12, 12]`, `d = (a − c)x + b`; L3: `a(x + b) = cx + d` with `a ∈ [2, 6]`, `b` nz `[−6, 6]`, `c ∈ [1, 9] ≠ a`, `d ∈ [−12, 12]`, so `x = (d − ab)/(a − c)` is a fraction. `q` renders each side through `T`; answer `num(x)`, `show` `x = …`, `plain` `plainFrac(x)`, format `exact`; solution `algebra` `{ topic: "linear", eq, method: "factor" }`.

**inequalities** (`:2133-2199`). `ends(rel, v)` (`:2136`) turns `x rel v` into `[lo, hi]`. `result()` (`:2137-2143`) attaches two traps: `boundary` (both ends with `closed` toggled) and, when the solving step flipped the sign, `noFlip` first (`{ lo: hi, hi: lo }`: the unflipped answer `x > 4` for the true `x < 4`). Answer `{ k: "ineq", lo, hi }`, `show` `ineqTex`, `plain` `ineqPlain`, format `inequality`, solution `algebra` `{ topic: "inequality", eq }`. L1 and L2 draw `rel ∈ {<, <=, >, >=}` and `x0` nz `[−9, 9]`. L1: `a ∈ [2, 9]`, `b` nz `[−15, 15]`; half `ax + b rel c`, half `ax + b rel cx + d` with `c ∈ [1, a − 1]` so the net coefficient stays positive (no flip). L2: `a ∈ [2, 9]`, `b ∈ [−12, 15]`; half `b − ax rel c` (coefficient `−a`), half `ax + b rel cx + d` with `c = a + [1, 5]` (net coefficient negative): both flip. `final = coef < 0 ? FLIP[rel] : rel`. L3, 60 %: a double inequality `L1 r1 ax + b r2 L2` with `x1 ∈ [−8, 4]`, `x2 = x1 + [2, 8]`, `a ∈ [2, 5]` negated 35 % of the time, `b ∈ [−9, 9]`, `r1, r2 ∈ {<, <=}`; for negative `a` the outer values and closedness swap. Else a word problem (`ineqWord`): budget `m = 50 × [4, 20]`, fixed cost `p ∈ [60, 95]`, unit price `b ∈ [15, 45]`, answer `floor((m − p)/b)` as a `number`, solution the inequality `bn + p <= m`.

**expand** (`:590-622`). L1: `(x + a)(x + b)`, `a, b` nz `[−9, 9]`; trap `noMiddle` = `x² + ab` (when `a + b ≠ 0`) with `vars { L: (1 + a)(1 + b), R: 1 + ab }`, the values at `x = 1` the hint quotes. L2: `(ax + b)(cx + d)`, `a ∈ [2, 5]`, `b` nz `[−7, 7]`, `c ∈ [1, 5]`, `d` nz `[−7, 7]`. L3 kind 0: `(ax + b)²`, `a ∈ [2, 5]`, `b` nz `[−7, 7]`, trap `squareTerms` = `a²x² + b²` with `vars { L: (a + b)², R: a² + b² }`; kind 1: `(x + a)(x² + bx + c)`, `a, b` nz `[−5, 5]`, `c` nz `[−6, 6]`; kind 2: `k(x + a)(x + b)`, `k = [2, 5] × sign`, `a, b` nz `[−6, 6]`. Answer `{ k: "expr", e: parseE(polyStr(cs)), mode: "expand", traps }`, `show`/`plain` the expanded text, format `expr`, solution `algebra` `{ topic: "expand", eq: src, method: "factor" }`.

**factor** (`:624-659`). L1: `(x + a)(x + b)`, nz `[−9, 9]`. L2: `(px + a)(qx + b)` with `p ∈ [2, 3]`, `q ∈ [1, 2]`, `a, b` nz `[−7, 7]`, rejecting `gcd(p, a) ≠ 1`, `gcd(q, b) ≠ 1` (a common factor inside a bracket) and `pb = qa` (proportional brackets). L3 kind 0: difference of squares `(px − a)(px + a)`, `p ∈ [1, 5]`, `a ∈ [1, 9]`, coprime; kind 1: `k(x + a)(x + b)`, `k ∈ [2, 5]`, `a, b` nz `[−6, 6]`; kind 2: `kx(px + a)`, `k ∈ [1, 4]`, `p ∈ [2, 6]`, `a` nz `[−9, 9]`, `gcd(p, a) = 1`. The question shows the expanded polynomial; answer `{ k: "expr", e, mode: "factor" }`, `show`/`plain` the factored text, format `factors`, solution `algebra` `{ topic: "factor", eq: ex, method: "factor" }`.

**quadratic** (`:661-704`). L1: roots `p, q ∈ [−9, 9]`, distinct, monic `(x − p)(x − q)`. L2: `a ∈ [2, 3]`, `p` nz `[−7, 7]` coprime to `a`, `q ∈ [−6, 6]`: `(ax − p)(x − q)`, roots `p/a` and `q`. Roots sorted ascending; answer `{ k: "set", vs, tol: 1e-9 }`, `show` `x = …, \; x = …`, `plain` `p; q`, format `roots`, solution `algebra` `{ topic: "quadratic", eq, method: "factor" }`. L3: `x² + bx + c` with `b ∈ [−8, 8]`, `c` nz `[−10, 10]`, discriminant `D > 0` and not a perfect square; roots `(−b ∓ √D)/2`; answer set with `tol: 0.0051` (two decimals suffice), `show` the surd form via `surdTex` with the first sign replaced by `\pm` and `≈` to 2 d.p., `plain` to 3 d.p., method `formula`.

**simultaneous** (`:706-726`). `x, y ∈ [−6, 6]`; coefficients nz in `[−5, 5]` (L3: `[−9, 9]`); at L1 `b2 = ±b1` so one addition eliminates `y`; determinant must be non-zero. Each equation prints as `ax ± |b|y = value`; `q` is a `\begin{cases}` block; answer `{ k: "tuple", vs: [x, y], tol: 1e-9 }`, `plain` `x = …; y = …`, format `point`, solution `coord` `{ topic: "meet", src: "e1; e2" }`.

**polynomials** (`:728-771`). L1, remainder theorem: cubic coefficients `[nz[−6, 6], [−5, 5], [−5, 5], pick{1,1,2,−1,3}]`, divisor `x − a` with `a` nz `[−3, 3]`; the remainder `f(a)` by Horner (`reduceRight`); prompt `polyRem` with the divisor shown with a Unicode minus; `q` `f(x) = …`; solution `polynomials` `{ topic: "divide", src: "(p) / (d)" }`. L2: a cubic with rational roots `r1 ≠ r2` nz `[−4, 4]` and `a/b` (`b ∈ {1,1,2}`; for `b = 2`, `a ∈ {−3,−1,1,3,5}` odd; for `b = 1`, `a` nz `[−5, 5]` distinct from `r1, r2`); the prompt is `factor`, answer `expr` mode `factor`, format `factors`, solution topic `solve`. L3: the coefficient of `x^k` in `(ax + b)^n`, `n ∈ [4, 7]`, `a ∈ {1,2,2,3}`, `b` nz `[−3, 3]`, `k ∈ [1, n − 1]`; `C(n,k)·a^k·b^(n−k)` computed multiplicatively; prompt `polyCoef` with a superscript-digit `t`; solution topic `binomial`, src `"(…)^n, x^k"`.

**indices** (`:773-815`). L1 `a ∈ [2, 5]`: kind 0, `a^m · a^n / a^k` with `m ∈ [2, 6]`, `n ∈ [1, 5]`, `k ∈ [max(1, m + n − 8 or 4), m + n]` so the result `a^(m+n−k)` stays at most `2⁸` or `a⁴`; kind 1, `a^(−n)`, `n ∈ [1, 3]`, value `1/aⁿ`, trap `negPower` = `−aⁿ`. L2/L3 pick `(k, d)` from eleven pairs (`2²` … `2⁵`), `base = k^d`, `n ∈ [1, 3]` (`d = 2`) or `[1, 2]`, bumped if divisible by `d`. L2: `base^(n/d) = kⁿ`, trap `powTimes` = `base·n/d` if different. L3: `(P/Q)^(−n/d)` with `(p, qq)` from six pairs, `P = p^d`, `Q = qq^d`, value `qqⁿ/pⁿ`; two `negPower` traps: not inverted `(p/qq)ⁿ` and negated `−(qq/p)ⁿ`. Prompt `evaluate`, format `exact`, solution `powers` `{ topic: "laws", src }`.

**logs** (`:817-861`). L1: `log_b(b^k)` with `b ∈ {2,3,5,10}`, `k ∈ [1, 7]` for `b = 2`, `[1, 5]` for `b = 10`, `[1, 4]` for `b ∈ {3, 5}`. L2 half: `log_b(1/b^k) = −k`, `b ∈ {2,3,10}`, `k ∈ [1, 4]`; else `log_{b^m}(b^n) = n/m` with `b ∈ {2,3}` and `(m, n)` from six pairs; the guard `b^n > 10000 || b^m > 100` that would recurse into `GENS.logs(r, 1, w)` can never fire with those pairs (max `3⁵`, `3³`), so it is dead. L3: `b ∈ {2,3,5,6,10}`, `k ∈ [1, 3]` for `b ≤ 3` else `[1, 2]`; for `b ∈ {6, 10}` a sum `log_b(u) + log_b(v)` with `uv = b^k` from a small table, value `round(log t / log b)`; otherwise a difference `log_b(y·b^k) − log_b(y)` with `y ∈ {2,3,5,6,7}` not a multiple of `b`, value `k`. Format `exact`, solution `powers` `{ topic: "logs", src }`. Base 10 prints as `\log` and parses as `log(...)`.

**surds** (`:863-899`). `M = [2,3,5,6,7,10,11]`. L1: `√(k²m)`, `k ∈ [2, 6]`, answer `num(k√m, 1e-9, { surd: true })`, `plain` `ksqrt(m)`. L2: `m ∈ {2,3,5,6}`, three distinct `c ∈ [1, 5]` with `c0 + c1 − c2 ≠ 0`; `√(c0²m) + √(c1²m) − √(c2²m) = (c0 + c1 − c2)√m`, which may be negative. L3 half: rationalise `a/√b`, `a ∈ [1, 12]`, `b ∈ {2,3,5,6,7}`, regenerating when `a = b`; answer `a/√b` as `(a/b)√b`, `plain` `(a/b)sqrt(b)`. Else `a/(b − √c)`, `a ∈ [1, 6]`, `b ∈ [2, 5]`, `c ∈ {2,3,5,7}`, denominator `b² − c` (never zero, sometimes negative), answer `ab/den + (a/den)√c`, `plain` `(p) + (q)sqrt(c)`. Prompts `surds`/`rationalise`, format `exact`, solution `powers` `{ topic: "surds", src }` with `√` in the source.

**sequences** (`:901-933`). `list()` prints terms with Unicode minus for the prompt; `listSrc` keeps ASCII for the tool. L1 and half of L2: arithmetic `a ∈ [−10, 20]`, `d` nz `[−6, 9]`, four terms shown. L1 asks `u_n`, `n ∈ [10, 40]` (`seqTerm`), solution `sequences` `arith` `"list; un"`. L2 (that half) gives `u_p` and `u_q` (`p ∈ [2, 8]`, `q ∈ [p + 2, 15]`, maybe swapped) and asks `u_{n2}`, `n2 ∈ [16, 30]` (`seqTwo`, subscripts as Unicode digits). L2 other half: geometric `a` nz `[−4, 5]`, ratio `∈ {2, 3, −2, −3}`, `n ∈ [6, 9]`, solution `geom`. L3: quadratic rule `an² + bn + c` with `a ∈ [1, 3]`, `b ∈ [−5, 5]`, `c ∈ [−5, 6]`, five terms shown, `n ∈ [10, 25]`, solution `pattern`. All `number`.

**series** (`:934-995`). L1: arithmetic `S_n`, `a ∈ [−5, 15]`, `d` nz `[−3, 8]`, `n ∈ [10, 30]`, `n(2a + (n − 1)d)/2`. L2 half: geometric `S_n`, `a ∈ [1, 5]`, ratio `{2, 3}`, `n ∈ [5, 8]`; else an infinite geometric series with ratio `p/q` from seven pairs (`1/2, 1/3, 2/3, −1/2, 3/4, −1/3, −2/3`), first term `a = [1, 3] × q³` so the four shown terms are whole, sum `aq/(q − p)` as a `Frac`, answer `lowest`, format `fraction`, solution `geom` `"…; S∞"`. L3 (`N ∈ [10, 30]`), half: the telescoping `Σ_{k=1}^{N} 1/(k(k + m))`, `m ∈ {1,1,2}`, summed exactly in `Frac`, format `fraction`; else `Σ (pk² + qk + c)` with `p ∈ [0, 3]`, `q` nz `[−4, 6]`, `c ∈ [−5, 5]`, the LaTeX body made by `T(polyStr(...))` with `x` replaced by `k`, format `number`; solution `sigma` with a `sum k=1..N …` source. Prompts `serSum`, `serInf`, `serSigma`.

**functions** (`:997-1032`). L1: `f = px + q` (`p` nz `[−5, 5]`, `q ∈ [−6, 6]`), `g = x² + t` or `sx + t` (`s` nz `[−4, 4]`, `t ∈ [−5, 5]`), `a ∈ [−4, 4]`; asks `fg(a) = p·g(a) + q` (`fnComp`), solution `functions` `compose` `"f(x) = …; g(x) = …; fg(a)"`. L2: `a ∈ [−6, 9]`, `f = px + q` with `p ∈ {2,3,4,5,−2,−3}`, `q ∈ [−8, 8]`, asks `f⁻¹(a) = (a − q)/p`. L3: `f = (px + q)/(x + s)` with `p` nz `[−4, 4]`, `q ∈ [−6, 6]`, `s` nz `[−5, 5]`, rejecting `ps = q` (a constant function) and `a = p` (no preimage); `f⁻¹(a) = (q − sa)/(a − p)`. L2/L3 answer `lowest`, format `number` if integral else `fraction`, solution src `"f(x) = …; f^-1(a)"`.

#### Geometry area: line, distance, trigexact, righttri, circles, similarity, volume, identities, vectors, dotangle

**line** (`:1034-1074`). L1/L2: `(x1, y1) ∈ [−5, 5]²`, `dx ∈ [1, 4]`; L1 `dy = nz[−4, 4] × dx` (whole gradient); L2 `dy` nz `[−7, 7]`, and if `dx | dy` then `dx` is bumped (`1 → 2`, else `+1`) and if still divisible `dy += 1`, forcing a fractional gradient. `m = dy/dx`, `c = y1 − m·x1`, `e = fromPoly([c, m])`; answer `{ k: "expr", e, mode: "line" }`, `show` `y = …`, `plain` `y = (m)x + (c)`, format `line`, solution `coord` `{ topic: "line", src: "(x1, y1), (x2, y2)" }`. L3: a perpendicular through `P`: given gradient `m0 = nz[−4, 4] / {1,1,2,3}`, intercept `c0 ∈ [−6, 6]`, `P ∈ [−5, 5]²`; `m = −1/m0`, `c = py − m·px`; `q` shows the given line, prompt `perp`, solution topic `perp` with `"y = …; P(px, py)"`.

**distance** (`:1076-1107`). `A = (x1, y1) ∈ [−6, 6]²`. L2 draws `(dx, dy)` from Pythagorean pairs `(3,4), (5,12), (6,8), (8,15), (4,3), (12,5), (8,6)` with random signs; L1/L3 draw both in `[−7, 7]`, non-zero, and L3 rejects whole hypotenuses. L1 asks the midpoint: tuple `((x1 + x2)/2, (y1 + y2)/2)`, shown as fractions, format `point`. L2/L3 ask `|AB| = √(dx² + dy²)` via `sqrtSplit`: L2 `num(v, 1e-9, { surd: true })` with a whole `show`, format `number`; L3 `num(v, 0.0051, { surd: true })` shown as `k√s ≈ 2 d.p.`, format `exact` (the surd-form check is skipped because the tolerance is loose, see `judge`). Solution `coord` `{ topic: "points", src: "A(..), B(..)" }`.

**trigexact** (`:1109-1137`). Tables `REF` (sin and cos of 0°, 30°, 45°, 60°, 90° as LaTeX and value) and `TAN` (0°, 30°, 45°, 60°). `f ∈ {sin, cos, tan}`; L1 angles `{30, 45, 60}`, L2/L3 `{0, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330}`, rejecting `tan` at 90° and 270°. The reference angle is whichever of `deg, 180 − deg, deg − 180, 360 − deg` lies in the table; the value is computed numerically and zeroed below `1e-12`; `show` takes the table magnitude with the sign of the value. L3 writes the angle in radians as `nπ/d` (`gcd(deg, 180)`). `plain` is derived from `show` by regex: `\sqrt{n}` → `sqrt(n)`, `\frac{a}{b}` → `(a)/(b)`. Answer `num(v)` with the default `1e-9` tolerance, format `exact`, solution `trig` `{ topic: "circle", angle: deg, unit: "deg" }`.

**righttri** (`:1139-1228`). `ang ∈ [20, 70]`, `hyp ∈ [6, 20]`. L1: given hypotenuse and angle, ask opposite (`hyp·sin`) or adjacent (`hyp·cos`); `given = "angHyp"`. L2: `side ∈ [4, 15]`; half the time adjacent and angle are given, asking opposite (`side·tan`) or hypotenuse (`side/cos`) (`angAdj`); otherwise opposite and angle, asking adjacent (`side/tan`) or hypotenuse (`side/sin`) (`angOpp`). L3 asks the angle from two sides `a, b ∈ [3, 15]`: kind 0 opposite and adjacent (`atan(a/b)`), kind 1 opposite `min(a, b)` and hypotenuse `max + [1, 6]` (`asin`), kind 2 adjacent and hypotenuse (`acos`). `spec` (`:1189`) feeds the `trig` tool's `right` topic, filling unknown sides with placeholders it ignores. `pic` (`:1190-1217`) draws the triangle to rough scale (θ bottom-left, right-angle mark bottom-right, width 210 or height 120 capped by `tan θ`), except that an angle steeper than `STEEPEST` = 66° (`:415-416`) is drawn at 66°, since a narrower triangle leaves no room for its label. `angleLabelAt` (`:417-437`) places the orange angle label: of the spots on a 2 px grid where a box 9 px per character wide and 12 px high lies inside the triangle with 3 px to spare, clear of the right-angle mark and at least 20 px from the vertex, it takes the one nearest the bisector 60 px out. The arc's radius is then the distance to the label less 6 px, but no more than the base less 20 px, so it never reaches the mark; the side labels carry the unknown as a red `x`. It is returned as `pic: { svg: pic, h: 160, w: 300 }` (`:1221`). Answer `num(v, 0.0051)`, `show` `x ≈ …` or `\theta ≈ …^\circ`, `plain` 2 d.p., format `dp2`.

**circles** (`:1230-1276`). `make(src, given, ask, v, angle)` builds `full = "src; find ask"`, calls `circleFigure(full)` for the picture (wrapped in a `translate` group, passing on the figure's `h` and `w`, `:1238`), answers `num(v, 1e-6)`, shows `v°` (or a bare length), format `number`, solution `euclid` `{ topic: "circle", src: full }`. L1 (`a ∈ [25, 70]`): angle at the centre (`AOB = 2a → ACB = a`, or the reverse), angle in a semicircle (`CAB = a → CBA = 90 − a`), same segment (`ACB = a → ADB = a`). L2: a cyclic quadrilateral with `A, B ∈ [55, 125]` asking `BCD = 180 − A` or `CDA = 180 − B`; or two tangents from `P` with `APB = P` even in `[30, 100]`, asking `AOB = 180 − P` or `PAB = (180 − P)/2`. L3: alternate segment `TAB = a, SAC = b ∈ [40, 75]` → `BAC = 180 − a − b`; tangents → `OAB = P/2`; or a chord problem from a Pythagorean triple `(m, h, k)` with half-chord and `OM` assigned either way, asking the length `OM` (`angle = false`).

**similarity** (`:1278-1306`). `out()` answers `num(v, 1e-6)` shown to 3 d.p., format `number`, solution `euclid` `{ topic: "similar", src }`. L1: `ABC ~ DEF`, `AB = a = 2 × [1, 5]`, `BC = b ∈ [3, 9]`, scale `k ∈ {2, 3, 1.5, 0.5, 2.5}`, `DE = ak`, ask `EF = bk`. L2: `DE ∥ BC` in triangle `ABC` with `AD = a ∈ [2, 6]`, `DB = b ∈ [2, 8]`, `DE = am`, `m ∈ [1, 3]`, ask `BC = m(a + b)`. L3: a length ratio `(a, b)` from seven pairs and `m ∈ [1, 4]`: area `a²m → b²m` (`scaleArea`), volume `a³m → b³m` (`scaleVolume`), or areas `a² : b²` given and volume asked (`scaleAreaVolume`).

**volume** (`:1308-1381`). `out()` decides from the value: whole answers get `tol 1e-9` and format `number`, others `tol 0.0051`, 2 d.p. and format `dp2`; `pic()` (`:1310-1313`) comes from `solidFigure(src, ask)`, likewise passing on its `h` and `w`; solution `euclid` `{ topic: "solids", src }`. L1: cuboid `l, w, h ∈ [2, 9]`; triangular prism `b = 2 × [2, 5]`, `h ∈ [2, 8]`, `l ∈ [4, 12]` (`bhl/2`); cylinder `r ∈ [2, 8]`, `h ∈ [3, 15]` (`πr²h`). L2: cylinder surface `2πr² + 2πrh`; a cone from a triple `(r, h, l)` asking volume `πr²h/3` or surface `πr² + πrl`; sphere `r ∈ [2, 10]` volume `4πr³/3` or surface `4πr²`; square pyramid `a = 2 × [2, 6]`, `h ∈ [3, 12]`, `a²h/3`. L3 inverts: cylinder `r ∈ [2, 8]`, `V ∈ [100, 900]` → `h`; sphere `V ∈ [100, 2000]` → `r = ∛(3V/4π)`; cone `r ∈ [2, 8]`, `V ∈ [50, 600]` → `h = 3V/(πr²)`; the prompt is `solidDim {V, d}`, `q` is `V = …`, the figure source carries the computed dimension and `ask` marks it.

**identities** (`:1383-1434`). L1: `sin/cos/tan` of `15°, 75°, 105°, 165°`; a table of four magnitudes (`(√6 ± √2)/4`, `2 ± √3`) with LaTeX and plain text for both signs; the match is by `|v|` within `1e-9`; answer `num(v)`, format `exact`, solution `identities` `{ topic: "compound", src: "sin 15°" }`. L2: from a Pythagorean triple (five, with legs possibly swapped) `f A` is given as a fraction (`sin = a/h`, `cos = b/h`, `tan = a/b`) and `g 2A` asked: `sin 2A = 2ab/h²`, `cos 2A = (b² − a²)/h²`, `tan 2A = 2ab/(b² − a²)`; answer `lowest`, format `fraction`, src `"f A = v, A acute; g 2A"`. L3: the maximum of `a sin x + b cos x`, `a, b` nz `[−6, 6]`, `R = √(a² + b²)` shown via `sqrtSplit`; answer `num(R, 1e-9, { surd: true })`, format `exact`, solution topic `rform`.

**vectors** (`:1436-1491`). L1: `a, b ∈ [−6, 6]²`, `p ∈ {1,2,3,−2}`, `q ∈ {1,2,3,−1,−2,−3}`, ask `pa + qb` written in bold; answer `tuple`, `show` a `pmatrix` column, `plain` `(x; y)`, format `vector`, solution `vectors` `basics`. L2: `A ∈ [−5, 5]³`, `d ∈ [−6, 6]³` with at least two non-zero components, `B = A + d`, ask `|AB|`; answer `num(√(d·d), 1e-9, { surd: true })`, `show` `k√s ≈ 2 d.p.` (or the whole number), format `exact` (surd form enforced), solution `basics` with `"A(…); B(…)"`. L3: `a = (k, p, q)`, `b = (m, k, n)` with `p, q, m, n` nz `[−5, 5]`, `m + p ≠ 0`; perpendicular when `k = −qn/(m + p)`; answer `lowest`, format `fraction`, solution `dot` with `k` substituted.

**dotangle** (`:1492-1532`). `nonzero(n)` draws `[−5, 5]ⁿ` with at least two non-zero entries. L1: the dot product of two 3-vectors, `number`. L2: `n ∈ {2, 3}`, redrawn while `|cos θ| > 0.98` or `< 1e-9`; the angle in degrees, `num(v, 0.0051)`, format `dp2`. L3: one of nine `(a0, b0, deg)` pairs with exact angles (30°, 45°, 60°, 90°, 120°, 135°, 150°), the same permutation and sign pattern applied to both (an orthogonal map, so the angle survives), `a` scaled by `[1, 3]`, `b` by `[1, 2]`; `|| 0` turns `−0` into `0`. Answer `num(deg)`, format `number`. All solutions `vectors` `dot`.

#### Calculus area: differentiate, tangent, stationary, integrate, definite, numroots, numint

**differentiate** (`:1533-1549`). L1: a polynomial of degree `n ∈ [3, 5]`, leading coefficient nz `[−6, 6]`, each lower coefficient `[−9, 9]` with probability 0.6 else 0. L2: `a ∈ [2, 5]`, `b` nz `[−6, 6]`, `k` nz `[−4, 4]`, `n ∈ [2, 5]`; one of `(ax + b)^n`, `e^(kx)`, `sin(ax)`, `cos(ax)`, `ax² + |b|/x`, `a√x`, `a e^(kx) + x^n`. L3: `a ∈ [1, 5]`, `n ∈ [2, 4]`; one of `x^n e^x`, `x^n sin x`, `x cos(ax)`, `ln(x² + a)`, `x/(x + a)`, `(x² + a)^n`, `e^(x²)`, `(x² + 1)/(x − a)`, `x ln x`, `e^(ax) sin x`. `d = simp(derive(parseE(src)))`; answer `{ k: "expr", e: d }` (no mode), `show` `\frac{dy}{dx} = …`, `plain` `plainE(d)`, format `expr`, solution `deriv` `{ topic: "rules", src, at: "" }`.

**tangent** (`:1551-1573`). L2: `√x` at `{1, 4, 9, 16}`, `k/x` (`k ∈ [1, 6]`) at `{1, 2, 3, −1, −2}`, or `x³ − kx` (`k ∈ [1, 9]`) at `[−3, 3]`. L1/L3: a polynomial `[[−6, 6], [−6, 6], nz[−4, 4], nz[−2, 2] or 0]` (quadratic or cubic), at `[−3, 3]`. `m = f′(at)`, `y0 = f(at)`, `mF = toFrac(m)`. L1/L2 ask the gradient (`prompts.gradient`): `num(m)`, `show` the derivative-at-a-point notation with `mF.tex()`, format `exact`. L3 asks the tangent line: `c = toFrac(y0 − m·at)`, `e = fromPoly([c, mF])`, answer `expr` mode `line`, format `line`. Solution `deriv` `{ topic: "tangent", src, at }`.

**stationary** (`:1575-1600`). L1: a quadratic `a(x − h)² + c` expanded: `cs = [[−9, 9], −2ah, a]`, `a` nz `[−3, 3]`, `h ∈ [−5, 5]`; stationary at `h`. L2: `f′ = 3k(x − p)(x − q)` integrated: `cs = [c, 3kpq, −3k(p + q)/2, k]`, `p ≠ q ∈ [−4, 4]`, `k ∈ {1, 2}`, with `p + q` even when `k = 1` so the `x²` coefficient is whole. L3 half: `x⁴ − 2a²x² + c`, `a ∈ [1, 3]` → `{−a, 0, a}`; else `x⁴ − 4px³ + c`, `p` nz `[−2, 2]` → `{0, 3p}`. Answer `{ k: "set", vs }`, format `roots`, solution `deriv` `{ topic: "stationary", src }`.

**integrate** (`:1602-1626`). L1: degree `n ∈ [2, 4]` with coefficient `nz[−5, 5] × (k + 1)` at power `k` (so the antiderivative has whole coefficients), lower terms present with probability 0.6. L2: `a ∈ [1, 6]`, `k` nz `[−3, 3]`; one of `a/x²`, `3a√x`, `e^(kx)`, `a/x`, `x² + a/x²`, `2ax + e^x`. L3: `a ∈ [2, 5]`, `b` nz `[−5, 5]`, `n ∈ [2, 4]`; one of `sin(ax)`, `cos(ax)`, `(ax + b)^n`, `e^(ax ± |b|)`, `a cos x − sin(ax)`, `1/(ax + b)`. `Fe = antiderivative(f)!`; answer `{ k: "expr", e: Fe, mode: "plusC" }`, `show` `… + C`, `plain` `plainE(Fe) + C`, format `antiderivative`. No tool: `steps` give the integral and the check `d/dx(F) = simp(derive(Fe))`.

**definite** (`:1628-1680`). L1: `∫_lo^hi (c2x² + c1x + c0)` with `c0, c1 ∈ [0, 6]`, `c2 ∈ [1, 4]`, `lo ∈ [0, 2]`, `hi ∈ [3, 4]`, computed exactly in `Frac` by the power rule. L2: `∫_1^k 1/x² = (k − 1)/k`, `k ∈ [2, 5]`; `∫_0^k √x = 2k^{3/2}/3`, `k ∈ {4, 9, 16}`; `∫_p^q (x³ + c)`, `p ∈ [1, 3]`, `q ∈ [4, 6]`, `c ∈ [1, 6]`. L3 (`k ∈ [2, 4]`): `∫_0^k e^x = e^k − 1`, `∫_1^k 1/x = ln k`, `∫_0^π sin x = 2`, `∫_0^{π/2} cos x = 1`. Answer `num(v, 0.0006)` (3 d.p. accepted), `show` the exact form plus `≈` 3 d.p. unless it is an integer or a fraction, `plain` 6 d.p., format `dp3`, solution `applied` `{ topic: "area", f: src, a, b }`.

**numroots** (`:1682-1731`). L2: fixed-point iteration `x_{n+1} = ∛(ax_n + b)` or `√(ax_n + b)`, `a ∈ [2, 5]`, `b ∈ [1, 9]`, `x0 ∈ [1, 3]`, three steps; prompt `numIterate`, solution `numerical` `iterate`. L1/L3 Newton–Raphson: pick 0 (always at L1) `x³ + bx + c` with `x0 ∈ [1, 3]`, `b ∈ [−2, 4]`, `c` chosen so `f(x0) = nz[−3, 3]` (the first step is small); pick 1 `x² − k`, `k ∈ [3, 40]` non-square, `x0 = ⌊√k⌋`; pick 2 `e^x − 3x` or `− 4x`, `x0 ∈ {0, 2}`; pick 3 one of `x − cos x`, `x + ln x − 2`, `x³ + x − 3`, `x0 ∈ {1, 2}`. L1 takes one step (`numNewton`); L3 thirty-one (`numRoot`). Answer `num(v, 0.0006)`, format `dp3`, solution `newton` `"src; x0 = …; 1 step"` or `"…; 3 dp"`.

**numint** (`:1733-1757`). L1 integrands `x² + c` (`c ∈ [1, 5]`) on `[0, 2]`, `x³` on `[1, 3]`, `√x` on `[0, 4]`, `k/x` (`k ∈ [2, 6]`) on `[1, 3]`, `n ∈ {2, 4}` strips, trapezium rule. L2/L3: `e^x` `[0, 1]`, `ln x` `[1, 3]`, `√(1 + x²)` `[0, 2]`, `1/(1 + x)` `[0, 2]`, `e^(−x²)` `[0, 1]`, `√(1 + x³)` `[0, 2]`, `n = 4`; L3 uses Simpson's rule (`h/3 (y0 + yn + 4·odd + 2·even)`). Answer `num(v, 0.0006)`, format `dp3`, solution `numerical` `integrate` `"src; [a, b]; n = …; simpson|trapezium"`.

#### Data area: average, probability, counting, ci

**average** (`:1759-1812`). `n ∈ [5, 9]` values. L1 (`mean` or `range`): `n − 1` values in `[1, 20]` and a last value forced so the mean is a whole `[5, 15]`, retried until that last value lies in `[1, 25]`. L2 (`median` or `mode`): values in `[1, 30]`; for `mode` the first three are made equal, and if another value also reaches three the generator recurses with the same `r`. L3: sample standard deviation (`n − 1`), values in `[1, 20]`, the first bumped if all are equal. A Fisher–Yates shuffle (`:1792-1795`) then hides where the forced values sit. Answer `num(v, 0.0051)` for `sd` (format `dp2`, `show` `s ≈ …`) else `1e-9` (`number`); `q` lists the data; solution `statistics` `{ topic: "data", values, chart: "dot" }`.

**probability** (`:1814-1858`). L1: one die, event `even {2,4,6}`, `greater than k` (`k ∈ [2, 5]`), `prime {2,3,5}`, `mult3 {3,6}`; `p = |good|/6`, `steps` list the set. L2: two dice summing to `k ∈ [2, 12]`, pairs enumerated, `p = count/36`. L3: `red ∈ [3, 8]`, `blue ∈ [2, 7]`, two reds without replacement `r(r − 1)/(n(n − 1))`; `steps` and a `statistics` `tree` solution with `pA`, `pBA`, `pBnotA` and the localised marble names. All `lowest`, format `fraction`.

**counting** (`:1860-1883`). L1 half: `n!` for `n ∈ [4, 7]` (`lineUp`); else `P(n, k)` with `n ∈ [5, 10]`, `k ∈ [2, 3]` (`podium`). L2: `C(n, k)`, `n ∈ [6, 15]`, `k ∈ [2, 4]`. L3: arrangements of a word from `BANANA, LEVEL, APPLE, PEPPER, LETTER, COFFEE, BALLOON, SUCCESS, STATISTICS`: `len!/Π c!`, `show` the fraction with the repeated-letter factorials. Format `number`, solution `comb` `{ topic: "count", kind: perm|comb|word, n, r, word }`.

**ci** (`:1885-1918`). `conf ∈ {90, 95, 99}`, `tail = (1 − conf/100)/2`. L3: a proportion, `n ∈ {100, 200, 250, 400, 500}`, `x ∈ [0.2n, 0.8n]`, `E = z·√(p(1 − p)/n)`; answer `tuple [p − E, p + E]` with `tol 0.00051`, shown to 3 d.p., format `interval`, solution `inference` `kind: "prop"`. L1: a z-interval with `n ∈ {25, 36, 49, 64, 100}`; L2: a t-interval with `n ∈ [8, 30]` and `tUpper(tail, n − 1)`; mean `m = [20, 80] + {0, 0.5, 0.2, 0.8}`, `s ∈ [2, 15]`, `E = crit·s/√n`; tuple `tol 0.0051`, 2 d.p.

#### The checker: reading an answer (lines 2225–2381)

`Verdict` (`:2225`) is `{ ok; why?; close?; mistake?; hint? }`. The four outcomes the learner model distinguishes (`src/learner.ts:65`, `verdictOf`) are: `ok` → `correct`; `why` set → `form` (sent back, not counted); `close` → `close`; otherwise `wrong`. A `mistake` is always a `wrong`.

`SAMPLES` (`:2227`) are 16 fixed abscissae in `[−4.61, 7.13]` at which expressions are compared.

`bare(s)` (`:2230`) strips a leading `name =` (a letter followed by word characters, so `x =`, `θ =`, `dy =`) and any `%` or `°`. `value(s)` (`:2232-2238`) reads a number: a mixed number `-?(\d+) (\d+)/(\d+)` is summed directly; anything else goes through `parseE` and `evalE(e, NaN)`, so a surviving `x` makes the value `NaN` and the answer unreadable-as-a-number. Decimal commas, `√`, `π`, `×`, `²` are all handled by the parser's `NORMAL` table.

`unwrap(s)` (`:2243-2256`) strips one enclosing bracket pair at a time, but only when the opening bracket's match is the final character: `(2; 3)` and `[76.2, 82.2)` lose their brackets, while `-4 + 2sqrt(3)` keeps the bracket that belongs to `sqrt`. This was the second fault the answer corpus found (`docs/study.md:395-396`).

`parts(s)` (`:2258-2266`) splits a list: on `;` if present; otherwise on a comma followed by whitespace (so `2,5` stays a decimal comma), or on ` and `/` or `, Russian ` и `/` или `, Georgian ` და `/` ან `. Then each part containing exactly one `±`, `+-` or `+/-` becomes two values `a - (b)` and `a + (b)`.

`near(a, b, tol)` (`:2267`) is `|a − b| ≤ tol + 1e-9·max(1, |b|)`: absolute plus a tiny relative slack.

`factorsOf(e)` (`:2270`) flattens nested products. `simplifiedSurd(e, inDen)` (`:2273-2291`) returns false if any `(·)^(1/2)` sits in a denominator (`inDen`, set by negative exponents) or has a base that is not an integer with `sqrtSplit(...).out = 1` (square-free); sums and products recurse. `factored(e)` (`:2293-2307`) requires at least two non-numeric factors, or a single power, or one bracket times a number; every factor must be a number or a linear polynomial (optionally raised to a positive whole power) with whole, collectively coprime coefficients, which rejects `(2x + 4)(x − 3)` and the bare expanded quadratic. `expanded(e)` (`:2309-2313`) fails if any term is a product containing a sum or a power whose base contains a sum.

`stdText(s)` (`:2316`) rewrites `6.3e-4` → `6.3*10^(-4)` and `6.3x10^4` / `× 10` / `· 10` → `6.3*10^4`; applied only when the answer is `std`, since elsewhere `e` is Euler's number. `isStandard(s)` (`:2318`) matches `^-?[1-9](\.\d+)?\*10\^\(?[+-]?\d+\)?$` after removing spaces and normalising minus signs: a mantissa in `[1, 10)` times a power of ten. `hasLetter(s)` (`:2320-2326`) is true when the input parses and evaluates to a finite number at `x = 1.37`: an expression in `x` where a number was wanted.

`INF`/`NEG_INF` (`:2328-2329`) accept `∞`, `inf`, `infinity` with optional sign. `FLIP` (`:2330`) mirrors a relation. `readIneq(src)` (`:2332-2338`) wraps `ineqEnds` in a try/catch returning `null`. `ineqEnds(t)` (`:2339-2365`): if the text is bracketed and contains no relation symbol it is interval notation, split on `;` or `,`, exactly two ends, `[` and `]` closed, `−∞`/`∞` open-ended, both unbounded rejected. Otherwise `splitRel` (from `algebra.ts:228`, which also normalises `≤`/`≥`) yields parts and relations; any `=` returns null; with one relation the single-letter side is the variable, and if it is on the right the relation is flipped (`4 ≤ x` → `x ≥ 4`); with two relations the middle must be the variable and both must point the same way (`-1 < x <= 3`, or `3 >= x > -1` read backwards); anything else (`1 < x > 3`, `x > y`) is null.

`boundTex` (`:2366`), `ineqTex(lo, hi, v = "x")` (`:2368-2373`) and `ineqPlain` (`:2375-2381`) print a one- or two-sided inequality in LaTeX or typed form, bounds as fractions via `toFrac`.

#### The checker: traps, check(), judge() (lines 2383–2545)

`negE(e)` (`:2384`) negates by re-parsing `-(plainE(e))`. `trapsOf(a)` (`:2386-2402`) returns the question's own traps followed by a generic `sign` trap: for a `num`, `−v` unless `v = 0` or a listed trap already equals `−v` (carrying the `std` flag so standard-form inputs still read); for a `set`, the negated set unless it is symmetric; for an `expr`, `negE(a.e)` unless the expression is identically zero on the samples, keeping `plusC` mode but dropping `factor`/`expand`/`line` so form rules do not apply to the trap; nothing for tuples, primes or inequalities. `trapInputs(ex)` (`:2405-2412`) renders each own trap as a student would type it (fractions via `toFrac` when the denominator is ≤ 1000, sets joined by `; `, expressions via `plainE`, inequalities via `ineqPlain`); the mistakes test feeds these back through `check`.

`check(ex, input, w)` (`:2414-2423`): sets parser messages, trims, returns `{ ok: false, why: reasons.empty }` for an empty string, then `judge`s against the real answer. If that is `ok`, has a `why`, or is `close`, it is returned as is: a form message or a near miss is more useful than a mistake name, and this ordering is what the test "a form message or a plain miss is not dressed up as a mistake" pins. Otherwise each trap is judged in turn and the first hit returns `{ ok: false, mistake: id, hint: fill(w.mistakes[id], vars) }`.

`judge(a, input, w)` (`:2426-2514`) applies `stdText` first when the answer is `std`, wraps everything in a try/catch that turns any parser exception into `why: unreadable {s}`, and then switches on the kind:

- `num` (`:2430-2444`). `v = value(src)`. Not finite → `why: notNumber` if `hasLetter` else `unreadable`. Miss: for `std` the comparison is relative (`|v − a.v| > 1e-9·|a.v|`, so `9 × 10⁻¹⁰` is not `7.31 × 10⁻¹²`), otherwise `!near(v, a.v, tol)`; a miss with `tol ≥ 0.0005` that lands within `20·tol` is `{ close: true, why: rounding }` ("Nearly — check your rounding"), else a bare `{ ok: false }`. Hit, then form: `std` and not `isStandard(bare)` → `close` + `notStandard`; `lowest` and the input ends in `n/d` with `gcd ≠ 1` → `close` + `notLowest`; `surd` with `tol < 1e-6` and `!simplifiedSurd(parseE(bare))` → `close` + `notSimplified`. Else `{ ok: true }`.
- `set` / `tuple` (`:2445-2467`). `parts`; for a tuple, if every part is named with `x =`/`y =` and the names are distinct, they are reordered to `x, y`. Any non-finite value → `unreadable`; wrong length → `why: count {n}`. Tuple: element-wise `near`, else the `20·tol` rounding check when `tol ≥ 0.0005`, else wrong. Set: each typed value is removed from a copy of the expected list by `near`; any leftover or unmatched → wrong.
- `expr` (`:2468-2489`). Primes `′`/`'` are deleted; everything up to the last `=` is dropped (`y = …`, `dy/dx = …`); in `plusC` mode a trailing `+ C` or leading `C +` is removed. Both sides are evaluated at the `SAMPLES`, skipping points where either is non-finite; in `plusC` mode the difference must be constant (first difference remembered, later ones `near` it with relative `1e-7`), otherwise the values must agree to relative `1e-7`. Fewer than 4 comparable points → `unreadable`. Then form: `factor` and `!factored(e)` → `close` + `notFactored`; `expand` and `!expanded(e)` → `close` + `notExpanded`.
- `primes` (`:2490-2503`). `·` and `×` become `*`; the product's factors must each be a whole number or a whole number to a positive whole power (anything else → `unreadable`); the product must equal `n` (else wrong); if any base is composite → `close` + `notPrime {n}`.
- `ineq` (`:2504-2509`). `readIneq`; null → `why: notIneq`; both ends must match in value (`near` at `1e-9`) and closedness.

`isPrime` (`:2515-2519`) is trial division. `preview(ex, input)` (`:2522-2545`) renders what the input reads as, in LaTeX, so a typo shows before checking: lists part by part, inequalities via `ineqTex` with the typed variable letter (a lone letter, so `inf` is not taken for one), expressions after the last `=` with ` + C` appended in `plusC` mode, numbers with `stdText` when `std` and mixed numbers as `a\frac{b}{c}`; `null` when unreadable.

Every `why` path, collected: `empty` (blank input, `check`); `unreadable {s}` (parser exception anywhere; a non-finite number in a list; an expression comparable at fewer than 4 points; a non-integer prime factor); `notNumber {s}` (a number asked, an expression in `x` given); `rounding` (within `20·tol` of a loosely-toleranced number or tuple); `notStandard`, `notLowest`, `notSimplified` (right value, wrong form); `count {n}` (wrong number of listed values); `notFactored`, `notExpanded` (equal expression, wrong form); `notPrime {n}` (right product, composite factor); `notIneq` (not an inequality).

#### Worksheets and rendering (lines 2550–2644)

`PracticeSpec` (`:2550`) is `{ area, skill | "mixed", level, seed, count, answers }`. `seedOf(seed, i)` (`:2553`) derives question `i`'s seed by `(imul(seed ^ 0x9e3779b9, 2654435761) + i·7919) >>> 0`. `exercisesOf` (`:2555-2561`) rounds `count` and clamps it to `[1, 30]`; a single question uses `skills[seed % n]` with the spec's own seed (so the student page and a one-question card agree), a sheet walks the area's skills round-robin from `seed % n` with derived seeds. `placeTex` (`:2563-2575`) renders LaTeX with `latexToSvg`, scales it to fit `maxW` (never above `scale`), and positions it with `x`/`y` on the `<svg>`. `line()` (`:2576-2577`) is a text element. `renderPractice` (`:2579-2627`) lays out the title (`skill · level`), numbered prompts wrapped at 66/70 characters, the LaTeX question, the picture, and either an inline answer (single card with `answers`) or a dashed rule and an answer key. `PRACTICE_PRESETS` (`:2629-2631`) are the 15 `area × level` mixed sheets, seed `7 + level`, two questions per skill, with answers. `renderSteps` (`:2634-2644`) stacks `steps` lines as one SVG for questions without a tool.

### src/math/practiceSkills.ts

Kept free of maths so menus and search can list skills without loading generators (`src/math/practiceSkills.ts:1-2`). `Area` (`:3`) is `number | algebra | geometry | calculus | data`; `AREAS` (`:4`) fixes their order. `SKILLS` (`:5-11`) maps each area to its skills: number 8 (`times, integers, order, fractions, percent, rounding, hcf, primes`), algebra 13 (`linear, inequalities, expand, factor, quadratic, simultaneous, polynomials, indices, logs, surds, sequences, series, functions`), geometry 10 (`line, distance, trigexact, righttri, circles, similarity, volume, identities, vectors, dotangle`), calculus 7 (`differentiate, tangent, stationary, integrate, definite, numroots, numint`), data 4 (`average, probability, counting, ci`): 42 in all. `SkillId` (`:12`) is derived from the table. `FIRST_SKILLS` (`:17-23`) is the 38-skill list before `integers`, `order`, `rounding` and `inequalities` arrived in October 2026, which the published simulations ran on and which a class made without a skill list practised. `ALL_SKILLS` (`:24`) flattens in area order. `areaOf` (`:25-27`) is a `Map` lookup because the learner model asks on every prediction.

### src/math/practiceSolve.ts

`renderSolution(sol, t)` (`src/math/practiceSolve.ts:6-47`) is the one place a `SolutionKind` meets its tool. It `await import()`s the module for the kind (so the student bundle does not carry every tool) and calls its `render*` function with the spec cast to `never` (each tool validates its own spec; the generators build specs in the tool's format) and the matching words from the locale `Dict` (`algebraWords`, `powersWords`, `coordWords`, `trigWords`, `derivWords`, `appWords`, `statWords`, `combWords`, `ntWords`, `infWords`, `vecWords`, `seqWords`, `fnWords`, `idWords`, `polyWords`, `euclidWords`, `numWords`; `model` takes none). It returns a `RenderedSvg`.

### src/math/mistakes.ts

`MISTAKES` (`src/math/mistakes.ts:4-22`) is the catalogue of 17 `MistakeId`s, kept apart so locales can be typed without the maths: `sign` (right size, wrong sign; tried on every number, root set and expression answer), `addAcross` (tops and bottoms added), `flipFirst` (the dividend inverted instead of the divisor), `squareTerms` (`(a + b)² = a² + b²`), `noMiddle` (the `x` terms dropped from a product of brackets), `negPower` (a negative exponent read as a negative value), `powTimes` (a fractional exponent read as a multiplication), `subNeg` (`a − (−b)` as `a − b`), `leftToRight`, `mulBeforePow`, `grouped` (order of operations), `truncated`, `placeLost`, `doubleRound` (rounding), `fullUnit` (an error bound of a whole unit), `noFlip`, `boundary` (inequalities). A hint is `fill(w.mistakes[id], trap.vars)` (`practice.ts:2392`); the English templates (`src/locales/en.ts:4078-4094`) use `{r}`/`{big}` for `addAcross`, `{L}`/`{R}` for `squareTerms` and `noMiddle`, `{b}` for `subNeg` and `{p}` for `fullUnit`; the rest have no placeholders. The mistakes test asserts no `{…}` survives in any hint and that every language's text is longer than 20 characters.

### src/math/expr.ts

A small engine for expressions in `x` (`src/math/expr.ts:1-4`): trees, a parser for what pupils type, textbook LaTeX, a shape-preserving `tidy`, a `simp` that collects like terms, exact numbers `a + b√s` and real roots of polynomials.

**Messages** (`:9-14`). `ExprMessages = { bad, onlyX, tooBig }` with English defaults; `exprMessages(m)` swaps the module-level `msgs`, which is why `exercise()` and `check()` call it with `PracticeWords`. `minus(t)` replaces hyphens with `−`.

**Trees** (`:18-47`). `Fn` lists 14 functions (`sin cos tan sec csc cot ln asin acos atan sinh cosh tanh abs`). `E` is a union of `num` (a `Frac`), `var`, `e`, `pi`, `add` (n-ary `ts`), `mul` (n-ary `fs`), `pow`, `fn`, `log` (rational `base`) and `d` (an unapplied derivative marker used by the derivative tool). Constructors `F, N, X, V, E_, add, mul, pow, neg (= −1·a), sub, div (= a·b⁻¹), fn, D`, and the guards `isNum`, `isN(e, n)`. There is no subtraction or division node: `a − b` is `add(a, mul(−1, b))` and `a/b` is `mul(a, pow(b, −1))`.

`has(e, v)` (`:50-67`) tests for a variable. `key(e)` (`:70-93`) is a structural string (`(+ …)`, `(* …)`, `(^ b e)`, `(sin …)`, `(log10/1 …)`), `same` compares keys.

**evalE(e, x, env)** (`:97-132`): numbers via `toNumber`, `x` from the argument, other letters from `env` (default `NaN`), `e`/`π` constants, sums and products folded, powers with one special case (`:116`): a negative base raised to a rational with odd denominator takes the real odd root, sign from the numerator's parity. Functions via a `Record<Fn, fn>`; `log` by change of base; a `d` node is `NaN`.

**Parsing** (`:136-285`). `NORMAL` (`:136-139`) is the pre-pass: Unicode minus and en dash → `-`, `×`/`·` → `*`, `÷` → `/`, `²`/`³` → `^2`/`^3`, `π` → `pi`, `√` → `sqrt`, `∛` → `cbrt`, comma → point (decimal comma), `arcsin` and `sin^-1` → `asin`. `NAMES` (`:140`) is the identifier list sorted longest first so `sinh` wins over `sin`. `bars(s)` (`:143-156`) turns `|u|` into `abs(u)`: a bar opens when none is open or when it follows an operator or `(`, otherwise it closes.

`parseE(src, vars = [])` (`:160-285`). Tokeniser (`:161-188`): numbers `\d+\.?\d*` or `.\d+`; a letter starts the longest matching `NAME` (case-insensitive) or a single-letter identifier; `+ - * / ^ ( ) _` are operators, with `[ ] { }` folded to parentheses; anything else throws `bad {s}`. Grammar (recursive descent, `:198-280`):

```
expr   := term (("+" | "-") term)*            → add(...), "-" wraps neg()
term   := unary (("*" unary) | ("/" unary) | atom-start power)*
unary  := "-" unary | "+" unary | power
power  := atom ("^" unary)?                   → right-assoc; exponent may carry a sign
atom   := "(" expr ")" | number | "pi" | "e" | fn ["^" unary] ["_" number] (group | bareArg) | "x" | listed var
bareArg:= power (number | non-fn identifier → mul power)*
```

Implicit multiplication (`:212`) happens inside `term` whenever the next token can start an atom, binding tighter than `*`/`/` on the left but reading a `power` on the right: `2x^2` is `2·(x²)`, `x/2x` is `(x/2)·x`. Unary minus (`:217`) wraps `neg()` around a `unary`, so `-x^2` is `−(x²)` and `-3x^3` parses as `mul(mul(−1, 3), x³)`: a product of numbers nested as one factor. Functions (`:254-276`): an optional `^` exponent directly after the name (`sin^2 x = (sin x)²`), an optional `_` base after `log`, then a bracketed argument or a `bareArg` (numbers, `x`, `e`, `π` and their powers, so `sin 2x`, `ln x`, `sin x^2 = sin(x²)`); `sqrt` and `cbrt` become powers `1/2` and `1/3`, `exp` becomes `e^…`, `log` without a base is base 10. A letter that is not `x` and not in `vars` throws `onlyX` (`:278`). Leftover tokens or an empty input throw `bad`.

**LaTeX** (`:289-398`). `FN_TEX` maps functions to macros (`abs` is special-cased). `expTex` prints a rational exponent as `n` or `n/d`. `rank(e)` (`:295-302`) orders factors on the page: number 0, `x` and its powers 1, constants (`π`, `e`, powers of numbers/`e`/`π`) 2, functions 3, brackets 4, `d` nodes 5. `splitMul(e)` (`:304-317`) separates a product into coefficient `c`, numerator factors `top` and denominator factors `bottom` (negative exponents inverted). Line 311–312 is the fix for the rendering bug recorded in `docs/study.md:393-394` and `docs/thesis/05-evaluation.md:112`: before it, the nested `mul(−1, 3)` produced by typing `-3x^3` was treated as a non-numeric factor, ranked 4 (a bracket) and sorted after `x³`, so about one question in forty (2.6 % of 22,800 sampled) displayed `x^{3} -3`; now a factor that is itself a product of numbers folds into the coefficient. `tests/practice.test.ts:175-184` pins `tex(parseE("-3x^3 - 2x^2 + 9")) === "-3 x^{3} - 2 x^{2} + 9"` and scans seven generators for the pattern. `negative(e)` (`:319-323`) is true for a negative number or a product with a negative coefficient.

`tex(e)` (`:324-381`): `add` prints each term, negative ones as `- (simpNeg(t))` with brackets if the positive form is itself a sum; `mul` prints `sign`, then `join(top, |c|.n)` or `\frac{join(top, n)}{join(bottom, d)}`, where `join` sorts by `rank` unless a `d` node is present (the derivative rule's order is kept), omits brackets around a lone sum on a fraction line, prefixes the coefficient when it is not 1, and inserts `\cdot` between two numerals or between a bare-argument function and a following letter (`\sin x \cdot x`); `pow` renders negative exponents as `\frac{1}{…}`, `1/2` as `\sqrt{}`, `1/d` as `\sqrt[d]{}`, `|u|^n`, `\sin^{n} x` for whole positive powers of functions other than `ln`, and otherwise `b^{e}` with the base bracketed unless it is a variable, `e`, `π` or a non-negative integer; `fn` prints `|…|` or `\fn argTex`; `log` prints `\log_{base}`; `d` prints `(…)'`. `argTex` (`:382`) brackets anything but a variable or a non-negative integer. `factorTex` (`:383-387`) brackets sums and negative or fractional numbers. `simpNeg(t)` (`:389-396`) returns `−t` with the coefficient negated and ones dropped. `approx(v)` (`:398`) is `nf(v, 4)` with a Unicode minus.

**tidy(e)** (`:403-440`): flattens nested sums and products, drops zero terms and folds numeric factors, returns `0` for a zero coefficient, strips exponents 0 and 1 and base 1, evaluates integer powers of numbers up to `|n| ≤ 12` via `powFrac`, and multiplies stacked whole exponents (`(x²)⁻¹ = x⁻²`); it does not reorder or collect, so a derivative rule's shape survives. `powFrac(b, n)` (`:441-446`) multiplies out and throws `tooBig` beyond `1e12`.

`toPoly(e)` (`:449-490`) converts to `Frac` coefficients (lowest power first) or `null` for anything non-polynomial (a non-`x` variable, a negative, non-integer or above-12 exponent, a function, `e`, `π`). `pdeg` (`:491-495`) is the degree ignoring trailing zeros. `fromPoly(p)` (`:496-507`) prints highest power first, coefficient 1 omitted, and reverses a two-term `−x² + 1` into `1 − x²`.

**simp(e0)** (`:510-599`): after `tidy`, sums are collected by the `key` of each term's non-numeric part (`coefOf`, `:607-615`), zero sums dropped, and if the result is a polynomial of degree ≤ 4 it is rewritten canonically by `fromPoly`; products merge equal bases by adding exponents, fold numbers, distribute a number over a single bracket (`3(2x + 1) = 6x + 3`); powers evaluate numeric bases (integer exponents, or exact roots via `rootFrac`, `:616-630`), multiply stacked exponents `(aᵐ)ⁿ`, spread whole powers over products `(ab)ⁿ`, and reduce `e^(ln u)` to `u`; functions evaluate `sin 0`, `cos 0`, `sin`/`cos` at whole multiples of `π/2` (`piMultiple`, `:601-606`), `|num|`, `||u||`, `ln 1`, `ln e`, `ln e^u`. `substitute(e, from, to)` (`:634-653`) replaces a variable.

**Exact surd numbers** (`:657-693`). `QS = { a, b, s }` means `a + b√s` with `s` square-free (`s = 1` means no root). `qs()` normalises; `qsAdd`, `qsMul`, `qsNum`, `peval` (Horner over `QS`), `qsTex` (common denominator, `\frac{A ± B\sqrt{s}}{den}`), `qsPlain` (typed form with `√`). `gcd` (`:681-686`) is the exported Euclid that `qsTex` and `realRoots` use and that `polynomials.ts` and `identities.ts` import (`practice.ts` keeps its own copy at `practice.ts:270-275`); `sqrtSplit(v)` (`:688-693`) pulls every square out of `n·d` so `√v = out·√s` with `out` over `d`.

**Roots** (`:696-786`). `realRoots(p)` strips rational roots one at a time by the rational-root theorem (divisors of the integer-scaled constant and leading terms, up to `1e5`), divides synthetically, solves the remaining quadratic exactly with surds or the linear remainder, and hands anything of degree 3+ without rational roots to `numericRoots`; results deduplicated and sorted. `numericRoots(c)` (`:758-786`) finds turning points recursively from the derivative, brackets the Cauchy bound `B = 1 + max|cᵢ/cₙ|`, and bisects 200 times on each sign change.

### src/math/latex.ts

MathJax in Node with no DOM (`src/math/latex.ts:1-2`): `liteAdaptor` registered as the HTML handler (`:12-13`), a `TeX` input jax with `AllPackages` minus `bussproofs`, `require` and `autoload` (`:15`), an `SVG` output jax with `fontCache: "none"` so glyphs are inlined paths and the SVG can be embedded in Excalidraw (`:16-19`). `PX_PER_EX = 9` (`:22`) converts MathJax's ex units. `RenderedSvg = { svg, width, height }` (`:24`).

`latexToSvg(tex, color = "#1e1e1e")` (`:26-49`): converts in display mode; throws the message inside `data-mjx-error` if MathJax flagged an error; reads the `ex` width and height, multiplies by 9 and rounds (minimum 1); rewrites the `width`/`height` attributes in pixels, removes the inline `style`, inlines `stroke` for table rules and frames (which MathJax normally styles from page CSS), substitutes the colour for `currentColor`, and adds `xmlns` if missing. `practice.ts`'s `placeTex` then rescales and positions this. `latexToMathML(tex)` (`:56-61`) stops the pipeline at `STATE.CONVERT`, serialises the MathML tree with `SerializedMmlVisitor` and throws `"unreadable LaTeX"` on an `<merror>`; the practice test asserts every question's `q` and `show` converts, so screen readers (NVDA with MathCAT, JAWS, VoiceOver) can read the maths.

### src/math/text.ts

No imports, so the dialogs and pages can use it without pulling MathJax or mathjs (`src/math/text.ts:1-2`). `fill(s, v)` (`:5`) replaces every `{name}` with `String(v[name])`, a missing key becoming `""`. `nf(v, digits = 4)` (`:8-14`) formats for captions: `—` for `NaN`, `∞`/`−∞` for infinities, exponential with 1 decimal for non-zero `|v| < 10⁻ᵈⁱᵍⁱᵗˢ`, exponential with 3 decimals for `|v| ≥ 10⁷`, otherwise rounded to `digits` places with trailing zeros dropped and `-0` normalised to `0`.

### src/math/random.ts

`rng(seed)` (`src/math/random.ts:5-14`) is the same mulberry32 as `rngOf(...).next` in `practice.ts:250-257`, duplicated so simulations and board pictures can seed without importing the practice module; it returns only the raw `() => number` in `[0, 1)`, with the same `seed >>> 0 || 1` guard.

It is not the generator the learner-model studies use. Those import `rng` from `src/model/random.ts` (section 3), a third copy of mulberry32 that keeps seed 0 as a seed of its own, "there it becomes 1" (`src/model/random.ts:2-3`), and adds `normal` (Box–Muller) and `pick`; the published simulations were made with it.

### src/math/fraction.ts

`Frac` (`src/math/fraction.ts:10-62`) is an immutable exact rational: the constructor (`:14-20`) throws on a zero denominator, moves the sign to the numerator and divides by the gcd (`gcd(0, d) = d`, so `0/d` normalises to `0/1`; the local `gcd`'s `a || 1` only guards the `0/0` case, which the zero-denominator check has already thrown on). `ZERO`, `ONE`. `Frac.parse(src)` (`:26-39`) accepts `3`, `-2`, `+5`, `1/2`, `-3/4` (non-zero denominator) and decimals `0.25`, `.5`, `-1.75`, with internal spaces removed, a decimal comma and a Unicode minus normalised; anything else is `null`. Arithmetic `add, sub, mul, div, neg, abs` (`:41-46`) each build a fresh normalised `Frac` (so `div` by zero throws through the constructor). Predicates `isZero, isOne, isNeg, isInt` (`:47-50`), `toNumber` (`:51`). `tex()` (`:53-56`) prints an integer plainly or `-\frac{|n|}{d}` with the sign outside; `texP()` (`:59-61`) wraps a negative in `\left( \right)` for use inside products. Numerators and denominators are JavaScript numbers, so long telescoping sums and `powFrac` rely on staying under `2⁵³`; `powFrac` guards with its `1e12` check.

### tests/practice.test.ts

Pins (`tests/practice.test.ts`): every skill × level × seed 1..60 has `prompt`, `show`, `plain`; `check(ex, ex.plain)` is exactly `{ ok: true }`; a mutated answer (`wrong()`, `:16-31`: `+1` on a number, first root, first tuple component or last bound; `+ x` on an expression; `* 2` on a factorisation) is rejected; the same seed gives the same `q` (`:34-46`). "Answers in other forms" (`:57-132`) fixes the checker's tolerances: `2n/2d` → `notLowest`, spaces allowed, `0.5` and `0,5` for `1/2`, roots in any order and as `x = …, x = …`, `and`, `or`, `или`, exact surd root lists with `±`, `+-`, brackets (and `-4 ± 3sqrt(2)` rejected for the `-4 ± 2sqrt(3)` question), a missing root → `count 2`, factors in either order and with `*`, the expanded form → `notFactored`, a common factor left in a bracket → `notFactored`, an unexpanded product → `notExpanded`, antiderivatives without `+ C` or with `+ 7`, a line without `y =`, `√` for `sqrt`, an unsimplified surd and a root in a denominator → `notSimplified`, repeated primes written out and joined with `·`, a named tuple in the other order, a swapped point rejected, a right-triangle answer rounded to a whole number accepted exactly when it lies within `0.0051` and `+0.03` → `rounding`, a percentage without `%`, empty → `empty`, `1/2 +` → unreadable naming the input. The right-triangle angle label, read back from the SVG of seeds 1..300 at every level, lies inside the triangle and clear of the right-angle mark (`:134-146`). Every worked solution renders without `NaN` at seed 11 (`:148-156`); worksheets are seed-stable and translated (`:158-166`); `dotangle`/`vectors` answers recomputed from the prompt's vectors are accepted (`:168-187`); the `-3x^3` leading-minus regression (`:189-198`); every `q` and `show` converts to MathML (`:200-209`).

### tests/checker.test.ts

Loads the labelled corpus and `agreement()` from `scripts/checker-agreement.ts` (`tests/checker.test.ts:1-8`). Pins: the corpus covers every skill and every label (`:11-14`); agreement with the teacher's marking `≥ 0.89`, at most 2 wrong answers accepted, at most 1 right answer rejected, and every teacher-`wrong` answer judged `wrong` (`:16-23`); at least 30 answers carry a teacher-named mistake, every one of those is named by the checker, and the checker names a mistake the teacher did not on under 2 % of plain answers (`:25-32`).

### tests/mistakes.test.ts

`WHERE` (`tests/mistakes.test.ts:15-32`) records where each non-`sign` mistake can occur (e.g. `addAcross` in `fractions` 1–2, `mulBeforePow` in `order` 2–3, `fullUnit` in `rounding` 3, `noFlip` in `inequalities` 2–3). Pins: each mistake is found within 400 seeds via `trapInputs`, is named with `ok: false`, no `why`, a `wrong` verdict, and a hint with every placeholder filled (`:34-54`); the `sign` trap fires for numbers, negated root sets and negated expressions, and never for zero (`:56-72`); in the seven trap-bearing skills every trap can be typed, is rejected and named (`:74-88`); a form slip or plain miss is never dressed as a mistake (`:90-96`); `x + 3` for a number → `notNumber` and a `form` verdict (`:98-104`); `readIneq` accepts `x >= 4`, `x ≥ 4`, `4 <= x`, `x < −2`, `-1 < x <= 3`, `3 >= x > -1`, `(-1, 3]`, `(-1; 3]`, `[4, ∞)`, `(-inf, -2)`, decimal commas and fractions, and rejects `x = 4`, `4`, `x`, `1 < x > 3`, `(1, 2, 3)`, `(-∞, ∞)`, `x > y` (`:106-128`); standard-form inputs `m e n`, `m × 10^(n)`, `mx10^n` are read, the plain value → `notStandard`, a mantissa ≥ 10 → `notStandard`, a negated value → `sign`, and tiny answers compare relatively (`:130-156`); the preview reads `inf`/`∞` and keeps the typed variable (`:158-163`); `order` never shows `\div d(`, and level-1 rounding lands on the unit within half of it (`:165-176`); every mistake is explained in `en`, `ru`, `ka` (`:178-181`).

### tests/fixtures/answers.json

Shape (`tests/fixtures/answers.json:1-5`): `{ "about": string, "answers": [ { "skill", "level", "seed": 7, "input", "label": "correct" | "close" | "wrong" | "form", "note"?: string, "mistake"?: MistakeId } ] }`. Every entry is a typed answer to the seed-7 question of a skill and level, marked as a teacher would, with `note` explaining a `form` label (`"unreadable"`, `"empty"`) and `mistake` naming the slip a teacher sees in a wrong answer. `scripts/checker-agreement.ts` runs each `input` through `check`, maps the verdict with `verdictOf`, and reports the confusion matrix, false accepts and rejects, and the diagnosis agreement that `tests/checker.test.ts` thresholds.


## 3. The learner model, policies, test forms, evaluation, analysis, simulation, and the learner client

### src/model/elo.ts — the learner model

The file header (`src/model/elo.ts:1-11`) states the whole model. The chance that a student answers a question of skill $s$ at level $L$ right first time is

$$P(\text{correct}) = \sigma\big(\theta_{g} + \theta_{a(s)} + \theta_{s} - (b_s + (L-2)\cdot\text{step} + r_{s,L})\big), \qquad \sigma(x)=\frac{1}{1+e^{-x}}$$

Ability has three layers (global, area, skill) "so a skill the student hasn't tried yet starts from what they showed in its area and overall". Difficulty "belongs to a skill at a level, not to one generated question: seeds are endless and each is seen once"; it has two layers, a per-skill $b_s$ moved by answers at any level and a smaller per-level adjustment $r_{s,L}$, "so the levels of a skill keep their order until the answers really say otherwise". Every term moves by the surprise $y - p$ scaled by an uncertainty $U(n) = \alpha/(1+\beta n)$ that shrinks with the number of answers $n$ the term rests on. Imports name `.ts` files because "the server runs this with plain Node, which doesn't guess extensions" (`:12`). The only runtime import is `areaOf` from `src/math/practiceSkills.ts` (`:13`, with the `SkillId` type), a `Map` lookup over the 42 current skills (the commit history notes it used to be a search over the areas and ran on every prediction). The file exports `sigmoid` (`:56`), which `simulate.ts` reuses for the worlds.

#### Types: `Level`, `Observation`, `EloParams`, `DEFAULT_PARAMS` (`:15-44`)

- `Level = 1 | 2 | 3`.
- `Observation = { student: string; skill: string; level: Level; correct: boolean }` — one first counted answer. `skill` is a plain string, not `SkillId`, so public data sets (ASSISTments skill names) can be fed through the same model.
- `EloParams`: `alpha`, `beta` (uncertainty), `weights: {global, area, skill}` (share of the surprise each ability layer takes), `difficultyWeights: {skill, level}`, `levelStep` (how much harder each level starts than the one below; level 2 is the zero), `areaOf: (skill) => string` (the middle layer's grouping; Zeno's areas by default, a data set's own topics otherwise).
- `DEFAULT_PARAMS` (`:37-44`): $\alpha=0.4$, $\beta=0.05$, weights $0.4/0.6/1$, difficulty weights $1/0.5$, step $0.8$, `areaOf` falling back to `"other"` for unknown skills. The comment: "Chosen on simulated classes (src/model/simulate.ts, seeds apart from the tests'); refit on real answers with `npm run model -- attempts.csv --fit`. Every answer moves three layers, so the total step is about 2·alpha" ($0.4+0.6+1=2$).

With the defaults a never-seen student on a never-seen skill gets $p = \sigma(0 - (L-2)\cdot 0.8)$: $0.69$ at level 1, $0.5$ at level 2, $0.31$ at level 3. `tests/model.test.ts:30-31` pins this.

#### Internal data structures (`:46-71`)

- `Rating = { v: number; n: number }` — value and the count of answers it rests on.
- `StudentState = { global: Rating; area: Map<string, Rating>; skill: Map<string, Rating> }`.
- `EloModel.students: Map<studentId, StudentState>`; `skills: Map<skill, Rating>` (the $b_s$); `levels: Map<skill, LevelRatings>` where `LevelRatings = (Rating | undefined)[]` is indexed by level, `[0]` unused (`:61-62`). The comment at `:70`: "by skill, then level, so no key is built per prediction" — the earlier design keyed a single map by the string `"skill:level"` built on every prediction.
- `rating()` makes a zero rating; `get(m, k)` (`:60`) returns the entry or inserts a fresh one (`m.get(k) ?? m.set(k, rating()).get(k)!`).
- `itemKey(skill, level)` (`:58`) is `` `${skill}:${level}` ``: **only** used for the serialised state, which keeps that naming for compatibility with saved states.

#### `ModelState` (`:48-53`)

The JSON form: every rating as a pair `[value, n]`.

```ts
{ skills: Record<skill, [v, n]>,
  levels: Record<"skill:level", [v, n]>,
  students: Record<id, { global: [v, n]; area: Record<area, [v, n]>; skill: Record<skill, [v, n]> }> }
```

`Mastery = { skill; n; ability; p: Record<Level, number> }` (`:54`) is what the UI shows.

#### `constructor(params: Partial<EloParams> = {})` (`:72-75`)

Deep-merges `weights` and `difficultyWeights` over the defaults so a caller can pass `{ weights: { area: 0 } }` for an ablation without supplying the other two (the evaluation script does exactly that).

#### `uncertainty(n)`, `student(id)` (`:77-84`)

$U(n) = \alpha/(1+\beta n)$. `student` creates the `StudentState` on first sight.

#### `ability(student, skill)`, `difficulty(skill, level)`, `levelRating` (`:86-99`)

`ability` returns 0 for an unseen student, otherwise $\theta_g + \theta_{a(s)} + \theta_s$ with missing layers as 0 (reads only; does not create entries). `difficulty` returns $b_s + (L-2)\cdot\text{step} + r_{s,L}$, again 0 for missing parts. `levelRating` is the creating accessor: it makes the `LevelRatings` array and the slot (`at[level] ??= rating()`).

#### `predict(o)` / `predictAt(student, skill, level)` (`:100-107`)

$\sigma(\text{ability} - \text{difficulty})$. `predictAt` exists "without an object to build: the adaptive policy asks many times per question" (`:104`).

#### `update(o)` (`:109-124`)

1. `surprise = (correct ? 1 : 0) − predict(o)`, computed **before** any rating moves.
2. The three ability layers, as `[Rating, weight]` pairs: global, `get(s.area, areaOf(skill))`, `get(s.skill, skill)`. For each: $v \mathrel{+}= w \cdot U(n) \cdot \text{surprise}$, then $n \mathrel{+}= 1$. "Every rating moves by its own uncertainty, read before any of them is counted" (`:113`) — each rating's own `n` is read before its own increment; the shared surprise was fixed in step 1.
3. The two difficulty layers (`get(skills, skill)` with `dw.skill`, `levelRating(skill, level)` with `dw.level`): $v \mathrel{-}= w \cdot U(n) \cdot \text{surprise}$, $n \mathrel{+}= 1$. The sign is reversed: a right answer makes the item look easier.

So with defaults a right answer at $p=0.5$ by a new student raises global by $0.4\cdot0.4\cdot0.5 = 0.08$, area by $0.12$, skill by $0.2$ (ability on that skill rises by $0.4$), and lowers $b_s$ by $0.2$ and $r_{s,L}$ by $0.1$. Pinned: steps are positive and strictly decreasing with evidence; a wrong answer lowers ability; a skill everyone gets right has $b_s<0$ (`tests/model.test.ts:27-46`); a new skill in the same area predicts higher than one in another area, which predicts higher than for an unseen student (`:48-58`).

#### `mastery(student, skill)` (`:126-130`)

`n` is the skill layer's count (0 if the student or skill is unknown), `ability` as above, `p` the prediction at each of the three levels.

#### `state(students?)` (`:132-145`)

Serialises every skill and level difficulty, and the students named (all if none — the server calls `state([`s${student.id}`])` for one student and sends that entry to the browser under the name `"me"`, `server/research.ts:343-344`; see learner.ts). Levels are flattened with `flatMap` over the sparse per-skill array, emitting `itemKey(skill, level)` keys and skipping holes/undefined.

#### `static fromState(state, params?)` (`:146-161`)

Rebuilds the three maps. For `levels`, the key is cut at its **last** colon: "The skill's name may hold a colon (a data set's own skills); the level is what follows the last one" (`:153`). The level rating is created through `levelRating`, then overwritten with the saved pair. Students are rebuilt as `{ global, area: Map, skill: Map }`. The comment at `:146`: "A model that carries on from a saved state (the server's, sent to a student's browser)".

### src/model/curriculum.ts — order and prerequisites

`CURRICULUM` (`:6-11`) is the fixed sequence's order of all 42 `SkillId`s: "number, then algebra and geometry side by side, calculus last; data where its maths is ready". `PREREQUISITES` (`:14-56`) maps each skill to the skills it builds on directly (e.g. `quadratic: ["factor"]`, `dotangle: ["vectors", "trigexact"]`, `stationary: ["differentiate", "quadratic"]`). "A class can practise any subset; prerequisites outside the subset are ignored" (`:3`). `inCurriculumOrder(skills)` (`:59`) filters `CURRICULUM` by membership, which both orders and de-duplicates and drops unknown names. `tests/policy.test.ts:12-20` pins that every skill appears once, every prerequisite exists and precedes its dependant.

### src/model/policy.ts — choosing the next question

The header (`:1-10`): the two conditions "differ only here: feedback, worked solutions and the review of missed questions are the same for both". Constants (`:18-32`):

- `PER_LEVEL = 2`, `TARGET = 0.75` ("about three in four right, as in Math Garden ... hard enough to learn from, easy enough to keep going").
- `UNLOCK_AT = 0.5`: a prerequisite holds a skill back while a medium question on it would be answered right less often than this. "At 0.5 a new student (an even chance on everything) starts with every skill open ... (A higher bar made every new student grind the first skills: in simulated classes a fifth of all practice went to each root skill.)"
- `MASTERED_AT = 0.8`: mastered when a hard (level 3) question would be right this often.
- `RECENCY_PENALTY = 0.1`, `RECENT = 3`; `LEVELS = [1, 2, 3]`.

Types: `Policy = "adaptive" | "fixed"`, `Choice = { skill: SkillId; level: Level }`.

#### `fixedChoice(skills, position)` (`:35-39`)

`perSkill = 3 · PER_LEVEL = 6`. `i = position mod (|skills|·6)`, made non-negative by the double-modulo idiom. Skill index `⌊i/6⌋`, level `LEVELS[⌊(i mod 6)/2⌋]`. So each skill is asked twice at level 1, twice at 2, twice at 3, then the next skill, then round again (`tests/policy.test.ts:22-27` pins the sequence for two skills).

#### `open(model, student, skills)` (internal, `:51-56`) and `openSkills` (`:59`)

1. `hard`: a `Map<SkillId, number>` of $P(\text{level }3)$ for every class skill — computed once and returned, "the hard-question predictions they were judged by (adaptiveChoice needs those again)".
2. `unmastered` = skills with `hard < MASTERED_AT`.
3. `ready` = unmastered skills whose every prerequisite is either not in the class's skills or has $P(\text{level }2) \ge$ `UNLOCK_AT`.
4. Fallback chain: `ready` if non-empty, else `unmastered`, else all skills (once everything is mastered the student still gets questions from the class's skills; `tests/policy.test.ts:72-74`).

#### `adaptiveChoice(model, student, skills, options)` (`:61-78`)

`AdaptiveOptions` (`:41-48`): `recent` (skills of the last questions, most recent last), `random` (tie-breaker; `Math.random` in the app, seeded in simulations), `target` (TARGET in the app; simulations try 0.6 and 0.85).

For each candidate skill: `penalty = RECENCY_PENALTY × (occurrences of the skill in the last RECENT entries of recent)`. For each level: $p$ (level 3 reuses `hard`), $\text{score} = |p - \text{target}| + \text{penalty}$, and a fresh `tie = random()`. The best is the lowest score; within $10^{-12}$ the lower tie wins (`:74`). Note `random()` is drawn for **every** (skill, level) pair regardless of whether a tie occurs, so a seeded run consumes a fixed number of draws per choice — this is what makes simulation output independent of comparison order. Pinned: a new student is given level 1 ($\sigma(0.8)\approx0.69$ is nearest 0.75); misses on a prerequisite close its dependants; the choice is the global minimum of $|p-\text{target}|$ over open skills; right answers move the student up a level and misses bring them down; two recent questions on the same skill flip the choice to the other skill (`tests/policy.test.ts:32-75`).

#### `choose(policy, model, student, skills, position, options)` (`:80-82`)

Dispatch: `"fixed"` → `fixedChoice(skills, position)`, otherwise `adaptiveChoice`.

### src/model/testForms.ts — parallel pre/post-test forms

Header (`:1-5`): forms A and B "ask about the same skills at the same levels in the same order, with different seeds ... parallel by construction (the dashboard checks that their scores agree). Half of each condition takes A first and B after, the other half the other way round, so a harder form can't pass for learning. Everything follows from the class code, so the server and every student's browser build the same forms without storing them."

Types: `Form = "A" | "B"`, `TestPhase = "pre" | "post"`, `TestOrder = "AB" | "BA"`, `TestItem = { skill; level; seed }`. Constants: `DEFAULT_TEST_LENGTH = 12`, `MIN 4`, `MAX 30`, `LEVEL_CYCLE = [2, 1, 3]` ("Medium first, then easy, then hard, so a short test is mostly medium questions").

#### `hash(text)` (`:22-29`)

FNV-1a, 32-bit: $h_0 = \texttt{0x811c9dc5}$; per char $h \leftarrow (h \oplus c)\cdot\texttt{0x01000193} \bmod 2^{32}$ (via `Math.imul` and `>>> 0`); result $h \bmod 2^{31}$ so it fits the exercise generators' seed range.

#### `testItems(classCode, skills, form, length = 12)` (`:35-42`)

For item $i$: if `skills.length >= length` ("many"), `skill = skills[⌊(i + 0.5)·|skills|/length⌋]` (midpoint sampling spreads the items evenly over the skills) and `level = LEVEL_CYCLE[i mod 3]`; otherwise `skill = skills[i mod |skills|]` and `level = LEVEL_CYCLE[⌊i/|skills|⌋ mod 3]` (each pass over the skills moves to the next level in the cycle). `seed = hash(`${classCode}:${form}:${i}`)`.

#### `formFor(order, phase)` (`:44`)

`"pre"` → `order[0]`, `"post"` → `order[1]`.

### src/model/evaluate.ts — metrics, held-out split, baselines, CSV

Header (`:1-5`): replay predicts each answer from what came before, then learns from it, "so no prediction has seen its own answer". Metrics follow Pelánek 2015: log-loss and RMSE (closeness), AUC (ranking), calibration bins. Baselines "show what the model adds over simply counting". Besides the metrics and baselines the file holds H1's paired bootstrap (BKT against the moving average, `:112-213`) and the moving average itself (`EmaModel`, `:408-469`); its one import beyond `elo.ts` and the skill list is `rng` from `./random.ts` (`:8`), for the bootstrap.

#### `Predictor` (`:14`) and `RunningRate` (`:17-40`)

`Predictor = { name; predict(o); update(o); fit?(train) }`. "One with fit() learns its parameters from training students first (PFA and BKT); one without learns as it goes, so the training students only warm it up." (`EmaModel`, added later, has a `fit` too.)

`RunningRate` keeps `[right, all]` per key and predicts the Laplace-smoothed share $\frac{\text{right}+1}{\text{all}+2}$. Three factories: `globalRate()` (key `""`), `itemRate()` (key `skill:level`), `studentSkillRate()` (key `student:skill`).

#### `replay(model, observations)` (`:43-49`)

`observations.map(o => { p = predict(o); update(o); return { p, correct } })`. Order matters; the inputs are always in answer order (see `observationsFromCsv`, `fromAssistments`).

#### Metrics (`:51-95`)

- `logLoss`: $-\frac1N\sum [y\ln q + (1-y)\ln(1-q)]$ with $q$ clipped to $[10^{-6}, 1-10^{-6}]$ (`EPS`).
- `rmse`: $\sqrt{\frac1N\sum(y-p)^2}$.
- `accuracy`: share with $(p \ge 0.5) = y$.
- `auc` (`:63-78`): Mann–Whitney form. Sort ascending by $p$; `pos`, `neg` counts; `NaN` if either is zero. Walk runs of equal $p$ (`i..j`), assign the average 1-based rank $(i+1+j)/2$ to every member, sum ranks of the positives. $\text{AUC} = \dfrac{R_+ - \text{pos}(\text{pos}+1)/2}{\text{pos}\cdot\text{neg}}$. Ties count half. Pinned values: 1, 0, 0.5, NaN (`tests/model.test.ts:89-92`).
- `calibration(ps, bins = 10)` (`:80-89`): bin index `min(bins−1, ⌊p·bins⌋)`; each `Bin = { from, to, n, predicted, observed }` with `predicted`/`observed` as means over the bin once $n>0$ (left as 0 for empty bins).
- `metrics(name, ps)` bundles these; `evaluate(model, observations) = metrics(model.name, replay(...))`.

#### `evaluateHeldOut(model, train, test)` and `heldOutPredictions` (`:101-110`)

`evaluateHeldOut` is `metrics(model.name, heldOutPredictions(model, train, test))`. `heldOutPredictions` does the work: if the model has `fit`, fit on `train`; else `replay(model, train)` (warm-up). Then `replay(model, test)`: test students are predicted one by one, "still learning from each after predicting it, as it would in a class". Each prediction comes back as a `StudentPrediction = Prediction & { student }` (`:104`), "what a paired comparison needs".

#### H1: `bootstrapGroups`, `verdict`, `pairedLogLoss` (`:112-213`)

The thesis's confirmatory test asks whether BKT predicts held-out answers better than the moving average; these three functions are its machinery, and `scripts/h1.ts` the command that runs it.

`bootstrapGroups(groups, statistic, resamples, seed)` (`:119-131`): a 95 % percentile interval "by the bootstrap over whole groups (students, or classes)". Each of `resamples` rounds draws `groups` indices uniformly with replacement from `rng(seed)` (the generator in `src/model/random.ts`) into one reused array, and calls `statistic(drawn)`; NaN results are dropped. The kept values are sorted and the interval is `[at(0.025), at(0.975)]` with `at(q) = stats[min(len − 1, ⌊q·len⌋)]`, NaN on both sides when nothing was kept.

`verdict(difference, [lo, hi], smallest)` (`:140-143`) applies "the rule fixed before any results (docs/thesis/outline.md, H1)": an interval with `lo > 0` or `hi < 0` is a real difference, `"real but negligible"` when $|\text{difference}| <$ `smallest`, otherwise `"first better"` (difference below zero) or `"second better"`; an interval that holds zero and lies strictly inside $(-\text{smallest}, \text{smallest})$ is `"no practical difference"`; anything else `"inconclusive"`. `SMALLEST_DIFFERENCE = 0.005` (`:161`), in mean log-loss per answer.

`pairedLogLoss(first, second, { resamples = 10000, seed = 1, smallest, groupOf = identity })` (`:171-213`) takes two models' `StudentPrediction` lists and throws "the two models must predict the same answers in the same order" unless they have the same length and the same `student` and `correct` at every position (`:178`). Each answer's log-loss is clipped at `EPS` as in `logLoss` (`answerLoss`, `:162-165`). Per group (`groupOf(student)`, numbered in order of first appearance) it accumulates the sum of the per-answer differences $\ell_a - \ell_b$ and the answer count; the estimate is $(\sum \ell_a - \sum \ell_b)/N$, and the bootstrap statistic over a draw of groups is the summed differences over the summed counts of the groups drawn, so a resample is a mean per answer, weighted by how many answers each group brings. "Since one student's answers are not independent of each other", whole students are resampled, or whatever `groupOf` maps them to ("such as classes, for the robustness check"). The result `PairedTest` (`:145-159`) carries both names, `answers`, `students`, `groups`, both mean log-losses, `difference` ("below zero, the first model predicts better"), `interval`, `smallest` and the `verdict`.

Pinned (`tests/baselines.test.ts:192-249`): the five verdicts on hand-made intervals; the bootstrap hands the statistic as many groups as there are, is the same for the same seed, and gives `[NaN, NaN]` when every resample is NaN; on three hand-made predictions the log-losses and difference match the hand calculation, `groups` is 2, and with every student mapped to one class the interval collapses to the estimate; mismatched lists throw; on 1 500 students drawn from BKT's own assumptions BKT beats `EmaModel` with verdict `"first better"`, and a model compared with itself gives difference 0, interval `[0, 0]` and `"no practical difference"`.

#### `hashOf(text, seed)` and `splitByStudent(observations, testShare = 0.2, seed = 1)` (`:215-231`)

`hashOf` is FNV-1a with the seed XORed into the offset basis, plus a finaliser: `h ^= h>>>15; h = imul(h, 0x2c1b3c6d); h ^= h>>>12`. A student is in the test set when $\text{hashOf}(id, seed)/2^{32} < \text{testShare}$; the side is memoised per student. The observations are partitioned **in their original order** into `train` and `test`. "Splits by student, not by answer, so no test student's answers have been seen; the order of answers is kept." The function is generic over `T extends { student: string }` (`:224`), so the mastery script splits its per-skill practices with it as well as observations. Pinned: no student on both sides, about a fifth held out, same seed → same split, another seed → another split, order kept (`tests/baselines.test.ts:96-107`).

#### `solve(A, b)` (`:237-253`)

Gauss–Jordan elimination with partial pivoting on the augmented matrix $[A\,|\,b]$: for each column pick the largest-magnitude pivot below, return `null` if $|{\rm pivot}| < 10^{-12}$, swap, eliminate the column from **every** other row. The result is diagonal, so $x_i = M_{i,n}/M_{i,i}$.

#### `fitLogistic(X, y, ridge = 0.01, iterations = 25)` (`:259-280`)

Newton's method (IRLS) for logistic regression with an $L_2$ penalty so "a skill whose answers are all right (or all wrong) still gets finite weights". Per iteration, with $p_r = \sigma(x_r\cdot w)$, $q_r = p_r(1-p_r)$:

$$H = \lambda I + \sum_r q_r\, x_r x_r^{\top}, \qquad g = -\lambda w + \sum_r (y_r - p_r)\, x_r, \qquad w \leftarrow w + H^{-1} g$$

Stops when `solve` fails or $\max_i|\text{step}_i| < 10^{-8}$. Pinned: recovers $0.5 + 1.5x$ from 20 000 draws, with `ridge = 0` (`tests/baselines.test.ts:114-125`); `solve` itself on a 2×2 system and a singular one (`:110-113`).

#### `PfaModel` (`:282-320`) — Performance Factors Analysis

Pavlik, Cen & Koedinger 2009: $\text{logit}\,P = \beta_s + \gamma_s\cdot\#\text{right} + \rho_s\cdot\#\text{wrong}$, counts of the same student's earlier answers on that skill. `features(o)` = `[1, right, wrong]` from `counts` keyed `student\0skill`. `fit(train)`: walks the training answers in order, pushing each row's **pre-update** features to the skill's design matrix and to a pooled one, then `update(o)` so later rows see the earlier count; fits `pooled = fitLogistic(all)` and per-skill weights; finally `counts.clear()` so the test students (and anyone else) start from zero counts. `predict` uses the skill's weights or the pooled ones for an unseen skill. Pinned: after 200 students who each miss twice then succeed, a new student is predicted $<0.2$ and after two misses and a hit $>0.9$ (`tests/baselines.test.ts:128-142`).

#### BKT: `bktStep`, `bktLogLikelihood`, `fitBkt`, `BktModel` (`:322-396`)

`BktParams = { init, learn, guess, slip }`. One step (`:332-336`):

$$P(\text{right}) = k(1-s) + (1-k)g, \quad k^{+} = \begin{cases}\dfrac{k(1-s)}{P(\text{right})} & \text{correct}\\[2ex] \dfrac{k\,s}{1-P(\text{right})} & \text{wrong}\end{cases}, \quad k' = k^{+} + (1-k^{+})\,\ell$$

`bktLogLikelihood(sequences, p)` sums $\ln P(\text{observed})$ over each student's 0/1 sequence, carrying `known` through the same update. `fitBkt` (`:353-365`) is a brute-force grid search over `BKT_GRID` (`:324-330`): init ∈ {0.05…0.95 step 0.1} (10), learn ∈ {0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3} (7), guess and slip ∈ {0.05…0.3 step 0.05} (6 each) — 2 520 points; "Guess and slip stay under 0.3, the usual bound against 'degenerate' fits where knowing makes a right answer less likely." Default best `{0.5, 0.1, 0.2, 0.1}` if nothing beats $-\infty$.

`BktModel.fit`: `sequencesBySkill(train)` (`:398-406`, shared with the EMA) groups the training answers by skill then by student (in order) into `Uint8Array` 0/1 sequences; `fit` then fits `pooled` on all sequences and per-skill parameters. `paramsOf(skill)` (the skill's parameters, or the pooled ones) is public, so H1's script can report what was fitted. `predict`: `known` for `student\0skill` (or the skill's `init`) → $k(1-s)+(1-k)g$. `update`: stores `bktStep(...).known`. "Levels are ignored: BKT has one difficulty per skill" (`:370-371`). Pinned: the grid search recovers `{0.25, 0.2, 0.2, 0.1}` within one grid step from 3 000 sequences of 8 (`tests/baselines.test.ts:153-172`).

#### The moving average: `emaStep`, `fitEma`, `EmaModel` (`:408-469`)

"The exponential moving average of a student's answers on a skill (right 1, wrong 0), read as the chance of a right answer next: the simple rival to BKT." `EmaParams = { alpha, start }` (`:409`). `emaStep(score, alpha, correct)` returns $(1-\alpha)\cdot\text{score} + \alpha\cdot[\text{correct}]$ (`:412`). `emaLogLoss` (`:414-427`, internal) is the mean log-loss of sequences when each answer is predicted by the score before it (clipped at `EPS`).

`fitEma(sequences)` (`:432-442`): the start is fixed first, as the share of sequences whose first answer is right (0.5 with no sequences), "so the first prediction comes from data like the rest"; then α is the point of `EMA_ALPHAS` (`:410`: 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4 … 0.9, fourteen values) with the lowest `emaLogLoss` at that start.

`EmaModel` (`:450-469`) keeps one score per `student\0skill`; `predict` returns it or `params.start`, `update` applies `emaStep`. "One α and one start for all skills, fitted on the training students; given settings are used as they are": constructed without parameters it starts at `{ alpha: 0.3, start: 0.5 }` and `fit` replaces them with `fitEma` over every skill's sequences pooled; constructed with parameters, `fit` leaves them alone. The comment adds that "N right in a row" is an EMA for some settings (Proposition 1 in the outline) "but not in general for the fitted ones". Pinned in `tests/mastery.test.ts:39-63` (see the mastery module below).

#### `parseCsv(text)` (`:473-495`)

A character-by-character RFC 4180 reader: inside quotes a doubled `""` is a literal quote, a lone `"` closes; outside, `"` opens, `,` ends the cell, `\n`/`\r`/`\r\n` ends the row. A trailing partial row is kept; rows that are a single empty cell are dropped. The first row is the header; later rows become `Record<header, string>` with missing cells as `""`.

#### `evidence(counted, outcome, firstCorrect)` (`:503-506`)

The single rule shared by server, browser and CSV: `counted > 0` → `firstCorrect`; else `outcome === "revealed"` → `false`; else `null`. "right first time is right; a first counted answer that was wrong or nearly right is wrong; so is revealing the answer without trying. null for a question left after only form messages ('lowest terms'): the student had the right idea and never got as far as a counted answer." `counted` = answers minus those sent back for their form.

#### `observation(row)` and `observationsFromCsv(text)` (`:508-518`)

`observation`: `skill` must be in `ALL_SKILLS` and `level` in {1,2,3}, else `null`; `counted = n_answers − retries`; `correct = evidence(counted, outcome, first_correct === "1")`; `null` if no evidence; otherwise the observation plus `condition` and `attempt` (the server's row number). `observationsFromCsv` parses, maps, filters nulls and sorts by `attempt` ("Every usable attempt in the order it was stored"). `tests/model.test.ts:99-117` pins the six cases (wrong-then-right is a miss, revealed is a miss, form-only is null, unknown skill is null, form-then-right is right).

#### The `--fit` search (`scripts/evaluate-model.ts:77-85`)

`npm run model -- <csv|--observations json|--simulate> [--fit] [--test-share 0.2] [--seed 1] [--calibration bins.csv] [--json]` (`:5-11`). The data is split by `splitByStudent(observations, testShare, seed)` (`:54`); `--calibration` writes every model's bins as a CSV with columns `model,from,to,n,predicted,observed` (`:91-96`), and `--json` prints `{ source, testShare, seed, train: {answers, students}, test: {answers, students}, results, fit }` (`:99`). With `--fit`, for every $\alpha \in \{0.2,0.4,0.6,0.8,1,1.5\}$ and $\beta \in \{0,0.01,0.02,0.05,0.1,0.2\}$ (36 pairs) an `EloModel({alpha, beta})` is replayed on the **training** answers only and scored by log-loss; the five best are reported and the best becomes an extra model `"elo, fitted (α, β)"`, inserted second in the list (`models.splice(1, 0, …)`, `:84`) and scored held-out like the rest. The model list (`:64-75`) is the elo model, two weight ablations (no area layer; skill layer only), "one area" when a data set supplies topics, PFA, BKT, the moving average (`EmaModel`, fitted on the training students) and the three counting rates. A data set's `areas` map becomes `areaOf` (`:61`).

### src/model/datasets.ts — public data sets

#### `csvRecords(pieces)` (`:11-50`)

An `async function*` over string chunks ("a piece may end anywhere, even inside a quoted field"). Beyond `parseCsv` it keeps two cross-chunk flags: `quoteSeen` (a `"` inside a quoted field, waiting to see whether the next character doubles it) and `afterCr` (a `\r` waiting for a possible `\n`). Yields `string[]` rows, skipping rows that are one empty cell. Pinned: every split point of a tricky text gives the same rows (`tests/baselines.test.ts:21-27`).

#### `assistmentsTopic(skill)` (`:56-62`)

Keyword regexes in order `data`, `geometry`, `algebra`, `number`; first match wins, else `"other"`. "A heuristic, by keywords, checked by eye on the 2009–2010 skill list."

#### `fromAssistments(records, source)` (`:86-132`)

Header: trimmed; requires `order_id`, `user_id`, `original`, `correct` and one of `skill_name`/`skill_id`, else throws "not an ASSISTments file". Rows: keep `original === "1"` (main problems, not scaffolding), `correct` exactly `"0"` or `"1"`, a non-empty skill (`skill_name || skill_id`), a student and a finite `order_id`; de-duplicate on `order\0skill` ("the same problem counted once per skill; a problem tagged with several skills becomes one observation for each"). Sort by `order_id`, emit `level: 2` for every row ("the data has no levels, and the model's level step then plays no part"). Each kept row also carries the student's `student_class_id` (empty when the column is missing), because "Students in one class share a teacher and lessons, so the class (student_class_id) is kept for analyses that resample classes rather than students". After sorting, kept problems are counted per student and class in the order first met, and each student is assigned the class with the most (`reduce` keeps the earlier class on a tie, "so a tie goes to the class met first", `:118-125`); rows without a class are skipped there, so such a student has no entry. Returns `{ source, observations, areas (skill → topic), classes (student → class), counts: { rows, kept, students, skills } }`, and when any row named a class `counts` also gets `classes` (distinct classes assigned) and `inSeveralClasses` (students seen in more than one, `:127-130`). Pinned with a hand-made file: a 2–1 split goes to the majority class, a 1–1 tie to the class met first, a row without a class and a scaffolding row add no class, and a file without the column gives `classes: {}` and no `counts.classes` (`tests/baselines.test.ts:60-79`).

#### `DatasetFile`, `toFile`, `fromFile` (`:134-153`)

The importer's JSON: `rows: [student, skill, level, 0|1][]`, plus `source`, `areas`, `counts` and an optional `classes` map that `toFile` copies from the data set. `fromFile` throws without `rows`, coerces any level other than 1 or 3 to 2, `areas` to `{}`, and a missing `classes` to `{}` ("Files written before classes were kept have none").

### src/model/analysis.ts — the pre-registered analysis

Header (`:1-12`): primary ANCOVA (post on condition + pre, with form order and class as factors when they vary; "Adjusting for the pre-test removes the part of the post-test that was there before practice, so the comparison is sharper than one of gains (Van Breukelen 2006)"); secondary Welch's t on gains; check: pre-test scores on form A vs B. Per-protocol: only students who finished both tests. No library.

#### `twoSided(t, df)` (`:16`) and the t distribution

$p = \min(1,\ 2\,S_T(|t|, \nu))$. `tSf` (`src/math/distributions.ts:99-103`): $S_T(t,\nu) = \tfrac12 I_{x}(\nu/2, \tfrac12)$ with $x = \nu/(\nu+t^2)$ for $t\ge0$, and $1-\text{tail}$ for $t<0$; for $\nu > 10^7$ the normal tail $\tfrac12 Q(\tfrac12, z^2/2)$ (regularised upper incomplete gamma). $I_x(a,b)$ (`betaI`, `:88-93`) is computed as $\frac{x^a(1-x)^b}{a\,B(a,b)}\cdot\text{cf}$ with the Lentz continued fraction (`betaCf`), switched to the symmetric form $1 - I_{1-x}(b,a)$ when $x \ge (a+1)/(a+b+2)$; $\ln\Gamma$ by Lanczos ($g=7$, 9 coefficients). `tUpper(p, df)` inverts `tSf` by 200-step bisection on $[-10^6, 10^6]$ to a relative tolerance $10^{-13}$. Pinned against printed tables: $t_{0.025,10}=2.228139$ etc. (`tests/analysis.test.ts:10-16`).

#### `inverse(A)` (`:19-36`)

Gauss–Jordan on $[A\,|\,I]$ with partial pivoting; pivot $<10^{-12}$ → `null`; each pivot row is normalised, the column eliminated from all other rows; the right half is returned.

#### `ols(X, y)` (`:40-55`)

$X^\top X$ by explicit sums, inverted (`throw "the predictors are collinear"` if singular), $\hat\beta = (X^\top X)^{-1}X^\top y$, residuals, $SSE$, $df = n-k$, $\hat\sigma^2 = SSE/df$ (NaN if $df\le0$), $se_i = \sqrt{\hat\sigma^2\,[(X^\top X)^{-1}]_{ii}}$, $R^2 = 1 - SSE/SST$ (NaN when $SST = 0$); returns `{ beta, se, df, sigma, r2 }`. Pinned by a five-point hand regression (`tests/analysis.test.ts:18-31`).

#### `Estimate`, `estimate(est, se, df)` (`:61-65`)

`{ estimate, se, df, t = est/se, p = twoSided(t, df), ci = est ± t_{0.025,df}·se }`.

#### `welch(a, b)` (`:68-73`)

$v_a = s_a^2/n_a$, $v_b = s_b^2/n_b$ (sample variances, $n-1$), $se = \sqrt{v_a+v_b}$, Welch–Satterthwaite

$$\nu = \frac{(v_a+v_b)^2}{v_a^2/(n_a-1) + v_b^2/(n_b-1)}$$

Pinned (`tests/analysis.test.ts:64-70`).

#### `StudyRow`, `dummies`, `ancovaParams`, `ancova(rows)` (`:79-114`)

`StudyRow = { treated: 0|1; pre; post; class?; order? }`, scores as shares in $[0,1]$. `dummies(rows, of)` sorts the distinct levels, drops the first, and returns a row → 0/1 vector (no columns when the factor does not vary). `ancovaParams = 3 + (\#\text{classes}-1) + (\#\text{orders}-1)`.

Design matrix row: $[1,\ \text{treated},\ \text{pre}-\overline{\text{pre}},\ \text{class dummies}\ldots,\ \text{order dummies}\ldots]$. The pre-test is centred so the intercept is the control post-test at the mean pre-test. Then `ols`. The reported effect is $\hat\beta_1$ with `se[1]` and `df` through `estimate`. Extras:

- `d = \hat\beta_1 / s_{\text{pooled}}` where $s_{\text{pooled}}$ is the pooled within-group SD of the raw **post** scores: $\sqrt{\frac{(n_1-1)s_1^2+(n_0-1)s_0^2}{n_1+n_0-2}}$.
- `adjusted`: control $=\hat\beta_0 + \text{shift}$, treated $=\hat\beta_0+\hat\beta_1+\text{shift}$, where $\text{shift} = \frac1n\sum_r \sum_j \text{factors}(r)_j\,\hat\beta_{3+j}$ — "The factors at their average over everyone, so the adjusted means are for the study's own mix of classes and orders."
- `n` per group.

Pinned: equal pre-tests → effect = difference of post means, $df = n-3$; an effect hidden by unequal pre-tests is recovered to 0.002 with one class dummy ($df=n-4$) and with an order dummy too ($df=n-5$) (`tests/analysis.test.ts:33-62`).

#### `StudentScores`, `scoresFromTests(rows)` (`:118-139`)

From the tests CSV export: one record per student (`class`, `condition`, `order = test_order`), with `pre`/`post` as `{ form, answered, correct }` (each `null` until a row of that phase arrives) accumulated per row; a row counts as right when `correct === "1"` or `verdict === "correct"`. Rows whose `phase` is neither are skipped (the student's record is created before that check, so such a student still appears with both tests `null`).

#### `answerChecks(rows)` (`:146-155`)

Per condition: `answers`, `late` (`late === "1"`), `remarked` (non-empty `client_verdict`). "Reported beside the analysis, which keeps every answer as the server marked it; exports from before these columns count none."

#### `analyseStudy(scores)` (`:172-199`)

1. `testLength` = max `answered` over every pre and post (0 with no data). A test is done when `answered === testLength` ("a passed question counts as answered and wrong").
2. `complete` = students with both done; `share(t) = correct/testLength`.
3. `rows: StudyRow[]` from `complete` with `treated = condition === "adaptive"`.
4. `means` per condition (pre, post, gain) over complete students.
5. `canCompare` = at least 2 rows in each group and `rows.length > ancovaParams + 1`.
6. `ancova(rows)` and `welch(gains treated, gains control)` when comparable, else `null`.
7. `forms`: Welch on pre-test shares of **every finished pre-test** (students without a post-test included), form A minus B, when both have ≥2.

Returns `{ students: {cond: {all, complete}}, testLength, means, ancova, gains, forms }`. Pinned: an unfinished post-test excludes the student from the comparison but not the form check; with one student per condition everything is `null` (`tests/analysis.test.ts:80-114`).

### src/model/simulate.ts — synthetic learners and the simulation study

The header (`:1-18`) defines the three worlds (elo, irt2pl, bkt, the last with optional forgetting: "With forget above 0, a learner who knows it may also lose it at each question on it, which BKT assumes never happens"), the two learning assumptions (flat, zpd) and transfer, and warns: "a study run only here favours the model's view ... Report results across these assumptions and worlds, never for one alone."

#### `SIM_SKILLS` (`:28-37`)

`FIRST_SKILLS` from practiceSkills — the 38 skills as they were when `docs/results` was made: "The world draws its random numbers skill by skill, so simulating a skill added later would change every number in them." `ALL_SKILLS` (local) flattens them in `AREAS` order; `AREA_OF`/`areaOf` a local map; `isSimSkill`.

#### `SimParams`, `DEFAULT_SIM`, `WORLDS` (`:39-70`)

`students 120`, `questions 150` per student, `seed 1`, `spread { global 1, area 0.5, skill 0.5, difficulty 0.7 }` (SDs), `levelGap 1`, `learnRate 0.02` (ability units per question; "at most, under zpd"), `learning "flat"`, `transfer 0`, `forget 0` ("BKT world: the chance that a question on a known skill leaves it unknown (0: never, as BKT assumes)"), `world "elo"`. BKT-world constants (`:72-76`): `GUESS = {1: 0.3, 2: 0.2, 3: 0.1}`, `SLIP = {1: 0.05, 2: 0.1, 3: 0.2}` ("guessing is easier and slipping rarer on easy questions"), `LEARN_PER_RATE = 2.5` (learn probability per question = $2.5\cdot\text{learnRate}$; $0.02 \to 5\%$).

#### `rng(seed)` (`src/model/random.ts:7-19`)

The generator lives in its own 19-line module, `src/model/random.ts`, which `simulate.ts` imports and re-exports (`:24-26`, so the tests' `import { rng } from "../src/model/simulate.ts"` keeps working) and `evaluate.ts` imports for its bootstrap. Its header says why: the generator is the one in `src/math/random.ts` "except that seed 0 is a seed of its own here (there it becomes 1); the published simulations were made with this one, so it stays, in a module the browser's learner model can import without the simulator." mulberry32: $a \leftarrow a + \texttt{0x6d2b79f5}$; $t = a$; $t = \text{imul}(t \oplus (t \gg 15),\ t\,|\,1)$; $t \mathrel{\oplus}= t + \text{imul}(t \oplus (t\gg7),\ t\,|\,61)$; return $((t \oplus (t\gg14)) \gg\!\!> 0)/2^{32}$. `normal(sd)` is Box–Muller using **two** draws: $sd\cdot\sqrt{-2\ln(1-u_1)}\cos(2\pi u_2)$ ($1-u_1$ avoids $\ln 0$; the sine partner is discarded). `pick(items)` = `items[⌊next()·n⌋]`.

#### `makeWorld(params)` (`:89-143`)

Draw order from `rng(p.seed)` (this fixes the "truth" and must not change):

1. `base`: per skill in `ALL_SKILLS` order, $b_s \sim N(0, \text{spread.difficulty})$.
2. Per learner `sim1..simN`: $g \sim N(0, \text{spread.global})$, then one $a_A \sim N(0,\text{spread.area})$ per area in `AREAS` order, then per skill $\theta_s = g + a_{A(s)} + N(0,\text{spread.skill})$. `known` starts empty.
3. `difficulty(skill, level) = b_s + (L-2)\cdot\text{levelGap}`.
4. `dependants`: inverse of `PREREQUISITES`, restricted to dependants that are sim skills.

**bkt world** (`:102-125`): every learner's `known[s]` is drawn with probability $\sigma(\theta_s - b_s)$ ("Ability against the skill's middle difficulty is the chance of knowing it at the start"). `chance = known ? 1 − SLIP[L] : GUESS[L]`. `answer`: draw `right` with probability `chance`; learning probability $\ell = \min(1, 2.5\cdot\text{learnRate})\cdot(\text{zpd} ? 4p(1-p) : 1)$; then, if the skill is known, it is lost with probability `forget`, a draw made only when `forget` is above 0 ("Forgetting draws only when it is on, so every result made without it keeps its numbers", `:117-120`); otherwise `teach(l, skill, ℓ)` flips it to known with probability $\ell$ (`teach` draws only for an unknown skill, by short-circuit). A skill forgotten at a question is not retaught at the same question. With transfer, each dependant is taught with probability $\text{transfer}\cdot\ell$.

**elo / irt2pl worlds** (`:127-142`): `discrimination[s] = exp(N(0, 0.4))` in irt2pl, exactly 1 in elo (no draws consumed). $\text{chance} = \sigma(a_s(\theta_s - \text{difficulty}))$. `answer`: draw `right`; $\text{gain} = \text{learnRate}\cdot(\text{zpd} ? 4p(1-p) : 1)$; $\theta_s \mathrel{+}= \text{gain}$; dependants gain $\text{transfer}\cdot\text{gain}$. Pinned: flat gain is exactly 0.02 at level 1, zpd gain ≤ 0.02, transfer 0.5 gives `expand` 0.01 from a `linear` question (`tests/model.test.ts:165-177`); the BKT world's chances are 0.2/0.8 and practice eventually teaches (`:149-163`).

#### `simulateRandom(params)` (`:145-161`)

A class practising at random with `rng(p.seed + 1)`: for each round $q < \text{questions}$ and each learner, pick an area, a skill in it, a level (three draws), answer through the world. Returns `{ observations, world }`. The unit tests use this to show the model beats the counting baselines by log-loss and AUC, is calibrated within 0.05 in bins with ≥300 answers, and ranks the 114 true difficulties (Spearman > 0.9) and the students (> 0.85) (`tests/model.test.ts:60-84`).

#### `SimPolicy`, `Arm`, `armName`, `StudyParams`, `SimStudent`, `StudyResult` (`:166-194`)

`SimPolicy = Policy | "random"`; `Arm = { policy; target? }`; `armName` is `"adaptive 0.6"` when a non-default target is set, else the policy name. `StudyParams` adds `skills`, `arms: [Arm, Arm]`, `testLength`. `SimStudent = { arm; pre; post; preTest; postTest }` — `pre/post` are the true expected scores, `preTest/postTest` a sat test. `StudyResult = { arms: [name, name]; learners; chosen: [number[], number[]] (true chance of every chosen question, by arm); targets }`.

#### `runStudy(params)` (`:202-233`)

Defaults: `skills = inCurriculumOrder(SIM_SKILLS.algebra)` (12 algebra skills), arms `[adaptive, fixed]`, `testLength 12`. Steps:

1. `world = makeWorld(p)` (seed), `model = new EloModel()` (defaults, one shared model "as the server's does"), `r = rng(seed + 2)` for policy ties and the random arm, `tr = rng(seed + 3)` for tests — "the tests draw their own luck, so they don't change what happens in practice".
2. `truth(l)` = mean of `world.chance(l, k, L)` over the class skills × 3 levels: the true expected score.
3. `items = testItems("SIM", skills, "A", testLength)`; `sit(l)` = share of items answered right by Bernoulli draws from `tr`.
4. Learners get `arm = i mod 2`, `pre = truth`, `preTest = sit`, `position 0`, `recent []`.
5. For each round and each learner: `random` arm picks a skill and level with `r`; otherwise `choose(policy, model, id, skills, position, { recent, random: r.next, target })`. Push the true chance to `chosen[arm]`, `model.update` with the world's answer, `position++`, `recent` kept to the last 3.
6. Return `post = truth`, `postTest = sit`, arm names, `targets` (adaptive: its target or TARGET; others: TARGET, which `offTarget` uses as the yardstick).

Pinned: the same seed gives a byte-identical result; both arms gain; the adaptive arm's questions sit ≥0.05 nearer the target than fixed; test scores are whole twelfths and track the truth on average (`tests/model.test.ts:119-147`).

#### `mean`, `sd`, `cohensD`, `summarise(result)` (`:235-257`)

`cohensD(a, b) = (\bar a-\bar b)/s_{\text{pooled}}$ with the $(n-1)$-weighted pooled SD. `summarise`: per arm `{ name, n, pre, gain (mean post−pre), sd of gains, offTarget = mean |chance − target| }`, plus `d` on true gains and `dTest` on test gains.

#### Seeds and worker parallelism (`scripts/simulate-study.ts`, `scripts/simulate-worker.ts`)

`study(a, arms, students, run)` (`simulate-study.ts:61-62`) builds a `Partial<StudyParams>` with `seed = (run + 1) · 101` — "its seed comes from its run alone, so it is the same whichever thread runs it". `runStudy` draws only from `rng(seed)`, `rng(seed+2)`, `rng(seed+3)` (and `Math.random` is never reached because `random: r.next` is always passed), so a task is a pure function of its params. `runAll` (`:65-86`) sorts tasks by class size descending for load balance, hands each `{ id, params }` to a free `Worker` over `postMessage`, and stores each returned `outcome` at `results[id]`; the output is therefore in task order whatever the scheduling. The worker (`simulate-worker.ts:16`) replies `{ id, outcome: outcome(runStudy(params)) }`, where `outcome` (`:9-12`) runs the planned `ancova` on `preTest/postTest` (treated = arm 0, no class or order factors) and `summarise`. `--jobs 1` (or fewer than two tasks) runs in-thread with identical numbers.

The script's two modes (`simulate-study.ts:94-162`). Options: `--skills algebra,average` (areas expand to their `SIM_SKILLS`, then `inCurriculumOrder`; default `algebra`), `--students 60`, `--questions 60`, `--runs 10` (100 under `--power`), `--test-length 12`, `--worlds`, `--target`, `--csv`, `--json`, `--jobs`. The assumption grid is every world × `{flat, zpd}` × transfers × learning rates (`:52-54`). *Grid mode* (default): transfers `{0, 0.3, 0.6}`, rates `{0.02, 0.1}`, comparing adaptive against fixed, and with `--grid` also adaptive against random and adaptive aiming at 0.6 and 0.85 against fixed (`:57-59`). Each CSV row (`:129-146`) carries `world, learning, transfer, learnRate, compare, d, dLow, dHigh, dTest, ahead, gainA, gainB, offA, offB`: `d` is the mean Cohen's d of true gains over the runs, `dLow/dHigh` its 95 % interval $\bar d \pm t_{0.025,\text{runs}-1}\,s_d/\sqrt{\text{runs}}$, `dTest` the same on test gains, `ahead` the share of runs with $d>0$. *Power mode* (`--power`): transfers `{0, 0.3}`, rates `{0.02, 0.1}`, class sizes `--sizes 20,40,80,160` (even, ≥ 8), adaptive against fixed only; each row (`:101-113`) carries `world, learning, transfer, learnRate, students, power, adaptiveWins, fixedWins, d, t`, where `power` is the share of runs whose ANCOVA on the sat tests has $p<0.05$, `adaptiveWins`/`fixedWins` split that by the sign of the estimate, and `d`, `t` are the mean ANCOVA `d` and t statistic. Numbers in the CSV are rounded to 6 significant figures (`:88-92`).

### src/model/mastery.ts — mastery rules and how they are judged

The header (`:1-11`) states the thesis's H2 and H3: "A mastery rule reads one student's answers on one skill and says after how many it declares the skill mastered, if it ever does: BKT when P(known) reaches a threshold, the exponential moving average (EMA) when its score does, or N right in a row." On simulated learners the truth is recorded after every answer, so each declaration is right or wrong (H2); on real answers it is not (H3). H2 compares the rules "at equal precision: each method's threshold is the cheapest one whose declarations are right at least 90 % of the time on training learners"; comparing at equal practice is "kept as description". "A practice never declared costs its full length, as a learner who is never let go practises to the end." The module imports the skill list, `elo.ts` types, BKT's and the EMA's pieces from `evaluate.ts` (`bktStep`, `fitBkt`, `emaStep`, `fitEma`, `bootstrapGroups`, `calibration`, `rmse`) and the simulator (`:12-15`); it is driven by `scripts/mastery.ts` and tested by `tests/mastery.test.ts`.

#### `Practice`, `MasteryRule` and the three rules (`:17-56`)

`Practice = { student; skill; answers: Uint8Array; known?: Uint8Array }`: one student's answers on one skill in order, and in simulations whether they knew it after each. `MasteryRule = { name; declare(skill, answers, practice?): number | null }`: the 1-based number of the answer after which mastery is declared, or `null`. The practice itself is the optional third argument, "for a rule that needs more than the answers": BKT on each atom (`atoms.ts`) reads which atom each question asked for from it, and `decide` passes it.

- `streakRule(n)` (`:30-37`), named `streak n`: the first answer that completes a run of `n` right. "N right in a row: the rule deployed systems use (three in the ASSISTments skill builders)."
- `emaRule(p, θ)` (`:39-46`), named `EMA θ …`: starts at `p.start`, applies `emaStep` per answer and declares at the first score $\ge \theta$.
- `bktRule(paramsOf, θ)` (`:48-56`), named `BKT θ …`: starts at the skill's `init`, applies `bktStep(...).known` per answer ("after the answer and the chance to learn from it") and declares at the first $P(\text{known}) \ge \theta$.

`shown` (`:26-28`) names thresholds: up to 0.9999 as the number to four places, above it by the distance from 1 ("1 − 1e-7.5 is 1 − 10^−7.5"), so every threshold of the extended search has its own name.

#### `simulatePractice(params)` and `practicesFrom(observations)` (`:58-106`)

`PracticeParams` (`:62-69`) is `Partial<SimParams>` plus `skills` (default `ALL_SIM_SKILLS`, the 38 `SIM_SKILLS` flattened in `AREAS` order, `:70`), `length` (questions per learner per skill, default 30), `level` (default 2) and `masteredAt` (default `MASTERED_AT = 0.9`, `:61`). `simulatePractice` (`:78-96`) builds one `makeWorld` and has every learner practise every skill one after another, `length` questions each, all at `level`; after each `world.answer` it records whether the learner now knows the skill: in the bkt world the learner's `known` state, elsewhere whether `world.chance(l, skill, level) >= masteredAt`. The comment: "With one level, flat learning, no transfer and no forgetting the bkt world is exactly BKT (Proposition 2 in the outline)." `practicesFrom` (`:99-106`) turns logged observations into one `Practice` per student and skill, in order of first appearance, with no `known`.

#### `fitRules(train)` (`:108-118`)

Groups the training practices' answer sequences by skill, fits BKT per skill with `fitBkt` and one EMA with `fitEma` over all sequences, "as the held-out replay fits them". A skill absent from training uses parameters fitted on all skills, "fitted only if needed" (`pooled ??= fitBkt(all)`). Returns `Fitted = { bkt: (skill) => BktParams; ema: EmaParams }`.

#### `decide`, `judge` (`:120-159`)

`decide(rule, practices)` gives a `Decision = { at, right }` per practice; `right` is `known[at - 1] === 1`, or `null` when the rule never declares or the practice has no truth. `judge` returns a `Judgement`: `declared` (share of practices declared), `cost` (mean answers until declared, a never-declared practice counting its full length), `precision` ("The share of declarations made while the learner knew the skill (NaN without a truth or a declaration)") and `missed` ("The share of practices ending with the skill known in which mastery was never declared (NaN if none)"). It accepts precomputed decisions so a rule is not replayed twice.

#### `thresholdForCost(make, practices, cost, lo = 0.5, hi = 0.9999)` (`:161-173`)

"A higher threshold is never reached sooner, so cost never falls as it rises, and bisection finds it": 30 halvings of `[lo, hi]`, then whichever end's cost is nearer the target.

#### `bootstrapByStudent`, `precisionOf`, `costOf` (`:175-190`, `:256-261`)

`bootstrapByStudent(practices, statistic, resamples = 2000, seed = 1)` groups practice indices by student and calls `bootstrapGroups` from `evaluate.ts`, handing the statistic the indices of every practice of every student drawn, "since one student's practices on different skills are not independent". `precisionOf(decisions)` and `costOf(decisions, practices)` are statistics of that shape: precision and mean cost over the given indices.

#### `compareAtCost(train, test, fitted, n = 3, resamples = 2000, seed = 1)` (`:192-222`)

Equal practice, "as description": the streak rule's mean cost on the training practices is the target; `thresholdForCost` finds BKT's and the EMA's thresholds that cost the same on the training practices; all three rules are judged on the test practices. Each `AtCost` row adds `threshold` (`null` for the streak), a precision `interval` over test students and, on the EMA and streak rows, `bktAhead`: BKT's precision minus this rule's, with its interval.

#### H2: `PRECISION_TARGET`, the threshold grids, `cheapestAtPrecision`, `compareAtPrecision` (`:224-305`)

`PRECISION_TARGET = 0.9` (`:225`). `FINE_THRESHOLDS` (`:230-234`) are "every 0.01 from 0.5 to 0.99, then finer up to 0.9999, since BKT's P(known) crowds just below 1 and only the finest steps make it wait": 50 + 9 + 9 = 68 values (0.50 … 0.99, 0.991 … 0.999, 0.9991 … 0.9999). `BEYOND_THRESHOLDS` (`:241-244`) append $1 - 10^{-k}$ for $k = 4.1, 4.2, \ldots, 15$ (110 values), "as a check that came after the results"; "past 1 − 10^−15 the difference from 1 is lost in double precision". `cheapestAtPrecision(rules, practices, target)` (`:247-254`) returns the rule with the lowest cost among those whose precision on the given practices is at least `target`, or `null`.

`compareAtPrecision(train, test, fitted, target, resamples, seed, thresholds = FINE_THRESHOLDS)` (`:278-305`) is H2's comparison. The families are BKT and EMA at every threshold in `thresholds`, and the streak rule for every N from 1 to the longest training practice. Each family's rule is chosen by `cheapestAtPrecision` on the training practices and judged on the test practices; each `AtPrecision` row carries the judgement with bootstrap intervals for cost and precision, and on the EMA and streak rows `bktSaves`, "This rule's cost minus BKT's, with its interval: above zero, BKT needs fewer answers". A method no threshold qualifies for comes back as `{ method, rule: null }`; if that method is BKT, the other rows get no `bktSaves`.

#### `tradeOff(fitted, practices)` (`:307-318`)

Cost and precision for BKT and the EMA at `CURVE_THRESHOLDS` (θ from 0.80 to 0.99 in steps of 0.01, 20 values) and the streak rule at `CURVE_STREAKS` (N = 2 … 6): 45 `CurvePoint`s, "the description around H2's single comparison".

#### `masteryCalibration(fitted, practices)` (`:320-349`)

For every answer of every practice that has a truth, three scores as their rules read them, each paired with whether the learner had mastered the skill at that moment: BKT's $P(\text{known})$ after the step, BKT's chance of a right answer next, $P(\text{known})(1-\text{slip}) + (1-P(\text{known}))\,\text{guess}$, and the EMA's score. Each score gets `n`, a Brier score (`rmse(ps) ** 2`, the mean squared gap between score and truth) and ten `calibration` bins whose `observed` is the share mastered. The comment notes the truth is the known state in the bkt worlds and the true chance reaching `masteredAt` in the gradual ones, "the scale of the other two scores".

#### H3: `agreement`, `rightAfter` (`:351-388`)

On real answers, where the truth is unknown. `agreement(first, second, practices)` gives the shares of practices in which both rules, only the first, only the second, or neither declare, and `meanGap`, the mean of the first rule's answer count minus the second's where both declare. `rightAfter(rule, practices, k = 3)` counts, over practices that have answers after the declaration, the share right among the next `k`; "Few practices have them when the data were collected under the streak rule itself."

#### What the tests pin (`tests/mastery.test.ts`)

The streak rule's declarations on hand-made sequences (`:18-24`); Proposition 1, that three in a row equals the EMA with α 0.6, θ 0.92 and any start below 0.5 on every 0/1 sequence of length up to 12, and not at start 0.65 (`:26-37`); `emaStep`, an `EmaModel` with given settings that `fit` leaves alone (`:39-50`); `fitEma`'s start as the share of right first answers and α at the top of the grid when answers never change, at most 0.05 for independent coin flips (`:52-63`); `bktRule` against a hand replay (`:65-74`); Proposition 2, that with the true parameters BKT's declarations are right at least θ of the time, within 0.01, on 20 000 simulated practices (`:76-94`); `judge`'s counts by hand (`:96-106`); `thresholdForCost` (`:108-117`); `bootstrapByStudent` resampling whole students (`:119-129`); `agreement` and `rightAfter` by hand (`:131-141`); `practicesFrom` (`:143-147`); `simulatePractice` being deterministic, drawing nothing extra with `forget: 0`, losing a known skill only with forgetting, and letting learners cross the line in a gradual world (`:149-159`); `compareAtCost` and `tradeOff` (`:161-176`); `cheapestAtPrecision` and the two threshold grids (`:178-200`); `compareAtPrecision`, including that searching `BEYOND_THRESHOLDS` changes no rule found below 0.9999 and that an unreachable target gives `rule: null` for all three (`:202-223`); `masteryCalibration` by hand (`:225-244`) and BKT's chance of a right answer never passing $1 - \text{slip}$ (`:246-252`).

### src/model/conceptGraph.ts — a concept's inside, and whether an idea is an atom

A prototype, fractions only, that nothing in the app reads yet. The header (`:1-11`) states the idea: a skill is "made of smaller ideas (nodes) joined by connections (edges), and how big that graph is says how complex the concept is", and "mastery is only well defined on ideas that are atoms: learnt as one thing, so that a student has it or has not".

#### The graph (`:16-61`)

`ConceptGraph = { nodes: Record<N, string>; edges: [from, to, kind][] }`, where `kind` is `"needs"` (the second idea cannot be done without the first) or `"joins"` (the two are used together, one inside the other). `FRACTIONS` (`:26-54`) has 10 ideas (`part`, `equivalent`, `lowest`, `commonDenom`, `addSub`, `multiply`, `reciprocal`, `divide`, `toImproper`, `toMixed`) and 13 edges, three of them joins (`commonDenom→addSub`, `toImproper→addSub`, `toImproper→multiply`). `complexity(g)` (`:58-61`) is the count of ideas, of edges and their sum: 10, 13, 23. `edgeId` names an edge `from→to`.

#### Reading a question: `fractionsUses(ex)` (`:63-100`)

Reads the operation and the two numbers from the question's worked-solution spec (`fracop`, `practice.ts`) and returns the ideas it needs and every edge between two of them (`usesOf`, `:65-68`). Adding or subtracting needs `addSub`, and `commonDenom` with `equivalent` when the denominators differ; multiplying needs `multiply`, dividing also `reciprocal` and `divide`; a mixed number in the question needs `toImproper`; and `lowest` with `equivalent` is added when the usual method (over the lowest common denominator, or tops times tops) leaves a result whose top and bottom share a factor. Never `toMixed`: "an improper answer is accepted, so no question asks for a mixed number back".

#### `FRACTIONS_GAPS` and `progressOf` (`:102-118`)

`FRACTIONS_GAPS` names the idea or edge each fractions mistake shows is missing: `addAcross` → `addSub`, `flipFirst` → `reciprocal→divide`. `progressOf(g, known, edgeShare = 0.8)` gives the share of ideas and of edges a student knows, and `mastered` when they know every idea and at least `edgeShare` of the edges.

#### The three atom tests (`:120-209`)

`needsOf(g, node)` (`:122-130`) is everything an idea needs, following needs edges only.

- Test 1, `testedAlone(g, questions)` (`:132-143`): an idea is tested alone by a question that needs it and otherwise only what it needs, so "a wrong answer there points at the idea". Over the generator's questions only `addSub`, `multiply` and `divide` are; every step inside them comes with another idea, and `toMixed` is never asked.
- Test 2, `learningCurve(attempts, node)` (`:160-187`): the error rate at each opportunity to use the idea, read as far as `CURVE_STUDENTS = 20` students got, with half an error added to each point so it has a logarithm; a power law $\text{error} = a k^{-b}$ fitted in logs. `smooth` when there are at least three points, the curve falls and $R^2 \ge$ `SMOOTH_R2 = 0.8`. A curve that jumps back up is "typically a harder part that only later questions ask".
- Test 3, `transfers(attempts, node)` (`:189-209`): two logistic models (`fitLogistic` from `evaluate.ts`) predict each answer from its form and from $\log(1 + \text{earlier practice})$, practice counted over every form or over the answer's own form only. They have as many weights each, so the higher log-likelihood wins; `transfers` when counting every form fits at least as well (Learning Factors Analysis).

`Attempt = { student; nodes; right; form? }` (`:146`) is one answer with the ideas its question needed; `opportunities` (`:148-158`) counts each student's earlier attempts on the idea, of any form and of the same form.

#### What the tests pin (`tests/conceptGraph.test.ts`)

The graph's counts, that no idea needs itself and every idea but `part` needs `part`; the ideas read from hand-made questions; that the generator shows every idea and edge but `toMixed` and `part→toMixed`, with more ideas per question at each level (about 3.9, 4.3 and 5.3); that each gap is used by every question its mistake can happen on; `progressOf` at the default and a stricter share; test 1 on the generator. Tests 2 and 3 run on simulated learners whose atoms are known (300 learners, 12 questions, seeds 1–3): one atom passes both; two atoms asked in turn give a smooth curve that only the transfer test tells apart; a harder atom first asked at the seventh question breaks the curve.

### src/model/atoms.ts — skills made of atoms, and BKT on each

A check that came after the thesis's results, on the reading that BKT is right about atoms and that a skill made of several of them is what looks like gradual learning. The header (`:1-19`): "every skill is k atoms, and each atom is exactly what BKT assumes a skill is: known or not, learnt all at once, with a guess and a slip. A question on the skill asks for one atom, chosen at random". The skill is mastered when every atom is known, "which here is the same as the gradual worlds' definition: the chance of a right answer on the next question is at least 0.9 (one minus the slip) only then". Skills may also share atoms, "as multiplying whole numbers is in fractions, percentages and areas": a learner keeps what they know of an atom from one skill to the next, and BKT on each atom can carry each atom's $P(\text{known})$ along, "which BKT on the skill cannot". It reuses `mastery.ts` for everything but the atoms, is driven by `scripts/atoms.ts` and tested by `tests/atoms.test.ts`; nothing in the thesis's results reads it, and `simulate.ts` is untouched, so no published number moves.

#### The world: `dealAtoms`, `simulateAtoms(params)` (`:29-114`)

`AtomPractice` (`:29-33`) is a `Practice` with its truth (`known`, every atom of the skill known after each answer), `ids` (the names of the skill's atoms, `atom1`, `atom2`, …), `atom` (which of them each question asked for, an index into `ids`) and `atomKnown` (each one's state after each answer). `AtomParams` (`:35-48`) are `students`, `skills`, `atoms` (per skill), `uses` (skills each atom is in), `length`, `learnRate` and `seed`; `DEFAULT_ATOMS` (`:49`) is 400 students, 12 skills, 2 atoms, none shared, 30 questions, rate 0.02, seed 1. Each atom guesses 0.2 and slips 0.1, the BKT world's chances at level 2 (`:52`), and an unknown atom is learnt after a question asking for it with chance `min(1, 2.5 × learnRate)`, as in the BKT world (`:53`).

`dealAtoms(skills, atoms, uses, seed)` (`:55-76`) says which atoms each skill is made of. The pool has skills × atoms / uses atoms (it throws when that is not whole). With `uses` 1 skill s gets atoms s·k to s·k + k − 1; above it every atom is put in `uses` skills, shuffled with a generator of its own (`rng(seed + 1)`, "so the answers' draws stay as they are") and dealt again until no skill has an atom twice, throwing after 10 000 tries.

`simulateAtoms` (`:78-114`) has every learner practise every skill, one after another. Ability is an overall part and one per skill with `DEFAULT_SIM`'s spreads; each atom has its own difficulty, and ability against it, "in the skill where the learner first meets the atom", is the chance of knowing it at the start. A learner's atom states live in one map across all their skills, so an atom learnt in one skill is known in every later skill that has it. With no atom shared, the draws come in the same order as before sharing was added, so the results of PR #41 are reproduced exactly.

#### Splitting, BKT on each atom, and carrying: `byAtom`, `atomsRule`, `carried`, `fitAtoms`, `fitCarried`, `atomsCalibration` (`:116-198`)

`byAtom` (`:116-124`) turns each practice into one practice per atom, named by its id, with the answers its questions got, in order, and that atom's truth. `atomsRule(paramsOf, θ, starts?)` (`:129-147`), named `BKT per atom θ …` or `BKT per atom, carried θ …`, reads the atoms from the practice (`MasteryRule`'s third argument), updates only the asked atom's $P(\text{known})$ with `bktStep` and declares at the first answer after which every atom's is at least θ. Each atom starts at its fitted `init`, or, given `starts` (`Starts`, `:126-127`), where the student's earlier skills left it. `carried(paramsOf, practices)` (`:149-165`) makes those starts: it walks each student's practices in the order given, keeping a $P(\text{known})$ per atom, so "an atom met before starts where its last answer left it, one never met at its fitted init". BKT has no learning without practice, so an atom's value waits unchanged between the skills that ask for it.

There are two fits. `fitAtoms` (`:173-174`) fits BKT per atom on each skill's answers on it on their own, the afresh view; `fitCarried` (`:175-184`) fits it on each student's answers on the atom across every skill, in order, the carried view, whose `init` is the chance of knowing the atom on first meeting it. With no atom shared the two fits are the same. `atomsCalibration(paramsOf, practices, starts?)` (`:186-198`) scores every answer with the product of the skill's atoms' $P(\text{known})$ against every atom known: a Brier score and ten bins, as `masteryCalibration` gives them.

#### `compareAtoms(train, test, target, resamples, seed, thresholds)` (`:200-249`)

`compareAtPrecision` on the skill as H2 runs it (BKT, EMA and the streak rule, with `fitRules`), then BKT on each atom afresh (`perAtom`) and carried (`carried`), each the cheapest of `atomsRule` at every threshold whose declarations on the training practices are right at least `target` of the time, judged on the test practices with bootstrap intervals over students. `carried` gets its starts from one walk over the training and the test practices (each student is on one side only). When BKT on the skill also meets the standard, each per-atom row gets `bktSaves`, its cost minus BKT on the skill's; when both per-atom rules meet it, `carryingSaves` is carried's cost minus afresh's, with its interval (below zero, carrying saves answers). `calibration` is the skill's three scores from `masteryCalibration`, then BKT on each atom afresh and carried. A declaration still takes at least one answer, so a skill whose atoms were all learnt before costs carried BKT one answer, not none.

#### What the tests pin (`tests/atoms.test.ts`)

The world keeps its truth straight: one atom asked per question, an atom once known stays known, only the asked atom can be learnt, the skill is known exactly when every atom is, the same seed gives the same practices, and `byAtom` puts every answer with its atom in order (`:11-30`). With one atom, BKT on each atom is BKT on the skill: the same fitted parameters, the same declaration at two thresholds on every practice, the same Brier score (`:32-39`). With three atoms (200 students, 4 skills, rate 0.1) BKT on the skill meets H2's standard at no threshold up to 0.9999, BKT per atom is cheaper than the EMA, and the Brier scores order as in the gradual worlds; with no atom shared, carrying changes nothing (`:41-54`). With two atoms both forms of BKT meet the standard and per atom needs fewer answers (`:56-61`). `dealAtoms` deals in order with none shared, puts every atom in exactly `uses` skills and never twice in one, and throws when it cannot (`:63-75`). A shared atom known at the end of one skill is known all through the next skill that has it (`:77-88`). `carried` by hand: a student's second skill starts the shared atom where the first left it, a new atom and another student start at `init`, and a carried start lets one right answer reach a threshold that afresh it does not (`:90-110`). With every atom in three skills (6 skills, rate 0.1) carrying needs fewer answers than starting afresh, its interval below zero, and is better calibrated; with no atom shared the two fits agree (`:112-121`). The statistical claims hold on seeds 1 to 5.

### src/learner.ts — the browser-side learner client

Header (`:1-2`): the student's code, the record of the current question, and "an outbox that keeps finished questions in this browser until the server has them (classroom Wi-Fi drops)".

#### Types (`:10-60`)

- `Condition = "adaptive" | "fixed"`; `Student = { code; class; condition }`.
- `AnswerVerdict = "correct" | "close" | "wrong" | "form"` ("form (right idea, wrong form: sent back without counting as a miss)"); `Outcome = "solved" | "revealed" | "skipped"`.
- `ChosenBy = Condition | "free" | "review"`; `Origin = { policy: ChosenBy; review: boolean; predicted: number | null }` — how a question came to be asked.
- `Phase = "open" | "pretest" | "session" | "posttest" | "closed"`; `Protocol = { class; phase; sessionEnds; testLength; tests: Record<TestPhase, { form; answered: number[] }> }`.
- `Plan = Protocol & { condition; skills; position; recent; state: ModelState }` — the server's `GET /api/students/:code/plan`; "the student's ratings are under 'me'".
- `LoggedAnswer = { input; verdict; ms }`.
- `Attempt` (`:34-49`): `{ clientId, student, skill, level, seed, review, outcome, policy, predicted, solutionViewed, msTotal, answers, shownAt }` — what the server stores per question; `clientId` is the idempotency key.
- `QuestionLog` (`:52-60`): `{ shownAt (Date.now), t0 (performance.now), answers, outcome: Exclude<Outcome, "skipped"> | null, msTotal | null, solutionViewed }` — "skipped" is never logged; it is what `toAttempt` writes for a question left without an outcome. "Times are from performance.now(), so a clock change doesn't skew them."

#### `startLog`, `verdictOf`, `logAnswer`, `finish` (`:62-74`)

`startLog(shownAt = Date.now(), t0 = performance.now())`. `verdictOf(v: Verdict)`: `ok` → correct; `why` → form; `close` → close; else wrong. `logAnswer` pushes the trimmed input (≤200 chars), the verdict, and `ms = max(0, round(now − t0))`. `finish(log, outcome: "solved" | "revealed", now)` sets outcome and `msTotal` once; a second call is ignored ("the first outcome stands"; a solution looked at afterwards still counts via `solutionViewed`, but not its time).

#### `newId()`, `toAttempt(log, ex, origin, student, now, id)` (`:76-96`)

`newId` = 16 random bytes as 32 hex chars. `toAttempt` returns `null` when nothing happened (`!outcome && !answers.length`: "never tried"); otherwise the `Attempt` with `outcome = log.outcome ?? "skipped"` and `msTotal = log.msTotal ?? ms(log, now)` (time until leaving, for an unfinished question). Pinned in `tests/learner.test.ts:35-61`.

#### `ME`, `ClassPlan`, `toClassPlan`, `withProtocol` (`:98-105`)

`ME = "me"`: the student's own name in the browser's model. `ClassPlan` is `Plan` with `state` replaced by a live `model: EloModel`. `toClassPlan` = `EloModel.fromState(state)` plus the rest. `withProtocol(plan, p)` overlays only the protocol fields (`class, phase, sessionEnds, testLength, tests`) of a re-fetched plan onto the plan the browser has been carrying forward: "the teacher may have moved the class on" — the model, `position` and `recent` the browser advanced locally are kept (pinned `tests/learner.test.ts:121-124`: `moved.model === plan.model`, position stays 5).

#### `TestAnswer` (`:108-118`)

`{ clientId, student, phase, item, input, verdict: correct|close|wrong|skipped, retries, ms }`. "Nothing is shown to the student; the server works out which question it was."

#### `applyAttempt(plan, a)` and `attemptEvidence(a)` (`:120-131`)

"What the server will do once it has the attempt": `correct = attemptEvidence(a)`; if not null, `plan.model.update({ student: ME, skill, level, correct })`; if `a.policy === "fixed"`, `position++` (free and review questions do not move the fixed sequence); `recent = [...recent, skill].slice(-RECENT)`. `attemptEvidence` filters out `"form"` verdicts and calls the shared `evidence(counted.length, outcome, counted[0]?.verdict === "correct")`. So the browser can choose the next question (the dialog imports the policy's `choose` as `choosePolicy`, `src/components/PracticeDialog.tsx:9`) before the server has even received the last one, and arrive at the same choice the server would. Pinned in `tests/learner.test.ts:102-119`: a right fixed-sequence answer moves `position` 4 → 5 and `recent` to `["linear", "expand", "linear"]`; a form-only free question leaves the position and the serialised model untouched.

#### Storage: `Slot`, `localSlot`, `loadStudent`, `saveStudent` (`:135-164`)

`Slot = { get(): string | null; set(value | null) }` — "localStorage in the browser, a variable in the tests". `localSlot(key)` wraps `localStorage` with try/catch on both sides (`null` removes; failures are swallowed: "private mode or full storage: nothing is kept between visits"). The student is kept under `"zeno.student.v1"`; `loadStudent` validates `code` and `class` are strings. The two outboxes in the app are `new Outbox(localSlot("zeno.outbox.v1"), study.send)` and `new Outbox<TestAnswer>(localSlot("zeno.testbox.v1"), study.sendTest)` (`src/components/PracticeDialog.tsx:64-66`).

#### `SendResult` and `Outbox<T>` (`:166-218`)

`SendResult = "stored" | "drop" | "retry"`: "stored: the server has it (or had it already); drop: it never will (unknown student, refused); retry: try later."

`Outbox<T extends { clientId; student }>` holds a `Slot`, a `send(record, keepalive)` function and a promise `chain`.

- `items()`: parse the slot's JSON array (`[]` on anything malformed).
- `write(list)`: stores JSON, or `null` (removes the key) when empty.
- `add(a)`: append.
- `discard(student)`: drop that student's records ("they signed out and asked for their records to be deleted").
- `flush(keepalive = false)` (`:199-217`): the algorithm.
  1. `run` iterates the snapshot `this.items()` oldest first.
  2. For each, `await send(a, keepalive)`; an exception (network failure) counts as `"retry"`.
  3. `"retry"` → `break` (nothing later is sent, so order holds and the server sees attempts in sequence).
  4. `"stored"` or `"drop"` → **re-read** the slot and remove this `clientId` only: "something may have been added while this one was on its way" (a concurrent `add` is preserved).
  5. Resolve to `items().length`, how many are still waiting.
  6. Calls are serialised through `this.chain = this.chain.then(run, run)`: a second `flush` waits for the first rather than sending the same record twice, and runs even if the previous one rejected.

Pinned: `a` stored, `b` retry, `c` never reached → 2 left; after `b` becomes drop → 0 and the slot is `null`; a record added while a slow send is in flight survives and the second flush waits; a throwing send keeps the record (`tests/learner.test.ts:63-100`).

Keepalive: the dialog listens for `pagehide` (`PracticeDialog.tsx:199-201`, `onHide = () => leaveQuestion(true)`), which records the open question and flushes both outboxes with `keepalive = true` (`sendQueued`, `:145-147`) so the last attempt goes out as the tab closes; it flushes again on `online` and on mount ("anything left from an earlier visit"). `req` then sets `fetch`'s `keepalive` (see api.ts) subject to the 64 KB limit.

### src/api.ts — the fetch wrapper

#### `ApiError` and `req<T>(method, url, body?, keepalive = false, headers = {})` (`:11-28`)

`ApiError` carries `status`. `req` JSON-encodes the body if given, sets `Content-Type: application/json` only then (merged with any extra headers), and passes `keepalive: keepalive && json.length < 60000` — "Browsers refuse keepalive requests over 64 KB; a bigger one goes out normally and may not finish." Non-2xx → `throw new ApiError("METHOD url: status", status)`; 204 → `undefined`; else `res.json()`. No auth header for boards (same-origin cookie-less app; teacher routes add one).

#### `api` (boards, `:30-49`)

`list`, `create`, `get`, `save` (PUT with optional `baseUpdatedAt`; "fails with status 409 if the board was saved elsewhere since"; `keepalive` for the save the board page makes on `beforeunload`, `BoardPage.tsx:220-226`), `remove`, `share`/`unshare` (read-only link token), `shared(token, etag?)` — raw `fetch` with `If-None-Match`, returns `null` on 304, else `{ board, etag }`.

#### `study` and `upload` (`:51-74`)

`join(classCode)` → `POST /api/students`; `student(code)` → `GET /api/students/:code` (with `answered`); `plan(code)` → `GET /api/students/:code/plan` (the `Plan`); `forget(code)` → `DELETE`; `send(attempt, keepalive)` → `upload("/api/attempts", …)`; `sendTest(answer, keepalive)` → `upload("/api/tests", …)`.

`upload` maps the HTTP outcome to a `SendResult`: success → `"stored"`; `ApiError` with status 400, 404 or 413 → `console.warn` and `"drop"` ("Unknown student (their record was deleted) or a refused record: sending it again won't help"); anything else (network `TypeError`, 5xx, 401/403, 409) → `"retry"`. The server's duplicate handling (same `clientId` already stored → 2xx) is what makes "stored (or had it already)" true after a retry.

#### `ClassSummary`, `teacherApi(password)` (`:76-109`)

The teacher's calls carry `X-Teacher-Password` when a password is set ("empty when the server doesn't ask for one"): `classes`, `create(name, skills?, testLength?)`, `setPhase(code, phase, minutes?)` ("minutes starts a timed session"), `dashboard(code)` → `GET /api/research/dashboard?class=`, and `csv(kind, code?)` which fetches `/api/research/{attempts|tests}.csv` as a `Blob` because "a plain link can't send the password header".


## 4. The browser app shell, pages and study UI

The client is a single React 19 tree mounted by Vite. There is no router library: `src/main.tsx` reads `location.hash` and picks one of five pages. Every heavy page and every tool dialog is a `React.lazy` chunk. All user-facing strings come from one typed dictionary per language, loaded on demand. The board page wraps Excalidraw; the practice component runs the class study on the student's side, in a panel docked beside the board or on a page of its own; the teacher page is the study's dashboard.

### index.html

Fourteen lines. `index.html:6` links `/favicon.svg`; `index.html:7` sets the title "Zeno — math from zero to advanced"; `index.html:8` loads `/asset-path.js` as a classic script *before* the module entry; `index.html:11` is the `#root` mount; `index.html:12` loads `/src/main.tsx` as an ES module (Vite rewrites this in the build). The `lang` attribute is `en` statically and is overwritten by the i18n provider at runtime (`src/i18n.tsx:48`).

### public/asset-path.js

One statement: `window.EXCALIDRAW_ASSET_PATH = "/"` (`public/asset-path.js:2`). Excalidraw reads this global to find its fonts. The comment explains the shape: "a file, not an inline script, so the CSP can forbid inline code" (`public/asset-path.js:1`). Fonts are served from this origin instead of a CDN, which keeps the app offline-capable and lets the server's CSP drop `'unsafe-inline'`.

### src/main.tsx

#### Lazy pages

`main.tsx:7-11`: "Excalidraw + MathJax are heavy; load them only when a board is opened." `BoardPage`, `TeacherPage`, `SharedBoardPage` and `PracticePage` (`main.tsx:11`) are each `lazy(() => import(...).then((m) => ({ default: m.X })))`. The `.then` adapter is needed because the modules use named exports. `HomePage` is imported statically (`main.tsx:4`): it is the first paint and has no heavy dependency.

#### useHashRoute

`main.tsx:13-23`. State is `location.hash`; a `hashchange` listener updates it; cleanup removes the listener. One exception at `main.tsx:18`: a hash containing `addLibrary=` is ignored. Reason in the comment (`main.tsx:16-17`): "A library coming back from libraries.excalidraw.com ("#addLibrary=…") is the open board's business: its library handler takes it and puts the board's address back, so the route stays where it is." Excalidraw's `useHandleLibrary` (in BoardPage) consumes that hash and restores the previous one; if the router reacted it would unmount the board for a moment.

#### App

`main.tsx:25-55`. Routes, in priority order:

| hash | match | page |
|---|---|---|
| `#/s/:token` | `/^#\/s\/([\w-]+)/` (`main.tsx:28`) | `SharedBoardPage key={token}` |
| `#/practice`, `#/practice/:area` | `/^#\/practice(?:\/(\w+))?$/` (`main.tsx:35`) | `PracticePage key={area} start={area}` |
| `#/teacher…` | `hash.startsWith("#/teacher")` (`main.tsx:42`) | `TeacherPage` |
| `#/b/:id` | `/^#\/b\/([\w-]+)/` (`main.tsx:27`) | `BoardPage key={id}` |
| anything else | | `HomePage` |

Each lazy page sits in its own `<Suspense fallback={<div className="center-msg">…</div>}>`. The `key` props on `SharedBoardPage` and `BoardPage` force a full remount when the id changes, so all per-board refs (save base, timers, Excalidraw API) start clean; the one on `PracticePage` does the same when the area in the address changes, so the page opens afresh on the new area. Unlike the other patterns, the practice one ends in `$`, so anything after the area falls through to the home page. There is no error boundary anywhere in the tree; a thrown render error unmounts the app. Network failures are handled per page as state, never thrown.

#### Mount

`main.tsx:57-63`: `createRoot(#root).render(<StrictMode><I18nProvider><App/></I18nProvider></StrictMode>)`. `I18nProvider` is outside `App`, so the router renders nothing until the dictionary is here.

### src/i18n.tsx

#### Languages

`i18n.tsx:4` `Lang = "en" | "ru" | "ka"`. `LANGS` (`i18n.tsx:6-11`) carries the native label and the Excalidraw locale code to pass as `langCode`. Georgian maps to `"en"` for Excalidraw: "Excalidraw has no Georgian locale yet; its toolbar falls back to English" (`i18n.tsx:9`).

#### On-demand dictionaries

`LOADERS` (`i18n.tsx:14-18`) is one dynamic `import()` per language: "Each language is its own chunk; only the one in use is downloaded." `loaded` caches the resolved `Dict`; `loading` caches the in-flight promise; `load(l)` (`i18n.tsx:21`) is `loading[l] ??= LOADERS[l]().then(t => loaded[l] = t)`, so concurrent callers share one request.

#### Choosing the locale

`detectLang()` (`i18n.tsx:23-32`): `localStorage.lang` if it is one of the three codes (wrapped in try/catch for storage-less contexts), else `navigator.language.slice(0,2)` if `ru` or `ka`, else `en`.

`i18n.tsx:35` calls `void load(detectLang())` at module evaluation. Comment: "The page shows nothing until its words are here, so they are asked for as soon as this module runs, not once React has mounted and run its effects: one round trip less before the first paint."

#### I18nProvider

`i18n.tsx:41-64`. State: `lang` (initialised lazily from `detectLang`) and `shown` (`{lang, t}` or null). Effect on `[lang]`: load the dictionary, and when it resolves set `shown` only if the effect is still live (`live` flag reset by cleanup); also sets `document.documentElement.lang`. "While another language loads, the previous one stays up" (`i18n.tsx:43`). `setLang` writes state and persists to `localStorage.lang`. If `shown` is null the provider renders `null` (`i18n.tsx:61`): the whole app is blank until the first dictionary arrives. The context value is `{ lang: shown.lang, setLang, t: shown.t, excalidrawLang }`.

#### useI18n, LangSelect

`useI18n()` (`i18n.tsx:66-70`) throws outside the provider. `LangSelect` (`i18n.tsx:72-83`) is a `<select class="lang-select">` labelled `t.language`, rendering `LANGS`.

#### The t() API

There is no `t("key")` function. `t` is the dictionary object itself; components do `t.saved`, `t.pracWords.ui.check`, `t.shapes.names[id]`. Placeholders are filled by `fill` from `src/math/text.ts:5`: `s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""))`. Example: `fill(w.ui.score, score)` where `score = "{right} of {total} right · streak {streak}"` (`en.ts:4122`, `PracticeDialog.tsx:529`).

### src/locales/en.ts (and ru.ts, ka.ts)

`en.ts:1`: "English UI strings. ru.ts and ka.ts must have exactly the same keys (checked by the type below and by npm test)." `en` is a plain object literal; the last line `export type Dict = typeof en` (`en.ts:4169`) makes the English object the schema. `ru.ts:1-3` and `ka.ts:1-3` are `import type { Dict } from "./en"; export const ru: Dict = {…}`: TypeScript rejects a missing key, an extra key, or a wrong nested shape. The runtime check `tests/i18n.test.ts:8-25` walks every leaf path and compares kind (`string`, `array:n`, `function:n`) between en and each translation; `tests/i18n.test.ts:28-42` forbids a blank string in ru/ka unless en has the same blank (some `geoDragHint` entries are empty by design, `en.ts:128,130`).

Structure: top-level flat strings for the shell (`appName`, `saving`, `saveConflict`, `conflictText`, `shareHint`, …, `en.ts:3-91`; the one exception in that run is `colorNames`, a one-line object keyed by hex at `en.ts:36`), then a nested object per tool: `<tool>Topics` (tab key → label), `<tool>Hints` (tab key → one-line hint), `<tool>Words` (everything inside the dialog), e.g. `analysisTopics` `en.ts:317`, `algoWords` `en.ts:629`. Just before `shapes` sits a second run of flat practice strings (`en.ts:3602-3610`): `practice`, `editPractice`, the five area names, and the home page's practice card text `practiceIntro` and `practiceStart` (`en.ts:3604-3605`), followed by the `practiceHints` object. `shapes` (`en.ts:3618`) names the shape panel; `live` (`en.ts:3728`) the live pieces; `teacher` (`en.ts:3821`) the dashboard; `pracWords` (`en.ts:3909`) the practice generator's words, with `pracWords.skills` (`en.ts:3913`) and `pracWords.ui` (`en.ts:4112-4165`). The `Word` type in `tools.tsx:8` selects only the string-valued top-level keys, so a menu label can be typed as a key name.

### src/tools.tsx

The tool registry. Comment at top: "Every tool in one table: its dialog (loaded the first time it opens), its menu entry and its edit label. The board page, the menus and the tool search are all built from this list."

`ToolDialogProps` (`tools.tsx:11-18`): `initial?: unknown` (the stored spec when editing), `start?: string` (topic/tab to open), `onSubmit(data, image)` where `image` is `{svg?, dataURL?, width, height}`, `onClose`, and `docked?: boolean`, "Beside the board rather than over it (a tool whose `docked` is set)" (`tools.tsx:16`). `ToolKind` (`tools.tsx:20-22`) is the union of 33 kinds.

`Tool` (`tools.tsx:24-36`): `Dialog` (a `LazyExoticComponent`), `edit` (a `Word` for the edit button), `docked?` ("Opens beside the board instead of over it, and stays open while other tools are used", `tools.tsx:28`; true only for `practice`), `png?` (the dialog returns a PNG snapshot, true only for `3d`), and three optional dictionary projections for the palette: `topics`, `hints`, `names`.

`load(importer, name)` (`tools.tsx:39-40`) wraps `lazy` and casts the named export to `ComponentType<ToolDialogProps>`: "Each dialog types its own spec; here they are all the same shape."

`TOOLS` (`tools.tsx:42-88`): one `import()` per dialog. The `practice` entry (`tools.tsx:73-80`) sets `docked: true` (`tools.tsx:76`), and its `names` maps each area to its skills' labels so the palette can find "Fractions" (`tools.tsx:79`). `isToolKind` (`tools.tsx:90`) is `Object.hasOwn(TOOLS, k)`; BoardPage uses it to recognise its own `customData.kind`.

`MENUS` (`tools.tsx:96-155`): five groups (Arithmetic, Geometry, Algebra, Discrete, Practice). An entry may carry `start` to open a tool on a topic (`counting` opens `model` on `placeValue`, `tools.tsx:99`; each practice entry opens on an area). `MenuGroup.title` is the long name for the tooltip and accessible name, `label` the short name on the button.

### src/styles.css

#### Tokens and dark mode

`styles.css:1-15` defines the light palette on `:root`: `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-hover`, `--accent-text`, `--danger`, `--ok`, `--chip`, `--shadow`, plus `color-scheme: light`. `styles.css:17-33` redefines all of them under `@media (prefers-color-scheme: dark)`. The app's chrome therefore follows the OS; there is no manual toggle for the chrome. The board canvas has its own theme (Excalidraw's), and the shapes panel inside Excalidraw's sidebar uses Excalidraw's variables, not these (`styles.css:523-526`). A second `:root` block at `styles.css:436-451` adds chart tokens: `--viz-series`, `--viz-axis`, `--heat-0…4`, and `--heat-ink-0…4`, with the dark variants inverted so that "on light, darker = more; on dark, lighter = more" (`styles.css:437-438`).

Surfaces that hold a rendered maths picture are hard-coded white regardless of theme: `.preview` (`styles.css:171`), `.practice-typed` (`:418`), `.pv-mat` (`:298`), `.viewer` (`:248`), `.geo-plane` (`:336`), `.live` (`:545`), `.print-sheet` (`:599`). The pictures are drawn with dark ink and would be unreadable on a dark surface. The practice question shown as text (`.practice-question`, which sits on a `.preview`) therefore also fixes its own ink to `#1e1e1e` (`:406`), so the words stay dark on that white box in dark mode.

#### Layout classes

- `.home` (`:80`) 1040px column; `.board-grid` (`:91`) auto-fill 240px cards.
- `.board-page` (`:102`) column flex 100% height; `.board-bar` (`:103`) the toolbar, `overflow-x: auto`; `.board-body` (`:130`) the row under the bar, `flex:1; display:flex; min-height:0`; `.canvas-wrap` (`:131`) `flex:1; min-height:0; min-width:0` so Excalidraw fills what the docked panel leaves; `.save-state` and its `.error/.conflict` colouring (`:109-110`); `.conflict-bar` (`:111`) with a 2px danger underline.
- `.tool-menu` (`:118`) and `.share-box` (`:623`) are `position: fixed; z-index: 90` "so the bar's overflow can't clip it" (`:5-6` in ToolMenu, `:622` in CSS).
- Responsive: `.btn-label` hidden under 1080px (`:234-236`); under 640px the bar tightens, the save state hides unless it is an error, the modal goes full screen (`:237-244`, `:359-363`).
- The docked panel (`.dock`, `:132-145`), "A tool docked beside the board (practice): the board stays in use next to it" (`:132`): `width: clamp(360px, 34vw, 540px)`, `flex: none`, a column with the surface colour and a left border; inside it `.modal-body` grows and scrolls, `.preview` is at least 120px tall, the answer input is 18px, `.field-row`s wrap, and the area `.tabs` wrap "on as many rows as the panel needs, rather than a strip to scroll" (`:141-142`, overriding the `overflow-x: auto` strip of `.tabs` at `:204`). Under 640px the panel is `position: fixed; inset: 0; z-index: 100`, the whole screen (`:143-145`).
- `.modal-backdrop` z-index 100 (`:149`), `.palette-backdrop` 110 (`:366`) so the palette can sit over a dialog if ever both were open (they are not; BoardPage blocks the shortcut when a dialog is open).
- `.modal-body > * { flex-shrink: 0 }` (`:357`): "Long dialogs scroll; their rows (tabs especially) must not be squashed."
- Practice page and card (`:388-415`, "The practice page (#/practice) and its card on the home page"): `.practice-card` (`:389-397`) a flex row link with a 14px radius, its border and background tinted from `--accent` by `color-mix`, the border turning full accent on hover or focus; `.practice-page` (`:398`) narrows `.home` to 820px; `.practice-body` (`:400-403`) the page's card, a 16px-gap column on the surface colour with border, radius and shadow; `.practice-page .preview` 140px tall (`:404`); `.practice-question` (`:406-407`) turns the preview into a left-aligned column whose images shrink to fit (`max-width: 100%; height: auto`); `.practice-prompt` 20px (`:408`); the page's answer input 20px (`:409`). Under 640px the card wraps with a full-width button, the body's padding drops to 14px and the prompt to 18px (`:410-415`).
- Practice: `.practice-verdict.ok/.close/.bad` (`:419-422`) using `color-mix` for the tint — `.ok` on `--ok`, `.bad` on `--danger`, but `.close` on a literal orange `#e8590c` (the same orange as `.practice-review`, `:425`), not a token; `.practice-hint` in plain ink "so it reads as help rather than a second scolding" (`:423`); `.practice-clock` tabular numbers (`:426`); `.practice-consent` box (`:432`).
- Teacher: `.teacher-grid` 260px sidebar + fluid main, single column under 820px (`:458-459`); `.teacher-main.refreshing { opacity: .6 }` "keeps the last numbers on screen, dimmed, instead of flashing empty" (`:469-470`); `.heat` table with sticky first column (`:485`), vertical skill headers via `writing-mode: vertical-rl` (`:488`), 28×24px cells (`:490`); `.heat-0…4` and `.heat-none` (`:492-497`); `.calib` SVG and `.viz-*` classes (`:502-513`); `.chart-tip` fixed, `pointer-events: none` (`:517`).
- `.sr-only` (`:594`) the standard clip pattern for SpokenMath.
- Print: `.print-overlay` fixed over the page (`:597`); under `@media print` everything is `visibility: hidden` except `.print-sheet` and descendants, the overlay goes static, each `.print-page + .print-page` gets `break-before: page` (`:609-617`). `e2e/print.spec.ts:21-26` pins that the actions and the dashboard heading are hidden in print media and that the PDF has at least 4 pages.

### src/pages/HomePage.tsx

State: `boards` (`BoardSummary[] | null`, null = loading) and `failed`. `load()` (`HomePage.tsx:10`) calls `api.list()`; a rejection sets `[]` rather than an error, so the page shows "No boards yet" when offline. The mount effect calls `load()` once.

`attempt(action)` (`HomePage.tsx:16-23`): clears `failed`, awaits the action, sets `failed` on throw. Comment: "a failure shows a message instead of being lost." The message is `t.actionFailed` with `role="alert"` (`HomePage.tsx:76`).

Handlers: `create` (`:25`) posts `api.create(t.untitled)` then navigates by assigning `location.hash`. `rename` (`:30`) uses `window.prompt`, ignores cancel/blank, saves `{title}` and reloads the list. `remove` (`:39`) uses `window.confirm` with the title appended, then `api.remove` and reload. Dates use `Intl.DateTimeFormat(lang, {dateStyle:"medium", timeStyle:"short"})` (`:47`). The footer links `/api/export` with `download` (`:105`, only when boards exist) and `#/teacher` (`:109`).

The first thing in `<main>` is the practice card (`HomePage.tsx:63-70`): an `<a className="practice-card" href="#/practice">` holding a 🎯 icon (`aria-hidden`), `t.practice` in bold over `t.practiceIntro`, and a button-styled `<span>` reading `t.practiceStart` with an arrow. It is a plain link, so it goes through the hash router like every other page change; the board list's "My boards" heading and New board button follow it. `e2e/practice.spec.ts:58-73` follows the card's "Start practising" link to `#/practice`.

### src/pages/SharedBoardPage.tsx

Read-only view of a board through `#/s/<token>`. Comment (`SharedBoardPage.tsx:1-2`): "Excalidraw in view mode, with live pieces shown as they were left, following the board as its owner saves (it asks again every few seconds and redraws when it changed)."

`FOLLOW_MS = 5000` (`:13`). `READ_ONLY` (`:15`) is a `LiveHost` whose three callbacks do nothing: "Pieces can't be changed here: the host takes nothing back."

State: `board`, `gone`. Refs: `excalidraw` (imperative API), `seen` (last `updatedAt`, starts −1), `etag`.

Effect on `[token]` (`:25-53`): defines `follow()`, runs it once, then `setInterval(follow, 5000)`; cleanup clears the interval and sets `live=false`. `follow`:
1. `api.shared(token, etag.current)` sends `If-None-Match`; the api returns `null` on 304 (`api.ts:44-45`), so "the server sends the scene again only once it has changed" (`:29`).
2. If `updatedAt` equals `seen`, nothing.
3. First time (`seen < 0`) or no API yet: `setBoard(b)` so Excalidraw mounts with `initialData`.
4. Otherwise: `ex.addFiles(...)` then `ex.updateScene({elements})`, and update only `title`/`updatedAt` in state so Excalidraw is not remounted.
5. Errors: a 404 sets `gone` ("the board's owner stopped sharing it", `t.sharedGone`); anything else is "offline for now: the next round tries again" (`:44`).

Render (`:55-84`): `gone` → centred `t.sharedGone`; no board → `t.loading`; else a `board-bar` with the title, a `save-state saved` span showing "👁 Read-only", `LangSelect`, and `<Excalidraw viewModeEnabled initialData={{…, appState: {...scene.appState, viewModeEnabled: true}, scrollToContent: true}}>`. `validateEmbeddable`, `renderEmbeddable` and `onLinkOpen` (`:77-79`) are the same live-piece hooks as BoardPage but with the inert host. `UIOptions` turns off load/save/clear/export/background (`:80`). `e2e/share.spec.ts` pins: the viewer sees "Read-only", has no Shapes or Share buttons, picks up the owner's new shape within 20 s, and sees "This link no longer works" after unshare.

### src/components/Modal.tsx

#### Modal

Props: `title`, `onClose`, `children`, `footer` (required). `close` is a ref updated every render (`Modal.tsx:15-16`): "Callers pass a new arrow each render; keep the latest without re-attaching the listeners."

Mount effect (`:18-43`), run once:
- Remember `document.activeElement` as `opener`.
- Focus the first focusable element inside `.modal-body` unless focus is already inside the dialog ("unless a field asked for it", i.e. an `autoFocus` input), else focus the dialog itself (`tabIndex={-1}`).
- `keydown` on window: `Escape` → `close.current()`; `Tab` → focus trap over visible focusables (`offsetParent !== null`), wrapping both directions; also traps when focus has escaped the dialog.
- Cleanup: remove listener; if `opener.isConnected`, refocus it. That is how a tool dialog "hands focus back" to the menu button or the palette opener.

Backdrop `onMouseDown` closes only when the target is the backdrop itself (`:46`). The box has `role="dialog" aria-modal="true" aria-label={title}`; its header holds the `<h2>` title and an `icon-btn` "×" with `aria-label={t.close}` (`:50`), the body `.modal-body`, and the caller's `footer` in `.modal-footer`.

#### ColorSwatches

`INK_COLORS` (`:59`) six hex colours. The group is `role="radiogroup"`; each swatch `role="radio" aria-checked` with the name from `t.colorNames[hex]` (`:78-79`).

### src/components/ui.tsx

`arrowKeys(items, value, onChange)` (`ui.tsx:5-20`) returns a keydown handler: Right/Down next (wrapping), Left/Up previous, Home first, End last; calls `onChange` and focuses the nth button.

`Tabs` (`:23-46`): `role="tablist"`, each `role="tab" aria-selected`; only the active tab (or the first when the value is not in `items`) has `tabIndex=0`: "Only the active tab is in the Tab order; arrows move between tabs."

`Segmented` (`:49-75`): the same roving-tabindex pattern with `role="radiogroup"`/`radio`, generic over `string | number | boolean` (PracticeDialog uses `[true, false]` for class/free practice).

`startOr(start, items, fallback)` (`:78-79`): the topic to open on, if `start` names one.

### src/components/ToolMenu.tsx

A toolbar dropdown. State `open`, `pos`. `useLayoutEffect` on `[open]` (`ToolMenu.tsx:13-19`): measure the button's rect and the list's width, clamp `left` to `[8, innerWidth - w - 8]`, set `top = r.bottom + 4`, focus the first item. `useEffect` on `[open]` (`:21-42`): a capturing `pointerdown` on `document` closes when the target is outside both the list and the button; `Escape` closes and refocuses the button; `resize` closes. `onListKey` (`:44-50`): ArrowUp/Down move focus through the items, wrapping. Picking an item (`:71-76`): close, refocus the button, then `it.onPick()`. Comment: "The dialog returns focus to whatever had it when it opened: the menu button, not this vanishing item." ARIA: `aria-haspopup="menu" aria-expanded`, list `role="menu"`, items `role="menuitem"`.

### src/components/ShareBox.tsx

`shareLink(token)` (`ShareBox.tsx:7`) = `origin + pathname + "#/s/" + token`. Props: `id`, `token | null`, `onChange(token)`. State `open`, `copied`, `busy`, `pos` (`{top, right}` measured from the wrapper's rect on toggle, `:16-20`). Outside-click and Escape close it (`:21-31`). `run(work)` (`:32-41`) sets `busy`, awaits, calls `onChange` with the result, swallows errors: "offline: the button can be pressed again." `copy(link)` (`:42-50`) uses `navigator.clipboard.writeText`, shows "✓ Copied" for 1.5 s, and on failure relies on the input's `onFocus={e => e.target.select()}` (`:62`): "no clipboard (an insecure page): the link is selected in its box for copying by hand." Buttons: "Make a link" → `api.share(id)` returns `{token}`; "Stop sharing" → `api.unshare(id)` then `null`; both are disabled while `busy`. The trigger button gets class `shared` (accent inset ring, `styles.css:621`) when a token exists, and carries `aria-haspopup="dialog" aria-expanded` (`:53`); the popover is `role="dialog" aria-label={t.shareTitle}` (`:57`) with the title, `t.shareHint`, and the read-only `mono` input.

### src/components/CommandPalette.tsx

#### Index

`Entry` (`CommandPalette.tsx:6-17`): kind, start, icon, title, sub, names (in-tab names like algorithm names), hint, `topic` flag. `norm` (`:20`) strips accents (NFD + `\p{M}`), lowercases, and folds ё→е: "Dijkstra finds dijkstra, е finds ё". `entries(t)` (`:22-38`): for every menu item push a non-topic entry (title = item label, sub = group title); then, once per kind and only for items without `start`, push one topic entry per `tool.topics(t)` key with its hint and names.

#### Search

`search(all, query)` (`:41-70`). Empty query → all non-topic entries in menu order. Otherwise every word must match somewhere; a lower score ranks higher: prefix match on sub/title or on any word-piece of them costs 0; substring in title/sub costs 1; a name inside the tab costs 2 and records `via` (the name shown on the right); hint substring costs 5; no match drops the entry. Sort by score then original index, take 12.

#### Component

Props `onPick(kind, start)`, `onClose`. State `query`, `active`. `all` memoised on `t`, `results` on `[all, query]`. Effects: reset `active` to 0 when the query changes (`:81`); scroll the active `<li data-i>` into view (`:82-84`). The wrapper is `.palette` with `role="dialog" aria-modal="true" aria-label={t.searchTools}` on a `.palette-backdrop` whose `onMouseDown` closes when it is the target (`:92-93`). Input: `role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant="palette-N"` (unset when there are no results), `autoFocus`. Keys (`:105-117`): ArrowDown/Up cycle (modulo `results.length || 1`), Enter picks, Escape closes. The list is `role="listbox"`, each `<li id="palette-i" role="option" aria-selected>` (`:119-127`): `onMouseMove` sets active, `onMouseDown` with `preventDefault` (so the input keeps focus) picks; a row shows the icon, `palette-title`, `palette-sub` and, when a name matched, `palette-via`. Empty results show `t.searchNone`.

### src/pages/BoardPage.tsx

#### Module-level constants

- `MathData` (`BoardPage.tsx:32`): `{kind: ToolKind, data: unknown, w, h}` — "Stored on the image element so a formula/graph can be re-opened and edited." It lives in the image element's `customData`. `w`/`h` are the natural size at render time; the ratio to the element's current width gives the user's scale.
- `UI_OPTIONS`, `validateEmbeddable`, `onLinkOpen` (`:36-40`) are module constants because "a new object on every render would have it re-render the canvas each time the save state changes." `validateEmbeddable` returns `true` for a live link and `undefined` (Excalidraw's default check) otherwise. `onLinkOpen` prevents the default for live links: "A live piece's address leads nowhere."
- `Dialog` (`:43`): `{kind, editing?: ExcalidrawImageElement, start?}`.
- `SaveState` (`:46`): `"saved" | "saving" | "error" | "conflict"`; "conflict: someone saved this board elsewhere since we loaded it; autosave pauses until the user picks."
- `PlacedImage` (`:48`) and `svgImage(r)` (`:50-55`): an SVG string becomes a `data:` URL via `svgToDataUrl`.
- `libraryStore` (`:58-75`): Excalidraw's personal library persisted in `localStorage["zeno.library"]`, "for every board"; both methods swallow storage errors.
- `LIVE_IN_MENUS` (`:78-81`): the live graph goes in the Algebra menu, the dice in Discrete.
- `mathOf(el)` (`:83`): an image whose `customData.kind` is a tool kind. `selectedMathElement(api)` (`:86-91`): the single selected element if it is such an image.

#### State and refs

`board`, `missing`, `title`, `saveState`, `dialog`, `dock`, `palette`, `selectedMath`, `excalidrawApi` (state copy of the API, "for the library hook, which waits for it", `:109-110`), `boardTheme` ("The theme for the shape thumbnails"). Refs: `theme` (last theme string from Excalidraw, `""` until reported), `paletteOpener`, `excalidraw`, `lastSaved {version, files}`, `saveTimer`, `base` ("The server's updatedAt as of our last load or save"), `conflict`, `saving` ("One save at a time: another one sent meanwhile would carry the same base and be refused as a conflict"), `again` (`"" | "save" | "overwrite"`), `retryTimer`, `retries`, `stateRef` (mirror of `saveState` for listeners).

`dock` (`:100-101`) is a second `Dialog | null` beside `dialog`: "A docked tool (practice) has its own place beside the board, so a dialog can open while it stays." `open(d)` (`:102`) is the one way a tool is opened, `TOOLS[d.kind].docked ? setDock(d) : setDialog(d)`; the menus, the palette, the Edit button and double-click (`openEditor`, `:422-425`) all go through it, so practice always lands in the panel and every other tool in the modal.

#### Library and cross-tab sync

`useHandleLibrary({excalidrawAPI: excalidrawApi, adapter: libraryStore})` (`:113`). Effect on `[excalidrawApi]` (`:114-128`): sets `window.name = "zeno"` if the window has no name yet (`:116`) so "Browse libraries sends the chosen library back to the window named here"; listens to `storage` for `LIBRARY_KEY` and calls `updateLibrary({…, merge: false})`: "Another tab changed the library: take its version, or our next save would drop what it added."

#### Load

Effect on `[id]` (`:144-153`): `api.get(id)` → set `base`, `board`, `title`; rejection → `missing`. Render shows `t.notFound` with a back link (`:471-478`) or `t.loading` (`:479`).

#### saveOnce

`:155-185`. Bails if no API or (`conflict` and not overwrite). Gathers `getSceneElements()` (non-deleted), prunes `getFiles()` to the file ids still referenced by image elements, and takes only `viewBackgroundColor`, `gridModeEnabled`, `theme` from appState. Sets "saving". Computes `version = getSceneVersion(getSceneElementsIncludingDeleted())` *before* the request, then `api.save(id, {scene, baseUpdatedAt: overwrite ? undefined : base.current}, keepalive)`. Success: `base = saved.updatedAt`, clear conflict, zero retries, record `lastSaved = {version, files: allFiles count}` — "onChange sees deleted elements too, so compare against the same list (or every deletion re-saves forever)" (`:173`) — and "saved". Failure: `conflict = (ApiError && status 409)`; state "conflict" or "error"; for a non-conflict, non-keepalive failure schedule a retry at `[2000, 5000, 15000, 30000][min(retries++, 3)]` ms through `saveNowRef` (`:179-183`).

#### saveNow

`:187-206`. Clears any retry timer. If a save is in flight, record `again` ("overwrite" wins over "save") and return: "Save again (with the new base) once the current one is back." Otherwise set `saving`, run `saveOnce`, then loop while `again` is set and either there is no conflict or the queued save is an overwrite. `finally` clears both flags. `saveNowRef` (`:207-208`) always points at the latest closure so timers never call a stale one.

#### Leaving the board

Effect on `[saveNow]` (`:210-234`). `flush(keepalive)`: if the debounce timer is pending, clear it and save now. `beforeunload`: compute `unsaved = timer pending || saving || state !== "saved"`, `flush(true)` (keepalive "lets the request outlive the page"), and `e.preventDefault()` when unsaved so the browser asks before closing. `online`: if the state is "error", retry. Cleanup (route change): remove listeners, clear retry timer, `flush(false)`.

#### retheme

`:236-264`. "Re-colours every math picture for the board's theme (light pictures on a dark board would glare)." For each image element that is a math picture or a `customData.snapshot` and whose file is SVG, run `themedSvg(svg, theme)`; if it changed, add a new file with a fresh `FileId` and swap the element's `fileId`, bumping `version`/`versionNonce`/`updated`. `captureUpdate: NEVER` so the recolour is not an undo step and does not count as a user change (it does change the scene version, so it will trigger a save; that is fine since the file ids changed).

#### onChange

`:266-293`, passed to Excalidraw. Three jobs:
1. Theme: if `appState.theme` differs from `theme.current`, store it, `setBoardTheme`, and `setTimeout(retheme, 0)` — "outside Excalidraw's own update" (updating the scene inside `onChange` is not allowed).
2. Selection: compute the single selected element; if it is a math image, keep it as `selectedMath`, only replacing the state object when id or version changed (`:277`) to avoid re-renders.
3. Debounced autosave: `getSceneVersion(elements)`; return if version and file count equal `lastSaved`. If `lastSaved.version === -1`, this is the initial load: record and return (so opening a board never saves). If in conflict, return. Else set "saving" immediately (the indicator reacts to the keystroke) and reset an 800 ms timer that calls `saveNow()`.

#### saveTitle

`:295-308`, on blur or Enter of the title input. Trims (falls back to `t.untitled`), and if changed, `api.save(id, {title})`. "Move our base forward only if nothing else was saved in between; otherwise the next drawing save reports the conflict" (`:301`): `if (saved.previous === base.current) base.current = saved.updatedAt`. Failure → "error".

#### placeImage

`:310-369`. Creates a `BinaryFileData` with a random `FileId`, `addFiles`. If `editing`: "Keep the user's scaling: new size = new natural size × old scale factor", where `scale = editing.width / old.w`; map the element to a copy with the new `fileId`, size, `customData: math`, bumped version; `updateScene` with `captureUpdate: IMMEDIATELY` (undoable). Otherwise: position at `at` or the viewport centre (`width/2/zoom − scrollX − w/2`), slide down with `freeY` past anything it would cover, `convertToExcalidrawElements([{type:"image", …}])`, attach `customData: math ?? {snapshot: true}` (a plain picture is marked `snapshot` so `retheme` still recolours it), append, select it, and `scrollToContent(el, {animate: true})`.

#### Live host

`liveHost` (`:376-419`) is a ref re-assigned every render so that live pieces always see fresh closures:
- `update(id, data)`: write `customData = data` into the element with a version bump; if that element is Excalidraw's `activeEmbeddable`, point `activeEmbeddable.element` at the new object "or each change would need another click to carry on" (`:387-388`).
- `snapshot(id, svgEl)`: serialise the SVG, theme it, and `placeImage` beside the piece (`besides(id)` = right of it +32px) as a plain picture.
- `freezeGraph(id, state)`: lazy-import `liveGraph` and `plot`, substitute slider values into the expressions, `plotToSvg`, and place a *graph* picture with `MathData {kind:"graph", data: spec}` so it is editable with the Graph dialog. A function that will not plot is swallowed (`:415-417`).
- `addLive(kind)` (`:420`): `placeOnBoard(api, [liveElement(kind)])`.

#### Palette and shortcuts

`openPalette` (`:427-430`) records `document.activeElement`. `shortcutState.current.open = palette || !!dialog` (`:432-433`); the docked panel is not counted, so the palette can be opened while practice sits beside the board. Effect once (`:434-449`): a capturing window `keydown`. Ignored when something is open. `typing` = target is input/textarea/contentEditable. `selected` = Excalidraw has a selection. Ctrl/Cmd+K fires only with no selection ("with a selection it's Excalidraw's add link", `:431`), without Shift/Alt; `/` fires when not typing and without modifiers. Both `preventDefault` + `stopPropagation` (capture phase, so Excalidraw never sees them) then open the palette. `e2e/practice.spec.ts:25-27` and `e2e/study.spec.ts:9-11` drive the app through Ctrl+K → "Practice" → Enter, which now opens the docked panel.

#### Memoised Excalidraw props

`initialData` memoised on `scene` (`:452-460`): elements, files, appState, `scrollToContent: true`. `setApi` (`:461-464`) sets both the ref and the state. `renderEmbeddable` (`:466-469`) renders `<LiveView element host={liveHost.current}/>` for a live link with valid data, an empty `<div/>` when "its data is missing or damaged", `null` (Excalidraw default) otherwise.

#### Render

`insert(d, tool, data, image)` (`:483-489`), "Puts what a tool made on the board, or in place of the picture it was editing", is shared by the dialog and the panel: if `tool.png`, build a PNG `PlacedImage` from `image.dataURL`; else theme the SVG for the current board theme and build an SVG one; then `placeImage(placed, {kind: d.kind, data, w: image.width, h: image.height}, d.editing)`.

Header (`:492-527`): back link; `title-input` (`aria-label={t.rename}`, `onBlur=saveTitle`, Enter blurs); `save-state` span with one of `t.saving / t.saved / t.saveConflict / t.saveError`; spacer; when `selectedMath` an "✎ Edit …" button whose label is `t[TOOLS[kind].edit]`; 🔍 opens the palette; 📐 toggles the default sidebar on `SHAPES_TAB`; one `ToolMenu` per `MENUS` group, items from the group plus any `LIVE_IN_MENUS` entries; `ShareBox` wired to `board.shareToken`; `LangSelect`.

Conflict bar (`:528-534`, `role="alert"`): `t.conflictText`, "Reload their version" (`location.reload()`), "Keep mine" (`saveNow(true)` → `baseUpdatedAt: undefined` → the server accepts).

Board body (`:536-594`): a `.board-body` row holding the canvas and, after it, the docked panel. Canvas (`:537-577`): `canvas-wrap` with `onDoubleClickCapture`: if the single selection is a math image, stop the event (so Excalidraw does not enter crop mode) and open its editor. `<Excalidraw>` with the memoised props and `langCode`. Children: a `MainMenu` limited to LoadScene, Export, SaveAsImage, ClearCanvas, ToggleTheme, ChangeCanvasBackground (`:559-567`); a `DefaultSidebar` with an extra `TabTrigger` and `Tab` for `SHAPES_TAB` holding `<ShapesPanel api={() => excalidraw.current} theme={boardTheme}/>` (`:568-575`).

Docked panel (`:578-593`): when `dock` is set, `<Suspense fallback={null}>` around `<dockTool.Dialog docked key initial={editing && mathOf(editing).data} start onClose={() => setDock(null)} onSubmit>`. The key is the edited element's id or else ``${kind}:${start ?? ""}``, so picking another practice area from the menu remounts the panel on that area. `onSubmit` calls `insert(dock, dockTool, data, image)` and closes the panel only when it was editing a picture: "Practice goes on beside the board; an edit is finished" (`:588`). Because the panel lives in its own state and its own place in the layout, a tool dialog can open over the board while it stays; `e2e/practice.spec.ts:75-104` pins that the panel sits to the right of `.canvas-wrap`, that no dialog is open with it, that it stays after Insert and while the Formula dialog is open, and that its × closes it.

Dialog (`:596-609`): `<Suspense fallback={null}>` around `<openTool.Dialog key={editing?.id ?? kind} initial={editing ? mathOf(editing).data : undefined} start onClose onSubmit>`. The `key` remounts the dialog when switching between elements. `onSubmit(data, image)` is `insert(dialog, openTool, data, image)` and close.

Palette (`:610-623`): `onClose` and `onPick` both close and refocus the opener; `onPick` calls `open({kind, start})`.

### src/components/ShapesPanel.tsx

`SHAPES_TAB = "maths"` (`ShapesPanel.tsx:23`). `thumbCache` (`:27`) is module-level, keyed `theme:lang`, because "the panel unmounts each time it closes."

`freeY(elements, x, y, w, h)` (`:33-45`): iterate over bounding boxes (`getCommonBounds([e])`, since "a line's x and y are its first point, not its top-left corner") and push `y` below any box that overlaps, until stable.

`toElements(pieces)` (`:48-82`): converts the shape description (text/ellipse/rect/polyline with arrows) into one group of Excalidraw skeletons, `convertToExcalidrawElements(..., {regenerateIds: false})`, then shifts each text so its anchor sits where requested: "Text is measured on the way in; move each label so its anchor sits where the piece asked."

`placeOnBoard(ex, els)` (`:88-109`): centre in view, `freeY`, offset, append, select all and their group, and close the sidebar unless it is docked and the window is wider than 1229px ("Excalidraw's breakpoint for docking"), then `scrollToContent`. `e2e/board.spec.ts:14-18` relies on the panel closing after each insert.

`Tile` (`:111-128`): a draggable button; `onDragStart` serialises a library item (`serializeLibraryAsJSON`) under `MIME_TYPES.excalidrawlib`, so Excalidraw handles the drop and placement itself.

`ShapesPanel` (`:130-195`): effect on `[key]`: serve from cache or build thumbnails asynchronously after `document.fonts.load('16px "Nunito"')` ("Labels are measured when the elements are made, so wait for the font they use"), rendering each shape with `exportToSvg({appState: {exportBackground: false, exportWithDarkMode: theme === "dark"}, exportPadding: 4, skipInliningFonts: true})` (`:150-156`), a failed thumbnail leaving only the name; aborts via `live` if the key changes mid-way. Thumbnails are shown only while `thumbs.key === key` (`:178`). The panel renders a hint, then one `<section>` per `SHAPE_GROUPS` entry with an `<h3>` and (for the `live` group) `w.liveHint`. `insert` places `liveElement(kind)` for a live shape or `toElements(shape.build(words))` otherwise. `shapesIcon` (`:198-203`) is the inline SVG (a set square and a circle) BoardPage uses as the sidebar tab trigger.

### src/components/PlaceValueMat.tsx

Used inside the Models dialog (place-value tab). "Pointer events (not HTML5 drag & drop) so it also works with touch" (`PlaceValueMat.tsx:3`). State: `drag`, `hover`, `message`, `challenge`. `latest` ref mirrors `{spec, onChange}`; `commit(r)` (`:43-50`) writes the new counts via `onChange`, updates `latest.current.spec` immediately "so a second tap before re-render builds on this one", and shows any `message` (`wrong`, `need10`, `full`). `start(kind, from)` (`:60-89`) ignores any button but the primary one, then attaches `pointermove`/`pointerup`/`pointercancel` on `window` synchronously "so even a very fast tap can't release before the listener exists"; a `pointercancel` drops the drag without committing (`:76`); a move under 4px counts as a click (tray click adds one block; a click on a placed block does nothing); a real drop calls `applyDrop(counts, kind, from, columnAt(x, y))` — a `null` column means "off the mat" = remove. While a block is dragged out of a column, that column shows one fewer (`shown`, `:92`) and the column under the pointer gets `.over`. The trade buttons call `regroup`/`breakDown`. Challenge: random 1–999 target, mat cleared, digits shown as `?` until "Check" verdicts `correct`. Tray buttons are keyboard-operable (Enter/Space add one, `:180`). The ghost (`.pv-ghost`, fixed, `pointer-events: none`) follows the pointer.

### src/components/FormulaDialog.tsx

`FormulaData = {tex, color}` (`FormulaDialog.tsx:7`). `SNIPPETS` (`:10-35`) with `|` marking the caret landing. State `tex` (default `EXAMPLE_TEX`, the quadratic formula) and `color`. `result` memoised on `[tex, color]`: `latexToSvg(tex, color)` or an error message; blank input gives `{error: ""}` which disables Insert silently. `insertSnippet` (`:58-68`) splices at the textarea selection and restores the caret with `requestAnimationFrame`. Ctrl/Cmd+Enter submits (`:102-104`). Preview is `<img src={svgToDataUrl(svg)} alt={tex}>`. `onSubmit({tex, color}, rendered)`; BoardPage stores the data in `customData` so double-clicking reopens this dialog with `initial`.

### src/components/GraphDialog.tsx

State: `fns`, `range` as strings ("so partially typed values like "-" don't get clobbered", `:28`), `grid`, `focusIdx`. `errors` per expression via `compileExpr`. `spec` rebuilt each render with `num()` parsing (empty y-range = auto). `result` memoised on `JSON.stringify(spec)` (`:57`). Up to six functions; `nextColor` picks the first unused `PLOT_COLORS` entry. Insert is disabled unless rendered and at least one non-blank expression; the submitted spec drops blank functions (`:74`).

### src/components/Countdown.tsx

`clock(ms)` (`Countdown.tsx:4-7`) → `m:ss`, ceiling seconds, floored at 0. `Countdown({until, left, ended?, className})`: a 1 s `setInterval` updating `now` (effect keyed on `until`); renders `null` once over if `ended` is undefined, else `<strong role="timer">` with `left(clock(until-now))` or `ended`. Comment: "It keeps its own time, so its tick re-renders this line and not the page around it."

### src/components/SpokenMath.tsx

`<div class="sr-only">{text}<span dangerouslySetInnerHTML={mml}/></div>`: the words, then `latexToMathML(tex)` memoised on `tex` (empty on failure). The comment justifies the raw HTML: "The MathML is MathJax's own serialisation of LaTeX the app wrote, never anything a user typed." The picture next to it has `alt=""`. `e2e/study.spec.ts:46` and `e2e/print.spec.ts:18` assert the hidden text is non-trivial.

### src/components/ChartTip.tsx

`useChartTip()` returns `bind(content)` and `view`. `bind` gives `onPointerEnter/Move/Leave` and `onFocus/onBlur` handlers so "pointer and keyboard focus show the same readout"; focus positions the tip at the element's top-right. `view` is a fixed `.chart-tip` (`role="status"`) clamped to the window: `left = min(x+14, innerWidth-260)`, flipped above the pointer near the bottom (`:24-27`). Text only: `<strong>{value}</strong><span>{label}</span>` plus optional `detail`.

### src/components/StudentPanel.tsx

The join/consent flow. Props: `student | null`, `pending` (queued records), `ui` words, `onChange(student, forgot?)`. State: `classCode`, `ownCode`, `error`, `busy`, `sure`, `agreed`.

`run(work, notFound)` (`StudentPanel.tsx:24-34`): sets busy, clears error; a 404 shows `notFound` (`ui.noClass` or `ui.noStudent`), anything else `ui.offline`. `unsaved` (`:35`) shows `fill(ui.unsaved, {n: pending})` when `pending > 0`.

Signed in (`:37-63`): "Student {code}" in monospace, Sign out (`onChange(null)`), and Delete my answers — a two-click confirm: the first click sets `sure` (button turns `danger`, label `ui.forgetSure`), the second calls `study.forget(code)` (a 404 is tolerated: "already gone") then `onChange(null, true)`; blur resets `sure`. A hint tells the student to write the code down.

Signed out (`:77-106`): a `<details>` "Join a class" containing the consent box (`role="group"`, three bullets: what is saved, the two groups, how to stop/delete) with the checkbox `ui.consentAgree`; the class code input + Join (disabled until a code is typed *and* `agreed`, `:96`) → `study.join(classCode)` returns the new `Student`; the own-code input + Continue → `study.student(code)` → `onChange({code, class, condition})`. Enter in either field submits (`onEnter`, `:72-76`). `e2e/study.spec.ts:35-41` pins that Join is disabled before the checkbox and that the code is `XXXX-XXXX`.

### src/components/TestRunner.tsx

Header comment (`TestRunner.tsx:1-4`): "the answer is saved without a mark or a solution, and the next question follows. Only a form message ("lowest terms", "check your rounding") asks for another try … Passing a question counts as an answer. Answers go through an outbox."

Props: `plan`, `phase` (`"pre" | "post"`), `student`, `w`, `outbox: Outbox<TestAnswer>`, `onAnswered(item)`. `items` memoised: `testItems(plan.class, plan.skills, test.form, plan.testLength)` — deterministic from the class code, which is why `PrintableTests` can build the same forms. `index` is the first item not in `test.answered` (`:28`). State `input`, `message`; refs `retries`, `shownAt = performance.now()`, `inputRef`. `ex` and `card` are memoised on the item's `(skill, level, seed)` triple rather than the object ("a new object with the same three is the same question", `:36`). `typed` is the deferred MathJax preview of the answer, as in practice.

Finished (`index < 0`): the `ui.testDone` status (`:60`). Otherwise the header line is `ui.preTest`/`ui.postTest` with `fill(ui.testProgress, {i: index+1, n: items.length})` (`:93-96`), then the `ui.testIntro` hint ("No marks during the test: answer as well as you can, or pass a question you can't do." — the text `e2e/study.spec.ts:70` waits for), the question card with `SpokenMath`, the answer field with the format hint, the typed preview, Submit and Pass, and any form message as a `practice-verdict close` status (`:128`).

`record(verdict)` (`:62-79`): `outbox.add({clientId: newId(), student, phase, item: index, input (trimmed, ≤200, empty when skipped), verdict, retries, ms: performance.now() − shownAt})`, reset input/message/retries/shownAt, `onAnswered(index)`, refocus. `submit` (`:80-89`): empty → nothing; `check(ex, input, w)`; `!ok && why` → `retries++`, show the form message, keep the question; else record `correct | close | wrong`. "Pass" records `skipped`. Enter submits; Submit is disabled on blank input. No verdict is ever displayed.

### src/components/PracticeDialog.tsx

The largest component. It is both a tool (inserts a practice card or a worksheet onto the board) and the student's study client, and it renders three ways. The comment above its props (`PracticeDialog.tsx:76-79`) puts it as: "On a board it inserts onto the board, from a panel beside it (`docked`) or a dialog over it; without `onSubmit` it is the practice page's body." On a board BoardPage always opens it docked, because its `TOOLS` entry is `docked` (see `src/tools.tsx` and `src/pages/BoardPage.tsx`); the `Modal` branch remains for any caller that passes `onSubmit` without `docked`.

#### Local progress

`Progress` (`PracticeDialog.tsx:30-33`): per-skill `{seen, right}`, a `mistakes` queue of `{skill, level, seed, due}`, and `answered`. Stored under `zeno.practice.v1` (`:34`); `load()` validates the shape, `save()` swallows errors. `MATH_SCALE = 1.4` (`:52`): "How much larger the page draws the question's maths and picture than their own size, to sit with its larger text." `REVIEW_AFTER = 3` (`:54`): "Questions answered before a missed one comes back."

#### Study plumbing

`outbox = new Outbox(localSlot("zeno.outbox.v1"), study.send)` and `testOutbox` on `zeno.testbox.v1` (`:64-66`), module-level so they outlive the dialog. `queued()` sums both. `PROTOCOL_POLL_MS = 30_000` (`:69`). `markQueuedTests(plan, code)` (`:71-74`): "Test answers still waiting to be sent count as answered, so the test doesn't ask the same question twice."

#### Props and initial state

`Props` (`:80-83`) is `{ initial?: PracticeSpec; start?: string }` (editing an existing card/sheet; the area to open on) joined with one of two shapes: on a board, `onSubmit(spec, rendered)`, `onClose` and an optional `docked`; on the page, all three `undefined`. The union lets TypeScript reject a `docked` without an `onSubmit`. State: `area` (from `initial`, else `startOr(start, AREAS, "number")`), `pick` (`SkillId | "mixed"`), `level`, `mode` (`"practise"` when `initial.count === 1`, `"sheet"` for a multi-question initial, else practise), `count` (8), `withAnswers`, `sheetSeed`, `progress`, `score {right, total, streak}`.

#### Choosing the next question

`planRef` (`:101`) holds the `ClassPlan` "in a ref because answering moves it on." `predicted(skill, L)` asks the carried Elo model for P(correct) for `ME`. `nextExercise(a, p, L, prog, plan)` (`:107-118`), per the comment: "Missed ones come back first; then, in class practice, the student's condition chooses (fixed sequence or adaptive), otherwise the topic and level picked above."
1. A due mistake (`due <= answered`) that fits (in class: in the plan's skills; free mixed: same area; free skill: same skill) → `{policy: "review", review: true}`.
2. A plan → `choosePolicy(plan.condition, plan.model, ME, plan.skills, plan.position, {recent})` → `{policy: plan.condition}`.
3. Free → random skill of the area (or the picked one) at level `L`, `freeOrigin` (`policy: "free"`).
Each `Current` carries `predicted` so the attempt can later be scored for calibration.

`cur` initialises to the exact exercise when editing a single card with a named skill, else `nextExercise(..., null)` (`:119-123`). Per-question state: `input`, `verdict`, `wrongs`, `done` (`"solved" | "revealed" | null`), `solution` (`{src?, error?}` or null).

#### Student state

`student` (from `loadStudent`, localStorage `zeno.student.v1`), `pending`, `planChanged` (a `useReducer` counter to re-render after mutating the plan in place, `:136`), `inClass` (true when signed in and not editing), `planStatus` (`none | loading | ready | error | gone`), `log` (a `QuestionLog` from `startLog()`: `shownAt = Date.now()`, `t0 = performance.now()`), and `live` — a ref mirrored every render with `{cur, student, inClass, progress, area, pick, level}` "for listeners, the plan arriving, and closing" (`:141-143`).

`sendQueued(keepalive)` (`:145-148`): show the count, flush both outboxes, show what remains. `leaveQuestion(keepalive)` (`:150-160`): "Records the question the student is leaving (moving on, changing topic, closing) and starts a fresh log." `toAttempt(log, ex, origin, student)` returns null if never tried (`learner.ts:80`); otherwise `outbox.add`, and `applyAttempt(plan, attempt)` so the local model and fixed-sequence position move on ("Free practice and reviews tell the model about the student too"). Then a new log and a flush.

`loadPlan(s)` (`:162-179`): status loading; flush both outboxes first "so the server's plan already counts what this browser has done"; `toClassPlan(await study.plan(code))` builds the Elo model from the server's state; replay any still-queued attempts for this student and mark queued test items; abort if the student changed meanwhile; set the plan and `ready`; and "a class question replaces one the student hasn't started on" — if in class and the log has no answers and no outcome, `show(nextExercise(..., plan))`. Errors: 404 → `gone` ("their answers were deleted, or the server was reset"), else `error`.

Poll effect (`:181-195`) on `[student, inClass, planStatus]`: when ready, every 30 s fetch `study.plan` again and `withProtocol(planRef.current, fresh)` — only `class, phase, sessionEnds, testLength, tests` are taken, "keeping the model this browser carries" — then `markQueuedTests` and `planChanged()`. Network errors are ignored ("the next poll tries again").

Mount effect (`:196-210`), once: `loadPlan(student)` if signed in; `sendQueued()` for "anything left from an earlier visit"; `pagehide` → `leaveQuestion(true)` (keepalive); `online` → `sendQueued()`; cleanup removes listeners and `leaveQuestion(true)` so closing the dialog or panel, or leaving the practice page, records the open question.

`changeStudent(s, forgot)` (`:211-229`): if `forgot`, discard both outboxes for that code and drop the log ("What was done so far on this question belongs to whoever was signed in while doing it"), else `leaveQuestion()`; set/persist the student, update `live` synchronously, clear the plan; if signing in, switch to class practice and `loadPlan`. `switchPractice(toClass)` (`:230-236`): flip the mode, leave the question, show the next one with the plan or null.

Language effect (`:239-241`): when `w` (the words) changes, rebuild `cur.ex` from the same `(skill, level, seed)` — "rebuild the same question in the new language."

#### The answer state machine

`settle(ok)` (`:248-256`): "The first final outcome of a question goes into the stats; a miss is queued for review." `finish(log, ok ? "solved" : "revealed")` stamps `msTotal` once (`learner.ts:70-74`: it returns if `log.outcome` is already set). Remove any existing mistake entry for this exact question; if wrong, push one with `due = answered + 1 + REVIEW_AFTER`; bump the skill's `seen/right`, `answered`, and the session `score`/`streak`.

`showSolution(ex)` (`:258-268`): marks `log.solutionViewed`, sets `solution = {}` (spinner "Working it out…"), then `renderSolution(ex.solution, t)` (async, MathJax) → data URL; on failure fall back to `renderSteps(ex.steps)` or show the error; no solution and no steps → null.

`onCheck` (`:270-285`): ignored once `done`. `v = check(cur.ex, input, w)`; `logAnswer(log, input, v)` appends `{input, verdict: correct|form|close|wrong, ms}`. If `v.ok`: `settle(true)`, `done = "solved"`. If `v.why` (a form message: "lowest terms, rounding, not factorised, unreadable"): return — "asks for another try without counting a miss." Else `wrongs + 1`; at 2, `reveal()`.

`reveal()` (`:286-290`): `settle(false)` unless already done; `done = "revealed"` (keeps "solved" if it was); show the solution.

`show(c)` (`:292-299`) resets all per-question state. `next()` (`:300-304`): `leaveQuestion()`, `show(nextExercise(..., classPlan()))`, focus the input. `choose(a, p, L)` (`:306-313`): free practice only; sets the three, leaves the question, shows a new free one, and reseeds the worksheet.

So one question goes: shown → (form message, retry, unlimited) → wrong #1 ("Not quite — try again.", with an optional mistake `hint`) → wrong #2 → auto-reveal; or right at any point → solved; or "Show solution" at any point → revealed. A miss returns after 3 further answered questions as a `review` question (orange "From your mistakes" line). `e2e/practice.spec.ts:34-48` pins the named-mistake hint and that the right answer still passes afterwards; `e2e/study.spec.ts:49-58` pins the wrong → Show solution → Next path and that exactly one attempt reaches the server.

#### Rendering the maths

`card` (`:315-322`) memoised on `[cur, w]`: `renderPractice({…count: 1, answers: false})` → data URL, or an error. It is what the dialog shows and what decides whether Insert is enabled. `question` (`:323-342`), memoised on `[cur, onSubmit, docked]`, is the panel's and the page's view of the same question, per its comment: "The page and the panel show the question as text that wraps and scales with the screen, with the maths and any picture beside it; the dialog shows the card that gets inserted." It is `null` for the dialog (`onSubmit && !docked`); otherwise `latexToSvg(ex.q)` when there is a `q`, and, when the exercise has a `pic`, a standalone SVG of `pic.w × (pic.h + 16)` with a white background and `pic.svg(0, 0)` inside ("Figures can draw a little below their height, into the room the card leaves under them", `:331`); each comes back as a data URL with its natural width, or the whole thing as `{error}`. `shown = useDeferredValue(input)` and `typed` (`:344-353`): `preview(cur.ex, shown)` gives LaTeX for what was typed, `latexToSvg` renders it; "that takes a moment, so it follows the typing rather than hold it up." `answerSrc` (`:354`) renders `cur.ex.show` in green only once `done`. All of these are data URLs cached by `useMemo`, so re-renders from the clock or the student panel do not re-encode SVG.

#### Worksheet

`sheetSpec` (`:358`) from the current choices; `sheet` memoised on its parts only when `mode === "sheet"`. `insert()` (`:371-380`) does nothing without `onSubmit`; otherwise sheet → `onSubmit(sheetSpec, rendered)`; practise → a one-question spec with `answers: done !== null` (the inserted card shows the answer only after the question was finished).

#### Phase-dependent UI

`classOn = student && inClass`; `plan` only when ready (`:382-384`). `testPhase` is `"pre"`/`"post"` for those phases. `sessionEnds` and a one-shot timeout (`:387-393`): "When a timed session runs out, one more render finds it over (the clock itself ticks on its own)." `blocked` (`:394-397`): `classClosed` in phase `closed`, `sessionOver` when a session has ended.

The Insert/Update button (`insertButton`, `:589-593`) is disabled in class practice unless the plan is ready and there is neither a test nor a block; in free practice when the sheet or card failed to render.

Body, in order (`body`, `:401-584`, the same for all three renderings):
1. If signed in: a `Segmented` Class/Free practice toggle.
2. If not class: area `Tabs`, hint, skill chips with `{right}/{seen}` stats, level `Segmented`, and, only when there is an `onSubmit` (`:424-426`), the practise/sheet `Segmented`; the page therefore stays in practise mode.
3. Then one of:
   - class but plan not ready: `noStudent` (gone), `planError` + Retry, or `loadingPlan`; plus `StudentPanel`.
   - a test phase: `<TestRunner key={testPhase}>` whose `onAnswered` pushes into `plan.tests[phase].answered`, `planChanged()`, `sendQueued()`; plus `StudentPanel`.
   - blocked: the message as an `ok` status; plus `StudentPanel`.
   - practise mode: optional `Countdown` for a session; the review line or "Chosen for you: {skill}, {level}" in class; the question with `SpokenMath`, which in the dialog is the card picture and in the panel and on the page (`:480-494`) is a `.preview.practice-question` box holding, in free practice outside a review, a "{skill} · {level}" hint, the prompt as a `<p className="practice-prompt" aria-hidden="true">` (the hidden `SpokenMath` reads it instead), then the maths and the picture as images drawn at their natural width × `MATH_SCALE`, or the render error; the input (disabled once done; Enter checks or, once done, goes next; typing clears the verdict) with the `typed` preview; Check / Show solution / Next and the score; the verdict box (`ok`/`close`/`bad` by `verdict.ok`, `close`, or `why`) with the mistake hint; the "revealed" line; the answer picture with `SpokenMath`; a "Show solution" button (`w.ui.reveal`) after solving, while no solution is shown and the exercise has a `solution` or `steps` (`:545-547`); the solution picture/spinner/error; `StudentPanel`; and "Reset progress" when anything was answered, which empties the stored progress and zeroes the session score (`:556-566`).
   - sheet mode: count `Segmented`, "With answers", "New set", and the preview.

#### Three renderings

The tail of the component (`:586-618`) wraps the same `body` three ways. Without `onSubmit` it returns `<div className="practice-body">{body}</div>` and nothing else: "The page has no board to insert into, so no worksheet either" (`:586`). With `docked` it returns an `<aside className="dock" aria-label={title}>` (`:594-603`) built from the modal's own classes: a `modal-header` with the `<h2>` title and an `icon-btn` "×" (`aria-label={t.close}`) that calls `onClose`, the body in `modal-body`, and a `modal-footer` holding only the Insert/Update button. It is not a `Modal`: no backdrop, no focus trap and no Escape handler, so the board beside it stays in use; an `<aside>` is a complementary landmark, which is how `e2e/practice.spec.ts:75-104` finds it. Otherwise it is the `Modal` (`:605-618`) with Cancel and Insert/Update in its footer. The title is `t.editPractice` when editing, else `t.practice`.

### src/pages/PracticePage.tsx

Twenty-three lines. Header comment (`PracticePage.tsx:1-3`): "The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own, for a student who came to practise rather than to draw. Class practice works here the same way; the worksheet stays on the board, where it is inserted."

`PracticePage({ start })` (`:7-23`) reuses the home page's frame: a `div.home.practice-page` (820px wide instead of 1040px, `styles.css:398`) with a `home-header` whose `.brand` stacks a `← t.back` link to `#/` over an `<h1>` reading `t.practice` (`styles.css:399` turns the brand into a column), and the `LangSelect` on the right. `<main>` holds `<PracticeDialog start={start} />` (`:19`) and nothing else. With no `onSubmit`, `onClose` or `initial`, the component renders its body in a `.practice-body` card, with no Insert button and no practise/sheet switch; everything else (local progress, review of missed questions, the student panel, class practice, the tests and the outboxes) is the same code as on a board, so a student signed in here is the same student there. `start` comes from the route's capture (`main.tsx:35-39`); `startOr` ignores it unless it names one of `AREAS`, falling back to `number`. The page's question view is the text-and-images one described under "Rendering the maths" above, at the larger sizes of `styles.css:404-409`. `e2e/practice.spec.ts:58-73` pins the route from the home card, the "Practice" heading, the absence of the worksheet switch and of an Insert button, and a right answer being marked correct.

### src/pages/TeacherPage.tsx

#### Access

The password is kept in `sessionStorage["zeno.teacher"]` ("for this tab only", `TeacherPage.tsx:4`, `:22-36`). `Access` (`:39`): `checking | locked | wrong | waiting | open | offline`; "waiting: too many wrong passwords; the server won't check another for a few minutes." `unlock(pw, typedIn)` (`:75-87`): `teacherApi(pw).classes()`; success stores the password, the list, `open`, and selects the last class if none is selected; 403 → `wrong` if typed, else `locked` (first visit, nothing typed yet); 429 → `waiting`; other → `offline`. Run once on mount with the remembered password (`:88-92`). The login form (`:169-183`) submits `unlock(typed, true)` and shows `wrongPassword` / `tooManyTries` as alerts.

`api = useMemo(() => teacherApi(password), [password])` (`:61`): every call sends `X-Teacher-Password`.

#### Formatting

`pct` (`:63-66`) is an `Intl.NumberFormat(lang, {style: "percent", maximumFractionDigits: 0})`, memoised on `lang`; `num(v, digits)` locale number or "—"; `share(v)` rounds first "so a tiny negative shows as 0 % rather than "-0 %"" (`:68-69`).

#### Data

`load(code)` (`:94-104`): `api.dashboard(code)` with `loading` (dims the main column via `.refreshing`) and `failed`. Effect on `[access, selected]` loads when open. `create` (`:111-122`): `api.create(name, areas or undefined, testLength)`, reset the form, reload the list, select the new class. `moveTo(phase)` (`:124-133`): `api.setPhase(selected, phase, minutes if session)`, reload the list. `download(kind)` (`:134-145`): fetch the CSV as a blob with the header ("a plain link can't send the password header", `api.ts:102`), click a temporary `<a download>`, revoke. All failures set `failed`, shown as `w.loadFailed` (`:208`).

#### Layout

Sidebar (`:210-260`): the class list (name, code, "{n} students · {a} adaptive, {f} fixed"), and the New class form: name (max 100), questions per test (clamped to `MIN_TEST_LENGTH..MAX_TEST_LENGTH`, 4..30, default 12), area chips (none = all), Create.

Main (`:262-446`):
- Class head: name, the code in large monospace, hint, and Refresh / Download answers / Download tests / Print the tests.
- `PrintableTests` in `<Suspense fallback={null}>` when printing (`:280-284`).
- Phase card: five buttons (`open, pretest, session, posttest, closed`), the current one `primary` + `aria-pressed`; "session" first asks for minutes (1..240, default 20) then Start; a `Countdown` with an `ended` string while a session runs (`:311`).
- When `data.class.code === selected`: a "no students" note when the list is empty; the Groups table (rows from `rows`, `:192-203`: students, answered, class practice, right first time, predicted, off target, median time, solution viewed, skipped, practice minutes) with a column for each of the two conditions, always both (`groups`, `:191`, maps `["adaptive", "fixed"]` unconditionally — unlike the heatmap, which drops an empty group); the Tests card (pre/post/gain per condition via `describe`, `:189-190`, which fills `w.meanSd` = "{mean} (SD {sd}, n = {n})" or "—" when `n` is 0; the effect size tile; and the form A/B check) or `noTests` when neither group has a test; the Mastery card, only when there are students (`:379`), with `HeatLegend`, the "Show numbers" and "Show codes" checkboxes and `MasteryHeatmap`; the Calibration card with the lazy `CalibrationChart` (`<Suspense fallback={<div className="calib-chart"/>}>`), tiles for answers / log loss / AUC, and a "Show table" toggle listing every non-empty bin — or `w.noPredictions` when `calibration.n` is 0 (`:401`, `:441`). The session clock comes from the class list, not the dashboard: `sessionEnds` (`:148`) is the selected class's `sessionEnds` while its phase is `session`.

Lazy imports (`:15-18`): "Printing the tests renders every question with MathJax, and the calibration chart has its own code: both load when first shown, so the dashboard itself doesn't carry them."

### src/components/MasteryHeatmap.tsx

Header comment (`MasteryHeatmap.tsx:1-5`): one row per student grouped by condition with the group mean on top, one column per skill; "A cell's shade is the chance of a right first answer at medium level, in five 20 % bins of one blue"; grey = no answers; hover gives all three levels; "show numbers" puts the percentages in so "nothing depends on colour or hover alone."

`bin(p) = min(4, floor(p*5))` (`:18`). `cell(who, k, c, key)` (`:31-41`): `<td class="heat-cell heat-{bin(c.p[1])} | heat-none">` with the tip handlers from `useChartTip`; the tip's value is `pct(c.p[1])` (level 2), the label `who · skill`, the detail `fill(words.cellTip, {p1, p2, p3, n})`; the cell text is `round(p[1]*100)` when `showNumbers`. `score(t)` shows `(x%)` in brackets while a test is incomplete (`:43`); `meanScore` averages only complete tests. `groups` (`:48-50`) keeps the conditions that have students. Per group a `<tbody>`: a `heat-group` row (label with count, total answered, mean pre/post, and a mean cell per skill computed over students with `n > 0`, `:69-74`), then one row per student (`id`, or `id · code` when `showCodes`). `HeatLegend` (`:106-121`) lists the five bins as `pct(b/5)–pct((b+1)/5)` and the no-answers swatch.

### src/components/CalibrationChart.tsx

Header comment (`CalibrationChart.tsx:1-5`): questions grouped by the model's predicted chance; each dot at (mean predicted, share right first time); on the diagonal = predictions came true; "A dot's area grows with its number of answers"; "One series, so no legend."

Fixed 340×280 viewBox with margins (`:12-16`); `x(v)`, `y(v)` map 0..1 to pixels; `TICKS` at quarters. Only bins with `n > 0` are drawn; `radius(n) = 4 + 6·sqrt(n/most)` (`:26`, area ∝ n). Each tick draws a horizontal and vertical `viz-grid` line and two `viz-tick` labels; the `viz-diagonal`; two `viz-axis-label`s (the y one rotated). Each dot is a `<g class="viz-point" tabIndex=0 role="img" aria-label>` with an invisible `viz-hit` circle of at least r=12 for an easy target, and the `viz-dot`. The tip gives `pct(observed)` and `fill(words.binTip, {from, to, predicted, observed, n})`.

### src/components/PrintableTests.tsx

Comment (`PrintableTests.tsx:1-4`): both forms on paper "for a lesson without devices or a backup when the network fails"; the forms "are the ones the students' browsers build (from the class code), so a paper answer can be typed in later as the same question"; "The browser's print dialog makes the PDF."

`forms` memoised on `[klass, pw]`: for `A` and `B`, `testItems(klass.code, klass.skills, form, klass.testLength)` → each with `exercise(...)`, the question card as a data URL, and the answer (`latexToSvg(ex.show)`) as a data URL. Render: a `print-overlay` dialog with Print (`window.print()`) and Close, then a `print-sheet` holding one `print-page[data-form]` per form (title `fill(w.printTitle, {name, form})`, a student blank, the note, an `<ol class="print-items">` of card + `SpokenMath` + answer line) and one `print-page print-key[data-key]` per form (answer images with `alt={ex.plain}`). `e2e/print.spec.ts:13-16` counts 6 items per form and key for a 6-question class.

### Cross-cutting notes

- **Network errors never throw to React.** Every call site catches and maps to state: `failed` (Home, Teacher), `missing`/`saveState` (Board), `gone` (Shared), `planStatus`/`error` (Practice/StudentPanel), or silent retry (ShareBox, outboxes, polls).
- **Keyboard shortcuts, complete list.** Ctrl/Cmd+K and `/` open the palette (`BoardPage.tsx:434-449`); Escape closes modal, palette, tool menu, share box; Tab is trapped in a modal; arrows move in tabs, segmented groups, tool menus and the palette; Enter checks/advances a practice question, submits a test answer, submits the join fields, blurs the title; Ctrl/Cmd+Enter inserts a formula; Enter/Space on a tray block adds one; double-click on a math picture edits it.
- **Persistence in the browser.** `lang`, `zeno.library`, `zeno.practice.v1`, `zeno.student.v1`, `zeno.outbox.v1`, `zeno.testbox.v1` in `localStorage`; `zeno.teacher` in `sessionStorage`. All reads and writes are wrapped so private mode degrades to "not kept".
- **Timings.** Practice and test durations use `performance.now()` (`learner.ts:51-52`: "so a clock change doesn't skew them"); `shownAt` for the record is `Date.now()`; session ends are epoch ms from the server and compared with `Date.now()`.


## 5. The tool dialogs

Every maths picture on a board is produced by a *tool dialog*: a React modal that holds a small JSON **spec**, renders it to an SVG (or, for 3D, a PNG) on every keystroke, shows that picture as a preview, and on "Insert" hands the spec and the picture to the board page. The board stores the spec in the Excalidraw image element's `customData`, so the picture can be re-opened in the same dialog and re-rendered. Thirty-two dialogs share one contract and, with few exceptions, one layout. This section describes the contract first, then each dialog.

#### The registry: `src/tools.tsx`

`ToolDialogProps` (`src/tools.tsx:11-18`) is what every dialog accepts:

```ts
export type ToolDialogProps = {
  initial?: unknown;   // the stored spec when editing
  start?: string;      // a topic/tab key to open on
  onSubmit: (data: unknown, image: { svg?: string; dataURL?: string; width: number; height: number }) => void;
  onClose: () => void;
  docked?: boolean;    // beside the board rather than over it
};
```

`ToolKind` (`src/tools.tsx:20-22`) is the closed union of 33 kinds (the 32 picture tools plus `practice`). `Tool` (`src/tools.tsx:24-36`) carries: `Dialog`, a `LazyExoticComponent`; `edit`, the dictionary key of the "edit this picture" button label; `docked?: boolean`, for a tool that "Opens beside the board instead of over it, and stays open while other tools are used" (only `practice`, `src/tools.tsx:76`); `png?: boolean`, set when the dialog returns a PNG `dataURL` instead of an SVG string (only `3d`); and three optional functions of the dictionary that feed the command palette: `topics` (tab key → label), `hints` (tab key → hint sentence) and `names` (tab key → map of inner names such as algorithm names).

`load` (`src/tools.tsx:39-40`) wraps `React.lazy` around a dynamic `import()` and picks a named export, casting it to `ComponentType<ToolDialogProps>`. Each dialog file therefore becomes its own Vite chunk and is fetched the first time it opens. `TOOLS` (`src/tools.tsx:42-88`) lists every kind. Most entries point `topics`/`hints` at a dictionary object (`t.analysisTopics`, `t.statHints`, …). A few are hand-built: `model` (`src/tools.tsx:45`) assembles nine tab labels; `3d` (`src/tools.tsx:46`) loads the `default` export, sets `png: true` and hand-builds its three tab labels (`solid`, `cubes`, `transform3d`); `matrix` (`src/tools.tsx:47`) joins all `spaceHints` into one hint for the `space` tab; `algo` (`src/tools.tsx:54-59`) exposes six name tables (sorts, searches, graph algorithms, trees, data structures, DP problems) so "dijkstra" or "kmp" finds the right tab; `comb` (`src/tools.tsx:61`) exposes `countNames`; `practice` (`src/tools.tsx:73-80`) sets `docked: true` and builds names from `AREAS`/`SKILLS` so every skill name is searchable. `isToolKind` (`src/tools.tsx:90`) is the guard the board uses on `customData.kind`.

`MENUS` (`src/tools.tsx:96-155`) is the toolbar: five groups (arithmetic, geometry, algebra, discrete, practice), each item `{ kind, icon, label, start? }`. `start` opens a dialog on a tab: "counting" opens `model` on `placeValue` (`src/tools.tsx:99`); the five practice entries open `practice` on an area (`src/tools.tsx:148-152`).

The command palette (`src/components/CommandPalette.tsx`) flattens `MENUS` plus every tool's `topics` into `Entry` rows (`src/components/CommandPalette.tsx:22-38`), one per menu item and one per tab (tab rows are added once per kind, from the first menu item of that kind that has no `start`, `:28`), and searches them with accent-folded, `ё`-folded matching (`norm`, `src/components/CommandPalette.tsx:20`; `search`, `41-70`). Every word of the query must match somewhere: a prefix of the title or tab label (or of a word in them) scores 0, a substring of them 1, inner-name hits 2 (and the matched name is shown as "via"), hint hits 5; results sort by score then registry order, top 12. An empty query lists only the menu rows (`:43`). Picking calls `open({ kind, start })` (`src/pages/BoardPage.tsx:620`).

#### `Modal` and `ColorSwatches`: `src/components/Modal.tsx`

`Modal` (`src/components/Modal.tsx:6-57`) takes `title`, `onClose`, `children`, `footer`. It keeps the latest `onClose` in a ref (`src/components/Modal.tsx:15-16`) so the single `keydown` listener attached on mount never goes stale. The mount effect (`src/components/Modal.tsx:18-43`) remembers `document.activeElement` as the opener, moves focus to the first focusable element inside `.modal-body` (or to the dialog box itself if there is none) unless something inside already has it (a dialog can `autoFocus` a field), closes on Escape, and traps Tab/Shift-Tab among the visible focusables (`offsetParent !== null`, `src/components/Modal.tsx:26`); on unmount it focuses the opener if it is still in the document. A `mousedown` on the backdrop itself closes (`src/components/Modal.tsx:46`); the dialog box has `role="dialog" aria-modal="true"` and `tabIndex={-1}`. The header holds an `×` button labelled `t.close`.

`INK_COLORS` (`src/components/Modal.tsx:59`) is the six-colour ink palette (`#1e1e1e`, blue, red, green, purple, orange). `ColorSwatches` (`src/components/Modal.tsx:61-84`) is a `radiogroup` of swatch buttons; each has `aria-label`/`title` from `t.colorNames[c]` and `aria-checked`.

#### Widgets: `src/components/ui.tsx`

`arrowKeys` (`src/components/ui.tsx:5-20`) returns a keydown handler for a button group: Right/Down advance, Left/Up retreat (wrapping), Home/End jump, and the handler both calls `onChange` and focuses the landed button. `Tabs` (`src/components/ui.tsx:23-46`) renders `role="tablist"` with one button per key; only the active key (or the first, if `value` is not among `items`) is in the Tab order (`tabIndex 0`, others `-1`). `Segmented` (`src/components/ui.tsx:49-75`) is the same idea as a `radiogroup`, generic over `string | number | boolean` keys, with `className`, `itemClassName` (dialogs pass `math-label` for maths-looking labels) and `ariaLabel`. `startOr(start, items, fallback)` (`src/components/ui.tsx:78-79`) turns the `start` prop into a topic key, falling back when it names none of the tool's topics.

Two more shared widgets live elsewhere: `Slider` is exported from `src/components/AnalysisDialog.tsx:191-207` (a labelled `<input type="range">` with an `<output>` showing `shown ?? value`) and imported by Nt, Ode, Stats and Trig; `PlaceValueMat` (`src/components/PlaceValueMat.tsx`) is the drag-and-drop base-ten mat used by the model dialog.

#### Rendering and the picture that comes back

Renderers live in `src/math/*` and return `RenderedSvg = { svg: string; width: number; height: number }` (`src/math/latex.ts:24`). Formula text inside them goes through `latexToSvg` (`src/math/latex.ts:26-49`): MathJax (`mathjax-full`, imported statically at `src/math/latex.ts:3-10`) with a `liteAdaptor`, TeX input with every package except `bussproofs`, `require` and `autoload` (`src/math/latex.ts:15`), SVG output with `fontCache: "none"` so glyphs are paths and no font is needed. A `data-mjx-error` attribute in the output is thrown as an `Error` with MathJax's message (`src/math/latex.ts:30-31`); this is the "invalid LaTeX" error the dialogs display. Sizes in `ex` are converted at 9 px per ex (`src/math/latex.ts:22`), the inline `style` is stripped, table rules get an explicit stroke, `currentColor` is replaced by the requested ink, and an `xmlns` is added if MathJax left it out (`src/math/latex.ts:38-47`).

Previews are shown as `<img src={svgToDataUrl(svg)}>`. `svgToDataUrl` (`src/math/svg.ts:1-7`) base64-encodes UTF-8 bytes in 32 KiB slices (a worksheet SVG can be hundreds of kilobytes). The board darkens pictures for dark boards with `darkSvg` (`src/math/svg.ts:27-32`), which wraps the content in a `<g filter>` applying an inverting colour matrix plus a 180° hue rotation, marked by `data-zeno-dark` so `lightSvg` can undo it exactly; `themedSvg` (`src/math/svg.ts:42`) picks one by theme.

#### The insert/update flow on the board page

`BoardPage` (`src/pages/BoardPage.tsx`) keeps `dialog: { kind; editing?; start? } | null` (type at `src/pages/BoardPage.tsx:43`, state at `:99`) and a second slot of the same type, `dock` (`:101`): "A docked tool (practice) has its own place beside the board, so a dialog can open while it stays." Every opener goes through `open` (`:102`), which puts the request in `dock` when `TOOLS[kind].docked` is set and in `dialog` otherwise. The dialog is mounted inside `<Suspense fallback={null}>` (`src/pages/BoardPage.tsx:596-609`) with `key={dialog.editing?.id ?? dialog.kind}` so editing a different picture remounts with fresh state, `initial={dialog.editing && mathOf(dialog.editing)!.data}` and `start={dialog.start}`. Its `onSubmit` handler (`src/pages/BoardPage.tsx:603-606`) calls `insert(dialog, openTool, data, image)` and closes. `insert` (`src/pages/BoardPage.tsx:483-489`) builds a `PlacedImage` (`src/pages/BoardPage.tsx:48`): for a `png` tool it takes `image.dataURL` as `image/png`; otherwise it themes the SVG for the current board theme and wraps it with `svgImage` (`src/pages/BoardPage.tsx:50-55`, `image/svg+xml`). It then calls `placeImage(placed, { kind, data, w, h }, d.editing)`. The docked tool is mounted in its own `Suspense` after the canvas wrapper, inside the `.board-body` flex row (`src/pages/BoardPage.tsx:578-593`), with `docked`, ``key={dock.editing?.id ?? `${dock.kind}:${dock.start ?? ""}`}`` (so picking another practice area remounts it), and an `onSubmit` that calls the same `insert` but clears `dock` only when editing: "Practice goes on beside the board; an edit is finished." (`:588`).

`MathData` (`src/pages/BoardPage.tsx:32`) is `{ kind: ToolKind; data: unknown; w: number; h: number }`: the natural width and height of the rendered picture are stored beside the spec. `placeImage` (`src/pages/BoardPage.tsx:314-369`) registers a new `BinaryFileData` under a fresh UUID. When **editing**, it maps over all scene elements (including deleted ones) and replaces the one being edited: new `fileId`, `width = rendered.width × (old element width ÷ old natural width)` and `height` by the same factor, so a user's manual resize survives a re-render (`src/pages/BoardPage.tsx:325-346`), new `customData`, bumped `version`/`versionNonce`/`updated`, then `updateScene` with `CaptureUpdateAction.IMMEDIATELY` so it is one undo step. When **inserting**, it places the image at the viewport centre (or at `at`), slides it down with `freeY` (`src/components/ShapesPanel.tsx:33-45`: while the box overlaps any undeleted element's bounds, move its top to that element's bottom + 24) and selects and scrolls to it. A picture inserted without `math` gets `customData: { snapshot: true }` (snapshots of live pieces).

Editing starts from `openEditor` (`src/pages/BoardPage.tsx:422-425`), which passes `{ kind, editing }` to `open`, so a practice picture is edited in the dock and every other picture in a dialog. It is reached by the "✎ edit" button in the bar, which appears when exactly one maths image is selected (`selectedMathElement`, `src/pages/BoardPage.tsx:86-91`; button at `506-510` with label `t[TOOLS[kind].edit]`), or by double-clicking a maths image (`onDoubleClickCapture` on the canvas wrapper, `src/pages/BoardPage.tsx:540-547`, which also stops Excalidraw's image-crop mode). `mathOf` (`src/pages/BoardPage.tsx:83-84`) only recognises `image` elements whose `customData.kind` passes `isToolKind`. One more producer of `graph` data exists: the live graph's "freeze" button (`src/pages/BoardPage.tsx:404-418`) substitutes slider values into the expressions and inserts a `{ kind: "graph", data: spec }` picture, so a frozen graph opens in `GraphDialog` like any other.

Keyboard: Ctrl/Cmd+K (only with nothing selected, because Excalidraw uses it for links) or `/` outside a text field opens the palette (`src/pages/BoardPage.tsx:433-448`); both are ignored while a dialog is open, but not while only the docked practice panel is (`shortcutState.current.open = palette || !!dialog`, `:433`).

#### The common dialog shape

All dialogs except Formula, Graph, Geometry, Matrix, Model and 3D follow one template, visible in full in `src/components/FnDialog.tsx`:

1. Props are typed per tool: `initial?: FnSpec`, `start?: string`, `onSubmit: (spec: FnSpec, rendered: RenderedSvg) => void`, `onClose` (`src/components/FnDialog.tsx:11-16`). The cast to `ToolDialogProps` happens in the registry.
2. `topic` state starts from `initial?.topic ?? startOr(start, TOPICS, default)` (`src/components/FnDialog.tsx:20`).
3. `specs` state is a record of one spec per topic, initialised to each topic's **first preset**, with `initial` substituted under its own topic (`src/components/FnDialog.tsx:21-24`). Switching tabs therefore keeps what was typed on each tab; `spec = specs[topic]`.
4. `result = useMemo(() => try { rendered: render(spec, words) } catch { error: message }, [spec, words])` (`src/components/FnDialog.tsx:27-33`). Every edit re-renders synchronously; a throw from the parser or renderer becomes the error string.
5. `Modal` with the title `initial ? t.editX : t.X` and a footer of Cancel + a primary button that is `disabled={!result.rendered}` and labelled `t.update` when editing, `t.insert` otherwise (`src/components/FnDialog.tsx:36-47`).
6. `Tabs` are shown only when **not** editing (`!initial`, `src/components/FnDialog.tsx:48`): a stored picture keeps its topic. A `<small className="hint">` under them shows `t.xHints[topic]`.
7. An "Examples" row of `chip` buttons, one per preset, that replaces the topic's spec wholesale (`src/components/FnDialog.tsx:51-60`). Labels are language-neutral maths strings (the dictionary is not involved), except where noted below.
8. Topic-specific inputs.
9. The preview block: the `<img>` or `<span className="error">{result.error}</span>` (`src/components/FnDialog.tsx:67-72`).

Inputs are controlled text fields with `className="mono"` and `spellCheck={false}`; numbers are kept as strings in the spec so partial input ("-", "0.") is never clobbered, and parsed by the renderer. The words object passed to the renderer (`t.fnWords` etc.) is the only localisation the renderer sees; this is why `tests/presets.test.ts` can render every preset in every language without React.

#### How presets are tested: `tests/presets.test.ts`

The test imports every `*_PRESETS` table and renderer (`tests/presets.test.ts:9-38`), normalises presets that are a flat list or a `{ topic: list }` of specs or `{ label, spec }` (`specs`, `tests/presets.test.ts:41-44`), and builds a table of 30 tools with a `(spec, dict) => RenderedSvg` thunk (`tests/presets.test.ts:46-77`). Statistics presets have their dialog-only `names` key stripped (`:58`); vector-space presets are expanded onto `DEFAULT_SPACE` (`:76`). For each tool and each of `en`, `ru`, `ka` (`:79`), every spec must render without throwing, start with `<svg`, contain neither `NaN` nor `undefined`, repeat no attribute within a tag, and have finite positive width and height (`tests/presets.test.ts:81-103`). Geometry and models take no words. Matrix calc, graphs and formulas have no preset table; the plane-transformation presets (`TRANSFORM_PRESETS`, `src/math/transform.ts:16`) and the 3D presets (`TRANSFORM3D_PRESETS`, `src/three/spec.ts:61`) exist but are not covered here (the 3D picture is a WebGL snapshot, not an SVG).

#### The worked-solution mode

The practice dialog reuses these renderers for worked solutions. A practice exercise may carry `solution: { kind: SolutionKind; spec }`, where `spec` is built in the target tool's own format. `renderSolution` (`src/math/practiceSolve.ts:6-47`) switches on the kind and dynamically imports the matching module (`models`, `algebra`, `powers`, `coordgeom`, `trig`, `derive`, `applied`, `statistics`, `combinatorics`, `numtheory`, `inference`, `vectors`, `sequences`, `functions`, `identities`, `polynomials`, `euclid`, `numerical`), calling the same `renderX(spec, t.xWords)` the dialog calls. `PracticeDialog.showSolution` (`src/components/PracticeDialog.tsx:258-267`) awaits it, shows the SVG as a data URL, and falls back to `renderSteps` or an error. So any topic described below that appears in that list can also be drawn, unattended, as the answer to a generated question; the practice generator in `src/math/practice.ts` additionally imports `circleFigure` and `solidFigure` from `src/math/euclid.ts` (`src/math/practice.ts:8`, used at `:1205` and `:1282`) to embed circle-theorem and solid figures in the question itself.

---

#### FnDialog (`functions`)

`src/components/FnDialog.tsx`, 75 lines, the reference instance of the template. Spec `FnSpec = { topic: FnTopic; src: string }` (`src/math/functions.ts:17`); topics `domain | compose | transform | sketch` (`:15-16`), default `domain`. One input, prefixed by `f.input` from `t.fnFields`. Renders with `renderFunctions(spec, t.fnWords)` (`src/math/functions.ts:1708`), which dispatches to `renderDomain`, `renderCompose`, `renderTransform`, `renderSketch`. Presets (`src/math/functions.ts:1724`): domain — `√(x + 3)/(x − 2)`, `1/(x² − 1)`, `ln(4 − x²)`, `x² − 4x + 7`, `(x + 1)/(x − 1)`, `√(9 − x²)`, `x², x ≥ 1`, `tan x`; compose — `fg, gf`, `fg(2)`, four `f⁻¹` examples, `√ inside ln`; transform — `2f(x − 3) + 1`, `−f(2x)`, `f(x/2) − 1`, `|f(x)|`, `f(|x|)`, `1/x → 3f(x + 2)`; sketch — seven rational/cubic/exponential curves. Errors are the parser's messages from `readExpr`/`defsOf`/`oneFunction` (`src/math/functions.ts:839-896`).

#### CoordDialog (`coord`)

`src/components/CoordDialog.tsx`; identical to FnDialog except names (diff shows only imports, words and labels). Spec `CoordSpec = { topic: CoordTopic; src: string }` (`src/math/coordgeom.ts:13`); topics `points | line | perp | meet | circle | polygon`, default `points`. Renderer `renderCoord(spec, t.coordWords)` (`src/math/coordgeom.ts:1082`) over `parseItems` (`:340`), which reads points `A(1, 2)`, equations and `m = …` clauses separated by `;` or a top-level `,` (`:348`). Presets (`:1102`): points — distance/midpoint/ratio examples such as `A(2, 1), B(8, 10), 1 : 2`; line — `2x + 3y = 6`, `y = 3x − 2`, two points, point-and-gradient, `m = 2/3, c = 1`, point–slope, `x = 4`; perp — a line and a point `P`; meet — pairs of lines including parallel and coincident; circle — general and centre–radius forms, tangent at `Q(3, 4)`, line–circle intersections, a non-monic general form; polygon — 3- to 5-gons.

#### EuclidDialog (`euclid`)

`src/components/EuclidDialog.tsx`; same template. Spec `EuclidSpec = { topic; src }` (`src/math/euclid.ts:13`); topics `circle | similar | transform | solids | construct`, default `circle`. Renderer `renderEuclid(spec, t.euclidWords)` (`src/math/euclid.ts:3488`) dispatching (through `buildEuclid`, `:3491`, which throws `w.need[topic]` on an empty source) to `renderCircle` (`:818`), `renderSimilar`, `renderTransform`, `renderSolids` and `renderConstruct`, which hands locus/region clauses to `renderLocus` (`:3223`, `:3234`). The source is a `;`/newline-separated clause list (`clausesOf`, `:521`). Presets (`:3520`) have English labels: circle — angle at the centre, semicircle, same segment, cyclic quadrilateral, two tangents, tangent & radius, alternate segment, chord, intersecting chords, tangent–secant; similar — missing sides, A-shape, X-shape, with x, SAS congruence, AA similarity, area & volume, from areas; transform — rotate 90°, reflect in y = x, enlarge ×2, enlarge −½, translate, two in a row, describe rotation/enlargement; solids — cylinder, cone, sphere, cuboid, triangular prism, square pyramid, r/h from a volume, cylinder + hemisphere, cube with a hole; construct — perpendicular bisector, angle bisector, perpendicular from a point, triangle from 3 sides, 60°, region, two loci meet, garden. `circleFigure`/`solidFigure` (`:3457-3487`) are the practice-question entry points.

#### IdDialog (`identities`)

`src/components/IdDialog.tsx`; same template. Spec `IdSpec = { topic; src }` (`src/math/identities.ts:12`); topics `compound | rform | prove | equation`, default `compound`. Renderer `renderIdentities` (`src/math/identities.ts:2214`) over `prep`/`readE` (`:802-811`, which also detect degrees vs radians and a `θ` variable). Presets (`:2234`): compound — `sin 75°`, `tan 15°`, `cos(7π/12)`, `cos 22.5°`, `sin A = 3/5, cos B = −5/13`, `tan A = 2: sin 2A, cos 2A`, `sin 3x`, `cos(x + 60°)`; rform — `3 sin x + 4 cos x`, `sin x − √3 cos x`, `5 cos x − 12 sin x, R cos(x + α)`, `3 sin x + 4 cos x = 2`, `√3 sin 2x + cos 2x`; prove — seven `≡` identities; equation — seven trigonometric equations with intervals parsed by `splitInterval` (`:1413`).

#### NumDialog (`numerical`)

`src/components/NumDialog.tsx`; same template. Spec `NumSpec = { topic; src }` (`src/math/numerical.ts:16`); topics `sign | bisect | newton | iterate | integrate | diff`, default `sign`. Renderer `renderNumerical` (`src/math/numerical.ts:1442`); options such as the tolerance or step count are parsed out of the source by `readOpts(src, topic)` (`:266`). Presets (`:1477`): sign — change of sign on `[2, 3]`, "to 2 d.p.", `eˣ = 3 − x`, find the intervals, a break at `1/(x − 2)`, two hidden roots, a touching root; bisect — six steps, `√2`, `cos x = x`, `eˣ = 4x`, false position; newton — `x₀ = 2`, `√5`, `cos x = x`, `eˣ = 3x`, three failure modes (flat tangent, cycle, runs away), secant; iterate — cobweb/staircase diagrams including a diverging rearrangement; integrate — trapezium, Simpson, all three rules, `n = 2, 4, 8, 16`, from a table; diff — forward differences with shrinking `h`, round-off.

#### PolyDialog (`polynomials`)

`src/components/PolyDialog.tsx`; same template. Spec `PolySpec = { topic; src }` (`src/math/polynomials.ts:14`); topics `divide | theorem | solve | binomial | simultaneous | partial`, default `divide`. Renderer `renderPolynomials` (`:2029`) dispatching to `renderDivide` (`:642`), `renderTheorem` (`:941`), `renderSolve` (`:1272`), `renderBinomial` (`:1390`), `renderSimultaneous` (`:1701`), `renderPartial` (`:1841`). Presets: five long divisions (including by a quadratic), factor/remainder-theorem unknowns (`find a, b`, `find k`, three unknowns, remainder on `÷ (2x − 1)`, search for factors, `f(1) = 0, f(−1) = 8`), cubic/quartic equations and two cubic inequalities, binomial expansions (`(2x − 3)⁵`, a specific coefficient, the constant term, four terms, `1.02⁸ ≈ ?`, three negative/fractional-index series), simultaneous line/conic pairs including a tangent and a no-meeting case, five partial-fraction forms (distinct, repeated, irreducible quadratic, improper).

#### PowersDialog (`powers`)

`src/components/PowersDialog.tsx`; the template with one change: the prefix before the input is `f.eq` on `equations`, `f.number` on `sci`, `f.expr` otherwise (`src/components/PowersDialog.tsx:63`). Spec `PowersSpec = { topic; src }` (`src/math/powers.ts:11`); topics `laws | sci | surds | logs | equations`, default `laws`. Renderer `renderPowers` (`src/math/powers.ts:2377`) over its own tokenizer/parser (`tokenize` `:233`, `parseExpr` `:272-351`) which keeps numbers as exact rationals (`decimalQ`). Presets (`:2394`): ten index-law expressions (`2³ · 2⁴` … `(−2a²b)³`), nine standard-form items (`345 000 000`, `6.02 × 10²³`, a non-standard `45 × 10³`, products, quotients and a sum), ten surd simplifications and rationalisations, nine log evaluations and law applications, twelve exponential and logarithmic equations.

#### SeqDialog (`sequences`)

`src/components/SeqDialog.tsx`; same template. Spec `SeqSpec = { topic; src }` (`src/math/sequences.ts:15`); topics `pattern | arith | geom | sigma | recur`, default `pattern`. Renderer `renderSequences` (`:2101`) → `renderPattern` (`:821`), `renderArith` (`:997`), `renderGeom` (`:1126`), `renderSigma` (`:1507`), `renderRecur` (`:1888`). Presets: patterns (`5, 8, 11, 14, …`, quadratic, doubling, triangular, cubes, Fibonacci), arithmetic facts (`3, 7, 11, …`, `u₅ = 17, u₁₂ = 38`, `1 + 2 + … + 100`, `a = 2, S₁₀ = 155`, `Sₙ > 500`, decreasing), geometric (`2, 6, 18, …`, `S∞`, `u₂ = 6, u₅ = 162`, `uₙ > 1000`, `S∞ = 12, a = 4`, alternating), sigma sums (linear, `r(r + 1)`, a partial range, `3·2ᵏ`, telescoping, infinite halves, `1 + 4 + 7 + … + 100`), recurrences (affine, `√(xₙ + 2)`, logistic 3.2, Fibonacci, second-order).

#### VecDialog (`vectors`)

`src/components/VecDialog.tsx`; same template. Spec `VecSpec = { topic; src }` (`src/math/vectors.ts:14`); topics `basics | dot | cross | lines | planes`, default `basics`. Renderer `renderVectors`; the source language has points `A(1, 2, 3)`, named vectors, `r = …` lines, `n·r = d` planes and bare expressions (`src/math/vectors.ts:377-403`). Presets: basics (`a = (3, 1), b = (1, 2)`, `2a − 3b`, `A(1, 2), B(4, 6)`, `|a|, â`, `3i − 2j + 6k`, `AB + BC = AC`, `b ∥ a`); dot (2D and 3D products, perpendicularity, `60°`, `∠ABC`); cross (two products, `△ABC`, triple product, `ABCD`); lines (through two points, point on a line, meet, skew, Cartesian form, two 2D cases); planes (point–plane distance, three points, point and normal, line–plane, two planes, parametric form).

#### AlgebraDialog (`algebra`)

`src/components/AlgebraDialog.tsx`. Spec `AlgebraSpec = { topic: AlgebraTopic; eq: string; method: QuadMethod }` (`src/math/algebra.ts:15`); topics `linear | inequality | expand | factor | quadratic` (`:10-11`), default `linear`; `QUAD_METHODS = factor | square | formula | vertex` (`:13`). Adds a `set(patch)` helper (`src/components/AlgebraDialog.tsx:26`). The input prefix is `f.expr` on `expand`/`factor`, else `f.eq` (`:64`); on `quadratic` a `Segmented` over `QUAD_METHODS` labelled from `w.quad.methods` chooses the method (`:67-72`). Renderer `renderAlgebra(spec, t.algebraWords)` (`src/math/algebra.ts:1000`). Presets (`:1032`): linear — `3x + 5 = x + 11`, `2x + 3 = 11`, `5(x − 2) = 3x + 4`, `x/2 + 1/3 = 2`, `7 − 2y = 3y − 8`, an identity `2(x + 3) = 2x + 6`, a contradiction `x + 1 = x + 2`; inequality — `3x − 4 < 2x + 1`, `5 − 2x ≥ 11 (flip)`, two double inequalities; expand — six products including `(x + 1)³`; factor — seven trinomials/differences/common factors including an irreducible `x² + x + 1`; quadratic — eight, each preset also fixing a method (`· square`, `· formula`, `· vertex`). `algebraFactors`/`algebraPoly` (`:1017`, `:1025`) are exported for the tests (`tests/algebra.test.ts:61-115`); nothing in the app calls them. Like Deriv, the dialog has a `set(patch)` helper (`src/components/AlgebraDialog.tsx:26`).

#### DerivDialog (`deriv`)

`src/components/DerivDialog.tsx`. Spec `DerivSpec = { topic: DerivTopic; src: string; at: string }` (`src/math/derive.ts:17`); topics `first | rules | chain | tangent | stationary`, default `rules`. Adds a `set(patch)` helper (`src/components/DerivDialog.tsx:26`). Input prefix `f.f`; a second `at` row appears on `first` and `tangent` (`src/components/DerivDialog.tsx:67-72`). Renderer `renderDeriv(spec, t.derivWords)` (`src/math/derive.ts:662`) built on the symbolic `differentiate` (`:187`), which returns the TeX rows and the rules used; `derivOf(src, w)` (`:733`) exposes the parsed function, its derivative and the lines for the tests. Presets (`:680`): first principles — `x²`, `3x² − 2x`, `x³`, `x³ − 4x + 1`, `2x⁴`; rules — twelve functions covering product, quotient, chain, exponential, log, root, reciprocal power, `tan x`, `xˣ`; chain — seven nested functions; tangent — seven function/point pairs (`sin x, x = π/2`); stationary — eight polynomials including `x³` (a point of inflection) and `−x² + 4x`.

#### AppDialog (`applied`)

`src/components/AppDialog.tsx`. Spec `AppSpec = { topic: AppTopic; f; g; a; b; c; opt: string }` (`src/math/applied.ts:23`); topics `area | volume | motion | optimise | rates` (`:16-17`), default `area`; `OPT_KINDS = box | fence | can | distance`, `RATE_KINDS = ladder | balloon | cone | ripple` (`:18-21`). The `opt` string overloads: on `volume` it is the axis (`"y"` or anything else = x, `src/components/AppDialog.tsx:53-55`); on `optimise`/`rates` it is the kind. `pick(opt)` (`:27`) switches kind by loading that kind's first preset "so the numbers fit", falling back to just setting `opt`. The kind is chosen by a `Segmented` over `OPT_KINDS` / `RATE_KINDS` labelled from `w.opt.kinds` / `w.rates.kinds` (`src/components/AppDialog.tsx:56-57`); the volume axis is a two-item `Segmented` labelled `w.fields.axisX`/`axisY` (`:54`). `appFields` substitutes `box`/`ladder` when `opt` names no known kind (`src/math/applied.ts:898`, `:902`). The input rows are produced by `appFields(spec, w)` (`src/math/applied.ts:888-908`): `f, g, a, b` for area and volume; `s, t₀, t₁` for motion; the optimisation kind's two labelled fields from `w.opt.fields`; the rate kind's up to four fields mapped onto `a, b, c, f`. Renderer `renderApplied` (`:870`), which uses the symbolic `antiderivative` (`:92`). Presets (`:909`): area — `x² on [0, 3]`, `sin x on [0, 2π]`, `x³ − 4x` (signed regions), three between-two-curves cases, `eˣ`, `1/x on [1, e]`; volume — discs about x, a sphere, a cone, a washer, two shell cases about y; motion — five `s(t)` cubics/quadratics; optimise — two open boxes, a fence of 100, a 330 ml can, two nearest-point problems; rates — two ladders, a balloon, a cone, a ripple.

#### InfDialog (`inference`)

`src/components/InfDialog.tsx`. Spec `InfSpec` (`src/math/inference.ts:25-39`): `topic`, `kind: string`, six scalar strings `a…f`, two multi-line strings `data`/`data2`, `level` (confidence % or α), `alt: "ne" | "lt" | "gt"`, `seed: number`. Topics `ci | coverage | test | two | chi | power` (`:11-12`), default `ci`. `kindsOf(topic)` (`:951-953`) gives the sub-kinds: `t | z | prop` for `ci`/`test`, `means | paired | props` for `two`, `gof | indep` for `chi`, `z | t` for `coverage`, none for `power`; the dialog shows them as a wrapped `Segmented` labelled by `kindLabel` (`src/components/InfDialog.tsx:58-60`), and `pick(kind)` (`:29`) loads that kind's first preset. `hasAlt(topic)` (`src/math/inference.ts:957`) adds an alternative-hypothesis `Segmented` over `ALTS` for `test`, `two`, `power`, prefixed `H₁:` on `power` (`src/components/InfDialog.tsx:61`). `infFields(spec, w)` (`src/math/inference.ts:961-1000`) decides which inputs appear and their labels: for `ci`/`test` a `t` or `z` kind shows a `data` textarea plus summary fields (mean, s or σ, n) and `test` adds μ₀ (or p₀ for `prop`, which has only x and n); `two`/means shows both data textareas and six summary fields x̄₁ s₁ n₁ x̄₂ s₂ n₂; `chi`/gof has an observed textarea and a ratio field; `power` has μ₀ μ₁ σ n; the last field is always `level`, labelled confidence for ci/coverage and α otherwise (`:963-999`). The preset helper `S` (`:1002-1017`) fills the defaults `level` `"95"` (ci/coverage) or `"0.05"`, `alt: "ne"`, `seed: 1`; those marked `area` become 2-row textareas, the rest sit in a `range-grid` of 110 px inputs (`src/components/InfDialog.tsx:74-91`). `coverage` has a 🎲 "new sample" button that sets a fresh random `seed` (`:92-94`). Preset chips use plain `chip text` (no `math-label`). Renderer `renderInference` (`:931`). Presets (`:1018`): ci — t, data, z, two proportions; coverage — three simulations; test — t, data-driven with `<`, z with `>`, two proportion tests; two — means, data, paired, proportions; chi — a die, Mendel `9 : 3 : 3 : 1`, 2×2 and 2×3 tables; power — three.

#### CombDialog (`comb`)

`src/components/CombDialog.tsx`. Spec is a discriminated union (`src/math/combinatorics.ts:20-28`): `CountSpec { kind: perm | comb | permRep | combRep | word; n; r; word }`, `PascalSpec { mode: row | entry | hockey | parity | diagonals; rows; n; k }`, `StarsSpec { k; n; empty: boolean }`, `InclSpec { mode: venn | divisible; sizes; n; divs }`, `NumbersSpec { kind: catalan | derange | stirling | partitions; n }`; the dialog's `Specs` is `{ [K in CombTopic]: CombSpecOf<K> }` (`src/components/CombDialog.tsx:20`), default topic `count`. Helpers `text(label, key, width)` and `segmented(...)` (`:46-55`) read fields through an `as Record<string, unknown>` cast because the union has no common key beyond `topic`. Per topic: count — kind segmented (labels from `w.countNames`), then either a 180 px `word` field or `n`/`r` (`:86-100`); pascal — mode segmented whose handler also swaps `rows` to `"32"` entering `parity` and back to `"9"` leaving it (`:104`), then `rows`, and `n` for `row|entry|hockey`, `k` for `entry|hockey`; stars — `k`, `n`, an "allow empty" checkbox; incl — `sizes` (260 px) for Venn or `n`/`divs` for divisibility; numbers — kind segmented and `n`. Renderer `renderComb` (`:702`), with `binom` on `bigint` (`:127`). Presets (`:75`): `P(5, 3)`, `C(5, 3)`, `3²`, multisets, `C(49, 6)` lottery, BANANA, MISSISSIPPI; `(a + b)⁵`, Pascal's rule, hockey stick, Sierpiński parity, Fibonacci diagonals; four stars-and-bars; four inclusion–exclusion; Catalan `C₄`, `C₃`, derangements of 4, Stirling `n = 4`, partitions of 7.

#### ComplexDialog (`complex`)

`src/components/ComplexDialog.tsx`. Spec `CxSpec = { topic; z; w; op: "+"|"-"|"*"|"/"; n; a; b; c; t: string }` (`src/math/complex.ts:16`); topics `form | ops | powers | roots | quadratic | euler`, default `form`. Fields shown by topic (`src/components/ComplexDialog.tsx:100-113`): `z` on form/ops/powers/roots; `w` on ops; `n` as power or root count; `a, b, c` on quadratic; `t` (angle) on euler; `ops` adds a `Segmented` over `CX_OPS` with `OP_LABEL` (`+ − × ÷`, `:13`, `:114-116`). A row of symbol chips (`i π √( ∠ ° e^(i )`, `:12`) inserts at the caret of the last-focused field: the dialog tracks `focused` (`:31`) via `onFocus`, keeps input refs (`:30`), splices the symbol at `selectionStart..selectionEnd`, and on the next frame refocuses and places the caret after it (`insert`, `:42-52`). The chips use `onMouseDown={e => e.preventDefault()}` so clicking them never steals focus (`:119`). Renderer `renderComplex` (`src/math/complex.ts:529`), parsing with `parseCx` (`:55`) which accepts Cartesian, polar `r∠θ` and exponential forms. Presets (`:551`): form — `3 + 4i`, `−1 + i`, `−2 − 2√3 i`, `2∠150°`, `3i`, `−5`; ops — six including the quarter-turn `(1 + i) · i` and a conjugate product; powers — `i⁷`, `(1 + i)⁸`, `(1 + √3 i)⁶`, a spiral `(0.9 + 0.4i)¹²`, `(1 + i)⁻²`; roots — `∛8`, `⁴√(−16)`, `√i`, 6th and 5th roots of unity, `∛(−8i)`; quadratic — five; euler — `θ = π, π/3, π/2, 3π/4, 1 rad`.

#### GtDialog (`gt`)

`src/components/GtDialog.tsx`. Spec `GtSpec = { topic; edges: string; layout: auto | circle | shells; a; b; k }` (`src/math/graphtheory.ts:16`); topics `props | euler | hamilton | color | walks | spanning`, default `props`. The one topic dialog that **does not** use the `Tabs` widget (Formula, Graph and Geometry have no topics): its own tablist (`src/components/GtDialog.tsx:55-73`) copies the current `edges` and `layout` into the target topic's spec before switching, "so one graph can be studied from every side"; it therefore lacks the arrow-key handling of `Tabs`. Inputs: an `edges` row (edge list text), a `Segmented` over `GT_LAYOUTS` (`:91`), and on `walks` three fields `a` (from), `b` (to), `k` (length) (`:92-98`). Renderer `renderGt` (`:594`). Presets (`:86`): props — Petersen, `K₃,₃`, cube `Q₃`, a tree, `C₅`, two components; euler — Königsberg, the house of Nikolaus, `K₅`, octahedron; hamilton — dodecahedron, `Q₃`, Petersen (none), tree (none), `K₄,₃`; color — map-like, Petersen, wheel `W₆`, `K₅`, `C₇`, a crown graph that traps greedy colouring; walks — four counting problems; spanning — `C₄` + diagonal, `K₄` (16), `K₅` (125), `Q₃`, Petersen.

#### TacticsDialog (`tactics`)

`src/components/TacticsDialog.tsx`. Spec `TacticsSpec = { topic; n; p; h; mode: count | residues; nums; rows; cols; removed }` (`src/math/tactics.ts:19`); topics `symmetry | pigeonhole | tiling`, default `symmetry`. Memo depends on `[spec, t]` and passes `t.tacticsWords` (`src/components/TacticsDialog.tsx:27-33`). Inputs: symmetry — `n` (Gauss pairing of `1 + … + n`); pigeonhole — a `Segmented` over `PIGEON_MODES`, then `p`/`h` for `count` or a `nums` row plus a modulus `h` for `residues` (`:78-93`); tiling — `rows`, `cols`, and a `removed` row listing removed squares (`:94-102`). Renderer `renderTactics` (`:212`). Presets (`:224`): `1 + … + 10 / 6 / 16`; `10 pigeons, 9 holes`, `25 into 6`, `6 numbers mod 5`, `4 numbers mod 5`; opposite corners removed, two adjacent, same colour far apart, `4 × 4` one corner, `3 × 4` a corner cut off.

#### MentalDialog (`mental`)

`src/components/MentalDialog.tsx`. Spec `MentalSpec = { topic; a; b; c; base; op: CheckOp; sys: "en" | "ru"; words; method?: DivMethod }` (`src/math/mental.ts:24`); topics `multiply | divide | check | rules | recip | sqrt | cbrt | cube | magic | major` (`src/math/mental.ts:10-11`), default `multiply`. The initial specs depend on the UI language: for `ru` the `major` tab starts on its second preset, the БЦК (Russian) Major System table (`src/components/MentalDialog.tsx:24-25`). Inputs: multiply — `a`, `b`, `base` (Vedic base method, 90 px); divide — a 160 px dividend `a`, a 100 px divisor `b`, and a `Segmented` over `DIV_METHODS` (`base | flag | table`) labelled from `w.div.methods`, showing `spec.method ?? "base"` because the field is optional; check — `a`, `b`, `c` and a `Segmented` over `CHECK_OPS` labelled `+ − × ÷` (casting out nines); rules — one 180 px `a` labelled `f.number`; recip — one 90 px `a` with the literal label `n`; sqrt/cbrt — one 160 px `a`; cube/magic — a 70 px `a`; major — a `number` row, a `words` row, and a `Segmented` over `MAJOR_SYSTEMS` labelled from `w.major.sys` (`:84-126`). Renderer `renderMental` (`src/math/mental.ts:563`); `magicSquare` (`:448`) and `reciprocal` (`:933`) are exported. Presets (`:1017`): divide — `1 234 ÷ 89`, `21 015 ÷ 98`, `1 237 513 ÷ 996` near a base, `73 528 ÷ 47`, `8 384 ÷ 32`, `75 846 ÷ 523` by the flag, `27 483 624 ÷ 62` by the table; rules — `3 794`, `123 456`, `2 717`, `5 040`, `1 001`; recip — `1/7`, `1/13`, `1/17`, `1/12`, `1/16`, `1/41`; multiply — `7 × 8`, `97 × 94`, `88 × 88 (carry)`, `103 × 107`, `104 × 97 (mixed)`, `996 × 993`, `48 × 47, B = 50`; five check sums including a deliberately wrong one (`✗`) and a digit swap; five square roots, four cube roots, four cubes, magic squares `3 × 3`, `5 × 5`, `7 × 7`; `π` in Latin and in Russian consonant codes, `e`, `1789 · tack fob`.

#### AnalysisDialog (`analysis`)

`src/components/AnalysisDialog.tsx`. Spec union (`src/math/analysis.ts:38-44`): `SequenceSpec { expr; limit; eps: number; nMax: number }`, `LimitSpec { expr; a; limit; eps; zoom }`, `DerivativeSpec { expr; a; h: number; showDerivative: boolean }`, `RiemannSpec { expr; a; b; n: number; method: left | right | mid | trap | lower | upper }`, `SeriesSpec { expr; start: number; nMax: number; sum }`, `TaylorSpec { expr; a; order: number; xMin; xMax }`; topics in that order, default `sequence`. Unlike other tools, `ANALYSIS_PRESETS` holds bare specs, not `{ label, spec }` (`src/math/analysis.ts:72-122`), so the dialog derives chip labels with `presetLabel` (`src/components/AnalysisDialog.tsx:20-35`: `1/n → 0`, `x → 0: sin(x) / x`, `x^2, a = 1`, `x^2, x ∈ [0, 2]`, `Σ 1 / 2^n`, …) and initialises `specs` from `ANALYSIS_PRESETS[k][0]` directly (`:46`); its chips are `chip text mono` (`:97`). The expression row's prefix is `aₙ =` for sequence/series, `f(x) =` otherwise (`:104-107`). Per topic (`:109-175`): sequence — `L`, an ε slider on a log scale from 10⁻³ to 1 (the slider value is `log10(eps)`, written back as `10^v` to two significant figures, `:152-163`), a terms slider 5–120; limit — `a`, `L`, a `zoom` window, ε slider from 10⁻² to 2; derivative — `a`, a "show f′" checkbox, an `h` slider −2…2 that skips 0 (`:166`); riemann — `a`, `b`, `n` slider 1–100, a method `Segmented` labelled from `t.analysisWords.methods`; series — a numeric `start` 0–1000, a `sum` field with placeholder `?`, a terms slider 2–120; taylor — `a`, an `xMin…xMax` pair, an order slider 0–12. Expressions are mathjs syntax (`src/math/analysis.ts` imports `mathjs`). Renderer `renderAnalysis(spec, t.analysisWords)` (`:532`). The `Slider` component is defined at the bottom of this file (`:191-207`) and shared.

#### IntegralDialog (`integral`)

`src/components/IntegralDialog.tsx`. Spec union (`src/math/integration.ts:37-41`): `SubSpec { outer: power | exp | sin | cos | recip; c; a; m: number; b; n; lo; hi }` (the integrand is `c · x^(m−1) · outer(a·x^m + b)`), `PartsSpec { kind: exp | sin | cos | ln | expsin | expcos; n: number; a; b; lo; hi }`, `PartialSpec { num; den; lo; hi }`, `TrigSpec { form: asin | sqrtA | atan | asinh | acosh | x2sqrt; a; lo; hi }`; topics `sub | parts | partial | trig`, default `sub`. Local label tables render the kinds mathematically: `OUTER_LABELS` (`uⁿ eᵘ sin u cos u 1/u`), `PARTS_LABELS` (`xⁿ eᵃˣ … eᵃˣ cos bx`), `TRIG_LABELS` (`1 / √(a² − x²)` …) (`src/components/IntegralDialog.tsx:21-23`). `bounds` (`:65-70`) is a reusable pair of `from`/`to` fields with placeholder `—` (empty = indefinite). Per topic: sub — outer segmented, `c`, `a`, numeric `m` 1–6, `b`, `n` only for `power`, bounds; parts — kind segmented, numeric `n` 0–6 except for `expsin`/`expcos`, `a` except for `ln`, `b` for the exp-trig kinds, bounds; partial — numerator (200 px) and denominator (220 px), bounds; trig — form segmented, `a`, bounds. Renderer `renderIntegral(spec, t.intWords)` (`:849`). Presets (`:64`): six substitutions, eight by-parts (including `∫ ln x dx` and the cyclic `eˣ sin x`), six partial-fraction integrals (one improper, one completing the square), six trigonometric substitutions.

#### NtDialog (`nt`)

`src/components/NtDialog.tsx`. Spec union (`src/math/numtheory.ts:18-28`): `SieveSpec { n; step: number }`, `FactorSpec { n }`, `GcdSpec { mode: euclid | extended | diophantine; a; b; c }`, `ModSpec { op: clock | add | mul | power | inverse; a; k; m }`, `CrtSpec { mode: linear | system; a; b; m; system }`, `BaseSpec { n; from; to }`; topics `sieve | factor | gcd | mod | crt | bases`, default `sieve`. The sieve tab has a step slider over the sieving primes: `sievers = sievingPrimes(min(400, max(2, ⌊n⌋)))` (`src/components/NtDialog.tsx:58-59`, `src/math/numtheory.ts:239`), the slider runs 0…`sievers.length`, its `<output>` lists the primes applied so far, and dragging to the end stores the sentinel `99` meaning "finished" (`:100`). Other inputs: factor — `n` (160 px); gcd — mode segmented, `a`, `b`, and `c` for Diophantine; mod — op segmented, `a` unless the op is a full `add`/`mul` table, `k` for `power`, `m`; crt — mode segmented, then `a, b, m` for a linear congruence or a `system` row; bases — `n`, `from`, `to`. Renderer `renderNt` (`:841`). Presets (`:87`): sieves up to 50/100/200 at various steps; `360`, `84`, `28 (perfect)`, `1001`, `97`, `2¹⁶`, `600851475143`; Euclid on `252, 198`, `1071, 462`, Fibonacci `89, 55`, Bézout `240, 46`, three linear Diophantine equations (one impossible); clock `38 mod 12`, `−5 mod 7`, `×` tables mod 7 and 12, `+` table mod 6, `3²⁰⁰ mod 13`, `7¹²⁸ mod 100`, `17⁻¹ mod 43`, `4⁻¹ mod 10 (none)`; three CRT systems and three linear congruences; six base conversions including `7B₁₆ → base 3`.

#### LogicDialog (`logic`)

`src/components/LogicDialog.tsx`. Spec `LogicSpec = { topic; f; g; vals; tf: boolean; board?: BoardSpec; sw?: SwSpec }` (`src/math/logic.ts:14`); topics `table | equiv | nf | circuit | argument | strengthen | board | knights | sets` (`:12`), default `table`. `BoardSpec = { mode: bins | slots; places; pool; rules; ask; options }` (`src/math/logicPuzzles.ts:13`) and `SwSpec = { ask: strengthen | weaken; pattern: none | survey | causal | sample | analogy | plan | criterion; legend; premises; links; conclusion; options }` (`src/math/logicArgue.ts:17`) are nested sub-specs for the two "verbal reasoning" topics. Three symbol palettes (`src/components/LogicDialog.tsx:14-16`): propositional `¬ ∧ ∨ → ↔ ⊕ ↑ ↓ ( ) ⊤ ⊥`, set `∪ ∩ ∖ Δ ′ ( ) U ∅` for `sets`, and `′ + ( ) ⊕ m( d(` for normal forms (`nf`). The caret-insertion `insert` (`:113-124`) works like the complex dialog's, with one twist: when the focused field is `vals` (circuit inputs) the symbol goes into `f` instead (`:114`). Input fields are keyed `${topic}-${key}` (`:127`) so React remounts them per tab. Fields by topic (`:174-207`): `board` → `BoardFields` (`:19-45`: mode segmented whose label swaps between "places" and "slots", `places`, `pool`, a 4-row `rules` textarea, `ask`, a 3-row `options` textarea; falls back to `BOARD_PRESETS[0]` when `spec.board` is absent); `strengthen` → `SwFields` (`:48-84`: ask segmented, a `<select>` of patterns named from `t.logicWords.sw.patterns[p].name`, a 4-row `legend` textarea, `premises`, `links`, `conclusion`, a 4-row `options` textarea; falls back to `SW_PRESETS[0].spec.sw` when `spec.sw` is absent, `:50`); `knights` → a 4-row textarea in `f`; `argument` → `f` premises, `g` conclusion; `equiv` → `f`, `g` second formula; `sets` → `f`, `g` compare; `nf` → `f` function; `circuit` → `f`, `vals` inputs; `table` → `f`. Symbol chips are hidden on board/knights/strengthen (`:209`); a `Segmented` over `[true, false]` chooses T/F versus 1/0 for table/equiv/argument (`showTf`, `:143`, `:217-219`). Renderer `renderLogic(spec, t.logicWords)` (`src/math/logic.ts:1049`), which delegates to `renderBoard`, `renderKnights` (`src/math/logicPuzzles.ts:578`, `:697`) and `renderStrengthen` (`src/math/logicArgue.ts:188`). `LOGIC_PRESETS` (`src/math/logic.ts:983-1047`) splices in `SW_PRESETS`, `BOARD_PRESETS`, `KNIGHTS_PRESETS` (`:1036-1038`); `BOARD_PRESETS` itself spreads in a separate `NAEC_BOARDS` table (`src/math/logicPuzzles.ts:785`, spread at `:863`). Presets: table — `p → q`, modus ponens as a tautology, `p ∨ ¬p`, `p ∧ ¬p`, `(p ∨ q) ∧ ¬r`, XOR, a NAEC 2025 contradiction; equiv — De Morgan, contrapositive, converse (not equal), implication as disjunction, distributive, exportation, NAEC 2025 · 1; nf — six Karnaugh/minterm examples; circuit — half-adder sum, majority, multiplexer, De Morgan, full-adder carry, NOT from NAND; argument — eight classical forms and five NAEC 2025 items; strengthen — four; board — nine (seven NAEC 2025, a race, committees); knights — six; sets — six Venn identities. ("NAEC" is Georgia's national exam.)

#### OdeDialog (`ode`)

`src/components/OdeDialog.tsx`. Spec union (`src/math/ode.ts:14-21`): `FieldSpec { expr; points; xMin; xMax; yMin; yMax }`, `EulerSpec { expr; x0; y0; h: number; steps: number }`, `FirstSpec { kind: growth | affine | logistic | linear; k; A; K; p; b; c; y0; tMax }`, `SecondSpec { a; b; c; F; w; y0; v0; tMax }`, `PhaseSpec { f; g; points; xMin; xMax; yMin; yMax }`; topics `field | euler | first | second | phase`, default `field`. `FIRST_LABELS` (`src/components/OdeDialog.tsx:12`) names the kinds by their equation (`y′ = ky`, `y′ = k(y − A)`, `y′ = ry(1 − y/K)`, `y′ + py = b·eᶜᵗ`). Helpers: `text`, `range(label, lo, hi)` (an `a … b` pair, `:51-60`), `exprRow(prefix, key)` (`:61-66`). Per topic: field — `dy/dx =` row, starting `points` (220 px), x and y ranges; euler — `dy/dx =`, `x₀`, `y₀`, an `h` slider 0.01–1 and a steps slider 1–100; first — kind segmented, then `k` (growth/affine), `A` (affine), `r` and `K` (logistic, with `r` stored in `k`), `p`, `b`, `c` (linear), always `y(0)` and `tMax`; second — a hint `a·y″ + b·y′ + c·y = F·cos(ωt)` and eight 60 px fields; phase — `x′ =` and `y′ =` rows, points, ranges. Renderer `renderOde(spec, t.odeWords)` (`:646`); `PhaseType` (`:26`) classifies the fixed point. Presets (`:50`): six slope fields, four Euler runs, six first-order models (growth, decay, Newton cooling, logistic, two linear), six second-order (harmonic, damped, critically damped, overdamped, forced, resonance), six phase portraits (saddle, spiral sink, centre, stable node, predator–prey, damped pendulum).

#### StatsDialog (`statistics`)

`src/components/StatsDialog.tsx`. Spec union (`src/math/statistics.ts:41-47`): `DataSpec { values; chart: dot | hist; bins: number }`, `ScatterSpec { points; line; residuals }`, `ChanceSpec { experiment: coin | die | twoDice; trials: number; seed }`, `TreeSpec { pA; pBA; pBnotA; nameA; nameB }`, `DistSpec { kind: binomial | poisson | normal; n: number; p; lambda; mu; sigma; lo; hi }`, `CltSpec { source: die | coin | skewed; n; samples; seed }`; topics `data | scatter | chance | tree | dist | clt`, default `data`. Presets are bare specs with an extra dialog-only `names` key on trees (`src/math/statistics.ts:93-136`); `strip` (`src/components/StatsDialog.tsx:229-232`) removes it before storing, and the initial tree spec gets `nameA`/`nameB` from `t.treeNames.marbles` (`:34`). Chip labels are built by `presetLabel` (`:48-66`): data and scatter from `t.statPresetNames`, chance as `experiment × trials`, trees from `t.treeNames[names].label`, distributions as `B(10, 0.5): P(3 ≤ X ≤ 6)` etc., CLT as `source, n = …`. `applyPreset` (`:68-76`) also localises tree names; the chips are plain `chip text` like Inf's (`:115`). Per topic: data — a 2-row `values` textarea, dot/histogram segmented, `bins` 0–30 for histograms; scatter — `points` textarea, "show line" and "show residuals" checkboxes; chance — experiment segmented, a trials slider on a log scale 10…10 000 (`:163-171`), a 🎲 new-seed button; tree — `P(A)`, `P(B | A)`, `P(B | A′)`, two name fields with placeholders `A`/`B`; dist — kind segmented, `n` slider 1–60 for binomial, `p` / `λ` / `μ, σ`, `lo`/`hi` with placeholders `−∞`/`∞`; clt — source segmented, sample-size slider 1–50, samples slider 100–5000 by 100, new seed. Renderer `renderStatistics(spec, t.statWords)` (`:641`).

#### TrigDialog (`trig`)

`src/components/TrigDialog.tsx`. Spec union (`src/math/trig.ts:18-45`): `CircleSpec { angle: number; unit: deg | rad }`, `CompassSpec { angle; unit; n; e; s; w; quads?: neighbours | images; ne?; nw?; sw?; se? }`, `RightSpec { given: oppAdj | oppHyp | adjHyp | angOpp | angAdj | angHyp; opp; adj; hyp; ang }`, `TriangleSpec { kase: SSS | SAS | ASA | AAS | SSA; a; b; c; A; B; C }`, `GraphSpec { fn: sin | cos | tan; A; B; C; D; unit }`, `EquationSpec { fn; k; unit }`; topics `circle | compass | right | triangle | graph | equation`, default `circle`. Lookup tables (`src/components/TrigDialog.tsx:24-26`) map each `given` to its label (`a, b` … `θ, c`) and field keys, and each triangle case to the three fields it needs (`SAS → b, c, A`). `unitToggle` (`:67`) is a degrees/radians `Segmented`; `sideLabel` (`:68`) names sides `a (opposite)` etc. Per topic: circle — unit toggle and an angle slider −360…720 shown with `°`; compass — the same plus four cue texts for N/E/S/W (placeholders from `t.trigWords.compass.cues`), a `quads` segmented (neighbours/images, defaulting to `neighbours` when a stored spec lacks it, `:129`), and when `images` four more texts NW/NE/SW/SE with placeholders from `t.trigWords.compass.images` (`:106-148`, `:139`); right — given segmented and the two fields it implies; triangle — case segmented and its three fields (angles labelled with `(°)`); graph — fn segmented, a hint `y = A·fn(B(x − C)) + D`, `A B C D`, unit; equation — `fn x = k` segmented, `k` (140 px), unit. Renderer `renderTrig(spec, t.trigWords)` (`:819`). Presets (`:90`): circle angles `30° 135° 210° 300° 5π/6 −45°`; compass seven (two with images); right four; triangle `SSS 7, 8, 9`, SAS, ASA, SSA with two triangles, SSA with none; six graphs; `sin x = 1/2`, `cos x = −√3/2`, `tan x = 1`, `sin x = 0.3`, `cos x = 2` (no solution).

#### AlgoDialog (`algo`)

`src/components/AlgoDialog.tsx`. Spec union (`src/math/algo.ts:34-52`), every member with an optional `step?: number`: `SortSpec { algo: bubble | insertion | selection | merge | quick | heap | shell | counting; data; view?: cells | bars }`, `SearchSpec { algo: binary | linear | twoptr | window; data; target }`, `GraphSpec { algo: bfs | dfs | dijkstra | bellman | floyd | prim | kruskal | unionfind | topo; edges; directed; start }`, `TreeSpec { kind: bst | avl | minheap | maxheap; data }`, `DsSpec { kind: stack | queue | chaining | probing; ops; m }`, `DpSpec { problem: lcs | edit | knapsack | coins; a; b; c }`, `GrowthSpec { mode: master | compare; a; b; d; n }`, `RecurSpec { problem: fib | fact | hanoi | queens | subsets; n; memo; data; target }`, `StringSpec { algo: naive | kmp | rk; text; pattern }`; topics `sort | search | graph | tree | ds | dp | recur | string | growth`, default `sort`. `renderAlgo` returns `RenderedSvg & { steps: number }` (`src/math/algo.ts:328`): the number of trace steps for the current input. The dialog's `set` always resets `step` to `undefined` (`src/components/AlgoDialog.tsx:43`) so a changed input shows the whole trace again; `shown = min(spec.step ?? steps, steps)` (`:53`) drives a range input 0…`steps` (`:222-239`), shown only when the trace has at least one step (`steps > 0`, `:222`; `growth` renders without a step counter, so it never shows the slider), and dragging it to the end stores `undefined` rather than the count. Per topic: sort — algorithm segmented (labels `w.sortNames`), a `data` row, a cells/bars view segmented; search — algorithm, data, and a `target` field whose label changes to "sum" for two pointers and "window" for sliding window; graph — algorithm segmented whose handler also forces `directed: true` when `topo` is picked (`:122`), an `edges` row, a `start` field hidden for `topo|kruskal|floyd|unionfind`, a directed checkbox; tree — kind and data; ds — kind, an `ops` row labelled "operations" for stack/queue and "keys" for hashing, and table size `m` for chaining/probing; dp — problem segmented, then `X`/`Y` strings (LCS, edit), weights/values/capacity (knapsack), coins/amount; recur — problem, then numbers/goal for subset sum or `n` plus a memo checkbox for Fibonacci; string — algorithm, text, pattern; growth — mode, then `T(n) = a·T(n/b) + Θ(nᵈ)` with `a b d` or a single `n`. Presets (`src/math/algo.ts:190`): ten sorts (one nearly sorted, one in bars), five searches, ten graph runs (Bellman–Ford with a negative edge and with a negative cycle), six trees, four structures, five DP, seven recursions (`4 queens`, `8 queens`), four string matches, four master-theorem recurrences (merge sort, binary search, Karatsuba, `2T(n/2) + n²`) and one growth-rate comparison (`:259-263`).

#### MatrixDialog (`matrix`)

`src/components/MatrixDialog.tsx`. Three unrelated specs under one tool, united as `MatrixSpec = MatrixCalcSpec | TransformSpec | SpaceSpec` (`src/components/MatrixDialog.tsx:11`), discriminated by `type`, and the tab key is that `type` (`calc | transform | space`, `:22`). Unlike the template, each tab has its **own** `useState` (`:23-25`), seeded from `initial` only when the type matches, else from `DEFAULT_MATRIX` (`src/math/matrix.ts:257-264`: `A·B` of two 2×2 matrices, `k = 3`, steps on), `DEFAULT_TRANSFORM` (`src/math/transform.ts:14`: `[2, 1, 1, 2]`) or `DEFAULT_SPACE` (`src/math/vectorspace.ts:502`: the span of the second preset, `ℝ³: 3 vectors in a plane`, with steps on). Tabs are shown only when not editing (`:50-52`), as in the template, and the title is `t.editMatrix`/`t.matrices` (`:39`). The memo (`:28-35`) renders `renderSpace(spec, t.spaceWords)` for spaces, `latexToSvg(matrixLatex(spec))` for calculations (the whole picture is one MathJax formula) and `transformToSvg(spec)` for transformations; a thrown `MatrixError` (`src/math/matrix.ts:28-35`) carries an i18n key (`empty | invalid | sameSize | mulSize | square | solveSize | notBasis`) that is looked up in `t.matrixErrors`, so matrix errors are translated while other errors show raw.

`MatrixCalcSpec = { type: "calc"; op: add | sub | mul | scalar | transpose | det | inverse | solve; A: string[][]; B: string[][]; k: string; steps: boolean }` (`src/math/matrix.ts:18-25`). `CalcControls` (`:76-102`) shows a `Segmented` of ops labelled `A + B`, `A − B`, `A · B`, `k · A`, `Aᵀ`, `det A`, `A⁻¹`, `Ax = b` (`OP_LABELS`, `src/math/matrix.ts:7-16`), a hint for `solve`, a `MatrixEditor` for `A` (augmented when solving), one for `B` when `needsB(op)` (add/sub/mul), a `k` field for scalar, a cell-syntax hint and a "show steps" checkbox (Gauss–Jordan steps come from `gaussJordan`/`stepLines`, `src/math/matrix.ts:88-137`). `MatrixEditor` (`:104-143`) is a grid of `matrix-cell` inputs (`inputMode="decimal"`, `aria-label` like `A12`, select-all on focus) with two `Stepper`s (`:145-159`) for rows and columns, 1…`MAX = 4` (`:13`); an augmented editor allows 2…5 columns and styles the last as `rhs`. `resize` preserves existing cells and fills new ones with `"0"`.

`TransformSpec = { type: "transform"; m: [a, b, c, d]; t: number; grid; shape }` (`src/math/transform.ts:6-12`). `TransformControls` (`:161-224`) keeps a parallel `text` state for the four entries so `-` and `0.` can be typed; only finite numbers are written into `spec.m` (`:165-171`). Preset chips (`TRANSFORM_PRESETS`, `src/math/transform.ts:16-25`: identity, scale, stretch, rotate90, rotate45, shear, reflect, project; labels from `t.transformPresets`) set the matrix and `t = 1`. An "animate" range 0…1 interpolates from the identity; checkboxes toggle the grid and the unit shape.

`SpaceSpec = { type: "space"; op: span | subspaces | coords | gram | eigen; A: string[][]; w: string[]; steps }` (`src/math/vectorspace.ts:20`). `SpaceControls` (`:226-277`) shows the op `Segmented` labelled `span{v₁, …, vₖ}`, `C(A), N(A), R(A)`, `[w]_B`, `Gram–Schmidt`, `Av = λv` (`SPACE_LABELS`, `:11-17`), the op's hint from `t.spaceHints`, the presets filtered to that op (`SPACE_PRESETS`, `:37-50`, twelve in all: independent/planar/collinear spans, a rank-2 3×4, two coordinate problems, two Gram–Schmidt, four eigenproblems including a non-diagonalisable and a rotation with complex λ; a chip sets `A` and, where the preset has one, `w`, `:239`), a `MatrixEditor` whose displayed name is `B` for coords, `v` for span/gram, `A` otherwise, a one-column `w` editor for coords (padded to the row count, `:230`), and the steps checkbox except for `eigen` and `gram`.

#### GraphDialog (`graph`)

`src/components/GraphDialog.tsx`. Spec `PlotSpec = { functions: { expr; color }[]; xMin; xMax; yMin: number | null; yMax: number | null; grid }` (`src/math/plot.ts:7-14`); no topics and no `start` prop. State starts from `initial ?? DEFAULT_PLOT` (`src/components/GraphDialog.tsx:26`; `src/math/plot.ts:18-25`: one function `sin(x)` in the first palette colour, x from −10 to 10, y auto, grid on). State (`src/components/GraphDialog.tsx:27-36`): `fns`, a text `range` object (so `-` survives typing; `num` at `:18` parses, empty → `null` = auto for y, and `xMin`/`xMax` default to −10/10 when invalid at `:41-42`), `grid`, and `focusIdx` for autofocus of a newly added row. `errors = fns.map(exprError)` (`:38`), where `exprError` (`:8-16`) compiles with `compileExpr` (`src/math/plot.ts:33-37`: mathjs `compile` after stripping a leading `y =`, then an evaluation at `x = 1.2345` to surface undefined symbols early) and returns its message. The memo is keyed on `JSON.stringify(spec)` and `t` because `spec` is rebuilt every render (`:48-57`); it short-circuits to `t.invalidExpression` if any row is invalid, else `plotToSvg(spec)`, which also throws when `xMax ≤ xMin` (`src/math/plot.ts:50`). Each function row (`:83-102`) has a coloured `y =` prefix, an input that gets the `invalid` class and the error as `title`, a `ColorSwatches` over `PLOT_COLORS` (six, `src/math/plot.ts:16`), and a remove button when more than one row exists. "+ add function" (`:103-113`) is allowed up to six and picks `nextColor` (`:62`), the first palette colour not in use. Ranges are two text pairs (y placeholders `t.auto`) and a grid checkbox (`:117-138`). Insert is disabled unless rendered and at least one expression is non-blank; the submitted spec drops blank rows (`:73-74`). mathjs is imported statically by `plot.ts` (and by `analysis`, `integration`, `trig`, `complex`, `ode`, `liveGraph`), so it ships in the chunks of those tools, not in the board's initial bundle.

#### FormulaDialog (`formula`)

`src/components/FormulaDialog.tsx`. Spec `FormulaData = { tex: string; color: string }` (`:7`); no topics. State: `tex` (default `EXAMPLE_TEX`, the quadratic formula, `:37`) and `color` (default `#1e1e1e`). The memo (`:49-56`) returns `{ error: "" }` for blank input (disabling Insert with no message) and otherwise `latexToSvg(tex, color)`, so MathJax's own error text is displayed. Twenty-four snippet chips (`SNIPPETS`, `:10-35`) insert TeX at the textarea caret; `|` in a snippet marks where the caret lands (`insertSnippet`, `:58-68`): `\frac{|}{}`, `\sqrt{|}`, `\sqrt[|]{}`, `^{|}`, `_{|}`, `\sum_{i=1}^{n} |`, `\int_{a}^{b} | \,dx`, `\lim_{x \to |}`, `\left( | \right)`, Greek letters, relations, `\sin`, `\log_{|}`, `\begin{cases}`, `\begin{pmatrix}`; each chip's `title` shows the TeX without the marker. The textarea is `autoFocus` (so `Modal` leaves focus there) and **Ctrl/Cmd+Enter submits** (`:102-104`). The preview `<img>` uses the TeX as `alt` (`:115`). Colour comes from `ColorSwatches` with the default `INK_COLORS`.

#### GeometryDialog (`geometry`)

`src/components/GeometryDialog.tsx`: the only dialog whose preview is itself the editor. Spec `GeometrySpec` (`src/math/geometry.ts:15-31`): `type: "geometry"`, `shape: triangle | quad | circle | pythagoras | angles | protractor | symmetry`, `pts: Pt[]` (meaning depends on shape: triangle `A B C`, circle `O P`, pythagoras `C A B` with the right angle at `C`, symmetry `[M, N, …polygon]` except `lines` mode which is just the polygon), booleans `lengths`, `angles`, `area`, `grid`, `snap`, and optional `caption` (classification text stored at insert time), `mode: line | point | vertical | parallel` (angles), `hide` (protractor reading), `sym: reflect | lines | practice`, `guess: Pt[]` and `reveal` (practice), `factNames` (the three angle-fact names in the UI language). No tabs; the shape is a `radiogroup` of `GEO_SHAPES` (`src/components/GeometryDialog.tsx:160-175`), and switching loads that shape's first preset while keeping the five display flags. Presets for the current shape (`GEO_PRESETS`, `src/math/geometry.ts:778-806`, 27 keyed specs: three triangles, six quadrilaterals, a circle, two Pythagoras, four angle modes, two protractors, three reflections, five line-symmetry shapes, one practice) appear as chips labelled from `t.geoPresets` when there is more than one (`:176-191`), with the active one marked by `presetActive` (`:129`). Picking a chip copies the preset's `pts`, `mode`, `sym` and `guess` and clears `reveal` and the practice verdict (`:183-184`). Under the plane a hint line (`:130-133`, `:220`) shows `t.angleHints[mode]`, `t.symHints[sym]` or `t.geoDragHint[shape]`; handle titles use `pointNames` (`:128`, `src/math/geometry.ts:33-47`: `A B C`, `O P`, `C A B`, `O A B` for protractors, `M N A B …` for symmetry).

State: `spec` (from `initial ?? DEFAULT_GEOMETRY`, the first triangle preset, `src/math/geometry.ts:808`), `active` handle id, `checked` (practice verdicts), an `overlay` SVG ref and a `latest` ref mirroring `spec` for the pointer handlers (`:69-74`). `view` (`:77`) is the spec plus localised `factNames`; `m = measure(view)` (`:78`, `src/math/geometry.ts:138`) yields readout lines, classification keys and symmetry counts, and `caption` (`:79-81`) is the joined class names (or "lines: n · order: k" for symmetry). The plane (`:193-219`) is two stacked SVGs sized `PLANE_PX` (16×12 units at 36 px + 14 px padding, `src/math/geometry.ts:54-55`): the picture from `planeSvg(view)` via `dangerouslySetInnerHTML`, and an overlay with a 16 px invisible hit circle plus a 9 px handle per point, each with a `<title>` naming the point and its coordinates. `startDrag` (`:86-125`) attaches `pointermove`/`pointerup`/`pointercancel` on `window` synchronously on pointerdown so fast drags are not lost, converts the pointer to plane units through `getScreenCTM().inverse()` and `fromPx`, snaps to 1 unit (or 0.1 without snap; protractors always 0.1), clamps to the plane, and calls `movePoint` (`:29-61`), which encodes per-shape constraints: in `pythagoras` dragging `C` moves the whole triangle while `A` stays on `C`'s row and `B` on its column; in `protractor` the centre moves everything and the arms keep length while snapping to 1° or 5°; in `angles` the vertex carries its rays (except in `parallel` mode, where it is an ordinary point, `:48`), parallel lines must stay apart and rays may not coincide; in `symmetry` (other than `lines` mode, `:55`) the mirror's two points may not coincide. Moves that `fitsPlane` rejects are dropped (`:110`). Practice mode (`sym === "practice"`) adds draggable guess handles (`:206-217`), a Check button that compares each guess with `reflectPt` within 0.05 (`:135-144`), a verdict line and a "reveal" checkbox (`:221-234`). The readout (`:236-242`) shows the caption, the measured lines (only the first two for a triangle unless `area` is on) and the coordinates (not for protractors). Checkboxes (`:244-277`): angles (triangle/quad), lengths (triangle/quad/circle/pythagoras), height/area (triangle), hide answer (protractor), grid, snap (labelled "5°" for protractors). Insert is never disabled; it calls `renderGeometry({ ...view, caption })` inline (`:154`) and stores the caption so the board picture carries the classification in the language it was made in.

#### ModelDialog (`model`)

`src/components/ModelDialog.tsx`. Spec `ModelSpec` is a nine-way union on `type` (`src/math/models.ts:25`): `BarModelSpec { rows: { label; segments; total }[]; grandTotal; showNumbers }`, `FractionSpec { rows: { n; d }[]; shape: bar | circle; unitLabels }`, `PercentSpec { percent: number; of: number | null; style: grid | bar }`, `BondSpec { whole; parts: string[] }`, `PlaceValueSpec { h; t; o; showTotal; labels? }` (`src/math/placeValue.ts:11-18`), `MultiplySpec { style: groups | array | numberline | area | lattice; a; b; step }` (`src/math/multiply.ts:9`), `DivisionSpec { style: bracket | corner | short; a; b; decimals; step }` (`src/math/division.ts:13`), `FracOpSpec { op: + | - | × | ÷; a; b; step }` (`src/math/fracop.ts:11`), `PercRatioSpec { kind: PercentKind | RatioKind; p; a; b; ratio; up; step }` (`src/math/percratio.ts:23`). Tabs are `TYPES` (`src/components/ModelDialog.tsx:27`) labelled by a hand-built `tabLabel` (`:50`); default `bar`. `specs` starts as `DEFAULT_MODELS` (`src/math/models.ts:401-412`) overlaid with `initial` (`:38`). The memo (`:42-48`) swallows any error into the single message `t.invalidParts`. Presets are keyed and labelled from `t.presets[key]` (`:72-76`; keys at `src/math/models.ts:413-517`: `partWhole comparison units fractionOfSet`, `single equivalent compare improper`, `percentOf hundredGrid discount`, `bond10 bondThree bondFraction`, `pvEmpty pv234 pvRegroup pvBorrow`, eight `mul*`, eight `div*`, eight `fo*`, thirteen `pr*`) and are `structuredClone`d on pick so a preset's nested rows are never mutated. The preview is hidden for `placeValue` (`:90-101`) because `PlaceValueMat` is itself the live picture.

Editors: `BarEditor` (`:111-162`) — up to five rows of label/segments/total with a colour `Dot` (`MODEL_COLORS`, `:106-109`), a grand total and a "show numbers" checkbox; segments syntax (`25, 15, 40=?`) is parsed by `parseSegments` (`src/math/models.ts:100`). `FractionEditor` (`:164-214`) — up to six `n/d` pairs (the `+` button duplicates the last row, `:199`) with `n` clamped to `0…3d` and `d` to `1…24` (`clampInt`, `:28`), a bar/circle `Segmented`, a unit-labels checkbox. `PercentEditor` (`:382-423`) — a 0–100 range and a number input bound to the same `percent`, an optional `of` quantity (empty → `null`), bar/grid style. `BondEditor` (`:425-458`) — `whole` and 2–4 `parts` (`?` for the unknown). `MultiplyEditor` (`:216-255`) — style `Segmented`, `a × b = product` with limits from `MULTIPLY_LIMITS[style]` (`src/math/multiply.ts:11`), a per-style hint, and a step slider 0…`stepCount(spec)`; any change stores `step: 999` (= show all), and dragging to the end stores 999 again. `DivisionEditor` (`:344-380`) — style, `a` (≤ 99 999 999), `b` (1…9 999), decimals (≤ 10), the sign `:` for the "corner" style, step slider over `divisionStepCount`. `FracOpEditor` (`:310-342`) — op `Segmented` (`−` displayed for `-`), two fraction strings, hint, step slider over `fracOpStepCount`. `PercRatioEditor` (`:257-308`) — two `Segmented` groups (`PERCENT_KINDS`: of, whatPercent, reverse, change, percentChange, reverseChange, interest; `RATIO_KINDS`: simplify, share, partKnown, proportion), the fields that `t.prFields[kind]` names among `ratio p a b` (ratio 150 px), an up/down radio for change kinds, a hint, and a step slider over `percRatioStepCount`. `PlaceValueMat` (`src/components/PlaceValueMat.tsx`) handles the `placeValue` tab with pointer-event drag of hundreds/tens/ones blocks between a tray and three columns, trading 10 ↔ 1 across neighbouring columns, a "challenge" mode and column caps `PV_CAP` (`src/math/placeValue.ts:9`); a tap on a tray block adds one to its column (`src/components/PlaceValueMat.tsx:78-82`), dragging off the mat removes one, and every change is committed with `labels` set to the column titles in the UI language (`:43-50`), which is why `PlaceValueSpec` carries `labels?`.

#### ThreeDialog (`3d`)

`src/components/ThreeDialog.tsx`, a `default` export (`:32`), the one `png: true` tool. Spec `Spec3D = SolidSpec | CubesSpec | Transform3DSpec` (`src/three/spec.ts:51`): `SolidSpec { shape: cuboid | prism | pyramid | cylinder | cone | sphere; a; b; c; sides?; unit; unfold: number; seeThrough; labels; formulas; view? }`, `CubesSpec { mode: cuboid | stacks; a; b; c; heights: number[][]; formulas; view? }`, `Transform3DSpec { m: number[9]; t; grid; formulas; view? }`; `View = { azimuth; polar; zoom }` (`:4-5`). Like the matrix dialog, each tab has its own state seeded from `initial` when the type matches (`src/components/ThreeDialog.tsx:39-43`); the tab key is the `type`, default `solid`. The defaults are `DEFAULT_SOLID` (a 4 × 3 × 2 cm cuboid with labels and formulas on, `src/three/spec.ts:92-101`), `DEFAULT_CUBES` (`:103-115`) and `DEFAULT_TRANSFORM3D` (the `mixed` preset matrix, `:53-59`); `DEFAULT_VIEW` is azimuth π/5, polar 1.1, zoom 1 (`:5`).

The viewer is a `Viewer` instance (`src/three/viewer.ts`) created once on mount in a `useEffect` with an empty dependency list (`:48-59`), shown the opening spec and `initial?.view ?? DEFAULT_VIEW`, and disposed on unmount; a second effect calls `viewer.current?.show(spec)` on every spec change (`:61-63`). `Viewer` wraps a `WebGLRenderer` with `preserveDrawingBuffer: true` (needed for snapshots), an ambient light and an orthographic camera carrying a directional light so facing faces are always lit, `OrbitControls` without pan and with zoom limits 0.3–5, and a `ResizeObserver` sizing the canvas to the host width (at least 200 px) × 0.62 (`src/three/viewer.ts:20-56`). `show` (`:69-86`) rebuilds the scene with `build3D`, disposes the old group, and refits the camera distance to the content's bounding sphere while keeping the viewing direction. `setView`/`getView` (`:88-99`) convert between spherical coordinates and the controls. `snapshot(caption, matrix?)` (`:106-183`) copies the canvas, scans the alpha channel to crop to the drawn content, then draws it onto a new canvas with the caption lines underneath and, for transformations, a bracketed `M = (…)` block whose columns are coloured green/red/blue (`BASIS_COLORS`, `src/components/ThreeDialog.tsx:24`); it returns `{ dataURL: png, width, height }` in CSS pixels (divided by the device pixel ratio). three.js is imported statically only by `src/three/viewer.ts` and `src/three/build.ts`, so it lives in this dialog's lazy chunk.

The footer's Insert is never disabled (`:93`); `insert` (`:67-75`) stores the current camera view in the spec and submits `v.snapshot(caption, matrix)`, where `caption = captionLines(spec, t.cubes)` when `formulas` is on (`src/three/spec.ts:126`: `det M` and `V = |det M|` for transformations, `V = a × b × c = n cubes` or a stack count for cubes, surface/volume formulas for solids, plus the slant height and the net's sector angle `θ = 360° · r / l` for a cone, `:164-171`) and `matrix` holds the interpolated `(1 − t)·I + t·M` entries formatted to two decimals with a true minus sign (`fmtEntry`, `:25`). Under the viewer, a "top view" button sets `{ azimuth: 0, polar: 0.0001, zoom: 1 }` and "reset view" sets `DEFAULT_VIEW` (`:110-113`). The caption lines are also shown under the viewer in the dialog (`:116-122`), next to a rotate hint (`:108`).

`SolidControls` (`:128-220`) — a shape `radiogroup` whose change applies `SOLID_DEFAULT_DIMS[shape]` and closes the net; dimension inputs chosen per shape (length/width/height for cuboids, base side and height for prisms and pyramids, radius for spheres, radius and height otherwise), each an **uncontrolled** `defaultValue` input keyed by `shape-key` so a half-typed value is not clamped mid-edit (`:168-169`; `num` at `:27-30` clamps 0.5–20 and falls back to the old value); `sides` 3–8 for prisms; a `unit` string truncated to six characters; an unfold slider for every shape but the sphere (`canUnfold`, `src/three/spec.ts:117`); see-through, labels, formulas checkboxes. `CubesControls` (`:222-286`) — cuboid/stacks `Segmented`; cuboid mode has `a b c` 1–8; stacks mode is a grid of buttons showing each stack's height, click adds one, Shift-click or right-click removes one, wrapping modulo 9 (`bump`, `:230-231`), with rows/columns 1–6 resizing while keeping existing heights. `Transform3DControls` (`:288-350`) — eight presets (`TRANSFORM3D_PRESETS`: identity, scale, stretchZ, rotateZ, shear, reflect, project, mixed; labels from `t.transform3dPresets`), a 3×3 grid of text-backed cells coloured by column (`col-i/j/k`), an animate range, grid and formulas checkboxes.

#### What is deliberately uniform, and what is not

Across the 26 template dialogs the only variations are: the words object passed (`t.xWords`), whether the memo depends on `w` or on the whole `t`, the set of per-topic inputs, and three local conveniences — caret insertion of symbols (Complex, Logic, Formula), log-scale sliders that store the real value (Analysis ε, Stats trials), and "pick a kind by loading its first preset" (App, Inf), plus the per-dialog one-offs noted above (Gt's graph-carrying tab bar, Algo's step slider that resets on every edit, Nt's sieve slider with its `99` sentinel, Mental's language-dependent start, and the chip labels Analysis and Stats compute because their presets are bare specs). The six non-template dialogs each break the pattern for a reason: Formula and Graph predate topics and have free-form input; Geometry edits by dragging; Matrix and 3D hold three unrelated spec types and so keep three independent states; Model nests nine editors and defers one tab's picture to an interactive mat. Everything the board needs from any of them is the same two values: a JSON spec small enough to live in `customData`, and a picture with its natural size.


## 6. Live pieces, the 3D viewer, shapes and the drawing primitives

Two kinds of maths object sit on a Zeno board besides ordinary Excalidraw strokes. **Live pieces** are Excalidraw embeddable elements that the board renders itself in React, with their state in `customData`. **Pictures** (graphs, 3D snapshots, frozen copies of live pieces) are Excalidraw image elements whose file is an SVG or PNG data URL and whose `customData` holds the spec that produced them. This section covers the live pieces (`src/live/`, `src/math/live.ts`, `src/math/liveGraph.ts`), the three.js side (`src/three/`, `src/components/ThreeDialog.tsx`), the ready-made shapes (`src/math/shapes.ts`, `src/components/ShapesPanel.tsx`), and the SVG primitives everything else draws with (`src/math/svg.ts`, `chart.ts`, `plot.ts`, `scale.ts`, `transform.ts`).

### src/live/element.ts — the element encoding

The header comment states the design: "Live pieces are Excalidraw "embeddables" (the element Excalidraw uses for videos and web pages) pointing at an address of our own that never loads anything: the board draws them itself, in React, and keeps their state in the element's customData, so they are saved, copied, undone and deleted like any other element." (`src/live/element.ts:1-3`).

#### `LIVE_LINK`
`"https://live.zeno.invalid/"` (`src/live/element.ts:9`). The comment: ".invalid is reserved and never resolves, so the address can't lead anywhere if a board is opened elsewhere." A piece's `link` is `LIVE_LINK + kind`, so a board opened in stock Excalidraw shows a dead iframe rather than fetching anything.

#### `LiveData<K>`
`{ live: K; state: LiveStates[K] }` (`:11`). This is the exact shape of `element.customData`. The kind is stored twice: in the link suffix (for Excalidraw's validation path, which only sees the link) and in `customData.live` (what the renderer trusts).

#### `isLiveLink(link)`
True when `link` is a string starting with `LIVE_LINK` (`:13`).

#### `liveDataOf(el)`
Returns `el.customData` as `LiveData` only when the link is live, `customData.live` is a known kind (`isLiveKind`), and `customData.state` is a non-null object (`:15-18`). Anything else is `undefined`; the board treats that as a damaged piece and renders an empty `<div/>` (see the bridge below).

#### `liveElement(kind, x = 0, y = 0)`
Builds a fresh piece (`:21-28`). It asks `convertToExcalidrawElements` for a `rectangle` at `(x, y)` with the kind's design size from `LIVE_SIZES`, stroke `#ced4da`, transparent background, `strokeWidth: 1`, `roughness: 0`, `roundness: { type: 3 }` (Excalidraw's adaptive radius). Then it overrides `type: "embeddable"`, sets `link` and `customData: { live: kind, state: initialLive(kind) }`, and casts. Using the rectangle conversion rather than an embeddable skeleton gets all the element bookkeeping (id, seed, version, bounds) for free; only the three fields differ.

### src/math/live.ts — the arithmetic of the pieces

"Kept free of React and Excalidraw so it can be tested on its own." (`src/math/live.ts:3`).

#### Clock (`:5-38`)
- `wrapDay(m)`: rounds and wraps to 0..1439 (`:8`).
- `handAngles(minutes)`: `m = minutes mod 720` (12-hour face); hour hand `m / 2` degrees (720 min → 360°, so the hour hand creeps between hours), minute hand `(m % 60) * 6` (`:11-14`). Angles are clockwise from twelve.
- `turn(from, to)`: smallest signed turn in (−180, 180], via `(((to − from) % 360) + 540) % 360 − 180`, with the −180 edge case mapped to 180 (`:17-20`).
- `dragHand(minutes, hand, angle)`: the geared drag. It takes the current angle of the dragged hand, the smallest turn to the pointer's angle, and converts degrees to minutes: a minute-hand degree is 1/6 min, an hour-hand degree is 2 min (`:26-29`). Dragging the minute hand past twelve therefore advances the hour; dragging the hour hand drags the minutes along. The pinned test: `dragHand(10:50, "minute", 6°) === 11:01` and `dragHand(60, "hour", 120°) === 4*60` (`tests/live.test.ts:35-38`).
- `snapTo(minutes, step)`: nearest multiple (`:31`).
- `clockTime(minutes)`: "h:mm" in 12-hour with `0 → 12` (`:34-38`).

#### Chance (`:40-118`)
- `BAG_COLORS`: four hex colours for the bag's counters (`:42`).
- `Device` union: `coin`, `die {sides}`, `twoDice`, `spinner {sections}`, `bag {counts: number[]}` (`:44-49`). `DIE_SIDES = [4, 6, 8, 10, 12, 20]`.
- `outcomes(d, words)`: labels and theoretical probabilities. Two dice: 11 outcomes 2..12 with `p[i] = (6 − |i − 5|) / 36` (`:61`). Bag: `p = count / total`, 0 when the bag is empty (`:64-67`). The caller supplies "heads"/"tails" so the module has no locale.
- `draw(d, r)`: one trial as an outcome index, from a `() => number` source so tests can seed it. Two dice sums two floors (`:79`); the bag walks cumulative counts (`:82-90`), and the trailing `return d.counts.length − 1` only guards floating-point overrun.
- `Tally = { n, counts, history }` where `history` holds `{ n, counts }` snapshots for the over-time chart. `emptyTally(k)`.
- `MAX_TRIALS = 1_000_000`.
- `runTrials(t, d, trials, r)`: copies the tally, runs `max(0, min(trials, MAX_TRIALS − n))` draws (`:109`), and pushes a snapshot when `n <= 30 || n >= prev * 1.05` (`:115`): every trial for the first thirty, then whenever the count has grown by a twentieth, so "a million trials keep only a few hundred snapshots" (`:95-96`). Returns the new tally and the last outcome. Tests pin: history under 300 entries after 111 111 trials, strictly increasing `n`, first thirty are 1..30, every snapshot's counts sum to its `n`, and `n` stops at `MAX_TRIALS` (`tests/live.test.ts:68-82`).

#### Dot multiplication (`:120-136`)
`dotProduct(k, top, bottom)`: the finger/dot method for multiplying two numbers in `k..2k`. Each factor is `k + dots`; the product is `2k · (top + bottom) + (k − top)(k − bottom)`, justified by the identity in the comment `(k + a)(k + b) = 2k(a + b) + (k − a)(k − b)` (`:125`). Returns `{a, b, value: 2k, empty: [k−top, k−bottom], dots, dotValue, emptyProduct, product}`. The test checks `product === a·b` for every pair with `k ∈ {3,4,5,6,10}` and the worked example `dotProduct(5, 3, 1)` = 8 × 6 = 48 (`tests/live.test.ts:84-92`).
`tapSquare(dots, i)`: tapping square `i` fills through it (`i + 1`), except tapping the last filled dot removes it (`:136`).

#### Ten frame and hundred square (`:138-147`)
`counters(cells)`: counts of colour 1 and colour 2 and their sum. `multiplesOf(n, upTo = 100)`.

#### Kinds, states, sizes (`:149-217`)
- `LiveParam = { v, min, max }`; `LiveGraphState = { fns: {expr, color}[], params: Record<string, LiveParam>, view: {xMin,xMax,yMin,yMax}, trace, tangent, traceX }`. `DEFAULT_LIVE_GRAPH` is `a*x^2 + b*x + c` with `a=1, b=0, c=0` on −5..5 and view −10..10 × −5.5..5.5 (`:161-168`).
- `LiveStates` is the master record of the ten kinds (`:172-183`):
  - `clock: { minutes, showTime, snap }`
  - `dice: { count, faces: number[], history: number[] }`
  - `spinner: { sections, angle, result, counts }`
  - `coin: { side, counts: [number, number] }`
  - `fractions: { shape: "circle" | "bar", parts, shaded: boolean[] }`
  - `tenFrame: { double, cells: number[] }` (always 20 cells)
  - `hundred: { marked: number[], n }`
  - `dots: { k, top, bottom }`
  - `graph: LiveGraphState`
  - `chance: { device, tally, view: "bars" | "time", relative, theory, focus, last }`
- `LIVE_SIZES`: design size in board pixels of each piece (`:187-198`): clock 300×432, dice 360×236, spinner 300×372, coin 260×300, fractions 320×372, tenFrame 340×300, hundred 400×486, dots 520×600, graph 640×560, chance 680×500. "a piece that is resized is scaled to fit."
- `LIVE_KINDS`, `isLiveKind` (own-property check on `LIVE_SIZES`).
- `initialLive(kind)`: a table of starting states, `structuredClone`d so each piece gets its own arrays (`:203-217`). Clock starts at 10:10 (hands apart), dice at `[3, 5]`, spinner 4 sections at 30°, chance a d6 with focus 5 (the six). The test pins that every start state survives `JSON.parse(JSON.stringify(...))`, that two calls give different objects, and that array lengths agree with their counts (`tests/live.test.ts:131-145`).

### src/live/ui.tsx — shared props and widgets

- `PieceProps<K> = { state, set, w: Dict["live"], svgRef }` (`src/live/ui.tsx:7-13`). `set` hands a whole new state to the board; `svgRef` is the piece's picture for "Copy as a picture".
- `FONT`, `INK = "#1e1e1e"`, a local `fill` template helper (`:15-17`).
- `svgPoint(svg, e)`: pointer position in the SVG's own units: `new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM().inverse())` (`:20-25`). This is what makes drags correct "whatever the board's zoom and the piece's scale": the CTM already includes Excalidraw's zoom and the `LiveView` scale transform.
- `Toggle` (`aria-pressed` button with `.on`) and `Stepper` (−/+ around a bold number, disabled at the bounds) (`:27-44`).

### src/live/pieces.tsx — the eight light pieces

Header: each piece "draws one SVG picture (what "Copy as a picture" copies) with its buttons around it, keeps what's mid-way (a drag, a roll) to itself, and hands the result to the board with `set`" (`src/live/pieces.tsx:1-4`). Mid-way state is React `useState`; committed state is the element.

Helpers (`:19-47`): `SECTION_COLORS` (ten pastel fills), `rad`, `around(cx, cy, r, deg)` = point at `deg` **clockwise from twelve** (`[cx + r sin, cy − r cos]`), `sectorPath` (an SVG `A` arc from `from` to `to`, large-arc flag when > 180°, and a two-arc full circle when the span is ≥ 359.999°), and `useAnimation()`: returns `(ms, step, done)`; runs `step(t)` with `t ∈ [0,1]` on `requestAnimationFrame`, cancels a previous run on a new call or unmount.

#### `Clock` (`:51-115`)
State mid-drag: `{ hand, minutes }`. `angleAt(e)` converts the pointer to degrees clockwise from twelve with `atan2(x − c, c − y)` (`:56-59`). `grab(hand)` calls `setPointerCapture` on the hand's `<g>` and starts the drag from the committed minutes (`:60-63`). Each hand is a coloured line plus a transparent 28-px-wide line as the hit area (`:64-72`). The `<svg>` handles `onPointerMove` (recomputing `dragHand` from the drag's running minutes) and `onPointerUp` (committing `wrapDay(snap ? snapTo(m, 5) : m)` and clearing the drag) (`:81-86`). Rendering: a 140-radius face at (150,150), 60 tick marks (long every five), numerals at radius 96, an optional time box showing `clockTime`, the hour hand (length 74, width 9, ink) and minute hand (112, 5, blue), and a hub. Toolbar: show-time toggle, snap toggle (snapping the current time when turned on), and a random-time button `5 * floor(random * 144)` (`:111`).

#### `Dice` (`:117-177`)
`PIPS` maps face value to pip positions in unit-square fractions (`:119-126`). `rollDie` is `1 + floor(random * 6)`. `roll()` animates 650 ms; at each of nine ticks (`floor(t * 9)` changes) it sets a random intermediate face set; on `done` it draws the final faces, clears the roll, and prepends the total to `history`, keeping 14 (`:136-150`). During a roll each die is rotated by `(f * 37) % 24 − 12` degrees for a jitter (`:159`). `setCount` keeps existing faces, fills new ones randomly, and clears history (`:151`). The total is shown only with more than one die; "…" while rolling. Clicking the picture itself rolls too (`onClick={roll}` on the `<svg>`, `:155`). Toolbar: stepper 1–3, roll, reset history. The chips under the bar are the history.

#### `Spinner` (`:179-233`)
`spin()` picks `to = from + 360·(3 + floor(random·3)) + random·360` (three to five full turns plus a random fraction) and eases over 2400 ms with `1 − (1 − t)³` (`:187-193`). On done: `end = to % 360`, `result = floor(end / (360 / n)) % n`, counts bumped (`:195-198`). Sector `i` spans `[i·360/n, (i+1)·360/n)` clockwise from twelve, drawn with `sectorPath` and labelled at 0.68 r; the winning sector gets a thicker stroke and bold label when not spinning (`:207-216`). The pointer is a line from the centre to radius `r − 18` at `angle`. Clicking the picture spins it (`:206`), and `spin` is a no-op while a spin is running (`:188`). Changing sections (stepper 2–10) resets result and counts (`:202`). Chips show counts per colour.

#### `Coin` (`:235-277`)
`toss()` draws `result`, then chooses `halves = 7 + ((7 + side + result) % 2)`: seven or eight half-turns "so it lands on the side that came up" (`:244-245`); the parity makes `(side + halves) % 2 === result`. Over 1100 ms the shown side is `(side + floor(t·halves + 0.5)) % 2` ("The face changes when the coin is edge-on", `:248`), the vertical squash is `|cos(t·π·halves)|` floored at 0.04, and the coin lifts by `sin(tπ)·30` (`:256, :261`). Heads is gold, tails grey; the label font shrinks for words over six characters. Clicking the coin tosses it (`:260`); a toss in progress is not interrupted (`:242`). Toolbar: flip, reset counts; chips show heads/tails counts.

#### `Fractions` (`:279-312`)
`n = parts`, `k = shaded count`. `toggle(i)` flips a part; `setParts(parts)` keeps the first `min(k, parts)` shaded (`:284-285`). Circle mode draws `n` sectors clockwise from twelve (one full circle when `n === 1`), bar mode `n` rectangles across 280 px (`:296-300`). Below is the fraction `k / n` as two texts and a vinculum. Toolbar: circle/bar toggles, stepper 1–12.

#### `TenFrame` (`:314-346`)
Cell size 58; one or two frames of 5×2; the state always keeps 20 cells and the view slices `10 * frames` (`:317-319`). Clicking a cell cycles `0 → 1 → 2 → 0` (`:322`). The caption reads `a + b = n` when both colours are present, else just `n` (`:337`). Height is computed from the frame count (`:321`), so the SVG viewBox changes with "twenty". Toolbar: twenty toggle, clear.

#### `Hundred` (`:348-377`)
A 10×10 grid of 38-px cells numbered 1–100; clicking a cell toggles it in or out of `marked` (`toggle`, `:353`); marked cells are yellow with bold numerals (`:356-367`). Toolbar: "multiples of" stepper 2–12, show (sets `marked = multiplesOf(n)`), clear, and a note with the marked count.

#### `Dots` (`:379-437`)
`DOT_ROWS = [3, 4, 5, 6, 10]`. The square size is `min(92, (500 − 20 − (k − 1)·gap) / k)` so ten squares still fit (`:388`). Column headers show `k + i + 1` (the number each filled square represents). Two rows of squares; clicking square `i` of a row sets that row's dots with `tapSquare` (`:390-399`). Under them four numbered step lines (①–④) fill locale templates with the parts of `dotProduct` and bold the result, then the final `a × b = product` (`:403-408, :429-433`). The toolbar's select changes `k` and clears both rows.

### src/live/Chance.tsx — the chance experiment

Constants: picture 660×330, margins L 54, R 14, T 26, B 48 (`src/live/Chance.tsx:9-14`). A local `niceStep(max)` picks `1, 2, 5, 10 × 10^floor(log10(max/5))` ≥ `max/5` — about five ticks (`:18-22`); `tick(v, step)` prints as many decimals as the step needs; `fmt` prints integers plainly, else 2 or 3 decimals (`:24-25`). `startFocus(d)`: the outcome the over-time chart follows at first — index 5 (a seven) for two dice, the top face for a die, else 0 (`:28-32`).

#### `Chance` (`:34-125`)
Derives `labels`, `p` from `outcomes` (bag labels are the locale's colour words), and a colour per outcome: `BAG_COLORS` for a bag, `SECTION_COLORS` for a spinner, light blue otherwise (`:37-39`). `setDevice` resets the tally to the device's outcome count, focus, and last (`:42-45`). `run(m)` calls `runTrials` with `Math.random` and commits the tally and last outcome in one `set` (`:46-49`), so a thousand trials are one undo step.

Toolbar rows: device select (a new die starts with 6 sides, a spinner with 4 sections, a bag with counts `[3, 2, 1, 0]`, `:60`; with per-device controls: sides select, sections stepper 2–10, four bag steppers 0–20 whose minimum is 1 when it is the only colour left, `:66-96`); ×1/×10/×100/×1000 buttons disabled at `MAX_TRIALS`, reset, a trials note, and a chip for the last outcome (`:99-106`); view toggles (bars / over time), relative (bars only), theory (`:109-112`). The SVG draws `Bars` or `OverTime`.

#### `Bars` (`:127-169`)
`values` are counts or relative frequencies; `expected` are `p` or `p·n`. The axis top is `max(rel ? 0.05 : 5, values, expected if theory) × 1.15`, rounded up to a tick step (`:131-133`). Each outcome gets a slot `(W − L − R) / k`; bar width `min(64, 0.7·slot)`. A transparent full-height rect makes the whole column clickable to set `focus` (`:153`); the focused bar has a thick ink stroke and bold label. Value labels sit above the taller of bar and expected line (`:156`). Theory is a dashed red line across each bar (`:160-162`).

#### `OverTime` (`:171-210`)
Follows one outcome's relative frequency on a log-x axis: `x(v) = L + log10(max(1, v)) / log10(N) · width`, `N = max(10, n)` (`:173-174`). The series is the history plus the current tally if the last snapshot is older (`:175`). The y top is `min(1, max(0.2, 2p, 1.1·f for snapshots with n ≥ 10))` — "Tall enough for p twice over and for the wobbles once there are ten trials (the very first ones jump to 0 or 1)" (`:176-177`). Decade gridlines at 1, 10, 100…; a dashed red `p = …` line when theory is on; the polyline and a dot at the last point; the running frequency in the corner.

### src/math/liveGraph.ts — letters, curves and frozen copies

Imports mathjs eagerly, which is why this module is only reached through lazy imports.

- `MAX_PARAMS = 6`; `clean` strips a leading `y =` (`src/math/liveGraph.ts:7-9`).
- `paramsOf(expr)`: parses and traverses; collects `SymbolNode` names that are not a function name (`parent.type === "FunctionNode" && path === "fn"`), not `x`, not a property of the `math` namespace (so `pi`, `e`, `sin`… are excluded), deduplicated, in order of appearance (`:12-21`). Test: `paramsOf("y = A sin(k x + phi) + pi") → ["A", "k"]` (`phi` is a mathjs constant) (`tests/live.test.ts:105`).
- `allParams(exprs)`: union across functions, capped at six; a parse error contributes nothing ("unreadable for now: the row shows it", `:31`).
- `compileWith(expr)`: `{ f(x, scope) }` or `{ error }`. `f` evaluates with `{...scope, x}` and returns `NaN` for non-numbers or throws (`:39-54`). Unknown letters "count as 1 until they get a slider" happens upstream in `syncParams`.
- `sample(f, xMin, xMax, yMin, yMax, n = 600)`: polyline runs in graph units. A run breaks when `y` is not finite or when `|y − prev| > 2·(yMax − yMin)` (an asymptote); finite `y` is clamped to one window height beyond the view so a near-vertical stroke still leaves the frame (`:57-74`). Runs of one point are dropped. Test: `1/x` on −5..5 gives exactly two runs.
- `slope(f, x, h = 1e-4)`: central difference (`:77-79`).
- `roundTo(v, step)`: `toFixed` to the step's decimal count, max 10 (`:82-85`).
- `stepFor(p)`: `(max − min)/100` rounded up to `1, 2, 5, 10 × 10^k` (`:87-91`). −5..5 → 0.1; 0..200 → 2.
- `substitute(expr, values)`: `parse().transform()` replacing parameter `SymbolNode`s by `ConstantNode`, negatives as `parse("(v)")` so `b*x` with `b = −3` prints `(-3) * x`; output via `toString({ parenthesis: "keep", implicit: "show" })` so `A sin(k x)` becomes `3 * sin(2 * x)` (`:94-103`, `tests/live.test.ts:121-122`).
- `syncParams(state)`: each letter keeps its slider, new ones start `{v: 1, min: −5, max: 5}`, unused are dropped (`:106-109`).
- `zoomView(v, at, factor)`: scales each bound about `at` (`:112-119`).

### src/live/LiveGraph.tsx — the graph piece

Constants `PW = 620`, `PH = 330`, `MAX_FNS = 3`; `fmt` prints six-decimal rounding with `toExponential(1)` at or beyond 1e4 or (non-zero) below 1e−3 (`src/live/LiveGraph.tsx:11-17`).

Three kinds of in-progress state (`:21-24`): `pending: Partial<LiveGraphState>` (a slider mid-drag, a view mid-pan/zoom, a trace point mid-drag), `drafts: string[]` (function text being typed), `playing: string | null` (which slider is animating). `cur = {...state, ...pending}` is what renders. `latest` is a ref to `{cur, set}` so event listeners registered once (the wheel handler, the play loop) see fresh state (`:26-27`). `commit()` clears `pending` and writes `latest.current.cur` to the board — one undo step per gesture, as the header promises (`:28-31`).

`exprs` come from drafts or committed fns; `fns` pair them with colours (`PLOT_COLORS` by index); `params = syncParams(...)`; `scope` maps names to values (`:33-36`). `compiled` is memoised on `exprs.join("\n")` (`:39`). `px`, `py` map graph units to picture pixels (`:41-42`).

`commitFns(next)` clears drafts and pending and commits functions with re-synced params (`:44-49`). `setParam` writes into `pending.params` (`:50`).

Play loop (`:53-72`): a letter "runs from its least to its greatest value and back, every four seconds". The start time is offset by the current value's position so the animation begins where the slider is; each frame computes a triangle wave and sets the rounded value. The cleanup cancels the frame and commits — so pausing (or switching letters) leaves one undo step.

Wheel zoom (`:75-93`): a native non-passive `wheel` listener on the piece's own `<svg>` (added once; `svgRef` is stable) calls `preventDefault` and `stopPropagation` — "or the board would zoom too" — converts the pointer to graph units, applies `zoomView` with factor `exp(deltaY · 0.0015)`, and debounces `commit` by 400 ms.

Pointer drags (`:95-170`): on `pointerdown` the svg captures the pointer; if the trace point is shown and the pointer is within 16 px of it the drag is `{kind: "trace"}`, else `{kind: "pan", from: <graph units>, view}`. Trace moves set `traceX` rounded to `niceStep(xRange)/100`. Pan recomputes the pointer in the *original* view (`d.view`) so the moving view does not feed back into the delta (`:161-165`). `pointerup` commits if a drag was in progress.

Trace and tangent (`:101-105, :188-198`): the point is shown when either `trace` or `tangent` is on (`trace = cur.trace || cur.tangent`, `:102`); `f0` is the first compiled function; `ty = f0(traceX)`, `m = slope(...)` when finite. The tangent is drawn as the full-width line `y = ty + m(x − tx)` evaluated at `xMin` and `xMax`. The point is a 7-px disc with a white-stroked label `(x, y)` and `slope = m` when tangent is on (`paintOrder="stroke"` for the halo).

Grid (`:107-115, :172-180`): `niceStep(xMax − xMin)` (target 10) and `niceStep(yMax − yMin, 8)`; axes through zero clamped to the frame; labels skip the near-zero tick.

Markup: function rows (`y =` in the curve's colour, a monospace input with `.invalid` and a title tooltip for parse errors, commit on blur, Enter blurs, × to remove when more than one, "+ add" up to three), the svg, a toolbar (trace, tangent, reset view, zoom hint), and the sliders grid.

#### `Slider` (`:216-262`)
Each bound is an uncontrolled input keyed by `${which}${value}` (so it re-mounts with a new default when the value changes elsewhere); on blur it validates: a non-finite entry or `max <= min` is reverted; otherwise the value is clamped into the new range and committed (`:226-242`). The range input uses `stepFor(p)`, writes rounded values through `onChange`, and commits on `pointerup` / `keyup`. The ▶/⏸ button toggles play.

### src/live/LiveView.tsx — the host

`LiveHost` is what a piece can ask of the board (`src/live/LiveView.tsx:13-19`): `update(id, data)`, `snapshot(id, svg)` ("Puts a picture of the piece beside it"), `freezeGraph(id, state)` ("Puts an ordinary graph (the graph tool's, editable there) beside a live graph, with the sliders' values put in").

`LiveGraph` is `React.lazy` — "The graph needs mathjs, so it loads the first time a board has one" (`:21-22`). The `PIECES` table maps each kind to its component (`:24-35`).

`LiveView({ element, host })` (`:37-71`): bails if `liveDataOf` fails. The usable box is the element's size minus its stroke width on each side (`:44-45`). The scale is `max(0.05, min(w/W, h/H))` — uniform, fit-inside — and the piece is positioned by `translate((w − W·s)/2, (h − H·s)/2) scale(s)` with `transform-origin: 0 0` from CSS (`:46-52`). The piece is rendered inside `Suspense` with `set` bound to `host.update(element.id, { live: kind, state })`. A 📷 button calls `freezeGraph` for a graph and `snapshot` with the svg for everything else.

CSS that matters (`src/styles.css:541-549`): `.live-host` fills the embeddable; `.live` is absolutely positioned at the design size with padding 10, white background, `user-select: none`, and `filter: var(--theme-filter)` so a dark board inverts the piece like Excalidraw inverts its canvas; `.live svg { touch-action: none }` so touch drags on a clock hand or the graph reach the pointer handlers instead of scrolling.

### The Excalidraw bridge in src/pages/BoardPage.tsx

Three props on `<Excalidraw>` (`src/pages/BoardPage.tsx:554-556`) and one host object.

- `validateEmbeddable = (link) => isLiveLink(link) ? true : undefined` (`:38`): a live link is always a valid embeddable; for any other link `undefined` falls back to Excalidraw's own allow-list ("anything else is checked as Excalidraw always does").
- `onLinkOpen` calls `preventDefault` for live links so the element's link button does nothing (`:40`).
- `renderEmbeddable = (el) => isLiveLink(el.link) ? (liveDataOf(el) ? <LiveView element={el} host={liveHost.current} /> : <div />) : null` (`:466-469`). Returning `null` lets Excalidraw render a normal iframe for genuine embeds; a damaged live piece "shows nothing, rather than Excalidraw trying to load its address" (`:465`).
- `liveHost` is a ref re-assigned every render (`:376-419`) so the closures see the current theme and API:
  - `update(id, data)`: maps `getSceneElementsIncludingDeleted()`, replacing the element with `{...el, customData: data, version + 1, versionNonce: random, updated: Date.now()}`; then `updateScene` with `captureUpdate: IMMEDIATELY` so every change is an undo step and reaches autosave. The subtlety (`:387-394`): Excalidraw tracks the piece the user is interacting with as `appState.activeEmbeddable.element`, by object identity; after replacing the element the host also sets `activeEmbeddable` to the new object (only when the active embeddable's id is the one being updated, keeping its `state`), "or each change would need another click to carry on".
  - `snapshot(id, svgEl)`: `XMLSerializer` → `themedSvg(svg, theme)` → `svgImage` (data URL) → `placeImage(..., undefined, undefined, besides(id))` (`:398-403`). `besides` is `x + width + 32` at the same `y`. With no `math` the image's `customData` is `{ snapshot: true }` (`:362`), a plain picture.
  - `freezeGraph(id, state)`: dynamically imports `liveGraph` and `plot`, substitutes slider values into each expression, builds a `PlotSpec` from the live view, and places the SVG with `MathData { kind: "graph", data: spec, w, h }` so the copy opens in the ordinary graph dialog (`:404-418`). Blank expressions are left out of the spec; if `plotToSvg` throws (a function that does not compile, an empty y range) the whole copy is silently not placed (`:412-417`).
- `addLive(kind)` places `liveElement(kind)` through `placeOnBoard` (`:420`); `LIVE_IN_MENUS` also lists the graph and chance pieces in the Algebra and Discrete tool menus (`:77-81`).

Interaction model: Excalidraw's embeddable needs one click to become "active"; after that pointer events go to the rendered React tree (the clock's `onPointerDown` with pointer capture, the graph's wheel listener, plain `onClick`s). Every piece keeps transient state locally and calls `set` once per gesture, so the scene update frequency equals the number of undoable actions.

### src/three/spec.ts — the 3D specs and formula captions

"No three.js imports here so the board page can reference these types without pulling three.js into its bundle." (`src/three/spec.ts:1-2`).

- `View = { azimuth, polar, zoom }`; `DEFAULT_VIEW = { π/5, 1.1, 1 }` (`:4-5`).
- `SolidShape`: cuboid, prism, pyramid, cylinder, cone, sphere. `SolidSpec` (`:15-28`): `a, b, c` with meaning by shape ("cuboid: a length, b width, c height; prism: a base side, c height, `sides`-gon base; pyramid: a base side, c height; cylinder/cone: a radius, c height; sphere: a radius"), `sides?` 3–8 for the prism, `unit` string, `unfold` 0..1, `seeThrough`, `labels`, `formulas`, `view?`.
- `CubesSpec` (`:30-39`): `mode: "cuboid" | "stacks"`, `a, b, c` cube counts, `heights[row][col]` for stacks, `formulas`, `view?`.
- `Transform3DSpec` (`:42-49`): `m` nine row-major entries "acting on space (math axes: x right, y back, z up)", `t` animation 0..1, `grid`, `formulas`, `view?`.
- `Spec3D` union; `DEFAULT_TRANSFORM3D` (`m = [2,1,0, 0,1,1, 1,0,1]`), `TRANSFORM3D_PRESETS` (identity, scale, stretchZ, rotateZ, shear, reflect, project, mixed).
- `interpolated(spec)`: `(1 − t)·I + t·M`, implemented as `i % 4 === 0 ? 1 + (v − 1)t : v·t` since the diagonal is at indices 0, 4, 8 (`:73-76`). `det3(m)` by cofactors (`:78-81`).
- `SOLID_DEFAULT_DIMS`, `DEFAULT_SOLID` (cuboid 4×3×2 cm), `DEFAULT_CUBES` (4×3×2; stacks `[[3,2,1],[2,1,0],[1,0,0]]`).
- `canUnfold(s)`: everything but the sphere (`:117`). `cubeHeights(spec)`: cuboid mode expands to `b` rows of `a` columns of `c` (`:120-122`).
- `captionLines(spec, cubesWord)` (`:126-176`): transform → `det M` and `V = |det M|` (typographic minus); cubes → `V = a × b × c = n` or `V = n`; solids by shape: cuboid `V = abc`, `S = 2(ab + bc + ca)`; prism base `B = n a² / (4 tan(π/n))`, `V = B h`, `S = 2B + n a h`; pyramid `V = ⅓ a² h`, `S = a² + 2 a l` with slant `l = hypot(c, a/2)`; cylinder `V = π r² h`, `S = 2πr² + 2πrh`; cone `l = √(r² + h²)`, `V = ⅓ π r² h`, `S = πr² + πrl`, net angle `θ = 360° · r / l`; sphere `V = ⁴⁄₃ π r³`, `S = 4πr²`. Units appear as `u²`/`u³` when the unit is non-empty.

### src/three/build.ts — geometry construction

Colours: `INK`, four face colours (`base` blue, `side1` orange, `side2` green, `top` violet), `LAYER_COLORS` for cube layers (`src/three/build.ts:8-10`). `Ctx = { lineMats, seeThrough, L }` where `L` is the model's largest extent: "labels and dashes scale with it" (`:406`).

Primitives (`:18-106`):
- `lineMat(ctx, opts)`: a `LineMaterial` (fat lines, so width is in pixels) with dash lengths `0.05 L` / `0.035 L` and `depthTest: !onTop`; pushed to `ctx.lineMats` so the viewer can set its `resolution` on resize (`:18-29`).
- `edgesOf(geo)`: `EdgesGeometry(geo, 25°)` → `LineSegments2` (`:31-34`).
- `segments(points, ctx, opts)`: pairs of points → `LineSegments2`; `computeLineDistances` for dashes; `renderOrder 5` when on top (`:37-43`).
- `faceMat(color, ctx)`: `MeshLambertMaterial`, double-sided, 35 % opacity without depth write when see-through, and polygon offset "keep edges drawn on top of their faces" (`:45-56`). `face(geo, color, ctx, edges = true)` groups a mesh with its edge lines.
- `label(text, pos, ctx, color, scale)`: renders text at 56 px into a canvas with a rounded 88 %-white pill, makes a `CanvasTexture` (sRGB) on a `Sprite` with `depthTest: false`, `renderOrder 10`, height `0.13 L · scale`, width from the canvas aspect (`:65-93`).
- `circle(r, y, n = 96)`: segment pairs around a horizontal circle in the xz plane (`:98-106`).

Solids (`:108-424`). three.js's y is up; every solid stands on `y = 0`.
- `cuboid(spec, ctx, t)` (`:110-154`): base `PlaneGeometry(a, b)` rotated flat. Four side faces are planes `w × c` translated up by `c/2` inside hinge groups positioned on the base's edges (`±b/2` in z, `±a/2` in x) and rotated by `ang = t·π/2` about the edge (x for front/back, z for left/right). The top is a child of the *back* hinge, positioned at `y = c`, rotated `−ang`, with its plane translated `+b/2` in z so it covers the box at `t = 0`; at `t = 1` it lies beyond the back face — "t=1 lays them flat into a cross-shaped net" (`:117`). Labels (edge lengths with unit) only when `t === 0`.
- `pyramid` (`:156-186`): square base; four triangles `(−a/2,0,0),(a/2,0,0),(0,slant,0)` with `slant = hypot(c, a/2)`; each in a yaw group (`k·π/2`) and a hinge at `z = a/2` with `rotation.x = −tilt + t(π/2 + tilt)`, `tilt = atan2(a/2, c)`: at `t = 0` the faces "lean inward" so the apices meet at height `c`, at `t = 1` they lie flat outward. A dashed height line and labels at `t = 0`.
- `cylinder` (`:188-254`): the doc comment describes the two-phase net. `unroll = min(1, 2t)`, `fold = max(0, 2t − 1)·π/2`. The lateral surface is built in the frame of the front generator (group at `z = r`): with curvature factor `k = 1 − unroll`, each column `i` of `N = 128` has arc length `s ∈ [−πr, πr]`, bends onto a circle of radius `R = r/k` as `(R sin θ, y, −R(1 − cos θ))`, `θ = s/R` (`:213-220`) — the same arc length on a growing circle, so at `k = 1` it is the cylinder and as `k → 0` a flat `2πr × h` rectangle (`k < 1e−4` short-circuits to a straight line). Index pairs make quads between columns. The outline includes both rims and, once unrolling has started, the cut seam. The top disc is a child of the side group at `y = h`, rotated by `fold` and translated `−r` in z so it sits over the base when closed; in the second phase the side group rotates about the base's front edge so the rectangle falls flat and the top disc hinges on its far edge. At `t = 0` a dashed radius and `r`, `h` labels; at `t = 1` net labels `2πr ≈`, `h`, `r` scaled up by `big = max(1, 2πr/L)·0.8` because "The net is ~3× wider than the solid" (`:245-251`).
- `cone` (`:256-332`): `l = hypot(r, h)`, net sector angle `φ = 2πr/l`. A hinge group at the base's front point `(0,0,r)` rotates by `fold·(π/2 + atan2(r, h))`; inside it a `frame` whose basis is `ex = x`, `ey` = up the front generator to the apex, `ez = ex × ey` (the tangent plane). In that frame the apex is `(0, l, 0)`; the surface is wrapped onto cones of the same slant whose half-angle `β` grows from `β₀ = asin(r/l)` to 90° with `unroll` (`:291-293`). `rimAt(σ)`: with rim radius `l sin β`, angle `α = σ / sin β` keeps arc length `l·σ`; the total rim arc is `l·φ = 2πr` at every β — the cone's circumference — and the sector angle is `φ` once flat (`:297-301`). One apex vertex per column gives smooth normals. Seam edges appear once unrolling starts. At `t = 0` dashed `r` and `h` with labels; at `t = 1` net labels `r`, `l ≈`, `θ ≈ φ°` positioned in world coordinates along `+z`, scaled by `big = max(1, 2l/L)·0.7` (`:324-328`).
- `polygon(n, a, cz)` (`:334-347`): regular n-gon fan with circumradius `a / (2 sin(π/n))`, vertices at `2πk/n − π/n` so "edge 0's outward normal points along +z"; winding faces `+y`.
- `prism` (`:349-392`): apothem `ap = a / (2 tan(π/n))`; side `k` is a yaw group of `2πk/n` holding a hinge at `z = ap` rotated `ang`; the top polygon is attached to side 0's hinge at `y = c`, translated `−ap` in z, so it unfolds like the cuboid's top. Labels for `a` and `h` at `t = 0`.
- `sphere` (`:394-403`): `SphereGeometry(r, 64, 48)`, a dashed equator, a dashed radius on top, and an `r` label.
- `buildSolid(spec, t)` (`:405-424`): computes `L` per shape (cuboid `max(a,b,c)`; pyramid `max(a,c)`; sphere `2a`; prism `max(a / sin(π/n), c)` = circumdiameter; cylinder/cone `max(2a, c)`), floors it at 1, and dispatches.

Unit cubes (`:428-479`): `heights` from `cubeHeights`; cube centres at `(col − cols/2 + 0.5, y + 0.5, row − rows/2 + 0.5)`. A faint floor grid (`#adb5bd`, width 1) "so empty cells of the plan are visible". One `InstancedMesh` of `BoxGeometry(1,1,1)` with per-instance colour by layer `floor(p.y) % 6`; all cube edges merged into a single `LineSegmentsGeometry` from the 12 corner pairs (`:461-467`). Cuboid mode adds the three count labels.

3×3 transform (`:481-577`): `M3(x, y, z) = (x, z, −y)` converts math axes (z up) to three.js (y up), orientation-preserving (`:484`). `CUBE_EDGES` enumerates the 12 unit-cube edges by axis (`:489-499`). `arrowHead(to, color, size)`: a `ConeGeometry` aligned to `to` by `setFromUnitVectors`, pulled back half its length, `depthTest: false`, skipped when the vector is shorter than `0.6 size`. `buildTransform3D`: `m = interpolated(spec)`; `apply` multiplies and maps through `M3`; the frame `R` is the largest transformed-corner coordinate (at least 1.5) + 0.6, negative half-axes `N = 0.45 R` "to keep the frame tight"; `ctx.seeThrough = true` so the parallelepiped is translucent. Draws grey axes with `x y z` labels; optional floor grids of the `z = 0` plane over −2..2 (`G = 2`, `:531`; original `#dee2e6`, transformed `#74c0fc`) flagged `userData.noFit` because "a sheared grid reaches far out; frame the axes instead" (`:539`); the dashed unit cube; the parallelepiped as 6 quads → 12 triangles in `0xffa94d` with orange edges; and the basis vectors `î ĵ k̂` (green, red, blue — the matrix columns) as thick on-top lines with cone heads and labels.

- `disposeObject(obj)`: traverses and disposes geometry, materials and sprite maps (`:579-589`).
- `boxOf(group)`: a `Box3` over meshes and `LineSegments2` only ("Ignore sprites so labels don't affect framing"), skipping `noFit` objects (`:591-600`).
- `build3D(spec)`: dispatch; for solids the unfold parameter is `spec.unfold` only when `canUnfold` (`:602-613`). Returns `{ group, lineMats, fitBox }`.

### src/three/viewer.ts — renderer, camera, controls, snapshot

`Viewer` (`src/three/viewer.ts:10-192`):
- Constructor: `WebGLRenderer({ antialias, alpha, preserveDrawingBuffer: true })` — the last so `snapshot` can read the canvas after `render`; pixel ratio capped at 2; transparent clear colour; the canvas appended to `host`. An `AmbientLight(1.9)` plus a `DirectionalLight(1.3)` parented to the camera — "Light follows the camera so the faces facing the viewer are always lit" (`:26`); the camera is added to the scene so the light is in the graph. `OrbitControls` with pan disabled, zoom 0.3–5, rendering on `change`. A `ResizeObserver` on the host (`:20-43`).
- `size()`: width `max(200, clientWidth)`, height `0.62 w` (`:45-48`). `resize()` sets the renderer size, every `LineMaterial.resolution` (fat lines need the viewport size), the frustum, and renders.
- `updateFrustum()`: orthographic half-height `1.12 · radius`, half-width by aspect, near 0.01, far `20 radius` (`:58-66`).
- `show(spec)`: removes and disposes old content, builds, computes the fit sphere from `fitBox` (unit sphere if empty), `radius = max(r, 0.5)`, keeps the current viewing direction (`camera.position − target`, normalised), re-targets the sphere centre and places the camera `6 radius` away along the kept direction, then resizes (`:69-86`). "Replaces the content, keeping the current viewing direction and zoom."
- `setView(v)` / `getView()`: spherical offset `(6 radius, polar, azimuth)` from the target and `camera.zoom`; read back from the controls (`:88-99`).
- `snapshot(caption, matrix?)` (`:105-183`): renders, copies the WebGL canvas into a 2D canvas (`willReadFrequently`), scans every pixel's alpha for `> 8` to find the drawn bounding box (full canvas if nothing drawn), then builds an output canvas: padding `12 dpr`, font `600 17dpr px`, line height `26 dpr`; measures the caption width; if a `matrix` is given, measures each column's widest cell, lays out `M =` plus columns with `14 dpr` gaps and draws parentheses as quadratic curves, colouring each column with `matrix.colors[j]` (the basis colours); the caption sits to the right of the matrix block, vertically centred against it. Returns `{ dataURL: PNG, width, height }` with the size divided by `dpr` so the board places it at CSS-pixel size.
- `dispose()`: disconnects the observer, disposes controls, content, renderer, and removes the canvas (`:185-191`).

### src/components/ThreeDialog.tsx — the parts that touch src/three

The tool is registered as `"3d"` with `png: true` (`src/tools.tsx:46`), so `BoardPage`'s shared `insert()`, called from the dialog's `onSubmit`, places the `Snapshot.dataURL` as a PNG image with `MathData { kind: "3d", data: spec, w, h }` (`src/pages/BoardPage.tsx:483-489`, `:603-606`).

- State: one spec per tab (`solid`, `cubes`, `tf`), initialised from `initial` when editing (`src/components/ThreeDialog.tsx:39-43`).
- The viewer is created once in an effect on `hostRef`, shown the opening spec, and given `initial?.view ?? DEFAULT_VIEW`; the cleanup disposes it (`:48-59`). A second effect calls `viewer.show(spec)` on every spec change (`:61-63`), which keeps the orbit.
- `caption = spec.formulas ? captionLines(spec, t.cubes) : []` is shown under the viewer and baked into the snapshot (`:65, :116-122`).
- `insert()` (`:67-75`): for a transform, builds `matrix.rows` from `interpolated(spec)` formatted with a typographic minus and `BASIS_COLORS`; submits `{...spec, view: v.getView()}` and `v.snapshot(caption, matrix)`. The saved view means re-editing reopens at the same angle.
- Top view button: `setView({ azimuth: 0, polar: 0.0001, zoom: 1 })` (polar exactly 0 would make OrbitControls' up vector degenerate); reset to `DEFAULT_VIEW` (`:110-113`).
- `SolidControls`: shape radios (switching applies `SOLID_DEFAULT_DIMS` and `unfold: 0`); dimension inputs per shape (0.5–20, step 0.5, uncontrolled and keyed by `shape-dim`); `sides` 3–8 for the prism; unit text capped at 6 characters; the unfold range only when `canUnfold`; see-through / labels / formulas checkboxes (`:128-220`).
- `CubesControls`: mode segmented control; cuboid counts 1–8; stacks grid where click adds one, shift-click or right-click removes one, modulo 9 (`(h + delta + 9) % 9`); rows/cols 1–6 with a preserving `resize` (`:222-286`).
- `Transform3DControls`: nine text inputs mirrored to numbers only when parseable ("so "-" or "0." can be typed"), presets set `m` and `t = 1`, an animate range for `t`, grid and formulas checkboxes (`:288-350`).

### src/math/shapes.ts — the ready-made pieces

Header (`src/math/shapes.ts:1-8`): a piece "is a list of plain parts (paths, ellipses, rectangles, text) that the board turns into ordinary Excalidraw elements, grouped: what lands on the board is editable line by line, not a picture. Coordinates are in pixels with y pointing down; angles are in degrees, anticlockwise from the positive x-axis, as in maths."

#### Types (`:12-34`)
`Pt = readonly [number, number]`. `Piece` is one of `path {points, closed?, arrows?: "end" | "both"}`, `ellipse {cx, cy, rx, ry}`, `rect {x, y, w, h, round?}`, each with `Style {color?, width?, dashed?, fill?}`, or `text {x, y, text, size, align, color?}` where `(x, y)` is the anchor (centred vertically; horizontally per `align`). `SHAPE_GROUPS` has eight entries: `live` plus seven drawn groups. `ShapeWords` carries the eight words a piece may need. `ShapeDef = { id, group, build(words), live? }` — "a live one (`live` set) goes on the board as a piece that responds to clicks, and `build` is its preview."

#### Helpers (`:36-125`)
Palette from Excalidraw's own ("its dark mode turns them round"): `GRID`, `MUTED`, `BLUE`, `RED`, `FILL.*`, `THIN`, `HIDDEN` (thin dashed). `polar(cx, cy, r, deg)` uses `cy − r sin` so maths angles go anticlockwise on a y-down canvas. `arc(...)` samples an ellipse arc at most `step` degrees apart. Constructors `path`, `seg`, `poly` (closed), `arrow`, `ellipse`, `rect`, `dot`, `text`, `num` (typographic minus). Vector helpers `sub`, `unit`, `along`, `midpoint`. `ticks(a, b, n)`: equal-length marks across a side's midpoint; `chevrons(a, b, n)`: parallel marks; `rightAngle(corner, p, q, size)`: the little square. `comb(ticks)`: "Many short strokes as one path: each tick goes out from its base point and back, and the path moves on along the base line (which is drawn anyway), so a ruler's hundred ticks are one element, not a hundred" (`:100-106`). `across(x, y, h)` is a tick straddling a horizontal line, expressed as two out-and-back strokes so `comb` never draws along the line itself — pinned by the test "a number line is one line" (`tests/shapes.test.ts:113-126`). `grid(...)`: all rows as one snaking path and all columns as another. `wedge`: a filled sector.

#### The 82 entries of `SHAPES` (`:858-941`)
Ten live previews in group `live`, then 72 drawn shapes in seven groups. Every entry builds a `Piece[]` (never SVG; `ShapesPanel.toElements` converts to Excalidraw skeletons).

**live** (previews; the inserted element is `liveElement(kind)`): `liveClock` (reuses `clock`), `liveDice` (`diePreview`: a 3 and a 5), `liveSpinner` (reuses `spinner`), `liveCoin` (`coinPreview`: gold disc with "1"), `liveFractions` (`fractionCircle(4)` with the first quarter filled), `liveTenFrame` (frame with 3 red + 2 yellow counters), `liveHundred` (every third cell shaded under a 10×10 grid), `liveDots` (two rows of five, 3 and 1 filled), `liveGraph` (axes, a parabola `y = x² − 1` clipped at the top, a slider bar with a knob labelled `a`), `liveChance` (six bars, a dashed red theory line, labels 1–6) (`:803-868`).

**measure** (6): `ruler` — 10 cm at 40 px/cm, 101 mm ticks of three heights in one comb, numerals at `10 + 40c`, "cm" (`:129-142`; test pins the numerals and their x). `protractor` — half disc r 180, 5° ticks, inner arc, outer scale 0→180 anticlockwise from the right and inner scale 180→0 in muted grey, labels clamped above the base, centre mark (`:144-164`). `setSquare45` — right isosceles 220, right-angle mark, two 45° labels. `setSquare30` — 300 × 300·tan 30°, labels 60° and 30° (angles pinned by test). `protractor360` — full circle, 72 ticks, cross-hairs, anticlockwise outer and clockwise inner scales. `clock` — r 120, sixty ticks via comb at `90 − 6m`, numerals, hands at ten past ten "apart and both easy to take hold of" (`:200-213`; test pins 12 above 6 and 3 right of 9).

**graphs** (9): `axes` (−5..5 grid at 30 px, arrowed axes, numerals, `x`, `y`, `0`); `axesQ1` (0..10 at 24 px); `axesSketch` (bare arrows with `O`); `numberLine` (−5..5 at 40 px, double arrow, comb ticks); `numberLine01` (0, 1/4, 1/2, 3/4, 1 on a plain 400-px segment, with taller ticks at 0 and 1 only — `i % 4 ? 8 : 14`, `:268`); `unitCircle` (circle r 130, radius at θ = 40° in blue, dashed drop, red angle arc, `(cos θ, sin θ)`, ±1 labels); `gridPaper` (16×12 cells of 25); `isometricDots` (columns at `28 cos 30°` with alternate columns offset half a step, "so the dots make triangles with vertical sides"); `axes3d` (x toward the viewer at 220°, y right, z up, dashed negative halves, `O`).

**geometry** (14): `angle` (two rays with a red arc and θ); `rightTriangle` (legs 180 and 240, labels `a b c`); `trigTriangle(w)` (right triangle with θ at A, `adjacent`/`opposite`/`hypotenuse` from the locale, hypotenuse label right-aligned "so the label runs up-left, away from the slope"); `triangle` (A B C with sides a b c); `parallel` (two horizontals with chevrons, a transversal, red corresponding-angle arcs); `transversalAngles` (φ = 60°, letters a–h at the middles of the eight angles via `polar(xAt(y), y, 30, middle)`); `circleParts` (diameter in blue `d`, radius in red `r`, centre `O`); `pentagon`, `hexagon`, `octagon` via `regular(n, start)` on a 100-radius circle; `parallelogram` (chevrons single and double on opposite pairs); `trapezium`; `kite` (tick marks 1/1 and 2/2); `rhombus` (one tick on every side).

**solids** (12, "oblique views, hidden edges dashed"): `cube` = `box(160,160,60,60)`, `cuboid` = `box(240,120,80,50)` — front face plus back face offset `(dx, −dy)`, with the three hidden edges `HIDDEN` (`:434-445`); `cylinder` (top ellipse, two generators, front bottom arc solid and back arc dashed, dashed radius with `r`, `h`); `cone`; `sphere` (equator half dashed, dashed radius); `pyramid` (square base in perspective, apex, dashed hidden edges and a dashed height `h` to the base's centre); `prism` (triangular, back copy shifted (150, −40)). Nets, "every face its own outline, so each can be coloured, labelled or moved away on its own": `netCube` (six 60-squares in a cross), `netCuboid` (120×60×80), `netPrism` (three 90×160 rectangles with equilateral ends), `netPyramid` (110 square with four triangles of height 95), `netCylinder` (rectangle `2πr × h` between two discs, labels `r`, `2πr`, `h`). The test sums face areas by rect/ellipse/shoelace and pins each net's area to its solid's surface (`tests/shapes.test.ts:82-104`).

**number** (12): `fractionWall` (rows 1 to 1/6 in six fills); `quarters`, `eighths` via `fractionCircle(n)` (wedges clockwise from twelve: `90 − 360i/n`); `tenFrame` (5×2 of 56); `hundredSquare` (10×10 of 36, numbered); `hundredFlat`, `tenRod`, `oneCube` (base-ten blocks at `BLOCK = 20` px: the flat and the rod carry a `grid` overlay in their fill's darker colour, the unit cube is a single yellow rect, `:603-610`); `placeValue` (headed by `1000 … 1/100` "so the chart reads the same in every language; the heavy line is the decimal point"); `barModel` (a whole `?` over three parts); `partWhole` (whole circle linked to two part circles by segments trimmed by the radii); `multiplicationSquare` = `headedTable(10, 34, "×", i·j)`.

**algebra** (10): tiles — `tileX2` (90×90 blue `x²`), `tileX` (90×25 green), `tile1` (25×25 yellow), `tileY` (65×25 violet), `tileXY` (90×65 pink), `tileNegX2`, `tileNegX`, `tileNeg1` (red); "x and y are deliberately not whole numbers of units, nor of each other, so the tiles can't be measured against each other. A negative tile is its positive's size in red, so the two make a zero pair" (`:661-662`). `balance` (beam, fulcrum triangle, pillar, base, two hanging pans); `functionMachine` (`x →` box `f` `→ f(x)`, rounded rect).

**stats** (9): `venn2`, `venn3` (universal set rectangle with `U`, labelled circles); `tree` (two-stage A/A′ then B/B′); `twoWay` (4×4 with shaded header row and column); `boxPlot` (0–10 axis, box Q1–Q3, median at 5, whiskers to 1 and 9); `spinner` (four quarter wedges, a pointer arrow at 60°, hub); `dice` (six faces 64 px, pips by name); `probabilityScale(w)` (0, 1/2, 1 below; impossible/evens/certain above; unlikely/likely below at the quarters — "clear of the numbers"); `sampleSpace` = `headedTable(6, 44, "+")` with blank cells.

#### `bounds(pieces)` (`:943-954`)
Min/max over path points, ellipse extents, rect corners, and text anchors. The test pins each shape's bounds to `max(w,h) ≥ 20`, `w ≤ 520`, `h ≤ 420` and that every build is deterministic (`tests/shapes.test.ts:16-34`).

### src/components/ShapesPanel.tsx — from pieces to elements

- `freeY(elements, x, y, w, h)` (`:33-45`): slides a `w × h` box down past every non-deleted element it overlaps (boxes from `getCommonBounds` because "a line's x and y are its first point"), repeating until nothing overlaps, with 24 px clearance. Used by `placeOnBoard` and `BoardPage.placeImage`.
- `toElements(pieces)` (`:48-82`): one `groupIds: [uuid]` for the whole piece; `roughness: 0`, `opacity: 100`. Text → `type: "text"` with `fontFamily: Nunito`, `textAlign` and the anchor remembered. Shapes map style to `strokeColor`, `strokeWidth` (default 2), `strokeStyle` dashed/solid, `backgroundColor`, `fillStyle: "solid"`. Ellipse from centre/radii to top-left/size. Rect with `roundness {type 3}` when `round`. Path → `line` (or `arrow` with `endArrowhead` and optional `startArrowhead`) with points **relative to the first point** and the first point appended when closed; `roundness: null` keeps corners sharp. `convertToExcalidrawElements(skeletons, { regenerateIds: false })` measures text; then each text element is moved so its anchor lands where the piece asked: `x − (0 | w/2 | w)` by alignment and `y − h/2` (`:75-81`).
- `placeOnBoard(ex, els)` (`:88-109`): centres the group in the viewport (`width/2/zoom − scrollX − w/2`), slides down with `freeY`, offsets every element, selects the elements and their group, closes the sidebar unless it is docked and the window is wider than 1229 px ("Excalidraw's breakpoint for docking"), captures the update, and scrolls to it.
- `Tile`: a draggable button; `onDragStart` serialises a one-item library (`serializeLibraryAsJSON`) under `MIME_TYPES.excalidrawlib`, so Excalidraw itself drops the elements where the pointer lands; the elements are `liveElement(kind)` for a live shape, else `toElements(build(words))` (`:111-128`).
- `ShapesPanel`: thumbnails are made with Excalidraw's `exportToSvg` for every shape (after `document.fonts.load('16px "Nunito"')` because labels are measured on the way in), with `exportWithDarkMode` for the dark theme, and cached in a module-level map keyed `theme:lang` since "the panel unmounts each time it closes" (`:25-27, :137-171`). Groups render in `SHAPE_GROUPS` order with a hint under `live`.

### src/math/svg.ts — data URLs and the dark filter

- `svgToDataUrl(svg)` (`src/math/svg.ts:1-7`): UTF-8 encodes, then converts bytes to a binary string in 32 768-byte slices — "String.fromCharCode takes its bytes as arguments, and a worksheet's SVG has hundreds of thousands" (an argument-count limit) — and `btoa`s. Returns `data:image/svg+xml;base64,…`.
- `dataUrlToSvg(url)` (`:9-14`): the inverse; `null` for a non-SVG data URL.
- `DARK_OPEN`/`DARK_CLOSE` (`:18-22`): a `<defs data-zeno-dark="">` filter — an `feColorMatrix` `−0.86·c + 0.93` on each channel followed by `hueRotate 180` — and a `<g filter>` wrapper. "the picture is inverted and its hues turned back (Excalidraw darkens its own canvas the same way), so white becomes the board's dark grey, ink becomes light, and blue stays blue."
- `isDarkSvg`, `darkSvg` (inserts after the root `<svg …>` tag's first `>` and before the last `</svg>`; idempotent), `lightSvg` (exact removal), `themedSvg(svg, theme)` (`:24-42`). Tests pin that dark → light is byte-identical and twice dark is once dark (`tests/svg.test.ts:9-19`).

### src/math/scale.ts — the tick step

`niceStep(range, target = 10)` (`src/math/scale.ts:4-9`): `raw = range / target`, `mag = 10^floor(log10 raw)`, `norm = raw / mag`, step `= (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) · mag`. "On its own so a chart can pick a step without loading mathjs along with plot.ts." Test: 10 → 1, 25 → 2, 60 → 5, 90 → 10, 0.08 → 0.01 (`tests/plotting.test.ts:14-20`).

### src/math/chart.ts — the shared SVG builder

Imports `latexToSvg` (MathJax) and re-exports `fill` and `nf` from `text.ts` ("so that messages can be filled in without loading MathJax"). `text.ts` defines `fill` (`{name}` placeholders) and `nf(v, digits = 4)`: `—` for NaN, `∞`/`−∞`, exponent form below `10^−digits` or at `≥ 1e7`, otherwise rounded with no trailing zeros and `-0 → 0` (`src/math/text.ts:5-14`).

Number helpers (`src/math/chart.ts:10-31`): `esc` (XML escape), `clampInt`, `nt` (typographic minus for captions), `tn` (LaTeX number: `a·10^{b}` for exponent form, `\infty`, `?` for `—`), `paren` (parenthesised when negative), `floorSig(v, sig = 3)` (round down to significant digits, "a safe δ"), `SUB`/`sub` (subscript digits).

Drawing (`:35-286`):
- `W = 640`, `FONT` attribute string, `C` palette (`:35-37`).
- `Frame` and `makeFrame(id, left, top, w, h, [x0, x1], [y0, y1])`: a pixel rectangle with data range and the maps `sx`, `sy` (y inverted) (`:39-59`). `r2` rounds to 2 dp.
- `axes(f, options)` (`:63-109`): emits a `clipPath` with the frame's id; the x-axis at `sy(0)` clamped into the frame or at the bottom (`xAtBottom`); the y-axis at `sx(0)` clamped; x ticks from `niceStep(range, 10)` (forced integer with `integerX`, or custom `xTicks` e.g. log scales), skipping the zero tick when it would collide with the y-axis; y ticks from `niceStep(range, 7)` unless `yAxis: false` (dot/box plots); a frame rectangle; axis lines; an 11-px label group.
- `curve(f, fn, color, width, extra, from, to, samples = 1500)` (`:112-132`): the same breaking rule as `liveGraph.sample` (non-finite or a jump over twice the y-range starts a new polyline; y clamped to one frame height beyond), output as polylines in a clipped `<g>`.
- `sampleY`, `yRange(values, must)` (`:134-146`): a 2nd–98th percentile window (−1..1 when there are no finite values) that always contains `must`, opened to `lo − 1 .. hi + 1` only when it has no height (`hi − lo < 1e−9`), then padded 8 %.
- `lbl` (text with a white 3.5-px `paint-order: stroke` halo, italic 600 by default), `arrow(x0, y0, x1, y1, color, width, dashed)` (a line shortened by the head `h = min(12, 0.4 L)` and a triangle head; a dot when the length is under 1e−6), `dot`, `hline`, `vline`, `band` (an ε-band with `L ± ε` labels), `legend`, `wrap(text, 74)` (greedy word wrap) (`:149-210`).
- `compose(tex, body, bodyH, captions)` (`:215-235`): renders the LaTeX header, scales it to fit `W − 32`, positions it at `y = 14`, places the body under it, and wrapped caption lines at 21-px pitch; returns a standalone `<svg>` with a white background and `{ svg, width: W, height }`.
- `texLines(rows, y0, x0)` (`:240-262`): equation rows with an operation note at the right, each at least 30 px tall.
- `PLOT`, `BODY_H` layout constants; `texAt(tex, x, y, anchor, scale, color)` (a LaTeX snippet with an 85 % white backing rect); `simpson(fn, a, b, n = 2000)` (`:264-286`).

### src/math/plot.ts — standalone function plots

- `PlotFn`, `PlotSpec { functions, xMin, xMax, yMin | null, yMax | null, grid }`, `PLOT_COLORS` (six), `DEFAULT_PLOT` (`sin(x)` on −10..10) (`src/math/plot.ts:6-25`). Picture 560×400 with 28-px padding, 1200 samples.
- `compileExpr(expr)`: mathjs `compile` after stripping `y =`, then a probe evaluation at `x = 1.2345` which "surfaces "Undefined symbol" errors early" (`:33-37`).
- `fmt`: as the live graph's but `toExponential(0)`.
- `plotToSvg(spec)` (`:48-158`): throws `"x range: min must be less than max"`; samples every non-empty function (errors → `NaN`); auto y-range from the 2nd–98th percentile of all finite values ("so asymptotes (tan, 1/x) don't flatten everything"; −5..5 when there are none), padded 10 % of the span (the span is taken as 2 when `hi − lo` is 0, `:77`), honouring a fixed bound (`??=`, so a fixed `yMin` keeps an auto `yMax`); throws on an empty y range. Draws the background, grid lines and labels (`niceStep(xRange)` and `niceStep(yRange, 8)`, skipping the near-zero label), axes with an arrow marker, italic `x`/`y`, then the curves with the two-break rule (clamped to `[−H, 2H]`) inside a clip, and a legend of `y = expr` rows with translucent white backing sized by `40 + 7.2·length` capped at 240. Tests pin: a parabola is one polyline, `1/x` at least two, `sqrt(x)` one, an empty expression draws nothing, grid adds markup, equal x bounds throw (`tests/plotting.test.ts:22-33`).

### src/math/transform.ts — the 2×2 plane transformation

- `TransformSpec { type: "transform", m: [a, b, c, d], t, grid, shape }`, `DEFAULT_TRANSFORM` (`[2,1,1,2]`), eight `TRANSFORM_PRESETS` (`src/math/transform.ts:6-25`). Picture: `S = 460`, `PAD = 16`, `HEAD = 70` for the matrix header.
- `transformToSvg(spec)` (`:36-119`): interpolates `a = 1 + (a0 − 1)t, b = b0 t, c = c0 t, d = 1 + (d0 − 1)t` ("so the slider "animates" the transformation"); `det = ad − bc`. View half-range `R = min(10, ceil(max(3, |a|+1, |b|+1, |c|+1, |d|+1, |a+b|+1, |c+d|+1)))` (`:45-46`). Draws a faint original grid and grey axes; if `grid`, the transformed grid lines over `±3R` in light blue; the unit square's image as an orange parallelogram with `|det|` printed at its centre (`0` when under 1e−9); if `shape`, an "F" polygon dashed in its original place and filled in violet after transformation (mirrored when `det < 0`); basis arrows `î → (a, c)` green and `ĵ → (b, d)` red with markers; a header with `M =` in parentheses (columns coloured like the arrows) and `det M = a·d − b·c = det` with the result in bold orange. Tests read that bold span: `[2,1,1,2] → "3"`, at `t = 0` `"1"`, a reflection `"−1"`, a singular matrix `"0"`, and halfway from the identity to `diag(3,1)` prints `2` (`tests/plotting.test.ts:35-44`).

### Pinned invariants (from the four test files)

- Live arithmetic: hand gearing, `turn` symmetry, 12-hour time strings; every device's probabilities sum to 1 and 60 000 seeded draws match within 0.012; the bag never draws an absent colour; tally snapshot thinning and the trial cap; the dot product identity for all pairs; `paramsOf` ignores `x`, mathjs names and function names; `sample` splits `1/x` into two runs; `stepFor` values; `substitute` output strings and that the frozen expression evaluates equal; `syncParams` keeps/creates/drops; `zoomView` halves about the origin; every `initialLive` survives JSON and is a fresh clone (`tests/live.test.ts`).
- Shapes: unique ids equal to the locale's name keys; every group non-empty; every piece finite, paths ≥ 2 points, labels non-empty, bounds within 520×420; deterministic builds; ruler numerals; set-square angles; clock and 360° protractor orientation; net areas equal surface areas; locale words appear; number lines contain exactly one horizontal row of segments (`tests/shapes.test.ts`).
- SVG: dark/light round trip and idempotence; data URL round trip with Georgian text; the Georgian font appears in rendered algebra SVG (`tests/svg.test.ts`).
- Plotting: `niceStep` values; curve counts and the asymptote split; range errors; the transform's determinant text at several matrices and at `t = 0` and `t = 0.5` (`tests/plotting.test.ts`).


## 7. The maths library, part A: arithmetic, number, algebra, linear algebra

Eighteen modules under `src/math/`. Each one is a pure function from a *spec* (what the pupil typed, plus a mode) to a `RenderedSvg` (`{ svg, width, height }`, the type from `./latex`). The dialogs in `src/panels/*` own the form; these modules own the mathematics and the picture. Nothing here touches the DOM.

Shared conventions, used by nearly every file below:

- **`chart.ts`** supplies the page: `W` (page width, 640), `compose(headerTex, bodySvg, bodyHeight, captions)` (header formula, body, captions, one SVG), `texLines(rows, y)` (a column of `TexLine { tex, op?, color? }`: the formula on the left, the "what was done" label on the right), `texAt(tex, x, y, anchor, scale, color)` (one TeX snippet placed in the SVG), `makeFrame/axes/curve/dot/lbl/yRange/sampleY` (plot frames), `C` (the palette: `C.blue #1971c2`, `C.orange #e8590c`, `C.green #2f9e44`, `C.purple #9c36b5`, `C.red #e03131`, `C.grey`, `C.ink #1e1e1e`), `fill(template, vars)` (the `{name}` substitution used for every localised sentence), `r2` (round to 2 dp), `nt/tn` (a number as text / TeX with n significant digits), `nf`, `FONT`, `esc`.
- **`fraction.ts`** `Frac { n, d }` with `add/sub/mul/div/neg/abs/isZero/isOne/isInt/isNeg/tex()/texP()/toNumber()/Frac.parse`.
- **`expr.ts`** the expression tree `E` (`num | var | add{ts} | mul{fs} | pow{b,e} | fn{f,a} | log | e | pi | d`), `parseE`, `tex`, `simp`, `tidy`, `substitute`, `evalE`, `toPoly`, `realRoots` (exact roots as `QS = {a, b, s}` meaning a + b√s, plus numeric approximations), `sqrtSplit`, `rootFrac`, `powFrac`, `exprMessages` (installs the translated error strings).
- **`latex.ts`** `latexToSvg(tex, color)` → `RenderedSvg` (MathJax, server side).
- **`algoArrays.ts`** `cell(x, y, w, h, text, role, size, bold)`, `table(x, y, cols, rows, rowH)`, `txt`, `legendRow`, `ROLES` — the "array of cells" furniture used by the number-theory, combinatorics and mental-maths pages.
- **Words objects.** Every module that writes sentences takes a `…Words` record from the locale (`src/locales/en.ts` etc.). The module keeps it in a module-level `let words` set at the top of `render…` (e.g. `src/math/algebra.ts:68`, `:1001`), so errors thrown deep inside the arithmetic can still be translated. Error messages are thrown as `Error(words.something)`; the dialog shows `err.message`.
- **Presets.** Every module exports a `…_PRESETS` table keyed by topic/mode; `tests/presets.test.ts` lists every tool with its presets and renderer in a `TOOLS` table (`:46-80`) and its one loop (`:81-99`) renders every preset of every tool in every locale and fails on a thrown error or a stray `NaN`/`undefined` in the SVG.

---

### `src/math/placeValue.ts` — base-ten blocks on a place-value mat

186 lines. No imports except the `RenderedSvg` type. Shared by the interactive drag-and-drop mat and the static board image (`:1-2`).

#### Types and constants

- `PVKind = "h" | "t" | "o"`; `PV_KINDS = ["h","t","o"]` is the left-to-right order on the mat (`:5-6`). `PV_VALUE = {h:100, t:10, o:1}` (`:7`).
- `PV_CAP = {h: 9, t: 30, o: 30}` (`:9`): the maximum blocks a column holds. Hundreds stop at 9 because "there is no thousands column" (`:8`); tens and ones go to 30 so the pupil can pile up un-regrouped blocks and then trade.
- `PlaceValueSpec = { type: "placeValue"; h; t; o; showTotal: boolean; labels?: [string,string,string] }` (`:11-18`). `labels` are the column titles in the UI language at insert time, so the saved image keeps its language; when absent the board image falls back to `Hundreds / Tens / Ones` (`:154`).
- `PV_COLORS` (`:20-24`): hundreds blue (`#a5d8ff/#1971c2`), tens green, ones orange. `BLOCK` sizes (`:28-32`): flat 60×60 (10×10 units of 6 px), rod 8×80 (1×10 units of 8 px), cube 15×15.

#### Blocks: `blockSvg(kind)` (`:35-50`)

Returns a standalone `<svg>` for one block. A flat gets a 9+9-line grid path (`M{i*6},0V60M0,{i*6}H60`), a rod gets 9 horizontal lines every 8 px, a cube gets a white "shine" rect at (2.5, 2.5). Corner radius 2.5 for cubes, 1.5 otherwise. The same string is reused inline by the board image via `.replace("<svg ", `<svg x=… y=… `)` (`:172`).

#### Layout: `blockPositions(kind, n)`, `columnHeight` (`:54-83`)

`COL_W = 196`, `COL_PAD = 12`; the content width is `inner = 172`. Positions are top-left corners inside the column:
- flats: 3 per row, 66 px pitch, centred (`x0 = (inner − (3·66−6))/2`), rows every 66 (`:61-64`);
- rods: 10 per row at 12 px pitch, rows every 90 (`:65-68`);
- ones: *ten-frames*, "2 rows of 5, two frames per row, so tens are easy to spot" (`:69`): frame index `f = ⌊i/10⌋`, row-in-frame `r = ⌊(i mod 10)/5⌋`, column `c = i mod 5`; frames are 92 px apart horizontally, 44 px vertically, cubes 16 px apart (`:70-74`).

`columnHeight` is `max(y) + block height`, 0 for an empty column (`:79-83`).

`pvTotal(s) = 100h + 10t + o` (`:85`). `expanded(s)` writes `"125 = 100 + 10 + 15"` — "shows un-regrouped columns honestly" (`:87-92`): the parts are `h·100, t·10, o` with zeros dropped; a single part prints just the total.

#### Trading rules: `applyDrop`, `breakDown`, `regroup` (`:96-147`)

`Counts = {h,t,o}`, `DropResult = { counts; message?: "wrong" | "need10" | "full" }`. `applyDrop(counts, kind, from: "tray"|"mat", to: PVKind|null)` (`:106-124`) implements the four rules in the doc comment (`:102-105`): from the tray, dropping on its own column adds one (cap check → `"full"`), on another column → `"wrong"`, off the mat → no change; from the mat, off the mat removes one, same column no-op, one column to the right (`idx(to) − idx(kind) === 1`) → `breakDown`, one to the left → `regroup`, two away → `"wrong"`. `breakDown` (`:127-135`): 1 block → 10 of the next smaller kind, refused with `"full"` if `lower + 10 > cap`; with no block to break, or for ones (no smaller kind), it returns the counts unchanged and without a message (`:130`). `regroup` (`:138-147`): needs 10 of the kind (`"need10"`), refused if the higher column is at cap; regrouping hundreds (no higher kind) is a silent no-op (`:141`). All three copy the counts; nothing is mutated.

#### Board image: `renderPlaceValue(spec)` (`:153-186`)

`PAD = 12`, `HEAD = 34` (column title band), `FOOT = 36` (count under the column). `body = max(90, max columnHeight) + 2·COL_PAD`; width `3·COL_W + 2·PAD = 612`; height adds 44 when `showTotal`. Each column: a tinted title rect (`opacity 0.6`), the title text at 15 px/600, the blocks at `(x + COL_PAD + p.x, PAD + HEAD + COL_PAD + p.y)`, and the count at 22 px bold — **red (`#e03131`) when ≥ 10**, i.e. when it should be regrouped (`:175`). The total line uses `expanded(spec)` at 22 px (`:178-179`). Font stack includes `Noto Sans Georgian, Sylfaen` for the Georgian locale.

Presets live in `models.ts` (`pvEmpty`, `pv234`, `pvRegroup` = 0/1/15, `pvBorrow` = 1/0/3; `src/math/models.ts:506-511`).

---

### `src/math/division.ts` — long division in three school layouts

276 lines, no imports but the type. Header comment (`:1-8`): *bracket* (English), *corner* ("уголком", Russia/Georgia/Europe, decimal comma), *short* (bus stop, remainders carried as small digits). "Each step is one quotient digit: divide, multiply, subtract, bring down."

#### Spec

`DivisionSpec = { type: "division"; style: DivisionStyle; a; b; decimals; step }` (`:13`). `DIVISION_LIMITS = { a: 99 999 999, b: 9 999, decimals: 10 }` (`:14`); `DIVISION_STYLES = ["bracket", "corner", "short"]` (`:12`). `step` is how many quotient digits to reveal (large = all).

#### `planDivision(a, b, decimals): DivisionPlan` (`:20-51`)

Pure integer arithmetic. `digits` = the decimal digits of `a` followed by `decimals` zeros. The first step "uses the shortest prefix that is at least b (or all the whole-number digits)" (`:24-27`): `first` advances while `cur < b`. Then for each position `pos` from `first`: `cur = r_prev·10 + digit`, `q = ⌊cur/b⌋`, `r = cur − q·b` (`:32-35`). Past the decimal point (`next >= intLen`) it stops when `r === 0` (exact) and detects a **repeating decimal** with `seen: Map<remainder, position>` — when a remainder recurs, `repeatFrom` is the position where that remainder first produced a digit (`:38-45`). This is the standard "same remainder ⇒ cycle" argument; since remainders are < b the loop is bounded by `decimals`. Trailing zero digits that were never used are sliced off (`used = max(intLen, last.pos+1)`, `:47-50`). Returns `{ digits, intLen, steps, repeatFrom, first, exact }`. `divisionStepCount(spec)` = `steps.length` (`:53-55`).

#### `quotientText(plan, sep, upTo)` (`:73-85`)

Writes the quotient as text: leading zeros suppressed until the first non-zero digit or the units position (`st.q || started || st.pos >= intLen − 1`), the separator inserted at `pos === intLen` (with a leading `"0"` if nothing started), `"("` at `repeatFrom` and `")"` at the end — e.g. `52.08(3)`. `upTo` stops after that many digit positions past `first` (the corner layout passes the step `k`, `:216`, `:224`).

#### `renderDivision(spec)` (`:87-276`)

Rejects non-integers, `a < 0`, `b < 1`, or anything over the limits with `Error("range")` (`:89`); clamps `decimals` to `[0, 10]` and `step` to `[0, steps.length]`. Monospace `FONT` (`Consolas, Courier New`), `cw = 24` px per digit column, `rowH = 30`. `colX(x0, c)` centres column `c`, shifting decimal digits 8 px right to make room for the point (`:102-103`). Decimal digits are drawn grey (`:121`, `:156`).

- **short** (`:111-138`): column pitch 34; divisor at `x0 − 16`, a quadratic-curve bracket, a top line; quotient digits green bold at `y0 − 38` (a leading zero is skipped, `:127`); each remainder as a 14 px orange digit tucked before the next column (`:130`); an overline (green, `y0 − 62`) spans the repeating block once `done`.
- **bracket** (`:139-147`): divisor, the `)`-curve and bar; then the shared working below.
- **corner** (`:148-153`): `x0 = 40`, no bracket; the divisor goes in a box to the right.

The shared working (`:155-242`): it builds `lines` (product rows and remainder rows) with a row counter. For a step with `q > 0` (or the first step) it emits a *product* line (`q·b`, right-aligned to `s.pos`) and a *remainder* line whose text is the remainder followed by the brought-down digit — a zero remainder is left out when a digit follows (`:167-173`); a zero-quotient step adds no subtraction, it only appends the next digit to the current remainder row — "A zero in the quotient: nothing to subtract, just bring down the next digit" (`:174-177`). Product digits are orange with a `−` and an underline (`:189-193`); the brought-down digit is blue, and every bring-down also gets a dashed blue vertical line down from the dividend (`:196-201`). For the bracket layout the quotient sits above (`y0 − 38`), a leading zero is skipped (`:207`), the repeat overline at `y0 − 60`. For the corner layout a vertical rule at `vx` and a horizontal rule separate the divisor box; the quotient (via `quotientText`) is typed under the divisor at 13.2 px per digit, 9 px for the comma, with the `( )` turned into an overline (`:214-241`). The corner layout also uses `,` as the decimal separator (`:94`) and `:` instead of `÷` in the result lines (`:246`).

The result block (`:244-262`): when done and `decimals === 0` with a remainder, `a ÷ b = whole ʳ⁄ₑ` using Unicode superscript/subscript digits (`sup`, `sub`, `:67-70`) plus `a = b × whole + r`; otherwise `=` for exact or repeating, `≈ …` with an ellipsis when neither (`:255-256`), and a multiplication check `b × q = a` for exact integer quotients. Mid-way it shows the current step `cur ÷ b → q · q × b = … · cur − … = r`. The canvas width is `max(layout width, text width estimate, 200)`.

Presets (`models.ts:496-505`): `div624` (624÷12), `div625` (remainder), `divZero` (8136÷4, a zero in the quotient), `divBig`, `divDecimal` (7÷8, 4 dp), `divRepeat` (1÷7, 10 dp), `divCorner`, `divShort`.

---

### `src/math/multiply.ts` — five multiplication models

305 lines. `MultiplyStyle = groups | array | numberline | area | lattice`; `MultiplySpec = { type: "multiply"; style; a; b; step }` (`:6-9`). "a × b reads 'a groups of b'" (`:2`). `MULTIPLY_LIMITS` (`:11-17`): groups a≤10, b≤12; array 12×12; numberline 10×12; area 999×999; lattice 99999×99999. `renderMultiply` (`:289-305`) throws `Error("range")` outside those or when `a` or `b` is below 1 (`:291`), and clamps `step` to `[0, stepCount]`.

#### `placeParts(n)` (`:44-50`)
234 → `[200, 30, 4]`, zeros dropped, `[0]` for 0.

#### `stepCount(spec)` (`:53-60`)
area: `parts(a) × parts(b)` cells; lattice: `m·n + m + n` ("every cell, then every diagonal"); otherwise `a` (one group/row/jump per step).

#### The models
- **groups** (`:62-88`): each group is a rounded rect (`rx = min(gw,gh)/2`) holding `b` dots in rows of 5 (`P = 22` pitch, `r = 8`); unrevealed groups are dashed grey; revealed groups get the skip count `(g+1)·b` in orange beneath. Up to 5 groups per row. Equation line: `a × b = b + b + … = ab` when complete, else partial sum.
- **array** (`:90-114`): `P = 30`, `r = 10`, rows alternate blue/green; each revealed row shows its cumulative count at the right; when done and `a ≠ b` a grey second line states the commutative product `b × a`.
- **numberline** (`:116-148`): unit `= clamp(560/(L+1), 4, 36)` with `L = ab`; ticks at every unit only if `unit ≥ 9`, majors every `b`; landed multiples are orange bold; jumps are quadratic arcs with arrowhead marker `#j`, arc height `min(60, 18 + 0.35·b·unit)`, labelled `+b`.
- **area** (`:150-197`): place-value grid. Widths/heights proportional to the parts but never under `MIN` (92 px wide, 58 px tall; `size` at `:154-157`, the widths sharing 460 px, `:159-160`); the height budget `min(320, max(120, 460·a/b))` keeps aspect ≈ a:b "so it really has area a × b" (`:158-160`). Cells cycle through six `CELLS` colours; each shown cell carries `rp × cp` and the partial product. Equation: sum of partial products.
- **lattice (gelosia)** (`:199-287`): digits of `a` across the top, `b` down the right; cell size `S = min(72, 380/max(m,n))`, `D = 0.62·S` extension of the diagonals. `place(i,j) = (m−1−j) + (n−1−i)` is the place value of a cell's units digit (`:216`); each product contributes `p mod 10` to band `place` and `⌊p/10⌋` to band `place+1` (`:218-224`). Inside a revealed cell the tens digit is blue (upper-left) and the units digit orange (lower-right), at `0.34·S` (`:246-251`). Bands are summed from the right with carries (`carryIn`, `digit`, `:225-231`). Steps reveal cells row by row, then bands; the band being summed is highlighted `#ffd8a8`, finished bands alternate `#d0ebff/#fff3bf` (`:232-234`). Answer digits sit along the bottom (bands `q < m`) and up the left (`at(q)`, `:262-263`); a leading zero is greyed; carries are small orange digits by the next band. Below the grid the current band's addition is written out (`:275-282`).

Presets (`models.ts:461-470`): `mulGroups` 3×4, `mulArray` 4×6, `mulJumps` 5×3, `mulDistributive` 7×12, `mulArea` 23×14, `mulBig` 123×45, `mulLattice` 234×56, `mulLatticeBig` 4567×382.

---

### `src/math/fracop.ts` — fraction arithmetic with bars and the area model

284 lines. Imports `C, compose, r2, texAt, W` from `./chart`. `FracOpSpec = { type: "fracop"; op: "+"|"-"|"×"|"÷"; a: string; b: string; step }` (`:9-11`).

#### Parsing: `parseFrac(src)` (`:28-55`)
Accepts `"3/4"`, `"1 2/3"` (mixed), `"-2"`, `"0.25"` (comma allowed). Returns `{ q: {n, d} (unreduced — "the numbers as the pupil writes them", :13), tex, convert }` where `convert` is the LaTeX of the conversion step (mixed → improper `w·d + n`; decimal → `n/10^k`, reduced by the gcd). Zero denominators → `null`.

#### `planFracOp(spec)` (`:77-140`)
Throws `"parse"` or `"zero"` (division by a zero numerator). Emits `Line { tex, note? }` rows:
1. conversion lines from both operands;
2. `+`/`−`: `L = lcm(d1, d2)`; if denominators differ, the scaling line `n1·k1/(d1·k1) ± n2·k2/(d2·k2)` with note `lcm(d1,d2) = L`; then the combined numerator with explicit sign handling of a negative second numerator (`:101`);
3. `÷` becomes `×` by the reciprocal (note `(n2/d2)^{-1}`), keeping the sign on the numerator (`:107`);
4. `×`: **cross-cancel before multiplying** with `g1 = gcd(m1, e2)`, `g2 = gcd(m2, e1)` written as `\overset{v/g}{\cancel{v}}` (`:111-121`), then the product.
`finish` (`:58-73`) simplifies by `gcd(n, d)` (one line with note `gcd(|n|, d) = g`) and converts an improper result to a mixed number (`|n| = |w|·d + r`). A decimal value is appended: exact (`= value`) if the reduced denominator has only factors 2 and 5 and prints in ≤ 10 chars, else `≈` to 4 dp (`:128-135`). The final line restates the problem `A op B = result`. `fracOpStepCount` = number of lines, 0 on error (`:142-148`).

#### Pictures: `bars` and `picture` (`:155-258`)
`bars(x, y, w, h, parts, runs, scaleWholes)` draws whole-bars of `parts` cells each, several wholes side by side 12 px apart, each run of cells in its colour or a 45° hatch pattern `#fo-hatch`; cell lines are drawn only when `parts ≤ 60` (`:171`). `picture` chooses by op and only for non-negative operands:
- `+`/`−` (`:186-208`): three rows on the common denominator `L` (the two operands and the result; for `−` the result row shows the difference in green plus the subtracted part hatched, and is omitted when `a < b`); each row is labelled on the left with its fraction and the `+`/`−`/`=` sign (`:203`), bars 38 px tall, 58 px apart. Skipped when `L > 60` or the total exceeds 4 wholes.
- `×` (`:209-229`): the area model, a 230 px square split `a.d` columns × `b.d` rows; the overlap (`i < a.n` and `j < b.n`) is green, only-a blue, only-b orange; labels in colour, the product (and its reduced form) in green to the right (`:226-227`); condition: both ≤ 1 and denominators ≤ 20.
- `÷` (`:230-256`): "how many times does b fit into a", both on `L`: one bar of `a1` cells with brackets under each copy of `b1` (orange when full, purple with the fraction `(e−s)/b1` for a partial copy; full copies are numbered), and the line `a1/L = result × b1/L` in green (`:254`); skipped when `L > 60`, more than 4 wholes, or more than 16 copies.

`renderFracOp` (`:260-284`): lines at `x = 24`, 62 px apart (76 when a `\cancel` needs headroom), notes in grey to the right if they fit else on a line below, the last line green and slightly larger; the picture is translated under the lines; `compose(problem = ?, …)`.

Presets (`models.ts:486-495`): `foAdd` 2/3+3/4, `foSameDen`, `foSub`, `foMixed` 2 1/3 + 1 3/4, `foMul`, `foCancel` 8/15×5/12, `foDiv` 3/4÷1/8, `foDivMixed`.

---

### `src/math/percratio.ts` — percentages and ratios with Singapore bar models

461 lines. Imports `chart` helpers and `Frac` (for `numOf` and ratio terms). `PercRatioSpec = { type: "percratio"; kind: PRKind; p; a; b; ratio; up: boolean; step }` (`:23`); fields by kind are documented at `:17-22`: `of: p, a` · `whatPercent: a (part), b (whole)` · `reverse: p, a` · `change/reverseChange: a, p, up` · `percentChange: a (old), b (new)` · `interest: a (principal), p (rate), b (years)` · `simplify: ratio` · `share: ratio, a (total)` · `partKnown: ratio, a (known value), b (1-based part index)` · `proportion: ratio, a (first term of the second ratio)`. `U` (`:25`) is the unit square `{\color{#1971c2}\blacksquare}` used inside the LaTeX so "the picture needs no words" (`:5-6`).

Numbers: `numOf` parses via `Frac.parse`, throwing `"number"` on failure (`:27-31`); `fmt` rounds to 4 dp and flags inexactness so `eq(v)` prints `=` or `≈` (`:33-41`). `parseRatio` splits on `:` or `∶`, 2–4 positive terms, else `"ratio"` (`:43-51`).

Drawing helpers: `rect`, `brace(x1, x2, y, label, up, color)` — a curly bracket path with a `texAt` label 30 px away (`:67-74`), `ticks(x, y, w100, maxPct, marks)` — 10 % ticks (taller at 50s) and labels at 0, 100 and the marked percentages (`:76-81`).

#### `planPercent(spec)` (`:85-292`)
Bars are `BW = W − 120` wide for 100 %, scaled down when the percentage exceeds 100 (`w100 = BW·100/maxP`).
- **of**: `100% = X`, `1% = X/100`, `p% = p·(1%)`, with note `p/100·X`, then the restatement `p% · X = R`; bar: white 100 % with the blue `p %` part, brace on top (X) and below (p % = R), ticks.
- **whatPercent**: `A/B = …`, `×100%`, restated; `B` zero → `"zero"`.
- **reverse**: `p% = A`, `1% = A/p`, `100% = 100·(1%)` (note `A ÷ p/100`); `p` zero → `"zero"` (`:148`); top brace green `? = Wh`.
- **change / reverseChange**: `q = 100 ± p` (must be > 0 → `"range"`), multiplier `m = q/100`. Forward: `A·m`. Reverse: `q% = A`, `1% = A/q`, then **the classic mistake line in red** — "taking p% of the new value instead of the original" (`:191-193`) `A ∓ p%·A ≠ orig` — then `100% = …`. Picture: two bars, original (100 %) and new (`q %`); an increase adds a green strip past 100 %, a decrease shows the removed strip in dashed red at 55 % opacity.
- **percentChange**: `A` zero → `"zero"` (`:221`); `B − A = d`, `d/A·100%`, note `B/A = …%`; bars as above with the brace over the difference.
- **interest**: `n` years (rounded, 0–30 else `"range"`, `:252-253`), simple `P(1 + rn/100)` vs compound `P(1 + r/100)^n`, money rounded to 2 dp (`m`, `:260`); picture is a year-by-year bar chart, compound blue, simple grey outline, up to 60 px per year, year labels thinned past 12 years.

#### `planRatio(spec)` (`:311-427`)
`toInts()` (`:318-333`): multiplies by the lcm of denominators (note `·L`), divides by the gcd (note `÷g`). `unitRows(y, units, unitValue, labels)` (`:297-309`) draws one row of unit squares per part (size `min(54, ⌊(W−200)/max⌋)`), each square labelled with the unit value when ≥ 26 px.
- **simplify**: the gcd/lcm lines (or `gcd(…) = 1`), for two terms also `1 : k` and `k : 1`; picture only when all terms are integers (each square is a group of `g`) and the simplified sum ≤ 40.
- **share**: `sum ■ = T ⇒ 1 ■ = T/sum`, each part `v·u`; picture: rows plus a right bracket with the total; skipped when the largest part exceeds 30 units (`:365`).
- **partKnown**: `idx` must exist (`"part"`), `1 ■ = V/ints[idx]`, every part, the total `sum·u`; the known row gets a blue bracket (same 30-unit skip, `:388`).
- **proportion**: two terms only (else `"ratio"`, `:398`); cross-multiplication `a·x = b·c`, `x = bc/a`, note the scale factor `k = c/a`; picture: a 2×2 ratio table with purple `×k` arrows (marker `#pr-ah`).

`planPercRatio` dispatches by kind membership (`:429-431`); `percRatioStepCount` = line count or 0 (`:433-439`). `renderPercRatio` (`:441-461`): lines at `x = 24`, 54 px apart (66 when the line has a superscript or `\left`), notes right or wrapped, last line green, then the picture.

Presets (`models.ts:471-485`): thirteen, `prOf` … `prProportion`, including `prSimplifyFrac` with `"1/2 : 3/4"`.

---

### `src/math/models.ts` — the pictorial-model hub

517 lines. Imports the five renderers above and defines its own four: bar model, fraction bars/circles, percent grid/bar, number bond (`:1-8`). `ModelSpec` is the union of all nine spec types; `ModelType = ModelSpec["type"]` (`:25-26`). `renderModel(spec)` switches on `type` (`:376-397`). `MODEL_COLORS` is the six-colour palette (`:10-17`).

Helpers: `esc` (XML escape), `textWidth(s, size) = len·size·0.56` (a monospace-ish estimate used everywhere for layout), `fracLabel(cx, cy, n, d, size)` — a stacked fraction with a rule (`:45-52`), `hBrace`/`vBrace` — curly braces built from quadratic curves with a tip at `a + dir·h` (`:55-70`), `wrap` (`:72-80`).

#### Bar model (`:84-194`)
`BarRow = { label; segments: string; total: string }`, `BarModelSpec = { type: "bar"; rows; grandTotal; showNumbers }` (`:19-20`). `parseSegment` (`:87-94`): `"40=?"` → value 40, label `?`, `unknown` true when the label contains `?`; with `showNumbers` false and no `=label`, the label is empty. An item that is not a positive number (`^\d+(\.\d+)?`, optionally `= label`) throws an `Error` whose message is the quoted item (`:88-91`); a bar with no segments at all, or a fraction spec with no row of `d ≥ 1`, throws `"empty"` (`:119`, `:200`). `parseSegments` (`:100-115`) is a sticky-regex tokenizer: `[1, 1]=?` makes a bracketed group → `SegmentGroup { start, end, label }`; separators `,`/`;`; leftover text → `Error("syntax")`. `renderBar`: `BW = 480` for the longest row (`scale = BW/maxSum`), `BH = 44`, `GAP = 18`; unknown segments are white with dashed stroke and a bold coloured label; a label that does not fit goes above at 13 px; groups get a brace under the row with its label; the first row's total goes on a brace above, later totals below; `grandTotal` draws a vertical brace at the right across all rows.

#### Fractions (`:198-262`)
`FractionSpec = { type: "fraction"; rows: {n, d}[]; shape: "bar"|"circle"; unitLabels }`. Bars: `WB = 420` (300 when more than one whole), `BH = 48`, `wholes = max(1, ⌈n/d⌉)`, shaded while `w·d + k < n`; unit labels `1/d` in each cell at 12 px when the cell is ≥ 26 px. Circles: `R = 64`, sectors as `A` arcs from `−π/2`, `large` flag when the sector exceeds π (only for d = 1, handled separately as a full circle), labels at 0.62 R along the bisector when `d ≤ 12`.

#### Percent (`:266-341`)
`PercentSpec = { type: "percent"; percent; of: number|null; style: "grid"|"bar" }`. `percentSummary` (`:269-274`): `p% = p/100 = (p/g)/(100/g)` with `g = gcd(p, 100)`, plus `p% × of = …`. Grid: 10×10 cells of 26 px filled **column by column** "so each full column reads as 10 %" (`:291`), with a partial cell for decimals (`frac = clamp(p − i, 0, 1)`). Bar: 500×44 with 10 divisions, a marker line at `p %`, the label above (lifted higher when `p ≤ 6` or `p ≥ 92`, `:320-321`; `percent` is clamped to `[0, 100]` first, `:282`), and when `of` is given a double number line beneath with `0`, `of`, and `p%·of` (a label within 30 px of the marker is suppressed).

#### Number bond (`:345-374`)
`BondSpec = { type: "bond"; whole: string; parts: string[] }`. Radius `max(34, textWidth(s,20)/2 + 14)`; parts spaced `max(120, 2r+24)`; the whole sits above at `wy = PAD + RW`, the parts 80 px below its bottom; connecting lines are trimmed to the circle edges by `atan2`; a `?` label makes a white dashed circle.

#### Presets (`:401-517`)
`DEFAULT_MODELS` gives one default per type (`step: 999` means "everything shown"). `PRESETS` lists: bar (`partWhole`, `comparison`, `units`, `fractionOfSet`), fraction (`single`, `equivalent` 1/2,2/4,4/8, `compare`, `improper` 5/4), percent (`percentOf`, `hundredGrid`, `discount`), multiply, percratio, fracop, division, placeValue, bond (`bond10`, `bondThree`, `bondFraction`).

---

### `src/math/mental.ts` — Vedic speed maths, mental division, divisibility, reciprocals and the Major System

1088 lines. Imports `cell/table/txt` from `./algoArrays`, chart helpers, and takes `MentalWords` (`:26-66`) for every sentence. `MentalSpec = { topic: MentalTopic; a; b; c; base; op: CheckOp; sys: MajorSystem; words; method?: DivMethod }` (`:24`); `MENTAL_TOPICS = multiply | divide | check | rules | recip | sqrt | cbrt | cube | magic | major` (`:10-11`), `DIV_METHODS = base | flag | table` (`:13-14`, documented as "base: Nikhilam "transpose and apply" (divisor just below a power of 10) · flag: Dhvajanka · table: Trachtenberg's simple method.", `:12`), `CHECK_OPS = + − * /`, `MAJOR_SYSTEMS = en | ru`. Field use per topic is documented at `:20-23`; that comment and the header comment (`:1-5`) name only the seven original topics. `renderMental` (`:563-586`) switches on the topic.

Helpers: `pretty(n)` groups thousands with plain spaces and uses the true minus `−` (`:68-73`); `int(s, w, max = 10¹²)` strips spaces/underscores/commas, requires `^-?\d+$` (else `w.bad`), rejects `|v| > max` with `w.tooBig` (`:74-80`); `ds(n)` is the **digital root with 9 for multiples of 9** (`1 + (|n| − 1) mod 9`, 0 only for 0) (`:81-82`).

#### Multiplication near a base: `renderMultiply` (`:87-217`)
`A, B ≤ 99 999`, both positive. The base is the typed one or the power of ten (10…100000) minimising `|A − P| + |B − P|` (`:93-98`); a typed base must be positive and ≤ 100 000 (`:94-95`). Offsets `a = A − base`, `b = B − base`; the cross sum `cross = A + b` (= `B + a` = `base + a + b`, `:101`); `ab` the product of offsets. Identity shown in TeX: `(B + a)(B + b) = B(B + a + b) + ab` (`:215`). When the base is a power of ten (`k = log10(base)` integral) the answer is "left | right" with `right` padded to `k` digits; a right part ≥ base **carries** (`⌊right/B⌋` into the left), a negative right part **borrows** `⌈−right/B⌉` from the left (`:129-148`); otherwise the line is `cross × base ± |ab|` (`:149-157`). The classic two-column layout: numbers at `colL = 110`, offsets at `colR = 180` (red for deficits, green for surpluses), a dashed blue cross line (`:109-125`). Area picture when both offsets share a sign (`:160-206`): a 190 px square at `X = 360`; for deficits, the `(B−|a|)(B−|b|)` rectangle is the square minus two strips with their purple overlap "removed twice" (hence `+ab`); for surpluses, the square plus two strips and the corner `ab`. Strip fractions are clamped to `[0.16, 0.42]` and a "not to scale" note is added when clamped (`:165-167`, `:203`).

#### Digit-sum check: `digitRow`, `renderCheck` (`:222-311`)
`digitRow` (`:222-249`): the digits in cells; nines and **greedy pairs summing to 9** are struck out (they do not change the digit sum, `:224-228`); then the chain `sum → sum of digits → …` to one digit, and the root `ds(n)` in a blue circle. `renderCheck`: `A, B ≥ 0`, `A ≥ B` for subtraction (`w.chk.noMinus`), `B ≠ 0` for division; the truth is computed exactly and must be a safe integer (`:260-261`). The claimed result `c` (blank = the truth) may carry a remainder `"q r R"` split on `r|R|ост|ნაშთ` (`:266`). The check: for `÷`, `ds(ds(B)·ds(Q) + ds(R))` must equal `ds(A)`; for `−` the raw difference is reduced mod 9 first (`:294`); 9 and 0 are treated as equal (`:295`). Verdicts: `fail` (red) when the sums disagree; `pass` when they agree and the claim is right; **`passWrong` (orange) when the digit sums agree but the claim is wrong** — the test pins `32 × 32 = 1240` (a digit swap) as `passWrong` (`tests/mental.test.ts:31`) — plus the correct value and the "misses swaps" caveat.

#### Roots: `renderSqrt`, `renderCbrt` (`:315-394`)
`SQ_END` maps the last digit of a square to the possible last digits of its root (`0→0, 1→1/9, 4→2/8, 5→5, 6→4/6, 9→3/7`); `CB_END[d]` = last digit of `d³` (`:315-316`). `renderSqrt` (N ≤ 10¹⁰, must be a perfect square): the table of `d → d² mod 10` with the matching columns highlighted; the bracket `(10k)² ≤ N < (10k+10)²` on a number line with the midpoint `(10k+5)²` in purple to decide between the two candidates (`:338-352`). `renderCbrt` (N ≤ 10¹²): split off the last three digits, the `CB_END` table, and the `n³` key (1…10) with `k` where `k³ ≤ L < (k+1)³` highlighted.

#### Anurupya cubing: `renderCube` (`:398-443`)
Two-digit `n = 10a + b`. Row 1: `a³, a²b, ab², b³` (a geometric progression with ratio `b/a`, shown as `×b/a` between columns); row 2: `2a²b, 2ab²` under the middle columns; sums; then carries from the right keeping one digit per column except the leftmost (`:407-419`). TeX: the binomial expansion with place values.

#### Magic squares: `magicSquare(n)`, `renderMagic` (`:448-495`)
The exported `magicSquare` implements the **directional walk** of the doc comment (`:447`): start in the middle of the right column, go south-east with wrap-around; when blocked (or after the bottom-right corner) step west instead; the set `west` records which numbers were placed by a west step. `renderMagic` (odd n, 3–9): cells with roles (`pivot` for 1, `compare` for west steps), row/column/diagonal sums on the edges, and the constant `n(n²+1)/2`. `tests/mental.test.ts:50-66` checks all lines sum to the constant.

#### Major System: `MAJOR`, `renderMajor` (`:499-561`)
`MAJOR.en.letters` lists the consonant classes per digit (`s z`, `t d`, `n`, `m`, `r`, `l`, `j sh ch`, `k g`, `f v`, `p b`); `decode(word)` lowercases, approximates sounds (`ph→f`, `ck→k`, `th→t`, `tch|dg|sh|ch → J`, `x → ks`), collapses doubled consonants, and maps each consonant to its digit (`c` and `q` count as 7 with `k g`), dropping vowels and `w h y` (`:502-509`). `MAJOR.ru` is the БЦК system after Kozarenko/Löser with one digit per consonant (`:511-518`). `renderMajor`: the number (≤ 24 digits, dots/commas allowed) is chunked into pairs (`/\d{1,2}/g`); for each chunk the word given is decoded and marked ✓/✗ (`sorted`/`min` roles; a chunk with no word is an `idle` cell labelled `missing`), up to 8 chunks per row; the system's letter table sits above (`:531`); captions count matches (`match`/`mismatch`), or `skeleton` when no words were given (`:554-557`).

#### Division: `renderDivide` and three methods (`:588-858`)
`divInputs` (`:593-599`) reads `N ≤ 10¹²`, non-negative (else `w.bad`), and a divisor `1 ≤ d ≤ 99 999` (`d ≤ 0` → `div.zero`), and returns the true `Q = ⌊N/d⌋` and `R = N mod d`, which every method must reproduce. `divCaps` (`:601-608`) adds the result `N ÷ d = Q, remainder R`, the check `d × Q + R = N` and, last as in every other topic, the sentence of use `w.info.divide` to every method's captions; the header is always `N \div d` with thin-space grouping (`texNum`, `:591`). `renderDivide` (`:855-858`) dispatches on `method ?? "base"`.

- **base**: `renderBaseDiv` (`:611-678`), Nikhilam, "the divisor's complement to 10^k does the dividing" (`:610`). `k` is the digit count of `d`, `B = 10^k`, and the complement `B − d` is written with `k` digits; the dividend must have more than `k` digits (`div.short`). The leftmost `qn = m − k` columns are quotient columns: each one's running column sum (not reduced to a digit) is multiplied by every complement digit and added into the next `k` columns (`:622-633`). Picture: the label `d → complement`, the dividend's digits in cells, one row of purple products per quotient column, the Σ row (`compare` cells for quotient columns, `sorted` for remainder columns) and a dashed red line between the two groups (`:648-654`). "Carries: the column values are place values, not digits." (`:656`): the quotient and remainder are read as `Σ column·10^place`, and while the remainder is still ≥ `d`, `d` is taken away and 1 added to the quotient, one `div.adjust` line each (`:664-668`). The result must equal the true `Q, R`, else `Error("internal: Nikhilam division disagrees")` (`:669`). Captions: `complement`, `far` when the complement's first digit is ≥ 5 (pointing to the flag method, `:675`), `baseHow`, then `divCaps`.
- **flag**: `renderFlagDiv` (`:681-788`), Dhvajanka: "divide by the first digit only; the other digits (the flag) are paid for one step later" (`:680`). It needs `d ≥ 10` (`div.twoDigits`) and more dividend digits than flag digits. `main` is `d`'s first digit and the flag `fl` its other `L` digits. The `qn = n − L` quotient digits are found by the method itself (`:698-714`): at each step `net = 10·r + digit − flagCost` (`flagCost`, the payment `Σ fl[j−1]·q[i−j]` over up to `L` previous quotient digits, `:693-697`), and `digitsFrom` tries the digit `min(9, ⌊net/main⌋)` first and smaller ones after it, going back whenever a later step would fall below zero; the last tail step must leave less than `d`. Larger digits are tried first, so the first digits that never go below zero and leave less than the divisor are the quotient's: with the true digits no step goes below zero, and they are the only digits that end below `d`. The search gives up with an internal error after 100 000 steps, and its digits must make `Q` (`:714`). The table then shows the working: for each dividend digit `gross = 10·r + digit`, minus the flag payment with its terms (`pay`, `:718-727`), gives `net`; a quotient row leaves `r = net − main·q`, and each of the last `L` (tail) rows sets `r = net`. A quotient digit below `min(9, ⌊net/main⌋)`, one the search had to take smaller, is marked `smaller` and shown with a red `*` (`:735`). The last `r` must equal `R` (`:741`). Picture: the main digit large in blue with the flag raised beside it in orange, then a seven-column table (`#`, digit, `10·r + digit`, `− flag`, left, `÷ m → q`, `r`) whose tail rows are labelled `R` and filled green. Captions: `flagSplit`, `flagHow`, `smaller` when a digit is starred, `fast` when the flag is one digit (Trachtenberg's fast method for two-digit divisors), `divCaps`.
- **table**: `renderTableDiv` (`:791-853`), "Trachtenberg's simple method: a table of multiples by addition (with a digit-sum check), then look up and subtract" (`:790`). `d ≤ 9 999` (`div.divisorMax`). The multiples `1·d … 10·d` are built by repeated addition, and a check column the same way from digital roots, `check_k = ds(check_{k−1} + ds(d))` (`:797-800`), which by construction equals the digital root of the k-th multiple; it is printed with ✓ and not compared. Row 10 is purple (`tableCheck`: it must be `d` with a 0 on the end). Long division by lookup (`:802-814`): digits are brought down until the partial is ≥ `d`; each step's label is `⌊partial/d⌋` and the multiple with that label is taken away. Two tables side by side (label, multiple, check; partial, take, left) and the line `label: <labels> → Q, R <R>`; a caption checks with digital roots, `ds(N − R)` against `ds(ds(Q)·ds(d))` (`:840-849`).

#### Divisibility: `divisibility`, `renderRules` (`:860-928`)
`divisibility(n)` (`:864-904`) returns one `DivTest { d, test, ok }` for each of 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, where `test` is the rule applied to this number: the last one, two or three digits (`…` and the digits) for 2, 5, 10, 4 and 8; the digit-sum chain down to one digit for 3 and 9 (9 only when the chain ends in 9); the alternating digit sum counted from the units for 11; `2 ✓/✗ · 3 ✓/✗` for 6, from the two earlier verdicts. For 7 and 13 `shrink` (`:872-877`) repeats `x → trunc(x/10) − 2·(x % 10)` while `|x| ≥ 70`, and `x → trunc(x/10) + 4·(x % 10)` while `|x| ≥ 100`, at most 40 times. Both keep divisibility: with `x = 10a + b`, `10(a − 2b) = x − 21b` and `10(a + 4b) = x + 39b`, and 10 is invertible mod 7 and mod 13. Every verdict is compared with `n % d`, and a disagreement throws `internal: rule for d` (`:902`). `renderRules` (`:906-928`, `1 ≤ n ≤ 10¹²`): a four-column table (`÷`, the rule from `w.rules.rule[d]`, the trace, ✓/✗ with a green fill on hits) and a caption listing the divisors found (`yes`) or `none`, then `also` and the sentence of use `w.info.rules`.

#### Reciprocals: `reciprocal`, `renderRecip` (`:933-1014`)
The exported `reciprocal(n)` (`:933-948`) is "1/n by long division: the digits, where the repetition starts, and the remainders on the way" (`:932`). From `r = 1 mod n` each step records `r`, emits the digit `⌊10r/n⌋` and continues with `10r mod n`. It stops at remainder 0 (terminating: `pre` = the number of digits, `period = 0`) or at the first repeated remainder, when `pre` is the position at which that remainder first appeared and `period = digits − pre`, the same "same remainder ⇒ cycle" argument as `planDivision`; the repeated remainder is appended to `rems` once more. `renderRecip` (`:950-1014`, `2 ≤ n ≤ 9 999`; a larger `n` is refused with its own `recip.tooBig`, "Up to 9 999, please", `:954`): the header `\frac{1}{n} = 0.pre\overline{cycle}` (a cycle over 36 digits prints its first 30 and `\ldots`); a table of the first 14 steps (step, remainder, × 10, digit) with the row where the cycle starts in purple and the cycle digits in blue; below it either the `more` line or the `again` line naming the remainder that came back. Captions: `terminates` or `repeats` (with the pre-period length). When `period = n − 1` and `n ≤ 29` (a cyclic number, as for 7 and 17) it lists `k/n` for `k = 1 … min(n − 1, 12)` as rotations of the cycle, the first digit red, each rotation found by matching the first `min(period, 8)` digits of `k/n` (`rot`, `:987-996`), and adds the `cyclic` and `sorted` captions. Then `use` gives the decimal to six places ("So dividing by {n} is multiplying by {dec}"), and the sentence of use `w.info.recip` ends the captions.

`tests/mental.test.ts:87-114` sends 120 random divisions through all three methods and checks the stated quotient and remainder, plus the examples from the notes (`27 483 624 ÷ 62` by the table, `8 384 ÷ 32` by the flag), `1 000 ÷ 12` by the flag, whose first digit has to be taken smaller (a starred `0` and the `smaller` caption) and the `short` and `twoDigits` errors; `:116-126` checks the divisibility verdicts on 300 numbers; `:128-148` checks `reciprocal`'s digits against BigInt division and `pre`/`period` against the larger power of 2 or 5 in `n` and the order of 10 modulo the rest, for `n = 2 … 400`, the six rotations of 1/7, and that 10 000 is refused with `recip.tooBig`; `:150-156` checks that division, divisibility and reciprocals each end with their `info` sentence, as the other topics do.

`MENTAL_PRESETS` (`:1017-1088`) include seven divisions (three near a base, three by the flag, `27 483 624 ÷ 62` by the table), five divisibility numbers, six reciprocals (`1/7`, `1/13`, `1/17`, `1/12`, `1/16`, `1/41`), seven multiplications (`7 × 8`, `97 × 94`, `88 × 88 (carry)`, `104 × 97 (mixed)`, `48 × 47, B = 50`), the five checks, five square roots, four cube roots, four cubes, 3/5/7 magic squares, and π/e/1789 word lists. Every preset is built by `P(topic, overrides)` (`:1016`), which fills the unused fields with `""`, `op: "*"` and `sys: "en"`.

---

### `src/math/numtheory.ts` — sieve, factors, Euclid, modular arithmetic, CRT, bases

856 lines. "Everything is exact (BigInt where products could overflow) and every answer is checked" (`:4-5`). Imports `algoArrays` (cells, tables, legend), chart (frames for the Diophantine graph), `NtWords` (`:33-85`).

#### Specs (`:17-31`)
`SieveSpec { topic: "sieve"; n; step }` (step = sieving primes applied so far) · `FactorSpec { n }` · `GcdSpec { mode: euclid|extended|diophantine; a; b; c }` (`c` for `ax + by = c`) · `ModSpec { op: clock|add|mul|power|inverse; a; k; m }` · `CrtSpec { mode: linear|system; a; b; m; system }` (system as `"2 mod 3, 3 mod 5, 2 mod 7"`) · `BaseSpec { n; from; to }`. `NtSpec` is the union; `renderNt` dispatches on `topic` (`:841-856`). The exported lists `GCD_MODES`, `MOD_OPS`, `CRT_MODES` (`:13-15`) and `NT_TOPICS` (`:31`) feed the dialog's selectors.

#### Arithmetic core (`:144-234`)
`intOf(s, w, lo, hi)` requires a safe integer in range (`:144-149`). Exported `gcd` (iterative Euclid on absolute values, `:151-156`), `isPrime` (trial division by odd d up to √n, `:159-164`), `factorize` (trial division returning `[p, exponent][]`, `:166-176`). `extended(a, b)` (`:179-192`) is the **iterative extended Euclid** as a table of rows `(r, q, s, t)` with the invariant `r = s·a + t·b`, started from `(a, ·, 1, 0)` and `(b, ·, 0, 1)`; the gcd and Bézout coefficients are the second-last row. `bgcd`, `bmod`, `binv` (`:194-211`) are the BigInt versions; `binv` runs the same recurrence keeping only the `s` column. `phiOf(n) = n·∏(1 − 1/p)` (`:213`). `texLines` stacks LaTeX rows (`:220-223`); `PCOL` is an 8-colour palette (`:225-234`).

#### Sieve: `sievingPrimes`, `renderSieve` (`:239-311`)
Only primes with `p² ≤ n` are needed (`:238-243`). `N ∈ [2, 400]`. `by[k]` records the first prime that crossed `k` out, starting each prime's march at `p²` (`:251-253`). Grid of 10 columns, 58 px wide, 34 px tall (27 past 100); crossed cells are tinted in their prime's colour with a diagonal strike; known primes are `sorted` cells (every prime once `done`, otherwise only the sievers used so far); the current siever is boxed green. The legend swatches are recoloured by a regex replacement over `legendRow`'s output (`:296-302`). Header: `π(N) = count` when done, else `√N ≈ … ⇒ p ∈ {…}`. The cell for 1 is `idle` (`:266-268`); captions are `sieveDone` (π(N), √N), `sieveStart`, or `sieveStep` naming `p`, `p²` and the next siever, plus `sieveInfo` (`:303-308`).

#### Factorization: `renderFactor` (`:317-405`)
`n ∈ [2, 10¹²]`. If the leaf count (`Σ exponents`) ≤ 14, a **factor tree** splitting each composite "into the two factors closest to √v" (`:325-331`: `d = ⌊√v⌋` decremented until it divides); leaves are placed in slots of `min(90, (W−32)/leaves)` and parents centred over their children (`place`, `:339`); leaves are `sorted` cells, inner nodes `key`. Otherwise a **division ladder** by the smallest prime repeatedly (`:355-372`). Then the three functions: `d(n) = ∏(a+1)`, `σ(n) = ∏(p^{a+1} − 1)/(p − 1)` (written as a sum of powers when `a ≤ 4` and `p^a < 10⁴`), `φ(n)`; for a prime, `d = 2, σ = n+1, φ = n−1` (`:373-387`). Captions: the divisor pairs when `d ≤ 30`, and perfect/abundant/deficient by `σ − n` vs `n`.

#### gcd: `renderGcd`, `renderDiophantine` (`:409-535`)
`a, b ∈ [1, 10¹²]` (`:411-412`). *extended*: the `(i, r, q, s, t)` table with the gcd row highlighted and the check `s·a + t·b = g` (`:416-433`). *euclid*: the division lines `a = q·b + r` (truncated to 11 + ⋮ + last when > 13 steps, `:441`; the line with remainder 0 grey and the one that yields the gcd green, `:443`) and the **squares-in-a-rectangle picture** (`:447-468`): a `big × small` rectangle scaled to a 280 px box; at each stage `q` squares of side `min(rw, rh)` are cut from the longer side, coloured per stage; stops when a square would be under 1.2 px. The caption gives `lcm = a·b/g`. *diophantine* (`:476-535`): `a, b ∈ [−10⁶, 10⁶]`, `c ∈ [−10⁹, 10⁹]`, both nonzero; solvable iff `g | c`. A particular solution `x0 = s·sign(a)·c/g`, `y0 = t·sign(b)·c/g` from `extended(|a|, |b|)`; the general `x = x0 + (b/g)k`, `y = y0 − (a/g)k`; the representative is the one closest to the origin in `|x| + |y|` among `k0 ± 3` with `k0 = round(−x0/dx)` (`:494-501`). Picture: the line `y = (c − ax)/b` in a frame spanning `2.6·|dx|` either side with the lattice solutions as dots (green for the representative, labels for `k = 0, ±1`). For `a, b > 0, c ≥ 0` the non-negative solutions are listed (up to 12). No solution: the line in red.

#### Modular arithmetic: `renderMod` (`:539-657`)
*clock* (`m ∈ [2, 24]`, `a ∈ [−10⁶, 10⁶]`, `:543`): `r = a mod m` with `q = (a − r)/m`; a clock of radius 140 with the hour cells, an orange arc from 0 to `r` (large-arc flag when `r > m/2`), the quotient `±q × m` in the middle, and the residue class `…, r−m, r, r+m, r+2m, …` (`:541-580`). *add/mul tables* (`m ≤ 16`): headers are `key` cells (in the multiplication table only the units, `gcd(i, m) = 1`, are `key`; the rest are `idle`, `:591`), `1` entries `sorted`, zero divisors (`i·j ≡ 0`, both nonzero) `min`; in the addition table the `0` entries are `sorted` (`:596`); captions list the units and either the zero divisors (the `i` with `gcd(i, m) > 1`, `:588`) or "ℤ_m is a field", or `addInfo` for `+` (`:581-607`). *power* (`m ≤ 10¹²`, `k ≤ 10¹⁵`, `a ∈ [0, 10¹²]`, `:609`): **binary exponentiation (right-to-left)** in BigInt (`:610-633`): one table row per bit `i` with `2^i`, the bit, `a^(2^i) mod m` (repeated squaring) and the running result; caption counts squarings vs multiplications vs the naïve `k − 1`; a Fermat note when `m` is prime and `m ∤ a`, else an Euler note with `φ(m)` only when `gcd(a, m) = 1` (`:631-632`). *inverse* (`:636-656`): `extended(m, a mod m)` table with `t` as the coefficient of `a`; `gcd ≠ 1` → no inverse (red); otherwise `inv = t mod m` and the check `a·inv = 1 + q·m` in BigInt.

#### Congruences: `renderCrt` (`:661-763`)
*linear* `ax ≡ b (mod m)` (`m ≤ 10⁹`): `g = gcd(a, m)`; `g ∤ b` → no solution; else divide through, `a1⁻¹` via `binv`, `x0 = a1⁻¹·b1 mod m1`, and `g` solutions `x0 + k·m1` (listed up to 20). For `m ≤ 30` a two-row strip of `x` and `a·x mod m` with the hits highlighted (`:687-700`). *system*: parses up to 5 clauses of the forms `x ≡ r (mod m)`, `r mod m`, `r (m)` (`:703-711`); merges pairwise with the **generalised CRT for non-coprime moduli** (`:713-734`): with the current solution `x = r + Mt`, require `r + Mt ≡ ri (mod mi)` ⇒ `(M mod mi)·t ≡ (ri − r) (mod mi)`; `g = gcd(M, mi)` must divide the right side (else `crtNone`), `t = (rhs/g)·(lhs/g)⁻¹ mod (mi/g)`, new modulus `M·mi/g`. All in BigInt. Picture when `M ≤ 240`: one grey line per congruence over `0…M−1` with a dot at each of its residues (in the congruence's `PCOL` colour) and the common residue boxed in green (`:739-758`).

#### Bases: `renderBases` (`:769-839`)
Digits `0-9A-Z` (`DIGITS`, `:767`), bases 2–36, ≤ 40 digits, each digit must be below `from`; the value is accumulated in BigInt and must fit a safe integer (`:772-777`). Steps: the place-value expansion when `from ≠ 10` (≤ 12 digits), the **repeated division by `to`** as a table `(n ÷ to, quotient, remainder, digit)` with a green arrow "read the remainders upwards" (`:784-816`; the table is drawn only when `to ≠ 10`, `:803`), and the answer digits in cells with their place values (`to^p` as a number when the cell is ≥ 44 px wide and `to^p < 10⁶`, else `to^p` in superscripts, `:825`). The header reads `s_from = out_to`, with `value_10` in the middle when neither base is 10 (`:837`). A grouping caption appears when one base is a power of the other (`k(small, big)`, `:830-836`), e.g. binary ↔ octal.

`NT_PRESETS` (`:87-140`): sieves to 50/100/200 at various steps; factors 360, 84, 28 (perfect), 1001, 97, 2¹⁶, 600851475143; gcd 252/198, 1071/462, Fibonacci 89/55, Bézout 240/46, three Diophantine equations; nine modular examples including `3²⁰⁰ mod 13`, `7¹²⁸ mod 100`, `17⁻¹ mod 43`, `4⁻¹ mod 10 (none)`; six CRT examples including a non-coprime pair `3 mod 6, 5 mod 8`; six base conversions.

---

### `src/math/combinatorics.ts` — counting, Pascal, stars and bars, inclusion–exclusion, special numbers

715 lines. "All counts are exact (BigInt) and checked against the listings" (`:6`). Specs (`:20-31`): `CountSpec { kind: perm|comb|permRep|combRep|word; n; r; word }`, `PascalSpec { mode: row|entry|hockey|parity|diagonals; rows; n; k }`, `StarsSpec { k; n; empty }` (k balls into n boxes), `InclSpec { mode: venn|divisible; sizes; n; divs }`, `NumbersSpec { kind: catalan|derange|stirling|partitions; n }`. `renderComb` dispatches on `topic` (`:702-715`). `COUNT_KINDS`, `PASCAL_MODES`, `INCL_MODES`, `NUMBER_KINDS` (`:15-18`) and `COMB_TOPICS` (`:31`) are exported for the dialog; `CombWords` is at `:33-73`.

#### Exact arithmetic (`:115-173`)
`factB(n)` BigInt factorial; exported `binom(n, k)` by the multiplicative formula with `k = min(k, n−k)`, each step an exact integer division, `0n` when `k < 0` or `k > n` (`:127-133`); `big(b)` prints in full with thin-space thousands up to 24 digits, else `≈ m.mmm × 10^e` (`:135-140`). `flow(items, y, size, gap)` lays rounded chips left to right, wrapping at `W − 32` and centring each line (`:144-173`).

#### Counting: `renderCount` (`:177-288`)
*word* (anagrams): ≤ 16 letters, `n!/∏(count!)`; letter chips; the full listing when ≤ 120 by a **sorted-letters backtracking with the "skip equal unused predecessor" rule** (`:193-204`), which generates each distinct permutation once. Others: the **decision grid** (order? repetition?) with the four formulas, the chosen cell highlighted (`:218-236`); `P(n, r) = n!/(n−r)!` (product written out when `r ≤ 8`), `C(n, r)`, `n^r`, `C(n+r−1, r)`; `r > n` rejected for perm/comb. Limits: `n ∈ [1, 200]` (100 for `permRep`/`combRep`), `r ∈ [0, 200]` (40 for `permRep`, 100 for `combRep`) (`:214-215`); this module's `intOf` (`:115-120`) has no safe-integer check, unlike numtheory's. Listing when `total ≤ 120` and `n ≤ 26` with the items as letters (`:256-285`): the recursion branches by kind (start index for combinations, `cur.includes(i)` exclusion without repetition); permutations with `r > 1` are grouped **one row per combination, its r! orderings**, the sorted one in green, illustrating `P = C · r!`.

#### Pascal: `renderPascal` (`:292-370`)
`N` rows ≤ 16 (64 for parity). Cell width `min(48, (W−32)/N)`, numbers hidden in parity mode under 22 px. Roles by mode: *row* highlights row `n` and writes `(a + b)^n` with the coefficients (its caption means to print `2ⁿ = Σ`, but the replace at `:339` uses `/d/g` instead of `/\d/g`, so the exponent never becomes superscripts and `n = 5` prints `25`); *entry* highlights `C(n,k)` green and its two parents orange, `C(n,k) = C(n−1,k−1) + C(n−1,k)` (`= 1` when `k = 0` or `k ≥ n`, `:342-343`); *hockey* highlights column `k` from row `k` to `n` and the sum `C(n+1, k+1)` in the next row (the TeX sum runs to `m = min(n, N − 2)`, `:348-350`); *parity* tints odd entries (the Sierpiński pattern) and counts them; *diagonals* alternates colours along `i + j = d` and prints the shallow-diagonal sums (Fibonacci) at the left, `F_{n+1} = Σ C(n−j, j)`.

#### Stars and bars: `renderStars` (`:374-419`)
`k ∈ [0, 60]`, `n ∈ [1, 12]`. With empty boxes `C(k+n−1, n−1)`; without, substitute `rest = k − n` (none when negative). The first 10 compositions (largest first box first, by recursion) are drawn as orange dots with blue bars, with "and c more" beneath.

#### Inclusion–exclusion: `renderIncl` (`:426-505`)
*divisible*: 2 or 3 divisors, `|A_i| = ⌊N/d_i⌋`, pair/triple sizes by `⌊N/lcm⌋`. *venn*: 3 or 7 numbers. Exclusive regions are solved (`regions`, `:446-452`) and any negative region → `inconsistent`. Venn: two circles (R 115) or three (R 105) with region labels at fixed offsets; in *divisible* mode a universe box behind them with the complement count `N − |∪|` at its bottom right and the `inclNone` caption (`:472`, `:495`, `:502`). *divisible* takes `N ∈ [1, 10⁹]` and divisors in `[2, 10⁶]` (`:431-432`). TeX: the inclusion–exclusion sum.

#### Special numbers: `renderNumbers` (`:509-690`)
*catalan* (n ≤ 30): `C_n = C(2n, n)/(n+1)`; for 1 ≤ n ≤ 5 all **Dyck words** (`(` while `open < n`, `)` while `close < open`) drawn as lattice paths above the diagonal in little grids; a window of up to 12 values `C_first … C_max(n,8)` as chips with `C_n` in green (`:555-556`). *derange* (n ≤ 20): `D_n = (n−1)(D_{n−1} + D_{n−2})`, listing for n ≤ 5, a table with `D(n)/n!` to 6 dp (→ 1/e). *stirling* (n ≤ 10): `S(n,k) = k·S(n−1,k) + S(n−1,k−1)` triangle with Bell numbers; set partitions listed for n ≤ 4 via "add i to a block or open a new one", coloured by block count. *partitions* (n ≤ 60): `p(n)` by the coin-change DP over part sizes (`:639-641`), distinct parts (descending inner loop, `:645-648`), odd parts (step 2, `:649-652`); for n ≤ 12 every partition as a Ferrers diagram (dots of 8 px when `n ≤ 7`, else 6 px, `:661`), green when the parts are distinct, laid out line by line with a shared baseline.

`COMB_PRESETS` (`:75-111`) cover each kind.

---

### `src/math/algebra.ts` — linear equations, inequalities, expanding, factoring, quadratics

1075 lines. "Arithmetic is exact (fractions), so every step shows what a pupil would write" (`:5`). Imports `table, txt` from `algoArrays`, chart helpers (`texLines` as `lines`), `latexToSvg`. `AlgebraSpec = { topic: linear|inequality|expand|factor|quadratic; eq: string; method: QuadMethod }` with `QUAD_METHODS = factor | square | formula | vertex` (`:10-15`). `AlgebraWords` (`:17-56`) holds the operation labels (`ops.sub/add/div/mul/flip/swap/both/three`) and topic sentences.

#### Exact fractions `Q` (`:60-94`)
A private `{ n, d }` with `q(n, d)` normalising sign and gcd, forcing no `−0` (`+ 0`), and throwing `words.tooBig` past `LIMIT = 10¹²` or non-integers (`:69-75`). `add/sub/mul/div/neg/eqQ/sign/num/isInt`; `texQ` (`\frac` with the sign in front), `plainQ` (`−1/2` for captions), `minus` (typographic minus).

#### Polynomials `Poly = Q[]` (`:98-137`)
Coefficient of `x^i` at index `i`. `trim/deg/co/padd/pscale/psub/pmul/peval` (Horner via `reduceRight`). `termTex(c, k, v, lead)` writes one term with its sign; `polyTex` descending; `termPlain` for labels (`2x`, `−3`, `1/2·x`).

#### Parsing: `normal`, `parsePoly`, `splitRel` (`:141-240`)
`normal` maps `− – × · ÷ ² ³ ≤ ≥ ,` to ASCII (`:141-144`). `parsePoly` (`:147-221`) is a **recursive-descent parser producing a polynomial directly**: `expr` (+/−), `termP` (`*`, `/` by a constant only — dividing by `x` throws `words.divX` — and **implicit products** when the next char is a digit, `.`, `(` or a letter), `unary`, `power` (integer exponent ≤ 6, by repeated `pmul`, else `words.power`), `atom` (brackets, decimals as exact fractions `whole·frac / 10^len`, a single letter that must match `ctx.v` — a second letter throws `words.oneVar`). Anything else (an unmatched bracket, a stray character, division by the constant 0) throws `words.bad` with the typed string (`:150`, `:171`, `:215-219`). `splitRel` (`:228-240`) cuts at `<= >= =< => < > =` (the `=<`/`=>` spellings are read as `≤`/`≥`) and returns the parts and relations.

#### Linear equations: `balance`, `renderLinear` (`:249-358`)
Requires exactly one `=` and degree ≤ 1 (`w.notLinear`). Steps (`:316-343`): (1) subtract the **smaller x-term** from both sides so x stays on one side with a positive coefficient (`m = sign(aL − aR) > 0 ? aR : aL`); if both x-coefficients vanish, `every`/`none` by comparing constants; (2) subtract the constant on the x side; (3) divide by the coefficient; (4) `swap` if x ended on the right. The final row is green. The **balance scale** (`:249-295`, `:312-313`, `:350-355`) appears only for "small whole numbers, all on the plus side, and a whole positive answer" (every coefficient a non-negative integer, x-coefficients ≤ 6, constants ≤ 12, `aL ≠ aR`, and `x` a positive integer, `:313`, `:350`): a beam at `cx ± 230`, two pans at `±170`, x-bags (blue rounded rects 28×34 labelled with the letter) and unit weights (orange 18×18), wrapping in rows of 38 px; the first `goneBags`/`k` items on each pan are drawn at 35 % opacity with a red strike — the ones "taken from both pans". Captions: the balance sentence (`w.lin.balance`, `:354`) when the scale is drawn, and the check `L(x) = R(x)` via `peval`. `tests/algebra.test.ts:25-38` pins: the check line names `x = (d−b)/(a−c)` and both sides equal; `2(x+3) = 2x+6` → every number; `x+1 = x+2` → no solution; `x/2 + 1/3 = 2` → `x = 10/3`.

#### Inequalities: `numberLine`, `renderInequality` (`:362-502`)
One or two relations, no `=` (`w.needIneq`); mixed directions in a double inequality → `w.mixed`. Double inequality (`:405-446`): the middle part must be degree 1 and the ends constants; "do the same to all three parts": subtract `b`, divide by `a` — **dividing by a negative keeps the parts in place and turns both signs round** (`:427-431`, red row); then read as an interval from the smaller end; an empty set when `small > big` or equal with an open end. Single (`:447-488`): move x-terms left, constants right, divide (flip for a negative, `FLIP` table `:225`), giving `lo` or `hi`. If the x-terms cancel, the constants decide `ineq.every`/`ineq.none` (`:461-466`). `numberLine` (`:362-390`): ticks from `⌊min⌋ − 4` to `⌈max⌉ + 4` with step `⌈span/16⌉`, a 5 px coloured band from `lo` to `hi` (arrowheads for unbounded ends), filled dots for closed ends and white ones for open, labels `v = value`. Test pins (`tests/algebra.test.ts:40-58`): the arrow direction (`M24,` means "to the left"), open vs filled dot regex, and the "sign flips" caption iff `a − c < 0`. It also pins `4 ≥ (1 − x)/2 > −1` → `x = −7`, `x = 3` and `x + 1 < x` → "No number" (`:55-57`).

#### Expanding brackets: `splitFactors`, `renderExpand` (`:507-623`)
`splitFactors` (`:507-540`) walks the string: a bracketed chunk (depth-matched) or a bare chunk up to the next `(`, with an optional `^k` repeating the factor; a bare `-` chunk is the constant −1. Constants are multiplied together at the end (`k`), at least two non-constant factors are needed unless `k ≠ 1` (`w.needProduct`); > 3 factors or a factor with > 4 nonzero terms → `w.tooMany` (`:555-560`). For each successive product the **grid method** (`:565-604`): a header row of the second factor's terms, a header column of the accumulated product's terms, each cell `r·c` in `texCell` tinted by the degree of the product (`DEG_FILL/DEG_INK`, `:548-549`); then a "collect" line grouping like powers in matching colours (one bracket per power, a lone term carrying its own sign, `:585-598`) and the collected polynomial. A leading constant multiplies at the end (`w.ops.mul`). The header repeats equal factors as a power. `texCell` (`:625-637`) renders TeX with `latexToSvg` and scales it to fit the cell.

#### Factoring (ac method): `factorSteps`, `renderFactor` (`:653-784`)
Integer coefficients only (`w.intOnly`), degree ≤ 2 (`w.upToSquare`), degree ≥ 1. Common factor: `g = gcd` of the coefficients, negative when the leading coefficient is, times `x^{xPow}` when there is no constant term (`:674-682`); a remaining binomial is already factored. Special shapes named in captions: difference of squares (`b = 0, c < 0`, both squares) and a perfect square (`b² = 4ac`) (`:703-705`). The **ac method** (`:707-767`): list pairs `p·q = ac` with the signs that could sum to `b` (both signs for negative `ac`, `[d, −e]` and `[−d, e]`); the table (`algoArrays.table`) shows up to 10 pairs around the hit with the hit green; no hit → `fac.noPair` with the discriminant, `ok: false`. Then **split the middle term and group**: choose the order of `p, q` so that `q·gcd(a, p)` is divisible by `a` (`:744-746`), `g1 = gcd(a, p)`, inner factor `(a/g1·x + p/g1)`, `g2 = q·g1/a`; rows: the split, the grouping `g1·x(…) + g2(…)`, and the result `(g2 + g1·x)(…)`. Returns `linear` as `[constant, coefficient]` pairs for the quadratic solver and the tests (`algebraFactors`, `:1017-1022`). `algebraPoly(src, w)` (`:1025-1029`) exposes the parsed coefficients for the tests; `renderAlgebra(spec, w)` (`:1000-1014`) sets `words` and dispatches on `topic`; `ALGEBRA_TOPICS` (`:11`), `Rel`/`REL_TEX` (`:223-224`) and `splitRel` are also exported.

#### Quadratics: `surd`, `renderQuadratic` (`:789-996`)
`surd(x: Q)` writes `√(n/d)` as `(k/d)·√m` with `m` square-free by extracting square factors from `n·d` (`:789-797`); `surdTex`. `renderQuadratic`: the `=` is optional (a bare expression is taken `= 0`; two relations or a non-`=` one → `w.needEq`, `:806-809`); `P = L − R` must be degree 2 (`w.notQuadratic`); `D = b² − 4ac`, `h = −b/2a`. `roots()` (`:823-828`) returns `null` (D < 0), one or two rationals (`√(D/4a²)` rational), or `{p, r, m}` meaning `p ± r√m`. Captions add the approximate complex roots when D < 0.
- **factor** (`:847-885`): multiply through by the lcd of the coefficients; run `factorSteps`; if it fails, fall back to the formula (with `w.quad.cannotFactor`); otherwise the zero-product line (`… = 0 or … = 0`) and the roots sorted and deduplicated.
- **formula** (`:887-903`): `a, b, c`, `Δ`, `x = (−b ± √Δ)/2a` with the surd simplified.
- **square** (`:905-955`): divide by `a`, move the constant, add `(B/2)²` to both sides, `(x + B/2)² = R`, `x + B/2 = ±√R`. Picture: the `x × x` square (110 px) with two `B/2 × x` strips in green and the missing corner `(B/2)²` dashed orange, strip width `H = clamp(110·|half|/(|half|+2), 26, 70)`, "not to scale" (`:931-952`).
- **vertex** (`:957-995`): `h = −b/2a`, `k = f(h)`, `a(x − h)² + k`; the parabola in a frame around the vertex and roots (`spread`), axis of symmetry dashed purple, vertex red, y-intercept orange, roots as hollow green dots.
`tests/algebra.test.ts:89` pins that all four methods give the same roots.

`ALGEBRA_PRESETS` (`:1031-1075`): 7 linear (including the identity and the contradiction), 4 inequalities (with a flip and two double ones), 6 expansions (up to `(x+1)³`), 7 factorings (including `x² + x + 1`), 8 quadratics across the four methods.

---

### `src/math/polynomials.ts` — division, theorems, cubics/quartics, binomial, line-and-curve, partial fractions

2115 lines. Imports from `expr.ts` (`parseE`, `tex`, `realRoots`, `numericRoots`, `sqrtSplit`, `rootFrac`, `powFrac`, the `QS` helpers, `substitute`, `gcd`, …), `Frac`, `latexToSvg`, chart. `PolySpec = { topic: divide|theorem|solve|binomial|simultaneous|partial; src: string }` (`:12-14`). `PolyWords` (`:16-154`) is the largest words record in this part. `PolyData` (`:157-169`) collects what was worked out (`q, r, values, poly, roots, set, terms, coef, valid, points, pf`) for the tests; `buildPolynomials` returns `{ svg, data }` and `renderPolynomials` just the SVG (`:2029-2060`). Both set `words`, reset `data`, and install `exprMessages`.

#### Exact polynomials `P = Frac[]` (`:176-234`)
`chk(f)` throws `words.tooBig` unless numerator and denominator are safe integers with `|n|, d ≤ 6·10⁷` — "Fractions stay exact only while their products fit in a double" (`:180-184`). `ptrim/pdeg` (degree −1 for the zero polynomial), `lead`, `at`, `padd/pscale/psub/pmul`, `xk(c, k)`, `pdivmod` (**long division**: peel the leading term `lead(r)/lead(b)·x^k` while `deg r ≥ deg b`, `:210-221`), `pval` (Horner, exact), `pnum` (Horner, float), `pderiv`, `lcmDen`, `content(p)` = `k·q` with `q` integral, coprime and leading-positive (`:226-233`), `nums`.

#### Writing (`:238-288`)
`termTex` handles negative powers as `\frac{a}{x^k}`; `polyTex(p, v, ascending)`; `termsTex`; `br` (`\left( \right)`); `facP(r)` the factor `(bx − a)` for root `a/b` and `facTex`; `plusTex` (`+ 7`, `− 3`, `+ (2x + 1)`); `substTex` (`2(2)^3 − 3(2)^2 + …`), `valuesTex` (`16 − 12 + …`).

#### Factorising over ℚ (`:292-352`)
`divisors(n)` up to 10⁵; `candidates(p)` = `±p/q` with `p | constant`, `q | leading`, deduplicated, smallest magnitude first (`:299-312`) — the **rational root theorem**; `findRoot` (0 when the constant term vanishes); `factorQ(p)` (`:320-335`) peels rational roots with multiplicity (dividing by `(x − r)` then scaling by `1/r.d` so the factor is `(bx − a)`), returns `{ K, roots, rest }` where `rest` is integral, coprime and has no rational roots. `factorParts/factoredTex/factorCount` write `K·x^m·(bx − a)^m·(rest)`.

#### Pictures (`:356-466`)
A TeX cache of up to 800 entries (`tx`, `:357-367`), `put` (a snippet centred at `y`), `line`, `fit` (scales a too-wide picture by `max/w`), `flow` (pictures side by side while they fit), `finish` (rows then pictures centred). `graphPic(curves, focus, marks, o)` (`:427-454`): the x-range is the focus points padded by 35 % of their span (min span 2) plus 0.6, the y-range from 400 samples over a narrower inner range (the focus padded by 8 % of the span + 0.15, or the inner 84 % of an explicit `xr`) plus the marks and 0; optional purple `strip` (the interval of validity) and `shadeAxis` (solution segments on the x-axis as a 6 px green band with filled/hollow end dots, `:455-466`).

#### Reading (`:471-537`)
`polyOf(e: E): P | null` converts an expression tree to a polynomial in `x` (integer powers up to 12; a negative power is allowed only of a nonzero constant). `readP` throws `words.notPoly`. `splitTop(src, chars)` finds the last top-level occurrence of a separator; `splitRel` recognises `= < > ≤ ≥` (with `<=`/`=<` spellings); `clauses` splits on `;` or newlines.

#### Division: `longDivide`, `longDivisionPic`, `syntheticPic`, `renderDivide` (`:541-679`)
`longDivide` records every step `{ k, c, prod, after }` (zero quotient terms skipped). The long-division picture (`:559-614`) lays out rows by power: the quotient over the bar (blue), the dividend with explicit zero placeholders (grey), each product row with `−\Big( … \Big)` in red and a rule, the next remainder brought down to the following step's column; the final remainder green if zero, red otherwise; the divisor sits left of a `)`-curve and a bar. `syntheticPic(p, r)` (`:617-640`) is **synthetic division by `x − r`**: top row the coefficients, middle row `bot[i−1]·r` in grey, bottom row the sums in blue, the last boxed as the remainder (green/red). `renderDivide`: input `p ; d`, `p ÷ d` or `p / d` (last top-level); divisor degree ≥ 1 (`constDivisor`), dividend degree ≥ divisor's (`lower`), ≤ 10 (`tooHigh`). Rows: the identity `p = (d)(q) + r`, the fraction form, and for a linear divisor the **remainder theorem** `f(a) = … = r` with `a = −d0/d1` plus the synthetic picture (with a `scaled` caption when the divisor's leading coefficient is not 1, since synthetic division by `x − a` gives the quotient scaled by `b`). `data.q, data.r` are set; `tests/polynomials.test.ts:41-52` checks `p = d·q + r` at seven points and `deg r < deg d` (`data.r.length ≤ deg d`) on 80 random cases.

`plainTex` (`:682-702`) turns LaTeX into caption text (`\frac` → `a/b` with brackets when needed, `^{k}` → superscripts, roots → `√`, `∛`).

#### Factor and remainder theorems: `renderTheorem` (`:707-1024`)
Coefficients may hold unknowns: `Lin = Map<letter, Frac>` ("" is the number), `LP = Lin[]` a polynomial whose coefficients are linear in the unknowns; `lMul` allows a product only when one side is constant (`words.theorem.nonLinear`) (`:707-742`). `toLP` converts an `E` (unknowns are any of `UNKNOWNS = a b c d k m n p q r s t` except the function's own name, `:907`). `readCond` (`:908-939`) reads a clause as `f(a) = v` (v may contain unknowns), `(x − 2) is a factor`, `remainder −12 when divided by (x + 1)`, or a bare linear divisor; each gives `Cond { a, v, kind }`. `normEq` scales an equation to coprime integers with the first unknown positive; `solveLinear` is **exact Gauss–Jordan** returning `null` when the solution is not unique or inconsistent (`:824-845`); `solveShown` (`:848-904`) writes it the school way: one unknown directly; two unknowns either from a single-unknown equation plus substitution, or by **elimination** of the unknown whose coefficients match (otherwise the second), combining `k1·(1) ∓ k2·(2)` with `k = |c|/gcd`; three or more are solved "together" in one line. Flow: with no unknowns and no conditions it **searches** the first 12 candidates and marks the roots (`:966-977`); with no unknowns but conditions it verifies each (`isFactor/notFactor`, `holds/fails`); with unknowns it needs at least as many conditions as unknowns (`tooFew`), builds one equation per condition (substitute, simplify, rearrange to `(i)`), solves, substitutes back, then factorises `p` with `factorQ` and draws the graph through the marked points and the stationary points from `numericRoots(p')`. `data.values` and `data.poly` feed `tests/polynomials.test.ts:54`.

#### Solving cubics and quartics: `solveSteps`, `renderSolve` (`:1028-1327`)
`Root = { v, tex, m }` with `addRoot` merging within `1e-9`. `kthRoots(u: QS, k)` (`:1040-1057`) writes `x = ±ᵏ√u` exactly (`rootFrac`, `sqrtSplit`, or a radical sign). `solveQuadratic` (`:1067-1084`): factorise if it has rational roots, else the discriminant and the formula with `sqrtSplit(D)` giving `QS` roots. `solveSteps` (`:1087-1180`), in order: take out `x^{k0}` (root 0 with multiplicity); divide out the content; a **hidden quadratic** in `x^k` when only powers `0, k, 2k` appear (substitute `u = x^k`, solve, back-substitute via `kthRoots`, and factor each `x^k − u` as far as it goes, `:1110-1144`); otherwise while degree ≥ 3 show the candidates (`±p/q`, first 12 positives), **trial substitution** (the first three failures written out, then `⋮`), the synthetic picture for the root found, and the quotient (scaled by `1/r.d`); finally the quadratic, a linear, or — with no rational root left — `numericRoots` with `≈` and the `noRational` caption. `solutionSet(p, rs, rel)` (`:1183-1209`) decides the sign on each piece between sorted roots by a sample point and builds `Seg { lo, hi, loIn, hiIn }` with roots included for `≥/≤`. `signTablePic` (`:1222-1270`) is the **sign table**: one row per linear factor (`(x − r)^m`, sign flips only for odd `m`) plus the irreducible rest, `f(x)` in the last row with the good intervals shaded green and zeros marked. `renderSolve`: `p = L − R` must have degree 1–10 (`noX`/`tooHigh`, `:1279-1280`); rearranges to `… rel 0`, multiplies by −1 (flipping) when the leading coefficient is negative, runs `solveSteps`, writes the factored form and the roots, for an inequality the solution in inequality and interval notation, up to four synthetic pictures flowed side by side, the sign table, and the graph with the solution shaded. `data.roots/set` are checked by `tests/polynomials.test.ts:113` ("every root is a root, no sign change is missed, inequalities match the sign of f").

#### Binomial expansion: `renderBinomial` (`:1332-1589`)
Options after commas/semicolons (not inside brackets): `x^k` or `x`/`const`/`x^0` (one term), a count (`"4 terms"`, 1–12), `x = value` (an estimate). The main expression must be `k·(A + B)^n` with `A, B` monomials of different powers (`monoOf`, `:1333-1357`); nested powers multiply the exponents (`:1440-1445`). `choose` (float, rounded) and `genChoose(n: Frac, r)` = `n(n−1)…(n−r+1)/r!` for any rational `n` (`:1378-1388`).
- **Natural `n` ≤ 20** (`:1458-1512`): the sum formula, each term `C(n,r)·A^{n−r}·B^r` with its values; for a target power solve `A.p(n − r) + B.p·r = target` for `r` (shown as `powT = … ⇒ r = …`), the term in green or `noTerm`; otherwise the expansion in chunks of ≤ 6 terms, an estimate at `x = xv` compared with the exact value (`fnum`, with a real odd root for a negative base, `:1455`) and the error caption; Pascal's triangle (`pascalPic`, `:1576-1589`) up to row 10 with the row highlighted.
- **Any other `n`** (`:1514-1573`): one term must be a constant and the other a positive power of `x` (`needConst`, `:1515-1516`); rewrite `(a + b·x^q)^n = a^n(1 + (b/a)x^q)^n` requiring `a^n` exact (`rootFrac`, else `needExact`), the series formula, the first `count ?? 4` coefficients `genChoose(n, r)·(b/a)^r`, the **interval of validity** `|u| < 1 ⇒ |x| < (a/b)^{1/q}` (purple), the coefficient of a target power, an estimate, and a graph of the function against the truncated series with the validity strip.
`data.terms/coef/valid` are tested at `tests/polynomials.test.ts:147`.

#### Simultaneous equations (line and curve): `renderSimultaneous` (`:1594-1835`)
Two-variable polynomials `P2 = Map<"i,j", Frac>` (`p2Add/p2Mul/toP2`, integer powers ≤ 6). Exactly two clauses (`needTwo`); one must be linear (`needLinear`), the other of degree 1–4 (`tooHigh` past 4, `needLinear` for a constant; two lines are allowed). Choose the subject: `y` if its coefficient is ±1, else `x` if its is, else whichever is present (`:1719-1721`); write `subj = m·t + c` (with the constant first when that avoids a leading minus), **substitute** (`substitute` on the `E` tree, shown as typed), collect into one polynomial `h` via `p2Sub` (`:1650-1661`), make it leading-positive and primitive, then: a constant → `always`/`never`; linear → one root; quadratic → the discriminant with the `two/one/none` caption (tangent when 0), factorised or by formula; higher → `factorQ` + `realRoots` (numeric caption). Back-substitute each root (exact `QS` arithmetic or `≈`), list the points. Picture (`:1790-1817`): both curves drawn by **marching squares** (`contour`, `:1664-1699`: a 240 × ny grid, linear interpolation of the sign change on each cell edge, pairs of crossings joined); the window is the intersection points, or the curve's bounding box when it is closed (`curveBox`, `:1820-1835`, which also decides "closed" by the box staying 2 cells inside `[−L, L]²`), with **equal units** (`s = max(dx/fw, dy/fh)`). `data.points` checked by `tests/polynomials.test.ts:182`.

#### Partial fractions: `renderPartial` (`:1839-2025`)
`top / den` at the last top-level `/`; `deg den ≥ 1`, ≤ 8, `deg top ≤ 10`. An improper fraction is divided first (`pdivmod`, the `improper` row); a zero remainder means a polynomial only. The denominator is factorised by `factorQ`; an irreducible remainder of degree > 2 → `hardDen`. Terms (`:1873-1888`): for each root `r` of multiplicity `m`, letters over `(bx − a)^j`, `j = 1…m`, each with its `basis` (the product of all other factors); for a quadratic rest two letters `Ax + B`. Rows: the set-up `R/∏ ≡ Σ`, the identity after multiplying out, then **the cover-up rule** — substitute `x = r` into the identity, every term but one vanishes (`:1915-1923`) — and for the rest **comparing coefficients** (highest power, then the constant, then the others, keeping only equations that raise the rank, `rankOf` at `:2010-2025`, solved by `solveLinear`). The answer collects the letters into fractions with integer numerators (scaling by the lcm of denominators), and a **check** at the first integer in `[2,3,4,5,1,6,−2,7]` that is not a root, with ✓/×. `data.pf` is the resulting function, tested to "add back up to the fraction" (`tests/polynomials.test.ts:211`).

`POLY_PRESETS` (`:2063-2115`): five divisions, six theorem problems (find a, b; find k; three unknowns; remainder on ÷ (2x − 1); search for factors), eight solve problems (two inequalities), eight binomials (including `(1 + 2x)^(−1)`, `sqrt(4 + x)`, `1/(1 − 3x)^2`), seven line-and-curve pairs (including a tangent and a miss), five partial fractions (repeated factor, quadratic factor, improper).

---

### `src/math/powers.ts` — index laws, scientific notation, surds, logarithms, exponential/log equations

2455 lines, chart imports only. `PowersSpec = { topic: laws|sci|surds|logs|equations; src }` (`:9-11`); `PowersWords` (`:13-122`). `renderPowers` sets `words` and dispatches (`:2377-2391`).

#### Rationals and roots (`:126-205`)
A second private `Q` (`:126-154`) like algebra's but throwing `words.divZero` for `d = 0` and `words.tooBig` for unsafe integers. `qpow(a, k)` (|k| ≤ 200), `iroot(n, k)` (integer k-th root by rounding and checking `g − 1, g, g + 1`, `:163-167`), `qroot(a, k)` (exact rational root or `null`; a negative base only for odd `k`, `:169-178`), `texQ/texExp` (exponents as `2/3`, not stacked), `plainQ`, `tenTo` (`10⁻⁴`), `factorize` (trial division, refuses n > 10¹²).

#### Parser: `Node`, `tokenize`, `parseExpr` (`:209-359`)
`Node` is this module's own tree (`num{v, src}`, `var`, `add`, `neg`, `mul{implicit}`, `div`, `pow`, `root{n}`, `log{base, ln}`, `paren`). `normal` maps symbols and **turns runs of Unicode superscripts into `^(…)`** (`:226-227`). `tokenize` recognises the functions `sqrt cbrt log ln lg pi` and single letters; braces/brackets become parentheses. `parseExpr` is recursive descent with implicit multiplication whenever an atom starts (`2x`, `3√2`, `2log₃ 6`), `^` binding to a unary (so `x^-2` works), `sqrt`/`cbrt` taking a group or a power, `log_b` with a numeric, bracketed or single-letter base, `lg` for log₁₀ (`:272-351`). `texNode` (`:363-403`) prints what was typed (implicit products without a dot unless the right factor starts with a digit, fraction exponents as `−1/3`, `\log_{b}`), with an `over` hook so surds can be substituted in place. `evalNode` (`:406-442`) evaluates with a letter environment (`e` and `pi` built in, real odd roots of negatives). `constQ` (`:445-480`) folds a numeric subtree to an exact rational.

#### Index laws: `flatten`, `renderLaws`, `chipsPicture` (`:517-835`)
`flatten` (`:531-580`) decomposes a product/quotient tree into `Occ { base, exps: Q[], den }` — each occurrence of a base with the list of exponents applied to it and whether it is below the line — while collecting which laws were used (`powerProduct`, `powerQuotient`, `powerPower`, `rootPower`, `signOdd`/`signEven` for a negative base raised to an integer power) and the overall sign; sums throw `noSums`, non-numeric exponents `expNumber`, a zero base `zeroBase`, a negative base to a non-integer power `negBase`. `renderLaws` (`:617-760`) writes the steps in a fixed order: (1) open brackets, writing `exps` as a product then multiplied; (2) same base: `a^m·a^n`, `a^m/a^n` with the exponent sums written out, bases ordered numbers-first then letters alphabetically (`orderBases`); a base only ever below the line stays there (`:644-645`); (3) `a⁰ = 1`, `a⁻ⁿ = 1/aⁿ` (negative exponents move across the line); (4) exact fractional powers of numbers as roots `(ⁿ√a)^m` via `qroot`; (5) evaluate numeric powers, collect into one coefficient. Steps that change nothing are dropped (`:730-732`). The check caption substitutes `LETTER_VALUES = [2, 3, 5, 1.5, 7, 2.5]` for the letters (`:606-615`) and compares `evalNode(before)` with the simplified value. `chipsPicture` (`:763-835`): every factor as a chip (letters only when letters are present; integer exponents only; ≤ 4 bases, ≤ 13 chips per line), grouped by `(x²)³` as three groups of two with dashed outlines, numerator over denominator with a bar, the first `min(top, bottom)` chips crossed out, and `= x^k`, `= 1/x^k` or `= 1` at the right. `tests/powers.test.ts:35-66` checks the simplified form equals the input on 150 random forms and pins `x³/x³ → a⁰ = 1`, the odd-power sign note, and the three error messages.

#### Scientific notation: `Dec`, `renderSci`, `hopsPicture` (`:840-1165`)
`Dec = { m: bigint; e: number }` means `m·10^e` with trailing zeros stripped (`dec`, `:843-847`). `decOf` reads a decimal string exactly; `decAdd/decMul/decNeg`; `decDiv` computes to 40 extra digits and reports `exact` when the division terminates, otherwise rounds to `SIG = 4` significant figures (`roundSig`, half-up, `:862-881`); `decPow` (|k| ≤ 400). `layout` gives the digit cells and the point position; `decStr` groups thousands (thin spaces in TeX); `standard(a)` = `c × 10^n` with one digit before the point; `inStandardRange`. `sfOf(node)` recognises what was typed as standard form `c × 10^n` (or a plain number); `evalDec` evaluates any arithmetic on decimals (letters forbidden). `renderSci` (`:988-1126`) first rewrites `3.2e5`/`3.2E-4` and `3.2 x 10^5` (`:991`), then one of: plain number → standard form (+ hops picture); `c × 10^n` → ordinary number (normalising a non-standard `c` first, only when `|n| ≤ 30`); a product/quotient/sum of two standard-form numbers → the rule (`× : multiply the fronts, add the powers`; `÷ : divide, subtract`; `± : align to the larger power, add the fronts`), with normalisation afterwards; anything else → evaluate then standardise. `hopsPicture` (`:1129-1165`): the digits in boxes (placeholders grey), numbered orange arcs for each hop of the decimal point from where it is to where it goes (direction by sign), a grey dot at the start and a red dot at the end; skipped past 22 cells. `tests/powers.test.ts:68` ("the power of ten is where the point hops to").

#### Surds: `Surd`, `renderSurds`, `groupsPicture` (`:1170-1547`)
`Surd = Map<key, Q>` with key `"1"` for the rational part and `"k:r"` for `ᵏ√r` with `r` free of k-th powers (`:1169-1176`). `splitPower(k, n)` = `out^k · inner` from the prime factorisation (`:1179-1187`). `svAdd/svScale/svOf/svMul` (`mulRoots` combines two roots of the same index, mixed indices throw `surds.mixed`), `rootOfQ(k, v)` = `ᵏ√(a/b) = ᵏ√(a·b^{k−1})/b` simplified (even roots of negatives throw `negRoot`), `svInverse` (`:1238-1253`): for a single term multiply by `ᵏ√(r^{k−1})`; for two terms of index ≤ 2 use the **conjugate**, checking the product is rational; otherwise `divHard`. `texSurd` writes over one common denominator, rational part first then roots by size. `renderSurds` (`:1296-1482`): (1) every root simplified on its own — the largest square (cube) factor comes out (`√(f·inner) = √f·√inner`), negative cube roots, fractions split `√a/√b` — shown as side rows (purple) or main rows when the input is a single root; (2) `expand` turns the tree into `STerm { c, roots[] }` lists, distributing products and integer powers (|e| ≤ 6) and handling division by **rationalising** (`divide`, `:1404-1419`: multiply top and bottom by the conjugate or the root complement, two rows); (3) roots inside each term multiplied; (4) like surds collected `(a + b)√r`; (5) the total. `groupsPicture` (`:1499-1547`): the prime factors under a drawn root sign as chips, each full group of `k` equal primes dashed-boxed with an arrow to a chip outside the root, "outside: …" and "inside: …" captions (≤ 14 primes). A single root also gets the `a² < n < b²` bracket caption. Check caption: numeric values agree.

#### Numbers `q·e^t·∏p^f` for logarithms: `EV` (`:1552-1684`)
`EV = { q: Q; t: Q; rad: [prime, Q][] }` represents `q · e^t · ∏ p^f` with `0 < f < 1` (`evNorm` moves whole parts of the exponents into `q`, `:1555-1565`). `evMul/evInv/evDiv/evPow` (an even root of a negative → `null`; a non-exact rational root moves the primes of `q` under the root), `evNum`, `evalEV(node)` (rationals, `e`, products, quotients, powers, roots), `radParts` (group roots by index), `texEV/plainEV/baseTex`. `evVec(a)` is the exponent vector over the primes and `e` (`:1651-1663`); `exactLog(b, x)` finds `r` with `b^r = x` exactly by requiring `vx = r·vb` componentwise (`:1665-1673`); `primitive(b)` writes `b = c^g` with the smallest `c > 1` (`8 = 2³`, `1/9 = 3⁻²`, `:1675-1683`).

#### Logarithms: `renderLogs`, `logGraph` (`:1688-1905`)
`logTerms` (`:1698-1716`) splits a sum into signed terms `c·log(…)` or constants. `logBase` reads `ln`, `log` (base 10, `lg`) or `log_b` (b > 0, ≠ 1). `renderLogs` (`:1725-1861`): (1) the **power rule** `k log x = log x^k` within a base that has several logs (only when `x^k` stays exact); (2) the **product/quotient rule** merging all unit-coefficient logs of a base into one (`log(ups/downs)`, all-negative handled as `−log ab`); (3) each log evaluated: exact `r` via `exactLog` written as `b^r = x` (or via the primitive base `c^{gr} = c^m`, the `commonBase` label), else **change of base** `ln x / ln b ≈ …`; the total exact or `≈`; a `between` caption `b^k < x < b^{k+1}` for an inexact log of an integer base. `logGraph` (`:1864-1903`): when `0.1 ≤ x ≤ 10` and `|r| ≤ 10`, a square frame with `y = b^x` (orange), `y = log_b x` (blue), the mirror `y = x` dashed and the two mirrored points; otherwise `y = log_b x` alone with a drop line at `x`.

#### Equations: `renderEquation` → `renderExpEquation` / `renderLogEquation` (`:1909-2373`)
A small polynomial type `Poly = Q[]` with `linear(node)` reading a linear expression in `x` (`:1942-1973`); `checkLetters` forbids letters other than `x` and `e` (`eq.noX`); `hasLog` chooses the branch. `splitEq` needs exactly one `=` (`needEq`).
- **Exponential** (`:2034-2142`): each side becomes `ExpSide { k: EV, base: EV|null, p: Poly }` by `expSide` (`:1997-2020`: one base per side, linear exponents only, constants multiplied into `k`). Steps: divide by the number in front (`K = R.k/L.k`); `K ≤ 0` → `positive` (no solution); if both `K` and the right base are exact powers of the primitive base `c` (`exactLog`), **rewrite everything as powers of `c` and equate the exponents** (`:2055-2072`), solving the linear equation (`solveLinear`, `every`/`none`); otherwise **take logs**: `p(x) = log_b K` (or `ln`), `x = (log K − p0)/p1`, or with bases on both sides `x = (ln K + q0 ln d − p0 ln b)/(p1 ln b − q1 ln d)` written out (`:2074-2122`). Picture: `twoGraphs` (`:2339-2373`) draws `y = LHS` and `y = RHS` over a window around the solutions, y-range by 5–95 percentiles of 401 samples, the solutions as green dots. Check caption: both sides at `x`.
- **Logarithmic** (`:2146-2336`): collect logs with `x` to the left (`XLog { c, base, fn, arg: Poly }`, integer coefficients, one base) and constants/constant logs to the right (`n` exact when `exactLog` works, else `nApprox`). (1) The **domain**: every argument > 0 gives `lo`/`hi` (`:2189-2203`, purple row). (2) Either one log on each side (`sameBase`: equate the arguments) or combine into one log (`power rule` for coefficients > 1, products over quotients) and convert to exponential form `∏ups = b^n·∏downs` (`showCombine`, `:2226-2235`); when `b^n` is not rational (`e²`, `√2`) the same steps run numerically. (3) Expand to a polynomial of degree ≤ 2 (`tooHigh`), solve (exact roots as surds via `rootOfQ`), then **keep only the roots in the domain** — each listed as `valid` (green) or `rejected: argument = value ≤ 0` (red) with the `domainNote`/`allRejected` captions (`:2306-2322`). The graph greys out the region outside the domain and marks rejected roots with a red ×. `tests/powers.test.ts:148-172` pins `log_2(x) + log_2(x − 2) = 3` → `x = 4` with `−2` rejected, `2^x = −8` → always positive, and the three error messages.

`POWERS_PRESETS` (`:2393-2455`): ten index-law examples, nine scientific-notation ones (incl. `45 × 10³ (not standard)`), ten surds, nine logs, twelve equations.

---

### `src/math/sequences.ts` — patterns, arithmetic, geometric, Σ, recurrences

2166 lines. Imports chart, `derive` (for the derivative at a fixed point), `expr.ts` (`parseE`, `evalE`, `tex`, `substitute`, `toPoly`, `realRoots`, `rootFrac`, `simp`, `has`, `V`, `N`, `QS` helpers), `Frac`. `SeqSpec = { topic: pattern|arith|geom|sigma|recur; src }` (`:13-15`); `SeqWords` (`:17-136`).

#### Exact numbers that refuse to lose digits (`:142-203`)
`add/sub/mul/div/pw` wrap `Frac` and throw a private `TooBig` whenever an intermediate product leaves the safe-integer range (`ok`, `:146-160`; `div` by zero throws `words.zeroDiv` instead, `:157`); `exact(f)` runs a computation and returns `null` on `TooBig` (`:167-174`), so every value is `Q = Frac | number` — "a number is the fallback when fractions get too large" (`:179-180`); `qeq` writes `= 3/4` or `≈ 1.2e15`. `renderSequences` catches a stray `TooBig` and rethrows `w.tooBig` (`:2101-2121`).

#### Polynomials and sums of powers (`:207-350`)
`P = Frac[]` with `trim/deg/padd/pscale/pmul/pev/pnum/polyTex`. `factorize(p)` (`:248-291`) peels rational roots by the rational-root theorem with **synthetic division** (`:268-274`), sorting factors `n` first, then `(n + 1)`, `(n + 2)`, then `(2n + 1)`, …; `factorTex(p, v, at)` writes `n(n + 1)(2n + 1)/6`, or with `at` the factors as numbers `20·21·41/6`, and **falls back to the expanded polynomial if the factors do not multiply back** (`:296-298`). `interp(xs, ys)` is **Lagrange interpolation** (`:326-339`); `powerSum(d)` builds `Σ_{k=1}^{n} k^d` as a polynomial by interpolating `d + 2` points, memoised (`:341-350`).

#### Reading the input (`:354-544`)
`normal` (`…`, `≥`, `∞`), `itemsOf` (split on `;`/newline, then on top-level commas, but a run of plain numbers stays one list item; a decimal comma inside a fact is converted, `:365-400`), `constE`/`numOf` (a constant expression such as `2^10` or `(1/2)^3`), `refOf` (`u5`, `u_5`, `u_{5}`, `u(5)`, `u[5]`, `Sn`, `S_∞`, `a`, `:451-461`). `factsOf(src, params)` (`:496-544`) fills `Facts { letter, list, last, a?, d?, r?, terms, sums, inf?, queries }`: a bare `u20` or `S20` is a *term*/*sum* query, `S∞` an *inf* query, `= 401` a *which* query, `un > 1000` / `Sn > 500` a *first* query, `u5 = 17` a term fact, `S10 = 155` a sum fact, `S∞ = 12` the sum to infinity; indices 1…100 000.

#### Pictures (`:548-702`)
`panel` (`:551-585`): terms or partial sums against `n` as bars (`bw ≤ 22`) or joined dots, a dashed purple curve for the rule, a green dashed limit line; `twin` (`:589-594`): terms left (`seqU`, 250 px) and partial sums right (`seqS`). `gauss` (`:597-620`): the **Gauss picture** — the bars of `u_1…u_n` in blue and the same bars upside down in orange filling an `n × (u_1 + u_n)` rectangle, with the height bracketed. `diffTable` (`:623-661`): the difference table with each row offset half a column, V-shaped connectors, the constant row green, and for geometric lists the `×r` arcs above. `cobweb` (`:664-690`): `y = f(x)`, `y = x` dashed, and the staircase `u_1 → u_2 → …` (up to 40 terms within a cap of `100·max(|u_1|, |fixed|)`), fixed points as green dots.

#### Rules and queries (`:706-817`)
`Rule { at(n): Q, num(n), tex?, poly?, fn?, op? }`. `iterate` (`:722-739`) applies a step exactly while the fraction stays small (`d ≤ 10⁶`, `|n| < 10¹⁵`), then switches to floats. `ruleQueries` answers term/which/first queries; `polySub` writes `3·20² − 20 + 1`; `whichTerm` (`:778-795`) solves `rule(n) = v` by `realRoots` for a polynomial rule (a positive integer root) or by scanning `n ≤ 2000` for others; `firstN` scans `n ≤ 10⁶` for the first `n` with `value(n) op v` (`:797-804`); `recurRule` memoises the values of a recurrence (`:807-817`).

#### Pattern: `renderPattern` (`:821-939`)
At least 3 terms. Differences up to 5 levels; `constAt` is the first level ≥ 1 that is constant (`:827-832`). Cases: linear (`Δ` constant: `u_n = Δn + c`, `c = u_1 − Δ`); geometric (all ratios equal, not 1); quadratic (`Δ² = 2a`, then the table `u_n − an²` and the linear remainder, `:865-880`); cubic/quartic by **Newton's forward-difference formula** `u_n = Σ Δ^k u_1 /k! · (n−1)…(n−k)` (`:881-899`); a first-order linear recurrence `u_{n+1} = p·u_n + q` from three terms, verified on the rest (`:900-910`); a second-order one `u_{n+2} = p·u_{n+1} + q·u_n` solved from the 2×2 system (Fibonacci named when `p = q = 1`, `:911-924`); else `none`. The rule row, the next three terms, the queries, the difference table and the panel. `tests/sequences.test.ts:132-155` pins random cubics, `3,6,12,24 → 48,96,192`, Fibonacci, `2,5,11,23 → 47,95,191`, `1,-2,4,-8`, and "no simple rule" for the primes.

#### Arithmetic: `solve2`, `renderArith` (`:944-1102`)
`Lin { ca, cb, v, tex }` is a linear fact in `a, d`: a term `u_k = a + (k−1)d`, a sum `S_k = k·a + k(k−1)/2·d` (`:1016-1019`). `solve2` (`:947-995`) handles: one unknown known (substitute back); both unknown → pick the first independent pair, subtract when the `a`-coefficients match (`subtract` row), else Cramer's rule in one line (`solve`); every fact is then re-checked (`conflict`). A list gives `a` and `d` (all differences equal, else `notArith`). Rows: `u_n = a + (n−1)d = …`, `S_n = n/2(2a + (n−1)d) = factorTex(S)`; queries: a term, a sum by `n/2(u_1 + u_n)`, which term (`n = (v − c)/d`, integer ≥ 1), the first term past a bound (`n op (v − c)/d`, flipped for negative `d`), the first sum past a bound (a quadratic inequality, roots by `realRoots`, then the scan). Picture: the Gauss rectangle when all terms are non-negative, else the twin panels.

#### Geometric: `rootRow`, `logRow`, `renderGeom` (`:1107-1284`)
`rootRow(m, Q)` solves `r^m = Q` by `rootFrac` (an even `m` of a negative → `conflict`; no exact root → `noRoot`; even `m` sets `alt` so the caption mentions `−r`). `a, r` from a list, from two terms (`u_q/u_p = r^{q−p}`), from a term and `a`, from `S_∞` (`r = 1 − a/S_∞`, `a = S_∞(1 − r)`), or from a finite sum. Every fact is checked against `a, r`. Rows: `u_n = ar^{n−1}`, `S_n` in the `1 − r^n` form for `|r| < 1` and `r^n − 1` otherwise (`K = a/(1−r)` or `a/(r−1)`), `S_∞ = a/(1 − r)` when `|r| < 1`. Queries as for arithmetic; *which* and *first* use logarithms (`logRow`: `r^m op T ⇒ m op' ln T/ln r`, flipping for `r < 1`) when everything is positive. Picture: twin panels with the limit line. `tests/sequences.test.ts:88-131`.

#### Σ: `sigmaIn`, `writtenIn`, `renderSigma` (`:1288-1758`)
`sigmaIn` (`:1379-1399`) parses `sum k=1..20 (3k − 2)`, `Σ_{k=1}^{n} …`, `sum r=1 to ∞ of …`; the index is any letter but `e`, the upper bound a number, a symbol or `∞`; the summand is parsed with the index renamed to `x`. `writtenIn` (`:1404-1484`) turns a series written out (`1 + 4 + 7 + … + 100`, `1 + 1/2 + 1/4 + …`) into Σ form: arithmetic (`N = (last − a)/d + 1`, must be a whole number ≥ the terms given), geometric (scan for the term equal to `last`, up to 200), infinite arithmetic/geometric, or just a list of numbers to add (`plain`). `partsOf` (`:1353-1374`) splits the summand into `poly` (via `toPoly`), `geo` (`c·R^k` from `b^(pk + q)` or a power of such, `geoOf` `:1295-1323`) and `tele` (`c/((qk + s)(qk + s + qm))`: a quadratic denominator with two rational roots `m` apart, `teleOf` `:1324-1352`), merging like parts. `renderSigma` (`:1507-1594`): the first terms written out (3–4, and the last); then per part: `polyRows` (`:1606-1662`) — expand, handle `lo = 0` (take the `k = 0` term out) or `lo ≥ 2` (`Σ_1^{hi} − Σ_1^{lo−1}`), split into `Σ1, Σk, Σk², …`, substitute the **standard results** (`factorTex(powerSum(k))`, evaluated at `hi` for a number, simplified as a factored polynomial in `n` for a symbol), degree ≤ 6; `geoRows` (`:1665-1690`) — `a = c·R^{lo}`, `N` terms, the closed form, `a/(1 − r)` for `|r| < 1` to infinity, divergence otherwise; `teleRows` (`:1693-1758`) — **partial fractions** `α(1/(qk+s) − 1/(q(k+m)+s))`, the cancelling written line by line in an `aligned` block with grey `\cancel` terms, what is left (`m` terms at the start minus `m` at the end), the limit, and for a symbolic bound the closed form combined into one fraction when `m = 1`. A sum with no recognised parts and a numeric bound ≤ 2000 terms is added **directly** (`direct`). For a symbolic bound the closed form is checked at `n = lo + 1` against the first two terms (caption, red if wrong). Picture: twin panels (bars when ≤ 30 terms). `tests/sequences.test.ts:157-207`.

#### Recurrences: `recurIn`, `renderRecur` (`:1762-2097`)
`recurIn` (`:1767-1809`) reads `u(n+1) = …`, `u_{n+2} = …`, `u[n] = …` (the left-hand offset `off`), initial values `u(1) = 2`, and term queries; the right side's references are rewritten to `x` (lag 1) and `y` (lag 2) — any other lag is rejected — and `n` may appear. `recAt` evaluates exactly while the fraction stays small (`d ≤ 10⁶`, `|n| < 10¹⁵`), else as a float (`:1812-1823`); terms are generated up to `max(3000, queries)` (exactly only for the first 400). `linearOf` (`:1826-1846`) detects `c + p·x + q·y` by probing. `behaviour(us)` (`:1849-1866`) classifies the tail: `constant`, `converge` (last 60 equal), `cycle` of period 2–8 (last 80), `diverge` (> 10⁸ or steadily moving with non-shrinking steps), else `chaos`. Rows: the first two steps substituted, the list of the first 8/10 terms, then:
- order 1 linear (`:1932-1952`): `p = 1` → arithmetic closed form; `q = 0` → geometric; else the **fixed point** `ℓ = q/(1 − p)`, the shifted recurrence `u_{n+1} − ℓ = p(u_n − ℓ)`, the closed form `ℓ + (u_{k0} − ℓ)p^{n−k0}`, and `exactLimit` when `|p| < 1`;
- order 1 non-linear autonomous (`:1953-1998`): fixed points from `f(ℓ) = ℓ` — `realRoots` of `f(x) − x` for a polynomial of degree 2–4, otherwise **bisection** on 4000 cells over the range of the first 50 terms (`:1964-1979`); the derivative `f'` via `derive` + `simp`, evaluated at each fixed point with the `attract`/`repel`/`neutral` caption (`|f'(ℓ)| < 1` attracts);
- order 2 linear (`:1999-2061`): the **characteristic equation** `λ² = pλ + q` (`realRoots`), the particular constant `K = c/(1 − p − q)`, the general solution `A·α^n + B·β^n + K` with `A, B` from the two initial values solved in `QS` arithmetic (`qsDiv2` etc., `:1869-1886`, exact even for surd roots), or `(A + Bn)·α^n` for a repeated root; complex roots get a caption only; the dominant-ratio caption.
Queries, the long-run caption (`converge` with the exact limit when it matches numerically), and the picture: cobweb + panel for autonomous first-order maps, else the panel alone. `tests/sequences.test.ts:208-235` pins terms, limits and closed forms.

`SEQ_PRESETS` (`:2123-2166`): six patterns, six arithmetic (incl. `1 + 2 + … + 100` and `Sn > 500`), six geometric (incl. `8, −4, 2, …; S∞`), seven sigma (incl. telescoping and the written series), six recurrences (incl. the logistic map `3.2u(1 − u)` and Fibonacci to `F(20)`).

---

### `src/math/identities.ts` — trig identities: exact values, R-form, proofs, equations

2270 lines. Imports chart (incl. `legend`), `expr.ts` builders (`add/mul/pow/fn/neg/div/sub/N/V`, `parseE`, `evalE`, `tex`, `tidy`, `key`, `isNum`, `realRoots`, `sqrtSplit`, `gcd`), `Frac`. `IdSpec = { topic: compound|rform|prove|equation; src }` (`:10-12`); `IdWords` (`:17-117`) with `formulas: Record<Formula, string>` naming the identities used (`sinSum, cosSum, tanSum, sin2, cos2, tan2, recip, pyth, half`). `buildIdentities` returns a `Built { header, rows, pics, caps, data: IdData }` and `renderIdentities` composes it (`:1237-1249`, `:2214-2231`).

#### Exact numbers `Sd` = Σ q·√r (`:123-363`)
`Sd` is a map from square-free `r` to a rational coefficient (`Sd.of(q, r)` normalises `r` by `sqrtSplit`, `:146-151`). `add/neg/sub/scale/mul` (`√r1·√r2 = g·√(r1r2/g²)`, `g = gcd(r1, r2)`, `:173-185`), `val`, `rat`, **`inv`** (`:205-220`): multiply numerator and denominator by the conjugate with respect to one prime at a time (flip the sign of every term whose radicand contains the smallest prime of some `r > 1`) until the denominator is rational, at most 12 rounds; `sqrt` of a rational `p/q` as `√(pq)/q`; `tex()`/`plain()` write over one common denominator, a positive term first, a leading `−` factored out when every term is negative (`:233-269`). `T15` holds `sin` of 0°, 15°, …, 90° exactly (`:273-281`); `sinD/cosD` reduce any multiple of 15° by quadrant; `trigD(f, d)` gives all six functions, `false` where undefined (`:283-313`); `sdE/sdOf` convert to and from `E` trees.

#### Polynomials in s = sin u, c = cos u: class `P` (`:367-457`)
Monomials `{ i, j, k: Sd }` keyed by `i·4096 + j`, sorted by total degree; `add/neg/sub/scale/mul/konst/eq/deg/degS/degC/rational/val/key/divMono`; `divExact(f)` divides in lex order and returns `null` unless exact (≤ 300 steps). `variant(p, v)` (`:477-519`) applies `sin² + cos² = 1` in five ways: `redC` (every `cos²ⁿ → (1 − sin²)ⁿ`), `redS`, `pyth` (`k·sin² + k·cos² → k`), `toC2` (`k − k·sin² → k·cos²`), `toS2`, the last three by a rewrite loop. `normFactor` (`:523-543`) takes out powers of `s` and `c` and a rational scalar `k` so the rest has coprime integer coefficients and a positive constant (or first) term; `splitFactor` (`:545-567`) factors a polynomial in `s` alone, `c` alone, or a homogeneous one (through `tan = s/c`) into linear factors via `realRoots`; `factorPoly` combines them. `Rat = { n: P; d: P[] }` (numerator over a multiset of normalised factors) with `ratAdd` (lcm of the multisets), `ratMul`, `ratInv`, `ratPow`, `ratDiv` (cancelling shared denominators first), `sameRat`, `equalRat` (equal after `redC`, `:635`), and `cancel(n, d)` (`:637-651`) which factors the denominator and divides out every factor that divides the numerator exactly.

#### Writing (`:656-726`)
`Nm` names how `sin u`, `cos u` and the argument are printed; `polyTex` puts a positive term first (or a positive constant first for a denominator); `factorsTex`, `ratTex`, `factoredTex` (the fraction with the factors about to cancel shown).

#### Angles and set-up (`:730-887`)
`Arg = { n, a, af }` is the angle `n·(x/m) + a°`; `Ctx { unit, m, letter, plainLetter, args, used }`. `prep` normalises pupils' spellings (`θ`, `cosec`, `°`) and picks degrees unless `π` appears (`:802-807`); `analyze(arg)` reads a linear angle `k·x + a` by probing at 0, 1, 2 (non-linear → `linearArg`), with `a` converted to degrees in radian mode; `setup(srcs)` chooses `m` = lcm of the denominators of all `k` so every angle is a whole multiple of `x/m`, then `atomize` renames every trig atom to `fn(f, V(name))` with the name registered in `ctx.args` (non-trig letters → `onlyTrig`). `evalAt(e, ctx, xDeg)` evaluates at an angle in degrees (`:775-780`).

#### Rewriting passes (`:892-1118`)
`merge` combines repeated factors into powers; `mapAtoms` rewrites each trig atom. `passCompound` (`:960-1001`) expands `sin(nx ± a)` by the **compound-angle formulas** (`tan` via `(tan a ± tan x)/(1 ∓ …)`, with the special case `tan a` undefined → `−1/tan x`), or substitutes exact values when `n = 0`; `passNegative` (`:1002-1011`): `cos(−x) = cos x`, others odd; `passMultiple` (`:1012-1053`): even multiples by the **double-angle formulas** with `choice ∈ {0,1,2}` selecting `cos 2A = cos² − sin²`, `1 − 2sin²` or `2cos² − 1`; odd multiples split as `(n−1)x + x`; `passRecip` (`:1054-1067`): `tan sec csc cot` in terms of `sin`/`cos`. `rewriteAll` (`:1070-1091`) runs them in order (multiples up to 6 times), recording each step with the formulas it used; `keepTan` skips the reciprocal pass when everything is already in `tan`. `toRat` (`:1092-1118`) converts the rewritten tree into a `Rat`.

#### Proofs: `sideChains`, `renderProve` (`:1122-1346`)
`sideChains(e, ctx)` (`:1163-1205`) enumerates every route to rewrite one side: for each `cos 2A` choice, the pass steps, the single fraction (`combine`/`expand`), then every pair of `VARIANTS` applied to numerator and denominator (a large expression gets only `orig`/`redC` on top and `orig` below, and there is a **500 ms time limit** once one chain exists, `:1186-1187`), followed by `cancel`, a `factorise` line when a bracket cancels, and `simplify`; each chain is **verified numerically** at `PROBES = [17, 41, 73, 128, 199, 311, −67]` degrees (`verified`, `:1126-1136`) before being kept. `stepCk` gives a canonical key (the `Rat` key for a plain polynomial in `sin x, cos x`, else a sorted tree key, `:1139-1150`). `renderProve` (`:1255-1346`): sides split on `≡`, `===` or `=`; a quick numeric test plus `equalRat` of the two final forms decides `isId`; a non-identity gets a **counter-example** row at the first of `[30, 45, 60, 20, 10, 75, 120, …]` where the sides differ, and the graph. For an identity it finds the **shortest route on which the two chains meet**: for every left chain and right chain, the first line of the left that appears in the right (by TeX or by key; a "bridge" costs 0.6 extra, plus TeX length/200), or their last lines when `sameRat` (checked cheaply first by a fingerprint at two off-circle points, `:1296`), with a last resort of `equalRat` on the first 6×6 (`:1289-1325`). The rows start from the longer side, go down its chain to the meeting line, bridge if needed (labelled `bridge`, `expand` or `rearrange`), then back up the other chain; the final row is green. Graph: both sides, the LHS thick and pale when identical. `tests/identities.test.ts:63-100` generates random identities by substituting known rewrites and random non-identities by adding a term; `data.identity` must be `true`/`false` respectively.

#### R-form: `rSolve`, `renderRForm` (`:1350-1570`)
`rSolve(a, b, form)` (`:1353-1376`): `R² = a² + b²` (exact `Sd.sqrt` when rational), `α` by `atan2` for the chosen form (`sin+`: `(b, a)`, `sin−`: `(−b, a)`, `cos+`: `(−a, b)`, `cos−`: `(a, b)`), the form picked automatically as the first with `0 < α < 90°`; `α` is exact when a multiple of 15°. `linearSC` extracts `a sin θ + b cos θ + d` from a rewritten expression. `renderRForm`: an optional interval and an optional requested form `R cos(x + a)`; all atoms must share one angle (`notLinear`), both `a` and `b` nonzero (`needBoth`). Rows: expand `R sin(θ + α)`, compare coefficients, `R = √(…)`, `tan α = …`, the result, the max/min with the angles, and for `… = k` the solution: `sin(θ ± α) = k/R` solved by `basicSolve` over the shifted interval and mapped back to `x` (`toX`, `:1503-1529`). `basicSolve(f, v, iv)` (`:1423-1438`) gives the principal angle (exact if a multiple of 15°), the base solutions (`sin`: `α, 180 − α`; `cos`: `±α`; `tan`: `α`) and every one in the interval by stepping the period. Pictures: the right **triangle** with legs `R cos α`, `R sin α` (`triangle`, `:1553-1570`) and the graph of the two waves and their sum with `±R` lines and the `k` line (`:1532-1543`). `data.R, alpha, form, solutions` (`tests/identities.test.ts:145`).

#### Equations: `planFor`, `renderEquation` (`:1574-1810`)
Interval parsing (`intervalOf`, `:1395-1408`; default `0 ≤ x < 360°`/`2π`). A single compound angle (`2x − 30°`) is substituted by `θ` (or `u`) with the interval stretched (`:1654-1663`). For each `cos 2A` choice the sides are rewritten and `F = L − R` formed as a `Rat`; `F.n ≡ 0` after `redC` means `always` (`0 = 0`); otherwise `normFactor` strips `sin^i cos^j` and `planFor` (`:1580-1596`) classifies the rest: a polynomial in `sin` alone (rank 0), `cos` alone (0), even powers of `cos` → `redC` to `sin` (1), even powers of `sin` → `cos` (1), homogeneous → divide by `cos^d` to get `tan` (2), linear `a sin + b cos = k` → the R-form (3), else `none` (9); the lowest rank (then fewest terms) wins. Rows: the rewrite steps, the collected equation `sin^i cos^j (…) = 0` with the labels (`collect`, times the denominators, the Pythagorean substitution), the factorisation or the quadratic formula (`rootsOf`: exact via `realRoots` when rational, a linear surd, or bisection on `[−50, 50]`), each case `sin θ = v` solved by `basicSolve` with the principal-value note, the R-form path when linear, or **numeric bisection** of `L − R` on 4000 cells when nothing applies (`numeric` caption). Solutions are mapped back, deduplicated, kept only where **both sides have a value** (`rejected` caption otherwise, `:1781-1797`), and listed; graph of both sides with the solutions marked. `data.solutions/rejected` are compared with brute-force sign changes (`tests/identities.test.ts:102`).

#### Compound angles: `renderCompound`, `renderRatios`, `renderExpand` (`:1814-2210`)
`renderCompound` chooses: ratios given (`sin A = …`) → `renderRatios`; an expression in `x` → `renderExpand`; else an exact value of `f(deg)`: a multiple of 15° but not a basic angle → **`A ± B` with `A` basic and `B ∈ {30, 45, 60}`** (`:1841-1886`), expanded by the sum formula with the exact values substituted, for `tan` clearing fractions and **rationalising** with the conjugate; a multiple of 7.5° → the **half-angle** formulas with the quadrant sign and `nestedRoot` (`√(Y/w)` as `(g/w)√(Yw/g²)`, `:1940-1952`); a multiple of 15° → the standard value; otherwise `notExact` with the decimal. `sec/csc/cot` go through their reciprocal. Picture: the unit circle with the angle (`circlePanel`, `:1954-1974`). `renderRatios` (`:1977-2139`): parses `sin A = 3/5, A acute; cos B = −5/13, B obtuse; sin(A + B)`, quadrant from `acute/obtuse`, a range, or `Q n`, assumed (`assume` caption) when missing and sign-checked (`wrongQuad`); finds the other ratios by `1 − sin²` / `1 + tan² = sec²` with the quadrant signs; answers the queries (`sin/cos/tan` of `A ± B` or `2A`, defaulting to all three) with the formula, the substitution and the exact value. Picture: a quadrant panel per given angle (`quadPanel`). `renderExpand` (`:2163-2210`): tries the three `cos 2A` choices with `keepTan`, scores each route (`rows.length`, plus a `Rat`-based simplification when the result is nested or mixes `sin` and `cos`, preferring a single-function form), keeps the best, and graphs the expression.

`ID_PRESETS` (`:2233-2270`): eight compound (`sin 75°`, `tan 15°`, `cos(7π/12)`, `cos 22.5°`, two ratio problems, `sin 3x`, `cos(x + 60°)`), five R-forms, seven proofs, seven equations.

---

### `src/math/functions.ts` — domain/range, composites and inverses, transformations, sketching

1761 lines. Imports chart, `derive`, `expr.ts` (`parseE`, `evalE`, `simp`, `tidy`, `substitute`, `toPoly`, `realRoots`, `sqrtSplit`, the builders, `X`, `QS` helpers), `Frac`, `latexToSvg`. `FnSpec = { topic: domain|compose|transform|sketch; src }` (`:15-17`); `FnWords` (`:19-123`).

#### Numbers `Num` (`:134-222`)
`Num = { v, tex, plain, approx?, q?: QS }`. `plainOfTex` (`:135-161`) converts TeX to caption text (`ℝ`, `∪`, `≤`, `√`, `π`, `∞`, braces kept via sentinel characters). `asFrac(v, maxDen, tol)` is a **continued-fraction** rational recogniser (`:165-180`); `numOf(v, tol)` (`:182-208`) tries, in order: a fraction (denominator ≤ 360, or ≤ 24 for a loose tolerance), `(p/q)√s` from `v²`, a multiple of `π` (denominator ≤ 12), a power of `e` (`ln v` rational with denominator ≤ 6), else 3 significant digits with `approx: true`. `eqTex`/`eqPlain` write `=`/`≈`. `qsDiv` divides `a + b√s` values.

#### Polynomials and rational functions (`:226-398`)
`P = Frac[]` with `ptrim/pdeg/padd/pscale/psub/pmul/pderiv/pnum/pqs` (Horner in `QS`), `pdivmod`, `pgcd` (Euclid on polynomials, monic result, `:257-261`), `toRat(e)` (an `E` as top/bottom polynomials, powers up to ±8, `:264-299`), `tidyRat` (integer coefficients, positive leading denominator), `polyTex`, `factorize` (rational roots by the rational-root theorem with divisors up to 5000, `:327-366`), `factorTex`, `rootsOf` (exact `QS` roots then numeric, sorted), `ratTex`.

#### Sets of reals (`:403-455`)
`Iv = { lo: Num; hi: Num; loIn; hiIn }`, `REALS`. `intersect` (pairwise with inclusive-end logic at coincident ends) and `merge` (sort, join overlapping or touching-with-an-included-end intervals, `:407-430`). `ivTex` writes `(−∞, 2) ∪ (2, ∞)` or `{a}`; `ineqTex` writes inequalities, including the special form `x ≠ a, x ≠ b` when the set is ℝ minus points (`:440-455`).

#### Domain: `conditions`, `criticalNumeric`, `solveCond`, `domainOf` (`:459-672`)
`conditions(e)` (`:464-508`) walks the tree and collects `Cond { g, op: ne|ge|gt|in11, why }`: a negative integer power → `g ≠ 0` (`den`); an even root → `g ≥ 0` (`root`), a negative even root → `g > 0` (`rootPos`); a variable exponent on a non-positive base → `g > 0` (`base`); `ln`/`log` → `g > 0`; `asin/acos` → `−1 ≤ g ≤ 1`; `tan sec cot csc` → a `Periodic` record (`cos`/`sin` of the argument ≠ 0). Constant conditions are evaluated at once (`never`). `criticalNumeric(g, L, n)` (`:511-551`) samples `[−L, L]` on `n` cells and finds zeros (sign changes with a small value, refined by **bisection** to 80 steps), poles (sign changes with a large value), domain edges (finite ↔ non-finite, bisected) and **touching zeros** (a dip of `|g|` to 0 without a sign change, refined by ternary search, `:537-547`); an exact 0 counts only when isolated (underflow guard, `:528`). `solveCond(g, op)` (`:554-588`): zeros and poles exactly for a rational `g` (`toRat`), numerically otherwise; sample the sign on each piece between the critical points, include zeros for `≥`; `in11` is the intersection of two `≥` conditions. `periodicOf` writes `x ≠ x0 + kπ/|α|` for a linear argument and lists the excluded points for `k ∈ [−40, 40]` (`:639-650`). `domainOf(e, restrict)` (`:653-672`) intersects every condition, adds the periodic exclusions as rows, applies an explicit restriction (`x ≥ 2`), and reports `any` (whether anything restricted).

#### Range: `exactAt`, `limitOf`, `rangeOf` (`:591-759`)
`exactAt(e, x, rat)` (`:591-613`) evaluates exactly when `x` is a fraction (`simp(substitute(…))`, or `numOf` of the float, or a short TeX of the simplified tree), or in `QS` arithmetic for a rational function at an `a + b√s` point, else numerically. `limitOf(f, a, side)` (`:616-634`) samples one point per power of ten approaching `a` (or going to ±∞), returns `±∞` on overflow or when the steps are monotone and not shrinking, a finite limit when the last steps are tiny, or `null`. `rangeOf(e, dom, rat, oscillates, gaps)` (`:676-759`): for each domain piece (at most 14; periodic gaps near 0 split the domain into pieces and the piece at 0 "speaks for all"), the candidates are the stationary points inside (roots of the exact derivative numerator for a rational function, else numeric zeros of `simp(derive(e))` plus corners), the included ends evaluated, excluded ends as limits (for a rational function at ±∞ the horizontal asymptote exactly), and a **sampling check** of 3000 points that adds a numeric min/max when something was missed or the function oscillates; the piece's range is `[min, max]` with inclusivity by attainment. `tests/functions.test.ts:116-149` checks on 28 random functions that every sampled `x` is in the domain iff `f(x)` is finite, every value lies in the range, and closed ends are approached within 1 %.

#### Pictures (`:763-833`)
`ticks` (0.25, 0.5, 1, 2, 5, 10, … apart, at most `max`), `windowFor(fs, featX, featY, minHalf)` (features padded 35 %, at least `minHalf` either side; y by the 6–94 % quantiles of 601 samples plus the feature y-values and 0, padded 12 %), `dash` (a dashed clipped line), `domainRangeMarks` (the domain as a 6 px green band on the x-axis, the range in orange on the y-axis, filled/hollow end dots), `finish`.

#### Reading (`:838-894`)
`Def = { name, e, restrict, restrictTex }`; `defsOf` reads `f(x) = …` or `y = …` lines with an optional trailing `, x ≥ 2` / `, −1 < x ≤ 4` (`restrictionOf`); `oneFunction` takes the first definition or a bare expression.

#### `renderDomain` (`:898-936`)
Rows: each condition with its solution (`den`, `root`, …), `x ∈ ℝ` when nothing restricts, the explicit restriction, the domain in green, the range candidates (`smallest`, `largest`, `limit`, `numeric` rows, at most 6 unique), the range in orange. Picture: the curve with the periodic exclusions as red dashed verticals, the domain/range bands, and the end points on the curve (filled when included, hollow at a limit).

#### Composites and inverses: `invert`, `twoToOne`, `machines`, `renderCompose` (`:940-1308`)
`invert(f, dom, rows)` (`:968-1092`) undoes `x = f(y)` **layer by layer**: when `y` occurs more than once, a Möbius form `(ay + b)/(cy + d)` is cross-multiplied and `y` factored out (`collect`, `factorY`), or a quadratic in `y` is **completed to a square** `a(y − h)² + k` (`complete`); otherwise by the outermost node: `add` (subtract the constant part), `mul` (divide), `pow` (reciprocal; the `d`-th root for `1/d` powers; for an even integer power the sign of the inner layer on the domain decides `±√` via `signOn`, and a mixed sign throws `noInverse`; a variable exponent → `ln`/`log_b`), `fn` (`ln → e^`, `sin/cos/tan → arc…` only when the inner layer stays within the principal range, `asin → sin`, `abs` by the sign), `log` (exponentiate). `twoToOne(f, dom)` (`:1095-1122`) scans 800 samples per piece for a turn in monotonicity and bisects for a second `x` with the same value — the error `notOneToOne` names `a, b, y` and the turning point with the `restrictHint`. `machines` (`:1125-1153`) draws the function-machine strip `x → [g] → g(x) → [f] → f(g(x))` with the rules as TeX in boxes. `renderCompose` (`:1155-1276`): definitions plus queries `fg(x)`, `f(g(x))`, `fg(2)`, `f^-1(x)`/`f⁻¹(5)`, `f(3)`; with no query, `fg` and `gf` for two functions or the inverse for one. A composite is `substitute(F, "x", G)` simplified, with its domain (`x` must suit `g`, `g(x)` must suit `f` — handled by `domainOf(raw)` since the raw tree contains both); a value query gives the two-stage evaluation and the machine picture; the inverse gives the steps, `f⁻¹(x)`, the domain/range swap, a value if asked, a check at a sample `y` (`f(f⁻¹(y)) = y`), and `inversePic` (`:1279-1308`: `f`, `f⁻¹`, `y = x` on equal scales with three well-spread points and their mirror images). Two composites get a `same`/`differ` caption and a joint graph. `tests/functions.test.ts:151-186`.

#### Transformations: `renderTransform` (`:1312-1478`)
`Stage = { A, B, h, D, abs? }` means `y = A·f(B(x − h)) + D` or `|f(x)|`/`f(|x|)`; `applyStage`, `mapPoint((x, y)) = (x/B + h, A·y + D)`, `stageTex`. The body `y = 2f(x − 3) + 1` is parsed by locating the single `F(` call, reading the inner argument and the outer wrapper as linear polynomials (`toPoly`), and emitting stages **in the order a pupil applies them**: x-stretch by `1/|B|`, reflect in the y-axis, shift by `h`, y-stretch by `|A|`, reflect in the x-axis, shift by `D` (`:1404-1409`). `keyPoints(f)` (`:1332-1349`) picks up to three of the turning points (zeros of the derivative), the y-intercept, the x-intercepts and fallbacks at 1, −1, 2, within `|x| ≤ 6`, `|y| < 50`. Rows: the start, each stage, the full formula (simplified when shorter), the point map `(x, y) ↦ (…)`; caption lists where the key points go. Picture: one small panel per stage (420 px alone, 280 px in two columns), the curve before dashed grey and after blue, orange arrows from each key point to its image; the window is clamped around the key points (`:1431-1436`). `tests/functions.test.ts:187` checks the key points land on the new graph.

#### Curve sketching: `signStrip`, `renderSketch`, `classifyStat` (`:1482-1697`)
For a rational function (`toRat`): tidy, cancel the common factor `pgcd` (**holes** listed with their values, hollow dots), the y-intercept, the x-intercepts from the factored numerator (a `touches` caption for even multiplicity), vertical asymptotes from the denominator with the one-sided limits `±∞` (`sides` caption), the horizontal asymptote (`y = 0` or the ratio of leading coefficients, and where the curve crosses it) or the **oblique asymptote** by `pdivmod` when `deg n = deg d + 1`, the derivative by the quotient rule as `P/d²`, the stationary points (roots of `P` not at poles or holes) classified by the sign of `f'` either side (`classifyStat`, `h = 10⁻⁴·max(1, |x|)`, `:1693-1697`) with their exact values, and the behaviour at the ends. Otherwise numerically: the domain, intercepts by `criticalNumeric`, vertical asymptotes where one-sided limits are infinite at poles or domain ends, horizontal asymptotes from `limitOf` at ±∞, the derivative by `derive` (or a central difference), stationary points. Then the sign of `f` on the pieces between zeros and poles (`positive` caption when ≤ 6 cuts). Picture: the `signStrip` (`:1485-1501`: rows `f` and `f′` with `+`/`−` on each piece and tick marks at the cuts) above the graph, asymptotes dashed red, features dotted and labelled (max red, min green, inflection purple). `tests/functions.test.ts:217`.

`FN_PRESETS` (`:1723-1761`): eight domain examples (incl. `tan x` and a restricted `x²`), seven compose (incl. four inverses), six transformations (incl. `|f(x)|`, `f(|x|)`), seven sketches (incl. `x·e⁻ˣ`, `ln(x)/x`).

---

### `src/math/complex.ts` — complex numbers

597 lines. The only module in this part that uses **mathjs** (`evaluate`) — for parsing (`:5`). Also imports chart, `niceStep` from `./scale`, `texBox` from `./logic`. `CxSpec = { topic: form|ops|powers|roots|quadratic|euler; z; w; op: CxOp; n; a; b; c; t }` (`:16`), `CX_OPS = + − * /`. `CxWords` (`:18-39`).

#### Numbers and parsing (`:43-154`)
`Cx = { re, im }` with `add/sub/mul/abs/arg/polar/clean` (values under 10⁻¹⁰ become 0). `parseCx(s, w)` (`:55-75`) normalises `π → " pi "` ("spaced, so iπ is i·pi and not a name ipi"), `√( → sqrt(`, `√n`, `·×`, the minus signs, and `45°` → `(45·pi/180)`; `r∠θ` is turned into `r·(cos θ + i sin θ)`; otherwise mathjs evaluates with a `cis` helper; a plain number or an object with `re/im` is accepted, anything else throws `badNumber`. `tests/complex.test.ts:12-24` pins 16 spellings including `2e^(iπ/3)`, `−2−2√3i`, `cis(pi/2)`, `60°`. `rat(v, maxQ, maxP)` finds `p/q` with `q ≤ 12` within `EPS = 10⁻⁹` (`:78-84`). **`nice(v)`** (`:90-109`) writes an integer, a fraction, `(p/q)√m` for `m ∈ {2,3,5,6,7,10}`, or 4 decimals with `exact: false` — pinned by `tests/complex.test.ts:26-32` (`√2/2 → \frac{\sqrt{2}}{2}`, `π → 3.1416`). `cxNice(z)` writes `a + bi` with the usual shortcuts; `angNice(t)` writes a multiple of `π` (denominator ≤ 12) with the degree value (`rat(deg, 4)`); `expForm(r, θ)`, `zLine`, `ang` (brackets for a negative angle), `eq`.

#### Drawing (`:158-230`)
`plane(points, left, top, size = 300, id)` is a square frame `[−m, m]²` with `m = 1.22·max(1.2, max |re|, |im|)`; `planeAxes` labels ticks every `niceStep(span, 6)` with `Re`/`Im`; `arrow(f, a, b)` with a filled head of length `min(10, len/2)`; `pointLabel` pushes the label away from the origin and flips it when it would run off the plane; `arc` draws an angle arc as a polyline (`0.08` rad per segment); `circlePx`; `steps(lines, x, y, maxW)` stacks TeX boxes (`texBox`) shrinking each to the width; `layout(planeSvg, lines)` = plane left, steps right of `PLANE + 70`.

#### Topics (`:234-527`)
- **form** (`:234-276`): legs `a` (red dashed) and `b` (green dashed), the conjugate as a grey dashed arrow, the angle arc; lines: `|z| = √(a² + b²)`, the reference angle `α = arctan|b/a|` and the quadrant rule (`θ = α`, `π − α`, `−(π − α)`, `−α`), the trig and exponential forms, `z̄`, `z·z̄ = |z|²`, `1/z = z̄/|z|²`. `z = 0` gets `arg undefined`.
- **ops** (`:278-350`): `+`/`−` written component-wise with the **parallelogram** (and `−w` for subtraction); `×` expanded with `i² = −1` and `|zw| = |z||w|`, caption "lengths multiply, angles add" with the degrees; `÷` by the conjugate (`den = c² + d²`, zero → `divZero`); products/quotients draw the three angle arcs at radii 22/32/42. `tests/complex.test.ts:34` compares with mathjs.
- **powers** (`:358-405`): `n ∈ [−12, 24]` (`intIn`, else `badN`); `z = 0` with `n ≤ 0` → `divZero`; **De Moivre** `z^n = r^n e^{inθ}` with `nθ` reduced into `(−π, π]` and shown as `≡ … (mod 2π)` when it changed; the spiral of `z⁰ … zⁿ` on the plane (`#b197fc` polyline), every point labelled when ≤ 5 points or on the unit circle; for `z = i` the `i⁴ᵏ⁺ᵐ` cycle line.
- **roots** (`:408-439`): `n ∈ [2, 12]`, `w_k = ⁿ√r·e^{i(θ + 2πk)/n}`, the roots as a regular polygon on the circle of radius `r^{1/n}`; `z` itself is drawn only when `r ≤ 2.5·ⁿ√r` ("∛8: z = 8 would shrink the triangle", `:415`); up to 8 roots listed. `tests/complex.test.ts:51` raises each root to `n`.
- **quadratic** (`:455-498`): real `a, b, c` (`a ≠ 0`), `D = b² − 4ac`, `√D = i√|D|` when negative, `z₁,₂`; the parabola on the left (270 px) with real roots as dots, the roots in a 250 px plane on the right joined by a dashed purple line when conjugate; captions name the case and **Vieta** `z₁ + z₂ = −b/a`, `z₁z₂ = c/a`.
- **euler** (`:500-527`): a real `θ`, the point `e^{iθ}` on the unit circle with the cos (green) and sin (red) legs, `cos θ`, `sin θ` exactly via `nice`, `|e^{iθ}| = 1`, and the special `e^{iπ} + 1 = 0` when `|θ| = π`.

`CX_PRESETS` (`:548-597`): six forms, six ops, five powers, six roots, five quadratics and five Euler angles, all over one `base` spec `3+4i, 1−2i, +, 3, 1, 2, 5, π/3` (`:548`) (forms incl. `2∠150°`, `3i`, `−5`; ops incl. `(1 + i)·i` and `(3 + 4i)(3 − 4i)`; powers incl. `i⁷` and the `(0.9 + 0.4i)¹²` spiral; roots incl. `⁴√(−16)` and the 6th roots of unity; quadratics incl. one with real roots; Euler at π, π/3, π/2, 3π/4, 1 rad).

---

### `src/math/matrix.ts` — exact matrix arithmetic to LaTeX

264 lines; imports only `Frac`. `Mat = Frac[][]`; `MatrixOp = add | sub | mul | scalar | transpose | det | inverse | solve` with `OP_LABELS` (`:4-16`). `MatrixCalcSpec = { type: "calc"; op; A: string[][]; B: string[][]; k: string; steps: boolean }` (`:18-25`). Errors are `MatrixError` carrying a key (`empty | invalid | sameSize | mulSize | square | solveSize | notBasis`) "so the dialog can show a translated message" (`:27-35`). `needsB` is true for `add/sub/mul`. `parseMatrix` turns the cell strings into `Frac` (`:39-48`).

LaTeX helpers (`:52-61`): `env(rows, name)` (`pmatrix` by default), `texM`, `texAug(m, split)` (an `array` with a `|` before column `split`), `lines(ls)` (an `aligned` block with `\\[4pt]`).

Arithmetic (`:65-131`): `map2`, `mul` (row × column with `Frac` sums), `minor`, `det` by **cofactor expansion along the first row** (`:75-83`, recursive, exact). `gaussJordan(start, cols)` (`:88-121`) is **Gauss–Jordan elimination with row swaps to the first nonzero pivot** (no partial pivoting by magnitude — exact fractions need none), recording grouped row operations: a swap `R_r ↔ R_p`, a scaling `R_r → k·R_r` (`k = 1/pivot`, written as `−` for −1 or in brackets when fractional), and all eliminations `R_i → R_i ∓ c·R_r` of one column as one step; returns the RREF, the steps and the pivot columns, normalising `−0` to `Frac.ZERO`. `stepLines` (`:123-131`) typesets the start matrix and each step with the operations right-aligned in a `gathered` block before a plain `\longrightarrow` (a stretchy `\xrightarrow` label "overlaps its arrow in MathJax's standalone SVG").

`matrixLatex(spec)` (`:138-255`): `add/sub` (size check, the element-wise step when `steps`); `mul` (inner dimension check, the dot-product step when ≤ 4 inner and ≤ 16 cells); `scalar`; `transpose`; `det` (1×1 direct; 2×2 `ad − bc`; larger by cofactors with the minors written as `vmatrix`, and for 3×3 the 2×2 minors expanded); `inverse` (singular → `∄ A⁻¹`; 1×1 as `1/a`; 2×2 by the adjugate `1/det·[[d, −b], [−c, a]]`; larger by **Gauss–Jordan on `[A | I]`**); `solve` (A is the augmented matrix `[coefficients | b]`, 1–4 unknowns `x y z w`; after RREF a row `0 … 0 | c ≠ 0` means inconsistent `∅`; free columns become parameters `t s u v` and each pivot variable is written as a constant plus the free terms moved to the right, `:236-251`). `DEFAULT_MATRIX` multiplies `[[2,1],[1,3]]·[[1,0],[4,−1]]`. `tests/plotting.test.ts:50-59` checks determinants against cofactor expansion and `A·A⁻¹ = I` through `gaussJordan`; `:72-88` renders every operation and pins the error keys (`sameSize`, `mulSize`, `square`, `empty`, `invalid`, `solveSize`); `:90-99` pins a unique solution, `∅` for parallel lines, and the family `x = 2 − t, y = t`.

---

### `src/math/vectorspace.ts` — span, subspaces, coordinates, Gram–Schmidt, eigenvalues

502 lines. Imports `Frac`, `gaussJordan/lines/MatrixError/parseMatrix/stepLines/texM` from `./matrix`, and chart (`arrow`, `axes`, `makeFrame`, `lbl`, `compose`). `SpaceSpec = { type: "space"; op: span|subspaces|coords|gram|eigen; A: string[][]; w: string[]; steps }` (with `SPACE_OPS` and the UI `SPACE_LABELS`, `:10-17`) — "Vectors are the columns of A; w is the vector for coordinates" (`:19-20`). `SpaceWords` (`:22-35`). `SPACE_PRESETS` (`:37-50`) is a flat list of twelve `{ op, label, A, w? }`; `DEFAULT_SPACE` uses the second (three vectors in a plane).

#### Exact helpers (`:54-95`)
`cols`, `colTex`, `rowTex`, `spanTex` (`span{…}` or `{0}`), `dot`, `scale`, `sub`, `isZeroV`, `integral(v)` (multiply by the lcm of denominators, divide by the gcd, make the first nonzero entry positive — "a nicer multiple", `:63-70`), `coefTex` (1 and −1 implicit), `sumTex`. `nullBasis(R, pivots, n)` (`:76-83`) builds the null-space basis from the RREF: one vector per free column with `1` in that slot and `−R[i][f]` in the pivot slots, made integral. `sqrtTex(q)` (`:86-95`) writes `√q` simplified (`√(8/9) = 2√2/3`) and its reciprocal with a rational denominator.

#### Polynomials for eigenvalues (`:99-198`)
`charPoly(A)` is the **Faddeev–LeVerrier algorithm** (`:101-115`): `M_0 = 0`, `M_k = A·M_{k−1} + c_{n−k+1}·I`, `c_{n−k} = −tr(A·M_k)/k`, exact in `Frac`, giving `det(λI − A)` as an ascending coefficient array (`c[n] = 1`, then `c_{n−1}, …, c_0` in turn). `evalP` (Horner), `deflate(p, r)` (synthetic division by `λ − r`), `rationalRoots` (rational-root theorem with divisors up to 10⁵, multiplicities, roots sorted descending, the leftover `rest`), `numericRoots(p)` — **Durand–Kerner** (Weierstrass) simultaneous iteration from points on a circle of radius 1.3 at offset 0.4, 500 iterations, printed to 4 dp with `i` (`:167-188`), `polyTexL` (in λ), `linL` (`(λ − r)`).

#### Pictures (`:202-301`)
`picture2d(arrows, opts)` (`:205-230`): a 330 px square frame `[−R, R]²` with `R = 1.25·max(1, reach)`, a green tint for a span that is all of ℝ², a thick translucent green line for a 1-D span (clipped), optional extra SVG in data coordinates, arrows (possibly `from` a point, dashed) with labels pushed 12 px past the tip. `picture3d(arrows, span)` (`:233-278`): an **oblique projection** `P([x, y, z]) = (ox + s(−0.55x + y), oy + s(0.42x − z))` with the three axes, a translucent green square patch for a plane (the two directions orthonormalised first "so the patch is a nice square"), or a line. `vectorsPicture` chooses by dimension (2 or 3, else none); `finish` composes.

#### `renderSpace(spec, w)` (`:305-500`)
- **span**: RREF of `A`; rank `r`; `span{v₁…} = span{pivot columns}`, `dim = r`; independent when `r = n`, otherwise each null-space vector gives a **dependency relation** `Σ cⱼ vⱼ = 0` and the dependent (free) columns are named; `spansAll`/`notSpan` by `r = m`; picture with the span.
- **subspaces**: RREF of `A` and of `Aᵀ`; `C(A)` = pivot columns, `R(A)` = nonzero rows of the RREF, `N(A)` and `N(Aᵀ)` by `nullBasis`, and **rank–nullity** `rank + dim N = n`.
- **coords**: square `A` (`notBasis` otherwise), `w` parsed (`empty`/`invalid`), Gauss–Jordan on `[A | w]`; fewer than `n` pivots → `notBasis`; `[w]_B` and `w = Σ cᵢ bᵢ`; in ℝ² the picture draws the **skewed grid** of the basis (lines through `k·b₁` along `b₂` and vice versa for `k ∈ [−8, 8]`, `:380-389`) with the dashed partial sums `c₁b₁` then `c₂b₂` leading to `w`; in ℝ³ the four vectors.
- **gram**: **Gram–Schmidt** `uⱼ = vⱼ − Σ (vⱼ·uᵢ)/(uᵢ·uᵢ)·uᵢ` in exact fractions, each step written with the formula and the numbers; a zero `uⱼ` is dropped with the `gramDropped` caption; then `eᵢ = uᵢ/‖uᵢ‖` with `sqrtTex`; picture: the originals grey dashed, the unit vectors coloured.
- **eigen**: `charPoly`, `rationalRoots`, the factored form; for each rational `λ` (with algebraic multiplicity) the matrix `A − λI`, its RREF and the eigenspace `E_λ = span{nullBasis}`; `A = PDP⁻¹` with `P` the eigenvectors as columns when every root is rational and the geometric multiplicities sum to `n`; `notDiagonalizable` when every root is rational but they fall short; when the leftover factor has degree ≥ 1 neither verdict is given and its roots are listed numerically via Durand–Kerner (`otherRoots`, `:464-475`); a non-square `A` throws `MatrixError("square")` (`:446`); in ℝ² the picture draws each eigenvector `vᵢ` and `A·vᵢ = λᵢvᵢ` (dashed) along the eigen-lines.

---

### Cross-module dependency map (part A)

| module | imports from `src/math/` |
|---|---|
| `placeValue`, `division`, `multiply` | `latex` (type only) |
| `fracop` | `chart`, `latex` |
| `percratio` | `chart`, `fraction`, `latex` |
| `models` | `placeValue`, `multiply`, `division`, `fracop`, `percratio`, `latex` |
| `mental` | `algoArrays`, `chart`, `latex` |
| `numtheory` | `algoArrays`, `chart`, `latex` |
| `combinatorics` | `algoArrays`, `chart`, `latex` |
| `algebra` | `algoArrays` (table, txt), `chart`, `latex` (`latexToSvg`) |
| `polynomials` | `chart`, `expr`, `fraction`, `latex` |
| `powers` | `chart`, `latex` (type) — its own parser, no `expr.ts` |
| `sequences` | `chart`, `derive`, `expr`, `fraction`, `latex` |
| `identities` | `chart`, `expr`, `fraction`, `latex` |
| `functions` | `chart`, `derive`, `expr`, `fraction`, `latex` |
| `complex` | `chart`, `latex`, `scale` (`niceStep`), `logic` (`texBox`), **mathjs** |
| `matrix` | `fraction` |
| `vectorspace` | `fraction`, `matrix`, `latex`, `chart` |

Three independent exact-rational implementations coexist: `algebra.ts`'s private `Q` (limit 10¹²), `powers.ts`'s private `Q` (safe-integer limit, `divZero` error), and `Frac` from `fraction.ts` used by everything else (with `polynomials.ts`'s `chk` at 6·10⁷ and `sequences.ts`'s `TooBig` at the safe-integer boundary). Four private polynomial toolkits (`algebra`, `powers`, `polynomials`, `sequences`, `functions`) each carry their own `trim/deg/padd/pmul/Horner` because they differ in the coefficient type and the overflow policy. The rational-root theorem with synthetic division or `pdivmod` appears in `polynomials.factorQ`, `sequences.factorize`, `functions.factorize` and `vectorspace.rationalRoots`; the iterative extended Euclid in `numtheory.extended/binv`; Gauss–Jordan in `matrix.gaussJordan` (fractions, first-nonzero pivot) and `polynomials.solveLinear` (fractions, same strategy); marching squares in `polynomials.contour`; Faddeev–LeVerrier and Durand–Kerner in `vectorspace`; Lagrange interpolation in `sequences.powerSum`; continued fractions in `functions.asFrac`; bisection/ternary search throughout the numeric fallbacks (`functions.criticalNumeric`, `sequences.renderRecur`, `identities.rootsOf/renderEquation`).


## 8. The maths library, part B: geometry, calculus, data, logic, algorithms

Every module in this part follows one shape: a `*Spec` type the dialog serialises, a `*Words` type the locale fills, a `render*(spec, words): RenderedSvg` entry point, and a `*_PRESETS` table of example chips. Each renderer computes, writes worked steps as `TexLine[]` rows (`{ tex, op?, color? }`), draws one standalone SVG, and hands `compose(header, body, bodyH, captions)` from `chart.ts` the LaTeX header, the picture and the caption sentences. Shared conventions: `C` is the palette (`C.blue`, `C.orange`, `C.green`, `C.red`, `C.purple`, `C.grey`, `C.ink`); `W` is the picture width; `makeFrame(id, left, top, w, h, [x0, x1], [y0, y1])` returns a `Frame` with `sx`/`sy` world→pixel maps and a clip path; `axes`, `curve`, `dot`, `lbl`, `hline`, `vline`, `texLines`, `texAt`, `nt` (plain number text), `tn` (TeX number), `fill(template, vars)` all come from `chart.ts`. `Frac` (exact rationals) comes from `fraction.ts`; `parseE`/`evalE`/`tex`/`simp`/`derive`-style expression trees from `expr.ts`; `latexToSvg` from `latex.ts`. Several modules export a `data`/`lastResult()` side channel so the tests can check numbers without parsing SVG.

### src/math/geometry.ts — plane geometry on a grid

**Purpose** (`geometry.ts:1-2`): triangles, quadrilaterals, circles, Pythagoras, angle facts, a protractor and symmetry, all on an integer grid with y up. Measurements are read off the points; the picture is the grid plus the shape; the dialog overlays drag handles on `planeSvg`.

#### Spec and constants

`GeometrySpec` (`geometry.ts:15-31`): `type: "geometry"`, `shape: GeoShape` (one of `"triangle" | "quad" | "circle" | "pythagoras" | "angles" | "protractor" | "symmetry"`, `GEO_SHAPES:7`), `pts: Pt[]` whose meaning depends on the shape (triangle A B C; quad A B C D; circle O P; pythagoras C (right angle) A B; protractor O A B; angles depends on `mode`; symmetry `[M, N (mirror), ...polygon]` except `sym: "lines"` = `[...polygon]`), booleans `lengths`, `angles`, `area`, `grid`, `snap`, optional `caption` (classification text stored at insert time), `mode?: AngleMode` (`"line" | "point" | "vertical" | "parallel"`), `hide?` (protractor hides the reading), `sym?: SymMode` (`"reflect" | "lines" | "practice"`), `guess?: Pt[]` and `reveal?` for practice, `factNames?` (corresponding/alternate/co-interior in the UI language). `pointNames` (`:33-47`) returns the letters per shape; angle modes name `line: O L P`, `point: O P Q R`, `vertical: O P Q`, `parallel: P Q`.

Plane: `PLANE = { w: 16, h: 12, u: 36, pad: 14 }` (`:54`), so the picture is 16×12 grid units at 36 px each plus 14 px padding; `PLANE_PX = { w: 604, h: 460 }` (`:55`) is the pixel size the dialog uses for its viewBox; `toPx([x,y]) = [pad + x·u, pad + (h − y)·u]` and `fromPx` is its inverse (`:56-57`). `ARM = 5` is the protractor arm length (`:50`).

#### Measurement

Helpers (`:61-117`): `sub/add/mul/dot/cross/len/dist`, `nearInt` (|v − round v| < 1e−9), `fmt` (2 dp), `sumLine` (writes `P = 3 + 4 + 5 = 12` or with `≈` when any part is a surd or the total is not an integer), `deg` (1 dp with °), `dirDeg` (atan2 in 0..360), `mirror` (point reflection through o). `lengthText` (`:85-95`) returns `{short, long, value}`: integer displacements give `"5"` or `"√13"`/`"√13 ≈ 3.61"` (perfect squares collapse); non-integer displacements give the decimal. `angleAt(p, v, n)` (`:98-103`) is the unsigned angle via `atan2(|cross|, dot)`. `polyArea2` is the shoelace sum (twice the signed area); `interiorAngles` (`:108-117`) uses the polygon orientation sign to turn reflex corners into `360 − θ`.

`measure(spec): Measured` (`:138-243`) returns `{ lines, classes, sym? }`; `ClassKey` (`:121-125`) is the classification vocabulary the UI translates. Per shape:
- triangle: degenerate if area < 1e−9; lines are the angle sum, perimeter via `sumLine`, and `S = ½·c·h` with `h = 2·area / c`; classes are right/obtuse/acute (right when |max − 90| < 0.05) and equilateral/isosceles/scalene by counting equal side pairs with `eq` (relative tolerance 1e−3, `:130`).
- quad: angle sum 360°, perimeter, area; kind decided in order square → rectangle → rhombus → parallelogram → trapezium → kite → quadrilateral (`:171-178`) using `par` (cross product relative to lengths < 1e−6) and `rightAngles` (every angle within 0.05° of 90).
- circle: `r`, `d = 2r`, `C = 2πr`, `S = πr²`, and `C : d = π ≈ 3.14`.
- pythagoras: `a² + b² = c²`, the squares, and `c = √(a² + b²)` written exactly when the root is whole.
- angles: delegates to `angleScene`; class is `factLine/factPoint/factVertical/factParallel`.
- symmetry: `lines` mode returns `sym: { lines: axes.length, order }` from `symmetryOf`; reflect mode lists `A(x, y) → A′(x′, y′)` pairs two per line; practice returns only `factReflect`; both are `degenerate` when M and N coincide.
- protractor: `∠AOB = n°` (whole when within 1e−6 of an integer), hidden as `?` when `spec.hide` (then `classes` is empty too); class acute/right/obtuse/straight (right and straight within 0.05°).

#### Angle facts

`angleScene` (`:253-332`) builds `{ scene: {vertex, sectors}[], lines }` for the four modes. `line`: the second ray is `mirror(O, L)` so `a + b = 180°`. `point`: rays sorted by `dirDeg`, consecutive differences give `a + b + c = 360°`. `vertical`: both lines extended through O, four sectors alternating ORANGE/BLUE, lines `a = c`, `b = d`, `a + b = 180°`; returns null when the lines coincide. `parallel`: P and Q are the crossing points on two horizontal lines; `phi = angleAt([1,0], [0,0], up)` is the transversal's angle; at each crossing four sectors numbered 1–4 (upper) and 5–8 (lower), with `∠2 = ∠3 = ∠6 = ∠7 = φ`, and the corresponding/alternate/co-interior sentences (`:324-327`). `lineAcrossPlane` (`:335-346`) clips the infinite line to the 16×12 box by solving for the four box crossings and keeping those inside.

#### Symmetry

`reflectPt(q, m, n)` (`:351-354`) reflects via the foot of the perpendicular. `symmetryOf(pts)` (`:371-394`) tests mirror candidates "through its centre and through a vertex or an edge midpoint, so those are the only candidates" (comment `:368-369`): each candidate direction is kept if the reflected vertex set equals the original (`sameSet`, 1e−6) and no earlier axis is parallel. Rotational order: the largest k in n..2 with the rotation by 360/k mapping the set to itself; default 1.

#### Drawing

Constants: `INK`, `FONT` (Segoe/Helvetica/Noto Sans Georgian), `HALO` (white paint-order stroke) (`:398-400`). `label` places halo'd text; `sideLabel` pushes a label 14 px off the midpoint away from the centroid; `angleMark` (`:424-449`) draws a right-angle square (side 12 px) when within 0.05° of 90, otherwise an arc of radius `o.r ?? 20` with a filled 15 %-opacity sector, handling reflex angles by flipping the SVG large-arc/sweep flags and placing the label at `labelR ?? 36`. `pythagorasSquares` (`:501-509`) builds the three outward squares (normal flipped so it points away from the opposite vertex). `fitsPlane` (`:512-521`) checks every point (plus square corners, protractor half-disc extents `O ± (ARM, ARM)`, reflected images and guesses) lies within the plane.

`drawShape` (`:523-737`): triangle/quad draw the polygon in blue (`#a5d8ff`/`#1971c2`), the height from C with the base extended dashed when the foot lies outside (`t < 0` or `t > 1`), a right-angle mark at the foot, and the `h = …` label pushed 26 px towards the centre "so the height label goes inside" (`:541`); angle arcs; side labels; dots; vertex names 18 px outward from the centroid. Circle: the disc, the dashed opposite radius, `r = …` and `d = …`. Pythagoras: three squares in orange/green/purple with `a²`,`b²`,`c²` and their areas at the centroids. Angles: lines via `lineAcrossPlane`, parallel marks `>` near the right end, the transversal in PURPLE, sectors with `{ r: 30, labelR: 62 }` (22/38 for parallel). Symmetry: dashed orange axes and a purple centre dot for order > 1 in `lines` mode; otherwise the mirror in purple dashed `12 6`, image polygon in orange, grey connectors with a right-angle mark at the foot and equal-length ticks on both halves (`:650-664`), student guesses as hollow orange circles joined by a dashed polygon. Protractor (`:688-734`): radius `RP = (ARM − 0.6)·u`, 0° along OA, `side` chosen by the sign of `cross(OA, OB)`, a half-disc path and an inner arc at 0.32·RP, ticks every degree (16/10/5 px for 10°/5°/1°), two number scales (outer `k`, inner `180 − k`), the arms OA (blue) and OB (orange), and a ring where OB crosses the scale.

`planeSvg` (`:740-751`) draws the white background, a `#e9ecef` grid, and `drawShape` in a `<g FONT>`. `renderGeometry` (`:753-767`) appends the measurement lines (26 px line height; the caption line in blue 16 px, others 18 px bold) and returns `{svg, width, height}`; a triangle without `area` shows only the first two lines.

#### Presets

`GEO_PRESETS` (`:778-806`): 27 entries keyed `tri345`, `triIsosceles`, `triObtuse`, `square`, `rectangle`, `parallelogram`, `trapezium`, `rhombus`, `kite`, `circle`, `pyth345`, `pyth23`, `anglesLine/Point/Vertical/Parallel`, `protractorAcute` (arms at 0° and 57° via `armAt`, `:772-775`), `symReflectV/H/D`, `symRect/Square/Isosceles/Kite/Parallelogram`, `symPractice`, `protractorObtuse`. `DEFAULT_GEOMETRY` is the 3-4-5 triangle.

### src/math/euclid.ts — circle theorems, similarity, transformations, solids, constructions

**Purpose** (`euclid.ts:1-6`): five text-driven topics. `EuclidSpec = { topic: EuclidTopic; src: string }` with `EUCLID_TOPICS = ["circle", "similar", "transform", "solids", "construct"]` (`:11-13`). `EuclidWords` (`:19-147`) is the largest word table in the library: shared error strings, per-topic sub-tables, `circle.why`/`circle.thm` keyed by `CircleWhy` (`:15-17`: centre, semicircle, segment, cyclic, tangent, tangents, alternate, chord, chords, secant, triangle, quad, line, isosceles, symmetry, sum, pythagoras, trig), `solids.names` keyed by `SolidKind`, `construct.steps` (numbered instructions per construction) and `construct.locus`. `EuclidData` (`:150-168`) is what `buildEuclid` exposes for tests: `values`, `x`, `k`, `test`, `images`, `kind`, `centre`, `angle`, `factor`, `mirror`, `vector`, `V`, `A`, `dim`, `points`, and `measured` ("angles and lengths measured on the figure as drawn").

Imports: `chart.ts` (drawing, `compose`, `texLines`), `expr.ts` (`parseE`, `evalE`, `exprMessages`) for reading numbers and linear expressions, `latex.ts` for `latexToSvg` (cached in `tx`, `:319-329`, up to 800 entries).

#### Numbers and linear expressions in x

`rat(v, maxD)` (`:180-187`) finds n/d with d ≤ maxD within 1e−9. `exactTex` (`:200-229`) renders a value as an integer, a fraction with d ≤ 12 (only when non-terminating or `o.frac`), a terminating decimal to 3 places, or a surd `k√m/d` found by rationalising v² with denominator ≤ 144 and extracting square factors; otherwise null. `numTex` falls back to `nf(v, dp)`; `resTex` (`:234-239`) writes `= exact`, `= exact ≈ decimal` (for surds and recurring fractions) or `≈ decimal`; `plainNum` is the label form. `readNum` parses via `parseE` with π → `pi`.

`Lin = { c, k }` is `c + k·x` (`:263`). `readLin` (`:273-287`) strips `°`, units, parses with `x` allowed, evaluates at 0 and 1 to get c and k, then checks linearity at x = 2, −3, 7.5 (tolerance 1e−7) and throws `notLinear` otherwise. `lmul` refuses x·x (`nonLinear`). `solveLin(L, R)` (`:303-314`) moves terms, writes `L = R`, optionally `kx = c`, and `x = c/k`.

#### Figures

`Fig` (`:399-412`): named points, hidden names, circles, segments, dashed segments, `lines` (extended 38 px past both ends), `angles` (name → [a, v, b]), `lengths` (name → [a, b, side?, offset?, t?]), equal-length `ticks`, equal-angle `arcs`, `fills`, and a `centre` labels point away from. `drawFig(f, tags, box)` (`:416-501`) scales the figure's bounding box (including circles) into `box` with 30 px padding, draws fills (13 % opacity), circles, lines, dashed and solid segments, ticks (6 px, spaced 5 px), arcs (`arcMark`, concentric at r + 4i), then angle marks: a right-angle square when within 0.3° of 90 (and the label is skipped when the tag text is exactly `90°`), otherwise an arc of radius clamped to [12, 22] from 0.4·min(arm lengths), the value placed along the bisector at `rr + 9 + min(16, 4.5/sin(ang/2))` so narrow angles push the text out. Lengths go on the far side from `centre` (flipped by `side`). Points are 2.6 px dots with italic names 14 px outward.

`flow` (`:344-366`) lays pictures side by side while they fit in `W − 24`, else wraps; `finish` (`:367-376`) stacks the TeX rows then the pictures.

#### Circle theorems

`SCENES` (`:557-808`) declares ten scenes (their names are exported as `CIRCLE_SCENES`, `:814`). Each has `keys` (the words the first clause may be), `q` (quantity names → `"a"` angle or `"l"` length), `alias` (e.g. `OBC → CBA`, `r → OA`, `REFLEX AOB → RAOB`), `coreA`/`coreL` (what to show when nothing is asked for), `rels` (linear relations written with `rel("AOB", "2 ACB", "centre")` = AOB − 2·ACB = 0, or `rel("AOB + OAB + OBA", 180, "triangle")`), optional `rts` (right triangles `{a, b, h, A, B}` for Pythagoras/trig), optional `prods` (`l₁·l₂ = r₁·r₂` for intersecting chords and tangent–secant), and `fig(v, shown)` which builds a `Fig` from the known values. The scenes:
- `centre`: AOB = 2·ACB, OAB = OBA, triangle sum, AOB + reflex = 360. Figure: O at origin, A and B at `−90 ∓ t/2` on the unit circle, C at 112°; AB drawn only when OAB/OBA are shown.
- `semicircle`: ACB = 90, isosceles halves OCA = CAB etc., AOC + BOC = 180. C at `dir(2a)`.
- `segment`: ACB = ADB, CAD = CBD. Points on arcs computed so both inscribed angles subtend AB.
- `cyclic`: opposite angles sum to 180, exterior DCE = 180 − BCD; the single letters `A`…`E` alias the angles (`A → DAB`, `E → DCE`). The figure chooses arc CD by scanning 0.5° steps to maximise the smallest arc (`:634-641`), "to keep every arc as wide as possible".
- `tangent`: OAP = 90, triangle sum; `rts` [OA, AP, OP]. Figure P = (tan b, −1).
- `tangents`: both tangent angles 90, the kite's angle sum 360, PA = PB, two isosceles triangles, symmetry halves, `rts`.
- `alternate`: TAB = ACB, SAC = ABC, line sum, triangle sum.
- `chord`: OMA = 90, AM = MB, AB = AM + MB, AOB = 2·AOM; `rts` [OM, AM, OA].
- `chords`: AE·EB = CE·ED via `prods`; figure fills in missing lengths from the product and takes the circumcircle of A, B, C (`circumcentre`, `:809-813`).
- `secant`: PT² = PA·PB; the figure bisects on an offset `e` (60 iterations, `:786-791`) so that the chord ratio matches PA/PB, with the tangent point `T = (−1/d, −√(1 − 1/d²))`.

`renderCircle(src, figure?)` (`:818-1214`) parses clauses split on `;`/newlines (`clausesOf`, `:521`); the first clause picks the scene; later clauses are `find X, Y` lists or `name = value` pairs (`?` marks a target, `x = 5` fixes x). `canon` (`:826-836`) normalises names by trying the name and its reverse against `q` and `alias`. A union–find over the one-to-one relations (`eqRels`, `:878-881`) groups quantities that are equal by a theorem, so an unknown pair like OAB = OBA counts as a single unknown. Then a propagation loop up to 60 rounds (`:1127-1133`): `tryRel` solves any relation with exactly one unknown class (writing the symbolic line, the substituted line and the result, with two lines when ≥ 3 knowns), `check` verifies fully-known relations (throwing `contradict` beyond 1e−6 relative) or, when x is still unknown and the relation holds x, solves it with `solveLin` and substitutes x back into every fact (`:930-938`); `tryProd` handles products with one unknown (square root for the tangent case) or solves for x; `tryRt` runs only when nothing else changed and does Pythagoras (two sides) or SOH-CAH-TOA (one angle + one side, or two sides → inverse trig, exact when `rat(v, 1)` hits a whole degree). Facts carry `ap` (approximate) so decimals propagate as `≈`. After the loop every angle must satisfy `0 < v < 360` and every length `v > 0` (`:1136-1141`). Shown rows are those needed to reach the targets (`visit` walks `from` links, `:1148-1154`) in discovery order, with the x-solution rows inserted before the first fact that used x. `data.measured` (`:1179-1186`) measures every angle and length on the figure for the test invariant "the answers obey the theorems and match the figure" (`tests/euclid.test.ts:24-36`: angles equal to 1e−6, lengths equal up to one scale). Tags colour givens blue, found green, unknown red `?`. The `figure` parameter short-circuits to a 260×220 question figure with `?` on the targets (`:1196-1203`), used by `circleFigure` (`:3457-3466`) with the `quiet` Proxy words (`:3452-3454`, every string empty) for practice questions; the full picture is drawn in a 380×300 box (`:1204`).

#### Similar and congruent triangles

`renderSimilar` (`:1255-1622`): the first clause matches `ABC ~ DEF` (similar), `ABC ≅ DEF` (congruent) or `ABC, DEF` (test). A shared letter at the same index marks the A-shape (`sv`), and the clause `X` marks the crossing/bow-tie shape (`cross`). `parts` (`:1278-1280`) lists whole/inner/part side triples for the A-shape so `AD + DB = AB`. Facts come from `name = value` with `readLin`, and names canonicalise through `canon`/`sideKey` (angles by single letter or as the middle letter of three). Three steps iterate up to 40 rounds (`:1536-1537`): `anglesStep` copies corresponding angles and fills the third angle of a triangle with `180° − …`; `partsStep` does the A-shape sums; `sidesStep` finds `k = b/a` from the first corresponding pair, solves for x when two pairs contain x (cross-multiplying, `:1422-1434`), scales partners by k or 1/k, and throws `notSimilar` when a known pair disagrees with k (1e−6). In `test` mode (`:1466-1534`) the verdict is decided after one `anglesStep` that only fills third angles (corresponding angles are not copied across while `k` is unknown, `:1365`), before any other propagation: side ratios `sEq` (ratio 1), angle equalities `aEq`; congruence by SSS, SAS (two sides and the included angle), RHS (two sides and a right angle), ASA/AAS (two angles and a side, ASA when both angles are given rather than deduced); otherwise similarity by AA, SSS~ (all three ratios equal) or SAS~; "neither" when something disagrees; "unknown" with the SSA or AAA note. The picture: `triangleOf` (`:1221-1253`) places a triangle from three sides (cosine rule), two sides and an angle, or angles with a scale (default angles 60/55/65); the second triangle is a scaled copy (factor `k ?? 1.5`), turned so the shared corner is on top (A-shape) or in the middle facing left (X-shape, factor `−k`) (`:1551-1568`); congruence ticks and equal-angle arcs are added in test mode. `data = { values, k, x, test }`.

`renderScale` (`:1625-1714`, reached from `renderSimilar` when a clause starts with `lengths/sides/areas/volumes/k/scale factor…`, `:1258`) handles `lengths 2 : 3; area 20 : ?; volume ? : 54`: k typed directly (`k = 1.5`, `scale factor 2`) or from the first full pair with `k = (b/a)^(1/p)` for p = 1, 2, 3, then each missing side by `k^p`; mismatching full pairs throw `notSimilar` (1e−6). Picture: two boxes `cube(...)` drawn 1 : k with the labels `1` and `k = …`; captions give the three ratios 1 : k, 1 : k², 1 : k³.

#### Transformations

`Affine = { m: [a, b, c, d], t }` (`:1718`), `Move` is translate/reflect (unit normal n and offset d)/rotate (angle a about c)/enlarge (factor f about c). `affineOf` (`:1731-1748`) builds the matrix (reflection `p − 2(n·p − d)n`; rotation entries snapped to integers within 1e−12). `classify(A)` (`:1805-1849`) recovers the single move: identity/translation when m = I; a rotation when det > 0, a = d, b = −c, s = 1 (fixed point from `(I − M)c = t`); an enlargement when the angle is 0 or 180 (factor ±s); a "spiral" otherwise; a reflection when det < 0, a = −d, b = c (axis direction at half the angle, glide when t has a component along the axis). `readMove` (`:1861-1914`) parses English move clauses (`translate by (5, −3)`, `reflect in y = x`, `rotate 90 anticlockwise about (0, 0)`, `enlarge by scale factor 2 about …`), with `half-turn`/`quarter-turn`, `cw`/`acw`. `renderTransform` (`:1966-2054`) first looks for an arrow (`->`, `→`, `↦`, `onto`, `maps to`) and hands a two-part input to `describeTransform` (`:1969-1970`); otherwise it reads the object points (`POINT_RE`, `:1851`, up to 12), up to 3 moves split on `;`/newline/`then`/a comma before a move verb, applies each stage (`stages`), writes the rule `(x, y) ↦ (…)` (`ruleTex`, `:1772-1786`) and the point images two per row, and for ≥ 2 moves composes them and reports the single transformation. `gridPic` (`:1920-1964`) draws a square grid (the box padded by one unit and pulled to include the origin when it is within 4 units, `tooBig` past 60 units; unit `s = min(36, 560/width, 380/height)`, ticks thinned to every 2 or 5 when s < 22 or 14), axes, the groups as polygons/segments/points with names pushed 13 px outward, and the construction lines: translation arrows, the mirror line with dashed connectors, rotation rays and an arc from the first point, enlargement rays through the centre (or from object to image when f < 0). `describeTransform(a, b)` (`:2057-2170`) solves for the affine map from three non-collinear points (two 2×2 solves, `:2073-2082`) or, with only two, the similarity `z ↦ αz + β`; it checks every point maps within 1e−6 (`notMatch`), classifies, and writes the construction (vector; midpoint and the perpendicular bisector as the mirror; centre from bisectors and the angle; centre and `k = A′B′/AB`). `data.kind` is `translate/reflect/rotate/enlarge/identity/spiral/glide/other`.

#### Solids

`SOLIDS` (`:2256-2422`) defines cube, cuboid, prism (triangular), cylinder, cone, sphere, hemisphere, pyramid, frustum. Each `SolidDef` has `dims`, `alias` (`radius → r`, `diameter → d`, `side → a`…), `complete(d, rows)` (derives r from d, slant heights by `pyth`, with the working pushed into `rows`), `V` and `A` formulas as `{ sym, sub(t), val(d): PiNum }`, `bottom`/`top` face areas (for stacking), `oneFace` (cone, hemisphere, pyramid, prism stand on their one flat face), and `hole` (depth, face, side for subtraction). `PiNum = { a, b }` is `a + bπ` (`:2186`); `pnTex`/`pnRes` write `90π ≈ 282.74` exactly when both parts are `exactTex`-able. `readPart` (`:2435-2482`) picks the kind by the longest matching key, then reads `name = value` pairs (with `V`/`A` and units stripped, `?` marks an asked dimension) or plain numbers in `dims` order (`cuboid 3 x 4 x 5`). `solveDim` (`:2485-2559`) finds a missing dimension from V or A: it probes `F(1), F(2), F(3)` and detects a pure power `T = c·uᵖ` (p = 1..3, so `u = (T/c)^(1/p)` with the root written), an affine `c₁u + c₀`, a quadratic (second differences constant, solved by the formula), or falls back to bisection on `[1e−9, hi]` doubling hi until `F(hi) > T` then 100 halvings. `renderSolids` (`:2812-2948`) takes the unit from a trailing `; cm` clause or the first number with a unit (`:2815-2822`), splits parts on ` + ` / ` - ` (at most 4; a hole only as `outer − hole`), completes each (a missing dimension is found by `solveDim` from the given `V` or `A`, trying the dimensions in order and recording `data.dim`, `:2852-2865`), writes `V = sym = substituted ≈`, and `A` (split onto two lines when the TeX exceeds 430 px, `:2878`), then the total: stacked solids add volumes and subtract twice the hidden contact area `min(top of lower, bottom of upper)` (`:2891-2899`); a hole subtracts the hole's volume and adds its side area, removing both faces when it goes through (`:2910-2916`). Pictures: `solidPic` (`:2562-2706`) draws each solid in an oblique view (depth factor 0.5 right, −0.35 up; ellipses with ry = 0.3·rx; dashed hidden edges) with labelled dimensions, flipped when a one-face solid is the bottom of a stack; `solidSize` gives the footprint for scaling (`s = min(190/stackW, 230/stackH, 60)`); `netPic` (`:2732-2810`, only for a single solid, `:2943-2946`) draws the net of a cube/cuboid (cross), cylinder (rectangle 2πr × h between two discs), cone (sector of angle `360·r/l` plus the base), prism, pyramid, with the face areas written; sphere, hemisphere and frustum have no net (null). `solidFigure` (`:3468-3484`) returns a question figure labelling only what the question gives ("a slant height worked out from r and h would give the answer away", `:3478`).

#### Constructions and loci

`renderConstruct` (`:2999-3227`) collects every named point in the input, finds the command clause, and dispatches on words: perpendicular bisector (arcs of radius 0.7·|AB| from A and B meet at X, Y via `circles2`, `:2952-2961`; rows give M and the line equation; `data.mirror`), angle bisector (equal arcs at 0.45·min(arm) then arcs from those points, the far intersection R; row `∠ABR = θ/2`), perpendicular from/at a point (arcs on the line at `1.45·dist` or `max(1, 0.18|AB|)`, then the apex S; rows give the foot F and `PF`), triangle from three sides (`AB = 7, BC = 5, AC = 6` or three numbers; triangle inequality enforced; angles by the cosine rule), and 60/30/90/45° angles (equilateral arcs, then bisections; `data.angle` is measured, tested exact to 1e−9 in `tests/euclid.test.ts:291`; any other angle size throws `onlyAngles`, `:3173-3174`). Everything else goes to `renderLocus` (`:3234-3447`), which splits conditions on `;`/`and` (not "from A and B"), recognising `inside ABCD` (polygon region), `equidistant from A and B` (perpendicular bisector curve), `equidistant from AB and AC` (angle bisector through the shared vertex), `closer to A than B` (half-plane, strict; `closer to AB than AC` is the half-plane on one side of the angle bisector), and distances `less than / at most / more than / exactly r from A` (disc or circle) or `from AB` (stadium band). Meeting points of curves (line–line, line–circle via `lineCircle`, circle–circle) are filtered by `inside` (`:3353-3375`, point-in-polygon by ray casting) and listed as `X₁ = …`; a 61×61 sample decides whether any region survives (`:3387-3391`). The picture shades the intersection by nesting SVG masks, one per region, an "outside" region inverting its mask (`:3426-3432`); strict boundaries are dashed; curves are purple. Both constructions and loci are drawn by `gridPic`; the constructions add compass arcs (`compassArc`, ±22° by default, `:2974-2981`), a step badge (`stepNo`, `:2987-2990`) and the numbered instructions from `construct.steps` as captions (`steps`, `:3033`).

`buildEuclid` (`:3491-3517`) sets the words, calls `exprMessages`, throws `need[topic]` on an empty input, dispatches, and throws `tooBig` if the SVG contains `NaN|undefined|Infinity`; `renderEuclid(spec, words)` (`:3488-3490`) is the plain entry returning only the SVG. `EUCLID_PRESETS` (`:3520-3575`) lists 10 circle, 8 similar, 8 transform, 10 solids and 8 construct examples (e.g. `"chords; AE = x; EB = 6; CE = 4; ED = 9"`, `"cube 10 - cylinder r = 2 h = 10; cm"`, `"A(0, 0); B(10, 0); C(10, 6); D(0, 6); inside ABCD and more than 3 from A and within 2 of BC"`).

### src/math/coordgeom.ts — coordinate geometry, exactly

**Purpose** (`coordgeom.ts:1-6`): points, lines in every form, perpendiculars, two lines meeting, circles, polygons; coordinates are `Frac`, lengths are simplified surds, pictures use equal units. `CoordSpec = { topic: CoordTopic; src }` with `COORD_TOPICS = ["points", "line", "perp", "meet", "circle", "polygon"]` (`:11-13`). `CoordWords` (`:15-94`) holds the op labels per topic and the polygon names. Imports `chart.ts` (`axes`, `makeFrame`, `texLines`, `compose`, `lbl`, `dot`) and `Frac`.

#### Exact numbers

`guard` (`:104-107`) throws `tooBig` beyond 1e9. `sqrtF(v): Root = { out, inner }` (`:122-130`) writes √(n/d) = √(nd)/d and pulls square factors out by trial division; `rootTex`/`rootPlain`/`rootResult` print `6√2 ≈ 8.485`. A `Line` is `a·x + b·y + c = 0` (`:151`); `integral` (`:158-166`) scales to coprime integers with a positive leading coefficient; `slope`, `intercept`, `xOf`, `slopeTex` (`y = mx + c` or `x = k`), `generalTex`, and `term`/`sum` (`:179-194`) typeset signed sums. `lineThrough` (`:208-213`), `lineGrad` (`:215`), `meet` by Cramer's rule (`:216-223`), `onLine`, `dist2`.

#### Parsing

`Poly` is a map `"i,j" → Frac` for xⁱyʲ of total degree ≤ 2 (`:230`); `padd`, `pmul` (throws `notCircle` above degree 2), `pdeg`. `parsePoly` (`:259-321`) is a recursive-descent parser over `+ − × ÷ ^`, brackets and implicit products (`2x`, `x(x+1)`), with numbers via `Frac.parse` and powers limited to 0..2. `parseItems` (`:340-374`) splits on `;` or top-level commas and classifies each item: a named point `A(1, 2)` (centre words `centre/center/c/o/центр/ცენტრი` mark the circle's centre, `:359`), a parameter `m = …`, `c = …`, `r = …`, a ratio `1:2`, or an equation (`lhsY` when typed as `y = …`). `asLine` needs degree 1.

#### Pictures

`plane(id, pts, y0, maxH)` (`:390-416`) builds a frame with the same scale on both axes: the bounding box of the points, the origin kept "when it is not far away" (within 1.2× the span + 3), 15 % padding, then the x-range widened when the height would exceed `maxH` (380) or the y-range widened below 220 px. `lineSvg` draws a clipped whole line; `ptSvg` a dot plus label; `rightMark` an 11 px square. `finish` (`:455-468`) colours the last row green and stacks rows, picture, captions.

#### Topics

- `renderPoints` (`:473-527`): Δx, Δy; distance `√(Δx² + Δy²)` with the simplified surd and `≈`; midpoint; gradient (or "vertical"/"horizontal"); the point dividing AB in `m : n` (`P = ((n·x₁ + m·x₂)/(m+n), …)`); caption with the line through A and B. Picture: the right-angled Δx/Δy triangle dashed with a right-angle mark.
- `renderLine` (`:590-629`): from an equation (`rearrange` to `y = mx + c` or `x = k`), two points (gradient then `y − y₁ = m(x − x₁)` via `pointGradRows`), a point and m, or m and c; then `lineFacts`: gradient and y-intercept, x-intercept, general form. `linePicture` (`:560-588`) marks the intercepts (the x-intercept only when c ≠ 0), the slope triangle (run `m.d`, rise `m.n`) from the first given point, else from the y-intercept, and the equation in the corner.
- `renderPerp` (`:641-692`): parallel line through P, `m⊥ = −1/m` (vertical ↔ horizontal handled with null), the perpendicular, its foot `F = meet(L, perp)`, and the distance `|ax₀ + by₀ + c| / √(a² + b²)` with the integral coefficients. Picture: L blue, parallel green dashed, perpendicular orange, PF red with a right-angle mark.
- `renderMeet` (`:696-767`): parallel (same line or not, by testing a point) or a meeting point. Substitution when either equation was typed `y = …` or one line is vertical (`:717-736`): `(1) y = mx + k, (2) ax + by = d`, substitute, collect, back-substitute; elimination otherwise (`:737-755`): scale both to the lcm of the y-coefficients, subtract, solve x, back-substitute.
- `renderCircle` (`:783-936`): from a degree-2 equation (requires equal x² and y² coefficients and no xy term): divide by k, group, complete the square `(x + D/2)² − (D/2)²`, read off centre and r²; or from a centre with `r = …` or a point on the circle (`r² = dx² + dy²`), then expand to general form. `r² ≤ 0` → "a point"/"empty". An extra point Q: inside/on/outside by comparing `dist2` with r²; on the circle gives the tangent (`m_t = −dx/dy`). An extra line: substitute (`x = h` or `y = mx + k`) into the circle to get `At² + Bt + C = 0`, discriminant Δ decides 2/1/0 meeting points, written as `p ± q√s` via `pmTex` (`:772-778`). Picture: circle, dashed radius to Q (or to 0.6 rad), tangent with a right-angle mark, the cutting line and green hit dots.
- `renderPolygon` (`:940-1078`): 3–8 named points; bow-tie detection by segment crossing tests (`:946-952`); side lengths (`√(dx² + dy²)` simplified) and gradients; parallel pairs (cross product zero), right angles (dot product zero), equal sides (grouped by `d2`); the shoelace `S = ½|Σ(xᵢy_{i+1} − x_{i+1}yᵢ)|` with every term; the name (triangle: right/obtuse/acute by comparing the largest squared side with the sum of the other two, equilateral/isosceles/scalene; quadrilateral: square/rectangle/rhombus/parallelogram with two parallel pairs, trapezium with one, kite, else quadrilateral; otherwise "n-gon"). Picture: the polygon, arrow ticks on parallel pairs (k + 1 arrows for the k-th pair, both pointing the same way), right-angle squares, side-length labels pushed outward, and the shoelace as a two-column table with blue/red diagonal lines and each product written (`:1056-1075`).

`COORD_PRESETS` (`:1102-1152`) gives 4–9 chips per topic (e.g. `"x^2 + y^2 = 25; Q(3, 4)"` for the tangent, `"2x - y = 1; 4x - 2y = 2"` for coincident lines). Tests pin: midpoint halfway and on the line, every way of giving a line describes the same line, foot on the line at a right angle with `d = |PF|`, the meeting point on both lines, circles from any form with hit counts matching the distance, shoelace area and names (`tests/coordgeom.test.ts:44-158`).

### src/math/trig.ts — the unit circle, triangles, graphs, equations

**Purpose** (`trig.ts:1-4`): unit circle traced into sine/cosine waves with exact values for multiples of 15°, right triangles (SOH CAH TOA), any triangle by the laws of sines and cosines including the ambiguous SSA case, transformed graphs `y = A·f(B(x − C)) + D`, and trig equations with all solutions in one turn plus the general solution. Uses `mathjs` `compile`/`parse` to read numbers (`val`, `:180-190`, TeX via `Frac.parse` or mathjs `toTex`).

#### Specs

`TrigSpec` is a union (`:18-45`): `CircleSpec { topic: "circle"; angle; unit: "deg" | "rad" }`; `CompassSpec` adds the four direction cue words `n/e/s/w`, `quads?: "neighbours" | "images"` and per-quadrant images `ne/nw/sw/se`; `RightSpec { given: RightGiven; opp; adj; hyp; ang }` with `RIGHT_GIVENS = oppAdj | oppHyp | adjHyp | angOpp | angAdj | angHyp`; `TriangleSpec { kase: TriCase; a; b; c; A; B; C }` with `TRI_CASES = SSS | SAS | ASA | AAS | SSA` (sides opposite angles); `GraphSpec { fn: "sin" | "cos" | "tan"; A; B; C; D; unit }`; `EquationSpec { fn; k; unit }`. The constant lists are `TRIG_FNS` (`:16`), `COMPASS_QUADS` (`:25`) and `TRIG_TOPICS = circle | compass | right | triangle | graph | equation` (`:48`); `TrigSpecOf<K>` picks the member by topic. `TRIG_PRESETS` (`:90-136`) lists chips per topic (e.g. SSA `a = 6, b = 8, A = 40` for two triangles, `a = 3` for none; `cos x = 2` for no solution).

#### Exact values

`SIN_T` (`:140`) lists sin 0°, 15°, …, 90° as TeX (`(√6 − √2)/4`, `1/2`, `√2/2`, `√3/2`, `(√6 + √2)/4`, `1`); `TAN_T` the tangents up to 75° (`2 − √3`, `√3/3`, `1`, `√3`, `2 + √3`); `NEG` rewrites negated binomials. `exact(deg)` (`:148-160`) reduces to a reference angle by quadrant, picks signs from the quadrant table, and returns `{sin, cos, tan}` or null when not a multiple of 15°. `radTex` (`:163-170`) writes degrees as a multiple of π using `Frac(round(deg·4), 720)`, decimals otherwise.

#### Renderers

- `renderCircle` (`:220-300`): a unit circle of radius 118 px at (150, 190); quadrant letters A S T C ("All Students Take Calculus") with the current one orange; the angle arc (all turns), the radius, cos leg green, sin leg red, and the tangent segment on `x = 1` when |tan| < 1.6; to the right, sine (red) and cosine (green) waves from 0° to 360° sharing the vertical scale (`gx0 = 312`, `gw = 310`), a dashed red line carrying P's height across to the wave, dots at the current angle. Header gives θ in degrees and radians and the three exact (or 4 dp) values coloured; captions name the quadrant rule and the reference angle.
- `renderCompass` (`:312-477`): the unit circle as a compass (R = 150 at (190, 196)): four quadrant wedges tinted (`QUAD_FILL`), ticks every 15°, cardinal letters coloured red (sin) and green (cos) with cue words and `sin +`/`cos −` rules, each quadrant's name and its two cues (or an image and a feeling in `images` mode), θ from East anticlockwise (orange) and the bearing from North clockwise (blue dashed), a legend card of the four rules and a 2×2 quadrant grid with sin/cos arrows and `tan ±`. Captions explain the signs for the quadrant or the axis, the three-digit bearing, and the diagonal case.
- `renderRight` (`:481-553`): solves from the two given quantities (atan2, asin, acos, or the angle with sin/cos/tan) and writes the SOH-CAH-TOA line plus the complementary angle; draws the triangle with θ at the left, scaled `k = min(420/adj, 240/opp)`, givens in blue and found values in orange.
- `renderTriangle` (`:598-691`): SSS by the cosine rule for A and B; SAS computes `a² = b² + c² − 2bc cos A` then B; ASA/AAS by the sine rule with `C = 180 − A − B`; SSA computes `sin B = b sin A / a`, returns "no triangle" when > 1, and keeps both `B₁ = asin`, `B₂ = 180 − B₁` when `A + B < 180` and they differ (`:669-673`), so the ambiguous case shows two triangles side by side (`drawTriangle` at widths 320 each, tagged 1 and 2). Each solution adds `S = ½ab sin C`.
- `renderGraph` (`:695-760`): period `full/|B|` (half for tan), frame over `[min(0, C) − T/4, max(0, C) + 2.1T]`, y-range `D ± 1.35·amp` but at least ±1.2 (`D ± 4·max(1, amp)` for tan); ticks at multiples of 90° or π/2 scaled by `round(T/(2·full))`; the base function in light grey, asymptotes for tan at `C + (90 + 180k)/B`, the midline dashed purple, the curve with 2400 samples; an amplitude arrow at the first peak and a period bracket below; a red phase-shift arrow from 0 to C. The header writes `y = A sin(B(x − C)) + D` and `T = 360°/|B|`.
- `renderEquation` (`:764-817`): `|k| > 1` for sin/cos → no solution; `α = inverse(k)`; solutions in `[0, 360)` are `{α, 180 − α}`, `{α, 360 − α}`, `{α, α + 180}` reduced mod 360 and deduplicated at 1e−9; the general solution `x = α + 360n, x = 180 − α + 360n` / `x = ±α + 360n` / `x = α + 180n`. Picture: left a unit circle with the line `y = k` or `x = k` (or the ray for tan) and a radius per solution in blue/red; right the graph over one turn with `y = k` and the solution dots.

`renderTrig` (`:819-834`) dispatches on `topic`.
### src/math/vectors.ts — vectors in 2D and 3D, exactly

**Purpose** (`vectors.ts:1-7`): combinations, the dot product (angles, perpendicularity, projections), the cross product (determinant, areas, triple product, volumes), lines (vector/parametric/Cartesian forms, distance from a point, meeting/parallel/skew) and planes (from equation, normal, three points or two directions; distances, line–plane and plane–plane meets, angles). "Every number is a fraction or a surd; every picture is to scale: on a grid in 2D, in an oblique projection in 3D." `VecSpec = { topic: VecTopic; src }`, `VEC_TOPICS = ["basics", "dot", "cross", "lines", "planes"]` (`:12-14`). `VecWords` (`:16-132`) has per-topic op labels and caption sentences.

#### Exact arithmetic

`V = Frac[]` (`:147`); `vadd/vsub/vscale/vdot/vcross` all `guard`ed at 1e9; `ratioOf(a, b)` returns k with b = k·a or null (`:159-164`); `integral(v)` scales to coprime integers (`:167-172`). Surds: `Root = { out: Frac, inner }`, `squareFree` by trial division, `sqrtR` (√(n/d) = √(nd)/d), `rmul`, `rdiv` (rationalising the denominator: `q / (out√inner) = q/(out·inner) · √inner`, `:193`), `rtex`/`rplain`/`approx`/`rcap`. `angleTex(cos)` (`:237-242`) writes `= 60°` when whole (1e−7) else `≈ 48.19°`.

#### Reading the input

`normal` (`:260-271`) maps unicode minus, `⋅•` → `·`, subscript digits, `\vec{a}` and arrows away, `lambda/mu` → `λ/μ`. `lex` (`:273-297`) tokenises numbers (`Frac.parse`), lowercase identifiers (`a`, `n1`, `λ`), uppercase points (`A`, `B'`), and the operators `+ - * / ( ) < > [ ] , ;`; a typed `·` or `×` throws `vecTimesVec` ("a vector times a vector"). `parseExpr` (`:301-359`) is a precedence parser producing `Node`s: `num`, `sym`, `pt`, `pair` (two adjacent capitals `AB`), `lit` (2 or 3 components in `( )`, `< >` or `[ ]`), `sum`, `mul`, `div`, `neg`, with implicit products (`2a`, `3(1, 2)`). `readItem` (`:386-404`) classifies an item: a point `A(1, 2)`, a labelled `ℓ1: …`/`Π: …`, a normal form `r·(1,1,1) = 6`, a line `r = a + t d`, a named vector `a = …` (names outside `RESERVED = r x y z i j k t s`), an equation (`2x − y + 2z = 6` or `(x − 1)/2 = (y + 1)/3 = z`), or a bare expression. `dimOf` (`:407-423`) is 3 when any literal has three components or `z`/`k` appears.

`Val = { vec, m: Map<param, V> }` (`:426`) represents a constant plus multiples of parameters `t s λ μ` (or `x y z` inside equations, `ctx.eqVars`); `plus`, `scaleVal`, `times` (one factor must be a scalar; `nonlinear` when both carry parameters), and `evalNode` (`:456-504`) evaluate with points (`O` is the origin), pairs `AB = B − A`, and unit vectors `i j k`. `parse(src)` (`:592-697`) returns `Parsed = { dim, ctx, pts, vecs, lines, planes, header }`: a single-parameter `r = …` is a line, two parameters in 3D a plane with `n = u × w` and `n·a` as its constant (`:625-639`), `r·n = d` a plane, a linear equation in 3D a plane, in 2D a line with direction `(b, −a)` through `(0, c/b)` or `(c/a, 0)` (`:665-673`), and a three-part symmetric equation a line (`a = −c/coef`, `d = 1/coef`, `:674-692`). Names default to `ℓ1, ℓ2` and `Π1, Π2`.

#### Pictures

`Prim` (`:720-728`) is the drawing vocabulary: arrow, seg, line (infinite, clipped by `clip`, `:756-768`), point, plane (a square patch of half-side `0.42·size`, so `0.84·size` across, built from the normal's two perpendicular unit vectors, `:777-786`), poly, angle (arc of 25 points at radius `min(0.3·min arm, 0.11·size)`), right (a square of side 0.05·size). `picture` (`:792-799`) pads the bounding box by 15 % and goes to `picture2` (a `makeFrame` with equal units, height clamped to [240, 380]) or `picture3`. `camera(az, el)` (`:821-825`) is an orthographic projection `[−sa·x + ca·y, se·ca·x + se·sa·y − ce·z]`; `bestView` (`:831-862`) scans az 5..75° step 5 and el ∈ {12, 20, 28, 36}, scoring each by the smallest foreshortening of any key direction, the smallest ratio of projected to true sine between pairs of directions ("no two directions look parallel when they are not"), and the planes' normals not lying flat on the screen; the score is capped at 0.35 minus a small penalty for distance from (30°, 20°) so "good enough is good enough: then the usual view wins". `picture3` draws the three axes as grey arrows, dashed drops from points and position-vector tips to the floor `z = 0` plus a shadow line back to O (`:884-894`), then `draw` (`:898-968`) in five layers (polygons, segments, points, arrows, angle marks) with labels kept inside the picture by `put` (≈ 7.6 px per letter) and placed just past arrow tips or beside segments.

#### Topics

- `renderBasics` (`:1040-1135`): with no expression typed, two given vectors produce `a + b` and `a − b` (the parallelogram's diagonals, drawn with dashed copies and the difference labelled a quarter of the way along, `:1095-1104`); one vector gives `|a|` and the unit vector `â = a/|a|` with rationalised components; two points give `AB`. `exprRows` (`:1006-1026`) writes the pairs `AB = B − A`, the substitution with every vector written out, the scaled terms, and the result; chains `AB + BC` are drawn head to tail from A (`:1116-1128`). `parallelCap` reports `b = k·a` (same/opposite direction).
- `renderDot` (`:1163-1211`): `operands` (`:1140-1161`) takes the two typed expressions or, from three points, the angle ABC at the middle one. Rows: `a·b = a₁b₁ + …`, lengths, `cos θ = a·b/(|a||b|)` as a surd, `θ = arccos(…)`, caption acute/right/obtuse/same/opposite, scalar and vector projections of a on b (`(a·b)/|b|`, `(a·b)/(b·b)·b`). Picture: the dashed line of b, both arrows, the angle arc, the projection arrow (green, width 4) with a right-angle mark.
- `renderCross` (`:1232-1292`): 2D inputs are lifted to z = 0 (caption `lifted`); `crossRows` (`:1215-1230`) writes the 3×3 determinant with `i j k`, the cofactor expansion, the result, and the check `(a × b)·a = 0, (a × b)·b = 0`; then `|a × b|` (parallelogram) and half of it (triangle), the triple product `(a × b)·c` with `V` and `V/6` (tetrahedron), coplanar when zero. Picture: the parallelogram or triangle, the third vector's box or tetrahedron edges dashed, the cross product arrow (shortened when longer than 1.6× the longest input, labelled so) with a right-angle mark.
- `renderLines` (`:1332-1444`): `linesOf` takes typed lines or the line through the first two points. One line: vector, parametric (`cases`) and Cartesian forms (symmetric in 3D, `ax + by = c` in 2D); an extra point gets `footRows` (`:1311-1330`): `t = (P − a)·d / (d·d)`, `F = a + t d`, the check `FP·d = 0`, `|FP|`. Two lines: parallel when `ratioOf` (same line or the distance via the foot of A₂); otherwise the simultaneous equations, solved from the first two coordinate rows with non-zero determinant (`:1396-1402`), in 3D the third coordinate checked (`✓` or `≠`): skew lines get `n = d₁ × d₂` and the distance `|(a₂ − a₁)·n| / |n|`, and the common perpendicular's endpoints are computed for the picture (`:1419-1425`); the angle `cos θ = |d₁·d₂| / (|d₁||d₂|)` closes.
- `renderPlanes` (`:1490-1613`): `planesOf` (`:1448-1485`) takes typed planes, `A` plus `n` (point–normal form `n·(r − OA) = 0`), or three points (`AB × AC`, scaled integral). Rows: the Cartesian form; intercepts caption; a point's `n·P` compared with d (on the plane, or distance `|n·P − d| / |n|` and the foot `F = P − ((n·P − d)/(n·n))n`); a line's `n·d` (parallel/in the plane when 0, else `t`, the meeting point X and the angle `sin θ = |n·d| / (|n||d|)`); a second plane: parallel (`n₂ = k n₁`, distance between), or the common line `d = n₁ × n₂` with a point found by setting the coordinate that varies along the line to 0 and solving the 2×2 system (`:1583-1592`), and the angle between normals. Picture: a plane through three points is their triangle, otherwise a square patch centred on the most relevant point (foot, meeting point, nearest point to the origin), with the normal arrow scaled to 0.35 of the scene.

`VEC_PRESETS` (`:1635-1676`): 5–7 chips per topic. Tests pin the dot-product angle kinds, `2a − b` evaluation, cross-product areas and volumes, meeting/skew lines and distances, plane distances and intersections, and that errors name the problem (`tests/vectors.test.ts`).

### src/math/analysis.ts — real analysis made visible

**Purpose** (`analysis.ts:1-4`): ε–N for sequences, ε–δ for limits, secant → tangent, Riemann sums, partial sums of series, Taylor polynomials; functions are compiled with mathjs (`fnOf`, `:127-138`, returns NaN where undefined and evaluates once at 2 "to surface Undefined symbol early"). `AnalysisSpec` (`:38-44`) is the union of `SequenceSpec { expr, limit, eps, nMax }`, `LimitSpec { expr, a, limit, eps, zoom }`, `DerivativeSpec { expr, a, h, showDerivative }`, `RiemannSpec { expr, a, b, n, method: RiemannMethod }` (`left | right | mid | trap | lower | upper`), `SeriesSpec { expr, start, nMax, sum }`, `TaylorSpec { expr, a, order, xMin, xMax }`. `ANALYSIS_PRESETS` (`:72-122`) is keyed per topic with 6–7 specs each.

- `renderSequence` (`:157-200`): terms 1..nMax (clamped 2..200); N is one past the last term outside the ε-band, checked up to `SEQ_CHECK = 5000`; "none" when the last offender is beyond 80 % of that. Picture: the band `L ± ε` (green), `y = L` dashed, `n = N` orange dashed, dots red outside the band before N, blue inside, green from N on.
- `renderLimit` (`:204-272`): δ is the largest sampled offset such that both `a ± δ` satisfy `|f − L| < ε` (undefined points are skipped): the offsets are 3000 linear samples up to R plus 600 log-spaced down to `R·10⁻¹⁰`, and the first bad one is refined by 40 bisections against the last good one (`:224-237`); δ is then `floorSig` (rounded down to a significant figure) unless it reaches R ("wide"). Picture: the orange strip `a ± δ`, the green band, the ε–δ rectangle, 3000-sample curve, an open dot at (a, L) and a filled one at (a, f(a)) when they differ.
- `renderDerivative` (`:276-330`): the secant slope `(f(a+h) − f(a))/h`; differentiability from one-sided slopes at e = 1e−5 (must agree to 1e−3 relative and be < 1e6); the tangent slope by central difference. Picture: f, the secant (orange), the tangent dashed green, the h/Δy right triangle, optionally `f′` by central differences in purple.
- `renderRiemann` (`:337-384`): n ∈ [1, 500] strips; `lower`/`upper` take the min/max of 41 samples per strip; `trap` draws trapezia; the "exact" value is `simpson` from `chart.ts`; caption shows the method's value and the absolute error.
- `renderSeries` (`:388-424`): terms and partial sums on two frames (130 px and the rest), the sum S dashed when given; captions give `S_k` to 6 dp and the gap to S.
- `renderTaylor` (`:486-530`): derivatives by mathjs `derivative` cached per expression (`derivCache`, `:428-442`); coefficients `f⁽ᵏ⁾(a)/k!` for order ≤ 12; `polyTex` (`:464-484`) prints coefficients as nice fractions (`niceFraction`, continued fractions with denominators from primes ≤ 13) four terms per line; the green strip is where `|f − T| < 0.01` scanning out from a in steps of `(xMax − xMin)/2000`. `renderAnalysis` (`:532-547`) dispatches on `topic`.

### src/math/derive.ts — differentiation, one rule at a time

**Purpose** (`derive.ts:1-6`): first principles (polynomials), rules with pending derivatives `(u)′` opened one level per line, the chain rule as layers `dy/du · du/dv · dv/dx`, tangents and normals, stationary points with the second-derivative test and a sign chart. "A small symbolic engine (expression trees, a tidy-up and a simplifier) does the work" — that engine is `expr.ts` (`add, D, div, E_, fn, mul, N, neg, pow, simp, sub, substitute, tex, tidy, toPoly, fromPoly, realRoots, peval, qs*`); this module adds the rules. `DerivSpec = { topic: DerivTopic; src; at }` with `DERIV_TOPICS = ["first", "rules", "chain", "tangent", "stationary"]` (`:15-17`). `DerivWords` (`:23-54`) includes `rules` and `formulas` keyed by `RuleKey` (`:19-21`: sum, const, constMul, power, product, quotient, chain, exp, expA, logDiff, ln, log, sin, cos, tan, sec, csc, cot, asin, acos, atan, sinh, cosh, tanh, abs).

#### The rules

`outerDerivative(f, a)` (`:61-93`) is the table of standard derivatives without the chain factor: sin → cos, cos → −sin, tan → sec², sec → sec·tan, csc → −csc·cot, cot → −csc², ln → a⁻¹, asin → (1 − a²)^(−1/2), acos → −(…), atan → (1 + a²)⁻¹, sinh ↔ cosh, tanh → cosh⁻², abs → a/|a|. `Dq` (`:96-100`) makes a pending derivative node `D(a)` except constants (→ 0, rule `const`) and x (→ 1, rule `power`). `rule(u, rules)` (`:103-165`) opens one level: sums term-wise (`sum`); products split constants out (`constMul`), treat negative-exponent factors as denominators and apply the quotient rule `(t′b − tb′)/b²` (`quotient`) when both tops and bottoms exist, else the product rule `f′r + f r′` with the first factor against the rest (`product`); powers with a constant exponent use `n·uⁿ⁻¹` times the chain factor (`power`, `chain` when the base is not x); constant base `e` → `eᵘ·u′` (`exp`), other constant base → `bᵘ ln b · u′` (`expA`); variable base and exponent → `u · (e ln b)′` ("xˣ = e^(x ln x)", `logDiff`); functions use `outerDerivative` with the chain; `log_b` → `1/(a ln b)·a′`. `openD` (`:169-182`) opens every pending node in a tree; `hasD` tests for any. `differentiate(f)` (`:187-202`) iterates up to 40 levels, `tidy`ing after each, recording up to three rule names per line in `RULE_ORDER` (main rules first, `const` only when alone), then `simp(simp(cur))` and a final `= …` row when it differs. `derive(f)` returns just the result; `derivOf(src, w)` (`:733-739`) is the test entry. `numericCheck` (`:211-219`) picks the first of seven fixed points where f and f′ are finite and compares the symbolic value with a Richardson-extrapolated central difference (`c(2e−5)` and `c(1e−5)`, `n = b + (b − a)/3`); the test pins agreement to 1e−5 relative over 300 random expressions (`tests/derive.test.ts:53-68`).

#### Topics

- `renderRules` (`:245-262`): the rows, the formulas used (up to four), the numeric check, and `graphs` (`:224-239`) of f and f′ over `[−4, 4]` (or `[−2π, 2π]` when trig appears), with the y-range taken from the 10th–90th percentile of 401 samples padded by 0.6× the spread "so a vertical asymptote doesn't flatten everything else".
- `renderFirst` (`:305-360`): polynomials up to degree 5; `f(x + h)` expanded with binomial coefficients into an `XH` map (`"i,j"` → coefficient of xⁱhʲ), the difference drops the h⁰ terms, the quotient shifts j down, the limit keeps the h⁰ terms (`:311-324`); the picture draws secants for h = 2, 1, 0.5, 0.1 in darkening oranges and the tangent dashed green at `at` (default 1); the caption lists the secant slopes.
- `renderChain` (`:406-480`): `innerOf` (`:366-386`) peels the next inner expression (the argument of a function, the base or exponent of a power, the single variable factor of a product or term of a sum); layers are named `u, v, w, t, s`; each layer is differentiated in its own letter (`substitute` to x, `derive`, back); rows give the layers, the local derivatives, the product, the back-substitution and the simplified result; the picture is a chain of circles `x → … → y` with each layer's definition under its node (`fitTex`, scaled to the gap) and its derivative above the arrow.
- `renderTangent` (`:484-543`): `f′(x)`, `f(a)`, `f′(a)` exactly when substituting leaves a number, `y − f(a) = m(x − a) ⇒ y = mx + c` (exact when all are rational), the normal with `m_n = −1/m` (or `x = a` when m = 0); the picture uses equal units ("so the normal looks perpendicular", `:530`) over `a ± 3.2`.
- `renderStationary` (`:551-658`): polynomials of degree 2..4; `f′`, roots via `realRoots` (exact `QS` quadratic surds and numeric), `f″` and the test at each root (`max/min` by the sign of f″; when f″ = 0, the signs of `f′` at ±1e−3 on either side decide max, min or inflection, the row labelled `flat: …`), increasing/decreasing intervals merged across inflections, a sign chart of `f′` with `+/−` and `↗/↘`, and the graph with labelled extrema.

`renderDeriv` (`:662-677`) sets the module's `words`, calls `exprMessages(w)` and dispatches on `topic`. `DERIV_PRESETS` (`:680-730`) gives 5–12 chips per topic including `x^x`, `sqrt(1 - x^2)`, `sin^3(2x)`, `sin x` at `pi/2`.

### src/math/integration.ts — integration techniques with every step

**Purpose** (`integration.ts:1-5`): u-substitution (the x-area equals the u-area), integration by parts (DI table, LIATE, the cyclic case), partial fractions (exact decomposition over ℚ plus one irreducible quadratic), trigonometric substitution with the reference triangle; "every answer is checked numerically: differentiating F must give back f, and definite values are compared with Simpson's rule." Uses mathjs `compile/parse/rationalize` and `Frac`; drawing from `chart.ts`.

#### Specs

`IntegralSpec` (`:37-41`): `SubSpec { outer: SubOuter; c; a; m; b; n; lo; hi }` for `∫ c·x^(m−1)·outer(a·xᵐ + b) dx` with `SUB_OUTERS = power | exp | sin | cos | recip`; `PartsSpec { kind: PartsKind; n; a; b; lo; hi }` with `PARTS_KINDS = exp | sin | cos | ln | expsin | expcos`; `PartialSpec { num; den; lo; hi }`; `TrigSpec { form: TrigForm; a; lo; hi }` with `TRIG_FORMS = asin | sqrtA | atan | asinh | acosh | x2sqrt`. `INT_PRESETS` (`:64-99`) gives six to eight chips each, labelled in plain maths.

#### Shared machinery

`toFrac` (`:110-122`) recovers a `Frac` from a mathjs float by continued fractions (25 terms, denominator ≤ 100000, 1e−9). Polynomials are ascending `Frac[]` with `trim`, `deg`, `polyTex`, `polyJs` (a mathjs string `(n/d)*x^k`), `pmul`, `pscale`, `evalP`, `pdivmod` (long division, `:169-179`). `verify(f, F, x0, x1)` (`:219-231`) checks `F′ = f` at 39 interior points by central differences with `h = 1e−5·max(1, |x|)`, tolerance 1e−4 relative, requiring at least 3 usable points. `definite` (`:234-242`) computes `F(hi) − F(lo)`, Simpson with 4000 strips, and flags `improper` when any of 400 samples or the values are non-finite. `areaPanel` (`:245-262`) draws f over a window with the shaded region as a 300-point polygon clipped to the frame. `finish` (`:272-289`) assembles an `aligned` block of `[lhs, rhs]` rows, adds the definite line `∫ = F(hi) − F(lo) ≈ …`, and captions for the definite value vs Simpson, improper, and the verification result.

#### Techniques and how they are chosen

The dialog chooses the technique by topic; within a topic the spec fixes the form, so there is no heuristic search — the module writes the canonical working for each recognised shape.

- `renderSub` (`:293-379`): `g = a·xᵐ + b` (m clamped to 1..6; `a = 0` or `c = 0` throws `zeroA`), `g′ = a·m·x^(m−1)`, `k = c/(a·m)`; rows `u = g ⇒ du = g′ dx`, `∫ … dx = k ∫ outer(u) du`, the antiderivative in u (`uⁿ⁺¹/(n+1)`, `eᵘ`, `−cos u`, `sin u`, `ln|u|`), then in x. `power` with n = −1 is rerouted to `recip`. For a definite integral the limits are transformed (`u(lo)`, `u(hi)`, exact when the limits parse as fractions) and the caption says the two shaded areas are equal; the body is two panels, f in x (left, 268 px) and `g(u) = k·outer(u)` in u (right, purple).
- `renderParts` (`:392-530`): n is clamped to 0..6; `exp/sin/cos` with `xⁿ` use the tabular (DI) method: `D_k` are the successive derivatives of xⁿ (n + 2 rows), `I_k` the successive integrals of the wave (`integrateWave`, `:386-390`), the answer `Σ (−1)ᵏ D_k · I_(k+1)` collected by function (`acc.exp/sin/cos`, `:417-422`); rows show the signed products then the collected answer; the picture is the DI table with diagonal orange arrows labelled `+ −`. `ln` uses `u = ln x, dv = xⁿ dx`: `v ln x − ∫ v/x dx = xⁿ⁺¹ ln x/(n+1) − xⁿ⁺¹/(n+1)²`; the picture is a 2×2 u/dv grid with `∫u dv = uv − ∫v du` under it; verification starts at 0.05. `expsin/expcos` write the cyclic working `I = … ∓ (b/a)∫ …`, substitute the second integral, collect `(1 + b²/a²) I`, and give `I = eᵃˣ(a sin bx − b cos bx)/(a² + b²)` (for `expcos`: `eᵃˣ(a cos bx + b sin bx)/(a² + b²)`); the u/dv grid is drawn for these too, with the `cyclic` caption.
- `renderPartial` (`:624-727`): `polyOf` (`:534-546`) uses mathjs `rationalize` on the numerator and denominator (with implicit products made explicit) and converts coefficients to `Frac`. `factor` (`:558-597`) divides out the leading coefficient, strips roots at 0, finds rational roots by the rational root theorem (divisors of the constant and leading integer coefficients after clearing denominators, both signs, `:578-589`) with multiplicity, and allows one leftover irreducible quadratic (negative discriminant); anything else throws `notFactorable`. Improper fractions are divided first (`pdivmod`, caption `divideFirst`). Unknowns are `A/(x − r)ʲ` for each root power and `(Bx + D)/Q`; the linear system is set up by multiplying each unknown by the cofactor polynomial (`basis`, `:639-644`) and solved exactly by Gauss–Jordan (`solve`, `:600-616`). Integrals: `A ln|x − r|`, `A/((1 − j)(x − r)^(j−1))`, `(B/2) ln Q`, and `K/√s · arctan((x + p/2)/√s)` where `s = q₀ − (p/2)²` (`sqrtFrac` keeps the arctangent exact when s is a perfect square). Letters are `A B D E G H K M` (`:622`). The picture marks the real poles with red dashed verticals.
- `renderTrig` (`:731-847`): six fixed forms with their substitutions written out (`x = a sin θ` giving `√(a² − x²) = a cos θ`; `x = a tan θ` giving `a sec θ`; `x = a sec θ` giving `a tan θ`); the result in terms of x (`arcsin(x/a)`, `(a²/2) arcsin(x/a) + x√(a² − x²)/2`, `(1/a) arctan(x/a)`, `ln|x + √(x² ± a²)|`, `−√(a² − x²)/(a² x)`); the reference triangle is drawn with θ at the left, the right angle bottom right, and the three sides labelled in TeX (`texAt`); the `rel` caption says `sin θ = x / a` etc.

`renderIntegral` (`:849-860`) dispatches.

### src/math/ode.ts — differential equations

**Purpose** (`ode.ts:1-5`): slope fields with RK4 solution curves, Euler against RK4, first-order models solved step by step, second-order linear equations, and phase planes with eigenvalue classification; "every closed-form answer is checked numerically against the equation and the initial condition."

#### Specs

`OdeSpec` (`:14-21`): `FieldSpec { expr, points, xMin..yMax }`, `EulerSpec { expr, x0, y0, h, steps }`, `FirstSpec { kind: FirstKind; k; A; K; p; b; c; y0; tMax }` with `FIRST_KINDS = growth (y′ = ky) | affine (y′ = k(y − A)) | logistic (y′ = ry(1 − y/K)) | linear (y′ + py = b·e^(ct))`, `SecondSpec { a; b; c; F; w; y0; v0; tMax }` for `a y″ + b y′ + c y = F cos(ωt)`, `PhaseSpec { f; g; points, window }`. `PhaseType` (`:26`): saddle, stableNode, unstableNode, stableSpiral, unstableSpiral, center, degenerate. `ODE_PRESETS` (`:50-89`) has 4–6 chips per topic (saddle, spiral sink, centre, stable node, predator–prey, damped pendulum for phase).

#### Numerics

`par` (`:94-104`) reads a number with mathjs; `nice` writes a simple fraction or 4 dp; `norm` (`:128`) makes `y (1 − y)` an explicit product "would parse as calling a function y". `fn2` compiles a two-variable function (probing at (0.3, 0.7) so unknown symbols fail early). `rk4(f, x, y, h)` (`:158-164`) is the classic step. `solutionPath` (`:167-185`) integrates in both directions with `h = span/800` for up to 1000 steps per direction, stopping at the frame edge, when y leaves the frame by a full y-span, or when one step jumps more than `span/25` ("where the slope blows up (y′ = −x/y at y = 0): no jumping across"). `slopeField` (`:188-205`) draws n×n (21 or 25, 19 for backgrounds) short dashes of length 0.36·cell with slope scaled by the pixel aspect. `verifyFirst` (`:210-223`) checks `y(t₀) = y₀` and `y′ = f(t, y)` by central differences at 29 points (1e−4 relative, ≥ 3 points).

#### Topics

- `renderField` (`:227-243`): the slope field (25×25) and a solution through each start point in the palette.
- `renderEuler` (`:247-305`): n ≤ 200 steps of `y_{n+1} = y_n + h f(x_n, y_n)`; the reference is RK4 with 200 sub-steps per Euler step (`fine`, `:263-269`); the picture is the field, the RK4 curve green, the Euler polyline orange with dots when n ≤ 60; the header is a table `n | x_n | y_n | f(x_n, y_n)` (all rows when n ≤ 6, else rows 0–3, ⋮, n); captions give the end values and the error.
- `renderFirst` (`:309-403`): growth by separation (`∫dy/y = ∫k dt`, `ln|y| = kt + C`), with the doubling time or half-life `ln 2/|k|`; affine `y = A + Ce^(kt)` with the approach/leave caption; logistic by partial fractions (`∫K dy/(y(K − y)) = ∫(1/y + 1/(K − y)) dy`), `y = K/(1 + A e^(−rt))`, `A = (K − y₀)/y₀`, with the time to reach K/2 (`ln A / r`); linear by the integrating factor `μ = e^(pt)`, `(μ y)′ = b e^((p+c)t)`, with the resonant case `p + c = 0` giving `y = (bt + y₀)e^(−pt)` (`:373-376`). The picture is the slope field under the solution with equilibrium lines dashed.
- `renderSecond` (`:407-523`): the particular solution for `F cos ωt` by undetermined coefficients (`m = c − aω²`, `n = bω`, `P = Fm/det`, `Q = Fn/det`) or the resonant `k t sin ωt` with `k = F/(2aω)` when det < 1e−12 (`:419-437`); the homogeneous part by the characteristic equation: distinct real roots `C₁e^(r₁t) + C₂e^(r₂t)`, a double root `(C₁ + C₂t)e^(αt)`, complex `e^(αt)(C₁ cos βt + C₂ sin βt)` with the envelope `±√(C₁² + C₂²) e^(αt)` drawn dashed grey when unforced and α ≠ 0 (the resonant case draws the growing lines `±kt` dashed red instead); the constants from `y(0)`, `y′(0)` after subtracting `y_p(0)`, `y_p′(0)`. The check (`:488-496`) first confirms `y(0) = y₀` (1e−6) and `y′(0) = v₀` by a central difference (1e−4 relative), then tests the residual `a y″ + b y′ + c y − F cos ωt` by second differences with h = 1e−3 at 24 points, tolerance 1e−3·max(1, |cy|, |F|). Captions: resonance, over/critical/under/no damping, or "growing".
- `renderPhase` (`:550-644`): a 19×19 arrow field; the Jacobian at the origin by central differences (h = 1e−4), and the system is called linear when `f`, `g` agree with `ax + by`, `cx + dy` at four probe points (`:581-582`); `classify` (`:527-548`) by trace T and determinant D: `|D| < 1e−9` degenerate, `D < 0` saddle, `T² − 4D ≥ 0` nodes by the sign of T, `T ≈ 0` centre, otherwise spirals; eigenvalues written real or `re ± im i`; eigenvector lines drawn dashed orange for real eigenvalues (`:587-595`). Trajectories: RK4 on the 2-D system with `dt = span/1500` for 6000 steps each direction, stopping outside the window by a span or at an equilibrium (`|k₁| < 1e−6`), with an arrowhead at step 120 forward.

`renderOde` (`:646-659`) dispatches.
### src/math/numerical.ts — numerical methods with every value on show

**Purpose** (`numerical.ts:1-7`): locating roots by a change of sign (decimal search, the bounds check proving a root to k decimal places, and the ways a sign check misleads), bisection and false position, Newton–Raphson and the secant method with their failure modes, fixed-point iteration with staircase/cobweb and the `|g′(α)| < 1` test, the trapezium, mid-ordinate and Simpson's rules with error order, and forward/backward/central differences. Depends on `expr.ts` (`parseE`, `evalE`, `simp`, `substitute`, `tex`), `derive.ts` (`derive`) for `f′` and `g′`, `applied.ts` (`antiderivative`) for exact integrals, `latex.ts` for tables, and `chart.ts`. `NumSpec = { topic: NumTopic; src }`, `NUM_TOPICS = ["sign", "bisect", "newton", "iterate", "integrate", "diff"]` (`:14-16`). `NumData` (`:149-162`) exposes `verdict` (`root | none | even | touch | jump | exact`), `intervals`, `roots`, `values`, `root`, `rounded`, `status`, `kind`, `gd`, `estimates`, `exact`, `bend` for the tests; `Status` is `converged | steps | flat | diverge | cycle | outside | slow | exact`.

#### Reading the input

`readOpts` (`:266-327`) splits on `;` and recognises: an interval `[a, b]`/`(a, b)` or `from a to b`; `x0 = …`, `x1 = …`; `k dp`/`to k decimal places` (≤ 10); `n strips/steps/iterations/intervals/ordinates` (ordinates minus one); `n = 2, 4, 8`; `h = 0.1, 0.01`; `x: …`/`y: …` data columns; method words from `METHODS` (`:248-256`: trapezium, simpson, midpoint/mid-ordinate, false position/regula falsi, secant, `all`; bisection/newton/iteration/forward/backward/central are accepted and ignored); `at x = …`; everything else is the function via `readFn` (`:329-362`): `g(x) = …` sets g; `x = number` is the point (diff) or start; `x = g(x)` sets g for iteration (`iterForm`, `:259-264`, rewrites `x_(n+1) = 2 + 1/x_n`); `lhs = rhs` becomes `f = lhs − rhs` with the equation kept for the header (`o.eq`). `val` (`:231-245`) reads a typed number keeping its text (`1e-8` becomes `1 · 10⁻⁸`). Number formatting: `sci` (five significant figures, `a × 10ⁿ` outside [1e−4, 1e7)), `fx` (fixed decimals without `−0.000`), `tr` (up to d decimals, no trailing zeros), `sgnCol` (blue positive, red negative, green zero), `col` (`\color`).

#### Root scanning

`bis(F, lo, hi)` (`:385-395`) halves a sign-change bracket 200 times or to 1e−15 relative. `scanRoots(F, a, b, N = 2000)` (`:397-445`) samples N + 1 points: sign changes are bisected and classed as roots when `|F(c)| < 1e−6·scale` (scale = 1 + the median |f|) or as breaks (poles/jumps) otherwise; exact zeros are roots unless both neighbours share a sign (touching); domain edges where finiteness changes are breaks; local minima of |f| with both neighbours of the same sign are refined by 80 golden-section steps and counted as touches when `|F(m)| < 1e−7·scale`. `runsAway` (`:448-451`) flags five successive values each growing by 20 % and ending beyond 20× the start.

#### Topics

- `renderSign` (`:537-599`): `f(a)` and `f(b)` with signs and colours; verdicts: `exact` (an endpoint is a root), `jump` (sign change but a break inside), `root`, `even` (no change but roots found: "two roots hidden"), `touch`, `none`. With `k dp` and a root, `decimalSearch` (`:602-644`) narrows one decimal at a time: step `s = 10^floor(log10(b − a))` (dropped a decade when it equals the span), up to 12 steps per decade until the sign flips, each decade written as a two-row array (`x | f(x)` with `⋯` when > 5 points), down to `s ≤ 10⁻ᵏ/2` (a sample that hits `f = 0` exactly stops the search with the `exactRoot` caption); then the root is `bis`ected inside the last bracket and `boundsCheck` (`:646-657`): `f(r − ½·10⁻ᵏ)` and `f(r + ½·10⁻ᵏ)` have opposite signs ⇒ the root rounds to r (`rounded`), else "near the edge". Without an interval `renderScan` (`:660-721`) tabulates f at the integers −10..10 (compressed with `⋯` when the marks are spread), lists sign-change intervals (checking each with `scanRoots(..., 400)` for a jump), exact integer roots, and touches when nothing changed sign. Pictures shade the interval purple, show breaks as red dashed lines and roots as green dots.
- `renderBisect` (`:725-838`): bisection `m = (a + b)/2` or false position `c = (a f(b) − b f(a))/(f(b) − f(a))`; `nMax = ns ?? (dp ? 60 : 6)` capped at 60; the table `n | a_n | b_n | m_n | f(m_n)` to `D = dp + 3` decimals; bisection stops when `round(lo, k) = round(hi, k)` and writes the error bound `|α − m| ≤ (b − a)/2`; false position stops when successive c agree to k dp and runs `boundsCheck`, and notes a "stuck" endpoint. Pictures: the first four midpoints/chords on the curve, and for bisection the "ladder" of shrinking intervals (purple bars, up to 8 rows).
- `renderNewton` (`:842-1013`): `x_{n+1} = x_n − f(x_n)/f′(x_n)` with `f′` from `derive`, or the secant formula from `x₀, x₁`; `tol = ½·10⁻⁽ᵏ⁺¹⁾` or 5e−7; `nMax = ns ?? (secant ? 30 : 20)` ≤ 40; statuses: `outside` (f or f′ undefined), `flat` (`|f′| < 1e−12`, or equal f values for the secant), `diverge` (`|x| > 1e8`, or after 8 steps growing past 1e3·(1 + |x₀|), or `runsAway`), `cycle` (`x_{n+1} ≈ x_{n−1}` within 1e−9 while moving), `converged` (step < tol and rounding agrees), else `slow`. The table adds `|x_n − α|` once converged with ≥ 3 steps; captions include the quadratic/superlinear order note and `boundsCheck` when dp is set. Picture: each tangent (or secant) drawn past both ends down to the axis, the flat tangent in red, `x₀, x₁, …` under the axis (`axisLabels` skips overlaps within 24 px).
- `renderIterate` (`:1017-1117`): `x_{n+1} = g(x_n)` up to `ns ?? 40` (≤ 60) with the same stop rules; values in strips of 7; the fixed point α is the converged value, or the root of `g(x) − x` nearest x₀ from `scanRoots` on `x₀ ± 10`; then `g′(x)` via `derive`, `|g′(α)| < 1` (staircase when `g′ ≥ 0`, cobweb when negative, `data.kind`), and if an `f` was given, whether α is its root (`|f(α)| < 1e−6·scale`). Picture: a 340 px square with `y = x`, `g`, and the staircase path `(x₀, 0) → (x₀, x₁) → (x₁, x₁) → …` cut after 10 points or when it runs more than `8·(|x₁ − x₀| + 0.5)` away.
- `renderIntegrate` (`:1132-1348`): function mode (n defaults to 4) or data mode (`x:`/`y:` columns, evenly spaced to 1e−9, no mid-ordinate); any n > 400 throws `tooMany`. Rules default to trapezium + Simpson for even n (or several n), trapezium alone otherwise; Simpson needs even n (with several n an odd one just gets `∅` cells). `ruleValue` (`:1123-1130`): `T = h/2[y₀ + yₙ + 2Σ]`, `M = hΣ mids`, `S = h/3[y₀ + yₙ + 4Σodd + 2Σeven]`. The exact value is `antiderivative` evaluated when it agrees with Simpson (2000 strips) to 1e−6, else the Simpson value labelled "accurate" (`:1187-1203`). One n: `h`, ordinate strips (n ≤ 24), each rule's formula and substitution, errors with percentages, "Simpson better" when `e_S < e_T/3`. Several n: a table of values and errors, the observed order `p = log(e₁/e₂)/log(h₁/h₂)` from the first and last rows, and "Simpson exact" when every error < 1e−10. The sign of `f″` (via `derive` twice, 201 samples) says whether the trapezium rule over- or underestimates (`data.bend`). Picture: trapezia (orange), mid-ordinate rectangles (green), Simpson's parabolas through each pair of strips (Lagrange form, 31 points, purple), drawn only when n ≤ 60.
- `renderDiff` (`:1352-1438`): h defaults to 0.1; forward `(f(a+h) − f(a))/h`, backward, central `(f(a+h) − f(a−h))/2h`, the exact `f′(a)` from `derive`, absolute errors; with several h a table (forward and central only) and the observed orders (first two h), and a "round-off" caption when an error grows by 1.5× as h shrinks. Picture: the tangent (green), forward chord (orange), backward (purple), central (blue dashed) around `a ± 2.6h`, where the drawn h is `max(largest h, 0.1·max(1, |a|))` (the `drawn` caption says so when it differs).

`buildNumerical` (`:1445-1474`) sets words, resets `data`, calls `exprMessages` and dispatches, returning `{ svg, data }`; `renderNumerical` (`:1442-1444`) is the `RenderedSvg`-only wrapper. The `tooBig` throw on `NaN|undefined|Infinity` in the SVG lives in the shared `finish` (`:459-476`), which stacks the TeX blocks and pictures every renderer produced. `NUM_PRESETS` (`:1477-1527`) include the classic failures (`x^3 - 3x + 1; x0 = 1` flat tangent, `x^3 - 2x + 2; x0 = 0` cycle, `cbrt(x); x0 = 1` runs away) and a data-table integral. Tests pin `e^x = 3 − x` to 0.792, the verdict vocabulary, and that bisection keeps the root bracketed (`tests/numerical.test.ts:49-104`).

### src/math/statistics.ts — probability and statistics pictures

**Purpose** (`statistics.ts:1-4`): data summaries with box plots, scatter plots with the least-squares line, simulated experiments (law of large numbers), probability trees with Bayes, binomial/Poisson/normal distributions, and the central limit theorem; "simulations use a seeded generator so a picture on the board re-renders identically" (`rng` from `random.ts`). `StatSpec` (`:41-47`): `DataSpec { values; chart: "dot" | "hist"; bins }`, `ScatterSpec { points; line; residuals }`, `ChanceSpec { experiment: "coin" | "die" | "twoDice"; trials; seed }`, `TreeSpec { pA; pBA; pBnotA; nameA; nameB }`, `DistSpec { kind: "binomial" | "poisson" | "normal"; n; p; lambda; mu; sigma; lo; hi }`, `CltSpec { source: "die" | "coin" | "skewed"; n; samples; seed }`. `STAT_PRESETS` (`:93-136`); tree presets carry a `names` key the dialog fills in the UI language.

- `renderData` (`:161-253`): at least two values (`numbers`, `:142-146`, accepts spaces, commas, semicolons, newlines), sorted; mean, median, Q₁/Q₃ as the medians of the lower and upper halves (`:169-170`), IQR, population σ and sample s, modes (only when some value repeats), Tukey fences `Q₁ − 1.5·IQR`, `Q₃ + 1.5·IQR` for outliers. Histogram bins (`:188-193`): with `bins` given, `k = clampInt(bins, 2, 30)` equal bins of width `span/k` starting at the minimum; otherwise `k = min(15, max(4, ⌈√n⌉))` and the width is `niceStep(span, k)` from `scale.ts`, with `[a, b)` intervals starting at a multiple of the width. Dot plot stacks counts with a radius fitted to the step; mean red dashed and median green dashed verticals; a box plot on the same scale (whiskers to the innermost non-outliers, the box Q₁–Q₃, median green, mean a red diamond, outliers open red circles).
- `renderScatter` (`:257-298`): at least three points (an even number count, `:259`); `b = S_xy/S_xx`, `a = ȳ − b x̄`, `r = S_xy/√(S_xx S_yy)` (0 when `S_yy = 0`); captions grade |r| ≥ 0.7 strong, ≥ 0.4 moderate, else weak, and < 0.2 "no correlation"; residuals as red dashed verticals; the line orange with the centroid marked × and labelled `(x̄, ȳ)`.
- `renderChance` (`:320-374`): `outcomesOf` (`:304-318`) gives the outcomes, the watched event (heads, a six, a sum of 7) and the draw; trials clamped to 1..100000; the top panel bars the observed relative frequency of each outcome (the event's bar orange) against the theoretical level (a short black horizontal mark across each bar, `:343-344`); the bottom panel plots the running frequency of the event on a log₁₀ scale of trials (sampled at 800 log-spaced trial counts) against `p` dashed green.
- `renderTree` (`:386-465`): probabilities as `Frac` (decimals if any input had a point); a two-level tree with branch probabilities, product `P(A)·P(B|A)` beside each leaf (B leaves orange), `P(B)` by the law of total probability and `P(A|B) = P(A ∩ B)/P(B)` in the header.
- `renderDist` (`:490-565`): `phi` (`:470-475`) is the Abramowitz–Stegun 7.1.26 approximation of Φ (error < 1.5e−7); `logFact` tabulates ln k! to 1000. Normal: pdf over `μ ± 4σ`, ticks at `μ + kσ`, the area `P(lo < X < hi)` shaded, z-scores in the caption. Binomial (n ≤ 200) and Poisson (λ ≤ 200, `kMax = ⌈λ + 5√λ + 3⌉`): pmf by log-factorials, bars with those in `[lo, hi]` orange, the mean as a red dashed line, probabilities labelled when kMax ≤ 20.
- `renderClt` (`:575-639`): population values and weights (`skewed` = 0..8 with weights 30, 22, 15, 10, 8, 6, 4, 3, 2), μ and σ, `m` samples (10..20000) of size n (1..100); means lie on a lattice of step 1/n so bins are whole lattice cells (`cells = ⌈(range·n)/45⌉`, `:590-595`) "so bars don't alias"; the histogram is drawn as a density with `N(μ, σ²/n)` over it (the population's bar chart above, 104 px), and the caption compares the observed mean and SD of the sample means with `σ/√n`.

`renderStatistics` (`:641-656`) dispatches on `topic`; `STAT_TOPICS`, `EXPERIMENTS`, `DIST_KINDS` and `CLT_SOURCES` (`:37-51`) are the exported lists the dialog's selectors use.

### src/math/distributions.ts — the normal, t and χ² tails, computed

**Purpose** (`distributions.ts:1-2`): "computed (incomplete gamma and beta functions), not looked up in tables … No imports, so the server and the plain-Node scripts can use them too." `lnGamma` (`:9-16`) is Lanczos with g = 7 and nine coefficients, using the reflection formula below 0.5. `gammaPQ(a, x)` (`:21-55`) returns the regularised `[P, Q]`: the series `Σ xⁿ/(a(a+1)…)` when `x < a + 1`, otherwise Lentz's continued fraction for Q, both to 1e−16 relative with `TINY = 1e−300` guards. `betaCf` (`:57-86`) is the Lentz continued fraction for the incomplete beta; `betaI(a, b, x)` (`:88-93`) uses the symmetry `I_x(a, b) = 1 − I_{1−x}(b, a)` past `(a + 1)/(a + b + 2)`. Then: `normSf(z) = ½ Q(½, z²/2)` ("accurate far into the tail", `:96`), `normCdf(z) = normSf(−z)`, `tSf(t, df) = ½ I_{df/(df+t²)}(df/2, ½)` for any real df > 0 (normal beyond 1e7), `chiSf(x, k) = Q(k/2, x/2)`. `invertSf` (`:108-116`) bisects a decreasing survival function 200 times to 1e−13 relative; `zUpper` on `[−40, 40]`, `tUpper` on `[−1e6, 1e6]`, `chiUpper` on `[0, k + 200√(2k) + 200]`. Tests pin table values (`Φ(1.96) = 0.9750021`, `t₀.₀₂₅,₁₀ = 2.228139`, `χ²₀.₀₅,₃ = 7.814728`, the far tail `normSf(5) = 2.8665157e−7`) and closed forms (Cauchy, t₂, χ²₁, χ²₂) to 1e−12 (`tests/inference.test.ts:20-47`).

### src/math/inference.ts — statistical inference

**Purpose** (`inference.ts:1-5`): confidence intervals for a mean (z or t) or a proportion, a coverage simulation, one-sample tests with the p-value shaded on the null distribution, two-sample tests (Welch, paired, two proportions) with the interval for the difference, χ² tests (goodness of fit, independence), and the two kinds of error with power. Re-exports the distribution functions (`:127`).

#### Spec

`InfSpec` (`:25-39`): `topic: InfTopic` (`ci | coverage | test | two | chi | power`), `kind: string` (per topic: `OneKind = t | z | prop`, `TwoKind = means | paired | props`, `ChiKind = gof | indep`, `CoverKind = z | t`; `kindsOf`, `kindLabel`, `:951-955`), six free fields `a..f` "whose meaning depends on the topic and kind (see infFields)", `data`, `data2` (lists or a table), `level` (confidence or α), `alt: Alt` (`ne | lt | gt`; `hasAlt` for test/two/power), `seed`. `infFields` (`:961-1000`) tells the dialog which boxes to show with which labels (e.g. one-sample t: data textarea, x̄, s, n, μ₀, level). `lastResult()` (`:123`) exposes the last statistic/p/interval/power for the tests. `renderInference(spec, words)` (`:931-948`) sets the words, resets `last` and dispatches on `topic`. `INF_PRESETS` (`:1018-1055`).

#### Shared pieces

Readers: `num`, `list` (split on whitespace/commas/colons), `size` (integer ≥ 2 unless told, ≤ 1e7), `positive`, `count` (0..n), `confLevel` (0.5..0.999, percentages divided by 100), `alphaLevel` (0.001..0.5), `summarise` (n, mean, sample sd). `Ref` (`:141-144`) packages a reference distribution: `zRef` (N(0,1)) or `tRef(df)` (pdf via `lnGamma`); `chiPdf`. `pValue` (`:405-408`): two-sided `2·sf(|stat|)`, lower `1 − sf`, upper `sf`; `critOf` uses α/2 for two-sided; `decision` (`:418-427`) writes `|t| = … > crit, p = … < α` coloured by the outcome; `verdict` the caption with the H₁ sentence.

Pictures: `nullPicture` (`:269-317`) draws the null pdf over `±R` (R = min(6.5, max(4, |stat| + 0.7, crit + 0.8))) or `[0, x₁]` for χ², the rejection region pink, the p-value hatched orange (`DEFS` patterns, `:222-226`), critical values as red dashed lines, the statistic as a blue line labelled beside it on the side with room, and a legend row (`keys`, wrapping). `ciPicture` (`:320-345`) shades the middle C% of the estimate's sampling distribution with the tails grey and a green bracket `x̄ ± E` beneath. `stripPicture` (`:348-364`) is a number line with the interval and `0` dashed red. `tablePicture` (`:368-386`) draws a counts table with optional expected values as blue sub-text.

#### Topics

- `renderCi` (`:451-517`): proportion `p̂ = x/n`, `SE = √(p̂(1 − p̂)/n)`, `z*`, `E`, the interval; mean from data (`meanInputs`, `:437-449`, writing x̄ and s from the sums) or summary, `SE = s/√n`, `t*` with `df = n − 1` or `z*`; caption "we are C% confident …" and what C% means; a warning when `min(x, n − x) < 10`.
- `renderCoverage` (`:533-586`): mulberry32 `rng` (`:522-531`), Box–Muller normals, n capped at 200, 40 intervals drawn as lines (green when they catch μ, red otherwise) plus 2000 more counted for the long-run rate; `t` kind uses the sample sd and `t*`.
- `renderTest` (`:590-640`): H₀/H₁, `p̂`, `SE = √(p₀(1 − p₀)/n)`, `z`; or x̄, SE, `t`/`z` with df; then p, the decision line, the null picture.
- `renderTwo` (`:646-750`): Welch's t with `df = (v₁ + v₂)²/(v₁²/(n₁ − 1) + v₂²/(n₂ − 1))`; paired differences `d = x₁ − x₂` summarised; two proportions with the pooled `p̂` for the test SE and the unpooled `SE′` for the interval; the (1 − α) interval for the difference and whether it contains 0.
- `renderChi` (`:756-837`): goodness of fit (≤ 12 categories) with equal or given ratios (`E_i = n·r_i/Σr`), `χ² = Σ(O − E)²/E`, `df = k − 1`; independence from a table (≤ 6×6), `E_ij = R_i C_j/n`, `df = (r − 1)(c − 1)`; `p = chiSf`, `crit = chiUpper(α, df)`; a warning when any E < 5. Tests pin the 2×2 shortcut and Mendel's 9:3:3:1.
- `renderPower` (`:848-927`): `SE = σ/√n`, the cut-off(s) `μ₀ ± z_α SE`, `β = P(accept | μ₁)` via `rejectProb` (`:842-846`), power `1 − β`, and the n for 80 % power `⌈((z_α + z_0.2)σ/(μ₁ − μ₀))²⌉` (tested to be just enough, `tests/inference.test.ts:116`). Picture: both pdfs, α hatched red under H₀, β lilac and power green under H₁.

### src/math/applied.ts — applied calculus

**Purpose** (`applied.ts:1-6`): areas under and between curves, volumes of revolution, motion along a line, optimisation set-ups and related rates; "polynomials are handled exactly, including surd limits; other functions by standard antiderivatives, checked against Simpson's rule." `AppSpec = { topic: AppTopic; f; g; a; b; c; opt }` (`:23`) with `APP_TOPICS = area | volume | motion | optimise | rates`, `OptKind = box | fence | can | distance`, `RateKind = ladder | balloon | cone | ripple`; `opt` carries the axis (`"x" | "y"`) for volumes or the kind for the last two. `appFields` (`:888-906`) names the boxes per topic/kind from `words.opt.fields`/`words.rates.fields`; the rates boxes map to `a, b, c, f` in that order, so the cone's fourth number (the current height h) travels in `f` (`:814`, preset `:948`). `renderApplied` (`:870-885`) sets the words, calls `exprMessages`, and dispatches. `lastAnswer()` (`:87`) exposes the number for tests. Depends on `expr.ts` (polynomials `toPoly/fromPoly/realRoots/peval`, quadratic surds `QS`, `qs*`, `sqrtSplit`), `derive.ts`, `Frac`.

#### Antiderivatives

`antiderivative(f)` (`:92-104`, exported; used by `numerical.ts`): polynomials term by term; otherwise each additive term is split into a coefficient and a `piece`: `(ax + b)ⁿ → (ax + b)ⁿ⁺¹/(a(n + 1))` (n = −1 → `ln/a`), `sec²(ax + b)` or `cos⁻²` → `tan/a`, `e^(ax + b) → e^(…)/a`, `k^(ax + b) → k^(…)/(a ln k)`, sin/cos/sinh/cosh of a linear argument; returns null for anything else (caption `noAntiderivative`, the value then comes from Simpson).

#### Exact points and integrals

`Pt = { q: QS | null; v; tex; plain; e? }` (`:149`): `ptOfQS` for rationals and `a + b√s`; `ptOfNum` recognises `kπ/q` for q ∈ {1, 2, 3, 4, 6} within 1e−9 (so `sin x` roots print as `π`) (`:152-163`); `parsePt` parses a typed limit (`2pi`, `e`). `zerosBetween(h, hp, a, b)` (`:184-214`): exact `realRoots` for polynomials, else a 2000-sample scan with 100-step bisection keeping the sign of the left point. `definite(h, H, Hp, p, q)` (`:217-234`): exact `QS` difference for polynomials at exact limits (same surd), symbolic substitution and `simp` for limits like π or e ("−cos π = 1, ln e = 1"), numeric `H(q) − H(p)`, or Simpson.

#### Topics

- `renderArea` (`:269-334`): `h = f − g`, limits typed or from the outermost roots (`limitsOf`, `:444-461`), the zeros between the limits split the region into pieces, each `∫ h dx = [H]` written with its sign (above green, below red), the total `Σ|piece|` exactly when every piece is exact, the signed total noted when pieces differ in sign, and a Simpson check of `∫|h|`. Picture: bands between the curves per piece coloured by sign with the piece's area labelled at its middle.
- `renderVolume` (`:347-380`): discs `π∫f²`, washers `π∫(f² − g²)`, shells `2π∫x(f − g)` about y; the inner integrand is simplified and integrated; the result is `kπ` written via `piTex` (`:340-345`, `8π/3`, `(16 + 2√5)π`). `solidPicture` (`:383-441`): the region, its mirror image faint, and cross-section ellipses (ry = the radius, rx = 0.22·ry) for discs/washers, or shell rims as ellipses around the y-axis.
- `renderMotion` (`:471-558`): `s(t)` typed in t (worked in x), `v = s′`, `a = v′`, rest times from `zerosBetween(v)`, positions at start/stops/end (exact for polynomials at exact times), displacement `s(t₁) − s(t₀)`, distance `Σ|legs|`. Picture: three stacked graphs s/v/a (104 px each) with rest times dashed, and the path on a number line with one green arrow per leg stepping down (`:533-555`).
- `renderOptimise` (`:574-677`): the can (`S = 2πr² + 2V/r`, `r = ∛(V/2π)`, `h = 2r`, drawn with its S(r) curve); the box `V = x(a − 2x)(b − 2x)` on `0 < x < min(a, b)/2`; the fence `A = x(L − 2x)`; the nearest point on `y = x²` to P (minimising `d² = (x − a)² + (x² − b)²`). Critical points by `realRoots`, those outside the domain named, the best by value, the second derivative test, and the answer (with `d = √(d²)` exact when rational via `sqrtSplit`). `optPicture` (`:679-732`) draws the sheet with corner squares, the river and fence, or the parabola with the circle around P touching it, plus the objective curve.
- `renderRates` (`:744-866`): ladder (`x² + y² = L²`, `2x ẋ + 2y ẏ = 0`, `ẏ = −xẋ/y` exact with surds); balloon (`V̇ = 4πr² ṙ`, `ṙ = V̇/(4πr²)` written as `k/(nπ)`); cone (`r = (R/H)h`, `V = (π/3)(R/H)²h³`, `ḣ = V̇H²/(πR²h²)`); ripple (`Ȧ = 2πr ṙ`). Each has a small diagram.

`APP_PRESETS` (`:909-951`). Tests pin exact = numerical areas (also between curves and across the axis), volumes against numerical integrals, distance adding up every leg, the best x beating every other x in range, and the rate formulas (`tests/applied.test.ts`).
### src/math/logic.ts — propositional logic

**Purpose** (`logic.ts:1-4`): truth tables built column by column from the subformulas, equivalence with the differing rows, normal forms with a Karnaugh map (Quine–McCluskey), gate circuits with wire values, validity of arguments with named rules and fallacies, and set expressions as Venn diagrams. Also the hub for `logicArgue.ts` and `logicPuzzles.ts`. `LogicSpec = { topic: LogicTopic; f; g; vals; tf: boolean; board?: BoardSpec; sw?: SwSpec }` (`:14`) with `LOGIC_TOPICS = table | equiv | nf | circuit | argument | strengthen | board | knights | sets` (`:11-12`); `f` is the formula (or premises), `g` the second formula/conclusion, `vals` circuit inputs, `tf` shows T/F instead of 1/0. `LogicWords` (`:16-53`) includes `gates` keyed by `GateOp`, `rules` keyed by `RuleKey`, and the sub-tables `board`, `knights`, `sw`.

#### Formulas

`Node` (`:59`): `var`, `const`, `not`, `bin` with `BinOp = and | or | xor | imp | iff | nand | nor | diff`. `SYMBOLS` (`:64-76`) is a longest-first list of spellings: `<->`, `<=>`, `↔`, `⇔`, `≡` (iff); `->`, `=>`, `→`, `⇒`, `⊃` (imp); `&&`, `/\`, `&`, `∧`, `*`, `·`, `⋅`, `∩` (and); `||`, `\/`, `|`, `∨`, `+`, `∪` (or); `⊕`, `⊻`, `^`, `Δ`, `△`, `∆` (xor); `↑`, `↓`; `\`, `∖`, `−`, `-` (diff); `¬`, `~`, `!` (not); postfix `'`, `′`, `ᶜ`, `’`; brackets; constants `⊤ ⊥ ∅ 1 0`. `WORDS` adds `and or xor nand nor implies iff not true false`. `tokenize` (`:82-114`) tries symbols before letters "Δ and ᶜ count as letters in Unicode", words of length > 1, then a variable "one letter with optional digits (p, q1, x2), so AB reads as A·B" with subscript digits normalised. `parseFormula` (`:116-196`) is precedence-climbing: iff (left-assoc) > imp (right-assoc) > or/xor/nor/diff > and/nand with juxtaposition as `and` > unary (`not` prefix, postfix primes) > atom. `evalNode` (`:198-221`); `varsOf` (`:223-232`) sorted naturally. Printing (`:236-280`): `printer(tex, style, leaf?)` with `TEX_OPS`/`TEXT_OPS` for `logic` and `set` styles; "mixed operators always get brackets … only a chain of one associative operator goes without" (`:268-270`); set style prints complements as overlines/primes and constants as `U`/`∅`; the exported entry points are `toTex(n, style)`, `toText(n, style)` and `toTexWith(n, name)` (every variable printed by a callback, `:275-278`). The test "printing then parsing gives the same formula" runs 2000 random trees in both styles (`tests/logic.test.ts:12-29`).

#### Truth tables

`truthTable(cols, rowFill, w, tf, marks?)` (`:315-347`) draws LaTeX headers (`texBox`, `:285-300`), rows of 21 px with T/F or 1/0 coloured (variables ink, subformulas grey, the main column green/red), a vertical rule after the variables, optional ✓/✗ marks, scaled to fit by `fit` (`:303-306`, grows up to 1.3×). `rowsFor(vars, tf)` (`:350-356`): "textbooks list T…T first, circuits count up from 0…0". `subformulas` lists compound subformulas innermost first, deduplicated by text. `MAX_VARS = 5` (6 for circuits, 3 for sets).

- `renderTable` (`:383-405`): columns for the variables and every subformula; true rows tinted green; captions tautology/contradiction/satisfiable (k of r rows); header `f ≡ ⊤`/`⊥` when constant.
- `renderEquiv` (`:409-448`): both formulas' columns (intermediate columns only while ≤ 11 columns), differing rows red with ✗; captions equivalent or not (with the first differing row described), and one-way implication when it holds.
- `renderArgument` (`:852-883`): premises split on `;`/`,`/newline; rows where all premises hold tinted blue, counterexample rows (premises true, conclusion false) red; `⊨` or `⊭`; `ruleOf` (`:836-850`) matches the premises (any permutation) and conclusion against `RULES` (`:805-819`: modus ponens, modus tollens, hypothetical syllogism, disjunctive syllogism (both forms), constructive dilemma, transposition, affirming the consequent, denying the antecedent, simplification, conjunction, addition) by structural unification with the constraint that distinct pattern letters bind distinct statements ("P ∧ P ⊢ P is not conjunction", `:844`).

#### Normal forms and the Karnaugh map

`Imp = { bits, mask }` (`:452`, mask bit set = that variable is free). `primeImplicants` (`:461-483`) is Quine–McCluskey: repeatedly merge pairs with equal masks differing in one bit, keeping the unmerged as primes. `minimalCover` (`:486-506`) is a branch-and-bound exact cover: pick the minterm with fewest covering primes, try primes largest-first, prune by group count then literal count. `readTruth` (`:531-553`) accepts `m(1,3,5) + d(7)` (optionally `f(A,B,C) = Σm(…)`, variables default to `ABCD` sized by the largest index, ≤ 4) or a formula. `minimalForms` (`:573-582`, exported): the minimal sum of products from the 1s (+ don't-cares) and the product of sums from the 0s (+ don't-cares); `productTex`/`clauseTex` write literals with overlines. `renderNf` (`:584-678`): the map has row variables (`rv = min(1, n − 1)` for n ≤ 3, so none for a single variable, 2 for n = 4; `:590`) and column variables in Gray order (`GRAY`, `:556`), 52 px cells numbered with their minterm, `1`/`X`/`0`; each group is a rounded rectangle (`runs`, `:559-570`, splits wrapped blocks into two runs with open edges extended 14 px beyond the map and clipped), padded 5 + 3·(k mod 3) so overlapping groups stay distinct; a legend lists groups with their products and minterms; then the four forms (Σm, ΠM, minimal SOP, minimal POS). Captions give the group and literal counts.

#### Circuits

`readVals` (`:682-697`) reads `A=1, B=0` (also `A:T`) or a bit string in variable order; unset inputs are 0. `gate(op, x, y)` (`:705-733`) draws AND (D-shape, `GW = 44`, `GH = 36`), OR (curved), XOR (OR with a back arc), NOT (triangle + bubble), NAND/NOR/XNOR (bubble on the output), implication as OR with a bubble on the first input, difference as AND with a bubble on the second. `renderCircuit` (`:737-800`): each leaf occupies a 40 px slot (≤ 14 leaves), gates are placed by height (`col(h) = inX + 38 + (h − 1)·92`) at the mean y of their inputs, wires are drawn as Manhattan paths with a stagger per input (`xm = xi − 12 − i·10`), green and thicker when 1, grey when 0; the output `f = 0/1` ends the chain.

#### Sets

`venn` (`:888-923`) draws 1–3 circles (R = 68) in a universe rectangle; every minterm where the expression holds is shaded by nesting clip paths for the "inside" circles and a mask excluding the "outside" ones. `renderSets` (`:932-977`): rejects `→ ↔ ↑ ↓` (`notSetOp`), `U` is the universe constant (`universe`, `:929-930`), draws one or two diagrams side by side, writes `x ∈ A ∪ B ⇔ x ∈ A ∨ x ∈ B` (`membershipTex`, `:926`), and for two expressions says equal/different and reports a subset relation.

`LOGIC_PRESETS` (`:983-1047`) includes several NAEC 2025 items (the Georgian master's exam logic section) marked in comments; `strengthen`, `board`, `knights` delegate to the sibling modules' preset lists. `renderLogic` (`:1049-1070`) dispatches.

### src/math/logicArgue.ts — strengthen / weaken questions

**Purpose** (`logicArgue.ts:1-5`): an argument written with letters, a legend saying what each letter means, background `links`, `premises` and a `conclusion`; the tool finds the unstated premise and judges each option. `SwSpec = { ask: "strengthen" | "weaken"; pattern: SwPattern; legend; premises; links; conclusion; options }` (`:17`) with `SW_PATTERNS = none | survey | causal | sample | analogy | plan | criterion`; `SwWords` (`:20-47`) includes the verdict names and a `Card` per pattern (name, typical gap, plus/minus hints).

`models(vars, fs)` (`:54-61`) enumerates the assignments satisfying all formulas (≤ 12 letters); `share(rows, f)` is the fraction of rows where f holds. `judge(base, concl, x)` (`:68-79`): filter the models by the option; none left → `conflicts` ("an option that cannot be true with [the premises] denies one of them"); `after = share` of the conclusion; `necessary` when every model with the conclusion also has the option (and the option is not already entailed); verdict `sufficient` (after = 1, before < 1), `defeater` (after = 0, before > 0), `strengthens`, `weakens` (a change beyond 1e−9), `irrelevant`. `bridges` (`:84-115`) searches single literals and all `a → b` implications between letters for the simplest extra premise that makes the argument valid, rejecting candidates that give the conclusion from the background alone ("skips the argument instead of completing it"), merging candidates with the same truth table (keeping the higher-scoring form, and trying premise letters first as the "if" part so `s → a` is kept rather than its contrapositive), scoring those touching premise letters (+2) and conclusion letters (+1), sorting by score then size, returning the top three. `renderStrengthen` (`:188-331`): premises as boxes with their legend sentences (`sayIt`, `:132-142`, speaks `if … then …`, `not: …`), links in grey, an arrow, the gap box (purple dashed), the conclusion box, the pattern card (yellow), then one row per option: label, formula, sentence, a bar of the conclusion's share after (coloured) with a tick at the share before, and the verdict; captions give the baseline share and which option most strengthens/weakens. `composeText` from `logicPuzzles.ts` gives a plain-text title (names in any script). `SW_PRESETS` (`:338-412`) holds two NAEC 2025 items in Georgian and two English examples.

### src/math/logicPuzzles.ts — constraint boards and knights/knaves

**Purpose** (`logicPuzzles.ts:1-4`): grouping/ordering puzzles with constraints in a compact notation, conditionals with their contrapositives, what is forced, what an "if …" assumption adds, and a sweep of answer options; plus truth-teller/liar puzzles. `BoardSpec = { mode: "bins" | "slots"; places; pool; rules; ask; options }` (`:13`): places like `Chveli(3), Kala(3), Latpari(1)` (exact, `(≤3)` or `(1-3)` ranges; no bracket means 0..∞) or slot names/a count (capped at 12 slots, named `1..n`); pool items; rules one per line; an assumption; options one per line. `BoardWords`/`KnightsWords` (`:15-65`). `tw(s, size)` (`:70`) estimates text width (Georgian 0.8·size, capitals 0.68, else 0.56). `composeText` (`:73-87`) is `compose` with a plain-text title.

#### The board

`readBoard` (`:103-137`) builds `Place { name, min, max, tags }` (slots get tags for their name, index and the parts split on `-_.·`, so `ოთხ-დილა` answers to `დილა`), items (≤ 10, places ≤ 12, no duplicates). Atoms (`:92-97`): `at` (`E@Chveli`, `E∉Chveli`, `E ∈ …`), `same`/`≠` (`C=G`), `before` (`A < B`, `>` swaps), `block` (`[A·B]`, B immediately after A), `adj` (`{A·B}`). `parseRule` (`:144-214`) tokenises connectives (`<-> -> & | ¬ ~ ( )` and the words `and or not if then`) and parses iff > imp > or > and > not > atom. `holds(n, pos, b)` (`:240-264`) evaluates against `pos[i]` = place index of item i (−1 unplaced). `negate` (`:273-286`) pushes negation inward so contrapositives print as `E∉Chveli`; `show` (`:288-313`) prints with tight spacing for single letters and in `slots` mode "two items never share a slot, so not before is after".

`solve(b, rules, w, visit?)` (`:319-352`) is backtracking over items in order: each rule is checked as soon as its last item is placed (`due`), capacities are enforced with `counts`, remaining minimums are pruned by `minsLeft() ≤ items left`, `NODE_LIMIT = 3,000,000`; returns the count, the `possible[item][place]` matrix and the first solution. Pictures: `drawBins` (`:362-390`, boxes with seat lines and forced items in blue), `drawSlots` (`:392-410`), `drawGrid` (`:413-446`, items × places with ● forced, ○ possible, blank ruled out; against a base solution newly ruled-out cells go red and newly forced blue). `readOptions` (`:452-489`) separates arrangement options (`Latpari: E | Chveli: A C G | Kala: B D F` or a slot sequence with `_` blanks) from statement options (anything with `@ = ≠ < > ∉ ∈ [ { ¬ ~`). `drawSweep` (`:533-576`) checks each arrangement against capacity then every rule, striking it out at the first violated constraint and listing survivors. `drawStatements` (`:494-523`) counts in how many remaining arrangements each statement holds (the arrangements of the board as it stands, including the `ask` assumption, `:673-676`): `must` (all), `never` (none), `could`, and "fixes the board" when exactly one (of more than one). `renderBoard` (`:578-691`): board, pool (placed items struck through), numbered constraints with contrapositives in purple, the grid, captions (no/unique/many solutions, forced placements, ruled-out places when ≤ 16), the assumption grid and what it newly forces, the sweep, the statement verdicts grouped.

#### Knights and knaves

`renderKnights(src, words)` (`:697-758`): lines `Name: statement`; every name becomes a variable `x1, x2, …` so names may be words in any script; a speaker's line means `speaker ↔ statement`; a capitalised or speaking name is an islander (knight/knave), a lowercase name a plain fact (`innocent`, `guilty`); ≤ 6 names; the truth table marks consistent rows ✓; captions give the unique solution, or the count plus what is settled in every consistent row, or "no such island". `BOARD_PRESETS` (`:862-885`) include the NAEC 2025 items 8, 12–17 (Georgian place names and the seven statues) and two English boards; `KNIGHTS_PRESETS` (`:887-895`).

### src/math/graphtheory.ts — graph theory on an edge list

**Purpose** (`graphtheory.ts:1-5`): properties (degrees and the handshake lemma, components, bipartite or an odd cycle, trees, regular/complete), Euler trails and circuits (Hierholzer), Hamiltonian cycles and paths (backtracking, Dirac), colouring (greedy vs the exact chromatic number, cliques), walks counted by powers of the adjacency matrix, spanning trees by the matrix-tree theorem. `GtSpec = { topic: GtTopic; edges; layout: GtLayout; a; b; k }` (`:16`) with `GT_TOPICS = props | euler | hamilton | color | walks | spanning` and `GT_LAYOUTS = auto | circle | shells` (`:13-14`); `a`, `b` are the end vertices for walks and `k` the walk length. Uses `parseEdges`, `layoutGraph`, `drawGraph`, `Look` from `algoGraphs.ts` and `table` from `algoArrays.ts`; `PAL` (`:131-140`) is the eight-colour vertex palette (blue, orange, green, purple, red, cyan, yellow, grey). `renderGt` (`:594-609`) dispatches on `topic`. Presets (`:86-129`) are built from named families: `complete(n)`, `cycle(n)`, `bipartiteK(m, n)`, `PETERSEN`, `CUBE` (Q₃ with binary labels), `KONIGSBERG` (a multigraph), `HOUSE`, `WHEEL`, `DODECAHEDRON`, `TREE`, `MAP`, and a crown graph "greedy trap".

`build` (`:146-159`) parses with `parseEdges(…, 20, 60)` (up to 20 vertices and 60 edges) and makes the adjacency matrix (multi-edges counted), neighbour lists, degrees, and `simple`. `componentsOf` is BFS. `twoColour` (`:177-203`) is BFS 2-colouring; on a conflict it walks both parents up to the lowest common ancestor and returns the odd cycle. `edgesAlong` maps a vertex sequence to edge ids.

- `renderProps` (`:223-262`): degrees under each vertex, bipartition colours or the odd cycle highlighted red, a table of nine properties, the handshake caption `Σ deg = 2E`, the tree note, the multigraph note.
- `renderEuler` (`:264-315`): disconnected → none; odd-degree count must be 0 or 2 (odd vertices marked red otherwise); Hierholzer (`:281-299`): a stack walk from an odd vertex (or vertex 0) taking the lowest unused neighbour, popping to the trail when stuck, reversed at the end; edges are numbered in trail order (`edgeLabel`), start green, end orange.
- `renderHamilton` (`:317-369`): backtracking DFS for a cycle from vertex 0, then a path from every start, capped at `CAP = 3e6` steps ("gave up"); vertices badged in order; Dirac's condition `min deg ≥ n/2` noted.
- `renderColor` (`:371-438`): Welsh–Powell greedy (largest degree first, smallest free colour); the largest clique by branch-and-bound (`grow`, `:386-394`) as a lower bound; exact k-colouring by backtracking from the clique size up to the greedy count (≤ 2e6 steps each); the clique's edges highlighted red; captions `χ(G)`, whether greedy did worse, `ω(G)`.
- `renderWalks` (`:443-487`): `A^k` by BigInt matrix multiplication (k ≤ 12), the entry `(a, b)` boxed red, the matrices shown when n ≤ 10; the walks listed when simple, ≤ 16 of them and k ≤ 6; triangles `trace(A³)/6`.
- `renderSpanning` (`:510-592`): Laplacian `L = D − A` (shown as a matrix when n ≤ 10), `τ = det` of the reduced Laplacian (first row and column removed) by Bareiss fraction-free elimination in BigInt (`detBareiss`, `:490-508`); a BFS spanning tree from vertex 0 highlighted in green when τ > 0; Cayley's `nⁿ⁻²` noted for complete graphs; when `τ ≤ 20` and E ≤ 18 every spanning tree is enumerated by choosing n − 1 edges and union–find acyclicity (`:544-561`) and drawn as 112×84 thumbnails.

### src/math/algo.ts — the Algorithms tool's hub

**Purpose** (`algo.ts:1-5`): step-by-step traces of sorting and searching, graph algorithms, trees and heaps, stacks/queues/hash tables, DP tables with traceback, complexity, recursion/backtracking and string matching. Specs (`:34-55`): `SortSpec { algo: SortAlgo; data; view?: "cells" | "bars"; step? }` with `SORT_ALGOS = bubble | insertion | selection | shell | merge | quick | heap | counting`; `SearchSpec { algo: binary | linear | twoptr | window; data; target }` (target is the value, the pair sum, or the window size); `GraphSpec { algo: GraphAlgo; edges; directed; start }` with `GRAPH_ALGOS = bfs | dfs | dijkstra | bellman | floyd | prim | kruskal | unionfind | topo`; `TreeSpec { kind: bst | avl | minheap | maxheap; data }`; `DsSpec { kind: stack | queue | chaining | probing; ops; m }`; `DpSpec { problem: lcs | edit | knapsack | coins; a; b; c }`; `GrowthSpec { mode: master | compare; a; b; d; n }`; `RecurSpec { problem: fib | fact | hanoi | queens | subsets; n; memo; data; target }`; `StringSpec { algo: naive | kmp | rk; text; pattern }`. Every spec has `step?` — "how many steps of the trace to show (the slider); missing means all of them." `ALGO_TOPICS` (`:55`) is `sort | search | graph | tree | ds | dp | recur | string | growth`; `AlgoWords` (`:57-188`) is one large table. `ALGO_PRESETS` (`:190-265`).

`Steps` (`:271-302`) is the step-slider protocol: `limit` (∞ for the full picture), `total` counted as renderers go; `room()`, `take()` (count one step if there is room), `count(n)` (n more, returns how many to show), `cut(items, keep = 1)` (the first `keep` always shown, then one per step), and `final(...items)` returns nothing while partial "so captions that give the answer away wait for the last step". `renderAlgo` (`:328-333`) renders once with unlimited steps to learn `total`, and again with `new Steps(⌊step⌋)` when `spec.step < total`, returning `{ ...svg, steps: total }`; `renderGrowth` takes no `Steps` (`draw`, `:304-325`), so a growth picture has 0 steps. The test pins that every preset renders at every step without `NaN`, that intermediate steps differ from the full picture, that the last step equals it, and that only `growth` has no steps (`tests/algorithms.test.ts:66-83`).

### src/math/algoArrays.ts — arrays, data structures, DP, complexity

**Purpose** (`algoArrays.ts:1-4`): sorting traces, searching, stacks/queues/hash tables, DP tables, complexity pictures, and the shared cell/table/legend helpers. Exports `parseNums` (≤ max values, optional integers), `parseNum`, `txt`, `cell` (a rounded rect with text in a `Role` colour), `ROLES` (`plain | compare | sorted | pivot | key | min | idle`, `:33-42`), `legendRow` (swatches that wrap), `table` (grey header, coloured/filled cells), `Row` and `drawRows` (`:107-190`): one array state per row with index numbers on top, a note on the right (wrapped to the remaining width), optional gaps between runs, marks under cells (`lo/mid/hi`, `L/R`), a purple range bracket, and orange bezier arrows from where each moved value was (`movesBetween` by item id, `:120-123`); `bars` mode draws heights on a shared scale.

- `renderSort` (`:196-378`): the input ≤ 16 numbers; `ids` track which input item sits where so arrows follow values. Bubble: one row per pass with the sorted tail green, stopping early with no swaps. Insertion/shell: shifts counted; shell uses gaps `n/2, n/4, …, 1` with one gap group coloured. Selection: the minimum red. Heap: build a max-heap by sifting from `n/2 − 1` down, then `n − 1` extractions with sift-down. Merge: split rows showing gaps per depth, then one merge row per level with runs green and copies counted. Quick (Lomuto, last element pivot): a row per partition with the pivot purple, the active range bracketed, finished positions green and the rest idle. Counting (`renderCounting`, `:381-419`): integer values spanning ≤ 24, counts → end positions → stable placement right to left, with the count table under two rows and three steps. Captions: comparisons and swaps/shifts/copies, the "moved values" note, the algorithm's info.
- `renderSearch` (`:493-564`): binary (sorted first, caption if the input was not) with `lo/mid/hi` marks and `a[mid] < t → lo = mid + 1` notes; linear; captions found at index after k comparisons or not found, `⌊log₂ n⌋ + 1` for binary. `renderScan` (`:424-491`): two pointers on a sorted array for a pair with sum t (`L`/`R` marks, idle outside); sliding window of size k with `S_{i+1} = S_i − a_i + a_{i+k}`, the best window ★, and the count of additions vs naive.
- `renderDs` (`:586-723`): `parseOps` (`:570-583`) reads `push 3`, bare numbers, `pop/dequeue`, `peek/top/front` (≤ 20). `renderLinear`: one row per operation with the stack top (or queue front/back) highlighted and the output or "empty" in red; captions list outputs; header `O(1)`. `renderHash`: ≤ 24 integer keys, `h(k) = k mod m` (2 ≤ m ≤ 23), load factor; chaining draws each bucket's chain with arrow markers and counts collisions and the longest chain; linear probing tabulates `k | h(k) | probes → | slot` and draws the final table, counting collisions, total probes and the average, and the key that found the table full.
- `renderDp` (`:745-755`): `renderStrings` (`:771-845`) fills the LCS table `L_{i,j}` or the edit-distance table `D_{i,j}` (≤ 12 chars each), traces back with arrows `↖ ↑ ←` (matches green, path orange), lists the LCS or the edit operations; `blankAfter` (`:761-769`) shows the table row by row for the slider with the traceback only at the end. `renderKnapsack` (`:847-891`): `V_{i,c} = max(V_{i−1,c}, V_{i−1,c−wᵢ} + vᵢ)` with capacity ≤ 24 and ≤ 8 items, traceback marking taken items. `renderCoins` (`:893-954`): `C(x) = 1 + min C(x − c)` with the last coin row, amounts ≤ 40 split into rows of 14, the traceback path, and the greedy comparison (fails/works/gets stuck).
- `renderGrowth` → `renderMaster` (`:965-1022`): `T(n) = aT(n/b) + Θ(n^d)`, `log_b a` vs d decides the case and the result; a recursion tree of levels 0–3 (cells when `a` is a small integer and `aⁱ ≤ 27`, else counts) with the work per level `aⁱ (n/bⁱ)^d = rⁱ n^d` and the leaves `a^(log_b n) = n^(log_b a)`. `renderCompare` (`:1027-1102`): seven growth curves up to N (4..100) on a frame with `yMax = 1.25N²`, labels where each curve leaves the frame, and a running-time table at 10⁸ ops/s for n = 10, 100, 1000, 10⁶ (via log-ops to avoid overflow, `time`, `:1077-1090`); `gammaFact` (`:1105-1113`) is Stirling with a `1 + 1/(12x)` correction for the curve.

### src/math/algoGraphs.ts — graph and tree pictures

**Purpose** (`algoGraphs.ts:1-3`): the graph algorithms with a trace table, BST/AVL with rotations, heaps by heapify. `parseEdges` (`:17-33`, exported) reads `A-B 4, B->C, X–Y: 2` (names ≤ 8 letters/digits/underscores, `−` or `-` weights, no loops, limits `maxNodes`/`maxEdges` defaulting to 12 and 30; `weighted` is set when any edge carries a weight). `nodeRx(name) = max(17, 4.2·len + 9)` (`:83`). `layers` (`:50-66`) is Kahn's longest-path layering (null on a cycle). `Look` (`:68-79`): highlighted edge ids, node role fills, badges (order numbers), text under nodes, free colours, edge labels, highlight colour. `layoutGraph` (`:86-178`): `shells` (two concentric rings, inner vertex k under outer vertex k, for Petersen/prisms/cubes), `circle`, layered left-to-right for a DAG (barycentre ordering within a layer, a zig for single-node layers "so edges that skip a layer miss the node"), otherwise Fruchterman–Reingold from a circle (500 iterations, `k₀ = 1.8/√n`, temperature cooling from 0.12 to 0.002, `:129-165`) "deterministic, and usually untangles the edges". `drawGraph` (`:180-264`): ellipses `rx = nodeRx(name)`, `ry = 16`; edges trimmed to the ellipse boundary (`trim`), parallel/paired edges bent apart symmetrically by 46 px per index (`:206-215`), arrowheads for directed graphs (markers `g-ah`/`g-ah-hl`), weights off-centre (0.38/0.62 along by parity) with a white halo, edge labels in circles, badges top-right in orange, text under in green.

`renderGraph` (`:266-601`): `directed` is ignored for MST and union–find; the trace table columns depend on the algorithm:
- BFS: `step | visit | queue`, distances under nodes, tree edges highlighted; DFS: recursive with the path as the stack column; both badge the visiting order.
- Dijkstra (no negative weights): a row per settled vertex with the distance columns (settled green, improved orange, ∞ grey), predecessors highlighted, paths to every vertex in captions (≤ 6 lines, else one line).
- Prim: the cheapest crossing edge each step (ties by name), running total. Kruskal: edges sorted by weight, union–find without compression, `✓ added`/`✗ cycle`.
- Bellman–Ford: relax all arcs up to V − 1 passes with early stop; one more pass only counts as a step when it changes something (negative cycle): walk back V predecessors to land on the cycle, read it off, highlight red; undirected negative edges warned.
- Floyd–Warshall (≤ 8 nodes): the matrix after all k, cells improved via k shown `d (k)` in orange, negative diagonal marks a negative cycle; part-way the last k pivot vertex is purple.
- Union–find: union by size with path compression, one row per edge with `find` roots and the sets, final sets coloured.
- Topological sort (Kahn): `step | output | queue`, badges in order, leftover vertices (a cycle) red.
The header gives `V`, `E` and the cost (`O(V + E)`, `O((V + E) log V)`, `O(E log V)`, `O(E log E)`, `O(V·E)`, `O(V³)`, `O(E α(V))`).

`renderTree` (`:609-611`) sends `minheap`/`maxheap` to `renderHeap` and `bst`/`avl` to `renderSearchTree` (`:613-725`): inserts ≤ 24 values (duplicates skipped and noted), AVL rebalancing by balance factor with `LL/LR/RR/RL(v)` rotations recorded (`:634-652`); in-order x-positions, depth y-positions (`levelH = min(62, 330/H)`); balance factors in purple; captions in/pre/post/level-order, height vs `⌊log₂ n⌋`, rotations. `renderHeap` (`:727-792`): ≤ 15 values; heapify from `n/2 − 1` with one row per sift that moved something (path orange, final key blue), the tree drawn by index (`p(i)`, `:760-764`) coloured like the last row shown, header `A[i] ≥ A[2i+1], A[2i+2]`.

### src/math/algoRecur.ts — recursion and backtracking

**Purpose** (`algoRecur.ts:1-3`): call trees for Fibonacci (repeated calls marked, or cut by memoisation), factorial and Hanoi; N-queens with a trace and board; subset sum as an include/skip tree with pruning. `drawTree` (`:15-67`): leaves spaced evenly (`step = min(90, (W − 32)/leaves)`), parents centred over children, rows of 48 px; `shown` limits to the first calls in call order with the newest ringed orange and a call's value (`sub`) appearing only once it has returned (`end.get(t) < shown`). `renderRecur` (`:75-240`): fib (n ≤ 6, or ≤ 10 with memo; repeated calls orange, cached calls idle, base cases green; captions count calls vs n + 1 distinct and the repeats), fact (n ≤ 8, a single chain; each node is labelled `k!` with `= k · (k−1)! = k!` written out in numbers beneath, e.g. `5!` over `= 5 · 24 = 120`), hanoi (n ≤ 4, moves numbered `#m`, `2ⁿ − 1`), queens (4 ≤ n ≤ 8: the search up to the first solution recorded as place/backtrack steps, the board with the solution or the partial board at step k with the newest queen orange, the table of the first 13 steps or the last 13 up to k, captions with tries/backtracks/solutions), subsets (≤ 4 items, include edge `+v`, found ✓ green, pruned `sum > t` ✗ red, dead ends idle).

### src/math/algoStrings.ts — string matching

**Purpose** (`algoStrings.ts:1-3`): naive, KMP and Rabin–Karp. `drawAttempts` (`:12-29`) draws the text as cells with indices, then the pattern under it at each shift with roles (match green, mismatch red, known blue, skipped idle) and a wrapped note. `renderString` (`:31-174`): text ≤ 24, pattern ≤ 8; the naive comparison count is computed for every algorithm. Naive: every shift, stopping at the first mismatch. KMP: the prefix function `π` (`:69-73`, the standard `k = π[k − 1]` fallback), the scan with `i, j`, each attempt noting the known prefix and the shift `j − π[j − 1]` or the step; the `π` table above the attempts with its meaning. Rabin–Karp: `d = 31`, `q = 101`, `h = Σ code(cᵢ)·d^(m−1−i) mod q` rolled in O(1) per shift (`:129`), hash hits verified character by character (spurious hits counted), a table `shift | window | h | h = h(P)?`. Captions: matches found at shifts, comparison counts vs naive, spurious-hit stats.

### src/math/tactics.ts — problem-solving tactics

**Purpose** (`tactics.ts:1-5`): after Zeitz's *The Art and Craft of Problem Solving* — symmetry (`1 + 2 + … + n` as a staircase and its turned copy filling an `n × (n + 1)` rectangle), the pigeonhole principle (by counts, or numbers sorted by remainder), and invariants by colouring (domino tilings of a board with squares removed). `TacticsSpec = { topic: symmetry | pigeonhole | tiling; n; p; h; mode: "count" | "residues"; nums; rows; cols; removed }` (`:19`).

- `renderSymmetry` (`:38-75`): n ≤ 16; row i has i blue squares and `n + 1 − i` orange ones; the pairs `1 + n, 2 + (n − 1), …` each `n + 1` listed (≤ 12 shown); header `1 + … + n = n(n+1)/2`.
- `renderPigeonhole` (`:79-129`): `count` mode (p ≤ 60 pigeons into h ≤ 12 holes round-robin, the fullest boxes green, `⌈p/h⌉`); `residues` mode (n is read from the `h` field, 2..10; ≤ 16 numbers in −9999..9999 sorted into `r = 0..n−1` by `((x mod n) + n) mod n`; the first box with two numbers gives `x − y` divisible by n (with the quotient), otherwise the `none` caption; and whenever there are ≤ n numbers an extra note that nothing is forced, `:98-103`).
- `renderTiling` (`:148-210`): board up to 10×10, removed squares as `a1 h8` (chess style, a1 bottom-left) or `1,1 8,8` (row, column from the top, 1-based; `parseCells`, `:133-146`); a square is black when `(r + c)` is odd; black/white counts; odd total or unequal colours → impossible; otherwise a perfect matching of white squares to black neighbours by augmenting paths (`tryAug`, `:165-175`, Kuhn's algorithm) draws the dominoes in blue or reports none.

`renderTactics` (`:212-221`) dispatches; `TACTICS_PRESETS` (`:224-243`) include the opposite-corners chessboard and a 3×4 board with a corner cut off.


## 9. The server

The server is ten TypeScript files under `server/`, run directly by Node (`node server/index.ts`, type stripping, no build step; the header asks for Node >= 23.6, the Docker image uses `node:24-alpine`, and `package.json` declares no `engines`) on top of `node:http` and `node:sqlite`. There is no framework: one `createServer` callback, hand-rolled routing on `path.split("/")`, prepared statements cached per connection, and a single SQLite file `DATA_DIR/boards.db`. Everything is synchronous except body reading, so no two handlers ever interleave inside a database transaction. The files split into the board side (`index.ts`, `http.ts`, `db.ts`, `limiter.ts`, `backup.ts`) and the study side (`research.ts`, `protocol.ts`, `dashboard.ts`, `marking.ts`, `checker.ts`); the study side re-marks every answer with the browser's own checker and keeps a learner model in memory that is replayed from the `attempts` table.

### server/index.ts

Entry point: configuration, database open and migration, the boards API, static serving, the listener, and shutdown.

#### Configuration and database open (`server/index.ts:15-52`)

Four environment variables: `PORT` (8787), `DATA_DIR` (`data`, resolved to absolute), `STATIC_DIR` (`dist`), `APP_PASSWORD` (empty = no site password). `DATA_DIR` is created recursively, then `new DatabaseSync(join(DATA_DIR, "boards.db"))` opens (or creates) the one database (`server/index.ts:20-21`).

Four pragmas run before any table exists (`server/index.ts:22-28`): `journal_mode = WAL`; `synchronous = NORMAL` ("In WAL mode NORMAL is safe against crashes (a power cut can lose the last transactions, never corrupt the file) and syncs the disk far less often"); `busy_timeout = 5000` ("a backup (VACUUM INTO) or another process holding the file waits instead of failing at once"); `temp_store = MEMORY`.

The `boards` table (`server/index.ts:29-37`):

```sql
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, scene TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)
```

`scene` is the Excalidraw scene as JSON text; it is never parsed on the server, only validated on write and spliced back into responses verbatim (see `rawJson`). The `share_token TEXT` column is added when `PRAGMA table_info(boards)` lacks it, and a unique index `boards_share_token` is created on it (`server/index.ts:39-41`): "A board shared read-only has a token: the link /#/s/<token> shows it without the board's id (which would edit it)."

`initResearch(db)` (`server/index.ts:42`) creates and migrates the study tables (below). Then the schema version check (`server/index.ts:43-51`): `SCHEMA_VERSION = 5`; `PRAGMA user_version` is read, and if the file reports a higher number the process prints "The database in … is from a newer version of Zeno (schema N; this one knows 5). Update Zeno." and exits 1. Otherwise `user_version` is set to 5. The comment states the policy: "A database from a newer Zeno is refused rather than half understood; an older one has just been brought up to date by the CREATE / ADD COLUMN steps above." All migration is forward-only `CREATE TABLE IF NOT EXISTS` + conditional `ALTER TABLE ADD COLUMN`; `user_version` is a guard, not a migration selector. `tests/hardening.test.ts:112-126` pins: version written is 5, a file stamped 99 makes startup reject with `/newer version of Zeno/`.

`scheduleBackups(db, DATA_DIR, keep)` (`server/index.ts:52`) runs last; `keep` is `BACKUP_KEEP` or 7, and 0 switches backups off.

#### MIME, security headers, CSP (`server/index.ts:54-86`)

`MIME` maps nine extensions; anything else is served as `application/octet-stream`. `SECURITY_HEADERS` (`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: SAMEORIGIN`) go on every response, API and static alike (`server/index.ts:252`). `CSP` is sent only with `.html` files (`server/index.ts:242`). Its sources and the reasons recorded beside them: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` (Excalidraw's WebAssembly font subsetting); `style-src 'self' 'unsafe-inline'` (Excalidraw inline styles); `img-src 'self' data: blob:`; `font-src 'self' data: https://esm.sh` ("Fonts come from /fonts; Excalidraw always lists its CDN as a fallback source after it"); `connect-src 'self' data: blob: https://libraries.excalidraw.com` ("Libraries chosen on libraries.excalidraw.com … are fetched from there"); `worker-src 'self' blob:`; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'self'`.

#### `authorized(req): boolean` (`server/index.ts:89-97`)

Returns true when `APP_PASSWORD` is empty. Otherwise requires an `Authorization: Basic …` header, base64-decodes it, and takes everything after the first colon as the password (`split(":").slice(1).join(":")`, so passwords may contain colons; the username is ignored, "any username"). The comparison is `a.length === b.length && timingSafeEqual(a, b)`; the length test is required because `timingSafeEqual` throws on unequal lengths, and it leaks only the password's length.

#### `cleanTitle(value): string` (`server/index.ts:99-101`)

`String(value ?? "").trim().slice(0, 200) || "Untitled"`. Used on create and on update. `tests/server.test.ts:85-88` pins trimming and the fallback.

#### `handleApi(req, res, path, query)` (`server/index.ts:103-201`)

Routing is positional: `const [, , resource, id, sub, ...deeper] = path.split("/")` (`server/index.ts:104`). Order of checks:

1. `deeper.length` → 404 `not found`: "No route goes deeper than /api/resource/id/sub."
2. `RESEARCH_RESOURCES.has(resource)` (`classes`, `students`, `attempts`, `tests`, `research`) → `handleResearch(...)` with the raw `id`/`sub` and the `db` handle (`server/index.ts:107`).
3. `GET /api/shared/:token` (`server/index.ts:110-117`): selects `title, scene, updated_at` by `share_token`; 404 `no such shared board` if none. The ETag is `"<updatedAt>"`; if `If-None-Match` equals it the answer is `304` with the ETag and no body, else `200` built with `rawJson({ title, updatedAt }, { scene })` plus `ETag` and `Cache-Control: no-cache`. Reason: "Viewers ask every few seconds, so the answer carries the save time as its ETag, and a viewer that sends it back gets 304 and no scene until the next save." The id is deliberately absent from the body (`tests/sharing.test.ts:39-40`).
4. `/api/boards/:id/share` (`server/index.ts:119-132`): looks the board up first (404 `no such board`). `POST` reuses the existing token or makes `randomBytes(16).toString("base64url")` (22 characters), writes it, answers `201 { token }` when new or `200` when it already existed. `DELETE` nulls the column, `204`. Other methods 405.
5. Shape guard (`server/index.ts:134`): any remaining `sub`, or an `id` on a resource other than `boards`, is 404. This is what makes `/api/health/x`, `/api/export/x`, `/api/boards/x/extra` fall out as "not found" (pinned by `tests/api-docs.test.ts:69-81`, which sweeps `GET`/`POST`/`PUT`/`DELETE` over every documented and near-miss path shape and requires, for any combination not in `docs/api.md`, either `unrouted` — 405, or 404 with the body `not found` — or any other 404, so a 404 `no such class` also passes).
6. `GET /api/health` (`server/index.ts:135-138`): runs `SELECT 1` so a wedged database fails the probe, answers `{ ok: true }`. It is the only route exempt from the password (see the listener).
7. `GET /api/export` (`server/index.ts:140-148`): every board ordered by `created_at`; each row is `rawJson(meta, { scene })` and the rows are joined into a bracketed array string; the envelope `{ app: "zeno", exportedAt, boards }` is itself built with `rawJson` so no scene is parsed. `Content-Disposition: attachment; filename="zeno-boards-YYYY-MM-DD.json"`.
8. `resource !== "boards"` → 404.
9. Collection (`server/index.ts:151-164`): `GET` lists `id, title, createdAt, updatedAt` newest-updated first (no scenes). `POST` reads JSON, creates `{ id: randomUUID(), title: cleanTitle(body.title), createdAt: now, updatedAt: now }` with `scene = '{}'`, answers 201. Else 405.
10. `GET /api/boards/:id` (`server/index.ts:166-172`): `{ id, title, updatedAt, shareToken }` plus the raw `scene`; 404 if absent.
11. `PUT /api/boards/:id` (`server/index.ts:173-195`). Steps: read JSON; if `scene` is present it must be a non-null, non-array object whose `elements` is an array, else 400 `scene must be an object with an elements array` ("A scene that clients can't load would break the board for everyone"); fetch the current `updated_at` (404 if none); if `body.baseUpdatedAt` is a number and differs from the stored value → `409 { error: "conflict", updatedAt: <stored> }` ("A client that sends the updatedAt it last saw is refused if someone else saved since (another tab or device)"); compute `now = Math.max(Date.now(), last.updatedAt + 1)` ("Strictly increasing, so two saves in the same millisecond still differ"); `UPDATE … SET title = COALESCE(?, title), scene = COALESCE(?, scene), updated_at = ?` where an omitted field is passed as `NULL` so COALESCE keeps the old value, and a given scene is re-serialised with `JSON.stringify` (so the stored text is always canonical JSON the server itself wrote, which is what makes `rawJson` splicing safe on read); answer `200 { updatedAt: now, previous: last.updatedAt }` — or, should the UPDATE report zero changes, `404 not found` (`server/index.ts:194`; unreachable in practice, since nothing runs between the SELECT and the UPDATE). A save without `baseUpdatedAt` is an unconditional overwrite. `tests/server.test.ts:48-73` pins the 409, the `previous` echo, the unconditional path, and strict increase over five rapid saves.
12. `DELETE /api/boards/:id` → `DELETE FROM boards`, always 204 (idempotent). Else 405.

#### `isFile`, `fileCache`, `readCached` (`server/index.ts:203-218`)

`isFile(file)` is `statSync(file).isFile()` with exceptions swallowed to `false`. `fileCache: Map<path, { mtime, data: Buffer }>` holds every static file ever served, keyed by path, invalidated by modification time: `readCached` stats the file, and re-reads when `mtimeMs` differs ("a rebuild (new modification time) is picked up without a restart"). There is no eviction; the bound is the number of files in `dist`.

#### `serveStatic(req, res, path)` (`server/index.ts:220-249`)

`ASSET_DIRS` is `[STATIC_DIR/assets/, STATIC_DIR/fonts/]` with a trailing separator so prefix tests cannot match `assets-evil`. Steps:

- Methods other than `GET`/`HEAD` → 405.
- `file = normalize(join(STATIC_DIR, decodeURIComponent(path)))`; if `file` is neither `STATIC_DIR` itself nor under `STATIC_DIR + sep` → 403 (`server/index.ts:224-225`). Because the path is percent-decoded before joining, `/..%2fsecret.txt` becomes `../secret.txt` and is normalised out of the root; `tests/server.test.ts:119-125` pins three encodings. A malformed escape (`%E0`) makes `decodeURIComponent` throw `URIError`, which the listener's catch turns into a 500.
- If the path is not a file: a missing path under `assets/` or `fonts/` is 404 ("A chunk from before a rebuild is gone for good: a 404 tells the browser so (the page reloads), where the SPA fallback would hand it index.html as JavaScript"); anything else becomes `index.html` (SPA fallback).
- Encoding negotiation (`server/index.ts:233-234`): the first of `br`/`.br`, `gzip`/`.gz` whose name appears in `Accept-Encoding` and whose precompressed sibling exists on disk. The siblings are written at build time by `scripts/compress.mjs` (brotli 11 / gzip 9 for `.js/.css/.html/.svg/.json/.wasm/.txt` files of 1 KiB or more; smaller ones are skipped); the server never compresses at request time.
- Headers: `Content-Type` from the uncompressed file's extension, `Cache-Control: public, max-age=31536000, immutable` under the asset dirs (Vite hashes those names) and `no-cache` elsewhere (so `index.html` is revalidated), `Vary: Accept-Encoding`, the CSP for `.html`, `Content-Encoding` when a sibling was chosen. The body is `readCached(file + ext | file)`. A read failure (typically no `dist` at all) is `404 { error: "frontend not built — run `npm run build`" }`. For `HEAD`, Node's `ServerResponse` discards the body itself.

#### The listener: the request pipeline (`server/index.ts:251-282`)

Every request passes through this sequence:

1. Security headers are set on the response object before anything else (`server/index.ts:252`), so even 401/429/500 carry them.
2. `new URL(req.url ?? "/", "http://localhost")` yields `pathname` and `searchParams`; the host is irrelevant.
3. Site password gate, skipped for `/api/health` ("The health check reveals nothing, so Docker can probe it without the password") and when `APP_PASSWORD` is unset (`server/index.ts:256-266`). The order inside the gate is: compute `client = clientOf(req)`; ask the shared `passwords` limiter for `retryAfter(client)` and, if non-zero, answer `429 { error: "too many wrong passwords; try again later" }` with `Retry-After` seconds **before checking the password at all** (so a locked-out client gains nothing even with the right password, `tests/hardening.test.ts:94-95`); then `authorized(req)`; on failure, `passwords.fail(client)` only if an `Authorization` header was present ("A browser's first request carries no password: only a wrong one counts"), and `401` with `WWW-Authenticate: Basic realm="Zeno"` and no body.
4. Dispatch: paths starting with `/api/` go to `handleApi`, everything else to `serveStatic`. Body parsing happens inside handlers (`readJson`), so it is after auth and rate limiting: an unauthenticated 25 MB upload is refused at the headers.
5. Error handling (`server/index.ts:270-279`): an `HttpError` is sent as `{ error: message }` with its status and extra headers, unless headers were already sent. A 413 additionally gets `Connection: close` and, once the response has finished, `req.destroy()`: "An oversized upload is not read to the end: answer, then close the connection so it isn't reused" (the unread remainder would otherwise be parsed as the next request on a keep-alive socket). Any other exception is logged with `console.error` and answered `500 { error: "internal error" }`.

The listener binds `PORT` on all interfaces (`BIND_ADDRESS`, which `scripts/dry-run-study.ts:47` sets, is not read here). `keepAliveTimeout = 65_000` and `headersTimeout = 66_000` (`server/index.ts:285-286`): "A reverse proxy keeps connections to us open between requests; Node's default (5 s) is shorter than a proxy's idle time, so now and then one would be closed just as the proxy reused it (a 502 for the client). Longer than Caddy's 60 s." `headersTimeout` must exceed `keepAliveTimeout` or Node races them.

#### Shutdown (`server/index.ts:289-300`)

`SIGTERM` and `SIGINT`: `server.close(done)` stops accepting and waits for in-flight requests; `done` runs `PRAGMA optimize`, `db.close()`, `process.exit(0)`. A 3 s `setTimeout(done).unref()` fallback covers a hung request ("Docker would kill the process after 10 s anyway").

### server/http.ts

Shared HTTP helpers.

- `MAX_BODY = 25 MiB` (`server/http.ts:4`): the ceiling for board saves.
- `class HttpError extends Error { status; headers }` (`server/http.ts:7-15`): "A refusal with a status and a message that is safe to show the client." Thrown anywhere under the listener; converted to a response there. `headers` carries `Retry-After` for 429.
- `send(res, status, body?, headers?)` (`server/http.ts:17-23`): no body → `writeHead(status, headers).end()`; otherwise `Content-Type: application/json` (overridable by `headers`) and `JSON.stringify(body)`.
- `sendJsonText(res, status, text, headers?)` (`server/http.ts:26-28`): same, for text that is already JSON (output of `rawJson`).
- `readJson(req, maxBody = MAX_BODY): Promise<any>` (`server/http.ts:32-50`). Content type must start with `application/json` else `415 expected application/json`: "JSON only: a cross-site <form> can't send this content type without the browser asking first" — this is the CSRF defence; there are no cookies or tokens. The body is consumed as an async iterator and the running size compared against `maxBody` on each chunk, throwing `413 body too large` as soon as it is exceeded (the rest is never read, hence the connection close in the listener). An empty body is `{}`. The parse must yield a plain object (not `null`, not an array) else `400 invalid JSON`. Each route then checks the fields it uses. `tests/server.test.ts:98-117` pins 400 for malformed JSON, arrays, bad scenes; 415 for `text/plain` and form-encoded; 413 for a 26 MiB scene; and that the board is unchanged afterwards.

### server/db.ts

- `stmt(db, sql): StatementSync` (`server/db.ts:4-13`): a `WeakMap<DatabaseSync, Map<sql, StatementSync>>` so each distinct SQL string is prepared once per connection and reused. The safety argument is in the comment: "Every call is synchronous, so a statement is never in use twice at once." Because the key is the SQL text, `forClass` in research.ts deliberately produces two distinct strings (with and without `WHERE`) so both get their own plan.
- `transaction(db, fn)` (`server/db.ts:16-26`): `BEGIN`, run `fn`, `COMMIT`; on throw `ROLLBACK` and rethrow. Used for student join and the class-phase backfill.
- `rawJson(parts, raw)` (`server/db.ts:29-33`): builds a JSON object string where `parts` values are `JSON.stringify`'d (undefined values dropped) and `raw` values are inserted verbatim. "Sends JSON that already holds a serialised piece (a board's scene) without parsing and re-serialising it." Correctness depends on every stored scene being valid JSON, which the PUT path guarantees by `JSON.stringify`ing what it accepted and by the `'{}'` default.

### server/limiter.ts

Brute-force protection shared by the site password and the teacher password. "Only wrong passwords count; a request that sends none (a browser's first visit) doesn't."

#### `class FailureLimiter` (`server/limiter.ts:6-36`)

State: `failures: Map<string, number[]>` (client key → timestamps of wrong passwords). Constructor defaults: `max = 10` wrong passwords per `windowMs = 10 min`, at most `keys = 10_000` remembered clients.

- `recent(key, now)` (private): filters the client's timestamps to those within the window, writes the pruned list back (or deletes the key when empty), returns it.
- `retryAfter(key, now = Date.now()): number`: if at least `max` recent failures, the wait is until the `max`-th most recent one leaves the window: `ceil((ts[len - max] + windowMs - now) / 1000)`, floored at 1 second; otherwise 0. `tests/hardening.test.ts:17-25` pins the arithmetic (three failures at 0, 1, 2 s with max 3 and a 60 s window → 58 s at t=2 s, 1 s at t=59 s, 0 at t=60.001 s).
- `fail(key, now)`: appends `now`, then deletes and re-inserts the key so that `Map` insertion order becomes recency order ("re-inserted last, so the oldest client is first to go when the map is full"), then evicts from the front while `size > keys`. This bounds memory under an attacker rotating source addresses.

#### `clientKey(req, trustProxy)` and module state (`server/limiter.ts:42-53`)

With `trustProxy`, the client is the **last** entry of `X-Forwarded-For`: "every connection comes from the proxy, so the client is the last address in X-Forwarded-For: the one the proxy added itself, which a client can't forge" (a client-supplied `6.6.6.6, …` prefix is ignored, `tests/hardening.test.ts:37,97`). Otherwise `req.socket.remoteAddress`. `TRUST_PROXY` is true for `1`/`true`/`yes`. `passwords` is the one `FailureLimiter` instance, sized by `PASSWORD_ATTEMPTS` (10) and `PASSWORD_WINDOW_MINUTES` (10): "wrong site and teacher passwords count together, per client." `clientOf(req)` binds the env flag.

### server/backup.ts

Daily snapshots into `DATA_DIR/backups`, "a consistent snapshot (VACUUM INTO, safe while the server runs), the newest BACKUP_KEEP kept. They live on the same disk as the database, so they guard against a bad change or a damaged file, not a lost disk."

- `NAME = /^boards-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.db$/` (`server/backup.ts:9`); the stamp is ISO-8601 to the second with colons replaced by dashes, so lexicographic order is chronological.
- `backups(dir): string[]` (`server/backup.ts:12-18`): matching names sorted ascending (oldest first); a missing directory gives `[]`.
- `backupDue(dir, now)` (`server/backup.ts:21-24`): true when there is no backup or the newest's `mtimeMs <= now - DAY`. Modification time, not the name, is the clock (so `utimes` in the test moves it).
- `backup(db, dir, keep, now): string` (`server/backup.ts:27-36`): `mkdirSync`, compute the file name, `rmSync(file, { force: true })` because "VACUUM INTO won't write over a file", `db.exec("VACUUM INTO '<path>'")` with single quotes doubled, then delete all but the newest `keep` names. Returns the new path. `VACUUM INTO` reads a consistent snapshot under WAL without blocking writers; `busy_timeout` set in index.ts covers the reverse case.
- `scheduleBackups(db, dataDir, keep)` (`server/backup.ts:39-51`): `keep <= 0` returns (off). Otherwise `run` once synchronously at startup and every hour via an unref'd `setInterval` (it never keeps the process alive). Each `run` backs up only when `backupDue(dir)`, logging `backup: <path>`; it catches and logs failures ("backup failed:") so a full disk never crashes the server. `tests/hardening.test.ts:41-64` pins: nine daily backups with keep 7 leave the newest seven; a backup opens read-only and holds the data; a backup made now is not due until a day later. `tests/hardening.test.ts:112-126` pins that a first backup exists after a cold start and that `BACKUP_KEEP=0` writes none.

### server/research.ts

The study API: classes, students randomised to a condition, one `attempts` row per practice question, exports, and the in-memory learner model. "No names or emails are kept: a student is a code they write down. Exports name students by a number ("s17") instead, so a published data set can't be used to sign in."

#### Constants and codes (`server/research.ts:19-48`)

`TEACHER_PASSWORD` (empty = teacher routes open). `MAX_ATTEMPT_BODY = 64 KiB` ("An attempt is a few hundred bytes; nothing legitimate comes near this"). `RESEARCH_RESOURCES = {classes, students, attempts, tests, research}` is what index.ts dispatches on. `CONDITIONS = ["adaptive", "fixed"]`; `BLOCK = ["adaptive", "adaptive", "fixed", "fixed"]` ("Each block hands out every condition twice in a random order, so a class never drifts more than 2 apart"). `OUTCOMES = solved | revealed | skipped`; `POLICIES = adaptive | fixed | free | review` ("Who chose the question: the student's condition (class practice), the student (free practice), or the review of misses"); `VERDICTS = correct | close | wrong | form` ("form (right idea, wrong form: sent back, not counted)"). `MAX_ANSWERS = 50`, `MAX_INPUT = 200`, `DAY`.

`ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"` omits 0/O and 1/I/L: "codes are read off paper and typed in by children." `randomCode(n)` draws with `crypto.randomInt`. Student codes are 8 characters, class codes 6. `normalizeCode(value)` (`server/research.ts:45-48`) upper-cases, strips every non-alphanumeric, and re-inserts the dash only when the result is exactly 8 characters (`XXXX-XXXX`); a 6-character class code stays bare. All lookups by code go through it, so students type codes in any case with or without the dash (`tests/research.test.ts:130-138, 221-223`).

#### `initResearch(db)` (`server/research.ts:50-110`)

`PRAGMA foreign_keys = ON` (per connection; needed for the cascades). Tables:

```sql
classes  (code TEXT PK, name TEXT, block TEXT DEFAULT '[]', created_at INTEGER)
         + skills TEXT, phase TEXT DEFAULT 'open', session_ends INTEGER, test_length INTEGER DEFAULT 12   -- added columns
students (id INTEGER PK AUTOINCREMENT, code TEXT UNIQUE, class_code → classes(code), condition TEXT, created_at)
         + test_order TEXT
attempts (id PK AUTOINCREMENT, client_id TEXT UNIQUE, student_id → students(id) ON DELETE CASCADE,
          skill, level, seed, review, outcome, first_correct, wrongs, retries, solution_viewed,
          ms_first (nullable), ms_total, answers TEXT (JSON), shown_at, created_at)
         + policy TEXT DEFAULT 'free', predicted REAL, remarked INTEGER DEFAULT 0, late INTEGER DEFAULT 0
INDEX attempts_student (student_id, id); INDEX students_class (class_code, condition)
```

`block` is "the conditions still to hand out from the current randomisation block (JSON array)". `client_id` is "made by the client, so a retried upload isn't stored twice". The summary columns (`first_correct … ms_total`) are "worked out from answers when the row is stored", never trusted from the client.

Column additions use the same `add(table, column, type)` helper pattern as protocol.ts (`PRAGMA table_info` then `ALTER TABLE`). One data migration follows `skills` (`server/research.ts:99-101`): classes with `skills IS NULL` get the explicit list `inCurriculumOrder(AREAS.flatMap(a => FIRST_SKILLS[a]))`, the skill set that existed when "no list" meant "every skill": "Skills added since mustn't join a class that has started (its tests are spread over its skills), so those classes keep the list they had; new ones store it." `tests/research.test.ts:289-318` builds a pre-migration database by hand and pins 38 skills without `inequalities`, old attempts counted as `free`, and the CSV row `1,s1,OLDOLD,fixed,free,,`. Finally `initProtocol(db)`.

#### `parseSkills(value): SkillId[] | null` and `classSkills` (`server/research.ts:112-124`)

`undefined`/`null` → `null` (caller substitutes the full `CURRICULUM`). Otherwise a non-empty array of skill ids or area names (an area expands to all `SKILLS[area]`), unknown entries → 400 `unknown skill or area: …` (truncated to 40 chars), empty → 400. The set is returned in curriculum order, so `["average", "algebra", "linear"]` yields the 13 algebra skills plus `average` starting `average, linear, inequalities, expand` (`tests/research.test.ts:232-243`). `classSkills(json)` parses the stored column, falling back to `CURRICULUM` for `null`.

#### The model cache: `currentModel(db)` and `forgetModel` (`server/research.ts:126-145`)

`models: WeakMap<DatabaseSync, { model: EloModel; lastId: number }>`. `currentModel` creates the entry on first use (`lastId = 0`), then selects `id, student_id, skill, level, outcome, first_correct, json_array_length(answers) - retries AS counted FROM attempts WHERE id > ? ORDER BY id` and feeds each row through `evidence(counted, outcome, first_correct === 1)` (`src/model/evaluate.ts:503-506`: a counted answer exists → `firstCorrect`; none and `revealed` → `false`; none otherwise → `null`, "the student had the right idea and never got as far as a counted answer"). Non-null evidence becomes `model.update({ student: "s<id>", skill, level, correct })`; `lastId` advances to the row id. The comment ties this to the export: "Counted answers are those not sent back for their form, as the export reads them (evaluate.ts, observation)" — `observation()` in evaluate.ts computes the same `n_answers - retries`, so replaying `attempts.csv` offline reproduces the server's model exactly (`tests/research.test.ts:201-219`).

Invariants: the model is a pure function of the `attempts` table in id order; it is refreshed lazily on each read (`plan`, `dashboard`) rather than on write, which is correct because `attempts.id` is monotonic and the writes are synchronous; it never sees `test_responses` (protocol.ts header comment). It cannot be decremented, so `forgetModel(db)` drops the cache entry after a student deletion ("Deleted answers can't be taken out of the ratings one by one: the next request replays what is left"), and the next read rebuilds from `id > 0`. `tests/research.test.ts:279-286` pins that a deleted student's answers leave the skill's count.

#### `teacher(req)` (`server/research.ts:147-159`)

No-op when `TEACHER_PASSWORD` is empty. Otherwise the same limiter dance as the site password: `passwords.retryAfter(client)` → `HttpError(429, …, { Retry-After })`; the `X-Teacher-Password` header compared by length and `timingSafeEqual`; on mismatch `passwords.fail(client)` only if something was sent, then `HttpError(403, "teacher password required")`. A missing header is 403 without counting against the client. Teacher and site failures share one counter per client (`tests/hardening.test.ts:100-106`).

#### `shuffled`, `isInt`, `oneOf` (`server/research.ts:161-171`)

Fisher–Yates with `crypto.randomInt`; integer range check; membership check typed as a guard.

#### Types `Answer`, `AttemptRow` (`server/research.ts:173-193`)

`Answer = { input; verdict; ms; client? }` where `client` is "the browser's as client where it differed". `AttemptRow` is the validated, summarised upload.

#### `parseAttempt(body): AttemptRow` (`server/research.ts:196-221`)

Every field is checked, each failure `400 invalid <field>`: `clientId` matches `/^[A-Za-z0-9-]{8,64}$/`; `skill ∈ ALL_SKILLS`; `level` 1–3; `seed` 0–2³¹; `review` boolean; `outcome ∈ OUTCOMES`; `policy ∈ POLICIES` (default `free`) with `(policy === "review") === review` so a review is always flagged as one and vice versa; `predicted` null or in [0, 1]; `solutionViewed` boolean; `msTotal` 0–1 day; `shownAt` a non-negative safe integer; `answers` an array of at most 50 `{ input: string, verdict ∈ VERDICTS, ms 0–1 day }` with inputs truncated to 200 characters. Then the consistency rules (`server/research.ts:215-219`): "solved ends on a correct one; nothing follows a correct one; a skip had a try" — a `correct` verdict must be the last answer, `outcome === "solved"` iff one exists, `skipped` needs at least one answer (`revealed` with none is fine). The result spreads `summary(list)` and sets `msFirst` to the first answer's `ms` of any verdict (including a form message), `null` when there are none.

#### `summary(list)` (`server/research.ts:224-227`)

`counted = answers with verdict !== "form"`; `firstCorrect = counted[0]?.verdict === "correct"`; `wrongs = counted that are not correct` (so `close` counts as wrong); `retries = number of form answers`. "A form message doesn't count as a try": `[form, correct]` is right first time (`tests/research.test.ts:224-228`).

#### `markAttempt(a): AttemptRow & { remarked }` (`server/research.ts:234-240`)

Each answer is re-marked with `mark({ skill, level, seed }, input)`; where the server's verdict differs the answer becomes `{ ...x, verdict: server, client: browser }`; the summary is recomputed from the server's verdicts; `remarked` counts the replaced ones. "What the student did (the outcome) is the browser's account and stays as sent." Consequence: parseAttempt's consistency rules were checked against the browser's verdicts, so a remarked row can be `outcome = solved` with `first_correct = 0, wrongs = 1, remarked = 1` (`tests/research.test.ts:468-482`), and the model learns from the server's verdict ("the claimed right answer counts as a miss").

#### CSV helpers (`server/research.ts:242-261`)

`csvCell` quotes a value containing `"`, `,`, CR or LF and doubles inner quotes; null/undefined → empty. `CSV_COLUMNS` (24 columns, `attempt … created_at`) and `TEST_CSV_COLUMNS` (20) fix the export order. `sendCsv(res, name, columns, rows)` writes `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="zeno-<name>-<date>.csv"`, header line first, LF-separated, trailing newline.

#### `handleResearch(req, res, resource, id, sub, query, db)` (`server/research.ts:263-443`)

Two local helpers: `findStudent(code)` selects `id, code, class_code, condition, test_order` by `normalizeCode(code)`; `forClass(klass, sql)` substitutes `{where}` with `WHERE s.class_code = ?` or nothing, producing two distinct prepared statements: "An export of one class or of all of them: two statements, so the one for a class goes by the students_class index (a "? IS NULL OR class_code = ?" condition would make SQLite scan every row either way)."

Routes, in the order tested:

- `POST /api/classes/:code/phase` → `teacher`, then `setPhase(req, res, db, normalizeCode(decodeURIComponent(id)))` (`server/research.ts:276-279`).
- `/api/classes` without id (`server/research.ts:281-309`), teacher only. `GET`: one query with four correlated subqueries (students, adaptive, fixed, attempts counts) plus `phase, session_ends, test_length`, ordered by `created_at` — "Each count goes by the students_class index (and from there attempts_student), so no table is scanned"; `skills` parsed per row. `POST`: body ≤ 64 KiB; `name` trimmed, ≤ 100, default `Class`; `parseSkills`; `parseTestLength`; a 6-character code drawn until unused; `skills` stored as JSON (`CURRICULUM` when none given); `logPhase(db, code, "open", null, now)` records the first phase; `201 { code, name, skills, createdAt, phase: "open", sessionEnds: null, testLength }`. Other methods 405.
- `/api/students` (`server/research.ts:311-368`). `POST` without id joins a class: everything inside `transaction` — look the class up (none → the callback returns `null`, the empty transaction commits, and the answer is 404 `no such class`), parse `block`, refill with `shuffled(BLOCK)` when empty, `shift()` the next condition, draw an unused 8-character code and normalise it to `XXXX-XXXX`, write the shrunken block back, insert the student with `nextTestOrder(db, class, condition)`; `201 { code, class, condition }`. "One transaction: the condition leaves the block and the student is stored together, or neither is. (node:sqlite is synchronous, so nothing else runs in between anyway.)" The block invariant — every four consecutive joins contain exactly two of each condition — is pinned by `tests/research.test.ts:109-128`. Any other method without id → 405. With an id: `findStudent(decodeURIComponent(id))` → 404 `no such student`. `GET …/plan` (`server/research.ts:338-355`) returns what "the student's browser needs to choose questions": `class`, `condition`, `skills` (the class's list), `position` = count of this student's attempts with `policy = 'fixed'` (where they are in the fixed sequence), `recent` = the last `RECENT` (3) skills attempted, oldest first, `state` = `currentModel(db).state(["s<id>"])` with the student's own ratings re-keyed to `me` and everyone's skill/level difficulties left in ("the class-wide difficulties and their own ratings, under "me""), the `classProtocol` fields (`phase, sessionEnds, testLength`), and `tests` from `studentTests`. Any other `sub` → 404. `GET` without sub → `{ code, class, condition, answered }`. `DELETE` → `DELETE FROM students WHERE id = ?` (cascading to `attempts` and `test_responses`), `forgetModel(db)`, 204: "Knowing the code is enough to wipe the record: it is all that ties the answers to the student." Else 405.
- `POST /api/tests` → `recordTestAnswer(req, res, db, findStudent)` (`server/research.ts:370`).
- `POST /api/attempts` (`server/research.ts:372-394`): other methods 405; body ≤ 64 KiB; student by `body.student` (404); `a = markAttempt(parseAttempt(body))`; `classPractice = policy is adaptive or fixed`, and such a policy must equal the student's condition else 400 `invalid policy` ("Class practice is chosen by the student's own condition; anything else would mix the groups up", `tests/research.test.ts:257-260`); `late = classPractice && !onTime(phaseWindows(db, class), PRACTICE_PHASES, now)` — free practice and review are never late; `INSERT OR IGNORE` of the twenty columns keyed by the unique `client_id`; `201 { stored: true }` on insert, `200 { stored: false }` on a repeat: "200 for a repeat of one already stored: the client can drop it from its outbox either way."
- `GET /api/research/dashboard?class=CODE` (`server/research.ts:397-401`): teacher; `dashboard(db, normalizeCode(class))`, 404 `no such class` when null.
- `GET /api/research/attempts.csv[?class=CODE]` (`server/research.ts:404-420`): teacher; the join of `attempts` and `students` with `'s' || s.id AS student` (never the code), `n_answers = json_array_length(answers)`, ordered by `a.id`; `area` added from `areaOf(skill)`, `shown_at`/`created_at` as ISO strings. `tests/research.test.ts:151-169` pins that the sign-in code does not appear anywhere in the file.
- `GET /api/research/tests.csv[?class=CODE]` (`server/research.ts:424-440`): teacher; `test_responses` joined to students with `test_order` (empty string for null), `correct = verdict = 'correct'`, `client_verdict`, `late`; ordered `s.id, t.phase DESC, t.item` (`'pre' > 'post'` lexically, so pre comes first); as in `attempts.csv`, `area` is added from `areaOf(skill)` and `created_at` becomes an ISO string; `input` is `JSON.stringify`'d: "What was typed is a JSON string, so a spreadsheet never reads an answer like "=1+2" as a formula."
- Anything else → 404 `not found` (this is also where `GET /api/classes/:code`, `/api/attempts/:id`, `/api/tests/:id`, `/api/research/other` land).

### server/protocol.ts

Phases, timed sessions, counterbalanced pre/post tests, and the phase log that decides lateness. The header comment states the design: test answers are "stored once per student, test and question, with what was typed and how the server marked it; nothing is shown to the student, and the learner model never sees it, so the outcome measure stays apart from what the adaptive condition learns from." And on timing: "The browser waits for the phase too, but it hears of a change only every 30 s and keeps answers while the Wi-Fi is down, so the server judges by when an answer arrives: a test that hasn't started is refused, and an answer that arrives more than GRACE after its phase ended is stored but marked late."

#### Constants (`server/protocol.ts:22-29`)

`PHASES = open | pretest | session | posttest | closed`: "open: class practice any time (no timer); pretest / posttest: the test, for students who haven't finished it; session: class practice until sessionEnds, the same window for everyone; closed: no class practice." `TEST_VERDICTS = correct | close | wrong | skipped` ("Form messages ("lowest terms") are retried, not stored"). `MAX_SESSION_MINUTES = 240`. `GRACE = 5 min`: "the 30 s poll, and a question finished as time runs out."

#### `initProtocol(db)` (`server/protocol.ts:31-89`)

Adds `classes.phase` (default `open`), `classes.session_ends`, `classes.test_length` (default `DEFAULT_TEST_LENGTH` = 12), `students.test_order` ("AB: form A for the pre-test and B for the post-test; BA the other way round (NULL for students from before tests)"). Creates:

```sql
test_responses (id PK, client_id UNIQUE, student_id → students ON DELETE CASCADE, phase, form, item, skill, level, seed,
                input, verdict, retries, ms, created_at, UNIQUE (student_id, phase, item))
               + client_verdict TEXT, late INTEGER DEFAULT 0
class_phases   (id PK, class_code → classes, phase, session_ends, started_at); INDEX (class_code, id)
```

Two uniqueness keys on `test_responses`: `client_id` (retried upload) and `(student_id, phase, item)` (one answer per question, whichever tab). Then the backfill (`server/protocol.ts:73-88`): for every class with no `class_phases` rows, inside one transaction, log `open` at `created_at`, each test phase at the time of its first stored answer (`MIN(created_at)` grouped by phase), and the class's current phase at `now`. "So an answer still waiting in a browser for a test that ran before this update is kept (late, if its test has since ended), not refused." `tests/research.test.ts:526-541` pins the reconstructed windows.

#### `logPhase`, `phaseWindows`, `onTime`, `PRACTICE_PHASES` (`server/protocol.ts:92-110`)

`logPhase(db, code, phase, sessionEnds, at)` inserts one row. `phaseWindows(db, code): PhaseWindow[]` reads the log ordered by `started_at, id` and gives each row `end = min(next row's start, sessionEnds if phase is session and set, else ∞)`, so a session ends at its timer even if the teacher never moved on, and the last phase runs to infinity. `onTime(windows, phases, at)` is true when some window of one of the given phases has `start <= at < end + GRACE`. `PRACTICE_PHASES = [open, session]`. Pinned by `tests/research.test.ts:506-525`: open 0–10 min, session 10–30 (timer), posttest 60–∞; on time at 20 min and at 30 min + GRACE − 1, late at 30 min + GRACE.

#### Counterbalancing: `nextTestOrder`, `testOrderOf` (`server/protocol.ts:113-118`)

`nextTestOrder(db, class, condition)` counts existing students in that class and condition: even → `AB`, odd → `BA`, so within each condition students alternate which form they take first (`tests/research.test.ts:381-386`). `testOrderOf(student)` returns the stored order or, for pre-test-era rows with `NULL`, derives one from id parity.

#### `classProtocol`, `parseTestLength`, `studentTests` (`server/protocol.ts:120-137`)

`classProtocol` reads `{ phase, sessionEnds, testLength }`. `parseTestLength` defaults to 12 and accepts integers 4–30, else 400 with the range in the message. `studentTests` returns, per test phase, `{ form: formFor(order, phase), answered: [item…] }` from the student's stored responses.

#### `setPhase(req, res, db, classCode)` (`server/protocol.ts:142-157`)

Body ≤ 64 KiB; `phase ∈ PHASES` else 400; a `session` needs integer `minutes` 1–240 and sets `sessionEnds = now + minutes·60 s`; `UPDATE classes SET phase, session_ends` (0 changes → 404 `no such class`; note the body is validated first, so a bad body on a missing class is 400); `logPhase(..., Date.now())`; `200 { phase, sessionEnds }`.

#### `recordTestAnswer(req, res, db, findStudent)` (`server/protocol.ts:164-197`)

"Which question it was (skill, level, seed) is worked out here from the class code, the student's form and the question's number, so a client can't answer a question that wasn't on its test; the server marks what was typed itself." Steps: body ≤ 64 KiB; student (404); `clientId` pattern; `phase ∈ {pre, post}`; `item` an integer in `[0, testLength)` (class's `test_length`); `input` string; `verdict ∈ TEST_VERDICTS`; `retries` 0–50; `ms` 0–1 day. Timing: `windows = phaseWindows(class)`; the matching `pretest`/`posttest` window must exist with `start <= now`, else 400 `the pre-test hasn't started` / `the post-test hasn't started` (`tests/research.test.ts:401-402`); `late = !onTime(windows, [testPhase], now)`. The question is `testItems(class, skills, formFor(testOrderOf(student), phase), testLength)[item]` — `testItems` (`src/model/testForms.ts:35-42`) is deterministic in `(classCode, form, index)`, so the same class always gets the same forms and A/B share skills and levels with different seeds (`tests/protocol.test.ts:13-21`). `typed = input.slice(0, 200)`; `marked = verdict === "skipped" ? "skipped" : mark(q, typed)` ("A pass stays a pass; anything typed is marked here. A "form" verdict means the browser should have sent it back"). `INSERT OR IGNORE` with `client_verdict = marked === verdict ? null : verdict` and `late`; `201 { stored: true }` or `200 { stored: false }` ("a retried upload, or a second try from another tab) keeps the first"). The test at `tests/research.test.ts:407-411` sends `=1+2` claimed correct and pins the stored verdict `form`, `client_verdict` `correct`, and that a second answer to the same item is 200/`stored: false`.

#### `testScores(db, classCode)` (`server/protocol.ts:201-207`)

Per `(student_id, phase)`: `form`, `answered = COUNT(*)`, `correct = SUM(verdict = 'correct')`. Skips are rows, so they count as answered.

### server/dashboard.ts

One function assembling the teacher's view of a class from the database and the live model: "each student's mastery of each skill (from the learner model), the two conditions side by side, the pre- and post-test, and how well the model's logged predictions matched what students then did."

#### Helpers (`server/dashboard.ts:14-33`)

`AttemptRow` is the projected join row (`counted = json_array_length(answers) - retries`). `share(bools)` is the fraction true or `null` when empty; `mean`, `sd` (sample, `n − 1`, `null` below two), `describe = { n, mean, sd }`, `median`. `verdict(a) = evidence(a.counted, a.outcome, a.first_correct === 1)`: "Right first time, wrong, or nothing to say, by the rule the model learns by."

#### `dashboard(db, classCode)` (`server/dashboard.ts:35-136`)

1. Class row (`null` if none → 404 upstream); `skills` from its column or `CURRICULUM`.
2. Students of the class ordered by id; all their attempts joined with condition, ordered by `a.id`.
3. `model = currentModel(db)` (replays anything new), `protocol = classProtocol(...)`.
4. Test scores: `scores: Map<studentId, { pre?, post? }>` with `score = correct / testLength`; `complete(t) = answered >= testLength` ("A test counts once every question on it has an answer (passing over a question is an answer)").
5. Attempts bucketed by student.
6. Per-student rows (`server/dashboard.ts:64-85`): `id: "s<n>"`, `code` (the sign-in code is shown here, unlike the exports, because the teacher needs to hand it back to a child), `condition`, `answered`, `practiceMinutes` = sum of `ms_total` over attempts whose `policy` equals the student's condition, in minutes ("what timed sessions keep equal"), `pre`/`post` with `complete`, `rightFirst = share(non-null verdicts)`, `lastAt`, and `mastery` for each class skill as `{ p: [P(level 1), P(level 2), P(level 3)], n }` from `model.mastery("s<id>", skill)`.
7. `group(condition)` (`server/dashboard.ts:87-109`): over that condition's attempts (`mine`) and the subset class practice chose (`chosen`, `policy === condition`): student count, `answered`, `classPractice`, `rightFirst`, `predicted` (mean of logged `predicted` over `chosen`), `offTarget` (mean `|predicted − TARGET|`, `TARGET = 0.75` from `src/model/policy.ts:19`: "how far that was from the target"), `medianSeconds`, `solutionViewed`, `skipped`, mean `practiceMinutes`, and `pre`/`post`/`gain` as `describe` over completed tests, the gain only for students who completed both.
8. Cohen's d of the gain, adaptive minus fixed, with the pooled SD, `null` unless both groups have n ≥ 2 and the result is finite ("a first look; the planned analysis is `npm run analyse`"). `forms.A`/`forms.B`: pre-test score distributions by form ("The forms should be equally hard: compare them on the pre-test, before any practice could make a difference").
9. `predictions`: every attempt with a non-null logged `predicted` and non-null verdict, as `{ p, correct }` ("The predictions logged when each question appeared, against what the student then did: no hindsight involved"); `calibration = { n, logLoss, auc, bins }` from `src/model/evaluate.ts`.

Return shape: `{ class: { code, name, skills, createdAt, phase, sessionEnds, testLength }, students, conditions: { adaptive, fixed }, tests: { effect, forms }, calibration }`; `Dashboard` is its type. `tests/research.test.ts:320-359` pins the arithmetic (four students, 0.7/0.4 predictions → `calibration.n = 8`, `auc = 1`, bins `[4, 0], [4, 1]`, `offTarget ≈ 0.05`, median of 4 s and 41 s).

### server/marking.ts

The bridge to the checker, and the one place the server's module graph depends on how it was deployed.

```ts
const bundled = process.env.ZENO_CHECKER;
if (!bundled) register("../scripts/ts-resolve.mjs", import.meta.url);
const checker = (await import(bundled ?? "./checker.ts")) as typeof Checker;
export const mark = checker.mark;
```

(`server/marking.ts:11-16`.) Two deployments:

- Source (dev, tests, `npm start` from a checkout): `ZENO_CHECKER` is unset. `checker.ts` imports `src/math/practice.ts`, `src/learner.ts`, `src/locales/en.ts`, which use Vite-style extensionless relative imports that Node cannot resolve. So the resolve hook `scripts/ts-resolve.mjs` is registered first (it retries a failing relative, extensionless specifier with `.ts` appended) — "the same resolve hook as the tests' is registered first" (`scripts/ts-register.mjs` registers the identical hook for `npm test`). The hook path is resolved relative to `marking.ts` via `import.meta.url`. Then `./checker.ts` is imported dynamically; a dynamic import is required because static imports are resolved before any module body runs, i.e. before `register` could take effect.
- Bundle (Docker): the `Dockerfile` sets `ZENO_CHECKER=/app/dist-server/checker.js` and runs `npm run build:checker` (`vite build -c vite.checker.config.ts`: SSR build of `server/checker.ts` with `noExternal: true`, target `node24`, into `dist-server/`). The image copies only `dist`, `dist-server`, `server`, `src/math/practiceSkills.ts` and `src/model` — no `node_modules`, no `src/math/practice.ts` — so mathjs and MathJax reach the server only inside that bundle. "The Docker image has no node_modules, so the build bundles this file with them."

The `await` is top-level, so loading `research.ts` (and therefore `index.ts`) blocks until the checker, mathjs and MathJax are evaluated; the "listening" line the tests wait for appears only after that. `Question` is re-exported as a type.

### server/checker.ts

```ts
export type Question = { skill: SkillId; level: number; seed: number };
export function mark(q: Question, input: string): AnswerVerdict {
  const ex = exercise(q.skill, q.level as Level, q.seed, en.pracWords);
  return verdictOf(check(ex, input, en.pracWords));
}
```

(`server/checker.ts:10-16`.) `exercise` regenerates the exact question from `(skill, level, seed)` — "a question is fixed by its skill, level and seed, so the browser's verdict is a claim the server can check" (`server/marking.ts:1-4`); `check` is the browser's checker; `verdictOf` (`src/learner.ts:65`) collapses its result to `correct` (`ok`), `form` (`why` set: right idea, wrong form), `close`, or `wrong`. English words are used throughout: "The verdict doesn't depend on the interface language, so the server marks in English." This is why both `markAttempt` and `recordTestAnswer` can replace the client's verdict and keep the client's beside it: "The two agree unless the browser's code differs from the server's (a page left open across an update, or a modified client); where they differ, the browser's verdict is kept beside the server's so the disagreement shows in the exports."


## 10. Build, tooling, scripts, tests, end-to-end tests, CI and deployment

The repository is an ESM package (`"type": "module"`, `package.json:7`) on Node 24, React 19, Vite 8 and TypeScript 5.9 (`package.json:31-54`). There is no transpile step for the server, the scripts or the tests: Node runs the `.ts` files directly with its built-in type stripping. Only the browser bundle (Vite) and the server's answer checker (a Vite SSR bundle for the Docker image) are built. Every other mechanism described below exists to make that arrangement hold: a resolve hook for Vite-style extensionless imports, `tsconfig` flags that keep the code strippable, a Docker image that carries source files instead of `node_modules`.

#### Package manifest and the script table

`package.json:8-30` is the whole command surface:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `copy-assets.mjs && concurrently "vite" "node --watch server/index.ts"` | front end on 5173, API on 8787 |
| `build` | `copy-assets.mjs && vite build && compress.mjs` | `dist/` with `.br`/`.gz` twins |
| `start` | `node server/index.ts` | production server from source |
| `build:checker` | `vite build -c vite.checker.config.ts` | `dist-server/checker.js` |
| `typecheck` | `tsc --noEmit` | types only |
| `lint` | `eslint .` | |
| `test` | `node --import ./scripts/ts-register.mjs --test "tests/*.test.ts"` | unit + integration |
| `coverage` | the same with `--experimental-test-coverage` and thresholds | CI gate |
| `e2e` | `playwright test` | browser tests |
| `model`, `import-assistments`, `simulate`, `mastery`, `h1`, `analyse` | `node --disable-warning=ExperimentalWarning scripts/<x>.ts` | research scripts, no hook |
| `dry-run`, `checker-agreement`, `mistakes`, `figures` | the same with `--import ./scripts/ts-register.mjs` | research scripts that reach `src/math` |
| `thesis-pdf`, `talk-pdf` | `node --disable-warning=ExperimentalWarning scripts/thesis-pdf.ts` (`talk-pdf` adds `--talk`) | the thesis or the title-defense talk as a PDF |

Runtime dependencies are six (`package.json:31-38`): Excalidraw, `mathjax-full`, `mathjs`, React, ReactDOM, three. None of them is needed at runtime by the server once the checker is bundled; the server itself uses only `node:` builtins (`node:sqlite`, `node:http`, `node:zlib`).

The split between scripts that pass `--import ./scripts/ts-register.mjs` and those that do not is not arbitrary. `src/model/*.ts`, `src/math/practiceSkills.ts` and `src/math/distributions.ts` write every import with its `.ts` extension, so `scripts/evaluate-model.ts`, `simulate-study.ts`, `mastery.ts`, `h1.ts`, `analyse-study.ts` and `import-assistments.ts` run on bare Node (`thesis-pdf.ts` imports only `node:` modules). `src/math/practice.ts` and the rest of the browser-facing maths were written for Vite and import `"./chart"` without an extension; anything that reaches them (`dry-run-study.ts`, `checker-agreement.ts`, `mistakes.ts`, `thesis-figures.ts`, every test) needs the hook.

`--disable-warning=ExperimentalWarning` silences the warnings Node 24 prints for `node:sqlite` (used by `server/db.ts` and `tests/hardening.test.ts:6`) and for type stripping; the tests' spawned servers pass the same flag (`scripts/dry-run-study.ts:46`, `tests/research.test.ts:32`, `tests/server.test.ts:16`, `tests/hardening.test.ts:69`), otherwise the warning text would land in the stdout the test waits on.

#### `npm run dev`

`package.json:9`. Three things happen in order:

1. `node scripts/copy-assets.mjs` copies Excalidraw's font directory `node_modules/@excalidraw/excalidraw/dist/prod/fonts` to `public/fonts` (`scripts/copy-assets.mjs:6-15`) so the editor never fetches fonts from esm.sh. The copy is made only if `public/fonts` is absent (`:12`); a newer Excalidraw is not picked up until the directory is deleted. Then the `Xiaolai` family is removed (`:10, :16-21`): the hand-drawn font's CJK subsets, 209 files and 12.7 MB, more than the rest of the build. `public/asset-path.js` sets `window.EXCALIDRAW_ASSET_PATH = "/"` as a separate file rather than an inline script so the CSP can forbid inline code.
2. `concurrently -n web,api -c blue,green` runs two processes with prefixed, coloured output.
3. `vite` serves `src/` on port 5173 with `/api` proxied to `http://localhost:8787` (`vite.config.ts:9-12`); `node --watch server/index.ts` runs the server from TypeScript source and restarts it when any imported file changes. The server resolves Vite-style imports by registering the hook itself (`server/marking.ts:11-12`): `if (!bundled) register("../scripts/ts-resolve.mjs", import.meta.url)`, which is why `node server/index.ts` needs no `--import`.

`vite.config.ts:6-8` defines `process.env.IS_PREACT` as the string `"false"`; Excalidraw's bundle reads it and would otherwise leave a bare `process` reference in the browser. The same define is repeated in `vite.checker.config.ts:6` because MathJax/mathjs chains in `server/checker.ts` pull in the same shared code.

#### `npm run build`

`package.json:10`: `copy-assets.mjs`, then `vite build`, then `compress.mjs`.

Chunking is not configured in `vite.config.ts`; there is no `manualChunks`. The chunk graph comes from `React.lazy` boundaries: the four pages in `src/main.tsx:8-11` (`BoardPage`, `TeacherPage`, `SharedBoardPage`, `PracticePage`) and one dynamic `import()` per tool dialog in `src/tools.tsx:43-87`, thirty-three of them (formula, graph, model, 3d, matrix, geometry, analysis, statistics, integral, ode, trig, algo, nt, comb, gt, logic, complex, mental, tactics, algebra, coord, vectors, deriv, applied, inference, practice, powers, sequences, functions, identities, polynomials, euclid, numerical). Rollup hoists what several dialogs share (mathjs, MathJax, the chart helpers) into shared chunks. A build at the current commit puts 245 JavaScript files in `dist/assets`.

`scripts/compress.mjs` walks `dist` (or `argv[2]`, `:7`), and for every file matching `/\.(js|css|html|svg|json|wasm|txt)$/` (`:8`) of 1024 bytes or more (`:18`) writes `<file>.br` at Brotli quality 11 and `<file>.gz` at gzip level 9 next to it (`:19-21`), then prints the before/after total in MB (`:28`). The server pairs them with `Accept-Encoding` at request time (`server/index.ts:232-234`): it looks for `br` then `gzip`, checks the sibling file exists, sends it with `Content-Encoding` and `Vary: Accept-Encoding` (`:241-243`), and never compresses on the fly. `tests/server.test.ts:75` ("static files are sent compressed when the browser accepts it") fakes a `dist` with an `app.js.gz` written the same way (`:28-33`).

#### `build:checker`

`vite.checker.config.ts` builds one file for the Docker image, which has no `node_modules`. `build.ssr: "server/checker.ts"` (`:9`) makes a Node-targeted library build of that one entry; `ssr: { noExternal: true }` (`:7`) tells Vite to inline every dependency instead of leaving `import "mathjs"` for Node to resolve. `target: "node24"` (`:13`) lets esbuild keep modern syntax. `outDir: "dist-server"` with `emptyOutDir` and `copyPublicDir: false` (`:10-12`) keeps the fonts out. The result is `dist-server/checker.js`, about 2.8 MB, ESM because the package is `type: module`.

`server/checker.ts:1-16` is the entry: it imports the browser's own `exercise` and `check` from `src/math/practice.ts` and English words, and exports `mark(q, input)` which rebuilds the question from `(skill, level, seed)` and returns `verdictOf(check(...))`. `server/marking.ts:11-13` picks the source: `const bundled = process.env.ZENO_CHECKER; if (!bundled) register(hook); const checker = await import(bundled ?? "./checker.ts")`. The Docker image sets `ZENO_CHECKER=/app/dist-server/checker.js` (`Dockerfile:10`); everywhere else the source path is used and the hook handles its extensionless imports.

#### Running TypeScript on Node: `ts-register.mjs` and `ts-resolve.mjs`

Node 24 strips types from `.ts` files on load, but its ESM resolver is unchanged: a relative specifier must carry its extension. The `src/` tree was written for Vite, which allows `import { nf } from "./chart"`. `scripts/ts-register.mjs:5` calls `register("./ts-resolve.mjs", import.meta.url)` from `node:module`, installing a customization hook in Node's hooks thread. `scripts/ts-resolve.mjs:2-9` is the whole hook:

```js
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) {
    if (spec.startsWith(".") && !/\.\w+$/.test(spec)) return next(spec + ".ts", ctx);
    throw e;
  }
}
```

It tries the default resolver first, and only when that throws, only for relative specifiers (`./`, `../`) with no extension, retries with `.ts`. Package imports and anything already carrying an extension are untouched, so the hook cannot shadow a real file. It is registered by `--import` for tests and four scripts (`package.json:15, 23-26, 29`), and by `server/marking.ts:12` for the server when `ZENO_CHECKER` is unset.

Type stripping has a consequence the compiler options enforce: Node removes type syntax without type information, so `import { Foo }` of a type-only export would survive as a runtime import of a missing binding. `verbatimModuleSyntax` (below) forces `import type`, which Node drops entirely.

#### `tsconfig.json`

`tsconfig.json:2-15`, each flag and its reason:

- `target: ES2022`, `lib: [ES2023, DOM, DOM.Iterable]`: the output is never emitted, so `target` only sets what syntax tsc accepts and how it types class fields; `ES2023` gives `Array.prototype.at`/`toSorted` typings.
- `module: ESNext`, `moduleResolution: Bundler`: Bundler resolution accepts both extensionless relative imports (the `src/` style) and `.ts`-suffixed ones (the `server/`, `scripts/`, `tests/` style), and understands `package.json` `exports`. Node16 resolution would reject the extensionless style.
- `allowImportingTsExtensions: true`: makes `import "./x.ts"` legal; tsc only allows it with `noEmit`, which is set.
- `verbatimModuleSyntax: true`: an import that is only used as a type must say `import type`, and import/export statements are kept as written. This is the flag that makes Node's type stripping (and esbuild's per-file transpile) safe.
- `isolatedModules: true`: every file must be transpilable on its own, without cross-file type information; `const enum` and re-exported types without `export type` are rejected. Same reason.
- `strict`, `skipLibCheck`, `noEmit`: tsc is a checker only.
- `jsx: react-jsx`: the automatic runtime, no `React` import per file.
- `types: ["node", "vite/client"]`: Node globals for server/scripts/tests, `import.meta.env` and asset imports for the front end.
- `include` (`:16`): `src`, `server`, `tests`, `e2e`, `scripts/*.ts` (the `.mjs` helpers are left out), and the three config files, so `npm run typecheck` covers the configs too.

#### ESLint

`eslint.config.js` is a flat config. The header comment (`:1-3`) states the division of labour: tsc checks types, ESLint catches what tsc does not (unused code, conditional hooks, missing effect dependencies). Layers:

- `ignores` (`:10`): build outputs, `node_modules`, `public/` (copied fonts), `data/`, `dry-run/`, `coverage/`, Playwright's output.
- `js.configs.recommended` and `tseslint.configs.recommended` (`:11-12`).
- For `**/*.{ts,tsx,js,mjs}` (`:14`): browser and Node globals together (`:15`), the `react-hooks` plugin with `rules-of-hooks` as an error and `exhaustive-deps` as a warning (`:18-19`).
- `@typescript-eslint/no-unused-expressions: off` (`:21`), with the reason at `:20`: the code uses comma sequences as compact statements (`swap(i, j), s++`), which the rule would flag throughout.
- `prefer-const: ["error", { destructuring: "all" }]` (`:24`): a `let [a, b] = …` where only some names are reassigned stays a `let` (`:22-23`).
- `no-unused-vars` with `argsIgnorePattern`, `varsIgnorePattern` and `destructuredArrayIgnorePattern` all `^_` and `ignoreRestSiblings` (`:25`): a leading underscore marks a deliberately unused value, and `const { names, ...s } = x` may ignore `names` (used that way in `tests/presets.test.ts:58`).
- `tests/**` may use `any` (`:29`): the tests poke at loosely typed preset and exam data.

#### The Docker image

`Dockerfile` is two stages on `node:24-alpine`.

Build stage (`:1-6`): copy `package.json` and the lockfile first so `npm ci` is its own cached layer; then `COPY . .` filtered by `.dockerignore`; then `npm run build && npm run build:checker`. `.dockerignore:1-13` leaves out `node_modules`, `dist`, `dist-server`, `data`, `public/fonts` (regenerated by `copy-assets.mjs` inside the build), logs, `.git`, `docs`, `tests`, `e2e`, Playwright output and `dry-run`. Dropping `docs`, `tests` and `e2e` keeps the context small and means a docs-only change does not invalidate the `COPY . .` layer.

Runtime stage (`:8-25`):

- `ENV NODE_ENV=production PORT=8787 DATA_DIR=/data STATIC_DIR=/app/dist ZENO_CHECKER=/app/dist-server/checker.js` (`:10`): five variables, of which four are read: `PORT`, `DATA_DIR` and `STATIC_DIR` by `server/index.ts:15-17`, `ZENO_CHECKER` by `server/marking.ts:11`. Nothing in `server/` or `src/` reads `NODE_ENV`; it is set by convention only.
- `COPY --from=build /app/dist ./dist` (`:11`): the front end with its `.br`/`.gz` twins.
- `COPY --from=build /app/dist-server ./dist-server` (`:13`): the bundled checker, "the server marks every answer again" (`:12`).
- `COPY server ./server` (`:14`): the server runs from TypeScript source; there is no `node_modules` in this stage, which is fine because the server imports only `node:` builtins plus the two source trees below.
- `COPY src/math/practiceSkills.ts` and `COPY src/model` (`:16-17`): `server/research.ts` and `server/dashboard.ts` validate skills against the app's list and run the learner model on the dashboard. These files import with `.ts` extensions, so no hook is needed for them; the hook is still registered by `marking.ts` only when `ZENO_CHECKER` is unset, which it is not here.
- `RUN mkdir -p /data && chown node:node /data` then `VOLUME /data` (`:19-20`): Docker initialises a new named volume from the image's directory, ownership included (`:18`); without the `chown`, the server running as `node` (`:22`) could not create the database.
- `HEALTHCHECK` (`:23-24`): BusyBox `wget` against `/api/health`, every 30 s, 5 s timeout, 10 s start period, 3 retries. `server/index.ts:256` exempts `/api/health` from the password so the probe needs none.
- `CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.ts"]` (`:25`).

`docker-compose.yml` names the same image (`:3-4`), `restart: unless-stopped`, and maps `"${BIND_ADDRESS:-0.0.0.0}:8787:8787"` (`:9`) so `BIND_ADDRESS=127.0.0.1` keeps the port local behind Caddy or nginx. Environment (`:10-21`): `APP_PASSWORD` (HTTP basic auth, any username; without it anyone reaching the port owns every board), `TEACHER_PASSWORD` (the `X-Teacher-Password` header for classes and exports), `TRUST_PROXY` (count wrong passwords per `X-Forwarded-For` client rather than per connection; `server/limiter.ts:50` accepts `1`, `true` or `yes`, and `:52` builds the one limiter with 10 failures in 10 minutes unless `PASSWORD_ATTEMPTS` and `PASSWORD_WINDOW_MINUTES`, two variables the compose file does not expose, say otherwise), `BACKUP_KEEP` default 7 (daily SQLite copies in the volume's `backups/`; `server/index.ts:52`). `BIND_ADDRESS` is read by compose alone, for the port mapping; the server listens on every interface (`server/index.ts:280` passes only the port), so the dry run's and the figure script's `BIND_ADDRESS: "127.0.0.1"` in the spawned server's environment has no effect. The healthcheck is repeated (`:24-29`) with the Dockerfile's settings (30 s interval, 5 s timeout, 10 s start period, 3 retries), so the compose file states them in one place; the named volume `data` is declared at `:31-32`.

#### CI

`.github/workflows/ci.yml`. Triggers (`:3-8`): pushes to `main` and pull requests, both with `paths-ignore: ["docs/**", "*.md"]`, so docs-only commits do not run. `concurrency` (`:11-13`) groups runs by `github.ref` and cancels the one in progress when a newer push arrives. Three independent jobs:

`check` (`:16-29`): checkout, Node 24 with the npm cache, `npm ci`, `npm run typecheck`, `npm run lint`, `npm run coverage` (the whole test suite, failing if `src/math` or `src/model` coverage drops below the thresholds; `:27-28`), `npm run build`.

`e2e` (`:31-53`): checkout, Node, `npm ci`, `npm run build` (the Playwright config serves the built app), then `actions/cache` on `~/.cache/ms-playwright` keyed by OS and `package-lock.json` hash (`:42-46`; the Chromium download is about 100 MB), `npx playwright install --with-deps chromium`, `npm run e2e`, and on failure an artifact upload of `test-results/` (`:49-53`) which holds the traces `playwright.config.ts:23` retains on failure.

`docker` (`:55-84`): `docker/setup-buildx-action`, then `docker/build-push-action` with `load: true`, tag `zeno-math`, `cache-from/cache-to: type=gha, mode=max` (`:61-67`) so the `npm ci` layer comes from the previous run unless the lockfile changed. Then the smoke test:

- `docker run -d --name zeno -p 8787:8787 -v zeno-data:/data zeno-math` (`:69`): on a named volume, as compose does, which is what exercises the `chown` at `Dockerfile:19`.
- "Health and a saved board" (`:70-74`): poll `/api/health` for up to 30 s, `POST /api/boards` with `{"title":"CI"}`, then `GET /api/boards` and `grep -q '"CI"'`.
- "The server marks answers" (`:75-82`): proves the bundled checker loaded, not merely that the process is up. With no `TEACHER_PASSWORD` in the image, `POST /api/classes {"skills":["times"]}` returns a class code; `POST /api/students {"class": code}` returns a student code; then one attempt is posted on `times` level 1 seed 1 whose single answer is `"-1"` with the browser's verdict `"correct"`. No times-table question has `-1` as its answer, so the server re-marks it wrong, keeps the browser's claim beside its own (`server/marking.ts:1-4`), and the export `GET /api/research/attempts.csv?class=…` must contain `""client"":""correct""` (`:82`): the `answers` column is JSON inside a quoted CSV field, so every quote is doubled. If `dist-server/checker.js` failed to import, `marking.ts:13` would throw at startup and the health poll would already have failed; if it loaded but marked nothing, the `client` key would not appear.
- On failure, `docker logs zeno` (`:83-84`).

### Scripts

All research scripts share one argument idiom: `args = process.argv.slice(2)`, an `opt(name, fallback)` that returns the token after a flag, `args.includes(flag)` for booleans, and the first token not starting with `--` (and not the value of a valued flag) as the positional file. They print a usage line and exit 2 on a missing input or a bad flag value (`mastery.ts` needs no input: without `--observations` it simulates); `evaluate-model.ts` alone exits 1 on an input that parses but is unusable (no attempts, or too few students to hold some out), where `h1.ts` exits 2. `--json` switches each reporting script (`evaluate-model`, `simulate-study`, `mastery`, `h1`, `analyse-study`, `checker-agreement`, `mistakes`) from a padded table to `JSON.stringify(..., null, 2)` on stdout; `import-assistments`, `dry-run-study`, `thesis-figures` and `thesis-pdf` have no `--json`.

#### `scripts/evaluate-model.ts`

Judges the learner model and its rivals on logged answers. Header at `:1-11`.

Inputs (`:26-49`), one of three: a positional CSV from `/api/research/attempts.csv`, read by `observationsFromCsv` from `src/model/evaluate.ts`; `--observations data.json`, a dataset file read by `fromFile` from `src/model/datasets.ts`, which also supplies `source` and the dataset's own `areas` map; or `--simulate`, which calls `simulateRandom()` from `src/model/simulate.ts` for synthetic learners with a known truth. The `valued` set (`:26`) keeps a flag's value from being mistaken for the file.

Split (`:33-58`): `splitByStudent(observations, testShare, seed)` holds out a share of students (`--test-share`, default 0.2, must lie strictly between 0 and 1; `--seed`, default 1 and a whole number, picks which; `:33-38` exit 2 otherwise). Models fit or warm up on the training students and are scored answer by answer on the held-out ones, so no score comes from a student the model was tuned on (`:1-3`).

Models (`:60-75`): `EloModel` with the dataset's `areaOf` if it has one (`:61`), then three ablations: "no area layer" (`weights: { global: 0.4, area: 0, skill: 1 }`), "skill layer only" (`global: 0, area: 0`), and, for datasets with areas, "one area" (`areaOf: () => "all"`); the two standard student models `PfaModel` and `BktModel`; the exponential moving average `EmaModel` (`:71`), BKT's simple rival in the thesis; and three counting baselines `studentSkillRate()`, `itemRate()`, `globalRate()`.

`--fit` (`:77-85`): a 6 × 6 grid over α ∈ {0.2, 0.4, 0.6, 0.8, 1, 1.5} and β ∈ {0, 0.01, 0.02, 0.05, 0.1, 0.2}, each scored by `evaluate(...).logLoss` on the training students only; the five best are kept and the best is inserted as a second model named `elo, fitted (α …, β …)`.

Scoring (`:87`): `evaluateHeldOut(model, train, test)` per model gives `Metrics` with `logLoss`, `rmse`, `auc`, `accuracy` and `calibration` bins.

Outputs: `--calibration bins.csv` (`:91-96`) writes one row per model per bin with columns `model,from,to,n,predicted,observed`; `thesis-figures.ts` reads exactly this. `--json` (`:98-99`) emits `{ source, testShare, seed, train: {answers, students}, test: {...}, results, fit }`. Otherwise (`:100-117`) a table of log-loss, RMSE, AUC and accuracy per model, the Elo model's calibration bins (`predicted → observed (n)`), the EMA's fitted α and start (`:110-111`), and the fitted α, β list.

#### `scripts/import-assistments.ts`

Turns the ASSISTments 2009–2010 skill-builder CSV into the dataset JSON `evaluate-model.ts --observations` reads (`:1-7`). The file is not in the repository. It is read as a stream with `latin1` encoding (`:23-24`) because skill names carry accented bytes that are not UTF-8; `csvRecords` from `src/model/datasets.ts` is an async CSV reader that survives chunk boundaries anywhere (`tests/baselines.test.ts:21-27` tests every split point of a sample with quoted commas, line breaks, doubled quotes and CRLF), `fromAssistments` keeps main problems with a skill and a 0/1 result once per skill (`tests/baselines.test.ts:41`) and each student's class from `student_class_id`, and `toFile` serialises. Output `--out`, default `assistments.json` (`:21, :25`). It prints (`:26-35`) rows read, answers kept, students, skills and the share right first time; then either the number of classes and of students who answered in more than one (each counted in the one they answered most in) or, when the file has no `student_class_id` column, that "H1's class-level check cannot run" (`:31-33`); then skills per topic.

#### `scripts/h1.ts`

"H1, the thesis's one confirmatory test (docs/thesis/outline.md): on held-out students, does BKT predict the next first-attempt answer better than the moving average (EMA)?" (`:1-7`). Inputs as in `evaluate-model.ts` (`:9-11, :41-47`): a positional attempts CSV, `--observations data.json` (which also supplies the data set's `classes`), or `--simulate`. Flags (`:12, :32-39`): `--seeds` (default `1,2,3,4,5`, whole numbers), `--test-share` (0.2, strictly between 0 and 1), `--resamples` (10000, a whole number of at least 100), `--smallest` (default `SMALLEST_DIFFERENCE` = 0.005, above 0), `--json`. Every failure, including no usable attempts and too few students to hold some out, goes through `fail` and exits 2 (`:24-27`).

Per seed (`:53-62`): `splitByStudent(observations, testShare, seed)`, a fresh `BktModel` and `EmaModel`, `heldOutPredictions` for each on the same held-out answers, and `pairedLogLoss(BKT, EMA, { resamples, seed, smallest })` from `src/model/evaluate.ts`, so the difference is BKT − EMA and below zero means BKT predicts better. When the data set names classes, a second `pairedLogLoss` with `groupOf: classOf` resamples whole classes; a student with no class "stands alone, as in the student-level bootstrap" (`:49-51`). The header is explicit about the roles: "The first split seed is the test; the others only show whether the result hangs on one split", and the class resampling is "a robustness check and not a second test: students in one class share a teacher and lessons, so resampling students alone is optimistic."

Output: `--json` prints `{ source, testShare, resamples, smallest, runs }`, each run the `PairedTest` plus `seed`, the fitted `ema` parameters and `byClass` when present (`:64-65`). Otherwise (`:66-82`) one row per seed (the first marked `(test)`) with students, answers, both log-losses, BKT − EMA, the interval and the verdict with "first"/"second" replaced by BKT/EMA; the class-level table, or for a data set without classes a note that the interval "is optimistic if classmates are alike"; then the decision line `H1 is decided by seed …` and the EMA's α and start for the first seed.

#### `scripts/simulate-study.ts` and `scripts/simulate-worker.ts`

The simulation study: question-choosing policies compared on simulated classes across the assumptions the result depends on (`:1-3`).

Flags (`:4-10, :30-50`): `--skills` (default `algebra`; a comma-separated list in which an area name expands to `SIM_SKILLS[area]` and anything else must be a skill in `SIM_SKILLS`, the whole ordered by `inCurriculumOrder`; an unknown name fails). `SIM_SKILLS` is `FIRST_SKILLS` from `src/math/practiceSkills.ts:17` (`src/model/simulate.ts:33`): the 38 skills the published results were made with, by area number 5, algebra 12, geometry 10, calculus 7, data 4, so the default run uses the 12 algebra skills. `--worlds` (subset of `WORLDS = ["elo", "irt2pl", "bkt"]` from `src/model/simulate.ts:70`), `--students` (60; grid mode only, `:126`, since power mode takes its class sizes from `--sizes`), `--questions` (60), `--test-length` (12), `--runs` (10, or 100 with `--power`), `--csv file`, `--json`, `--target` (a chance in (0, 1); default `TARGET = 0.75` from `src/model/policy.ts:19`), `--jobs` (default `availableParallelism()`), `--grid`, `--power`, `--sizes` (power only, default `20,40,80,160`, even numbers ≥ 8).

Assumption grid (`:52-54`): worlds × learning ∈ {flat, zpd} × transfers × learn rates. The main run uses transfers {0, 0.3, 0.6} and rates {0.02, 0.1} (`:127`); power uses transfers {0, 0.3} (`:99`). Comparisons (`:55-59`): adaptive vs fixed; with `--grid` also adaptive vs random, adaptive at 0.6 vs fixed and adaptive at 0.85 vs fixed.

Determinism (`:60-62`): `study(a, arms, students, run)` builds `Partial<StudyParams>` with `seed: (run + 1) * 101`. The seed depends on the run index alone, so the same run index gets the same random stream in every cell and every arm (common random numbers), and a study is the same whichever thread runs it. Inside `runStudy` (`src/model/simulate.ts:202-207`) separate generators are derived from `seed + 2` for practice and `seed + 3` for the tests, "so they don't change what happens in practice".

Parallelism (`:64-86`): `runAll(tasks)` returns outcomes in task order. With `--jobs 1` or fewer than two tasks it maps `outcome(runStudy(t))` inline (`:66`). Otherwise it sorts task indices by `students` descending (`:68`; biggest classes first so no thread is left with a long study at the end), allocates `results: Outcome[]` by index, and starts `min(jobs, tasks)` workers from `new URL("./simulate-worker.ts", import.meta.url)` (`:71`), which Node runs as a `.ts` worker. Each worker gets a `Task { id, params }` (`:76`); on each `message` the outcome is stored at `results[m.id]` and the next task is handed out (`:78-81`); when none remain the worker is terminated and its promise resolves (`:74`). `simulate-worker.ts:16` is the whole worker: `parentPort.on("message", t => parentPort.postMessage({ id: t.id, outcome: outcome(runStudy(t.params)) }))`. The same file exports `outcome` (`:9-12`), which reduces a `StudyResult` to what the script keeps: `ancova(...)` from `src/model/analysis.ts` on one row per learner `{ treated: l.arm === 0 ? 1 : 0, pre: l.preTest, post: l.postTest }`, and `summarise(r)`. Because the module exports and only attaches the listener when `!isMainThread` (`:16`), the main script imports it for `outcome` and `Task` without side effects. Results are merged purely by index; the single-threaded path produces the same array, so the CSVs are byte for byte identical for any `--jobs` (the reproducing appendix that said so, `appendix-d-reproducing.md:28-30` at e1edf9c, was replaced by `appendix-b-reproducing.md`, which no longer covers the simulation study).

Power mode (`:94-124`): cells = assumptions × sizes; `runs` studies per cell with the adaptive-vs-fixed arms; per cell `power` = share with `ancova.p < 0.05`, `adaptiveWins`/`fixedWins` = share significant with positive/negative estimate, `d` = mean adjusted effect in post-test SDs, `t` = mean t-statistic. CSV columns: `world,learning,transfer,learnRate,students,power,adaptiveWins,fixedWins,d,t` (`docs/results/power.csv:1`). The footer (`:121-123`) explains the sizing rule: 80 % power needs t ≈ 2.8, so `students × (2.8 / t)²`.

Grid mode (`:125-161`): cells = assumptions × comparisons; per cell `d` = mean Cohen's d of true gain (first arm over second), a 95 % interval `mean ± tUpper(0.025, runs − 1) · sd / √runs` using `tUpper` from `src/math/distributions.ts` (`:132`), `dTest` the same on the test gain, `ahead` the share of classes where the first arm gained more, `gainA/gainB` mean gains, `offA/offB` mean distance from each arm's target chance. CSV columns: `world,learning,transfer,learnRate,compare,d,dLow,dHigh,dTest,ahead,gainA,gainB,offA,offB` (`docs/results/simulation-grid.csv:1`). Numbers are written with `toPrecision(6)` (`:91`). The published files: `simulation-grid.csv` 144 rows (3 worlds × 2 × 3 × 2 × 4 comparisons), `power.csv` 96 rows (3 × 2 × 2 × 2 × 4 sizes), `power-focused.csv` 72 rows (3 sizes), `power-focused-60.csv` 96 rows (4 sizes, `--target 0.6`); the commands for each were in the replaced `appendix-d-reproducing.md:13-16`, and the current appendix lists none of them.

#### `scripts/mastery.ts`

Mastery decisions, H2 and H3 of the thesis (`:1-16`), on top of `src/model/mastery.ts`. With `--observations data.json` it runs H3 on logged answers (`realAnswers`, `:62-80`); otherwise H2 on simulated learners (`simulated`, `:83-177`). Flags are read by `whole` (a whole number above 0) and `share` (at least 0 and below 1), each exiting 2 through `fail` (`:34-47`): `--seed` 1, `--test-share` 0.2, `--streak` 3, `--resamples` 2000 (`:48-51`), and for H2 `--students` 400, `--length` 30, `--mastered-at` 0.9, `--target` 0.9 (`PRECISION_TARGET`), `--forget` 0.02, `--learn-rates` (default `0.02,0.1`, "The two learning rates of the simulation study (scripts/simulate-study.ts), so H2 rests on no rate chosen for it", `:91-92`), `--skills` (areas expand to their `SIM_SKILLS`; anything that is not a simulated skill fails, `:84-89`), `--worlds`, `--beyond` (search `BEYOND_THRESHOLDS` instead of `FINE_THRESHOLDS`, `:53`), `--curves file`, `--calibration file`, `--json`.

H2 (`:83-177`): four worlds (`:96-102`), "The bkt world as BKT assumes it (one level, flat learning, no transfer, no forgetting), then the worlds that are not": `bkt`, `bkt, forgetting` (the bkt world with `forget`; `--worlds` spells it `bkt-forget`, `:103-104`), `elo` and `irt2pl`. For every learning rate × world (`:108-130`): `simulatePractice` at level 2, `splitByStudent` on the practices with `--test-share` and `--seed`, `fitRules` on the training learners, and on the test learners the shares that know the skill after the first and the last answer, `compareAtPrecision` (H2, with the chosen thresholds), `compareAtCost` (equal practice, description), BKT at the usual 0.95 with its precision interval ("in the plain bkt world its precision has a floor of 0.95 with the true parameters, so how far below it falls is what fitting costs", `:113-115`), `tradeOff` and `masteryCalibration`. `--curves` writes `world,learn_rate,method,threshold,cost,declared,precision,missed` (`:132-138`); `--calibration` writes `world,learn_rate,score,from,to,n,mean_score,share_mastered` (`:139-146`); `--json` prints the settings, `highestThreshold` and every result (`:147`). The text output (`:149-176`) gives, per world and rate, each method's chosen rule with its answers and interval, precision, share declared, share missed and what BKT saves, or "never right … of the time on the training learners"; then the three rules and BKT at 0.95 at the streak rule's cost; then each score's Brier score and its top bin (scores of 0.9 and above).

H3 (`:62-80`): `fromFile`, `practicesFrom`, a student split and `fitRules`; BKT at 0.95 and the EMA at the threshold costing what the streak rule costs on the training students ("cost needs no truth", `:66-69`); on the test practices `agreement` for BKT/streak, EMA/streak and BKT/EMA, and `rightAfter` for all three rules (the next three answers). `--json` prints `{ source, testShare, seed, ema, practices, agreement, after }`.

#### `scripts/atoms.ts`

H2's comparison in the atoms world (`:1-12`), on top of `src/model/atoms.ts`. Flags as in `scripts/mastery.ts` (`whole`, `share`, `fail`, `:17-36`): `--atoms` 1,2,3,4 (whole numbers from 1 to 255, since an atom's index is kept in a byte), `--uses` 1 (skills each atom is in), `--learn-rates` 0.02,0.1 (H2's two), `--students`, `--skills`, `--length` and `--seed` defaulting to `DEFAULT_ATOMS`, `--test-share` 0.2, `--target` 0.9, `--resamples` 2000, and `--beyond` for `BEYOND_THRESHOLDS` (`:38-53`); every number of atoms and of uses is checked to deal evenly before anything runs (`:54-56`). For every learning rate × number of atoms × uses (`:59-65`): `simulateAtoms`, `splitByStudent`, the share of test practices with every atom known at the end, and `compareAtoms`. `--json` prints the settings and every result (`:66-69`); otherwise one block per setting with BKT on the skill, the EMA, the streak rule, BKT per atom and carried (rule, cost with its interval, precision, share declared, and per atom minus on the skill), carried minus afresh, then the five Brier scores (`:71-93`). `npm run atoms -- --atoms 3 --uses 1,2,3,4` is what carrying shared atoms is worth.

#### `scripts/analyse-study.ts`

The pre-registered analysis on the tests export (`:1-4`). `parseCsv` from `src/model/evaluate.ts` reads `/api/research/tests.csv`; `scoresFromTests` turns rows into per-student pre/post scores; `analyseStudy` returns `testLength`, per-condition `students { all, complete }` and `means { pre, post, gain }`, the primary `ancova` (post adjusted for pre, with `estimate`, `ci`, `df`, `t`, `p`, `adjusted.treated/control`, `d`), the secondary Welch `gains`, and the `forms` check (pre-test, form A − form B, near 0 if parallel). `answerChecks(rows)` counts, per condition, answers sent late and answers the browser marked differently from the server (`:17, :39-42`). The text output (`:21-43`) prints each estimate as `±x.x points (95 % CI … to …), t(df) = …, p = …`.

#### `scripts/dry-run-study.ts`

A dress rehearsal of the class study with simulated students through the real server's HTTP API (`:1-10`). It is both a CLI (`import.meta.main`, `:186-225`) and a library used by `tests/dryrun.test.ts`, `tests/api-docs.test.ts`, `tests/sharing.test.ts` and `scripts/thesis-figures.ts`.

`startServer(dataDir, port, teacher)` (`:44-58`) spawns `process.execPath --disable-warning=ExperimentalWarning server/index.ts` with `PORT`, `DATA_DIR`, `STATIC_DIR` pointing at a non-existent directory, `APP_PASSWORD=""`, `TEACHER_PASSWORD`, `BIND_ADDRESS=127.0.0.1` (which the server does not read), and resolves when stdout contains `listening` (`server/index.ts:281` prints `Zeno listening on …`); it rejects if the process exits first. `stop()` kills and waits for exit. This is the shared server-spawning helper the integration tests reuse.

`dryRun(o)` (`:70-184`) runs the protocol:

1. `POST /api/classes { name, skills, testLength }` with the teacher header → class code (`:86`). `skills` default to `inCurriculumOrder(SIM_SKILLS.algebra)`.
2. `makeWorld({ students, seed, world })` from `src/model/simulate.ts` builds the simulated learners (`:87`); `o.students` × `POST /api/students { class }` joins them and the server randomises each into a condition (`:88-89`).
3. `sitTest("pre")` (`:94-114`): the teacher sets the phase (`POST /api/classes/:code/phase`), then for each student the plan `GET /api/students/:code/plan` gives the form, and `testItems(classCode, skills, form, testLength)` from `src/model/testForms.ts` rebuilds the items exactly as the browser does from the class code. Each item becomes an `exercise(skill, level, seed, words)`; the answer is right with probability `world.chance(learner, skill, level)` (a test does not teach, `:101`); a wrong answer is a string the checker judges plainly wrong, found by `wrongInput` (`:64-68`): the inputs of the question's known traps (`trapInputs`), then the negated answer and a list of stock wrong forms, the first for which `verdictOf(check(ex, input, w)) === "wrong"`; if none exists the item is posted with an empty `input` and verdict `skipped` and `unanswerable` counted (`:104-107`; a `form` verdict on a typed answer is recorded as `wrong`). The body is posted to `POST /api/tests` and the first item is posted a second time to assert idempotent uploads (`:111`).
4. `phase("session", { minutes: 60 })` then the practice loop (`:117-141`): every `refreshEvery` questions (default 10) a student's plan is refetched and `toClassPlan` applied; otherwise the browser-side state in `src/learner.ts` is carried forward. The question is chosen by `choose(condition, model, ME, skills, position, { recent })` from `src/model/policy.ts`, the same function the browser uses; the model's prediction is logged; the learner answers through `world.answer` (which learns); the answer log is built with `startLog`, `logAnswer(log, typed, check(ex, typed, w), ms)` and `finish(log, "solved" | "revealed")`, converted with `toAttempt` and posted to `POST /api/attempts`; the very first attempt is posted twice; `applyAttempt(cp, a)` moves the local plan on as the server will.
5. `sitTest("post")`, `phase("closed")`, then both exports with the teacher header (`:142-146`), `parseCsv`, `analyseStudy`.

Checks (`:151-181`), each `{ name, ok, detail }`: randomised in balanced blocks (|adaptive − fixed| ≤ 2); test orders AB/BA balanced within each condition (difference ≤ 1); every test row's `form` equals the letter its `test_order` says for its phase; every student finished both tests; every practice question stored (count posted = students × questions = rows exported); retried uploads stored once; class practice `policy` equals the student's `condition` on every row; `predicted` logged on every class-practice row; the ANCOVA ran; every wrong test answer could be typed; `client_verdict` empty on every test row and `remarked === "0"` on every attempt (the server agreed with the browser everywhere); `late === "0"` everywhere. The result also carries `predictedLogLoss`, the log-loss of the logged predictions against `first_correct` (`:182-183`).

CLI (`:186-225`): `--students` 40, `--questions` 30, `--test-length` 12, `--world` elo, `--seed` 1, `--out dry-run`; a temp data directory and a random port in 20000–40000; writes `tests.csv`, `attempts.csv` and `summary.json` into `--out`, prints ✓/✗ per check, exits 1 if any failed, and always stops the server and removes the temp directory. The class code is random, so the effect estimate varies between runs while the checks hold.

#### `scripts/checker-agreement.ts`

How often the answer checker agrees with a teacher's marking on `tests/fixtures/answers.json` (`:1-9`): 333 labelled answers (158 correct, 123 wrong, 36 form, 16 close), each `{ skill, level, seed, input, label, mistake?, note? }` (`:19`). Labels are `LABELS = ["correct", "close", "wrong", "form"]` (`:17`).

`agreement(answers)` (`:43-74`): for each answer, `check(exercise(skill, level, seed, w), input, w)` and `verdictOf` give the checker's label; `matrix[teacher][checker]` is incremented (a 4 × 4 confusion matrix, `:23, :51`); disagreements are collected with the checker's label. `falseRejects = matrix.correct.wrong + matrix.correct.close` (right answers the checker refused); `falseAccepts = matrix.wrong.correct + matrix.close.correct + matrix.form.correct` (`:69-70`). A `form` verdict sends the answer back without counting it, so a disagreement into or out of `form` costs a retry, not a mark (`:85`). The second table (`:53-63`) is diagnosis on teacher-wrong answers: `labelled` (teacher named a mistake) split into `named` (checker names the same `MistakeId`) and `misnamed`; `plain` (teacher named none) with `falselyNamed`; and `differences` listing every mismatch.

CLI output (`:76-95`): agreement count and percentage, the matrix with teacher rows and checker columns, the two costly counts, every disagreement with its note, and the diagnosis counts.

Thresholds pinned in `tests/checker.test.ts:16-32`: agreement ≥ 0.89; `falseAccepts ≤ 2`; `falseRejects ≤ 1`; `matrix.wrong.wrong` equals the number of teacher-wrong answers (every wrong answer is marked wrong, nothing credited or sent back); at least 30 answers with a labelled mistake; `named === labelled` (every labelled mistake is named, and named the same); `falselyNamed / plain < 0.02` (the fixture has 31 labelled mistakes today). `tests/checker.test.ts:11-14` also requires the fixture to cover every `ALL_SKILLS` entry and every label. The header (`:1-3`) states the policy: a checker change may move answers between "sent back" and a verdict but must not credit wrong answers, reject right ones or agree less overall.

#### `scripts/mistakes.ts`

Which named mistakes students made, from either export (`:1-7`). `tallyMistakes(rows)` (`:22-49`) skips rows whose `skill` is not in `ALL_SKILLS` or whose level/seed is malformed; for attempts rows it parses the `answers` JSON column and keeps inputs with `verdict === "wrong"`, for tests rows it takes `input` when `verdict === "wrong"` (unquoting a JSON string if present, `:30-32`); the group key is `condition` (or `free`) plus `phase` for tests (`:34`); each wrong input is re-checked with `check(exercise(...), input, w).mistake`. Output: `wrong` and `named` per group, `byMistake[MistakeId][group]`, `bySkill[skill] { wrong, named }`. Because the question is fixed by `(skill, level, seed)`, it works on exports made before the checker named mistakes (`:2-3`). The CLI prints a group-by-mistake table with percentages of the group's wrong answers and a by-skill list (`:59-73`).

#### `scripts/thesis-figures.ts`

Remakes the thesis figures from the code (`:1-8`): the five Mermaid diagrams in `docs/architecture.md`, the calibration plot, a practice screenshot and two dashboard screenshots. Requires `npm run build` first; screenshots are of the built app on the real server.

- Diagrams (`:28-50`): the ```` ```mermaid ```` blocks are extracted from `docs/architecture.md` and must number exactly `DIAGRAMS.length` = 5 (`:31-32`). A blank page gets Mermaid by `page.addScriptTag({ path: MERMAID })` where `MERMAID = "node_modules/mermaid/dist/mermaid.min.js"` (`:21`), the copy Excalidraw's `@excalidraw/mermaid-to-excalidraw` brings in (mermaid 11.17.2 in the lockfile), so the figures are made offline from a pinned version. `mermaid.initialize` sets the neutral theme, Arial, a `themeCSS` that keeps cluster labels on one line, and sequence wrapping (`:35-42`); each block is rendered with `mermaid.render` and the `#out` element screenshotted to `docs/thesis/figures/<name>.png` at `deviceScaleFactor: 3` (`:23, :189`). The header comment at `:7` still says Mermaid "is loaded from jsDelivr … so this needs the network", which contradicts `:20-21` and the current code; the comment is stale.
- Calibration (`:52-98`): spawns `node --import ./scripts/ts-register.mjs scripts/evaluate-model.ts --simulate --fit --calibration bins.csv` (`:94`), reads the bins, and draws its own SVG (`calibrationSvg`, `:64-90`): a 560 × 520 chart, grid at 0.2 steps, a dashed diagonal for perfect calibration, one polyline-with-dots per model in `SERIES` (Elo, PFA, BKT, `:58-62`), bins with fewer than `MIN_ANSWERS = 20` answers left out (`:56`), axis labels "predicted chance of a right first answer" and "share answered right". Screenshotted as `calibration-simulated.png`.
- Practice hint (`:102-136`): same technique as `e2e/practice.spec.ts`: find a `fractions` level-1 question whose traps include `addAcross` by scanning `Math.random` values `i/501` (`:103-110`), create a board via the API, open the practice tool with Ctrl+K, pin `Math.random` in the page, pick easy / Fractions, type the trap input, click Check, wait for `.practice-hint`. On a board practice opens as an `<aside>` beside it (`src/components/PracticeDialog.tsx:594-596`), not a dialog, and the panel is as tall as the window, so the page is first made 1200 px high, "Tall enough that the panel beside the board holds the question and the verdict without scrolling" (`:113-115`); the screenshot `practice-mistake-hint.png` is clipped from the top of the panel (found by its role, `complementary`, and name) to 16 px below `.practice-verdict` (`:130-134`), and the window gets its size back (`:135`).
- Dashboard (`:138-160`): runs `dryRun` with 24 students, 30 questions, 12-item tests, world `elo`, seed 1 against the figure server, logs in to `#/teacher`, opens the "Dry run" class, measures the `.teacher-main` children's boxes, and clips two full-page screenshots spanning "The two groups" → "Pre- and post-test" and "Mastery by skill" → "Does the model predict well?" (`:158-159`).
- Orchestration (`:183-201`): its own `startServer` (`:171-181`) with `STATIC_DIR: "dist"` (unlike the dry run's), `chromium.launch` honouring `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, one page at scale 3 for the vector figures and one at scale 2, 1280 × 860, light colour scheme for the app.

#### `scripts/thesis-pdf.ts`

"The thesis as one PDF: the chapters and the appendices in docs/thesis, with a title page, contents, and APA citations from references.bib and references-csl.yaml" (`:1-11`); with `--talk` (`npm run talk-pdf`), the title-defense talk instead. Pandoc and LuaLaTeX run in a container, `docker.io/pandoc/latex:3.6` (`:16`), started with `podman` unless `CONTAINER` names another engine (`:17`), so neither needs installing; the first run pulls the image ("about 1 GB"). The chapters are every file in `docs/thesis` matching `^(\d\d|appendix)-.*\.md$`, sorted by name (`:20`). For the thesis (`:26-33`) pandoc gets `pdf.yaml`, the chapters, a `date=Draft, <today>` metadata value in British form, `--resource-path=docs/thesis`, the `chapter-numbers.lua` filter (tables and figures "numbered by chapter, as the text refers to them"), `--citeproc` with both bibliographies and `apa.csl`; for the talk only `talk-pdf.yaml` and `title-defense.md` (`:25`). The container mounts the working directory at `/data` (`:Z` for SELinux) and the host's `/usr/share/fonts` read-only, since the fonts named in `pdf.yaml` come from the host (`:10, :35-43`). Output `docs/thesis/thesis.pdf` or `docs/thesis/title-defense.pdf` (`:23`), both listed in `.gitignore`. A spawn error is thrown; a non-zero exit is passed on as the script's own (`:44-45`).

#### Reproducing the numbers

`docs/thesis/appendix-b-reproducing.md:6-18` maps every result of the narrowed thesis to a command and a time (measured on an 8-core laptop, `:4`): the ASSISTments import, minutes; `npm run model -- --observations assistments.json --fit --calibration bins.csv`, minutes; `npm run h1 -- --observations assistments.json`, minutes; `npm run mastery -- --curves mastery-curves.csv` ~2.5 min; `npm run mastery -- --worlds elo,irt2pl --mastered-at 0.8` ~1 min; the two `--beyond` runs (at mastery 0.9 and 0.8) ~1.5 min each; `npm run mastery -- --calibration bins.csv` ~3 min; `npm run mastery -- --observations assistments.json`, minutes; Propositions 1 and 2 by `npm test` (`tests/mastery.test.ts`), ~3 min for the whole suite; `npm run thesis-pdf` ~1 min. It states that every random choice is seeded (`:3-4`), that the simulations use the 38 skills of `SIM_SKILLS` so later skills change no simulated number (`:23-25`), and records the commit each table was made at (`:27-36`; the ASSISTments tables are still `[TODO]`). The simulation study, the power runs, the dry run, checker agreement, mistakes and the figures, which the earlier `appendix-d-reproducing.md` listed, are no longer in it.

### Tests

#### Runner and coverage

`npm test` (`package.json:29`) is `node --import ./scripts/ts-register.mjs --test "tests/*.test.ts"`: Node's built-in runner, `node:test` and `node:assert/strict`, no framework. `npm run coverage` (`:15`) adds `--experimental-test-coverage` with `--test-coverage-include="src/math/**"` and `"src/model/**"`, `--test-coverage-exclude="tests/**"`, and thresholds `--test-coverage-lines=95 --test-coverage-branches=88 --test-coverage-functions=95`; the run fails below them. The server (`server/**`) and the React tree (`src/components`, `src/pages`) are outside the measured set; the server is exercised through spawned processes, which V8 coverage of the parent does not see, and the UI through Playwright.

#### Shared helpers

- Server spawning: `startServer` from `scripts/dry-run-study.ts:45-58` is imported by `tests/dryrun.test.ts:8`, `tests/api-docs.test.ts:8` and `tests/sharing.test.ts:8`. Three older tests carry their own copy with different environment: `tests/research.test.ts:31-41` (`TEACHER_PASSWORD: "chalk"`, keeps a `servers[]` list), `tests/server.test.ts:15-25` (an optional `APP_PASSWORD`, a fake `dist`), `tests/hardening.test.ts:67-82` (arbitrary env on top of empty passwords and `TRUST_PROXY`, a fresh random port per call, captures stdout and stderr so a refused start can be asserted on its message). All wait for `listening` on stdout, use a random port in 20000–40000 and a `mkdtempSync` data directory removed in `after` with `maxRetries: 5, retryDelay: 100` (Windows keeps the SQLite file locked until exit; `tests/server.test.ts:38-40`).
- The locale loop: `en`, `ru`, `ka` from `src/locales/*.ts` are iterated in `tests/presets.test.ts:79-84`, `tests/protocol.test.ts:39`, `tests/mistakes.test.ts:179`, `tests/i18n.test.ts`.
- A seeded LCG `seed = (seed * 1103515245 + 12345) % 2147483648` appears in sixteen of the maths tests (e.g. `tests/algebra.test.ts:11`) so random cases are reproducible. The learner-model tests that draw their own data use the simulator's mulberry32 instead, `rng` imported from `src/model/simulate.ts` (`tests/baselines.test.ts:12`, `tests/mastery.test.ts:11`).
- `textOf(svg)`: joins the `<text>` contents of a rendered SVG so assertions read what the picture says (`tests/algebra.test.ts:8`); most copies also unescape `&lt;`/`&gt;` (`tests/coordgeom.test.ts:8-14`) and the powers one `&amp;` too (`tests/powers.test.ts:8-15`).
- `val(s)`: parses the typographic forms the tools print ("−3/4", "8√5/5", "π/2", "≈ 1.153e+18") back into numbers (`tests/coordgeom.test.ts:25-30`, `tests/functions.test.ts:32-50`, which rewrites √, π, ln and e into a JavaScript expression and evaluates it, `tests/sequences.test.ts:32-37`, `tests/vectors.test.ts:36-42`).

#### Test files

One or two lines each, from the header comments:

- `algebra.test.ts`: equations and polynomials; every stated answer is checked against the input (150 random linear equations must satisfy the equation; degenerate cases print "every number" / "no solution").
- `algorithms.test.ts`: the Algorithms tool states right answers (shortest paths, windows, queens, call counts, string matching); every sort survives random input in cells and bars.
- `analysis.test.ts`: least squares, ANCOVA and Welch against hand-worked values and t tables; the tests export read into scores and analysed, finished tests only.
- `api-docs.test.ts`: below.
- `applied.test.ts`: applied calculus answers against independent Simpson integration on random polynomials.
- `baselines.test.ts`: the streaming CSV reader (every split point), the ASSISTments importer and the class it counts each student in, the student-wise split, PFA and BKT, Elo with a dataset's own skill grouping, and H1's paired bootstrap of BKT against the moving average (the verdict rule, the group bootstrap, `pairedLogLoss`, and BKT beating the EMA on answers drawn from BKT's own assumptions).
- `checker.test.ts`: the agreement thresholds above.
- `complex.test.ts`: complex parsing forms, exact printing, arithmetic against mathjs.
- `coordgeom.test.ts`: every point, line and length on random cases.
- `derive.test.ts`: derivatives against numerical differentiation on randomly generated expressions.
- `dryrun.test.ts`: below.
- `euclid.test.ts`: circle theorems against angles measured on the drawn figure, similarity tests, transformations, volumes, constructions, loci; practice answers follow from the question.
- `functions.test.ts`: domains, ranges, composites, inverses, transformed points, sketched features against floating-point evaluation.
- `hardening.test.ts`: the failure limiter per client and behind a trusted proxy, daily backups with pruning (`backup`, `backupDue`, `backups` from `server/backup.ts`), schema `user_version` 5, a first backup on start and refusal of a newer database (`:112-126`), `BACKUP_KEEP=0`.
- `i18n.test.ts`: below.
- `identities.test.ts`: trig proofs found for true identities and refused for false ones, equation solutions in the interval with no sign change missed, R-forms and exact values.
- `inference.test.ts`: distribution functions against tables and closed forms, CI/test duality, two-sample and χ², power vs sample size, coverage simulation.
- `learner.test.ts`: the browser side of the study: `verdictOf`, attempts only after a try or reveal, the `Outbox` ordering and retry under a failing network, `applyAttempt` moving the plan on as the server will.
- `live.test.ts`: live pieces' arithmetic (geared clock, dice/coins and tallies, dot multiplication, counters, live graph).
- `logic.test.ts`: formula printer and parser round-trip over 2000 random formulas in two styles; spellings.
- `mastery.test.ts`: mastery decisions: the streak, EMA and BKT rules, Propositions 1 and 2, the EMA's fit, practice with a known truth (with and without forgetting), judging, the cost bisection, the student bootstrap, H2 at equal cost and at equal precision, the threshold grids, calibration against the truth, and H3's agreement and answers after mastery; detailed under `src/model/mastery.ts` in section 3.
- `mental.test.ts`: mental-math and tactics tools state right answers (200 random products near a base, digit-sum checks, roots; mental division by all three methods against the true quotient and remainder, divisibility rules against the remainder, reciprocals' digits, pre-period and cycle length for 1/2 to 1/400).
- `mistakes.test.ts`: each `MistakeId` is recognised in the skills and levels that can produce it (`WHERE`, `:15-32`; `sign` is left out, `:36`), still counts as wrong, never shadows a right answer or a form message; inequality and standard-form readers, in all three locales.
- `model.test.ts`: Elo ratings move the right way by diminishing steps, new skills start from area/global ability, on simulated learners the model beats counting, is calibrated, recovers difficulties and student order (Spearman); metrics; CSV reading.
- `naec.test.ts`: the 2025 NAEC logical-reasoning paper solved with the Logic tool, Georgian text and all.
- `numerical.test.ts`: sign changes, root-finding methods landing on the true root with correct rounding, quadrature rules exact where theory says and erring as f″ says.
- `plotting.test.ts`: `niceStep`, curve breaking at asymptotes, plane transformations' determinant, matrix operations.
- `policy.test.ts`: curriculum order and prerequisites, the fixed sequence (`PER_LEVEL = 2`), open skills, adaptive aiming at `TARGET`, mastery, interleaving.
- `polynomials.test.ts`: division identity, unknown coefficients, roots, inequalities, binomial series, partial fractions.
- `powers.test.ts`: index laws, roots and logs numerically on random cases.
- `practice.test.ts`: every skill × level × 60 seeds accepts its own answer and rejects a wrong one (`:34-46`), equivalent forms judged fairly, wrong forms named, every worked solution renders, worksheets stable per seed.
- `presets.test.ts`: below.
- `protocol.test.ts`: test forms stable per class code, A and B parallel (same skills and levels, different seeds), items spread over skills, every item accepts its own answer in every language (`:35-43`).
- `research.test.ts`: the study API end to end (`:98-542`): teacher password, blocks of four, loose code entry, attempts stored once with summaries, refusals, deletes, model replay of the export, class skills in curriculum order, the plan, schema migration, dashboard, phases and sessions, counterbalanced forms, server re-marking with the browser's verdict kept, late answers, phase windows.
- `sequences.test.ts`: terms, sums, limits and "first n" against brute force.
- `server.test.ts`: the board API (`:48-159`): 409 on stale saves, versions increase, compressed static files, list/read/delete, bad requests, path traversal, security headers and CSP, health and export, password gating.
- `shapes.test.ts`: every maths shape builds with finite coordinates and a board-sized bounding box, ids unique and named in `en.shapes.names`, deterministic, instruments measure true.
- `sharing.test.ts`: read-only link token format, idempotent creation, no board id leaked, follows saves, dies when revoked.
- `svg.test.ts`: dark-theme wrapping is an involution; data-URL round trip with Georgian text.
- `vectors.test.ts`: angles, points, distances against plain 3-D geometry.

#### `tests/api-docs.test.ts`

Keeps `docs/api.md` and the router equal in both directions (`:1-2`). `documented` (`:20-23`) is parsed from the Markdown table rows `| METHOD | \`path\` |`, with `[?…]` and `?…` query parts stripped; there are 22 such rows today and the test requires at least 19 and no duplicates (`:44-47`). `call` (`:26-40`) sends every request with JSON content type and the teacher header, with a `{}` body for POST/PUT, and returns the status and the `error` field if the body is JSON. `unrouted(r)` (`:42`) is the router's own "nothing here" answer: 405, or 404 with `error === "not found"`, as opposed to a route's 404 such as "no such student".

The main test (`:49-82`) first creates real resources so paths resolve: two boards (one to be deleted), a class, two students (one to be deleted), a share token. `fill` (`:56-61`) substitutes `:token`, `:id` (the doomed board for DELETE), `:code/phase`, `:code` (the leaver for DELETE), and appends `?class=` to `/dashboard`. Direction one: every documented route must not be `unrouted` (`:63-66`). Direction two (`:68-81`): for every path shape (the documented ones plus near misses such as `/api/boards/:id/extra`, `/api/classes/:code/students`, `/api/research/students.csv`, `/api/shared/:token/scene`) and every method in `GET, POST, PUT, DELETE`, if the pair is not documented it must be unrouted or a 404; so an undocumented handler fails the build, and so does a documented route that was removed.

#### `tests/dryrun.test.ts`

One server (`:16`), two worlds `elo` and `bkt` (`:18`), each a dry run of 8 students, 6 practice questions, 4-item tests, seed 2, `refreshEvery: 3` so plans are re-fetched mid-session (`:19`). Every check in `result.checks` must be ok with the world and detail in the failure message (`:20`); `analysis.testLength` is 4; `predictedLogLoss` is finite. Then the mistakes tally is run on both exports in memory (`:23-30`): practice must contain wrong answers with some named and group keys exactly `["adaptive", "fixed"]`; tests must group as `<condition> <pre|post>` with some named. The test therefore covers, through the real HTTP API in one process: class creation, randomisation, test forms, the plan, the policy, the checker on both sides, idempotent uploads, phase gating, both CSV exports, the analysis and the mistakes tally.

#### `tests/i18n.test.ts`

`shape(v, path, out)` (`:8-15`) flattens a locale object into a map from dotted path to a kind string: `array:<length>`, `function:<arity>`, or `typeof`. For `ru` and `ka` (`:18-25`) the key set must equal English's exactly (no missing, no extra, reported as lists) and every key's kind must match, so an array of hints of a different length or a formatting function with a different parameter count fails. "No untranslated blanks" (`:28-42`): any empty or whitespace-only string in a translation is a failure unless English has the same key blank (some hints are blank on purpose in all three, `:27`).

#### `tests/presets.test.ts`

Every example chip in every tool, in every language (`:1`). `specs(presets)` (`:41-44`) normalises the two preset shapes (a list, or `{ topic: list }`, of specs or `{ label, spec }`). `TOOLS` (`:46-77`) pairs thirty tools with their preset list and a render call that takes the locale's word table (`t.algoWords`, `t.pracWords`, …); statistics strips a `names` field (`:58`) and vector spaces builds full specs from `DEFAULT_SPACE` (`:76`). For each tool one test (`:81-103`) iterates `en`, `ru`, `ka` and every preset: the render must not throw, the SVG must start with `<svg`, contain neither `NaN` nor `undefined`, carry no repeated attribute in any tag (`:95-98`, a regex over every opening tag), and have positive finite width and height. It is the broadest smoke test of `src/math`: hundreds of presets × 3 languages × 30 renderers in one file.

### E2E

#### Playwright configuration

`playwright.config.ts`: tests in `e2e/` (`:12`), 60 s per test and 15 s per `expect` (`:13-14`), `workers: 1` because there is one server and one database for every test (`:15-16`), one retry on CI (`:17`), GitHub + list reporters on CI (`:18`). `use` (`:19-25`): Desktop Chrome, `baseURL http://127.0.0.1:8798`, 1280 × 860, `trace: "retain-on-failure"`, and if `PLAYWRIGHT_CHROMIUM_EXECUTABLE` is set a `launchOptions.executablePath` override so a system Chromium replaces the downloaded one (`:2-3, :9, :24`). `webServer` (`:26-33`) runs `node --disable-warning=ExperimentalWarning server/index.ts` with `PORT=8798`, a fresh `DATA_DIR` under the OS temp dir named by `Date.now()`, `APP_PASSWORD=""`, `TEACHER_PASSWORD="e2e-teacher"`, `BACKUP_KEEP="0"`, waits on `/api/health`, and never reuses a running server. `STATIC_DIR` is left at its default `dist`, so `npm run build` must precede `npm run e2e` (`:2`), as CI does (`ci.yml:40, :48`).

#### `e2e/board.spec.ts`

A teacher's board survives a reload and reaches the server (`:1-2`). Page errors are collected (`:6-7`). Click "New board" on the home page, wait for `#/b/<uuid>`, wait for `.excalidraw` (`:8-12`). Insert "Right triangle" and "Dice to roll" from the Shapes panel, reopening the panel each time because it closes after an insert (`:14-18`). Click the dice's centre to activate the embedded live piece (Excalidraw's "click to interact", `:20-24`), press Roll. `saved()` reads `/api/boards/:id` and counts elements and the dice element's `customData.state.history` (`:28-33`); `expect.poll` waits for one roll on the server and more than two elements (`:34-36`). After `page.reload()` the `.live-dice .live-history .live-chip` count is 1, the server copy is unchanged, and no page error was thrown (`:38-43`).

#### `e2e/practice.spec.ts`

Free practice in the browser (`:1-3`). The dialog's question comes from `Math.random`, so the test pins it: `questionWith(skill, ok)` (`:12-19`) scans `r = i/501`, builds `exercise(skill, 1, floor(r·2³¹), w)` with the same `src/math/practice.ts` the page uses, and returns the first with the wanted trap. `practise` (`:21-32`) creates a board by API, opens it, presses Ctrl+K, types "Practice", Enter, picks the area tab, overrides `Math.random` in the page to return `r`, selects easy and the skill button.

Test one (`:34-48`): a fractions question with an `addAcross` trap; `check(ex, typed, w)` locally must name `addAcross`; in the page the typed trap gives `.practice-verdict.bad` containing "Not quite — try again." and `.practice-hint` with the same hint text the checker returned; the right answer then shows "Correct!". Test two (`:50-56`): an inequalities question whose answer contains `>=` or `<=`, typed with `≥`/`≤`, is accepted.

Test three (`:58-73`): practice without a board. From the home page the "Start practising" link must lead to `#/practice` and a "Practice" heading; with no board to insert into, there is neither a worksheet radio (`w.ui.sheet`) nor an Insert button. With `Math.random` pinned, easy and Fractions are picked and the question's own answer gives "Correct!".

Test four (`:75-104`): practice docked beside a board. A board is made by API and practice opened with Ctrl+K as in `practise`; it must appear as a `complementary` landmark named "Practice" while no `dialog` exists, and the board's `.canvas-wrap` must end at or left of the panel's left edge (1 px of slack). `2; -3` typed key by key with `pressSequentially` must stay in the answer field ("Typing an answer stays in the answer field rather than reaching the board's shortcuts"). Insert puts the question on the board (an "Edit practice sheet" button appears) and the panel stays; opening Formula from the Algebra menu brings up a dialog while the panel stays visible; after Escape, the panel's Close button removes it.

#### `e2e/print.spec.ts`

Printing both test forms with keys (`:1`). A class "Paper class" with `algebra` and `testLength: 6` is created by API with the teacher header (`:5`); the teacher page is opened, the password typed, the class picked, "Print the tests" clicked (`:6-10`). In the dialog: six items under `[data-form="A"]` and `[data-form="B"]`, six under `[data-key="A"]`, the title "Paper class: test, form B", and every question's `.sr-only` text longer than five characters (`:12-18`). Under `emulateMedia({ media: "print" })` the action bar and the page's own headings are hidden; `page.pdf({ format: "A4" })` is produced and its `/Type /Page` objects counted, at least 4 (a page per form and per key, `:20-26`). Back to screen media, Close removes the dialog (`:27-29`).

#### `e2e/share.spec.ts`

A read-only link (`:1-2`). The owner makes a board, inserts a Protractor, and the test waits until the server copy has elements (`:8-16`). Share → "Make a link" yields a URL matching `#/s/<22 url-safe chars>` (`:18-21`). A second browser context opens it; the first `/api/shared/` response is captured and must hold elements; the viewer sees "Read-only" and has neither a Shapes nor a Share button (`:23-30`). The owner inserts a Kite; the viewer's polling must produce a `/api/shared/` response with more elements within 20 s (`:32-36`). The owner clicks "Stop sharing"; the viewer sees "This link no longer works" within 20 s (`:38-40`).

#### `e2e/study.spec.ts`

The class study from both sides (`:1-2`). Teacher: `#/teacher`, password, name "E2E class", "Questions per test" 4, area Algebra, "Create class"; the heading must show the new class and the code must match `^[A-Z0-9]{6}$` (`:17-28`). Student, in its own context: a board by API, `openPractice` (Ctrl+K, "Practice", Enter, wait for `.practice-join` or `.practice-class`, `:7-13`), expand the join section, type the code, Join is disabled until the consent box "I understand and want to take part" is checked, then join; the student code `Student XXXX-XXXX` appears (`:31-41`). Class practice: "Chosen for you:" is visible; the question's `.preview .sr-only` has words for a screen reader; wrong answers of several kinds are tried until one is marked `bad` rather than sent back for its form (`:43-55`); "Not quite — try again.", "Show solution", "Next" (`:56-58`). The attempts export for the class, fetched with the teacher header, must have exactly one row (`:60-63`). The teacher clicks "Pre-test" (its `aria-pressed` becomes true); the student reloads, reopens practice, and sees "No marks during the test" (`:65-70`).


## 11. Cross-cutting invariants, conventions and traps

This section collects the rules that hold across folders. Each one is enforced somewhere in code or tests; breaking it breaks a guarantee that another part of the system relies on.

### 11.1 Things that must never change once a study has started

- **What a seed means.** `exercise(skill, level, seed, w)` must return the same question forever. A generator edit that changes the draw order, the ranges or a rejection condition silently rewrites every stored attempt and every test form. The two guards are `FIRST_SKILLS` (`src/math/practiceSkills.ts:17-23`), used by the migration that gives pre-existing classes an explicit skill list, and `SIM_SKILLS` (`src/model/simulate.ts`), which pins the 38 skills the published simulation CSVs were made with. New skills go to the end of `SKILLS` and only join classes made afterwards.
- **The curriculum order.** `CURRICULUM` and `PREREQUISITES` in `src/model/curriculum.ts` fix the fixed condition's sequence and the adaptive condition's unlock graph. Reordering changes what `position` means for every fixed-condition student.
- **The policy constants.** `TARGET`, `MASTERED_AT`, `UNLOCK_AT`, `RECENCY_PENALTY`, `RECENT`, `PER_LEVEL` (`src/model/policy.ts`) and `DEFAULT_PARAMS` (`src/model/elo.ts`) are read by the browser, the server, the dashboard and the simulations. The simulations pass alternatives as options rather than editing the constants.
- **`evidence()`.** One function (`src/model/evaluate.ts`) decides what an attempt teaches the model. The browser (`attemptEvidence`), the server's replay (`currentModel`), the dashboard and the offline CSV replay all call it, so they cannot disagree; the test in `tests/research.test.ts` pins that replaying the export reproduces the server's model.

### 11.2 Module boundaries

- `src/math` and `src/model` import nothing from React or Node. `src/math` imports one type from `../locales/en`. `src/model` imports only `practiceSkills.ts` and `distributions.ts` from `src/math`.
- Every import inside `server/`, `src/model/`, `src/math/practiceSkills.ts` and `src/math/distributions.ts` names its `.ts` extension, because bare Node does not guess extensions. The rest of `src/math` was written for Vite and imports `"./chart"`; anything on Node that reaches those files runs with `--import ./scripts/ts-register.mjs`.
- The Docker image copies `server/`, `src/model/` and `src/math/practiceSkills.ts`, and loads the checker from the Vite SSR bundle named by `ZENO_CHECKER`. Adding a new `src/` import to the server means either adding it to the Dockerfile or routing it through the bundle.
- `ru.ts` and `ka.ts` are typed against `en.ts` (`Dict`), so a missing key fails `npm run typecheck`, and `tests/i18n.test.ts` checks the key sets at runtime. Tool dialogs take their words through `useI18n().t` and the maths modules take a `*Words` slice as an argument, never the whole dictionary.

### 11.3 Verdicts and what counts

- The checker's result is `{ ok, why?, close?, mistake?, hint? }`. `verdictOf` collapses it to `correct | form | close | wrong`, in that priority. A `why` always wins over `close`, so the checker never emits a bare `close`; the value survives in the data format for a future checker.
- A `form` answer is invisible to the miss counter, the review list, the model and the summary columns. `retries` counts them. `ms_first` is the time of the first answer of any verdict, including a form message.
- A recognised mistake is still `wrong`. `mistake` and `hint` change only what the student reads, never the data, and the test runner never shows them.
- The server's verdict replaces the browser's; the browser's is kept as `client` (attempts) or `client_verdict` (tests) only where it differed. `parseAttempt` validates consistency against the browser's verdicts, so a remarked row can read `outcome = solved, first_correct = 0`.

### 11.4 Time and ordering

- Board saves carry `baseUpdatedAt`; a mismatch is 409 and autosave pauses until the user chooses. `updated_at` is `max(now, previous + 1)`, strictly increasing even within one millisecond.
- Phase changes are logged, never overwritten. An answer is on time if it falls inside a window of an allowed phase or within `GRACE` (five minutes) after it closes. Late answers are stored with `late = 1`; only a test that never started is refused.
- The outbox sends oldest first and stops at the first record that must wait, so records reach the server in order. `clientId` is unique and the insert is `INSERT OR IGNORE`, so a retry after a lost response stores nothing twice. A record refused with 400, 404 or 413 is dropped with a console warning, since resending cannot help.
- `keepalive` fetches are capped by browsers at 64 KB; `api.ts` turns `keepalive` off above 60,000 bytes so a large save still goes out as an ordinary request.
- Question timings use `performance.now()`, not `Date.now()`, so a clock change mid-question does not distort `ms`. `shownAt` uses `Date.now()` because it is a timestamp, not a duration.
- The browser re-fetches the plan every 30 seconds but takes only the protocol fields from it (`withProtocol`), keeping the model and position it has carried forward.

### 11.5 Identity and privacy

- A student is an 8-character code from an alphabet without 0/O/1/I/L, normalised by `normalizeCode` so case and the dash do not matter. The code is sufficient to read the plan, upload answers and delete the record.
- Exports name students `s<id>` and never contain codes. Typed answers are JSON-encoded in CSV so `=1+2` cannot become a spreadsheet formula.
- The read-only board token is 16 random bytes in base64url and reveals nothing about the board id. The share route returns the scene without the id.

### 11.6 HTTP conventions

- Bodies must be `application/json`, at most 25 MB for boards and 64 KB for study routes; other content types are 415, oversize is 413 with the connection closed.
- Paths under `/api/` never go deeper than `/api/resource/id/sub`; anything deeper is 404, a known path with the wrong method is 405. `tests/api-docs.test.ts` checks the route table in `docs/api.md` against the running server in both directions.
- Hashed assets under `/assets/` and `/fonts/` are `immutable` for a year and a missing one is 404 rather than the SPA fallback, so a page left open across a rebuild reloads instead of parsing HTML as JavaScript. Everything else is `no-cache`. The HTML carries the CSP.
- The limiter counts wrong site and teacher passwords together per client; a request with no password never counts. Behind a proxy the client is the *last* `X-Forwarded-For` entry, the one the proxy appended.

### 11.7 Rendering conventions

- A tool dialog returns a spec plus an image: an SVG string for every tool except `3d`, which returns a PNG data URL from the three.js canvas. The board stores the spec in the element's `customData` so the picture can be reopened and regenerated.
- Dark boards do not re-render pictures. `darkSvg` (`src/math/svg.ts:27`) wraps the SVG's content in a `<g filter>` that inverts the colours and rotates hue by 180°, the same transform Excalidraw applies to its own canvas, so white becomes the board grey and blue stays blue; `lightSvg` removes the wrapper exactly, and `isDarkSvg` detects it by the `data-zeno-dark` marker.
- `svgToDataUrl` base64-encodes in slices, because `String.fromCharCode(...bytes)` overflows the argument limit on large pictures and a byte-by-byte loop was slow.
- LaTeX goes through MathJax (`latexToSvg` in `src/math/latex.ts`); the practice dialog renders the typed answer with `useDeferredValue` so a keystroke is not blocked by typesetting.
- `SHAPES` in `src/math/shapes.ts` has 82 entries: the 72 drawn shapes in seven groups plus 10 entries in the `live` group that are previews of the live pieces.

### 11.8 Things the readers noticed while explaining

- The header comment of `scripts/thesis-figures.ts` says Mermaid is loaded from jsDelivr and needs the network; the code loads it from `node_modules/mermaid/dist/mermaid.min.js`, a transitive dependency of `@excalidraw/mermaid-to-excalidraw`. The comment is stale; the behaviour is the offline one.
- A real bug, cosmetic: the Pascal row caption in `src/math/combinatorics.ts:339` turns the row number into superscript digits with `String(n).replace(/d/g, …)`. The pattern matches the letter d, not a digit, so nothing is replaced and the caption reads `25` where it means `2⁵`. The fix is `/\d/g`.
- The field comment on `unfold` in `src/three/spec.ts:23` says nets exist for the cuboid and pyramid only; `canUnfold` at `src/three/spec.ts:117` also allows the prism, cylinder and cone, and `build.ts` draws all five nets. The comment is stale.
- The README counts 72 shapes; the `SHAPES` table has 82 entries because the live previews share it. Both numbers are right about different things.
- The checker credits two inputs a teacher would not (`13*17` for a product question, an integral without `+ C`) and refuses `50%` as a probability. These are measured in `docs/study.md` and pinned by `tests/checker.test.ts` so the agreement rate cannot fall silently.
