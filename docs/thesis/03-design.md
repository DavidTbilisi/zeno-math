# 3 Requirements and design

This chapter states what Zeno has to do and why it is built the way it is. Section 3.1 describes the setting it was
designed for. Section 3.2 turns that setting into requirements, each traced to the part of the system that meets it.
Section 3.3 gives the architecture, and section 3.4 the main design decisions, with the alternatives that were
considered. Section 3.5 describes the design of the class study that Zeno carries, and how the code enforces each
of its rules. Chapter 4 then describes how the parts are implemented.

## 3.1 Context

Zeno is meant for an ordinary secondary school, of the kind I know from Georgia. Four features of that setting shape
the design.

**The network is unreliable.** Classroom Wi-Fi drops, sometimes for a minute, sometimes for the rest of a lesson. A
tool that stops when the connection stops loses the lesson. Internet access may also be slow or filtered, so a tool
that loads its fonts, libraries or maths renderer from a content delivery network may not load at all.

**Devices are shared and varied.** Students use their own phones, school tablets or a shared computer room. A student
may start on one device and continue on another. The teacher usually has a laptop connected to a projector. The
interface therefore has to work on a phone screen and must not depend on anything stored on one device.

**There is no budget and no IT department.** A school cannot pay per-student licences or run a cloud account. What
it can do is run a program on a teacher's laptop or one school machine. The system has to be installable by a
teacher, cost nothing, and keep working without maintenance.

**Three languages, and children's data.** Lessons in Georgia are taught in Georgian, and some schools teach in
Russian; English is needed for the wider research audience. The users are mostly minors, so any data collected about
them must be kept to the minimum the study needs, must not identify them, and must be deletable by the student.
[CITATION NEEDED: Georgian Law on Personal Data Protection, or the GDPR's provisions on children's data]

On top of this, Zeno carries a research question (chapter 1): does choosing practice questions with a learner model
help students learn more than a fixed sequence? Answering it needs a randomised comparison that a teacher can run in
an ordinary lesson, with data that can be analysed and re-analysed later.

## 3.2 Requirements

The requirements below follow from the context above and from the study. The "Met by" column names where each one is
met, so that it can be checked in the code or in the tests described in chapter 5.

: Functional requirements.

| Id | Requirement | Met by |
|---|---|---|
| FR-1 | A teacher can draw and present mathematics on a board, with tools for the topics of secondary school (graphs, geometry, algebra, statistics). | The Excalidraw board with 33 tool dialogs (`src/pages/BoardPage.tsx`, `src/math`) |
| FR-2 | Boards are saved automatically and are not silently overwritten when two people edit the same board. | Autosave with optimistic locking: `PUT /api/boards/:id` with `baseUpdatedAt`, 409 on conflict (`server/index.ts`) |
| FR-3 | A student can practise any of the 42 skills at three levels, with immediate marking, a worked solution, and feedback that names a known mistake. | The practice dialog, generators and checker (`src/components/PracticeDialog.tsx`, `src/math/practice.ts`, `src/math/mistakes.ts`) |
| FR-4 | A teacher can create a class for a chosen set of skills and give students a code to join it. | `POST /api/classes`; the teacher page (`src/pages/TeacherPage.tsx`) |
| FR-5 | Students who join a class are assigned at random to the adaptive or the fixed condition, and the two groups stay balanced. | Block randomisation in `server/research.ts` |
| FR-6 | In class practice, each student's questions are chosen by their condition's policy. | `src/model/policy.ts`; the server refuses an attempt that claims the other condition's policy |
| FR-7 | A teacher can run the study's phases (pre-test, timed practice, post-test) from the dashboard. | `POST /api/classes/:code/phase` (`server/protocol.ts`) |
| FR-8 | The class takes a pre-test and a post-test on parallel forms, counterbalanced within each condition. | `src/model/testForms.ts`, `nextTestOrder` in `server/protocol.ts` |
| FR-9 | Every practice attempt and test answer is recorded with enough detail to rebuild the question and mark it again. | The `attempts` and `test_responses` tables; questions are stored as (skill, level, seed) |
| FR-10 | The researcher can export the data and run the planned analysis on it. | `/api/research/attempts.csv`, `/api/research/tests.csv`; `npm run analyse` (`src/model/analysis.ts`) |
| FR-11 | The teacher can follow a class: the two groups, mastery by skill, test scores, practice time, and how well the model predicts. | `server/dashboard.ts`, the teacher page |
| FR-12 | A student can delete everything stored under their code. | `DELETE /api/students/:code`, "Delete my answers" in the dialog |

