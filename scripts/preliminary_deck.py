"""The look of the preliminary-defence deck: charts drawn from the draft's numbers, diagrams in native shapes.

Used by scripts/preliminary-slides.py, which holds the words (slides, talk, questions). The charts are written to
docs/thesis/figures/defense/ on every build. Every number here is one the talk already says, from
docs/thesis/preliminary-draft.md. Needs python-pptx, Pillow and matplotlib.
"""
from io import BytesIO
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from lxml import etree  # noqa: E402
from PIL import Image  # noqa: E402
from pptx import Presentation  # noqa: E402
from pptx.dml.color import RGBColor  # noqa: E402
from pptx.enum.dml import MSO_LINE  # noqa: E402
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE  # noqa: E402
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN  # noqa: E402
from pptx.util import Inches as I, Pt  # noqa: E402

DIR = Path(__file__).resolve().parent.parent / "docs" / "thesis"
FIG = DIR / "figures" / "defense"


def rgb(h):
    return RGBColor.from_string(h.lstrip("#").upper())


# Ink and the university's red; the three rules keep one colour each on every slide (validated for colour-blind
# separation with the dataviz validator: worst adjacent CVD ΔE 12.5, all ≥ 3:1 on white).
INK, GREY, MUTED, LINE, PANEL = "#1F2328", "#5A626B", "#9AA1A9", "#D0D4D9", "#F3F4F6"
RED, RED_SOFT = "#C8102E", "#FBE9EC"
BKT, EMA, STREAK = "#2563EB", "#D97706", "#0D9488"
AMBER_SOFT, BLUE_SOFT = "#FDF1E2", "#E8EFFD"
FONT = "Arial"

SECTIONS = ["Problem", "Method", "Results", "Conclusion"]
SECTION_OF = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 3, 15: 3}

# ---------------------------------------------------------------------------------------------------------- charts

plt.rcParams.update({
    "font.family": ["Liberation Sans", "DejaVu Sans"], "font.size": 15, "axes.edgecolor": LINE,
    "axes.labelcolor": GREY, "xtick.color": GREY, "ytick.color": GREY, "axes.spines.top": False,
    "axes.spines.right": False, "axes.titlesize": 17, "axes.titleweight": "bold", "axes.titlecolor": INK,
    "axes.titlelocation": "left", "axes.titlepad": 12, "savefig.dpi": 200, "figure.facecolor": "white",
})


def save(fig, name):
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / name, facecolor="white")
    plt.close(fig)
    return FIG / name


