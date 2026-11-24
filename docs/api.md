# Zeno HTTP API

Everything the browser does goes through these routes, served by `server/index.ts` (boards), `server/research.ts`
(the class study), `server/protocol.ts` (its phases and tests) and `server/accounts.ts` (accounts). Bodies are JSON (`Content-Type:
application/json`; anything else is refused with 415, so a cross-site form can't post), at most 25 MB, or 64 KB for
the study's routes. Errors come back as `{ "error": "…" }` with the status.

**Who may call a route:**

- *anyone*: anyone who passed the site password. With `APP_PASSWORD` set, every route except `/api/health` needs HTTP
  basic auth (any username).
- *teacher*: also needs the header `X-Teacher-Password` when `TEACHER_PASSWORD` is set; otherwise 403.

After 10 wrong passwords (site or teacher) in 10 minutes, a client gets **429** with `Retry-After`, whatever it
sends, until the oldest of them leaves the window. A client that gave a right password (site or teacher) in the last
24 hours is allowed 100 instead: a class shares its school's address, and a lock-out would cut off the students
already signed in.
- *student*: anyone holding a student code. The code is the only thing tying answers to a student, so knowing it is
  enough.
- *owner*: the board's owner; see *Whose boards*.
- *account*: whoever is signed in to an account, by the session cookie; otherwise 401. See *Accounts*.

`tests/api-docs.test.ts` checks this table against a running server. Every route listed must exist, and every other
method and path on these resources must answer 404 or 405, so a route added without documenting it fails the tests.

## Routes

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/health` | anyone, no password | `{ ok: true }` once the database answers; Docker's health check |
| GET | `/api/export` | teacher | every board, the teachers' and every student's, with its scene, as a JSON download (`zeno-boards-DATE.json`) |
| GET | `/api/boards` | owner | the caller's boards: `[{ id, title, createdAt, updatedAt }]`, newest first. A teacher with `?class=CODE` gets that class's students' boards instead, each with `student` (`s17`), `number` and the account's `name` (`null` without one) |
| POST | `/api/boards` | owner | a new board, the caller's, from `{ title? }` (trimmed, at most 200 characters): 201 with `{ id, title, createdAt, updatedAt }` |
| GET | `/api/boards/:id` | owner | `{ id, title, scene, updatedAt, shareToken }`. A teacher may open a student's board too: `{ id, title, scene, updatedAt, readOnly: true }` |
| PUT | `/api/boards/:id` | owner | save `{ title?, scene?, baseUpdatedAt? }`; see *Saving a board* |
| DELETE | `/api/boards/:id` | owner | delete the board: 204 |
| POST | `/api/boards/:id/share` | owner | a read-only link: `{ token }`, 201 when new, 200 with the one the board already has |
| DELETE | `/api/boards/:id/share` | owner | take the read-only link away: 204; the old link stops working |
| GET | `/api/shared/:token` | anyone | the shared board, `{ title, scene, updatedAt }`, without its id; 404 once the link is taken away |
| GET | `/api/account` | anyone | who is signed in: `{ account: { email, name, verified } \| null, student, mail }`; `student` is the class record the account practises under (`null` for none), `mail` whether the server can mail a new-password link |
| POST | `/api/account` | anyone | a new account from `{ email, name, password, lang? }`: 201 `{ email, name, verified }` and the session cookie; 409 when the email has one |
| PUT | `/api/account` | account | `{ name? }` renames; `{ password, current }` changes the password and signs the other devices out |
| DELETE | `/api/account` | account | `{ password }`: delete the account and everything kept under it: 204 |
| POST | `/api/account/session` | anyone | sign in with `{ email, password }`: 200 `{ email, name, verified }` and the session cookie; 401 when either is wrong |
| DELETE | `/api/account/session` | anyone | sign this device out: 204 |
| POST | `/api/account/reset` | anyone | `{ email, lang? }` mails a link for a new password if the address has an account: 202 either way; 503 when the server sends no mail |
| PUT | `/api/account/reset` | anyone | the link's page: `{ token, password }` sets the password, signs every device out and this one in; 410 for a link used or too old |
| POST | `/api/account/verify` | anyone | `{ token }` confirms the address from its mailed link (410 for a link used or too old); signed in and without a token, mails the link again |
| POST | `/api/account/student` | account | add a record from before the account to it: `{ code }` gives the student; 409 when the code is another account's, or the account is already in that class |
| GET | `/api/account/state[?since=REV]` | account | the progress that follows the account: `{ rev, items }`, the keys changed since revision `REV` (all of them without it); see *Accounts* |
| PUT | `/api/account/state` | account | `{ since, items, replace? }`: the keys this browser changed, merged with what is kept; answers `{ rev, items }` with what the browser lacks |
| GET | `/api/classes` | teacher | every class: code, name, skills, feature, study, phase, sessionEnds, testLength, students, students per arm (`on`, `off`), attempts |
| POST | `/api/classes` | teacher | a new class from `{ name?, skills?, testLength?, feature? }`: 201 with its code; see *Arms* |
| POST | `/api/classes/:code/phase` | teacher | move the class on: `{ phase, minutes? }`; see *The protocol* |
| POST | `/api/classes/:code/paper` | teacher | a test written on paper, typed in: `{ student, phase, form?, answers }`; see *Paper tests* |
| POST | `/api/classes/:code/homework` | teacher | homework for every student in the class: `{ length? }`, 201; see *Homework* |
| POST | `/api/classes/:code/study` | teacher | take the class out of the study or put it back: `{ study }`; see *Homework* |
| POST | `/api/classes/:code/goal` | teacher | the class's roadmap goal: `{ goal }`, a goal id or `null` |
| POST | `/api/classes/:code/games` | teacher | the games assigned to the class: `{ games }`, a list of game ids (`[]` for none); see *Games* |
| POST | `/api/classes/:code/seen` | teacher | take a stuck student off the list: `{ student, skill, through }`, 204; see *Dashboard* |
| POST | `/api/students` | anyone | join a class: `{ class, number?, again? }` gives 201 `{ code, class, condition, feature, arm }`, randomised in blocks of four; signed in to an account the record is the account's, and joining a class it is already in gives that record again (200); `number` is the student's number in the class list (1–99, shown only on the teacher page, never exported), and 409 when someone in the class already gave it, unless `again: true` |
| GET | `/api/students/:code` | student | `{ code, class, condition, feature, arm, answered, goal, games }` |
| POST | `/api/students/:code/games` | student | the stars of an assigned game: `{ game, stars }`; see *Games* |
| POST | `/api/students/:code/predictions` | student | the first guess on a topic page's "predict, then reveal": `{ kind, pick }`; see *Predictions* |
| DELETE | `/api/students/:code` | student | delete the student and everything saved under the code: 204 |
| GET | `/api/students/:code/plan` | student | what the browser needs to choose class practice; see *The plan* |
| POST | `/api/attempts` | student | one practice question; see *Attempts* |
| POST | `/api/tests` | student | one test answer; see *Test answers* |
| GET | `/api/research/dashboard?class=CODE` | teacher | the teacher page's data for one class; see *Dashboard* |
| GET | `/api/research/attempts.csv[?class=CODE]` | teacher | every practice attempt as CSV (without `class`: the classes in the study) |
| GET | `/api/research/tests.csv[?class=CODE]` | teacher | every test answer as CSV (without `class`: the classes in the study) |

Anything else under `/api/` is 404, and a known path with the wrong method is 405. Paths outside `/api/` serve the
built app: hashed assets are cached for a year, and the page itself comes with a strict Content-Security-Policy.

## Whose boards

Every board belongs to the learner who made it or to the teachers. A request says whose boards it is about:

- **`X-Teacher-Password`**: the teachers' boards, shared by every teacher. A wrong password is 403 and counts towards
  the limit above. This header wins over the others; a teacher's tab sends it even when the server asks for no
  password (empty), so it stays a teacher's when its browser is signed in to an account.
- **`X-Student-Code`**: that student's own boards. An unknown code is 403.
- **The session of an account** (issue #608): the boards the account made, and those of every class record it holds.
  A learner in no class has boards this way.
- **None of them**: 403, no boards. With no `TEACHER_PASSWORD` set, such a request is a teacher's, as for classes.

A new board is stored under both the class record (the code sent, else the account's latest) and the account, when
the request carries them. So a learner's boards from before they joined a class, from a record they added by its
code, and from last year's class all stay theirs.

A board that isn't the caller's answers **404** `no such board`, the same as one that doesn't exist. The one exception
is a teacher and a board made under a class record: the teacher may read it (`readOnly: true`, without its link), and
changing, deleting or sharing it is **403**. The board of a learner in no class is nobody's but theirs. Boards made
before boards had owners are the teachers'. Deleting a student (`DELETE /api/students/:code`) deletes the boards made
under that record, and deleting an account deletes its boards.

## Saving a board

`PUT /api/boards/:id` takes any of `title`, `scene` and `baseUpdatedAt`:

- **`scene`** must be an object with an `elements` array, or the save is refused with 400. A scene no client can
  load would break the board for everyone.
- **`baseUpdatedAt`** is the `updatedAt` the client last saw. If someone else has saved since (another tab or
  device), the save is refused with **409** `{ error: "conflict", updatedAt }`. The board then offers "reload" or
  "keep mine"; keeping it saves again without `baseUpdatedAt`.
- **On success** the answer is 200 `{ updatedAt, previous }`. `updatedAt` always increases, even for two saves in
  the same millisecond.

## Read-only links

`/#/s/<token>` shows a board in Excalidraw's view mode and follows it as its owner saves (it asks again every few
seconds). The token is 16 random bytes and says nothing about the board's id, so the link can't be turned into one
that edits.

