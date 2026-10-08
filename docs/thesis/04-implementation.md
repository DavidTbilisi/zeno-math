# 4 Implementation

This chapter describes how the design of chapter 3 is built. It follows one practice question through the system:
how the question is made, how an answer is marked, what the learner model learns from it, how the next question is
chosen, how the record reaches the server, and what the teacher sees. The whiteboard is described first and only
briefly. It is the platform the study runs inside, not the subject of the research.

Zeno is written in TypeScript throughout. The browser side uses React 19 and Vite, and the board itself is Excalidraw
[@excalidraw]. The server runs on Node 24 with no web framework. It runs the TypeScript sources directly, by stripping
the types, and stores everything in one SQLite file through the built-in `node:sqlite` module. Two folders hold code
that runs on both sides: `src/math` (question generators, the answer checker, exact arithmetic, drawings) and
`src/model` (the learner model, the policies, the test forms, the evaluation and the analysis). Neither folder imports
anything from the browser or from Node. This is what lets the same learner model run on the server and in a student's
browser (section 4.5).

## 4.1 The whiteboard

A board is an Excalidraw scene saved on the server. The board page (`src/pages/BoardPage.tsx`) saves automatically a
short while after each change. Every save carries the time of the version the browser last saw (`baseUpdatedAt`). If
someone else has saved the board since, the server refuses the save with HTTP 409. The browser then stops saving and
asks the user to keep their own version or load the other one. No edit is silently lost, but two people editing one
board take turns rather than seeing each other's changes live (chapter 3).

The maths content sits around the board:

- **33 tool dialogs** (`src/tools.tsx`). Each draws a picture for the board, such as a graph, a fraction bar model, a
  geometry construction or a worked solution. Each dialog's code is loaded the first time it is opened, so the board
  itself stays small.
- **72 ready-made shapes** in seven groups, such as a protractor, axes, number lines and nets of solids. There are also
  **10 live pieces**, such as a clock, dice, a spinner and a ten-frame. These are drawn by React inside the board, so a
  teacher can turn the clock's hands or roll the dice during a lesson (`src/live/`).
- **Three languages.** English, Russian and Georgian dictionaries are each loaded on demand (`src/i18n.tsx`). A
  dictionary that is missing a key fails the typecheck, because `ru.ts` and `ka.ts` are typed against `en.ts`.

A board can also be shared read-only. The link carries a random token, not the board's id, so a viewer can see the
board but cannot edit it. The board lists, the tools and the shapes are not part of the study. The rest of this
chapter is about practice.

![The board with a tool dialog open.](../screenshots/board.png)

## 4.2 The practice engine

### 4.2.1 Questions from a seed

Practice covers **42 skills** in five areas (`src/math/practiceSkills.ts`):

| Area | Skills |
|---|---|
| number (8) | times tables, negative numbers, order of operations, fractions, percentages, rounding and estimation, HCF and LCM, prime factors |
| algebra (13) | linear equations, inequalities, expanding, factorising, quadratics, simultaneous equations, polynomials, indices, logarithms, surds, sequences, series, functions |
| geometry (10) | straight lines, distance and midpoint, exact trigonometric values, right triangles, circles, similarity, volume and surface area, trigonometric identities, vectors, the angle between vectors |
| calculus (7) | differentiation, tangents, stationary points, integration, definite integrals, numerical roots, numerical integration |
| data (4) | averages and spread, probability, counting, confidence intervals |

Each skill has a generator for each of three levels (easy, medium, hard), so the engine has 42 × 3 = 126 kinds of
question. A generator is a function of a random number generator, the level and the words of the current language
(`GENS` in `src/math/practice.ts`). The random numbers come from mulberry32, a small 32-bit generator. It is seeded
with one integer, so the same seed always gives the same sequence:

```ts
/** The exercise for a skill, level and seed: always the same one. */
export function exercise(skill: SkillId, level: Level, seed: number, w: PracticeWords): Exercise {
  exprMessages(w);
  const r = rngOf(seed);
  return { skill, level, seed, ...GENS[skill](r, level, w) };
}
```