: Non-functional requirements.

| Id | Requirement | Met by |
|---|---|---|
| NFR-1 | **Self-hosted.** Runs on one machine with one container and one database file; no cloud service. | Docker image with Node and SQLite (`docker compose up`); Caddy for HTTPS |
| NFR-2 | **No dependence on the internet.** Nothing is loaded from a CDN. | Fonts, MathJax and all libraries are bundled; the one optional exception is the Excalidraw library browser |
| NFR-3 | **Survives a dropped connection mid-lesson.** Class practice continues and no answer is lost. | Plan carried forward in the browser and an outbox in `localStorage` (`src/learner.ts`); idempotent uploads by `client_id` |
| NFR-4 | **No personal data.** No names or emails; exports cannot be used to sign in. | Student codes; exports name students `s1`, `s2`, … (`server/research.ts`) |
| NFR-5 | **Reproducible study materials.** The same question and the same test form can be rebuilt at any time. | Questions generated from seeds; forms derived from the class code by a stable hash |
| NFR-6 | **Three languages.** The whole interface in Georgian, Russian and English. | `src/locales/{en,ru,ka}.ts`; tests check that every tool example renders in all three |
| NFR-7 | **Usable on phones and accessible.** Dialogs fit a phone screen; questions can be read by a screen reader. | Dialogs take the whole screen on a phone; question text and MathML in the page |
| NFR-8 | **Secure by default for a school network.** | Passwords compared in constant time, brute-force limit, strict Content-Security-Policy, JSON-only bodies, formula-safe exports (architecture.md, "Quality") |
| NFR-9 | **Data is not lost.** | Daily `VACUUM INTO` backups, keeping seven; schema version checked on start |
| NFR-10 | **The analysis is fixed before the data.** | `src/model/analysis.ts`, rehearsed on simulated classes in the dry run (section 5.4) |

Some requirements were deliberately left out. Zeno does not support real-time collaborative editing of a board
(section 3.4), does not store student accounts, and does not adapt anything outside class practice: free practice is
always chosen by the student.

## 3.3 Architecture

### System context

Figure 3.1 shows Zeno in its setting. A school runs it on one machine, either a school server or a teacher's
laptop. Caddy, a reverse proxy, provides HTTPS and passes requests to the Zeno server, a single Node.js process that
stores everything in one SQLite file. Three kinds of user reach it through a browser: the teacher (boards, tools,
dashboard), the students (practice and tests), and the researcher, who downloads CSV exports and runs the analysis
scripts on their own machine. No data leaves the school's machine.

![System context (docs/architecture.md, "System context")](figures/TODO-context.png)

### Building blocks

Figure 3.2 shows the building blocks. They fall into three groups.

- **The browser** (React 19 with Vite) holds the pages (home, board, shared board, teacher), the Excalidraw board,
  the 33 tool dialogs, the live pieces drawn on the board, the practice dialog, and the learner client that carries
  a student's plan forward and keeps the outbox.
- **Shared TypeScript** runs in both the browser and the server. `src/math` contains the question generators, the
  answer checker, exact arithmetic and the SVG drawing code; `src/model` contains the learner model, the question
  policies, the test forms, and the evaluation and analysis code. Neither depends on a browser or on Node.
- **The server** (Node 24 with no web framework) consists of a router (`server/index.ts`), the study's records
  (`server/research.ts`), the protocol of phases and tests (`server/protocol.ts`), and the dashboard
  (`server/dashboard.ts`).

![Building blocks (docs/architecture.md, "Building blocks")](figures/TODO-blocks.png)