It is a way of presenting. With `APP_PASSWORD` set, a viewer needs the site password like everyone else. Anyone
with the link sees the board, and nothing more: editing it still takes its owner's student code or the teacher
password.

## The class study

### Classes

`POST /api/classes` (teacher) takes:

- **`name`**: up to 100 characters; "Class" if empty.
- **`skills`**: skill ids, area names and/or grades of the course (`"G1"` to `"G8"`, `"G10"` for grades 9–10, `"G12"`
  for grades 11–12, `"G13"` for university; `"P1"` to `"P6"` still mean grades 1 to 6). An area means all its skills; a
  grade every skill with a level taught in it (`gradeOf` in `src/model/curriculum.ts`). Anything unknown gives 400. The list is
  kept in curriculum order; leaving it out means every skill there is when the class is made. The list is stored, so
  skills added to Zeno later don't join a class that has started.
- **`testLength`**: 4–30 questions; 12 if left out.

The class code is 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L).

### Arms

A class tests one feature, `feature` when it is made (`src/model/arms.ts`; 400 for another):

- **`policy`** (the default): the adaptive choice of question (`arm: "on"`, condition `adaptive`) against the fixed
  sequence (`off`, condition `fixed`).
- **`spaced`**: spaced review (`src/model/spacing.ts`).
- **`steps`**: a fractions operation missed is worked in steps.
- **`hard`**: after a miss on fractions, "what exactly was hard?".
- **`faded`**: worked examples that fade (`src/model/fading.ts`), on every skill worked in steps.
- **`stepdown`**: targeted step-down after an early failure (`src/model/stepDown.ts`). On trial: nobody has it but
  the arm with it in a class testing it.
