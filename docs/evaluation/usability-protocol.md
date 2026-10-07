# Usability evaluation: protocol

A small usability study of Zeno that needs no school: 5–8 participants (classmates, student teachers, or teachers if
any are available), one at a time, about 40 minutes each. It answers two questions the class study can't:

1. Can teachers and students do what the study asks of them without help? (Task success, time and errors.)
2. How usable do they find it? (The System Usability Scale, SUS; Brooke 1996.)

Five participants find most usability problems in a design (Nielsen & Landauer 1993). Report the SUS with its
spread, never as a verdict on its own from so few people.

## Before the sessions

- Use a fresh deployment (or a fresh `DATA_DIR`) with `TEACHER_PASSWORD` set, on the devices participants would
  use. Have one laptop for the teacher role and a phone or tablet for the student role.
- Prepare a consent form for the participant: what is recorded (screen and voice, if you record; your notes; their
  questionnaire), that it is the software being tested, not them, that they can stop at any time, and how the data
  is kept and destroyed. Follow your university's ethics procedure; it decides whether you need approval.
- Print this page's task cards (one per task) and the SUS in the participant's language.
- Do one pilot session with a friend and fix the tasks that were unclear.

## In each session

1. **Welcome (3 min).** Read: "We are testing the software, not you. Please think aloud: say what you are looking
   for, what you expect to happen, and anything that surprises you. I can't help with the tasks, but you can stop at
   any time." Ask for consent.
2. **Background (2 min).** Role (teacher, student teacher, student), how often they use a digital whiteboard, how
   confident they are with maths on a computer (1–5).
3. **Tasks (25 min).** One card at a time. Start the timer when they've read the card; stop it when they say they
   are done or after the time limit. Note: success (yes / with a hint / no), time, errors (wrong turns, wrong
   clicks), and what they said. Give a hint only after 2 minutes stuck, and record it.
4. **SUS (3 min).** Straight after the tasks, before discussing anything.
5. **Debrief (5 min).** "What was the hardest part? What would you change first? Was anything missing?"

## Tasks

Teacher role (laptop):

| # | Task card | Done when | Time limit |
|---|---|---|---|
| T1 | Make a new board called "Lesson 1" and put a right-angled triangle on it, with its sides labelled. | The triangle is on the board with labels. | 3 min |
| T2 | Write the quadratic formula on the board. | The formula is on the board and readable. | 3 min |
| T3 | Put a graph of y = ax² + bx + c on the board that you can change with sliders. Make it touch the x-axis at one point. | A live graph whose curve touches the axis. | 4 min |
| T4 | Use the board to toss a coin 1,000 times. What fraction of the tosses were heads? | They read off the relative frequency. | 3 min |
| T5 | Set up a class for the study that practises algebra, with a 6-question test. Write down the class code. | A class exists with algebra skills and test length 6. | 4 min |
| T6 | Start the pre-test for the class. When the student has finished it, start a 10-minute practice session. | The phase shows "session" with a timer. | 3 min |
| T7 | After the session: which group answered more questions right first time? | They read it off the dashboard. | 3 min |

Student role (phone or tablet; run S1–S2 between T6 and T7, with the teacher's class code):

| # | Task card | Done when | Time limit |
|---|---|---|---|
| S1 | Join the class with the code your teacher gives you and do the test. | Every test question answered. | 6 min |
| S2 | Do five practice questions. Look at a worked solution at least once. | Five questions answered. | 6 min |
| S3 | Write down your student code, sign out, and come back in with it. | Signed in again under the same code. | 2 min |
| S4 | You've decided to stop taking part. Remove everything saved about you. | The record is deleted. | 2 min |

## System Usability Scale

Each statement is answered from 1 (strongly disagree) to 5 (strongly agree). Score: for odd-numbered items take
(answer − 1), for even-numbered items take (5 − answer); add the ten and multiply by 2.5, for 0–100. Around 68 is
average across published studies; above 80 is in the top tenth (Bangor, Kortum & Miller 2009).

**English** (Brooke 1996)

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Русский** (перевод для этого исследования; проверьте с носителем языка или используйте опубликованный
валидированный перевод, если он есть)

1. Думаю, что я хотел(а) бы пользоваться этой системой часто.
2. Система показалась мне излишне сложной.
3. Системой было легко пользоваться.
4. Думаю, что мне понадобилась бы помощь специалиста, чтобы пользоваться этой системой.
5. Разные функции системы хорошо связаны между собой.
6. В системе слишком много несогласованности.
7. Думаю, что большинство людей очень быстро научились бы пользоваться этой системой.
8. Пользоваться системой было очень неудобно.
9. Я чувствовал(а) себя очень уверенно, пользуясь системой.
10. Мне пришлось многому научиться, прежде чем я смог(ла) начать работать с системой.

**ქართული** (ამ კვლევისთვის თარგმნილი; გადაამოწმეთ მშობლიური ენის მცოდნესთან)

1. ვფიქრობ, რომ ამ სისტემით ხშირად სარგებლობა მომინდებოდა.
2. სისტემა ზედმეტად რთული მომეჩვენა.
3. სისტემით სარგებლობა ადვილი იყო.
4. ვფიქრობ, ამ სისტემით სარგებლობისთვის ტექნიკური სპეციალისტის დახმარება დამჭირდებოდა.
5. სისტემის სხვადასხვა ფუნქცია ერთმანეთთან კარგად არის დაკავშირებული.
6. სისტემაში ზედმეტად ბევრი შეუსაბამობაა.
7. ვფიქრობ, ადამიანების უმეტესობა ამ სისტემით სარგებლობას ძალიან სწრაფად ისწავლიდა.
8. სისტემით სარგებლობა ძალიან მოუხერხებელი იყო.
9. სისტემით სარგებლობისას თავს ძალიან თავდაჯერებულად ვგრძნობდი.
10. სანამ სისტემით მუშაობას დავიწყებდი, ბევრი რამის სწავლა დამჭირდა.

## Results template

Per participant:

| Participant | Role | Device | T1 | T2 | T3 | T4 | T5 | T6 | T7 | S1 | S2 | S3 | S4 | SUS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | | | ✓ 1:20 | | | | | | | | | | | |

(✓ done, ½ with a hint, ✗ not done; then the time.)

Problems found, one row each, with how many participants met it and how bad it is (Nielsen's severity: 1 cosmetic,
2 minor, 3 major, 4 blocks the task):

| Problem | Task | Participants | Severity | What they said | Fix |
|---|---|---|---|---|---|

Report: task success rate per task, median time per task, the mean SUS with its standard deviation and range, and
the problems ranked by severity × frequency. Fix the severity 3–4 problems and say so in the thesis.

## References

- Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective
  rating scale. *Journal of Usability Studies*, 4(3), 114–123.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan et al. (Eds.), *Usability Evaluation
  in Industry* (pp. 189–194). Taylor & Francis.
- Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. *Proceedings of
  INTERCHI '93*, 206–213.