The most important property of this structure is that **the same model code runs on both sides**. The server
rebuilds each student's learner model from the stored attempts and sends it to the browser. The browser then updates
it after every answer and uses it to choose the next question. Class practice therefore keeps working when the
connection drops, and the server needs to check only that a class-practice question was chosen by the student's own
condition.

### Data model

Figure 3.3 shows the data model. There are five tables.

- `boards`: one row per board, with its Excalidraw scene as JSON and an `updated_at` time used for optimistic
  locking.
- `classes`: a six-character code, a name, the skills the class practises (stored as a JSON list in curriculum
  order), what is left of the current randomisation block, the phase, the end of a timed session, and the test
  length.
- `students`: an id (exported as `s<id>`), an eight-character code that is the student's only identity, the class,
  the condition (`adaptive` or `fixed`), and the test order (`AB` or `BA`).
- `attempts`: one row per practice question, with the skill, level and seed, the policy that chose it, the model's
  predicted chance when it was shown, the outcome, every answer typed with its verdict and time, and summary columns
  worked out from those answers.
- `test_responses`: one row per test question answered, with the test, the form, the item number, the skill, level
  and seed, what was typed and its verdict. The pair (student, test, item) is unique.

![Data model (docs/architecture.md, "Data model")](figures/TODO-data-model.png)

Deleting a student deletes their attempts and test answers through `ON DELETE CASCADE`. The learner model itself is
not stored. The server replays the attempts when the model is first needed, keeps it in memory and adds attempts as
they arrive. Columns added after the first version are added at start-up, so an older database is upgraded in place.

Figure 3.4 shows one practice question from end to end: the browser fetches the student's plan, chooses a question,
checks the answer locally, puts the attempt in the outbox, and uploads it until the server confirms that it is
stored.

![A practice question, end to end (docs/architecture.md)](figures/TODO-practice-sequence.png)

## 3.4 Design decisions

This section expands the decision table in `docs/architecture.md`. For each decision it gives the alternatives that
were considered and what the choice costs.

### An Elo-style learner model rather than BKT or deep knowledge tracing

Adaptive practice needs an estimate of each student's chance of answering each question correctly. Three families
of model were considered.

- **Bayesian Knowledge Tracing** [@corbett1994] treats each skill as known or not known, with probabilities of
  learning, guessing and slipping. It needs those four parameters for every skill, fitted on earlier data, and it
  says nothing about a skill the student has not yet tried.
- **Deep knowledge tracing** [@piech2015dkt] predicts answers with a recurrent neural network. It needs a large
  training set, which a new system does not have, and its predictions cannot be explained to a teacher.
- **Elo-style ratings** [@pelanek2016elo; @klinkenberg2011] give the student an ability and each question a
  difficulty, and predict the chance of a right answer as σ(ability − difficulty). Both are updated after every
  answer by the size of the surprise.

Zeno uses an Elo-style model. It learns online from the first answer, needs no training data, is cheap enough to run
on a phone, and can be explained in one sentence. Zeno's version has three layers of ability (overall, area, skill),
so a skill the student has not tried starts from what they showed in its area (section 4.3). Its costs are two
assumptions: a skill has one difficulty per level, and students do not forget. Section 5.2 tests whether the model
predicts well on real students' answers, compared with BKT and Performance Factors Analysis [@pavlik2009pfa].

### Questions chosen in the browser, marked in both

The alternative was to choose and mark every question on the server. That is simpler to secure, but a dropped
connection would stop practice in the middle of a lesson, which violates NFR-3. Zeno therefore chooses and marks
questions in the browser, so the student sees a verdict at once even offline, and the server marks every answer again
when it arrives, with the same checker. The verdict stored, and the one the learner model and the analysis use, is
the server's; where the browser's differed, it is kept beside it, so a disagreement shows in the exports. The cost is
that a modified client could still choose its own questions. It can only do so within its own condition: the server
refuses any class-practice attempt whose policy is not the student's condition (`server/research.ts`). The pre- and
post-test are protected more strongly, as section 3.5 describes. Marking on the server has a cost of its own: the
checker needs mathjs and MathJax, so the Docker image carries it as one bundled file.

### Questions generated from seeds