A question is therefore fully described by three numbers: skill, level and seed. The browser picks a fresh seed for
each practice question, uniformly from $[0, 2^{31})$. The tests derive their seeds from the class code (section 4.6).
This has three consequences that the rest of the system depends on:

1. **Storage is small.** An attempt stores the three numbers and what the student typed, never the question's text.
2. **Every question can be rebuilt.** The analysis scripts, the dry run and `npm run mistakes` regenerate the exact
   question a student saw, years later, and mark the answer again with the current checker.
3. **Generators are frozen once a study starts.** If a generator is changed, an old seed no longer means the question
   that was asked. The same care applies to adding skills: the four newest ones join only classes made after them, and
   the simulations keep the 38 skills their results were made on (section 5.3).

A generated `Exercise` holds:

- the instruction in words and the question in LaTeX;
- the expected `answer`;
- the answer as LaTeX (`show`) and as a typed string that the checker must accept (`plain`), which the test suite uses
  to check every generator against its own checker;
- a format hint shown next to the input box (fraction, exact, roots, inequality and so on);
- a worked solution.

The worked solution is either a specification for one of the tool dialogs, which draws it, or a list of worked lines
when no tool fits. For example, the fractions generator asks the bar-model tool to draw the operation, and the order of
operations generator writes out each step of the working.

Generators avoid questions that are ambiguous or unfair. As an example, the order of operations generator builds each
question from a fixed list of shapes per level, such as `a + b * c` at level 1 or `(a + b) ^ 2 - c * d` at level 3.
The list never contains `a ÷ b(c + d)`, whose meaning people disagree about. The generator draws numbers into the
shape and parses the result into a small expression tree. It then reduces the tree one operation at a time, which gives
the worked lines. If any number in any line is not a whole number, or the answer is larger than 999, it draws again.

### 4.2.2 Marking an answer

`check(exercise, input)` returns a **verdict**:

```ts
export type Verdict = { ok: boolean; why?: string; close?: boolean; mistake?: MistakeId; hint?: string };
```

The checker first reads the input according to the kind of answer expected:

| Answer kind | Read as | Compared by |
|---|---|---|
| number | a number, fraction, mixed number, surd or expression such as `2sqrt(3)/3`; `x = 2`, `25%`, `35°` accepted | value, within a tolerance set by the question |
| set (roots) | a list split on `;`, `,`, "and", "or" (in all three languages) and `±` | the same values in any order |
| tuple (a point, a vector) | an ordered list; `y = 3; x = 2` reordered by name | value, position by position |
| expression | an expression in $x$ | its value at 16 fixed sample points |
| prime factorisation | a product of powers | the product, then whether every factor is prime |
| inequality | `x >= 4`, `4 ≤ x`, `-1 < x <= 3`, `[4, ∞)`, `(-2; 3]` | both ends, and whether each is included |

