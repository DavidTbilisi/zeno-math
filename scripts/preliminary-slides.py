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
SLIDES = [
    dict(
        kind="title",
        title=TITLE,
        lines=["Preliminary defence", "Davit Tchintcharashvili", "Supervisor: Mikheil Gigauri",
               "University of Georgia, School of IT, Engineering and Mathematics", "November 2026"],
        say="Good afternoon. My thesis is about one decision that every adaptive practice system makes, and about "
            "something that decision quietly depends on. Today I present the method and the simulation results, "
            "which is what the preliminary draft contains.",
    ),
    dict(
        title="The decision: has this student mastered this skill?",
        lines=["Declared too early: the student moves on without a skill the next work needs.",
               "Declared too late: the student answers questions they can already answer.",
               "Every method takes “the skill” as given.",
               "But fractions can be one skill, or sixteen ideas. Someone chooses."],
        say="A practice system must decide, after each answer, whether the student has mastered the skill and can "
            "move on. Both mistakes cost something. Too early, and the student starts work that needs a skill they "
            "do not have. Too late, and they spend time on questions they can already answer. Every method that "
            "makes this decision takes the skill as given. But what counts as one skill is a choice. Fractions can "
            "be one skill, or sixteen separate ideas, from the times tables to converting a mixed number. I call "
            "that choice the grain.",
    ),
    dict(
        title="Research question",
        lines=["How does the grain at which skills are defined affect the accuracy and reliability of mastery "
               "estimation?",
               "Grain: how many components a topic is divided into, and which components each question needs.",
               "Accuracy: the share of mastery declarations that are right.",
               "Reliability: calibration, and whether one threshold keeps working."],
        say="The research question, approved at the title defence, is how the grain at which skills are defined "
            "affects the accuracy and reliability of mastery estimation. Grain means two things together: how many "
            "components a topic is divided into, and which of them each question needs. Accuracy is the share of "
            "mastery declarations that are right. Reliability is whether the score can be read as a probability, "
            "and whether a threshold that works in one setting still works in another.",
    ),
    dict(
        title="What earlier work measured, and what it did not",
        lines=["Mastery rules compared: the threshold and the data matter more than the model (Pelánek & Řihák, 2017).",
               "Grain compared for prediction: finer skill models predict better (Pardos et al., 2007; Feng et al., 2009).",
               "Questions that need several skills: the conjunctive model (Pardos et al., 2008).",
               "Not measured: what grain does to the mastery decision itself, against a known truth."],
        say="Three lines of earlier work meet here. Mastery rules have been compared before, most closely by Pelánek "
            "and Řihák, who found that the threshold and the data matter more than the model. The grain of a skill "
            "model has been compared too, on the ASSISTments system, but for predicting answers. And there is a "
            "model for questions that need several skills at once. What had not been measured is what the grain "
            "does to the mastery decision itself, checked against a known truth. That is the gap this thesis fills.",
    ),
    dict(
        title="Three methods, two proofs",
        lines=["BKT: the skill is known or not; mastered when P(known) reaches a threshold, usually 0.95.",
               "EMA: a moving average of recent answers; mastered when it reaches a threshold.",
               "Streak: the last N answers were right.",
               "Proposition 1: exactly when the streak rule is a moving average.",
               "Proposition 2: in its own world, BKT is right at least as often as its threshold says."],
        say="I compare three methods. Bayesian Knowledge Tracing treats a skill as known or not known and keeps a "
            "probability that it is known; mastery is declared when that probability reaches a threshold, usually "
            "0.95. The exponential moving average simply weights recent answers more. The streak rule asks for N "
            "right answers in a row. Two results are proved. The first says exactly when the streak rule is a "
            "special case of the moving average. The second says that in a world built the way BKT assumes, BKT's "
            "declarations are right at least as often as its threshold says. So a world like that cannot be "
            "evidence for BKT. The comparison that counts happens in worlds that break its assumptions.",
    ),
    dict(
        title="Method: simulated students whose true state is known",
        lines=["400 simulated students; the truth is recorded after every answer.",
               "Worlds: BKT's own, BKT with forgetting, and two where learning is gradual.",
               "Then the grain changes: model too coarse (G1), at the right grain (G2), too fine (G3).",
               "Parameters and thresholds are set on training students and judged on held-out students.",
               "Measured: precision, answers needed, share declared, calibration (Brier score)."],
        say="Real data never show whether a student has truly mastered a skill. So I simulate students whose true "
            "state is known after every answer, and check each declaration against it. There are four worlds at "
            "one grain: BKT's own world, the same with forgetting, and two where ability rises gradually. Then "
            "three granularity studies change the grain: the model is made coarser than the way students learn, "
            "matched to it, and made finer. Everything is fitted on training students and judged on a fifth of the "
            "students held out. I measure how often declarations are right, how many answers they cost, how many "
            "students are released at all, and calibration. Every run is seeded and can be reproduced from the code.",
    ),
    dict(
        title="Result 1: at one grain, BKT works where its assumptions hold",
        table=[["World", "Method", "Rule", "Answers", "Precision"],
               ["Forgetting", "BKT", "0.79", "3.5", "89.4 %"],
               ["Forgetting", "EMA", "0.61", "5.5", "96.0 %"],
               ["Forgetting", "Streak", "2", "4.2", "93.5 %"],
               ["Gradual (elo)", "BKT", "never", "–", "–"],
               ["Gradual (elo)", "EMA", "0.93", "25.7", "89.5 %"],
               ["Gradual (elo)", "Streak", "14", "27.1", "92.9 %"]],
        lines=["Target: 90 % of declarations right. Learning rate 0.1, held-out students.",
               "Calibration (Brier) of BKT: 0.023 in its own world, 0.339 where learning is gradual."],
        say="First, the methods at one grain. The rule for each method is chosen so that nine declarations in ten "
            "are right on the training students. Where students forget, BKT is the cheapest: about three and a half "
            "answers against five and a half for the moving average. Where learning is gradual, no threshold up to "
            "0.9999 brings BKT to that standard. A later check showed it can get there, but only at a threshold of "
            "about seven nines, which has to be set knowing the world. Calibration tells the same story: BKT's "
            "Brier score is 0.023 in its own world and 0.339 in the gradual one. A number that is a good "
            "probability in one world is a poor one in another.",
    ),
    dict(
        title="Result 2: a model that is too coarse declares too early",
        image="figures/g1-components.png",
        lines=["One modelled skill, several real components: BKT at 0.95 falls from 98 % right to 23 % at four components.",
               "The simple rules fall with it. BKT on each component stays near 98 %, while it can still declare."],
        say="Why does BKT fail in the gradual worlds? The answer is grain. Here every skill is made of several "
            "components, and each one is learnt in a single step, exactly as BKT assumes. But the model treats the "
            "skill as one. With one component, 98 % of BKT's declarations at 0.95 are right. With two it is 59 %, "
            "with four 23 %, with sixteen half a percent. The moving average and the streak rule fall the same way, "
            "so simplicity does not protect them. The dashed line is BKT on each real component: it stays near "
            "98 %. But at eight and sixteen components it stops declaring at all, because thirty questions give "
            "each component too little evidence.",
    ),
    dict(
        title="Result 3: the right grain helps, on two conditions",
        table=[["Questions", "Truly mastered", "Declared", "Precision", "Missing idea found"],
               ["30", "36.5 %", "4.1 %", "100.0 %", "56.7 %"],
               ["60", "73.0 %", "47.3 %", "85.7 %", "66.9 %"],
               ["120", "89.2 %", "85.1 %", "77.8 %", "78.8 %"]],
        lines=["Fractions as sixteen ideas, with Zeno's own question generators. Learning rate 0.1.",
               "A fractions question needs about six ideas at once, so one wrong answer does not say which is missing."],
        say="The second study uses a real topic. I decomposed fractions by hand into sixteen ideas and used the "
            "question generators of Zeno, the practice system this work grew out of. A fractions question needs "
            "about six ideas at once, so a wrong answer does not say which one is missing. After thirty questions "
            "the model names the missing idea in about 57 % of cases and releases almost nobody. With 120 questions "
            "it names the idea in 79 % of cases and releases 85 % of students. But precision on held-out students "
            "falls below the 90 % target, to 78 %. So the right grain helps, on two conditions: the questions must "
            "tell the ideas apart, and the practice must be long enough.",
    ),
    dict(
        title="Result 4: a model that is too fine wastes answers",
        table=[["Parts per component", "Answers", "Precision", "Declared at 0.95", "Brier", "Fits at bound"],
               ["1", "11.1", "89.9 %", "94.5 %", "0.082", "0.0 %"],
               ["2", "14.5", "94.8 %", "74.9 %", "0.149", "29.2 %"],
               ["4", "21.0", "93.0 %", "7.1 %", "0.384", "80.2 %"]],
        lines=["Same students, same answers; only the model is split finer than the students learn."],
        say="The third study goes the other way. The students and their answers stay exactly the same, and I split "
            "each real component into artificial parts in the model only. Splitting four ways costs about ten more "
            "answers for the same precision. At the usual threshold of 0.95, the share of students released falls "
            "from 94.5 % to 7 %. And the fits pile up at the edge of the allowed range, which is a warning a system "
            "could see in its own data. Finer is not safer.",
    ),
    dict(
        title="Limits",
        lines=["The simulated worlds are built by this thesis; they show what follows under those assumptions.",
               "The sixteen ideas of fractions are a hand-made decomposition.",
               "Comparing at equal precision was chosen after a first run at equal cost proved uninformative.",
               "A threshold set on training students does not always hold on new students.",
               "No universal best grain is claimed, and Zeno's effect on classroom learning is not measured."],
        say="The limits. The worlds are of my own making, so they show what follows under those assumptions, not "
            "how all students learn. The decomposition of fractions is done by hand. Comparing the methods at equal "
            "precision was a change made after the first run at equal cost turned out to be uninformative, and the "
            "draft says so. A threshold chosen on training students does not always hold on new ones. All tables "
            "were repeated on four more seeds, and I rely only on the effects that survive. I do not claim a best "
            "grain in general, and I do not measure whether Zeno helps a class learn.",
    ),
    dict(
        title="Preliminary conclusion and what remains",
        lines=["Grain changes what a mastery score means and how much evidence a decision needs.",
               "Too coarse: confident about a mixture of known and unknown ideas.",
               "Too fine: almost nobody is released.",
               "The component mapping, the questions and the mastery rule must be chosen together.",
               "For the final thesis: the same question on real answers, ASSISTments 2009–2010 (H1, G4), "
               "and the recommendation for Zeno."],
        say="The preliminary conclusion is that the grain changes both what a mastery score means and how much "
            "evidence a decision needs. A model that is too coarse becomes confident about a mixture of known and "
            "unknown ideas. A model that is too fine releases almost nobody. So the component mapping, the "
            "questions and the mastery rule have to be chosen together. For the final thesis, what remains is the "
            "same question on real students' answers, the public ASSISTments data, with the test fixed in advance, "
            "and the recommendation for Zeno. Thank you. I am glad to take questions.",
    ),
]

