# Self-hosting Zeno

*Running your own Zeno, keeping its data safe, and the class study it can run. The short version is in the [README](../README.md#run-with-docker).*

## Run with Docker

```bash
docker compose up -d --build
```

Open http://localhost:8787. Data lives in the `data` Docker volume; the container reports its health from `/api/health`.

**Without a password, anyone who can reach the port can read, change and delete every board.** That is fine on your own
computer; on a network, set one (HTTP basic auth, any username):

```bash
APP_PASSWORD=choose-something docker compose up -d --build
```

**Whose boards.** The site password lets people in, but says nothing about who they are, so it doesn't decide whose
boards they see. A learner's boards are theirs: whoever is signed in to an account has the boards it made, in a class
or not, on any device, and another learner can't see, change or delete them. (A student from before accounts has
theirs by the student code their browser holds.) The teachers' boards are shared by every teacher, and need the
teacher password. A teacher can open the board of a student in their class from the class page to look at it, but only
the student can change it. Someone who is not signed in, with neither a student code nor the teacher password, gets no
boards. Set `TEACHER_PASSWORD` whenever students use Zeno: without one, anyone not signed in counts as a teacher.

Upgrading from a Zeno without board owners: every board already there becomes the teachers'. Boards weren't tied to
anyone before, so the server can't tell which a student made.