Comparing expressions at sample points tests whether two expressions are *equal as functions*, not whether they are
written the same way. It accepts any correct rearrangement, which is what a teacher accepts. An indefinite integral is
compared up to a constant: the difference from the expected answer must be the same at every sample point.
Standard-form answers are compared *relatively* (within $10^{-9}$ of the expected value's size), because an absolute
tolerance would accept $9 \times 10^{-10}$ for $7.31 \times 10^{-12}$.

An answer can be *equal in value but in the wrong form*. Examples are $\tfrac{4}{6}$ where lowest terms are asked
for, $\sqrt{12}$ instead of $2\sqrt{3}$, an expanded quadratic where factorised form is asked for, or 0.00063 where
standard form is asked for. These, and inputs that cannot be read, get a `why`: a short message that says what to fix.
The browser turns a verdict into one of four logged verdicts:

```ts
export const verdictOf = (v: Verdict): AnswerVerdict => (v.ok ? "correct" : v.why ? "form" : v.close ? "close" : "wrong");
```

**A "form" answer is sent back and does not count.** The student sees the message and tries again, and neither the
learner model nor the miss counter sees the attempt. There are two reasons for this choice. First, the study measures
whether a student can do the mathematics. Penalising notation would add noise that has nothing to do with the
condition. Second, the model learns from the *first counted answer* (section 4.3). If a missing "lowest terms" step
counted as a wrong answer, a student who knows how to add fractions would be rated as not knowing it. Chapter 5 reports
the cost of this leniency: when a teacher would give a rounding slip "close", the checker sends it back instead.

Every message the checker can give comes with `why`, so the checker never returns a bare "close" verdict. The `close`
value is kept in the data format so that a later checker can use it.

### 4.2.3 Naming the mistake

A wrong answer is often wrong in a predictable way. The answer ½ + ⅓ = 2/5 comes from adding the tops and the bottoms,
and $(x + 3)^2 = x^2 + 9$ comes from squaring each term. Since a generator knows the numbers in its question, it can
work out the answer each known mistake would give. It attaches these as **traps** on the expected answer:

```ts
type Trap = { id: MistakeId; a: Answer; vars?: Record<string, string | number> };
```

For the fractions example, the generator adds an `addAcross` trap whenever it asks for a sum of two proper fractions.
The trap's answer is $(a + c)/(b + d)$. Its `vars` hold the wrong result and the larger of the two fractions, so the
hint can name them.

`check()` uses the traps only when the answer is plainly wrong. A form message or a near miss says more than naming a
mistake would, so those come first:

```ts
const v = judge(ex.answer, src, w);
if (v.ok || v.why || v.close) return v;
for (const t of trapsOf(ex.answer))
  if (judge(t.a, src, w).ok) return { ok: false, mistake: t.id, hint: fill(w.mistakes[t.id], t.vars ?? {}) };
return v;
```

Each trap is matched with the same `judge` function that marks real answers. A student who types a trap's answer in
any equivalent form, such as 0.4 for 2/5, is recognised. `trapsOf` adds one generic trap to the question's own:
**right size, wrong sign**. For a number this is $-v$. For a set of roots it is every root negated, the usual slip when
reading roots off $(x - 3)(x + 2)$. For an expression it is $-f(x)$. The sign trap is left out when the answer is zero,
or when a question's own trap already gives that value.

Zeno knows 17 mistakes (`src/math/mistakes.ts`):

| Id | Where it is checked | The wrong answer it recognises |
|---|---|---|
| `sign` | every number, set of roots and expression answer | the right size with the wrong sign |
| `addAcross` | fractions, + without mixed numbers | tops added and bottoms added: $\frac{a+c}{b+d}$ |
| `flipFirst` | fractions, ÷ | the first fraction turned upside down instead of the second |
| `squareTerms` | expanding $(ax + b)^2$ | $a^2x^2 + b^2$ |
| `noMiddle` | expanding $(x + a)(x + b)$ | $x^2 + ab$ |
| `negPower` | indices, negative powers | $a^{-n}$ read as $-a^n$ |
| `powTimes` | indices, fractional powers | $b^{n/d}$ read as $b \cdot n/d$ |
| `subNeg` | negative numbers | $a - (-b)$ worked as $a - b$ |
| `leftToRight` | order of operations | worked strictly left to right |
| `mulBeforePow` | order of operations, $k \times a^2$ | $(k \cdot a)^2$ |
| `grouped` | order of operations | $a - b - c$ worked as $a - (b - c)$ (likewise ÷) |
| `truncated` | rounding | digits cut off where it should round up |
| `placeLost` | rounding to tens, hundreds, thousands | the place-holding zeros dropped (46 for 46 000) |
| `doubleRound` | rounding | rounded in two stages |
| `fullUnit` | bounds | ± a whole unit instead of half of one |
| `noFlip` | inequalities | the sign not turned round after × or ÷ by a negative |
| `boundary` | inequalities | < and ≤ (or > and ≥) mixed up |

A recognised mistake is **still wrong**. `why` stays unset, so `verdictOf` logs it as "wrong", the miss counter counts
it, and the learner model learns from it as from any other wrong answer. This is a deliberate choice. Feedback that
names a mistake must not change the outcome data or the learner model in either condition. What changes is what the
student reads. Under "Not quite — try again", the practice dialog shows a short hint. The hint names the slip, keeps it
small, and where it can, gives a number to test with:

> You added the tops and the bottoms. But 9/17 is smaller than 5/8, one of the fractions you added — a sum can't be.
> Give both fractions the same bottom first.

The tone of these hints, which treats a mistake as a natural slip and points to a quick self-check, was influenced by
Orlin's popular book on mathematics [CITATION NEEDED: Orlin (2025), Russian edition — author to supply]. The wording
and the catalogue are this thesis's own. The tests give no feedback, so no hint is ever shown during a pre- or
post-test.

![A practice question with a mistake named under the verdict: 4/9 + 5/8 answered as 9/17, the tops and the bottoms
added. The answer still counts as a miss.](figures/practice-mistake-hint.png)

Because questions are rebuilt from their seeds, the mistakes can also be found *after* the fact. `npm run mistakes`
(`scripts/mistakes.ts`) reads either export, rebuilds each question, marks every wrong answer again and counts the
mistakes it recognises, per condition and per test phase. This works on exports made before the checker named
mistakes. It gives the study a descriptive secondary outcome: which slips each group made, not only how many answers
were wrong.

### 4.2.4 Retries, reveals and review

In practice, the dialog allows **two counted misses** per question. After the second, it reveals the answer and the
worked solution. The student can also ask for them at any time. A question that ends revealed is put on a review list
and comes back **three questions later** (`REVIEW_AFTER = 3`), with the same seed. Both conditions are treated the same
here. A review question is logged with policy `review`, so the analysis can tell it apart from questions the condition
chose.

## 4.3 The learner model

`src/model/elo.ts` implements an Elo-style rating of students and questions, after Pelánek [@pelanek2016elo] and the
Math Garden system [@klinkenberg2011]. For student $s$ answering a question of skill $k$ (in area $a$) at level
$\ell \in \{1, 2, 3\}$, the predicted chance of a right first answer is

$$
P(\text{correct}) = \sigma\big(\theta_s + \theta_{s,a} + \theta_{s,k} - (b_k + (\ell - 2)\,\delta + r_{k,\ell})\big),
\qquad \sigma(x) = \frac{1}{1 + e^{-x}}.
$$

**Ability has three layers:** an overall ability $\theta_s$, an ability per area $\theta_{s,a}$, and an ability per
skill $\theta_{s,k}$. A skill the student has never practised starts from what they have shown in its area and
overall, not from zero. This matters for the adaptive policy, which has to rate skills before the student has seen
them.

**Difficulty belongs to a skill at a level, not to a question.** Seeds give an endless supply of questions and each is
seen once, so a single generated question can never collect evidence. The difficulty has a skill term $b_k$, shared
by all three levels, and a fixed step $\delta$ between levels. It also has a small adjustment $r_{k,\ell}$ per level.
Answers at any level move $b_k$, so the levels of a skill keep their order until the answers clearly say otherwise.

**The update.** After an answer with outcome $y \in \{0, 1\}$ and prediction $p$, the surprise $y - p$ moves every
term. Each term moves by its own uncertainty, which shrinks with the number of answers $n$ that the term has already
absorbed:

$$
U(n) = \frac{\alpha}{1 + \beta n}.
$$

$$
\begin{aligned}
\theta_s &\leftarrow \theta_s + w_g\, U(n_s)\,(y - p), &
\theta_{s,a} &\leftarrow \theta_{s,a} + w_a\, U(n_{s,a})\,(y - p), &
\theta_{s,k} &\leftarrow \theta_{s,k} + w_k\, U(n_{s,k})\,(y - p), \\
b_k &\leftarrow b_k - v_b\, U(n_k)\,(y - p), &
r_{k,\ell} &\leftarrow r_{k,\ell} - v_r\, U(n_{k,\ell})\,(y - p).
\end{aligned}
$$

New students and new skills therefore move fast, and settled ones move slowly. All five terms use the same $p$, computed
before any of them is updated. The defaults (`DEFAULT_PARAMS`) are:

| Parameter | Value | Meaning |
|---|---|---|
| $\alpha$ | 0.4 | step size for a term with no evidence |
| $\beta$ | 0.05 | how fast the step shrinks with evidence |
| $w_g, w_a, w_k$ | 0.4, 0.6, 1 | share of the surprise for the overall, area and skill abilities |
| $v_b, v_r$ | 1, 0.5 | share for the skill difficulty and the level adjustment |
| $\delta$ | 0.8 | how much harder each level starts than the one below |

These values were chosen on simulated classes, using seeds kept apart from the test suite's. They can be refitted on
real answers with `npm run model -- --fit` (section 5.2). Because every answer moves three ability layers, the total
step for a new student is about $(0.4 + 0.6 + 1)\,\alpha = 2\alpha$.

**What counts as evidence.** The model learns once per question, from the **first counted answer**. Answers sent back
for their form are skipped. If the first counted answer is right, the outcome is 1; if it is wrong, the outcome is 0. A
question revealed with no counted answer counts as 0, because the student gave up. A question skipped with only form
messages says nothing, and is ignored. The same function, `evidence()` in `src/model/evaluate.ts`, is used by the
browser, the server, the dashboard and the offline evaluation, so they cannot disagree. Test answers never reach the
model.

**Mastery.** `mastery(student, skill)` gives the predicted chance at each of the three levels. The teacher dashboard
and the adaptive policy both read it.

The model is not stored in the database. The server builds it by replaying the stored attempts in order the first time
it is needed. After that it keeps the model in memory and adds new attempts as they arrive. When a student's record is
deleted, it rebuilds the model from what is left, because one student's answers cannot be subtracted from shared
difficulties. This keeps the database the only source of truth.

## 4.4 The policies

The two study conditions differ only in how class practice chooses the next question (`src/model/policy.ts`). Feedback,
worked solutions, mistake hints and review are the same for both.

**Fixed.** The class's skills are taken in curriculum order (`CURRICULUM` in `src/model/curriculum.ts`), from times
tables to confidence intervals. Each skill is practised at levels 1, 2 and 3, with two questions at each level
(`PER_LEVEL = 2`), and then the sequence starts again. The position in the sequence is the number of questions the
fixed policy has chosen so far. The fixed policy ignores how the student is doing.

**Adaptive.** For each skill the student may practise now, and each level, the policy computes how far the model's
prediction is from a target chance $T$. It then picks the closest:

$$
\text{choose} \;\arg\min_{k \in \text{open},\; \ell \in \{1,2,3\}} \;\big|P_{s}(k, \ell) - T\big| + 0.1 \cdot \#\{\text{last 3 questions on } k\}.
$$

| Constant | Value | Role |
|---|---|---|
| `TARGET` ($T$) | 0.75 | aim for about three answers in four right, as in Math Garden [@klinkenberg2011] |
| `MASTERED_AT` | 0.8 | a skill is closed once a level-3 question would be answered right this often |
| `UNLOCK_AT` | 0.5 | a skill is held back while a level-2 question on any of its prerequisites is below this |
| `RECENCY_PENALTY`, `RECENT` | 0.1, 3 | each of the last three questions on the same skill adds 0.1 to its distance, so practice interleaves |

The open skills are those not yet mastered whose prerequisites hold. If none qualify, the open set is all the
unmastered skills. If everything is mastered, it is every skill. Prerequisites form a graph of direct dependencies,
for example inequalities ← linear equations and negative numbers, or stationary points ← differentiation and
quadratics. A prerequisite outside the class's skill list is ignored.

The unlock threshold of 0.5 was chosen after an earlier, higher threshold misbehaved in simulation. A new student is
rated at an even chance on everything. With a higher bar, every new student first had to grind the root skills, and in
simulated classes a fifth of all practice went to each root skill. At 0.5, every skill starts open, and a skill closes
only once the student has shown weakness in what it builds on. Exact ties are broken at random.

The target of 0.75 is an assumption, not a result. The simulation study in section 5.3 finds that a target of 0.6 is
never worse than the fixed sequence under any assumption tested. `TARGET` is a single constant, and simulations pass a
different `target` to compare.

## 4.5 The student's browser

### 4.5.1 Joining and the plan

A student joins a class from the practice dialog. They see what is saved, that the class is split into two groups at
random, that taking part is voluntary, and how to delete their data. They then tick that they agree and type the class
code. The server answers with a student code such as `7K3M-QX9P`. The code is all that identifies the student, and it
brings their record back on any device. Codes use an alphabet without 0, O, 1, I and L, because children read them
off paper.

Class practice starts by fetching the student's **plan** (`GET /api/students/:code/plan`). It contains:

- the condition and the class's skills;
- the position in the fixed sequence;
- the last three skills practised;
- the learner model's state: every skill and level difficulty, plus this student's own ratings, sent under the name
  `me`;
- the class's phase, the session's end time and the test length, and which test questions the student has answered.

The browser turns the state back into an `EloModel` (`EloModel.fromState`) and from then on **carries the plan
forward itself**. After each question it updates the model with the same `evidence` rule, advances the fixed position
if the fixed policy chose the question, and appends the skill to the recent list (`applyAttempt` in `src/learner.ts`).
The next question is chosen locally, by the same `choose()` function the simulations use. Class practice therefore
continues if the classroom Wi-Fi drops in the middle of a lesson. The browser asks for the plan again every 30
seconds, but takes only the protocol from the new plan: the phase, the session end and the tests. This way the
teacher's phase changes reach the students, and the model the browser has carried forward is kept.

Every question shown records its origin with it: who chose it (`adaptive`, `fixed`, `free` or `review`) and the
model's prediction at that moment (`predicted`). The prediction is logged *before* the answer, so the dashboard's
calibration plot and the evaluation compare real forecasts with what happened, with no hindsight.

### 4.5.2 The outbox

When the student leaves a question, the browser builds an attempt record. A question is left by answering it, by
moving on, by changing topic or by closing the dialog. The record holds the skill, level and seed; the outcome
(`solved`, `revealed` or `skipped`); the policy and prediction; whether the worked solution was opened; the total time;
and every answer typed, with its verdict and the milliseconds since the question appeared. Times come from
`performance.now()`, so a change of the system clock does not distort them. The record is given a random 128-bit
`clientId` and appended to an **outbox** in `localStorage` (`Outbox` in `src/learner.ts`).

The outbox sends records one at a time, oldest first. Each upload ends in one of three ways:

- **stored**: the server answered 201, or 200 for a record it already had. The record is removed.
- **drop**: the server refused the record (400, 404 or 413), so sending it again cannot help. The record is removed
  and a warning is logged.
- **retry**: there was a network error or a server error. Sending stops and resumes at the next flush.

Sending stops at the first record that has to wait, so records arrive in order. On the server, `clientId` is unique,
and the insert is `INSERT OR IGNORE`, so a retried upload is stored once. On closing, the outbox is flushed with
`keepalive`, so the last record can still leave as the page closes. Test answers have their own outbox of the same
kind. When the plan is loaded, the browser first flushes both outboxes, then reapplies any record still waiting. The
plan it starts from therefore always counts everything this browser has done.

## 4.6 The server

### 4.6.1 Routes and storage

The server (`server/index.ts`) is a plain Node HTTP server. It serves the built files, and under `/api/` it serves
boards and, through `server/research.ts` and `server/protocol.ts`, the study. Appendix A lists every route. The study's
tables are `classes`, `students`, `attempts` and `test_responses`; appendix B has the data model. Deleting a student
deletes their attempts and test answers (`ON DELETE CASCADE`). Columns added after the first version are added when
the server starts, so an older database is upgraded in place. The schema version is kept in `PRAGMA user_version`
(currently 4), and a database from a newer Zeno is refused rather than half understood. A daily `VACUUM INTO` copy
goes to `DATA_DIR/backups/`, and the last seven are kept.

**Randomisation.** Each class keeps a randomisation *block*: a shuffled list of two `adaptive` and two `fixed`
conditions. Each new student takes the next condition from the block, and an empty block is refilled with a new
shuffle. The two groups therefore never differ by more than two students. `node:sqlite` is synchronous, so nothing else runs
between reading the block and writing it back, and two students joining at the same moment cannot take the same
place in it. Within each condition, students alternate between test order AB and BA.

**What the server checks.** An attempt is validated field by field (`parseAttempt`):

- the skill and level exist, and the seed is in range;
- the policy matches the `review` flag;
- the outcome agrees with the answers: `solved` ends on a correct answer, nothing follows a correct answer, and a skip
  had at least one try;
- times are below one day;
- the answer list is at most 50 long, and each input at most 200 characters.

The summary columns are computed from the answers on the server, so they cannot disagree with them: whether the first
counted answer was right, the number of counted misses, and the number of form retries. A class-practice attempt
whose policy is not the student's own condition is refused. This is the one guarantee the server can give about
question choice, since the choice itself happens in the browser.

**The server marks every answer again** (`server/marking.ts`). A question is fixed by its skill, level and seed, so
the browser's verdict is a claim the server can check with the same checker. Each answer of an attempt gets the
server's verdict; where the browser's differed, it is kept as `client`, and the attempt's `remarked` column counts
them. The summary columns, and so the learner model, use the server's verdicts. The outcome (solved, revealed,
skipped) is the browser's account of what the student did and stays as sent. A test answer is marked the same way,
with the browser's verdict in `client_verdict` where it differs. The two agree unless the browser runs different code:
a page left open across an update, or a modified client. The dry run checks that they agree on every answer.

