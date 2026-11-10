"""The preliminary-defence talk: slides and the text to say beside each.

  python3 scripts/preliminary-slides.py

writes docs/thesis/preliminary-defense.pptx (the text to say is in each slide's notes) and
docs/thesis/preliminary-defense.md (the same talk to read from, with the questions to expect).
Every number is from docs/thesis/preliminary-draft.md as sent on 9 November 2026. Needs python-pptx.
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

DIR = Path(__file__).resolve().parent.parent / "docs" / "thesis"
TITLE = "The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems"
INK, GREY, RED = RGBColor(0x1F, 0x23, 0x28), RGBColor(0x5A, 0x62, 0x6B), RGBColor(0xC8, 0x10, 0x2E)

# Each slide: title, lines (short text), optional table (rows of cells) or image, and say (the talk).
# The language is kept simple on purpose: short sentences and common words, for listeners whose English is limited.
SLIDES = [
    dict(
        kind="title",
        title=TITLE,
        lines=["Preliminary defence", "Davit Tchintcharashvili", "Supervisor: Mikheil Gigauri",
               "University of Georgia, School of IT, Engineering and Mathematics", "November 2026"],
        say="Good afternoon. My name is Davit. My thesis is about learning programs, the programs where students "
            "practise mathematics. Today I will show my method and my first results.",
    ),
    dict(
        title="The problem: when does a student know a skill?",
        lines=["A learning program asks questions. After each answer it must decide: does the student know this skill?",
               "If it says “yes” too early, the student moves on and is not ready.",
               "If it says “yes” too late, the student loses time on easy questions.",
               "But what is one skill? Fractions can be 1 skill, or 16 small ideas."],
        say="A learning program asks a student questions. After each answer it must decide: does the student know "
            "this skill now? The program can make two mistakes. It can say yes too early. Then the student moves on, "
            "but is not ready. Or it can say yes too late. Then the student loses time on easy questions. There is "
            "one more problem. What is one skill? Fractions can be one big skill. Or fractions can be sixteen small "
            "ideas. Somebody must choose. I call this choice the grain. A coarse grain means big skills. A fine "
            "grain means small skills.",
    ),
    dict(
        title="Research question",
        lines=["Does the size of a skill change how well a program can decide that a student knows it?",
               "Grain = the size of a skill: one big skill, or many small parts.",
               "Good decision = when the program says “the student knows it”, this is true.",
               "Stable decision = the same rule works in different situations."],
        say="This is my research question. Does the size of a skill change how well the program decides? I look at "
            "two things. First, is the decision right? When the program says the student knows the skill, is it "
            "true? Second, is the decision stable? Does the same rule work in different situations?",
    ),
    dict(
        title="What other researchers did",
        lines=["They compared the rules for deciding (Pelánek & Řihák, 2017).",
               "They compared big and small skills, but only to predict the next answer (Pardos et al., 2007; "
               "Feng et al., 2009).",
               "They made a model for questions that need several skills (Pardos et al., 2008).",
               "Nobody checked: does the size of a skill change the decision itself? This is my work."],
        say="Other researchers worked on this before me. Some compared the rules for deciding. Some compared big "
            "skills and small skills. But they only asked: can we predict the next answer? Nobody checked the "
            "decision itself, the decision that the student knows the skill. To check it, we must know the truth "
            "about the student. This is the new part of my thesis.",
    ),
    dict(
        title="Three rules for deciding",
        lines=["BKT: calculates the probability that the student knows the skill. If it is 95 % or more, it says “yes”.",
               "Moving average (EMA): looks at the last answers. New answers count more.",
               "Streak: the student gives N right answers in a row, for example 3.",
               "I also proved two mathematical statements about these rules."],
        say="I compare three rules. The first is BKT, Bayesian Knowledge Tracing. It calculates the probability "
            "that the student knows the skill. When the probability is 95 percent or more, it says yes. The second "
            "is the moving average. It looks at the last answers, and new answers count more. The third is the "
            "streak rule. The student must give some right answers in a row, for example three. I also proved two "
            "statements. The first: the streak rule is a special case of the moving average. The second: BKT is "
            "correct when students learn exactly as BKT expects. So I must test BKT where students learn in a "
            "different way.",
    ),
    dict(
        title="Method: computer-made students",
        lines=["With real students, we never know the truth. So I made 400 students in the computer.",
               "For these students, I know exactly what they know after every answer.",
               "I can check every decision of the program: right or wrong.",
               "Then I change the size of the skill: too big, correct, too small.",
               "I set the rules on one group of students and test them on a different group."],
        say="How can I check a decision? With real students, we never know the truth. So I made students in the "
            "computer, four hundred of them. This is called simulation. For these students, I know exactly what "
            "they know after every answer. So I can check every decision. Then I change the size of the skill. "
            "First the skill in the program is too big. Then it is the correct size. Then it is too small. I set "
            "the rules on one group of students, and I test them on a different group. Anyone can run my code and "
            "get the same numbers.",
    ),
    dict(
        title="Result 1: BKT is good only when students learn as it expects",
        table=[["How students learn", "Rule", "Answers needed", "Right decisions"],
               ["They can forget", "BKT", "3.5", "89.4 %"],
               ["They can forget", "Moving average", "5.5", "96.0 %"],
               ["They can forget", "Streak", "4.2", "93.5 %"],
               ["Slowly, step by step", "BKT", "does not reach 90 %", "–"],
               ["Slowly, step by step", "Moving average", "25.7", "89.5 %"],
               ["Slowly, step by step", "Streak", "27.1", "92.9 %"]],
        lines=["Goal: 9 of 10 decisions must be right.",
               "When students learn slowly, BKT is too sure, too early."],
        say="The first result. The goal is that nine of ten decisions are right. When students can forget, BKT is "
            "the fastest. It needs about three and a half answers. The moving average needs five and a half. But "
            "when students learn slowly, step by step, BKT does not reach the goal. It becomes very sure after a "
            "few right answers, but the student is not ready. So the number from BKT is not always a real "
            "probability. In one situation we can trust it. In another situation we cannot.",
    ),
    dict(
        title="Result 2: a skill that is too big gives “yes” too early",
        image="figures/g1-components.png",
        lines=["One skill in the program, but several parts in reality. With 1 part, 98 % of decisions are right. "
               "With 4 parts, only 23 %.",
               "All three rules fail together. BKT on each part (dashed line) stays near 98 %."],
        say="The second result. Why does BKT fail? The reason is the size of the skill. Here, the real skill has "
            "several parts. The student learns each part separately. But the program sees only one big skill. Look "
            "at the picture. When the skill has one part, 98 percent of decisions are right. With two parts, 59 "
            "percent. With four parts, only 23 percent. All three rules fail together. The simple rules are not "
            "safer. The dashed line is BKT on each real part. It stays near 98 percent. But with eight or sixteen "
            "parts it stops deciding, because thirty questions are not enough for so many parts.",
    ),
    dict(
        title="Result 3: the correct size helps, but it needs enough questions",
        table=[["Questions", "Students who really know", "Program says “yes”", "Right decisions",
                "Finds the missing idea"],
               ["30", "36.5 %", "4.1 %", "100.0 %", "56.7 %"],
               ["60", "73.0 %", "47.3 %", "85.7 %", "66.9 %"],
               ["120", "89.2 %", "85.1 %", "77.8 %", "78.8 %"]],
        lines=["Fractions as 16 small ideas, with real questions from my system, Zeno.",
               "One fractions question needs about 6 ideas. A wrong answer does not show which idea is missing."],
        say="The third result uses a real topic, fractions. I divided fractions into sixteen small ideas. The "
            "questions come from Zeno. Zeno is the practice system that I built. One fractions question needs about "
            "six ideas together. So when the answer is wrong, we do not know which idea is missing. With thirty "
            "questions, the program finds the missing idea in 57 percent of cases, and it says yes to almost "
            "nobody. With 120 questions, it finds the missing idea in 79 percent of cases. So the correct size "
            "helps. But it needs two things: questions that show the ideas separately, and enough practice.",
    ),
    dict(
        title="Result 4: when the skill is too small, students wait too long",
        table=[["Pieces per real part", "Answers needed", "Right decisions", "Program says “yes” (at 95 %)"],
               ["1 (correct size)", "11.1", "89.9 %", "94.5 %"],
               ["2", "14.5", "94.8 %", "74.9 %"],
               ["4", "21.0", "93.0 %", "7.1 %"]],
        lines=["The same students and the same answers. Only the program cuts the skill into smaller pieces.",
               "Smaller is not always better."],
        say="The fourth result is the opposite case. The students are the same and the answers are the same. But "
            "the program cuts each real part into smaller pieces. When I cut each part into four pieces, the "
            "program needs ten more answers. And with the usual 95 percent rule, it says yes to only 7 percent of "
            "students. Before, it was 94 percent. So smaller is not always better. Each small piece gets too few "
            "answers.",
    ),
    dict(
        title="Limits of this work",
        lines=["The students are made by computer. Real students can be different.",
               "I divided fractions into 16 ideas myself. Another person could divide them differently.",
               "A rule that works for one group of students does not always work for a new group.",
               "I do not say there is one best size for all skills.",
               "I do not measure if Zeno helps a real class to learn."],
        say="My work has limits. The students are made by computer, and real students can be different. I divided "
            "fractions into sixteen ideas myself, and another person could do it differently. A rule that works "
            "for one group does not always work for a new group. I repeated every experiment five times, and I "
            "keep only the results that stay the same. I do not say there is one best size for all skills. And I "
            "do not measure if Zeno helps a real class.",
    ),
    dict(
        title="Conclusion and next steps",
        lines=["The size of a skill changes the decision.",
               "Too big: the program says “yes” too early.",
               "Too small: the program almost never says “yes”.",
               "The skills, the questions and the rule must be chosen together.",
               "Next, for the final thesis: the same question on answers of real students "
               "(ASSISTments data, about 4,000 students)."],
        say="My conclusion. The size of a skill changes the decision. When the skill is too big, the program says "
            "yes too early. When the skill is too small, the program almost never says yes. So we must choose the "
            "skills, the questions and the rule together. What is next? For the final thesis, I study the same "
            "question on answers of real students. This is a public data set called ASSISTments, with about four "
            "thousand students. Thank you. I am ready for your questions.",
    ),
]

# Short answers in simple words.
QUESTIONS = [
    ("What is new in your work?",
     "Other researchers compared these rules. They also compared big and small skills, but only to predict the next "
     "answer. I check the decision itself, and I check it against the truth. The rules are not new. The measurement "
     "is new."),
    ("Why computer-made students and not real students?",
     "With real students we never know if they really know the skill. So we cannot check the decision. In the "
     "computer I know the truth. Real students come in the final thesis, where I test prediction."),
    ("You made the students yourself. Maybe the result is only because of that?",
     "This is a real limit, and I write it in the thesis. But in Result 2 I made the best possible situation for BKT: "
     "every part is learnt exactly as BKT expects. BKT still fails when the skill is too big. So the reason is the "
     "size of the skill."),
    ("Is BKT a bad method?",
     "No. When students learn as it expects, 97 to 98 percent of its decisions are right. When students forget, it is "
     "the fastest rule. It fails when one skill in the program is really several parts."),
    ("The table says BKT does not reach 90 %. Is that always true?",
     "I first searched limits up to 0.9999. Later I searched higher, and BKT reaches 90 percent with a limit very "
     "close to 1, about 0.9999999. I report both results. Such a limit is not practical, because you must know how "
     "students learn to choose it."),
    ("Did you change anything after you saw the results?",
     "Yes, two things, and I write both in the thesis. First I compared the rules at the same cost. That showed "
     "nothing, so I compared them at the same share of right decisions. And I built the experiments with skill "
     "size after the first result."),
    ("What did you do yourself?",
     "The two proofs, the computer-made students, the sixteen ideas of fractions, the code for all three rules, and "
     "the analysis. All the code is public. Each table shows the command that made it."),
    ("Why don't you use Python or MATLAB for the simulations?",
     "Zeno is written in TypeScript, and the simulation uses the same code as Zeno: the same question generators and "
     "the same rules for deciding. So I test the real code that students use, not a copy of it. If I wrote it again "
     "in Python or MATLAB, I would have two versions, and they could give different results. The mathematics is "
     "simple, probabilities and averages, so I do not need a special tool. I can also fix the random numbers, so "
     "one command gives the same tables again. Python is a good choice for a new project; here the product already "
     "existed in TypeScript."),
    ("What is your plan for the future of the product?",
     "Three steps. First, I put the result of this thesis into Zeno: the rule that decides when a student knows a "
     "skill, and the small ideas to choose the next question. Second, I try Zeno with a real class and a teacher. "
     "Zeno can already split a class into two groups and give a test before and after. Third, a bigger study in "
     "several schools, to check if this kind of practice really helps students learn more. That study needs "
     "permission from the schools and a few hundred students, so it comes after the bachelor's thesis. Zeno is "
     "open source, so any teacher can use it for free."),
    ("What does this mean for Zeno?",
     "Choose the skills and the questions together, and test the rule on Zeno's own data. The full recommendation is "
     "in the final thesis."),
    ("What is left to do?",
     "The part with real students' answers, the ASSISTments data, and the formatting by the university rules. I send "
     "the final thesis to my supervisor by 18 January 2027."),
]


def text_box(slide, left, top, width, height, lines, size, color=INK, bold_first=False, space=10):
    frame = slide.shapes.add_textbox(left, top, width, height).text_frame
    frame.word_wrap = True
    for i, line in enumerate(lines):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.space_after = Pt(space)
        run = p.add_run()
        run.text = line
        run.font.size, run.font.color.rgb, run.font.name = Pt(size), color, "Arial"
        run.font.bold = bold_first and i == 0
    return frame


def build_pptx(path):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    W = prs.slide_width
    for n, s in enumerate(SLIDES, 1):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        if s.get("kind") == "title":
            slide.shapes.add_picture(str(DIR / "figures/ug-logo.jpeg"), Inches(5.9), Inches(0.5), height=Inches(1.5))
            f = text_box(slide, Inches(1), Inches(2.3), W - Inches(2), Inches(1.8), [s["title"]], 34)
            f.paragraphs[0].alignment = 2
            f = text_box(slide, Inches(1), Inches(4.4), W - Inches(2), Inches(2.6), s["lines"], 20, GREY, space=6)
            for p in f.paragraphs:
                p.alignment = 2
            f.paragraphs[0].runs[0].font.color.rgb = RED
        else:
            text_box(slide, Inches(0.7), Inches(0.45), W - Inches(1.4), Inches(1.1), [s["title"]], 30)
            bar = slide.shapes.add_shape(1, Inches(0.7), Inches(1.5), Inches(1.2), Inches(0.06))
            bar.fill.solid()
            bar.fill.fore_color.rgb = RED
            bar.line.fill.background()
            top = Inches(1.9)
            if "table" in s:
                rows, cols = len(s["table"]), len(s["table"][0])
                height = Inches(0.48) * rows
                table = slide.shapes.add_table(rows, cols, Inches(0.7), top, W - Inches(1.4), height).table
                for r, row in enumerate(s["table"]):
                    for c, cell_text in enumerate(row):
                        cell = table.cell(r, c)
                        cell.text = cell_text
                        run = cell.text_frame.paragraphs[0].runs[0]
                        run.font.size, run.font.name, run.font.bold = Pt(18), "Arial", r == 0
                        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if r == 0 else INK
                        cell.fill.solid()
                        cell.fill.fore_color.rgb = INK if r == 0 else (
                            RGBColor(0xF3, 0xF4, 0xF6) if r % 2 else RGBColor(0xFF, 0xFF, 0xFF))
                top += height + Inches(0.35)
                text_box(slide, Inches(0.7), top, W - Inches(1.4), Inches(1.6), s["lines"], 18, GREY)
            elif "image" in s:
                slide.shapes.add_picture(str(DIR / s["image"]), Inches(2.9), Inches(1.75), height=Inches(4.2))
                text_box(slide, Inches(0.7), Inches(6.0), W - Inches(1.4), Inches(1.3), s["lines"], 17, GREY, space=4)
            else:
                text_box(slide, Inches(0.7), top, W - Inches(1.4), Inches(5), s["lines"], 24, bold_first=n == 3,
                         space=16)
            text_box(slide, W - Inches(1.2), Inches(6.9), Inches(0.8), Inches(0.4), [str(n)], 12, GREY)
        slide.notes_slide.notes_text_frame.text = s["say"]
    prs.save(path)


def build_md(path):
    words = sum(len(s["say"].split()) for s in SLIDES)
    out = [
        "# Preliminary defence", "",
        f"The talk for the preliminary defence of *{TITLE}*, by Davit Tchintcharashvili, supervised by Mikheil "
        "Gigauri. The defence falls between 16 and 21 November 2026; the date, room and length allowed are not yet "
        f"known. The talk is about {round(words, -1)} words, which is about {round(words / 130)} minutes at an even "
        "pace. It covers what the preliminary draft sent on 9 November contains, the method and the simulation "
        "results, and every number is that draft's. The slides are in `preliminary-defense.pptx`, with this text "
        "in each slide's notes; both files are written by `scripts/preliminary-slides.py`.", "",
        "## The talk", "",
    ]
    for n, s in enumerate(SLIDES, 1):
        out += [f"*Slide {n}: {s['title'] if s.get('kind') != 'title' else 'the title, the author, the supervisor'}.*",
                "", s["say"], ""]
    out += ["## Questions to expect", ""]
    for q, a in QUESTIONS:
        out += [f"**{q}** {a}", ""]
    path.write_text("\n".join(out), encoding="utf-8")
    return words


build_pptx(DIR / "preliminary-defense.pptx")
print(f"{DIR / 'preliminary-defense.pptx'} ({len(SLIDES)} slides)")
print(f"{DIR / 'preliminary-defense.md'} ({build_md(DIR / 'preliminary-defense.md')} words to say)")