Basic auth sends the password with every request, so on a shared network put Zeno behind HTTPS. With
`BIND_ADDRESS=127.0.0.1` the port only listens on the machine itself, and a reverse proxy serves it to the network.
A minimal Caddyfile for a local network with no domain (Caddy's own certificate authority; install its root
certificate, `pki/authorities/local/root.crt` in Caddy's data folder, on the devices that use Zeno):

```caddyfile
:8443 {
	tls internal {
		on_demand
	}
	# The app's own files come pre-compressed; this compresses the API's JSON and CSV too.
	encode zstd gzip
	reverse_proxy 127.0.0.1:8787
}
```

With a domain pointing at the server, `zeno.example.org { reverse_proxy 127.0.0.1:8787 }` gets a trusted
certificate automatically.

Behind a proxy, also set `TRUST_PROXY=1`. Wrong passwords are limited per client: after 10 in 10 minutes, that
client gets 429 and waits until the oldest leaves the window, without its password even being checked. Behind a
proxy, every request arrives from the proxy's address. Without `TRUST_PROXY`, a class mistyping the site password
would lock itself out together. With it, Zeno counts per client, using the address the proxy adds last to
`X-Forwarded-For`; a client can't forge that one.

```bash
APP_PASSWORD=… TEACHER_PASSWORD=… BIND_ADDRESS=127.0.0.1 TRUST_PROXY=1 docker compose up -d --build
```

## Run without Docker

Requires Node.js ≥ 23.6 (uses built-in `node:sqlite` and native TypeScript support).

```bash
npm install
npm run build
npm start          # http://localhost:8787
```

Development (Vite hot reload on :5173, API on :8787):

```bash
npm run dev
```

Environment variables:

- `PORT`: 8787 by default.
- `DATA_DIR`: `./data` by default.
- `STATIC_DIR`: `./dist` by default.
- `APP_PASSWORD`: empty means no auth.
- `TEACHER_PASSWORD`: empty means anyone can create classes, download the study data, and use the teachers' boards
  (anyone without a student code counts as a teacher); see below. A browser tab
  signed in on the teacher's page also has every game's endless run open (all three levels and the clock), so a
  teacher can show a class any of them without first playing through the puzzles; it closes with the tab.
- `TRUST_PROXY`: 1 behind a reverse proxy, as above.
- `PASSWORD_ATTEMPTS` and `PASSWORD_WINDOW_MINUTES`: 10 and 10 by default. An address that gave a right password in
  the last day is allowed ten times `PASSWORD_ATTEMPTS`, so a class sharing a school's address isn't locked out by
  its typos.
- `BACKUP_KEEP`: daily backups to keep, 7 by default; 0 turns them off.
- `USAGE`: `off` stops the anonymous usage counts; see *Usage counts*.
- `SMTP_HOST`, `MAIL_FROM` and `PUBLIC_URL`: all three turn on mail for accounts; see *Accounts and mail*.
  `SMTP_PORT` (587 by default), `SMTP_USER` and `SMTP_PASSWORD` go with them.

The build writes `.br` / `.gz` copies of the assets, and the server sends those to browsers that accept them. Each tool and each
language is a separate chunk, loaded the first time it is used.

**Read-only links.** **🔗 Share** on a board makes a link that shows it in view mode. The link follows the board as
you save, so a class can follow along on their own devices, and **Stop sharing** ends it. It is for showing, not
for keeping a board private. Anyone who can open Zeno can open the board itself; see [docs/api.md](api.md).

**Lessons: two boards side by side.** **🔗 Share → Start a lesson** on a board makes a lesson link. Open the lesson
yourself and send the link: whoever opens it sees your board on the left and a board of their own, made for the
lesson, on the right, and you see their board beside yours as they work (it follows within a second or two). Each
person draws only on their own board, so nothing is overwritten. **Hand out my board** copies everything on yours
onto each guest's board, beside what they have; a guest can also take your board with **Copy the teacher's board to
mine**. With several guests, a tab for each picks whose board you watch. A guest needs boards of their own (an
account, or a class joined); without, the link only shows your board. **End the lesson** stops the link; the guests
keep their boards.

Autosave doesn't silently overwrite: if the board was saved in another tab or on another device since you opened it, Zeno pauses
saving and asks whether to reload that version or keep yours. Saves go one at a time; a failed one is retried (2 s, 5 s, 15 s,
30 s, and as soon as the browser is back online), and closing the tab with unsaved changes asks first.

Backups:

- **A daily copy.** Once a day, and when it starts, the server writes a copy of the whole database (boards and
  study data) to `DATA_DIR/backups/`, keeping the newest seven. The copy is made with SQLite's `VACUUM INTO`, which is
  safe while the server is running. The copies sit on the same disk, so also copy that folder somewhere else,
  for example nightly from another machine:
  `ssh server 'docker exec zeno-app-1 sh -c "cat /data/backups/\$(ls /data/backups | tail -n 1)"' > zeno-$(date +%F).db`.
- **Checked by restoring.** `npm run restore-check -- zeno-2026-11-02.db` starts Zeno on a copy of a backup and
  reads everything back through it: every class, student, practice question, test answer and board. A backup that
  hasn't been restored is a hope, so run it on each copy you take.
- **Putting one back.** Stop the app, copy the backup over the database in the data volume, start it again:
  `docker compose stop app`, then `docker compose run --rm -v "$PWD/zeno-2026-11-02.db:/restore.db:ro" --entrypoint sh app
  -c 'cp /restore.db /data/boards.db && rm -f /data/boards.db-wal /data/boards.db-shm'`, then `docker compose start app`.
  Answers sent after that backup was made are lost, except those still waiting in a student's browser, which upload again.
- **Boards as JSON.** The home page offers a teacher `/api/export`, every board (the students' too) in one JSON file.

Uptime: `.github/workflows/uptime.yml` asks the public server's `/api/health` (no password needed) every ten minutes
from GitHub, outside the server. Four failed tries in a row, or a certificate with under ten days left, open one issue
labelled `outage`, and GitHub tells the repository's watchers; the next good answer closes it. The issue gives the
time of the first try as well as the report's, since four timed-out tries take about three minutes. The address is the
`UPTIME_URL` secret (`gh secret set UPTIME_URL`), so a fork without it checks nothing.

The database records its schema version, and a newer Zeno's database is refused rather than misread. The server sends a Content-Security-Policy and the
usual security headers, accepts only JSON request bodies (so a form on another site can't post to it; the usage counts
apart, which take event names from anyone) and refuses scenes it couldn't load back.

## Usage counts

To show what is worth improving, Zeno counts how it is used, without learning who uses it. The browser sends the
names of what happens (a page opened, a tool put on a board, a practice skill tried, an account made, a class joined,
a script error, the site a visitor came from, the size of the screen, the language) and the server adds each to a
count for the day. That table, `usage_counts` in `boards.db`, holds a day, a kind, a name and two numbers: how many
times, and in how many visits. A visit is one page load, told apart only inside the browser's memory while the page is
open, so there is no cookie, no visitor id and no address in it, and nothing goes to any other server. Names that
could point at someone are never sent: a board is "board", a join link "join", and an error's message loses any id,
code or email it quoted. Counts older than two years are deleted.

A teacher reads them at `#/teacher/usage` (linked under the class list), behind the teacher password. Sending them
needs no password, since the front page is open to anyone, so what is taken is bounded: fixed kinds, short plain
names, a thousand names of a kind a day, three thousand events per address in ten minutes. `USAGE=off` stops the
counting; what was counted before stays readable. Browsers driven by a program (the tests, the README recordings)
send nothing.

The front page and practice published on GitHub Pages have no server of their own. They report to a Zeno server only
when the build is given its address in `VITE_USAGE_URL`, which the Pages workflow takes from the repository variable
`USAGE_URL` (`gh variable set USAGE_URL --body https://zeno.example/api/usage`); a fork without it counts nothing.

## Accounts and mail

Anyone who can open Zeno can make an account at `#/account`: an email, a name and a password. Passwords are stored as
salted scrypt hashes, and a session is a cookie scripts can't read. Accounts need no setting.

Mail is optional. With it, a new account is sent a link to confirm its address, and "Forgot your password?" sends a
link for a new one. Set all three of:

- `SMTP_HOST`: your mail provider's SMTP server. `SMTP_PORT` is 587 by default (the connection starts plain and moves
  to TLS with STARTTLS); 465 speaks TLS from the start. `SMTP_USER` and `SMTP_PASSWORD` sign in; the password is never
  sent over a connection that isn't encrypted, except to a relay on the same machine.
- `MAIL_FROM`: who the mail is from, `zeno@example.org` or `Zeno <zeno@example.org>`. Use an address your provider
  lets you send from, or the mail lands in spam.
- `PUBLIC_URL`: the address people open Zeno at, such as `https://zeno.example.org`. The links in a message are built
  from it and never from the request, so nobody can have a link mailed that leads to another site.

```bash
SMTP_HOST=smtp.example.org SMTP_USER=zeno SMTP_PASSWORD=… MAIL_FROM='Zeno <zeno@example.org>' \
PUBLIC_URL=https://zeno.example.org docker compose up -d
```

Without mail, a forgotten password is yours to fix: `docker compose exec app node server/resetPassword.ts
someone@example.org` (or `npm run reset-password -- someone@example.org` without Docker) prints a link that sets a new
password once within the hour. Give it to the account's owner yourself.

## Class study

Zeno can run a study that compares two ways of choosing practice questions: an adaptive learner model (aiming at a
target chance of a right answer, as in Math Garden) against a fixed curriculum sequence. A class can test another
feature instead (spaced review, steps after a miss, asking what was hard, worked examples that fade, or a targeted step-down or "where it breaks", both still on trial), with half the class going without it. A teacher makes a class at
**`#/teacher`**, choosing the areas it practises or grades of the course (grades 1 to 8, 9–10, 11–12 and university;
every skill has each of its three levels tagged with the grade that teaches it, from Singapore's syllabuses, in
`src/model/curriculum.ts`). Students join with its code, are randomised to an arm in balanced blocks and get a code of
their own (the name on their account is for the teacher, and never exported), see what taking part means and agree before they join. The teacher then moves the
class through a pre-test, timed practice, a post-test and a delayed post-test a week or more later, with parallel forms
counterbalanced within each arm. The dashboard shows who is stuck and why, whose pace has changed, the two arms, mastery by skill, the tests
by intention to treat (every student counts, and finishing is a result of its own) and how well the model predicts; both data sets
download as CSV. A class nobody has joined yet can be deleted (Delete class, `DELETE /api/classes/:code`); once a
student has joined, the server refuses (409), so no records are lost, and the class is closed instead (Now → Closed). The page's top bar has **+ New board**, which makes a board and opens it
in one click, without going through the boards list.

The full description is in **[docs/study.md](study.md)**:

- how a study runs, and the API calls behind it;
- the analysis, fixed in advance (`npm run analyse`);
- the learner model, judged on held-out students against a logistic model, PFA, BKT and baselines, on simulated
  classes and on the public ASSISTments data (`npm run model`; `docs/evaluation/prediction-benchmark.md`);
- the simulation study across three kinds of simulated learner, and its power analysis (`npm run simulate`);
- a dry run of the whole study through the real server (`npm run dry-run`), also against a running server with every
  student at once, as a load test (`--base`, `--parallel`);
- the answer checker against a teacher's marking, and how often it names the mistake a teacher sees (`npm run checker-agreement`);
- which mistakes each group made, from either export (`npm run mistakes`);
- whether what felt too easy or too hard matches what the model predicted, exploratory (`npm run ratings`).
- relative response time (issue #63, `npm run pace`, not in the thesis): first-answer times against each question's
  norm, modelled with the learner model's three layers. On ASSISTments held-out students the student, area and skill
  layers together explain 20–24 % of the variance of the next relative time, 22–25 % with a term for the answer's place
  in the practice (the first answer on a skill takes ×1.5 the norm). Weighting fast answers in the EMA mastery rule
  failed the verdict rule fixed before the first run (a gain of a point in the next three answers after mastery, its
  interval above 0) for all three variants on three seeds: each was 0.4 to 1 point *worse* than the plain EMA, which
  stays. What did hold is the change of pace: after five answers at least twice as fast as the student's own pace, the
  next one was right 8 to 12 points less often than the student's usual, so the teacher page lists such students
  (slower runs come after it, with no more mistakes following them).

More for a thesis: [docs/architecture.md](architecture.md) (design, diagrams, decisions),
[docs/api.md](api.md) (every route), [docs/thesis/](thesis/) (outline, references) and
[docs/evaluation/](evaluation/) (the usability study protocol).