The checker imports mathjs and MathJax, and the Docker image has no `node_modules`. The build therefore bundles the
checker into one 2.8 MB file (`npm run build:checker`, with Vite), which the image loads through `ZENO_CHECKER`;
elsewhere the server loads it from source. Continuous integration checks the bundle in the built image by posting a
practice answer the browser calls right and the server marks wrong.

### 4.6.2 The protocol and the tests

A class has a **phase** that the teacher sets: `open`, `pretest`, `session`, `posttest` or `closed`. A timed session
takes a number of minutes, from 1 to 240. It records its end time, so every student in the room has the same window.
The phase controls what the practice dialog offers. During a test, class practice waits. After a session ends, class
practice stops but free practice stays open.

The server logs each change in `class_phases`, so it knows the class's history as a list of windows: each phase from
its start to the next change, and a session only until its time is up. An answer is *on time* if it arrives during a
window of its phase or within a grace of five minutes after one ends; the grace covers the 30-second poll and a
question finished as time runs out. A test answer for a test that has never started is refused, since no honest
browser can send one. An answer that arrives late is stored with `late` set rather than refused, because a browser
keeps its answers while offline and would otherwise lose them; `npm run analyse` reports the late answers per group.

The **test forms** are built from the class code (`src/model/testForms.ts`). Item $i$ of form $F$ has the seed
$\mathrm{FNV1a}(\text{code}:F:i)$. Its skills spread evenly over the class's skills, and its levels cycle medium,
easy, hard. Forms A and B therefore ask about the same skills at the same levels in the same order, with different
questions from the same generators. The server and every browser build the same forms without storing them. The test
length is set per class, from 4 to 30 questions, with a default of 12.