Every question is generated from three numbers: its skill, its level and a seed. The alternative was a bank of
stored questions. A bank would have to be written, translated into three languages and stored, and its size would
limit practice. Generated questions are unlimited, and storing the seed means:

- the exact question can be rebuilt for analysis;
- a test form follows from the class code without being stored, so the server can work out which question an answer
  belongs to;
- answers can be marked again later with an improved checker (this is what `npm run mistakes` does on old exports).

The cost is a strict rule: a generator must never change what a seed means once a study has started. The same rule
is why simulations use the 38 skills that existed when their results were produced (section 5.3).

### Codes instead of accounts

Students do not create accounts. Joining a class gives them an eight-character code, shown as `XXXX-XXXX`, which
they write down and type on any device to continue. Codes are drawn with a cryptographic random generator from an
alphabet of 31 characters without the easily confused `0`, `O`, `1`, `I` and `L`, so there are about 8.5 × 10¹¹
possible codes. Class codes have six characters from the same alphabet.

The alternative, accounts with names and passwords, would mean storing personal data about children and handling
forgotten passwords in class. Codes need neither. The costs are that a lost code cannot be recovered, and that anyone
who knows a code can delete that student's record. Because the code is the only link between a student and their
answers, exports never contain it: students appear as `s1`, `s2`, ….

### SQLite in one file, and Node without a framework

The alternative was a database server such as PostgreSQL and a web framework. Both would add a second container to
install and keep running, and more dependencies to audit. SQLite keeps all data in one file that can be backed up by
copying it, and Node's built-in `node:sqlite` module is synchronous, which removes a class of race conditions (for
example in randomisation, below). The cost is one server process and no horizontal scaling, which a school does not
need.

### Optimistic locking for boards rather than real-time collaboration

Two people may edit the same board, for example a teacher on the projector and on a laptop. Real-time collaboration
(a CRDT library such as Yjs) would let both see each other's changes live, but adds a synchronisation server and a
much more complex save path. Zeno instead sends the time of the version being edited with every save
(`baseUpdatedAt`). If the board has changed since, the server answers 409 and the client shows the conflict instead
of overwriting it. No edit is silently lost, at the cost that two editors take turns. Real-time collaboration is
listed as future work.

### The analysis written before the data

The analysis of the study (section 5.4) is code in `src/model/analysis.ts`, written and tested before any data
exists, and rehearsed on simulated classes by the dry run. The alternative, writing the analysis after seeing the
data, invites choosing the analysis that gives the wanted result. Fixing it in code makes it a pre-registration that
can be checked.

## 3.5 The study design

The study compares two conditions: **adaptive**, in which the learner model chooses the skill and level closest to a
75 % chance of a right first answer, and **fixed**, in which the class's skills are practised in curriculum order,
two questions at each of the three levels, then round again (`src/model/policy.ts`). Everything else is the same for
both groups: the feedback, the named mistakes, the worked solutions, and missed questions returning three questions
later. This section describes the rules that make the comparison fair, and how each is enforced.

### Consent before joining

Before a student can join a class, the dialog shows what taking part means (`src/components/StudentPanel.tsx`):
every question tried is saved, with what was typed, whether it was right and how long it took; no name or email is
asked for; the class is split at random into two groups that get questions in different orders, with the same help;
taking part is voluntary, and "Delete my answers" removes everything. The **Join** button stays disabled until the
student ticks that they understand and want to take part. This screen informs the student; it does not replace the
consent of parents or the approval of an ethics board, which a real study must obtain first.
**[TODO: ethics approval and parental consent procedure for the classroom study]**

### Randomisation in blocks of four

Students are assigned to a condition when they join, in blocks of four that contain each condition twice in a random
order. Each class stores what is left of its current block. When a student joins, the server takes the next
condition from the block, shuffling a new block when it is empty. The shuffle uses `node:crypto`'s `randomInt`.
Because `node:sqlite` is synchronous, no other request can run between reading the block and writing it back, so two
students joining at the same moment cannot receive the same slot. A class therefore never has more than two students
more in one condition than in the other, however many join. Simple randomisation, by comparison, could leave a class
of 20 split 14 to 6.

