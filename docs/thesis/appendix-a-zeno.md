# Appendix A The Zeno system in brief

Zeno is the system in which this thesis's question arose and whose code it runs in. It is not what the thesis
evaluates, and this appendix describes it only as far as the main text needs. The full description is in the
repository, in `docs/architecture.md` and `docs/api.md`.

## A.1 Purpose and setting

Zeno is a self-hosted mathematics whiteboard for secondary schools, built with ordinary Georgian schools in mind. In
that setting classroom Wi-Fi is unreliable, devices are shared and varied, there is no budget for licences, and
lessons are taught in Georgian and sometimes Russian. Zeno therefore runs on one school machine or a teacher's laptop,
loads nothing from the internet, keeps working through a lost connection and has an interface in Georgian, Russian
and English.

The whiteboard is built on Excalidraw [@excalidraw] and adds 33 mathematics tools, among them graphs, geometry,
step-by-step algebra and statistics, and 72 ready-made mathematical shapes. Inside it, a practice dialog generates
questions for 75 skills in five areas, each at three levels of difficulty, checks typed answers, names common mistakes
behind wrong answers and shows worked solutions. Appendix E sets the skills against a primary syllabus.

Students join a class with a code and need no account. Zeno collects no names, email addresses or other directly
identifying information. Practice records are stored under pseudonymous student codes, which is still personal data
in the sense of Georgia's data protection law [@georgia2023pdp] and the GDPR [@gdpr2016], and exports replace the
codes with study identifiers.

![Zeno in its setting: one machine in the school serves the board and the practice to the teacher's and students'
devices (`docs/architecture.md`, "System context").](figures/context.png)

## A.2 The learner model and the mastery decision

Zeno chooses practice questions with a learner model of the Elo kind [@pelanek2016elo; @klinkenberg2011]
(`src/model/elo.ts`). For a student answering a question on a skill at a given level, the predicted chance of a right
first answer is the logistic function of the student's ability minus the question's difficulty. The ability has three
layers, an overall ability, an ability for the skill's area and an ability for the skill itself, so a skill the
student has not yet practised starts from what they have shown elsewhere. The difficulty belongs to the skill and
level, since generated questions are each seen only once. After every answer each term moves by the surprise, the
outcome minus the prediction, scaled by a step that shrinks with the evidence the term has already absorbed. The model
learns from each question's first counted answer only, and the same code runs in the student's browser and on the
server.

The adaptive policy (`src/model/policy.ts`) chooses the skill and level at which the model gives the student a chance of
a right first answer closest to a target, three in four by default. It holds a skill back while the skills it builds on
are weak, and it leaves a skill behind once the student has mastered it. Mastery was first decided by a fixed rule: the
model must give a hard question on the skill at least an 80 % chance of a right answer. That rule is the decision this
thesis's question is about, and since 28 October 2026 Zeno follows the recommendation of section 3.3 by adding two
conditions to it: the moving average of the student's answers on the skill must have reached 0.6962, the threshold that
costs on the ASSISTments training students what three right answers in a row cost (Table 3.9), until Zeno's own classes
give one, and on a skill with a concept graph the student must be likely, at 0.95, to know every idea together. Neither
condition can close a skill sooner than the first rule alone, and no simulation in this thesis uses them. On the three
skills with a concept graph (section 2.2), the policy also keeps one probability per idea from the student's answers
and, on fractions, asks the form for the idea they are least likely to know, as the future work in section 3.3
describes.

![Zeno's building blocks: the board and the practice dialog in the browser, the shared code for questions, marking
and the learner model, and the server with its single SQLite file (`docs/architecture.md`, "Building
blocks").](figures/blocks.png)

## A.3 The class study

Zeno also contains a protocol for a randomised class study, prepared for the wider question this thesis began with:
whether choosing questions with the learner model helps a class learn more than the same questions in a fixed order.
A teacher creates a class, students consent and join, and each is assigned by randomisation in blocks of four to the
adaptive or the fixed condition. Both conditions get the same feedback, worked solutions and practice time. A pre-test
and a post-test in parallel forms, counterbalanced within each condition, measure what was learnt, and the analysis
was written before any data. A dry run with simulated students rehearses the whole protocol through the real server on
every change to the code. The design, the simulations behind it and its power analysis are in `docs/study.md` in the
repository, and the future work in section 3.3 summarises why the study needs several classes.