A test shows no marks, no hints and no solutions. Only a form message, such as "lowest terms", allows another try, and
the number of such retries is stored. Passing over a question counts as an answer. A test answer sends only the
question's *number*. The server works out which question that was from the class code, the student's form and the
number, so a client cannot answer a question that was not on its test. The pair (student, test, question) is unique,
so each question is answered once, and a repeat keeps the first answer. Test answers are stored apart from attempts,
and `currentModel` never reads them. The outcome measure is therefore independent of what the adaptive condition
learns from.

### 4.6.3 Security and privacy

The server is meant to run in a school, on a machine the school controls, behind Caddy for HTTPS. The measures it
takes are:

- **No personal data.** There are no accounts, names or e-mail addresses. Exports name students `s1`, `s2`, … and
  never include the sign-in codes, so a published data set cannot be used to sign in.
- **Passwords.** An optional site password (HTTP Basic) protects everything except the health check. A teacher
  password protects class management, the dashboard and the exports. Both are compared in constant time
  (`timingSafeEqual`).
- **Brute-force limiting.** Ten wrong passwords from one client within ten minutes, counting site and teacher
  passwords together, and that client gets 429 with `Retry-After` until the window passes. A request with no password
  at all does not count. Behind a proxy (`TRUST_PROXY`), the client is the last address in `X-Forwarded-For`, which
  is the one the proxy added itself.