- **`marking`**: a bar-model or proportion word problem marked sentence by sentence before it is solved
  (`src/math/wordMarks.ts`, issue #582). On trial, like `stepdown`.
- **`breaks`**: "where it breaks", a worked answer to judge after a run of right answers (`src/model/breaks.ts`,
  `src/math/whereItBreaks.ts`). On trial, like `stepdown`.

Students are given an arm in random blocks of four, two of each. In a class testing anything but the policy both
arms practise with the adaptive policy. Only the feature under test differs: the arm without it goes without it, in
class practice and free practice alike, and every other feature stays on for both, but for a feature on trial
(`stepdown`, `marking`, `breaks`), which nobody else has. An attempt that shows a feature the student's arm hasn't got is refused
with 400: a `spaced` or `stepdown` policy (`invalid policy`), `steps` (`invalid steps`), `hard` (`invalid hard`),
`faded` (`invalid faded`) `marks` (`invalid marks`) or `breaks` (`invalid breaks`). Classes and students from before arms tested the policy; their arm follows from their
condition.

### The protocol

`POST /api/classes/:code/phase` (teacher) takes `{ phase }`, one of:

- **`open`**: class practice any time.
- **`pretest`** / **`posttest`** / **`delayed`**: the test, for students who haven't finished it. Class practice
  waits. `delayed` is the delayed post-test, best given a week or more after the post-test, on form C.
- **`session`**: class practice for `minutes` (1–240), the same window for everyone, starting now.
- **`closed`**: no class practice.

It answers `{ phase, sessionEnds }`, or 404 for an unknown class. Students' browsers see the change within half a
minute, when they next ask for the plan.


### Paper tests

`POST /api/classes/:code/paper` (teacher) stores a test a student wrote on the printout (**Print the tests**), typed in
afterwards: `{ student, phase, form?, answers }`, with `phase` one of `pre`, `post`, `delayed`, and `answers` one string
per question in the printout's order (`""` for a question left blank, stored as `skipped`). The server works out each
question from the class code and the form, marks what was typed as it marks an online answer (an answer only wrong in
its form, such as a fraction not in lowest terms, counts as wrong: on paper it couldn't be sent back), and stores it with
`paper = 1`, never late. A question the student already answered online keeps that answer. It doesn't matter whether
the class's test has started: the network may have been down.

`form` is the form on the student's sheet, theirs by default. The other of A and B is taken only while the student has
taken neither test: their order is swapped to fit (so their next test is the form they haven't seen), which is what
happens when a whole class writes the pre-test on paper before joining. Otherwise another form is refused with 409.
The delayed post-test is always C. Answers `201 { form, stored, kept, verdicts, reordered }`: `verdicts` per question,
`null` where the online answer was kept.

### The plan

`GET /api/students/:code/plan` returns:

```text
{ class, condition, feature, arm, skills, position, recent, state,   ← class practice
  ideas, ema, spacing, fading, stepDown, breaks,
  phase, sessionEnds, testLength,                                     ← the protocol
  tests: { pre: { form, answered }, post: { form, answered }, delayed: { form, answered } },
  homework }                                                          ← null, or { id, createdAt, items, done }
```

- **`position`**: how many fixed-sequence questions the student has done.
- **`recent`**: their last few skills, for interleaving.
- **`state`**: the learner model (the logistic model, `src/model/classModel.ts`): its class-wide `weights`, the
  answers counted on each skill (`answers`), and the student's own records under `students.me` (right, wrong and
  recent answers on each skill, each area and overall, and where each skill was last practised), so the browser can
  choose questions offline.
- **`fading`**: for each skill whose worked examples are fading, how many steps (counted from the end) the student
  works on its next question; the rest are shown done (`src/model/fading.ts`).
- **`stepDown`**: `{ early: { [skill]: { answered, wrong } }, now?: { skill, idea, left }, back? }` for the arm with
  step-down (`src/model/stepDown.ts`), else `{ early: {} }`: the early class-practice answers on each skill made of
  ideas, the step-down under way (the questions left on its idea), and the skill to go back to once it is over.
- **`breaks`**: `{ run: { [skill]: n }, due? }` for the arm with "where it breaks" (`src/model/breaks.ts`), else
  `{ run: {} }`: the right class-practice answers in a row on each skill made of ideas, and the skill whose worked
  answer to judge comes next.
- **`tests`**: which form each test uses (A and B counterbalanced within each arm, C for everyone's delayed
  post-test) and which questions are already answered.
- **`homework`**: the student's newest homework once the class may have it (see *Homework*), else `null`: its
  questions `items: [{ skill, level, seed, why, idea? }]` in order, and `done`, the indices already answered.

### Homework

`POST /api/classes/:code/homework` (teacher) makes new homework for every student in the class from their own records
(`src/homework.ts`), replacing what they had: `{ length? }`, 4 to 20 questions (8 when left out). A student on the
teacher's stuck list (see *Dashboard*) starts with two repair questions (`why: "repair"`) on the class skill they have
been stuck on longest, at the level the model gives them the chance closest to 0.85 (mostly the easy one), with the
`idea` to aim at on a skill made of ideas: the one the list gives as the reason, or their weakest. Then each student's
homework is up to two spaced reviews that are due (`why: "review"`, asked hard), then the adaptive policy's choices
(`practice`, interleaved across skills, with the `idea` aimed at on a skill made of ideas), then one question at an
even chance (`stretch`). Answers `201 { students, length, createdAt }`.

Homework is extra practice, so it waits for the study: until the class has been through its delayed post-test, and
while any test is running, the request is refused with 409 and the plan carries `homework: null`. The student answers
it in class practice, whatever the phase, as attempts with policy `homework`; the dashboard's `homework` gives
`{ open, study, rows: [{ student, createdAt, items }] }`, each item with the student's `outcome` and `firstCorrect`
(`null` until answered), and its arms leave homework out.

A class that isn't part of the study, a pilot say, can be taken out of it: `POST /api/classes/:code/study`
`{ study: false }` (teacher), 200 `{ study }`. It may then have homework at any time (still never while a test is
running), and the exports of all classes (`attempts.csv` and `tests.csv` without `?class=`) leave it out; its own export
still has it. `{ study: true }` puts it back, refused with 409 once any of its students has had homework, which has
already changed their practice. Every class starts in the study.

### Games

`POST /api/classes/:code/games` `{ games }` (teacher) assigns games to the class: up to 30 ids from `GAME_KEYS` in
`src/model/gameKeys.ts` (each game in the Games menu with a ladder), kept in the order sent, 200 `{ games }`. Games are
extra practice, so they open as homework does: a non-empty list is refused with 409 until the class has been through
its delayed post-test (at any time in a class out of the study), and while a test is running. `{ games: [] }` takes
them off at any time. A class that has had games assigned, or whose students have sent stars, can't go back into the
study.

`GET /api/students/:code` gives the class's `games`, and the student's site lists them. Whenever the ladder of an
assigned game changes, and once on each page for every assigned game, the student's browser sends
`POST /api/students/:code/games` `{ game, stars }`: `stars` is the ladder as kept in that browser, 0–3 for each puzzle
(at most 40). The server keeps the best stars of each puzzle across sends and answers 200 `{ stars, passed }`; a game
not assigned to the class is refused with 409. A ladder is passed with at least two stars on every puzzle, and the
first time it is, `passed_at` is noted. The dashboard's `games` gives `{ assigned, open, stars }`, `stars` keyed by
student (`s17`) and game: `{ stars, passedAt }`.

### Attempts

`POST /api/attempts` stores one practice question. The body:

```text
{ clientId, student, skill, level, seed, review, outcome, policy?, predicted?, solutionViewed, msTotal, shownAt,
  answers: [{ input, verdict, ms }], hard?, steps?: [{ answers: [{ input, verdict, ms }], shown }], faded?,
  breaks?: { variant, said, step?, picked? } }
```

- **`clientId`**: made by the browser (8–64 of `A-Za-z0-9-`).
- **`outcome`**: `solved`, `revealed` or `skipped`.
- **`policy`**: `adaptive`, `fixed`, `free`, `review`, `spaced`, `stepdown`, `homework` or `breaks`. `review` exactly when
  `review` is true; `adaptive` and `fixed` only for a student in that condition; `spaced` only for a student with spaced
  review, `stepdown` only for one with step-down (see *Arms*); `homework` only for a question of the student's own
  homework (see *Homework*); `breaks` exactly when `breaks` is sent. A `stepdown` or `breaks` question is class
  practice: it is marked late like one.
- **`predicted`**: the model's chance of a right first answer when the question was shown, from 0 to 1.
- **`answers`**: at most 50. Each `verdict` is `correct`, `close`, `wrong` or `form`; inputs are cut to 200
  characters.
- **`hard`**: the ideas the student ticked when asked what exactly was hard after a wrong answer, each one of the
  question's own ideas (`part`, `commonDenom`, `minusNeg`, `mulFirst`, …) once. Only on a skill made of ideas
  (times, hcf, fractions, integers, order, rounding, indices, expand: `IDEA_SKILLS` in `src/model/ideaState.ts`), and
  left out when nothing was ticked; it moves the student's ideas in the plan.
- **`marks`**: a word problem marked before it was solved: `{ picks, ms }`, one pick per sentence of the question's
  marked version in its order (`given`, `asked`, `notNeeded`, or `relation:0` / `relation:1` with whose amount the
  student picked as bigger), and the milliseconds marking took. Only on a question with sentences to mark (bar-model
  problems, proportion word problems), and only from a student with marking; the answers' times start when marking
  ends. It moves nothing in the plan: it is stored and exported (`marks` in attempts.csv).
- **`rated`**: how the question felt to the student, asked once it was over: `easy` (too easy), `right` (about
  right) or `hard` (too hard). Left out when they didn't say; refused on a `skipped` question. Every arm is asked
  alike, and it moves nothing in the plan: it is stored and exported (`rated` in attempts.csv) for comparing with
  `predicted`.
- **`steps`**: a fractions operation worked in steps after a wrong first answer, one entry per step reached, in the
  order of the question's steps: the answers to that step (as `answers`, and nothing after a correct one) and
  whether its answer was shown. No more entries than the question has steps, each answered or shown, and none when
  the first counted answer was right. The server marks each step's answers again, and each step moves the ideas it
  needs in the plan.
- **`faded`**: a faded worked example, on any skill whose questions have steps (the calculus skills and fractions
  operations): how many of the question's first steps were shown done, from 1 to one fewer than it has. Then
  `answers` is empty and `steps` holds every step reached: the given ones first, shown and unanswered, then the
  student's. It is `solved` or `revealed` by its last step, the question itself, and `skipped` before it. Its steps
  move the ideas and the fading in the plan; it tells the learner model nothing, since part of it was done for the
  student.
- **`breaks`**: a worked answer judged ("where it breaks", `src/math/whereItBreaks.ts`), only with policy `breaks`
  and from the arm with it. `variant` is which working of the question was shown (0: the right one); `said` is
  `right` or `wrong`, and when `wrong`, `step` is the line tapped (from 0) and `picked` the mistake picked, one of the
  three offered. The server rebuilds the working from the question and the variant and refuses one that couldn't have
  been shown (`invalid breaks`). `answers` is empty; it is `solved` when judged rightly (right of a right working; of
  one with a mistake, its line and its name), else `revealed`. It tells the learner model nothing; a working with a
  mistake moves the idea of that mistake in the plan, by whether the student named it.

The answers must agree with the outcome, or the attempt is refused with 400:

- `solved` ends on a correct answer, and nothing follows a correct one.
- A `skipped` question had at least one try.

The server marks every answer again with the same checker (the question follows from skill, level and seed, and so
do its steps) and stores its own verdict; where the browser's differed, the answer keeps it as `client`, and `remarked`
counts them, steps included. The summary columns (right first time, wrong answers, form retries) are worked out from
the server's verdicts on the whole question's answers, so they
can't disagree; the outcome stays as the browser sent it. Class practice (`adaptive` or `fixed`) that arrives more
than five minutes after the class's practice time ended (open practice, or a session until its time is up) is stored
with `late` set, for the analysis to report: an offline tablet's questions aren't lost. The answer is 201
`{ stored: true }`. A repeat of a stored `clientId` (a retried upload) gives 200 `{ stored: false }` and is not
stored twice.

### Test answers

`POST /api/tests` stores one test answer. The body:

```text
{ clientId, student, phase: "pre" | "post" | "delayed", item, input, verdict, retries, ms }
```

- **`item`**: the question's number on the test, 0 to testLength − 1.
- **`verdict`**: `correct`, `close`, `wrong` or `skipped`. A "form" message is retried in the browser, not stored.
- **`retries`**: the form messages before this answer.

The server works out the question itself (skill, level, seed) from the class code, the student's form and `item`,
so a client can't answer a question that wasn't on its test, and marks what was typed itself: the stored `verdict`
is the server's (`form` if the browser should have sent it back), with the browser's as `client_verdict` where they
differ. A test the class hasn't started yet is refused with 400 (`the post-test hasn't started`). An answer that
arrives more than five minutes after its test ended is stored with `late` set. One answer per student, test and
question: a repeat keeps the first, with 200 `{ stored: false }`.

### Dashboard

`GET /api/research/dashboard?class=CODE` (teacher) returns:

- **`stuck`**: who is stuck, grouped by why (`src/model/stuckList.ts`). A student is stuck on a skill after ten
  questions or more since they last had three right in a row (or were marked seen) with first answers judged.
  Each group is `{ key, rows }`, the biggest first and those with no reason last; each row is `{ student, code,
  skill, answers, through, because }`. `through` is the last attempt counted, and `because` is one of:
  - `{ kind: "mistake", mistake, times, example }`: the mistake the checker named on most of those questions, at least
    two, with the latest wrong answer that gave it (`{ skill, level, seed, input }`, for the page to word in the
    teacher's language);
  - `{ kind: "ticked", idea, times }`: the idea ticked as hard most often, at least twice;
  - `{ kind: "weakest", idea, known }`: on a skill made of ideas, the one the student is least likely to know;
  - `null`.

  `POST /api/classes/:code/seen` with `{ student: "s3", skill, through }` (an attempt of that student on that skill)
  takes the row off until ten more questions after `through`; 404 for anything else.
- **`class`**: the class with its protocol.
- **`students`**: per student:
  - export name (`s17`), code, number in the class list (`null` if none was given), the `name` on their account
    (`null` for a student without one), arm and condition;
  - questions answered, right first time, and minutes of class practice;
  - each test's form (pre, post, delayed), answers, score (right answers over the test's questions) and whether it
    is complete;
  - mastery of every skill (the chance of a right first answer at each level, and the answers that rests on);
  - `holds`: each of the class's skills the student has mastered, as `mastered` (reached in practice, its review
    days later still to come), `kept` (right on a review days later) or `again` (wrong on a review, practised again),
    from their spaced reviews (`holdOf` in `src/model/spacing.ts`), and `held`, how many skills are in each.
- **`arms`**: `on` and `off`, each:
  - students and questions;
  - right first time;
  - the model's expected chance, and how far practice was from the target;
  - median time per question, solutions opened, questions left unfinished;
  - practice minutes;
  - `kept` and `mastered`: skills per student kept (the result) and mastered with the review still to come
    (progress);
  - each test (`pre`, `post`, `delayed`) by intention to treat: mean (SD, n) over every student of the arm, with a
    question not answered counted as wrong (a test not sat scores 0), and `finished`, how many sat all of it.
- **`tests`**:
  - `started`: when each test's phase first began, or null;
  - `effect`: Cohen's d of each test by intention to treat, `on` over `off`;
  - `forms`: the pre-test on form A against form B.
- **`calibration`**: the logged predictions against what happened (log-loss, AUC, ten bins).

### Exports

Both CSVs name students `s1`, `s2`, … by their row number, never by their code, so a published data set can't be
used to sign in. Typed answers are JSON strings, so a spreadsheet never reads `=1+2` as a formula.

- **`attempts.csv`** columns: attempt, student, class, feature, arm, condition, policy, predicted, area, skill, level, seed,
  review, outcome, first_correct, wrongs, retries, solution_viewed, ms_first, ms_total, n_answers, answers, hard,
  steps, faded, rated, breaks, remarked, late, shown_at, created_at.
- **`tests.csv`** columns: response, student, class, feature, arm, condition, test_order, phase, form, test_length, item, area,
  skill, level, seed, input, verdict, correct, client_verdict, late, paper, retries, ms, created_at. `test_length` is the
  number of questions on each of the class's tests; `paper` is 1 for an answer written on paper and typed in by the
  teacher (its `ms` is 0 and its `created_at` when it was typed in, not when it was written).

`npm run model` reads the first and `npm run analyse` the second.

## Predictions

`POST /api/students/:code/predictions` `{ kind, pick }` (the student's browser) keeps a signed-in student's first guess
on a topic page's "predict, then reveal" (issue #578, `src/model/predict.ts`): `kind` is `geoLab`, `fractionWall` or
`slopeWalk`, `pick` is `up`, `down` or `same`. The server marks it against what the change really does (`OUTCOMES` in
`src/model/predictKinds.ts`) and keeps only the first guess on each piece: 200 `{ pick, right }` with the kept one. An
unknown piece or pick is 400. The dashboard's `predictions` is `{ made, wrong }`, the wrong ones with the student, the
piece, the pick and the outcome. Predictions move no mastery: nothing reaches the model, the plan or the tests.

## Accounts

An account is an email, a name and a password (issue #605, `server/accounts.ts`); anyone past the site password may
make one. The email is kept in lower case, the name is 1–60 characters, the password 8–200. The password is stored as
an scrypt hash with its own salt.

**Sessions.** Signing in (or up, or setting a password from a mailed link) answers with `Set-Cookie: zeno_session=…;
Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`, plus `Secure` when the request came over HTTPS (here, or at a
proxy that sends `X-Forwarded-Proto: https`). The browser sends the cookie back by itself; the database keeps only its
SHA-256. A session lasts a year, until it is signed out, or until the password changes on another device.

**Mailed links.** With `SMTP_HOST`, `MAIL_FROM` and `PUBLIC_URL` set (see [self-hosting.md](self-hosting.md)), a new
account is mailed a link to confirm its address (`PUBLIC_URL/#/account/verify/TOKEN`, good for seven days), and
`POST /api/account/reset` mails one for a new password (`…/#/account/reset/TOKEN`, good for one hour). Each link works
once, and a newer link of the same kind stops the older one. `lang` (`en`, `ka` or `ru`) picks the message's language.
Without mail, accounts work the same and the links come from `npm run reset-password -- EMAIL` on the server.

**Classes.** A student who joins signed in belongs to the account (issue #606): `GET /api/account` names the record
joined last as `student`, so a browser that signs in knows which student it is. The teacher's dashboard and list of a
class's boards carry the account's `name` beside the student; the CSV exports and `/api/export` never do. Deleting the
account deletes its records with their answers, tests and boards, as `DELETE /api/students/:code` does for one.

**Progress.** Outside class practice a learner's progress is kept by the browser, one `localStorage` key for each
thing: free practice, each game's ladder, the dates things were achieved, the roadmap goal. Signed in, it follows the
account (issue #607). A browser sends the keys that changed, as the strings it stores (`items: { "zeno.kakooma.v1":
"{…}" }`), with the revision it last saw as `since`. The server keeps one copy of each key and never just overwrites
it: two copies are merged by what the key holds (`src/model/accountState.ts`). A ladder keeps the best stars of each
puzzle, achieved dates the earliest, free practice the copy with more questions answered, anything else the copy
sent. A key named in `replace` is stored as sent, for a learner who reset their progress. The answer's `items` are
the keys that changed elsewhere since `since`, and any key sent whose merged value differs from the one sent; `rev`
is the account's revision now. Only keys that follow an account are taken (`zeno.<name>.v1` and `zeno.goal`, but not
who is signed in, what waits to be sent, or a device's settings): any other is 400. A value is at most 256 KB and an
account keeps at most 400 keys (413).

**Limits.** Each answers 429 with `Retry-After`: 8 wrong passwords for one email in 10 minutes; 30 wrong passwords
from one client in 10 minutes (300 once that client has signed in to anything in the last day, as for the site
password); 300 new accounts from one client in an hour; 20 new-password requests from one client in an hour. One
address is mailed at most 3 times an hour; further requests still answer 202 and send nothing.
