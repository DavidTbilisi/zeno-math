"""Render with Manim Community; uses Text so no LaTeX installation is needed."""
from manim import *


class EquivalentFractions(Scene):
    def construct(self):
        self.camera.background_color = "#101b2d"
        blue = "#55c5ff"
        muted = "#b9cadc"
        title = Text("Same amount. Different fractions.", font_size=36).to_edge(UP, buff=0.6)
        brand = Text("ZENO  /  A SMALL STEP", font_size=16, color=muted).to_corner(DL)
        self.play(FadeIn(title), FadeIn(brand), run_time=1)

        def bar(parts, y):
            return VGroup(*[
                Rectangle(width=8 / parts, height=0.72,
                          fill_color=blue if i < parts // 2 else "#24354b",
                          fill_opacity=1, stroke_color="#101b2d", stroke_width=4)
                .move_to([-4 + (i + 0.5) * 8 / parts, y, 0])
                for i in range(parts)
            ])

        def note(text):
            return Text(text, font_size=26, color=muted).move_to([0, -2.45, 0])

        half = bar(2, 1.1)
        first_label = Text("1/2", font_size=32, color=blue).move_to([5, 1.1, 0])
        caption = note("Shade one of two equal parts.")
        self.play(FadeIn(half), Write(first_label), FadeIn(caption), run_time=1.5)
        self.wait(3)

        quarters = half.copy()
        self.add(quarters)
        self.play(quarters.animate.shift(DOWN * 1.1), run_time=1)
        self.play(Transform(quarters, bar(4, 0)),
                  Transform(caption, note("Split every part in two. The shaded amount stays the same.")),
                  run_time=1.5)
        second_label = Text("2/4", font_size=32, color=blue).move_to([5, 0, 0])
        self.play(Write(second_label), run_time=0.5)
        self.wait(4)

        eighths = quarters.copy()
        self.add(eighths)
        self.play(eighths.animate.shift(DOWN * 1.1), run_time=1)
        self.play(Transform(eighths, bar(8, -1.1)),
                  Transform(caption, note("Split again: four shaded parts out of eight.")), run_time=1.5)
        third_label = Text("4/8", font_size=32, color=blue).move_to([5, -1.1, 0])
        self.play(Write(third_label), run_time=0.5)
        self.wait(3)

        self.play(Transform(title, Text("1/2  =  2/4  =  4/8", font_size=44).move_to(title)),
                  Transform(caption, note("Multiply the top and bottom by the same number.")), run_time=1)
        self.wait(4)
        self.play(Transform(caption, note("Your turn:  3/5 = ?/10")), run_time=0.5)
        self.wait(4)