- **Requests.** Request bodies must be JSON, which a cross-site HTML form cannot send without a preflight. Size limits
  apply: 64 KB for study records and 25 MB for a board.
- **Response headers.** The page is served with a Content Security Policy that allows no inline scripts and loads
  everything from the server itself, with one optional exception: the Excalidraw library browser. `nosniff`,
  `X-Frame-Options` and `Referrer-Policy` are also set.
- **Exports.** Typed answers are written as JSON strings, so a spreadsheet never reads an input such as `=1+2` as a
  formula. Static files are checked against path traversal, and routes deeper than `/api/resource/id/sub` return 404.

A student's code is enough to delete their record. This is deliberate: the code is the only link between a child and
their answers, so whoever holds it can exercise the right to erasure.

## 4.7 The teacher dashboard

The teacher page (`#/teacher`, `src/pages/TeacherPage.tsx`) is where a study is run. A teacher makes a class, choosing
its skills by skill or by area. The page hands out the class code, sets the phase (and a session's minutes), and prints
both test forms with answer keys, for use as a paper backup. For a selected class, it shows the data computed by
`server/dashboard.ts`:

- **The two groups side by side:** students, questions answered, right first time, the model's mean prediction for
  questions class practice chose and its mean distance from the 75 % target, the median time per question, how often
  the worked solution was opened, how often a question was left unfinished, and the mean practice minutes per
  student. This last figure is the check that both groups had equal practice time.
- **The tests:** pre- and post-test scores per group as mean (SD, n), over tests with every question answered. Also the
  gain for students who completed both, Cohen's d of the gain (labelled as a first look; the planned analysis is
  `npm run analyse`), and the two forms compared on the pre-test.