def grid_y(ax):
    ax.grid(axis="y", color="#E6E8EB", linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def pct_axis(ax):
    ax.set_ylim(0, 105)
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.set_yticklabels(["0 %", "25 %", "50 %", "75 %", "100 %"])


def chart_rules():
    """One made-up run of answers, read by each rule; the first answer at which each says 'yes'."""
    answers = [0, 1, 0, 1, 1, 1, 1, 1]
    p, bkt = 0.3, []
    for a in answers:  # BKT with start 0.3, learning 0.2, guess 0.2, slip 0.1
        p = p * 0.9 / (p * 0.9 + (1 - p) * 0.2) if a else p * 0.1 / (p * 0.1 + (1 - p) * 0.8)
        p = p + (1 - p) * 0.2
        bkt.append(p)
    s, ema = 0.5, []
    for a in answers:  # EMA with alpha 0.4 from 0.5
        s = 0.6 * s + 0.4 * a
        ema.append(s)
    run, streak = 0, []
    for a in answers:
        run = run + 1 if a else 0
        streak.append(run)
    fig, axes = plt.subplots(1, 3, figsize=(12.2, 3.55), constrained_layout=True)
    x = list(range(1, len(answers) + 1))
    panels = [
        (axes[0], bkt, 0.95, BKT, "BKT", "chance the student knows it", (0, 1.05), "95 %"),
        (axes[1], ema, 0.8, EMA, "Moving average", "score, new answers count more", (0, 1.05), "limit"),
        (axes[2], streak, 3, STREAK, "Streak", "right answers in a row", (0, 5.6), "3 in a row"),
    ]
    for ax, ys, limit, colour, name, what, ylim, limit_label in panels:
        yes = next(i for i, v in enumerate(ys) if v >= limit)
        if name == "Streak":
            ax.bar(x, ys, color=colour, width=0.62)
        else:
            ax.plot(x, ys, color=colour, linewidth=3, marker="o", markersize=8, markeredgecolor="white",
                    markeredgewidth=2, zorder=3)
        ax.axhline(limit, color=INK, linewidth=1.3, linestyle=(0, (4, 3)))
        ax.text(0.55, limit, f" {limit_label}", va="bottom", ha="left", fontsize=13, color=INK)
        ax.annotate("“yes”", (x[yes], ys[yes]), xytext=(x[yes] - 1.6, ylim[1] * 0.97), fontsize=15,
                    fontweight="bold", color=RED, arrowprops=dict(arrowstyle="-|>", color=RED, lw=1.8))
        ax.set_ylim(*ylim)
        ax.set_xlim(0.4, len(x) + 0.6)
        ax.set_xticks(x)
        ax.set_xticklabels(["✓" if a else "✗" for a in answers], fontsize=17)
        for t, a in zip(ax.get_xticklabels(), answers):
            t.set_color(INK if a else MUTED)
        ax.set_title(name, color=colour)
        ax.set_ylabel(what, fontsize=13)
        if name == "Streak":
            ax.set_yticks([0, 1, 2, 3, 4, 5])
        else:
            ax.set_yticks([0, 0.5, 1])
            ax.set_yticklabels(["0", "0.5", "1"])
        grid_y(ax)
    return save(fig, "rules.png")


def chart_result1():
    fig, axes = plt.subplots(2, 1, figsize=(8.3, 4.6), sharex=True, constrained_layout=True)
    fig.get_layout_engine().set(h_pad=0.12)
    rules, colours = ["BKT", "Moving average", "Streak"], [BKT, EMA, STREAK]
    worlds = [("They can forget", [3.5, 5.5, 4.2], ["89.4 %", "96.0 %", "93.5 %"]),
              ("Slowly, step by step", [None, 25.7, 27.1], [None, "89.5 %", "92.9 %"])]
    for ax, (world, needed, right) in zip(axes, worlds):
        y = [2, 1, 0]
        for yi, n, r, c in zip(y, needed, right, colours):
            if n is None:
                ax.text(0.4, yi, "never reaches 9 of 10 right", va="center", fontsize=15, color=RED,
                        fontweight="bold")
                continue
            ax.barh(yi, n, color=c, height=0.62)
            ax.text(n + 0.4, yi, f"{n:g} answers  ·  {r} right", va="center", fontsize=14, color=INK)
        ax.set_yticks(y)
        ax.set_ylim(-0.55, 2.55)
        ax.set_yticklabels(rules, fontsize=15)
        ax.set_title(world)
        ax.set_xlim(0, 40)
        ax.grid(axis="x", color="#E6E8EB")
        ax.set_axisbelow(True)
        ax.tick_params(length=0)
    axes[1].set_xlabel("answers needed before “yes”")
    return save(fig, "result1.png")


def chart_result3():
    fig, ax = plt.subplots(figsize=(8.3, 4.65), constrained_layout=True)
    x, labels = [0, 1, 2], ["30", "60", "120"]
    series = [("Finds the missing idea", [56.7, 66.9, 78.8], BKT, "-", 76),
              ("Program says “yes”", [4.1, 47.3, 85.1], EMA, "-", 85),
              ("Students who really know", [36.5, 73.0, 89.2], INK, (0, (4, 3)), 94)]
    for name, ys, c, ls, end_y in series:
        ax.plot(x, ys, color=c, linewidth=3, linestyle=ls, marker="o", markersize=9, markeredgecolor="white",
                markeredgewidth=2, label=name)
        ax.text(x[0] - 0.08, ys[0], f"{ys[0]:.0f} %", ha="right", va="center", fontsize=14, color=INK)
        ax.text(x[-1] + 0.08, end_y, f"{ys[-1]:.0f} %", ha="left", va="center", fontsize=14, color=INK)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_xlim(-0.45, 2.45)
    ax.set_xlabel("questions practised")
    pct_axis(ax)
    grid_y(ax)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.2), ncol=3, frameon=False, fontsize=13,
              handlelength=2.2)
    return save(fig, "result3.png")


