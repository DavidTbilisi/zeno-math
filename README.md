<p align="center">
  <img src="docs/media/banner.png" alt="Zeno: math from zero to advanced, one small step at a time" width="100%">
</p>

<p align="center">
  <b>A free, open-source math whiteboard for learning on your own, from counting to university maths.</b><br>
  <a href="https://davidtbilisi.github.io/zeno-math/">Website</a> ·
  <a href="https://davidtbilisi.github.io/zeno-math/practice/">Try the practice</a> ·
  <a href="docs/features.md">Every feature</a> ·
  <a href="#run-with-docker">Self-host</a>
</p>

<p align="center">
  <img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0-172350">
  <img alt="Languages: English, Russian, Georgian" src="https://img.shields.io/badge/UI-EN%20·%20RU%20·%20KA-172350">
  <img alt="Node.js 23.6 or newer" src="https://img.shields.io/badge/node-%E2%89%A5%2023.6-172350">
</p>

![A Zeno board: lattice multiplication, the unit circle, a Hamiltonian path in the Petersen graph, fraction division, ε–δ and Pascal's hockey stick](docs/screenshots/board.png)

Zeno's paradox says you need infinitely many small steps to cross a room, and yet you get there. Zeno is an
infinite whiteboard where every picture is a live object you can change, with practice that checks your answers
and notices the mistake you made.

## See it work

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/media/practice.gif" alt="A fraction question answered with the add-across mistake, which Zeno names, then solved step by step"><br>
<b>Practice that knows the mistake.</b> Add the tops and the bottoms, and Zeno says that is what you did, then
walks you through it one step at a time.
</td>
<td width="50%" valign="top">
<img src="docs/media/geolab.gif" alt="Dragging a triangle's corner in the geometry lab while its measurements update, then drawing its circumcircle"><br>
<b>Geometry you can grab.</b> Drag a corner and every length, angle and area follows; one click adds the
circumcircle.
</td>
</tr>
<tr>
<td valign="top">
<img src="docs/media/solids.gif" alt="A cylinder and then a cone unfolding into their nets"><br>
<b>3D solids that unfold.</b> Turn a cylinder or a cone and slide it open into its net, with the volume and
surface area beside it.
</td>
<td valign="top">
<img src="docs/media/sort.gif" alt="The player choosing each swap of bubble sort in Be the sort"><br>
<b>Be the algorithm.</b> In <i>Be the sort</i> you make every swap bubble sort makes (then insertion, selection, merge, quick); there are games for
search, DP, heaps, graphs and system design too.
</td>
</tr>
<tr>
<td valign="top">
<img src="docs/media/primes.gif" alt="Slicing the numbers that are not prime as they fly up"><br>
<b>Games with levels.</b> <i>Prime slice</i>: cut every number that isn't prime before it falls. Pass with two
stars, climb the ladder, beat the clock.
</td>
<td valign="top">
<b>What's on the board</b><br><br>
Bar models, place value, fractions and percentages · algebra tiles and equations · geometry, trigonometry and
3D · graph theory, combinatorics and number theory · calculus, ODEs and linear algebra · probability and
statistics · algorithms and data structures · maths for AI · a whole maths degree, course by course.
<br><br>
<a href="docs/features.md">The full list →</a>
</td>
</tr>
</table>

## More pictures

Every picture is generated and stays editable: double-click it to change the numbers.

<table>
<tr>
<td align="center"><img src="docs/screenshots/models-fractions.png" width="260" alt="Fraction division, step by step"><br><sub>Fraction division</sub></td>
<td align="center"><img src="docs/screenshots/trig-circle.png" width="260" alt="Unit circle and sine wave"><br><sub>Unit circle and sine</sub></td>
<td align="center"><img src="docs/screenshots/gt-petersen.png" width="260" alt="Hamiltonian path in the Petersen graph"><br><sub>Petersen graph</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/analysis-taylor.png" width="260" alt="Taylor polynomials"><br><sub>Taylor polynomials</sub></td>
<td align="center"><img src="docs/screenshots/algo-dijkstra.png" width="260" alt="Dijkstra's algorithm"><br><sub>Dijkstra's algorithm</sub></td>
<td align="center"><img src="docs/screenshots/statistics-clt.png" width="260" alt="Central limit theorem"><br><sub>Central limit theorem</sub></td>
</tr>
</table>

[All screenshots →](docs/features.md#screenshots)

## For classes

A teacher makes a class at `#/teacher`; students join with a code (no names or emails), practise on their own
level, and the teacher sees who is stuck and why. Zeno can also run a study that compares adaptive practice with a
fixed sequence, with pre-, post- and delayed tests. See [docs/study.md](docs/study.md).

## Run with Docker

```bash
docker compose up -d --build        # then open http://localhost:8787
```

On a network, set a password: `APP_PASSWORD=… TEACHER_PASSWORD=… docker compose up -d --build`.
HTTPS, backups and every setting are in [docs/self-hosting.md](docs/self-hosting.md).

Without Docker (Node.js ≥ 23.6):

```bash
npm install && npm run build && npm start   # http://localhost:8787
npm run dev                                 # hot reload on :5173
```

## Docs

| | |
|---|---|
| [Features](docs/features.md) | everything Zeno can draw, check and play |
| [Self-hosting](docs/self-hosting.md) | Docker, passwords, HTTPS, backups, the class study |
| [Development](docs/development.md) | tests, project layout, ideas for later |
| [Architecture](docs/architecture.md) · [API](docs/api.md) · [The code, explained](docs/code-explanation.md) | how it is built |
| [Study](docs/study.md) | the research side |

The GIFs above are recorded by `scripts/readme-media.mjs` against a running build.

## License

Copyright © 2026 David Chincharashvili. Free software under the
[GNU Affero General Public License v3.0 or later](LICENSE). If you run a modified Zeno for other people over a
network, offer them your source: point `SOURCE_URL` in `src/pages/HomePage.tsx` at your copy. Versions up to the tag
`mit-final` stay MIT. Bundled libraries keep their own licenses (Excalidraw, React and three.js MIT; MathJax and
math.js Apache-2.0).
