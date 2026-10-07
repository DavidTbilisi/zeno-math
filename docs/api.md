# Zeno HTTP API

Everything the browser does goes through these routes, served by `server/index.ts` (boards), `server/research.ts`
(the class study) and `server/protocol.ts` (its phases and tests). Bodies are JSON (`Content-Type:
application/json`; anything else is refused with 415, so a cross-site form can't post), at most 25 MB, or 64 KB for
the study's routes. Errors come back as `{ "error": "…" }` with the status.

**Who may call a route:**

- *anyone*: anyone who passed the site password. With `APP_PASSWORD` set, every route except `/api/health` needs HTTP
  basic auth (any username).
- *teacher*: also needs the header `X-Teacher-Password` when `TEACHER_PASSWORD` is set; otherwise 403.

After 10 wrong passwords (site or teacher) in 10 minutes, a client gets **429** with `Retry-After`, whatever it
sends, until the oldest of them leaves the window.
- *student*: anyone holding a student code. The code is the only thing tying answers to a student, so knowing it is
  enough.

`tests/api-docs.test.ts` checks this table against a running server. Every route listed must exist, and every other
method and path on these resources must answer 404 or 405, so a route added without documenting it fails the tests.

## Routes

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/health` | anyone, no password | `{ ok: true }` once the database answers; Docker's health check |
| GET | `/api/export` | anyone | every board with its scene, as a JSON download (`zeno-boards-DATE.json`) |
| GET | `/api/boards` | anyone | the board list: `[{ id, title, createdAt, updatedAt }]`, newest first |
| POST | `/api/boards` | anyone | a new board from `{ title? }` (trimmed, at most 200 characters): 201 with `{ id, title, createdAt, updatedAt }` |
| GET | `/api/boards/:id` | anyone | `{ id, title, scene, updatedAt }`; 404 if there is no such board |
| PUT | `/api/boards/:id` | anyone | save `{ title?, scene?, baseUpdatedAt? }`; see *Saving a board* |
| DELETE | `/api/boards/:id` | anyone | delete the board: 204 |
| GET | `/api/classes` | teacher | every class: code, name, skills, phase, sessionEnds, testLength, students per condition, attempts |
| POST | `/api/classes` | teacher | a new class from `{ name?, skills?, testLength? }`: 201 with its code |
| POST | `/api/classes/:code/phase` | teacher | move the class on: `{ phase, minutes? }`; see *The protocol* |
| POST | `/api/students` | anyone | join a class: `{ class }` gives 201 `{ code, class, condition }`, randomised in blocks of four |
| GET | `/api/students/:code` | student | `{ code, class, condition, answered }` |
| DELETE | `/api/students/:code` | student | delete the student and everything saved under the code: 204 |
| GET | `/api/students/:code/plan` | student | what the browser needs to choose class practice; see *The plan* |
| POST | `/api/attempts` | student | one practice question; see *Attempts* |
| POST | `/api/tests` | student | one test answer; see *Test answers* |
| GET | `/api/research/dashboard?class=CODE` | teacher | the teacher page's data for one class; see *Dashboard* |
| GET | `/api/research/attempts.csv[?class=CODE]` | teacher | every practice attempt as CSV |
| GET | `/api/research/tests.csv[?class=CODE]` | teacher | every test answer as CSV |

Anything else under `/api/` is 404, and a known path with the wrong method is 405. Paths outside `/api/` serve the
built app: hashed assets are cached for a year, and the page itself comes with a strict Content-Security-Policy.

## Saving a board

`PUT /api/boards/:id` takes any of `title`, `scene` and `baseUpdatedAt`:

- **`scene`** must be an object with an `elements` array, or the save is refused with 400. A scene no client can
  load would break the board for everyone.
- **`baseUpdatedAt`** is the `updatedAt` the client last saw. If someone else has saved since (another tab or
  device), the save is refused with **409** `{ error: "conflict", updatedAt }`. The board then offers "reload" or
  "keep mine"; keeping it saves again without `baseUpdatedAt`.
- **On success** the answer is 200 `{ updatedAt, previous }`. `updatedAt` always increases, even for two saves in
  the same millisecond.

## The class study

### Classes

`POST /api/classes` (teacher) takes:

- **`name`**: up to 100 characters; "Class" if empty.
- **`skills`**: skill ids and/or area names. An area means all its skills. Anything unknown gives 400. The list is
  kept in curriculum order; leaving it out means every skill.
- **`testLength`**: 4–30 questions; 12 if left out.

The class code is 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L).

### The protocol

`POST /api/classes/:code/phase` (teacher) takes `{ phase }`, one of:

- **`open`**: class practice any time.
- **`pretest`** / **`posttest`**: the test, for students who haven't finished it. Class practice waits.
- **`session`**: class practice for `minutes` (1–240), the same window for everyone, starting now.
- **`closed`**: no class practice.

It answers `{ phase, sessionEnds }`, or 404 for an unknown class. Students' browsers see the change within half a
minute, when they next ask for the plan.

### The plan

`GET /api/students/:code/plan` returns:

```text
{ class, condition, skills, position, recent, state,       ← class practice
  phase, sessionEnds, testLength,                          ← the protocol
  tests: { pre: { form, answered }, post: { form, answered } } }
```

- **`position`**: how many fixed-sequence questions the student has done.
- **`recent`**: their last few skills, for interleaving.
- **`state`**: the learner model's class-wide difficulties, plus the student's own ratings under `students.me`, so
  the browser can choose questions offline.
- **`tests`**: which form each test uses (counterbalanced within each condition) and which questions are already
  answered.

### Attempts

`POST /api/attempts` stores one practice question. The body:

```text
{ clientId, student, skill, level, seed, review, outcome, policy?, predicted?, solutionViewed, msTotal, shownAt,
  answers: [{ input, verdict, ms }] }
```

- **`clientId`**: made by the browser (8–64 of `A-Za-z0-9-`).
- **`outcome`**: `solved`, `revealed` or `skipped`.
- **`policy`**: `adaptive`, `fixed`, `free` or `review`. `review` exactly when `review` is true; `adaptive` and
  `fixed` only for a student in that condition.
- **`predicted`**: the model's chance of a right first answer when the question was shown, from 0 to 1.
- **`answers`**: at most 50. Each `verdict` is `correct`, `close`, `wrong` or `form`; inputs are cut to 200
  characters.

The answers must agree with the outcome, or the attempt is refused with 400:

- `solved` ends on a correct answer, and nothing follows a correct one.
- A `skipped` question had at least one try.

The summary columns (right first time, wrong answers, form retries) are worked out from the answers on the server,
so they can't disagree. The answer is 201 `{ stored: true }`. A repeat of a stored `clientId` (a retried upload)
gives 200 `{ stored: false }` and is not stored twice.

### Test answers

`POST /api/tests` stores one test answer. The body:

```text
{ clientId, student, phase: "pre" | "post", item, input, verdict, retries, ms }
```

- **`item`**: the question's number on the test, 0 to testLength − 1.
- **`verdict`**: `correct`, `close`, `wrong` or `skipped`. A "form" message is retried in the browser, not stored.
- **`retries`**: the form messages before this answer.

The server works out the question itself (skill, level, seed) from the class code, the student's form and `item`,
so a client can't answer a question that wasn't on its test. One answer per student, test and question: a repeat
keeps the first, with 200 `{ stored: false }`.

### Dashboard

`GET /api/research/dashboard?class=CODE` (teacher) returns:

- **`class`**: the class with its protocol.
- **`students`**: per student:
  - export name (`s17`), code and condition;
  - questions answered, right first time, and minutes of class practice;
  - each test's form, answers, right answers and whether it is complete;
  - mastery of every skill (the chance of a right first answer at each level, and the answers that rests on).
- **`conditions`**: per group:
  - students and questions;
  - right first time;
  - the model's expected chance, and how far practice was from the target;
  - median time per question, solutions opened, questions left unfinished;
  - practice minutes;
  - pre- and post-test mean (SD, n), and the gain.
- **`tests`**: Cohen's d of the gain, and the pre-test on form A against form B.
- **`calibration`**: the logged predictions against what happened (log-loss, AUC, ten bins).

### Exports

Both CSVs name students `s1`, `s2`, … by their row number, never by their code, so a published data set can't be
used to sign in. Typed answers are JSON strings, so a spreadsheet never reads `=1+2` as a formula.

- **`attempts.csv`** columns: attempt, student, class, condition, policy, predicted, area, skill, level, seed,
  review, outcome, first_correct, wrongs, retries, solution_viewed, ms_first, ms_total, n_answers, answers, shown_at,
  created_at.
- **`tests.csv`** columns: response, student, class, condition, test_order, phase, form, item, area, skill, level,
  seed, input, verdict, correct, retries, ms, created_at.

`npm run model` reads the first and `npm run analyse` the second.