def chart_result4():
    fig, axes = plt.subplots(1, 2, figsize=(8.3, 4.5), constrained_layout=True)
    cats = ["1\n(correct)", "2", "4"]
    for ax, title, ys, fmt, ylim in [
        (axes[0], "Answers needed", [11.1, 14.5, 21.0], "{:g}", 25),
        (axes[1], "Program says “yes”", [94.5, 74.9, 7.1], "{:.0f} %", 110),
    ]:
        colours = [MUTED, MUTED, RED]
        ax.bar(cats, ys, color=colours, width=0.6)
        for i, v in enumerate(ys):
            ax.text(i, v + ylim * 0.02, fmt.format(v), ha="center", va="bottom", fontsize=16, color=INK,
                    fontweight="bold" if i == 2 else "normal")
        ax.set_ylim(0, ylim)
        ax.set_yticks([])
        ax.spines["left"].set_visible(False)
        ax.set_title(title)
        ax.set_xlabel("pieces per real part")
        ax.tick_params(length=0)
    return save(fig, "result4.png")


def chart_result5():
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(12.2, 4.35), constrained_layout=True,
                                 gridspec_kw=dict(width_ratios=[3, 2]))
    x, labels = [0, 1, 2, 3], ["1\n(correct)", "2", "4", "8"]
    truth, sign = [98, 59, 23, 8], [88, 75, 70, 64]
    ax.plot(x, truth, color=INK, linewidth=3, marker="o", markersize=9, markeredgecolor="white",
            markeredgewidth=2, label="Right decisions (the truth)")
    ax.plot(x, sign, color=BKT, linewidth=3, marker="o", markersize=9, markeredgecolor="white",
            markeredgewidth=2, label="Next 3 answers right (we can see this)")
    for xi, t, g in zip(x, truth, sign):
        for v, other in [(t, g), (g, t)]:
            ax.text(xi + (0.12 if xi == 0 else 0), v + (6.5 if v >= other else -6.5), f"{v} %", ha="center",
                    va="center", fontsize=14, color=INK)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_xlabel("parts in the real skill")
    ax.set_xlim(-0.4, 3.4)
    pct_axis(ax)
    grid_y(ax)
    ax.set_title("Computer-made students")
    ax.legend(loc="lower left", frameon=False, fontsize=13)
    cats, vals = ["110 skills", "5 topics", "1 skill"], [79, 73, 73]
    bx.bar(cats, vals, color=BKT, width=0.58)
    for i, v in enumerate(vals):
        bx.text(i, v + 2.5, f"{v} %", ha="center", va="bottom", fontsize=16, color=INK)
    pct_axis(bx)
    bx.set_yticks([])
    bx.spines["left"].set_visible(False)
    bx.tick_params(length=0)
    bx.set_title("Real students (ASSISTments)")
    bx.set_xlabel("next 3 answers right after “yes”")
    return save(fig, "result5.png")


# ---------------------------------------------------------------------------------------------------------- shapes


def text_box(slide, left, top, width, height, lines, size, color=INK, bold_first=False, space=10, align=None):
    frame = slide.shapes.add_textbox(left, top, width, height).text_frame
    frame.word_wrap = True
    for i, line in enumerate(lines):
        p = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        p.space_after = Pt(space)
        if align is not None:
            p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.size, run.font.color.rgb, run.font.name = Pt(size), rgb(color), FONT
        run.font.bold = bold_first and i == 0
    return frame