QUESTIONS = [
    ("What is new, if BKT and mastery rules have been compared before?",
     "They have, most closely by Pelánek and Řihák (2017), and my one-grain results agree with them. Grain has been "
     "compared too, by Pardos and by Feng on ASSISTments, but for prediction. What had not been measured is what "
     "grain does to the mastery decision itself against a known truth. None of the methods is new; the measurement is."),
    ("Why simulation and not real students?",
     "Because real data never show whether a student has truly mastered a skill, so a declaration cannot be checked. "
     "In simulation the truth is recorded. The real-data part, on ASSISTments, is in the final thesis and tests "
     "prediction, which real data do allow."),
    ("You built the worlds yourself. Doesn't that decide the result?",
     "It limits what the result means, and the draft says so. The G1 world is the most favourable one for BKT I could "
     "build: every component is exactly what BKT assumes. BKT still fails when the grain is wrong, so the failure "
     "comes from the grain and not from a world chosen against it."),
    ("Is BKT bad, then?",
     "No. In its own world it is right 97 to 98 % of the time at 0.95, as Proposition 2 predicts, and with forgetting "
     "it is the cheapest method. It fails when one modelled skill stands for several learnt units."),
    ("Why does BKT say “never” in the gradual worlds, and then reach the target later?",
     "The first search stopped at 0.9999, a ceiling fixed in advance. A later check extended it and BKT reaches 90 % "
     "at about seven nines. I report both. A threshold that close to 1 has to be set knowing the world, so it is not "
     "a rule a system could use in general."),
    ("What did you change after seeing results?",
     "Two things, both stated in the draft: the comparison moved from equal cost to equal precision, and the "
     "granularity worlds were first built as checks after H2. The later sweeps were specified before they were run."),
    ("What is your own work here?",
     "The two proofs, the simulation worlds, the decomposition of fractions into sixteen ideas, the implementation of "
     "all three methods and the per-component model, and the analysis. All of it is in the public repository and "
     "each table names the command and the commit that produced it."),
    ("What does this mean for Zeno?",
     "Choose the components together with the questions, and check the stopping rule on the data it will face. The "
     "full recommendation is in the final thesis."),
    ("What remains before the final submission?",
     "Integrating the ASSISTments analyses, H1 on prediction and G4 on the same answers at three grains, and the "
     "formatting to the university's rules. The final thesis goes to the supervisor by 18 January 2027."),
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