- **Mastery by skill:** a heatmap with one row per student, grouped by condition with the group mean on top, and one
  column per skill. Each cell shows the model's chance at medium level, in five 20 % bins of one hue. Grey means no
  answers yet. A cell's tooltip shows all three levels, and "show numbers" writes the percentages into the cells, so
  nothing depends on colour alone.
- **Calibration:** each logged prediction against what the student then did, in bins, with log-loss, AUC and a table
  view.

The dashboard uses the same `evidence` rule, the same model and the same `TARGET` constant as the rest of the system.

![The teacher dashboard after a dry run of 24 simulated students: the two groups side by side, and the pre- and
post-test with the form check.](figures/dashboard-groups.png)

![The same dashboard: mastery of each skill for every student, with each group's average on top and the test scores
beside it, and the calibration of the model's logged predictions. Fixed practice had not yet reached the later skills
after 30 questions, so their cells are grey.](figures/dashboard-mastery.png)

## 4.8 Summary

The implementation follows from three choices made in chapter 3:

- **Questions are generated from seeds.** This makes every question reproducible, the tests storage-free, and every
  answer re-markable.
- **The learner model is a small online Elo rating.** It runs in the browser as well as on the server, so practice
  survives a dropped connection.
- **Marking and feedback are the same in both conditions.** Only `choose()` differs between them. Form messages and
  named mistakes are designed so that they do not touch the outcome data.

Chapter 5 tests these claims. It measures the checker against teacher marking, the model against real and simulated
students, and the whole protocol in a dry run through this server.