def box(slide, x, y, w, h, paras=(), fill=None, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE, align=PP_ALIGN.LEFT,
        anchor=MSO_ANCHOR.MIDDLE, margin=0.18, radius=0.08, line_width=1.25):
    """A shape with paragraphs inside; each paragraph is (text, size, colour, bold) or a list of such runs."""
    s = slide.shapes.add_shape(shape, I(x), I(y), I(w), I(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    s.shadow.inherit = False
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(line_width)
    else:
        s.line.fill.background()
    tf = s.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = I(margin)
    tf.margin_top = tf.margin_bottom = I(margin * 0.6)
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(4)
        runs = para if isinstance(para, list) else [para]
        for text, size, colour, bold in runs:
            r = p.add_run()
            r.text = text
            r.font.size, r.font.color.rgb, r.font.bold, r.font.name = Pt(size), rgb(colour), bold, FONT
    return s


def arrow(slide, x1, y1, x2, y2, colour=GREY, width=2.0, dash=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, I(x1), I(y1), I(x2), I(y2))
    c.line.color.rgb = rgb(colour)
    c.line.width = Pt(width)
    if dash:
        c.line.dash_style = MSO_LINE.DASH
    ln = c.line._get_or_add_ln()
    tail = etree.SubElement(ln, "{http://schemas.openxmlformats.org/drawingml/2006/main}tailEnd")
    tail.set("type", "triangle")
    tail.set("w", "med")
    tail.set("len", "med")
    return c


def line(slide, x1, y1, x2, y2, colour=GREY, width=1.5, dash=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, I(x1), I(y1), I(x2), I(y2))
    c.line.color.rgb = rgb(colour)
    c.line.width = Pt(width)
    if dash:
        c.line.dash_style = MSO_LINE.DASH
    return c


def picture(slide, path, x, y, h=None, w=None, border=False):
    kw = {}
    if h:
        kw["height"] = I(h)
    if w:
        kw["width"] = I(w)
    pic = slide.shapes.add_picture(str(path), I(x), I(y), **kw)
    if border:
        pic.line.color.rgb = rgb(LINE)
    return pic


def frame(slide, n, title):
    """Title, the red rule under it, the section bar and the slide number."""
    text_box(slide, I(0.6), I(0.32), I(12.1), I(0.95), [title], 28)
    bar = box(slide, 0.62, 1.2, 1.1, 0.06, fill=RED, shape=MSO_SHAPE.RECTANGLE)
    bar.text_frame.text = ""
    current = SECTION_OF.get(n)
    x = 0.6
    for i, name in enumerate(SECTIONS):
        on = i == current
        seg = box(slide, x, 7.12, 2.0, 0.05, fill=RED if on else "#E3E6EA", shape=MSO_SHAPE.RECTANGLE)
        seg.text_frame.text = ""
        text_box(slide, I(x - 0.08), I(6.82), I(2.2), I(0.3), [name], 11, INK if on else MUTED, space=0)
        x += 2.1
    text_box(slide, I(12.2), I(6.86), I(0.7), I(0.35), [str(n)], 12, GREY, align=PP_ALIGN.RIGHT)


def note(slide, lines, y=6.05, size=17):
    text_box(slide, I(0.6), I(y), I(12.1), I(0.8), lines, size, GREY, space=4)


# ---------------------------------------------------------------------------------------------------------- slides


def slide_title(slide, s):
    stripe = box(slide, 0, 0, 0.28, 7.5, fill=RED, shape=MSO_SHAPE.RECTANGLE)
    stripe.text_frame.text = ""
    picture(slide, DIR / "figures/ug-logo.jpeg", 5.92, 0.55, h=1.45)
    f = text_box(slide, I(1.2), I(2.25), I(10.9), I(1.8), [s["title"]], 36, align=PP_ALIGN.CENTER)
    f.paragraphs[0].runs[0].font.bold = True
    line(slide, 5.9, 4.2, 7.43, 4.2, RED, 2.5)
    f = text_box(slide, I(1), I(4.45), I(11.33), I(2.6), s["lines"], 20, GREY, space=6, align=PP_ALIGN.CENTER)
    f.paragraphs[0].runs[0].font.color.rgb = rgb(RED)
    f.paragraphs[0].runs[0].font.bold = True
    f.paragraphs[1].runs[0].font.color.rgb = rgb(INK)


def slide_problem(slide, s):
    # Left: two mistakes on one run of answers.
    text_box(slide, I(0.6), I(1.55), I(6.2), I(0.5), ["After each answer: does the student know it?"], 20, bold_first=True)
    answers = [0, 1, 0, 1, 1, 1, 1, 1, 1]
    x0, step, y = 0.75, 0.66, 2.45
    for i, a in enumerate(answers):
        box(slide, x0 + i * step, y, 0.52, 0.52, [("✓" if a else "✗", 18, "#FFFFFF" if a else GREY, True)],
            fill=INK if a else PANEL, line=None if a else LINE, shape=MSO_SHAPE.OVAL, align=PP_ALIGN.CENTER,
            margin=0.0)
    knows = x0 + 4 * step - 0.07  # the moment the student really knows it
    line(slide, knows, 2.2, knows, 3.25, RED, 2.0, dash=True)
    text_box(slide, I(knows - 1.2), I(3.25), I(2.4), I(0.4), ["really knows it here"], 13, RED, align=PP_ALIGN.CENTER)
    arrow(slide, x0 + 1 * step + 0.26, 3.1, x0 + 1 * step + 0.26, 3.75, RED, 2)
    arrow(slide, x0 + 8 * step + 0.26, 3.1, x0 + 8 * step + 0.26, 3.75, EMA, 2)
    box(slide, 0.6, 3.85, 2.95, 1.35, [("“Yes” too early", 18, RED, True), ("moves on, not ready", 16, INK, False)],
        fill=RED_SOFT)
    box(slide, 3.85, 3.85, 2.95, 1.35, [("“Yes” too late", 18, EMA, True),
                                        ("time lost on easy questions", 16, INK, False)], fill=AMBER_SOFT)
    # Right: what is one skill?
    line(slide, 7.15, 1.6, 7.15, 6.3, LINE, 1.25)
    text_box(slide, I(7.5), I(1.55), I(5.3), I(0.5), ["What is one skill?"], 20, bold_first=True)
    box(slide, 7.5, 2.4, 2.2, 2.2, [("Fractions", 20, "#FFFFFF", True)], fill=INK, align=PP_ALIGN.CENTER)
    text_box(slide, I(7.4), I(4.7), I(2.4), I(0.8), ["1 big skill", "coarse grain"], 15, GREY, space=0,
             align=PP_ALIGN.CENTER)
    arrow(slide, 9.9, 3.5, 10.4, 3.5, GREY, 2)
    for r in range(4):
        for c in range(4):
            box(slide, 10.6 + c * 0.55, 2.4 + r * 0.55, 0.47, 0.47, fill=BKT, radius=0.15)
    text_box(slide, I(10.4), I(4.7), I(2.6), I(0.8), ["16 small ideas", "fine grain"], 15, GREY, space=0,
             align=PP_ALIGN.CENTER)
    box(slide, 7.5, 5.55, 5.25, 0.75, [[("Somebody must choose. This choice is the ", 17, INK, False),
                                        ("grain", 17, RED, True), (".", 17, INK, False)]], fill=PANEL)


def slide_zeno(slide, s):
    left = 1.6
    for name, keep in s["images"]:
        img = Image.open(DIR / name)
        if keep:
            img = img.crop((0, 0, img.width, int(img.height * keep)))
        data = BytesIO()
        img.save(data, "PNG")
        data.seek(0)
        pic = slide.shapes.add_picture(data, I(left), I(1.6), height=I(4.3))
        pic.line.color.rgb = rgb(LINE)
        left += pic.width / 914400 + 0.6
    box(slide, 1.6, 6.0, 4.0, 0.62, [("Student: sees the mistake, gets an explanation", 14, INK, False)],
        fill=PANEL)
    box(slide, 6.3, 6.0, 5.4, 0.62, [("Teacher: every student × every skill (Georgian and English)", 14, INK, False)],
        fill=PANEL)


def slide_tech(slide, s):
    # Top: the path of an answer, from the student's browser to the one file on the school's computer.
    school = box(slide, 3.95, 1.55, 8.75, 2.85, fill=None, line=MUTED, anchor=MSO_ANCHOR.TOP, margin=0.15,
                 paras=[("One school computer or the teacher's laptop: one container", 13, GREY, False)])
    school.line.dash_style = MSO_LINE.DASH
    box(slide, 0.6, 1.75, 2.95, 2.55, [("Students' browsers", 18, INK, True), ("React 19 + TypeScript", 14, GREY, False),
                                       ("whiteboard: Excalidraw", 14, INK, False),
                                       ("questions, checker, learner model", 14, INK, False),
                                       ("keeps answers when offline", 14, INK, False)],
        fill=BLUE_SOFT, anchor=MSO_ANCHOR.TOP, margin=0.22)
    box(slide, 4.25, 2.15, 2.1, 1.95, [("Caddy", 18, INK, True), ("HTTPS", 14, GREY, False)], fill=PANEL,
        align=PP_ALIGN.CENTER)
    box(slide, 6.95, 2.15, 3.0, 1.95, [("Node 24 server", 18, INK, True), ("no framework", 14, GREY, False),
                                       ("marks every answer again", 14, INK, False),
                                       ("teacher dashboard", 14, INK, False)],
        fill=PANEL, anchor=MSO_ANCHOR.TOP, margin=0.22)
    box(slide, 10.5, 2.05, 1.9, 2.15, [("SQLite", 18, INK, True), ("one file", 14, GREY, False)], fill=PANEL,
        line=LINE, shape=MSO_SHAPE.CAN, align=PP_ALIGN.CENTER)
    for x1, x2 in [(3.6, 4.2), (6.4, 6.9), (10.0, 10.45)]:
        a = arrow(slide, x1, 3.12, x2, 3.12, GREY, 2)
        ns = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
        head = etree.Element(ns + "headEnd", type="triangle", w="med", len="med")
        a.line._get_or_add_ln().find(ns + "tailEnd").addprevious(head)  # the schema wants headEnd before tailEnd
    # Middle: one code, two places.
    box(slide, 0.6, 4.6, 12.1, 0.62, [[("The same TypeScript runs in the browser and on the server: ", 16, "#FFFFFF",
                                        False), ("the model gives the same answer in both places.", 16, "#FFFFFF",
                                                 True)]], fill=INK)
    # Bottom: why, in the school's words.
    cards = [("Wi-Fi often fails", "works offline; loads nothing from the internet"),
             ("Old computers, no licences", "any browser; free and open tools"),
             ("One school, not thousands", "one file to copy and back up; no database server")]
    for i, (head, body) in enumerate(cards):
        box(slide, 0.6 + i * 4.1, 5.45, 3.9, 1.2, [(head, 16, RED, True), (body, 14, INK, False)], fill=RED_SOFT,
            anchor=MSO_ANCHOR.TOP, margin=0.22)


def slide_question(slide, s):
    panel = box(slide, 0.6, 1.65, 12.1, 1.75, [("Does the size of a skill change how well a program can decide "
                                                 "that a student knows it?", 28, INK, True)], fill=RED_SOFT, radius=0.06,
                margin=0.45)
    stripe = box(slide, 0.6, 1.65, 0.12, 1.75, fill=RED, shape=MSO_SHAPE.RECTANGLE)
    stripe.text_frame.text = ""
    del panel
    cards = [("Grain", "the size of a skill: one big skill, or many small parts", INK),
             ("Good decision", "when the program says “the student knows it”, this is true", BKT),
             ("Stable decision", "the same rule works in different situations", STREAK)]
    for i, (head, body, c) in enumerate(cards):
        x = 0.6 + i * 4.1
        box(slide, x, 3.85, 3.9, 2.35, [(head, 22, c, True), (body, 18, INK, False)], fill="#FFFFFF", line=LINE,
            anchor=MSO_ANCHOR.TOP, margin=0.3)


def slide_others(slide, s):
    cards = [("Compared the rules for deciding", "Pelánek & Řihák, 2017"),
             ("Compared big and small skills, but only to predict the next answer",
              "Pardos et al., 2007; Feng et al., 2009"),
             ("Made a model for questions that need several skills", "Pardos et al., 2008")]
    for i, (what, who) in enumerate(cards):
        x = 0.6 + i * 4.1
        box(slide, x, 1.65, 3.9, 2.3, [(what, 19, INK, True), (who, 15, GREY, False)], fill=PANEL,
            anchor=MSO_ANCHOR.TOP, margin=0.3)
    arrow(slide, 6.65, 4.1, 6.65, 4.55, RED, 2.5)
    box(slide, 0.6, 4.7, 12.1, 1.55, [("Nobody checked: does the size of a skill change the decision itself?", 22, INK,
                                       True),
                                      [("To check it, we must know the truth about the student. ", 18, INK, False),
                                       ("This is my work.", 18, RED, True)]],
        fill=RED_SOFT, line=RED, margin=0.35)


def slide_rules(slide, s):
    picture(slide, chart_rules(), 0.55, 1.45, w=12.2)
    text_box(slide, I(0.6), I(5.05), I(12.1), I(0.4), ["The same answers, read by each rule (an illustration)."], 14,
             MUTED)
    box(slide, 0.6, 5.5, 12.1, 1.15, [("I proved two statements", 17, INK, True),
                                      [("1. The streak rule is a special case of the moving average.   ", 16, INK, False),
                                       ("2. BKT is correct when students learn exactly as BKT expects.", 16, INK, False)]],
        fill=PANEL, margin=0.3)


def slide_method(slide, s):
    steps = [("400 computer-made students", "the truth is known"), ("The program decides", "“yes” or not yet"),
             ("Compare with the truth", "after every answer"), ("Right or wrong?", "for every decision")]
    for i, (head, sub) in enumerate(steps):
        x = 0.6 + i * 3.05
        chevron = box(slide, x, 1.65, 3.15, 1.5, fill=INK if i < 3 else RED,
                      shape=MSO_SHAPE.CHEVRON if i else MSO_SHAPE.PENTAGON)
        chevron.text_frame.text = ""
        box(slide, x + (0.75 if i else 0.15), 1.7, 2.1, 1.4, [(head, 17, "#FFFFFF", True), (sub, 14, "#FFFFFF", False)],
            align=PP_ALIGN.CENTER, margin=0.02)
    text_box(slide, I(0.6), I(3.55), I(6), I(0.5), ["Then I change the size of the skill"], 19, bold_first=True)
    for i, (name, c, soft) in enumerate([("too big", RED, RED_SOFT), ("correct", INK, PANEL),
                                         ("too small", EMA, AMBER_SOFT)]):
        box(slide, 0.6 + i * 2.0, 4.15, 1.8, 0.75, [(name, 18, c, True)], fill=soft, align=PP_ALIGN.CENTER,
            radius=0.5)
    text_box(slide, I(7.1), I(3.55), I(5.6), I(0.5), ["Fair test"], 19, bold_first=True)
    box(slide, 7.1, 4.15, 2.3, 0.75, [("group A: set the rule", 15, INK, False)], fill=PANEL, align=PP_ALIGN.CENTER)
    arrow(slide, 9.5, 4.52, 10.15, 4.52, GREY, 2)
    box(slide, 10.25, 4.15, 2.45, 0.75, [("group B: test it", 15, INK, False)], fill=PANEL, align=PP_ALIGN.CENTER)
    note(slide, ["With real students we never know the truth. In the computer, every decision can be checked.",
                 "Anyone can run my code and get the same numbers."], y=5.45)


def slide_result1(slide, s):
    picture(slide, chart_result1(), 0.5, 1.45, h=4.6)
    box(slide, 9.2, 1.65, 3.5, 1.35, [("Goal", 15, GREY, True), ("9 of 10 decisions right", 20, INK, True)],
        fill=PANEL, margin=0.25)
    box(slide, 9.2, 3.2, 3.5, 2.6, [("Slow learners", 15, RED, True),
                                    ("BKT is too sure, too early. Its number is not always a real probability.", 18,
                                     INK, False)],
        fill=RED_SOFT, anchor=MSO_ANCHOR.TOP, margin=0.25)


def slide_result2(slide, s):
    picture(slide, DIR / s["image"], 0.5, 1.5, w=8.4)
    for i, (big, small, c) in enumerate([("98 %", "1 part", INK), ("59 %", "2 parts", EMA), ("23 %", "4 parts", RED)]):
        y = 1.55 + i * 1.32
        box(slide, 9.2, y, 3.5, 1.18, [[(big, 34, c, True), (f"   {small}", 17, GREY, False)]], fill=PANEL,
            margin=0.3)
    text_box(slide, I(9.2), I(5.5), I(3.5), I(0.6), ["of decisions right (BKT)"], 14, GREY)
    note(slide, ["All three rules fail together. The dashed line, BKT on each real part, stays near 98 %."], y=6.3,
         size=16)


def slide_result3(slide, s):
    picture(slide, chart_result3(), 0.5, 1.45, h=4.65)
    box(slide, 9.2, 1.65, 3.5, 2.0, [("Fractions = 16 small ideas", 17, INK, True),
                                     ("real questions from Zeno; one question needs about 6 ideas", 15, GREY, False)],
        fill=PANEL, anchor=MSO_ANCHOR.TOP, margin=0.25)
    box(slide, 9.2, 3.85, 3.5, 2.2, [("Needs two things", 17, BKT, True),
                                     ("questions that show the ideas separately, and enough practice", 16, INK, False)],
        fill=BLUE_SOFT, anchor=MSO_ANCHOR.TOP, margin=0.25)


def slide_result4(slide, s):
    picture(slide, chart_result4(), 0.5, 1.45, h=4.5)
    box(slide, 9.2, 1.65, 3.5, 2.0, [("Same students, same answers", 17, INK, True),
                                     ("only the program cuts each part into smaller pieces", 15, GREY, False)],
        fill=PANEL, anchor=MSO_ANCHOR.TOP, margin=0.25)
    box(slide, 9.2, 3.85, 3.5, 2.0, [("Smaller is not always better", 17, RED, True),
                                     ("each small piece gets too few answers", 16, INK, False)],
        fill=RED_SOFT, anchor=MSO_ANCHOR.TOP, margin=0.25)
    note(slide, ["Right decisions stay near 90 % (89.9, 94.8, 93.0 %), but almost nobody hears “yes”."], y=6.15,
         size=16)


def slide_result5(slide, s):
    picture(slide, chart_result5(), 0.55, 1.4, w=12.2)
    box(slide, 0.6, 5.85, 12.1, 0.85, [[("The sign moves with the truth, but weakly: ", 17, INK, True),
                                        ("98 → 8 % for the truth, only 88 → 64 % for the sign. It compares two "
                                         "divisions; it cannot count wrong decisions.", 16, INK, False)]],
        fill=PANEL, margin=0.3)


def slide_limits(slide, s):
    for i, text in enumerate(s["lines"]):
        col, row = i % 2, i // 2
        x, y = 0.6 + col * 6.15, 1.65 + row * 1.5
        box(slide, x, y, 5.95, 1.3, [[(f"{i + 1}   ", 22, RED, True), (text, 18, INK, False)]], fill=PANEL,
            margin=0.3)
    box(slide, 6.75, 4.65, 5.95, 1.3, [("Every experiment repeated five times; I keep only results that stay.", 17,
                                        INK, True)], fill=BLUE_SOFT, margin=0.3)


def slide_conclusion(slide, s):
    text_box(slide, I(0.6), I(1.5), I(12), I(0.6), ["The size of a skill changes the decision."], 24, bold_first=True)
    arrow(slide, 6.65, 2.35, 12.6, 2.35, GREY, 1.75)
    arrow(slide, 6.65, 2.35, 0.7, 2.35, GREY, 1.75)
    text_box(slide, I(0.6), I(2.4), I(3), I(0.4), ["bigger skills"], 13, GREY)
    text_box(slide, I(9.7), I(2.4), I(3), I(0.4), ["smaller skills"], 13, GREY, align=PP_ALIGN.RIGHT)
    zones = [("Too big", "“yes” too early", "right decisions 98 % → 23 %", RED, RED_SOFT),
             ("Correct size", "works, with questions that show each idea and enough practice", "", INK, PANEL),
             ("Too small", "almost never “yes”", "“yes” for 94 % → 7 %", EMA, AMBER_SOFT)]
    for i, (head, body, num, c, soft) in enumerate(zones):
        paras = [(head, 21, c, True), (body, 16, INK, False)]
        if num:
            paras.append((num, 15, GREY, False))
        box(slide, 0.6 + i * 4.1, 2.85, 3.9, 1.9, paras, fill=soft, anchor=MSO_ANCHOR.TOP, margin=0.3)
    box(slide, 0.6, 4.95, 12.1, 0.75, [("Choose the skills, the questions and the rule together.", 20, "#FFFFFF",
                                        True)], fill=INK, align=PP_ALIGN.CENTER)
    text_box(slide, I(0.6), I(5.9), I(12.1), I(0.8),
             ["Next, for the final thesis: the same question on real students (ASSISTments, about 4,000 students)."],
             17, GREY)


LAYOUTS = {1: slide_title, 2: slide_problem, 3: slide_zeno, 4: slide_tech, 5: slide_question, 6: slide_others,
           7: slide_rules, 8: slide_method, 9: slide_result1, 10: slide_result2, 11: slide_result3, 12: slide_result4,
           13: slide_result5, 14: slide_limits, 15: slide_conclusion}


def build_pptx(path, slides):
    prs = Presentation()
    prs.slide_width, prs.slide_height = I(13.333), I(7.5)
    for n, s in enumerate(slides, 1):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        if s.get("kind") != "title":
            frame(slide, n, s["title"])
        LAYOUTS[n](slide, s)
        slide.notes_slide.notes_text_frame.text = s["say"]
    prs.save(path)
