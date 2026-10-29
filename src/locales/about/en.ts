// The front page's words (pages/AboutPage.tsx, landing.tsx): kept apart so the page published on its own (GitHub
// Pages) carries only these, not the whole dictionary. ka.ts and ru.ts in this folder have exactly the same keys.
export const about = {
  title: "Every step covers half of what's left.",
  lede: "Zeno is free math practice and whiteboards for schools. It checks each answer the moment it is given and follows every student, skill by skill.",
  tryPractice: "Try the practice",
  forTeachers: "Set up a class",
  getZeno: "Get Zeno for your school",
  demoTitle: "Close the gap",
  answer: "Your answer",
  check: "Check",
  start: "Answer a question to take the first step.",
  right: "Right: half of the gap is gone.",
  wrong: "Not yet: {q} = {a}. The gap stays where it was.",
  covered: "{f} of the way",
  masteredTitle: "Mastered.",
  mastered: "Past the line at 0.95, a skill counts as mastered. Nobody has to reach 1.",
  again: "Start again",
  line: "mastered",
  lineLabel: "{p} of the way to 1",
  getsTitle: "What a class gets",
  facts: [
    ["77 skills", "In five areas: number, algebra, geometry and trigonometry, calculus, probability and statistics. From comparing two numbers to definite integrals."],
    ["Checked at once", "Numbers, fractions, expressions and equations are checked as soon as a student answers."],
    ["Mastery for every student", "The teacher page shows each student's chance of a right answer on every skill, so you can see who is ready to move on and who is stuck."],
    ["Printable tests", "A pre-test and a post-test in matching forms, ready to print, to measure what the class learned."],
    ["Whiteboards", "Boards for working out, with typeset formulas and 73 interactive pieces to drag and step through. Share a board with a link."],
    ["Three languages", "Georgian, English and Russian. Each student picks their own."],
  ] as [string, string][],
  stepsTitle: "How a class starts",
  steps: [
    "Make a class and choose what it practises: whole areas, or a year of the syllabus.",
    "Give your students the class code. They join without a name or email, and each one gets a student code to come back with.",
    "Students practise on their own devices. Every answer is checked and saved under their code.",
    "Follow the class: mastery by skill for every student, and the test results side by side.",
  ],
  ownTitle: "Your school keeps the data",
  own: "Zeno runs on your school's own computer, so students' answers stay there. There are no adverts, no trackers and no student accounts: names and emails are never asked for, and a student can delete everything saved under their code.",
  own2: "Zeno is free and open source under the MIT licence.",
  source: "Source code on GitHub",
  endTitle: "Start with one question.",
};

export type About = typeof about;
