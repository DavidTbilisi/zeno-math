# Zeno for teachers, in six short videos

Each video shows one job from start to finish, with a caption for every step. Videos with a student in them show
the teacher's laptop on the left and the student's phone on the right. Click a picture to play its video.

## 1. Make a class

Open `#/teacher`, type the teacher password, name the class and choose what it practises: whole topics, or every
skill of a grade. The class gets a code, a join link and a QR code to show to the room.

[![Making a class: password, name, grade, code, join link and QR code](media/workflows/class.png)](media/workflows/class.mp4)

## 2. Students join

A student opens the join link or scans the QR code. The class code is already filled in; they type their number in
the class list, agree to take part and press Join. They get a student code instead of a name, and their first
question straight away. After **Refresh** the teacher sees them in the class and in the mastery table.

[![A student joins on a phone and answers; the teacher sees them arrive](media/workflows/join.png)](media/workflows/join.mp4)

## 3. Run a lesson

The **Today** tab moves the class through the lesson: open practice, the pre-test, a timed session, the post-test,
the delayed post-test, closed. A test reaches every student's practice within half a minute. Below it, **Who is
stuck** groups the students who keep making the same mistake. Mark one **Seen** once you have helped them.

[![The pre-test and a 20-minute session reaching a student; the stuck list](media/workflows/lesson.png)](media/workflows/lesson.mp4)

## 4. Give homework

On the **Homework** tab, **Make homework for every student** gives each student their own questions, chosen from
their own answers: easier repair questions for a student on the stuck list, reviews that are due, practice aimed at
their weakest idea, and one harder question. The student finds it when they open practice. The table fills in as
they answer, and **Print the homework** gives a sheet for each student without a device at home.

Homework opens once the class has taken its delayed post-test, so it can't change what the study compares. A class
that isn't part of the study, a pilot say, can be taken out of it on the same tab, and then has homework at any time.

[![Homework made for each student, done on a phone, and the results on the teacher's table](media/workflows/homework.png)](media/workflows/homework.mp4)

## 5. Read the class's progress

The **Progress** tab gives the class a goal (a roadmap each student's site opens on), each topic's class average, and
the mastery table: a row per student, a column per skill, each cell the chance of a right first answer. **Find a
student's code** finds the code of a student who lost theirs, by their number in the class list.

[![The class goal, topics, the mastery table with numbers, and finding a student's code](media/workflows/progress.png)](media/workflows/progress.mp4)

## 6. Tests on paper

**Print the tests** gives the three test forms, each with its answer key. After a test written on paper, type each
sheet in on the **Study** tab: Zeno marks it as it marks answers typed online.

[![Printing the test forms, then typing a student's paper answers in to be marked](media/workflows/paper.png)](media/workflows/paper.mp4)

## Recording them again

The videos are recorded by `scripts/workflow-videos.mjs` against a running build, on an empty data folder (each
scene adds its classes and students through the API):

```bash
npm run build
PORT=8797 DATA_DIR=$(mktemp -d) TEACHER_PASSWORD=demo APP_PASSWORD= node server/index.ts &
npm run workflow-videos              # or name scenes: class join lesson homework progress paper
```

It needs `ffmpeg` with an H.264 encoder (libx264, or OpenH264 as in Fedora's ffmpeg-free) and the `drawtext`
filter, which writes the captions in a strip under the picture.