### Parallel test forms, counterbalanced within each condition

The pre-test and post-test use two forms, A and B (`src/model/testForms.ts`). Both forms ask about the same skills at
the same levels in the same order; only the seeds differ, so the questions are different but come from the same
generators. The seed of item *i* on form *F* in class *C* is a hash (FNV-1a) of the string `C:F:i`, so every browser
and the server build the same forms without storing them. When the test has fewer items than the class has skills,
the items are spread evenly over the skills; when it has more, the skills come round again at the next level. Levels
are cycled medium, easy, hard, so a short test is mostly medium questions. The test length is set per class, from 4
to 30 items, with a default of 12.

Within each class and condition, students alternate between taking form A first (`AB`) and form B first (`BA`):
the server gives a new student the order that balances the students already in that condition (`nextTestOrder` in
`server/protocol.ts`). If one form is harder, this cannot appear as a difference between the conditions, and the
pre-test comparison of the two forms on the dashboard shows whether it is harder.

The server does not trust the browser about which question was asked. A test answer is sent with the item number
only. The server rebuilds the student's form from the class code and the test order, and stores the skill, level and
seed it finds there. An answer to an item beyond the test length is refused, and each item can be answered only once
(the table's unique key on student, test and item).

### Teacher-controlled phases

A class is always in one of five phases: *open* (class practice at any time), *pretest*, *session* (timed class
practice), *posttest* and *closed* (Figure 3.5). Only the teacher can change the phase, through a route that needs the
teacher password when one is set. A timed session takes a length from 1 to 240 minutes and starts when the teacher
starts it. Students' browsers ask for the plan every 30 seconds, so they see a change within half a minute. During a
test phase, class practice waits; when a session's time runs out, class practice stops, while free practice remains
open. The student's browser applies these rules (`src/components/PracticeDialog.tsx`), and the server checks them
again. It logs every phase change and judges each answer by when it arrives. A test that has not started cannot be
answered. An answer that arrives more than five minutes after its phase ended (a test answer after its test, class
practice after the practice time) is stored but marked late. Refusing it would be simpler, but a browser hears of a
change only every 30 seconds and keeps answers while the network is down, so an honest tablet that was offline would
lose its answers. Instead, the analysis reports how many answers came late in each group.

![The study protocol (docs/architecture.md, "The study protocol")](figures/TODO-protocol.png)

### Equal practice time

The two conditions are compared at equal practice *time*, not an equal number of questions. In a timed session,
every student in the room has the same window, set by the teacher, so a condition that produces harder questions
gets fewer of them, as it would in a real lesson. The dashboard reports practice time per student from the questions
that class practice chose, which is the check that both groups had the same time.

### Test answers kept away from the learner model

Test answers are stored in their own table, and the learner model is built only from practice attempts. Tests show
no marks and no solutions; only a wrong-form message, such as "not in lowest terms", allows another try, so notation
is not penalised. A student may pass over a question, which counts as an answer. Because the model never sees the
tests, the outcome measure is independent of what the adaptive condition learns from, and the adaptive condition
cannot be advantaged by having practised on the test's questions.

### What is recorded

For each practice question the attempt row records which policy chose it (`adaptive`, `fixed`, `free` or `review`)
and the model's predicted chance when it appeared. The first lets the analysis separate class practice from free
practice; the second lets the model be checked against what students then did, on the dashboard's calibration plot
and in `npm run model`. Each answer typed is kept with its verdict and timing, so a question's history can be marked
again with a later checker.

## 3.6 Summary

Zeno's design follows from four facts about its setting: the network is unreliable, devices are shared, there is no
budget, and the users are children who speak three languages. These lead to a self-hosted system with no external
dependencies, codes instead of accounts, and a learner model that runs in the browser so practice survives a dropped
connection. The class study built on it uses block randomisation, parallel forms counterbalanced within each
condition, teacher-controlled phases with equal practice time, and tests that the learner model never sees. The
browser applies these rules so that practice survives a dropped connection, and the server checks them again: it
marks every answer itself and notes answers that arrive long after their phase. Chapter 4 describes how the
board, the practice engine, the learner model and the policies are implemented.
