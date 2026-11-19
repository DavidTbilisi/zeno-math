"""A practical introduction to right-triangle trigonometry, without LaTeX."""
from manim import *
import numpy as np


class PracticalTrig(Scene):
    def construct(self):
        self.camera.background_color = "#101b2d"
        blue, yellow, green, muted = "#55c5ff", "#ffd166", "#80dfb0", "#b9cadc"
        title = Text("How high does the ladder reach?", font_size=36).to_edge(UP, buff=0.5)
        brand = Text("ZENO / A SMALL STEP", font_size=15, color=muted).to_corner(DL)
        a, b, c = np.array([-5., -1.5, 0]), np.array([-1., -1.5, 0]), np.array([-1., 1.5, 0])
        ground = Line(a + LEFT * .5, b + RIGHT * .4, color=muted)
        wall = Line(b, c + UP * .5, color=muted)
        ladder = Line(a, c, color=yellow, stroke_width=9)
        rungs = VGroup()
        normal = np.array([-.6, .8, 0]) * .12
        for t in np.linspace(.1, .9, 9):
            p = a + t * (c - a)
            rungs.add(Line(p - normal, p + normal, color=yellow, stroke_width=4))
        angle = Arc(radius=.85, start_angle=0, angle=np.arctan2(3, 4), arc_center=a, color=blue)
        angle_label = Text("≈37°", font_size=24, color=blue).move_to(a + [1.3, .3, 0])
        square = VMobject(color=muted).set_points_as_corners([b + LEFT*.25, b + LEFT*.25 + UP*.25, b + UP*.25])
        length = Text("5 m", font_size=28, color=yellow).move_to([-3.3, .5, 0])
        height = Text("height?", font_size=24, color=green).move_to([-.25, 0, 0])
        note = Text("A ladder, a wall and the ground make a right triangle.", font_size=25, color=muted).move_to([0, -2.6, 0])
        self.play(FadeIn(title), FadeIn(brand), Create(ground), Create(wall), run_time=1)
        self.play(Create(ladder), FadeIn(rungs), Create(angle), FadeIn(angle_label),
                  Create(square), FadeIn(length), FadeIn(height), FadeIn(note), run_time=2)
        self.wait(3)

        def text(s, y, color=WHITE, size=28):
            return Text(s, font_size=size, color=color).move_to([3.1, y, 0])

        opposite = Line(b, c, color=green, stroke_width=6)
        adjacent = Line(a, b, color=blue, stroke_width=6)
        key = VGroup(text("Relative to the ground angle:", 1.6, muted, 23),
                     text("opposite = height", .8, green),
                     text("adjacent = ground distance", 0, blue, 24),
                     text("hypotenuse = ladder", -.8, yellow, 26))
        self.play(Create(opposite), Create(adjacent), FadeIn(key),
                  Transform(note, Text("Name the sides from the angle you know.", font_size=25, color=muted).move_to(note)), run_time=1)
        self.wait(5)

        ratios = VGroup(text("sin θ = opposite / hypotenuse", 1.3, green, 25),
                        text("cos θ = adjacent / hypotenuse", .35, blue, 25),
                        text("tan θ = opposite / adjacent", -.6, yellow, 25))
        self.play(FadeOut(key), FadeIn(ratios),
                  Transform(note, Text("Choose the ratio that connects your known and unknown sides.", font_size=24, color=muted).move_to(note)), run_time=1)
        self.wait(6)

        working = VGroup(text("sin 37° ≈ height / 5", 1.3, green, 29),
                         text("height ≈ 5 × sin 37°", .35, WHITE, 29),
                         text("height ≈ 3.01 m", -.65, green, 34))
        self.play(FadeOut(ratios), FadeIn(working),
                  Transform(height, Text("≈3.01 m", font_size=23, color=green).move_to(height)),
                  Transform(note, Text("Use sine: we know the ladder length and want the height.", font_size=25, color=muted).move_to(note)), run_time=1)
        self.wait(7)

        other = VGroup(text("How far is the foot from the wall?", 1.5, muted, 23),
                       text("distance ≈ 5 × cos 37°", .6, blue, 28),
                       text("≈ 3.99 m", -.2, blue, 32),
                       text("tan θ = height / distance", -1.1, yellow, 25))
        self.play(FadeOut(working), FadeIn(other),
                  Transform(note, Text("Cosine finds the ground distance. Tangent links height and distance.", font_size=23, color=muted).move_to(note)), run_time=1)
        self.wait(6)
        self.play(FadeOut(other), FadeOut(height), FadeIn(VGroup(text("Your turn", 1, WHITE, 34),
                  text("A 10 m ladder makes the same angle.", .1, muted, 23),
                  text("How high does it reach?", -.7, green, 28))),
                  Transform(note, Text("Same angle, twice the ladder length: twice the height.", font_size=25, color=muted).move_to(note)), run_time=1)
        self.wait(5)
